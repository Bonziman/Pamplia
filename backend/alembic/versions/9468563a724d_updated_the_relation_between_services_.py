"""updated the relation between services and appointments to M2M by creating a new association tales

Revision ID: 9468563a724d
Revises: 87f9b5ffbe21
Create Date: 2025-04-25 02:53:15.687071

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9468563a724d'
down_revision: Union[str, None] = '87f9b5ffbe21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define table name and columns for clarity
ASSOCIATION_TABLE_NAME = "appointment_services"
APPOINTMENT_ID_COL = "appointment_id"
SERVICE_ID_COL = "service_id"

def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('appointments', 'tenant_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.drop_constraint('appointments_service_id_fkey', 'appointments', type_='foreignkey')
    op.drop_column('appointments', 'service_id')
    # ### end Alembic commands ###

    op.create_table(
        ASSOCIATION_TABLE_NAME,
        sa.Column(APPOINTMENT_ID_COL, sa.Integer(), sa.ForeignKey('appointments.id', ondelete='CASCADE'), primary_key=True, nullable=False),
        sa.Column(SERVICE_ID_COL, sa.Integer(), sa.ForeignKey('services.id', ondelete='CASCADE'), primary_key=True, nullable=False)
    )
    
def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('appointments', sa.Column('service_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.create_foreign_key('appointments_service_id_fkey', 'appointments', 'services', ['service_id'], ['id'])
    op.alter_column('appointments', 'tenant_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    # ### end Alembic commands ###
    # Drop the association table
    op.drop_table(ASSOCIATION_TABLE_NAME)
