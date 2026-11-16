import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { CheckIcon } from './icons';

const ToastContext = createContext<{ show: (message: string) => void }>({ show: () => {} });

export const useToast = () => useContext(ToastContext);


export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(text);
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }, 2800);
    },
    [anim],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      <View style={styles.root}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: 40 + insets.bottom,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            },
          ]}
        >
          <Text style={styles.text}>{message}</Text>
          <CheckIcon />
        </Animated.View>
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxWidth: 380,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: { flexShrink: 1, color: '#FFFFFF', fontSize: 13, fontFamily: fonts.semibold },
});
