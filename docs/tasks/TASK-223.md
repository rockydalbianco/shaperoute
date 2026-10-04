# TASK-223 — Emoji semplici per il catalogo, e la penna alzata nelle forme

**Stato**: In lavorazione (parte A fatta, aspetta il giudizio dell'utente)
**Fase**: 4 · **Branch**: `feat/TASK-223-simple-emoji`
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

(da scrivere)
