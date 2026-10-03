# TASK-214 — Il motore dei percorsi sul telefono

**Stato**: Todo: c'è solo il task file. Il codice parte dopo le sei scelte
qui sotto.
**Fase**: 4 · **Branch**: `docs/TASK-214-on-phone-engine` (questo file); il
codice in `feat/TASK-214-…`, una PR per parte · **ADR**: ADR-0177, da
scrivere con la parte A

## Obiettivo

Il telefono calcola da solo i percorsi su strada, sulle zone salvate nella
sua memoria e con lo stesso codice del server. Il server resta la riserva.

La richiesta dell'utente, del 2026-10-03: «quando un utente installa
l'applicazione sul suo telefono fai un codice che cerchi di migliorare la
ricerca delle mappe con la potenza del suo telefono, utilizzando anche la
sua memoria, scaricando le mappe e ricerca».

**Già deciso dall'utente** (2026-10-03): al primo avvio il download parte da
solo, senza chiedere, **anche con i dati mobili** («no anche con i gb»), non
solo con il Wi-Fi. In «Settings» una riga mostra lo spazio usato e permette
di cancellarlo.

## La prova già fatta

Fatta il 2026-10-03, fuori dal repository. Gli script sono in
`out/on-phone-engine/`, ignorata da git: `spike.mjs`, `spike_api.mjs`,
`on_phone.py`, `profile.mjs`, e la pagina per l'iPhone `web/index.html` con
`serve.py`.

- **Il motore gira senza modifiche** in Pyodide 0.28.3, cioè Python 3.13 in
  WebAssembly, come in una WebView. Le versioni delle librerie: numpy 2.2.5,
  networkx 3.4.2, shapely 2.0.7, pillow 11.3.0, pydantic 2.10.6. OSMnx è
  sostituito da un modulo vuoto: serve solo a scaricare e a leggere il
  GraphML.
- **Stesso percorso del Mac.** Cuore da 5 km a Trento (46.0679, 11.1211)
  dalla CLI: il GPX è identico punto per punto a quello del Python del Mac
  (403 punti, 17 tentativi, somiglianza 0,92, 5165 m).
- **Stessa risposta dell'API.** La catena dell'API (`RouteJobs`,
  `plan_request`, `with_choices`, `RouteResultBody`) gira senza FastAPI,
  thread né processi. Il JSON è uguale a quello del Python del Mac:
  percorso, alternative e indicazioni. Cambia solo `angle_deg`, dalla 14ª
  cifra in poi.
- **Tempi.** Nel browser del Mac (Chromium):
  - solo dalla partenza: 4,3 s; 4,2 s la seconda volta, con la zona già in
    memoria;
  - dalla partenza e dalle tre partenze vicine, una dopo l'altra, come fa il
    server: 10,3 s.

  Il server ci mette 7–19 s per un esempio (STATUS, TASK-168).
- **Memoria.** Nel browser, la memoria di WebAssembly arriva a 225–270 MB.
  In Node il processo intero arriva a 490 MB, ma conta anche Node.
- **La zona di Trento** (`foot`) pesa 18,9 MB in pickle, 7,9 MB compressa
  con gzip. Leggerla in WebAssembly richiede 2,3–4,7 s.
- **iPhone: da misurare.** La pagina `serve.py` sul Mac, porta 8765, si
  apre dal Safari dell'iPhone sulla stessa rete. I risultati arrivano in
  `out/on-phone-engine/reports/`.

## Sei scelte prima del codice

Chieste all'utente **una alla volta**, nell'ordine, ognuna con la sua
proposta. La risposta si scrive qui sotto la domanda.

### 1. Dipendenze nuove

`react-native-webview` c'è già (13.16.1, la usa la mappa). È nuovo
**Pyodide 0.28.3**, licenza MPL-2.0: il suo runtime (`pyodide.asm.wasm`,
`pyodide.asm.js`, `python_stdlib.zip`, `pyodide-lock.json`) e otto
pacchetti, cioè numpy, networkx, shapely, pillow, pydantic, pydantic_core,
typing_extensions e annotated_types. Le licenze dei pacchetti sono BSD, MIT
e HPND. Per provare sul Mac lo stesso codice del telefono serve anche il
pacchetto npm `pyodide`, solo per lo sviluppo.

**Proposta**: i file di Pyodide vanno nell'app come asset, a versione fissa.
`pyodide` npm diventa una dipendenza di sviluppo, solo per lo script di
confronto (scelta 6).

### 2. App Store

Cosa dicono le regole di Apple:

- **Linea guida 2.5.2**: un'app non può «download, install, or execute code
  which introduces or changes features or functionality of the app».
- **Linea guida 4.7**: ammette software fuori dal binario solo in casi
  precisi (mini app HTML5 e JavaScript, giochi in streaming, chatbot,
  plug-in).
- **Developer Program License Agreement**, la parte sul codice interpretato:
  si può scaricare codice interpretato se non cambia lo scopo dichiarato
  dell'app e non aggira il sandbox. È la regola su cui si reggono anche gli
  aggiornamenti di Expo (`eas update`).

Il motore in Python è codice interpretato, eseguito dal WebAssembly di
WebKit, e fa ciò che l'app dichiara: disegnare percorsi. **Il rischio** è
che chi rivede l'app consideri Python e i suoi pacchetti scaricati dopo
l'installazione come «codice scaricato». Oggi non ci tocca: Sgrava gira in
Expo Go e l'App Store arriva con TASK-152.

**Proposta**: tutto ciò che è codice sta dentro l'app (Pyodide, i
pacchetti, il motore) e si aggiorna con l'app. Si scaricano solo dati,
cioè le zone. Per questo le zone non viaggiano come pickle: un pickle, letto,
può eseguire codice (vedi la scelta 6).

### 3. Memoria e batteria

Il calcolo usa 225–270 MB nel browser del Mac; sull'iPhone è da misurare.
Su iOS la WebView gira in un processo suo. Se iOS lo chiude per la memoria,
l'app resta aperta e riceve `onContentProcessDidTerminate`. Il calcolo dura
5–15 s su un core, poco rispetto a una corsa con il GPS acceso. Pesa di più
il download delle zone.

**Proposta**: il telefono calcola solo se la zona sta sotto un limite di
grandezza, da fissare con la misura sull'iPhone. Se la WebView muore, la
stessa richiesta va al server, senza errore per chi usa l'app. La misura
va fatta su un iPhone vero e, se ce n'è uno, anche su un iPhone vecchio.

### 4. Dimensione dell'app e delle zone

- **L'app cresce di circa 20 MB** non compressi: `pyodide.asm.wasm` 8,6 MB,
  numpy 3,1, la libreria standard 2,4, pydantic con pydantic_core 1,8,
  pillow 1,1, il JavaScript di Pyodide 1,1, networkx 1,0, shapely 0,8, il
  motore 0,3. Su Expo Go viaggiano con `eas update`, che li riscarica solo
  quando cambiano.
- **Le zone**: Trento `foot` 7,9 MB compressa. Le zone `bike` sono a parte
  (Trento: 11,8 MB in pickle); l'acqua della canoa anche.

**Proposta**:
- al primo avvio, con qualunque rete (scelta già fatta), si scarica solo la
  zona dello sport di «Settings» intorno alla posizione;
- le altre zone si scaricano la prima volta che servono;
- al massimo 200 MB in tutto: quando si supera, si cancella la zona usata
  meno di recente.

### 5. Cosa resta al server

- **Restano al server**:
  - l'AI (le parole lette da Ollama);
  - le zone, che il server costruisce da Overpass e OSMnx;
  - gli esempi di «Explore»;
  - la ricerca dei luoghi;
  - gli account e la parte social;
  - la canoa, perché ha bisogno dell'acqua;
  - i percorsi da foto.
- **Può fare il telefono**: forme e parole su strada, di corsa e in bici,
  con le alternative A · B · C e le indicazioni.

**Proposta**: il telefono è una scelta in più, e il server resta sempre la
riserva. Con la zona già salvata calcola prima il telefono. Senza zona, o
se il telefono non riesce, calcola il server come oggi.

### 6. Lo stesso motore

- **`route_engine` non cambia per il telefono** (CLAUDE.md, «Confini dei
  moduli»). L'adattatore per il telefono è un file nuovo, fuori dal motore,
  che riusa `jobs`, `images` e `schemas` dell'API senza FastAPI.
  `app.to_request` sta in `app.py`, che importa FastAPI: si copia
  nell'adattatore, con un test che controlla che le due copie diano lo
  stesso risultato.
- **Le versioni.** Il server installa le versioni più recenti che
  `pyproject.toml` permette (`Dockerfile`): oggi sul Mac networkx 3.7 e
  numpy 2.5.3. Pyodide 0.28.3 ha networkx 3.4.2 e numpy 2.2.5. TASK-203 ha
  già visto percorsi diversi fra versioni (ADR-0162).
- **Il formato delle zone.** Il pickle lega le versioni di NetworkX fra
  server e telefono: quando non si legge, il motore ripiega sul GraphML
  (ADR-0104), che sul telefono non c'è. In più un pickle può eseguire
  codice.

**Proposta**:
- la zona viaggia in un **formato neutro**: array di nodi e archi con i soli
  attributi che il motore usa, costruiti dal server dal grafo in cache;
- sul telefono la legge un `GraphLoader` dell'adattatore;
- un test controlla che grafo → file → grafo ridia lo stesso grafo;
- uno script confronta le impronte dei percorsi fra telefono (Pyodide), Mac
  e server sulle stesse richieste del registro;
- dove le impronte differiscono, si fissano le versioni sul server o si
  annota la differenza, come in TASK-203.

## Le parti, dopo le scelte

**A — API** (prima PR):
- l'adattatore `on_phone.py`, con i suoi test;
- il formato neutro delle zone e il suo test di andata e ritorno;
- l'endpoint che dà la zona che copre un punto, per rete (`foot`, `bike`),
  con una versione per non riscaricarla. Sta in un file nuovo con
  `install_…(app)`, come `install_drawings`, e in `app.py` cambia una riga
  sola. `app.py` oggi è anche di TASK-206 B, 211 A e 120: si aspetta il
  turno del coordinatore;
- ADR-0177.

**B — App**:
- la WebView nascosta con Pyodide e il motore (`src/engine/`, nuovo);
- le zone in `documentDirectory` con il limite di spazio;
- il download al primo avvio;
- il calcolo sul telefono e il passaggio al server.

Gli asset di Pyodide e il pacchetto del motore li costruisce uno script,
dalla stessa versione di `route_engine` del repository.

**C — «Settings»**: la riga dello spazio usato con «Delete». I testi in
inglese li sceglie l'utente; le traduzioni passano da `t()` di TASK-210.

**D — Prova sull'iPhone**: tempi, memoria, e le stesse impronte del server
su dieci richieste.

## Criteri di accettazione

- [ ] Le sei scelte hanno la risposta dell'utente, scritta qui.
- [ ] La stessa richiesta dà lo stesso `RouteResultBody` dall'adattatore e
      da `/route-jobs` (test in CPython, nella CI).
- [ ] Una zona passata nel formato neutro e riletta è lo stesso grafo
      (test).
- [ ] Le impronte di telefono, Mac e server sulle stesse richieste sono
      confrontate, e le differenze annotate qui.
- [ ] Senza rete, con la zona salvata, l'app disegna un cuore da 5 km sul
      telefono.
- [ ] Senza zona, o con la WebView chiusa da iOS, la richiesta va al
      server, e chi usa l'app non vede errori.
- [ ] Tempi e memoria misurati sull'iPhone, scritti qui.
- [ ] `git diff` su `services/route-engine/route_engine/` vuoto.

## File toccati

Questa PR: solo `docs/tasks/TASK-214.md`.

Previsti per il codice, da confermare con il coordinatore prima di
partire:

```
docs/tasks/TASK-214.md, docs/DECISIONS.md (ADR-0177), docs/STATUS.md
docs/ARCHITECTURE.md, docs/API.md, docs/UI.md
services/api/shaperoute_api/on_phone.py            (nuovo)
services/api/shaperoute_api/phone_zones.py         (nuovo)
services/api/shaperoute_api/app.py                 (una riga)
services/api/tests/test_on_phone.py, test_phone_zones.py   (nuovi)
apps/mobile/src/engine/                            (nuova)
apps/mobile/assets/pyodide/                        (nuova)
apps/mobile/metro.config.js                        (.wasm e .zip come asset)
apps/mobile/package.json                           (pyodide, solo sviluppo)
apps/mobile/src/api/routes.ts                      (il passaggio al server)
apps/mobile/src/profile/SettingsPage.tsx, src/i18n/*.ts
tools/phone_engine/                                (nuova: build e confronto)
```

## Fuori scope

- La canoa e i percorsi da foto sul telefono.
- Le tile della mappa salvate per l'uso senza rete.
- Costruire le zone sul telefono da Overpass.
- Cambiare `route_engine` per farlo andare più veloce in WebAssembly: se
  serve, è un task suo.
- Pubblicare l'app e aggiornare il server: solo con l'ok dell'utente.

## Esito

*(a fine task)*
