-- ============================================
-- GoFit Phase 5: Coach Marketplace Tables
-- Run this SQL script in your Supabase SQL Editor
-- Prerequisite: run add_user_type_column.sql first
-- ============================================


-- ============================================
-- 1. COACH PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  hourly_rate NUMERIC(8, 2),
  cv_url TEXT,
  profile_picture_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  average_rating NUMERIC(3, 2) DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  cancellation_policy TEXT NOT NULL DEFAULT 'flexible' CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict')),
  stripe_account_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coach_profiles_user_id ON public.coach_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_status ON public.coach_profiles(status);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_is_verified ON public.coach_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_average_rating ON public.coach_profiles(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_specialties ON public.coach_profiles USING GIN(specialties);

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved coach profiles for marketplace"
  ON public.coach_profiles
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Coaches can view own profile"
  ON public.coach_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can insert own profile"
  ON public.coach_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can update own profile"
  ON public.coach_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all coach profiles"
  ON public.coach_profiles
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update any coach profile"
  ON public.coach_profiles
  FOR UPDATE
  USING (public.is_admin());

CREATE TRIGGER set_coach_profiles_updated_at
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.coach_profiles TO authenticated;


-- ============================================
-- 2. COACH CERTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.coach_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  document_url TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coach_certifications_coach_id ON public.coach_certifications(coach_id);

ALTER TABLE public.coach_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own certifications"
  ON public.coach_certifications
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = coach_certifications.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Clients can view verified certifications"
  ON public.coach_certifications
  FOR SELECT
  USING (status = 'verified');

CREATE POLICY "Coaches can insert own certifications"
  ON public.coach_certifications
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = coach_certifications.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Coaches can update own certifications"
  ON public.coach_certifications
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = coach_certifications.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Coaches can delete own certifications"
  ON public.coach_certifications
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = coach_certifications.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all certifications"
  ON public.coach_certifications
  FOR ALL
  USING (public.is_admin());

CREATE TRIGGER set_coach_certifications_updated_at
  BEFORE UPDATE ON public.coach_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_certifications TO authenticated;


-- ============================================
-- 3. COACH REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.coach_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_reviews_coach_id ON public.coach_reviews(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_reviews_client_id ON public.coach_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_coach_reviews_created_at ON public.coach_reviews(created_at DESC);

ALTER TABLE public.coach_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view coach reviews"
  ON public.coach_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Clients can insert own reviews"
  ON public.coach_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own reviews"
  ON public.coach_reviews
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can delete own reviews"
  ON public.coach_reviews
  FOR DELETE
  USING (auth.uid() = client_id);

CREATE TRIGGER set_coach_reviews_updated_at
  BEFORE UPDATE ON public.coach_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_reviews TO authenticated;


-- ============================================
-- 4. COACH AVAILABILITY
-- ============================================
CREATE TABLE IF NOT EXISTS public.coach_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_coach_availability_coach_id ON public.coach_availability(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_availability_day ON public.coach_availability(coach_id, day_of_week);

ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view coach availability"
  ON public.coach_availability
  FOR SELECT
  USING (true);

CREATE POLICY "Coaches can manage own availability"
  ON public.coach_availability
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = coach_availability.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE TRIGGER set_coach_availability_updated_at
  BEFORE UPDATE ON public.coach_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_availability TO authenticated;


-- ============================================
-- 5. SESSION PACKS
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_count INTEGER NOT NULL CHECK (session_count > 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_packs_coach_id ON public.session_packs(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_packs_is_active ON public.session_packs(is_active);

ALTER TABLE public.session_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active session packs"
  ON public.session_packs
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Coaches can view own packs"
  ON public.session_packs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = session_packs.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Coaches can manage own packs"
  ON public.session_packs
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = session_packs.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE TRIGGER set_session_packs_updated_at
  BEFORE UPDATE ON public.session_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_packs TO authenticated;


-- ============================================
-- 6. PURCHASED PACKS
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchased_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.session_packs(id) ON DELETE RESTRICT,
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE RESTRICT,
  sessions_remaining INTEGER NOT NULL CHECK (sessions_remaining >= 0),
  sessions_total INTEGER NOT NULL CHECK (sessions_total > 0),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchased_packs_client_id ON public.purchased_packs(client_id);
CREATE INDEX IF NOT EXISTS idx_purchased_packs_coach_id ON public.purchased_packs(coach_id);
CREATE INDEX IF NOT EXISTS idx_purchased_packs_status ON public.purchased_packs(status);
CREATE INDEX IF NOT EXISTS idx_purchased_packs_client_coach ON public.purchased_packs(client_id, coach_id);

ALTER TABLE public.purchased_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own purchased packs"
  ON public.purchased_packs
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Coaches can view packs sold to their clients"
  ON public.purchased_packs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = purchased_packs.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "System can insert purchased packs"
  ON public.purchased_packs
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE TRIGGER set_purchased_packs_updated_at
  BEFORE UPDATE ON public.purchased_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.purchased_packs TO authenticated;


-- ============================================
-- 7. BOOKINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_purchase_id UUID REFERENCES public.purchased_packs(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  video_room_id TEXT,
  notes TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  rescheduled_from UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_coach_id ON public.bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_coach_scheduled ON public.bookings(coach_id, scheduled_at);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own bookings"
  ON public.bookings
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Coaches can view their bookings"
  ON public.bookings
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = bookings.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Clients can create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Participants can update bookings"
  ON public.bookings
  FOR UPDATE
  USING (
    auth.uid() = client_id
    OR EXISTS (
      SELECT 1 FROM public.coach_profiles 
      WHERE coach_profiles.id = bookings.coach_id 
      AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all bookings"
  ON public.bookings
  FOR ALL
  USING (public.is_admin());

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;


-- ============================================
-- 8. CUSTOM PROGRAMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'workout' CHECK (type IN ('workout', 'meal', 'both')),
  program_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_programs_coach_id ON public.custom_programs(coach_id);
CREATE INDEX IF NOT EXISTS idx_custom_programs_client_id ON public.custom_programs(client_id);
CREATE INDEX IF NOT EXISTS idx_custom_programs_created_at ON public.custom_programs(created_at DESC);

ALTER TABLE public.custom_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view programs assigned to them"
  ON public.custom_programs
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Coaches can view programs they created"
  ON public.custom_programs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = custom_programs.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Coaches can create programs"
  ON public.custom_programs
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = custom_programs.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Coaches can update own programs"
  ON public.custom_programs
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = custom_programs.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Coaches can delete own programs"
  ON public.custom_programs
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = custom_programs.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE TRIGGER set_custom_programs_updated_at
  BEFORE UPDATE ON public.custom_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_programs TO authenticated;


-- ============================================
-- 9. CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(coach_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_coach_id ON public.conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC NULLS LAST);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own conversations"
  ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = client_id
    OR EXISTS (
      SELECT 1 FROM public.coach_profiles 
      WHERE coach_profiles.id = conversations.coach_id 
      AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    OR EXISTS (
      SELECT 1 FROM public.coach_profiles 
      WHERE coach_profiles.id = conversations.coach_id 
      AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update conversations"
  ON public.conversations
  FOR UPDATE
  USING (
    auth.uid() = client_id
    OR EXISTS (
      SELECT 1 FROM public.coach_profiles 
      WHERE coach_profiles.id = conversations.coach_id 
      AND coach_profiles.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;


-- ============================================
-- 10. MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'voice')),
  media_url TEXT,
  media_metadata JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can view messages"
  ON public.messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.coach_profiles cp 
        WHERE cp.id = c.coach_id 
        AND cp.user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Conversation participants can send messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.coach_profiles cp 
          WHERE cp.id = c.coach_id 
          AND cp.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.messages
  FOR UPDATE
  USING (
    auth.uid() != sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.coach_profiles cp 
          WHERE cp.id = c.coach_id 
          AND cp.user_id = auth.uid()
        )
      )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;


-- ============================================
-- 11. WALLETS
-- ============================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL UNIQUE REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallets_coach_id ON public.wallets(coach_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own wallet"
  ON public.wallets
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = wallets.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all wallets"
  ON public.wallets
  FOR SELECT
  USING (public.is_admin());

CREATE TRIGGER set_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT ON public.wallets TO authenticated;


-- ============================================
-- 12. TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earning', 'payout', 'refund', 'platform_fee')),
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  stripe_transfer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_created ON public.transactions(wallet_id, created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own transactions"
  ON public.transactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.wallets w
    JOIN public.coach_profiles cp ON cp.id = w.coach_id
    WHERE w.id = transactions.wallet_id
    AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all transactions"
  ON public.transactions
  FOR SELECT
  USING (public.is_admin());

GRANT SELECT ON public.transactions TO authenticated;


-- ============================================
-- 13. COACH CLIENT NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS public.coach_client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coach_client_notes_coach_client 
  ON public.coach_client_notes(coach_id, client_id);
CREATE INDEX IF NOT EXISTS idx_coach_client_notes_created_at 
  ON public.coach_client_notes(created_at DESC);

ALTER TABLE public.coach_client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own client notes"
  ON public.coach_client_notes
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.coach_profiles 
    WHERE coach_profiles.id = coach_client_notes.coach_id 
    AND coach_profiles.user_id = auth.uid()
  ));

CREATE TRIGGER set_coach_client_notes_updated_at
  BEFORE UPDATE ON public.coach_client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_client_notes TO authenticated;


-- ============================================
-- 14. PUSH TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;


-- ============================================
-- 15. NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_message', 
    'booking_confirmed', 
    'booking_cancelled', 
    'booking_reminder',
    'payment_received', 
    'new_review', 
    'program_received', 
    'coach_verified'
  )),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
