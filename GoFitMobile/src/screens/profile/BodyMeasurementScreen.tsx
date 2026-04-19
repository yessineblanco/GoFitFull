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
} from '@/services/bodyMeasurementService';
import { analyzeBodySegmentation, type BodySegmentationDebug, type SegmentationImageDebug } from '@/services/bodySegmentationService';
import { BodyGuideOverlay } from '@/components/shared/BodyGuideOverlay';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getGlassBg, getGlassBorder, getTextColor } from '@/utils/colorUtils';

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
  const [segmentationDebug, setSegmentationDebug] = useState<BodySegmentationDebug | null>(null);
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
  const segmentationWarnings = getSegmentationGeometryWarnings(segmentationDebug);
  const plausibilityWarnings = getMeasurementPlausibilityWarnings(result);
  const scanWarnings = [...segmentationWarnings, ...plausibilityWarnings];
  const blockingScanWarnings = scanWarnings.filter((warning) => warning.severity === 'blocking');

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
        setSegmentationDebug(null);
        try {
          const res = await analyzeMeasurements({
            frontImageUri: frontUri,
            sideImageUri: photo.uri,
            heightCm,
          });
          let finalResult = res;
          try {
            const segmentation = await analyzeBodySegmentation({
              frontImageUri: frontUri,
              sideImageUri: photo.uri,
              frontPose: res.debug?.front,
              sidePose: res.debug?.side,
            });
            setSegmentationDebug(segmentation);
            finalResult = measurementResultFromSegmentation(res, segmentation) ?? res;
          } catch (segmentationError) {
            setSegmentationDebug({
              model: 'selfie_multiclass_256x256.tflite',
              input: 'FLOAT32 [1, 256, 256, 3], RGB normalized 0..1',
              output: 'FLOAT32 [1, 256, 256, 6], argmax class preview',
              error: segmentationError instanceof Error ? segmentationError.message : String(segmentationError),
            });
          }
          setResult(finalResult);
          setEditedMeasurements(measurementResultToEditable(finalResult));
          setPhase('result');
          Haptics.notificationAsync(
            finalResult.error ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
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
    const warnings = [...getSegmentationGeometryWarnings(segmentationDebug), ...getMeasurementPlausibilityWarnings(result)];
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
      setResult(null);
      setSegmentationDebug(null);
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
    setSegmentationDebug(null);
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
            <Text style={styles.bannerTxt}>
              {phase === 'front'
                ? '1/2 Front photo: fit head and feet inside the guide'
                : '2/2 Side photo: turn sideways, same distance'}
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
          <ResultTrustBanner
            state={getResultTrustState(result, scanWarnings)}
            confidence={result.confidence}
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

function measurementResultFromSegmentation(
  base: MeasurementResult,
  segmentation: BodySegmentationDebug,
): MeasurementResult | null {
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

  const chest = roundMeasurement(ellipseCircumference(frontChest, sideChest));
  const waist = roundMeasurement(ellipseCircumference(frontWaist, sideWaist));
  const hip = roundMeasurement(ellipseCircumference(frontHip, sideHip));
  const shoulderFallback = base.debug?.formula?.rawShoulderCm ?? base.shoulder_cm;
  const shoulder = roundMeasurement(shoulderFallback >= 25 && shoulderFallback <= 100 ? shoulderFallback : frontChest * 1.45);

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
        <Text style={[styles.trustConfidence, { color: subColor }]}>Confidence {confidence.toFixed(2)}</Text>
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
