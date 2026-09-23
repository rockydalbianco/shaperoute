# TASK-025 — Richieste in due tempi: percorsi lunghi e zone nuove

**Stato**: Done
**Fase**: 2 · **Branch**: `feat/TASK-025-route-jobs`

## Obiettivo

Dall'iPhone un percorso da 15 km, o in una zona non ancora in cache,
arriva sulla mappa invece di fermarsi dopo 60 s: l'app chiede il percorso,
riceve subito un identificativo e poi chiede a che punto è, mostrando se
l'API sta scaricando la mappa o calcolando.

## Contesto da leggere

- `docs/tasks/TASK-023.md` «Limiti misurati» (il problema, con i numeri)
- `docs/API.md` (tutto), `docs/UI.md` «Chiedere un percorso», «Quando non
  va»
- `docs/DECISIONS.md` ADR-0030, ADR-0031
- `docs/ARCHITECTURE.md` §3 (contratto)
- `services/api/shaperoute_api/` (`app.py`, `graphs.py`, `schemas.py`) e
  i suoi test
- `apps/mobile/src/api/routes.ts`, `apps/mobile/src/route/`
  (`useRouteRequest.ts`, `RoutePanel.tsx`, `problems.ts`)
- `packages/shared-types/src/index.ts`, `fixtures/`, `test/`

## Cosa c'è già

- `POST /routes` è sincrona: risponde quando il percorso è pronto. L'app
  smette di aspettare dopo 60 s, circa quando iOS chiuderebbe comunque la
  richiesta (ADR-0031).
- Misurato sull'iPhone (TASK-023): fino a 10 km nelle zone in cache 5–25 s.
  Il 15 km richiede circa 14 s di ritaglio e 50 s di calcolo anche con la
  zona in memoria; una zona nuova 72–100 s solo di download, con il PC
  sull'hotspot. In quei casi l'API finisce il lavoro, ma il telefono non
  c'è più.
- `ZoneGraphs` tiene un solo lucchetto per tutti i grafi: mentre scarica
  una zona, anche le richieste per zone già in memoria aspettano.
- Gli errori hanno codici e forma condivisi (`ApiError`, ADR-0031).

## Cosa fare

1. **Confermato dall'utente il 2026-09-23**: A–H come proposte. La nuova
   ADR si scrive nella PR che implementa.
   - **A. Endpoint.** `POST /route-jobs` con un `RouteRequest` risponde
     subito `202` con `{ "job_id", "status" }`. `GET /route-jobs/{job_id}`
     restituisce lo stato e, quando c'è, il `RouteResult` o l'errore (lo
     stesso `{code, message}` di oggi). `DELETE /route-jobs/{job_id}`
     annulla: una richiesta ancora in coda non parte, una già partita
     finisce ma il risultato si butta. `POST /routes` sincrona **resta**,
     per `/docs`, `curl` e le misure: le due strade chiamano la stessa
     funzione.
   - **B. Stati**: `queued`, `downloading_map` (la zona non è in cache),
     `computing`, `done`, `failed`. Niente percentuale: il motore non sa
     quanto gli manca.
   - **C. Dove girano.** Dentro il processo dell'API, due thread di lavoro;
     le richieste restano in memoria e si dimenticano 10 minuti dopo la
     fine. Riavviare l'API le perde, e va bene finché gira sul PC. Nessuna
     dipendenza nuova (niente Redis, Celery o simili). **Due** thread e non
     uno: così un 15 km annullato, che il PC finisce comunque, non tiene
     ferma la richiesta successiva.
   - **D. Download fuori dal lucchetto.** Un lucchetto per zona invece di
     uno per tutti: scaricare una zona nuova non blocca più le richieste
     per le zone già in memoria.
   - **E. L'app** manda la richiesta e poi chiede lo stato ogni 2 s. Smette
     dopo **5 minuti** (il caso peggiore visto: 100 s di download e 65 s
     di calcolo). Un errore di rete durante l'attesa si riprova 3 volte
     prima di dire «Cannot reach the API». «Cancel» smette di chiedere e
     manda il `DELETE`. Durante l'attesa il pannello dice cosa succede:
     «Waiting for the API…», «Downloading map data for this area…»,
     «Drawing a 15 km heart…», sempre con i secondi.
   - **F. Contratto.** `RouteJob` e gli stati in `shared-types`, con un
     JSON di esempio per ogni forma della risposta (in corso, finito,
     fallito), controllati da `tsc`, dal test di Node e dai modelli
     Pydantic, come ADR-0028 e ADR-0031.
   - **G. Cosa cambia delle decisioni prese.** La nuova ADR supera la
     «richiesta sincrona» di ADR-0031 e il suo limite di 60 s; ADR-0030
     resta, con la nota che `POST /routes` non è più la strada dell'app.
   - **H. Campi liberi per distanza e forma**: l'utente ha chiesto di
     riparlarne qui o in fase 4. Proposta: **non in questo task**, che
     resta sul modo di aspettare. Con le richieste in due tempi la
     distanza libera (1–50 km, un campo numerico) diventa possibile, e può
     essere un task piccolo subito dopo TASK-024. La forma libera resta in
     fase 4, con le forme nuove del motore.
2. **Contratto**: tipi, stati e JSON di esempio in `shared-types`; modelli
   Pydantic e test di allineamento nell'API.
3. **API**: gli endpoint del punto A, i thread del punto C con la pulizia
   dopo 10 minuti, lo stato `downloading_map` (`ZoneGraphs` deve dire
   prima se una zona va scaricata), un lucchetto per zona.
4. **App**: il client del punto E al posto di `requestRoute`, gli stati
   nel pannello, «Cancel» con il `DELETE`, i messaggi aggiornati (5 minuti
   invece di 60 s).
5. **Test** (deterministici, offline):
   - API: una richiesta passa per `queued` → `computing` → `done` con un
     motore finto che aspetta un segnale; `downloading_map` con una sorgente
     finta; ogni `code` d'errore arriva nello stato `failed`; `job_id`
     sconosciuto → 404 `http_error`; `DELETE` di una in coda non la fa
     partire; pulizia dopo 10 minuti con un orologio finto; con due thread,
     una richiesta lunga non ferma una corta; un download non blocca una
     zona già in memoria;
   - app (timer finti): stati mostrati in ordine; risultato sulla mappa;
     errore dal `failed`; 3 errori di rete di fila → «Cannot reach the
     API»; 5 minuti → messaggio di attesa scaduta; «Cancel» manda il
     `DELETE` e torna a «Draw route».
6. **Prova sull'iPhone**, con l'API avviata con `--lan`:
   - cerchio da 15 km a Trento (zona in cache): il percorso arriva, con gli
     stati mostrati; annotare il tempo;
   - una zona non in cache (per esempio cercando «Rovereto»): prima
     «Downloading map data…», poi il percorso, o un messaggio onesto se
     Overpass non risponde; annotare il tempo;
   - «Cancel» durante un 15 km, poi subito un 5 km: il 5 km non aspetta
     la fine del 15.
7. **Documentazione**: `API.md` (endpoint e stati, tempi), `UI.md`
   (attesa e stati), nuova ADR, ADR-0031 aggiornata nello stato,
   `ARCHITECTURE.md` §3 (il contratto si allarga), `STATUS.md`.

## Criteri di accettazione

- [x] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano (96 test nell'app, 6 in
      `shared-types`); in `services/api/` `ruff`, `black --check` e
      `pytest -m "not network"` passano (49 test).
- [x] Rinominare un campo in un JSON di esempio di `RouteJob` fa fallire
      sia `shared-types` sia un test dell'API (provato a mano: `job_id` →
      `id` in `route-job-running.json`).
- [x] Ogni riga del punto 5 ha il suo test.
- [x] Sull'iPhone: il cerchio da 15 km a Trento arriva sulla mappa in
      circa 30 s (prova dell'utente del 2026-09-23). Prima sforava sempre.
- [x] Sull'iPhone: una zona nuova (Rovereto) finisce in un messaggio
      onesto, «Map data for this area could not be downloaded», con il
      motivo: connessione a `overpass-api.de` scaduta dopo 180 s. È il
      problema di rete di questo PC annotato in `MAPS.md`: il DNS dà
      l'indirizzo 65.109.112.52, che da qui non risponde, mentre l'altro
      (162.55.144.139) si collega in 0,08 s (verificato lo stesso giorno).
      Deciso con l'utente: resta una nota, niente task.
- [x] Sull'iPhone: dopo «Cancel» su un 15 km, un 5 km arriva senza
      aspettare la fine del 15 (provato dall'utente).
- [x] `POST /routes` sincrona funziona come prima (test, e i 29 test di
      TASK-022 passano senza modifiche).
- [ ] I job `mobile`, `api` e `route-engine` della CI sono verdi sulla PR
      (si spunta quando la PR è aperta e la CI ha girato).
- [x] ADR-0032, ADR-0030 e ADR-0031 annotate; `API.md`, `UI.md`,
      `ARCHITECTURE.md`, `TESTING.md`, `STATUS.md` aggiornati.

Differenze dal piano: la traduzione da eccezione a `{code, message}` sta in
`errors.py`, usata sia da `POST /routes` sia dai job. Una richiesta
annullata mentre carica il grafo si ferma prima di calcolare (il motore
carica il grafo una volta sola, all'inizio): risparmia il calcolo, non il
download. Prova col motore vero sul PC, prima del telefono (API di prova
sulla porta 8001, perché la 8000 era occupata dall'API della prova di
TASK-023): cerchio da 15 km a Trento accettato subito e pronto in 31 s; un
5 km chiesto dopo aver annullato un 15 km in download pronto in 18 s. Il
15 km annullato ha comunque scaricato e salvato la sua zona (40 MB).

## File toccati

```
packages/shared-types/src/index.ts
packages/shared-types/fixtures/route-job-*.json
packages/shared-types/test/contract.test.ts
services/api/shaperoute_api/**
services/api/tests/**
apps/mobile/src/api/**
apps/mobile/src/route/**
apps/mobile/App.tsx                         (se serve)
apps/mobile/__tests__/App.test.tsx
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/ARCHITECTURE.md
docs/STATUS.md
docs/tasks/TASK-025.md
```

## Fuori scope

- Rendere il motore più veloce: il 15 km resta sui 65 s, oltre i 30 s di
  `PRODUCT.md` (annotato in `STATUS.md`, da affrontare a parte).
- Interrompere davvero un calcolo già partito (processi separati, kill).
- Richieste che sopravvivono a un riavvio dell'API, più processi, code
  esterne come Redis o Celery: con l'hosting, in fase 4.
- Notifiche push, WebSocket o eventi dal server: chiedere ogni 2 s basta.
- Una percentuale di avanzamento del calcolo.
- Campi liberi per distanza e forma (punto H).
- Dati OSM senza Overpass per ogni zona nuova: ADR-0009, fase 4.
- Export GPX (TASK-024).

## Esito

Dall'iPhone un 15 km a Trento arriva in circa 30 s invece di scadere, e
l'attesa dice se l'API scarica la mappa o calcola; «Cancel» libera subito
il posto per la richiesta dopo. Emerso: le zone nuove dipendono
dall'indirizzo di Overpass che il DNS dà a questo PC, e uno dei due non
risponde (`MAPS.md`), annotato senza task; una zona annullata durante il
download si salva comunque (circa 40 MB). Il motore resta sui 30 s per
15 km, il limite dell'MVP (`STATUS.md`).
