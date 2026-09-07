import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { tenantFrom } from '@/lib/tenant';
import { authorizedTenant, forbidden } from '@/lib/auth-session';
import { DESIGN_TOKENS } from '@/lib/design-system';

type Brand = {
  cor_primaria: string;
  cor_secundaria: string;
  tema_padrao: string;
  logotipo_url: string;
  logotipo_tamanho?: number;
  background_url: string;
  video_background_url: string;
  tenant_id?: string;
};
type Store = { tenants: Record<string, Brand> };
const FILE = path.join(process.cwd(), 'backend', 'data', 'brand.json');
const fallback = (): Brand => ({
  cor_primaria: DESIGN_TOKENS.color.primary,
  cor_secundaria: DESIGN_TOKENS.color.secondary,
  tema_padrao: 'light',
  logotipo_url: '',
  logotipo_tamanho: 48,
  background_url: '',
  video_background_url: '',
});

function read(): Store {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, unknown>;
    if (data.tenants && typeof data.tenants === 'object') {
      const tenants = Object.fromEntries(Object.entries(data.tenants as Record<string, unknown>).map(([tenant, brand]) => [tenant, { ...fallback(), ...(brand as Partial<Brand>), tenant_id: tenant, logotipo_tamanho: Number((brand as Partial<Brand>)?.logotipo_tamanho) || 48 }]));
      return { tenants };
    }
    return { tenants: { pripsico: { ...fallback(), ...(data as Partial<Brand>), tenant_id: 'pripsico', logotipo_tamanho: Number((data as Partial<Brand>)?.logotipo_tamanho) || 48 } } };
  } catch {
    return { tenants: {} };
  }
}

function write(data: Store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function GET(request: Request) {
  const tenant = tenantFrom(request);
  const store = read();
  const brand = store.tenants[tenant] || { ...fallback(), tenant_id: tenant };
  // Registros antigos apontavam para o logo da própria plataforma. Isso não é
  // uma personalização do profissional e deve continuar usando o fallback do sistema.
  if (brand.logotipo_url === '/api/brand/platform-logo') brand.logotipo_url = '';
  return NextResponse.json(brand);
}

export async function PUT(request: Request) {
  try {
    const tenant = authorizedTenant(request);
    if (!tenant) return forbidden();
    const body = await request.json() as Partial<Brand>;
    const store = read();
    const current = store.tenants[tenant] || fallback();
    const rawTamanho = body.logotipo_tamanho !== undefined ? Number(body.logotipo_tamanho) : (current.logotipo_tamanho || 48);
    const brand: Brand = {
      cor_primaria: String(body.cor_primaria || current.cor_primaria),
      cor_secundaria: String(body.cor_secundaria || current.cor_secundaria),
      tema_padrao: body.tema_padrao === 'dark' ? 'dark' : 'light',
      logotipo_url: String(body.logotipo_url || ''),
      logotipo_tamanho: !isNaN(rawTamanho) && rawTamanho >= 20 ? Math.min(200, Math.max(20, rawTamanho)) : 48,
      background_url: String(body.background_url || ''),
      video_background_url: String(body.video_background_url || current.video_background_url || ''),
      tenant_id: tenant,
    };
    store.tenants[tenant] = brand;
    write(store);
    return NextResponse.json({ message: 'Identidade visual atualizada!', brand });
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar marca.' }, { status: 500 });
  }
}
