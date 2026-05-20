import { useState } from 'react';

interface ShareMeetingModalProps {
  isOpen: boolean;
  meetingCode: string;
  meetingId: string;
  onClose: () => void;
}

export function ShareMeetingModal({
  isOpen,
  meetingCode,
  onClose,
}: ShareMeetingModalProps) {
  const [copied, setCopied] = useState(false);

  const meetingLink = `${window.location.origin}/meetings/${meetingCode}/join`;
  const shareText = `Join my meeting on Intelmeet: ${meetingLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(meetingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    const subject = 'Join me in a meeting on Intelmeet';
    const body = encodeURIComponent(`Join my meeting: ${meetingLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Share Meeting</h2>
            <p className="text-slate-500 text-sm">Invite others to join</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meeting Link */}
        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
              Meeting Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={meetingLink}
                readOnly
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 font-mono truncate cursor-pointer"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
              Meeting Code
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono font-bold text-slate-900 text-center">
                {meetingCode.toUpperCase()}
              </div>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-2 mb-6">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Share Via</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              title="Share via WhatsApp"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-3.055 2.428-3.829 6.592-1.731 9.911 1.91 3.138 5.632 3.99 8.793 2.394.5-.28 1.008-.606 1.49-1.002l.145.144c1.415 1.414 3.725 1.414 5.141 0 1.416-1.414 1.416-3.71 0-5.124l-.143-.144c.397-.482.722-.987 1.001-1.488 1.595-3.16.745-6.885-2.394-8.795-1.43-1.136-3.3-1.716-5.166-1.616zm-2.468 10.667c-.294-.296-1.225-.936-1.513-1.035-.287-.099-.663-.099-.855.024-.191.123-.611.612-.611 1.467 0 .855.42 1.701.467 1.82.047.12 1.449 2.225 3.52 3.134.982.42 1.749.607 2.34.734 1.004.25 1.91.216 2.629.103.719-.113 2.117-.672 2.415-1.322.299-.65.299-1.207.21-1.322-.089-.115-.287-.183-.586-.323l-.869-.431c-.38-.188-.881-.484-1.173-.783l-.36-.364c-.212-.212-.542-.604-.869-.784zm10.504-8.923c-.023-.025-.048-.052-.074-.075l-.177-.179c-.094-.093-.244-.244-.415-.415-.346-.34-1.064-1.055-1.521-1.512-.936-.936-2.447-.936-3.383 0l-.416.416c-.346.347-.903.903-1.258 1.258-.091.091-.177.177-.258.258l-.164.166c-.295.295-.574.574-.783.783l-.28.28c-.227.228-.502.502-.738.738l-.259.26c-.294.294-.633.632-.908.908l-.416.416c-.936.937-.936 2.447 0 3.383l1.574 1.574c.936.936 2.447.936 3.383 0l4.64-4.64c.936-.936.936-2.447 0-3.383z" />
              </svg>
              WhatsApp
            </button>
            <button
              onClick={handleShareEmail}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              title="Share via Email"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
