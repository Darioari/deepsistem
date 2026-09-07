import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { addAcceptances, getAcceptances, getTerms, readInvite, consumeInvite } from '@/lib/care-terms';
import { postgresEnabled, withTenantDatabase } from '@/lib/postgres';
import { getTenantCustomLogo } from '@/lib/tenant-brand-server';

const PATIENTS_FILE = path.join(process.cwd(), 'backend', 'data', 'pacientes.json');
function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
async function getPatient(id: string, tenant: string) { if (postgresEnabled()) return withTenantDatabase(tenant, database => database.get<Record<string, unknown>>('patients', id)); try { const patients = JSON.parse(fs.readFileSync(PATIENTS_FILE, 'utf8')) as Array<Record<string, unknown>>; return patients.find(item => String(item.id) === id && (item.tenant_id || 'pripsico') === tenant); } catch { return null; } }

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const invite = await readInvite(tokenHash(token));
  if (!invite) return NextResponse.json({ error: 'Este link está inválido, expirado ou já foi utilizado.' }, { status: 410 });
  const patient = await getPatient(invite.patient_id, invite.tenant_id);
  if (!patient) return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
  const terms = (await getTerms(invite.tenant_id)).filter(item => invite.term_ids.includes(item.id));
  const logotipoUrl = getTenantCustomLogo(invite.tenant_id);
  return NextResponse.json({ tenantId: invite.tenant_id, patientName: String(patient.nome || 'pessoa atendida'), terms, expiresAt: invite.expires_at, acceptedTermIds: (await getAcceptances(invite.tenant_id, invite.patient_id)).map(item => item.term_id), logotipoUrl });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const hash = tokenHash(token);
  const pendingInvite = await readInvite(hash);
  if (!pendingInvite) return NextResponse.json({ error: 'Este link está inválido, expirado ou já foi utilizado.' }, { status: 410 });
  const body = await request.json().catch(() => null) as { acceptedTermIds?: string[]; signerName?: string; relationship?: string } | null;
  const terms = (await getTerms(pendingInvite.tenant_id)).filter(item => pendingInvite.term_ids.includes(item.id));
  const accepted = Array.isArray(body?.acceptedTermIds) ? body.acceptedTermIds : [];
  if (!body?.signerName?.trim() || terms.some(item => !accepted.includes(item.id))) return NextResponse.json({ error: 'Leia os termos e confirme todos os itens para continuar.' }, { status: 400 });
  const invite = await consumeInvite(hash);
  if (!invite) return NextResponse.json({ error: 'Este link acabou de ser utilizado ou expirou. Solicite um novo link.' }, { status: 410 });
  const acceptedAt = new Date().toISOString();
  await addAcceptances(terms.map(term => ({ id: crypto.randomUUID(), tenant_id: invite.tenant_id, patient_id: invite.patient_id, term_id: term.id, term_version: term.version, accepted_at: acceptedAt, signer_name: body.signerName!.trim(), relationship: body.relationship?.trim() || 'Pessoa atendida', user_agent: request.headers.get('user-agent') || undefined })));
  return NextResponse.json({ accepted: true, acceptedAt });
}
