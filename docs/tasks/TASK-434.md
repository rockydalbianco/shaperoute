# TASK-434 — Dove va il tempo di un percorso nel Route Engine

**Stato**: Done — misura fatta sul Mac il 2026-11-10; nessun codice toccato
**Fase**: 5 · **Branch**: `docs/TASK-434-engine-profile` (solo questo file)

## Obiettivo

Sapere, con numeri misurati, dove va il tempo di CPU di un percorso dentro
il motore, e avere una lista ordinata di modifiche che lo accorcerebbero.
Le modifiche qui sono solo proposte: nessuna è stata fatta.

## Contesto

TASK-276 ha misurato quanto costa un percorso sul server (circa 19 s di CPU
per 5 km a Trento: 6,9 s il processo della richiesta, 11,7 s i figli delle
partenze vicine) ma non dove va quel tempo. Il traffico vero è circa 21
calcoli al giorno: oggi conta il tempo del singolo percorso, non la coda.

- `out/TASK-276/RISULTATI.md` nel checkout principale: i numeri del server.
- `services/route-engine/route_engine/nearby_starts.py`: le partenze vicine.
- `services/api/shaperoute_api/images.py`, `plan_request`: cosa si misura.

## Come è stato misurato

Sul Mac, senza server e senza rete, col codice di `main` a `a510d11b`.
Script e uscite in `out/TASK-434/` del checkout principale (`README.md`
dice come rifarli; `REPORT.md` ha tutte le tabelle).

- **Richieste**: le stesse di `out/TASK-276/route_bench.py`. Cuore, cerchio
  e stella da 5 km dalle 3 partenze di Trento (9 percorsi: le medie sono su
  questi) più un cuore da 10 km.
- **Zona**: una sola zona foot di Trento della cache locale (18 MB, 18 km di
  lato), già in memoria, col wrapper `CachedOnly`: mai Overpass. La cache
  del Mac ha 960 zone foot piccole e annidate, una per ogni vecchia
  richiesta: lasciandole tutte, ogni richiesta rileggeva dal disco una zona
  diversa (0,11 s in più, primo giro in `run1-many-zones/`). Sul server le
  zone sono poche e grandi, quindi la misura buona è quella a zona unica.
- **Tre passate**: tempi delle fasi senza profiler (due volte, medie entro
  il 2%); `cProfile` con un profilo per il piano dalla partenza e uno
  per il resto del processo; i figli delle partenze vicine uno alla volta,
  ognuno in un processo `spawn` pulito, una volta senza profiler e una con.
- **Il profiler pesa**: le funzioni fatte di tante piccole chiamate Python
  risultano più care di quanto sono. I secondi delle tabelle per funzione
  sono riportati a quelli veri con un solo fattore (0,61 il piano, 0,60 il
  figlio); dove una proposta dipende da un numero, quel numero è stato
  rimisurato con cronometri senza profiler (§4 di `REPORT.md`).

## I tempi di un percorso da 5 km (Mac, medie su 9)

Il percorso arriva in **1,46 s**. CPU: 1,20 s il processo della richiesta,
2,08 s i figli (2,33 figli a percorso).

| Parte | Fase | Secondi | Quota |
|---|---|---|---|
| Piano dalla partenza | ricerca dalla partenza dell'utente | 0,92 | 63% |
| Partenze vicine | attesa dei figli dopo il piano | 0,24 | 17% |
| Partenze vicine | grafo impacchettato per i figli (`OneGraph`) | 0,10 | 7% |
| Partenze vicine | scelta dei nodi vicini | 0,06 | 4% |
| Partenze vicine | avvio dei processi, somma del tragitto, alternative | 0,02 | 1,5% |
| Resto | indicazioni del percorso e delle alternative | 0,08 | 5% |
| Resto | ritaglio della zona in memoria | 0,04 | 3% |
| Resto | contorni piazzati, corpo della risposta, JSON (80 KB) | 0,004 | 0,3% |

La «scelta dei nodi vicini» è quasi tutta un passaggio completo del garbage
collector che cade lì dopo il ritaglio (0,12 s, in un percorso su due).

**Un figlio di una partenza vicina** costa 0,83 s di CPU:

| Passo del figlio | CPU (s) | Quota |
|---|---|---|
| Avvio: interprete nuovo e import del motore | 0,21 | 25% |
| Richiesta e grafo ricevuti dal pipe (5,3 MB) | 0,003 | 0,4% |
| Grafo spacchettato | 0,06 | 7% |
| Ricerca vera (`job.here`) | 0,54 | 65% |
| Piano impacchettato e rispedito (133 KB) | 0,001 | 0,1% |
| Uscita e resto | 0,02 | 3% |

Quindi **un terzo della CPU dei figli non è ricerca**: 0,27 s su 0,83, cioè
0,64 s a percorso. Nel principale ricevere e spacchettare un piano costa
0,002 s.

**Il rapporto col server.** Sulle stesse 9 richieste il server ha misurato
8,1 s, 6,9 s e 11,7 s (TASK-276, giro 2b) contro 1,46, 1,20 e 2,08 qui:
circa **5,6 volte**, non 2–3 (quella stima usava un Mac sotto carico e la
cache a zone piccole). Le stime «sul server» qui sotto sono i secondi del
Mac per 5,6: vanno verificate là.

**Chi arriva per ultimo.** In 7 percorsi su 9 i figli finiscono dopo il
piano dalla partenza. Accorciare solo il piano dalla partenza toglie CPU ma
non secondi al percorso: l'attesa si allunga di altrettanto. Per accorciare
il percorso bisogna accorciare anche i figli.

## Le 10 funzioni più costose, parte per parte

Tempo proprio e cumulato in secondi veri stimati (vedi «Il profiler pesa»).

### Piano dalla partenza (per percorso, 0,96 s)

| # | Funzione | Chiamate | Proprio | Cumulato | Cosa fa |
|---|---|---|---|---|---|
| 1 | `network.distance_to_segments` | 3.214 | 0,079 | 0,091 | Distanza di ogni punto dal segmento più vicino del contorno; quasi tutto il tempo viene dal corridoio, a ogni traccia |
| 2 | `optimizer.RoadMask.fit_xy` | 5.550 | 0,058 | 0,170 | Quanta parte del contorno ha una strada vicina, per ogni piazzamento candidato |
| 3 | `networkx` `bidirectional_dijkstra` | 1.021 | 0,031 | 0,062 | Il cammino più corto da un punto del contorno alla zona del successivo, circa 64 per traccia |
| 4 | `shapely` `coords.__iter__` | 202.431 | 0,027 | 0,038 | Legge i punti della geometria di un arco, uno alla volta |
| 5 | `shapely` `has_m` | 29.953 | 0,026 | 0,026 | Controllo che shapely fa ogni volta che si chiedono i punti di una geometria |
| 6 | `optimizer.RoadMask.__init__` | 1 | 0,025 | 0,122 | Campiona tutte le strade del grafo ogni 10 m, una volta per ricerca |
| 7 | `networkx` `reportviews.<genexpr>` | 105.787 | 0,024 | 0,033 | Scorre gli archi del grafo |
| 8 | `shapely` `decorators.wrapped` | 59.906 | 0,024 | 0,076 | L'involucro di ogni chiamata a shapely |
| 9 | `network._edge_coords` | 37.808 | 0,024 | 0,188 | I punti di un arco da un capo all'altro, per ogni arco del grafo |
| 10 | `network._route_through_zones` | 16 | 0,024 | 0,105 | Porta il percorso da una zona alla successiva lungo il contorno, una volta per traccia |

Le voci 4, 5, 7, 8 e 9 sono la stessa cosa: due tabelle fatte una volta per
grafo leggendo gli archi uno alla volta (`network._work_out_samples` e
`RoadMask.__init__`). Per funzione chiamante, coi cronometri senza profiler
(piano 0,94 s, 16 tracce):

| Funzione | Secondi | Quota del piano |
|---|---|---|
| `network._corridor_costs` (16 volte), tutto | 0,31 | 33% |
| di cui `_work_out_distinct`, la tabella dei campioni, 1 volta | 0,16 | 17% |
| di cui `_distance_to_outline`, 16 volte | 0,09 | 10% |
| `RoadMask.fit_xy`, 5.550 volte | 0,13 | 14% |
| `RoadMask.__init__`, 1 volta | 0,11 | 12% |
| `network._route_through_zones`, 16 volte | 0,11 | 11% |
| `metrics.shape_similarity`, 16 volte | 0,06 | 6% |
| `network.prune_parallel_spurs`, 34 volte | 0,04 | 5% |
| `projection.perimeter` dentro `road_fit`, 5.552 volte | 0,025 | 3% |

### Ricerca di una partenza vicina (per figlio, 0,52 s)

| # | Funzione | Chiamate | Proprio | Cumulato | Cosa fa |
|---|---|---|---|---|---|
| 1 | `network.distance_to_segments` | 2.452 | 0,056 | 0,065 | Come sopra: la distanza delle strade dal contorno, a ogni traccia |
| 2 | `shapely` `decorators.wrapped` | 50.637 | 0,023 | 0,047 | L'involucro di ogni chiamata a shapely |
| 3 | `shapely` `coords.__iter__` | 168.518 | 0,023 | 0,032 | Legge i punti di una geometria, uno alla volta |
| 4 | `networkx` `bidirectional_dijkstra` | 768 | 0,021 | 0,043 | Il cammino più corto tra due zone del contorno |
| 5 | `optimizer.RoadMask.__init__` | 1 | 0,021 | 0,098 | Campiona tutte le strade del grafo, una volta |
| 6 | `network._route_through_zones` | 12 | 0,017 | 0,073 | Il percorso da una zona alla successiva, una volta per traccia |
| 7 | `networkx` `reportviews.<genexpr>` | 90.510 | 0,016 | 0,023 | Scorre gli archi del grafo |
| 8 | `numpy` `argsort` | 1 | 0,016 | 0,016 | Ordina i campioni degli archi per togliere i doppioni |
| 9 | `numpy.array` | 1.893 | 0,015 | 0,015 | Trasforma liste di Python in tabelle |
| 10 | `network._edge_coords` | 32.171 | 0,015 | 0,113 | I punti di un arco, per ogni arco del grafo |

Il figlio rifà da capo le due tabelle del grafo, perché il grafo gli arriva
impacchettato senza: 0,12 + 0,09 = 0,21 s su 0,54 di ricerca (40%). Il
resto sono 12 tracce.

### Il resto del processo della richiesta (per percorso, 0,50 s col profiler)

| # | Funzione | Chiamate | Proprio | Cumulato | Cosa fa |
|---|---|---|---|---|---|
| 1 | `network._work_out_nodes` | 1 | 0,056 | 0,062 | La tabella dei nodi del ritaglio; il tempo è il garbage collector che passa lì (nel figlio la stessa tabella costa 0,003 s) |
| 2 | `pickle.dumps` | 1 | 0,053 | 0,123 | Il grafo impacchettato per i figli |
| 3 | `select.poll` | 5 | 0,053 | 0,053 | L'attesa dei figli (0,24 s senza profiler) |
| 4 | `shapely` `to_wkb` | 16.258 | 0,048 | 0,065 | Ogni geometria degli archi trasformata in byte, dentro il pickle |
| 5 | `zone_crop.crop` | 1 | 0,020 | 0,038 | Il ritaglio della zona in memoria |
| 6 | `posix.scandir` | 5 | 0,019 | 0,019 | Elenca la cartella della cache per trovare la zona e il file dei nomi |
| 7 | `zone_crop._largest_piece` | 1 | 0,011 | 0,014 | Tiene il pezzo connesso più grande del ritaglio |
| 8 | `graphs.ZoneGraphs.load` | 1 | 0,010 | 0,049 | Trova la zona in memoria e la fa ritagliare |
| 9 | `_collections_abc.__iter__` | 38.508 | 0,009 | 0,055 | Scorre gli archi del grafo |
| 10 | `networkx` `coreviews.edge_ok` | 41.087 | 0,009 | 0,013 | Filtra gli archi in una vista del grafo |

Le indicazioni (`with_directions`, 3 volte: il percorso e 2 alternative)
passano metà del tempo in `sidewalks.graph_roads`, rifatta ogni volta sullo
stesso grafo.

## Proposte, in ordine

Guadagno su un percorso da 5 km: secondi misurati sul Mac, poi la stima sul
server (× 5,6). «Tempo» è quando arriva il percorso, «CPU» la somma di
processo e figli (3,28 s sul Mac, circa 19 sul server). Ogni modifica a
`services/route-engine/` chiede comunque la prova dei percorsi identici
(`test_same_routes`, `SAME_ROUTES_AS`) e l'`engine.zip` rifatto.

| # | Modifica | Tempo | CPU | Rischio | Cambia i percorsi | Prodotto |
|---|---|---|---|---|---|---|
| 1 | Le due tabelle del grafo con le funzioni a blocchi di shapely | −0,13 s (9%); server −0,7 s | −0,44 s (13%); server −2,5 s | Basso | No: tabelle identiche bit per bit, provato | No |
| 2 | Figli delle partenze vicine già avviati | −0,15 s (10%); server −0,8 s | −0,48 s (15%); server −2,7 s | Medio | No | No |
| 3 | Non aspettare le alternative se il percorso della partenza è già buono | −0,21 s (14%); server −1,1 s | 0 | Basso | Sì, a volte ne esce uno meno bello | **Sì**: è la domanda di TASK-435 |
| 4 | `fork` al posto di `spawn` per i figli (solo Linux), invece della 2 | −0,27 s (18%); server −1,5 s | −0,73 s (22%); server −4 s | Alto | No | No |
| 5 | Garbage collector spento nei figli, zona «congelata» nel principale | −0,05 s; server −0,3 s | −0,15 s (5%); server −0,8 s | Basso | No | No |
| 6 | Impacchettare il grafo mentre i figli partono | −0,07 s; server −0,4 s | 0 | Basso | No | No |
| 7 | `perimeter(shape)` calcolato una volta, fuori da `road_fit` | 0 in 7 casi su 9 | −0,025 s; server −0,14 s | Minimo | No: stesso valore | No |
| 8 | `graph_roads` e nomi una volta per percorso nelle indicazioni | −0,03 s; server −0,15 s | −0,03 s | Basso | No: solo indicazioni | No |
| 9 | `fit_xy` su tutti i piazzamenti insieme | 0 in 7 casi su 9 | −0,08 s stimati; server −0,5 s | Medio | Forse: arrotondamenti | No |

**1 + 2 insieme**: circa −0,28 s sul Mac (19%), cioè circa −1,5 s sugli 8
del server, e −0,92 s di CPU (28%): da 19 a circa 14 s di CPU a percorso,
quindi anche il tetto di TASK-276 salirebbe di circa un terzo.

Da dove vengono i numeri:

1. **Tabelle a blocchi.** `_work_out_samples` e `RoadMask.__init__`
   chiedono a shapely i punti di ogni arco con una chiamata Python per
   arco (38.000 a percorso). Un prototipo fuori dal motore
   (`prototype_tables.py`) le fa con `shapely.get_coordinates` su tutti gli
   archi insieme: 0,098 → 0,017 s e 0,075 → 0,025 s, **uguali bit per bit**
   su 10 grafi su 10. Sono 0,13 s in meno per ogni grafo cercato: uno nel
   principale (due quando la ricerca va più lontano), uno per figlio. Vale
   anche sul telefono, che usa lo stesso motore.
2. **Figli già avviati.** Ogni figlio spende 0,21 s di CPU ad avviarsi e a
   importare il motore, 2,33 volte a percorso. Tenuti vivi tra un percorso
   e l'altro dentro i processi caldi di ADR-0242, quel costo sparisce e
   l'attesa media scende da 0,24 a 0,09 s. TASK-435 ha letto nel log del
   server che là un figlio impiega circa 2 s solo a partire: il guadagno
   vero può essere più grande della stima. Costi: un figlio in attesa
   tiene 56 MB (misurato; 6 figli, circa 0,35 GB); un figlio in ritardo
   oggi viene ucciso e andrebbe riavviato; `Pool.terminate` ha già
   bloccato la CI (TASK-248). Con figli più veloci arrivano in tempo più
   alternative: i percorsi calcolati sono gli stessi, ma può cambiare
   quale vince.
3. **L'attesa delle alternative.** Quando il piano dalla partenza è già
   buono si aspettano i figli fino a 3 s solo per le alternative
   (`NEARBY_GOOD_GRACE_S`, TASK-093). Qui la ricerca dalla partenza è
   arrivata a un percorso buono, senza andare più lontano, in 6 percorsi
   su 9: l'attesa dei figli in quei 6 vale 0,21 s a percorso sulla media
   dei 9. In 2 di quei 6 però ha vinto una partenza vicina. È una scelta
   di prodotto ed è già la domanda di TASK-435.
4. **`fork`.** Toglie avvio (0,21 s), grafo impacchettato (0,10 s nel
   principale) e spacchettato (0,06 s per figlio). Ma un `fork` in un
   processo con thread può bloccarsi, sul Mac e nei test resterebbe
   `spawn` (due strade da tenere uguali), e ADR-0071 e ADR-0242 hanno
   scelto `spawn` e `forkserver` apposta. Alternativa alla 2, non in più.
5. **Garbage collector.** Misurato con `gc.callbacks`. Nel figlio 0,05 s
   su 0,85: con `gc.disable()` la CPU scende a 0,79 e la memoria di picco
   resta 176 MB. Nel principale un passaggio completo percorre tutta la
   zona in memoria: 0,11 s, 0,035 con `gc.freeze()` dopo la lettura della
   zona. Cresce con le zone in memoria, quindi sul server può pesare di
   più. Una zona congelata e poi scartata va scongelata, o resta in
   memoria.
6. **Ordine.** Oggi il grafo si impacchetta (0,10 s) prima di avviare i
   figli, che poi impiegano 0,22 s a partire: facendo partire prima i
   processi le due cose si sovrappongono. Serve una stima della memoria
   prima del pickle (`workers_that_fit`).
7. **`perimeter`.** `road_fit` ricalcola il perimetro della forma, che non
   cambia, 5.552 volte a ricerca. Sta bene nella stessa PR della 1.
8. **Indicazioni.** `with_alongs` rifà `graph_roads` per il percorso e per
   ogni alternativa sullo stesso grafo, e cerca ogni volta il file dei
   nomi. Sul Mac non c'è nessun file dei nomi: sul server viene anche
   letto e interpretato a ogni chiamata, costo qui non misurabile.
9. **`fit_xy` a blocchi.** 0,13 s per 5.550 chiamate; la stima (−60%) non è
   misurata. Tocca solo il piano dalla partenza.

**Non proposte.**

- Meno tracce per ricerca: cambia i percorsi; già misurato e scartato
  (TASK-298, ADR-0259).
- Un Dijkstra diverso da quello di networkx (`_route_through_zones`,
  0,11 s): a parità di costo sceglierebbe altri cammini, quindi altri
  percorsi, per un decimo di secondo.
- Le tabelle fatte una volta per zona invece che per ritaglio: dopo la 1
  restano 0,06 s da togliere.
- Più processi: TASK-276 ha già detto che i 4 core sono pieni.

## Limiti della misura

- **Mac, non server.** Il fattore 5,6 viene da due misure fatte in giorni e
  su zone diverse. Il log dell'API ha già i tempi veri per fase di ogni job
  (righe «times», TASK-289: `crop`, `start`, `wait`, `nearby`,
  `directions`): una lettura, in sola lettura, direbbe se le quote sono le
  stesse. TASK-435 ne ha lette 9: totale mediano 6,8 s, `start` 4,7 s,
  `wait` 1,5 s.
- **Una sola città, 10 richieste.** A Milano (oltre `NEARBY_MAX_NODES`) i
  figli non partono e contano solo le proposte 1, 7 e 9.
- **Non misurati**: la lettura dell'archivio prima del piano
  (`RouteJobs._nearby`, ADR-0256), il salvataggio del percorso dopo la
  risposta, il passaggio del piano dal processo caldo all'API (ADR-0242),
  il file dei nomi delle strade.
- **Avvio dei figli**: 0,21 s vale perché l'API parte come
  `python -m shaperoute_api`, e `spawn` non reimporta un modulo
  `__main__` di pacchetto. Avviata in un altro modo, ogni figlio
  importerebbe anche tutta l'API: 0,94 s invece di 0,24 (`boot-api.json`).

## Criteri di accettazione

- [x] Script e uscite in `out/TASK-434/` del checkout principale.
- [x] Tabella dei tempi divisa in piano dalla partenza, partenze vicine
      (avvio del figlio contro ricerca vera) e resto.
- [x] Le 10 funzioni più costose di ogni parte: tempo proprio, cumulato,
      chiamate, una frase.
- [x] Lista ordinata di proposte con guadagno dai numeri del profilo,
      rischio, percorsi identici o no, scelta di prodotto o no.
- [x] Nessuna modifica a `services/`, nessun comando sul server, nessuna
      dipendenza nuova.

## File toccati

```
docs/tasks/TASK-434.md
```

## Fuori scope

- Fare una qualsiasi delle modifiche proposte: ognuna è un task suo.
- Comandi sul server, anche in sola lettura.
- La scelta di prodotto sull'attesa delle alternative (TASK-435).

## Esito

Misurato il 2026-11-10. Un percorso da 5 km sul Mac: 1,46 s, di cui 63% il
piano dalla partenza e 17% l'attesa dei figli; un terzo della CPU dei figli
è avvio e grafo, non ricerca. Le due proposte senza scelte di prodotto
(tabelle a blocchi, figli già avviati) tolgono insieme circa il 19% del
tempo e il 28% della CPU. Nessuna è stata fatta: aspettano la scelta
dell'utente e un numero di task ciascuna.
