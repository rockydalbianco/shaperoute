# TASK-227 — «Explore» con «Paddle» come la corsa

**Stato**: In corso (PR aperta, aspetta la CI)
**Fase**: 4 · **Branch**: `feat/TASK-227-explore-paddle`
**Dipende da**: TASK-191 C («Explore» con «Paddle», #255), TASK-225
(l'acqua dei quattro luoghi sul server), TASK-176 (le forme in più)

## Obiettivo

Richiesta dell'utente (2026-10-03, nella sessione di TASK-191 C): con
«Paddle», in «Explore», gli stessi esempi della corsa, comprese le forme in
più di TASK-176, non solo cuore, cerchio e stella.

## Scelte dell'utente (2026-10-04)

Due domande, una per volta, ognuna con una proposta:

1. **Le forme**: **tutte e otto quelle della corsa**, nello stesso ordine
   (cerchio, cuore, stella, poi luna, cavallo, lumaca, testa di cane,
   testa di coniglio), anche con gli occhi delle teste ancora attaccati al
   contorno (staccarli è TASK-226). Scartate: sei senza le teste; le tre
   di oggi. Sui campioni veri (sotto) tutte e 32 ci stanno.
2. **Quando si disegnano**: prima «alla prima apertura», corretta subito in
   **«in anticipo»** e poi precisata: **«già scaricati al momento del
   download dell'app»**. I quattro luoghi hanno quindi gli esempi
   **dentro l'app**. Scartata: disegnati in anticipo sul server con
   `draw_examples`.

## Contesto da leggere

- `docs/tasks/TASK-176.md`, ADR-0144 (le forme in più, il cerchio per primo)
- `docs/tasks/TASK-168.md`, ADR-0136 (gli esempi tenuti, `draw_examples`)
- `docs/tasks/TASK-191.md` parte C, ADR-0169 (i quattro luoghi d'acqua)
- `docs/tasks/TASK-225.md` (l'acqua sul server)
- `apps/mobile/src/explore/exampleRoutes.ts`, `src/paddle/PaddleExplore.tsx`

## Cosa fare

1. Campioni veri delle forme della corsa sui quattro luoghi, giudicati
   dall'utente prima di metterli nell'app (ADR-0036).
2. Le otto forme in «Explore» con «Paddle».
3. Gli esempi dei quattro luoghi dentro l'app (scelta 2).

## Criteri di accettazione

- [x] Un luogo scelto mostra le otto forme da 2 km, pronte subito, senza
      chiedere niente all'API e anche senza rete (test).
- [x] «Near me» chiede le otto forme come gli esempi di una città: le
      prime tre, poi le altre (test).
- [x] Gli esempi dentro l'app sono quelli che l'app avrebbe disegnato da
      sé, luogo per luogo (test contro `asRecommended`).
- [x] Con «Run» e «Bike» «Explore» è quello di prima.
- [x] Il motore non cambia; niente server, niente pubblicazione.

## File toccati

- `apps/mobile/src/explore/exampleRoutes.ts` e `.test.ts`
- `apps/mobile/src/paddle/PaddleExplore.tsx` e `.test.tsx`
- `apps/mobile/src/paddle/paddleExamples.json` (nuovo)
- `apps/mobile/src/paddle/paddleExamples.test.ts` (nuovo)
- `apps/mobile/__tests__/AppPaddle.test.tsx`
- `apps/mobile/src/i18n/{it,de,es,fr}.ts` (una frase: le otto forme)
- `services/api/shaperoute_api/paddle_examples.py` (nuovo)
- `services/api/tests/test_paddle_examples.py` (nuovo)
- `docs/tasks/TASK-227.md` (nuovo), `docs/UI.md` (la canoa in «Explore»),
  `docs/DECISIONS.md` (ADR-0189), `docs/STATUS.md` (solo le righe di questo
  task)

## Fuori scope

- Gli occhi staccati delle teste sull'acqua: TASK-226.
- «Best near you», i percorsi a tema, il «Feed» mentre si disegna: la
  richiesta è sugli esempi. Il «Feed» sull'acqua è TASK-228.
- Altri luoghi d'acqua oltre i quattro.

## Esito

### 2026-10-04

**I campioni**: le 13 forme del catalogo da 2 km, dai punti della riva di
oggi, sull'acqua del server copiata sul Mac (i sei file di TASK-225).
**52 su 52 ci stanno**, a 1996–2015 m, in 0,3–7,5 s ciascuna.

- Al mare (Riccione, Jesolo) la forma è al 79% del giro, con tratti dalla
  spiaggia di 208–218 m.
- Sui laghi (Riva, Como) è al 94%, con tratti di 58–67 m dallo scivolo,
  dal molo, dalla spiaggia o da un sentiero.

Le otto della corsa sono in `out/task227-paddle-samples.html` e in due
immagini delle sole forme (`out/task227-paddle/forme-*.png`), fuori dal
repository. L'utente ha scelto tutte e otto.

**Fatto** (ADR-0189):

- `exampleRoutes.ts`:
  - un `ExampleSet` può portare `bundled`, gli esempi già disegnati che
    vengono con l'app: `fromFile` li legge prima del file del telefono,
    quindi sono pronti subito e non si chiedono più;
  - senza API un luogo che ha tutto già disegnato si mostra lo stesso;
  - `PADDLE_EXAMPLES` prende `MORE_SHAPES`, come la corsa.
- `paddleExamples.json` (nuovo, 147 KB dopo Prettier): i 32 esempi dei
  quattro luoghi, nel formato in cui l'app tiene i suoi
  (`asRecommended(...).detail`), con le coordinate a 6 decimali.
- `PaddleExplore.tsx`: le schede con `shownExamples` come `CityExamples`
  (le forme dopo le prime tre compaiono quando arrivano, e una che non ci
  sta non si annuncia). La frase prima della scelta ora parla delle otto
  forme: «Choose a lake or a beach: eight shapes of 2 km on its water, from
  the shore.», con le quattro traduzioni.
- `services/api/shaperoute_api/paddle_examples.py` (nuovo): `python -m
  shaperoute_api.paddle_examples --cache-dir <cache con water/>` disegna i
  32 esempi con il motore, come li disegna l'API (`plan_water`), senza
  scaricare niente, e scrive il JSON. I luoghi li legge da `waterPlaces.ts`.
  Il comando ci mette 22 s.
- Test:
  - `paddleExamples.test.ts` (nuovo): ogni luogo ha le sue otto forme e
    niente altro; ogni esempio è quello che `asRecommended` farebbe dal suo
    percorso; percorsi chiusi, 2 km ±10%, dalla riva entro 2 km dal punto;
  - `exampleRoutes.test.ts`:
    - un luogo d'«Explore» ha otto esempi pronti, senza chiedere e senza
      scrivere il file;
    - senza API si vedono lo stesso;
    - «Near me» chiede le otto nell'ordine della corsa;
  - `PaddleExplore.test.tsx` e `AppPaddle.test.tsx`: le schede pronte e
    nessuna richiesta;
  - API: `test_paddle_examples.py` (5) sulle fixture dell'acqua del motore.

**Rifare il JSON** quando cambiano i luoghi, le forme o il motore, per
esempio con gli occhi staccati di TASK-226: il comando qui sopra, con l'acqua
del server (`scp` di `data/cache/water/`), poi `npx prettier --write` sul
file. Il test dell'app dice se un luogo o una forma mancano.

**Testi da confermare con l'utente**: la frase nuova, nelle cinque lingue.

## Note per il deploy

- Solo l'app: esce con la prossima pubblicazione, che fa il coordinatore.
  Niente server: gli esempi dei quattro luoghi non chiedono niente all'API.
- «Near me» chiede come prima `paddling` all'API. Il server ha l'acqua
  solo dei quattro luoghi; altrove la scarica da Overpass, se risponde.
