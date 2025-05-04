# app/services/communication_service.py
# --- NEW FILE ---

from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Union

from app.models.communications_log import (
    CommunicationsLog, CommunicationType, CommunicationChannel, CommunicationStatus
)
import logging
logger = logging.getLogger(__name__)# Assuming your logger is configured here

def create_communication_log(
    db: Session,
    *, # Force keyword arguments
    tenant_id: int,
    type: CommunicationType,
    client_id: Union[int, None] = None,
    appointment_id: Union[int, None] = None,
    status: CommunicationStatus = CommunicationStatus.SIMULATED, # Default to simulated
    channel: Union[CommunicationChannel, None] = None, # Make channel optional
    details: Union[str, None] = None
) -> Union[CommunicationsLog, None]:
    """
    Creates a new communication log entry in the database.
    """
    logger.info(f"Logging communication: Tenant={tenant_id}, Client={client_id}, Appt={appointment_id}, Type={type.value}, Channel={channel.value}, Status={status.value}")
    try:
        log_entry = CommunicationsLog(
            tenant_id=tenant_id,
            client_id=client_id,
            appointment_id=appointment_id,
            type=type,
            channel=channel,
            status=status,
            timestamp=datetime.now(timezone.utc), # Ensure consistent timezone
            details=details
        )
        db.add(log_entry)
        # IMPORTANT: Don't db.commit() here!
        # The commit should happen as part of the larger transaction
        # in the calling endpoint function to ensure atomicity.
        # We might need to flush to get the ID if needed immediately, but usually not.
        # db.flush()
        # db.refresh(log_entry)
        logger.debug(f"Communication log entry prepared for commit.")
        return log_entry
    except Exception as e:
        # Log the error but don't raise an exception here,
        # as logging failure shouldn't necessarily fail the main operation.
        # The calling function should handle the main operation's commit/rollback.
        logger.error(f"Failed to create communication log entry: {e}", exc_info=True)
        return None
