# TASK-234 — «Viene meglio a 12 km»: la distanza dove la forma riesce meglio

**Stato**: In corso — parte A (motore e API) in `main` dalla #327
(784cc03, 2026-10-05); parte B (app) in PR, i testi da confermare
**Fase**: 4 · **Branch**: `feat/TASK-234-better-distance` (A),
`feat/TASK-234-better-distance-app` (B)
**ADR**: ADR-0197 (estende ADR-0041)

## Obiettivo

Quando un percorso riesce, ma a un'altra distanza la forma verrebbe
chiaramente meglio, l'app lo dice e offre di provare: «Questo cuore viene
meglio a circa 12 km», con il bottone «Prova 12 km».

## La richiesta dell'utente (2026-10-05)

«E che ti consiglia anche la distanza corretta per far venire al meglio
quella forma. Del tipo te cerchi un cuore da 15 km ma se con 12 viene
meglio te lo dice.»

Oggi c'è soltanto metà di questo (ADR-0041, TASK-031): quando il motore
*rifiuta*, perché il percorso migliore segue la forma ma è a più di 2 km
dalla distanza chiesta, l'API manda `suggested_distance_m` e l'app scrive
«It fits at about N km» con «Try N km». Se invece il cuore da 15 km
riesce, anche seguito male, nessuno dice che a 12 km verrebbe meglio.

Fra due proposte l'utente ha scelto di partire dal **passo 1**: usare i
tentativi che la ricerca ha già tracciato, senza calcoli e senza attese in
più. Il passo 2 (cercare apposta 2–3 distanze vicine, 5–50 s di server
l'una) è fuori da questo task: si valuta dopo, se il passo 1 scatta poco.

## Le scelte (ADR-0197)

Dall'utente: il passo 1, e una riga con «Prova» sotto il percorso. Il
resto è deciso dall'agente su delega dell'utente:

1. **Da dove**: dai tentativi della ricerca che ha dato il percorso
   (`Search.attempts`, anche quella lontana di ADR-0040). Ogni tentativo
   ha già la sua somiglianza e la sua lunghezza: nessun tracciato in più.
2. **Quando un tentativo è «chiaramente meglio»**: il suo costo senza la
   parte della distanza (forma, strade ripassate, partenza spostata) è
   più basso di quello del percorso scelto di almeno `W_SHAPE × 0,05`
   (cinque punti di somiglianza), e la sua somiglianza è almeno
   `SIMILARITY_THRESHOLD` (0,90). Così non si consiglia un percorso con
   un baffo ripassato o lontano dalla partenza. Questi sono i valori di
   partenza: la soglia vera si decide misurando (punto 7) e si scrive in
   ADR-0197.
3. **Quale distanza**: quella del tentativo, arrotondata al km come
   `suggested_distance_m` e dentro i limiti della richiesta per
   l'attività (bici 10–30 km). Se arrotondata è uguale alla distanza
   chiesta, niente. Fra più tentativi, quello col costo più basso; a
   parità, il più vicino alla distanza chiesta.
4. **Il percorso non cambia**: il motore sceglie esattamente come oggi.
   Il consiglio è solo un campo in più.
5. **Il campo**: `better_distance_m` (metri, intero) nel risultato e
   nella risposta dell'API, `null` quando non c'è un consiglio. Vale per
   la richiesta, non per le alternative (TASK-093). È nuovo e
   facoltativo: l'app di oggi lo ignora.
6. **Nell'app**, sotto il percorso: «This heart comes out better at about
   12 km.» e il bottone «Try 12 km», che scrive la distanza e ridisegna
   (lo stesso `onTryDistance` di ADR-0041). Anche per una parola («This
   word…») e un contorno da foto («This outline…»). Nelle cinque lingue
   (ADR-0172), da far confermare all'utente. Solo dentro le distanze che
   «Draw» offre per quell'attività. Dopo un «Try», se il nuovo percorso
   consigliasse di tornare alla distanza di prima, la riga non compare:
   niente avanti e indietro.
7. **Misura prima di tutto**: sui 14 casi disegnabili (`MAPS.md`) e sui
   campioni giudicati, quante volte scatta e con quali distanze. Se
   scatta quasi mai, lo si scrive in `MAPS.md` e lo si dice all'utente
   prima dell'app: forse serve il passo 2.
8. **La canoa è fuori**: sull'acqua `water_fit` sceglie già la forma più
   grande che ci sta, e quando non ci sta c'è la distanza suggerita
   (ADR-0164).

## Contesto da leggere

- `docs/DECISIONS.md`: ADR-0041 (la distanza quando la forma non ci sta),
  ADR-0040 (la ricerca lontana), ADR-0087 (le alternative, TASK-093),
  ADR-0172 (le lingue), ADR-0197
- `docs/ROUTE_ENGINE.md` §5 (la ricerca e il costo)
- `docs/API.md` «Errori» (`suggested_distance_m`), `docs/MAPS.md`
- `docs/UI.md` «Draw»

## Cosa fare

Dopo il merge della #310 (TASK-226 A, che tocca `models.py`).
`optimizer.py` è libero. `RoutePanel.tsx` lo tocca anche TASK-226 B
(`penUpShapes`, pochi punti): chi entra secondo si aggiorna (il
coordinatore, 2026-10-05).

1. Motore (`optimizer.py`, `models.py`): calcolare il consiglio dai
   tentativi in `plan_shape` e metterlo in `RouteResult`.
2. API (`schemas.py`, l'arrotondamento di `errors.py`): `better_distance_m`
   nella risposta, solo come aggiunta al contratto come
   `suggested_distance_m`, con un test del contratto che l'app di oggi
   lo ignora; `packages/shared-types`; `docs/API.md`.
3. `engine.zip` del telefono rifatto (TASK-214):
   `python tools/phone_engine/phone_engine.py engine`; se servisse,
   anche `apps/mobile/src/paddle/paddleExamples.json`. Sul server,
   `draw_examples` dopo il merge, con l'ok dell'utente.
4. Le misure del punto 7 in `MAPS.md`.
5. App: la riga e il bottone sotto il percorso (`betterDistance.ts`, file
   nuovo, e `RoutePanel.tsx`), i testi con `t()` nelle cinque lingue, da
   confermare con l'utente, `docs/UI.md`.

## Criteri di accettazione

- [x] Test del motore: con tentativi finti, il consiglio c'è quando uno è
      chiaramente meglio a un'altra distanza, e manca quando è meglio di
      poco, quando la somiglianza è sotto 0,90, quando arrotondato al km
      è la distanza chiesta o è fuori dai limiti dell'attività.
- [x] Il percorso scelto è identico a prima su tutti i test e sui 14 casi
      (`MAPS.md`): stesse impronte fissate.
- [x] L'API restituisce `better_distance_m`; senza consiglio è `null`; i
      client di oggi non si rompono.
- [x] Le misure del punto 7 sono in `MAPS.md`.
- [x] L'app mostra la riga e «Try N km» solo col campo e dentro le
      distanze di «Draw»; «Try» ridisegna a quella distanza; niente riga
      che rimanda alla distanza di prima.
- [ ] I testi nelle cinque lingue; l'utente li ha visti.
- [x] Test deterministici per motore, API e app (`docs/TESTING.md`):
      motore e API nella parte A, app nella B.

## File toccati

```
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/models.py
services/route-engine/route_engine/nearby_starts.py         (ok del coordinatore)
services/route-engine/tests/test_better_distance.py         (nuovo)
services/route-engine/tests/measure_better.py               (nuovo)
services/route-engine/tests/test_contract.py                (il campo nuovo)
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/errors.py
services/api/tests/test_better_distance.py                  (nuovo)
services/api/tests/test_contract.py                         (il campo nuovo)
packages/shared-types/src/index.ts
packages/shared-types/test/contract.test.ts                 (il campo nuovo)
packages/shared-types/fixtures/route-result-better-distance.json (nuovo)
apps/mobile/assets/engine/engine.zip
apps/mobile/src/paddle/paddleExamples.json                  (se servisse)
apps/mobile/src/route/betterDistance.ts                     (nuovo)
apps/mobile/src/route/betterDistance.test.ts                (nuovo)
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RoutePanel.test.tsx
apps/mobile/App.tsx
apps/mobile/src/i18n/it.ts
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
docs/API.md
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-234.md
```

## Fuori scope

- Il passo 2: cercare apposta altre distanze dopo il primo percorso.
- La canoa (punto 8).
- Gli esempi di «Explore» e i percorsi consigliati: hanno distanze loro.
- Cambiare quale percorso il motore sceglie.

## Esito

**Parte A, motore e API**: in `main` dalla #327 (merge `784cc03`,
2026-10-05):

- `optimizer.better_distance` e `shape_cost`; `RouteResult.better_distance_m`
  da `plan_shape` e da `ShapeJob.here` (`nearby_starts.py`, ok del
  coordinatore: altrimenti il consiglio spariva quando vince una partenza
  vicina); `plan_nearby` lo toglie alle alternative.
- API: `better_distance_m` in `RouteResultBody`, `null` senza consiglio;
  `shared-types` facoltativo; `errors.py` non è servito (l'arrotondamento
  al km sta nel motore). I test di contratto contano il campo come
  `walks` e `on_foot` (fixture di prima = API precedente) e una fixture
  nuova ha tutti i campi.
- Il percorso scelto non cambia: suite del motore verde, impronte fissate
  comprese. `engine.zip` rifatto; `paddleExamples.json` rifatto con
  l'acqua del server copiata in sola lettura (ok del coordinatore): cambia
  solo `"engine"`.
- **Misure (punto 7)** in `MAPS.md`: il consiglio scatta in 8 percorsi su
  129, nessuno dei 12 di riferimento in cache; la soglia resta 5 punti
  (ADR-0197). Da dire all'utente prima della parte B: scatta poco, forse
  serve il passo 2.
- `draw_examples` sul server dopo il merge di A, con l'ok dell'utente:
  lo chiede il coordinatore.

**Le misure all'utente** (2026-10-05): «sì, fai la parte B come
previsto», sapendo che la riga compare in circa il 6% dei percorsi; il
passo 2 resta da valutare dopo.

**Parte B, l'app** (2026-10-05, PR da `feat/TASK-234-better-distance-app`):

- `src/route/betterDistance.ts`: quando offrire la distanza (il campo
  della risposta, dentro le distanze di «Draw», mai sull'acqua né uguale
  a quella chiesta, mai indietro alla distanza che un «Try» ha appena
  lasciato per lo stesso disegno) e i testi con `t()`.
- `RoutePanel.tsx`: la riga sotto le tessere, grigia come un avviso da
  sapere, con «Try N km» (lo stesso `onTryDistance` di ADR-0041); la
  legge dalla scelta del motore, quindi resta con qualunque tessera.
  `App.tsx` non è servito.
- **Testi**, da confermare con l'utente: «This shape / word / outline
  comes out better at about {km} km.» e «Try {km} km», nelle cinque
  lingue. «This shape» e non «This heart»: il nome della forma
  cambierebbe genere in italiano, spagnolo, francese e tedesco.
- Provato nel simulatore con l'API del worktree: cavallo 10 km a Trento,
  la riga «This shape comes out better at about 8 km.» con «Try 8 km», e
  in italiano «Questa forma viene meglio a circa 7 km.» con «Prova 7 km».
- Seguito, non fatto: un segnale per sapere quante volte si tocca il
  «Try» della riga (oggi `hint_taken` dice solo i «Try» degli errori;
  un `hint` nuovo tocca `shared-types` e l'API).
