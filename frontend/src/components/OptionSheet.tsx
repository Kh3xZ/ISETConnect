import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AuthInput } from './AuthInput';
import { BottomSheet } from './BottomSheet';
import { CheckIcon } from './icons';

export interface Option {
  value: string;
  label: string;
}

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: Option[];
  selected?: string;

  searchable?: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
}


export function OptionSheet({ visible, title, subtitle, options, selected, searchable, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <BottomSheet visible={visible} title={title} subtitle={subtitle} onClose={onClose}>
      {searchable && (
        <View style={{ marginBottom: 10 }}>
          <AuthInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            autoCapitalize="characters"
            autoCorrect={false}
            style={{ height: 44 }}
          />
        </View>
      )}
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && <Text style={styles.empty}>No results</Text>}
        {filtered.map((o) => {
          const isSelected = o.value === selected;
          return (
            <Pressable
              key={o.value}
              onPress={() => onSelect(o.value)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.rowText, isSelected && { fontFamily: fonts.semibold }]}>{o.label}</Text>
              {isSelected && <CheckIcon color={colors.accent} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 320 },
  row: {
    minHeight: 48,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  empty: { paddingVertical: 20, textAlign: 'center', fontSize: 14, fontFamily: fonts.regular, color: colors.muted },
});
