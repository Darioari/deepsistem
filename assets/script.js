/**
 * DeePsistem — Landing Page Interactive Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  // 0. Hero load animation + Scroll reveals
  document.documentElement.classList.add('motion-ready');
  const heroSection = document.querySelector('.hero-section');
  if (heroSection) {
    requestAnimationFrame(() => heroSection.setAttribute('data-loaded', 'true'));
  }

  const elementMotionSelectors = [
    '.section-beta-video .section-header-center',
    '.section-beta-video .video-mockup-wrapper',
    '.section-beta-video .pillar-card',
    '.section-professionals .professionals-copy > *',
    '.section-professionals .professionals-visual',
    '.section-gallery > .section-header-center',
    '.section-gallery .gallery-side-nav',
    '.section-gallery .gallery-tab-btn',
    '.section-gallery .browser-showcase-container',
    '.section-pricing .pricing-heading',
    '.section-pricing .pricing-card',
    '.section-flow .section-header-center',
    '.section-flow .flow-card',
    '.section-aura .aura-container > .aura-visual-box',
    '.section-aura .aura-copy-content > *',
    '.section-security .security-container > :first-child > *',
    '.section-security .sec-card',
    '.section-faq .section-header-center',
    '.section-faq .faq-item',
    '.section-final-cta .final-container > *'
  ].join(', ');

  document.querySelectorAll(elementMotionSelectors).forEach(element => {
    element.classList.add('reveal-on-scroll');
  });

  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (revealElements.length) {
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      revealElements.forEach(el => revealObserver.observe(el));
    } else {
      revealElements.forEach(el => el.classList.add('visible'));
    }
  }

  // 1. Gallery Tab Switching
  const gallery = document.querySelector('.gallery-layout');
  const tabButtons = document.querySelectorAll('.gallery-tab-btn');
  const tabPanes = document.querySelectorAll('.gallery-content-pane');
  let activeTabIndex = 0;
  let galleryTimer;

  const activateGalleryTab = (index, shouldFocus = false) => {
    if (!tabButtons.length) return;

    activeTabIndex = (index + tabButtons.length) % tabButtons.length;
    const activeButton = tabButtons[activeTabIndex];
    const targetId = activeButton.getAttribute('data-tab');

    tabButtons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === activeTabIndex;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      if (isActive && shouldFocus) button.focus();
    });

    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${targetId}`);
    });
  };

  const stopGalleryAutoplay = () => {
    window.clearInterval(galleryTimer);
    if (gallery) gallery.classList.remove('is-autoplaying');
  };

  const startGalleryAutoplay = () => {
    stopGalleryAutoplay();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (gallery) gallery.classList.add('is-autoplaying');
    galleryTimer = window.setInterval(() => activateGalleryTab(activeTabIndex + 1), 5200);
  };

  tabButtons.forEach((button, buttonIndex) => {
    button.addEventListener('click', () => {
      activateGalleryTab(buttonIndex);
      startGalleryAutoplay();
    });

    button.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        activateGalleryTab(buttonIndex + 1, true);
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        activateGalleryTab(buttonIndex - 1, true);
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        activateGalleryTab(event.key === 'Home' ? 0 : tabButtons.length - 1, true);
      }
    });
  });

  if (gallery && tabButtons.length > 1) {
    gallery.addEventListener('mouseenter', stopGalleryAutoplay);
    gallery.addEventListener('mouseleave', startGalleryAutoplay);
    gallery.addEventListener('focusin', stopGalleryAutoplay);
    gallery.addEventListener('focusout', event => {
      if (!gallery.contains(event.relatedTarget)) startGalleryAutoplay();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopGalleryAutoplay();
      else startGalleryAutoplay();
    });
    startGalleryAutoplay();
  }

  // 2. Lightbox for Screenshots
  const lightbox = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const zoomableImages = document.querySelectorAll('.zoomable-img');

  zoomableImages.forEach(img => {
    img.addEventListener('click', () => {
      if (lightbox && lightboxImg) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('active');
      }
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', () => {
      lightbox.classList.remove('active');
    });
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        lightbox.classList.remove('active');
      }
    });
  }

  // 3. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        faqItems.forEach(i => i.classList.remove('active'));
        if (!isOpen) {
          item.classList.add('active');
        }
      });
    }
  });

  // 4. Mobile Menu Toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('mobile-open');
      mobileBtn.setAttribute('aria-expanded', String(isOpen));
      mobileBtn.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    });
    
    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
        mobileBtn.setAttribute('aria-expanded', 'false');
        mobileBtn.setAttribute('aria-label', 'Abrir menu');
      });
    });
  }

  // 5. Video Demo Interactive Simulation
  const micBtn = document.getElementById('demo-mic-btn');
  const camBtn = document.getElementById('demo-cam-btn');
  const copyLinkBtn = document.getElementById('demo-copy-link');
  const copyToast = document.getElementById('demo-copy-toast');

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      micBtn.classList.toggle('active-off');
      const isMuted = micBtn.classList.contains('active-off');
      micBtn.style.background = isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)';
    });
  }

  if (camBtn) {
    camBtn.addEventListener('click', () => {
      camBtn.classList.toggle('active-off');
      const isOff = camBtn.classList.contains('active-off');
      camBtn.style.background = isOff ? '#ef4444' : 'rgba(255, 255, 255, 0.1)';
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const linkInput = document.getElementById('demo-link-input');
      if (linkInput) {
        linkInput.select();
        navigator.clipboard.writeText(linkInput.value).then(() => {
          if (copyToast) {
            copyToast.innerText = 'Copiado!';
            setTimeout(() => { copyToast.innerText = 'Copiar'; }, 2000);
          }
        }).catch(() => {
          alert('Link copiado para a área de transferência!');
        });
      }
    });
  }
});
