# API — Contratti REST

> Scritto con TASK-022, richieste in due tempi con TASK-025, lettura delle
> parole della forma con TASK-030. Le scelte e i loro motivi stanno in
> ADR-0030, ADR-0032 e ADR-0012.

## Cosa è deciso

- FastAPI + Pydantic, in `services/api/` (pacchetto `shaperoute_api`).
- L'API orchestra, non calcola: il percorso viene da `plan_route` del
  route-engine, che l'API importa (ARCHITECTURE §4).
- `RouteRequest` e `RouteResult` come in `ARCHITECTURE.md` §3, con gli
  stessi campi di `packages/shared-types`: il contratto non cambia.
- Nessun prefisso di versione, nessun CORS (l'app è nativa). Fuori casa
  l'API può chiedere una chiave (`X-API-Key`, TASK-081); gli account, da
  TASK-114, hanno un token di sessione a parte (`Authorization: Bearer`).
  I percorsi restano aperti a tutti: si disegna anche senza account.

## Avvio

Dalla radice del repository, con il venv dell'API (`SETUP.md`, passo 10):

```
python -m shaperoute_api            # solo da questo PC, porta 8000
python -m shaperoute_api --lan      # anche dal telefono, sulla stessa Wi-Fi
```

Con `--lan` stampa l'indirizzo da scrivere sul telefono. `--port` cambia
la porta, `--cache-dir` la cartella dei grafi (default `data/cache`, come
la CLI). `--ai-model` e `--ai-url` scelgono il modello di Ollama che legge
le parole della forma e dove risponde (`AI.md`); senza, valgono quelli del
codice. La documentazione interattiva è su `/docs`.

Da fuori casa (TASK-081, ADR-0076, `DEPLOY.md`): se la variabile
d'ambiente `SHAPEROUTE_API_KEY` è impostata (almeno 16 caratteri), ogni
richiesta tranne `GET /health` deve avere l'intestazione `X-API-Key` con
quel valore; senza, l'API è aperta come prima. Passa senza chiave anche
`GET /strava/callback`, la pagina a cui Strava rimanda il browser («Send
to Strava», più sotto): un browser non ha la chiave. I POST sono limitati a
`SHAPEROUTE_RATE_LIMIT` al minuto per client (default 30, 0 = nessun
limite); il polling dei job è GET e non conta. La chiave non si passa mai
da riga di comando.

Con `SHAPEROUTE_DATABASE_URL` (un indirizzo `postgresql://…`) l'API usa il
database degli account (TASK-114, `DATABASE.md`): all'avvio applica le
migrazioni che mancano e lo scrive; se il database non risponde, non
parte. Senza, gli account rispondono `503 accounts_unavailable` e il resto
funziona come prima. Come accenderne uno sul PC: `SETUP.md`, 10.4.

Con `STRAVA_CLIENT_ID` e `STRAVA_CLIENT_SECRET` (l'app Strava di questo
server, `DEPLOY.md`, «Strava») le corse salvate si possono mandare a Strava
(TASK-187): «Send to Strava», più sotto. Senza anche una sola delle due,
Strava è spento e il resto funziona come prima. Il secret non si passa mai
da riga di comando.

Con `--request-log`, o con `SHAPEROUTE_REQUEST_LOG=1`, l'API scrive ogni
richiesta di percorso in un file, per poterla rifare: «Registro delle
richieste», più sotto. Senza, non scrive niente (è il default).

Gli esempi di una città restano sul disco una volta disegnati, in
`routes/` dentro la cartella dei grafi: «Gli esempi di una città, tenuti»,
più sotto. `--no-route-store` li fa disegnare ogni volta.

## Endpoint

### `GET /health`

`200 {"status": "ok"}`. Serve a controllare che l'API risponda.

### Richieste in due tempi: `/route-jobs`

È la strada dell'app (ADR-0032). Un percorso da 15 km o una zona da
scaricare durano più di quanto il telefono aspetta una risposta, quindi la
richiesta risponde subito e il percorso si chiede dopo.

- `POST /route-jobs` con un `RouteRequest` (come sotto) risponde subito
  `202` con un `RouteJob`: `{"job_id", "status", "result": null, "error": null}`.
  Una richiesta non valida risponde `422 invalid_request` senza diventare
  un job.
- `GET /route-jobs/{job_id}` restituisce il `RouteJob` di adesso. `status`
  è uno di:

  | `status` | Vuol dire |
  |---|---|
  | `queued` | in coda: i due thread di lavoro sono occupati |
  | `downloading_map` | la zona non è in cache e si scarica da Overpass |
  | `computing` | grafo pronto (o in lettura dal disco), il motore calcola |
  | `done` | `result` è il `RouteResult` |
  | `failed` | `error` è `{code, message}`, come negli errori sotto |

- `DELETE /route-jobs/{job_id}` annulla: `204`. Una richiesta in coda non
  parte; una che sta caricando il grafo si ferma prima di calcolare; una
  che sta già calcolando finisce nel suo thread e il risultato si butta.
  L'annullamento è un evento delle ricerche (`cancelled`, TASK-142).
- Un `job_id` sconosciuto (annullato, finito da più di 10 minuti, o API
  riavviata) risponde `404 http_error`.

Il `RouteResult` di una richiesta in due tempi porta anche le
**indicazioni di svolta** (`directions`, TASK-048, ADR-0045 e ADR-0047): la
prima è la partenza (`"turn": "depart"`, la via da cui si parte), poi una
per ogni incrocio dove si gira, si cambia strada o si sceglie a un bivio.

```json
{"node": 2, "point": [46.0671, 11.1344], "distance_m": 1003.6, "turn": "left",
 "angle_deg": -90.0, "street": "Via Manci", "road_type": "residential",
 "branches": 4, "joined": false}
```

`turn` è uno di `depart`, `left`, `right`, `sharp-left`, `sharp-right`,
`straight`, `u-turn`. `street` è il nome della via in cui si entra, o il
suo `ref`, o `null` se OSM non ha né l'uno né l'altro: allora dice
qualcosa solo `road_type`. `joined` è vero quando l'indicazione arriva
meno di 15 m dopo la precedente, da leggere insieme («sinistra, poi
destra»): nessuna si toglie. Le calcola il motore sul grafo su cui ha
tracciato il percorso, in circa 0,1 s.

`along` (TASK-060, ADR-0057) è la via lungo cui corre una strada senza
nome, di solito un marciapiede disegnato a parte: una **deduzione** del
motore (ADR-0054), mai un nome della strada stessa. C'è solo quando
`street` è `null`, altrimenti è `null`; resta `null` anche quando non c'è
una via con nome entro 15 m e parallela (piazze, parchi, viali larghi).

```json
{"node": 3, "point": [46.0761, 11.1344], "distance_m": 2004.4, "turn": "left",
 "angle_deg": -88.5, "street": null, "road_type": "footway",
 "branches": 3, "joined": false, "along": "Via Rosmini"}
```

Le vie accanto vengono dal grafo e dal file dei nomi della zona in cache
(`MAPS.md`, «Cache»); l'API non lo scarica mai durante una richiesta: una
zona senza il file dà solo le vie del grafo. Il campo è opzionale nei tipi
condivisi: un'API precedente non lo manda, e un `GpxRequest` può ometterlo.
Sul cuore da 15 km di Trento le indicazioni senza nome né via passano da
118 a 57, e `along` costa circa 0,3 s.

Le richieste vivono nella memoria dell'API: un riavvio le perde. Lavorano
due alla volta, così un 15 km annullato non ferma la richiesta dopo; le due
però si dividono il processore, quindi la seconda va più piano finché la
prima non finisce.

### Gli esempi di una città, tenuti (TASK-168, ADR-0136)

In «Explore» ogni telefono chiede a una città le stesse tre cose: un
cuore, un cerchio e una stella da 5 km dal suo centro. Il motore le
disegna uguali ogni volta, una dopo l'altra. Dal TASK-168 un percorso
disegnato **dal centro di una città** resta in un file
(`shaperoute_api/route_store.py`), e la stessa richiesta riceve il job già
`done`, con il `result`, **nella risposta al `POST /route-jobs`**: nessun
thread di lavoro, nessun calcolo, niente da chiedere dopo. Il contratto non
cambia: `202` e un `RouteJob`, che si legge e si annulla come gli altri.
Aspetta solo il primo telefono in una città.

Dal TASK-176 (ADR-0144) l'app chiede il **cerchio per primo**, poi
cuore e stella, e dopo altre cinque forme da 5 km dallo stesso centro:
luna, cavallo, lumaca, testa di cane, testa di coniglio. Sono richieste
come le altre, una alla volta, e restano allo stesso modo. Il cerchio va
per primo perché la sua zona contiene quella di tutte le altre forme: una
città senza zona ne scarica una sola. `draw_examples` chiede le prime tre
nello stesso ordine (`EXAMPLE_SHAPES` in `prefetch_zones.py`); le altre
cinque non le disegna, e restano dal primo telefono che le chiede.

- **Solo dal centro di una città.** Una richiesta porta la posizione di
  chi la fa, e l'API non tiene la posizione di nessuno (ADR-0085,
  ADR-0092): salvare tutti i percorsi è ADR-0086, nel database, con
  TASK-092. I centri sono quelli che l'API stessa ha dato con `GET
  /cities` e, per le sole città, con `GET /city-suggestions`; una partenza
  è un centro quando cade nello stesso quadrato di circa 10 m (4 decimali,
  come `cityKey` dell'app). Un percorso da qualsiasi altra partenza non
  viene mai scritto, e il contorno di un'immagine nemmeno.
- **La stessa richiesta**: stessa forma o parola, stile, distanza,
  attività, la penna alzata o no (TASK-197), stesso centro, **stesso
  motore**. Il nome del file viene da
  un'impronta del codice del motore (`engine_fingerprint`: i `.py` e i
  `.json` di `route_engine`): un motore cambiato ridisegna, senza
  cancellare niente a mano.
- **Dove**: `routes/` nella cartella dei grafi (`data/cache/routes/`), che
  sul server è già una cartella tenuta fuori dal contenitore. Un file JSON
  per percorso, circa 90 kB con le alternative e le indicazioni, e
  `city-centres.txt` con i centri imparati. Al massimo 3000 percorsi (i
  più vecchi escono) e 30 giorni: poi si ridisegna, perché la zona può
  essere più nuova.
- **Errori**: un percorso non riuscito non si tiene. Un file che non si
  legge vale come non tenuto e si ridisegna; una cartella che non si può
  scrivere lascia l'API com'era prima.
- **Nel registro delle richieste e negli eventi** una risposta tenuta
  compare come le altre, con 0 secondi.

Per non far aspettare nemmeno il primo telefono, gli esempi si disegnano
prima, chiedendo a un'API accesa quello che chiede l'app:

```
python -m shaperoute_api.draw_examples --api http://127.0.0.1:8000 Rovereto
python -m shaperoute_api.draw_examples --api https://… --preset italy --preset featured
```

Una riga per città (`circle drawn, heart drawn, star kept`), una forma
alla volta; la chiave dell'API, se serve, da `SHAPEROUTE_API_KEY`. Rifatto,
passa in un attimo sulle città già tenute. Una città senza la zona sul
disco dell'API la fa scaricare, come un telefono: per le zone di molte
città c'è `prefetch_zones` (ADR-0119).

Misurato sul Mac il 2026-10-02 (Trento, zona in cache, il Mac occupato da
altri lavori): i tre esempi 10–14 s la prima volta, **0,0 s** la seconda,
tutti e tre nella risposta al `POST`.

### Registro delle richieste (TASK-090, ADR-0085)

Serve a rifare uguale un percorso visto nell'app, per capire un difetto:
in TASK-075 non si è potuto, perché la partenza era il GPS del telefono e
25–100 m cambiano il cuore. **Spento per default**; si accende all'avvio:

```
python -m shaperoute_api --lan --request-log
```

oppure con la variabile d'ambiente `SHAPEROUTE_REQUEST_LOG=1`. All'avvio
l'API dice se registra e dove. Il file è `data/requests/requests.jsonl`
(`--request-log-dir` cambia la cartella), fuori dal repository
(`.gitignore`) e leggibile solo da chi ha avviato l'API. Una riga JSON per
ogni richiesta di percorso finita (`/route-jobs`, `/image-route-jobs`,
`/routes`), scritta dopo che il job ha la sua risposta:

```json
{"time": "2026-09-30T13:18:08+00:00", "kind": "shape", "job_id": "d44ecaff13cc",
 "request": {"start": [45.9934, 11.258], "shape": "heart", "word": null,
             "distance_m": 10000, "activity": "running", "style": "round"},
 "outcome": {"status": "done", "distance_m": 11841.8, "similarity": 0.8568,
             "points": 467, "route": "19a2ca915124baf7", "elapsed_s": 7.3}}
```

- `kind`: `shape`, `word` o `image`. `request` è il corpo com'è arrivato,
  con i default scritti; per un'immagine, `outline` e `strokes`.
- `outcome`: `done` con distanza, somiglianza, numero di punti, secondi e
  `route`, un'impronta dei punti (uguale solo se il percorso è lo stesso
  punto per punto); `failed` con il solo `code` dell'errore; `cancelled`
  per un job annullato prima del calcolo. `job_id` è `null` per `/routes`.
- **Mai nel file**: la chiave dell'API, le intestazioni, l'indirizzo del
  telefono, la foto (`/image-outlines` e `/image-outline-edits` non sono
  registrati), i punti del percorso, le parole di `/shape-readings`. Una
  richiesta non valida (422 prima del job) non è registrata.
- **Grandezza**: a 5 MB il file diventa `requests.old.jsonl` (quello di
  prima è sostituito) e ne comincia uno nuovo: mai più di 10 MB sul disco,
  alcune migliaia di richieste.
- Se il file non si può scrivere, la richiesta va avanti lo stesso e nel
  log dell'API c'è un avviso, senza il corpo della richiesta.

**Rifare una richiesta**, senza server e senza telefono, dalla radice del
repository:

```
python -m shaperoute_api.replay --list          # le righe, numerate
python -m shaperoute_api.replay                 # rifà l'ultima
python -m shaperoute_api.replay --job d44ecaff13cc --gpx out/again.gpx
python -m shaperoute_api.replay --line 3
```

Ricostruisce la richiesta dal corpo, con gli stessi controlli di quando è
arrivata, e la dà allo stesso motore sui grafi in cache (`--cache-dir`,
`--file` per un altro registro). Stampa distanza e somiglianza di adesso e
dice se il percorso è quello registrato, punto per punto; se non lo è
(motore cambiato, o altri dati della mappa) esce con codice 1. Provato con
un cuore da 10 km a Caldonazzo e «CIAO» squadrato a Levico: 467 e 626
punti, identici. Il registro contiene le partenze degli utenti: vedi
`UI.md`, «Cosa esce dal telefono», e `DEPLOY.md`.

### `POST /gpx`

Riceve un `GpxRequest`, cioè `{"request": RouteRequest, "result":
RouteResult}`, e risponde `200` con il percorso in GPX 1.1
(`application/gpx+xml`), scritto da `export_gpx.py` del motore come fa la
CLI (`GPX.md`). Il nome del file è nell'intestazione:
`Content-Disposition: attachment; filename="sgrava-heart-5km-2026-09-23.gpx"`.
L'API non ricorda niente, quindi l'export funziona anche dopo i 10 minuti
di vita di una richiesta in due tempi. Un corpo non valido risponde
`422 invalid_request` (ADR-0033). Con i `walks` di una parola con la penna
alzata (TASK-197) il GPX ha un waypoint «Pause» e uno «Resume» per ogni
tratto a piedi (`GPX.md`); dei `walks` che non stanno nei `points` sono
`422 invalid_request`. Un'app che non li manda riceve il GPX di prima.

### `GET /places`

I luoghi della partenza, suggeriti mentre si scrive (TASK-123, ADR-0095).
`?q=via bel&lat=46.07&lon=11.12`: `q` da 1 a 200 caratteri, `lat` e `lon`
facoltativi, insieme, per mettere prima i luoghi attorno. Risponde `200`
con al più 5 luoghi (`packages/shared-types/fixtures/places.json`):

```json
{ "places": [{ "label": "Via Rodolfo Belenzani, Trento", "point": [46.0692621, 11.1211947] }] }
```

I luoghi vengono dall'autocompletamento di Geoapify (dati OpenStreetMap),
con la chiave `GEOAPIFY_API_KEY` dell'API: l'app non la vede. Le risposte
restano in memoria un'ora (500 ricerche): le stesse lettere non si chiedono
due volte. Senza chiave, o se Geoapify non risponde, `503 http_error`;
l'app allora chiede a Photon, come prima. È un `GET`: non conta nel limite
dei POST al minuto.

### `GET /recommended-routes` (TASK-126, ADR-0098)

I percorsi migliori già pianificati vicino a un punto, per «Explore»:
`?lat=…&lon=…`, facoltativi `radius_m` (100–50 000, default 5000),
`shape` (una forma, o una parola in maiuscolo) e `distance_m`. Prima la
somiglianza più alta; a parità, il più vicino. Tutti, anche se equivalenti
(TASK-092, punto 3). Ogni percorso ha `id`, `city`, `shape` o `word` (con
`style`), `distance_m`, `route_m`, `similarity`, `start`, `away_m` e
`preview`, al più 64 punti della linea per la miniatura. Corpo in
`packages/shared-types/fixtures/recommended-routes.json`. Il punto sta
nella query: il log di accesso non la scrive (ADR-0096).

`GET /recommended-routes/{id}` dà il percorso intero (`points`, `license`;
`recommended-route.json`), 404 per un id che non c'è.

I percorsi vengono da `catalog/seed/` (ADR-0097), letti all'avvio:
`--catalog-dir` per un'altra cartella; senza file la lista è vuota. Un file
nuovo vuole un riavvio dell'API.

### `GET /cities` (TASK-129, ADR-0099)

Le città di tutto il mondo per nome, `?q=…`, al più 5, ognuna col suo
centro: la geocodifica di Geoapify per sole città (`type=city`), con la
chiave di `/places`. Non l'autocompletamento, che per una città dà il
centro dell'area del comune (Milano: Baggio, 6 km dal Duomo). Corpo come
`/places` (`places.json`); 503 senza chiave. Cache di un giorno. Parole
imparate dal vocabolario (`city_names`, TASK-142) cercano il nome imparato:
«levic» cerca «Levico Terme», non Levič.

### `GET /city-suggestions` (TASK-134, TASK-138, ADR-0110)

Città e luoghi mentre si scrive, `?q=Par` → Paris, Parma; `?q=arena di
ver` → Verona Arena: l'autocompletamento di Geoapify senza `type`, nel suo
ordine. Si tengono le città (`result_type` `city`, col punto della città
come `/cities`) e i luoghi (`amenity`, `building`, `street`, `suburb`,
`district`, solo con un nome); contee, regioni, stati e CAP no (la contea
di Milano ha il punto a Baggio). Due luoghi a meno di 150 m sono lo stesso:
resta il primo. Da 2 lettere (prima: lista vuota), al più 6, un'etichetta
una volta sola; cache di un giorno. 503 senza chiave.

```json
{"places": [
  {"label": "Verona, Veneto, Italy", "point": [45.4385, 10.9924], "kind": "city"},
  {"label": "Verona Arena, Verona, Italy", "point": [45.439, 10.9949], "kind": "place"}
]}
```

`kind` dice all'app se nominare il posto nelle parole di una richiesta
(una città) o mandarne solo il punto (un luogo). Prima di TASK-138 il campo
non c'era: l'app tratta come città una voce senza `kind`.

### `POST /themed-route-jobs` (TASK-129, ADR-0099)

Una forma che passa dai luoghi veri di un tema: `{"text": "voglio un
percorso romantico a Parigi", "centre": [lat, lon] | null, "city": … |
null}`. Risponde 202 con un job, letto con `GET /themed-route-jobs/{id}`
(`queued`, `running`, `done`, `failed`; i corpi in
`themed-route-job-done.json` e `-failed.json`).

- **Le parole**: tema, forma, km e città da tabelle in italiano, inglese
  e francese (`themes.py`); l'AI solo per un tema che le tabelle non
  trovano, e solo fra i temi elencati (`theme_reading.py`). Temi:
  `romantic`, `food`, `famous`, `tourist`, `panoramic`, `nature`,
  `culture`, e da TASK-134 le categorie dell'app: `shopping`, `nightlife`,
  `hidden`, `photography`, `family`, `running`, `walking`, `local`; la forma, se non è detta, quella del tema (cuore per
  `romantic`, stella per i luoghi famosi, cerchio per gli altri); 10 km se
  i km non sono detti, da 3 a 21.
- **La città**: quella nominata nelle parole, cercata come `/cities`;
  altrimenti `centre` dell'app (la città scelta o la partenza).
- **I luoghi**: Geoapify Places, dati OpenStreetMap, con un nome; prima
  quelli con una voce Wikidata, e per i temi «notevoli» solo quelli se
  sono almeno 3. Al più 15, entro un quarto della distanza (0,8–5 km).
  Cache di un giorno per città e tema.
- **Il percorso**: il motore (`route_engine/stops.py`) pianifica la forma
  dal centro e da 3 luoghi dove ce ne sono di più attorno; tiene, fra
  quelle da 0,85 di somiglianza in su, quella che passa a 80 m dal maggior
  numero di luoghi.
- **Il risultato**: `points`, `distance_m`, `similarity`, `shape`,
  `theme`, `city`, `centre` e **tutti** i luoghi trovati con `passed`.
- **Errori del job** (`error.code`): `theme_unknown`, `city_unknown`,
  `no_places` (meno di 2 luoghi verificati: lo dice, non inventa),
  `places_unavailable`, e quelli dei percorsi (`shape_not_drawable`,
  `map_data_unavailable`). 503 se l'API non ha i percorsi a tema.

### `POST /track-scores`

Il punteggio di una corsa (TASK-113, ADR-0093). Riceve un
`TrackScoreRequest`:

```json
{
  "points": [[46.0671, 11.1214], [46.0671, 11.1344]],
  "similarity": 0.91,
  "track": [
    { "point": [46.0671, 11.1214], "time_ms": 1790000000000, "accuracy_m": 6.0 }
  ]
}
```

`points` e `similarity` sono quelli del `RouteResult` del percorso seguito
(e i suoi `walks`, sotto);
`track` sono le posizioni registrate dall'app, in ordine (`accuracy_m` può
mancare o essere `null`). Risponde `200` con un `TrackScoreResult`:
`score` da 0 a 100, `fidelity`, `covered` (quota del percorso corsa),
`on_route` (quota della corsa sul percorso) e `distance_m`, calcolati da
`track_score.py` del motore (`ROUTE_ENGINE.md` §5, ADR-0090). Niente grafo,
niente rete, e l'API non ricorda niente. Una corsa con meno di 2 posizioni
buone o più corta del 10% del percorso risponde `422 invalid_request`, con
il motivo del motore nel messaggio («This run cannot be scored: …»). Al più
20 000 posizioni e 50 000 punti di percorso.

**`walks`** (TASK-197, facoltativo): quelli del `RouteResult` di una parola
con la penna alzata. La corsa si confronta allora con le sole lettere: le
posizioni su un tratto a piedi, o sulla linea dritta che una registrazione
in pausa traccia fra il suo inizio e la sua fine, non contano
(`ROUTE_ENGINE.md` §5, «Il punteggio di una traccia corsa»). Senza, o
vuoto, il punteggio di prima; dei `walks` che non stanno nei `points` sono
`422 invalid_request`.

### `POST /signals` (TASK-142, ADR-0112)

Cosa ha fatto l'app con una ricerca, per gli eventi delle ricerche
(`docs/INSIGHTS.md`). Tre corpi, distinti da `kind` (in
`packages/shared-types/fixtures/signals.json`, tipi in
`packages/shared-types/src/signals.ts`):

| `kind` | Campi | Quando |
|---|---|---|
| `city_chosen` | `label`, `point`, `place` (facoltativo), `via`: `suggestion`, `recent`, `featured`, `typed` | una città o un luogo scelto in «Explore» |
| `route_chosen` | `shape` (o `"image"`) o `word`; `index` (0 è A), `of` (1–3), `via`: `start`, `gpx` | il primo uso di un percorso fra quelli offerti |
| `hint_taken` | `shape` o `word`; `hint`: `try_distance` (con `to_m`) o `catalog_shape`; `distance_m` | «Try N km», o una forma del catalogo dopo un percorso fallito |

Risponde sempre `204` a un corpo valido, anche con gli eventi spenti; un
campo in più, una forma fuori catalogo, un indice fuori dai percorsi offerti
o una posizione fuori dalla Terra: `422 invalid_request`. Oltre 60 segnali
al minuto, tutti i client insieme, il segnale non si registra (avviso nel
log). Il `point` si registra come cella di ~1 km; la partenza non c'è mai.

### `POST /route-directions` (TASK-145, ADR-0117)

Le indicazioni di svolta di un percorso che l'app ha solo come punti: uno
di «Explore» (consigliato, esempio di una città o a tema), prima di
«Start». Riceve `{"points": [[lat, lon], …]}`, da 2 a 50 000 punti, la
linea come l'ha disegnata il motore
(`packages/shared-types/fixtures/route-directions-request.json`). Risponde
`200` con `{"directions": [...]}`, le stesse `Direction` di
`RouteResult.directions`, partenza compresa, con gli `along` (ADR-0057)
(`route-directions.json`).

Il grafo è quello della zona, come per i percorsi: in memoria, dalla
cache, o scaricato; si ritaglia 250 m attorno alla linea. I nodi della
linea li ritrova `route_nodes.py` del motore (`ROUTE_ENGINE.md` §4). Una
linea che non segue le strade della mappa risponde `422 invalid_request`
(«The route does not follow the roads of this map.»), una zona che non si
scarica `503 map_data_unavailable`. Niente si salva. Misurato il
2026-10-01 sul Mac, zone in cache: 0,1–0,5 s per percorsi di 5–23 km.

### `POST /shape-readings`

Le parole del riquadro della forma che la tabella dell'app non conosce
(ADR-0012, `AI.md`). Riceve uno `ShapeReadingRequest`:

```json
{ "text": "stemma della Ferrari" }
```

e risponde `200` con uno `ShapeReading`: le parole come lette (spazi
singoli, nessuno ai lati) e una forma del catalogo, o `null` se nessuna va
bene.

```json
{ "text": "stemma della Ferrari", "shape": "horse" }
```

Il testo va da 1 a 60 caratteri: fuori da lì, `422 invalid_request`. Se
Ollama è spento, non ha il modello o non risponde entro 90 s, `503
ai_unavailable`, con il motivo nel messaggio. Le stesse parole, a meno di
maiuscole e spazi, si chiedono al modello una volta sola: l'API le ricorda
finché non si riavvia.

### `POST /routes`

Riceve un `RouteRequest`:

```json
{ "start": [46.0671, 11.1214], "shape": "heart", "distance_m": 5000, "activity": "running" }
```

`start` è `[lat, lon]`; `activity` si può omettere (`running`), oppure è
`cycling`, un percorso in bici (sotto). Un campo in più o scritto male è
un errore, non si ignora.

Risponde `200` con un `RouteResult`:

```json
{
  "points": [[46.0671, 11.1214], "…", [46.0671, 11.1214]],
  "distance_m": 5230.4,
  "similarity": 0.91,
  "shape": "heart",
  "warnings": ["start moved 250 m south of the requested point, …"],
  "directions": []
}
```

Qui `directions` resta vuoto: le indicazioni arrivano solo con le
richieste in due tempi (sopra). Nel `GpxRequest` si può omettere.

**`alternatives`** (TASK-093, ADR-0087): altri percorsi per la stessa
richiesta, dal migliore, al più 2 (`MAX_ALTERNATIVES`). Ognuno è un
`RouteResult` intero, con i suoi `points`, `distance_m`, `similarity`,
avvisi e, nei job, le sue `directions`; il suo `alternatives` è vuoto. Si
sceglie nell'app: il `GpxRequest` manda poi il risultato scelto, con o
senza il campo. Un'API precedente non lo manda, e l'app mostra il percorso
da solo. Quali entrano: `ROUTE_ENGINE.md`, «Altri percorsi fra cui
scegliere». Il registro delle richieste scrive anche le loro impronte
(`outcome.alternatives`), e il replay le confronta.

La richiesta è sincrona: la risposta arriva quando il percorso è pronto
(tempi sotto). Resta per `/docs`, `curl` e le misure; l'app usa
`/route-jobs`.

### In bici: `"activity": "cycling"` (TASK-190, ADR-0153)

```json
{ "start": [46.0671, 11.1214], "shape": "circle", "distance_m": 20000, "activity": "cycling" }
```

- **La rete della bici**: ciclabili e strade fino alle `primary`, i sensi
  unici rispettati, mai scale, `trunk`, autostrade o vie vietate alle bici
  (`ROUTE_ENGINE.md`, `MAPS.md`). Vale per `/routes`, `/route-jobs` e
  `/image-route-jobs`: forma, parola o foto. Il `RouteResult` è lo stesso
  di una corsa; fra gli avvisi c'è in più lo sterrato («… m of the route on
  unpaved roads»).
- **Da 10 a 30 km** (`DISTANCE_LIMITS_M` in `shared-types`): fuori è `422
  invalid_request`, `distance must be between 10000 and 30000 metres for
  cycling, got 5000`. La corsa resta 1–50 km, con il messaggio di prima.
  La distanza suggerita di `shape_not_drawable` resta in quei limiti.
- **Solo le attività del contratto**, `running` e `cycling`
  (`SUPPORTED_ACTIVITIES`): un'altra è `422 invalid_request`, `unsupported
  activity 'paddling'; choose one of: running, cycling`.
- **Le zone**: l'API ha le zone della bici accanto a quelle a piedi,
  `bike_*` in `data/cache/` (`MAPS.md`, «Cache»), e ne tiene in memoria una
  sola (sotto, «Grafi»). Le città con la zona della bici già fatta
  (`prefetch_zones --activity cycling`, 26 × 26 km attorno al centro)
  rispondono senza scaricare; altrove la prima richiesta scarica la zona da
  Overpass (`downloading_map`), due richieste grandi che Overpass può
  rifiutare (`503 map_data_unavailable`).
- **Gli esempi tenuti** distinguono l'attività: la stessa forma dallo
  stesso centro in bici è un altro percorso. `draw_examples` disegna solo
  quelli a piedi: cosa mostra «Explore» con la bici lo decide l'utente
  (TASK-190, parte C).
- Le indicazioni di un percorso di «Explore» (`/route-directions`) e i
  percorsi a tema restano a piedi. Un preferito in bici ricorda la sua
  attività (TASK-200, «Favorites»): la sua esportazione GPX la manda; le
  sue indicazioni, chieste a `/route-directions` con i soli punti, restano
  a piedi.
- **Tempi**: non ancora misurati su una zona vera della bici (task file
  di TASK-190).

### Una parola invece di una forma (TASK-056)

Un `RouteRequest` ha `shape` **oppure** `word`: l'altro manca o è `null`.
Con `word` il motore scrive la parola una lettera alla volta, come la CLI
con `--word` (ADR-0044):

```json
{ "start": [46.0671, 11.1214], "word": "ciao", "distance_m": 15000, "activity": "running" }
```

- Maiuscole o minuscole, solo le lettere dell'alfabeto del motore
  (`route_engine/letters.json`, dalla A alla Z dal TASK-059: niente
  accenti, cifre o spazi), al più 8, e almeno 3 km di percorso per
  lettera: «CIAO» vuole almeno 12 km. Sono `LETTERS`, `MAX_WORD_LETTERS` e
  `LETTER_DISTANCE_M` in `shared-types`, così l'app può controllare prima
  di chiedere. Per «città» il messaggio è `no letter À: a word can use
  only the letters A to Z`.
- Il `RouteResult` ha `"shape": null` e `"word": "CIAO"`, la parola in
  maiuscole; per una forma è il contrario, con `"word": null`.
- Il nome del file GPX usa la parola: `sgrava-CIAO-15km-2026-09-24.gpx`.
- `style` sceglie le lettere (TASK-080, ADR-0075): `"round"`, il
  predefinito, oppure `"block"`, le lettere squadrate girate sulla griglia
  delle vie (ADR-0072). Solo con una parola: `"block"` con una forma, o uno
  stile che non c'è, è `invalid_request` (`a style is for the letters of a
  word`, `unknown style 'italic'`). Gli stili sono `LETTER_STYLES` in
  `shared-types`; una richiesta d'immagine non ha `style`.
- Una parola chiede più tempo di una forma: 40–140 s per «CIAO» a 15 km,
  quasi sempre con la ricerca fino a 2 km (ADR-0044); con le lettere di
  più tratti di più, fino a 258 s per «BELLO» (ADR-0056).

### La penna alzata (TASK-197, ADR-0157)

Una parola si può chiedere con **`"pen_up": true`**: ogni lettera si
disegna da sola, e fra una e l'altra si cammina senza disegnare
(`ROUTE_ENGINE.md` §2 e §5, «La penna alzata»):

```json
{ "start": [46.0671, 11.1214], "word": "ciao", "distance_m": 15000, "activity": "running", "pen_up": true }
```

- **Facoltativo**, `false` se manca: le app già installate non lo mandano
  e ricevono il percorso di sempre. Solo con `word`: con `shape`, o in una
  richiesta d'immagine, è `invalid_request` (`pen_up is for the letters of
  a word`).
- La distanza chiesta vale per le **lettere**, la parte che la corsa
  registra; `distance_m` del risultato resta la lunghezza di tutti i
  `points`, tratti a piedi compresi (a Trento, «CIAO» da 15 km: 15,4 km di
  lettere, 19,6 in tutto).
- Il `RouteResult` ha **`walks`**: una coppia `[da, a]` di indici in
  `points` per ogni tratto a piedi, compresi tutti e due, in ordine; dove
  finisce un tratto comincia la lettera successiva. Con n lettere n − 1
  coppie. I `points` restano una linea sola, da seguire (navigazione,
  indicazioni, GPX), ma **non è chiusa**: va dalla prima lettera all'ultima.
  `similarity` è delle sole lettere. Ogni alternativa ha i suoi `walks`.

```json
{
  "points": [[46.0671, 11.1214], "…", [46.0671, 11.1253], "…", [46.0671, 11.1253]],
  "distance_m": 5506.5,
  "similarity": 0.9,
  "shape": null,
  "word": "IO",
  "walks": [[2, 5]],
  "…": "…"
}
```

  Qui i punti da 2 a 5 si camminano: la I finisce al punto 2, la O
  comincia al 5.
- **`walks` c'è sempre nelle risposte**, vuoto per una forma, un'immagine e
  una parola senza `pen_up`. Un'API precedente non lo manda: in
  `shared-types` è facoltativo, e un'app nuova legge anche un'API vecchia
  come una linea sola. Le app installate ignorano il campo.
- Nel `GpxRequest` e nel `TrackScoreRequest` i `walks` si rimandano come
  sono arrivati (`POST /gpx`, `POST /track-scores`); da TASK-199 anche con
  una corsa salvata e con un preferito («My activities», «Favorites»).

### Un'immagine invece di una forma (TASK-073)

Due richieste, e il contorno si vede prima del percorso (ADR-0069).

**`POST /image-outlines`** — il motore ricava il contorno dell'immagine
(`route_engine/image_outline.py`, ADR-0068):

```json
{ "image": "/9j/4AAQSkZJRgABAQ…" }
```

`image` è il file PNG o JPEG in base64, dentro il JSON: al più 10 MB prima
della codifica (`MAX_IMAGE_BYTES`), cioè 13 333 336 caratteri. Nessun upload
multipart, che vorrebbe `python-multipart`. La risposta, in meno di 2 s:

```json
{ "points": [[-1.0, -0.8], [1.0, -0.8], [0.0, 0.9], [-1.0, -0.8]],
  "image_points": [[0.1, 0.9], [0.9, 0.9], [0.5, 0.05], [0.1, 0.9]],
  "aspect": 1.0 }
```

- `points`: il contorno chiuso, centrato e scalato in [-1, 1], y in alto,
  al più 100 angoli (`MAX_OUTLINE_POINTS`): è quello che torna indietro
  con la richiesta del percorso.
- `image_points`: gli stessi angoli sopra l'immagine, come frazioni di
  larghezza e altezza dall'angolo in alto a sinistra: l'app ci disegna la
  linea sopra la foto.
- `aspect`: larghezza su altezza dell'immagine, dritta (EXIF).
- `strokes` e `image_strokes` (dal TASK-084 anche per una foto appena
  letta): con più soggetti, fino a 4, ogni soggetto dopo il più grande è
  un tratto, nei due sistemi di `points` e `image_points`. Il primo lato è
  il collegamento, dalla linea già disegnata al soggetto; il resto è il
  contorno del soggetto, che si chiude sul secondo punto. Vuoti con un
  soggetto solo. L'app li disegna e li rimanda senza cambiarli.

Un'immagine che non dà un contorno è rifiutata con `422`
`image_not_usable` e il motivo del motore in `reason`: `format`,
`unreadable`, `background`, `no_subject`, `scattered`, `edge`, `small`,
`jagged` (`IMAGE_REASONS` in `shared-types`). Dal TASK-084 `scattered`
vuol dire più di 4 soggetti: fino a 4 si disegnano. Base64 non valido o
un'immagine oltre il limite sono `invalid_request`.

**`POST /image-route-jobs`** — il percorso del contorno, come `/route-jobs`:

```json
{ "start": [46.0671, 11.1214], "outline": [[-1.0, -0.8], [1.0, -0.8], [0.0, 0.9], [-1.0, -0.8]], "distance_m": 15000, "activity": "running" }
```

- `outline` sono i `points` di `/image-outlines`, senza cambiarli.
  L'immagine non viaggia una seconda volta.
- Il contorno arriva dal telefono e si controlla come ogni input: da 4 a
  101 punti, numeri finiti, dentro [-1, 1], e poi il controllo del motore
  (`parse_outline`: chiuso, almeno 3 punti distinti, senza incroci).
  Altrimenti `422` `invalid_request` con quello che non va
  (`outline: the outline crosses itself: …`).
- Partenza, distanza e attività si controllano come per una forma.
- La risposta è un `RouteJob`: si legge e si annulla su
  `/route-jobs/{job_id}`, come gli altri. Il motore lo disegna come
  `--image` dalla CLI, dritto (ADR-0038); il `RouteResult` ha `"shape":
  null` e `"word": null`. Con la mela di TASK-072 a Trento, 10 km:
  9,2 km, somiglianza 0,94, in 27 s.
- Il GPX si chiede a `POST /gpx` con questa richiesta al posto del
  `RouteRequest`; il file si chiama `sgrava-image-15km-2026-09-26.gpx`.
- `strokes` (dal TASK-079, facoltativo): gli altri soggetti della foto
  (TASK-084) e i dettagli disegnati a mano, gli `strokes` di un
  `ImageOutline`, senza cambiarli. Si controllano come il contorno: numeri
  finiti, dentro [-1, 1], al più 200 punti **percorsi** in tutto
  (`MAX_DETAIL_POINTS`): un anello conta una volta, un tratto andata e
  ritorno due, quindi circa 100 punti di dettagli senza anello; poi `parse_outline` con i
  dettagli (ognuno parte dalla linea o da un dettaglio prima; possono
  incrociarsi e incrociare il contorno). Il percorso segue ogni dettaglio e torna indietro.

### Modificare il contorno (TASK-079)

**`POST /image-outline-edits`** — una parte o un dettaglio disegnati col
dito sull'anteprima (ADR-0074). L'API non tiene niente fra due modifiche:
l'app manda il contorno che mostra e la linea disegnata.

```json
{ "image_points": [[0.1, 0.9], [0.9, 0.9], [0.5, 0.05], [0.1, 0.9]],
  "image_strokes": [],
  "aspect": 1.0,
  "kind": "detail",
  "line": [[0.5, 0.88], [0.5, 0.7], [0.5, 0.5]] }
```

- `image_points`, `image_strokes`, `aspect`: quelli dell'`ImageOutline`
  mostrato; `line`: la linea disegnata, come frazioni della foto
  dall'angolo in alto a sinistra, da 2 a 2000 punti.
- `kind`: `part`, una linea chiusa: a cavallo del contorno si unisce alla
  sagoma, altrove (dentro o fuori) resta un anello appeso alla linea più
  vicina; `detail`, una linea che il percorso fa andata e ritorno: parte
  dal contorno (o da un dettaglio) se comincia lì vicino, altrimenti il
  motore la collega alla linea più vicina. Dove si incrocia da sola chiude
  un anello, come un occhio.
- La risposta è un `ImageOutline`, con in più `strokes` (nella cornice di
  `points`) e `image_strokes` (sopra la foto). `/image-outlines` li dà
  vuoti.
- Un disegno che non dà una linea sola è `422` `outline_edit_rejected`, con
  il motivo del motore in `reason`: `short`, `covers_detail`, `too_many_corners`
  (`EDIT_REASONS` in `shared-types`). Punti fuori da [0, 1], un contorno
  non valido o `aspect` fuori da 1/20–20 sono `invalid_request`.
- «Undo» è dell'app: torna al contorno di prima, senza chiamare l'API.

### Account (TASK-114, ADR-0120)

Email e password (ADR-0114), nel database di `DATABASE.md` (ADR-0115).
Tipi e esempi in `shared-types` (`SignUpRequest`, `SignInRequest`,
`Session`, `User`; `fixtures/sign-up-request.json`, `fixtures/session.json`).

| Endpoint | Cosa | Risposta |
|---|---|---|
| `POST /accounts` | iscriversi: `email`, `password`, `username`, `at_least_16` | `201` `Session`: iscriversi fa anche entrare |
| `POST /session` | entrare: `email`, `password` | `200` `Session` |
| `DELETE /session` | uscire, solo da questo telefono | `204` |
| `GET /me` | chi sono | `200` `User` |
| `DELETE /me` | cancellare l'account e tutto ciò che è suo, subito | `204` |

- `Session` è `{ "token": "…", "user": User }`; `User` è `id`, `email`,
  `username`, `role` (`user` o `admin`) e `created_at`, più `bio` e
  `public_id` da TASK-116 («Profile», sotto). Il token è l'unica
  cosa segreta che l'API dà, e solo qui: l'app lo tiene in
  `expo-secure-store` e lo rimanda come `Authorization: Bearer <token>` a
  `GET /me`, `DELETE /session`, `DELETE /me`, ai preferiti e alle corse
  (sotto) e agli endpoint che verranno (la dipendenza `current_user` di
  `accounts.py`).
- L'email si salva in minuscolo; la password da 8 a 128 caratteri; il nome
  da 3 a 20 fra lettere, cifre, `_` e `.`, unico senza badare alle
  maiuscole. `at_least_16` falso è `422 invalid_request` (ADR-0114, punto
  6). Campi in più, come `role`, sono `invalid_request`.
- La password resta solo come hash Argon2id; del token il database tiene
  solo lo SHA-256. Né l'una né l'altro finiscono nei log.
- Una sessione finisce 90 giorni dopo l'ultimo uso (`session_expired`, una
  volta, poi `not_signed_in`) o con `DELETE /session`. Ogni telefono ha la
  sua: uscire da uno non fa uscire gli altri.
- Password sbagliata ed email sconosciuta danno lo stesso
  `401 wrong_credentials`, nello stesso tempo. Dopo 5 password sbagliate in
  15 minuti per la stessa email, `429 too_many_requests` con `Retry-After`,
  anche con quella giusta. Il limite dei POST di `SHAPEROUTE_RATE_LIMIT`
  vale in più.

### Favorites (TASK-171, ADR-0139)

I percorsi che un account tiene. Tutti gli endpoint vogliono il token
(`Authorization: Bearer <token>`): senza, `401 not_signed_in`; senza
database, `503 accounts_unavailable`. Esempi in `shared-types`
(`fixtures/favorites.json`, `favorite.json`, `favorite-request.json`); i
tipi dell'app in `apps/mobile/src/api/favorites.ts`.

| Endpoint | Cosa | Risposta |
|---|---|---|
| `GET /me/favorites` | l'elenco, dal più recente | `200` `{ "favorites": [...] }` |
| `GET /me/favorites/{key}` | un preferito intero, con la linea | `200`, o `404 http_error` |
| `PUT /me/favorites/{key}` | tenere un percorso | `201` la prima volta, poi `200` |
| `DELETE /me/favorites/{key}` | toglierlo | `204`, anche se non c'era |

- **`key`** la fa l'app dalla linea del percorso (`favoriteKey`: 16 cifre
  esadecimali; l'API accetta da 8 a 40 fra minuscole e cifre): lo stesso
  percorso ha la stessa chiave su ogni telefono, e tenerlo due volte lo
  tiene una volta, com'era la prima (il secondo `PUT` non cambia niente).
- **Il corpo del `PUT`**: `city` (una città del catalogo, il luogo cercato,
  o vuota; al più 80 caratteri), `shape`, `word`, `style` (`round` o
  `block`), `title` (il tema di un percorso a tema, «Image» per una foto; al
  più 60), `distance_m` (chiesta), `route_m` (sulle strade), `similarity`
  (0–1), `points` come `[lat, lon]`, da 2 a 20 000. Campi in più, punti
  fuori dalla Terra o misure fuori scala: `422 invalid_request`.
- **Un preferito dell'elenco** ha `id` (la chiave), gli stessi campi senza
  `points`, `start`, `preview` (al più 64 punti, come i percorsi
  consigliati) e `created_at`. Quello intero ha `points`, cifra per cifra
  come sono stati mandati.
- **Al massimo 200 per account**: oltre, `422 invalid_request` con un
  messaggio che l'app mostra così com'è.
- Ognuno vede solo i suoi: la chiave di un altro dà `404`. `DELETE /me`
  cancella anche i preferiti.
- **Una parola con la penna alzata** (TASK-199, ADR-0158): il corpo del
  `PUT` può avere `walks`, quelli del `RouteResult` (coppie `[da, a]` di
  indici in `points`, «La penna alzata»), facoltativo. Si controllano come
  in `POST /track-scores`: fuori dai punti, all'indietro o sovrapposti,
  `422 invalid_request`. Il preferito intero ha **sempre** `walks`, vuoto
  per ogni altro percorso e per quelli tenuti prima; l'elenco non cambia.
  Esempi: `favorite-request-walks.json`, `favorite-walks.json`. Un'API
  precedente rifiuta il campo: l'app lo manda solo per una parola con la
  penna alzata, e se il `PUT` torna `422 invalid_request` lo rimanda una
  volta senza `walks`.
- **L'attività** (TASK-200, ADR-0160): il corpo del `PUT` può avere
  `activity`, quella di `RouteRequest` (`running` o `cycling`, «In bici»),
  facoltativa: senza, `running`. Un'attività che l'API non offre è `422
  invalid_request`, con le parole di `POST /routes` (`unsupported activity
  'paddling'; choose one of: running, cycling`). L'elenco e il preferito
  intero hanno **sempre** `activity`: `running` per quelli tenuti prima. La
  chiave resta quella della linea: la stessa linea tenuta come corsa e poi
  in bici è un preferito solo, com'era la prima volta. Esempi:
  `favorite-request-cycling.json`, `favorites-cycling.json`,
  `favorite-cycling.json`. Un'API precedente rifiuta il campo: l'app lo
  manda solo quando non è `running` (la richiesta di una corsa resta byte
  per byte quella di prima), e se il `PUT` torna `422 invalid_request` lo
  rimanda una volta come un'app precedente a TASK-199, senza `activity` né
  `walks`: il preferito si tiene come una corsa.

### My activities (TASK-172, ADR-0140)

Le corse che un account ha registrato, con un percorso o senza. Tutti gli
endpoint vogliono il token: senza, `401 not_signed_in`; senza database,
`503 accounts_unavailable`. Esempi in `shared-types`
(`fixtures/activities.json`, `activity.json`, `activity-request.json`); i
tipi dell'app in `apps/mobile/src/api/activities.ts`; il codice in
`activities.py`.

| Endpoint | Cosa | Risposta |
|---|---|---|
| `GET /me/activities` | una pagina dell'elenco, dalla corsa più recente | `200` `{ "activities": [...], "next": …, "total": … }` |
| `GET /me/activities/{key}` | una corsa intera, con le due linee | `200`, o `404 http_error` |
| `PUT /me/activities/{key}` | salvare una corsa | `201` la prima volta, poi `200` |
| `DELETE /me/activities/{key}` | cancellarla | `204`, anche se non c'era |

- **`key`** la fa l'app dall'inizio della traccia (`activityKey`: 16 cifre
  esadecimali dall'orario e dal punto della prima posizione; l'API accetta
  da 8 a 40 fra minuscole e cifre): la stessa corsa mandata due volte è
  salvata una volta, com'era la prima (il secondo `PUT` risponde `200` e
  non cambia niente, nemmeno se il corpo è diverso).
- **Il corpo del `PUT`** è la corsa come il telefono l'ha registrata:
  `track`, le posizioni in ordine come per `POST /track-scores` (`point`,
  `time_ms` sull'orologio del telefono, `accuracy_m`), da 2 a 20 000;
  `pauses`, i tratti che non sono della corsa (`from_ms`, `to_ms`, `auto`:
  vero se l'app si è fermata da sola perché il corridore era fermo, falso
  se l'ha chiesto lui), al più 1 000, anche nessuna; `points` e
  `similarity`, il percorso seguito e la sua somiglianza (`RouteResult`),
  tutti e due o tutti e due `null` per una corsa senza percorso; `shape`,
  `word`, `style`, `title`: cosa disegna il percorso, come nei preferiti.
- **Km, tempo e punteggio li conta l'API**, e l'app non li può mandare
  (`distance_m`, `duration_s`, `score` nel corpo sono `422`):
  - la traccia tenuta è quella **pulita dal motore** (`clean_track`,
    ADR-0090): senza le posizioni troppo incerte, ripetute o che nessun
    corridore raggiunge. Con meno di 2 posizioni buone la corsa non si
    salva: `422 invalid_request`, «This run cannot be saved: …»;
  - `distance_m` è la lunghezza di quella traccia, in metri interi, senza
    il passo a cavallo di una pausa chiesta dal corridore (dove sia stato
    nella pausa non è corsa); una pausa `auto` non toglie metri;
  - `duration_s` è il tempo dalla prima all'ultima posizione tenuta, meno
    le pause (una volta sola dove due si sovrappongono), in secondi interi;
  - `score` e `fidelity` sono quelli di `track_score.py` contro `points`,
    come `POST /track-scores`; `null` senza percorso, e `null` anche quando
    la corsa è troppo corta per essere giudicata (si salva lo stesso);
  - `started_at` è l'orario della prima posizione tenuta. Un orario prima
    del 2020 o oltre domani non è un orologio: `422 invalid_request`.
- **`place`** è il nome del paese da cui la corsa parte («Trento»), o
  `null`. L'API lo chiede al geocoding inverso di Geoapify, con la chiave
  della ricerca dei luoghi (`GEOAPIFY_API_KEY`), per la partenza
  **arrotondata a due decimali** (circa un chilometre): il servizio non
  riceve mai il punto vero. Senza chiave, se il servizio non risponde o se
  lì non c'è un paese, `null`, e la corsa si salva lo stesso. Le risposte
  restano in memoria: due corse dallo stesso chilometro chiedono una volta.
- **Una corsa dell'elenco** ha `id` (la chiave), `started_at`, `place`,
  `shape`, `word`, `style`, `title`, `distance_m`, `duration_s`, `score`,
  `fidelity`, e due anteprime leggere, al più 64 punti l'una:
  `route_preview` (`null` senza percorso) e `track_preview`. Quella intera
  ha al loro posto `points` (o `null`), `track` (la traccia pulita, come
  `[lat, lon]`) e `similarity`, e in più `walks` (sotto) e `pauses`.
- **Le pause della corsa intera** (TASK-200, ADR-0160): `pauses` c'è
  **sempre**, `[]` per una corsa senza. Ognuna è `{"from_s", "to_s",
  "auto"}`, più `"pen": true` solo per una pausa della penna, come le
  tiene la riga (`DATABASE.md`): in secondi dal primo punto di `track`,
  lo stesso orologio della traccia, e solo quello che di ogni pausa sta
  dentro la corsa; nell'ordine in cui l'app le ha mandate, due che si
  sovrappongono restano due. Una pausa tutta fuori dalla corsa non c'è.
  L'elenco non le ha. Esempio: `activity-pauses.json`, la corsa di
  `activity-walks.json` con la sua pausa della penna. Un'API precedente non
  le manda: l'app legge il dettaglio anche senza, e oggi non le mostra.
- **Le pagine**: `GET /me/activities?limit=20&cursor=…`, `limit` da 1 a
  50. `next` è il `cursor` della pagina dopo, `null` all'ultima; `total` è
  il numero di tutte le corse dell'account, su ogni pagina. L'ordine è
  l'inizio della corsa, dalla più recente, non il momento in cui è stata
  mandata: una corsa rimasta sul telefono senza rete va al suo posto. Il
  cursore è un punto in quell'ordine, non una riga: due pagine di seguito
  non ripetono e non saltano corse nemmeno se nel frattempo una è stata
  cancellata o salvata. Un cursore o un `limit` che non lo sono: `422`.
- **Al massimo 2 000 per account**: oltre, `422 invalid_request` con un
  messaggio che dice di cancellarne una.
- Ognuno vede, apre e cancella solo le sue: la chiave di un altro dà `404`.
  `DELETE /me` cancella anche le corse. Niente di una corsa è pubblico:
  titolo, «Public» e traccia tagliata arrivano con TASK-117.
- **Una corsa su una parola con la penna alzata** (TASK-199, ADR-0158):
  - il corpo del `PUT` può avere `walks`, quelli del percorso seguito
    (`RouteResult.walks`), facoltativo e solo con `points`: `walks` senza
    `points`, o che non stanno nei `points` (fuori, all'indietro,
    sovrapposti, controllati come in `POST /track-scores`), sono `422
    invalid_request`;
  - con i `walks` **il punteggio è delle sole lettere**: `score` e
    `fidelity` sono quelli di `POST /track-scores` con gli stessi `points`,
    `similarity`, `track` e `walks`, cioè quelli visti a fine corsa. Senza,
    come prima;
  - una pausa può avere **`pen`**, vero se l'app l'ha messa da sola fra due
    lettere, falso se manca. Per km e tempo conta come una pausa chiesta dal
    corridore (`auto` falso): il tratto a piedi non è corsa. Si tiene nella
    riga (`DATABASE.md`), e da TASK-200 torna nelle `pauses` del dettaglio;
  - la corsa intera ha **sempre** `walks`, vuoto per ogni altra corsa e per
    quelle salvate prima; l'elenco non cambia.

  Esempi: `activity-request-walks.json` (la corsa su «II», con la pausa
  della penna fra le due lettere) e `activity-walks.json`. Un'API
  precedente rifiuta `walks` e `pen`: l'app li manda solo per una parola
  con la penna alzata, e se il `PUT` torna `422 invalid_request` lo
  rimanda una volta senza, come prima di TASK-199 (la corsa si salva con
  il punteggio su tutto il percorso, invece di perdersi).

### Profile picture (TASK-178, ADR-0146)

La foto del profilo di un account. Tutti gli endpoint vogliono il token:
senza, `401 not_signed_in`; senza database, `503 accounts_unavailable`.
Esempio in `shared-types` (`fixtures/profile-photo.json`); il tipo dell'app
in `apps/mobile/src/api/profilePhoto.ts`; il codice in `profile_photos.py`.

| Endpoint | Cosa | Risposta |
|---|---|---|
| `GET /me/photo` | la foto | `200` `{ "image": "…", "updated_at": "…" }`, o `404 http_error` senza foto |
| `PUT /me/photo` | mettere la foto, al posto di quella di prima | `200`, la foto come l'API l'ha tenuta |
| `DELETE /me/photo` | toglierla | `204`, anche se non c'era |

- **Il corpo del `PUT`** è `{ "image": "…" }`: un file JPEG o PNG in
  base64, al più 10 MB prima della codifica, come per `POST
  /image-outlines`. Campi in più, base64 rotto, un file che non è
  un'immagine, un altro formato (GIF, HEIC…) o più di 50 megapixel:
  `422 invalid_request`, con il motivo nel messaggio; la foto di prima
  resta.
- **Cosa si tiene** (ADR-0115): l'API raddrizza la foto con il suo EXIF,
  ne prende il quadrato in mezzo, lo riduce a **256 × 256 px** e lo salva
  come JPEG nuovo (qualità 85, pochi KB). Il file del telefono non si
  tiene, quindi nemmeno il suo EXIF (dove e quando è stata scattata). Una
  foto trasparente ha il fondo bianco.
- **`image`** nelle risposte è quel JPEG in base64: l'app lo mostra così
  com'è (`data:image/jpeg;base64,…`), senza un'altra richiesta.
- Al più **10 `PUT` al minuto per account** (`429 too_many_requests` con
  `Retry-After`): ridurre una foto costa un momento di CPU. Il limite dei
  POST di `SHAPEROUTE_RATE_LIMIT` non conta i `PUT`. Leggere non ha limiti.
- Ognuno legge, cambia e toglie solo la sua; gli altri iscritti la vedono
  nel profilo (`GET /users/{public_id}`, «Profile», sotto; TASK-116).
  `DELETE /me` cancella anche la foto.

### Profile (TASK-116, ADR-0128)

Nome utente e bio di un account, e il suo profilo come lo vedono gli altri
iscritti. Tutti e due gli endpoint vogliono il token: senza, `401
not_signed_in`; senza database, `503 accounts_unavailable`. Tipi in
`shared-types` (`User`, `EditProfileRequest`, `PublicProfile`,
`BIO_MAX_LENGTH`), esempi in `fixtures/edit-profile-request.json` e
`fixtures/public-profile.json`; il codice in `profiles.py`.

| Endpoint | Cosa | Risposta |
|---|---|---|
| `PATCH /me` | cambiare nome utente e bio | `200` `User`, com'è adesso |
| `GET /users/{public_id}` | il profilo di un iscritto | `200` `PublicProfile`, o `404 http_error` |

- **`User`** (anche in `Session` e `GET /me`) ha in più `bio` (`""` senza)
  e `public_id`, un UUID casuale dato a ogni account dalla migrazione
  `0007`: è il `{public_id}` del profilo. L'`id` numerico resta dell'API:
  in sequenza, direbbe quanti account ci sono e farebbe aprire tutti i
  profili uno dopo l'altro. Un `public_id` non cambia con il nome.
- **Il corpo del `PATCH`** ha solo quello che cambia: `username`, `bio`, o
  tutti e due; un campo assente o `null` resta com'è, `{}` non cambia
  niente. Il nome segue la regola dell'iscrizione (da 3 a 20 fra lettere,
  cifre, `_` e `.`), unico senza badare alle maiuscole: il proprio con altre
  maiuscole si può. La bio perde gli spazi in testa e in coda, gli a capo
  diventano `\n`; `""` la toglie.
- **Errori del `PATCH`**, con un messaggio in parole che l'app mostra così
  com'è: nome fuori regola, `422 invalid_request` «A username is 3 to 20
  letters, digits, _ or . (no spaces).»; bio oltre 160 caratteri (contati
  come caratteri: un'emoji è uno), «A bio is at most 160 characters.»; bio
  con caratteri di controllo (tranne l'a capo), «A bio is words and new
  lines: it cannot hold control characters.»; nome di un altro account,
  `409 username_taken`. Campi in più (`email`, `role`, `public_id`…) o di
  un altro tipo: `422 invalid_request`. Con un errore non cambia niente.
- **`PublicProfile`** è `public_id`, `username`, `bio`, `photo` (il JPEG
  della foto in base64, come `GET /me/photo`, o `null`) e `drawings`, i
  disegni **pubblicati**: 0 per tutti finché TASK-117 non fa pubblicare le
  corse, che fino ad allora sono private (ADR-0114, punto 4). **Mai
  l'email**, né `role`, `id` o la data d'iscrizione (un test lo prova).
- Un `public_id` che non c'è, di un account cancellato, o che non è un
  UUID (un `id` numerico, un nome): `404 http_error` «No profile with this
  id.». Il proprio profilo si legge come gli altri.
- **Un'API precedente** non ha `PATCH /me` (`405 http_error`) né `GET
  /users/…` (`404 http_error`), e il suo `User` non ha `bio` né
  `public_id`: l'app nuova lo legge lo stesso e dice «Editing the profile
  is not available on this API yet.». L'app pubblicata ignora i campi in
  più.

### Send to Strava (TASK-187, ADR-0156)

Una corsa salvata va sul profilo Strava di chi ha collegato il suo atleta,
come attività, con la traccia e i tempi veri. Gli endpoint `/me/…` vogliono
il token dell'account: senza, `401 not_signed_in`; senza database, `503
accounts_unavailable`. Esempi in `shared-types` (`fixtures/strava-status.json`,
`strava-connect.json`, `strava-activity.json`); il codice in `strava.py`
(gli atleti e le corse) e `strava_client.py` (le chiamate a Strava, l'unico
posto con i suoi indirizzi).

| Endpoint | Cosa | Risposta |
|---|---|---|
| `GET /me/strava` | Strava c'è su questo server? L'account è collegato? | `200` `{ "available", "connected", "athlete" }` |
| `POST /me/strava/connect` | cominciare il collegamento | `200` `{ "url": … }`: la pagina di Strava da aprire nel browser |
| `GET /strava/callback` | dove Strava rimanda il browser; senza chiave e senza token | una pagina HTML |
| `DELETE /me/strava` | scollegare | `204`, anche se non era collegato |
| `GET /me/activities/{key}/strava` | cosa ha Strava di una corsa | `200` `{ "status", "url" }`, o `404 http_error` |
| `POST /me/activities/{key}/strava` | mandare la corsa; corpo facoltativo `{ "name": … }` | `200` è un'attività; `202` Strava la sta ancora leggendo |

- **Spento o acceso**: senza `STRAVA_CLIENT_ID` e `STRAVA_CLIENT_SECRET`
  nell'ambiente dell'API, `GET /me/strava` risponde `available: false`
  (l'app non mostra niente di Strava) e gli altri `503 http_error`;
  `DELETE /me/strava` funziona lo stesso. `athlete` è il nome dell'atleta
  su Strava («Ada Lovelace»), per «Connected as …», o `null`.
- **Il collegamento** passa dal browser e dal server: l'app non vede mai
  il secret né un token di Strava. `POST /me/strava/connect` crea uno
  `state` casuale e risponde con l'indirizzo di Strava
  (`/oauth/mobile/authorize`: sul telefono apre l'app Strava, se c'è) con
  `scope=activity:write`, il solo permesso chiesto: aggiungere attività,
  niente in lettura. Strava rimanda il browser a
  `https://<dominio dell'API>/strava/callback` (`SHAPEROUTE_DOMAIN`; se è
  vuota, l'indirizzo a cui è arrivata la richiesta dell'app).
- **Lo `state`** dice alla callback di quale account è il collegamento:
  vale una volta, per 10 minuti, e un account ne ha uno solo (chiedere di
  nuovo il collegamento spegne quello di prima). Il database ne tiene solo
  lo SHA-256. Uno `state` sconosciuto, usato o scaduto non collega niente:
  pagina «This link has expired.», `400`.
- **La callback risponde sempre una pagina**, perché la legge una persona:
  «Strava is connected. Go back to Sgrava.» (`200`); «Strava is not
  connected.» (`200`) se l'atleta ha detto di no o ha tolto la spunta al
  permesso di caricare (allora non si chiede nemmeno il token); «Strava
  did not answer.» (`502`); «Strava is not set up here.» (`503`); «Sgrava's
  Strava app takes only its owner for now.» (`403`) quando un atleta
  diverso da chi ha creato l'app Strava prova a collegarsi prima che
  Strava l'abbia rivista. La pagina
  non si tiene in cache e non passa il suo indirizzo ad altri.
- **Un atleta è di un account solo**, l'ultimo che l'ha collegato: Strava
  ha un'autorizzazione sola per atleta, quindi una sola serie di token.
  Collegare un altro atleta allo stesso account revoca quello di prima.
- **I token** stanno nel database, mai in una risposta né nei log. Quello
  d'accesso dura sei ore: l'API lo rinnova da sola quando mancano meno di
  cinque minuti alla scadenza, e tiene il refresh token nuovo che Strava
  può dare a ogni rinnovo. Se Strava rifiuta il refresh token (l'atleta ha
  tolto Sgrava dalle impostazioni di Strava) l'atleta si dimentica e
  l'invio risponde `409 http_error`, «Strava is not connected: connect it
  first.»: l'app torna a «Connect with Strava».
- **L'invio** (`POST /me/activities/{key}/strava`): l'API scrive il GPX
  della corsa salvata, con l'orario di ogni punto (`GPX.md`, «La corsa
  fatta»), e lo dà a `POST /uploads` di Strava con `sport_type=Run`,
  `external_id` = la chiave della corsa, il nome e la descrizione. Poi
  guarda l'upload ogni secondo, al più 5 volte: `200` con `status: "sent"`
  e `url` (la pagina dell'attività) appena Strava l'ha letto; se ci mette
  di più, `202` con `status: "processing"`, e la stessa chiamata rifatta
  riprende a guardare senza caricare un'altra volta.
- **Il nome** dell'attività è quello scritto nell'app prima di «Save»
  (scelta dell'utente, 2026-10-02): il corpo facoltativo `{ "name": "Sunday
  heart" }` (`fixtures/strava-send.json`), messo su una riga e tagliato a
  100 caratteri, non rifiutato. Vuoto, `null` o senza corpo (come prima
  della parte app), il nome di Sgrava: cosa è stato disegnato e dove,
  «Heart in Trento», «CIAO in Trento», il tema di un percorso a tema; senza
  il luogo solo cosa. Una corsa senza percorso e senza nome scritto non
  manda un nome e Strava le dà il suo («Morning Run»). Il nome conta solo
  per il primo invio: una corsa già mandata, o che Strava sta leggendo,
  resta com'è. Lo stesso nome va nel `<name>` del GPX.
- **La descrizione** è «Drawn with Sgrava» per una corsa che ha seguito un
  percorso, «Recorded with Sgrava» per una corsa libera (scelta
  dell'utente: su ogni corsa).
- **Una corsa mandata due volte è un'attività sola**: la corsa tiene cosa
  ne è stato (`status`: `not_sent`, `processing`, `sent`), e una già
  mandata risponde `200` com'era, senza chiedere a Strava. Due invii
  insieme aspettano uno l'altro. Se il server l'ha dimenticato e Strava
  no, Strava rifiuta il doppione dicendo quale attività è: l'API risponde
  `sent` con quella. `url` è `null` solo se Strava ha la corsa e non dice
  dove.
- **Gli errori di Strava**: non risponde, `502 http_error` (riprovare); ha
  raggiunto il suo limite di richieste, `429 too_many_requests` con
  `Retry-After` (i secondi al prossimo quarto d'ora, o a mezzanotte UTC
  se è finito il limite del giorno); non riesce a leggere la corsa, `422
  invalid_request`, «Strava could not read this run.», e la corsa torna
  `not_sent`. Se Strava rifiuta il Client Secret del server, `502`, e
  nessuno viene scollegato.
- **Scollegare** (`DELETE /me/strava`) cancella i token dal database
  comunque, poi revoca l'accesso su Strava (`POST /oauth/revoke`). Se
  Strava non risponde i token sono già cancellati, e Sgrava resta
  nell'elenco delle app dell'atleta su Strava finché non la toglie lui.
  `DELETE /me` fa lo stesso prima di cancellare l'account. Le corse già
  mandate restano su Strava.
- Ognuno manda solo le sue corse: la chiave di un altro dà `404`.

## Eventi delle ricerche (TASK-130, ADR-0101)

Ogni ricerca e ogni segnale d'uso lascia un evento in `data/insights/`
(spento con `--no-insights`); `--insights-dir` e `--vocabulary` cambiano
cartella e vocabolario. Il funzionamento, i comandi e la privacy sono in
`docs/INSIGHTS.md`. Le risposte degli endpoint non cambiano, tranne
`/cities` corretto dal vocabolario; i segnali dell'app arrivano da
`POST /signals` (TASK-142).

## Errori

Ogni errore ha la stessa forma, con un messaggio in inglese come quelli
del motore:

```json
{ "error": { "code": "shape_not_drawable", "message": "a 7 km heart cannot be drawn here: …", "suggested_distance_m": 4000, "reason": null } }
```

`suggested_distance_m` c'è in ogni errore ed è `null` tranne con
`shape_not_drawable`, quando il percorso migliore seguiva la forma ma
mancava la distanza: è la sua lunghezza, al km intero, fra 1 e 50 km
(ADR-0041); in bici fra 10 e 30 km (TASK-190). Se il motivo è la somiglianza bassa resta `null`.
`reason` c'è in ogni errore dal TASK-073 ed è `null` tranne con
`image_not_usable` e `outline_edit_rejected` (TASK-079): il motivo del
motore, in una parola.

| Caso | HTTP | `code` |
|---|---|---|
| JSON malformato, campo mancante, in più o fuori limite | 422 | `invalid_request` |
| `activity` che il contratto non offre (`running`, `cycling`); in bici una distanza fuori da 10–30 km (TASK-190) | 422 | `invalid_request` |
| `shape` e `word` insieme o nessuno; una lettera che l'alfabeto non ha; più di 8 lettere; meno di 3 km a lettera; `style` sconosciuto o `"block"` con una forma | 422 | `invalid_request` |
| `/track-scores`: corsa troppo corta per un punteggio, `similarity` fuori da 0–1, troppe posizioni | 422 | `invalid_request` |
| Forma non disponibile in quella zona (ADR-0025); nessuna strada attorno alla partenza (ADR-0148: prima era `engine_error`) | 422 | `shape_not_drawable` |
| Zona non in cache e dati OSM non scaricabili | 503 | `map_data_unavailable` |
| Il modello che legge le parole della forma non risponde (`AI.md`) | 503 | `ai_unavailable` |
| Un'immagine senza un contorno chiaro (TASK-073) | 422 | `image_not_usable` |
| Una linea disegnata che non dà un contorno solo (TASK-079) | 422 | `outline_edit_rejected` |
| Immagine non in base64 o oltre 10 MB; contorno di `/image-route-jobs` non valido | 422 | `invalid_request` |
| Il motore viola le sue regole (ADR-0026) o altro imprevisto | 500 | `engine_error` |
| Indirizzo o metodo sbagliato | 404, 405 | `http_error` |
| Con `SHAPEROUTE_API_KEY` impostata: `X-API-Key` mancante o sbagliata (TASK-081) | 401 | `unauthorized` |
| Più di `SHAPEROUTE_RATE_LIMIT` POST in un minuto dallo stesso client (default 30; `Retry-After` in secondi) | 429 | `too_many_requests` |
| Account: 5 password sbagliate in 15 minuti per la stessa email (`Retry-After` in secondi) | 429 | `too_many_requests` |
| Account: iscrizione con un'email già usata | 409 | `email_taken` |
| Account: iscrizione con un nome già usato, anche con altre maiuscole | 409 | `username_taken` |
| Profilo: `PATCH /me` con il nome di un altro account, anche con altre maiuscole (TASK-116) | 409 | `username_taken` |
| Profilo: `PATCH /me` con un nome fuori regola o una bio troppo lunga, in parole (TASK-116) | 422 | `invalid_request` |
| Profilo: `GET /users/{public_id}` di un profilo che non c'è (TASK-116) | 404 | `http_error` |
| Account: email o password sbagliate | 401 | `wrong_credentials` |
| Account: nessun token, o uno di una sessione chiusa | 401 | `not_signed_in` |
| Account: sessione non usata da 90 giorni | 401 | `session_expired` |
| Account: l'API non ha un database (`SHAPEROUTE_DATABASE_URL`) | 503 | `accounts_unavailable` |
| Strava: il server non ha la sua app Strava (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`) | 503 | `http_error` |
| Strava: l'account non ha un atleta collegato, o l'atleta ha tolto l'accesso | 409 | `http_error` |
| Strava: non risponde | 502 | `http_error` |
| Strava: il suo limite di richieste è raggiunto (`Retry-After` in secondi) | 429 | `too_many_requests` |
| Strava: non riesce a leggere la corsa | 422 | `invalid_request` |

Forma e codici sono anche nel contratto condiviso con l'app: `ApiError` e
`API_ERROR_CODES` in `shared-types` (ADR-0031). Un codice nuovo va aggiunto
in tutti e due i posti, e i test lo controllano.

I limiti di distanza, forme, parole e attività stanno solo in
`models.py` del route-engine: Pydantic controlla i tipi, il `RouteRequest` del motore i
valori. L'API accetta solo le attività del contratto
(`SUPPORTED_ACTIVITIES`), anche se il motore ne disegna altre. Per `engine_error` il messaggio è generico e il dettaglio va nel
log dell'API, non al telefono.

## Grafi

L'API non salva i ritagli dei grafi, come invece fa la CLI (ADR-0023): da
3 a 110 MB per ogni partenza nuova avrebbero riempito il disco. Tiene in
memoria gli ultimi 2 grafi di zona e ne ritaglia uno nuovo per ogni
richiesta. **La bici ha le sue zone** (TASK-190, ADR-0153): un'altra cache
(`bike_*`) e un altro insieme in memoria, di **una** zona sola, perché una
zona della bici di 26 km pesa 0,15–0,6 GB (stima nel task file); una
richiesta in bici in un'altra città la rilegge dal disco. Ogni richiesta
va sulle zone della sua attività (`activity_graphs.py`). Una zona non in cache si scarica e si salva come con la CLI,
anche se la richiesta viene annullata durante il download: una zona pesa
circa 40 MB fra GraphML e pickle, e OSMnx tiene le risposte di Overpass
in `data/cache/http/` (244 MB il 2026-09-23).

C'è un lucchetto per zona (ADR-0032): mentre si scarica una zona, le
richieste per le altre zone non aspettano.

Il log dell'API dice per ogni richiesta da dove veniva il grafo (memoria,
disco o rete), quanto è durata e com'è andata. La posizione di partenza
non entra nel log.

## Tempi

Misurati il 2026-09-23 sul PC di sviluppo, da `curl` su `127.0.0.1`, con i
grafi già in cache; ogni caso chiesto due volte di seguito.

| Caso (5 km) | 1ª richiesta | 2ª richiesta | Risultato |
|---|---|---|---|
| Trento, cuore | 32,4 s | 24,7 s | 3866 m, somiglianza 0,89 |
| Trento, cerchio | 14,8 s | 12,6 s | 5152 m, 0,94 |
| Levico, cuore | 7,9 s | 7,7 s | 6570 m, 0,87 |
| Levico, cerchio | 7,5 s | 7,2 s | 4242 m, 0,74 |
| Trento, cerchio da una partenza nuova (46.0702, 11.1263) | 28,6 s | 20,2 s | 4725 m, 0,90 |

Quasi tutto il tempo è il calcolo del motore: il grafo pesa da 0,1 a 1,4 s
quando è in memoria. Pesa di più la prima volta: fino a 5 s per un ritaglio
già su disco, 10 s per leggere il GraphML di una zona senza pickle. I
quattro casi di riferimento trovano su disco il ritaglio esatto salvato
dalla CLI; una partenza nuova usa il grafo della zona, com'è per l'app.

La prima lettura di una zona senza pickle lo scrive accanto al GraphML
(11 MB per Trento), una volta sola, come fa la CLI. Nessun altro file
compare in `data/cache/`.

Tutti i casi stanno sotto i 60 s dopo i quali iOS tende a chiudere una
richiesta ferma; il cuore di Trento sfiora i 30 s dell'MVP (`PRODUCT.md`).

Con la ricerca del posto (TASK-038, ADR-0040), misurati il 2026-09-24 dal
motore, zone in cache, ogni caso due volte: gatto e pesce da 15 km a Levico
12–14 s, stella da 10 km a Levico 7–10 s, tutti spostati di 1 km; cuore da
15 km a Trento 47–52 s, perché prima finisce la ricerca vicina. Il primo
secondo tempo che non trova la zona la scarica (Levico: 42 s in più); lo
stato del job passa da `computing` a `downloading_map` e torna `computing`.

Dal telefono (TASK-023, PC sull'hotspot dell'iPhone) i casi fino a 10 km
nelle zone in cache hanno risposto in 5–25 s. Non stanno nei 60 s:
- **15 km**, sempre: circa 14 s per ritagliare la zona, anche dalla
  memoria, e circa 50 s di calcolo;
- **una zona nuova**: 72–100 s solo per scaricarla da Overpass sui dati
  mobili; una volta è fallita dopo 22 s (503).

Con le richieste in due tempi (TASK-025), sul PC di sviluppo:
- cerchio da 15 km a Trento, zona già in cache: accettato subito, finito
  in **31 s** (3,8 s di grafo, 26 s di calcolo; 15,9 km, somiglianza
  0,82). Nella prova sull'iPhone lo stesso caso era arrivato a 50 s di
  calcolo perché due 15 km giravano insieme;
- un 5 km chiesto subito dopo aver annullato un 15 km ancora in download:
  pronto in 18 s, senza aspettare l'altro.

### Oltre 15 km (TASK-026)

Misurati il 2026-09-23 sul PC di sviluppo, dalla partenza di Trento, con
`/route-jobs` su `127.0.0.1`, una richiesta alla volta. Le zone le ha
scaricate uno script usa-e-getta, con l'indirizzo di Overpass che risponde
(`MAPS.md`); ogni zona serve sia al cuore sia al cerchio.

| Zona | Area | Download | Su disco |
|---|---|---|---|
| 21 km | 16,7 × 16,7 km = 280 km² | 105 s | 55 MB (38 GraphML, 17 pickle), più 21 MB di risposta di Overpass |
| 30 km | 23 × 23 km = 530 km² | 279 s | 82 MB (57 GraphML, 25 pickle), più 33 MB di risposta di Overpass |

| Caso | 1ª richiesta | 2ª richiesta | Risultato |
|---|---|---|---|
| 21 km, cuore | 42 s | 47 s | 20,7 km, somiglianza 0,86 |
| 21 km, cerchio | 44 s | 36 s | 21,0 km, 0,82 |
| 30 km, cuore | 31 s | 28 s | `shape_not_drawable`: il migliore è 2,7 km più corto |
| 30 km, cerchio | 42 s | 41 s | 30,2 km, 0,90 |

Il grafo pesa 6–7 s dal disco e 2,5–4 s dalla memoria; il resto è il
calcolo, che cresce poco con la distanza. L'API con le due zone in memoria
occupa circa 400 MB. Quello che cresce è il **download** di una zona
nuova: 105 s a 21 km, 279 s a 30 km, già quasi i 5 minuti che l'app
aspetta prima del calcolo. Per questo l'app arriva a 21 km (ADR-0034):
anche in una zona nuova il percorso arriva in circa due minuti e mezzo. Sui
dati mobili il download è più lento (72–100 s per un 15 km, TASK-023).

### Dove va il tempo (TASK-063)

Misurato il 2026-09-25 dal motore, zone in cache, cuore e cerchio a 10, 15
e 21 km (numeri per fase in `tasks/TASK-063.md`). Quel giorno il PC era più
carico che nelle misure sopra: i totali assoluti vengono più alti, il
confronto prima/dopo vale. Più di metà del tempo era il **corridoio**, il
costo di ogni strada ricalcolato a ogni tracciato: reso da 1,3 a 4,5 volte
più veloce a percorsi identici (ADR-0059), Trento da 15 a 21 km è passata
da 80–97 s a 35–64 s. Sopra i 30 s restano la **seconda ricerca** fino a
2 km (ADR-0040), che a Trento corre quasi sempre, e a Milano il
**ritaglio** della zona dalla memoria, 6–13 s a richiesta.

### Il ritaglio (TASK-087)

Dal 2026-09-30 il ritaglio lo fa `ZoneCrop` (`route_engine/zone_crop.py`,
ADR-0082): lo stesso grafo di `network.crop`, nello stesso ordine, senza
passare dalle viste di NetworkX e col garbage collector sospeso. Ogni
richiesta ha ancora il suo grafo. Misurato su un Mac (non il PC delle
misure sopra), zona di Milano già in memoria: da 1,7–5,6 s a 0,3–1,0 s a
richiesta fra 10 e 21 km, percorsi identici punto per punto
(`tasks/TASK-087.md`). A Levico era già sotto il mezzo secondo.

## Domande ancora aperte

- Motore lento sulle distanze lunghe: 30–45 s da 15 a 30 km, più se lavora
  insieme a un'altra richiesta (`STATUS.md`).
- Zone oltre i 21 km: il download da Overpass supera i minuti che l'app
  aspetta; si ripensa con ADR-0009.
- Autenticazione, limiti di richieste, versione, HTTPS, deploy: fase 4.
- Motore di routing di produzione: ADR-0009, rinviata alla fase 4.
