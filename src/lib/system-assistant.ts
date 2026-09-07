export type SystemAssistantAction = { id: string; label: string; help?: string };

export type SystemAssistantContext = {
  pathname: string;
  title: string;
  activeTab?: string;
  activeSubtab?: string;
  headings: string[];
  actions: SystemAssistantAction[];
  fields: string[];
};

export type SystemAssistantHistoryItem = { role: 'user' | 'assistant'; content: string };

const MAX_TEXT = 500;
const MAX_ACTIONS = 40;
const CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

export type SystemGuide = {
  id: string;
  title: string;
  badge?: string;
  summary: string;
  steps: string[];
  suggestions: string[];
  knowledge: string[];
};

export const SYSTEM_GUIDES: Record<string, SystemGuide> = {
  sessoes: {
    id: 'sessoes',
    title: 'Sessões e Atendimento Online',
    badge: 'Atendimento Clínico',
    summary: 'Aqui você gerencia cada atendimento, registra anotações privadas, redige a evolução do prontuário e realiza chamadas de vídeo com o paciente.',
    steps: [
      '**1. Iniciar nova sessão:** Clique no botão **"Nova sessão"** (ícone de calendário) para abrir o atendimento clínico do paciente.',
      '**2. Anotações salvas automaticamente:** Dentro da sessão, utilize os campos de *"Anotações da sessão"* (privadas) e *"Evolução do prontuário"*. Tudo o que você digita é **salvo automaticamente pelo sistema**.',
      '**3. Chamada de vídeo:** Para atender online, clique no botão **"Chamada de vídeo"** para abrir a sala virtual diretamente no navegador com áudio e vídeo.',
      '**4. Enviar link da chamada ao paciente:**\n  • **Se o paciente tiver WhatsApp cadastrado:** Clique em **"Enviar link"** (ícone do WhatsApp). O sistema abre a conversa direto no WhatsApp com o link da sala pronto na mensagem.\n  • **Se o paciente não tiver WhatsApp:** Clique em **"Copiar link do vídeo"** para copiar a URL da sala e colar onde preferir.',
      '**5. Rascunho com Aura:** Clique em **"Gerar rascunho com Aura"** para que a IA estruture uma síntese da sessão para sua conferência e revisão profissional.',
    ],
    suggestions: [
      'Como funciona a chamada de vídeo?',
      'Como minhas anotações são salvas?',
      'Como enviar o link do vídeo pelo WhatsApp?',
      'Como usar o rascunho da Aura?',
    ],
    knowledge: [
      'O botão de atendimento online foi renomeado para "Chamada de vídeo".',
      'O botão "Copiar link do vídeo" copia o link https://deepsistem.com.br/atendimento/[token] para a área de transferência.',
      'O botão "Enviar link" com ícone do WhatsApp abre o WhatsApp diretamente com a mensagem pronta se o paciente tiver telefone cadastrado.',
      'Todas as anotações e evoluções de sessão são salvas automaticamente pelo sistema conforme o profissional digita.',
      'O rascunho da Aura organiza as notas e transcrições para revisão e validação do profissional.',
    ],
  },

  termos: {
    id: 'termos',
    title: 'Termos do Atendimento e Consentimento',
    badge: 'Documentos Legais',
    summary: 'Envie termos de consentimento, contratos de atendimento e documentos para o paciente ler e aceitar digitalmente.',
    steps: [
      '**1. Gerar o link do termo:** No card do termo desejado, clique no botão **"Gerar link do termo"**.',
      '**2. Botão inteligente com 3 comportamentos:**\n  • **Se o paciente tiver WhatsApp cadastrado:** O botão se transforma automaticamente em **"Enviar link"** (ícone do WhatsApp). Ao clicar, o WhatsApp abre direto com o link e mensagem prontos para envio.\n  • **Se o paciente não tiver WhatsApp:** O botão se transforma em **"Copiar link"**. Clique nele para copiar o endereço do termo para sua área de transferência e colar no e-mail ou onde preferir.',
      '**3. Visualização pelo paciente:** O paciente recebe o link seguro (`/aceitar-termo/[token]`) onde todos os termos já aparecem **100% abertos e legíveis**, sem menus de abrir/fechar, facilitando a leitura e assinatura digital.',
      '**4. Acompanhamento:** Na lista de termos, você confere o status em tempo real com a data, horário e versão aceita.',
    ],
    suggestions: [
      'Como funciona o botão inteligente de gerar link?',
      'O que acontece se o paciente tiver WhatsApp?',
      'Como o paciente visualiza e aceita os termos?',
      'Como adicionar novos termos na biblioteca?',
    ],
    knowledge: [
      'Cada card de termo possui um único botão com 3 comportamentos: Gerar link -> se o paciente tem WhatsApp, vira Enviar link (abre o WhatsApp); se não tem, vira Copiar link.',
      'Na página pública de aceite de termos (/aceitar-termo/[token]), todos os termos ficam abertos por padrão, sem accordion de abrir/fechar.',
      'O aceite fica registrado com data, horário e versão apresentada ao paciente.',
    ],
  },

  pacientes: {
    id: 'pacientes',
    title: 'Gestão de Pacientes e Onboarding',
    badge: 'Consultório',
    summary: 'Acompanhe todos os seus pacientes, filtre por status clínico e acesse os prontuários completos.',
    steps: [
      '**1. Cadastrar paciente:** Clique no botão **"Novo Paciente"** no topo da tela, preencha o nome, WhatsApp, e-mail e dados necessários e clique em Salvar.',
      '**2. Filtro de Ativos e Inativos:** Use as abas **"Ativos"**, **"Inativos"** (pacientes que concluíram ou pausaram o acompanhamento) e **"Todos"** para organizar a lista.',
      '**3. Abrir prontuário:** Clique em **"Prontuário clínico"** (ícone de olho) no card de qualquer paciente para acessar a Central do Paciente completa.',
      '**4. Questionário prévio (Onboarding):** Se o paciente estiver no status "onboarding", clique em **"Copiar Link"** no card dele para enviar o formulário prévio de triagem.',
    ],
    suggestions: [
      'Como cadastrar um novo paciente?',
      'Como inativar ou reativar um paciente?',
      'Onde acesso o prontuário completo?',
      'Como enviar o link de onboarding?',
    ],
    knowledge: [
      'O botão "Novo Paciente" abre o modal de cadastro rápido com validação de CPF, WhatsApp e dados clínicos.',
      'O botão de inativar/reativar permite alternar o status do paciente sem perder qualquer histórico ou prontuário.',
      'A Central do Paciente reúne Identificação, Sessões, Termos, Respostas de Formulário, Reabilitação, Neuroavaliação e Financeiro.',
    ],
  },

  identificacao: {
    id: 'identificacao',
    title: 'Identificação e Prontuário do Paciente',
    badge: 'Ficha do Paciente',
    summary: 'Visualize os dados cadastrais, filiação, histórico de saúde, contatos de emergência e gerencie o prontuário.',
    steps: [
      '**1. Visualizar dados:** Confira contatos de emergência, responsáveis, plano de saúde, profissão e anamnese básica.',
      '**2. Editar cadastro:** Clique no botão **"Editar"** (canto superior direito) para atualizar qualquer informação do paciente.',
      '**3. Inativar ou Reativar:** Use o botão **"Inativar"** quando o paciente concluir o tratamento ou **"Reativar"** a qualquer momento.',
      '**4. Exportar resumo:** Clique em **"Exportar resumo"** para gerar um documento PDF completo e estruturado da ficha clínica.',
    ],
    suggestions: [
      'Como editar as informações do paciente?',
      'Como inativar ou reativar o paciente?',
      'Como exportar o prontuário em PDF?',
      'Como registrar dados de emergência?',
    ],
    knowledge: [
      'A ficha de identificação reúne dados civis, nome social, contatos de emergência, filiação e histórico médico.',
      'O botão Inativar/Reativar altera o status sem excluir nenhum dado clínico.',
      'A exportação em PDF organiza todas as informações para compartilhamento profissional.',
    ],
  },

  respostas_form: {
    id: 'respostas_form',
    title: 'Respostas do Formulário de Triagem',
    badge: 'Anamnese Prévia',
    summary: 'Aqui ficam armazenadas as respostas dos questionários de triagem ou anamnese prévia enviados ao paciente.',
    steps: [
      '**1. Integração automática:** Sempre que um paciente preenche o formulário público pelo link da clínica, as respostas chegam automaticamente nesta aba.',
      '**2. Leitura detalhada:** Clique sobre cada formulário listado para expandir e ler todas as perguntas e respostas enviadas.',
      '**3. Apoio à consulta:** Use as respostas para planejar o primeiro atendimento e integrar as queixas à evolução clínica.',
    ],
    suggestions: [
      'De onde vêm as respostas desta tela?',
      'Como enviar um formulário para o paciente preencher?',
      'Como criar novas perguntas no formulário?',
    ],
    knowledge: [
      'As respostas de formulários são enviadas pelos pacientes através do link público da clínica.',
      'Os dados chegam estruturados com data de envio e vinculados diretamente ao ID do paciente.',
    ],
  },

  agenda: {
    id: 'agenda',
    title: 'Agenda de Atendimentos',
    badge: 'Calendário',
    summary: 'Organize sua grade de horários, marque consultas, acompanhe atendimentos e gerencie bloqueios de rotina.',
    steps: [
      '**1. Visualizar compromissos:** Acompanhe as consultas marcadas por dia ou semana.',
      '**2. Novo agendamento:** Clique em um horário livre na grade para marcar uma consulta e selecionar o paciente.',
      '**3. Bloquear horários:** Crie bloqueios para compromissos particulares, pausas ou férias, impedindo agendamentos indesejados.',
      '**4. Configurar horários de trabalho:** Para definir seus dias de atendimento, intervalos e duração padrão, acesse **Configurações > Agenda**.',
    ],
    suggestions: [
      'Como criar um novo agendamento?',
      'Como bloquear um horário na agenda?',
      'Como configurar os dias e horários de atendimento?',
      'Como ver os atendimentos de hoje?',
    ],
    knowledge: [
      'A agenda organiza compromissos, bloqueios e solicitações de atendimento online.',
      'A disponibilidade pública do profissional é configurada em Configurações > Agenda.',
    ],
  },

  financeiro: {
    id: 'financeiro',
    title: 'Controle Financeiro e Cobranças',
    badge: 'Recebimentos',
    summary: 'Gerencie pagamentos de consultas e pacotes, emita cobranças por PIX ou cartão e acompanhe baixas automáticas.',
    steps: [
      '**1. Novo lançamento:** Clique em **"Novo lançamento"**, defina a descrição (ex: Consulta avulsa, Pacote mensal), o valor e a data de vencimento.',
      '**2. Gerar link de pagamento:** Clique em **"Gerar link"** para criar uma cobrança segura via Mercado Pago (PIX ou cartão).',
      '**3. Enviar ao paciente:** Copie o link ou envie diretamente para o WhatsApp do paciente.',
      '**4. Baixa automática:** Assim que o paciente realizar o pagamento, o status atualiza automaticamente para **"Pago"**.',
    ],
    suggestions: [
      'Como gerar um link de pagamento?',
      'Como enviar a cobrança por WhatsApp?',
      'Como funciona a baixa automática do pagamento?',
      'Onde configuro minha chave do Mercado Pago?',
    ],
    knowledge: [
      'O financeiro do paciente registra consultas e cobranças individuais.',
      'O link de pagamento usa Mercado Pago com confirmação via webhook.',
      'A baixa é automática após a aprovação da transação.',
    ],
  },

  formularios: {
    id: 'formularios',
    title: 'Criador de Formulários e Triagem',
    badge: 'Formulários',
    summary: 'Crie questionários personalizados para captação de pacientes, triagem e anamnese preliminar.',
    steps: [
      '**1. Criar perguntas:** Adicione campos de texto livre, múltipla escolha, escalas numéricas ou dados cadastrais.',
      '**2. Personalizar o formulário:** Defina o título, introdução explicativa e quais perguntas são obrigatórias.',
      '**3. Compartilhar link:** Copie o link público do formulário e envie aos pacientes pelo WhatsApp, e-mail ou redes sociais.',
      '**4. Respostas automáticas:** As respostas enviadas entram diretamente no prontuário do paciente na aba *"Respostas do Formulário"*.',
    ],
    suggestions: [
      'Como criar um formulário de triagem?',
      'Como compartilhar o link do formulário com o paciente?',
      'Onde vejo as respostas preenchidas?',
    ],
    knowledge: [
      'O form-builder permite criar campos personalizados para triagem.',
      'As respostas ficam salvas no prontuário do paciente correspondente.',
    ],
  },

  neuroavaliacao: {
    id: 'neuroavaliacao',
    title: 'Neuroavaliação e Avaliação PSI',
    badge: 'Avaliação Cognitiva',
    summary: 'Estruture avaliações neuropsicológicas completas, testes aplicados, raciocínio diagnóstico e elaboração de laudos.',
    steps: [
      '**1. Instrumentos e Testes:** Registre os instrumentos aplicados com suas pontuações brutas, percentis e observações.',
      '**2. Anamnese e Hipóteses:** Descreva o histórico de desenvolvimento, queixa principal e formule o raciocínio diagnóstico.',
      '**3. Síntese com Aura:** Use o botão da **Aura** para apoiar na redação da síntese dos resultados e gerar o rascunho do laudo.',
      '**4. Laudo e Devolutiva:** Revise o laudo profissionalmente, ajuste as recomendações e exporte o relatório em PDF.',
    ],
    suggestions: [
      'Como registrar os testes aplicados?',
      'Como usar a Aura para rascunhar o laudo?',
      'Como exportar o laudo completo em PDF?',
      'Como estruturar a devolutiva?',
    ],
    knowledge: [
      'A aba de neuroavaliação organiza instrumentos, hipóteses diagnósticas e laudos.',
      'A Aura gera rascunhos clínicos para revisão e validação do profissional responsável.',
    ],
  },

  reabilitacao: {
    id: 'reabilitacao',
    title: 'Plano de Reabilitação Cognitiva',
    badge: 'Reabilitação',
    summary: 'Cadastre metas SMART, baseline funcional, estratégias de estimulação e acompanhe os indicadores de progresso.',
    steps: [
      '**1. Linha de base (Baseline):** Registre o nível funcional atual do paciente e as áreas a serem estimuladas.',
      '**2. Metas SMART:** Cadastre metas específicas, mensuráveis, atingíveis, relevantes e temporais.',
      '**3. Estratégias e Indicadores:** Registre as intervenções utilizadas e marque o progresso dos indicadores a cada atendimento.',
      '**4. Revisão periódica:** Estabeleça datas para revisar o plano com a família ou rede de apoio.',
    ],
    suggestions: [
      'Como cadastrar uma meta SMART?',
      'O que registrar na linha de base?',
      'Como acompanhar os indicadores de progresso?',
    ],
    knowledge: [
      'A reabilitação cognitiva organiza baseline, metas SMART e estratégias de intervenção.',
      'O profissional pode usar a Aura para sugerir adaptações no plano com base na evolução.',
    ],
  },

  painel: {
    id: 'painel',
    title: 'Painel Geral do Consultório',
    badge: 'Visão Geral',
    summary: 'Acompanhe a visão geral da sua clínica com indicadores do dia, pacientes em atendimento e atalhos rápidos.',
    steps: [
      '**1. Indicadores em tempo real:** Acompanhe o total de pacientes ativos, atendimentos marcados para hoje e previsão financeira.',
      '**2. Atalho Novo Paciente:** Clique no botão **"Novo paciente"** no topo para abrir o formulário de cadastro rápido.',
      '**3. Atalhos rápidos:** Use os cards centrais para navegar direto para **Agenda**, **Pacientes**, **Sessões** ou **Financeiro** com um único clique.',
    ],
    suggestions: [
      'O que posso fazer no Painel Geral?',
      'Como cadastrar meu primeiro paciente?',
      'Onde vejo os atendimentos agendados para hoje?',
    ],
    knowledge: [
      'O painel geral resume métricas essenciais do consultório.',
      'Os atalhos levam para os principais módulos operacionais do DeePsistem.',
    ],
  },

  configuracoes: {
    id: 'configuracoes',
    title: 'Configurações do Consultório',
    badge: 'Ajustes e Conta',
    summary: 'Personalize seu perfil profissional, página pública, agenda, logotipo, cores, segurança e plano.',
    steps: [
      '**1. Meu Perfil:** Atualize seu nome, registro profissional (CRP/CRM), contatos e assinatura digital para documentos.',
      '**2. Minha Página:** Personalize sua página pública de apresentação para novos pacientes.',
      '**3. Agenda:** Defina seus dias de atendimento, horários de início/fim e duração padrão das sessões.',
      '**4. Personalização (White-label):** Insira o logotipo da sua clínica e escolha as cores do sistema.',
      '**5. Segurança:** Altere sua senha e ative a Autenticação Multifator (MFA) para proteger os prontuários.',
    ],
    suggestions: [
      'Como alterar os horários da minha agenda?',
      'Como personalizar o logotipo e as cores do sistema?',
      'Como ativar a autenticação em duas etapas?',
      'Como cadastrar minha assinatura para documentos?',
    ],
    knowledge: [
      'Configurações reúne Meu Perfil, Minha Página, Agenda, Atendimento e IA, Personalização, Segurança e Assinatura.',
      'A preferência de ocultar o botão de ajuda fica em Configurações > Segurança.',
    ],
  },

  admin: {
    id: 'admin',
    title: 'Painel Master DeePsistem',
    badge: 'Administração',
    summary: 'Administração geral da plataforma, consultórios cadastrados, planos, cobranças e parâmetros do sistema.',
    steps: [
      '**1. Gestão de Profissionais:** Monitore todos os consultórios cadastrados e acompanhe o status de cada conta.',
      '**2. Planos e Assinaturas:** Acompanhe assinaturas ativas, pagamentos e liberação de planos (Start e Pro).',
      '**3. Chaves e Gateways:** Configure chaves de API do Mercado Pago, Resend e modelos de Inteligência Artificial.',
    ],
    suggestions: [
      'Como visualizar profissionais cadastrados?',
      'Como gerenciar planos e assinaturas?',
      'Como configurar credenciais da plataforma?',
    ],
    knowledge: [
      'O painel master administra profissionais, planos, cobrança da plataforma e chaves do sistema.',
    ],
  },
};

function clean(value: unknown, limit = MAX_TEXT) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit) : '';
}

export function sanitizeSystemAssistantContext(input: unknown): SystemAssistantContext {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const actions = Array.isArray(source.actions) ? source.actions.slice(0, MAX_ACTIONS).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const action = item as Record<string, unknown>;
    const id = clean(action.id, 100).replace(/[^a-zA-Z0-9:_-]/g, '');
    const label = clean(action.label, 160);
    return id && label ? [{ id, label, help: clean(action.help, 240) || undefined }] : [];
  }) : [];
  return {
    pathname: clean(source.pathname, 180) || '/dashboard',
    title: clean(source.title, 180),
    activeTab: clean(source.activeTab, 80),
    activeSubtab: clean(source.activeSubtab, 80),
    headings: Array.isArray(source.headings) ? source.headings.slice(0, 10).map(item => clean(item, 160)).filter(Boolean) : [],
    actions,
    fields: Array.isArray(source.fields) ? source.fields.slice(0, 30).map(item => clean(item, 120)).filter(Boolean) : [],
  };
}

export function guideFor(context: SystemAssistantContext): SystemGuide {
  // 1. Check active subtab inside patient management
  if (context.activeSubtab) {
    if (context.activeSubtab === 'evolucao') return SYSTEM_GUIDES.sessoes;
    if (context.activeSubtab === 'termos-paciente') return SYSTEM_GUIDES.termos;
    if (context.activeSubtab === 'respostas-form') return SYSTEM_GUIDES.respostas_form;
    if (context.activeSubtab === 'financeiro') return SYSTEM_GUIDES.financeiro;
    if (context.activeSubtab === 'neuroavaliacao' || context.activeSubtab === 'avaliacoes') return SYSTEM_GUIDES.neuroavaliacao;
    if (context.activeSubtab === 'reabilitacao') return SYSTEM_GUIDES.reabilitacao;
    if (context.activeSubtab === 'resumo' || context.activeSubtab === 'medicacoes' || context.activeSubtab === 'estudo-caso-formula' || context.activeSubtab === 'documentos') return SYSTEM_GUIDES.identificacao;
  }

  // 2. Check active main tab in dashboard
  if (context.activeTab) {
    if (context.activeTab === 'aba-termos') return SYSTEM_GUIDES.termos;
    if (context.activeTab === 'aba-pacientes') return SYSTEM_GUIDES.pacientes;
    if (context.activeTab === 'aba-agenda') return SYSTEM_GUIDES.agenda;
    if (context.activeTab === 'aba-financeiro') return SYSTEM_GUIDES.financeiro;
    if (context.activeTab === 'aba-form') return SYSTEM_GUIDES.formularios;
    if (context.activeTab === 'aba-configuracoes') return SYSTEM_GUIDES.configuracoes;
    if (context.activeTab === 'aba-painel') return SYSTEM_GUIDES.painel;
    if (context.activeTab === 'aba-gestao-paciente') return SYSTEM_GUIDES.identificacao;
  }

  // 3. Fallback by URL pathname
  if (context.pathname.startsWith('/admin')) return SYSTEM_GUIDES.admin;
  if (context.pathname.includes('/atendimento')) return SYSTEM_GUIDES.sessoes;
  if (context.pathname.includes('/agendar') || context.pathname.includes('/agenda')) return SYSTEM_GUIDES.agenda;
  if (context.pathname.includes('/aceitar-termo') || context.pathname.includes('/termos')) return SYSTEM_GUIDES.termos;
  if (context.pathname.includes('/form')) return SYSTEM_GUIDES.formularios;

  // 4. Default to general dashboard guide
  return SYSTEM_GUIDES.painel;
}

export function formatGuideMessage(guide: SystemGuide, professionalName?: string): string {
  const greeting = professionalName ? `Olá, **${professionalName}**!` : 'Olá!';
  return `${greeting} Aqui está o passo a passo didático de como usar a tela de **${guide.title}**:\n\n${guide.summary}\n\n👉 **Passo a passo:**\n${guide.steps.join('\n\n')}`;
}

export function localSystemAssistantAnswer(context: SystemAssistantContext, question: string) {
  const guide = guideFor(context);
  const normalized = question.toLocaleLowerCase('pt-BR');
  let target: string | undefined;

  // Respostas específicas ultra-didáticas por tema
  if (normalized.includes('ocultar') && normalized.includes('ajuda')) {
    return {
      answer: '👉 **Como ocultar ou reexibir o botão de ajuda:**\n1. Abra o menu lateral e clique em **Configurações**.\n2. Selecione a opção **Segurança**.\n3. Localize o interruptor **"Exibir botão de ajuda"** e desative-o.\n4. Para exibir novamente, basta voltar a esse mesmo local a qualquer momento.',
      suggestions: guide.suggestions,
    };
  }

  if (normalized.includes('sess') || normalized.includes('vídeo') || normalized.includes('video') || normalized.includes('chamada') || normalized.includes('anota')) {
    const action = context.actions.find(item => /sess|video|atendimento/i.test(`${item.id} ${item.label}`));
    target = action?.id;
    return {
      answer: `👉 **Passo a passo das Sessões e Chamada de Vídeo:**\n\n` +
        `1. **Criar sessão:** Clique no botão **"Nova sessão"** para iniciar o atendimento.\n\n` +
        `2. **Anotações salvas automaticamente:** Dentro da sessão, você tem o campo de anotações privadas e evolução clínica. Tudo o que você digita é **salvo automaticamente pelo sistema**, sem risco de perder nada!\n\n` +
        `3. **Iniciar a chamada:** Clique no botão **"Chamada de vídeo"** para entrar na sala virtual com áudio e vídeo.\n\n` +
        `4. **Compartilhar o link com o paciente:**\n` +
        `  • **Se o paciente tiver WhatsApp cadastrado:** Clique em **"Enviar link"** (ícone WhatsApp) para abrir a conversa já com a mensagem e o link pronto.\n` +
        `  • **Se o paciente não tiver WhatsApp:** Clique em **"Copiar link do vídeo"** para copiar e colar no e-mail ou onde preferir.\n\n` +
        `5. **Rascunho com Aura:** Clique em **"Gerar rascunho com Aura"** para que a IA estruture as anotações da sessão para sua revisão.`,
      target,
      suggestions: SYSTEM_GUIDES.sessoes.suggestions,
    };
  }

  if (normalized.includes('termo') || normalized.includes('aceite') || normalized.includes('consentimento')) {
    const action = context.actions.find(item => /termo|aceite/i.test(`${item.id} ${item.label}`));
    target = action?.id;
    return {
      answer: `👉 **Passo a passo dos Termos de Atendimento:**\n\n` +
        `1. **Gerar o link:** No card do termo desejado, clique no botão **"Gerar link do termo"**.\n\n` +
        `2. **Botão inteligente com 3 comportamentos:**\n` +
        `  • **Se o paciente tiver WhatsApp cadastrado:** O botão se transforma automaticamente em **"Enviar link"** (com ícone do WhatsApp). Ao clicar, o WhatsApp abre direto com a mensagem e o link do termo pronto para envio ao cliente.\n` +
        `  • **Se o paciente não tiver WhatsApp:** O botão se transforma em **"Copiar link"**. Você clica para copiar o endereço e depois pode colar no e-mail ou WhatsApp manualmente para enviar.\n\n` +
        `3. **Página pública de aceite:** Quando o paciente abre o link, todos os termos já aparecem **100% abertos e legíveis**, sem precisar abrir ou fechar abas.\n\n` +
        `4. **Confirmação do aceite:** Assim que o paciente assina digitalmente, o status do termo atualiza para **Aceito** com data e hora.`,
      target,
      suggestions: SYSTEM_GUIDES.termos.suggestions,
    };
  }

  if (normalized.includes('paciente') || normalized.includes('inativ') || normalized.includes('reativ') || normalized.includes('cadastr')) {
    const action = context.actions.find(item => /paciente|cliente|pessoa/i.test(`${item.id} ${item.label}`));
    target = action?.id;
    return {
      answer: `👉 **Passo a passo da Gestão de Pacientes:**\n\n` +
        `1. **Cadastrar nova pessoa:** Clique no botão **"Novo Paciente"** no topo da tela, preencha os dados e clique em Salvar.\n\n` +
        `2. **Filtrar por status:** Acima da lista de pacientes, você pode alternar entre **Ativos**, **Inativos** e **Todos**.\n\n` +
        `3. **Inativar ou Reativar:** Dentro da ficha do paciente, use o botão **"Inativar"** quando o acompanhamento pausar ou encerrar, e **"Reativar"** quando o paciente retornar.\n\n` +
        `4. **Acessar o prontuário:** Clique em **"Prontuário clínico"** no card do paciente para abrir todas as abas clínicas.`,
      target,
      suggestions: SYSTEM_GUIDES.pacientes.suggestions,
    };
  }

  if (normalized.includes('agenda') || normalized.includes('horário') || normalized.includes('bloque') || normalized.includes('marcar')) {
    const action = context.actions.find(item => /agenda|calend/i.test(`${item.id} ${item.label}`));
    target = action?.id;
    return {
      answer: `👉 **Passo a passo da Agenda:**\n\n` +
        `1. **Visualizar horários:** Navegue pela grade diária ou semanal para conferir seus atendimentos.\n\n` +
        `2. **Marcar consulta:** Clique diretamente em um horário vago na grade para vincular o paciente, data e duração.\n\n` +
        `3. **Bloquear horários:** Use o botão de bloqueio para reservar momentos de almoço, folga ou compromissos pessoais.\n\n` +
        `4. **Configurar horários:** Em **Configurações > Agenda**, defina seus dias da semana de atendimento e intervalos entre consultas.`,
      target,
      suggestions: SYSTEM_GUIDES.agenda.suggestions,
    };
  }

  if (normalized.includes('pagamento') || normalized.includes('financeiro') || normalized.includes('cobrança') || normalized.includes('pix')) {
    const action = context.actions.find(item => /finance|pagamento|cobran|link/i.test(`${item.id} ${item.label}`));
    target = action?.id;
    return {
      answer: `👉 **Passo a passo do Financeiro:**\n\n` +
        `1. **Criar lançamento:** Clique em **"Novo lançamento"**, defina o valor, descrição (ex: Sessão avulsa) e vencimento.\n\n` +
        `2. **Gerar link:** Clique em **"Gerar link"** para criar uma cobrança segura via Mercado Pago (PIX ou cartão).\n\n` +
        `3. **Enviar ao paciente:** Copie o link ou envie direto pelo WhatsApp para o paciente pagar com segurança.\n\n` +
        `4. **Baixa automática:** Quando o pagamento for aprovado, o sistema dá baixa automática alterando o status para **"Pago"**.`,
      target,
      suggestions: SYSTEM_GUIDES.financeiro.suggestions,
    };
  }

  // Resposta padrão usando o guia da tela atual
  return {
    answer: formatGuideMessage(guide),
    target,
    suggestions: guide.suggestions,
  };
}

function compactContext(context: SystemAssistantContext) {
  return JSON.stringify({
    rota: context.pathname,
    tela: context.title,
    abaAtiva: context.activeTab,
    subAbaGestao: context.activeSubtab,
    titulos: context.headings,
    acoes: context.actions,
    campos: context.fields,
  }).slice(0, 7000);
}

export async function generateSystemAssistantAnswer(input: { question: string; context: SystemAssistantContext; history: SystemAssistantHistoryItem[] }) {
  const fallback = localSystemAssistantAnswer(input.context, input.question);
  const guide = guideFor(input.context);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ...fallback, model: 'local-help' };
  const model = process.env.OPENAI_ASSISTANT_MODEL || process.env.OPENAI_AURA_MODEL || 'gpt-4o-mini';

  const system = `Você é o Assistente de Uso e Suporte do DeePsistem.
O usuário exige respostas EXTREMAMENTE DIDÁTICAS, passo a passo, pedagógicas e fáceis de entender, como se estivesse explicando para alguém que está usando o sistema pela primeira vez.

DIRETRIZES FUNDAMENTAIS DE DIDÁTICA:
1. Comece com uma introdução acolhedora e direta sobre o objetivo da tela ou funcionalidade.
2. Apresente um passo a passo numerado (1., 2., 3...) com títulos em negrito, explicando exatamente ONDE CLICAR, QUAL BOTÃO USAR e O QUE O SISTEMA FAZ AUTOMATICAMENTE.
3. Se o assunto for SESSÕES / ATENDIMENTO ONLINE:
   - Explique o botão "Nova sessão".
   - Destaque que as anotações privadas e evoluções são SALVAS AUTOMATICAMENTE pelo sistema conforme digita.
   - Explique o botão "Chamada de vídeo".
   - Explique o botão "Copiar link do vídeo" e o botão "Enviar link" com ícone do WhatsApp que abre diretamente a conversa com o paciente.
4. Se o assunto for TERMOS DO ATENDIMENTO:
   - Explique o botão único e seus 3 comportamentos: clique em "Gerar link do termo". Se o paciente tiver WhatsApp cadastrado, o botão se transforma em "Enviar link" e abre o WhatsApp com a mensagem pronta. Se o paciente não tiver WhatsApp, o botão se transforma em "Copiar link" para copiar e colar no e-mail ou mensagens.
   - Mencione que na página pública de aceite todos os termos já aparecem 100% abertos e legíveis.
5. Se o assunto for PACIENTES:
   - Explique o botão "Novo Paciente", os filtros de "Ativos" / "Inativos" e como acessar o prontuário.
6. Se o assunto for FINANCEIRO:
   - Explique como criar o lançamento, gerar link de pagamento (PIX/cartão), enviar por WhatsApp e a baixa automática.
7. Use sempre português do Brasil, tom amigável, formatação limpa e organizada.
Retorne SEMPRE um JSON válido no formato: {"answer":"...", "target":"id-da-acao-ou-vazio", "suggestions":["sugestao1", "sugestao2", "sugestao3"]}`;

  const prompt = `Dúvida do usuário: ${clean(input.question, 1200)}
Guia didático da tela atual (${guide.title}): ${guide.summary}
Passos recomendados da tela:
${guide.steps.join('\n')}
Base de conhecimento complementar: ${guide.knowledge.join(' ')}
Contexto do sistema: ${compactContext(input.context)}
Histórico recente da conversa: ${JSON.stringify(input.history.slice(-6).map(item => ({ role: item.role, content: clean(item.content, 500) })))}
Se o usuário perguntar algo geral, use como referência inicial a orientação didática local:
${fallback.answer}`;

  try {
    const response = await fetch(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        max_tokens: 750,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ]
      }),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
    if (!response.ok) throw new Error(data?.error?.message || 'O assistente não conseguiu responder agora.');
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}') as { answer?: unknown; target?: unknown; suggestions?: unknown };
    const answer = clean(parsed.answer, 5000);
    const target = clean(parsed.target, 100).replace(/[^a-zA-Z0-9:_-]/g, '');
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 4).map(item => clean(item, 160)).filter(Boolean) : fallback.suggestions;
    if (!answer) throw new Error('Resposta vazia.');
    return { answer, target: input.context.actions.some(item => item.id === target) ? target : undefined, suggestions, model };
  } catch (error) {
    console.warn('[system-assistant] fallback local didático:', error instanceof Error ? error.message : error);
    return { ...fallback, model: 'local-help' };
  }
}
