// Animations

document.addEventListener('DOMContentLoaded', function() {
    initAnimations();
    initMobileMenu();
});

function initAnimations() {
    createGeometricShapes();
    initCardTiltEffect();
    initParallaxEffect();
    initComparisonSlider();
}

// Create geometric shapes background
function createGeometricShapes() {
    const container = document.getElementById('geoBg');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < 20; i++) {
        const shape = document.createElement('div');
        shape.className = 'geo-shape';

        const size = Math.random() * 200 + 80;
        const type = Math.floor(Math.random() * 3);

        if (type === 0) {
            // Triangle
            shape.style.width = '0';
            shape.style.height = '0';
            shape.style.borderLeft = `${size/2}px solid transparent`;
            shape.style.borderRight = `${size/2}px solid transparent`;
            shape.style.borderBottom = `${size}px solid rgba(0, 128, 255, 0.15)`;
        } else if (type === 1) {
            // Square
            shape.style.width = size + 'px';
            shape.style.height = size + 'px';
        } else {
            // Circle
            shape.style.width = size + 'px';
            shape.style.height = size + 'px';
            shape.style.borderRadius = '50%';
        }

        shape.style.top = Math.random() * 100 + '%';
        shape.style.left = Math.random() * 100 + '%';
        shape.style.animationDelay = Math.random() * 10 + 's';
        shape.style.animationDuration = (Math.random() * 20 + 15) + 's';

        container.appendChild(shape);
    }
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

// Parallax throttlé via requestAnimationFrame
function initParallaxEffect() {
    let rafPending = false;
    let lastX = 0.5;
    let lastY = 0.5;

    document.addEventListener('mousemove', (e) => {
        lastX = e.clientX / window.innerWidth;
        lastY = e.clientY / window.innerHeight;

        if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(() => {
                const shapes = document.querySelectorAll('.geo-shape');
                shapes.forEach((shape, index) => {
                    const depth = (index % 5 + 1) * 3;
                    const moveX = (lastX - 0.5) * depth;
                    const moveY = (lastY - 0.5) * depth;
                    shape.style.transform = `translate(${moveX}px, ${moveY}px)`;
                });
                rafPending = false;
            });
        }
    });
}

// Menu mobile
function initMobileMenu() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('nav-menu--open');
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    // Fermer sur clic d'un lien
    menu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('nav-menu--open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Ouvrir le menu');
        });
    });

    // Fermer sur Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('nav-menu--open')) {
            menu.classList.remove('nav-menu--open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Ouvrir le menu');
            toggle.focus();
        }
    });
}

// Matrix Rain Effect
function createMatrixRain() {
    const container = document.getElementById('matrixBg');
    if (!container) return;

    container.innerHTML = '';
    const columns = Math.floor(window.innerWidth / 20);

    for (let i = 0; i < columns; i++) {
        const column = document.createElement('div');
        column.className = 'matrix-column';
        column.style.left = (i * 20) + 'px';
        column.style.animationDuration = (Math.random() * 3 + 2) + 's';
        column.style.animationDelay = (Math.random() * 2) + 's';

        let text = '';
        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン01';
        for (let j = 0; j < 30; j++) {
            text += chars[Math.floor(Math.random() * chars.length)] + '<br>';
        }
        column.innerHTML = text;

        container.appendChild(column);
    }
}

// Slider interactif pour la comparaison Ancienne plateforme vs Arrow
function initComparisonSlider() {
    const slider = document.getElementById('comparisonSlider');
    if (!slider) return;

    const handle = document.getElementById('sliderHandle');
    const arrowSide = document.querySelector('.side-arrow');

    if (!handle || !arrowSide) return;

    let isDragging = false;

    function updateSliderPosition(x) {
        const rect = slider.getBoundingClientRect();
        const position = Math.max(0, Math.min(x - rect.left, rect.width));
        const percentage = (position / rect.width) * 100;

        handle.style.setProperty('--slider-position', percentage + '%');
        arrowSide.style.setProperty('--slider-position', percentage + '%');
        handle.setAttribute('aria-valuenow', String(Math.round(percentage)));
    }

    // Accessibilité ARIA
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', 'Comparateur Ancienne plateforme / Arrow');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    handle.setAttribute('aria-valuenow', '50');
    handle.setAttribute('tabindex', '0');

    // Navigation clavier
    handle.addEventListener('keydown', (e) => {
        const current = parseInt(handle.getAttribute('aria-valuenow') || '50', 10);
        let next = current;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            next = Math.max(0, current - 5);
            e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            next = Math.min(100, current + 5);
            e.preventDefault();
        } else if (e.key === 'Home') {
            next = 0; e.preventDefault();
        } else if (e.key === 'End') {
            next = 100; e.preventDefault();
        }
        if (next !== current) {
            const rect = slider.getBoundingClientRect();
            updateSliderPosition(rect.left + (next / 100) * rect.width);
        }
    });

    // Mouse events
    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
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
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        updateSliderPosition(e.touches[0].clientX);
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Click anywhere on slider
    slider.addEventListener('click', (e) => {
        if (e.target !== handle && !e.target.closest('.slider-handle')) {
            updateSliderPosition(e.clientX);
        }
    });

    createMatrixRain();

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            createMatrixRain();
        }, 250);
    });
}
