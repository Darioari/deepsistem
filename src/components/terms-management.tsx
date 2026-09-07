'use client';

import { useEffect, useState } from 'react';
import { Check, ClipboardCopy, FileText, Plus, RefreshCw, Send, ShieldCheck, UserRound, X } from 'lucide-react';
import { ModalPortal } from '@/components/modal-portal';
import { GlobalPageLoader } from '@/components/global-page-loader';

type Patient = { id: string; nome: string; email?: string; telefone?: string };
type Term = { id: string; title: string; description: string; content: string; kind: string; required: boolean; active: boolean; version: string };
type Acceptance = { term_id: string; term_version: string; accepted_at: string; signer_name: string };

type TermsManagementProps = {
  patients: Patient[];
  patientId?: string;
  embedded?: boolean;
};

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function getCleanPhone(phoneRaw?: string): string {
  if (!phoneRaw) return '';
  const digits = phoneRaw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

function hasPatientWhatsApp(patient?: Patient): boolean {
  if (!patient?.telefone) return false;
  const digits = patient.telefone.replace(/\D/g, '');
  return digits.length >= 10;
}

export function TermsManagement({ patients, patientId: patientIdProp, embedded = false }: TermsManagementProps) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);
  const [patientId, setPatientId] = useState(patientIdProp || patients[0]?.id || '');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});

  const activeTerms = terms.filter(item => item.active);
  const selectedPatientId = patientIdProp || patientId || patients[0]?.id || '';
  const selectedPatient = patients.find(item => item.id === selectedPatientId);
  const patientHasWa = hasPatientWhatsApp(selectedPatient);

  async function load() {
    setLoading(true);
    const response = await fetch(`/api/termos${selectedPatientId ? `?patientId=${encodeURIComponent(selectedPatientId)}` : ''}`);
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setTerms(data.terms || []);
      setAcceptances(data.acceptances || []);
    } else {
      setError(data.error || 'Não foi possível carregar os termos.');
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/termos${selectedPatientId ? `?patientId=${encodeURIComponent(selectedPatientId)}` : ''}`)
      .then(response => response.json().then(data => ({ response, data })))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (response.ok) {
          setTerms(data.terms || []);
          setAcceptances(data.acceptances || []);
        } else {
          setError(data.error || 'Não foi possível carregar os termos.');
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Não foi possível carregar os termos.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [selectedPatientId]);

  async function handleTermAction(term: Term) {
    if (!selectedPatientId) {
      setError('Selecione um paciente antes de gerar o link.');
      return;
    }

    const termKey = `${selectedPatientId}_${term.id}`;
    let url = generatedLinks[termKey];

    // Comportamento 1: Gerar o link pela primeira vez
    if (!url) {
      setSending(true);
      setError('');
      setNotice('');
      const response = await fetch('/api/termos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatientId, termIds: [term.id] }),
      });
      const data = await response.json().catch(() => ({}));
      setSending(false);
      if (!response.ok || !data.url) {
        setError(data.error || 'Não foi possível gerar o link.');
        return;
      }

      url = data.url;
      setGeneratedLinks(prev => ({ ...prev, [termKey]: url }));

      if (!patientHasWa) {
        // Se NÃO tem WhatsApp, já copia para a área de transferência
        await navigator.clipboard.writeText(url).catch(() => undefined);
        setCopiedKey(term.id);
        setTimeout(() => setCopiedKey(prev => (prev === term.id ? null : prev)), 3000);
        setNotice('Link do termo gerado e copiado!');
      } else {
        // Se TEM WhatsApp, copia e informa que o botão virou Enviar link
        await navigator.clipboard.writeText(url).catch(() => undefined);
        setNotice('Link do termo gerado! Clique em "Enviar link" para abrir no WhatsApp.');
      }
      return;
    }

    // Comportamento 2: Link gerado + paciente SEM WhatsApp -> Copiar link
    if (!patientHasWa) {
      await navigator.clipboard.writeText(url).catch(() => undefined);
      setCopiedKey(term.id);
      setTimeout(() => setCopiedKey(prev => (prev === term.id ? null : prev)), 3000);
      setNotice('Link do termo copiado!');
      return;
    }

    // Comportamento 3: Link gerado + paciente COM WhatsApp -> Enviar link pelo WhatsApp
    const phone = getCleanPhone(selectedPatient?.telefone);
    const message = `Olá, ${selectedPatient?.nome || 'Paciente'}! Segue o link para leitura e aceite do termo "${term.title}":\n\n${url}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopiedKey(term.id);
    setTimeout(() => setCopiedKey(prev => (prev === term.id ? null : prev)), 3000);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    setNotice('WhatsApp aberto e link copiado!');
  }

  async function handleAllTermsAction() {
    if (!selectedPatientId) {
      setError('Selecione um paciente antes de gerar o link.');
      return;
    }

    const allKey = `${selectedPatientId}_all`;
    let url = generatedLinks[allKey];

    // Comportamento 1: Gerar link de todos pela primeira vez
    if (!url) {
      setSending(true);
      setError('');
      setNotice('');
      const response = await fetch('/api/termos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatientId }),
      });
      const data = await response.json().catch(() => ({}));
      setSending(false);
      if (!response.ok || !data.url) {
        setError(data.error || 'Não foi possível gerar o link.');
        return;
      }

      url = data.url;
      setGeneratedLinks(prev => ({ ...prev, [allKey]: url }));

      if (!patientHasWa) {
        await navigator.clipboard.writeText(url).catch(() => undefined);
        setCopiedKey('all');
        setTimeout(() => setCopiedKey(prev => (prev === 'all' ? null : prev)), 3000);
        setNotice('Link de todos os termos gerado e copiado!');
      } else {
        await navigator.clipboard.writeText(url).catch(() => undefined);
        setNotice('Link de todos os termos gerado! Clique em "Enviar link" para abrir no WhatsApp.');
      }
      return;
    }

    // Comportamento 2: Link gerado + paciente SEM WhatsApp -> Copiar link
    if (!patientHasWa) {
      await navigator.clipboard.writeText(url).catch(() => undefined);
      setCopiedKey('all');
      setTimeout(() => setCopiedKey(prev => (prev === 'all' ? null : prev)), 3000);
      setNotice('Link de todos os termos copiado!');
      return;
    }

    // Comportamento 3: Link gerado + paciente COM WhatsApp -> Enviar link pelo WhatsApp
    const phone = getCleanPhone(selectedPatient?.telefone);
    const message = `Olá, ${selectedPatient?.nome || 'Paciente'}! Segue o link para leitura e aceite dos seus termos de atendimento:\n\n${url}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopiedKey('all');
    setTimeout(() => setCopiedKey(prev => (prev === 'all' ? null : prev)), 3000);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    setNotice('WhatsApp aberto e link copiado!');
  }

  function openNew() {
    setEditing({ id: '', title: '', description: '', content: '', kind: 'custom', required: true, active: true, version: '1.0' });
    setEditorOpen(true);
  }

  async function saveTerm(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const response = await fetch('/api/termos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Não foi possível salvar o termo.');
      return;
    }
    setEditorOpen(false);
    setNotice('Termo salvo.');
    void load();
  }

  const allKey = `${selectedPatientId}_all`;
  const isAllGenerated = Boolean(generatedLinks[allKey]);
  const isAllCopied = copiedKey === 'all';

  return <section className="terms-management tab-panel active reveal-element">
    <div className="dashboard-heading">
      <div>
        <span className="eyebrow">Consentimento e transparência</span>
        <h1>{embedded ? 'Termo do Paciente' : 'Termos do atendimento'}</h1>
        <p>{embedded && selectedPatient ? `Gerencie os termos e os aceites de ${selectedPatient.nome}.` : 'Envie termos específicos ou todos de uma vez. O aceite fica registrado por paciente e versão.'}</p>
      </div>
      <div className="terms-heading-actions">
        <button className="btn-action" onClick={() => void load()}><RefreshCw /> Atualizar</button>
        <button className="button-primary" onClick={openNew}><Plus /> Novo termo</button>
      </div>
    </div>

    <div className="terms-patient-toolbar panel-card">
      {embedded ? <div className="terms-selected-patient"><UserRound /><span>Paciente<strong>{selectedPatient?.nome || 'Paciente não selecionado'}</strong></span></div> : <label><UserRound /> Paciente<select className="form-control" value={selectedPatientId} onChange={event => setPatientId(event.target.value)}><option value="">Selecione um paciente</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.nome}</option>)}</select></label>}
      <div className="terms-toolbar-actions">
        <button
          className={`button-primary ${isAllGenerated && patientHasWa ? '!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-semibold' : isAllGenerated ? '!bg-emerald-600 !border-emerald-600 text-white font-semibold' : ''}`}
          disabled={!selectedPatient || sending || !activeTerms.length}
          onClick={() => void handleAllTermsAction()}
          title={!isAllGenerated ? 'Gerar link com todos os termos' : patientHasWa ? 'Enviar link de todos pelo WhatsApp' : 'Copiar link de todos'}
        >
          {!isAllGenerated ? (
            <><Send /> Gerar link de todos</>
          ) : patientHasWa ? (
            <><WhatsAppIcon className="w-4 h-4 text-white" /> Enviar link</>
          ) : isAllCopied ? (
            <><Check className="w-4 h-4 text-white animate-in zoom-in-50" /> Link copiado!</>
          ) : (
            <><ClipboardCopy className="w-4 h-4 text-white" /> Copiar link</>
          )}
        </button>
      </div>
    </div>

    {notice && <p className="terms-notice success"><Check /> {notice}</p>}
    {error && <p className="terms-notice error"><X /> {error}</p>}
    {loading ? <GlobalPageLoader inline message="Carregando termos..." /> : <div className="terms-list">{terms.map(term => {
      const acceptance = acceptances.find(item => item.term_id === term.id);
      const termKey = `${selectedPatientId}_${term.id}`;
      const isGenerated = Boolean(generatedLinks[termKey]);
      const isCopied = copiedKey === term.id;

      return <article className="terms-card panel-card" key={term.id}>
        <header><div className={`terms-icon ${term.kind}`}><FileText /></div><div><h2>{term.title}</h2><p>{term.description}</p></div><span className={`terms-status ${acceptance ? 'accepted' : term.active ? 'pending' : 'inactive'}`}>{acceptance ? 'Aceito' : term.active ? 'Pendente' : 'Inativo'}</span></header>
        <div className="terms-card-meta"><span>{acceptance ? `Aceito em ${new Date(acceptance.accepted_at).toLocaleString('pt-BR')}` : term.required ? 'Aceite necessário antes do uso' : 'Opcional'}{acceptance && ` · ${acceptance.signer_name}`}</span><small>Versão {term.version}</small></div>
        <footer>
          {/* ÚNICO BOTÃO COM 3 COMPORTAMENTOS */}
          <button
            className={`btn-action ${
              isGenerated && patientHasWa
                ? '!bg-emerald-50 hover:!bg-emerald-100 !text-emerald-700 !border-emerald-500 dark:!bg-emerald-950/40 dark:!text-emerald-300 dark:!border-emerald-600 font-semibold'
                : isGenerated
                ? '!bg-emerald-50 !text-emerald-700 !border-emerald-400 dark:!bg-emerald-950/40 dark:!text-emerald-300 dark:!border-emerald-600 font-semibold'
                : ''
            }`}
            disabled={!selectedPatient || sending || !term.active}
            onClick={() => void handleTermAction(term)}
            title={
              !isGenerated
                ? 'Gerar link do termo'
                : patientHasWa
                ? 'Enviar link diretamente pelo WhatsApp do paciente'
                : 'Copiar link gerado'
            }
          >
            {!isGenerated ? (
              // Comportamento 1: Gerar link
              <><Send className="w-4 h-4" /> Gerar link do termo</>
            ) : patientHasWa ? (
              // Comportamento 3: Se tem WhatsApp -> Enviar link
              <><WhatsAppIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Enviar link</>
            ) : isCopied ? (
              // Comportamento 2: Se NÃO tem WhatsApp -> Copiar link (estado copiado)
              <><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50" /> Link copiado!</>
            ) : (
              // Comportamento 2: Se NÃO tem WhatsApp -> Copiar link (estado normal)
              <><ClipboardCopy className="w-4 h-4" /> Copiar link</>
            )}
          </button>
          <button className="terms-edit-button" onClick={() => { setEditing(term); setEditorOpen(true); }}>Editar</button>
        </footer>
      </article>;
    })}</div>}

    <div className="terms-legal-note"><ShieldCheck /><span>O aceite digital registra a versão apresentada, data, pessoa que confirmou e paciente relacionado. O profissional deve apresentar as informações de forma clara e continuar responsável pelas condições específicas do atendimento.</span></div>
    {editorOpen && editing && <ModalPortal><div className="modal-overlay" onMouseDown={() => setEditorOpen(false)}><form className="modal-content terms-editor-modal" onSubmit={saveTerm} onMouseDown={event => event.stopPropagation()}><header className="modal-header"><div><span className="eyebrow">Biblioteca de consentimentos</span><h3>{editing.id ? 'Editar termo' : 'Novo termo'}</h3><p>Use linguagem clara e adequada ao seu espaço profissional.</p></div><button type="button" onClick={() => setEditorOpen(false)}><X /></button></header><div className="terms-editor-fields"><label>Título<input className="form-control" value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} required /></label><label>Descrição curta<input className="form-control" value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} /></label><label>Conteúdo do termo<textarea className="form-control" rows={9} value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} required /></label><div className="terms-editor-options"><label><input type="checkbox" checked={editing.required} onChange={event => setEditing({ ...editing, required: event.target.checked })} /> Aceite necessário</label><label><input type="checkbox" checked={editing.active} onChange={event => setEditing({ ...editing, active: event.target.checked })} /> Disponível para envio</label><label>Versão<input className="form-control" value={editing.version} onChange={event => setEditing({ ...editing, version: event.target.value })} /></label></div></div><footer className="terms-editor-footer"><button type="button" className="btn-cancel" onClick={() => setEditorOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Salvar termo</button></footer></form></div></ModalPortal>}
  </section>;
}

