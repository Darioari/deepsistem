'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { SchedulingSettings } from '@/components/scheduling-settings';
import { ModalPortal } from '@/components/modal-portal';
import { BrandLogo } from '@/components/brand-logo';
import { PaymentSettings } from '@/components/payment-settings';
import { AiIcon } from '@/components/ai-icon';
import { DESIGN_TOKENS } from '@/lib/design-system';
import {
  ArrowRight, CalendarDays, Check, CreditCard, DollarSign, FileSignature, Globe2, HelpCircle, ImagePlus, LockKeyhole, Mail,
  Palette, Save, ShieldCheck, UserRound, Video, X,
} from 'lucide-react';

type Address = { pais: string; cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string };
type Profile = {
  nome: string; nome_civil: string; nome_social: string; email: string; telefone: string; data_nascimento: string;
  documento_tipo: 'cpf' | 'cnpj'; documento: string; registro: string; foto_url: string; assinatura_data_url: string;
  endereco: Address; termo_atendimento: string; cabecalho: string; rodape: string; mensagem_whatsapp: string;
  tenant_id?: string; onboarding_concluido?: boolean;
};
type Brand = { cor_primaria: string; cor_secundaria: string; tema_padrao: string; logotipo_url: string; logotipo_tamanho?: number; background_url: string; video_background_url: string };
type IaConfig = { enabled: boolean; automaticTranscription: boolean; automaticSummary: boolean; fillEvolution: boolean; fillPlan: boolean };
type Subscription = { plan: string; status: string; monthlyPrice: number; nextPaymentDate: string; lastPaymentDate: string; lastPaymentAmount: number; billingBlocked?: boolean; billingMessage?: string; checkoutUrl?: string };
type ProfessionalPlan = 'start' | 'pro';
type MfaState = { active: boolean; trustedDevices: number; email: string };
type MfaSetup = { secret: string; uri: string; qrDataUrl: string };
export type SettingsSection = 'perfil' | 'seguranca' | 'pagina' | 'agenda' | 'ia' | 'personalizacao' | 'assinatura' | 'financeiro';

const initialAddress: Address = { pais: 'Brasil', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };
const initialProfile: Profile = { nome: '', nome_civil: '', nome_social: '', email: '', telefone: '', data_nascimento: '', documento_tipo: 'cpf', documento: '', registro: '', foto_url: '', assinatura_data_url: '', endereco: initialAddress, termo_atendimento: '', cabecalho: '', rodape: '', mensagem_whatsapp: '' };
const initialBrand: Brand = { cor_primaria: DESIGN_TOKENS.color.primary, cor_secundaria: DESIGN_TOKENS.color.secondary, tema_padrao: 'light', logotipo_url: '', logotipo_tamanho: 48, background_url: '', video_background_url: '' };
const initialIa: IaConfig = { enabled: true, automaticTranscription: true, automaticSummary: true, fillEvolution: true, fillPlan: true };
const initialSubscription: Subscription = { plan: 'start', status: 'trial', monthlyPrice: 0, nextPaymentDate: '', lastPaymentDate: '', lastPaymentAmount: 0 };
const initialMfa: MfaState = { active: false, trustedDevices: 0, email: '' };

const sections = [
  ['perfil', 'Meu Perfil', UserRound], ['seguranca', 'Segurança', LockKeyhole], ['pagina', 'Minha Página', Globe2], ['agenda', 'Agenda', CalendarDays],
  ['ia', 'Atendimento e IA', AiIcon], ['personalizacao', 'Personalização', Palette], ['assinatura', 'Minha Assinatura', CreditCard], ['financeiro', 'Financeiro', DollarSign],
] as const;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`settings-toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button>;
}

function formatMoney(value: number) { return value ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Grátis'; }

export function SettingsHub({ initialSection = 'perfil', plan = 'start' }: { initialSection?: SettingsSection; plan?: ProfessionalPlan }) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [brand, setBrand] = useState<Brand>(initialBrand);
  const [ia, setIa] = useState<IaConfig>(initialIa);
  const [subscription, setSubscription] = useState<Subscription>(initialSubscription);
  const [mfa, setMfa] = useState<MfaState>(initialMfa);
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaMode, setMfaMode] = useState<'setup' | 'disable'>('setup');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [videoBackgroundUploading, setVideoBackgroundUploading] = useState(false);
  const [hideHelp, setHideHelp] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('deepsistem_hide_help') === 'true'; } catch { return false; }
  });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/profissional').then(response => response.ok ? response.json() : Promise.reject()),
      fetch('/api/brand/settings').then(response => response.ok ? response.json() : Promise.reject()),
      plan === 'pro' ? fetch('/api/ia/configuracoes').then(response => response.ok ? response.json() : Promise.reject()) : Promise.resolve(initialIa),
      fetch('/api/assinatura').then(response => response.ok ? response.json() : Promise.reject()),
      fetch('/api/profissional/mfa').then(response => response.ok ? response.json() : Promise.reject()),
    ]).then(([profileData, brandData, iaData, subscriptionData, mfaData]) => {
      if (cancelled) return;
      const loadedProfile = profileData as Partial<Profile> & { endereco?: Partial<Address> };
      setProfile({ ...initialProfile, ...loadedProfile, nome_civil: String(loadedProfile.nome_civil || loadedProfile.nome || ''), endereco: { ...initialAddress, ...(loadedProfile.endereco || {}) } });
      setBrand({ ...initialBrand, ...(brandData.brand || brandData) });
      setIa({ ...initialIa, ...iaData });
      setSubscription({ ...initialSubscription, ...subscriptionData });
      setMfa({ ...initialMfa, ...mfaData });
    }).catch(() => { if (!cancelled) setMessage('Não foi possível carregar todas as configurações.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [plan]);

  useEffect(() => {
    if (plan === 'start' && (section === 'ia' || section === 'financeiro')) setSection('perfil');
  }, [plan, section]);

  function setProfileField<K extends keyof Profile>(field: K, value: Profile[K]) { setProfile(current => ({ ...current, [field]: value })); }
  function setAddressField(field: keyof Address, value: string) { setProfile(current => ({ ...current, endereco: { ...current.endereco, [field]: value } })); }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage('');
    const response = await fetch('/api/profissional', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, nome: profile.nome_civil }) });
    const data = await response.json();
    setSaving(false);
    setMessage(response.ok ? 'Perfil atualizado com sucesso.' : (data.error || 'Não foi possível salvar o perfil.'));
    if (response.ok) setProfile(current => ({ ...current, ...data, nome_civil: String(data.nome_civil || data.nome || current.nome_civil) }));
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true); setMessage('');
    const form = new FormData(); form.append('file', file);
    const response = await fetch('/api/profissional/avatar', { method: 'POST', body: form });
    const data = await response.json();
    setAvatarUploading(false);
    if (response.ok) { setProfileField('foto_url', data.url); setMessage('Foto de perfil atualizada.'); } else setMessage(data.error || 'Não foi possível enviar a foto.');
  }

  async function uploadBackground(file: File) {
    setBackgroundUploading(true); setMessage('');
    const form = new FormData(); form.append('file', file); form.append('kind', 'background');
    const response = await fetch('/api/brand/logo', { method: 'POST', body: form });
    const data = await response.json();
    setBackgroundUploading(false);
    if (response.ok) {
      const next = { ...brand, background_url: data.url };
      setBrand(next);
      window.dispatchEvent(new CustomEvent('deepsistem-brand-updated', { detail: next }));
      setMessage('Plano de fundo atualizado.');
    } else setMessage(data.error || 'Não foi possível enviar o plano de fundo.');
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true); setMessage('');
    const form = new FormData(); form.append('file', file); form.append('kind', 'logo');
    const response = await fetch('/api/brand/logo', { method: 'POST', body: form });
    const data = await response.json();
    setLogoUploading(false);
    if (response.ok) {
      const next = { ...brand, logotipo_url: data.url };
      setBrand(next);
      window.dispatchEvent(new CustomEvent('deepsistem-brand-updated', { detail: next }));
      setMessage('Logotipo atualizado.');
    } else setMessage(data.error || 'Não foi possível enviar o logotipo.');
  }

  async function uploadVideoBackground(file: File) {
    setVideoBackgroundUploading(true); setMessage('');
    const form = new FormData(); form.append('file', file); form.append('kind', 'video-background');
    const response = await fetch('/api/brand/logo', { method: 'POST', body: form });
    const data = await response.json();
    setVideoBackgroundUploading(false);
    if (response.ok) {
      const next = { ...brand, video_background_url: data.url };
      setBrand(next);
      setMessage('Fundo da videochamada atualizado.');
    } else setMessage(data.error || 'Não foi possível enviar o fundo da videochamada.');
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault(); setMessage('');
    if (password.newPassword !== password.confirmation) return setMessage('A confirmação da nova senha não confere.');
    setSaving(true);
    const response = await fetch('/api/profissional/seguranca', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(password) });
    const data = await response.json(); setSaving(false);
    if (response.ok) setPassword({ currentPassword: '', newPassword: '', confirmation: '' });
    setMessage(response.ok ? data.message : (data.error || 'Não foi possível alterar a senha.'));
  }

  function saveHelpVisibility(value: boolean) {
    setHideHelp(value);
    try { localStorage.setItem('deepsistem_hide_help', String(value)); } catch { /* mantém a preferência apenas nesta sessão */ }
    window.dispatchEvent(new Event('deepsistem-help-toggle'));
    setMessage(value ? 'Botão de ajuda ocultado neste navegador.' : 'Botão de ajuda exibido novamente.');
  }

  async function openMfaSetup() {
    setMfaMode('setup'); setMfaCode(''); setMessage('');
    const response = await fetch('/api/profissional/mfa', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || 'Não foi possível iniciar a Autenticação Multifator.');
    const qrDataUrl = await QRCode.toDataURL(data.uri, { width: 188, margin: 1, color: { dark: '#18353D', light: '#ffffff' } });
    setMfaSetup({ ...data, qrDataUrl }); setMfaModalOpen(true);
  }

  async function verifyMfa(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    const response = await fetch('/api/profissional/mfa', { method: mfaMode === 'setup' ? 'PUT' : 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: mfaCode }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(data.error || 'Não foi possível validar o código.');
    setMfa(current => ({ ...current, active: data.active })); setMfaModalOpen(false); setMfaSetup(null); setMfaCode(''); setMessage(data.message || 'Configuração de segurança atualizada.');
  }

  async function saveIa(next: IaConfig) {
    setIa(next); setSaving(true); setMessage('');
    const response = await fetch('/api/ia/configuracoes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
    setSaving(false); setMessage(response.ok ? 'Preferências de IA salvas.' : 'Não foi possível salvar as preferências de IA.');
  }

  async function saveBrand(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    const response = await fetch('/api/brand/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brand) });
    setSaving(false); setMessage(response.ok ? 'Identidade visual salva.' : 'Não foi possível salvar a identidade visual.');
    if (response.ok) {
      document.documentElement.style.setProperty('--color-primary', brand.cor_primaria);
      document.documentElement.style.setProperty('--color-secondary', brand.cor_secundaria);
      window.dispatchEvent(new CustomEvent('deepsistem-brand-updated', { detail: brand }));
    }
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) { drawingRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); draw(event); }
  function stopDrawing() { drawingRef.current = false; }
  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = event.currentTarget; const rect = canvas.getBoundingClientRect(); const context = canvas.getContext('2d');
    if (!context) return;
    context.lineWidth = 2; context.lineCap = 'round'; context.strokeStyle = '#18353D'; context.lineTo(event.clientX - rect.left, event.clientY - rect.top); context.stroke(); context.beginPath(); context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }
  function clearSignature() { const canvas = canvasRef.current; const context = canvas?.getContext('2d'); if (canvas && context) { context.clearRect(0, 0, canvas.width, canvas.height); context.beginPath(); } setProfileField('assinatura_data_url', ''); }
  function saveSignature() { const canvas = canvasRef.current; if (!canvas) return; setProfileField('assinatura_data_url', canvas.toDataURL('image/png')); setMessage('Assinatura preparada. Clique em salvar perfil para confirmar.'); }

  function renderProfile() {
    return <form className="settings-content-form" onSubmit={saveProfile}>
      <div className="settings-section-head"><div><span className="eyebrow">Identidade profissional</span><h2>Meu Perfil</h2><p>Foto, dados cadastrais e assinatura usada nos documentos do sistema.</p></div><button className="btn-primary btn-compact" disabled={saving}><Save />{saving ? 'Salvando...' : 'Salvar perfil'}</button></div>
      <section className="settings-card profile-photo-card"><div className="profile-avatar-large">{profile.foto_url ? <img src={profile.foto_url} alt="Foto de perfil" /> : (profile.nome_civil || 'DP').slice(0, 2).toUpperCase()}</div><div><h3>Foto de perfil</h3><p>JPG, JPEG, PNG, GIF ou WEBP. Máximo 5 MB.</p><label className="btn-secondary settings-upload-button"><ImagePlus />{avatarUploading ? 'Enviando...' : 'Adicionar foto'}<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" disabled={avatarUploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.currentTarget.value = ''; }} /></label></div></section>
      <section className="settings-card"><div className="settings-card-title"><UserRound /><div><h3>Dados cadastrais</h3><p>Nome civil, nome social, contato, documento e endereço para cadastro e documentos.</p></div></div><div className="settings-form-grid"><label>Nome completo (nome civil) *<input className="form-control" value={profile.nome_civil} onChange={event => setProfileField('nome_civil', event.target.value)} required /></label><label>Nome social <small>Opcional</small><input className="form-control" value={profile.nome_social} onChange={event => setProfileField('nome_social', event.target.value)} placeholder="Como prefere ser chamado(a)" /></label><label>E-mail <small>Não pode ser alterado</small><div className="input-with-icon"><Mail /><input className="form-control" value={profile.email} readOnly /></div></label><label>Telefone *<input className="form-control" value={profile.telefone} onChange={event => setProfileField('telefone', event.target.value)} required /></label><label>Data de nascimento<input className="form-control" type="date" value={profile.data_nascimento} onChange={event => setProfileField('data_nascimento', event.target.value)} /></label><label>CRP<input className="form-control" value={profile.registro} onChange={event => setProfileField('registro', event.target.value)} placeholder="Ex.: 06/123456" /></label><label>Tipo de documento<select className="form-control" value={profile.documento_tipo} onChange={event => setProfileField('documento_tipo', event.target.value as Profile['documento_tipo'])}><option value="cpf">Pessoa física (CPF)</option><option value="cnpj">Pessoa jurídica (CNPJ)</option></select></label><label>CPF ou CNPJ *<input className="form-control" value={profile.documento} onChange={event => setProfileField('documento', event.target.value)} required placeholder={profile.documento_tipo === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'} /></label></div></section>
      <section className="settings-card"><div className="settings-card-title"><span className="settings-card-icon">⌂</span><div><h3>Endereço</h3><p>Esses dados podem aparecer nos recibos e documentos gerados.</p></div></div><div className="settings-form-grid"><label>CEP *<input className="form-control" value={profile.endereco.cep} onChange={event => setAddressField('cep', event.target.value)} required /></label><label>País<select className="form-control" value={profile.endereco.pais} onChange={event => setAddressField('pais', event.target.value)}><option>Brasil</option><option>Outro</option></select></label><label className="settings-span-2">Logradouro *<input className="form-control" value={profile.endereco.logradouro} onChange={event => setAddressField('logradouro', event.target.value)} required /></label><label>Número *<input className="form-control" value={profile.endereco.numero} onChange={event => setAddressField('numero', event.target.value)} required /></label><label>Complemento<input className="form-control" value={profile.endereco.complemento} onChange={event => setAddressField('complemento', event.target.value)} placeholder="Apto, sala…" /></label><label>Bairro<input className="form-control" value={profile.endereco.bairro} onChange={event => setAddressField('bairro', event.target.value)} /></label><label>Cidade<input className="form-control" value={profile.endereco.cidade} onChange={event => setAddressField('cidade', event.target.value)} /></label><label>Estado (UF)<input className="form-control" value={profile.endereco.uf} onChange={event => setAddressField('uf', event.target.value)} placeholder="RJ" /></label></div></section>
      <section className="settings-card"><div className="settings-card-title"><FileSignature /><div><h3>Assinatura</h3><p>Usada em recibos e outros PDFs gerados pelo sistema. Desenhe somente ao editar.</p></div></div><div className="signature-editor"><canvas ref={canvasRef} width={700} height={180} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} />{profile.assinatura_data_url && <div className="signature-saved"><Check /> Assinatura cadastrada</div>}<div><button type="button" className="btn-secondary" onClick={clearSignature}><X /> Limpar</button><button type="button" className="btn-primary btn-compact" onClick={saveSignature}><FileSignature /> Usar assinatura</button></div></div></section>
    </form>;
  }

  function renderSecurity() {
    return <div className="settings-content-form"><div className="settings-section-head"><div><span className="eyebrow">Conta e acesso</span><h2>Segurança</h2><p>Proteja sua conta e os dados sensíveis dos pacientes.</p></div></div><form className="settings-card" onSubmit={savePassword}><div className="settings-card-title"><ShieldCheck /><div><h3>Alterar senha</h3><p>Use uma senha forte e exclusiva para o DeePsistem.</p></div></div><div className="settings-form-grid"><label>Senha atual<input className="form-control" type="password" value={password.currentPassword} onChange={event => setPassword({ ...password, currentPassword: event.target.value })} required /></label><label>Nova senha<input className="form-control" type="password" minLength={8} value={password.newPassword} onChange={event => setPassword({ ...password, newPassword: event.target.value })} required /></label><label>Confirmar nova senha<input className="form-control" type="password" value={password.confirmation} onChange={event => setPassword({ ...password, confirmation: event.target.value })} required /></label></div><button className="btn-primary btn-compact" disabled={saving}><LockKeyhole /> Alterar senha</button></form><section className="settings-card settings-muted-card"><div className="settings-card-title"><ShieldCheck /><div><h3>Verificação em duas etapas</h3><p>Adicione uma camada extra de proteção para acessar sua conta.</p></div></div><div className="settings-status-row"><strong>Em preparação</strong><span>O aplicativo autenticador será habilitado após a configuração do provedor de autenticação.</span></div></section></div>;
  }

  function renderSecurityFull() {
    return <div className="settings-content-form"><div className="settings-section-head"><div><span className="eyebrow">Conta e acesso</span><h2>Segurança</h2><p>Proteja sua conta e os dados sensíveis dos pacientes.</p></div></div><form className="settings-card" onSubmit={savePassword}><div className="settings-card-title"><ShieldCheck /><div><h3>Alterar senha</h3><p>Use uma senha forte e exclusiva para o DeePsistem.</p></div></div><div className="settings-form-grid"><label>Senha atual<input className="form-control" type="password" value={password.currentPassword} onChange={event => setPassword({ ...password, currentPassword: event.target.value })} required /></label><label>Nova senha<input className="form-control" type="password" minLength={8} value={password.newPassword} onChange={event => setPassword({ ...password, newPassword: event.target.value })} required /></label><label>Confirmar nova senha<input className="form-control" type="password" value={password.confirmation} onChange={event => setPassword({ ...password, confirmation: event.target.value })} required /></label></div><button className="btn-primary btn-compact" disabled={saving}><LockKeyhole /> Alterar senha</button></form><section className="settings-card"><div className="settings-card-title"><HelpCircle /><div><h3>Assistente de ajuda</h3><p>Controle a exibição do botão “Ajuda?” neste navegador. Essa preferência não altera a Aura clínica.</p></div><Toggle checked={!hideHelp} onChange={value => saveHelpVisibility(!value)} label="Exibir botão de ajuda" /></div><div className="settings-info-note">Quando oculto, você pode voltar a esta opção por Configurações &gt; Segurança para exibir o botão novamente.</div></section><section className="settings-card settings-muted-card"><div className="settings-card-title"><ShieldCheck /><div><h3>Autenticação Multifator</h3><p>Use Google Authenticator, Microsoft Authenticator, 1Password ou outro aplicativo compatível.</p></div></div><div className="mfa-status-grid"><div><small>Status</small><strong className={mfa.active ? 'positive' : ''}>{mfa.active ? 'Ativo' : 'Inativo'}</strong></div><div><small>Dispositivos confiáveis</small><strong>{mfa.trustedDevices} ativos</strong><span>Pulam a Autenticação Multifator por 30 dias.</span></div></div><div className="settings-info-note">Se você perder o aplicativo autenticador, será necessário recuperar o acesso por um código enviado ao e-mail cadastrado.</div><button type="button" className="btn-primary btn-compact mfa-action-button" onClick={() => mfa.active ? (setMfaMode('disable'), setMfaCode(''), setMfaModalOpen(true)) : void openMfaSetup()}>{mfa.active ? 'Desativar Autenticação Multifator' : 'Ativar Autenticação Multifator'}</button></section>{mfaModalOpen && <ModalPortal><div className="modal-overlay" onMouseDown={() => setMfaModalOpen(false)}><form className="modal-content mfa-modal" onMouseDown={event => event.stopPropagation()} onSubmit={verifyMfa}><div className="modal-header"><div><span className="eyebrow">Segurança da conta</span><h3>{mfaMode === 'setup' ? 'Ativar Autenticação Multifator' : 'Desativar Autenticação Multifator'}</h3></div><button type="button" onClick={() => setMfaModalOpen(false)} aria-label="Fechar"><X /></button></div>{mfaMode === 'setup' && mfaSetup ? <><p className="mfa-instruction">Escaneie o QR Code com seu aplicativo autenticador e digite o código de 6 dígitos abaixo.</p><div className="mfa-setup-content"><img src={mfaSetup.qrDataUrl} alt="QR Code para configurar o autenticador" /><div><span>Conta: {mfa.email || 'seu e-mail'}</span><small>Ou digite manualmente:</small><code>{mfaSetup.secret}</code></div></div></> : <p className="mfa-instruction">Digite um código atual do seu aplicativo autenticador para confirmar a desativação.</p>}<label className="mfa-code-label">Código de 6 dígitos<input className="form-control mfa-code-input" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={mfaCode} onChange={event => setMfaCode(event.target.value.replace(/\D/g, ''))} placeholder="0 0 0 0 0 0" required /></label><div className="finance-modal-actions"><button type="button" className="btn-cancel" onClick={() => setMfaModalOpen(false)}>Cancelar</button><button className="btn-primary btn-compact" disabled={saving}>{mfaMode === 'setup' ? 'Ativar' : 'Desativar'}</button></div></form></div></ModalPortal>}</div>;
  }

  function renderIa() {
    const toggle = (field: keyof IaConfig) => (value: boolean) => void saveIa({ ...ia, [field]: value });
    return <div className="settings-content-form"><div className="settings-section-head"><div><span className="eyebrow">Copiloto clínico</span><h2>Atendimento e IA</h2><p>Controle a transcrição, o resumo e o preenchimento assistido das sessões.</p></div><span className={`settings-live-pill ${ia.enabled ? 'active' : ''}`}>{ia.enabled ? 'IA ativa' : 'IA pausada'}</span></div><section className="settings-card settings-ai-card"><div className="settings-card-title"><AiIcon /><div><h3>Recursos de Inteligência Artificial</h3><p>A transcrição só funciona em atendimentos com consentimento válido do paciente.</p></div><Toggle checked={ia.enabled} onChange={toggle('enabled')} label="Ativar recursos de inteligência artificial" /></div><div className="settings-info-note">Os áudios não são armazenados. A transcrição e os resultados gerados são tratados conforme a configuração do atendimento e o consentimento registrado.</div></section><section className="settings-card"><div className="settings-card-title"><AiIcon /><div><h3>Preenchimento automático por IA</h3><p>Escolha quais campos podem receber sugestões após a geração do resumo.</p></div></div><div className="settings-option-list"><div><div><strong>Transcrição automática</strong><small>Converte a fala da sessão em texto quando o recurso estiver autorizado.</small></div><Toggle checked={ia.automaticTranscription} onChange={toggle('automaticTranscription')} label="Transcrição automática" /></div><div><div><strong>Gerar resumo automaticamente</strong><small>Prepara um resumo para revisão profissional ao finalizar o atendimento.</small></div><Toggle checked={ia.automaticSummary} onChange={toggle('automaticSummary')} label="Resumo automático" /></div><div><div><strong>Preencher evolução clínica</strong><small>Usa o resumo para sugerir a evolução observada na sessão.</small></div><Toggle checked={ia.fillEvolution} onChange={toggle('fillEvolution')} label="Preencher evolução clínica" /></div><div><div><strong>Preencher plano de ação</strong><small>Identifica tarefas e combinados para você revisar antes de salvar.</small></div><Toggle checked={ia.fillPlan} onChange={toggle('fillPlan')} label="Preencher plano de ação" /></div></div></section><div className="settings-info-grid"><div className="settings-info-note"><strong>Quando ativa</strong><span>A transcrição é iniciada durante o atendimento online autorizado e o resumo fica disponível sob demanda.</span></div><div className="settings-info-note"><strong>LGPD</strong><span>O consentimento de uso de IA deve estar ativo para cada paciente antes da geração do resumo.</span></div></div></div>;
  }

  function renderPersonalizationEnhanced() {
    return <div className="settings-content-form">
      <div className="settings-section-head"><div><span className="eyebrow">Experiência do consultório</span><h2>Personalização</h2><p>Defina a identidade visual, os textos do consultório e o plano de fundo do seu ambiente profissional.</p></div></div>
      <form className="settings-card" onSubmit={saveBrand}>
        <div className="settings-card-title"><Palette /><div><h3>Marca do consultório</h3><p>As cores e o logotipo aparecem no seu ambiente profissional e nos materiais aplicáveis.</p></div></div>
        <div className="settings-brand-preview" style={{ background: `linear-gradient(135deg, ${brand.cor_primaria}, ${brand.cor_secundaria})` }}>
          <BrandLogo customLogoUrl={brand.logotipo_url} logoSize={brand.logotipo_tamanho || 48} inverse />
          <div className="settings-preview-tag">
            <span>Pré-visualização da sua identidade</span>
            <small style={{ opacity: 0.85, fontSize: '0.7rem' }}>Tamanho atual: {brand.logotipo_tamanho || 48}px</small>
          </div>
        </div>
        <div className="settings-form-grid">
          <label>Cor principal<input type="color" value={brand.cor_primaria} onChange={event => setBrand({ ...brand, cor_primaria: event.target.value })} /></label>
          <label>Cor secundária<input type="color" value={brand.cor_secundaria} onChange={event => setBrand({ ...brand, cor_secundaria: event.target.value })} /></label>
          <div className="settings-span-2 settings-logo-field">
            <label>URL do logotipo<input className="form-control" type="url" value={brand.logotipo_url} onChange={event => setBrand({ ...brand, logotipo_url: event.target.value })} placeholder="https://..." /></label>
            <div className="settings-logo-upload"><label className="btn-secondary settings-upload-button"><ImagePlus />{logoUploading ? 'Enviando...' : 'Enviar arquivo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" disabled={logoUploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); event.currentTarget.value = ''; }} /></label><small>Escolha uma URL ou envie PNG, JPG, WebP, SVG ou GIF.</small></div>
          </div>

          {/* Controle de tamanho do logotipo solicitado pelo usuário */}
          <div className="settings-span-2 settings-logo-size-control">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'block' }}>Tamanho do logotipo na tela</strong>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Aumente ou diminua para facilitar a leitura da sua marca na LP e no sistema.</small>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', padding: '3px 8px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <button
                  type="button"
                  style={{ width: '26px', height: '26px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-app)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => {
                    const current = Number(brand.logotipo_tamanho) || 48;
                    const next = Math.max(28, current - 4);
                    const updated = { ...brand, logotipo_tamanho: next };
                    setBrand(updated);
                    window.dispatchEvent(new CustomEvent('deepsistem-brand-updated', { detail: updated }));
                  }}
                  title="Diminuir tamanho"
                >
                  -
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <input
                    type="number"
                    min={28}
                    max={140}
                    value={brand.logotipo_tamanho || 48}
                    onChange={event => {
                      const val = parseInt(event.target.value, 10);
                      if (!isNaN(val)) {
                        const clamped = Math.min(160, Math.max(24, val));
                        const updated = { ...brand, logotipo_tamanho: clamped };
                        setBrand(updated);
                        window.dispatchEvent(new CustomEvent('deepsistem-brand-updated', { detail: updated }));
                      }
                    }}
                    style={{ width: '45px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', border: 0, background: 'transparent', outline: 'none' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>px</span>
                </div>
                <button
                  type="button"
                  style={{ width: '26px', height: '26px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-app)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => {
                    const current = Number(brand.logotipo_tamanho) || 48;
                    const next = Math.min(140, current + 4);
                    const updated = { ...brand, logotipo_tamanho: next };
                    setBrand(updated);
                    window.dispatchEvent(new CustomEvent('deepsistem-brand-updated', { detail: updated }));
                  }}
                  title="Aumentar tamanho"
                >
                  +
                </button>
              </div>
            </div>

            {/* Barra / Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Pequeno (28px)</span>
              <input
                type="range"
                min={28}
                max={130}
                step={2}
                value={brand.logotipo_tamanho || 48}
                onChange={event => {
                  const val = parseInt(event.target.value, 10);
                  const updated = { ...brand, logotipo_tamanho: val };
                  setBrand(updated);
                  window.dispatchEvent(new CustomEvent('deepsistem-brand-updated', { detail: updated }));
                }}
                style={{ flex: 1, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Grande (130px)</span>
            </div>

            {/* Presets rápidos */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginRight: '4px' }}>Tamanhos sugeridos:</span>
              {[
                { label: 'Padrão (40px)', size: 40 },
                { label: 'Médio (52px)', size: 52 },
                { label: 'Grande (68px)', size: 68 },
                { label: 'Destaque (88px)', size: 88 },
                { label: 'Máximo (110px)', size: 110 },
              ].map(preset => (
                <button
                  key={preset.size}
                  type="button"
                  onClick={() => {
                    const updated = { ...brand, logotipo_tamanho: preset.size };
                    setBrand(updated);
                    window.dispatchEvent(new CustomEvent('deepsistem-brand-updated', { detail: updated }));
                  }}
                  style={{
                    fontSize: '0.68rem',
                    padding: '4px 9px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: (brand.logotipo_tamanho || 48) === preset.size ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                    background: (brand.logotipo_tamanho || 48) === preset.size ? 'var(--color-primary)' : 'var(--bg-card)',
                    color: (brand.logotipo_tamanho || 48) === preset.size ? '#fff' : 'var(--text-main)',
                    fontWeight: (brand.logotipo_tamanho || 48) === preset.size ? 700 : 500,
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button className="btn-primary btn-compact" disabled={saving || logoUploading}><Save /> Salvar identidade</button>
      </form>
      <section className="settings-card"><div className="settings-card-title"><ImagePlus /><div><h3>Plano de fundo do ambiente</h3><p>Escolha uma imagem para personalizar somente o seu painel profissional. Ela não será exibida ao paciente.</p></div></div><div className="settings-background-preview" style={{ backgroundImage: brand.background_url ? `linear-gradient(135deg, rgba(24,53,61,.78), rgba(9,164,179,.3)), url(${brand.background_url})` : `linear-gradient(135deg, ${brand.cor_primaria}, ${brand.cor_secundaria})` }}><span>{brand.background_url ? 'Plano de fundo selecionado' : 'Sem plano de fundo personalizado'}</span></div><div className="settings-upload-row"><label className="btn-secondary settings-upload-button"><ImagePlus />{backgroundUploading ? 'Enviando...' : 'Escolher imagem'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={backgroundUploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadBackground(file); event.currentTarget.value = ''; }} /></label>{brand.background_url && <button type="button" className="btn-secondary" onClick={() => { const next = { ...brand, background_url: '' }; setBrand(next); window.dispatchEvent(new CustomEvent('deepsistem-brand-updated', { detail: next })); }}><X /> Remover imagem</button>}<small>JPG, PNG, WebP ou GIF · máximo 10 MB</small></div></section>
      <section className="settings-card"><div className="settings-card-title"><Video /><div><h3>Fundo da videochamada</h3><p>Adicione uma imagem para aparecer atrás de você durante o atendimento. Essa configuração vale somente para o profissional; o paciente não recebe esse fundo.</p></div></div><div className="settings-video-background-preview" style={{ backgroundImage: brand.video_background_url ? `linear-gradient(135deg, rgba(24,53,61,.18), rgba(9,164,179,.18)), url(${brand.video_background_url})` : `linear-gradient(135deg, ${brand.cor_primaria}, ${brand.cor_secundaria})` }}><span>{brand.video_background_url ? 'Fundo da chamada selecionado' : 'Nenhum fundo de chamada selecionado'}</span></div><div className="settings-upload-row"><label className="btn-secondary settings-upload-button"><ImagePlus />{videoBackgroundUploading ? 'Enviando...' : 'Adicionar fundo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={videoBackgroundUploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadVideoBackground(file); event.currentTarget.value = ''; }} /></label>{brand.video_background_url && <button type="button" className="btn-secondary" onClick={() => { const next = { ...brand, video_background_url: '' }; setBrand(next); void fetch('/api/brand/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }); }}><X /> Remover fundo</button>}<small>JPG, PNG, WebP ou GIF · máximo 10 MB · usado somente na sua câmera</small></div></section>
      <section className="settings-card"><div className="settings-card-title"><FileSignature /><div><h3>Textos padrão</h3><p>Use estes textos em documentos, recibos e mensagens ao paciente.</p></div></div><div className="settings-form-grid"><label className="settings-span-2">Termo de atendimento<textarea className="form-control" rows={5} value={profile.termo_atendimento} onChange={event => setProfileField('termo_atendimento', event.target.value)} placeholder="Escreva o termo apresentado ao paciente..." /></label><label>Cabeçalho de documentos<input className="form-control" value={profile.cabecalho} onChange={event => setProfileField('cabecalho', event.target.value)} /></label><label>Rodapé de documentos<input className="form-control" value={profile.rodape} onChange={event => setProfileField('rodape', event.target.value)} /></label><label className="settings-span-2">Mensagem de WhatsApp<textarea className="form-control" rows={3} value={profile.mensagem_whatsapp} onChange={event => setProfileField('mensagem_whatsapp', event.target.value)} placeholder="Olá, [nome]. Confirmamos seu atendimento..." /></label></div><button type="button" className="btn-primary btn-compact" onClick={() => void saveProfile(new Event('submit') as unknown as React.FormEvent)}><Save /> Salvar textos</button></section>
    </div>;
  }

  function renderPersonalization() {
    return renderPersonalizationEnhanced();
    return <div className="settings-content-form"><div className="settings-section-head"><div><span className="eyebrow">Experiência do consultório</span><h2>Personalização</h2><p>Defina a identidade visual, os textos do consultório e as mensagens usadas pelo sistema.</p></div></div><form className="settings-card" onSubmit={saveBrand}><div className="settings-card-title"><Palette /><div><h3>Marca do consultório</h3><p>As cores e o logotipo aparecem no seu ambiente e nos materiais aplicáveis.</p></div></div><div className="settings-brand-preview" style={{ background: `linear-gradient(135deg, ${brand.cor_primaria}, ${brand.cor_secundaria})` }}><BrandLogo customLogoUrl={brand.logotipo_url} inverse /><span>Pré-visualização da sua identidade</span></div><div className="settings-form-grid"><label>Cor principal<input type="color" value={brand.cor_primaria} onChange={event => setBrand({ ...brand, cor_primaria: event.target.value })} /></label><label>Cor secundária<input type="color" value={brand.cor_secundaria} onChange={event => setBrand({ ...brand, cor_secundaria: event.target.value })} /></label><label className="settings-span-2">URL do logotipo<input className="form-control" type="url" value={brand.logotipo_url} onChange={event => setBrand({ ...brand, logotipo_url: event.target.value })} placeholder="https://..." /></label></div><button className="btn-primary btn-compact" disabled={saving}><Save /> Salvar identidade</button></form><section className="settings-card"><div className="settings-card-title"><FileSignature /><div><h3>Textos padrão</h3><p>Use estes textos em documentos, recibos e mensagens ao paciente.</p></div></div><div className="settings-form-grid"><label className="settings-span-2">Termo de atendimento<textarea className="form-control" rows={5} value={profile.termo_atendimento} onChange={event => setProfileField('termo_atendimento', event.target.value)} placeholder="Escreva o termo apresentado ao paciente..." /></label><label>Cabeçalho de documentos<input className="form-control" value={profile.cabecalho} onChange={event => setProfileField('cabecalho', event.target.value)} /></label><label>Rodapé de documentos<input className="form-control" value={profile.rodape} onChange={event => setProfileField('rodape', event.target.value)} /></label><label className="settings-span-2">Mensagem de WhatsApp<textarea className="form-control" rows={3} value={profile.mensagem_whatsapp} onChange={event => setProfileField('mensagem_whatsapp', event.target.value)} placeholder="Olá, [nome]. Confirmamos seu atendimento..." /></label></div><button type="button" className="btn-primary btn-compact" onClick={() => void saveProfile(new Event('submit') as unknown as React.FormEvent)}><Save /> Salvar textos</button></section></div>;
  }

  function renderSubscription() {
    const planLabel = subscription.plan === 'pro' ? 'Deep Pro' : 'Deep Start';
    const statusLabel = { trial: 'Período de teste', active: 'Ativa', past_due: 'Pagamento pendente', cancelled: 'Cancelada', suspended: 'Suspensa' }[subscription.status] || subscription.status;
    return <div className="settings-content-form"><div className="settings-section-head"><div><span className="eyebrow">Plano e pagamento</span><h2>Minha Assinatura</h2><p>Acompanhe o plano vinculado ao seu ambiente DeePsistem.</p></div></div>{subscription.billingBlocked && <div className="billing-lock-banner"><div><CreditCard /><span><strong>{subscription.billingMessage || 'Ative sua conta para continuar.'}</strong><small>Escolha um plano e conclua o pagamento pelo Mercado Pago.</small></span></div><a href={subscription.checkoutUrl || '/assinatura/checkout'}>Ativar minha conta <ArrowRight /></a></div>}<section className="settings-card subscription-summary"><div><CreditCard /><div><strong>{planLabel}</strong><span>{statusLabel}</span></div></div><span className="settings-live-pill active">{subscription.status === 'active' ? 'Ativa' : 'Em acompanhamento'}</span><div className="subscription-metrics"><div><small>Valor</small><strong>{formatMoney(subscription.monthlyPrice)}{subscription.monthlyPrice ? '/mês' : ''}</strong></div><div><small>Próxima cobrança</small><strong>{subscription.nextPaymentDate ? new Date(subscription.nextPaymentDate).toLocaleDateString('pt-BR') : 'A definir'}</strong></div><div><small>Último pagamento</small><strong>{subscription.lastPaymentAmount ? formatMoney(subscription.lastPaymentAmount) : 'Nenhum registro'}</strong></div></div></section><section className="settings-card"><div className="settings-card-title"><CreditCard /><div><h3>Planos disponíveis</h3><p>A contratação e a alteração do plano são confirmadas pela administração.</p></div></div><div className="subscription-plan-grid"><div><strong>Deep Start</strong><span>Recursos essenciais para organizar sua rotina</span><b>Agenda, pacientes, sessões e financeiro básico</b></div><div><strong>Deep Pro</strong><span>Recursos avançados para ampliar o atendimento</span><b>Formulários, vídeo, IA, documentos e pagamentos</b></div></div><div className="settings-info-note">Para solicitar mudança de plano, informe o profissional ao administrador do DeePsistem. O status exibido aqui é o mesmo acompanhado no painel administrativo.</div></section></div>;
  }

  function renderSection() { if (loading) return <div className="settings-loading">Carregando suas configurações...</div>; if (section === 'perfil') return renderProfile(); if (section === 'seguranca') return renderSecurityFull(); if (section === 'pagina') return <div className="settings-content-form"><div className="settings-section-head"><div><span className="eyebrow">Página pública</span><h2>Minha Página</h2><p>Configure o endereço e o conteúdo que novos pacientes verão antes de agendar.</p></div></div><SchedulingSettings mode="page" /></div>; if (section === 'agenda') return <div className="settings-content-form"><div className="settings-section-head"><div><span className="eyebrow">Disponibilidade e operação</span><h2>Agenda</h2><p>Organize horários e duração das sessões.</p></div></div><SchedulingSettings mode="agenda" /></div>; if (section === 'ia' && plan === 'pro') return renderIa(); if (section === 'personalizacao') return renderPersonalization(); if (section === 'financeiro' && plan === 'pro') return <div className="settings-content-form"><div className="settings-section-head"><div><span className="eyebrow">Recebimentos e cobrança</span><h2>Financeiro</h2><p>Configure as formas de pagamento, o valor da entrevista e as credenciais do gateway.</p></div></div><PaymentSettings /></div>; return renderSubscription(); }

  return <section className="settings-hub reveal-element"><div className="settings-hub-header"><div><span className="eyebrow">Configurações</span><h1>Gerencie sua conta e preferências</h1></div></div><div className="settings-layout"><nav className="settings-nav" aria-label="Seções de configurações">{sections.filter(([id]) => plan === 'pro' || !['ia', 'financeiro'].includes(id)).map(([id, label, Icon]) => <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => { setSection(id); setMessage(''); }}><Icon />{label}</button>)}</nav><div className="settings-main">{renderSection()}{message && <div className="settings-feedback">{message}</div>}</div></div></section>;
}
