import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

const TOOL_TO_GENERATION: Record<string, string> = {
  images: 'image',
  chat: 'chat',
  video: 'video',
};

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const tool = request.nextUrl.searchParams.get('tool') || 'images';
  if (!['images', 'video', 'chat', 'audio'].includes(tool)) {
    return NextResponse.json({ error: 'INVALID_TOOL' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const { data: projects, error: projectsError } = await database
    .from('projects')
    .select('id')
    .eq('owner_id', user.id);

  if (projectsError) return NextResponse.json({ error: 'PROJECT_STATS_UNAVAILABLE' }, { status: 503 });

  const generationType = TOOL_TO_GENERATION[tool];
  const counts: Record<string, number> = {};

  await Promise.all((projects || []).map(async ({ id }) => {
    let total = 0;

    if (generationType) {
      const { count, error } = await database
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('project_id', id)
        .eq('generation_type', generationType)
        .eq('status', 'completed');
      if (error) throw error;
      total += count || 0;
    }

    if (tool === 'video' || tool === 'audio') {
      const { count, error } = await database
        .from('project_tool_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('project_id', id)
        .eq('tool_type', tool)
        .eq('item_type', 'generation')
        .eq('status', 'completed');
      if (error) throw error;
      total += count || 0;
    }

    counts[id] = total;
  })).catch(() => null);

  return NextResponse.json({ counts });
}
