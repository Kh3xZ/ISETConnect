import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { BookIcon, HomeIcon, SearchIcon, UserIcon, UsersIcon } from './icons';

export type NavKey = 'home' | 'explore' | 'communities' | 'resources' | 'profile';

const ITEMS: { key: NavKey; label: string; Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }[] = [
  { key: 'home', label: 'Home', Icon: HomeIcon },
  { key: 'explore', label: 'Explore', Icon: SearchIcon },
  { key: 'communities', label: 'Communities', Icon: UsersIcon },
  { key: 'resources', label: 'Resources', Icon: BookIcon },
  { key: 'profile', label: 'Profile', Icon: UserIcon },
];

export const NAV_HEIGHT = 54;

export function BottomNav({ active, onSelect }: { active: NavKey; onSelect: (key: NavKey) => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {ITEMS.map(({ key, label, Icon }) => {
        const isActive = key === active;
        // like the mockups: Explore lights up in blue, Home stays white
        const color = isActive ? (key === 'explore' ? colors.accent : colors.text) : colors.muted;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.item}
          >
            <Icon size={21} color={color} strokeWidth={isActive ? (key === 'explore' ? 2.4 : 2.2) : 1.75} />
            <Text style={[styles.label, { color, fontFamily: isActive ? (key === 'explore' ? fonts.bold : fonts.semibold) : fonts.medium }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.black,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 4,
  },
  item: { flex: 1, height: NAV_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 10, letterSpacing: -0.1 },
});
