# Escursionismo («Hike» ⛰️)

Attività `hiking` (TASK-377, ADR-0321 accettato), il pilota della struttura
degli sport (TASK-376). Nome, emoji, distanze, rete e testi sono scelte
dell'utente: qui ci sono le misure che le preparano.

## Le due reti provate (TASK-377 parte 0, 2026-11-05)

Banco `tools/sport_bench/` sul Mac, `main` `95c46c3f`, `nice -n 10`, un
comando per volta. Le reti non sono nel motore: le dà `--loader
out/TASK-377/loader.py`. Le richieste sono di corsa (`--activity running`),
perché il motore non conosce ancora `hiking`. Cache in `out/TASK-377/cache`,
JSON in `out/sport-bench/hike-*`. Cerchio, cuore e stella a 5, 10 e 20 km.
Il tempo è quello del motore, col grafo già in cache.

- **`trails`**: solo le vie di un'escursione (`highway` path, footway,
  track, bridleway, steps, pedestrian).
- **`outdoor`**: la rete foot della corsa senza le strade delle auto
  (trunk, primary, secondary, tertiary).
- **Tutte e due** si fermano a `sac_scale` T3, «demanding mountain
  hiking»: i percorsi alpinistici restano fuori.

**In breve:**

- **`trails` non regge.** A Trento il pezzo che tocca la partenza è di 88
  km, quasi tutto marciapiede di città, con 3 forme su 9. Non l'ho portata
  sulle altre zone.
- **`outdoor` dà 46 percorsi su 54** (21 buoni), somiglianza mediana 0,87.
  Città e pianura riescono tutte. In montagna riescono 6–7 su 9:
  - Valsugana 6, Fiemme 6, Asiago 7;
  - il cerchio è la forma più difficile, come per la corsa;
  - i tre cerchi da 20 km che non riescono ci mettono 72–102 s a dirlo.
- **Lontano dalle città** la rete `outdoor` è soprattutto `track` e `path`:
  a Fiemme 706 km su 898.

### Rete `outdoor`

| Zona | km di rete | pezzi | pezzo più grande | incroci | vicoli ciechi |
|---|---|---|---|---|---|
| trento | 2419,3 | 1 | 2419,3 km | 17228 | 7574 |
| valsugana | 1461,1 | 1 | 1461,1 km | 5398 | 2624 |
| fiemme | 898,2 | 1 | 898,2 km | 1964 | 903 |
| asiago | 630,2 | 1 | 630,2 km | 1323 | 551 |
| milano | 6746,8 | 1 | 6746,8 km | 93232 | 16834 |
| pianura | 1003,6 | 1 | 1003,6 km | 6515 | 1995 |

- trento, km per `highway`: track 667,1, path 479,4, service 344,8, footway 321,1, unclassified 304,5, residential 203,3, cycleway 81,8, pedestrian 13,5, steps 2,8, living_street 0,8, busway 0,2, bridleway 0,1
- valsugana, km per `highway`: track 511,6, path 379,9, unclassified 236,9, residential 181,1, service 81,7, footway 51,0, cycleway 13,8, pedestrian 3,2, steps 1,6, living_street 0,2, bridleway 0,1
- fiemme, km per `highway`: track 465,8, path 239,7, unclassified 76,3, residential 42,6, service 25,5, footway 22,4, cycleway 22,3, steps 2,3, pedestrian 0,6, living_street 0,5
- asiago, km per `highway`: track 284,4, path 178,4, unclassified 76,6, residential 63,9, service 15,1, footway 5,8, cycleway 4,0, pedestrian 1,4, steps 0,4, road 0,1
- milano, km per `highway`: footway 3588,2, residential 1297,4, service 841,7, unclassified 322,9, cycleway 306,5, path 144,2, track 94,8, pedestrian 92,1, steps 54,3, living_street 2,4, corridor 1,2, busway 0,9, demolished 0,2, bus_stop 0,1, elevator 0,0
- pianura, km per `highway`: residential 337,0, unclassified 187,1, service 140,0, track 115,0, footway 82,8, cycleway 80,2, path 53,0, pedestrian 6,5, steps 1,6, living_street 0,4

L'area è quella dei percorsi da 20 km: i km non si confrontano con quelli
di `run.md`, misurati per i 10 km.

### Forme con `outdoor`

| Zona | chiesti | riusciti (≥ 0,60) | buoni (≥ 0,90) | somiglianza mediana | tempo mediano | tempo massimo |
|---|---|---|---|---|---|---|
| trento | 9 | 9 | 7 | 0,91 | 2,0 s | 3,6 s |
| valsugana | 9 | 6 | 0 | 0,77 | 1,3 s | 74,3 s |
| fiemme | 9 | 6 | 0 | 0,79 | 1,1 s | 102,1 s |
| asiago | 9 | 7 | 1 | 0,74 | 0,5 s | 71,6 s |
| milano | 9 | 9 | 9 | 0,99 | 4,2 s | 7,0 s |
| pianura | 9 | 9 | 4 | 0,87 | 0,9 s | 1,7 s |
| tutte | 54 | 46 | 21 | 0,87 | 1,3 s | 102,1 s |

### Percorsi con `outdoor`

| Zona | forma | km chiesti | km reali | somiglianza | tempo | esito |
|---|---|---|---|---|---|---|
| trento | circle | 5 | 5,1 | 0,96 | 0,7 s | buono |
| trento | circle | 10 | 8,9 | 0,84 | 2,0 s | riuscito |
| trento | circle | 20 | 19,2 | 0,91 | 2,5 s | buono |
| trento | heart | 5 | 5,1 | 0,91 | 0,9 s | buono |
| trento | heart | 10 | 9,9 | 0,86 | 2,2 s | riuscito |
| trento | heart | 20 | 19,9 | 0,91 | 3,6 s | buono |
| trento | star | 5 | 4,8 | 0,98 | 0,6 s | buono |
| trento | star | 10 | 10,4 | 0,93 | 1,0 s | buono |
| trento | star | 20 | 19,0 | 0,99 | 2,1 s | buono |
| valsugana | circle | 5 | 4,2 | 0,65 | 0,6 s | riuscito |
| valsugana | circle | 10 | — | — | 1,8 s | ShapeNotDrawableError |
| valsugana | circle | 20 | — | — | 74,3 s | ShapeNotDrawableError |
| valsugana | heart | 5 | 4,8 | 0,73 | 0,6 s | riuscito |
| valsugana | heart | 10 | — | — | 1,3 s | ShapeNotDrawableError |
| valsugana | heart | 20 | 21,8 | 0,72 | 1,3 s | riuscito |
| valsugana | star | 5 | 5,4 | 0,80 | 0,6 s | riuscito |
| valsugana | star | 10 | 9,0 | 0,83 | 0,7 s | riuscito |
| valsugana | star | 20 | 20,4 | 0,85 | 2,2 s | riuscito |
| fiemme | circle | 5 | — | — | 1,5 s | ShapeNotDrawableError |
| fiemme | circle | 10 | — | — | 1,7 s | ShapeNotDrawableError |
| fiemme | circle | 20 | — | — | 102,1 s | ShapeNotDrawableError |
| fiemme | heart | 5 | 3,7 | 0,84 | 0,5 s | riuscito |
| fiemme | heart | 10 | 11,3 | 0,73 | 1,1 s | riuscito |
| fiemme | heart | 20 | 18,5 | 0,69 | 1,3 s | riuscito |
| fiemme | star | 5 | 4,8 | 0,86 | 0,5 s | riuscito |
| fiemme | star | 10 | 9,6 | 0,89 | 0,7 s | riuscito |
| fiemme | star | 20 | 21,3 | 0,75 | 0,7 s | riuscito |
| asiago | circle | 5 | — | — | 1,3 s | ShapeNotDrawableError |
| asiago | circle | 10 | 9,3 | 0,63 | 1,4 s | riuscito |
| asiago | circle | 20 | — | — | 71,6 s | ShapeNotDrawableError |
| asiago | heart | 5 | 3,8 | 0,74 | 0,4 s | riuscito |
| asiago | heart | 10 | 10,3 | 0,61 | 0,5 s | riuscito |
| asiago | heart | 20 | 18,2 | 0,67 | 1,5 s | riuscito |
| asiago | star | 5 | 4,7 | 0,87 | 0,4 s | riuscito |
| asiago | star | 10 | 11,1 | 0,74 | 0,5 s | riuscito |
| asiago | star | 20 | 21,9 | 0,92 | 0,4 s | buono |
| milano | circle | 5 | 4,9 | 0,90 | 2,6 s | buono |
| milano | circle | 10 | 9,6 | 1,00 | 4,4 s | buono |
| milano | circle | 20 | 21,1 | 0,97 | 6,7 s | buono |
| milano | heart | 5 | 4,7 | 0,95 | 2,6 s | buono |
| milano | heart | 10 | 9,6 | 0,99 | 4,2 s | buono |
| milano | heart | 20 | 21,7 | 0,97 | 7,0 s | buono |
| milano | star | 5 | 4,9 | 0,99 | 2,3 s | buono |
| milano | star | 10 | 10,1 | 0,99 | 4,0 s | buono |
| milano | star | 20 | 19,8 | 1,00 | 5,7 s | buono |
| pianura | circle | 5 | 5,4 | 0,87 | 0,7 s | riuscito |
| pianura | circle | 10 | 9,4 | 0,80 | 0,9 s | riuscito |
| pianura | circle | 20 | 19,2 | 0,63 | 1,4 s | riuscito |
| pianura | heart | 5 | 5,4 | 0,91 | 0,5 s | buono |
| pianura | heart | 10 | 8,3 | 0,96 | 1,0 s | buono |
| pianura | heart | 20 | 19,9 | 0,67 | 1,7 s | riuscito |
| pianura | star | 5 | 4,0 | 0,94 | 0,6 s | buono |
| pianura | star | 10 | 9,2 | 0,93 | 0,4 s | buono |
| pianura | star | 20 | 19,8 | 0,86 | 1,5 s | riuscito |

### `trails` a Trento

| Zona | km di rete | pezzi | pezzo più grande | incroci | vicoli ciechi |
|---|---|---|---|---|---|
| trento | 88,5 | 1 | 88,5 km | 1110 | 551 |

- trento, km per `highway`: footway 68,0, path 11,8, pedestrian 5,6, track 2,6, steps 0,5

Forme: 9 chieste, 3 riuscite, nessuna buona; somiglianza mediana 0,78,
tempo massimo 104,2 s (il cerchio da 20 km).

## Il motore vero (TASK-377 parte A, 2026-11-05)

Banco sul Mac, branch `feat/TASK-377-a-hike-engine-api`, `nice -n 10`, un
comando per volta, `--activity hiking`: la rete `hike` del motore, non più
un `--loader`. Zone scaricate di nuovo, cache in `data/cache` (`hike_*`),
JSON in `out/TASK-377/bench/hike-a`. Cerchio, cuore e stella a 5, 10, 20,
25 e 30 km. Il tempo è quello del motore, con la zona già in cache.

La rete `hike` è il filtro di `foot.py`, con le esclusioni dei marciapiedi
disegnati a parte, senza le strade delle auto, senza `sac_scale` oltre T3 e
senza vie ferrate. Le zone sono quelle dei percorsi da 30 km: i km non si
confrontano con quelli della parte 0, misurati per i 20 km.

**In breve:**

- **73 percorsi su 90, 28 buoni**, somiglianza mediana 0,85. Milano 15 su
  15, Trento 14, Pianura 13, Asiago 12, Fiemme 10, Valsugana 9.
- **A 25 e 30 km** riescono 27 su 36. Il cerchio resta la forma più
  difficile: in montagna riesce 5 volte su 15.
- **I rifiuti lenti** ci sono anche qui: fino a 108,5 s per dire che un
  cerchio da 30 km non si fa. Il tempo mediano resta 2,1 s.
- **Vie ferrate**: la rete «foot» le tiene (`highway=via_ferrata`, 2,6 km a
  Trento e 3,0 km a Fiemme al primo giro). La rete `hike` le toglie: nessun
  percorso del banco è cambiato.
- **Corsa, bici e canoa** al banco prima e dopo (stesso commit di partenza,
  stessa cache): identiche punto per punto, 54/54, 54/54, 27/27. I nove
  percorsi fissi di `test_same_routes.py` sono uguali: l'impronta del
  motore resta quella di prima (precisazione di ADR-0321).

### Rete `hike`

| Zona | km di rete | pezzi | pezzo più grande | incroci | vicoli ciechi |
|---|---|---|---|---|---|
| trento | 4235,9 | 1 | 4235,9 km | 24294 | 11611 |
| valsugana | 2828,2 | 1 | 2828,2 km | 9316 | 4539 |
| milano | 9225,9 | 1 | 9225,9 km | 113752 | 26651 |
| fiemme | 2238,1 | 1 | 2238,1 km | 4455 | 2007 |
| asiago | 1092,8 | 1 | 1092,8 km | 2377 | 942 |
| pianura | 1355,9 | 1 | 1355,9 km | 7673 | 2605 |

- trento, km per `highway`: track 1308,9, path 1011,6, unclassified 545,5, service 463,8, footway 428,7, residential 345,7, cycleway 109,9, pedestrian 14,1, steps 3,3, bridleway 3,0
- fiemme, km per `highway`: track 1099,4, path 747,6, unclassified 137,2, residential 82,1, service 78,2, footway 47,8, cycleway 42,1
- asiago, km per `highway`: track 464,7, path 362,0, unclassified 132,7, residential 84,1, service 24,8, cycleway 12,4, footway 10,2

### Quanto di un percorso sta sui sentieri

Ridisegnati cerchio, cuore e stella a 10 e 20 km sulle sei zone (36
richieste, 30 riuscite), con `out/TASK-377/ways.py` (risultati in
`ways.txt`). Ogni
tratto conta per il `highway` del suo arco. «Sentieri» qui vuol dire
`track`, `path`, `footway`, `bridleway`, `steps` e `pedestrian`.

| Zona | percorsi | quota sui sentieri (mediana) |
|---|---|---|
| trento | 6 | 0,51 |
| valsugana | 3 | 0,50 |
| fiemme | 4 | 0,60 |
| asiago | 5 | 0,57 |
| pianura | 6 | 0,33 |
| milano | 6 | 0,86 (quasi tutto marciapiedi) |

In tutto il 55% dei km sta sui sentieri: footway 127,9 km, track 61,7,
path 46,3. Il resto sta su strade
senza traffico di passaggio: residential 94,9, unclassified 61,4, service
21,7, cycleway 27,4. **In montagna circa metà di un'escursione è su
strade secondarie**: la forma le chiede, perché i sentieri da soli hanno
pochi incroci vicini. Se si vuole di più, la strada è l'alternativa di
ADR-0321, cioè pesare gli archi: è una scelta da proporre all'utente, non
una correzione.

### Forme e percorsi con la rete `hike`

#### Forme

| Zona | chiesti | riusciti (≥ 0,60) | buoni (≥ 0,90) | somiglianza mediana | tempo mediano | tempo massimo |
|---|---|---|---|---|---|---|
| trento | 15 | 14 | 7 | 0,89 | 2,7 s | 106,0 s |
| valsugana | 15 | 9 | 0 | 0,73 | 1,7 s | 108,5 s |
| milano | 15 | 15 | 15 | 0,99 | 7,0 s | 18,3 s |
| fiemme | 15 | 10 | 1 | 0,75 | 1,4 s | 90,1 s |
| asiago | 15 | 12 | 1 | 0,74 | 1,5 s | 95,6 s |
| pianura | 15 | 13 | 4 | 0,84 | 1,8 s | 73,3 s |
| tutte | 90 | 73 | 28 | 0,85 | 2,1 s | 108,5 s |

#### Percorsi

| Zona | forma | km chiesti | km reali | somiglianza | tempo | esito |
|---|---|---|---|---|---|---|
| trento | circle | 5 | 5,6 | 0,91 | 1,4 s | buono |
| trento | circle | 10 | 10,4 | 0,76 | 2,2 s | riuscito |
| trento | circle | 20 | 21,6 | 0,85 | 3,4 s | riuscito |
| trento | circle | 25 | 23,3 | 0,76 | 3,8 s | riuscito |
| trento | circle | 30 | 30,5 | 0,80 | 4,3 s | riuscito |
| trento | heart | 5 | 5,1 | 0,87 | 1,7 s | riuscito |
| trento | heart | 10 | 9,7 | 0,85 | 2,4 s | riuscito |
| trento | heart | 20 | 20,8 | 0,91 | 3,5 s | buono |
| trento | heart | 25 | 25,5 | 0,94 | 2,7 s | buono |
| trento | heart | 30 | 28,2 | 0,74 | 106,0 s | riuscito |
| trento | star | 5 | 4,8 | 0,98 | 0,8 s | buono |
| trento | star | 10 | 10,9 | 0,97 | 1,3 s | buono |
| trento | star | 20 | 18,6 | 0,97 | 2,1 s | buono |
| trento | star | 25 | 24,1 | 0,99 | 2,9 s | buono |
| trento | star | 30 | — | — | 7,1 s | ShapeNotDrawableError |
| valsugana | circle | 5 | 4,2 | 0,65 | 0,7 s | riuscito |
| valsugana | circle | 10 | — | — | 2,0 s | ShapeNotDrawableError |
| valsugana | circle | 20 | — | — | 3,0 s | ShapeNotDrawableError |
| valsugana | circle | 25 | — | — | 4,0 s | ShapeNotDrawableError |
| valsugana | circle | 30 | — | — | 108,5 s | ShapeNotDrawableError |
| valsugana | heart | 5 | 4,8 | 0,73 | 0,7 s | riuscito |
| valsugana | heart | 10 | — | — | 1,6 s | ShapeNotDrawableError |
| valsugana | heart | 20 | 21,8 | 0,72 | 1,4 s | riuscito |
| valsugana | heart | 25 | 23,9 | 0,73 | 1,7 s | riuscito |
| valsugana | heart | 30 | — | — | 5,4 s | ShapeNotDrawableError |
| valsugana | star | 5 | 5,4 | 0,80 | 0,7 s | riuscito |
| valsugana | star | 10 | 9,0 | 0,83 | 0,9 s | riuscito |
| valsugana | star | 20 | 20,4 | 0,85 | 2,4 s | riuscito |
| valsugana | star | 25 | 24,0 | 0,67 | 1,7 s | riuscito |
| valsugana | star | 30 | 28,4 | 0,81 | 4,0 s | riuscito |
| milano | circle | 5 | 5,1 | 0,90 | 2,9 s | buono |
| milano | circle | 10 | 9,8 | 1,00 | 5,1 s | buono |
| milano | circle | 20 | 21,1 | 0,97 | 7,2 s | buono |
| milano | circle | 25 | 24,8 | 0,98 | 8,7 s | buono |
| milano | circle | 30 | 30,1 | 0,99 | 12,4 s | buono |
| milano | heart | 5 | 5,4 | 0,96 | 2,9 s | buono |
| milano | heart | 10 | 10,3 | 0,99 | 4,9 s | buono |
| milano | heart | 20 | 21,7 | 0,97 | 7,1 s | buono |
| milano | heart | 25 | 23,7 | 1,00 | 8,3 s | buono |
| milano | heart | 30 | 30,2 | 0,99 | 9,6 s | buono |
| milano | star | 5 | 4,6 | 0,92 | 2,8 s | buono |
| milano | star | 10 | 10,0 | 1,00 | 3,8 s | buono |
| milano | star | 20 | 18,6 | 1,00 | 6,4 s | buono |
| milano | star | 25 | 25,1 | 1,00 | 7,0 s | buono |
| milano | star | 30 | 29,8 | 0,97 | 18,3 s | buono |
| fiemme | circle | 5 | — | — | 1,6 s | ShapeNotDrawableError |
| fiemme | circle | 10 | — | — | 1,8 s | ShapeNotDrawableError |
| fiemme | circle | 20 | — | — | 2,2 s | ShapeNotDrawableError |
| fiemme | circle | 25 | — | — | 2,5 s | ShapeNotDrawableError |
| fiemme | circle | 30 | 28,5 | 0,76 | 90,1 s | riuscito |
| fiemme | heart | 5 | 3,7 | 0,84 | 0,6 s | riuscito |
| fiemme | heart | 10 | 11,3 | 0,73 | 1,3 s | riuscito |
| fiemme | heart | 20 | 18,5 | 0,69 | 1,4 s | riuscito |
| fiemme | heart | 25 | 26,1 | 0,64 | 1,3 s | riuscito |
| fiemme | heart | 30 | — | — | 2,8 s | ShapeNotDrawableError |
| fiemme | star | 5 | 4,7 | 0,95 | 0,5 s | buono |
| fiemme | star | 10 | 9,7 | 0,89 | 0,7 s | riuscito |
| fiemme | star | 20 | 21,3 | 0,75 | 0,7 s | riuscito |
| fiemme | star | 25 | 25,4 | 0,86 | 1,1 s | riuscito |
| fiemme | star | 30 | 28,7 | 0,75 | 1,4 s | riuscito |
| asiago | circle | 5 | — | — | 1,5 s | ShapeNotDrawableError |
| asiago | circle | 10 | 9,3 | 0,63 | 1,5 s | riuscito |
| asiago | circle | 20 | — | — | 2,1 s | ShapeNotDrawableError |
| asiago | circle | 25 | 23,9 | 0,60 | 1,2 s | riuscito |
| asiago | circle | 30 | 30,6 | 0,64 | 95,6 s | riuscito |
| asiago | heart | 5 | 3,8 | 0,74 | 0,4 s | riuscito |
| asiago | heart | 10 | 10,3 | 0,61 | 0,5 s | riuscito |
| asiago | heart | 20 | 18,2 | 0,67 | 1,7 s | riuscito |
| asiago | heart | 25 | 26,9 | 0,74 | 2,6 s | riuscito |
| asiago | heart | 30 | — | — | 3,5 s | ShapeNotDrawableError |
| asiago | star | 5 | 4,7 | 0,87 | 0,4 s | riuscito |
| asiago | star | 10 | 11,1 | 0,74 | 0,6 s | riuscito |
| asiago | star | 20 | 21,9 | 0,92 | 0,5 s | buono |
| asiago | star | 25 | 27,0 | 0,80 | 1,2 s | riuscito |
| asiago | star | 30 | 29,7 | 0,79 | 1,6 s | riuscito |
| pianura | circle | 5 | 4,8 | 0,79 | 1,5 s | riuscito |
| pianura | circle | 10 | 9,1 | 0,75 | 3,1 s | riuscito |
| pianura | circle | 20 | 19,2 | 0,63 | 4,0 s | riuscito |
| pianura | circle | 25 | — | — | 6,1 s | ShapeNotDrawableError |
| pianura | circle | 30 | — | — | 73,3 s | ShapeNotDrawableError |
| pianura | heart | 5 | 4,7 | 0,91 | 0,6 s | buono |
| pianura | heart | 10 | 8,5 | 0,86 | 1,1 s | riuscito |
| pianura | heart | 20 | 21,5 | 0,76 | 1,8 s | riuscito |
| pianura | heart | 25 | 24,3 | 0,73 | 2,0 s | riuscito |
| pianura | heart | 30 | 28,9 | 0,75 | 2,3 s | riuscito |
| pianura | star | 5 | 4,5 | 0,92 | 0,6 s | buono |
| pianura | star | 10 | 10,1 | 0,92 | 0,5 s | buono |
| pianura | star | 20 | 19,9 | 0,84 | 1,6 s | riuscito |
| pianura | star | 25 | 25,1 | 0,96 | 1,2 s | buono |
| pianura | star | 30 | 30,9 | 0,86 | 2,2 s | riuscito |

## Cosa resta da misurare

- ~~Quanto di ogni percorso sta su `track` e `path`~~: misurato con la
  parte A, sopra.
- **Il dislivello dei percorsi** (`CONDIVISO.md`, «Le quote»).
