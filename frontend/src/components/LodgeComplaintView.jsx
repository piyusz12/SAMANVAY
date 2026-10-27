import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function LodgeComplaintView({
  onComplaintCreated,
  currentUser
}) {
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState('');
  const [bureau, setBureau] = useState(
    currentUser?.bureau && currentUser?.bureau !== 'CENTRAL_ADMIN'
      ? currentUser.bureau
      : 'PGRC'
  );
  const [complainantName, setComplainantName] = useState('');
  const [complainantCategory, setComplainantCategory] = useState('STUDENT');
  const [complainantEmail, setComplainantEmail] = useState('');
  const [category, setCategory] = useState('FEE_EXTORTION');
  const [priority, setPriority] = useState('MEDIUM');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slaDays, setSlaDays] = useState(30);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Officer Assignment & Permitted Attachments
  const [officers, setOfficers] = useState([]);
  const [assignedOfficerId, setAssignedOfficerId] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preCheckMatches, setPreCheckMatches] = useState([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Load registered institutions
  useEffect(() => {
    api.getInstitutions()
      .then((data) => {
        setInstitutions(data);
        if (data.length > 0) setInstitutionId(data[0].id);
      })
      .catch((err) => console.error(err));
  }, []);

  // Load eligible officers whenever bureau changes
  useEffect(() => {
    if (bureau) {
      api.getBureauOfficers(bureau)
        .then((data) => {
          setOfficers(data || []);
        })
        .catch(() => setOfficers([]));
    }
  }, [bureau]);

  // Run duplicate pre-check debounce when subject & description are typed
  useEffect(() => {
    if (!institutionId || subject.length < 5) {
      setPreCheckMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicates(true);
        const res = await api.checkSimilarity({
          institution_id: Number(institutionId),
          subject,
          description: description || subject,
          category
        });
        setPreCheckMatches(res.matches.filter((m) => m.similarity_score >= 0.5));
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [institutionId, subject, description, category]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setAttachmentError('');
    if (!file) {
      setAttachment(null);
      return;
    }

    const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.txt'];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isAllowed) {
      setAttachmentError('Permitted file types: PDF, DOCX, XLSX, CSV, PNG, JPG, TXT.');
      setAttachment(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setAttachmentError('File size exceeds the 15 MB maximum limit.');
      setAttachment(null);
      return;
    }

    setAttachment(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!institutionId || !subject || !description) {
      alert('Please fill all mandatory fields (Institution, Subject Title, and Narrative Description).');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        institution_id: Number(institutionId),
        bureau,
        complainant_name: complainantName || 'Anonymous Complainant',
        complainant_category: complainantCategory,
        complainant_email: complainantEmail || null,
        subject,
        description,
        category,
        priority,
        received_date: receivedDate ? new Date(receivedDate).toISOString() : new Date().toISOString(),
        sla_deadline_days: Number(slaDays) || 30,
        assigned_officer_id: assignedOfficerId ? Number(assignedOfficerId) : null,
        internal_notes: internalNotes || null
      };

      const newCase = await api.createComplaint(payload);

      // Upload attachment if provided
      if (attachment && newCase?.id) {
        try {
          await api.uploadEvidence(newCase.id, attachment);
        } catch (uploadErr) {
          console.warn('Evidence upload failed:', uploadErr);
        }
      }

      alert(`Grievance successfully registered with Unique Case Reference: ${newCase.complaint_no}`);
      
      // Reset form
      setSubject('');
      setDescription('');
      setInternalNotes('');
      setAttachment(null);
      setPreCheckMatches([]);
      if (onComplaintCreated) onComplaintCreated(newCase);
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Lodge Institution Complaint & Intake Scrutiny</h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
          Register incoming technical education grievance with automated unique case numbering, multi-bureau collision detection, and initial assignment.
        </p>
      </div>

      {/* Pre-Submission Similarity Warning Banner */}
      {preCheckMatches.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 27, 56, 0.95) 100%)',
            border: '1px solid var(--status-warning)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h4 style={{ fontSize: '15px', color: '#fbbf24', fontWeight: '700' }}>
              Potential Duplicate / Overlap Detected ({preCheckMatches.length} existing cases)
            </h4>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Existing complaints on file for this institution appear semantically similar. Review before lodging to avoid parallel inquiries:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {preCheckMatches.map((m) => (
              <div
                key={m.complaint_id}
                style={{
                  background: 'var(--bg-subtle)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong className="font-mono" style={{ color: 'var(--accent-blue)' }}>{m.complaint_no}</strong> ({m.bureau.replace('_', ' ')}) • {m.subject}
                </div>
                <span className="badge badge-warning">
                  {Math.round(m.similarity_score * 100)}% Match
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intake Form Card */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Target Institution */}
          <div className="form-group">
            <label className="form-label">Target Technical Institution (AICTE Permanent ID) *</label>
            <select
              id="intake-institution-select"
              className="form-select"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              required
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.aicte_id} — {inst.name} ({inst.city}, {inst.state})
                </option>
              ))}
            </select>
          </div>

          {/* Bureau & Grievance Category */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Originating AICTE Bureau / Intake Cell *</label>
              <select
                id="intake-bureau-select"
                className="form-select"
                value={bureau}
                onChange={(e) => setBureau(e.target.value)}
                required
              >
                <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                <option value="REGULATION_BUREAU">Regulation Bureau (RB)</option>
                <option value="APPROVAL_BUREAU">Approval Bureau (AB)</option>
                <option value="LEGAL_CELL">Legal Cell (LC)</option>
                <option value="VIGILANCE_CELL">Vigilance Cell (VC)</option>
                <option value="POLICY_BUREAU">Policy & Academic Planning Bureau</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Grievance Category *</label>
              <select
                id="intake-category-select"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="FEE_EXTORTION">Fee Extortion / Certificate Withheld</option>
                <option value="FACULTY_SALARY_WITHHELD">Faculty 7th CPC Salary Delay / Deduction</option>
                <option value="INFRASTRUCTURE_DEFICIT">Infrastructure Deficit / Lab Equipment</option>
                <option value="UNAPPROVED_COURSES">Unapproved Courses / Unsanctioned Intake</option>
                <option value="HARASSMENT">Harassment / Grievance Redressal Failure</option>
                <option value="ADMISSION_FRAUD">Capitation Fee / Admission Irregularity</option>
                <option value="FAKE_DEGREES_DOCUMENTS">Fake Faculty / Document Forgery</option>
                <option value="RECOGNITION_DISPUTE">Legal / Land Title / Recognition Dispute</option>
              </select>
            </div>
          </div>

          {/* Dates & SLA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Grievance Received Date *</label>
              <input
                id="intake-received-date"
                type="date"
                className="form-input"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">SLA Target Resolution (Days) *</label>
              <input
                id="intake-sla-days"
                type="number"
                min="1"
                max="180"
                className="form-input"
                value={slaDays}
                onChange={(e) => setSlaDays(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority Level *</label>
              <select
                id="intake-priority-select"
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL (Immediate Council Attention)</option>
              </select>
            </div>
          </div>

          {/* Complainant Particulars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Complainant / Stakeholder Name</label>
              <input
                id="intake-complainant-name"
                type="text"
                className="form-input"
                placeholder="e.g. Dr. Rajesh Kumar"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Complainant Category</label>
              <select
                id="intake-complainant-cat"
                className="form-select"
                value={complainantCategory}
                onChange={(e) => setComplainantCategory(e.target.value)}
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty Member</option>
                <option value="PARENT">Parent / Guardian</option>
                <option value="ALUMNI">Alumni</option>
                <option value="CITIZEN">Citizen / Stakeholder</option>
                <option value="ANONYMOUS">Anonymous / Whistleblower</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Complainant Email (Confidential)</label>
              <input
                id="intake-complainant-email"
                type="email"
                className="form-input"
                placeholder="complainant@example.com"
                value={complainantEmail}
                onChange={(e) => setComplainantEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Officer Assignment */}
          <div className="form-group">
            <label className="form-label">Initial Responsible Desk Officer (Optional)</label>
            <select
              id="intake-officer-select"
              className="form-select"
              value={assignedOfficerId}
              onChange={(e) => setAssignedOfficerId(e.target.value)}
            >
              <option value="">-- Leave Unassigned (Intake Queue) --</option>
              {officers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.full_name} ({off.designation || off.role}) — {off.bureau}
                </option>
              ))}
            </select>
            <small style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
              Only active officers authorized for {bureau.replace('_', ' ')} are shown. Bureau Administrators can assign or reassign cases at any stage.
            </small>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label className="form-label">Grievance Subject Title *</label>
            <input
              id="intake-subject-input"
              type="text"
              className="form-input"
              placeholder="e.g. Unlawful retention of original degree certificates for capitation fee clearance"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Full Narrative Description & Specific Allegations *</label>
            <textarea
              id="intake-description-input"
              className="form-textarea"
              rows="5"
              placeholder="Provide complete facts, dates, academic departments involved, and regulatory violations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          {/* Permitted Attachments */}
          <div className="form-group">
            <label className="form-label">Supporting Evidence / Permitted Attachments (PDF, DOCX, XLSX, CSV, PNG, JPG, TXT max 15MB)</label>
            <input
              id="intake-attachment-input"
              type="file"
              className="form-input"
              accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
              onChange={handleFileChange}
            />
            {attachment && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--accent-blue)' }}>
                Selected: <strong>{attachment.name}</strong> ({(attachment.size / 1024).toFixed(1)} KB)
              </div>
            )}
            {attachmentError && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--status-danger)' }}>
                ⚠️ {attachmentError}
              </div>
            )}
          </div>

          {/* Internal Scrutiny Notes */}
          <div className="form-group">
            <label className="form-label">Internal Scrutiny Notes (Confidential)</label>
            <input
              id="intake-notes-input"
              type="text"
              className="form-input"
              placeholder="e.g. Urgent show-cause recommendation forwarded to Advisor."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              id="submit-new-complaint-btn"
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering Grievance...' : 'Lodge Complaint & Initiate Tracking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
