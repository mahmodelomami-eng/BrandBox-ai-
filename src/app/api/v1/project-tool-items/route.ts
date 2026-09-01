import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';

const ALLOWED_TOOLS = new Set(['video', 'audio']);

async function ownsProject(userId: string, projectId: string) {
  const { data, error } = await createPrivilegedSupabaseClient()
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', userId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function GET(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { user } = auth;

  const projectId = request.nextUrl.searchParams.get('projectId') || '';
  const tool = request.nextUrl.searchParams.get('tool') || '';
  if (!projectId || !ALLOWED_TOOLS.has(tool)) {
    return NextResponse.json({ error: 'INVALID_QUERY' }, { status: 400 });
  }
  if (!(await ownsProject(user.id, projectId))) {
    return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
  }

  const { data, error } = await createPrivilegedSupabaseClient()
    .from('project_tool_items')
    .select('id,project_id,tool_type,item_type,prompt,settings,status,result_url,result_content,created_at,updated_at')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .eq('tool_type', tool)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: 'TOOL_ITEMS_UNAVAILABLE' }, { status: 503 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { user } = auth;

  let body: {
    projectId?: string;
    tool?: string;
    prompt?: string;
    settings?: Record<string, unknown>;
    status?: string;
    itemType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const projectId = body.projectId?.trim() || '';
  const tool = body.tool?.trim() || '';
  const prompt = body.prompt?.trim() || '';
  if (!projectId || !ALLOWED_TOOLS.has(tool) || !prompt || prompt.length > 4000) {
    return NextResponse.json({ error: 'INVALID_TOOL_ITEM' }, { status: 400 });
  }
  if (!(await ownsProject(user.id, projectId))) {
    return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
  }

  const allowedStatuses = new Set(['draft', 'queued', 'processing', 'completed', 'failed']);
  const allowedItemTypes = new Set(['draft', 'generation']);
  const status = allowedStatuses.has(body.status || '') ? body.status : 'draft';
  const itemType = allowedItemTypes.has(body.itemType || '') ? body.itemType : 'draft';

  const { data, error } = await createPrivilegedSupabaseClient()
    .from('project_tool_items')
    .insert({
      user_id: user.id,
      project_id: projectId,
      tool_type: tool,
      item_type: itemType,
      prompt,
      settings: body.settings || {},
      status,
    })
    .select('id,project_id,tool_type,item_type,prompt,settings,status,result_url,result_content,created_at,updated_at')
    .single();

  if (error || !data) return NextResponse.json({ error: 'TOOL_ITEM_SAVE_FAILED' }, { status: 503 });
  return NextResponse.json({ item: data }, { status: 201 });
}
