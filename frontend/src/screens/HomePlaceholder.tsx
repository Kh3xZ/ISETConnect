import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, fonts } from '../theme';


export default function HomePlaceholder() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  if (!user) return null;

  const details = [user.role, user.departmentLabel, user.classe].filter(Boolean).join(' · ');

  return (
    <View style={[styles.root, { paddingTop: 48 + insets.top, paddingBottom: 24 + insets.bottom }]}>
      <View style={styles.column}>
        <Text style={styles.title}>You're signed in.</Text>
        <Text style={styles.name}>{user.nomPrenom}</Text>
        <Text style={styles.muted}>{user.email}</Text>
        <Text style={styles.muted}>{details}</Text>

        <Pressable onPress={signOut} style={({ pressed }) => [styles.btn, pressed && { backgroundColor: colors.surfaceHover }]}>
          <Text style={styles.btnText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black, paddingHorizontal: 28 },
  column: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 6 },
  title: { fontSize: 29, fontFamily: fonts.extrabold, letterSpacing: -0.87, color: colors.text, marginBottom: 12 },
  name: { fontSize: 18, fontFamily: fonts.semibold, color: colors.text },
  muted: { fontSize: 14, fontFamily: fonts.regular, color: colors.muted },
  btn: {
    marginTop: 24,
    height: 46,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
});
