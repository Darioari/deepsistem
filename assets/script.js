/**
 * DeePsistem — Landing Page Interactive Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  // 0. Hero load animation + Scroll reveals
  const heroSection = document.querySelector('.hero-section');
  if (heroSection) {
    requestAnimationFrame(() => heroSection.setAttribute('data-loaded', 'true'));
  }

  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealElements.forEach(el => revealObserver.observe(el));
  }

  // 1. Gallery Tab Switching
  const tabButtons = document.querySelectorAll('.gallery-tab-btn');
  const tabPanes = document.querySelectorAll('.gallery-content-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(`tab-${targetId}`);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });

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
      navLinks.classList.toggle('mobile-open');
    });
    
    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
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
