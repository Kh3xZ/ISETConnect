import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { GlobeIcon, LockIcon } from './icons';

export function VisibilityBadge({ isPrivate }: { isPrivate: boolean }) {
  return (
    <View style={styles.badge}>
      {isPrivate ? <LockIcon size={10} color={colors.muted} /> : <GlobeIcon size={10} color={colors.muted} strokeWidth={2.2} />}
      <Text style={styles.text}>{isPrivate ? 'Private' : 'Public'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { fontSize: 10.5, fontFamily: fonts.medium, color: colors.muted },
});
