# app/services/notification_service.py
# --- FULL REPLACEMENT ---

from sqlalchemy.orm import Session
from jinja2 import Environment, BaseLoader, select_autoescape
from datetime import datetime
from typing import Dict, Any, Optional
import pytz # For timezone handling
import asyncio # For running async function if needed

# Logging and Config
import logging
logger = logging.getLogger(__name__)
# Database and Session
from app.config import settings

# Models and Enums
from app.models.appointment import Appointment
from app.models.template import Template, TemplateEventTrigger, TemplateType
from app.models.communications_log import ( # Import all needed enums/model
    CommunicationChannel,
    CommunicationStatus,
    CommunicationType as LogCommType, # Alias to avoid clash
    CommunicationDirection, # Import direction
    CommunicationsLog
)

# Service Imports
from app.services.email_service import send_email # Import the async function
from app.services.communication_service import create_communication_log # Import log creation utility


# --- Jinja2 Environment Setup ---
jinja_env = Environment(
    loader=BaseLoader(),
    autoescape=select_autoescape(['html', 'xml']) # Enable autoescaping for security
)

# --- Helper Functions ---

def _get_template(db: Session, tenant_id: int, event_trigger: TemplateEventTrigger) -> Optional[Template]:
    """Fetches the active email template for a given tenant and trigger."""
    try:
        template = db.query(Template).filter(
            Template.tenant_id == tenant_id,
            Template.event_trigger == event_trigger,
            Template.type == TemplateType.EMAIL, # Hardcoded to EMAIL for now
            Template.is_active == True
        ).first()
        if template:
            logger.debug(f"Found active template ID {template.id} for trigger {event_trigger.value}, tenant {tenant_id}")
        else:
             logger.debug(f"No active custom template found for trigger {event_trigger.value}, tenant {tenant_id}")
        return template
    except Exception as e:
        logger.error(f"Error fetching template for trigger {event_trigger.value}, tenant {tenant_id}: {e}", exc_info=True)
        return None

def _prepare_context(appointment: Appointment) -> Dict[str, Any]:
    """Prepares the context dictionary for template rendering."""
    client = appointment.client
    tenant = appointment.tenant
    context = {}

    if not client or not tenant:
         logger.error(f"Cannot prepare context for Appt ID {appointment.id}: Missing Client or Tenant object.")
         return context # Return empty context

    # Client details
    context['client_name'] = f"{client.first_name or ''} {client.last_name or ''}".strip() or "Valued Customer"
    context['client_first_name'] = client.first_name or "Customer"
    context['client_email'] = client.email or ""

    # Tenant details (Using keys consistent with user's template example)
    context['business_name'] = tenant.name or "Your Business"
    context['tenant_name'] = tenant.name or "Your Business" # Keep alias for potential backward compat
    context['business_contact_email'] = tenant.contact_email or "" # Use business_contact_email key
    context['business_contact_phone'] = tenant.contact_phone or "" # Use business_contact_phone key
    context['business_website_url'] = tenant.website_url or ""
    context['tenant_address_street'] = tenant.address_street or "" # Add address fields
    context['tenant_address_city'] = tenant.address_city or ""
    context['tenant_address_state'] = tenant.address_state or ""
    context['tenant_address_postal_code'] = tenant.address_postal_code or ""
    context['tenant_address_country'] = tenant.address_country or ""
    context['tenant_cancellation_policy'] = tenant.cancellation_policy_text or "" # Add policy

    # Appointment details - with timezone conversion
    appointment_time_utc = appointment.appointment_time

    try:
        tenant_tz_str = tenant.timezone or 'UTC'
        tenant_tz = pytz.timezone(tenant_tz_str)
        # Ensure UTC time has timezone info before converting
        if appointment_time_utc.tzinfo is None:
             appointment_time_utc = pytz.utc.localize(appointment_time_utc)

        appointment_time_local = appointment_time_utc.astimezone(tenant_tz)

        # Example formats (customize as needed)
        context['appointment_time'] = appointment_time_local.strftime('%Y-%m-%d %I:%M %p %Z') # e.g., 2023-10-27 02:30 PM EST
        context['appointment_date'] = appointment_time_local.strftime('%B %d, %Y') # e.g., October 27, 2023
        context['appointment_start_time'] = appointment_time_local.strftime('%I:%M %p') # e.g., 02:30 PM
    except Exception as tz_err:
         logger.warning(f"Timezone conversion error for Appt ID {appointment.id}, tenant {tenant.id} (tz='{tenant.timezone}'): {tz_err}. Using UTC.")
         # Fallback to UTC formatting
         context['appointment_time'] = appointment_time_utc.strftime('%Y-%m-%d %H:%M UTC')
         context['appointment_date'] = appointment_time_utc.strftime('%Y-%m-%d')
         context['appointment_start_time'] = appointment_time_utc.strftime('%H:%M')


    # Service details
    context['service_names'] = ", ".join([s.name for s in appointment.services]) if appointment.services else "Selected Service(s)"

    # Links (Placeholders - real implementation needs token generation/route definition)
    base_url = f"https://{tenant.subdomain}.{settings.base_domain}" # Construct base URL
    context['confirmation_link'] = f"{base_url}/confirm?token=PLACEHOLDER_CONFIRM_TOKEN"
    context['cancellation_link'] = f"{base_url}/cancel?appt_id={appointment.id}&token=PLACEHOLDER_CANCEL_TOKEN"
    context['reschedule_link'] = f"{base_url}/reschedule?appt_id={appointment.id}&token=PLACEHOLDER_RESCHEDULE_TOKEN"

    logger.debug(f"Prepared context keys for Appt ID {appointment.id}: {list(context.keys())}")
    return context

def _render_template(template_string: str, context: Dict[str, Any]) -> str:
    """Renders a template string using Jinja2."""
    if not template_string:
        return ""
    try:
        template = jinja_env.from_string(template_string)
        rendered = template.render(context)
        return rendered
    except Exception as e:
        logger.error(f"Jinja2 rendering error: {e}", exc_info=True)
        return f"Error rendering template content: {e}"

# --- Default Template Fallbacks (HTML structure, correct placeholders) ---
DEFAULT_TEMPLATES = {
    TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT: {
        "subject": "Your Appointment Confirmation with {{ business_name }}",
        "body": """<p>Hi {{ client_first_name }},</p>
                   <p>We’re happy to let you know that your appointment with {{ business_name }} has been successfully booked.</p>
                   <p>Here are the details of your upcoming appointment:</p>
                   <p><strong>🗓️ Appointment Details:</strong><br>
                   - Date: {{ appointment_date }}<br>
                   - Time: {{ appointment_start_time }}<br>
                   - Services: {{ service_names }}</p>
                   <p>If you have any questions or need assistance, please contact us.</p>
                   <p>Warm regards,<br>
                   {{ business_name }}<br>
                   Email: {{ business_contact_email }}<br>
                   Phone: {{ business_contact_phone }}</p>"""
    },
     TemplateEventTrigger.APPOINTMENT_BOOKED_ADMIN: {
        "subject": "New Booking: {{ client_name }} - {{ appointment_date }} {{ appointment_start_time }}",
        "body": """<p>New appointment booked:</p>
                   <ul>
                       <li>Client: {{ client_name }} ({{ client_email }})</li>
                       <li>Time: {{ appointment_time }}</li>
                       <li>Service(s): {{ service_names }}</li>
                   </ul>"""
    },
     TemplateEventTrigger.APPOINTMENT_CANCELLED_CLIENT: {
        "subject": "Your Appointment with {{ business_name }} Has Been Cancelled",
        "body": """<p>Hi {{ client_first_name }},</p>
                   <p>Your appointment with {{ business_name }} for {{ service_names }} scheduled for {{ appointment_time }} has been cancelled.</p>
                   <p>If you did not request this cancellation, please contact us immediately.</p>
                   <p>Sincerely,<br>
                   {{ business_name }}<br>
                   Email: {{ business_contact_email }}<br>
                   Phone: {{ business_contact_phone }}</p>"""
    },
     TemplateEventTrigger.APPOINTMENT_CANCELLED_ADMIN: {
        "subject": "Appointment Cancelled: {{ client_name }} - {{ appointment_date }} {{ appointment_start_time }}",
        "body": """<p>The following appointment has been cancelled:</p>
                   <ul>
                       <li>Client: {{ client_name }} ({{ client_email }})</li>
                       <li>Original Time: {{ appointment_time }}</li>
                       <li>Service(s): {{ service_names }}</li>
                   </ul>"""
    },
     TemplateEventTrigger.APPOINTMENT_REMINDER_CLIENT: {
        "subject": "Reminder: Your Appointment with {{ business_name }} on {{ appointment_date }}",
        "body": """<p>Hi {{ client_first_name }},</p>
                   <p>This is a friendly reminder about your upcoming appointment with {{ business_name }}:</p>
                   <p><strong>🗓️ Appointment Details:</strong><br>
                   - Date: {{ appointment_date }}<br>
                   - Time: {{ appointment_start_time }}<br>
                   - Services: {{ service_names }}</p>
                   <p>We look forward to seeing you!</p>
                   <p>Need to reschedule or cancel? Please contact us at least [X hours/days] in advance.</p>
                   <p>Sincerely,<br>
                   {{ business_name }}<br>
                   Email: {{ business_contact_email }}<br>
                   Phone: {{ business_contact_phone }}</p>"""
    },
    # Add defaults for other triggers as needed
}

# --- Main Notification Function ---

async def send_appointment_notification(
    db: Session,
    appointment: Appointment,
    event_trigger: TemplateEventTrigger,
    recipient_override: Optional[str] = None
):
    """
    Fetches template, renders, sends email, and logs communication for an appointment event.
    Adds log entry to session but DOES NOT COMMIT.
    """
    if not appointment:
         logger.error("send_appointment_notification called with None appointment.")
         return

    # Eager load relationships if not already loaded (belt-and-suspenders)
    # This requires the db session to be active.
    try:
        if not appointment.client or not hasattr(appointment.client, 'id'):
             logger.debug(f"Explicitly loading client for Appt ID {appointment.id}")
             db.refresh(appointment, attribute_names=['client'])
        if not appointment.tenant or not hasattr(appointment.tenant, 'id'):
             logger.debug(f"Explicitly loading tenant for Appt ID {appointment.id}")
             db.refresh(appointment, attribute_names=['tenant'])
        if not appointment.services or not hasattr(appointment.services, '__iter__'):
             logger.debug(f"Explicitly loading services for Appt ID {appointment.id}")
             db.refresh(appointment, attribute_names=['services'])
    except Exception as load_err:
         logger.error(f"Error refreshing relationships for Appt ID {appointment.id}: {load_err}", exc_info=True)
         # Decide whether to proceed with potentially incomplete context
         # return # Option: stop if context parts are missing

    tenant = appointment.tenant
    client = appointment.client

    if not tenant or not client:
        logger.error(f"Cannot send notification for Appt ID {appointment.id}: Missing Tenant or Client relationship even after refresh.")
        return

    # --- Determine recipient and log direction/type ---
    recipient_email = recipient_override
    log_comm_type = LogCommType.UPDATE # Default log type
    log_direction = CommunicationDirection.SYSTEM # Default direction

    if not recipient_email:
        # Check if notification is intended for the CLIENT
        if event_trigger in [TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT,
                             TemplateEventTrigger.APPOINTMENT_REMINDER_CLIENT,
                             TemplateEventTrigger.APPOINTMENT_CANCELLED_CLIENT,
                             TemplateEventTrigger.APPOINTMENT_UPDATED_CLIENT,
                             TemplateEventTrigger.CLIENT_CONFIRMATION]:
            recipient_email = client.email
            log_direction = CommunicationDirection.OUTBOUND # To Client
            # Determine specific log type
            if event_trigger == TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT: log_comm_type = LogCommType.CONFIRMATION
            elif event_trigger == TemplateEventTrigger.APPOINTMENT_REMINDER_CLIENT: log_comm_type = LogCommType.REMINDER
            elif event_trigger == TemplateEventTrigger.APPOINTMENT_CANCELLED_CLIENT: log_comm_type = LogCommType.CANCELLATION
            elif event_trigger == TemplateEventTrigger.APPOINTMENT_UPDATED_CLIENT: log_comm_type = LogCommType.UPDATE
            elif event_trigger == TemplateEventTrigger.CLIENT_CONFIRMATION: log_comm_type = LogCommType.CONFIRMATION # Adjust if needed

        # Check if notification is intended for the ADMIN/TENANT
        elif event_trigger in [TemplateEventTrigger.APPOINTMENT_BOOKED_ADMIN,
                               TemplateEventTrigger.APPOINTMENT_CANCELLED_ADMIN,
                               TemplateEventTrigger.APPOINTMENT_UPDATED_ADMIN]:
            recipient_email = tenant.contact_email # Send to tenant's contact email
            log_direction = CommunicationDirection.SYSTEM # Internal/Admin notification
            # Determine specific log type (same as client-facing for now)
            if event_trigger == TemplateEventTrigger.APPOINTMENT_BOOKED_ADMIN: log_comm_type = LogCommType.CONFIRMATION
            elif event_trigger == TemplateEventTrigger.APPOINTMENT_CANCELLED_ADMIN: log_comm_type = LogCommType.CANCELLATION
            elif event_trigger == TemplateEventTrigger.APPOINTMENT_UPDATED_ADMIN: log_comm_type = LogCommType.UPDATE
        else:
            logger.warning(f"No recipient logic defined for event trigger: {event_trigger.value} for Appt ID {appointment.id}")
            return

    if not recipient_email:
        logger.warning(f"No recipient email address found (Client Email or Tenant Contact Email empty?) for notification trigger {event_trigger.value}, Appt ID {appointment.id}. Skipping send.")
        return

    # --- Get template or use default ---
    template = _get_template(db, tenant.id, event_trigger)
    context = _prepare_context(appointment) # Prepare context data

    subject_template = ""
    body_template = ""
    template_name_for_log = "Default"

    if template:
        logger.info(f"Using template ID {template.id} ('{template.name}') for trigger {event_trigger.value}, Appt ID {appointment.id}")
        template_name_for_log = template.name
        subject_template = template.email_subject or DEFAULT_TEMPLATES.get(event_trigger, {}).get("subject", "Appointment Update")
        body_template = template.email_body
    else:
        logger.warning(f"No active custom template for trigger {event_trigger.value}, tenant {tenant.id}. Using default content.")
        default_content = DEFAULT_TEMPLATES.get(event_trigger)
        if default_content:
            subject_template = default_content["subject"]
            body_template = default_content["body"]
        else:
             logger.error(f"FATAL: No default template content defined for trigger {event_trigger.value}! Cannot send notification for Appt ID {appointment.id}.")
             # Log this failure explicitly?
             create_communication_log(
                 db=db, tenant_id=tenant.id, client_id=client.id, appointment_id=appointment.id,
                 type=log_comm_type, channel=CommunicationChannel.EMAIL, direction=log_direction,
                 status=CommunicationStatus.FAILED, notes="Configuration Error: No template (custom or default) found for trigger.",
             )
             return # Cannot proceed

    # --- Render template ---
    rendered_subject = _render_template(subject_template, context)
    rendered_plain_body = _render_template(body_template, context)
    # Convert plain text newlines to HTML breaks AFTER rendering placeholders
    html_compatible_body = rendered_plain_body.replace('\n', '<br />\n')

    # --- Send email (asynchronously) ---
    send_success = await send_email(
        to_email=recipient_email,
        subject=rendered_subject,
        html_body=html_compatible_body,
        tenant=tenant,
    )

    # --- Log the communication attempt ---
    log_status = CommunicationStatus.SENT if send_success else CommunicationStatus.FAILED
    log_notes = f"Template: '{template_name_for_log}'. Subject: {rendered_subject}"
    if not send_success:
        log_notes += ". Status: FAILED. Check email service logs/status."

    create_communication_log(
        db=db,
        tenant_id=tenant.id,
        client_id=client.id if log_direction == CommunicationDirection.OUTBOUND else None,
        appointment_id=appointment.id,
        user_id=None, # System generated, no specific user action triggered this directly
        type=log_comm_type,
        channel=CommunicationChannel.EMAIL,
        status=log_status,
        direction=log_direction, # Pass the determined direction
        subject=rendered_subject, # Log the rendered subject
        notes=log_notes # Use notes for summary/status
    )
    # --- IMPORTANT: No db.commit() here ---
    logger.info(f"Notification attempt logged for Appt ID {appointment.id}, Trigger {event_trigger.value}, Direction {log_direction.value}, Status {log_status.value}, Recipient: {recipient_email}")
