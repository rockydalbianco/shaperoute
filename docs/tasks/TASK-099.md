# TASK-099 — Commenti

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-099-comments`
**Dipende da**: TASK-097 · **Prima di aprirli a tutti**: TASK-100

## Obiettivo

Sotto un disegno pubblico gli iscritti leggono e scrivono commenti.

## Contesto da leggere

- `docs/API.md` (disegni), `docs/DATABASE.md`
- `apps/mobile/src/screens/DrawingScreen.tsx`

## Cosa fare

1. API: `GET /drawings/{id}/comments` (a pagine, dal più vecchio),
   `POST /drawings/{id}/comments` (testo semplice, 1–500 caratteri),
   `DELETE /comments/{id}` — cancella l'autore del commento o il
   proprietario del disegno. Limite di commenti al minuto per utente.
2. Feed e disegno portano il numero dei commenti.
3. App: sotto il disegno l'elenco (foto, nome, testo, quanto tempo fa), il
   campo per scrivere sopra la tastiera, tieni premuto per cancellare il
   proprio.
4. Il testo si mostra sempre come testo: niente link attivi, niente HTML
   (la mappa è in una WebView: un commento non ci entra mai).
5. Test; `API.md`, `DATABASE.md`, `UI.md`.

## Criteri di accettazione

- [ ] Commento vuoto, solo spazi o oltre 500 caratteri: rifiutato con il motivo.
- [ ] Chi non è autore né proprietario non può cancellare.
- [ ] Oltre il limite al minuto l'API risponde con un errore chiaro, e
      l'app lo dice.
- [ ] Cancellato il disegno o l'account, i commenti spariscono.
- [ ] Test verdi; prova sull'iPhone con due account.

## File toccati

```
services/api/shaperoute_api/comments.py
services/api/shaperoute_api/feed.py
services/api/shaperoute_api/drawings.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/schemas.py
services/api/migrations/
services/api/tests/test_comments.py
packages/shared-types/src/index.ts
apps/mobile/src/api/comments.ts
apps/mobile/src/api/comments.test.ts
apps/mobile/src/social/Comments.tsx
apps/mobile/src/social/Comments.test.tsx
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/screens/DrawingScreen.tsx
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-099.md
```

## Fuori scope

- Risposte a un commento, menzioni, like ai commenti, modifica.
- Notifiche. Segnalare e bloccare (TASK-100).

## Esito
