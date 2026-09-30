# TASK-119 — Like

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-119-likes`
**Dipende da**: TASK-118

## Obiettivo

Un iscritto mette e toglie il like a un disegno pubblico; ogni disegno
mostra quanti ne ha.

## Contesto da leggere

- `docs/API.md` (disegni, feed), `docs/DATABASE.md`
- `apps/mobile/src/social/DrawingCard.tsx`

## Cosa fare

1. API: `PUT /drawings/{id}/like` e `DELETE /drawings/{id}/like`,
   idempotenti; un like per utente per disegno, garantito dal database.
2. Feed e disegno portano `likes` e `liked_by_me`.
3. App: il cuore sulla tessera e sul disegno, che cambia subito e torna
   indietro se l'API rifiuta.
4. Test; `API.md`, `DATABASE.md`, `UI.md`.

## Criteri di accettazione

- [ ] Due `PUT` di fila dello stesso utente contano un like.
- [ ] Like a un disegno privato di un altro: «non trovato».
- [ ] Cancellato un disegno o un account, i suoi like spariscono.
- [ ] Senza rete il cuore torna com'era, con un avviso.
- [ ] Test verdi; prova sull'iPhone con due account.

## File toccati

```
services/api/shaperoute_api/likes.py
services/api/shaperoute_api/feed.py
services/api/shaperoute_api/drawings.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/schemas.py
services/api/migrations/
services/api/tests/test_likes.py
packages/shared-types/src/index.ts
apps/mobile/src/api/likes.ts
apps/mobile/src/api/likes.test.ts
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/social/LikeButton.tsx
apps/mobile/src/social/LikeButton.test.tsx
apps/mobile/src/screens/DrawingScreen.tsx
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-119.md
```

## Fuori scope

- L'elenco di chi ha messo like. Notifiche.

## Esito
