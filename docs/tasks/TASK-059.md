# TASK-059 — Alfabeto completo: dalla A alla Z, a tratto singolo

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-059-full-alphabet` (parte da `main`)

Assegnato dal coordinatore su richiesta dell'utente (2026-09-25): «sì fai
tutte le lettere dell'alfabeto». ADR-0056.

## Obiettivo

Il motore scrive ogni parola fatta delle 26 lettere dalla A alla Z, non
solo con C, I, A, O, e l'API e `shared-types` lo dicono.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0044 (alfabeto a tratto singolo), ADR-0051 (la
  parola nell'API)
- `docs/ROUTE_ENGINE.md` §2, «Parole lettera per lettera»
- `services/route-engine/route_engine/words.py`, `letters.json`
- `samples/LOG.md`, righe TASK-050

## Cosa fare

Deciso dall'agente su delega dell'utente:

1. **Le 22 lettere che mancano** in `letters.json`, nello stile di C, I, A,
   O (che non cambiano): alte 1, larghe 0,5–0,65 (M e W 0,8), curve con un
   punto ogni 20° come la C e la O. Ognuna entra dal punto più a sinistra
   che ha sulla base ed esce da quello più a destra; il ritorno passa per i
   tratti della lettera e disegna la base solo dove la lettera ce l'ha (B,
   D, Z): H, K, M, N, R, W, X restano aperte sotto, come la A.
2. **E ed L con il tratto in basso staccato dalla base** (a 0,2
   dell'altezza): sulla base si confonde con la linea che unisce le
   lettere, e a metà parola la E diventa una F e la L una I.
3. **`words.py`**: solo il messaggio per una lettera che l'alfabeto non ha,
   che dice «A to Z» invece di elencarle tutte.
4. **Test** (`tests/test_words.py`): le 26 lettere, ognuna un tratto solo
   che entra ed esce sulla base, dal suo punto più a sinistra e più a
   destra; la base disegnata solo da B, D, Z; ogni lettera in una parola.
5. **Contratto**: `LETTERS` in `shared-types` e `contract.json` con le 26
   lettere; la descrizione di `word` in `schemas.py`.
6. **Campioni** a 15 km a Trento, Levico e Milano: una parola lunga
   («BELLO») e due con le lettere difficili («KIWI», «MAX»), e
   un'anteprima dell'alfabeto per il giudizio dell'utente.

## Criteri di accettazione

- [x] `letters.json` ha le 26 lettere dalla A alla Z; A, C, I, O come prima.
- [x] Ogni lettera è un tratto solo che entra ed esce sulla base (test).
- [x] La base fra i piedi non è disegnata da H, K, M, N, R, W, X (test).
- [x] Una parola con tutte le lettere si compone, con ogni lato di al più
      1/16 dell'altezza (test).
- [x] `LETTERS` in `shared-types` e `contract.json` sono le 26 lettere, e i
      test del contratto sono verdi sui due lati.
- [x] `ruff`, `black`, `pytest -m "not network"` puliti in route-engine e
      api; `npm test` in `packages/shared-types`.
- [x] Campioni nelle tre zone e anteprima.
- [x] Giudizio dell'utente sui campioni, prima del merge.

## File toccati

```
services/route-engine/route_engine/letters.json
services/route-engine/route_engine/words.py             (messaggio)
services/route-engine/tests/test_words.py
services/api/shaperoute_api/schemas.py                  (descrizione di word)
services/api/tests/test_routes.py                       (il messaggio: E, N ora ci sono)
packages/shared-types/src/index.ts, fixtures/contract.json
samples/TASK-059_*.gpx, samples/LOG.md
docs/tasks/TASK-059.md, docs/ROUTE_ENGINE.md, docs/API.md
docs/DECISIONS.md (ADR-0056), docs/STATUS.md
```

## Fuori scope

- `network.py`, `directions.py`, `sidewalks.py` (TASK-053) e `apps/mobile`
  (TASK-049): di altre sessioni.
- Cifre, lettere accentate, minuscole, spazi.
- La distanza minima per lettera (`models.py`, 3 km, ADR-0051): è stata
  misurata su «CIAO».
- Rendere più veloce il motore sulle parole.

## Esito

Il motore scrive con tutte le lettere dalla A alla Z, e l'API e
`shared-types` le accettano (ADR-0056). A 15 km «BELLO», «KIWI» e «MAX»
hanno somiglianza delle lettere 0,74–0,95 e lettere alte 493–727 m, in
15–258 s (`samples/LOG.md`); anteprima per l'utente:
https://claude.ai/artifact/TLjtgKASQL5agjrCDwesvf. Giudizio dell'utente
(2026-09-25): «MAX» `sì` nelle tre zone; «BELLO» e «KIWI» `sì` a Milano,
`quasi` a Levico, `no` a Trento. «Le lettere nuove vanno bene, E e L sì
staccale dalla base, e no non serve il pezzo base per I e F»: la E e la L
sulla base diventavano F e I (alzate a 0,2), e la I o la F in prima
posizione, che si leggono L ed E, restano così. Annotati in ADR-0056 e
rimandati: la distanza minima per lettera misurata su «CIAO», e i tempi di
«BELLO» (255–258 s) vicini ai 5 minuti che l'app aspetta.

Indicazione dell'utente per il seguito, **TASK-067** (ADR-0063, dopo il
merge di TASK-063, che ha `optimizer.py`): «Se serve, il collegamento con
l'altra lettera può essere anche non dal basso: se questo non confonde o
serve per migliorare, anche connetterle dalla cima. Poi anche con scale
diverse le lettere possono essere, basta che non varino troppo da quelle
vicine.» Cioè unioni fra le lettere anche dalla cima, e una scala per
lettera con un limite sulla differenza dalle vicine.
