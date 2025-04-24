"""add name column to users

Revision ID: 84cf0ec670cb
Revises: 567a821b40e4
Create Date: 2025-04-24 03:24:25.214614

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84cf0ec670cb'
down_revision: Union[str, None] = '567a821b40e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column('users', sa.Column('name', sa.String(), nullable=False))
    


def downgrade() -> None:
     op.drop_column('users', 'name')
