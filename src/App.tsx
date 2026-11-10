import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { PhoneApp } from './phone/PhoneApp';
import { PhoneFrame, useMediaQuery } from './phone/PhoneFrame';
import { EvidenceModal } from './presenter/EvidenceModal';
import { PresenterPanel, type EvidenceTab } from './presenter/PresenterPanel';
import { MEMBERS } from './state/seed';
import { useStore } from './state/store';
import { Avatar } from './ui/primitives';

export default function App() {
  const { state } = useStore();
  const narrow = useMediaQuery('(max-width: 639px)');
  const [evidence, setEvidence] = useState<EvidenceTab | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const { activeMemberId, secondViewerId, showSecondPhone } = state.prefs;
  const member = (id: string) => MEMBERS.find((m) => m.id === id)!;

  const label = (id: string, primary: boolean) => (
    <span className="inline-flex items-center gap-1.5">
      <Avatar member={member(id)} size="xs" />
      {member(id).name}’s phone
      <span className="font-medium text-muted">· {primary ? 'active roommate' : 'second view'}</span>
    </span>
  );

  if (narrow) {
    return (
      <>
        <PhoneFrame>
          <PhoneApp viewerId={activeMemberId} instance="primary" />
        </PhoneFrame>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Open presenter controls"
          className="fixed bottom-[92px] right-0 z-40 grid size-11 place-items-center rounded-l-2xl bg-ink/85 text-surface shadow-phone backdrop-blur"
        >
          <SlidersHorizontal size={17} aria-hidden />
        </button>
        {panelOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-desk p-3" role="dialog" aria-modal="true" aria-label="Presenter controls">
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close presenter controls" className="grid size-11 place-items-center rounded-full bg-surface ring-1 ring-line">
                <X size={18} />
              </button>
            </div>
            <PresenterPanel
              onOpenEvidence={(t) => {
                setPanelOpen(false);
                setEvidence(t);
              }}
            />
          </div>
        )}
        {evidence && <EvidenceModal tab={evidence} onTab={setEvidence} onClose={() => setEvidence(null)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#f7f1e6_0%,_#efe8db_55%,_#e8dfcf_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-wrap items-start justify-center gap-x-10 gap-y-8 px-6 py-6 lg:flex-nowrap">
        <div className="w-full max-w-[340px] shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:overflow-y-auto lg:rounded-[28px] scrollbar-none">
          <PresenterPanel onOpenEvidence={setEvidence} />
        </div>
        <div className="flex flex-wrap items-start justify-center gap-8">
          <PhoneFrame label={label(activeMemberId, true)}>
            <PhoneApp viewerId={activeMemberId} instance="primary" />
          </PhoneFrame>
          {showSecondPhone && (
            <PhoneFrame label={label(secondViewerId, false)}>
              <PhoneApp viewerId={secondViewerId} instance="secondary" />
            </PhoneFrame>
          )}
        </div>
      </div>
      {evidence && <EvidenceModal tab={evidence} onTab={setEvidence} onClose={() => setEvidence(null)} />}
    </div>
  );
}
