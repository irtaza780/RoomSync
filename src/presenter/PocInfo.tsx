import { CircleCheck, CircleDashed } from 'lucide-react';
import { useMemo } from 'react';
import { STORAGE_KEY } from '../state/storage';
import { useStore } from '../state/store';
import { runAllChecks } from '../validation/checks';

export const REQUIREMENT_MAP: { id: string; text: string; interaction: string; code: string; evidence: string }[] = [
  {
    id: 'FR-03',
    text: 'Record an expense with payer, amount and an equal or custom split.',
    interaction: 'Add expense sheet (Home quick action, Expenses tab): description, CAD amount, payer, equal or custom split, live allocation meter, inline validation, repeated-click protection.',
    code: 'domain/expenses.ts · validateExpenseDraft, equalSplit; sheets/AddExpenseSheet.tsx',
    evidence: 'Scenarios A, B, C, E · checks J, K',
  },
  {
    id: 'FR-04',
    text: 'Show running balances: who owes whom and how much.',
    interaction: 'Home balance card, Expenses net balance, deterministic “who owes whom” list, per-member household balances with a zero-sum total, expense detail with each member’s share and effect.',
    code: 'domain/expenses.ts · computeBalances, suggestTransfers',
    evidence: 'Scenarios A–D · checks H, L',
  },
  {
    id: 'FR-05',
    text: 'Record a settle-up made outside the app.',
    interaction: 'Settle-up sheet: pick an outstanding payment or payer/receiver, amount capped at the outstanding suggested balance; balances and activity update immediately.',
    code: 'domain/expenses.ts · validateSettlementDraft, outstandingBetween; sheets/SettleUpSheet.tsx',
    evidence: 'Scenario D · check L',
  },
  {
    id: 'FR-06',
    text: 'Define chores and how often they happen.',
    interaction: 'New chore sheet: name, weekly recurrence, first assignee and a four-week rotation preview; duplicate names rejected.',
    code: 'domain/chores.ts · validateChoreDraft, rotationPreview; sheets/AddChoreSheet.tsx',
    evidence: 'Scenario F',
  },
  {
    id: 'FR-07',
    text: 'Chores rotate automatically each week.',
    interaction: '“Advance demo week” stands in for the scheduled job: every weekly chore moves one place Syed → Abin → Debbie → Syed, with an idempotency guard against duplicate weeks.',
    code: 'domain/chores.ts · rotateForWeek; state/reducer.ts · ADVANCE_WEEK',
    evidence: 'Scenario F',
  },
  {
    id: 'FR-08',
    text: 'Mark a chore done and get reminders for chores that are due.',
    interaction: 'Assignee-only “Mark done”, status labels (upcoming, due today, overdue, done, done late), Home reminder banner, chores badge in the tab bar and “overdue” activity items. Reminders are in-app only.',
    code: 'domain/chores.ts · assignmentStatus; phone/shared.tsx · ChoreRow',
    evidence: 'Scenarios F, G',
  },
  {
    id: 'FR-13 (R2 preview)',
    text: 'Points and streaks for chores done on time and prompt settle-ups.',
    interaction: 'Points derived from records: +10 chore done on time, +3 late, +5 to the payer of a settle-up. Weekly streak for all-on-time weeks. Shown on Home, in chore rows, the Rewards sheet and the activity feed.',
    code: 'domain/rewards.ts · pointLedger, pointsByMember, streakOf',
    evidence: 'Check M',
  },
  {
    id: 'FR-14 (R2 preview)',
    text: 'Household leaderboard and agreed rewards (never cash).',
    interaction: 'Leaderboard with shared ranks; any roommate can suggest a reward, which becomes active once all three agree (try it with the second phone). Cash-like rewards are rejected.',
    code: 'domain/rewards.ts · leaderboard, validateRewardTitle; sheets/RewardsSheet.tsx',
    evidence: 'Check M',
  },
  {
    id: 'NFR-01',
    text: 'Interface available in French and English.',
    interaction: 'EN/FR switch in the app header, profile sheet and presenter panel; locale-aware CAD and date formatting; French decimal comma accepted in amounts; preference persisted.',
    code: 'i18n/en.ts, i18n/fr.ts, i18n/index.ts',
    evidence: 'Scenario G · check I',
  },
  {
    id: 'NFR-05',
    text: 'Balances stored in whole cents and always sum to zero.',
    interaction: 'All amounts parsed from strings into integer cents; household total shown on the Expenses tab and presenter panel; invalid splits are rejected before any record is written.',
    code: 'domain/money.ts · parseCents; domain/expenses.ts · isConsistentExpense',
    evidence: 'Scenarios A–E · checks I, L',
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="mb-2 text-[15px] font-extrabold tracking-tight">{title}</h3>
      <div className="text-[13.5px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export function PocInfo({ onShowValidation }: { onShowValidation: () => void }) {
  const { state, save } = useStore();
  const report = useMemo(() => runAllChecks(), []);

  return (
    <div>
      <h2 className="text-xl font-extrabold tracking-tight">About this proof of concept</h2>
      <p className="mb-6 max-w-2xl text-[13px] text-muted">
        A local, browser-only demonstration of the proposed Room Sync experience for Apartment 4B (Montréal). It is evidence for a feasibility walkthrough, not a production
        build. It contains no performance measurements or user-testing results.
      </p>

      <Section title="Assumptions demonstrated">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            <strong>Primary:</strong> a household can record equal or custom expense splits while keeping understandable, consistent balances that sum to exactly zero cents.
          </li>
          <li>
            <strong>Secondary:</strong> a simple round-robin rule (Syed → Abin → Debbie → Syed) distributes weekly chores predictably, and roommates can see their responsibilities in
            the interface.
          </li>
        </ol>
      </Section>

      <Section title="Validation cases and computed outcomes">
        <p>
          {report.passed} of {report.total} deterministic checks passed when this view was opened ({new Date(report.generatedAt).toLocaleString('en-CA')}).{' '}
          <button type="button" onClick={onShowValidation} className="font-semibold text-mustard-600 underline">
            See expected vs actual values
          </button>
          .
        </p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {report.results.map((r) => (
            <li key={r.id} className="flex items-center gap-1.5">
              <span className={r.pass ? 'font-bold text-good' : 'font-bold text-bad'}>{r.pass ? 'PASS' : 'FAIL'}</span>
              <span>
                {r.id} – {r.title}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Requirement mapping (demonstrated subset)">
        <p className="mb-2 text-[12.5px] text-muted">
          This shows which interactions provide evidence for each requirement. It does not claim the production requirement is complete. FR-13 and FR-14 are Release 2
          items in D3, included here as an early preview of the gamification angle.
        </p>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead className="bg-cream text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Req.</th>
                <th className="px-3 py-2">Implemented interaction</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {REQUIREMENT_MAP.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2.5">
                    <span className="font-bold text-ink">{r.id}</span>
                    <span className="mt-0.5 block text-[11.5px] text-muted">{r.text}</span>
                  </td>
                  <td className="px-3 py-2.5">{r.interaction}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">{r.code}</td>
                  <td className="px-3 py-2.5">{r.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12.5px] text-muted">
          Not evidenced here: NFR-04 (changes visible on other phones within seconds). The second phone view reads the same in-memory state in one browser, so it shows how
          perspectives differ, not network sync latency. That figure still has to be measured on real devices.
        </p>
      </Section>

      <Section title="Simplified data model">
        <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
          <table className="w-full min-w-[560px] text-left text-[12.5px]">
            <thead className="bg-cream text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">Fields</th>
                <th className="px-3 py-2">In demo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ['members', 'id, name, initials, color (fixed: Syed, Abin, Debbie)', state.data.members.length],
                ['expenses', 'id, title, totalCents, payerId, splitType, splits[{userId, owedCents}], createdBy, createdAt, week', state.data.expenses.length],
                ['settlements', 'id, fromUserId, toUserId, amountCents, recordedBy, settledAt, week', state.data.settlements.length],
                ['chores', 'id, title, frequency (weekly), assigneeOrder, currentIndex, createdWeek', state.data.chores.length],
                ['assignments', 'id, choreId, week, assigneeId, dueAt, status, completedAt, completedBy', state.data.assignments.length],
                ['activity', 'id, seq, type, actorId, at, week, payload', state.data.activity.length],
                ['reward', 'id, title, proposedBy, proposedAt, agreedBy[], agreedAt (one current household reward)', state.data.reward ? 1 : 0],
                ['points (derived)', 'userId, sourceType, deltaPoints, awardedAt: computed from assignments and settle-ups, never stored', '–'],
              ].map(([n, f, c]) => (
                <tr key={n as string}>
                  <td className="px-3 py-2 font-mono font-semibold">{n}</td>
                  <td className="px-3 py-2">{f}</td>
                  <td className="tabular px-3 py-2">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2">
          Balances are never stored. They are derived from expenses and settle-ups each time, so every screen and both phone views show the same figures. Field names follow the
          D3 Firestore model (totalCents, owedCents, amountCents, assigneeOrder, currentIndex), with splits stored inside each expense for simplicity.
        </p>
      </Section>

      <Section title="Use of localStorage">
        <p>
          The whole demo (household records, demo week, active roommate, language and second-phone setting) is saved as one versioned JSON record under{' '}
          <code className="rounded bg-cream px-1">{STORAGE_KEY}</code> after every change (currently {(save.bytes / 1024).toFixed(1)} KB). Sample data is created only when no
          saved record exists. Saved data is checked on load: unreadable or inconsistent records (for example balances that do not sum to zero) are copied to a backup key and the
          demo is restored, with a notice in the presenter panel. Other tabs of this demo on the same browser stay in step through the storage event.
        </p>
      </Section>

      <Section title="Demonstrated here vs future work">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-good-50/70 p-4">
            <p className="mb-1.5 font-bold text-ink">Demonstrated here</p>
            <ul className="space-y-1">
              {[
                'Expense arithmetic in integer cents',
                'Equal and custom shares, remainder cents',
                'Settle-up effects on balances',
                'Local persistence across refresh',
                'Weekly chore rotation and completion history',
                'Shared household views from different roommates',
                'Interactive navigation and bilingual interface',
                'Release 2 preview: points, streaks, leaderboard and agreed reward',
              ].map((x) => (
                <li key={x} className="flex gap-1.5">
                  <CircleCheck size={15} className="mt-0.5 shrink-0 text-good" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-cream p-4">
            <p className="mb-1.5 font-bold text-ink">Future work beyond this demo</p>
            <ul className="space-y-1">
              {[
                'Real accounts and household access control',
                'Synchronization between separate users’ devices',
                'Concurrent updates across devices',
                'Offline conflict recovery',
                'Real push notifications',
                'Native mobile application behaviour',
                'Production security and privacy (Law 25) requirements',
              ].map((x) => (
                <li key={x} className="flex gap-1.5">
                  <CircleDashed size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Remaining risks and future checks">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Concurrent writes.</strong> Two roommates adding expenses at the same moment, or offline, need transactional writes and conflict tests on the real backend.
          </li>
          <li>
            <strong>Sync latency (NFR-04).</strong> Not measured here. It needs timing on physical iOS and Android devices over a normal connection.
          </li>
          <li>
            <strong>Remainder fairness.</strong> The fixed order always gives the first leftover cent to Syed (at most 1¢ per expense). That is predictable but slightly biased over many expenses. A
            rotating remainder could be evaluated with the team.
          </li>
          <li>
            <strong>Membership changes.</strong> Rotation and equal splits assume exactly three members. Joining, leaving and absent roommates are untested.
          </li>
          <li>
            <strong>Scheduling and time zones.</strong> The real weekly job must use America/Toronto local time across daylight-saving changes. Here a manual control stands in for it.
          </li>
          <li>
            <strong>Editing and deleting records.</strong> Not implemented. They will need an audit trail so balances stay explainable.
          </li>
          <li>
            <strong>Settle-up rule.</strong> Capping payments at the suggested pair amount is a PoC simplification. Partial and arbitrary payments need product decisions.
          </li>
          <li>
            <strong>Gamification balance.</strong> Points reward speed and consistency, not effort; a quick chore and a deep clean score the same. Weighting and
            anti-gaming rules (for example, completing chores that were never done) need household testing.
          </li>
          <li>
            <strong>Usability and language.</strong> No user testing has been done. French copy should be reviewed by a native Québécois speaker.
          </li>
        </ul>
      </Section>
    </div>
  );
}
