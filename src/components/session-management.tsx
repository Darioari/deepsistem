'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlignLeft, Activity, Bold, Calendar, Check, ClipboardList, Clock, HeartPulse, Italic, Link2, List, ListOrdered, MoreHorizontal, Pill, Redo2, Search, Underline, Undo2, User, Users, Video, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { AiIcon } from '@/components/ai-icon';
import { OnlineCareRoom } from '@/components/online-care-room';
import { ModalPortal } from '@/components/modal-portal';
import { PatientPdfSummaryButton } from '@/components/patient-pdf-summary-button';

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

type Patient = { id: string; nome: string; email?: string; telefone?: string; data_nascimento?: string; cpf?: string; genero?: string; profissao?: string; plano_saude?: string; tratamentos?: string; medicamento?: string; tipo_atendimento?: string; contato_emergencia?: string; endereco?: { cidade?: string; bairro?: string; rua?: string } };
type ClinicalDraft = { summary: string; clinicalThemes: string[]; observedChanges: string[]; agreedGoals: string[]; nextSessionQuestions: string[]; riskReview: string[]; uncertainties: string[]; draftEvolution: string };
type Session = { id: string; patientId: string; patientName: string; date: string; notes: string; evolution: string; status: string; transcript?: string; transcriptionConsent?: { acceptedAt: string; purpose: string }; aiDraft?: { generatedAt: string; model: string; draft: ClinicalDraft; aiRunId: string }; roomToken?: string };

type EditorField = 'notes' | 'evolution';

function sanitizeEditorHtml(value: string) {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

function editorValueToHtml(value: string) {
  if (!value) return '';
  if (/<[a-z][\s\S]*>/i.test(value)) return sanitizeEditorHtml(value);
  return value.split(/\r?\n/).map(line => line ? `<p>${DOMPurify.sanitize(line)}</p>` : '<p><br></p>').join('');
}

function editorValueToText(value: string) {
  if (!value) return '';
  if (!/<[a-z][\s\S]*>/i.test(value)) return value;
  return sanitizeEditorHtml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-3]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function SessionManagement({ patients, embedded = false, plan = 'start' }: { patients: Patient[]; embedded?: boolean; plan?: 'start' | 'pro' }) {
  const isPro = plan === 'pro';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [onlineError, setOnlineError] = useState('');
  const [copiedVideoLink, setCopiedVideoLink] = useState(false);
  const [videoLinkNotice, setVideoLinkNotice] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const selected = sessions.find(item => item.id === selectedId);
  const patient = patients.find(item => item.id === selected?.patientId);

  useEffect(() => {
    let active = true;
    fetch('/api/sessoes', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(data)) throw new Error(data?.error || 'Não foi possível carregar as sessões.');
        return data as Session[];
      })
      .then(data => {
        if (!active) return;
        const scoped = patients.length === 1 ? data.filter(item => item.patientId === patients[0].id) : data;
        setSessions(scoped);
        setSelectedId('');
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [patients]);
  useEffect(() => () => { Object.values(saveTimers.current).forEach(timer => clearTimeout(timer)); }, []);
  const visible = useMemo(() => sessions.filter(item => item.patientName.toLowerCase().includes(query.toLowerCase()) && (!month || item.date.startsWith(month))), [sessions, query, month]);

  async function createSession() {
    const patient = patients[0]; if (!patient) return;
    const response = await fetch('/api/sessoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id, patientName: patient.nome, date: new Date().toISOString().slice(0, 16) }) });
    const created = await response.json(); setSessions(current => [created, ...current]); setSelectedId(created.id);
  }
  async function persistSession(session: Session) {
    setSaveState('saving');
    try {
      const response = await fetch('/api/sessoes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session) });
      const data = await response.json().catch(() => null) as Session | { error?: string } | null;
      if (!response.ok) throw new Error((data as { error?: string } | null)?.error || 'Não foi possível salvar a sessão.');
      if (data && 'id' in data) setSessions(current => current.map(item => item.id === data.id ? data as Session : item));
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }
  function scheduleSave(session: Session) {
    const currentTimer = saveTimers.current[session.id];
    if (currentTimer) clearTimeout(currentTimer);
    setSaveState('saving');
    saveTimers.current[session.id] = setTimeout(() => {
      delete saveTimers.current[session.id];
      void persistSession(session);
    }, 800);
  }
  function update(field: EditorField, value: string) {
    const current = sessions.find(item => item.id === selectedId);
    if (!current) return;
    const next = { ...current, [field]: value };
    setSessions(items => items.map(item => item.id === selectedId ? next : item));
    scheduleSave(next);
  }
  async function save() {
    if (!selected) return;
    const currentTimer = saveTimers.current[selected.id];
    if (currentTimer) {
      clearTimeout(currentTimer);
      delete saveTimers.current[selected.id];
    }
    await persistSession(selected);
  }
  function getVideoUrl(token: string) {
    if (typeof window === 'undefined') return `/atendimento/${token}`;
    return `${window.location.origin}/atendimento/${token}`;
  }

  async function ensureRoomToken(): Promise<string | null> {
    if (!selected) return null;
    let token = selected.roomToken;
    if (!token) {
      token = crypto.randomUUID();
      const next = { ...selected, roomToken: token };
      try {
        await fetch(`/api/atendimento/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', sessionId: selected.id, patientId: selected.patientId }) });
        await fetch('/api/sessoes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
        setSessions(current => current.map(item => item.id === selected.id ? next : item));
      } catch {
        // fallback
      }
    }
    return token;
  }

  async function copyVideoLink() {
    const token = await ensureRoomToken();
    if (!token) return;
    const url = getVideoUrl(token);
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopiedVideoLink(true);
    setVideoLinkNotice('Link da chamada de vídeo copiado!');
    setTimeout(() => {
      setCopiedVideoLink(false);
      setVideoLinkNotice('');
    }, 3000);
  }

  async function sendVideoWhatsapp() {
    const token = await ensureRoomToken();
    if (!token) return;
    const url = getVideoUrl(token);
    await navigator.clipboard.writeText(url).catch(() => undefined);
    const patientPhone = (patient?.telefone || '').replace(/\D/g, '');
    const cleanPhone = patientPhone.length === 10 || patientPhone.length === 11 ? `55${patientPhone}` : patientPhone;
    const message = `Olá, ${patient?.nome || selected?.patientName || 'Paciente'}! Segue o link para a nossa chamada de vídeo:\n\n${url}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    setCopiedVideoLink(true);
    setVideoLinkNotice('WhatsApp aberto e link copiado!');
    setTimeout(() => {
      setCopiedVideoLink(false);
      setVideoLinkNotice('');
    }, 3000);
  }

  async function openOnlineCare() {
    if (!selected) return;
    setOnlineError('');
    const token = await ensureRoomToken();
    if (!token) {
      setOnlineError('Não foi possível gerar a sala da chamada de vídeo.');
      return;
    }
    setOnlineOpen(true);
  }
  async function saveAutomaticTranscript(chunk: string) { if (!selected) return; const current = sessions.find(item=>item.id===selected.id) || selected; const next = { ...current, transcript: `${current.transcript || ''}${current.transcript ? '\n' : ''}${chunk}`, notes: `${current.notes}${current.notes ? '\n\n' : ''}[Transcrição automática]\n${chunk}`, transcriptionConsent: { acceptedAt: current.transcriptionConsent?.acceptedAt || new Date().toISOString(), purpose: 'Transcrição do atendimento online para registro clínico' } }; setSessions(items=>items.map(item=>item.id===selected.id?next:item)); await fetch('/api/sessoes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)}); }
  async function generateAiDraft() { if (!isPro || !selected || aiLoading) return; if (!window.confirm('A Aura organizará os dados desta sessão em um rascunho para revisão profissional. Deseja continuar?')) return; setAiLoading(true); setAiError(''); try { const response = await fetch('/api/ia/sintese', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ sessionId:selected.id, confirm:true }) }); const data = await response.json().catch(()=>null); if (!response.ok) throw new Error(data?.error || 'Não foi possível gerar o rascunho.'); const next = { ...selected, aiDraft: { generatedAt:data.generatedAt, model:data.model, draft:data.draft, aiRunId:data.aiRunId } }; setSessions(items=>items.map(item=>item.id===selected.id?next:item)); } catch (cause) { setAiError(cause instanceof Error ? cause.message : 'Não foi possível gerar o rascunho.'); } finally { setAiLoading(false); } }
  async function applyAiText(field: 'notes'|'evolution', value: string) { if (!selected || !value.trim()) return; const next = { ...selected, [field]: value }; setSessions(items=>items.map(item=>item.id===selected.id?next:item)); await fetch('/api/sessoes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)}); }

  return <section className={`session-management ${embedded ? 'session-management-embedded' : ''}`}>
    <div className="dashboard-heading"><div><span className="eyebrow">Atendimento clínico</span><h1>Gestão da Sessão</h1><p>Prepare o atendimento, registre anotações privadas e mantenha o prontuário conectado ao paciente.</p></div><button className="button-primary" onClick={createSession}><Calendar /> Nova sessão</button></div>
    {!selected ? <div className="session-overview panel-card">
      <div className="session-filters"><label><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Busque seu paciente" /></label><input type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
      <div className="session-columns"><div><h2>Evoluções do prontuário faltantes</h2>{visible.filter(item => !item.evolution).map(item => <button key={item.id} onClick={() => setSelectedId(item.id)}><span>Prontuário pendente</span><strong>{item.patientName}</strong><small>{new Date(item.date).toLocaleString('pt-BR')}</small></button>)}</div><div><h2>Próximas sessões</h2>{visible.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)}><strong>{item.patientName}</strong><small>{new Date(item.date).toLocaleString('pt-BR')}</small></button>)}</div></div>
    </div> : <>
      <div className="session-command panel-card">
        <button onClick={() => setSelectedId('')}>Evoluções faltantes</button>
        <div>
          <strong>Paciente: {selected.patientName}</strong>
          <span>Data da sessão: {new Date(selected.date).toLocaleString('pt-BR')}</span>
        </div>
        {isPro && (
          <div className="session-video-actions">
            <button className="online-care-button" onClick={openOnlineCare} title="Entrar na chamada de vídeo">
              <Video className="w-4 h-4" /> Chamada de vídeo
            </button>
            <button
              className={`session-video-link-button ${copiedVideoLink ? 'copied' : ''}`}
              onClick={copyVideoLink}
              title="Copiar link da chamada de vídeo para o paciente"
            >
              {copiedVideoLink ? <><Check className="w-4 h-4 text-emerald-600" /> Link copiado!</> : <><Link2 className="w-4 h-4" /> Copiar link do vídeo</>}
            </button>
            {Boolean(patient?.telefone && patient.telefone.replace(/\D/g, '').length >= 10) && (
              <button
                className="session-video-whatsapp-button"
                onClick={sendVideoWhatsapp}
                title="Enviar link da chamada de vídeo pelo WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" /> Enviar link
              </button>
            )}
          </div>
        )}
        <button onClick={() => setSummaryOpen(true)}>Resumo do Paciente</button>
        {isPro && (
          <button data-ai-action="generate-session-draft" data-ai-title="Gerar rascunho com Aura" data-ai-help="Organiza a sessão em um rascunho para revisão profissional." onClick={generateAiDraft} disabled={aiLoading || !selected.transcript && !selected.notes && !selected.evolution}>
            <AiIcon /> {aiLoading ? 'Gerando rascunho...' : 'Gerar rascunho com Aura'}
          </button>
        )}
      </div>
      {videoLinkNotice && <p className="session-video-notice"><Check className="w-4 h-4 text-emerald-600" /> {videoLinkNotice}</p>}
      {onlineError && <p className="capture-error" role="alert">{onlineError}</p>}
      <ClinicalDraftPanel draft={selected.aiDraft?.draft} generatedAt={selected.aiDraft?.generatedAt} loading={aiLoading} error={aiError} onApplyNotes={value => void applyAiText('notes', value)} onApplyEvolution={value => void applyAiText('evolution', value)} />
      <div className="session-autosave-status" role="status" aria-live="polite">
        {saveState === 'saving' && 'Salvando automaticamente...'}
        {saveState === 'saved' && 'Salvo automaticamente'}
        {saveState === 'error' && 'Não foi possível salvar automaticamente. Tente novamente.'}
      </div>
      <div className="session-editors">
        <RichSessionEditor key={selected.id + '-notes'} title="Anotações da sessão" eyebrow="Anotações privadas" value={selected.notes} placeholder="Registre suas anotações privadas da sessão..." onChange={value => update('notes', value)} onBlur={() => void save()} />
        <RichSessionEditor key={selected.id + '-evolution'} title="Evolução do prontuário" eyebrow="Registro clínico" value={selected.evolution} placeholder="Registre ou gere a evolução desta sessão..." onChange={value => update('evolution', value)} onBlur={() => void save()} />
      </div>
      {summaryOpen && <ModalPortal><div className="modal-overlay patient-summary-overlay" onMouseDown={() => setSummaryOpen(false)}><div className="patient-summary-modal" onMouseDown={event => event.stopPropagation()}>
        <header><div><span className="summary-badge"><AiIcon /> Resumo clínico</span><h2>{patient?.nome || selected.patientName}</h2><p>Visão integrada para apoiar a preparação e a continuidade do atendimento.</p></div><div className="summary-header-actions">{isPro && <PatientPdfSummaryButton patient={{ id: selected.patientId, nome: patient?.nome || selected.patientName }} label="Exportar resumo" />}<button className="icon-button" aria-label="Fechar" onClick={() => setSummaryOpen(false)}><X /></button></div></header>
        <section className="summary-highlights">
          <SummaryCard icon={<User />} label="Paciente" value={patient?.tipo_atendimento || 'Atendimento individual'} />
          <SummaryCard icon={<HeartPulse />} label="Plano de saúde" value={patient?.plano_saude || 'Não informado'} />
          <SummaryCard icon={<Activity />} label="Tratamento" value={patient?.tratamentos || 'Em acompanhamento'} />
          <SummaryCard icon={<Pill />} label="Medicação" value={patient?.medicamento || 'Não informada'} />
          <SummaryCard icon={<Calendar />} label="Data de nascimento" value={formatDate(patient?.data_nascimento)} />
          <SummaryCard icon={<Clock />} label="Última sessão" value={new Date(selected.date).toLocaleDateString('pt-BR')} />
        </section>
        <section className="summary-focus"><span className="summary-badge">Foco clínico atual</span><p>{editorValueToText(selected.notes) || patient?.tratamentos || 'Ainda não há anotações registradas para esta sessão. Use este espaço para consolidar o foco clínico atual.'}</p></section>
        <section className="summary-detail-grid"><article><h3><ClipboardList /> Informações essenciais</h3><ul><li><span>Telefone</span><strong>{patient?.telefone || 'Não informado'}</strong></li><li><span>E-mail</span><strong>{patient?.email || 'Não informado'}</strong></li><li><span>Profissão</span><strong>{patient?.profissao || 'Não informada'}</strong></li><li><span>Gênero</span><strong>{patient?.genero || 'Não informado'}</strong></li><li><span>Localização</span><strong>{[patient?.endereco?.cidade, patient?.endereco?.bairro].filter(Boolean).join(' · ') || 'Não informada'}</strong></li></ul></article><article><h3><Users /> Rede e continuidade do cuidado</h3><ul><li><span>Contato de emergência</span><strong>{patient?.contato_emergencia || 'Não informado'}</strong></li><li><span>Sessões registradas</span><strong>{sessions.filter(item => item.patientId === selected.patientId).length}</strong></li><li><span>Evolução atual</span><strong>{selected.evolution ? 'Registrada' : 'Pendente'}</strong></li><li><span>Próximo passo</span><strong>{selected.evolution || 'Registrar evolução após a sessão'}</strong></li></ul></article></section>
      </div></div></ModalPortal>}
      {isPro && onlineOpen && selected.roomToken && <ModalPortal><div className="modal-overlay online-room-overlay"><div className="online-room-modal"><button className="online-close" onClick={()=>setOnlineOpen(false)}><X/></button><OnlineCareRoom token={selected.roomToken} role="professional" name={selected.patientName} onTranscript={saveAutomaticTranscript} onSaveNote={note => update('notes', `${selected.notes}${selected.notes ? '\n\n' : ''}[Anotação Online]\n${note}`)}/></div></div></ModalPortal>}
    </>}
  </section>;
}

function RichSessionEditor({ title, eyebrow, value, placeholder, onChange, onBlur }: { title: string; eyebrow: string; value: string; placeholder: string; onChange: (value: string) => void; onBlur: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextHtml = editorValueToHtml(value);
    if (lastValueRef.current === null || (lastValueRef.current !== value && editor.innerHTML !== nextHtml)) {
      editor.innerHTML = nextHtml;
    }
    lastValueRef.current = value;
  }, [value]);

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    const html = sanitizeEditorHtml(editor.innerHTML).replace(/^<br>$/i, '');
    lastValueRef.current = html;
    onChange(html);
  }

  function command(commandName: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(commandName, false, commandValue);
    emitChange();
  }

  function handleBlur() {
    const editor = editorRef.current;
    if (editor) {
      const clean = sanitizeEditorHtml(editor.innerHTML);
      if (editor.innerHTML !== clean) editor.innerHTML = clean;
      lastValueRef.current = clean;
      onChange(clean);
    }
    onBlur();
  }

  return <article className="session-editor panel-card">
    <header><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><AiIcon /></header>
    <div className="tinymce-like-toolbar" role="toolbar" aria-label={'Ferramentas de ' + title}>
      <button type="button" title="Desfazer" aria-label="Desfazer" onMouseDown={event => { event.preventDefault(); command('undo'); }}><Undo2 /></button>
      <button type="button" title="Refazer" aria-label="Refazer" onMouseDown={event => { event.preventDefault(); command('redo'); }}><Redo2 /></button>
      <span className="tinymce-toolbar-divider" />
      <select aria-label="Formato do texto" defaultValue="p" onChange={event => command('formatBlock', event.target.value)}>
        <option value="p">Normal</option>
        <option value="h1">Título 1</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
        <option value="blockquote">Citação</option>
      </select>
      <span className="tinymce-toolbar-divider" />
      <button type="button" title="Negrito" aria-label="Negrito" onMouseDown={event => { event.preventDefault(); command('bold'); }}><Bold /></button>
      <button type="button" title="Itálico" aria-label="Itálico" onMouseDown={event => { event.preventDefault(); command('italic'); }}><Italic /></button>
      <button type="button" title="Sublinhado" aria-label="Sublinhado" onMouseDown={event => { event.preventDefault(); command('underline'); }}><Underline /></button>
      <span className="tinymce-toolbar-divider" />
      <button type="button" title="Alinhar à esquerda" aria-label="Alinhar à esquerda" onMouseDown={event => { event.preventDefault(); command('justifyLeft'); }}><AlignLeft /></button>
      <button type="button" title="Lista com marcadores" aria-label="Lista com marcadores" onMouseDown={event => { event.preventDefault(); command('insertUnorderedList'); }}><List /></button>
      <button type="button" title="Lista numerada" aria-label="Lista numerada" onMouseDown={event => { event.preventDefault(); command('insertOrderedList'); }}><ListOrdered /></button>
      <button type="button" title="Mais ferramentas" aria-label="Mais ferramentas" className="tinymce-toolbar-more" disabled><MoreHorizontal /></button>
    </div>
    <div
      ref={editorRef}
      className="session-rich-editor"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      role="textbox"
      aria-multiline="true"
      spellCheck
      onInput={emitChange}
      onBlur={handleBlur}
    />
  </article>;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <article>{icon}<div><span>{label}</span><strong>{value}</strong></div></article>; }
function ClinicalDraftPanel({ draft, generatedAt, loading, error, onApplyNotes, onApplyEvolution }: { draft?: ClinicalDraft; generatedAt?: string; loading: boolean; error: string; onApplyNotes: (value: string) => void; onApplyEvolution: (value: string) => void }) { if (!draft && !loading && !error) return null; return <article className="clinical-ai-draft panel-card" aria-live="polite"><header><div><span className="eyebrow">Aura · rascunho assistido</span><h2>Revisão antes do prontuário</h2></div><AiIcon /></header>{loading && <p className="clinical-ai-status">Organizando a sessão e o histórico recente...</p>}{error && <p className="capture-error">{error}</p>}{draft && <><div className="clinical-ai-summary"><h3>Resumo</h3><p>{draft.summary}</p></div><div className="clinical-ai-grid"><AiDraftList title="Temas clínicos" items={draft.clinicalThemes}/><AiDraftList title="Mudanças observadas" items={draft.observedChanges}/><AiDraftList title="Metas combinadas" items={draft.agreedGoals}/><AiDraftList title="Perguntas para a próxima sessão" items={draft.nextSessionQuestions}/><AiDraftList title="Pontos para revisão de risco" items={draft.riskReview} alert/><AiDraftList title="Incertezas e lacunas" items={draft.uncertainties}/></div><div className="clinical-ai-evolution"><h3>Evolução sugerida</h3><p>{draft.draftEvolution}</p></div><footer><small>{generatedAt ? `Gerado em ${new Date(generatedAt).toLocaleString('pt-BR')} · confira antes de salvar` : 'Confira todo o conteúdo antes de salvar.'}</small><div><button onClick={() => onApplyNotes(draft.summary)}>Aplicar resumo nas anotações</button><button className="button-primary" onClick={() => onApplyEvolution(draft.draftEvolution)}>Aplicar evolução</button></div></footer></>}</article>; }
function AiDraftList({ title, items, alert = false }: { title: string; items: string[]; alert?: boolean }) { return <section className={alert && items.length ? 'clinical-ai-list alert' : 'clinical-ai-list'}><h3>{title}</h3>{items.length ? <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <p>Não informado.</p>}</section>; }
function formatDate(value?: string) { if (!value) return 'Não informada'; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR'); }
