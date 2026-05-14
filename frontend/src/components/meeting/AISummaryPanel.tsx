import { useState } from 'react';
import { useMeetingStore } from '../../stores/meetingStore';

/**
 * AISummaryPanel - Displays AI-generated meeting summary and highlights
 * Features:
 * - Meeting summary
 * - Key discussion points
 * - Decisions made
 * - Next steps/action items
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

  if (!summary) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No summary available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Section */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">Meeting Summary</h3>
              <p className="text-sm text-slate-500">AI-generated overview</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform ${expandedSections.summary ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {expandedSections.summary && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
              {summary}
            </div>
          </div>
        )}
      </div>

      {/* Decisions Section */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('decisions')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">Key Decisions</h3>
              <p className="text-sm text-slate-500">Extracted from discussion</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform ${expandedSections.decisions ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {expandedSections.decisions && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <ul className="space-y-2 text-slate-700">
              <li className="flex gap-3">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Summary parsing in progress...</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Action Items Section */}
      {actionItems && actionItems.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('actionItems')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">Action Items</h3>
                <p className="text-sm text-slate-500">{actionItems.length} items</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-slate-500 transition-transform ${expandedSections.actionItems ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {expandedSections.actionItems && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <ul className="space-y-2">
                {actionItems.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-slate-700">
                    <span className="text-orange-600 font-bold">→</span>
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
