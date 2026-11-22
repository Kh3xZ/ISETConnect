import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicationResponse } from '../services/api';
import { colors, fonts } from '../theme';
import { authorMeta, timeAgo } from '../utils/format';
import { Avatar } from './Avatar';
import { CommentIcon, ChevronRightIcon, LinkIcon, MoreIcon } from './icons';
import { LikeButton, type LikeChangeHandler } from './LikeButton';
import { RoleBadge } from './RoleBadge';

interface Props {
  publication: PublicationResponse;
  onPress: (p: PublicationResponse) => void;
  onShare: (p: PublicationResponse) => void;
  onLikeChange?: LikeChangeHandler;
  /** When provided, a "…" button is shown (edit / delete menu). */
  onMore?: (p: PublicationResponse) => void;
}

function PublicationRowBase({ publication: p, onPress, onShare, onLikeChange, onMore }: Props) {
  const meta = authorMeta(p.author);

  return (
    <Pressable
      onPress={() => onPress(p)}
      accessibilityRole="button"
      accessibilityLabel={`Open publication: ${p.title}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      <View style={styles.avatar}>
        <Avatar name={p.author.nomPrenom} size={40} />
      </View>

      <View style={styles.col}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>
            {p.author.nomPrenom}
          </Text>
          <RoleBadge role={p.author.role} />
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{timeAgo(p.createdAt)}</Text>
        </View>

        {(meta || p.communityName) && (
          <View style={styles.metaLine}>
            {!!meta && (
              <Text style={styles.meta} numberOfLines={1}>
                {meta}
              </Text>
            )}
            {!!meta && !!p.communityName && <Text style={styles.bullet}>•</Text>}
            {!!p.communityName && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{p.communityName}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.content} numberOfLines={4}>
          {p.content}
        </Text>

        <View style={styles.actions}>
          <View style={styles.actionsLeft}>
            <LikeButton publicationId={p.id} liked={p.liked} count={p.likesCount} size={16} onChange={onLikeChange} />
            <View style={styles.action}>
              <CommentIcon size={16} />
              <Text style={styles.count}>{p.commentsCount}</Text>
            </View>
            <Pressable
              onPress={() => onShare(p)}
              hitSlop={10}
              accessibilityLabel="Share publication"
              style={({ pressed }) => [styles.shareBtn, pressed && { backgroundColor: 'rgba(29,155,240,0.12)' }]}
            >
              <LinkIcon size={15} />
            </Pressable>
          </View>

          <View style={styles.actionsRight}>
            {onMore && (
              <Pressable
                onPress={() => onMore(p)}
                hitSlop={10}
                accessibilityLabel="More actions"
                style={({ pressed }) => [styles.shareBtn, pressed && { backgroundColor: 'rgba(29,155,240,0.12)' }]}
              >
                <MoreIcon size={18} />
              </Pressable>
            )}
            <View style={styles.open}>
              <Text style={styles.openText}>Open</Text>
              <ChevronRightIcon size={13} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export const PublicationRow = memo(PublicationRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: { marginTop: 2 },
  col: { flex: 1, minWidth: 0 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' },
  name: { flexShrink: 1, fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  dot: { fontSize: 12, color: colors.muted },
  time: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  metaLine: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  meta: { flexShrink: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  bullet: { fontSize: 10, color: colors.border },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { fontSize: 11, fontFamily: fonts.medium, color: colors.accent },
  title: { marginTop: 6, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, letterSpacing: -0.22, color: colors.text },
  content: { marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: '#D1D5DB' },
  actions: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted },
  shareBtn: { padding: 4, margin: -4, borderRadius: 999 },
  actionsRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  open: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openText: { fontSize: 11, fontFamily: fonts.medium, color: colors.muted },
});
