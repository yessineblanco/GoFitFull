jest.mock('expo-linear-gradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('lucide-react-native', () => Object.fromEntries([
  'ArrowLeft', 'Moon', 'Sun', 'Monitor', 'Target', 'Check', 'Save', 'User', 'Scale', 'Ruler',
].map(name => [name, () => null])));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/store/themeStore', () => ({ useThemeStore: jest.fn() }));
jest.mock('@/store/textSizeStore', () => ({ useTextSizeStore: () => ({ getScaleFactor: () => 1 }), getScaledFontSize: (n: number) => n }));
jest.mock('@/utils/responsive', () => ({ scaleWidth: (n: number) => n, scaleHeight: (n: number) => n,
  getResponsiveSpacing: (n: number) => n, getResponsiveFontSize: (n: number) => n }));
jest.mock('@/store/profileStore', () => ({ useProfileStore: () => ({ profile: {
  weight: 83, height: 181, age: 25, gender: 'male', activity_level: 'moderately_active',
  goal: 'strength', weight_unit: 'lb', height_unit: 'inches',
}, loadProfile: jest.fn() }) }));
jest.mock('@/store/onboardingStore', () => ({ useOnboardingStore: () => ({ getOnboardingData: () => ({}) }) }));
jest.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: { id: 'client-id' } }) }));
jest.mock('@/services/userProfile', () => ({ userProfileService: { updateUserProfile: jest.fn(), saveOnboardingData: jest.fn() } }));
jest.mock('@/components/shared/CustomDialog', () => ({ dialogManager: { success: jest.fn(), error: jest.fn() } }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Light: 'light' } }));

import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { userProfileService } from '@/services/userProfile';
import { ThemeSettingsScreen } from '../ThemeSettingsScreen';
import { GoalsScreen } from '../GoalsScreen';
import { UnitPreferencesScreen } from '../UnitPreferencesScreen';
import { EditProfileScreen } from '../EditProfileScreen';
const { act, create } = require('react-test-renderer');

// WCAG relative luminance; alpha text is composited over each modeled surface.
const rgba = (color: string): number[] => color.startsWith('#')
  ? [...color.slice(1).match(/../g)!.map(v => parseInt(v, 16)), 1]
  : color.match(/[\d.]+/g)!.map(Number);
const composite = (fg: number[], bg: number[]) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
const luminance = (rgb: number[]) => rgb.slice(0, 3).map(c => {
  const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (color: string, bg: number[]) => {
  const a = luminance(composite(rgba(color), bg)), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const surfaces = (dark: boolean) => (dark ? ['#0B120B', '#050505', '#000000'] : ['#F8FAF5', '#F2F5EE', '#FAFBFC'])
  .flatMap(hex => {
    const base = rgba(hex);
    const mesh = composite([132, 196, 65, dark ? 0.08 : 0.04], base);
    const card = composite([255, 255, 255, 0.05], mesh);
    return [base, mesh, card, composite([132, 196, 65, 0.15], card)];
  });

const screens = [
  { name: 'Theme', Screen: ThemeSettingsScreen, keys: ['theme.selectTheme', 'theme.lightDesc', 'theme.darkDesc', 'theme.systemDesc', 'theme.light', 'theme.dark', 'theme.system'] },
  { name: 'Goals', Screen: GoalsScreen, keys: ['goals.strengthDesc', 'goals.hiitDesc', 'goals.cardioDesc', 'goals.functionalDesc', 'goals.strength', 'common.save'] },
  { name: 'Units', Screen: UnitPreferencesScreen, keys: ['units.chooseWeightUnit', 'units.chooseHeightUnit', 'units.kilogram', 'units.pound', 'units.centimeter', 'units.inch'] },
  { name: 'EditProfile', Screen: EditProfileScreen, keys: ['profileFields.sedentaryDesc', 'profileFields.lightlyActiveDesc', 'profileFields.moderatelyActiveDesc', 'profileFields.veryActiveDesc', 'profileFields.extraActiveDesc'] },
];

describe('settings foreground contrast (modeled surfaces, no native rendering)', () => {
  let tree: any;
  beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); });
  afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });
  test('contrast calculation matches black/white and alpha-compositing reference cases', () => {
    expect(contrast('#000000', [255, 255, 255])).toBe(21);
    expect(contrast('#ffffff', [255, 255, 255])).toBe(1);
    expect(contrast('rgba(255, 255, 255, 0.5)', [0, 0, 0])).toBeCloseTo(5.2808, 4);
  });
  test.each(screens.flatMap(screen => [false, true].map(dark => ({ ...screen, dark, preference: dark ? 'dark' : 'light' }))).concat(
    [false, true].map(dark => ({ ...screens[0], dark, preference: 'system' })),
  ))('$name dark=$dark preference=$preference keeps descriptions readable', async ({ Screen, keys, dark, preference, name }) => {
    (useThemeStore as unknown as jest.Mock).mockReturnValue({ isDark: dark, theme: preference, setTheme: jest.fn() });
    await act(async () => { tree = create(<Screen navigation={{ goBack: jest.fn() } as any} />); });
    const checked = tree.root.findAllByType(Text).filter((node: any) => keys.includes(node.props.children));
    for (const key of keys) expect(checked.some((node: any) => node.props.children === key)).toBe(true);
    let minimum = Infinity;
    for (const node of checked) {
      const color = StyleSheet.flatten(node.props.style).color;
      for (const bg of surfaces(dark)) {
        const ratio = contrast(color, bg);
        minimum = Math.min(minimum, ratio);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    }
    if (name === 'EditProfile') {
      for (const input of tree.root.findAllByType(TextInput)) {
        for (const bg of surfaces(dark)) {
          const ratio = contrast(input.props.placeholderTextColor, bg);
          minimum = Math.min(minimum, ratio);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
    expect(userProfileService.updateUserProfile).not.toHaveBeenCalled();
    expect(userProfileService.saveOnboardingData).not.toHaveBeenCalled();
    console.info('SETTINGS_CONTRAST_RESULT ' + JSON.stringify({ screen: name, dark, preference, minimumModeledRatio: minimum, textNodesChecked: checked.length }));
  });
});
