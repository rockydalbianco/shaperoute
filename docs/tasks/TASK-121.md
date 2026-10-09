# TASK-121 — Segnalare, bloccare, cancellare i propri dati

**Stato**: Done · ADR-0228
**Fase**: 4 · **Branch**: `feat/TASK-121-report-block`
**Dipende da**: TASK-120

## Obiettivo

Chi vede un contenuto o un utente sgradito lo segnala e lo blocca, e chi
gestisce l'app può toglierlo. Senza questo la parte social non si apre a
persone che non si conoscono.

## Contesto da leggere

- `docs/PRODUCT.md` (parte social), ADR di TASK-110 sui contenuti
- `docs/API.md` (disegni, commenti, profili), `docs/DATABASE.md`

## Il brief del coordinatore (2026-10-07/08)

Vale dove differisce dal piano sotto: **niente endpoint `/admin`, niente
regole al primo accesso, niente rifacimento di `DELETE /me`**. Il blocco
nasconde nei due sensi in feed, commenti, reazioni, ricerca, elenchi e
richieste di follow, profilo; chiude ogni follow fra i due.
`GET /me/blocked` per sbloccare. App: «Report» e «Block» in un «…» sul
post del feed e sul profilo di un altro, con conferma; «Blocked people»
in «Profile».

## Cosa fare (il piano di prima)

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

Adattati dal brief:

- [x] Bloccato un utente, i suoi disegni, commenti e reazioni non compaiono
      più, e lui non vede i miei, in ogni endpoint del brief (un test per
      endpoint, `tests/test_moderation.py`).
- [x] Un secondo blocco, o sbloccare chi non è bloccato, non cambia niente.
- [x] Segnalare due volte la stessa cosa tiene una riga per chi segnala.
- [x] `DELETE /me` cancella anche blocchi e segnalazioni dell'account.
- [x] Senza token `401`, senza database `503`.
- [x] Il menu, la conferma e «Blocked people» hanno i loro test.
- [x] Test deterministici verdi nell'API e nell'app.
- [ ] I testi nuovi confermati dall'utente nelle cinque lingue.
- [ ] Prova sull'iPhone con due account (dopo la migrazione sul server).

~~Contenuto nascosto da un admin, endpoint `/admin`: fuori dal brief.~~

## File toccati

```
services/api/migrations/0020_moderation.sql
services/api/shaperoute_api/moderation.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/feed.py
services/api/shaperoute_api/comments.py
services/api/shaperoute_api/reactions.py
services/api/shaperoute_api/follows.py
services/api/shaperoute_api/profiles.py
services/api/tests/test_moderation.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/report-request.json
packages/shared-types/test/moderation.test.ts
apps/mobile/src/api/moderation.ts
apps/mobile/src/api/moderation.test.ts
apps/mobile/src/social/ReportMenu.tsx
apps/mobile/src/social/ReportMenu.test.tsx
apps/mobile/src/social/BlockedPeople.tsx
apps/mobile/src/social/BlockedPeople.test.tsx
apps/mobile/src/social/blockedNow.ts
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/feed/FeedPostReport.test.tsx
apps/mobile/src/profile/UserProfilePage.tsx
apps/mobile/src/profile/UserProfileReport.test.tsx
apps/mobile/src/profile/ProfileHome.tsx
apps/mobile/src/profile/ProfileHomeBlocked.test.tsx
apps/mobile/src/i18n/it.ts, de.ts, es.ts, fr.ts (righe in fondo)
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md (ADR-0228, in fondo)
docs/STATUS.md (una voce in «Completato»)
docs/tasks/TASK-121.md
```

`people.py` del brief non esiste: la ricerca per nome sta in
`follows.py`. `schemas.py` non è servito: il corpo della segnalazione sta
in `moderation.py`, come i corpi degli altri moduli.

## Fuori scope

- Filtri automatici sulle parole, un pannello per gli admin.
- Avvisi via email a chi è stato segnalato.

## Esito

Fatto il 2026-10-09 (branch `feat/TASK-121-report-block`, ADR-0228).
Migrazione `0020_moderation.sql` con `blocks` e `reports`. Un blocco, fatto
da uno dei due, li tiene lontani nei due sensi: feed, commenti (né letti,
né scritti, né contati), reazioni (non contate; il disegno dell'altro non
si apre da commenti e reazioni), ricerca per nome, richiesta di follow e
profilo (`404`); chiude ogni follow fra i due. La condizione è una,
`follows.apart_sql`. `POST /reports` tiene una riga per chi segnala e per
cosa (disegno, commento, persona) con uno di cinque motivi; nessun
endpoint le legge. Nell'app: il «…» sul post di un altro in «Feed» e sul
profilo di un altro, il foglio con «Report» (cinque motivi, poi un grazie)
e «Block» (con conferma); bloccato, le schede spariscono subito e il
profilo lo dice; «Blocked people» in «Profile» con «Unblock». 21 testi
nuovi in fondo alle quattro tabelle.

Test: 25 in `test_moderation.py` e 213 dei moduli toccati verdi (API in
PostgreSQL); app 350 suite verdi (le sei più grandi rilanciate da sole
dopo il timeout del giro completo), typecheck e Prettier puliti. In
locale `expo lint` e 44 suite falliscono solo perché il checkout
principale non ha `expo-image-manipulator` (manca un `npm install`, non è
di questo task).

Restano:

- **Da `drawings.py`**, che il brief non elenca: `GET /drawings/{id}` e
  `GET /users/{id}/drawings` mostrano ancora i disegni di chi si è
  bloccato a chi ha l'id. Il seguito è una riga in
  `drawing_seen_sql` e `shown_sql` (chiesto al coordinatore). Fuori anche
  i tag, «Recommended» (TASK-092) e le notifiche vecchie.
- I testi nuovi aspettano il sì dell'utente.
- La migrazione sul server (ok dell'utente, coordinatore) e la prova
  sull'iPhone con due account.
