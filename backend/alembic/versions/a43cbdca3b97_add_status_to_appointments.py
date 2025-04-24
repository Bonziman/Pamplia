"""Add status to appointments

Revision ID: a43cbdca3b97
Revises: 
Create Date: 2025-04-21 21:35:08.245063

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a43cbdca3b97'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Create the Enum type for appointment statuses
    appointment_status_enum = postgresql.ENUM('pending', 'confirmed', 'canceled', 'done', name='appointmentstatus')

    # Create the Enum type in the database
    appointment_status_enum.create(op.get_bind(), checkfirst=True)

    # Add the status column to the appointments table
    op.add_column('appointments', sa.Column('status', appointment_status_enum, nullable=True))

    # If you have existing records, you can update the default value for existing appointments
    op.execute("UPDATE appointments SET status='pending' WHERE status IS NULL")

def downgrade():
    # Drop the status column
    op.drop_column('appointments', 'status')

    # Drop the Enum type from the database
    appointment_status_enum = postgresql.ENUM('pending', 'confirmed', 'canceled', 'done', name='appointmentstatus')
    appointment_status_enum.drop(op.get_bind(), checkfirst=True)
