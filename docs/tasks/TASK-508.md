# TASK-508 — Rifiniture dell'interfaccia (U1, U11–U14)

**Stato**: In lavorazione · 2026-11-24 · due PR (scelta del Coordinatore):
A tecnica (U1, U11 a capo e maiuscole, U13 orologio), B coi testi (U11
pulsante spento, U12, U13 push, U14)
**Fase**: 5 · **Branch**: `feat/TASK-508-a-ui-polish` (A), poi
`feat/TASK-508-b-texts` (B)
**ADR**: da chiedere al Coordinatore (il giallo di «Log in» / «Sign up»,
seconda eccezione alla regola 1 di `UI.md` «Il tema») · numero di task dal
«Coordinatore (fork 3)» il 23 novembre 2026 (gruppo L di
`out/prova-app-2026-11-23/PROPOSTE.md`)

## Obiettivo

Nella prova nel simulatore del 23 novembre 2026 (iPhone 17e, italiano, tema
scuro) cinque punti piccoli: un'etichetta tagliata nel profilo, tre cose in
«Draw», due in «Explore», il testo sotto l'orologio in «Settings», il
pulsante di accesso grigio. Alla fine ognuno è sistemato o detto voluto.

## Cosa era ancora vero il 24 novembre 2026 (`origin/main` 48dbd7a4)

| Punto | Stato | Cosa si fa |
|---|---|---|
| U1 «Follow…» | vero | il nome della casella (`FollowLists.tsx`, `countName`) è largo quanto il testo e l'arrotondamento lo tronca: prende la larghezza della casella, centrato |
| U11 «A mano libera» a capo | vero (voluto in TASK-340) | il selettore a quattro su una riga: il testo si stringe (`Segmented`, prop `oneLine`) |
| U11 forme minuscole | vero | l'etichetta delle caselle con la maiuscola (`ShapeGrid`, `ShapeTiles`); nel campo resta la parola minuscola |
| U11 pulsante spento | vero | una riga sopra il pulsante dice cosa manca |
| U12 «London» | vero | i nomi delle città preimpostate passano da `t()`: `FEATURED_CITIES` resta in inglese per l'API |
| U12 secondo logo | vero | è il `HeartBadge` decorativo di TASK-222 (ADR-0184, chiesto dall'utente il 3 ottobre): si toglie da «Explore» |
| U12 sagoma nelle caselle | — | **non di questa task**: TASK-509 |
| U13 testo sotto l'orologio | vero | le pagine di «Profile» aperte sopra l'app scorrono sotto la barra di stato: una fascia opaca alta `insets.top` |
| U13 invito alle push | vero | una riga toccabile quando sono spente |
| U14 «Accedi» grigio | vero (`SignInScreen.tsx` libero: #1519 in `main` dal 23-11) | giallo, scelta dell'utente |
| U14 pallino rosso | **voluto** | `attention` in `ProfileLayer.tsx` = sessione scaduta («Profile, log in again»): sparisce all'accesso, non c'è dopo «Log out». Non si tocca |

## Scelte dell'utente (2026-11-24)

1. Città di «Explore» nella lingua dell'app: **«Sì, tradotte»** (Londra,
   Parigi, Roma, Milano, Barcellona, Berlino, Lisbona; le altre uguali).
2. Sopra il pulsante spento di «Draw»: **«Sì, quella riga»** — «Choose a
   start first» / «Scegli prima la partenza»; senza forma «Choose what to
   draw first» / «Scegli prima cosa disegnare».
3. Secondo logo in «Explore»: **«Sì, toglilo»**.
4. «Log in» / «Sign up»: **«Giallo»** (era proposto il chiaro pieno): è
   un'eccezione alla regola «il giallo significa una cosa sola», come
   ADR-0183.
5. Invito alle notifiche push: **«Sì, una riga nelle Impostazioni»**, testo
   **«Sì, questo testo»** — «Push notifications are off. Tap to turn them
   on.» / «Le notifiche push sono spente. Tocca per accenderle.» Il tocco fa
   come l'interruttore.

Le traduzioni in tedesco, francese e spagnolo dei testi nuovi vanno fatte
vedere all'utente con le schermate.

## File toccati

Sì del Coordinatore il 24-11: nessuna PR aperta tocca questi file, salvo
`App.tsx` (a turno: dopo TASK-507 B2).

**PR A, tecnica**:

- `apps/mobile/src/social/FollowLists.tsx` + `FollowListsNames.test.tsx` (nuovo)
- `apps/mobile/src/screens/Segmented.tsx` + `SegmentedOneLine.test.tsx` (nuovo)
- `apps/mobile/src/route/RoutePanel.tsx` (la prop `oneLine` al selettore di «Draw»)
- `apps/mobile/src/route/ShapeGrid.tsx`, `apps/mobile/src/route/ShapeTiles.tsx`
  + `ShapeTileNames.test.tsx` (nuovo)
- `apps/mobile/src/screens/ProfileScreen.tsx` + `ProfileStatusBar.test.tsx`
  (nuovo); dentro anche `useTabBarRoom` nel fondo dello scroller, chiesto dal
  Coordinatore per TASK-469 parte B (oggi vale 0)
- `apps/mobile/src/ui/StatusBarCover.tsx` + test (nuovi)
- `docs/tasks/TASK-508.md`

**PR B, coi testi** (dopo la A):

- `apps/mobile/App.tsx` (il `footer` di «Draw»: quando il Coordinatore dà
  il turno), nuovo `apps/mobile/src/route/DrawHint.tsx` + test (scritti, in
  `out/TASK-508/` del checkout principale finché non servono)
- `apps/mobile/src/explore/presets.ts`, `apps/mobile/src/explore/ExploreTools.tsx`,
  `apps/mobile/src/explore/ExploreScreen.tsx` (dopo #1559, già in `main`)
- `apps/mobile/src/settings/NotificationsSetting.tsx` (sì del Coordinatore
  da avere)
- `apps/mobile/src/screens/SignInScreen.tsx`
- `apps/mobile/src/i18n/{it,de,fr,es}.ts`: le città nel blocco delle città
  (accanto a `London`), le altre nel blocco della loro schermata, non in coda
- i test accanto ai file toccati

**PR dei documenti** (dopo i merge): `docs/UI.md`, `docs/DECISIONS.md`
(l'ADR del giallo di «Log in»), `docs/archive/COMPLETATI.md`, questo file.

## Criteri di accettazione

- [ ] Ogni punto «vero» della tabella sistemato, con un test deterministico.
- [ ] Le quattro tabelle i18n hanno ogni chiave nuova (`tables.test.ts`).
- [ ] Nessun colore scritto a mano; impronta iOS `5e1b5ce5` invariata;
      nessuna dipendenza nuova.
- [ ] Schermate prima/dopo viste dall'utente, col suo sì.
- [ ] «#NNN pronta» al Coordinatore a CI verde; documenti di chiusura dopo
      il merge.

## Lasciato fuori

(da riempire: i punti i cui file sono occupati, col nome di chi li tiene)

## Cronologia

- 2026-11-24: riverifica su `main`, cinque domande all'utente (sopra),
  lista dei file al Coordinatore.
- 2026-11-24 sera: sì del Coordinatore, due PR. Codice e test della PR A
  scritti; test locali e schermate in attesa di «carico ok» e del turno di
  simulatore (dato e ripreso due volte: prima a TASK-495 B, poi a TASK-506
  per un crash in produzione).
- 2026-11-24 sera: turno di simulatore di 4 minuti (iPhone 17e, Expo Go,
  ramo locale con A e B insieme): le sei schermate «dopo» sono in
  `out/TASK-508/shots/` del checkout principale, accanto alle «prima» del
  23-11. Test dei file toccati della PR A verdi uno alla volta, `tsc`
  verde.
