import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required.' }, 401);

  const projectUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!projectUrl || !serviceRoleKey) {
    console.error('Missing Supabase Edge Function configuration.');
    return json({ error: 'Admin service is not configured.' }, 500);
  }

  const adminClient = createClient(projectUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.slice('Bearer '.length);
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) return json({ error: 'Invalid or expired session.' }, 401);

  const { data: role, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (roleError) {
    console.error('Unable to verify admin role:', roleError.message);
    return json({ error: 'Unable to verify admin access.' }, 500);
  }
  if (role?.role !== 'admin') return json({ error: 'Admin access required.' }, 403);
  const { data: status, error: statusError } = await adminClient
    .from('account_status')
    .select('disabled')
    .eq('user_id', user.id)
    .maybeSingle();
  if (statusError) {
    console.error('Unable to verify admin account status:', statusError.message);
    return json({ error: 'Unable to verify admin account status.' }, 500);
  }
  if (status?.disabled) return json({ error: 'This admin account is disabled.' }, 403);

  let input: { action?: unknown; userId?: unknown; page?: unknown };
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  if (input.action === 'list') {
    const page = typeof input.page === 'number' && Number.isInteger(input.page)
      ? Math.min(Math.max(input.page, 1), 100)
      : 1;
    const perPage = 50;
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('Unable to list accounts:', error.message);
      return json({ error: 'Unable to load accounts.' }, 500);
    }

    const userIds = data.users.map(account => account.id);
    const { data: statuses, error: statusesError } = userIds.length
      ? await adminClient.from('account_status').select('user_id, disabled').in('user_id', userIds)
      : { data: [], error: null };
    if (statusesError) {
      console.error('Unable to load account statuses:', statusesError.message);
      return json({ error: 'Unable to load account statuses.' }, 500);
    }
    const disabledById = new Map((statuses ?? []).map(item => [item.user_id, item.disabled]));

    return json({
      accounts: data.users.map(account => ({
        id: account.id,
        email: account.email ?? '',
        createdAt: account.created_at,
        disabled: Boolean(disabledById.get(account.id)) ||
          Boolean(account.banned_until && new Date(account.banned_until).getTime() > Date.now()),
      })),
      hasMore: data.users.length === perPage,
    });
  }

  if (input.action === 'disable' || input.action === 'enable') {
    if (typeof input.userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.userId)) {
      return json({ error: 'A valid account ID is required.' }, 400);
    }
    if (input.userId === user.id) return json({ error: 'You cannot disable your own admin account.' }, 400);

    const disabled = input.action === 'disable';
    if (disabled) {
      const { error: statusUpdateError } = await adminClient.from('account_status').upsert(
        { user_id: input.userId, disabled: true, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      if (statusUpdateError) {
        console.error('Unable to update account access policy:', statusUpdateError.message);
        return json({ error: 'Unable to update account status.' }, 500);
      }
    }

    const { error } = await adminClient.auth.admin.updateUserById(input.userId, {
      ban_duration: disabled ? '876000h' : 'none',
    });
    if (error) {
      console.error('Unable to update account status:', error.message);
      return json({ error: 'Unable to update account status.' }, 500);
    }
    if (!disabled) {
      const { error: statusUpdateError } = await adminClient.from('account_status').upsert(
        { user_id: input.userId, disabled: false, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      if (statusUpdateError) {
        console.error('Unable to restore account access policy:', statusUpdateError.message);
        return json({ error: 'Account was unbanned, but access is still disabled. Please retry enabling the account.' }, 500);
      }
    }
    return json({ success: true });
  }

  return json({ error: 'Unsupported admin action.' }, 400);
});
