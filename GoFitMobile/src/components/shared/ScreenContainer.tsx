import React, { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT_CONFIG } from "@/constants";
import { useUIStore } from "@/store/uiStore";
import {
  View,
  SafeAreaView,
  Animated,
  StyleProp,
  ViewStyle,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";

type Props = {
  children?: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  header?: React.ReactNode;
  onLayout?: (event: any) => void;
  onContentSizeChange?: (width: number, height: number) => void;
  fixed?: React.ReactNode;
};

export const ScreenContainer = React.forwardRef<any, Props>(
  (
    {
      children,
      scrollable = false,
      style,
      contentContainerStyle,
      onScroll,
      scrollEventThrottle = 16,
      header,
      onLayout,
      onContentSizeChange,
      fixed,
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);

    const bottomPadding =
      LAYOUT_CONFIG.TAB_BAR_HEIGHT +
      LAYOUT_CONFIG.TAB_BAR_SPACING +
      insets.bottom;

    useEffect(() => {
      return () => setTabBarVisible(true);
    }, [setTabBarVisible]);

    if (scrollable) {
      return (
        <SafeAreaView style={[styles.safe, style]}>
          {header}
          <Animated.ScrollView
            ref={ref}
            contentContainerStyle={[
              { paddingBottom: bottomPadding },
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
            onScrollBeginDrag={() => setTabBarVisible(false)}
            onMomentumScrollBegin={() => setTabBarVisible(false)}
            onScrollEndDrag={() => setTabBarVisible(true)}
            onMomentumScrollEnd={() => setTabBarVisible(true)}
            onLayout={onLayout}
            onContentSizeChange={onContentSizeChange}
          >
            {children}
          </Animated.ScrollView>
          {fixed}
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={[styles.safe, style]}>
        {header}
        <Animated.ScrollView
          ref={ref}
          scrollEnabled={false}
          contentContainerStyle={[
            { paddingBottom: bottomPadding },
            contentContainerStyle,
          ]}
          onLayout={onLayout}
          onContentSizeChange={onContentSizeChange}
        >
          {children}
        </Animated.ScrollView>
        {fixed}
      </SafeAreaView>
    );
  }
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
