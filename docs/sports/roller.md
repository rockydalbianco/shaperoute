# Roller (pattini in linea)

TASK-380, ADR-0324. Le scelte dell'utente del 2026-11-06 sono in
`tasks/TASK-380.md`:

- «Roller» 🛼 sulla rete `roller` qui sotto;
- da 5 a 30 km;
- nel gioco come chi va a piedi, con record personali propri.

Qui ci sono le misure che hanno preparato le scelte.

## Le reti provate (TASK-380 parte 0, 2026-11-06)

Banco `tools/sport_bench/` sul Mac, `main` `e9960204`, `nice -n 10`, un
comando per volta. Le reti non sono nel motore: le dà `--loader
out/TASK-380/loader.py`. JSON e script in `out/TASK-380/` (ignorato da
git). Nessun download da Overpass:

- le reti si costruiscono dai **download grezzi della bici** della parte 0
  di TASK-378 (`raw_*.pickle`, con `surface`, `smoothness`, `tracktype`,
  `foot`, `access`);
- quei download coprono le zone di 30 km della bici di allora. Le zone di
  30 km di oggi sono circa 1,5 km più larghe per lato: il loader usa il
  download che copre di più. Per questo **la base della bici è rifatta
  dagli stessi download** (`bikeraw`, le regole vere di
  `networks/bike.py`): Roller e bici stanno sulla stessa area. Dà gli
  stessi numeri della bici in `gravel.md`: 54 su 54, 23 buone, 0,87.

Le richieste sono di bici (`--activity cycling`), a 10, 20 e 30 km come la
bici, perché il motore non conosce ancora il Roller: il grafo è segnato
come rete bike, come per la MTB in TASK-378. Nel grafo **ogni via va nei
due sensi**: chi pattina, per il Codice della strada (art. 190), è un
pedone, e quindi niente sensi unici e niente tratti «a piedi con la bici».
I 5 km, sotto il minimo della bici, si chiedono come corsa sulla stessa
rete (`rollerrun`).

Le reti:

- **`roller`**: le vie lisce e asfaltate.
  - **Dentro**: ciclabili, marciapiedi e `footway`, aree pedonali, strade
    residenziali, `living_street`, `service`, `unclassified` e
    terziarie.
  - **`path` e `track`** solo se dicono una superficie liscia (o
    `tracktype=grade1`).
  - **La superficie**, se c'è, dev'essere liscia: `asphalt`, `concrete`,
    `concrete:plates`, `paved`, `paving_stones`, `tartan`, `rubber`,
    `acrylic`, `metal`. Se manca, strade e marciapiedi valgono come
    asfaltati, sentieri e carrarecce come sterrati.
  - **Fuori**: `smoothness` da `bad` in giù, `foot=no`, `access` `no` o
    `private`, strade principali e secondarie.
- **`rollerquiet`**: `roller` senza terziarie e senza autobloccanti
  (`paving_stones`); `smoothness=intermediate` fuori. È la lettura più
  severa.
- **`rollersec`**: `roller` con le strade secondarie. Serve a misurare
  quanto conta lasciarle fuori: senza, la montagna si spezza.
- **`rollerflat`**: `roller` senza i tratti più ripidi dell'8% da un capo
  all'altro, con le quote delle tegole Terrarium (`CONDIVISO.md`, «Le
  quote»), solo sui tratti di almeno 60 m.

Su cosa corrono i percorsi e quanto salgono lo dice `out/TASK-380/mix.py`:
rifà le stesse richieste, legge gli archi del percorso (superficie, tipo di
via) e ne calcola il profilo dalle tegole Terrarium (zoom 13, circa 30 m,
media su 75 m). **Le quote hanno un rumore di fondo**: in pianura e a
Milano danno 40–75 m di salita ogni 10 km su terreno piatto, e qualche
tratto fino all'8% (ponti e sottopassi). Contano le differenze fra le zone,
non i metri esatti.

**In breve:**

- **Il tag `inline_skates` non serve.** Su sei zone c'è solo a Trento: 4,5
  km di ciclabili con `inline_skates=yes`. Zero a Milano, in Valsugana, a
  Fiemme, ad Asiago e in pianura (`out/TASK-380/skates_tag.py`). La rete si
  fa con la superficie, non con quel tag.
- **`roller` regge in città e in pianura, non in montagna.** 34 percorsi su
  54, 10 buoni, somiglianza mediana 0,80 (la bici: 54, 23, 0,87).
  - **Milano**: 8 su 9, tutti buoni.
  - **Trento**: 9 su 9; **pianura**: 8 su 9.
  - **Valsugana**: 5 su 9; **Fiemme** e **Asiago**: 2 su 9, solo stelle.
  - A 5 km: 13 su 18, Milano 3 su 3 buoni.
- **In montagna la rete si spezza.** Ad Asiago i download hanno 643 km di
  vie pattinabili, ma il pezzo collegato più grande ne ha 75; a Fiemme
  490 km e 242 km. Paesi e frazioni si collegano con strade secondarie o
  provinciali, che `roller` lascia fuori.
- **Con le secondarie (`rollersec`)** si sale a 42 su 54, 14 buoni:
  Valsugana 8 su 9, Fiemme e Asiago 4 su 9. Ma il 12,4% dei km sta su
  strade secondarie, con traffico veloce, dove coi pattini non si va.
- **`rollerquiet` è troppo stretta**: 21 su 54, nessuno a Fiemme. Le auto
  scendono dal 61% al 41% dei km.
- **Le superfici sono quelle giuste.** I percorsi di `roller` non passano
  mai su ciottoli, porfido, sterrato o strade principali. Il 4,4% è su
  autobloccanti. Il 61% dei km è su strade con le auto (residenziali,
  `service`, `unclassified`, terziarie), il 39% senza.

  La bici, sulla stessa area, fa:
  - il 25,3% su sterrato;
  - il 4,6% su ciottoli e porfido;
  - il 14,6% su strade principali e secondarie.
- **Le salite restano.** A Trento `roller` sale 210 m ogni 10 km, con un
  tratto di 200 m al 22%; a Fiemme 242 m e il 21%. Sono le strade
  asfaltate di collina, di solito `unclassified`. La bici sale di più
  (270 m e 42% a Trento), perché prende anche i sentieri. In discesa, coi
  pattini, un tratto al 15–20% è pericoloso.
- **Superficie scritta o supposta.** Della rete `roller`, il 35–67% dei km
  dice la sua superficie in OSM; il resto è supposto asfaltato perché è
  una strada o un marciapiede. `smoothness` c'è sul 2–12%.
- **Senza i tratti sopra l'8% (`rollerflat`)** le salite di Trento
  scendono a 95 m ogni 10 km e il tratto più ripido al 13%, ma si scende
  a 26 su 54: Trento 5 su 9, Fiemme 0. E vorrebbe le quote nel motore,
  che oggi non le ha.
- **I tempi** sono quelli della bici: mediana 1,9 s. C'è un solo caso
  lungo: un cuore di 30 km a Milano che dopo 67,8 s non riesce.

### Su cosa corrono i percorsi

Sei zone, 54 richieste per rete a 10, 20 e 30 km; percentuali sui km dei
percorsi riusciti (`out/TASK-380/summ.py` dai JSON `mix-*-6.json`).
«Strade con le auto» sono residenziali, `service`, `unclassified`,
terziarie; «senza auto» ciclabili, marciapiedi, aree pedonali, `path` e
`track`.

| Rete | riusciti | buoni | somiglianza mediana | km | ciottoli e porfido | sterrato | autobloccanti | strade principali e secondarie | strade con le auto | senza auto | a piedi con la bici |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `bikeraw` (la bici) | 54 su 54 | 23 | 0,87 | 1082,0 | 4,6 % | 25,3 % | 1,9 % | 14,6 % | 54,3 % | 31,1 % | 4,8 % |
| `roller` | 34 su 54 | 10 | 0,80 | 654,6 | 0,0 % | 0,0 % | 4,4 % | 0,0 % | 60,9 % | 39,1 % | 0,0 % |
| `rollerquiet` | 21 su 54 | 8 | 0,78 | 379,1 | 0,0 % | 0,0 % | 0,0 % | 0,0 % | 41,5 % | 58,5 % | 0,0 % |
| `rollersec` | 42 su 54 | 14 | 0,80 | 791,2 | 0,0 % | 0,0 % | 3,2 % | 12,4 % | 58,7 % | 28,9 % | 0,0 % |

### Forme e salite per zona

«Salita ogni 10 km» è la mediana dei percorsi riusciti; «tratto più
ripido» il massimo, su 200 m; «km sopra il 6%» la somma, su tratti di 100
m. Il rumore delle quote è sopra.

| Rete | zona | riusciti | buoni | somiglianza mediana | salita ogni 10 km | tratto più ripido | km sopra il 6 % |
|---|---|---|---|---|---|---|---|
| `bikeraw` | trento | 9 su 9 | 4 | 0,89 | 270 m | 42,2 % | 63,4 |
| `bikeraw` | valsugana | 9 su 9 | 3 | 0,83 | 318 m | 54,4 % | 81,6 |
| `bikeraw` | milano | 9 su 9 | 9 | 0,97 | 75 m | 7,6 % | 3,3 |
| `bikeraw` | fiemme | 9 su 9 | 2 | 0,86 | 426 m | 34,3 % | 105,0 |
| `bikeraw` | asiago | 9 su 9 | 1 | 0,79 | 244 m | 35,2 % | 64,2 |
| `bikeraw` | pianura | 9 su 9 | 4 | 0,86 | 46 m | 6,1 % | 0,4 |
| `roller` | trento | 9 su 9 | 2 | 0,80 | 210 m | 22,0 % | 54,7 |
| `roller` | valsugana | 5 su 9 | 0 | 0,73 | 199 m | 16,5 % | 22,2 |
| `roller` | milano | 8 su 9 | 8 | 0,96 | 74 m | 8,4 % | 3,2 |
| `roller` | fiemme | 2 su 9 | 0 | 0,67 | 242 m | 21,4 % | 10,1 |
| `roller` | asiago | 2 su 9 | 0 | 0,73 | 156 m | 11,3 % | 3,8 |
| `roller` | pianura | 8 su 9 | 0 | 0,69 | 40 m | 4,6 % | 0,2 |
| `rollerquiet` | trento | 5 su 9 | 1 | 0,71 | 78 m | 20,6 % | 12,1 |
| `rollerquiet` | valsugana | 1 su 9 | 0 | 0,69 | 335 m | 16,5 % | 4,9 |
| `rollerquiet` | milano | 9 su 9 | 7 | 0,93 | 85 m | 11,4 % | 6,6 |
| `rollerquiet` | fiemme | 0 su 9 | 0 | — | — | — | — |
| `rollerquiet` | asiago | 1 su 9 | 0 | 0,62 | 108 m | 6,2 % | 0,4 |
| `rollerquiet` | pianura | 5 su 9 | 0 | 0,73 | 40 m | 3,0 % | 0,0 |
| `rollersec` | trento | 9 su 9 | 3 | 0,78 | 228 m | 23,7 % | 51,9 |
| `rollersec` | valsugana | 8 su 9 | 1 | 0,76 | 227 m | 30,1 % | 50,2 |
| `rollersec` | milano | 9 su 9 | 9 | 0,96 | 69 m | 6,1 % | 3,8 |
| `rollersec` | fiemme | 4 su 9 | 0 | 0,71 | 315 m | 18,0 % | 30,5 |
| `rollersec` | asiago | 4 su 9 | 0 | 0,83 | 154 m | 15,6 % | 10,4 |
| `rollersec` | pianura | 8 su 9 | 1 | 0,75 | 42 m | 4,6 % | 0,4 |

### Quanto si pattina

Km dei download grezzi di ogni zona (ogni tratto contato una volta,
`out/TASK-380/tags.py`), con le regole di ogni rete, prima di tenere il
pezzo collegato più grande. La rete del banco (sotto) è quel pezzo.

| Zona | bici (pedalabile) | `roller` | `rollerquiet` | `rollersec` | `roller` con la superficie scritta | `roller` con `smoothness` | ciottoli e porfido |
|---|---|---|---|---|---|---|---|
| trento | 3.681,9 | 2.239,2 | 1.990,9 | 2.464,0 | 1.493,1 (67 %) | 120,0 | 90,8 |
| valsugana | 2.554,6 | 1.229,8 | 1.078,1 | 1.351,7 | 750,3 (61 %) | 129,8 | 26,0 |
| milano | 6.697,2 | 9.629,8 | 8.572,9 | 9.948,0 | 6.112,7 (63 %) | 468,5 | 111,9 |
| fiemme | 1.845,0 | 489,8 | 400,7 | 579,5 | 288,7 (59 %) | 20,9 | 30,9 |
| asiago | 1.815,7 | 643,2 | 521,4 | 764,4 | 339,4 (53 %) | 75,9 | 3,2 |
| pianura | 2.158,1 | 1.617,9 | 1.521,1 | 1.742,5 | 566,0 (35 %) | 40,0 | 21,8 |

A Milano il Roller ha più km della bici: i marciapiedi (`footway`, quasi
4.000 km) chi pattina li percorre, la bici no.

### Rete `roller`

| Zona | km di rete | pezzi | pezzo più grande | incroci | vicoli ciechi |
|---|---|---|---|---|---|
| trento | 1215,4 | 1 | 1215,4 km | 11643 | 5570 |
| valsugana | 672,8 | 1 | 672,8 km | 3044 | 1747 |
| milano | 9270,7 | 1 | 9270,7 km | 121510 | 23910 |
| fiemme | 241,6 | 1 | 241,6 km | 1025 | 648 |
| asiago | 74,7 | 1 | 74,7 km | 376 | 223 |
| pianura | 1149,6 | 1 | 1149,6 km | 7025 | 2346 |

- trento, km per `highway`: service 294,1, unclassified 263,8, footway 252,6, residential 153,9, tertiary 118,7, cycleway 83,5, track 38,7, pedestrian 6,1, path 3,2, living_street 0,6, tertiary_link 0,2
- valsugana, km per `highway`: unclassified 284,4, residential 140,9, tertiary 74,1, service 67,5, footway 38,2, track 26,6, cycleway 19,7, path 19,1, pedestrian 1,7, tertiary_link 0,4, living_street 0,2
- milano, km per `highway`: footway 3966,1, residential 1937,1, service 1280,9, unclassified 708,1, cycleway 612,5, tertiary 602,1, pedestrian 95,0, path 44,3, tertiary_link 10,2, track 8,9, living_street 5,4
- fiemme, km per `highway`: unclassified 56,4, residential 55,6, tertiary 38,0, cycleway 30,4, footway 26,0, service 24,4, track 7,8, path 1,4, living_street 0,9, tertiary_link 0,5, pedestrian 0,3
- asiago, km per `highway`: residential 34,3, unclassified 27,3, service 5,9, footway 3,4, path 1,7, pedestrian 1,1, tertiary 0,6, cycleway 0,4
- pianura, km per `highway`: residential 390,6, unclassified 316,5, service 133,7, cycleway 96,3, footway 76,5, tertiary 62,4, track 38,8, path 30,0, pedestrian 3,9, living_street 0,8, tertiary_link 0,0

Le altre reti, km del pezzo più grande:

| Zona | bici (`bikeraw`) | `roller` | `rollerquiet` | `rollersec` |
|---|---|---|---|---|
| trento | 5077,1 | 1215,4 | 792,2 | 2261,6 |
| valsugana | 3457,7 | 672,8 | 190,4 | 1028,5 |
| milano | 11043,8 | 9270,7 | 7739,5 | 9730,9 |
| fiemme | 2653,3 | 241,6 | 25,9 | 378,6 |
| asiago | 2574,6 | 74,7 | 45,6 | 503,1 |
| pianura | 2259,1 | 1149,6 | 490,0 | 1577,9 |

### Forme con `roller`

| Zona | chiesti | riusciti (≥ 0,60) | buoni (≥ 0,90) | somiglianza mediana | tempo mediano | tempo massimo |
|---|---|---|---|---|---|---|
| trento | 9 | 9 | 2 | 0,80 | 2,1 s | 5,1 s |
| valsugana | 9 | 5 | 0 | 0,73 | 1,4 s | 7,1 s |
| milano | 9 | 8 | 8 | 0,96 | 8,0 s | 67,8 s |
| fiemme | 9 | 2 | 0 | 0,67 | 1,6 s | 4,3 s |
| asiago | 9 | 2 | 0 | 0,73 | 1,3 s | 3,3 s |
| pianura | 9 | 8 | 0 | 0,69 | 2,4 s | 6,8 s |
| tutte | 54 | 34 | 10 | 0,80 | 1,9 s | 67,8 s |

A 5 km (`rollerrun`, richieste di corsa sulla stessa rete):

| Zona | chiesti | riusciti (≥ 0,60) | buoni (≥ 0,90) | somiglianza mediana | tempo mediano | tempo massimo |
|---|---|---|---|---|---|---|
| trento | 3 | 3 | 0 | 0,69 | 1,4 s | 1,8 s |
| valsugana | 3 | 2 | 0 | 0,67 | 0,5 s | 5,2 s |
| milano | 3 | 3 | 3 | 0,93 | 3,9 s | 8,5 s |
| fiemme | 3 | 1 | 0 | 0,80 | 0,8 s | 3,0 s |
| asiago | 3 | 1 | 0 | 0,75 | 0,7 s | 3,1 s |
| pianura | 3 | 3 | 0 | 0,67 | 0,9 s | 4,3 s |
| tutte | 18 | 13 | 3 | 0,75 | 1,4 s | 8,5 s |

Le altre reti, tutte le zone:

| Rete | chiesti | riusciti (≥ 0,60) | buoni (≥ 0,90) | somiglianza mediana | tempo mediano | tempo massimo |
|---|---|---|---|---|---|---|
| `bikeraw` | 54 | 54 | 23 | 0,87 | 1,8 s | 12,5 s |
| `rollerquiet` | 54 | 21 | 8 | 0,78 | 2,0 s | 17,0 s |
| `rollersec` | 54 | 42 | 14 | 0,80 | 2,1 s | 14,1 s |

### Percorsi con `roller`

| Zona | forma | km chiesti | km reali | somiglianza | tempo | esito |
|---|---|---|---|---|---|---|
| trento | circle | 10 | 10,0 | 0,81 | 1,4 s | riuscito |
| trento | circle | 20 | 19,8 | 0,69 | 2,0 s | riuscito |
| trento | circle | 30 | 30,2 | 0,80 | 5,1 s | riuscito |
| trento | heart | 10 | 10,4 | 0,60 | 1,8 s | riuscito |
| trento | heart | 20 | 20,2 | 0,74 | 3,0 s | riuscito |
| trento | heart | 30 | 29,8 | 0,73 | 3,4 s | riuscito |
| trento | star | 10 | 10,4 | 0,94 | 1,6 s | buono |
| trento | star | 20 | 18,2 | 0,91 | 2,1 s | buono |
| trento | star | 30 | 29,2 | 0,90 | 4,1 s | riuscito |
| valsugana | circle | 10 | — | — | 1,7 s | ShapeNotDrawableError |
| valsugana | circle | 20 | — | — | 2,6 s | ShapeNotDrawableError |
| valsugana | circle | 30 | 28,6 | 0,60 | 1,4 s | riuscito |
| valsugana | heart | 10 | — | — | 1,2 s | ShapeNotDrawableError |
| valsugana | heart | 20 | 18,6 | 0,61 | 1,1 s | riuscito |
| valsugana | heart | 30 | — | — | 7,1 s | ShapeNotDrawableError |
| valsugana | star | 10 | 9,6 | 0,85 | 0,6 s | riuscito |
| valsugana | star | 20 | 20,1 | 0,85 | 1,1 s | riuscito |
| valsugana | star | 30 | 31,9 | 0,73 | 2,9 s | riuscito |
| milano | circle | 10 | 10,0 | 0,96 | 5,6 s | buono |
| milano | circle | 20 | 20,3 | 0,97 | 8,2 s | buono |
| milano | circle | 30 | 30,0 | 1,00 | 9,9 s | buono |
| milano | heart | 10 | 10,9 | 0,92 | 5,0 s | buono |
| milano | heart | 20 | 19,9 | 0,97 | 8,0 s | buono |
| milano | heart | 30 | — | — | 67,8 s | ShapeNotDrawableError |
| milano | star | 10 | 10,2 | 0,95 | 4,0 s | buono |
| milano | star | 20 | 18,3 | 1,00 | 7,5 s | buono |
| milano | star | 30 | 30,8 | 0,91 | 10,1 s | buono |
| fiemme | circle | 10 | — | — | 1,6 s | ShapeNotDrawableError |
| fiemme | circle | 20 | — | — | 1,9 s | ShapeNotDrawableError |
| fiemme | circle | 30 | — | — | 4,3 s | ShapeNotDrawableError |
| fiemme | heart | 10 | — | — | 1,0 s | ShapeNotDrawableError |
| fiemme | heart | 20 | — | — | 1,6 s | ShapeNotDrawableError |
| fiemme | heart | 30 | — | — | 2,1 s | ShapeNotDrawableError |
| fiemme | star | 10 | 8,5 | 0,74 | 1,0 s | riuscito |
| fiemme | star | 20 | 21,7 | 0,60 | 0,7 s | riuscito |
| fiemme | star | 30 | — | — | 1,7 s | ShapeNotDrawableError |
| asiago | circle | 10 | — | — | 1,3 s | ShapeNotDrawableError |
| asiago | circle | 20 | — | — | 1,5 s | ShapeNotDrawableError |
| asiago | circle | 30 | — | — | 3,3 s | ShapeNotDrawableError |
| asiago | heart | 10 | — | — | 1,0 s | ShapeNotDrawableError |
| asiago | heart | 20 | — | — | 1,3 s | ShapeNotDrawableError |
| asiago | heart | 30 | — | — | 1,4 s | ShapeNotDrawableError |
| asiago | star | 10 | 9,5 | 0,79 | 0,6 s | riuscito |
| asiago | star | 20 | 18,9 | 0,67 | 0,9 s | riuscito |
| asiago | star | 30 | — | — | 2,0 s | ShapeNotDrawableError |
| pianura | circle | 10 | 9,2 | 0,70 | 0,8 s | riuscito |
| pianura | circle | 20 | — | — | 2,9 s | ShapeNotDrawableError |
| pianura | circle | 30 | 31,0 | 0,61 | 6,8 s | riuscito |
| pianura | heart | 10 | 10,3 | 0,66 | 1,0 s | riuscito |
| pianura | heart | 20 | 19,0 | 0,63 | 3,0 s | riuscito |
| pianura | heart | 30 | 29,3 | 0,68 | 3,3 s | riuscito |
| pianura | star | 10 | 11,6 | 0,86 | 1,0 s | riuscito |
| pianura | star | 20 | 18,2 | 0,76 | 1,8 s | riuscito |
| pianura | star | 30 | 29,8 | 0,80 | 2,4 s | riuscito |

### Rete `rollerflat`

`roller` senza i tratti più ripidi dell'8% (almeno 60 m, quote Terrarium
ai due capi). Toglie le salite, ma in montagna anche le forme:

| Zona | chiesti | riusciti (≥ 0,60) | buoni (≥ 0,90) | somiglianza mediana | salita ogni 10 km | tratto più ripido | km sopra il 6 % | km di rete |
|---|---|---|---|---|---|---|---|---|
| trento | 9 | 5 | 1 | 0,80 | 95 m | 13,3 % | 7,7 | 715,3 |
| valsugana | 9 | 2 | 0 | 0,63 | 124 m | 9,1 % | 1,9 | 147,7 |
| milano | 9 | 9 | 9 | 0,97 | 73 m | 8,8 % | 3,8 | 9265,1 |
| fiemme | 9 | 0 | 0 | — | — | — | — | 85,3 |
| asiago | 9 | 2 | 0 | 0,75 | 122 m | 11,3 % | 2,3 | 63,6 |
| pianura | 9 | 8 | 0 | 0,69 | 40 m | 4,6 % | 0,2 | 1149,1 |
| tutte | 54 | 26 | 10 | 0,80 | | | | |

Sui km dei percorsi riusciti: 0% su ciottoli, sterrato e strade
principali e secondarie, 5,9% su autobloccanti, 50,1% su strade con le
auto. Il tempo massimo è 66,0 s, lo stesso cuore di 30 km a Milano, che
questa volta riesce. Un filtro sulle quote vorrebbe le tegole dentro il
motore, sul server e sul telefono: oggi il motore non le ha (ADR-0300,
parte G di TASK-347, non ancora codice).

## La parte A sul motore vero (TASK-380 A, 2026-11-06)

Banco sul Mac, branch `feat/TASK-380-a-roller-engine-api`, `nice -n 10`,
un comando per volta. JSON e script in `out/TASK-380-a` (ignorato da git).

- **Corsa, bici e canoa non cambiano.** Contro `main`, con la stessa cache
  delle sei zone: corsa 54, bici 54, canoa 27 percorsi, identici punto per
  punto (`compare --same`: «Nothing worse»). I nove percorsi fissi di
  `test_same_routes.py` hanno gli stessi hash: l'impronta del motore resta
  (`SAME_ROUTES_AS`, precisazione di ADR-0324).
- **La rete `roller` scaricata col suo filtro** sulle zone intere di oggi
  è quella della parte 0. Overpass ha risposto «al completo» (502) più
  volte: Fiemme è entrata in un secondo giro.
  - km del pezzo più grande: Trento 1.215,4, Valsugana 672,8, Milano
    9.271,4, Fiemme 241,6, Asiago 74,7, pianura 1.149,6 (parte 0: gli
    stessi, Milano 9.270,7);
  - a Trento la zona intera ha 2.239 km pattinabili, come i download della
    bici (2.239,2).
- **Le forme sono quelle della parte 0**, zona per zona:
  - a 10, 20 e 30 km: 34 su 54, 10 buoni, somiglianza mediana 0,80;
  - a 5 km, ora richieste da Roller e non da corsa: 13 su 18, 3 buoni,
    0,75;
  - Milano 11 su 12, tutti buoni; Trento 12 su 12; pianura 11 su 12;
    Valsugana 7, Fiemme 3, Asiago 3 su 12.
- **I tempi**: mediana 1,5 s. Il primo percorso di 30 km di una zona
  appena scaricata ha preso da 83 a 266 s (Trento, cerchio, 195 s); rifatto
  a cache calda, 5,1 s, come nella parte 0. Gli altri restano sotto i 15 s.
- **Quanto pesa una zona `roller`**, grande come quella della bici per i
  30 km (`tracemalloc`, `out/TASK-380-a/weigh.py`):

  | Zona | `roller` sul disco | in memoria | bici sul disco | in memoria |
  |---|---|---|---|---|
  | trento | 34 MB | 76 MB | 64 MB | 127 MB |
  | valsugana | 12 MB | 25 MB | 30 MB | 51 MB |
  | milano | 202 MB | 452 MB | 244 MB | 529 MB |
  | asiago | 5 MB | 10 MB | 17 MB | 25 MB |
  | pianura | 16 MB | 35 MB | 22 MB | 77 MB |

  Il server ne tiene una in memoria (`ZONES_IN_MEMORY`), accanto a quelle
  della bici e della MTB: altri 76 MB a Trento, fino a circa 450 MB a
  Milano.

### Il controllo «veicolo» del gioco

Il gioco scarta una corsa con più del 10% su tratti di 200 m sopra i 25,2
km/h (7 m/s), o con una media sopra i 21,6 km/h (6 m/s) oltre i 3 km
(`game_rules.py`). Il Roller ha gli stessi controlli (scelta dell'utente 4).

Nessun Roller è mai stato salvato: le pattinate sono fatte dal banco
(`out/TASK-380-a/vehicle.py`). Sono i 47 percorsi riusciti qui sopra,
con le quote delle tegole Terrarium e un punto ogni 2 s, a tre andature:

- **tranquilla**: 15 km/h in piano, frena oltre i 25 in discesa;
- **allenata**: 20 km/h in piano, lascia andare fino a 35;
- **veloce**: 25 km/h in piano, fino a 45.

In salita si rallenta (`1 − 6 × pendenza`, al minimo il 35%). In discesa
si va alla velocità che la pendenza dà a chi non spinge e non frena
(attrito 0,008, aria 0,35 m², 75 kg), mai più piano che in piano.

| Andatura | media | contate oggi | con 35 km/h e 28 di media | con 45 km/h e 32 di media |
|---|---|---|---|---|
| tranquilla | 14–15 km/h | 47 su 47 | 47 | 47 |
| allenata | 18–20 km/h | 26 su 47 | 47 | 47 |
| veloce | 22–24 km/h | 0 su 47 | 28 | 47 |

- **Chi pattina tranquillo non è mai scartato.**
- **Chi va a 20 km/h è scartato in collina**, per le discese: Trento 9 su
  12, Valsugana 7 su 7, Fiemme 3 su 3, Asiago 2 su 3. Mai a Milano e in
  pianura.
- **Chi va a 25 km/h è scartato sempre**, anche in pianura: la sua media
  supera i 21,6 km/h.
- **Le quote hanno un rumore di fondo** (ponti, sottopassi): a Milano un
  allenato ha brevi tratti sopra i 25 km/h, ma mai abbastanza da essere
  scartato.

Una soglia per sport è una scelta dell'utente (`tasks/TASK-380.md`, «Un
punto aperto»). La proposta: per il Roller 35 km/h su 200 m e 28 km/h di
media. Nessun pattinatore tranquillo o allenato è scartato, e i più veloci
solo in parte. Il prezzo: una bici a 25–30 km/h passerebbe per un
Roller. Un'auto su strada aperta resta fuori; nel traffico di città, piano,
passa già oggi.

## Cosa resta da misurare

- **Le discese**: il motore non conosce le quote. Se la parte G di
  TASK-347 porta il dislivello dal server (ADR-0300), il Roller sarà il
  primo sport a volerlo anche per scegliere le vie.
