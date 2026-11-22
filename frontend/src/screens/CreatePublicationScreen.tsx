import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { BottomSheet } from '../components/BottomSheet';
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIcon,
  GlobeIcon,
  HashIcon,
  SearchIcon,
  UsersIcon,
} from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { ApiError, CommunityResponse, PublicationResponse, createPublication, getMyCommunities } from '../services/api';
import { colors, fonts } from '../theme';
import { departmentLabel, ROLE_LABELS } from '../utils/format';

// Same limits as the backend (PublicationRequest)
const TITLE_MAX = 200;
const CONTENT_MAX = 10000;
const WARN = '#FFD400';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPublished: (p: PublicationResponse) => void;
  /** Pre-selects a community ("Post in community"). */
  presetCommunity?: CommunityResponse | null;
}

export default function CreatePublicationScreen({ visible, onClose, onPublished, presetCommunity }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const titleRef = useRef<TextInput>(null);
  const contentRef = useRef<TextInput>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [community, setCommunity] = useState<CommunityResponse | null>(null);
  const [communities, setCommunities] = useState<CommunityResponse[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitiesError, setCommunitiesError] = useState('');
  const [query, setQuery] = useState('');

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // a community pre-selected by "Post in community" is not a draft by itself
  const hasDraft = title.trim().length > 0 || content.trim().length > 0 || (community !== null && community.id !== presetCommunity?.id);

  const resetDraft = useCallback(() => {
    setTitle('');
    setContent('');
    setCommunity(null);
    setError('');
    setQuery('');
  }, []);

  // slide in / out
  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (presetCommunity) setCommunity(presetCommunity);
      Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() =>
        titleRef.current?.focus(),
      );
      setCommunitiesLoading(true);
      setCommunitiesError('');
      getMyCommunities()
        .then(setCommunities)
        .catch((e) => setCommunitiesError(e instanceof ApiError ? e.message : "Couldn't load communities."))
        .finally(() => setCommunitiesLoading(false));
    } else {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, anim]);

  const handleBack = useCallback(() => {
    if (publishing) return;
    if (hasDraft) setDiscardOpen(true);
    else {
      resetDraft();
      onClose();
    }
  }, [publishing, hasDraft, onClose, resetDraft]);

  // Android hardware back
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pickerOpen || discardOpen) return false;
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [visible, pickerOpen, discardOpen, handleBack]);

  const onTitleChange = (value: string) => {
    // titles are single-line: Enter jumps to the content field
    if (value.includes('\n')) {
      setTitle(value.replace(/\n/g, ''));
      contentRef.current?.focus();
      return;
    }
    setTitle(value);
    if (error) setError('');
  };

  const filteredCommunities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q));
  }, [communities, query]);

  if (!mounted || !user) return null;

  const titleTrim = title.trim();
  const contentTrim = content.trim();
  const isValid = titleTrim.length > 0 && contentTrim.length > 0;
  const canPublish = isValid && !publishing;

  let message = 'Both title and content are required to publish.';
  let messageColor: string = colors.muted;
  if (title.length >= TITLE_MAX) {
    message = 'Title reached the 200-character limit.';
    messageColor = colors.danger;
  } else if (content.length >= CONTENT_MAX) {
    message = 'Content reached the 10,000-character limit.';
    messageColor = colors.danger;
  } else if (!titleTrim && !contentTrim) {
    // default
  } else if (!titleTrim) {
    message = 'Add a publication title to continue.';
    messageColor = WARN;
  } else if (!contentTrim) {
    message = 'Write your publication content to enable Publish.';
    messageColor = WARN;
  } else {
    message = community ? `Ready to publish in ${community.name}` : 'Ready to publish to ISETConnect feed';
    messageColor = colors.accent;
  }

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    setError('');
    try {
      const created = await createPublication({ title: titleTrim, content: contentTrim, communityId: community?.id ?? null });
      resetDraft();
      onPublished(created);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Network error while publishing. Please retry.');
    } finally {
      setPublishing(false);
    }
  };

  const discard = () => {
    setDiscardOpen(false);
    resetDraft();
    onClose();
  };

  const chooseCommunity = (c: CommunityResponse | null) => {
    setCommunity(c);
    setPickerOpen(false);
    setQuery('');
  };

  const authorMeta = [ROLE_LABELS[user.role], user.classe ?? departmentLabel(user.department)].filter(Boolean).join(' · ');

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] },
      ]}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* 1. Header */}
        <View style={[styles.header, { paddingTop: insets.top, height: 52 + insets.top }]}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={handleBack}
              accessibilityLabel="Go back to feed"
              style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: colors.surface }]}
            >
              <ChevronLeftIcon size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>New publication</Text>
          </View>

          <Pressable
            onPress={publish}
            disabled={!canPublish}
            style={({ pressed }) => [styles.publishBtn, !canPublish && { opacity: 0.4 }, pressed && { backgroundColor: colors.whiteBtnHover }]}
          >
            {publishing && <ActivityIndicator size="small" color={colors.whiteBtnText} />}
            <Text style={styles.publishText}>{publishing ? 'Publishing...' : 'Publish'}</Text>
          </Pressable>
        </View>

        {/* 2. Community selector bar */}
        <View style={styles.communityBar}>
          {community ? (
            <View style={styles.selectedPill}>
              <Pressable onPress={() => setPickerOpen(true)} style={styles.selectedMain} accessibilityLabel="Change community">
                <View style={styles.cBadge}>
                  <Text style={styles.cBadgeText}>c/</Text>
                </View>
                <Text style={styles.selectedName} numberOfLines={1}>
                  {community.name}
                </Text>
                <Text style={styles.selectedDot}>·</Text>
                <Text style={styles.selectedMeta} numberOfLines={1}>
                  {community.membersCount} {community.membersCount === 1 ? 'member' : 'members'}
                </Text>
              </Pressable>
              <Pressable onPress={() => setCommunity(null)} hitSlop={8} accessibilityLabel="Remove selected community" style={styles.removeBtn}>
                <CloseIcon size={14} color={colors.muted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.trigger, pressed && { backgroundColor: colors.surfaceHover }]}
            >
              <UsersIcon size={14} color={colors.accent} strokeWidth={2} />
              <Text style={styles.triggerText}>Choose community (optional)</Text>
              <ChevronDownIcon size={14} />
            </Pressable>
          )}
        </View>

        {/* 3. Canvas */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.canvas} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!!error && (
            <View style={styles.alert} accessibilityRole="alert">
              <AlertCircleIcon size={16} color={colors.danger} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Failed to publish</Text>
                <Text style={styles.alertDetail}>{error}</Text>
              </View>
              <Pressable onPress={publish} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.composerRow}>
            <View style={{ marginTop: 2 }}>
              <Avatar name={user.nomPrenom} size={38} uri={user.profilePictureUrl} userId={user.id} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.authorLine}>
                <Text style={styles.authorName}>{user.nomPrenom}</Text>
                {!!authorMeta && <Text style={styles.authorMeta}>· {authorMeta}</Text>}
              </View>

              <TextInput
                ref={titleRef}
                value={title}
                onChangeText={onTitleChange}
                maxLength={TITLE_MAX}
                multiline
                placeholder="Publication title..."
                placeholderTextColor={colors.muted}
                accessibilityLabel="Publication title"
                style={styles.titleInput}
              />

              <View style={styles.divider} />

              <TextInput
                ref={contentRef}
                value={content}
                onChangeText={(v) => {
                  setContent(v);
                  if (error) setError('');
                }}
                maxLength={CONTENT_MAX}
                multiline
                textAlignVertical="top"
                placeholder="Share a question, resource, project update, or academic discussion..."
                placeholderTextColor={colors.muted}
                accessibilityLabel="Publication content"
                style={styles.contentInput}
              />
            </View>
          </View>
        </ScrollView>

        {/* 4. Bottom toolbar */}
        <View style={[styles.toolbar, { paddingBottom: insets.bottom }]}>
          <View style={styles.validation}>
            <Text style={[styles.validationText, { color: messageColor }]} numberOfLines={1}>
              {message}
            </Text>
          </View>

          <View style={styles.toolbarRow}>
            <View style={styles.toolbarLeft}>
              <Pressable
                onPress={() => setPickerOpen(true)}
                accessibilityLabel="Select campus community"
                style={({ pressed }) => [styles.hashBtn, (community || pressed) && { backgroundColor: 'rgba(29,155,240,0.15)' }]}
              >
                <HashIcon size={18} color={colors.accent} />
              </Pressable>
              {hasDraft && (
                <Pressable
                  onPress={() => {
                    resetDraft();
                    titleRef.current?.focus();
                  }}
                  style={({ pressed }) => [styles.clearBtn, pressed && { backgroundColor: colors.surface }]}
                >
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.counters}>
              <Counter count={title.length} max={TITLE_MAX} warn={180} />
              <View style={styles.counterDivider} />
              <Counter count={content.length} max={CONTENT_MAX} warn={9500} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Community picker */}
      <BottomSheet
        visible={pickerOpen}
        title="Select a community"
        subtitle="Optional · Target a campus group or publish to general feed"
        onClose={() => setPickerOpen(false)}
      >
        <View style={styles.search}>
          <View style={styles.searchIcon} pointerEvents="none">
            <SearchIcon size={15} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Filter communities..."
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>

        <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {query.trim().length === 0 && (
            <OptionRow
              icon={<GlobeIcon size={16} color={colors.text} />}
              title="General Campus Feed"
              subtitle="No specific community"
              selected={community === null}
              onPress={() => chooseCommunity(null)}
            />
          )}

          {communitiesLoading && <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />}

          {!communitiesLoading &&
            filteredCommunities.map((c) => (
              <OptionRow
                key={c.id}
                icon={<Text style={styles.optionC}>c/</Text>}
                title={c.name}
                subtitle={`${c.membersCount} ${c.membersCount === 1 ? 'member' : 'members'}${c.description ? ` · ${c.description}` : ''}`}
                selected={community?.id === c.id}
                onPress={() => chooseCommunity(c)}
              />
            ))}

          {!communitiesLoading && filteredCommunities.length === 0 && (
            <Text style={styles.noResults}>
              {communitiesError
                ? communitiesError
                : query.trim()
                  ? `No communities match "${query.trim()}".`
                  : "You haven't joined any community yet."}
            </Text>
          )}
        </ScrollView>
      </BottomSheet>

      {/* Discard confirmation */}
      <BottomSheet
        visible={discardOpen}
        title="Discard publication?"
        subtitle="Your unsaved title and content will be lost if you return to the feed now."
        onClose={() => setDiscardOpen(false)}
      >
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pressable onPress={discard} style={({ pressed }) => [styles.discardBtn, pressed && { backgroundColor: '#DC1E29' }]}>
            <Text style={styles.discardText}>Discard draft</Text>
          </Pressable>
          <Pressable onPress={() => setDiscardOpen(false)} style={({ pressed }) => [styles.keepBtn, pressed && { backgroundColor: colors.surfaceHover }]}>
            <Text style={styles.keepText}>Keep editing</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </Animated.View>
  );
}

function Counter({ count, max, warn }: { count: number; max: number; warn: number }) {
  const R = 7.5;
  const C = 2 * Math.PI * R;
  const ratio = Math.min(count / max, 1);
  const color = count >= max ? colors.danger : count >= warn ? WARN : colors.accent;
  const textColor = count >= max ? colors.danger : count >= warn ? WARN : colors.muted;
  return (
    <View style={styles.counter}>
      <Text style={[styles.counterText, { color: textColor, fontFamily: count >= warn ? fonts.semibold : fonts.medium }]}>
        {count.toLocaleString('en-US')} / {max.toLocaleString('en-US')}
      </Text>
      <Svg width={18} height={18} viewBox="0 0 20 20" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={10} cy={10} r={R} fill="none" stroke={colors.border} strokeWidth={2} />
        <Circle
          cx={10}
          cy={10}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${C}`}
          strokeDashoffset={C * (1 - ratio)}
        />
      </Svg>
    </View>
  );
}

function OptionRow({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surface }]}>
      <View style={styles.optionIcon}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.optionTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.optionSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {selected && <CheckIcon size={18} color={colors.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.black, zIndex: 20, elevation: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.black,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtn: { width: 44, height: 44, marginLeft: -4, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.34, color: colors.text },
  publishBtn: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.whiteBtn,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  publishText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.whiteBtnText },

  communityBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
  },
  trigger: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerText: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.accent },
  selectedPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(29,155,240,0.45)',
  },
  selectedMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cBadge: { width: 20, height: 20, borderRadius: 6, backgroundColor: 'rgba(29,155,240,0.15)', alignItems: 'center', justifyContent: 'center' },
  cBadgeText: { fontSize: 11, fontFamily: fonts.bold, color: colors.accent },
  selectedName: { flexShrink: 1, fontSize: 12.5, fontFamily: fonts.bold, color: colors.accent },
  selectedDot: { color: colors.border },
  selectedMeta: { flexShrink: 1, fontSize: 11.5, fontFamily: fonts.regular, color: colors.muted },
  removeBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  canvas: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(244,33,46,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(244,33,46,0.35)',
  },
  alertTitle: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.danger },
  alertDetail: { marginTop: 2, fontSize: 12.5, lineHeight: 17, fontFamily: fonts.regular, color: '#D1D5DB' },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.whiteBtn },
  retryText: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.whiteBtnText },

  composerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  authorLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  authorName: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.text },
  authorMeta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  titleInput: {
    padding: 0,
    fontSize: 19,
    lineHeight: 25,
    fontFamily: fonts.bold,
    letterSpacing: -0.38,
    color: colors.text,
  },
  divider: { marginVertical: 12, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  contentInput: {
    minHeight: 210,
    padding: 0,
    fontSize: 16,
    lineHeight: 25,
    fontFamily: fonts.regular,
    color: colors.text,
  },

  toolbar: { backgroundColor: colors.black, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  validation: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  validationText: { fontSize: 11.5, fontFamily: fonts.medium },
  toolbarRow: { height: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hashBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  clearBtn: { paddingHorizontal: 10, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 11.5, fontFamily: fonts.medium, color: colors.muted },
  counters: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterText: { fontSize: 11.5 },
  counterDivider: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: colors.border },

  search: { marginTop: 4, marginBottom: 8, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    height: 40,
    paddingLeft: 36,
    paddingRight: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 13.5,
    fontFamily: fonts.regular,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  optionC: { fontSize: 13, fontFamily: fonts.bold, color: colors.accent },
  optionTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  optionSub: { marginTop: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  noResults: { paddingVertical: 32, textAlign: 'center', fontSize: 13, fontFamily: fonts.regular, color: colors.muted },

  discardBtn: { height: 44, borderRadius: 999, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  discardText: { fontSize: 14, fontFamily: fonts.bold, color: '#FFFFFF' },
  keepBtn: { height: 44, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  keepText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
});
