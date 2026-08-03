import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase/server-client';
import { getAuthenticatedUser } from './lib/auth/session';
import { isPublicPath } from './lib/auth/public-paths';

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createSupabaseServerClient(context.request, context.cookies);

  if (!supabase) {
    // Configuration missing (see lib/supabase/env.ts) - never silently
    // treat this as "logged out and redirect to login", which would
    // loop forever since login itself needs the same configuration.
    return new Response(
      'Admin console is not configured (missing Supabase environment variables).',
      {
        status: 503,
      },
    );
  }

  context.locals.supabase = supabase;

  if (isPublicPath(context.url.pathname)) {
    return next();
  }

  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    return context.redirect('/login');
  }
  context.locals.user = user;

  return next();
});
