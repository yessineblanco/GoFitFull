import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions, Easing } from 'react-native';
import { Easing120Hz, createAnimationConfig } from '@/utils/animations';

interface EllipseConfig {
  width: number;
  height: number;
  left: number;
  top: number;
  color: string;
  blurRadius?: number;
}

interface AnimatedBackgroundProps {
  ellipse1?: EllipseConfig;
  ellipse2?: EllipseConfig;
  backgroundColor?: string;
}

const defaultEllipse1: EllipseConfig = {
  width: 359,
  height: 359,
  left: -98,
  top: -74,
  color: 'rgba(132, 196, 65, 0.22)',
  blurRadius: 85.5,
};

const defaultEllipse2: EllipseConfig = {
  width: 488,
  height: 437,
  left: -76,
  top: 494,
  color: 'rgba(132, 196, 65, 0.03)',
  blurRadius: 85.5,
};

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  ellipse1 = defaultEllipse1,
  ellipse2 = defaultEllipse2,
  backgroundColor = '#030303',
}) => {
  const { width, height } = useWindowDimensions();
  // Ellipse 1 animations
  const ellipse1Scale = useRef(new Animated.Value(1)).current;
  const ellipse1Opacity = useRef(new Animated.Value(0)).current;
  const ellipse1X = useRef(new Animated.Value(0)).current;
  const ellipse1Y = useRef(new Animated.Value(0)).current;

  // Ellipse 2 animations
  const ellipse2Scale = useRef(new Animated.Value(1)).current;
  const ellipse2Opacity = useRef(new Animated.Value(0)).current;
  const ellipse2X = useRef(new Animated.Value(0)).current;
  const ellipse2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate Ellipse 1 - Fade in, pulse, and slow drift (optimized for 120Hz)
    Animated.parallel([
      Animated.timing(ellipse1Opacity, {
        toValue: 1,
        duration: 1500,
        easing: Easing120Hz.easeInOut,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(ellipse1Scale, {
            toValue: 1.15,
            duration: 3000,
            easing: Easing120Hz.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(ellipse1Scale, {
            toValue: 1,
            duration: 3000,
            easing: Easing120Hz.easeInOut,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ellipse1X, {
              toValue: 20,
              duration: 4000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(ellipse1Y, {
              toValue: 15,
              duration: 4000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(ellipse1X, {
              toValue: -20,
              duration: 4000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(ellipse1Y, {
              toValue: -15,
              duration: 4000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(ellipse1X, {
              toValue: 0,
              duration: 4000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(ellipse1Y, {
              toValue: 0,
              duration: 4000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
          ]),
        ])
      ),
    ]).start();

    // Animate Ellipse 2 - Fade in, pulse, and slow drift (opposite direction, optimized for 120Hz)
    Animated.parallel([
      Animated.timing(ellipse2Opacity, {
        toValue: 1,
        duration: 1500,
        delay: 300,
        easing: Easing120Hz.easeInOut,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(ellipse2Scale, {
            toValue: 1.1,
            duration: 3500,
            easing: Easing120Hz.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(ellipse2Scale, {
            toValue: 1,
            duration: 3500,
            easing: Easing120Hz.easeInOut,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ellipse2X, {
              toValue: -25,
              duration: 5000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(ellipse2Y, {
              toValue: 20,
              duration: 5000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(ellipse2X, {
              toValue: 25,
              duration: 5000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(ellipse2Y, {
              toValue: -20,
              duration: 5000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(ellipse2X, {
              toValue: 0,
              duration: 5000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(ellipse2Y, {
              toValue: 0,
              duration: 5000,
              easing: Easing120Hz.easeInOut,
              useNativeDriver: true,
            }),
          ]),
        ])
      ),
    ]).start();
  }, []);

  const blurRadius = ellipse1.blurRadius || 85.5;
  const ellipse1ContainerSize = ellipse1.width + blurRadius * 2;
  const ellipse2ContainerSize = Math.max(ellipse2.width, ellipse2.height) + blurRadius * 2;

  // Helper function to extract opacity from rgba color string
  const extractOpacity = (rgbaString: string): number => {
    const match = rgbaString.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
    return match ? parseFloat(match[1]) : 1;
  };

  // Helper function to create blur layers
  const createBlurLayers = (baseWidth: number, baseHeight: number, baseColor: string, blurRadius: number): React.ReactElement[] => {
    const layers: React.ReactElement[] = [];
    const baseOpacity = extractOpacity(baseColor);
    const opacities = [0.20, 0.16, 0.12, 0.08, 0.05, 0.02, 0.01];
    
    // Extract RGB values
    const rgbMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgbMatch) return layers;
    
    const r = rgbMatch[1];
    const g = rgbMatch[2];
    const b = rgbMatch[3];
    
    for (let i = 0; i < 7; i++) {
      const sizeIncrease = (blurRadius / 7) * (i + 1);
      const width = baseWidth + sizeIncrease * 2;
      const height = baseHeight + sizeIncrease * 2;
      const borderRadius = Math.max(width, height) / 2;
      const opacity = baseOpacity * opacities[i];
      
      layers.push(
        <View
          key={`blur-${i}`}
          style={[
            styles.blurLayer,
            {
              width,
              height,
              borderRadius,
              backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
            },
          ]}
        />
      );
    }
    
    return layers;
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.backgroundWrapper}>
        {/* Ellipse 1 */}
        {ellipse1 && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: ellipse1ContainerSize,
                height: ellipse1ContainerSize,
                left: ellipse1.left - blurRadius,
                top: ellipse1.top - blurRadius,
                alignItems: 'center',
                justifyContent: 'center',
              },
              {
                opacity: ellipse1Opacity,
                transform: [
                  { translateX: ellipse1X },
                  { translateY: ellipse1Y },
                  { scale: ellipse1Scale },
                ],
              },
            ]}
          >
            {createBlurLayers(ellipse1.width, ellipse1.height, ellipse1.color, blurRadius)}
            <View
              style={[
                styles.ellipseBase,
                {
                  width: ellipse1.width,
                  height: ellipse1.height,
                  borderRadius: Math.max(ellipse1.width, ellipse1.height) / 2,
                  backgroundColor: ellipse1.color,
                },
              ]}
            />
          </Animated.View>
        )}

        {/* Ellipse 2 */}
        {ellipse2 && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: ellipse2ContainerSize,
                height: ellipse2ContainerSize,
                left: ellipse2.left - blurRadius,
                top: ellipse2.top - blurRadius,
                alignItems: 'center',
                justifyContent: 'center',
              },
              {
                opacity: ellipse2Opacity,
                transform: [
                  { translateX: ellipse2X },
                  { translateY: ellipse2Y },
                  { scale: ellipse2Scale },
                ],
              },
            ]}
          >
            {createBlurLayers(ellipse2.width, ellipse2.height, ellipse2.color, blurRadius)}
            <View
              style={[
                styles.ellipseBase,
                {
                  width: ellipse2.width,
                  height: ellipse2.height,
                  borderRadius: Math.max(ellipse2.width, ellipse2.height) / 2,
                  backgroundColor: ellipse2.color,
                },
              ]}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundWrapper: {
    flex: 1,
    position: 'relative',
  },
  blurLayer: {
    position: 'absolute',
  },
  ellipseBase: {
    position: 'absolute',
  },
});

