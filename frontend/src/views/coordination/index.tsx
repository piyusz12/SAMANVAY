'use client';

import React, { useState } from 'react';
import { useWorkspaces, FollowUpTask } from '../../entities/coordination';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Modal } from '../../shared/ui/Modal';
import { Input, Select } from '../../shared/ui/FormControls';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import { Users2, PlusCircle, CheckCircle2, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../shared/lib/date-utils';

export const CoordinationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: workspaces = [], isLoading, isError, refetch } = useWorkspaces();
  const [activeWorkspaceModal, setActiveWorkspaceModal] = useState<any | null>(null);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskBureau, setTaskBureau] = useState('APPROVAL_BUREAU');
  const [taskDeadline, setTaskDeadline] = useState('2026-11-15');

  const addTaskMutation = useMutation({
    mutationFn: async () => {
      const linkageId = activeWorkspaceModal.linkage_id || activeWorkspaceModal.id;
      return await apiClient.post(`/api/v1/coordination/workspaces/${linkageId}/tasks`, {
        title: taskTitle.trim(),
        target_bureau: taskBureau,
        deadline: new Date(taskDeadline).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordination-workspaces'] });
      setTaskTitle('');
      setActiveWorkspaceModal(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl font-extrabold text-white font-heading">
            Inter-Bureau Coordination Workspaces
          </h2>
          <p className="text-xs text-slate-400">
            Collaborative inquiry management. Joint decision workflows, designated lead bureau custody, and synchronized follow-up task tracking.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading coordination workspaces...</div>
        ) : isError ? (
          <Card className="p-8 text-center bg-slate-900/60 border-rose-500/30">
            <p className="text-sm text-rose-400 font-semibold mb-2">Unable to load coordination workspaces</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </Card>
        ) : workspaces.length === 0 ? (
          <Card className="p-10 text-center bg-slate-900/60">
            <Users2 className="h-10 w-10 text-blue-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">No Active Joint Workspaces</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Workspaces are automatically initiated when cross-bureau overlaps are confirmed by investigating case officers.
            </p>
          </Card>
        ) : (
          workspaces.map((ws) => (
            <Card key={ws.linkage_id || ws.id} className="border-blue-500/30 bg-slate-900/60 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white font-heading">
                      {ws.institution_name || 'Institution not recorded'}
                    </span>
                    <Badge variant="blue" size="sm">
                      Lead: {ws.lead_bureau || ws.source_bureau}
                    </Badge>
                    <Badge variant="purple" size="sm">
                      Decision: {ws.coordination_decision || 'UNDER_REVIEW'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {ws.coordination_notes || `Joint inquiry linking ${ws.source_bureau} and ${ws.target_bureau}.`}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveWorkspaceModal(ws)}
                  leftIcon={<PlusCircle className="h-3.5 w-3.5 text-blue-400" />}
                >
                  Assign Action Task
                </Button>
              </div>

              {/* Tasks Checklist */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Coordinated Action Plan Tasks ({ws.tasks?.length || ws.outstanding_tasks_count || 0}):
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(ws.tasks || []).map((t: FollowUpTask) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`h-4 w-4 ${
                              t.status === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          />
                          <span className="text-xs font-semibold text-white">{t.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>Bureau: {t.target_bureau || 'Assigned'}</span>
                          <span>•</span>
                          <span>Deadline: {formatDate(t.deadline)}</span>
                        </div>
                      </div>
                      <Badge variant={t.status === 'COMPLETED' ? 'emerald' : 'amber'} size="sm">
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {activeWorkspaceModal && (
        <Modal
          isOpen={true}
          onClose={() => setActiveWorkspaceModal(null)}
          title="Dispatch Joint Follow-Up Task"
          description={`Add a coordinated task for ${activeWorkspaceModal.institution_name}`}
          size="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTaskMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <Input
              label="Action Task Title *"
              placeholder="e.g. Conduct joint physical inspection of labs and cadre ratios"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Assignee Bureau *"
                value={taskBureau}
                onChange={(e) => setTaskBureau(e.target.value)}
              >
                <option value="APPROVAL_BUREAU">Approval Bureau</option>
                <option value="PGRC">Public Grievance Cell</option>
                <option value="REGULATION_BUREAU">Regulation Bureau</option>
                <option value="LEGAL_CELL">Legal Cell</option>
                <option value="VIGILANCE_CELL">Vigilance Cell</option>
              </Select>

              <Input
                label="Action Deadline *"
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setActiveWorkspaceModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={addTaskMutation.isPending}>
                Dispatch Task
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
