# TASK-456 — Scheda dell'attività e «My activities»

**Stato**: In lavorazione · 2026-11-12
**Fase**: 5 · **Branch**: `feat/TASK-456-activity-page`
**Dipende da**: niente
**ADR**: nessuno · numero dal Coordinatore l'11 novembre 2026 (S6 e S7 di
`out/prova-app-2026-11-11/PROPOSTE.md`, «Seconda prova: lato social»)

## Obiettivo

Nella prova dell'11 novembre 2026 (iPhone 17e, Profilo → «My activities» →
un'attività pubblica col titolo «My first star») la scheda dell'attività
aveva la mappa ridotta a una striscia, col disegno tagliato, e sotto un
lungo modulo; in fondo tre pulsanti fissi, con «Back to the list» doppio
della freccia. Nell'elenco la scheda aveva per titolo la data e non il
titolo del post, e un «Delete» rosso su ogni scheda. Alla fine: all'apertura
il disegno si vede intero e ha lo spazio principale; il modulo del post sta
in un foglio a parte; «Delete» è in un menu; l'elenco mostra il titolo del
post. Solo app: niente server, niente codice nativo.

## Scelta dell'utente (2026-11-11)

Proposte due disposizioni con uno schizzo: **A**, il modulo del post in un
foglio «Edit post»; **B**, il modulo sotto la mappa, scorrendo. L'utente ha
scelto **A**.

## Come funziona

- **La scheda dell'attività** (`ActivityCard.tsx`), sotto la mappa: titolo
  del post quando c'è (se no giorno e ora), sotto giorno, ora, luogo e
  disegno; le statistiche; la legenda; una riga con «Share» e «Edit post».
  La scheda ha la stessa altezza prima e dopo che l'API ha risposto, così la
  mappa non cambia altezza a disegno già inquadrato.
- **«Edit post»** apre un foglio dal basso con lo stesso modulo di prima
  (`PublicRow`: foto, «Title», «How did it go?», «Tag people», «Activity»,
  «Who can see it»), più alto di prima (fino al 70 % dello schermo invece
  del 40 %), e «Done» per chiuderlo. Nessun campo tolto. Il pulsante c'è
  solo quando il modulo c'è (un account, un'API coi disegni).
- **«…»** in alto a destra della scheda apre un foglietto con «Send to a
  friend», Strava (com'era: «Send to Strava», «View on Strava», «Connect
  with Strava»), «Delete» e «Cancel». «Delete» chiede conferma nel foglietto
  stesso, con le parole di prima («Delete this run? It cannot be undone.»,
  «Keep it», «Delete run»).
- **«Back to the list» non c'è più** sulla scheda dell'attività: resta «←».
  Le altre schede che lo hanno (un preferito, un disegno, «Explore») non
  cambiano.
- **L'elenco** (`ActivityRow.tsx`, tolta da `ActivitiesList.tsx`): la prima
  riga è il titolo del post quando c'è, con giorno e ora sotto; poi luogo e
  statistiche come prima. Al posto del «Delete» rosso, «…» in alto a destra:
  lo stesso foglietto, con «Delete» e la sua conferma.
- **Da dove viene il titolo**: da `GET /me/drawings`, che l'elenco chiede
  già per sapere quali corse sono pubbliche (`drawingsDoor.ts`,
  `postTitles`). Nessuna richiesta nuova.

## Testi nuovi dell'interfaccia

- «Edit post» (pulsante sulla scheda e titolo del foglio). Sì dell'utente
  prima del merge.
- Già nell'app, riusati: «More» (etichetta di «…»), «Done», «Delete»,
  «Cancel», «Keep it», «Delete run», «Send to a friend».

## File toccati

Modificati:

- `apps/mobile/src/activities/ActivityCard.tsx`
- `apps/mobile/src/activities/ActivitiesList.tsx` (in `AGENTI.md` di
  TASK-462 B, «poi TASK-457 e TASK-456»: qui solo il taglio di
  `ActivityRow` e dei suoi stili, e la riga che la usa)
- `apps/mobile/src/social/PublicRow.tsx`
- `apps/mobile/src/social/drawingsDoor.ts`
- `apps/mobile/src/i18n/de.ts`, `es.ts`, `fr.ts`, `it.ts` (entra «Edit
  post»; esce «Delete the run of {when}», che nessuno mostra più)
- `apps/mobile/src/imports/importedMarks.test.tsx`
- `apps/mobile/src/social/drawingsDoor.test.tsx`
- `apps/mobile/__tests__/AppActivities.test.tsx`
- `apps/mobile/__tests__/AppDrawings.test.tsx`
- `apps/mobile/__tests__/AppPenUpSaved.test.tsx`
- `apps/mobile/__tests__/AppStrava.test.tsx`
- `docs/UI.md`

Nuovi:

- `apps/mobile/src/activities/ActivityRow.tsx`
- `apps/mobile/src/activities/ActivityMenu.tsx`
- `apps/mobile/src/activities/ActivitySheet.tsx`
- `apps/mobile/src/activities/ActivityCard.test.tsx`
- `apps/mobile/src/activities/ActivityRow.test.tsx`
- `docs/tasks/TASK-456.md`

Non toccati: `App.tsx` (la prop `onList` resta), `screens/MapScreen.tsx`,
`src/map/**`, `src/share/**`, `src/feed/**`, `social/PublicParts.tsx`.

## Criteri di accettazione

- [x] Sulla scheda dell'attività non ci sono più il modulo del post, «Send
      to a friend», «Delete» né «Back to the list»: restano titolo o data,
      luogo, statistiche, legenda, «Share», «Edit post» e «…».
- [x] «Edit post» apre il foglio col modulo intero; «Done» lo chiude; il
      titolo cambiato nel foglio è quello della scheda.
- [x] «…» → «Delete» → «Delete run» cancella la corsa; «Keep it» no.
- [x] «…» mostra «Send to a friend» e Strava quando c'erano prima.
- [x] Nell'elenco una corsa col post titolato mostra il titolo e sotto
      giorno e ora; una senza titolo è com'era.
- [x] Nell'elenco nessun «Delete» in vista: «…» → «Delete» → conferma.
- [x] Test dei file toccati verdi, `tsc` pulito, lint e prettier puliti.
- [ ] Screenshot prima e dopo dell'elenco e della scheda in
      `out/TASK-456/`, col sì dell'utente.

## Note

- `PublicRow` con l'API che fallisce (`kind: "failed"`) non mostra niente:
  il ramo che scriverebbe il problema viene dopo un `return null` che lo
  precede sempre. Era così prima; qui «Edit post» in quel caso non c'è. Non
  toccato: fuori dal task.
- Provato sul simulatore il 2026-11-12 (iPhone 17e, Expo Go, API di prova
  sulla porta 8056 con un database usa e getta, `out/TASK-456/seed.py`):
  «Tag people», la scelta delle foto e «Send to a friend» si aprono da
  dentro i fogli; con la tastiera il foglio «Edit post» le sale sopra, resta
  sotto la barra di stato e il modulo scorre; il titolo cambiato nel foglio
  è subito quello della scheda e, tornati indietro, dell'elenco. Strava non
  provato sul simulatore (l'API di prova non ce l'ha): lo coprono i test.
- Chiusa «Send to…» si torna al foglietto di «…», che resta aperto: va
  chiuso con «Cancel». Per chiuderlo da solo servirebbe toccare
  `messages/SendDrawingButton.tsx`: fuori dal task.
- La tastiera di «How did it go?» è chiara sul tema scuro (manca
  `keyboardAppearance` in `PublicParts.tsx`): c'era già, fuori dal task.

## Stato

2026-11-12: proposta fatta, scelta A dell'utente; codice nella PR #1194 (in
bozza), test dei file toccati verdi, `tsc`, lint e prettier puliti.
Screenshot prima e dopo in `out/TASK-456/shots/` e nei due fogli
`out/TASK-456/TASK-456-*-prima-dopo.jpg`, mostrati all'utente. Mancano: il
sì dell'utente agli screenshot e a «Edit post», poi «#1194 pronta» al
Coordinatore; dopo il merge, la PR di soli documenti (`STATUS.md`,
`COMPLETATI.md`).
