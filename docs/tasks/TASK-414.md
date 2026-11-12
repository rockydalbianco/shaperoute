# TASK-414 — Carrozzina e passeggino: forme semplici di pochi km, dove si spinge davvero

**Stato**: In corso — parte 0 in `main` (#939); parte A in `main` (#1183,
`f614821c`, 2026-11-12: motore, contratto, API, profilo nascosto
nell'app); parte B in PR (l'app, «Soon» fino al sì), branch
`feat/TASK-414-b-wheelchair-app`.
**Fase**: 4 · **Branch**: `docs/TASK-414-0-wheelchair` (parte 0), poi
parte A e parte B · **ADR**: ADR-0343 (accettato 2026-11-12, precisazione A) · numeri dal Coordinatore
· sessione dello sport, avviata dal «Coordinatore Sport»

## Obiettivo

Chi va in carrozzina e chi spinge un passeggino riceve un percorso da 1 a
5 km che disegna una forma semplice (cerchio, cuore, stella, luna) **solo dove si
passa con le ruote**: niente scale, niente cordoli alti segnati, niente
ghiaia, ciottoli, porfido, erba o terra, niente strade principali senza
marciapiede. Lo percorre con passo, voce, salvataggio, Feed, Apple Salute,
Health Connect e Strava del suo sport, «Carrozzina e passeggino» ♿.

È il quarto sport della fase 1 (TASK-376, ADR-0320) che si disegna, dopo
Escursionismo, Gravel/MTB e Roller: file nuovi più una riga per registro
(`docs/sports/COME-AGGIUNGERE.md`).

## Contesto

Scelta dell'utente del 2026-11-07, sugli sport dopo il Roller: «CONTINUA SÌ,
STUDIA PERCORSI PERCORRIBILI E SOLO FORME SEMPLICI DI POCHI KM». Quindi:

- solo forme semplici (cerchio, cuore e simili);
- pochi km;
- una rete davvero percorribile, misurata prima.

Nessuna rete di oggi va bene così com'è: la rete **foot** (corsa,
camminata) prende scale, sentieri, sterrati, ciottoli e porfido; la rete
**roller** (TASK-380) è fatta per i pattini: le scale non le prende, ma
non guarda cordoli, tornelli e barriere, e il suo filtro e le sue zone
sono pensati per 5–30 km.

Da leggere: `docs/sports/COME-AGGIUNGERE.md`, `docs/sports/CONDIVISO.md`,
`docs/sports/README.md` (il banco), `docs/sports/roller.md` (una rete
filtrata sulla superficie, misurata allo stesso modo),
`docs/sports/wheelchair.md` (le misure di questo task), `tasks/TASK-371.md`
(la camminata sulla rete foot), ADR-0320, ADR-0324.

## Cosa fare

### Parte 0 — misura e proposta (solo documenti)

1. Col banco, un comando per volta, `nice -n 10`, a turno con le altre
   sessioni: reti di prova con `--loader` (`out/TASK-414/loader.py`), senza
   toccare il motore. Un download da Overpass per zona, col filtro della
   rete foot e i tag di accessibilità. Forme semplici (cerchio, cuore,
   stella, luna) a 1, 2, 3 e 5 km sulle sei zone.
2. Su cosa corrono i percorsi (scale, cordoli, superfici, strade grandi) e
   quanto salgono, dalle tegole Terrarium: `out/TASK-414/mix.py`. La rete foot
   come base.
3. Quanta rete ha i tag che servono (`out/TASK-414/tags.py`): OSM può essere
   incompleto.
4. Le misure in `docs/sports/wheelchair.md`, ADR-0343 in DECISIONS come
   «Proposto».
5. Le domande all'utente, una per volta, con una proposta già pronta. Le
   risposte qui sotto.
6. La lista della parte A al Coordinatore, con il numero della migrazione.

### Parte A — motore, contratto, API (dopo le scelte, in una sessione sua)

Proposta al Coordinatore (sul modello della lista approvata di TASK-380 A),
con le scelte dell'utente qui sotto: uno sport solo, l'attività
`wheelchair` sulla rete nuova `wheel`, con le regole di `wheelcalm`
(`sports/wheelchair.md`).

```
services/route-engine/route_engine/networks/wheel.py             (nuovo: filtro foot + tag, regole di wheelchair.md)
services/route-engine/route_engine/networks/__init__.py          (una riga)
services/route-engine/route_engine/activities/wheelchair.py      (nuovo: 1–5 km, rete wheel)
services/route-engine/route_engine/activities/__init__.py        (una riga)
services/route-engine/route_engine/activities/base.py, models.py (le forme ammesse: vedi sotto)
services/route-engine/tests/test_wheelchair.py                   (nuovo)
services/route-engine/tests/test_sport_registry.py, test_bike_network.py  (le liste «aggiunte da allora»)
packages/shared-types/src/sports/wheelchair.ts                   (nuovo)
packages/shared-types/src/sports/index.ts                        (una riga)
packages/shared-types/fixtures/route-request-wheelchair.json     (nuovo)
packages/shared-types/fixtures/contract.json, reads.json, run-activities.json
packages/shared-types/test/wheelchair.test.ts                    (nuovo)
packages/shared-types/test/sportRegistry.test.ts
services/api/shaperoute_api/sports/wheelchair.py                 (nuovo: Strava Wheelchair, zone, record 1 e 5 km, GPX)
services/api/shaperoute_api/sports/__init__.py                   (una riga)
services/api/shaperoute_api/activities.py                        (un nome nel Literal)
services/api/shaperoute_api/personal_bests.py                    (un nome nel Literal Sport)
services/api/shaperoute_api/reads.py                             (una riga)
services/api/shaperoute_api/game_rules.py                        (nel gioco come la camminata: scelta 7)
services/api/migrations/0058_wheelchair.sql                       (nuovo: CHECK di runs, favorites, group_runs, run_bests)
services/api/tests/test_wheelchair_api.py                        (nuovo)
services/api/tests/test_sport_registry_api.py, test_personal_bests.py, test_cycling.py,
    test_record_only.py, test_favorites.py, test_paddling.py, test_gravel_mtb_api.py,
    test_inline_skating_api.py                                   (le liste)
services/api/shaperoute_api/route_store.py                       (una riga in SAME_ROUTES_AS, se la prova regge)
services/api/tests/fixtures/same_routes/<impronta>.json          (nuovo: la prova)
apps/mobile/src/sports/wheelchair.ts                             (nuovo: il profilo, nascosto)
apps/mobile/src/sports/index.ts                                  (una riga)
apps/mobile/src/sports/sportProfiles.test.ts, activityName.test.ts,
    src/route/distanceMiles.test.ts, src/api/accounts.test.ts    (le liste)
apps/mobile/targets/watch/Core/Sources/WatchCore/Resources/sports.json  (da scripts/watch-sports.sh)
apps/mobile/targets/watch/{de,en,es,fr,it}.lproj/Localizable.strings   (da scripts/watch-texts.sh)
apps/mobile/assets/engine/engine.zip                             (rifatto, ultimo commit)
docs/tasks/TASK-414.md, docs/STATUS.md, docs/sports/wheelchair.md,
    docs/DECISIONS.md (precisazione di ADR-0343)
```

- **Le forme semplici** (scelta 5: cerchio, cuore, stella, luna): oggi ogni
  sport che si disegna offre tutto il catalogo, e limitarlo è un punto
  nuovo, fuori dalla ricetta. La proposta:
  - il motore rifiuta le altre forme: un campo `shapes` dell'`Activity`
    (`activities/base.py`), letto dove il motore valida la richiesta
    (`models.py`). Così né un'app vecchia né una richiesta a mano
    disegnano un gatto su questa rete;
  - l'app mostra solo quelle in «Disegna»: un campo del profilo
    (`sports/base.ts`), nella parte B.

  Confermato dal Coordinatore (2026-11-08): le rifiuta il motore, coi
  test, e l'app le nasconde nella parte B.
- **L'impronta del motore**: `networks/wheel.py` è un file nuovo nel
  motore. Se i nove percorsi fissi di `test_same_routes.py` restano
  identici, `SAME_ROUTES_AS`, come Roller, Hike e MTB.
- **Una zona `wheel` in memoria sul server**: piccola (distanze fino a 5
  km), ma la parte A la misura (`activity_graphs.ZONES_IN_MEMORY`).
- **Lista approvata dal Coordinatore** (2026-11-08), con la migrazione in
  bozza **`0058_wheelchair.sql`** (0056 è di TASK-406 D1, 0057 di TASK-413
  A2): il numero vero è il primo libero in `main` al merge.
- **L'ordine**: `activities/base.py` e `models.py` li tocca anche TASK-413
  A1 (ciaspole, `on_snow`); il registro (`activities/__init__.py`,
  `test_sport_registry.py`, `sports/__init__.py`, `activities.py`,
  `reads.py`, indice e fixture del contratto) anche 413 A2 e 415 A. Le
  parti A di 413, 414 e 415 entrano una alla volta, nell'ordine che fissano
  il Coordinatore Sport e il Coordinatore; chi entra dopo riallinea da
  `main`.
- **Il motore**: la parte A tocca `services/route-engine/` ed entra solo
  col sì dell'utente per server e `draw_examples`, che chiede il
  Coordinatore. `engine.zip` si rifà nell'ultimo commit. ADR-0343 si segna
  «Accettato» nella parte A.

### Parte B — app (dopo A)

Il profilo completo (`settings/sport.ts`, l'emoji in
`screens/RunNoRouteButton.tsx`, i testi in `i18n`, l'avviso `caution`, le
forme semplici in «Disegna»), con la sua lista al Coordinatore prima del
codice. Salute (scelta 8): Apple `.wheelchairWalkPace`, Health Connect
`EXERCISE_TYPE_WHEELCHAIR`, da verificare sulle librerie, anche per chi
spinge un passeggino.

## Scelte dell'utente

Una alla volta, ciascuna con la proposta dell'agente, il 2026-11-08. Tutte
come la proposta, tranne la prima:

1. **Uno sport solo**, per carrozzina e passeggino. La proposta erano due
   sport sulla stessa rete (tipo giusto in Salute e Strava, record
   separati).
2. **Nome ed emoji**: «Carrozzina e passeggino» ♿.
3. **La rete**: `wheelcalm` di `wheelchair.md`, senza strade principali e
   secondarie prive di marciapiede. Si promettono la città e la pianura: in
   montagna il motore spesso dice che la forma non si disegna (Fiemme 4 su
   16 al banco).
4. **Le distanze**: da 1 a 5 km (al banco 1 km 15 su 24, 2 km 18, 3 km 19,
   5 km 17).
5. **Le forme**: cerchio, cuore, stella, luna. Gli animali e le altre forme
   del catalogo restano fuori per questo sport.
6. **I testi**, approvati come proposti. Il tono è quello dell'app («tu»,
   in tedesco «du»).

   | en | it | de | fr | es |
   |---|---|---|---|---|
   | Wheelchair & stroller | Carrozzina e passeggino | Rollstuhl & Kinderwagen | Fauteuil et poussette | Silla y carrito |
   | Go without a route | Vai senza percorso | Ohne Route los | Partir sans parcours | Salir sin ruta |
   | Map data can miss kerbs, steps and steep slopes: check the route before you set off. | I dati della mappa possono non segnare cordoli, gradini e salite ripide: controlla il percorso prima di partire. | Die Kartendaten zeigen nicht immer Bordsteine, Stufen und steile Steigungen: Prüf die Route, bevor du losgehst. | Les données de la carte peuvent oublier des bordures, des marches et des pentes raides : vérifie le parcours avant de partir. | Los datos del mapa pueden no mostrar bordillos, escalones y cuestas pronunciadas: revisa la ruta antes de salir. |

   - Il nome sta in «Impostazioni», nella ricerca e nei post.
   - Il secondo è il pulsante per partire senza percorso.
   - L'avviso sta sotto ogni percorso dello sport in «Disegna» (il campo
     `caution` del profilo, come Hike e Roller).
7. **Gioco e record**: nel gioco come la camminata (i metri contano, con
   gli stessi controlli), con record personali propri su 1 e 5 km.
8. **Salute e Strava**: il tipo «carrozzina» per tutti (Apple Wheelchair
   Walk Pace, Health Connect Wheelchair, Strava `Wheelchair`), anche per chi
   spinge un passeggino.
9. **Quando si accende**: appena pronto. «ready» diventa vero quando il
   server ha la parte A e l'app ha la parte B. Server, migrazione, notte
   degli esempi (se serve) e aggiornamento di produzione restano ciascuno
   col sì dell'utente.

**Deciso dall'agente su delega dell'utente**:

- L'attività nel contratto si chiama `wheelchair`, la rete `wheel`. Non una
  forma in «-ing»: `wheeling` direbbe poco, e uno sport solo per due modi di
  spingere si chiama meglio dal suo tipo di Salute e Strava.
- Nel gioco fa come la camminata, Hike e Roller: i metri contano, niente
  tempi migliori del gioco; i record sono a parte, in `personal_bests`. Le
  soglie «veicolo» restano quelle della corsa: chi spinge non arriva a 25
  km/h.

## Criteri di accettazione

- [x] 0: le misure delle reti sono in `wheelchair.md`; ADR-0343 è proposto.
- [x] 0: le scelte dell'utente sono scritte qui, una per una (2026-11-08).
- [x] 0: la lista della parte A è al Coordinatore, con la domanda sul numero
      della migrazione (approvata, 0058 in bozza, 2026-11-08).
- [x] A: un percorso sul grafo di prova evita scale, cordoli alti, superfici
      ruvide e strade grandi senza marciapiede; test deterministici; corsa,
      bici e canoa invariate (i nove percorsi fissi di `test_same_routes.py`,
      2026-11-11).
- [ ] B: lo sport si sceglie, si percorre, si salva e va in Salute; i testi
      sono in cinque lingue.

## File toccati

Parte 0:

```
docs/tasks/TASK-414.md      (nuovo)
docs/sports/wheelchair.md   (nuovo)
docs/DECISIONS.md           (solo ADR-0343, in fondo)
docs/STATUS.md              (righe proprie)
docs/INDEX.md               (una riga)
```

Le scelte sono nella stessa PR: sono arrivate prima che la PR fosse aperta.

Parte A (lista rifatta su `main` `78c2fc87` e approvata dal Coordinatore il
2026-11-11; migrazione `0071` in bozza, il numero vero è il primo libero al
merge). Rispetto a quella dell'8 novembre: STATUS, DECISIONS e INDEX vanno
nella PR di documenti dopo il merge; in più `searchFilters.ts`, i test con
le liste in ordine (`test_inline_skating.py`, `test_snowshoeing.py`,
`test_ski_touring_api.py`, `test_personal_bests.py`), `docs/API.md` e `docs/DATABASE.md`, come Roller
A (#912) e Ciaspole A2 (#1130).

```
services/route-engine/route_engine/networks/wheel.py             (nuovo)
services/route-engine/route_engine/networks/__init__.py
services/route-engine/route_engine/activities/wheelchair.py      (nuovo)
services/route-engine/route_engine/activities/__init__.py, base.py
services/route-engine/route_engine/models.py
services/route-engine/tests/test_wheelchair.py                   (nuovo)
services/route-engine/tests/test_sport_registry.py, test_bike_network.py,
    test_inline_skating.py, test_snowshoeing.py
packages/shared-types/src/sports/wheelchair.ts                   (nuovo)
packages/shared-types/src/sports/index.ts
packages/shared-types/fixtures/route-request-wheelchair.json     (nuovo)
packages/shared-types/fixtures/contract.json, reads.json, run-activities.json
packages/shared-types/test/wheelchair.test.ts                    (nuovo)
packages/shared-types/test/sportRegistry.test.ts
services/api/shaperoute_api/sports/wheelchair.py                 (nuovo)
services/api/shaperoute_api/sports/__init__.py
services/api/shaperoute_api/activities.py, personal_bests.py, reads.py, game_rules.py
services/api/migrations/0071_wheelchair.sql                      (nuovo)
services/api/tests/test_wheelchair_api.py                        (nuovo)
services/api/tests/ (le liste): test_sport_registry_api.py, test_personal_bests.py,
    test_cycling.py, test_record_only.py, test_favorites.py, test_paddling.py,
    test_gravel_mtb_api.py, test_inline_skating_api.py, test_ski_touring_api.py
services/api/shaperoute_api/route_store.py                       (SAME_ROUTES_AS)
services/api/tests/fixtures/same_routes/<impronta>.json          (nuovo: la prova)
apps/mobile/src/sports/wheelchair.ts                             (nuovo, nascosto)
apps/mobile/src/sports/index.ts
apps/mobile/src/search/searchFilters.ts                          (NOT_YET)
apps/mobile/src/sports/sportProfiles.test.ts, activityName.test.ts,
    src/route/distanceMiles.test.ts, src/api/accounts.test.ts
apps/mobile/targets/watch/Core/Sources/WatchCore/Resources/sports.json
apps/mobile/targets/watch/{de,en,es,fr,it}.lproj/Localizable.strings
apps/mobile/assets/engine/engine.zip                             (rifatto, ultimo commit)
docs/tasks/TASK-414.md, docs/sports/wheelchair.md, docs/API.md, docs/DATABASE.md
```

Parte B (lista approvata dal Coordinatore il 2026-11-12, su `main`
`ef07030b`):

```
packages/shared-types/src/index.ts                  (WHEELCHAIR_BEST_DISTANCES, PersonalBest)
apps/mobile/src/sports/base.ts                       (campo `shapes`)
apps/mobile/src/sports/wheelchair.ts                 (profilo intero)
apps/mobile/src/settings/sport.ts                    (la riga «Soon», «Go without a route»)
apps/mobile/src/screens/RunNoRouteButton.tsx         (♿)
apps/mobile/src/search/searchFilters.ts              (via da NOT_YET)
apps/mobile/src/route/RoutePanel.tsx, ShapeGrid.tsx  (le quattro forme)
apps/mobile/src/social/PublicParts.tsx               (lo sport dei post)
apps/mobile/src/imports/fileTrack.ts                 («wheelchair» in un file)
apps/mobile/src/i18n/{de,es,fr,it}.ts                (i tre testi della scelta 6)
apps/mobile/targets/watch/{de,es,fr,it}.lproj/Localizable.strings (dagli script)
apps/mobile/src/sports/wheelchairProfile.test.ts     (nuovo)
apps/mobile/src/route/RoutePanelWheelchair.test.tsx  (nuovo)
apps/mobile/src/settings/: sport.test.ts, sportRows.test.ts, SportButton.test.tsx,
    SportSetting.test.tsx, SportVoiceItalian.test.tsx; src/sports/sportProfiles.test.ts,
    src/profile/SettingsPage.test.tsx                (le liste)
apps/mobile/src/profile/PersonalBests.tsx (+ test)   (il gruppo dei record, dopo la #1205)
apps/mobile/App.tsx                                  (drawKind e la forma dal profilo, nel turno del Coordinatore)
apps/mobile/src/route/sportDraw.ts (+ test)          (nuovo: drawKindOf, shapeOfSport)
docs/tasks/TASK-414.md, docs/sports/wheelchair.md
```

## Dove si è

2026-11-07/08: misurate col banco sei reti di prova, da un download per zona
col filtro della rete foot e i tag di accessibilità. La rete foot sulla
stessa area è la base (92 su 96, 31 buoni):

- **`wheel`** (niente scale, cordoli alti, superfici ruvide, `smoothness`
  cattiva, sentieri senza superficie): 81 su 96, 13 buoni; ma il 9% dei km
  su strade principali e secondarie senza marciapiede.
- **`wheelcalm`** (`wheel` senza quelle strade): 69 su 96, 9 buoni; Trento
  e Milano 16 su 16, pianura 13; Fiemme 4.
- **`wheelstrict`**: 65 su 96, 5 buoni.
- **`wheelflat6`** (senza i tratti oltre il 6%): 67 su 96; vorrebbe le
  quote nel motore.
- **OSM incompleto**: i cordoli si sanno solo a Milano e in parte a Trento
  (36 attraversamenti su 1.000 sui percorsi di `wheelcalm`); `incline` c'è
  sull'1–3% dei km, `wheelchair` quasi mai.

Le misure sono in `wheelchair.md`. Le scelte dell'utente (2026-11-08) sono
qui sopra: uno sport solo, «Carrozzina e passeggino» ♿ sulla rete
`wheelcalm`, 1–5 km, cerchio, cuore, stella e luna, nel gioco con record su
1 e 5 km, tipo carrozzina in Salute, acceso appena pronto. ADR-0343 è
proposto, con le scelte dentro. Lista della parte A approvata dal
Coordinatore, migrazione 0058 in bozza, forme rifiutate dal motore.
Prossimo: la parte A in una sessione nuova, nel turno che fissano il
Coordinatore Sport e il Coordinatore (dopo o prima di 413 A e 415 A).

- Gli script del banco sono in `out/TASK-414/` nel worktree della parte 0
  (`task-414-0-wheelchair`), ignorato da git: `loader.py`, `mix.py`,
  `elevation.py`, `tags.py`, `summ.py`, `bench.sh`. I download grezzi delle
  sei zone sono in `out/TASK-414/cache/raw_*.pickle`: utili alla parte A per
  non riscaricare.

2026-11-11, parte A (branch `feat/TASK-414-a-wheelchair`, lista rifatta su
`main` `78c2fc87`, via del Coordinatore, migrazione `0071` in bozza):

- **Motore**: la rete `wheel` (`networks/wheel.py`) è `wheelcalm` del
  banco più le regole della rete foot di TASK-421; sui 30 download grezzi
  della parte 0 ha gli stessi km e le stesse vie della rete del banco.
  L'attività `wheelchair`, 1–5 km, ha `Activity.shapes` = cerchio, cuore,
  stella, luna: `models.py` rifiuta ogni altra forma, le parole, le
  immagini, i disegni e i tratti.
- **Impronta**: i nove percorsi fissi uguali (`e0834d054b6e` →
  `427ed1a16a97`); sul server, dopo il passo, `e0834d054b6e 8ab61d8e87f9
  b9d00c37d28d 574fbfba41eb` (se nessun altro motore entra prima).
- **API**: Strava `Wheelchair`, GPX `wheelchair`, record su 1 e 5 km (25
  km/h come pavimento, come un salto del GPS a piedi), nel gioco come la
  camminata coi controlli della corsa; zone sue di 8,5 × 8,5 km coi nomi
  delle strade, una in memoria (da 2 a circa 170 MB, `sports/wheelchair.md`).
  Ogni corsa salvata tiene anche i record `wheelchair` (come per il
  Roller): la migrazione va applicata prima che parta il codice nuovo.
- **App**: profilo nascosto (nessuna riga in «Impostazioni», fuori dalla
  ricerca), nome inglese e calorie della camminata fino alla parte B.
- **Restano**: il passo server col sì dell'utente (controlli in
  `out/TASK-414/SERVER-A.md`), la PR di documenti dopo il merge (STATUS,
  DECISIONS con ADR-0343 «Accettato», INDEX), poi la parte B.

2026-11-12: la #1183 è in `main` (`f614821c`), unita dall'utente sulla
testa `53a3b9cc`, dopo il merge di `main` col parapendio (0069) e le
risposte ai commenti (0070): la migrazione è la `0071_wheelchair.sql`.
Impronte invariate. ADR-0343 è accettato, con la precisazione A.

## Cosa resta

- **Server**: la parte A è sul server dal passo 10 del 2026-11-12
  (12:20Z, `1eb3e5a8`), con la `0071_wheelchair` applicata. I controlli 1
  e 2 di `out/TASK-414/SERVER-A.md` sono come attesi: i quattro vincoli
  con la carrozzina, health 200, impronte `e0834d054b6e 8ab61d8e87f9
  b9d00c37d28d 574fbfba41eb`. Restano il 3 e il 4 (un cuore di 3 km a
  Trento, una forma rifiutata col 422), come riga per l'utente.
- **Orologio**: i file di `targets/watch/**` della parte A (`sports.json`,
  `Localizable.strings`) non entrano nella build 14 dell'orologio già in
  revisione; entrano con la build dopo.
- **Parte B** (l'app): in PR (#1234), `App.tsx` compreso (una forma non
  delle quattro non parte, `route/sportDraw.ts`). Restano le schermate al
  turno di simulatore della sessione (dopo l'OTA di oggi; coda 461 A2 →
  470 → 466 B → 469 A1 → 414 B) e il sì dell'utente.
- **Lasciati apposta in B**: `imports/fit.ts` (i codici FIT della
  carrozzina non sono verificati: un file FIT di carrozzina resta allo
  sport di «Impostazioni»; GPX e TCX che dicono «wheelchair» sì);
  `route/runTime.ts` e `sports/postMetrics.ts` non cambiano (tempo al
  passo della camminata, le righe del post di una camminata senza
  cadenza).
- **Accensione**: `ready: true` con una riga a parte, col sì dell'utente,
  dopo che il server ha la `0071` e dopo le schermate.

2026-11-12, parte B (branch `feat/TASK-414-b-wheelchair-app`, lista
approvata dal Coordinatore, da `main` `ef07030b`):

- **«Settings»**: «Wheelchair & stroller» ♿ dopo «Roller», `ready: false`
  («Soon», fuori dalla ricerca e dal modulo per pubblicare) finché il
  server non ha la `0071` e l'utente non dice sì: si accende con una riga
  a parte, dopo le schermate. «Go without a route» per partire senza
  percorso.
- **«Disegna»**: il campo nuovo `shapes` del profilo; la carrozzina ha
  solo cerchio, cuore, stella e luna, tutti in vista. Niente parole,
  immagini, «Freehand», «altra forma» scritta; una forma scelta prima che
  non è delle quattro non si mostra; dopo una forma che non entra si
  propongono solo le quattro. L'avviso sui cordoli sotto ogni percorso.
- **Profilo**: tempo al passo della camminata (deciso dall'agente: chi
  spinge va come chi cammina), record su 1 e 5 km («1 km», «5 km»),
  energia della camminata anche per la carrozzina (uno sport solo, scelta
  1), Apple `.wheelchairWalkPace` senza distanza del giorno (la distanza
  «carrozzina» di Salute sarebbe sbagliata per chi spinge un passeggino).
  Nel profilo il gruppo dei record «Wheelchair & stroller» dopo il Roller.
- **Import**: un file che dice «wheelchair» (MuW, Strava, Garmin
  `wheelchair_push_*`) è una carrozzina, mai una corsa.
- Solo JavaScript: impronta iOS invariata.

