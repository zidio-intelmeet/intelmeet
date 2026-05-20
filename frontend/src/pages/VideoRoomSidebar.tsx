import logo from '../assets/logowobg.png';
import { workspaceShortcuts } from './videoRoomHelpers';

export function VideoRoomSidebar({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <aside className="flex w-16 shrink-0 flex-col items-center gap-5 border-r border-slate-200 bg-white py-4">
      <button
        type="button"
        title="Dashboard"
        aria-label="Dashboard"
        onClick={() => onNavigate('/workspace')}
        className="rounded-xl p-1 transition hover:bg-slate-100"
      >
        <img src={logo} alt="IntellMeet" className="h-9 w-9 object-contain grayscale" />
      </button>
      <nav className="flex flex-col items-center gap-2">
        {workspaceShortcuts.map((item) => (
          <button
            key={item.to}
            type="button"
            title={item.label}
            aria-label={item.label}
            onClick={() => onNavigate(item.to)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
          </button>
        ))}
      </nav>
    </aside>
  );
}
