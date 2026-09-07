import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { tenantFrom } from '@/lib/tenant';
import { forbidden, sameOriginRequest } from '@/lib/auth-session';
import { checkPlanAccess } from '@/lib/plan-access';
import { postgresEnabled, withTenantDatabase } from '@/lib/postgres';
import { getTenantCustomLogo } from '@/lib/tenant-brand-server';

type Question = { id: string; label: string; type: 'text' | 'textarea' | 'select'; required: boolean; options?: string[] };
type FormConfig = { id?: string; slug: string; title: string; description: string; active: boolean; questions: Question[]; createdAt?: string; updatedAt?: string };
type Payment = { pix: boolean; card: boolean; installments: number; pixKey: string; amount: number; gateway: 'manual_pix' | 'asaas' | 'mercado_pago' };
type FormResponseItem = { id: string; label: string; answer: string };
type ResponseRecord = { id: string; tenant: string; patientId?: string; formSlug: string; formTitle?: string; answers: Record<string, string>; items?: FormResponseItem[]; createdAt: string; paymentStatus: string };
type TenantData = { forms: Record<string, FormConfig>; payment: Payment };
type Store = { tenants: Record<string, TenantData>; responses: ResponseRecord[] };
type LegacyStore = { forms?: Record<string, FormConfig>; payment?: Payment; responses?: ResponseRecord[]; tenants?: Record<string, TenantData> };

const FILE = path.join(process.cwd(), 'backend', 'data', 'formularios.json');
const PATIENTS_FILE = path.join(process.cwd(), 'backend', 'data', 'pacientes.json');
const defaultTenant = (): TenantData => ({ forms: { 'entrevista-preliminar': { id: 'entrevista-preliminar', slug: 'entrevista-preliminar', title: 'Entrevista Preliminar', description: 'Este formulário ajuda o profissional a conhecer sua demanda inicial. Ele não substitui a entrevista clínica nem produz diagnóstico automático.', active: true, questions: [{ id: 'motivo', label: 'O que motivou você a buscar atendimento neste momento?', type: 'textarea', required: true }, { id: 'expectativas', label: 'O que você espera encontrar neste processo?', type: 'textarea', required: false }, { id: 'experiencia', label: 'Você já realizou acompanhamento psicológico anteriormente?', type: 'textarea', required: false }] } }, payment: { pix: true, card: false, installments: 3, pixKey: '', amount: 150, gateway: 'manual_pix' } });
function read(): Store { try { const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8')) as LegacyStore; if (parsed.tenants) return { tenants: parsed.tenants, responses: parsed.responses || [] }; return { tenants: { pripsico: { forms: parsed.forms || defaultTenant().forms, payment: { ...defaultTenant().payment, ...parsed.payment } } }, responses: (parsed.responses || []).map(item => ({ ...item, tenant: item.tenant || 'pripsico' })) }; } catch { return { tenants: { pripsico: defaultTenant() }, responses: [] }; } }
function write(data: Store) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }
function owner(store: Store, tenant: string) { return store.tenants[tenant] || defaultTenant(); }
function normalizeSlug(value: unknown) { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); }
function normalizeForm(value: Partial<FormConfig>, existing?: FormConfig): FormConfig { const now = new Date().toISOString(); return { id: value.id || existing?.id || crypto.randomUUID(), slug: normalizeSlug(value.slug), title: String(value.title || '').trim(), description: String(value.description || ''), active: value.active !== false, questions: Array.isArray(value.questions) ? value.questions.map(question => ({ id: question.id || crypto.randomUUID(), label: String(question.label || ''), type: question.type === 'select' || question.type === 'text' ? question.type : 'textarea', required: Boolean(question.required), options: question.type === 'select' ? (Array.isArray(question.options) ? question.options.map(option => String(option)) : []) : undefined })) : [], createdAt: existing?.createdAt || value.createdAt || now, updatedAt: now }; }
function normalizeAnswers(value: unknown) { return value && typeof value === 'object' ? Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, answer]) => [String(key), String(answer || '').trim()]).filter(([, answer]) => answer)) : {}; }
function requiredQuestionError(form: FormConfig, answers: Record<string, string>) { const missing = form.questions.find(question => question.required && !answers[question.id]); return missing ? `Responda à pergunta: ${missing.label}` : ''; }
function readArray(file: string) { try { return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>[]; } catch { return []; } }
function writeArray(file: string, value: Record<string, unknown>[]) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2)); }
async function databaseTenantData(tenant: string) { const saved = await withTenantDatabase(tenant, database => database.get<TenantData>('forms_config', tenant)); return saved || defaultTenant(); }

export async function GET(request: Request) {
  const url = new URL(request.url), publicTenant = tenantFrom(request), slug = url.searchParams.get('slug'), responseId = url.searchParams.get('responseId'), patientId = url.searchParams.get('patientId'), store = read();
  if (postgresEnabled()) {
    if (responseId) {
      const response = await withTenantDatabase(publicTenant, database => database.get<ResponseRecord>('form_responses', responseId));
      if (!response) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
      const data = await databaseTenantData(response.tenant);
      const financial = await withTenantDatabase(response.tenant, database => database.list<Record<string, unknown>>('finance')).then(items => items.find(item => String(item.response_id || '') === responseId));
      const payment = financial ? { ...data.payment, amount: Number(financial.valor || 0) } : data.payment;
      return NextResponse.json({ response: { id: response.id, patientId: response.patientId, formSlug: response.formSlug, formTitle: response.formTitle, answers: response.answers, items: response.items, paymentStatus: response.paymentStatus, createdAt: response.createdAt }, payment, form: data.forms[response.formSlug], tenant: response.tenant, logotipo_url: getTenantCustomLogo(response.tenant) });
    }
    if (slug) { const data = await databaseTenantData(publicTenant), form = data.forms[slug]; return form?.active ? NextResponse.json({ form, tenant: publicTenant, logotipo_url: getTenantCustomLogo(publicTenant) }) : NextResponse.json({ error: 'Formulário indisponível.' }, { status: 404 }); }
    const access = checkPlanAccess(request, 'forms'); if (!access.ok) return access.response; const tenant = access.tenant;
    const dbResponses = await withTenantDatabase(tenant, database => database.list<ResponseRecord>('form_responses'));
    const filteredResponses = patientId ? dbResponses.filter(r => r.patientId === patientId) : dbResponses;
    return NextResponse.json({ ...(await databaseTenantData(tenant)), responses: filteredResponses, tenant });
  }
  if (responseId) {
    const response = store.responses.find(item => item.id === responseId && item.tenant === publicTenant);
    if (!response) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
    const data = owner(store, response.tenant);
    const financial = readArray(path.join(process.cwd(), 'backend', 'data', 'financeiro.json')).find(item => String(item.response_id || '') === responseId);
    const payment = financial ? { ...data.payment, amount: Number(financial.valor || 0) } : data.payment;
    return NextResponse.json({ response: { id: response.id, patientId: response.patientId, formSlug: response.formSlug, formTitle: response.formTitle, answers: response.answers, items: response.items, paymentStatus: response.paymentStatus, createdAt: response.createdAt }, payment, form: data.forms[response.formSlug], tenant: response.tenant, logotipo_url: getTenantCustomLogo(response.tenant) });
  }
  if (slug) { const data = owner(store, publicTenant), form = data.forms[slug]; return form?.active ? NextResponse.json({ form, tenant: publicTenant }) : NextResponse.json({ error: 'Formulário indisponível.' }, { status: 404 }); }
  const access = checkPlanAccess(request, 'forms'); if (!access.ok) return access.response; const tenant = access.tenant;
  const tenantResponses = store.responses.filter(item => item.tenant === tenant);
  const filteredResponses = patientId ? tenantResponses.filter(r => r.patientId === patientId) : tenantResponses;
  return NextResponse.json({ ...owner(store, tenant), responses: filteredResponses, tenant });
}

export async function PUT(request: Request) {
  const access = checkPlanAccess(request, 'forms'); if (!access.ok) return access.response; const tenant = access.tenant;
  const body = await request.json().catch(() => null) as { kind?: string; payment?: Partial<Payment>; form?: Partial<FormConfig>; originalSlug?: string } | null;
  if (postgresEnabled()) {
    const data = await databaseTenantData(tenant);
    if (body?.kind === 'payment') { data.payment = { ...data.payment, ...body.payment, installments: Math.max(1, Number(body.payment?.installments) || 1), amount: Number(body.payment?.amount) || 0 }; await withTenantDatabase(tenant, database => database.put('forms_config', tenant, data)); return NextResponse.json(data.payment); }
    if (!body?.form) return NextResponse.json({ error: 'Formulário inválido.' }, { status: 400 });
    const originalSlug = normalizeSlug(body.originalSlug || body.form.slug), existing = data.forms[originalSlug], form = normalizeForm(body.form, existing);
    if (!form.slug || !form.title) return NextResponse.json({ error: 'Título e endereço são obrigatórios.' }, { status: 400 });
    const collision = data.forms[form.slug]; if (collision && form.slug !== originalSlug && collision.id !== form.id) return NextResponse.json({ error: 'Este endereço público já está sendo usado por outro formulário.' }, { status: 409 });
    if (originalSlug !== form.slug) { delete data.forms[originalSlug]; const responses = await withTenantDatabase(tenant, database => database.list<ResponseRecord>('form_responses')); for (const item of responses.filter(item => item.formSlug === originalSlug)) await withTenantDatabase(tenant, database => database.put('form_responses', item.id, { ...item, formSlug: form.slug })); }
    data.forms[form.slug] = form; await withTenantDatabase(tenant, database => database.put('forms_config', tenant, data)); return NextResponse.json(form);
  }
  const store = read(), data = owner(store, tenant);
  if (body?.kind === 'payment') { data.payment = { ...data.payment, ...body.payment, installments: Math.max(1, Number(body.payment?.installments) || 1), amount: Number(body.payment?.amount) || 0 }; store.tenants[tenant] = data; write(store); return NextResponse.json(data.payment); }
  if (!body?.form) return NextResponse.json({ error: 'Formulário inválido.' }, { status: 400 });
  const originalSlug = normalizeSlug(body.originalSlug || body.form.slug), existing = data.forms[originalSlug], form = normalizeForm(body.form, existing);
  if (!form.slug || !form.title) return NextResponse.json({ error: 'Título e endereço são obrigatórios.' }, { status: 400 });
  const collision = data.forms[form.slug]; if (collision && form.slug !== originalSlug && collision.id !== form.id) return NextResponse.json({ error: 'Este endereço público já está sendo usado por outro formulário.' }, { status: 409 });
  if (originalSlug !== form.slug) { delete data.forms[originalSlug]; store.responses = store.responses.map(item => item.tenant === tenant && item.formSlug === originalSlug ? { ...item, formSlug: form.slug } : item); }
  data.forms[form.slug] = form; store.tenants[tenant] = data; write(store); return NextResponse.json(form);
}

const CENTRAL_FILE = path.join(process.cwd(), 'backend', 'data', 'central-pacientes.json');

async function appendFormResponseToCentral(tenant: string, patientId: string, entry: {
  id: string;
  form_slug: string;
  form_titulo: string;
  data_envio: string;
  respostas: Array<{ id_pergunta: string; pergunta: string; resposta: string }>;
}) {
  if (postgresEnabled()) {
    try {
      await withTenantDatabase(tenant, async database => {
        const current = (await database.get<Record<string, unknown>>('central', patientId)) || {};
        const list = Array.isArray(current.respostas_formulario) ? current.respostas_formulario as unknown[] : [];
        const updated = [...list.filter((item: any) => item.id !== entry.id), entry];
        await database.put('central', patientId, { ...current, respostas_formulario: updated });
      });
    } catch (e) {
      console.error('Erro ao salvar respostas no PostgreSQL central:', e);
    }
    return;
  }
  try {
    const key = `${tenant}:${patientId}`;
    let all: Record<string, any> = {};
    if (fs.existsSync(CENTRAL_FILE)) {
      try { all = JSON.parse(fs.readFileSync(CENTRAL_FILE, 'utf8')); } catch { all = {}; }
    }
    const current = all[key] || {};
    const list = Array.isArray(current.respostas_formulario) ? current.respostas_formulario : [];
    current.respostas_formulario = [...list.filter((item: any) => item.id !== entry.id), entry];
    all[key] = current;
    fs.mkdirSync(path.dirname(CENTRAL_FILE), { recursive: true });
    fs.writeFileSync(CENTRAL_FILE, JSON.stringify(all, null, 2));
  } catch (e) {
    console.error('Erro ao salvar respostas no JSON central:', e);
  }
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return forbidden();
  const body = await request.json().catch(() => null) as { tenant?: string; slug?: string; answers?: Record<string, string>; contact?: { name?: string; email?: string; phone?: string } } | null, tenant = tenantFrom(request, body?.tenant), store = read(), data = owner(store, tenant), form = body?.slug ? data.forms[body.slug] : undefined;
  if (postgresEnabled()) {
    const dbData = await databaseTenantData(tenant), dbForm = body?.slug ? dbData.forms[body.slug] : undefined;
    if (!dbForm?.active) return NextResponse.json({ error: 'Formulário indisponível.' }, { status: 404 });
    const contact = { name: String(body?.contact?.name || '').trim(), email: String(body?.contact?.email || '').trim().toLowerCase(), phone: String(body?.contact?.phone || '').trim() }, answers = normalizeAnswers(body?.answers), missingQuestion = requiredQuestionError(dbForm, answers);
    if (!contact.name || !contact.email || !contact.phone) return NextResponse.json({ error: 'Informe nome, e-mail e telefone para criar seu cadastro.' }, { status: 400 });
    if (missingQuestion) return NextResponse.json({ error: missingQuestion }, { status: 400 });
    const responseId = crypto.randomUUID();
    const questionsMap = new Map((dbForm.questions || []).map(q => [q.id, q.label]));
    const items: FormResponseItem[] = Object.entries(answers).map(([id, answer]) => ({
      id,
      label: questionsMap.get(id) || id.replace(/^_+/, '').replace(/-/g, ' '),
      answer: String(answer ?? '')
    }));
    const patientId = await withTenantDatabase(tenant, async database => {
      const patients = await database.list<Record<string, unknown>>('patients');
      const existingPatient = patients.find(item => String(item.email || '').toLowerCase() === contact.email);
      const patId = String(existingPatient?.id || crypto.randomUUID());
      const extraCpf = answers['cpf-paciente'] || answers['cpf'] || '';
      const extraEmergency = answers['contato-emergencia'] || answers['contato_emergencia'] || '';
      if (!existingPatient) {
        await database.put('patients', patId, {
          id: patId,
          tenant_id: tenant,
          nome: contact.name,
          iniciais: contact.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
          email: contact.email,
          telefone: contact.phone,
          cpf: extraCpf,
          contato_emergencia: extraEmergency,
          status: 'onboarding',
          onboarding_token: crypto.randomUUID(),
          criado_em: new Date().toISOString(),
          origem: 'formulario_publico'
        });
      } else {
        await database.put('patients', patId, {
          ...existingPatient,
          nome: contact.name,
          telefone: contact.phone,
          tenant_id: tenant,
          cpf: existingPatient.cpf || extraCpf,
          contato_emergencia: existingPatient.contato_emergencia || extraEmergency
        });
      }
      return patId;
    });
    const response: ResponseRecord = {
      id: responseId,
      tenant,
      patientId,
      formSlug: dbForm.slug,
      formTitle: dbForm.title,
      answers: { _contato_nome: contact.name, _contato_email: contact.email, _contato_telefone: contact.phone, ...answers },
      items,
      createdAt: new Date().toISOString(),
      paymentStatus: 'cadastro_previo'
    };
    await withTenantDatabase(tenant, database => database.put('form_responses', response.id, response));
    await appendFormResponseToCentral(tenant, patientId, {
      id: responseId,
      form_slug: dbForm.slug,
      form_titulo: dbForm.title,
      data_envio: response.createdAt,
      respostas: items.map(it => ({ id_pergunta: it.id, pergunta: it.label, resposta: it.answer }))
    });
    return NextResponse.json({ responseId, patientId, status: 'cadastro_previo' }, { status: 201 });
  }
  if (!form?.active) return NextResponse.json({ error: 'Formulário indisponível.' }, { status: 404 });
  const contact = { name: String(body?.contact?.name || '').trim(), email: String(body?.contact?.email || '').trim().toLowerCase(), phone: String(body?.contact?.phone || '').trim() }, answers = normalizeAnswers(body?.answers), missingQuestion = requiredQuestionError(form, answers);
  if (!contact.name || !contact.email || !contact.phone) return NextResponse.json({ error: 'Informe nome, e-mail e telefone para criar seu cadastro.' }, { status: 400 });
  if (missingQuestion) return NextResponse.json({ error: missingQuestion }, { status: 400 });
  const responseId = crypto.randomUUID();
  const questionsMap = new Map((form.questions || []).map(q => [q.id, q.label]));
  const items: FormResponseItem[] = Object.entries(answers).map(([id, answer]) => ({
    id,
    label: questionsMap.get(id) || id.replace(/^_+/, '').replace(/-/g, ' '),
    answer: String(answer ?? '')
  }));
  const patients = readArray(PATIENTS_FILE), existingPatient = patients.find(item => String(item.tenant_id || 'pripsico') === tenant && String(item.email || '').toLowerCase() === contact.email);
  const patientId = String(existingPatient?.id || crypto.randomUUID());
  const extraCpf = answers['cpf-paciente'] || answers['cpf'] || '';
  const extraEmergency = answers['contato-emergencia'] || answers['contato_emergencia'] || '';
  if (!existingPatient) {
    patients.push({
      id: patientId,
      tenant_id: tenant,
      nome: contact.name,
      iniciais: contact.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
      email: contact.email,
      telefone: contact.phone,
      cpf: extraCpf,
      contato_emergencia: extraEmergency,
      status: 'onboarding',
      onboarding_token: crypto.randomUUID(),
      criado_em: new Date().toISOString(),
      origem: 'formulario_publico'
    });
  } else {
    existingPatient.nome = contact.name;
    existingPatient.telefone = contact.phone;
    if (!existingPatient.cpf && extraCpf) existingPatient.cpf = extraCpf;
    if (!existingPatient.contato_emergencia && extraEmergency) existingPatient.contato_emergencia = extraEmergency;
  }
  writeArray(PATIENTS_FILE, patients);

  const response: ResponseRecord = {
    id: responseId,
    tenant,
    patientId,
    formSlug: form.slug,
    formTitle: form.title,
    answers: { _contato_nome: contact.name, _contato_email: contact.email, _contato_telefone: contact.phone, ...answers },
    items,
    createdAt: new Date().toISOString(),
    paymentStatus: 'cadastro_previo'
  };
  store.responses.push(response);
  write(store);

  await appendFormResponseToCentral(tenant, patientId, {
    id: responseId,
    form_slug: form.slug,
    form_titulo: form.title,
    data_envio: response.createdAt,
    respostas: items.map(it => ({ id_pergunta: it.id, pergunta: it.label, resposta: it.answer }))
  });

  return NextResponse.json({ responseId, patientId, status: 'cadastro_previo' }, { status: 201 });
}
