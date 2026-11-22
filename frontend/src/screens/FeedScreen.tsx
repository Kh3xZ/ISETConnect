import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { FeedSkeleton } from '../components/FeedSkeleton';
import { AlertCircleIcon, FileIcon, LogoMark, PlusIcon, RefreshIcon } from '../components/icons';
import { PublicationDetail } from '../components/PublicationDetail';
import { PublicationRow } from '../components/PublicationRow';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ApiError, PublicationResponse, getDepartmentFeed, getPublications } from '../services/api';
import { colors, fonts } from '../theme';

const PAGE_SIZE = 10;

type Filter = 'all' | 'department';
type Status = 'loading' | 'ready' | 'error';

export interface FeedHandle {
  /** Insert a freshly created publication at the top of the feed. */
  prepend: (p: PublicationResponse) => void;
  scrollTop: () => void;
}

interface Props {
  onCompose: () => void;
  onOpenProfile: () => void;
}

const FeedScreen = forwardRef<FeedHandle, Props>(function FeedScreen({ onCompose, onOpenProfile }, ref) {
  const { user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const insets = useSafeAreaInsets();

  const listRef = useRef<FlatList<PublicationResponse>>(null);
  const reqRef = useRef(0);

  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<PublicationResponse[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selected, setSelected] = useState<PublicationResponse | null>(null);

  const department = filter === 'department' ? user?.department ?? undefined : undefined;

  // ── Data loading ───────────────────────────────────────────────────────────
  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const id = ++reqRef.current;
      if (mode === 'initial') setStatus('loading');
      try {
        const res = department ? await getDepartmentFeed(department, { page: 0, size: PAGE_SIZE }) : await getPublications({ page: 0, size: PAGE_SIZE });
        if (id !== reqRef.current) return;
        setItems(res.content);
        setPage(res.page);
        setLast(res.last);
        setStatus('ready');
      } catch (e) {
        if (id !== reqRef.current) return;
        const msg = e instanceof ApiError ? e.message : 'Something went wrong.';
        if (mode === 'refresh') {
          toastRef.current.show(msg); // keep the current list on screen
        } else {
          setErrorMsg(msg);
          setStatus('error');
        }
      } finally {
        if (id === reqRef.current) setRefreshing(false);
      }
    },
    [department],
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load('refresh');
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || last || status !== 'ready') return;
    const id = reqRef.current;
    setLoadingMore(true);
    try {
      const res = department ? await getDepartmentFeed(department, { page: page + 1, size: PAGE_SIZE }) : await getPublications({ page: page + 1, size: PAGE_SIZE });
      if (id !== reqRef.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.content.filter((p) => !seen.has(p.id))];
      });
      setPage(res.page);
      setLast(res.last);
    } catch (e) {
      toastRef.current.show(e instanceof ApiError ? e.message : "Couldn't load more publications.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, last, status, page, department]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const scrollTop = useCallback(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), []);

  const changeFilter = (next: Filter) => {
    if (next === filter) return;
    setFilter(next);
    scrollTop();
  };

  const sharePublication = useCallback(async (p: PublicationResponse) => {
    const excerpt = p.content.length > 240 ? `${p.content.slice(0, 240)}…` : p.content;
    try {
      await Share.share({ title: p.title, message: `${p.title}\n\n${excerpt}\n\n— ${p.author.nomPrenom} · ISETConnect` });
    } catch {
      /* user dismissed / unsupported */
    }
  }, []);

  const prepend = useCallback(
    (pub: PublicationResponse) => {
      const visibleInFeed = filter === 'all' || pub.author.department === user?.department;
      if (visibleInFeed) setItems((prev) => [pub, ...prev.filter((p) => p.id !== pub.id)]);
      setStatus('ready');
      scrollTop();
    },
    [filter, user?.department, scrollTop],
  );

  useImperativeHandle(ref, () => ({ prepend, scrollTop }), [prepend, scrollTop]);

  const handleCommentAdded = (publicationId: number) => {
    const bump = (p: PublicationResponse) => (p.id === publicationId ? { ...p, commentsCount: p.commentsCount + 1 } : p);
    setItems((prev) => prev.map(bump));
    setSelected((s) => (s ? bump(s) : s));
  };

  const handleLikeChange = useCallback((publicationId: number, liked: boolean, likesCount: number) => {
    const update = (p: PublicationResponse) => (p.id === publicationId ? { ...p, liked, likesCount } : p);
    setItems((prev) => prev.map(update));
    setSelected((selectedPub) => (selectedPub ? update(selectedPub) : selectedPub));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PublicationResponse }) => (
      <PublicationRow publication={item} onPress={setSelected} onShare={sharePublication} onLikeChange={handleLikeChange} />
    ),
    [sharePublication, handleLikeChange],
  );

  if (!user) return null;

  const busy = refreshing || status === 'loading';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.brandRow}>
          <Pressable onPress={scrollTop} style={styles.brand} accessibilityLabel="ISETConnect Home — scroll to top">
            <View style={styles.logoBox}>
              <LogoMark size={16} accent={colors.accent} />
            </View>
            <Text style={styles.brandText}>ISETConnect</Text>
          </Pressable>

          <View style={styles.headerRight}>
            <Pressable
              onPress={() => {
                scrollTop();
                setRefreshing(true);
                void load('refresh');
              }}
              accessibilityLabel="Refresh feed"
              style={({ pressed }) => [styles.headerBtn, pressed && { backgroundColor: colors.surface }]}
            >
              {busy ? <ActivityIndicator size="small" color={colors.accent} /> : <RefreshIcon size={16} />}
            </Pressable>
            <Pressable onPress={onOpenProfile} accessibilityLabel="Open profile summary">
              <Avatar name={user.nomPrenom} size={32} />
            </Pressable>
          </View>
        </View>

        <View style={styles.tabs}>
          <FilterTab label="All Feed" active={filter === 'all'} indicatorWidth={62} onPress={() => changeFilter('all')} />
          <FilterTab label="My Department" active={filter === 'department'} indicatorWidth={96} onPress={() => changeFilter('department')} />
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={status === 'ready' ? items : []}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}
        ListEmptyComponent={
          status === 'loading' ? (
            <FeedSkeleton />
          ) : status === 'error' ? (
            <StateMessage
              icon={<AlertCircleIcon size={22} color={colors.danger} />}
              title="Unable to load publications"
              text={errorMsg || "We couldn't reach the server. Check your connection and try again."}
              action="Retry"
              onAction={() => load('initial')}
            />
          ) : (
            <StateMessage
              icon={<FileIcon size={22} />}
              title="No publications yet"
              text={
                filter === 'department'
                  ? 'Nobody in your department has published anything yet.'
                  : 'Be the first to share an academic update, lab resource, or announcement with your campus.'
              }
              action="Create publication"
              onAction={onCompose}
            />
          )
        }
        ListFooterComponent={
          status === 'ready' && items.length > 0 ? (
            <View style={styles.footer}>
              {last ? (
                <Text style={styles.endText}>You're all caught up on campus publications.</Text>
              ) : (
                <Pressable onPress={loadMore} style={({ pressed }) => [styles.moreBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
                  {loadingMore ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={styles.moreText}>Load older publications</Text>}
                </Pressable>
              )}
            </View>
          ) : undefined
        }
      />

      <Pressable
        onPress={onCompose}
        accessibilityLabel="Create new publication"
        style={({ pressed }) => [styles.fab, { bottom: 20 }, pressed && { transform: [{ scale: 0.95 }], backgroundColor: '#1A8CD8' }]}
      >
        <PlusIcon size={24} color="#FFFFFF" />
      </Pressable>

      <PublicationDetail publication={selected} onClose={() => setSelected(null)} onCommentAdded={handleCommentAdded} onShare={sharePublication} />
    </View>
  );
});

export default FeedScreen;

function FilterTab({ label, active, indicatorWidth, onPress }: { label: string; active: boolean; indicatorWidth: number; onPress: () => void }) {
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
  brandRow: { height: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 17, fontFamily: fonts.extrabold, letterSpacing: -0.43, color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', height: 42 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14 },
  indicator: { position: 'absolute', bottom: 0, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  footer: { paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center' },
  endText: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  moreBtn: { minWidth: 160, height: 38, paddingHorizontal: 20, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  fab: { position: 'absolute', right: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  state: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 64 },
  stateIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stateTitle: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.26, color: colors.text, textAlign: 'center' },
  stateText: { marginTop: 6, maxWidth: 270, fontSize: 13, lineHeight: 19, fontFamily: fonts.regular, color: colors.muted, textAlign: 'center' },
  stateBtn: { marginTop: 20, height: 40, paddingHorizontal: 20, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  stateBtnText: { fontSize: 13, fontFamily: fonts.bold, color: colors.whiteBtnText },
});
