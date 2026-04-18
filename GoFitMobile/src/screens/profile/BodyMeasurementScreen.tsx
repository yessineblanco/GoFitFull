import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/config/supabase';
import { useProfileStore } from '@/store/profileStore';
import { analyzeMeasurements, type MeasurementDebugImage, type MeasurementResult } from '@/services/bodyMeasurementService';
import { BodyGuideOverlay } from '@/components/shared/BodyGuideOverlay';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getGlassBg, getGlassBorder, getTextColor } from '@/utils/colorUtils';

const BRAND = '#84c441';
const MIN_SAVE_CONFIDENCE = 0.25;

type Phase = 'intro' | 'front' | 'side' | 'analyze' | 'result';

type BodyMeasurementHistoryEntry = {
  id: string;
  measurement_date?: string | null;
  created_at?: string | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  shoulder_cm: number | null;
  measurement_confidence: number | null;
  source?: string | null;
};

export default function BodyMeasurementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useThemeStore();
  const { profile, loadProfile } = useProfileStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<InstanceType<typeof CameraView>>(null);

  const [phase, setPhase] = useState<Phase>('intro');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [sideUri, setSideUri] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  /** Bumps when (re)opening the camera so Android gets a fresh native view after capture. */
  const [cameraSession, setCameraSession] = useState(0);
  const [showCameraRetry, setShowCameraRetry] = useState(false);
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showPoseDebug, setShowPoseDebug] = useState(false);
  const [history, setHistory] = useState<BodyMeasurementHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const captureInFlight = useRef(false);

  const heightCm = profile?.height && profile.height > 0 ? profile.height : null;

  /** Android: after takePicture the preview session can need an explicit resume before the next capture. */
  const primeAndroidPreview = useCallback(async (cam: InstanceType<typeof CameraView> | null) => {
    if (Platform.OS !== 'android' || !cam) return;
    try {
      await cam.resumePreview();
    } catch {
      /* ignore */
    }
    await new Promise<void>((r) => setTimeout(r, 150));
  }, []);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadMeasurementHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from('body_measurements')
        .select('id,measurement_date,created_at,chest_cm,waist_cm,hip_cm,shoulder_cm,measurement_confidence,source')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory((data || []) as BodyMeasurementHistoryEntry[]);
    } catch (e: any) {
      setHistoryError(e?.message || 'Could not load saved body measurements.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeasurementHistory();
  }, [loadMeasurementHistory]);

  useEffect(() => {
    if (phase !== 'front' && phase !== 'side') {
      setShowCameraRetry(false);
      return;
    }
    setShowCameraRetry(false);
    const t = setTimeout(() => setShowCameraRetry(true), 3200);
    return () => clearTimeout(t);
  }, [phase, cameraSession]);

  const bg = getBackgroundColor(isDark);
  const text = getTextColor(isDark);
  const sub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const glass = getGlassBg(isDark);
  const border = getGlassBorder(isDark);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || captureInFlight.current) return;
    captureInFlight.current = true;
    try {
      await primeAndroidPreview(cameraRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92, shutterSound: false });
      if (!photo?.uri) return;
      if (phase === 'front') {
        setFrontUri(photo.uri);
        setPhase('side');
        await primeAndroidPreview(cameraRef.current);
      } else if (phase === 'side') {
        if (heightCm == null || !frontUri) return;
        setSideUri(photo.uri);
        setPhase('analyze');
        setCameraReady(false);
        try {
          const res = await analyzeMeasurements({
            frontImageUri: frontUri,
            sideImageUri: photo.uri,
            heightCm,
          });
          setResult(res);
          setPhase('result');
          Haptics.notificationAsync(
            res.error ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
          );
        } catch (e) {
          Alert.alert('Analysis', e instanceof Error ? e.message : 'On-device analysis failed.');
          setPhase('side');
          setSideUri(null);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not capture photo.';
      Alert.alert('Camera', msg);
      if (Platform.OS === 'android') {
        setCameraReady(false);
        setCameraSession((s) => s + 1);
      }
    } finally {
      captureInFlight.current = false;
    }
  }, [phase, cameraReady, frontUri, heightCm, primeAndroidPreview]);

  const saveToSupabase = async () => {
    if (!result || heightCm == null) return;
    if (result.error) {
      Alert.alert('Retake needed', 'This scan was not reliable enough to save. Please retake the photos.');
      return;
    }
    if (result.confidence < MIN_SAVE_CONFIDENCE) {
      Alert.alert('Low confidence', 'These values are only a rough draft. Please retake the photos before saving.');
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in', 'You must be signed in to save measurements.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('body_measurements').insert({
        user_id: user.id,
        height_cm: heightCm,
        chest_cm: result.chest_cm,
        waist_cm: result.waist_cm,
        hip_cm: result.hip_cm,
        shoulder_cm: result.shoulder_cm,
        measurement_confidence: result.confidence,
        source: 'ai_ondevice',
      });
      if (error) throw error;
      await loadMeasurementHistory();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFrontUri(null);
      setSideUri(null);
      setResult(null);
      setShowPoseDebug(false);
      setPhase('intro');
    } catch (e: any) {
      const msg = e?.message || e?.details || 'Could not save. If this persists, apply the latest DB migration (on-device columns).';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const openCameraPhase = async (next: 'front' | 'side') => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert('Camera', 'Camera access is required for on-device measurements.');
        return;
      }
    }
    setCameraSession((s) => s + 1);
    setPhase(next);
    setCameraReady(false);
  };

  const resetFlow = () => {
    setFrontUri(null);
    setSideUri(null);
    setResult(null);
    setShowPoseDebug(false);
    setPhase('intro');
    setCameraReady(false);
    setCameraSession((s) => s + 1);
  };

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (phase === 'front' || phase === 'side') {
              setPhase('intro');
              setFrontUri(null);
              setSideUri(null);
            } else {
              navigation.goBack();
            }
          }}
          style={[styles.iconBtn, { backgroundColor: glass, borderColor: border }]}
        >
          <ChevronLeft size={26} color={text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: text }]}>Body measurements</Text>
        <View style={{ width: 42 }} />
      </View>

      {heightCm == null ? (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={[styles.p, { color: sub }]}>
            Add your height in your profile so we can scale measurements from your photos. Everything stays on this device — nothing is
            uploaded.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditWeightHeight', { initialTab: 'height' })}
            style={{ borderRadius: 14, overflow: 'hidden', marginTop: 16 }}
          >
            <LinearGradient colors={['#6da835', BRAND]} style={styles.cta}>
              <Text style={styles.ctaTxt}>Set height</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      ) : phase === 'intro' ? (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={[styles.p, { color: sub }]}>
            We estimate chest, waist, hip, and shoulder from two on-device photos (front + side). Your height from your profile sets the
            scale. Photos are not uploaded for AI — processing stays on this phone. Results are rough guides only, not medical measurements.
          </Text>
          <Text style={[styles.p, { color: sub, marginTop: 12 }]}>Using height: {Math.round(heightCm)} cm</Text>

          <TouchableOpacity
            style={[styles.guideToggle, { borderColor: border, backgroundColor: glass }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowHowTo((v) => !v);
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.guideToggleTitle, { color: text }]}>How to get usable numbers</Text>
            {showHowTo ? <ChevronUp size={22} color={text} /> : <ChevronDown size={22} color={text} />}
          </TouchableOpacity>
          {showHowTo ? (
            <View style={[styles.guideBody, { borderColor: border, backgroundColor: glass }]}>
              <Text style={[styles.guideBullet, { color: text }]}>
                <Text style={styles.guideEm}>Avoid mirror selfies.</Text> The model measures your outline in the photo. Mirrors add wrong
                depth, reflections, and glare — numbers often explode or collapse. Use the <Text style={styles.guideEm}>back camera</Text>, step
                back, and put only your real body in the frame (timer, tripod, or a friend helps).
              </Text>
              <Text style={[styles.guideBullet, { color: text, marginTop: 12 }]}>
                <Text style={styles.guideEm}>Full body:</Text> head to feet visible, upright, arms slightly away from the torso. Step back until
                you fill most of the frame vertically.
              </Text>
              <Text style={[styles.guideBullet, { color: text, marginTop: 12 }]}>
                <Text style={styles.guideEm}>Two poses:</Text> first photo facing the phone; second photo turned ~90° (true profile). Keep similar
                distance from the camera for both.
              </Text>
              <Text style={[styles.guideBullet, { color: text, marginTop: 12 }]}>
                <Text style={styles.guideEm}>Light & clothes:</Text> even indoor light; avoid heavy shadows. Fitted clothing works better than
                very loose outfits.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => void openCameraPhase('front')}
            style={{ borderRadius: 14, overflow: 'hidden', marginTop: 20 }}
          >
            <LinearGradient colors={['#6da835', BRAND]} style={styles.cta}>
              <Text style={styles.ctaTxt}>Start — front photo</Text>
            </LinearGradient>
          </TouchableOpacity>

          <MeasurementHistory
            history={history}
            loading={historyLoading}
            error={historyError}
            textColor={text}
            subColor={sub}
            borderColor={border}
            backgroundColor={glass}
            onRefresh={() => void loadMeasurementHistory()}
          />
        </ScrollView>
      ) : phase === 'front' || phase === 'side' ? (
        <View style={styles.cameraWrap} collapsable={false}>
          <CameraView
            key={`session-${cameraSession}`}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            animateShutter={false}
            onCameraReady={() => {
              setCameraReady(true);
              setShowCameraRetry(false);
            }}
            onMountError={(e) => {
              setCameraReady(false);
              Alert.alert('Camera', e.message ?? 'Could not start the camera preview.');
            }}
          />
          <BodyGuideOverlay pose={phase === 'front' ? 'front' : 'side'} />
          <View style={[styles.banner, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Text style={styles.bannerTxt}>
              {phase === 'front'
                ? 'Step back — full body, face the phone (avoid mirror reflections)'
                : 'Turn ~90° — side profile, same distance as before'}
            </Text>
          </View>
          {showCameraRetry && !cameraReady ? (
            <TouchableOpacity
              style={styles.retryCam}
              onPress={() => {
                setCameraReady(false);
                setCameraSession((s) => s + 1);
                setShowCameraRetry(false);
              }}
            >
              <Text style={styles.retryCamTxt}>Camera preview stuck? Tap to retry</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            disabled={!cameraReady}
            onPress={() => void capturePhoto()}
            style={[styles.shutter, { opacity: cameraReady ? 1 : 0.5 }]}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      ) : phase === 'analyze' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={[styles.p, { color: sub, marginTop: 16, textAlign: 'center' }]}>Running on-device pose model…</Text>
        </View>
      ) : result ? (
        <ScrollView contentContainerStyle={styles.pad}>
          {result.error ? (
            <View style={[styles.warn, { borderColor: 'rgba(255,180,100,0.5)' }]}>
              <Text style={[styles.warnTxt, { color: '#ffb74d' }]}>{result.error}</Text>
            </View>
          ) : null}
          {!result.error ? (
            <>
          {result.confidence < MIN_SAVE_CONFIDENCE ? (
            <View style={[styles.warn, { borderColor: 'rgba(255,180,100,0.5)' }]}>
              <Text style={[styles.warnTxt, { color: '#ffb74d' }]}>
                Low confidence scan. These values are draft estimates only, so retake before saving to progress.
              </Text>
            </View>
          ) : null}
          <Text style={[styles.metric, { color: text }]}>Chest: {result.chest_cm} cm</Text>
          <Text style={[styles.metric, { color: text }]}>Waist: {result.waist_cm} cm</Text>
          <Text style={[styles.metric, { color: text }]}>Hip: {result.hip_cm} cm</Text>
          <Text style={[styles.metric, { color: text }]}>Shoulder: {result.shoulder_cm} cm</Text>
          <Text style={[styles.p, { color: sub, marginTop: 8 }]}>Confidence: {result.confidence}</Text>
          <Text style={[styles.p, { color: sub, marginTop: 14, fontSize: getResponsiveFontSize(13), lineHeight: 20 }]}>
            Huge or tiny values usually mean the pose wasn’t read correctly — most often from mirror shots, cropping, or uneven light. Open
            “How to get usable numbers” on the previous screen and try a direct photo with the back camera.
          </Text>
          <TouchableOpacity
            onPress={() => void saveToSupabase()}
            disabled={saving || result.confidence < MIN_SAVE_CONFIDENCE}
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              marginTop: 24,
              opacity: result.confidence < MIN_SAVE_CONFIDENCE ? 0.45 : 1,
            }}
          >
            <LinearGradient colors={['#6da835', BRAND]} style={styles.cta}>
              <Text style={styles.ctaTxt}>
                {result.confidence < MIN_SAVE_CONFIDENCE ? 'Retake to save' : saving ? 'Saving…' : 'Save to progress'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
            </>
          ) : null}
          {result.debug ? (
            <>
              <TouchableOpacity
                style={[styles.debugToggle, { borderColor: border, backgroundColor: glass }]}
                onPress={() => setShowPoseDebug((v) => !v)}
                activeOpacity={0.85}
              >
                <Text style={[styles.guideToggleTitle, { color: text }]}>Pose debug overlay</Text>
                {showPoseDebug ? <ChevronUp size={22} color={text} /> : <ChevronDown size={22} color={text} />}
              </TouchableOpacity>
              {showPoseDebug ? (
                <View style={[styles.debugCard, { borderColor: border, backgroundColor: glass }]}>
                  <Text style={[styles.p, { color: sub, marginBottom: 10 }]}>
                    Scale: {result.debug.scaleCmPerPx ?? '--'} cm/px | Height pixels: {result.debug.personHeightPx ?? '--'}
                  </Text>
                  {frontUri && result.debug.front ? (
                    <PoseDebugOverlay title="Front photo" uri={frontUri} image={result.debug.front} textColor={text} subColor={sub} />
                  ) : null}
                  {sideUri && result.debug.side ? (
                    <PoseDebugOverlay title="Side photo" uri={sideUri} image={result.debug.side} textColor={text} subColor={sub} />
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}
          <TouchableOpacity onPress={resetFlow} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: BRAND, fontFamily: 'Barlow_600SemiBold' }}>Start over</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );
}

function numberOrNull(value: number | string | null | undefined) {
  if (value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function formatCm(value: number | string | null | undefined) {
  const numeric = numberOrNull(value);
  return numeric == null ? '--' : `${numeric.toFixed(1)} cm`;
}

function formatConfidence(value: number | string | null | undefined) {
  const numeric = numberOrNull(value);
  return numeric == null ? '--' : numeric.toFixed(2);
}

function formatMeasurementDate(entry: BodyMeasurementHistoryEntry) {
  const raw = entry.measurement_date || entry.created_at;
  if (!raw) return 'Unknown date';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDelta(current: number | string | null | undefined, previous: number | string | null | undefined) {
  const now = numberOrNull(current);
  const before = numberOrNull(previous);
  if (now == null || before == null) return null;
  const delta = now - before;
  if (Math.abs(delta) < 0.05) return 'No change';
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)} cm`;
}

function HistoryMetric({
  label,
  value,
  previous,
  textColor,
  subColor,
}: {
  label: string;
  value: number | null;
  previous?: number | null;
  textColor: string;
  subColor: string;
}) {
  const delta = formatDelta(value, previous);
  return (
    <View style={styles.historyMetric}>
      <Text style={[styles.historyMetricLabel, { color: subColor }]}>{label}</Text>
      <Text style={[styles.historyMetricValue, { color: textColor }]}>{formatCm(value)}</Text>
      {delta ? <Text style={[styles.historyDelta, { color: subColor }]}>{delta}</Text> : null}
    </View>
  );
}

function MeasurementHistory({
  history,
  loading,
  error,
  textColor,
  subColor,
  borderColor,
  backgroundColor,
  onRefresh,
}: {
  history: BodyMeasurementHistoryEntry[];
  loading: boolean;
  error: string | null;
  textColor: string;
  subColor: string;
  borderColor: string;
  backgroundColor: string;
  onRefresh: () => void;
}) {
  const latest = history[0];
  const previous = history[1];
  const recent = history.slice(1, 5);

  return (
    <View style={[styles.historyCard, { borderColor, backgroundColor }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyTitle, { color: textColor }]}>Saved progress</Text>
        <TouchableOpacity onPress={onRefresh} disabled={loading} activeOpacity={0.75}>
          <Text style={[styles.historyRefresh, { opacity: loading ? 0.55 : 1 }]}>{loading ? 'Loading...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={[styles.historyMessage, { color: '#ffb74d' }]}>{error}</Text> : null}
      {loading && history.length === 0 ? <ActivityIndicator color={BRAND} style={{ marginTop: 14 }} /> : null}
      {!loading && history.length === 0 && !error ? (
        <Text style={[styles.historyMessage, { color: subColor }]}>No saved scans yet. Your next saved measurement will appear here.</Text>
      ) : null}

      {latest ? (
        <>
          <Text style={[styles.historyDate, { color: subColor }]}>Latest: {formatMeasurementDate(latest)}</Text>
          <View style={styles.historyGrid}>
            <HistoryMetric label="Chest" value={latest.chest_cm} previous={previous?.chest_cm} textColor={textColor} subColor={subColor} />
            <HistoryMetric label="Waist" value={latest.waist_cm} previous={previous?.waist_cm} textColor={textColor} subColor={subColor} />
            <HistoryMetric label="Hip" value={latest.hip_cm} previous={previous?.hip_cm} textColor={textColor} subColor={subColor} />
            <HistoryMetric
              label="Shoulder"
              value={latest.shoulder_cm}
              previous={previous?.shoulder_cm}
              textColor={textColor}
              subColor={subColor}
            />
          </View>
          <Text style={[styles.historyMeta, { color: subColor }]}>
            Confidence: {formatConfidence(latest.measurement_confidence)} | Source: {latest.source || 'saved scan'}
          </Text>

          {recent.length > 0 ? (
            <View style={styles.historyList}>
              <Text style={[styles.historyListTitle, { color: textColor }]}>Recent scans</Text>
              {recent.map((entry) => (
                <View key={entry.id} style={[styles.historyRow, { borderColor }]}>
                  <Text style={[styles.historyRowDate, { color: subColor }]}>{formatMeasurementDate(entry)}</Text>
                  <Text style={[styles.historyRowText, { color: textColor }]}>
                    C {formatCm(entry.chest_cm)} | W {formatCm(entry.waist_cm)} | H {formatCm(entry.hip_cm)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function PoseDebugOverlay({
  title,
  uri,
  image,
  textColor,
  subColor,
}: {
  title: string;
  uri: string;
  image: MeasurementDebugImage;
  textColor: string;
  subColor: string;
}) {
  const kp = image.keypoints;
  const point = (index: number) => kp[index];
  const visible = (index: number) => {
    const p = point(index);
    return p && p.score >= 0.05;
  };
  const line = (a: number, b: number, color: string) => {
    const pa = point(a);
    const pb = point(b);
    if (!visible(a) || !visible(b)) return null;
    return <Line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={color} strokeWidth={0.006} />;
  };

  return (
    <View style={styles.debugBlock}>
      <Text style={[styles.debugTitle, { color: textColor }]}>{title}</Text>
      <View style={[styles.debugImageWrap, { aspectRatio: image.originalWidth / image.originalHeight }]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          {line(0, 15, 'rgba(132,196,65,0.75)')}
          {line(0, 16, 'rgba(132,196,65,0.75)')}
          {line(5, 6, 'rgba(255,210,80,0.9)')}
          {line(11, 12, 'rgba(80,180,255,0.9)')}
          {[0, 5, 6, 11, 12, 15, 16].map((index) => {
            const p = point(index);
            if (!p) return null;
            return (
              <Circle
                key={index}
                cx={p.x}
                cy={p.y}
                r={0.013}
                fill={p.score >= 0.25 ? BRAND : '#ffb74d'}
                opacity={p.score >= 0.05 ? 0.95 : 0.25}
              />
            );
          })}
        </Svg>
      </View>
      <Text style={[styles.debugMeta, { color: subColor }]}>
        Green line: scale estimate. Yellow: shoulders. Blue: hips. Orange dots are low-confidence points.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18) },
  pad: { padding: 20, paddingBottom: 40 },
  p: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), lineHeight: 22 },
  cta: { paddingVertical: 14, alignItems: 'center' },
  ctaTxt: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), color: '#0a0a0a' },
  cameraWrap: { flex: 1, marginHorizontal: 12, marginBottom: 24, borderRadius: 20, overflow: 'hidden' },
  banner: { position: 'absolute', top: 12, left: 12, right: 12, padding: 12, borderRadius: 12 },
  bannerTxt: { color: '#fff', fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13), textAlign: 'center' },
  shutter: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff', borderWidth: 3, borderColor: BRAND },
  retryCam: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  retryCamTxt: { color: '#fff', fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  metric: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), marginTop: 10 },
  warn: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  warnTxt: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), lineHeight: 18 },
  guideToggle: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  guideToggleTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15), flex: 1, paddingRight: 8 },
  guideBody: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  guideBullet: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), lineHeight: 20 },
  guideEm: { fontFamily: 'Barlow_600SemiBold' },
  historyCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), flex: 1 },
  historyRefresh: { color: BRAND, fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13) },
  historyMessage: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), lineHeight: 20, marginTop: 12 },
  historyDate: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), marginTop: 12 },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  historyMetric: {
    width: '47%',
    minHeight: 78,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(132,196,65,0.22)',
    padding: 10,
  },
  historyMetricLabel: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12) },
  historyMetricValue: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), marginTop: 4 },
  historyDelta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), marginTop: 4 },
  historyMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), marginTop: 12 },
  historyList: { marginTop: 16 },
  historyListTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), marginBottom: 8 },
  historyRow: {
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  historyRowDate: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), marginBottom: 4 },
  historyRowText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12), lineHeight: 18 },
  debugToggle: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  debugCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  debugBlock: { marginTop: 12 },
  debugTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), marginBottom: 8 },
  debugImageWrap: { width: '100%', borderRadius: 10, overflow: 'hidden', backgroundColor: '#111' },
  debugMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), lineHeight: 18, marginTop: 8 },
});
