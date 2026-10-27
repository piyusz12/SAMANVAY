"""normalized_domain_model

Revision ID: eabcfaf1c773
Revises: 851cb2ae3d38
Create Date: 2026-10-27 00:10:52.149702

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'eabcfaf1c773'
down_revision: Union[str, None] = '851cb2ae3d38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create bureaus table
    op.create_table(
        'bureaus',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_sla_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bureaus_code'), 'bureaus', ['code'], unique=True)
    op.create_index(op.f('ix_bureaus_id'), 'bureaus', ['id'], unique=False)

    # 2. Create complaint_categories table
    op.create_table(
        'complaint_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_bureau', sa.String(length=64), nullable=True),
        sa.Column('default_priority', sa.String(length=32), nullable=False, server_default='MEDIUM'),
        sa.Column('default_sla_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_complaint_categories_code'), 'complaint_categories', ['code'], unique=True)
    op.create_index(op.f('ix_complaint_categories_id'), 'complaint_categories', ['id'], unique=False)

    # 3. Create bureau_memberships table
    op.create_table(
        'bureau_memberships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('bureau_id', sa.Integer(), nullable=False),
        sa.Column('role_in_bureau', sa.String(length=64), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['bureau_id'], ['bureaus.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'bureau_id', name='uq_user_bureau_membership')
    )
    op.create_index(op.f('ix_bureau_memberships_bureau_id'), 'bureau_memberships', ['bureau_id'], unique=False)
    op.create_index(op.f('ix_bureau_memberships_id'), 'bureau_memberships', ['id'], unique=False)
    op.create_index(op.f('ix_bureau_memberships_user_id'), 'bureau_memberships', ['user_id'], unique=False)

    # 4. Create system_configs table
    op.create_table(
        'system_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('config_key', sa.String(length=100), nullable=False),
        sa.Column('config_value', sa.Text(), nullable=False),
        sa.Column('value_type', sa.String(length=32), nullable=False, server_default='STRING'),
        sa.Column('category', sa.String(length=64), nullable=False, server_default='GENERAL'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_editable', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_system_configs_category'), 'system_configs', ['category'], unique=False)
    op.create_index(op.f('ix_system_configs_config_key'), 'system_configs', ['config_key'], unique=True)
    op.create_index(op.f('ix_system_configs_id'), 'system_configs', ['id'], unique=False)

    # 5. Create case_assignment_history table
    op.create_table(
        'case_assignment_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('complaint_id', sa.Integer(), nullable=False),
        sa.Column('assigned_officer_id', sa.Integer(), nullable=True),
        sa.Column('previous_officer_id', sa.Integer(), nullable=True),
        sa.Column('assigned_by_id', sa.Integer(), nullable=True),
        sa.Column('bureau', sa.String(length=64), nullable=False),
        sa.Column('assignment_notes', sa.Text(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['assigned_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_officer_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['previous_officer_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_assignment_history_assigned_officer_id'), 'case_assignment_history', ['assigned_officer_id'], unique=False)
    op.create_index(op.f('ix_case_assignment_history_complaint_id'), 'case_assignment_history', ['complaint_id'], unique=False)
    op.create_index(op.f('ix_case_assignment_history_created_at'), 'case_assignment_history', ['created_at'], unique=False)
    op.create_index(op.f('ix_case_assignment_history_id'), 'case_assignment_history', ['id'], unique=False)
    op.create_index(op.f('ix_case_assignment_history_is_current'), 'case_assignment_history', ['is_current'], unique=False)

    # 6. Create case_status_history table
    op.create_table(
        'case_status_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('complaint_id', sa.Integer(), nullable=False),
        sa.Column('from_status', sa.String(length=64), nullable=True),
        sa.Column('to_status', sa.String(length=64), nullable=False),
        sa.Column('action_taken', sa.String(length=64), nullable=False),
        sa.Column('changed_by_id', sa.Integer(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['changed_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_status_history_complaint_id'), 'case_status_history', ['complaint_id'], unique=False)
    op.create_index(op.f('ix_case_status_history_created_at'), 'case_status_history', ['created_at'], unique=False)
    op.create_index(op.f('ix_case_status_history_id'), 'case_status_history', ['id'], unique=False)
    op.create_index(op.f('ix_case_status_history_to_status'), 'case_status_history', ['to_status'], unique=False)

    # 7. Create evidence_attachments table
    op.create_table(
        'evidence_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('complaint_id', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('original_file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=128), nullable=False),
        sa.Column('sha256_checksum', sa.String(length=64), nullable=True),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=True),
        sa.Column('retention_status', sa.String(length=32), nullable=False, server_default='ACTIVE'),
        sa.Column('is_confidential', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_evidence_attachments_complaint_id'), 'evidence_attachments', ['complaint_id'], unique=False)
    op.create_index(op.f('ix_evidence_attachments_id'), 'evidence_attachments', ['id'], unique=False)
    op.create_index(op.f('ix_evidence_attachments_retention_status'), 'evidence_attachments', ['retention_status'], unique=False)
    op.create_index(op.f('ix_evidence_attachments_sha256_checksum'), 'evidence_attachments', ['sha256_checksum'], unique=False)

    # 8. Create follow_up_tasks table
    op.create_table(
        'follow_up_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('complaint_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('deadline', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('priority', sa.String(length=32), nullable=False, server_default='MEDIUM'),
        sa.Column('reminder_frequency_days', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('escalation_level', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('completion_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_follow_up_tasks_assigned_to_id'), 'follow_up_tasks', ['assigned_to_id'], unique=False)
    op.create_index(op.f('ix_follow_up_tasks_complaint_id'), 'follow_up_tasks', ['complaint_id'], unique=False)
    op.create_index(op.f('ix_follow_up_tasks_deadline'), 'follow_up_tasks', ['deadline'], unique=False)
    op.create_index(op.f('ix_follow_up_tasks_id'), 'follow_up_tasks', ['id'], unique=False)
    op.create_index(op.f('ix_follow_up_tasks_status'), 'follow_up_tasks', ['status'], unique=False)

    # 9. Create notification_delivery_attempts table
    op.create_table(
        'notification_delivery_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('notification_id', sa.Integer(), nullable=False),
        sa.Column('channel', sa.String(length=32), nullable=False),
        sa.Column('attempt_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('attempted_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['notification_id'], ['notifications.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_delivery_attempts_id'), 'notification_delivery_attempts', ['id'], unique=False)
    op.create_index(op.f('ix_notification_delivery_attempts_notification_id'), 'notification_delivery_attempts', ['notification_id'], unique=False)

    # 10. Alter existing tables safely using batch mode
    with op.batch_alter_table('audit_logs') as batch_op:
        batch_op.add_column(sa.Column('ip_address', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('request_id', sa.String(length=64), nullable=True))
        batch_op.create_index(batch_op.f('ix_audit_logs_request_id'), ['request_id'], unique=False)

    with op.batch_alter_table('case_linkages') as batch_op:
        batch_op.add_column(sa.Column('reviewed_at', sa.DateTime(), nullable=True))
        batch_op.create_index(batch_op.f('ix_case_linkages_status'), ['status'], unique=False)
        batch_op.create_unique_constraint('uq_case_linkage_pair', ['source_complaint_id', 'target_complaint_id', 'link_type'])

    with op.batch_alter_table('case_movements') as batch_op:
        batch_op.create_index(batch_op.f('ix_case_movements_status'), ['status'], unique=False)

    with op.batch_alter_table('complaints') as batch_op:
        batch_op.add_column(sa.Column('is_anonymous_confidential', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        batch_op.add_column(sa.Column('sla_due_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        batch_op.create_index(batch_op.f('ix_complaints_assigned_officer_id'), ['assigned_officer_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_complaints_is_deleted'), ['is_deleted'], unique=False)
        batch_op.create_index(batch_op.f('ix_complaints_priority'), ['priority'], unique=False)
        batch_op.create_index(batch_op.f('ix_complaints_sla_due_date'), ['sla_due_date'], unique=False)

    with op.batch_alter_table('institutions') as batch_op:
        batch_op.add_column(sa.Column('aishe_code', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('normalized_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('pin_code', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')))
        batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        batch_op.create_index(batch_op.f('ix_institutions_aishe_code'), ['aishe_code'], unique=True)
        batch_op.create_index(batch_op.f('ix_institutions_city'), ['city'], unique=False)
        batch_op.create_index(batch_op.f('ix_institutions_is_deleted'), ['is_deleted'], unique=False)
        batch_op.create_index(batch_op.f('ix_institutions_normalized_name'), ['normalized_name'], unique=False)

    with op.batch_alter_table('notifications') as batch_op:
        batch_op.add_column(sa.Column('delivery_channel', sa.String(length=32), nullable=False, server_default='IN_APP'))
        batch_op.add_column(sa.Column('delivery_status', sa.String(length=32), nullable=False, server_default='DELIVERED'))
        batch_op.create_index(batch_op.f('ix_notifications_is_read'), ['is_read'], unique=False)

    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('updated_at')

    with op.batch_alter_table('notifications') as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_is_read'))
        batch_op.drop_column('delivery_status')
        batch_op.drop_column('delivery_channel')

    with op.batch_alter_table('institutions') as batch_op:
        batch_op.drop_index(batch_op.f('ix_institutions_normalized_name'))
        batch_op.drop_index(batch_op.f('ix_institutions_is_deleted'))
        batch_op.drop_index(batch_op.f('ix_institutions_city'))
        batch_op.drop_index(batch_op.f('ix_institutions_aishe_code'))
        batch_op.drop_column('is_deleted')
        batch_op.drop_column('is_active')
        batch_op.drop_column('pin_code')
        batch_op.drop_column('normalized_name')
        batch_op.drop_column('aishe_code')

    with op.batch_alter_table('complaints') as batch_op:
        batch_op.drop_index(batch_op.f('ix_complaints_sla_due_date'))
        batch_op.drop_index(batch_op.f('ix_complaints_priority'))
        batch_op.drop_index(batch_op.f('ix_complaints_is_deleted'))
        batch_op.drop_index(batch_op.f('ix_complaints_assigned_officer_id'))
        batch_op.drop_column('is_deleted')
        batch_op.drop_column('sla_due_date')
        batch_op.drop_column('is_anonymous_confidential')

    with op.batch_alter_table('case_movements') as batch_op:
        batch_op.drop_index(batch_op.f('ix_case_movements_status'))

    with op.batch_alter_table('case_linkages') as batch_op:
        batch_op.drop_constraint('uq_case_linkage_pair', type_='unique')
        batch_op.drop_index(batch_op.f('ix_case_linkages_status'))
        batch_op.drop_column('reviewed_at')

    with op.batch_alter_table('audit_logs') as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_logs_request_id'))
        batch_op.drop_column('request_id')
        batch_op.drop_column('ip_address')

    op.drop_index(op.f('ix_notification_delivery_attempts_notification_id'), table_name='notification_delivery_attempts')
    op.drop_index(op.f('ix_notification_delivery_attempts_id'), table_name='notification_delivery_attempts')
    op.drop_table('notification_delivery_attempts')

    op.drop_index(op.f('ix_follow_up_tasks_status'), table_name='follow_up_tasks')
    op.drop_index(op.f('ix_follow_up_tasks_id'), table_name='follow_up_tasks')
    op.drop_index(op.f('ix_follow_up_tasks_deadline'), table_name='follow_up_tasks')
    op.drop_index(op.f('ix_follow_up_tasks_complaint_id'), table_name='follow_up_tasks')
    op.drop_index(op.f('ix_follow_up_tasks_assigned_to_id'), table_name='follow_up_tasks')
    op.drop_table('follow_up_tasks')

    op.drop_index(op.f('ix_evidence_attachments_sha256_checksum'), table_name='evidence_attachments')
    op.drop_index(op.f('ix_evidence_attachments_retention_status'), table_name='evidence_attachments')
    op.drop_index(op.f('ix_evidence_attachments_id'), table_name='evidence_attachments')
    op.drop_index(op.f('ix_evidence_attachments_complaint_id'), table_name='evidence_attachments')
    op.drop_table('evidence_attachments')

    op.drop_index(op.f('ix_case_status_history_to_status'), table_name='case_status_history')
    op.drop_index(op.f('ix_case_status_history_id'), table_name='case_status_history')
    op.drop_index(op.f('ix_case_status_history_created_at'), table_name='case_status_history')
    op.drop_index(op.f('ix_case_status_history_complaint_id'), table_name='case_status_history')
    op.drop_table('case_status_history')

    op.drop_index(op.f('ix_case_assignment_history_is_current'), table_name='case_assignment_history')
    op.drop_index(op.f('ix_case_assignment_history_id'), table_name='case_assignment_history')
    op.drop_index(op.f('ix_case_assignment_history_created_at'), table_name='case_assignment_history')
    op.drop_index(op.f('ix_case_assignment_history_complaint_id'), table_name='case_assignment_history')
    op.drop_index(op.f('ix_case_assignment_history_assigned_officer_id'), table_name='case_assignment_history')
    op.drop_table('case_assignment_history')

    op.drop_index(op.f('ix_system_configs_id'), table_name='system_configs')
    op.drop_index(op.f('ix_system_configs_config_key'), table_name='system_configs')
    op.drop_index(op.f('ix_system_configs_category'), table_name='system_configs')
    op.drop_table('system_configs')

    op.drop_index(op.f('ix_bureau_memberships_user_id'), table_name='bureau_memberships')
    op.drop_index(op.f('ix_bureau_memberships_id'), table_name='bureau_memberships')
    op.drop_index(op.f('ix_bureau_memberships_bureau_id'), table_name='bureau_memberships')
    op.drop_table('bureau_memberships')

    op.drop_index(op.f('ix_complaint_categories_id'), table_name='complaint_categories')
    op.drop_index(op.f('ix_complaint_categories_code'), table_name='complaint_categories')
    op.drop_table('complaint_categories')

    op.drop_index(op.f('ix_bureaus_id'), table_name='bureaus')
    op.drop_index(op.f('ix_bureaus_code'), table_name='bureaus')
    op.drop_table('bureaus')
