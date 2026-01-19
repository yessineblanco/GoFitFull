import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface GradientTextProps {
  text: string;
  colors: [string, string, ...string[]];
  style?: any;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  letterSpacing?: number;
}

export const GradientText: React.FC<GradientTextProps> = ({
  text,
  colors,
  style,
  fontSize = 36,
  fontFamily = 'Barlow_800ExtraBold',
  fontWeight = 'normal',
  letterSpacing = 1,
}) => {
  const textStyle = {
    fontSize,
    fontFamily,
    fontWeight,
    letterSpacing,
    includeFontPadding: false,
    backgroundColor: 'transparent',
    textAlign: 'center' as const,
  };

  return (
    <View style={styles.wrapper}>
      <MaskedView
        style={styles.maskedView}
        maskElement={
          <View style={styles.maskContainer}>
            <Text style={[textStyle, style]}>
              {text}
            </Text>
          </View>
        }
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={[textStyle, { opacity: 0 }, style]}>
            {text}
          </Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center', // Center the wrapper
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskedView: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

