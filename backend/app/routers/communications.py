# app/routers/communications.py
# --- NEW FILE or Add Endpoint ---

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import exc as SQLAlchemyExceptions, desc # Import desc for ordering
from typing import List, Optional

# Core App Imports
from app import database, models, schemas
from app.dependencies import get_current_user
from app.models.user import User as UserModel
from app.models.client import Client as ClientModel # Need Client to verify tenant scope
from app.models.communications_log import ( 
    CommunicationsLog as CommunicationsLogModel,
    CommunicationType,
    CommunicationChannel,
    CommunicationStatus,
    CommunicationDirection
)
# Import Schemas
from app.schemas.communications_log import ManualLogCreate, CommunicationsLogOut
from app.schemas.pagination import PaginatedResponse # Assuming a generic pagination schema exists
# Import Services
from app.services.communication_service import create_communication_log
import logging
# Set up logger
logger = logging.getLogger(__name__)
from datetime import datetime, timezone
from app.models.communications_log import CommunicationChannel
router = APIRouter(
    prefix="/communications",
    tags=["Communications"]
)

# --- POST /communications/manual (Manual Log Creation) ---
@router.post(
    "/manual",
    response_model=CommunicationsLogOut, # Return the created log
    status_code=status.HTTP_201_CREATED
)
def create_manual_communication_log(
    log_data: ManualLogCreate,
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_user) # Requires authentication
):
    """
    Manually logs a communication interaction (Phone, Email, SMS, In-Person, etc.).
    Accessible by staff, admin, super_admin for their own tenant's clients.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not associated with a tenant.")

    tenant_id = current_user.tenant_id
    logger.info(f"User {current_user.email} attempting to manually log communication for Client ID: {log_data.client_id} (Tenant: {tenant_id})")

    # --- Authorization & Validation ---
    # 1. Verify client belongs to the user's tenant
    client = db.query(ClientModel).filter(
        ClientModel.id == log_data.client_id,
        ClientModel.tenant_id == tenant_id
    ).first()
    if not client:
        logger.warning(f"Manual log rejected: Client ID {log_data.client_id} not found or doesn't belong to Tenant ID {tenant_id}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found or access denied.")

    # 2. Verify appointment belongs to the user's tenant (if provided)
    if log_data.appointment_id:
        appointment = db.query(models.Appointment).filter(
             models.Appointment.id == log_data.appointment_id,
             models.Appointment.tenant_id == tenant_id
        ).first()
        if not appointment:
            logger.warning(f"Manual log rejected: Appointment ID {log_data.appointment_id} not found or doesn't belong to Tenant ID {tenant_id}.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated appointment not found or access denied.")
        # Optional: Check if appointment client matches log_data.client_id? Usually good.
        if appointment.client_id != log_data.client_id:
             logger.warning(f"Manual log rejected: Appointment ID {log_data.appointment_id} client ({appointment.client_id}) does not match provided Client ID {log_data.client_id}.")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment does not belong to the specified client.")
    # --- DEBUGGING ---
    print("-" * 20)
    print("DEBUG: Inside create_manual_communication_log")
    try:
        print(f"DEBUG: CommunicationChannel members: {[member.name for member in CommunicationChannel]}")
        print(f"DEBUG: Accessing PHONE: {CommunicationChannel.PHONE}")
        print(f"DEBUG: Accessing PHONE value: {CommunicationChannel.PHONE.value}")
    except Exception as e:
        print(f"DEBUG: ERROR accessing CommunicationChannel: {e}")
    print("-" * 20)
    # --- END DEBUGGING ---

    # 3. Determine Communication Type based on Channel
    # Map input channel string back to the correct CommunicationType enum member
    comm_type_mapping = {
        CommunicationChannel.EMAIL.value: CommunicationType.MANUAL_EMAIL,
        CommunicationChannel.SMS.value: CommunicationType.MANUAL_SMS,
        CommunicationChannel.PHONE.value: CommunicationType.MANUAL_PHONE,
        CommunicationChannel.IN_PERSON.value: CommunicationType.MANUAL_IN_PERSON,
        CommunicationChannel.VIRTUAL_MEETING.value: CommunicationType.MANUAL_VIRTUAL_MEETING,
        CommunicationChannel.OTHER.value: CommunicationType.MANUAL_OTHER,
    }
    comm_type = comm_type_mapping.get(log_data.channel) # Get enum member
    if not comm_type:
         # Should be caught by Pydantic Literal validation, but belt-and-suspenders
         logger.error(f"Invalid channel value '{log_data.channel}' passed for manual log.")
         raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid communication channel provided.")

    # --- Create Log Entry using Service ---
    log_entry = create_communication_log(
        db=db,
        tenant_id=tenant_id,
        client_id=log_data.client_id,
        appointment_id=log_data.appointment_id,
        user_id=current_user.id, # Logged by the current user
        type=comm_type,
        channel=CommunicationChannel(log_data.channel), # Convert validated string back to enum
        direction=log_data.direction, # Pass direction from validated input
        status=CommunicationStatus.LOGGED, # Specific status for manual logs
        subject=log_data.subject,
        notes=log_data.notes,
        # Use provided timestamp or default to now (handled by model default if timestamp is None)
        # Note: Model timestamp uses server_default, so it will apply if not set here.
        # If you want to explicitly allow overriding, the model would need adjustment
        # or set it here directly based on input:
        # timestamp = log_data.timestamp or datetime.now(timezone.utc)
    )

    if not log_entry:
        # Error during log object creation (logged by service)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to prepare communication log entry.")

    # --- Commit Transaction ---
    try:
        # If timestamp needs explicit setting based on input:
        if log_data.timestamp:
             log_entry.timestamp = log_data.timestamp # Override server default
        db.commit()
        db.refresh(log_entry) # Load relationship data if needed by response model
        # Optionally refresh user relationship if needed in response
        if log_entry.user:
            db.refresh(log_entry.user)
        logger.info(f"Manual communication log ID {log_entry.id} created successfully by User ID {current_user.id}.")
        return log_entry
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error saving manual log for Client {log_data.client_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not save log due to conflicting data.")
    except Exception as e:
        db.rollback()
        logger.error(f"Database error saving manual log for Client {log_data.client_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save communication log.")


# --- GET /clients/{client_id}/communications/ (Paginated List for Client) ---
# Add this endpoint to app/routers/clients.py

# In app/routers/clients.py:
# Add imports:
# from app.models.communications_log import CommunicationsLog as CommunicationsLogModel
# from app.schemas.communications_log import CommunicationsLogOut
# from app.schemas.pagination import PaginatedResponse # Assuming this schema exists
# from typing import List, Optional
# from sqlalchemy import desc
# from fastapi import Query

# @router.get(
#     "/{client_id}/communications/",
#     response_model=PaginatedResponse[CommunicationsLogOut] # Use generic pagination schema
# )
# def list_client_communications(
#     client_id: int,
#     page: int = Query(1, ge=1, description="Page number"),
#     limit: int = Query(6, ge=1, le=50, description="Items per page"), # Default to 6 per requirement
#     db: Session = Depends(database.get_db),
#     current_user: UserModel = Depends(get_current_user) # All roles can view
# ):
#     """
#     Retrieves a paginated list of communication logs for a specific client,
#     ensuring the client belongs to the user's tenant.
#     """
#     if not current_user.tenant_id:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not associated with a tenant.")

#     tenant_id = current_user.tenant_id
#     logger.info(f"User {current_user.email} listing communications for Client ID: {client_id} (Tenant: {tenant_id}), Page: {page}, Limit: {limit}")

#     # --- Authorization & Validation ---
#     # 1. Verify client belongs to the user's tenant
#     client = db.query(ClientModel).filter(
#         ClientModel.id == client_id,
#         ClientModel.tenant_id == tenant_id
#     ).first()
#     if not client:
#         logger.warning(f"Communications list rejected: Client ID {client_id} not found or doesn't belong to Tenant ID {tenant_id}.")
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found or access denied.")

#     # --- Query Logs with Pagination ---
#     offset = (page - 1) * limit
#     base_query = db.query(CommunicationsLogModel).filter(
#         CommunicationsLogModel.client_id == client_id,
#         # Optional: Also filter by tenant_id for extra safety, though client check implies it
#         # CommunicationsLogModel.tenant_id == tenant_id
#     )

#     try:
#         total_count = base_query.count() # Get total count before pagination
#         logs = base_query.order_by(
#             desc(CommunicationsLogModel.timestamp) # Order by most recent first
#         ).offset(offset).limit(limit).all()

#         logger.info(f"Found {len(logs)} communication logs (Total: {total_count}) for Client ID: {client_id} on page {page}.")

#         return PaginatedResponse(
#             total=total_count,
#             page=page,
#             limit=limit,
#             items=logs # Pydantic will convert model instances using CommunicationsLogOut schema
#         )
#     except Exception as e:
#          logger.error(f"Error querying communications for Client ID {client_id}: {e}", exc_info=True)
#          raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve communication logs.")
