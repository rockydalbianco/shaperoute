# TASK-226 — Gli occhi staccati sull'acqua

**Stato**: In corso (parte A, motore e API, in PR; poi la parte B, l'app)
**Fase**: 4 · **Branch**: `feat/TASK-226-water-eyes` (A)
**Dipende da**: TASK-223 (le forme a pezzi, `lift` e `pieces`, #284 e
#296), TASK-191 (la canoa), TASK-225 (l'acqua sul server), TASK-227 (gli
esempi della canoa dentro l'app)

## Obiettivo

Sull'acqua, le forme con gli occhi si disegnano **senza linee di
collegamento**: il contorno, poi ogni occhio da solo. Fra un pezzo e
l'altro l'app mette in pausa il disegno da sola e la voce lo dice, come la
penna alzata delle parole (TASK-197, TASK-198). Chiesto dall'utente il
2026-10-03, nella sessione di TASK-191 C: pesce, gatto, teste di cane e
coniglio «con gli occhi all'interno e senza linee di collegamento».

## Scelte dell'utente

- **2026-10-03**: la penna alzata è **automatica**, come per le parole:
  il motore disegna contorno e occhi come pezzi separati, l'app mette in
  pausa il tracking da sola fra l'uno e l'altro e lo riprende all'occhio;
  traccia, «Feed» e «My activities» non mostrano linee di collegamento.
- **2026-10-05**, sui campioni veri (sotto): pezzi staccati sull'acqua per
  **tutte le forme a pezzi tranne il sole**: pesce, gatto, testa di cane,
  testa di coniglio, zucca, faccina, fantasmino, ciambella. Il sole resta a
  penna giù: staccato avrebbe 9 pause e 730–880 m su 2 km senza disegnare.
  Scartate: solo le quattro chieste; tutte, anche il sole.

## Contesto da leggere

- `docs/tasks/TASK-223.md` e ADR-0185 (`lift`, `pieces`,
  `Outline.pen_up_lines`, `pieces.compose`)
- `docs/tasks/TASK-198.md` (la pausa «penna» nell'app), `TASK-191.md`,
  `TASK-227.md`
- `docs/ROUTE_ENGINE.md` §2 «Pezzi staccati dal contorno», §8 «Sull'acqua»
- `services/route-engine/route_engine/water_fit.py`, `paddling.py`
- `apps/mobile/src/navigation/penUp.ts`, `src/route/penUpShapes.ts`

## Cosa fare

**Parte A — il motore e l'API** (questa PR):

1. `water_fit` piazza contorno e pezzi insieme e disegna ogni pezzo da
   solo, con i tratti a penna alzata fra l'uno e l'altro.
2. Il contratto con `walks` vale anche per `paddling`: `pen_up` accettato
   sull'acqua per le forme a pezzi.
3. Campioni veri nei quattro luoghi, giudicati dall'utente (ADR-0036).
4. Corsa, bici e canoa a penna giù identiche (impronte e test).
5. Lo zip del motore del telefono e l'impronta di `paddleExamples.json`.

**Parte B — l'app** (dopo la A):

1. Con «Paddle», `pen_up` chiesto da solo per le otto forme scelte.
2. La pausa da sola sull'acqua e la voce nelle cinque tabelle di
   `src/voice/`, con la penna che scende più vicino al pezzo: i tratti
   sull'acqua sono di 30–100 m, non di centinaia come fra le lettere.
3. Gli esempi di «Explore» con le teste a occhi staccati:
   `paddle_examples.py` e `paddleExamples.json` con i `walks`.
4. I testi nuovi da confermare con l'utente.

## Criteri di accettazione

Parte A:

- [x] Una richiesta `paddling` con `pen_up` e una forma a pezzi dà un
      percorso chiuso dalla riva, con ogni pezzo disegnato da solo e i
      `walks` dei tratti a penna alzata, tutti nella fascia (test).
- [x] Senza `pen_up` i percorsi sull'acqua sono quelli di prima, punto per
      punto, per le nove forme a pezzi e per le altre (test con impronte).
- [x] Corsa e bici identiche: le impronte fissate non cambiano.
- [x] Campioni veri nei quattro luoghi, giudicati dall'utente.
- [x] Lo zip del motore e l'impronta degli esempi dell'app rifatti.

Parte B: da scrivere con la parte.

## File toccati

Parte A:

- `services/route-engine/route_engine/water_fit.py`, `paddling.py`,
  `models.py`, `__main__.py`
- `services/route-engine/tests/test_water_pieces.py` (nuovo),
  `tests/test_pieces_in_catalog.py` (il test che rifiutava la penna
  alzata sull'acqua)
- `services/api/shaperoute_api/schemas.py` (`MAX_WALKS`, le descrizioni)
- `services/api/tests/test_paddling_pieces.py` (nuovo),
  `tests/test_pen_up_shapes.py`
- `packages/shared-types/src/index.ts` (solo il commento di `pen_up`)
- `apps/mobile/assets/engine/engine.zip` (rifatto),
  `apps/mobile/src/paddle/paddleExamples.json` (solo l'impronta)
- `docs/tasks/TASK-226.md` (nuovo), `docs/ROUTE_ENGINE.md` §7 e §8,
  `docs/API.md` («La penna alzata»), `docs/DECISIONS.md` (ADR-0188),
  `docs/STATUS.md` (solo le righe di questo task)

## Fuori scope

- Gli occhi staccati **su strada** di gatto, pesce, teste e zucca: sono di
  TASK-223, e aspettano ancora il giudizio dell'utente sui campioni a
  15 km (`tasks/TASK-223.md`, «Gli occhi staccati»).
- «Explore» con «Paddle» oltre le otto forme, e il «Feed» sull'acqua
  (TASK-228).

## Esito

### Parte A — 2026-10-05

**Fatto** (ADR-0188; `ROUTE_ENGINE.md` §8, «Una forma a pezzi sull'acqua»;
`API.md`, «La penna alzata»):

- `water_fit.py`: `fit_shape`, `plan_on_water` e `water_bbox` prendono
  `pieces`, le linee di una forma a pezzi oltre il contorno.
  - **Dove si lascia il contorno**: al vertice da cui la penna resta
    alzata di meno (`_branch`), calcolato una volta sulla forma.
  - **Il giro** (`_tour`): al pezzo più vicino, entrando dal suo punto più
    vicino, poi al successivo; dopo l'ultimo si torna al vertice e il
    contorno prosegue.
  - **La fascia**: contorno, pezzi e tratti a penna alzata devono starci
    tutti (`_Placement.in_band`); un occhio su un'isola dentro il contorno
    scarta il piazzamento.
  - **La ricerca è quella di prima**: alla grandezza intera contorno,
    pezzi e tratti a penna alzata sono lunghi insieme quanto la distanza,
    quindi scale, limiti e costi non cambiano. Senza pezzi il codice fa
    gli stessi conti di prima.
  - `WaterRoute.walks`: i tratti a penna alzata, come indici nei punti.
- `paddling.py`: con `pen_up` il contorno e i pezzi vengono da
  `Outline.pen_up_lines`, con i lati tagliati a 1/128 della lunghezza;
  `RouteResult.walks` è pieno. `water_area` conta anche i pezzi.
- `models.py`: `pen_up` con `paddling` non è più rifiutato per una forma a
  pezzi (via `PEN_UP_ON_WATER`); una forma senza pezzi sì, come su strada.
- `__main__.py`: `--activity paddling --pen-up` stampa i tratti a penna
  alzata, li segna nel GPX (`Pause`, `Resume`) e li passa al punteggio.
- API: `MAX_WALKS` sale da 8 a 9 (sull'acqua c'è anche il ritorno al
  contorno: il sole ne avrebbe 9); le descrizioni di `pen_up` e `walks`.
  Nient'altro: `plan_water` passa la richiesta com'è, e `walks` era già
  nelle risposte, nel GPX e nel punteggio.

**Una scelta diversa dalla strada, decisa dall'agente**: sull'acqua **la
distanza chiesta è quella di tutto il percorso**, tratti a penna alzata
compresi. Su strada è quella del solo disegno, e i tratti a piedi si
aggiungono. Sull'acqua si resta fra 1 e 5 km pagaiati, per la stessa
ragione per cui i tratti dalla riva contano già.

**Il primo tentativo scartato**: andare agli occhi da dove la riva tocca
il contorno. Al mare il pesce aveva 534 m a penna alzata su 2 km (il punto
della riva è alla coda, l'occhio alla testa) e la forma scendeva al 55%.
Lasciando il contorno vicino agli occhi sono 64 m, e la scala è quella di
ogni altra forma.

**I campioni** (2026-10-05, sull'acqua del server copiata sul Mac, dai
punti della riva di «Explore», a 2 km): le nove forme a pezzi nei quattro
luoghi, **36 su 36 ci stanno**, a 1977–2016 m, in 0,5–3,5 s.

| Forma | Tratti a penna alzata | Metri, al mare · sui laghi |
|---|---|---|
| pesce | 2 | 64 · 76 |
| testa di cane | 3 | 86 · 102 |
| testa di coniglio | 3 | 94 · 112 |
| zucca | 4 | 185 · 221 |
| ciambella | 2 | 206 · 245 |
| fantasmino | 3 | 245 · 292 |
| gatto | 3 | 262 · 312 |
| faccina | 4 | 297 · 354 |
| sole | 9 | 726 · 876 |

Al mare la scala è 0,79 (0,73 per il sole) e i tratti dalla riva 415–434 m
in due (il sole 525–535); sui laghi 0,94 (0,88) e 118–136 m (217–239). Le immagini giudicate
dall'utente sono in `out/task226-water-eyes/` (fuori dal repository): il
confronto «oggi / occhi staccati» a Como e Riccione, e i fogli delle
forme. L'utente ha scelto tutte tranne il sole.

**Con la penna giù niente cambia**:

- le nove forme a pezzi sull'acqua, costa e lago delle fixture a 2 km:
  18 impronte calcolate su `main` (`7e85452`) prima del cambio, fissate in
  `test_water_pieces.py`;
- cuore, cerchio e stella sull'acqua (`test_bike_on_foot.py`) e la corsa
  (`test_kept_per_graph.py`): invariate;
- i 32 esempi di `paddleExamples.json`, rifatti con il motore nuovo, sono
  identici: cambia solo l'impronta, da `037e327adfe7` a `43ef533d5d82`.

**Test**: `test_water_pieces.py` (59: la richiesta, `_entered`, `_tour`,
`_branch`, le nove forme su costa e lago con i tratti e i pezzi nella
fascia, l'isola, le 18 impronte, la CLI); API `test_paddling_pieces.py` (9:
`/routes` e `/route-jobs` con i `walks`, la penna giù, il rifiuto di una
forma senza pezzi, il GPX con `Pause` e `Resume`, la chiave degli esempi
tenuti).

**Per la parte B**: l'app non manda ancora `pen_up` sull'acqua
(`shapeAsked` in `penUpShapes.ts`), quindi per chi usa l'app non cambia
niente finché la B non entra. La voce di oggi fra i pezzi dice «Walk to
the next part»: sull'acqua serve «Paddle to…». `PEN_DOWN_M` (20 m) è più
lungo di alcuni tratti sull'acqua: va accorciato per `paddling`.

## Note per il deploy

- La parte A cambia `route_engine`: l'impronta del motore cambia, quindi
  dopo l'aggiornamento del server serve `draw_examples`, con l'ok
  dell'utente (`AGENTI.md`, regola 11). Niente da migrare.
- **Il server è a `main` `3b6e821`** dalla notte del 2026-10-05 (motore di
  TASK-223 e TASK-230, `draw_examples` rilanciato): non ha la parte A. Dopo
  il merge serve **un altro aggiornamento, con `draw_examples` e un nuovo ok
  dell'utente**; solo dopo si pubblica la parte B.
- Un server senza la parte A rifiuta `pen_up` con `paddling`
  (`invalid_request`): la parte B dell'app si pubblica **dopo** che il
  server ha la A, o «Paddle» con le forme a pezzi darebbe un errore.
- Lo zip del motore del telefono è rifatto; il motore sul telefono non
  disegna sull'acqua, ma lo zip segue il codice.
