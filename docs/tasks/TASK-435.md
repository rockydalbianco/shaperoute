# TASK-435 — Primo percorso subito, alternative dopo

**Stato**: In corso — parte 0 (#1104), A motore (#1105) e B API (#1139)
in `main` e **sul server dal passo 8** (`ab5b2983`, 2026-11-11 22:14Z);
C app nella PR #1161, provata nel simulatore, aspetta il sì dell'utente al
prima/dopo e il merge del Coordinatore; esce con l'aggiornamento completo
dell'app. Misure sotto («Parte D»)
**Fase**: 5 · **Branch**: `docs/TASK-435-plan` (questo file); poi una per
parte, sotto · **ADR**: 0361

## Obiettivo

Quando il piano dalla partenza dell'utente è pronto, l'app lo mostra
subito; i percorsi delle partenze vicine arrivano dopo e si aggiungono come
alternative, senza far aspettare il primo.

## Contesto

Scelta di prodotto dell'utente del 2026-11-10, dopo TASK-276: il traffico
vero è di circa 21 percorsi calcolati al giorno, quindi conta l'attesa del
singolo percorso (circa 10 s per 5 km sul server), non la coda.

**Come funziona oggi.**

- `route_engine/nearby_starts.py`, `plan_nearby` (ADR-0071, ADR-0087):
  pianifica dalla partenza nel processo che chiama e, insieme, da fino a 3
  nodi vicini in processi figli. Finito il piano della partenza aspetta i
  figli al più `NEARBY_GRACE_S` = 8 s (3 s, `NEARBY_GOOD_GRACE_S`, se il
  piano della partenza è già buono; mai oltre 25 s dalla richiesta). Poi
  sceglie: la forma migliore vince, da qualunque partenza (`_choose`,
  `TIE_MARGIN` 0,01); le altre diventano al più 2 alternative
  (`alternatives.py`).
- `shaperoute_api/images.py`, `plan_request`: il pianificatore dell'API,
  chiama `plan_nearby` per forme, parole e foto.
- `shaperoute_api/jobs.py`, `RouteJobs`: il job passa per `queued`,
  `downloading_map`, `computing`, poi `done` col `result` intero
  (`with_choices`: il percorso scelto, le sue alternative, le indicazioni
  di ognuno). Prima di `done` l'app non riceve niente.
- `shaperoute_api/route_processes.py` (ADR-0242): il thread del job passa
  la richiesta a uno di 2 processi caldi; dal processo tornano lo stato
  (`("status", seq, …)`) e alla fine `("done", seq, plan, times)`.
- L'app: `apps/mobile/src/api/routes.ts`, `requestRoute` chiede
  `GET /route-jobs/{id}` ogni 0,5–2 s finché è `done`;
  `route/useRouteRequest.ts` tiene lo stato (`waiting` → `done`);
  `App.tsx` ricava le scelte con `choicesOf(result)` e `RouteTiles` mostra
  A, B, C con chilometri e percentuale di somiglianza.
- Sul telefono (`engine/onPhone.ts`, TASK-214) i percorsi a piedi fino a
  8 km con una zona salvata li disegna il motore del telefono, che pianifica
  le partenze vicine **una dopo l'altra** (`processes=False`).

## La misura prima di costruire (2026-11-10, Mac)

Script: `out/TASK-435/first_route_measure.py` (sola lettura: zone di
`data/cache`, niente server, niente Overpass; l'uscita non contiene
posizioni). Richieste: le 12 di `out/TASK-276/route_bench.py` più le 70
richieste a piedi distinte del registro del Mac
(`data/requests/requests.jsonl`, forme e parole): 82, di cui 81 disegnate e
1 saltata (zona non in cache).

**Quante volte vince una partenza vicina: 31 su 81 (38%).**

| | Richieste |
|---|---|
| Vince la partenza dell'utente | 50 (62%) |
| Vince una vicina, di meno di 2 punti di somiglianza | 8 |
| Vince una vicina, di 2–5 punti | 12 |
| Vince una vicina, di 5–10 punti | 10 |
| Vince una vicina, di oltre 10 punti (17,5) | 1 |

- Guadagno mediano della vicina che vince: 3,6 punti.
- In 23 delle 31 il percorso della partenza resta nella risposta come
  alternativa; in 8 ne esce (ci sono già due alternative migliori, o è
  oltre 10 punti sotto).
- Solo bench: 7 su 12. Solo registro: 24 su 69. Fino a 5 km: 23 su 66.
- 71 risposte su 81 hanno almeno un'alternativa.

**Quanti secondi prima sarebbe pronto il primo percorso.**

| Dove | Risposta intera | Piano della partenza pronto | Guadagno |
|---|---|---|---|
| Mac, 81 richieste | mediana 1,3 s (max 3,8) | mediana 1,1 s | mediana **0,2 s**, max 0,9; almeno 0,5 s in 13 su 81 |
| Server, 9 forme da 5 km (giro 2b di TASK-276) | media 8,1 s | — | stima 0–3,7 s, mediana 0,5, media 1,2 |
| Server, 3 cuori da 10 km (giro 2b) | 11,7–14,7 s | — | stima 2,2–3,1 s |
| **Server, 9 job veri con le partenze vicine** (log dell'API, senza quello che ha scaricato la zona) | mediana 6,8 s (4,7–11,7) | mediana 4,7 s (1,1–8,1) dopo il ritaglio | `wait` mediana 1,5 s (0,6–4,1); guadagno stimato **mediana 1 s, da 0 a 3,5** |

Sul Mac le partenze vicine finiscono quasi sempre prima del piano della
partenza: costano circa metà (cercano solo dal loro nodo) e hanno un core
a testa. La stima del giro 2b è «secondi totali meno CPU del processo
principale» delle righe di `out/TASK-276/server-2.out`: mentre aspetta i
figli il principale non consuma CPU.

**I job veri** (`out/TASK-435/server-times.txt`: le righe «times» del log
dell'API, TASK-289, lette dal Coordinatore il 2026-11-10; solo secondi e
conteggi). 18 righe, 10 con le partenze vicine:

- `start` (il piano della partenza): 1,1–8,1 s, mediana 4,7.
- `wait` (tutto quello che le vicine aggiungono): 0,6–4,1 s, mediana 1,5;
  il 28% del totale in mediana. Circa 0,5 s di `wait` vengono **prima**
  del piano della partenza (il grafo impacchettato, i processi avviati: è
  il `wait` del job in cui la partenza ha impiegato 8,1 s e le vicine
  3,7) e restano; il resto è l'attesa dopo, che questo task toglie dal
  primo percorso.
- Il caso migliore: partenza pronta in 1,1 s e già buona, vicine in
  1,0–2,0 s di calcolo, eppure `wait` 4,1 s e totale 5,4 s. Il primo
  percorso sarebbe sullo schermo dopo circa 2 s invece di 5,4.
- I figli impiegano circa 2 s solo a partire (processo nuovo, import del
  motore, grafo da leggere): nei due job con la partenza pronta in 1–2 s
  le vicine hanno calcolato per meno di 2 s e il `wait` è stato 2,5 e
  4,1 s. Non è di questo task; va al profilo del motore.
- `chosen`: una vicina ha vinto in 4 job su 10, come nelle prove (38%).
- **Il campione è piccolo**: il container dell'API è stato ricreato
  quattro volte il 2026-11-10 e il log tiene solo quello corrente (dalle
  13:28 UTC, già coi 2 processi caldi). Dentro ci sono anche richieste di
  prova del Coordinatore (aereo e cuore da 5,2 km a Trento). Il
  Coordinatore rifà la lettura fra qualche giorno; i numeri sopra valgono
  come ordine di grandezza, e concordano con la stima del giro 2b.

**La raccomandazione dell'agente.** Lo stesso secondo si può forse
togliere a tutti, app vecchie comprese e senza mostrare un percorso che
nel 38% dei casi non è il migliore: i figli delle partenze vicine perdono
circa 2 s a partire, e sul Mac, dove partono in fretta, finiscono prima
della partenza e l'attesa è 0,2 s. È una stima, non una misura: la dà il
profilo del motore (TASK-434). Proposta: aspettare quel numero prima di
costruire B e C; se i figli già avviati bastano, questo task resta una
proposta ferma (come TASK-427).

**Cosa vuol dire.** Il grosso dell'attesa sul server è il piano della
partenza stesso (mediana 4,7 s), che questo task non accorcia. «Primo
percorso subito» toglie l'attesa dei figli **dopo** quel piano: circa 1 s
su 7 in mediana, fino a 3,5 s quando la partenza è veloce e già buona, 0
quando la partenza è lenta. Dove va il resto del tempo lo misura il
profilo del motore (sessione a parte, sola misura).

## La domanda (di prodotto, per l'utente)

Il primo percorso è già sullo schermo; poi una partenza vicina trova una
forma migliore (38% delle richieste di prova, di 3,6 punti in mediana).
Oggi vincerebbe lei.

- **Proposta: il primo resta.** Il primo percorso resta quello mostrato
  (A); gli altri si aggiungono come B e C, dal migliore. La percentuale di
  somiglianza è già scritta su ogni scheda, quindi una B migliore si vede
  (`A 5,1 km · 88%`, `B 5,0 km · 92%`). Tre percorsi in tutto, come oggi:
  se il primo non è fra quelli che il motore tiene, entra lui e esce
  l'ultima alternativa. Niente cambia sotto gli occhi, e chi ha già
  premuto «Start» o esportato il GPX ha il percorso che ha visto.
- **Alternativa: il migliore sostituisce.** All'arrivo il percorso
  mostrato diventa il migliore, come oggi, e il primo passa fra le
  alternative. In 38 richieste su 100 la mappa cambierebbe dopo 1–3 s.

**Le risposte dell'utente, 2026-11-10.**

1. «Sì, aspetta»: prima di costruire, il numero del profilo del motore
   (TASK-434) sui figli delle partenze vicine. È arrivato lo stesso giorno
   (sotto).
2. «Costruisci lo stesso», con quel numero davanti e la raccomandazione
   dell'agente di fermarsi.
3. **«Il primo resta A».** Il primo percorso resta quello mostrato; gli
   altri si aggiungono come B e C, dal migliore; tre percorsi in tutto.

## Il numero di TASK-434 (2026-11-10)

Da `docs/tasks/TASK-434.md`, «L'avvio dei figli nel flusso vero» (PR docs
#1102; dati in `out/TASK-434/child-start.txt`, 18 percorsi da 5 km sul
Mac, 42 figli).

| | Oggi | Con i figli già avviati |
|---|---|---|
| Mac: attesa dei figli dopo il piano della partenza | media 0,26 s, mediana 0,24 | media 0,09 s, mediana **0,00** |
| Mac: percorsi che aspettano i figli | 14 su 18 | 8 su 18 |
| Server, i 9 job di sopra: `wait` (stima, non misura) | media 2,0 s, mediana 1,5 | media circa 1,2 s, mediana circa 1,0 |

- Sul Mac un figlio impiega 0,36 s da `_Workers(...)` alla ricerca: 0,26 di
  avvio (interprete e import del motore), 0,02 di ricezione, 0,08 di grafo
  spacchettato. Sul server, dalle 9 righe, circa 2 s (1,4–2,7), di cui
  circa 1,5 di avvio: l'ipotesi di sopra regge, ma là non è stato misurato.
- Con i figli già avviati quello che resta di `wait` sul server è quasi
  tutto lavoro del processo principale **prima** del piano della partenza
  (0,6–1,0 s), che «primo percorso subito» non toglie.

**Cosa resta a questo task.** Tolti 1,5 s di avvio dall'attesa dopo il
piano, nei 9 job del server il guadagno di «primo percorso subito»
scenderebbe da mediana 1 s (0–3,5) a mediana **0 s** (media 0,4; 0 in 5
job su 9; al massimo 2 s, nel job con la partenza pronta in 1,1 s). È una
stima con le due ipotesi di TASK-434 (0,8 s prima del piano, 1,5 s di
avvio).

**Raccomandazione dell'agente.** I figli già avviati (proposta 2 di
TASK-434) tolgono circa 0,7–0,8 s a ogni percorso sul server, alle app non
aggiornate comprese, senza toccare contratto e app e senza mostrare per
primo un percorso che nel 38% dei casi non è il migliore. Dopo, a questo
task resta troppo poco per tre PR, un passo sul server e un OTA: chiuderlo
come proposta ferma, e riaprirlo solo se la misura sul server dopo i figli
già avviati mostra ancora un'attesa che vale la pena. **L'utente ha scelto
di costruirlo lo stesso** (sopra).

## Il piano, in parti

Una parte = un branch da `main` = una PR. Le PR di codice non toccano
`STATUS.md`, `DECISIONS.md`, `INDEX.md`: le loro righe vanno in una PR di
soli documenti dopo il merge.

### Parte 0 — documenti (questa)

Task file, misura, ADR-0361, riga in `STATUS.md` e in `INDEX.md`. Una PR
sola, aperta dopo le risposte dell'utente.

```
docs/tasks/TASK-435.md
docs/STATUS.md          (la voce del task)
docs/DECISIONS.md       (ADR-0361: voce e riga dell'indice)
docs/INDEX.md           (una riga)
```

### Parte A — motore: `plan_nearby` dice quando la partenza ha il suo piano

`feat/TASK-435-a-first-plan`

1. `plan_nearby(..., on_first: Callable[[Plan], None] | None = None)`:
   chiamato una volta, appena la partenza ha il suo piano e ci sono
   partenze vicine ancora da aspettare; mai quando la partenza non ha un
   percorso, né quando non ci sono vicine (la risposta intera è già lì).
   La scadenza dei figli si calcola **prima** della chiamata, come oggi:
   il tempo speso in `on_first` non la sposta.
2. Niente altro cambia: stessa scelta, stesse alternative, stessi punti.
   Prova dei percorsi identici (`services/api/tests/test_same_routes.py`
   sul Mac) e righe in `SAME_ROUTES_AS` (`route_store.py`: serve l'ok del
   Coordinatore, già chiesto con la lista dei file).
3. Test deterministici, senza processi (`processes=False`) e con un
   grafo finto: `on_first` riceve il piano della partenza, una volta, prima
   che le vicine siano pianificate; non è chiamato senza vicine né quando
   la partenza fallisce; il `NearbyPlan` è identico con e senza.
4. `engine.zip` rifatto per ultimo (il motore è dentro).
5. La PR dice l'impronta nuova e la prova; **il merge lo fa l'utente**: il
   motore è fuori dai merge del Coordinatore (regola del Coordinatore,
   2026-11-10).

```
services/route-engine/route_engine/nearby_starts.py
services/route-engine/tests/test_nearby_first.py          (nuovo)
services/api/shaperoute_api/route_store.py                 (solo SAME_ROUTES_AS)
services/api/tests/fixtures/same_routes/<impronta>.json    (nuovo: la prova)
apps/mobile/assets/engine/engine.zip
docs/ROUTE_ENGINE.md                                       («Partenze vicine»)
docs/tasks/TASK-435.md
```

### Parte B — API: il job ha `first` mentre calcola

`feat/TASK-435-b-first-in-job`

1. `images.plan_request` passa a `plan_nearby` l'`on_first` della sorgente
   del job, se ne ha uno (protocollo `ShowsFirst`, come `NotesNearby` per i
   tempi); per una foto il piano passa da `_unnamed` come quello finale.
2. `jobs._Reporting.first_plan(plan)`: le indicazioni del piano
   (`with_directions`, sui grafi già caricati) e `RouteJobs` lo scrive nel
   job: `Job.first` (un `RouteResult` senza alternative) e `first_placed`.
   Lo stato resta `computing`. Un job annullato non lo riceve.
3. `route_processes`: il processo manda `("first", seq, plan)` con le
   indicazioni già fatte; `_Worker.ask` lo passa al job come fa con lo
   stato. Vale anche senza processi (i 2 thread, l'API sul Mac).
4. Contratto, **solo esteso**: `RouteJob` ha in più `first`, `null` di
   norma. `GET /route-jobs/{id}?first=1` lo riempie mentre lo stato è
   `computing` e il piano della partenza è pronto; senza `?first=1` resta
   `null`. A `done` il `result` è **identico a oggi** (scelto +
   alternative) e `first` torna `null`. Un'app non aggiornata non manda
   `?first=1`, ignora il campo e riceve il risultato intero come oggi; un
   server non aggiornato ignora `?first=1`.
5. Archivio, registro delle richieste, `on_end`, `POST /routes`: come oggi,
   lavorano sul risultato finale.
6. Test: `RouteJobs` con un pianificatore finto che chiama `first_plan` e
   poi si ferma su un evento (il job è `computing` con `first`, poi `done`
   col risultato di sempre); `route_processes` con un pianificatore finto
   nel processo; `GET` con e senza `?first=1`; il corpo senza `?first=1` è
   quello di oggi più `"first": null`.
7. Un test che l'app in produzione (OTA del 2026-11-10) legga il
   contratto esteso (chiesto dal Coordinatore): `requestRoute` di oggi,
   senza `onFirst`, davanti a un job `computing` con `first` pieno e poi
   `done`, dà il risultato intero come oggi. In un file di test nuovo,
   che la parte C non riscrive.
8. `engine.zip` rifatto nell'ultimo commit (`jobs.py`, `images.py`,
   `schemas.py` sono dentro) ed elencato nella PR.

```
apps/mobile/src/api/routesFirstCompat.test.ts    (nuovo)
services/api/shaperoute_api/images.py
services/api/shaperoute_api/job_times.py        (il protocollo ShowsFirst)
services/api/shaperoute_api/jobs.py
services/api/shaperoute_api/route_processes.py
services/api/shaperoute_api/schemas.py           (RouteJobBody.first)
services/api/shaperoute_api/app.py               (job_body, GET ?first=1)
services/api/tests/test_first_route.py           (nuovo)
packages/shared-types/src/index.ts               (RouteJob.first)
apps/mobile/assets/engine/engine.zip
docs/API.md                                      («Richieste in due tempi»)
docs/tasks/TASK-435.md
```

### Parte C — app: mostra il primo, poi aggiunge

`feat/TASK-435-c-app-first-route`

1. `api/routes.ts`: `requestRoute` con `onFirst`; chi lo passa chiede
   `?first=1` finché non l'ha avuto, poi come oggi. Gli altri chiamanti
   («Explore», esempi, canoa) non lo passano e non cambiano.
2. `route/useRouteRequest.ts`: all'arrivo di `first` lo stato è già `done`
   col primo percorso e `more: true`; all'arrivo del risultato intero
   `more` cade e le scelte sono (`route/choices.ts`, «il primo resta A»):
   il primo, poi i percorsi della risposta dal migliore, senza quello
   uguale al primo (stessi punti), tre in tutto.
   Se dopo il primo il job fallisce o il server non risponde, il primo
   resta, da solo.
3. `route/RoutePanel.tsx`: mentre `more` è vero, una riga sotto le schede
   dice che le alternative stanno arrivando (testo in inglese e nelle
   lingue dell'app: da approvare con la risposta).
4. Test: `routes.test.ts` (un job con `first`, poi `done`),
   `useRouteRequest.test.ts`, `choices.test.ts`.

```
apps/mobile/src/api/routes.ts
apps/mobile/src/api/routes.test.ts
apps/mobile/src/route/useRouteRequest.ts
apps/mobile/src/route/useRouteRequest.test.ts
apps/mobile/src/route/choices.ts
apps/mobile/src/route/choices.test.ts
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanelFirst.test.tsx    (nuovo)
apps/mobile/src/i18n/{it,de,fr,es}.ts
docs/UI.md
docs/tasks/TASK-435.md
```

`App.tsx` non si tocca: legge `view.result` come oggi.

### Parte D — misura e chiusura

Sul Mac, con l'API e i 2 processi: per le richieste di
`out/TASK-276/route_bench.py`, i secondi fra `POST` e il primo `first` e
fra `POST` e `done`, scritti qui. Poi server e OTA (sotto).

**Misurato il 2026-11-10 sul Mac**, col codice di A + B
(`out/TASK-435/first_route_jobs.py`: `RouteJobs` con 2 processi caldi come
l'API, zone di `data/cache`, i 12 percorsi del bench a Trento dopo aver
scaldato i due processi; il job letto ogni 10 ms):

| | Mediana | Minimo | Massimo |
|---|---|---|---|
| Secondi alla risposta intera | 3,17 | 2,00 | 6,16 |
| Secondi al primo percorso (`first`) | 2,52 | 1,20 | 5,25 |
| **Secondi guadagnati** | **0,79** | 0,06 | 2,11 |

- Tutti e 12 i job hanno avuto un primo percorso prima della risposta.
- Il primo percorso era quello scelto dal motore in 5 job, la prima
  alternativa in 3, la seconda in 3, e in 1 il motore non l'aveva tenuto
  (lì l'app mostra il primo e le due migliori).
- Per forma: 5 km, guadagno 0,06–1,45 s (mediana 0,62); cuore da 10 km,
  0,91–2,11 s.
- L'app legge ogni 0,5 s nei primi 6 s: quello che l'occhio guadagna è
  questo numero arrotondato al mezzo secondo, in più o in meno.
- Dentro i processi caldi il guadagno è più grande che nella misura
  diretta della parte 0 (0,2 s in mediana, `plan_nearby` chiamato da
  solo): il perché non è stato cercato.

**Sul server, prima del passo 8** (`out/TASK-435/server-times-before-passo8.txt`:
78 righe «times» lette dal Coordinatore l'11 novembre, coi 2 processi
caldi; 22 job con le partenze vicine e senza zona scaricata; dentro ci
sono anche richieste di prova):

| | Mediana | Media | 75° percentile | Massimo |
|---|---|---|---|---|
| Risposta intera (`total`) | 8,1 s | 8,5 | 10,9 | 14,9 |
| Piano della partenza (`start`) | 4,5 s | 4,6 | 6,2 | 7,3 |
| Attesa delle vicine (`wait`) | **2,9 s** | 3,4 | 5,7 | 8,3 |
| `wait` meno 0,6 s (quello che il primo percorso guadagna) | 2,3 s | 2,8 | 5,1 | 7,7 |

- `wait` è almeno 2 s in 13 job su 22, almeno 3 s in 10, almeno 5 s in 7:
  più dei 9 job della parte 0 (mediana 1,5 s).
- Una vicina ha vinto in 13 job su 22: lì il primo percorso resta A e la
  migliore è B.
- In 4 job una vicina è stata lasciata perché in ritardo: lì il primo
  percorso arriva almeno 3 s prima della risposta.

**Sul server, dopo il passo 8** (`out/coordinatore/prova-passo8.out`, la
prova di `SERVER-B.md` lanciata dall'utente l'11 novembre alle 22:18Z, un
cuore da 5,3 km a Trento): primo percorso dopo 11,2 s, risposta intera dopo
14,0 s, **2,7 s guadagnati**; il primo era la seconda alternativa di 3;
senza `?first=1` le chiavi del job erano quelle di prima a ogni lettura, lo
stesso `result` con e senza, `first` di nuovo `null` a `done`. È una
richiesta sola, a processo appena avviato. Le righe «times» di dopo il
passo le legge il Coordinatore fra qualche giorno.

**Nel simulatore** (iPhone 17e, Expo Go dal ramo della C, API del ramo
sul Mac con `--no-route-store`, una stella da 10 km da Piazza del Duomo a
Trento; strisce e video in `out/TASK-435/`: `TASK-435-prima.jpg`,
`TASK-435-dopo.jpg`, `prima.mov`, `dopo.mov`):

- **Dopo**: la sagoma d'attesa (TASK-442) per circa 3 s, poi il primo
  percorso (9,7 km) con «Looking for other routes…», «Start» ed «Export
  GPX»; circa 2,5 s dopo le schede: A 9,7 km · 92% (il primo), B 10,4 km ·
  97% (la migliore), C 9,3 km · 91%. Il percorso sulla mappa non cambia;
  il pannello si alza di qualche riga quando entrano le schede.
- **Prima** (lo stesso codice senza chiedere `first`): la sagoma d'attesa
  fino alla risposta intera, poi tutto insieme, con A la migliore (97%).
- Il Mac era carico: il job del «dopo» è durato 4,8 s, quello del «prima»
  7,5 s. Il guadagno si legge dentro la ripresa «dopo», non dal confronto
  dei due totali. Con un cuore da 10 km le vicine hanno finito prima della
  partenza e la riga non si è vista: primo percorso e schede nello stesso
  secondo.

**Il sì dell'utente al prima/dopo, 2026-11-11**: «Sì, va bene», davanti
alle due strisce del simulatore.

**Non ancora provato**: l'app su un telefono vero.

**Come sono fatte le parti, rispetto al piano.**

- B: chi non chiede `?first=1` riceve il `RouteJob` **senza il campo**,
  non con `first: null`: il corpo per un'app non aggiornata è quello di
  prima, byte per byte (`RouteJobWithFirstBody` è un modello a parte). Il
  pianificatore chiama `plan_nearby` come prima quando nessuno mostra il
  primo percorso (`images._plan_nearby`).
- B: il test dell'app pubblicata è `apps/mobile/src/api/routesFirstCompat.test.ts`.
- C: `withFirst` (`route/choices.ts`) tiene del primo percorso anche la
  sua `better_distance_m`, e la toglie agli altri, come fa il motore con le
  alternative. Se dopo il primo l'utente annulla, lo stato torna vuoto come
  per ogni annullamento.
- C, testo nuovo, **approvato dall'utente il 2026-11-10** («Sì, va
  bene»): «Looking for other routes…» («Cerco altri percorsi…», «Weitere
  Routen werden gesucht…», «Recherche d'autres parcours…», «Buscando otras
  rutas…»).

## File di altri task

Controllato il 2026-11-10 su `STATUS.md` e `AGENTI.md`: nessun task in
lavorazione elenca i file sopra (il Coordinatore: «i file coinvolti sono
liberi»). Da tenere d'occhio:

- `apps/mobile/assets/engine/engine.zip`: lo rifà ogni PR che tocca il
  motore o i moduli dell'API che `on_phone` importa; se un'altra PR lo
  rifà prima, si mergia `main` e si rifà.
- `services/api/shaperoute_api/route_store.py` (`SAME_ROUTES_AS`): una
  riga in coda, a catena; stesso discorso.
- `services/api/shaperoute_api/app.py`, `schemas.py`,
  `packages/shared-types/src/index.ts`: file larghi, toccati da molti
  task; qui poche righe ciascuno.

## Server, OTA, store (col sì dell'utente e il via del Coordinatore)

1. **Server** dopo il merge di A e B: aggiornamento dell'API come gli
   altri (`docs/DEPLOY.md`), nessuna migrazione. Compatibile nei due
   versi: l'app di oggi non chiede `first`.
2. **OTA** dopo il merge di C e dopo il server: solo JavaScript e
   `engine.zip`, niente di nativo (l'impronta iOS resta `6f8bba4c`).
   Prima del server l'app nuova funziona come oggi (nessun `first`).
3. **Store**: niente.

## Criteri di accettazione

- [ ] A server scarico i percorsi finali (scelto + alternative) sono
      quelli di oggi: `test_same_routes` verde con la riga in
      `SAME_ROUTES_AS`.
- [ ] Il job dice `first` prima che le partenze vicine finiscano (test
      con pianificatore finto, thread e processi).
- [ ] Un'app non aggiornata riceve gli stessi stati e lo stesso `result`
      di oggi (test del corpo senza `?first=1`).
- [ ] L'app mostra il primo percorso all'arrivo di `first` e aggiunge le
      alternative a `done`, secondo la risposta dell'utente (test).
- [ ] Il guadagno misurato sul Mac è scritto qui; quello del server dopo
      il passo server.
- [ ] CI verde per ogni PR.

## Fuori scope

- Accorciare il piano della partenza (il profilo del motore, sessione a
  parte) e cambiare `NEARBY_GRACE_S`, `NEARBY_GOOD_GRACE_S`, `TIE_MARGIN`.
- Spegnere le partenze vicine sotto carico (opzione 3 di TASK-276: non
  approvata).
- **Il motore sul telefono** (TASK-214): lì le partenze vicine sono una
  dopo l'altra, quindi il primo percorso arriverebbe molto prima della
  risposta intera, ma serve che la pagina di Pyodide mandi un messaggio a
  metà calcolo (`phoneEngine.ts`, `on_phone.py`). `on_first` della parte A
  lo rende possibile; è una parte a sé, da proporre dopo la misura.
- «Explore», esempi, percorsi a tema, canoa e nuoto (nessuna partenza
  vicina sull'acqua).

## Esito

*(a fine task)*
