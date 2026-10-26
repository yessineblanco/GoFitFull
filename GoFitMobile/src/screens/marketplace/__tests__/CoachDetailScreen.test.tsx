jest.mock('expo-linear-gradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('expo-image', () => ({ Image: require('react-native').View }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Medium: 'medium' } }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }), useRoute: () => ({ params: { coachId: 'coach-id' } }),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/utils/responsive', () => ({ getResponsiveFontSize: (n: number) => n, getResponsiveSpacing: (n: number) => n }));
jest.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: { id: 'client-id' } }) }));
jest.mock('@/store/marketplaceStore', () => ({ useMarketplaceStore: () => ({
  selectedCoach: { display_name: 'QA coach', average_rating: 0, total_reviews: 0, total_sessions: 0, specialties: [] },
  reviews: [], coachPacks: [{ id: 'pack-id', name: 'QA pack', price: 50, session_count: 5 }],
  loadCoachDetail: jest.fn(), loadReviews: jest.fn(), loadCoachPacks: jest.fn(), clearSelectedCoach: jest.fn(),
}) }));
jest.mock('@/components/auth', () => ({ CustomButton: () => null }));
jest.mock('@/components/shared/Shimmer', () => ({ SkeletonCoachDetail: () => null }));
jest.mock('@/theme', () => ({ theme: {} }));
jest.mock('@/config/stripe', () => ({ getStripePublishableKey: () => '' }));
jest.mock('@/config/supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));
jest.mock('@/services/sessionPacks', () => ({ sessionPacksService: { purchasePack: jest.fn() } }));
jest.mock('@/components/shared/CustomDialog', () => ({ dialogManager: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@stripe/stripe-react-native', () => ({ useStripe: jest.fn(() => ({ initPaymentSheet: jest.fn(), presentPaymentSheet: jest.fn() })) }));

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { CoachDetailScreen } from '../CoachDetailScreen';
import { supabase } from '@/config/supabase';
import { sessionPacksService } from '@/services/sessionPacks';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useStripe } from '@stripe/stripe-react-native';
const { act, create } = require('react-test-renderer');

test('pack purchase without Stripe configuration shows an error before payment or credit writes', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  let tree: any;
  try {
    await act(async () => { tree = create(<CoachDetailScreen />); });
    const pack = tree.root.findAllByType(TouchableOpacity).find((node: any) =>
      node.findAllByType(Text).some((text: any) => text.props.children === 'QA pack'));
    expect(pack).toBeDefined();
    await act(async () => { await pack.props.onPress(); });
    expect(dialogManager.error).toHaveBeenCalledWith('payments.unavailableTitle', 'payments.unavailableMessage');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    expect(sessionPacksService.purchasePack).not.toHaveBeenCalled();
    for (const call of (useStripe as jest.Mock).mock.results) {
      expect(call.value.initPaymentSheet).not.toHaveBeenCalled();
      expect(call.value.presentPaymentSheet).not.toHaveBeenCalled();
    }
  } finally {
    if (tree) await act(async () => tree.unmount());
  }
});
