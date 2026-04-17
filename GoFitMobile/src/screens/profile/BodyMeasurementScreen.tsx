import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/config/supabase';
import { useProfileStore } from '@/store/profileStore';
import { analyzeMeasurements, type MeasurementResult } from '@/services/bodyMeasurementService';
import { BodyGuideOverlay } from '@/components/shared/BodyGuideOverlay';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getGlassBg, getGlassBorder, getTextColor } from '@/utils/colorUtils';

const BRAND = '#84c441';

type Phase = 'intro' | 'front' | 'side' | 'analyze' | 'result';

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
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [saving, setSaving] = useState(false);

  const heightCm = profile?.height && profile.height > 0 ? profile.height : null;

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const bg = getBackgroundColor(isDark);
  const text = getTextColor(isDark);
  const sub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const glass = getGlassBg(isDark);
  const border = getGlassBorder(isDark);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92 });
      if (!photo?.uri) return;
      if (phase === 'front') {
        setFrontUri(photo.uri);
        setPhase('side');
        setCameraReady(false);
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
      Alert.alert('Camera', e instanceof Error ? e.message : 'Could not capture photo.');
    }
  }, [phase, cameraReady, frontUri, heightCm]);

  const saveToSupabase = async () => {
    if (!result || heightCm == null) return;
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
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
    setPhase(next);
    setCameraReady(false);
  };

  const resetFlow = () => {
    setFrontUri(null);
    setSideUri(null);
    setResult(null);
    setPhase('intro');
    setCameraReady(false);
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
            We use MoveNet on your phone to estimate chest, waist, hip, and shoulder circumference from a{' '}
            <Text style={{ color: text, fontFamily: 'Barlow_600SemiBold' }}>front</Text> and{' '}
            <Text style={{ color: text, fontFamily: 'Barlow_600SemiBold' }}>side</Text> photo. Photos never leave your device. Results are
            approximate, not clinical.
          </Text>
          <Text style={[styles.p, { color: sub, marginTop: 12 }]}>Using height: {Math.round(heightCm)} cm</Text>
          <TouchableOpacity
            onPress={() => void openCameraPhase('front')}
            style={{ borderRadius: 14, overflow: 'hidden', marginTop: 20 }}
          >
            <LinearGradient colors={['#6da835', BRAND]} style={styles.cta}>
              <Text style={styles.ctaTxt}>Start — front photo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      ) : phase === 'front' || phase === 'side' ? (
        <View style={styles.cameraWrap}>
          <CameraView
            key={phase}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
          />
          <BodyGuideOverlay pose={phase === 'front' ? 'front' : 'side'} />
          <View style={[styles.banner, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Text style={styles.bannerTxt}>
              {phase === 'front' ? 'Full body visible — front facing camera' : 'Turn 90° — profile / side view'}
            </Text>
          </View>
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
          <Text style={[styles.metric, { color: text }]}>Chest: {result.chest_cm} cm</Text>
          <Text style={[styles.metric, { color: text }]}>Waist: {result.waist_cm} cm</Text>
          <Text style={[styles.metric, { color: text }]}>Hip: {result.hip_cm} cm</Text>
          <Text style={[styles.metric, { color: text }]}>Shoulder: {result.shoulder_cm} cm</Text>
          <Text style={[styles.p, { color: sub, marginTop: 8 }]}>Confidence: {result.confidence}</Text>
          <TouchableOpacity
            onPress={() => void saveToSupabase()}
            disabled={saving}
            style={{ borderRadius: 14, overflow: 'hidden', marginTop: 24 }}
          >
            <LinearGradient colors={['#6da835', BRAND]} style={styles.cta}>
              <Text style={styles.ctaTxt}>{saving ? 'Saving…' : 'Save to progress'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetFlow} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: BRAND, fontFamily: 'Barlow_600SemiBold' }}>Start over</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  metric: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), marginTop: 10 },
  warn: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  warnTxt: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), lineHeight: 18 },
});
