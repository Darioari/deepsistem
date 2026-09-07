'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PLATFORM_BRAND, tenantFromBrandPath } from '@/lib/platform-brand';

type BrandSettings = {
  cor_primaria?: string;
  cor_secundaria?: string;
  tema_padrao?: 'light' | 'dark';
};

export function applyBrandSettings(brand?: BrandSettings | null) {
  if (!brand) return;
  const root = document.documentElement;
  if (brand.cor_primaria) root.style.setProperty('--color-primary', brand.cor_primaria);
  if (brand.cor_secundaria) root.style.setProperty('--color-secondary', brand.cor_secundaria);
  document.body.classList.toggle('dark-theme', brand.tema_padrao === 'dark');
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === '/' || pathname === '') {
      applyBrandSettings(PLATFORM_BRAND);
      return;
    }
    const tenant = tenantFromBrandPath(pathname);
    const controller = new AbortController();
    fetch(`/api/brand/settings?tenant=${encodeURIComponent(tenant)}`, { signal: controller.signal })
      .then(response => (response.ok ? response.json() : null))
      .then(applyBrandSettings)
      .catch(error => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Não foi possível carregar a identidade visual.', error);
        }
      });
    return () => controller.abort();
  }, [pathname]);

  return children;
}
