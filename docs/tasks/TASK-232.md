# TASK-232 — Forme inclinate fino a 45°, con la mappa girata

**Stato**: In lavorazione — parte A (motore e API) in `main` dalla #356
(`799071a`) e sul server; parte B (la mappa girata in «Draw» e in corsa,
la freccia del nord) in `main` dalla #378 (`44f17c8`); parte B2
(«Explore») in `main` dalla #384 (`b2d7662`); C da fare
**Fase**: 4 · **Branch**: `feat/TASK-232-a-tilt-45` (A),
`feat/TASK-232-b-turned-map` (B), `feat/TASK-232-b2-explore-turned` (B2),
`feat/TASK-232-c-saved-turn` (C)
**ADR**: ADR-0195 (supera in parte ADR-0038: il limite di 15°)

## Obiettivo

Una forma viene meglio quando può seguire le strade anche inclinata. Il
motore la gira fino a 45° se così la segue meglio. L'app gira la mappa
dello stesso angolo, così chi guarda vede il disegno dritto.

## La richiesta dell'utente (2026-10-05)

Alla domanda se la forma si provasse anche inclinata: «io farei che pur di
farlo venire perfetto puoi scegliere tu l'orientamento e girare la mappa
anche fino a 45 gradi».

Oggi (ADR-0038) ogni forma con un alto e un basso resta entro ±15°, e solo
il cerchio gira libero. Il motivo era che l'occhio non riconosce una forma
inclinata su una mappa col nord in alto (TASK-035: 8 dei 10 casi inclinati
di 15° o più erano `no`). Con la mappa girata la forma torna dritta per chi
guarda, e quel motivo cade.

## Le scelte (ADR-0195)

Dall'utente: fino a 45°, e la mappa gira. Il resto è deciso dall'agente su
delega dell'utente:

1. **Fino a ±45° per ogni forma con un alto e un basso**: catalogo,
   emoji, contorni da foto, parole, canoa. Il cerchio resta libero. Le
   parole a blocchi seguono le strade fino a 45° (`GRID_MAX_TILT_DEG`,
   oggi 30°).
2. **A parità vince la forma dritta.** Inclinarla costa come spostare la
   partenza (`OFFSET_FIT_PENALTY`): il 5% di copertura a 45°, in
   proporzione all'angolo, sia nel conto delle strade sia nella scelta
   fra i percorsi tracciati. Così si inclina solo quando segue le strade
   chiaramente meglio. Il valore si tara sui campioni.
3. **Il risultato dice di quanto è girata**: `rotation_deg`, in gradi,
   antiorario come in ADR-0018, fra −180 e 180. Vale 0 per le forme che
   girano libere (il cerchio): lì la mappa non gira. Ogni alternativa
   (TASK-093) ha il suo. È un campo nuovo e facoltativo: l'app di oggi lo
   ignora.
4. **L'app gira la mappa di `−rotation_deg`** (il `bearing` di MapLibre è
   in senso orario) dove mostra il disegno di un percorso. Un percorso
   senza il campo resta col nord in alto.
5. **Il GPX non cambia**: ha le coordinate vere.
6. **La freccia del nord** (scelta dell'utente, 2026-10-05): con la
   mappa girata compare in alto a destra una piccola freccia del nord; un
   tocco rimette il nord in alto, un secondo tocco rigira la mappa come
   il disegno.
7. **Durante la corsa** (scelta dell'utente, 2026-10-05): la mappa resta
   girata come il disegno, e la freccia del corridore gira di
   conseguenza. Chi corre vede la forma dritta come l'ha scelta.

## Contesto da leggere

- `docs/DECISIONS.md`: ADR-0018 (rotazione), ADR-0038 (forme dritte),
  ADR-0195, ADR-0071 (partenze vicine), ADR-0164 (canoa nell'API)
- `docs/ROUTE_ENGINE.md` §5 (la ricerca), `docs/MAPS.md` (i 14 casi
  disegnabili e i tempi)
- `samples/LOG.md` (i giudizi di TASK-035 e TASK-036)
- Per B e C: `docs/UI.md` «Draw», «Explore», «My activities», «Feed»

## Parte A — il motore e l'API

Dopo TASK-226 («App per il padel», che lavora su `water_fit.py` e sui
pezzi). `optimizer.py` e `nearby_starts.py` sono liberi: TASK-190 è
chiusa nel codice (il coordinatore, 2026-10-05).

1. `optimizer.py`: `MAX_TILT_DEG` 45, `GRID_MAX_TILT_DEG` 45, la
   penalità d'inclinazione (punto 2). Le rotazioni provate vanno da −45°
   a +45° ogni 15°: 7 per partenza e fase invece di 3. Contare le strade
   costa poco; il numero di tracciati (`MAX_TRACES`) non cambia.
2. `water_fit.py`: lo stesso limite. Oggi prova ogni 5° (7 angoli); a
   45° sarebbero 19: se il tempo sale troppo, un passo più largo con una
   rifinitura, come sulle strade.
3. `models.py`: `RouteResult.rotation_deg`, riempito da `plan_shape` e
   dalla canoa, anche nelle alternative.
4. L'API lo restituisce (`schemas.py`, `packages/shared-types`).
5. `engine.zip` del telefono rifatto (TASK-214):
   `python tools/phone_engine/phone_engine.py engine`. Se cambiano le
   forme sull'acqua, anche `apps/mobile/src/paddle/paddleExamples.json`.
6. **I campioni** (ADR-0036): cambiano i percorsi di oggi, quindi si
   rifanno quelli giudicati in TASK-035 e TASK-036, con le immagini
   girate come le mostrerà l'app. L'utente li guarda prima e dopo, e li
   giudica (`samples/LOG.md`).
7. **Le impronte fissate dei test** che cambiano si rifanno, e la PR dice
   quali e perché (una forma ora inclinata, un'altra partenza).

## Parte B — la mappa girata nell'app

1. `MapView` e `mapPage`: un `bearing` che inquadra il percorso girato,
   e la freccia del nord (scelta 6).
2. «Draw»: la mappa gira col percorso scelto, anche passando da
   un'alternativa all'altra.
3. «Explore»: le carte girate come il loro percorso.
4. La corsa su un percorso (scelta 7): la mappa resta girata come il
   disegno. La freccia di direzione del corridore (TASK-164) segna
   sempre dove va davvero: sullo schermo gira di `heading +
   rotation_deg`. Il percorso fatto (giallo pieno) e quello da fare
   (tratteggiato che lampeggia, TASK-224) sono linee della mappa:
   girano con lei e restano come oggi. La freccia del nord c'è anche
   qui, con gli stessi due tocchi. Confermato dall'utente il
   2026-10-05 («sì va bene»).
5. I testi nuovi (la bussola per VoiceOver) nelle cinque lingue.

**In due passi** (deciso all'inizio della parte B, 2026-10-05): la parte B
fa i punti 1, 2, 4 e 5; il punto 3 è la **parte B2**. Un esempio di
«Explore» non porta `rotation_deg` fino alla mappa
(`RecommendedRouteDetail` non ce l'ha: va aggiunto in `exampleRoutes.ts`,
`recommendedRoutes.ts`, `explored.ts`, anche negli esempi tenuti sul
telefono), e le sue schede disegnano la linea sopra le foto-mappa del
«Feed» (`feedMapPage.ts`, `FeedMaps.tsx`), che vanno girate allo stesso
modo: sono file e prove diversi da quelli della mappa, e le foto girate
servono anche alla parte C.

## Parte C — i disegni salvati

1. Le corse salvate e i preferiti tengono la rotazione del percorso
   (API, una migrazione: il numero è il primo libero al merge).
2. «My activities», il «Feed» e il post da condividere (TASK-231)
   mostrano il disegno girato. Le corse di prima restano col nord in alto.
3. Gli esempi di «Explore» si ridisegnano sul server (`draw_examples`,
   `paddle_examples`) dopo il merge della parte A, con l'ok
   dell'utente: il server oggi è fermo su `7098cb9` (`STATUS.md`).
4. **Il catalogo dell'API dice l'inclinazione** (seguito della B2, messo
   qui dal coordinatore il 2026-10-06): `rotation_deg` in
   `GET /recommended-routes` e `/recommended-routes/{id}`
   (`recommended.py` e i file delle città). L'app lo legge già
   (`RecommendedRoute`, `RecommendedRouteDetail`): scheda e mappa girano
   da sole appena il campo arriva.
5. **Gli esempi sull'acqua che arrivano con l'app** (seguito della B2):
   `paddle_examples.py` scrive `rotation_deg`, e
   `apps/mobile/src/paddle/paddleExamples.json` si rifà.

## Criteri di accettazione

- [x] Test del motore: una forma con un alto e un basso prova fino a
      ±45°, mai oltre; il cerchio gira libero e ha `rotation_deg` 0; a
      parità di strade vince la forma dritta; `rotation_deg` è la
      rotazione del percorso scelto, anche nelle alternative e in acqua.
- [x] Sui 14 casi disegnabili (`MAPS.md`) la somiglianza non peggiora in
      nessun caso, e il tempo medio sale al più del 25%. Misure in
      `MAPS.md`.
- [x] L'utente ha giudicato i campioni prima e dopo, con la mappa
      girata: nessun `sì` diventa `no`.
- [x] L'API restituisce `rotation_deg`; un'app senza il campo funziona
      come prima.
- [ ] L'app gira la mappa di `−rotation_deg` in «Draw», «Explore», nella
      corsa, in «My activities», nel «Feed» e nel post; un percorso senza
      il campo resta col nord in alto. (Fatti «Draw», la corsa e
      «Explore»: parti B e B2; il resto è la parte C.)
- [x] Il GPX non cambia.
- [ ] Test deterministici per ogni parte (`docs/TESTING.md`).

## File toccati

Parte A:

```
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/water_fit.py
services/route-engine/route_engine/models.py
services/route-engine/route_engine/__main__.py
services/route-engine/route_engine/nearby_starts.py         (una riga; ok del coordinatore)
services/route-engine/route_engine/paddling.py              (una riga, dopo TASK-238 A; ok del coordinatore)
services/route-engine/tests/test_tilt.py                    (nuovo)
services/route-engine/tests/measure_tilt.py                 (nuovo)
services/route-engine/tests/test_street_grid.py             (le parole squadrate fino a 45°)
services/route-engine/tests/test_contract.py, test_better_distance.py   (il campo nuovo, sole aggiunte)
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/route_store.py                  (rotation_deg e better_distance_m; ok del coordinatore)
services/api/tests/test_rotation.py                         (nuovo)
services/api/tests/test_contract.py, test_better_distance.py            (il campo nuovo, sole aggiunte)
packages/shared-types/src/index.ts
packages/shared-types/test/contract.test.ts                 (il campo nuovo)
packages/shared-types/fixtures/route-result-tilted.json      (nuovo)
tools/preview_turned.py, tools/test_preview_turned.py       (nuovi: i campioni con la mappa girata)
services/route-engine/tests/                                (le impronte fissate che cambiano, elencate nella PR)
apps/mobile/assets/engine/engine.zip
apps/mobile/src/paddle/paddleExamples.json                  (se cambiano le forme sull'acqua)
samples/LOG.md
samples/TASK-232_*                                          (nuovi)
docs/ROUTE_ENGINE.md
docs/API.md
docs/MAPS.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-232.md
```

Parte B:

```
apps/mobile/App.tsx
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/messages.ts
apps/mobile/src/map/turnedMap.ts                            (nuovo)
apps/mobile/src/map/turnedMap.test.ts                       (nuovo)
apps/mobile/src/map/NorthArrow.tsx, NorthArrow.test.tsx     (nuovi: la freccia del nord)
apps/mobile/src/map/mapPageTurn.test.ts, MapViewTurn.test.tsx   (nuovi)
apps/mobile/__tests__/AppTurnedMap.test.tsx                 (nuovo)
apps/mobile/src/screens/MapScreen.tsx                       (il posto della freccia; libero, detto al coordinatore)
apps/mobile/src/paddle/useMoveShape.ts                      (la forma lasciata tiene la sua inclinazione; libero)
apps/mobile/src/i18n/de.ts, es.ts, fr.ts, it.ts             (le chiavi nuove)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-232.md
```

Parte B2 (confermati dal coordinatore alla partenza, 2026-10-06; i file
nuovi e la voce in `DECISIONS.md` aggiunti qui):

```
apps/mobile/App.tsx                                         (la rotazione di un esempio aperto e della sua corsa)
apps/mobile/src/explore/recommendedRoutes.ts, exampleRoutes.ts, explored.ts
apps/mobile/src/explore/RouteCard.tsx                       (la linea e la foto-mappa girate)
apps/mobile/src/explore/CityExamples.tsx, NearbyTowns.tsx, ExploreScreen.tsx   (passano la rotazione alla scheda)
apps/mobile/src/paddle/PaddleExplore.tsx                    (lo stesso, se un esempio sull'acqua è inclinato)
apps/mobile/src/feed/feedMapPage.ts, FeedMaps.tsx           (la foto-mappa con un `bearing`)
apps/mobile/src/feed/turnedLine.ts, turnedLine.test.ts      (nuovi: la linea girata per una scheda)
apps/mobile/src/feed/feedMapPageTurn.test.ts, FeedMapsTurn.test.tsx   (nuovi)
apps/mobile/src/explore/RouteCardTurn.test.tsx, exampleRoutesTurn.test.ts, exploredTurn.test.ts   (nuovi)
apps/mobile/__tests__/AppExploreTurned.test.tsx             (nuovo)
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-232.md
```

Parte C: da completare all'inizio della parte C, dopo B. Almeno
`services/api/shaperoute_api/activities.py` (oggi di TASK-247, e lo vuole
anche TASK-251 B: la fila la fa il coordinatore), `favorites.py`,
`recommended.py`, `paddle_examples.py`,
`apps/mobile/src/paddle/paddleExamples.json`, la migrazione nuova (la
prima libera al merge: `0018` al 2026-10-06), `apps/mobile/src/activities/fitLines.ts`,
`RunDrawing.tsx`, `apps/mobile/src/feed/FeedMaps.tsx`, `feedMapPage.ts`,
`apps/mobile/src/share/PostImage.tsx`.

## Fuori scope

- La distanza consigliata quando la forma riesce ma verrebbe meglio a
  un'altra distanza: è un'altra richiesta, ancora da decidere con
  l'utente.
- Girare le forme oltre 45°.
- Cambiare come la mappa segue il corridore durante una corsa senza
  percorso.

## Esito

**Parte A, motore e API** (2026-10-05, in `main` dalla #356, `799071a`, ADR-0195 «Parte A»):

- **Prima dritta, poi inclinata**: la ricerca di sempre entro ±15°; solo
  se non dà un percorso buono, le rotazioni oltre 15° fino a 45° con 10
  tracciamenti in più. La ricerca lontana resta dritta, e vicino o lontano
  si decide sulla ricerca dritta. Il costo dell'inclinazione conta i gradi
  oltre 15° (5% a 45°). Provare tutte le rotazioni insieme, come diceva il
  punto 1 della parte A, è stato misurato e scartato (`MAPS.md`, «Forme
  inclinate»).
- **Le misure** (129 percorsi, `tests/measure_tilt.py`): 110 identici, i
  12 di riferimento tutti; 19 cambiano, tutti inclinati di 20–45°, 14 con
  la somiglianza più alta; i buoni da 65 a 67; tempo medio +10%, sui 12 di
  riferimento +6%. Criteri: la somiglianza dei 14 disegnabili non
  peggiora (i 12 in cache identici; la Valsugana non è in cache), il
  tempo sale meno del 25%.
- **Sull'acqua** lo stesso schema (`water_fit.py`): i 32 esempi della
  canoa identici, `paddleExamples.json` cambia solo l'impronta del motore.
- **`rotation_deg`** nel risultato, nelle alternative, dalle partenze
  vicine e in canoa; nell'API e in `shared-types`, facoltativo. Il GPX non
  cambia.
- **Seguito di TASK-234**, assegnato dal coordinatore: `route_store.result_from`
  rilegge anche `better_distance_m`, che si perdeva (e con lui «Try N km»
  a ogni richiesta ripetuta), con il suo test in `test_rotation.py`.
- **Le impronte fissate** che cambiano: in `test_kept_per_graph.py` il
  cuore di Levico da 2 km (le sue alternative ora inclinate), il «CIAO»
  della città finta (anche a penna alzata), le alternative di cuore e
  stella; in `test_pen_up.py` «IO» e «LO» di Levico (l'IO inclinato di
  −30°; l'LO resta a +10° ma la ricerca prova di più, e l'avviso conta i
  tentativi). Tutti casi dove la forma non era buona.
- **I campioni**: `samples/TASK-232_*` (19 casi, v1 prima col nord in
  alto, v2 dopo con la mappa girata), `samples/TASK-232_rotations.json`,
  la pagina con `python tools/preview_turned.py "samples/TASK-232_*.gpx"`.
  **Giudicati dall'utente** il 2026-10-05, sui percorsi nuovi con la mappa
  girata: 17 `sì`, `quasi` l'albero di Natale di Levico da 5 km e il sole
  di Levico da 5 km; nessun `no` (`samples/LOG.md`).
- Dopo il merge: il server e `draw_examples` li fa il coordinatore
  (l'utente ha dato l'ok il 2026-10-05: «ok server per le forme
  inclinate»); poi le parti B e C, in un contesto pulito, dopo aver
  sentito il coordinatore (`src/map/*` e la navigazione li tocca anche
  TASK-182 B).

**Parte B, la mappa girata in «Draw» e in corsa** (2026-10-05, in `main`
dalla #378, `44f17c8`, il 2026-10-06; ADR-0195 «Parte B»):

- **Confermati dall'utente** il 2026-10-06, sulle tre schermate del
  simulatore («confermo»): la freccia del nord a destra sotto la riga del
  «←» (non nell'angolo, che è già occupato), il suo aspetto, e i tre testi
  di VoiceOver nelle cinque lingue.

- **La mappa**: `showRoute` porta il `bearing` (`−rotation_deg`,
  `turnedMap.bearingOf`) e la pagina inquadra il percorso girato; lo tiene
  mentre segue il corridore e lo ripete a ogni sua mossa. Un percorso
  senza il campo, o con 0, manda il messaggio di prima.
- **La freccia del nord** (`NorthArrow.tsx`): un tondo a destra sotto la
  riga del «←» (in corsa sotto il riquadro della svolta), con una punta e
  una «N» girate dov'è il nord. Un tocco: nord in alto; un secondo: come il
  disegno. La pagina dice all'app di quanto è girata la mappa (`turned`),
  anche con due dita: la freccia compare per ogni mappa girata.
- **Dove gira**: il percorso disegnato in «Draw» (ogni tessera la sua
  inclinazione), la sua corsa e la sua fine; la forma lasciata altrove con
  «Move the shape» resta girata durante l'attesa.
- **«Move the shape» a mappa girata**: lo spostamento è già quello del
  dito sullo schermo (`map.unproject`); un test lo copre con la mappa a
  90°, e la pagina vera lo conferma (100 px a destra a 90° = solo sud).
- **Testi nuovi**, nelle cinque lingue, per VoiceOver: «North arrow»,
  «Turns the map north up», «Turns the map like the drawing».
- **Visto**: la pagina vera con MapLibre nel browser (cuore inclinato di
  30° dritto, i due tocchi, la corsa girata, lo spostamento), e l'app nel
  simulatore con l'API del worktree (pesce da 5 km a Trento, inclinato:
  `out/task-232b/`, tre schermate). Non provato con un dito vero né con
  una corsa vera.
- **Non fatto qui**: «Explore» (parte B2) e i disegni salvati (parte C).
  In corsa la freccia sta sotto la riga «2% drawn», non accanto.
- **Da dove riprende la B2** (ok del coordinatore, 2026-10-05; i file
  sono in «File toccati», tutti liberi; `feedMapPage.ts` e `FeedMaps.tsx`
  restano di questo task fino alla C): portare `rotation_deg` in
  `RecommendedRouteDetail` e `RecommendedRoute` (`asRecommended`,
  `movedExample`, gli esempi tenuti sul telefono, `toResult` di
  `explored.ts`), passarlo a `useTurnedMap` in `App.tsx` per `exploring` e
  per `exploreRun`, girare la linea delle schede e dare un `bearing` alla
  foto-mappa. La pubblicazione dell'app la fa il coordinatore.

**Parte B2, «Explore» con la mappa girata** (2026-10-06, sola app, in
`main` dalla #384, `b2d7662`; ADR-0195 «Parte B2»):

- **L'esempio aperto**: un esempio che il motore ha inclinato si apre con
  la mappa girata e la freccia del nord; ogni tessera «A · B · C» la sua
  inclinazione; la mappa resta girata mentre lo si corre e a fine corsa.
  Spostato con «Move the shape», prende l'inclinazione del percorso nuovo.
- **Le schede**: la linea girata attorno al suo centro (`turnedLine`) e la
  foto-mappa presa con lo stesso `bearing`; in «Explore» (le città, i
  paesi vicini, i percorsi dell'elenco) e in «Explore» sull'acqua.
- **Chi lo dice**: gli esempi disegnati per un posto, che passano da
  `POST /routes` (il server ha la parte A). L'inclinazione sta
  nell'esempio e nel file del telefono, solo quando non è 0.
- **Chi non lo dice resta col nord in alto**, come prima: i percorsi del
  catalogo dell'API (`/recommended-routes` non ha il campo), gli esempi
  tenuti sul telefono da prima (non si ridisegnano apposta), gli esempi
  sull'acqua che arrivano con l'app (`paddleExamples.json` non ha il
  campo), i preferiti e i disegni del «Feed» (parte C).
- **Visto**: la pagina vera delle foto-mappa nel browser, con quattro
  campioni inclinati (`samples/TASK-232_*`: stella e fantasmino di Levico,
  ciambella e gatto di Trento), ciascuno col nord in alto e girato: la
  linea girata sta sulle strade della foto girata, la forma è dritta, i
  nomi dei paesi restano dritti.
- **Visto nel simulatore** (2026-10-06, iPhone 17e con Expo Go dal
  worktree e l'API del worktree sul Mac; schermate in `out/task-232b2/`).
  A Levico Terme, dal punto che la ricerca dà all'app, la luna esce
  inclinata di 30° (la stella, che dal punto dei campioni esce a 30°, qui
  esce dritta: bastano 3 m di partenza in più): la sua scheda è girata; la
  luna si apre con la mappa girata e la freccia del nord; un tocco rimette
  il nord in alto, il secondo rigira; la tessera B, dritta, rimette il nord
  in alto; «Start» tiene la mappa girata in corsa e dopo lo «Stop». Sul
  Lago di Levico un esempio spostato con «Move the shape» si ridisegna e la
  mappa prende l'inclinazione del percorso nuovo (piccola, 5°); spostato di
  nuovo con la mappa girata con due dita, la forma segue il dito. Non
  provato sul telefono.
- **Visto, non di questo passo**: appena aperto un esempio la mappa lo
  inquadra come se fosse alta tutto lo schermo, e la metà bassa del
  percorso resta sotto la scheda finché non si tocca una tessera; succede
  anche con un esempio dritto (la stella), quindi è di prima della B2. Da
  guardare in un seguito.
- **Due seguiti, ora punti 4 e 5 della parte C** (deciso dal
  coordinatore, 2026-10-06): `rotation_deg` nel catalogo dell'API
  (`recommended.py` e i file delle città) e in `paddle_examples.py` con
  `paddleExamples.json` rifatto. Il catalogo è
  di prima della parte A (percorsi entro ±15°), e gli esempi sull'acqua
  dell'app sono usciti identici dalla parte A: non controllato oltre.
- **Da dove riprende la C**: `useFeedMap(…, bearing)` e
  `turnedLine(line, bearing)` sono pronti per `FeedPost.tsx`,
  `RunDrawing.tsx` e `PostImage.tsx`; manca che le corse salvate e i
  preferiti tengano `rotation_deg` (API, una migrazione).
