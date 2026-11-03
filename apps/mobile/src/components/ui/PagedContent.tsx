import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../common/Button';
import { useTheme } from '../../hooks/useTheme';

// Bound rich rows inside existing scroll layouts; do not nest virtualized lists.
export function PagedContent<T>({ items, children }: { items: T[]; children: (item: T, index: number) => React.ReactNode }) {
  const [page, setPage] = useState(0), theme = useTheme();
  useEffect(() => setPage(0), [items]);
  const pages = Math.max(1, Math.ceil(items.length / 20));
  const current = Math.min(page, pages - 1);
  return <>
    {items.slice(current * 20, current * 20 + 20).map((item, index) => children(item, current * 20 + index))}
    {pages > 1 && <View style={{ gap: 8, marginVertical: 16 }}><Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Page {current + 1} of {pages} · {items.length} items</Text><View style={{ flexDirection: 'row', gap: 12 }}><Button title="Previous page" variant="outline" disabled={current === 0} onPress={() => setPage(current - 1)} style={{ flex: 1 }} /><Button title="Next page" variant="outline" disabled={current + 1 === pages} onPress={() => setPage(current + 1)} style={{ flex: 1 }} /></View></View>}
  </>;
}
