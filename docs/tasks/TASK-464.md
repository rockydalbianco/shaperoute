# TASK-464 — Zone già in memoria nei processi di calcolo

**Stato**: In corso — codice in `main` (#1167, 2026-11-12), CI verde.
Resta il passo sul server: il passo 9 del Coordinatore (col sì
dell'utente), col default `SHAPEROUTE_ZONES_MB` 500. Poi le letture di
`out/TASK-464/SERVER.md` e la scelta del tetto dal minimo disponibile
dopo qualche giorno. La PR di documenti è `docs/TASK-464-merged`.
**Fase**: 5 · **Branch**: `feat/TASK-464-warm-zones` ·
**ADR**: ADR-0374 (la voce va nella PR di documenti dopo il merge)

## Obiettivo

Un percorso a piedi non aspetta la lettura della zona dal disco quando la
zona è tra quelle usate di solito. È l'ottimizzazione 3 di TASK-445, «a
percorsi identici».

## Contesto da leggere

- `docs/tasks/TASK-445.md`: «Il server», «Il Mac», «Le 3 ottimizzazioni»,
  punto 3.
- `docs/tasks/TASK-276.md`: memoria dei processi di calcolo (parte B).
- `services/api/shaperoute_api/graphs.py`, `route_processes.py`,
  `activity_graphs.py` (si leggono, non si toccano).

## Perché la zona viene riletta

Dai dati già raccolti, senza misure nuove. Le righe «times» del server
(`out/TASK-435/server-times.txt`,
`out/TASK-436/server-job-times-snapshot-2026-11-11T1330Z.txt`) non dicono
quale zona né quale processo: `crop` sopra 0,5 s vuol dire zona letta dal
disco (in memoria il ritaglio costa 0,05–0,3 s). Le cause, dal codice e dal
log della prova sul simulatore (`out/prova-app-2026-11-11/api-8051.log`):

1. **Ogni processo di calcolo ha le sue zone.** Sono due processi
   (ADR-0242): la stessa zona si legge una volta per processo. I due
   percorsi consecutivi del 2026-11-11 con `crop` 1,19 e 1,08 s sono
   compatibili con la stessa zona letta dai due processi.
2. **Ogni città ha tante zone.** Vince la più piccola che copre la richiesta
   (`OsmnxSource.covering_path`). In locale ci sono 960 zone a piedi
   (pickle: mediana 10 MB, 90% sotto 43 MB, massimo 107 MB). Nella prova sul
   simulatore Trento ha usato 5 file diversi in un'ora, e 2 sono stati
   riletti dal disco: col limite di 2 zone per processo (`MAX_ZONES`), o
   perché li aveva l'altro processo. Dal log non si distingue.
3. **Dopo ogni aggiornamento del server i processi ripartono vuoti.**
   Anche un processo ucciso dopo `MAX_JOB_S` riparte vuoto, ma è raro.

Quale delle tre pesi di più non si sa dai dati: lo diranno le righe del
log `zone … warmed` e `graph from disk/memory` dopo il passo sul server.

## Cosa si fa

Un modulo nuovo, `shaperoute_api/warm_zones.py`, solo nei processi di
calcolo e solo per le zone a piedi (corsa e camminata, la stessa rete):

- **Tetto in memoria invece di 2 zone.** Ogni processo tiene le zone a
  piedi fino a `SHAPEROUTE_ZONES_MB` (default prudente 500 MB, massimo 16
  zone). Le stima come 12 volte il loro pickle. Ne tiene **almeno 2**
  qualunque sia la loro misura, come prima: nessuna zona viene riletta più
  spesso di oggi.
- **Le zone più usate, contate.** Ogni percorso conta la sua zona in
  `data/cache/zone-usage/running.json`, che i due processi condividono. Il
  file si scrive intero e si sposta sopra il vecchio (scrittura atomica),
  sotto un `flock` (due processi insieme non perdono conti). Se il file
  manca o è rotto non si scalda nessuna zona; se non si può scrivere resta
  com'è. Il percorso non fallisce mai per il file.
- **Precarico all'avvio, in background.** Ogni processo, appena nato,
  rilegge le zone più usate finché ci stanno nel tetto, in un thread suo.
  Risponde subito al primo percorso. Un percorso che vuole la zona in
  lettura aspetta quella lettura e non la rifà. Le zone precaricate sono le
  prime a uscire quando servono posti a un percorso.
- `__main__.py`: i processi di calcolo ricevono
  `partial(warm_graphs, cache_dir, zones_mb)` al posto di
  `partial(ActivityGraphs.from_cache, cache_dir)`. Un valore sbagliato
  della variabile ferma l'API all'avvio con un messaggio.

**Percorsi identici.** La zona si sceglie come prima (`covering_path`), si
legge come prima (`read_graph`), si ritaglia come prima (`ZoneCrop`):
cambia solo *quando* si legge. I test lo provano due volte:

- stesso grafo da `ActivityGraphs.from_cache` e dalle zone calde (dal
  disco, dalla memoria, precaricata);
- stesso piano di `images.plan_request` in un processo di calcolo vero,
  con le zone di prima e con quelle calde.

Il motore non cambia, quindi `test_same_routes` resta verde.

Non si toccano `graphs.py` né `activity_graphs.py`: sono dentro
`engine.zip` del telefono, e cambiarli vorrebbe dire ricostruirlo. Non si
toccano nemmeno `route_processes.py`, `jobs.py` e il motore.

## Memoria

- Una zona in memoria ≈ 12 × il suo pickle. Lo dice TASK-276: un processo
  con Trento (19 MB) e Milano (44 MB) arriva a 893 MB, di cui ~150 MB sono
  gli import; con la sola Trento il picco era 360 MB. Trento quindi pesa
  ~230 MB, una zona mediana ~120 MB.
- Oggi: 2 zone per processo, ~250–450 MB nel caso tipico, ma fino a ~2 GB
  con due zone grandi (Madrid ha un pickle di 201 MB).
- Col default di 500 MB: nel caso tipico ~+100–250 MB per processo, quindi
  +0,2–0,5 GB in tutto. Il caso peggiore non cambia (sempre almeno 2 zone).
- Sul server (dal Coordinatore, 2026-11-11): l'API usa 627 MB, il catalogo
  nuovo ne aggiunge ~200, il server ha 7,7 GB di cui 6,2 disponibili. Il
  minimo disponibile misurato con 2 processi e figli al lavoro è 4,3 GB
  (TASK-276). I figli delle partenze vicine partono solo se c'è memoria
  (`workers_that_fit`, riserva 1 GB): il tetto va scelto in modo che ci
  stiano sempre, se no i percorsi cambierebbero (meno partenze vicine).
- **Il valore del server si decide dopo il passo 8**, guardando la memoria
  vera (`docker stats`, `free -m`). 1000 MB vorrebbe dire ~+1,2 GB in
  tutto: da provare solo se il minimo disponibile resta sopra ~3,5 GB.

## Criteri di accettazione

- [x] Le zone a piedi dei processi di calcolo stanno sotto un tetto in MB,
      con almeno 2 zone come prima.
- [x] Il tetto è `SHAPEROUTE_ZONES_MB`, default 500, in `.env.example` e
      in `docs/DEPLOY.md` (F.9).
- [x] Le zone più usate si contano in `zone-usage/running.json` con
      scrittura atomica e lock; un file mancante, rotto o non scrivibile
      non fa mai fallire un percorso.
- [x] Il precarico è in background: il processo risponde subito, e un
      percorso non rilegge una zona che si sta precaricando.
- [x] Stessi percorsi: stesso grafo e stesso piano in un processo vero
      (`test_warm_zones.py`); `test_same_routes` verde.
- [x] Nessun file del motore, di `engine.zip`, di `route_processes.py` o
      `jobs.py`.
- [ ] Passo sul server (Coordinatore, col sì dell'utente), con
      `SHAPEROUTE_ZONES_MB` scelto dalla memoria vera.
- [ ] Tempi rivisti dalle righe «times» dopo il passo (Coordinatore).

## File toccati

```
services/api/shaperoute_api/warm_zones.py      (nuovo)
services/api/tests/test_warm_zones.py          (nuovo)
services/api/shaperoute_api/__main__.py
.env.example
docs/DEPLOY.md
docs/tasks/TASK-464.md                         (nuovo)
```

Dopo il merge, in una PR di documenti: la voce ADR-0374 in
`docs/DECISIONS.md` (deciso dall'agente su delega dell'utente: tetto in MB
invece di un numero di zone, conteggio in un file della cache, precarico
in background, solo zone a piedi) e la riga di STATUS.

## Fuori scope

- Le partenze vicine in processi già caldi e il routing più veloce
  (ottimizzazioni 1 e 2 di TASK-445): toccano il motore, sono nella sua
  coda.
- Le zone delle bici, dell'escursione e degli altri sport: restano come
  sono (`ZONES_IN_MEMORY`). Si aggiungono solo se il log dice che servono.
- Le zone del processo principale dell'API (archivio, indicazioni):
  restano 2.
- Usare una zona più grande già in memoria al posto di una più piccola dal
  disco: potrebbe cambiare il ritaglio, quindi i percorsi.
- Misure sul Mac: solo col «turno del Mac» del Coordinatore (oggi no,
  carico alto).

## Esito

*(a fine task)*
