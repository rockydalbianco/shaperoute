# TASK-516 — Forme invernali e contorni: forme nuove per il motore e il catalogo

**Stato**: In lavorazione — parte 0 (documenti) il 2026-11-24
**Fase**: 5 · **Branch**: `docs/TASK-516-part-0` (parte 0); una PR per parte
**ADR**: ADR-0411 · numeri dal Coordinatore (fork 3), 2026-11-24
**Viene da**: TASK-441 (la sua parte C), TASK-418 (le forme candidate e
come si registrano), TASK-419 (il registro dei disegni delle candidate)

## Obiettivo

Il motore impara forme nuove, giudicate dall'utente prima sulla carta e poi
sulle strade, e il catalogo di «Explore» ne riceve i disegni: le forme
d'inverno e delle feste, qualche forma di sport, e i 35 contorni di
TASK-418 che non sono mai entrati.

## Da dove viene

L'utente, all'inizio di TASK-441 (2026-11-11): «amplia il settore explore
con parole, frasi anche con l'alzata di penna e anche nuove immagini,
magari anche trend topic… arriviamo a 2000 immagini». A, B1, B2 e B3 di
TASK-441 sono fatte (2031 disegni, sul server dal passo 21). La parte C
cambia il motore e per questo è diventata un task suo, con questo numero.

La C aveva quattro pezzi (proposta in `out/explore-2000/proposta.md`,
checkout principale, non tracciato):

1. forme nuove a tema: inverno e feste, sport;
2. i 35 contorni di TASK-418 mai registrati;
3. frasi con lo spazio (TI AMO, GO RUN, BUON ANNO…);
4. cifre («2027»).

**Scelta dell'utente, 2026-11-24: si parte da «Forme invernali e
contorni»**, cioè i pezzi 1 e 2. Frasi con lo spazio e cifre (la scrittura
delle lettere) vengono dopo, in un'altra parte o un altro task.
L'utente ha chiesto di andare avanti («ORA PUOI PROCEDERE?»).

## Com'è oggi (`main` = `8e793730`)

- Il motore ha **43 forme** (`SHAPES` in
  `services/route-engine/route_engine/shapes/__init__.py`, contorni in
  `shapes/outlines/*.json`). Ci sono già `christmas_tree` (con la stella
  come pezzo) e `pumpkin` (TASK-078/088).
- In `services/route-engine/candidate_outlines/` stanno **35 candidate**
  disegnate da `tools/draw_new_shapes.py` (ADR-0346), fuori dal pacchetto:
  colosseum croissant dinosaur dolphin dome easter_egg eiffel_tower elephant
  flower fox_head gift giraffe gondola guitar infinity key leaf light_bulb
  medal moka mountain owl padlock peace penguin pizza_slice rocket
  running_shoe scooter strawberry triumphal_arch trophy turtle umbrella
  whale. `gift` e `medal` sono già «a tema».
- TASK-419 ha disegnato 102 percorsi con queste 35 (registro
  `out/TASK-419/runs.jsonl`); circa 80 passano già il filtro del catalogo.
- Mancano: pupazzo di neve, fiocco di neve, renna, cappello di Babbo
  Natale, bastoncino di zucchero, campana, calza, stella cometa; pallone,
  racchetta, sci.
- Le categorie della ricerca (TASK-344, `apps/mobile/src/search/categories.ts`):
  animali, cuori, parole, simboli (qui l'albero di Natale), emoji (qui la
  zucca e le 14 forme di TASK-418 B, salvo orso, cigno, ancora,
  quadrifoglio e nota).

## Le parti

| Parte | Cosa | Tocca | Uscita |
|---|---|---|---|
| 0 | questo file, ADR-0411 «Proposta», le righe in STATUS e INDEX | `docs/` | PR di documenti |
| A | i contorni delle 11 forme nuove, **file nuovi** in `candidate_outlines/` da uno strumento nuovo, con la pagina d'anteprima | `tools/` (file nuovi), `candidate_outlines/` (file nuovi) | **l'utente approva le sagome, una per una** |
| B | prova sulle strade delle candidate (le 11 nuove + le 35), come TASK-419 | `tools/` (file nuovi), `out/` | pagina dei disegni; l'utente sceglie quali forme entrano |
| C | registrazione delle forme approvate (la lista di TASK-418 B) | motore, API, AI, tipi, app, `engine.zip` | PR del motore **unita dall'utente**; server e OTA insieme |
| D | i disegni delle forme nuove nel catalogo, in fondo ai file di città | `tools/`, `catalog/` | passo «catalogo» sul server |

A e B creano solo file nuovi o lavorano in `out/`: si fanno prima che il
motore cambi. Le scelte di prodotto (quali sagome, quali forme entrano, in
che categoria, penna alzata o no nell'app) sono dell'utente, una domanda
alla volta con una proposta. **La lista esatta dei file di ogni parte va
al Coordinatore prima di scrivere codice.**

## Parte A — i contorni nuovi

Le 11 forme, disegnate come in ADR-0346 (unione di cerchi, ellissi,
rettangoli, linee spesse; buchi e dettagli staccati come `pieces`;
partenza nel punto più alto):

| Nome | Cosa | Gruppo (`category`) |
|---|---|---|
| `snowman` | pupazzo di neve: tre palle, cappello, bottoni come pezzi | `objects` |
| `snowflake` | fiocco di neve a sei bracci | `symbols` |
| `reindeer` | renna (testa con le corna, o intera: si decide sulla carta) | `animals` |
| `santa_hat` | cappello di Babbo Natale col pon pon | `objects` |
| `candy_cane` | bastoncino di zucchero | `food` |
| `bell` | campana | `objects` |
| `stocking` | calza della Befana / di Natale | `objects` |
| `comet` | stella cometa con la coda | `symbols` |
| `ball` | pallone da calcio (cerchio, il pentagono come pezzo) | `objects` |
| `racket` | racchetta da tennis (il piatto come buco) | `objects` |
| `skis` | sci incrociati | `objects` |

`category` è il gruppo di TASK-418 (`CATEGORIES` di `draw_new_shapes.py`):
serve solo allo strumento. La categoria nell'app è una scelta della parte C.

Lo strumento è un file nuovo, `tools/draw_theme_shapes.py`, che prende le
primitive da `draw_new_shapes.py` ma ha un registro suo: il test delle 49
forme di TASK-418 non cambia. La pagina d'anteprima e gli screenshot vanno
in `out/TASK-516/` (checkout principale, non tracciato).

### File toccati (parte A)

```
tools/draw_theme_shapes.py                                (nuovo)
tools/test_draw_theme_shapes.py                           (nuovo)
services/route-engine/candidate_outlines/<nome>.json      (11 nuovi)
docs/tasks/TASK-516.md
```

### Criteri di accettazione (parte A)

- [ ] 11 file nuovi in `candidate_outlines/`; nessun file esistente toccato.
- [ ] `read_outline` li legge tutti come un contorno chiuso coi suoi pezzi;
      `tools/test_draw_theme_shapes.py` verde (i file sono quelli che lo
      script scrive; nessun nome già in `SHAPES` né fra le 49 di TASK-418).
- [ ] `tools/test_draw_new_shapes.py` resta verde senza modifiche.
- [ ] L'utente ha visto la pagina d'anteprima e approvato (o fatto
      ridisegnare) ogni sagoma; le sue parole qui sotto.

## Parte B — la prova sulle strade

Come TASK-419: ogni candidata pianificata in alcune città dalla cache, il
registro in `out/TASK-516/`, una pagina dei disegni per l'utente. Il giro
pesante parte solo col via del Coordinatore (il Mac si blocca sotto
carico: uno alla volta, `nice`, mai col simulatore acceso). La lista dei
file prima del codice.

## Parte C — la registrazione

La lista di partenza è quella di TASK-418 B (`tasks/TASK-418.md`,
ADR-0346 precisazione B): i file spostati da `candidate_outlines/` a
`route_engine/shapes/outlines/`, `SHAPES`, i test dei pezzi, il contratto
(`packages/shared-types`), l'API (`prefetch_zones.py`, `route_store.py`),
le descrizioni per l'AI, i nomi nelle cinque lingue, i riquadri, le
categorie, `catalogueShapes.json`, e `engine.zip` **rifatto per ultimo**.
Serve la prova «stessi percorsi» (`services/api/tests/test_same_routes.py`,
fixture nuova, righe di `SAME_ROUTES_AS` in `ROUTE_ENGINE.md`) e il
controllo dell'impronta nativa iOS su una copia pulita (ogni `npm ci` va
chiesto al Coordinatore). `prefetch_zones.ZONE_SHAPES` resta sulle 17
forme di prima (ADR-0346 B). La PR la **unisce l'utente**; server
(checkout e `draw_examples` per l'impronta nuova) e OTA escono insieme,
ciascuno col sì dell'utente raccolto dal Coordinatore.

## Parte D — il catalogo

I disegni delle forme nuove in fondo ai file di città (`tools/catalog_seed.py`,
`_place`: gli id di prima restano), col filtro del catalogo
(`catalog/README.md`) e una pagina per l'utente prima della PR; poi il
passo «catalogo» sul server.

## Scelte dell'utente

- 2026-11-24: il primo pezzo è «Forme invernali e contorni» (pezzi 1 e 2
  della C di TASK-441); frasi con lo spazio e cifre dopo.

## Fuori scope

- Frasi con lo spazio e cifre (la scrittura delle lettere).
- Cambiare le forme che ci sono già, o le zone (`ZONE_SHAPES`).
- La penna alzata nell'app per le forme nuove coi pezzi, finché l'utente
  non le ha giudicate così (come in ADR-0346 B, punto 3).

## Dove siamo

- **2026-11-24**: parte 0 aperta (questo file, ADR-0411, STATUS, INDEX).
  Lista dei file della parte A mandata al Coordinatore.
