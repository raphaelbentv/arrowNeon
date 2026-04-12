// Animations

document.addEventListener('DOMContentLoaded', function() {
    // Initialisation des animations
    initAnimations();
    // Fermeture des modals au clic sur l'overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
});

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        if (overlay.style.display === 'flex') closeModal(overlay.id);
    });
});

function initAnimations() {
    // Create geometric shapes background
    createGeometricShapes();

    // 3D Card Tilt Effect on mouse move
    initCardTiltEffect();

    // Subtle parallax effect for background shapes
    initParallaxEffect();
    
    // Comparison slider
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

// Subtle parallax effect for background shapes
function initParallaxEffect() {
    document.addEventListener('mousemove', (e) => {
        const shapes = document.querySelectorAll('.geo-shape');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        shapes.forEach((shape, index) => {
            const depth = (index % 5 + 1) * 3;
            const moveX = (x - 0.5) * depth;
            const moveY = (y - 0.5) * depth;
            
            shape.style.transform += ` translate(${moveX}px, ${moveY}px)`;
        });
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
    }
    
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
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        updateSliderPosition(e.touches[0].clientX);
        e.preventDefault();
    });
    
    document.addEventListener('touchend', () => {
        isDragging = false;
    });
    
    // Click anywhere on slider
    slider.addEventListener('click', (e) => {
        if (e.target !== handle && !e.target.closest('.slider-handle')) {
            updateSliderPosition(e.clientX);
        }
    });
    
    // Create matrix rain effect
    createMatrixRain();
    
    // Recreate matrix on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            createMatrixRain();
        }, 250);
    });
}
