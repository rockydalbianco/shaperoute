# TASK-023 — Collegamento app ↔ API, anteprima percorso

**Stato**: Done
**Fase**: 2 · **Branch**: `feat/TASK-023-app-api`

## Obiettivo

Sull'iPhone, con Expo Go e l'API avviata sul PC, l'utente sceglie forma e
distanza, chiede il percorso e lo vede disegnato sulla mappa con la
distanza reale e gli avvisi del motore; mentre aspetta sa cosa succede e
può annullare, e ogni errore ha un messaggio che dice cosa fare.

## Contesto da leggere

- `docs/UI.md` (tutto: si completa qui), `docs/API.md` «Endpoint»,
  «Errori», «Tempi»
- `docs/PRODUCT.md` «Che cosa deve fare il MVP», «Vincoli di qualità»
- `docs/DECISIONS.md` ADR-0028, ADR-0029, ADR-0030
- `docs/ARCHITECTURE.md` §3 (contratto), §4
- `docs/TESTING.md` «Test automatici»; `docs/SETUP.md` passi 9 e 10
- `apps/mobile/App.tsx`, `apps/mobile/src/map/` (`mapPage.ts`,
  `messages.ts`, `MapView.tsx`)
- `packages/shared-types/src/index.ts`, `test/contract.test.ts`;
  `services/api/shaperoute_api/schemas.py` (`ErrorBody`),
  `services/api/tests/test_contract.py`

## Cosa c'è già

- App (TASK-021): una schermata con la partenza `{ point, source }` presa
  dal GPS o da una ricerca; la pagina della mappa conosce solo
  `setPosition`; le forme si vedono ma non si possono toccare.
- API (TASK-022): `POST /routes` sincrona, errori
  `{"error": {"code", "message"}}`, avvio con `--lan`, `/health` raggiunto
  dall'iPhone. Tempi misurati sul PC: 7–32 s per 5 km, anche con una
  partenza nuova.
- `shared-types` ha `RouteRequest`, `RouteResult`, forme e limiti; il corpo
  degli errori esiste solo in Pydantic (`ErrorBody`).
- `expo-constants` 57.0.19 è già installato come dipendenza di `expo`, ma
  l'app non lo dichiara.
- Gli avvisi del motore sono frasi libere in inglese; il motore può
  spostare la partenza fino a 500 m e lo dice in un avviso (ADR-0025).

## Cosa fare

1. **Confermato dall'utente il 2026-09-23**: A–G come proposte, per
   questa prima fase (vedi il primo punto di «Fuori scope»). La nuova ADR
   si scrive nella PR che implementa.
   - **A. Indirizzo dell'API.** L'app lo ricava dal server di sviluppo di
     Expo, che il telefono già raggiunge per scaricare l'app:
     `Constants.expoConfig.hostUri` (per esempio `192.168.1.23:8081`) →
     `http://192.168.1.23:8000`. Nessun indirizzo da scrivere a mano.
     Dipendenza nuova dichiarata: `expo-constants` (~57.0.19, MIT, dentro
     Expo Go). Vale per lo sviluppo; l'indirizzo di produzione arriva con
     l'hosting (fase 4).
   - **B. Forma e distanza.** Nella barra in basso, al posto dell'elenco
     fisso: forme `circle` e `heart` e distanze **3, 5, 10, 15 km**, tutte
     da toccare; di partenza cuore e 5 km. Attività fissa (`running`), non
     mostrata. Distanze fisse e non libere perché sono quelle con tempi
     conosciuti (5 e 15 km sono i casi di riferimento).
   - **C. Richiesta e attesa.** Pulsante «Draw route», attivo solo con una
     partenza e senza un'altra richiesta in corso. **Richiesta sincrona,
     niente richieste in due tempi**: i tempi misurati (7–32 s) stanno
     sotto i circa 60 s dopo cui iOS chiude una richiesta ferma. Durante
     l'attesa: «Drawing a 5 km heart… 12 s», con i secondi che passano, e
     «Cancel». L'app smette di aspettare dopo 60 s. Una partenza, una
     forma o una distanza nuove tolgono il percorso vecchio. Annullare
     interrompe l'attesa nell'app; il PC finisce comunque il calcolo e il
     risultato si butta.
   - **D. Percorso sulla mappa.** Messaggi nuovi per la pagina,
     `showRoute` (punti già in `[lon, lat]`, convertiti da `toLngLat`) e
     `clearRoute`; linea ben visibile sopra le strade, mappa inquadrata sul
     percorso. Il segnaposto resta sulla partenza chiesta: se il motore la
     sposta, lo dice l'avviso.
   - **E. Risultato.** «5.2 km on roads (target 5 km)» e gli avvisi del
     motore **così come sono**, in inglese. La somiglianza non si mostra
     come numero: `PRODUCT.md` dice che la forma la giudica l'occhio, e
     sotto 0,90 il motore aggiunge già un avviso. Riscrivere gli avvisi in
     parole più semplici chiederebbe dei codici nel contratto: dopo.
   - **F. Errori**, un messaggio per caso, con sotto il testo dell'API
     quando aiuta:

     | Caso | Messaggio (inglese, come l'app) |
     |---|---|
     | `shape_not_drawable` | This shape does not fit the roads here. Try another distance, shape or start. |
     | `map_data_unavailable` | Map data for this area could not be downloaded. Try again later. |
     | `engine_error` | The route engine failed. Try again; if it happens again, look at the API log. |
     | `invalid_request`, `http_error`, risposta illeggibile | The app and the API do not agree (a bug): … |
     | API non raggiungibile | Cannot reach the API at http://…:8000. Start it on the PC with --lan, on the same Wi-Fi. |
     | Nessuna risposta in 60 s | No answer within a minute. The API may be downloading map data for a new area: try again shortly. |

   - **G. Contratto.** Il corpo degli errori entra in `shared-types`
     (`ApiError`, `API_ERROR_CODES`) con un JSON di esempio
     `fixtures/api-error.json`, controllato da `tsc` e dal test di Node da
     un lato, dall'`ErrorBody` dell'API dall'altro: lo stesso metodo di
     `RouteRequest` e `RouteResult` (ADR-0028, ADR-0030).
2. **`shared-types`**: `ApiError`, i codici e il JSON di esempio, con i
   loro test; il test di contratto dell'API legge lo stesso JSON.
3. **Client dell'API** (`apps/mobile/src/api/`): l'indirizzo del punto A e
   una funzione che manda un `RouteRequest` e restituisce il
   `RouteResult` oppure uno dei casi del punto F, con il limite di 60 s e
   la possibilità di annullare.
4. **Pagina della mappa**: `showRoute` e `clearRoute` come al punto D.
5. **Schermata**: forma e distanza, pulsante, attesa, risultato, errori.
   Resta una schermata sola, senza libreria di navigazione.
6. **Test** (Jest, offline, deterministici; `fetch`, WebView e posizione
   finti come in TASK-021):
   - indirizzo: da `hostUri` all'URL dell'API; senza `hostUri`, messaggio
     chiaro invece di un indirizzo inventato;
   - client: risposta 200 → `RouteResult` (dal JSON di esempio di
     `shared-types`); ogni `code` del JSON di errore; rete giù; nessuna
     risposta in 60 s (timer finti); annullamento;
   - pagina: `showRoute` con un punto asimmetrico arriva in `[lon, lat]`;
   - schermata: il pulsante è spento senza partenza; la richiesta porta
     forma, distanza in metri e partenza scelte; attesa con i secondi e
     «Cancel»; risultato con distanza e avvisi; ogni caso della tabella F
     mostra il suo messaggio; una partenza nuova toglie il percorso.
7. **Prova sull'iPhone**, con l'API avviata con `--lan`:
   - posizione negata, ricerca «Piazza Duomo, Trento», cuore da 5 km: il
     percorso compare sulla mappa con distanza e avvisi (zona già in
     cache); annotare il tempo visto sul telefono;
   - cerchio da 3 km dallo stesso punto;
   - «Cancel» durante l'attesa: la schermata torna utilizzabile;
   - API spenta: messaggio «Cannot reach the API…» con l'indirizzo;
   - con il GPS, da dove si trova l'utente: qualunque cosa succeda
     (percorso, `map_data_unavailable`, nessuna risposta in 60 s se la zona
     va scaricata) si annota nel task così com'è.
   **Da verificare per primo**: che iOS lasci passare una richiesta
   `http://` verso il PC da Expo Go. Se la blocca, ci si ferma e si torna a
   chiedere.
8. **Documentazione**: `UI.md` (forma e distanza, attesa, risultato,
   errori; in «Cosa esce dal telefono» la partenza, che ora va all'API sul
   PC), nuova ADR con le scelte del punto 1, `ARCHITECTURE.md` §3 (il corpo
   degli errori nel contratto), `API.md` se cambia qualcosa, `SETUP.md`
   (prova completa: API con `--lan` e app insieme), `TESTING.md`,
   `STATUS.md`.

## Criteri di accettazione

- [x] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano (97 test nell'app, 5 in
      `shared-types`); in `services/api/` `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [x] Rinominare un campo in `fixtures/api-error.json` fa fallire sia i
      controlli di `shared-types` sia un test dell'API (provato a mano:
      `message` → `text`, un errore di `tsc` e un test dell'API).
- [x] Ogni riga della tabella F ha il suo messaggio sullo schermo, provato
      da un test.
- [x] Scambiare lat e lon nei punti del percorso fa fallire un test
      (provato a mano: 3 test cadono).
- [x] Sull'iPhone: dalla ricerca «Piazza Duomo, Trento», cuore e cerchio
      compaiono sulla mappa con la distanza reale e gli avvisi. Tempi dal
      log dell'API, prova dell'utente del 2026-09-23: 5–25 s per 3, 5 e
      10 km a Trento.
- [x] Sull'iPhone: «Cancel» ferma l'attesa; con l'API spenta compare il
      messaggio con l'indirizzo (provato dall'utente).
- [x] Sull'iPhone, con il GPS e nelle altre zone: esito annotato sotto,
      «Limiti misurati».
- [x] I job `mobile`, `api` e `route-engine` della CI sono verdi sulla PR
      (PR #27).

### Limiti misurati sull'iPhone

Dal log dell'API durante la prova, con il PC collegato all'hotspot
dell'iPhone (le richieste arrivano da `172.20.10.1`), quindi con i
download sui dati mobili:

- **15 km non sta mai nei 60 s**, né a Trento né altrove. Anche con la zona
  già in memoria servono circa 14 s per ritagliare il grafo e circa 50 s di
  calcolo (cerchio 15 km a Trento: 64 s al secondo tentativo, 122,5 s al
  primo con il download). L'API finisce il calcolo, ma il telefono ha già
  smesso di aspettare e mostra «No answer within a minute…».
- **Le zone nuove** chiedono 72–100 s solo per scaricare i dati OSM: la
  prima richiesta in una zona nuova sfora anche a 5–10 km (cuore 10 km
  vicino a Levico: 88,6 s di download più 7 s di calcolo). Il tentativo
  dopo trova la zona in cache e riesce, fino a 10 km.
- Un download da Overpass è fallito dopo 22 s: 503 `map_data_unavailable`,
  con il suo messaggio.
- Mentre l'API scarica una zona, le altre richieste aspettano il lucchetto
  dei grafi (un cuore da 5 km ha atteso 8,8 s).

Deciso con l'utente: TASK-023 si chiude qui e le richieste in due tempi
diventano TASK-025, prima di TASK-024 (`ROADMAP.md`).
- [x] ADR-0031; `UI.md`, `ARCHITECTURE.md` (tre copie del contratto e
      il corpo degli errori), `API.md`, `SETUP.md` (passo 10.1),
      `TESTING.md`, `STATUS.md` aggiornati.

Differenze dal piano: i codici degli errori hanno un secondo JSON di
esempio, `api-error-codes.json`, letto da `shared-types` e dall'API. C'è un
messaggio in più, per quando l'app non conosce l'indirizzo dell'API.
«My position» è salito nel pannello in alto, per lasciare in basso forma e
distanza. Forma e distanza non si cambiano durante l'attesa. Prima della
prova sul telefono la pagina è stata guardata in Edge headless con un
percorso vero dell'API (cuore da 5 km a Trento): linea sopra le strade,
mappa inquadrata, segnaposto sulla partenza.

## File toccati

```
packages/shared-types/src/index.ts
packages/shared-types/fixtures/api-error.json
packages/shared-types/test/contract.test.ts
services/api/tests/test_contract.py
apps/mobile/App.tsx
apps/mobile/package.json
apps/mobile/src/api/**
apps/mobile/src/map/**
apps/mobile/src/**                          (nuovi componenti della schermata)
apps/mobile/__tests__/App.test.tsx
package-lock.json
docs/UI.md
docs/DECISIONS.md
docs/ARCHITECTURE.md
docs/API.md                                 (se serve)
docs/SETUP.md
docs/TESTING.md
docs/STATUS.md
docs/tasks/TASK-023.md
```

## Fuori scope

- **Campi liberi per distanza e forma** al posto dei pulsanti, per ogni
  distanza e ogni forma che l'utente chiede: richiesta dell'utente per
  dopo questa prima fase, annotata in `ROADMAP.md` (fase 2).
- Esportare e condividere il GPX (TASK-024).
- Percorsi alternativi, «rigenera», modificare il percorso, salvarlo,
  cronologia.
- Richieste in due tempi e avanzamento del calcolo: solo se la prova
  sull'iPhone mostra richieste interrotte; in quel caso ci si ferma e si
  segnala.
- Walking e cycling.
- Avvisi riscritti in parole semplici (servono codici nel contratto),
  somiglianza come numero.
- Indirizzo dell'API di produzione, variabili d'ambiente per cambiarlo,
  HTTPS, autenticazione (fase 4).
- Ricerca del luogo con il GPS attivo, partenza toccando la mappa.
- Annullare il calcolo anche sul PC; velocizzare il motore (il cuore di
  Trento resta sui 30 s).

## Esito

Dal telefono si sceglie forma e distanza e il percorso compare sulla
mappa con distanza e avvisi, in 5–25 s per 3–10 km nelle zone in cache;
ogni errore ha il suo messaggio e il corpo degli errori è nel contratto
condiviso. Emerso: 15 km e zone nuove superano i 60 s che il telefono
aspetta; vanno in TASK-025 (richieste in due tempi). Il calcolo di 15 km,
circa 50 s più 14 s di ritaglio, resta lento anche lì: annotato in
`STATUS.md`.
