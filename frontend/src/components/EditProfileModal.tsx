import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ApiError, PickedFile, UpdateProfileBody, UserResponse, removeProfilePicture, updateMe, uploadProfilePicture } from '../services/api';
import { colors, fonts } from '../theme';
import { departmentLabel } from '../utils/format';
import { Avatar } from './Avatar';
import { CloseIcon } from './icons';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // backend limit: 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditProfileModal({ visible, onClose, onSaved }: Props) {
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [classe, setClasse] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [removeRequested, setRemoveRequested] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setName(user.nomPrenom);
    setClasse(user.classe ?? '');
    setPassword('');
    setConfirm('');
    setError('');
    setSaving(false);
    setUploading(false);
    setPicked(null);
    setRemoveRequested(false);
    // Only re-seed when the modal opens: updateUser() after Save must not discard form state.
  }, [visible, user?.id]);

  if (!user) return null;

  const nameTrim = name.trim();
  const classeTrim = classe.trim();
  const nameChanged = nameTrim !== user.nomPrenom;
  // the API can't clear a class, so only a non-empty new value counts as a change
  const classeChanged = classeTrim.length > 0 && classeTrim !== (user.classe ?? '');
  const wantsPassword = password.length > 0 || confirm.length > 0;
  const passwordOk = !wantsPassword || (password.length >= 6 && password === confirm);

  const dirty = nameChanged || classeChanged || wantsPassword || !!picked || removeRequested;
  const canSave = nameTrim.length > 0 && passwordOk && dirty && !saving && !uploading;

  let hint = '';
  if (nameTrim.length === 0) hint = 'Your name cannot be empty.';
  else if (wantsPassword && password.length < 6) hint = 'The new password needs at least 6 characters.';
  else if (wantsPassword && password !== confirm) hint = 'The two passwords do not match.';

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const body: UpdateProfileBody = {};
      if (nameChanged) body.nomPrenom = nameTrim;
      if (classeChanged) body.classe = classeTrim;
      if (wantsPassword) body.password = password;

      let updated: UserResponse | null = null;
      if (Object.keys(body).length > 0) updated = await updateMe(body);
      if (picked) {
        updated = await uploadProfilePicture(picked);
      } else if (removeRequested) {
        updated = await removeProfilePicture();
      }

      if (updated) updateUser(updated);
      setPicked(null);
      setRemoveRequested(false);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    setError('');
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!asked.granted) {
            setError('Allow photo library access to choose a profile picture.');
            return;
          }
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.mimeType && !ALLOWED_IMAGE_TYPES.includes(asset.mimeType)) {
        setError('Choose a JPEG, PNG or WebP image.');
        return;
      }
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
        setError('This image is larger than 5 MB. Choose a smaller one.');
        return;
      }
      const lowerUri = (asset.fileName ?? asset.uri).toLowerCase();
      const mime =
        asset.mimeType && ALLOWED_IMAGE_TYPES.includes(asset.mimeType)
          ? asset.mimeType
          : lowerUri.endsWith('.png')
            ? 'image/png'
            : lowerUri.endsWith('.webp')
              ? 'image/webp'
              : 'image/jpeg';
      const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
      const file: PickedFile = {
        uri: asset.uri,
        name: `profile-${Date.now()}.${ext}`,
        mimeType: mime,
        size: asset.fileSize,
        file: asset.file,
      };
      setPicked(file);
      setRemoveRequested(false);

      // Upload right away so the user doesn't depend on the Save button.
      setUploading(true);
      try {
        const updated = await uploadProfilePicture(file);
        updateUser(updated);
        setPicked(null);
        onSaved();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not upload the photo. Please try again.');
      } finally {
        setUploading(false);
      }
    } catch {
      setError("Couldn't open the gallery. Check that photo access is allowed.");
    }
  };

  const toggleRemovePhoto = () => {
    setError('');
    if (removeRequested) {
      setRemoveRequested(false);
    } else {
      setPicked(null);
      setRemoveRequested(true);
    }
  };

  const previewUri = removeRequested ? null : picked?.uri ?? user.profilePictureUrl;
  const dept = user.departmentLabel ?? departmentLabel(user.department) ?? '—';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={onClose} accessibilityLabel="Close" style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: colors.surface }]}>
              <CloseIcon size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Edit profile</Text>
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

          <Text style={styles.sectionTitle}>Profile picture</Text>
          <View style={styles.photoRow}>
            <View style={styles.photoWrap}>
              <Avatar name={user.nomPrenom} size={72} uri={previewUri} userId={picked || removeRequested ? undefined : user.id} />
              {(saving || uploading) && (
                <View style={styles.photoBusy}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.photoActions}>
              <Pressable
                onPress={pickPhoto}
                disabled={saving || uploading}
                style={({ pressed }) => [styles.photoBtn, (saving || uploading) && { opacity: 0.5 }, pressed && { backgroundColor: colors.surfaceHover }]}
              >
                <Text style={styles.photoBtnText}>{picked ? 'Change photo' : 'Choose from gallery'}</Text>
              </Pressable>
              {(!!user.profilePictureUrl || !!picked) && (
                <Pressable
                  onPress={toggleRemovePhoto}
                  disabled={saving}
                  style={({ pressed }) => [styles.photoBtn, pressed && { backgroundColor: 'rgba(244,33,46,0.10)' }]}
                >
                  <Text style={styles.photoRemoveText}>{removeRequested ? 'Keep current photo' : 'Remove photo'}</Text>
                </Pressable>
              )}
            </View>
          </View>
          <Text style={styles.help}>
            {removeRequested
              ? 'The picture will be removed when you tap Save.'
              : picked
                ? (uploading ? 'Uploading your photo…' : 'Photo not uploaded yet — pick it again to retry.')
                : 'JPEG, PNG or WebP · up to 5 MB'}
          </Text>

          <Text style={styles.label}>Full name</Text>
          <TextInput value={name} onChangeText={setName} maxLength={120} placeholder="Your full name" placeholderTextColor={colors.muted} style={styles.input} />

          <Text style={styles.label}>Class</Text>
          <TextInput
            value={classe}
            onChangeText={setClasse}
            maxLength={40}
            autoCapitalize="characters"
            placeholder="e.g., DSI 3.2"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.box}>
            <ReadRow label="Email" value={user.email} divider />
            <ReadRow label="Department" value={dept} />
          </View>
          <Text style={styles.help}>Your email and department can't be changed here.</Text>

          <Text style={styles.sectionTitle}>Change password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={100}
            placeholder="New password (optional)"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={100}
            placeholder="Confirm new password"
            placeholderTextColor={colors.muted}
            style={[styles.input, { marginTop: 10 }]}
          />

          {!!hint && <Text style={styles.hint}>{hint}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReadRow({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoWrap: { width: 72, height: 72 },
  photoBusy: { position: 'absolute', top: 0, left: 0, width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  photoActions: { flex: 1, gap: 8 },
  photoBtn: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  photoBtnText: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.text },
  photoRemoveText: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.danger },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  sectionTitle: { marginTop: 28, marginBottom: 10, fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  input: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, fontFamily: fonts.regular },
  box: { borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  rowValue: { flexShrink: 1, fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  help: { marginTop: 8, fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  hint: { marginTop: 16, fontSize: 12.5, fontFamily: fonts.medium, color: '#FFD400' },
});
