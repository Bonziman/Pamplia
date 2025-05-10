# app/tasks/appointment_tasks.py
# --- NEW FILE ---

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, select
from datetime import datetime, timedelta, timezone
import pytz

from app.core.celery_app import celery_app # Import the Celery app instance
from app.database import SessionLocal # Import SessionLocal to create new sessions
import logging

from app.schemas.enums import AppointmentStatus
logger = logging.getLogger(__name__)
from app.models.appointment import Appointment
from app.models.tenant import Tenant
from app.models.communications_log import CommunicationsLog, CommunicationType, CommunicationStatus # Import necessary enums etc.
from app.services.notification_service import send_appointment_notification # Import the service function
from app.models.template import TemplateEventTrigger

# Define constants for buffer time around reminder checks
REMINDER_CHECK_BUFFER_MINUTES = 10 # Check +/- 10 minutes around the exact interval

@celery_app.task(bind=True, name='app.tasks.appointment_tasks.send_appointment_reminders')
def send_appointment_reminders(self):
    """
    Celery task to find appointments needing reminders and trigger notifications.
    """
    logger.info("Starting send_appointment_reminders task...")
    db: Session = SessionLocal() # Create a new session for this task run
    processed_count = 0
    error_count = 0

    try:
        now_utc = datetime.now(timezone.utc)

        # Find tenants with reminder intervals set
        tenants_with_reminders = db.query(Tenant).filter(
            Tenant.reminder_interval_hours.isnot(None),
            Tenant.reminder_interval_hours > 0
        ).all()

        if not tenants_with_reminders:
            logger.info("No tenants found with active reminder intervals configured.")
            return "No tenants configured for reminders."

        for tenant in tenants_with_reminders:
            interval_hours = tenant.reminder_interval_hours
            if not interval_hours: continue # Skip if somehow None here

            # Calculate target reminder time window in UTC
            reminder_time_utc = now_utc + timedelta(hours=interval_hours)
            window_start = reminder_time_utc - timedelta(minutes=REMINDER_CHECK_BUFFER_MINUTES)
            window_end = reminder_time_utc + timedelta(minutes=REMINDER_CHECK_BUFFER_MINUTES)

            logger.debug(f"Tenant {tenant.id}: Checking for reminders between {window_start} and {window_end} (Interval: {interval_hours} hrs)")

            # Subquery to find appointments already reminded recently
            # Check logs within the last X hours (slightly more than interval) to prevent re-sending after failures
            # This subquery could be refined based on exact needs
            recent_reminder_logs = select(CommunicationsLog.appointment_id).where(
                CommunicationsLog.tenant_id == tenant.id,
                CommunicationsLog.type == CommunicationType.REMINDER, # Use model enum directly
                CommunicationsLog.status == CommunicationStatus.SENT, # Check for SENT status
                CommunicationsLog.timestamp >= now_utc - timedelta(hours=interval_hours + 1) # Check slightly past interval
            ).distinct().subquery()

            # Query for appointments needing reminders for this tenant
            appointments_to_remind = db.query(Appointment).filter(
                Appointment.tenant_id == tenant.id,
                Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
                Appointment.appointment_time >= window_start,
                Appointment.appointment_time < window_end,
                # Exclude appointments that have a successful reminder log recently
                Appointment.id.notin_(select(recent_reminder_logs.c.appointment_id))
            ).options(
                # Eager load relationships needed by notification service
                joinedload(Appointment.client),
                joinedload(Appointment.tenant),
                joinedload(Appointment.services)
            ).all()

            if appointments_to_remind:
                logger.info(f"Tenant {tenant.id}: Found {len(appointments_to_remind)} appointments needing reminders.")

            for appt in appointments_to_remind:
                logger.debug(f"Processing reminder for Appt ID: {appt.id}, Client ID: {appt.client_id}")
                try:
                    # Run the notification sending logic (which adds log to session)
                    # Run it synchronously within the task for now
                    # If send_appointment_notification becomes truly async with async DB calls,
                    # this task would need to be async too.
                    # For now, using run_in_threadpool inside send_email handles blocking IO.

                    # *** NOTE: If send_appointment_notification needs to be async native,
                    # this task should be async and use asyncio.run() or integrate with Celery's async support ***
                    # For simplicity with run_in_threadpool in send_email, keep task sync for now.

                     # We need to run the async function - how depends on Celery/event loop context
                     # Simplest (but potentially blocking worker slightly if many emails per run):
                    import asyncio
                    try:
                        asyncio.run(send_appointment_notification(
                            db=db,
                            appointment=appt,
                            event_trigger=TemplateEventTrigger.APPOINTMENT_REMINDER_CLIENT
                         ))
                    except RuntimeError as e:
                         # Handle case where event loop is already running (e.g., nested asyncio.run)
                         # This might require integrating with Celery's event loop if available
                         # or using a different method like asyncio.get_event_loop().run_until_complete()
                         # if run within an appropriate async context setup by Celery.
                         # For now, log and potentially skip or try another approach.
                         logger.error(f"RuntimeError running async notification for Appt {appt.id}: {e}. Consider Celery async integration.")
                         # Fallback or re-raise depending on desired behavior
                         error_count += 1
                         continue # Skip this appointment

                    processed_count += 1
                except Exception as notification_err:
                    logger.error(f"Error triggering notification for Appt ID {appt.id}: {notification_err}", exc_info=True)
                    db.rollback() # Rollback potential partial log additions from failed send
                    error_count += 1
                    # Continue to next appointment
                else:
                     # Commit logs for successfully processed notification *immediately*
                     # Or commit in batches outside the inner loop for performance
                    try:
                        db.commit()
                    except Exception as commit_err:
                        logger.error(f"Error committing communication log for Appt ID {appt.id} reminder: {commit_err}", exc_info=True)
                        db.rollback()
                        error_count += 1

        logger.info(f"send_appointment_reminders task finished. Processed: {processed_count}, Errors: {error_count}")
        return f"Processed: {processed_count}, Errors: {error_count}"

    except Exception as e:
        logger.error(f"General error in send_appointment_reminders task: {e}", exc_info=True)
        db.rollback() # Rollback any partial changes
        # Re-raise the exception so Celery knows the task failed
        raise self.retry(exc=e, countdown=60) # Example retry after 60s
    finally:
        db.close() # Ensure session is closed
