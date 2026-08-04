import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client when NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 * are configured, otherwise null. Every function in lib/api/* is written to check
 * this first and fall back to the local mock dataset when it's absent, so the
 * app runs fully offline today and only needs these two env vars — plus swapping
 * each lib/api/* function body from the mock store to a real `.from(...)` query —
 * to go live against a real Supabase project. No UI code changes required.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && anonKey ? createClient(url, anonKey) : null;
  return cached;
}

export const isSupabaseConfigured = (): boolean => getSupabaseClient() !== null;
