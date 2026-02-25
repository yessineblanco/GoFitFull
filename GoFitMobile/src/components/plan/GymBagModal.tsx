import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Check } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getBlurTint, getSurfaceColor, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Simple store for gym bag items
interface GymBagState {
    items: Record<string, boolean>; // key: itemId, value: checked
    toggle: (id: string) => void;
    reset: () => void;
}

export const useGymBagStore = create<GymBagState>()(
    persist(
        (set) => ({
            items: {},
            toggle: (id) => set((state) => ({
                items: { ...state.items, [id]: !state.items[id] }
            })),
            reset: () => set({ items: {} })
        }),
        {
            name: 'gym-bag-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

interface GymBagModalProps {
    visible: boolean;
    onClose: () => void;
}

const BAG_ITEMS = [
    { id: 'water', label: 'Water Bottle', icon: '💧' },
    { id: 'clothes', label: 'Gym Clothes', icon: '👕' },
    { id: 'headphones', label: 'Headphones', icon: '🎧' },
    { id: 'shoes', label: 'Running Shoes', icon: '👟' },
    { id: 'towel', label: 'Towel', icon: '🚿' },
    { id: 'shake', label: 'Post-Workout Shake', icon: '🥤' }
];

export const GymBagModal: React.FC<GymBagModalProps> = ({ visible, onClose }) => {
    const { items, toggle } = useGymBagStore();
    const { isDark } = useThemeStore();

    const allChecked = BAG_ITEMS.every(i => items[i.id]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.modalContent}>
                    <BlurView intensity={isDark ? 80 : 60} tint={getBlurTint(isDark)} style={StyleSheet.absoluteFill} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.title, { color: getTextColor(isDark) }]}>Gym Bag Checklist</Text>
                            <Text style={[styles.subtitle, { color: getTextSecondaryColor(isDark) }]}>Don't forget the essentials!</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color={getTextColor(isDark)} />
                        </Pressable>
                    </View>

                    {/* List */}
                    <View style={styles.list}>
                        {BAG_ITEMS.map((item) => {
                            const checked = items[item.id];
                            return (
                                <Pressable
                                    key={item.id}
                                    style={[styles.itemRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }, checked && styles.itemRowChecked]}
                                    onPress={() => toggle(item.id)}
                                >
                                    <View style={styles.itemLeft}>
                                        <Text style={styles.itemIcon}>{item.icon}</Text>
                                        <Text style={[styles.itemLabel, { color: getTextColor(isDark) }, checked && [styles.itemLabelChecked, { color: getTextColor(isDark) }]]}>
                                            {item.label}
                                        </Text>
                                    </View>

                                    <View style={[styles.checkbox, { borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }, checked && styles.checkboxChecked]}>
                                        {checked && <Check size={14} color="#000" strokeWidth={3} />}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Footer Status */}
                    <View style={[styles.footer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)' }]}>
                        <Text style={[styles.footerText, { color: getTextSecondaryColor(isDark) }, allChecked && { color: '#84c441' }]}>
                            {allChecked ? "You're all set! 🎒🔥" : "Pack your bag!"}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: 'Barlow_700Bold',
    },
    subtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    list: {
        padding: 16,
        gap: 8,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    itemRowChecked: {
        backgroundColor: 'rgba(132, 196, 65, 0.08)',
        borderColor: 'rgba(132, 196, 65, 0.2)',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemIcon: {
        fontSize: 18,
    },
    itemLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    itemLabelChecked: {
        color: '#fff',
        textDecorationLine: 'line-through',
        opacity: 0.7,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#84c441',
        borderColor: '#84c441',
    },
    footer: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    footerText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
