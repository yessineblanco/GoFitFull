jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('lucide-react-native', () => ({ ChevronLeft: () => null, ChevronRight: () => null, Settings2: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Medium: 'medium' } }));
jest.mock('@react-navigation/native', () => ({ useNavigation: jest.fn(), useFocusEffect: jest.fn() }));
jest.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: { id: 'client-id' } }) }));
jest.mock('@/store/profileStore', () => ({ useProfileStore: jest.fn() }));
jest.mock('@/store/themeStore', () => ({ useThemeStore: () => ({ isDark: false }) }));
jest.mock('@/services/userProfile', () => ({ userProfileService: { getUserProfile: jest.fn() } }));
jest.mock('@/utils/responsive', () => ({ getResponsiveFontSize: (n: number) => n }));
jest.mock('@/utils/colorUtils', () => ({
  getBackgroundColor: () => '#fff', getTextColor: () => '#111', getGlassBg: () => '#fff', getGlassBorder: () => '#ccc',
}));
jest.mock('@/stores/nutritionStore', () => ({ useNutritionStore: () => ({
  selectedDate: '2026-10-24', goals: null, logs: [], totals: {}, weeklySummary: null, isLoading: false,
}) }));
jest.mock('@/components/nutrition/MacroRings', () => ({ MacroRings: () => null }));
jest.mock('@/components/nutrition/MealSection', () => ({ MealSection: () => null }));

import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore } from '@/store/profileStore';
import { userProfileService } from '@/services/userProfile';
import NutritionProfileScreen from '../NutritionProfileScreen';
import NutritionScreen from '../NutritionScreen';
const { act, create } = require('react-test-renderer');

describe('signed-in nutrition profile correction (services mocked)', () => {
  let tree: any;
  const goBack = jest.fn(), navigate = jest.fn(), updateProfile = jest.fn();
  const read = userProfileService.getUserProfile as jest.Mock;
  const saved = { id: 'client-id', weight: 83, height: 181, goal: 'strength',
    dietary_preferences: ['Vegetarian'], food_allergies: ['Peanuts'], food_dislikes: ['Olives', 'Mushrooms'] };
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ goBack, navigate });
    (useProfileStore as unknown as jest.Mock).mockReturnValue({ updateProfile, profile: null });
    read.mockResolvedValue(saved);
    updateProfile.mockResolvedValue(undefined);
  });
  afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });
  const render = async (screen = <NutritionProfileScreen />) => { await act(async () => { tree = create(screen); }); };
  const button = (label: string) => tree.root.findAllByType(TouchableOpacity).find((node: any) =>
    node.props.accessibilityLabel === label || node.findAllByType(Text).some((text: any) => text.props.children === label));
  const press = async (label: string) => { const node = button(label); expect(node).toBeDefined(); await act(async () => { await node.props.onPress(); }); };
  const change = async (label: string, value: string) => { await act(async () => {
    tree.root.findAllByType(TextInput).find((node: any) => node.props.accessibilityLabel === label).props.onChangeText(value);
  }); };

  test('nutrition banner requests the signed-in route rather than onboarding', async () => {
    await render(<NutritionScreen />);
    await press('Complete Your Nutrition Profile');
    expect(navigate).toHaveBeenCalledWith('NutritionProfile');
    expect(updateProfile).not.toHaveBeenCalled();
  });

  test('loads saved values; editing then backing out makes no writes', async () => {
    await render();
    expect(read).toHaveBeenCalledWith('client-id');
    expect(tree.root.findAllByType(TextInput).map((node: any) => node.props.value))
      .toEqual(['Vegetarian', 'Peanuts', 'Olives, Mushrooms']);
    await change('Food Allergies', 'Peanuts, Sesame');
    await press('Back');
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(updateProfile).not.toHaveBeenCalled();
    expect(saved.weight).toBe(83);
  });

  test('saving unchanged values returns without touching the profile', async () => {
    await render(); await press('Save preferences');
    expect(updateProfile).not.toHaveBeenCalled(); expect(goBack).toHaveBeenCalledTimes(1);
  });

  test('saves only changed nutrition fields and preserves untouched allergy data', async () => {
    await render();
    await change('Dietary Preferences', ' Vegan, , High protein ');
    await change('Foods You Dislike', '');
    await press('Save preferences');
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledWith({ dietary_preferences: ['Vegan', 'High protein'], food_dislikes: [] });
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  test('load failure disables save and allows retry without clearing server data', async () => {
    read.mockRejectedValueOnce(new Error('Offline'));
    await render();
    expect(button('Save preferences').props.disabled).toBe(true);
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    await press('Save preferences');
    expect(updateProfile).not.toHaveBeenCalled(); expect(goBack).not.toHaveBeenCalled();
    await press('Retry');
    expect(tree.root.findAllByType(TextInput)[1].props.value).toBe('Peanuts');
  });

  test('failed save stays on editor with draft intact and can retry', async () => {
    await render(); await change('Food Allergies', 'Peanuts, Sesame');
    updateProfile.mockRejectedValueOnce(new Error('Offline'));
    await press('Save preferences');
    expect(goBack).not.toHaveBeenCalled();
    expect(tree.root.findAllByType(TextInput)[1].props.value).toBe('Peanuts, Sesame');
    await press('Save preferences');
    expect(updateProfile).toHaveBeenLastCalledWith({ food_allergies: ['Peanuts', 'Sesame'] });
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
