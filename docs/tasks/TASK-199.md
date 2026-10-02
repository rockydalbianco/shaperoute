# TASK-199 — La penna alzata in «My activities» e nei preferiti

**Stato**: Todo
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

- [ ] Una corsa salvata con `walks` ha il punteggio delle sole lettere:
      uguale a quello di `POST /track-scores` con gli stessi dati (test).
- [ ] Una corsa salvata senza `walks` ha lo stesso punteggio di oggi
      (test con i fixture di oggi, valori attesi invariati).
- [ ] `walks` che non stanno in `points`, o `walks` senza `points`:
      `invalid_request` (test).
- [ ] Una pausa con `pen: true` torna con `pen: true` nel dettaglio; una
      senza `pen` torna come oggi (test).
- [ ] Un preferito con `walks` li restituisce nel dettaglio; uno di prima
      ha `walks` vuoto (test).
- [ ] La migrazione parte su un database con corse e preferiti di prima e
      li lascia leggibili (test su PostGIS, come gli altri dell'API).
- [ ] L'app non manda `walks` né `pen` per un percorso senza penna alzata:
      la richiesta è uguale a quella di oggi (test).
- [ ] Un preferito con la penna alzata, riaperto e corso, mette in pausa
      da solo alla fine di una lettera (test con posizioni simulate).
- [ ] Test verdi: motore, API, `shared-types`, app; `ruff`, `black`,
      lint, `tsc`, `format:check`.

## File toccati

Elenco previsto; la PR dichiara i suoi.

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

## Esito

*(a fine task)*
