# TASK-199 — La penna alzata in «My activities» e nei preferiti

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-199-pen-up-saved`
**ADR**: ADR-0158, dal coordinatore il 2026-10-02, solo se serve una scelta
nuova (il contratto dei `walks` è già ADR-0157)
**Migrazione**: la prima libera in `main` al momento del merge (oggi
`0006`), una sola per le due tabelle
**Dipende da**: TASK-197 (#217) e TASK-198 (#218) in `main`; parte da
`main` dopo il merge di TASK-190 parte B (#219), che tocca `shared-types`
e `schemas.py`

## Obiettivo

Una corsa fatta su una parola con la penna alzata, salvata in «My
activities», tiene i suoi tratti a piedi: il punteggio guarda solo le
lettere, come a fine corsa, e le pause «penna» restano pause «penna». Un
preferito con la penna alzata si riapre con i suoi tratti a piedi, e
correndolo l'app mette in pausa da sola come per un percorso appena
disegnato.

Sono i seguiti 1 e 2 di TASK-198, assegnati dal coordinatore il
2026-10-02 su delega dell'utente («vai avanti con tutti i task aperti»).

## Perché

- Oggi `PUT /me/activities/{key}` non prende `walks`: l'API rifà il
  punteggio confrontando la corsa con tutto il percorso, tratti a piedi
  compresi, e il numero salvato non è quello visto a fine corsa.
- Una pausa «penna» arriva all'API come pausa di chi corre (`auto:
  false`): si perde perché c'è stata.
- Un preferito tiene solo `points`: riaperto, una parola con la penna
  alzata diventa una linea sola, senza tratti tratteggiati e senza pause
  automatiche.

## Contesto da leggere

- `docs/tasks/TASK-197.md`, `docs/tasks/TASK-198.md` (Esito e seguiti)
- `docs/DECISIONS.md` ADR-0157 (i `walks` come indici in `points`),
  ADR-0140 (le corse salvate), ADR-0139 (i preferiti)
- `docs/API.md` «My activities», «Favorites», «`POST /track-scores`»
- `docs/DATABASE.md` `runs`, `favorites`
- `services/api/shaperoute_api/activities.py` (`ActivityRequestBody`,
  `PauseBody`, `recorded`), `favorites.py`, `track_scores.py`
- `services/route-engine/route_engine/pen_up.py` (`walks_problem`)
- `apps/mobile/src/activities/` (`outbox.ts`, `recordedRun.ts`,
  `activitiesDoor.ts`), `apps/mobile/src/favorites/`,
  `apps/mobile/src/route/walks.ts`

## Cosa fare

**API, attività**

1. `ActivityRequestBody` prende `walks`, facoltativo: coppie `[da, a]` di
   indici in `points`, come `RouteResult.walks`. Solo con `points`; un
   `walks` che non sta in `points` è `invalid_request`, con lo stesso
   controllo di `POST /track-scores` (`walks_problem`).
2. `recorded` passa i `walks` a `score_track`: il punteggio salvato è
   quello delle sole lettere, lo stesso di `POST /track-scores`.
3. `PauseBody` prende `pen`, facoltativo, falso di default. Si salva nel
   `pauses` jsonb di `runs` come gli altri campi: per questo non serve una
   migrazione. Una pausa «penna» conta come le altre per distanza e tempo.
4. `runs` prende una colonna `walks` (jsonb, vuota per le corse di prima),
   e `GET /me/activities/{key}` la restituisce. L'elenco (`GET
   /me/activities`) non cambia.

**API, preferiti**

5. `FavoriteRequestBody` prende `walks`, facoltativo, controllato come
   sopra; `favorites` prende la colonna `walks` (stessa migrazione); `GET
   /me/favorites/{key}` la restituisce. L'elenco non cambia.

**Il contratto**

6. **Solo aggiunte, tutte facoltative.** Le due richieste hanno
   `extra="forbid"`: un server non aggiornato rifiuta un campo che non
   conosce. Quindi l'app manda `walks` e `pen` **solo** per un percorso
   con la penna alzata, che esiste solo con il server di TASK-197; per
   tutto il resto la richiesta resta byte per byte quella di oggi. Un test
   lo controlla. Le risposte senza `walks` (un'API vecchia) si leggono
   come oggi.
7. `shared-types`: `walks` facoltativo nella richiesta e nel dettaglio di
   attività e preferiti, `pen` facoltativo nella pausa; i fixture nuovi
   accanto ai vecchi, che restano com'erano.

**App**

8. Salvare una corsa (`outbox`, `recordedRun`): con i `walks` del percorso
   e `pen` sulle pause «penna», solo quando ci sono.
9. Riaprire una corsa di «My activities»: il percorso con i tratti a piedi
   tratteggiati, **come la schermata di fine corsa** di TASK-198. La linea
   corsa resta com'è oggi (unita sulle pause): spezzarla è una scelta
   dell'utente, fuori da qui.
10. Il cuore dei preferiti salva i `walks`; un preferito riaperto li passa
    alla mappa, a «Start» (pause automatiche e voce di TASK-198), a
    «Export GPX» e al punteggio.

**Documenti**

11. `API.md`, `DATABASE.md` (la migrazione), `UI.md`, `STATUS.md`, questo
    task file; ADR-0158 solo se si prende una scelta che ADR-0157 e
    ADR-0140 non coprono.

## Criteri di accettazione

- [x] Una corsa salvata con `walks` ha il punteggio delle sole lettere:
      uguale a quello di `POST /track-scores` con gli stessi dati (test).
- [x] Una corsa salvata senza `walks` ha lo stesso punteggio di oggi
      (test con i fixture di oggi, valori attesi invariati).
- [x] `walks` che non stanno in `points`, o `walks` senza `points`:
      `invalid_request` (test).
- [x] Una pausa con `pen: true` torna con `pen: true` nel dettaglio; una
      senza `pen` torna come oggi (test). Nella riga: il dettaglio non ha
      le pause (vedi «Esito»).
- [x] Un preferito con `walks` li restituisce nel dettaglio; uno di prima
      ha `walks` vuoto (test).
- [x] La migrazione parte su un database con corse e preferiti di prima e
      li lascia leggibili (test su PostGIS, come gli altri dell'API).
- [x] L'app non manda `walks` né `pen` per un percorso senza penna alzata:
      la richiesta è uguale a quella di oggi (test).
- [x] Un preferito con la penna alzata, riaperto e corso, mette in pausa
      da solo alla fine di una lettera (test con posizioni simulate).
- [x] Test verdi: motore, API, `shared-types`, app; `ruff`, `black`,
      lint, `tsc`, `format:check`.

## File toccati

Elenco previsto all'inizio; sotto, quelli della PR.

```
services/api/migrations/0006_pen_up_walks.sql   (il numero libero al merge)
services/api/shaperoute_api/activities.py
services/api/shaperoute_api/favorites.py
services/api/tests/test_activities.py
services/api/tests/test_favorites.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/
packages/shared-types/test/contract.test.ts
apps/mobile/src/activities/outbox.ts
apps/mobile/src/activities/recordedRun.ts
apps/mobile/src/activities/activitiesDoor.ts
apps/mobile/src/favorites/favoriteRoute.ts
apps/mobile/src/favorites/favoritesDoor.ts
apps/mobile/src/favorites/useFavorites.ts
apps/mobile/src/**/*.test.ts(x)
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-199.md
```

`apps/mobile/App.tsx` è anche di TASK-190 parte C, che lavora nello stesso
momento: se serve toccarlo, prima si aspetta che la C sia in `main` e si
riparte da lì (indicazione del coordinatore).

**Quelli della PR** (il diff con `main`):

```
services/api/migrations/0006_pen_up_walks.sql
services/api/shaperoute_api/activities.py
services/api/shaperoute_api/favorites.py
services/api/tests/test_activities.py
services/api/tests/test_favorites.py
packages/shared-types/fixtures/activity-request-walks.json
packages/shared-types/fixtures/activity-walks.json
packages/shared-types/fixtures/favorite-request-walks.json
packages/shared-types/fixtures/favorite-walks.json
packages/shared-types/test/contract.test.ts
apps/mobile/App.tsx
apps/mobile/__tests__/AppPenUpSaved.test.tsx
apps/mobile/src/api/activities.ts
apps/mobile/src/api/activities.test.ts
apps/mobile/src/api/favorites.ts
apps/mobile/src/api/favorites.test.ts
apps/mobile/src/activities/recordedRun.ts
apps/mobile/src/activities/recordedRun.test.ts
apps/mobile/src/activities/outbox.test.ts
apps/mobile/src/favorites/favoriteRoute.ts
apps/mobile/src/favorites/favoriteRoute.test.ts
apps/mobile/src/favorites/favoritePenUpRun.test.ts
apps/mobile/src/favorites/useFavorites.test.ts
docs/API.md
docs/DATABASE.md
docs/DECISIONS.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-199.md
```

Fuori dall'elenco previsto, e perché:

- `apps/mobile/src/api/activities.ts` e `src/api/favorites.ts`: i tipi
  delle richieste e dei dettagli di corse e preferiti stanno lì, non in
  `shared-types` (scelta di TASK-171 e TASK-172, scritta nei due file e in
  `API.md`); il punto 7 li supponeva in `shared-types`. Lì sta anche il
  rimando «come prima» dopo un rifiuto (ADR-0158, punto 5).
- `apps/mobile/App.tsx`: i `walks` di una corsa riaperta e di un preferito
  alla mappa e a «Start». Toccato dopo il merge di TASK-190 parte C
  (#221, 2592103), con `main` unito prima, come chiesto dal coordinatore.
- `apps/mobile/__tests__/AppPenUpSaved.test.tsx`: file nuovo, il test
  dell'app intera (fuori da `src/**`, dove stanno quelli di ogni pezzo).
- `docs/DECISIONS.md`: ADR-0158 (punto 11).

Previsti e non toccati: `packages/shared-types/src/index.ts` (i tipi sono
nell'app, sopra), `outbox.ts` (tiene la richiesta com'è: basta il suo
test), `activitiesDoor.ts`, `favoritesDoor.ts`, `useFavorites.ts` (passano
richieste e dettagli come sono: cambiano i tipi, non loro).

## Fuori scope

- **La linea corsa spezzata sulle pause** in «My activities» (oggi unita,
  come in Strava): una scelta dell'utente (`TASK-198.md`, «Fuori scope»).
- **L'etichetta durante una pausa «penna»** («Paused» oggi): una scelta
  dell'utente.
- **Strava**: il GPX per Strava apre già un segmento nuovo a ogni pausa,
  «penna» comprese (`run_gpx.py`): niente da cambiare.
- **Il server e la pubblicazione**: l'aggiornamento del server (con la
  migrazione) e `eas update` solo con l'ok dell'utente. Finché il server
  non ha TASK-197, la penna alzata non esiste e l'app non manda niente di
  nuovo.
- **Un preferito in bici non ricorda la sua attività** (`favoriteRoute.ts`,
  segnalato da TASK-190 parte C, 2026-10-02): riaperto è di corsa. Non
  toccato qui, su indicazione del coordinatore: un seguito.

## Esito

**Fatto**, API e app, PR #PR dal branch `feat/TASK-199-pen-up-saved`
(ADR-0158; il contratto dei `walks` resta ADR-0157). Come funziona:
`API.md`, «Favorites» e «My activities»; `DATABASE.md`, migrazione `0006`;
`UI.md`, «Favorites», «My activities», «Il risultato», «La fine della
corsa».

- **API, corse**: `PUT /me/activities/{key}` prende `walks`, facoltativo e
  solo con `points`, controllato con `walks_problem` come `POST
  /track-scores` (`422 invalid_request` per `walks` fuori, all'indietro,
  sovrapposti o senza `points`); `recorded` li passa a `score_track`. Una
  pausa prende `pen`, falso se manca, scritto nel `pauses` della riga solo
  quando è vero; per km e tempo vale come una pausa del corridore. `GET
  /me/activities/{key}` ha sempre `walks` (vuoto per le altre corse e per
  quelle di prima); l'elenco non cambia.
- **API, preferiti**: `PUT /me/favorites/{key}` prende `walks`, controllato
  allo stesso modo; `GET /me/favorites/{key}` li ha sempre; l'elenco non
  cambia.
- **Migrazione `0006_pen_up_walks.sql`**: `walks jsonb NOT NULL DEFAULT
  '[]'` (sempre una lista) in `runs` e in `favorites`; in `runs` un vincolo
  vuole `walks` vuoto senza `route`. Le righe di prima prendono `[]`.
- **App**: `recordedRun` manda `walks` (quelli che stanno nel percorso,
  `walksOf`) e `pen: true` sulle pause «penna» solo quando il percorso ha
  i `walks`; per ogni altra corsa la richiesta è quella di prima, campo per
  campo e nello stesso ordine. Il cuore tiene i `walks` di una parola con
  la penna alzata (`drawnKeepable`); un preferito riaperto
  (`openedFavorite`) ha i `walks` nel risultato e `pen_up: true` nella
  richiesta: la mappa li tratteggia, «Start» li passa alla navigazione
  (pause automatiche e voce di TASK-198), «Export GPX» e il punteggio a
  fine corsa li hanno. Una corsa riaperta da «My activities» ha i tratti a
  piedi tratteggiati, come a fine corsa; la linea corsa resta unita.
- **Un rifiuto si rimanda come prima** (ADR-0158, punto 5): `saveActivity`
  e `keepFavorite`, a un `422 invalid_request` di una richiesta con
  `walks` o `pen`, la rimandano una volta senza. Un'API precedente a
  TASK-199 salva la corsa (punteggio su tutto il percorso) invece di
  perderla dalla coda, e tiene il preferito come una linea sola.
- **«Torna con `pen: true` nel dettaglio»** (criterio 4): il dettaglio di
  una corsa non ha le pause, né prima né ora, e la linea corsa resta unita
  (punto 9); `pen` sta nella riga, e il test la legge da lì
  (`test_a_pause_of_the_pen_is_kept_as_one`): una pausa senza `pen` è
  scritta byte per byte come prima. Letto così, senza aggiungere le pause
  al dettaglio.

**La prova che le altre richieste non cambiano**: in
`recordedRun.test.ts` la corsa della fixture di prima dà, come testo
(`JSON.stringify`), esattamente `activity-request.json`, anche con `walks:
[]` nel file; una pausa «penna» senza `walks` va senza `pen`. In
`favoriteRoute.test.ts` un percorso senza `walks`, o con `walks: []`, dà
il testo di prima del preferito; un preferito di prima riaperto non ha
`walks` né `pen_up`. In `outbox.test.ts` una corsa di prima esce dal file
com'era. Le risposte senza `walks` (un'API vecchia) si leggono
(`activities.test.ts`, `favorites.test.ts`, `AppPenUpSaved.test.tsx`).

**Test** (deterministici, senza rete; timer finti dove si legge
l'orologio): API `test_activities.py` (la corsa di «II» con la penna
alzata: 88 e fedeltà 1,0 come `POST /track-scores`, 80 senza `walks`;
`walks` sbagliati o senza `points`; la pausa «penna» nella riga; la
migrazione su un database con una corsa e un preferito di prima, scritti
con lo schema `0001`–`0005`) e `test_favorites.py`; `shared-types` il
controllo delle fixture nuove; app `recordedRun`, `outbox`, `activities`,
`favorites`, `favoriteRoute`, `useFavorites`, `favoritePenUpRun` (un
preferito di «SUN» riaperto e corso con posizioni simulate: due pause
«penna», la voce, il punteggio e il salvataggio con `walks` e `pen`) e
`AppPenUpSaved` (l'app intera: la corsa riaperta con i tratti a piedi e
quella di prima senza; il preferito aperto, «Start», la pausa alla fine
della S, «Save» con `walks` e `pen`). Mutazioni provate a mano: senza le
righe di `App.tsx` cadono tutti e due i test di `AppPenUpSaved`, senza i
`walks` a «Start» cade il secondo.

**Non provato**: niente su un telefono; nessun server ha TASK-199 (né
TASK-197). Il rimando «come prima» è provato contro un `422` finto, non
contro un'API vera di prima.

**Si vede sul telefono solo dopo** l'aggiornamento del server (con la
migrazione `0006`, `DEPLOY.md` F.12) e la pubblicazione dell'app, tutti e
due con l'ok dell'utente.

**Seguiti** (non fatti): la riga «… km of letters + … km walking between
them» sulla scheda di un preferito riaperto (la scheda è quella di
«Explore», `ExploredCard`, e la riga sarebbe un testo nuovo lì: da
chiedere); un preferito tenuto da un'API precedente a TASK-199 resta una
linea sola anche dopo l'aggiornamento (va tolto e rimesso); un preferito in
bici non ricorda l'attività («Fuori scope»).
