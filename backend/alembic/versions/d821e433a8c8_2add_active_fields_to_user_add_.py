"""2add_active_fields_to_user_add_timestamps

Revision ID: d821e433a8c8
Revises: b89b8ab3c23d
Create Date: 2025-05-23 01:18:14.937851

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd821e433a8c8'
down_revision: Union[str, None] = 'b89b8ab3c23d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
