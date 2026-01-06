import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from './Logo';
import { theme } from '@/theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  isReady: boolean;
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isReady, onComplete }) => {
  const [introFinished, setIntroFinished] = useState(false);

  // Animation Values
  const masterOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const lineScale = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // Intro Sequence
  useEffect(() => {
    // Background fade in + Ken Burns starts
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    Animated.timing(bgScale, {
      toValue: 1.15,
      duration: 5000, // Slow cinematic zoom
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(lineScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ]),
    ]).start(() => {
      setIntroFinished(true);
    });
  }, []);

  // Outro Sequence (triggered when both Intro is done AND App is ready)
  useEffect(() => {
    if (introFinished && isReady) {
      Animated.sequence([
        Animated.delay(500), // Minimum hold time for reading
        Animated.timing(masterOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start(() => {
        onComplete();
      });
    }
  }, [introFinished, isReady, onComplete]);

  return (
    <Animated.View style={[styles.container, { opacity: masterOpacity }]}>
      <StatusBar hidden />

      {/* Background Image with Ken Burns effect */}
      <Animated.Image
        source={require('../../../assets/splash-bg.png')}
        style={[
          styles.background,
          {
            opacity: bgOpacity,
            transform: [{ scale: bgScale }]
          }
        ]}
        resizeMode="cover"
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
        style={styles.overlay}
      >
        <View style={styles.centerContent}>
          {/* Logo Section */}
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }]
            }}
          >
            <Logo width={220} height={70} />
          </Animated.View>

          {/* Decorative Divider */}
          <Animated.View
            style={[
              styles.divider,
              {
                transform: [{ scaleX: lineScale }]
              }
            ]}
          />

          {/* Tagline Section */}
          <Animated.View
            style={{
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }]
            }}
          >
            <Animated.Text style={styles.tagline}>
              UNLEASH YOUR <Animated.Text style={styles.highlight}>POTENTIAL</Animated.Text>
            </Animated.Text>
          </Animated.View>
        </View>

        {/* Bottom branding */}
        <View style={styles.footer}>
          <Animated.Text style={[styles.footerText, { opacity: textOpacity }]}>
            GoFit v1.0
          </Animated.Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  divider: {
    height: 2,
    width: 60,
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  highlight: {
    color: '#fff',
    fontFamily: 'Barlow_700Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  }
});