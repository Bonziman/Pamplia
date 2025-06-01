# app/schemas/availability.py
from pydantic import BaseModel
from typing import List
from datetime import date # For date_checked

class AvailabilityResponse(BaseModel):
    available_slots: List[str] # List of "HH:MM" strings
    date_checked: date         # YYYY-MM-DD, the date for which availability was checked
    timezone_queried: str      # The tenant's timezone string (e.g., "America/New_York")
    # Optional: could include total duration of services checked for context
    # services_duration_minutes: int 
