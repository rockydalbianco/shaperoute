# TASK-413 — Ciaspole: forme piccole libere sulla neve

**Stato**: In corso — parte 0 in `main` (#933, `189374bc`); A1 in `main` con
la #957 (`a63254d3`, mergiata dall'utente) e sul server col passo unico del
2026-11-10 (main `9cf5576b`; controllo in `out/TASK-413/check-957.md`);
A2 in `main` con la #1130 (`ac08ae94`, mergiata dall'utente il
2026-11-11) e sul server col passo 8 (2026-11-11 22:14Z, `ab5b2983`;
controllo in `out/TASK-413/SERVER-A2.md`), l'app nascosta col decimo OTA;
A3 (la città detta subito) in `main` con la #1238 (`8f5d0516`, unita
dall'utente il 2026-11-12), sul server col passo 11 (controllo in
`out/TASK-413/SERVER-A3.md`), corretta dalla #1266 (`b079f067`: il job
non passava il conteggio) col passo 12; B e C in `main` con la #1280
(`335f75f5`); privacy delle quote nella #1281 (`34fed156`, OTA 16);
accese con la #1296 (`ba569576`). Restano l'OTA che le porta in produzione
e la prova in Salute sul telefono
**Fase**: 4 · **Branch**: `docs/TASK-413-0-snowshoes` (parte 0), poi
`feat/TASK-413-a1-snow-engine`, `feat/TASK-413-a2-snowshoes-api`,
`feat/TASK-413-b-snowshoes-app` · **ADR**: ADR-0342 · numeri dal
Coordinatore (2026-11-08) · sessione dello sport, avviata dal «Coordinatore
Sport»

## Obiettivo

Chi va con le ciaspole sceglie «Snowshoes» ❄️ e riceve una **forma piccola,
da 0,5 a 3 km, piazzata libera sulla neve**: non su una rete di strade, ma
su prati e pascoli dove si può camminare, lontano da pendii ripidi, piste,
rocce e paesi. Prima del primo «Start» vede un avviso di sicurezza. Può
anche registrare senza forma. La traccia diventa il disegno nel Feed, va in
Apple Salute, Health Connect e Strava.

## Contesto

- L'utente il 2026-11-07: «SI ANCHE FORME LIBERE SULLA NEVE PIÙ PICCOLE».
  Le ciaspole non sono solo «Record only» (TASK-375, ADR-0319): hanno anche
  forme, più corte di quelle degli altri sport.
- Sulla neve non c'è una rete: il modello è quello della canoa e del nuoto
  (`water_fit.py`, ADR-0154, TASK-323). **La forma piazzata è il
  percorso**, dentro un'area permessa, raggiunta da un punto da cui si
  entra a piedi.
- Le misure sono in `docs/sports/snowshoes.md`.

Da leggere: `docs/sports/COME-AGGIUNGERE.md`, `docs/sports/CONDIVISO.md`,
`docs/sports/snowshoes.md`, ADR-0154 (la forma sull'acqua), ADR-0283 (il
nuoto e il suo avviso), ADR-0319 («Record only»), ADR-0300 (le quote).

## Cosa fare

### Parte 0 — misura e proposta (solo documenti)

1. Col banco, un giro per volta, `nice -n 10`: la forma libera di
   `water_fit` con la neve al posto dell'acqua (`out/TASK-413/snow.py`), sulle
   due zone di montagna del banco e su tre posti da ciaspole, a 0,5–3 km.
   Varianti di pendenza, boschi, ruscelli, aree protette.
2. Le misure in `docs/sports/snowshoes.md`, ADR-0342 in DECISIONS.
3. Le scelte dell'utente, una per volta (qui sotto).
4. La lista della parte A al Coordinatore, con il numero della migrazione.

### Parte A — la neve nel motore, poi contratto e API (dopo le scelte)

Una forma libera fuori dall'acqua non è «file nuovi più una riga»: il
motore oggi conosce due modi di disegnare, sulla rete e sull'acqua, e
l'API distingue l'acqua in sei punti (`WATER_ACTIVITIES`). Proposta: due
PR, così i file restano bloccati poco.

**A1 — la neve nel motore** (`feat/TASK-413-a1-snow-engine`), senza
contratto né API:

```
services/route-engine/route_engine/heights.py          (nuovo: le quote dalle tegole Terrarium, in cache; il modulo condiviso di ADR-0300 G, da accordare con TASK-347 tramite il Coordinatore)
services/route-engine/route_engine/snow.py             (nuovo: filtro Overpass, l'area di neve come water.WaterArea, i punti da cui si entra, le regole di snowshoes.md)
services/route-engine/route_engine/snowshoeing.py      (nuovo: plan_snowshoeing, come paddling.plan_paddling; la verifica sulla neve)
services/route-engine/route_engine/activities/snowshoeing.py  (nuovo: 0,5–3 km, on_snow)
services/route-engine/route_engine/activities/__init__.py     (una riga)
services/route-engine/route_engine/activities/base.py  (il campo on_snow)
services/route-engine/route_engine/models.py           (SNOW_ACTIVITIES ricavato dal registro; FREE_ACTIVITIES = acqua + neve)
services/route-engine/route_engine/__main__.py         (il ramo della neve nella riga di comando)
services/route-engine/tests/test_snow.py, test_snowshoeing.py, test_heights.py  (nuovi, con elementi e quote finti: niente rete)
services/route-engine/tests/test_sport_registry.py     (la lista «aggiunte da allora»)
services/api/shaperoute_api/route_store.py             (SNOW_ONLY fuori dall'impronta, come DRAWN_WATER_ONLY)
docs/tasks/TASK-413.md, docs/STATUS.md, docs/sports/snowshoes.md
```

- `water_fit.py` e `water.py` **non cambiano**: canoa e nuoto restano
  identici (banco `compare --same`, i nove percorsi fissi).
- L'impronta del motore resta se `snow.py`, `snowshoeing.py` e
  `heights.py` stanno fuori come `DRAWN_WATER_ONLY`; i file toccati del
  registro e di `models.py` vanno provati con `SAME_ROUTES_AS`.
- Se `activities/snowshoeing.py` entra nel registro, il contratto deve
  conoscerla nella stessa PR (`test_sport_registry` del contratto): allora
  A1 porta anche le righe del contratto di A2. Lo decide la sessione A1 col
  Coordinatore, guardando il test.

**A2 — contratto, API, profilo nascosto** (`feat/TASK-413-a2-snowshoes-api`),
sulla lista della 380-A:

```
packages/shared-types/src/sports/snowshoeing.ts                (nuovo)
packages/shared-types/src/sports/index.ts                      (una riga)
packages/shared-types/fixtures/route-request-snowshoeing.json  (nuovo)
packages/shared-types/fixtures/contract.json, reads.json, run-activities.json
packages/shared-types/test/snowshoeing.test.ts                 (nuovo), sportRegistry.test.ts
services/api/shaperoute_api/sports/snowshoeing.py              (nuovo: Strava «Snowshoe», GPX, nessun record)
services/api/shaperoute_api/sports/__init__.py                 (una riga)
services/api/shaperoute_api/snowshoeing.py                     (nuovo: la neve in <cache>/snow/ e le quote in <cache>/heights/, Overpass a un posto nuovo)
services/api/shaperoute_api/jobs.py                            (il ramo della neve, come l'acqua)
services/api/shaperoute_api/activity_graphs.py, errors.py, way_back.py, route_archive.py
                                                               (acqua → FREE_ACTIVITIES dove conta «niente rete»)
services/api/shaperoute_api/activities.py                      (un nome nel Literal)
services/api/shaperoute_api/reads.py                           (una riga)
services/api/shaperoute_api/game_rules.py                      (con la camminata e Hike: scelta 5)
services/api/migrations/00XX_snowshoeing.sql                   (nuovo: CHECK di runs, favorites, group_runs)
services/api/tests/test_snowshoeing_api.py                     (nuovo)
services/api/tests/test_sport_registry_api.py, test_game_rules.py, test_record_only.py,
    test_favorites.py, test_paddling.py, test_hiking_api.py, test_walking_api.py (le liste)
apps/mobile/src/sports/snowshoeing.ts                          (nuovo: il profilo, nascosto)
apps/mobile/src/sports/index.ts                                (una riga)
apps/mobile/src/search/searchFilters.ts                        (l'esclusione, se serve ancora)
apps/mobile/src/sports/sportProfiles.test.ts, activityName.test.ts,
    src/route/distanceMiles.test.ts, src/api/accounts.test.ts  (le liste)
apps/mobile/targets/watch/Core/Sources/WatchCore/Resources/sports.json  (da scripts/watch-sports.sh)
apps/mobile/targets/watch/{de,en,es,fr,it}.lproj/Localizable.strings    (da scripts/watch-texts.sh)
apps/mobile/assets/engine/engine.zip                           (rifatto, ultimo commit)
docs/tasks/TASK-413.md, docs/STATUS.md, docs/sports/snowshoes.md,
    docs/DECISIONS.md (precisazione di ADR-0342)
```

- La migrazione è in bozza `0057_snowshoeing.sql` (la 0056 è la bozza di
  TASK-406 D1); il numero vero è il primo libero al merge (Coordinatore,
  2026-11-08).
- Nessuna zona in memoria: niente grafo. La neve e le quote si scaricano
  alla prima richiesta di un posto, come l'acqua.
- `draw_examples.py` e `paddle_examples.py`: niente esempi di neve in
  questa parte (gli esempi del server sono un passo a parte, col sì
  dell'utente).
- Prima del codice, ogni sessione conferma la sua lista al Coordinatore.

**Condizioni del Coordinatore** (2026-11-08):

- A1 e A2 partono in **sessioni nuove**, col numero TASK-413 già assegnato;
  ciascuna conferma la sua lista prima del codice.
- **A1 tocca il motore**: la PR entra solo con l'ok dell'utente per il
  server e per gli esempi (`draw_examples`), che chiede il Coordinatore.
- **`heights.py` è il modulo condiviso con TASK-347 G** (ADR-0300): prima
  del codice A1 si accorda con chi fa TASK-347 G su chi lo crea, e manda la
  lista al Coordinatore.
- **A2** entra anch'essa con l'ok dell'utente per il server.
- Il banco della parte 0 è in `out/TASK-413/snow.py` del checkout
  principale (ignorato da git): i dati (`osm/`, `dem/`, `results/`) si
  riscaricano e si rifanno con `fetch` e `run`; le regole scelte sono la
  variante `chosen`.

**Accordi della parte A1** (2026-11-08):

- **`heights.py` lo crea A1** (Coordinatore, 2026-11-08): TASK-347 G non
  ha né sessione né branch. A1 scrive la parte comune minima (tegole
  Terrarium da PNG con Pillow, già dipendenza del motore; cache in
  `<cache>/heights/`; quota bilineare per punto; griglia di pendenze a celle
  di 25 m; il download dietro una funzione sostituibile, niente rete nei
  test), fuori dall'impronta come `DRAWN_WATER_ONLY`. G vi aggiunge
  `elevation_profile`, TASK-415 C la pendenza sotto la traccia, senza
  riscriverlo. `tasks/TASK-347.md` non si tocca: l'accordo sta qui, il
  Coordinatore lo mette in `AGENTI.md`.
- **Le ciaspole nel motore, non nel contratto** (Coordinatore,
  2026-11-08): una tupla `ENGINE_ONLY` del registro; `SUPPORTED_ACTIVITIES`,
  il contratto e l'API non cambiano in A1. A2 sposta `snowshoeing` in
  `ENGINE_ACTIVITIES` insieme alle righe del contratto.
- **L'ordine con TASK-414 A** (Coordinatore Sport, 2026-11-08): A1 entra
  prima; TASK-414 A riallinea su `main` dopo (`activities/`, `models.py`,
  `test_sport_registry.py`, `test_bike_network.py`, `route_store.py` in
  comune).
- **Per A2**: `anchored.check_placement` rifiuta oggi solo l'acqua; va
  esteso a `FREE_ACTIVITIES` quando le ciaspole entrano nell'API. Al banco
  (`sports/snowshoes.md`, «La parte A1»): in una città una richiesta costa
  fino a 44 s, e l'errore può proporre meno di 0,5 km; `errors.py` scarta
  le distanze sotto il minimo solo per `WATER_ACTIVITIES`.

### Parte B — app (dopo A)

Il profilo completo (`settings/sport.ts`, l'emoji in
`screens/RunNoRouteButton.tsx`, i testi in `i18n`, il campo `caution`),
l'avviso di sicurezza al primo «Start» come quello della canoa e del nuoto
(un file suo, `snow/safetyNotice.ts`), «Record your day» se lo sport resta
anche «Record only», i numeri di fine giro (dislivello, tempo). Apple
Salute: nessun tipo «ciaspole» (si propone `hiking`, da verificare); Health
Connect: `EXERCISE_TYPE_SNOWSHOEING`, da verificare sulla libreria. Solo
JavaScript: l'impronta iOS non si muove. La lista al Coordinatore prima del
codice.

**Parte B, accordi** (2026-11-12; lista dei file approvata dal
Coordinatore, `feat/TASK-413-b-snowshoes-app`):

- **I testi sono riapprovati dall'utente** il 2026-11-12, con le parole
  «Sì, vanno bene». Sono:
  - l'avviso valanghe intero nelle cinque lingue, mostrato di nuovo perché
    è un testo di sicurezza;
  - nome e riga sotto ogni percorso, come nella scelta 4;
  - i testi nuovi della neve, nelle cinque lingue:
    - «There is no open snow near this start. Start within 2 km of open
      snow, away from towns, woods and pistes.» (in miglia, «1 mile»);
    - «This shape does not fit on the snow here at this distance. It fits
      at about {km} km.»;
    - «This shape does not fit on the snow here. Try a shorter distance,
      another shape, or another start:»;
    - «{name} · on the snow · target {km} km».
- **`isPlacedFree`** (`src/snow/snow.ts`, acqua o neve) è un predicato
  nuovo: `isOnWater` non si allarga. Lo chiedono i punti dove la neve fa
  come l'acqua:
  - pezzi a penna alzata;
  - nessun «Move» del punto di partenza;
  - nessuna indicazione, né sul telefono né sull'orologio.

  Gli esempi, i posti e gli avvisi dell'acqua restano `isOnWater`. Un test
  dice che per ogni attività tranne le ciaspole `isPlacedFree` vale quanto
  `isOnWater`.
- **Nessun tempo sotto la distanza**: il passo di chi cammina, sulla neve,
  prometterebbe meno tempo di quello reale. Deciso dall'agente su delega
  dell'utente.
- **Lo sport resta `ready: false`** nella PR. Si accende con una riga a
  parte, col sì dell'utente dato al Coordinatore, dopo le schermate.
- **Accensione**: l'utente ha detto «Sì, accendi» alle schermate
  (2026-11-12, `out/TASK-413/sim/`). La PR piccola
  `feat/TASK-413-snowshoes-on` porta `fromProfile("snowshoe", true)` e i
  test delle liste. Si apre dopo che il Coordinatore conferma «passo 12 e
  prova come attesi», con la riga della privacy (#1281) in `main`.
- **Anche «Record your day»**: scelta dell'utente del 2026-11-12, «Anche
  Record your day», contro la proposta dell'agente «solo forme». Le
  ciaspole avranno anche la giornata sulla neve da registrare intera, come
  lo sci e lo scialpinismo. È una **parte a sé, dopo B** (la parte C):
  - la B resta quella delle forme, con il suo «Snowshoe without a route»;
  - la C porta la riga in Impostazioni, la giornata, i suoi numeri e i suoi
    testi;
  - la lista dei file e il disegno della C vanno al Coordinatore prima del
    codice.
- **La C sta dentro le ciaspole**: scelta dell'utente del 2026-11-12,
  «Dentro le ciaspole», fra le due strade portate dal Coordinatore:
  - (1) una riga nuova «Snowshoe day» in Impostazioni, sport a sé;
  - (2) «Record your day» dentro le ciaspole che già ci sono.

  Vale la (2): una riga sola, «Snowshoes», nessuna migrazione, nessun
  passo sul server, esce con un OTA. L'utente ha approvato il
  2026-11-12, con le parole «Sì, vanno bene», la proposta dell'agente e
  il testo nuovo nelle cinque lingue:
  - il bottone in alto di «Draw» diventa «Record your day», al posto di
    «Snowshoe without a route»;
  - a fine uscita c'è la scheda «Your day» del fondo (distanza, passo,
    metri saliti, tempo, calorie);
  - sulla mappa la riga è «White: where you walked.»: it «Bianco: dove
    hai camminato.», de «Weiß: wo du gegangen bist.», fr «Blanc : là où
    tu as marché.», es «Blanco: donde caminaste.».

- **Privacy delle quote** (2026-11-12): per la neve il server scarica le
  quote da Amazon Web Services (tessere Terrarium, `heights.py`), e la
  privacy nominava Amazon solo per la mappa «3D» del telefono. L'utente ha
  approvato con le parole «Sì, va bene» la riga nuova da aggiungere in «Chi
  altro riceve dati»:
  - en: «For a snowshoe route our server asks Amazon Web Services for the
    heights of an area it does not have yet: it sees which area, not who
    asked.»;
  - it: «Per un percorso con le ciaspole il nostro server chiede ad Amazon
    Web Services le altezze di una zona che non ha ancora: vede quale zona,
    non chi l'ha chiesta.».

  Va scritta prima dell'accensione, nel turno del Coordinatore su
  `about/content/**` e `site/privacy/**`.

**Accordi e scelte della parte A2** (2026-11-10, decise dall'agente su
delega dell'utente):

- **La migrazione è `0068_snowshoeing.sql`** in bozza: la 0057 è passata a
  TASK-415, il server è alla 0066 e la 0067 è della #1099 (TASK-423 E1),
  aperta. Il numero vero è il primo libero al merge (Coordinatore).
  L'utente ha dato il via al codice («continua e risolvi») prima della
  risposta del Coordinatore sulla lista.
- **Nessun percorso sulla neve è tenuto**: né `route_store` né l'archivio
  (`route_archive._kept`). I file della neve stanno fuori dall'impronta
  (`SNOW_ONLY`): un percorso tenuto sopravvivrebbe alle regole che l'hanno
  disegnato.
- **Le quote si leggono con un `TerrariumTiles` nuovo per richiesta**: le
  tegole restano su disco in `<cache>/heights/`, non in memoria per ogni
  posto chiesto. Un download che non riesce (neve o quote) è `503
  map_data_unavailable`, come una zona.
- **L'errore propone il mezzo km** a cui la forma entra, come sull'acqua
  (`errors.suggested_distance` su `FREE_ACTIVITIES`), e nessuna distanza
  sotto 0,5 km.
- **La città lenta** (fino a 44 s, `sports/snowshoes.md`): A2 non aggiunge
  un controllo «poca neve» prima del piazzamento, che toccherebbe il motore
  (`snowshoeing.py`); il job è asincrono e una città non è un posto da
  ciaspole. Se i tempi del server lo chiedono, è un passo a parte.
  **Il server lo chiede**: Trento 3 km, la prima volta, `failed
  shape_not_drawable` in **76,4 s** (passo 8). Al banco sul Mac (Milano,
  dalla cache, 83.000 elementi) la ricerca costa 0,7 s e `snow.build_area`
  16–19 s, quasi tutto shapely elemento per elemento (buffer, unioni);
  sul server, la prima volta, c'è in più lo scarico da Overpass. Diventa
  la parte A3 (Coordinatore, 2026-11-11), sotto.
- **Il profilo nell'app è nascosto**: nessuna riga in «Impostazioni», la
  ricerca lo lascia fuori (`searchFilters.NOT_YET`), il modulo per
  pubblicare non lo elenca. Nome in inglese senza `tLater`, niente
  `caution` né tempo: li porta B con i testi. Le calorie sono quelle di
  Hike, come per lo scialpinismo (TASK-424 C2, #1098: calorie per ogni
  attività, scelta dell'utente del 2026-11-10). Apple Salute `hiking`
  (24, nessun tipo per le ciaspole), Health Connect
  `EXERCISE_TYPE_SNOWSHOEING` (63, verificato sulla libreria).

**A3 — la città detta subito** (`feat/TASK-413-a3-snow-early-no`, chiesta
dal Coordinatore il 2026-11-11 dopo il passo 8, prima di B; decisa
dall'agente su delega dell'utente):

- **Prima di leggere la neve**, il motore conta gli edifici attorno alla
  partenza; sopra la soglia dice subito «no open snow», lo stesso
  `NoSnowError` di oggi (nessun testo nuovo). Il conteggio viene dalla
  neve già in cache (senza rete), da un file di conteggio
  (`<cache>/snow/count_….json`) o da Overpass (`out count`, 5 s per
  Overpass, 6 s di attesa al massimo), ed è tenuto in cache.
- **Un conteggio che non arriva non è un errore**: Overpass lento, 429 o
  502 (stanotte frequenti) e la richiesta va avanti come prima; la volta
  dopo il rifiuto viene dalla neve scaricata.
- **Il riquadro è fisso**, 4,8 km di lato attorno alla partenza
  (`snow.town_bbox`: dove una forma può stare), lo stesso per ogni forma e
  distanza. Il riquadro della richiesta cresce con la forma e per una
  valle arriva alle montagne: Bolzano per un cuore di 3 km scendeva sotto
  Asiago.
- **La soglia è 280 edifici per km²**, scelta sui conteggi di 21 posti
  (`sports/snowshoes.md`): il posto con neve più denso è Asiago (180), le
  città Trento (350), Belluno (345), Milano (700). **Bolzano (207) e Aosta
  (247) non sono dette subito**: sono dense come un paese, e prenderle
  vorrebbe una soglia a un passo da Asiago (meglio l'attesa che un «no»
  sbagliato, Coordinatore). Per loro aiuta la parte a sé che rende
  `build_area` più veloce.
  Soglia e Bolzano e Aosta fuori: sì del Coordinatore, 2026-11-12.
- **Nessuna impronta cambia**: `snow.py` e `snowshoeing.py` stanno in
  `SNOW_ONLY` (codice ed efficaci uguali a main: `e0834d054b6e` / `8ab61d8e87f9` dopo la TASK-414 A).
  `engine.zip` li contiene: rifatto nell'ultimo commit.
- **Sul server** arriva con un passo suo dopo il merge; controllo: la riga
  di Trento 3 km del passo 8 (76 s) scende a pochi secondi, con lo stesso
  `shape_not_drawable` «no open snow».
- **In città il messaggio diventa «no open snow»**: prima Milano dava
  `SnowFitError` («the circle does not fit on open snow here, even at
  0.4 km», a volte con una distanza più corta); ora dà subito `NoSnowError`
  («there is no open snow to walk on within 2 km of here»). Per l'app è
  sempre `shape_not_drawable`.
- **Il banco prima e dopo** (2026-11-12, turno del Mac,
  `out/TASK-413/results/a3-compare.txt`): 72 richieste (6 posti, cerchio,
  cuore e stella, da 0,5 a 3 km). Le 60 dei cinque posti con neve sono
  identiche. Tempi per posto, prima → dopo:
  - Milano: 67,0 → 3,3 s (0,3 s a richiesta);
  - Asiago: 24,9 → 24,3 s;
  - Fiemme: 19,5 → 16,1 s;
  - Lavazè: 10,3 → 10,4 s;
  - Bondone: 9,5 → 9,4 s;
  - Rolle: 9,2 → 9,5 s.
- **In `main`** con la #1238 (`8f5d0516`, unita dall'utente); impronte
  `e0834d054b6e 8ab61d8e87f9 b9d00c37d28d 574fbfba41eb`, come prima.
  Decisione: ADR-0342, precisazione A3.

## Scelte dell'utente

Una alla volta, ciascuna con la proposta dell'agente, il 2026-11-08.
Tutte come la proposta, tranne la terza:

1. **Nome ed emoji**: «Snowshoes» ❄️ (Ciaspole, Schneeschuhe, Raquettes,
   Raquetas). Un'emoji delle ciaspole non esiste.
2. **Le distanze**: da 0,5 a 3 km.
3. **Dove sta la forma**: fino a 25° di pendenza, **senza boschi** (la
   proposta li teneva dentro). Fuori anche: 30 m attorno ai pendii oltre
   30°, piste, impianti, rocce, ghiacciai, paesi, ruscelli, riserve e
   biotopi. I parchi restano dentro. Al banco così entrano **48 forme su
   60**: a 3 km spesso non entrano (Bondone già da 2 km); l'errore dice a
   quale distanza la forma entra.
4. **I testi**, approvati come proposti (il «tu» dell'app):

   | | en | it | de | fr | es |
   |---|---|---|---|---|---|
   | Sport | Snowshoes | Ciaspole | Schneeschuhe | Raquettes | Raquetas |
   | Pulsante | Snowshoe without a route | Ciaspola senza percorso | Ohne Route auf Schneeschuhen | Raquettes sans parcours | Raquetas sin ruta |
   | Sotto ogni percorso | Off-trail on snow: check the avalanche bulletin first. | Fuori sentiero sulla neve: prima guarda il bollettino valanghe. | Abseits der Wege im Schnee: Schau zuerst in den Lawinenlagebericht. | Hors sentier sur la neige : consulte d'abord le bulletin d'avalanches. | Fuera de sendero en la nieve: consulta antes el boletín de aludes. |
   | Titolo dell'avviso | Before you head out on snowshoes | Prima di uscire con le ciaspole | Bevor du mit Schneeschuhen losgehst | Avant de partir en raquettes | Antes de salir con raquetas |
   | Avviso, 1 | Check the avalanche bulletin and the weather before you go. MuW does not know them. | Controlla il bollettino valanghe e il meteo prima di partire. MuW non li conosce. | Prüf vor dem Start den Lawinenlagebericht und das Wetter. MuW kennt sie nicht. | Consulte le bulletin d'avalanches et la météo avant de partir. MuW ne les connaît pas. | Consulta el boletín de aludes y el tiempo antes de salir. MuW no los conoce. |
   | Avviso, 2 | The route avoids slopes over 25°, woods, pistes and rock. That does not make it safe: an avalanche can come from above. | Il percorso evita i pendii oltre 25°, i boschi, le piste e le rocce. Questo non lo rende sicuro: una valanga può arrivare dall'alto. | Die Route meidet Hänge über 25°, Wälder, Pisten und Fels. Sicher ist sie dadurch nicht: Eine Lawine kann von oben kommen. | Le parcours évite les pentes de plus de 25°, les bois, les pistes et les rochers. Cela ne le rend pas sûr : une avalanche peut venir d'en haut. | La ruta evita las pendientes de más de 25°, los bosques, las pistas y las rocas. Eso no la hace segura: un alud puede venir desde arriba. |
   | Avviso, 3 | Stay off the pistes and follow the local rules: parks, reserves, wildlife quiet zones, private land. MuW does not know them all. | Non camminare sulle piste e rispetta le regole del posto: parchi, riserve, zone di quiete per la fauna, terreni privati. MuW non le conosce tutte. | Geh nicht auf Pisten und halte dich an die Regeln vor Ort: Parks, Schutzgebiete, Wildruhezonen, Privatgrund. MuW kennt nicht alle. | Ne marche pas sur les pistes et respecte les règles locales : parcs, réserves, zones de quiétude de la faune, terrains privés. MuW ne les connaît pas toutes. | No camines por las pistas y respeta las normas del lugar: parques, reservas, zonas de tranquilidad para la fauna, terrenos privados. MuW no las conoce todas. |
   | Avviso, 4 | Never go alone, tell someone where you are going, and turn back if the snow or the weather changes. | Non andare da solo, di' a qualcuno dove vai e torna indietro se la neve o il tempo cambiano. | Geh nicht allein, sag jemandem, wohin du gehst, und kehr um, wenn sich Schnee oder Wetter ändern. | Ne pars pas seul, dis à quelqu'un où tu vas et fais demi-tour si la neige ou le temps changent. | No vayas solo, dile a alguien adónde vas y da la vuelta si la nieve o el tiempo cambian. |

   L'avviso si vede al primo «Start» delle ciaspole, con «I understand» e
   «Not now», come per canoa e nuoto (ADR-0283).
5. **Gioco e record**: come Hike. I metri contano nel gioco come quelli di
   una corsa, con gli stessi controlli; niente tempi migliori e niente
   record personali.
6. **Quando si accende**: appena pronte. «ready» diventa vero quando il
   server ha la parte A e l'app la parte B. Server, migrazione e
   aggiornamento di produzione restano ciascuno col sì dell'utente.

**Deciso dall'agente su delega dell'utente**:

- L'attività nel contratto si chiama `snowshoeing`, con la forma in «-ing»
  delle altre.
- La forma libera sulla neve usa `water_fit.fit_shape` così com'è, con
  un'area fatta dalla neve: canoa e nuoto non cambiano.
- Le regole della neve sono quelle di `snowshoes.md` («Il modello»), con i
  boschi fuori (scelta 3) e i ruscelli fuori (sotto la neve possono
  cedere; al banco non costa nulla).
- Le riserve e i biotopi (`boundary=protected_area` e
  `leisure=nature_reserve`, tranne `protect_class` 2 e 5, cioè i parchi)
  stanno fuori: al banco non costa nulla.

## Criteri di accettazione

- [x] 0: le misure della neve sono in `snowshoes.md`; ADR-0342 è scritto.
- [x] 0: le scelte dell'utente sono scritte qui, una per una (2026-11-08).
- [x] 0: la lista della parte A è al Coordinatore, con la domanda sul numero
      della migrazione (bozza 0057, 2026-11-08).
- [x] A1: una forma sulla neve di prova sta fuori da pendii, boschi, piste e
      paesi, parte da un punto raggiungibile a piedi; test deterministici
      senza rete; canoa e nuoto identici al banco (`compare --same`)
      (2026-11-08: 48 forme su 60 sul motore vero, Milano nessuna; 27
      canoe identiche, i nove percorsi fissi identici).
- [x] A2: lo sport è nel contratto e nell'API, nascosto nell'app; il server
      scarica la neve di un posto nuovo (#1130; passo 8 del 2026-11-11:
      0068 e i tre vincoli, impronte attese, cuore di 1 km alle Viote in
      38,2 s la prima volta e 4,1 s la seconda, 1000 m, 0 indicazioni).
- [x] A3: una città è detta subito senza leggerne la neve (Trento, Belluno,
      Milano), ogni posto con neve del banco va avanti come prima; un
      conteggio che non arriva non cambia nulla; impronte invariate; sul
      server Trento 3 km in pochi secondi. (#1238 e la correzione #1266;
      passo 12, prova del 2026-11-12 17:00Z su `eee85a69`: Milano 1,1 s,
      Trento 1,1 s e 0,65 s, tutte «no open snow»; 16170 e 8091 edifici
      contati dalla neve in cache; `out/coordinatore/prova-passo12.out`.)
- [ ] B: lo sport si sceglie, si cammina, si salva e va in Salute; l'avviso
      e i testi sono in cinque lingue. (Nel codice: #1280 e l'accensione
      #1296 in `main`, schermate in `out/TASK-413/sim/`. Manca la **prova
      sul telefono dopo l'OTA**: un'uscita salvata che arriva in Salute.)

## File toccati

Parte 0 (`docs/TASK-413-0-snowshoes`):

```
docs/tasks/TASK-413.md        (nuovo)
docs/sports/snowshoes.md      (nuovo)
docs/DECISIONS.md             (solo ADR-0342, in fondo)
docs/STATUS.md                (righe proprie)
docs/INDEX.md                 (una riga)
```

Parte A1 (`feat/TASK-413-a1-snow-engine`, lista approvata dal Coordinatore
il 2026-11-08):

```
services/route-engine/route_engine/heights.py, snow.py, snowshoeing.py   (nuovi)
services/route-engine/route_engine/activities/snowshoeing.py             (nuovo)
services/route-engine/route_engine/activities/__init__.py, base.py
services/route-engine/route_engine/models.py, __main__.py
services/route-engine/tests/test_heights.py, test_snow.py, test_snowshoeing.py  (nuovi)
services/route-engine/tests/test_sport_registry.py, test_bike_network.py,
    test_walking.py (i limiti dell'API sono quelli del contratto, non di ENGINE_ONLY)
services/api/shaperoute_api/route_store.py        (SNOW_ONLY, SAME_ROUTES_AS)
services/api/tests/test_snow_fingerprint.py       (nuovo)
services/api/tests/fixtures/same_routes/5e374d843dda.json  (nuovo: la prova)
apps/mobile/assets/engine/engine.zip              (rifatto, ultimo commit)
docs/tasks/TASK-413.md, docs/sports/snowshoes.md
docs/STATUS.md, docs/DECISIONS.md (aggiunta ad ADR-0342): in una PR di soli documenti dopo il merge (regola del Coordinatore, 2026-11-08)
```

Parte A2 (`feat/TASK-413-a2-snowshoes-api`; lista mandata al Coordinatore
il 2026-11-10, i file in più rispetto alla lista di sopra segnati «+»):

```
services/route-engine/route_engine/activities/__init__.py   (snowshoeing in ENGINE_ACTIVITIES)
+ services/route-engine/route_engine/anchored.py             (FREE_ACTIVITIES; in ANCHORED_ONLY)
services/route-engine/tests/test_sport_registry.py, + test_anchored.py, + test_snowshoeing.py,
    + test_bike_network.py, + test_inline_skating.py, + test_walking.py   (le liste)
+ services/api/shaperoute_api/route_store.py                 (SAME_ROUTES_AS; nessun percorso sulla neve tenuto)
+ services/api/tests/fixtures/same_routes/<impronta>.json    (la prova)
packages/shared-types/src/sports/snowshoeing.ts (nuovo), src/sports/index.ts
packages/shared-types/fixtures/route-request-snowshoeing.json (nuovo), contract.json, reads.json, run-activities.json
packages/shared-types/test/snowshoeing.test.ts (nuovo), sportRegistry.test.ts
services/api/shaperoute_api/sports/snowshoeing.py (nuovo), sports/__init__.py
services/api/shaperoute_api/snowshoeing.py (nuovo)
services/api/shaperoute_api/jobs.py, activity_graphs.py, errors.py, way_back.py, route_archive.py
+ services/api/shaperoute_api/images.py, route_processes.py  (il ramo della neve)
services/api/shaperoute_api/activities.py, reads.py, game_rules.py
services/api/migrations/0068_snowshoeing.sql (nuovo)
services/api/tests/test_snowshoeing_api.py (nuovo), test_sport_registry_api.py,
    test_record_only.py, test_favorites.py, + test_cycling.py
apps/mobile/src/sports/snowshoeing.ts (nuovo), src/sports/index.ts, src/search/searchFilters.ts
apps/mobile/src/sports/sportProfiles.test.ts, activityName.test.ts,
    src/route/distanceMiles.test.ts, src/api/accounts.test.ts
apps/mobile/targets/watch/Core/Sources/WatchCore/Resources/sports.json,
    targets/watch/{de,en,es,fr,it}.lproj/Localizable.strings   (dagli script)
apps/mobile/assets/engine/engine.zip                         (rifatto, ultimo commit)
docs/tasks/TASK-413.md, + docs/API.md, + docs/DATABASE.md
docs/STATUS.md, docs/DECISIONS.md (precisazione di ADR-0342): in una PR di soli documenti dopo il merge
```

Parte A3 (`feat/TASK-413-a3-snow-early-no`; lista approvata dal
Coordinatore il 2026-11-12):

```
services/route-engine/route_engine/snow.py, snowshoeing.py   (il conteggio, la soglia, il rifiuto)
services/route-engine/tests/test_snow.py, test_snowshoeing.py
services/route-engine/tests/fixtures/snow_built_up.json      (nuovo: i 21 posti contati)
services/api/shaperoute_api/snowshoeing.py                    (ServerSnow.buildings, mai un errore)
services/api/tests/test_snowshoeing_api.py
apps/mobile/assets/engine/engine.zip                          (rifatto, ultimo commit)
docs/tasks/TASK-413.md, docs/sports/snowshoes.md
docs/STATUS.md, docs/DECISIONS.md (ADR-0342, precisazione A3): in una PR di soli documenti dopo il merge
```

Parte B: la lista qui sopra, da confermare al Coordinatore prima del
codice. `docs/sports/CONDIVISO.md` lo tiene il Coordinatore Sport: la
voce della neve gli è mandata, non scritta da qui.
