# TASK-037 — Tratti interni ripassati

**Stato**: In corso
**Fase**: 3 · **Branch**: `feat/TASK-037-inner-strokes` (parte da `main`,
che contiene TASK-036)

## Obiettivo

Una forma può avere tratti interni (rami, occhi, gambe sottili, finestre)
oltre al contorno, e il percorso li disegna con andata e ritorno invece di
potarli o di segnalarli come ripercorsi. Serve alle forme che TASK-036 ha
lasciato a `no` o `quasi` perché si riconoscono da un dettaglio interno.

## Contesto da leggere

- `docs/ROADMAP.md`, fase 3: «Deciso dall'utente (2026-09-24), guardando
  la Strava art» e la richiesta della casa con le finestre
- `docs/DECISIONS.md` ADR-0026 (potatura e ripercorrenza), ADR-0035
  (contorni da file), ADR-0038
- `docs/ROUTE_ENGINE.md` §2 (forme), §4 (snapping), §6 (validazione)
- `services/route-engine/route_engine/shapes/outline.py` (`parse_outline`,
  `_first_crossing`)
- `services/route-engine/route_engine/network.py` (`prune_spurs`,
  `prune_parallel_spurs`, i `corner_nodes` protetti)
- `services/route-engine/route_engine/validation.py` (`retraced`,
  `visual_retrace`)

## Cosa c'è già

- Un contorno è un solo anello chiuso che non si incrocia: `parse_outline`
  rifiuta gli incroci, e quindi rifiuta anche un tratto di andata e ritorno.
- Lo snapping toglie le punte (esatte e parallele) finché il percorso non
  cambia, salvo i nodi delle punte della forma (ADR-0026).
- La validazione avvisa sopra il 5% di ripercorrenza esatta e il 10% di
  visiva.
- Le candidate di TASK-034 sono in `shapes/outlines/` (luna, pesce,
  freccia, albero, corona, gatto) insieme a stella, cavallo e casa.

## Decisioni da prendere

Da registrare in una nuova ADR, come «deciso dall'agente su delega
dell'utente». Proposta di partenza:

- **A. Formato**: il JSON del contorno accetta un campo facoltativo
  `strokes`, lista di tratti. Un tratto è una linea aperta che parte da un
  punto del contorno (ramo, gamba) o un anello chiuso interno con un
  collegamento al contorno (occhio, finestra). Senza `strokes` il file
  resta valido come oggi.
- **B. Una sola traccia**: il motore inserisce ogni tratto nel contorno
  nel suo punto di attacco, come andata e ritorno, e ne esce una sola
  sequenza di punti da campionare, proiettare e seguire.
- **C. Potatura e misure**: i tratti di andata e ritorno voluti sono
  protetti dalla potatura e non contano nella ripercorrenza; il resto del
  percorso si misura come oggi.
- **D. Somiglianza**: si confronta con la forma intera, tratti compresi.
- **E. Quali forme**: si aggiungono i tratti a casa (finestre), albero
  (rami), gatto (occhi) e pesce (occhio); le altre restano come sono.

## Cosa fare

1. Formato e lettura dei tratti in `outline.py`, con i controlli (attacco
   sul contorno, niente incroci col contorno fuori dall'attacco).
2. La traccia unica con le andate e i ritorni, e il campionamento per
   lunghezza che la rispetta.
3. Snapping e validazione: i tratti voluti non si potano e non si contano
   come ripercorsi.
4. Tratti aggiunti ai contorni del punto E.
5. Campioni `TASK-037_*` a Trento, Levico e Milano, 15 km, per le forme
   del punto E; giudizio dell'utente in `samples/LOG.md`.
6. Documentazione: `ROUTE_ENGINE.md` §2, §4, §6; nuova ADR; `ROADMAP.md`;
   `STATUS.md`.

## Criteri di accettazione

- [ ] In `services/route-engine/` e in `services/api/` `ruff`,
      `black --check` e `pytest -m "not network"` passano.
- [ ] Test: un contorno senza `strokes` dà la stessa sequenza di prima; un
      tratto non attaccato al contorno è rifiutato; la traccia unica passa
      due volte su ogni tratto; un tratto voluto sopravvive alla potatura;
      la ripercorrenza non conta i tratti voluti.
- [ ] Le forme del catalogo (cerchio, cuore, stella, cavallo) danno gli
      stessi percorsi di TASK-036.
- [ ] Ogni forma del punto E ha i suoi campioni e il giudizio dell'utente
      in `LOG.md`.
- [ ] I job della CI sono verdi sulla PR.
- [ ] Nuova ADR; `ROUTE_ENGINE.md`, `ROADMAP.md`, `STATUS.md` aggiornati.

## File toccati

```
services/route-engine/route_engine/shapes/outline.py
services/route-engine/route_engine/shapes/resample.py
services/route-engine/route_engine/shapes/outlines/*.json
services/route-engine/route_engine/network.py
services/route-engine/route_engine/validation.py
services/route-engine/tests/test_outline.py
services/route-engine/tests/test_network.py
services/route-engine/tests/test_validation.py
samples/TASK-037_*.gpx
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/ROADMAP.md
docs/STATUS.md
docs/tasks/TASK-037.md
```

## Fuori scope

- La luna nel catalogo: è un cambio piccolo a parte, nel suo branch
  (`STATUS.md`, «Prossimo passo»).
- Nuove forme nel catalogo dell'app: solo dopo il giudizio, in un task
  successivo.
- Scritte e lettere, forme fatte di più pezzi staccati.
- Trovare dove la forma ci sta (TASK-038) e più partenze o fasi per
  compensare.
- Tag `surface`, `sac_scale`, `sidewalk` e nuovi download.

## Esito

*(da compilare a fine task)*
