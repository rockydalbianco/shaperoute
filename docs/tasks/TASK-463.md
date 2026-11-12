# TASK-463 — Alpinismo: uno sport registrato senza percorso

**Stato**: In corso — parte A (server) in `main` (#1242, `f8d91aba`,
2026-11-12); manca il passo sul server (il 12 del Coordinatore, col sì
dell'utente). Parte app dopo TASK-414 B e TASK-413 B.
**Fase**: 4 · **ADR**: ADR-0373 · numeri dal Coordinatore · migrazione
`0076` (la `0075` è di TASK-468 A2a, #1245)

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

- [x] `alpinism` in `RunActivity`, dopo `paragliding` e prima di `gym`;
      uno `ApiSport` `record_only` nel registro, nello stesso ordine.
- [x] `alpinism` in `NEWER_ACTIVITIES` (`reads.py`): solo un'app che lo dice
      lo riceve; l'app di oggi no.
- [x] Migrazione che allarga solo `runs_activity_check`, rileggendolo.
- [x] Nessun percorso pianificabile (`check_supported` rifiuta), nessun
      record personale, nessun punto nel gioco.
- [x] Test deterministici in `test_alpinism_api.py`; gli insiemi «later» e
      «since» degli altri test aggiornati; deroga in `SERVER_FIRST`.
- [x] `engine.zip` dell'app rigenerato (il registro degli sport ci va
      dentro), come ultimo commit dopo il merge di `main`.
- [x] Controlli di sola lettura per il server in `out/TASK-463/SERVER-A.md`.
- [x] Al «pronta», la migrazione rinominata al primo numero libero in
      `main`.

## File toccati (parte A)

- `services/api/shaperoute_api/sports/alpinism.py` (nuovo)
- `services/api/shaperoute_api/sports/__init__.py`
- `services/api/shaperoute_api/activities.py`
- `services/api/shaperoute_api/reads.py`
- `services/api/migrations/0076_alpinism.sql` (nuovo; il primo numero libero dopo la #1245)
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

## Parte B — l'app (via del Coordinatore del 2026-11-12)

Il contratto prende `alpinism` (`RECORDED_SPORTS`, `run-activities.json`,
`reads.json`) insieme al profilo dell'app, e la deroga `SERVER_FIRST` esce
dai test dell'API. L'app di oggi dice `alpinism` in `X-MuW-Reads`. In
«Settings» la riga sta nella famiglia «On snow», dopo «Ski touring»,
con **`ready=false`** («Soon», e invisibile nelle build dello store)
finché il server non ha la `0076` (passo 12) e l'utente non dice sì sulle
schermate. L'accensione è una PR piccola a parte.

### I testi approvati dall'utente (2026-11-12)

Tre domande, una alla volta, con l'anteprima: l'utente ha scelto ogni volta
la proposta (anche in `out/TASK-463/APP-B-TEXTS.md`).

| Lingua | Nome |
|---|---|
| EN | Mountaineering |
| IT | Alpinismo |
| DE | Bergsteigen |
| FR | Alpinisme |
| ES | Alpinismo |

L'emoji è 🧗: `⛰️` è dell'escursionismo, `🏔️` dello scialpinismo.

Prima della prima registrazione, una volta sola, un avviso come «Before you
fly» del parapendio (`mountain/climbNotice.ts`). Si chiude con «Got it».

| Lingua | Titolo | Testo |
|---|---|---|
| EN | Before you climb | MuW records your climb and shares it: it does not guide you. Go with your own gear, skills and judgement, and check the conditions before you set off. |
| IT | Prima di salire | MuW registra la tua salita e la condivide: non ti guida. Vai con la tua attrezzatura, la tua esperienza e il tuo giudizio, e controlla le condizioni prima di partire. |
| DE | Bevor du aufsteigst | MuW zeichnet deinen Aufstieg auf und teilt ihn: Es führt dich nicht. Geh mit deiner Ausrüstung, deinem Können und deinem Urteil, und prüfe die Verhältnisse vor dem Start. |
| FR | Avant de grimper | MuW enregistre ton ascension et la partage : il ne te guide pas. Pars avec ton matériel, ton expérience et ton jugement, et vérifie les conditions avant de partir. |
| ES | Antes de subir | MuW registra tu ascensión y la comparte: no te guía. Ve con tu equipo, tu experiencia y tu criterio, y revisa las condiciones antes de salir. |

### Valori tecnici (decisi dall'agente su delega dell'utente)

- Apple Salute `.climbing` (9); Health Connect `EXERCISE_TYPE_ROCK_CLIMBING`
  (51): nessuno dei due ha l'alpinismo.
- Le calorie si calcolano come per un'escursione e lo scialpinismo: ACSM
  cammino, conta soprattutto la salita.
- In corsa valgono i numeri di un'escursione (`freeRunAs: "hiking"`).
- Il bottone di «Draw» è «Record your day», come per gli sport sulla neve.
- L'orologio non lo offre (`NOT_ON_WATCH`): la build 14 non conosce lo
  sport e serve una build nuova dell'orologio.

### Criteri di accettazione (parte B)

- [ ] Contratto e profilo insieme; `SERVER_FIRST` tolta dai test dell'API.
- [ ] La riga in «Settings» c'è, «Soon», nella famiglia «On snow» dopo
      «Ski touring»; nelle build dello store non si vede.
- [ ] Nome ed emoji nelle cinque lingue, anche sull'orologio
      (`Localizable.strings`), dove però lo sport resta spento.
- [ ] L'avviso compare una volta sola, coi testi approvati.
- [ ] Una giornata di alpinismo non è un giorno sulla neve nel modulo del
      post (`PublicParts.tsx`).
- [ ] Test toccati e `tsc` verdi; la CI verde.

### File toccati (parte B)

- `packages/shared-types`: `src/sports/alpinism.ts` (nuovo),
  `src/sports/index.ts`, `fixtures/run-activities.json`,
  `fixtures/reads.json`, `test/alpinism.test.ts` (nuovo),
  `test/sportRegistry.test.ts`, `test/paragliding.test.ts`,
  `test/skiTouring.test.ts`
- `services/api/tests`: `test_sport_registry_api.py`,
  `test_alpinism_api.py`, `test_record_only.py`, `test_reads.py`,
  `test_gravel_mtb_api.py`, `test_inline_skating_api.py`,
  `test_snowshoeing_api.py`, `test_wheelchair_api.py`,
  `test_ski_touring_api.py`, `test_paragliding_api.py`
- `apps/mobile/src`: `sports/alpinism.ts` (nuovo), `sports/index.ts`,
  `settings/sport.ts`, `settings/sportFamilies.ts`,
  `screens/RunNoRouteButton.tsx`, `screens/FreeRunScreen.tsx` (una riga),
  `social/PublicParts.tsx`, `watch/watchSports.ts`,
  `mountain/climbNotice.ts` e `climbNotice.test.ts` (nuovi),
  `i18n/{de,es,fr,it}.ts`, più i test dei conteggi di sport e impostazioni
- `apps/mobile/targets/watch`: `sports.json` e i cinque
  `Localizable.strings`, una riga ciascuno
- `docs/UI.md` (la sezione «L'alpinismo»), `docs/API.md` (un paragrafo
  accanto al parapendio), questo file

## Il server

Va sul server in un passo del Coordinatore, col sì dell'utente, dopo il
merge. I controlli di sola lettura sono in `out/TASK-463/SERVER-A.md` nel
checkout principale.

## Diario

- **2026-11-12** — Parte A in `main` (#1242, `f8d91aba`). Il Coordinatore
  ha scelto la strada «solo server», con la deroga `SERVER_FIRST`. La
  migrazione era provvisoria `0076`, poi `0075`, ed è tornata `0076`
  quando la #1245 ha preso la `0075`. `engine.zip` è stato rifatto dopo la
  #1238. In locale passavano i test toccati, migrazioni comprese su
  PostGIS; la CI era verde. Lo script di `out/TASK-463/SERVER-A.md` provato
  su un PostGIS locale dà le righe attese. ADR-0373 è nella PR di
  documenti `docs/TASK-463-a-done`.
