"""add_active_fields_to_user_add_timestamps

Revision ID: b89b8ab3c23d
Revises: 0684e35321a9
Create Date: 2025-05-23 01:17:25.547095

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b89b8ab3c23d'
down_revision: Union[str, None] = '0684e35321a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
