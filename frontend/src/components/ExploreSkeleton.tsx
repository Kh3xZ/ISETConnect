import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function ExploreSkeleton({ variant, count = 5 }: { variant: 'people' | 'communities'; count?: number }) {
  const pulse = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 725, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.42, duration: 725, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const people = variant === 'people';

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.row, { opacity: pulse, alignItems: people ? 'center' : 'flex-start' }]}>
          <View style={[styles.avatar, { borderRadius: people ? 21 : 10 }]} />
          <View style={styles.col}>
            <View style={[styles.bar, { width: people ? 150 : 170, height: 14 }]} />
            {people ? (
              <View style={[styles.bar2, { width: 190, height: 12 }]} />
            ) : (
              <>
                <View style={[styles.bar2, { width: '100%', height: 12 }]} />
                <View style={[styles.bar2, { width: 110, height: 12 }]} />
              </>
            )}
          </View>
          <View style={[styles.btn, { width: people ? 88 : 64 }]} />
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
  avatar: { width: 42, height: 42, backgroundColor: colors.surface },
  col: { flex: 1, gap: 8 },
  bar: { borderRadius: 6, backgroundColor: colors.surface },
  bar2: { borderRadius: 6, backgroundColor: colors.surfaceHover },
  btn: { height: 28, borderRadius: 14, backgroundColor: colors.surface },
});
