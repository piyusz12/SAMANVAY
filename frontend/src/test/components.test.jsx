import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LodgeComplaintView from '../components/LodgeComplaintView';
import ExecutiveOverview from '../components/ExecutiveOverview';
import DeadlinesAlertsView from '../components/DeadlinesAlertsView';
import { api } from '../services/api';

// Mock the API client
vi.mock('../services/api', () => ({
  api: {
    getInstitutions: vi.fn(),
    getBureauOfficers: vi.fn(),
    checkSimilarity: vi.fn(),
    createComplaint: vi.fn(),
    uploadEvidence: vi.fn(),
    getAnalyticsOverview: vi.fn(),
    getNotifications: vi.fn(),
    getUnreadNotificationCount: vi.fn(),
    getAlertConfig: vi.fn(),
    markNotificationRead: vi.fn(),
    runDeadlineScheduler: vi.fn()
  }
}));

describe('Frontend Form Validation & Component Tests (Phase 15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LodgeComplaintView Validation Tests', () => {
    it('renders all mandatory complaint form fields and default values', async () => {
      api.getInstitutions.mockResolvedValue([
        { id: 1, name: 'Delhi Technological University', aicte_id: 'AICTE-DTU-001' }
      ]);
      api.getBureauOfficers.mockResolvedValue([
        { id: 10, full_name: 'Dr. Ramesh Kumar', role: 'CASE_OFFICER' }
      ]);

      render(
        <LodgeComplaintView
          currentUser={{ bureau: 'REGULATION_BUREAU', role: 'BUREAU_ADMIN' }}
          onComplaintCreated={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/Lodge Institution Complaint/i);
      expect(document.getElementById('intake-bureau-select')).toBeInTheDocument();
      expect(document.getElementById('intake-subject-input')).toBeInTheDocument();
      expect(document.getElementById('intake-description-input')).toBeInTheDocument();
      expect(document.getElementById('submit-new-complaint-btn')).toBeInTheDocument();
    });

    it('rejects forbidden file extensions in attachment upload input', async () => {
      api.getInstitutions.mockResolvedValue([]);
      api.getBureauOfficers.mockResolvedValue([]);

      render(
        <LodgeComplaintView
          currentUser={{ bureau: 'PGRC', role: 'OFFICER' }}
          onComplaintCreated={vi.fn()}
        />
      );

      const fileInput = document.getElementById('intake-attachment-input');
      expect(fileInput).toBeInTheDocument();

      const forbiddenFile = new File(['echo malicious'], 'exploit.sh', { type: 'text/x-sh' });
      fireEvent.change(fileInput, { target: { files: [forbiddenFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Permitted file types: PDF, DOCX, XLSX, CSV, PNG, JPG, TXT/i)).toBeInTheDocument();
      });
    });

    it('rejects oversized files exceeding 15MB limit', async () => {
      api.getInstitutions.mockResolvedValue([]);
      api.getBureauOfficers.mockResolvedValue([]);

      render(
        <LodgeComplaintView
          currentUser={{ bureau: 'PGRC', role: 'OFFICER' }}
          onComplaintCreated={vi.fn()}
        />
      );

      const fileInput = document.getElementById('intake-attachment-input');
      const oversizedBlob = new Blob(['x'.repeat(100)]);
      const oversizedFile = new File([oversizedBlob], 'massive.pdf', { type: 'application/pdf' });
      Object.defineProperty(oversizedFile, 'size', { value: 16 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      await waitFor(() => {
        expect(screen.getByText(/File size exceeds the 15 MB maximum limit/i)).toBeInTheDocument();
      });
    });

    it('validates mandatory fields on submit and triggers alert if empty', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      api.getInstitutions.mockResolvedValue([]);
      api.getBureauOfficers.mockResolvedValue([]);

      const { container } = render(
        <LodgeComplaintView
          currentUser={{ bureau: 'PGRC', role: 'OFFICER' }}
          onComplaintCreated={vi.fn()}
        />
      );

      const form = container.querySelector('form');
      fireEvent.submit(form);

      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining('Please fill all mandatory fields')
      );
      alertMock.mockRestore();
    });

    it('successfully submits valid complaint payload and invokes callback', async () => {
      const mockCreated = { id: 101, complaint_no: 'AICTE/PGRC/2026/00101' };
      api.getInstitutions.mockResolvedValue([
        { id: 1, name: 'Delhi Technological University', aicte_id: 'AICTE-DTU-001' }
      ]);
      api.getBureauOfficers.mockResolvedValue([]);
      api.createComplaint.mockResolvedValue(mockCreated);

      const onCreatedMock = vi.fn();

      const { container } = render(
        <LodgeComplaintView
          currentUser={{ bureau: 'PGRC', role: 'OFFICER' }}
          onComplaintCreated={onCreatedMock}
        />
      );

      await waitFor(() => {
        expect(api.getInstitutions).toHaveBeenCalled();
      });

      // Fill mandatory inputs
      const subjectInput = document.getElementById('intake-subject-input');
      const descInput = document.getElementById('intake-description-input');

      fireEvent.change(subjectInput, {
        target: { value: 'Capitation Fee Demanded for M.Tech Admissions' }
      });
      fireEvent.change(descInput, {
        target: { value: 'Dean demanded Rs 2.5 Lakhs unreceipted cash capitation fee before issuing admit card.' }
      });

      const form = container.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(api.createComplaint).toHaveBeenCalledWith(
          expect.objectContaining({
            institution_id: 1,
            subject: 'Capitation Fee Demanded for M.Tech Admissions',
            bureau: 'PGRC'
          })
        );
        expect(onCreatedMock).toHaveBeenCalledWith(mockCreated);
      });
    });
  });

  describe('ExecutiveOverview Component Rendering', () => {
    it('renders metric cards with loaded counts without crashing', async () => {
      const mockOverview = {
        total_complaints_received: 42,
        open_pending_complaints: 12,
        complaints_under_process: 18,
        disposed_complaints: 10,
        transferred_complaints: 2,
        overdue_complaints: 4,
        critical_overlapping_institutions: 1,
        bureau_workload: [],
        monthly_trends: []
      };

      render(
        <ExecutiveOverview
          overview={mockOverview}
          currentUser={{ bureau: 'CENTRAL_ADMIN', role: 'SUPER_ADMIN' }}
          onSelectTab={vi.fn()}
        />
      );

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('DeadlinesAlertsView Component', () => {
    it('renders deadline monitoring header and notifications list', async () => {
      api.getNotifications.mockResolvedValue([
        {
          id: 501,
          complaint_id: 201,
          complaint_no: 'AICTE/RB/2026/00201',
          institution_name: 'Apex Institute of Technology',
          alert_type: 'ESCALATION_TRIGGERED',
          severity: 'CRITICAL',
          title: 'Regulatory SLA Breached: AICTE/RB/2026/00201',
          message: 'Case overdue by 7 days. Escalated to Bureau Head.',
          is_read: false,
          created_at: '2026-10-27T10:00:00Z',
          delivery_attempts_count: 1
        }
      ]);
      api.getUnreadNotificationCount.mockResolvedValue({ unread_count: 1 });
      api.getAlertConfig.mockResolvedValue({
        escalation_reminder_interval_days: 7,
        unresolved_overlap_review_days: 14,
        coordination_task_reminder_days: 5
      });

      render(
        <DeadlinesAlertsView
          currentUser={{ bureau: 'REGULATION_BUREAU', role: 'BUREAU_ADMIN' }}
          onSelectComplaint={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/Deadlines, Alert Engine/i);
        expect(screen.getByText(/Regulatory SLA Breached: AICTE\/RB\/2026\/00201/i)).toBeInTheDocument();
      });
    });
  });
});
