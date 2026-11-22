import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { UserResponse } from '../services/api';
import { colors, fonts } from '../theme';
import { departmentLabel } from '../utils/format';
import { Avatar } from './Avatar';
import { BottomSheet } from './BottomSheet';
import { RoleBadge } from './RoleBadge';

interface Props {
  user: UserResponse | null;
  isMe: boolean;
  onClose: () => void;
}

export function UserProfileSheet({ user, isMe, onClose }: Props) {
  const [current, setCurrent] = useState<UserResponse | null>(user);
  useEffect(() => {
    if (user) setCurrent(user);
  }, [user]);

  const u = current;
  const dept = u ? u.departmentLabel ?? departmentLabel(u.department) : null;

  return (
    <BottomSheet visible={!!user} title={u?.nomPrenom ?? ''} subtitle={u?.email} onClose={onClose}>
      {u && (
        <View>
          <View style={styles.top}>
            <Avatar name={u.nomPrenom} size={52} />
            <RoleBadge role={u.role} />
            {isMe && (
              <View style={styles.me}>
                <Text style={styles.meText}>You</Text>
              </View>
            )}
          </View>

          <View style={styles.box}>
            <Row label="Department" value={dept || '—'} divider />
            {!!u.classe && <Row label="Class" value={u.classe} divider />}
            <Row
              label="Member since"
              value={new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            />
          </View>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.done, pressed && { backgroundColor: colors.whiteBtnHover }]}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}

function Row({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  me: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(29,155,240,0.15)' },
  meText: { fontSize: 10.5, fontFamily: fonts.semibold, color: colors.accent },
  box: { marginTop: 16, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  value: { flexShrink: 1, fontSize: 13, fontFamily: fonts.semibold, color: colors.text, textAlign: 'right' },
  done: { marginTop: 20, height: 42, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: 14, fontFamily: fonts.bold, color: colors.whiteBtnText },
});
