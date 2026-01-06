import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenContainer, AppText } from "@/components/shared";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from "@/theme/useThemeColors";
import { theme } from "@/theme";
import type { WorkoutSession } from "@/types/session";
import { isWorkoutStartable } from "@/utils/isWorkoutStartable";
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from "@/utils/responsive";
import { BlurView } from "expo-blur";


const { height } = Dimensions.get("window");
const HEADER_HEIGHT = Math.min(height * 0.45, 420);
const WorkoutDetailsScreen: React.FC = () => {
  const colors = useThemeColors();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // 1️⃣ Récupérer la session
  const session: WorkoutSession | undefined = route.params?.session;

  // 2️⃣ Garde-fou
  if (!session || !session.workout) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: '#000' }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <AppText style={{ color: colors.textSecondary }}>
            Workout introuvable
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  // 3️⃣ Maintenant c’est SAFE
  const sessionDate = session.date || session.started_at;
  const canStart = isWorkoutStartable(sessionDate);

  const { workout, notes } = session;

  return (
    <View style={[styles.safe, { backgroundColor: '#000' }]}>
      <StatusBar style="light" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* ================= HERO HEADER ================= */}
        <View style={styles.heroContainer}>
          {workout.image_url ? (
            <Image
              source={{ uri: workout.image_url }}
              style={styles.heroImage}
              contentFit="cover"
              transition={500}
            />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: '#111' }]} />
          )}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)", "#000"]}
            style={styles.heroGradient}
          />

          {/* Top Navigation Row */}
          <SafeAreaView edges={['top']} style={styles.navHeader}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <AppText variant="small" style={styles.headerLabel}>MY PLAN</AppText>
            <View style={{ width: 44 }} />
          </SafeAreaView>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.heroBadges}>
              <View style={styles.primaryBadge}>
                <AppText variant="small" style={styles.primaryBadgeText}>
                  {workout.workout_type === 'custom' ? 'CUSTOM' : 'NATIVE'}
                </AppText>
              </View>
              <BlurView intensity={10} tint="light" style={styles.glassBadge}>
                <AppText variant="small" style={styles.glassBadgeText}>
                  {workout.workout_type?.toUpperCase() || 'STRENGTH'}
                </AppText>
              </BlurView>
            </View>

            <Text style={styles.heroTitle} numberOfLines={2}>
              {workout.name?.toUpperCase() || 'OUII'}
            </Text>
            <AppText variant="caption" style={styles.heroSubtitle}>
              Full Body Composition
            </AppText>
          </View>
        </View>

        {/* ================= TOGGLE PILL ================= */}
        <View style={styles.toggleContainer}>
          <BlurView intensity={10} tint="dark" style={styles.togglePill}>
            <Pressable style={styles.toggleHalf}>
              <AppText variant="small" style={styles.toggleTextInactive}>NATIVE</AppText>
            </Pressable>
            <View style={styles.toggleActive}>
              <AppText variant="small" style={styles.toggleTextActive}>CUSTOM</AppText>
            </View>
          </BlurView>
        </View>

        {/* ================= STATS GRID ================= */}
        <View style={styles.gridContainer}>
          <StatBox
            icon="schedule"
            value={workout.duration || "?"}
            label="MINUTES"
          />
          <StatBox
            icon="fitness-center"
            value={workout.workout_type || "Custom"}
            label="TYPE"
          />
          <StatBox
            icon="bar-chart"
            value={workout.difficulty || "Custom"}
            label="NIVEAU"
          />
        </View>

        {/* ================= META CARDS ================= */}
        <View style={styles.metaContainer}>
          <MetaBox
            icon="calendar-today"
            label="CRÉÉ LE"
            value={workout.created_at?.split("T")[0] || "2025-12-23"}
          />
          <MetaBox
            icon="update"
            label="MIS À JOUR"
            value={workout.updated_at?.split("T")[0] || "2025-12-23"}
          />
        </View>

        {/* ================= NOTES ================= */}
        {(workout.notes || notes) && (
          <View style={styles.notesSection}>
            <AppText variant="small" style={styles.sectionLabel}>NOTES</AppText>
            <View style={styles.notesCard}>
              <AppText variant="body" style={styles.notesText}>
                {workout.notes ?? notes}
              </AppText>
            </View>
          </View>
        )}

        {/* ================= BOTTOM ACTION ================= */}
        {canStart && (
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.startBtn,
                { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => {/* Start Workout */ }}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#7db63a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.startBtnText}>START WORKOUT</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

export default WorkoutDetailsScreen;

//
// ================= UI COMPONENTS =================
//

const StatBox = ({ icon, value, label }: { icon: any; value: any; label: string }) => (
  <View style={styles.statBox}>
    <View style={styles.statIconCircle}>
      <MaterialIcons name={icon} size={20} color={theme.colors.primary} />
    </View>
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabelText}>{label}</Text>
    </View>
  </View>
);

const MetaBox = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
  <View style={styles.metaBox}>
    <View style={styles.metaHeader}>
      <MaterialIcons name={icon} size={14} color="rgba(132, 196, 65, 0.7)" />
      <Text style={styles.metaLabelText}>{label}</Text>
    </View>
    <Text style={styles.metaValueText}>{value}</Text>
  </View>
);

//
// ================= STYLES =================
//

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* ---------- HERO SECTION ---------- */
  heroContainer: {
    height: scaleHeight(460),
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSpacing(20),
    marginTop: Platform.OS === 'android' ? 40 : 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerLabel: {
    color: '#fff',
    letterSpacing: 2,
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  heroContent: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  primaryBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    ...theme.shadows.small,
  },
  primaryBadgeText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  glassBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  glassBadgeText: {
    color: '#E1E1E1',
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(52),
    color: '#FFFFFF',
    fontStyle: 'italic',
    letterSpacing: -2,
    lineHeight: getResponsiveFontSize(56),
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    color: '#B0B0B0',
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  /* ---------- TOGGLE SECTION ---------- */
  toggleContainer: {
    paddingHorizontal: 24,
    marginTop: -26,
    zIndex: 10,
  },
  togglePill: {
    flexDirection: 'row',
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(23, 23, 23, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  toggleHalf: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    ...theme.shadows.small,
  },
  toggleTextInactive: {
    color: '#666',
    fontWeight: '700',
    letterSpacing: 1,
  },
  toggleTextActive: {
    color: '#000',
    fontWeight: '800',
    letterSpacing: 1,
  },

  /* ---------- STATS GRID ---------- */
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 32,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#171717',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Barlow_700Bold',
    letterSpacing: -0.5,
  },
  statLabelText: {
    color: '#555',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
  },

  /* ---------- META DATA ---------- */
  metaContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 12,
  },
  metaBox: {
    flex: 1,
    backgroundColor: '#171717',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaLabelText: {
    color: '#555',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  metaValueText: {
    color: '#D1D1D1',
    fontFamily: 'Barlow_500Medium',
    fontSize: 13,
  },

  /* ---------- NOTES SECTION ---------- */
  notesSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionLabel: {
    color: '#444',
    letterSpacing: 1.5,
    fontWeight: '800',
    marginBottom: 12,
  },
  notesCard: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  notesText: {
    color: '#999',
    lineHeight: 22,
  },

  /* ---------- FOOTER ---------- */
  footer: {
    paddingHorizontal: 24,
    marginTop: 40,
  },
  startBtn: {
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  startBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    zIndex: 1,
  },
});
