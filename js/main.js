/**
 * Purity Crunch Main JS
 * Navbar scroll, mobile menu, scroll animations, active nav,
 * counter animations, product modal, video overlay, FAQ accordion,
 * process line, form submission
 */

document.addEventListener('DOMContentLoaded', () => {

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ─── Navbar scroll effect ───────────────────────────────────────────────
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // ─── Mobile menu toggle ──────────────────────────────────────────────────
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('active');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.toggle('ph-list', !isOpen);
            icon.classList.toggle('ph-x', isOpen);
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.add('ph-list');
                icon.classList.remove('ph-x');
            });
        });
    }

    // ─── Scroll animations (Intersection Observer) ──────────────────────────
    const initScrollAnimations = () => {
        const elements = document.querySelectorAll('.fade-up, .fade-in-left, .fade-in-right');
        if (prefersReducedMotion) {
            elements.forEach(el => el.classList.add('visible'));
            return;
        }
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        elements.forEach(el => observer.observe(el));
    };
    initScrollAnimations();

    // ─── Active nav highlight ────────────────────────────────────────────────
    const sections = document.querySelectorAll('section[id], header[id]');
    const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]:not(.btn)');
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navAnchors.forEach(a => {
                    a.classList.toggle('active-nav', a.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, { threshold: 0.4 });
    sections.forEach(s => sectionObserver.observe(s));

    // ─── Counter animations ──────────────────────────────────────────────────
    const initCounters = () => {
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;

        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

        const animateCounter = (el) => {
            const target = parseInt(el.dataset.count, 10);
            const suffix = el.dataset.suffix || '';
            const duration = prefersReducedMotion ? 0 : 1400;
            const start = performance.now();

            const tick = (now) => {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const value = Math.round(easeOutCubic(progress) * target);
                el.textContent = value + suffix;
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };

        const obs = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(el => obs.observe(el));
    };
    initCounters();

    // ─── Product Modal ───────────────────────────────────────────────────────
    const initProductModal = () => {
        const overlay = document.getElementById('product-modal-overlay');
        const modalImg = document.getElementById('modal-img');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        const modalClose = document.getElementById('modal-close');
        const modalCta = document.getElementById('modal-cta');
        if (!overlay) return;

        const openModal = (btn) => {
            modalImg.src = btn.dataset.img || '';
            modalImg.alt = btn.dataset.name || '';
            modalTitle.textContent = btn.dataset.name || '';
            modalDesc.textContent = btn.dataset.desc || '';
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            modalClose.focus();
        };

        const closeModal = () => {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        };

        document.querySelectorAll('.quick-view-btn').forEach(btn => {
            btn.addEventListener('click', () => openModal(btn));
        });

        modalClose.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

        // Close modal and scroll to form when CTA clicked
        modalCta.addEventListener('click', closeModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
        });
    };
    initProductModal();

    // ─── Video poster overlay ────────────────────────────────────────────────
    const initVideoOverlay = () => {
        document.querySelectorAll('.video-poster-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                const videoId = overlay.dataset.target;
                const video = document.getElementById(videoId);
                if (!video) return;
                overlay.classList.add('hidden');
                video.play();
            });
        });
    };
    initVideoOverlay();

    // ─── FAQ Accordion ───────────────────────────────────────────────────────
    const initAccordion = () => {
        document.querySelectorAll('.faq-question').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.faq-item');
                const answer = item.querySelector('.faq-answer');
                const isOpen = item.classList.contains('open');

                // Close all others
                document.querySelectorAll('.faq-item.open').forEach(openItem => {
                    openItem.classList.remove('open');
                    openItem.querySelector('.faq-answer').style.maxHeight = null;
                    openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                });

                if (!isOpen) {
                    item.classList.add('open');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        });
    };
    initAccordion();

    // ─── Process connecting line ─────────────────────────────────────────────
    const initProcessLine = () => {
        const steps = document.getElementById('process-steps');
        if (!steps || prefersReducedMotion) {
            if (steps) steps.classList.add('line-visible');
            return;
        }
        const obs = new IntersectionObserver(([entry], observer) => {
            if (entry.isIntersecting) {
                steps.classList.add('line-visible');
                observer.unobserve(steps);
            }
        }, { threshold: 0.3 });
        obs.observe(steps);
    };
    initProcessLine();

    // ─── Form submission ─────────────────────────────────────────────────────
    const form = document.getElementById('inquiry-form');
    const submitBtn = document.getElementById('submit-btn');
    const formMessage = document.getElementById('form-message');

    if (form && submitBtn && formMessage) {
        const btnText = submitBtn.querySelector('.btn-text');
        const btnIcon = submitBtn.querySelector('.btn-icon');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const requiredFields = form.querySelectorAll('[required]');
            let firstInvalid = null;
            requiredFields.forEach(field => {
                if (!field.value.trim() && !firstInvalid) firstInvalid = field;
            });
            if (firstInvalid) { firstInvalid.focus(); return; }

            submitBtn.setAttribute('aria-busy', 'true');
            btnText.textContent = 'Sending…';
            btnIcon.style.display = 'none';
            btnSpinner.style.display = 'inline-block';
            formMessage.className = 'form-message';
            formMessage.textContent = '';

            const data = Object.fromEntries(new FormData(form).entries());
            const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDs08DF1A08MimgYV8vSTSy9mOiVNlab-lyPx7JLYgU7uLq5Fju2DmHQLyJkfDGfuOpw/exec';

            try {
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const result = await response.json();
                if (result.status === 'success') {
                    formMessage.className = 'form-message success';
                    formMessage.textContent = 'Inquiry sent successfully! Our export team will contact you soon.';
                    form.reset();
                } else {
                    throw new Error(result.message || 'Unknown error occurred');
                }
            } catch (error) {
                console.error('Submission error:', error);
                formMessage.className = 'form-message error';
                formMessage.textContent = 'Sorry, there was an error sending your inquiry: ' + error.message;
            } finally {
                submitBtn.removeAttribute('aria-busy');
                btnText.textContent = 'Request a Quote & Sample';
                btnIcon.style.display = 'inline-block';
                btnSpinner.style.display = 'none';
                formMessage.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
            }
        });
    }

});
