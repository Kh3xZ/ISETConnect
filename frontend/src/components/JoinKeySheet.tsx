import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CommunityResponse } from '../services/api';
import { colors, fonts } from '../theme';
import { BottomSheet } from './BottomSheet';

interface Props {
  community: CommunityResponse | null;
  loading: boolean;
  error: string;
  onSubmit: (key: string) => void;
  onClose: () => void;
}

export function JoinKeySheet({ community, loading, error, onSubmit, onClose }: Props) {
  const [key, setKey] = useState('');
  const [current, setCurrent] = useState<CommunityResponse | null>(community);

  useEffect(() => {
    if (community) {
      setCurrent(community);
      setKey('');
    }
  }, [community]);

  const canSubmit = key.trim().length > 0 && !loading;

  return (
    <BottomSheet
      visible={!!community}
      title="Private community"
      subtitle={current ? `Enter the key to join ${current.name}.` : undefined}
      onClose={onClose}
    >
      <TextInput
        value={key}
        onChangeText={setKey}
        placeholder="Community key"
        placeholderTextColor={colors.muted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={() => canSubmit && onSubmit(key.trim())}
        style={[styles.input, !!error && { borderColor: colors.danger }]}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Pressable
          onPress={() => onSubmit(key.trim())}
          disabled={!canSubmit}
          style={({ pressed }) => [styles.join, !canSubmit && { opacity: 0.4 }, pressed && { backgroundColor: colors.whiteBtnHover }]}
        >
          {loading ? <ActivityIndicator size="small" color={colors.whiteBtnText} /> : <Text style={styles.joinText}>Join community</Text>}
        </Pressable>
        <Pressable onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && { backgroundColor: colors.surfaceHover }]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  error: { marginTop: 8, fontSize: 12.5, fontFamily: fonts.medium, color: colors.danger },
  actions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  join: { flex: 1, height: 42, borderRadius: 999, backgroundColor: colors.whiteBtn, alignItems: 'center', justifyContent: 'center' },
  joinText: { fontSize: 14, fontFamily: fonts.bold, color: colors.whiteBtnText },
  cancel: { paddingHorizontal: 20, height: 42, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
});
