import { Signal, Wifi, BatteryFull } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export const PHONE_W = 390;
export const PHONE_H = 844;
const BEZEL = 12;

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

/** Scale the phone down so the whole device fits the viewport height on smaller laptop screens. */
function useFitScale(extra = 96): number {
  const [s, setS] = useState(1);
  useEffect(() => {
    const on = () => setS(Math.max(0.6, Math.min(1, (window.innerHeight - extra) / (PHONE_H + BEZEL * 2))));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [extra]);
  return s;
}

function StatusBar() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative flex h-[50px] shrink-0 items-end justify-between bg-surface px-8 pb-2 text-[14px] font-semibold" aria-hidden>
      <span className="tabular">{time.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: false })}</span>
      <span className="absolute left-1/2 top-2.5 h-[30px] w-[118px] -translate-x-1/2 rounded-full bg-ink" />
      <span className="flex items-center gap-1.5">
        <Signal size={15} strokeWidth={2.6} />
        <Wifi size={15} strokeWidth={2.6} />
        <BatteryFull size={20} strokeWidth={2} />
      </span>
    </div>
  );
}

/** Realistic phone bezel on desktop; full-bleed app on narrow screens. */
export function PhoneFrame({ children, label }: { children: ReactNode; label?: ReactNode }) {
  const narrow = useMediaQuery('(max-width: 639px)');
  const scale = useFitScale(label ? 112 : 80);

  if (narrow) {
    return <div className="h-dvh w-full overflow-hidden bg-surface">{children}</div>;
  }

  const outerW = (PHONE_W + BEZEL * 2) * scale;
  const outerH = (PHONE_H + BEZEL * 2) * scale;
  return (
    <div className="flex flex-col items-center">
      {label && <div className="mb-3 text-center text-[13px] font-semibold text-ink-2">{label}</div>}
      <div style={{ width: outerW, height: outerH }}>
        <div
          className="origin-top-left rounded-[58px] bg-[#1d1b18] shadow-phone ring-1 ring-black/40"
          style={{ width: PHONE_W + BEZEL * 2, height: PHONE_H + BEZEL * 2, padding: BEZEL, transform: `scale(${scale})` }}
        >
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[46px] bg-surface" style={{ width: PHONE_W, height: PHONE_H }}>
            <StatusBar />
            <div className="relative min-h-0 flex-1">{children}</div>
            <span className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/80" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
