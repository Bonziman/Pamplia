"""Update communication channels enums

Revision ID: 4a9a36ccfff7
Revises: f88aec883d1f
Create Date: 2025-05-08 17:42:14.850264

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a9a36ccfff7'
down_revision: Union[str, None] = 'f88aec883d1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE communicationchannel ADD VALUE IF NOT EXISTS 'PHONE'")
    op.execute("ALTER TYPE communicationchannel ADD VALUE IF NOT EXISTS 'IN_PERSON'")
    op.execute("ALTER TYPE communicationchannel ADD VALUE IF NOT EXISTS 'VIRTUAL_MEETING'")
    op.execute("ALTER TYPE communicationchannel ADD VALUE IF NOT EXISTS 'OTHER'")
    
    # ### end Alembic commands ###


def downgrade() -> None:
    pass
    op.execute("DELETE FROM pg_enum WHERE enumlabel = 'PHONE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'communicationchannel')")
    op.execute("DELETE FROM pg_enum WHERE enumlabel = 'IN_PERSON' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'communicationchannel')")
    op.execute("DELETE FROM pg_enum WHERE enumlabel = 'VIRTUAL_MEETING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'communicationchannel')")
    op.execute("DELETE FROM pg_enum WHERE enumlabel = 'OTHER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'communicationchannel')")
