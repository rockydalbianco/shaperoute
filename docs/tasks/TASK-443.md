# TASK-443 — Inquadratura della mappa del risultato

**Stato**: In corso · 2026-11-11
**Fase**: 5 · **Branch**: `feat/TASK-443-result-map-fit`
**Dipende da**: TASK-442 (la sagoma sotto il percorso, PR #1143)
**ADR**: nessuno · numero dal Coordinatore l'11 novembre 2026 (P2 di
`out/prova-app-2026-11-11/PROPOSTE.md`)

## Obiettivo

Nella prova dell'11 novembre 2026 (iPhone 17, cuore da 5 km da Piazza del
Duomo, Trento) nella variante B la parte alta del percorso usciva dallo
schermo, il fumetto «Start here» finiva sotto la Dynamic Island ed era
bianco sul tema scuro, c'erano due spilli a goccia (bianco e azzurro) senza
che si capisse quale fosse la partenza, e la riga di attribuzione era una
fascia grigia chiara. Alla fine: il percorso si vede sempre tutto, il
fumetto e l'attribuzione hanno i colori del tema, la partenza è una
bandierina.

## Come funziona

- **Perché usciva**: la pagina inquadrava il percorso con 40 px uguali su
  ogni lato, senza sapere della barra di stato né dei pulsanti; e
  l'inquadratura veniva fatta quando la mappa era ancora alta: poi il
  pannello del risultato cresceva, la mappa si accorciava e nessuno la
  inquadrava di nuovo.
- **Cosa copre la mappa** (`mapCover.ts`): `MapScreen` sa quanto è alta la
  safe area e dove sono i pulsanti (indietro, tipo di mappa, freccia del
  nord, o il banner di una corsa) e lo dà alla mappa con un context;
  `MapView` lo manda alla pagina col messaggio nuovo `setCover`. `App.tsx`
  non cambia. Una pagina a cui nessuno l'ha detto inquadra come prima.
- **L'inquadratura** (`mapPage.ts`): sotto la safe area, sopra la riga di
  attribuzione, 16 px di respiro. Prima prova lo spazio più grande (subito
  sotto la barra di stato): se nessun punto del percorso finirebbe sotto un
  pulsante lo usa; se no scende sotto la riga dei pulsanti, e così via.
  Nel 3D va direttamente sotto i pulsanti.
- **Quando la mappa cambia altezza** (il pannello cresce o cala, anche
  passando da A a B a C), se l'utente non l'ha mossa viene inquadrata di
  nuovo, senza animazione. Se l'ha mossa resta dov'è.
- **La sagoma di TASK-442** è un layer della mappa, georiferito: si muove
  con lei e resta sul percorso. Entra anche nell'inquadratura, così si vede
  tutta.
- **La partenza**: non più lo spillo a goccia azzurro di MapLibre ma un
  tondo con una bandierina (colore `startHere`), centrato sul punto; la
  posizione chiesta resta la goccia chiara. Si distinguono per forma.
- **Il fumetto «Start here»**: stesso testo, colori del tema
  (`surfaceRaised`, `text`, `borderStrong`). Sta sopra la bandierina; se
  sopra finirebbe nella safe area o sotto un pulsante va sotto; vicino ai
  bordi si sposta di lato per restare dentro. Si ricalcola a ogni movimento
  della mappa.
- **L'attribuzione**: stessi testo e link, sempre aperta
  (`compact: false`), coi colori del tema (`surface`, `textMuted`, link
  `text`). Resta in basso a destra della mappa: il pannello sta sotto la
  mappa, non sopra, e i pulsanti sono in alto.

## Criteri di accettazione

- [ ] Con safe area e pulsanti detti alla pagina, il percorso è inquadrato
      sotto la safe area e sopra l'attribuzione; se toccherebbe un pulsante,
      sotto i pulsanti (`mapPageFrame.test.ts`).
- [ ] Cambiata l'altezza della mappa, il percorso è inquadrato di nuovo; non
      se l'utente ha mosso la mappa (`mapPageFrame.test.ts`).
- [ ] La sagoma entra nell'inquadratura e una nuova inquadratura non la
      tocca (`mapPageFrame.test.ts`).
- [ ] Il fumetto non sta mai nella safe area, sotto un pulsante o fuori dai
      bordi, e ha i colori del tema (`mapPageStartHere.test.ts`).
- [ ] La partenza è una bandierina, non una goccia
      (`mapPageStartHere.test.ts`, `mapPage.test.ts`).
- [ ] L'attribuzione resta aperta, con testo e link leggibili (contrasto
      ≥ 4,5:1) in ogni tono, e fuori dal pannello e dai pulsanti
      (`mapPageAttribution.test.ts`, `MapScreenCover.test.tsx`).
- [ ] `MapScreen` dice cosa copre la mappa e `MapView` lo manda alla pagina
      prima del percorso (`mapCover.test.ts`, `MapScreenCover.test.tsx`,
      `MapViewCover.test.tsx`).
- [ ] `tsc` pulito, test dei file toccati verdi. Impronta iOS attesa
      `6f8bba4c` (solo JS/TS).
- [ ] Screenshot prima e dopo delle varianti A, B, C in `out/TASK-443/`
      (cuore 5 km da 46.0679, 11.1211).
- [ ] Sì dell'utente su ciò che si vede, prima di «#NNN pronta».

## File toccati

- `apps/mobile/src/map/mapPage.ts`
- `apps/mobile/src/map/messages.ts`
- `apps/mobile/src/map/MapView.tsx`
- `apps/mobile/src/screens/MapScreen.tsx`
- `apps/mobile/src/map/mapPage.test.ts` (la riga sullo spillo di partenza)
- `apps/mobile/src/map/MapViewLanguage.test.tsx` (la riga sul testo del
  fumetto; sì del Coordinatore l'11 novembre)
- `apps/mobile/src/map/mapCover.ts` (nuovo)
- `apps/mobile/src/map/mapCover.test.ts` (nuovo)
- `apps/mobile/src/map/mapPageFrame.test.ts` (nuovo)
- `apps/mobile/src/map/mapPageStartHere.test.ts` (nuovo)
- `apps/mobile/src/map/mapPageAttribution.test.ts` (nuovo)
- `apps/mobile/src/map/MapViewCover.test.tsx` (nuovo)
- `apps/mobile/src/screens/MapScreenCover.test.tsx` (nuovo)
- `docs/tasks/TASK-443.md`

## Fuori scope

- `App.tsx`, `WhileRouting.tsx`, `RoutePanel.tsx`, `tokens.ts`, i18n (nessun
  testo nuovo), nativo.
- L'altezza del pannello del risultato: la mappa resta la parte di schermo
  che il pannello lascia.
- Lo spillo della posizione chiesta: resta la goccia chiara.

## Dove sono arrivato

- 2026-11-11: lista dei file approvata dal Coordinatore, che ha aggiunto
  l'attribuzione (solo CSS in `mapPage.ts`, con un test sulla leggibilità).
  La #1143 non era ancora in `main`: il ramo è partito dalla testa della 442
  (a0ffd992) e si riallinea a `main` dopo il suo merge; la PR si apre solo
  dopo «#1143 in main».
- 2026-11-11 sera: codice e test scritti (commit a30bc225). La pagina è
  stata provata nel browser con MapLibre vero (402 × 335): il conto di dove
  cade un punto sullo schermo coincide con `map.project` anche a mappa
  girata; un percorso che toccherebbe un pulsante scende sotto la riga;
  accorciata la mappa viene inquadrata di nuovo. `tsc` pulito, `src/map` e i
  test di `MapScreen` verdi. Chiesto al Coordinatore un file in più, per una
  riga: `MapViewLanguage.test.tsx` controllava il fumetto con `.setText`.
  Mancano gli screenshot nel simulatore (un'altra sessione aveva acceso il
  suo pochi secondi prima: aspetto il turno), il sì dell'utente, la PR dopo
  «#1143 in main».
