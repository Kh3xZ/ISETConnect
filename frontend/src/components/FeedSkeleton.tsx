import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 725, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 725, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.row, { opacity: pulse }]}>
          <View style={styles.avatar} />
          <View style={styles.col}>
            <View style={styles.line}>
              <View style={[styles.bar, { width: 112, height: 14 }]} />
              <View style={[styles.bar2, { width: 56, height: 14 }]} />
            </View>
            <View style={[styles.bar, { width: 144, height: 12 }]} />
            <View style={[styles.bar2, { width: '92%', height: 16 }]} />
            <View style={{ gap: 6 }}>
              <View style={[styles.bar, { width: '100%', height: 12 }]} />
              <View style={[styles.bar, { width: '80%', height: 12 }]} />
            </View>
            <View style={[styles.bar, { width: 48, height: 12 }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  col: { flex: 1, gap: 10, paddingTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { borderRadius: 6, backgroundColor: colors.surface },
  bar2: { borderRadius: 6, backgroundColor: colors.surfaceHover },
});
