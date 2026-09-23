# TASK-022 — API FastAPI che espone il route-engine

**Stato**: Todo
**Fase**: 2 · **Branch**: `feat/TASK-022-api`

## Obiettivo

Sul PC gira un'API che riceve un `RouteRequest` e restituisce il
`RouteResult` del route-engine, o un errore con un codice che l'app potrà
spiegare; dall'iPhone, sulla stessa Wi-Fi, l'API risponde. Lint e test
girano in locale e in CI, senza rete.

## Contesto da leggere

- `docs/API.md` (stub: si scrive qui)
- `docs/ARCHITECTURE.md` §2, §3 (contratto), §4 (dipendenze), §6
- `docs/DECISIONS.md` ADR-0009 (aperta), ADR-0016, ADR-0020, ADR-0023,
  ADR-0025 (forma non disponibile), ADR-0026 (errore del motore),
  ADR-0028, ADR-0029
- `docs/TESTING.md` «Test automatici» e «CI»
- `docs/SETUP.md` passo 9 (Wi-Fi e firewall per il telefono)
- `services/route-engine/route_engine/__main__.py` (come la CLI chiama il
  motore), `models.py`, `optimizer.py` (`plan_route`), `network.py`
  (`OsmnxSource`)
- `packages/shared-types/fixtures/`

## Cosa c'è già

- Il motore ha un solo ingresso, `plan_route(request, source)`: riceve un
  `RouteRequest` e un `GraphLoader` e restituisce un `Plan` con il
  `RouteResult`. Gli errori sono `InvalidRequestError` (campo fuori
  limite), `ShapeNotDrawableError` (forma non disponibile, con il motivo) e
  `InvalidRouteError` (il motore ha violato le sue regole).
- `OsmnxSource` scarica un grafo per zona (ADR-0023) e **salva anche ogni
  ritaglio**, in GraphML e pickle: da 3 a 110 MB per ogni partenza nuova.
  Oggi `data/cache/` pesa 1,4 GB e sul disco C: restano 1,8 GB: un'API che
  salvasse un ritaglio per ogni richiesta riempirebbe il disco.
- Dalla cache un caso richiede 3–40 s (ADR-0025); leggere un GraphML di
  zona fino a un minuto, il pickle accanto molto meno.
- `services/api/` non esiste. Il route-engine si installa in
  `services/route-engine/.venv`. `OSM_CACHE_DIR` in `.env.example` non lo
  legge nessuno.

## Cosa fare

1. **Confermato dall'utente il 2026-09-23**: A–H come proposte. La nuova
   ADR si scrive nella PR che implementa.
   - **A. Pacchetto.** `services/api/`, pacchetto Python `shaperoute_api`,
     Python 3.11 come il motore, stesse regole di `ruff` e `black`.
     Dipendenze nuove: **FastAPI** (MIT) e **uvicorn** (BSD-3); per i test
     **httpx** (BSD-3), che serve a `TestClient`. Pydantic arriva con
     FastAPI. Il motore si installa accanto, nello stesso ambiente:
     `pip install -e ../route-engine -e ".[dev]"` in
     `services/api/.venv`. Si avvia con `python -m shaperoute_api`: solo
     sul PC per default (`127.0.0.1:8000`), con `--lan` aperto alla Wi-Fi
     e con l'indirizzo da scrivere sul telefono stampato a schermo.
     `--cache-dir` come la CLI (default `data/cache`, dalla radice), niente
     variabili d'ambiente.
   - **B. Endpoint.** `GET /health` → `{"status": "ok"}`; `POST /routes`
     con un `RouteRequest` e risposta `RouteResult`, **stessi campi di
     `shared-types`** (`start` come `[lat, lon]`, `distance_m`,
     snake_case), senza cambiare il contratto. Documentazione automatica di
     FastAPI su `/docs`. Nessun prefisso di versione, nessuna
     autenticazione, nessun CORS (l'app è nativa, non una pagina web): si
     decidono con hosting e account (ADR-0013, fase 4).
   - **C. Errori**, tutti nella forma `{"error": {"code", "message"}}`, con
     messaggi in inglese come quelli del motore:

     | Caso | HTTP | `code` |
     |---|---|---|
     | JSON malformato, campo mancante o fuori limite | 422 | `invalid_request` |
     | Forma non disponibile in quella zona (ADR-0025) | 422 | `shape_not_drawable` |
     | Dati OSM da scaricare e Overpass non risponde | 503 | `map_data_unavailable` |
     | Il motore viola le sue regole (ADR-0026) o altro imprevisto | 500 | `engine_error` |

     I limiti (distanze, forme, attività) restano **solo** in `models.py`:
     Pydantic controlla i tipi, il `RouteRequest` del motore i valori.
   - **D. Tempi.** Richiesta sincrona: l'API risponde quando il percorso è
     pronto. Si misurano i tempi veri (punto 6). Se nella prova dal
     telefono una richiesta supera quanto il telefono è disposto ad
     aspettare (su iOS una richiesta ferma viene chiusa, tipicamente dopo
     60 s), il passaggio a richieste in due tempi si decide con TASK-023.
   - **E. Grafi.** L'API **non salva i ritagli**: tiene in memoria i grafi
     di zona usati di recente (al massimo 2) e ritaglia in memoria. Le zone
     nuove si scaricano e si salvano come oggi. Nel route-engine cambia una
     sola cosa: la lettura di un grafo in cache (`_read_graph`) diventa
     pubblica. La CLI resta com'è.
   - **F. Contratto e tipi.** Modelli Pydantic dell'API con gli stessi nomi
     dei campi; un test dell'API legge i JSON di esempio di
     `packages/shared-types/fixtures/` con quei modelli, come già fanno
     `tsc` e `test_contract.py`. Così dataclass, Pydantic e TypeScript
     restano allineati dagli stessi file. **Niente tipi generati
     dall'OpenAPI** (lasciato aperto da ADR-0028): con due oggetti un
     generatore costa più di quanto risparmia.
   - **G. Motore di routing di produzione** (ADR-0009, «da decidere entro
     TASK-022»): **rinviarlo alla fase 4**, con hosting e database
     (ADR-0013). L'MVP resta su OSMnx dentro l'API. OSRM, GraphHopper e
     Valhalla sono server da far girare a parte (Docker o Java) e non
     conoscono zone e corridoio: adottarli vuol dire riscrivere lo
     snapping. Meglio decidere con i tempi misurati in uso vero.
   - **H. CI**: nuovo job `api` (Python 3.11, installa motore e API,
     `ruff`, `black --check`, `pytest -m "not network"`). Il controllo si
     aggiunge a mano alle regole di `main` dopo il primo giro.
2. **Pacchetto** `services/api/`: `pyproject.toml`, l'app FastAPI, i
   modelli Pydantic, l'avvio da riga di comando.
3. **Grafi**: il `GraphLoader` dell'API del punto E, con un lucchetto se
   due richieste arrivano insieme.
4. **Endpoint ed errori** come ai punti B e C; ogni richiesta scrive nel
   log forma, distanza, durata, e se il grafo veniva dalla memoria, dal
   disco o dalla rete.
5. **Test** (pytest, offline, deterministici):
   - `POST /routes` da capo a fondo sul grafo piccolo di Levico già in
     `services/route-engine/tests/fixtures/`: un caso solo, perché ognuno
     costa circa 5 s (provato il 2026-09-23: cerchio da 1,5 km a Levico,
     1579 m, somiglianza 0,69, con un warning);
   - ogni riga della tabella degli errori, con un motore finto;
   - i JSON di esempio di `shared-types` letti dai modelli Pydantic; la
     risposta di `/routes` ha esattamente i campi di `RouteResult`;
   - grafi: due richieste nella stessa zona leggono il file una volta; una
     terza zona toglie dalla memoria la più vecchia; nella cartella della
     cache non viene scritto nessun ritaglio.
6. **Prova sul PC e dal telefono**: con `--lan`, da Safari sull'iPhone
   `http://<indirizzo-del-PC>:8000/health`. Da `/docs` (o `curl`) si
   misurano cuore e cerchio da 5 km a Trento e a Levico, prima e seconda
   richiesta, e i tempi vanno in `API.md`.
7. **Documentazione**: `API.md` (endpoint, errori, tempi, come si avvia);
   nuova ADR con le scelte del punto 1, ADR-0009 aggiornata;
   `SETUP.md` (installare e avviare l'API, firewall di Windows);
   `TESTING.md` (test dell'API); `ARCHITECTURE.md` se serve;
   `INDEX.md` (stato di `API.md`); `STATUS.md`.

## Criteri di accettazione

- [ ] In `services/api/`, `ruff check .`, `black --check .` e
      `pytest -m "not network"` passano, senza rete.
- [ ] `POST /routes` con un `RouteRequest` valido sul grafo di prova
      restituisce un `RouteResult` con gli stessi campi di `shared-types`.
- [ ] Ogni caso della tabella degli errori ha il suo status, il suo
      `code` e un messaggio, provato da un test.
- [ ] Rinominare un campo in un JSON di esempio di `shared-types` fa
      fallire anche un test dell'API (provato a mano).
- [ ] Richieste ripetute su partenze diverse della stessa zona non
      scrivono nuovi file in `data/cache/` (test, e controllato a mano).
- [ ] Dall'iPhone, sulla stessa Wi-Fi, `/health` risponde
      `{"status": "ok"}`.
- [ ] Tempi dei quattro casi del punto 6 scritti in `API.md`.
- [ ] `services/route-engine`: i test passano come prima, la CLI funziona
      come prima e non importa nulla dall'API.
- [ ] I job `api`, `route-engine` e `mobile` della CI sono verdi sulla PR.
- [ ] Nuova ADR, ADR-0009 aggiornata; `API.md`, `SETUP.md`, `TESTING.md`,
      `INDEX.md`, `STATUS.md` aggiornati.

## File toccati

```
services/api/**
services/route-engine/route_engine/network.py   (solo read_graph pubblica)
.github/workflows/ci.yml
docs/API.md
docs/DECISIONS.md
docs/SETUP.md
docs/TESTING.md
docs/INDEX.md
docs/ARCHITECTURE.md                            (se serve)
docs/STATUS.md
docs/tasks/TASK-022.md
```

## Fuori scope

- L'app che chiama l'API, l'indirizzo dell'API nell'app, l'attesa sullo
  schermo, il percorso sulla mappa (TASK-023).
- Richieste in due tempi (accetta e poi chiedi), avanzamento in diretta:
  solo se TASK-023 ne ha bisogno (punto D).
- Scegliere fra più percorsi alternativi (la ricerca li ha già, nota in
  `STATUS.md`).
- Export GPX dall'API (TASK-024).
- Autenticazione, limiti di richieste, HTTPS, deploy, Docker (fase 4).
- Tile e ricerca del luogo dietro l'API (ADR-0029): servono solo con molti
  utenti.
- Cambiare algoritmi o soglie del motore, scegliere il motore di routing
  di produzione (ADR-0009), evitare scale e strade principali, dichiarare
  `numpy` in `pyproject.toml`.
- Pulire i ritagli già salvati in `data/cache/`: si può fare a mano, ma non
  in questo task.

## Esito

*(si compila a fine task)*
