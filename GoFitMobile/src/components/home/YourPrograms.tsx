import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Play, Dumbbell } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { workoutService } from '@/services/workouts';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { LibraryStackParamList } from '@/types';
import * as Haptics from 'expo-haptics';
import { SectionHeader } from './SectionHeader';

type NavigationProp = StackNavigationProp<LibraryStackParamList>;

interface Program {
    id: string;
    name: string;
    image?: string;
    image_url?: string;
    workout_type?: string;
    difficulty?: string;
    exercises?: any[];
}

export const YourPrograms: React.FC = () => {
    const { isDark } = useThemeStore();
    const { user } = useAuthStore();
    const navigation = useNavigation<NavigationProp>();
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPrograms();
    }, [user]);

    const loadPrograms = async () => {
        try {
            setLoading(true);
            if (user?.id) {
                const customWorkouts = await workoutService.getCustomWorkouts(user.id);
                const topPrograms = customWorkouts.slice(0, 6);

                const programsWithExercises = await Promise.all(
                    topPrograms.map(async (program) => {
                        try {
                            const exercises = await workoutService.getWorkoutExercises(program.id);
                            return {
                                ...program,
                                image: program.image_url,
                                exercises,
                            };
                        } catch (error) {
                            return {
                                ...program,
                                image: program.image_url,
                                exercises: [],
                            };
                        }
                    })
                );
                setPrograms(programsWithExercises as any[]);
            } else {
                setPrograms([]);
            }
        } catch (error) {
            console.error('Error loading programs:', error);
            setPrograms([]);
        } finally {
            setLoading(false);
        }
    };

    const handleProgramPress = async (program: Program, index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Active Program (Index 0) -> Start Session
        if (index === 0) {
            try {
                const fullWorkout = await workoutService.getWorkoutById(program.id);
                if (fullWorkout && fullWorkout.exercises) {
                    navigation.navigate('WorkoutSession', {
                        workoutId: fullWorkout.id,
                        workoutName: fullWorkout.name,
                        workoutType: fullWorkout.workout_type,
                        exercises: fullWorkout.exercises.map((ex: any) => ({
                            id: ex.id,
                            name: ex.name,
                            sets: ex.sets?.toString() || '3',
                            reps: ex.reps || '10',
                            restTime: ex.restTime?.toString() || ex.rest_time?.toString() || '60',
                            image: ex.image || ex.image_url,
                        })),
                    });
                }
            } catch (error) {
                console.error('Error loading program:', error);
            }
        }
        // Other Programs -> View Details
        else {
            navigation.navigate('WorkoutDetail', { workoutId: program.id });
        }
    };

    const handleSeeAll = () => {
        navigation.navigate('LibraryMain');
    };

    const handleCreateProgram = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        (navigation as any).navigate('WorkoutBuilder');
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <SectionHeader title="Your Training" showSeeAll={false} animationDelay={400} />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading programs...</Text>
                </View>
            </View>
        );
    }

    if (programs.length === 0) {
        return (
            <View style={styles.container}>
                <SectionHeader title="Your Training" showSeeAll={false} animationDelay={400} />
                <TouchableOpacity
                    style={styles.emptyCard}
                    onPress={handleCreateProgram}
                    activeOpacity={0.8}
                >
                    <BlurView intensity={20} tint="dark" style={styles.emptyBlur}>
                        <View style={styles.plusIcon}>
                            <Play size={24} color={theme.colors.primary} style={{ transform: [{ rotate: '-90deg' }] }} />
                        </View>
                        <Text style={styles.emptyTitle}>Create Program</Text>
                        <Text style={styles.emptySubtitle}>Tap to build your first routine</Text>
                    </BlurView>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SectionHeader
                title="Your Training"
                onSeeAllPress={handleSeeAll}
                animationDelay={400}
            />

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
            >
                {programs.map((program, index) => {
                    const isActive = index === 0;

                    return (
                        <TouchableOpacity
                            key={program.id}
                            activeOpacity={0.7}
                            onPress={() => handleProgramPress(program, index)}
                            style={[
                                styles.programRow,
                                index === 0 && styles.firstProgramRow
                            ]}
                        >
                            <BlurView intensity={15} tint="dark" style={styles.rowBlur}>
                                {/* Gradient Background */}
                                <LinearGradient
                                    colors={isActive
                                        ? ['rgba(132, 196, 65, 0.15)', 'rgba(132, 196, 65, 0.05)']
                                        : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />

                                {/* Content */}
                                <View style={styles.rowContent}>
                                    {/* Thumbnail */}
                                    <View style={styles.thumbnailContainer}>
                                        {program.image || program.image_url ? (
                                            <Image
                                                source={{ uri: program.image || program.image_url }}
                                                style={styles.thumbnail}
                                                contentFit="cover"
                                                transition={200}
                                            />
                                        ) : (
                                            <LinearGradient
                                                colors={['#2A2A2A', '#1A1A1A']}
                                                style={styles.thumbnail}
                                            >
                                                <Dumbbell size={20} color="rgba(255,255,255,0.3)" />
                                            </LinearGradient>
                                        )}

                                        {/* Active Indicator */}
                                        {isActive && (
                                            <View style={styles.activeIndicator}>
                                                <View style={styles.activeDot} />
                                            </View>
                                        )}
                                    </View>

                                    {/* Info */}
                                    <View style={styles.programInfo}>
                                        <Text style={[
                                            styles.programName,
                                            isActive && styles.programNameActive
                                        ]} numberOfLines={1}>
                                            {program.name}
                                        </Text>
                                        <View style={styles.metaRow}>
                                            <Text style={styles.exerciseCount}>
                                                {program.exercises?.length || 0} exercises
                                            </Text>
                                            {program.workout_type && (
                                                <>
                                                    <Text style={styles.metaDot}>•</Text>
                                                    <Text style={styles.workoutType}>
                                                        {program.workout_type}
                                                    </Text>
                                                </>
                                            )}
                                        </View>
                                    </View>

                                    {/* Play Button (Active Only) */}
                                    {isActive && (
                                        <View style={styles.playButtonContainer}>
                                            <View style={styles.playButton}>
                                                <Play size={16} color="#000" fill="#000" style={{ marginLeft: 2 }} />
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </BlurView>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: getResponsiveSpacing(24),
    },
    scrollContent: {
        paddingHorizontal: getResponsiveSpacing(20),
        paddingVertical: getResponsiveSpacing(4),
    },
    loadingContainer: {
        paddingHorizontal: getResponsiveSpacing(20),
        paddingVertical: getResponsiveSpacing(40),
        alignItems: 'center',
    },
    loadingText: {
        fontSize: getScaledFontSize(14),
        fontFamily: 'Barlow_400Regular',
        color: 'rgba(255,255,255,0.5)',
    },
    emptyCard: {
        marginHorizontal: getResponsiveSpacing(20),
        borderRadius: getResponsiveSpacing(20),
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
    },
    emptyBlur: {
        padding: getResponsiveSpacing(32),
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    plusIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(132,196,65,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: getResponsiveSpacing(16),
        borderWidth: 2,
        borderColor: 'rgba(132,196,65,0.3)',
    },
    emptyTitle: {
        fontSize: getScaledFontSize(16),
        fontFamily: 'Barlow_600SemiBold',
        color: '#FFF',
        marginBottom: getResponsiveSpacing(6),
    },
    emptySubtitle: {
        fontSize: getScaledFontSize(13),
        fontFamily: 'Barlow_400Regular',
        color: 'rgba(255,255,255,0.5)',
    },
    programRow: {
        marginRight: getResponsiveSpacing(12),
        borderRadius: getResponsiveSpacing(18),
        overflow: 'hidden',
        width: scaleWidth(280),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    firstProgramRow: {
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    rowBlur: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: getResponsiveSpacing(12),
        gap: getResponsiveSpacing(12),
    },
    thumbnailContainer: {
        position: 'relative',
    },
    thumbnail: {
        width: 56,
        height: 56,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeIndicator: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary,
    },
    programInfo: {
        flex: 1,
        gap: 4,
    },
    programName: {
        fontSize: getScaledFontSize(15),
        fontFamily: 'Barlow_600SemiBold',
        color: '#FFF',
        letterSpacing: -0.3,
    },
    programNameActive: {
        color: theme.colors.primary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    exerciseCount: {
        fontSize: getScaledFontSize(12),
        fontFamily: 'Barlow_400Regular',
        color: 'rgba(255,255,255,0.6)',
    },
    metaDot: {
        fontSize: getScaledFontSize(10),
        color: 'rgba(255,255,255,0.3)',
    },
    workoutType: {
        fontSize: getScaledFontSize(12),
        fontFamily: 'Barlow_400Regular',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'capitalize',
    },
    playButtonContainer: {
        marginLeft: 'auto',
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
});
