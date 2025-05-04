# app/services/email_service.py
# --- NEW FILE ---

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
from typing import Optional
from fastapi.concurrency import run_in_threadpool

from app.config import settings # Import your settings
import logging
logger = logging.getLogger(__name__)

from app.models.tenant import Tenant # To get Reply-To address

# --- Core Sending Function ---

async def send_email( # <--- Make async
    to_email: str,
    subject: str,
    html_body: str,
    tenant: Tenant,
    reply_to_email: Optional[str] = None
) -> bool:
    """
    Sends an email using configured SMTP settings (Mailtrap). Runs blocking
    SMTP calls in a threadpool to avoid blocking the event loop.
    """
    if not all([settings.mail_server, settings.mail_username, settings.mail_password]):
        logger.error("Mail server settings are not configured.")
        return False

    final_reply_to = reply_to_email or tenant.contact_email or settings.mail_from_address
    sender_name = settings.mail_from_name
    sender_email = settings.mail_from_address

    message = MIMEMultipart("alternative")
    message['From'] = formataddr((str(Header(sender_name, 'utf-8')), sender_email))
    message['To'] = to_email
    message['Subject'] = Header(subject, 'utf-8').encode()
    if final_reply_to:
        message.add_header('Reply-To', final_reply_to)

    part_html = MIMEText(html_body, "html", "utf-8")
    message.attach(part_html)

    def blocking_smtp_send(): # <--- Define the blocking part
        try:
            with smtplib.SMTP(settings.mail_server, settings.mail_port) as server:
                server.set_debuglevel(0)
                server.ehlo()
                if server.has_extn('starttls'):
                    server.starttls()
                    server.ehlo()
                if settings.mail_username and settings.mail_password:
                    server.login(settings.mail_username, settings.mail_password)
                server.sendmail(
                    from_addr=sender_email,
                    to_addrs=[to_email],
                    msg=message.as_string()
                )
                logger.info(f"Email successfully sent (accepted by server) to {to_email}.")
                return True
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error occurred sending email to {to_email}: {e}", exc_info=True)
            return False
        except OSError as e:
            logger.error(f"Network error occurred sending email to {to_email}: {e}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {e}", exc_info=True)
            return False

    # --- Run the blocking function in a threadpool ---
    try:
        success = await run_in_threadpool(blocking_smtp_send)
        return success
    except Exception as e:
         # Error during threadpool execution itself (less likely)
         logger.error(f"Threadpool error executing email send to {to_email}: {e}", exc_info=True)
         return False
