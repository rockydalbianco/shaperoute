# TASK-232 — Forme inclinate fino a 45°, con la mappa girata

**Stato**: Todo — task file scritto il 2026-10-05; il motore (parte A)
dopo TASK-226, la mappa (parti B e C) dopo TASK-119 B: stessi file
**Fase**: 4 · **Branch**: `feat/TASK-232-a-tilt-45` (A),
`feat/TASK-232-b-turned-map` (B), `feat/TASK-232-c-saved-turn` (C)
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
   qui, con gli stessi due tocchi.
5. I testi nuovi (la bussola per VoiceOver) nelle cinque lingue.

## Parte C — i disegni salvati

1. Le corse salvate e i preferiti tengono la rotazione del percorso
   (API, una migrazione: il numero è il primo libero al merge).
2. «My activities», il «Feed» e il post da condividere (TASK-231)
   mostrano il disegno girato. Le corse di prima restano col nord in alto.
3. Gli esempi di «Explore» si ridisegnano sul server (`draw_examples`,
   `paddle_examples`) dopo il merge della parte A, con l'ok
   dell'utente: il server oggi è fermo su `7098cb9` (`STATUS.md`).

## Criteri di accettazione

- [ ] Test del motore: una forma con un alto e un basso prova fino a
      ±45°, mai oltre; il cerchio gira libero e ha `rotation_deg` 0; a
      parità di strade vince la forma dritta; `rotation_deg` è la
      rotazione del percorso scelto, anche nelle alternative e in acqua.
- [ ] Sui 14 casi disegnabili (`MAPS.md`) la somiglianza non peggiora in
      nessun caso, e il tempo medio sale al più del 25%. Misure in
      `MAPS.md`.
- [ ] L'utente ha giudicato i campioni prima e dopo, con la mappa
      girata: nessun `sì` diventa `no`.
- [ ] L'API restituisce `rotation_deg`; un'app senza il campo funziona
      come prima.
- [ ] L'app gira la mappa di `−rotation_deg` in «Draw», «Explore», nella
      corsa, in «My activities», nel «Feed» e nel post; un percorso senza
      il campo resta col nord in alto.
- [ ] Il GPX non cambia.
- [ ] Test deterministici per ogni parte (`docs/TESTING.md`).

## File toccati

Parte A:

```
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/water_fit.py
services/route-engine/route_engine/models.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_tilt.py                    (nuovo)
services/api/shaperoute_api/schemas.py
services/api/tests/test_rotation.py                         (nuovo)
packages/shared-types/src/index.ts
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
apps/mobile/src/explore/RouteCard.tsx
apps/mobile/src/i18n/                                       (le chiavi nuove)
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-232.md
```

Parte C: da completare all'inizio della parte C, dopo B. Almeno
`services/api/shaperoute_api/activities.py`, `favorites.py`, la
migrazione nuova, `apps/mobile/src/activities/fitLines.ts`,
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

—
