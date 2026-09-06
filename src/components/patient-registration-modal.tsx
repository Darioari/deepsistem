'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Search, UserPlus, Users, X } from 'lucide-react';
import { ModalPortal } from './modal-portal';

type PatientOption = { id: string; nome: string; email?: string; telefone?: string };
type Mode = 'completo' | 'resumido' | 'casal';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  patient?: Record<string, any> | null;
}

const emptyForm = {
  nome: '', nome_social: '', raca_cor: '', cpf: '', data_nascimento: '', email: '', telefone: '',
  tipo_atendimento: '', responsavel_financeiro: '', emergencia1_nome: '', emergencia1_parentesco: '',
  emergencia1_telefone: '', emergencia2_nome: '', emergencia2_parentesco: '', emergencia2_telefone: '',
  pais: '', cep: '', numero: '', rua: '', bairro: '', cidade: '', complemento: '', genero: '',
  estado_civil: '', profissao: '', plano_saude: '', tratamentos: '', medicamento: '', cobranca: '',
  moeda: '', valor: '', pagamento: ''
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'NP';
}

export function PatientRegistrationModal({ open, onClose, onCreated, patient }: Props) {
  const [mode, setMode] = useState<Mode>('completo');
  const [form, setForm] = useState(emptyForm);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [search, setSearch] = useState('');
  const [firstId, setFirstId] = useState('');
  const [secondId, setSecondId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('psistem_token') : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/pacientes', { headers }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPatients(data);
    }).catch(() => {});
    if (patient) setForm({
      ...emptyForm,
      nome: patient.nome || '', nome_social: patient.nome_social || '', raca_cor: patient.raca_cor || '', cpf: patient.cpf || '',
      data_nascimento: patient.data_nascimento || '', email: patient.email || '', telefone: patient.telefone || '',
      tipo_atendimento: patient.tipo_atendimento || 'Adulto', responsavel_financeiro: patient.responsavel_nome || '',
      pais: patient.endereco?.pais || 'Brasil', cep: patient.endereco?.cep || '', numero: patient.endereco?.numero || '',
      rua: patient.endereco?.rua || '', bairro: patient.endereco?.bairro || '', cidade: patient.endereco?.cidade || '', complemento: patient.endereco?.complemento || '',
      genero: patient.genero || '', estado_civil: patient.estado_civil || '', profissao: patient.profissao || '', plano_saude: patient.plano_saude || '',
      tratamentos: patient.tratamentos || '', medicamento: patient.medicamento || '', cobranca: patient.cobranca?.tipo || 'Por sessão',
      moeda: patient.cobranca?.moeda || 'BRL', valor: patient.cobranca?.valor || '100,00', pagamento: patient.cobranca?.meio_pagamento || 'PIX'
    });
  }, [open, patient]);

  const filtered = useMemo(() => patients.filter(item => {
    const haystack = (item.nome + ' ' + (item.email || '') + ' ' + (item.telefone || '')).toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [patients, search]);

  const firstPatient = useMemo(() => patients.find(p => p.id === firstId), [patients, firstId]);
  const secondPatient = useMemo(() => patients.find(p => p.id === secondId), [patients, secondId]);

  if (!open) return null;

  const set = (key: keyof typeof emptyForm, value: string) => setForm(current => ({ ...current, [key]: value }));

  async function create(body: Record<string, unknown>) {
    setSaving(true);
    setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('psistem_token') : null;
      const response = await fetch('/api/pacientes', {
        method: patient ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(patient ? { ...body, id: patient.id } : body)
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Não foi possível criar o paciente.');
      await onCreated();
      setForm(emptyForm);
      setFirstId(''); setSecondId(''); setMode('completo');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o paciente.');
    } finally { setSaving(false); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === 'casal') {
      const first = patients.find(p => p.id === firstId);
      const second = patients.find(p => p.id === secondId);
      if (!first || !second || first.id === second.id) return setError('Selecione duas pessoas diferentes.');
      return create({
        nome: first.nome + ' e ' + second.nome,
        iniciais: initials(first.nome)[0] + initials(second.nome)[0],
        status: 'ativo',
        tipo_atendimento: 'Casal',
        casal_com: [first.id, second.id]
      });
    }
    if (!form.nome.trim()) return setError('Informe o nome do paciente.');
    return create({
      nome: form.nome, iniciais: initials(form.nome), status: 'ativo', nome_social: form.nome_social,
      raca_cor: form.raca_cor, cpf: form.cpf, data_nascimento: form.data_nascimento, email: form.email,
      telefone: form.telefone, tipo_atendimento: form.tipo_atendimento, responsavel_nome: form.responsavel_financeiro,
      contato_emergencia: [form.emergencia1_nome, form.emergencia1_parentesco, form.emergencia1_telefone].filter(Boolean).join(' · '),
      contato_emergencia_2: [form.emergencia2_nome, form.emergencia2_parentesco, form.emergencia2_telefone].filter(Boolean).join(' · '),
      endereco: { pais: form.pais, cep: form.cep, numero: form.numero, rua: form.rua, bairro: form.bairro, cidade: form.cidade, complemento: form.complemento },
      genero: form.genero, estado_civil: form.estado_civil, profissao: form.profissao, plano_saude: form.plano_saude,
      tratamentos: form.tratamentos, medicamento: form.medicamento,
      cobranca: { tipo: form.cobranca, moeda: form.moeda, valor: form.valor, meio_pagamento: form.pagamento }
    });
  }

  const field = (label: string, key: keyof typeof emptyForm, placeholder = '', type = 'text') => (
    <label><span>{label}</span><input type={type} value={form[key]} placeholder={placeholder} onChange={e => set(key, e.target.value)} /></label>
  );

  return (
    <ModalPortal>
      <div className="modal-overlay patient-registration-v2-overlay" onMouseDown={onClose}>
        <form className="patient-registration-v2" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
          <header className="registration-v2-header">
            <div><span className="eyebrow">Central do paciente</span><h2>{patient ? 'Editar paciente' : mode === 'casal' ? 'Adicionar casal' : 'Novo paciente'}</h2><p>{patient ? 'Revise e complete todas as informações do cadastro.' : mode === 'casal' ? 'O casal terá sessões, financeiro e histórico próprios, conectado a dois pacientes individuais.' : 'Comece pelos dados essenciais. Você pode completar o restante depois.'}</p></div>
            <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X /></button>
          </header>

          {!patient && <nav className="registration-mode-tabs" aria-label="Outras formas de cadastro">
            <strong>Outras formas</strong>
            <button type="button" className={mode === 'completo' ? 'active' : ''} onClick={() => setMode('completo')}><UserPlus /> Completo</button>
            <button type="button" className={mode === 'resumido' ? 'active' : ''} onClick={() => setMode('resumido')}><Check /> Resumido</button>
            <button type="button" className={mode === 'casal' ? 'active' : ''} onClick={() => setMode('casal')}><Users /> Casal</button>
          </nav>}

          {mode === 'casal' ? (
            <div className="registration-v2-body couple-registration">
              <div className="couple-setup">
                <label><span>Buscar pacientes existentes</span><div className="search-wrap"><Search /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Digite o nome..." /></div></label>
                {Boolean(search.trim()) && <div className="couple-results">{filtered.map(item => <button key={item.id} type="button" onClick={() => { if (!firstId) setFirstId(item.id); else if (!secondId && item.id !== firstId) setSecondId(item.id); }}><span>{item.nome}</span><small>{item.email || item.telefone || 'Sem contato extra'}</small></button>)}</div>}
                <div className="couple-slots">
                  <div><strong>Pessoa 1</strong>{firstPatient ? <span>{firstPatient.nome}</span> : <small>Selecione um paciente existente ou cadastre primeiro.</small>}</div>
                  <div><strong>Pessoa 2</strong>{secondPatient ? <span>{secondPatient.nome}</span> : <small>Selecione a segunda pessoa.</small>}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="registration-v2-body">
              <div className="registration-accordion">
                <section>
                  <div className="section-heading"><b>01</b><div><h3>Identificação</h3><p>Dados principais do paciente.</p></div></div>
                  <div className="registration-fields">
                    {field('Nome completo *', 'nome', 'Nome completo')}
                    <label><span>Iniciais *</span><input value={form.nome ? initials(form.nome) : 'NP'} readOnly /></label>
                    {field('Nome social', 'nome_social', 'Como prefere ser chamado')}
                    <label><span>Raça / Cor</span><select value={form.raca_cor} onChange={e => set('raca_cor', e.target.value)}><option value="">Selecione</option><option>Branca</option><option>Preta</option><option>Parda</option><option>Amarela</option><option>Indígena</option><option>Prefere não informar</option></select></label>
                    {field('CPF', 'cpf', '000.000.000-00')}
                    {field('Data de nascimento', 'data_nascimento', '', 'date')}
                    {field('E-mail', 'email', 'paciente@email.com', 'email')}
                    {field('Telefone / WhatsApp', 'telefone', '+55 (00) 00000-0000', 'tel')}
                    <label><span>Tipo de atendimento</span><select value={form.tipo_atendimento} onChange={e => set('tipo_atendimento', e.target.value)}><option>Adulto</option><option>Infantil</option><option>Adolescente</option><option>Idoso</option></select></label>
                  </div>
                </section>
                <section>
                  <div className="section-heading"><b>02</b><div><h3>Contatos e endereço</h3><p>Informações de apoio e localização.</p></div></div>
                  {mode === 'completo' ? <><div className="registration-fields">{field('Responsável financeiro', 'responsavel_financeiro', 'Opcional')}{field('Contato de emergência 1', 'emergencia1_nome', 'Digite o nome')}{field('Filiação/Parentesco', 'emergencia1_parentesco', 'Ex.: mãe, irmão, amiga')}{field('Telefone', 'emergencia1_telefone', '+55 (00) 00000-0000')}{field('Contato de emergência 2', 'emergencia2_nome', 'Digite o nome')}{field('Filiação/Parentesco', 'emergencia2_parentesco', 'Ex.: pai, irmã, cônjuge')}{field('Telefone', 'emergencia2_telefone', '+55 (00) 00000-0000')}</div><h4>Endereço do paciente</h4><div className="registration-fields">{field('País', 'pais')}{field('CEP', 'cep', '00000-000')}{field('Número', 'numero', 'Opcional')}{field('Rua', 'rua', 'Rua, avenida ou estrada')}{field('Bairro', 'bairro')}{field('Cidade', 'cidade')}{field('Complemento', 'complemento', 'Apto, bloco, referência')}</div></> : <p className="deferred-note">Responsáveis, contatos de emergência e endereço podem ser adicionados depois na central do paciente.</p>}
                </section>
                <section><div className="section-heading"><b>03</b><div><h3>Contexto do cuidado</h3><p>Informações sociais e clínicas que podem ser atualizadas depois.</p></div></div><div className="registration-fields">{field('Gênero', 'genero', 'Digite para buscar...')}{field('Estado civil', 'estado_civil', 'Selecione uma opção')}{field('Profissão', 'profissao', 'Digite para buscar...')}{field('Plano de saúde', 'plano_saude', 'Digite para buscar...')}{field('Tratamento', 'tratamentos', 'Digite para buscar...')}{field('Medicamento', 'medicamento', 'Digite para buscar...')}</div></section>
                <section><div className="section-heading"><b>04</b><div><h3>Financeiro</h3><p>Forma de cobrança, valor e meio de pagamento.</p></div></div>{mode === 'completo' ? <div className="registration-fields"><label><span>Forma de cobrança</span><select value={form.cobranca} onChange={e => set('cobranca', e.target.value)}><option>Por sessão</option><option>Pacote</option></select></label><label><span>Moeda do paciente</span><select value={form.moeda} onChange={e => set('moeda', e.target.value)}><option value="BRL">BRL · Real brasileiro</option><option value="USD">USD · Dólar</option><option value="EUR">EUR · Euro</option></select></label>{field('Valor da sessão', 'valor', '100,00')}<label><span>Meio de pagamento</span><select value={form.pagamento} onChange={e => set('pagamento', e.target.value)}><option>PIX</option><option>Cartão</option><option>Dinheiro</option><option>Boleto</option></select></label><p className="billing-summary">Cobrança {form.cobranca.toLowerCase()} em {form.pagamento}, valor R$ {form.valor}.</p></div> : <p className="deferred-note">A cobrança poderá ser configurada depois no Financeiro do paciente.</p>}</section>
              </div>
            </div>
          )}
          {error && <p className="registration-error">{error}</p>}
          <footer className="registration-v2-footer"><button type="button" className="button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={saving}>{saving ? 'Salvando...' : patient ? 'Salvar alterações' : mode === 'casal' ? 'Criar casal' : 'Criar paciente'}</button></footer>
        </form>
      </div>
    </ModalPortal>
  );
}
