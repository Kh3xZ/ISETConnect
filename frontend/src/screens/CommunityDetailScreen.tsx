import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Easing, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { BottomSheet } from '../components/BottomSheet';
import { CommunityFormModal } from '../components/CommunityFormModal';
import { ExploreSkeleton } from '../components/ExploreSkeleton';
import { FeedSkeleton } from '../components/FeedSkeleton';
import { AlertCircleIcon, ChevronLeftIcon, EditIcon, FileIcon, TrashIcon, UsersIcon } from '../components/icons';
import { PublicationDetail } from '../components/PublicationDetail';
import { PublicationRow } from '../components/PublicationRow';
import { RoleBadge } from '../components/RoleBadge';
import { useToast } from '../components/Toast';
import { VisibilityBadge } from '../components/VisibilityBadge';
import { useAuth } from '../context/AuthContext';
import {
  ApiError,
  CommunityResponse,
  MemberResponse,
  PublicationResponse,
  deleteCommunity,
  getCommunityMembers,
  getPublications,
  leaveCommunity,
} from '../services/api';
import { colors, fonts } from '../theme';
import { authorMeta, monogramOf, timeAgo } from '../utils/format';
import { usePaged } from '../utils/usePaged';

type MemberItem = MemberResponse & { id: number };

interface Props {
  visible: boolean;
  community: CommunityResponse | null;
  /** Bumped by the shell after a publication is created, so the Posts tab reloads. */
  refreshTick: number;
  onClose: () => void;
  onPost: (c: CommunityResponse) => void;
  onChanged: (c: CommunityResponse) => void;
  onRemoved: (id: number) => void;
}

/** Slide-in overlay (not a Modal) so it covers the bottom nav and can host sheets safely. */
export default function CommunityDetailScreen({ visible, community, refreshTick, onClose, onPost, onChanged, onRemoved }: Props) {
  const { width } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [current, setCurrent] = useState<CommunityResponse | null>(community);

  useEffect(() => {
    if (community) setCurrent(community);
  }, [community]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted || !current) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) }] }]}>
      <DetailBody
        key={current.id}
        initial={current}
        refreshTick={refreshTick}
        onClose={onClose}
        onPost={onPost}
        onChanged={onChanged}
        onRemoved={onRemoved}
      />
    </Animated.View>
  );
}

type Tab = 'posts' | 'members';

function DetailBody({
  initial,
  refreshTick,
  onClose,
  onPost,
  onChanged,
  onRemoved,
}: {
  initial: CommunityResponse;
  refreshTick: number;
  onClose: () => void;
  onPost: (c: CommunityResponse) => void;
  onChanged: (c: CommunityResponse) => void;
  onRemoved: (id: number) => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const insets = useSafeAreaInsets();

  const [c, setC] = useState(initial);
  const [tab, setTab] = useState<Tab>('posts');
  const [selected, setSelected] = useState<PublicationResponse | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  const soft = useCallback((m: string) => toastRef.current.show(m), []);

  const postsFetcher = useCallback((_q: string, page: number) => getPublications({ communityId: c.id, page, size: 10 }), [c.id]);
  const membersFetcher = useCallback(
    async (_q: string, page: number) => {
      const res = await getCommunityMembers(c.id, page, 30);
      return { ...res, content: res.content.map((m): MemberItem => ({ ...m, id: m.user.id })) };
    },
    [c.id],
  );

  const posts = usePaged<PublicationResponse>(postsFetcher, tab === 'posts', '', soft);
  const members = usePaged<MemberItem>(membersFetcher, tab === 'members', '', soft);
  const { reload: reloadPosts } = posts;

  // a publication was just created from the shell → refresh the Posts tab
  const firstTick = useRef(refreshTick);
  useEffect(() => {
    if (refreshTick !== firstTick.current) {
      firstTick.current = refreshTick;
      reloadPosts();
    }
  }, [refreshTick, reloadPosts]);

  const sharePublication = useCallback(async (p: PublicationResponse) => {
    const excerpt = p.content.length > 240 ? `${p.content.slice(0, 240)}…` : p.content;
    try {
      await Share.share({ title: p.title, message: `${p.title}\n\n${excerpt}\n\n— ${p.author.nomPrenom} · ISETConnect` });
    } catch {
      /* dismissed */
    }
  }, []);

  if (!user) return null;

  const isOwner = c.ownerId === user.id;
  const isPrivate = !!c.isPrivate;

  const handleCommentAdded = (id: number) => {
    const bump = (p: PublicationResponse) => (p.id === id ? { ...p, commentsCount: p.commentsCount + 1 } : p);
    posts.setItems((prev) => prev.map(bump));
    setSelected((s) => (s ? bump(s) : s));
  };

  const handleLikeChange = useCallback((id: number, liked: boolean, likesCount: number) => {
    const update = (p: PublicationResponse) => (p.id === id ? { ...p, liked, likesCount } : p);
    posts.setItems((prev) => prev.map(update));
    setSelected((s) => (s ? update(s) : s));
  }, [posts.setItems]);

  const doLeave = async () => {
    setBusy(true);
    try {
      await leaveCommunity(c.id);
      setConfirm(null);
      onRemoved(c.id);
      toast.show(`Left ${c.name}`);
      onClose();
    } catch (e) {
      setConfirm(null);
      toast.show(e instanceof ApiError ? e.message : 'Could not leave this community.');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await deleteCommunity(c.id);
      setConfirm(null);
      onRemoved(c.id);
      toast.show('Community deleted');
      onClose();
    } catch (e) {
      setConfirm(null);
      toast.show(e instanceof ApiError ? e.message : 'Could not delete this community.');
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View>
      <View style={styles.info}>
        <View style={styles.topRow}>
          <View style={styles.mono}>
            <Text style={styles.monoText}>{monogramOf(c.name)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name}>{c.name}</Text>
            <View style={styles.badges}>
              <VisibilityBadge isPrivate={isPrivate} />
              {isOwner && (
                <View style={styles.ownerTag}>
                  <Text style={styles.ownerText}>Owner</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.desc}>{c.description?.trim() || 'No description provided.'}</Text>

        <Text style={styles.stats}>
          <Text style={styles.statsStrong}>{c.membersCount.toLocaleString('en-US')}</Text>
          {c.nbMax ? ` / ${c.nbMax}` : ''} {c.membersCount === 1 ? 'member' : 'members'} · Created{' '}
          {new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>

        <View style={styles.actions}>
          {c.joined ? (
            <Pressable onPress={() => onPost(c)} style={({ pressed }) => [styles.postBtn, pressed && { backgroundColor: colors.whiteBtnHover }]}>
              <Text style={styles.postText}>Post in {c.name.length > 18 ? 'community' : c.name}</Text>
            </Pressable>
          ) : (
            <View style={[styles.postBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[styles.postText, { color: colors.muted }]}>Join to post</Text>
            </View>
          )}

          {c.joined && !isOwner && (
            <Pressable onPress={() => setConfirm('leave')} style={({ pressed }) => [styles.secondaryBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
              <Text style={styles.secondaryText}>Leave</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        <TabButton label="Posts" active={tab === 'posts'} indicatorWidth={44} onPress={() => setTab('posts')} />
        <TabButton label={`Members`} active={tab === 'members'} indicatorWidth={66} onPress={() => setTab('members')} />
      </View>
    </View>
  );

  const stateFor = (list: { status: string; error: string; reload: () => void }, kind: Tab) => {
    if (list.status === 'loading' || list.status === 'idle') return kind === 'posts' ? <FeedSkeleton count={3} /> : <ExploreSkeleton variant="people" count={4} />;
    if (list.status === 'error') {
      return (
        <StateMessage
          icon={<AlertCircleIcon size={20} />}
          title={kind === 'posts' ? 'Unable to load publications' : 'Unable to load members'}
          text={list.error || 'Check your connection and try again.'}
          action="Retry"
          onAction={list.reload}
        />
      );
    }
    return kind === 'posts' ? (
      <StateMessage
        icon={<FileIcon size={20} />}
        title="No publications yet"
        text={c.joined ? 'Start the conversation in this community.' : 'Nothing has been shared in this community yet.'}
        action={c.joined ? 'Create publication' : undefined}
        onAction={() => onPost(c)}
      />
    ) : (
      <StateMessage icon={<UsersIcon size={20} />} title="No members" text="This community has no members yet." />
    );
  };

  const footer = (loadingMore: boolean) => (loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} /> : <View style={{ height: 32 + insets.bottom }} />);
  const refreshControl = (refreshing: boolean, onRefresh: () => void) => (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />
  );

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top, height: 52 + insets.top }]}>
        <View style={styles.topLeft}>
          <Pressable onPress={onClose} accessibilityLabel="Back" style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surface }]}>
            <ChevronLeftIcon size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>
            {c.name}
          </Text>
        </View>

        {isOwner && (
          <View style={styles.topRight}>
            <Pressable onPress={() => setEditOpen(true)} accessibilityLabel="Edit community" style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surface }]}>
              <EditIcon size={18} />
            </Pressable>
            <Pressable onPress={() => setConfirm('delete')} accessibilityLabel="Delete community" style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surface }]}>
              <TrashIcon size={18} color={colors.danger} />
            </Pressable>
          </View>
        )}
      </View>

      {tab === 'posts' ? (
        <FlatList
          data={posts.status === 'ready' ? posts.items : []}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => (
            <PublicationRow publication={item} onPress={setSelected} onShare={sharePublication} onLikeChange={handleLikeChange} />
          )}
          onEndReached={posts.loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl(posts.refreshing, posts.refresh)}
          ListHeaderComponent={header}
          ListEmptyComponent={stateFor(posts, 'posts')}
          ListFooterComponent={footer(posts.loadingMore)}
        />
      ) : (
        <FlatList
          data={members.status === 'ready' ? members.items : []}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <MemberRow member={item} isOwnerRow={item.user.id === c.ownerId} isMe={item.user.id === user.id} />}
          onEndReached={members.loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl(members.refreshing, members.refresh)}
          ListHeaderComponent={header}
          ListEmptyComponent={stateFor(members, 'members')}
          ListFooterComponent={footer(members.loadingMore)}
        />
      )}

      <PublicationDetail publication={selected} onClose={() => setSelected(null)} onCommentAdded={handleCommentAdded} onShare={sharePublication} />

      <CommunityFormModal
        visible={editOpen}
        community={c}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          setC(saved);
          onChanged(saved);
          setEditOpen(false);
          toast.show('Community updated');
        }}
      />

      <BottomSheet visible={confirm === 'leave'} title="Leave community?" subtitle={`You will stop seeing publications from ${c.name}.${isPrivate ? ' You will need the key to join again.' : ''}`} onClose={() => setConfirm(null)}>
        <ConfirmButtons label="Leave community" busy={busy} onConfirm={doLeave} onCancel={() => setConfirm(null)} />
      </BottomSheet>

      <BottomSheet visible={confirm === 'delete'} title="Delete community?" subtitle="This permanently removes the community for all its members. This cannot be undone." onClose={() => setConfirm(null)}>
        <ConfirmButtons label="Delete community" busy={busy} onConfirm={doDelete} onCancel={() => setConfirm(null)} />
      </BottomSheet>
    </View>
  );
}

const MemberRow = memo(function MemberRow({ member: m, isOwnerRow, isMe }: { member: MemberItem; isOwnerRow: boolean; isMe: boolean }) {
  const meta = authorMeta(m.user);
  return (
    <View style={styles.memberRow}>
      <Avatar name={m.user.nomPrenom} size={40} uri={m.user.profilePictureUrl} userId={m.user.id} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameLine}>
          <Text style={styles.memberName} numberOfLines={1}>
            {m.user.nomPrenom}
          </Text>
          <RoleBadge role={m.user.role} />
          {isOwnerRow && (
            <View style={styles.ownerTag}>
              <Text style={styles.ownerText}>Owner</Text>
            </View>
          )}
          {isMe && (
            <View style={styles.ownerTag}>
              <Text style={styles.ownerText}>You</Text>
            </View>
          )}
        </View>
        {!!meta && (
          <Text style={styles.memberMeta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      <Text style={styles.joined}>{timeAgo(m.joinedAt)}</Text>
    </View>
  );
});

function ConfirmButtons({ label, busy, onConfirm, onCancel }: { label: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <Pressable onPress={onConfirm} disabled={busy} style={({ pressed }) => [styles.dangerBtn, pressed && { backgroundColor: '#DC1E29' }]}>
        {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.dangerText}>{label}</Text>}
      </Pressable>
      <Pressable onPress={onCancel} style={({ pressed }) => [styles.keepBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
        <Text style={styles.keepText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

function TabButton({ label, active, indicatorWidth, onPress }: { label: string; active: boolean; indicatorWidth: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={({ pressed }) => [styles.tab, pressed && { backgroundColor: 'rgba(22,24,28,0.6)' }]}>
      <Text style={[styles.tabText, { color: active ? colors.text : colors.muted, fontFamily: active ? fonts.bold : fonts.medium }]}>{label}</Text>
      {active && <View style={[styles.indicator, { width: indicatorWidth }]} />}
    </Pressable>
  );
}

function StateMessage({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>{icon}</View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {!!action && (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.stateBtn, pressed && { backgroundColor: colors.whiteBtnHover }]}>
          <Text style={styles.stateBtnText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.black, zIndex: 15, elevation: 15 },
  root: { flex: 1, backgroundColor: colors.black },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.black },
  topLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  topTitle: { flexShrink: 1, fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.34, color: colors.text },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  info: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mono: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  monoText: { fontSize: 18, fontFamily: fonts.extrabold, color: colors.text },
  name: { fontSize: 20, lineHeight: 26, fontFamily: fonts.extrabold, letterSpacing: -0.4, color: colors.text },
  badges: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  ownerTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(29,155,240,0.15)', borderWidth: 1, borderColor: 'rgba(29,155,240,0.35)' },
  ownerText: { fontSize: 10.5, fontFamily: fonts.semibold, color: colors.accent },
  desc: { marginTop: 14, fontSize: 14.5, lineHeight: 21, fontFamily: fonts.regular, color: colors.text },
  stats: { marginTop: 12, fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  statsStrong: { fontFamily: fonts.bold, color: colors.text },
  actions: { marginTop: 16, flexDirection: 'row', gap: 10 },
  postBtn: { flex: 1, height: 40, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  postText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.whiteBtnText },
  secondaryBtn: { paddingHorizontal: 20, height: 40, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },

  tabs: { flexDirection: 'row', height: 42, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14 },
  indicator: { position: 'absolute', bottom: 0, height: 3, borderRadius: 2, backgroundColor: colors.accent },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { flexShrink: 1, fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  memberMeta: { marginTop: 2, fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  joined: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },

  dangerBtn: { height: 44, borderRadius: 999, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  dangerText: { fontSize: 14, fontFamily: fonts.bold, color: '#FFFFFF' },
  keepBtn: { height: 44, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  keepText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },

  state: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 56 },
  stateIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stateTitle: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.26, color: colors.text, textAlign: 'center' },
  stateText: { marginTop: 6, maxWidth: 280, fontSize: 13.5, lineHeight: 19, fontFamily: fonts.regular, color: colors.muted, textAlign: 'center' },
  stateBtn: { marginTop: 20, height: 38, paddingHorizontal: 20, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  stateBtnText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.whiteBtnText },
});
