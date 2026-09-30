# TASK-118 — Il feed: i disegni degli altri

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-118-feed`
**Dipende da**: TASK-117

## Obiettivo

Una scheda «Feed» mostra i disegni pubblicati dagli iscritti, dal più
recente, e da lì si arriva al disegno e al profilo di chi l'ha fatto.

## Contesto da leggere

- `docs/API.md` (disegni), `docs/DATABASE.md`
- `docs/UI.md` (schede, disegno)

## Cosa fare

1. API: `GET /feed?before=<cursore>&limit=20` — solo disegni pubblici, con
   autore (nome e foto), forma, distanza, punteggio, data, traccia tagliata
   e semplificata per la miniatura. A pagine, con cursore.
2. `GET /users/{id}/drawings`: i disegni pubblici di un utente.
3. App: scheda «Feed» con le tessere (miniatura, autore, punteggio), tira
   per aggiornare, carica altri in fondo; il tocco apre `DrawingScreen`, il
   nome apre il profilo con la sua griglia.
4. Stati vuoti: nessun disegno ancora, senza rete, senza account (il feed
   si legge solo da iscritti: proposta, conferma in TASK-110 punto 5).
5. Test di API e app; `API.md`, `UI.md`.

## Criteri di accettazione

- [ ] Il feed non contiene mai disegni privati né tracce non tagliate.
- [ ] Due pagine consecutive non ripetono e non saltano disegni, anche se
      nel frattempo ne arriva uno nuovo.
- [ ] La risposta di una pagina pesa meno di 200 kB con 20 disegni da 21 km.
- [ ] Test verdi; prova sull'iPhone con due account.

## File toccati

```
services/api/shaperoute_api/feed.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/schemas.py
services/api/tests/test_feed.py
packages/shared-types/src/index.ts
apps/mobile/src/api/feed.ts
apps/mobile/src/api/feed.test.ts
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/screens/FeedScreen.test.tsx
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/screens/Tabs.tsx
apps/mobile/src/social/DrawingCard.tsx
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-118.md
```

## Fuori scope

- Like e commenti (TASK-119, TASK-120).
- Seguire utenti, feed «vicino a me», classifica, ricerca.
- «Corri anche tu questo disegno»: annotare come idea.

## Esito
