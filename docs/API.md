# API — Contratti REST

> Scritto con TASK-022, richieste in due tempi con TASK-025. Le scelte e i
> loro motivi stanno in ADR-0030 e ADR-0032.

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
la CLI). La documentazione interattiva è su `/docs`.

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
  "warnings": ["start moved 250 m south of the requested point, …"]
}
```

La richiesta è sincrona: la risposta arriva quando il percorso è pronto
(tempi sotto). Resta per `/docs`, `curl` e le misure; l'app usa
`/route-jobs`.

## Errori

Ogni errore ha la stessa forma, con un messaggio in inglese come quelli
del motore:

```json
{ "error": { "code": "shape_not_drawable", "message": "a 5 km heart cannot be drawn here: …" } }
```

| Caso | HTTP | `code` |
|---|---|---|
| JSON malformato, campo mancante, in più o fuori limite | 422 | `invalid_request` |
| Forma non disponibile in quella zona (ADR-0025) | 422 | `shape_not_drawable` |
| Zona non in cache e dati OSM non scaricabili | 503 | `map_data_unavailable` |
| Il motore viola le sue regole (ADR-0026) o altro imprevisto | 500 | `engine_error` |
| Indirizzo o metodo sbagliato | 404, 405 | `http_error` |

Forma e codici sono anche nel contratto condiviso con l'app: `ApiError` e
`API_ERROR_CODES` in `shared-types` (ADR-0031). Un codice nuovo va aggiunto
in tutti e due i posti, e i test lo controllano.

I limiti di distanza, forme e attività stanno solo in `models.py` del
route-engine: Pydantic controlla i tipi, il `RouteRequest` del motore i
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

## Domande ancora aperte

- Motore lento sui 15 km: circa 30 s da solo, più se lavora insieme a
  un'altra richiesta (`STATUS.md`).
- Autenticazione, limiti di richieste, versione, HTTPS, deploy: fase 4.
- Motore di routing di produzione: ADR-0009, rinviata alla fase 4.
