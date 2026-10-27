import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export default function DeadlinesAlertsView({
  currentUser,
  onSelectComplaint,
  onSelectInstitution,
  onRefreshGlobal
}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, UNREAD, ESCALATIONS, UPCOMING, OVERDUE
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Scheduler Runner State
  const [simulatedDate, setSimulatedDate] = useState('');
  const [isRunningScheduler, setIsRunningScheduler] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState(null);

  // Configuration State
  const [config, setConfig] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Delivery Attempts Inspection Modal
  const [selectedNotifForAttempts, setSelectedNotifForAttempts] = useState(null);
  const [deliveryAttempts, setDeliveryAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Retrying deliveries state
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeFilter === 'UNREAD') params.unread_only = 'true';
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (activeFilter === 'ESCALATIONS') params.alert_type = 'ESCALATION_TRIGGERED';
      if (activeFilter === 'UPCOMING') params.alert_type = 'UPCOMING_DEADLINE';
      if (activeFilter === 'OVERDUE') params.alert_type = 'SLA_BREACH';

      const data = await api.getNotifications(params);
      setNotifications(data || []);

      const countRes = await api.getUnreadNotificationCount();
      setUnreadCount(countRes?.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, severityFilter]);

  const fetchConfig = async () => {
    try {
      const cfg = await api.getAlertConfig();
      setConfig(cfg);
      setEditingConfig({ ...cfg });
    } catch (err) {
      console.error('Failed to load alert configuration:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchConfig();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      alert(`Could not mark read: ${err.message}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      alert(`Could not mark all read: ${err.message}`);
    }
  };

  const handleRunScheduler = async () => {
    try {
      setIsRunningScheduler(true);
      setSchedulerResult(null);
      const res = await api.runDeadlineScheduler(simulatedDate || null);
      setSchedulerResult(res);
      fetchNotifications();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      alert(`Scheduler execution error: ${err.message}`);
    } finally {
      setIsRunningScheduler(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setIsSavingConfig(true);
      const res = await api.updateAlertConfig(editingConfig);
      setConfig(res);
      setShowConfigModal(false);
      alert('Deadline and escalation configuration successfully updated.');
    } catch (err) {
      alert(`Configuration update failed: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleInspectAttempts = async (notif) => {
    setSelectedNotifForAttempts(notif);
    setLoadingAttempts(true);
    try {
      const attempts = await api.getNotificationDeliveryAttempts(notif.id);
      setDeliveryAttempts(attempts || []);
    } catch (err) {
      alert(`Could not load delivery attempts: ${err.message}`);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleRetryDeliveries = async () => {
    try {
      setIsRetrying(true);
      setRetryResult(null);
      const res = await api.retryFailedDeliveries();
      setRetryResult(res);
      fetchNotifications();
    } catch (err) {
      alert(`Retry execution failed: ${err.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isBureauAdmin = currentUser?.role === 'BUREAU_ADMIN' || currentUser?.role === 'BUREAU_HEAD';
  const canEditConfig = isSuperAdmin || isBureauAdmin;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header with Status & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏱️</span> Deadlines, Alert Engine & Escalation Center
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Automated SLA monitoring, durable delivery records, multi-tiered regulatory escalation, and background scheduling.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            id="mark-all-notifications-read-btn"
            className="btn-secondary"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            ✓ Mark All Read ({unreadCount})
          </button>

          {canEditConfig && (
            <button
              id="open-deadline-config-btn"
              className="btn-secondary"
              onClick={() => setShowConfigModal(true)}
            >
              ⚙️ Deadline Rules Config
            </button>
          )}

          <button
            id="retry-failed-deliveries-btn"
            className="btn-secondary"
            onClick={handleRetryDeliveries}
            disabled={isRetrying}
            title="Retry failed email dispatches"
          >
            {isRetrying ? 'Retrying...' : '🔄 Retry Failed Deliveries'}
          </button>
        </div>
      </div>

      {/* 2. Background Scheduler / Controllable Clock Control Card */}
      <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> Background Worker Scheduler & Controllable Clock
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Executes automated background checks for upcoming deadlines, overdue cases, unresolved overlap reviews, and coordination tasks.
            </p>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong>Email Provider:</strong> <span className="badge badge-info">{config?.email_provider_type || 'MOCK'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Simulate Clock Date (Testing/Demo):
            </label>
            <input
              id="scheduler-simulated-time-input"
              type="datetime-local"
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
              value={simulatedDate}
              onChange={(e) => setSimulatedDate(e.target.value)}
              title="Fast-forward clock to test future deadlines and overdue escalations"
            />
          </div>

          <button
            id="trigger-scheduler-btn"
            className="btn-primary"
            onClick={handleRunScheduler}
            disabled={isRunningScheduler}
            style={{ padding: '8px 18px', fontSize: '13.5px' }}
          >
            {isRunningScheduler ? 'Running Scheduler...' : '⚡ Run Scheduled Checks Now'}
          </button>

          {simulatedDate && (
            <button
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => setSimulatedDate('')}
            >
              Reset Clock to Realtime
            </button>
          )}
        </div>

        {/* Scheduler Execution Feedback */}
        {schedulerResult && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 18px',
              borderRadius: '8px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginBottom: '6px' }}>
              <span>✓ Scheduler Run Completed at {schedulerResult.timestamp_ist}</span>
              <span>Alerts Created: {schedulerResult.alerts_created} • Escalations: {schedulerResult.escalations_triggered}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>Emails Dispatched: {schedulerResult.deliveries_attempted} (Succeeded: {schedulerResult.deliveries_succeeded}, Failed: {schedulerResult.deliveries_failed})</span>
              <span>Retries Attempted: {schedulerResult.retries_attempted}</span>
            </div>
            {schedulerResult.details && schedulerResult.details.length > 0 && (
              <div style={{ marginTop: '8px', maxHeight: '80px', overflowY: 'auto', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {schedulerResult.details.map((d, i) => (
                  <div key={i}>• {d}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Retry Outcome Feedback */}
        {retryResult && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontSize: '12.5px'
            }}
          >
            <strong>Email Retries Executed:</strong> Retried {retryResult.retries_attempted} failed attempts, {retryResult.deliveries_succeeded} succeeded.
          </div>
        )}
      </div>

      {/* 3. Filter Tabs Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`nav-tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
            style={{ padding: '7px 14px', fontSize: '12.5px', borderRadius: '8px' }}
            onClick={() => setActiveFilter('ALL')}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            className={`nav-tab-btn ${activeFilter === 'UNREAD' ? 'active' : ''}`}
            style={{ padding: '7px 14px', fontSize: '12.5px', borderRadius: '8px' }}
            onClick={() => setActiveFilter('UNREAD')}
          >
            Unread Only ({unreadCount})
          </button>
          <button
            className={`nav-tab-btn ${activeFilter === 'ESCALATIONS' ? 'active' : ''}`}
            style={{ padding: '7px 14px', fontSize: '12.5px', borderRadius: '8px' }}
            onClick={() => setActiveFilter('ESCALATIONS')}
          >
            🚨 Critical Escalations
          </button>
          <button
            className={`nav-tab-btn ${activeFilter === 'UPCOMING' ? 'active' : ''}`}
            style={{ padding: '7px 14px', fontSize: '12.5px', borderRadius: '8px' }}
            onClick={() => setActiveFilter('UPCOMING')}
          >
            ⏳ Upcoming Deadlines
          </button>
          <button
            className={`nav-tab-btn ${activeFilter === 'OVERDUE' ? 'active' : ''}`}
            style={{ padding: '7px 14px', fontSize: '12.5px', borderRadius: '8px' }}
            onClick={() => setActiveFilter('OVERDUE')}
          >
            ⚠️ Overdue SLA Breaches
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Severity:</span>
          <select
            className="form-input"
            style={{ width: 'auto', padding: '5px 10px', fontSize: '12px' }}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Info Only</option>
          </select>
        </div>
      </div>

      {/* 4. Notifications Stream Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 12px auto' }}></div>
            Loading alert records...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔔</div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No alerts found</h4>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              All regulatory deadlines are compliant and no alerts match the active filter.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((n) => {
              const isCritical = n.severity === 'CRITICAL' || n.escalation_level === 3;
              const isWarning = n.severity === 'WARNING' || n.escalation_level === 2;
              return (
                <div
                  key={n.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: !n.is_read
                      ? isCritical
                        ? 'rgba(239, 68, 68, 0.05)'
                        : 'rgba(59, 130, 246, 0.05)'
                      : 'transparent',
                    borderLeft: isCritical
                      ? '4px solid #ef4444'
                      : isWarning
                      ? '4px solid #f59e0b'
                      : '4px solid #3b82f6',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        className={`badge ${
                          isCritical
                            ? 'badge-danger'
                            : isWarning
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                        style={{ fontSize: '11px', fontWeight: '700' }}
                      >
                        {n.severity}
                      </span>
                      <span className="badge" style={{ fontSize: '11px', background: 'var(--bg-secondary)' }}>
                        {n.alert_type.replace('_', ' ')}
                      </span>
                      {n.escalation_level > 0 && (
                        <span className="badge badge-danger" style={{ fontSize: '10.5px' }}>
                          Level {n.escalation_level} Escalation
                        </span>
                      )}
                      {!n.is_read && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            display: 'inline-block'
                          }}
                          title="Unread notification"
                        ></span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{n.created_at_ist || new Date(n.created_at).toLocaleString()}</span>
                      <span
                        className="badge"
                        style={{
                          fontSize: '11px',
                          background:
                            n.delivery_status === 'DELIVERED'
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color: n.delivery_status === 'DELIVERED' ? '#22c55e' : '#ef4444'
                        }}
                      >
                        {n.delivery_status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {n.title}
                    </h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                      {n.message}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {n.target_bureau && <span><strong>Bureau:</strong> {n.target_bureau.replace('_', ' ')}</span>}
                      {n.idempotency_key && <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>ID: {n.idempotency_key}</span>}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {n.complaint_id && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => onSelectComplaint && onSelectComplaint(n.complaint_id)}
                        >
                          View Linked Case →
                        </button>
                      )}

                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => handleInspectAttempts(n)}
                        title="View delivery attempt history"
                      >
                        Audit Delivery
                      </button>

                      {!n.is_read && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => handleMarkRead(n.id)}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Delivery Attempts Inspection Modal */}
      {selectedNotifForAttempts && (
        <div className="modal-overlay" onClick={() => setSelectedNotifForAttempts(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Durable Delivery Attempts Audit</h3>
              <button className="btn-icon" onClick={() => setSelectedNotifForAttempts(null)}>✕</button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '13.5px', marginBottom: '14px' }}>
                <strong>Alert:</strong> {selectedNotifForAttempts.title}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Idempotency Key: <code>{selectedNotifForAttempts.idempotency_key}</code>
                </div>
              </div>

              {loadingAttempts ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading attempts...</div>
              ) : deliveryAttempts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No delivery attempts recorded.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {deliveryAttempts.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '6px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '12.5px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>
                          <strong>Attempt #{att.attempt_number}</strong> ({att.channel})
                        </span>
                        <span
                          className={`badge ${att.status === 'SUCCESS' ? 'badge-info' : 'badge-danger'}`}
                          style={{ fontSize: '11px' }}
                        >
                          {att.status}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>Recipient: {att.recipient || 'N/A'}</div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        Time: {new Date(att.attempted_at).toLocaleString()}
                      </div>
                      {att.error_message && (
                        <div style={{ marginTop: '6px', color: '#ef4444', fontSize: '11.5px' }}>
                          Error: {att.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button className="btn-secondary" onClick={() => setSelectedNotifForAttempts(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Deadline & Escalation Rules Configuration Modal */}
      {showConfigModal && editingConfig && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>Configure Deadline Thresholds & Escalation Rules</h3>
              <button className="btn-icon" onClick={() => setShowConfigModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveConfig} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: '700' }}>
                  Upcoming Reminder Intervals (Days before SLA Due Date):
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ marginTop: '4px' }}
                  value={editingConfig.reminder_intervals_days ? editingConfig.reminder_intervals_days.join(', ') : '5, 3, 1'}
                  onChange={(e) => {
                    const days = e.target.value.split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x));
                    setEditingConfig({ ...editingConfig, reminder_intervals_days: days });
                  }}
                  title="Comma-separated integers, e.g. 5, 3, 1"
                />
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Dispatches warnings to assigned officers at these days prior to breach.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Level 2 Overdue Threshold (Days):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    className="form-input"
                    style={{ marginTop: '4px' }}
                    value={editingConfig.escalation_level_2_days_overdue || 1}
                    onChange={(e) => setEditingConfig({ ...editingConfig, escalation_level_2_days_overdue: parseInt(e.target.value, 10) })}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Days past due to alert Bureau Head.
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Level 3 Escalation Threshold (Days):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="form-input"
                    style={{ marginTop: '4px' }}
                    value={editingConfig.escalation_level_3_days_overdue || 7}
                    onChange={(e) => setEditingConfig({ ...editingConfig, escalation_level_3_days_overdue: parseInt(e.target.value, 10) })}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Days past due to auto-escalate status & alert Central Admin.
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Critical Case Escalation Threshold (Days):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    className="form-input"
                    style={{ marginTop: '4px' }}
                    value={editingConfig.critical_priority_escalation_days || 2}
                    onChange={(e) => setEditingConfig({ ...editingConfig, critical_priority_escalation_days: parseInt(e.target.value, 10) })}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Fast-track escalation days for CRITICAL / Ragging cases.
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700' }}>
                    Unresolved Overlap Review Threshold (Days):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="form-input"
                    style={{ marginTop: '4px' }}
                    value={editingConfig.unresolved_overlap_threshold_days || 5}
                    onChange={(e) => setEditingConfig({ ...editingConfig, unresolved_overlap_threshold_days: parseInt(e.target.value, 10) })}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Days pending review before alerting bureaus.
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingConfig.email_delivery_enabled || false}
                    onChange={(e) => setEditingConfig({ ...editingConfig, email_delivery_enabled: e.target.checked })}
                  />
                  <span>Enable Email Delivery & Delivery Attempt History</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowConfigModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingConfig}>
                  {isSavingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
