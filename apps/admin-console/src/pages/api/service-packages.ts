import type { APIRoute } from 'astro';
import { createSupabaseServicePackageRepository } from '@ai-company-os/db';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { getCurrentMembership } from '../../lib/auth/membership';
import { parseDollarsToMinorUnits } from '../../lib/estimates/parse-amount';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership) {
    return redirect('/service-packages');
  }

  const form = await request.formData();
  const name = form.get('name');
  const description = form.get('description');
  const priceInput = form.get('defaultUnitPrice');

  const minorUnits = typeof priceInput === 'string' ? parseDollarsToMinorUnits(priceInput) : null;

  if (typeof name !== 'string' || name.trim().length === 0 || minorUnits === null) {
    return redirect('/service-packages?error=invalid-package-input');
  }

  const servicePackages = createSupabaseServicePackageRepository(locals.supabase);
  const result = await servicePackages.createServicePackage({
    businessId: membership.businessId,
    name: name.trim(),
    description:
      typeof description === 'string' && description.trim().length > 0
        ? description.trim()
        : undefined,
    defaultUnitPrice: createMoney(minorUnits, createCurrencyCode('USD')),
  });

  if (!result.ok) {
    return redirect(`/service-packages?error=${encodeURIComponent(result.error)}`);
  }

  return redirect('/service-packages');
};
