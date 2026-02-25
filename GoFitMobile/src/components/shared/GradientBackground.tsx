import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';

interface GradientBackgroundProps {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style }) => {
    const { isDark } = useThemeStore();

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FAFBFC' }, style]}>
            <LinearGradient
                colors={isDark
                    ? ['#0B120B', '#050505', '#000000']
                    : ['#F8FAF5', '#F2F5EE', '#FAFBFC']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.backgroundGradient}
            />

            <LinearGradient
                colors={isDark
                    ? ['rgba(132, 196, 65, 0.08)', 'transparent']
                    : ['rgba(132, 196, 65, 0.04)', 'transparent']
                }
                style={styles.meshGradientTop}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        height: 600,
    },
});
