# Arrow — Pipeline Auto Blog + Newsletter

Pipeline d'automatisation pour : générer des articles, créer des newsletters, et envoyer les newsletters via Resend.

## Architecture en bref

```
┌──────────────────────────────────────────────────────────────────┐
│  scripts/voice/arrow-voice.md  ← SOURCE DE VÉRITÉ DU TON ARROW   │
│  (injecté en système prompt cacheable dans chaque appel Claude)  │
└──────────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────┐
│ generate-post.ts  → mardi 9h Paris (cron GitHub Actions)         │
│  1. Pioche un sujet (Sanity topicBank) ou tire un pilier au sort │
│  2. Claude rédige l'article (1800-2600 mots, voix Arrow)         │
│  3. Quality gate (longueur, H2, anti-patterns IA)                │
│  4. Push dans Sanity → publishedAt = now                         │
│  5. Marque le topic comme "used"                                 │
└──────────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────┐
│ generate-newsletter.ts  → lundi 9h Paris                         │
│  Semaine paire  : DIGEST (récap des 4 derniers articles)         │
│  Semaine impaire: ÉDITORIAL (essai 400-700 mots dans la voix)    │
│  → crée un doc "newsletter" status=scheduled                     │
│  → scheduledFor = prochain mardi 9h                              │
└──────────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────┐
│ send-newsletter.ts  → toutes les heures                          │
│  Cherche les newsletters dont scheduledFor ≤ now                 │
│  → récupère les abonnés status=confirmed                         │
│  → rend le HTML (template Arrow, brand color #3d9bff)            │
│  → envoie via Resend avec List-Unsubscribe header                │
│  → met à jour status=sent + stats                                │
└──────────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Variables d'environnement (`.env`)

Copier les valeurs manquantes depuis `.env.example` :

```bash
ANTHROPIC_API_KEY=sk-ant-...                # console.anthropic.com
RESEND_API_KEY=re_...                       # resend.com
RESEND_FROM="Arrow <hey@arr0w.app>"
RESEND_REPLY_TO=hey@arr0w.app
NEWSLETTER_TOKEN_SECRET=$(openssl rand -base64 48)
PUBLIC_SITE_URL=https://arr0w.app
```

⚠️ Le domaine `arr0w.app` doit être **vérifié dans Resend** (DKIM/SPF/DMARC) avant l'envoi.

### 2. Déployer les schemas Sanity

```bash
npm run studio:deploy
```

Trois nouveaux types apparaissent dans le studio :
- **Sujet (banque)** — `topicBank` : pour piloter les idées d'articles
- **Newsletter** — `newsletter` : digest ou éditorial
- **Abonné newsletter** — `subscriber` : liste de diffusion (RGPD compliant)

### 3. (Optionnel) Pré-remplir le topicBank

Ouvrir le studio, créer 5-10 sujets en `status=ready` pour amorcer la pompe. Sinon, le générateur fonctionnera en mode autonome dès le premier run.

### 4. GitHub Actions secrets

Dans Settings → Secrets → Actions du repo, ajouter :

```
PUBLIC_SANITY_PROJECT_ID
PUBLIC_SANITY_DATASET
SANITY_API_TOKEN
ANTHROPIC_API_KEY
ANTHROPIC_MODEL          (optionnel)
PUBLIC_SITE_URL
NEWSLETTER_TOKEN_SECRET
RESEND_API_KEY
RESEND_FROM
RESEND_REPLY_TO
```

Le workflow `.github/workflows/content-pipeline.yml` se déclenche automatiquement selon la cadence cron.

## Commandes manuelles

```bash
# Générer un article maintenant
npm run pipeline:generate-post

# Générer une newsletter pour la semaine en cours
npm run pipeline:generate-newsletter

# Envoyer toutes les newsletters dues
npm run pipeline:send-newsletter
```

Côté GitHub : onglet **Actions → content-pipeline → Run workflow**, choisir le job dans le dropdown.

## Flow d'inscription newsletter

```
1. Visiteur soumet email sur le site
   ↓ POST /api/newsletter-subscribe
2. Doc subscriber créé status=pending
3. Email de confirmation envoyé (Resend)
   ↓ utilisateur clique
4. GET /api/newsletter-confirm?t=<jwt-like>
5. Doc passe status=confirmed
   ↓ entre dans la liste de diffusion
6. À chaque newsletter, footer email contient lien
   GET /api/newsletter-unsubscribe?t=<token-stable>
   → doc passe status=unsubscribed
```

### Sécurité

- **HMAC SHA-256** pour signer tous les tokens (confirm + unsubscribe)
- Le token de **confirmation** expire après 7 jours
- Le token d'**unsubscribe** est stable (généré une fois, stocké sur le doc — permet le 1-clic Gmail RFC 8058)
- Le header `List-Unsubscribe-Post: List-Unsubscribe=One-Click` est inclus dans chaque envoi

### RGPD

- Consentement horodaté + IP + User-Agent stockés sur le doc subscriber (champ `consent`)
- Lien de désinscription présent dans CHAQUE envoi (obligatoire)
- Le statut `bounced` ou `complained` est mis à jour si tu configures les webhooks Resend (à brancher sur `/api/newsletter-webhook` — à créer plus tard si besoin)

## Adapter la voix

Toute modification du fichier `scripts/voice/arrow-voice.md` change immédiatement la voix de TOUT le contenu généré (article, intro digest, éditorial).

Pour ajouter une **anti-pattern** à bannir : éditer la section "Anti-patterns IA à bannir" du voice profile **et** ajouter la regex correspondante dans `passesQualityGate()` de `generate-post.ts`.

## Coûts indicatifs

Avec `claude-sonnet-4-5` (modèle par défaut) :
- 1 article ≈ 5 000 input + 4 000 output tokens ≈ **~0,08 $**
- 1 newsletter ≈ 3 000 input + 1 500 output ≈ **~0,03 $**
- Cadence 1/sem + 1 newsletter bimensuelle ≈ **~0,40 $/mois**

Resend Free = 3 000 emails/mois (100/jour). Dès que la liste dépasse 100 abonnés sur un envoi, passer en plan payant ($20/mois pour 50 000).

## Garde-fous à connaître

- **Quality gate** (`generate-post.ts`) refuse les articles < 1500 mots, < 3 H2, ou contenant un anti-pattern. L'article est rejeté SANS publication — le pipeline replanifie pour la prochaine fenêtre cron.
- **Rate-limit Resend** (200 ms entre chaque envoi) — soft, à ajuster si tu prends un plan supérieur.
- **Idempotence** : si une newsletter est en `status=sending` et que le job retombe (timeout GitHub Actions), il faut la repasser manuellement à `scheduled` ou `failed` depuis le studio. Pour scale, ajouter un lock dans le doc.

## Évolutions probables

- [ ] Webhook Resend → mise à jour automatique des statuts bounced/complained
- [ ] Image de couverture générée (DALL·E ou Flux via API) pour chaque article
- [ ] A/B test des subject lines sur 10% de la liste avant envoi total
- [ ] Crosspost LinkedIn/Twitter automatique après publication
- [ ] Détection doublon sémantique (embedding) avant publication
