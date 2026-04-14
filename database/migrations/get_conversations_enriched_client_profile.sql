-- Enrich get_conversations_enriched with user_profiles.display_name and profile_picture_url
-- so coaches see client avatars stored in user_profiles (not only auth metadata).

CREATE OR REPLACE FUNCTION public.get_conversations_enriched(p_role TEXT DEFAULT 'client')
RETURNS TABLE(
  id UUID,
  coach_id UUID,
  client_id UUID,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  last_message TEXT,
  client_display_name TEXT,
  client_profile_picture_url TEXT,
  coach_display_name TEXT,
  coach_profile_picture_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.coach_id,
    c.client_id,
    c.last_message_at,
    c.created_at,
    (SELECT m.content
     FROM public.messages m
     WHERE m.conversation_id = c.id
     ORDER BY m.created_at DESC
     LIMIT 1
    ) AS last_message,
    COALESCE(
      NULLIF(trim(up_client.display_name), ''),
      u_client.raw_user_meta_data->>'display_name',
      u_client.raw_user_meta_data->>'full_name',
      split_part(u_client.email, '@', 1),
      c.client_id::text
    ) AS client_display_name,
    COALESCE(
      NULLIF(trim(up_client.profile_picture_url), ''),
      (u_client.raw_user_meta_data->>'avatar_url')::TEXT
    ) AS client_profile_picture_url,
    COALESCE(
      u_coach.raw_user_meta_data->>'display_name',
      u_coach.raw_user_meta_data->>'full_name',
      split_part(u_coach.email, '@', 1),
      cp.user_id::text
    ) AS coach_display_name,
    COALESCE(
      cp.profile_picture_url,
      u_coach.raw_user_meta_data->>'avatar_url'
    )::TEXT AS coach_profile_picture_url
  FROM public.conversations c
  LEFT JOIN public.coach_profiles cp ON cp.id = c.coach_id
  LEFT JOIN public.user_profiles up_client ON up_client.id = c.client_id
  LEFT JOIN auth.users u_client ON u_client.id = c.client_id
  LEFT JOIN auth.users u_coach ON u_coach.id = cp.user_id
  WHERE
    CASE
      WHEN p_role = 'client' THEN c.client_id = v_user_id
      WHEN p_role = 'coach'  THEN cp.user_id = v_user_id
      ELSE FALSE
    END
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversations_enriched(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_conversations_enriched(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_conversations_enriched(TEXT) TO authenticated;
