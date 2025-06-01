# scripts/backfill_appointment_end_times.py
# --- WARNNING this has been ran before do not run again azbi WARNNING---
import os
import sys
from datetime import timedelta, timezone
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# Add project root to Python path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.appointment import Appointment as AppointmentModel # Your actual model
from app.models.service import Service as ServiceModel # Your actual model
from app.core.config import settings # Your settings for DATABASE_URL

def run_backfill():
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        appointments_to_update = db.query(AppointmentModel).filter(AppointmentModel.end_datetime_utc == None).all()
        
        if not appointments_to_update:
            print("No appointments found needing end_datetime_utc backfill.")
            return

        print(f"Found {len(appointments_to_update)} appointments to backfill...")
        updated_count = 0

        for appt in appointments_to_update:
            if appt.appointment_time and appt.services: # Ensure start time and services exist
                total_duration = sum(service.duration_minutes for service in appt.services if service.duration_minutes is not None)
                
                if total_duration > 0:
                    start_time_utc = appt.appointment_time
                    # Ensure appointment_time is timezone-aware UTC
                    if start_time_utc.tzinfo is None or start_time_utc.tzinfo.utcoffset(start_time_utc) is None:
                        # If naive, assume it was intended to be UTC based on your DB storage convention
                        start_time_utc = start_time_utc.replace(tzinfo=timezone.utc)
                    elif start_time_utc.tzinfo != timezone.utc:
                        # If it has another timezone, convert it to UTC
                        start_time_utc = start_time_utc.astimezone(timezone.utc)
                        
                    appt.end_datetime_utc = start_time_utc + timedelta(minutes=total_duration)
                    print(f"  Updating appointment ID {appt.id}: start={start_time_utc}, duration={total_duration}, end={appt.end_datetime_utc}")
                    updated_count += 1
                else:
                    print(f"  Skipping appointment ID {appt.id}: no services or zero total duration.")
            else:
                print(f"  Skipping appointment ID {appt.id}: missing start time or services.")
        
        if updated_count > 0:
            db.commit()
            print(f"Successfully backfilled end_datetime_utc for {updated_count} appointments.")
        else:
            print("No appointments were updated (e.g., all had zero duration or missing data).")

    except Exception as e:
        db.rollback()
        print(f"Error during backfill: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting backfill process for appointment end_datetime_utc...")
    run_backfill()
    print("Backfill process finished.")
