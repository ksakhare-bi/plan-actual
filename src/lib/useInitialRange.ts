'use client';

import { useEffect, useState } from 'react';
import { defaultRange, type Range } from '@/components/RangePicker';
import { api } from './client';
import { quarterMonths, splitMonth } from './period';


export function useInitialRange(): [Range, (r: Range) => void, boolean] {
  const [range, setRange] = useState<Range>(defaultRange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    api<{ lastMonth: string | null }>('/api/range')
      .then(({ lastMonth }) => {
        if (!live) return;
        if (lastMonth) {
          const { year, month } = splitMonth(lastMonth);
          const months = quarterMonths(year, Math.floor((month - 1) / 3) + 1);
          setRange({ from: months[0], to: months[2] });
        }
      })
      .catch(() => {
        
      })
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);

  return [range, setRange, ready];
}
