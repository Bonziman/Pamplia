"""Add subject column to communications_log

Revision ID: 0684e35321a9
Revises: 4a9a36ccfff7
Create Date: 2025-05-10 19:14:17.753222

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0684e35321a9'
down_revision: Union[str, None] = '4a9a36ccfff7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('communications_log', sa.Column('subject', sa.String(length=255), nullable=True, comment='Optional subject/summary line'))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('communications_log', 'subject')
    # ### end Alembic commands ###
