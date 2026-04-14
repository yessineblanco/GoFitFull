import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Plus, Trash2, Dumbbell, UtensilsCrossed, Search, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useProgramsStore } from '@/store/programsStore';
import { useCoachStore } from '@/store/coachStore';
import { workoutService, type Exercise } from '@/services/workouts';
import { programsService } from '@/services/programs';
import type { ProgramDay, ProgramExercise, ProgramMeal } from '@/services/programs';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';
import { logger } from '@/utils/logger';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const PRIMARY_GREEN = '#B4F04E';

type ProgramType = 'workout' | 'meal' | 'both';

export const ProgramBuilderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { profile } = useCoachStore();
  const { createProgram, updateProgram } = useProgramsStore();

  const editProgramId: string | undefined = route.params?.programId;
  const preselectedClientId: string | undefined = route.params?.clientId;
  const isEditMode = !!editProgramId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProgramType>('workout');
  const [clientId, setClientId] = useState(preselectedClientId || '');
  const [clients, setClients] = useState<Array<{ client_id: string; display_name: string }>>([]);
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [days, setDays] = useState<ProgramDay[]>([{ day_number: 1, exercises: [], meals: [] }]);
  const [saving, setSaving] = useState(false);
  const [loadingProgram, setLoadingProgram] = useState(false);

  // Exercise picker state
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDayIndex, setPickerDayIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedClientId) setClientId(preselectedClientId);
  }, [preselectedClientId]);

  useEffect(() => {
    const load = async () => {
      try {
        setExercisesLoading(true);
        const data = await workoutService.getExercises();
        setAllExercises(data);
      } catch (error) {
        logger.error('Failed to load exercises:', error);
      } finally {
        setExercisesLoading(false);
      }
    };
    load();
    if (profile?.id) {
      programsService.getCoachClients(profile.id).then(setClients).catch(() => {});
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!editProgramId) return;
    const loadExisting = async () => {
      setLoadingProgram(true);
      try {
        const program = await programsService.getById(editProgramId);
        if (program) {
          setTitle(program.title);
          setDescription(program.description || '');
          setType(program.type);
          setClientId(program.client_id);
          if (Array.isArray(program.program_data) && program.program_data.length > 0) {
            setDays(program.program_data);
          }
        }
      } catch (error) {
        logger.error('Failed to load program for editing:', error);
      } finally {
        setLoadingProgram(false);
      }
    };
    loadExisting();
  }, [editProgramId]);

  const muscleGroups = useMemo(() => {
    const groups = new Set<string>();
    allExercises.forEach((ex) => {
      ex.muscle_groups?.forEach((mg) => groups.add(mg));
    });
    return Array.from(groups).sort();
  }, [allExercises]);

  const filteredExercises = useMemo(() => {
    let result = allExercises;
    if (selectedMuscleGroup) {
      result = result.filter((ex) => ex.muscle_groups?.includes(selectedMuscleGroup));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((ex) => ex.name.toLowerCase().includes(q));
    }
    return result;
  }, [allExercises, selectedMuscleGroup, searchQuery]);

  const isValid = title.trim().length > 0 && clientId.trim().length > 0;

  const addDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDays([...days, { day_number: days.length + 1, exercises: [], meals: [] }]);
  };

  const removeDay = (index: number) => {
    if (days.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDays = days.filter((_, i) => i !== index).map((d, i) => ({ ...d, day_number: i + 1 }));
    setDays(newDays);
  };

  const openExercisePicker = (dayIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerDayIndex(dayIndex);
    setSearchQuery('');
    setSelectedMuscleGroup(null);
    setPickerVisible(true);
  };

  const selectExercise = useCallback((exercise: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newExercise: ProgramExercise = {
      id: exercise.id,
      name: exercise.name,
      sets: exercise.default_sets || 3,
      reps: exercise.default_reps || 10,
      rest_seconds: exercise.default_rest_time || 60,
    };
    setDays((prev) => {
      const newDays = [...prev];
      newDays[pickerDayIndex] = {
        ...newDays[pickerDayIndex],
        exercises: [...(newDays[pickerDayIndex].exercises || []), newExercise],
      };
      return newDays;
    });
    setPickerVisible(false);
  }, [pickerDayIndex]);

  const updateExercise = (dayIndex: number, exIndex: number, field: keyof ProgramExercise, value: any) => {
    const newDays = [...days];
    const exercises = [...(newDays[dayIndex].exercises || [])];
    exercises[exIndex] = { ...exercises[exIndex], [field]: value };
    newDays[dayIndex].exercises = exercises;
    setDays(newDays);
  };

  const removeExercise = (dayIndex: number, exIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].exercises = (newDays[dayIndex].exercises || []).filter((_, i) => i !== exIndex);
    setDays(newDays);
  };

  const addMeal = (dayIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].meals = [...(newDays[dayIndex].meals || []), { name: '', calories: 0, protein: 0, carbs: 0, fat: 0 }];
    setDays(newDays);
  };

  const updateMeal = (dayIndex: number, mealIndex: number, field: keyof ProgramMeal, value: any) => {
    const newDays = [...days];
    const meals = [...(newDays[dayIndex].meals || [])];
    meals[mealIndex] = { ...meals[mealIndex], [field]: value };
    newDays[dayIndex].meals = meals;
    setDays(newDays);
  };

  const removeMeal = (dayIndex: number, mealIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].meals = (newDays[dayIndex].meals || []).filter((_, i) => i !== mealIndex);
    setDays(newDays);
  };

  const handleSave = async () => {
    if (!isValid || !profile?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      if (isEditMode) {
        await updateProgram(editProgramId, {
          title: title.trim(),
          description: description.trim() || undefined,
          program_data: days,
        });
        dialogManager.success(t('common.success'), t('programs.programSaved'));
      } else {
        await createProgram({
          coach_id: profile.id,
          client_id: clientId.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          program_data: days,
        });
        dialogManager.success(t('common.success'), t('programs.programCreated'));
      }
      navigation.goBack();
    } catch {
      dialogManager.error(t('common.error'), isEditMode ? t('programs.failedToUpdateProgram') : t('programs.failedToCreateProgram'));
    } finally {
      setSaving(false);
    }
  };

  const typeOptions: { value: ProgramType; label: string }[] = [
    { value: 'workout', label: t('programs.workout') },
    { value: 'meal', label: t('programs.meal') },
    { value: 'both', label: t('programs.both') },
  ];

  const renderExercisePickerItem = useCallback(({ item }: { item: Exercise }) => (
    <TouchableOpacity style={[styles.pickerItem, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]} onPress={() => selectExercise(item)} activeOpacity={0.7}>
      {item.image_url ? (
        <ExpoImage source={{ uri: item.image_url }} style={styles.pickerItemImage} contentFit="cover" />
      ) : (
        <View style={[styles.pickerItemImagePlaceholder, { backgroundColor: isDark ? 'rgba(180,240,78,0.06)' : 'rgba(132,196,65,0.08)' }]}>
          <Dumbbell size={16} color="rgba(180,240,78,0.4)" />
        </View>
      )}
      <View style={styles.pickerItemInfo}>
        <Text style={[styles.pickerItemName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.pickerItemMeta, { color: colors.textLight }]}>
          {item.muscle_groups?.join(', ') || item.category}
          {item.default_sets ? ` · ${item.default_sets}x${item.default_reps || 10}` : ''}
        </Text>
      </View>
      <Plus size={18} color={PRIMARY_GREEN} />
    </TouchableOpacity>
  ), [selectExercise, isDark, colors]);

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditMode ? t('programs.editProgram') : t('programs.createProgram')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={!isValid || saving} style={[styles.saveButton, (!isValid || saving) && styles.saveButtonDisabled]}>
          <Check size={22} color={isValid && !saving ? '#000000' : 'rgba(0,0,0,0.3)'} />
        </TouchableOpacity>
      </View>

      {loadingProgram ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        </View>
      ) : (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.form} contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('programs.programTitle')}</Text>
            <TextInput style={[styles.input, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={title} onChangeText={setTitle} placeholder={t('programs.programTitlePlaceholder')} placeholderTextColor={colors.textLight} />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('programs.selectClient')}</Text>
            {clients.length > 0 ? (
              <TouchableOpacity style={[styles.input, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]} onPress={() => setClientPickerVisible(true)}>
                <Text style={{ color: clientId ? colors.text : colors.textLight, fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14) }}>
                  {clientId ? clients.find((c) => c.client_id === clientId)?.display_name || clientId : t('programs.selectClient')}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)', fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), paddingVertical: 12 }}>
                {t('programs.noClients')}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('programs.programType')}</Text>
            <View style={styles.typeRow}>
              {typeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.typeChip, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }, type === opt.value && styles.typeChipSelected]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setType(opt.value); }}
                >
                  <Text style={[styles.typeChipText, { color: colors.textSecondary }, type === opt.value && styles.typeChipTextSelected]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('programs.programDescription')}</Text>
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={description} onChangeText={setDescription} placeholder={t('programs.programDescPlaceholder')} placeholderTextColor={colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />
          </View>

          {/* Days */}
          {days.map((day, dayIndex) => (
            <View key={dayIndex} style={[styles.dayCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{t('programs.day')} {day.day_number}</Text>
                {days.length > 1 && (
                  <TouchableOpacity onPress={() => removeDay(dayIndex)}>
                    <Trash2 size={16} color="#EF5350" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Exercises */}
              {(type === 'workout' || type === 'both') && (
                <View style={styles.daySection}>
                  {(day.exercises || []).map((ex, exIdx) => (
                    <View key={exIdx} style={[styles.exerciseRow, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
                      <View style={styles.exHeader}>
                        <Dumbbell size={14} color={PRIMARY_GREEN} />
                        <Text style={[styles.exName, { color: colors.text }]} numberOfLines={1}>{ex.name || t('common.unnamed')}</Text>
                        <TouchableOpacity onPress={() => removeExercise(dayIndex, exIdx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 size={14} color="#EF5350" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.exNumbers}>
                        <View style={styles.exNumField}>
                          <Text style={[styles.exNumLabel, { color: colors.textLight }]}>{t('programs.sets')}</Text>
                          <TextInput style={[styles.smallInput, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={String(ex.sets)} onChangeText={(v) => updateExercise(dayIndex, exIdx, 'sets', parseInt(v) || 0)} keyboardType="number-pad" />
                        </View>
                        <Text style={[styles.exSeparator, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }]}>x</Text>
                        <View style={styles.exNumField}>
                          <Text style={[styles.exNumLabel, { color: colors.textLight }]}>{t('programs.reps')}</Text>
                          <TextInput style={[styles.smallInput, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={String(ex.reps)} onChangeText={(v) => updateExercise(dayIndex, exIdx, 'reps', parseInt(v) || 0)} keyboardType="number-pad" />
                        </View>
                        <View style={styles.exNumField}>
                          <Text style={[styles.exNumLabel, { color: colors.textLight }]}>{t('programs.rest')}</Text>
                          <TextInput style={[styles.smallInput, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={String(ex.rest_seconds)} onChangeText={(v) => updateExercise(dayIndex, exIdx, 'rest_seconds', parseInt(v) || 0)} keyboardType="number-pad" />
                        </View>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addItemBtn} onPress={() => openExercisePicker(dayIndex)}>
                    <Dumbbell size={14} color={PRIMARY_GREEN} />
                    <Text style={styles.addItemText}>{t('programs.addExercise')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Meals */}
              {(type === 'meal' || type === 'both') && (
                <View style={styles.daySection}>
                  {(day.meals || []).map((meal, mealIdx) => (
                    <View key={mealIdx} style={styles.mealRow}>
                      <TextInput style={[styles.input, styles.mealNameInput, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={meal.name} onChangeText={(v) => updateMeal(dayIndex, mealIdx, 'name', v)} placeholder={t('programs.mealName')} placeholderTextColor={colors.textLight} />
                      <View style={styles.macroRow}>
                        <TextInput style={[styles.macroInput, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={String(meal.calories || '')} onChangeText={(v) => updateMeal(dayIndex, mealIdx, 'calories', parseInt(v) || 0)} keyboardType="number-pad" placeholder={t('programs.calShort')} placeholderTextColor={colors.textLight} />
                        <TextInput style={[styles.macroInput, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={String(meal.protein || '')} onChangeText={(v) => updateMeal(dayIndex, mealIdx, 'protein', parseInt(v) || 0)} keyboardType="number-pad" placeholder={t('programs.proteinShort')} placeholderTextColor={colors.textLight} />
                        <TextInput style={[styles.macroInput, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={String(meal.carbs || '')} onChangeText={(v) => updateMeal(dayIndex, mealIdx, 'carbs', parseInt(v) || 0)} keyboardType="number-pad" placeholder={t('programs.carbsShort')} placeholderTextColor={colors.textLight} />
                        <TextInput style={[styles.macroInput, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), color: colors.text }]} value={String(meal.fat || '')} onChangeText={(v) => updateMeal(dayIndex, mealIdx, 'fat', parseInt(v) || 0)} keyboardType="number-pad" placeholder={t('programs.fatShort')} placeholderTextColor={colors.textLight} />
                      </View>
                      <TouchableOpacity onPress={() => removeMeal(dayIndex, mealIdx)} style={styles.removeBtn}>
                        <Trash2 size={14} color="#EF5350" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addItemBtn} onPress={() => addMeal(dayIndex)}>
                    <UtensilsCrossed size={14} color={PRIMARY_GREEN} />
                    <Text style={styles.addItemText}>{t('programs.addMeal')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addDayBtn} onPress={addDay}>
            <Plus size={18} color={PRIMARY_GREEN} />
            <Text style={styles.addDayText}>{t('programs.addDay')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      )}

      {/* Client Picker Modal */}
      <Modal visible={clientPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.clientModalContainer, { backgroundColor: isDark ? '#0a0a0a' : colors.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
            <LinearGradient colors={isDark ? ['#0a0a0a', '#0d1a0d', '#0a0a0a'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('programs.selectClient')}</Text>
              <TouchableOpacity onPress={() => setClientPickerVisible(false)}><X size={22} color={colors.text} /></TouchableOpacity>
            </View>
            <FlatList
              data={clients}
              keyExtractor={(item) => item.client_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.clientOption, { backgroundColor: getGlassBg(isDark) }, clientId === item.client_id && styles.clientOptionActive]}
                  onPress={() => { setClientId(item.client_id); setClientPickerVisible(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.clientOptionText, { color: colors.text }, clientId === item.client_id && styles.clientOptionTextActive]}>{item.display_name}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ padding: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* Exercise Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: isDark ? '#0a0a0a' : colors.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
            <LinearGradient colors={isDark ? ['#0a0a0a', '#0d1a0d', '#0a0a0a'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('programs.addExercise')}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={[styles.modalClose, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
              <Search size={18} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('programs.searchExercises')}
                placeholderTextColor={colors.textLight}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {/* Muscle Group Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleGroupScroll} contentContainerStyle={styles.muscleGroupContent}>
              <TouchableOpacity
                style={[styles.muscleChip, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }, !selectedMuscleGroup && styles.muscleChipSelected]}
                onPress={() => setSelectedMuscleGroup(null)}
              >
                <Text style={[styles.muscleChipText, { color: colors.textSecondary }, !selectedMuscleGroup && styles.muscleChipTextSelected]}>{t('common.all')}</Text>
              </TouchableOpacity>
              {muscleGroups.map((mg) => (
                <TouchableOpacity
                  key={mg}
                  style={[styles.muscleChip, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }, selectedMuscleGroup === mg && styles.muscleChipSelected]}
                  onPress={() => setSelectedMuscleGroup(selectedMuscleGroup === mg ? null : mg)}
                >
                  <Text style={[styles.muscleChipText, { color: colors.textSecondary }, selectedMuscleGroup === mg && styles.muscleChipTextSelected]}>{mg}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Exercise List */}
            {exercisesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PRIMARY_GREEN} />
              </View>
            ) : (
              <FlatList
                data={filteredExercises}
                keyExtractor={(item) => item.id}
                renderItem={renderExercisePickerItem}
                contentContainerStyle={styles.pickerListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.pickerEmpty}>
                    <Dumbbell size={32} color="rgba(180,240,78,0.2)" />
                    <Text style={[styles.pickerEmptyText, { color: colors.textLight }]}>{t('programs.noExercisesFound')}</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
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
  formContent: { paddingTop: 16 },
  field: { marginBottom: 18 },
  label: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.6)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: '#FFFFFF' },
  textArea: { minHeight: 80 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  typeChipSelected: { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN },
  typeChipText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.7)' },
  typeChipTextSelected: { color: '#000000' },
  dayCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 16, marginBottom: 12 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), color: PRIMARY_GREEN },
  daySection: { marginBottom: 12 },

  exerciseRow: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    marginBottom: 8,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  exName: { flex: 1, fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: '#FFFFFF' },
  exNumbers: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exNumField: { alignItems: 'center', gap: 4 },
  exNumLabel: { fontFamily: 'Barlow_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' },
  smallInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 8, width: 54, fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(14), color: '#FFFFFF', textAlign: 'center' },
  exSeparator: { fontFamily: 'Barlow_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 14 },

  mealRow: { marginBottom: 10 },
  mealNameInput: { marginBottom: 6 },
  macroRow: { flexDirection: 'row', gap: 6 },
  macroInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 8, fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: '#FFFFFF', textAlign: 'center' },
  removeBtn: { position: 'absolute', top: 4, right: 4, padding: 6 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addItemText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), color: PRIMARY_GREEN },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(180,240,78,0.2)', borderStyle: 'dashed', marginBottom: 20 },
  addDayText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: PRIMARY_GREEN },

  // Exercise Picker Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: { flex: 1, backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: 40, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  modalTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: '#FFFFFF' },
  modalClose: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: '#FFFFFF', padding: 0 },

  muscleGroupScroll: { maxHeight: 44, marginTop: 12 },
  muscleGroupContent: { paddingHorizontal: 20, gap: 6, alignItems: 'center' },
  muscleChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  muscleChipSelected: { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN },
  muscleChipText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.6)' },
  muscleChipTextSelected: { color: '#000000' },

  pickerListContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    marginBottom: 6,
    gap: 12,
  },
  pickerItemImage: { width: 44, height: 44, borderRadius: 10 },
  pickerItemImagePlaceholder: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(180,240,78,0.06)', alignItems: 'center', justifyContent: 'center' },
  pickerItemInfo: { flex: 1 },
  pickerItemName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: '#FFFFFF' },
  pickerItemMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  pickerEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  pickerEmptyText: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.4)' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  clientModalContainer: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: 'auto', maxHeight: '50%', overflow: 'hidden' },
  clientOption: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 6 },
  clientOptionActive: { backgroundColor: 'rgba(180,240,78,0.12)', borderWidth: 1, borderColor: PRIMARY_GREEN },
  clientOptionText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(14), color: '#FFFFFF' },
  clientOptionTextActive: { color: PRIMARY_GREEN },
});
