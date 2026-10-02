# TASK-203 — Dove va il tempo del piano dalla partenza

**Stato**: Done — A1 e A2 nel motore, stessi percorsi; le (B) all'utente (2026-10-03)
**Fase**: 4 · **Branch**: `feat/TASK-203-start-plan-time`
**ADR**: ADR-0162 (ciò che il motore tiene per grafo)
**Dipende da**: TASK-201 («Seguito»: il tempo è nel piano della partenza)

## Obiettivo

Sapere dove vanno i 5–8 s del piano dalla partenza (TASK-201) e proporre
come scendere, separando ciò che lascia i percorsi identici punto per punto
(A) da ciò che li cambia (B, scelta dell'utente). Poi, scelte dal
coordinatore, le due (A) misurate, A1 e A2, nel motore: stessi percorsi,
meno tempo.

Assegnato dal coordinatore il 2026-10-03 su delega dell'utente.

## Contesto da leggere

- `docs/tasks/TASK-201.md`, «Misure» ed «Esito»
- `docs/ROUTE_ENGINE.md` §4 (snapping), §5 (ricerca, partenze vicine,
  alternative), §6 (validazione)
- `docs/STATUS.md`, seguiti di TASK-168: un esempio costa 7–19 s sul server
  e 1–2,5 s sul Mac

## Cosa fare

1. Misurare sul Mac, senza rete, su Trento in cache, per la strada
   dell'API: cuore 10 km, cerchio 15 km, «CIAO» 12 km, stella 5 km dal
   centro, ognuno almeno 3 volte, a freddo e a caldo. **Fatto** (sotto).
2. Dividere il tempo per fase e trovare le funzioni calde, con il numero di
   chiamate. **Fatto**.
3. Proporre, in ordine di guadagno, (A) o (B), con risparmio, rischio e
   prova. **Fatto** (sotto, «Proposte»).
4. Il coordinatore sceglie: A1 e A2 in questo task, con un test che fissa
   i percorsi sul codice di prima. **Fatto** (sotto, «A1 e A2 nel
   motore»). Le (B) vanno all'utente con i campioni; le altre (A) sono
   seguiti.

## Criteri di accettazione

- [x] Tempi dei quattro casi, a freddo e a caldo, almeno 3 volte, con il
      load average (più «CIAO» con la penna alzata, che l'app chiede da
      TASK-202).
- [x] Tempi per fase e funzioni calde con il numero di chiamate.
- [x] Proposte (A)/(B) con risparmio atteso, rischio e prova.
- [x] Decisione del coordinatore: A1 e A2 qui, le (B) all'utente.
- [x] A1 e A2: percorso scelto, alternative e punteggi di ogni partenza
      identici nei cinque casi di Trento (impronte di prima e di dopo
      sotto).
- [x] Un test deterministico fissa i percorsi, scritto e verde sul codice
      di prima (`tests/test_kept_per_graph.py`, 7 casi senza rete).
- [x] `pytest -m "not network"` verde nel motore e nell'API; le richieste
      del registro rifatte prima e dopo danno gli stessi percorsi; i tempi
      di dopo nel task file.

## File toccati

- `services/route-engine/route_engine/network.py`
- `services/route-engine/tests/test_kept_per_graph.py` (nuovo)
- `docs/tasks/TASK-203.md` (nuovo)
- `docs/DECISIONS.md` (ADR-0162)
- `docs/STATUS.md` (la riga di questo task)

`docs/ROUTE_ENGINE.md` non descrive queste cache: non cambia. Gli script di
misura stanno fuori dal repository (scratchpad della sessione), come in
TASK-201; il modo di rifarli è qui sotto.

## Fuori scope

- Le altre proposte (A): seguiti, ognuna con un task suo.
- Misurare sul server (sola lettura nel container, con l'ok dell'utente).
- Le scelte (B): sono dell'utente.

## Come è misurato

Mac con Apple M4 (10 core, 16 GB), Python 3.12.14, `main` a `3f905d7`,
2026-10-03 fra le 00:13 e le 00:36. Zona di Trento
`foot_45.98370_11.00140_46.15030_11.24160` (pickle da 19 MB), partenza
46.0671, 11.1214 come in TASK-201. Nessuna rete: proxy su una porta chiusa e
una sorgente che rifiuta ogni download; la cartella della cache dello script
ha solo collegamenti ai file della cache del checkout principale, letti e
mai scritti.

Lo script fa ciò che fa l'API (`RouteJobs._run`): `ZoneGraphs` su
`OsmnxSource`, `plan_nearby(ShapeJob.of_request(richiesta), …)` con 3
partenze vicine in processi `spawn`, poi `with_choices` (indicazioni) e
`to_gpx`. Fuori da FastAPI, di proposito (TASK-197). I tempi delle fasi
vengono da cronometri avvolti attorno alle funzioni del motore **nel solo
processo dello script** (il codice non cambia); le funzioni da `cProfile`
(`pstats` per tempo cumulato e proprio), il garbage collector da
`gc.callbacks`. **Freddo**: un processo nuovo per richiesta, zona letta dal
disco. **Caldo**: lo stesso processo, zona già in memoria; giri 1–3 di 4,
media. Il motore non scrive fasi nel log: l'API scrive solo il ritaglio
(«cropped in»), il punteggio di ogni partenza e il totale del lavoro.

«CIAO» è in lettere tonde senza penna alzata, come in TASK-201; «CIAO» con
la penna alzata (`pen_up`, ADR-0157) è un quinto caso, perché dall'app ora
parte acceso (TASK-202). Ogni caso dà sempre lo stesso percorso: impronte
(`request_log.fingerprint`) uguali in tutte le 177 richieste registrate.
Nessun segfault in circa 190 richieste con i processi `spawn`.

## Misure

### I totali

Secondi; «Vicine» è la più lenta delle tre partenze vicine (nel suo
processo, grafo compreso); «CPU» somma partenza e vicine, il lavoro che sul
server si spartiscono 4 vCPU.

| Caso | Nodi (vicino + lontano) | Freddo: richiesta (processo) | Caldo: richiesta | Caldo: piano partenza | Vicine | CPU | Load avg 1 min |
|---|---|---|---|---|---|---|---|
| cuore 10 km | 17 479 + 21 619 | 5,12–5,45 (5,43–5,79) | 4,88–5,00 | 4,40–4,52 | 2,07–2,13 | 10,3–10,6 | 1,4–3,6 |
| cerchio 15 km | 22 617 + 27 191 | 6,64–6,96 (6,96–7,29) | 6,45–6,61 | 5,75–5,91 | 3,11–3,23 | 14,1–14,6 | 1,4–3,8 |
| «CIAO» 12 km | 14 927 + 19 345 | 7,96–8,23 (8,27–8,54) | 7,73–7,91 | 7,34–7,52 | 3,57–3,74 | 16,3–16,9 | 1,6–3,8 |
| stella 5 km | 10 870 | 1,34–1,39 (1,63–1,69) | 0,89–0,92 | 0,43–0,45 | 0,50–0,52 | 1,8–1,9 | 2,0–3,6 |
| «CIAO» penna alzata 12 km | 21 474 | 4,50–4,79 (4,79–5,10) | 4,26–4,34 | 2,14–2,18 | 3,46–3,54 | 11,6–11,9 | 2,0–3,8 |

Il load average saliva per i 4 processi delle misure stesse; quello degli
altri agenti era sceso (1,2–2,2 all'inizio, dopo una media di 56 nei 5
minuti precedenti).

**Freddo contro caldo.** La prima volta costa 0,2–0,5 s in più nella
richiesta: la lettura della zona, 0,41–0,46 s (`import osmnx` 0,25, il
pickle 0,21; `ZoneCrop` 0,01); il processo nuovo ne aggiunge altri 0,3
(interprete e import, 0,17). Tutto il resto si paga **a ogni richiesta**.

### Le fasi (a caldo, media di 3)

Secondi nel processo della richiesta.

| Fase | cuore | cerchio | «CIAO» | stella | penna alzata |
|---|---|---|---|---|---|
| Richiesta intera | 4,96 | 6,53 | 7,83 | 0,91 | 4,29 |
| Ritaglio del grafo (zona in memoria) | 0,05 | 0,07 | 0,05 | 0,03 | 0,07 |
| Partenze vicine: trovarle | 0,10 | 0,12 | 0,02 | 0,01 | 0,11 |
| Grafo in byte per i processi (`OneGraph`) | 0,15 | 0,21 | 0,13 | 0,09 | 0,19 |
| Pool aperto | 0,01 | 0,01 | 0,01 | 0,01 | 0,01 |
| **Piano della partenza** | **4,48** | **5,83** | **7,44** | **0,44** | **2,16** |
| · ricerca vicina (tracciamenti) | 2,39 (20) | 3,23 (18) | 3,49 (15) | 0,43 (3) | 2,13 (5 × 4 lettere) |
| · ricerca lontana, ADR-0040 (tracciamenti) | 2,02 (18) | 2,49 (12) | 3,88 (19) | — | — |
| · ritaglio del grafo lontano | 0,06 | 0,09 | 0,06 | — | — |
| · validazione | < 0,01 | 0,01 | 0,01 | < 0,01 | 0,01 |
| Attesa delle vicine dopo il piano | 0,00 | 0,00 | 0,00 | 0,24 | 1,52 |
| Alternative | 0,02 | 0,02 | 0,06 | 0,01 | 0,05 |
| Indicazioni (`with_choices`) | 0,14 | 0,27 | 0,11 | 0,07 | 0,17 |
| GPX | < 0,01 | < 0,01 | < 0,01 | < 0,01 | < 0,01 |
| *di cui garbage collector* | 0,30 | 0,36 | 0,32 | 0,03 | 0,16 |

Le due ricerche, vicina e lontana insieme:

| Dentro le ricerche | cuore | cerchio | «CIAO» | stella | penna alzata |
|---|---|---|---|---|---|
| `RoadMask` (una per ricerca) | 0,41 | 0,55 | 0,51 | 0,08 | 0,17 |
| Conteggio delle strade dei piazzamenti (e resto) | 0,27 | 1,06 | 1,65 | 0,01 | 0,06 |
| Tracciamenti (`snap_to_network`) | 3,46 | 3,78 | 4,87 | 0,32 | 1,82 |
| Somiglianza | 0,27 | 0,34 | 0,33 | 0,01 | 0,07 |

Dentro i tracciamenti (secondi in tutto, fra parentesi le chiamate):

| Dentro i tracciamenti | cuore | cerchio | «CIAO» | stella | penna alzata |
|---|---|---|---|---|---|
| Tracciamenti | 38 | 30 | 34 | 3 | 20 lettere |
| Controllo delle cache del corridoio (`graph.number_of_edges()`) | 0,94 (78) | 0,99 (62) | 0,79 (70) | 0,06 (7) | 0,64 (41) |
| Campioni e passi ricalcolati, primo tracciamento di ogni grafo | 0,42 (2) | 0,55 (2) | 0,36 (2) | 0,12 (1) | 0,25 (1) |
| Distanza delle strade dal contorno (corridoio) | 0,34 | 0,36 | 0,96 | 0,03 | 0,08 |
| Resto del corridoio (dizionario dei costi) | 0,14 | 0,14 | 0,12 | 0,01 | 0,09 |
| Nodo più vicino a ogni punto (`nearest_nodes`) | 0,38 | 0,39 | 0,72 | 0,02 | 0,23 |
| Zone: Dijkstra (`nx.shortest_path`) | 0,33 (2 444) | 0,39 (1 920) | 0,42 (10 064) | 0,02 (192) | 0,06 (900) |
| Zone: il resto (coordinate, distanze, nodo pozzo) | 0,48 | 0,51 | 0,92 | 0,03 | 0,27 |
| Potatura degli speroni | 0,19 | 0,18 | 0,21 | 0,01 | 0,03 |
| Altro | 0,11 | 0,10 | 0,27 | 0,01 | 0,09 |

Le prime due righe si sovrappongono di poco (2 conteggi su 78 sono dentro
i campioni ricalcolati).

**Che cosa dicono.**

- **La ricerca lontana è metà del piano** nei tre casi lunghi: 2,0 / 2,5 /
  3,9 s. Parte perché la ricerca vicina non arriva a 0,90 e ±10%, e a
  Trento non dà mai il percorso scelto: cuore e «CIAO» tengono il percorso
  della ricerca vicina, il cerchio prende quello lontano (partenza spostata
  di 1 km, 0,925), ma vince una partenza vicina (0,957) e quello lontano
  resta la seconda alternativa.
- **Un tracciamento costa 70–145 ms**, e quasi tutto è lavoro che cresce
  con i nodi del grafo e si rifà a ogni tracciamento: il **controllo delle
  cache** del corridoio conta gli archi del grafo nodo per nodo
  (`number_of_edges()` di NetworkX su un `MultiDiGraph`, 7–12 ms, due
  volte per tracciamento) ed è **l'11–30% del piano della partenza**; la
  **lista delle coordinate di tutti i nodi** si rifà due volte per
  tracciamento (`nearest_nodes`, `_route_through_zones`: 985 895 chiamate
  a `_node_latlon` per un cuore). Il Dijkstra vero è il 3–10% dei
  tracciamenti.
- **Il garbage collector** pesa fino a 0,36 s, due terzi nelle raccolte
  complete, che passano per tutta la zona in memoria.
- **Le parole** costano di più per tracciamento: circa 300 punti invece di
  64, quindi 300 Dijkstra e 300 distanze da tutti i nodi; e il conteggio
  delle strade sposta ogni lettera fra 49 posti (2 868 `letter_moves`,
  11 472 `fits_xy`, 1,6 s). Con la penna alzata il conteggio è leggero, ma
  ogni tentativo traccia 4 lettere.
- **L'attesa delle vicine** conta solo quando la partenza è già buona
  (stella, penna alzata): le vicine fanno fino a 20 tracciamenti a priorità
  bassa e si aspettano fino a 3 s per le alternative (`NEARBY_GOOD_GRACE_S`).

### Che cosa è fisso e che cosa cresce

| Costo | Quanto | Cresce con |
|---|---|---|
| Prima richiesta di una zona | 0,4–0,5 s | la zona (una volta per processo) |
| Ritaglio, pickle, partenze vicine | 0,1–0,4 s | i nodi del ritaglio |
| `RoadMask` | 0,08–0,36 s per ricerca | i nodi (la ricerca lontana ne fa un'altra) |
| Campioni del corridoio | 0,12–0,30 s per grafo | i nodi |
| Ogni tracciamento | 70–145 ms | i nodi (controlli, coordinate, distanze) e i punti della forma (Dijkstra: 64 per una forma, ~296 per «CIAO») |
| Quanti tracciamenti | 3–38 | la convergenza: senza un percorso buono vicino, fino a 20 + 20 |
| Conteggio delle strade | 0,01–1,65 s | piazzamenti (cerchio: 24 rotazioni) e lettere (49 spostamenti ciascuna) |
| Indicazioni, alternative, GPX | 0,1–0,3 s | i punti del percorso |

### Le funzioni calde (`cProfile`, cuore a caldo)

Sotto il profiler la richiesta dura 8,8 s invece di 5: pesa di più sulle
funzioni Python piccole. Tempo proprio, senza le attese dei processi.

| Funzione | Tempo proprio | Chiamate | Da dove |
|---|---|---|---|
| `sum` + `reportviews.__iter__` / genexpr / `__getitem__` di NetworkX | 2,25 s (2,8 cumulato) | 1,5 M iterazioni da 78 `number_of_edges` | `_edge_steps`, `_distinct_samples` |
| `distance_to_segments` | 0,48 s | 7 676 | corridoio, somiglianza |
| `bidirectional_dijkstra` | 0,26 s (0,54) | 2 484 | `_route_through_zones` |
| `nearest_nodes` | 0,25 s (0,53) | 40 | `snap_to_network` |
| `_route_through_zones` | 0,21 s (1,23) | 38 | `snap_to_network` |
| `_node_latlon` | 0,17 s (0,43) | 985 895 | `nearest_nodes`, `_route_through_zones` |
| `shapely coords.__iter__` | 0,16 s | 770 646 | `RoadMask`, `_edge_samples` |
| `weight` (costo di un arco nel Dijkstra) | 0,14 s (0,20) | 582 448 | `bidirectional_dijkstra` |
| `prune_parallel_spurs` | 0,13 s (0,27) | 80 | `snap_to_network` |

Negli altri casi cambia l'ordine, non i nomi: per «CIAO» in testa
`distance_to_segments` (1,20 s, 11 158 chiamate), `_route_through_zones`
(0,60 proprio, 2,07 cumulato), `near_xy` e `fits_xy` delle lettere (0,84 s,
11 608 chiamate ciascuna); per il cerchio `fit_xy` (0,33 s proprio, 0,98
cumulato, 27 078 chiamate). Il piano di una partenza vicina
(`ShapeJob.here`, provato nello stesso processo per cuore e «CIAO») ha la
stessa distribuzione: `number_of_edges` circa un terzo sotto profiler.

## Proposte

In ordine di guadagno atteso sul Mac. (A): stessi percorsi punto per punto.
(B): cambia i percorsi, scelta dell'utente con campioni. L'ultima colonna
dice che cosa ne è stato (2026-10-03, decisione del coordinatore).

| # | Proposta | Tipo | Risparmio atteso | Rischio | Stato |
|---|---|---|---|---|---|
| 1 | Niente ricerca lontana quando vicino c'è già un percorso disegnabile (o `FAR_TRACES` 20 → 10) | B | 2,0 / 2,5 / 3,7 s (cuore, cerchio, «CIAO»); 0 dove la partenza è buona | si perde lo «Start here» a 1–2 km dove vicino si disegna male | **da decidere dall'utente, con campioni** |
| 2 | La ricerca lontana in anticipo, in un processo suo, buttata se non serve | A | fino a 2,0–3,9 s sul Mac | alto sul server: un quinto processo su 4 vCPU | seguito, dopo una misura sul server |
| 3 | **A1** — le cache del corridoio senza ricontare gli archi a ogni tracciamento | A | **0,5–0,9 s misurati** | basso | **fatta** (ADR-0162) |
| 4 | Campioni, passi e `RoadMask` dalla zona, non da ogni ritaglio | A | 0,2–1,1 s, più 0,2–0,5 in ogni vicina (stima) | medio | seguito |
| 5 | **A2** — le coordinate dei nodi una volta per grafo | A | **0,4–0,6 s misurati** (oltre A1) | basso | **fatta** (ADR-0162) |
| 6 | Attesa per le alternative più corta (`NEARBY_GOOD_GRACE_S` 3 → 1 s) | B | fino a 1,5 s, solo con la partenza già buona | meno alternative | **da decidere dall'utente, con campioni** |
| 7 | Parole: spostamenti delle lettere e distanza dal contorno in un colpo solo | A | 0,5–1,0 s su «CIAO» tondo (stima) | basso-medio | seguito |
| 8 | Cerchio: conteggio delle strade dei piazzamenti in un colpo solo | A | 0,3–0,5 s (stima) | basso-medio | seguito |
| 9 | Garbage collector fuori dalla zona in memoria | A | ~0,1 s sul Mac, di più sul server | basso | seguito |
| 10 | Il pickle del grafo fuori dal cammino della richiesta | A | 0,1–0,2 s | basso | seguito |

**1 (B) — Ricerca lontana.** Oggi parte appena la ricerca vicina non è
buona (ADR-0040), anche se ha già un percorso da 0,83. Varianti: partire
solo quando vicino nessun percorso è disegnabile (sotto 0,60 o oltre
±2 km), o con metà tracciamenti. La richiesta scende quasi quanto il piano
(«CIAO» 3,7 s invece di 3,9: poi aspetta la vicina più lenta). A Trento
cuore e «CIAO» darebbero lo stesso percorso e le stesse alternative; il
cerchio cambierebbe le alternative (la seconda oggi è quella lontana). Campioni da portare all'utente: le città degli esempi con e
senza, e dove cambia il percorso scelto.

**2 (A) — Ricerca lontana in parallelo.** Stessa ricerca, cominciata
subito in un processo suo con il grafo grande, e fermata se la ricerca
vicina converge. Sul Mac (10 core) toglie quasi tutta la ricerca lontana
dall'attesa; sul server aggiunge un processo a quattro che già si
contendono 4 vCPU. Da valutare solo dopo una misura sul server.

**3 (A1) — I controlli delle cache.** `_edge_steps` e `_distinct_samples`
tengono i loro dati per grafo, ma a ogni tracciamento verificano che il
grafo non sia cambiato con `graph.number_of_edges()`, che NetworkX calcola
contando gli archi di ogni nodo (7–12 ms). L'unica modifica che il motore fa
a un grafo durante una ricerca è il nodo pozzo di `_route_through_zones`,
tolto sempre prima del tracciamento successivo. Proposta: la ricerca calcola
quei dati una volta per grafo e li passa ai tracciamenti, senza ricontare
(nella prova qui sotto: la cache per grafo senza il controllo).

**5 (A2) — Le coordinate dei nodi.** `nearest_nodes` e
`_route_through_zones` rifanno a ogni chiamata la lista degli id e
l'array delle coordinate di tutti i nodi; tenerli per grafo come i campioni
dà gli stessi numeri.

**A1 e A2 provati per davvero, fuori dal repository.** Lo script ha
sostituito, nel suo processo e in quelli delle vicine, le funzioni del
motore con le versioni proposte (il codice del motore non è cambiato).
Stesso percorso scelto, stesse alternative, stessi punteggi di tutte le
partenze, nei cinque casi, a ogni giro:

| Caso | Prima | Con A1 | Con A1 + A2 | CPU prima → dopo |
|---|---|---|---|---|
| cuore 10 km | 4,93 s | 4,26 | 3,78 | 10,5 → 8,1 s (−23%) |
| cerchio 15 km | 6,54 | 5,80 | 5,33 | 14,5 → 11,4 (−21%) |
| «CIAO» 12 km | 7,84 | 7,34 | 6,92 | 16,7 → 14,6 (−12%) |
| stella 5 km | 0,91 | 0,92 | 0,90 | 1,9 → 1,8 (−5%) |
| «CIAO» penna alzata | 4,29 | 3,42 | 2,78 | 11,7 → 6,7 (−43%) |

Load average 2,8–3,7 durante i giri. Le vicine scendono quanto la
partenza, per questo la penna alzata guadagna anche nell'attesa.

**4 (A) — Dalla zona.** Oggi ogni ritaglio è un grafo nuovo, e la ricerca
ricalcola per lui campioni, passi e `RoadMask` (0,2–0,6 s per grafo, due
grafi con la ricerca lontana, e ogni vicina il suo). Si possono calcolare
una volta per zona (`ZoneCrop`) e scegliere le righe del ritaglio. Rischio
medio: `RoadMask` campiona ogni strada nel verso in cui la incontra per
prima, e l'ordine dei nodi di un ritaglio piccolo non è quello della zona
(`_in_view_order`); se cambia un campione può cambiare una cella, e allora
la proposta diventa (B).

**6 (B) — L'attesa per le alternative.** Con la partenza già buona le
vicine si aspettano fino a 3 s solo per le alternative (TASK-093, scelta
dell'utente). Dopo A1 + A2 l'attesa della penna alzata scende già da 1,5 a
circa 1,1 s.

**7, 8 (A) — Conteggi in un colpo solo.** `letter_moves` chiama `fits_xy`
una volta per lettera e per piazzamento (11 472 volte per «CIAO»), e
`best_placement` chiama `fit_xy` per ogni piazzamento (27 078 per il
cerchio): gli stessi conti su array più grandi, una volta. La distanza dal
contorno di una parola (296 lati) si può limitare ai lati vicini, con lo
stesso minimo. Da provare con le impronte: i conti in virgola mobile devono
restare gli stessi.

**9 (A) — Garbage collector.** Le raccolte complete passano per tutta la
zona in memoria; `gc.freeze()` dopo la lettura di una zona le porta da
circa 0,2 a 0,1 s per richiesta (provato), ma sul Mac il totale resta nel
rumore. Si fa in `services/api/shaperoute_api/graphs.py`, fuori dal
motore. Rischio: una zona tolta dalla memoria resta fra gli oggetti
congelati finché non si scongelano.

**10 (A) — Il pickle.** `OneGraph` trasforma il grafo in byte prima del
piano della partenza (0,09–0,21 s, già notato da TASK-201).

**Primo passo consigliato** (fatto, sotto «A1 e A2 nel motore»): A1 e A2
insieme, un task e un aggiornamento del server. Sono misurati, lasciano i
percorsi identici, tolgono 0,9–1,5 s alle richieste lunghe sul Mac e il
12–43% della CPU di una richiesta (dalla prova fuori dal repository), che
sul server (4 vCPU condivise fra la partenza e tre vicine) dovrebbe
contare di più.

**Come provare le (A).**

1. Le impronte (`request_log.fingerprint`) del percorso scelto e delle
   alternative dei cinque casi, prima e dopo, sullo stesso `main`
   (tabella sotto).
2. I test del motore, `pytest -m "not network"` in
   `services/route-engine` (fra cui `test_zone_crop`, `test_pen_up`,
   `test_nearby_starts` con `processes=False`).
3. `replay.py` sulle richieste del registro, come in TASK-093.
4. Per la 4 anche alcune città degli esempi, una grande e una piccola.

Ogni modifica in `route_engine` cambia `engine_fingerprint()`: i percorsi
tenuti si buttano e dopo l'aggiornamento del server va rilanciato
`draw_examples` (circa 35 minuti, `AGENTI.md` regola 11), anche con
percorsi identici. Meglio raccogliere le (A) in un aggiornamento solo. La 9
sta nell'API e l'impronta non la vede.

**Impronte di prima e di dopo** (Trento centro; prima: `main` a
`3f905d7`; dopo: questo branch, con A1 e A2):

| Caso | Scelto, prima | Scelto, dopo | Alternative, prima | Alternative, dopo |
|---|---|---|---|---|
| cuore 10 km | `0c9cb198491a0906` (0,883; 8 652 m; vicina 2) | `0c9cb198491a0906` | `71f46a1810bc0532` · `ecc51e4b109a0737` | `71f46a1810bc0532` · `ecc51e4b109a0737` |
| cerchio 15 km | `78255caddef6e01e` (0,970; 14 594 m; vicina 1) | `78255caddef6e01e` | `596b462eddebd6d4` · `15ed4e9c6ec49d30` | `596b462eddebd6d4` · `15ed4e9c6ec49d30` |
| «CIAO» 12 km | `c6a22a5b3aeb0103` (0,835; 11 384 m; partenza) | `c6a22a5b3aeb0103` | `1212305a33f45982` · `50b0954c4ddc45e7` | `1212305a33f45982` · `50b0954c4ddc45e7` |
| stella 5 km | `7b54a0cf04b185ae` (0,992; 4 938 m; partenza) | `7b54a0cf04b185ae` | `5f113df32363c56d` · `8f800c711720425f` | `5f113df32363c56d` · `8f800c711720425f` |
| «CIAO» penna alzata 12 km | `d3d24e68de65fbeb` (0,974; 14 777 m; partenza) | `d3d24e68de65fbeb` | `5a603e81d9134dfd` · `e1db67986d16843c` | `5a603e81d9134dfd` · `e1db67986d16843c` |

Uguali anche i punteggi di tutte le partenze (la partenza e le tre
vicine), a ogni giro.

## A1 e A2 nel motore

Scelte dal coordinatore il 2026-10-03 (ADR-0162). Cambia solo
`network.py`:

- **A1.** I dati che il motore tiene per grafo (campioni degli archi,
  punti distinti, passi u→v del corridoio) valgono finché il grafo ha lo
  stesso segno in `graph.__networkx_cache__`, che NetworkX svuota a ogni
  nodo o arco aggiunto o tolto (`_mark`, `_kept`). Niente più
  `number_of_edges()` a ogni tracciamento. Il nodo pozzo di
  `_route_through_zones` entra e esce: tolto, il grafo è quello di prima e
  il segno gli si ridà (`_same_graph`). Per una vista (`subgraph`) non si
  tiene niente.
- **A2.** Id e coordinate dei nodi una volta per grafo (`_node_table`), per
  `nearest_nodes` e `_route_through_zones`: gli stessi numeri nello stesso
  ordine.

**Il test che li tiene** (`tests/test_kept_per_graph.py`): `BEFORE` fissa
l'impronta di `plan_nearby` (con `processes=False`, la strada dell'API) di
7 richieste senza rete, calcolata sul codice di `main` a `3f905d7` **prima**
della modifica, con lo stesso test verde lì: un cuore su una griglia
regolare (tanti costi uguali), cuore, cerchio, stella, «CIAO» e «CIAO» con
la penna alzata su una città finta (griglia mossa, parchi, un fiume con i
ponti, un terzo delle strade tolte, sempre uguale da un seme fisso: la
ricerca lontana parte, alcune vicine non disegnano), un cuore sulla fixture
di Levico. L'impronta copre percorso scelto, alternative, punteggi e note
di tutte le partenze. Altri test: un tracciamento non conta gli archi; ciò
che è tenuto resta dopo il nodo pozzo; un grafo cambiato da NetworkX si
rivede; una vista segue il suo grafo; le coordinate tenute sono quelle dei
nodi; e lo stesso piano, con niente tenuto per nessun grafo (tutto rifatto
a ogni chiamata), dà la stessa impronta (Levico e il cerchio della città),
su qualunque piattaforma.

**Il cuore di Levico fra Mac e CI.** In CI (Linux, Python 3.11, NetworkX
3.6, NumPy 2.4) quel percorso viene diverso da quello del Mac (Python 3.12,
NetworkX 3.7, NumPy 2.5) **già con il codice di prima**: un commit di prova
nella PR, con il `network.py` di prima, ha dato in CI `c252f402c7b05d09`
come il codice nuovo (poi tolto). Le altre 6 impronte sono uguali nei due
posti. Il test accetta per quel caso le due impronte di prima, una per
ambiente; il test «niente tenuto» lo prova in ogni ambiente. Perché le
librerie lo cambino non è cercato qui (seguito, se serve).

**Tempi dopo**, stesso script e stessa macchina, prima e dopo uno dietro
l'altro (giri 1–3 di 4, zona in memoria, load average 3,2–3,9):

| Caso | Richiesta prima | Richiesta dopo | Piano partenza prima → dopo | CPU prima → dopo |
|---|---|---|---|---|
| cuore 10 km | 4,95–5,06 s | 3,66–3,69 (−26%) | 4,51 → 3,19 | 10,6 → 7,8 s (−27%) |
| cerchio 15 km | 6,55–6,73 | 5,19–5,23 (−22%) | 5,96 → 4,51 | 14,9 → 11,1 (−25%) |
| «CIAO» 12 km | 7,86–7,96 | 6,78–6,80 (−14%) | 7,53 → 6,41 | 16,9 → 14,4 (−15%) |
| stella 5 km | 0,91–0,92 | 0,86–0,90 (−4%) | 0,44 → 0,36 | 1,9 → 1,7 (−10%) |
| «CIAO» penna alzata 12 km | 4,29–4,35 | 2,76–2,79 (−36%) | 2,19 → 1,22 | 11,9 → 6,7 (−43%) |

Un altro giro di dopo, con il Mac più scarico (load 2,3–3,2): cuore
3,48–3,57 s, cerchio 4,98–5,07, «CIAO» 6,54–6,67, stella 0,83–0,85, penna
alzata 2,64–2,68.

**Test.** `pytest -m "not network"`: motore 1152 passati (sul codice di
prima 1147, più i nuovi: 3 lì fallivano come atteso, 2 aggiunti dopo); API
761 passati (prima del merge di `origin/main`, che ha portato solo i file
Strava dell'API).

**Il registro delle richieste.** Le 61 richieste del registro locale
(`data/requests/requests.jsonl`) rifatte come fa `replay.py`
(`shaperoute_api.replay.replay`, con le partenze vicine), sulle zone in
cache e senza rete, una volta con il codice di prima e una con quello di
dopo: 59 disegnate (56 forme, una parola, 2 immagini), 2 senza zona in
cache (`MapDataUnavailableError` tutte e due le volte). Le 59 danno lo
stesso percorso scelto e le stesse 93 alternative, prima e dopo; 52 sono
anche quelle registrate (le altre 7 vengono da motori più vecchi, prima
come dopo). In tutto 98 s prima, 85 dopo.

## Che cosa non è misurato

- **Il server**: non toccato. I secondi di CPU della tabella dei totali
  dicono quanto lavoro si spartiscono lì 4 processi su 4 vCPU condivise;
  quanto pesi ogni proposta lì resta da misurare.
- **Le fasi dentro le vicine al loro posto**: solo i loro secondi; la
  distribuzione viene dal loro piano rifatto nel processo dello script.
- **Dentro FastAPI**: di proposito (il segfault dei processi in TASK-197).
- **Le proposte 2, 4, 7, 8, 10**: stime, non provate.
- **Altre zone**: solo Trento.

## Note per il deploy

- Cambia l'impronta del motore (`engine_fingerprint()`, il contenuto di
  `route_engine`): dopo l'aggiornamento del server i percorsi tenuti si
  buttano e va rilanciato `draw_examples` (circa 35 minuti, `AGENTI.md`
  regola 11), anche se i percorsi sono identici.
- Meglio **un aggiornamento solo** del server, con `draw_examples` dopo,
  quando ci sono questo task e TASK-191 A2: tutti e due cambiano
  l'impronta.
- Niente da migrare, nessuna variabile nuova, niente nell'app.

## Esito

Fatto il 2026-10-03. Il tempo del piano dalla partenza è misurato e diviso
per fase: metà dei casi lunghi è la ricerca lontana, il resto quasi tutto
lavoro rifatto a ogni tracciamento. A1 e A2 sono nel motore (ADR-0162):
stessi percorsi punto per punto, richieste lunghe di Trento più veloci del
14–36% sul Mac e 15–43% di CPU in meno, che sul server (4 vCPU fra la
partenza e tre vicine) dovrebbe contare di più; non misurato lì. **Da
decidere dall'utente, con campioni**: la proposta 1 (niente ricerca lontana
quando vicino c'è già un percorso disegnabile, o `FAR_TRACES` 20 → 10) e la
6 (`NEARBY_GOOD_GRACE_S` 3 → 1 s). **Seguiti**: le (A) non provate, 2, 4,
7, 8, 9 e 10 della tabella «Proposte».
