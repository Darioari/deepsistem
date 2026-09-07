'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { tenantFromPathname } from '@/lib/tenant';
import { GlobalPageLoader } from '@/components/global-page-loader';
import { Check, ClipboardList, Copy, CopyPlus, ExternalLink, FileText, MessageSquare, Plus, Trash, User } from 'lucide-react';

type Question = { id: string; label: string; type: 'text' | 'textarea' | 'select'; required: boolean; options?: string[] };
type FormConfig = { id?: string; slug: string; title: string; description: string; active: boolean; questions: Question[]; createdAt?: string; updatedAt?: string };
type FormResponse = {
  id: string;
  tenant: string;
  formSlug: string;
  formTitle?: string;
  patientId?: string;
  answers: Record<string, string>;
  items?: Array<{ id: string; label: string; answer: string }>;
  createdAt: string;
  paymentStatus: string;
};
const initial: FormConfig = { slug: 'entrevista-preliminar', title: 'Entrevista Preliminar', description: 'Este formulário ajuda a compreender a demanda inicial e preparar o primeiro encontro. Não substitui entrevista clínica nem produz diagnóstico automático.', active: true, questions: [] };
function slugify(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'novo-formulario'; }
function createForm(index = 1): FormConfig { return { ...initial, id: crypto.randomUUID(), slug: index === 1 ? 'novo-formulario' : `novo-formulario-${index}`, title: index === 1 ? 'Novo formulário' : `Novo formulário ${index}`, active: false, questions: [] }; }

export function FormBuilder() {
  const tenant = tenantFromPathname(usePathname());
  const [forms, setForms] = useState<FormConfig[]>([]), [form, setForm] = useState<FormConfig>(initial), [originalSlug, setOriginalSlug] = useState(initial.slug), [message, setMessage] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [allResponses, setAllResponses] = useState<FormResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'perguntas' | 'respostas'>('perguntas');

  useEffect(() => {
    fetch(`/api/formularios?tenant=${tenant}`)
      .then(response => response.json())
      .then(data => {
        const loaded = Object.values(data.forms || {}) as FormConfig[];
        const available = loaded.length ? loaded : [initial];
        setForms(available);
        setForm(available[0]);
        setOriginalSlug(available[0].slug);
        if (Array.isArray(data.responses)) {
          setAllResponses(data.responses);
        }
      })
      .catch(() => setMessage('Não foi possível carregar seus formulários.'))
      .finally(() => setLoading(false));
  }, [tenant]);

  const updateQuestion = (id: string, changes: Partial<Question>) => setForm(current => ({ ...current, questions: current.questions.map(item => item.id === id ? { ...item, ...changes } : item) }));
  const add = () => setForm(current => ({ ...current, questions: [...current.questions, { id: crypto.randomUUID(), label: '', type: 'textarea', required: false }] }));
  const addOption = (question: Question) => updateQuestion(question.id, { options: [...(question.options || []), ''] });
  const updateOption = (question: Question, index: number, value: string) => updateQuestion(question.id, { options: (question.options || []).map((option, i) => i === index ? value : option) });
  const removeOption = (question: Question, index: number) => updateQuestion(question.id, { options: (question.options || []).filter((_, i) => i !== index) });
  function selectForm(next: FormConfig) { setForm(next); setOriginalSlug(next.slug); setMessage(''); }
  function newForm() { const next = createForm(forms.length + 1); setForms(current => [...current, next]); setForm(next); setOriginalSlug(next.slug); setMessage('Novo formulário criado como rascunho. Configure e salve para publicar.'); }
  function duplicateForm() { const base = slugify(`${form.slug}-copia`), used = new Set(forms.map(item => item.slug)); let slug = base, index = 2; while (used.has(slug)) slug = `${base}-${index++}`; const copy: FormConfig = { ...form, id: crypto.randomUUID(), slug, title: `${form.title} (cópia)`, active: false, questions: form.questions.map(question => ({ ...question, id: crypto.randomUUID(), options: question.options ? [...question.options] : undefined })) }; setForms(current => [...current, copy]); setForm(copy); setOriginalSlug(copy.slug); setMessage('Cópia criada como rascunho. Salve para publicar este novo formulário.'); }
  async function save() { setSaving(true); setMessage(''); const response = await fetch('/api/formularios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant, originalSlug, form: { ...form, slug: slugify(form.slug), title: form.title.trim() } }) }); const data = await response.json().catch(() => null); setSaving(false); if (!response.ok) { setMessage(data?.error || 'Não foi possível salvar o formulário.'); return; } const saved = data as FormConfig; setForms(current => [...current.filter(item => item.slug !== originalSlug && item.slug !== saved.slug), saved]); setForm(saved); setOriginalSlug(saved.slug); setMessage('Formulário salvo com sucesso.'); }
  
  const currentResponses = allResponses.filter(r => r.formSlug === form.slug);
  const url = `/${tenant}/${form.slug}`;

  if (loading) return <section className="form-builder-workspace"><GlobalPageLoader inline message="Carregando formulários..." /></section>;
  return <section className="form-builder-workspace">
    <div className="form-manager-header panel-card"><div><span className="eyebrow">Formulários</span><h1>Seus formulários</h1><p>Crie modelos diferentes para triagem, anamnese, contrato e acompanhamento.</p></div><button type="button" className="btn-primary btn-compact" onClick={newForm}><Plus />Novo formulário</button></div>
    <div className="form-manager-layout">
      <aside className="form-list panel-card"><div className="form-list-heading"><div><strong>Modelos salvos</strong><small>{forms.length} formulário(s)</small></div><FileText /></div><div className="form-list-items">{forms.map(item => <button type="button" key={item.slug} className={item.slug === form.slug ? 'active' : ''} onClick={() => selectForm(item)}><span><strong>{item.title || 'Sem título'}</strong><small>/{item.slug}</small></span><em className={item.active ? 'published' : ''}>{item.active ? 'Publicado' : 'Rascunho'}</em></button>)}</div></aside>
      <div className="form-editor-column">
        <div className="patient-section-title"><div><span className="eyebrow">Formulário selecionado</span><h2>{form.title || 'Novo formulário'}</h2><p>Monte suas perguntas, salve o modelo e compartilhe o link público.</p></div><div className="form-header-actions"><button type="button" className="btn-action btn-compact" onClick={duplicateForm}><CopyPlus />Duplicar</button><button type="button" className="btn-primary btn-compact" onClick={save} disabled={saving}><Check />{saving ? 'Salvando...' : 'Salvar formulário'}</button></div></div>
        <p className="clinical-ai-notice">As respostas apoiam a escuta inicial. O formulário não substitui a entrevista, avaliação profissional ou formulação diagnóstica.</p>
        <section className="panel-card form-builder-settings"><div className="form-builder-grid"><label>Título<input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label><label>Endereço público<input className="form-control" value={form.slug} onChange={e => setForm({ ...form, slug: slugify(e.target.value) })} /></label><label className="full">Apresentação<textarea className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label><label className="form-active-toggle"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Formulário disponível</label></div><div className="form-public-link"><span>{typeof window !== 'undefined' ? window.location.origin : ''}{url}</span><button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${url}`)}><Copy />Copiar</button><a href={url} target="_blank" rel="noreferrer"><ExternalLink />Visualizar</a></div></section>

        {/* Sub-navegação: Perguntas vs Respostas Recebidas */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'perguntas' ? 'bg-[#09A4B3] text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            onClick={() => setActiveTab('perguntas')}
          >
            <FileText className="w-3.5 h-3.5" />
            Perguntas ({form.questions.length})
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'respostas' ? 'bg-[#09A4B3] text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            onClick={() => setActiveTab('respostas')}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Respostas recebidas
            {currentResponses.length > 0 && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${activeTab === 'respostas' ? 'bg-white/25 text-white' : 'bg-[#09A4B3] text-white'}`}>
                {currentResponses.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'perguntas' ? (
          <>
            <div className="form-question-heading"><div><FileText /><span><strong>Perguntas ({form.questions.length})</strong><small>Você define a ordem, o formato e quais respostas são obrigatórias.</small></span></div></div>
            <div className="form-question-list">{form.questions.map((question, index) => <article className={`panel-card${question.type === 'select' ? ' has-options' : ''}`} key={question.id}><b>{String(index + 1).padStart(2, '0')}</b><label>Enunciado<input className="form-control" value={question.label} onChange={e => updateQuestion(question.id, { label: e.target.value })} placeholder="Digite sua pergunta..." /></label><label>Resposta<select className="form-control" value={question.type} onChange={e => { const type = e.target.value as Question['type']; updateQuestion(question.id, { type, options: type === 'select' && !question.options?.length ? ['', ''] : question.options }); }}><option value="textarea">Texto longo</option><option value="text">Texto curto</option><option value="select">Lista de opções</option></select></label><label className="question-required"><input type="checkbox" checked={question.required} onChange={e => updateQuestion(question.id, { required: e.target.checked })} />Obrigatória</label><button type="button" className="icon-button danger" aria-label="Excluir pergunta" onClick={() => setForm({ ...form, questions: form.questions.filter(item => item.id !== question.id) })}><Trash /></button>{question.type === 'select' && <div className="question-options-editor"><div><strong>Opções da resposta</strong><small>Adicione as alternativas que aparecerão para a pessoa selecionar.</small></div><div className="question-option-list">{(question.options || []).map((option, optionIndex) => <div key={`${question.id}-${optionIndex}`}><span>{optionIndex + 1}</span><input className="form-control" value={option} onChange={e => updateOption(question, optionIndex, e.target.value)} placeholder={`Digite a opção ${optionIndex + 1}`} /><button type="button" className="icon-button danger" aria-label={`Excluir opção ${optionIndex + 1}`} onClick={() => removeOption(question, optionIndex)}><Trash /></button></div>)}</div><button type="button" className="btn-action btn-compact" onClick={() => addOption(question)}><Plus />Adicionar opção</button></div>}</article>)}<div className="form-add-question-bottom"><button type="button" className="btn-add-question-block" onClick={add}><Plus className="w-4 h-4" /><span>Adicionar nova pergunta</span></button></div>{!form.questions.length && <div className="patient-empty"><FileText /><strong>Nenhuma pergunta criada</strong><span>Adicione as perguntas que deseja usar neste formulário.</span></div>}</div>
          </>
        ) : (
          <div className="form-responses-section flex flex-col gap-4">
            <div className="form-submissions-header flex justify-between items-center p-3.5 rounded-xl border border-slate-200 bg-[#f8fafc]">
              <div>
                <strong className="text-sm font-semibold text-slate-900 block">Submissões deste formulário</strong>
                <span className="text-xs text-slate-600">Total de {currentResponses.length} resposta(s) enviada(s) por pacientes.</span>
              </div>
              {currentResponses.length > 0 && (
                <button
                  type="button"
                  className="btn-action btn-compact text-xs"
                  onClick={() => {
                    const text = currentResponses.map(r => {
                      const name = r.answers._contato_nome || 'Anônimo';
                      const email = r.answers._contato_email || '';
                      const tel = r.answers._contato_telefone || '';
                      const date = new Date(r.createdAt).toLocaleString('pt-BR');
                      const itemsText = (r.items || Object.entries(r.answers).filter(([k]) => !k.startsWith('_')).map(([k, v]) => ({ label: k, answer: v }))).map(it => `• ${it.label}: ${it.answer}`).join('\n');
                      return `=== Resposta de ${name} (${email} - ${tel}) em ${date} ===\n${itemsText}`;
                    }).join('\n\n\n');
                    navigator.clipboard.writeText(text);
                    setMessage('Todas as respostas foram copiadas para a área de transferência!');
                  }}
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar todas
                </button>
              )}
            </div>

            {currentResponses.length === 0 ? (
              <div className="patient-empty panel-card py-12 flex flex-col items-center text-center">
                <ClipboardList className="w-10 h-10 text-slate-400 mb-2" />
                <strong className="text-sm font-semibold text-slate-800">Nenhuma resposta recebida para este formulário</strong>
                <span className="text-xs text-slate-500 max-w-sm mt-1">
                  Compartilhe o link público do formulário com seus pacientes ou clientes para receber respostas aqui.
                </span>
                <button
                  type="button"
                  className="btn-action btn-compact mt-4"
                  onClick={() => navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}${url}`)}
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar link público
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {currentResponses.map((resp, idx) => {
                  const name = resp.answers._contato_nome || 'Paciente';
                  const email = resp.answers._contato_email || '';
                  const phone = resp.answers._contato_telefone || '';
                  const dateStr = new Date(resp.createdAt).toLocaleString('pt-BR');
                  const qMap = new Map(form.questions.map(q => [q.id, q.label]));
                  const displayItems = resp.items || Object.entries(resp.answers)
                    .filter(([k]) => !k.startsWith('_'))
                    .map(([k, v]) => ({ id: k, label: qMap.get(k) || k.replace(/^_+/, '').replace(/-/g, ' '), answer: v }));

                  return (
                    <details key={resp.id || idx} className="panel-card form-submission-card p-4 rounded-xl border border-slate-200 bg-white group shadow-sm" open={idx === 0}>
                      <summary className="cursor-pointer font-semibold text-xs flex justify-between items-center select-none">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#09A4B3]" />
                          <span className="text-sm font-bold text-slate-900">{name}</span>
                          {email && <span className="text-slate-500 font-normal">· {email}</span>}
                          {phone && <span className="text-slate-500 font-normal">· {phone}</span>}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{dateStr}</span>
                      </summary>

                      <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-3 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {displayItems.map((item, itemIdx) => (
                            <div key={itemIdx} className="form-submission-item bg-[#f8fafc] p-3 rounded-lg border border-slate-200">
                              <span className="form-submission-label text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                {item.label}
                              </span>
                              <span className="form-submission-answer text-xs font-semibold text-slate-900 whitespace-pre-wrap block leading-relaxed">
                                {item.answer || '—'}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end mt-2">
                          <button
                            type="button"
                            className="btn-action btn-compact text-xs"
                            onClick={() => {
                              const singleText = `Formulário: ${form.title}\nPaciente: ${name} (${email} - ${phone})\nData: ${dateStr}\n\n` +
                                displayItems.map(it => `• ${it.label}:\n${it.answer}`).join('\n\n');
                              navigator.clipboard.writeText(singleText);
                              setMessage(`Respostas de ${name} copiadas!`);
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" /> Copiar esta resposta
                          </button>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {message && <p className="scheduling-message">{message}</p>}
      </div>
    </div>
  </section>;
}
