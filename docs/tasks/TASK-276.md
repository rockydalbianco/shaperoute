# TASK-276 — Più percorsi all'ora sullo stesso server

**Stato**: Done · 2026-11-10 · A misurata, B #1038 (ADR-0242) sul server,
misura coi processi #1097: da circa 7,5 a 8,5–9,5 percorsi al minuto
**Fase**: 4 · **Branch**: `docs/TASK-276-plan` (questo file); per il
codice, se si decide di farlo, `feat/TASK-276-route-process-pool`
· **ADR**: 0242, riservato

## Obiettivo

Sapere, con numeri misurati sul server, quanti percorsi all'ora calcola il
CX33 e quante persone al giorno regge, poi decidere con l'utente se e come
fargliene calcolare di più senza cambiare server.

## Contesto

Il 2026-10-11 l'utente ha chiesto quante persone regge il server. La stima
data in chat era di 2.000–3.000 persone attive al giorno, con un limite
nel calcolo dei percorsi sul server, non in RAM, disco o banda. Poi ha
chiesto di «usare tutti e 4 i core» con più processi. Guardando il codice
e misurando, la premessa (un core su quattro) si è rivelata sbagliata:
prima di scrivere codice serve una misura sul server.

**Il server, in sola lettura, il 2026-10-11:**

- CX33: 4 vCPU, 8 GB, nessuno swap. RAM usata circa 1 GB (API 259 MB,
  database 77 MB), carico 0,04.
- Disco: volume delle zone 51 GB su 69, `/` 13 GB su 75.
- Traffico delle 48 ore prima: 4 job di percorso e circa 150 richieste
  oltre a `/health`.

**Come l'API calcola un percorso oggi:**

- Un solo processo uvicorn. I job di percorso girano in
  `services/api/shaperoute_api/jobs.py` su un `ThreadPoolExecutor` di
  `WORKERS = 2` thread (ADR-0032).
- Le zone tenute in memoria sono `MAX_ZONES = 2` a piedi e 1 in bici
  (`graphs.py`, `activity_graphs.ZONES_IN_MEMORY`).
- Ogni percorso è pianificato dalla partenza e, in contemporanea, da
  fino a 3 partenze vicine. Ognuna gira in un processo `spawn` a priorità
  più bassa (`route_engine/nearby_starts.py`, ADR-0071; senza `Pool` da
  TASK-248, ADR-0212).
- Le partenze vicine partono solo se c'è memoria libera, e mai su un
  grafo oltre `NEARBY_MAX_NODES` (30 000 nodi). Finito il piano dalla
  partenza, le partenze vicine hanno ancora 3–8 s (`NEARBY_GOOD_GRACE_S`,
  `NEARBY_GRACE_S`).

**Misura sul Mac (2026-10-11):**

- 12 percorsi a Trento con la zona già in memoria: cuore, cerchio e
  stella da 5 km e cuore da 10 km, ognuno da tre partenze.
- Tempo di ogni percorso: 0,9–2,6 s.
- CPU del thread del job: 17,5 s in tutto. CPU dei processi delle
  partenze vicine: 35,7 s. **Rapporto 2,04.**
- Sul Mac quindi un percorso usa già altri core. Con M secondi di CPU
  del thread, un percorso costa circa 3M secondi di CPU in tutto.
- Con oggi i due thread si dividono il GIL: al massimo un percorso ogni
  M secondi.
- Con 4 core il limite assoluto è 4/(3M):
  - un pool di processi da solo darebbe **al massimo +33%**;
  - un pool più nessuna partenza vicina quando il server è carico darebbe
    fino a circa ×3–4 nei picchi, ma in quei momenti ci sarebbero meno
    alternative e a volte forme meno fedeli (TASK-075: un cuore da 10 km a
    Caldonazzo è passato da 0,73 a 0,92 grazie alle partenze vicine).
    Questa è una scelta di prodotto, dell'utente.

**La domanda aperta:** sul server lo stesso cuore da 5 km a Trento risponde
in 8,9–18 s (misure del 2026-10-01 e del 2026-10-05), sul Mac in meno di
2. Non si sa quanto pesa la CPU più lenta e quanto l'attesa delle partenze
vicine o l'avvio dei processi `spawn`. È la prima cosa da misurare.

**Scelta dell'utente del 2026-10-11:** aspettare e misurare sul server dopo
l'approvazione di Apple, poi decidere con i numeri.

## Contesto da leggere

- `docs/tasks/TASK-248.md`, «Cosa si sa» e parte B: perché nel motore non
  c'è più un `Pool`.
- `docs/DECISIONS.md`: ADR-0032 (i job), ADR-0071 (le partenze vicine),
  ADR-0212 (i processi senza `Pool`).
- `docs/DEPLOY.md`, strada F: come si entra nel container dell'API.

## Cosa fare

### Parte A — misurare sul server

Dopo l'approvazione di Apple, con l'ok dell'utente e il via del
coordinatore, in un'ora con poco traffico: circa 10 minuti di CPU.

1. **CPU di un percorso**: CPU del thread del job e CPU dei processi
   figli, sulla zona di Trento e su una città grande (Milano, 15 km, oltre
   `NEARBY_MAX_NODES`). Lo script sotto, mandato su stdin dentro il
   container:
   `docker compose exec -T api python - < route_cpu.py`.
2. **Percorsi all'ora con più richieste insieme**: 1, 2, 4 e 8 richieste
   date tutte insieme a un `RouteJobs` come quello dell'API. Si misurano
   l'attesa in coda, il tempo totale e i percorsi finiti al minuto.
3. **Picco di RAM per processo**: RSS dell'API e dei processi figli, con
   le zone di Trento e di Milano in memoria.
4. Scrivere i numeri in «Esito» e rifare la stima delle persone al giorno.

Lo script del punto 1, usato sul Mac il 2026-10-11 (lì con
`PYTHONPATH=../route-engine:../ai:.` da `services/api`):

```python
import resource, time
from pathlib import Path
from route_engine.models import RouteRequest
from shaperoute_api.activity_graphs import ActivityGraphs, source_for
from shaperoute_api.images import plan_request

def cpu():
    me = resource.getrusage(resource.RUSAGE_SELF)
    kids = resource.getrusage(resource.RUSAGE_CHILDREN)
    return me.ru_utime + me.ru_stime, kids.ru_utime + kids.ru_stime

def main():
    roads = source_for(ActivityGraphs.from_cache(Path("data/cache")), "running")
    starts = [(46.0679, 11.1211), (46.0748, 11.1300), (46.0620, 11.1150)]
    plan_request(RouteRequest(start=starts[0], distance_m=3000, shape="circle"), roads)
    for shape, distance in [("heart", 5000), ("circle", 5000), ("star", 5000), ("heart", 10000)]:
        for start in starts:
            m0, k0 = cpu(); t0 = time.perf_counter()
            plan_request(RouteRequest(start=start, distance_m=distance, shape=shape), roads)
            m1, k1 = cpu()
            print(shape, distance, start, f"wall {time.perf_counter() - t0:.1f}",
                  f"main {m1 - m0:.1f}", f"children {k1 - k0:.1f}", flush=True)

if __name__ == "__main__":  # spawn re-imports the main module
    main()
```

### Parte B — decidere

Con i numeri della parte A, l'utente sceglie una di queste strade:

- non fare niente per ora;
- un pool di processi;
- un pool di processi, e niente partenze vicine quando il server è
  carico;
- un server più grande.

Se si costruisce, valgono i vincoli del coordinatore (2026-10-11):

1. Nessun `Pool` chiuso a metà lavoro (TASK-248, ADR-0212), e ogni job
   ha un tempo massimo.
2. Il numero di processi si sceglie dalla RAM misurata, non solo dai
   core: 8 GB vanno divisi anche con PostgreSQL, e osmium arrivava a
   3,6 GB.
3. Quando il server non è carico i percorsi restano identici a oggi,
   con un test che lo dimostra.

## Criteri di accettazione

- [ ] Parte A: CPU per percorso (thread e figli), percorsi al minuto con
      1, 2, 4 e 8 richieste insieme e picco di RAM per processo, misurati
      sul server e scritti in «Esito».
- [ ] La stima delle persone al giorno è rifatta con quei numeri e
      scritta in «Esito».
- [ ] Parte B: la scelta dell'utente è scritta qui. Se si costruisce,
      c'è ADR-0242 e i tre vincoli sono rispettati, con test.

## File toccati

Parte A:

```
docs/tasks/TASK-276.md
docs/STATUS.md (solo le righe di questo task)
```

Parte B (PR di codice; `jobs.py` non si tocca: è dentro `engine.zip`
del telefono, e un modulo nuovo basta):

```
services/api/shaperoute_api/route_processes.py   (nuovo)
services/api/shaperoute_api/__main__.py          (--route-processes)
services/api/tests/test_route_processes.py       (nuovo)
services/api/tests/route_process_helpers.py      (nuovo)
docs/tasks/TASK-276.md
```

Dopo il merge, in una PR docs: `docs/DECISIONS.md` (ADR-0242),
`docs/STATUS.md`, `docs/INDEX.md`, `docs/API.md` (gli stati di
`/route-jobs`), `docs/tasks/TASK-276.md`.

## Fuori scope

- L'errore «the shape collapses onto a single road node» visto sul server
  il 2026-10-10: è un task del motore a parte, chiesto il 2026-10-11 in
  un'altra sessione.
- Cambiare server o provider.
- Cambiare il motore (`route_engine`), comprese le partenze vicine.

## Esito

### Parte A, giro 1 (2026-11-10)

Con il sì dell'utente («Sì, misura») e il via del Coordinatore. Righe ssh
lanciate dall'utente dal Mac; script `out/TASK-276/route_bench.py`, uscita
in `out/TASK-276/server.out`, analisi intera in `out/TASK-276/RISULTATI.md`
(nella cartella `out/` del checkout principale, non nel repository).

**Limite:** il giro è partito **senza partenze vicine**. Mandato su stdin,
lo script aveva `__file__ = "<stdin>"` e i processi `spawn` morivano
all'avvio (`FileNotFoundError: '/app/<stdin>'`). Misura quindi lo scenario
«niente partenze vicine». Lo script è corretto e provato su stdin sul Mac.

**Il server:** 4 core, 7,9 GB, 5,7–6,2 GB disponibili; API 680 MiB;
carico 0,35 prima, nessun job nei 10 minuti prima.

**Un percorso alla volta** (zona di Trento in memoria; secondi = CPU del
processo principale, il server calcola e non aspetta):

- 9 forme da 5 km: 2,6–12,8 s, media 6,4;
- 3 cuori da 10 km: 8,1–12,5 s, media 10,5;
- cuore da 15 km a Milano: 18,6 s;
- stesso cuore da 5 km: 5,9 s sul server, 1,9–2,8 s sul Mac. **Un core
  del server è 2–3 volte più lento del Mac.**

**Più richieste insieme** (`RouteJobs` a 2 thread, come l'API):

| Insieme | Percorsi/min | Attesa media (max) | Totale medio (max) | Core usati |
|---|---|---|---|---|
| 1 | 9,7 | 0,1 s | 6,2 s | 1,0 |
| 2 | 8,2 | 0,1 s | 13,4 s (14,6) | 1,2 |
| 4 | 8,4 | 7,7 s (19,1) | 19,6 s (28,5) | 1,2 |
| 8 | 7,4 | 26,5 s (56,5) | 42,0 s (64,6) | 1,2 |

- Il tetto è circa 8 percorsi al minuto, comunque arrivino le richieste.
- Il server usa 1,2 core su 4: i due thread si dividono il GIL.
- CPU per percorso: 6,2 s da solo, 9,5 s con 8 insieme (+50%, contesa).

**RAM:** processo con le zone di Trento e di Milano, picco 891 MB. Il picco
dei figli va riletto nel giro 2b.

**Persone al giorno:** circa 480 percorsi l'ora nel picco. Se l'ora di
punta porta il 15% dei percorsi del giorno e ogni persona attiva ne chiede
3 (ipotesi, non misure), il server regge circa 1.000 persone attive al
giorno prima che nei picchi si aspetti più di mezzo minuto. Con le
partenze vicine il numero può solo restare uguale o scendere. Non conta i
percorsi già pronti dell'archivio (ADR-0256). La stima del 2026-10-11
(2.000–3.000) era troppo alta.

**Proposta per la parte B, in ordine:**

1. 3 processi di lavoro già caldi (zone in memoria) al posto dei 2 thread:
   usano i 3 core fermi e tolgono la contesa. Senza partenze vicine il
   tetto passerebbe da circa 8 a circa 25 percorsi al minuto; circa 0,9 GB
   per processo stanno nei 5,7 GB liberi. Con le partenze vicine il
   guadagno lo dice il giro 2b.
2. Più percorsi calcolati sul telefono (TASK-214).
3. Un server con vCPU dedicate (Hetzner CCX), dopo un `vmstat` che misuri
   la CPU tolta da chi condivide la macchina.

Scelta di prodotto, dell'utente: spegnere le partenze vicine quando il
server è carico.

La proposta qui sopra è del giro 1: quella valida è sotto, dopo il giro 2b.

### Parte A, giro 2b (2026-11-10, con le partenze vicine)

Lo script corretto, lanciato dall'utente; uscita in
`out/TASK-276/server-2.out`. Come in produzione: i figli partono. Il
`vmstat` non è stato lanciato: la CPU tolta da chi condivide la macchina
resta da misurare.

**Un percorso alla volta:** 9 forme da 5 km in 5,2–13,3 s (media 8,1),
CPU principale media 6,9 s, CPU dei figli media 11,7 s (rapporto
0,75–2,92, media 2,0): **circa 19 s di CPU per percorso**. Cuori da 10 km
in 11,7–14,7 s. Quasi sempre 1–2 alternative.

| Insieme | Percorsi/min | Attesa media (max) | Totale medio (max) | Core usati |
|---|---|---|---|---|
| 1 | 5,9 | 0,1 s | 10,1 s | 2,2 |
| 2 | 7,7 | 0,1 s | 14,3 s (15,6) | 3,0 |
| 4 | 7,8 | 8,1 s (16,9) | 22,5 s (30,8) | 2,7 |
| 8 | 7,1 | 27,6 s (59,6) | 43,8 s (67,8) | 2,5 |

- **In produzione il tetto è circa 7–8 percorsi al minuto**: il collo di
  bottiglia è il thread principale col GIL (circa 1,1 core), mentre i figli
  usano già circa 1,4 core accanto. Carico 3,07 con 8 richieste insieme.
- RAM: processo con le zone di Trento e Milano 893 MB; figlio più grande
  386 MB in un percorso solo, 893 MB nel giro a più richieste (da capire
  prima di costruire, forse `ru_maxrss` falsato). Liberi 5,6–6,3 GB.

**Il tetto rifatto:** senza contesa un percorso costa circa 18–22 s di CPU
(6,3 principale + 12–16 figli). Con 4 core il massimo è **11–13 percorsi
al minuto**, realisticamente 10–11: **circa +40%** con i processi caldi e
le partenze vicine accese. È il «+33% al massimo» del piano, più la
contesa del GIL tolta. Senza partenze vicine (6,2 s per percorso) 3
processi danno circa 25–29 percorsi al minuto.

**Quanti processi:**

- con le partenze vicine sempre accese, **2 processi** al posto dei 2
  thread: un core intero per ogni principale e i figli, a priorità più
  bassa, sugli altri due. Un terzo toglierebbe core ai figli senza alzare
  il tetto. RAM: circa 4 GB nei 5,6 liberi (`workers_that_fit` limita già i
  figli alla memoria libera);
- con le partenze vicine spente sotto carico, **3 processi**.

**Persone attive al giorno** (ipotesi: 15% nell'ora di punta, 3 percorsi a
testa; senza archivio né telefono):

| Configurazione | Percorsi/min | Persone al giorno |
|---|---|---|
| Oggi | 7–8 | circa 1.000 |
| 2 processi caldi, partenze vicine accese | 10–11 | circa 1.400 |
| 3 processi, partenze vicine spente sotto carico | 25–29 | circa 3.500 |

**Proposta per la parte B, in ordine:**

1. 2 processi caldi al posto dei 2 thread: circa +40%, percorsi identici,
   nessuna scelta di prodotto.
2. Il telefono (TASK-214): ogni percorso fatto lì toglie circa 19 s di
   CPU al server.
3. Scelta di prodotto: partenze vicine spente sotto carico, con un terzo
   processo (×3 nei picchi).
4. Un server con vCPU dedicate, dopo il `vmstat`.

### Parte B, 2 processi caldi (2026-11-10)

Via del Coordinatore dopo l'«ok continua» dell'utente. ADR-0242, deciso
dall'agente su delega dell'utente (la voce intera va in `DECISIONS.md`
nella PR docs dopo il merge):

- **Dove:** un modulo nuovo, `route_processes.py`. `RouteProcesses` è un
  planner (`jobs.Planner`) e `__main__.py` lo passa a `create_app`.
  `RouteJobs`, la sua coda, l'archivio e i suoi 2 thread restano come
  sono: il thread di un job dà la richiesta a un processo e aspetta il
  piano. `jobs.py` e `app.py` non cambiano: `jobs.py` è dentro
  `engine.zip` del telefono (cambiarlo vorrebbe dire ricostruirlo e
  pubblicare l'app), e `app.py` ha una PR aperta di un altro task.
- **Percorsi identici:** il processo usa lo stesso planner
  (`images.plan_request`), le stesse zone (`ActivityGraphs.from_cache`
  della stessa cartella) e lo stesso `jobs._Reporting`. Le indicazioni le
  calcola il processo, che ha le zone, sul piano e su ogni alternativa;
  il thread del job non ha caricato grafi e `with_choices` le lascia come
  sono. Un test confronta, a Levico, risultato, errore e disegno posato di
  un job calcolato nel thread e di uno calcolato nel processo. Il motore
  non cambia: niente prova `test_same_routes`.
- **Stato, annullamento, errori:** il processo manda lo stato
  («downloading_map») e i tempi del job. Il thread manda un «cancel»
  quando l'app ha dimenticato il job, e il processo lo guarda dopo ogni
  caricamento, dove lo guardava il thread. I messaggi hanno il numero del
  loro percorso: un cancel arrivato tardi non tocca il percorso dopo.
  Gli errori del planner arrivano interi (pickle), quindi `error_of` dà
  gli stessi codici (`shape_not_drawable` con la distanza suggerita);
  un errore che non si serializza diventa `engine_error`.
- **Vincolo 1 (TASK-248):** niente `Pool`. Un `Process` per lavoratore,
  avviato a mano, non daemon (deve poter avviare i figli delle partenze
  vicine), nel suo gruppo di processi. Ogni percorso ha al massimo
  `MAX_JOB_S` = 600 s: oltre, il processo e i suoi figli vengono uccisi
  (`killpg`) e il percorso fallisce come `engine_error`. Lo stesso succede
  se il processo muore; il percorso dopo ne avvia uno nuovo. Alla fine
  dell'API, `close()` (anche da `atexit`) li ferma.
- **Vincolo 2 (RAM):** `WORKERS` = 2, dai numeri della parte A. Circa
  0,9 GB per processo con zone grandi, figli fino a circa 0,4 GB l'uno,
  limitati già da `workers_that_fit`; 5,6 GB liberi. Un terzo processo
  toglierebbe core ai figli senza alzare il tetto.
- **Vincolo 3:** il test dei percorsi identici, sopra.
  `--route-processes 0` torna ai thread di prima.
- **Forkserver:** i processi li crea il fork server, un processo pulito
  avviato con `RouteProcesses` all'avvio dell'API, non l'API stessa. Sul
  Mac un processo avviato dall'API dopo che un thread finito aveva letto
  una zona GraphML moriva prima di partire (SIGSEGV tra fork ed exec):
  riprodotto da solo e assente col fork server. Su Linux non succede.
  Lo stesso difetto del Mac tocca le partenze vicine avviate dal thread
  principale, fuori da questo task.
- **Test:** 10 nuovi in `test_route_processes.py`: percorsi identici,
  `POST /routes` senza indicazioni, 2 percorsi insieme in 2 processi,
  «downloading_map», annullamento, errori, tempo massimo, processo morto,
  chiusura. Verdi sul Mac, insieme a `test_main`, `test_jobs` e
  `test_route_jobs`.
- **Prova sul Mac** (10 core, zona di Trento, 4 richieste da 5 km
  insieme): 31,6 percorsi al minuto coi thread, 36,9 coi processi (+17%).
  Sul Mac i figli hanno core in abbondanza; sul server, 4 core, il
  guadagno atteso è circa +40% (parte A, giro 2b). Si misura dopo il
  passaggio sul server, con `RouteJobs` su `RouteProcesses` come nella
  prova del Mac (lo script va adattato: `route_bench.py` misura i thread).
- **Sul server:** il fork server apre il suo socket nella cartella
  temporanea del container (`/tmp`), che deve essere scrivibile per l'uid
  10001. Da controllare al passaggio.

**Esito della parte B:** in `main` dalla #1038 (`b0c56e5c`, 2026-11-10);
ADR-0242 in `DECISIONS.md` con la PR docs dopo il merge.

**Il traffico vero** (log dell'API, 7 giorni fino al 2026-11-10, riga
lanciata dall'utente): 148 percorsi calcolati («queued»), 121 già pronti
(«already drawn»), 8 dall'archivio vicino («kept route reached»). Il 47%
delle richieste non usa il motore; i calcoli sono circa 21 al giorno, molto
sotto il tetto di 7–8 al minuto. La parte B serve per i picchi e per i
concorsi, non per il traffico di oggi. L'archivio allargato «da un punto
qualsiasi del giro» (TASK-427) è stato misurato a parte e non vale la pena
ora: aggiungerebbe 14 forme chiuse su 589.

**Resta:** il passaggio sul server col sì dell'utente, nel passo server 2
del Coordinatore, con i controlli di `out/TASK-276/SERVER-B.md`; poi la
misura dei percorsi al minuto con i processi.

**Sul server (2026-11-10, passo server 2 del Coordinatore):** `main`
039fe4e1. Nei log `route worker 63 started` e `route worker 64 started`,
3 processi forkserver (il fork server e i 2 lavoratori), `/tmp` scrivibile
per l'uid 10001 (controllato prima dell'aggiornamento), nessun
`Traceback`. Prova: un aereo e un cuore da 5,2 km a Trento `done` in
10–12 s, con `graph from disk` nel log del lavoratore. Se servisse tornare
ai thread: `"--route-processes", "0"` nel `command` dell'API, col sì
dell'utente.

**Resta:** la misura dei percorsi al minuto con i processi, quando il
Coordinatore dice «server libero» (dopo le zone del telefono e
`draw_examples`). Script pronto, in sola lettura come `route_bench.py`:
`out/TASK-276/process_bench.py`, righe ssh nella sezione 5 di
`out/TASK-276/SERVER-B.md`. Fa le stesse richieste prima coi 2 thread e
poi coi 2 processi, con 1, 2, 4 e 8 insieme, e stampa i percorsi al
minuto, i core usati, lo `steal` della macchina condivisa e il picco di
RAM dei lavoratori. Provato sul Mac nella versione corta.

**Misura con i processi (2026-11-10 sera, server libero):** script
`out/TASK-276/process_bench.py`, uscita `out/TASK-276/server-b.out`,
tabella intera in `out/TASK-276/RISULTATI.md`. Stesse 9 richieste da 5 km
a Trento, prima coi 2 thread e poi coi 2 processi, nessun errore.

| Insieme | Thread, percorsi/min | Processi, percorsi/min | Tempo totale medio (max), thread → processi |
|---|---|---|---|
| 1 | 6,0 | 5,3 | 9,9 → 11,3 s |
| 2 | 7,7 | 8,4 (+9%) | 15,1 (15,6) → 13,7 (14,2) s |
| 4 | 7,6 | 8,3 (+9%) | 22,7 (31,5) → 20,9 (28,8) s |
| 8 | 7,2 | 9,4 (+31%) | 41,7 (66,8) → 32,5 (51,1) s |

- Il tetto passa da circa 7,5 a 8,5–9,5 percorsi al minuto: meno del +40%
  stimato. Con i processi i core sono quasi pieni (3,4–3,6 su 4) e i figli
  delle partenze vicine si prendono il resto: un terzo processo non
  servirebbe.
- `steal` 0,0% in ogni giro: in quell'ora chi condivide la macchina non
  toglie CPU.
- Picco di RAM di ogni lavoratore: 360 MB con la zona di Trento. Memoria
  disponibile più bassa durante la misura: 4,3 GB.
- Le zone foot sono state rifatte oggi, ma i numeri dei thread sono quelli
  di stamattina (10,0 contro 10,1 s da solo; 7,2 contro 7,1 al minuto con
  8 insieme): il confronto regge.
- Un percorso da solo è circa 1 s più lento nel processo. È una sola
  misura: da rivedere solo se ricapita.

**Resta:** niente di tecnico. La leva più grande nei picchi resta la
scelta di prodotto (partenze vicine spente sotto carico, ×3), poi il
telefono (TASK-214).

## Chiusura (2026-11-10)

Chiuso dal giro delle chiusure del 2026-11-10 (sessione «Task backlog review», su assegnazione del Coordinatore): la parte B è in `main` (#1038) e sul server dal passo server 2; la misura (#1097) dice 8,5–9,5 percorsi al minuto coi 2 processi, contro circa 7,5 coi thread. Niente di tecnico resta; la leva più grande nei picchi è una scelta di prodotto (partenze vicine spente sotto carico), poi il telefono (TASK-214).
