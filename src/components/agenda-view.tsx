'use client';

import React, { useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  Sliders, 
  User, 
  Video, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Eye,
  ArrowRight
} from 'lucide-react';

export type BloqueioAgenda = {
  id: string;
  nome: string;
  data: string; // "YYYY-MM-DD"
  hora: string; // "HH:MM"
  duracao: string; // "50min", "1h"
  recorrencia?: string;
  cor?: string;
  notes?: string;
  tipo?: string;
  modalidade?: string; // "Presencial", "Online"
  paciente_id?: string;
  status?: string;
};

type Paciente = {
  id: string;
  nome: string;
  email?: string;
  status?: string;
};

interface AgendaViewProps {
  bloqueiosAgenda: BloqueioAgenda[];
  pacientes: Paciente[];
  onAbrirFichaPaciente: (pacienteOuNome: any) => void;
  onNovoCompromisso: (dataPrefixo?: string, horaPrefixo?: string) => void;
  agendaPeriodoVista: 'dia' | 'semana' | 'mes';
  setAgendaPeriodoVista: (vista: 'dia' | 'semana' | 'mes') => void;
  agendaPeriodoOffset: number;
  setAgendaPeriodoOffset: React.Dispatch<React.SetStateAction<number>>;
  buscaQuery?: string;
  onBuscaQueryChange?: (query: string) => void;
}

export function AgendaView({
  bloqueiosAgenda,
  pacientes,
  onAbrirFichaPaciente,
  onNovoCompromisso,
  agendaPeriodoVista,
  setAgendaPeriodoVista,
  agendaPeriodoOffset,
  setAgendaPeriodoOffset,
  buscaQuery = '',
  onBuscaQueryChange
}: AgendaViewProps) {

  // Data hoje no meio-dia para evitar problemas de fuso
  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const hojeISO = hoje.toISOString().slice(0, 10);

  // Data base calculada a partir do offset e da vista atual
  const dataBase = useMemo(() => {
    const d = new Date(hoje);
    if (agendaPeriodoVista === 'dia') {
      d.setDate(d.getDate() + agendaPeriodoOffset);
    } else if (agendaPeriodoVista === 'semana') {
      d.setDate(d.getDate() + agendaPeriodoOffset * 7);
    } else if (agendaPeriodoVista === 'mes') {
      d.setMonth(d.getMonth() + agendaPeriodoOffset);
    }
    return d;
  }, [hoje, agendaPeriodoVista, agendaPeriodoOffset]);

  // Título e intervalo do período ativo
  const { tituloPeriodo, dataInicio, dataFim, diasSemana, diasMesGrid } = useMemo(() => {
    if (agendaPeriodoVista === 'dia') {
      const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dataBase);
      const diaMesAno = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(dataBase);
      const titulo = `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, ${diaMesAno}`;
      return {
        tituloPeriodo: titulo,
        dataInicio: new Date(dataBase),
        dataFim: new Date(dataBase),
        diasSemana: [new Date(dataBase)],
        diasMesGrid: []
      };
    }

    if (agendaPeriodoVista === 'semana') {
      // Inicia na segunda-feira
      const day = dataBase.getDay();
      const diffSeg = day === 0 ? -6 : 1 - day;
      const seg = new Date(dataBase);
      seg.setDate(dataBase.getDate() + diffSeg);

      const dias: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const item = new Date(seg);
        item.setDate(seg.getDate() + i);
        dias.push(item);
      }

      const dom = dias[6];
      const inicioFormatado = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(seg).replace('.', '');
      const fimFormatado = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(dom).replace('.', '');
      const titulo = `${inicioFormatado} – ${fimFormatado}`;

      return {
        tituloPeriodo: titulo,
        dataInicio: seg,
        dataFim: dom,
        diasSemana: dias,
        diasMesGrid: []
      };
    }

    // Mês
    const ano = dataBase.getFullYear();
    const mes = dataBase.getMonth();
    const primeiroDiaMes = new Date(ano, mes, 1, 12);
    const ultimoDiaMes = new Date(ano, mes + 1, 0, 12);

    const mesNome = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataBase);
    const titulo = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);

    // Grade mensal completa com padding de domingo a sábado
    const grid: { date: Date; isCurrentMonth: boolean; iso: string }[] = [];
    const diaSemanaPrimeiro = primeiroDiaMes.getDay(); // 0 = Dom, 1 = Seg...
    
    // Dias do mês anterior
    for (let i = diaSemanaPrimeiro; i > 0; i--) {
      const prev = new Date(ano, mes, 1 - i, 12);
      grid.push({ date: prev, isCurrentMonth: false, iso: prev.toISOString().slice(0, 10) });
    }

    // Dias do mês atual
    for (let i = 1; i <= ultimoDiaMes.getDate(); i++) {
      const curr = new Date(ano, mes, i, 12);
      grid.push({ date: curr, isCurrentMonth: true, iso: curr.toISOString().slice(0, 10) });
    }

    // Completar até fechar semanas cheias (múltiplo de 7)
    while (grid.length % 7 !== 0) {
      const nextDayNum = grid.length - (diaSemanaPrimeiro + ultimoDiaMes.getDate()) + 1;
      const next = new Date(ano, mes + 1, nextDayNum, 12);
      grid.push({ date: next, isCurrentMonth: false, iso: next.toISOString().slice(0, 10) });
    }

    return {
      tituloPeriodo: titulo,
      dataInicio: primeiroDiaMes,
      dataFim: ultimoDiaMes,
      diasSemana: [],
      diasMesGrid: grid
    };
  }, [agendaPeriodoVista, dataBase]);

  // Compromissos combinados e filtrados pela busca
  const compromissosDisponiveis = useMemo(() => {
    const baseLista = bloqueiosAgenda;
    if (!buscaQuery) return baseLista;
    const q = buscaQuery.toLowerCase();
    return baseLista.filter(c => 
      c.nome.toLowerCase().includes(q) || 
      (c.tipo && c.tipo.toLowerCase().includes(q)) || 
      (c.modalidade && c.modalidade.toLowerCase().includes(q))
    );
  }, [bloqueiosAgenda, buscaQuery]);

  // Função para pegar compromissos de uma data ISO específica
  const getCompromissosData = (dataISO: string) => {
    return compromissosDisponiveis.filter(c => c.data === dataISO).sort((a, b) => a.hora.localeCompare(b.hora));
  };

  // Horários de atendimento para a visão do dia
  const slotsHorarios = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', 
    '18:00', '19:00', '20:00'
  ];

  return (
    <div className="space-y-6">
      
      {/* =========================================================
          BARRA DE CONTEXTO E NAVEGAÇÃO DE PERÍODO (Dia / Semana / Mês)
          ========================================================= */}
      <div className="tail-card p-3.5 sm:p-4 md:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border border-slate-200">
        
        {/* Controles de Navegação: < Hoje > e Título do Período */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 sm:p-1 border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setAgendaPeriodoOffset(prev => prev - 1)}
              title="Período anterior"
              className="p-1.5 sm:p-2 hover:bg-white hover:text-[#09A4B3] rounded-lg transition-colors text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setAgendaPeriodoOffset(0)}
              className="px-2.5 sm:px-3 py-1 text-xs font-bold text-slate-700 hover:text-[#09A4B3] hover:bg-white rounded-lg transition-colors"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setAgendaPeriodoOffset(prev => prev + 1)}
              title="Próximo período"
              className="p-1.5 sm:p-2 hover:bg-white hover:text-[#09A4B3] rounded-lg transition-colors text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="pl-1 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#09A4B3] block truncate">
              {agendaPeriodoVista === 'dia' ? 'Visão Diária' : agendaPeriodoVista === 'semana' ? 'Visão Semanal' : 'Visão Mensal'}
            </span>
            <strong className="text-sm sm:text-base md:text-lg font-bold text-slate-900 leading-tight block truncate">
              {tituloPeriodo}
            </strong>
          </div>
        </div>

        {/* Abas Alternadoras: Dia | Semana | Mês e Novo Compromisso */}
        <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end flex-wrap">
          <div className="inline-flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200">
            {(['dia', 'semana', 'mes'] as const).map(tipo => {
              const label = tipo === 'dia' ? 'Dia' : tipo === 'semana' ? 'Semana' : 'Mês';
              const ativo = agendaPeriodoVista === tipo;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => {
                    setAgendaPeriodoVista(tipo);
                    setAgendaPeriodoOffset(0);
                  }}
                  className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    ativo
                      ? 'bg-white text-[#09A4B3] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onNovoCompromisso()}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-[#09A4B3] hover:bg-[#02778E] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span>Novo compromisso</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          1. VISUALIZAÇÃO DO DIA (Aparece ao clicar em "Dia")
          ========================================================= */}
      {agendaPeriodoVista === 'dia' && (
        <div className="tail-card p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#09A4B3]/10 text-[#09A4B3] flex items-center justify-center font-bold text-lg">
                {dataBase.getDate()}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dataBase)}
                </h3>
                <p className="text-xs text-slate-500">
                  {getCompromissosData(dataBase.toISOString().slice(0, 10)).length} compromisso(s) agendado(s) para este dia
                </p>
              </div>
            </div>
            {dataBase.toISOString().slice(0, 10) === hojeISO && (
              <span className="tail-badge tail-badge-cyan">Hoje</span>
            )}
          </div>

          {/* Grade de Horários do Dia */}
          <div className="space-y-3">
            {slotsHorarios.map(hora => {
              const dataISO = dataBase.toISOString().slice(0, 10);
              const compromissosNoHorario = compromissosDisponiveis.filter(
                c => c.data === dataISO && c.hora.startsWith(hora.slice(0, 2))
              );

              return (
                <div 
                  key={hora} 
                  className="flex items-start gap-4 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors bg-white"
                >
                  {/* Horário */}
                  <div className="w-16 flex-shrink-0 pt-1 text-xs font-bold text-slate-500 font-mono">
                    {hora}
                  </div>

                  {/* Conteúdo do Horário */}
                  <div className="flex-1">
                    {compromissosNoHorario.length > 0 ? (
                      <div className="space-y-2">
                        {compromissosNoHorario.map(comp => (
                          <div 
                            key={comp.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-[#09A4B3] transition-all cursor-pointer group"
                            onClick={() => onAbrirFichaPaciente(comp.paciente_id ? (pacientes.find(p => p.id === comp.paciente_id) || comp.nome) : comp.nome)}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#09A4B3]/10 text-[#09A4B3]">
                                  {comp.tipo || 'Sessão'}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-700">
                                  {comp.hora} ({comp.duracao || '50min'})
                                </span>
                                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                  {comp.modalidade === 'Online' ? <Video className="w-3.5 h-3.5 text-indigo-500" /> : <MapPin className="w-3.5 h-3.5 text-emerald-500" />}
                                  {comp.modalidade || 'Presencial'}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#09A4B3] transition-colors">
                                {comp.nome}
                              </h4>
                              {comp.notes && (
                                <p className="text-xs text-slate-500 line-clamp-1">{comp.notes}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs font-semibold text-[#09A4B3] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              <span>Abrir ficha</span>
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNovoCompromisso(dataISO, hora)}
                        className="w-full text-left py-2 px-3 text-xs text-slate-400 hover:text-[#09A4B3] hover:bg-slate-50 rounded-lg border border-dashed border-transparent hover:border-slate-200 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Horário livre · Agendar compromisso</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          2. VISUALIZAÇÃO DA SEMANA (Aparece ao clicar em "Semana")
          ========================================================= */}
      {/* =========================================================
          2. VISUALIZAÇÃO DA SEMANA (Aparece ao clicar em "Semana")
          ========================================================= */}
      {agendaPeriodoVista === 'semana' && (
        <div className="tail-card p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Grade da Semana</h3>
              <p className="text-xs text-slate-500">
                Visualização contínua de Segunda a Domingo com todos os atendimentos
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
              {diasSemana.reduce((total, d) => total + getCompromissosData(d.toISOString().slice(0, 10)).length, 0)} compromissos na semana
            </span>
          </div>

          {/* Grid de 7 Colunas com rolagem horizontal suave no mobile */}
          <div className="overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
            <div className="grid grid-cols-7 gap-2.5 sm:gap-3 min-w-[700px] md:min-w-0">
              {diasSemana.map(dia => {
                const diaISO = dia.toISOString().slice(0, 10);
                const ehHoje = diaISO === hojeISO;
                const compromissos = getCompromissosData(diaISO);

                const diaNomeAbrev = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(dia).replace('.', '');
                const diaNumero = dia.getDate();

                return (
                  <div 
                    key={diaISO} 
                    className={`flex flex-col rounded-2xl border transition-all min-h-[360px] sm:min-h-[380px] bg-slate-50/50 ${
                      ehHoje ? 'border-[#09A4B3] ring-1 ring-[#09A4B3]/30 bg-[#09A4B3]/5' : 'border-slate-200'
                    }`}
                  >
                    {/* Cabeçalho do dia */}
                    <div className={`p-2.5 sm:p-3 text-center border-b ${ehHoje ? 'border-[#09A4B3]/20 bg-[#09A4B3]/10' : 'border-slate-200 bg-white'} rounded-t-2xl`}>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 block">
                        {diaNomeAbrev}
                      </span>
                      <strong className={`text-sm sm:text-base font-bold ${ehHoje ? 'text-[#09A4B3]' : 'text-slate-800'}`}>
                        {diaNumero}
                      </strong>
                      {ehHoje && (
                        <span className="block mt-0.5 text-[9px] sm:text-[10px] font-bold text-[#09A4B3] uppercase tracking-wider">
                          Hoje
                        </span>
                      )}
                    </div>

                    {/* Lista de compromissos do dia */}
                    <div className="p-2 sm:p-2.5 flex-1 space-y-2 overflow-y-auto max-h-[420px]">
                      {compromissos.length > 0 ? (
                        compromissos.map(comp => (
                          <div
                            key={comp.id}
                            onClick={() => onAbrirFichaPaciente(comp.paciente_id ? (pacientes.find(p => p.id === comp.paciente_id) || comp.nome) : comp.nome)}
                            className="p-2 sm:p-2.5 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:border-[#09A4B3] hover:shadow-sm transition-all cursor-pointer space-y-1 sm:space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] sm:text-[10px] font-bold text-[#09A4B3] bg-[#09A4B3]/10 px-1.5 py-0.5 rounded">
                                {comp.hora}
                              </span>
                              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                                {comp.duracao || '50min'}
                              </span>
                            </div>
                            
                            <strong className="block text-xs font-bold text-slate-800 line-clamp-1 hover:text-[#09A4B3]">
                              {comp.nome}
                            </strong>

                            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                              <span className="truncate">{comp.tipo || 'Sessão'}</span>
                              <span className="flex items-center gap-0.5 shrink-0">
                                {comp.modalidade === 'Online' ? <Video className="w-3 h-3 text-indigo-500" /> : <MapPin className="w-3 h-3 text-emerald-500" />}
                                {comp.modalidade || 'Presencial'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-8 text-center text-[10px] sm:text-[11px] text-slate-400">
                          <span>Sem horários</span>
                          <button
                            type="button"
                            onClick={() => onNovoCompromisso(diaISO)}
                            className="mt-2 text-[10px] font-bold text-[#09A4B3] hover:underline"
                          >
                            + Agendar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          3. VISUALIZAÇÃO DO MÊS (Aparece ao clicar em "Mês")
          ========================================================= */}
      {agendaPeriodoVista === 'mes' && (
        <div className="tail-card p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Calendário Mensal</h3>
              <p className="text-xs text-slate-500">
                Selecione qualquer dia para ver os agendamentos ou clique para navegar
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
              {compromissosDisponiveis.filter(c => c.data.startsWith(dataBase.toISOString().slice(0, 7))).length} compromissos no mês
            </span>
          </div>

          {/* Grade de Mês com rolagem horizontal suave no mobile */}
          <div className="overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
            <div className="min-w-[550px] md:min-w-0">
              {/* Cabeçalho dos Dias da Semana */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider pb-1">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              {/* Grade das Células do Mês */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {diasMesGrid.map((item, idx) => {
              const ehHoje = item.iso === hojeISO;
              const compromissos = getCompromissosData(item.iso);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    // Ao clicar em um dia do mês, alterna para a visão daquele dia
                    const diffDias = Math.round((item.date.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                    setAgendaPeriodoOffset(diffDias);
                    setAgendaPeriodoVista('dia');
                  }}
                  className={`min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    ehHoje
                      ? 'border-[#09A4B3] ring-1 ring-[#09A4B3] bg-[#09A4B3]/5'
                      : item.isCurrentMonth
                      ? 'border-slate-200 bg-white hover:border-[#09A4B3]/60 hover:shadow-xs'
                      : 'border-slate-100 bg-slate-50/50 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        ehHoje 
                          ? 'bg-[#09A4B3] text-white' 
                          : item.isCurrentMonth 
                          ? 'text-slate-800' 
                          : 'text-slate-400'
                      }`}
                    >
                      {item.date.getDate()}
                    </span>
                    {compromissos.length > 0 && (
                      <span className="text-[10px] font-bold text-[#09A4B3] bg-[#09A4B3]/10 px-1.5 py-0.5 rounded-full">
                        {compromissos.length}
                      </span>
                    )}
                  </div>

                  {/* Pílulas de compromissos */}
                  <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                    {compromissos.slice(0, 3).map(comp => (
                      <div
                        key={comp.id}
                        className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700 truncate hover:bg-[#09A4B3] hover:text-white transition-colors"
                        title={`${comp.hora} - ${comp.nome} (${comp.tipo || 'Sessão'})`}
                      >
                        <strong>{comp.hora}</strong> {comp.nome.split(' ')[0]}
                      </div>
                    ))}
                    {compromissos.length > 3 && (
                      <span className="text-[9px] font-bold text-[#09A4B3] block">
                        +{compromissos.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
