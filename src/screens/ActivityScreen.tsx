import { History } from 'lucide-react';
import { useState } from 'react';
import type { ActivityType } from '../domain/types';
import { usePhone, useHousehold, useT } from '../phone/context';
import { ActivityRow } from '../phone/shared';
import { Card, EmptyState, Segmented } from '../ui/primitives';

type Filter = 'all' | 'money' | 'chores';
const GROUPS: Record<Exclude<Filter, 'all'>, ActivityType[]> = {
  money: ['expense_added', 'settlement_added'],
  chores: ['chore_created', 'chore_completed', 'week_advanced', 'chore_overdue'],
};

export function ActivityScreen() {
  const tr = useT();
  const h = useHousehold();
  const { openSheet } = usePhone();
  const [filter, setFilter] = useState<Filter>('all');
  const entries = [...h.data.activity]
    .filter((e) => filter === 'all' || GROUPS[filter].includes(e.type))
    .sort((a, b) => b.seq - a.seq);

  // Group by demo week, newest first.
  const weeks = [...new Set(entries.map((e) => e.week))];

  return (
    <div className="px-4 pb-6">
      <h1 className="mb-3 mt-1 px-1 text-2xl font-extrabold tracking-tight">{tr.t('activity.title')}</h1>
      <Segmented
        label={tr.t('activity.title')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: tr.t('activity.all') },
          { value: 'money', label: tr.t('activity.money') },
          { value: 'chores', label: tr.t('activity.chores') },
        ]}
      />
      <div className="mt-4 space-y-4">
        {entries.length === 0 ? (
          <EmptyState icon={<History size={20} />}>{tr.t('activity.empty')}</EmptyState>
        ) : (
          weeks.map((w) => (
            <section key={w}>
              <h2 className="mb-1.5 px-1 text-[13px] font-bold uppercase tracking-wide text-muted">{tr.t('common.week', { n: w })}</h2>
              <Card className="px-3 py-1">
                <div className="divide-y divide-line">
                  {entries
                    .filter((e) => e.week === w)
                    .map((e) => (
                      <ActivityRow
                        key={e.id}
                        e={e}
                        showWeek={false}
                        onClick={
                          e.type === 'expense_added' && h.data.expenses.some((x) => x.id === e.payload.expenseId)
                            ? () => openSheet({ kind: 'expense', id: e.payload.expenseId })
                            : undefined
                        }
                      />
                    ))}
                </div>
              </Card>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
