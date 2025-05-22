# app/routers/dashboard.py
# --- NEW FILE ---

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case
from datetime import datetime, timedelta, date, timezone

# Core App Imports (Adjust paths if necessary)
from app import database, models, schemas # Assuming schemas.__init__ imports necessary schemas
from app.dependencies import get_current_user
from app.models.tenant import Tenant as TenantModel
from app.models.user import User as UserModel
from app.models.appointment import Appointment as AppointmentModel
from app.models.client import Client as ClientModel
from app.models.service import Service as ServiceModel
from app.models.association_tables import appointment_services_table
from app.schemas.dashboard import DashboardStats, StatsPeriod # Define these in schemas
from app.schemas.enums import AppointmentStatus # Import status enum


import logging
logger = logging.getLogger(__name__)
from typing import Tuple, Optional

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

# --- Helper Function to Calculate Date Ranges ---
def get_date_range_from_period(period: StatsPeriod) -> Tuple[datetime, datetime]:
    """Calculates start and end datetime objects based on the period string."""
    today = datetime.now(timezone.utc).date() # Use UTC dates for consistency
    start_of_today = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    start_of_tomorrow = start_of_today + timedelta(days=1)

    if period == 'yesterday':
        start_date = start_of_today - timedelta(days=1)
        end_date = start_of_today
    elif period == 'last_7_days':
        start_date = start_of_today - timedelta(days=7)
        end_date = start_of_today # Up to (but not including) today
    elif period == 'last_30_days':
        start_date = start_of_today - timedelta(days=30)
        end_date = start_of_today
    elif period == 'this_month':
        start_date = start_of_today.replace(day=1)
        end_date = start_of_tomorrow # Include today for "this month"
    elif period == 'last_month':
        first_day_of_this_month = start_of_today.replace(day=1)
        last_day_of_last_month = first_day_of_this_month - timedelta(days=1)
        first_day_of_last_month = last_day_of_last_month.replace(day=1)
        start_date = datetime.combine(first_day_of_last_month, datetime.min.time(), tzinfo=timezone.utc)
        end_date = datetime.combine(first_day_of_this_month, datetime.min.time(), tzinfo=timezone.utc) # Up to start of this month
    elif period == 'all_time':
        # Use a very early date for start, or handle None appropriately in queries
        start_date = datetime(1970, 1, 1, tzinfo=timezone.utc)
        end_date = start_of_tomorrow # Include up to today
    else: # Default to last_7_days if invalid period provided
        start_date = start_of_today - timedelta(days=7)
        end_date = start_of_today

    logger.debug(f"Calculated date range for period '{period}': {start_date} to {end_date}")
    return start_date, end_date

# --- GET /dashboard (Fetch Stats) ---
@router.get("/", response_model=schemas.dashboard.DashboardStats) # Use schema from app.schemas
def get_dashboard_stats(
    period: StatsPeriod = Query('last_7_days', description="Time period for stats like revenue, completed appts."),
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_user) # Ensures authentication
):
    """
    Retrieves aggregated dashboard statistics for the current user's tenant.
    Includes fixed stats (Today, Pending) and period-based stats.
    """
    if not current_user.tenant_id:
        logger.error(f"Data Integrity Issue: User {current_user.email} has no tenant_id.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not associated with a tenant.")

    tenant_id = current_user.tenant_id
    logger.info(f"Fetching dashboard stats for Tenant ID: {tenant_id}, Period: {period}")

    # --- Date Calculations ---
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    seven_days_from_now = today_start + timedelta(days=7)
    period_start_date, period_end_date = get_date_range_from_period(period)

    # --- Database Queries ---
    try:
        # 1. Appointments Today Count
        appts_today_count = db.query(func.count(AppointmentModel.id)).filter(
            AppointmentModel.tenant_id == tenant_id,
            AppointmentModel.appointment_time >= today_start,
            AppointmentModel.appointment_time < tomorrow_start
        ).scalar() or 0
        
        # Appointments Yesterday Count
        yesterday_start = today_start - timedelta(days=1)
        appts_yesterday_count = db.query(func.count(AppointmentModel.id)).filter(
            AppointmentModel.tenant_id == tenant_id,
            AppointmentModel.appointment_time >= yesterday_start,
            AppointmentModel.appointment_time < today_start
        ).scalar() or 0
        
        # Calculate percentage change (handle division by zero)
        if appts_yesterday_count == 0:
            if appts_today_count == 0:
                appts_today_vs_yesterday_pct = 0.0
            else:
                appts_today_vs_yesterday_pct = 100.0
        else:
            appts_today_vs_yesterday_pct = ((appts_today_count - appts_yesterday_count) / appts_yesterday_count) * 100

        # 2. Expected Revenue Today (Non-cancelled appointments today)
        expected_revenue_today_query = db.query(func.sum(ServiceModel.price)).join(
            appointment_services_table, ServiceModel.id == appointment_services_table.c.service_id
        ).join(
            AppointmentModel, AppointmentModel.id == appointment_services_table.c.appointment_id
        ).filter(
            AppointmentModel.tenant_id == tenant_id,
            AppointmentModel.appointment_time >= today_start,
            AppointmentModel.appointment_time < tomorrow_start,
            AppointmentModel.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
        )
        expected_revenue_today = expected_revenue_today_query.scalar() or 0.0
        
        # 2b. Yesterday's Revenue (DONE appointments)
        revenue_yesterday_query = db.query(func.sum(ServiceModel.price)).join(
            appointment_services_table, ServiceModel.id == appointment_services_table.c.service_id
        ).join(
            AppointmentModel, AppointmentModel.id == appointment_services_table.c.appointment_id
        ).filter(
            AppointmentModel.tenant_id == tenant_id,
            AppointmentModel.appointment_time >= yesterday_start,
            AppointmentModel.appointment_time < today_start,
            AppointmentModel.status == AppointmentStatus.DONE
        )
        revenue_yesterday = revenue_yesterday_query.scalar() or 0.0

        # Calculate percentage difference between today's expected revenue and yesterday's revenue
        if revenue_yesterday == 0:
            if expected_revenue_today == 0:
                revenue_today_vs_yesterday_pct = 0.0
            else:
                revenue_today_vs_yesterday_pct = 100.0
        else:
            revenue_today_vs_yesterday_pct = ((float(expected_revenue_today) - float(revenue_yesterday)) / float(revenue_yesterday)) * 100


        # 3. Pending Appointments Total Count
        pending_appts_count = db.query(func.count(AppointmentModel.id)).filter(
            AppointmentModel.tenant_id == tenant_id,
            AppointmentModel.status == AppointmentStatus.PENDING
        ).scalar() or 0

        # 4. Unconfirmed Clients Total Count
        unconfirmed_clients_count = db.query(func.count(ClientModel.id)).filter(
            ClientModel.tenant_id == tenant_id,
            ClientModel.is_confirmed == False,
            ClientModel.is_deleted == False
        ).scalar() or 0

        # 5. Upcoming Appointments (Next 7 Days) Count
        upcoming_appts_7_days_count = db.query(func.count(AppointmentModel.id)).filter(
            AppointmentModel.tenant_id == tenant_id,
            AppointmentModel.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
            AppointmentModel.appointment_time >= today_start, # From start of today
            AppointmentModel.appointment_time < seven_days_from_now # Up to (but not including) 7 days from start of today
        ).scalar() or 0

        # --- Period Based Stats ---

        # Base query for period appointments (completed)
        period_appts_base_query = db.query(AppointmentModel).filter(
             AppointmentModel.tenant_id == tenant_id,
             AppointmentModel.appointment_time >= period_start_date,
             AppointmentModel.appointment_time < period_end_date
        )

        # 6. Completed Appointments (Period) Count
        completed_appts_period_count = period_appts_base_query.filter(
            AppointmentModel.status == AppointmentStatus.DONE
        ).count() # Use count() directly on query is often efficient

        # 7. Revenue (Period) - Sum price of completed appointments in period
        revenue_period_query = db.query(func.sum(ServiceModel.price)).join(
             appointment_services_table, ServiceModel.id == appointment_services_table.c.service_id
         ).join(
             AppointmentModel, AppointmentModel.id == appointment_services_table.c.appointment_id
         ).filter(
             AppointmentModel.tenant_id == tenant_id,
             AppointmentModel.status == AppointmentStatus.DONE,
             AppointmentModel.appointment_time >= period_start_date,
             AppointmentModel.appointment_time < period_end_date
         )
        revenue_period = revenue_period_query.scalar() or 0.0

        # 8. New Clients (Period) Count
        new_clients_period_count = db.query(func.count(ClientModel.id)).filter(
            ClientModel.tenant_id == tenant_id,
            ClientModel.created_at >= period_start_date,
            ClientModel.created_at < period_end_date
        ).scalar() or 0

    except Exception as e:
        logger.error(f"Error querying dashboard stats for Tenant ID {tenant_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve dashboard statistics."
        )

    # --- Construct Response ---
    stats_data = DashboardStats(
        appointments_today=appts_today_count,
        expected_revenue_today=float(expected_revenue_today), # Cast Decimal if needed
        pending_appointments_total=pending_appts_count,
        unconfirmed_clients_total=unconfirmed_clients_count,
        upcoming_appointments_next_7_days=upcoming_appts_7_days_count,
        selected_period=period, # Echo back the period used
        completed_appointments_period=completed_appts_period_count,
        revenue_period=float(revenue_period), # Cast Decimal if needed
        new_clients_period=new_clients_period_count,
        appointments_change=appts_today_vs_yesterday_pct,
        revenue_change=revenue_today_vs_yesterday_pct,
    )

    logger.info(f"Successfully fetched dashboard stats for Tenant ID: {tenant_id}, Period: {period}")
    return stats_data
