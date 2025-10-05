'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../../lib/supabase/server';

export type RowPayload = {
  id?: string;
  sku: string;
  price: number;
  cost: number;
  fee: number;
  logistics: number;
};

export async function clearAllRowsAction() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('rows').delete().eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}


export async function fetchRowsAction() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { rows: [], authed: false };

  const { data, error } = await supabase
    .from('rows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return { rows: data ?? [], authed: true };
}

export async function upsertRowAction(payload: RowPayload) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const body = { ...payload, user_id: user.id };
  const { error } = await supabase.from('rows').upsert(body, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function deleteRowAction(id: string) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('rows').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}
