import "server-only";
import { createClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables. Please configure .env.local");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Fetch all rows from a Supabase query by paginating through 1000-row pages.
 * Pass a function that builds the query (without .range()) — pagination is added automatically.
 */
export async function fetchAllRows<T>(
  buildQuery: (range: { from: number; to: number }) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery({ from, to: from + PAGE_SIZE - 1 });
    if (error) throw new Error(`Paginated fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}
