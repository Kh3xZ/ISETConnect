import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { CommunityFormModal } from '../components/CommunityFormModal';
import { ExploreSkeleton } from '../components/ExploreSkeleton';
import { AlertCircleIcon, ChevronRightIcon, PlusIcon, UsersIcon } from '../components/icons';
import { useToast } from '../components/Toast';
import { VisibilityBadge } from '../components/VisibilityBadge';
import { useAuth } from '../context/AuthContext';
import { ApiError, CommunityResponse, getMyCommunities } from '../services/api';
import { colors, fonts } from '../theme';
import { monogramOf } from '../utils/format';

export interface CommunitiesHandle {
  /** Insert or replace a community (after create / edit / join / leave). */
  upsert: (c: CommunityResponse) => void;
  remove: (id: number) => void;
  refresh: () => void;
}

interface Props {
  onOpenCommunity: (c: CommunityResponse) => void;
  onOpenProfile: () => void;
  onDiscover: () => void;
}

type Tab = 'mine' | 'created';
type Status = 'loading' | 'ready' | 'error';

const CommunitiesScreen = forwardRef<CommunitiesHandle, Props>(function CommunitiesScreen({ onOpenCommunity, onOpenProfile, onDiscover }, ref) {
  const { user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const insets = useSafeAreaInsets();
  const reqRef = useRef(0);

  const [tab, setTab] = useState<Tab>('mine');
  const [items, setItems] = useState<CommunityResponse[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    const id = ++reqRef.current;
    if (mode === 'initial') setStatus('loading');
    try {
      const list = await getMyCommunities();
      if (id !== reqRef.current) return;
      setItems(list);
      setStatus('ready');
    } catch (e) {
      if (id !== reqRef.current) return;
      const msg = e instanceof ApiError ? e.message : 'Something went wrong.';
      if (mode === 'refresh') toastRef.current.show(msg);
      else {
        setError(msg);
        setStatus('error');
      }
    } finally {
      if (id === reqRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const upsert = useCallback((c: CommunityResponse) => {
    setStatus('ready');
    setItems((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...prev]));
  }, []);
  const remove = useCallback((id: number) => setItems((prev) => prev.filter((x) => x.id !== id)), []);
  const refresh = useCallback(() => void load('refresh'), [load]);

  useImperativeHandle(ref, () => ({ upsert, remove, refresh }), [upsert, remove, refresh]);

  const created = useMemo(() => items.filter((c) => c.ownerId === user?.id), [items, user?.id]);
  const data = tab === 'mine' ? items : created;

  const renderItem = useCallback(
    ({ item }: { item: CommunityResponse }) => <CommunityCard community={item} isOwner={item.ownerId === user?.id} onPress={onOpenCommunity} />,
    [user?.id, onOpenCommunity],
  );

  if (!user) return null;

  const empty =
    status === 'loading' ? (
      <ExploreSkeleton variant="communities" count={4} />
    ) : status === 'error' ? (
      <StateMessage
        icon={<AlertCircleIcon size={20} />}
        title="Unable to load communities"
        text={error || 'Check your connection and try again.'}
        action="Retry"
        onAction={() => load('initial')}
      />
    ) : tab === 'mine' ? (
      <StateMessage
        icon={<UsersIcon size={20} />}
        title="No communities yet"
        text="Join a community to follow its publications, or start your own for your class or club."
        action="Discover communities"
        onAction={onDiscover}
      />
    ) : (
      <StateMessage
        icon={<UsersIcon size={20} />}
        title="You haven't created any community"
        text="Create a public space for everyone, or a private one protected by a key."
        action="Create a community"
        onAction={() => setFormOpen(true)}
      />
    );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Communities</Text>
          <Pressable onPress={onOpenProfile} accessibilityLabel="Open profile summary">
            <Avatar name={user.nomPrenom} size={30} />
          </Pressable>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          <TabButton label="My Communities" active={tab === 'mine'} indicatorWidth={104} onPress={() => setTab('mine')} />
          <TabButton label="Created by me" active={tab === 'created'} indicatorWidth={92} onPress={() => setTab('created')} />
        </View>
      </View>

      <FlatList
        data={status === 'ready' ? data : []}
        keyExtractor={(c) => String(c.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load('refresh');
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          status === 'ready' && data.length > 0 ? (
            <Text style={styles.count}>
              {data.length} {data.length === 1 ? 'community' : 'communities'}
            </Text>
          ) : null
        }
        ListEmptyComponent={empty}
      />

      <Pressable
        onPress={() => setFormOpen(true)}
        accessibilityLabel="Create new community"
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.95 }], backgroundColor: '#1A8CD8' }]}
      >
        <PlusIcon size={24} color="#FFFFFF" />
      </Pressable>

      <CommunityFormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(c) => {
          upsert(c);
          setFormOpen(false);
          setTab('created');
          toast.show('Community created');
          onOpenCommunity(c);
        }}
      />
    </View>
  );
});

export default CommunitiesScreen;

export const CommunityCard = memo(function CommunityCard({ community: c, isOwner, onPress }: { community: CommunityResponse; isOwner: boolean; onPress: (c: CommunityResponse) => void }) {
  return (
    <Pressable onPress={() => onPress(c)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(22,24,28,0.6)' }]}>
      <View style={styles.mono}>
        <Text style={styles.monoText}>{monogramOf(c.name)}</Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>
            {c.name}
          </Text>
          <VisibilityBadge isPrivate={!!c.isPrivate} />
          {isOwner && (
            <View style={styles.ownerTag}>
              <Text style={styles.ownerText}>Owner</Text>
            </View>
          )}
        </View>

        <Text style={styles.desc} numberOfLines={2}>
          {c.description?.trim() || 'No description provided.'}
        </Text>

        <Text style={styles.members}>
          {c.membersCount.toLocaleString('en-US')} {c.membersCount === 1 ? 'member' : 'members'}
        </Text>
      </View>

      <View style={{ alignSelf: 'center' }}>
        <ChevronRightIcon size={16} />
      </View>
    </Pressable>
  );
});

function TabButton({ label, active, indicatorWidth, onPress }: { label: string; active: boolean; indicatorWidth: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={({ pressed }) => [styles.tab, pressed && { backgroundColor: 'rgba(22,24,28,0.6)' }]}>
      <Text style={[styles.tabText, { color: active ? colors.text : colors.muted, fontFamily: active ? fonts.bold : fonts.medium }]}>{label}</Text>
      {active && <View style={[styles.indicator, { width: indicatorWidth }]} />}
    </Pressable>
  );
}

function StateMessage({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action: string; onAction: () => void }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>{icon}</View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      <Pressable onPress={onAction} style={({ pressed }) => [styles.stateBtn, pressed && { backgroundColor: colors.whiteBtnHover }]}>
        <Text style={styles.stateBtnText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  header: { backgroundColor: colors.black, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  titleRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontFamily: fonts.extrabold, letterSpacing: -0.55, color: colors.text },
  tabs: { flexDirection: 'row', height: 42 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14 },
  indicator: { position: 'absolute', bottom: 0, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  count: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 12, fontFamily: fonts.medium, color: colors.muted, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  mono: { width: 42, height: 42, marginTop: 2, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  monoText: { fontSize: 13, fontFamily: fonts.extrabold, color: colors.text },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 14.5, fontFamily: fonts.bold, letterSpacing: -0.15, color: colors.text },
  ownerTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(29,155,240,0.15)', borderWidth: 1, borderColor: 'rgba(29,155,240,0.35)' },
  ownerText: { fontSize: 10.5, fontFamily: fonts.semibold, color: colors.accent },
  desc: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.muted },
  members: { marginTop: 8, fontSize: 12, fontFamily: fonts.medium, color: colors.muted },

  fab: { position: 'absolute', right: 16, bottom: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 4 },

  state: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 72 },
  stateIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stateTitle: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.26, color: colors.text, textAlign: 'center' },
  stateText: { marginTop: 6, maxWidth: 290, fontSize: 13.5, lineHeight: 19, fontFamily: fonts.regular, color: colors.muted, textAlign: 'center' },
  stateBtn: { marginTop: 20, height: 38, paddingHorizontal: 20, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  stateBtnText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.whiteBtnText },
});
