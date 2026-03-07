# Ready To Sell TODO (Pamplia)

Derniere mise a jour: 2026-03-07

## Fait

- [x] Billing manuel multi-tenant (cash/bank/paypal) avec historique des paiements.
- [x] Activation/suspension tenant depuis le dashboard super admin.
- [x] Filtres billing (active/trial/overdue/suspended/due soon).
- [x] Actions bulk super admin (activer, marquer overdue, suspendre).
- [x] Action "Run Overdue Sweep" pour suspendre automatiquement les tenants expires.
- [x] Disponibilites reelles sur la page de reservation (plus de slots mockes).
- [x] Landing page marketing FR sur `/` avec SEO de base (title, description, OG, Twitter).
- [x] Funnel conversion `/demo` (WhatsApp CTA + offre Casablanca 48h).
- [x] Toolkit ops: `ops/backup_db.sh`, `ops/restore_db.sh`, `ops/healthcheck.sh`, `ops/SETUP.md`.
- [x] Backups locaux avec retention + checksum.
- [x] Remplacement des placeholders marketing par des visuels produit locaux (`/landing/*.svg`).

## En Cours

- [ ] Remplacer les visuels locaux par des captures reelles du SaaS en production (booking, planning, dashboard).

## A Faire Priorite Haute (pour vendre)

- [ ] Rotation des secrets exposes (mail/db) et nettoyage config pour variables d'environnement uniquement.
- [ ] Onboarding rapide tenant (wizard: nom salon, services, staff, horaires, logo).
- [ ] Fiabilite rappels (job monitoring + retries visibles + logs de statut).
- [ ] Observabilite minimale prod (logs applicatifs, erreurs centralisees, alerte downtime).

## A Faire Priorite Moyenne (apres 1ers clients)

- [ ] Page tarifs FR claire (setup fee + abonnement mensuel MAD).
- [ ] Pages confiance: CGU, Politique de confidentialite, Contact support.
- [ ] Script commercial outbound (DM/WhatsApp) + template de demo.
- [ ] Dashboard KPI orienté business (nouveaux clients, no-show rate, taux confirmation).
- [ ] Tests critiques automatiques (API auth, booking, billing, overdue sweep).

## A Faire Priorite Basse

- [ ] Intégration WhatsApp reminders avancée.
- [ ] Automatisation facturation recurrrente complete.
- [ ] Multi-langue FR/AR propre sur toute l'app.
