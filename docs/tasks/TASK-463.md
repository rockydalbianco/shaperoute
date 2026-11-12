# TASK-463 — Alpinismo: uno sport registrato senza percorso

**Stato**: In corso — parte A (server) in PR, ramo
`feat/TASK-463-a-alpinism-api`; parte app dopo TASK-414 B.
**Fase**: 4 · **ADR**: ADR-0373 (da scrivere nella PR di documenti dopo il
merge) · numeri dal Coordinatore · migrazione `0075` (era la provvisoria `0076`)

## Obiettivo

L'alpinismo diventa uno sport di MuW **registrato senza percorso**
(`recordOnly`), come lo scialpinismo (TASK-415) e il parapendio (TASK-305
parti R). È la scelta dell'utente dell'11 novembre 2026, durante il
calendario delle attività (TASK-462, ADR-0372): «alpinismo: sì, registrato
senza percorso». Il calendario lo mostrerà da solo quando sarà uno sport
del registro.

## Le parti

- **A — server** (questa PR, il via del Coordinatore del 2026-11-12,
  «opzione 1, solo server»): l'API accetta, salva, elenca e apre una
  giornata di alpinismo; una migrazione allarga `runs_activity_check`.
  Niente contratto (`packages/shared-types`), niente app, niente orologio.
- **App** (dopo TASK-414 B): il contratto (`RECORDED_SPORTS`, le fixture
  `run-activities.json` e `reads.json`) e il profilo dell'app, nascosto e
  poi acceso, insieme; i testi; la scelta in «Settings». Si fa
  sull'ordine che dà il Coordinatore.

## La deroga «prima il server» (parte A)

Il server ha l'alpinismo **prima del contratto**. Se `alpinism` entrasse in
`shared-types`, l'app lo direbbe subito in `X-MuW-Reads` e i suoi test
vorrebbero un profilo (`sports/**`, file di altri task). Così, invece,
nessuna app di oggi riceve una giornata di alpinismo: non lo dice.

La deroga sta in **una costante sola**, `SERVER_FIRST` in
`services/api/tests/test_sport_registry_api.py`: i test che confrontano
l'API con le liste del contratto le leggono con `in_the_contract`.
**La toglie la parte app, che porta contratto e profilo nascosto insieme.**

## Scelte tecniche (cambiabili dall'utente)

Valori tecnici scelti dall'agente, approvati dal Coordinatore il
2026-11-12. L'utente li può cambiare con una riga sola in
`services/api/shaperoute_api/sports/alpinism.py`:

- su Strava va come **«Hike»**: Strava non ha un tipo per l'alpinismo;
- nel GPX, `<type>alpinism</type>`;
- niente record personali, niente gioco delle forme, niente zone: come il
  parapendio.

L'orologio della build 14 non ha l'alpinismo: arriva con una build nuova
dell'orologio, dopo la parte app.

## Criteri di accettazione (parte A)

- [ ] `alpinism` in `RunActivity`, dopo `paragliding` e prima di `gym`;
      uno `ApiSport` `record_only` nel registro, nello stesso ordine.
- [ ] `alpinism` in `NEWER_ACTIVITIES` (`reads.py`): solo un'app che lo dice
      lo riceve; l'app di oggi no.
- [ ] Migrazione che allarga solo `runs_activity_check`, rileggendolo.
- [ ] Nessun percorso pianificabile (`check_supported` rifiuta), nessun
      record personale, nessun punto nel gioco.
- [ ] Test deterministici in `test_alpinism_api.py`; gli insiemi «later» e
      «since» degli altri test aggiornati; deroga in `SERVER_FIRST`.
- [ ] `engine.zip` dell'app rigenerato (il registro degli sport ci va
      dentro), come ultimo commit dopo il merge di `main`.
- [ ] Controlli di sola lettura per il server in `out/TASK-463/SERVER-A.md`.
- [ ] Al «pronta», la migrazione rinominata al primo numero libero in
      `main`.

## File toccati (parte A)

- `services/api/shaperoute_api/sports/alpinism.py` (nuovo)
- `services/api/shaperoute_api/sports/__init__.py`
- `services/api/shaperoute_api/activities.py`
- `services/api/shaperoute_api/reads.py`
- `services/api/migrations/0075_alpinism.sql` (nuovo; il primo numero libero in `main` al «pronta»)
- `services/api/tests/test_alpinism_api.py` (nuovo)
- `services/api/tests/test_sport_registry_api.py` (`SERVER_FIRST`, «since»)
- `services/api/tests/test_record_only.py`, `test_reads.py`,
  `test_ski_touring_api.py`, `test_paragliding_api.py`,
  `test_wheelchair_api.py`, `test_gravel_mtb_api.py`,
  `test_inline_skating_api.py`, `test_snowshoeing_api.py` (gli insiemi
  «later» e il confronto col contratto attraverso `in_the_contract`)
- `apps/mobile/assets/engine/engine.zip` (rigenerato, nessun codice app)
- `docs/DATABASE.md` (la migrazione), questo file

Non toccati: `app.py`, `route_store.py`, il motore, `packages/shared-types`,
`apps/mobile/src/**`, `docs/API.md`, STATUS, DECISIONS, INDEX.

## Il server

Va sul server in un passo del Coordinatore, col sì dell'utente, dopo il
merge. I controlli di sola lettura sono in `out/TASK-463/SERVER-A.md` nel
checkout principale.
