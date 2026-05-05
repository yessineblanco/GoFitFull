import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Text,
  RefreshControl,
  useWindowDimensions,
  Animated,
  Pressable
} from 'react-native';
import { AppText } from '@/components/shared/AppText';
import { useTabScroll } from '@/hooks/useTabScroll';
import {
  Share, Check, Flame, Timer, Activity,
  Dumbbell, Footprints,
  BicepsFlexed,
  Move,
  Accessibility,
  Scale,
  CircleMinus,
  Shield,
  AlignJustify,
  ChevronUp,
  ChevronRight,
  Trophy,
  Apple,
  ImagePlus
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/authStore';
import { useHealthStore } from '@/store/healthStore';
import { fetchWorkoutStatistics, fetchLifetimePRs } from '@/services/workoutStats';
import { getSessions } from '@/services/workoutSessions';
import { workoutService } from '@/services/workouts';
import { listProgressPhotos, ProgressPhoto } from '@/services/progressPhotos';
import type { WorkoutStatsData, PersonalRecord, MuscleGroupData, VolumeProgressItem } from '@/services/workoutStats';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Shimmer, ChartSkeleton, StatCardSkeleton, PRCardSkeleton } from '@/components/shared/Shimmer';
import { ErrorState } from '@/components/shared/ErrorState';
import { useThemeStore } from '@/store/themeStore';
import { supabase } from '@/config/supabase';

const THEME = {
  primary: '#84c440',
  primaryHover: '#95d650',
  secondary: '#8dbb5a',
  background: '#030303',
  surface: '#121212',
  surfaceLight: '#1c1c1c',
  card: '#1a1f14',
  text: '#ffffff',
  textDim: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const getThemeColors = (isDark: boolean) => ({
  background: isDark ? '#030303' : '#FAFBFC',
  surface: isDark ? '#121212' : '#F5F7F9',
  surfaceLight: isDark ? '#1c1c1c' : '#EEF1F4',
  card: isDark ? '#1a1f14' : '#F0F4EA',
  text: isDark ? '#ffffff' : '#1A1D21',
  textDim: isDark ? 'rgba(255, 255, 255, 0.6)' : '#5A6570',
  textMuted: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.35)',
  border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
  glassPanel: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.6)',
  overlayBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0, 0, 0, 0.06)',
});

const useTC = () => {
  const { isDark } = useThemeStore();
  return { isDark, ...getThemeColors(isDark) };
};

type BodyMeasurementHistoryEntry = {
  id: string;
  measurement_date?: string | null;
  created_at?: string | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  shoulder_cm: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  shoulder_width: number | null;
  measurement_confidence: number | null;
  source?: string | null;
};

function numberOrNull(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function resolveBodyMeasurements(entry: BodyMeasurementHistoryEntry) {
  return {
    chest: numberOrNull(entry.chest_cm ?? entry.chest),
    waist: numberOrNull(entry.waist_cm ?? entry.waist),
    hip: numberOrNull(entry.hip_cm ?? entry.hips),
    shoulder: numberOrNull(entry.shoulder_cm ?? entry.shoulder_width),
  };
}

function formatBodyMeasurementDate(entry: BodyMeasurementHistoryEntry) {
  const raw = entry.measurement_date || entry.created_at;
  if (!raw) return 'Unknown date';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBodyMeasurementSource(source: string | null | undefined) {
  if (!source) return 'Saved scan';
  if (source === 'ai_ondevice') return 'AI on-device';
  if (source === 'manual') return 'Manual';
  if (source === 'ai') return 'AI';
  return source;
}

function formatBodyMeasurementValue(value: number | null) {
  if (value == null) return '--';
  return `${Math.round(value * 10) / 10} cm`;
}

function formatMeasurementConfidence(value: number | null) {
  if (value == null) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function formatSleepMinutes(minutes: number | null | undefined) {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatOptionalMetric(value: number | null | undefined) {
  return value ? value.toLocaleString() : '--';
}

// --- Helper Components ---

const GlassPanel = ({ children, style, intensity = 1, isDark = true }: { children: React.ReactNode, style?: any, intensity?: number, isDark?: boolean }) => (
  <View style={[styles.glassPanel, {
    backgroundColor: isDark ? `rgba(255, 255, 255, ${0.03 * intensity})` : `rgba(255, 255, 255, ${0.6 * intensity})`,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
  }, style]}>
    {children}
  </View>
);

const BodyMeasurementsSection = ({ measurements }: { measurements: BodyMeasurementHistoryEntry[] }) => {
  const TC = useTC();
  const [expanded, setExpanded] = useState(false);
  const latest = measurements[0];
  const recent = measurements.slice(1);
  const latestValues = latest ? resolveBodyMeasurements(latest) : null;
  const canExpand = recent.length > 0;

  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
      <View
        style={[
          styles.bodyMeasurementsCard,
          {
            backgroundColor: TC.isDark ? '#0f110d' : '#F0F4EA',
            borderColor: TC.isDark ? '#266637' : 'rgba(132, 196, 65, 0.2)',
          },
        ]}
      >
        <View style={styles.bodyMeasurementsHeaderRow}>
          <View style={styles.bodyMeasurementsHeaderMain}>
            <View style={[styles.bodyMeasurementsHeaderIcon, { backgroundColor: TC.overlayBg, borderColor: TC.border }]}>
              <Accessibility size={18} color={THEME.primary} />
            </View>
            <View style={styles.bodyMeasurementsHeaderCopy}>
              <Text style={[styles.cardTitle, { color: TC.text }]}>Body measurements</Text>
              <Text style={[styles.cardSubtitle, { color: TC.textMuted }]}>
                {latest ? `Latest scan · ${formatBodyMeasurementDate(latest)}` : 'Save a body scan to see it here.'}
              </Text>
            </View>
          </View>
          <View style={styles.bodyMeasurementsHeaderActions}>
            {measurements.length > 0 ? (
              <View style={[styles.bodyMeasurementsCountPill, { backgroundColor: TC.overlayBg }]}>
                <Text style={[styles.bodyMeasurementsCountText, { color: TC.text }]}>{measurements.length} saved</Text>
              </View>
            ) : null}
            {canExpand ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setExpanded((value) => !value)}
                style={[styles.bodyMeasurementsExpandButton, { backgroundColor: TC.overlayBg, borderColor: TC.border }]}
              >
                {expanded ? <ChevronUp size={16} color={TC.text} /> : <ChevronRight size={16} color={TC.text} />}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {!latest || !latestValues ? (
          <Text style={[styles.bodyMeasurementsEmptyText, { color: TC.textDim }]}>Your saved body scans will appear here inside Progress.</Text>
        ) : (
          <>
            <View style={styles.bodyMeasurementsSummaryGrid}>
              {[
                ['Chest', latestValues.chest],
                ['Waist', latestValues.waist],
                ['Hip', latestValues.hip],
                ['Shoulder', latestValues.shoulder],
              ].map(([label, value]) => (
                <View
                  key={label}
                  style={[
                    styles.bodyMeasurementsSummaryChip,
                    {
                      backgroundColor: TC.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                      borderColor: TC.border,
                    },
                  ]}
                >
                  <Text style={[styles.bodyMeasurementsSummaryLabel, { color: TC.textMuted }]}>{label}</Text>
                  <Text style={[styles.bodyMeasurementsSummaryValue, { color: TC.text }]}>{formatBodyMeasurementValue(value as number | null)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.bodyMeasurementsMetaRow}>
              <Text style={[styles.bodyMeasurementsMetaText, { color: TC.textDim }]}>
                {formatBodyMeasurementSource(latest.source)}
              </Text>
              <View style={[styles.bodyMeasurementsMetaDot, { backgroundColor: TC.textMuted }]} />
              <Text style={[styles.bodyMeasurementsMetaText, { color: TC.textDim }]}>
                Confidence {formatMeasurementConfidence(latest.measurement_confidence)}
              </Text>
            </View>

            {canExpand ? (
              <View style={styles.bodyMeasurementsHistoryWrap}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpanded((value) => !value)}
                  style={[
                    styles.bodyMeasurementsHistoryToggle,
                    {
                      borderTopColor: TC.border,
                    },
                  ]}
                >
                  <Text style={[styles.bodyMeasurementsHistoryToggleText, { color: THEME.primary }]}>
                    {expanded ? 'Hide history' : `View history (${recent.length})`}
                  </Text>
                  {expanded ? <ChevronUp size={16} color={THEME.primary} /> : <ChevronRight size={16} color={THEME.primary} />}
                </TouchableOpacity>

                {expanded ? (
                  <View style={styles.bodyMeasurementsHistoryList}>
                    {recent.map((entry) => {
                      const values = resolveBodyMeasurements(entry);
                      return (
                        <View
                          key={entry.id}
                          style={[
                            styles.bodyMeasurementsHistoryItem,
                            {
                              borderTopColor: TC.border,
                            },
                          ]}
                        >
                          <View style={styles.bodyMeasurementsHistoryItemHeader}>
                            <Text style={[styles.bodyMeasurementsHistoryDate, { color: TC.text }]}>
                              {formatBodyMeasurementDate(entry)}
                            </Text>
                            <Text style={[styles.bodyMeasurementsHistorySource, { color: TC.textDim }]}>
                              {formatBodyMeasurementSource(entry.source)}
                            </Text>
                          </View>
                          <Text style={[styles.bodyMeasurementsHistoryValues, { color: TC.textDim }]}>
                            Chest {formatBodyMeasurementValue(values.chest)} | Waist {formatBodyMeasurementValue(values.waist)} | Hip {formatBodyMeasurementValue(values.hip)} | Shoulder {formatBodyMeasurementValue(values.shoulder)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

// --- Animation Components ---

const BreathingIcon = ({ children, duration = 3000 }: { children: React.ReactNode, duration?: number }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15, // Scale up slightly
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1, // Back to normal
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [duration, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
};

const MovingBackgroundBlob = ({ color, startDelay = 0 }: { color: string, startDelay?: number }) => {
  // Move from bottom-right (0,0) towards top-left, then back
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = Animated.loop(
      Animated.sequence([
        Animated.delay(startDelay),
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -40,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 9000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 8000,
            useNativeDriver: true,
          })
        ]),
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 9000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          })
        ])
      ])
    );

    animate.start();
    return () => animate.stop();
  }, [startDelay, translateX, translateY, scale]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-15%',
        width: '40%',
        aspectRatio: 1,
        borderRadius: 1000,
        backgroundColor: color,
        zIndex: -1,
        opacity: 0.6,
        transform: [{ translateX }, { translateY }, { scale }]
      }}
    >
      {/* Fallback for blur on native if filter not supported, opacity helps */}
    </Animated.View>
  );
};


const SectionHeader = ({ title, action }: { title: string, action?: React.ReactNode }) => {
  const TC = useTC();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: TC.text }]}>{title}</Text>
      {action}
    </View>
  );
};

// --- Sections ---

// --- 1. Personal Records Component ---
const PersonalRecordsParams = ({ records, unit }: { records: PersonalRecord[], unit: 'lbs' | 'kg' }) => {
  const TC = useTC();
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth * 0.85;

  if (!records.length) return null;

  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: TC.text }]}>PERSONAL RECORDS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
        snapToInterval={cardWidth + 16}
        decelerationRate="fast"
      >
        {records.map((record, index) => {
          // Mock images for visual demo
          const bgImage = index % 3 === 0
            ? 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop'
            : index % 3 === 1
              ? 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop'
              : 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop';

          const isNewRecord = index === 0;

          return (
            <TouchableOpacity
              key={index}
              onPress={() => navigation.navigate('RecordDetails', { record, bgImage, unit })}
              activeOpacity={0.9}
            >
              <View style={[styles.prCardContainer, { width: cardWidth }]}>
                <View style={styles.prCardImageWrapper}>
                  <ImageBackground
                    source={{ uri: bgImage }}
                    style={styles.prCardBg}
                    imageStyle={{ opacity: 0.4 }}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.9)']}
                      style={StyleSheet.absoluteFill}
                    />
                  </ImageBackground>
                </View>

                <View style={styles.prContent}>
                  <View style={styles.prHeader}>
                    <View style={[styles.badge, isNewRecord ? styles.badgePrimary : styles.badgeDefault]}>
                      <Text style={[styles.badgeText, isNewRecord ? { color: THEME.primary } : { color: '#ccc' }]}>
                        {isNewRecord ? 'NEW RECORD' : 'PERSONAL BEST'}
                      </Text>
                    </View>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateText}>{record.date}</Text>
                    </View>
                  </View>

                  <View style={styles.prBody}>
                    <Text style={styles.exerciseName} numberOfLines={1} adjustsFontSizeToFit>{record.exercise}</Text>
                    <View style={styles.weightRow}>
                      <Text style={styles.bigWeight} numberOfLines={1} adjustsFontSizeToFit>{unit === 'kg' ? Math.round(record.weight * 0.453592) : record.weight}</Text>
                      <Text style={styles.unitText}>{unit.toUpperCase()}</Text>
                    </View>

                    {/* Simulated Chart Bars */}
                    <View style={styles.miniChart}>
                      {[0.3, 0.45, 0.5, 0.35, 0.6, 0.8, 1.0].map((h, i) => (
                        <View key={i} style={[
                          styles.bar,
                          { height: `${h * 100}%` },
                          i === 6 ? { backgroundColor: THEME.primary, shadowColor: THEME.primary, shadowOpacity: 0.5, shadowRadius: 10 } : {}
                        ]} />
                      ))}
                    </View>
                  </View>

                  <View style={styles.shareButton}>
                    <Share size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={[styles.shareText, { color: '#fff' }]}>Share Achievement</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Current Workout Card
// Current Workout Card
interface CurrentWorkoutCardProps {
  workoutName: string;
  blockName: string;
  focus: string;
  currentDay: number;
  totalDays: number;
}

const CurrentWorkoutCard = ({ workoutName, blockName, focus, currentDay, totalDays }: CurrentWorkoutCardProps) => {
  const TC = useTC();
  const currentWeek = currentDay;
  const totalWeeks = totalDays;
  const progressPercent = Math.round(((currentWeek) / totalWeeks) * 100);

  return (
    <View style={[styles.currentWorkoutCard, { backgroundColor: TC.isDark ? 'rgba(132, 196, 65, 0.08)' : 'rgba(132, 196, 65, 0.06)', borderColor: TC.border }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ gap: 4 }}>
          <View style={styles.currentWorkoutHeader}>
            <View style={styles.statusDot} />
            <Text style={[styles.statusText, { color: TC.textDim }]}>CURRENT WORKOUT</Text>
          </View>
          <Text style={[styles.currentWorkoutTitle, { color: TC.text }]}>{blockName}</Text>
          <Text style={[styles.currentWorkoutSubtitle, { color: TC.textDim }]}>Difficulty: <Text style={{ color: TC.text, fontWeight: 'bold' }}>{focus}</Text></Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.goalPercentageLarge, { color: THEME.primary }]}>{progressPercent}%</Text>
          <Text style={[styles.goalLabelSmall, { color: TC.textDim }]}>DONE</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {Array.from({ length: totalWeeks }).map((_, i) => {
          const weekNum = i + 1;
          const isActive = weekNum <= currentWeek;
          const isCurrent = weekNum === currentWeek;

          return (
            <View key={i} style={{ flex: 1, gap: 8 }}>
              <View style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: isActive ? THEME.primary : TC.overlayBg,
                shadowColor: isActive ? THEME.primary : undefined,
                shadowOpacity: isActive ? 0.5 : 0,
                shadowRadius: 8
              }} />
              <Text style={{
                textAlign: 'center',
                fontSize: 10,
                fontWeight: '700',
                color: isCurrent ? TC.text : TC.textMuted,
                textTransform: 'uppercase'
              }}>
                Wk {weekNum}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const ConsistencyCalendar = ({ volumeData, streak }: { volumeData: VolumeProgressItem[], streak: number }) => {
  const TC = useTC();
  const navigation = useNavigation<any>();
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  const chartData = days.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const hasWorkout = volumeData.some(v => v.date.startsWith(dateStr) && v.volume > 0);
    const dayLetter = date.toLocaleDateString('en-US', { weekday: 'narrow' });
    return { date: dateStr, hasWorkout, dayLetter };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ConsistencyDetails', { streak, volumeData })}
    >
      <View style={[styles.consistencyCard, { backgroundColor: TC.isDark ? '#0f110d' : '#F0F4EA', borderColor: TC.isDark ? '#266637' : 'rgba(132, 196, 65, 0.2)' }]}>
        <View style={styles.consistencyHeaderNew}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Flame size={20} color={THEME.primary} fill={THEME.primary} />
            <Text style={[styles.cardTitle, { color: TC.text }]}>Consistency</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: TC.textMuted }]}>Last 7 Days</Text>
        </View>

        <View style={styles.daysRow}>
          {chartData.map((item, index) => {
            const isToday = index === 6;
            return (
              <View key={index} style={styles.dayCol}>
                <View style={[
                  styles.dayCircle,
                  item.hasWorkout
                    ? { backgroundColor: THEME.primary }
                    : isToday
                      ? { borderColor: THEME.primary, borderWidth: 1.5, backgroundColor: 'rgba(132, 196, 64, 0.1)' }
                      : { borderColor: TC.border, borderWidth: 1.5 }
                ]} />
                <Text style={[styles.dayLetter, { color: TC.textMuted }, isToday && { color: THEME.primary }]}>{item.dayLetter}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Recovery Ring Component
const RecoveryRing = ({ name, percentage, color }: { name: string, percentage: number, color: string }) => {
  const TC = useTC();
  const size = 64;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let Icon = Activity;
  const iconSize = 20;

  if (name === 'Legs') Icon = Footprints;
  else if (name === 'Chest') Icon = Shield;
  else if (name === 'Back') Icon = AlignJustify;
  else if (name === 'Arms') Icon = Dumbbell;
  else if (name === 'Shoulders') Icon = ChevronUp;
  else if (name === 'Abs') Icon = Scale;

  return (
    <View style={styles.recoveryItem}>
      <View style={[styles.ringContainer, {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: TC.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        borderColor: TC.border,
        shadowColor: color, shadowOpacity: 0.4, shadowRadius: 10
      }]}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={TC.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.ringIcon}>
          <BreathingIcon duration={4000}>
            <Icon size={iconSize} color={TC.text} />
          </BreathingIcon>
        </View>
      </View>
      <Text style={[styles.recoveryName, { color: TC.textDim }]}>{name}</Text>
    </View>
  );
};

const RecoverySection = ({ recoveryData }: { recoveryData: Record<string, number> }) => {
  const TC = useTC();
  const mGroups = Object.keys(recoveryData);

  const getColor = (p: number) => {
    if (p >= 90) return THEME.primary;
    if (p >= 50) return '#eab308';
    return '#ef4444';
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionLabel, { color: TC.textMuted }]}>RECOVERY STATUS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 24 }}>
        {mGroups.map((mg) => (
          <RecoveryRing key={mg} name={mg} percentage={recoveryData[mg]} color={getColor(recoveryData[mg])} />
        ))}
        {mGroups.length === 0 && <Text style={{ color: TC.textMuted, paddingHorizontal: 20 }}>No sufficient data for recovery yet.</Text>}
      </ScrollView>
    </View>
  );
};

const TotalVolumeChart = ({ volumeHistory, unit }: { volumeHistory: VolumeProgressItem[], unit: 'lbs' | 'kg' }) => {
  // 1. Aggregate daily data into monthly buckets
  const [monthlyData, setMonthlyData] = useState<{ month: string, year: number, volume: number, label: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    if (!volumeHistory || volumeHistory.length === 0) {
      // Fallback if no data
      setMonthlyData([]);
      return;
    }

    const monthsMap = new Map<string, number>();
    const now = new Date();

    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`; // Unique key
      monthsMap.set(key, 0);
    }

    // Fill with actual data
    volumeHistory.forEach(item => {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthsMap.has(key)) {
        monthsMap.set(key, (monthsMap.get(key) || 0) + item.volume);
      }
    });

    // Convert to array
    const result = Array.from(monthsMap.entries()).map(([key, vol]) => {
      const [year, monthIndex] = key.split('-').map(Number);
      const date = new Date(year, monthIndex, 1);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        year: year,
        volume: vol,
        label: date.toLocaleString('default', { month: 'short' }),
        fullDate: date
      };
    });

    setMonthlyData(result);
    setSelectedIndex(result.length - 1); // Select current month by default
  }, [volumeHistory]);

  const selectedData = monthlyData[selectedIndex] || { volume: 0, label: '', year: '' };
  const maxProps = Math.max(...monthlyData.map(d => d.volume), 100); // Avoid div by zero

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  };

  const TC = useTC();

  return (
    <LinearGradient
      colors={TC.isDark ? ['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)'] : ['rgba(132, 196, 65, 0.08)', 'rgba(132, 196, 65, 0.02)']}
      style={[styles.volumePanel, { borderColor: TC.isDark ? '#266637' : 'rgba(132, 196, 65, 0.2)' }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.labelSmall, { color: TC.textMuted }]}>TOTAL VOLUME LOAD</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[styles.heroNumber, { color: TC.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatVolume(unit === 'kg' ? selectedData.volume * 0.453592 : selectedData.volume)}</Text>
          <Text style={[styles.unitTextLarge, { color: TC.textDim }]}>{unit}</Text>
          <Text style={{ color: TC.textMuted, fontSize: 12, marginLeft: 'auto' }} numberOfLines={1}>
            {selectedData.label} {selectedData.year}
          </Text>
        </View>
      </View>

      <View style={styles.volumeChartRow}>
        {monthlyData.map((data, i) => {
          const heightPercent = maxProps > 0 ? (data.volume / maxProps) : 0;
          const isActive = i === selectedIndex;

          return (
            <TouchableOpacity
              key={i}
              style={styles.volumeBarWrapper}
              onPress={() => setSelectedIndex(i)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.volumeBar,
                { height: `${Math.max(heightPercent * 100, 4)}%`, backgroundColor: TC.overlayBg },
                isActive ? { backgroundColor: 'transparent' } : {}
              ]}>
                {isActive && (
                  <LinearGradient
                    colors={['rgba(132, 196, 64, 0.8)', 'rgba(132, 196, 64, 0.2)']}
                    style={[StyleSheet.absoluteFill, { borderRadius: 4 }]}
                  />
                )}
              </View>
              <Text style={[styles.monthLabel, { color: TC.textMuted }, isActive && { color: THEME.primary }]}>
                {data.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>
  );
};

const HighlightsSection = ({ muscleGroups }: { muscleGroups: MuscleGroupData[] }) => {
  const TC = useTC();
  const ALL_MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Abs', 'Glutes'];

  const sorted = [...muscleGroups].sort((a, b) => b.value - a.value);
  const mostTrained = sorted.length > 0 ? sorted[0] : null;

  const trainedNames = muscleGroups.map(m => m.name);
  const untrained = ALL_MUSCLES.filter(m => !trainedNames.includes(m));

  let needsWorkName = 'Full Body';
  let needsWorkSets = 0;

  if (untrained.length > 0) {
    needsWorkName = untrained[0];
    needsWorkSets = 0;
  } else if (sorted.length > 0) {
    const least = sorted[sorted.length - 1];
    needsWorkName = least.name;
    needsWorkSets = least.value;
  }

  const GlowText = ({ text, color, style }: any) => (
    <View style={{ position: 'relative' }}>
      <Text style={[style, { color, opacity: 0.3, position: 'absolute', transform: [{ translateX: 0 }, { translateY: 0 }], textShadowColor: color, textShadowRadius: 15 }]}>{text}</Text>
      <Text style={[style, { color }]}>{text}</Text>
    </View>
  );

  const cardBg = TC.isDark ? '#0f110d' : '#F0F4EA';
  const needsWorkBg = TC.isDark ? '#110d0d' : '#FDF2F2';
  const cardBorder = TC.isDark ? '#266637' : 'rgba(132, 196, 65, 0.2)';
  const needsWorkBorder = TC.isDark ? '#266637' : 'rgba(239, 68, 68, 0.15)';

  return (
    <View style={styles.highlightsRow}>
      <View style={[styles.highlightCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.highlightIconBg}>
          <BreathingIcon duration={5000}>
            <Dumbbell size={60} color={TC.isDark ? '#1f2e10' : 'rgba(132,196,65,0.15)'} style={{ transform: [{ rotate: '-15deg' }] }} />
          </BreathingIcon>
        </View>

        <View>
          <Text style={[styles.highlightLabel, { color: TC.textDim }]}>MOST TRAINED</Text>
          <View style={{ marginTop: 4 }}>
            <GlowText text={mostTrained ? mostTrained.name : 'None'} color={THEME.primary} style={styles.highlightTitle} />
          </View>
        </View>

        <View style={styles.highlightFooter}>
          <View style={[styles.dot, { backgroundColor: THEME.primary, shadowColor: THEME.primary, shadowOpacity: 0.8, shadowRadius: 6 }]} />
          <Text style={[styles.highlightStat, { color: TC.text }]}>
            {mostTrained ? mostTrained.value : 0} sets this week
          </Text>
        </View>
      </View>

      <View style={[styles.highlightCard, { backgroundColor: needsWorkBg, borderColor: needsWorkBorder }]}>
        <View style={styles.highlightIconBg}>
          <BreathingIcon duration={6000}>
            <CircleMinus size={60} color={TC.isDark ? '#2e1010' : 'rgba(239,68,68,0.12)'} style={{ transform: [{ rotate: '15deg' }] }} />
          </BreathingIcon>
        </View>

        <View>
          <Text style={[styles.highlightLabel, { color: TC.textDim }]}>NEEDS WORK</Text>
          <View style={{ marginTop: 4 }}>
            <Text style={[styles.highlightTitle, { color: TC.text }]}>{needsWorkName}</Text>
          </View>
        </View>

        <View style={styles.highlightFooter}>
          <View style={[styles.dot, { backgroundColor: '#ef4444', shadowColor: '#ef4444', shadowOpacity: 0.8, shadowRadius: 6 }]} />
          <Text style={[styles.highlightStat, { color: TC.text }]}>
            {needsWorkSets} sets this week
          </Text>
        </View>
      </View>
    </View>
  );
};

const StatGrid = ({ duration, workouts }: { duration: number, workouts: number }) => {
  const TC = useTC();
  return (
    <View style={styles.gridContainer}>
      <LinearGradient
        colors={TC.isDark ? ['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)'] : ['rgba(132, 196, 65, 0.08)', 'rgba(132, 196, 65, 0.02)']}
        style={[styles.statCard, { borderColor: TC.isDark ? '#266637' : 'rgba(132, 196, 65, 0.2)' }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.iconBox, { backgroundColor: TC.overlayBg, borderColor: TC.border }]}>
          <BreathingIcon>
            <Timer size={20} color={TC.text} />
          </BreathingIcon>
        </View>
        <View>
          <Text style={[styles.statLabel, { color: TC.textMuted }]}>AVG DURATION</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={[styles.statValue, { color: TC.text }]}>{duration}</Text>
            <Text style={[styles.statUnit, { color: TC.textDim }]}>min</Text>
          </View>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={TC.isDark ? ['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)'] : ['rgba(132, 196, 65, 0.08)', 'rgba(132, 196, 65, 0.02)']}
        style={[styles.statCard, { borderColor: TC.isDark ? '#266637' : 'rgba(132, 196, 65, 0.2)' }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.iconBox, { backgroundColor: TC.overlayBg, borderColor: TC.border }]}>
          <BreathingIcon duration={3500}>
            <Flame size={20} color={THEME.primary} fill={THEME.primary} />
          </BreathingIcon>
        </View>
        <View>
          <Text style={[styles.statLabel, { color: TC.textMuted }]}>WORKOUTS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={[styles.statValue, { color: TC.text }]}>{workouts}</Text>
            <Text style={[styles.statUnit, { color: TC.textDim }]}>this mo.</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};


const AnimatedCounter = ({ value }: { value: number }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1500,
      useNativeDriver: false, // Text update needs JS thread
    }).start();

    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(Math.floor(v));
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value]);

  const TC = useTC();
  return (
    <AppText variant="h2" style={{ color: TC.text, fontSize: 32, letterSpacing: -1, fontWeight: '800' }}>
      {displayValue.toLocaleString()}
    </AppText>
  );
};

const MilestoneCard = ({
  totalVolume,
  unit,
  setUnit
}: {
  totalVolume: number,
  unit: string,
  setUnit: (u: 'lbs' | 'kg') => void
}) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  // Simple limit for demo
  const nextMilestone = 100000;
  const progress = Math.min((totalVolume / nextMilestone) * 100, 100);

  // Conversion helper for display
  const displayVolume = unit === 'kg' ? Math.round(totalVolume * 0.453592) : totalVolume;
  const displayMilestone = unit === 'kg' ? Math.round(nextMilestone * 0.453592) : nextMilestone;

  const TC = useTC();

  return (
    <LinearGradient
      colors={TC.isDark ? ['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)'] : ['rgba(132, 196, 65, 0.08)', 'rgba(132, 196, 65, 0.02)']}
      style={[styles.milestoneCard, { borderColor: TC.isDark ? '#266637' : 'rgba(132, 196, 65, 0.2)' }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.milestoneHeader}>
        <View>
          <AppText variant="small" style={{ color: '#84C441', fontWeight: '700', letterSpacing: 1 }}>LIFETIME VOLUME</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <AnimatedCounter value={displayVolume} />
            <AppText variant="body" style={{ color: TC.textDim }}>{unit}</AppText>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <AppText variant="small" style={{ color: TC.textDim }}>Next Milestone</AppText>
          <AppText variant="small" style={{ color: TC.text, fontWeight: '600' }}>{displayMilestone.toLocaleString()} {unit}</AppText>
        </View>
        <View style={[styles.progressBarTrack, { backgroundColor: TC.overlayBg }]}>
          <LinearGradient
            colors={['#84C441', '#4ade80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${progress}%` }]}
          >
            <Animated.View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: '#fff',
                opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
              }}
            />
          </LinearGradient>
        </View>
      </View>
    </LinearGradient>
  );
};

const ProgressPhotosQuickCard = ({ userId, navigation }: { userId?: string; navigation: any }) => {
  const { isDark, text, textMuted, border, glassPanel } = useTC();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!userId) return undefined;

      listProgressPhotos(userId)
        .then((rows) => {
          if (active) setPhotos(rows);
        })
        .catch((err) => {
          console.error('Failed to load progress photos preview:', err);
          if (active) setPhotos([]);
        });

      return () => {
        active = false;
      };
    }, [userId])
  );

  const latest = photos[0];
  const countLabel = photos.length === 1 ? '1 saved photo' : `${photos.length} saved photos`;

  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('ProgressPhotos');
        }}
      >
        <LinearGradient
          colors={isDark ? ['rgba(132,196,64,0.12)', 'rgba(255,255,255,0.025)'] : ['rgba(132,196,64,0.1)', 'rgba(255,255,255,0.76)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 20,
            padding: 14,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(132,196,64,0.2)' : border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                overflow: 'hidden',
                backgroundColor: glassPanel,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {latest?.signed_url ? (
                <Image source={{ uri: latest.signed_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <ImagePlus size={24} color={THEME.primary} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Barlow_700Bold', fontSize: 16, color: text }}>Progress Photos</Text>
              <Text style={{ fontFamily: 'Barlow_400Regular', fontSize: 12, color: textMuted, marginTop: 4 }}>
                {photos.length > 0 ? countLabel : 'Private photo timeline'}
              </Text>
            </View>

            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={16} color={textMuted} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const HealthProgressCard = ({ userId }: { userId?: string }) => {
  const { isDark, text, textMuted, border, glassPanel } = useTC();
  const { history, today, status, loadHistory, sync } = useHealthStore();

  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined;
      void loadHistory();
      if (status === 'connected') {
        void sync(false);
      }
      return undefined;
    }, [loadHistory, status, sync, userId])
  );

  const ordered = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const maxSteps = Math.max(1, ...ordered.map((row) => row.steps));
  const weeklySteps = history.reduce((sum, row) => sum + row.steps, 0);
  const weeklyCalories = history.reduce((sum, row) => sum + row.active_calories, 0);

  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
      <LinearGradient
        colors={isDark ? ['rgba(132,196,64,0.1)', 'rgba(255,255,255,0.025)'] : ['rgba(132,196,64,0.08)', 'rgba(255,255,255,0.74)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(132,196,64,0.2)' : border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: glassPanel,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={20} color={THEME.primary} />
            </View>
            <View>
              <Text style={{ fontFamily: 'Barlow_700Bold', fontSize: 16, color: text }}>Health activity</Text>
              <Text style={{ fontFamily: 'Barlow_400Regular', fontSize: 12, color: textMuted, marginTop: 3 }}>
                {status === 'connected' ? '7-day Health Connect trend' : 'Connect from Profile settings'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Barlow_800ExtraBold', color: text, fontSize: 22 }}>
              {(today?.steps ?? 0).toLocaleString()}
            </Text>
            <Text style={{ fontFamily: 'Barlow_600SemiBold', color: textMuted, fontSize: 11, textTransform: 'uppercase' }}>steps today</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Barlow_800ExtraBold', color: text, fontSize: 22 }}>
              {(today?.active_calories ?? 0).toLocaleString()}
            </Text>
            <Text style={{ fontFamily: 'Barlow_600SemiBold', color: textMuted, fontSize: 11, textTransform: 'uppercase' }}>active kcal</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Barlow_800ExtraBold', color: text, fontSize: 22 }}>
              {formatSleepMinutes(today?.sleep_minutes)}
            </Text>
            <Text style={{ fontFamily: 'Barlow_600SemiBold', color: textMuted, fontSize: 11, textTransform: 'uppercase' }}>sleep</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Barlow_800ExtraBold', color: text, fontSize: 22 }}>
              {formatOptionalMetric(today?.resting_heart_rate)}
            </Text>
            <Text style={{ fontFamily: 'Barlow_600SemiBold', color: textMuted, fontSize: 11, textTransform: 'uppercase' }}>rest HR</Text>
          </View>
        </View>

        <View style={{ height: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 7 }}>
          {ordered.length > 0 ? ordered.map((row) => (
            <View key={row.date} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: '100%',
                  height: Math.max(6, Math.round((row.steps / maxSteps) * 42)),
                  borderRadius: 999,
                  backgroundColor: row.date === new Date().toISOString().slice(0, 10) ? THEME.primary : 'rgba(132,196,64,0.34)',
                }}
              />
            </View>
          )) : (
            <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
          )}
        </View>

        <Text style={{ fontFamily: 'Barlow_400Regular', fontSize: 12, color: textMuted, marginTop: 12 }}>
          7 days: {weeklySteps.toLocaleString()} steps · {weeklyCalories.toLocaleString()} active kcal
        </Text>
        <Text style={{ fontFamily: 'Barlow_400Regular', fontSize: 12, color: textMuted, marginTop: 4 }}>
          HRV today: {formatOptionalMetric(today?.hrv_rmssd_ms)} ms
        </Text>
      </LinearGradient>
    </View>
  );
};

// --- Main Screen Component ---

export default function WorkoutStatisticsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const TC = getThemeColors(isDark);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { onScroll: handleTabScroll } = useTabScroll();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    stats: WorkoutStatsData;
    prs: PersonalRecord[];
    volumeHistory: VolumeProgressItem[];
    muscleGroups: MuscleGroupData[];
    bodyMeasurements: BodyMeasurementHistoryEntry[];
  } | null>(null);

  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');

  const [currentWorkoutStatus, setCurrentWorkoutStatus] = useState({
    name: 'No Active Workout',
    blockName: 'Start a Program',
    focus: 'General',
    currentWeek: 0,
    totalWeeks: 4,
    loading: true
  });

  // Staggered Entrance Animations
  const cardAnims = useRef(
    Array(5).fill(0).map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(50)
    }))
  ).current;

  useEffect(() => {
    Animated.stagger(100, cardAnims.map(anim =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    )).start();
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [statsData, prs, sessions, bodyMeasurementsResult] = await Promise.all([
        fetchWorkoutStatistics(user.id, 'year'),
        fetchLifetimePRs(user.id),
        getSessions(user.id),
        supabase
          .from('body_measurements')
          .select('id,measurement_date,created_at,chest_cm,waist_cm,hip_cm,shoulder_cm,chest,waist,hips,shoulder_width,measurement_confidence,source')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

      if (bodyMeasurementsResult.error) {
        console.error('Failed to load body measurements for progress screen:', bodyMeasurementsResult.error);
      }

      setData({
        stats: statsData.stats,
        volumeHistory: statsData.volumeProgress,
        prs: prs,
        muscleGroups: statsData.muscleGroups || [],
        bodyMeasurements: bodyMeasurementsResult.error ? [] : (bodyMeasurementsResult.data || []) as BodyMeasurementHistoryEntry[],
      });

      // --- Current Workout Logic ---
      // --- Current Workout Logic ---
      // Get the last session linked to a workout
      const lastSession = sessions.filter(s => s.workout).sort((a, b) => {
        const dateA = new Date(a.date || a.started_at || 0).getTime();
        const dateB = new Date(b.date || b.started_at || 0).getTime();
        return dateB - dateA; // Most recent first
      })[0];

      if (lastSession && lastSession.workout) {
        const workoutId = lastSession.workout.id;
        const workoutName = lastSession.workout.name;
        const difficulty = lastSession.workout.difficulty || 'Intermediate';

        // Fetch exercises for this workout to determine structure
        let currentDay = 1;
        let totalDays = 1;

        try {
          const exercises = await workoutService.getWorkoutExercises(workoutId);

          // Calculate total days (e.g. 3 for PPL)
          totalDays = Math.max(...exercises.map(e => e.day || 1), 1);

          // Determine "Current Day"
          // We look at the exercises performed in the last session to guess which day it was
          const performedExerciseIds = lastSession.exercises_completed?.map((e: any) => e.exercise_id || e.id || '') || [];

          if (performedExerciseIds.length > 0) {
            // Find which day has the most matching exercises
            const dayScores: { [key: number]: number } = {};

            exercises.forEach(ex => {
              const d = ex.day || 1;
              if (performedExerciseIds.includes(ex.id)) {
                dayScores[d] = (dayScores[d] || 0) + 1;
              }
            });

            let bestMatchDay = 1;
            let maxScore = 0;
            Object.entries(dayScores).forEach(([d, score]) => {
              if (score > maxScore) {
                maxScore = score;
                bestMatchDay = parseInt(d);
              }
            });

            if (maxScore > 0) {
              currentDay = bestMatchDay;
            }
          }
        } catch (err) {
          console.error('Error fetching workout details for card:', err);
        }

        setCurrentWorkoutStatus({
          name: workoutName,
          blockName: workoutName,
          focus: difficulty,
          currentWeek: currentDay,
          totalWeeks: totalDays,
          loading: false
        });
      }

    } catch (e) {
      console.error(e);
      setError('Failed to load workout statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  if (loading && !data) {
    return (
      <View style={[styles.container, { backgroundColor: TC.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
          <Text style={[styles.screenTitle, { color: TC.text }]}>Progress</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 24 }}>
          <ChartSkeleton height={200} />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <PRCardSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: TC.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
          <Text style={[styles.screenTitle, { color: TC.text }]}>Progress</Text>
        </View>
        <ErrorState
          title="Failed to Load Statistics"
          message={error}
          onRetry={loadData}
          retryText="Try Again"
        />
      </View>
    );
  }

  if (!data) return null; // Should not happen if loading is false and error is null, but safe guard

  const { stats, prs, volumeHistory, muscleGroups, bodyMeasurements } = data;

  return (
    <View style={[styles.container, { backgroundColor: TC.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScreenHeader
        title="MY PROGRESS"
        style={{ zIndex: 100 }}
        rightElement={
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setUnit(unit === 'lbs' ? 'kg' : 'lbs'); }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              gap: 6
            }}
          >
            <Scale size={14} color="#84C441" />
            <AppText style={{ color: TC.text, fontSize: 12, fontWeight: '700' }}>{unit.toUpperCase()}</AppText>
          </TouchableOpacity>
        }
      />
      {/* Background Ambience */}
      <View style={styles.ambientLightBottom} />

      <Animated.ScrollView
        contentContainerStyle={{
          paddingBottom: 100,
          paddingTop: insets.top + 70 + 24 // Header height (70) + Inset + Extra spacing
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={THEME.primary} />}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: handleTabScroll
          }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Milestone Card */}
          <Animated.View style={{ opacity: cardAnims[0].opacity, transform: [{ translateY: cardAnims[0].translateY }] }}>
            <MilestoneCard
              totalVolume={data?.stats?.totalVolume || 0}
              unit={unit}
              setUnit={setUnit}
            />
          </Animated.View>
        </View>
        {/* 1. Horizontal PRs */}
        <View style={{ marginBottom: 24 }}>
          <PersonalRecordsParams records={prs} unit={unit} />
        </View>

        {/* 2. Consistency Calendar */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <ConsistencyCalendar volumeData={volumeHistory} streak={stats.consistency?.currentStreak || 0} />
        </View>

        {/* 2.4. Body measurements */}
        <BodyMeasurementsSection measurements={bodyMeasurements} />

        {/* 2.45. Progress photos quick link */}
        <ProgressPhotosQuickCard userId={user?.id} navigation={navigation} />

        {/* 2.48. Health Connect trend */}
        <HealthProgressCard userId={user?.id} />

        {/* 2.5. Nutrition quick link */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Nutrition');
            }}
          >
            <LinearGradient
              colors={isDark ? ['rgba(61,140,82,0.14)', 'rgba(132,196,65,0.04)'] : ['rgba(61,140,82,0.1)', 'rgba(132,196,65,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(61,140,82,0.22)' : 'rgba(61,140,82,0.18)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 15,
                      backgroundColor: isDark ? 'rgba(61,140,82,0.18)' : 'rgba(61,140,82,0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Apple size={22} color={THEME.primary} />
                  </View>
                  <View>
                    <Text style={{ fontFamily: 'Barlow_700Bold', fontSize: 16, color: TC.text }}>Nutrition</Text>
                    <Text style={{ fontFamily: 'Barlow_400Regular', fontSize: 12, color: TC.textMuted, marginTop: 3 }}>
                      Log meals & daily macros
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={16} color={TC.textMuted} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 2.6. Current Workout Card */}
        <View style={{ paddingHorizontal: 24 }}>
          <CurrentWorkoutCard
            workoutName={currentWorkoutStatus.name}
            blockName={currentWorkoutStatus.blockName}
            focus={currentWorkoutStatus.focus}
            currentDay={currentWorkoutStatus.currentWeek}
            totalDays={currentWorkoutStatus.totalWeeks}
          />
        </View>

        {/* 3. Highlights (Most Trained / Needs Work) */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          {/* Ensure muscleGroups exists before rendering, pass empty array if not to avoid modifying child too much */}
          <HighlightsSection muscleGroups={data?.muscleGroups || []} />
        </View>

        {/* 4. Recovery Status */}
        <View style={{ marginBottom: 24 }}>
          <RecoverySection recoveryData={stats.recovery || {}} />
        </View>

        {/* 5. Total Volume Load */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <TotalVolumeChart volumeHistory={volumeHistory || []} unit={unit} />
        </View>

        {/* 6. Grid Stats */}
        <View style={{ paddingHorizontal: 24 }}>
          {/* Duration: stats.duration is total minutes. We want (Total Minutes / Total Workouts) */}
          <StatGrid
            duration={stats.consistency?.thisMonthCount > 0
              ? Math.round(stats.duration / stats.consistency.thisMonthCount)
              : 0}
            workouts={stats.consistency?.thisMonthCount || 0}
          />
        </View>

      </Animated.ScrollView>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ambientLightTop: {
    position: 'absolute',
    top: '-15%',
    left: '-15%',
    width: '50%',
    aspectRatio: 1,
    borderRadius: 1000,
    backgroundColor: 'rgba(132, 196, 64, 0.15)',
    zIndex: 0,
    transform: [{ scale: 1.5 }],
    opacity: 0.5
  },
  ambientLightBottom: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: '40%',
    aspectRatio: 1,
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 0,
    opacity: 0.3
  },
  headerContainer: {
    paddingHorizontal: 24,
    // Reduced bottom padding and margin to remove empty space
    paddingBottom: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    // Removed border/background to be cleaner
  },
  screenTitle: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -1,
    display: 'none' // Hidden as requested
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6
  },
  unitToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  // PR Cards
  horizontalScroll: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 10
  },
  prCardContainer: {
    aspectRatio: 4 / 5,
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a1f14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  prCardImageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  prCardBg: {
    width: '100%',
    height: '100%'
  },
  prContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between'
  },
  prHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    // backdropFilter removed (web only)
  },
  badgePrimary: {
    backgroundColor: 'rgba(132, 196, 64, 0.2)',
    borderColor: 'rgba(132, 196, 64, 0.3)',
  },
  badgeDefault: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dateBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  dateText: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: '600'
  },
  prBody: {
    marginBottom: 20
  },
  exerciseName: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    flexShrink: 1
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4
  },
  bigWeight: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 62,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    flexShrink: 1
  },
  unitText: {
    color: THEME.primary,
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(132, 196, 64, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    gap: 6,
    marginTop: 16,
    opacity: 0.9,
    maxWidth: 160,
    alignSelf: 'flex-start'
  },
  bar: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2
  },
  shareButton: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  shareText: {
    fontWeight: 'bold',
    fontSize: 14
  },
  bodyMeasurementsCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bodyMeasurementsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  bodyMeasurementsHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bodyMeasurementsHeaderCopy: {
    flex: 1,
  },
  bodyMeasurementsHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bodyMeasurementsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bodyMeasurementsCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  bodyMeasurementsCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bodyMeasurementsExpandButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bodyMeasurementsEmptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bodyMeasurementsSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  bodyMeasurementsSummaryChip: {
    width: '48%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  bodyMeasurementsSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  bodyMeasurementsSummaryValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  bodyMeasurementsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyMeasurementsMetaText: {
    fontSize: 12,
  },
  bodyMeasurementsMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  bodyMeasurementsHistoryWrap: {
    marginTop: 4,
  },
  bodyMeasurementsHistoryToggle: {
    marginTop: 10,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  bodyMeasurementsHistoryToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bodyMeasurementsHistoryList: {
    marginTop: 4,
  },
  bodyMeasurementsHistoryItem: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  bodyMeasurementsHistoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  bodyMeasurementsHistoryDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  bodyMeasurementsHistorySource: {
    fontSize: 12,
  },
  bodyMeasurementsHistoryValues: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Consistency
  consistencyPanel: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative'
  },
  glassPanel: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  decorationBlur: {
    position: 'absolute',
    right: 0, top: 0,
    width: '30%',
    aspectRatio: 1,
    backgroundColor: 'rgba(132, 196, 64, 0.05)',
    borderRadius: 1000
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  labelSmall: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  streakText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  calendarScroll: {
    gap: 12,
    paddingHorizontal: 4 // tiny padding
  },
  dayItem: {
    alignItems: 'center',
    gap: 8,
    minWidth: 42
  },
  dayItemToday: {
    opacity: 1,
    transform: [{ scale: 1.1 }]
  },
  dayBubble: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayBubbleInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.05)'
  },
  dayBubbleActive: {
    backgroundColor: 'rgba(132, 196, 64, 0.1)',
    borderColor: 'rgba(132, 196, 64, 0.2)',
    shadowColor: THEME.primary,
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  dayBubbleToday: {
    backgroundColor: THEME.primary,
    borderColor: '#fff',
    shadowColor: THEME.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20
  },
  dayNum: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600'
  },
  todayNum: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800'
  },
  dayName: {
    textTransform: 'uppercase',
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)'
  },

  // Recovery
  sectionContainer: {
    gap: 12
  },
  sectionLabel: {
    paddingHorizontal: 24,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2
  },
  recoveryItem: {
    alignItems: 'center',
    gap: 8
  },
  ringContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8
  },
  ringIcon: {
    position: 'absolute'
  },
  recoveryName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600'
  },

  // Volume
  volumePanel: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#266637',
  },
  heroNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    flexShrink: 1
  },
  unitTextLarge: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: 6
  },
  volumeChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 20
  },
  volumeBarWrapper: {
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  volumeBar: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    minHeight: 4,
  },
  monthLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase'
  },

  // Highlight Cards
  highlightsRow: {
    flexDirection: 'row',
    gap: 12
  },
  highlightCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    height: 150,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#266637',
  },
  highlightIconBg: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.6
  },
  highlightLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  highlightTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    flexShrink: 1
  },
  highlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4
  },
  highlightStat: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600'
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    gap: 16
  },
  statCard: {
    flex: 1,
    height: 144,
    // backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#266637',
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500'
  },
  blurBlob: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    zIndex: -1
  },

  // Current Workout Card
  currentWorkoutCard: {

    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#266637',
  },
  currentWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOpacity: 0.8,
    shadowRadius: 4
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase'
  },
  currentWorkoutTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    flexShrink: 1
  },
  currentWorkoutSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500'
  },
  goalRingContainer: {
    alignItems: 'center',
    position: 'relative',
    minWidth: 60,
    height: 80
  },
  goalTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center'
  },
  goalPercentage: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff'
  },
  goalPercentageLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: -1,
    lineHeight: 32
  },
  goalLabelSmall: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2
  },
  goalLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  // Consistency New
  consistencyCard: {
    backgroundColor: '#0f110d', // Dark card
    borderRadius: 24,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: '#266637',
  },
  consistencyHeaderNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '600'
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8
  },
  dayCol: {
    alignItems: 'center',
    gap: 12
  },
  dayCircle: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  dayLetter: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  // Missing Styles for MilestoneCard
  milestoneCard: {
    padding: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#266637',
    marginBottom: 24,
    overflow: 'hidden'
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  content: {
    paddingHorizontal: 24
  }
});
