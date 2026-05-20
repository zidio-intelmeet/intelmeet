import type { Dispatch, FormEvent, SetStateAction } from 'react';

type OpenMenu = 'type' | 'duration' | null;

type Props = {
  title: string;
  setTitle: (value: string) => void;
  meetingType: string;
  setMeetingType: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  scheduledAt: string;
  setScheduledAt: (value: string) => void;
  participants: string;
  setParticipants: (value: string) => void;
  agenda: string;
  setAgenda: (value: string) => void;
  recordMeeting: boolean;
  setRecordMeeting: (value: boolean) => void;
  openMenu: OpenMenu;
  setOpenMenu: Dispatch<SetStateAction<OpenMenu>>;
  creating: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function NewMeetingDrawer({
  title,
  setTitle,
  meetingType,
  setMeetingType,
  duration,
  setDuration,
  scheduledAt,
  setScheduledAt,
  participants,
  setParticipants,
  agenda,
  setAgenda,
  recordMeeting,
  setRecordMeeting,
  openMenu,
  setOpenMenu,
  creating,
  error,
  onSubmit,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-100 flex justify-end bg-slate-950/25" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-emerald-100 bg-white p-6 shadow-2xl shadow-emerald-950/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-emerald-100 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">New Meeting</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Meeting details</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-lg font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700" aria-label="Close">×</button>
        </div>
        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Team standup" className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MeetingPicker label="Type" value={meetingType} open={openMenu === 'type'} onToggle={() => setOpenMenu((m) => m === 'type' ? null : 'type')} onClose={() => setOpenMenu(null)} options={['Instant', 'Scheduled', 'Team Sync', 'Client Meeting']} onSelect={setMeetingType} />
            <MeetingPicker label="Duration" value={duration} open={openMenu === 'duration'} onToggle={() => setOpenMenu((m) => m === 'duration' ? null : 'duration')} onClose={() => setOpenMenu(null)} options={['15 minutes', '30 minutes', '45 minutes', '60 minutes']} onSelect={setDuration} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Schedule (optional)</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Participants</label>
            <input value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="teammate@company.com, client@company.com" className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Agenda</label>
            <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={4} placeholder="Add topics, goals, or preparation notes" className="w-full resize-none rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-emerald-100" />
          </div>
          <label className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <span><span className="block text-sm font-semibold text-slate-800">Record meeting</span><span className="block text-xs font-medium text-slate-500">Store recording status with this meeting.</span></span>
            <input type="checkbox" checked={recordMeeting} onChange={(e) => setRecordMeeting(e.target.checked)} className="h-5 w-5 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500" />
          </label>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={creating} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60">{creating ? 'Creating...' : 'Create'}</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function MeetingPicker({ label, value, open, options, onToggle, onClose, onSelect }: { label: string; value: string; open: boolean; options: string[]; onToggle: () => void; onClose: () => void; onSelect: (value: string) => void }) {
  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition hover:border-emerald-300"><span>{value}</span><span className="text-slate-400">⌄</span></button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-emerald-50 pb-2"><h3 className="text-sm font-bold text-slate-900">{label}</h3><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 hover:bg-emerald-50">×</button></div>
          <div className="mt-2 space-y-0.5">
            {options.map((option) => <button key={option} type="button" onClick={() => { onSelect(option); onClose(); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50"><span>{option}</span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${value === option ? 'border-emerald-600' : 'border-slate-300'}`}>{value === option && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}</span></button>)}
          </div>
        </div>
      )}
    </div>
  );
}
