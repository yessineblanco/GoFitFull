import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, ChevronLeft, TrendingUp, Edit3, Trash2, Calendar, Ruler, Images } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useBodyMeasurementsStore } from '@/stores/bodyMeasurementsStore';
import { useProfileStore } from '@/store/profileStore';
import { getResponsiveFontSize } from '@/utils/responsive';
import type { BodyMeasurement, MeasurementInput } from '@/services/bodyMeasurements';
import type { UserProfile } from '@/services/userProfile';
import { prepareBodyScanImageBase64 } from '@/utils/bodyScanImage';

const BRAND = '#84c441';
const BG = '#030303';
const GLASS: View['props']['style'] = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.06)',
};

const FIELDS: { key: keyof MeasurementInput; label: string; grid: string }[] = [
  { key: 'height_cm', label: 'Height', grid: 'Height' },
  { key: 'shoulder_width', label: 'Shoulders', grid: 'Shoulders' },
  { key: 'chest', label: 'Chest', grid: 'Chest' },
  { key: 'waist', label: 'Waist', grid: 'Waist' },
  { key: 'hips', label: 'Hips', grid: 'Hips' },
    { key: 'left_arm', label: 'Left arm', grid: 'L. Arm' },
  { key: 'right_arm', label: 'Right arm', grid: 'R. Arm' },
  { key: 'left_thigh', label: 'Left thigh', grid: 'L. Thigh' },
  { key: 'right_thigh', label: 'Right thigh', grid: 'R. Thigh' },
];

const fmtCm = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? '—' : `${Math.round(v * 10) / 10}`;

const fmtDate = (m: BodyMeasurement) => {
  const raw = m.measurement_date || m.created_at;
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return raw;
  }
};

const heightCmFromProfile = (p: UserProfile | null) =>
  p?.height && p.height > 0 ? p.height : null;

/** Sanity ranges (cm) for manual entry — aligned loosely with edge function / plausible adults */
const MANUAL_LIMITS: Partial<Record<keyof MeasurementInput, { min: number; max: number }>> = {
  height_cm: { min: 80, max: 280 },
  shoulder_width: { min: 20, max: 90 },
  chest: { min: 50, max: 220 },
  waist: { min: 45, max: 200 },
  hips: { min: 50, max: 220 },
  left_arm: { min: 15, max: 80 },
  right_arm: { min: 15, max: 80 },
  left_thigh: { min: 25, max: 120 },
  right_thigh: { min: 25, max: 120 },
};

const SourceBadge = ({ source, sm }: { source: 'ai' | 'manual'; sm?: boolean }) => {
  const ai = source === 'ai';
  return (
    <View style={[sm ? S.bSm : S.badge, { backgroundColor: ai ? 'rgba(132,196,65,0.18)' : 'rgba(255,255,255,0.08)' }]}>
      <Text style={[sm ? S.bSmT : S.badgeT, { color: ai ? BRAND : 'rgba(255,255,255,0.65)' }]}>{ai ? 'AI' : 'Manual'}</Text>
    </View>
  );
};

export default function BodyMeasurementsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { profile, loadProfile } = useProfileStore();
  const { history, latest, isLoading, isAnalyzing, error, refresh, analyzePhoto, saveManual, deleteMeasurement } =
    useBodyMeasurementsStore();
  const [manualOpen, setManualOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const heightCm = useMemo(() => heightCmFromProfile(profile), [profile]);

  useEffect(() => {
    refresh();
    loadProfile();
  }, [refresh, loadProfile]);

  const openManual = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next: Record<string, string> = {};
    FIELDS.forEach(({ key }) => {
      next[key] = key === 'height_cm' && heightCm != null ? String(heightCm) : '';
    });
    setDraft(next);
    setManualOpen(true);
  };

  const runAnalyzePipeline = useCallback(
    async (uri: string, width?: number | null, height?: number | null) => {
      if (heightCm == null) return;
      try {
        const b64 = await prepareBodyScanImageBase64(uri, { width, height });
        await analyzePhoto(b64, heightCm);
        if (useBodyMeasurementsStore.getState().error == null) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Photo', e instanceof Error ? e.message : 'Could not prepare image.');
      }
    },
    [heightCm, analyzePhoto],
  );

  const openCameraForScan = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera', 'Camera access is needed for an AI scan.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1, base64: false });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;
    await runAnalyzePipeline(asset.uri, asset.width, asset.height);
  }, [runAnalyzePipeline]);

  const openLibraryForScan = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Photo library access is needed to choose a full-body picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      base64: false,
      mediaTypes: ['images'],
      allowsEditing: false,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;
    await runAnalyzePipeline(asset.uri, asset.width, asset.height);
  }, [runAnalyzePipeline]);

  const runAiScan = useCallback(() => {
    if (heightCm == null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('AI scan', 'Use a full-body photo (head to feet), good light, one person.', [
      { text: 'Take photo', onPress: () => void openCameraForScan() },
      { text: 'Choose from library', onPress: () => void openLibraryForScan() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [heightCm, openCameraForScan, openLibraryForScan]);

  const submitManual = async () => {
    const input: MeasurementInput = {};
    const violations: string[] = [];
    FIELDS.forEach(({ key, label }) => {
      const raw = draft[key]?.trim();
      if (!raw) return;
      const n = parseFloat(raw.replace(',', '.'));
      if (Number.isNaN(n) || n <= 0) {
        violations.push(`${label}: invalid number`);
        return;
      }
      const lim = MANUAL_LIMITS[key];
      if (lim && (n < lim.min || n > lim.max)) {
        violations.push(`${label}: use ${lim.min}–${lim.max} cm`);
        return;
      }
      input[key] = n;
    });
    if (violations.length > 0) {
      Alert.alert('Measurements', violations.slice(0, 4).join('\n'));
      return;
    }
    if (Object.keys(input).length === 0) {
      Alert.alert('Measurements', 'Enter at least one value in centimeters.');
      return;
    }
    if (input.height_cm == null && heightCm != null) {
      input.height_cm = heightCm;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const record = await saveManual(input);
    if (record) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setManualOpen(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const onDelete = (id: string) => {
    Alert.alert('Delete measurement', 'Remove this entry from your history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await deleteMeasurement(id);
        },
      },
    ]);
  };

  const goSetHeight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Profile', { screen: 'EditWeightHeight' });
  };

  const gridRow = (m: BodyMeasurement, slice: typeof FIELDS) => (
    <View style={S.gridRow}>
      {slice.map(({ key, grid }) => {
        const cellLabel =
          key === 'height_cm' && m.source === 'ai' ? 'Profile height' : grid;
        return (
          <View key={key} style={[S.cell, GLASS]}>
            <Text style={S.cellVal}>{fmtCm(m[key] as number | null)}</Text>
            <Text style={S.cellUnit}>cm</Text>
            <Text style={S.cellLbl}>{cellLabel}</Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={S.root}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading && !isAnalyzing} onRefresh={refresh} tintColor={BRAND} colors={[BRAND]} />
        }
      >
        <View style={S.headerRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            style={S.backBtn}
            hitSlop={12}
          >
            <ChevronLeft size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={S.headerTitle}>Body Measurements</Text>
          <View style={{ width: 40 }} />
        </View>

        {heightCm == null ? (
          <View style={[S.banner, GLASS]}>
            <Text style={S.bannerTitle}>Add your height</Text>
            <Text style={S.bannerText}>
              AI estimates use your profile height as a ruler — height is not detected from the photo. Set it in your
              profile to continue.
            </Text>
            <TouchableOpacity onPress={goSetHeight} activeOpacity={0.85} style={{ borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient colors={['#6da835', BRAND]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.ctaGrad}>
                <Text style={S.ctaTxt}>Set height</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}

        {error ? (
          <View style={[S.err, GLASS]}>
            <Text style={S.errTxt}>{error}</Text>
          </View>
        ) : null}

        {latest ? (
          <View style={[S.latest, GLASS]}>
            <View style={S.latestHead}>
              <View style={S.rowGap}>
                <TrendingUp size={20} color={BRAND} />
                <Text style={S.secLbl}>Latest</Text>
              </View>
              <SourceBadge source={latest.source} />
            </View>
            {gridRow(latest, FIELDS.slice(0, 4))}
            {gridRow(latest, FIELDS.slice(4, 8))}
            {gridRow(latest, FIELDS.slice(8, 9))}
            {latest.source === 'ai' ? (
              <Text style={S.aiDisclaimer}>
                Profile height scales the estimate. Other numbers are approximate from your photo — not clinical
                measurements. Use a full-body shot (head to feet); face-only photos are rejected.
              </Text>
            ) : null}
            <View style={[S.rowGap, { marginTop: 14 }]}>
              <Calendar size={14} color="rgba(255,255,255,0.4)" />
              <Text style={S.dateSub}>{fmtDate(latest)}</Text>
            </View>
          </View>
        ) : null}

        {heightCm != null ? (
          <Text style={S.scanHint}>
            Stand far enough that your whole body is in frame, good light, one person. You can take a new photo or pick
            one from your library. The scan estimates circumferences from the image; it does not measure height from the
            picture.
          </Text>
        ) : null}

        <View style={S.actionsRow}>
          <TouchableOpacity
            style={[S.flex1, !heightCm && { opacity: 0.85 }]}
            onPress={runAiScan}
            activeOpacity={0.88}
            disabled={!heightCm || isAnalyzing}
          >
            <LinearGradient
              colors={heightCm ? ['#6da835', BRAND] : ['#333', '#2a2a2a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={S.aiInner}
            >
              <Camera size={20} color={heightCm ? '#0a0a0a' : 'rgba(255,255,255,0.35)'} />
              <Text style={[S.aiLbl, !heightCm && { color: 'rgba(255,255,255,0.35)' }]}>AI Scan</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.flex1, !heightCm && { opacity: 0.85 }]}
            onPress={openLibraryForScan}
            activeOpacity={0.88}
            disabled={!heightCm || isAnalyzing}
          >
            <View style={[S.libraryInner, GLASS, !heightCm && { opacity: 0.7 }]}>
              <Images size={20} color="#fff" />
              <Text style={S.manLbl}>Library</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[S.flex1, S.manual, GLASS]} onPress={openManual} activeOpacity={0.88}>
            <Edit3 size={20} color="#fff" />
            <Text style={S.manLbl}>Manual</Text>
          </TouchableOpacity>
        </View>

        <View style={S.histHead}>
          <View style={S.rowGap}>
            <Ruler size={18} color={BRAND} />
            <Text style={S.histTitle}>History</Text>
          </View>
          {isLoading && !isAnalyzing ? <ActivityIndicator size="small" color={BRAND} /> : null}
        </View>

        {history.length === 0 ? (
          <View style={[S.empty, GLASS]}>
            <Text style={S.emptyTxt}>No measurements yet. Take your first AI scan!</Text>
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id} style={[S.hRow, GLASS]}>
              <View style={{ flex: 1 }}>
                <View style={S.rowGap}>
                  <Text style={S.hDate}>{fmtDate(item)}</Text>
                  <SourceBadge source={item.source} sm />
                </View>
                <Text style={S.hVals}>
                  {item.height_cm != null ? `Hgt ${fmtCm(item.height_cm)} · ` : ''}
                  Chest {fmtCm(item.chest)} · Waist {fmtCm(item.waist)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onDelete(item.id)} style={{ padding: 8 }} hitSlop={10}>
                <Trash2 size={18} color="rgba(255,80,80,0.85)" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {isAnalyzing ? (
        <View style={S.ov}>
          <View style={[S.ovCard, GLASS]}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={S.ovTxt}>Checking the photo and estimating…</Text>
          </View>
        </View>
      ) : null}

      <Modal visible={manualOpen} animationType="slide" transparent onRequestClose={() => setManualOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[S.absFill, { zIndex: 0 }]} onPress={() => setManualOpen(false)} />
          <View style={[S.sheet, GLASS, { zIndex: 1 }]}>
            <Text style={S.modalTitle}>Manual entry</Text>
            <Text style={S.modalHint}>All values in centimeters</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {FIELDS.map(({ key, label }) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={S.inLbl}>{label}</Text>
                  <View style={[S.inWrap, GLASS]}>
                    <TextInput
                      style={S.in}
                      value={draft[key] ?? ''}
                      onChangeText={(t) => setDraft((d) => ({ ...d, [key]: t }))}
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      keyboardType="decimal-pad"
                    />
                    <Text style={S.inSuf}>cm</Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity onPress={submitManual} activeOpacity={0.9} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
                <LinearGradient colors={['#6da835', BRAND]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.saveBtn}>
                  <Text style={S.saveTxt}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: insets.bottom + 12 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: '#fff' },
  banner: { padding: 16, marginBottom: 14 },
  bannerTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), color: '#fff', marginBottom: 6 },
  bannerText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 20,
    marginBottom: 12,
  },
  ctaGrad: { paddingHorizontal: 18, paddingVertical: 10 },
  ctaTxt: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: '#0a0a0a' },
  err: { padding: 12, marginBottom: 12 },
  errTxt: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), color: '#ff8a80' },
  scanHint: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 18,
    marginBottom: 12,
  },
  aiDisclaimer: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 16,
    marginTop: 10,
  },
  latest: { padding: 16, marginBottom: 16 },
  latestHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secLbl: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeT: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(11) },
  bSm: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bSmT: { fontFamily: 'Barlow_600SemiBold', fontSize: 10 },
  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  cell: { flex: 1, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center' },
  cellVal: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(15), color: '#fff' },
  cellUnit: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(10), color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  cellLbl: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(10),
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
    textAlign: 'center',
  },
  dateSub: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.45)' },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  flex1: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  aiInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  aiLbl: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15), color: '#0a0a0a' },
  libraryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  manual: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  manLbl: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15), color: '#fff' },
  histHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  histTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(17), color: '#fff' },
  empty: { padding: 22, alignItems: 'center' },
  emptyTxt: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  hRow: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 },
  hDate: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: '#fff' },
  hVals: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  ov: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  ovCard: { padding: 28, alignItems: 'center', minWidth: 220 },
  ovTxt: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255,255,255,0.85)',
    marginTop: 16,
    textAlign: 'center',
  },
  absFill: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '88%', paddingHorizontal: 18, paddingTop: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: '#fff' },
  modalHint: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 14,
    marginTop: 4,
  },
  inLbl: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.65)', marginBottom: 6 },
  inWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12 },
  in: { flex: 1, fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), color: '#fff', paddingVertical: 12 },
  inSuf: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.35)' },
  saveBtn: { paddingVertical: 14, alignItems: 'center' },
  saveTxt: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), color: '#0a0a0a' },
});
