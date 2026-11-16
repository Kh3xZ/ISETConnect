import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { BottomSheet } from './BottomSheet';

export type LegalDoc = 'Terms of Service' | 'Privacy Policy';


export function LegalSheet({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  return (
    <BottomSheet visible={doc !== null} title={doc ?? ''} subtitle="Effective November 2026 • IsetConnect" onClose={onClose}>
      <View style={styles.box}>
        <Text style={styles.text}>
          We respect your privacy and protect your account credentials. By signing in, you agree to follow our
          community standards and acceptable use policies.
        </Text>
      </View>
      <Pressable onPress={onClose} style={({ pressed }) => [styles.btn, pressed && { backgroundColor: colors.surfaceHover }]}>
        <Text style={styles.btnText}>Done</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  box: { padding: 14, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  text: { fontSize: 13, lineHeight: 20, fontFamily: fonts.regular, color: colors.legalLink },
  btn: {
    marginTop: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
});
