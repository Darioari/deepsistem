import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { authorizedTenant, forbidden, sameOriginRequest } from '@/lib/auth-session';
import { notifyAgendaBooking } from '@/lib/agenda-notifications';
import { readProfessionalStore } from '@/lib/professional-profile';
import { normalizeTenant } from '@/lib/tenant';
import { appendAgendaItem } from '@/lib/operation-store';
import { getTenantCustomLogo } from '@/lib/tenant-brand-server';

type DayRule = { enabled: boolean; start: string; end: string; breakStart?: string; breakEnd?: string };
type SchedulingConfig = {
  slug: string;
  publicName: string;
  professionalTitle: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  coverImageUrl: string;
  heroTitle: string;
  heroText: string;
  aboutTitle: string;
  aboutText: string;
  servicesTitle: string;
  services: string;
  processTitle: string;
  processText: string;
  ctaTitle: string;
  ctaText: string;
  duration: number;
  interval: number;
  advanceDays: number;
  modality: string;
  logotipo_url?: string;
  days: Record<string, DayRule>;
};
type Booking = { id: string; slug: string; tenant_id: string; date: string; time: string; duration: number; name: string; email: string; phone: string; modality: string; message?: string; status: string; createdAt: string };
type Store = { tenants: Record<string, SchedulingConfig>; bookings: Booking[] };

const FILE = path.join(process.cwd(), 'backend', 'data', 'agendamentos-publicos.json');
const weekdayKeys = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const defaultDays = Object.fromEntries(weekdayKeys.map((day, index) => [day, { enabled: index > 0 && index < 6, start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' }])) as Record<string, DayRule>;
const fallback = (slug: string): SchedulingConfig => ({ slug, publicName: 'Atendimento psicológico', professionalTitle: 'Profissional da saúde mental', description: 'Conheça meu trabalho e escolha um horário disponível para solicitar seu atendimento.', email: '', phone: '', address: '', coverImageUrl: '', heroTitle: 'Cuidar de si também é uma forma de seguir em frente.', heroText: 'Psicoterapia com escuta cuidadosa, presença e um percurso construído no seu tempo.', aboutTitle: 'Um espaço seguro para compreender o que você está vivendo', aboutText: 'Cada história é única. O cuidado começa pela escuta e pela construção de um caminho coerente com a sua realidade.', servicesTitle: 'Como posso acompanhar você', services: 'Ansiedade e sobrecarga emocional\nAutoconhecimento e relações\nMudanças, perdas e novos ciclos', processTitle: 'Um processo construído com presença', processText: 'O atendimento começa pelo acolhimento, avança pela compreensão da sua história e se transforma em um caminho possível de cuidado.', ctaTitle: 'Vamos conversar?', ctaText: 'Escolha uma data disponível e solicite seu primeiro atendimento.', duration: 50, interval: 10, advanceDays: 60, modality: 'Presencial e online', logotipo_url: '', days: defaultDays });

function read(): Store { try { return { tenants: {}, bookings: [], ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { return { tenants: {}, bookings: [] }; } }
function write(store: Store) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(store, null, 2)); }
async function addToClinicalAgenda(booking: Booking) {
  await appendAgendaItem(booking.slug, { id: booking.id, tenant_id: booking.slug, tenant_slug: booking.slug, nome: `Agendamento público · ${booking.name}`, data: booking.date, hora: booking.time, duracao: `${booking.duration}min`, recorrencia: 'Não repetir', cor: 'Lavanda', notes: [booking.email, booking.phone, booking.message].filter(Boolean).join(' · '), tipo: 'Sessão', modalidade: booking.modality, paciente_id: '', status: booking.status, origem: 'Página pública' });
}
function minutes(value: string) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
function timeLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }
function slotsFor(config: SchedulingConfig, bookings: Booking[], date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const limit = new Date(today); limit.setDate(limit.getDate() + config.advanceDays);
  if (parsed < today || parsed > limit) return [];
  const rule = config.days[weekdayKeys[parsed.getDay()]];


  if (!rule?.enabled) return [];
  const start = minutes(rule.start), end = minutes(rule.end), step = config.duration + config.interval;
  const breakStart = rule.breakStart ? minutes(rule.breakStart) : -1, breakEnd = rule.breakEnd ? minutes(rule.breakEnd) : -1;
  const occupied = new Set(bookings.filter(item => item.slug === config.slug && item.date === date && item.status !== 'cancelado').map(item => item.time));
  const result: string[] = [];
  for (let current = start; current + config.duration <= end; current += step) {
    const crossesBreak = breakStart >= 0 && current < breakEnd && current + config.duration > breakStart;
    const label = timeLabel(current);
    if (!crossesBreak && !occupied.has(label)) result.push(label);
  }
  return result;
}

function resolveTenantSlug(rawSlug: string): { tenant: string; profile?: Record<string, unknown> } {
  const store = read();
  if (store.tenants[rawSlug]) return { tenant: rawSlug };
  const profStore = readProfessionalStore();
  if (profStore.tenants[rawSlug]) return { tenant: rawSlug, profile: profStore.tenants[rawSlug] };
  const normalizedCandidate = normalizeTenant(rawSlug);
  if (store.tenants[normalizedCandidate]) return { tenant: normalizedCandidate };
  if (profStore.tenants[normalizedCandidate]) return { tenant: normalizedCandidate, profile: profStore.tenants[normalizedCandidate] };

  for (const [tId, prof] of Object.entries(profStore.tenants)) {
    const nomeNorm = normalizeTenant(String(prof.nome || ''));
    if (nomeNorm === normalizedCandidate || nomeNorm === rawSlug) {
      return { tenant: tId, profile: prof };
    }
  }

  return { tenant: rawSlug };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = read();
  const { tenant, profile } = resolveTenantSlug(slug);
  const config = store.tenants[tenant] || store.tenants[slug];

  if (!config && !profile) {
    return NextResponse.json({ error: 'Página de agendamento não encontrada.' }, { status: 404 });
  }

  const profName = String(profile?.nome || 'Atendimento psicológico');
  const profTitle = String(profile?.categoria_profissional || 'Profissional da saúde mental');
  const profPhone = String(profile?.telefone || '');
  const profEmail = String(profile?.email || '');

  const baseConfig = fallback(tenant);
  const completeConfig: SchedulingConfig = {
    ...baseConfig,
    ...(config || {}),
    publicName: config?.publicName || profName,
    professionalTitle: config?.professionalTitle || profTitle,
    phone: config?.phone || profPhone,
    email: config?.email || profEmail,
    slug: tenant,
    logotipo_url: getTenantCustomLogo(tenant),
  };

  const date = new URL(request.url).searchParams.get('date');
  return NextResponse.json({ config: completeConfig, slots: date ? slotsFor(completeConfig, store.bookings, date) : [] });
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = authorizedTenant(request);
  if (!tenant) return forbidden();
  const { tenant: targetTenant } = resolveTenantSlug(slug);
  if (tenant !== slug && tenant !== targetTenant) return forbidden();

  const body = await request.json() as SchedulingConfig;
  const normalizedSlug = tenant;
  const store = read();
  const config = { ...fallback(normalizedSlug), ...body, slug: normalizedSlug, duration: Number(body.duration) || 50, interval: Number(body.interval) || 0, advanceDays: Number(body.advanceDays) || 60 };
  store.tenants[normalizedSlug] = config;
  write(store);
  return NextResponse.json(config);
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!sameOriginRequest(request)) return forbidden();
  const { slug } = await params;
  const store = read();
  const { tenant, profile } = resolveTenantSlug(slug);
  const config = store.tenants[tenant] || store.tenants[slug] || (profile ? {
    ...fallback(tenant),
    publicName: String(profile.nome || 'Atendimento psicológico'),
    professionalTitle: String(profile.categoria_profissional || 'Profissional da saúde mental'),
    phone: String(profile.telefone || ''),
    email: String(profile.email || ''),
    slug: tenant,
  } : null);

  if (!config) return NextResponse.json({ error: 'Agenda pública indisponível.' }, { status: 404 });
  const body = await request.json();
  if (!body.name?.trim() || !body.phone?.trim() || !body.date || !body.time) return NextResponse.json({ error: 'Preencha nome completo, telefone, data e horário.' }, { status: 400 });
  if (!slotsFor(config, store.bookings, body.date).includes(body.time)) return NextResponse.json({ error: 'Este horário não está mais disponível. Escolha outro.' }, { status: 409 });
  const booking: Booking = { id: crypto.randomUUID(), slug: tenant, tenant_id: tenant, date: body.date, time: body.time, duration: config.duration, name: body.name.trim(), email: String(body.email || '').trim().toLowerCase(), phone: body.phone.trim(), modality: config.modality, message: 'Aguardando confirmação após pagamento.', status: 'aguardando_pagamento', createdAt: new Date().toISOString() };
  store.bookings.push(booking);
  write(store);
  await addToClinicalAgenda(booking);
  await notifyAgendaBooking({ tenant, bookingId: booking.id, patientName: booking.name, patientEmail: booking.email, professionalEmail: config.email, professionalName: config.publicName, date: booking.date, time: booking.time, duration: booking.duration, modality: booking.modality });
  return NextResponse.json({ booking, message: 'Solicitação registrada. O horário será confirmado após o pagamento.' }, { status: 201 });
}
