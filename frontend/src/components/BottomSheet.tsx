import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { CloseIcon } from './icons';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children?: React.ReactNode;
}


export function BottomSheet({ visible, title, subtitle, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop, opacity: anim }]}>
          <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              paddingBottom: 28 + insets.bottom,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Close modal" style={({ pressed }) => [styles.close, pressed && { backgroundColor: colors.surface }]}>
              <CloseIcon />
            </Pressable>
          </View>
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: colors.black,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 12 },
  title: { fontSize: 20, fontFamily: fonts.bold, letterSpacing: -0.4, color: colors.text },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: colors.muted },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { marginTop: 4 },
});
