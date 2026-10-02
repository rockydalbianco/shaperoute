# TASK-200 — L'attività nei preferiti e le pause nel dettaglio di una corsa

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-200-favorite-activity-run-pauses`
**ADR**: ADR-0160, dal coordinatore il 2026-10-02, solo se serve una
scelta nuova (le aggiunte al contratto seguono ADR-0157 e ADR-0158)
**Migrazione**: la prima libera in `main` al momento del merge: `0008`
**Dipende da**: TASK-190 (la bici, #214, #219, #221) e TASK-199 (#222) in
`main`; parte **dopo il merge di TASK-116**, che tocca anche lui le
migrazioni, `app.py` e `schemas.py`

## Obiettivo

Un preferito ricorda con quale attività è stato disegnato: un percorso in
bici, riaperto, si riapre in bici. Il dettaglio di una corsa salvata
restituisce le sue pause, con `pen` sulle pause «penna». Un preferito
tenuto prima di TASK-199 resta com'è, e il task file dice perché.

Sono i seguiti 1, 5 e 6 di TASK-190 parte C e TASK-199, assegnati dal
coordinatore il 2026-10-02 su delega dell'utente («vai avanti con tutti i
task aperti»).

## Perché

- **Seguito 1** (TASK-190 C): `favorites` non ha l'attività. Un percorso in
  bici tenuto fra i preferiti, riaperto, chiede indicazioni, GPX e
  punteggio come una corsa: sbagliato su strade a senso unico, e con i
  limiti di distanza della corsa.
- **Seguito 5** (TASK-199): `GET /me/activities/{key}` non ha mai
  restituito le pause. TASK-199 salva `pen` dentro `pauses`, ma l'app non
  può leggerlo.
- **Seguito 6** (TASK-199): un preferito tenuto mentre il server era più
  vecchio di TASK-199 non ha `walks`, e non li avrà: i suoi punti non
  dicono dove erano i tratti a piedi. Si scrive, non si ripara.

## Contesto da leggere

- `docs/tasks/TASK-190.md` (Esito delle parti B e C, seguiti),
  `docs/tasks/TASK-199.md` (Esito, seguiti)
- `docs/DECISIONS.md` ADR-0139 (i preferiti), ADR-0140 (le corse salvate),
  ADR-0153 (la bici), ADR-0157, ADR-0158 (un campo nuovo e un server
  vecchio)
- `docs/API.md` «Favorites», «My activities»; `docs/DATABASE.md`
  `favorites`, `runs`
- `services/api/shaperoute_api/favorites.py`, `activities.py`
  (`ActivityDetailBody`, `_whole`, `_pause`)
- `apps/mobile/src/api/favorites.ts`, `src/api/activities.ts`,
  `src/favorites/favoriteRoute.ts`, `apps/mobile/App.tsx` (dove si riapre
  un preferito)

## Cosa fare

**API**

1. `favorites` prende la colonna `activity` (`running` o `cycling`, come
   `RouteRequest.activity`; `running` per i preferiti di prima).
   `FavoriteRequestBody` la prende, facoltativa, `running` di default;
   un'attività che l'API non offre è `invalid_request`. L'elenco e il
   dettaglio la restituiscono.
2. `GET /me/activities/{key}` restituisce `pauses`: `from_s`, `to_s`,
   `auto`, e `pen` solo quando è vero, come le tiene la colonna. Sull'orologio
   di `track` (secondi dal primo punto). L'elenco non cambia.

**Il contratto**

3. **Solo aggiunte.** `FavoriteRequestBody` ha `extra="forbid"`: l'app
   manda `activity` **solo** quando non è `running`, così una richiesta di
   oggi resta byte per byte com'è e un server vecchio non la rifiuta. Se
   un server vecchio risponde 422 a un preferito in bici, vale ADR-0158:
   si rimanda una volta senza il campo. Le risposte senza `activity` o
   senza `pauses` (un'API vecchia) si leggono come oggi (`running`,
   nessuna pausa).
4. `shared-types`: fixture nuovi accanto ai vecchi, che restano com'erano;
   il test del contratto.

**App**

5. Il cuore tiene l'attività del percorso disegnato (dalla richiesta).
   Quelli di «Explore» e a tema sono a piedi.
6. Un preferito riaperto passa la sua attività alle richieste che fa
   (indicazioni, GPX, punteggio), qualunque sia lo sport scelto in
   «Settings». Cosa fa «Start» in bici resta quello di oggi (la
   navigazione della corsa): è una domanda dell'utente (seguito 2 di
   TASK-190 C), non di questo task.
7. Il tipo del dettaglio di una corsa prende `pauses`, facoltativo.
   L'app **non cambia cosa mostra**: spezzare la linea corsa sulle pause è
   una scelta dell'utente (TASK-198, «Fuori scope»).

**Documenti**

8. `API.md`, `DATABASE.md` (la migrazione), `UI.md` (il preferito in
   bici), `STATUS.md`, questo task file con il seguito 6 spiegato in
   «Esito». ADR-0160 solo se si prende una scelta che gli ADR citati non
   coprono.

## Criteri di accettazione

- [x] Un preferito in bici torna con `activity: "cycling"` nell'elenco e
      nel dettaglio; uno senza `activity` e uno di prima tornano
      `running` (test, anche della migrazione su dati di prima).
- [x] `activity` che l'API non offre: `invalid_request` (test).
- [x] Il dettaglio di una corsa ha `pauses`, con `pen: true` solo sulle
      pause «penna»; una corsa senza pause ha `[]` (test).
- [x] L'app non manda `activity` per un preferito a piedi: la richiesta è
      uguale a quella di oggi (test).
- [x] Un preferito in bici, riaperto con «Run» scelto in «Settings», chiede
      ~~le indicazioni e~~ il GPX con `activity: "cycling"` (test). Le
      indicazioni no: vedi «Esito», «Il criterio 5».
- [x] Una risposta senza `activity` o senza `pauses` si legge (test).
- [x] Test verdi: motore, API, `shared-types`, app; `ruff`, `black`,
      lint, `tsc`, `format:check`.

## File toccati

Elenco previsto; la PR dichiara i suoi.

```
services/api/migrations/000N_favorite_activity.sql   (il numero libero al merge)
services/api/shaperoute_api/favorites.py
services/api/shaperoute_api/activities.py
services/api/tests/test_favorites.py
services/api/tests/test_activities.py
packages/shared-types/fixtures/
packages/shared-types/test/contract.test.ts
apps/mobile/src/api/favorites.ts
apps/mobile/src/api/activities.ts
apps/mobile/src/favorites/favoriteRoute.ts
apps/mobile/App.tsx
apps/mobile/src/**/*.test.ts(x)
apps/mobile/__tests__/
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-200.md
```

## Fuori scope

- **«Start» su un percorso in bici** (oggi la navigazione della corsa),
  **l'avviso dello sterrato** mostrato grezzo, **«km walking» in bici**:
  testi e comportamenti che vede l'utente, a lui (seguiti 2, 3 e 4 di
  TASK-190 C).
- **La linea corsa spezzata sulle pause** in «My activities»: una scelta
  dell'utente.
- **Ridare i `walks` ai preferiti tenuti prima di TASK-199**: i punti non
  dicono dove erano i tratti a piedi; si toglie e si rimette il preferito.
- **Il server e la pubblicazione**: solo con l'ok dell'utente.

## Esito

**Fatto**, API e app, dal branch `feat/TASK-200-favorite-activity-run-pauses`
(ADR-0160, migrazione `0008`). Come funziona: `API.md`, «Favorites», «My
activities» e «In bici»; `DATABASE.md`, migrazione `0008`; `UI.md`,
«Favorites» e «My activities».

- **API, preferiti**: `favorites` prende `activity` (`text NOT NULL
  DEFAULT 'running'`, vincolo `IN ('running', 'cycling')`, le attività di
  `SUPPORTED_ACTIVITIES`). `PUT /me/favorites/{key}` la prende,
  facoltativa; un'attività che l'API non offre è `422 invalid_request` con
  le parole di `POST /routes`. L'elenco e il dettaglio la hanno sempre.
- **API, corse**: `GET /me/activities/{key}` ha sempre `pauses`, come le
  tiene la colonna: `from_s`, `to_s`, `auto`, `pen` solo quando è vero, in
  secondi dal primo punto di `track`, nell'ordine mandato; `[]` senza
  pause. L'elenco non cambia (non legge nemmeno la colonna).
- **Il contratto**: solo aggiunte. Fixture nuove `favorite-request-cycling`,
  `favorites-cycling`, `favorite-cycling`, `activity-pauses`; quelle di
  prima restano com'erano, richieste di un'app e risposte di un'API
  precedenti, e il test di `shared-types` lo controlla.
- **App**: il cuore tiene l'attività della richiesta del percorso disegnato
  (`drawnKeepable`), e la manda **solo quando non è `running`**; «Explore»
  e i percorsi a tema non la mandano. Un preferito riaperto
  (`openedFavorite`) mette la sua attività nella richiesta che «Export GPX»
  manda, qualunque sport dica «Settings», e la rimette nel suo cuore. Un
  preferito senza `activity`, o con una che l'app non conosce, è una corsa
  (`favoriteActivity`). Il tipo del dettaglio di una corsa prende `pauses`,
  facoltativo; l'app non mostra niente di nuovo. `App.tsx` non è cambiato:
  la richiesta e il cuore del preferito riaperto vengono da
  `favoriteRoute.ts`.
- **Un server vecchio** (ADR-0160, punto 4, sopra ADR-0158): se il `PUT`
  di un preferito con `activity` o `walks` torna `422 invalid_request`,
  l'app lo rimanda **una volta** come un'app precedente a TASK-199, senza
  tutti e due (`asBefore`): un'API precedente tiene il preferito in bici
  come una corsa, invece di mostrare l'errore sotto il cuore.

**La prova che le altre richieste non cambiano**: in `favorites.test.ts`
un preferito a piedi esce dal `PUT` come testo uguale a
`favorite-request.json`; in `favoriteRoute.test.ts` la stessa linea
disegnata a piedi dà il testo di prima e senza `activity`, e un preferito
di prima riaperto ha la richiesta GPX di prima, byte per byte; in
`AppFavoriteActivity.test.tsx` il cuore dell'app intera, con «Run», manda
il testo di prima TASK-200, e `POST /route-directions` resta `{"points":
…}`. Le risposte senza `activity` e senza `pauses` (le fixture di prima) si
leggono (`favorites.test.ts`, `activities.test.ts`).

**Il criterio 5, «chiede le indicazioni con `activity: "cycling"`»**: non
si può senza allargare il contratto di un altro endpoint. `POST
/route-directions` prende solo `{"points"}` (`extra="forbid"`) e cerca la
linea sulla rete a piedi (`app.py`, «In bici» in `API.md`); `POST
/track-scores` non ha l'attività (confronta due linee: il punteggio non
dipende dallo sport). Le richieste di un preferito riaperto che hanno
l'attività sono solo quella del GPX, e la manda. Dare `activity` a
`/route-directions` vorrebbe dire toccare `line_directions.py`, `app.py`,
`routeDirections.ts`, `useStartDirections.ts`, `App.tsx` e una fixture,
fuori dall'elenco, e cambia cosa fa «Start» su un percorso in bici
(seguito 2 di TASK-190 C, dell'utente): non fatto, segnalato al
coordinatore. Oggi le indicazioni di un preferito in bici si cercano a
piedi come prima di questo task; dove il percorso passa su una strada che
la rete a piedi non ha (una ciclabile vietata ai pedoni), «Start» direbbe
che il percorso non è sulla mappa dell'API (non provato).

**Il seguito 6, i preferiti tenuti prima di TASK-199**: un preferito tenuto
mentre il server era più vecchio di TASK-199 non ha `walks` (la colonna,
dalla migrazione `0006`, gli dà `[]`) e non li avrà: la riga tiene solo i
punti della linea, che non dicono dove finisce una lettera e comincia il
tratto a piedi, e la richiesta che l'aveva disegnato non c'è più. Si
riapre come una linea sola: la mappa non tratteggia niente, «Start» non
mette in pausa fra le lettere, il punteggio giudica anche i tratti a piedi.
Per averli bisogna toglierlo e rimetterlo da una parola appena disegnata
con la penna alzata (un secondo `PUT` con la stessa chiave non cambia
niente, ADR-0139). Lo stesso vale per l'attività: un preferito in bici
tenuto con un'API precedente a TASK-200 resta una corsa.

**Test** (deterministici, senza rete): API `test_favorites.py` (il
preferito in bici nell'elenco e nel dettaglio come le fixture, uno di
prima `running`, ogni attività dell'API tenuta, cinque attività
rifiutate, il vincolo del database, **la migrazione su un database con lo
schema 0001–0007** e due preferiti scritti come li scriveva l'API di
TASK-199, `walks` compresi) e `test_activities.py` (le pause nel
dettaglio sull'orologio della traccia, tagliate alla corsa e nell'ordine
mandato; `[]` senza; `pen` solo sulla pausa della penna; le pause di una
corsa scritta prima di TASK-199); `shared-types` il test delle fixture
nuove; app `favorites.test.ts`, `activities.test.ts`,
`favoriteRoute.test.ts`, `AppFavoriteActivity.test.tsx`. Mutazioni provate
a mano: senza l'attività nel cuore cade il test della bici di
`AppFavoriteActivity`, senza l'attività nella richiesta riaperta cade
quello del GPX.

**Non provato**: niente su un telefono; nessun server ha TASK-200 (né
TASK-199). Il rimando «come prima» è provato contro un `422` finto. CI su
Python 3.11 (il Mac ha 3.12): la pausa nella risposta è un `TypedDict` di
`typing_extensions`, come Pydantic lo vuole prima della 3.12.

**Si vede sul telefono solo dopo** l'aggiornamento del server (con la
migrazione `0008`, e la `0006` di TASK-199, `DEPLOY.md` F.12) e la
pubblicazione dell'app, tutti e due con l'ok dell'utente.

**Seguiti** (non fatti): le indicazioni di «Start» in bici (`activity` a
`/route-directions`, sopra), da decidere con il seguito 2 di TASK-190 C;
quando arriva la canoa (TASK-191), una migrazione che allarghi il vincolo
di `favorites.activity`.
