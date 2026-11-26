# TASK-508 — Rifiniture dell'interfaccia (U1, U11–U14)

**Stato**: Done · 2026-11-24 · #1569, #1572 e #1576 in `main` (merge
`091f992a`, `3e740931`, `43e5e6aa`)
**Esito**: i cinque punti della prova sono sistemati, uno è detto voluto
(il pallino rosso del profilo). «Follower» intero; in «Draw» l'interruttore
su una riga, le forme con la maiuscola, la riga che dice perché «Draw
route» è spento; in «Explore» le città nella lingua dell'app e un solo
cuore; in «Settings» niente testo sotto l'orologio e l'invito alle push;
«Sign up» / «Log in» gialli. Schermate prima/dopo e traduzioni approvate
dall'utente («Sì, vanno bene», «sì alla #1572»). Restano l'OTA di
produzione, del Coordinatore col sì dell'utente, e la prova dell'utente
sul telefono.
**Fase**: 5 · **Branch**: `feat/TASK-508-a-ui-polish` (A, tecnica),
`feat/TASK-508-b-texts` (B, i testi), `feat/TASK-508-c-draw-hint` (C,
`App.tsx`), `docs/TASK-508-done`
**ADR**: ADR-0409 (il giallo di «Sign up» / «Log in», un'eccezione alla
regola 1 di `UI.md` «Il tema»), dato dal Coordinatore il 24 novembre 2026 ·
numero di task dal «Coordinatore (fork 3)» il 23 novembre 2026 (gruppo L
di `out/prova-app-2026-11-23/PROPOSTE.md`)

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

Le traduzioni in tedesco, francese e spagnolo dei testi nuovi sono state
fatte vedere all'utente con le schermate: «Sì, vanno bene» (2026-11-24).

6. La riga «Choose what to draw first» compare solo quando non c'è proprio
   niente di scritto o scelto; una parola in lettura o non valida tiene la
   nota sotto il suo campo. Scelta dell'agente, detta all'utente: «va bene
   così» (2026-11-24).

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

**PR B, coi testi** (#1572; in più, col sì del Coordinatore,
`apps/mobile/src/profile/SettingsPage.test.tsx`, che conta i pulsanti di
«Settings») **e PR C** (#1576: `apps/mobile/App.tsx` e
`apps/mobile/__tests__/AppDrawHint.test.tsx`):

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

- [x] Ogni punto «vero» della tabella sistemato, con un test deterministico.
- [x] Le quattro tabelle i18n hanno ogni chiave nuova (`tables.test.ts`).
- [x] Nessun colore scritto a mano; impronta iOS `5e1b5ce5` invariata;
      nessuna dipendenza nuova.
- [x] Schermate prima/dopo viste dall'utente, col suo sì.
- [x] «#NNN pronta» al Coordinatore a CI verde; documenti di chiusura dopo
      il merge.

## Lasciato fuori

Niente per file occupati: ogni file chiesto era libero o è arrivato a turno
(`App.tsx` dopo TASK-507 B2).

- **La sagoma nelle caselle degli esempi di «Explore»** (U12): è di
  TASK-509.
- **Il pallino rosso sul profilo** (U14): voluto, non toccato.
- **Il commento di `accent` in `tokens.ts`** nomina due eccezioni al
  giallo, non tre: `tokens.ts` non era nella lista. Va allineato alla
  prima modifica di quel file (ADR-0409, «Conseguenze»).
- **`PaddleExplore.tsx`** ha ancora il suo `HeartBadge` accanto al titolo:
  l'utente ha deciso solo per «Explore». Da chiedere se si vuole uguale.
- **OTA di produzione e prova sul telefono**: Coordinatore e utente.

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
- 2026-11-24 notte: #1569 «pronta» e unita (CI verde su `580ea9c8`).
  #1572: il job `mobile` rosso per `SettingsPage.test.tsx` (14 pulsanti,
  la riga delle push fa 15), corretto in `5fd5faae`; «pronta» col sì
  dell'utente, unita. Turno su `App.tsx` dopo #1573: #1576 monta
  `DrawHint`, unita subito dopo la #1572.
- 2026-11-26: documenti di chiusura (ADR-0409, `UI.md`, `COMPLETATI.md`,
  questo file).
