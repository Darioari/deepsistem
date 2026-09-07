'use client';

import { useEffect, useState } from 'react';
import { Check, ClipboardCopy, FileText, Link2, Plus, RefreshCw, Send, ShieldCheck, UserRound, X } from 'lucide-react';
import { ModalPortal } from '@/components/modal-portal';
import { GlobalPageLoader } from '@/components/global-page-loader';

type Patient = { id: string; nome: string; email?: string };
type Term = { id: string; title: string; description: string; content: string; kind: string; required: boolean; active: boolean; version: string };
type Acceptance = { term_id: string; term_version: string; accepted_at: string; signer_name: string };

type TermsManagementProps = {
  patients: Patient[];
  patientId?: string;
  embedded?: boolean;
};

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
  const activeTerms = terms.filter(item => item.active);
  const selectedPatientId = patientIdProp || patientId || patients[0]?.id || '';
  const selectedPatient = patients.find(item => item.id === selectedPatientId);

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

  async function createLink(termIds?: string[]) {
    if (!selectedPatientId) {
      setError('Selecione um paciente antes de gerar o link.');
      return;
    }
    setSending(true);
    setError('');
    setNotice('');
    const response = await fetch('/api/termos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: selectedPatientId, termIds }),
    });
    const data = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) {
      setError(data.error || 'Não foi possível gerar o link.');
      return;
    }
    await navigator.clipboard.writeText(data.url).catch(() => undefined);
    const key = termIds?.length === 1 ? termIds[0] : 'all';
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 3000);
    setNotice(termIds?.length === 1 ? 'Link do termo gerado e copiado!' : 'Link de todos os termos gerado e copiado!');
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
          className={`button-primary ${copiedKey === 'all' ? '!bg-emerald-600 !border-emerald-600 text-white' : ''}`}
          disabled={!selectedPatient || sending || !activeTerms.length}
          onClick={() => void createLink()}
        >
          {copiedKey === 'all' ? <><Check className="w-4 h-4 text-white animate-in zoom-in-50" /> Copiar link</> : <><Send /> Gerar link de todos</>}
        </button>
      </div>
    </div>

    {notice && <p className="terms-notice success"><Check /> {notice}</p>}
    {error && <p className="terms-notice error"><X /> {error}</p>}
    {loading ? <GlobalPageLoader inline message="Carregando termos..." /> : <div className="terms-list">{terms.map(term => {
      const acceptance = acceptances.find(item => item.term_id === term.id);
      const isCopied = copiedKey === term.id;
      return <article className="terms-card panel-card" key={term.id}>
        <header><div className={`terms-icon ${term.kind}`}><FileText /></div><div><h2>{term.title}</h2><p>{term.description}</p></div><span className={`terms-status ${acceptance ? 'accepted' : term.active ? 'pending' : 'inactive'}`}>{acceptance ? 'Aceito' : term.active ? 'Pendente' : 'Inativo'}</span></header>
        <div className="terms-card-meta"><span>{acceptance ? `Aceito em ${new Date(acceptance.accepted_at).toLocaleString('pt-BR')}` : term.required ? 'Aceite necessário antes do uso' : 'Opcional'}{acceptance && ` · ${acceptance.signer_name}`}</span><small>Versão {term.version}</small></div>
        <footer>
          <button
            className={`btn-action ${isCopied ? '!bg-emerald-50 !text-emerald-700 !border-emerald-400 dark:!bg-emerald-950/40 dark:!text-emerald-300 dark:!border-emerald-600 font-semibold' : ''}`}
            disabled={!selectedPatient || sending || !term.active}
            onClick={() => void createLink([term.id])}
          >
            {isCopied ? <><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50" /> Copiar link</> : <><Send /> Gerar link do termo</>}
          </button>
          <button className="terms-edit-button" onClick={() => { setEditing(term); setEditorOpen(true); }}>Editar</button>
        </footer>
      </article>;
    })}</div>}

    <div className="terms-legal-note"><ShieldCheck /><span>O aceite digital registra a versão apresentada, data, pessoa que confirmou e paciente relacionado. O profissional deve apresentar as informações de forma clara e continuar responsável pelas condições específicas do atendimento.</span></div>
    {editorOpen && editing && <ModalPortal><div className="modal-overlay" onMouseDown={() => setEditorOpen(false)}><form className="modal-content terms-editor-modal" onSubmit={saveTerm} onMouseDown={event => event.stopPropagation()}><header className="modal-header"><div><span className="eyebrow">Biblioteca de consentimentos</span><h3>{editing.id ? 'Editar termo' : 'Novo termo'}</h3><p>Use linguagem clara e adequada ao seu espaço profissional.</p></div><button type="button" onClick={() => setEditorOpen(false)}><X /></button></header><div className="terms-editor-fields"><label>Título<input className="form-control" value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} required /></label><label>Descrição curta<input className="form-control" value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} /></label><label>Conteúdo do termo<textarea className="form-control" rows={9} value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} required /></label><div className="terms-editor-options"><label><input type="checkbox" checked={editing.required} onChange={event => setEditing({ ...editing, required: event.target.checked })} /> Aceite necessário</label><label><input type="checkbox" checked={editing.active} onChange={event => setEditing({ ...editing, active: event.target.checked })} /> Disponível para envio</label><label>Versão<input className="form-control" value={editing.version} onChange={event => setEditing({ ...editing, version: event.target.value })} /></label></div></div><footer className="terms-editor-footer"><button type="button" className="btn-cancel" onClick={() => setEditorOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Salvar termo</button></footer></form></div></ModalPortal>}
  </section>;
}
