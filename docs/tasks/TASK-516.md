# TASK-516 — Forme invernali e contorni: forme nuove per il motore e il catalogo

**Stato**: Done (2026-11-27) — 35 forme nuove nel motore (66 in tutto), sul
server col passo 25 e nell'OTA 27; 130 disegni nel catalogo (2161 percorsi),
sul server col passo 26; le altre 59 città passano a TASK-521
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

- [x] 11 file nuovi in `candidate_outlines/`; nessun file esistente toccato.
- [x] `read_outline` li legge tutti come un contorno chiuso coi suoi pezzi;
      `tools/test_draw_theme_shapes.py` verde (i file sono quelli che lo
      script scrive; nessun nome già in `SHAPES` né fra le 49 di TASK-418).
- [x] `tools/test_draw_new_shapes.py` resta verde senza modifiche.
- [x] L'utente ha visto la pagina d'anteprima e approvato (o fatto
      ridisegnare) ogni sagoma; le sue parole qui sotto.

## Parte B — la prova sulle strade

Come TASK-419: ogni candidata pianificata in alcune città dalla cache, il
registro in `out/TASK-516/`, una pagina dei disegni per l'utente. Il giro
pesante parte solo col via del Coordinatore (il Mac si blocca sotto
carico: uno alla volta, `nice`, mai col simulatore acceso). La lista dei
file prima del codice.

### Esito (2026-11-26)

Nessun file del repository: gli strumenti di TASK-419 così come sono
(`tools/catalog_seed.py --run --outlines DIR`, poi una pagina per forma), in
`out/TASK-516/b/` della cartella principale (non tracciata): `run.sh`, il
registro `runs.jsonl` (copia di quello di TASK-419, così i casi già fatti
si saltano), `outline-runs.jsonl`, `summary.txt`, `strade.html`,
`scelte.json`.

- 88 casi nuovi: le 11 sagome a Barcellona, Levico, Milano e Trento (le
  città di TASK-418), a 10 e 5 km, zone già in cache, nessun download; tutti
  disegnati. I 35 contorni erano già nel registro di TASK-419.
- La pagina mostra per ogni forma il contorno e i 4 disegni migliori, col
  filtro del catalogo (somiglianza ≥ 0,90, distanza ±10%, ripassi ≤ 10%,
  niente `motorway`/`trunk`). Proposta: «entra» dove passano almeno 3
  disegni.
- **Entrano 35 forme** (scelta dell'utente, sotto), per categoria:
  - animali (6): `dolphin`, `fox_head`, `owl`, `penguin`, `reindeer`, `turtle`;
  - cibo (4): `candy_cane`, `croissant`, `pizza_slice`, `strawberry`;
  - monumenti (4): `colosseum`, `dome`, `eiffel_tower`, `triumphal_arch`;
  - oggetti (11): `ball`, `bell`, `light_bulb`, `padlock`, `racket`,
    `santa_hat`, `scooter`, `skis`, `snowman`, `stocking`, `umbrella`;
  - simboli (10): `easter_egg`, `flower`, `gift`, `infinity`, `leaf`,
    `medal`, `mountain`, `peace`, `snowflake`, `trophy`.
- **Restano fuori 11**: `comet` (2 disegni su 8), `dinosaur`, `elephant`,
  `giraffe`, `gondola`, `guitar`, `key`, `moka`, `rocket`, `running_shoe`,
  `whale` (meno di 3 disegni che passano). I loro file restano in
  `candidate_outlines/`; la parte C registra solo le 35.

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

### Come è fatta (2026-11-26)

Branch `feat/TASK-516-c-register`; la lista dei file l'ha approvata il
Coordinatore, con `drawingMatch.test.ts` aggiunto dopo.

- I 35 contorni passano da `candidate_outlines/` a
  `route_engine/shapes/outlines/`: 25 di TASK-418 (`APPROVED` di
  `draw_new_shapes.py`) e 10 di TASK-516 (un `APPROVED` nuovo in
  `draw_theme_shapes.py`, con `home()` come l'altro strumento). Restano
  candidate le 11 non scelte. `SHAPES` passa da 31 a 66 forme.
- 24 delle 35 hanno pezzi: entrano in `PEN_UP_SHAPES` (l'API le accetta a
  penna alzata), ma l'app le disegna a penna giù (`OFFERED` di
  `penUpShapes.ts` non cambia, ADR-0411 punto 5). `test_pieces.py` e
  `test_water_pieces.py` le contano; le linee aperte fra i pezzi (uovo,
  regalo, foglia, lampadina, montagna, gufo) sono in `OPEN_PIECES`.
- Le descrizioni per l'AI vengono dalle parole dei file delle forme.
- Nomi e parole della ricerca nelle cinque lingue. Quattro nomi c'erano
  già nelle tabelle («Eiffel Tower», «Leaf», «Skis», «Trophy»): riusati.
- **Due parole tolte** (deciso dall'agente, il Coordinatore d'accordo):
  «croissant» da solo non è più una parola francese della luna (resta
  «croissant de lune»: oggi «croissant» è la forma); «Birne» non è fra le
  parole della lampadina (in tedesco è la pera).
- Categorie della ricerca, scelta dell'utente: animali → «Animals»,
  simboli → «Symbols», gli altri 19 (cibo, monumenti, oggetti) → «Emoji».
- `prefetch_zones.ZONE_SHAPES` non cambia. Nella zona in bici di 30 km
  quattro forme nuove stanno solo fino a 27 km (bastoncino, croissant, Torre
  Eiffel) o 25 km (ombrello), come la pera e la Torre di Pisa
  (`test_prefetch_zones.py`).
- Stessi percorsi: le 9 rotte identiche sul Mac; `SAME_ROUTES_AS`
  `030243086cea → 83b84d67c7f4`, `da3da1914fdf → 780424973b42` (nuoto),
  `f01152178efe → 9b27551516c0` (pagaiata); `engine_fingerprint()` resta
  `8ab61d8e87f9`. Impronta nativa iOS invariata, `5e1b5ce5`: basta un OTA.
- Fuori lista, col sì del Coordinatore: `drawingMatch.test.ts` (sotto) e
  `tools/test_catalog_words.py` (il pinguino non è più un esempio di
  candidata: lo è la giraffa).

**Per dopo**: in «Explore» la ricerca confronta pezzi di parola, così
«cane» in italiano mostra anche il bastoncino di zucchero (`candy_cane`)
oltre alla testa di cane (`drawingMatch.test.ts` lo dice). Cambiarlo tocca
`drawingMatch.ts`: fuori da questo task.

## Parte D — il catalogo

I disegni delle forme nuove in fondo ai file di città (`tools/catalog_seed.py`,
`_place`: gli id di prima restano), col filtro del catalogo
(`catalog/README.md`) e una pagina per l'utente prima della PR; poi il
passo «catalogo» sul server.

### D1 — i disegni già fatti (2026-11-27)

Nessun giro nuovo. Dei disegni delle 35 forme nel registro di TASK-419 (con
in coda gli 88 casi della parte B) ne passano il filtro **130, nelle quattro
città della parte B**: Milano 60, Barcellona 36, Trento 32, Levico 2 (69 da
10 km, 61 da 5 km, da 3 a 8 per forma). Pagina per l'utente:
`out/TASK-516/d/disegni-130.html`. Entrano tutti: il seme passa da 2031 a
**2161 percorsi**.

- `catalog_seed._place` mette le forme di `LATER_SHAPES` (le 35) in fondo a
  ogni file di città, dopo corse, parole, uscite e uscite lunghe: l'API
  numera un percorso col suo posto nel file, quindi ogni id di prima resta.
  Lo dice un test (`test_catalog_seed.py`), e un altro controlla che le 35
  siano nel `SHAPES` del motore.
- Prova: con le chiavi di prima, `catalog_bike.py --write` rifà i 63 file
  identici byte per byte; con le 130 chiavi cambiano solo i quattro file, e
  in ognuno i percorsi di prima sono gli stessi, nello stesso ordine.
- `out/TASK-419/runs.jsonl` ha in coda gli 88 casi della parte B (copia di
  prima: `runs.before-task516.jsonl`), così i comandi del README vanno
  come prima.
- #1661 in `main` (`c6a59b44`). Sul server col passo 26 (`0c40a3dc`):
  «2161 recommended routes from catalog/seed», nessun Traceback, impronte
  del motore uguali a prima (parola del Coordinatore, 2026-11-27).

### D2 — le altre 59 città: passa a TASK-521

Il giro delle 35 forme nelle altre città (proposta: 6 forme per città a
turno, a 5 e 10 km, circa 700 casi, dalle zone a piedi in cache) passa a
TASK-521 (revisione del catalogo e 3000 disegni), che lavora sugli stessi
file (Coordinatore, 2026-11-27). Appunti per quella sessione:
`out/TASK-516/D2-PASSAGGIO.md` della cartella principale.

## Scelte dell'utente

- 2026-11-24: il primo pezzo è «Forme invernali e contorni» (pezzi 1 e 2
  della C di TASK-441); frasi con lo spazio e cifre dopo.
- 2026-11-26: sulle 11 sagome della parte A, viste nella pagina
  d'anteprima: «Sì, vanno bene». Restano tutte e 11, come sono.
- 2026-11-26: sulla pagina delle strade (46 candidate, 35 spuntate come
  proposta, categorie dei file): «Vanno bene le 35». Entrano le 35 elencate
  nell'esito della parte B, con la categoria del loro file.
- 2026-11-26: le 19 forme di cibo, monumenti e oggetti nella ricerca:
  «Sì, in Emoji» (nessuna chip nuova).
- 2026-11-27: sulla parte D, «Sì, così»: subito i 130 disegni delle quattro
  città (D1), il giro nelle altre 59 città dopo (D2).
- 2026-11-27: sulla pagina dei 130 disegni: «Sì, vanno bene». Entrano tutti.

## Fuori scope

- Frasi con lo spazio e cifre (la scrittura delle lettere).
- Cambiare le forme che ci sono già, o le zone (`ZONE_SHAPES`).
- La penna alzata nell'app per le forme nuove coi pezzi, finché l'utente
  non le ha giudicate così (come in ADR-0346 B, punto 3).

## Dove siamo

- **2026-11-24**: parte 0 aperta (questo file, ADR-0411, STATUS, INDEX).
  Lista dei file della parte A mandata al Coordinatore.
- **2026-11-24**: parte 0 in `main` (#1579). Parte A in bozza (#1580): lo
  strumento `tools/draw_theme_shapes.py`, il suo test e gli 11 contorni.
- **2026-11-26**: l'utente approva le 11 sagome («Sì, vanno bene»); #1580
  pronta. Prossimo: la parte B (prova sulle strade), lista dei file prima al
  Coordinatore.
- **2026-11-26**: #1580 in `main`. Il task è congelato dopo la parte A
  (cornice «Mossa 5» approvata dall'utente) finché non si chiude uno dei
  tre filoni; la parte B, già approvata e senza codice, finisce: 88 casi
  disegnati, l'utente sceglie 35 forme («Vanno bene le 35»).
- **Prossimo**: la parte C (registrazione delle 35, lista di TASK-418 B)
  solo col via del Coordinatore; poi la D (catalogo).
- **2026-11-26**: l'utente fa sgelare la parte C («falla partire poi
  grazie», al Coordinatore). Lista dei file approvata; codice nel branch
  `feat/TASK-516-c-register`.
- **2026-11-26**: #1622 in `main` (1358de31): le 35 forme registrate.
- **2026-11-27**: passo 25 sul server (847f237e): «66 shapes, 35 new ok» e
  quattro percorsi veri a Trento; OTA 27 uscita con le forme. Parte D: lista
  dei file approvata dal Coordinatore, D1 nel branch
  `feat/TASK-516-d-catalogue`. Prossimo: la PR verde, il passo «catalogo»
  sul server, poi i documenti di chiusura. La D2 passa a TASK-521.
- **2026-11-27**: #1661 in `main` (`c6a59b44`), CI verde, unita da sola.
  Passo 26 sul server (`0c40a3dc`): 2161 percorsi nel catalogo.
- **Esito**: Done. Forme e catalogo in produzione; ADR-0411 accettata. Resta
  fuori, in altri task: le 35 nelle altre 59 città (TASK-521) e la A a
  penna alzata che si legge «n» (TASK-522).
