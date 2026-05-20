// Animations

document.addEventListener('DOMContentLoaded', function() {
    // Initialisation des animations
    initThemeToggle();
    initAnimations();
    initNavigation();
    initAnalytics();
    hydrateModalForms(document);
    initConsentGates(document);
    initModalTriggers();
    initModalControls();
    // Fermeture des modals au clic sur l'overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
});

let activeModal = null;
let lastFocusedElement = null;

function getCurrentTheme() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;

    document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
        const isLight = nextTheme === 'light';
        toggle.setAttribute('aria-pressed', String(isLight));
        toggle.setAttribute('aria-label', isLight ? 'Activer le mode sombre' : 'Activer le mode clair');
        toggle.setAttribute('title', isLight ? 'Activer le mode sombre' : 'Activer le mode clair');
    });
}

function initThemeToggle() {
    applyTheme(getCurrentTheme());

    document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const nextTheme = getCurrentTheme() === 'light' ? 'dark' : 'light';
            applyTheme(nextTheme);

            try {
                window.localStorage.setItem('arrow-theme', nextTheme);
            } catch {}

            trackEvent('site_theme_changed', {
                theme: nextTheme,
                pathname: window.location.pathname,
            });
        });
    });
}

function getFocusableElements(scope) {
    return Array.from(scope.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.offsetParent !== null);
}

function openModal(id, trigger) {
    const modal = document.getElementById(id);
    if (!modal) return;

    if (activeModal && activeModal !== modal) {
        activeModal.setAttribute('aria-hidden', 'true');
        activeModal.style.display = 'none';
        activeModal = null;
    }

    lastFocusedElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
    hydrateModalForms(modal);
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    activeModal = modal;

    const autofocusTarget = modal.querySelector('[data-modal-autofocus]');
    const [firstFocusable] = getFocusableElements(modal);
    const focusTarget = autofocusTarget instanceof HTMLElement ? autofocusTarget : firstFocusable;
    if (focusTarget) {
        window.requestAnimationFrame(() => focusTarget.focus());
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    if (activeModal === modal) {
        activeModal = null;
    }
    if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus();
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            if (overlay.style.display === 'flex') closeModal(overlay.id);
        });
        return;
    }

    if (e.key !== 'Tab' || !activeModal) return;

    const focusableElements = getFocusableElements(activeModal);
    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
        return;
    }

    if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
    }
});

function initAnimations() {
    initCardGlowInteractions();

    // 3D Card Tilt Effect on mouse move
    initCardTiltEffect();

    // Comparison slider
    initComparisonSlider();
}

function initNavigation() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');

    if (!toggle || !menu) return;

    function setMenuState(isOpen) {
        toggle.classList.toggle('active', isOpen);
        menu.classList.toggle('active', isOpen);
        document.body.classList.toggle('nav-open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    }

    toggle.addEventListener('click', () => {
        const isOpen = !toggle.classList.contains('active');
        setMenuState(isOpen);
    });

    menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            setMenuState(false);
        });
    });
}

function initModalTriggers() {
    document.querySelectorAll('[data-open-modal]').forEach((trigger) => {
        trigger.addEventListener('click', (event) => {
            const modalId = trigger.getAttribute('data-open-modal');
            if (!modalId) return;

            event.preventDefault();
            openModal(modalId, trigger);
        });
    });
}

function initModalControls() {
    document.querySelectorAll('[data-close-modal]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const modalId = trigger.getAttribute('data-close-modal');
            if (!modalId) return;
            closeModal(modalId);
        });
    });
}

function hydrateModalForms(scope) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    scope.querySelectorAll('[data-form-next]').forEach((input) => {
        input.value = `${origin}/merci-beta`;
    });

    scope.querySelectorAll('[data-form-source]').forEach((input) => {
        input.value = pathname || '/';
    });
}

function initConsentGates(scope) {
    scope.querySelectorAll('form').forEach((form) => {
        const consentInput = form.querySelector('input[type="checkbox"][name="ConsentementRGPD"]');
        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');

        if (!(consentInput instanceof HTMLInputElement) || !(submitButton instanceof HTMLElement)) return;

        function updateSubmitState() {
            const isAllowed = consentInput.checked;
            submitButton.toggleAttribute('disabled', !isAllowed);
            submitButton.setAttribute('aria-disabled', String(!isAllowed));
        }

        updateSubmitState();
        consentInput.addEventListener('change', updateSubmitState);

        form.addEventListener('submit', (event) => {
            if (consentInput.checked) return;
            event.preventDefault();
            updateSubmitState();
            consentInput.reportValidity();
            consentInput.focus();
        });
    });
}

function trackEvent(eventName, properties = {}) {
    if (typeof window === 'undefined' || !window.posthog || typeof window.posthog.capture !== 'function') {
        return;
    }

    window.posthog.capture(eventName, properties);
}

function initAnalytics() {
    document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-track]');
        if (!target) return;

        trackEvent('site_cta_clicked', {
            label: target.dataset.track,
            href: target.getAttribute('href') || null,
            text: target.textContent ? target.textContent.trim() : null,
            pathname: window.location.pathname,
        });
    });
}

function initCardGlowInteractions() {
    const cardSelector = [
        '.card',
        '.cyber-card',
        '.blog-card',
        '.feature-tile',
        '.motion-demo-card',
        '.establishment-card',
        '.value-card',
        '.beta-card',
        '.demo-card',
        '.brutal-problem-card',
        '.brutal-usp-card',
    ].join(',');

    document.querySelectorAll(cardSelector).forEach((card) => {
        card.addEventListener('click', (event) => {
            const rect = card.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;

            card.style.setProperty('--glow-x', `${Math.max(0, Math.min(100, x))}%`);
            card.style.setProperty('--glow-y', `${Math.max(0, Math.min(100, y))}%`);
            card.classList.remove('card--glow-active');
            void card.offsetWidth;
            card.classList.add('card--glow-active');

            window.setTimeout(() => {
                card.classList.remove('card--glow-active');
            }, 1500);
        });
    });
}

// 3D Card Tilt Effect on mouse move
function initCardTiltEffect() {
    document.querySelectorAll('.cyber-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-20px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// Slider interactif pour la comparaison Ancienne plateforme vs Arrow
function initComparisonSlider() {
    const slider = document.getElementById('comparisonSlider');
    if (!slider) return;
    
    const handle = document.getElementById('sliderHandle');
    const arrowSide = document.querySelector('.side-arrow');
    
    if (!handle || !arrowSide) return;
    
    let isDragging = false;
    let lastTrackedBucket = null;
    let currentPercentage = 50;

    function applySliderPosition(percentage) {
        currentPercentage = Math.max(0, Math.min(percentage, 100));
        const roundedPercentage = Math.round(currentPercentage);

        handle.style.setProperty('--slider-position', currentPercentage + '%');
        arrowSide.style.setProperty('--slider-position', currentPercentage + '%');
        handle.setAttribute('aria-valuenow', String(roundedPercentage));
        handle.setAttribute('aria-valuetext', `${roundedPercentage} pourcent Arrow`);

        const bucket = Math.round(currentPercentage / 10) * 10;
        if (bucket !== lastTrackedBucket) {
            lastTrackedBucket = bucket;
            trackEvent('comparison_slider_changed', {
                bucket,
                pathname: window.location.pathname,
            });
        }
    }
    
    function updateSliderPosition(x) {
        const rect = slider.getBoundingClientRect();
        const position = Math.max(0, Math.min(x - rect.left, rect.width));
        const percentage = (position / rect.width) * 100;

        applySliderPosition(percentage);
    }

    function nudgeSlider(delta) {
        applySliderPosition(currentPercentage + delta);
    }

    applySliderPosition(currentPercentage);
    
    // Mouse events
    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        trackEvent('comparison_slider_drag_started', { pathname: window.location.pathname });
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        updateSliderPosition(e.clientX);
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Touch events
    handle.addEventListener('touchstart', (e) => {
        isDragging = true;
        trackEvent('comparison_slider_drag_started', { pathname: window.location.pathname, input: 'touch' });
        e.preventDefault();
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        updateSliderPosition(e.touches[0].clientX);
        e.preventDefault();
    });
    
    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    handle.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            nudgeSlider(-5);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nudgeSlider(5);
        } else if (e.key === 'Home') {
            e.preventDefault();
            applySliderPosition(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            applySliderPosition(100);
        }
    });
    
    // Click anywhere on slider
    slider.addEventListener('click', (e) => {
        if (e.target !== handle && !e.target.closest('.slider-handle')) {
            updateSliderPosition(e.clientX);
            trackEvent('comparison_slider_clicked', { pathname: window.location.pathname });
        }
    });
}
