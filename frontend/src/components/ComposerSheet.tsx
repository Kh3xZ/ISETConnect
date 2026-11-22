import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ApiError, CommunityResponse, PublicationResponse, createPublication, getMyCommunities } from '../services/api';
import { colors, fonts } from '../theme';
import { departmentLabel, ROLE_LABELS } from '../utils/format';
import { Avatar } from './Avatar';

const TITLE_MAX = 120;
const CONTENT_MAX = 1200;

interface Props {
  visible: boolean;
  onClose: () => void;
  onPublished: (p: PublicationResponse) => void;
}

export function ComposerSheet({ visible, onClose, onPublished }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [communityId, setCommunityId] = useState<number | null>(null);
  const [communities, setCommunities] = useState<CommunityResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      getMyCommunities().then(setCommunities).catch(() => setCommunities([]));
    } else {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  if (!mounted || !user) return null;

  const canPublish = title.trim().length >= 3 && content.trim().length >= 5 && !submitting;

  const publish = async () => {
    if (!canPublish) return;
    setSubmitting(true);
    setError('');
    try {
      const created = await createPublication({ title: title.trim(), content: content.trim(), communityId });
      setTitle('');
      setContent('');
      setCommunityId(null);
      onPublished(created);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not publish. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const meta = [ROLE_LABELS[user.role], departmentLabel(user.department), user.classe].filter(Boolean).join(' · ');

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop, opacity: anim }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            { paddingBottom: 20 + insets.bottom, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.heading}>New Publication</Text>
            <Pressable
              onPress={publish}
              disabled={!canPublish}
              style={({ pressed }) => [styles.publish, !canPublish && { opacity: 0.4 }, pressed && { backgroundColor: colors.whiteBtnHover }]}
            >
              {submitting ? <ActivityIndicator size="small" color={colors.whiteBtnText} /> : <Text style={styles.publishText}>Publish</Text>}
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingTop: 14 }}>
            <View style={styles.author}>
              <Avatar name={user.nomPrenom} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{user.nomPrenom}</Text>
                <Text style={styles.authorMeta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
              <Chip label="General Campus" active={communityId === null} onPress={() => setCommunityId(null)} />
              {communities.map((c) => (
                <Chip key={c.id} label={c.name} active={communityId === c.id} onPress={() => setCommunityId(c.id)} />
              ))}
            </ScrollView>

            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={TITLE_MAX}
              placeholder="Publication title (e.g., Distributed Systems Lab Notes)"
              placeholderTextColor={colors.muted}
              style={styles.titleInput}
            />

            <View>
              <TextInput
                value={content}
                onChangeText={setContent}
                maxLength={CONTENT_MAX}
                multiline
                textAlignVertical="top"
                placeholder="Share an announcement, technical question, or academic resource with ISET..."
                placeholderTextColor={colors.muted}
                style={styles.contentInput}
              />
              <View style={styles.counterRow}>
                <Text style={styles.hint}>Visible across ISETConnect timeline</Text>
                <Text style={styles.hint}>
                  {content.length} / {CONTENT_MAX}
                </Text>
              </View>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: colors.black,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cancel: { fontSize: 14, fontFamily: fonts.medium, color: colors.muted },
  heading: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  publish: { minWidth: 76, height: 34, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  publishText: { fontSize: 13, fontFamily: fonts.bold, color: colors.whiteBtnText },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  authorMeta: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { borderColor: colors.accent },
  chipText: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted },
  titleInput: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  contentInput: {
    minHeight: 120,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
  counterRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  hint: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted },
  error: { fontSize: 13, fontFamily: fonts.medium, color: colors.danger },
});
