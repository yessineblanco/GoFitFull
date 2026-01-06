import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface LogoProps {
  width?: number;
  height?: number;
  style?: any;
}

export const Logo: React.FC<LogoProps> = ({ 
  width = 200, 
  height = 60,
  style 
}) => {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image
        source={require('../../../assets/logo.png')}
        style={styles.image}
        contentFit="contain"
        cachePolicy="memory"
        transition={200}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

