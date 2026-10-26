import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AISimilarityView({
  initialComplaint,
  onSelectComplaint,
  currentUser
}) {
  const [complaints, setComplaints] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(initialComplaint?.id || '');
  const [checkResult, setCheckResult] = useState(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [linkages, setLinkages] = useState([]);
  const [linkNotes, setLinkNotes] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    // Load active complaints
    api.getComplaints({ page_size: 50 })
      .then((res) => {
        setComplaints(res.items);
        if (!selectedCaseId && res.items.length > 0) {
          setSelectedCaseId(res.items[0].id);
        }
      })
      .catch((err) => console.error(err));

    loadExistingLinkages();
  }, []);

  useEffect(() => {
    if (initialComplaint?.id) {
      setSelectedCaseId(initialComplaint.id);
    }
  }, [initialComplaint]);

  useEffect(() => {
    if (selectedCaseId) {
      runCheckForCase(selectedCaseId);
    }
  }, [selectedCaseId]);

  const loadExistingLinkages = async () => {
    try {
      const data = await api.getLinkages();
      setLinkages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const runCheckForCase = async (caseId) => {
    const targetCase = complaints.find((c) => c.id === Number(caseId));
    if (!targetCase) return;

    try {
      setLoadingCheck(true);
      const res = await api.checkSimilarity({
        subject: targetCase.subject,
        description: targetCase.description,
        institution_id: targetCase.institution_id,
        category: targetCase.category,
        exclude_complaint_id: targetCase.id
      });
      setCheckResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCheck(false);
    }
  };

  const handleCreateLinkage = async (candidate, linkType) => {
    try {
      setIsLinking(true);
      await api.createLinkage({
        source_complaint_id: Number(selectedCaseId),
        target_complaint_id: candidate.complaint_id,
        link_type: linkType,
        similarity_score: candidate.similarity_score,
        explanation: candidate.explanation,
        notes: linkNotes || 'Confirmed by desk officer under human-in-the-loop review.'
      });
      alert('Case linkage recorded and verified successfully.');
      setLinkNotes('');
      await loadExistingLinkages();
    } catch (err) {
      alert(`Error linking cases: ${err.message}`);
    } finally {
      setIsLinking(false);
    }
  };

  const handleReviewLinkage = async (linkageId, newStatus) => {
    try {
      await api.reviewLinkage(linkageId, {
        status: newStatus,
        verification_notes: `Marked as ${newStatus} by ${currentUser?.full_name}`
      });
      await loadExistingLinkages();
    } catch (err) {
      alert(`Error updating linkage: ${err.message}`);
    }
  };

  const selectedCase = complaints.find((c) => c.id === Number(selectedCaseId));

  return (
    <div>
      {/* Title & Governance Notice */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Explainable AI Similarity & Duplicate Resolution</h2>
          <span className="badge badge-purple">NLP Vector Model</span>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          AI-assisted grievance deduplication and cross-bureau relation matching. 
          <strong style={{ color: 'var(--accent-gold)' }}> Mandatory Governance: </strong> 
          Similarity outputs are explainable and advisory. No complaints are merged or dismissed automatically without explicit human officer verification.
        </p>
      </div>

      {/* Select Case to Analyze */}
      <div className="card" style={{ marginBottom: '24px', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13.5px', fontWeight: '700' }}>Select Subject Case to Cross-Match:</label>
          <select
            id="select-similarity-case"
            className="form-select"
            style={{ minWidth: '420px', fontWeight: '600' }}
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
          >
            {complaints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.complaint_no} — [{c.bureau.replace('_', ' ')}] {c.subject.slice(0, 50)}...
              </option>
            ))}
          </select>
        </div>

        {selectedCase && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 16px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              <span>Institution: <strong style={{ color: 'var(--text-primary)' }}>{selectedCase.institution_name}</strong></span>
              <span>Category: <strong style={{ color: 'var(--text-primary)' }}>{selectedCase.category.replace('_', ' ')}</strong></span>
              <span>Bureau: <strong style={{ color: 'var(--text-primary)' }}>{selectedCase.bureau.replace('_', ' ')}</strong></span>
            </div>
            <div style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
              "{selectedCase.description.slice(0, 180)}..."
            </div>
          </div>
        )}
      </div>

      {/* Matching Results */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700' }}>
            Explainable Semantic Matches in Council Records
          </h3>
          {checkResult && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {checkResult.duplicate_suspected && (
                <span className="badge badge-danger">⚠️ Potential Duplicate Suspected</span>
              )}
              {checkResult.cross_bureau_overlap_suspected && (
                <span className="badge badge-warning">🔄 Concurrent Cross-Bureau Overlap</span>
              )}
            </div>
          )}
        </div>

        {loadingCheck ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Vectorizing narrative text and calculating explainable attribution...</p>
          </div>
        ) : !checkResult || checkResult.matches.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">🔍</div>
            <h4>No Closely Matching Complaints Found</h4>
            <p>This complaint appears distinct from active records across AICTE bureaus.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {checkResult.matches.map((m) => {
              const scorePercent = Math.round(m.similarity_score * 100);
              const barColor = scorePercent >= 75 ? 'var(--status-danger)' : scorePercent >= 50 ? 'var(--status-warning)' : 'var(--accent-blue)';

              return (
                <div
                  key={m.complaint_id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${barColor}`,
                    padding: '18px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>
                          {m.complaint_no}
                        </span>
                        <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                          {m.bureau.replace('_', ' ')}
                        </span>
                        <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
                          {m.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {m.subject}
                      </div>

                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                        Institution: <strong>{m.institution_name}</strong> • Category: <strong>{m.category.replace('_', ' ')}</strong>
                      </div>
                    </div>

                    {/* Score Gauge */}
                    <div style={{ minWidth: '160px', textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-display)', color: barColor }}>
                        {scorePercent}%
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Composite Match Score
                      </div>
                      <div className="match-meter-container" style={{ marginTop: '4px' }}>
                        <div
                          className="match-meter-bar"
                          style={{ width: `${scorePercent}%`, background: barColor }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Explainable Attribution Breakdown Box */}
                  <div
                    style={{
                      marginTop: '14px',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12.5px'
                    }}
                  >
                    <div style={{ fontWeight: '700', color: 'var(--accent-gold)', marginBottom: '4px' }}>
                      💡 Explainable Attribution Breakdown:
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {m.explanation.rationale}
                    </div>

                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12px' }}>
                      <span>Narrative Cosine Overlap: <strong>{Math.round(m.explanation.text_similarity_score * 100)}%</strong></span>
                      <span>Category Match: <strong>{m.explanation.category_match ? '✅ Exact' : '❌ Different'}</strong></span>
                      <span>Institution Match: <strong>{m.explanation.institution_match ? '✅ Same Institution' : '❌ Different'}</strong></span>
                      {m.explanation.shared_keywords.length > 0 && (
                        <span>
                          Shared Keywords: [{m.explanation.shared_keywords.join(', ')}]
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Human Officer Linkage Actions */}
                  <div
                    style={{
                      marginTop: '14px',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '12px' }}
                      onClick={() => onSelectComplaint(m.complaint_id)}
                    >
                      Inspect Candidate Record
                    </button>

                    <button
                      className="btn-secondary"
                      style={{ fontSize: '12px', borderColor: 'var(--status-warning)' }}
                      onClick={() => handleCreateLinkage(m, 'RELATED_INQUIRY')}
                      disabled={isLinking}
                    >
                      🔗 Link as Related Inquiry
                    </button>

                    <button
                      className="btn-primary"
                      style={{ fontSize: '12px', background: 'var(--status-danger)' }}
                      onClick={() => handleCreateLinkage(m, 'DUPLICATE')}
                      disabled={isLinking}
                    >
                      ⚠️ Confirm as Duplicate Case
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Previously Established Linkages Table */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
          Confirmed Case Linkages & Human Review Registry ({linkages.length})
        </h3>

        {linkages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            No verified linkages recorded yet.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source Case</th>
                  <th>Target Case</th>
                  <th>Link Type</th>
                  <th>Match Score</th>
                  <th>Status</th>
                  <th>Verification Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {linkages.map((l) => (
                  <tr key={l.id}>
                    <td className="font-mono" style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
                      {l.source_complaint_no}
                    </td>
                    <td className="font-mono" style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
                      {l.target_complaint_no}
                    </td>
                    <td>
                      <span className="badge badge-purple">{l.link_type}</span>
                    </td>
                    <td>{Math.round(l.similarity_score * 100)}%</td>
                    <td>
                      <span className={`badge ${l.status === 'CONFIRMED_BY_OFFICER' ? 'badge-success' : l.status === 'DISMISSED' ? 'badge-neutral' : 'badge-warning'}`}>
                        {l.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {l.verification_notes || '—'}
                    </td>
                    <td>
                      {l.status === 'PROPOSED_BY_AI' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '3px 8px', fontSize: '11.5px', background: 'var(--status-success)' }}
                            onClick={() => handleReviewLinkage(l.id, 'CONFIRMED_BY_OFFICER')}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11.5px' }}
                            onClick={() => handleReviewLinkage(l.id, 'DISMISSED')}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
