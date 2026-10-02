# TASK-200 — L'attività nei preferiti e le pause nel dettaglio di una corsa

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-200-favorite-activity-run-pauses`
**ADR**: ADR-0160, dal coordinatore il 2026-10-02, solo se serve una
scelta nuova (le aggiunte al contratto seguono ADR-0157 e ADR-0158)
**Migrazione**: la prima libera in `main` al momento del merge
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

- [ ] Un preferito in bici torna con `activity: "cycling"` nell'elenco e
      nel dettaglio; uno senza `activity` e uno di prima tornano
      `running` (test, anche della migrazione su dati di prima).
- [ ] `activity` che l'API non offre: `invalid_request` (test).
- [ ] Il dettaglio di una corsa ha `pauses`, con `pen: true` solo sulle
      pause «penna»; una corsa senza pause ha `[]` (test).
- [ ] L'app non manda `activity` per un preferito a piedi: la richiesta è
      uguale a quella di oggi (test).
- [ ] Un preferito in bici, riaperto con «Run» scelto in «Settings», chiede
      le indicazioni e il GPX con `activity: "cycling"` (test).
- [ ] Una risposta senza `activity` o senza `pauses` si legge (test).
- [ ] Test verdi: motore, API, `shared-types`, app; `ruff`, `black`,
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

*(a fine task)*
