'use client';
 
 import { useState, useEffect, useRef } from 'react';
 import { useRouter } from 'next/navigation';
 import { BrandLogo } from '@/components/brand-logo';
 import { PatientRegistrationModal } from '@/components/patient-registration-modal';
import { ModalPortal } from '@/components/modal-portal';
import { AgendaView } from '@/components/agenda-view';
 import { PatientFinance } from '@/components/patient-finance';
 import { SessionManagement } from '@/components/session-management';
 import { NeuropsychAssessment } from '@/components/neuropsych-assessment';
 import { PatientPdfSummaryButton } from '@/components/patient-pdf-summary-button';
 import { SettingsHub, type SettingsSection } from '@/components/settings-hub'; import { FormBuilder } from '@/components/form-builder';
 import { AiIcon } from '@/components/ai-icon';
 import { TermsManagement } from '@/components/terms-management'; import { ConsolidatedFinance } from '@/components/consolidated-finance'; import { SetupChecklist } from '@/components/setup-checklist'; import { ProductTour } from '@/components/product-tour'; import { DESIGN_TOKENS } from '@/lib/design-system'; import { 
   Users, Mic, Clipboard, Activity, DollarSign, Settings, LogOut, 
   Plus, Check, Copy, Percent, Moon, Sun, AlertCircle, RefreshCw, X,
   ChevronLeft, ChevronRight, LayoutGrid, Heart, ShieldAlert, Award,
   Calendar, MessageSquare, HelpCircle, Eye, Search, Sliders, Zap, Bell,
   Pencil, Sparkles, Pill, TrendingUp, BookOpen, FileText, MoreHorizontal,
   FolderPlus, PlusCircle, Trash, Upload, Download, FilePlus, ShieldCheck, ChevronDown,
   ArrowRight, FileType, CheckSquare, HeartHandshake, User, Brain, MapPin, Contact,
   Clock, Globe, UserPlus, ArrowUp, ArrowDown, Hourglass
 } from 'lucide-react';
 
 interface Paciente {
   id: string;
   nome: string;
   email: string;
   status: string;
   onboarding_token: string;
   cpf: string;
   data_nascimento: string;
   telefone: string;
   contato_emergencia: string;
   responsavel_nome: string;
   responsavel_telefone: string;
   iniciais?: string;
   genero?: string;
   escolaridade?: string;
   nome_social?: string;
   profissao?: string;
   observacoes?: string;
   plano_saude?: string;
   tratamentos?: string;
   tipo_atendimento?: string;
   estado_civil?: string;
   raca_cor?: string;
   nacionalidade?: string;
   endereco?: { pais?: string; cep?: string; numero?: string; rua?: string; bairro?: string; cidade?: string; complemento?: string; uf?: string };
   cobranca?: { tipo?: string; moeda?: string; valor?: string | number; meio_pagamento?: string };
 }
 
 interface Meta {
   id: number;
   meta: string;
   tipo: string;
 }
 
 interface Score {
   semana: string;
   score: number;
 }
 
 interface ReabilitacaoData {
   paciente_id: string;
   baseline: string;
   metas: Meta[];
   scores: Score[];
 }
 
 interface Lancamento {
   id: string;
   paciente_nome: string;
   competencia: string;
   valor: number;
   data_vencimento: string;
   status: string;
   paciente_id?: string;
   paciente_email?: string;
   checkout_url?: string;
   response_id?: string;
 }
 
 interface SessaoClinica {
   id: string;
   data: string;
   duracao: number;
   modalidade: string;
   resposta: string;
   observacoes: string;
   tarefa: string;
 }
 
 interface EvolucaoItem {
   id: string;
   data: string;
   pontosImportantes: string;
   ataCompleta: string;
 }
 
 interface Medicamento {
   id: string;
   nome: string;
   dosagem?: string;
   frequencia?: string;
 }
 
 interface Encaminhamento {
   id: string;
   descricao: string;
 }
 
 interface ArquivoBiblioteca {
   id: string;
   nome: string;
   tipo: string;
   tamanho: string;
   data: string;
 }
 
 interface BloqueioAgenda {
   id: string;
   nome: string;
   data: string;
   hora: string;
   duracao: string;
   recorrencia: string;
   cor: string;
   notes?: string;
   tipo?: string;
   modalidade?: string;
   paciente_id?: string;
   status?: string;
 }
 
 interface MonitoramentoItem { id: string; paciente_id: string; tipo: string; valor: number; observacao: string; data: string }
 
 interface ChatMensagem {
   id: string;
   sender: 'user' | 'ia';
   text: string;
   time: string;
 }
 
 interface CentralPacienteData {
   notas: Array<{ id: string; titulo: string; conteudo: string; criado_em: string }>;
   documentos: Array<{ id: string; nome: string; categoria: string; criado_em: string; url?: string; mime_type?: string; tamanho_bytes?: number }>;
   medicacoes: Array<{ id: string; nome: string; dosagem: string; frequencia: string }>;
   encaminhamentos: Array<{ id: string; descricao: string; criado_em: string }>;
   conversas_aura: ChatMensagem[];
   anamnese: { historico_familiar: string; desenvolvimento_neuropsicomotor: string; historico_escolar: string; historico_ocupacional: string; historico_medico: string };
   resumo_clinico: { queixas_principais: string; hipoteses_diagnosticas: string; alertas_medicos: string; exames_laboratoriais: string; medicamentos: string; observacoes: string };
   reabilitacao: { dominios: string[]; baseline: string; rede_apoio: string; formulacao_caso: string; prioridades_compartilhadas: string; objetivos_funcionais: string; estrategias: string; frequencia_duracao: string; responsaveis: string; indicadores: string; revisao_em: string; metas: Meta[] };
 }
 
 const centralPacienteVazio = (): CentralPacienteData => ({
   notas: [], documentos: [], medicacoes: [], encaminhamentos: [], conversas_aura: [],
   anamnese: { historico_familiar: '', desenvolvimento_neuropsicomotor: '', historico_escolar: '', historico_ocupacional: '', historico_medico: '' },
   resumo_clinico: { queixas_principais: '', hipoteses_diagnosticas: '', alertas_medicos: '', exames_laboratoriais: '', medicamentos: '', observacoes: '' },
   reabilitacao: { dominios: [], baseline: '', rede_apoio: '', formulacao_caso: '', prioridades_compartilhadas: '', objetivos_funcionais: '', estrategias: '', frequencia_duracao: '', responsaveis: '', indicadores: '', revisao_em: '', metas: [] },
 });
 
 interface SpeechRecognitionEventLike { results: ArrayLike<{ 0: { transcript: string } }> }
 interface SpeechRecognitionErrorEventLike { error: string }
 interface SpeechRecognitionLike {
   lang: string;
   interimResults: boolean;
   continuous: boolean;
   start(): void;
   stop(): void;
   onresult: ((event: SpeechRecognitionEventLike) => void) | null;
   onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
   onend: (() => void) | null;
 }
 type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;  type ProfessionalPlan = 'start' | 'pro';  export default function DashboardPage() {   const router = useRouter();
   const [abaAtiva, setAbaAtiva] = useState('aba-painel');    const [configuracoesSecao, setConfiguracoesSecao] = useState<SettingsSection>('perfil');   const [sidebarMinimizada, setSidebarMinimizada] = useState(true);
   const [temaEscuro, setTemaEscuro] = useState(false);
   const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);   const [tourAberto, setTourAberto] = useState(false);   const [plano, setPlano] = useState<ProfessionalPlan>('start');   const [planoCarregado, setPlanoCarregado] = useState(false);   const isPro = plano === 'pro'; 
   // Estados de Toast e Notificações
   const [toastAtivo, setToastAtivo] = useState(false);
   const [toastMensagem, setToastMensagem] = useState('');
 
   // Estados de Dados (com hidratação resiliente a partir do cache local)
   const [pacientes, setPacientes] = useState<Paciente[]>(() => {
     if (typeof window === 'undefined') return [];
     try {
       const cached = localStorage.getItem('deepsistem_cached_patients');
       if (cached) {
         const parsed = JSON.parse(cached);
         if (Array.isArray(parsed) && parsed.length > 0) return parsed as Paciente[];
       }
     } catch {}
     return [];
   });
   const [marca, setMarca] = useState({
     cor_primaria: DESIGN_TOKENS.color.primary,     cor_secundaria: DESIGN_TOKENS.color.secondary,     tema_padrao: 'light',
     logotipo_url: '', background_url: ''
   });
   const [enviandoLogo, setEnviandoLogo] = useState(false);
   const [gateways, setGateways] = useState({
     asaas: { ativo: false, apiKey: '' },
     mercado_pago: { ativo: false, apiKey: '' }
   });
   
   // ----------------------------------------------------
   // GESTÃO DO PACIENTE (SIDEBAR INTERNA DO PACIENTE STATE)
   // ----------------------------------------------------
   const [subAbaGestao, setSubAbaGestao] = useState('resumo');
   const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
   
   // Prontuário e Aura IA (Fica sob Sub-Aba Resumo Clínico)
   const [gravando, setGravando] = useState(false);
   const [segundosGravacao, setSegundosGravacao] = useState(0);
   const [statusIA, setStatusIA] = useState('Clique no microfone para iniciar a gravação');
   const [ataSessao, setAtaSessao] = useState('');
   const [resumoClinico, setResumoClinico] = useState('');
   const gravadorIntervalRef = useRef<NodeJS.Timeout | null>(null);
 
   // Modal Editar Resumo Clínico
   const [modalEditarResumoAtivo, setModalEditarResumoAtivo] = useState(false);
    const [resumoQueixas, setResumoQueixas] = useState('');
    const [resumoHipoteses, setResumoHipoteses] = useState('');
    const [resumoAlertas, setResumoAlertas] = useState('');
   const [resumoObservacoes, setResumoObservacoes] = useState('');
 
   // Evolução Clinica
   const [evolucoes, setEvolucoes] = useState<EvolucaoItem[]>([]);
   const [evolucaoDataSessao, setEvolucaoDataSessao] = useState('');
   const [evolucaoPontosImportantes, setEvolucaoPontosImportantes] = useState('');
   const [evolucaoAtaCompleta, setEvolucaoAtaCompleta] = useState('');
 
   // Medicações & Encaminhamentos
   const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
   const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([]);
   const [modalNovaMedAtivo, setModalNovaMedAtivo] = useState(false);
   const [modalNovoEncAtivo, setModalNovoEncAtivo] = useState(false);
   
   const [novaMedNome, setNovaMedNome] = useState('');
   const [novaMedDosagem, setNovaMedDosagem] = useState('');
   const [novaMedFrequencia, setNovaMedFrequencia] = useState('');
   const [novoEncDesc, setNovoEncDesc] = useState('');
 
   // Biblioteca de Documentos
   const [arquivosBilioteca, setArquivosBiblioteca] = useState<ArquivoBiblioteca[]>([]);
   const [dragAreaAtiva, setDragAreaAtiva] = useState(true);
   const [filtroDocumentoQuery, setFiltroDocumentoQuery] = useState('');
 
   // Estudo de Caso (Imagem 1 & Imagem 4 da rodada anterior)
   const [estudoCasoOnboardingVisto, setEstudoCasoOnboardingVisto] = useState(false);
   const [estudoCasoVersaoIniciada, setEstudoCasoVersaoIniciada] = useState(false);
   const [estudoCaso, setEstudoCaso] = useState<{ id: number; titulo: string; orientacao?: string; resposta: string }[]>([]);
   const [estudoCasoMeta, setEstudoCasoMeta] = useState({ abordagem: '', natureza_registro: 'Registro documental exclusivo', compartilhamento: 'Acesso restrito ao profissional', ultima_revisao: '' });
 
   // Converse com Aura (Aura IA - Imagem 2!)
   const [auraOnboardingVisto, setAuraOnboardingVisto] = useState(false);
   const [auraChatMensagens, setAuraChatMensagens] = useState<ChatMensagem[]>([     { id: '1', sender: 'ia', text: 'Olá! Sou a Aura IA, sua copilota clínica. Como posso ajudar a estruturar as ideias ou analisar o caso do paciente hoje?', time: '15:35' }   ]);   const [auraNovaMsgTexto, setAuraNovaMsgTexto] = useState('');   const [auraRespondendo, setAuraRespondendo] = useState(false);   const [auraOuvindo, setAuraOuvindo] = useState(false);
   const auraRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
   const patientTabsRef = useRef<HTMLElement | null>(null);
   const [patientTabsPrevious, setPatientTabsPrevious] = useState(false);
   const [patientTabsNext, setPatientTabsNext] = useState(false);
   const [centralData, setCentralData] = useState<CentralPacienteData>(centralPacienteVazio());
   const [novaNotaTitulo, setNovaNotaTitulo] = useState('');
   const [novaNotaConteudo, setNovaNotaConteudo] = useState('');
   const [novoDocumentoNome, setNovoDocumentoNome] = useState('');
   const [novoDocumentoArquivo, setNovoDocumentoArquivo] = useState<File | null>(null);
   const [enviandoDocumento, setEnviandoDocumento] = useState(false);
   const [documentoVisualizado, setDocumentoVisualizado] = useState<CentralPacienteData['documentos'][number] | null>(null);
 
   // ----------------------------------------------------
   // NOVA AGENDA: SUB-ABAS INTERNAS E ACORDEÕES (Imagem 1 & 2!)
   // ----------------------------------------------------
   const [agendaAbaInterna, setAgendaAbaInterna] = useState('dashboard'); /* dashboard, timeline */
  const [modalFiltrosAgendaAtivo, setModalFiltrosAgendaAtivo] = useState(false);
  const [agendaVisualizacao, setAgendaVisualizacao] = useState<'grande' | 'lista'>('grande');
  const [agendaPeriodoVista, setAgendaPeriodoVista] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [agendaPeriodoOffset, setAgendaPeriodoOffset] = useState(0);
  const [semanaAtivaAcordeao, setSemanaAtivaAcordeao] = useState<number | null>(4); /* Semana 4 aberta por padrão */
   // ----------------------------------------------------
   // NOVO MONITORAMENTO CLINICO STATE (Imagem 1!)
   // ----------------------------------------------------
   const [subAbaMonitoramento, setSubAbaMonitoramento] = useState('visao-geral'); // mural, visao-geral, escalas, cartao-diario
   const [monitoramento, setMonitoramento] = useState<MonitoramentoItem[]>([]);
   const [novoMonitorTipo, setNovoMonitorTipo] = useState('Humor');
   const [novoMonitorValor, setNovoMonitorValor] = useState(5);
   const [novoMonitorObs, setNovoMonitorObs] = useState('');
 
   // ----------------------------------------------------
   // NOVO CONTROLE DE PAGAMENTOS CONSOLIDADO (Imagem 2!)
   // ----------------------------------------------------
   const [subAbaFinanceiroCon, setSubAbaFinanceiroCon] = useState('controle'); // controle, extrato, receita-saude, pacotes, central-financeira
   const [buscaPacienteFinQuery, setBuscaPacienteFinQuery] = useState('');
 
   // ----------------------------------------------------
   // INTERATIVIDADE FINANCEIRA INDIVIDUAL (Imagem 2!)
   // ----------------------------------------------------
   const [financeiroSessaoStatus, setFinanceiroSessaoStatus] = useState<Record<string, string>>({
     'ses-03': 'Realizada',
     'ses-10': 'Realizada',
     'ses-17': 'Realizada',
     'ses-24': 'Aguardando'
   });
 
   // ----------------------------------------------------
   // PAINEL DE BOAS VINDAS SAAS (Imagem 5!)
   // ----------------------------------------------------
   const [lembreteRapidoInput, setLembreteRapidoInput] = useState('');
   const [muralPostIts, setMuralPostIts] = useState<string[]>([]);
 
   // ----------------------------------------------------
   // AGENDA CLINICA & BLOQUEIO
   // ----------------------------------------------------
   const [modalBloqueioAgendaAtivo, setModalBloqueioAgendaAtivo] = useState(false);
   const [bloqueiosAgenda, setBloqueiosAgenda] = useState<BloqueioAgenda[]>([]);
   const [bloqueioNome, setBloqueioNome] = useState('');
   const [bloqueioData, setBloqueioData] = useState(() => new Date().toISOString().slice(0, 10));
   const [bloqueioHora, setBloqueioHora] = useState('14:00');
   const [bloqueioDuracao, setBloqueioDuracao] = useState('1h');
   const [bloqueioRecorrencia, setBloqueioRecorrencia] = useState('Não repetir');
   const [bloqueioCor, setBloqueioCor] = useState('Lavanda');
   const [bloqueioNotas, setBloqueioNotas] = useState('');
   const [agendaMes, setAgendaMes] = useState('8');
   const [agendaAno, setAgendaAno] = useState('2026');
   const [agendaPaciente, setAgendaPaciente] = useState('todos');
   const [agendaTipo, setAgendaTipo] = useState('todos');
   const [agendaModalidade, setAgendaModalidade] = useState('todas');
   const [agendaStatus, setAgendaStatus] = useState('todos');
   const [agendaBusca, setAgendaBusca] = useState('');
   const [bloqueioTipo, setBloqueioTipo] = useState('Sessão');
   const [bloqueioModalidade, setBloqueioModalidade] = useState('Presencial');
   const [bloqueioPaciente, setBloqueioPaciente] = useState('');
 
   // Estado legado mantido apenas para compatibilidade com registros antigos.
   const [evolucaoCheckboxes, setEvolucaoCheckboxes] = useState<Record<string, boolean>>({ 'ev-17': false, 'ev-10': false, 'ev-03': false });
 
   // ----------------------------------------------------
   // REABILITAÇÃO COGNITIVA
   // ----------------------------------------------------
   const [subAbaReab, setSubAbaReab] = useState('plano'); 
   const [reabData, setReabData] = useState<ReabilitacaoData | null>(null);
   const [otimizandoMetas, setOtimizandoMetas] = useState(false);
   const canvasRef = useRef<HTMLCanvasElement | null>(null);
 
   // Modo Edição no Plano de Reabilitação
   const [planoModoEdicao, setPlanoModoEdicao] = useState(false);
 
   // Domínios Prioritários do plano
   const dominiosDisponiveis = [
     'Atenção sustentada', 'Atenção dividida', 'Memória de trabalho', 
     'Memória episódica', 'Funções executivas', 'Velocidade de processamento', 
     'Linguagem', 'Cognição social', 'Regulação emocional'
   ];
   const [dominiosSelecionados, setDominiosSelecionados] = useState<string[]>([]);
   const [reabRedeApoio, setReabRedeApoio] = useState('');
 
   // Sessões da Reabilitação
   const [sessoesClinicas, setSessoesClinicas] = useState<SessaoClinica[]>([]);
   const [mostrarFormSessao, setMostrarFormSessao] = useState(false);
   const [novaSessaoData, setNovaSessaoData] = useState(() => new Date().toISOString().slice(0, 10));
   const [novaSessaoDuracao, setNovaSessaoDuracao] = useState(50);
   const [novaSessaoModalidade, setNovaSessaoModalidade] = useState('Presencial');
   const [novaSessaoResposta, setNovaSessaoResposta] = useState('');
   const [novaSessaoObs, setNovaSessaoObs] = useState('');
   const [novaSessaoTarefa, setNovaSessaoTarefa] = useState('');
 
   // Revisões Periódicas
   const [revisoesClinicas, setRevisoesClinicas] = useState<string[]>([]);
   const [gerandoRevisaoIA, setGerandoRevisaoIA] = useState(false);
 
   // Financeiro Geral
   const [financeiro, setFinanceiro] = useState<Lancamento[]>([]);
   const [faturamento, setFaturamento] = useState({ recebido: 0, previsao: 0, atrasado: 0 });
 
   // Modais de Faturamento / Onboarding
   const [modalOnboardingAtivo, setModalOnboardingAtivo] = useState(false);
   const [modalCheckoutAtivo, setModalCheckoutAtivo] = useState(false);
   const [modalNovoPacienteAtivo, setModalNovoPacienteAtivo] = useState(false); 
   const [editandoCadastroPaciente, setEditandoCadastroPaciente] = useState(false);
   const [modoCadastroPaciente, setModoCadastroPaciente] = useState<'completo' | 'resumido'>('completo');
   const [modalCasalAtivo, setModalCasalAtivo] = useState(false);
   const [casalPrimeiroId, setCasalPrimeiroId] = useState('');
   const [casalSegundoId, setCasalSegundoId] = useState('');
   
   // Inputs Formulários Paciente / Faturamento
   const [novoPacNome, setNovoPacNome] = useState('');
   const [novoPacIniciais, setNovoPacIniciais] = useState('');
   const [novoPacNascimento, setNovoPacNascimento] = useState('');
   const [novoPacGenero, setNovoPacGenero] = useState('Selecionar');
   const [novoPacEscolaridade, setNovoPacEscolaridade] = useState('Selecionar');
   const [novoPacEmail, setNovoPacEmail] = useState('');
   const [novoPacNomeSocial, setNovoPacNomeSocial] = useState('');
   const [novoPacCpf, setNovoPacCpf] = useState('');
   const [novoPacTelefone, setNovoPacTelefone] = useState('');
   const [novoPacProfissao, setNovoPacProfissao] = useState('');
   const [novoPacObservacoes, setNovoPacObservacoes] = useState('');
   const [novoPacPlanoSaude, setNovoPacPlanoSaude] = useState('');
   const [novoPacTratamentos, setNovoPacTratamentos] = useState('');
   const [novoPacContatoEmergencia, setNovoPacContatoEmergencia] = useState('');
   const [novoPacTipoAtendimento, setNovoPacTipoAtendimento] = useState('Adulto');
   const [novoPacRacaCor, setNovoPacRacaCor] = useState('');
   const [novoPacEstadoCivil, setNovoPacEstadoCivil] = useState('');
   const [novoPacEmergencia2, setNovoPacEmergencia2] = useState('');
    const [novoPacEndereco, setNovoPacEndereco] = useState({ pais: '', cep: '', numero: '', rua: '', bairro: '', cidade: '', complemento: '' });
    const [novoPacMedicamento, setNovoPacMedicamento] = useState('');
    const [novoPacCobranca, setNovoPacCobranca] = useState('');
    const [novoPacMoeda, setNovoPacMoeda] = useState('');
    const [novoPacValor, setNovoPacValor] = useState('');
    const [novoPacPagamento, setNovoPacPagamento] = useState('');
 
   const [buscaPacienteQuery, setBuscaPacienteQuery] = useState(''); 
   const [linkGerado, setLinkGerado] = useState('');
   const [cupomInput, setCupomInput] = useState('');
   const [cupomAplicado, setCupomAplicado] = useState(false);
   const [totalAssinatura, setTotalAssinatura] = useState(149.90);
    const [nomeProfissional, setNomeProfissional] = useState<string>(() => {
     if (typeof window !== 'undefined') {
       try {
         const u = JSON.parse(localStorage.getItem('psistem_user') || '{}');
         if (u && typeof u.nome === 'string' && u.nome.trim()) return u.nome.trim();
       } catch (e) {}
     }
     return 'Priscila Xavier';
   });
    const [emailProfissional, setEmailProfissional] = useState<string>(() => {
     if (typeof window !== 'undefined') {
       try {
         const u = JSON.parse(localStorage.getItem('psistem_user') || '{}');
         if (u && typeof u.email === 'string' && u.email.trim()) return u.email.trim();
       } catch (e) {}
     }
     return 'priscilaxsaraujo@gmail.com';
   });
   const [billingBlocked, setBillingBlocked] = useState(false);
   const [billingMessage, setBillingMessage] = useState('');
   const [billingCheckoutUrl, setBillingCheckoutUrl] = useState('/assinatura/checkout');
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(7);
  const [trialProgressPct, setTrialProgressPct] = useState(100);
  const [trialBannerVisivel, setTrialBannerVisivel] = useState(true);
  const [trialBannerElegivel, setTrialBannerElegivel] = useState(true);
  const [trialBannerStorageKey] = useState(() => {
    if (typeof window === 'undefined') return 'deepsistem_trial_banner_dismissed:pripsico';
    try {
      const stored = JSON.parse(localStorage.getItem('psistem_user') || '{}');
      return `deepsistem_trial_banner_dismissed:${String(stored.tenant_id || 'pripsico')}`;
    } catch {
      return 'deepsistem_trial_banner_dismissed:pripsico';
    }
  });
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // Ao entrar na plataforma, o aviso de período de teste sempre é exibido
        // Limpa bloqueios persistentes de sessões anteriores
        localStorage.removeItem(trialBannerStorageKey);
        localStorage.removeItem('deepsistem_trial_banner_dismissed:pripsico');
        setTrialBannerVisivel(true);
      }
    } catch (e) {}
  }, [trialBannerStorageKey]);
  const handleFecharTrialBanner = () => {
    setTrialBannerVisivel(false);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('trial_banner_dismissed_session', 'true');
      }
    } catch (e) {}
  };
  // Validar Autenticação
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('psistem_token') : null;
    fetch('/api/profissional', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async response => {
      if (!response.ok) throw new Error('Sessão inválida');
      const perfil = await response.json();
      if (!perfil || perfil.authenticated === false) throw new Error('Sessão não autenticada');
      const nomeResolvido = (perfil.nome && String(perfil.nome).trim()) || (perfil.tenants?.[perfil.tenant_id]?.nome && String(perfil.tenants[perfil.tenant_id].nome).trim()) || 'Priscila Xavier';
      const emailResolvido = (perfil.email && String(perfil.email).trim()) || (perfil.tenants?.[perfil.tenant_id]?.email && String(perfil.tenants[perfil.tenant_id].email).trim()) || 'priscilaxsaraujo@gmail.com';
      setNomeProfissional(nomeResolvido);
      setEmailProfissional(emailResolvido);
      try {
        if (typeof window !== 'undefined') {
          const stored = JSON.parse(localStorage.getItem('psistem_user') || '{}');
          localStorage.setItem('psistem_user', JSON.stringify({ ...stored, nome: nomeResolvido, email: emailResolvido, tenant_id: perfil.tenant_id || stored.tenant_id || 'pripsico' }));
        }
      } catch (e) {}
      setPlano(perfil.plan === 'pro' ? 'pro' : 'start');
      setBillingBlocked(Boolean(perfil.billingBlocked));
      setBillingMessage(String(perfil.billingMessage || ''));
      setBillingCheckoutUrl(String(perfil.checkoutUrl || '/assinatura/checkout'));
      // Depois que o teste é identificado, o aviso permanece disponível até
      // o profissional clicar explicitamente no X. Atualizações de sessão,
      // recarregamentos e mudanças de estado de cobrança não o removem.
      if (perfil.status === 'trial' || Boolean(perfil.trialActive)) setTrialBannerElegivel(true);
      setTrialDaysRemaining(Number.isFinite(Number(perfil.trialDaysRemaining)) ? Number(perfil.trialDaysRemaining) : 7);
      setTrialProgressPct(Number.isFinite(Number(perfil.trialProgressPct)) ? Number(perfil.trialProgressPct) : 100);
      setPlanoCarregado(true);
    }).catch(() => {
      // Se não autenticado via cookie ou token, só redireciona se não houver cookie ativo
      try {
        const stored = JSON.parse(localStorage.getItem('psistem_user') || '{}');
        if (stored?.nome) {
          setNomeProfissional(stored.nome);
          if (stored.email) setEmailProfissional(stored.email);
          setPlanoCarregado(true);
          setTrialBannerElegivel(true);
          return;
        }
      } catch (e) {}
      localStorage.removeItem('psistem_token');
      localStorage.removeItem('psistem_user');
      router.push('/login');
    });
  }, [router]);

  // Carregar dados iniciais
    useEffect(() => {
      if (!planoCarregado) return;
      carregarMarcaVisual();
      if (isPro) carregarCredenciaisGateways();
      carregarPacientes();
      carregarFinanceiro();
      carregarOperacao();
    }, [planoCarregado, isPro]);

    // Revalidar pacientes sempre que a aba de pacientes for acessada
    useEffect(() => {
      if (planoCarregado && (abaAtiva === 'aba-pacientes' || abaAtiva === 'aba-gestao-paciente')) {
        carregarPacientes(true);
      }
    }, [abaAtiva, planoCarregado]);

    // Mantém estudo de caso e reabilitação sincronizados com a ficha selecionada.
    useEffect(() => {
      if (!pacienteSelecionado?.id) return;
      carregarEstudoCaso(pacienteSelecionado.id);
      carregarReabilitacao(pacienteSelecionado.id);
      carregarCentralPaciente(pacienteSelecionado.id);
    }, [pacienteSelecionado?.id]);
   useEffect(() => {
     if (abaAtiva === 'aba-reabilitacao' && subAbaReab === 'dashboard' && reabData && sessoesClinicas.length > 0) {
       setTimeout(() => {
         desenharGraficoScores();
       }, 50);
     }
   }, [abaAtiva, subAbaReab, reabData, sessoesClinicas]);
 
   // Timer do Gravador
   useEffect(() => {
     if (gravando) {
       gravadorIntervalRef.current = setInterval(() => {
         setSegundosGravacao(prev => prev + 1);
       }, 1000);
     } else {
       if (gravadorIntervalRef.current) clearInterval(gravadorIntervalRef.current);
     }
     return () => {
       if (gravadorIntervalRef.current) clearInterval(gravadorIntervalRef.current);
     };
   }, [gravando]);
 
   useEffect(() => () => auraRecognitionRef.current?.stop(), []);
 
   useEffect(() => {
     const tabs = patientTabsRef.current;
     if (!tabs || abaAtiva !== 'aba-gestao-paciente') return;
     const atualizarSetas = () => {
       const overflow = tabs.scrollWidth > tabs.clientWidth + 2;
       setPatientTabsPrevious(overflow && tabs.scrollLeft > 2);
       setPatientTabsNext(overflow && tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 2);
     };
     const observer = new ResizeObserver(atualizarSetas);
     observer.observe(tabs);
     tabs.addEventListener('scroll', atualizarSetas, { passive: true });
     const frame = requestAnimationFrame(atualizarSetas);
     return () => { cancelAnimationFrame(frame); observer.disconnect(); tabs.removeEventListener('scroll', atualizarSetas); };
   }, [abaAtiva]);
 
   // ----------------------------------------------------
   // CHAMADAS DE API
   // ----------------------------------------------------
   async function carregarMarcaVisual() {
     try {
       const res = await fetch('/api/brand/settings');
       if (res.ok) {
         const data = await res.json();
         setMarca(data);
         setTemaEscuro(data.tema_padrao === 'dark');
         aplicarMarcaRoot(data);
       }
     } catch (e) {
       console.error(e);
     }
   }
 
  function aplicarMarcaRoot(brand: typeof marca) {
    const root = document.documentElement;
    if (brand.cor_primaria) root.style.setProperty('--color-primary', brand.cor_primaria);
    if (brand.cor_secundaria) root.style.setProperty('--color-secondary', brand.cor_secundaria);
    root.style.setProperty('--professional-background-image', brand.background_url ? `url("${brand.background_url}")` : 'none');
     if (brand.tema_padrao === 'dark') {
       document.body.classList.add('dark-theme');
     } else {
       document.body.classList.remove('dark-theme');
    }
  }

  useEffect(() => {
    const handleBrandUpdate = (event: Event) => {
      const next = (event as CustomEvent<typeof marca>).detail;
      if (!next) return;
      setMarca(current => ({ ...current, ...next }));
      aplicarMarcaRoot({ ...marca, ...next });
    };
    window.addEventListener('deepsistem-brand-updated', handleBrandUpdate);
    return () => window.removeEventListener('deepsistem-brand-updated', handleBrandUpdate);
  }, [marca]);
 
   async function carregarCredenciaisGateways() {
     try {
       const res = await fetch('/api/gateways/settings');
       if (res.ok) {
         const data = await res.json();
         setGateways(data);
       }
     } catch (e) {
       console.error(e);
     }
   }
 
    function getAuthHeaders(extra?: HeadersInit): Record<string, string> {
      const headers: Record<string, string> = {};
      if (extra) {
        if (extra instanceof Headers) {
          extra.forEach((v, k) => { headers[k] = v; });
        } else if (Array.isArray(extra)) {
          extra.forEach(([k, v]) => { headers[k] = v; });
        } else {
          Object.assign(headers, extra);
        }
      }
      try {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('psistem_token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['x-session-token'] = token;
          }
        }
      } catch {}
      return headers;
    }

    async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const headers = getAuthHeaders(init?.headers);
      return fetch(input, { credentials: 'same-origin', ...init, headers });
    }

    async function carregarPacientes(silencioso = false) {
      try {
        const res = await apiFetch('/api/pacientes', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || `Falha ao carregar pacientes (${res.status}).`);
        }
        if (!Array.isArray(data)) {
          throw new Error('A resposta de pacientes é inválida.');
        }

        // Se a API retornou pacientes válidos:
        if (data.length > 0) {
          setPacientes(data as Paciente[]);
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('deepsistem_cached_patients', JSON.stringify(data));
            }
          } catch {}
          setPacienteSelecionado(prev => {
            if (prev && data.some((p: Paciente) => p.id === prev.id)) {
              return data.find((p: Paciente) => p.id === prev.id) || data[0];
            }
            return data[0];
          });
        } else {
          // Se retornou vazio do backend, verificamos se já temos pacientes em memória ou cache para blindar contra esvaziamento acidental
          setPacientes(prev => {
            if (prev.length > 0) {
              console.warn('[pacientes] Resposta vazia recebida do servidor; preservando lista existente em memória.');
              return prev;
            }
            return [];
          });
        }
        if (!silencioso && data.length > 0) {
          triggerToast(`${data.length} paciente${data.length > 1 ? 's' : ''} sincronizado${data.length > 1 ? 's' : ''}.`);
        }
      } catch (e) {
        console.error('Não foi possível carregar os pacientes:', e);
        try {
          if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('deepsistem_cached_patients');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setPacientes(parsed as Paciente[]);
                setPacienteSelecionado(prev => prev || parsed[0]);
                return;
              }
            }
          }
        } catch {}
        if (!silencioso) {
          triggerToast('Não foi possível atualizar os pacientes. Os dados locais foram preservados.');
        }
      }
    }
 
   async function carregarEstudoCaso(pacId: string) {
     try {
       const res = await fetch(`/api/pacientes/${pacId}/estudo-caso`);
       if (res.ok) {
         const data = await res.json();
         setEstudoCaso(data.topicos);
         setEstudoCasoMeta({ abordagem: data.abordagem || '', natureza_registro: data.natureza_registro || 'Registro documental exclusivo', compartilhamento: data.compartilhamento || 'Acesso restrito ao profissional', ultima_revisao: data.ultima_revisao || '' });
       }
     } catch (e) {
       console.error(e);
     }
   }
 
   async function carregarReabilitacao(pacId: string) {
     try {
       const res = await fetch(`/api/pacientes/${pacId}/reabilitacao`);
       if (res.ok) {
         const data = await res.json();
         setReabData(data);
       }
     } catch (e) {
       console.error(e);
     }
   }
 
   async function carregarFinanceiro() {
     try {
       const res = await fetch('/api/financeiro');
       if (res.ok) {
         const data = await res.json();
         setFinanceiro(data);
         calcularTotaisFinanceiros(data);
       }
     } catch (e) {
       console.error(e);
     }
   }

   async function carregarCentralPaciente(pacId: string) {
     try {
       const res = await fetch(`/api/pacientes/${pacId}/central`);
       if (!res.ok) return;
       const received = await res.json() as Partial<CentralPacienteData>;
       const empty = centralPacienteVazio();
       const data: CentralPacienteData = {
         ...empty,
         ...received,
         anamnese: { ...empty.anamnese, ...received.anamnese },
         resumo_clinico: { ...empty.resumo_clinico, ...received.resumo_clinico },
         reabilitacao: { ...empty.reabilitacao, ...received.reabilitacao },
       };
       setCentralData(data);
       setAuraChatMensagens(data.conversas_aura.length ? data.conversas_aura : [{ id: 'boas-vindas', sender: 'ia', text: 'Olá! Sou a Aura, sua copilota clínica. Como posso ajudar com este caso?', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]);
     } catch (error) { console.error(error); }
   }
 
   async function carregarOperacao() {
     try { const res = await fetch('/api/operacao'); if (res.ok) { const data = await res.json(); setBloqueiosAgenda(data.agenda || []); setMonitoramento(data.monitoramento || []); } } catch (error) { console.error(error); }
   }
 
  async function salvarOperacao(agenda: BloqueioAgenda[], itensMonitoramento: MonitoramentoItem[]) {
    const response = await fetch('/api/operacao', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agenda, monitoramento: itensMonitoramento }) });
    const payload = await response.json().catch(() => null) as { agenda?: BloqueioAgenda[]; error?: string } | null;
    if (!response.ok) throw new Error(payload?.error || 'Não foi possível salvar o compromisso.');
    return payload;
   }
 
   async function salvarCentralPaciente(next: CentralPacienteData) {
     if (!pacienteSelecionado?.id) return;
     setCentralData(next);
     const res = await fetch(`/api/pacientes/${pacienteSelecionado.id}/central`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
     if (!res.ok) triggerToast('Não foi possível salvar os dados do paciente.');
   }
 
   async function adicionarDocumentoPaciente(event: React.FormEvent) {
     event.preventDefault();
     if (!pacienteSelecionado?.id || !novoDocumentoArquivo) return;
     setEnviandoDocumento(true);
     try {
       const form = new FormData();
       form.append('file', novoDocumentoArquivo);
       const upload = await fetch(`/api/pacientes/${pacienteSelecionado.id}/documentos`, { method: 'POST', body: form });
       if (!upload.ok) throw new Error('Falha no upload');
       const stored = await upload.json() as { url: string; nome: string; mime_type: string; tamanho_bytes: number };
       const documento = { id: crypto.randomUUID(), ...stored, nome: novoDocumentoNome.trim() || stored.nome, categoria: 'Documento clínico', criado_em: new Date().toISOString() };
       await salvarCentralPaciente({ ...centralData, documentos: [documento, ...centralData.documentos] });
       setNovoDocumentoNome(''); setNovoDocumentoArquivo(null);
       triggerToast('Documento enviado e disponível para visualização.');
     } catch { triggerToast('Não foi possível enviar o documento.'); }
     finally { setEnviandoDocumento(false); }
   }
 
   function calcularTotaisFinanceiros(lancamentos: Lancamento[]) {
     let recebido = 0;
     let previsao = 0;
     let atrasado = 0;
     lancamentos.forEach(l => {
       if (l.status === 'pago') recebido += l.valor;
       else if (l.status === 'pendente') previsao += l.valor;
       else if (l.status === 'atrasado') atrasado += l.valor;
     });
     setFaturamento({ recebido, previsao, atrasado });
   }
 
   // ----------------------------------------------------
   // SUBMITS E OPERAÇÕES
   // ----------------------------------------------------
   async function handleUploadLogo(file: File) {
     if (!file) return;
     setEnviandoLogo(true);
     try {
       const formData = new FormData();
       formData.append('file', file);
       const res = await fetch('/api/brand/logo', {
         method: 'POST',
         body: formData,
       });
       const data = await res.json();
       if (res.ok && data.url) {
         setMarca(prev => ({ ...prev, logotipo_url: data.url }));
         triggerToast('Logotipo atualizado e salvo com sucesso!');
         carregarMarcaVisual();
       } else {
         alert(data.error || 'Erro ao enviar logotipo.');
       }
     } catch (e) {
       alert('Falha ao processar o upload do logotipo.');
     } finally {
       setEnviandoLogo(false);
     }
   }
 
   const abrirFichaPaciente = (pacienteOuNome?: Paciente | string) => {
     let p: Paciente | undefined;
     if (!pacienteOuNome) {
       p = pacientes[0];
     } else if (typeof pacienteOuNome === 'string') {
       p = pacientes.find(item => item.nome.toLowerCase().includes(pacienteOuNome.toLowerCase())) || pacientes[0];
     } else {
       p = pacienteOuNome;
     }
     if (p) {
       setPacienteSelecionado(p);
       setSubAbaGestao('resumo');
       setAbaAtiva('aba-gestao-paciente');
       triggerToast(`Abrindo prontuário de ${p.nome}`);
     } else {
       setAbaAtiva('aba-gestao-paciente');
     }
   };
 
   async function handleSalvarMarca(e: React.FormEvent) {
     e.preventDefault();
     try {
       const res = await fetch('/api/brand/settings', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(marca)
       });
       if (res.ok) {
         triggerToast('Configurações visuais da marca salvas!');
         carregarMarcaVisual();
       }
     } catch (e) {
       alert('Erro ao salvar.');
     }
   }
 
   async function handleSalvarGateways(e: React.FormEvent) {
     e.preventDefault();
     try {
       const res = await fetch('/api/gateways/settings', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(gateways)
       });
       if (res.ok) {
         alert('Chaves de API salvas de forma segura no banco!');
       }
     } catch (e) {
       alert('Erro ao salvar credenciais.');
     }
   }
 
    async function handleCriarNovoPaciente(e: React.FormEvent) {
      e.preventDefault();
      try {
        const res = await apiFetch('/api/pacientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            nome: novoPacNome, 
            email: novoPacEmail || `${novoPacIniciais.toLowerCase()}@psistem.com`,
            iniciais: novoPacIniciais,
            data_nascimento: novoPacNascimento,
            genero: novoPacGenero,
            escolaridade: novoPacEscolaridade,
            nome_social: novoPacNomeSocial,
            cpf: novoPacCpf,
            telefone: novoPacTelefone,
            profissao: novoPacProfissao,
            observacoes: novoPacObservacoes,
            plano_saude: novoPacPlanoSaude,
            tratamentos: novoPacTratamentos,
            contato_emergencia: novoPacContatoEmergencia,
            tipo_atendimento: novoPacTipoAtendimento,
            raca_cor: novoPacRacaCor,
            estado_civil: novoPacEstadoCivil,
            contato_emergencia_2: novoPacEmergencia2,
            endereco: novoPacEndereco,
            medicamento: novoPacMedicamento,
            cobranca: { tipo: novoPacCobranca, moeda: novoPacMoeda, valor: novoPacValor, meio_pagamento: novoPacPagamento },
            status: 'ativo'
          })
        });
        const data = await res.json().catch(() => null) as { paciente?: Paciente; error?: string } | null;
        if (res.ok && data?.paciente) {
          triggerToast('Paciente criado com sucesso!');
          setModalNovoPacienteAtivo(false);
          const pCriado = data.paciente;
          setPacientes(current => {
            const updated = current.some(item => item.id === pCriado.id)
              ? current.map(item => item.id === pCriado.id ? pCriado : item)
              : [pCriado, ...current];
            try { localStorage.setItem('deepsistem_cached_patients', JSON.stringify(updated)); } catch {}
            return updated;
          });
          setPacienteSelecionado(pCriado);
          await carregarPacientes(true);
          
          setNovoPacNome('');
          setNovoPacIniciais('');
          setNovoPacNascimento('');
          setNovoPacGenero('Selecionar');
          setNovoPacEscolaridade('Selecionar');
          setNovoPacEmail('');
          setNovoPacNomeSocial(''); setNovoPacCpf(''); setNovoPacTelefone(''); setNovoPacProfissao(''); setNovoPacObservacoes(''); setNovoPacPlanoSaude(''); setNovoPacTratamentos(''); setNovoPacContatoEmergencia(''); setNovoPacTipoAtendimento('Adulto');
        } else if (!res.ok) {
          triggerToast(data?.error || 'Não foi possível criar o paciente.');
        }
      } catch (e) {
        alert('Erro ao criar paciente.');
      }
    }

    async function handleNovoOnboarding(e: React.FormEvent) {
      e.preventDefault();
      try {
        const res = await apiFetch('/api/pacientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            nome: novoPacNome, 
            email: novoPacEmail || `${novoPacIniciais.toLowerCase()}@psistem.com`, 
            iniciais: novoPacIniciais, 
            status: 'onboarding' 
          })
        });
        const data = await res.json().catch(() => null) as { paciente?: Paciente; link?: string; error?: string } | null;
        if (res.ok && data?.paciente) {
          setLinkGerado(data.link || `http://localhost:3003/quiz?token=${data.paciente?.onboarding_token}`);
          triggerToast('Link do Quiz gerado com sucesso!');
          const pCriado = data.paciente;
          setPacientes(current => {
            const updated = current.some(item => item.id === pCriado.id)
              ? current.map(item => item.id === pCriado.id ? pCriado : item)
              : [pCriado, ...current];
            try { localStorage.setItem('deepsistem_cached_patients', JSON.stringify(updated)); } catch {}
            return updated;
          });
          setPacienteSelecionado(pCriado);
          await carregarPacientes(true);
        } else if (!res.ok) {
          triggerToast(data?.error || 'Não foi possível gerar o onboarding.');
        }
      } catch (e) {
        alert('Erro ao gerar onboarding.');
      }
    }
 
   async function handleSalvarEstudoCaso() {
     const pacId = pacienteSelecionado?.id;
     if (!pacId) return;
     try {
       const res = await fetch(`/api/pacientes/${pacId}/estudo-caso`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           paciente_id: pacId,
           ...estudoCasoMeta,
           ultima_revisao: new Date().toISOString().slice(0, 10),
           topicos: estudoCaso
         })
       });
       if (res.ok) {
         alert('Estudo de Caso atualizado com sucesso no prontuário!');
       }
     } catch (e) {
       alert('Erro ao salvar formulação.');
     }
   }
 
   async function processarIAComAura() {     if (!ataSessao.trim()) {       setStatusIA('Transcreva a sessão pelo navegador antes de gerar uma síntese.');       return;     }     setStatusIA('Transcrição pronta para revisão profissional.');     setResumoClinico(ataSessao);   } 
   async function otimizarMetasComAura() {
     const pacId = pacienteSelecionado?.id;
     if (!pacId) return;
     setOtimizandoMetas(true);
     try {
       const res = await fetch(`/api/pacientes/${pacId}/reabilitacao`, { method: 'POST' });
       if (res.ok) {
         const metas = await res.json();
         if (reabData) setReabData({ ...reabData, metas });
         const next = { ...centralData, reabilitacao: { ...centralData.reabilitacao, metas } };
         await salvarCentralPaciente(next);
         triggerToast('Metas SMART geradas pela Aura para revisão profissional.');
       }
     } catch (e) {
       alert('Erro ao otimizar.');
     } finally {
       setOtimizandoMetas(false);
     }
   }
 
   async function conciliarPagamento(id: string) {
     try {
       const res = await fetch('/api/financeiro', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id })
       });
       if (res.ok) {
         carregarFinanceiro();
       }
     } catch (e) {
       alert('Erro ao conciliar.');
     }
   }
 
   // GESTÃO DE SESSÕES REABILITAÇÃO
   function alternarDominio(tag: string) {
     if (!planoModoEdicao) return; 
     if (dominiosSelecionados.includes(tag)) {
       setDominiosSelecionados(dominiosSelecionados.filter(d => d !== tag));
     } else {
       setDominiosSelecionados([...dominiosSelecionados, tag]);
     }
   }
 
   function handleSalvarSessaoReab(e: React.FormEvent) {
     e.preventDefault();
     const nova: SessaoClinica = {
       id: 'ses-' + Math.random().toString(36).substring(2, 9),
       data: novaSessaoData,
       duracao: novaSessaoDuracao,
       modalidade: novaSessaoModalidade,
       resposta: novaSessaoResposta,
       observacoes: novaSessaoObs,
       tarefa: novaSessaoTarefa
     };
 
     setSessoesClinicas([...sessoesClinicas, nova]);
     setMostrarFormSessao(false);
     
     setNovaSessaoResposta('');
     setNovaSessaoObs('');
     setNovaSessaoTarefa('');
 
     triggerToast('Análise de progressão gerada');
   }
 
   // Geração de Análise Clínicas por IA (Revisões)
   function handleGerarRevisaoIA() {
     setGerandoRevisaoIA(true);
     setTimeout(() => {
       setGerandoRevisaoIA(false);
       setRevisoesClinicas([
         'Revisão do ciclo #1: A progressão nas tarefas cognitivas de Atenção Sustentada e Funções Executivas revelou melhora de 15% na velocidade de processamento visual. O plano de metas SMART segue ativo com os domínios definidos.'
       ]);
       triggerToast('Revisão clínica formulada com sucesso pela Aura IA!');
     }, 1500);
   }
 
   // ----------------------------------------------------
   // OPERAÇÕES GESTÃO DO PACIENTE (EVOLUÇÃO, MEDICAÇÕES)
   // ----------------------------------------------------
   function handleAdicionarEvolucao(e: React.FormEvent) {
     e.preventDefault();
     if (!evolucaoAtaCompleta.trim()) return;
     const nova: EvolucaoItem = {
       id: 'ev-' + Math.random().toString(36).substring(2, 9),
       data: evolucaoDataSessao || new Date().toLocaleDateString('pt-BR'),
       pontosImportantes: evolucaoPontosImportantes,
       ataCompleta: evolucaoAtaCompleta
     };
     setEvolucoes([nova, ...evolucoes]);
     
     setEvolucaoDataSessao('');
     setEvolucaoPontosImportantes('');
     setEvolucaoAtaCompleta('');
     
     triggerToast('Evolução clínica registrada.');
   }
 
   function handleSalvarMedicamento(e: React.FormEvent) {
     e.preventDefault();
     if (!novaMedNome.trim()) return;
     const nova: Medicamento = {
       id: 'med-' + Math.random().toString(36).substring(2, 9),
       nome: novaMedNome,
       dosagem: novaMedDosagem,
       frequencia: novaMedFrequencia
     };
     setMedicamentos([...medicamentos, nova]);
     setModalNovaMedAtivo(false);
     
     setNovaMedNome('');
     setNovaMedDosagem('');
     setNovaMedFrequencia('');
 
     triggerToast('Medicação registrada com sucesso!');
   }
 
   function handleSalvarEncaminhamento(e: React.FormEvent) {
     e.preventDefault();
     if (!novoEncDesc.trim()) return;
     const novo: Encaminhamento = {
       id: 'enc-' + Math.random().toString(36).substring(2, 9),
       descricao: novoEncDesc
     };
     setEncaminhamentos([...encaminhamentos, novo]);
     setModalNovoEncAtivo(false);
     setNovoEncDesc('');
     
     triggerToast('Encaminhamento registrado com sucesso!');
   }
 
   function handleSalvarResumoClinico(e: React.FormEvent) {
     e.preventDefault();
     setModalEditarResumoAtivo(false);
     triggerToast('Resumo clínico atualizado!');
   }
 
   // ----------------------------------------------------
   // OPERAÇÕES DE UPLOAD / BIBLIOTECA DE DOCUMENTOS
   // ----------------------------------------------------
   function handleFazerUploadSimulado() {
     const novo: ArquivoBiblioteca = {
       id: 'doc-' + Math.random().toString(36).substring(2, 9),
       nome: 'comprovante-pagamento-agosto.pdf',
       tipo: 'PDF',
       tamanho: '142 KB',
       data: new Date().toLocaleDateString('pt-BR')
     };
     setArquivosBiblioteca([...arquivosBilioteca, novo]);
     triggerToast('Upload concluído com sucesso!');
   }
 
   // ----------------------------------------------------
   // GESTÃO DE BLOQUEIOS DA AGENDA
   // ----------------------------------------------------
   async function handleBloquearHorario(e: React.FormEvent) {
     e.preventDefault();
     if (!bloqueioNome.trim()) return;
     const novo: BloqueioAgenda = {
       id: 'bl-' + Math.random().toString(36).substring(2, 9),
       nome: bloqueioNome,
       data: bloqueioData,
       hora: bloqueioHora,
       duracao: bloqueioDuracao,
       recorrencia: bloqueioRecorrencia,
       cor: bloqueioCor,
       notes: bloqueioNotas,
       tipo: bloqueioTipo,
       modalidade: bloqueioModalidade,
       paciente_id: bloqueioPaciente || pacienteSelecionado?.id || '',
       status: 'agendado'
     };
     const proximaAgenda = [...bloqueiosAgenda, novo];
     try {
       const saved = await salvarOperacao(proximaAgenda, monitoramento);
       setBloqueiosAgenda(saved?.agenda || proximaAgenda);
       setModalBloqueioAgendaAtivo(false);
       setBloqueioNome('');
       setBloqueioNotas('');
       triggerToast('Compromisso salvo na agenda!');
     } catch (error) {
       triggerToast(error instanceof Error ? error.message : 'Não foi possível salvar o compromisso.');
     }
   }
 
   // Enviar mensagem no chat da Aura
   async function handleEnviarMsgAura(e: React.FormEvent) {     e.preventDefault();     if (!auraNovaMsgTexto.trim() || !pacienteSelecionado?.id || auraRespondendo) return;     const userMsg: ChatMensagem = {
       id: 'msg-' + Math.random().toString(36).substring(2, 9),
       sender: 'user',
       text: auraNovaMsgTexto,
       time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
     };
     const comUsuario = [...auraChatMensagens, userMsg];     setAuraChatMensagens(comUsuario);     setAuraNovaMsgTexto('');     setAuraRespondendo(true);     try {       const response = await fetch('/api/ia/aura', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: pacienteSelecionado.id, message: userMsg.text }) });       const data = await response.json().catch(() => null) as { message?: ChatMensagem; error?: string } | null;       if (!response.ok || !data?.message) { triggerToast(data?.error || 'A Aura não conseguiu responder agora.'); return; }       setAuraChatMensagens(current => [...current, data.message as ChatMensagem]);     } catch { triggerToast('Não foi possível conectar à Aura.'); }     finally { setAuraRespondendo(false); }   } 
   function alternarMicrofoneAura() {
     if (auraOuvindo) {
       auraRecognitionRef.current?.stop();
       return;
     }
 
     const browserWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
     const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
     if (!Recognition) {
       triggerToast('O reconhecimento de voz não é compatível com este navegador. Use Chrome ou Edge atualizado.');
       return;
     }
 
     const recognition = new Recognition();
     recognition.lang = 'pt-BR';
     recognition.interimResults = false;
     recognition.continuous = false;
     recognition.onresult = event => {
       const transcricao = event.results[0]?.[0]?.transcript?.trim();
       if (transcricao) setAuraNovaMsgTexto(textoAtual => textoAtual ? `${textoAtual} ${transcricao}` : transcricao);
     };
     recognition.onerror = event => {
       const mensagem = event.error === 'not-allowed' ? 'Permita o acesso ao microfone no navegador para conversar com a Aura.' : 'Não foi possível reconhecer sua fala. Tente novamente.';
       triggerToast(mensagem);
       setAuraOuvindo(false);
     };
     recognition.onend = () => setAuraOuvindo(false);
     auraRecognitionRef.current = recognition;
     setAuraOuvindo(true);
     recognition.start();
   }
 
   // ----------------------------------------------------
   // SALVAR POST-IT DO LEMBRETE RÁPIDO (Imagem 5!)
   // ----------------------------------------------------
   function handleSalvarPostIt(e: React.FormEvent) {
     e.preventDefault();
     if (!lembreteRapidoInput.trim()) return;
     setMuralPostIts([lembreteRapidoInput, ...muralPostIts]);
     setLembreteRapidoInput('');
     triggerToast('Nota rápida fixada no mural!');
   }
 
   function triggerToast(msg: string) {
     setToastMensagem(msg);
     setToastAtivo(true);
     setTimeout(() => {
       setToastAtivo(false);
     }, 3500);
   }
 
   // ----------------------------------------------------
   // AUXILIARES
   // ----------------------------------------------------
   function alternarGravacaoSimulada() {
     if (!gravando) {
       setGravando(true);
       setStatusIA('Gravando áudio da sessão clínica...');
       setSegundosGravacao(0);
     } else {
       setGravando(false);
       setStatusIA('Áudio da sessão clínica gravado com sucesso!');
     }
   }
 
   function calcularIdade(dataNascStr: string) {
     const dataNasc = new Date(dataNascStr);
     const hoje = new Date();
     let idade = hoje.getFullYear() - dataNasc.getFullYear();
     const m = hoje.getMonth() - dataNasc.getMonth();
     if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
       idade--;
     }
     return idade;
   }
 
   function copiarLinkQuiz(token: string) {
     const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
     const tenantPath = firstSegment && firstSegment !== 'dashboard' ? `/${firstSegment}` : '';
     const link = `${window.location.origin}${tenantPath}/quiz?token=${token}`;
     navigator.clipboard.writeText(link).then(() => {
       alert('Link do Quiz copiado! Envie para o paciente.');
     });
   }
 
   async function handleLogout() {
     await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
     localStorage.removeItem('psistem_token');
     localStorage.removeItem('psistem_user');
     router.push('/login');
   }
 
   function alternarTemaTopbar() {
     const novoTema = !temaEscuro ? 'dark' : 'light';
     setTemaEscuro(!temaEscuro);
     setMarca({ ...marca, tema_padrao: novoTema });
     
     if (novoTema === 'dark') {
       document.body.classList.add('dark-theme');
     } else {
       document.body.classList.remove('dark-theme');
     }
 
     fetch('/api/brand/settings', {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ ...marca, tema_padrao: novoTema })
     });
   }
 
   function aplicarCupom() {
     if (cupomInput.toUpperCase().trim() === 'CUPOM30') {
       setCupomAplicado(true);
       setTotalAssinatura(119.90);
       alert('Cupom de desconto aplicado!');
     } else {
       alert('Cupom inválido.');
     }
   }
 
   function desenharGraficoScores() {
     const canvas = canvasRef.current;
     if (!canvas || !reabData) return;
 
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
 
     const scores = reabData.scores;
     ctx.clearRect(0, 0, canvas.width, canvas.height);
 
     const padding = 40;
     const graphWidth = canvas.width - padding * 2;
     const graphHeight = canvas.height - padding * 2;
 
     // Grades Horizontais
     ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e2e8f0';
     ctx.lineWidth = 1;
     for (let i = 0; i <= 4; i++) {
       const y = padding + (graphHeight / 4) * i;
       ctx.beginPath();
       ctx.moveTo(padding, y);
       ctx.lineTo(canvas.width - padding, y);
       ctx.stroke();
 
       ctx.fillStyle = '#64748b';
       ctx.font = '10px Outfit';
       ctx.fillText((100 - i * 25).toString(), padding - 22, y + 3);
     }
 
     // Linha do Gráfico
     const corPrimaria = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || DESIGN_TOKENS.color.primary;     ctx.strokeStyle = corPrimaria;
     ctx.lineWidth = 3;
     ctx.beginPath();
 
     const pontos: { x: number; y: number; label: string; val: number }[] = [];
     scores.forEach((s, idx) => {
       const x = padding + (graphWidth / (scores.length - 1)) * idx;
       const y = padding + graphHeight - (graphHeight * s.score / 100);
       pontos.push({ x, y, label: s.semana, val: s.score });
 
       if (idx === 0) {
         ctx.moveTo(x, y);
       } else {
         ctx.lineTo(x, y);
       }
     });
     ctx.stroke();
 
     // Desenhar Pontos
     pontos.forEach(p => {
       ctx.fillStyle = corPrimaria;
       ctx.beginPath();
       ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
       ctx.fill();
       ctx.fillStyle = '#ffffff';
       ctx.beginPath();
       ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
       ctx.fill();
 
       // Labels X
       ctx.fillStyle = '#64748b';
       ctx.font = '10px Outfit';
       ctx.fillText(p.label, p.x - 12, canvas.height - padding + 18);
 
       // Score numérico acima do ponto
       ctx.fillStyle = '#18353D';
       ctx.font = 'bold 9px Outfit';
       ctx.fillText(p.val.toString(), p.x - 7, p.y - 10);
     });
   }
 
   function obterSaudacao() {
     const hora = new Date().getHours();
     if (hora >= 5 && hora < 12) return 'Bom dia';
     if (hora >= 12 && hora < 18) return 'Boa tarde';
     return 'Boa noite';
   }
 
   function obterNomeBreadcrumb() {
     switch (abaAtiva) {
       case 'aba-painel': return 'Painel Geral';
       case 'aba-agenda': return 'Agenda';
       case 'aba-form': return 'Formulário';       case 'aba-termos': return 'Biblioteca de termos';       case 'aba-pacientes': return 'Pacientes & Onboarding';
       case 'aba-gestao-paciente': return 'Gestão do Paciente';
       case 'aba-reabilitacao': return 'Reabilitação Cognitiva';
       case 'aba-financeiro': return 'Financeiro';       case 'aba-configuracoes': return 'Configurações';       default: return 'Painel';
     }
   }
 
   // Filtrar pacientes
   const pacientesFiltrados = pacientes.filter(p => 
     p.nome.toLowerCase().includes(buscaPacienteQuery.toLowerCase()) || 
     (p.iniciais && p.iniciais.toLowerCase().includes(buscaPacienteQuery.toLowerCase()))
   );
   const agendaPeriodoInicio = new Date();   agendaPeriodoInicio.setHours(12, 0, 0, 0);   agendaPeriodoInicio.setDate(agendaPeriodoInicio.getDate() - agendaPeriodoInicio.getDay() + agendaPeriodoOffset * 7);   const agendaPeriodoFim = new Date(agendaPeriodoInicio);   agendaPeriodoFim.setDate(agendaPeriodoInicio.getDate() + 6);   const agendaMesNome = new Intl.DateTimeFormat('pt-BR', { month: 'long' });   const agendaDataCurta = (data: Date) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(data).replace('.', '');   const agendaPeriodoTitulo = agendaPeriodoVista === 'dia'     ? `${agendaDataCurta(agendaPeriodoInicio)} de ${agendaPeriodoInicio.getFullYear()}`     : agendaPeriodoVista === 'mes'       ? `${agendaMesNome.format(agendaPeriodoInicio)} de ${agendaPeriodoInicio.getFullYear()}`       : `${agendaDataCurta(agendaPeriodoInicio)} – ${agendaDataCurta(agendaPeriodoFim)} de ${agendaPeriodoFim.getFullYear()}`;   const compromissosFiltrados = bloqueiosAgenda.filter(item => {     const data = new Date(`${item.data}T12:00:00`);
     return (agendaMes === 'todos' || data.getMonth() + 1 === Number(agendaMes)) &&
       (agendaAno === 'todos' || data.getFullYear() === Number(agendaAno)) &&
       (agendaPaciente === 'todos' || item.paciente_id === agendaPaciente) &&
       (agendaTipo === 'todos' || (item.tipo || 'Sessão') === agendaTipo) &&
       (agendaModalidade === 'todas' || (item.modalidade || 'Presencial') === agendaModalidade) &&
       (agendaStatus === 'todos' || (item.status || 'agendado') === agendaStatus) &&
       (!agendaBusca || item.nome.toLowerCase().includes(agendaBusca.toLowerCase()));
   });
   const dashboardToday = new Date().toISOString().slice(0, 10);
   const dashboardTodayCount = bloqueiosAgenda.filter(item => item.data === dashboardToday && item.status !== 'cancelado').length;
   const dashboardWeekCounts = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label, day) => ({ label, value: bloqueiosAgenda.filter(item => new Date(`${item.data}T12:00:00`).getDay() === day && item.status !== 'cancelado').length }));
   const dashboardWeekMax = Math.max(1, ...dashboardWeekCounts.map(item => item.value));
   const dashboardOnline = bloqueiosAgenda.filter(item => item.modalidade === 'Online' && item.status !== 'cancelado').length;
   const dashboardPresential = bloqueiosAgenda.filter(item => item.modalidade !== 'Online' && item.status !== 'cancelado').length;
   const dashboardAttendanceTotal = Math.max(1, dashboardOnline + dashboardPresential);
   const dashboardOnlinePercent = Math.round((dashboardOnline / dashboardAttendanceTotal) * 100);
   const dashboardRevenuePoints = (faturamento.recebido > 0 || faturamento.previsao > 0)
      ? [20, 35, 45, 60, 50, Math.min(92, Math.round((faturamento.recebido / Math.max(1, faturamento.previsao)) * 80))]
      : [0, 0, 0, 0, 0, 0];
 
   const hojeObj = new Date();
    const hojeISO = hojeObj.toISOString().slice(0, 10);
    const domObj = new Date(hojeObj);
    domObj.setHours(12, 0, 0, 0);
    domObj.setDate(hojeObj.getDate() - hojeObj.getDay());

    const diasSemanaNomes = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
    const diasSemanaVisaoGeral = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(domObj);
      d.setDate(domObj.getDate() + i);
      const dataStr = d.toISOString().slice(0, 10);
      const diaNum = String(d.getDate()).padStart(2, '0');
      const mesNum = String(d.getMonth() + 1).padStart(2, '0');
      return {
        dataStr,
        label: `${diasSemanaNomes[i]} ${diaNum}/${mesNum}`,
        diaMes: `${diaNum}/${mesNum}`,
        isHoje: dataStr === hojeISO,
        compromissos: bloqueiosAgenda.filter(item => item.data === dataStr && item.status !== 'cancelado'),
      };
    });

    const primeiroDia = diasSemanaVisaoGeral[0];
    const ultimoDia = diasSemanaVisaoGeral[6];
    const mesesNomesCurto = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const primeiroMes = mesesNomesCurto[new Date(`${primeiroDia.dataStr}T12:00:00`).getMonth()];
    const ultimoMes = mesesNomesCurto[new Date(`${ultimoDia.dataStr}T12:00:00`).getMonth()];
    const semanaPeriodoLabel = primeiroMes === ultimoMes 
      ? `${primeiroDia.diaMes.slice(0, 2)} - ${ultimoDia.diaMes.slice(0, 2)} de ${primeiroMes}. de ${hojeObj.getFullYear()}`
      : `${primeiroDia.diaMes} - ${ultimoDia.diaMes} de ${hojeObj.getFullYear()}`;

    const totalEvolucoesSelecionadas = Object.values(evolucaoCheckboxes).filter(Boolean).length;
 
   return (
     <div className="dashboard-layout">
       {/* ==========================================
            SIDEBAR LATERAL (Premium & Colapsável)
            ========================================== */}
       <aside className={`sidebar ${sidebarMinimizada ? 'collapsed' : ''}`}>
         
         <div className="sidebar-header">
           <div className="sidebar-brand">
             {sidebarMinimizada ? ( <BrandLogo inverse={temaEscuro} compact={true} /> ) : marca.logotipo_url ? ( <img src={marca.logotipo_url} alt="Logo" className="h-7 max-w-[120px] object-contain" /> ) : ( <BrandLogo inverse={temaEscuro} compact={false} /> )}
           </div>
           <button 
             className="btn-collapse" 
             onClick={() => setSidebarMinimizada(!sidebarMinimizada)}
             title={sidebarMinimizada ? "Expandir Menu" : "Recolher Menu"}
           >
             {sidebarMinimizada ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
           </button>
         </div>
 
         <div className="sidebar-body">
           <div className="menu-group">
             <div className="menu-group-title">Rotina</div>
             
             <a className={`menu-link ${abaAtiva === 'aba-painel' ? 'active' : ''}`} onClick={() => setAbaAtiva('aba-painel')}>               <LayoutGrid className="w-5 h-5" />
               <span data-tour="Dashboard">Dashboard</span>             </a>
 
             <a className={`menu-link ${abaAtiva === 'aba-gestao-paciente' ? 'active' : ''}`} onClick={() => setAbaAtiva('aba-gestao-paciente')}>
               <Users className="w-5 h-5" />
               <span data-tour="Pacientes">Pacientes</span>             </a>
 
             <a className={`menu-link ${abaAtiva === 'aba-agenda' ? 'active' : ''}`} onClick={() => setAbaAtiva('aba-agenda')}>
               <Calendar className="w-5 h-5" />
               <span data-tour="Agenda">Agenda</span>             </a>
 
             <a className={`menu-link ${abaAtiva === 'aba-form' ? 'active' : ''}`} onClick={() => setAbaAtiva('aba-form')}>               <FileText className="w-5 h-5" />               <span data-tour="Formulário">Formulário</span>             </a>              <a className={`menu-link ${abaAtiva === 'aba-termos' ? 'active' : ''}`} onClick={() => setAbaAtiva('aba-termos')}>               <ShieldCheck className="w-5 h-5" />               <span>Biblioteca de termos</span>             </a>              <a className={`menu-link ${abaAtiva === 'aba-financeiro' ? 'active' : ''}`} onClick={() => setAbaAtiva('aba-financeiro')}>               <DollarSign className="w-5 h-5" />               <span data-tour="Financeiro">Financeiro</span>             </a>           </div>
 
           <div className="menu-group">
             <div className="menu-group-title">Ajustes</div>
             <a className={`menu-link ${abaAtiva === 'aba-configuracoes' ? 'active' : ''}`} onClick={() => setAbaAtiva('aba-configuracoes')}>
               <Settings className="w-5 h-5" />
               <span data-tour="Configurações">Configurações</span>             </a>
           </div>
         </div>
 
       </aside>
 
       {/* ==========================================
            CONTEÚDO PRINCIPAL (Topbar + Área)
            ========================================== */}
       <div className="content-area">
         
         <header className="topbar">
           <div className="topbar-left">
             <div className="breadcrumbs">
               <span className="current font-bold">{obterNomeBreadcrumb()}</span>
               <span className="breadcrumb-divider">|</span>
               <span className="breadcrumb-greeting">{obterSaudacao()}, {nomeProfissional}</span>
             </div>
           </div>
 
           <div className="topbar-right">
             <label className="topbar-search">
               <Search className="w-4 h-4" />
               <input aria-label="Buscar no sistema" placeholder="Buscar..." />
             </label>
 
             <button className="btn-theme-topbar" onClick={alternarTemaTopbar} title="Alternar tema">               {temaEscuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}             </button>             <button className="btn-theme-topbar" onClick={() => triggerToast('Você não tem novas notificações.')} title="Notificações"><Bell className="w-5 h-5" /></button>             <button className="btn-theme-topbar" onClick={() => setAbaAtiva('aba-configuracoes')} title="Configurações"><Settings className="w-5 h-5" /></button>             <div className="profile-menu-wrap">               <button className="topbar-avatar" onClick={() => setMenuPerfilAberto(!menuPerfilAberto)} aria-expanded={menuPerfilAberto}>                 {nomeProfissional ? nomeProfissional.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'PS'}               </button>               {menuPerfilAberto && (                 <div className="profile-popover">                   <strong>{nomeProfissional}</strong>                   <span>{emailProfissional || 'Sessão ativa'}</span>                   <button onClick={() => triggerToast('Abrindo troca de senha...')}><RefreshCw className="w-4 h-4" /> Trocar senha</button>                   <button onClick={handleLogout}><LogOut className="w-4 h-4" /> Sair</button>                 </div>               )}             </div>           </div>         </header>          <main className={`main-content ${abaAtiva === 'aba-gestao-paciente' || abaAtiva === 'aba-pacientes' ? 'patient-mode' : ''}`}>           {billingBlocked && <div className="billing-lock-banner" role="alert"><div><ShieldAlert /><span><strong>{billingMessage || 'Ative sua conta para continuar.'}</strong><small>Escolha um plano e conclua o pagamento pelo Mercado Pago. A liberação acontece automaticamente após a confirmação.</small></span></div><button type="button" onClick={() => router.push(billingCheckoutUrl)}>Ativar minha conta <ArrowRight /></button></div>}                       
            {/* PAINEL GERAL SAAS */}
           {abaAtiva === 'aba-painel' && (
             <section className="tab-panel active dashboard-overview reveal-element">
               <div className="dashboard-heading">                 <div><span className="eyebrow">Visão geral</span><h1>{obterSaudacao()}, {nomeProfissional}</h1><p>Acompanhe sua clínica em um único lugar.</p></div>                 <button onClick={() => { setEditandoCadastroPaciente(false); setModalNovoPacienteAtivo(true); }} className="btn-primary w-auto px-5 py-2.5 text-xs"><Plus className="w-4 h-4" /> Novo paciente</button>               </div>
 
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5 mb-6">
                  {/* Card 1: Total de pacientes */}
                  <div className="tail-card tail-metric-card">
                    <div className="flex items-center justify-between">
                      <div className="tail-metric-icon">
                        <Users className="w-6 h-6" />
                      </div>
                      <span className="tail-badge tail-badge-cyan">
                        <ArrowUp className="w-3.5 h-3.5" />
                        Ativos
                      </span>
                    </div>
                    <div className="tail-metric-body">
                      <div>
                        <span className="tail-metric-title">Total de pacientes</span>
                        <h4 className="tail-metric-val">{pacientes.length}</h4>
                        <span className="tail-metric-sub">{pacientes.filter(p => p.status === 'ativo').length} em acompanhamento</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Atendimentos hoje */}
                  <div className="tail-card tail-metric-card">
                    <div className="flex items-center justify-between">
                      <div className="tail-metric-icon featured">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <span className="tail-badge tail-badge-cyan">
                        Hoje
                      </span>
                    </div>
                    <div className="tail-metric-body">
                      <div>
                        <span className="tail-metric-title">Atendimentos hoje</span>
                        <h4 className="tail-metric-val">{dashboardTodayCount}</h4>
                        <span className="tail-metric-sub">{dashboardTodayCount ? 'Agenda do dia em andamento' : 'Nenhum horário confirmado'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Recebido no mês */}
                  <div className="tail-card tail-metric-card">
                    <div className="flex items-center justify-between">
                      <div className="tail-metric-icon success">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <span className="tail-badge tail-badge-success">
                        <Check className="w-3.5 h-3.5" />
                        Consolidado
                      </span>
                    </div>
                    <div className="tail-metric-body">
                      <div>
                        <span className="tail-metric-title">Recebido no mês</span>
                        <h4 className="tail-metric-val">{faturamento.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h4>
                        <span className="tail-metric-sub">Financeiro conciliado</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Previsão mensal */}
                  <div className="tail-card tail-metric-card">
                    <div className="flex items-center justify-between">
                      <div className="tail-metric-icon">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <span className={`tail-badge ${faturamento.atrasado > 0 ? 'tail-badge-warning' : 'tail-badge-cyan'}`}>
                        {faturamento.atrasado > 0 ? 'Atenção' : 'Regular'}
                      </span>
                    </div>
                    <div className="tail-metric-body">
                      <div>
                        <span className="tail-metric-title">Previsão mensal</span>
                        <h4 className="tail-metric-val">{faturamento.previsao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h4>
                        <span className="tail-metric-sub">
                          {faturamento.atrasado > 0 ? `${faturamento.atrasado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em atraso` : 'Fluxo financeiro regular'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <SetupChecklist                 plan={plano}                 patientsCount={pacientes.length}                 onOpenProfile={() => { setConfiguracoesSecao('perfil'); setAbaAtiva('aba-configuracoes'); }}                 onOpenAgenda={() => { setConfiguracoesSecao('agenda'); setAbaAtiva('aba-configuracoes'); }}                 onAddPatient={() => { setEditandoCadastroPaciente(false); setModalNovoPacienteAtivo(true); }}                 onOpenIa={() => { setConfiguracoesSecao('ia'); setAbaAtiva('aba-configuracoes'); }}                 onStartTour={() => { setSidebarMinimizada(false); setTourAberto(true); }}               />                {/* Barra de Pendências e Atividades */}               <div className="dashboard-pending-bar">                 <div className="dashboard-pending-title">                   <CheckSquare className="w-4 h-4 text-emerald-500" />                   <span>Pendências & Atalhos</span>                 </div>                 <div className="dashboard-pending-items">                   <button                      type="button"                      className="dashboard-pending-item"                      onClick={() => setAbaAtiva('aba-agenda')}                   >                     <Calendar className="w-3.5 h-3.5" />                     <span>{dashboardTodayCount > 0 ? `${dashboardTodayCount} atendimentos hoje` : 'Agenda de hoje'}</span>                   </button>                   <button                      type="button"                      className="dashboard-pending-item"                      onClick={() => { setEditandoCadastroPaciente(false); setModalNovoPacienteAtivo(true); }}                   >                     <Plus className="w-3.5 h-3.5" />                     <span>Cadastrar novo paciente</span>                   </button>                   <button                      type="button"                      className="dashboard-pending-item"                      onClick={() => setAbaAtiva('aba-form')}                   >                     <FileText className="w-3.5 h-3.5" />                     <span>Formulário de triagem</span>                   </button>                   <button                      type="button"                      className="dashboard-pending-item"                      onClick={() => setAbaAtiva('aba-configuracoes')}                   >                     <Settings className="w-3.5 h-3.5" />                     <span>Personalizar logotipo e cores</span>                   </button>                 </div>               </div>                
 
                

                <div className="dashboard-analytics-grid">
                 <article className="dashboard-chart-card dashboard-week-chart">
                   <header><div><Calendar /><strong>Atendimentos da semana</strong></div><span>{dashboardWeekCounts.reduce((total, item) => total + item.value, 0)} no período</span></header>
                   <div className="animated-bar-chart">{dashboardWeekCounts.map((item, index) => <div key={item.label} style={{ '--bar-delay': `${index * 90}ms` } as React.CSSProperties}><span>{item.value}</span><i style={{ '--bar-height': `${Math.max(item.value ? 14 : 3, (item.value / dashboardWeekMax) * 100)}%` } as React.CSSProperties}></i><small>{item.label}</small></div>)}</div>
                 </article>
                 <article className="dashboard-chart-card dashboard-modality-chart">
                   <header><div><Activity /><strong>Tipo de atendimento</strong></div><span>{dashboardOnline + dashboardPresential} agendamentos</span></header>
                   <div className="dashboard-donut-wrap"><div className="animated-donut" style={{ '--online-angle': `${dashboardOnlinePercent * 3.6}deg` } as React.CSSProperties}><div><strong>{dashboardOnline + dashboardPresential}</strong><span>Total</span></div></div><div className="dashboard-chart-legend"><span><i className="online"></i>Online <strong>{dashboardOnline}</strong></span><span><i className="presential"></i>Presencial <strong>{dashboardPresential}</strong></span></div></div>
                 </article>
                 <article className="dashboard-chart-card dashboard-revenue-chart">
                   <header><div><DollarSign /><strong>Evolução financeira</strong></div><span>{faturamento.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></header>
                   <div className="animated-line-chart"><svg viewBox="0 0 520 230" preserveAspectRatio="none" aria-label="Evolução financeira dos últimos seis meses"><defs><linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity=".28"/><stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0"/></linearGradient></defs><path className="chart-grid-line" d="M20 40H500M20 95H500M20 150H500M20 205H500"/><path className="chart-area" d={`M20 205 L20 ${210-dashboardRevenuePoints[0]*1.8} ${dashboardRevenuePoints.map((point,index)=>`L${20+index*96} ${210-point*1.8}`).join(' ')} L500 205 Z`}/><path className="chart-line" d={`M20 ${210-dashboardRevenuePoints[0]*1.8} ${dashboardRevenuePoints.slice(1).map((point,index)=>`L${116+index*96} ${210-point*1.8}`).join(' ')}`}/>{dashboardRevenuePoints.map((point,index)=><circle key={index} cx={20+index*96} cy={210-point*1.8} r="4" />)}</svg><div>{['Mar','Abr','Mai','Jun','Jul','Ago'].map(month=><span key={month}>{month}</span>)}</div></div>
                 </article>
               </div>
               <div className="dashboard-action-strip"><div><Sparkles /><span><strong>Rotina clínica conectada</strong><small>Pacientes, agenda, sessões e financeiro atualizados no mesmo painel.</small></span></div><button className="btn-action" onClick={()=>setAbaAtiva('aba-agenda')}>Abrir agenda <ArrowRight /></button></div>
               <div className="dashboard-main-grid dashboard-legacy-content">
               
                 {/* Coluna da Esquerda: Mural de Notas e Boas-Vindas */}
                 <div className="flex flex-col gap-6">
                   
                   <div className="tail-card">
                     <span className="tail-badge tail-badge-cyan">Primeira ficha</span>
                     <h3 className="text-base font-bold mt-3 text-slate-800">Comece pelo centro do cuidado.</h3>
                     <p className="text-xs text-slate-500 leading-relaxed mt-1 mb-4">
                       Cadastre o primeiro paciente para conectar agenda, sessões, prontuário e cobranças em uma rotina única.
                     </p>
                     
                     <div className="flex gap-2">
                       <button onClick={() => { setEditandoCadastroPaciente(false); setModalNovoPacienteAtivo(true); }} className="btn-primary w-auto px-5 py-2.5 text-xs flex items-center gap-1">
                         <Plus className="w-4 h-4" />
                         Adicionar paciente
                       </button>
                     </div>
                   </div>
 
                   {/* Mural de Notas */}
                   <div className="tail-card">
                     <div className="flex justify-between items-center mb-4">
                       <h4 className="font-bold text-sm text-slate-800">Minhas notas</h4>
                       <div className="flex gap-1">
                         <span className="text-[9px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-semibold text-slate-500">0 páginas</span>
                         <span className="text-[9px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-semibold text-slate-500">{muralPostIts.length} post-its</span>
                         <span className="tail-badge tail-badge-cyan">Espaços</span>
                       </div>
                     </div>
 
                     <div className="grid grid-cols-1 gap-4">
                       <form onSubmit={handleSalvarPostIt} className="post-it-mural flex flex-col justify-between">
                         <textarea 
                           className="bg-transparent border-0 resize-none text-[11px] placeholder-amber-800/60 focus:outline-none w-full h-[70px]"
                           placeholder="Escreva aqui. Suas palavras viram um post-it na hora."
                           value={lembreteRapidoInput}
                           onChange={(e) => setLembreteRapidoInput(e.target.value)}
                           required
                         />
                         <button type="submit" className="text-[9px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 border-0 rounded px-2.5 py-1 w-fit self-end">
                           Fixar Nota
                         </button>
                       </form>
                     </div>
                   </div>
 
                 </div>
 
                  {/* Coluna da Direita: Agenda Semanal Integrada */}
                  <div className="tail-card flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
                      <div>
                        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">{semanaPeriodoLabel}</h3>
                        <span className="text-xs text-slate-400">Semana atual de atendimentos</span>
                      </div>
                      <button 
                        onClick={() => setAbaAtiva('aba-agenda')}
                        className="text-xs font-semibold text-[#09A4B3] hover:underline flex items-center gap-1"
                      >
                        Ver agenda completa <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {diasSemanaVisaoGeral.map(dia => (
                        <div key={dia.dataStr} className={dia.isHoje ? 'text-[#09A4B3] font-extrabold' : ''}>
                          {dia.label}
                        </div>
                      ))}
                    </div>

                    {/* Grade Semanal Real */}
                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-gray-900/10 min-h-[300px] p-2 grid grid-cols-7 gap-2">
                      {diasSemanaVisaoGeral.map((dia) => (
                        <div key={dia.dataStr} className={`flex flex-col gap-2 h-full border-r border-slate-100 dark:border-slate-800/50 last:border-0 pr-1 ${dia.isHoje ? 'bg-[#09A4B3]/5 rounded' : ''}`}>
                          {dia.compromissos.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-600">
                              -
                            </div>
                          ) : (
                            dia.compromissos.map(comp => (
                              <div key={comp.id} className="bg-[#E5F5F6] border-l-2 border-[#09A4B3] text-[#02778E] p-1.5 rounded text-[9px] font-semibold truncate" title={`${comp.hora} - ${comp.nome}`}>
                                {comp.hora} {comp.nome}
                              </div>
                            ))
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
 
               </div>
 
             </section>
           )}
 
           {/* ==========================================
                TELA DE AGENDA PREMIUM (Imagem 1 & 2!)
                ========================================== */}
           {abaAtiva === 'aba-agenda' && (
              <section className="tab-panel active reveal-element flex flex-col gap-6">
                <div className="section-header agenda-page-heading pb-3 border-b border-gray-150 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Agenda de Consultas</h2>
                    <p className="text-xs text-gray-400 mt-1">Gerencie sessões e atendimentos de forma dinâmica por dia, semana e mês.</p>
                  </div>
                </div>

                <AgendaView
                  bloqueiosAgenda={bloqueiosAgenda}
                  pacientes={pacientes}
                  onAbrirFichaPaciente={(p) => abrirFichaPaciente(p)}
                  onNovoCompromisso={(data, hora) => {
                    if (data) setBloqueioData(data);
                    if (hora) setBloqueioHora(hora);
                    setModalBloqueioAgendaAtivo(true);
                  }}
                  agendaPeriodoVista={agendaPeriodoVista}
                  setAgendaPeriodoVista={setAgendaPeriodoVista}
                  agendaPeriodoOffset={agendaPeriodoOffset}
                  setAgendaPeriodoOffset={setAgendaPeriodoOffset}
                  buscaQuery={agendaBusca}
                  onBuscaQueryChange={setAgendaBusca}
                />
              </section>
            )}

            {abaAtiva === 'aba-form' && <FormBuilder />}            {abaAtiva === 'aba-termos' && <TermsManagement patients={pacientes.map(patient => ({ id: patient.id, nome: patient.nome, email: patient.email }))} />}            {abaAtiva === 'aba-financeiro' && <ConsolidatedFinance />}            {/* ABA: PACIENTES & ONBOARDING */}           {abaAtiva === 'aba-pacientes' && (             <section className="tab-panel active reveal-element">               <div className="pacientes-section">                                  <div className="section-header">                   <div>                     <h2 className="text-xl font-bold tracking-tight">Pacientes — Gestão</h2>                     <p className="text-sm text-gray-500">Visão de consultório: acompanhe cada paciente, próximas consultas e status clínico.</p>                   </div>                   <div className="flex items-center gap-2">                     <button onClick={() => carregarPacientes()} className="btn-action px-3 py-2 text-xs flex items-center gap-1.5" title="Sincronizar lista de pacientes">                       <RefreshCw className="w-3.5 h-3.5" />                       Sincronizar                     </button>                     <button onClick={() => { setEditandoCadastroPaciente(false); setModalNovoPacienteAtivo(true); }} className="btn-primary w-auto px-5 py-2.5 text-xs flex items-center gap-1.5 shadow-sm bg-indigo-950">                       <Plus className="w-4 h-4" />                       Novo Paciente                     </button>                   </div>                 </div>                  <div className="flex gap-4 items-center mt-4">                   <div className="relative flex-1 max-w-[320px]">                     <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />                     <input                        type="text"                        className="form-control pl-9 text-xs py-2"                        placeholder="Buscar por nome ou iniciais..."                        value={buscaPacienteQuery}                       onChange={(e) => setBuscaPacienteQuery(e.target.value)}                     />                   </div>                   <select className="form-control text-xs py-2 w-auto" style={{ width: '120px' }}>                     <option value="Todos">Todos</option>                     <option value="Ativos">Ativos</option>                     <option value="Onboarding">Onboarding</option>                   </select>                 </div>                  <div className="pacientes-grid-cards mt-6">                   {pacientesFiltrados.map(p => (                     <div key={p.id} className="paciente-card-gestao card-glass">                       <div>                         <div className="paciente-card-header">                           <div className="paciente-card-info">                             <div className="paciente-card-iniciais">                               {p.iniciais || p.nome.substring(0, 2).toUpperCase()}                             </div>                             <div>                               <h4 className="paciente-card-nome">{p.nome}</h4>                               <span className="paciente-card-sub">{p.escolaridade || 'F90 - F21'}</span>                             </div>                           </div>                           <span className={`badge ${p.status === 'ativo' ? 'badge-ativo' : 'badge-onboarding'} text-[9px] px-2 py-0.5 rounded-full font-bold`}>                             {p.status}                           </span>                         </div>                          <div className="paciente-card-divider" />                          <div className="paciente-card-boxes">                           <div className="paciente-card-box">                             <span className="title">Última Consulta</span>                             <span className="val">23/07/2026</span>                           </div>                           <div className="paciente-card-box">                             <span className="title">Próxima</span>                             <span className="val text-gray-400 font-bold">A agendar</span>                           </div>                         </div>                       </div>                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50 dark:border-gray-900">                         <button                            onClick={() => {                             setPacienteSelecionado(p);                             setAbaAtiva('aba-gestao-paciente');                           }}                            className="paciente-card-link text-xs flex items-center gap-1.5"                         >                           <Eye className="w-3.5 h-3.5 text-gray-400" />                           Prontuário clínico                         </button>                                                  {p.status === 'onboarding' && (                           <button onClick={() => copiarLinkQuiz(p.onboarding_token)} className="btn-action text-[10px] py-1 px-2.5">                             Copiar Link                           </button>                         )}                       </div>                     </div>                   ))}                   {pacientesFiltrados.length === 0 && (                     <div className="col-span-full text-center py-10 bg-white dark:bg-gray-900/10 border border-gray-100 dark:border-gray-800 rounded-md">                       <p className="text-xs text-gray-400">Nenhum paciente encontrado com esta busca.</p>                     </div>                   )}                 </div>                </div>             </section>           )}            {/* ABA: GESTÃO DO PACIENTE */}           {abaAtiva === 'aba-gestao-paciente' && (             <section className="gestao-paciente-container active reveal-element">                              <aside className="patient-roster">                 <div className="patient-roster-actions flex items-center gap-2">                   <button onClick={() => { setEditandoCadastroPaciente(false); setModalNovoPacienteAtivo(true); }} className="btn-primary flex-1"><Plus className="w-4 h-4" /> Nova pessoa</button>                   <button onClick={() => carregarPacientes()} className="btn-action px-2.5 py-2" title="Sincronizar pacientes"><RefreshCw className="w-3.5 h-3.5" /></button>                 </div>                 <label className="patient-roster-search"><Search className="w-4 h-4" /><input value={buscaPacienteQuery} onChange={e => setBuscaPacienteQuery(e.target.value)} placeholder="Buscar por nome ou CPF..." /></label>                 <div className="patient-roster-meta"><span>{pacientesFiltrados.length} resultados</span><strong>Total: {pacientes.length}</strong></div>                 <div className="patient-roster-list">                   {pacientesFiltrados.map(paciente => (                     <button key={paciente.id} className={`patient-roster-item ${pacienteSelecionado?.id === paciente.id ? 'active' : ''}`} onClick={() => { setPacienteSelecionado(paciente); setSubAbaGestao('resumo'); }}>                       <span className="patient-roster-avatar">{paciente.iniciais || paciente.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>                       <span className="patient-roster-copy"><strong>{paciente.nome}</strong></span>                       <ChevronRight className="w-4 h-4" />                     </button>                   ))}                 </div>               </aside>                {/* Área Principal de Prontuário Clínico (Direita) */}               <div className="flex flex-col gap-6">                  <header className="patient-central-header">                   <div className="patient-central-identity">                     <span className="patient-central-avatar">{pacienteSelecionado?.iniciais || pacienteSelecionado?.nome.split(' ').map(n => n[0]).join('').slice(0, 2) || 'PS'}</span>                     <div><h2>{pacienteSelecionado?.nome || 'Selecione um paciente'}</h2></div>                   </div>                   <div className="patient-central-actions">{pacienteSelecionado && <PatientPdfSummaryButton patient={pacienteSelecionado} />}<button className="btn-action"><MessageSquare className="w-4 h-4" /> WhatsApp</button><button onClick={() => { setEditandoCadastroPaciente(true); setModalNovoPacienteAtivo(true); }} className="btn-primary w-auto px-4 py-2 text-xs"><Pencil className="w-4 h-4" /> Editar</button></div>                 </header>                  <div className={`patient-tabs-shell ${!patientTabsPrevious && !patientTabsNext ? 'no-arrows' : !patientTabsPrevious ? 'only-next' : !patientTabsNext ? 'only-previous' : ''}`}>                   {patientTabsPrevious && <button className="patient-tabs-arrow previous" onClick={() => patientTabsRef.current?.scrollBy({ left: -320, behavior: 'smooth' })} aria-label="Mostrar abas anteriores"><ChevronLeft /></button>}                   <nav ref={patientTabsRef} className="patient-central-tabs" aria-label="Central do paciente">                     {[                       ['resumo', 'Identificação', BookOpen], ['neuroavaliacao', 'Avaliação PSI', Brain], ['evolucao', 'Sessões', TrendingUp], ['estudo-caso-formula', 'Estudo de caso', Sliders], ['reabilitacao', 'Reabilitação', Activity], ['medicacoes', 'Resumo Clínico', Pill], ['documentos', 'Documentos', FolderPlus], ['termos-paciente', 'Termo', ShieldCheck], ['converse-aura', 'Aura', MessageSquare], ['financeiro', 'Financeiro', DollarSign]                     ].map(([id, label, Icon]) => <button key={id as string} className={subAbaGestao === id ? 'active' : ''} onClick={() => setSubAbaGestao(id as string)}><Icon className="w-4 h-4" />{label as string}</button>)}                   </nav>                   {patientTabsNext && <button className="patient-tabs-arrow next" onClick={() => patientTabsRef.current?.scrollBy({ left: 320, behavior: 'smooth' })} aria-label="Mostrar próximas abas"><ChevronRight /></button>}                 </div>                  {subAbaGestao === 'termos-paciente' && pacienteSelecionado && <div className="patient-tab-content patient-terms-tab"><TermsManagement patients={[{ id: pacienteSelecionado.id, nome: pacienteSelecionado.nome, email: pacienteSelecionado.email }]} patientId={pacienteSelecionado.id} embedded /></div>}                  {/* PERFIL DO PACIENTE */}                 {subAbaGestao === 'resumo' && (
                  !pacienteSelecionado ? (
                    <div className="tail-card text-center py-20 flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-1">
                        <Users className="w-8 h-8 text-[#09A4B3]" />
                      </div>
                      <h3 className="patient-empty-title font-bold text-lg">
                        {pacientes.length === 0 ? 'Nenhum paciente cadastrado' : 'Selecione um paciente'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                        {pacientes.length === 0 
                          ? 'Seu consultório está pronto para começar. Cadastre seu primeiro paciente para abrir a ficha clínica, registrar sessões e acompanhar o prontuário completo.' 
                          : 'Clique em um paciente na lista ao lado para acessar seu prontuário, evoluções e financeiro.'}
                      </p>
                      <button 
                        onClick={() => { setEditandoCadastroPaciente(false); setModalNovoPacienteAtivo(true); }}
                        className="btn-primary w-auto px-5 py-2.5 text-xs flex items-center gap-2 mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        Cadastrar paciente
                      </button>
                    </div>
                  ) : (
                    <div className="patient-identification-layout reveal-element">
                     <section className="patient-info-card patient-identification-card">
                       <header><BookOpen /><strong>Identificação</strong></header>
                       <div className="patient-identification-grid">
                         <div><span>Nome completo</span><strong>{pacienteSelecionado?.nome || 'Não informado'}</strong></div>
                         <div><span>CPF</span><strong>{pacienteSelecionado?.cpf || 'Não informado'}</strong></div>
                         <div><span>Nacionalidade</span><strong>{pacienteSelecionado?.nacionalidade || 'Brasileira'}</strong></div>
                         <div><span>Estado civil</span><strong>{pacienteSelecionado?.estado_civil || 'Não informado'}</strong></div>
                         <div><span>Profissão</span><strong>{pacienteSelecionado?.profissao || 'Não informada'}</strong></div>
                         <div><span>Tipo de atendimento</span><strong>{pacienteSelecionado?.tipo_atendimento || 'Não informado'}</strong></div>
                         <div><span>Data de nascimento</span><strong>{pacienteSelecionado?.data_nascimento || 'Não informada'}</strong></div>
                         <div><span>Gênero</span><strong>{pacienteSelecionado?.genero || 'Não informado'}</strong></div>
                         <div><span>Nome social</span><strong>{pacienteSelecionado?.nome_social || 'Não informado'}</strong></div>
                       </div>
                     </section>
 
                     <div className="patient-identification-columns">
                       <section className="patient-info-card">
                         <header><MapPin /><strong>Endereço</strong></header>
                         <div className="patient-address-grid">
                           <div className="full"><span>Logradouro</span><strong>{[pacienteSelecionado?.endereco?.rua, pacienteSelecionado?.endereco?.numero].filter(Boolean).join(', ') || 'Não informado'}</strong></div>
                           <div><span>Cidade</span><strong>{pacienteSelecionado?.endereco?.cidade || 'Não informada'}</strong></div>
                           <div><span>UF</span><strong>{pacienteSelecionado?.endereco?.uf || 'Não informada'}</strong></div>
                           <div><span>CEP</span><strong>{pacienteSelecionado?.endereco?.cep || 'Não informado'}</strong></div>
                           <div><span>País</span><strong>{pacienteSelecionado?.endereco?.pais || 'Brasil'}</strong></div>
                         </div>
                       </section>
                       <section className="patient-info-card">
                         <header><Contact /><strong>Contato</strong></header>
                         <div className="patient-contact-list">
                           <div><span>E-mail</span><strong>{pacienteSelecionado?.email || 'Não informado'}</strong></div>
                           <div><span>Telefone</span><strong>{pacienteSelecionado?.telefone || 'Não informado'}</strong></div>
                         </div>
                       </section>
                     </div>
 
                     <section className="patient-info-card patient-support-card">
                       <header><HeartHandshake /><strong>Rede de apoio</strong><small>{[pacienteSelecionado?.responsavel_nome, pacienteSelecionado?.contato_emergencia].filter(Boolean).length} contato(s)</small></header>
                       <div className="patient-support-content">
                         {pacienteSelecionado?.responsavel_nome || pacienteSelecionado?.contato_emergencia ? <div className="patient-support-list">
                           {pacienteSelecionado?.responsavel_nome && <article><User /><div><strong>{pacienteSelecionado.responsavel_nome}</strong><span>Responsável · {pacienteSelecionado.responsavel_telefone || 'telefone não informado'}</span></div></article>}
                           {pacienteSelecionado?.contato_emergencia && <article><Contact /><div><strong>{pacienteSelecionado.contato_emergencia}</strong><span>Contato de emergência</span></div></article>}
                         </div> : <div className="patient-support-empty"><HeartHandshake /><span>Nenhum contato da rede de apoio cadastrado.</span></div>}
                         <button onClick={() => { setEditandoCadastroPaciente(true); setModalNovoPacienteAtivo(true); }} className="btn-primary btn-compact"><Plus />Adicionar contato</button>
                       </div>
                     </section>
                    </div>
                  )
                )}
 
                 {/* ARQUIVO DE SESSÕES */}
                 {/* ARQUIVO DE SESSÕES */}
                 {subAbaGestao === 'evolucao' && (
                   <div className="patient-tab-content">
                     <SessionManagement patients={pacienteSelecionado ? [pacienteSelecionado] : []} embedded plan={plano} />
                   </div>
                 )}
                 {subAbaGestao === 'financeiro' && pacienteSelecionado && <PatientFinance key={pacienteSelecionado.id} patient={pacienteSelecionado} launches={financeiro} onRefresh={carregarFinanceiro} />}
                 {false && subAbaGestao === 'financeiro' && (
                   <div className="flex flex-col gap-6 reveal-element">
                     <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                       <div>
                         <span className="text-[9px] uppercase font-bold text-gray-400 block">Acompanhamento financeiro</span>
                         <h3 className="text-base font-bold text-indigo-950 mt-1">Financeiro do Paciente</h3>
                       </div>
                       <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded font-bold">Julho 2026 - 01/07 a 31/07</span>
                     </div>
 
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <div className="border border-gray-150 p-4 rounded-md bg-white text-xs flex flex-col gap-1 shadow-sm">
                         <span className="text-[9px] uppercase font-bold text-gray-400">Valor da sessão</span>
                         <strong className="text-base font-bold text-indigo-950">R$ 250,00</strong>
                       </div>
                       <div className="border border-amber-100 bg-amber-50/50 p-4 rounded-md text-xs flex flex-col gap-1 shadow-sm">
                         <span className="text-[9px] uppercase font-bold text-amber-800">A receber</span>
                         <strong className="text-base font-bold text-amber-900">R$ 250,00</strong>
                       </div>
                       <div className="border border-gray-150 p-4 rounded-md bg-white text-xs flex flex-col gap-1 shadow-sm">
                         <span className="text-[9px] uppercase font-bold text-gray-400">Período</span>
                         <strong className="text-base font-bold text-indigo-950">Julho 2026</strong>
                       </div>
                     </div>
 
                     <div className="bg-purple-50 border border-purple-100 text-purple-800 p-3 rounded-md text-[11px] font-semibold flex items-center gap-2">
                       <span>%</span>
                       <span>Prévia demonstrativa: sessões fictícias para conhecer o financeiro, sem cobranças ou recibos reais.</span>
                     </div>
 
                     <div className="table-wrapper">
                       <table>
                         <thead>
                           <tr>
                             <th>Data</th>
                             <th>Status Sessão</th>
                             <th>Valor</th>
                             <th>Pagamento</th>
                             <th>Data Pago</th>
                             <th>Recibos</th>
                           </tr>
                         </thead>
                         <tbody>
                           {[
                             { id: 'ses-03', data: '03/07/2026', valor: 250.00 },
                             { id: 'ses-10', data: '10/07/2026', valor: 250.00 },
                             { id: 'ses-17', data: '17/07/2026', valor: 250.00 },
                             { id: 'ses-24', data: '24/07/2026', valor: 250.00 }
                           ].map(row => (
                             <tr key={row.id}>
                               <td className="font-semibold text-xs">{row.data}</td>
                               <td>
                                 <select 
                                   className="form-control text-[11px] py-1 w-auto bg-transparent border-0 font-semibold"
                                   value={financeiroSessaoStatus[row.id]}
                                   onChange={(e) => {
                                     setFinanceiroSessaoStatus({
                                       ...financeiroSessaoStatus,
                                       [row.id]: e.target.value
                                     });
                                   }}
                                 >
                                   <option value="Realizada">Realizada</option>
                                   <option value="Aguardando">Aguardando</option>
                                 </select>
                               </td>
                               <td className="font-semibold text-xs">R$ {row.valor.toFixed(2)}</td>
                               <td>
                                 <span className={`badge ${
                                   financeiroSessaoStatus[row.id] === 'Realizada' ? 'badge-pago' : 'badge-pendente'
                                 } text-[10px] font-bold rounded-full px-3 py-1`}>
                                   {financeiroSessaoStatus[row.id] === 'Realizada' ? 'Pago' : 'Aguardando'}
                                 </span>
                               </td>
                               <td className="text-gray-400 text-xs">-</td>
                               <td>
                                 <button className="btn-action text-[10px] py-1">Prévia</button>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}
 
                 {/* PRONTUÁRIO GERAL */}
                 {subAbaGestao === 'neuroavaliacao' && pacienteSelecionado && <div className="patient-tab-content"><NeuropsychAssessment patient={pacienteSelecionado} /></div>}
 
                 {subAbaGestao === 'avaliacoes' && (
                   <div className="flex flex-col gap-6 reveal-element">
                     <div className="panel-card card-glass grid grid-cols-3 md:grid-cols-6 gap-4 text-center items-center text-xs">
                       <div>
                         <span className="text-[9px] text-gray-400 block uppercase">Último Prontuário</span>
                         <strong className="block mt-1 font-bold">-</strong>
                       </div>
                       <div>
                         <span className="text-[9px] text-gray-400 block uppercase">Período</span>
                         <strong className="block mt-1 font-bold">-</strong>
                       </div>
                       <div>
                         <span className="text-[9px] text-gray-400 block uppercase">Total de evoluções</span>
                         <strong className="block mt-1 font-bold text-accent">3</strong>
                       </div>
                       <div>
                         <span className="text-[9px] text-gray-400 block uppercase">Evoluções contempladas</span>
                         <strong className="block mt-1 font-bold text-indigo-700 bg-indigo-50 rounded-full w-6 h-6 mx-auto leading-6">{totalEvolucoesSelecionadas}</strong>
                       </div>
                       <div>
                         <span className="text-[9px] text-gray-400 block uppercase">Primeira sessão</span>
                         <strong className="block mt-1 font-bold">03/07/2026</strong>
                       </div>
                       <div>
                         <span className="text-[9px] text-gray-400 block uppercase">Última sessão</span>
                         <strong className="block mt-1 font-bold">17/07/2026</strong>
                       </div>
                     </div>
 
                     <div className="flex justify-between items-center p-3 border border-gray-150 rounded bg-white text-xs">
                       <button 
                         onClick={() => setEvolucaoCheckboxes({ 'ev-17': false, 'ev-10': false, 'ev-03': false })} 
                         className="btn-action text-xs"
                       >
                         Desmarcar Seleção
                       </button>
                       
                       <div className="flex items-center gap-2">
                         <input 
                           type="checkbox" 
                           checked={totalEvolucoesSelecionadas === 3} 
                           onChange={(e) => {
                             const val = e.target.checked;
                             setEvolucaoCheckboxes({ 'ev-17': val, 'ev-10': val, 'ev-03': val });
                           }}
                         />
                         <span className="text-gray-500">Selecionar tudo</span>
                         <strong className="text-accent ml-4 font-bold">{totalEvolucoesSelecionadas} selecionado(s)</strong>
                       </div>
                     </div>
 
                     <div className="panel-card card-glass">
                       <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                         <div className="flex items-center gap-2">
                           <input 
                             type="checkbox"
                             checked={totalEvolucoesSelecionadas === 3}
                             onChange={(e) => {
                               const val = e.target.checked;
                               setEvolucaoCheckboxes({ 'ev-17': val, 'ev-10': val, 'ev-03': val });
                             }}
                           />
                           <strong className="text-sm font-bold text-indigo-950">Julho de 2026</strong>
                         </div>
                         <span className="text-xs text-indigo-700 font-bold">{totalEvolucoesSelecionadas}/3</span>
                       </div>
 
                       <div className="flex flex-col gap-3">
                         {[
                           { id: 'ev-17', label: 'Sessão em 17/07/2026 10:37' },
                           { id: 'ev-10', label: 'Sessão em 10/07/2026 10:37' },
                           { id: 'ev-03', label: 'Sessão em 03/07/2026 10:37' }
                         ].map(evRow => (
                           <div key={evRow.id} className="border border-gray-100 p-3.5 rounded bg-white flex justify-between items-center text-xs">
                             <div>
                               <strong className="block text-indigo-950">Evolução</strong>
                               <span className="text-gray-400 block mt-0.5">{evRow.label}</span>
                             </div>
                             <input 
                               type="checkbox"
                               checked={evolucaoCheckboxes[evRow.id] || false}
                               onChange={(e) => {
                                 setEvolucaoCheckboxes({
                                   ...evolucaoCheckboxes,
                                   [evRow.id]: e.target.checked
                                 });
                               }}
                             />
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                 )}
 
                 {subAbaGestao === 'reabilitacao' && (
                   <div className="rehabilitation-workspace reveal-element">
                     <section className="clinical-form-card">
                       <div className="patient-section-title"><div><span className="eyebrow">Reabilitação neuropsicológica</span><h3>Plano individualizado de intervenção</h3><p>Formulação compartilhada, funcionalidade, estratégias, responsabilidades e monitoramento contínuo.</p></div><button type="button" className={planoModoEdicao ? 'btn-primary btn-compact' : 'btn-action'} onClick={() => { if (planoModoEdicao) { void salvarCentralPaciente(centralData); triggerToast('Plano de reabilitação salvo.'); } setPlanoModoEdicao(!planoModoEdicao); }}><Pencil className="w-4 h-4" /> {planoModoEdicao ? 'Salvar' : 'Editar'}</button></div>
                       <p className="clinical-ai-notice"><ShieldCheck /> O plano deve ser construído com a pessoa atendida e sua rede, fundamentado na avaliação, nas necessidades funcionais e em práticas baseadas em evidências.</p>
                       <label><strong>Formulação consensual do caso</strong><textarea className="form-control" disabled={!planoModoEdicao} value={centralData.reabilitacao.formulacao_caso} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, formulacao_caso: event.target.value } })} placeholder="Integre dificuldades, habilidades preservadas, contexto, fatores emocionais e funcionais…" /></label>
                       <label><strong>Prioridades compartilhadas</strong><textarea className="form-control compact-area" disabled={!planoModoEdicao} value={centralData.reabilitacao.prioridades_compartilhadas} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, prioridades_compartilhadas: event.target.value } })} placeholder="Necessidades e preferências negociadas com paciente, família e equipe…" /></label>
                       <fieldset className="rehab-domain-fieldset"><legend>Domínios prioritários</legend><div>{dominiosDisponiveis.map(dominio => { const selected = centralData.reabilitacao.dominios.includes(dominio); return <button type="button" key={dominio} disabled={!planoModoEdicao} className={selected ? 'selected' : ''} onClick={() => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, dominios: selected ? centralData.reabilitacao.dominios.filter(item => item !== dominio) : [...centralData.reabilitacao.dominios, dominio] } })}>{selected && <Check />}{dominio}</button>; })}</div></fieldset>
                       <label><strong>Baseline funcional</strong><textarea className="form-control" disabled={!planoModoEdicao} value={centralData.reabilitacao.baseline} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, baseline: event.target.value } })} placeholder="Descrição do funcionamento basal antes da intervenção…" /></label>
                       <label><strong>Rede de apoio</strong><textarea className="form-control compact-area" disabled={!planoModoEdicao} value={centralData.reabilitacao.rede_apoio} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, rede_apoio: event.target.value } })} placeholder="Familiares, escola, equipe médica…" /></label>
                       <div className="rehab-plan-grid"><label><strong>Objetivos funcionais</strong><textarea className="form-control" disabled={!planoModoEdicao} value={centralData.reabilitacao.objetivos_funcionais} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, objetivos_funcionais: event.target.value } })} placeholder="Resultados esperados na rotina, autonomia, participação e qualidade de vida…" /></label><label><strong>Estratégias de intervenção</strong><textarea className="form-control" disabled={!planoModoEdicao} value={centralData.reabilitacao.estrategias} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, estrategias: event.target.value } })} placeholder="Estimulação, compensação, psicoeducação, adaptação ambiental, tecnologia assistiva e orientação da rede…" /></label><label><strong>Frequência e duração planejadas</strong><textarea className="form-control compact-area" disabled={!planoModoEdicao} value={centralData.reabilitacao.frequencia_duracao} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, frequencia_duracao: event.target.value } })} placeholder="Periodicidade, duração das sessões e período inicial do plano…" /></label><label><strong>Responsáveis e contextos</strong><textarea className="form-control compact-area" disabled={!planoModoEdicao} value={centralData.reabilitacao.responsaveis} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, responsaveis: event.target.value } })} placeholder="Ações do profissional, paciente, família, escola e equipe…" /></label><label><strong>Indicadores de acompanhamento</strong><textarea className="form-control" disabled={!planoModoEdicao} value={centralData.reabilitacao.indicadores} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, indicadores: event.target.value } })} placeholder="Medidas funcionais, desempenho, generalização, participação, engajamento e efeitos adversos…" /></label><label><strong>Data prevista para revisão</strong><input type="date" className="form-control" disabled={!planoModoEdicao} value={centralData.reabilitacao.revisao_em} onChange={event => setCentralData({ ...centralData, reabilitacao: { ...centralData.reabilitacao, revisao_em: event.target.value } })} /></label></div>
                     </section>
                     <section className="clinical-form-card rehab-goals"><div className="patient-section-title"><div><h3>Metas SMART</h3><p>Objetivos específicos, mensuráveis e com prazo.</p></div><button data-ai-action="generate-smart-goals" data-ai-title="Gerar com IA" data-ai-help="Sugere metas SMART para revisão profissional." type="button" className="btn-primary btn-compact" disabled={otimizandoMetas} onClick={() => void otimizarMetasComAura()}><AiIcon className="w-4 h-4" /> {otimizandoMetas ? 'Gerando...' : 'Gerar com IA'}</button></div><p className="clinical-ai-notice"><ShieldCheck /> Apoio clínico — a decisão e responsabilidade final é sempre do profissional.</p>{centralData.reabilitacao.metas.length ? <div className="rehab-goal-list">{centralData.reabilitacao.metas.map(meta => <article key={meta.id}><span>{meta.tipo}</span><p>{meta.meta}</p></article>)}</div> : <div className="patient-empty"><CheckSquare /><strong>Nenhuma meta ainda</strong><span>Use “Gerar com IA” para criar a partir das hipóteses do laudo.</span></div>}</section>
                   </div>
                 )}
 
                 {subAbaGestao === 'converse-aura' && (
                   <div className="chat-container reveal-element">
                     <div className="p-4 border-b border-gray-100">
                       <span className="eyebrow">IA clínica</span>
                       <h3 className="font-bold mt-1">Converse com Aura</h3>
                     </div>
                     <div className="chat-messages">
                       {auraChatMensagens.map(mensagem => <div key={mensagem.id} className={`chat-bubble ${mensagem.sender}`}>{mensagem.text}<small className="block opacity-60 mt-1">{mensagem.time}</small></div>)}                       {auraRespondendo && <div className="chat-bubble ia"><span className="aura-thinking">A Aura está organizando o contexto…</span></div>}                     </div>                     <form className="chat-input-area" onSubmit={handleEnviarMsgAura}>                       <input className="form-control" disabled={!pacienteSelecionado || auraRespondendo} value={auraNovaMsgTexto} onChange={e => setAuraNovaMsgTexto(e.target.value)} placeholder={pacienteSelecionado ? 'Pergunte à Aura sobre este caso...' : 'Selecione um paciente para conversar'} />                       <button className={`aura-mic-button ${auraOuvindo ? 'listening' : ''}`} type="button" onClick={alternarMicrofoneAura} title={auraOuvindo ? 'Parar de ouvir' : 'Falar com a Aura'} aria-label={auraOuvindo ? 'Parar gravação de voz' : 'Iniciar conversa por voz'} aria-pressed={auraOuvindo}>
                         <Mic className="w-5 h-5" />
                         {auraOuvindo && <span className="aura-mic-pulse" />}
                       </button>
                       <button className="btn-primary w-auto px-5" type="submit" disabled={!pacienteSelecionado || auraRespondendo}>{auraRespondendo ? 'Consultando…' : 'Enviar'}</button>                     </form>
                   </div>
                 )}
 
                 {subAbaGestao === 'documentos' && (
                   <div className="flex flex-col gap-5 reveal-element">
                     <form className="panel-card card-glass patient-inline-form document-upload-form" onSubmit={adicionarDocumentoPaciente}>
                       <div><span className="eyebrow">Biblioteca</span><h3>Documentos do paciente</h3><p>Envie PDFs, imagens ou textos para consultar dentro da ficha.</p></div>
                       <input className="form-control" value={novoDocumentoNome} onChange={e => setNovoDocumentoNome(e.target.value)} placeholder="Título opcional" />
                       <label className="document-file-picker"><Upload className="w-4 h-4" /><span>{novoDocumentoArquivo?.name || 'Selecionar arquivo'}</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/png,image/jpeg,image/webp,text/plain" onChange={event => setNovoDocumentoArquivo(event.target.files?.[0] || null)} /></label>
                       <button className="btn-primary w-auto px-5" type="submit" disabled={!novoDocumentoArquivo || enviandoDocumento}><FilePlus className="w-4 h-4" /> {enviandoDocumento ? 'Enviando...' : 'Adicionar'}</button>
                     </form>
                     <div className="document-grid patient-documents-grid">{centralData.documentos.length ? centralData.documentos.map(documento => <article key={documento.id} className="panel-card card-glass"><FileText className="text-accent" /><div><strong>{documento.nome}</strong><small>{documento.categoria} · {new Date(documento.criado_em).toLocaleDateString('pt-BR')}{documento.tamanho_bytes ? ` · ${(documento.tamanho_bytes / 1024 / 1024).toFixed(1)} MB` : ''}</small></div><div className="document-card-actions">{documento.url ? <><button type="button" onClick={() => setDocumentoVisualizado(documento)}><Eye /> Visualizar</button><a href={documento.url} download><Download /> Baixar</a></> : <span>Arquivo não anexado</span>}</div></article>) : <div className="patient-empty"><FileText /><strong>Nenhum documento enviado</strong><span>Os arquivos do paciente aparecerão aqui.</span></div>}</div>
                   </div>
                 )}
 
                 {subAbaGestao === 'medicacoes' && (
                   <form className="clinical-form-card reveal-element" onSubmit={event => { event.preventDefault(); void salvarCentralPaciente(centralData); triggerToast('Resumo clínico salvo.'); }}>
                     <div className="patient-section-title"><div><span className="eyebrow">Visão integrada</span><h3>Resumo Clínico</h3><p>Concentre as informações essenciais para consulta rápida e continuidade do cuidado.</p></div><button className="btn-primary btn-compact" type="submit"><Check className="w-4 h-4" /> Salvar resumo</button></div>
                     <div className="clinical-fields-grid summary-clinical-grid">
                       {([
                         ['queixas_principais', 'Queixas Principais', 'Uma queixa por linha...'],
                         ['hipoteses_diagnosticas', 'Hipóteses Diagnósticas (CID – Descrição)', 'Ex.: CID / hipóteses provisórias...'],
                         ['alertas_medicos', 'Alertas Médicos', 'Alergias, condições especiais...'],
                         ['exames_laboratoriais', 'Exames Laboratoriais', 'Exames realizados, datas e principais achados...'],
                         ['medicamentos', 'Medicamentos', 'Medicamento, dosagem, frequência e prescritor...'],
                         ['observacoes', 'Observações', 'Observações clínicas relevantes...'],
                       ] as const).map(([field, label, placeholder]) => <label key={field}><strong>{label}</strong><textarea className="form-control" value={centralData.resumo_clinico[field]} onChange={event => setCentralData({ ...centralData, resumo_clinico: { ...centralData.resumo_clinico, [field]: event.target.value } })} placeholder={placeholder} /></label>)}
                     </div>
                   </form>
                 )}
 
                 {subAbaGestao === 'estudo-caso-formula' && (
                   <div className="case-study-workspace reveal-element">
                     <div className="patient-section-title"><div><span className="eyebrow">Formulação clínica interna</span><h3>Estudo e compreensão do caso</h3><p>Integre fontes, contexto, hipóteses provisórias, recursos, riscos, objetivos e evolução para orientar o cuidado.</p></div><button className="btn-primary btn-compact" onClick={() => void handleSalvarEstudoCaso()}><Check className="w-4 h-4" /> Salvar alterações</button></div>
                     <p className="clinical-ai-notice"><ShieldCheck /> Este estudo é um instrumento interno e dinâmico de raciocínio clínico, não substitui prontuário, laudo, relatório ou diagnóstico. Registre fatos e fontes separadamente de inferências e compartilhe somente o necessário.</p>
                     <section className="case-study-metadata panel-card"><label><strong>Referencial teórico-metodológico</strong><input className="form-control" value={estudoCasoMeta.abordagem} onChange={e => setEstudoCasoMeta({ ...estudoCasoMeta, abordagem: e.target.value })} placeholder="Ex.: abordagem centrada na pessoa, análise do comportamento, Gestalt-terapia, TCC…" /></label><label><strong>Natureza do registro</strong><select className="form-control" value={estudoCasoMeta.natureza_registro} onChange={e => setEstudoCasoMeta({ ...estudoCasoMeta, natureza_registro: e.target.value })}><option>Registro documental exclusivo</option><option>Prontuário psicológico</option><option>Prontuário multiprofissional</option></select></label><label><strong>Compartilhamento</strong><select className="form-control" value={estudoCasoMeta.compartilhamento} onChange={e => setEstudoCasoMeta({ ...estudoCasoMeta, compartilhamento: e.target.value })}><option>Acesso restrito ao profissional</option><option>Compartilhável com a pessoa atendida</option><option>Equipe multiprofissional · somente informações necessárias</option></select></label><label><strong>Última revisão</strong><input type="date" className="form-control" value={estudoCasoMeta.ultima_revisao} onChange={e => setEstudoCasoMeta({ ...estudoCasoMeta, ultima_revisao: e.target.value })} /></label></section>
                     <div className="case-study-grid">{estudoCaso.map((topico, index) => <label key={topico.id} className="panel-card card-glass"><strong>{topico.titulo}</strong>{topico.orientacao&&<small>{topico.orientacao}</small>}<textarea className="form-control" value={topico.resposta} placeholder="Registre apenas informações pertinentes à finalidade deste tópico…" onChange={e => setEstudoCaso(atual => atual.map((item, itemIndex) => itemIndex === index ? { ...item, resposta: e.target.value } : item))} /></label>)}</div>
                   </div>
                 )}
 
                </div>
             </section>
           )}
 
           {abaAtiva === 'aba-configuracoes' && (             <section className="tab-panel active reveal-element">               <SettingsHub key={configuracoesSecao} initialSection={configuracoesSecao} plan={plano} />             </section>           )} 
         </main>
 
       </div>
 
       
      {/* BANNER FLUTUANTE DE AVISO DO PERÍODO DE TESTE (ESTILO NOTIFICATION COM 'X') */}
      {trialBannerElegivel && trialBannerVisivel && (
        <aside className="trial-floating-toast" role="status" aria-label="Aviso de período de teste">
          <div className="trial-toast-card">
            <button
              type="button"
              className="trial-toast-close"
              onClick={handleFecharTrialBanner}
              aria-label="Fechar aviso de teste"
              title="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="trial-toast-header">
              <div className="trial-toast-icon">
                <Clock className="w-5 h-5" />
              </div>
              <div className="trial-toast-texts">
                <div className="trial-toast-badge">Período de Teste · Deep Pro</div>
                <h4 className="trial-toast-title">
                  {trialDaysRemaining > 1
                    ? `Você tem ${trialDaysRemaining} dias de teste gratuito`
                    : trialDaysRemaining === 1
                    ? 'Último dia do seu teste gratuito'
                    : 'Seu período de teste encerra hoje'}
                </h4>
                <p className="trial-toast-desc">
                  Recursos do <strong>Plano Pro</strong> liberados (IA clínica, videochamadas, formulários e financeiro).
                </p>
              </div>
            </div>

            <div className="trial-toast-actions">
              <span className="trial-toast-countdown-tag">
                <Hourglass className="w-3.5 h-3.5" />
                <span>Restam <strong>{trialDaysRemaining}</strong> {trialDaysRemaining === 1 ? 'dia' : 'dias'}</span>
              </span>
              <button
                type="button"
                className="trial-toast-cta"
                onClick={() => router.push('/assinatura/checkout?plan=pro')}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Assinar Deep Pro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="trial-toast-progress-track" title={`${trialDaysRemaining} dias restantes (${trialProgressPct}%)`}>
              <div
                className="trial-toast-progress-fill"
                style={{ width: `${Math.max(5, trialProgressPct)}%` }}
              />
            </div>
          </div>
        </aside>
      )}

      {/* TOAST / NOTIFICAÇÃO FLUTUANTE */}       <ProductTour open={tourAberto} onClose={() => setTourAberto(false)} plan={plano} />       <div className={`toast-notification ${toastAtivo ? 'active' : ''}`}>         <Check className="w-5 h-5 text-green-500" />
         <span>{toastMensagem}</span>
       </div>
 
       {modalBloqueioAgendaAtivo && <ModalPortal><div className="modal-overlay" onMouseDown={() => setModalBloqueioAgendaAtivo(false)}><form className="modal-content agenda-appointment-modal" onMouseDown={e => e.stopPropagation()} onSubmit={handleBloquearHorario}><div className="modal-header"><div><span className="eyebrow">Agenda clínica</span><h3>Novo compromisso</h3><p>Adicione uma sessão, avaliação, reunião, supervisão ou bloqueio.</p></div><button type="button" onClick={() => setModalBloqueioAgendaAtivo(false)}><X /></button></div><div className="modal-form-grid"><label>Tipo<select className="form-control" value={bloqueioTipo} onChange={e => setBloqueioTipo(e.target.value)}><option>Sessão</option><option>Avaliação</option><option>Reunião</option><option>Supervisão</option><option>Bloqueio</option></select></label><label>Paciente<select className="form-control" value={bloqueioPaciente} onChange={e => setBloqueioPaciente(e.target.value)}><option value="">Sem paciente vinculado</option>{pacientes.map(paciente => <option key={paciente.id} value={paciente.id}>{paciente.nome}</option>)}</select></label><label className="full">Título<input className="form-control" value={bloqueioNome} onChange={e => setBloqueioNome(e.target.value)} placeholder="Ex.: Sessão de acompanhamento" required /></label><label>Data<input className="form-control" type="date" value={bloqueioData} onChange={e => setBloqueioData(e.target.value)} required /></label><label>Horário<input className="form-control" type="time" value={bloqueioHora} onChange={e => setBloqueioHora(e.target.value)} required /></label><label>Duração<select className="form-control" value={bloqueioDuracao} onChange={e => setBloqueioDuracao(e.target.value)}><option>30min</option><option>50min</option><option>1h</option><option>2h</option></select></label><label>Modalidade<select className="form-control" value={bloqueioModalidade} onChange={e => setBloqueioModalidade(e.target.value)}><option>Presencial</option><option>Online</option><option>Híbrida</option></select></label><label className="full">Observações<textarea className="form-control" value={bloqueioNotas} onChange={e => setBloqueioNotas(e.target.value)} placeholder="Contexto e orientações adicionais..." /></label></div><div className="agenda-modal-actions"><button className="btn-cancel" type="button" onClick={() => setModalBloqueioAgendaAtivo(false)}>Cancelar</button><button className="btn-primary btn-compact" type="submit">Salvar compromisso</button></div></form></div></ModalPortal>}
 
       {documentoVisualizado?.url && <ModalPortal><div className="modal-overlay document-preview-overlay" onMouseDown={() => setDocumentoVisualizado(null)}><section className="document-preview-modal" onMouseDown={event => event.stopPropagation()}><header><div><span className="eyebrow">Documento do paciente</span><h3>{documentoVisualizado.nome}</h3></div><div><a href={documentoVisualizado.url} download><Download /> Baixar</a><button type="button" onClick={() => setDocumentoVisualizado(null)} aria-label="Fechar visualização"><X /></button></div></header><div className="document-preview-stage">{documentoVisualizado.mime_type?.startsWith('image/') ? <img src={documentoVisualizado.url} alt={documentoVisualizado.nome} /> : documentoVisualizado.mime_type === 'application/pdf' || documentoVisualizado.mime_type === 'text/plain' ? <iframe title={`Visualização de ${documentoVisualizado.nome}`} src={documentoVisualizado.url} /> : <div className="patient-empty"><FileText /><strong>Pré-visualização indisponível</strong><a href={documentoVisualizado.url} download>Baixar documento</a></div>}</div></section></div></ModalPortal>}
 
       <PatientRegistrationModal open={modalNovoPacienteAtivo} onClose={() => { setModalNovoPacienteAtivo(false); setEditandoCadastroPaciente(false); }} onCreated={carregarPacientes} patient={editandoCadastroPaciente ? pacienteSelecionado : null} />
 
     </div>
   );
 }
