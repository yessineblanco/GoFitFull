// Expo replaces this public environment variable when producing the JS bundle.
// Never pass an absent, malformed or secret key to the native SDK.
export function getStripePublishableKey(): string {
  const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || '';
  return /^pk_(test|live)_[A-Za-z0-9]+$/.test(key) ? key : '';
}
