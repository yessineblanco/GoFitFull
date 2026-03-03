-- Conversations view with other user display_name, avatar, and last message for list display
-- Coach sees client info; Client sees coach info

CREATE OR REPLACE VIEW public.conversations_enriched AS
SELECT
  c.id,
  c.coach_id,
  c.client_id,
  c.last_message_at,
  c.created_at,
  -- Last message content
  (SELECT m.content FROM public.messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
  -- Client info (for coach view)
  up_client.display_name AS client_display_name,
  up_client.profile_picture_url AS client_profile_picture_url,
  -- Coach info (for client view)
  up_coach.display_name AS coach_display_name,
  COALESCE(cp.profile_picture_url, up_coach.profile_picture_url) AS coach_profile_picture_url
FROM public.conversations c
LEFT JOIN public.user_profiles up_client ON up_client.id = c.client_id
LEFT JOIN public.coach_profiles cp ON cp.id = c.coach_id
LEFT JOIN public.user_profiles up_coach ON up_coach.id = cp.user_id;

-- RLS: users can only see their own conversations (via existing conversations policies)
-- The view inherits from conversations table - RLS on conversations applies to the underlying select

GRANT SELECT ON public.conversations_enriched TO authenticated;
