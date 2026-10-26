import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function InstitutionDossierView({
  selectedInstitutionId,
  onSelectComplaint
}) {
  const [institutions, setInstitutions] = useState([]);
  const [currentId, setCurrentId] = useState(selectedInstitutionId || '');
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load list of institutions for dropdown
    api.getInstitutions()
      .then((data) => {
        setInstitutions(data);
        if (!currentId && data.length > 0) {
          setCurrentId(data[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (currentId) {
      loadDossier(currentId);
    }
  }, [currentId]);

  const loadDossier = async (id) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getInstitutionDossier(id);
      setDossier(data);
    } catch (err) {
      setError(err.message || 'Failed to load institution dossier.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search / Select Institution Header */}
      <div className="card" style={{ marginBottom: '24px', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Institution 360° Comprehensive Dossier</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Consolidated single-window cross-bureau historical timeline mapped to AICTE Permanent ID
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Select Institution:
            </label>
            <select
              id="select-institution-dossier"
              className="form-select"
              style={{ minWidth: '320px', fontWeight: '600' }}
              value={currentId}
              onChange={(e) => setCurrentId(Number(e.target.value))}
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.aicte_id} — {inst.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '14px', color: 'var(--text-secondary)' }}>Compiling 360° cross-bureau dossier...</p>
        </div>
      ) : error ? (
        <div className="card empty-state" style={{ color: 'var(--status-danger)' }}>{error}</div>
      ) : dossier ? (
        <div>
          {/* Institution Profile Summary Card */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: '800' }}>{dossier.institution.name}</h3>
                  <span className={`badge ${dossier.institution.approval_status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                    {dossier.institution.approval_status}
                  </span>
                </div>

                <div style={{ marginTop: '6px', fontSize: '13.5px', color: 'var(--text-secondary)', display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                  <span>AICTE Permanent ID: <strong className="font-mono" style={{ color: 'var(--accent-blue)' }}>{dossier.institution.aicte_id}</strong></span>
                  <span>Type: <strong>{dossier.institution.institution_type}</strong></span>
                  <span>Region: <strong>{dossier.institution.region} ({dossier.institution.state})</strong></span>
                  <span>City: <strong>{dossier.institution.city}</strong></span>
                </div>

                <div style={{ marginTop: '4px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Address: {dossier.institution.address} • Email: {dossier.institution.contact_email}
                </div>
              </div>

              {/* Counts */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'var(--bg-subtle)', padding: '10px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL GRIEVANCES</div>
                  <div style={{ fontSize: '22px', fontWeight: '800' }}>{dossier.total_complaints}</div>
                </div>

                <div style={{ background: 'var(--bg-subtle)', padding: '10px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTIVE INQUIRY</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--status-warning)' }}>{dossier.active_complaints}</div>
                </div>

                <div style={{ background: 'var(--bg-subtle)', padding: '10px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DISPOSED</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--status-success)' }}>{dossier.disposed_complaints}</div>
                </div>
              </div>
            </div>

            {/* Cross-Bureau Conflict Callout */}
            {dossier.conflict_alert.has_conflict ? (
              <div
                style={{
                  marginTop: '18px',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--status-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div style={{ fontSize: '24px' }}>⚠️</div>
                <div>
                  <h4 style={{ fontSize: '14.5px', color: '#fca5a5', fontWeight: '700' }}>
                    Active Multi-Bureau Conflict Alert
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {dossier.conflict_alert.message}
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: '18px',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '13px',
                  color: '#6ee7b7'
                }}
              >
                🛡️ Single-Bureau Coordinated: No conflicting concurrent departmental proceedings detected for this institution.
              </div>
            )}
          </div>

          {/* Chronological Complaint History Timeline */}
          <div className="card">
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '14px' }}>
              Historical Case Timeline Across All AICTE Divisions ({dossier.recent_complaints.length} records)
            </h3>

            {dossier.recent_complaints.length === 0 ? (
              <div className="empty-state">
                <h4>No Complaints on Record</h4>
                <p>This institution currently has a clean regulatory record with no logged grievances.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {dossier.recent_complaints.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>
                          {c.complaint_no}
                        </span>
                        <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                          {c.bureau.replace('_', ' ')}
                        </span>
                        <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
                          {c.status.replace('_', ' ')}
                        </span>
                        <span className={`badge ${c.priority === 'CRITICAL' ? 'badge-danger' : c.priority === 'HIGH' ? 'badge-warning' : 'badge-neutral'}`}>
                          {c.priority}
                        </span>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {c.subject}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                        <span>Category: <strong>{c.category.replace('_', ' ')}</strong></span>
                        <span>Officer: <strong>{c.assigned_officer_name || 'Unassigned'}</strong></span>
                        <span>Filed: <strong>{new Date(c.created_at).toLocaleDateString()}</strong></span>
                        <span>Duration: <strong>{c.days_open} days open</strong></span>
                      </div>
                    </div>

                    <div>
                      <button
                        className="btn-secondary"
                        onClick={() => onSelectComplaint(c.id)}
                      >
                        Inspect Full Record →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
