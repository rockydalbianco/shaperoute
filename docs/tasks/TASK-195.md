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
   `prefetch_zones` è l'unione delle tre, e non cambia. **Fatto da TASK-176
   (#199)**, con i test di `draw_examples` e `API.md`.
2. Un test che lo tiene vero: l'area della prima forma chiesta contiene
   quella delle altre due. **È quello che resta a questo task.**

## Criteri di accettazione

- [x] `draw_examples` chiede cerchio, cuore, stella, in quest'ordine
      (TASK-176, #199).
- [x] L'area che il motore chiede per il cerchio da 5 km contiene quella
      del cuore e della stella dallo stesso centro (Vercelli, Lucca, Lecce):
      un test in `test_prefetch_zones.py`.

## File toccati

```
services/api/tests/test_prefetch_zones.py
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

Il cerchio per primo è entrato in `main` con TASK-176 (#199): il
coordinatore l'aveva chiesto a quella sessione prima di assegnare questo
task, e le due modifiche erano uguali. Di questo task resta un test: dal
centro di Vercelli, Lucca e Lecce l'area che il motore chiede per la prima
forma di `EXAMPLE_SHAPES` contiene quella delle altre due. Se un giorno
l'ordine o le forme cambiano e il cerchio non basta più, il test lo dice.
Misurato anche dal centro di Rovereto, Napoli e Berlino: a 5 km il cerchio
chiede un riquadro di 5,50–5,52 km di lato, il cuore 5,44–5,45, la stella
4,95–4,96. Non provato contro Overpass: una forma che il motore deve
cercare più lontano dal centro può ancora chiedere una zona sua.
