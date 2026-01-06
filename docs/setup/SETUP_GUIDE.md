# GoFit - Setup Guide

Welcome! This guide will help you set up and run the GoFit mobile app on your machine.

---

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Git**
   - Download: https://git-scm.com/
   - Verify installation:
     ```bash
     git --version
     ```

3. **Expo CLI** (optional but recommended)
   - Install globally:
     ```bash
     npm install -g expo-cli
     ```
   - Or use `npx expo` (no installation needed)

### Platform-Specific Requirements

#### For iOS Development (macOS only)
- **Xcode** (latest version)
- **iOS Simulator** (comes with Xcode)
- **CocoaPods**:
  ```bash
  sudo gem install cocoapods
  ```

#### For Android Development
- **Android Studio** (latest version)
- **Android SDK** (comes with Android Studio)
- **Java Development Kit (JDK)** 17 or higher
- Set up Android environment variables:
  ```bash
  # Add to your ~/.bashrc or ~/.zshrc
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

---

## 🚀 Installation Steps

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd GoFit
```

Replace `<repository-url>` with the actual repository URL.

---

### Step 2: Install Dependencies

Install all project dependencies:

```bash
npm install
```

This will install all required packages including:
- React Native & Expo
- Supabase client
- Navigation libraries
- UI components
- And more...

**Expected time:** 2-5 minutes depending on your internet connection.

---

### Step 3: Set Up Environment Variables

The app requires Supabase credentials to work. You'll need to create a `.env` file.

#### Option A: If you have a `.env.example` file

```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` and add your Supabase credentials.

#### Option B: Create `.env` manually

Create a new file named `.env` in the root directory:

```bash
# On Windows (PowerShell)
New-Item -Path .env -ItemType File

# On macOS/Linux
touch .env
```

Add the following content to `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Where to get Supabase credentials:**
1. Go to https://supabase.com/
2. Sign in or create an account
3. Create a new project (or use existing)
4. Go to **Settings** → **API**
5. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Important:** 
- Never commit `.env` to git (it's already in `.gitignore`)
- Keep your credentials secure
- The app will show a warning if credentials are missing, but it will still run

---

### Step 4: Run the App

#### Option 1: Start Development Server (Recommended)

```bash
npm start
```

This will:
- Start the Expo development server
- Open Expo DevTools in your browser
- Show a QR code you can scan with Expo Go app

**To run on a device:**
1. Install **Expo Go** app on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
2. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

#### Option 2: Run on iOS Simulator (macOS only)

```bash
npm run ios
```

This will:
- Start the iOS simulator
- Build and run the app automatically

**Requirements:**
- macOS
- Xcode installed
- iOS Simulator available

#### Option 3: Run on Android Emulator

```bash
npm run android
```

This will:
- Start the Android emulator (if not running)
- Build and run the app automatically

**Requirements:**
- Android Studio installed
- Android emulator set up
- OR physical Android device connected via USB with USB debugging enabled

#### Option 4: Run on Web Browser

```bash
npm run web
```

This will:
- Start the web version of the app
- Open in your default browser

**Note:** Some features may not work on web (e.g., SecureStore, native modules).

---

## 🎯 Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS (macOS only)
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

---

## 🔧 Troubleshooting

### Issue: `npm install` fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Try again
npm install
```

---

### Issue: "Expo CLI not found"

**Solution:**
```bash
# Install Expo CLI globally
npm install -g expo-cli

# Or use npx (no installation needed)
npx expo start
```

---

### Issue: "Supabase environment variables not found"

**Solution:**
1. Make sure `.env` file exists in the root directory
2. Check that variables are named correctly:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Restart the development server after creating/editing `.env`

---

### Issue: Android build fails

**Solution:**
```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Clear Expo cache
npx expo start --clear
```

---

### Issue: iOS build fails (macOS)

**Solution:**
```bash
# Install CocoaPods dependencies
cd ios
pod install
cd ..

# Clear Expo cache
npx expo start --clear
```

---

### Issue: Metro bundler cache issues

**Solution:**
```bash
# Clear Metro bundler cache
npx expo start --clear

# Or reset cache completely
npm start -- --reset-cache
```

---

### Issue: TypeScript errors

**Solution:**
```bash
# Restart TypeScript server in your IDE
# VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check if types are installed
npm install --save-dev @types/react @types/react-native
```

---

### Issue: Port already in use

**Solution:**
```bash
# Kill process on port 8081 (default Expo port)
# On macOS/Linux:
lsof -ti:8081 | xargs kill -9

# On Windows:
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

---

## 📱 Testing on Physical Devices

### iOS Device (iPhone/iPad)

1. Connect your device via USB
2. Trust the computer on your device
3. Run:
   ```bash
   npm run ios
   ```
4. Select your device from the list

**Note:** You may need to configure code signing in Xcode.

### Android Device

1. Enable **Developer Options** on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging
3. Connect device via USB
4. Run:
   ```bash
   npm run android
   ```

---

## 🛠️ Development Tips

### Hot Reload
- The app automatically reloads when you save files
- Shake your device or press `r` in the terminal to reload manually

### Debugging
- Press `j` in the terminal to open React Native Debugger
- Use React DevTools for component inspection
- Check console logs in the terminal

### Common Commands
```bash
# Clear cache and restart
npx expo start --clear

# Run with specific port
npx expo start --port 8082

# Run in production mode
npx expo start --no-dev --minify
```

---

## 📚 Additional Resources

- **Expo Documentation**: https://docs.expo.dev/
- **React Native Documentation**: https://reactnative.dev/
- **Supabase Documentation**: https://supabase.com/docs
- **NativeWind Documentation**: https://www.nativewind.dev/

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] `npm install` completed without errors
- [ ] `.env` file created with Supabase credentials
- [ ] `npm start` runs successfully
- [ ] App opens on device/emulator
- [ ] No red error screens
- [ ] Can navigate between screens
- [ ] Authentication screens load (even if Supabase not configured)

---

## 🆘 Need Help?

If you encounter issues not covered here:

1. Check the project's `README.md` for more details
2. Review the documentation in the `docs/` folder
3. Check Expo documentation: https://docs.expo.dev/
4. Ask for help from the project maintainer

---

## 🎉 You're All Set!

Once you've completed these steps, you should be able to:
- Run the app on your device/emulator
- Make code changes and see them live
- Test all app features

**Happy coding!** 🚀

---

**Last Updated:** 2024-12-19


