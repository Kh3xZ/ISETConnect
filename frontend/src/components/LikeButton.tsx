import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, likePublication, unlikePublication } from '../services/api';
import { colors, fonts } from '../theme';
import { formatCount } from '../utils/format';
import { HeartIcon } from './icons';
import { useToast } from './Toast';

export type LikeChangeHandler = (publicationId: number, liked: boolean, likesCount: number) => void;

interface Props {
  publicationId: number;
  liked: boolean;
  count: number;
  /** X uses 18.75px in the timeline and 22.5px on the post page. */
  size?: number;
  /** The post page shows the count in a separate "N Likes" line, not next to the icon. */
  showCount?: boolean;
  onChange?: LikeChangeHandler;
}

// ── Burst particles (the little confetti ring X plays when you like) ─────────
const PARTICLE_COLORS = ['#F91880', '#FF7A00', '#FFD400', '#00BA7C', '#1D9BF0', '#7856FF', '#F91880', '#FF7A00'];
const PARTICLES = PARTICLE_COLORS.map((color, i) => ({ color, angle: (i / PARTICLE_COLORS.length) * Math.PI * 2 - Math.PI / 2 }));

function LikeButtonBase({ publicationId, liked, count, size = 18.75, showCount = true, onChange }: Props) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [isLiked, setIsLiked] = useState(liked);
  const [total, setTotal] = useState(count);
  const [pressed, setPressed] = useState(false);

  // Last state the server confirmed + number of requests still in flight.
  const confirmed = useRef({ liked, count });
  const pending = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Follow the parent (e.g. liked from the post page, or the feed was refreshed) — but never
  // while our own request is still in flight, or the heart would flicker back.
  useEffect(() => {
    if (pending.current > 0) return;
    confirmed.current = { liked, count };
    setIsLiked(liked);
    setTotal(count);
  }, [liked, count]);

  // ── Animations (all native-driven) ─────────────────────────────────────────
  const pop = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;

  const play = useCallback(() => {
    pop.setValue(0.2);
    burst.setValue(0);
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 3.2, tension: 160, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [pop, burst]);

  // ── Toggle: optimistic, then reconcile with the server ─────────────────────
  const toggle = useCallback(() => {
    const next = !isLiked;
    setIsLiked(next);
    setTotal((t) => Math.max(0, t + (next ? 1 : -1)));
    if (next) play();

    pending.current += 1;
    // Requests are serialised so rapid taps always land in the order they were made.
    chain.current = chain.current.then(async () => {
      try {
        const res = next ? await likePublication(publicationId) : await unlikePublication(publicationId);
        confirmed.current = { liked: res.liked, count: res.likesCount };
        pending.current -= 1;
        if (pending.current === 0) {
          setIsLiked(res.liked);
          setTotal(res.likesCount);
          onChangeRef.current?.(publicationId, res.liked, res.likesCount);
        }
      } catch (e) {
        pending.current -= 1;
        if (pending.current === 0) {
          setIsLiked(confirmed.current.liked);
          setTotal(confirmed.current.count);
        }
        toastRef.current.show(e instanceof ApiError ? e.message : "Couldn't update your like. Try again.");
      }
    });
  }, [isLiked, publicationId, play]);

  const active = isLiked || pressed;
  const tint = active ? colors.like : colors.muted;
  const pad = (34.75 - size) / 2; // X's hit circle is 34.75px

  return (
    <Pressable
      onPress={toggle}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={`${total > 0 ? `${total} ${total === 1 ? 'Like' : 'Likes'}. ` : ''}${isLiked ? 'Liked' : 'Like'}`}
      accessibilityState={{ selected: isLiked }}
      style={[styles.root, { marginLeft: -pad }]}
    >
      <View style={[styles.circle, { padding: pad, backgroundColor: pressed ? colors.likeBg : 'transparent' }]}>
        {/* burst ring + particles sit behind the heart */}
        <View pointerEvents="none" style={styles.burstLayer}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: burst.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
                transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.9] }) }],
              },
            ]}
          />
          {PARTICLES.map((p, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  backgroundColor: p.color,
                  opacity: burst.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * size * 1.15] }) },
                    { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * size * 1.15] }) },
                    { scale: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0.2] }) },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <HeartIcon size={size} color={tint} filled={isLiked} />
        </Animated.View>
      </View>

      {showCount && <RollingCount value={total} color={tint} />}
    </Pressable>
  );
}

export const LikeButton = memo(LikeButtonBase);

// ── Rolling count: changed digits slide like X's ─────────────────────────────
const LINE = 18;

function RollingCount({ value, color }: { value: number; color: string }) {
  const text = formatCount(value);
  const prevText = useRef(text);
  const [from, setFrom] = useState(text);
  const dir = useRef(1);
  const t = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (text === prevText.current) return;
    dir.current = value >= (parseCount(prevText.current) ?? 0) ? 1 : -1;
    setFrom(prevText.current);
    prevText.current = text;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // align from the right so only the digits that actually change roll
  const len = Math.max(text.length, from.length);
  const a = from.padStart(len, ' ');
  const b = text.padStart(len, ' ');

  return (
    <View style={styles.countRow} accessible={false}>
      {Array.from({ length: len }).map((_, i) => {
        const ca = a[i] === ' ' ? '' : a[i];
        const cb = b[i] === ' ' ? '' : b[i];
        if (ca === cb) {
          return (
            <Text key={i} style={[styles.count, { color }]}>
              {cb}
            </Text>
          );
        }
        return (
          <View key={i} style={styles.cell}>
            {/* invisible copy sizes the cell to the incoming character */}
            <Text style={[styles.count, { color: 'transparent' }]}>{cb}</Text>
            <Animated.Text
              style={[
                styles.count,
                styles.abs,
                { color, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -dir.current * LINE] }) }] },
              ]}
            >
              {ca}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.count,
                styles.abs,
                { color, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dir.current * LINE, 0] }) }] },
              ]}
            >
              {cb}
            </Animated.Text>
          </View>
        );
      })}
    </View>
  );
}

function parseCount(s: string): number | null {
  if (!s) return 0;
  const m = /^([\d.]+)([KMB]?)$/.exec(s);
  if (!m) return null;
  const mult = m[2] === 'K' ? 1e3 : m[2] === 'M' ? 1e6 : m[2] === 'B' ? 1e9 : 1;
  return parseFloat(m[1]) * mult;
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  burstLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  ring: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: colors.like },
  particle: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  countRow: { flexDirection: 'row', alignItems: 'center', height: LINE, overflow: 'hidden' },
  cell: { height: LINE, justifyContent: 'center', overflow: 'hidden' },
  abs: { position: 'absolute', left: 0, top: 0 },
  // X: 13px, regular weight, line-height 16px, muted gray (pink when liked / hovered)
  count: { fontSize: 13, lineHeight: LINE, fontFamily: fonts.regular },
});
