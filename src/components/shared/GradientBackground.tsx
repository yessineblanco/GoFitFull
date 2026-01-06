import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBackgroundProps {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style }) => {
    return (
        <View style={[styles.container, style]}>
            {/* Base Background: Rich Dark Green-Black to Pure Black */}
            <LinearGradient
                colors={['#0B120B', '#050505', '#000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.backgroundGradient}
            />

            {/* Top Mesh: Subtle Green Haze */}
            <LinearGradient
                colors={['rgba(132, 196, 65, 0.08)', 'transparent']}
                style={styles.meshGradientTop}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            {/* Content Container */}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000', // Fallback
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    meshGradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 600, // Extended height for smoother fade
    },
});
