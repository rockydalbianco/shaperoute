# TASK-024 — Export e condivisione GPX dal telefono

**Stato**: Done
**Fase**: 2 · **Branch**: `feat/TASK-024-gpx-export`

## Obiettivo

Dopo aver disegnato un percorso, l'utente tocca «Export GPX» e il foglio
di condivisione di iOS gli offre il file: lo salva in File, lo manda per
AirDrop o lo apre nell'app con cui corre. Il GPX porta l'attribuzione di
OpenStreetMap, e un'app vera per la corsa lo apre e mostra il percorso.

## Contesto da leggere

- `docs/GPX.md` (tutto), `docs/PRODUCT.md` «Che cosa deve fare il MVP»,
  punto 6
- `docs/DECISIONS.md` ADR-0014, ADR-0015, ADR-0019, ADR-0031, ADR-0032
- `docs/MAPS.md` «Ancora aperto» (attribuzione nel GPX)
- `docs/API.md` «Endpoint»; `docs/UI.md` «Il risultato»
- `services/route-engine/route_engine/export_gpx.py` e i suoi test
- `services/api/shaperoute_api/` (`app.py`, `schemas.py`)
- `apps/mobile/src/route/` (`RoutePanel.tsx`, `useRouteRequest.ts`),
  `apps/mobile/src/api/`
- `packages/shared-types/src/index.ts`, `fixtures/`

## Cosa c'è già

- Il GPX lo scrive solo il motore, per la CLI: `to_gpx(points, name, when)`
  e `route_name(shape, distance_m, when)` in `export_gpx.py`, GPX 1.1 con un
  solo track, 7 decimali, niente quote né tempi per punto (`GPX.md`).
- L'app, a percorso pronto, ha sia il `RouteRequest` sia il `RouteResult`
  (`useRouteRequest`, stato `done`). Le richieste restano nell'API solo 10
  minuti dopo la fine (ADR-0032).
- Il GPX non ha ancora l'attribuzione di OpenStreetMap (`MAPS.md`) e non è
  mai stato aperto in Garmin, Strava o Komoot (`GPX.md`, «Non ancora
  verificato»).
- Expo Go contiene `expo-file-system` (~57.0.7) ed `expo-sharing`
  (~57.0.21); l'app non li dichiara.

## Cosa fare

1. **Confermato dall'utente il 2026-09-23**: A–E come proposte. La nuova
   ADR si scrive nella PR che implementa.
   - **A. Chi scrive il GPX: l'API, con il codice del motore.** Nuovo
     endpoint `POST /gpx` che riceve `{ "request": RouteRequest, "result":
     RouteResult }` e risponde il GPX (`application/gpx+xml`, con il nome
     del file). Un solo scrittore di GPX, quello già provato dalla CLI e dai
     campioni. L'endpoint non ricorda niente, quindi funziona anche dopo i
     10 minuti di vita di una richiesta. Il corpo è un tipo nuovo del
     contratto, `GpxRequest`, con il suo JSON di esempio come gli altri.
     - Scartati: scrivere il GPX nell'app, cioè un secondo scrittore da
       tenere allineato al primo; mettere il GPX dentro ogni `RouteJob`
       finito, che appesantirebbe tutte le risposte per un file che non
       tutti vogliono.
   - **B. Sul telefono**: il GPX si salva nella cartella temporanea
     dell'app con `expo-file-system` e si apre il foglio di condivisione di
     iOS con `expo-sharing`: File, AirDrop, Mail, le app di corsa.
     Dipendenze nuove, tutte e due MIT e già dentro Expo Go. Nome del file
     `shaperoute-heart-5km-2026-09-23.gpx`: senza spazi né caratteri
     strani, perché alcune app li rifiutano.
   - **C. Attribuzione OSM nel GPX**, nei metadati: `<copyright
     author="OpenStreetMap contributors">` con la licenza ODbL e un `<link>`
     a `https://www.openstreetmap.org/copyright`. Il percorso nasce da dati
     OSM, e la licenza chiede di dirlo dove il dato viaggia. Cambia il GPX
     anche della CLI: i campioni nuovi lo avranno, i vecchi restano come
     sono (ADR-0014).
   - **D. Nell'app**: sotto il risultato, un pulsante «Export GPX». Mentre
     l'API prepara il file dice «Preparing GPX…». Se l'utente chiude il
     foglio senza scegliere, non succede niente. Gli errori usano i
     messaggi che ci sono già (API non raggiungibile, bug).
   - **E. `services/export/`**: il GPX resta nel motore, niente cartella
     nuova. `GPX.md` rimandava la scelta alla fase 2 «insieme ai formati
     wearable», e i formati wearable (FIT, TCX) non sono in questo task.
2. **Motore**: attribuzione nel GPX, con i test di `export_gpx.py`.
3. **Contratto**: `GpxRequest` e il suo JSON di esempio in `shared-types`,
   il modello Pydantic nell'API, i test di allineamento.
4. **API**: `POST /gpx` con `to_gpx` e `route_name` del motore; nome del
   file nell'intestazione; `422 invalid_request` se il corpo non va.
5. **App**: client per `POST /gpx`, file nella cartella temporanea,
   foglio di condivisione, pulsante e stati del punto D.
6. **Test** (deterministici, offline):
   - motore: il GPX ha `copyright` e `link` nell'ordine voluto da GPX 1.1
     (`name`, `author`, `copyright`, `link`, `time`), e il resto non cambia;
   - API: il GPX restituito ha un punto per ogni punto del risultato, con 7
     decimali, il nome e l'attribuzione; intestazioni giuste; corpo non
     valido → 422;
   - app (`expo-file-system` ed `expo-sharing` finti): il pulsante c'è solo
     con un percorso; manda richiesta e risultato; scrive il file con il
     nome giusto; apre il foglio; gli errori hanno il loro messaggio.
7. **Prova sull'iPhone** con l'API avviata con `--lan`:
   - disegnare un percorso da una zona in cache, «Export GPX», «Salva su
     File»: il file c'è, con il nome giusto;
   - aprire lo stesso GPX nell'app o nel sito con cui l'utente corre (per
     esempio Garmin Connect): il percorso compare con la forma e la
     distanza giuste. È la prima prova su un'app vera (`GPX.md`).
8. **Documentazione**: `GPX.md` (attribuzione, uso dall'app, esito della
   prova su un'app vera), `API.md` (`POST /gpx`), `UI.md` (export), nuova
   ADR, `MAPS.md` «Ancora aperto», `ARCHITECTURE.md` §3 (il contratto si
   allarga), `STATUS.md`.

## Criteri di accettazione

- [x] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano (110 test nell'app, 7 in
      `shared-types`); in `services/api/` (54 test) e in
      `services/route-engine/` (132 test) `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [x] Rinominare un campo nel JSON di esempio di `GpxRequest` fa fallire sia
      `shared-types` sia un test dell'API (provato a mano: `result` →
      `route`, 3 errori di `tsc` e 4 test dell'API).
- [x] Il GPX di `POST /gpx` e quello della CLI per lo stesso percorso sono
      uguali, a parte l'ora di creazione (test, con l'orologio dell'API
      fissato).
- [x] Sull'iPhone il file arriva in File con il nome giusto (provato
      dall'utente il 2026-09-23).
- [x] Il GPX si apre in un'app o in un sito per la corsa e mostra il
      percorso: **Garmin Connect** lo apre (prova dell'utente del
      2026-09-23); annotato in `GPX.md`.
- [x] I job `mobile`, `api` e `route-engine` della CI sono verdi sulla PR
      (PR #31, già mergiata; la chiusura del task va in una PR a parte).
- [x] ADR-0033; `GPX.md`, `API.md`, `UI.md`, `MAPS.md`, `ARCHITECTURE.md`,
      `STATUS.md` aggiornati.

Differenze dal piano: `expo install` ha aggiunto il plugin di
`expo-sharing` in `apps/mobile/app.json`, che non era fra i file previsti.
L'app prende il nome del file dall'intestazione dell'API e lo accetta solo
se è un semplice `*.gpx`, altrimenti usa `shaperoute.gpx`. Due messaggi
nuovi per il telefono: niente foglio di condivisione, file non salvato.

## File toccati

```
services/route-engine/route_engine/export_gpx.py
services/route-engine/tests/test_export_gpx.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/gpx-request.json
packages/shared-types/test/contract.test.ts
services/api/shaperoute_api/**
services/api/tests/**
apps/mobile/package.json
package-lock.json
apps/mobile/src/api/**
apps/mobile/src/route/**
apps/mobile/__tests__/App.test.tsx
docs/GPX.md
docs/API.md
docs/UI.md
docs/MAPS.md
docs/ARCHITECTURE.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-024.md
```

## Fuori scope

- Formati per orologi (FIT, TCX) e l'invio diretto a Garmin, Strava o
  Komoot con i loro account: fase 5, «sincronizzazione smartwatch».
- Salvare i percorsi nell'app, cronologia, preferiti.
- Quote altimetriche, indicazioni di svolta, waypoint nel GPX.
- Nome del percorso scelto dall'utente.
- Spostare l'export in `services/export/` (punto E).
- Distanza libera (TASK-026).

## Esito

Dal telefono «Export GPX» apre il foglio di condivisione con il file
scritto dall'export del motore, lo stesso della CLI, e Garmin Connect lo
apre: è la prima prova su un'app vera. Ogni GPX porta ora l'attribuzione di
OpenStreetMap. Strava e Komoot non sono stati provati (`GPX.md`).
