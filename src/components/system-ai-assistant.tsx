'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { BookOpen, HelpCircle, Maximize2, Minimize2, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AiIcon } from '@/components/ai-icon';
import { formatGuideMessage, guideFor, type SystemGuide } from '@/lib/system-assistant';

type Message = { id: string; sender: 'user' | 'ia'; text: string; time?: string };
type Context = {
  pathname: string;
  title: string;
  activeTab?: string;
  activeSubtab?: string;
  headings: string[];
  actions: Array<{ id: string; label: string; help?: string }>;
  fields: string[];
};

function cleanContextHeading(value: string) {
  return value.replace(/^(bom dia|boa tarde|boa noite),?\s*/i, '').trim();
}

function collectContext(): Context {
  const activeTab = document.querySelector('[data-active-tab]')?.getAttribute('data-active-tab') || '';
  const activeSubtab = document.querySelector('[data-active-subtab]')?.getAttribute('data-active-subtab') || '';
  const actions = Array.from(document.querySelectorAll<HTMLElement>('[data-ai-action]')).slice(0, 40).map(element => ({
    id: element.dataset.aiAction || '',
    label: element.dataset.aiTitle || element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160) || '',
    help: element.dataset.aiHelp,
  })).filter(item => item.id && item.label);
  const fields = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea')).slice(0, 30).map(element => element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.id || element.name).filter((item): item is string => Boolean(item)).slice(0, 30);
  return {
    pathname: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/dashboard',
    title: typeof document !== 'undefined' ? document.title : 'DeePsistem',
    activeTab,
    activeSubtab,
    headings: typeof document !== 'undefined' ? Array.from(document.querySelectorAll('h1,h2')).slice(0, 10).map(element => cleanContextHeading(element.textContent?.replace(/\s+/g, ' ').trim() || '')).filter(Boolean) : [],
    actions,
    fields,
  };
}

function shouldShow(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname.endsWith('/dashboard') || pathname.startsWith('/admin');
}

function isHelpHidden(): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem('deepsistem_hide_help') === 'true'; } catch { return false; }
}

function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    if (!line.trim()) {
      return <span key={index} className="system-ai-line-break" />;
    }
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} className="font-bold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={pIdx} className="system-ai-code-pill">{part.slice(1, -1)}</code>;
      }
      return part;
    });

    const isStep = /^\s*(\d+\.|•|-|👉)/.test(line);
    return (
      <span key={index} className={`system-ai-line ${isStep ? 'system-ai-step-line' : ''}`}>
        {renderedParts}
      </span>
    );
  });
}

export function SystemAiAssistant() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentGuide, setCurrentGuide] = useState<SystemGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [targetId, setTargetId] = useState('');
  const [hidden, setHidden] = useState(false);
  const [professionalName, setProfessionalName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const visible = useMemo(() => shouldShow(pathname), [pathname]);

  const loadCurrentScreenGuide = useCallback((name = professionalName) => {
    const context = collectContext();
    const guide = guideFor(context);
    setCurrentGuide(guide);
    const didacticText = formatGuideMessage(guide, name);
    const welcomeMsg: Message = {
      id: `welcome-${guide.id}-${Date.now()}`,
      sender: 'ia',
      text: didacticText,
      time: 'agora',
    };
    setMessages([welcomeMsg]);
    setSuggestions(guide.suggestions);
  }, [professionalName]);

  useEffect(() => { setHidden(isHelpHidden()); }, []);

  useEffect(() => {
    if (!visible) return;
    fetch('/api/profissional').then(response => response.ok ? response.json() : null).then(data => {
      const name = String(data?.nome || data?.nome_civil || data?.tenants?.[data?.tenant_id]?.nome || '').trim();
      if (name) {
        setProfessionalName(name);
      }
    }).catch(() => undefined);
  }, [visible, pathname]);

  useEffect(() => {
    const handler = () => setHidden(isHelpHidden());
    window.addEventListener('storage', handler);
    window.addEventListener('deepsistem-help-toggle', handler);
    return () => { window.removeEventListener('storage', handler); window.removeEventListener('deepsistem-help-toggle', handler); };
  }, []);

  // Quando o usuário abre o painel de ajuda, carrega o guia didático da tela atual
  const handleOpenHelp = () => {
    setOpen(true);
    loadCurrentScreenGuide();
  };

  // Monitora alterações de aba e sub-aba no dashboard para manter o guia contextual sincronizado
  useEffect(() => {
    if (!open) return;
    const targetNode = document.querySelector('main');
    if (!targetNode) return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && (mutation.attributeName === 'data-active-tab' || mutation.attributeName === 'data-active-subtab')) {
          loadCurrentScreenGuide();
          break;
        }
      }
    });
    observer.observe(targetNode, { attributes: true, attributeFilter: ['data-active-tab', 'data-active-subtab'] });
    return () => observer.disconnect();
  }, [open, loadCurrentScreenGuide]);

  useEffect(() => {
    if (!targetId) return;
    const element = document.querySelector<HTMLElement>(`[data-ai-action="${targetId.replace(/"/g, '\\"')}"]`);
    if (!element) return;
    element.classList.add('system-ai-target');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timeout = window.setTimeout(() => element.classList.remove('system-ai-target'), 5000);
    return () => window.clearTimeout(timeout);
  }, [targetId]);

  // Close on click outside panel
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    const timer = window.setTimeout(() => document.addEventListener('mousedown', handleClick), 100);
    return () => { window.clearTimeout(timer); document.removeEventListener('mousedown', handleClick); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const element = messagesRef.current;
    if (!element) return;
    const frame = window.requestAnimationFrame(() => element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' }));
    return () => window.cancelAnimationFrame(frame);
  }, [open, messages, loading]);

  if (!visible || hidden) return null;

  async function ask(value = question) {
    const clean = value.trim();
    if (!clean || loading) return;
    const userMessage: Message = { id: crypto.randomUUID(), sender: 'user', text: clean, time: 'agora' };
    setMessages(current => [...current, userMessage]);
    setQuestion('');
    setLoading(true);
    try {
      const response = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: clean,
          context: collectContext(),
          history: messages.map(item => ({ role: item.sender === 'ia' ? 'assistant' : 'user', content: item.text })),
        }),
      });
      const data = await response.json().catch(() => null) as { error?: string; message?: Message; target?: string | null; suggestions?: string[] } | null;
      if (!response.ok) throw new Error(data?.error || 'Não foi possível responder agora.');
      if (data?.message) setMessages(current => [...current, data.message as Message]);
      setTargetId(data?.target || '');
      if (data?.suggestions?.length) setSuggestions(data.suggestions);
    } catch (error) {
      setMessages(current => [...current, { id: crypto.randomUUID(), sender: 'ia', text: error instanceof Error ? error.message : 'Não foi possível responder agora.', time: 'agora' }]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void ask(); }

  return <>
    {!open && (
      <button
        type="button"
        className="system-ai-launcher"
        onClick={handleOpenHelp}
        aria-label="Abrir ajuda didática da tela"
        aria-expanded={open}
        title="Ajuda didática da tela"
      >
        Ajuda?<i aria-hidden="true" />
      </button>
    )}
    {open && <>
      <div className="system-ai-backdrop" onMouseDown={() => setOpen(false)} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`system-ai-panel ${expanded ? 'is-expanded' : ''}`}
        role="dialog"
        aria-label="Assistente de Ajuda Didática do DeePsistem"
        onMouseDown={event => event.stopPropagation()}
      >
        <header>
          <div className="system-ai-panel-title">
            <span><AiIcon size={24} label="IA" /></span>
            <div>
              <strong>Ajuda do Sistema</strong>
              <small>{currentGuide ? `Guia: ${currentGuide.title}` : 'Passo a passo didático'}</small>
            </div>
          </div>
          <div className="system-ai-panel-actions">
            <button
              type="button"
              onClick={() => loadCurrentScreenGuide()}
              title="Recarregar passo a passo desta tela"
              aria-label="Recarregar guia"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(value => !value)}
              aria-label={expanded ? 'Reduzir painel' : 'Expandir painel'}
            >
              {expanded ? <Minimize2 /> : <Maximize2 />}
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar assistente"><X /></button>
          </div>
        </header>

        <div className="system-ai-context">
          <HelpCircle />
          <span>
            Tela atual: <strong>{currentGuide?.title || 'DeePsistem'}</strong>
            {currentGuide?.badge && <span className="ml-1 text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 px-1.5 py-0.5 rounded font-bold">{currentGuide.badge}</span>}
          </span>
        </div>

        <div ref={messagesRef} className="system-ai-messages" aria-live="polite">
          {messages.map((message, idx) => (
            <article key={message.id} className={`system-ai-message ${message.sender === 'ia' ? 'is-ai' : 'is-user'}`}>
              <div>
                {message.sender === 'ia' && <AiIcon size={16} />}
                <div className="system-ai-content">{renderFormattedText(message.text)}</div>
              </div>
              <small>{message.time}</small>
              {message.sender === 'ia' && idx !== 0 && (
                <footer>
                  <button
                    type="button"
                    className={feedback[message.id] === 'up' ? 'active' : ''}
                    onClick={() => setFeedback(current => ({ ...current, [message.id]: 'up' }))}
                    aria-label="Resposta útil"
                  >
                    <ThumbsUp />
                  </button>
                  <button
                    type="button"
                    className={feedback[message.id] === 'down' ? 'active' : ''}
                    onClick={() => setFeedback(current => ({ ...current, [message.id]: 'down' }))}
                    aria-label="Resposta não útil"
                  >
                    <ThumbsDown />
                  </button>
                </footer>
              )}
            </article>
          ))}
          {loading && (
            <article className="system-ai-message is-ai">
              <div>
                <AiIcon size={16} />
                <p className="system-ai-typing">Organizando resposta didática<span>.</span><span>.</span><span>.</span></p>
              </div>
            </article>
          )}
        </div>

        <div className="system-ai-suggestions">
          <small>Dúvidas frequentes:</small>
          {suggestions.map(item => (
            <button type="button" key={item} onClick={() => void ask(item)}>{item}</button>
          ))}
        </div>

        <form className="system-ai-composer" onSubmit={submit}>
          <input
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder="Digite sua dúvida sobre esta tela..."
            aria-label="Pergunta para o assistente"
          />
          <button type="submit" disabled={!question.trim() || loading} aria-label="Enviar pergunta"><Send /></button>
        </form>
      </div>
    </>}
  </>;
}
