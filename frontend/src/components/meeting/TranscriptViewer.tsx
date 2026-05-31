import { useState, useMemo } from 'react';
import { useMeetingStore } from '../../stores/meetingStore';

/**
 * TranscriptViewer - Displays meeting transcript with speaker info and timestamps
 * Features:
 * - Structured display with speaker avatars and timestamps
 * - Dark mode styling consistent with meeting room
 * - Search functionality with highlighting
 * - Download transcript
 */

interface TranscriptEntry {
  timestamp: string;
  speaker: string;
  message: string;
}

function getSpeakerColor(name: string): string {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-teal-500', 'bg-pink-500',
    'bg-blue-500', 'bg-orange-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function parseTranscript(text: string): TranscriptEntry[] {
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map(line => {
    // Try format: [HH:MM:SS] Speaker: message
    const timestampMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.+?):\s*(.+)$/);
    if (timestampMatch) {
      return { timestamp: timestampMatch[1], speaker: timestampMatch[2].trim(), message: timestampMatch[3].trim() };
    }
    // Try format: Speaker: message (no timestamp)
    const speakerMatch = line.match(/^(.+?):\s*(.+)$/);
    if (speakerMatch) {
      return { timestamp: '', speaker: speakerMatch[1].trim(), message: speakerMatch[2].trim() };
    }
    // Fallback: just text
    return { timestamp: '', speaker: '', message: line.trim() };
  });
}

export function TranscriptViewer() {
  const { transcript } = useMeetingStore();
  const [searchQuery, setSearchQuery] = useState('');

  const entries = useMemo(() => {
    if (!transcript) return [];
    return parseTranscript(transcript);
  }, [transcript]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(e =>
      e.speaker.toLowerCase().includes(query) ||
      e.message.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  if (!transcript) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-xs">No transcript available</p>
          <p className="text-[10px] text-slate-600 mt-1">Transcript will appear here once the meeting has conversation.</p>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `transcript-${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const highlightMatch = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-amber-400/30 text-amber-200 rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-sm">Meeting Transcript</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{entries.length} entries</p>
          </div>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg transition border border-slate-700/40"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800/40 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/30"
          />
        </div>
      </div>

      {/* Transcript Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredEntries.map((entry, idx) => (
          <div
            key={idx}
            className="flex gap-3 rounded-xl bg-slate-900/40 border border-slate-800/30 px-4 py-3 hover:bg-slate-800/30 transition-colors group"
          >
            {/* Speaker Avatar */}
            {entry.speaker && (
              <div className={`w-7 h-7 shrink-0 rounded-full ${getSpeakerColor(entry.speaker)} flex items-center justify-center text-[10px] font-bold text-white mt-0.5`}>
                {getInitials(entry.speaker)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {entry.speaker && (
                  <span className="text-xs font-semibold text-slate-200">{highlightMatch(entry.speaker)}</span>
                )}
                {entry.timestamp && (
                  <span className="text-[10px] text-slate-600 font-mono">{entry.timestamp}</span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed break-words">
                {highlightMatch(entry.message)}
              </p>
            </div>
          </div>
        ))}

        {filteredEntries.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <p className="text-xs text-slate-500">No matches found for "{searchQuery}"</p>
          </div>
        )}

        {filteredEntries.length !== entries.length && filteredEntries.length > 0 && (
          <div className="text-center py-2">
            <p className="text-[10px] text-slate-600">
              Showing {filteredEntries.length} of {entries.length} entries
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranscriptViewer;
