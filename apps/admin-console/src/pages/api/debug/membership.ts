import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * TEMPORARY diagnostic route for the production membership-loading
 * incident - returns the raw memberships query result for the current
 * authenticated user directly in the HTTP response, so the root cause
 * is visible without depending on interpreting Vercel's Runtime Logs
 * UI. Gated behind authentication (this path is not in
 * PUBLIC_PATH_PREFIXES, so middleware.ts already requires a session
 * before this handler ever runs) - only ever exposes the calling
 * user's own data, never another tenant's. Remove once the incident is
 * resolved.
 */
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'not_authenticated' }, null, 2), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { data, error } = await locals.supabase
    .from('memberships')
    .select('id, business_id, role, businesses(name), membership_roles(role)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return new Response(
    JSON.stringify(
      {
        authenticatedUserId: user.id,
        authenticatedUserEmail: user.email ?? null,
        queryError: error
          ? { code: error.code, message: error.message, details: error.details, hint: error.hint }
          : null,
        rawData: data,
      },
      null,
      2,
    ),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
};
