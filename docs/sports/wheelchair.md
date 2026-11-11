# Carrozzina e passeggino

TASK-414, ADR-0343. L'indicazione di partenza (2026-11-07): «studia
percorsi percorribili e solo forme semplici di pochi km». Le scelte
dell'utente del 2026-11-08 sono in `tasks/TASK-414.md`:

- uno sport solo, «Carrozzina e passeggino» ♿, sulla rete `wheelcalm` qui
  sotto;
- da 1 a 5 km, solo cerchio, cuore, stella e luna;
- nel gioco come la camminata, con record propri su 1 e 5 km.

Qui ci sono le misure che preparano le scelte.

## Le reti provate (TASK-414 parte 0, 2026-11-07)

Banco `tools/sport_bench/` sul Mac, `main` `8c1e84da`, `nice -n 10`, un
comando per volta, a turno con il banco delle ciaspole. Le reti non sono nel
motore: le dà `--loader out/TASK-414/loader.py`. JSON e script in `out/TASK-414/`
(ignorato da git).

- **Un solo download per zona**, da Overpass: il filtro della rete foot
  (`networks/foot.py`), senza semplificare, con i tag delle vie e dei nodi
  che servono a una carrozzina (`surface`, `smoothness`, `incline`,
  `wheelchair`, `kerb`, `sidewalk`, `sac_scale`, `barrier`, `crossing`).
  Ogni rete qui sotto si ricava da quel download.
- **Le zone sono piccole**: quelle dei 5 km, circa 5,5 × 5,5 km attorno
  alla partenza (più un secondo download per zona quando il motore cerca
  «entro 2 km»).
- **Le richieste sono di corsa** (`--activity running`), a 1, 2, 3 e 5 km,
  sulle quattro forme semplici del catalogo: cerchio, cuore, stella, luna.
  Ogni via va nei due sensi, come a piedi.

Le reti:

- **`footraw`**: la rete foot di oggi, dallo stesso download. È la base
  (la camminata e la corsa).
- **`wheel`**: quello che si spinge, la lettura larga.
  - **Fuori**: le scale (`highway=steps`); i cordoli alti (`kerb=raised`:
    il nodo si toglie e taglia la via); `incline` scritto oltre l'8%; le
    superfici ruvide (ghiaia, ciottoli, porfido, erba, terra, sabbia,
    `unpaved`); `smoothness` da `bad` in giù; `wheelchair=no`; i sentieri
    di montagna (`sac_scale`); tornelli, scalette e passaggi stretti
    (`stile`, `turnstile`, `kissing_gate`).
  - **Dentro**: strade e marciapiedi, ciclabili, aree pedonali. `path` e
    `track` solo se dicono una superficie (o `tracktype=grade1`): senza,
    in montagna sono sentieri.
  - `wheelchair=yes` o `designated` tiene la via qualunque cosa dica il
    resto.
- **`wheelcalm`**: `wheel` senza le strade principali e secondarie (anche
  `trunk`) che non dicono di avere un marciapiede. Dove il marciapiede è
  disegnato a parte, resta come `footway`.
- **`wheelstrict`**: `wheel` più severa: fuori anche ghiaino e terra
  battuta (`fine_gravel`, `compacted`), `incline` oltre il 6% o scritto
  solo come `up`/`down`/`yes`, ogni cordolo che non dice `lowered`,
  `flush` o `no`, le barriere per le bici (`cycle_barrier`), e le strade
  grandi senza marciapiede come in `wheelcalm`.
- **`wheelflat8`**, **`wheelflat6`**: `wheel` senza i tratti più ripidi
  dell'8% e del 6% da un capo all'altro, con le quote delle tegole
  Terrarium (`CONDIVISO.md`, «Le quote»), sui tratti di almeno 60 m. Il
  motore oggi le quote non le ha.

Su cosa corrono i percorsi e quanto salgono lo dice `out/TASK-414/mix.py`:
rifà le stesse richieste, legge gli archi del percorso e conta i nodi del
download grezzo che il percorso tocca (attraversamenti, cordoli, barriere).
Il profilo viene dalle tegole Terrarium (zoom 13, circa 30 m, media su 75
m): **le quote hanno un rumore di fondo** (ponti, sottopassi), contano le
differenze fra reti e zone.

**In breve:**

- **Scale e cordoli alti: nessuno sui percorsi di `wheel`.** I percorsi
  della rete foot passano 7,4 km di scale (il 2,9% dei km) e 92 cordoli
  alti; quelli di `wheel` zero e zero, e nessun metro su superfici ruvide
  (la rete foot: 22%).
- **`wheel` regge quasi ovunque**: 81 su 96, 13 buoni, somiglianza mediana
  0,75 (la rete foot: 92 su 96, 31 buoni, 0,83). Milano 16 su 16, Asiago
  16, Trento 14, pianura 14, Valsugana 13; Fiemme 8.
- **Ma il 9% dei km di `wheel` sta su strade principali e secondarie**
  senza marciapiede scritto: dove, con una carrozzina o un passeggino, si
  va in mezzo al traffico.
- **`wheelcalm` le toglie (1,1%) e tiene la città e la pianura**: 69 su 96,
  9 buoni. Trento e Milano 16 su 16, pianura 13; Asiago 11, Valsugana 9,
  Fiemme 4. Il 52% dei km è senza auto (marciapiedi, ciclabili, aree
  pedonali).
- **`wheelstrict` costa ancora**: 65 su 96, 5 buoni, e lascia fuori
  ciclabili in terra battuta che un passeggino fa.
- **Le salite restano.** Il motore non conosce le quote: sui percorsi di
  `wheel` il tratto più ripido arriva al 16,8% (Valsugana), con 25 km
  sopra il 6%. Togliere i tratti oltre il 6% (`wheelflat6`) porta il più
  ripido al 7,9%, ma in montagna la rete crolla (Fiemme da 140 a 14 km) e
  vorrebbe le quote nel motore, sul server e sul telefono (ADR-0300, parte G
  di TASK-347, non ancora codice). In città e in pianura le salite sono
  già basse: Trento 7 m per km, Milano 13 (rumore dei ponti), pianura 4.
- **1 km è la distanza più difficile**: 15 su 24 per `wheel` e
  `wheelcalm`. Da 2 a 5 km `wheelcalm` fa 17–19 su 24.
- **La forma che regge di più è la stella** (20 su 24 per `wheelcalm`),
  poi luna (19), cuore (16), cerchio (14).
- **I tempi** sono quelli della corsa: mediana 0,8 s, massimo 10,1 s.

### OSM è incompleto: quanto si sa

Km del download grezzo di ogni zona (ogni via contata una volta,
`out/TASK-414/tags.py`); nodi per attraversamenti e cordoli.

| Zona | km a piedi | scale | superficie scritta | ruvida | `smoothness` scritta | `incline` scritto | `wheelchair` scritto | attraversamenti | con `kerb` | cordoli (nodi) | alti | ribassati o a raso | non detto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| trento | 692,5 | 5,4 | 542,3 (78 %) | 95,1 | 58,2 (8 %) | 11,5 (2 %) | 1,0 | 1571 | 54 | 710 | 45 | 608 | 57 |
| valsugana | 301,9 | 0,4 | 205,4 (68 %) | 75,9 | 45,2 (15 %) | 6,9 (2 %) | 0,7 | 122 | 37 | 41 | 1 | 40 | 0 |
| milano | 1447,3 | 10,3 | 1130,8 (78 %) | 61,6 | 158,1 (11 %) | 12,9 (1 %) | 36,6 | 8184 | 57 | 13858 | 1230 | 12624 | 4 |
| fiemme | 268,5 | 0,9 | 148,4 (55 %) | 52,4 | 7,2 (3 %) | 6,9 (3 %) | 0,0 | 158 | 16 | 24 | 1 | 21 | 2 |
| asiago | 197,6 | 0,2 | 88,5 (45 %) | 21,9 | 25,8 (13 %) | 1,1 (1 %) | 4,0 | 105 | 16 | 21 | 2 | 18 | 0 |
| pianura | 346,0 | 0,4 | 211,0 (61 %) | 36,9 | 31,9 (9 %) | 1,3 (0 %) | 0,0 | 494 | 5 | 7 | 0 | 5 | 2 |

- **Le scale ci sono**: OSM le disegna bene (sono un tipo di via, non un
  tag in più).
- **La superficie** c'è sul 45–78% dei km. Senza, una strada o un
  marciapiede vale come asfaltato, un sentiero come sterrato.
- **I cordoli si sanno solo a Milano e, in parte, a Trento.** Milano ha
  13.858 nodi `kerb` (1.230 alti), Trento 710; Valsugana 41, Fiemme 24,
  Asiago 21, pianura 7, su 105–494 attraversamenti. Sui percorsi di
  `wheelcalm`, 36 attraversamenti su 1.000 dicono il cordolo: per gli
  altri, il motore non può sapere se c'è un gradino.
- **La pendenza scritta (`incline`) non serve**: c'è sull'1–3% dei km,
  quasi sempre come `up`/`down` senza numero.
- **Il tag `wheelchair`** c'è per 36,6 km a Milano e quasi nulla altrove:
  la rete non si può fare con lui, come `inline_skates` per il Roller.

Per questo un avviso sotto ogni percorso serve: scale e superfici ruvide
sono fuori dove OSM le dice, ma un cordolo alto o una salita ripida possono
esserci comunque.

### Forme

| Rete | riusciti | buoni | somiglianza mediana | tempo mediano | tempo massimo |
|---|---|---|---|---|---|
| `footraw` | 92 su 96 | 31 | 0,83 | 0,5 s | 67,8 s |
| `wheel` | 81 su 96 | 13 | 0,75 | 0,8 s | 3,0 s |
| `wheelcalm` | 69 su 96 | 9 | 0,73 | 0,8 s | 10,1 s |
| `wheelstrict` | 65 su 96 | 5 | 0,75 | 0,8 s | 2,8 s |
| `wheelflat8` | 66 su 96 | 10 | 0,75 | 0,8 s | 3,6 s |
| `wheelflat6` | 67 su 96 | 6 | 0,75 | 0,8 s | 9,4 s |

Il 67,8 s della rete foot è una luna di 1 km a Trento che non riesce e
riprova «entro 2 km», con un secondo download.

Per zona (riusciti su 16, buoni, somiglianza mediana):

| Zona | `footraw` | `wheel` | `wheelcalm` | `wheelstrict` | `wheelflat8` | `wheelflat6` |
|---|---|---|---|---|---|---|
| trento | 15, 5, 0,88 | 14, 1, 0,70 | 16, 1, 0,71 | 15, 1, 0,70 | 14, 1, 0,68 | 15, 0, 0,69 |
| valsugana | 13, 2, 0,81 | 13, 0, 0,73 | 9, 0, 0,67 | 8, 0, 0,67 | 2, 0, 0,68 | 5, 0, 0,63 |
| milano | 16, 11, 0,92 | 16, 6, 0,86 | 16, 6, 0,83 | 15, 3, 0,84 | 16, 5, 0,83 | 16, 2, 0,76 |
| fiemme | 16, 2, 0,79 | 8, 0, 0,68 | 4, 0, 0,71 | 3, 0, 0,71 | 4, 0, 0,67 | 2, 0, 0,62 |
| asiago | 16, 3, 0,78 | 16, 4, 0,82 | 11, 0, 0,72 | 10, 0, 0,75 | 16, 2, 0,76 | 15, 2, 0,81 |
| pianura | 16, 8, 0,88 | 14, 2, 0,73 | 13, 2, 0,76 | 14, 1, 0,79 | 14, 2, 0,80 | 14, 2, 0,79 |

Per distanza (riusciti su 24, buoni):

| km | `footraw` | `wheel` | `wheelcalm` | `wheelstrict` | `wheelflat8` | `wheelflat6` |
|---|---|---|---|---|---|---|
| 1 | 20, 0 | 15, 1 | 15, 0 | 15, 0 | 13, 1 | 13, 0 |
| 2 | 24, 6 | 23, 2 | 18, 2 | 16, 0 | 17, 0 | 18, 0 |
| 3 | 24, 11 | 21, 4 | 19, 2 | 16, 1 | 19, 2 | 19, 2 |
| 5 | 24, 14 | 22, 6 | 17, 5 | 18, 4 | 17, 7 | 17, 4 |

Per forma (riusciti su 24, buoni):

| Forma | `footraw` | `wheel` | `wheelcalm` | `wheelstrict` | `wheelflat8` | `wheelflat6` |
|---|---|---|---|---|---|---|
| cerchio | 23, 3 | 17, 2 | 14, 1 | 13, 1 | 14, 3 | 17, 1 |
| cuore | 24, 7 | 22, 1 | 16, 1 | 15, 1 | 17, 1 | 17, 0 |
| stella | 23, 11 | 20, 7 | 20, 3 | 20, 2 | 16, 4 | 17, 4 |
| luna | 22, 10 | 22, 3 | 19, 4 | 17, 1 | 19, 2 | 16, 1 |

### La rete

Km del pezzo più grande (ogni rete è un solo pezzo nella zona dei 5 km):

| Zona | `footraw` | `wheel` | `wheelcalm` | `wheelstrict` | `wheelflat8` | `wheelflat6` |
|---|---|---|---|---|---|---|
| trento | 663,3 | 488,6 | 471,9 | 438,7 | 315,8 | 304,7 |
| valsugana | 294,1 | 159,4 | 120,5 | 110,5 | 117,4 | 85,2 |
| milano | 1435,8 | 1306,6 | 1280,2 | 1234,3 | 1304,8 | 1299,7 |
| fiemme | 262,4 | 140,2 | 120,7 | 97,8 | 16,0 | 14,0 |
| asiago | 195,2 | 118,3 | 73,5 | 69,5 | 103,6 | 77,5 |
| pianura | 342,5 | 268,8 | 215,5 | 172,7 | 268,5 | 268,3 |

### Su cosa corrono i percorsi

Percentuali sui km dei percorsi riusciti; conteggi sui percorsi
(`out/TASK-414/summ.py` dai JSON `mix-*.json`). «Strade grandi»: `trunk`,
principali e secondarie; «senza auto»: marciapiedi, ciclabili, aree
pedonali, `path` e `track`.

| Rete | km | scale | superficie ruvida | `smoothness` cattiva | ghiaino e terra battuta | autobloccanti | strade grandi | senza auto | superficie scritta | attraversamenti | con `kerb` | cordoli alti | tratto più ripido | km sopra il 6 % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `footraw` | 256,9 | 2,9 % | 22,3 % | 0,4 % | 1,8 % | 13,4 % | 5,5 % | 47,4 % | 79,1 % | 1231 | 71 | 92 | 15,9 % | 31,7 |
| `wheel` | 232,1 | 0,0 % | 0,0 % | 0,0 % | 2,6 % | 9,9 % | 9,0 % | 41,6 % | 78,9 % | 1107 | 65 | 0 | 16,8 % | 25,0 |
| `wheelcalm` | 198,9 | 0,0 % | 0,0 % | 0,0 % | 3,2 % | 12,5 % | 1,1 % | 51,9 % | 81,8 % | 1000 | 36 | 0 | 14,1 % | 17,8 |
| `wheelstrict` | 179,9 | 0,0 % | 0,0 % | 0,0 % | 0,0 % | 13,9 % | 0,9 % | 49,0 % | 77,7 % | 944 | 42 | 0 | 12,4 % | 16,0 |
| `wheelflat6` | 196,9 | 0,0 % | 0,0 % | 0,0 % | 2,6 % | 15,4 % | 10,4 % | 50,3 % | 84,6 % | 1068 | 47 | 0 | 7,9 % | 6,2 |

Il tratto più ripido è il massimo su 200 m; «km sopra il 6%» la somma, su
tratti di 100 m. L'1,1% di strade grandi di `wheelcalm` sono quelle con
`sidewalk` scritto.

Salite per zona (mediana della salita per km, tratto più ripido su 200 m):

| Zona | `footraw` | `wheel` | `wheelcalm` | `wheelstrict` | `wheelflat6` |
|---|---|---|---|---|---|
| trento | 6 m, 8,9 % | 7 m, 14,1 % | 7 m, 14,1 % | 7 m, 5,2 % | 7 m, 5,6 % |
| valsugana | 25 m, 15,9 % | 23 m, 16,8 % | 24 m, 11,8 % | 24 m, 12,4 % | 7 m, 3,7 % |
| milano | 12 m, 7,8 % | 13 m, 7,9 % | 13 m, 7,9 % | 13 m, 8,6 % | 12 m, 7,9 % |
| fiemme | 25 m, 15,8 % | 22 m, 12,3 % | 21 m, 12,3 % | 34 m, 12,3 % | 11 m, 4,6 % |
| asiago | 10 m, 6,7 % | 7 m, 11,3 % | 7 m, 6,2 % | 7 m, 5,0 % | 7 m, 7,1 % |
| pianura | 5 m, 5,3 % | 4 m, 5,0 % | 4 m, 3,9 % | 3 m, 3,0 % | 4 m, 2,6 % |

## La parte A nel motore (TASK-414 A, 2026-11-11)

Branch `feat/TASK-414-a-wheelchair`, sul Mac. Script e risultati in
`out/TASK-414/part-a/` (ignorato da git).

- **La rete `wheel` del motore è `wheelcalm`**: `networks/wheel.py` rifatta
  sui 30 download grezzi della parte 0 dà gli stessi km e le stesse vie
  della rete del banco, zona per zona (`same_as_bench.py`: zero vie
  diverse). In più tiene le regole della rete foot di TASK-421 (cancelli
  chiusi, vie chiuse a piedi), che nei download grezzi non si vedono.
- **Corsa, bici e canoa non cambiano**: i nove percorsi fissi di
  `test_same_routes.py` hanno gli stessi hash (impronta `e0834d054b6e` →
  `427ed1a16a97`, `SAME_ROUTES_AS`).
- **Le forme**: il motore disegna per `wheelchair` solo cerchio, cuore,
  stella e luna (`Activity.shapes`); ogni altra forma, una parola,
  un'immagine, un disegno o un tratto è una richiesta non valida, prima di
  toccare la rete.
- **Quanto pesa una zona `wheel`.** Il server la scarica grande quanto il
  percorso più lungo, 5 km: circa 8,5 × 8,5 km attorno al centro di una
  città (`longest_route_box`; quella della corsa è 17 × 17 km). Dal
  download più grande di ogni zona della parte 0 (`weigh.py`, il pezzo più
  grande letto come lo legge il server):

  | Zona | download | km a piedi | km `wheel` | sul disco | in memoria |
  |---|---|---|---|---|---|
  | trento | 8,5 × 8,5 km | 1.220,2 | 668,2 | 24 MB | 32 MB |
  | valsugana | 8,5 × 8,5 km | 578,1 | 193,8 | 4 MB | 4 MB |
  | milano | 5,7 × 5,7 km | 1.534,8 | 1.363,0 | 52 MB | 75 MB |
  | fiemme | 8,5 × 8,5 km | 518,2 | 143,1 | 3 MB | 3 MB |
  | asiago | 8,5 × 8,5 km | 407,3 | 89,2 | 2 MB | 2 MB |
  | pianura | 8,5 × 8,5 km | 701,2 | 460,0 | 10 MB | 13 MB |

  A Milano il download del banco è più piccolo: sulla zona del server, più
  del doppio dell'area, circa 170 MB. Il server ne tiene una in memoria
  (`ZONES_IN_MEMORY`), accanto alle altre: da pochi MB in montagna a circa
  170 MB in una grande città, meno di una zona del Roller (452 MB a
  Milano).

## Cosa resta da misurare

- **Le salite**: il motore non conosce le quote. Se la parte G di TASK-347
  porta il dislivello dal server (ADR-0300), carrozzina e passeggino sono,
  col Roller, i primi sport a volerlo anche per scegliere le vie.
- **Sul server**: il primo percorso di una zona appena scaricata, dopo il
  passo server della parte A.
