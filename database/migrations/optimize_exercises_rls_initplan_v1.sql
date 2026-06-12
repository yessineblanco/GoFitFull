-- Evaluate the request role once per statement instead of once per exercise row.
-- ALTER POLICY preserves the existing command, roles, permissiveness, and WITH CHECK behavior.
ALTER POLICY "Only authenticated users can manage exercises"
  ON public.exercises
  USING ((SELECT auth.role()) = 'authenticated');
