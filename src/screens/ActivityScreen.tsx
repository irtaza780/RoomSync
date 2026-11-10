import { History } from 'lucide-react';
import { useState } from 'react';
import type { ActivityType } from '../domain/types';
import { usePhone, useHousehold, useT } from '../phone/context';
import { ActivityRow } from '../phone/shared';
import { EmptyState, Group, Segmented } from '../ui/primitives';

type Filter = 'all' | 'money' | 'chores';
const GROUPS: Record<Exclude<Filter, 'all'>, ActivityType[]> = {
  money: ['expense_added', 'settlement_added'],
  chores: ['chore_created', 'chore_completed', 'week_advanced', 'chore_overdue', 'reward_proposed', 'reward_agreed'],
};

export function ActivityScreen() {
  const tr = useT();
  const h = useHousehold();
  const { openSheet } = usePhone();
  const [filter, setFilter] = useState<Filter>('all');
  const entries = [...h.data.activity].filter((e) => filter === 'all' || GROUPS[filter].includes(e.type)).sort((a, b) => b.seq - a.seq);
  const weeks = [...new Set(entries.map((e) => e.week))];

  return (
    <div className="px-5 pb-32">
      <h1 className="mb-4 mt-2 text-[24px] font-bold tracking-tight">{tr.t('activity.title')}</h1>
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
      <div className="mt-2">
        {entries.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={<History size={17} />}>{tr.t('activity.empty')}</EmptyState>
          </div>
        ) : (
          weeks.map((w) => (
            <section key={w}>
              <h2 className="mb-2 mt-6 px-1 text-[13px] font-semibold text-muted">{tr.t('common.week', { n: w })}</h2>
              <Group className="divide-y divide-line overflow-hidden">
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
                          : e.type === 'reward_proposed' || e.type === 'reward_agreed'
                            ? () => openSheet({ kind: 'rewards' })
                            : undefined
                      }
                    />
                  ))}
              </Group>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
