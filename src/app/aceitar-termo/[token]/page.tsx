'use client';

import { useEffect, useState } from 'react';
import { Check, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { applyBrandSettings } from '@/components/brand-provider';
import { GlobalPageLoader } from '@/components/global-page-loader';

type Term = { id: string; title: string; description: string; content: string; version: string };
type PageState = 'loading' | 'ready' | 'success' | 'error';

export default function AcceptTermPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('');
  const [terms, setTerms] = useState<Term[]>([]);
  const [patientName, setPatientName] = useState('');
  const [signerName, setSignerName] = useState('');
  const [relationship, setRelationship] = useState('Pessoa atendida');
  const [accepted, setAccepted] = useState<string[]>([]);
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [state, setState] = useState<PageState>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    params
      .then(value => {
        setToken(value.token);
        return fetch(`/api/termos/aceitar/${encodeURIComponent(value.token)}`);
      })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Link indisponível.');
        setTerms(data.terms || []);
        setPatientName(data.patientName || '');
        setSignerName(data.patientName || '');
        setAccepted(data.acceptedTermIds || []);
        if (data.logotipoUrl) setCustomLogoUrl(data.logotipoUrl);
        const brandResponse = await fetch(`/api/brand/settings?tenant=${encodeURIComponent(data.tenantId || 'pripsico')}`);
        if (brandResponse.ok) {
          const brandData = await brandResponse.json();
          applyBrandSettings(brandData);
          if (brandData?.logotipo_url && !brandData.logotipo_url.includes('platform-logo')) {
            setCustomLogoUrl(brandData.logotipo_url);
          }
        }
        setState('ready');
      })
      .catch(cause => {
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os termos.');
        setState('error');
      });
  }, [params]);

  async function acceptTerms(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch(`/api/termos/aceitar/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptedTermIds: accepted, signerName, relationship })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Não foi possível registrar o aceite.');
      return;
    }
    setState('success');
  }

  return (
    <main className="public-term-page">
      <header>
        <BrandLogo customLogoUrl={customLogoUrl || undefined} />
        <span>Consentimento digital seguro</span>
      </header>
      <section className="public-term-card">
        {state === 'loading' && <GlobalPageLoader inline />}
        {state === 'error' && (
          <div className="public-term-state">
            <ShieldCheck className="error" />
            <h1>Link indisponível</h1>
            <p>{error}</p>
          </div>
        )}
        {state === 'success' && (
          <div className="public-term-state">
            <CheckCircle2 className="success" />
            <span className="public-term-eyebrow">Registro concluído</span>
            <h1>Obrigado, {patientName.split(' ')[0] || 'tudo certo'}.</h1>
            <p>Seu aceite foi registrado com data, versão dos termos e identificação do responsável. Você pode fechar esta página.</p>
          </div>
        )}
        {state === 'ready' && (
          <form onSubmit={acceptTerms}>
            <div className="public-term-intro">
              <span className="public-term-eyebrow">DeePsistem · Termos do atendimento</span>
              <h1>Leia e confirme os termos</h1>
              <p>
                Olá, <strong>{patientName}</strong>. O profissional responsável enviou os documentos abaixo. Leia cada um e confirme somente depois de compreender as informações.
              </p>
            </div>
            <div className="public-term-list">
              {terms.map(term => {
                const isAccepted = accepted.includes(term.id);
                return (
                  <article className={`public-term-item ${isAccepted ? 'accepted' : ''}`} key={term.id}>
                    <div className="public-term-header">
                      <div className="public-term-header-info">
                        <FileText />
                        <strong>{term.title}</strong>
                        {term.description && <small>{term.description}</small>}
                      </div>
                    </div>
                    <div className="public-term-body">
                      <p>{term.content}</p>
                      <small>Versão {term.version}</small>
                      <label>
                        <input
                          type="checkbox"
                          checked={isAccepted}
                          onChange={event =>
                            setAccepted(current =>
                              event.target.checked
                                ? [...new Set([...current, term.id])]
                                : current.filter(id => id !== term.id)
                            )
                          }
                        />
                        <span>Li e compreendi este termo</span>
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="public-term-signer">
              <label>
                Nome de quem está aceitando
                <input className="form-control" value={signerName} onChange={event => setSignerName(event.target.value)} required />
              </label>
              <label>
                Relação com o atendimento
                <select className="form-control" value={relationship} onChange={event => setRelationship(event.target.value)}>
                  <option>Pessoa atendida</option>
                  <option>Responsável legal</option>
                  <option>Representante autorizado</option>
                </select>
              </label>
            </div>
            {error && <p className="public-term-error">{error}</p>}
            <button className="button-primary public-term-submit" disabled={!signerName.trim() || accepted.length < terms.length}>
              <Check /> Aceitar e continuar
            </button>
            <p className="public-term-footnote">
              <ShieldCheck /> O DeePsistem registra o aceite para apoiar a segurança e a transparência do atendimento.
            </p>
          </form>
        )}
      </section>
      <footer>DeePsistem · Apoio à rotina profissional</footer>
    </main>
  );
}

