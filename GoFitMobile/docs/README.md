# GoFit Mobile Documentation

The mobile application uses Expo SDK 54, React Native 0.81, React Navigation stack/tab navigators, TypeScript, Supabase, React Native `StyleSheet`, and shared theme tokens. NativeWind is not the active styling system.

## Current References

- [Mobile package and scripts](../package.json)
- [Application source](../src/)
- [Authentication service](../src/services/auth.ts)
- [Workout services](../src/services/workouts.ts)
- [Nutrition service](../src/services/nutrition.ts)
- [Health sync service](../src/services/healthSync.ts)
- [Setup guide](setup/SETUP_GUIDE.md)
- [Security features](security/SECURITY_FEATURES_EXPLANATION.md)
- [Project roadmap](../../docs/ROADMAP.md)

## Verification

Run the mobile checks from `GoFitMobile/`:

```powershell
npm test
npm run type-check
npm run test:coverage
```

The Jest suite currently covers password scoring, workout-date eligibility,
recursive input sanitization, and auth, booking, and session-pack store
behavior. Keep unit tests beside the relevant module in `src/**/__tests__/`.

## Documentation Rule

The application code and Supabase migrations take precedence over documentation. Superseded mobile status reports are preserved in [../../docs/archive/obsolete-status/mobile/](../../docs/archive/obsolete-status/mobile/) and must be verified before use.
