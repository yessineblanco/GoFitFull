import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

type Props = {
  pose: 'front' | 'side';
  style?: ViewStyle;
};

/**
 * Body-measurement capture overlay.
 *
 * Layout layers (bottom → top):
 *  1. Dimmed frame ring outside the safe zone, so the user sees where the
 *     capture area is without distorting anything.
 *  2. A single-outline human silhouette (no fill, thin stroke) constrained to
 *     the middle ~70 % of the camera view. ViewBox aspect is 40:100 and the
 *     container is letterboxed (`xMidYMid meet`) so proportions never stretch.
 *  3. Shoulder + hip landmark lines anchored to real anatomical y-positions
 *     inside the silhouette.
 *  4. A short hint text below the silhouette.
 */
export function BodyGuideOverlay({ pose, style }: Props) {
  const isFront = pose === 'front';
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <View style={styles.safeZone} />

      <View style={styles.silhouetteBox}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 40 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {isFront ? <FrontSilhouette /> : <SideSilhouette />}
        </Svg>
      </View>

      <View style={styles.bottomHint}>
        <Text style={styles.hintText}>Align head, shoulders, hips and feet to the outline</Text>
      </View>
    </View>
  );
}

const OUTLINE = 'rgba(255,255,255,0.92)';
const OUTLINE_SOFT = 'rgba(255,255,255,0.35)';
const SHOULDER_LINE = 'rgba(255,218,92,0.95)';
const HIP_LINE = 'rgba(88,188,255,0.95)';

function FrontSilhouette() {
  // Single continuous outline going clockwise from top of head, following
  // 7-head proportions. No fill – only a thin white stroke so the live
  // camera preview stays fully visible behind it.
  const body =
    'M 20 2 ' +
    'C 26 2, 27 13, 23.5 15.5 ' + // right side of head / jaw
    'C 23 16.5, 23 17, 23 18 ' + // right neck
    'C 25 18.5, 28 19, 30 19.5 ' + // trapezius to shoulder tip
    'C 32 26, 32 34, 31 42 ' + // outer upper arm
    'C 31 47, 31 50, 30 52 ' + // outer forearm to wrist
    'C 29.5 53, 28.5 53, 28 52 ' + // hand
    'C 28 48, 28 42, 28 36 ' + // inner forearm back up
    'C 28 28, 28 22, 27 21 ' + // inner upper arm to armpit
    'L 27 22 ' +
    'C 26 30, 25 38, 24 44 ' + // torso side narrowing to waist
    'C 24 48, 25.5 52, 26 56 ' + // waist widening to hip
    'C 26 70, 25.5 85, 24.5 98 ' + // outer right thigh to ankle
    'L 21 98 ' + // right foot
    'L 21 56 ' + // inner right leg up to crotch
    'L 19 56 ' + // crotch
    'L 19 98 ' + // inner left leg down
    'L 15.5 98 ' + // left foot
    'C 14.5 85, 14 70, 14 56 ' + // outer left thigh up
    'C 14.5 52, 16 48, 16 44 ' + // hip to waist
    'C 15 38, 14 30, 13 22 ' + // waist up to shoulder
    'L 13 21 ' + // armpit
    'C 12 22, 12 28, 12 36 ' + // inner upper arm down
    'C 12 42, 12 48, 12 52 ' + // inner forearm
    'C 11.5 53, 10.5 53, 10 52 ' + // left hand
    'C 9 50, 9 47, 9 42 ' + // outer forearm up
    'C 8 34, 8 26, 10 19.5 ' + // outer upper arm
    'C 12 19, 15 18.5, 17 18 ' + // trapezius
    'C 17 17, 17 16.5, 16.5 15.5 ' + // left neck
    'C 13 13, 14 2, 20 2 Z'; // left side of head back to top

  return (
    <>
      <Path
        d={body}
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Line
        x1={9}
        y1={19.5}
        x2={31}
        y2={19.5}
        stroke={SHOULDER_LINE}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
      <Line
        x1={14}
        y1={56}
        x2={26}
        y2={56}
        stroke={HIP_LINE}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
    </>
  );
}

function SideSilhouette() {
  // Profile facing right: front of body = higher x, back = lower x.
  const body =
    'M 20 2 ' +
    'C 25 2.5, 26 12, 24 15 ' + // top/front of head to jaw
    'L 23.5 17 ' + // front of neck
    'C 25 18, 27 22, 27 30 ' + // front shoulder → chest/pec bulge
    'C 26.5 40, 26 46, 25 52 ' + // chest → ribs → waist
    'C 25.5 56, 25 60, 24.5 62 ' + // belly forward of waist
    'L 24.5 98 ' + // front of leg straight down to ankle
    'L 20 98 ' + // foot across
    'L 20 62 ' + // back of leg up to hip
    'C 19 60, 16 60, 15.5 62 ' + // glute curving out
    'C 15 56, 15.5 50, 15.5 44 ' + // lumbar arching in
    'C 15 36, 14.5 26, 15.5 20 ' + // mid/upper back
    'C 16 18, 17 17, 17.5 16.5 ' + // back of neck
    'C 14 14, 15 2.5, 20 2 Z'; // back of head to top

  const arm = 'M 25 21 C 26.5 32, 27 44, 26.5 54';
  const legBack = 'M 18 62 C 18 75, 18 88, 18 98';

  return (
    <>
      <Path
        d={body}
        fill="none"
        stroke={OUTLINE}
        strokeWidth={0.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path
        d={arm}
        fill="none"
        stroke={OUTLINE_SOFT}
        strokeWidth={0.45}
        strokeLinecap="round"
      />
      <Path
        d={legBack}
        fill="none"
        stroke={OUTLINE_SOFT}
        strokeWidth={0.45}
        strokeLinecap="round"
      />
      <Line
        x1={14}
        y1={20}
        x2={28}
        y2={20}
        stroke={SHOULDER_LINE}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
      <Line
        x1={14}
        y1={62}
        x2={26}
        y2={62}
        stroke={HIP_LINE}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeZone: {
    position: 'absolute',
    top: '8%',
    bottom: '12%',
    left: '5%',
    right: '5%',
    borderWidth: 1,
    borderRadius: 16,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
  },
  silhouetteBox: {
    position: 'absolute',
    top: '12%',
    bottom: '15%',
    left: 0,
    right: 0,
  },
  bottomHint: {
    position: 'absolute',
    bottom: '2.5%',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    maxWidth: '88%',
  },
  hintText: {
    color: '#fff',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 12.5,
    letterSpacing: 0,
    textAlign: 'center',
  },
});
