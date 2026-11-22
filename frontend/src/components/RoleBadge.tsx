import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Role } from '../services/api';
import { colors, fonts } from '../theme';
import { ROLE_LABELS } from '../utils/format';

export function RoleBadge({ role }: { role: Role }) {
  const variant = role === 'PROF' ? styles.prof : role === 'ADMIN' ? styles.admin : styles.student;
  const textVariant = role === 'PROF' ? styles.profText : role === 'ADMIN' ? styles.adminText : styles.studentText;
  return (
    <View style={[styles.base, variant]}>
      <Text style={[styles.text, textVariant]}>{ROLE_LABELS[role]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1 },
  text: { fontSize: 10, lineHeight: 14 },
  prof: { backgroundColor: 'rgba(29,155,240,0.15)', borderColor: 'rgba(29,155,240,0.35)' },
  profText: { color: colors.accent, fontFamily: fonts.semibold },
  admin: { backgroundColor: colors.whiteBtn, borderColor: colors.whiteBtn },
  adminText: { color: colors.whiteBtnText, fontFamily: fonts.bold },
  student: { backgroundColor: colors.surface, borderColor: colors.border },
  studentText: { color: colors.muted, fontFamily: fonts.medium },
});
