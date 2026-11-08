# Sport — quello che si è scoperto, per tutti

Lo tiene solo il Coordinatore Sport (ADR-0320). Ogni voce ha la data, chi
l'ha scoperta e dove sono i dettagli. Prima di cominciare uno sport si legge
tutto: è corto apposta.

## Le reti

- **2026-11-04, TASK-372 — le piste da fondo di OSM non bastano per le
  forme.** `piste:type=nordic` più le relazioni `route=piste`, 20 × 20 km
  attorno a Fiemme (Lago di Tesero), Asiago, Dobbiaco: 81–178 km di pista,
  ma 0 forme buone su 45 (al massimo 0,81, cerchio mai sopra 0,49). Le piste
  seguono la valle e hanno pochi incroci vicini. Lo sci di fondo è
  «Record only». Una zona di sola rete nordic pesa 0,2–0,4 MB.
  `tasks/TASK-372.md`.
- **2026-11-04, TASK-373 — piste da discesa e impianti: nessuna forma.**
  Paganella, Campiglio, Sella Ronda: 19 richieste, somiglianza 0,22–0,58,
  27–43% del percorso sugli impianti. Lo sci alpino è «Record only».
  `tasks/TASK-373.md`.
- **Rete foot** (corsa, camminata): il filtro `walk` di OSMnx senza
  l'esclusione delle ciclabili (ADR-0022); i marciapiedi disegnati a parte
  restano fuori e servono solo a dare i nomi (ADR-0054).
- **Rete bike**: strade e ciclabili, sensi unici rispettati, i tratti a
  piedi con la bici a 6 volte il costo (ADR-0153, ADR-0167). Una zona bike
  per 30 km è circa 26 × 26 km: una sola in memoria sul server.

## Le quote (dislivello)

- **La fonte già usata**: le Terrain Tiles di AWS (codifica «terrarium»),
  gratuite e senza chiave, per le colline della mappa 3D dell'app
  (`apps/mobile/src/map/mapKindStyle.ts`, TASK-351) e per lo studio dello
  sci alpino (`out/TASK-373/dem` sul Mac, zoom 13). **Prima di aggiungere
  un'altra fonte, si usa questa.**
- **ADR-0300, parte G di TASK-347** ha già deciso dislivello e profilo dal
  server, da queste tegole (circa 30 m), in cache sul Volume, con
  `RouteResult.elevation` e `POST /elevations` opzionali, senza quote
  offline. Non è ancora codice. Il calcolo del dislivello va fatto **una
  volta sola**, in un modulo condiviso: la prima sessione sport che ne ha
  bisogno (escursionismo probabilmente) si accorda con TASK-347 G tramite il
  Coordinatore, invece di farne uno suo.
- **2026-11-08, TASK-415 (Ski touring, ADR-0344) — la pendenza dalle
  stesse tegole, nello stesso modulo.** Lo scialpinismo vuole la pendenza
  del terreno sotto la traccia (Horn su 3 × 3 pixel, zoom 13) e il tempo
  sopra i 30°. Va nel modulo condiviso delle quote, lo stesso della parte G
  di TASK-347 (quote e profilo): tegole Terrarium in cache sul Volume.
  **Correzione del 2026-11-08:** il modulo è `route_engine/heights.py`, lo
  scrive TASK-413 A1 (ciaspole), e non un `terrain.py` nuovo; Pillow è già
  una dipendenza del motore (`pillow>=10,<13`), quindi è anche
  nell'immagine del server. TASK-415 e TASK-347 G lo usano. Il dato è di
  circa 30 m in Italia: la pendenza dei pendii corti si sottostima, e chi
  la mostra lo dice. `sports/skimo.md`, `sports/snowshoes.md`.

## Il motore

- **L'impronta del motore** è l'hash di ogni `.py` e `.json` di
  `route_engine/` (`route_store.engine_fingerprint`): anche un file nuovo la
  cambia, e con lei tutti gli esempi (8–16 ore di `draw_examples`) e
  l'archivio. Un file che non disegna percorsi tenuti si può tenere fuori
  (come `ANCHORED_ONLY`, `DRAWN_WATER_ONLY`). ADR-0320, punto 3.
- Un grafo di rete sbagliata viene rifiutato (`network.check_network`):
  una rete nuova ha il suo nome nel grafo (`graph.graph["network"]`).
- **2026-11-04, TASK-376 B1 — i registri del motore.** Una rete è un
  modulo di `route_engine/networks/` (nome, filtro Overpass, come si scarica:
  `networks/base.py` `Network`), un'attività un modulo di
  `route_engine/activities/` (nome, distanze, rete o acqua); una riga in
  ciascun `__init__.py`. `network.py` e `models.py` ne ricavano le tabelle.
  I moduli dei registri non importano nulla che disegna.
- **2026-11-04, TASK-376 B1 — `SAME_ROUTES_AS`** (`route_store.py`): un
  motore che sposta solo codice tiene l'impronta di prima, se
  `services/api/tests/test_same_routes.py` registra per la nuova impronta
  gli stessi hash di nove percorsi fissi (`python tests/test_same_routes.py`
  da `services/api`, poi una riga per impronta). Mai per un cambiamento di
  comportamento. Il banco lo conferma con `compare --same`.
- **2026-11-04, TASK-371 — un modulo che nessun file di disegno importa**
  si tiene fuori dall'impronta (`WALK_ONLY`, come `ANCHORED_ONLY`,
  `DRAWN_WATER_ONLY`): la camminata è entrata senza ridisegnare nulla.
- **2026-11-08, TASK-413 (Ciaspole, ADR-0342) — la forma libera sulla
  neve.** Dove non c'è rete, `water_fit.fit_shape` piazza una forma su
  qualsiasi `water.WaterArea`: basta un'area permessa (`band`, `wet`) e i
  punti da cui si entra (`access`). Per le ciaspole l'area è la neve su cui
  si cammina: il riquadro meno pendii oltre 25° (tegole Terrarium, celle di
  25 m), boschi, ruscelli, piste, impianti, rocce, paesi e riserve. In
  cinque posti di montagna entrano 48 forme su 60 a 0,5–3 km (60 su 60 coi
  boschi), in meno di un secondo. `water.py` e `water_fit.py` non cambiano.
  Le pendenze servono al motore: il modulo delle quote di ADR-0300 G
  (vedi «Le quote») va scritto una volta per tutti. `sports/snowshoes.md`.

## Il contratto e l'API

- **2026-11-05, TASK-376 B2 — i registri del contratto e dell'API.** Uno
  sport è un file di `packages/shared-types/src/sports/` (nome e distanze,
  o `recordOnly`) e uno di `services/api/shaperoute_api/sports/` (`ApiSport`:
  tipo Strava, frase della descrizione, zone in memoria e box di prefetch se
  va su strada, record personali, `<type>` del GPX); una riga in ciascun
  `index.ts` / `__init__.py`. `index.ts`, `strava.py`, `activity_graphs.py`,
  `personal_bests.py`, `activities.py`, `prefetch_zones.py`, `run_gpx.py` e
  `schemas.py` ne ricavano le tabelle di prima, nello stesso ordine.
- **Il contratto importa valori con l'estensione `.ts`** (lo vuole `node
  --test`): l'app compila solo con `allowImportingTsExtensions` nel suo
  tsconfig (B2). Metro e jest risolvono il percorso esatto.
- **I moduli `shaperoute_api/sports/` vanno sul telefono** (li importano
  `activity_graphs.py` e `schemas.py`, dentro `engine.zip`): niente
  database, niente fastapi, e lo zip si rifà quando cambiano
  (`python tools/phone_engine/phone_engine.py engine`).
- **I `Literal` restano scritti a mano** (`RunActivity`, `personal_bests.Sport`):
  un tipo non si ricava da una tupla in Python. Uno sport nuovo li allunga di
  un nome; `test_sport_registry_api.py` dice quando non coincidono.

- **2026-11-05, TASK-377 A — il pilota contro la ricetta: le deroghe.**
  Uno sport che si disegna non entra con «file nuovi più una riga»:
  - **le tabelle «di prima» sono congelate nei test** di TASK-376 (motore,
    contratto, API, app). Ogni sport nuovo le tocca: ora dicono «quelle di
    prima più quelle aggiunte da allora», e il prossimo sport aggiunge una
    voce alla lista «da allora»;
  - **le fixture del contratto** `contract.json`, `run-activities.json`,
    `reads.json` elencano le attività: tre righe;
  - **un'attività nel contratto è subito nell'app**: senza il suo
    `SportProfile` l'app non parte (`search/searchFilters.ts` chiama
    `profileOf` al caricamento). Lo sport entra nell'app già con la parte A,
    nascosto: nessuna riga in «Settings», nessun chip nella ricerca
    (`searchFilters.ts`, finché `activityOffered` non lo sa);
  - **una rete nuova vuole le sue zone nell'API** (`Zones` nel file dello
    sport): `test_every_sport_on_roads_has_zones_and_no_other`;
  - `reads.NEWER_ACTIVITIES` va nell'ordine di `RunActivity`, non in fondo;
  - il finto `_GridSource` di `test_cli.py` ora ha `for_activity`, e i test
    che usavano `hiking` come attività sconosciuta usano `skating` o
    `climbing`.
  Dettagli in `tasks/TASK-377.md`, «Lista definitiva di A».

- **2026-11-06, TASK-378 A — Gravel e MTB contro la ricetta.** Le
  deroghe del pilota, ora passi della ricetta, sono tornate tutte (le
  tabelle «di prima», le fixture, il profilo nascosto, le zone di una rete
  nuova). In più:
  - **una rete per la bici dice di esserlo** (`Network.by_bike`): sensi
    unici e tratti a piedi con la bici non dipendono più dal nome `bike`.
    `bike_ways` prende le regole di una rete e il suo nome, e una rete
    come la MTB è un file di regole su quelle della bici;
  - **uno sport disegnato come un altro** sta in `walking.py`
    (`DRAWN_AS`), come la camminata: Gravel è una bici, fuori impronta;
  - **i test dell'ordine.** Due sport insieme spostano gli indici: i test
    che dicevano «subito prima della camminata» o «l'ultima è la
    camminata» ora dicono «prima» e «le ultime»;
  - **i record personali si contano per ogni sport per ogni corsa**
    (`personal_bests.run_bests`): uno sport con record nuovi allunga il
    test di `run_bests` e il CHECK di `run_bests` (0052).

  Dettagli in `tasks/TASK-378.md`, «Lista definitiva di A», e nella
  precisazione di ADR-0322.

- **2026-11-06, TASK-380 A — il Roller contro la ricetta.** Solo file
  nuovi, righe nei registri e le liste dei test «di prima», più i punti
  già nella ricetta (fixture, profilo nascosto, zone di una rete nuova,
  CHECK di `run_bests`, `game_rules.py`, `SAME_ROUTES_AS`). Nessuna deroga.
  Da sapere:
  - **una rete a piedi con regole sui tag** si scarica con
    `network_type="walk"` e `simplify=False`, si tolgono le vie che le
    regole scartano, poi si semplifica (`networks/roller.py`
    `skate_ways`): ogni via resta nei due sensi senza toccare la bici;
  - **ogni sport con record propri allunga `run_bests` di ogni corsa**:
    una corsa a piedi di 5 km ha ora anche il «5k» del Roller. Il profilo
    legge solo quelli dello sport della corsa;
  - **il gioco controlla la velocità come per la corsa** (25 km/h su
    200 m, 21,6 km/h di media): per uno sport più veloce dei piedi la
    soglia va misurata e scelta dall'utente (`roller.md`).

## L'app

- **2026-11-05, TASK-376 B3a — il profilo di ogni sport.** Uno sport è un
  file di `apps/mobile/src/sports/` con il suo `SportProfile`:
  - il nome;
  - le distanze di «Disegna», con passo e partenza;
  - i numeri di Apple Salute e Health Connect;
  - la rete del motore sul telefono;
  - come si contano le calorie;
  - cosa diventa una corsa senza percorso;
  - la scritta delle rotte MuW.

  Poi serve una riga in `index.ts`. Le tabelle di prima si ricavano con
  `tableOf`, uguali e nello stesso ordine: `route/distance.ts`,
  `health/appleWorkout.ts`, `health/healthConnectWorkout.ts`,
  `search/searchFilters.ts`, `engine/zones.ts`, `body/energy.ts`,
  `navigation/freeSport.ts`, `feed/muwLabel.ts`.
- **Un file di sport importa solo** il contratto, `../i18n` (`tLater`), il
  tipo `Limits` e `./base`, mai una schermata: lo prova
  `sportProfiles.test.ts`. I testi restano nelle tabelle `i18n` di oggi; il
  file dello sport ne tiene la chiave inglese.
- **2026-11-05, TASK-377 B — il pilota contro la ricetta, nell'app: le
  deroghe.** Oltre ai punti fissi del §4 di `COME-AGGIUNGERE.md`:
  - **`sports/base.ts`**: un campo nuovo del profilo, `caution`, l'avviso
    che «Disegna» mostra sotto ogni percorso dello sport (i sentieri di una
    hike). Il prossimo sport con un avviso non tocca più `base.ts`;
  - **`screens/RunNoRouteButton.tsx`**: l'emoji accanto a «… without a
    route» è ancora un `switch` scritto a mano, non letto dal profilo;
  - **`settings/sport.ts`**: oltre alla riga, `activityOffered` ora legge
    una tabella (`OFFERED_WHEN_READY`): uno sport che non va offerto nella
    ricerca e nel modulo prima di essere pronto vi aggiunge una voce;
  - **i test che dicono «hiking» = nessuno sport** (`readers.test.ts`,
    `swimImport.test.ts`, `walkImport.test.ts`) usano ora `yoga`;
  - le tabelle «di prima» di `sportRows.test.ts` e `sport.test.ts`, come in
    A.
- **2026-11-05, chiusura di TASK-376.** Le deroghe di A e B sono diventate
  passi della ricetta (`COME-AGGIUNGERE.md`, segnati «(pilota)»). Gravel/MTB
  e Roller partono dalla ricetta corretta.

## Il banco e Overpass

- **2026-11-04, TASK-376 — Overpass rifiuta spesso** (502 «pieno», 429
  «troppe richieste», timeout). Il banco riprova solo gli errori di rete,
  dopo 60, 120 e 240 s, e se la zona non arriva la lascia fuori dicendolo.
  Sull'acqua il motore scarica l'acqua dentro il calcolo di ogni percorso:
  il banco la scarica **una volta per zona**, prima dei percorsi. Un primo
  giro che riprovava subito ha preso una serie di 429 ed è stato fermato:
  dopo un 429, almeno 10 minuti di pausa.
- I tempi del banco sono del solo motore, con la zona già in cache: corsa
  0,6 s di mediana, bici 1,6 s (Milano fino a 12,7 s a 30 km), canoa sotto
  0,3 s. Servono a confrontare prima e dopo, non a promettere tempi.

## Gli sport senza traccia («Record only», Palestra)

- **2026-11-04, TASK-385 (Palestra, ADR-0327) — un'attività senza linea
  rompe le app di oggi.** `runs.track` è NOT NULL (migrazione 0003) e un
  disegno visibile deve avere la traccia (0014). Nell'app `isDrawing` vuole
  `track_preview` e `isDrawingsPage` usa `every`: **un solo post senza linea
  fa scartare l'intera pagina** di Feed, profilo e ricerca (la B0 di
  TASK-375 non lo copre). ADR-0327: traccia facoltativa solo per le
  attività `TRACKLESS_ACTIVITIES`, e i post senza traccia solo alle app che
  mandano l'header `X-MuW-Reads: trackless`. `docs/sports/gym.md`.
- **Salute: il tipo di allenamento non è un permesso.** Un allenamento di
  forza (HealthKit `.traditionalStrengthTraining`, Health Connect
  `EXERCISE_TYPE_STRENGTH_TRAINING`; i numeri vanno verificati sulle
  librerie) non chiede permessi nuovi né codice nativo.
- **Già nella 1.0.1**: notifiche locali (`expo-notifications`), vibrazione,
  keep-awake e audio. Un timer che avvisa a schermo bloccato è solo JS.

## I pezzi di montagna (fasi, vette)

- **2026-11-08, TASK-415 (Ski touring, ADR-0344) — tre pezzi generici, non
  dello scialpinismo.** Valgono anche per Hike e per le ciaspole, dove
  servono. Le ciaspole disegnano forme libere (TASK-413), non sono «Record
  only»: le vette e la pendenza vanno bene per loro, mentre fasi, VAM e
  numeri del post seguono la strada «Record only» e per loro sono
  facoltativi, da verificare:
  - **le fasi** (salita, discesa, impianto, cambi) e la **VAM** sul
    telefono, `activities/mountainPhases.ts`, sopra `legs`, `isLift` e
    `droppedM` di `snowDay.ts` (esportati, senza cambiarli). Chi sale con le
    pelli o con le ciaspole resta sotto la soglia dell'impianto (0,3 m/s);
  - **le vette** dal server, `peak_extract.py` (`osmium tags-filter
    n/natural=peak`, file a tegole come `ski_extract.py`) e `summits.py`
    (entro 60 m dal nodo, entro 80 m di quota), con la tabella `run_summits`:
    non dipendono dalle fasi, valgono per ogni traccia salvata;
  - **i numeri del post** di uno sport «Record only» in `run_stats`
    (TASK-410 C), non in colonne nuove di `runs`.
  Gli estratti interi dello sci sono stati cancellati dopo i riquadri: le
  vette li riscaricano. `sports/skimo.md`.

## Le misure

Le misure di base di corsa, bici e canoa stanno in `run.md`, `bike.md`,
`paddle.md`.
