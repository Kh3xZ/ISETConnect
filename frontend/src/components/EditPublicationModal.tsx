import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, PublicationResponse, updatePublication } from '../services/api';
import { colors, fonts } from '../theme';
import { CloseIcon } from './icons';

const TITLE_MAX = 200;
const CONTENT_MAX = 10000;

interface Props {
  publication: PublicationResponse | null;
  onClose: () => void;
  onSaved: (p: PublicationResponse) => void;
}

export function EditPublicationModal({ publication, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!publication) return;
    setTitle(publication.title);
    setContent(publication.content);
    setError('');
    setSaving(false);
  }, [publication]);

  const titleTrim = title.trim();
  const contentTrim = content.trim();
  const changed = !!publication && (titleTrim !== publication.title || contentTrim !== publication.content);
  const canSave = titleTrim.length > 0 && contentTrim.length > 0 && changed && !saving;

  const save = async () => {
    if (!publication || !canSave) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updatePublication(publication.id, { title: titleTrim, content: contentTrim, communityId: publication.communityId });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!publication} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={onClose} accessibilityLabel="Close" style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: colors.surface }]}>
              <CloseIcon size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Edit publication</Text>
          </View>
          <Pressable onPress={save} disabled={!canSave} style={({ pressed }) => [styles.saveBtn, !canSave && { opacity: 0.4 }, pressed && { backgroundColor: colors.whiteBtnHover }]}>
            {saving ? <ActivityIndicator size="small" color={colors.whiteBtnText} /> : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!!error && (
            <View style={styles.alert} accessibilityRole="alert">
              <Text style={styles.alertText}>{error}</Text>
            </View>
          )}

          <View style={styles.counterRow}>
            <Text style={styles.label}>Title</Text>
            <Text style={styles.counter}>
              {title.length} / {TITLE_MAX}
            </Text>
          </View>
          <TextInput value={title} onChangeText={setTitle} maxLength={TITLE_MAX} multiline placeholder="Publication title..." placeholderTextColor={colors.muted} style={styles.titleInput} />

          <View style={styles.counterRow}>
            <Text style={styles.label}>Content</Text>
            <Text style={styles.counter}>
              {content.length.toLocaleString('en-US')} / {CONTENT_MAX.toLocaleString('en-US')}
            </Text>
          </View>
          <TextInput
            value={content}
            onChangeText={setContent}
            maxLength={CONTENT_MAX}
            multiline
            textAlignVertical="top"
            placeholder="Write your publication..."
            placeholderTextColor={colors.muted}
            style={styles.contentInput}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  header: { height: 52, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.34, color: colors.text },
  saveBtn: { minWidth: 72, height: 34, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.whiteBtnText },
  body: { padding: 16 },
  alert: { marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: 'rgba(244,33,46,0.10)', borderWidth: 1, borderColor: 'rgba(244,33,46,0.35)' },
  alertText: { fontSize: 12.5, lineHeight: 17, fontFamily: fonts.medium, color: colors.danger },
  counterRow: { marginTop: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  label: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  counter: { fontSize: 11.5, fontFamily: fonts.regular, color: colors.muted },
  titleInput: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 17, lineHeight: 23, fontFamily: fonts.bold },
  contentInput: { minHeight: 240, padding: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
});
