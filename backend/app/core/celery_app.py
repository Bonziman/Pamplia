# app/core/celery_app.py
# --- NEW FILE ---

from celery import Celery
from celery.schedules import crontab # For scheduling periodic tasks
from kombu import Queue

from app.config import settings # Assuming settings has broker URL eventually

# Define the RabbitMQ broker URL (or get from settings/env var)
# Default guest:guest works for local default RabbitMQ instance
BROKER_URL = settings.celery_broker_url # Example: 'amqp://guest:guest@localhost:5672/'
# Define a result backend (optional, but good for tracking task state)
# Using RPC backend stores results temporarily in RabbitMQ queues
# For persistent results, consider database or Redis backend later.
RESULT_BACKEND = settings.celery_result_backend # Example: 'rpc://'

# Create the Celery application instance
# The first argument is the conventional name of the main module (your project name)
# Include specifies modules where Celery should look for tasks.
celery_app = Celery(
    "worker", # Can be any name, often matches the module name
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=[
        'app.tasks.appointment_tasks', # Tell Celery where to find tasks
        # Add other task modules here later if needed
        ]
)

# Optional: Configure Celery settings directly
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],  # Ensure tasks use JSON
    result_serializer='json',
    timezone=settings.timezone or 'UTC', # Use tenant's timezone? Or system's? Let's use UTC for Celery internals.
    enable_utc=True,
    # Define task queues (optional but good practice for routing)
    task_default_queue='default',
    task_queues=(
       Queue('default', routing_key='task.#'),
       Queue('reminders', routing_key='reminders.#'), # Example queue for reminders
       # Add other queues as needed
    ),
    task_default_exchange='tasks',
    task_default_exchange_type='topic',
    task_default_routing_key='task.default',
)


# --- Celery Beat Schedule (Periodic Tasks) ---
# Define tasks that should run automatically on a schedule.
celery_app.conf.beat_schedule = {
    # Schedule Name: descriptive identifier
    'send-appointment-reminders-every-15-minutes': {
        # Task Name: 'path.to.module.task_function_name'
        'task': 'app.tasks.appointment_tasks.send_appointment_reminders',
        # Schedule: Run every 15 minutes
        'schedule': crontab(minute='*/15'),
        # Optional arguments to pass to the task function (if any)
        # 'args': (16, 16),
        # Optional: Specify queue for this periodic task
        'options': {'queue' : 'reminders', 'routing_key': 'reminders.send'},
    },
    # Add more scheduled tasks here if needed
}


if __name__ == '__main__':
    # Allows running celery directly using: python -m app.core.celery_app worker ...
    celery_app.start()
