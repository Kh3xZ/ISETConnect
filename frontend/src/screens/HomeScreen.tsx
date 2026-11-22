import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomNav, NavKey } from '../components/BottomNav';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import type { CommunityResponse, PublicationResponse } from '../services/api';
import { colors } from '../theme';
import CommunitiesScreen, { CommunitiesHandle } from './CommunitiesScreen';
import CommunityDetailScreen from './CommunityDetailScreen';
import CreatePublicationScreen from './CreatePublicationScreen';
import ExploreScreen from './ExploreScreen';
import FeedScreen, { FeedHandle } from './FeedScreen';
import ProfileScreen, { ProfileHandle } from './ProfileScreen';
import ResourcesScreen from './ResourcesScreen';

type TabKey = 'home' | 'explore' | 'communities' | 'resources' | 'profile';

/**
 * Signed-in shell: owns the bottom navigation, the profile sheet and the
 * full-screen overlays (composer, community detail), so they sit above
 * whichever tab is active. Tabs stay mounted once opened, so scroll position
 * and search are kept.
 */
export default function HomeScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const feedRef = useRef<FeedHandle>(null);
  const communitiesRef = useRef<CommunitiesHandle>(null);
  const profileRef = useRef<ProfileHandle>(null);

  const [active, setActive] = useState<TabKey>('home');
  const [exploreMounted, setExploreMounted] = useState(false);
  const [communitiesMounted, setCommunitiesMounted] = useState(false);
  const [profileMounted, setProfileMounted] = useState(false);
  const [resourcesMounted, setResourcesMounted] = useState(false);
  const [exploreRequest, setExploreRequest] = useState<{ tab: 'people' | 'communities'; nonce: number } | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerCommunity, setComposerCommunity] = useState<CommunityResponse | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCommunity, setDetailCommunity] = useState<CommunityResponse | null>(null);
  const [publishedTick, setPublishedTick] = useState(0);

  const closeDetail = useCallback(() => setDetailOpen(false), []);

  if (!user) return null;

  const handleNav = (key: NavKey) => {
    if (key === 'home') {
      if (active === 'home') feedRef.current?.scrollTop();
      setActive('home');
    } else if (key === 'explore') {
      setExploreMounted(true);
      setActive('explore');
    } else if (key === 'communities') {
      if (communitiesMounted) communitiesRef.current?.refresh(); // pick up joins/leaves made elsewhere
      setCommunitiesMounted(true);
      setActive('communities');
    } else if (key === 'resources') {
      setResourcesMounted(true);
      setActive('resources');
    } else if (key === 'profile') {
      if (profileMounted) profileRef.current?.refresh();
      setProfileMounted(true);
      setActive('profile');
    }
  };

  const openComposer = (community: CommunityResponse | null) => {
    setComposerCommunity(community);
    setComposerOpen(true);
  };

  const handlePublished = (pub: PublicationResponse) => {
    feedRef.current?.prepend(pub);
    setPublishedTick((t) => t + 1);
    setComposerOpen(false);
    // from a community page we stay there; otherwise show the new post on the feed
    if (!composerCommunity) setActive('home');
    toast.show('Publication published');
  };

  const openCommunity = (c: CommunityResponse) => {
    setDetailCommunity(c);
    setDetailOpen(true);
  };

  const openProfile = () => handleNav('profile');
  const discoverCommunities = () => {
    setExploreMounted(true);
    setExploreRequest({ tab: 'communities', nonce: Date.now() });
    setActive('explore');
  };

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <View style={[styles.fill, active !== 'home' && styles.hidden]}>
          <FeedScreen ref={feedRef} onCompose={() => openComposer(null)} onOpenProfile={openProfile} />
        </View>

        {exploreMounted && (
          <View style={[styles.fill, active !== 'explore' && styles.hidden]}>
            <ExploreScreen onOpenProfile={openProfile} tabRequest={exploreRequest} />
          </View>
        )}

        {communitiesMounted && (
          <View style={[styles.fill, active !== 'communities' && styles.hidden]}>
            <CommunitiesScreen
              ref={communitiesRef}
              onOpenCommunity={openCommunity}
              onOpenProfile={openProfile}
              onDiscover={discoverCommunities}
            />
          </View>
        )}

        {resourcesMounted && (
          <View style={[styles.fill, active !== 'resources' && styles.hidden]}>
            <ResourcesScreen onOpenProfile={openProfile} />
          </View>
        )}

        {profileMounted && (
          <View style={[styles.fill, active !== 'profile' && styles.hidden]}>
            <ProfileScreen ref={profileRef} refreshTick={publishedTick} onOpenCommunity={openCommunity} onDiscover={discoverCommunities} />
          </View>
        )}
      </View>

      <BottomNav active={active} onSelect={handleNav} />

      <CommunityDetailScreen
        visible={detailOpen}
        community={detailCommunity}
        refreshTick={publishedTick}
        onClose={closeDetail}
        onPost={(c) => openComposer(c)}
        onChanged={(c) => {
          setDetailCommunity(c);
          communitiesRef.current?.upsert(c);
        }}
        onRemoved={(id) => communitiesRef.current?.remove(id)}
      />

      <CreatePublicationScreen
        visible={composerOpen}
        presetCommunity={composerCommunity}
        onClose={() => setComposerOpen(false)}
        onPublished={handlePublished}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  content: { flex: 1 },
  fill: { flex: 1 },
  hidden: { display: 'none' },
});
