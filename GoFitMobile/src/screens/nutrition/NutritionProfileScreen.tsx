import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useThemeStore } from '@/store/themeStore';
import { userProfileService } from '@/services/userProfile';
import type { UserProfile } from '@/services/userProfile';
import type { ProgressStackParamList } from '@/types';
import { getBackgroundColor, getGlassBg, getGlassBorder, getTextColor } from '@/utils/colorUtils';
import { getResponsiveFontSize } from '@/utils/responsive';

const fields = [
  { key: 'dietary_preferences', label: 'Dietary Preferences', placeholder: 'e.g. Vegan, Keto, Paleo' },
  { key: 'food_allergies', label: 'Food Allergies', placeholder: 'e.g. Peanuts, Shellfish, Gluten' },
  { key: 'food_dislikes', label: 'Foods You Dislike', placeholder: 'e.g. Mushrooms, Olives, Cilantro' },
] as const;
type NutritionField = typeof fields[number]['key'];
type Draft = Record<NutritionField, string>;

export default function NutritionProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<ProgressStackParamList, 'NutritionProfile'>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { updateProfile } = useProfileStore();
  const { isDark } = useThemeStore();
  const [initial, setInitial] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = getTextColor(isDark);
  const sub = isDark ? '#b5b5b5' : '#555b63';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInitial(null);
    setDraft(null);
    try {
      if (!user?.id) throw new Error('Not signed in');
      const profile = await userProfileService.getUserProfile(user.id);
      if (!profile) throw new Error('Profile unavailable');
      const values: Draft = {
        dietary_preferences: (profile.dietary_preferences || []).join(', '),
        food_allergies: (profile.food_allergies || []).join(', '),
        food_dislikes: (profile.food_dislikes || []).join(', '),
      };
      setInitial(values);
      setDraft(values);
    } catch {
      setError('Unable to load your nutrition profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!initial || !draft || loading || saving || !user?.id) return;
    const updates: Partial<UserProfile> = {};
    for (const { key } of fields) {
      if (draft[key] !== initial[key]) {
        updates[key] = draft[key].split(',').map(value => value.trim()).filter(Boolean);
      }
    }
    setSaving(true);
    setError(null);
    try {
      if (Object.keys(updates).length) await updateProfile(updates);
      navigation.goBack();
    } catch {
      setError('Unable to save your nutrition profile. Your changes are still here; please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: getBackgroundColor(isDark) }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 18 }}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Back" disabled={saving} onPress={() => navigation.goBack()} style={styles.back}>
          <ChevronLeft size={26} color={text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: text }]}>Nutrition Profile</Text>
      </View>
      <Text style={[styles.hint, { color: sub }]}>Separate preferences, allergies and disliked foods with commas.</Text>
      {loading ? <ActivityIndicator color="#84c441" /> : null}
      {draft && fields.map(({ key, label, placeholder }) => (
        <View key={key} style={styles.field}>
          <Text style={[styles.label, { color: text }]}>{label}</Text>
          <TextInput accessibilityLabel={label} value={draft[key]} editable={!saving}
            onChangeText={value => setDraft(current => current && ({ ...current, [key]: value }))}
            placeholder={placeholder} placeholderTextColor={sub}
            style={[styles.input, { color: text, backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]} />
        </View>
      ))}
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: isDark ? '#fca5a5' : '#b91c1c' }]}>{error}</Text> : null}
      {!loading && !draft ? <TouchableOpacity accessibilityRole="button" onPress={() => void load()} style={styles.button}>
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity> : null}
      <TouchableOpacity accessibilityRole="button" disabled={loading || saving || !draft} onPress={() => void save()}
        style={[styles.button, { opacity: loading || saving || !draft ? 0.5 : 1 }]}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save preferences'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: { width: 42, height: 42, justifyContent: 'center' },
  title: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20) },
  hint: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), marginBottom: 20 },
  field: { marginBottom: 18 },
  label: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(14), marginBottom: 6 },
  input: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(16), padding: 14, borderWidth: 1, borderRadius: 14 },
  error: { marginBottom: 16, fontSize: getResponsiveFontSize(14) },
  button: { backgroundColor: '#84c441', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#0a0a0a', fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16) },
});
