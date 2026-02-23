## Plan: Agent Roster + Delivery Path

You’re at a good point to “agentize” this repo: it already has clear seams (frontend booking UI, backend scheduling/notifications, and ops/background jobs). Given your answers (staff dashboard first, public booking should match dashboard availability, client action links via signed tokens, deployment undecided), here’s a practical setup.

**Agents (roles) to create**
1. **Tech Lead / Integrator (you + me)**
   - Owns backlog, defines “done”, merges PRs, keeps FE/BE contracts consistent (schemas, enums, time formats).
   - Deliverables: weekly milestone checklist + release notes.

2. **Product/QA Agent**
   - Writes acceptance criteria + edge cases (timezone/DST, business hours, lead time, double-booking rules).
   - Main references: [backend/app/routers/availability.py](backend/app/routers/availability.py), [backend/app/routers/appointments.py](backend/app/routers/appointments.py).

3. **UX/UI (Frontend Design) Agent**
   - Keeps UI consistent across staff modal vs public booking.
   - Deliverables: “slot picking” behavior spec + error/empty/loading states (Chakra patterns).

4. **Frontend Engineering Agent**
   - Implements UI flows and API wiring; removes stubbed data.
   - Key files: [frontend/src/components/modals/CreateAppointmentModal.tsx](frontend/src/components/modals/CreateAppointmentModal.tsx), [frontend/src/pages/BookingPage.tsx](frontend/src/pages/BookingPage.tsx), [frontend/src/api/publicApi.ts](frontend/src/api/publicApi.ts).

5. **Backend Engineering Agent**
   - Owns data integrity, scheduling logic, signed-link endpoints, and notification logging.
   - Key files: [backend/app/services/notification_service.py](backend/app/services/notification_service.py), [backend/app/models/template.py](backend/app/models/template.py), [backend/app/routers](backend/app/routers).

6. **DevOps/Runtime Agent (added later since deploy is “not sure yet”)**
   - Makes local/dev/prod parity sane (workers, env vars, secrets), but waits until you pick target platform.
   - Key files: [docker-compose.yml](docker-compose.yml), [backend/app/core/celery_app.py](backend/app/core/celery_app.py).

**Steps**
1. **Define “Staff dashboard complete” scope (Product/QA)**
   - Checklist: create appointment (availability-backed), client selection/creation, service selection, appointment list updates, comms log entry created.
2. **Unify availability behavior across UIs (Frontend Eng + UX/UI)**
   - Make [frontend/src/pages/BookingPage.tsx](frontend/src/pages/BookingPage.tsx) stop using dummy times and match the slot behavior already in [frontend/src/components/modals/CreateAppointmentModal.tsx](frontend/src/components/modals/CreateAppointmentModal.tsx).
3. **Signed client action links (Backend Eng)**
   - Implement confirm/cancel/reschedule endpoints using signed, expiring tokens; ensure they update appointment state and write to communications log.
4. **Data integrity hardening (Backend Eng)**
   - Fix template uniqueness enforcement bug in [backend/app/models/template.py](backend/app/models/template.py) and add a corrective Alembic migration if needed.
5. **Ops decision + background jobs (Tech Lead + DevOps)**
   - Once you choose a deployment target, align compose/runtime: Celery worker/beat, secrets handling, reload flags, and (if needed) nginx wiring.

**Verification**
- Backend: `docker compose up --build` then hit availability + create appointment flows; verify end time calculation and that communications_log records are created.
- Frontend: `npm test` and a manual run-through of staff create-appointment + public booking parity.
- Links: open confirm/cancel/reschedule URLs from an email/log entry and verify they work without login and expire correctly.

**Decisions**
- Public booking uses the same availability model as the staff modal.
- Client actions are supported via signed, expiring links (no login).
- Deployment work is deferred until you pick the runtime target.

If you want, I can next produce a lightweight “definition of done” checklist for the Staff Dashboard milestone (5–10 bullets) that each agent can execute against.
