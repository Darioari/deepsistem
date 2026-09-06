export const DEFAULT_TENANT = 'pripsico';
export const RESERVED_TENANT_SLUGS = new Set([
  'api', '_next', 'admin', 'aceitar-termo', 'agendar', 'assinatura', 'atendimento', 'cadastro',
  'checkout', 'dashboard', 'email-confirmado', 'esqueci-senha', 'form', 'login',
  'onboarding-profissional', 'privacidade', 'quiz', 'redefinir-senha', 'termos',
]);
const TENANT_ALIASES: Record<string, string> = {
  'priscila-xavier': 'pripsico',
};

export function canonicalTenant(value: unknown): string {
  const base = String(value || DEFAULT_TENANT).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || DEFAULT_TENANT;
  return TENANT_ALIASES[base] || base;
}

export function tenantAliases(tenant: unknown): string[] {
  const canonical = canonicalTenant(tenant);
  const aliases = new Set<string>([canonical]);
  for (const [alias, target] of Object.entries(TENANT_ALIASES)) {
    if (target === canonical) aliases.add(alias);
  }
  return Array.from(aliases);
}

export function normalizeTenant(value: unknown) {
  return canonicalTenant(value);
}
export function isTenantSlug(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return false;
  const slug = normalizeTenant(raw);
  return slug.length >= 3 && slug.length <= 48 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) && !RESERVED_TENANT_SLUGS.has(slug);
}
const PLATFORM_ROUTES = RESERVED_TENANT_SLUGS;
function tenantCandidateFromPathname(pathname: string) {
  const first = pathname.split('/').filter(Boolean)[0];
  return first && !PLATFORM_ROUTES.has(first) && isTenantSlug(first) ? normalizeTenant(first) : undefined;
}
export function tenantFromPathname(pathname: string) { return tenantCandidateFromPathname(pathname) || DEFAULT_TENANT; }
export function tenantFrom(request: Request, explicit?: unknown) {
  if (explicit) return normalizeTenant(explicit);
  const url = new URL(request.url);
  let refererTenant: string | undefined;
  try { const referer = request.headers.get('referer'); if (referer) refererTenant = tenantCandidateFromPathname(new URL(referer).pathname); } catch {}
  if (refererTenant) return refererTenant;
  const direct = url.searchParams.get('tenant') || request.headers.get('x-tenant-id');
  if (direct) return normalizeTenant(direct);
  const cookie = request.headers.get('cookie')?.match(/(?:^|;\s*)psicsystem_tenant=([^;]+)/)?.[1];
  return normalizeTenant(cookie);
}
export function tenantKey(tenant: string, id: string) { return `${normalizeTenant(tenant)}:${id}`; }
