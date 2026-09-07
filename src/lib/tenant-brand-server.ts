import fs from 'fs';
import path from 'path';
import { normalizeTenant } from '@/lib/tenant';
import { PLATFORM_LOGO_URL } from '@/lib/platform-brand';

const BRAND_FILE = path.join(process.cwd(), 'backend', 'data', 'brand.json');

export function getTenantCustomLogo(tenant?: string): string {
  try {
    if (!fs.existsSync(BRAND_FILE)) return '';
    const data = JSON.parse(fs.readFileSync(BRAND_FILE, 'utf8'));
    const t = tenant ? normalizeTenant(tenant) : 'pripsico';
    const brand = data?.tenants?.[t] || data?.tenants?.pripsico;
    const logo = brand?.logotipo_url;
    if (typeof logo === 'string' && logo.trim() && logo !== PLATFORM_LOGO_URL && !logo.includes('platform-logo')) {
      return logo.trim();
    }
  } catch {}
  return '';
}

export function getTenantBrand(tenant?: string): { logotipo_url: string; logotipo_tamanho: number } {
  try {
    if (!fs.existsSync(BRAND_FILE)) return { logotipo_url: '', logotipo_tamanho: 48 };
    const data = JSON.parse(fs.readFileSync(BRAND_FILE, 'utf8'));
    const t = tenant ? normalizeTenant(tenant) : 'pripsico';
    const brand = data?.tenants?.[t] || data?.tenants?.pripsico;
    const logo = brand?.logotipo_url;
    const validLogo = typeof logo === 'string' && logo.trim() && logo !== PLATFORM_LOGO_URL && !logo.includes('platform-logo')
      ? logo.trim()
      : '';
    const tamanho = Number(brand?.logotipo_tamanho) || 48;
    return { logotipo_url: validLogo, logotipo_tamanho: tamanho };
  } catch {}
  return { logotipo_url: '', logotipo_tamanho: 48 };
}

export function getTenantCustomLogoSize(tenant?: string): number {
  return getTenantBrand(tenant).logotipo_tamanho;
}
