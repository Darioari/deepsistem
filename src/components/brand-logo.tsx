'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PLATFORM_LOGO_URL, tenantFromBrandPath } from '@/lib/platform-brand';

type BrandLogoProps = {
  customLogoUrl?: string;
  logoSize?: number;
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

// Global in-memory cache to avoid flashing while navigating
let globalProfessionalLogo: string | null = null;
let globalProfessionalLogoSize: number | null = null;

export function BrandLogo({ customLogoUrl, logoSize, inverse = false, compact = false, className = '' }: BrandLogoProps) {
  const [fetchedLogo, setFetchedLogo] = useState<string>(() => globalProfessionalLogo || '');
  const [fetchedSize, setFetchedSize] = useState<number>(() => {
    if (globalProfessionalLogoSize) return globalProfessionalLogoSize;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('deepsistem_professional_logo_size');
        if (cached) {
          const sz = parseInt(cached, 10);
          if (!isNaN(sz) && sz >= 20) return sz;
        }
      } catch {}
    }
    return 48;
  });
  const pathname = usePathname() || '';

  // Clean customLogoUrl if provided
  const validCustomLogo = (typeof customLogoUrl === 'string' && customLogoUrl.trim() && customLogoUrl !== PLATFORM_LOGO_URL && !customLogoUrl.includes('platform-logo'))
    ? customLogoUrl.trim()
    : '';

  useEffect(() => {
    // If a valid custom logo is explicitly provided via props, use it immediately
    if (validCustomLogo) {
      globalProfessionalLogo = validCustomLogo;
      if (logoSize) {
        globalProfessionalLogoSize = logoSize;
        setFetchedSize(logoSize);
      }
      return;
    }

    // Main landing page (homepage) must KEEP the system brand as requested
    if (pathname === '/' || pathname === '') {
      return;
    }

    // Check localStorage cache first
    try {
      const cached = localStorage.getItem('deepsistem_professional_logo');
      if (cached && cached !== PLATFORM_LOGO_URL && !cached.includes('platform-logo')) {
        setFetchedLogo(cached);
        globalProfessionalLogo = cached;
      }
      const cachedSize = localStorage.getItem('deepsistem_professional_logo_size');
      if (cachedSize) {
        const sz = parseInt(cachedSize, 10);
        if (!isNaN(sz) && sz >= 20) {
          setFetchedSize(sz);
          globalProfessionalLogoSize = sz;
        }
      }
    } catch {}

    const controller = new AbortController();

    // Fetch professional brand settings
    const tenant = tenantFromBrandPath(pathname);
    const url = tenant && tenant !== 'pripsico'
      ? `/api/brand/settings?tenant=${encodeURIComponent(tenant)}`
      : '/api/brand/settings';

    fetch(url, { signal: controller.signal })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        const logo = (data?.logotipo_url && data.logotipo_url !== PLATFORM_LOGO_URL && !data.logotipo_url.includes('platform-logo'))
          ? data.logotipo_url
          : '';
        const size = Number(data?.logotipo_tamanho) || 48;
        setFetchedLogo(logo);
        setFetchedSize(size);
        globalProfessionalLogo = logo;
        globalProfessionalLogoSize = size;
        try {
          if (logo) localStorage.setItem('deepsistem_professional_logo', logo);
          else localStorage.removeItem('deepsistem_professional_logo');
          localStorage.setItem('deepsistem_professional_logo_size', String(size));
        } catch {}
      })
      .catch(() => undefined);

    // Listen for real-time updates when user uploads logo or resizes in Configurações
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ logotipo_url?: string; logotipo_tamanho?: number }>;
      const updatedLogo = (customEvent.detail?.logotipo_url && customEvent.detail.logotipo_url !== PLATFORM_LOGO_URL && !customEvent.detail.logotipo_url.includes('platform-logo'))
        ? customEvent.detail.logotipo_url
        : '';
      setFetchedLogo(updatedLogo);
      globalProfessionalLogo = updatedLogo;
      if (typeof customEvent.detail?.logotipo_tamanho === 'number') {
        const sz = customEvent.detail.logotipo_tamanho;
        setFetchedSize(sz);
        globalProfessionalLogoSize = sz;
        try { localStorage.setItem('deepsistem_professional_logo_size', String(sz)); } catch {}
      }
      try {
        if (updatedLogo) localStorage.setItem('deepsistem_professional_logo', updatedLogo);
        else localStorage.removeItem('deepsistem_professional_logo');
      } catch {}
    };

    window.addEventListener('deepsistem-brand-updated', handleUpdate);
    return () => {
      controller.abort();
      window.removeEventListener('deepsistem-brand-updated', handleUpdate);
    };
  }, [validCustomLogo, logoSize, pathname]);

  // Main landing page keeps the system logo by design
  const isMainLanding = pathname === '/' || pathname === '';

  const activeLogo = isMainLanding
    ? ''
    : (validCustomLogo || fetchedLogo || globalProfessionalLogo || '');

  // Default system fallback logos
  const defaultSystemLogo = inverse
    ? '/brand/deepsistem-logo-white.png'
    : '/brand/deepsistem-logo.webp';
  const defaultCompactSystemLogo = inverse
    ? '/brand/cerebro-deepsistem-branco.svg'
    : '/brand/cerebro-deepsistem.svg';

  if (compact) {
    if (activeLogo) {
      return (
        <span className={`brand-logo compact ${inverse ? 'inverse' : ''} ${className}`}>
          <img
            src={activeLogo}
            alt="Logo do profissional"
            className="brand-custom-logo w-8 h-8 max-h-8 max-w-[36px] object-contain"
          />
        </span>
      );
    }
    return (
      <span className={`brand-logo compact ${inverse ? 'inverse' : ''} ${className}`}>
        <img
          src={defaultCompactSystemLogo}
          alt="DeePsistem"
          className="brand-custom-logo w-8 h-8 object-contain"
        />
      </span>
    );
  }

  const finalLogo = activeLogo || defaultSystemLogo;
  const isCustom = Boolean(activeLogo);
  const effectiveSize = logoSize || (isCustom ? fetchedSize : 38);
  const maxW = Math.max(180, Math.round(effectiveSize * 4.5));

  return (
    <span
      className={`brand-logo ${inverse ? 'inverse' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        ['--brand-logo-h' as string]: `${effectiveSize}px`,
        ['--brand-logo-max-w' as string]: `${maxW}px`,
      }}
    >
      <img
        src={finalLogo}
        alt={activeLogo ? 'Logo do profissional' : 'Logo do DeePsistem'}
        style={{
          height: `${effectiveSize}px`,
          maxHeight: `${effectiveSize}px`,
          maxWidth: `${maxW}px`,
          width: 'auto',
          objectFit: 'contain',
        }}
        className="brand-custom-logo transition-all duration-150"
      />
    </span>
  );
}
