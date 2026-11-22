import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { BottomSheet } from '../components/BottomSheet';
import { EditProfileModal } from '../components/EditProfileModal';
import { EditPublicationModal } from '../components/EditPublicationModal';
import { ExploreSkeleton } from '../components/ExploreSkeleton';
import { FeedSkeleton } from '../components/FeedSkeleton';
import { AlertCircleIcon, EditIcon, FileIcon, LogOutIcon, TrashIcon, UsersIcon } from '../components/icons';
import { PublicationDetail } from '../components/PublicationDetail';
import { PublicationRow } from '../components/PublicationRow';
import { RoleBadge } from '../components/RoleBadge';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ApiError, CommunityResponse, PublicationResponse, deletePublication, getMyCommunities, getUserPublications } from '../services/api';
import { colors, fonts } from '../theme';
import { departmentLabel } from '../utils/format';
import { usePaged } from '../utils/usePaged';
import { CommunityCard } from './CommunitiesScreen';

export interface ProfileHandle {
  /** Reload publications and communities (after something changed elsewhere). */
  refresh: () => void;
}

interface Props {
  /** Bumped by the shell when a publication is created. */
  refreshTick: number;
  onOpenCommunity: (c: CommunityResponse) => void;
  onDiscover: () => void;
}

type Tab = 'publications' | 'communities';

const ProfileScreen = forwardRef<ProfileHandle, Props>(function ProfileScreen({ refreshTick, onOpenCommunity, onDiscover }, ref) {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('publications');
  const [selected, setSelected] = useState<PublicationResponse | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  // "…" menu on my publications
  const [menuPub, setMenuPub] = useState<PublicationResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editPub, setEditPub] = useState<PublicationResponse | null>(null);
  const [busy, setBusy] = useState(false);

  // communities (small, non paginated list)
  const [communities, setCommunities] = useState<CommunityResponse[]>([]);
  const [commStatus, setCommStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [commError, setCommError] = useState('');
  const [commRefreshing, setCommRefreshing] = useState(false);

  const soft = useCallback((m: string) => toastRef.current.show(m), []);
  const userId = user?.id;

  const postsFetcher = useCallback((_q: string, page: number) => getUserPublications(userId ?? 0, { page, size: 10 }), [userId]);
  const posts = usePaged<PublicationResponse>(postsFetcher, tab === 'publications' && userId !== undefined, '', soft);
  const { reload: reloadPosts, refresh: refreshPosts, setItems: setPostItems, setTotal: setPostTotal } = posts;

  const loadCommunities = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setCommStatus('loading');
    try {
      setCommunities(await getMyCommunities());
      setCommStatus('ready');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Something went wrong.';
      if (mode === 'refresh') toastRef.current.show(msg);
      else {
        setCommError(msg);
        setCommStatus('error');
      }
    } finally {
      setCommRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCommunities('initial');
  }, [loadCommunities]);

  const firstTick = useRef(refreshTick);
  useEffect(() => {
    if (refreshTick !== firstTick.current) {
      firstTick.current = refreshTick;
      reloadPosts();
    }
  }, [refreshTick, reloadPosts]);

  useImperativeHandle(
    ref,
    () => ({
      refresh: () => {
        refreshPosts();
        void loadCommunities('refresh');
      },
    }),
    [refreshPosts, loadCommunities],
  );

  const sharePublication = useCallback(async (p: PublicationResponse) => {
    const excerpt = p.content.length > 240 ? `${p.content.slice(0, 240)}…` : p.content;
    try {
      await Share.share({ title: p.title, message: `${p.title}\n\n${excerpt}\n\n— ${p.author.nomPrenom} · ISETConnect` });
    } catch {
      /* dismissed */
    }
  }, []);

  const openMenu = useCallback((p: PublicationResponse) => {
    setMenuPub(p);
    setConfirmDelete(false);
    setMenuOpen(true);
  }, []);

  const handleCommentAdded = (id: number) => {
    const bump = (p: PublicationResponse) => (p.id === id ? { ...p, commentsCount: p.commentsCount + 1 } : p);
    setPostItems((prev) => prev.map(bump));
    setSelected((s) => (s ? bump(s) : s));
  };

  const handleLikeChange = useCallback((id: number, liked: boolean, likesCount: number) => {
    const update = (p: PublicationResponse) => (p.id === id ? { ...p, liked, likesCount } : p);
    setPostItems((prev) => prev.map(update));
    setSelected((s) => (s ? update(s) : s));
  }, [setPostItems]);

  const startEdit = () => {
    const pub = menuPub;
    setMenuOpen(false);
    // two native modals can't overlap: wait for the sheet to slide out
    setTimeout(() => setEditPub(pub), 320);
  };

  const doDelete = async () => {
    if (!menuPub) return;
    setBusy(true);
    try {
      await deletePublication(menuPub.id);
      setPostItems((prev) => prev.filter((p) => p.id !== menuPub.id));
      setPostTotal((t) => Math.max(0, t - 1));
      setMenuOpen(false);
      toast.show('Publication deleted');
    } catch (e) {
      setMenuOpen(false);
      toast.show(e instanceof ApiError ? e.message : 'Could not delete this publication.');
    } finally {
      setBusy(false);
    }
  };

  const renderPost = useCallback(
    ({ item }: { item: PublicationResponse }) => (
      <PublicationRow publication={item} onPress={setSelected} onShare={sharePublication} onLikeChange={handleLikeChange} onMore={openMenu} />
    ),
    [sharePublication, openMenu, handleLikeChange],
  );

  const renderCommunity = useCallback(
    ({ item }: { item: CommunityResponse }) => <CommunityCard community={item} isOwner={item.ownerId === userId} onPress={onOpenCommunity} />,
    [userId, onOpenCommunity],
  );

  if (!user) return null;

  const dept = user.departmentLabel ?? departmentLabel(user.department);
  const meta = [dept, user.classe].filter(Boolean).join(' · ');
  const pubCount = posts.status === 'ready' ? posts.total : null;
  const commCount = commStatus === 'ready' ? communities.length : null;

  const header = (
    <View>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.avatarWrap}>
            <Avatar name={user.nomPrenom} size={64} />
          </View>
          <View style={styles.topActions}>
            <Pressable onPress={() => setEditProfileOpen(true)} style={({ pressed }) => [styles.outlineBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
              <EditIcon size={14} color={colors.text} />
              <Text style={styles.outlineText}>Edit profile</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.nameLine}>
          <Text style={styles.name}>{user.nomPrenom}</Text>
          <RoleBadge role={user.role} />
        </View>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
        <Text style={styles.email}>{user.email}</Text>

        <Text style={styles.since}>
          Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>

        <View style={styles.stats}>
          <Text style={styles.stat}>
            <Text style={styles.statStrong}>{pubCount ?? '—'}</Text> {pubCount === 1 ? 'Publication' : 'Publications'}
          </Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.stat}>
            <Text style={styles.statStrong}>{commCount ?? '—'}</Text> {commCount === 1 ? 'Community' : 'Communities'}
          </Text>
        </View>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        <TabButton label="Publications" active={tab === 'publications'} indicatorWidth={84} onPress={() => setTab('publications')} />
        <TabButton label="Communities" active={tab === 'communities'} indicatorWidth={88} onPress={() => setTab('communities')} />
      </View>
    </View>
  );

  const footer = (loadingMore: boolean) =>
    loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} /> : <View style={{ height: 24 }} />;

  const refreshControl = (refreshing: boolean, onRefresh: () => void) => (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />
  );

  const postsEmpty =
    posts.status === 'loading' || posts.status === 'idle' ? (
      <FeedSkeleton count={3} />
    ) : posts.status === 'error' ? (
      <StateMessage icon={<AlertCircleIcon size={20} />} title="Unable to load publications" text={posts.error || 'Check your connection and try again.'} action="Retry" onAction={posts.reload} />
    ) : (
      <StateMessage icon={<FileIcon size={20} />} title="No publications yet" text="What you publish on ISETConnect will show up here." />
    );

  const commEmpty =
    commStatus === 'loading' ? (
      <ExploreSkeleton variant="communities" count={3} />
    ) : commStatus === 'error' ? (
      <StateMessage icon={<AlertCircleIcon size={20} />} title="Unable to load communities" text={commError || 'Check your connection and try again.'} action="Retry" onAction={() => loadCommunities('initial')} />
    ) : (
      <StateMessage icon={<UsersIcon size={20} />} title="No communities yet" text="Join a community to follow its publications." action="Discover communities" onAction={onDiscover} />
    );

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top, height: 52 + insets.top }]}>
        <Text style={styles.topTitle}>Profile</Text>
        <Pressable onPress={() => setSignOutOpen(true)} accessibilityLabel="Sign out" style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surface }]}>
          <LogOutIcon size={19} />
        </Pressable>
      </View>

      {tab === 'publications' ? (
        <FlatList
          data={posts.status === 'ready' ? posts.items : []}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderPost}
          onEndReached={posts.loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl(posts.refreshing, posts.refresh)}
          ListHeaderComponent={header}
          ListEmptyComponent={postsEmpty}
          ListFooterComponent={footer(posts.loadingMore)}
        />
      ) : (
        <FlatList
          data={commStatus === 'ready' ? communities : []}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderCommunity}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl(commRefreshing, () => {
            setCommRefreshing(true);
            void loadCommunities('refresh');
          })}
          ListHeaderComponent={header}
          ListEmptyComponent={commEmpty}
          ListFooterComponent={<View style={{ height: 24 }} />}
        />
      )}

      <PublicationDetail publication={selected} onClose={() => setSelected(null)} onCommentAdded={handleCommentAdded} onShare={sharePublication} />

      <EditProfileModal visible={editProfileOpen} onClose={() => setEditProfileOpen(false)} onSaved={() => { setEditProfileOpen(false); toast.show('Profile updated'); }} />

      <EditPublicationModal
        publication={editPub}
        onClose={() => setEditPub(null)}
        onSaved={(updated) => {
          setPostItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setEditPub(null);
          toast.show('Publication updated');
        }}
      />

      {/* publication menu / delete confirmation */}
      <BottomSheet
        visible={menuOpen}
        title={confirmDelete ? 'Delete publication?' : 'Publication'}
        subtitle={confirmDelete ? 'This permanently removes it and its comments. This cannot be undone.' : menuPub?.title}
        onClose={() => setMenuOpen(false)}
      >
        {confirmDelete ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Pressable onPress={doDelete} disabled={busy} style={({ pressed }) => [styles.dangerBtn, pressed && { backgroundColor: '#DC1E29' }]}>
              {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.dangerText}>Delete publication</Text>}
            </Pressable>
            <Pressable onPress={() => setConfirmDelete(false)} style={({ pressed }) => [styles.keepBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
              <Text style={styles.keepText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Pressable onPress={startEdit} style={({ pressed }) => [styles.menuBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
              <EditIcon size={18} color={colors.text} />
              <Text style={styles.menuText}>Edit publication</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmDelete(true)} style={({ pressed }) => [styles.menuBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
              <TrashIcon size={18} color={colors.danger} />
              <Text style={[styles.menuText, { color: colors.danger }]}>Delete publication</Text>
            </Pressable>
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={signOutOpen} title="Sign out?" subtitle="You will need to sign in again to use ISETConnect." onClose={() => setSignOutOpen(false)}>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pressable
            onPress={() => {
              setSignOutOpen(false);
              void signOut();
            }}
            style={({ pressed }) => [styles.dangerBtn, pressed && { backgroundColor: '#DC1E29' }]}
          >
            <Text style={styles.dangerText}>Sign out</Text>
          </Pressable>
          <Pressable onPress={() => setSignOutOpen(false)} style={({ pressed }) => [styles.keepBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
            <Text style={styles.keepText}>Cancel</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
});

export default ProfileScreen;

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
  root: { flex: 1, backgroundColor: colors.black },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.black },
  topTitle: { fontSize: 22, fontFamily: fonts.extrabold, letterSpacing: -0.55, color: colors.text },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: -8 },

  card: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  avatarWrap: { borderRadius: 32, borderWidth: 2, borderColor: colors.black },
  topActions: { flexDirection: 'row', gap: 8 },
  outlineBtn: { height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  outlineText: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  nameLine: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 20, fontFamily: fonts.extrabold, letterSpacing: -0.4, color: colors.text },
  meta: { marginTop: 4, fontSize: 13.5, fontFamily: fonts.regular, color: colors.muted },
  email: { marginTop: 2, fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  since: { marginTop: 10, fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  stats: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stat: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  statStrong: { fontFamily: fonts.bold, color: colors.text },
  statDot: { color: colors.muted },

  tabs: { flexDirection: 'row', height: 42, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14 },
  indicator: { position: 'absolute', bottom: 0, height: 3, borderRadius: 2, backgroundColor: colors.accent },

  menuBtn: { height: 48, borderRadius: 14, paddingHorizontal: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
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
