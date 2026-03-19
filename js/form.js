// Gestion formulaire

document.addEventListener('DOMContentLoaded', function() {
    initFormHandlers();
});

function sanitizeInput(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    if (!phone) return true; // optional field
    return /^[\d\s\+\-\.\(\)]{6,20}$/.test(phone);
}

function initFormHandlers() {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);

            // Validation
            if (!data.nom || data.nom.trim().length < 2) {
                showFormFeedback(contactForm, 'Veuillez entrer un nom valide.', 'error');
                return;
            }

            if (!validateEmail(data.email)) {
                showFormFeedback(contactForm, 'Veuillez entrer une adresse email valide.', 'error');
                return;
            }

            if (!validatePhone(data.telephone)) {
                showFormFeedback(contactForm, 'Veuillez entrer un numero de telephone valide.', 'error');
                return;
            }

            if (!data.message || data.message.trim().length < 10) {
                showFormFeedback(contactForm, 'Veuillez entrer un message d\'au moins 10 caracteres.', 'error');
                return;
            }

            // Sanitize
            const sanitizedData = {};
            for (const [key, value] of Object.entries(data)) {
                sanitizedData[key] = sanitizeInput(value.trim());
            }

            console.log('Donnees du formulaire:', sanitizedData);

            showFormFeedback(contactForm, 'Merci pour votre demande ! Nous vous contacterons sous peu.', 'success');
            contactForm.reset();
        });
    }
}

function showFormFeedback(form, message, type) {
    let feedback = form.querySelector('.form-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'form-feedback';
        feedback.setAttribute('role', 'alert');
        form.prepend(feedback);
    }
    feedback.textContent = message;
    feedback.style.padding = '15px';
    feedback.style.marginBottom = '20px';
    feedback.style.fontWeight = '600';
    feedback.style.letterSpacing = '1px';
    if (type === 'error') {
        feedback.style.background = 'rgba(255, 0, 100, 0.15)';
        feedback.style.border = '2px solid #FF0064';
        feedback.style.color = '#FF0064';
    } else {
        feedback.style.background = 'rgba(0, 255, 100, 0.15)';
        feedback.style.border = '2px solid #00FF64';
        feedback.style.color = '#00FF64';
    }

    if (type === 'success') {
        setTimeout(() => feedback.remove(), 5000);
    }
}
