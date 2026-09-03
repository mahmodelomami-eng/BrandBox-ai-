import { NextRequest, NextResponse } from 'next/server';
import { authenticateActiveUser } from '@/lib/auth/user-auth';
import { createPrivilegedSupabaseClient } from '@/lib/supabase/server';

const PROJECT_TYPES = new Set(['صورة', 'محادثة', 'فيديو', 'صوت']);
const PROTECTED_FIELDS = new Set([
  'id',
  'owner_id',
  'ownerId',
  'user_id',
  'userId',
  'role',
  'credit_balance',
  'creditBalance',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
  'deleted_at',
  'deletedAt',
  'purge_after',
  'purgeAfter',
]);

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('INVALID_PROJECT_FIELD');
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error('PROJECT_FIELD_TOO_LONG');
  return normalized;
}

function projectResponse(project: {
  id: string;
  name: string;
  type: string;
  description: string | null;
  industry: string | null;
  target_audience: string | null;
  language: string;
  tone: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: project.id,
    name: project.name,
    type: project.type,
    description: project.description || null,
    industry: project.industry || null,
    targetAudience: project.target_audience || null,
    language: project.language,
    tone: project.tone,
    thumbnailUrl: project.thumbnail_url || null,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

export async function POST(request: NextRequest) {
  const auth = await authenticateActiveUser(request);
  if (!auth) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (Object.keys(body).some((key) => PROTECTED_FIELDS.has(key))) {
    return NextResponse.json({ error: 'PROTECTED_PROJECT_FIELD' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const type = typeof body.type === 'string' ? body.type.trim() : 'صورة';
  if (name.length < 2 || name.length > 120 || !PROJECT_TYPES.has(type)) {
    return NextResponse.json({ error: 'INVALID_PROJECT' }, { status: 400 });
  }

  let description: string | null;
  let industry: string | null;
  let targetAudience: string | null;
  try {
    description = optionalText(body.description, 1200);
    industry = optionalText(body.industry, 160);
    targetAudience = optionalText(body.targetAudience, 600);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INVALID_PROJECT_FIELD';
    return NextResponse.json({ error: code }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const { data: project, error } = await database.from('projects').insert({
    owner_id: auth.user.id,
    name,
    type,
    description,
    industry,
    target_audience: targetAudience,
    // Keep database-authoritative defaults for id, language, tone, timestamps and retention fields.
  }).select('id,name,type,description,industry,target_audience,language,tone,thumbnail_url,created_at,updated_at').single();

  if (error || !project) {
    return NextResponse.json({ error: 'PROJECT_CREATE_FAILED' }, { status: 503 });
  }

  return NextResponse.json({ project: projectResponse(project) }, { status: 201 });
}
