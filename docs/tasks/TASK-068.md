# TASK-068 — Cane: solo la testa, con occhi, naso e bocca

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-068-dog-head` (parte da `main`)

Assegnato dal coordinatore su richiesta dell'utente (2026-09-25), dopo il
giudizio sul cane intero di TASK-064 (`no` a Trento e Levico, `sì` a
Milano): «Per il cane prova anche solo la testa facendo dettagli come bocca
naso e occhi». ADR-0065.

## Obiettivo

Una testa di cane come contorno nuovo, riconoscibile come cane e non come
gatto, con occhi, naso e bocca disegnati; provata sulle strade delle tre
zone e pronta per il giudizio a occhio dell'utente. Se il cane entra nel
catalogo, e come testa o intero, lo decide l'utente con TASK-065.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0039 (tratti ripassati), ADR-0060 (animali
  candidati)
- `docs/tasks/TASK-064.md` (campioni e giudizio del cane intero)
- `route_engine/shapes/outlines/cat.json`, `dog.json`

## Cosa fare

Deciso dall'agente su delega dell'utente (ADR-0065):

1. **Contorno nuovo** `route_engine/shapes/outlines/dog_head.json`: la
   testa vista di fronte, cranio tondo e muso più stretto, con due orecchie
   lunghe che pendono ai lati delle guance, staccate da una tacca a V. Le
   orecchie del gatto puntano in su; quelle del cane pendono in giù, e la
   cima della testa è il cranio, non un orecchio. Simmetrica, dritta
   (ADR-0038).
2. **Dettagli come tratti ripassati** (ADR-0039, ADR-0060): gli occhi, due
   anelli appesi con una linea corta alla tacca fra orecchio e guancia, come
   quelli del gatto; il naso, un anello in mezzo al muso, appeso a una linea
   che sale dal mento; la bocca, due linee corte che partono da quella linea
   sotto il naso, una per lato.
3. **Test** (`tests/test_dog_head_outline.py`, nuovo): si legge e si
   ricampiona; è simmetrica; le orecchie pendono sotto la tacca, fuori dalle
   guance e sopra il mento, e nulla sta più in alto del cranio; gli occhi
   sono anelli appesi alla tacca, sopra il naso; naso e bocca stanno sulla
   linea che sale dal mento. Il contorno è controllato anche da
   `test_outline.py`.
4. **Campioni** a 15 km a Trento, Levico e Milano, come TASK-064: lo stesso
   motore della CLI (`read_outline`, `plan_shape`, `tilt_limit`) con i grafi
   di zona dell'API in memoria, solo zone già in cache, nessun ritaglio su
   C:. Righe in `samples/LOG.md` «in attesa».
5. **Pagina di giudizio** per l'utente: sì / quasi / no per zona e «Copia
   le risposte», con il cane intero di TASK-064 accanto per confronto.

## Criteri di accettazione

- [x] `dog_head.json` valido (`test_outline.py`) e con i test propri
      (`test_dog_head_outline.py`).
- [x] `ruff`, `black --check`, `pytest -m "not network"` puliti in
      `services/route-engine` (512 passati).
- [x] 3 campioni in `samples/`, righe in `samples/LOG.md`.
- [x] Pagina di giudizio pubblicata.
- [x] Giudizio dell'utente in `samples/LOG.md` (dopo la PR, non per il
      merge).

## File toccati

```
services/route-engine/route_engine/shapes/outlines/dog_head.json    (nuovo)
services/route-engine/tests/test_dog_head_outline.py                (nuovo)
samples/TASK-068_dog-head_15km_{trento,levico,milano}_v1.gpx        (nuovi)
samples/LOG.md                                   (righe in più)
docs/tasks/TASK-068.md                           (nuovo)
docs/DECISIONS.md (ADR-0065), docs/STATUS.md     (righe in più)
```

## Fuori scope

- Il catalogo: `shapes/__init__.py`, `packages/shared-types` (ora di
  TASK-060), il prompt dell'AI, `apps/mobile`. È TASK-065, dopo il giudizio.
- `dog.json`, il cane intero: resta com'è.
- `optimizer.py`, `network.py`, `words.py`: nessun parametro del motore
  cambia per far passare la testa.
- Scaricare zone nuove.

## Bozze scartate (2026-09-25)

Otto bozze provate sulle strade prima dei campioni, con lo stesso motore;
confronto a occhio dell'agente, non un giudizio. Non sono nei campioni.

- **Orecchie larghe e corte, dettagli piccoli** (occhi larghi un ottavo
  della testa): a Trento i dettagli si aggrovigliavano e un orecchio spariva; i
  dettagli erano il 41% del percorso.
- **Dettagli più grandi, occhi esagonali; poi a rombo come il gatto**: il
  motore taglia gli anelli all'interno, anche a Milano (0,99), e occhi e
  naso diventavano blocchi o anelli piccoli.
- **Occhi ottagonali, naso arrotondato**: più punti di passaggio sugli
  anelli, anelli più chiusi; ma a Trento l'orecchio destro spariva, perché la
  tacca fra orecchio e guancia era stretta e il percorso la scorciava.
- **Scelta: le stesse, con le orecchie più aperte** (inclinate di 30°, tacca
  a V larga): somiglianza 0,97 · 0,95 · 0,99 contro 0,94 · 0,92 · 0,98, e a
  Milano il cane più leggibile.

## Campioni (2026-09-25)

15 km, partenze di `docs/TESTING.md`, solo zone già in cache. Somiglianza
del motore · distanza reale · tempo. Tutti e 3 hanno un percorso.
Pagina di giudizio: https://claude.ai/artifact/YC6xE283NpvSm4StffaEPr

| | Trento | Levico | Milano |
|---|---|---|---|
| testa (`dog_head`) | 0,97 · 15,6 km · 17 s | 0,95 · 15,4 km · 3 s | 0,99 · 16,4 km · 16 s |
| cane intero (TASK-064) | 0,96 · 15,4 km, `no` | 0,92 · 13,6 km, `no` | 0,99 · 14,0 km, `sì` |

Prima impressione dell'agente, **non un giudizio**: a Milano la testa si
riconosce, orecchie pendenti, occhi e naso come anelli; a Trento si vedono
l'orecchio sinistro e gli occhi, il lato destro è confuso; a Levico la
sagoma è irregolare e i dettagli si leggono poco. Bocca e naso escono più
piccoli del disegno in tutte e tre: a 15 km il motore taglia gli anelli
piccoli all'interno. Il giudizio lo dà l'utente, e va in `samples/LOG.md`.

## Esito

Testa di cane candidata come contorno, con occhi, naso e bocca ripassati,
provata a 15 km nelle tre zone (ADR-0065); pagina di giudizio:
https://claude.ai/artifact/YC6xE283NpvSm4StffaEPr.
Giudizio dell'utente (2026-09-25, `samples/LOG.md`): «Testa di cane:
Trento sì, Levico sì, Milano sì».

| | Trento | Levico | Milano |
|---|---|---|---|
| testa (`dog_head`) | sì | sì | sì |
| cane intero (TASK-064) | no | no | sì |

La testa si riconosce in tutte e tre le zone, il cane intero solo a
Milano. La prima impressione dell'agente era più severa a Trento e a
Levico. Se il cane entra nel catalogo, e come testa o intero, lo decide
l'utente con TASK-065.
