-- Add dietary preferences, allergies, and dislikes to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS food_allergies TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS food_dislikes TEXT[] DEFAULT '{}';

-- Create an index on dietary_preferences for faster filtering if needed
CREATE INDEX IF NOT EXISTS idx_user_profiles_dietary ON public.user_profiles USING GIN (dietary_preferences);
CREATE INDEX IF NOT EXISTS idx_user_profiles_allergies ON public.user_profiles USING GIN (food_allergies);
CREATE INDEX IF NOT EXISTS idx_user_profiles_dislikes ON public.user_profiles USING GIN (food_dislikes);

-- Note: RLS policies on user_profiles already allow authenticated users to UPDATE their own profiles,
-- so no new policies are required for these columns.
