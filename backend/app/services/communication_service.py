# app/services/communication_service.py
# --- MODIFIED ---

from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional # Use Optional instead of Union[..., None]

# Import needed models and enums
from app.models.communications_log import (
    CommunicationsLog,
    CommunicationType,
    CommunicationChannel,
    CommunicationStatus,
    CommunicationDirection # Import the direction enum
)
# Import logger (ensure it's configured correctly in your app, e.g., app.core.logging_config)
import logging
logger = logging.getLogger(__name__)

def create_communication_log(
    db: Session,
    *, # Force keyword arguments
    tenant_id: int,
    type: CommunicationType,
    channel: CommunicationChannel, # Channel should generally be required
    direction: CommunicationDirection, # Add direction parameter
    status: CommunicationStatus, # Status should be passed explicitly now (not defaulted to SIMULATED here)
    client_id: Optional[int] = None,
    appointment_id: Optional[int] = None,
    user_id: Optional[int] = None, # Add user_id parameter (for manual logs/audit)
    subject: Optional[str] = None, # Add subject parameter
    notes: Optional[str] = None # Renamed from details, make optional? Or required based on type?
) -> Optional[CommunicationsLog]: # Return type hint correction
    """
    Creates and adds a new communication log entry to the database session.
    Does NOT commit the transaction.

    Args:
        db: The SQLAlchemy database session.
        tenant_id: ID of the tenant.
        type: The type of communication (e.g., CONFIRMATION, MANUAL_PHONE).
        channel: The channel used (e.g., EMAIL, PHONE).
        direction: The direction of the communication (INBOUND, OUTBOUND, SYSTEM).
        status: The final status of the communication attempt (e.g., SENT, FAILED, LOGGED).
        client_id: Optional ID of the client involved.
        appointment_id: Optional ID of the related appointment.
        user_id: Optional ID of the user who initiated/logged the communication.
        subject: Optional subject line or brief summary.
        notes: Optional detailed notes or body snippet.

    Returns:
        The created CommunicationsLog object (uncommitted) or None if an error occurred.
    """
    # Log with all parameters for better debugging
    logger.info(
        f"Preparing communication log: Tenant={tenant_id}, Client={client_id}, Appt={appointment_id}, "
        f"User={user_id}, Type={type.value}, Channel={channel.value}, Dir={direction.value}, "
        f"Status={status.value}, Subject='{subject is not None}' Notes='{notes is not None}'"
    )
    try:
        log_entry = CommunicationsLog(
            tenant_id=tenant_id,
            client_id=client_id,
            appointment_id=appointment_id,
            user_id=user_id, # Assign user_id
            type=type,
            channel=channel,
            status=status, # Assign status passed from caller
            direction=direction, # Assign direction
            timestamp=datetime.now(timezone.utc), # Log creation time
            subject=subject, # Assign subject
            notes=notes # Assign notes
        )
        db.add(log_entry)
        # Flush is sometimes needed if you need the log_entry.id immediately
        # before the main transaction commits, but usually not required here.
        # db.flush()
        logger.debug(f"Communication log entry added to session for Tenant {tenant_id}.")
        return log_entry
    except Exception as e:
        # Log the error thoroughly but don't raise, allow main operation to proceed/fail.
        logger.error(
            f"Failed to create communication log object for Tenant {tenant_id}, Client {client_id}, "
            f"Type {type.value}: {e}",
            exc_info=True
        )
        # Explicitly return None on failure
        return None
