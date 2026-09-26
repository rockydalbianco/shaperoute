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
- Per ora gira solo sul PC di sviluppo: nessuna autenticazione, nessun
  prefisso di versione, nessun CORS (l'app è nativa). Si decidono con
  hosting e account (ADR-0013, fase 4).

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

### `POST /gpx`

Riceve un `GpxRequest`, cioè `{"request": RouteRequest, "result":
RouteResult}`, e risponde `200` con il percorso in GPX 1.1
(`application/gpx+xml`), scritto da `export_gpx.py` del motore come fa la
CLI (`GPX.md`). Il nome del file è nell'intestazione:
`Content-Disposition: attachment; filename="shaperoute-heart-5km-2026-09-23.gpx"`.
L'API non ricorda niente, quindi l'export funziona anche dopo i 10 minuti
di vita di una richiesta in due tempi. Un corpo non valido risponde
`422 invalid_request` (ADR-0033).

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

`start` è `[lat, lon]`; `activity` si può omettere (`running`). Un campo in
più o scritto male è un errore, non si ignora.

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

La richiesta è sincrona: la risposta arriva quando il percorso è pronto
(tempi sotto). Resta per `/docs`, `curl` e le misure; l'app usa
`/route-jobs`.

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
- Il nome del file GPX usa la parola: `shaperoute-CIAO-15km-2026-09-24.gpx`.
- Una parola chiede più tempo di una forma: 40–140 s per «CIAO» a 15 km,
  quasi sempre con la ricerca fino a 2 km (ADR-0044); con le lettere di
  più tratti di più, fino a 258 s per «BELLO» (ADR-0056).

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

Un'immagine che non dà un contorno è rifiutata con `422`
`image_not_usable` e il motivo del motore in `reason`: `format`,
`unreadable`, `background`, `no_subject`, `scattered`, `edge`, `small`,
`jagged` (`IMAGE_REASONS` in `shared-types`). Base64 non valido o
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
  `RouteRequest`; il file si chiama `shaperoute-image-15km-2026-09-26.gpx`.

## Errori

Ogni errore ha la stessa forma, con un messaggio in inglese come quelli
del motore:

```json
{ "error": { "code": "shape_not_drawable", "message": "a 7 km heart cannot be drawn here: …", "suggested_distance_m": 4000, "reason": null } }
```

`suggested_distance_m` c'è in ogni errore ed è `null` tranne con
`shape_not_drawable`, quando il percorso migliore seguiva la forma ma
mancava la distanza: è la sua lunghezza, al km intero, fra 1 e 50 km
(ADR-0041). Se il motivo è la somiglianza bassa resta `null`.
`reason` c'è in ogni errore dal TASK-073 ed è `null` tranne con
`image_not_usable`: il motivo del motore, in una parola.

| Caso | HTTP | `code` |
|---|---|---|
| JSON malformato, campo mancante, in più o fuori limite | 422 | `invalid_request` |
| `shape` e `word` insieme o nessuno; una lettera che l'alfabeto non ha; più di 8 lettere; meno di 3 km a lettera | 422 | `invalid_request` |
| Forma non disponibile in quella zona (ADR-0025) | 422 | `shape_not_drawable` |
| Zona non in cache e dati OSM non scaricabili | 503 | `map_data_unavailable` |
| Il modello che legge le parole della forma non risponde (`AI.md`) | 503 | `ai_unavailable` |
| Un'immagine senza un contorno chiaro (TASK-073) | 422 | `image_not_usable` |
| Immagine non in base64 o oltre 10 MB; contorno di `/image-route-jobs` non valido | 422 | `invalid_request` |
| Il motore viola le sue regole (ADR-0026) o altro imprevisto | 500 | `engine_error` |
| Indirizzo o metodo sbagliato | 404, 405 | `http_error` |

Forma e codici sono anche nel contratto condiviso con l'app: `ApiError` e
`API_ERROR_CODES` in `shared-types` (ADR-0031). Un codice nuovo va aggiunto
in tutti e due i posti, e i test lo controllano.

I limiti di distanza, forme, parole e attività stanno solo in
`models.py` del route-engine: Pydantic controlla i tipi, il `RouteRequest` del motore i
valori. Per `engine_error` il messaggio è generico e il dettaglio va nel
log dell'API, non al telefono.

## Grafi

L'API non salva i ritagli dei grafi, come invece fa la CLI (ADR-0023): da
3 a 110 MB per ogni partenza nuova avrebbero riempito il disco. Tiene in
memoria gli ultimi 2 grafi di zona e ne ritaglia uno nuovo per ogni
richiesta. Una zona non in cache si scarica e si salva come con la CLI,
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

## Domande ancora aperte

- Motore lento sulle distanze lunghe: 30–45 s da 15 a 30 km, più se lavora
  insieme a un'altra richiesta (`STATUS.md`).
- Zone oltre i 21 km: il download da Overpass supera i minuti che l'app
  aspetta; si ripensa con ADR-0009.
- Autenticazione, limiti di richieste, versione, HTTPS, deploy: fase 4.
- Motore di routing di produzione: ADR-0009, rinviata alla fase 4.
