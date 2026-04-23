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
  TextInput,
  Share,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/config/supabase';
import { useProfileStore } from '@/store/profileStore';
import {
  analyzeMeasurements,
  type MeasurementDebugImage,
  type MeasurementFeatureVector,
  type MeasurementResult,
  validateMeasurementCapture,
} from '@/services/bodyMeasurementService';
import { analyzeBodySegmentation, type BodySegmentationDebug, type SegmentationImageDebug } from '@/services/bodySegmentationService';
import {
  appendMeasurementLog,
  clearMeasurementLog,
  formatMeasurementLogForShare,
  readMeasurementLog,
} from '@/services/measurementLogger';
import { BodyGuideOverlay } from '@/components/shared/BodyGuideOverlay';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getGlassBg, getGlassBorder, getTextColor } from '@/utils/colorUtils';
import type { MediaPipePoseLandmark, MediaPipePoseResult } from '../../../modules/mediapipe-pose-landmarker';

const BRAND = '#84c441';
const MIN_SAVE_CONFIDENCE = 0.25;

type Phase = 'intro' | 'front' | 'side' | 'analyze' | 'result';

type EditableMeasurements = {
  chest: string;
  waist: string;
  hip: string;
  shoulder: string;
};

type ResultTrustState = {
  label: string;
  message: string;
  tone: 'success' | 'warning' | 'danger';
};

type SegmentationGeometryWarning = {
  message: string;
  severity: 'advisory' | 'blocking';
  kind?: 'geometry' | 'plausibility';
};

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

type MediaPipeComparisonDebug = {
  front?: MediaPipePoseResult;
  side?: MediaPipePoseResult;
  error?: string;
  usage?: 'debug-only' | 'primary' | 'mixed-fallback';
};

type MediaPipePoseLandmarkerModuleShape = {
  analyzePoseFromImage(uri: string): Promise<MediaPipePoseResult>;
};

async function analyzeMediaPipeComparison(frontImageUri: string, sideImageUri: string): Promise<MediaPipeComparisonDebug> {
  if (Platform.OS !== 'android') {
    return {
      error: 'MediaPipe Pose Landmarker debug bridge is Android-only until the iOS bridge is implemented.',
      usage: 'debug-only',
    };
  }

  try {
    // Lazy load keeps old dev clients from crashing before this debug path is used.
    const MediaPipePoseLandmarker = require('../../../modules/mediapipe-pose-landmarker').default as MediaPipePoseLandmarkerModuleShape;
    const [front, side] = await Promise.all([
      MediaPipePoseLandmarker.analyzePoseFromImage(frontImageUri),
      MediaPipePoseLandmarker.analyzePoseFromImage(sideImageUri),
    ]);
    return { front, side, usage: 'debug-only' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), usage: 'debug-only' };
  }
}

function mediaPipeDebugUsage(result: MeasurementResult): NonNullable<MediaPipeComparisonDebug['usage']> {
  const frontSource = result.debug?.front?.source;
  const sideSource = result.debug?.side?.source;
  if (frontSource === 'mediapipe' && sideSource === 'mediapipe') {
    return 'primary';
  }
  if (frontSource === 'mediapipe' || sideSource === 'mediapipe') {
    return 'mixed-fallback';
  }
  return 'debug-only';
}

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
  const [captureValidation, setCaptureValidation] = useState<{ phase: 'front' | 'side'; issues: string[] } | null>(null);
  const [captureCheckPhase, setCaptureCheckPhase] = useState<'front' | 'side' | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  /** Bumps when (re)opening the camera so Android gets a fresh native view after capture. */
  const [cameraSession, setCameraSession] = useState(0);
  const [showCameraRetry, setShowCameraRetry] = useState(false);
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [segmentationDebug, setSegmentationDebug] = useState<BodySegmentationDebug | null>(null);
  const [mediaPipeDebug, setMediaPipeDebug] = useState<MediaPipeComparisonDebug | null>(null);
  const [editedMeasurements, setEditedMeasurements] = useState<EditableMeasurements>({
    chest: '',
    waist: '',
    hip: '',
    shoulder: '',
  });
  const [saving, setSaving] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showPoseDebug, setShowPoseDebug] = useState(false);
  const [history, setHistory] = useState<BodyMeasurementHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [scanLogCount, setScanLogCount] = useState(0);
  const [scanLogViewerOpen, setScanLogViewerOpen] = useState(false);
  const [scanLogViewerText, setScanLogViewerText] = useState('');
  /**
   * Rolling list of shoulder measurements from past logged scans. Used by
   * `getCaptureAnomalyWarnings` to flag scans that drift from the user's
   * own historical median — see log scan #11 for the motivating example.
   * Only good scans (no error, shoulder in [25, 85] cm) are included.
   */
  const [historyShoulders, setHistoryShoulders] = useState<number[]>([]);
  const captureInFlight = useRef(false);

  const heightCm = profile?.height && profile.height > 0 ? profile.height : null;
  // Sex is used only to pick anthropometric depth constants inside the
  // measurement service. `undefined`, `'other'` and `'prefer_not_to_say'`
  // all resolve to the neutral preset.
  const measurementSex = profile?.gender;

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

  const refreshScanLogCount = useCallback(async () => {
    const entries = await readMeasurementLog();
    setScanLogCount(entries.length);
    // Keep the last 20 good shoulder measurements for the history gate. We
    // filter obvious garbage (errors, impossibly small/large shoulders) so
    // legacy bad entries don't poison the median.
    const shoulders = entries
      .slice(-20)
      .map((e) => e.edited?.shoulder_cm ?? e.result?.shoulder_cm ?? 0)
      .filter((v) => v >= 25 && v <= 85);
    setHistoryShoulders(shoulders);
  }, []);

  React.useEffect(() => {
    void refreshScanLogCount();
  }, [refreshScanLogCount]);

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
  const segmentationWarnings = getSegmentationGeometryWarnings(segmentationDebug);
  const plausibilityWarnings = getMeasurementPlausibilityWarnings(result);
  const anomalyWarnings = getCaptureAnomalyWarnings(result, heightCm, historyShoulders);
  const scanWarnings = [...segmentationWarnings, ...plausibilityWarnings, ...anomalyWarnings];
  const blockingScanWarnings = scanWarnings.filter((warning) => warning.severity === 'blocking');
  const captureBannerText =
    captureCheckPhase === 'front'
      ? 'Checking front photo...'
      : captureCheckPhase === 'side'
        ? 'Checking side photo...'
        : phase === 'front'
          ? '1/2 Front photo: fit head and feet inside the guide'
          : '2/2 Side photo: turn sideways, same distance';
  const cameraIssues = captureValidation?.phase === phase ? captureValidation.issues : [];
  // Dampen the displayed capture quality score when any anomaly (soft or
  // hard) is raised. Prevents a scan like log entry #11 from showing 0.82
  // "Capture quality" while actually being ~5 cm off on the shoulder.
  const effectiveConfidence =
    result && anomalyWarnings.length > 0
      ? Math.max(result.confidence * 0.6, 0.2)
      : result?.confidence ?? 0;

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || captureInFlight.current || heightCm == null) return;
    captureInFlight.current = true;
    try {
      setCaptureValidation(null);
      await primeAndroidPreview(cameraRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92, shutterSound: false });
      if (!photo?.uri) return;
      if (phase === 'front') {
        setCaptureCheckPhase('front');
        const validation = await validateMeasurementCapture({
          imageUri: photo.uri,
          phase: 'front',
          heightCm,
        });
        setCaptureCheckPhase(null);
        if (!validation.ok) {
          setCaptureValidation({ phase: 'front', issues: validation.issues });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await primeAndroidPreview(cameraRef.current);
          return;
        }
        setMediaPipeDebug(null);
        setSideUri(null);
        setFrontUri(photo.uri);
        setPhase('side');
        await primeAndroidPreview(cameraRef.current);
      } else if (phase === 'side') {
        if (!frontUri) return;
        setCaptureCheckPhase('side');
        const validation = await validateMeasurementCapture({
          imageUri: photo.uri,
          phase: 'side',
          heightCm,
          frontImageUri: frontUri,
        });
        setCaptureCheckPhase(null);
        if (!validation.ok) {
          setCaptureValidation({ phase: 'side', issues: validation.issues });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await primeAndroidPreview(cameraRef.current);
          return;
        }
        setSideUri(photo.uri);
        setPhase('analyze');
        setCameraReady(false);
        setCaptureValidation(null);
        setSegmentationDebug(null);
        setMediaPipeDebug(null);
        try {
          const res = await analyzeMeasurements({
            frontImageUri: frontUri,
            sideImageUri: photo.uri,
            heightCm,
            sex: measurementSex,
          });
          const mediaPipeComparisonPromise = res.debug?.mediaPipe
            ? Promise.resolve({
                ...res.debug.mediaPipe,
                usage: mediaPipeDebugUsage(res),
              })
            : analyzeMediaPipeComparison(frontUri, photo.uri);
          let finalResult = res;
          try {
            const segmentation = await analyzeBodySegmentation({
              frontImageUri: frontUri,
              sideImageUri: photo.uri,
              frontPose: res.debug?.front,
              sidePose: res.debug?.side,
            });
            setSegmentationDebug(segmentation);
            // Depth preference order:
            //   1. segmentation-derived depth (if mask + ratios are healthy)  — most accurate
            //   2. full segmentation rescue (if base is untrusted + masks ok) — last-ditch
            //   3. statistical prior already in `res`                         — stable default
            finalResult =
              refineMeasurementWithSegmentationDepth(res, segmentation) ??
              measurementResultFromSegmentation(res, segmentation) ??
              res;
            finalResult = attachSegmentationFeatureVector(finalResult, segmentation);
          } catch (segmentationError) {
            setSegmentationDebug({
              model: 'MediaPipe Image Segmenter (selfie_segmenter.tflite)',
              input: 'Native MediaPipe Tasks bitmap input',
              output: 'Confidence mask/category mask resized to 256x256, decoded as person confidence',
              error: segmentationError instanceof Error ? segmentationError.message : String(segmentationError),
            });
          }
          setMediaPipeDebug(await mediaPipeComparisonPromise);
          setResult(finalResult);
          setEditedMeasurements(measurementResultToEditable(finalResult));
          setPhase('result');
          // Compute dampened confidence + anomaly flags at log time so the
          // entry captures what the user actually saw and why. Uses the
          // current (pre-append) history so this scan isn't compared against
          // itself.
          const logAnomalies = computeCaptureAnomalies(
            finalResult,
            heightCm,
            historyShoulders,
          );
          const logEffectiveConfidence =
            logAnomalies.warnings.length > 0
              ? Math.max(finalResult.confidence * 0.6, 0.2)
              : finalResult.confidence;
          void (async () => {
            await appendMeasurementLog({
              timestamp: new Date().toISOString(),
              heightCm,
              result: finalResult,
              effectiveConfidence: Math.round(logEffectiveConfidence * 100) / 100,
              anomalyFlags: logAnomalies.flags,
            });
            await refreshScanLogCount();
          })();
          Haptics.notificationAsync(
            finalResult.error ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
          );
        } catch (e) {
          Alert.alert('Analysis', e instanceof Error ? e.message : 'On-device analysis failed.');
          setPhase('side');
          setSideUri(null);
          setMediaPipeDebug(null);
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
      setCaptureCheckPhase(null);
      captureInFlight.current = false;
    }
  }, [phase, cameraReady, frontUri, heightCm, measurementSex, primeAndroidPreview]);

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
    const warnings = [
      ...getSegmentationGeometryWarnings(segmentationDebug),
      ...getMeasurementPlausibilityWarnings(result),
      ...getCaptureAnomalyWarnings(result, heightCm, historyShoulders),
    ];
    const blockingWarning = warnings.find((warning) => warning.severity === 'blocking');
    if (blockingWarning) {
      Alert.alert('Retake needed', blockingWarning.message);
      return;
    }
    const corrected = parseEditableMeasurements(editedMeasurements);
    if (!corrected) {
      Alert.alert('Check measurements', 'Please enter valid centimeter values before saving.');
      return;
    }
    if (!measurementsInExpectedRange(corrected)) {
      Alert.alert('Check measurements', 'One or more values looks outside a realistic range. Please correct it before saving.');
      return;
    }
    const correctedFields = correctedMeasurementFields(result, corrected);
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
        chest_cm: corrected.chest,
        waist_cm: corrected.waist,
        hip_cm: corrected.hip,
        shoulder_cm: corrected.shoulder,
        measurement_confidence: result.confidence,
        source: 'ai_ondevice',
        manual_overrides: {
          ai_ondevice: {
            chest_cm: result.chest_cm,
            waist_cm: result.waist_cm,
            hip_cm: result.hip_cm,
            shoulder_cm: result.shoulder_cm,
            confidence: result.confidence,
          },
          measurement_feature_vector: result.debug?.featureVector ?? null,
          corrected_fields: correctedFields,
          corrected_at: correctedFields.length ? new Date().toISOString() : null,
        },
      });
      if (error) throw error;
      await loadMeasurementHistory();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFrontUri(null);
      setSideUri(null);
      setCaptureValidation(null);
      setCaptureCheckPhase(null);
      setResult(null);
      setSegmentationDebug(null);
      setMediaPipeDebug(null);
      setEditedMeasurements(emptyEditableMeasurements());
      setShowPoseDebug(false);
      setPhase('intro');
    } catch (e: any) {
      const msg = e?.message || e?.details || 'Could not save. If this persists, apply the latest DB migration (on-device columns).';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const openScanLogViewer = useCallback(async () => {
    try {
      const entries = await readMeasurementLog();
      if (entries.length === 0) {
        Alert.alert('Measurement log', 'No scans have been logged yet. Complete a scan first.');
        return;
      }
      setScanLogViewerText(formatMeasurementLogForShare(entries));
      setScanLogViewerOpen(true);
    } catch (e: any) {
      Alert.alert('View log', e?.message || 'Could not open the measurement log.');
    }
  }, []);

  const shareScanLog = useCallback(async () => {
    try {
      const entries = await readMeasurementLog();
      if (entries.length === 0) {
        Alert.alert('Measurement log', 'No scans have been logged yet. Complete a scan first.');
        return;
      }
      // NOTE: intentionally sharing the compact text summary only. Passing the
      // full JSON debug dump through `Share.share` on Android hits the ~1 MB
      // binder limit and freezes the system share sheet. Raw JSON lives on
      // disk — see `getMeasurementLogFileUri()`.
      const payload = formatMeasurementLogForShare(entries);
      await Share.share({
        title: `GoFit measurement log (${entries.length})`,
        message: payload,
      });
    } catch (e: any) {
      Alert.alert('Share log', e?.message || 'Could not share the measurement log.');
    }
  }, []);

  const clearScanLog = useCallback(() => {
    Alert.alert(
      'Clear measurement log?',
      `Remove all ${scanLogCount} logged scan${scanLogCount === 1 ? '' : 's'} from the device? Saved Supabase history is not affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearMeasurementLog();
            await refreshScanLogCount();
          },
        },
      ],
    );
  }, [scanLogCount, refreshScanLogCount]);

  const openCameraPhase = async (next: 'front' | 'side') => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert('Camera', 'Camera access is required for on-device measurements.');
        return;
      }
    }
    setCameraSession((s) => s + 1);
    setCaptureValidation(null);
    setCaptureCheckPhase(null);
    setPhase(next);
    setCameraReady(false);
  };

  const resetFlow = () => {
    setFrontUri(null);
    setSideUri(null);
    setCaptureValidation(null);
    setCaptureCheckPhase(null);
    setResult(null);
    setSegmentationDebug(null);
    setMediaPipeDebug(null);
    setEditedMeasurements(emptyEditableMeasurements());
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
              setCaptureValidation(null);
              setCaptureCheckPhase(null);
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
                <Text style={styles.guideEm}>Mirror photos are supported.</Text> Use one flat mirror, keep the phone away from your torso,
                avoid covering your waist or hips, and keep your whole body visible. The app checks body geometry instead of rejecting mirrors
                automatically.
              </Text>
              <Text style={[styles.guideBullet, { color: text, marginTop: 12 }]}>
                <Text style={styles.guideEm}>Use the green guide:</Text> keep your head below the top line and your feet above the bottom line.
                Step back if your body does not fit.
              </Text>
              <Text style={[styles.guideBullet, { color: text, marginTop: 12 }]}>
                <Text style={styles.guideEm}>Two poses:</Text> first photo facing the phone; second photo turned sideways. Keep the same distance
                from the camera for both.
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
            <Text style={styles.bannerTxt}>{captureBannerText}</Text>
          </View>
          {cameraIssues.length ? (
            <View style={styles.cameraWarn}>
              {cameraIssues.map((issue) => (
                <Text key={issue} style={styles.cameraWarnTxt}>
                  {issue}
                </Text>
              ))}
            </View>
          ) : null}
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
            disabled={!cameraReady || captureCheckPhase != null}
            onPress={() => void capturePhoto()}
            style={[styles.shutter, { opacity: cameraReady && captureCheckPhase == null ? 1 : 0.5 }]}
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
          <ResultTrustBanner
            state={getResultTrustState(result, scanWarnings)}
            confidence={effectiveConfidence}
            textColor={text}
            subColor={sub}
          />
          {scanWarnings.length ? (
            <View style={[styles.warn, { borderColor: 'rgba(255,180,100,0.5)' }]}>
              {scanWarnings.map((warning) => (
                <Text key={warning.message} style={[styles.warnTxt, { color: '#ffb74d', marginBottom: 6 }]}>
                  {warning.message}
                </Text>
              ))}
            </View>
          ) : null}
          {result.error ? (
            <View style={[styles.warn, { borderColor: 'rgba(255,180,100,0.5)' }]}>
              <Text style={[styles.warnTxt, { color: '#ffb74d' }]}>{result.error}</Text>
              {result.qualityIssues?.length ? (
                <View style={styles.qualityList}>
                  {result.qualityIssues.map((issue) => (
                    <Text key={issue} style={[styles.qualityItem, { color: text }]}>
                      {issue}
                    </Text>
                  ))}
                </View>
              ) : null}
              <TouchableOpacity onPress={resetFlow} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 16 }}>
                <LinearGradient colors={['#6da835', BRAND]} style={styles.cta}>
                  <Text style={styles.ctaTxt}>Retake photos</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null}
          {!result.error ? (
            <>
          <Text style={[styles.p, { color: sub, marginBottom: 12, fontSize: getResponsiveFontSize(13), lineHeight: 20 }]}>
            These are progress estimates, not tailoring or medical measurements. Correct the values if needed before saving.
          </Text>
          <MeasurementEditFields
            values={editedMeasurements}
            onChange={setEditedMeasurements}
            textColor={text}
            subColor={sub}
            borderColor={border}
            backgroundColor={glass}
          />
          <TouchableOpacity
            onPress={() => void saveToSupabase()}
            disabled={saving || result.confidence < MIN_SAVE_CONFIDENCE || blockingScanWarnings.length > 0}
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              marginTop: 24,
              opacity: result.confidence < MIN_SAVE_CONFIDENCE || blockingScanWarnings.length > 0 ? 0.45 : 1,
            }}
          >
            <LinearGradient colors={['#6da835', BRAND]} style={styles.cta}>
              <Text style={styles.ctaTxt}>
                {result.confidence < MIN_SAVE_CONFIDENCE || blockingScanWarnings.length > 0 ? 'Retake to save' : saving ? 'Saving…' : 'Save to progress'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
            </>
          ) : null}
          <ScanLogBar
            count={scanLogCount}
            onView={() => void openScanLogViewer()}
            onShare={() => void shareScanLog()}
            onClear={clearScanLog}
            textColor={text}
            subColor={sub}
            borderColor={border}
            backgroundColor={glass}
          />
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
                  {result.debug.formula ? (
                    <DiagnosticGrid
                      values={[
                        ['Front shoulders', `${result.debug.formula.frontShoulderPx ?? '--'} px`],
                        ['Front hips', `${result.debug.formula.frontHipPx ?? '--'} px`],
                        ['Side depth', `${result.debug.formula.sideShoulderPx ?? '--'} px`],
                        ['Shoulder width', `${result.debug.formula.shoulderWidthCm ?? '--'} cm`],
                        ['Hip width', `${result.debug.formula.hipWidthCm ?? '--'} cm`],
                        ['Chest depth', `${result.debug.formula.chestDepthCm ?? '--'} cm`],
                      ]}
                      textColor={text}
                      subColor={sub}
                    />
                  ) : null}
                  {result.debug.featureVector ? (
                    <FeatureVectorDebugPanel featureVector={result.debug.featureVector} textColor={text} subColor={sub} />
                  ) : null}
                  {result.debug.failedChecks?.length ? (
                    <Text style={[styles.debugMeta, { color: '#ffb74d', marginBottom: 10 }]}>
                      Failed checks: {result.debug.failedChecks.join(', ')}
                    </Text>
                  ) : null}
                  {segmentationDebug ? (
                    <SegmentationDebugPanel
                      debug={segmentationDebug}
                      frontUri={frontUri}
                      sideUri={sideUri}
                      scaleCmPerPx={result.debug.scaleCmPerPx}
                      textColor={text}
                      subColor={sub}
                    />
                  ) : null}
                  {mediaPipeDebug ? (
                    <MediaPipeDebugPanel
                      debug={mediaPipeDebug}
                      frontUri={frontUri}
                      sideUri={sideUri}
                      textColor={text}
                      subColor={sub}
                    />
                  ) : null}
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
          {!result.error ? (
            <TouchableOpacity onPress={resetFlow} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: BRAND, fontFamily: 'Barlow_600SemiBold' }}>Start over</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}
      <ScanLogViewerModal
        visible={scanLogViewerOpen}
        text={scanLogViewerText}
        onClose={() => setScanLogViewerOpen(false)}
        onShare={() => void shareScanLog()}
        backgroundColor={bg}
        surfaceColor={glass}
        borderColor={border}
        textColor={text}
        subColor={sub}
      />
    </View>
  );
}

function emptyEditableMeasurements(): EditableMeasurements {
  return { chest: '', waist: '', hip: '', shoulder: '' };
}

function measurementResultToEditable(result: MeasurementResult): EditableMeasurements {
  if (result.error) return emptyEditableMeasurements();
  return {
    chest: String(result.chest_cm),
    waist: String(result.waist_cm),
    hip: String(result.hip_cm),
    shoulder: String(result.shoulder_cm),
  };
}

function parseCmInput(value: string): number | null {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 10) / 10 : null;
}

function parseEditableMeasurements(values: EditableMeasurements) {
  const chest = parseCmInput(values.chest);
  const waist = parseCmInput(values.waist);
  const hip = parseCmInput(values.hip);
  const shoulder = parseCmInput(values.shoulder);
  if (chest == null || waist == null || hip == null || shoulder == null) return null;
  return { chest, waist, hip, shoulder };
}

function measurementsInExpectedRange(values: { chest: number; waist: number; hip: number; shoulder: number }) {
  return (
    values.chest >= 50 &&
    values.chest <= 180 &&
    values.waist >= 40 &&
    values.waist <= 170 &&
    values.hip >= 50 &&
    values.hip <= 180 &&
    values.shoulder >= 25 &&
    values.shoulder <= 100
  );
}

function correctedMeasurementFields(result: MeasurementResult, values: { chest: number; waist: number; hip: number; shoulder: number }) {
  const fields: string[] = [];
  if (Math.abs(values.chest - result.chest_cm) >= 0.1) fields.push('chest_cm');
  if (Math.abs(values.waist - result.waist_cm) >= 0.1) fields.push('waist_cm');
  if (Math.abs(values.hip - result.hip_cm) >= 0.1) fields.push('hip_cm');
  if (Math.abs(values.shoulder - result.shoulder_cm) >= 0.1) fields.push('shoulder_cm');
  return fields;
}

function getResultTrustState(result: MeasurementResult, segmentationWarnings: SegmentationGeometryWarning[] = []): ResultTrustState {
  if (result.error) {
    return {
      label: 'Retake needed',
      message: 'This scan could not produce reliable measurements. Retake the photos using the guidance below.',
      tone: 'danger',
    };
  }
  if (segmentationWarnings.some((warning) => warning.severity === 'blocking')) {
    return {
      label: 'Retake needed',
      message: 'The pose model looked confident, but the body mask geometry is not reliable enough to save.',
      tone: 'danger',
    };
  }
  if (segmentationWarnings.some((warning) => warning.kind === 'plausibility')) {
    return {
      label: 'Review carefully',
      message: 'One or more values looks unusual. Correct anything that looks off before saving.',
      tone: 'warning',
    };
  }
  if (segmentationWarnings.length) {
    return {
      label: 'Usable estimate',
      message: 'The scan is usable for progress tracking. Review and correct the numbers before saving.',
      tone: 'warning',
    };
  }
  if (result.confidence < MIN_SAVE_CONFIDENCE) {
    return {
      label: 'Low confidence',
      message: 'These values are only a rough draft. Retake before saving them to progress.',
      tone: 'danger',
    };
  }
  if (result.confidence >= 0.6) {
    return {
      label: 'Good scan',
      message: 'Review the estimates, correct anything that looks off, then save them to progress.',
      tone: 'success',
    };
  }
  return {
    label: 'Usable estimate',
    message: 'The scan is usable for progress tracking. Review and adjust the numbers before saving.',
    tone: 'warning',
  };
}

function getBodyMaskLine(image: SegmentationImageDebug | undefined, label: 'chest' | 'waist' | 'hip') {
  return image?.bodyMask?.lines.find((line) => line.label === label);
}

function getSegmentationGeometryWarnings(debug: BodySegmentationDebug | null): SegmentationGeometryWarning[] {
  if (!debug?.front?.bodyMask || !debug.side?.bodyMask) return [];

  const frontChest = getBodyMaskLine(debug.front, 'chest');
  const sideChest = getBodyMaskLine(debug.side, 'chest');
  const frontWaist = getBodyMaskLine(debug.front, 'waist');
  const sideWaist = getBodyMaskLine(debug.side, 'waist');
  if (!frontChest || !sideChest || !frontWaist || !sideWaist) return [];

  const chestRatio = frontChest.widthImagePx > 1 ? sideChest.widthImagePx / frontChest.widthImagePx : 0;
  const waistRatio = frontWaist.widthImagePx > 1 ? sideWaist.widthImagePx / frontWaist.widthImagePx : 0;
  const warnings: SegmentationGeometryWarning[] = [];

  if (chestRatio > 1.05 || waistRatio > 1.05) {
    warnings.push({
      kind: 'geometry',
      severity: 'blocking',
      message:
        'The side photo looks wider than the front photo, so body depth could not be trusted. Retake with a clean side profile and keep the phone away from your torso.',
    });
  } else if (chestRatio > 0.9 || waistRatio > 0.9) {
    warnings.push({
      kind: 'geometry',
      severity: 'advisory',
      message:
        'The side photo looks wide compared with the front photo. You can save after reviewing the values, but a cleaner side profile may improve accuracy.',
    });
  } else if (chestRatio < 0.18 || waistRatio < 0.18) {
    warnings.push({
      kind: 'geometry',
      severity: 'blocking',
      message:
        'The side photo looks too thin compared with the front photo, so body depth could not be trusted. Retake with your full body visible and arms slightly away from the torso.',
    });
  } else if (chestRatio < 0.28 || waistRatio < 0.28) {
    warnings.push({
      kind: 'geometry',
      severity: 'advisory',
      message:
        'The side photo looks narrow compared with the front photo. You can save after reviewing the values, but retaking may improve accuracy.',
    });
  }

  return warnings;
}

function getMeasurementPlausibilityWarnings(result: MeasurementResult | null): SegmentationGeometryWarning[] {
  if (!result || result.error) return [];

  const { chest_cm: chest, waist_cm: waist, hip_cm: hip, shoulder_cm: shoulder } = result;
  const warnings: SegmentationGeometryWarning[] = [];

  if (waist > chest * 1.45 || waist > hip * 1.35) {
    warnings.push({
      kind: 'plausibility',
      severity: 'blocking',
      message: 'The waist estimate is extremely high compared with the chest/hip. Retake or correct the scan before saving.',
    });
  } else if (waist > chest * 1.18 || waist > hip * 1.05) {
    warnings.push({
      kind: 'plausibility',
      severity: 'advisory',
      message: 'The waist estimate looks high compared with chest/hip. Review and correct it before saving.',
    });
  }

  if (chest >= 145 || waist >= 135) {
    warnings.push({
      kind: 'plausibility',
      severity: 'advisory',
      message: 'Chest or waist looks unusually high for this scan. Save only after checking the values.',
    });
  }

  if (shoulder >= 85) {
    warnings.push({
      kind: 'plausibility',
      severity: 'blocking',
      message: 'The shoulder estimate is extremely high. Retake or correct the scan before saving.',
    });
  } else if (shoulder >= 70) {
    warnings.push({
      kind: 'plausibility',
      severity: 'advisory',
      message: 'The shoulder estimate looks high. Review and correct it before saving.',
    });
  }

  return warnings;
}

/**
 * Expected shoulder/height ratios for adult humans. Rough bounds across sexes
 * and builds; going outside signals that either the pose landmarker drifted
 * or the profile height doesn't match the person in the photo.
 *
 *   0.22 – 0.30  = plausible band (~39–53 cm on a 175 cm person)
 *   < 0.20 or > 0.32 = almost certainly a scan error
 */
const SHOULDER_OVER_HEIGHT_MIN_BLOCKING = 0.2;
const SHOULDER_OVER_HEIGHT_MAX_BLOCKING = 0.32;
const SHOULDER_OVER_HEIGHT_MIN_ADVISORY = 0.22;
const SHOULDER_OVER_HEIGHT_MAX_ADVISORY = 0.3;

/**
 * Minimum number of logged scans before we start comparing a new scan against
 * the user's own history. Too few samples → the median isn't meaningful and
 * we'd reject the second scan just because it's different from the first.
 */
const HISTORY_MEDIAN_MIN_SAMPLES = 3;
/**
 * New-scan shoulder must be within this many cm of the user's own rolling
 * median to avoid the soft-anomaly flag. Good scans in the log cluster with
 * a σ ≈ 0.9 cm; pose-drifted scans (friend-held, busy background) measured
 * 3.0 and 5.4 cm off. 2.5 cm threshold puts the boundary at ~2.5σ — good
 * catch rate without false-firing on legitimate ±1–2 cm breath/posture noise.
 */
const HISTORY_SHOULDER_DEVIATION_CM = 2.5;

/**
 * Capture-anomaly warnings that aren't about anatomic plausibility of a
 * single scan but about whether this scan is consistent with either
 * absolute anthropometry (height × ratio) or the user's own recent history.
 *
 * This is the layer that catches scans like #11 in the log: mask failed, the
 * pipeline correctly fell back to the statistical prior, but the underlying
 * pose landmarks were already off by ~5 cm — so no single-scan check would
 * catch it. Context (height + prior scans) catches it.
 */
/**
 * Short labels for persisted log entries. These stay stable even if the
 * warning copy is reworded later, so old scans remain explainable.
 */
type CaptureAnomalyFlag =
  | 'shoulder-height-ratio-blocking'
  | 'shoulder-height-ratio-advisory'
  | 'history-shoulder-drift';

type CaptureAnomalyResult = {
  warnings: SegmentationGeometryWarning[];
  flags: CaptureAnomalyFlag[];
};

function getCaptureAnomalyWarnings(
  result: MeasurementResult | null,
  heightCm: number | null,
  historyShoulders: number[],
): SegmentationGeometryWarning[] {
  return computeCaptureAnomalies(result, heightCm, historyShoulders).warnings;
}

function computeCaptureAnomalies(
  result: MeasurementResult | null,
  heightCm: number | null,
  historyShoulders: number[],
): CaptureAnomalyResult {
  if (!result || result.error) return { warnings: [], flags: [] };
  const warnings: SegmentationGeometryWarning[] = [];
  const flags: CaptureAnomalyFlag[] = [];
  const shoulder = result.shoulder_cm;

  if (heightCm != null && heightCm > 0 && shoulder > 0) {
    const ratio = shoulder / heightCm;
    if (ratio < SHOULDER_OVER_HEIGHT_MIN_BLOCKING || ratio > SHOULDER_OVER_HEIGHT_MAX_BLOCKING) {
      warnings.push({
        kind: 'plausibility',
        severity: 'blocking',
        message:
          'Shoulders measured are out of the expected range for your height. Retake with the full body framed, phone at chest level, and arms slightly away from the torso.',
      });
      flags.push('shoulder-height-ratio-blocking');
    } else if (
      ratio < SHOULDER_OVER_HEIGHT_MIN_ADVISORY ||
      ratio > SHOULDER_OVER_HEIGHT_MAX_ADVISORY
    ) {
      warnings.push({
        kind: 'plausibility',
        severity: 'advisory',
        message:
          'Shoulders look unusual for your height. Double-check the values, or retake in portrait with your whole body visible.',
      });
      flags.push('shoulder-height-ratio-advisory');
    }
  }

  if (historyShoulders.length >= HISTORY_MEDIAN_MIN_SAMPLES) {
    const median = rollingMedian(historyShoulders);
    if (median > 0 && Math.abs(shoulder - median) >= HISTORY_SHOULDER_DEVIATION_CM) {
      warnings.push({
        kind: 'plausibility',
        severity: 'advisory',
        message: `This scan's shoulder measurement (${shoulder.toFixed(
          1,
        )} cm) differs from your recent scans (~${median.toFixed(
          1,
        )} cm). Retake with better framing for a reliable reading.`,
      });
      flags.push('history-shoulder-drift');
    }
  }

  return { warnings, flags };
}

function rollingMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function ellipseCircumference(widthCm: number, depthCm: number): number {
  const a = Math.max(widthCm / 2, 0.1);
  const b = Math.max(depthCm / 2, 0.1);
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

function roundMeasurement(n: number): number {
  return Math.round(n * 10) / 10;
}

function segmentationLineCm(image: SegmentationImageDebug | undefined, label: 'chest' | 'waist' | 'hip', scaleCmPerPx?: number) {
  const line = getBodyMaskLine(image, label);
  if (!line || scaleCmPerPx == null || scaleCmPerPx <= 0) return null;
  const value = line.widthImagePx * scaleCmPerPx;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function roundRatio(value: number | null) {
  return value == null || !Number.isFinite(value) ? undefined : Math.round(value * 100) / 100;
}

function buildSegmentationFeatureVector(
  featureVector: MeasurementFeatureVector | undefined,
  segmentation: BodySegmentationDebug,
  scaleCmPerPx: number,
  draft: { chest: number; waist: number; hip: number; shoulder: number; confidence: number },
): MeasurementFeatureVector | undefined {
  if (!featureVector) return undefined;

  const frontChest = segmentationLineCm(segmentation.front, 'chest', scaleCmPerPx);
  const frontWaist = segmentationLineCm(segmentation.front, 'waist', scaleCmPerPx);
  const frontHip = segmentationLineCm(segmentation.front, 'hip', scaleCmPerPx);
  const sideChest = segmentationLineCm(segmentation.side, 'chest', scaleCmPerPx);
  const sideWaist = segmentationLineCm(segmentation.side, 'waist', scaleCmPerPx);
  const sideHip = segmentationLineCm(segmentation.side, 'hip', scaleCmPerPx);

  return {
    ...featureVector,
    draftChestCm: draft.chest,
    draftWaistCm: draft.waist,
    draftHipCm: draft.hip,
    draftShoulderCm: draft.shoulder,
    confidence: draft.confidence,
    segmentation: {
      model: segmentation.model,
      bodyClassIndex: segmentation.front?.bodyMask?.classIndex ?? segmentation.side?.bodyMask?.classIndex,
      frontRawCoverage: segmentation.front?.bodyMask ? Math.round(segmentation.front.bodyMask.rawCoverage * 10000) / 10000 : undefined,
      frontCleanCoverage: segmentation.front?.bodyMask ? Math.round(segmentation.front.bodyMask.cleanedCoverage * 10000) / 10000 : undefined,
      sideRawCoverage: segmentation.side?.bodyMask ? Math.round(segmentation.side.bodyMask.rawCoverage * 10000) / 10000 : undefined,
      sideCleanCoverage: segmentation.side?.bodyMask ? Math.round(segmentation.side.bodyMask.cleanedCoverage * 10000) / 10000 : undefined,
      frontChestWidthCm: frontChest == null ? undefined : roundMeasurement(frontChest),
      frontWaistWidthCm: frontWaist == null ? undefined : roundMeasurement(frontWaist),
      frontHipWidthCm: frontHip == null ? undefined : roundMeasurement(frontHip),
      sideChestDepthCm: sideChest == null ? undefined : roundMeasurement(sideChest),
      sideWaistDepthCm: sideWaist == null ? undefined : roundMeasurement(sideWaist),
      sideHipDepthCm: sideHip == null ? undefined : roundMeasurement(sideHip),
      chestDepthToWidthRatio: roundRatio(frontChest && sideChest ? sideChest / frontChest : null),
      waistDepthToWidthRatio: roundRatio(frontWaist && sideWaist ? sideWaist / frontWaist : null),
      hipDepthToWidthRatio: roundRatio(frontHip && sideHip ? sideHip / frontHip : null),
    },
  };
}

function attachSegmentationFeatureVector(
  result: MeasurementResult,
  segmentation: BodySegmentationDebug,
): MeasurementResult {
  const featureVector = result.debug?.featureVector;
  const scaleCmPerPx = result.debug?.scaleCmPerPx;
  if (!featureVector || scaleCmPerPx == null || scaleCmPerPx <= 0) {
    return result;
  }

  const nextFeatureVector = buildSegmentationFeatureVector(featureVector, segmentation, scaleCmPerPx, {
    chest: result.chest_cm,
    waist: result.waist_cm,
    hip: result.hip_cm,
    shoulder: result.shoulder_cm,
    confidence: result.confidence,
  });
  if (!nextFeatureVector || !result.debug) {
    return result;
  }

  return {
    ...result,
    debug: {
      ...result.debug,
      featureVector: nextFeatureVector,
    },
  };
}

// Minimum body-pixel coverage for a segmentation result to be trusted. Front
// silhouettes typically occupy 12–25 % of the frame; side silhouettes 6–15 %.
// Going below these thresholds means the mask is under-detecting body pixels
// and depth/width measurements become meaningless (side hip of 7.9 cm etc.).
const MIN_FRONT_SEGMENTATION_COVERAGE = 0.08;
const MIN_SIDE_SEGMENTATION_COVERAGE = 0.045;
// Reject anatomically impossible torso proportions. Real hip/waist depth is
// usually 0.55–0.95 of the matching width; sub-0.5 means the side mask is
// clipping the body or capturing the person in a non-standing pose.
const MIN_DEPTH_TO_WIDTH_RATIO = 0.5;
const MAX_DEPTH_TO_WIDTH_RATIO = 1.2;

function segmentationCoverageOk(segmentation: BodySegmentationDebug): boolean {
  const frontCov = segmentation.front?.bodyMask?.cleanedCoverage ?? 0;
  const sideCov = segmentation.side?.bodyMask?.cleanedCoverage ?? 0;
  return (
    frontCov >= MIN_FRONT_SEGMENTATION_COVERAGE &&
    sideCov >= MIN_SIDE_SEGMENTATION_COVERAGE
  );
}

function baseResultIsTrustworthy(base: MeasurementResult): boolean {
  if (base.error) return false;
  if (!base.debug) return false;
  if (base.debug.failedChecks?.length) return false;
  const { chest_cm, waist_cm, hip_cm, shoulder_cm } = base;
  return (
    chest_cm > 0 &&
    waist_cm > 0 &&
    hip_cm > 0 &&
    shoulder_cm > 0 &&
    measurementsInExpectedRange({ chest: chest_cm, waist: waist_cm, hip: hip_cm, shoulder: shoulder_cm })
  );
}

/**
 * Minimum side-mask cleaned coverage required for segmentation to *refine*
 * (not rescue) the depths. Slightly higher than the rescue-path threshold —
 * we want a clearly healthy mask before overriding the stable statistical
 * prior.
 */
const MIN_SIDE_COVERAGE_FOR_DEPTH_REFINE = 0.08;
/**
 * Valid window for (segmentation side-depth / front shoulder width). Values
 * outside this are almost certainly mask defects (e.g. 7 cm chest depth vs
 * 45 cm shoulders → ratio 0.15, nonsense). The cap also catches masks that
 * leak into background objects.
 */
const MIN_CHEST_DEPTH_OVER_SHOULDER = 0.38;
const MAX_CHEST_DEPTH_OVER_SHOULDER = 0.65;
const MIN_WAIST_DEPTH_OVER_SHOULDER = 0.28;
const MAX_WAIST_DEPTH_OVER_SHOULDER = 0.6;
const TARGET_FRONT_SEGMENTATION_COVERAGE = 0.14;
const TARGET_SIDE_SEGMENTATION_COVERAGE = 0.12;
/**
 * Maximum allowed deviation of segmentation depth from the statistical prior,
 * in cm. A healthy mask never disagrees with population-average anthropometry
 * by more than this for an adult. Prevents rare-but-real mask glitches from
 * turning a good scan into a bad one.
 */
const MAX_DEPTH_DELTA_FROM_STATISTICAL_CM = 8;

function scoreAboveThreshold(value: number, min: number, target: number): number {
  if (value <= min) return 0.55;
  return Math.min(1, 0.55 + ((value - min) / Math.max(target - min, 0.001)) * 0.45);
}

function scoreWithinWindow(value: number, min: number, max: number): number {
  const center = (min + max) / 2;
  const halfWidth = Math.max((max - min) / 2, 0.001);
  return Math.max(0.55, 1 - (Math.abs(value - center) / halfWidth) * 0.45);
}

function segmentationRefineConfidence(
  baseConfidence: number,
  frontCoverage: number,
  sideCoverage: number,
  chestDepthOverShoulder: number,
  waistDepthOverShoulder: number,
): number {
  const segmentationQuality = Math.min(
    scoreAboveThreshold(frontCoverage, MIN_FRONT_SEGMENTATION_COVERAGE, TARGET_FRONT_SEGMENTATION_COVERAGE),
    scoreAboveThreshold(sideCoverage, MIN_SIDE_COVERAGE_FOR_DEPTH_REFINE, TARGET_SIDE_SEGMENTATION_COVERAGE),
    scoreWithinWindow(chestDepthOverShoulder, MIN_CHEST_DEPTH_OVER_SHOULDER, MAX_CHEST_DEPTH_OVER_SHOULDER),
    scoreWithinWindow(waistDepthOverShoulder, MIN_WAIST_DEPTH_OVER_SHOULDER, MAX_WAIST_DEPTH_OVER_SHOULDER),
  );
  return Math.round(Math.min(baseConfidence, segmentationQuality) * 100) / 100;
}

/**
 * Refines the measurement result by substituting the statistical depth prior
 * with the actual side-mask depth from segmentation — *only* when the mask
 * is healthy and the depth sits inside an anatomically plausible window.
 *
 * If any gate fails, returns `null` and the caller keeps the (stable)
 * statistical result.
 *
 * Hip depth is intentionally left on the statistical fallback: hip-level side
 * masks are the least reliable part of the segmentation pipeline because
 * legs/arms occlude the torso silhouette and the mask can swallow a thigh.
 */
function refineMeasurementWithSegmentationDepth(
  base: MeasurementResult,
  segmentation: BodySegmentationDebug,
): MeasurementResult | null {
  if (base.error) return null;
  const fv = base.debug?.featureVector;
  const scale = base.debug?.scaleCmPerPx;
  const shoulderWidth = fv?.frontShoulderWidthCm;
  const hipWidth = fv?.frontHipWidthCm;
  const waistWidthStat = fv?.estimatedWaistWidthCm;
  const abdomenOverChest = fv?.abdomenDepthOverChest;
  if (
    !fv ||
    scale == null ||
    scale <= 0 ||
    shoulderWidth == null ||
    shoulderWidth <= 0 ||
    hipWidth == null ||
    hipWidth <= 0 ||
    waistWidthStat == null ||
    waistWidthStat <= 0
  ) {
    return null;
  }

  const sideCov = segmentation.side?.bodyMask?.cleanedCoverage ?? 0;
  const frontCov = segmentation.front?.bodyMask?.cleanedCoverage ?? 0;
  if (sideCov < MIN_SIDE_COVERAGE_FOR_DEPTH_REFINE) return null;
  if (frontCov < MIN_FRONT_SEGMENTATION_COVERAGE) return null;

  const sideChestDepth = segmentationLineCm(segmentation.side, 'chest', scale);
  const sideWaistDepth = segmentationLineCm(segmentation.side, 'waist', scale);
  if (sideChestDepth == null || sideWaistDepth == null) return null;

  const chestOverShoulder = sideChestDepth / shoulderWidth;
  const waistOverShoulder = sideWaistDepth / shoulderWidth;
  if (
    chestOverShoulder < MIN_CHEST_DEPTH_OVER_SHOULDER ||
    chestOverShoulder > MAX_CHEST_DEPTH_OVER_SHOULDER ||
    waistOverShoulder < MIN_WAIST_DEPTH_OVER_SHOULDER ||
    waistOverShoulder > MAX_WAIST_DEPTH_OVER_SHOULDER
  ) {
    return null;
  }

  const statisticalChestDepth = fv.estimatedChestDepthCm;
  const statisticalAbdomenDepth = fv.estimatedAbdomenDepthCm;
  if (
    statisticalChestDepth != null &&
    Math.abs(sideChestDepth - statisticalChestDepth) > MAX_DEPTH_DELTA_FROM_STATISTICAL_CM
  ) {
    return null;
  }
  if (
    statisticalAbdomenDepth != null &&
    Math.abs(sideWaistDepth - statisticalAbdomenDepth) > MAX_DEPTH_DELTA_FROM_STATISTICAL_CM
  ) {
    return null;
  }

  // Recompute circumferences using pose-derived widths + segmentation depths.
  // Keep hip on the original (statistical) depth path — see doc comment.
  const chestWidth = shoulderWidth * 0.88;
  const chest = roundMeasurement(ellipseCircumference(chestWidth, sideChestDepth));
  const waist = roundMeasurement(ellipseCircumference(waistWidthStat, sideWaistDepth));
  // Hip depth preserved from the statistical path (hip = hipWidth × 0.95 × statisticalAbdomenDepth).
  const hipDepth =
    statisticalAbdomenDepth != null
      ? statisticalAbdomenDepth * 0.95
      : sideWaistDepth * (abdomenOverChest ?? 0.84);
  const hip = roundMeasurement(ellipseCircumference(hipWidth, hipDepth));

  if (!measurementsInExpectedRange({ chest, waist, hip, shoulder: base.shoulder_cm })) {
    return null;
  }

  const confidence = segmentationRefineConfidence(
    base.confidence,
    frontCov,
    sideCov,
    chestOverShoulder,
    waistOverShoulder,
  );

  return {
    ...base,
    chest_cm: chest,
    waist_cm: waist,
    hip_cm: hip,
    confidence,
    debug: {
      ...base.debug,
      featureVector: {
        ...fv,
        estimatedChestDepthCm: roundMeasurement(sideChestDepth),
        estimatedAbdomenDepthCm: roundMeasurement(sideWaistDepth),
        depthSource: 'segmentation',
        confidence,
      },
    },
  };
}

function measurementResultFromSegmentation(
  base: MeasurementResult,
  segmentation: BodySegmentationDebug,
): MeasurementResult | null {
  // Only use segmentation as a rescue path when (a) the pose-formula base
  // result is clearly untrustworthy and (b) the segmentation masks themselves
  // look healthy. A broken side mask + an error-free pose result now keeps
  // the pose numbers instead of being overridden with garbage.
  if (baseResultIsTrustworthy(base)) {
    return null;
  }
  if (!segmentationCoverageOk(segmentation)) {
    return null;
  }

  const scaleCmPerPx = base.debug?.scaleCmPerPx;
  const frontChest = segmentationLineCm(segmentation.front, 'chest', scaleCmPerPx);
  const frontWaist = segmentationLineCm(segmentation.front, 'waist', scaleCmPerPx);
  const frontHip = segmentationLineCm(segmentation.front, 'hip', scaleCmPerPx);
  const sideChest = segmentationLineCm(segmentation.side, 'chest', scaleCmPerPx);
  const sideWaist = segmentationLineCm(segmentation.side, 'waist', scaleCmPerPx);
  const sideHip = segmentationLineCm(segmentation.side, 'hip', scaleCmPerPx);

  if (
    scaleCmPerPx == null ||
    frontChest == null ||
    frontWaist == null ||
    frontHip == null ||
    sideChest == null ||
    sideWaist == null ||
    sideHip == null
  ) {
    return null;
  }

  // Anatomical sanity on depth-to-width ratios. Impossible proportions (e.g.,
  // hip depth 7.9 cm vs width 23.4 cm → 0.34 ratio) indicate mask defects.
  const chestRatio = sideChest / frontChest;
  const waistRatio = sideWaist / frontWaist;
  const hipRatio = sideHip / frontHip;
  const ratiosOk =
    chestRatio >= MIN_DEPTH_TO_WIDTH_RATIO && chestRatio <= MAX_DEPTH_TO_WIDTH_RATIO &&
    waistRatio >= MIN_DEPTH_TO_WIDTH_RATIO && waistRatio <= MAX_DEPTH_TO_WIDTH_RATIO &&
    hipRatio >= MIN_DEPTH_TO_WIDTH_RATIO && hipRatio <= MAX_DEPTH_TO_WIDTH_RATIO;
  if (!ratiosOk) {
    return null;
  }

  const chest = roundMeasurement(ellipseCircumference(frontChest, sideChest));
  const waist = roundMeasurement(ellipseCircumference(frontWaist, sideWaist));
  const hip = roundMeasurement(ellipseCircumference(frontHip, sideHip));
  const shoulderFallback = base.debug?.formula?.rawShoulderCm ?? base.shoulder_cm;
  const shoulder = roundMeasurement(shoulderFallback >= 25 && shoulderFallback <= 60 ? shoulderFallback : frontChest * 1.25);

  if (!measurementsInExpectedRange({ chest, waist, hip, shoulder })) {
    return null;
  }

  return {
    ...base,
    chest_cm: chest,
    waist_cm: waist,
    hip_cm: hip,
    shoulder_cm: shoulder,
    confidence: Math.max(base.confidence, 0.52),
    debug: base.debug
      ? {
          ...base.debug,
          featureVector: buildSegmentationFeatureVector(base.debug.featureVector, segmentation, scaleCmPerPx, {
            chest,
            waist,
            hip,
            shoulder,
            confidence: Math.max(base.confidence, 0.52),
          }),
        }
      : base.debug,
    error: undefined,
    qualityIssues: undefined,
  };
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

function ScanLogBar({
  count,
  onView,
  onShare,
  onClear,
  textColor,
  subColor,
  borderColor,
  backgroundColor,
}: {
  count: number;
  onView: () => void;
  onShare: () => void;
  onClear: () => void;
  textColor: string;
  subColor: string;
  borderColor: string;
  backgroundColor: string;
}) {
  return (
    <View
      style={[
        styles.scanLogBar,
        { borderColor, backgroundColor },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.scanLogTitle, { color: textColor }]}>
          Scan log · {count} saved
        </Text>
        <Text style={[styles.scanLogHint, { color: subColor }]}>
          Every scan is logged on-device so you don't have to screenshot the results.
        </Text>
      </View>
      <View style={styles.scanLogActions}>
        <TouchableOpacity
          onPress={onView}
          disabled={count === 0}
          style={[
            styles.scanLogButton,
            { borderColor: BRAND, opacity: count === 0 ? 0.4 : 1 },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.scanLogButtonTxt, { color: BRAND }]}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onShare}
          disabled={count === 0}
          style={[
            styles.scanLogButton,
            { borderColor: BRAND, opacity: count === 0 ? 0.4 : 1 },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.scanLogButtonTxt, { color: BRAND }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClear}
          disabled={count === 0}
          style={[
            styles.scanLogButton,
            { borderColor: 'rgba(255,120,120,0.6)', opacity: count === 0 ? 0.4 : 1 },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.scanLogButtonTxt, { color: '#ff8b8b' }]}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Full-screen modal that shows the on-device measurement log inline. Text is
 * `selectable` so the user can long-press to copy without going through the
 * system share sheet (which freezes on Android when given large payloads).
 */
function ScanLogViewerModal({
  visible,
  text,
  onClose,
  onShare,
  backgroundColor,
  surfaceColor,
  borderColor,
  textColor,
  subColor,
}: {
  visible: boolean;
  text: string;
  onClose: () => void;
  onShare: () => void;
  backgroundColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  subColor: string;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.logModalRoot, { backgroundColor }]}>
        <View style={[styles.logModalHeader, { borderColor }]}>
          <Text style={[styles.logModalTitle, { color: textColor }]}>Measurement log</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={onShare}
              style={[styles.scanLogButton, { borderColor: BRAND }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.scanLogButtonTxt, { color: BRAND }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.scanLogButton, { borderColor }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.scanLogButtonTxt, { color: textColor }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.logModalHint, { color: subColor }]}>
          Long-press any block of text to select and copy it.
        </Text>
        <ScrollView
          style={[styles.logModalScroll, { backgroundColor: surfaceColor, borderColor }]}
          contentContainerStyle={{ padding: 14 }}
        >
          <Text selectable style={[styles.logModalText, { color: textColor }]}>
            {text}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
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

function MeasurementEditFields({
  values,
  onChange,
  textColor,
  subColor,
  borderColor,
  backgroundColor,
}: {
  values: EditableMeasurements;
  onChange: (next: EditableMeasurements) => void;
  textColor: string;
  subColor: string;
  borderColor: string;
  backgroundColor: string;
}) {
  const update = (key: keyof EditableMeasurements, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const fields: Array<{ key: keyof EditableMeasurements; label: string }> = [
    { key: 'chest', label: 'Chest' },
    { key: 'waist', label: 'Waist' },
    { key: 'hip', label: 'Hip' },
    { key: 'shoulder', label: 'Shoulder' },
  ];

  return (
    <View style={[styles.editCard, { borderColor, backgroundColor }]}>
      <Text style={[styles.editTitle, { color: textColor }]}>Review before saving</Text>
      <Text style={[styles.editHelp, { color: subColor }]}>Adjust any value that looks off. Saved progress will use these numbers.</Text>
      <View style={styles.editGrid}>
        {fields.map((field) => (
          <View key={field.key} style={styles.editField}>
            <Text style={[styles.editLabel, { color: subColor }]}>{field.label}</Text>
            <View style={[styles.editInputWrap, { borderColor }]}>
              <TextInput
                value={values[field.key]}
                onChangeText={(value) => update(field.key, value)}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={[styles.editInput, { color: textColor }]}
                placeholder="0"
                placeholderTextColor={subColor}
              />
              <Text style={[styles.editUnit, { color: subColor }]}>cm</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ResultTrustBanner({
  state,
  confidence,
  textColor,
  subColor,
}: {
  state: ResultTrustState;
  confidence: number;
  textColor: string;
  subColor: string;
}) {
  const toneColor = state.tone === 'success' ? BRAND : state.tone === 'warning' ? '#ffb74d' : '#ff8a65';
  return (
    <View style={[styles.trustBanner, { borderColor: `${toneColor}88` }]}>
      <View style={styles.trustHeader}>
        <Text style={[styles.trustLabel, { color: toneColor }]}>{state.label}</Text>
        <Text style={[styles.trustConfidence, { color: subColor }]}>Capture quality {confidence.toFixed(2)}</Text>
      </View>
      <Text style={[styles.trustMessage, { color: textColor }]}>{state.message}</Text>
    </View>
  );
}

function DiagnosticGrid({
  values,
  textColor,
  subColor,
}: {
  values: Array<[string, string]>;
  textColor: string;
  subColor: string;
}) {
  return (
    <View style={styles.diagnosticGrid}>
      {values.map(([label, value]) => (
        <View key={label} style={styles.diagnosticItem}>
          <Text style={[styles.diagnosticLabel, { color: subColor }]}>{label}</Text>
          <Text style={[styles.diagnosticValue, { color: textColor }]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function formatDebugValue(value: number | undefined, suffix = '', digits = 1) {
  return value == null || !Number.isFinite(value) ? '--' : `${value.toFixed(digits)}${suffix}`;
}

function FeatureVectorDebugPanel({
  featureVector,
  textColor,
  subColor,
}: {
  featureVector: MeasurementFeatureVector;
  textColor: string;
  subColor: string;
}) {
  const segmentation = featureVector.segmentation;
  return (
    <View style={styles.debugBlock}>
      <Text style={[styles.debugTitle, { color: textColor }]}>Measurement feature vector</Text>
      <DiagnosticGrid
        values={[
          ['Height input', formatDebugValue(featureVector.heightCm, ' cm')],
          ['Person height', formatDebugValue(featureVector.personHeightPx, ' px')],
          ['Scale', formatDebugValue(featureVector.scaleCmPerPx, ' cm/px', 2)],
          ['Height span', formatDebugValue(featureVector.heightSpanFrac, '', 2)],
          ['Depth source', featureVector.depthSource ?? '--'],
          ['Depth model', featureVector.depthModel ?? '--'],
          [
            'Front pose',
            `${formatDebugValue(featureVector.frontPoseMeanScore, '', 2)} | ${featureVector.frontVisibleCoreKeypoints ?? '--'} pts`,
          ],
          [
            'Side pose',
            `${formatDebugValue(featureVector.sidePoseMeanScore, '', 2)} | ${featureVector.sideVisibleCoreKeypoints ?? '--'} pts`,
          ],
          ['Front shoulder', formatDebugValue(featureVector.frontShoulderWidthCm, ' cm')],
          ['Front hip', formatDebugValue(featureVector.frontHipWidthCm, ' cm')],
          ['Est. chest depth', formatDebugValue(featureVector.estimatedChestDepthCm, ' cm')],
          ['Side/front ratio', formatDebugValue(featureVector.sideToFrontShoulderRatio, '', 2)],
          [
            'Draft C/W/H',
            `${formatDebugValue(featureVector.draftChestCm, '')}/${formatDebugValue(featureVector.draftWaistCm, '')}/${formatDebugValue(
              featureVector.draftHipCm,
              '',
            )} cm`,
          ],
          ['Draft shoulder', formatDebugValue(featureVector.draftShoulderCm, ' cm')],
        ]}
        textColor={textColor}
        subColor={subColor}
      />
      {segmentation ? (
        <>
          <Text style={[styles.debugMeta, { color: subColor }]}>
            Segmentation: {segmentation.model ?? 'mask'} | Class {segmentation.bodyClassIndex ?? '--'}
          </Text>
          <DiagnosticGrid
            values={[
              ['Front mask clean', formatDebugValue(segmentation.frontCleanCoverage == null ? undefined : segmentation.frontCleanCoverage * 100, '%', 0)],
              ['Side mask clean', formatDebugValue(segmentation.sideCleanCoverage == null ? undefined : segmentation.sideCleanCoverage * 100, '%', 0)],
              ['Front C/W/H', `${formatDebugValue(segmentation.frontChestWidthCm)}/${formatDebugValue(segmentation.frontWaistWidthCm)}/${formatDebugValue(segmentation.frontHipWidthCm)} cm`],
              ['Side C/W/H', `${formatDebugValue(segmentation.sideChestDepthCm)}/${formatDebugValue(segmentation.sideWaistDepthCm)}/${formatDebugValue(segmentation.sideHipDepthCm)} cm`],
              ['Depth ratio C', formatDebugValue(segmentation.chestDepthToWidthRatio, '', 2)],
              ['Depth ratio W/H', `${formatDebugValue(segmentation.waistDepthToWidthRatio, '', 2)}/${formatDebugValue(segmentation.hipDepthToWidthRatio, '', 2)}`],
            ]}
            textColor={textColor}
            subColor={subColor}
          />
        </>
      ) : null}
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
            Capture quality: {formatConfidence(latest.measurement_confidence)} | Source: {latest.source || 'saved scan'}
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

const MEDIAPIPE_POSE_CONNECTIONS: Array<[number, number, string]> = [
  [11, 12, 'rgba(255,210,80,0.95)'],
  [23, 24, 'rgba(80,180,255,0.95)'],
  [11, 23, 'rgba(132,196,65,0.8)'],
  [12, 24, 'rgba(132,196,65,0.8)'],
  [11, 13, 'rgba(132,196,65,0.55)'],
  [13, 15, 'rgba(132,196,65,0.55)'],
  [12, 14, 'rgba(132,196,65,0.55)'],
  [14, 16, 'rgba(132,196,65,0.55)'],
  [23, 25, 'rgba(132,196,65,0.65)'],
  [25, 27, 'rgba(132,196,65,0.65)'],
  [27, 31, 'rgba(132,196,65,0.55)'],
  [24, 26, 'rgba(132,196,65,0.65)'],
  [26, 28, 'rgba(132,196,65,0.65)'],
  [28, 32, 'rgba(132,196,65,0.55)'],
];

const MEDIAPIPE_DEBUG_POINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];
const MEDIAPIPE_CORE_POINTS = [0, 11, 12, 23, 24, 27, 28, 31, 32];

function mediaPipeLandmarkScore(landmark?: MediaPipePoseLandmark) {
  if (!landmark) return 0;
  if (typeof landmark.visibility === 'number') return landmark.visibility;
  if (typeof landmark.presence === 'number') return landmark.presence;
  return 1;
}

function mediaPipeLandmarkIsDrawable(landmark?: MediaPipePoseLandmark, minScore = 0.2) {
  return (
    !!landmark &&
    Number.isFinite(landmark.x) &&
    Number.isFinite(landmark.y) &&
    landmark.x >= -0.05 &&
    landmark.x <= 1.05 &&
    landmark.y >= -0.05 &&
    landmark.y <= 1.05 &&
    mediaPipeLandmarkScore(landmark) >= minScore
  );
}

function mediaPipeAverageScore(result?: MediaPipePoseResult) {
  if (!result?.landmarks?.length) return undefined;
  const sum = result.landmarks.reduce((total, landmark) => total + mediaPipeLandmarkScore(landmark), 0);
  return sum / result.landmarks.length;
}

function mediaPipeVisibleCoreCount(result?: MediaPipePoseResult) {
  if (!result?.landmarks?.length) return 0;
  return MEDIAPIPE_CORE_POINTS.filter((index) => mediaPipeLandmarkScore(result.landmarks[index]) >= 0.5).length;
}

function MediaPipeDebugPanel({
  debug,
  frontUri,
  sideUri,
  textColor,
  subColor,
}: {
  debug: MediaPipeComparisonDebug;
  frontUri: string | null;
  sideUri: string | null;
  textColor: string;
  subColor: string;
}) {
  const subtitle =
    debug.usage === 'primary'
      ? 'Android used MediaPipe as the primary pose source for this scan. This panel shows the raw 33-landmark output.'
      : debug.usage === 'mixed-fallback'
        ? 'MediaPipe was attempted for this scan, but at least one image fell back to MoveNet. This panel shows the raw MediaPipe output when available.'
        : 'Debug-only comparison. These landmarks do not change the saved measurements yet.';

  return (
    <View style={styles.debugBlock}>
      <Text style={[styles.debugTitle, { color: textColor }]}>MediaPipe Pose Landmarker</Text>
      <Text style={[styles.debugMeta, { color: subColor, marginTop: 0 }]}>{subtitle}</Text>
      {debug.error ? <Text style={[styles.debugMeta, { color: '#ffb74d' }]}>MediaPipe error: {debug.error}</Text> : null}
      <DiagnosticGrid
        values={[
          ['Front landmarks', debug.front ? `${debug.front.landmarks.length} pts | ${debug.front.poseCount ?? 0} pose` : '--'],
          ['Side landmarks', debug.side ? `${debug.side.landmarks.length} pts | ${debug.side.poseCount ?? 0} pose` : '--'],
          ['Front score', formatDebugValue(mediaPipeAverageScore(debug.front), '', 2)],
          ['Side score', formatDebugValue(mediaPipeAverageScore(debug.side), '', 2)],
          ['Front core', debug.front ? `${mediaPipeVisibleCoreCount(debug.front)}/${MEDIAPIPE_CORE_POINTS.length} pts` : '--'],
          ['Side core', debug.side ? `${mediaPipeVisibleCoreCount(debug.side)}/${MEDIAPIPE_CORE_POINTS.length} pts` : '--'],
          ['Front time', debug.front?.inferenceMs == null ? '--' : `${debug.front.inferenceMs} ms`],
          ['Side time', debug.side?.inferenceMs == null ? '--' : `${debug.side.inferenceMs} ms`],
        ]}
        textColor={textColor}
        subColor={subColor}
      />
      {frontUri && debug.front ? (
        <MediaPipePoseOverlay title="MediaPipe front photo" uri={frontUri} result={debug.front} textColor={textColor} subColor={subColor} />
      ) : null}
      {sideUri && debug.side ? (
        <MediaPipePoseOverlay title="MediaPipe side photo" uri={sideUri} result={debug.side} textColor={textColor} subColor={subColor} />
      ) : null}
    </View>
  );
}

function MediaPipePoseOverlay({
  title,
  uri,
  result,
  textColor,
  subColor,
}: {
  title: string;
  uri: string;
  result: MediaPipePoseResult;
  textColor: string;
  subColor: string;
}) {
  const point = (index: number) => result.landmarks[index];
  const aspectRatio = result.imageWidth > 0 && result.imageHeight > 0 ? result.imageWidth / result.imageHeight : 1;
  const line = (a: number, b: number, color: string) => {
    const pa = point(a);
    const pb = point(b);
    if (!mediaPipeLandmarkIsDrawable(pa) || !mediaPipeLandmarkIsDrawable(pb)) return null;
    return <Line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={color} strokeWidth={0.006} />;
  };

  return (
    <View style={styles.debugBlock}>
      <Text style={[styles.debugTitle, { color: textColor }]}>{title}</Text>
      <View style={[styles.debugImageWrap, { aspectRatio }]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          {MEDIAPIPE_POSE_CONNECTIONS.map(([a, b, color]) => line(a, b, color))}
          {MEDIAPIPE_DEBUG_POINTS.map((index) => {
            const p = point(index);
            if (!mediaPipeLandmarkIsDrawable(p, 0.05)) return null;
            const score = mediaPipeLandmarkScore(p);
            return (
              <Circle
                key={index}
                cx={p.x}
                cy={p.y}
                r={0.011}
                fill={score >= 0.5 ? BRAND : '#ffb74d'}
                opacity={score >= 0.2 ? 0.95 : 0.35}
              />
            );
          })}
        </Svg>
      </View>
      <Text style={[styles.debugMeta, { color: subColor }]}>
        Yellow: shoulders. Blue: hips. Green: torso, arms, legs. Orange points are lower visibility.
      </Text>
    </View>
  );
}

function SegmentationDebugPanel({
  debug,
  frontUri,
  sideUri,
  scaleCmPerPx,
  textColor,
  subColor,
}: {
  debug: BodySegmentationDebug;
  frontUri: string | null;
  sideUri: string | null;
  scaleCmPerPx?: number;
  textColor: string;
  subColor: string;
}) {
  return (
    <View style={styles.segmentationPanel}>
      <Text style={[styles.debugTitle, { color: textColor }]}>Segmentation mask candidates</Text>
      <Text style={[styles.debugMeta, { color: subColor }]}>
        {debug.model} | {debug.output}
      </Text>
      {debug.error ? <Text style={[styles.debugMeta, { color: '#ffb74d' }]}>Segmentation error: {debug.error}</Text> : null}
      {frontUri && debug.front ? (
        <SegmentationImagePanel
          title="Front masks"
          uri={frontUri}
          image={debug.front}
          scaleCmPerPx={scaleCmPerPx}
          textColor={textColor}
          subColor={subColor}
        />
      ) : null}
      {sideUri && debug.side ? (
        <SegmentationImagePanel
          title="Side masks"
          uri={sideUri}
          image={debug.side}
          scaleCmPerPx={scaleCmPerPx}
          textColor={textColor}
          subColor={subColor}
        />
      ) : null}
    </View>
  );
}

function SegmentationImagePanel({
  title,
  uri,
  image,
  scaleCmPerPx,
  textColor,
  subColor,
}: {
  title: string;
  uri: string;
  image: SegmentationImageDebug;
  scaleCmPerPx?: number;
  textColor: string;
  subColor: string;
}) {
  const bodyMaskRows =
    image.bodyMask?.lines.map((line) => {
      const cm = scaleCmPerPx == null ? '--' : `${(line.widthImagePx * scaleCmPerPx).toFixed(1)} cm`;
      return [`Clean ${line.label}`, `${line.widthImagePx.toFixed(1)} px | ${cm} | ${line.segmentCount} seg`] as [string, string];
    }) ?? [];
  const bodyMaskMeta = image.bodyMask
    ? `Class ${image.bodyMask.classIndex} cleanup: raw ${Math.round(image.bodyMask.rawCoverage * 100)}%, main blob ${Math.round(
        image.bodyMask.cleanedCoverage * 100,
      )}%`
    : null;

  return (
    <View style={styles.debugBlock}>
      <Text style={[styles.debugTitle, { color: textColor }]}>{title}</Text>
      {bodyMaskMeta ? <Text style={[styles.debugMeta, { color: subColor, marginBottom: 8 }]}>{bodyMaskMeta}</Text> : null}
      {bodyMaskRows.length ? <DiagnosticGrid values={bodyMaskRows} textColor={textColor} subColor={subColor} /> : null}
      <DiagnosticGrid
        values={image.classes.map((entry) => [`Class ${entry.classIndex}`, `${Math.round(entry.coverage * 100)}%`])}
        textColor={textColor}
        subColor={subColor}
      />
      <View style={styles.maskGrid}>
        {image.classes.map((entry) => (
          <View key={entry.classIndex} style={styles.maskPreview}>
            <Text style={[styles.maskTitle, { color: textColor }]}>Class {entry.classIndex}</Text>
            <View style={[styles.maskImageWrap, { aspectRatio: image.originalWidth / image.originalHeight }]}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <Svg width="100%" height="100%" viewBox={`0 0 ${image.sampleSize} ${image.sampleSize}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                {image.classCells.map((classIndex, cellIndex) => {
                  if (classIndex !== entry.classIndex) return null;
                  const x = cellIndex % image.sampleSize;
                  const y = Math.floor(cellIndex / image.sampleSize);
                  return <Rect key={cellIndex} x={x} y={y} width={1} height={1} fill="rgba(132,196,65,0.48)" />;
                })}
                {entry.classIndex === image.bodyMask?.classIndex
                  ? image.bodyMask.lines.map((line) => (
                      <Line
                        key={line.label}
                        x1={(line.leftX ?? 0) * image.sampleSize}
                        y1={line.y * image.sampleSize}
                        x2={(line.rightX ?? 0) * image.sampleSize}
                        y2={line.y * image.sampleSize}
                        stroke="rgba(255,210,80,0.95)"
                        strokeWidth={0.5}
                      />
                    ))
                  : null}
              </Svg>
            </View>
            <Text style={[styles.maskMeta, { color: subColor }]}>
              {Math.round(entry.coverage * 100)}% cover | score {entry.meanScore.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
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
  cameraWarn: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 118,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,180,100,0.55)',
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  cameraWarnTxt: { color: '#ffb74d', fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), lineHeight: 18 },
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
  qualityList: { marginTop: 10, gap: 6 },
  qualityItem: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), lineHeight: 18 },
  trustBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  trustLabel: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(15), flex: 1 },
  trustConfidence: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12) },
  trustMessage: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), lineHeight: 19, marginTop: 8 },
  editCard: {
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  editTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16) },
  editHelp: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), lineHeight: 19, marginTop: 6 },
  editGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  editField: { width: '47%' },
  editLabel: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12), marginBottom: 6 },
  editInputWrap: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  editInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(16),
  },
  editUnit: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12), marginLeft: 6 },
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
  scanLogBar: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  scanLogTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    marginBottom: 2,
  },
  scanLogHint: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    lineHeight: 16,
  },
  scanLogActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scanLogButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  scanLogButtonTxt: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(13),
  },
  logModalRoot: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 54 : 28,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  logModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  logModalTitle: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
  },
  logModalHint: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    marginBottom: 10,
  },
  logModalScroll: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
  },
  logModalText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: getResponsiveFontSize(12),
    lineHeight: 18,
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
  segmentationPanel: {
    marginTop: 8,
    marginBottom: 10,
  },
  maskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  maskPreview: {
    width: '48%',
    marginBottom: 8,
  },
  maskTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(12), marginBottom: 6 },
  maskImageWrap: { width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#111' },
  maskMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), lineHeight: 15, marginTop: 5 },
  diagnosticGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  diagnosticItem: {
    width: '48%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(132,196,65,0.18)',
    padding: 8,
  },
  diagnosticLabel: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), marginBottom: 3 },
  diagnosticValue: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(12) },
});
