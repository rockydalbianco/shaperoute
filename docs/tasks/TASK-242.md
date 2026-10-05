# TASK-242 — La penna si alza sulle deviazioni di un pezzo

**Stato**: In corso
**Fase**: 2 · **Branch**: `feat/TASK-242-piece-detours`

## Obiettivo

Con la penna alzata (TASK-223), un pezzo di una forma che le strade
costringono a una lunga deviazione fuori dalla sua linea si disegna in due
parti, e la deviazione è un tratto a piedi invece che un tratto disegnato.

## Contesto

L'utente, il 2026-10-05, con lo screenshot della faccina a 15 km a Trento
(variante C, 16,6 km, 68%): «Ma quand'è la possibilità di alzare la penna
anche per la bocca». La bocca è già un pezzo staccato, ma sulla mappa
sembrava attaccata alla faccia. Poi: «sì, rifallo sul Mac e vedi da dove
nasce E MIGLIORA IL SERVIZIO DI DISEGNO».

Rifatto sul Mac con il pianificatore dell'API (`plan_request`, Trento
centro, 15 km; la variante A è la stessa del telefono, 15,8 km e 77%): la
bocca attraversa la ferrovia, e il primo sottopasso è 250–370 m sotto la
sua linea. Il motore ci arriva e torna su: 560–650 m disegnati fuori
dalla linea, che toccano il bordo della faccia. La penna si alzava solo
**fra** un pezzo e l'altro, mai **dentro** un pezzo.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §2 «Pezzi staccati dal contorno», §5 «La penna
  alzata»
- `services/route-engine/route_engine/pen_up.py`, `pieces.py`

## Cosa fare

1. `route_engine/detours.py` (nuovo): trovare, nel percorso di un pezzo,
   i tratti fra due nodi sulla linea che se ne allontanano troppo, e dire
   quali parti restano disegnate.
2. `pen_up.trace`: per una forma a pezzi, disegnare ogni pezzo senza le
   sue deviazioni e camminarle, come fra due pezzi. Il contorno non si
   tocca. Le parole non cambiano.
3. Mai più tratti a piedi di quanti ne tiene un risultato dell'API
   (`schemas.MAX_WALKS`, 9), senza toccare l'API.
4. La distanza che la ricerca insegue conta ancora le deviazioni
   (`pen_up.sized_m`, una riga in `optimizer.drawn_distance`): senza, a
   Trento la ricerca ingrandiva la faccina e sceglieva un disegno peggiore.
5. Rifare `apps/mobile/assets/engine/engine.zip`.
6. Campioni prima/dopo a Trento, Milano e Levico, e il confronto su più
   forme e città (`ROUTE_ENGINE.md` §5).

## Criteri di accettazione

- [x] Una bocca che deve aggirare una ferrovia si disegna in due parti,
      con un tratto a piedi in più; la somiglianza non scende
      (`tests/test_detours.py`).
- [x] Un pezzo che resta vicino alla sua linea dà lo stesso percorso di
      prima, punto per punto; così il contorno, sempre.
- [x] Una deviazione che torna al nodo da cui è partita si toglie senza
      tratti a piedi.
- [x] I tratti a piedi non superano mai `MAX_WALKS` dell'API
      (`services/api/tests/test_lifted_detours.py`).
- [x] Le parole con la penna alzata e ogni forma senza penna alzata danno
      lo stesso percorso di `main` (i test di TASK-197 e TASK-223 verdi
      senza modifiche; l'impronta del motore sull'acqua non cambia).
- [x] L'app regge un tratto a piedi in più dei pezzi: pausa, voce, linee
      tratteggiate, km di disegno (`penUpDetours.test.ts`).
- [x] Test del motore e dell'API verdi; `engine.zip` rifatto.
- [ ] **Il giudizio dell'utente sui campioni prima del merge** (paletto
      del coordinatore): la faccina e la ciambella a Trento.

## File toccati

```
services/route-engine/route_engine/detours.py        (nuovo)
services/route-engine/route_engine/pen_up.py
services/route-engine/route_engine/optimizer.py      (solo `drawn_distance`)
services/route-engine/tests/test_detours.py          (nuovo)
services/api/tests/test_lifted_detours.py            (nuovo)
apps/mobile/src/navigation/penUpDetours.test.ts      (nuovo)
apps/mobile/assets/engine/engine.zip
samples/TASK-242_*.gpx                               (nuovi)
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/STATUS.md
docs/DECISIONS.md
docs/tasks/TASK-242.md
```

`optimizer.py` è di TASK-232 A mentre si scrive: la riga è stata chiesta
al coordinatore (2026-10-05).

## Fuori scope

- Il contorno: le sue deviazioni e i suoi baffi restano disegnati (un buco
  nel contorno costa più di un tratto storto; è un'altra decisione, e
  dell'utente).
- Le parole con la penna alzata (TASK-197) e l'acqua (TASK-226).
- La descrizione di `walks` in `schemas.py` e il commento in `models.py`
  («uno in meno dei pezzi»): sono di TASK-238, da aggiornare dopo.
- I testi dell'app: la voce dice già «Part done. Walk to the next part»
  a ogni tratto a piedi.
- Il server, `draw_examples` e la pubblicazione: del coordinatore, con
  l'ok dell'utente.

## Esito

*(a fine task)*
