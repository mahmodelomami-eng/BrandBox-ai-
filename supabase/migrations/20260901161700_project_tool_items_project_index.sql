BEGIN;

CREATE INDEX IF NOT EXISTS idx_project_tool_items_project_id
  ON public.project_tool_items(project_id);

COMMIT;
