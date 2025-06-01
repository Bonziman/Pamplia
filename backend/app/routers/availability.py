# app/routers/availability.py
from fastapi import APIRouter, HTTPException, Depends, Query, Request, status
from sqlalchemy.orm import Session
# from sqlalchemy import func, cast, Date as SQLDate # Not used in this snippet
from typing import List, Dict
from datetime import datetime, date as DDate, time, timedelta, timezone as pytimezone

from app.database import get_db
from app.models.tenant import Tenant as TenantModel
from app.models.appointment import Appointment as AppointmentModel
from app.models.service import Service as ServiceModel
from app.schemas.availability import AvailabilityResponse
from app.dependencies import get_tenant_from_request_subdomain
# from app.core.config import settings # Not used directly, but could be for defaults
from app.schemas.enums import AppointmentStatus

try:
    import zoneinfo
except ImportError:
    from backports import zoneinfo

import logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/availability",
    tags=["Availability"]
)

# CONFIGURABLE DEFAULT - consider moving to settings or TenantModel
DEFAULT_SLOT_STEP_MINUTES = 15


def get_timezone_object(tz_string: str):
    """Helper to get a timezone object."""
    try:
        return zoneinfo.ZoneInfo(tz_string)
    except zoneinfo.ZoneInfoNotFoundError:
        logger.warning(f"Tenant timezone '{tz_string}' not found, defaulting to UTC.")
        return zoneinfo.ZoneInfo("UTC")


@router.get("/", response_model=AvailabilityResponse)
async def get_appointment_availability(
    request: Request,
    date_query: DDate = Query(..., description="Date to check availability for (YYYY-MM-DD)"),
    service_ids_query: str = Query(..., description="Comma-separated string of service IDs"),
    db: Session = Depends(get_db)
):
    logger.info(f"Availability check requested for date: {date_query}, services: '{service_ids_query}'")

    # 1. Resolve Tenant
    try:
        tenant = await get_tenant_from_request_subdomain(request, db)
        logger.info(f"Tenant resolved: {tenant.name} (ID: {tenant.id}), Subdomain: {tenant.subdomain}")
    except HTTPException as e:
        logger.error(f"Failed to resolve tenant for availability: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error resolving tenant: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error resolving tenant information.")

    # 2. Parse Service IDs & Calculate Total Duration
    try:
        s_ids = [int(s_id.strip()) for s_id in service_ids_query.split(',') if s_id.strip().isdigit()]
        if not s_ids:
            raise ValueError("No valid service IDs provided.")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid service_ids format. Must be comma-separated integers.")

    services = db.query(ServiceModel).filter(ServiceModel.id.in_(s_ids), ServiceModel.tenant_id == tenant.id).all()
    if len(services) != len(s_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more requested services not found for this tenant.")
    
    total_required_duration_minutes = sum(service.duration_minutes for service in services)
    if total_required_duration_minutes <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Total service duration must be positive.")
    logger.info(f"Total required duration: {total_required_duration_minutes} minutes.")

    # 3. Determine Operating Intervals for the Selected Date (in UTC)
    #    SIMPLIFIED: Assumes business hours are within the same calendar day locally.
    tenant_tz_str = tenant.timezone or "UTC"
    tenant_tz = get_timezone_object(tenant_tz_str)
    
    day_of_week_str = date_query.strftime("%A").lower()
    
    business_hours_for_day = None
    if tenant.business_hours_config and day_of_week_str in tenant.business_hours_config:
        business_hours_for_day = tenant.business_hours_config[day_of_week_str]

    if not business_hours_for_day or not business_hours_for_day.get("isOpen") or not business_hours_for_day.get("intervals"):
        logger.info(f"Tenant {tenant.id} is closed or has no intervals for {day_of_week_str} ({date_query}).")
        return AvailabilityResponse(available_slots=[], date_checked=date_query, timezone_queried=tenant_tz_str)

    work_intervals_utc: List[Dict[str, datetime]] = []
    for interval_str_obj in business_hours_for_day["intervals"]:
        try:
            start_time_obj = datetime.strptime(interval_str_obj["start"], "%H:%M").time()
            end_time_obj = datetime.strptime(interval_str_obj["end"], "%H:%M").time()

            # Constraint: Business hours must be within the same calendar day.
            # If end time is on or before start time, it's an invalid interval for a single day.
            if end_time_obj <= start_time_obj:
                logger.warning(
                    f"Skipping invalid business interval for {date_query} (tenant {tenant.id}): "
                    f"end time '{interval_str_obj['end']}' ({end_time_obj}) is not after start time "
                    f"'{interval_str_obj['start']}' ({start_time_obj}) for same-day operation."
                )
                continue

            # Combine with date_query, attach tenant's timezone
            start_dt_local = datetime.combine(date_query, start_time_obj, tzinfo=tenant_tz)
            end_dt_local = datetime.combine(date_query, end_time_obj, tzinfo=tenant_tz)
            
            # Convert to UTC
            start_utc = start_dt_local.astimezone(pytimezone.utc)
            end_utc = end_dt_local.astimezone(pytimezone.utc)

            # This check is still important, e.g., for DST transitions that might make end_utc <= start_utc
            # even if local times were valid (e.g. "spring forward" losing an hour).
            if end_utc <= start_utc:
                logger.warning(
                    f"Skipping work interval due to invalid UTC times after conversion: "
                    f"{start_utc.isoformat()} to {end_utc.isoformat()} "
                    f"(from local {start_dt_local.isoformat()} to {end_dt_local.isoformat()}). "
                    f"This might occur around DST changes or with unusual timezone definitions."
                )
                continue
                
            work_intervals_utc.append({
                "start_utc": start_utc,
                "end_utc": end_utc
            })
        except ValueError as e:
            logger.error(f"Error parsing time interval '{interval_str_obj}' for tenant {tenant.id}: {e}")
            continue # Skip this malformed interval
    
    if not work_intervals_utc:
        logger.info(f"No valid work intervals in UTC for tenant {tenant.id} on {date_query} after processing business hours.")
        return AvailabilityResponse(available_slots=[], date_checked=date_query, timezone_queried=tenant_tz_str)
    logger.debug(f"Work intervals in UTC for {date_query}: {work_intervals_utc}")
    logger.info(f"Work intervals in UTC for {date_query}: {work_intervals_utc}")


    # 4. Fetch Existing Appointments to determine Busy Intervals (UTC)
    day_start_on_queried_date_local = datetime.combine(date_query, time.min, tzinfo=tenant_tz)
    start_of_next_day_local = datetime.combine(date_query + timedelta(days=1), time.min, tzinfo=tenant_tz)
    
    query_appointments_start_utc = day_start_on_queried_date_local.astimezone(pytimezone.utc)
    query_appointments_end_utc = start_of_next_day_local.astimezone(pytimezone.utc)

    logger.debug(f"Querying existing appointments for tenant {tenant.id} that START between UTC: {query_appointments_start_utc.isoformat()} and {query_appointments_end_utc.isoformat()}")
    
    existing_appointments_on_day = db.query(AppointmentModel).filter(
        AppointmentModel.tenant_id == tenant.id,
        AppointmentModel.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]),
        AppointmentModel.appointment_time >= query_appointments_start_utc,
        AppointmentModel.appointment_time < query_appointments_end_utc
    ).all()

    busy_utc_intervals: List[Dict[str, datetime]] = []
    logger.debug(f"Normalizing {len(existing_appointments_on_day)} existing appointments to UTC...")
    for appt in existing_appointments_on_day:
        raw_start_time = appt.appointment_time
        raw_end_time = appt.end_datetime_utc

        
        
        logger.debug(f"  Appt ID {appt.id}: Raw start='{raw_start_time.isoformat() if hasattr(raw_start_time, 'isoformat') else raw_start_time}' (tz: {raw_start_time.tzinfo if hasattr(raw_start_time, 'tzinfo') else 'N/A'}), "
                     f"Raw end='{raw_end_time.isoformat() if hasattr(raw_end_time, 'isoformat') else raw_end_time}' (tz: {raw_end_time.tzinfo if hasattr(raw_end_time, 'tzinfo') else 'N/A'})")

        # Normalize start time to UTC with pytimezone.utc
        if raw_start_time.tzinfo is None:
            # Assume naive datetime from DB is UTC if not specified otherwise by ORM/DB settings
            # If it's meant to be local, it should have been made aware with tenant_tz first.
            # For now, sticking to the idea that DB times are either UTC-aware or naive-UTC.
            start_utc = raw_start_time.replace(tzinfo=pytimezone.utc)
            logger.debug(f"    Appt ID {appt.id}: Start was naive, assumed UTC and made aware: {start_utc.isoformat()}")
        elif raw_start_time.tzinfo.utcoffset(raw_start_time) != pytimezone.utc.utcoffset(None): # Compare offsets
            original_tz_str = str(raw_start_time.tzinfo)
            start_utc = raw_start_time.astimezone(pytimezone.utc)
            logger.debug(f"    Appt ID {appt.id}: Start was {original_tz_str}, converted to UTC: {start_utc.isoformat()}")
        else: # Already UTC (could be zoneinfo.ZoneInfo("UTC") or datetime.timezone.utc)
            # Ensure the tzinfo object is specifically pytimezone.utc for consistency if needed,
            # though comparison logic handles different UTC tzinfo objects.
            # For strictness, one might do: start_utc = raw_start_time.astimezone(pytimezone.utc)
            start_utc = raw_start_time 
            if start_utc.tzinfo != pytimezone.utc: # If it's zoneinfo UTC, convert to datetime.timezone.utc
                 start_utc = start_utc.astimezone(pytimezone.utc)
            logger.debug(f"    Appt ID {appt.id}: Start already effectively UTC ({start_utc.tzinfo}): {start_utc.isoformat()}")

        # Normalize end time to UTC with pytimezone.utc
        if raw_end_time.tzinfo is None:
            end_utc = raw_end_time.replace(tzinfo=pytimezone.utc)
            logger.debug(f"    Appt ID {appt.id}: End was naive, assumed UTC and made aware: {end_utc.isoformat()}")
        elif raw_end_time.tzinfo.utcoffset(raw_end_time) != pytimezone.utc.utcoffset(None): # Compare offsets
            original_tz_str = str(raw_end_time.tzinfo)
            end_utc = raw_end_time.astimezone(pytimezone.utc)
            logger.debug(f"    Appt ID {appt.id}: End was {original_tz_str}, converted to UTC: {end_utc.isoformat()}")
        else: # Already UTC
            end_utc = raw_end_time
            if end_utc.tzinfo != pytimezone.utc: # If it's zoneinfo UTC, convert to datetime.timezone.utc
                 end_utc = end_utc.astimezone(pytimezone.utc)
            logger.debug(f"    Appt ID {appt.id}: End already effectively UTC ({end_utc.tzinfo}): {end_utc.isoformat()}")
        
        busy_utc_intervals.append({"start_utc": start_utc, "end_utc": end_utc})
    
    # This log should now reflect purely UTC timings if the above logic worked.
    logger.debug(f"Found {len(busy_utc_intervals)} busy UTC intervals (normalized) for {date_query} (Tenant {tenant.id}): {busy_utc_intervals}")
    logger.info(f" busy UTC intervals for {date_query} (Tenant {tenant.id}): {busy_utc_intervals}")
    # 5. Generate Potential Slots & Check Availability
    available_slots_utc: List[datetime] = []
    slot_step_minutes = getattr(tenant, 'slot_increment_minutes', DEFAULT_SLOT_STEP_MINUTES) 
    
    logger.debug(f"Using slot step: {slot_step_minutes} minutes. Required duration: {total_required_duration_minutes} minutes.")

    for work_interval in work_intervals_utc:
        current_potential_slot_start_utc = work_interval["start_utc"]
        work_interval_end_utc = work_interval["end_utc"]
        
        logger.debug(f"Processing work interval: {current_potential_slot_start_utc.isoformat()} to {work_interval_end_utc.isoformat()}")

        while True:
            potential_slot_end_utc = current_potential_slot_start_utc + timedelta(minutes=total_required_duration_minutes)

            if potential_slot_end_utc > work_interval_end_utc:
                logger.debug(f"  Slot {current_potential_slot_start_utc.isoformat()} - {potential_slot_end_utc.isoformat()} ends after work interval. Stopping for this work interval.")
                break 

            is_slot_free = True
            for busy_idx, busy_interval in enumerate(busy_utc_intervals):
                # These busy_start/end are now guaranteed to be UTC with pytimezone.utc tzinfo
                busy_start = busy_interval["start_utc"] 
                busy_end = busy_interval["end_utc"]

                # Log values used in comparison for the specific iteration causing issues
                # logger.debug(
                #     f"    Checking slot {current_potential_slot_start_utc.isoformat()}-{potential_slot_end_utc.isoformat()} "
                #     f"against busy interval #{busy_idx}: {busy_start.isoformat()}-{busy_end.isoformat()}"
                # )
                
                # Overlap condition: max(start1, start2) < min(end1, end2)
                # All datetimes here should be UTC and timezone-aware (with pytimezone.utc)
                if max(current_potential_slot_start_utc, busy_start) < min(potential_slot_end_utc, busy_end):
                    logger.debug(
                        f"  Conflict DETECTED: Slot {current_potential_slot_start_utc.isoformat()}-{potential_slot_end_utc.isoformat()} "
                        f"overlaps with busy interval #{busy_idx}: {busy_start.isoformat()}-{busy_end.isoformat()}"
                    )
                    is_slot_free = False
                    break 
            
            if is_slot_free:
                available_slots_utc.append(current_potential_slot_start_utc)
                logger.debug(f"  Found available slot (UTC): {current_potential_slot_start_utc.isoformat()}")
            # else:
                # logger.debug(f"  Slot {current_potential_slot_start_utc.isoformat()}-{potential_slot_end_utc.isoformat()} is NOT free.")


            current_potential_slot_start_utc += timedelta(minutes=slot_step_minutes)
            
            if current_potential_slot_start_utc >= work_interval_end_utc:
                 break
    
    # 6. Format available slots to "HH:MM" in tenant's timezone and remove duplicates
    formatted_available_slots = sorted(list(set(
        slot_utc.astimezone(tenant_tz).strftime("%H:%M") for slot_utc in available_slots_utc
    )))
    logger.info(f"Available slots for tenant {tenant.id} on {date_query} ({tenant_tz_str}): {formatted_available_slots}")
    return AvailabilityResponse(
        available_slots=formatted_available_slots,
        date_checked=date_query,
        timezone_queried=tenant_tz_str
    )
