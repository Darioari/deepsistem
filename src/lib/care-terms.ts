import fs from 'fs';
import path from 'path';
import { postgresEnabled, withPublicRecord, withTenantDatabase } from '@/lib/postgres';

export type CareTerm = {
  id: string;
  title: string;
  description: string;
  content: string;
  kind: 'ai' | 'care' | 'platform' | 'custom';
  required: boolean;
  active: boolean;
  version: string;
};

export type CareAcceptance = {
  id: string;
  tenant_id: string;
  patient_id: string;
  term_id: string;
  term_version: string;
  accepted_at: string;
  signer_name: string;
  relationship: string;
  user_agent?: string;
};

export type CareInvite = {
  token_hash: string;
  tenant_id: string;
  patient_id: string;
  term_ids: string[];
  created_at: string;
  expires_at: string;
  used_at?: string;
};

type TermsStore = { tenants: Record<string, CareTerm[]> };
type AcceptanceStore = { acceptances: CareAcceptance[] };
type InviteStore = { invites: CareInvite[] };

const DATA_DIR = path.join(process.cwd(), 'backend', 'data');
const TERMS_FILE = path.join(DATA_DIR, 'termos-atendimento.json');
const ACCEPTANCES_FILE = path.join(DATA_DIR, 'termos-aceites.json');
const INVITES_FILE = path.join(DATA_DIR, 'termos-convites.json');

export const defaultCareTerms: CareTerm[] = [
  {
    id: 'atendimento', title: 'Termo de atendimento', description: 'Informações sobre o acompanhamento, registros e comunicação profissional.', kind: 'care', required: true, active: true, version: '1.0',
    content: 'Este termo explica como será organizado o acompanhamento profissional, a comunicação e o registro das informações necessárias ao cuidado. O profissional responsável apresentará as condições específicas do atendimento, horários, valores, cancelamentos e canais de contato. As informações serão tratadas com sigilo e utilizadas somente para as finalidades informadas, respeitando a legislação e as regras profissionais aplicáveis. Gravações e transcrições não devem ser realizadas sem informação clara e consentimento adequado.',
  },
  {
    id: 'uso-ia', title: 'Termo de uso assistido de IA', description: 'Autoriza o uso assistido da Aura para organizar transcrições e anotações.', kind: 'ai', required: true, active: true, version: '1.0',
    content: 'O DeePsistem pode oferecer recursos de inteligência artificial para organizar anotações e transcrições em rascunhos de apoio. A IA não realiza diagnóstico, não decide condutas e não substitui o profissional. O conteúdo gerado deve ser revisado, corrigido e validado antes de qualquer uso. O profissional continua responsável por iniciar o recurso somente quando houver informação clara, fundamento adequado e consentimento aplicável. O aceite pode ser revogado ou atualizado conforme orientação do profissional responsável.',
  },
  {
    id: 'plataforma', title: 'Termo da plataforma', description: 'Explica o uso seguro do espaço digital e dos dados necessários à operação.', kind: 'platform', required: true, active: true, version: '1.0',
    content: 'O DeePsistem fornece um espaço digital para organizar agenda, comunicação, documentos e registros do acompanhamento. Os dados são tratados para prestar as funcionalidades, manter a segurança e cumprir obrigações aplicáveis. O profissional responsável continua sendo o contato principal para dúvidas sobre o atendimento e sobre os registros clínicos. O acesso deve ser individual e os conteúdos não devem ser compartilhados fora das finalidades autorizadas.',
  },
];

function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return fallback; }
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

export async function getTerms(tenant: string) {
  if (postgresEnabled()) {
    return withTenantDatabase(tenant, async database => {
      const current = await database.list<CareTerm>('terms');
      if (current.length) return current;
      const defaults = defaultCareTerms.map(item => ({ ...item, tenant_id: tenant }));
      for (const term of defaults) await database.put('terms', term.id, term);
      return defaults;
    });
  }
  const store = readJson<TermsStore>(TERMS_FILE, { tenants: {} });
  if (!store.tenants[tenant]?.length) {
    store.tenants[tenant] = defaultCareTerms.map(item => ({ ...item }));
    writeJson(TERMS_FILE, store);
  }
  return store.tenants[tenant];
}

export async function saveTerms(tenant: string, terms: CareTerm[]) {
  if (postgresEnabled()) {
    return withTenantDatabase(tenant, async database => {
      const existing = await database.list<CareTerm>('terms');
      const nextIds = new Set(terms.map(term => term.id));
      for (const term of existing) if (!nextIds.has(term.id)) await database.remove('terms', term.id);
      for (const term of terms) await database.put('terms', term.id, { ...term, tenant_id: tenant });
      return terms;
    });
  }
  const store = readJson<TermsStore>(TERMS_FILE, { tenants: {} });
  store.tenants[tenant] = terms;
  writeJson(TERMS_FILE, store);
}

export async function getAcceptances(tenant: string, patientId?: string) {
  if (postgresEnabled()) {
    const items = await withTenantDatabase(tenant, database => database.list<CareAcceptance>('term_acceptances'));
    return items.filter(item => !patientId || item.patient_id === patientId);
  }
  const store = readJson<AcceptanceStore>(ACCEPTANCES_FILE, { acceptances: [] });
  return store.acceptances.filter(item => item.tenant_id === tenant && (!patientId || item.patient_id === patientId));
}

export async function hasAcceptedTerm(tenant: string, patientId: string, termId: string) {
  return (await getAcceptances(tenant, patientId)).some(item => item.term_id === termId);
}

export async function addAcceptances(items: CareAcceptance[]) {
  if (postgresEnabled()) {
    const grouped = new Map<string, CareAcceptance[]>();
    for (const item of items) grouped.set(item.tenant_id, [...(grouped.get(item.tenant_id) || []), item]);
    for (const [tenant, tenantItems] of grouped) await withTenantDatabase(tenant, async database => { for (const item of tenantItems) await database.put('term_acceptances', item.id, item); });
    return;
  }
  const store = readJson<AcceptanceStore>(ACCEPTANCES_FILE, { acceptances: [] });
  store.acceptances.push(...items);
  writeJson(ACCEPTANCES_FILE, store);
}

export async function createInvite(invite: CareInvite) {
  if (postgresEnabled()) return withTenantDatabase(invite.tenant_id, async database => {
    const existing = await database.list<CareInvite>('term_invites');
    for (const item of existing) if (item.patient_id === invite.patient_id && !item.used_at) await database.remove('term_invites', item.token_hash);
    await database.put('term_invites', invite.token_hash, invite);
  });
  const store = readJson<InviteStore>(INVITES_FILE, { invites: [] });
  store.invites = store.invites.filter(item => !(item.tenant_id === invite.tenant_id && item.patient_id === invite.patient_id && !item.used_at));
  store.invites.push(invite);
  writeJson(INVITES_FILE, store);
}

export async function readInvite(tokenHash: string) {
  if (postgresEnabled()) return withPublicRecord(tokenHash, async database => database.get<CareInvite>('term_invites', tokenHash));
  const store = readJson<InviteStore>(INVITES_FILE, { invites: [] });
  return store.invites.find(item => item.token_hash === tokenHash && !item.used_at && new Date(item.expires_at).getTime() > Date.now()) || null;
}

export async function consumeInvite(tokenHash: string) {
  if (postgresEnabled()) return withPublicRecord(tokenHash, async database => {
    const invite = await database.get<CareInvite>('term_invites', tokenHash);
    if (!invite || invite.used_at || new Date(invite.expires_at).getTime() <= Date.now()) return null;
    const consumed = { ...invite, used_at: new Date().toISOString() };
    return (await database.update('term_invites', tokenHash, consumed)) ? consumed : null;
  });
  const store = readJson<InviteStore>(INVITES_FILE, { invites: [] });
  const invite = store.invites.find(item => item.token_hash === tokenHash && !item.used_at && new Date(item.expires_at).getTime() > Date.now());
  if (!invite) return null;
  invite.used_at = new Date().toISOString();
  writeJson(INVITES_FILE, store);
  return invite;
}
