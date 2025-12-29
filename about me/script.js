// ================================
// Wait for DOM to be fully loaded
// ================================
document.addEventListener('DOMContentLoaded', function () {

    // ================================
    // Smooth Scroll for Navigation Links
    // ================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href && href !== '#') {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // ================================
    // Navbar Background on Scroll
    // ================================
    const navbar = document.querySelector('.navbar');

    if (navbar) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 50) {
                navbar.style.background = 'rgba(13, 13, 20, 0.95)';
                navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
            } else {
                navbar.style.background = 'rgba(13, 13, 20, 0.8)';
                navbar.style.boxShadow = 'none';
            }
        });
    }

    // ================================
    // Intersection Observer for Animations
    // ================================
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe service cards
        document.querySelectorAll('.service-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(40px)';
            card.style.transition = `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`;
            observer.observe(card);
        });

        // Stats Observer
        const heroStats = document.querySelector('.hero-stats');
        if (heroStats) {
            const statsObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const statNumbers = entry.target.querySelectorAll('.stat-number');
                        statNumbers.forEach(stat => {
                            const value = parseInt(stat.textContent);
                            if (!isNaN(value) && value > 0) {
                                animateCounter(stat, value);
                            }
                        });
                        statsObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });

            statsObserver.observe(heroStats);
        }
    }

    // Add animation class styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // ================================
    // Parallax Effect for Background Orbs
    // ================================
    const orbs = document.querySelectorAll('.gradient-orb');
    if (orbs.length > 0) {
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;

            orbs.forEach((orb, index) => {
                const speed = (index + 1) * 20;
                const x = (mouseX - 0.5) * speed;
                const y = (mouseY - 0.5) * speed;
                orb.style.transform = `translate(${x}px, ${y}px)`;
            });
        });
    }

    // ================================
    // Mobile Menu Toggle
    // ================================
    createMobileMenu();

});

// ================================
// Counter Animation for Stats
// ================================
function animateCounter(element, target, duration = 2000) {
    if (!element) return;

    let start = 0;
    const increment = target / (duration / 16);

    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start) + '+';
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target + '+';
        }
    }

    updateCounter();
}

// ================================
// Mobile Menu Toggle (Basic Implementation)
// ================================
function createMobileMenu() {
    const navContainer = document.querySelector('.nav-container');
    const navLinks = document.querySelector('.nav-links');

    // Check if elements exist
    if (!navContainer || !navLinks) return;

    // Create hamburger button
    const hamburger = document.createElement('button');
    hamburger.className = 'mobile-menu-btn';
    hamburger.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    hamburger.setAttribute('aria-label', 'Toggle menu');

    // Style hamburger
    const style = document.createElement('style');
    style.textContent = `
        .mobile-menu-btn {
            display: none;
            flex-direction: column;
            gap: 5px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 10px;
            z-index: 1001;
        }
        
        .mobile-menu-btn span {
            width: 25px;
            height: 2px;
            background: white;
            transition: all 0.3s ease;
        }
        
        .mobile-menu-btn.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        
        .mobile-menu-btn.active span:nth-child(2) {
            opacity: 0;
        }
        
        .mobile-menu-btn.active span:nth-child(3) {
            transform: rotate(-45deg) translate(5px, -5px);
        }
        
        @media (max-width: 768px) {
            .mobile-menu-btn {
                display: flex;
            }
            
            .nav-links {
                position: fixed;
                top: 0;
                right: -100%;
                width: 70%;
                height: 100vh;
                background: rgba(13, 13, 20, 0.98);
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 32px;
                transition: right 0.3s ease;
                backdrop-filter: blur(20px);
            }
            
            .nav-links.active {
                right: 0;
                display: flex !important;
            }
        }
    `;
    document.head.appendChild(style);

    navContainer.appendChild(hamburger);

    // Toggle menu
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// ================================
// Console Easter Egg
// ================================
console.log('%c مرحباً! 👋', 'font-size: 24px; font-weight: bold;');
console.log('%c أنا محمد عليق - مطور ومصمم مواقع', 'font-size: 14px; color: #7c4dff;');
console.log('%c هل أنت مطور أيضاً؟ دعنا نتواصل! 🚀', 'font-size: 12px; color: #888;');
