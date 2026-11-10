import { HardDrive, MapPin } from 'lucide-react';
import type { Lang } from '../domain/types';
import { useHousehold, usePhone, useT } from '../phone/context';
import { useStore } from '../state/store';
import { Avatar, Segmented, Sheet } from '../ui/primitives';

export function ProfileSheet() {
  const tr = useT();
  const h = useHousehold();
  const { state, dispatch } = useStore();
  const { closeSheet, viewerId } = usePhone();
  return (
    <Sheet title={tr.t('settings.title')} onClose={closeSheet}>
      <div className="flex items-center gap-3 rounded-3xl bg-cream p-4">
        <Avatar member={h.viewer} size="lg" />
        <div>
          <p className="text-[12px] font-semibold text-muted">{tr.t('settings.signedInAs')}</p>
          <p className="text-lg font-bold">{h.viewer.name}</p>
        </div>
      </div>
      <p className="mt-2 px-1 text-[12.5px] text-muted">{tr.t('settings.demoNote')}</p>

      <h3 className="mb-1.5 mt-5 text-[13px] font-semibold text-ink-2">{tr.t('settings.language')}</h3>
      <Segmented<Lang>
        label={tr.t('settings.language')}
        value={state.prefs.lang}
        onChange={(lang) => dispatch({ type: 'SET_LANG', lang })}
        options={[
          { value: 'en', label: 'English' },
          { value: 'fr', label: 'Français' },
        ]}
      />

      <h3 className="mb-1.5 mt-5 text-[13px] font-semibold text-ink-2">{tr.t('settings.household')}</h3>
      <div className="rounded-2xl bg-cream p-3.5">
        <p className="font-bold">{h.data.household.name}</p>
        <p className="flex items-center gap-1 text-[13px] text-muted">
          <MapPin size={13} aria-hidden /> {h.data.household.city}, QC
        </p>
        <p className="mb-1.5 mt-3 text-[12px] font-semibold uppercase tracking-wide text-muted">{tr.t('settings.members')}</p>
        <ul className="space-y-1.5">
          {h.data.members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm font-medium">
              <Avatar member={m} size="xs" /> {m.name}
              {m.id === viewerId && <span className="text-[12px] text-muted">({tr.t('common.youLower')})</span>}
            </li>
          ))}
        </ul>
      </div>
      <p className="mb-2 mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted">
        <HardDrive size={13} aria-hidden /> {tr.t('settings.storage')}
      </p>
    </Sheet>
  );
}
