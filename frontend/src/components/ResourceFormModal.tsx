import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ApiError,
  PickedFile,
  ResourceResponse,
  createResource,
  replaceResourceAttachment,
  updateResource,
} from '../services/api';
import { colors, fonts } from '../theme';
import { fileKind, formatBytes } from '../utils/format';
import { CloseIcon, PaperclipIcon } from './icons';

const TITLE_MAX = 200;
const DESC_MAX = 5000;
const MODULE_MAX = 120;
const MAX_BYTES = 20 * 1024 * 1024; // backend limit: 20 MB

interface Props {
  visible: boolean;
  /** Pass a resource to edit it; omit/null to upload a new one. */
  resource?: ResourceResponse | null;
  /** Existing modules, offered as quick picks. */
  modules: string[];
  onClose: () => void;
  /** `warning` is set when the details were saved but the new file could not be uploaded. */
  onSaved: (r: ResourceResponse, warning?: string) => void;
}

export function ResourceFormModal({ visible, resource, modules, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const editing = !!resource;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [module, setModule] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle(resource?.title ?? '');
    setDescription(resource?.description ?? '');
    setModule(resource?.module ?? '');
    setFile(null);
    setError('');
    setSaving(false);
  }, [visible, resource]);

  const titleTrim = title.trim();
  const canSave = titleTrim.length > 0 && !saving;

  const pick = async () => {
    setError('');
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      if (a.size && a.size > MAX_BYTES) {
        setError('This file is larger than 20 MB. Choose a smaller one.');
        return;
      }
      setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size, file: a.file });
    } catch {
      setError("Couldn't open the file picker.");
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const body = { title: titleTrim, description: description.trim() || null, module: module.trim() || null };
    try {
      if (!resource) {
        onSaved(await createResource(body, file));
        return;
      }
      const updated = await updateResource(resource.id, body);
      if (!file) {
        onSaved(updated);
        return;
      }
      try {
        onSaved(await replaceResourceAttachment(resource.id, file));
      } catch (e) {
        onSaved(updated, `Details saved, but the file couldn't be uploaded${e instanceof ApiError ? `: ${e.message}` : '.'}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the resource. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentFile = file?.name ?? (resource?.hasAttachment ? resource.attachmentName : null);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={onClose} accessibilityLabel="Close" style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: colors.surface }]}>
              <CloseIcon size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{editing ? 'Edit resource' : 'New resource'}</Text>
          </View>
          <Pressable onPress={save} disabled={!canSave} style={({ pressed }) => [styles.saveBtn, !canSave && { opacity: 0.4 }, pressed && { backgroundColor: colors.whiteBtnHover }]}>
            {saving ? <ActivityIndicator size="small" color={colors.whiteBtnText} /> : <Text style={styles.saveText}>{editing ? 'Save' : 'Upload'}</Text>}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!!error && (
            <View style={styles.alert} accessibilityRole="alert">
              <Text style={styles.alertText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={TITLE_MAX} placeholder="e.g., Distributed Systems — Lecture notes" placeholderTextColor={colors.muted} style={styles.input} />

          <Text style={styles.label}>Module</Text>
          <TextInput value={module} onChangeText={setModule} maxLength={MODULE_MAX} placeholder="e.g., Java EE" placeholderTextColor={colors.muted} style={styles.input} />
          {modules.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
              {modules.map((m) => (
                <Pressable key={m} onPress={() => setModule(m)} style={[styles.chip, module === m && styles.chipActive]}>
                  <Text style={[styles.chipText, module === m && { color: colors.accent }]}>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

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
            placeholder="What does this resource contain? Who is it for?"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textarea]}
          />

          <Text style={styles.label}>Attachment</Text>
          <Pressable onPress={pick} style={({ pressed }) => [styles.picker, pressed && { backgroundColor: colors.surfaceHover }]}>
            <View style={styles.kind}>
              {currentFile ? <Text style={styles.kindText}>{fileKind(currentFile)}</Text> : <PaperclipIcon size={18} color={colors.accent} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.pickerTitle} numberOfLines={1}>
                {currentFile ?? 'Choose a file'}
              </Text>
              <Text style={styles.pickerSub} numberOfLines={1}>
                {file ? `${formatBytes(file.size)}${editing ? ' · will replace the current file' : ''}`.replace(/^ · /, '') : editing && resource?.hasAttachment ? 'Tap to replace the file' : 'PDF, Word, PowerPoint, images… up to 20 MB (optional)'}
              </Text>
            </View>
            {file && (
              <Pressable onPress={() => setFile(null)} hitSlop={8} accessibilityLabel="Remove selected file">
                <CloseIcon size={16} color={colors.muted} />
              </Pressable>
            )}
          </Pressable>
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
  saveBtn: { minWidth: 76, height: 34, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.whiteBtnText },
  body: { padding: 16 },
  alert: { marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: 'rgba(244,33,46,0.10)', borderWidth: 1, borderColor: 'rgba(244,33,46,0.35)' },
  alertText: { fontSize: 12.5, lineHeight: 17, fontFamily: fonts.medium, color: colors.danger },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  counter: { marginTop: 16, marginBottom: 8, fontSize: 11.5, fontFamily: fonts.regular, color: colors.muted },
  input: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, fontFamily: fonts.regular },
  textarea: { minHeight: 110, lineHeight: 21 },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { borderColor: colors.accent },
  chipText: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.muted },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  kind: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.black, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  kindText: { fontSize: 11.5, fontFamily: fonts.extrabold, color: colors.accent },
  pickerTitle: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  pickerSub: { marginTop: 2, fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
});
