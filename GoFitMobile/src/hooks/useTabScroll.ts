import { useEffect, useRef, useCallback } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useUIStore } from '@/store/uiStore';

export const useTabScroll = () => {
    const setTabBarVisible = useUIStore(state => state.setTabBarVisible);
    const lastScrollY = useRef(0);
    const scrollThreshold = 10; // Minimum scroll distance to trigger visibility change

    useEffect(() => {
        return () => setTabBarVisible(true);
    }, [setTabBarVisible]);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentY > lastScrollY.current;

        // Ignore near-top scrolls (don't hide if we are at the very top)
        if (currentY < 50) {
            setTabBarVisible(true);
            lastScrollY.current = currentY;
            return;
        }

        // Check if scroll distance exceeds threshold
        if (Math.abs(currentY - lastScrollY.current) > scrollThreshold) {
            if (isScrollingDown) {
                setTabBarVisible(false);
            } else {
                setTabBarVisible(true);
            }
            lastScrollY.current = currentY;
        }
    }, [setTabBarVisible]);

    return { onScroll };
};
