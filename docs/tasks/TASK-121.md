# TASK-121 — Segnalare, bloccare, cancellare i propri dati

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-121-report-block`
**Dipende da**: TASK-120

## Obiettivo

Chi vede un contenuto o un utente sgradito lo segnala e lo blocca, e chi
gestisce l'app può toglierlo. Senza questo la parte social non si apre a
persone che non si conoscono.

## Contesto da leggere

- `docs/PRODUCT.md` (parte social), ADR di TASK-110 sui contenuti
- `docs/API.md` (disegni, commenti, profili), `docs/DATABASE.md`

## Cosa fare

1. API: `POST /reports` (disegno, commento o utente, con un motivo da un
   elenco); `PUT`/`DELETE /users/{id}/block`. Feed, commenti e profili non
   mostrano gli utenti bloccati, in tutti e due i sensi.
2. Per chi gestisce: gli utenti con il ruolo `admin` leggono le
   segnalazioni (`GET /admin/reports`) e nascondono un disegno, un commento
   o un utente. Per ora senza schermate: dall'API (`/docs`).
3. `DELETE /me` (TASK-114) cancella davvero tutto: disegni, tracce, foto,
   like, commenti. Un test lo dimostra tabella per tabella.
4. App: «Report» e «Block» dal menu di un disegno, di un commento e di un
   profilo; «Blocked users» nel profilo, per sbloccare; al primo accesso le
   regole in due righe, da accettare.
5. Test; `API.md`, `DATABASE.md`, `UI.md`, `PRODUCT.md`.

## Criteri di accettazione

- [ ] Bloccato un utente, i suoi disegni e commenti non compaiono più, e
      lui non vede i miei.
- [ ] Un contenuto nascosto da un admin non esce da nessun endpoint pubblico.
- [ ] Gli endpoint `/admin` rispondono «vietato» a chi non è admin.
- [ ] Dopo `DELETE /me` nessuna tabella ha righe di quell'utente.
- [ ] Test verdi; prova sull'iPhone con due account.

## File toccati

```
services/api/shaperoute_api/moderation.py
services/api/shaperoute_api/accounts.py
services/api/shaperoute_api/feed.py
services/api/shaperoute_api/comments.py
services/api/shaperoute_api/profiles.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/schemas.py
services/api/migrations/
services/api/tests/test_moderation.py
services/api/tests/test_account_deletion.py
packages/shared-types/src/index.ts
apps/mobile/src/api/moderation.ts
apps/mobile/src/api/moderation.test.ts
apps/mobile/src/social/ReportMenu.tsx
apps/mobile/src/social/ReportMenu.test.tsx
apps/mobile/src/screens/BlockedUsersScreen.tsx
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/screens/DrawingScreen.tsx
apps/mobile/src/social/Comments.tsx
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/PRODUCT.md
docs/STATUS.md
docs/tasks/TASK-121.md
```

## Fuori scope

- Filtri automatici sulle parole, un pannello per gli admin.
- Avvisi via email a chi è stato segnalato.

## Esito
