# TASK-034 — Forme candidate

**Stato**: In corso
**Fase**: 3 · **Branch**: `feat/TASK-034-candidate-shapes` (parte da
`feat/TASK-033-shape-catalog`)

## Obiettivo

Preparare forme nuove per il catalogo: disegnarle, farle seguire dal motore
sulle strade delle tre zone e lasciare all'utente i campioni pronti da
giudicare a occhio. Solo dopo il giudizio una forma entra nel catalogo
(ADR-0036).

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0035 (forme da file), ADR-0036 (catalogo)
- `samples/README.md`, `samples/LOG.md` (righe di TASK-032)
- `services/route-engine/route_engine/shapes/outlines/`

## Cosa c'è già

- Il catalogo ha `circle`, `heart`, `star`, `horse`. TASK-032 ha mostrato
  che sulle strade regge una forma che si riconosce dalla **sagoma grande**
  (le punte della stella, zampe e testa del cavallo), non una che si
  riconosce dai dettagli (camino e porta della casa).

## Decisioni

Prese dall'agente il 2026-09-24 notte, su delega dell'utente.

- **A. Sei candidate**, scelte perché si riconoscono dalla sagoma: pesce
  (`fish`), luna (`moon`), freccia (`arrow`), albero (`tree`), corona
  (`crown`), testa di gatto (`cat`). Disegnate dall'agente con pochi
  vertici o archi calcolati: nessuna licenza di terzi, nessun download.
- **B. Stesso protocollo di TASK-032**: Trento e Levico, Milano come
  confronto; 10 e 15 km; nessun parametro del motore cambiato; campioni
  `TASK-034_<forma>_<km>km_<zona>_v1.gpx`, generati con `plan_shape` e i
  grafi di zona dell'API (nessun ritaglio in `data/cache/`). Le zone che
  mancano si scaricano come in TASK-026.
- **C. Il giudizio resta dell'utente.** L'agente mette i numeri e una sua
  prima impressione, dichiarata come tale; le righe in `samples/LOG.md`
  si scrivono con il giudizio dell'utente.
- **D. Entra nel catalogo** una candidata con almeno un `sì` a Trento o
  Levico, come la stella e il cavallo. Registrarla vuol dire: contratto
  (motore, `shared-types`, `contract.json`), parole in `shapeWords.ts`,
  `UI.md`. Si fa dopo il giudizio, nello stesso branch.

## Cosa fare

1. I sei contorni in `route_engine/shapes/outlines/`, controllati dal test
   che valida ogni contorno del repository.
2. I 36 campioni, con un'immagine d'insieme in `out/` per guardarli tutti
   insieme, e `out/preview.html` per la mappa.
3. Giudizio dell'utente → righe in `LOG.md`.
4. Le candidate promosse entrano nel catalogo (punto D), con i test.

## Criteri di accettazione

- [ ] In `services/route-engine/` `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [ ] 36 campioni in `samples/`, con somiglianza e distanza nel file del
      task.
- [ ] Giudizio dell'utente in `samples/LOG.md`.
- [ ] Le candidate promosse sono nel catalogo, con le loro parole e i test;
      `UI.md`, `STATUS.md` aggiornati.
- [ ] I job della CI sono verdi sulla PR.

## File toccati

```
services/route-engine/route_engine/shapes/outlines/*.json
samples/TASK-034_*.gpx
samples/LOG.md
docs/tasks/TASK-034.md
docs/STATUS.md
e, per le candidate promosse, quelli del catalogo di TASK-033
```

## Fuori scope

- Cambiare parametri del motore per far passare una forma.
- Forme fatte di più pezzi o con buchi.
- La somiglianza calcolata: TASK-035.

## Esito

*(si compila a fine task)*
