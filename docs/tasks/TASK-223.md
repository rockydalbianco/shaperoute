# TASK-223 — Emoji semplici per il catalogo, e la penna alzata nelle forme

**Stato**: In lavorazione: parte A Done (merge #284, 224a708, 2026-10-04); parte B nel branch `feat/TASK-223-b-shapes-in-catalog` (2026-10-04)
**Fase**: 4 · **Branch**: `feat/TASK-223-simple-emoji` (A), `feat/TASK-223-b-shapes-in-catalog` (B)
**ADR**: ADR-0185 (le forme a pezzi)
**Dipende da**: TASK-197 (la penna alzata nelle parole, `pen_up.py`)
**Dopo**: la parte B, con le forme scelte dall'utente; TASK-226 (gli occhi
staccati sull'acqua) usa gli stessi `pieces`.

## Obiettivo

Chiesto dall'utente il 2026-10-03: «Trova da fare emoji molto più semplici
da aggiungere al catalogo, metti anche la possibilità di fermare il
tratteggio».

Letto così: forme nuove per il catalogo, più semplici di gatto, cavallo e
farfalla, che sulle strade si riconoscano meglio; e per quelle fatte di
parti staccate (gli occhi di una faccina) la **penna alzata** delle parole
(TASK-197): si disegna un pezzo, si cammina senza registrare fino al
prossimo, si riprende. Sulla mappa quei tratti a piedi sono tratteggiati.

**Da confermare con l'utente sui campioni**: «fermare il tratteggio» l'ho
capito come la penna alzata fra i pezzi di una forma. Se voleva dire
un'altra cosa (per esempio spegnere il tratteggio sulla mappa), la parte A
resta utile ma la parte B cambia.

Poi, dal coordinatore, sempre su richiesta dell'utente: anche le forme che
ci sono già con **gli occhi interni senza linee di collegamento** (pesce,
gatto, teste di cane e coniglio…), con il tracking sospeso da solo fra un
pezzo e l'altro. Sull'acqua è TASK-226, che riusa questo formato.

## Parte A — il motore e i candidati (questo branch)

1. **I pezzi nei contorni** (`shapes/outline.py`): `pieces` nel JSON, linee
   staccate da tutto; anelli o linee aperte. Lo stesso file si disegna
   con la penna alzata (`pen_up_lines`) o con la penna giù (`joined`: ogni
   pezzo attaccato col collegamento più corto, andata e ritorno).
2. **La forma a pezzi come parola a penna alzata** (`pieces.py`, nuovo):
   una «lettera» per il contorno e una per ogni pezzo; la ricerca, il
   tracciamento e la somiglianza sono quelli di TASK-197. In `pen_up.py` i
   pezzi hanno zone e corridoio fini come i tratti e un anello si traccia
   chiuso; i messaggi dicono «piece 2» (`Word.kind`, `Word.label`).
3. **Gli occhi delle forme di oggi**: `"lift": [1, 2]` nel file stacca
   con la penna alzata i tratti che chiudono un anello; con la penna giù
   nulla cambia. Messo a gatto `[1, 2]`, pesce `[1]`, teste di cane e
   coniglio `[1, 2]` (la bocca pende dal collegamento del naso: il naso
   resta attaccato), zucca `[1, 2, 3]`.
4. **La CLI**: `--pen-up` anche con `--outline`/`--shape` a pezzi.
5. **Dieci candidati** in `shapes/outlines/`, solo dalla CLI, **non** nel
   catalogo: `smiley` 🙂, `ghost` 👻, `donut` 🍩, `sun` ☀️ (a pezzi);
   `lightning` ⚡, `drop` 💧, `balloon` 🎈, `ice_cream` 🍦, `cloud` ☁️,
   `apple` 🍎 (contorno, a volte con tratti).
6. **Campioni** a 10 km a Trento, Levico e Milano, in `samples/`
   (`TASK-223_*_v1.gpx`, righe in `samples/LOG.md`), le forme a pezzi con
   la penna alzata e con la penna giù.

### Criteri di accettazione (parte A)

- [x] Un contorno senza `pieces` si legge e si disegna come prima (tutti i
      test del motore verdi, i file di `outlines/` senza pezzi uguali).
- [x] Un pezzo che tocca il contorno, un tratto o un altro pezzo, o che si
      incrocia, si rifiuta con il motivo; così un collegamento che
      taglierebbe un'altra linea.
- [x] Con la penna alzata: n pezzi, n tratti a piedi; la distanza chiesta è
      quella disegnata; la partenza resta sul contorno.
- [x] Con la penna giù: una linea chiusa sola, ogni pezzo andata e ritorno.
- [x] La CLI disegna una forma a pezzi con e senza `--pen-up`, e rifiuta
      `--pen-up` per una forma senza pezzi.
- [x] Le forme e le parole di oggi danno lo stesso percorso di `main`,
      punto per punto, senza penna alzata, e le parole anche con (sotto,
      «Impronte»; `tests/test_pieces_before.py`).
- [x] Nessun file dell'API, dell'app o dell'AI toccato; il catalogo non
      cambia (solo la riga `lift` nei file di cinque forme).

### File toccati (parte A)

- `services/route-engine/route_engine/shapes/outline.py`
- `services/route-engine/route_engine/pieces.py` (nuovo)
- `services/route-engine/route_engine/pen_up.py`
- `services/route-engine/route_engine/words.py` (`Word.kind`, `label`)
- `services/route-engine/route_engine/__main__.py`
- `services/route-engine/route_engine/shapes/outlines/` (10 file nuovi;
  `cat`, `fish`, `dog_head`, `rabbit_head`, `pumpkin`: la riga `lift`)
- `services/route-engine/tests/test_pieces.py`,
  `tests/test_pieces_before.py` (nuovi), `tests/test_outline.py` (un test
  salta i contorni a pezzi)
- `apps/mobile/assets/engine/engine.zip`: la copia del motore per il
  telefono (TASK-214 B), rifatta con
  `python tools/phone_engine/phone_engine.py engine`
- `samples/TASK-223_*.gpx` (nuovi), `samples/LOG.md` (righe nuove)
- `docs/ROUTE_ENGINE.md` (§2 «Pezzi staccati dal contorno», §5, §7)
- `docs/tasks/TASK-223.md`, `docs/DECISIONS.md` (ADR-0185),
  `docs/STATUS.md` (le mie righe)

### Impronte

Le forme e le parole di oggi, su una griglia di vie da 100 m attorno a
Trento (`tests/test_pieces_before.py`): `main` a b87d8cc e questo branch
danno le stesse impronte (sha256 dei punti, della distanza, della
somiglianza e degli avvisi, come `tests/test_pen_up.py`). Anche i punti
ricampionati di ogni file di `outlines/` senza pezzi sono gli stessi.

Percorsi: le forme a 6 km, le parole a 3 km a lettera (6 almeno), con la
penna giù (`word`) e su (`penup`); gatto, pesce, teste e zucca hanno ora
`lift` e sono chieste senza penna alzata, come l'app chiede ogni forma.

| Caso | Impronta | Punti | Tratti a piedi |
|---|---|---|---|
| `penup:ciao` | `e54d4d83296c6a06` | 157 | 3 |
| `penup:io` | `7bddc7e90a0e2be7` | 71 | 1 |
| `shape:butterfly` | `2b51efb8988b2518` | 63 | 0 |
| `shape:cat` | `c4bd50e6d09184c5` | 63 | 0 |
| `shape:christmas_tree` | `9d2f78b6f94c4bf6` | 61 | 0 |
| `shape:circle` | `12030ff9c3393bf1` | 61 | 0 |
| `shape:dog_head` | `adba835fb7c2517e` | 65 | 0 |
| `shape:fish` | `87a8ea6eae6c2d7d` | 59 | 0 |
| `shape:heart` | `f993c0fa81965b16` | 65 | 0 |
| `shape:horse` | `65a8d1add8e40d24` | 59 | 0 |
| `shape:moon` | `3eb1313916fb0d3b` | 63 | 0 |
| `shape:pumpkin` | `cd11d4e34298c90b` | 63 | 0 |
| `shape:rabbit_head` | `f41b0c982b0fe852` | 61 | 0 |
| `shape:snail` | `0d55cc15e30f2399` | 63 | 0 |
| `shape:star` | `3962f2514e3ef8ca` | 63 | 0 |
| `word:ciao` | `b7bc6d4dc84e9492` | 125 | 0 |
| `word:io` | `752db4f68f1a45d8` | 65 | 0 |

I punti ricampionati dei 19 file di `outlines/` di `main` e delle 13 forme
del catalogo: le stesse 32 impronte (`POINTS` nel test).

### Note per il deploy

- Il motore cambia: dopo l'aggiornamento del server, con l'ok dell'utente,
  `draw_examples` (gli esempi tenuti hanno l'impronta del motore). Le forme
  di oggi danno lo stesso percorso, ma l'impronta guarda il codice.
- La copia del motore nell'app (`apps/mobile/assets/engine/engine.zip`,
  TASK-214 B) è rifatta in questo branch: telefono e server devono avere lo
  stesso motore, quindi l'app con questo zip si pubblica dopo che il server
  ha questo motore.
- Nessuna migrazione, nessun cambio dell'API.

## Parte B — nel catalogo (dopo il giudizio)

Parte solo con le forme che l'utente ha giudicato riconoscibili sui
campioni (ADR-0036), e dopo che `RoutePanel.tsx` e `src/route/` sono
liberi. Per ogni forma scelta:

- il motore: una riga in `shapes/__init__.py` (`SHAPES`); per una forma a
  pezzi `RouteRequest` accetta `pen_up` (oggi solo con una parola:
  `PEN_UP_WITHOUT_WORD`) e `plan_route` la scrive con `pieces.compose`;
- l'API: `pen_up` anche con una forma a pezzi (`schemas.py`, `app.py`) e
  il contratto in `packages/shared-types`;
- l'AI: le parole in `services/ai` (`prompt.py`, le frasi dei test);
- l'app: la tessera con l'emoji (`ShapeTiles.tsx`), le parole
  (`shapeWords.ts`), i nomi nelle cinque lingue (`shapeNames.ts`),
  l'interruttore della penna alzata anche per le forme a pezzi, la voce
  fra un pezzo e l'altro;
- `UI.md` (la tabella delle forme), `API.md`, `AI.md`.

### Fatto (parte B, 2026-10-04)

L'utente ha scritto «continua e pubblica»: le due domande ancora aperte
sono prese con le proposte di sotto (penna alzata accesa di partenza, una
frase sola per la voce), da confermare sul telefono; gli occhi staccati non
giudicati restano fuori dall'app. ADR-0185, punti 8–14.

- **Il motore**: faccina, fantasmino, ciambella e sole in `SHAPES`, in
  coda. `RouteRequest.pen_up` vale anche per una forma con pezzi o tratti
  staccabili (`shapes.in_pieces`), solo su strada; `plan_route` e
  `ShapeJob.of_request` la scrivono con `pieces.compose_shape`. Rifiuti:
  `PEN_UP_WITHOUT_PIECES` («… heart has none»), `PEN_UP_ON_WATER`.
- **L'API**: la descrizione di `pen_up`, `PEN_UP_SHAPES`, e `MAX_WALKS` a
  8 (i raggi del sole; prima 7) per risultati, preferiti e corse.
- **Il contratto**: `SHAPES` con le quattro, `PEN_UP_SHAPES` e
  `PenUpShape`; `RouteRequest` ha un ramo `shape: PenUpShape; pen_up:
  true`, e tsc rifiuta il cuore con la penna alzata. `contract.json` ha
  `pen_up_shapes`, la fixture `route-request-pen-up-shape.json`.
- **L'AI**: una riga per forma in `prompt.py`; 11 voci nuove nella messa a
  punto («ciambella» ora accetta ciambella o cerchio) e 7 nel controllo.
- **L'app**: le tessere 🙂 👻 🍩 ☀️, le parole (`shapeWords.ts`), i nomi
  nelle cinque lingue (`shapeNames.ts` e le tabelle; il sole è «The sun»
  perché «Sun» è la domenica); «Lift the pen between parts» per faccina,
  fantasmino e ciambella, mai sull'acqua (`penUpShapes.ts`); la riga «km of
  drawing + km walking between the parts»; la voce «Part done. Walk to the
  next part…» nelle cinque lingue; i preferiti tengono i tratti a piedi di
  una forma a pezzi e la riaprono con la penna alzata.
- `engine.zip` rifatto (`phone_engine.py engine`, il suo test verde).

### Criteri di accettazione (parte B)

- [x] Le quattro forme si chiedono all'API per nome, con la penna giù, e
      le tre del «sì» a pezzi anche con la penna alzata (test del motore,
      dell'API e del contratto).
- [x] Una forma senza pezzi con `pen_up`, o una forma a pezzi sull'acqua
      con `pen_up`, è `invalid_request` con il motivo.
- [x] Con la penna alzata il risultato ha `shape`, `word: null` e un
      tratto a piedi in meno delle linee (faccina: 3).
- [x] Le richieste di prima sono le stesse: le forme di oggi non mandano
      `pen_up`, le impronte di `test_pieces_before.py` non cambiano.
- [x] Nell'app la tessera, le parole, il nome nelle cinque lingue,
      l'interruttore solo per le tre forme, la voce fra i pezzi.
- [x] Test verdi: motore 1405, AI 35, contratto 44, app 1695; API
      senza database in locale (i test col database li fa la CI).

### File toccati (parte B)

- `services/route-engine/route_engine/shapes/__init__.py`, `models.py`,
  `optimizer.py`, `nearby_starts.py`, `pieces.py`
- `services/route-engine/tests/test_pieces_in_catalog.py` (nuovo),
  `test_pieces.py`, `test_contract.py`, `test_shapes.py`
- `services/api/shaperoute_api/schemas.py`,
  `services/api/tests/test_pen_up_shapes.py` (nuovo), `test_contract.py`
- `services/ai/shaperoute_ai/prompt.py`, `services/ai/tests/phrases.json`,
  `phrases-holdout.json`
- `packages/shared-types/src/index.ts`, `fixtures/contract.json`,
  `fixtures/route-request-pen-up-shape.json` (nuovo),
  `test/contract.test.ts`
- `apps/mobile/App.tsx`, `apps/mobile/__tests__/App.test.tsx` (l'elenco
  delle forme in due attese)
- `apps/mobile/src/route/ShapeTiles.tsx`, `shapeWords.ts`,
  `shapeWords.test.ts`, `RoutePanel.tsx`, `penUpShapes.ts` e
  `penUpShapes.test.ts` (nuovi), `RoutePanelPieces.test.tsx` (nuovo)
- `apps/mobile/src/favorites/favoriteRoute.ts`, `favoriteRoute.test.ts`
- `apps/mobile/src/navigation/penUp.ts`, `penUp.test.ts`
- `apps/mobile/src/voice/phrasebook.ts`, `en.ts`, `it.ts`, `de.ts`,
  `es.ts`, `fr.ts`, `words.test.ts`
- `apps/mobile/src/i18n/shapeNames.ts`, `it.ts`, `de.ts`, `es.ts`, `fr.ts`
  (righe aggiunte: incrocio con TASK-214 C, chiesto al coordinatore)
- `apps/mobile/assets/engine/engine.zip`
- `docs/ROUTE_ENGINE.md`, `docs/API.md`, `docs/AI.md`, `docs/UI.md`,
  `docs/DECISIONS.md` (ADR-0185, parte B), `docs/STATUS.md`,
  `docs/tasks/TASK-223.md`

### Note per il deploy (parte B)

- **Prima il server, poi l'app**: un'API senza la parte B rifiuta le
  quattro forme (`unknown shape`) e la penna alzata con una forma; il
  telefono con il motore suo (TASK-214) le disegna da sé solo nelle zone
  scaricate. Il motore cambia: dopo l'aggiornamento `draw_examples`.
- Nessuna migrazione.

## Domande per l'utente

1. **Quali forme entrano?** Pagina di confronto con i campioni; la mia
   proposta è nel riepilogo della sessione.
2. **La penna alzata per le forme a pezzi**: accesa di partenza, come per le
   parole (TASK-202), o spenta? Proposta: accesa per faccina,
   fantasmino e ciambella; il sole solo con la penna giù (a penna alzata
   cammina quasi quanto disegna).
3. **La voce fra un pezzo e l'altro**: «Walk to the eye» come «Walk to the
   U» delle parole, o una frase sola per tutti i pezzi («Walk to the next
   part»)? Proposta: una frase sola, perché i pezzi non hanno nome nel file.

## Esito

**Parte A** (2026-10-04): in `main` con la #284 (224a708). Le forme e le parole
di oggi danno lo stesso percorso di prima (impronte sopra).

**Il giudizio dell'utente** (2026-10-04, sulla pagina di confronto, una
forma alla volta con le sue tre mappe):

| Forma | Modo | Giudizio |
|---|---|---|
| 🙂 `smiley` | penna alzata | sì |
| 👻 `ghost` | penna alzata | sì |
| 🍩 `donut` | penna alzata | sì |
| ☀️ `sun` | penna giù | sì |
| 🎈 `balloon`, 🍦 `ice_cream`, ⚡ `lightning`, ☁️ `cloud` | — | quasi |
| 💧 `drop`, 🍎 `apple` | — | no |

«Fermare il tratteggio» come penna alzata è confermato dal giudizio: le tre
forme a pezzi sono «sì» con la penna alzata. Le «quasi» restano fuori dal
catalogo finché l'utente non le rivede.

**Gli occhi staccati** di gatto, pesce, teste di cane e coniglio e zucca:
campioni a 15 km con la penna alzata (`samples/TASK-223_*-pen-up_15km_*`),
sulla stessa pagina; aspettano il giudizio. Parere dell'agente: gatto, pesce
e coniglio sì a Milano; testa di cane e zucca no (muso e sorriso staccati si
confondono).

**Da dove riparte la parte B**: dalle quattro forme del «sì» (faccina,
fantasmino, ciambella con la penna alzata, sole con la penna giù), più gli
occhi staccati che l'utente approverà. Domande ancora aperte, una alla
volta: la penna alzata accesa di partenza per le forme a pezzi (proposta:
sì, come per le parole); la frase della voce fra un pezzo e l'altro
(proposta: una sola, «Walk to the next part», tradotta nelle cinque
lingue). Script e pagina di confronto: https://claude.ai/artifact/1pJSvHAX8zhod9wsTm26eu
(gli script dei campioni erano nella scratchpad della sessione: il CLI basta,
`python -m route_engine --shape cat --pen-up ...`).
