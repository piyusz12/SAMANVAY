import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AISimilarityView({
  initialComplaint,
  onSelectComplaint,
  currentUser
}) {
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'benchmark' | 'registry'
  const [complaints, setComplaints] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(initialComplaint?.id || '');
  const [checkResult, setCheckResult] = useState(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [linkages, setLinkages] = useState([]);
  
  // Review Decision Modal State
  const [decisionModal, setDecisionModal] = useState({
    isOpen: false,
    candidate: null,
    linkageId: null,
    targetStatus: 'CONFIRMED_RELATED', // 'CONFIRMED_RELATED' | 'NOT_RELATED' | 'ALREADY_LINKED'
    linkType: 'CROSS_BUREAU_OVERLAP',
    rationale: ''
  });
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Benchmark Dataset Evaluation State
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [optimalData, setOptimalData] = useState(null);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);
  const [customThreshold, setCustomThreshold] = useState(0.35);

  useEffect(() => {
    // Load active complaints
    api.getComplaints({ page_size: 50 })
      .then((res) => {
        setComplaints(res.items || []);
        if (!selectedCaseId && res.items?.length > 0) {
          setSelectedCaseId(res.items[0].id);
        }
      })
      .catch((err) => console.error(err));

    loadExistingLinkages();
    loadBenchmarkEvaluation();
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
      setLinkages(data || []);
    } catch (err) {
      console.error('Failed to load linkages:', err);
    }
  };

  const loadBenchmarkEvaluation = async (lowCutoff = customThreshold) => {
    try {
      setLoadingBenchmark(true);
      const [evalRes, optRes] = await Promise.all([
        api.evaluateBenchmarkDataset({ low_threshold: lowCutoff }),
        api.getOptimalThresholds()
      ]);
      setBenchmarkData(evalRes);
      setOptimalData(optRes);
    } catch (err) {
      console.error('Failed to load benchmark evaluation:', err);
    } finally {
      setLoadingBenchmark(false);
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
      console.error('Similarity check error:', err);
    } finally {
      setLoadingCheck(false);
    }
  };

  const openDecisionModal = (candidate, targetStatus, linkageId = null) => {
    setDecisionModal({
      isOpen: true,
      candidate,
      linkageId: linkageId || candidate?.linkage_id || null,
      targetStatus,
      linkType: targetStatus === 'CONFIRMED_RELATED' ? 'CROSS_BUREAU_OVERLAP' : 'RELATED_INQUIRY',
      rationale: ''
    });
  };

  const submitDecision = async () => {
    if (!decisionModal.rationale.trim()) {
      alert('Mandatory Requirement: Please provide a clear official review rationale before recording this regulatory decision.');
      return;
    }

    try {
      setIsSubmittingDecision(true);
      if (decisionModal.linkageId) {
        // Update existing linkage status
        await api.reviewLinkage(decisionModal.linkageId, {
          status: decisionModal.targetStatus,
          verification_notes: decisionModal.rationale,
          rationale: decisionModal.rationale
        });
      } else if (decisionModal.candidate) {
        // Create new linkage with official decision
        await api.createLinkage({
          source_complaint_id: Number(selectedCaseId),
          target_complaint_id: decisionModal.candidate.complaint_id,
          link_type: decisionModal.linkType,
          similarity_score: decisionModal.candidate.similarity_score,
          explanation: decisionModal.candidate.explanation,
          notes: decisionModal.rationale,
          rationale: decisionModal.rationale
        });
      }

      setDecisionModal({ ...decisionModal, isOpen: false, rationale: '' });
      await loadExistingLinkages();
      if (selectedCaseId) {
        await runCheckForCase(selectedCaseId);
      }
      alert(`Decision recorded successfully: Set to ${decisionModal.targetStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      alert(`Error recording decision: ${err.message}`);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const selectedCase = complaints.find((c) => c.id === Number(selectedCaseId));

  return (
    <div>
      {/* Title & Governance Notice */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Explainable Overlap-Detection Engine</h2>
              <span className="badge badge-purple">4-Stage Pipeline</span>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Multi-bureau institution coordination radar powered by exact stable IDs, conservative aliases, metadata clusters, and semantic embeddings.
            </p>
          </div>

          {/* Navigation Tab Bar */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-subtle)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              className={activeTab === 'radar' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '12.5px', padding: '6px 14px' }}
              onClick={() => setActiveTab('radar')}
            >
              🎯 Live Overlap Radar
            </button>
            <button
              className={activeTab === 'benchmark' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '12.5px', padding: '6px 14px' }}
              onClick={() => setActiveTab('benchmark')}
            >
              📊 Benchmark & Thresholds
            </button>
            <button
              className={activeTab === 'registry' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '12.5px', padding: '6px 14px' }}
              onClick={() => setActiveTab('registry')}
            >
              📋 Review Registry ({linkages.length})
            </button>
          </div>
        </div>

        {/* Human-in-the-Loop Governance Notice */}
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: 'rgba(245, 158, 11, 0.08)',
            borderLeft: '4px solid var(--accent-gold)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            color: 'var(--text-secondary)'
          }}
        >
          <strong style={{ color: 'var(--accent-gold)' }}>⚖️ Mandatory Governance Protocol: </strong>
          Candidate overlap scores are explainable decision-support signals. The engine <strong>preserves independent complaint records</strong> and <strong>never automatically merges complaints</strong> or modifies official case outcomes without authorized officer review.
        </div>
      </div>

      {/* =========================================================================
          TAB 1: LIVE OVERLAP RADAR
          ========================================================================= */}
      {activeTab === 'radar' && (
        <div>
          {/* Select Case to Analyze */}
          <div className="card" style={{ marginBottom: '24px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '13.5px', fontWeight: '700' }}>Subject Case for Cross-Bureau Analysis:</label>
              <select
                id="select-similarity-case"
                className="form-select"
                style={{ minWidth: '440px', fontWeight: '600' }}
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
              >
                {complaints.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.complaint_no} — [{c.bureau.replace(/_/g, ' ')}] {c.subject.slice(0, 50)}...
                  </option>
                ))}
              </select>
            </div>

            {selectedCase && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '14px 16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', gap: '20px', color: 'var(--text-muted)', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span>Institution: <strong style={{ color: 'var(--text-primary)' }}>{selectedCase.institution_name}</strong></span>
                  <span>Category: <strong style={{ color: 'var(--text-primary)' }}>{selectedCase.category.replace(/_/g, ' ')}</strong></span>
                  <span>Bureau: <strong style={{ color: 'var(--text-primary)' }}>{selectedCase.bureau.replace(/_/g, ' ')}</strong></span>
                  <span>Status: <strong style={{ color: 'var(--text-primary)' }}>{selectedCase.status.replace(/_/g, ' ')}</strong></span>
                </div>
                <div style={{ color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                  "{selectedCase.description.slice(0, 240)}..."
                </div>
              </div>
            )}
          </div>

          {/* Matching Results */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '700' }}>
                Explainable Candidate Matches ({checkResult?.matches?.length || 0})
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
                <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
                  Executing 4-stage pipeline: evaluating exact identifiers, acronym aliases, metadata taxonomy, and semantic embeddings...
                </p>
              </div>
            ) : !checkResult || checkResult.matches.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-state-icon">🔍</div>
                <h4>No Overlapping Complaints Detected</h4>
                <p>This complaint appears distinct from active repository records across AICTE bureaus.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {checkResult.matches.map((m) => {
                  const scorePercent = Math.round(m.similarity_score * 100);
                  const tier = m.confidence_tier || (scorePercent >= 75 ? 'HIGH' : scorePercent >= 50 ? 'MEDIUM' : 'LOW');
                  const tierColor = tier === 'HIGH' ? 'var(--status-danger)' : tier === 'MEDIUM' ? 'var(--status-warning)' : 'var(--accent-blue)';
                  const breakdown = m.breakdown || m.staged_breakdown || {};

                  return (
                    <div
                      key={m.complaint_id}
                      className="card"
                      style={{
                        borderLeft: `4px solid ${tierColor}`,
                        padding: '18px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: '320px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '14px' }}>
                              {m.complaint_no}
                            </span>
                            <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                              {m.bureau.replace(/_/g, ' ')}
                            </span>
                            <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
                              {m.status.replace(/_/g, ' ')}
                            </span>
                            {/* Confidence Tier Badge */}
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: tier === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : tier === 'MEDIUM' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: tierColor,
                                border: `1px solid ${tierColor}`
                              }}
                            >
                              {tier} CONFIDENCE
                            </span>
                            {/* Linkage Status Badge */}
                            {m.linkage_status && (
                              <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                                Status: {m.linkage_status.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {m.subject}
                          </div>

                          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                            Institution: <strong style={{ color: 'var(--text-primary)' }}>{m.institution_name}</strong> • Category: <strong style={{ color: 'var(--text-primary)' }}>{m.category.replace(/_/g, ' ')}</strong>
                          </div>
                        </div>

                        {/* Score Gauge */}
                        <div style={{ minWidth: '160px', textAlign: 'right' }}>
                          <div style={{ fontSize: '26px', fontWeight: '800', fontFamily: 'var(--font-display)', color: tierColor }}>
                            {scorePercent}%
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Candidate Match Score
                          </div>
                          <div className="match-meter-container" style={{ marginTop: '4px' }}>
                            <div
                              className="match-meter-bar"
                              style={{ width: `${scorePercent}%`, background: tierColor }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* 4-Stage Pipeline Breakdown Grid */}
                      <div
                        style={{
                          marginTop: '16px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                          gap: '10px',
                          background: 'var(--bg-subtle)',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        {/* Stage 1 */}
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>
                            Stage 1: Stable Identifier
                          </div>
                          <div style={{ fontWeight: '700', color: breakdown.stage1_exact_identifier_matched ? 'var(--status-success)' : 'var(--text-secondary)' }}>
                            {breakdown.stage1_exact_identifier_matched
                              ? `✅ ${breakdown.stage1_identifier_type || 'Exact Match'}`
                              : '⚪ No explicit ID match'}
                          </div>
                        </div>

                        {/* Stage 2 */}
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>
                            Stage 2: Name & Aliases
                          </div>
                          <div style={{ fontWeight: '700', color: breakdown.stage2_alias_matched ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
                            {breakdown.stage2_alias_matched
                              ? `🏷️ Alias: ${breakdown.stage2_matched_alias || 'Recognized'}`
                              : `Score: ${Math.round((breakdown.stage2_normalized_name_score || 0) * 100)}%`}
                          </div>
                        </div>

                        {/* Stage 3 */}
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>
                            Stage 3: Metadata & Scope
                          </div>
                          <div style={{ fontWeight: '700', color: breakdown.stage3_cross_bureau ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                            {breakdown.stage3_cross_bureau ? '⚡ Cross-Bureau Case' : 'Same Bureau'} • {breakdown.stage3_category_relationship || 'Taxonomy'}
                          </div>
                        </div>

                        {/* Stage 4 */}
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>
                            Stage 4: Semantic Cosine
                          </div>
                          <div style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>
                            Vectors: {Math.round((breakdown.stage4_semantic_score || 0) * 100)}% narrative overlap
                          </div>
                        </div>
                      </div>

                      {/* Human-Readable Reasons List */}
                      {m.reasons && m.reasons.length > 0 && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            background: 'rgba(59, 130, 246, 0.05)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12.5px'
                          }}
                        >
                          <div style={{ fontWeight: '700', color: 'var(--accent-blue)', marginBottom: '4px' }}>
                            💡 Explainable Attribution Reasons:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)' }}>
                            {m.reasons.map((r, i) => (
                              <li key={i} style={{ marginBottom: '2px' }}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Human Officer Review Actions */}
                      <div
                        style={{
                          marginTop: '14px',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '12px' }}
                          onClick={() => onSelectComplaint(m.complaint_id)}
                        >
                          🔍 Inspect Complaint
                        </button>

                        <button
                          className="btn-secondary"
                          style={{ fontSize: '12px', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}
                          onClick={() => openDecisionModal(m, 'NOT_RELATED')}
                        >
                          ✕ Dismiss False Positive
                        </button>

                        <button
                          className="btn-primary"
                          style={{ fontSize: '12px', background: 'var(--accent-purple)' }}
                          onClick={() => openDecisionModal(m, 'CONFIRMED_RELATED')}
                        >
                          🔗 Confirm Related Case
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: BENCHMARK EVALUATION & THRESHOLD TUNING
          ========================================================================= */}
      {activeTab === 'benchmark' && (
        <div>
          <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>
                  Labelled Synthetic Benchmark Dataset Performance
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Empirical precision and recall validation over 8 standardized test cases spanning exact identifiers, spelling variations, acronym aliases, explicit citations, narrative rewordings, and true negative controls.
                </p>
              </div>

              <button
                className="btn-secondary"
                style={{ fontSize: '12px' }}
                onClick={() => loadBenchmarkEvaluation(customThreshold)}
                disabled={loadingBenchmark}
              >
                🔄 Refresh Evaluation
              </button>
            </div>

            {/* Performance KPI Cards */}
            {benchmarkData && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '14px',
                  marginTop: '18px'
                }}
              >
                <div className="card" style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--status-success)' }}>
                    {Math.round(benchmarkData.metrics.precision * 100)}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                    Empirical Precision
                  </div>
                </div>

                <div className="card" style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                    {Math.round(benchmarkData.metrics.recall * 100)}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                    Empirical Recall
                  </div>
                </div>

                <div className="card" style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-gold)' }}>
                    {Math.round(benchmarkData.metrics.f1_score * 100)}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                    Harmonic F1 Score
                  </div>
                </div>

                <div className="card" style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-purple)' }}>
                    {Math.round(benchmarkData.metrics.accuracy * 100)}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                    Total Accuracy
                  </div>
                </div>
              </div>
            )}

            {/* Confusion Matrix & Threshold Tuning Slider */}
            {benchmarkData && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '18px',
                  marginTop: '22px'
                }}
              >
                {/* 2x2 Confusion Matrix */}
                <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>
                    Empirical 2×2 Confusion Matrix
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-success)' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--status-success)' }}>
                        {benchmarkData.confusion_matrix.true_positives}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>True Positives (TP)</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-danger)' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--status-danger)' }}>
                        {benchmarkData.confusion_matrix.false_positives}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>False Positives (FP)</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-danger)' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--status-danger)' }}>
                        {benchmarkData.confusion_matrix.false_negatives}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>False Negatives (FN)</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-success)' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--status-success)' }}>
                        {benchmarkData.confusion_matrix.true_negatives}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>True Negatives (TN)</div>
                    </div>
                  </div>
                </div>

                {/* Threshold Operating Point Tuning */}
                <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
                    Interactive Threshold Sweeping & Optimization
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    Operating parameter tuned on benchmark dataset rather than arbitrary claims. Recommended cutoff for maximal F1 score: <strong style={{ color: 'var(--status-success)' }}>{optimalData?.optimal_thresholds?.low || 0.50}</strong>
                  </p>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                      <span>Cutoff Threshold:</span>
                      <strong style={{ color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{customThreshold}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="0.65"
                      step="0.05"
                      value={customThreshold}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCustomThreshold(val);
                        loadBenchmarkEvaluation(val);
                      }}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>0.25 (High Recall)</span>
                      <span>0.45 (Balanced)</span>
                      <span>0.65 (High Precision)</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                    Current Configuration: High: <strong>0.75</strong> • Medium: <strong>0.50</strong> • Low: <strong>{customThreshold}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Benchmark Test Cases Detail Table */}
            {benchmarkData && (
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}>
                  Benchmark Evaluation Test Suite (8 Test Cases)
                </h4>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Case ID</th>
                        <th>Test Category</th>
                        <th>Description</th>
                        <th>Ground Truth</th>
                        <th>Score</th>
                        <th>Prediction</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkData.results.map((r) => (
                        <tr key={r.test_id}>
                          <td className="font-mono" style={{ fontWeight: '700' }}>{r.test_id}</td>
                          <td>
                            <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                              {r.test_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: '12.5px' }}>{r.description}</td>
                          <td>
                            <span className={`badge ${r.ground_truth ? 'badge-success' : 'badge-neutral'}`}>
                              {r.ground_truth ? 'OVERLAP' : 'DISTINCT'}
                            </span>
                          </td>
                          <td className="font-mono" style={{ fontWeight: '700' }}>
                            {Math.round(r.predicted_score * 100)}%
                          </td>
                          <td>
                            <span className={`badge ${r.confidence === 'HIGH' ? 'badge-danger' : r.confidence === 'MEDIUM' ? 'badge-warning' : 'badge-neutral'}`}>
                              {r.confidence}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                background: r.classification.startsWith('TRUE') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: r.classification.startsWith('TRUE') ? 'var(--status-success)' : 'var(--status-danger)'
                              }}
                            >
                              {r.classification.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: REVIEW REGISTRY & LINKAGES
          ========================================================================= */}
      {activeTab === 'registry' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700' }}>
              Confirmed Case Linkages & Human Review Registry ({linkages.length})
            </h3>
            <button
              className="btn-secondary"
              style={{ fontSize: '12px' }}
              onClick={loadExistingLinkages}
            >
              🔄 Refresh Registry
            </button>
          </div>

          {linkages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              No case linkages or overlap reviews recorded yet. Use the Live Overlap Radar to evaluate and link candidates.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source Case</th>
                    <th>Target Case</th>
                    <th>Link Type</th>
                    <th>Confidence Tier</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Review Rationale</th>
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
                        <span className="badge badge-purple">{l.link_type?.replace(/_/g, ' ')}</span>
                      </td>
                      <td>
                        <span className={`badge ${l.confidence_tier === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                          {l.confidence_tier || 'MEDIUM'}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontWeight: '700' }}>
                        {Math.round(l.similarity_score * 100)}%
                      </td>
                      <td>
                        <span className={`badge ${l.status === 'CONFIRMED_RELATED' ? 'badge-success' : l.status === 'NOT_RELATED' ? 'badge-neutral' : 'badge-warning'}`}>
                          {l.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                        {l.rationale || l.verification_notes || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => openDecisionModal(null, l.status === 'CONFIRMED_RELATED' ? 'NOT_RELATED' : 'CONFIRMED_RELATED', l.id)}
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          REVIEW DECISION & RATIONALE MODAL
          ========================================================================= */}
      {decisionModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800' }}>
                {decisionModal.targetStatus === 'CONFIRMED_RELATED'
                  ? 'Confirm Related Case Linkage'
                  : 'Dismiss as Not Related (False Positive)'}
              </h3>
              <button
                className="btn-close"
                onClick={() => setDecisionModal({ ...decisionModal, isOpen: false })}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              {decisionModal.targetStatus === 'CONFIRMED_RELATED' ? (
                <span>
                  Recording this linkage establishes an official cross-bureau coordination edge between cases without merging records or mutating independent complaint histories.
                </span>
              ) : (
                <span>
                  Dismissing this candidate pair flags it as a reviewed false positive, suppressing duplicate alert notifications while recording the review decision.
                </span>
              )}
            </div>

            {decisionModal.targetStatus === 'CONFIRMED_RELATED' && (
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  Linkage Classification Type:
                </label>
                <select
                  className="form-select"
                  value={decisionModal.linkType}
                  onChange={(e) => setDecisionModal({ ...decisionModal, linkType: e.target.value })}
                >
                  <option value="CROSS_BUREAU_OVERLAP">Cross-Bureau Overlap (Multi-Bureau Regulatory Inquiry)</option>
                  <option value="RELATED_INQUIRY">Related Institutional Inquiry</option>
                  <option value="DUPLICATE">Same Complainant Duplicate Case</option>
                  <option value="COMMON_FACULTY_ROLL">Shared Faculty Roll Dispute</option>
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Official Regulatory Rationale <span style={{ color: 'var(--status-danger)' }}>*</span>:
              </label>
              <textarea
                className="form-input"
                rows="4"
                placeholder="Enter regulatory justification, verification remarks, or why this pair is confirmed related / dismissed as false positive..."
                value={decisionModal.rationale}
                onChange={(e) => setDecisionModal({ ...decisionModal, rationale: e.target.value })}
                style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={() => setDecisionModal({ ...decisionModal, isOpen: false })}
                disabled={isSubmittingDecision}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{
                  background: decisionModal.targetStatus === 'CONFIRMED_RELATED' ? 'var(--accent-purple)' : 'var(--status-danger)'
                }}
                onClick={submitDecision}
                disabled={isSubmittingDecision}
              >
                {isSubmittingDecision ? 'Recording...' : 'Submit Official Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
