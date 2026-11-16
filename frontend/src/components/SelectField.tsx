import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme';
import { inputBase } from './AuthInput';
import { ChevronDownIcon } from './icons';

interface Props {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;

  active?: boolean;
}


export function SelectField({ label, value, placeholder, onPress, disabled, loading, error, active }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? placeholder}`}
      style={[styles.field, active && styles.active, error && styles.error, disabled && { opacity: 0.5 }]}
    >
      <Text numberOfLines={1} style={[styles.text, !value && { color: colors.muted }]}>
        {value ?? placeholder}
      </Text>
      {loading ? <ActivityIndicator size="small" color={colors.muted} /> : <ChevronDownIcon />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { ...inputBase, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  text: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  active: { borderColor: colors.accent, backgroundColor: colors.black },
  error: { borderColor: colors.danger },
});
