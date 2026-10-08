# TASK-118 — Il feed: i disegni degli altri

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-118-feed`
**Dipende da**: TASK-117

> Fatto il 2026-10-08 nella versione semplice chiesta dall'utente il
> 2026-10-07 («ok va bene questo semplice»): ADR-0227. Questo piano è
> quello di prima; dove differisce vale il brief del coordinatore: niente
> `GET /users/{id}/drawings` (c'è già, TASK-117), niente punteggio
> (TASK-241), il feed va in `screens/FeedScreen.tsx` e in `src/feed/*`,
> l'API in `feed.py`.

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

- [x] Il feed non contiene mai disegni privati né tracce non tagliate
      (`test_feed.py`: `only_me` mai, nemmeno al proprietario; `followers`
      solo con la richiesta accettata; nell'elenco solo `track_preview`).
- [x] Due pagine consecutive non ripetono e non saltano disegni, anche se
      nel frattempo ne arriva uno nuovo (cursore a chiave
      `gruppo-microsecondi-id`; test con due disegni nuovi fra le pagine).
- [x] La risposta di una pagina pesa meno di 200 kB con 20 disegni da 21 km
      (test con descrizione di 500 caratteri e due tag per disegno).
- [x] Test verdi in API e app.
- [ ] Prova sull'iPhone con due account: dell'utente, dopo il server e la
      pubblicazione.

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

Fatto il 2026-10-08 (ADR-0227). API: `GET /feed?limit&cursor&lat&lon` in
`feed.py`, registrato in `app.py`; i propri disegni, poi quelli di chi si
segue, poi i vicini (50 km; tutti senza posizione), dal più recente per
`published_at`; ogni post è il `Drawing` del profilo più `author`;
nessuna migrazione. App: `src/api/feed.ts`, `src/feed/useFeed.ts`
(lettura quando la pagina è sullo schermo, tira per aggiornare, pagina
dopo in fondo), `src/feed/feedPosts.ts` (il disegno sulla scheda degli
esempi), `FeedScreen` con i disegni veri e gli esempi come riempitivo; un
tocco apre il disegno intero con reazioni e commenti. Testo nuovo solo
per VoiceOver, «{user}: {title}. {facts}.», nelle cinque lingue. File
fuori dall'elenco, con il coordinatore: una riga in `App.tsx` (la
posizione) e `ProfileLayer.tsx` («←» dal disegno aperto dal Feed).
Restano: il server (senza migrazioni) e la pubblicazione, la prova
sull'iPhone con due account; seguiti in ADR-0227 (indice su
`published_at`, foto dell'autore, il nome che apre il profilo).
