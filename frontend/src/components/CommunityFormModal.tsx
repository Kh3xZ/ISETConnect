import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { ApiError, CommunityResponse, createCommunity, updateCommunity } from '../services/api';
import { colors, fonts } from '../theme';
import { CloseIcon, GlobeIcon, LockIcon } from './icons';

const NAME_MAX = 120;
const DESC_MAX = 2000;

interface Props {
  visible: boolean;
  /** Pass a community to edit it; omit/null to create a new one. */
  community?: CommunityResponse | null;
  onClose: () => void;
  onSaved: (c: CommunityResponse) => void;
}

export function CommunityFormModal({ visible, community, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const editing = !!community;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [key, setKey] = useState('');
  const [nbMax, setNbMax] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(community?.name ?? '');
    setDescription(community?.description ?? '');
    setIsPrivate(!!community?.isPrivate);
    setKey('');
    setNbMax(community?.nbMax ? String(community.nbMax) : '');
    setError('');
    setSaving(false);
  }, [visible, community]);

  const nbMaxNum = parseInt(nbMax, 10);
  const nameOk = name.trim().length > 0;
  const keyOk = key.length >= 4;
  const nbOk = Number.isInteger(nbMaxNum) && nbMaxNum >= 1;
  // creating a private community needs a key + capacity; editing keeps the old key unless a new one is typed
  const privateOk = !isPrivate || ((editing || keyOk) && nbOk && (key.length === 0 || keyOk));
  const canSave = nameOk && privateOk && !saving;

  let hint = '';
  if (!nameOk) hint = 'Give your community a name.';
  else if (isPrivate && !editing && !keyOk) hint = 'A private community needs a key of at least 4 characters.';
  else if (isPrivate && editing && key.length > 0 && !keyOk) hint = 'The new key needs at least 4 characters.';
  else if (isPrivate && !nbOk) hint = 'Set a capacity of at least 1 member.';

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        isPrivate,
        ...(isPrivate ? { nbMax: nbMaxNum, ...(key ? { key } : {}) } : {}),
      };
      const saved = editing ? await updateCommunity(community!.id, body) : await createCommunity(body);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the community. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={onClose} accessibilityLabel="Close" style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: colors.surface }]}>
              <CloseIcon size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{editing ? 'Edit community' : 'New community'}</Text>
          </View>

          <Pressable
            onPress={save}
            disabled={!canSave}
            style={({ pressed }) => [styles.saveBtn, !canSave && { opacity: 0.4 }, pressed && { backgroundColor: colors.whiteBtnHover }]}
          >
            {saving ? <ActivityIndicator size="small" color={colors.whiteBtnText} /> : <Text style={styles.saveText}>{editing ? 'Save' : 'Create'}</Text>}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!!error && (
            <View style={styles.alert} accessibilityRole="alert">
              <Text style={styles.alertText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={NAME_MAX}
            placeholder="e.g., PFE 2027 — Génie Logiciel"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.counter}>
              {description.length} / {DESC_MAX}
            </Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={DESC_MAX}
            multiline
            textAlignVertical="top"
            placeholder="What is this community about?"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textarea]}
          />

          <Text style={styles.label}>Visibility</Text>
          <View style={[styles.segment, editing && { opacity: 0.6 }]}>
            <SegmentOption
              icon={<GlobeIcon size={15} color={!isPrivate ? colors.whiteBtnText : colors.muted} strokeWidth={2} />}
              label="Public"
              active={!isPrivate}
              disabled={editing}
              onPress={() => setIsPrivate(false)}
            />
            <SegmentOption
              icon={<LockIcon size={15} color={isPrivate ? colors.whiteBtnText : colors.muted} />}
              label="Private"
              active={isPrivate}
              disabled={editing}
              onPress={() => setIsPrivate(true)}
            />
          </View>
          <Text style={styles.help}>
            {editing
              ? 'The visibility of an existing community cannot be changed.'
              : isPrivate
                ? 'Only people with the key can join and see its publications.'
                : 'Anyone on campus can join and read its publications.'}
          </Text>

          {isPrivate && (
            <>
              <Text style={styles.label}>{editing ? 'New join key (optional)' : 'Join key'}</Text>
              <TextInput
                value={key}
                onChangeText={setKey}
                maxLength={100}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={editing ? 'Leave blank to keep the current key' : 'At least 4 characters'}
                placeholderTextColor={colors.muted}
                style={styles.input}
              />

              <Text style={styles.label}>Capacity</Text>
              <TextInput
                value={nbMax}
                onChangeText={(v) => setNbMax(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={5}
                placeholder="Maximum number of members"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </>
          )}

          {!!hint && <Text style={styles.hint}>{hint}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SegmentOption({ icon, label, active, disabled, onPress }: { icon: React.ReactNode; label: string; active: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.segOption, active && styles.segActive]}>
      {icon}
      <Text style={[styles.segText, { color: active ? colors.whiteBtnText : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  header: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.34, color: colors.text },
  saveBtn: { minWidth: 72, height: 34, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.whiteBtnText },

  body: { padding: 16 },
  alert: { marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: 'rgba(244,33,46,0.10)', borderWidth: 1, borderColor: 'rgba(244,33,46,0.35)' },
  alertText: { fontSize: 12.5, lineHeight: 17, fontFamily: fonts.medium, color: colors.danger },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  counter: { marginTop: 16, marginBottom: 8, fontSize: 11.5, fontFamily: fonts.regular, color: colors.muted },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  textarea: { minHeight: 110, lineHeight: 21 },
  segment: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segOption: { flex: 1, height: 36, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segActive: { backgroundColor: colors.whiteBtn },
  segText: { fontSize: 13.5, fontFamily: fonts.semibold },
  help: { marginTop: 8, fontSize: 12, lineHeight: 17, fontFamily: fonts.regular, color: colors.muted },
  hint: { marginTop: 18, fontSize: 12.5, fontFamily: fonts.medium, color: '#FFD400' },
});
