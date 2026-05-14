import { useState } from 'react';
import { useMeetingStore } from '../../stores/meetingStore';

/**
 * TranscriptViewer - Displays meeting transcript with speaker info and timestamps
 * Features:
 * - Full transcript with timestamps
 * - Speaker identification
 * - Search functionality
 * - Download transcript
 */
export function TranscriptViewer() {
  const { transcript } = useMeetingStore();
  const [searchQuery, setSearchQuery] = useState('');

  if (!transcript) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p>No transcript available</p>
        </div>
      </div>
    );
  }

  // Filter transcript based on search query
  const filteredTranscript = transcript
    .split('\n')
    .filter((line) =>
      line.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .join('\n') || transcript;

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([filteredTranscript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `transcript-${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Meeting Transcript</h3>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Transcript Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
        <div className="space-y-4 max-w-4xl">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
              {filteredTranscript}
            </div>
          </div>

          {filteredTranscript !== transcript && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500">
                Showing {filteredTranscript.split('\n').length} of{' '}
                {transcript.split('\n').length} lines
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TranscriptViewer;
