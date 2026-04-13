import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const HF_SPACE_URL = 'https://hysts-mediapipe-pose-estimation.hf.space/api/predict';

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

const LANDMARK_NAMES: Record<number, string> = {
  0: 'nose',
  11: 'left_shoulder',
  12: 'right_shoulder',
  13: 'left_elbow',
  14: 'right_elbow',
  15: 'left_wrist',
  16: 'right_wrist',
  23: 'left_hip',
  24: 'right_hip',
  25: 'left_knee',
  26: 'right_knee',
  27: 'left_ankle',
  28: 'right_ankle',
};

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function calculateMeasurements(
  landmarks: PoseLandmark[],
  userHeightCm: number,
): Record<string, number> {
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const nose = landmarks[0];

  const ankleY = Math.max(leftAnkle.y, rightAnkle.y);
  const pixelHeight = ankleY - nose.y;

  if (pixelHeight <= 0) {
    return {};
  }

  const cmPerPixel = userHeightCm / pixelHeight;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];

  const shoulderWidth = distance(leftShoulder, rightShoulder) * cmPerPixel;
  const hipWidth = distance(leftHip, rightHip) * cmPerPixel;

  const chest = shoulderWidth * Math.PI * 0.55;
  const waist = hipWidth * Math.PI * 0.62;
  const hips = hipWidth * Math.PI * 0.65;

  const leftArmLen = (distance(leftShoulder, leftElbow) + distance(leftElbow, landmarks[15])) * cmPerPixel;
  const rightArmLen = (distance(rightShoulder, rightElbow) + distance(rightElbow, landmarks[16])) * cmPerPixel;
  const leftArmCirc = leftArmLen * 0.35;
  const rightArmCirc = rightArmLen * 0.35;

  const leftThighLen = distance(leftHip, leftKnee) * cmPerPixel;
  const rightThighLen = distance(rightHip, rightKnee) * cmPerPixel;
  const leftThighCirc = leftThighLen * 0.85;
  const rightThighCirc = rightThighLen * 0.85;

  return {
    shoulder_width: Math.round(shoulderWidth * 10) / 10,
    chest: Math.round(chest * 10) / 10,
    waist: Math.round(waist * 10) / 10,
    hips: Math.round(hips * 10) / 10,
    left_arm: Math.round(leftArmCirc * 10) / 10,
    right_arm: Math.round(rightArmCirc * 10) / 10,
    left_thigh: Math.round(leftThighCirc * 10) / 10,
    right_thigh: Math.round(rightThighCirc * 10) / 10,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_base64, user_height_cm, user_id } = await req.json();

    if (!image_base64 || !user_height_cm) {
      return new Response(
        JSON.stringify({ error: 'image_base64 and user_height_cm are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let landmarks: PoseLandmark[] = [];
    let hfError: string | null = null;

    try {
      const hfResponse = await fetch(HF_SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [`data:image/jpeg;base64,${image_base64}`],
        }),
      });

      if (hfResponse.ok) {
        const hfResult = await hfResponse.json();
        if (hfResult?.data?.[0]?.landmarks) {
          landmarks = hfResult.data[0].landmarks;
        } else if (Array.isArray(hfResult?.data) && hfResult.data.length > 0) {
          const raw = hfResult.data[0];
          if (typeof raw === 'string') {
            landmarks = JSON.parse(raw);
          } else if (Array.isArray(raw)) {
            landmarks = raw;
          }
        }
      } else {
        hfError = `HF Space returned ${hfResponse.status}`;
      }
    } catch (e) {
      hfError = `HF Space error: ${e.message}`;
    }

    if (!landmarks || landmarks.length < 29) {
      return new Response(
        JSON.stringify({
          error: 'Could not detect pose landmarks. Please ensure full body is visible in the photo.',
          details: hfError,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const measurements = calculateMeasurements(landmarks, user_height_cm);

    if (Object.keys(measurements).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not calculate measurements from detected landmarks.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: saved, error: saveError } = await supabase
      .from('body_measurements')
      .insert({
        user_id,
        measurement_date: new Date().toISOString().split('T')[0],
        shoulder_width: measurements.shoulder_width,
        chest: measurements.chest,
        waist: measurements.waist,
        hips: measurements.hips,
        left_arm: measurements.left_arm,
        right_arm: measurements.right_arm,
        left_thigh: measurements.left_thigh,
        right_thigh: measurements.right_thigh,
        landmarks: landmarks,
        source: 'ai',
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({
        success: true,
        measurements,
        landmark_count: landmarks.length,
        record: saved,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
