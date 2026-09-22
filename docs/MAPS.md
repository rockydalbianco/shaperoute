# MAPS — Dati cartografici e routing

Come il route-engine ottiene la rete stradale e ci aggancia la forma.
Scritto con TASK-014, aggiornato con TASK-017 e TASK-015; le scelte di
fondo stanno in ADR-0008, ADR-0020, ADR-0022 e ADR-0023.

## Sorgente

- **OpenStreetMap** via **OSMnx 2.1** (ADR-0008), che interroga Overpass
  (`overpass-api.de`). Unica dipendenza runtime del route-engine: niente
  scikit-learn né scipy, il nodo più vicino si calcola in metri con
  `geo.py`.
- Rete **`foot`** (ADR-0022): il filtro `walk` di OSMnx **senza**
  l'esclusione di `highway=cycleway`. In Trentino le ciclabili sono quasi
  sempre ciclopedonali, e il filtro `walk` le scartava: nel rettangolo del
  cuore da 5 km a Levico mancavano 4,6 km di ciclabili, lungo il lago e a
  sud del paese. Filtro in `FOOT_FILTER`, `route_engine/network.py`.
- Il grafo si costruisce con `network_type="walk"` insieme al filtro: è ciò
  che rende ogni strada percorribile nei due sensi. Con il solo filtro
  OSMnx rispetta i sensi unici, che a piedi non valgono, e alcuni punti
  della forma diventano irraggiungibili.

## Overpass: come si scarica

- **Un download alla volta**, mai istanze OSMnx in parallelo per aggirare i
  limiti del server (lo raccomanda OSMnx stesso). Il limitatore di OSMnx
  resta attivo.
- **Un tentativo per grafo**: se Overpass non risponde si salta e si
  riprova più tardi, non in un ciclo stretto. Il 2026-09-22 sera, dopo due
  download, Overpass ha smesso di accettare connessioni per il resto della
  sessione.
- I grafi si **costruiscono dalla cache**, anche più volte: la GraphML in
  `data/cache/` e, sotto, le risposte grezze di Overpass in
  `data/cache/http/`. Cambiare come si costruisce il grafo (non cosa si
  chiede) non richiede un nuovo download.
- `ox.settings.requests_timeout` finisce **dentro la query**: cambiarlo
  cambia la chiave della cache HTTP e costringe a riscaricare.
- `overpass-api.de` ha due indirizzi IPv4, e da questo PC uno
  (65.109.112.52) non accetta connessioni. OSMnx fissa un solo indirizzo
  per richiesta con `socket.gethostbyname`, che restituisce il primo: se è
  quello irraggiungibile, il download va in timeout dopo 180 s. I download
  di TASK-015 sono riusciti facendo restituire a `gethostbyname` il primo
  indirizzo raggiungibile, in uno script usa-e-getta; il motore non lo fa.
- Per controllare Overpass senza scaricare nulla: la pagina
  `https://overpass-api.de/api/status`, con uno User-Agent vero (quello
  di default di curl riceve 406).

## Cache

- Il grafo si scarica una volta e si salva in `data/cache/` come GraphML
  (ignorato da git). Da lì la CLI gira **offline**.
- Nome del file: `<rete>_<sud>_<ovest>_<nord>_<est>.graphml`, con il
  rettangolo arrotondato verso l'esterno a 1e-4° (≈ 10 m), così la stessa
  richiesta trova sempre lo stesso file. `<rete>` è `foot` dalla TASK-017;
  i file `walk_*` sono quelli di TASK-014, tenuti per i confronti.
- Dimensioni tipiche: 1–20 MB per grafo. I 12 grafi `walk` di TASK-014
  occupano 78 MB.
- I dati OSM cambiano: un campione è riproducibile solo con lo stesso
  grafo. Per rifare un confronto pulito, si tiene la cache.

## Area scaricata

- **Con l'ottimizzatore** (TASK-015, ADR-0023): un quadrato attorno alla
  partenza che contiene la forma a ogni rotazione, fase e scala massima,
  più 500 m (`zone_area`). Per 15 km circa 11,5 km di lato (130 km²), per
  5 km circa 4,5 km. Si scarica **un grafo per zona**, partendo dal caso
  più grande (cerchio da 15 km): ogni area più piccola si **ritaglia** da un
  grafo in cache che la contiene (`crop`) e il ritaglio si salva col suo
  nome.
- **Senza** (`--no-optimize`): il rettangolo della forma teorica proiettata,
  più **500 m per lato** (`AREA_MARGIN_M`).

Grafi di zona (cerchio da 15 km): Trento 26 MB e 20.967 nodi, Levico 8 MB e
5.623, Valsugana 6.354 nodi, Milano 98 MB e 75.816. Il ritaglio di Levico
sull'area del cuore da 5 km dà 905 nodi contro i 904 del download diretto
di TASK-017: ritagliare equivale a scaricare.

## Dal disegno alla strada

1. La partenza (primo punto della forma) si aggancia al **nodo più
   vicino**: il percorso inizia e finisce lì.
2. Ogni altro punto della forma è una **zona**: i nodi entro il 2% del
   perimetro della forma (`ZONE_RADIUS`; 100 m per 5 km), o il più vicino
   se nessuno è così vicino. Raggiungere un nodo della zona costa la strada
   più la sua distanza dal punto: vince il nodo comodo, non quello più
   vicino in linea d'aria ma oltre un fiume.
3. Fra una zona e la successiva, percorso di costo minimo con il
   **corridoio**: una strada costa la sua lunghezza × (1 + 2,0 · eccesso /
   fascia), dove l'eccesso è quanto la strada sta lontana dal contorno oltre
   la fascia del 2% del perimetro (`CORRIDOR_WEIGHT`, `CORRIDOR_BAND`).
   Dentro la fascia non c'è premio a zig-zagare per restare più vicini.
4. Gli archi già usati costano **2.0** volte di più
   (`EDGE_REUSE_PENALTY`).
5. **Potatura degli speroni**: ogni A → B → A diventa A, finché ce ne
   sono. Se non resta un anello, si tiene il percorso non potato.
6. I punti del GPX seguono la geometria vera delle strade, non la corda fra
   due incroci.

Parametri: `--reuse-penalty` dalla CLI; gli altri sono costanti in
`route_engine/network.py`. Raggio e fascia sono frazioni del perimetro,
quindi crescono con la distanza richiesta.

## Warning

- **Rete rada**: distanza media punto-forma → nodo sopra **150 m**
  (`SPARSE_THRESHOLD_M`).
- **Partenza lontana dalla strada**: il nodo di partenza è a più di 150 m
  dal punto dell'utente.
- **Punto della forma irraggiungibile**: nessuna strada porta alla sua
  zona; il punto si salta e la CLI lo dice.

In TASK-014 e TASK-017 il warning di rete rada è comparso solo in
`valsugana` a 15 km, a 151 m e 158 m: appena sopra la soglia.

## Come si misura

`services/route-engine/tests/measure_snapping.py` rifà i 12 casi di
riferimento dalla cache e stampa, per ciascuno:

- **rapporto**: distanza su strada / distanza target;
- **ripercorso**: quota della lunghezza su tratti già fatti;
- **deviazione**: distanza media e massima del percorso dal contorno;
- **copertura**: quota del contorno che ha il percorso entro il 2% della
  distanza target (100 m a 5 km).

La copertura serve perché il rapporto da solo inganna: un percorso che
salta metà della forma è corto e sembra ottimo.

## Cosa si è misurato

Sui 12 casi (heart/circle, 5 e 15 km, tre zone), forma a scala iniziale,
rotazione 0, fase 0.

**TASK-014**, rete `walk`:

| | Distanza su strada / target |
|---|---|
| Snapping al nodo + routing (penalità 2.0) | 3,3× – 7,0× |
| Penalità 2.0 contro nessuna penalità | 0–3% in più, nessun ritorno evitato a occhio (cuore 5 km, Trento e Levico) |
| + potatura degli speroni | 2,2× – 4,7× (−19/−53% di km), archi ripercorsi −43/−90% |

**TASK-017**, varianti provate una alla volta sulla rete `walk` (rapporto
mediano e copertura media sui 12 casi):

| Variante | Entro 1,5× | Rapporto | Copertura |
|---|---|---|---|
| TASK-014 (nodo più vicino) | 0/12 | 2,89× | 79% |
| Aggancio all'arco più vicino | 0/12 | 2,90× | 81% |
| Meno waypoint (Douglas-Peucker, 30 m) | 0/12 | 2,31× | 74% |
| Guardia sulle deviazioni, k = 2 | 8/12 | 1,33× | 45% |
| Guardia k = 2 + corridoio | 11/12 | 1,21× | 41% |
| Zone + corridoio, 8 punti invece di 64 | 3/12 | 1,91× | 62% |
| **Zone + corridoio (tenuta)** | 0/12 | **2,57×** | **79%** |

- La guardia sulle deviazioni accorcia **scartando la forma**: sul cuore
  di Levico resta un terzo del contorno. Scartata.
- Aggancio all'arco e meno waypoint non aiutano, o aiutano solo perdendo
  copertura.
- Zone + corridoio è più corta della TASK-014 in 11 casi su 12, a parità
  di copertura media. Peggiora `circle_5km_valsugana` (3,37× → 3,66×, ma
  copertura 47% → 62%).
- Raggio delle zone, peso e fascia del corridoio cambiano poco: fra 1% e
  3% del perimetro e peso fra 1 e 4, rapporto mediano 2,53–2,86×. Si
  tengono 2%, 2,0 e 2%.

**Rete `foot`** (con le ciclopedonali), sui 4 casi scaricati prima che
Overpass smettesse di rispondere:

| Caso | TASK-014 su `foot` | TASK-017 su `walk` | TASK-017 su `foot` |
|---|---|---|---|
| heart 5 km trento | 2,02× · 94% | 2,10× · 94% | 1,66× · 94% |
| heart 15 km trento | 2,05× · 100% | 2,62× · 99% | 1,98× · 100% |
| heart 5 km levico | 1,94× · 93% | 1,82× · 82% | **1,47× · 90%** |
| heart 5 km valsugana | 3,30× · 71% | 3,18× · 62% | 3,17× · 62% |

(rapporto · copertura). In Valsugana le ciclabili aggiunte (2 km) non
cambiano nulla.

**Il limite rimasto**: con scala e rotazione iniziali il contorno passa in
parte su campi, fiumi e ferrovie. Sul cuore di Levico la metà inferiore
attraversa campi senza strade, e il percorso rientra verso l'interno per
aggirarli. Nessun aggancio lo recupera: serve spostare la forma dove le
strade ci sono, cioè ruotarla e scalarla (TASK-015, `ROUTE_ENGINE.md` §5).
Il traguardo di 1,5× passa lì.

**TASK-015**, ottimizzatore sulla rete `foot` (rapporto · copertura ·
tracciamenti; ✅ = distanza entro ±10% e copertura ≥ 90%):

| Zona | cuore 5 km | cuore 15 km | cerchio 5 km | cerchio 15 km |
|---|---|---|---|---|
| trento | 1,04× · 97% · 8 ✅ | 0,98× · 97% · 2 ✅ | 1,05× · 91% · 2 ✅ | 1,08× · 96% · 8 ✅ |
| levico | 1,14× · 84% · 9 | 0,97× · 81% · 5 | 1,00× · 91% · 11 ✅ | 1,09× · 96% · 6 ✅ |
| valsugana | 1,23× · 30% · 14 | 1,13× · 91% · 10 | 0,87× · 35% · 18 | 1,05× · 88% · 11 |
| milano | 1,08× · 100% · 2 ✅ | 0,95× · 100% · 2 ✅ | 1,09× · 95% · 2 ✅ | 1,07× · 100% · 2 ✅ |

- Sui 12 casi di riferimento: distanza entro ±10% in 8, copertura ≥ 80%
  in 10, entrambe le soglie di arresto in 6. Rapporto mediano 1,05×,
  contro 2,57× di TASK-017 (rete `walk`).
- Milano (confronto) converge in 2 tracciamenti, con la forma dove cade:
  con una rete fitta il problema non c'è. In Valsugana i 5 km non trovano
  una posizione con strade tutto attorno.
- Sulla rete `walk` (grafi di TASK-014 uniti, senza ciclopedonali) gli
  stessi casi andavano peggio a Levico: le ciclopedonali contano.
- Tempi dalla cache: 2–24 s per caso nelle tre zone, quasi tutti per
  leggere il grafo di zona; a Milano 36–85 s (GraphML da 98 MB).
- Difetto visto a occhio, non misurato dalla copertura: **punte** di andata
  e ritorno su strade parallele (marciapiede e strada), che la potatura degli
  speroni non riconosce perché i nodi sono diversi. Riguarda lo snapping,
  non l'ottimizzatore.

## Fixture di test

`services/route-engine/tests/fixtures/levico_walk_1km.graphml`: 1 km²
attorno a Levico, rete `walk`, 303 nodi, 347 KB, scaricato il
**2026-09-22**. Si rigenera con `python tests/fixtures/make_fixtures.py`
(serve la rete) e si aggiorna questa data. Resta una rete `walk` apposta:
serve a provare l'algoritmo su un grafo reale, non il filtro.

## Ancora aperto

- Provider di tiles per la mappa dell'app (fase 2).
- Motore di routing di produzione: ADR-0009.
- Attribuzione OpenStreetMap (ODbL) dove i percorsi vengono mostrati:
  da definire con l'app.
