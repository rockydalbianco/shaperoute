# TASK-064 — Animali candidati: farfalla, uccello, cane, lumaca

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-064-animal-candidates` (parte da `main`)

Assegnato dal coordinatore su richiesta dell'utente (2026-09-25):
«aumenta il numero di forme disponibili», e alla domanda su quali,
«Animali». ADR-0060.

## Obiettivo

Quattro animali nuovi disegnati come contorni, provati sulle strade delle
tre zone e pronti per il giudizio a occhio dell'utente. Nel catalogo entrano
dopo, con TASK-065, solo quelli che l'utente approva (ADR-0036).

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0035 (forme da file), ADR-0036 (catalogo),
  ADR-0039 (tratti ripassati)
- `docs/tasks/TASK-034.md` (candidate provate dalla CLI)
- `route_engine/shapes/outlines/cat.json`, `fish.json` (il formato)

## Cosa fare

Deciso dall'agente su delega dell'utente (ADR-0060):

1. **Quattro contorni nuovi** in `route_engine/shapes/outlines/`, disegnati
   per ShapeRoute, riconoscibili dalla sagoma grande (ADR-0035):
   - `butterfly`: vista dall'alto, ali aperte, le due superiori più grandi
     delle inferiori, con una rientranza profonda fra le due di ogni lato;
     simmetrica; due antenne come tratti ripassati;
   - `bird`: in volo, di profilo, verso destra, con le due ali alzate,
     becco e coda a forbice; solo contorno;
   - `dog`: in piedi, di profilo, verso destra, orecchio alzato; le quattro
     zampe e la coda come tratti ripassati;
   - `snail`: di profilo, verso destra, guscio tondo sul corpo, la spirale
     come tratto ripassato (un giro, appesa al guscio con una linea corta,
     come gli occhi del gatto) e due corna.
2. **Test** (`tests/test_animal_outlines.py`, nuovo): ognuno si legge e si
   ricampiona; la farfalla è simmetrica con due antenne sopra le ali e ha
   quattro ali; l'uccello è solo contorno; il cane ha quattro zampe
   ripassate, staccate, che scendono sotto il corpo, e la coda che sale
   dietro; la spirale della lumaca gira attorno al suo centro e finisce
   verso di lui, le corna salgono dalla testa. Ogni contorno è controllato
   anche da `test_outline.py`.
3. **Campioni** a 15 km a Trento, Levico e Milano, con lo stesso motore
   della CLI (`--outline`: `read_outline`, `plan_shape`, `tilt_limit`), ma
   con i grafi di zona dell'API in memoria: nessun ritaglio salvato in
   `data/cache/` (C: quasi pieno) e nessun download, solo le zone in cache.
   Righe in `samples/LOG.md` «in attesa».
4. **Anteprima** per l'utente, con la domanda: sì / quasi / no per ogni
   animale e zona.

## Criteri di accettazione

- [x] Quattro contorni nuovi, validi (`test_outline.py`) e con i test
      propri (`test_animal_outlines.py`).
- [x] `ruff`, `black --check`, `pytest -m "not network"` puliti in
      `services/route-engine`.
- [x] 12 campioni in `samples/`, righe in `samples/LOG.md`.
- [x] Anteprima e domanda all'utente.
- [x] Giudizio dell'utente in `samples/LOG.md` (dopo la PR, non per il
      merge).

## File toccati

```
services/route-engine/route_engine/shapes/outlines/butterfly.json   (nuovo)
services/route-engine/route_engine/shapes/outlines/bird.json        (nuovo)
services/route-engine/route_engine/shapes/outlines/dog.json         (nuovo)
services/route-engine/route_engine/shapes/outlines/snail.json       (nuovo)
services/route-engine/tests/test_animal_outlines.py                 (nuovo)
samples/TASK-064_*.gpx, samples/LOG.md
docs/tasks/TASK-064.md
docs/DECISIONS.md (ADR-0060), docs/STATUS.md
```

## Fuori scope

- Il catalogo: `shapes/__init__.py`, `packages/shared-types`, il prompt
  dell'AI, `apps/mobile` (`shapeWords.ts`, `ShapeTiles.tsx`). È TASK-065,
  dopo il giudizio.
- `optimizer.py` e `network.py` (TASK-063): nessun parametro del motore
  cambia per far passare un animale.
- Scaricare zone nuove.

## Bozza scartata (2026-09-25)

Una prima bozza è stata provata sulle strade prima dei campioni, e rifatta
(ADR-0060): l'uccello aveva ali strette, che si chiudevano in una macchia;
il cane aveva le quattro zampe nel contorno, che a Trento e Milano si
riducevano a due blocchi o sparivano; la spirale della lumaca faceva un
giro e un quarto, e a Trento e Levico diventava un groviglio. La farfalla è
rimasta com'era. Le bozze non sono nei campioni.

## Campioni (2026-09-25)

15 km, partenze di `docs/TESTING.md`, solo zone già in cache. Somiglianza
del motore · distanza reale · tempo. Tutti e 12 hanno un percorso.
Anteprima per l'utente: https://claude.ai/artifact/L77yrZ9aDWTJRQcAp9hEEb

| Animale | Trento | Levico | Milano |
|---|---|---|---|
| farfalla (`butterfly`) | 0,93 · 14,1 km · 12 s | 0,84 · 15,0 km · 19 s, partenza a 250 m | 0,97 · 15,8 km · 23 s |
| uccello (`bird`) | 0,94 · 14,6 km · 16 s | 0,91 · 14,2 km · 4 s | 1,00 · 14,4 km · 60 s |
| cane (`dog`) | 0,96 · 15,4 km · 13 s | 0,92 · 13,6 km · 5 s | 0,99 · 14,0 km · 41 s |
| lumaca (`snail`) | 0,94 · 13,5 km · 13 s | 0,94 · 15,8 km · 15 s, partenza a 250 m | 1,00 · 15,2 km · 28 s |

Prima impressione dell'agente, **non un giudizio**: la farfalla si
riconosce nelle tre zone, quattro ali e antenne, meglio a Milano; il cane
si intuisce ovunque (testa con l'orecchio, coda, zampe), meglio a Milano;
la lumaca si riconosce a Milano, a Trento si vede la spirale, a Levico no;
l'uccello si intuisce a Milano (due ali alzate), a Trento e Levico no. Il
giudizio lo dà l'utente, e va in `samples/LOG.md`.

## Esito

Quattro animali candidati come contorni, provati a 15 km nelle tre zone
(ADR-0060); anteprima: https://claude.ai/artifact/L77yrZ9aDWTJRQcAp9hEEb.
Giudizio dell'utente (2026-09-25, `samples/LOG.md`):

| Animale | Trento | Levico | Milano |
|---|---|---|---|
| farfalla | quasi | quasi | sì |
| uccello | no | quasi | sì |
| cane | no | no | sì |
| lumaca | sì | no | sì |

Tutti e quattro si riconoscono a Milano; fuori da Milano la farfalla è
`quasi` due volte, l'uccello `quasi` a Levico, la lumaca `sì` a Trento, il
cane mai. La prima impressione dell'agente era più generosa su farfalla e
cane a Trento e Levico, più severa sulla lumaca a Trento e sull'uccello a
Levico. Quali animali entrano nel catalogo lo decide l'utente, con
TASK-065.
