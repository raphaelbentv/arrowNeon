# Audit — Arrow Marketing Site

> Généré le 29 mars 2026. Organisé par priorité.

---

## 🔴 Critique — bloquant pour la mise en prod

| # | Problème | Fichier |
|---|----------|---------|
| 1 | **Footer absent** — le CSS existe mais aucun markup dans le layout | `src/layouts/BaseLayout.astro` |
| 2 | **Formulaire contact sans backend** — aucune soumission ne fonctionne | `src/pages/contact.astro` |
| 3 | **Pas de meta / OG tags** sur 6 pages sur 7 — invisible pour Google | toutes les pages |
| 4 | **Pas de sitemap.xml ni robots.txt** | `public/` |
| 5 | **Slider handle `#sliderHandle` absent du HTML** — le JS le cherche mais il n'existe pas | `src/pages/index.astro` |
| 6 | **Menu mobile non implémenté** — le bouton hamburger existe mais ne fait rien | `public/js/main.js` |
| 7 | **Pas de page 404 personnalisée** | `src/pages/` |

---

## 🟠 Important — qualité produit

| # | Problème | Fichier |
|---|----------|---------|
| 8 | **SEO structuré absent** — pas de Schema.org (Organization, SoftwareApplication) | toutes les pages |
| 9 | **Alt text manquant** sur toutes les images et icônes (emojis en dur) | toutes les pages |
| 10 | **Focus clavier non géré** sur le slider de comparaison | `public/js/main.js` |
| 11 | **Hiérarchie des titres incohérente** sur plusieurs pages (h1 → h3 sans h2) | pages diverses |
| 12 | **Validation formulaire absente** — uniquement `required` HTML, aucun retour utilisateur | `src/pages/contact.astro` |
| 13 | **Lazy loading absent** sur les images blog | `src/pages/blog/index.astro` |
| 14 | **Mouse parallax non throttlé** — déclenché à chaque pixel de mouvement | `public/js/main.js` |
| 15 | **`main.css` fait 2 369 lignes** avec probablement beaucoup de code mort | `public/styles/main.css` |
| 16 | **CSS page-spécifiques chargés globalement** — tous les CSS se chargent sur toutes les pages | `public/styles/arrow.css` |

---

## 🟡 Améliorations UX / contenu

| # | Problème |
|---|----------|
| 17 | **Pas de section FAQ** sur aucune page |
| 18 | **Pas de témoignages / clients** nulle part |
| 19 | **Section équipe sur À propos** trop vague — pas de vraies personnes ni photos |
| 20 | **Page "Pour qui ?"** devrait être déclinée par cible (Écoles / CFA / Formations pro) |
| 21 | **Pas d'analytics** (Google Analytics, Plausible, Matomo…) |
| 22 | **Pas de capture email / newsletter** |
| 23 | **Breadcrumbs** uniquement sur le blog, absents des autres pages |
| 24 | **Pas de cas clients / études de cas** |
| 25 | **Tarifs statiques** — aucune calculatrice ou formulaire de devis dynamique |

---

## 🔵 Dette technique

| # | Problème | Fichier |
|---|----------|---------|
| 26 | **Types `any` partout** dans les pages blog | `src/pages/blog/` |
| 27 | **Pas d'ESLint / Stylelint** configurés | racine |
| 28 | **Pas de tests** (ni unitaires ni e2e) | — |
| 29 | **CSS components inutilisés** — `loader.css`, `tooltip.css`, `divider.css` jamais appelés | `public/styles/components/` |
| 30 | **Nav hardcodée** dans BaseLayout au lieu d'un array de routes centralisé | `src/layouts/BaseLayout.astro` |
| 31 | **Pas de middleware** pour les headers de sécurité (CSP, X-Frame-Options…) | — |
| 32 | **Pas d'environnement staging** — une seule config pour dev et prod | `astro.config.mjs` |

---

## Ordre d'attaque recommandé

1. Footer + meta SEO + sitemap + robots.txt
2. Formulaire contact (Netlify Forms ou endpoint Astro)
3. Menu mobile
4. Page 404
5. Alt text + accessibilité clavier
6. Analytics
7. FAQ + témoignages
8. Nettoyage CSS + types TypeScript
