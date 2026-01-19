import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  type DimensionValue,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { ArrowLeft, Play, Info, Dumbbell, Target, Award, X, Repeat, Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import type { LibraryStackParamList } from '@/types';
import { workoutService, Exercise } from '@/services/workouts';
import { useTranslation } from 'react-i18next';
import { getTranslatedExerciseName } from '@/utils/exerciseTranslations';

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
  const videoRef = React.useRef<Video>(null);

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  useEffect(() => {
    const loadExercise = async () => {
      try {
        setLoading(true);
        // First try to find by ID (UUID for custom workouts)
        let found = await workoutService.getExerciseById(route.params.exerciseId);

        // If not found by ID and we have exercise name, try to find by name (for native workouts with string IDs)
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

  const handleVideoError = () => {
    setVideoError(true);
    setShowVideo(false);
  };

  const toggleVideo = () => {
    if (exercise?.video_url && !videoError) {
      setShowVideo(!showVideo);
    }
  };

  const isVideoUrl = (url: string) => {
    return /\.(mp4|mov|avi|webm|m3u8)(\?.*)?$/i.test(url);
  };

  const isGifUrl = (url: string) => {
    return /\.gif(\?.*)?$/i.test(url);
  };

  const difficultyStyle = exercise?.difficulty
    ? exercise.difficulty.toLowerCase() === 'beginner'
      ? { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.15)', borderColor: 'rgba(76, 175, 80, 0.5)' }
      : exercise.difficulty.toLowerCase() === 'intermediate'
        ? { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.15)', borderColor: 'rgba(255, 152, 0, 0.5)' }
        : { backgroundColor: isDark ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.15)', borderColor: 'rgba(244, 67, 54, 0.5)' }
    : {};

  const difficultyTextStyle = exercise?.difficulty
    ? exercise.difficulty.toLowerCase() === 'beginner'
      ? { color: '#4CAF50' }
      : exercise.difficulty.toLowerCase() === 'intermediate'
        ? { color: '#FF9800' }
        : { color: '#F44336' }
    : {};

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: BRAND_BLACK,
    },
    backButton: {
      position: 'absolute' as const,
      top: insets.top + getResponsiveSpacing(10),
      left: getResponsiveSpacing(16),
      zIndex: 10,
      width: scaleWidth(40),
      height: scaleHeight(40),
      borderRadius: scaleWidth(20),
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    contentCard: {
      backgroundColor: BRAND_BLACK,
      borderTopLeftRadius: getResponsiveSpacing(50),
      borderTopRightRadius: getResponsiveSpacing(50),
      marginTop: -getResponsiveSpacing(50),
      paddingTop: getResponsiveSpacing(30),
      paddingBottom: getResponsiveSpacing(50),
      minHeight: SCREEN_HEIGHT - scaleHeight(250),
    },
    content: {
      flex: 1,
    },
    imageContainer: {
      width: SCREEN_WIDTH,
      height: scaleHeight(300),
      position: 'relative' as const,
      backgroundColor: isDark ? '#373737' : getTextColorWithOpacity(false, 0.1),
    },
    image: {
      width: '100%' as DimensionValue,
      height: '100%' as DimensionValue,
    },
    imageOverlay: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: '40%' as DimensionValue,
    },
    videoContainer: {
      width: SCREEN_WIDTH,
      height: scaleHeight(300),
      backgroundColor: '#000',
    },
    video: {
      width: '100%' as DimensionValue,
      height: '100%' as DimensionValue,
    },
    videoCloseButton: {
      position: 'absolute' as const,
      top: getResponsiveSpacing(16),
      right: getResponsiveSpacing(16),
      width: scaleWidth(40),
      height: scaleHeight(40),
      borderRadius: scaleWidth(20),
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 10,
    },
    playButton: {
      position: 'absolute' as const,
      top: '50%' as DimensionValue,
      left: '50%' as DimensionValue,
      transform: [{ translateX: -scaleWidth(40) }, { translateY: -scaleHeight(40) }],
      width: scaleWidth(80),
      height: scaleHeight(80),
      borderRadius: scaleWidth(40),
      backgroundColor: 'rgba(132, 196, 65, 0.9)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 4,
      borderColor: BRAND_WHITE,
    },
    infoSection: {
      padding: getResponsiveSpacing(24),
      gap: getResponsiveSpacing(24),
    },
    titleSection: {
      gap: getResponsiveSpacing(12),
    },
    exerciseName: {
      fontSize: getResponsiveFontSize(28),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
    },
    metadataRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: getResponsiveSpacing(12),
      alignItems: 'center' as const,
    },
    badge: {
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(6),
      borderRadius: getResponsiveSpacing(16),
      borderWidth: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(6),
    },
    badgeText: {
      fontSize: getScaledFontSize(13),
      fontWeight: '600' as const,
      fontFamily: 'Barlow_600SemiBold',
    },
    section: {
      gap: getResponsiveSpacing(12),
    },
    sectionTitleContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(24),
    },
    sectionTitleText: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
    },
    sectionContent: {
      // backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5',
      borderRadius: getResponsiveSpacing(24),
      padding: getResponsiveSpacing(24),
      borderWidth: 1,
      borderColor: '#266637',
    },
    instructionsText: {
      fontSize: getScaledFontSize(15),
      lineHeight: getScaledFontSize(24),
      color: getTextColorWithOpacity(isDark, 0.9),
      fontFamily: 'Barlow_400Regular',
    },
    tagsContainer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: getResponsiveSpacing(8),
    },
    tag: {
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(6),
      borderRadius: getResponsiveSpacing(12),
      backgroundColor: isDark ? getPrimaryWithOpacity(0.2) : getPrimaryWithOpacity(0.15),
      borderWidth: 1,
      borderColor: getPrimaryWithOpacity(0.3),
    },
    tagText: {
      fontSize: getScaledFontSize(13),
      color: BRAND_PRIMARY,
      fontFamily: 'Barlow_500Medium',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: getResponsiveSpacing(24),
    },
    emptyText: {
      fontSize: getScaledFontSize(16),
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_400Regular',
      textAlign: 'center' as const,
    },
    setsRepsContainer: {
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
      alignItems: 'center' as const,
      paddingVertical: getResponsiveSpacing(16),
    },
    setsRepsItem: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: getResponsiveSpacing(8),
    },
    setsRepsIcon: {
      width: scaleWidth(48),
      height: scaleHeight(48),
      borderRadius: scaleWidth(24),
      backgroundColor: '#050505',
      marginBottom: getResponsiveSpacing(8),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    setsRepsContent: {
      flex: 1,
    },
    setsRepsLabel: {
      fontSize: getScaledFontSize(12),
      fontWeight: '700' as const,
      color: getTextColorWithOpacity(isDark, 0.5),
      fontFamily: 'Barlow_700Bold',
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
    setsRepsValue: {
      fontSize: getResponsiveFontSize(32),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
      marginBottom: -4,
    },
    divider: {
      width: 1,
      height: '60%' as DimensionValue,
      backgroundColor: getTextColorWithOpacity(isDark, 0.1),
    },
  }), [isDark, textSize, BRAND_BLACK, BRAND_WHITE, BRAND_PRIMARY, insets.top]);

  if (loading) {
    return (
      <View style={[dynamicStyles.container, dynamicStyles.loadingContainer]}>
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[dynamicStyles.container, dynamicStyles.emptyContainer]}>
        <Text style={dynamicStyles.emptyText}>
          {t('library.exerciseDetail.noInstructions')}
        </Text>
      </View>
    );
  }

  const hasVideo = exercise.video_url && !videoError;
  const hasGif = exercise.video_url && isGifUrl(exercise.video_url);
  const showVideoPlayer = hasVideo && showVideo && exercise.video_url && isVideoUrl(exercise.video_url);

  return (
    <View style={dynamicStyles.container}>
      <ScrollView
        style={dynamicStyles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={dynamicStyles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={BRAND_WHITE} />
        </TouchableOpacity>

        {/* Image/Video Section */}
        <View style={dynamicStyles.imageContainer}>
          {showVideoPlayer ? (
            <View style={dynamicStyles.videoContainer}>
              <Video
                ref={videoRef}
                source={{ uri: exercise.video_url! }}
                style={dynamicStyles.video}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                onError={handleVideoError}
              />
              <TouchableOpacity
                style={dynamicStyles.videoCloseButton}
                onPress={() => setShowVideo(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={BRAND_WHITE} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {hasGif ? (
                <Image
                  source={{ uri: exercise.video_url! }}
                  style={dynamicStyles.image}
                  contentFit="cover"
                />
              ) : (
                <Image
                  source={{ uri: exercise.image_url || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800' }}
                  style={dynamicStyles.image}
                  contentFit="cover"
                />
              )}
              {hasVideo && !hasGif && (
                <TouchableOpacity
                  style={dynamicStyles.playButton}
                  onPress={toggleVideo}
                  activeOpacity={0.8}
                >
                  <Play size={32} color={BRAND_WHITE} fill={BRAND_WHITE} />
                </TouchableOpacity>
              )}
              <LinearGradient
                colors={isDark
                  ? ['transparent', 'rgba(0,0,0,0.6)']
                  : ['transparent', 'rgba(0,0,0,0.4)']
                }
                style={dynamicStyles.imageOverlay}
              />
            </>
          )}
        </View>

        {/* Content Card with Overlap */}
        <View style={dynamicStyles.contentCard}>
          <View style={dynamicStyles.infoSection}>
            {/* Title and Metadata */}
            <View style={dynamicStyles.titleSection}>
              <Text style={dynamicStyles.exerciseName}>
                {getTranslatedExerciseName(exercise.name, t)}
              </Text>
              <View style={dynamicStyles.metadataRow}>
                {exercise.category && (
                  <View style={[dynamicStyles.badge, {
                    backgroundColor: isDark ? '#373737' : getTextColorWithOpacity(false, 0.1),
                    borderColor: getTextColorWithOpacity(isDark, 0.3),
                  }]}>
                    <Target size={14} color={BRAND_PRIMARY} />
                    <Text style={[dynamicStyles.badgeText, { color: BRAND_WHITE }]}>
                      {exercise.category}
                    </Text>
                  </View>
                )}
                {exercise.difficulty && (
                  <View style={[dynamicStyles.badge, difficultyStyle]}>
                    <Award size={14} color={difficultyTextStyle.color || BRAND_WHITE} />
                    <Text style={[dynamicStyles.badgeText, difficultyTextStyle]}>
                      {exercise.difficulty}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Sets/Reps/Rest Time */}
            {(exercise.default_sets || exercise.default_reps || exercise.default_rest_time) && (
              <View style={dynamicStyles.section}>
                <View style={dynamicStyles.sectionTitleContainer}>
                  <Repeat size={20} color={BRAND_PRIMARY} />
                  <Text style={dynamicStyles.sectionTitleText}>
                    {t('library.exerciseDetail.recommendedSetsReps')}
                  </Text>
                </View>
                <LinearGradient
                  colors={['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)']}
                  style={dynamicStyles.sectionContent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={dynamicStyles.setsRepsContainer}>
                    {/* Sets */}
                    {exercise.default_sets !== undefined && exercise.default_sets !== null && (
                      <View style={dynamicStyles.setsRepsItem}>
                        <View style={dynamicStyles.setsRepsIcon}>
                          <Repeat size={20} color={BRAND_PRIMARY} />
                        </View>
                        <Text style={dynamicStyles.setsRepsValue}>
                          {exercise.default_sets}
                        </Text>
                        <Text style={dynamicStyles.setsRepsLabel}>
                          {t('library.sets')}
                        </Text>
                      </View>
                    )}

                    {/* Divider */}
                    <View style={dynamicStyles.divider} />

                    {/* Reps */}
                    {exercise.default_reps !== undefined && exercise.default_reps !== null && (
                      <View style={dynamicStyles.setsRepsItem}>
                        <View style={dynamicStyles.setsRepsIcon}>
                          <Repeat size={20} color={BRAND_PRIMARY} />
                        </View>
                        <Text style={dynamicStyles.setsRepsValue}>
                          {exercise.default_reps}
                        </Text>
                        <Text style={dynamicStyles.setsRepsLabel}>
                          {t('library.reps')}
                        </Text>
                      </View>
                    )}

                    {/* Divider */}
                    <View style={dynamicStyles.divider} />

                    {/* Rest Time */}
                    {exercise.default_rest_time !== undefined && exercise.default_rest_time !== null && (
                      <View style={dynamicStyles.setsRepsItem}>
                        <View style={dynamicStyles.setsRepsIcon}>
                          <Clock size={20} color={BRAND_PRIMARY} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                          <Text style={dynamicStyles.setsRepsValue}>
                            {exercise.default_rest_time}
                          </Text>
                          <Text style={[dynamicStyles.setsRepsLabel, { marginBottom: 6, fontSize: 10 }]}>S</Text>
                        </View>
                        <Text style={dynamicStyles.setsRepsLabel}>
                          {t('library.restTime')}
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Muscle Groups */}
            {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
              <View style={dynamicStyles.section}>
                <View style={dynamicStyles.sectionTitleContainer}>
                  <Target size={20} color={BRAND_PRIMARY} />
                  <Text style={dynamicStyles.sectionTitleText}>
                    {t('library.exerciseDetail.muscleGroups')}
                  </Text>
                </View>
                <LinearGradient
                  colors={['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)']}
                  style={dynamicStyles.sectionContent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={dynamicStyles.tagsContainer}>
                    {exercise.muscle_groups.map((mg, idx) => (
                      <View key={idx} style={dynamicStyles.tag}>
                        <Text style={dynamicStyles.tagText}>{mg}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Equipment */}
            {
              exercise.equipment && exercise.equipment.length > 0 && (
                <View style={dynamicStyles.section}>
                  <View style={dynamicStyles.sectionTitleContainer}>
                    <Dumbbell size={20} color={BRAND_PRIMARY} />
                    <Text style={dynamicStyles.sectionTitleText}>
                      {t('library.exerciseDetail.equipment')}
                    </Text>
                  </View>
                  <LinearGradient
                    colors={['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)']}
                    style={dynamicStyles.sectionContent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={dynamicStyles.tagsContainer}>
                      {exercise.equipment.map((eq, idx) => (
                        <View key={idx} style={[dynamicStyles.tag, {
                          flexDirection: 'row' as const,
                          alignItems: 'center' as const,
                          gap: getResponsiveSpacing(6),
                        }]}>
                          <Dumbbell size={14} color={BRAND_PRIMARY} />
                          <Text style={dynamicStyles.tagText}>{eq}</Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </View>
              )
            }

            {/* Instructions */}
            {
              exercise.instructions ? (
                <View style={dynamicStyles.section}>
                  <View style={dynamicStyles.sectionTitleContainer}>
                    <Info size={20} color={BRAND_PRIMARY} />
                    <Text style={dynamicStyles.sectionTitleText}>
                      {t('library.exerciseDetail.instructions')}
                    </Text>
                  </View>
                  <LinearGradient
                    colors={['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)']}
                    style={dynamicStyles.sectionContent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={dynamicStyles.instructionsText}>
                      {exercise.instructions}
                    </Text>
                  </LinearGradient>
                </View>
              ) : (
                <View style={dynamicStyles.section}>
                  <View style={dynamicStyles.sectionTitleContainer}>
                    <Info size={20} color={BRAND_PRIMARY} />
                    <Text style={dynamicStyles.sectionTitleText}>
                      {t('library.exerciseDetail.instructions')}
                    </Text>
                  </View>
                  <LinearGradient
                    colors={['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)']}
                    style={dynamicStyles.sectionContent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[dynamicStyles.instructionsText, { color: getTextColorWithOpacity(isDark, 0.5) }]}>
                      {t('library.exerciseDetail.noInstructions')}
                    </Text>
                  </LinearGradient>
                </View>
              )
            }
          </View>
        </View>
      </ScrollView >
    </View >
  );
};

