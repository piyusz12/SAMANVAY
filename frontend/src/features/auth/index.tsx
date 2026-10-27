'use client';

import React, { useState } from 'react';
import { useAppStore, UserPersona } from '../../shared/lib/store';
import { DEMO_PERSONAS } from '../../shared/config/constants';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { Badge } from '../../shared/ui/Badge';
import { apiClient } from '../../shared/api/api-client';
import { LogIn, UserCheck, ShieldCheck } from 'lucide-react';

export const PersonaSwitcherModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, setCurrentUser, setToken } = useAppStore();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const handleSelectPersona = async (persona: UserPersona) => {
    setLoadingEmail(persona.email);
    try {
      // Call backend auth to retrieve real JWT token for this persona
      const res = await apiClient.post<{ access_token: string }>('/api/v1/auth/login', {
        email: persona.email,
        password: 'Demo@AICTE2026!',
      });
      if (res?.access_token) {
        setToken(res.access_token);
      }
    } catch {
      // Offline fallback: set persona directly in client store
      setToken('mock-jwt-token-dev');
    } finally {
      setCurrentUser(persona);
      setLoadingEmail(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Switch Operational Persona & Bureau"
      description="Select an AICTE officer identity to test role-based access control, bureau boundaries, and approval delegations."
      size="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {DEMO_PERSONAS.map((p) => {
          const isCurrent = currentUser.email === p.email;
          return (
            <button
              key={p.email}
              onClick={() => handleSelectPersona(p)}
              disabled={loadingEmail !== null}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                isCurrent
                  ? 'border-blue-500 bg-blue-950/40 shadow-md ring-1 ring-blue-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{p.avatar}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {p.name}
                      {isCurrent && <UserCheck className="h-4 w-4 text-blue-400" />}
                    </h4>
                    <p className="text-[11px] text-slate-400">{p.designation}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <Badge variant={p.role === 'SUPER_ADMIN' ? 'purple' : p.role === 'AUDITOR' ? 'amber' : 'blue'} size="sm">
                  {p.role}
                </Badge>
                <span className="text-[11px] text-slate-400 font-mono">{p.bureau}</span>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
