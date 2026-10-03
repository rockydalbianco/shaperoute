# TASK-211 — Seguire con richiesta

**Stato**: Todo — task file scritto con le scelte dell'utente (2026-10-03)
**Fase**: 4 · **Branch**: `feat/TASK-211-follow-api` (parte A),
`feat/TASK-211-follow-app` (parte B)
**Dipende da**: TASK-116 (fatto) · **ADR**: dal coordinatore

## Obiettivo

Un iscritto trova un altro per nome, gli chiede di seguirlo, e l'altro
accetta o rifiuta. Serve a «Followers» in «Who can see it» e a taggare le
persone (TASK-208), e dà finalmente un ingresso al profilo di un altro.

## Le scelte dell'utente (2026-10-03)

1. **Seguire vuole una richiesta** che l'altro accetta o rifiuta (non
   libero come Strava di base).
2. Gli iscritti si cercano **per nome** (la stessa ricerca serve ai tag
   di TASK-208).

## Proposte dell'agente (da confermare con l'utente prima della parte B)

- Le richieste si vedono in **«Profile»**, in una riga **«Requests»** con
  il numero, che apre l'elenco con «Accept» e «Decline». Senza notifiche
  (TASK-185) si scoprono solo lì.
- Sul profilo di un altro un tasto: **«Follow»**, poi **«Requested»**
  (toccato di nuovo, ritira la richiesta), poi **«Following»** (toccato,
  chiede «Unfollow?»).
- Nel profilo i numeri **«Followers»** e **«Following»**, che aprono gli
  elenchi; da «Followers» si può togliere qualcuno («Remove»).
- La ricerca da una lente in «Profile»: nome e foto, al più 20 risultati,
  almeno 2 lettere. Si cerca ogni iscritto: va detto all'utente, perché
  rende visibile l'elenco dei nomi (il cancello di `ROADMAP.md` prima di
  invitare chi non si conosce resta TASK-121).
- Una richiesta rifiutata non si dice a chi l'ha mandata: il suo tasto
  torna «Follow».

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0128 (profili, `public_id`)
- `docs/API.md` «Profile»
- `docs/DATABASE.md` `users`
- `docs/UI.md` «Profile», il profilo di un altro (TASK-116)

## Parte A — l'API

1. Migrazione nuova (il primo numero libero in `main` al merge):
   `follows` (chi segue, chi è seguito, `pending` o `accepted`, quando),
   una riga per coppia, mai sé stessi; cancellato un account, le sue
   righe spariscono.
2. `GET /users?q=` cerca per nome (almeno 2 lettere, al più 20, senza
   sé stessi): `public_id`, nome, foto.
3. `POST` e `DELETE /users/{public_id}/follow` (chiedere, ritirare,
   smettere); `GET /me/follow-requests`; `POST
   /me/follow-requests/{public_id}/accept` e `.../decline`; `DELETE
   /me/followers/{public_id}`; `GET /me/followers`, `GET /me/following`.
4. `PublicProfile` con `followers`, `following` e lo stato verso chi
   chiede (`none`, `requested`, `following`).
5. Una funzione per TASK-208: «A segue B, accettato?».
6. Test, `API.md`, `DATABASE.md`, ADR.

## Parte B — l'app

1. La ricerca degli iscritti (componente riusato dai tag di TASK-208),
   che apre `UserProfilePage.tsx`.
2. Il tasto «Follow» / «Requested» / «Following» sul profilo di un altro.
3. «Requests» in «Profile», con «Accept» e «Decline».
4. «Followers» e «Following» nel profilo, con gli elenchi.
5. Test, `UI.md`, i testi nuovi da far confermare.

## Criteri di accettazione

- [ ] Una richiesta non accettata non conta come seguire (test).
- [ ] Non si segue sé stessi; una seconda richiesta non crea una seconda
      riga (test).
- [ ] Cancellato un account, sparisce da ogni elenco (test).
- [ ] La ricerca non restituisce mai email né altro oltre a nome, foto e
      `public_id` (test).
- [ ] Rifiutare non lascia traccia visibile a chi ha chiesto (test).
- [ ] Test verdi dell'API e dell'app.
- [ ] Prova sull'iPhone con due account, dopo l'aggiornamento del server,
      con l'ok dell'utente.

## File toccati

Parte A:

```
services/api/migrations/00NN_follows.sql            (nuovo)
services/api/shaperoute_api/follows.py              (nuovo)
services/api/shaperoute_api/profiles.py
services/api/shaperoute_api/app.py
services/api/tests/test_follows.py                  (nuovo)
packages/shared-types/                              (contratto e fixture)
docs/API.md, docs/DATABASE.md, docs/DECISIONS.md, docs/STATUS.md
```

Parte B:

```
apps/mobile/src/profile/UserProfilePage.tsx
apps/mobile/src/profile/ProfileHome.tsx
apps/mobile/src/profile/ProfileHeader.tsx
apps/mobile/src/api/                                (file nuovo per follows)
apps/mobile/src/social/                             (file nuovi)
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
```

## Fuori scope

- Visibilità, tag e foto dei disegni: TASK-208.
- Notifiche delle richieste: TASK-185.
- Bloccare e segnalare: TASK-121.
- Il feed di chi segui: TASK-118.
- Profili privati (chi non segue non vede nemmeno il profilo).

## Esito

*(si compila a fine task)*
