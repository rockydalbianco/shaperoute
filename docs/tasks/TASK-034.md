# TASK-034 — Forme candidate

**Stato**: Done
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
   insieme, e `out/TASK-034-preview.html` per la mappa.
3. Giudizio dell'utente → righe in `LOG.md`.
4. Le candidate promosse entrano nel catalogo (punto D), con i test.

## Criteri di accettazione

- [x] In `services/route-engine/` `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [x] 36 campioni in `samples/`, con somiglianza e distanza nel file del
      task.
- [x] Giudizio dell'utente in `samples/LOG.md`.
- [x] Le candidate promosse sono nel catalogo: nessuna è promossa (punto D),
      quindi catalogo, parole e `UI.md` non cambiano; `STATUS.md` e
      `ROADMAP.md` aggiornati.
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

## Campioni (2026-09-24 notte)

Somiglianza calcolata e distanza reale; tutti i 36 hanno un percorso,
nessuno è rifiutato. Due zone di Milano da 15 km sono state scaricate
(pesce 311 s, freccia 253 s in tutto). Sulla mappa: `out/TASK-034-preview.html`;
tutti insieme, con il contorno accanto: `out/TASK-034-candidates.png`.

| Forma | Trento 10 | Trento 15 | Levico 10 | Levico 15 | Milano 10 | Milano 15 | Prima impressione dell'agente |
|---|---|---|---|---|---|---|---|
| luna (`moon`) | 0,97 · 9,3 km | 0,93 · 14,7 km | 0,92 · 9,6 km | 0,93 · 14,5 km | 1,00 · 9,1 km | 1,00 · 14,7 km | si riconosce quasi ovunque: la candidata più forte |
| pesce (`fish`) | 0,96 · 10,5 km | 0,91 · 14,1 km | 0,94 · 8,3 km | 0,86 · 16,2 km | 1,00 · 9,8 km | 1,00 · 14,9 km | a Milano sì, la coda si vede; a Trento e Levico diventa una macchia |
| freccia (`arrow`) | 0,92 · 10,2 km | 0,94 · 13,7 km | 0,83 · 9,8 km | 0,90 · 15,2 km | 0,99 · 10,0 km | 1,00 · 15,5 km | a Milano sì; a Trento 15 km quasi; a Levico no |
| albero (`tree`) | 0,93 · 9,3 km | 0,97 · 14,3 km | 0,91 · 9,5 km | 0,96 · 14,1 km | 1,00 · 10,4 km | 0,96 · 15,8 km | i piani si perdono: resta un triangolo, anche con somiglianza 1,00 |
| corona (`crown`) | 0,90 · 9,8 km | 0,90 · 15,0 km | 0,93 · 8,5 km | 0,91 · 14,4 km | 1,00 · 10,7 km | 1,00 · 16,3 km | le punte si perdono quasi sempre, anche con somiglianza 1,00 |
| gatto (`cat`) | 0,95 · 9,2 km | 0,91 · 15,4 km | 0,91 · 11,2 km | 0,87 · 14,4 km | 0,99 · 9,9 km | 0,98 · 15,4 km | le orecchie si vedono a Milano e a volte a Trento |

La prima impressione è dell'agente e **non è un giudizio**: il giudizio lo
dà l'utente, e va in `samples/LOG.md`. Come in TASK-032, la somiglianza
resta alta anche dove l'occhio perde i dettagli (albero e corona a
Milano): ne parla TASK-035.

## Esito

Giudicato dall'utente il 2026-09-24: «vanno bene solo quelle a Milano». Le
sei candidate si riconoscono a Milano (`sì`) e non a Trento e Levico
(`no`), dove la somiglianza calcolata le dava fra 0,83 e 0,97. Per il
punto D nessuna entra nel catalogo: i contorni restano in
`route_engine/shapes/outlines/`, pronti se il motore migliora. La
prima impressione dell'agente (luna riconoscibile quasi ovunque) era più
generosa dell'occhio dell'utente. I 36 giudizi diventano i dati di
TASK-035.
