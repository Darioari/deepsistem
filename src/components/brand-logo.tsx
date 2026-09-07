'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PLATFORM_LOGO_URL, tenantFromBrandPath } from '@/lib/platform-brand';

type BrandLogoProps = {
  customLogoUrl?: string;
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

// Global in-memory cache to avoid flashing while navigating
let globalProfessionalLogo: string | null = null;

export function BrandLogo({ customLogoUrl, inverse = false, compact = false, className = '' }: BrandLogoProps) {
  const [fetchedLogo, setFetchedLogo] = useState<string>(() => globalProfessionalLogo || '');
  const pathname = usePathname() || '';

  // Clean customLogoUrl if provided
  const validCustomLogo = (typeof customLogoUrl === 'string' && customLogoUrl.trim() && customLogoUrl !== PLATFORM_LOGO_URL && !customLogoUrl.includes('platform-logo'))
    ? customLogoUrl.trim()
    : '';

  useEffect(() => {
    // If a valid custom logo is explicitly provided via props, use it immediately
    if (validCustomLogo) {
      globalProfessionalLogo = validCustomLogo;
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
        setFetchedLogo(logo);
        globalProfessionalLogo = logo;
        try {
          if (logo) localStorage.setItem('deepsistem_professional_logo', logo);
          else localStorage.removeItem('deepsistem_professional_logo');
        } catch {}
      })
      .catch(() => undefined);

    // Listen for real-time updates when user uploads logo in Configurações
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ logotipo_url?: string }>;
      const updatedLogo = (customEvent.detail?.logotipo_url && customEvent.detail.logotipo_url !== PLATFORM_LOGO_URL && !customEvent.detail.logotipo_url.includes('platform-logo'))
        ? customEvent.detail.logotipo_url
        : '';
      setFetchedLogo(updatedLogo);
      globalProfessionalLogo = updatedLogo;
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
  }, [validCustomLogo, pathname]);

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

  return (
    <span className={`brand-logo ${inverse ? 'inverse' : ''} ${className}`}>
      <img
        src={finalLogo}
        alt={activeLogo ? 'Logo do profissional' : 'Logo do DeePsistem'}
        className="brand-custom-logo max-h-9 max-w-[160px] object-contain"
      />
    </span>
  );
}
