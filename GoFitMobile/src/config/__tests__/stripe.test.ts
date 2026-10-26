import { getStripePublishableKey } from '../stripe';

describe('Stripe publishable configuration (format checks, not account verification)', () => {
  const originalKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  afterEach(() => {
    if (originalKey === undefined) delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    else process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalKey;
  });

  test.each([undefined, '', ' ', 'replace-me', 'sk_test_fixture', 'pk_test_', 'pk_test_bad key'])(
    'rejects absent or malformed public configuration (%s)', (key) => {
      if (key === undefined) delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      else process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = key;
      expect(getStripePublishableKey()).toBe('');
    },
  );

  test.each(['pk_test_fixture', 'pk_live_fixture'])('accepts public-key format (%s)', (key) => {
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = ` ${key} `;
    expect(getStripePublishableKey()).toBe(key);
  });
});
