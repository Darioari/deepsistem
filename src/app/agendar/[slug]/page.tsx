'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { GlobalPageLoader } from '@/components/global-page-loader';
import { ArrowDown, ArrowRight, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Heart, Mail, MapPin, Phone, Sparkles } from 'lucide-react';

type DayRule = { enabled: boolean; start: string; end: string };
type Config = {
  slug: string;
  publicName: string;
  professionalTitle?: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  coverImageUrl?: string;
  heroTitle?: string;
  heroText?: string;
  aboutTitle?: string;
  aboutText?: string;
  servicesTitle?: string;
  services?: string;
  processTitle?: string;
  processText?: string;
  ctaTitle?: string;
  ctaText?: string;
  duration: number;
  modality: string;
  advanceDays: number;
  logotipo_url?: string;
  days: Record<string, DayRule>;
};
const weekdayKeys = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
function isoDate(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length < 3) return `(${digits}`;
  const ddd = digits.slice(0, 2), number = digits.slice(2);
  if (number.length <= 4) return `(${ddd}) ${number}`;
  if (number.length <= 8) return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
  return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
}

export default function PublicSchedulingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<Config | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    fetch(`/api/agendamento/${slug}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setConfig(data.config);
      })
      .catch(cause => setError(cause.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!date) return setSlots([]);
    setTime('');
    fetch(`/api/agendamento/${slug}?date=${date}`)
      .then(r => r.json())
      .then(data => setSlots(data.slots || []))
      .catch(() => setSlots([]));
  }, [date, slug]);

  useEffect(() => {
    if (!config) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('visible')), { threshold: 0.12 });
    document.querySelectorAll('.professional-lp .lp-reveal').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [config]);

  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const last = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let day = 1; day <= last.getDate(); day++) cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [calendarMonth]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    const response = await fetch(`/api/agendamento/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, date, time })
    });
    const data = await response.json();
    setSending(false);
    if (!response.ok) {
      setError(data.error || 'Não foi possível registrar.');
      if (response.status === 409) setSlots(items => items.filter(item => item !== time));
      return;
    }
    setDone(true);
  }

  if (loading) return <main className="public-scheduling-page"><GlobalPageLoader /></main>;
  if (!config) return <main className="public-scheduling-page"><div className="public-scheduling-loading"><h2>Página indisponível</h2><p>{error}</p></div></main>;
  if (done) return (
    <main className="public-scheduling-page">
      <section className="public-booking-success">
        <BrandLogo customLogoUrl={config.logotipo_url || undefined} />
        <CheckCircle2 />
        <h1>Solicitação de agendamento recebida</h1>
        <p>O horário de <strong>{new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR')}</strong>, às <strong>{time}</strong>, foi reservado temporariamente.</p>
        <span>O agendamento será confirmado após a identificação do pagamento. As orientações serão enviadas pelo telefone informado.</span>
      </section>
    </main>
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + config.advanceDays);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canPrevious = calendarMonth > currentMonth;
  const services = (config.services || 'Ansiedade e sobrecarga emocional\nAutoconhecimento e relações\nMudanças, perdas e novos ciclos').split('\n').map(item => item.trim()).filter(Boolean);
  const scrollToBooking = () => document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="professional-lp">
      <nav className="lp-nav">
        <BrandLogo customLogoUrl={config.logotipo_url || undefined} />
        <div>
          <a href="#sobre">Sobre</a>
          <a href="#atendimento">Atendimento</a>
          <button onClick={scrollToBooking}>Agendar conversa</button>
        </div>
      </nav>

      <section className="lp-hero">
        <div className="lp-orb lp-orb-one" />
        <div className="lp-orb lp-orb-two" />
        <div className="lp-hero-copy lp-reveal visible">
          <span className="lp-kicker"><Sparkles /> Psicoterapia com presença</span>
          <h1>{config.heroTitle}</h1>
          <p>{config.heroText}</p>
          <div className="lp-hero-actions">
            <button onClick={scrollToBooking}>Quero agendar <ArrowRight /></button>
            <a href="#sobre">Conheça meu trabalho <ArrowDown /></a>
          </div>
          <small>{config.modality} · Sessões de {config.duration} minutos</small>
        </div>
        <div className="lp-cover lp-reveal visible">
          <div className="lp-cover-frame">
            {config.coverImageUrl ? (
              <img src={config.coverImageUrl} alt={`Foto profissional de ${config.publicName}`} />
            ) : (
              <div className="lp-cover-placeholder">
                <Heart />
                <span>Adicione sua foto de capa nas configurações</span>
              </div>
            )}
            <div className="lp-cover-signature">
              <strong>{config.publicName}</strong>
              <span>{config.professionalTitle}</span>
            </div>
          </div>
          <div className="lp-floating-note">Escuta, acolhimento<br />e cuidado no seu tempo.</div>
        </div>
      </section>

      <section className="lp-trust-strip">
        <span>Atendimento humano</span><i />
        <span>Ambiente protegido</span><i />
        <span>Jornada personalizada</span>
      </section>

      <section id="sobre" className="lp-about lp-reveal">
        <div>
          <span className="lp-section-number">01 · Sobre</span>
          <h2>{config.aboutTitle}</h2>
        </div>
        <div>
          <p>{config.aboutText}</p>
          <p>{config.description}</p>
          {(config.email || config.phone || config.address) && (
            <div className="lp-contact-list">
              {config.email && <span><Mail />{config.email}</span>}
              {config.phone && <span><Phone />{config.phone}</span>}
              {config.address && <span><MapPin />{config.address}</span>}
            </div>
          )}
        </div>
      </section>

      <section id="atendimento" className="lp-services">
        <header className="lp-reveal">
          <span className="lp-section-number">02 · Atendimento</span>
          <h2>{config.servicesTitle}</h2>
          <p>Alguns caminhos que podem ser trabalhados ao longo do processo terapêutico.</p>
        </header>
        <div className="lp-service-grid">
          {services.map((service, index) => (
            <article className="lp-reveal" key={service}>
              <span>0{index + 1}</span>
              <Heart />
              <h3>{service}</h3>
              <p>Um percurso de escuta e elaboração construído de acordo com suas necessidades.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-process lp-reveal">
        <div>
          <span className="lp-section-number">03 · O processo</span>
          <h2>{config.processTitle}</h2>
          <p>{config.processText}</p>
        </div>
        <ol>
          <li><b>01</b><span><strong>Acolhimento</strong>Um primeiro contato para compreender o que trouxe você até aqui.</span></li>
          <li><b>02</b><span><strong>Compreensão</strong>Escuta cuidadosa da sua história, contexto e necessidades.</span></li>
          <li><b>03</b><span><strong>Caminho</strong>Um processo terapêutico construído com clareza e continuidade.</span></li>
        </ol>
      </section>

      <section id="agendamento" className="lp-booking-section">
        <div className="lp-booking-intro lp-reveal">
          <span className="lp-section-number">04 · Agendamento</span>
          <h2>{config.ctaTitle}</h2>
          <p>{config.ctaText}</p>
          <div className="lp-booking-highlight">
            <Clock />
            <span><strong>Escolha com tranquilidade</strong>Somente os dias configurados e os horários realmente livres aparecem abaixo.</span>
          </div>
        </div>
        <form onSubmit={submit} className="public-scheduling-form lp-booking-form lp-reveal">
          <section>
            <div className="public-step-title">
              <b>1</b>
              <div><strong>Escolha a data</strong><span>Dias não configurados ficam indisponíveis.</span></div>
            </div>
            <div className="public-calendar">
              <header>
                <button type="button" disabled={!canPrevious} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeft /></button>
                <strong>{calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
                <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRight /></button>
              </header>
              <div className="public-calendar-weekdays">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
              <div className="public-calendar-grid">{calendarDays.map((day, index) => {
                if (!day) return <span key={`blank-${index}`} />;
                const value = isoDate(day), rule = config.days[weekdayKeys[day.getDay()]], unavailable = day < today || day > limit || !rule?.enabled;
                return <button type="button" key={value} disabled={unavailable} className={date === value ? 'selected' : ''} onClick={() => setDate(value)}>{day.getDate()}</button>;
              })}</div>
              <footer><span><i />Disponível</span><span><i />Indisponível</span></footer>
            </div>
            {date && <div className="public-selected-date"><Calendar /><strong>{new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong></div>}
            {date && <div className="public-slots">{slots.length ? slots.map(slot => <button type="button" key={slot} className={time === slot ? 'active' : ''} onClick={() => setTime(slot)}><Clock />{slot}</button>) : <p>Nenhum horário livre nesta data.</p>}</div>}
          </section>
          <section>
            <div className="public-step-title">
              <b>2</b>
              <div><strong>Seus dados</strong><span>Somente o essencial para reservar e enviar avisos.</span></div>
            </div>
            <div className="public-booking-fields public-booking-fields-simple">
              <label>Nome completo<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
              <label>E-mail<input type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
              <label>Telefone<input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={15} value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" required /></label>
            </div>
          </section>
          {error && <p className="public-booking-error">{error}</p>}
          <div className="payment-confirmation-note">
            <CheckCircle2 />
            <span><strong>Confirmação após pagamento</strong><small>O horário fica reservado temporariamente e será confirmado depois que o pagamento for identificado.</small></span>
          </div>
          <button className="btn-primary public-booking-submit" disabled={!time || sending}>{sending ? 'Registrando...' : 'Solicitar agendamento'}</button>
        </form>
      </section>

      <footer className="lp-footer">
        <BrandLogo customLogoUrl={config.logotipo_url || undefined} />
        <p>{config.publicName} · {config.professionalTitle}</p>
        <span>Página profissional criada com PsicSystem</span>
      </footer>
    </main>
  );
}
