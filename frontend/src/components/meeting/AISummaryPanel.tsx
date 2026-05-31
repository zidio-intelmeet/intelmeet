import { useState, useMemo } from 'react';
import { useMeetingStore } from '../../stores/meetingStore';

/**
 * AISummaryPanel - Displays AI-generated meeting summary and highlights
 * Parses decisions from the summary text instead of showing hardcoded placeholders.
 */
export function AISummaryPanel() {
  const { summary, actionItems } = useMeetingStore();
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    decisions: true,
    actionItems: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Parse decisions from the summary text
  const parsedDecisions = useMemo(() => {
    if (!summary) return [];
    const decisionsMatch = summary.match(/### Decisions Made\n([\s\S]*?)(?=\n###|$)/);
    if (!decisionsMatch) return [];
    return decisionsMatch[1]
      .split('\n')
      .map((line: string) => line.replace(/^-\s*/, '').trim())
      .filter((line: string) => line.length > 0 && line !== 'No decisions were made.' && line !== 'No specific decisions were identified from the conversation.');
  }, [summary]);

  if (!summary) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs">No AI summary or notes available yet.</p>
          <p className="text-[10px] text-slate-600 mt-1">Send some messages or notes in the chat, then click refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Section */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/40 overflow-hidden shadow-sm hover:border-slate-800/80 transition-all">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-white text-xs">Meeting Notes</h3>
              <p className="text-[10px] text-slate-400">AI-generated summary</p>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedSections.summary ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.summary && (
          <div className="px-5 py-4 bg-slate-950/40 border-t border-slate-800/40">
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
              {summary}
            </p>
          </div>
        )}
      </div>

      {/* Decisions Section */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/40 overflow-hidden shadow-sm hover:border-slate-800/80 transition-all">
        <button
          onClick={() => toggleSection('decisions')}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-white text-xs">Decisions</h3>
              <p className="text-[10px] text-slate-400">
                {parsedDecisions.length > 0 ? `${parsedDecisions.length} decision${parsedDecisions.length > 1 ? 's' : ''} identified` : 'Extracted key points'}
              </p>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedSections.decisions ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.decisions && (
          <div className="px-5 py-4 bg-slate-950/40 border-t border-slate-800/40">
            {parsedDecisions.length > 0 ? (
              <ul className="space-y-2 text-xs text-slate-300">
                {parsedDecisions.map((decision, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">No specific decisions were identified from the meeting yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Action Items Section */}
      {actionItems && actionItems.length > 0 && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/40 overflow-hidden shadow-sm hover:border-slate-800/80 transition-all">
          <button
            onClick={() => toggleSection('actionItems')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-white text-xs">Action Items</h3>
                <p className="text-[10px] text-slate-400">{actionItems.length} items identified</p>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedSections.actionItems ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.actionItems && (
            <div className="px-5 py-4 bg-slate-950/40 border-t border-slate-800/40">
              <ul className="space-y-2.5">
                {actionItems.map((item, idx) => (
                  <li key={idx} className="flex gap-2.5 text-xs text-slate-300 items-start">
                    <span className="text-amber-400 font-bold">→</span>
                    <span>{item.title || item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AISummaryPanel;
