import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { CommunityDetailSheet } from '../components/CommunityDetailSheet';
import { ExploreSkeleton } from '../components/ExploreSkeleton';
import { AlertCircleIcon, CloseIcon, SearchIcon } from '../components/icons';
import { JoinKeySheet } from '../components/JoinKeySheet';
import { RoleBadge } from '../components/RoleBadge';
import { useToast } from '../components/Toast';
import { UserProfileSheet } from '../components/UserProfileSheet';
import { VisibilityBadge } from '../components/VisibilityBadge';
import { useAuth } from '../context/AuthContext';
import {
  ApiError,
  CommunityResponse,
  UserResponse,
  getCommunities,
  joinCommunity,
  leaveCommunity,
  searchUsers,
} from '../services/api';
import { colors, fonts } from '../theme';
import { departmentLabel, monogramOf } from '../utils/format';
import { usePaged } from '../utils/usePaged';

const PAGE_SIZE = 20;

export type Tab = 'people' | 'communities';

export default function ExploreScreen({ onOpenProfile, tabRequest }: { onOpenProfile: () => void; tabRequest?: { tab: Tab; nonce: number } | null }) {
  const { user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('people');
  const [query, setQuery] = useState('');
  const [q, setQ] = useState(''); // debounced
  const [focused, setFocused] = useState(false);

  const [sheetUser, setSheetUser] = useState<UserResponse | null>(null);
  const [sheetCommunity, setSheetCommunity] = useState<CommunityResponse | null>(null);
  const [keyFor, setKeyFor] = useState<CommunityResponse | null>(null);
  const [keyError, setKeyError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (tabRequest) setTab(tabRequest.tab);
  }, [tabRequest]);

  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const softError = useCallback((m: string) => toastRef.current.show(m), []);

  const peopleFetcher = useCallback((term: string, page: number) => searchUsers({ q: term, page, size: PAGE_SIZE }), []);
  const communitiesFetcher = useCallback((term: string, page: number) => getCommunities({ q: term, page, size: PAGE_SIZE }), []);

  const people = usePaged<UserResponse>(peopleFetcher, tab === 'people', q, softError);
  const communities = usePaged<CommunityResponse>(communitiesFetcher, tab === 'communities', q, softError);
  const { setItems: setCommunityItems } = communities;

  // ── Community actions ──────────────────────────────────────────────────────
  const applyUpdate = useCallback(
    (c: CommunityResponse) => {
      setCommunityItems((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      setSheetCommunity((s) => (s && s.id === c.id ? c : s));
    },
    [setCommunityItems],
  );

  const join = async (c: CommunityResponse, key?: string) => {
    setBusyId(c.id);
    setKeyError('');
    try {
      const updated = await joinCommunity(c.id, key);
      applyUpdate(updated);
      setKeyFor(null);
      toast.show(`Joined ${c.name}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not join this community.';
      if (key !== undefined) setKeyError(msg);
      else toast.show(msg);
    } finally {
      setBusyId(null);
    }
  };

  const requestJoin = (c: CommunityResponse) => {
    if (!c.isPrivate) {
      void join(c);
      return;
    }
    setKeyError('');
    if (sheetCommunity) {
      // two native modals can't overlap: close the detail sheet first
      setSheetCommunity(null);
      setTimeout(() => setKeyFor(c), 320);
    } else {
      setKeyFor(c);
    }
  };

  const leave = async (c: CommunityResponse) => {
    setBusyId(c.id);
    try {
      await leaveCommunity(c.id);
      applyUpdate({ ...c, joined: false, membersCount: Math.max(0, c.membersCount - 1) });
      toast.show(`Left ${c.name}`);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : 'Could not leave this community.');
    } finally {
      setBusyId(null);
    }
  };

  const renderPerson = useCallback(
    ({ item }: { item: UserResponse }) => <PersonRow person={item} isMe={item.id === user?.id} onPress={setSheetUser} />,
    [user?.id],
  );

  const renderCommunity = useCallback(
    ({ item }: { item: CommunityResponse }) => (
      <CommunityRow
        community={item}
        isOwner={item.ownerId === user?.id}
        busy={busyId === item.id}
        onView={setSheetCommunity}
        onJoin={requestJoin}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, busyId, sheetCommunity],
  );

  if (!user) return null;

  const searching = q.length > 0;
  const clearSearch = () => {
    setQuery('');
    setQ('');
  };

  const refreshControl = (refreshing: boolean, onRefresh: () => void) => (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />
  );

  const footer = (loadingMore: boolean) =>
    loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} /> : <View style={{ height: 24 }} />;

  const emptyFor = (list: { status: string; error: string; reload: () => void }, kind: Tab) => {
    if (list.status === 'loading' || list.status === 'idle') return <ExploreSkeleton variant={kind} />;
    if (list.status === 'error') {
      return (
        <StateMessage
          icon={<AlertCircleIcon size={20} />}
          title="Unable to reach directory"
          text={list.error || 'Check your connection and try again.'}
          action="Retry"
          onAction={list.reload}
        />
      );
    }
    return (
      <StateMessage
        icon={<SearchIcon size={20} />}
        title={searching ? `No results for “${q}”` : kind === 'people' ? 'No people yet' : 'No communities yet'}
        text={
          searching
            ? kind === 'people'
              ? 'No one matched your search. Try a full name or an ISET email.'
              : 'No community matched your search. Try another name.'
            : kind === 'people'
              ? 'People who join ISETConnect will show up here.'
              : 'Communities created on campus will show up here.'
        }
        action={searching ? 'Clear search' : undefined}
        onAction={clearSearch}
      />
    );
  };

  const countHeader = (status: string, total: number, singular: string, plural: string) =>
    status === 'ready' && total > 0 ? (
      <Text style={styles.count}>
        {total.toLocaleString('en-US')} {total === 1 ? singular : plural}
        {searching ? ` matching “${q}”` : ''}
      </Text>
    ) : null;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Explore</Text>
          <Pressable onPress={onOpenProfile} accessibilityLabel="Open profile summary">
            <Avatar name={user.nomPrenom} size={30} uri={user.profilePictureUrl} userId={user.id} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchShell, focused && { borderColor: colors.accent }]}>
            <SearchIcon size={17} color={focused ? colors.accent : colors.muted} strokeWidth={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={tab === 'people' ? 'Search people by name or email...' : 'Search communities...'}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search"
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable onPress={clearSearch} hitSlop={8} accessibilityLabel="Clear search query" style={styles.clearBtn}>
                <CloseIcon size={13} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          <ExploreTab label="People" active={tab === 'people'} indicatorWidth={48} onPress={() => setTab('people')} />
          <ExploreTab label="Communities" active={tab === 'communities'} indicatorWidth={88} onPress={() => setTab('communities')} />
        </View>
      </View>

      {/* Lists */}
      {tab === 'people' ? (
        <FlatList
          data={people.status === 'ready' ? people.items : []}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderPerson}
          onEndReached={people.loadMore}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl(people.refreshing, people.refresh)}
          ListHeaderComponent={countHeader(people.status, people.total, 'person', 'people')}
          ListEmptyComponent={emptyFor(people, 'people')}
          ListFooterComponent={footer(people.loadingMore)}
        />
      ) : (
        <FlatList
          data={communities.status === 'ready' ? communities.items : []}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderCommunity}
          extraData={busyId}
          onEndReached={communities.loadMore}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl(communities.refreshing, communities.refresh)}
          ListHeaderComponent={countHeader(communities.status, communities.total, 'community', 'communities')}
          ListEmptyComponent={emptyFor(communities, 'communities')}
          ListFooterComponent={footer(communities.loadingMore)}
        />
      )}

      <UserProfileSheet user={sheetUser} isMe={sheetUser?.id === user.id} onClose={() => setSheetUser(null)} />

      <CommunityDetailSheet
        community={sheetCommunity}
        meId={user.id}
        busy={sheetCommunity !== null && busyId === sheetCommunity.id}
        onClose={() => setSheetCommunity(null)}
        onJoin={requestJoin}
        onLeave={leave}
      />

      <JoinKeySheet
        community={keyFor}
        loading={keyFor !== null && busyId === keyFor.id}
        error={keyError}
        onSubmit={(key) => keyFor && join(keyFor, key)}
        onClose={() => setKeyFor(null)}
      />
    </View>
  );
}

// ── Rows ─────────────────────────────────────────────────────────────────────

const PersonRow = memo(function PersonRow({ person: p, isMe, onPress }: { person: UserResponse; isMe: boolean; onPress: (p: UserResponse) => void }) {
  const dept = p.departmentLabel ?? departmentLabel(p.department);
  const meta = [dept, p.classe].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={() => onPress(p)} style={({ pressed }) => [styles.row, { alignItems: 'center' }, pressed && { backgroundColor: 'rgba(22,24,28,0.6)' }]}>
      <Avatar name={p.nomPrenom} size={42} uri={p.profilePictureUrl} userId={p.id} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>
            {p.nomPrenom}
          </Text>
          <RoleBadge role={p.role} />
          {isMe && (
            <View style={styles.youTag}>
              <Text style={styles.youText}>You</Text>
            </View>
          )}
        </View>
        {!!meta && (
          <Text style={styles.sub} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      <View style={styles.outlineBtn}>
        <Text style={styles.outlineText}>View profile</Text>
      </View>
    </Pressable>
  );
});

const CommunityRow = memo(function CommunityRow({
  community: c,
  isOwner,
  busy,
  onView,
  onJoin,
}: {
  community: CommunityResponse;
  isOwner: boolean;
  busy: boolean;
  onView: (c: CommunityResponse) => void;
  onJoin: (c: CommunityResponse) => void;
}) {
  return (
    <Pressable onPress={() => onView(c)} style={({ pressed }) => [styles.row, { alignItems: 'flex-start' }, pressed && { backgroundColor: 'rgba(22,24,28,0.6)' }]}>
      <View style={styles.mono}>
        <Text style={styles.monoText}>{monogramOf(c.name)}</Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameLine}>
          <Text style={[styles.name, { flexShrink: 1 }]} numberOfLines={1}>
            {c.name}
          </Text>
          <VisibilityBadge isPrivate={!!c.isPrivate} />
        </View>

        <Text style={styles.desc} numberOfLines={2}>
          {c.description?.trim() || 'No description provided.'}
        </Text>

        <View style={styles.communityFooter}>
          <Text style={styles.members}>
            {c.membersCount.toLocaleString('en-US')} {c.membersCount === 1 ? 'member' : 'members'}
          </Text>

          <View style={styles.communityActions}>
            <Pressable onPress={() => onView(c)} hitSlop={6} style={styles.viewBtn}>
              <Text style={styles.viewText}>View</Text>
            </Pressable>

            {isOwner ? (
              <View style={[styles.joinBtn, styles.joinedBtn]}>
                <Text style={[styles.joinedText, { color: colors.muted }]}>Owner</Text>
              </View>
            ) : c.joined ? (
              <Pressable onPress={() => onView(c)} style={({ pressed }) => [styles.joinBtn, styles.joinedBtn, pressed && { backgroundColor: colors.surface }]}>
                <Text style={styles.joinedText}>Joined</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => onJoin(c)}
                disabled={busy}
                style={({ pressed }) => [styles.joinBtn, styles.joinPrimary, pressed && { backgroundColor: colors.whiteBtnHover }]}
              >
                {busy ? <ActivityIndicator size="small" color={colors.whiteBtnText} /> : <Text style={styles.joinPrimaryText}>Join</Text>}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
});

// ── Small pieces ─────────────────────────────────────────────────────────────

function ExploreTab({ label, active, indicatorWidth, onPress }: { label: string; active: boolean; indicatorWidth: number; onPress: () => void }) {
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

  header: { backgroundColor: colors.black, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  titleRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontFamily: fonts.extrabold, letterSpacing: -0.55, color: colors.text },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  searchShell: {
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, minWidth: 0, padding: 0, fontSize: 14, fontFamily: fonts.regular, color: colors.text },
  clearBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', height: 42 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14 },
  indicator: { position: 'absolute', bottom: 0, height: 3, borderRadius: 2, backgroundColor: colors.accent },

  count: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.muted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 14.5, fontFamily: fonts.bold, letterSpacing: -0.15, color: colors.text },
  sub: { marginTop: 2, fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  youTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(29,155,240,0.15)' },
  youText: { fontSize: 10.5, fontFamily: fonts.semibold, color: colors.accent },
  outlineBtn: { paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  outlineText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text },

  mono: { width: 42, height: 42, marginTop: 2, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  monoText: { fontSize: 13, fontFamily: fonts.extrabold, color: colors.text },
  desc: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.muted },
  communityFooter: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  members: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted },
  communityActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewBtn: { paddingHorizontal: 10, height: 28, alignItems: 'center', justifyContent: 'center' },
  viewText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.accent },
  joinBtn: { minWidth: 62, paddingHorizontal: 14, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  joinPrimary: { backgroundColor: colors.whiteBtn },
  joinPrimaryText: { fontSize: 12, fontFamily: fonts.bold, color: colors.whiteBtnText },
  joinedBtn: { backgroundColor: colors.black, borderWidth: 1, borderColor: colors.border },
  joinedText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text },

  state: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 72 },
  stateIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stateTitle: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.26, color: colors.text, textAlign: 'center' },
  stateText: { marginTop: 6, maxWidth: 280, fontSize: 13.5, lineHeight: 19, fontFamily: fonts.regular, color: colors.muted, textAlign: 'center' },
  stateBtn: { marginTop: 20, height: 38, paddingHorizontal: 20, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  stateBtnText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.whiteBtnText },
});
