import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfig = {
  configured: Boolean(url && key),
  missing: [
    !url && "VITE_SUPABASE_URL",
    !key && "VITE_SUPABASE_ANON_KEY",
  ].filter((name): name is string => Boolean(name)),
};

export const supabase = url && key
  ? createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null;
