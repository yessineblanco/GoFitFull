import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Path, Ellipse } from 'react-native-svg';

type Props = {
  /** 'front' shows shoulders/hips; 'side' emphasizes profile line */
  pose: 'front' | 'side';
  style?: ViewStyle;
};

/**
 * Semi-transparent body outline to help users align full body in frame.
 * No photo processing — visual guide only.
 */
export function BodyGuideOverlay({ pose, style }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="xMidYMid meet">
        <Path
          d="M50 18 C44 18 40 24 40 30 C40 36 44 40 50 40 C56 40 60 36 60 30 C60 24 56 18 50 18 Z"
          fill="none"
          stroke="rgba(132,196,65,0.55)"
          strokeWidth={1.2}
        />
        <Path
          d="M50 40 L50 95"
          fill="none"
          stroke="rgba(132,196,65,0.5)"
          strokeWidth={1.5}
        />
        <Path
          d="M32 52 L68 52 M36 88 L64 88"
          fill="none"
          stroke="rgba(132,196,65,0.45)"
          strokeWidth={1.2}
        />
        <Ellipse cx={50} cy={118} rx={pose === 'front' ? 16 : 10} ry={14} fill="none" stroke="rgba(132,196,65,0.45)" strokeWidth={1.2} />
        <Path
          d="M38 132 L42 175 M62 132 L58 175"
          fill="none"
          stroke="rgba(132,196,65,0.45)"
          strokeWidth={1.2}
        />
        {pose === 'side' ? (
          <Path
            d="M50 40 Q62 70 58 110"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
        ) : null}
      </Svg>
    </View>
  );
}
