// Client Supabase (clé anon publique, protection réelle = RLS + Edge Functions côté serveur).
const ADMIN_EMAIL = 'axelajavon@gmail.com';
const supabaseClient = window.supabase.createClient(window.KELPY_SUPABASE_URL, window.KELPY_SUPABASE_ANON_KEY);

/** Redirige vers le login si pas connecté avec le compte fondateur. À appeler en haut de chaque page protégée. */
async function requireAdminSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session || session.user.email !== ADMIN_EMAIL) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * `filterTestAccounts`: pour `profiles`, exclut les comptes de démo/review (mêmes que la
 * recherche d'amis dans l'app). `eventName`: pour `analytics_events`, filtre sur ce nom d'event.
 */
async function countInRange(table, from, to, filterTestAccounts, eventName) {
  let query = supabaseClient
    .from(table)
    .select('id', { count: 'exact', head: true })
    .gte('created_at', from.toISOString())
    .lt('created_at', to.toISOString());
  if (filterTestAccounts) query = query.eq('is_test_account', false);
  if (eventName) query = query.eq('event_name', eventName);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Comptes par jour sur `days` jours se terminant à `endExclusive` (exclu) — pour les mini-graphiques. */
async function dailyCounts(table, endExclusive, days, filterTestAccounts, eventName) {
  const start = addDays(startOfDay(endExclusive), -days);
  let query = supabaseClient
    .from(table)
    .select('created_at')
    .gte('created_at', start.toISOString())
    .lt('created_at', endExclusive.toISOString());
  if (filterTestAccounts) query = query.eq('is_test_account', false);
  if (eventName) query = query.eq('event_name', eventName);
  const { data, error } = await query;
  if (error) throw error;

  const buckets = new Array(days).fill(0);
  for (const row of data ?? []) {
    const dayIndex = Math.floor((new Date(row.created_at) - start) / 86400000);
    if (dayIndex >= 0 && dayIndex < days) buckets[dayIndex]++;
  }
  return buckets;
}
