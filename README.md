# Room Sync: local interactive proof of concept

An interactive proof of concept for **Room Sync**, a roommate household app, shown inside a phone mockup. It was built for the SOEN 6841 Software Project Management deliverable to show the proposed user experience, test selected business rules and give concrete material for a feasibility walkthrough.

**Everything runs locally in the browser.** All data lives in `localStorage`. There is no backend, cloud database, external authentication or API key.

- Stack: React 18, Vite 5, TypeScript (strict), Tailwind CSS v4, lucide-react icons, Vitest
- Household: *Apartment 4B*, Montréal (Syed, Abin and Debbie)
- Workflows: shared expenses and balances, plus weekly chore rotation and completion

---

## 1. Setup

Requirements: **Node.js 18 or newer** and npm.

```bash
npm install        # install dependencies
npm run dev        # start the dev server → http://localhost:5173
npm test           # run the calculation and scenario checks (Vitest)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build → http://localhost:4173
```

The app works offline after `npm install`, because fonts and icons are bundled. Use a desktop browser window of at least 1280 px for the full presenter layout. Narrower windows switch to the full-screen mobile layout.

---

## 2. What you see

| Area | Purpose |
|---|---|
| **Phone mockup** (centre) | The Room Sync app as one roommate sees it: Home, Expenses, Chores and Activity tabs, with bottom sheets for adding expenses, settle-ups and chores. |
| **Presenter panel** (left) | Demo-only controls kept outside the phone: active roommate, EN/FR, demo week, scenario loading, second phone, validation results, PoC information and reset. |
| **Second phone** (optional) | Another roommate's view of the same shared React state, to show how perspectives differ. |
| **Evidence window** | *Validation results* (computed pass/fail, copy as text, download JSON) and *About this PoC* (assumptions, data model, storage, risks, requirement mapping). |

On screens narrower than 640 px the app fills the screen with no bezel. The presenter controls open from the small slider button on the right edge.

---

## 3. Demo walkthrough (about 8 minutes)

1. **Populated demo.** Start as **Syed** (default). Home shows *+$61.19, you are owed $61.19*, with Debbie owing $52.70 and Abin owing $8.49. Every figure is derived from the seeded expense and settle-up records.
2. **Perspective.** In the presenter panel, switch to **Abin** and then **Debbie**. "Your balance", "You owe" and "Your chores" change. The *Household snapshot* total stays **$0.00**. Optionally tick *Show another roommate's phone*.
3. **Clean scenario.** Click **Load clean scenario**. All balances are $0.00 and the three chores start in week 1 (kitchen → Syed, trash → Abin, bathroom → Debbie).
4. **Scenario A (equal split).** As Syed: *Add expense* → "Groceries", `60`, paid by Syed, *Equally*. Expenses shows Syed **+$40.00**, Abin **−$20.00**, Debbie **−$20.00**, household total **$0.00**.
5. **Scenario D (settle-up).** *Settle up* → pick **Abin → You $20.00** → *Record payment*. Balances become Syed **+$20.00**, Abin **$0.00**, Debbie **−$20.00**. Trying to enter more than the outstanding amount is blocked.
6. **Scenario B (remainder cents).** Add `10.00` split equally. The preview shows **$3.34 / $3.33 / $3.33** and explains that the leftover cent goes to Syed under the fixed order Syed → Abin → Debbie. Open the expense to see each member's share and the effect on their balance.
7. **Scenario E (invalid custom split).** Add `30.00`, *Custom amounts* 10.00 / 10.00 / 9.99, then *Save*. Saving is blocked with **"$0.01 still to allocate"**. Nothing is added to the history, balances or activity. Change 9.99 to 10.00 and save.
8. **Validation feedback.** Try an empty description, `0`, `-5`, `10.005` or a negative share. Each gets a specific inline message, and the entered values are kept.
9. **Chores (FR-06 to FR-08).** Open **Chores**. The rotation rule is shown at the top. Mark Syed's chore done, then create a chore with *New chore* and look at the four-week rotation preview.
10. **Scenario F (rotation).** Click **Advance demo week** a few times. Each chore moves Syed → Abin → Debbie → Syed. Unfinished chores become *Overdue* with a reminder on Home, a badge on the Chores tab and an activity item. Earlier completions stay under *Earlier weeks*.
11. **Bilingual (NFR-01).** Switch to **FR** in the app header. Labels, validation messages, statuses, dates and currency (`61,19 $`) change. The cent values do not change, and French decimal commas such as `12,50` are accepted.
12. **Scenario G (persistence).** Refresh the browser. The expenses, balances, chore completions, week, language and active roommate are all still there.
13. **Validation results.** In the presenter panel, *Open validation results* runs the checks, compares expected and actual values, and offers *Copy as text* or *Download JSON* for the report.
14. **Reset.** *Reset demo…* → confirm. This clears the saved record and restores the default populated demo.

---

## 4. Validation checks

`src/validation/checks.ts` contains deterministic checks that call the **real** calculation, reducer and persistence functions on freshly built, isolated state. Persistence is tested against an in-memory store. Running them never reads or writes the live demo or `window.localStorage`. Pass/fail is computed by comparing results with expected values. Nothing is hardcoded as passing.

| ID | Check | Requirements |
|---|---|---|
| A | Equal split: Syed pays $60.00 → +$40.00 / −$20.00 / −$20.00, total $0.00 | FR-03, FR-04, NFR-05 |
| B | Remainder: $10.00 → shares $3.34/$3.33/$3.33, balances +$6.66/−$3.33/−$3.33 | FR-03, NFR-05 |
| C | Custom: Debbie pays $49.00 (20.00/14.50/14.50) → −$20.00/−$14.50/+$34.50 | FR-03, FR-04, NFR-05 |
| D | From A, Abin pays Syed $20.00 outside the app → +$20.00/$0.00/−$20.00; overpayment blocked | FR-05 |
| E | $30.00 with shares totalling $29.99 → blocked, "$0.01 still to allocate", state unchanged | FR-03, NFR-05 |
| F | Rotation Syed → Abin → Debbie → Syed; completion history kept; no duplicate weeks | FR-06, FR-07, FR-08 |
| G | Add expense, complete chore, switch to FR, save, reload → all preserved; malformed data detected | NFR-01, NFR-05, FR-08 |
| H | Switching the active roommate leaves every balance and the $0.00 total unchanged | FR-04, NFR-05 |
| I | Switching language leaves records unchanged; `12.50` and `12,50` → 1250 cents | NFR-01, NFR-05 |
| J | Input validation: empty, invalid, zero, negative, >2 decimals, negative share, over-allocation | FR-03 |
| K | Repeated save with the same draft id creates one expense and one activity entry | FR-03 |
| L | 400 random equal/custom expenses plus valid settle-ups (seed 20261109): zero-sum and integer balances after every step | NFR-05, FR-04, FR-05 |

`npm test` runs the same checks in Vitest, plus unit tests for parsing, formatting and the seeded demo totals.

The validation window also shows a **read-only live storage check**. It confirms that the record saved in `localStorage` is identical to what is on screen.

A snapshot of one run is in `docs/validation-results.txt` and `docs/validation-results.json`, and screenshots are in `docs/screenshots/`. Re-run the checks in the app to regenerate them for your report.

---

## 5. Money and balance rules

- Money is always **integer cents**. `parseCents()` reads the whole and fraction digits from the input string. It never multiplies floating-point dollars. It accepts `12`, `12.5`, `12.50` and `12,50`. It rejects negatives, more than two decimals, zero (where a positive amount is required) and amounts over $1,000,000.
- **Expense:** the payer is credited the total, and every member (payer included) is debited their share.
- **Settle-up** (payment outside the app): the payer is credited and the receiver is debited. No money moves through the app. In this PoC a settle-up cannot exceed the outstanding suggested amount between the two selected members.
- **Convention:** positive = the member is owed money, negative = the member owes money.
- Balances are **never stored**. They are derived from records whenever needed, so every screen and phone shows the same numbers.
- **Who owes whom:** largest debtor pays largest creditor, with ties broken by Syed → Abin → Debbie. This is deterministic and needs at most two transfers for three people.
- **Equal split remainder:** leftover cents go one each to Syed → Abin → Debbie, whoever pays or is viewing.

## 6. Chore rules

- Each chore is weekly, with `assigneeOrder = [Syed, Abin, Debbie]` and a `currentIndex`.
- **Advance demo week** stands in for the scheduled job. It increments `currentIndex` modulo 3 once per chore and creates that week's assignment. A guard accepts only `currentWeek + 1`, and existing `(chore, week)` pairs are skipped, so duplicates cannot occur.
- Chores are due on the Sunday that ends their week. The **demo clock** puts "today" on the same weekday as your real clock, inside the current demo week. Demo week 1 starts on Monday 2 November 2026.
- Statuses are *Upcoming*, *Due today*, *Overdue*, *Done* and *Done late*. Only the assigned roommate can mark a chore done.
- **Reminders** are in-app only: a Home reminder card, a Chores tab badge, overdue labels and *Reminder: … is overdue* activity items when a week ends with work unfinished.

---

## 7. Data and storage

One versioned record is saved under **`room-sync-demo-v1`** after every change:

```ts
{ version: 1, savedAt, state: {
    scenario: 'populated' | 'clean',
    prefs: { lang, activeMemberId, secondViewerId, showSecondPhone },
    data: { household, members, expenses[ {…, totalCents, splits[{userId, owedCents}]} ],
            settlements[ {fromUserId, toUserId, amountCents, …} ],
            chores[ {assigneeOrder, currentIndex, …} ],
            assignments[ {choreId, week, assigneeId, dueAt, status, completedAt, …} ],
            activity[ {seq, type, actorId, at, week, payload} ],
            currentWeek, seq } } }
```

- Sample data is created only when no saved record exists. Both demo scenarios are built by replaying ordinary reducer actions, so the seeded figures are derived the same way as user-entered ones.
- On load the record is structurally validated, including integer amounts, splits that add up and a zero household total. Unreadable or inconsistent data is copied to `room-sync-demo-v1-unreadable-backup`, a fresh demo is loaded, and the presenter panel shows a notice with **Restore demo**.
- If `localStorage` is unavailable (for example, blocked storage), the app still works and shows that changes will not survive a refresh.
- Field names follow the D3 Firestore data model where practical (`totalCents`, `owedCents`, `amountCents`, `assigneeOrder`, `currentIndex`). Splits are stored inside each expense for simplicity.

## 8. Project structure

```
src/
  domain/            pure business logic (no React)
    types.ts           data model
    money.ts           integer-cent parsing and CAD formatting
    expenses.ts        equal/custom splits, validation, balances, who-owes-whom, settle-up rules
    chores.ts          round-robin rotation, status, chore validation
    dates.ts           demo calendar and demo clock
  state/
    reducer.ts         pure household reducer + app reducer (ids/timestamps passed in)
    seed.ts            populated and clean scenarios (built by replaying actions)
    storage.ts         versioned localStorage load/save/validation, in-memory store for tests
    store.tsx          React Context + useReducer, persistence and multi-tab sync
  i18n/                en.ts, fr.ts string tables + translator helpers
  phone/               PhoneFrame (mockup), PhoneApp (header, nav, sheets), shared rows
  screens/             Home, Expenses, Chores, Activity
  sheets/              Add expense, Expense details, Settle-up, New chore, Profile
  presenter/           Presenter panel, Evidence window (validation + PoC info)
  validation/          deterministic checks + Vitest suite
  ui/primitives.tsx    Tailwind UI building blocks
  index.css            Tailwind import + design tokens (@theme)
```

---

## 9. Requirement mapping (demonstrated subset)

This mapping shows which interactions give evidence for each requirement. **It does not claim the production requirement is complete.**

| Req. | Requirement | Implemented interaction | Evidence |
|---|---|---|---|
| **FR-03** | Record an expense with payer, amount and an equal or custom split | Add-expense sheet: description, CAD amount, payer, equal or custom split, live allocation meter (total / allocated / remaining), inline validation, protection against repeated clicks | Scenarios A, B, C, E · checks J, K |
| **FR-04** | Running balances: who owes whom and how much | Home balance card; Expenses net balance; deterministic who-owes-whom list; per-member balances with a zero total; expense details with shares and effects | A–D · H, L |
| **FR-05** | Record a settle-up made outside the app | Settle-up sheet with outstanding payments, payer/receiver pickers and an amount capped at the outstanding balance; balances and activity update immediately | D · L |
| **FR-06** | Define chores and how often they happen | New-chore sheet: name, weekly recurrence, first assignee, four-week rotation preview, duplicate names rejected | F |
| **FR-07** | Chores rotate automatically each week | *Advance demo week* runs the round-robin rule Syed → Abin → Debbie → Syed with an idempotency guard | F |
| **FR-08** | Mark a chore done; reminders for due chores | Assignee-only *Mark done*; Upcoming / Due today / Overdue / Done / Done late; Home reminder card, tab badge and overdue activity items (in-app only) | F, G |
| **NFR-01** | French and English interface | EN/FR switch in the app header, profile and presenter panel; separate string tables; locale-aware currency and dates; preference persisted | G, I |
| **NFR-05** | Whole-cent balances that always sum to zero | String-based cent parsing; integer arithmetic; invariant checked before any record is written and when loading saved data; household total shown in the UI | A–E, I, L |

**Not evidenced here:** **NFR-04** (changes visible on other phones within seconds). The second phone reads the same in-memory state in one browser. It shows how perspectives differ. It is **not** network synchronisation, and no latency was measured. FR-01/FR-02 (accounts, joining a household), NFR-02 (five-minute onboarding) and NFR-03 (Law 25 privacy) are outside this PoC.

---

## 10. Assumptions and limitations

**Assumptions demonstrated**

1. A household can record equal or custom expense splits while keeping understandable, consistent balances that sum to exactly zero cents.
2. A simple round-robin rule distributes recurring chores predictably, and roommates can understand their responsibilities through the interface.

**Simplifications**

- Exactly three fixed members, and every expense is shared by all three.
- Member switching simulates a signed-in user. There are no passwords or accounts.
- Weekly recurrence only. A presenter control stands in for the scheduled rotation job.
- Expenses, settle-ups and chores cannot be edited or deleted.
- This is a web stand-in for the proposed React Native (Expo) client. The domain logic is plain TypeScript and does not depend on React DOM.

**Future work beyond this demo**

- Real accounts and household access control
- Synchronisation between separate users' devices
- Concurrent updates across devices
- Offline conflict recovery
- Real push notifications
- Native mobile application behaviour
- Production security and privacy requirements (Quebec Law 25)

**Remaining risks and future checks**

- Concurrent or offline writes need transactional updates and conflict tests on the real backend.
- Sync latency (NFR-04) must be measured on physical iOS and Android devices.
- The fixed remainder order always gives Syed the first leftover cent (at most 1¢ extra per expense). A rotating remainder could be considered.
- Membership changes (joining, leaving, absence) are not handled by rotation or equal splits.
- The real weekly job must use America/Toronto local time across daylight-saving changes.
- Editing and deleting records will need an audit trail.
- The settle-up cap is a PoC simplification. Partial and arbitrary payments need product decisions.
- No user testing has been carried out. The French copy should be reviewed by a native Québécois speaker.

This PoC contains **no performance measurements, user-testing results or claims of production readiness.**
