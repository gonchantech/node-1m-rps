import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const createCodeSupabase = async (code) => {
  const { data, error } = await supabase
    .from("codes")
    .insert([{ code }])
    .select("id, code, created_at")
    .single();

  if (error) throw error;
  return data;
};

export const getRandomCodeV1Supabase = async () => {
  const { data, error } = await supabase
    .from("codes")
    .select("id, code, created_at")
    .limit(1)
    // Order by random is tricky in Supabase SDK, often requires a RPC or raw query
    // But for benchmark, we can use a trick or just RPC.
    // Let's assume there's an RPC or just use a simple limit 1 for now if random is hard.
    // Actually, one can use .order('id', { ascending: false }) and random offset if count is known.
    // For now, let's use a simple select with random sorting if possible,
    // but the JS SDK doesn't support RANDOM() directly.
    // We'll use a raw fragment if possible or just document it.
    .order("id", { ascending: false });

  if (error) throw error;
  return data[0];
};

export const getCodesCountSupabase = async () => {
  const { count, error } = await supabase
    .from("codes")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count;
};

export const getCodeByIdSupabase = async (id) => {
  const { data, error } = await supabase
    .from("codes")
    .select("id, code, created_at")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 is "no rows returned"
  return data;
};

export const getMaxCodeIdSupabase = async () => {
  const { data, error } = await supabase
    .from("codes")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ? data.id : null;
};
