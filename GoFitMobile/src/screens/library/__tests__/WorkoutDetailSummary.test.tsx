jest.mock('expo-linear-gradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('lucide-react-native', () => Object.fromEntries([
  'ArrowLeft', 'Clock', 'Dumbbell', 'Play', 'Check', 'Calendar', 'ChevronRight', 'ChevronDown', 'Activity', 'TrendingUp', 'Zap', 'Target',
].map(name => [name, () => null])));
jest.mock('@react-navigation/native', () => ({ StackActions: {}, CommonActions: {} }));
jest.mock('@/store/workoutPlansStore', () => ({ useWorkoutPlansStore: () => ({ addPlan: jest.fn() }) }));
jest.mock('@/store/themeStore', () => ({ useThemeStore: () => ({ isDark: false }) }));
jest.mock('@/store/textSizeStore', () => ({ useTextSizeStore: () => ({ textSize: 'medium' }), getScaledFontSize: (n: number) => n }));
jest.mock('@/utils/responsive', () => ({ scaleWidth: (n: number) => n, scaleHeight: (n: number) => n,
  getResponsiveSpacing: (n: number) => n, getResponsiveFontSize: (n: number) => n }));
jest.mock('@/utils/colorUtils', () => ({ getBackgroundColor: () => '#fff', getTextColor: () => '#111',
  getPrimaryWithOpacity: () => '#84c441', getTextColorWithOpacity: () => '#555' }));
jest.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: { id: 'client-id' } }) }));
jest.mock('@/services/workouts', () => ({ workoutService: { getWorkoutById: jest.fn() } }));
jest.mock('@/services/workoutPlans', () => ({ createWorkoutPlan: jest.fn() }));
jest.mock('@/components/shared/CustomDialog', () => ({ dialogManager: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/utils/exerciseTranslations', () => ({ getTranslatedExerciseName: (name: string) => name }));
jest.mock('react-i18next', () => {
  const i18n = require('i18next').createInstance();
  void i18n.init({ lng: 'en', fallbackLng: 'en', initImmediate: false, resources: {
    en: { translation: require('@/i18n/locales/en.json') },
    fr: { translation: require('@/i18n/locales/fr.json') },
  } });
  return { useTranslation: () => ({ t: i18n.t.bind(i18n) }), testI18n: i18n };
});

import React from 'react';
import { Text } from 'react-native';
import { workoutService } from '@/services/workouts';
import { WorkoutDetailScreen } from '../WorkoutDetailScreen';
const { act, create } = require('react-test-renderer');
const { testI18n } = require('react-i18next');

describe('workout detail summary (workout service mocked)', () => {
  let tree: any;
  const read = workoutService.getWorkoutById as jest.Mock;
  const one = { id: 'exercise-id', name: 'Push-up', sets: '4', reps: '12,10,8,6', restTime: '60', day: 1 };
  const render = async () => { await act(async () => { tree = create(<WorkoutDetailScreen
    navigation={{ goBack: jest.fn() } as any}
    route={{ params: { workoutId: '00000000-0000-4000-8000-000000000001', workoutName: 'QA summary fixture' } }} />); }); };
  const texts = () => tree.root.findAllByType(Text).map((node: any) => node.props.children);
  beforeEach(async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    await testI18n.changeLanguage('en');
    read.mockResolvedValue({ workout_type: 'native', exercises: [one] });
  });
  afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });

  test('one saved exercise produces singular count and no invented duration', async () => {
    await render();
    expect(texts()).toContain('1 exercise');
    expect(texts()).toContain('Total exercises');
    expect(texts()).toContain('Not estimated');
    expect(texts()).not.toContain('8 exercises');
    expect(texts()).not.toContain('45 min');
    expect(texts()).toContain('12,10,8,6');
  });

  test('total counts prescription entries across days, including repeated exercise IDs', async () => {
    read.mockResolvedValue({ workout_type: 'custom', exercises: [one, { ...one, day: 2 }, { ...one, id: 'other', name: 'Squat', day: 2 }] });
    await render();
    expect(texts()).toContain('3 exercises');
    expect(texts()).toContain('Not estimated');
  });

  test('successfully loaded empty workout reports zero', async () => {
    read.mockResolvedValue({ workout_type: 'custom', exercises: [] });
    await render(); expect(texts()).toContain('0 exercises');
  });

  test('pending load does not masquerade as zero exercises', async () => {
    read.mockImplementation(() => new Promise(() => {}));
    await render(); expect(texts()).toContain('Loading...'); expect(texts()).not.toContain('0 exercises');
  });

  test('failed or missing workout reports unavailable rather than zero', async () => {
    read.mockResolvedValue(null);
    await render(); expect(texts()).toContain('Unavailable'); expect(texts()).not.toContain('0 exercises');
  });

  test('French summary uses localized duration status and singular count', async () => {
    await testI18n.changeLanguage('fr');
    await render(); expect(texts()).toContain('1 exercice'); expect(texts()).toContain('Non estimée');
  });
});
