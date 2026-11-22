import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CommunityResponse } from '../services/api';
import { colors, fonts } from '../theme';
import { monogramOf } from '../utils/format';
import { BottomSheet } from './BottomSheet';
import { VisibilityBadge } from './VisibilityBadge';

interface Props {
  community: CommunityResponse | null;
  meId: number;
  busy: boolean;
  onClose: () => void;
  onJoin: (c: CommunityResponse) => void;
  onLeave: (c: CommunityResponse) => void;
}

export function CommunityDetailSheet({ community, meId, busy, onClose, onJoin, onLeave }: Props) {
  // keep the last community rendered while the sheet slides out
  const [current, setCurrent] = useState<CommunityResponse | null>(community);
  useEffect(() => {
    if (community) setCurrent(community);
  }, [community]);

  const c = current;
  const isOwner = !!c && c.ownerId === meId;
  const isPrivate = !!c?.isPrivate;
  const members = c ? `${c.membersCount.toLocaleString('en-US')}${c.nbMax ? ` / ${c.nbMax}` : ''}` : '';

  return (
    <BottomSheet visible={!!community} title={c?.name ?? ''} subtitle={c ? `${isPrivate ? 'Private' : 'Public'} community` : undefined} onClose={onClose}>
      {c && (
        <View>
          <View style={styles.topRow}>
            <View style={styles.mono}>
              <Text style={styles.monoText}>{monogramOf(c.name)}</Text>
            </View>
            <VisibilityBadge isPrivate={isPrivate} />
            <Text style={styles.members}>{members} members</Text>
          </View>

          <Text style={styles.desc}>{c.description?.trim() || 'No description provided.'}</Text>

          <View style={styles.infoBox}>
            <InfoRow label="Visibility" value={isPrivate ? 'Join key required' : 'Anyone can join'} />
            {isPrivate && !!c.nbMax && <InfoRow label="Capacity" value={`${c.nbMax} members`} />}
            <InfoRow label="Created" value={new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} last />
          </View>

          <View style={styles.actions}>
            {isOwner ? (
              <View style={[styles.primary, styles.ownerBtn]}>
                <Text style={styles.ownerText}>You own this community</Text>
              </View>
            ) : c.joined ? (
              <Pressable
                onPress={() => onLeave(c)}
                disabled={busy}
                style={({ pressed }) => [styles.primary, styles.leaveBtn, pressed && { backgroundColor: colors.surfaceHover }]}
              >
                {busy ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.leaveText}>Joined · Leave</Text>}
              </Pressable>
            ) : (
              <Pressable
                onPress={() => onJoin(c)}
                disabled={busy}
                style={({ pressed }) => [styles.primary, styles.joinBtn, pressed && { backgroundColor: colors.whiteBtnHover }]}
              >
                {busy ? <ActivityIndicator size="small" color={colors.whiteBtnText} /> : <Text style={styles.joinText}>{isPrivate ? 'Join with key' : 'Join community'}</Text>}
              </Pressable>
            )}

            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoDivider]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mono: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  monoText: { fontSize: 14, fontFamily: fonts.extrabold, color: colors.text },
  members: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.muted },
  desc: { marginTop: 14, fontSize: 14, lineHeight: 21, fontFamily: fonts.regular, color: colors.text },
  infoBox: { marginTop: 16, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  infoDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  infoLabel: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  infoValue: { flexShrink: 1, fontSize: 12.5, fontFamily: fonts.semibold, color: colors.text, textAlign: 'right' },
  actions: { marginTop: 20, flexDirection: 'row', gap: 10 },
  primary: { flex: 1, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  joinBtn: { backgroundColor: colors.whiteBtn },
  joinText: { fontSize: 14, fontFamily: fonts.bold, color: colors.whiteBtnText },
  leaveBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  leaveText: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  ownerBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ownerText: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.muted },
  closeBtn: { paddingHorizontal: 20, height: 42, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
});
