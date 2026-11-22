import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { ExploreSkeleton } from '../components/ExploreSkeleton';
import { AlertCircleIcon, CloseIcon, DownloadIcon, FileIcon, PlusIcon, SearchIcon } from '../components/icons';
import { ResourceDetailSheet } from '../components/ResourceDetailSheet';
import { ResourceFormModal } from '../components/ResourceFormModal';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ApiError, ResourceResponse, deleteResource, getResourceDownloadUrl, getResourceModules, getResources } from '../services/api';
import { colors, fonts } from '../theme';
import { fileKind, timeAgo } from '../utils/format';
import { usePaged } from '../utils/usePaged';

const PAGE_SIZE = 15;

export default function ResourcesScreen({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [module, setModule] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);

  const [selected, setSelected] = useState<ResourceResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceResponse | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const loadModules = useCallback(() => {
    getResourceModules()
      .then(setModules)
      .catch(() => {
        /* chips are optional */
      });
  }, []);
  useEffect(loadModules, [loadModules]);

  // usePaged refetches whenever its key changes: encode the search text and the module together
  const key = JSON.stringify({ q, module });
  const fetcher = useCallback(
    (k: string, page: number) => {
      const f = JSON.parse(k) as { q: string; module: string | null };
      return getResources({ q: f.q, module: f.module ?? undefined, page, size: PAGE_SIZE });
    },
    [],
  );
  const soft = useCallback((m: string) => toastRef.current.show(m), []);
  const list = usePaged<ResourceResponse>(fetcher, true, key, soft);
  const { setItems, setTotal, reload } = list;

  const canManage = user?.role === 'PROF' || user?.role === 'ADMIN';
  const canEdit = (r: ResourceResponse) => canManage && (user?.role === 'ADMIN' || r.uploader.id === user?.id);

  const download = useCallback(async (r: ResourceResponse) => {
    setDownloadingId(r.id);
    try {
      const url = await getResourceDownloadUrl(r.id);
      await Linking.openURL(url);
    } catch (e) {
      toastRef.current.show(e instanceof ApiError ? e.message : "Couldn't open the download.");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const handleSaved = (r: ResourceResponse, warning?: string) => {
    setFormOpen(false);
    if (editing) {
      setItems((prev) => prev.map((x) => (x.id === r.id ? r : x)));
      setSelected((s) => (s && s.id === r.id ? r : s));
    } else {
      reload();
    }
    setEditing(null);
    loadModules();
    toast.show(warning ?? (editing ? 'Resource updated' : 'Resource uploaded'));
  };

  const handleDelete = async (r: ResourceResponse) => {
    try {
      await deleteResource(r.id);
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      setTotal((t) => Math.max(0, t - 1));
      setSelected(null);
      loadModules();
      toast.show('Resource deleted');
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : 'Could not delete this resource.');
    }
  };

  const startEdit = (r: ResourceResponse) => {
    setSelected(null);
    // two native modals can't overlap: wait for the sheet to slide out
    setTimeout(() => {
      setEditing(r);
      setFormOpen(true);
    }, 320);
  };

  const renderItem = useCallback(
    ({ item }: { item: ResourceResponse }) => <ResourceRow resource={item} downloading={downloadingId === item.id} onPress={setSelected} onDownload={download} />,
    [downloadingId, download],
  );

  if (!user) return null;

  const filtering = q.length > 0 || module !== null;
  const clearFilters = () => {
    setQuery('');
    setQ('');
    setModule(null);
  };

  const empty =
    list.status === 'loading' || list.status === 'idle' ? (
      <ExploreSkeleton variant="communities" count={5} />
    ) : list.status === 'error' ? (
      <StateMessage icon={<AlertCircleIcon size={20} />} title="Unable to load resources" text={list.error || 'Check your connection and try again.'} action="Retry" onAction={list.reload} />
    ) : filtering ? (
      <StateMessage
        icon={<SearchIcon size={20} />}
        title="No resources found"
        text={q ? `Nothing matched “${q}”${module ? ` in ${module}` : ''}.` : `There is nothing in ${module} yet.`}
        action="Clear filters"
        onAction={clearFilters}
      />
    ) : (
      <StateMessage
        icon={<FileIcon size={20} />}
        title="No resources yet"
        text={canManage ? 'Share course notes, lab guides or past exams with students.' : 'Course notes, lab guides and past exams shared by professors will appear here.'}
        action={canManage ? 'Upload a resource' : undefined}
        onAction={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      />
    );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Resources</Text>
          <Pressable onPress={onOpenProfile} accessibilityLabel="Open profile">
            <Avatar name={user.nomPrenom} size={30} />
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
              placeholder="Search syllabi, lab guides, exams..."
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search resources"
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable onPress={() => { setQuery(''); setQ(''); }} hitSlop={8} accessibilityLabel="Clear search" style={styles.clearBtn}>
                <CloseIcon size={13} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        {modules.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            <Chip label="All" active={module === null} onPress={() => setModule(null)} />
            {modules.map((m) => (
              <Chip key={m} label={m} active={module === m} onPress={() => setModule(module === m ? null : m)} />
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={list.status === 'ready' ? list.items : []}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderItem}
        extraData={downloadingId}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: canManage ? 96 : 24 }}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}
        ListHeaderComponent={
          list.status === 'ready' && list.total > 0 ? (
            <Text style={styles.count}>
              {list.total.toLocaleString('en-US')} {list.total === 1 ? 'resource' : 'resources'}
              {module ? ` in ${module}` : ''}
              {q ? ` matching “${q}”` : ''}
            </Text>
          ) : null
        }
        ListEmptyComponent={empty}
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} /> : null}
      />

      {canManage && (
        <Pressable
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          accessibilityLabel="Upload a resource"
          style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.95 }], backgroundColor: '#1A8CD8' }]}
        >
          <PlusIcon size={24} color="#FFFFFF" />
        </Pressable>
      )}

      <ResourceDetailSheet
        resource={selected}
        canManage={!!selected && canEdit(selected)}
        downloading={selected !== null && downloadingId === selected.id}
        onClose={() => setSelected(null)}
        onDownload={download}
        onEdit={startEdit}
        onDelete={handleDelete}
      />

      <ResourceFormModal
        visible={formOpen}
        resource={editing}
        modules={modules}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />
    </View>
  );
}

const ResourceRow = memo(function ResourceRow({
  resource: r,
  downloading,
  onPress,
  onDownload,
}: {
  resource: ResourceResponse;
  downloading: boolean;
  onPress: (r: ResourceResponse) => void;
  onDownload: (r: ResourceResponse) => void;
}) {
  return (
    <Pressable onPress={() => onPress(r)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(22,24,28,0.6)' }]}>
      <View style={styles.kind}>
        <Text style={styles.kindText}>{r.hasAttachment ? fileKind(r.attachmentName) : 'INFO'}</Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={2}>
          {r.title}
        </Text>

        {!!r.module && (
          <View style={styles.moduleTag}>
            <Text style={styles.moduleText}>{r.module}</Text>
          </View>
        )}

        {!!r.description?.trim() && (
          <Text style={styles.desc} numberOfLines={2}>
            {r.description.trim()}
          </Text>
        )}

        <Text style={styles.meta} numberOfLines={1}>
          {r.uploader.nomPrenom} · {timeAgo(r.createdAt)}
          {r.hasAttachment && r.attachmentName ? ` · ${r.attachmentName}` : ''}
        </Text>
      </View>

      {r.hasAttachment && (
        <Pressable
          onPress={() => onDownload(r)}
          disabled={downloading}
          hitSlop={8}
          accessibilityLabel={`Download ${r.title}`}
          style={({ pressed }) => [styles.dlBtn, pressed && { borderColor: colors.accent }]}
        >
          {downloading ? <ActivityIndicator size="small" color={colors.accent} /> : <DownloadIcon size={16} color={colors.text} />}
        </Pressable>
      )}
    </Pressable>
  );
});

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
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
  searchShell: { height: 42, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, minWidth: 0, padding: 0, fontSize: 14, fontFamily: fonts.regular, color: colors.text },
  clearBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chips: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: { height: 30, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.whiteBtn, borderColor: colors.whiteBtn },
  chipText: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.muted },
  chipTextActive: { color: colors.whiteBtnText, fontFamily: fonts.bold },

  count: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 12, fontFamily: fonts.medium, color: colors.muted, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  kind: { width: 44, height: 44, marginTop: 2, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  kindText: { fontSize: 11.5, fontFamily: fonts.extrabold, color: colors.accent },
  name: { fontSize: 14.5, lineHeight: 20, fontFamily: fonts.bold, letterSpacing: -0.15, color: colors.text },
  moduleTag: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  moduleText: { fontSize: 11, fontFamily: fonts.medium, color: colors.accent },
  desc: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.muted },
  meta: { marginTop: 6, fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  dlBtn: { width: 36, height: 36, marginTop: 4, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  fab: { position: 'absolute', right: 16, bottom: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 4 },

  state: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 72 },
  stateIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stateTitle: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.26, color: colors.text, textAlign: 'center' },
  stateText: { marginTop: 6, maxWidth: 280, fontSize: 13.5, lineHeight: 19, fontFamily: fonts.regular, color: colors.muted, textAlign: 'center' },
  stateBtn: { marginTop: 20, height: 38, paddingHorizontal: 20, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  stateBtnText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.whiteBtnText },
});
