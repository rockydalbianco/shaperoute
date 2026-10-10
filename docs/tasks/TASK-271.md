# TASK-271 — «Make a U-turn» anche dove non c'è un incrocio

**Stato**: In corso
**Fase**: 4 · **Branch**: `fix/TASK-271-dead-end-u-turn`

Numero dato dal Coordinatore (sessione `local_e57a8224`) il 2026-10-10.
Aggiunta ad ADR-0045, senza ADR nuovo.

## Obiettivo

Quando un percorso torna indietro in un vicolo cieco o su un nodo che non è
un incrocio, la voce dice «Make a U-turn» («Torna indietro»), come già fa
agli incroci.

Dalla prima recensione di un tester (2026-10-10): «quando devi tornare
indietro non lo dice. Quando devi tipo arrivare ad un punto e tornare
indietro dalla stessa strada».

## Contesto da leggere

- `services/route-engine/route_engine/directions.py`, `directions()`
- `docs/DECISIONS.md` §ADR-0045

**Causa, già verificata**: `directions()` salta ogni nodo con meno di
`MIN_BRANCHES` (3) strade (`if count < MIN_BRANCHES: continue`). Su una
strada senza uscita (1 strada) o su un nodo in mezzo a una strada (2 strade:
bordi tagliati, vie unite) il percorso torna indietro e non si dice niente.
Sul grafo dei test `directions(g, [T, W, T])` (W ha 1 strada) e
`directions(g, [T, P, T])` (P ne ha 2) danno `[]`, mentre `[W, T, W]`
all'incrocio T dà `"u-turn"`.

## Cosa fare

1. In `directions()`, su un nodo con meno di `MIN_BRANCHES` strade, dare
   un'indicazione solo quando il percorso torna da dove è venuto
   (`after == before`) e l'angolo è un `"u-turn"` (`turn_of`); ogni altro
   nodo così resta in silenzio come oggi. `branches` resta il conteggio
   vero. Aggiornare la docstring del modulo e quella di `directions()`.
2. Test in `services/route-engine/tests/test_directions.py`: vicolo cieco →
   un `"u-turn"` col nome della via; ritorno in mezzo a una strada →
   `"u-turn"`; un nodo in mezzo a una strada passato dritto o con una
   curva resta in silenzio; `test_on_a_real_graph_every_direction_is_at_a_real_junction`
   vale ancora per i percorsi che non tornano indietro.
3. Controllare che a valle niente supponga `branches >= 3`
   (`route_engine/sidewalks.py`, l'API che riempie `along`). L'app ha già il
   testo `"u-turn"` nelle 5 lingue (`apps/mobile/src/voice/*.ts`): nessun
   testo nuovo.
4. Una riga in `docs/DECISIONS.md` («ADR-0045, aggiunta», in fondo) e una
   voce «In lavorazione» in `docs/STATUS.md` (solo righe aggiunte).

## Criteri di accettazione

- [ ] `directions(g, [T, W, T])` dà un solo `"u-turn"` su W, con «Via
      Roma» e `branches == 1`.
- [ ] `directions(g, [T, P, T])` dà un solo `"u-turn"` su P, con «Via
      Verdi» e `branches == 2`.
- [ ] `directions(g, [T, P, Q])` resta `[]` (curva di 90° fuori da un
      incrocio), come i nodi a due strade passati dritti.
- [ ] Su un grafo vero (Levico) i percorsi più brevi, che non tornano mai
      indietro, hanno indicazioni solo agli incroci; ogni ritorno su un
      vicolo cieco o su un nodo a due strade dà `"u-turn"`.
- [ ] `pytest -m "not network"` del motore verde, `ruff` e `black` puliti.

## File toccati

```
services/route-engine/route_engine/directions.py
services/route-engine/tests/test_directions.py
docs/tasks/TASK-271.md
docs/STATUS.md
docs/DECISIONS.md
```

## Condizioni del Coordinatore

- Cambia il motore: dopo il merge servono **l'ok dell'utente** per
  aggiornare il server, per un giro di `draw_examples` e per ripubblicare
  il motore sul telefono (il motore del telefono è il motore Python in una
  WebView, TASK-214).
- **Non entra nella 1.0** (build 5).
- I percorsi già in cache (esempi di «Explore», percorsi salvati) tengono
  le indicazioni vecchie finché non si ricalcolano: va detto all'utente.
- A PR verde: «#NNN pronta» al Coordinatore, e merge solo dopo il suo
  «merge NNN» esplicito.

## Fuori scope

- Le «mini svolte di 3 m» citate dal tester («per ora si può lasciare
  così»).
- Il navigatore dell'app (TASK-270, PR #486: `navigator.ts`, `progress.ts`).
- Testi nuovi nell'app: `"u-turn"` c'è già in tutte le lingue.
- Le descrizioni «junction» di `DirectionBody` (API) e di `Direction`
  (`packages/shared-types`): `branches` sotto 3 c'era già, nella partenza.

## Dove siamo (2026-10-10)

Codice, test e documenti fatti; PR #489 aperta (in locale: motore 1581
passati, test API sulle indicazioni 67, ruff/black puliti; i 3 test nuovi
falliscono su `main`). Il Coordinatore la tiene ferma con un **veto fino
all'approvazione di Apple della 1.0**; poi chiede all'utente l'ok per
server, `draw_examples` e motore sul telefono e scrive «merge 489». La
sessione che l'ha aperta è archiviata su richiesta dell'utente: chi
riprende tiene la PR verde, la riallinea a `main` se va in conflitto su
STATUS o DECISIONS (tenendo tutte le voci), la mergia al «merge 489» e poi
chiude il task (questo «Esito», riga di chiusura e voce «Completato» in
STATUS) con una PR di documenti da `origin/main`.

## Esito

*(si compila a fine task)*
