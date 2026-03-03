-- Create conversations_enriched view if missing (required for chat conversations list)
-- Uses auth.users for display names (user_profiles.display_name may not exist)
-- Run this in Supabase SQL Editor if you get "Could not find the table 'public.conversations_enriched'"

CREATE OR REPLACE VIEW public.conversations_enriched AS
SELECT
  c.id,
  c.coach_id,
  c.client_id,
  c.last_message_at,
  c.created_at,
  -- Last message content
  (SELECT m.content FROM public.messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
  -- Client info (for coach view) - from auth.users (avoids user_profiles columns that may not exist)
  COALESCE(u_client.raw_user_meta_data->>'display_name', split_part(u_client.email, '@', 1), c.client_id::text) AS client_display_name,
  u_client.raw_user_meta_data->>'avatar_url' AS client_profile_picture_url,
  -- Coach info (for client view) - coach_profiles has profile_picture_url
  COALESCE(u_coach.raw_user_meta_data->>'display_name', split_part(u_coach.email, '@', 1), cp.user_id::text) AS coach_display_name,
  COALESCE(cp.profile_picture_url, u_coach.raw_user_meta_data->>'avatar_url') AS coach_profile_picture_url
FROM public.conversations c
LEFT JOIN public.coach_profiles cp ON cp.id = c.coach_id
LEFT JOIN auth.users u_client ON u_client.id = c.client_id
LEFT JOIN auth.users u_coach ON u_coach.id = cp.user_id;

GRANT SELECT ON public.conversations_enriched TO authenticated;
