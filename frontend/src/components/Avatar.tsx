import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { resolveImageUrl } from '../services/api';
import { colors, fonts } from '../theme';
import { initialsOf } from '../utils/format';

interface Props {
  name: string;
  size?: number;
  /** profilePictureUrl from UserResponse / UserSummary. */
  uri?: string | null;
  /** When it matches the signed-in user, AuthContext's picture wins (instant update after upload). */
  userId?: number | null;
}

export function Avatar({ name, size = 40, uri, userId }: Props) {
  const { user: me } = useAuth();
  const [failed, setFailed] = useState(false);

  const effectiveUri = me && userId != null && me.id === userId ? me.profilePictureUrl : uri;
  const source = resolveImageUrl(effectiveUri);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  const showImage = !!source && !failed;

  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, showImage && styles.imageCircle]}
      accessibilityLabel={name}
    >
      {showImage ? (
        <Image
          source={{ uri: source }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.text, { fontSize: Math.round(size * 0.33) }]}>{initialsOf(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCircle: {
    overflow: 'hidden',
  },
  text: { color: colors.text, fontFamily: fonts.bold },
});
