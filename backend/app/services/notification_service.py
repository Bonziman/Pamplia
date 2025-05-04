# app/services/notification_service.py
# --- NEW FILE ---

from sqlalchemy.orm import Session
from jinja2 import Environment, BaseLoader, select_autoescape
from datetime import datetime
from typing import Dict, Any, Optional
import pytz # For timezone handling

import logging
logger = logging.getLogger(__name__)
from app.models.appointment import Appointment
from app.models.template import Template, TemplateEventTrigger, TemplateType
from app.models.communications_log import CommunicationChannel, CommunicationStatus, CommunicationType as LogCommType # Alias to avoid clash
from app.services.email_service import send_email # Import the async function
from app.services.communication_service import create_communication_log # Import log creation utility
from app.config import settings # Import settings from the appropriate configuration module

# --- Jinja2 Environment Setup ---
# Use BaseLoader for loading templates directly from strings
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
        return template
    except Exception as e:
        logger.error(f"Error fetching template for trigger {event_trigger.value}, tenant {tenant_id}: {e}", exc_info=True)
        return None

def _prepare_context(appointment: Appointment) -> Dict[str, Any]:
    """Prepares the context dictionary for template rendering."""
    client = appointment.client
    tenant = appointment.tenant
    context = {}

    # Client details
    context['client_name'] = f"{client.first_name or ''} {client.last_name or ''}".strip() or "Valued Customer"
    context['client_first_name'] = client.first_name or "Customer"
    context['client_email'] = client.email or ""

    # Tenant details
    context['business_name'] = tenant.name or "Our Salon/Clinic" # Use tenant name
    context['tenant_name'] = tenant.name or "Our Salon/Clinic" # Alias
    context['business_contact_email'] = tenant.contact_email or ""
    context['business_contact_phone'] = tenant.contact_phone or ""
    context['business_website_url'] = tenant.website_url or ""
    # Add address parts if needed: tenant.address_street etc.

    # Appointment details - with timezone conversion
    appointment_time_utc = appointment.appointment_time # Assumes stored in UTC or with tzinfo

    try:
        tenant_tz_str = tenant.timezone or 'UTC' # Default to UTC if not set
        tenant_tz = pytz.timezone(tenant_tz_str)
        appointment_time_local = appointment_time_utc.astimezone(tenant_tz)

        context['appointment_time'] = appointment_time_local.strftime('%Y-%m-%d %I:%M %p %Z') # e.g., 2023-10-27 02:30 PM EST
        context['appointment_date'] = appointment_time_local.strftime('%Y-%m-%d') # e.g., 2023-10-27
        context['appointment_start_time'] = appointment_time_local.strftime('%I:%M %p') # e.g., 02:30 PM
    except Exception as tz_err:
         logger.warning(f"Timezone conversion error for tenant {tenant.id} (tz='{tenant.timezone}'): {tz_err}. Using UTC.")
         # Fallback to UTC formatting
         context['appointment_time'] = appointment_time_utc.strftime('%Y-%m-%d %H:%M UTC')
         context['appointment_date'] = appointment_time_utc.strftime('%Y-%m-%d')
         context['appointment_start_time'] = appointment_time_utc.strftime('%H:%M')


    # Service details
    context['service_names'] = ", ".join([s.name for s in appointment.services]) if appointment.services else "Selected Service(s)"

    # Links (These would need to be generated based on app routes and maybe tokens)
    context['confirmation_link'] = f"https://{tenant.subdomain}.{settings.base_domain}/confirm?token=XYZ" # Placeholder
    context['cancellation_link'] = f"https://{tenant.subdomain}.{settings.base_domain}/cancel?appt_id={appointment.id}&token=ABC" # Placeholder

    logger.debug(f"Prepared context for Appt ID {appointment.id}: {list(context.keys())}") # Log keys only
    return context

def _render_template(template_string: str, context: Dict[str, Any]) -> str:
    """Renders a template string using Jinja2."""
    try:
        template = jinja_env.from_string(template_string)
        rendered = template.render(context)
        return rendered
    except Exception as e:
        logger.error(f"Jinja2 rendering error: {e}", exc_info=True)
        # Return a simple error message or the original string on failure
        return f"Error rendering template: {e}"

# --- Default Template Fallbacks ---
# Define simple default content if no template is found in DB
DEFAULT_TEMPLATES = {
    TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT: {
        "subject": "Your Appointment Confirmation with {{ business_name }}",
        "body": """<p>Hi {{ client_first_name }},</p>
                   <p>Your appointment with {{ business_name }} for {{ service_names }} is confirmed for {{ appointment_time }}.</p>
                   <p>Location: [Business Address Here]</p>
                   <p>Contact us at {{ tenant_contact_phone }} or {{ tenant_contact_email }} if you have questions.</p>
                   <p>Thank you!</p>"""
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
                   <p>If you did not request this cancellation, please contact us immediately at {{ tenant_contact_phone }} or {{ tenant_contact_email }}.</p>"""
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
    # Add defaults for other triggers like reminder, update etc.
}

# --- Main Notification Function ---

async def send_appointment_notification(
    db: Session,
    appointment: Appointment,
    event_trigger: TemplateEventTrigger,
    recipient_override: Optional[str] = None # e.g., Send admin notification to tenant.contact_email
):
    """
    Fetches template, renders, sends email, and logs communication for an appointment event.
    Adds log entry to session but DOES NOT COMMIT.
    """
    tenant = appointment.tenant
    client = appointment.client

    if not tenant or not client:
        logger.error(f"Cannot send notification for Appt ID {appointment.id}: Missing Tenant or Client relationship.")
        return

    # Determine recipient
    recipient_email = recipient_override
    log_comm_type = LogCommType.UPDATE # Default log type
    is_admin_notification = False

    if not recipient_email:
        if event_trigger in [TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT,
                             TemplateEventTrigger.APPOINTMENT_REMINDER_CLIENT,
                             TemplateEventTrigger.APPOINTMENT_CANCELLED_CLIENT,
                             TemplateEventTrigger.APPOINTMENT_UPDATED_CLIENT,
                             TemplateEventTrigger.CLIENT_CONFIRMATION]:
            recipient_email = client.email
            # Determine specific log type based on trigger
            if event_trigger == TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT: log_comm_type = LogCommType.CONFIRMATION
            elif event_trigger == TemplateEventTrigger.APPOINTMENT_REMINDER_CLIENT: log_comm_type = LogCommType.REMINDER
            elif event_trigger == TemplateEventTrigger.APPOINTMENT_CANCELLED_CLIENT: log_comm_type = LogCommType.CANCELLATION
            # Add others as needed

        elif event_trigger in [TemplateEventTrigger.APPOINTMENT_BOOKED_ADMIN,
                               TemplateEventTrigger.APPOINTMENT_CANCELLED_ADMIN,
                               TemplateEventTrigger.APPOINTMENT_UPDATED_ADMIN]:
            recipient_email = tenant.contact_email # Send admin notifications here
            is_admin_notification = True
             # Use SYSTEM_ALERT for admin notifications? Or keep specific type? Let's keep specific for now.
            if event_trigger == TemplateEventTrigger.APPOINTMENT_BOOKED_ADMIN: log_comm_type = LogCommType.CONFIRMATION # Log as confirmation from system perspective
            elif event_trigger == TemplateEventTrigger.APPOINTMENT_CANCELLED_ADMIN: log_comm_type = LogCommType.CANCELLATION
        else:
            logger.warning(f"No default recipient defined for event trigger: {event_trigger.value}")
            return

    if not recipient_email:
        logger.warning(f"No recipient email found for notification trigger {event_trigger.value}, Appt ID {appointment.id}. Skipping send.")
        # Log maybe? Or just return. Let's just return for now.
        return

    # Get template or use default
    template = _get_template(db, tenant.id, event_trigger)
    context = _prepare_context(appointment)

    subject_template = ""
    body_template = ""

    if template:
        logger.info(f"Using template ID {template.id} ('{template.name}') for trigger {event_trigger.value}")
        subject_template = template.email_subject or DEFAULT_TEMPLATES.get(event_trigger, {}).get("subject", "Appointment Update")
        body_template = template.email_body
    else:
        logger.warning(f"No active custom template found for trigger {event_trigger.value}, tenant {tenant.id}. Using default.")
        default_content = DEFAULT_TEMPLATES.get(event_trigger)
        if default_content:
            subject_template = default_content["subject"]
            body_template = default_content["body"]
        else:
             logger.error(f"No default template content defined for trigger {event_trigger.value}! Cannot send notification.")
             return # Cannot proceed without content

    # Render template
    rendered_subject = _render_template(subject_template, context)
    rendered_plain_body = _render_template(body_template, context)
    
    html_compatible_body = rendered_plain_body.replace('\n', '<br>\n')

    # Send email (asynchronously)
    send_success = await send_email(
        to_email=recipient_email,
        subject=rendered_subject,
        html_body=html_compatible_body,
        tenant=tenant,
        # Reply-To is handled within send_email based on tenant.contact_email
    )

    # Log the communication attempt (add log entry to session)
    log_status = CommunicationStatus.SENT if send_success else CommunicationStatus.FAILED
    log_details = f"Subject: {rendered_subject}" if send_success else f"Failed to send. Check email service logs." # Or add specific error from send_email if returned

    create_communication_log(
        db=db,
        tenant_id=tenant.id,
        client_id=client.id if not is_admin_notification else None, # Log client ID only if sent to client
        appointment_id=appointment.id,
        type=log_comm_type, # Use the specific log type determined earlier
        channel=CommunicationChannel.EMAIL,
        status=log_status,
        details=log_details
        # user_id = ? # Not applicable for automated sends unless triggered by specific user action context
    )
    # --- IMPORTANT: No db.commit() here ---
    logger.info(f"Notification attempt logged for Appt ID {appointment.id}, Trigger {event_trigger.value}, Status {log_status.value}")
