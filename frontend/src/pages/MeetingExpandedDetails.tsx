import { format } from 'date-fns';
import type { MeetingData } from '../services/api';

export type MeetingDetailTab = 'summary' | 'transcript' | 'participants' | 'recording' | 'tasks';

const DETAIL_TABS: { id: MeetingDetailTab; label: string; icon: string }[] = [
  { id: 'summary', label: 'Summary', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'transcript', label: 'Transcript', icon: 'M4 6h16M4 10h16M4 14h10' },
  { id: 'participants', label: 'Participants', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'recording', label: 'Recording', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { id: 'tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
];

function TabIcon({ path }: { path: string }) {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} /></svg>;
}

function getParticipantName(p: MeetingData['participants'][number]): string {
  return typeof p === 'string' ? p : p.name;
}

export function MeetingExpandedDetails({ meeting, activeTab, setActiveTab }: { meeting: MeetingData; activeTab: MeetingDetailTab; setActiveTab: (tab: MeetingDetailTab) => void }) {
  return (
    <div className="border-t border-slate-100">
      <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/60 px-4">
        {DETAIL_TABS.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${activeTab === tab.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><TabIcon path={tab.icon} />{tab.label}</button>)}
      </div>
      <div className="p-5">
        {activeTab === 'summary' && (meeting.summary ? <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{meeting.summary}</p> : <EmptyDetail icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" text="No AI summary generated for this meeting yet." />)}
        {activeTab === 'transcript' && (meeting.transcript ? <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 max-h-72 overflow-y-auto"><p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide">English Transcription</p><p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">{meeting.transcript}</p></div> : <EmptyDetail icon="M4 6h16M4 10h16M4 14h10" text="No transcript available for this meeting." subtext="Transcription requires recording to be enabled." />)}
        {activeTab === 'participants' && <ParticipantsDetail meeting={meeting} />}
        {activeTab === 'recording' && <RecordingDetail meeting={meeting} />}
        {activeTab === 'tasks' && <TasksDetail meeting={meeting} />}
      </div>
    </div>
  );
}

function ParticipantsDetail({ meeting }: { meeting: MeetingData }) {
  if (!meeting.participants.length) return <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center"><p className="text-sm text-slate-400">No participants recorded.</p></div>;
  return <div className="grid gap-2 sm:grid-cols-2">{meeting.participants.map((p, i) => { const name = getParticipantName(p); const email = typeof p === 'string' ? '' : p.email; const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); return <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{initials}</div><div className="min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{name}</p>{email && <p className="text-xs text-slate-400 truncate">{email}</p>}</div></div>; })}</div>;
}

function RecordingDetail({ meeting }: { meeting: MeetingData }) {
  if (!meeting.recordingUrl) return <EmptyDetail icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" text="No recording available for this meeting." />;
  return <div className="space-y-4"><video src={meeting.recordingUrl} controls className="w-full rounded-xl border border-slate-100 bg-black" /><a href={meeting.recordingUrl} download className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download recording</a></div>;
}

function TasksDetail({ meeting }: { meeting: MeetingData }) {
  if (!meeting.actionItems?.length) return <EmptyDetail icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" text="No action items extracted from this meeting." />;
  return <div className="space-y-2">{meeting.actionItems.map((item, i) => <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"><div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${item.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>{item.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div><div className="flex-1 min-w-0"><p className={`text-sm font-semibold ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.title}</p><div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">{item.assignee && <span>Assignee: {item.assignee}</span>}{item.dueDate && <span>Due: {format(new Date(item.dueDate), 'MMM d, yyyy')}</span>}</div></div></div>)}</div>;
}

function EmptyDetail({ icon, text, subtext }: { icon: string; text: string; subtext?: string }) {
  return <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center"><svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} /></svg><p className="text-sm text-slate-400">{text}</p>{subtext && <p className="text-xs text-slate-300 mt-1">{subtext}</p>}</div>;
}
