# TASK-418 — Forme nuove per il catalogo di «Explore»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-418-new-shapes` · **ADR**: ADR-0349
(preso come primo libero, `AGENTI.md` regola 4, e detto al Coordinatore) ·
parte A del catalogo grande; B è TASK-419 (i 1000 disegni e la scelta),
C è TASK-420 (la pagina del catalogo)

## Obiettivo

49 forme nuove, approvate dall'utente sulla carta, esistono come contorni
che il motore sa seguire, pronte per essere provate su strade vere da
TASK-419.

## Contesto

L'utente, 2026-11-08: «fare 1000 disegni in città europee e italiane, con
figure nuove e parole nuove; le venute meglio in Explore, in un catalogo
completo e scorribile». La lista l'ha approvata intera («Va bene tutta»):

- **monumenti (7)**: `eiffel_tower`, `leaning_tower`, `colosseum`,
  `windmill`, `gondola`, `dome`, `triumphal_arch`;
- **cibo (8)**: `pizza_slice`, `moka`, `espresso_cup`, `croissant`,
  `wine_glass`, `cherries`, `pear`, `strawberry`;
- **animali (11)**: `elephant`, `giraffe`, `whale`, `dolphin`, `turtle`,
  `owl`, `penguin`, `bear_head`, `fox_head`, `dinosaur`, `swan`;
- **oggetti (12)**: `scooter` (la Vespa, senza il marchio), `bicycle`,
  `airplane`, `sailboat`, `rocket`, `anchor`, `padlock`, `key`, `umbrella`,
  `running_shoe`, `guitar`, `light_bulb`;
- **simboli (11)**: `infinity`, `peace`, `four_leaf_clover`, `flower`,
  `leaf`, `music_note`, `trophy`, `medal`, `mountain`, `gift`,
  `easter_egg`;
- **parole (17)**, approvate insieme, per TASK-419 (`PHRASES` del seme, max
  4–5 lettere, ADR-0130): MUW, RUN, GO, VAI, WOW, LOVE, BACI, PACE, FORZA,
  DAJE (Roma), HOLA (Spagna), OLA (Portogallo), SALUT (Francia), HALLO
  (Germania, Olanda), HEJ (Scandinavia), AMOR, e il nome della città
  quando è corto (ROMA, PISA, OSLO, RIGA…). Le lettere A–Z ci sono già:
  qui non serve niente.

Da leggere: `ROUTE_ENGINE.md` §2, `route_engine/shapes/outline.py` (il
formato), ADR-0035, ADR-0036, ADR-0349.

## Cosa fare

1. `tools/draw_new_shapes.py`: ogni forma come unione di cerchi, ellissi,
   rettangoli e linee spesse (shapely, già dipendenza del motore); il
   contorno esterno è il contorno, i buchi e i dettagli che non toccano
   niente sono i pezzi. Partenza nel punto più alto.
2. I 49 file in `services/route-engine/candidate_outlines/`, **fuori dal
   pacchetto**: né `SHAPES` né lo zip del motore sul telefono li vedono
   finché l'utente non li ha giudicati su strade vere (ADR-0036).
3. Una pagina d'anteprima (`--preview`) per giudicarle a occhio.
4. Test: i file sono quelli che lo script scrive, il motore li legge
   tutti, nessun nome già nel catalogo.

## Criteri di accettazione

- [x] 49 file in `candidate_outlines/`, 7+8+11+12+11 per gruppo.
- [x] `read_outline` li legge tutti; `tools/test_draw_new_shapes.py` verde.
- [x] `python -m route_engine --outline candidate_outlines/<forma>.json`
      pianifica: provato a Barcellona, 5 km, dalla cache (Colosseo 0,94).
- [x] Lo zip del motore sul telefono non cambia (`pytest tools` verde).
- [x] Nessun file del motore o dell'app modificato.

## File toccati

```
tools/draw_new_shapes.py
tools/test_draw_new_shapes.py
services/route-engine/candidate_outlines/*.json   (49 nuovi)
docs/tasks/TASK-418.md
docs/STATUS.md
docs/DECISIONS.md
```

## Fuori scope

- **Registrare le forme** in `SHAPES`, nel contratto, nell'API e
  nell'app (nomi, `catalogueShapes`, lo zip del telefono): dopo il giudizio
  dell'utente su strade vere, per le sole forme approvate. Task da aprire
  col Coordinatore quando TASK-419 ha la pagina di revisione.
- **Pianificare i 1000 disegni** e le parole nelle città: TASK-419.
- **La pagina del catalogo**: TASK-420.

## Esito

49 contorni nuovi, leggibili dal motore e provabili con `--outline`, con lo
strumento che li ridisegna e l'anteprima. Al primo controllo a occhio
quattro forme erano sbagliate (bracci dell'ancora e vele staccati,
quadrifoglio a nuvola, coda della balena): corrette. La moka a Barcellona
si legge poco: la scelta la fa l'utente su TASK-419. Prossimo: la
registrazione delle forme approvate (task da aprire).
