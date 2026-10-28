'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../shared/lib/store';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Shield,
  FileText,
  Clock,
  ExternalLink,
  Bot,
  User,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  actions?: { label: string; tab?: string; modal?: string }[];
}

export const AicteSahayakWidget: React.FC<{
  onOpenLodge: () => void;
}> = ({ onOpenLodge }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: 'Namaste! 🙏 I am AICTE Sahayak, your automated regulatory guidance assistant. How may I help you today?',
      actions: [
        { label: 'Track Existing Complaint', tab: 'track' },
        { label: 'Can college withhold my certificates?', tab: 'charter' },
        { label: 'What is the fee refund policy?', tab: 'circulars' },
        { label: 'Lodge New Grievance', modal: 'lodge' },
      ],
    },
  ]);

  const quickResponses: Record<string, { answer: string; actions?: any[] }> = {
    certificate: {
      answer:
        'Under AICTE Gazette Notification No. 14-4/NC/2020, institutions are strictly forbidden from retaining original educational certificates (10th/12th/B.Tech/diploma) under any circumstances, even if fees are disputed. You may lodge a formal grievance under PGRC for immediate intervention.',
      actions: [{ label: 'Lodge Fee/Certificate Complaint', modal: 'lodge' }],
    },
    refund: {
      answer:
        'Under AICTE Citizen’s Charter & AY 2026-27 refund norms, if you withdraw before the session starts, 100% of fees must be refunded within 15 days with maximum deduction of Rs 1,000/-. If the college refuses, AICTE issues punitive show-cause notices.',
      actions: [{ label: 'View Refund Circular', tab: 'circulars' }],
    },
    track: {
      answer:
        'You can track any grievance in real time on the Track Grievance portal using your tracking ID (e.g., AICTE/PGRC/2026/0001). Cases have a mandatory 30-day statutory resolution limit.',
      actions: [{ label: 'Go to Tracking Page', tab: 'track' }],
    },
    ragging: {
      answer:
        'AICTE operates a Zero-Tolerance policy against ragging. Emergency inquiries commence within 24 hours. Call the National Anti-Ragging 24x7 Helpline at 1800-180-5522 or lodge an emergency complaint immediately.',
      actions: [{ label: 'Lodge Emergency Complaint', modal: 'lodge' }],
    },
    anonymous: {
      answer:
        'YES! Under Section 12 Whistleblower Protection, SAMANVAY allows confidential complaint lodging. Your name and contact details are encrypted and hidden from the respondent institution.',
      actions: [{ label: 'Lodge Confidential Grievance', modal: 'lodge' }],
    },
  };

  const handleSend = (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Determine bot reply
    setTimeout(() => {
      const lower = userText.toLowerCase();
      let matched = quickResponses.track;

      if (lower.includes('cert') || lower.includes('degree') || lower.includes('withhold')) {
        matched = quickResponses.certificate;
      } else if (lower.includes('refund') || lower.includes('fee') || lower.includes('money')) {
        matched = quickResponses.refund;
      } else if (lower.includes('ragging') || lower.includes('harass') || lower.includes('emergency')) {
        matched = quickResponses.ragging;
      } else if (lower.includes('anon') || lower.includes('confidential') || lower.includes('secret')) {
        matched = quickResponses.anonymous;
      }

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: matched.answer,
        actions: matched.actions,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  const handleActionClick = (action: { label: string; tab?: string; modal?: string }) => {
    if (action.tab) {
      setActiveTab(action.tab as any);
      setIsOpen(false);
    } else if (action.modal === 'lodge') {
      onOpenLodge();
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-2xl shadow-blue-500/40 border border-blue-400/40 flex items-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer font-semibold text-xs sm:text-sm"
        aria-label="Open AICTE Sahayak Helpdesk"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
        </span>
        <Sparkles className="h-4 w-4" />
        <span>AICTE Sahayak (24x7)</span>
      </button>

      {/* Slide-over Chat Box */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-[94vw] sm:w-96 max-h-[560px] h-[520px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-2xl">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-900/80 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-base">
                🤖
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  AICTE Sahayak
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-mono">
                    ONLINE
                  </span>
                </h4>
                <p className="text-[10px] text-slate-300">National Redressal & Guidance AI</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="h-6 w-6 rounded-md bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 text-xs">
                    🤖
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[82%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Action chips if any */}
                  {m.actions && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                      {m.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(act)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-700/80 rounded-lg text-[10px] font-semibold text-blue-300 transition-colors cursor-pointer"
                        >
                          {act.label} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about fee refunds, tracking, or rules..."
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
