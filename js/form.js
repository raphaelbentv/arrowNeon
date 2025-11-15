// Gestion formulaire

document.addEventListener('DOMContentLoaded', function() {
    // Initialisation de la gestion des formulaires
    initFormHandlers();
});

function initFormHandlers() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Récupération des données du formulaire
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);
            
            // Ici, vous pouvez ajouter l'envoi des données à votre backend
            // Par exemple avec fetch API
            console.log('Données du formulaire:', data);
            
            // Message de confirmation (à remplacer par un vrai traitement)
            alert('Merci pour votre demande ! Nous vous contacterons sous peu.');
            
            // Réinitialisation du formulaire
            contactForm.reset();
        });
    }
}

