# TASK-418 — Forme nuove per il catalogo di «Explore»

**Stato**: In corso — parte A (le forme candidate) Done, in `main` con la
PR #953; parte B (la registrazione delle 14 forme approvate su strada) in PR.
**Fase**: 4 · **Branch**: `feat/TASK-418-new-shapes` (A),
`feat/TASK-418-b-register-shapes` (B) · **ADR**: ADR-0346
(numeri dal Coordinatore) ·
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
formato), ADR-0035, ADR-0036, ADR-0346.

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
```

Le righe in `STATUS.md`, `DECISIONS.md` (ADR-0346) e `INDEX.md` vanno in
una PR di soli documenti subito dopo il merge (regola del Coordinatore del
2026-11-08: le PR di codice non toccano quei tre file).

## Fuori scope

- **Registrare le forme** in `SHAPES`, nel contratto, nell'API e
  nell'app (nomi, `catalogueShapes`, lo zip del telefono): dopo il giudizio
  dell'utente su strade vere, per le sole forme approvate. Una parte
  successiva di TASK-418, con la lista dei file al Coordinatore quando
  TASK-419 ha la pagina di revisione.
- **Pianificare i 1000 disegni** e le parole nelle città: TASK-419.
- **La pagina del catalogo**: TASK-420.

## Esito

49 contorni nuovi, leggibili dal motore e provabili con `--outline`, con lo
strumento che li ridisegna e l'anteprima. Al primo controllo a occhio
quattro forme erano sbagliate (bracci dell'ancora e vele staccati,
quadrifoglio a nuvola, coda della balena): corrette. La moka a Barcellona
si legge poco: la scelta la fa l'utente su TASK-419. Prossimo: la
registrazione delle forme approvate (una parte successiva di TASK-418).

## Parte B — Le forme approvate entrano nel catalogo

**Via**: l'utente, «ok procedi» ai 20 percorsi di `pending_outlines` in
`tools/catalog_kept.json` (TASK-419), dal Coordinatore il 2026-11-10. Sono
14 forme: `airplane`, `anchor`, `bear_head`, `bicycle`, `cherries`,
`espresso_cup`, `four_leaf_clover`, `leaning_tower`, `music_note`, `pear`,
`sailboat`, `swan`, `windmill`, `wine_glass`.

**Cosa cambia**:

- i 14 file passano da `candidate_outlines/` a
  `route_engine/shapes/outlines/` (`APPROVED` in `tools/draw_new_shapes.py`)
  ed entrano in `SHAPES`; le altre 35 restano candidate;
- contratto (`SHAPES`, `PEN_UP_SHAPES`), descrizioni per l'AI, nomi in
  cinque lingue, emoji, parole della ricerca, categorie (orso e cigno negli
  animali; ancora, quadrifoglio e nota nei simboli; il resto nelle emoji:
  nessuna categoria nuova, TASK-344), `catalogueShapes.json`, `engine.zip`;
- **penna giù soltanto** nell'app: ancora, orso, bici e tazzina hanno pezzi,
  quindi l'API le accetta con la penna alzata (`PEN_UP_SHAPES`, come il
  sole), ma «Draw» non la offre finché l'utente non le ha giudicate così;
- **le zone non cambiano**: `prefetch_zones.ZONE_SHAPES` tiene la scatola
  dei percorsi più lunghi sulle 17 forme di prima (deciso dal Coordinatore
  su delega). Il limite: in bici pera e Torre di Pisa stanno nella zona fino
  a 26 km, non a 30 (`test_prefetch_zones.py`);
- **stessi percorsi**: le 9 rotte di `test_same_routes.py` identiche sul Mac
  prima e dopo; `SAME_ROUTES_AS` 2bca806f467b → 8ab61d8e87f9 (tutto tranne
  il nuoto), 55b54eea0e14 → 17d7608bd912 (nuoto), cf585f8fb31b →
  8a62c5877031 (pagaiata).

**File toccati (B)**:

```
services/route-engine/route_engine/shapes/outlines/<14>.json   (spostati)
services/route-engine/candidate_outlines/<14>.json             (tolti)
services/route-engine/route_engine/shapes/__init__.py
services/route-engine/tests/test_pieces.py
services/route-engine/tests/test_water_pieces.py
tools/draw_new_shapes.py
tools/test_draw_new_shapes.py
tools/test_catalogue_shapes.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/contract.json
services/api/shaperoute_api/prefetch_zones.py
services/api/shaperoute_api/route_store.py
services/api/tests/test_prefetch_zones.py
services/api/tests/test_zone_shapes.py                          (nuovo)
services/api/tests/fixtures/same_routes/2bca806f467b.json       (nuovo)
services/ai/shaperoute_ai/prompt.py
services/ai/tests/phrases.json
services/ai/tests/phrases-holdout.json
apps/mobile/src/i18n/shapeNames.ts
apps/mobile/src/i18n/it.ts
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/route/ShapeTiles.tsx
apps/mobile/src/route/shapeWords.ts
apps/mobile/src/route/shapeWords.test.ts
apps/mobile/src/route/ShapeNamesLanguages.test.tsx
apps/mobile/src/search/categories.ts
apps/mobile/src/mapdraw/catalogueShapes.json
apps/mobile/src/mapdraw/ChangeFigureApp.test.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/assets/engine/engine.zip
docs/tasks/TASK-418.md
```

**Dopo il merge** (non qui): sul server checkout e `draw_examples` per la
nuova impronta, in catena dal Coordinatore; TASK-419 mette i 20 percorsi
nel catalogo; le righe di STATUS, DECISIONS (la precisazione di ADR-0346
sulle zone) e INDEX in una PR di soli documenti.

