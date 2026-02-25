import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Animated,
  RefreshControl,
  Share,
  PanResponder,
  LayoutChangeEvent,
  type DimensionValue,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { ArrowLeft, Play, Pause, Info, Dumbbell, Target, Award, X, RefreshCw, Maximize, Film, Share2, Plus, Lightbulb, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleHeight, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import type { LibraryStackParamList } from '@/types';
import { workoutService, Exercise } from '@/services/workouts';
import { useTranslation } from 'react-i18next';
import { getTranslatedExerciseName } from '@/utils/exerciseTranslations';
import { Shimmer } from '@/components/shared/Shimmer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<LibraryStackParamList, 'ExerciseDetail'>;
type RouteProp = RNRouteProp<LibraryStackParamList, 'ExerciseDetail'>;

interface ExerciseDetailScreenProps {
  navigation: NavigationProp;
  route: RouteProp;
}

export const ExerciseDetailScreen: React.FC<ExerciseDetailScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { textSize } = useTextSizeStore();
  const { t } = useTranslation();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [relatedExercises, setRelatedExercises] = useState<Exercise[]>([]);
  const videoViewRef = useRef<VideoView>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const seekTrackWidth = useRef(0);
  const lastTapTime = useRef(0);
  const durationRef = useRef(durationSec);
  durationRef.current = durationSec;

  // ── expo-video player ──
  const videoSource = showVideo && exercise?.video_url && !videoError
    ? exercise.video_url
    : null;

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status: playerStatus } = useEvent(player, 'statusChange', { status: player.status });

  // Track time updates
  useEventListener(player, 'timeUpdate', (payload) => {
    if (!isSeeking) {
      setPositionSec(payload.currentTime);
      if (player.duration > 0) {
        setDurationSec(player.duration);
      }
    }
  });

  // Detect loading / error from status
  useEffect(() => {
    if (playerStatus === 'readyToPlay' && videoLoading) {
      setVideoLoading(false);
    }
    if (playerStatus === 'error') {
      setVideoError(true);
      setVideoLoading(false);
    }
  }, [playerStatus, videoLoading]);

  const MEDIA_COLLAPSED = scaleHeight(340);
  const MEDIA_EXPANDED = SCREEN_HEIGHT * 0.65;
  const mediaHeight = useRef(new Animated.Value(MEDIA_COLLAPSED)).current;

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;
  const CARD_BG = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const CARD_BORDER = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const SUBTLE_TEXT = getTextColorWithOpacity(isDark, 0.5);

  useEffect(() => {
    const loadExercise = async () => {
      try {
        setLoading(true);
        let found = await workoutService.getExerciseById(route.params.exerciseId);
        const exerciseName = route.params.exerciseName;
        if (!found && exerciseName) {
          found = await workoutService.getExerciseByName(exerciseName);
        }
        setExercise(found);
      } catch (error) {
        console.error('Error loading exercise:', error);
        setExercise(null);
      } finally {
        setLoading(false);
      }
    };
    loadExercise();
  }, [route.params.exerciseId, route.params.exerciseName]);

  // ── Load related exercises ──
  useEffect(() => {
    if (!exercise?.muscle_groups?.length) return;
    const load = async () => {
      try {
        const all = await workoutService.getExercises();
        const related = all.filter(
          (ex) =>
            ex.id !== exercise.id &&
            ex.muscle_groups?.some((mg) => exercise.muscle_groups!.includes(mg)),
        ).slice(0, 4);
        setRelatedExercises(related);
      } catch {
        // ignore
      }
    };
    load();
  }, [exercise?.id, exercise?.muscle_groups]);

  const handleVideoError = () => {
    setVideoError(true);
    setVideoLoading(false);
  };

  // ── Controls fade helpers ──
  const fadeControlsIn = useCallback(() => {
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity]);

  const fadeControlsOut = useCallback(() => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowControls(false));
  }, [controlsOpacity]);

  const resetControlsTimer = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    fadeControlsIn();
    controlsTimer.current = setTimeout(() => fadeControlsOut(), 3500);
  }, [fadeControlsIn, fadeControlsOut]);

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    resetControlsTimer();
  };

  const seekTo = (fraction: number) => {
    if (durationSec === 0) return;
    const pos = fraction * durationSec;
    setPositionSec(pos);
    player.currentTime = pos;
    setIsSeeking(false);
    resetControlsTimer();
  };

  const formatTime = (sec: number) => {
    const totalSec = Math.floor(sec);
    const min = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${min}:${s.toString().padStart(2, '0')}`;
  };

  // ── Double-tap detection ──
  const handleVideoAreaTap = () => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      togglePlayPause();
      lastTapTime.current = 0;
      return;
    }
    lastTapTime.current = now;

    if (showControls) {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      fadeControlsOut();
    } else {
      resetControlsTimer();
    }
  };

  // ── Seek bar layout + drag ──
  const onSeekTrackLayout = (e: LayoutChangeEvent) => {
    seekTrackWidth.current = e.nativeEvent.layout.width;
  };

  const seekPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsSeeking(true);
      },
      onPanResponderMove: (_e, gestureState) => {
        const dur = durationRef.current;
        if (seekTrackWidth.current === 0 || dur === 0) return;
        const fraction = Math.max(0, Math.min(1, gestureState.moveX / seekTrackWidth.current));
        setPositionSec(fraction * dur);
      },
      onPanResponderRelease: (_e, gestureState) => {
        const dur = durationRef.current;
        if (seekTrackWidth.current === 0 || dur === 0) return;
        const fraction = Math.max(0, Math.min(1, gestureState.moveX / seekTrackWidth.current));
        seekTo(fraction);
      },
    }),
  ).current;

  const toggleVideo = () => {
    if (exercise?.video_url && !videoError) {
      if (!showVideo) {
        setVideoLoading(true);
        setShowVideo(true);
        setShowControls(true);
        controlsOpacity.setValue(1);
        resetControlsTimer();
        Animated.spring(mediaHeight, {
          toValue: MEDIA_EXPANDED,
          useNativeDriver: false,
          tension: 50,
          friction: 9,
        }).start();
      } else {
        closeVideo();
      }
    }
  };

  const closeVideo = () => {
    player.pause();
    Animated.spring(mediaHeight, {
      toValue: MEDIA_COLLAPSED,
      useNativeDriver: false,
      tension: 50,
      friction: 9,
    }).start(() => {
      setShowVideo(false);
      setVideoLoading(false);
    });
  };

  const retryVideo = () => {
    setVideoError(false);
    setVideoLoading(true);
    setShowVideo(false);
    setTimeout(() => {
      setShowVideo(true);
      setShowControls(true);
      controlsOpacity.setValue(1);
      resetControlsTimer();
      Animated.spring(mediaHeight, {
        toValue: MEDIA_EXPANDED,
        useNativeDriver: false,
        tension: 50,
        friction: 9,
      }).start();
    }, 100);
  };

  const toggleFullscreen = () => {
    if (videoViewRef.current) {
      try {
        videoViewRef.current.enterFullscreen();
      } catch {
        // Fullscreen not supported on this platform
      }
    }
  };

  // PiP-aware back navigation: if video is playing, keep playback alive so
  // the OS transitions into Picture-in-Picture automatically.
  const handleBackWithPiP = () => {
    if (showVideo && isPlaying) {
      player.play();
    }
    navigation.goBack();
  };

  // ── Share exercise ──
  const handleShare = async () => {
    if (!exercise) return;
    try {
      await Share.share({
        message: t('library.exerciseDetail.shareMessage', {
          name: getTranslatedExerciseName(exercise.name, t),
          defaultValue: `Check out ${getTranslatedExerciseName(exercise.name, t)} on GoFit!`,
        }),
      });
    } catch {
      // user cancelled
    }
  };

  // ── Pull-to-refresh ──
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      let found = await workoutService.getExerciseById(route.params.exerciseId);
      if (!found && route.params.exerciseName) {
        found = await workoutService.getExerciseByName(route.params.exerciseName);
      }
      setExercise(found);
      setVideoError(false);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  // ── Add to workout ──
  const handleAddToWorkout = () => {
    if (!exercise) return;
    navigation.navigate('WorkoutBuilder', {
      addedExercises: [{
        id: exercise.id,
        name: exercise.name,
        image: exercise.image_url,
        default_sets: exercise.default_sets,
        default_reps: exercise.default_reps,
        default_rest_time: exercise.default_rest_time,
      }],
    });
  };

  const isVideoUrl = (url: string) => /\.(mp4|mov|avi|webm|m3u8)(\?.*)?$/i.test(url);
  const isGifUrl = (url: string) => /\.gif(\?.*)?$/i.test(url);

  const parseInstructions = (text: string): { isNumbered: boolean; steps: string[] } => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const numbered = lines.filter((l) => /^\d+[\.\)\-]\s/.test(l));
    if (numbered.length >= 2) {
      return {
        isNumbered: true,
        steps: lines.map((l) => l.replace(/^\d+[\.\)\-]\s*/, '')),
      };
    }
    return { isNumbered: false, steps: [text] };
  };

  const difficultyColor = exercise?.difficulty
    ? exercise.difficulty.toLowerCase() === 'beginner'
      ? '#4CAF50'
      : exercise.difficulty.toLowerCase() === 'intermediate'
        ? '#FF9800'
        : '#F44336'
    : BRAND_PRIMARY;

  // ── Styles ──
  const s = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: BRAND_BLACK },
    scroll: { flex: 1 },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emptyText: { fontSize: getScaledFontSize(16), color: SUBTLE_TEXT, fontFamily: 'Barlow_400Regular', textAlign: 'center' },

    // ── Header image / video ──
    mediaContainer: {
      width: SCREEN_WIDTH,
      backgroundColor: isDark ? '#111' : '#e8e8e8',
      overflow: 'hidden' as const,
    },
    mediaImage: { width: '100%' as DimensionValue, height: '100%' as DimensionValue },
    mediaGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' as DimensionValue },
    backBtn: {
      position: 'absolute', top: insets.top + 8, left: 16, zIndex: 20,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center', alignItems: 'center',
    },
    playBtn: {
      position: 'absolute', top: '50%' as DimensionValue, left: '50%' as DimensionValue,
      transform: [{ translateX: -32 }, { translateY: -32 }],
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: BRAND_PRIMARY,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    },

    // ── Video player ──
    videoWrap: { width: SCREEN_WIDTH, flex: 1, backgroundColor: '#000' },
    video: { width: '100%' as DimensionValue, height: '100%' as DimensionValue },
    videoOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)', pointerEvents: 'none' as const,
    },
    // ── Custom controls layer ──
    controlsLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 15,
    },
    controlsGradientTop: {
      position: 'absolute', top: 0, left: 0, right: 0,
      height: insets.top + 60,
    },
    controlsGradientBottom: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 110,
    },
    controlsTopBar: {
      position: 'absolute', top: insets.top + 8, left: 0, right: 0,
      flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 20,
    },
    controlsCenterRow: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center',
    },
    playPauseBtn: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    },
    controlsBottom: {
      position: 'absolute', bottom: 14, left: 16, right: 16,
      gap: 6,
    },
    seekBarRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    timeText: {
      fontSize: getScaledFontSize(11), color: 'rgba(255,255,255,0.85)',
      fontFamily: 'Barlow_500Medium', minWidth: 36, textAlign: 'center',
    },
    seekTrack: {
      flex: 1, height: 4, borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.25)',
      overflow: 'hidden' as const,
    },
    seekFill: {
      height: '100%' as DimensionValue, borderRadius: 2,
      backgroundColor: BRAND_PRIMARY,
    },
    seekThumb: {
      position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7,
      backgroundColor: BRAND_PRIMARY,
      borderWidth: 2, borderColor: '#fff',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 4,
    },
    iconBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center',
    },

    // ── Error ──
    errorWrap: {
      justifyContent: 'center', alignItems: 'center', gap: 14,
      width: SCREEN_WIDTH, flex: 1,
      backgroundColor: isDark ? '#151515' : '#f2f2f2',
    },
    errorText: { fontSize: getScaledFontSize(14), color: SUBTLE_TEXT, fontFamily: 'Barlow_500Medium' },
    retryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 22, paddingVertical: 11, borderRadius: 24,
      backgroundColor: BRAND_PRIMARY,
    },
    retryText: { fontSize: getScaledFontSize(14), fontWeight: '600', color: '#fff', fontFamily: 'Barlow_600SemiBold' },

    // ── Content ──
    contentCard: {
      backgroundColor: BRAND_BLACK,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -28,
      paddingTop: 28,
      paddingBottom: 40,
    },
    body: { paddingHorizontal: 20, gap: 24 },

    // ── Title area ──
    titleWrap: { gap: 10 },
    title: {
      fontSize: getResponsiveFontSize(26), fontWeight: '700',
      color: BRAND_WHITE, fontFamily: 'Barlow_700Bold',
    },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 10, borderWidth: 1,
    },
    badgeText: { fontSize: getScaledFontSize(12), fontWeight: '600', fontFamily: 'Barlow_600SemiBold' },

    // ── Stat strip ──
    statsStrip: {
      flexDirection: 'row', borderRadius: 16,
      backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER,
      paddingVertical: 18, overflow: 'hidden',
    },
    statItem: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: getResponsiveFontSize(28), fontWeight: '700', color: BRAND_WHITE, fontFamily: 'Barlow_700Bold' },
    statLabel: { fontSize: getScaledFontSize(11), fontWeight: '600', color: SUBTLE_TEXT, fontFamily: 'Barlow_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.8 },
    statDivider: { width: 1, backgroundColor: CARD_BORDER },

    // ── Section ──
    section: { gap: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionTitle: { fontSize: getResponsiveFontSize(18), fontWeight: '700', color: BRAND_WHITE, fontFamily: 'Barlow_700Bold' },
    sectionCard: {
      borderRadius: 16, padding: 16,
      backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER,
    },

    // ── Tags ──
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: isDark ? getPrimaryWithOpacity(0.15) : getPrimaryWithOpacity(0.1),
    },
    tagText: { fontSize: getScaledFontSize(13), color: BRAND_PRIMARY, fontFamily: 'Barlow_500Medium' },

    // ── Thumbnail placeholder (no image) ──
    placeholderWrap: {
      width: '100%' as DimensionValue, height: '100%' as DimensionValue,
      justifyContent: 'center', alignItems: 'center', gap: 12,
      backgroundColor: isDark ? '#1a1a1a' : '#e0e0e0',
    },
    placeholderIcon: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: isDark ? 'rgba(132,196,65,0.15)' : 'rgba(132,196,65,0.12)',
      justifyContent: 'center', alignItems: 'center',
    },
    placeholderText: {
      fontSize: getScaledFontSize(14), color: SUBTLE_TEXT,
      fontFamily: 'Barlow_500Medium',
    },

    // ── Instructions ──
    instructionsText: {
      fontSize: getScaledFontSize(15), lineHeight: getScaledFontSize(24),
      color: getTextColorWithOpacity(isDark, 0.85), fontFamily: 'Barlow_400Regular',
    },
    noDataText: {
      fontSize: getScaledFontSize(14), color: SUBTLE_TEXT,
      fontFamily: 'Barlow_400Regular', fontStyle: 'italic',
    },
    stepRow: {
      flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start',
    },
    stepNumber: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: isDark ? getPrimaryWithOpacity(0.15) : getPrimaryWithOpacity(0.1),
      justifyContent: 'center', alignItems: 'center',
      marginTop: 1,
    },
    stepNumberText: {
      fontSize: getScaledFontSize(13), fontWeight: '700',
      color: BRAND_PRIMARY, fontFamily: 'Barlow_700Bold',
    },
    stepText: {
      flex: 1, fontSize: getScaledFontSize(15), lineHeight: getScaledFontSize(23),
      color: getTextColorWithOpacity(isDark, 0.85), fontFamily: 'Barlow_400Regular',
    },

    // ── CTA buttons ──
    ctaRow: {
      flexDirection: 'row', gap: 12,
    },
    addToWorkoutBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 14,
      backgroundColor: BRAND_PRIMARY,
    },
    addToWorkoutText: {
      fontSize: getScaledFontSize(15), fontWeight: '700', color: '#fff',
      fontFamily: 'Barlow_700Bold',
    },
    shareBtn: {
      width: 50, height: 50, borderRadius: 14,
      backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER,
      justifyContent: 'center', alignItems: 'center',
    },

    // ── Related exercises ──
    relatedScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
    relatedCard: {
      width: 140, marginRight: 12, borderRadius: 14, overflow: 'hidden' as const,
      backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER,
    },
    relatedImage: { width: '100%' as DimensionValue, height: 100 },
    relatedPlaceholder: {
      width: '100%' as DimensionValue, height: 100,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: isDark ? '#1a1a1a' : '#e0e0e0',
    },
    relatedName: {
      fontSize: getScaledFontSize(12), color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold', padding: 10,
    },
    relatedBadge: {
      fontSize: getScaledFontSize(10), color: SUBTLE_TEXT,
      fontFamily: 'Barlow_400Regular', paddingHorizontal: 10, paddingBottom: 10,
    },

    // ── Skeleton ──
    skeletonContainer: { flex: 1, backgroundColor: BRAND_BLACK },
    skeletonMedia: {
      width: SCREEN_WIDTH, height: MEDIA_COLLAPSED,
      backgroundColor: isDark ? '#111' : '#e8e8e8',
    },
    skeletonBody: {
      paddingHorizontal: 20, paddingTop: 28, gap: 20,
    },
  }), [isDark, textSize, BRAND_BLACK, BRAND_WHITE, BRAND_PRIMARY, CARD_BG, CARD_BORDER, SUBTLE_TEXT, insets.top, MEDIA_COLLAPSED]);

  // ── Loading / empty states ──
  if (loading) {
    return (
      <View style={s.skeletonContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={s.skeletonMedia}>
          <Shimmer width="100%" height={MEDIA_COLLAPSED} borderRadius={0} />
        </View>
        <View style={s.skeletonBody}>
          <Shimmer width="70%" height={26} borderRadius={8} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Shimmer width={80} height={24} borderRadius={10} />
            <Shimmer width={100} height={24} borderRadius={10} />
          </View>
          <Shimmer width="100%" height={70} borderRadius={16} />
          <Shimmer width="40%" height={18} borderRadius={8} />
          <Shimmer width="100%" height={120} borderRadius={16} />
          <Shimmer width="40%" height={18} borderRadius={8} />
          <Shimmer width="100%" height={80} borderRadius={16} />
        </View>
      </View>
    );
  }
  if (!exercise) {
    return (
      <View style={[s.container, s.emptyWrap]}>
        <Text style={s.emptyText}>{t('library.exerciseDetail.noInstructions')}</Text>
      </View>
    );
  }

  const hasVideo = exercise.video_url && !videoError;
  const hasGif = exercise.video_url && isGifUrl(exercise.video_url);
  const showVideoPlayer = hasVideo && showVideo && exercise.video_url && isVideoUrl(exercise.video_url);

  const seekProgress = durationSec > 0 ? (positionSec / durationSec) * 100 : 0;

  // ── Render ──
  return (
    <View style={s.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND_PRIMARY} colors={[BRAND_PRIMARY]} />
        }
      >

        {/* ── Media area ── */}
        <Animated.View style={[s.mediaContainer, { height: mediaHeight }]}>
          {videoError && exercise.video_url ? (
            <View style={s.errorWrap}>
              <TouchableOpacity style={[s.backBtn, { zIndex: 20 }]} onPress={handleBackWithPiP} activeOpacity={0.7} accessibilityLabel={t('common.back', { defaultValue: 'Go back' })} accessibilityRole="button">
                <ArrowLeft size={20} color={isDark ? '#fff' : '#333'} />
              </TouchableOpacity>
              <Text style={s.errorText}>{t('library.exerciseDetail.videoError')}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={retryVideo} activeOpacity={0.8} accessibilityLabel={t('library.exerciseDetail.videoRetry')} accessibilityRole="button">
                <RefreshCw size={15} color="#fff" />
                <Text style={s.retryText}>{t('library.exerciseDetail.videoRetry')}</Text>
              </TouchableOpacity>
            </View>
          ) : showVideoPlayer ? (
            <View style={s.videoWrap}>
              <VideoView
                ref={videoViewRef}
                player={player}
                style={s.video}
                contentFit="contain"
                nativeControls={false}
                allowsFullscreen
                allowsPictureInPicture
              />
              {videoLoading && (
                <View style={s.videoOverlay}>
                  <ActivityIndicator size="large" color={BRAND_PRIMARY} />
                  <Text style={{ color: '#fff', marginTop: 10, fontFamily: 'Barlow_500Medium', fontSize: getScaledFontSize(13) }}>
                    {t('library.exerciseDetail.videoLoading')}
                  </Text>
                </View>
              )}
              {/* ── Custom controls overlay with fade ── */}
              {showControls && !videoLoading && (
                <Animated.View style={[s.controlsLayer, { opacity: controlsOpacity }]}>
                  <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent']}
                    style={s.controlsGradientTop}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={s.controlsGradientBottom}
                  />
                  {/* Top bar */}
                  <View style={s.controlsTopBar}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={s.iconBtn} onPress={handleBackWithPiP} activeOpacity={0.7} accessibilityLabel={t('common.back', { defaultValue: 'Go back' })} accessibilityRole="button">
                        <ArrowLeft size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.iconBtn} onPress={closeVideo} activeOpacity={0.7} accessibilityLabel={t('library.exerciseDetail.closeVideo', { defaultValue: 'Close video' })} accessibilityRole="button">
                        <X size={22} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={s.iconBtn} onPress={toggleFullscreen} activeOpacity={0.7} accessibilityLabel={t('library.exerciseDetail.fullscreen', { defaultValue: 'Fullscreen' })} accessibilityRole="button">
                      <Maximize size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {/* Center play/pause */}
                  <View style={s.controlsCenterRow}>
                    <TouchableOpacity
                      style={s.playPauseBtn}
                      onPress={togglePlayPause}
                      activeOpacity={0.7}
                      accessibilityLabel={isPlaying ? t('library.exerciseDetail.pause', { defaultValue: 'Pause' }) : t('library.exerciseDetail.play', { defaultValue: 'Play' })}
                      accessibilityRole="button"
                    >
                      {isPlaying
                        ? <Pause size={28} color="#fff" fill="#fff" />
                        : <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
                      }
                    </TouchableOpacity>
                  </View>
                  {/* Bottom seek bar */}
                  {durationSec > 0 && (
                    <View style={s.controlsBottom}>
                      <View style={s.seekBarRow}>
                        <Text style={s.timeText}>{formatTime(positionSec)}</Text>
                        <View
                          style={s.seekTrack}
                          onLayout={onSeekTrackLayout}
                          accessibilityLabel={`${t('library.exerciseDetail.progress', { defaultValue: 'Progress' })} ${Math.round(seekProgress)}%`}
                          accessibilityRole="adjustable"
                          {...seekPanResponder.panHandlers}
                        >
                          <View style={[s.seekFill, { width: `${seekProgress}%` as DimensionValue }]} />
                          <View style={[s.seekThumb, { left: `${seekProgress}%` as DimensionValue }]} />
                        </View>
                        <Text style={s.timeText}>{formatTime(durationSec)}</Text>
                      </View>
                    </View>
                  )}
                </Animated.View>
              )}
              {/* Tap area to show/hide controls + double-tap */}
              {!videoLoading && (
                <TouchableOpacity
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    zIndex: showControls ? 14 : 10,
                    top: showControls ? insets.top + 60 : 0,
                    bottom: showControls && durationSec > 0 ? 110 : 0,
                  }}
                  activeOpacity={1}
                  onPress={handleVideoAreaTap}
                  accessibilityHint={t('library.exerciseDetail.doubleTapHint', { defaultValue: 'Double-tap to play or pause' })}
                />
              )}
            </View>
          ) : (
            <>
              {hasGif ? (
                <Image source={{ uri: exercise.video_url! }} style={s.mediaImage} contentFit="cover" />
              ) : exercise.image_url ? (
                <Image source={{ uri: exercise.image_url }} style={s.mediaImage} contentFit="cover" />
              ) : (
                <View style={s.placeholderWrap}>
                  <View style={s.placeholderIcon}>
                    {hasVideo ? <Film size={32} color={BRAND_PRIMARY} /> : <Dumbbell size={32} color={BRAND_PRIMARY} />}
                  </View>
                  <Text style={s.placeholderText}>
                    {hasVideo ? t('library.exerciseDetail.playVideo') : getTranslatedExerciseName(exercise.name, t)}
                  </Text>
                </View>
              )}
              {hasVideo && !hasGif && (
                <TouchableOpacity style={s.playBtn} onPress={toggleVideo} activeOpacity={0.8} accessibilityLabel={t('library.exerciseDetail.playVideo')} accessibilityRole="button">
                  <Play size={26} color="#fff" fill="#fff" />
                </TouchableOpacity>
              )}
              <LinearGradient
                colors={['transparent', isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)']}
                style={s.mediaGradient}
              />
              <TouchableOpacity style={s.backBtn} onPress={handleBackWithPiP} activeOpacity={0.7} accessibilityLabel={t('common.back', { defaultValue: 'Go back' })} accessibilityRole="button">
                <ArrowLeft size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* ── Content card ── */}
        <View style={s.contentCard}>
          <View style={s.body}>

            {/* Title + badges */}
            <View style={s.titleWrap}>
              <Text style={s.title}>{getTranslatedExerciseName(exercise.name, t)}</Text>
              <View style={s.badgeRow}>
                {exercise.category && (
                  <View style={[s.badge, { backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
                    <Target size={13} color={BRAND_PRIMARY} />
                    <Text style={[s.badgeText, { color: BRAND_WHITE }]}>{exercise.category}</Text>
                  </View>
                )}
                {exercise.difficulty && (
                  <View style={[s.badge, {
                    backgroundColor: `${difficultyColor}18`,
                    borderColor: `${difficultyColor}50`,
                  }]}>
                    <Award size={13} color={difficultyColor} />
                    <Text style={[s.badgeText, { color: difficultyColor }]}>{exercise.difficulty}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* CTA row: Add to workout + Share */}
            <View style={s.ctaRow}>
              <TouchableOpacity style={s.addToWorkoutBtn} onPress={handleAddToWorkout} activeOpacity={0.8} accessibilityLabel={t('library.exerciseDetail.addToWorkout', { defaultValue: 'Add to Workout' })} accessibilityRole="button">
                <Plus size={18} color="#fff" />
                <Text style={s.addToWorkoutText}>{t('library.exerciseDetail.addToWorkout', { defaultValue: 'Add to Workout' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.7} accessibilityLabel={t('library.exerciseDetail.share', { defaultValue: 'Share' })} accessibilityRole="button">
                <Share2 size={20} color={BRAND_WHITE} />
              </TouchableOpacity>
            </View>

            {/* Stats strip */}
            {(exercise.default_sets || exercise.default_reps || exercise.default_rest_time) && (
              <View style={s.statsStrip}>
                {exercise.default_sets != null && (
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{exercise.default_sets}</Text>
                    <Text style={s.statLabel}>{t('library.sets')}</Text>
                  </View>
                )}
                {exercise.default_sets != null && exercise.default_reps != null && <View style={s.statDivider} />}
                {exercise.default_reps != null && (
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{exercise.default_reps}</Text>
                    <Text style={s.statLabel}>{t('library.reps')}</Text>
                  </View>
                )}
                {exercise.default_reps != null && exercise.default_rest_time != null && <View style={s.statDivider} />}
                {exercise.default_rest_time != null && (
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{exercise.default_rest_time}<Text style={{ fontSize: getScaledFontSize(14) }}>s</Text></Text>
                    <Text style={s.statLabel}>{t('library.restTime')}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Muscle groups */}
            {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Target size={18} color={BRAND_PRIMARY} />
                  <Text style={s.sectionTitle}>{t('library.exerciseDetail.muscleGroups')}</Text>
                </View>
                <View style={s.sectionCard}>
                  <View style={s.tagsWrap}>
                    {exercise.muscle_groups.map((mg, i) => (
                      <View key={i} style={s.tag}>
                        <Text style={s.tagText}>{mg}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Equipment */}
            {exercise.equipment && exercise.equipment.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Dumbbell size={18} color={BRAND_PRIMARY} />
                  <Text style={s.sectionTitle}>{t('library.exerciseDetail.equipment')}</Text>
                </View>
                <View style={s.sectionCard}>
                  <View style={s.tagsWrap}>
                    {exercise.equipment.map((eq, i) => (
                      <View key={i} style={s.tag}>
                        <Dumbbell size={13} color={BRAND_PRIMARY} />
                        <Text style={s.tagText}>{eq}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Instructions */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Info size={18} color={BRAND_PRIMARY} />
                <Text style={s.sectionTitle}>{t('library.exerciseDetail.instructions')}</Text>
              </View>
              <View style={s.sectionCard}>
                {exercise.instructions ? (() => {
                  const { isNumbered, steps } = parseInstructions(exercise.instructions);
                  if (isNumbered) {
                    return (
                      <View>
                        {steps.map((step, i) => (
                          <View key={i} style={[s.stepRow, i === steps.length - 1 && { marginBottom: 0 }]}>
                            <View style={s.stepNumber}>
                              <Text style={s.stepNumberText}>{i + 1}</Text>
                            </View>
                            <Text style={s.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  }
                  return <Text style={s.instructionsText}>{exercise.instructions}</Text>;
                })() : (
                  <Text style={s.noDataText}>{t('library.exerciseDetail.noInstructions')}</Text>
                )}
              </View>
            </View>

            {/* Tips */}
            {(exercise as any).tips && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Lightbulb size={18} color={BRAND_PRIMARY} />
                  <Text style={s.sectionTitle}>{t('library.exerciseDetail.tips')}</Text>
                </View>
                <View style={s.sectionCard}>
                  <Text style={s.instructionsText}>{(exercise as any).tips}</Text>
                </View>
              </View>
            )}

            {/* Related exercises */}
            {relatedExercises.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <ChevronRight size={18} color={BRAND_PRIMARY} />
                  <Text style={s.sectionTitle}>{t('library.exerciseDetail.relatedExercises', { defaultValue: 'Related Exercises' })}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.relatedScroll}>
                  {relatedExercises.map((rel) => (
                    <TouchableOpacity
                      key={rel.id}
                      style={s.relatedCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.push('ExerciseDetail', { exerciseId: rel.id, exerciseName: rel.name })}
                      accessibilityLabel={getTranslatedExerciseName(rel.name, t)}
                      accessibilityRole="button"
                    >
                      {rel.image_url ? (
                        <Image source={{ uri: rel.image_url }} style={s.relatedImage} contentFit="cover" />
                      ) : (
                        <View style={s.relatedPlaceholder}>
                          <Dumbbell size={24} color={BRAND_PRIMARY} />
                        </View>
                      )}
                      <Text style={s.relatedName} numberOfLines={2}>{getTranslatedExerciseName(rel.name, t)}</Text>
                      {rel.category && <Text style={s.relatedBadge} numberOfLines={1}>{rel.category}</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

          </View>
        </View>
      </ScrollView>
    </View>
  );
};
