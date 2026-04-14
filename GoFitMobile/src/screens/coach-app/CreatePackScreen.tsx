import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { usePacksStore } from '@/store/packsStore';
import { useCoachStore } from '@/store/coachStore';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const PRIMARY_GREEN = '#B4F04E';

export const CreatePackScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { profile } = useCoachStore();
  const { createPack } = usePacksStore();

  const [name, setName] = useState('');
  const [sessionCount, setSessionCount] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = name.trim().length > 0 && parseInt(sessionCount) > 0 && parseFloat(price) > 0;

  const handleSave = async () => {
    if (!isValid || !profile?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await createPack({
        coach_id: profile.id,
        name: name.trim(),
        session_count: parseInt(sessionCount),
        price: parseFloat(price),
        description: description.trim() || undefined,
      });
      dialogManager.success(t('common.success'), t('sessionPacks.packCreated'));
      navigation.goBack();
    } catch {
      dialogManager.error(t('common.error'), t('sessionPacks.failedToCreatePack'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('sessionPacks.createPack')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={!isValid || saving} style={[styles.saveButton, (!isValid || saving) && styles.saveButtonDisabled]}>
          <Check size={22} color={isValid && !saving ? '#000000' : 'rgba(0,0,0,0.3)'} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.form} contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('sessionPacks.packName')}</Text>
            <TextInput style={[styles.input, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={name} onChangeText={setName} placeholder="e.g. Starter Pack" placeholderTextColor={colors.textLight} />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('sessionPacks.sessionCount')}</Text>
              <TextInput style={[styles.input, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={sessionCount} onChangeText={setSessionCount} keyboardType="number-pad" placeholder="5" placeholderTextColor={colors.textLight} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('sessionPacks.price')} (EUR)</Text>
              <TextInput style={[styles.input, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="49.99" placeholderTextColor={colors.textLight} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('sessionPacks.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('sessionPacks.packDescPlaceholder')}
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {isValid && (
            <View style={styles.preview}>
              <Text style={[styles.previewTitle, { color: colors.textLight }]}>{t('sessionPacks.preview')}</Text>
              <View style={styles.previewCard}>
                <Text style={[styles.previewName, { color: colors.text }]}>{name}</Text>
                <Text style={[styles.previewSessions, { color: colors.textSecondary }]}>{sessionCount} {t('sessionPacks.sessions')}</Text>
                <Text style={styles.previewPrice}>€{parseFloat(price || '0').toFixed(2)}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: '#FFFFFF', textAlign: 'center' },
  saveButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: PRIMARY_GREEN, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { backgroundColor: 'rgba(180,240,78,0.3)' },
  form: { flex: 1, paddingHorizontal: 20 },
  formContent: { paddingTop: 20 },
  field: { marginBottom: 20 },
  label: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.6)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', padding: 14, fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(15), color: '#FFFFFF',
  },
  textArea: { minHeight: 100 },
  row: { flexDirection: 'row', gap: 12 },
  preview: { marginTop: 20 },
  previewTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
  previewCard: {
    backgroundColor: 'rgba(180,240,78,0.06)', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(180,240,78,0.15)', padding: 20, alignItems: 'center', gap: 6,
  },
  previewName: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  previewSessions: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.6)' },
  previewPrice: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(28), color: PRIMARY_GREEN, marginTop: 8 },
});
