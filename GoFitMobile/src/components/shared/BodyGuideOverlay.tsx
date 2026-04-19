import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

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
  const isFront = pose === 'front';
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={20} y={7} width={60} height={84} rx={6} fill="rgba(0,0,0,0.12)" stroke="rgba(255,255,255,0.62)" strokeWidth={0.8} />
        <Rect x={25} y={11} width={50} height={76} rx={24} fill="none" stroke="rgba(132,196,65,0.95)" strokeWidth={1.4} strokeDasharray="2.4 2.2" />
        <Line x1={25} y1={14} x2={75} y2={14} stroke="rgba(255,255,255,0.7)" strokeWidth={0.55} />
        <Line x1={25} y1={84} x2={75} y2={84} stroke="rgba(255,255,255,0.7)" strokeWidth={0.55} />

        {isFront ? (
          <>
            <Circle cx={50} cy={22} r={4.8} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1} />
            <Line x1={50} y1={27} x2={50} y2={58} stroke="rgba(132,196,65,0.95)" strokeWidth={1.15} />
            <Line x1={34} y1={36} x2={66} y2={36} stroke="rgba(255,218,92,0.98)" strokeWidth={1.8} />
            <Line x1={38} y1={58} x2={62} y2={58} stroke="rgba(80,180,255,0.96)" strokeWidth={1.8} />
            <Path d="M35 38 L29 62 M65 38 L71 62" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.1} strokeLinecap="round" />
            <Path d="M44 61 L40 84 M56 61 L60 84" fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth={1.25} strokeLinecap="round" />
          </>
        ) : (
          <>
            <Circle cx={50} cy={22} r={4.6} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1} />
            <Path d="M49 27 C47 37 47 49 49 60 C51 70 51 78 49 84" fill="none" stroke="rgba(132,196,65,0.98)" strokeWidth={1.65} strokeLinecap="round" />
            <Path d="M54 28 C61 39 62 50 57 61 C55 69 56 78 60 84" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth={1.1} strokeLinecap="round" />
            <Line x1={42} y1={37} x2={58} y2={37} stroke="rgba(255,218,92,0.98)" strokeWidth={1.8} />
            <Line x1={43} y1={59} x2={57} y2={59} stroke="rgba(80,180,255,0.96)" strokeWidth={1.8} />
            <Line x1={30} y1={50} x2={70} y2={50} stroke="rgba(255,255,255,0.36)" strokeWidth={0.65} strokeDasharray="2 2" />
          </>
        )}
      </Svg>
      <View style={styles.topHint}>
        <Text style={styles.hintText}>{isFront ? 'Front: shoulders level, arms away' : 'Side: turn fully sideways'}</Text>
      </View>
      <View style={styles.leftHint}>
        <Text style={styles.sideHintText}>{isFront ? 'Face camera' : 'Narrow profile'}</Text>
      </View>
      <View style={styles.bottomHint}>
        <Text style={styles.hintText}>Head and feet inside the guide</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topHint: {
    position: 'absolute',
    top: '10%',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(132,196,65,0.55)',
  },
  bottomHint: {
    position: 'absolute',
    bottom: '16%',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  leftHint: {
    position: 'absolute',
    left: 14,
    top: '43%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  hintText: {
    color: '#fff',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 13,
    letterSpacing: 0,
    textAlign: 'center',
  },
  sideHintText: {
    color: '#fff',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 12,
    letterSpacing: 0,
  },
});
