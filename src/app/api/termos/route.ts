import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { authorizedTenant, forbidden } from '@/lib/auth-session';
import { patientBelongsToTenant } from '@/lib/patient-access';
import { createInvite, getAcceptances, getTerms, saveTerms, type CareTerm } from '@/lib/care-terms';
import { postgresEnabled, withTenantDatabase } from '@/lib/postgres';
import { checkPlanAccess } from '@/lib/plan-access';

const PATIENTS_FILE = path.join(process.cwd(), 'backend', 'data', 'pacientes.json');

function readPatients() {
  try { return JSON.parse(fs.readFileSync(PATIENTS_FILE, 'utf8')) as Array<Record<string, unknown>>; } catch { return []; }
}

function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }

export async function GET(request: Request) {
  const access = checkPlanAccess(request, 'terms');
  if (!access.ok) return access.response;
  const tenant = access.tenant;
  const patientId = new URL(request.url).searchParams.get('patientId') || undefined;
  const patients = (postgresEnabled() ? await withTenantDatabase(tenant, database => database.list<Record<string, unknown>>('patients')) : readPatients().filter(item => (item.tenant_id || 'pripsico') === tenant)).map(item => ({ id: String(item.id), nome: String(item.nome || ''), email: String(item.email || ''), telefone: String(item.telefone || item.responsavel_telefone || '') }));
  return NextResponse.json({ terms: await getTerms(tenant), acceptances: await getAcceptances(tenant, patientId), patients });
}

export async function PUT(request: Request) {
  const access = checkPlanAccess(request, 'terms');
  if (!access.ok) return access.response;
  const tenant = access.tenant;
  const body = await request.json().catch(() => null) as Partial<CareTerm> | null;
  if (!body?.title?.trim() || !body.content?.trim()) return NextResponse.json({ error: 'Informe o título e o conteúdo do termo.' }, { status: 400 });
  const terms = await getTerms(tenant);
  const id = body.id?.trim() || `personalizado-${randomBytes(5).toString('hex')}`;
  const next: CareTerm = { id, title: body.title.trim(), description: body.description?.trim() || 'Termo personalizado do espaço profissional.', content: body.content.trim(), kind: body.kind || 'custom', required: body.required !== false, active: body.active !== false, version: body.version?.trim() || '1.0' };
  const index = terms.findIndex(item => item.id === id);
  if (index >= 0) terms[index] = next; else terms.push(next);
  await saveTerms(tenant, terms);
  return NextResponse.json(next);
}

export async function POST(request: Request) {
  const access = checkPlanAccess(request, 'terms');
  if (!access.ok) return access.response;
  const tenant = access.tenant;
  const body = await request.json().catch(() => null) as { patientId?: string; termIds?: string[] } | null;
  const patientId = String(body?.patientId || '');
  if (!patientId || !(await patientBelongsToTenant(patientId, tenant))) return NextResponse.json({ error: 'Selecione um paciente válido.' }, { status: 400 });
  const terms = (await getTerms(tenant)).filter(item => item.active);
  const selectedIds = Array.isArray(body?.termIds) && body.termIds.length ? body.termIds : terms.map(item => item.id);
  const termIds = terms.filter(item => selectedIds.includes(item.id)).map(item => item.id);
  if (!termIds.length) return NextResponse.json({ error: 'Selecione pelo menos um termo ativo.' }, { status: 400 });
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await createInvite({ token_hash: tokenHash(token), tenant_id: tenant, patient_id: patientId, term_ids: termIds, created_at: new Date().toISOString(), expires_at: expiresAt });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return NextResponse.json({ url: `${baseUrl.replace(/\/$/, '')}/aceitar-termo/${encodeURIComponent(token)}`, expiresAt, termIds });
}
