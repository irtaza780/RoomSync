import { CircleCheck, CircleX, Copy, Download, FlaskConical, Info, Play, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { browserStore, STORAGE_KEY } from '../state/storage';
import { useStore } from '../state/store';
import { cx } from '../ui/primitives';
import { liveStorageCheck, reportToText, runAllChecks, type ValidationReport } from '../validation/checks';
import { PocInfo } from './PocInfo';
import type { EvidenceTab } from './PresenterPanel';

export function EvidenceModal({ tab, onTab, onClose }: { tab: EvidenceTab; onTab: (t: EvidenceTab) => void; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="PoC evidence">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden bg-surface shadow-phone sm:h-[min(90vh,920px)] sm:rounded-[28px]">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <div className="flex rounded-2xl bg-cream p-1 ring-1 ring-line">
            {(
              [
                ['validation', 'Validation results', FlaskConical],
                ['about', 'About this PoC', Info],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => onTab(id)}
                aria-pressed={tab === id}
                className={cx(
                  'flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold',
                  tab === id ? 'bg-surface shadow-card' : 'text-muted hover:text-ink',
                )}
              >
                <Icon size={15} aria-hidden /> {label}
              </button>
            ))}
          </div>
          <span className="ml-auto hidden rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-surface sm:inline">Local interactive PoC</span>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full bg-cream hover:bg-line">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">{tab === 'validation' ? <ValidationView /> : <PocInfo onShowValidation={() => onTab('validation')} />}</div>
      </div>
    </div>
  );
}

function ValidationView() {
  const { state } = useStore();
  const [report, setReport] = useState<ValidationReport>(() => runAllChecks());
  const [copied, setCopied] = useState<string | null>(null);
  const live = useMemo(() => {
    const store = browserStore();
    let raw: string | null = null;
    try {
      raw = store?.getItem(STORAGE_KEY) ?? null;
    } catch {
      raw = null;
    }
    return liveStorageCheck(state, raw);
  }, [state, report]);

  const exportJson = () => {
    const payload = { ...report, liveStorageCheck: live };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room-sync-validation-${report.generatedAt.slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyText = async () => {
    const text = `${reportToText(report)}\nLive storage check (read-only): ${live.pass ? 'PASS' : 'FAIL'} – ${live.summary}\n`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Copied to clipboard');
    } catch {
      // Clipboard may be blocked (e.g. non-secure context): fall back to a selectable textarea copy.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      setCopied(ok ? 'Copied to clipboard' : 'Copy blocked by the browser – use Download JSON');
    }
    setTimeout(() => setCopied(null), 2500);
  };

  const allPass = report.passed === report.total;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Validation results</h2>
          <p className="max-w-xl text-[13px] text-muted">
            Each check runs the real calculation, reducer and persistence functions on freshly built, isolated state and an in-memory store. Results are computed when you press
            Run; the live demo and its localStorage record are never modified.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setReport(runAllChecks())} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-mustard px-3 text-[13px] font-semibold hover:bg-mustard-600" data-testid="run-checks">
            <Play size={15} aria-hidden /> Run checks again
          </button>
          <button type="button" onClick={copyText} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-cream px-3 text-[13px] font-semibold ring-1 ring-line hover:bg-line">
            <Copy size={15} aria-hidden /> Copy as text
          </button>
          <button type="button" onClick={exportJson} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-cream px-3 text-[13px] font-semibold ring-1 ring-line hover:bg-line" data-testid="download-json">
            <Download size={15} aria-hidden /> Download JSON
          </button>
        </div>
      </div>
      {copied && (
        <p role="status" className="mt-2 text-[12.5px] font-semibold text-good">
          {copied}
        </p>
      )}

      <div
        className={cx('mt-4 flex items-center gap-3 rounded-2xl p-4 ring-1', allPass ? 'bg-good-50 ring-good/25' : 'bg-bad-50 ring-bad/25')}
        data-testid="validation-summary"
      >
        {allPass ? <CircleCheck className="text-good" aria-hidden /> : <CircleX className="text-bad" aria-hidden />}
        <div>
          <p className="font-bold">
            {report.passed} of {report.total} checks passed
          </p>
          <p className="text-[12px] text-muted">Run at {new Date(report.generatedAt).toLocaleString('en-CA')}</p>
        </div>
      </div>

      <div className={cx('mt-3 rounded-2xl p-3.5 text-[13px] ring-1', live.pass ? 'bg-cream ring-line' : 'bg-bad-50 ring-bad/25')}>
        <p className="font-bold">
          Live storage check (read-only): <span className={live.pass ? 'text-good' : 'text-bad'}>{live.pass ? 'PASS' : 'FAIL'}</span>
        </p>
        <p className="text-ink-2">{live.summary}</p>
        <p className="mt-1 text-[12px] text-muted">
          To verify a real refresh: add an expense, mark a chore done and switch to French, reload the page, then reopen this panel. Scenario G repeats the same steps in isolation.
        </p>
      </div>

      <ol className="mt-5 space-y-3">
        {report.results.map((r) => (
          <li key={r.id} className="rounded-2xl bg-surface p-4 ring-1 ring-line" data-testid={`check-${r.id}`} data-pass={r.pass}>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold',
                  r.pass ? 'bg-good-50 text-good' : 'bg-bad-50 text-bad',
                )}
              >
                {r.pass ? <CircleCheck size={12} aria-hidden /> : <CircleX size={12} aria-hidden />}
                {r.pass ? 'PASS' : 'FAIL'}
              </span>
              <h3 className="font-bold">
                {r.id.length === 1 && 'ABCDEFG'.includes(r.id) ? `Scenario ${r.id}` : `Check ${r.id}`} — {r.title}
              </h3>
              <span className="ml-auto flex flex-wrap gap-1">
                {r.requirements.map((q) => (
                  <span key={q} className="rounded-md bg-cream px-1.5 py-0.5 text-[10.5px] font-bold text-ink-2">
                    {q}
                  </span>
                ))}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">{r.setup}</p>
            <div className="mt-2.5 grid gap-2 text-[12.5px] sm:grid-cols-2">
              <div className="rounded-xl bg-cream p-2.5">
                <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">Expected</p>
                <ul className="space-y-0.5">
                  {r.expected.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
              <div className={cx('rounded-xl p-2.5', r.pass ? 'bg-good-50/70' : 'bg-bad-50')}>
                <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">Actual (computed)</p>
                <ul className="space-y-0.5 break-words">
                  {r.actual.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
            {r.error && <p className="mt-2 text-[12.5px] font-semibold text-bad">Error: {r.error}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
