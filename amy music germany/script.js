/* ============================================
   Amy Eventsängerin – V2 Premium Interactive JS
   Smooth animations, cursor, parallax, tilt
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const isTouchDevice = 'ontouchstart' in window;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ══════════════════════════════════════════════
  // PRELOADER
  // ══════════════════════════════════════════════
  const preloader = document.getElementById('preloader');
  
  function hidePreloader() {
    if (preloader) {
      preloader.classList.add('hidden');
      document.body.style.overflow = '';
      // Start hero animations after preloader
      setTimeout(triggerHeroAnimations, 200);
    }
  }

  // Hide preloader when page loads (or after max 3s)
  window.addEventListener('load', () => {
    setTimeout(hidePreloader, 800);
  });
  setTimeout(hidePreloader, 3000); // fallback

  // ══════════════════════════════════════════════
  // HERO ANIMATIONS
  // ══════════════════════════════════════════════
  function triggerHeroAnimations() {
    // Already handled via CSS animation delays
    // Add parallax to hero image on mouse move
    if (!isMobile && !isTouchDevice) {
      const heroImg = document.getElementById('heroImg');
      const hero = document.getElementById('hero');
      
      if (heroImg && hero) {
        hero.addEventListener('mousemove', (e) => {
          const rect = hero.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          heroImg.style.transform = `scale(1.02) translate(${x * -5}px, ${y * -5}px)`;
        });
      }
    }
  }

  // ══════════════════════════════════════════════
  // CUSTOM CURSOR
  // ══════════════════════════════════════════════
  if (!isMobile && !isTouchDevice) {
    const cursor = document.getElementById('cursor');
    const cursorInner = cursor.querySelector('.cursor-inner');
    const cursorOuter = cursor.querySelector('.cursor-outer');
    
    let mouseX = 0, mouseY = 0;
    let outerX = 0, outerY = 0;
    let innerX = 0, innerY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animateCursor() {
      // Inner cursor - fast follow
      innerX += (mouseX - innerX) * 0.25;
      innerY += (mouseY - innerY) * 0.25;
      cursorInner.style.left = innerX + 'px';
      cursorInner.style.top = innerY + 'px';

      // Outer cursor - smooth follow
      outerX += (mouseX - outerX) * 0.1;
      outerY += (mouseY - outerY) * 0.1;
      cursorOuter.style.left = outerX + 'px';
      cursorOuter.style.top = outerY + 'px';

      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover effect on interactive elements
    const hoverTargets = document.querySelectorAll('a, button, .gallery-item, .service-card, .tag-pill, .instrument-card');
    
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });
  }

  // ══════════════════════════════════════════════
  // NAVBAR
  // ══════════════════════════════════════════════
  const navbar = document.getElementById('navbar');
  let ticking = false;

  function handleNavbarScroll() {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(handleNavbarScroll);
      ticking = true;
    }
  }, { passive: true });
  
  handleNavbarScroll();

  // ══════════════════════════════════════════════
  // MOBILE NAVIGATION
  // ══════════════════════════════════════════════
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];

  function toggleMobileMenu() {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', toggleMobileMenu);
    
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (mobileMenu.classList.contains('active')) {
          toggleMobileMenu();
        }
      });
    });

    // Close on background click
    mobileMenu.querySelector('.mobile-menu-bg').addEventListener('click', toggleMobileMenu);
  }

  // ══════════════════════════════════════════════
  // SMOOTH SCROLLING
  // ══════════════════════════════════════════════
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = navbar.offsetHeight + 20;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ══════════════════════════════════════════════
  // SCROLL REVEAL ANIMATIONS
  // ══════════════════════════════════════════════
  const revealElements = document.querySelectorAll('.anim-reveal');
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Staggered delay for siblings
        const parent = entry.target.parentElement;
        const siblings = parent ? Array.from(parent.querySelectorAll('.anim-reveal')) : [];
        const siblingIndex = siblings.indexOf(entry.target);
        const delay = siblingIndex >= 0 ? siblingIndex * 80 : 0;
        
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // ══════════════════════════════════════════════
  // COUNTER ANIMATION (floating badges)
  // ══════════════════════════════════════════════
  const counters = document.querySelectorAll('.floating-badge-number');
  
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count'));
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 2000;
        const start = performance.now();

        function updateCounter(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
          const current = Math.floor(eased * target);
          el.textContent = current + suffix;

          if (progress < 1) {
            requestAnimationFrame(updateCounter);
          } else {
            el.textContent = target + suffix;
          }
        }

        requestAnimationFrame(updateCounter);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));

  // ══════════════════════════════════════════════
  // SERVICE CARD GLOW EFFECT
  // ══════════════════════════════════════════════
  if (!isMobile && !isTouchDevice) {
    const serviceCards = document.querySelectorAll('.service-card');
    
    serviceCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mouse-x', x + '%');
        card.style.setProperty('--mouse-y', y + '%');
      });
    });
  }

  // ══════════════════════════════════════════════
  // PARALLAX ON SCROLL
  // ══════════════════════════════════════════════
  if (!isMobile && !prefersReducedMotion) {
    const heroOrbs = document.querySelectorAll('.hero-orb');
    
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      
      if (scrolled < window.innerHeight * 1.5) {
        heroOrbs.forEach((orb, i) => {
          const speed = 0.05 + (i * 0.02);
          orb.style.transform = `translateY(${scrolled * speed}px)`;
        });
      }
    }, { passive: true });
  }

  // ══════════════════════════════════════════════
  // MAGNETIC EFFECT ON SOCIAL LINKS
  // ══════════════════════════════════════════════
  if (!isMobile && !isTouchDevice) {
    const magneticEls = document.querySelectorAll('.social-link');
    
    magneticEls.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px) scale(1.03)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  // ══════════════════════════════════════════════
  // SMOOTH SCROLL INDICATOR HIDE
  // ══════════════════════════════════════════════
  const scrollIndicator = document.getElementById('scrollIndicator');
  
  if (scrollIndicator) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 200) {
        scrollIndicator.style.opacity = '0';
        scrollIndicator.style.transform = 'translateX(-50%) translateY(20px)';
      } else {
        scrollIndicator.style.opacity = '1';
        scrollIndicator.style.transform = 'translateX(-50%) translateY(0)';
      }
    }, { passive: true });
  }

  // ══════════════════════════════════════════════
  // PWA INSTALL PROMPT
  // ══════════════════════════════════════════════
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; });

  // ══════════════════════════════════════════════
  // PAGE TRANSITION
  // ══════════════════════════════════════════════
  document.body.classList.add('page-transition-enter');

});

// ══════════════════════════════════════════════
// LIGHTBOX WITH NAVIGATION
// ══════════════════════════════════════════════
let currentLightboxIndex = 0;
const galleryItems = [];

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.gallery-item').forEach((item, index) => {
    galleryItems.push(item.querySelector('img').src);
    item.setAttribute('data-index', index);
  });
});

function openLightbox(element) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const counter = document.getElementById('lightboxCounter');
  
  currentLightboxIndex = parseInt(element.getAttribute('data-index')) || 0;
  lightboxImg.src = galleryItems[currentLightboxIndex];
  counter.textContent = `${currentLightboxIndex + 1} / ${galleryItems.length}`;
  
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}

function navigateLightbox(direction) {
  currentLightboxIndex += direction;
  if (currentLightboxIndex < 0) currentLightboxIndex = galleryItems.length - 1;
  if (currentLightboxIndex >= galleryItems.length) currentLightboxIndex = 0;
  
  const lightboxImg = document.getElementById('lightboxImg');
  const counter = document.getElementById('lightboxCounter');
  
  lightboxImg.style.opacity = '0';
  lightboxImg.style.transform = direction > 0 ? 'scale(0.95) translateX(20px)' : 'scale(0.95) translateX(-20px)';
  
  setTimeout(() => {
    lightboxImg.src = galleryItems[currentLightboxIndex];
    counter.textContent = `${currentLightboxIndex + 1} / ${galleryItems.length}`;
    lightboxImg.style.opacity = '1';
    lightboxImg.style.transform = 'scale(1) translateX(0)';
  }, 200);
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox.classList.contains('active')) return;
  
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

// Close on background click
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeLightbox();
});

// Touch swipe for lightbox
let touchStartX = 0;
let touchEndX = 0;

document.getElementById('lightbox').addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.getElementById('lightbox').addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  const swipeDistance = touchStartX - touchEndX;
  
  if (Math.abs(swipeDistance) > 50) {
    if (swipeDistance > 0) {
      navigateLightbox(1); // Swipe left = next
    } else {
      navigateLightbox(-1); // Swipe right = prev
    }
  }
}, { passive: true });
