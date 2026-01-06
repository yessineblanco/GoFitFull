import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal } from 'react-native';
import { Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';

interface TimePickerPillProps {
    time?: string | null; // HH:MM
    onTimeChange: (time: string) => void;
}

export const TimePickerPill: React.FC<TimePickerPillProps> = ({ time, onTimeChange }) => {
    const [showPicker, setShowPicker] = useState(false);

    // Convert "HH:MM:SS" or "HH:MM" string to Date object
    const getCurrentDate = () => {
        if (!time) return new Date();
        try {
            // Handle HH:MM:SS or HH:MM
            const timeStr = time.length > 5 ? time.substring(0, 5) : time;
            return parse(timeStr, 'HH:mm', new Date());
        } catch (e) {
            return new Date();
        }
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (selectedDate) {
            const formattedTime = format(selectedDate, 'HH:mm:00'); // Store as HH:MM:SS for TIME column
            onTimeChange(formattedTime);
        }
    };

    // Convert for display (e.g., 18:30 -> 6:30 PM)
    const displayTime = time
        ? format(getCurrentDate(), 'h:mm a')
        : 'Set Time';

    return (
        <>
            <Pressable
                style={({ pressed }) => [
                    styles.container,
                    { opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => setShowPicker(true)}
            >
                <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                <View style={styles.content}>
                    <Clock size={12} color="#84c441" />
                    <Text style={[
                        styles.text,
                        time && styles.activeText
                    ]}>
                        {displayTime}
                    </Text>
                </View>
            </Pressable>

            {/* iOS Modal Picker */}
            {Platform.OS === 'ios' && showPicker && (
                <Modal
                    transparent={true}
                    animationType="fade"
                    visible={showPicker}
                    onRequestClose={() => setShowPicker(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
                        <View style={styles.pickerContainer}>
                            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>Set Workout Time</Text>
                                <Pressable onPress={() => setShowPicker(false)}>
                                    <Text style={styles.doneText}>Done</Text>
                                </Pressable>
                            </View>
                            <DateTimePicker
                                value={getCurrentDate()}
                                mode="time"
                                display="spinner"
                                onChange={handleTimeChange}
                                textColor="#fff"
                                themeVariant="dark"
                            />
                        </View>
                    </Pressable>
                </Modal>
            )}

            {/* Android Picker */}
            {Platform.OS === 'android' && showPicker && (
                <DateTimePicker
                    value={getCurrentDate()}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(132, 196, 65, 0.3)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 6,
    },
    text: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Barlow_600SemiBold',
    },
    activeText: {
        color: '#fff',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    pickerContainer: {
        width: '85%',
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    pickerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Barlow_600SemiBold',
    },
    doneText: {
        color: '#84c441',
        fontSize: 16,
        fontWeight: '600',
    },
});
