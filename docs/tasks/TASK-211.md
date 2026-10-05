# TASK-211 — Seguire con richiesta

**Stato**: Done — parte A (l'API) il 2026-10-03, parte B (l'app) il
2026-10-05: si segue dal profilo di un altro e si accetta in «Profile».
Resta la prova sull'iPhone con due account, dopo la pubblicazione
**Fase**: 4 · **Branch**: `feat/TASK-211-follow-api` (parte A),
`feat/TASK-211-follow-app` (parte B)
**Dipende da**: TASK-116 (fatto) · **ADR**: ADR-0173 (l'API), ADR-0199
(l'app)

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

- [x] Una richiesta non accettata non conta come seguire (test).
- [x] Non si segue sé stessi; una seconda richiesta non crea una seconda
      riga (test).
- [x] Cancellato un account, sparisce da ogni elenco (test).
- [x] La ricerca non restituisce mai email né altro oltre a nome, foto e
      `public_id` (test).
- [x] Rifiutare non lascia traccia visibile a chi ha chiesto (test).
- [x] Test verdi dell'API e dell'app (l'API con la parte A; l'app con la
      parte B, 1867 test).
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
services/api/tests/test_profiles.py                 (il profilo atteso, ok del coordinatore)
packages/shared-types/                              (contratto e fixture)
apps/mobile/src/api/profiles.test.ts                (il tipo della fixture, ok del coordinatore)
docs/API.md, docs/DATABASE.md, docs/DECISIONS.md, docs/STATUS.md
```

Parte B:

```
apps/mobile/src/profile/UserProfilePage.tsx         (+ il suo test, e UserProfileFollow.test.tsx nuovo)
apps/mobile/src/profile/ProfileHome.tsx
apps/mobile/src/profile/ProfileHeader.tsx           (non toccato)
apps/mobile/src/api/follows.ts                      (nuovo, con il test)
apps/mobile/src/social/FollowButton.tsx             (nuovo)
apps/mobile/src/social/FollowLists.tsx              (nuovo, con due test)
apps/mobile/src/social/followsDoor.ts               (nuovo)
apps/mobile/src/screens/ProfileLayer.tsx            (aggiunto: il contesto e il profilo da un elenco)
apps/mobile/src/screens/PeopleScreen.tsx            (aggiunto: la prop `first`)
apps/mobile/src/i18n/it.ts, de.ts, es.ts, fr.ts     (aggiunti: solo le righe dei testi nuovi)
apps/mobile/src/social/DrawingsGrid.test.tsx        (aggiunto: una riga, la riga sotto il nome)
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
```

## Fuori scope

- Visibilità, tag e foto dei disegni: TASK-208.
- Notifiche delle richieste: TASK-185.
- Bloccare e segnalare: TASK-121.
- Il feed di chi segui: TASK-118.
- Profili privati (chi non segue non vede nemmeno il profilo).

## Esito

### Parte A — l'API (2026-10-03, ADR-0173)

In `main` dal 2026-10-03 con la PR #256 (merge `455e7bd`), migrazione
`0011_follows.sql`; CI 5/5 verde. Non sul server.

**Cosa funziona** (`follows.py`, migrazione `0011_follows.sql`: il numero
è il primo libero in `main` al merge, va riguardato prima):
- **`follows`**: una riga per coppia in un verso, `pending` o `accepted`,
  `asked_at`, `accepted_at`; un vincolo vieta sé stessi; `ON DELETE
  CASCADE` sui due account.
- **`GET /users?q=`**: almeno 2 caratteri (meno: `422` «Type at least 2
  characters of a name.»), cercati dentro il nome senza badare alle
  maiuscole (`_` e `%` valgono come lettere), al più 20, mai chi cerca;
  prima i nomi che cominciano così, poi i più corti, poi l'alfabeto. Solo
  `public_id`, `username`, `photo`.
- **La foto negli elenchi** è a 128 px (metà di quella del profilo), fatta
  dall'API a ogni lettura dal JPEG tenuto, senza EXIF.
- **Le azioni**: `POST`/`DELETE /users/{public_id}/follow` (chiedere;
  ritirare o smettere), `POST /me/follow-requests/{public_id}/accept` e
  `/decline`, `DELETE /me/followers/{public_id}`. Rifatte non cambiano
  niente (`204`, la richiesta resta una con la sua data); accettare senza
  richiesta è `404` «No follow request from this account.»; sé stessi
  `422` «You cannot follow yourself.»; un profilo che non c'è `404`.
- **Rifiutare cancella la riga**: chi aveva chiesto rivede il profilo come
  prima di chiedere (test: la risposta è identica) e può richiedere.
- **Gli elenchi** `GET /me/follow-requests`, `/me/followers`,
  `/me/following`: a pagine (`limit` 1–50, `cursor`, `next`, `total`), dal
  più recente. Solo i propri.
- **`PublicProfile`** ha `followers`, `following` (solo accettate) e
  `follow` (`none`, `requested`, `following`; il proprio: `none`).
- **Per TASK-208**: `follows_sql(follower, followed)`, una condizione SQL
  da mettere nelle query dei disegni, e `Follows.follows(a, b)`.
- **Contratto**: `shared-types` con `Person`, `PeopleFound`, `PeoplePage`,
  `Follow`, `FollowState`/`FOLLOW_STATES` e le tre costanti; i campi nuovi
  di `PublicProfile` facoltativi (un server di prima non li ha). Fixture
  `people.json`, `people-page.json`, `follow.json`; `public-profile.json`
  con i tre campi.

**Risposte e scelte** (in ADR-0173): il profilo di un altro si apre
**dalla ricerca** e dagli elenchi (la domanda aperta di TASK-116, risposta
del coordinatore); gli elenchi di un altro non si leggono; bloccare
(TASK-121) dovrà togliere le righe nei due versi, fermare le richieste e
nascondere i bloccati da ricerca ed elenchi, e tocca `follows.py`.

**Due file aggiunti all'elenco** (ok del coordinatore):
`services/api/tests/test_profiles.py`, quattro righe, perché il profilo
atteso ha i tre campi nuovi (il test confronta la risposta intera);
`apps/mobile/src/api/profiles.test.ts`, perché la fixture letta come JSON
ha `follow` stringa, e il test le dà il tipo `PublicProfile` esplicito.

**Da dire all'utente**: la ricerca mostra il nome di ogni iscritto a chi ha
un account; con due lettere alla volta se ne fa l'elenco. Il cancello di
`ROADMAP.md` (TASK-121 e TASK-122 prima di invitare chi non si conosce)
resta.

**Non fatto**: niente sul server né sul telefono (servono la parte B,
l'aggiornamento del server e l'ok dell'utente).

### Parte B — l'app (2026-10-05, ADR-0199)

Chiesta dall'utente il 2026-10-05: «dai la possibilità di seguire gli
amici, io ho trovato il mio amico, ma non posso seguirlo». Delle
proposte qui sopra l'utente ha confermato, alla domanda, **«Requests» in
«Profile»** con i tre numeri «Requests», «Followers», «Following» che
aprono gli elenchi (l'altra scelta offerta era in cima a «Feed»).

**Cosa funziona**:
- **Sul profilo di un altro** il tasto «Follow» → «Requested» (toccato,
  ritira) → «Following» (toccato, chiede «Stop following {name}?»), e la
  riga «12 drawings · 3 followers · 5 following».
- **In «Profile»** i tre numeri, con il pallino su «Requests» quando
  qualcuno aspetta; gli elenchi sotto, con «Accept», «Decline» e
  «Remove» (che chiede prima); «Show more» oltre i venti.
- **Un nome in un elenco** apre il profilo di quella persona; «←» torna
  a «Profile».
- La ricerca era già fatta (TASK-215) e non è cambiata.

**File aggiunti all'elenco**, chiesti al coordinatore il 2026-10-05
(occupato con il server: nessuna risposta prima della PR, nessuno dei
file era di un altro task in `AGENTI.md`): `ProfileLayer.tsx` e
`PeopleScreen.tsx` per il contesto e per aprire un profilo da un elenco;
le quattro tabelle delle lingue, che `tables.test.ts` vuole complete;
una riga di `DrawingsGrid.test.tsx`, che aspettava «1 drawing» da solo.
`ProfileHeader.tsx` non è servito.

**Testi nuovi, da confermare** (in inglese; tradotti dall'agente in it,
de, es, fr): «Follow», «Requested», «Following», «Unfollow», «Stop
following {name}?», «Takes your request back.» (VoiceOver), «{count}
follower(s)», «{count} following», «Requests», «Followers», «Accept»,
«Decline», «Remove», «Remove {name} from your followers?», «Nobody is
asking to follow you.», «Nobody follows you yet.», «You are not
following anyone yet. Find friends from Feed.». «Following» è una parola
sola per tasto ed elenco (it «Segui già»).

**Non fatto**: l'aspetto non è stato visto né sul simulatore né su un
telefono (solo i test); la prova con due account è dell'utente, dopo la
pubblicazione, che chiede il suo ok. Niente notifiche delle richieste
(TASK-185): si vedono solo aprendo «Profile». Bloccare è TASK-121.
