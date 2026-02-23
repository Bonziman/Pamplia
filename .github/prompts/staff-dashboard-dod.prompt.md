# Staff Dashboard — Definition of Done (Milestone 1)

## Goal
Staff can reliably manage appointments end-to-end: find availability, create an appointment, see it show up immediately, and have communications logged.

## Scope
### In scope
- Staff user can create an appointment from the dashboard.
- Time selection uses real availability (no hardcoded times).
- Appointment end time is correct based on selected services.
- Appointment appears in the appointments list/calendar immediately after creation.
- Communications log entry is created for the appointment creation notification attempt.
- Errors are actionable (validation vs server errors are distinguishable).

### Out of scope (for this milestone)
- Public booking page parity.
- Client confirm/cancel/reschedule links.
- Production hardening (secrets, nginx, workers) beyond local/dev success.

## Acceptance Criteria
1. **Availability-backed time selection**
   - When staff selects a date and services, the UI queries the availability API and shows only valid start times.
   - If no times are available, UI shows an explicit “No availability” state.

2. **Appointment creation**
   - Creating an appointment succeeds with required fields only (minimum happy path).
   - Backend computes/stores end time consistently (matches duration sum of services).

3. **Consistency + freshness**
   - Newly created appointment appears in the staff appointment list without requiring a full page refresh.

4. **Logging**
   - A communications log record exists for the outgoing notification attempt (even if delivery fails).

5. **Timezone sanity**
   - Displayed times match the tenant’s configured timezone, and the saved UTC fields remain consistent.

## Test Checklist (manual)
- Create appointment for an empty day (should show many slots).
- Create overlapping appointment then verify those times disappear from availability.
- Select multiple services and confirm end time moves later.
- Attempt create with missing required fields -> see validation errors.
- Force server error (e.g., stop backend) -> see error state.

## Key Files
- Frontend modal: [frontend/src/components/modals/CreateAppointmentModal.tsx](../../frontend/src/components/modals/CreateAppointmentModal.tsx)
- Backend availability: [backend/app/routers/availability.py](../../backend/app/routers/availability.py)
- Backend appointment create: [backend/app/routers/appointments.py](../../backend/app/routers/appointments.py)
- Notification/logging: [backend/app/services/notification_service.py](../../backend/app/services/notification_service.py)
