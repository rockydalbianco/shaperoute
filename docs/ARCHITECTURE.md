# ARCHITECTURE — Struttura e confini

## 1. Principio portante

```
richiesta utente
      │
      ▼
[ services/ai ]        interpreta il linguaggio naturale
      │                 produce SOLO un RouteRequest strutturato
      ▼
[ services/api ]       valida, orchestra, espone REST
      │
      ▼
[ services/route-engine ]   geometria → rete reale → ottimizzazione
      │                      è QUI che nasce il percorso
      ▼
[ services/export ]    GPX e formati wearable
```

L'AI non produce mai coordinate. Se un giorno l'AI venisse rimossa, il
prodotto continuerebbe a funzionare con un form a tendine: questa è la
verifica che il confine sia rispettato.

## 2. Albero del repository

```
apps/
  mobile/              React Native + Expo + TypeScript
  web/                 eventuale, non prima della fase 5
services/
  api/                 FastAPI + Pydantic
  ai/                  interpretazione richieste, provider astratto
  route-engine/        Python puro: geometria, routing, ottimizzazione
  export/              GPX, wearable
packages/
  shared-types/        tipi e schemi condivisi mobile ↔ api
  geometry/            funzioni geometriche riusabili
  config/              configurazioni condivise
docs/
  tasks/               un file per task
tests/                 test end-to-end trasversali
tools/                 script di sviluppo, solo libreria standard (ADR-0024)
.github/               CI e template di Pull Request
```

Le cartelle esistono solo quando servono. Creare in anticipo cartelle vuote
con un README dentro è rumore: si aggiungono al task che le usa per primo.

## 3. Contratto centrale

Tutto il sistema ruota attorno a due oggetti. Vivono in
`packages/shared-types/` e sono la sola cosa che i moduli condividono.

```python
RouteRequest:
    start: (lat, lon)        # punto di partenza
    shape: str               # "circle" | "heart"
    distance_m: int          # distanza target in metri
    activity: str            # "running" (MVP)

RouteResult:
    points: list[(lat, lon)] # traccia finale, chiusa
    distance_m: float        # distanza reale percorsa
    similarity: float        # 0..1, quanto somiglia alla forma
    shape: str
    warnings: list[str]      # es. "rete stradale rada nella zona"
```

Chi modifica questi due oggetti modifica il contratto di tutti: serve una
voce in `DECISIONS.md`.

Oggi esistono in tre copie scritte a mano, con gli stessi nomi dei campi:
le dataclass in `services/route-engine/route_engine/models.py` (ADR-0016),
i modelli Pydantic in `services/api/shaperoute_api/schemas.py` (ADR-0030)
e i tipi TypeScript in `packages/shared-types/src/index.ts`. I JSON di
esempio in `packages/shared-types/fixtures/` le tengono allineate: se una
cambia e le altre no, un test fallisce (ADR-0028). I punti sono
`[lat, lon]`.

Anche il corpo degli errori dell'API, `{"error": {"code", "message"}}`, è
contratto: `ApiError` e i suoi codici in `shared-types`, `ErrorBody`
nell'API, allineati dagli stessi JSON di esempio (ADR-0031). Così pure la
richiesta in due tempi, `RouteJob` con i suoi stati (ADR-0032), che porta
dentro un `RouteResult` o un errore, e `GpxRequest`, richiesta e risultato
insieme per `POST /gpx` (ADR-0033). Da TASK-030, `ShapeReadingRequest` e
`ShapeReading` per `POST /shape-readings`: le parole del riquadro della
forma in ingresso, una forma del catalogo o `null` in uscita (ADR-0012).

L'AI (`services/ai/`, pacchetto `shaperoute_ai`) produce solo il nome di
una forma, non un `RouteRequest` intero: distanza e attività hanno i loro
riquadri (`ROADMAP.md`, fase 3). Il catalogo glielo passa l'API, e l'API
controlla la risposta prima di usarla.

## 4. Regole di dipendenza

- `route-engine` non importa **nulla** da `api` né da `ai`.
- `ai` non importa `route-engine`: non deve poter calcolare percorsi.
  Riceve i nomi delle forme dall'API, come dati.
- `api` è l'unico che conosce entrambi e li mette in fila.
- `mobile` parla solo con `api`, mai direttamente con gli altri servizi.
- `packages/` non importa da `services/`: è il livello più basso.

Una dipendenza che viola queste regole è un errore di progetto, non un
dettaglio da sistemare dopo.

## 5. Perché il route-engine è separato

È il pezzo che decide se il prodotto funziona, ed è l'unico che si può
sviluppare e testare in isolamento totale: nessun server, nessuna chiave
API, nessuna app. Si lancia da riga di comando, produce un GPX, lo si apre
in un visualizzatore e si guarda se sembra un cuore.

Per questo la fase 1 della roadmap lavora **solo** qui. Vedi `ROADMAP.md`.

## 6. Ambienti e segreti

Configurazione via `.env`, mai nel repository. Ogni variabile nuova va
aggiunta a `.env.example` con un valore fittizio e una riga di commento,
nello stesso commit che la introduce.
