import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const REGIONS = [
  'NORTHERN',
  'NORTH_WEST',
  'SOUTH',
  'SOUTH_WEST',
  'CENTRAL',
  'EASTERN',
  'WESTERN'
];

const INSTITUTION_TYPES = [
  'ENGINEERING',
  'MANAGEMENT',
  'PHARMACY',
  'POLYTECHNIC',
  'ARCHITECTURE',
  'OTHER'
];

const APPROVAL_STATUSES = [
  'APPROVED',
  'UNDER_REVIEW',
  'WITHDRAWN',
  'UNAPPROVED'
];

const SAMPLE_SYNTHETIC_CSV = `aicte_id,name,region,state,city,institution_type,approval_status,contact_email,aishe_code
1-3001928471,National Institute of Advanced Robotics,NORTHERN,Delhi,New Delhi,ENGINEERING,APPROVED,director@niar-demo.edu.in,C-99101
1-3001928472,Apex Institute of Pharmaceutical Sciences,SOUTH,Karnataka,Bengaluru,PHARMACY,APPROVED,principal@aips-demo.edu.in,C-99102
1-3001928473,Coastal Polytechnic College,WESTERN,Maharashtra,Pune,POLYTECHNIC,APPROVED,info@coastalpoly-demo.edu.in,C-99103
1-10293847,Apex Institute of Engineering & Technology [SYNTHETIC],NORTHERN,Delhi,New Delhi,ENGINEERING,APPROVED,duplicate@apex-demo.edu.in,C-10001
`;

export default function InstitutionDossierView({
  selectedInstitutionId,
  onSelectComplaint,
  currentUser
}) {
  // Navigation: 'registry' | 'dossier'
  const [activeSubTab, setActiveSubTab] = useState(selectedInstitutionId ? 'dossier' : 'registry');
  const [institutionsList, setInstitutionsList] = useState([]);
  const [currentId, setCurrentId] = useState(selectedInstitutionId || '');

  // Registry Directory Table State
  const [registryItems, setRegistryItems] = useState([]);
  const [totalInstitutions, setTotalInstitutions] = useState(0);
  const [loadingRegistry, setLoadingRegistry] = useState(false);
  const [registryFilters, setRegistryFilters] = useState({
    page: 1,
    page_size: 10,
    search: '',
    region: 'ALL',
    state: 'ALL',
    institution_type: 'ALL',
    approval_status: 'ALL',
    sort_by: 'name',
    sort_dir: 'asc'
  });

  // Dossier View State
  const [dossier, setDossier] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierError, setDossierError] = useState('');
  const [activeDossierTab, setActiveDossierTab] = useState('complaints'); // 'complaints' | 'audit'
  const [dossierAuditLogs, setDossierAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Create / Edit Institution Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [formData, setFormData] = useState({
    aicte_id: '',
    aishe_code: '',
    name: '',
    institution_type: 'ENGINEERING',
    region: 'NORTHERN',
    state: '',
    city: '',
    pincode: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    approval_status: 'APPROVED',
    is_accredited: false
  });
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [dryRunResult, setDryRunResult] = useState(null);
  const [isValidatingCsv, setIsValidatingCsv] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');

  // Permission Check
  const canManageInstitutions =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'BUREAU_ADMIN' ||
    currentUser?.role === 'BUREAU_HEAD';

  // Load institutions list for dropdown selectors
  const loadInstitutionsDropdown = async () => {
    try {
      const data = await api.getInstitutions();
      const list = Array.isArray(data) ? data : data.items || [];
      setInstitutionsList(list);
      if (!currentId && list.length > 0) {
        setCurrentId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load institutions dropdown:', err);
    }
  };

  useEffect(() => {
    loadInstitutionsDropdown();
  }, []);

  // Sync selectedInstitutionId prop if passed
  useEffect(() => {
    if (selectedInstitutionId) {
      setCurrentId(selectedInstitutionId);
      setActiveSubTab('dossier');
    }
  }, [selectedInstitutionId]);

  // Load registry items when filters change
  useEffect(() => {
    if (activeSubTab === 'registry') {
      loadRegistry();
    }
  }, [registryFilters, activeSubTab]);

  // Load dossier when currentId changes and tab is dossier
  useEffect(() => {
    if (activeSubTab === 'dossier' && currentId) {
      loadDossier(currentId);
      loadAuditLogs(currentId);
    }
  }, [currentId, activeSubTab]);

  const loadRegistry = async () => {
    try {
      setLoadingRegistry(true);
      const res = await api.getInstitutions(registryFilters);
      if (res && res.items) {
        setRegistryItems(res.items);
        setTotalInstitutions(res.total);
      } else if (Array.isArray(res)) {
        setRegistryItems(res);
        setTotalInstitutions(res.length);
      }
    } catch (err) {
      console.error('Failed to load registry:', err);
    } finally {
      setLoadingRegistry(false);
    }
  };

  const loadDossier = async (id) => {
    try {
      setLoadingDossier(true);
      setDossierError('');
      const data = await api.getInstitutionDossier(id);
      setDossier(data);
    } catch (err) {
      setDossierError(err.message || 'Failed to load institution dossier.');
    } finally {
      setLoadingDossier(false);
    }
  };

  const loadAuditLogs = async (id) => {
    try {
      setLoadingAudit(true);
      const logs = await api.getInstitutionAuditHistory(id);
      setDossierAuditLogs(logs || []);
    } catch (err) {
      console.error('Failed to load audit history:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Real-time Anti-Duplicate Precheck
  const runDuplicatePrecheck = async (data) => {
    if (!data.name && !data.aicte_id && !data.aishe_code) {
      setDuplicateWarning(null);
      return;
    }
    try {
      setCheckingDuplicate(true);
      const match = await api.checkInstitutionDuplicate({
        aicte_id: data.aicte_id || undefined,
        aishe_code: data.aishe_code || undefined,
        name: data.name || '',
        city: data.city || undefined,
        state: data.state || undefined
      });

      if (match && match.is_duplicate) {
        // If editing, ignore match if it's the current institution
        if (editingInstitution && match.matched_institution_id === editingInstitution.id) {
          setDuplicateWarning(null);
        } else {
          setDuplicateWarning(match);
        }
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error('Duplicate precheck failed:', err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingInstitution(null);
    setFormData({
      aicte_id: `1-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      aishe_code: '',
      name: '',
      institution_type: 'ENGINEERING',
      region: 'NORTHERN',
      state: 'Delhi',
      city: 'New Delhi',
      pincode: '110001',
      address: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      approval_status: 'APPROVED',
      is_accredited: false
    });
    setDuplicateWarning(null);
    setFormError('');
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (inst) => {
    setEditingInstitution(inst);
    setFormData({
      aicte_id: inst.aicte_id,
      aishe_code: inst.aishe_code || '',
      name: inst.name,
      institution_type: inst.institution_type || 'ENGINEERING',
      region: inst.region || 'NORTHERN',
      state: inst.state || '',
      city: inst.city || '',
      pincode: inst.pincode || '',
      address: inst.address || '',
      contact_email: inst.contact_email || '',
      contact_phone: inst.contact_phone || '',
      website: inst.website || '',
      approval_status: inst.approval_status || 'APPROVED',
      is_accredited: !!inst.is_accredited
    });
    setDuplicateWarning(null);
    setFormError('');
    setShowFormModal(true);
  };

  // Form Submit
  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      setFormSubmitting(true);
      if (editingInstitution) {
        await api.updateInstitution(editingInstitution.id, formData);
      } else {
        await api.createInstitution(formData);
      }
      setShowFormModal(false);
      loadRegistry();
      loadInstitutionsDropdown();
      if (currentId && editingInstitution && currentId === editingInstitution.id) {
        loadDossier(currentId);
        loadAuditLogs(currentId);
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle CSV Import
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
      setCsvFileName(file.name);
      setDryRunResult(null);
      setImportMessage('');
      setImportError('');
    }
  };

  const handleLoadSampleCSV = () => {
    const blob = new Blob([SAMPLE_SYNTHETIC_CSV], { type: 'text/csv' });
    const file = new File([blob], 'synthetic_institutions_sample.csv', { type: 'text/csv' });
    setCsvFile(file);
    setCsvFileName('synthetic_institutions_sample.csv');
    setDryRunResult(null);
    setImportMessage('');
    setImportError('');
  };

  const handleRunCsvDryRun = async () => {
    if (!csvFile) return;
    try {
      setIsValidatingCsv(true);
      setImportError('');
      const res = await api.importInstitutionsCSV(csvFile, true);
      setDryRunResult(res);
    } catch (err) {
      setImportError(err.message || 'CSV dry-run validation failed.');
    } finally {
      setIsValidatingCsv(false);
    }
  };

  const handleCommitCsvImport = async () => {
    if (!csvFile) return;
    try {
      setIsImportingCsv(true);
      setImportError('');
      const res = await api.importInstitutionsCSV(csvFile, false);
      setImportMessage(`Successfully imported ${res.imported_count} institutions (${res.skipped_duplicates_count} skipped/duplicates, ${res.error_count} errors).`);
      setDryRunResult(res);
      loadRegistry();
      loadInstitutionsDropdown();
    } catch (err) {
      setImportError(err.message || 'CSV import failed.');
    } finally {
      setIsImportingCsv(false);
    }
  };

  const totalPages = Math.ceil(totalInstitutions / registryFilters.page_size) || 1;

  return (
    <div>
      {/* 1. Header Navigation & Mode Switcher */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🏛️</span> Institution Registry & 360° Dossier
              <span className="badge badge-blue font-mono" style={{ fontSize: '11px' }}>
                MASTER REGISTRY
              </span>
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Authoritative synthetic registry with real-time anti-duplicate validation, cross-bureau complaint consolidation, and change audit trails
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Sub-tab view toggle buttons */}
            <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                id="btn-subtab-registry"
                className={`btn-secondary ${activeSubTab === 'registry' ? 'active' : ''}`}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeSubTab === 'registry' ? 'var(--accent-blue)' : 'transparent',
                  color: activeSubTab === 'registry' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: '600'
                }}
                onClick={() => setActiveSubTab('registry')}
              >
                📋 Institution Directory
              </button>
              <button
                id="btn-subtab-dossier"
                className={`btn-secondary ${activeSubTab === 'dossier' ? 'active' : ''}`}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeSubTab === 'dossier' ? 'var(--accent-blue)' : 'transparent',
                  color: activeSubTab === 'dossier' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: '600'
                }}
                onClick={() => setActiveSubTab('dossier')}
              >
                🔍 360° Institution Dossier
              </button>
            </div>

            {/* Admin Action Buttons */}
            {canManageInstitutions && (
              <>
                <button
                  id="btn-open-create-inst"
                  className="btn-primary"
                  onClick={handleOpenCreateModal}
                  title="Register new AICTE institution"
                >
                  ➕ Register Institution
                </button>
                <button
                  id="btn-open-import-csv"
                  className="btn-secondary"
                  onClick={() => {
                    setCsvFile(null);
                    setCsvFileName('');
                    setDryRunResult(null);
                    setImportMessage('');
                    setImportError('');
                    setShowImportModal(true);
                  }}
                  title="Import synthetic institutions via CSV dataset"
                >
                  📥 Import CSV Dataset
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. TAB 1: REGISTRY DIRECTORY VIEW */}
      {activeSubTab === 'registry' && (
        <div>
          {/* Filters Bar */}
          <div className="card" style={{ marginBottom: '18px', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label">Search ID / AISHE / Name</label>
                <input
                  id="filter-inst-search"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 1-1002345678 or Delhi..."
                  value={registryFilters.search}
                  onChange={(e) => setRegistryFilters({ ...registryFilters, search: e.target.value, page: 1 })}
                />
              </div>

              <div>
                <label className="form-label">Region</label>
                <select
                  id="filter-inst-region"
                  className="form-select"
                  value={registryFilters.region}
                  onChange={(e) => setRegistryFilters({ ...registryFilters, region: e.target.value, page: 1 })}
                >
                  <option value="ALL">All Regions</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Institution Type</label>
                <select
                  id="filter-inst-type"
                  className="form-select"
                  value={registryFilters.institution_type}
                  onChange={(e) => setRegistryFilters({ ...registryFilters, institution_type: e.target.value, page: 1 })}
                >
                  <option value="ALL">All Types</option>
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Approval Status</label>
                <select
                  id="filter-inst-status"
                  className="form-select"
                  value={registryFilters.approval_status}
                  onChange={(e) => setRegistryFilters({ ...registryFilters, approval_status: e.target.value, page: 1 })}
                >
                  <option value="ALL">All Statuses</option>
                  {APPROVAL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Sort By</label>
                <select
                  id="filter-inst-sort"
                  className="form-select"
                  value={`${registryFilters.sort_by}_${registryFilters.sort_dir}`}
                  onChange={(e) => {
                    const [sort_by, sort_dir] = e.target.value.split('_');
                    setRegistryFilters({ ...registryFilters, sort_by, sort_dir });
                  }}
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="aicte_id_asc">AICTE ID (Asc)</option>
                  <option value="aicte_id_desc">AICTE ID (Desc)</option>
                  <option value="region_asc">Region</option>
                  <option value="created_at_desc">Recently Registered</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>
                Institutions Directory <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>({totalInstitutions} total records)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span>Page Size:</span>
                <select
                  className="form-select"
                  style={{ width: '70px', padding: '4px 8px' }}
                  value={registryFilters.page_size}
                  onChange={(e) => setRegistryFilters({ ...registryFilters, page_size: Number(e.target.value), page: 1 })}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {loadingRegistry ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="loading-spinner"></div>
                <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading institution records...</p>
              </div>
            ) : registryItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏛️</div>
                <h4>No Institutions Found</h4>
                <p>No institution matched your filter criteria or search query.</p>
              </div>
            ) : (
              <div className="data-table-container" style={{ border: 'none', borderRadius: '0' }}>
                <table className="data-table" id="institutions-registry-table">
                  <thead>
                    <tr>
                      <th>AICTE ID / AISHE</th>
                      <th>Institution Name</th>
                      <th>Type</th>
                      <th>Region & State</th>
                      <th>Status</th>
                      <th>Complaints</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registryItems.map((inst) => (
                      <tr key={inst.id}>
                        <td>
                          <div className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '13px' }}>
                            {inst.aicte_id}
                          </div>
                          {inst.aishe_code && (
                            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              AISHE: {inst.aishe_code}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                            {inst.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {inst.city}, {inst.state}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
                            {inst.institution_type}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>{inst.region.replace('_', ' ')}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{inst.state}</div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              inst.approval_status === 'APPROVED'
                                ? 'badge-success'
                                : inst.approval_status === 'UNDER_REVIEW'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                          >
                            {inst.approval_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px' }}>
                              {inst.complaints_count || 0}
                            </span>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>cases</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px', marginRight: '6px' }}
                            onClick={() => {
                              setCurrentId(inst.id);
                              setActiveSubTab('dossier');
                            }}
                            title="Inspect 360° Consolidated Dossier"
                          >
                            🔍 360° Dossier
                          </button>
                          {canManageInstitutions && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '12px' }}
                              onClick={() => handleOpenEditModal(inst)}
                              title="Edit Institution Metadata"
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Showing page <strong>{registryFilters.page}</strong> of <strong>{totalPages}</strong> ({totalInstitutions} items)
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn-secondary"
                  disabled={registryFilters.page <= 1}
                  onClick={() => setRegistryFilters({ ...registryFilters, page: registryFilters.page - 1 })}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  ← Prev
                </button>
                <button
                  className="btn-secondary"
                  disabled={registryFilters.page >= totalPages}
                  onClick={() => setRegistryFilters({ ...registryFilters, page: registryFilters.page + 1 })}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: 360° INSTITUTION DOSSIER VIEW */}
      {activeSubTab === 'dossier' && (
        <div>
          {/* Quick Selector Dropdown */}
          <div className="card" style={{ marginBottom: '18px', padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Selected Institution:
                </label>
                <select
                  id="select-institution-dossier"
                  className="form-select"
                  style={{ minWidth: '340px', fontWeight: '600' }}
                  value={currentId}
                  onChange={(e) => setCurrentId(Number(e.target.value))}
                >
                  {institutionsList.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.aicte_id} — {inst.name} ({inst.city}, {inst.state})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {canManageInstitutions && dossier && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleOpenEditModal(dossier.institution)}
                  >
                    ✏️ Edit Institution Info
                  </button>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => setActiveSubTab('registry')}
                >
                  ← Back to Directory
                </button>
              </div>
            </div>
          </div>

          {loadingDossier ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ marginTop: '14px', color: 'var(--text-secondary)' }}>Compiling 360° cross-bureau dossier...</p>
            </div>
          ) : dossierError ? (
            <div className="card empty-state" style={{ color: 'var(--status-danger)' }}>
              {dossierError}
            </div>
          ) : dossier ? (
            <div>
              {/* Institution Profile Summary & Multi-Metric Breakdown Cards */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '22px', fontWeight: '800' }}>{dossier.institution.name}</h3>
                      <span className={`badge ${dossier.institution.approval_status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                        {dossier.institution.approval_status}
                      </span>
                      {dossier.institution.is_accredited && (
                        <span className="badge badge-purple">NBA / NAAC ACCREDITED</span>
                      )}
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '13.5px', color: 'var(--text-secondary)', display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                      <span>AICTE Permanent ID: <strong className="font-mono" style={{ color: 'var(--accent-blue)' }}>{dossier.institution.aicte_id}</strong></span>
                      {dossier.institution.aishe_code && (
                        <span>AISHE Code: <strong className="font-mono">{dossier.institution.aishe_code}</strong></span>
                      )}
                      <span>Type: <strong>{dossier.institution.institution_type}</strong></span>
                      <span>Region: <strong>{dossier.institution.region} ({dossier.institution.state})</strong></span>
                    </div>

                    <div style={{ marginTop: '6px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      📍 {dossier.institution.address}, {dossier.institution.city}, {dossier.institution.state} - {dossier.institution.pincode}
                      {dossier.institution.contact_email && ` • ✉️ ${dossier.institution.contact_email}`}
                      {dossier.institution.contact_phone && ` • 📞 ${dossier.institution.contact_phone}`}
                    </div>
                  </div>
                </div>

                {/* 5+ Counts Metrics KPI Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '20px' }}>
                  <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL CASES</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '4px' }}>{dossier.total_complaints}</div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>OPEN</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-blue)', marginTop: '4px' }}>{dossier.open_complaints ?? dossier.active_complaints}</div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>PENDING</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--status-warning)', marginTop: '4px' }}>{dossier.pending_complaints ?? 0}</div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>DISPOSED</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--status-success)', marginTop: '4px' }}>{dossier.disposed_complaints}</div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>OVERDUE SLA</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: (dossier.overdue_complaints || 0) > 0 ? 'var(--status-danger)' : 'var(--text-muted)', marginTop: '4px' }}>
                      {dossier.overdue_complaints ?? 0}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>POTENTIAL OVERLAPS</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: (dossier.overlapping_complaints || 0) > 0 ? 'var(--status-danger)' : 'var(--status-success)', marginTop: '4px' }}>
                      {dossier.overlapping_complaints ?? (dossier.conflict_alert?.has_conflict ? 1 : 0)}
                    </div>
                  </div>
                </div>

                {/* Cross-Bureau Conflict Callout Banner */}
                {dossier.conflict_alert?.has_conflict ? (
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

              {/* Dossier Tabs: Complaints Timeline vs Audit Trail */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <button
                  className={`btn-secondary ${activeDossierTab === 'complaints' ? 'active' : ''}`}
                  style={{
                    background: activeDossierTab === 'complaints' ? 'var(--bg-card-hover)' : 'transparent',
                    border: activeDossierTab === 'complaints' ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                    fontWeight: '600'
                  }}
                  onClick={() => setActiveDossierTab('complaints')}
                >
                  📁 Consolidated Complaint History ({dossier.recent_complaints.length})
                </button>
                <button
                  className={`btn-secondary ${activeDossierTab === 'audit' ? 'active' : ''}`}
                  style={{
                    background: activeDossierTab === 'audit' ? 'var(--bg-card-hover)' : 'transparent',
                    border: activeDossierTab === 'audit' ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                    fontWeight: '600'
                  }}
                  onClick={() => setActiveDossierTab('audit')}
                >
                  📜 Institution Change & Audit Trail ({dossierAuditLogs.length})
                </button>
              </div>

              {/* Sub-Tab 1: Chronological Complaint History */}
              {activeDossierTab === 'complaints' && (
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

                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                              <span>Category: <strong>{c.category.replace('_', ' ')}</strong></span>
                              <span>Officer: <strong>{c.assigned_officer_name || 'Unassigned'}</strong></span>
                              <span>Filed: <strong>{new Date(c.created_at).toLocaleDateString()}</strong></span>
                              <span>Duration: <strong>{c.days_open} days open</strong></span>
                            </div>
                          </div>

                          <div>
                            <button
                              id={`inspect-complaint-${c.id}`}
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
              )}

              {/* Sub-Tab 2: Institution Audit Logs */}
              {activeDossierTab === 'audit' && (
                <div className="card">
                  <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '14px' }}>
                    Institution Audit Trail & Governance Records
                  </h3>

                  {loadingAudit ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div className="loading-spinner"></div>
                      <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>Loading audit events...</p>
                    </div>
                  ) : dossierAuditLogs.length === 0 ? (
                    <div className="empty-state">
                      <h4>No Audit Events Found</h4>
                      <p>No historical updates have been logged for this institution yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {dossierAuditLogs.map((log) => (
                        <div
                          key={log.id}
                          style={{
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 16px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="badge badge-purple font-mono" style={{ fontSize: '11px' }}>
                                {log.action}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                                Actor: {log.user_email || 'System'}
                              </span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {log.details}
                          </div>

                          {log.extra_metadata && log.extra_metadata.changes && (
                            <div
                              style={{
                                background: 'rgba(0, 0, 0, 0.25)',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontFamily: 'var(--font-mono)'
                              }}
                            >
                              <div style={{ fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                FIELD LEVEL MODIFICATIONS:
                              </div>
                              {Object.entries(log.extra_metadata.changes).map(([field, delta]) => (
                                <div key={field} style={{ color: 'var(--text-primary)' }}>
                                  <strong style={{ color: 'var(--accent-gold)' }}>{field}</strong>:{' '}
                                  <span style={{ color: 'var(--status-danger)' }}>{String(delta.old ?? 'null')}</span> →{' '}
                                  <span style={{ color: 'var(--status-success)' }}>{String(delta.new ?? 'null')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* 4. CREATE / EDIT INSTITUTION MODAL */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '720px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{editingInstitution ? `Edit Institution: ${editingInstitution.name}` : 'Register New AICTE Institution'}</h3>
              <button className="btn-icon" onClick={() => setShowFormModal(false)}>✕</button>
            </div>

            {/* Error Message */}
            {formError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--status-danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '14px',
                  color: '#fca5a5',
                  fontSize: '13px'
                }}
              >
                ⚠️ {formError}
              </div>
            )}

            {/* Anti-Duplicate Warning Alert */}
            {duplicateWarning && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.18)',
                  border: '1px solid var(--status-warning)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: '700', fontSize: '14px' }}>
                  <span>⚠️</span> Potential Duplicate Detected ({Math.round((duplicateWarning.match_score || 1) * 100)}% Match Confidence)
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                  Matches registered institution: <strong>{duplicateWarning.matched_institution_name}</strong> (AICTE ID: <span className="font-mono">{duplicateWarning.matched_aicte_id}</span>)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Match criterion: <em>{duplicateWarning.match_reason}</em>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveInstitution}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">AICTE Permanent ID *</label>
                  <input
                    id="input-inst-aicte-id"
                    type="text"
                    className="form-input font-mono"
                    value={formData.aicte_id}
                    disabled={!!editingInstitution}
                    onChange={(e) => {
                      const updated = { ...formData, aicte_id: e.target.value };
                      setFormData(updated);
                      runDuplicatePrecheck(updated);
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">AISHE Code</label>
                  <input
                    id="input-inst-aishe-code"
                    type="text"
                    className="form-input font-mono"
                    placeholder="e.g. C-45892"
                    value={formData.aishe_code}
                    onChange={(e) => {
                      const updated = { ...formData, aishe_code: e.target.value };
                      setFormData(updated);
                      runDuplicatePrecheck(updated);
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Institution Legal Name *</label>
                <input
                  id="input-inst-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Delhi Institute of Technology"
                  value={formData.name}
                  onChange={(e) => {
                    const updated = { ...formData, name: e.target.value };
                    setFormData(updated);
                    runDuplicatePrecheck(updated);
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Institution Type *</label>
                  <select
                    id="input-inst-type"
                    className="form-select"
                    value={formData.institution_type}
                    onChange={(e) => setFormData({ ...formData, institution_type: e.target.value })}
                  >
                    {INSTITUTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">AICTE Region *</label>
                  <select
                    id="input-inst-region"
                    className="form-select"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <input
                    id="input-inst-state"
                    type="text"
                    className="form-input"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    id="input-inst-city"
                    type="text"
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input
                    id="input-inst-pincode"
                    type="text"
                    className="form-input"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Campus Postal Address</label>
                <textarea
                  id="input-inst-address"
                  className="form-textarea"
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Contact Official Email</label>
                  <input
                    id="input-inst-email"
                    type="email"
                    className="form-input"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Telephone</label>
                  <input
                    id="input-inst-phone"
                    type="text"
                    className="form-input"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Approval Status *</label>
                  <select
                    id="input-inst-approval-status"
                    className="form-select"
                    value={formData.approval_status}
                    onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                  >
                    {APPROVAL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '28px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px' }}>
                    <input
                      id="input-inst-accredited"
                      type="checkbox"
                      checked={formData.is_accredited}
                      onChange={(e) => setFormData({ ...formData, is_accredited: e.target.checked })}
                    />
                    <span>NBA / NAAC Accredited Institution</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowFormModal(false)}
                >
                  Cancel
                </button>
                <button
                  id="submit-inst-btn"
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting || checkingDuplicate}
                >
                  {formSubmitting ? 'Saving...' : editingInstitution ? 'Update Institution' : 'Register Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CSV DATASET IMPORT MODAL */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '780px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Import Synthetic Institutions CSV Dataset</h3>
              <button className="btn-icon" onClick={() => setShowImportModal(false)}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Upload a synthetic batch CSV file to validate duplicate identifiers and bulk ingest records into PostgreSQL.
            </p>

            {/* Quick Demo Sample Action */}
            <div style={{ background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>Demo Dataset Generator</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Load a pre-configured 4-row synthetic CSV file including 1 intentional duplicate test record.</div>
              </div>
              <button
                id="btn-load-sample-csv"
                className="btn-secondary"
                onClick={handleLoadSampleCSV}
              >
                📄 Load Sample Synthetic CSV
              </button>
            </div>

            {/* File Input */}
            <div className="form-group">
              <label className="form-label">Select CSV File</label>
              <input
                id="input-csv-file"
                type="file"
                accept=".csv"
                className="form-input"
                onChange={handleFileSelect}
              />
              {csvFileName && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
                  Selected: {csvFileName}
                </div>
              )}
            </div>

            {/* Error & Success Messages */}
            {importError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--status-danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '14px',
                  color: '#fca5a5',
                  fontSize: '13px'
                }}
              >
                ⚠️ {importError}
              </div>
            )}

            {importMessage && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid var(--status-success)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '14px',
                  color: '#6ee7b7',
                  fontSize: '13px'
                }}
              >
                ✅ {importMessage}
              </div>
            )}

            {/* Dry Run Preview Summary & Table */}
            {dryRunResult && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL ROWS</div>
                    <div style={{ fontSize: '18px', fontWeight: '800' }}>{dryRunResult.total_rows}</div>
                  </div>
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NEW VALID</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--status-success)' }}>{dryRunResult.imported_count}</div>
                  </div>
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DUPLICATES</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--status-warning)' }}>{dryRunResult.skipped_duplicates_count}</div>
                  </div>
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>INVALID ERRORS</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--status-danger)' }}>{dryRunResult.error_count}</div>
                  </div>
                </div>

                <div className="data-table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Row #</th>
                        <th>AICTE ID</th>
                        <th>Name</th>
                        <th>Validation Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dryRunResult.results.map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.row_number}</td>
                          <td className="font-mono">{r.aicte_id || '—'}</td>
                          <td>{r.name || '—'}</td>
                          <td>
                            {r.status === 'IMPORTED' || r.status === 'VALID_PREVIEW' ? (
                              <span className="badge badge-success">READY TO INGEST</span>
                            ) : r.status === 'DUPLICATE_SKIPPED' ? (
                              <span className="badge badge-warning">DUPLICATE: {r.reason}</span>
                            ) : (
                              <span className="badge badge-danger">INVALID: {r.reason}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowImportModal(false)}
              >
                Close
              </button>

              <button
                id="btn-run-csv-dry-run"
                type="button"
                className="btn-secondary"
                disabled={!csvFile || isValidatingCsv || isImportingCsv}
                onClick={handleRunCsvDryRun}
              >
                {isValidatingCsv ? 'Validating...' : '🧪 Run Dry-Run Precheck'}
              </button>

              <button
                id="btn-commit-csv-import"
                type="button"
                className="btn-primary"
                disabled={!csvFile || isValidatingCsv || isImportingCsv || (dryRunResult && dryRunResult.imported_count === 0)}
                onClick={handleCommitCsvImport}
              >
                {isImportingCsv ? 'Ingesting...' : '🚀 Ingest Valid Records'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
