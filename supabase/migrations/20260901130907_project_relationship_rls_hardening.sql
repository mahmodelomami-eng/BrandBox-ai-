-- #87 project relationship tenant-isolation hardening.
-- Applied and verified on brandbox-ai-staging before repository commit.
-- No data mutation: this migration only tightens RLS write checks.

ALTER POLICY "Users can manage own generations" ON public.generations
USING (
  auth.uid() = user_id
  OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')
)
WITH CHECK (
  (
    auth.uid() = user_id
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_id
          AND p.owner_id = auth.uid()
      )
    )
  )
  OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')
);

ALTER POLICY "Users can manage own assets" ON public.assets
USING (
  auth.uid() = user_id
  OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')
)
WITH CHECK (
  (
    auth.uid() = user_id
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_id
          AND p.owner_id = auth.uid()
      )
    )
    AND (
      generation_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.generations g
        WHERE g.id = generation_id
          AND g.user_id = auth.uid()
      )
    )
  )
  OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')
);
