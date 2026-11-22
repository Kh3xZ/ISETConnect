import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, CommentResponse, PublicationResponse, addComment, getComments } from '../services/api';
import { colors, fonts } from '../theme';
import { authorMeta, timeAgo } from '../utils/format';
import { Avatar } from './Avatar';
import { ChevronLeftIcon, LinkIcon } from './icons';
import { LikeButton } from './LikeButton';
import { RoleBadge } from './RoleBadge';

interface Props {
  publication: PublicationResponse | null;
  onClose: () => void;
  onCommentAdded: (publicationId: number) => void;
  onShare: (p: PublicationResponse) => void;
}

export function PublicationDetail({ publication, onClose, onCommentAdded, onShare }: Props) {
  const insets = useSafeAreaInsets();
  // keep the last publication mounted while the modal slides out
  const [current, setCurrent] = useState<PublicationResponse | null>(publication);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const id = publication?.id;

  useEffect(() => {
    if (publication) setCurrent(publication);
  }, [publication]);

  useEffect(() => {
    if (id === undefined) return;
    let cancelled = false;
    setComments([]);
    setTotal(0);
    setPage(0);
    setLast(true);
    setText('');
    setSendError('');
    setLoadError('');
    setLoading(true);
    getComments(id, 0)
      .then((res) => {
        if (cancelled) return;
        setComments(res.content);
        setTotal(res.totalElements);
        setPage(res.page);
        setLast(res.last);
      })
      .catch((e) => !cancelled && setLoadError(e instanceof ApiError ? e.message : "Couldn't load comments."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadMore = useCallback(async () => {
    if (id === undefined || loading || last) return;
    setLoading(true);
    try {
      const res = await getComments(id, page + 1);
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...res.content.filter((c) => !seen.has(c.id))];
      });
      setPage(res.page);
      setLast(res.last);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Couldn't load comments.");
    } finally {
      setLoading(false);
    }
  }, [id, loading, last, page]);

  const submit = async () => {
    const value = text.trim();
    if (!value || sending || id === undefined) return;
    setSending(true);
    setSendError('');
    try {
      const created = await addComment(id, value);
      setComments((prev) => [...prev, created]);
      setTotal((t) => t + 1);
      setText('');
      onCommentAdded(id);
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : "Couldn't post your comment.");
    } finally {
      setSending(false);
    }
  };

  const p = current;

  const header = p ? (
    <View>
      <View style={styles.post}>
        <View style={styles.authorRow}>
          <Avatar name={p.author.nomPrenom} size={44} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameLine}>
              <Text style={styles.authorName}>{p.author.nomPrenom}</Text>
              <RoleBadge role={p.author.role} />
            </View>
            <Text style={styles.authorMeta}>
              {authorMeta(p.author) || 'ISET Campus'} · {timeAgo(p.createdAt)}
            </Text>
          </View>
        </View>

        {!!p.communityName && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{p.communityName}</Text>
          </View>
        )}

        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.body}>{p.content}</Text>
        <View style={styles.postStats}>
          <LikeButton
            publicationId={p.id}
            liked={p.liked}
            count={p.likesCount}
            size={21}
            showCount={false}
            onChange={(id, liked, likesCount) =>
              setCurrent((value) => (value?.id === id ? { ...value, liked, likesCount } : value))
            }
          />
          <Text style={styles.likesCount}>
            {p.likesCount} {p.likesCount === 1 ? 'like' : 'likes'}
          </Text>
        </View>
      </View>

      <View style={styles.discussion}>
        <Text style={styles.discussionTitle}>Discussion</Text>
        <Text style={styles.discussionCount}>
          {total} {total === 1 ? 'comment' : 'comments'}
        </Text>
      </View>
    </View>
  ) : undefined;

  return (
    <Modal visible={!!publication} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <Pressable onPress={onClose} accessibilityLabel="Back to feed" style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surface }]}>
              <ChevronLeftIcon size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.topTitle}>Publication</Text>
          </View>
          {p && (
            <Pressable onPress={() => onShare(p)} accessibilityLabel="Share publication" style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surface }]}>
              <LinkIcon size={18} />
            </Pressable>
          )}
        </View>

        <FlatList
          data={comments}
          keyExtractor={(c) => String(c.id)}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Avatar name={item.author.nomPrenom} size={32} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.nameLine}>
                  <Text style={styles.commentName} numberOfLines={1}>
                    {item.author.nomPrenom}
                  </Text>
                  <RoleBadge role={item.author.role} />
                  <Text style={styles.commentTime}>· {timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 32 }} />
            ) : (
              <Text style={styles.empty}>{loadError || 'No comments yet. Start the academic discussion below.'}</Text>
            )
          }
          ListFooterComponent={
            !last && comments.length > 0 ? (
              <Pressable onPress={loadMore} style={styles.moreBtn}>
                {loading ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={styles.moreText}>Load more comments</Text>}
              </Pressable>
            ) : (
              <View style={{ height: 16 }} />
            )
          }
        />

        <View style={[styles.composer, { paddingBottom: 12 + insets.bottom }]}>
          {!!sendError && <Text style={styles.sendError}>{sendError}</Text>}
          <View style={styles.composerRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              maxLength={400}
              placeholder="Write a comment..."
              placeholderTextColor={colors.muted}
              returnKeyType="send"
              onSubmitEditing={submit}
              style={styles.input}
            />
            <Pressable
              onPress={submit}
              disabled={!text.trim() || sending}
              style={({ pressed }) => [styles.reply, (!text.trim() || sending) && { opacity: 0.4 }, pressed && { backgroundColor: colors.whiteBtnHover }]}
            >
              {sending ? <ActivityIndicator size="small" color={colors.whiteBtnText} /> : <Text style={styles.replyText}>Reply</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.34, color: colors.text },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  post: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  authorName: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  authorMeta: { marginTop: 2, fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  tag: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tagText: { fontSize: 12, fontFamily: fonts.medium, color: colors.accent },
  title: { marginTop: 12, fontSize: 18, lineHeight: 24, fontFamily: fonts.extrabold, letterSpacing: -0.36, color: colors.text },
  body: { marginTop: 10, fontSize: 15, lineHeight: 23, fontFamily: fonts.regular, color: colors.text },
  postStats: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  likesCount: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted },
  discussion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  discussionTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.text },
  discussionCount: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  comment: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  commentName: { flexShrink: 1, fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  commentTime: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted },
  commentText: { marginTop: 4, fontSize: 13.5, lineHeight: 19, fontFamily: fonts.regular, color: '#D1D5DB' },
  empty: { paddingHorizontal: 16, paddingVertical: 40, textAlign: 'center', fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  moreBtn: { alignSelf: 'center', marginVertical: 14, paddingHorizontal: 16, height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text },
  composer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.black },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sendError: { marginBottom: 8, fontSize: 12, fontFamily: fonts.medium, color: colors.danger },
  input: { flex: 1, height: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 14, fontFamily: fonts.regular },
  reply: { minWidth: 64, height: 42, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  replyText: { fontSize: 13, fontFamily: fonts.bold, color: colors.whiteBtnText },
});
