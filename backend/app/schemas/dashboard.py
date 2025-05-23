# app/schemas/dashboard.py
# --- NEW FILE ---

from pydantic import BaseModel, Field
from typing import Literal, List # To strongly type the period
from datetime import date

# Define the Literal type for allowed period values, matching the frontend type
StatsPeriod = Literal[
    'yesterday',
    'last_7_days',
    'last_30_days',
    'this_month',
    'last_month',
    'all_time'
]

class DashboardStats(BaseModel):
    """
    Schema for returning aggregated dashboard statistics.
    Mirrors the DashboardStats interface in the frontend types.
    """
    # Fixed Widgets (No date range applied)
    appointments_today: int = Field(..., description="Count of appointments scheduled for today.")
    expected_revenue_today: float = Field(..., description="Sum of prices for non-cancelled appointments today.")
    pending_appointments_total: int = Field(..., description="Total count of appointments with 'pending' status.")
    unconfirmed_clients_total: int = Field(..., description="Total count of active clients with 'is_confirmed=false'.")
    upcoming_appointments_next_7_days: int = Field(..., description="Count of pending/confirmed appointments in the next 7 days (including today).")

    # Period-based Widgets (Affected by selected period)
    selected_period: StatsPeriod = Field(..., description="The time period used for calculating period-based stats.")
    completed_appointments_period: int = Field(..., description="Count of 'done' appointments within the selected period.")
    revenue_period: float = Field(..., description="Sum of prices for 'done' appointments within the selected period.")
    new_clients_period: int = Field(..., description="Count of clients created within the selected period.")
    appointments_change_today: float = Field(..., description="Percentage change in appointments from yesterday to today.")
    revenue_change_today: float = Field(..., description="Percentage change in revenue from yesterday to today.")
    class Config:
        # Pydantic V2 uses from_attributes instead of orm_mode
        from_attributes = True
        # Example for OpenAPI documentation if needed
        json_schema_extra = {
            "example": {
                "appointments_today": 5,
                "expected_revenue_today": 450.00,
                "pending_appointments_total": 12,
                "unconfirmed_clients_total": 8,
                "upcoming_appointments_next_7_days": 25,
                "selected_period": "last_7_days",
                "completed_appointments_period": 35,
                "revenue_period": 3250.50,
                "new_clients_period": 6
            }
        }

class DailyRevenue(BaseModel):
    date: date # Representing the day
    revenue: float
    
class RevenueTrendData(BaseModel):
    # Option 1: Separate labels and data (matches frontend example more easily initially)
    # labels: List[str] # Could be formatted date strings or day names
    # data: List[float]
    # Option 2: List of objects (more structured, often preferred)
    trend: List[DailyRevenue]
