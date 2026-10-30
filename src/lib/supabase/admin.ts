import "server-only";
import { createClient } from "@supabase/supabase-js";
// Service-role client: bypasses RLS. Use ONLY on the server, and only after verifying the caller is an admin.
export const createAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
