'use client';

import { createBrowserSupabaseClient } from '../supabase/client';

export async function listUserProjects() {
  const supabase = createBrowserSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('يجب تسجيل الدخول أولاً.');

  const { data, error } = await supabase
    .from('projects')
    .select('id,owner_id,name,type,description,industry,target_audience,language,tone,thumbnail_url,created_at,updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createUserProject(input) {
  const supabase = createBrowserSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('يجب تسجيل الدخول أولاً.');

  const payload = {
    owner_id: user.id,
    name: input.name?.trim() || 'مشروع جديد',
    type: input.type || 'صورة + نص',
    description: input.description || null,
    industry: input.industry || null,
    target_audience: input.targetAudience || null,
    language: input.language || 'العربية',
    tone: input.tone || 'احترافي',
  };

  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select('id,owner_id,name,type,description,industry,target_audience,language,tone,thumbnail_url,created_at,updated_at')
    .single();

  if (error) {
throw error;
  }

  if (!data) {
    throw new Error("Supabase لم يُرجع المشروع بعد عملية الإنشاء.");
  }

  return data;
}

export async function updateUserProject(projectId, input) {
  const supabase = createBrowserSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('يجب تسجيل الدخول أولاً.');

  const patch = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.description !== undefined ? { description: input.description || null } : {}),
    ...(input.industry !== undefined ? { industry: input.industry || null } : {}),
    ...(input.targetAudience !== undefined ? { target_audience: input.targetAudience || null } : {}),
    ...(input.language !== undefined ? { language: input.language } : {}),
    ...(input.tone !== undefined ? { tone: input.tone } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .select('id,owner_id,name,type,description,industry,target_audience,language,tone,thumbnail_url,created_at,updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUserProject(projectId) {
  const supabase = createBrowserSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('يجب تسجيل الدخول أولاً.');

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('owner_id', user.id);

  if (error) throw error;
}
