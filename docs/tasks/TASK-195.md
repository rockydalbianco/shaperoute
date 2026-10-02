# TASK-195 — Il cerchio per primo negli esempi disegnati dal server

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-195-circle-first`

## Obiettivo

`draw_examples` chiede a una città il cerchio prima del cuore e della
stella, così in una città senza zona il cuore e il cerchio non scaricano
una zona ciascuno. È il seguito scritto in TASK-176: l'app chiede già il
cerchio per primo, l'API no.

## Contesto da leggere

- `docs/API.md` «Gli esempi di una città, tenuti»
- `docs/MAPS.md` «Zone scaricate prima»
- `services/api/shaperoute_api/prefetch_zones.py` (`EXAMPLE_SHAPES`),
  `draw_examples.py` (`draw_city`)

## Cosa fare

1. `EXAMPLE_SHAPES` in `prefetch_zones.py`: `("circle", "heart", "star")`.
   `draw_examples` le chiede in quell'ordine; il riquadro di
   `prefetch_zones` è l'unione delle tre, e non cambia.
2. Un test che lo tiene vero: l'area della prima forma chiesta contiene
   quella delle altre due.
3. I test di `draw_examples` con l'ordine nuovo; `API.md`.

## Criteri di accettazione

- [x] `draw_examples` chiede cerchio, cuore, stella, in quest'ordine.
- [x] L'area che il motore chiede per il cerchio da 5 km contiene quella
      del cuore e della stella dallo stesso centro (Vercelli, Lucca, Lecce).
- [x] Il riquadro di `prefetch_zones` è lo stesso di prima.
- [x] Gli esempi già tenuti restano validi: il file di un percorso non
      dipende dall'ordine delle richieste.

## File toccati

```
services/api/shaperoute_api/prefetch_zones.py
services/api/shaperoute_api/draw_examples.py
services/api/tests/test_prefetch_zones.py
services/api/tests/test_draw_examples.py
docs/API.md
docs/STATUS.md
docs/tasks/TASK-195.md
```

## Fuori scope

- Disegnare prima anche le altre cinque forme di TASK-176 (luna, cavallo,
  lumaca, testa di cane, testa di coniglio): circa un'ora e mezza di
  calcolo sulle 62 città, e una scelta dell'utente.
- Il server: l'ordine nuovo vale dal prossimo aggiornamento dell'API, che
  aspetta l'ok dell'utente. Non c'è niente da rifare: le città già
  disegnate restano.
- L'ordine delle schede nell'app: la prima resta il cuore (TASK-176).

## Esito

`draw_examples` chiede il cerchio per primo. Misurato dal centro di
quattro città (Vercelli, Rovereto, Napoli, Berlino): a 5 km il cerchio
chiede un riquadro di 5,50–5,52 km di lato, il cuore 5,44–5,45, la stella
4,95–4,96, e quello del cerchio contiene gli altri due. Con il cuore per
primo, una città senza zona scaricava la zona del cuore e poi una seconda,
più larga di una trentina di metri per lato, per il cerchio (visto a
Vercelli con TASK-143). Una forma che il motore deve cercare più lontano
dal centro può ancora chiedere una zona sua: questo task toglie solo il
download in più fra cuore e cerchio, e non è stato provato contro
Overpass. La riga che il comando stampa per città ora dice `circle …,
heart …, star …`. Nessuna decisione nuova: la ragione è quella di ADR-0144
(TASK-176), che ha già messo il cerchio per primo nell'app.
