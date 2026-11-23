# TASK-469 — Il look Liquid Glass

**Stato**: In corso (0 fatta: «Capsula»; A1 e A2 in produzione con l'OTA 14;
A3 e A4a in produzione al più tardi con l'OTA 17; A4b e A4c in produzione
con l'OTA 20; A5 e A5b con l'OTA 21; A5c e A6 in produzione con l'OTA 22;
A6b con l'OTA 23; A7a, A7b, A5c-2, A7c-1 e A7c-2 in `main`)
**Fase**: 5 · **ADR**: ADR-0383 · **Branch**: una per fetta, da `main`
(`feat/TASK-469-a1-glass-bar` #1219, `feat/TASK-469-a2-sliding-segments`
#1225, `feat/TASK-469-a3-glass-segments` #1276,
`feat/TASK-469-a4a-glass-chips` #1290, `feat/TASK-469-a4b-explore-cards`
#1333; documenti `docs/TASK-469-a-done` #1270, `docs/TASK-469-a3-done`
#1287, `docs/TASK-469-a4a-done` #1329, `docs/TASK-469-a4b-done` #1343, per
A4b e A4c; `feat/TASK-469-a4c-feed-cards` #1344,
`feat/TASK-469-a5-header-glass` #1358, `feat/TASK-469-a5b-header-scroll`
#1384, `feat/TASK-469-a5c-header-pages` #1391,
`feat/TASK-469-a6-settings-groups` #1403,
`feat/TASK-469-a6b-account-glass` #1407; documenti di A5 e A5b
`docs/TASK-469-a5-done` #1390, di A5c e A6 `docs/TASK-469-a5c-a6-done`
#1409, di A6b `docs/TASK-469-a6b-done` #1451;
`feat/TASK-469-a7a-glass-sheets` #1453,
`feat/TASK-469-a7b-glass-island` #1455,
`feat/TASK-469-a5c2-feed-header` #1467; documenti di A7a, A7b e A5c-2
`docs/TASK-469-a7-a5c2-done` #1474; `feat/TASK-469-a7c1-chips` #1472,
documenti `docs/TASK-469-a7c1-done` questa)

## Obiettivo

L'app prende il look Liquid Glass di iOS 26: superfici traslucide con un
bordo di luce sottile, capsule che galleggiano, profondità e movimento
morbido. Si comincia dalla barra delle schede e dai segmenti, poi Explore,
Feed e Settings, poi il resto. Richiesta dell'utente del 2026-11-12.

## Contesto da leggere

- `docs/UI.md` «Il tema», «Il look premium» (TASK-339, ADR-0293), «Il
  movimento della barra», «L'isola», «Fogli e liste» (TASK-388, ADR-0329)
- `apps/mobile/src/theme/tokens.ts`
- Le direzioni visive: https://claude.ai/artifact/HD397UmJcu94vNZvGBH2bs
  (fonte in `out/liquid-glass/direzioni.html` nel checkout principale)

## Le parti

- **0 — La direzione** (scelta di prodotto, dell'utente). Tre direzioni
  sulla pagina sopra: **Capsula** (barra a capsula che galleggia, segmenti
  a pillola con indicatore che scivola, didascalie delle card su una lastra
  di vetro dentro la foto), **Lastra** (barra attaccata in basso con gli
  angoli alti arrotondati, card a due superfici, vetro solo su barra e
  header), **Luce** (profilo in un cerchio di vetro a parte, alone sulla
  scheda attiva, chip e righe di vetro staccate). **Scelta dell'utente
  (2026-11-12): «Capsula».**
- **A — Vetro senza dipendenze, via OTA**, in fette piccole, ognuna una PR
  da `main`, **dopo l'aggiornamento completo** e col sì del Coordinatore
  sulla lista dei file prima del codice:
  - **A1 fatta** (#1219, in `main` 6d360ca0): i token del vetro in
    `tokens.ts` (solo aggiunte: `GLASS_VEIL`, `glassOf`, `glass`),
    `src/ui/Glass.tsx` e `src/ui/useGlassMode.ts` (file nuovi), e la barra
    delle schede come capsula di vetro che galleggia (bordo di luce, ombra;
    icone spente da `textFaint` a `textMuted`). Le fette A1 e A2 della prima
    stesura sono diventate una sola;
  - **A2 fatta** (#1225, in `main` 24320b68): `Segmented` con la pillola che
    scivola alla scelta nuova;
  - **A3 fatta** (#1276, in `main` 666f67af): la pista dei segmenti di
    vetro e la pillola in rilievo, in `Segmented` e in `PlayTabs`.
    `FeedTabs` usa `Segmented` e prende tutto senza essere toccato;
    `ExploreTools` ha chip, non segmenti, e va con la fetta dei chip;
    `RoutePanel.tsx` non si tocca (di TASK-413 B) ma prende il vetro da
    `Segmented`;
  - **A4a fatta** (#1290, in `main` 33c12fb1): i chip in rilievo sul vetro
    (`ui/glassRaise.ts`): le città di Explore e i chip della ricerca
    (`FilterChip`), coi loro colori; il giallo del chip scelto resta
    (TASK-344). Gli altri chip sparsi (calendario, piscina, pagaia,
    pannello del percorso, Style) restano per una fetta dopo;
  - **A4b fatta** (#1333, in `main` cc58c258): le card di Explore
    (`RouteCard`) col raggio 28 (`radius.card`, token nuovo), un bordo di
    vetro disegnato sopra la card (`cardEdge`) e la percentuale in alto a
    destra su una capsula di vetro posata; le parole restano sotto il
    disegno;
  - **A4c fatta** (#1344, in `main` a7a7bd8e): le card del Feed
    (`FeedPost`) col raggio 28; sopra una foto titolo e numeri stanno su
    una capsula di vetro dentro la foto, a 8 pt dal bordo, al posto della
    sfumatura `Scrim` (a capsula intera, scelta dell'utente del
    2026-11-21); il contatore delle foto è una capsula di vetro;
  - **A5 fatta** (#1358, in `main` 2dedac1a): la campanella e lo sport
    dell'header sono cerchi di vetro in rilievo (`headerGlass`), col bordo
    forte dei comandi;
  - **A5b fatta** (#1384, in `main` a2c1b96c): in cima a una pagina
    l'header ha il colore della pagina, senza linea; appena la pagina
    scorre prende una fascia di vetro con il filo di luce in basso e
    un'ombra corta (`useHeaderScroll`, sì dell'utente «Sì, anche lo
    scroll»). Collegate Disegna, Explore, Explore sull'acqua e Messaggi;
    il contenuto non passa sotto l'header (serve la parte B);
  - **A5c fatta** (#1391, in `main` 9a2364ef): anche Profilo, «Today» e
    «Days» dello sci dicono il loro scroll all'header; una pagina che se ne
    va lontana dalla cima lo rimette a riposo. «Resorts» resta a riposo:
    lì scorre solo la lista, sotto la ricerca fissa;
  - **A5c-2 fatta** (#1467, in `main` 15d0fe40): anche le schede «All» e
    «Following» del Feed dicono il loro scroll all'header. Ogni scheda
    tiene la sua lista e parla solo quella sullo schermo: una scheda
    nascosta lontana dalla cima rimette l'header a riposo, mostrata di
    nuovo dice dove si trova. «Style» resta a riposo per ora;
  - **A6 fatta** (#1403, in `main` 832a554f): i gruppi di righe di
    Impostazioni con gli angoli a 24 (`radius.group`) e i bordi del vetro
    posato; la faccia resta `surface`, così le parole tengono il contrasto;
  - **A6b fatta** (#1407, in `main` a729ad01): la scheda dell'account e la
    riga «Blocked people» prendono la faccia dei gruppi; il riquadro prima
    di «Delete account» prende i loro angoli e tiene il bordo rosso, perché
    è un avviso e non vetro;
  - **A7a fatta** (#1453, in `main` edcb4018): i 17 fogli dal basso
    prendono la faccia del vetro posato (`useSheetFace`): angoli in alto a
    28, il filo di luce al posto della linea dura e un'ombra morbida verso
    l'alto; la faccia resta `surface`;
  - **A7b fatta** (#1455, in `main` d10104d7): l'isola prende il filo di
    luce del vetro scuro e un'ombra corta; la faccia e le parole restano
    come prima;
  - **A7c-1 fatta** (#1472, in `main` 2e23489e): i chip di 11 pagine
    social, di condivisione e del calendario escono dal vetro come quelli
    della ricerca (`glassRaise`): filo di luce in cima e ombra corta, il
    chip scelto tiene la sua faccia;
  - **A7c-2 fatta** (#1494, in `main` c3523b12): lo stesso rilievo sui
    chip di quattro schermate degli sport: l'obiettivo in palestra, i
    posti della pagaia, la lunghezza della vasca e le scelte della
    giornata sulla neve;
  - A7c-3: i chip condivisi della palestra (`gymStyles` e le otto pagine
    che li usano), la schermata del volo e il pannello del percorso
    quando sono liberi, con la loro lista di file.
- **B — Liquid Glass nativo** con `expo-glass-effect` (UIGlassEffect su
  iOS 26; `expo-blur` o opaco prima e su Android). Dipendenza nuova e
  impronta iOS che cambia: solo in una build **dopo l'uscita della 1.1.0**,
  col sì dell'utente e chiedendo prima al Coordinatore. Prima di installare
  qualcosa ci si ferma e si chiede.

## Inventario delle superfici

| Superficie | File | Oggi | Con il vetro | Libero? |
|---|---|---|---|---|
| Barra delle schede | `src/tabs/TabBar.tsx` | `background` al 95%, filo in cima, capsula `surfaceRaised` che scivola | **fatto (A1)**: capsula di vetro, bordo di luce, ombra morbida | sì; letto dai test di quasi ogni schermata (con `TabShell.tsx`, `TabSwipeOwners.test.ts`) |
| Header | `src/tabs/AppHeader.tsx` | pieno, logo e pulsanti | si dissolve in vetro allo scroll; pulsanti in cerchi di vetro | sì |
| Isola | `src/ui/Island.tsx`, `IslandLayer.tsx` | capsula scura | capsula di vetro scuro | sì |
| Fogli dal basso | `src/ui/SheetModal.tsx` | `surface` pieno | vetro con bordo di luce, angoli 28 | sì |
| Segmenti | `src/screens/Segmented.tsx`, `src/feed/FeedTabs.tsx`, `src/explore/ExploreTools.tsx`, `src/game/PlayTabs.tsx` | pillola su `background` | pillola di vetro, indicatore in rilievo che scivola (**`Segmented` fatto, A2**) | sì |
| Chip dei filtri | `src/search/FilterChip.tsx` | — | chip di vetro | sì |
| Card di Explore | `src/explore/RouteCard.tsx`, `ThemedCard.tsx`, `ExploredCard.tsx` | raggio `xl` 20, senza bordo | raggio 28, didascalia su vetro | sì |
| Pagina Explore | `src/explore/ExploreScreen.tsx` | — | solo se serve lo scroll per l'header | **TASK-441** |
| Card del Feed | `src/feed/FeedPost.tsx`, `MuwPost.tsx`, `StylePost.tsx` | raggio `xl`, `Scrim` sulla foto | didascalia su vetro al posto di `Scrim` | sì |
| Azioni del post | `src/feed/PostActions.tsx` | — | non si tocca | **TASK-454** |
| Settings | `src/profile/SettingsPage.tsx`, `src/settings/*` | righe con `Hairline` | gruppi a raggio 24 sotto header e barra di vetro | `profile/**` è di **TASK-457** |
| Colori | `src/theme/tokens.ts` | — | token nuovi: tinta, velatura, bordo di luce (alto e basso), ombra, per tono e passo | sì, **solo aggiunte** |
| `App.tsx` | — | — | non serve | a turno, ora di TASK-457 |

Nell'app non ci sono `expo-blur` né `expo-glass-effect`. React Native 0.86
ha già ombre (`boxShadow`, anche interne), sfumature e bordi di colore
diverso per lato: la parte A non chiede niente di nativo.

## Vincoli

1. **Colori** solo da `tokens.ts`. I valori esistenti, `warning` compreso,
   non si toccano: si aggiungono token. Il giallo resta al percorso e al suo
   comando, mai come tinta del vetro.
2. **Contrasto**: sull'App Store sono dichiarati «Sufficient Contrast» e il
   tema scuro. Testo e icone sul vetro restano ≥ 4,5:1 sul caso peggiore
   (foto bianca sotto il tono scuro, nera sotto il chiaro), a ogni passo di
   luminosità; un test lo controlla come `palettes.test.ts`. Senza blur
   questo vuol dire una velatura di circa 86–92%: il vetro si intravede
   appena; la trasparenza vera arriva con B.
3. **Accessibilità di iOS**: con «Riduci trasparenza»
   (`AccessibilityInfo.isReduceTransparencyEnabled`) le superfici diventano
   opache; con «Aumenta contrasto» (`isDarkerSystemColorsEnabled`) opache
   col bordo `borderStrong`; con «Riduci movimento» niente animazioni, solo
   dissolvenze brevi (come TASK-388).
4. **Prestazioni**: niente blur sopra la mappa mentre si registra.
5. **Impronta iOS**: la parte A non deve muovere `6f8bba4c`.
6. **Simulatore** a turni dati dal Coordinatore (coda dell'11-12: 457 →
   415 B3 → 461 A2 → 466 B).

## Criteri di accettazione (ogni fetta di A)

Spuntati per A1 e A2 (2026-11-12):

- [x] Test deterministici dei componenti toccati, verdi; `tsc` verde.
- [x] Il test del contrasto sul vetro passa per ogni tono e passo
      (`theme/glass.test.ts`).
- [x] «Riduci trasparenza», «Aumenta contrasto» e «Riduci movimento» hanno
      un test ciascuno (`TabBarGlass.test.tsx`, `Segmented.test.tsx`).
- [x] L'impronta iOS resta `6f8bba4c` (nessun file nativo, nessuna
      dipendenza; uscite con l'OTA 14).
- [x] Schermate prima/dopo in chiaro e scuro qui sotto.
- [x] Decisione in `DECISIONS.md` (ADR-0383) e `docs/UI.md` aggiornato,
      nella PR di soli documenti dopo il merge (questa).

## File toccati

- A1 (#1219): `apps/mobile/src/theme/tokens.ts` (solo aggiunte),
  `src/theme/glass.test.ts`, `src/ui/Glass.tsx`, `src/ui/Glass.test.tsx`,
  `src/ui/useGlassMode.ts`, `src/ui/useGlassMode.test.ts` (nuovi),
  `src/tabs/TabBar.tsx`, `src/tabs/TabBarGlass.test.tsx` (nuovo),
  `src/tabs/TabBarMotion.test.tsx`, `src/tabs/TabShellDrag.test.tsx` (una
  riga, col sì del Coordinatore).
- A2 (#1225): `apps/mobile/src/screens/Segmented.tsx`,
  `src/screens/Segmented.test.tsx` (nuovo).
- A3 (#1276): `apps/mobile/src/screens/Segmented.tsx`,
  `src/game/PlayTabs.tsx`, `src/screens/SegmentedGlass.test.tsx` (nuovo).
- A4a (#1290): `apps/mobile/src/ui/glassRaise.ts`,
  `src/ui/glassRaise.test.tsx` (nuovi), `src/explore/ExploreTools.tsx`,
  `src/search/FilterChip.tsx`.
- A4b (#1333): `apps/mobile/src/theme/tokens.ts` (solo `radius.card`),
  `src/explore/RouteCard.tsx`, `src/explore/RouteCardGlass.test.tsx`
  (nuovo), `src/explore/RouteCard.test.tsx` (una riga, `radius.xl` →
  `radius.card`, col sì del Coordinatore).
- A4c (#1344): `apps/mobile/src/feed/FeedPost.tsx`,
  `src/feed/FeedPostGlass.test.tsx` (nuovo), `src/feed/FeedPost.test.tsx`
  (una riga, `radius.xl` → `radius.card`) e un test di
  `src/feed/FeedPostPhotos.test.tsx` (la capsula al posto di `Scrim`),
  tutti e due col sì del Coordinatore.
- A5 (#1358): `apps/mobile/src/bell/BellButton.tsx`,
  `src/settings/SportButton.tsx` (solo lo stile del tasto),
  `src/tabs/HeaderGlass.test.tsx` (nuovo).
- A5b (#1384): `apps/mobile/src/tabs/headerScroll.tsx`,
  `src/tabs/HeaderScroll.test.tsx` (nuovi), `src/tabs/AppHeader.tsx`,
  `src/tabs/TabShell.tsx`, una riga per pagina in
  `src/explore/ExploreScreen.tsx`, `src/tabs/MessagesPage.tsx`,
  `src/paddle/PaddleExplore.tsx`, `src/screens/ChooseScreen.tsx`, e
  `src/tour/TourScrollView.tsx` (passa avanti l'`onScroll` di chi lo usa,
  col sì del Coordinatore).
- A5c (#1391): `apps/mobile/src/tabs/headerScroll.tsx` (rimette l'header a
  riposo quando lo scroller se ne va), una riga per pagina in
  `src/screens/ProfileScreen.tsx`, `src/skimode/SkiTodayPage.tsx`,
  `src/skimode/SkiDaysPage.tsx`, `src/tabs/HeaderScrollPages.test.tsx`
  (nuovo).
- A6 (#1403): `apps/mobile/src/theme/tokens.ts` (solo `radius.group`),
  `src/settings/settingsGroup.ts`, `src/settings/SettingsGroup.test.tsx`
  (nuovi), e una riga per gruppo in 18 file di Impostazioni: i
  `…Setting.tsx` di `src/settings/` (Body, Email, Feedback, Language,
  Notifications, Phone, PostLinks, Sport, Style, Tone, Units, Vo2Max),
  `src/about/AboutRows.tsx`, `src/engine/OfflineMapsSetting.tsx`,
  `src/profile/PhotoRow.tsx`, `src/strava/StravaSetting.tsx`,
  `src/stretch/MorningStretchSetting.tsx`, `src/gear/GearSetting.tsx`.
- A6b (#1407): `apps/mobile/src/profile/SettingsPage.tsx`,
  `src/social/BlockedPeople.tsx`, `src/settings/SettingsGroupAccount.test.tsx`
  (nuovo).
- A7a (#1453): `apps/mobile/src/ui/sheetFace.ts`,
  `src/ui/SheetFace.test.tsx` (nuovi) e una riga per foglio in 17 file:
  `src/messages/MessageSheet.tsx`, `src/messages/AttachButton.tsx`,
  `src/liveShare/LiveShareButton.tsx`, `src/social/ReportMenu.tsx`,
  `src/search/FilterSheet.tsx`, `src/social/SuperLikeSheet.tsx`,
  `src/social/DrawingComments.tsx`, `src/social/TagPeople.tsx`,
  `src/social/outfit/OutfitTagEditor.tsx`,
  `src/social/outfit/OutfitTagSheet.tsx`, `src/feed/PostShareSheet.tsx`,
  `src/feed/StyleProductSheet.tsx`, `src/activities/ActivitySheet.tsx`,
  `src/ski/DayResort.tsx`, `src/gym/GymIntroSheet.tsx`,
  `src/share/EditVideoSheet.tsx`, `src/feed/AddToFeed.tsx`.
- A7b (#1455): `apps/mobile/src/ui/Island.tsx`,
  `src/ui/IslandGlass.test.tsx` (nuovo).
- A5c-2 (#1467): `apps/mobile/src/tabs/headerScroll.tsx` (`active`: solo
  lo scroller sullo schermo parla), `src/screens/FeedScreen.tsx`,
  `src/tabs/FeedHeaderScroll.test.tsx` (nuovo).
- A7c-1 (#1472): una riga per chip in 11 file —
  `apps/mobile/src/activities/ActivityCalendar.tsx`,
  `src/feed/SleepPostPage.tsx`, `src/feed/StyleLens.tsx`,
  `src/imports/PhotoPostForm.tsx`, `src/liveShare/LiveShareButton.tsx`,
  `src/share/MusicRow.tsx`, `src/share/ScenesRows.tsx`,
  `src/share/SharePost.tsx`, `src/social/PublicParts.tsx`,
  `src/social/composer/PostComposer.tsx`,
  `src/social/outfit/OutfitTagEditor.tsx` — e `src/ui/ChipGlass.test.tsx`
  (nuovo). `FilterSheet.tsx` e `StartState.tsx` non toccati: usano già
  `FilterChip`.
- A7c-2 (#1494): `apps/mobile/src/gym/TargetSteps.tsx`,
  `src/paddle/PaddleExplore.tsx`, `src/pool/PoolDraw.tsx`,
  `src/ski/DayChoices.tsx`, `src/ui/ChipGlass.test.tsx` (la lista dei
  file controllati). Non toccati, visti uno per uno: `GearEditor.tsx` e
  `GearPicker.tsx` usano già `FilterChip`; in `GymDrawGuide.tsx` e
  `NavigateScreen.tsx` «chip» è un'etichetta di testo, non un comando;
  in `RunDashboard.tsx` `chipBars` è il segno di pausa; `gymStyles.ts`
  è condiviso da otto pagine e va con A7c-3.
- La PR di documenti di A7c-2: `docs/tasks/TASK-469.md`,
  `docs/tasks/TASK-469/TASK-469-A7c2-chip-sport.jpg` (nuova),
  `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md`.
- La PR di documenti di A7c-1: `docs/tasks/TASK-469.md`,
  `docs/tasks/TASK-469/TASK-469-A7c1-chip.jpg` (nuova), `docs/STATUS.md`,
  `docs/DECISIONS.md`, `docs/UI.md`.
- La PR di documenti di A7a, A7b e A5c-2: `docs/tasks/TASK-469.md`,
  `docs/tasks/TASK-469/*-A7a-*.jpg`, `*-A7b-*.jpg`, `*-A5c2-*.jpg`
  (nuove), `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md`.
- La PR di documenti di A6b: `docs/tasks/TASK-469.md`,
  `docs/tasks/TASK-469/TASK-469-A6b-account.jpg` (nuova), `docs/STATUS.md`,
  `docs/DECISIONS.md`, `docs/UI.md`.
- La PR di documenti di A5c e A6: `docs/tasks/TASK-469.md`,
  `docs/tasks/TASK-469/*-A5c-*.jpg`, `*-A6-*.jpg` (nuove), `docs/STATUS.md`,
  `docs/DECISIONS.md`, `docs/UI.md`.
- La PR di documenti di A5 e A5b: `docs/tasks/TASK-469.md`,
  `docs/tasks/TASK-469/*-A5-*.jpg`, `*-A5b-*.jpg` (nuove), `docs/STATUS.md`,
  `docs/DECISIONS.md`, `docs/UI.md`.
- La PR di documenti di A4b e A4c: `docs/tasks/TASK-469.md`,
  `docs/tasks/TASK-469/*-A4b-*.jpg`, `*-A4c-*.jpg`, `a4c-*.jpg` (nuove),
  `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md`.
- La PR di documenti di A4a: `docs/tasks/TASK-469.md`,
  `docs/tasks/TASK-469/*-A4a-*.jpg`, `a4a-*.jpg` (nuove), `docs/STATUS.md`,
  `docs/DECISIONS.md`, `docs/UI.md`.
- La PR di documenti di A3: `docs/tasks/TASK-469.md`,
  `docs/tasks/TASK-469/*-A3-*.jpg`, `a3-*.jpg` (nuove), `docs/STATUS.md`,
  `docs/DECISIONS.md`, `docs/UI.md`.
- La PR di documenti di A1 e A2: `docs/tasks/TASK-469.md`, `docs/tasks/TASK-469/*.jpg`
  (nuove), `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md`.

La lista di ogni fetta seguente va al Coordinatore prima del codice.

## Fuori scope

- Cambiare i colori esistenti, il giallo, la mappa, la linea del percorso.
- La parte B prima della 1.1.0 e del sì dell'utente.
- File di altri task in lavorazione (`profile/**`, `ExploreScreen.tsx`,
  `PostActions.tsx`, `App.tsx`).
- Un tono «di sistema» che segue il telefono (UI.md, scelta ancora aperta).

## Cronologia

- **2026-11-12**: numeri dal Coordinatore (TASK-469, ADR-0383); tre
  direzioni pubblicate; l'utente sceglie «Capsula» (ADR-0383). A1 parte
  da `main` dopo l'aggiornamento completo, col sì del Coordinatore sulla
  lista dei file.
- **2026-11-12**: A1 (#1219) e A2 (#1225) scritte; turno di simulatore
  (prima = `origin/main`, dopo = i due branch; tono e lingua forzati con
  modifiche locali non committate, poi tolte); l'utente approva le
  schermate («Sì, tutte e due»). #1219 in `main` 6d360ca0, #1225 in `main`
  24320b68; **in produzione con l'OTA 14** (15:15Z, be21e7d8).
- Imparato: senza blur il vetro si riconosce dal bordo di luce e
  dall'ombra, non dalla trasparenza: la fascia sotto la barra resta
  opaca e il contenuto non le passa sotto. La capsula ora ha margine a
  destra: prima la pillola del profilo toccava il bordo.
- **2026-11-12**: A3 (#1276): lista dei file col sì del Coordinatore,
  codice, turno di simulatore (prima = i due file di `main` rimessi per un
  momento nel worktree, dopo = il branch); l'utente approva le schermate
  («Sì, vai»). #1276 in `main` 666f67af, esce col prossimo OTA.
- Imparato: il simulatore può restare sullo sport di un'altra sessione;
  per Draw e Play si torna a «Run» da Settings. Metro in modo CI non
  ricarica: una variante, un riavvio.
- **2026-11-12**: A4a (#1290): lista col sì del Coordinatore, codice,
  turno di simulatore (Explore e ricerca, scuro e chiaro, «Riduci
  trasparenza»); l'utente approva («Sì, vai»). #1290 in `main` 33c12fb1.
- **2026-11-21**: PR di documenti di A4a; worktree di A1–A4a rimossi.
- **2026-11-21**: A4b (#1333): lista e una riga di test col sì del
  Coordinatore, codice, turno di simulatore (Explore con gli esempi di New
  York, che mostrano la percentuale); l'utente approva («Sì, vai»). #1333
  in `main` cc58c258, col prossimo OTA dopo il 19. Il Coordinatore attivo
  è ora «Coordinatore (fork 2)».
- **2026-11-21**: A4c (#1344): lista e due test col sì del Coordinatore. Il
  primo turno di simulatore si è interrotto (gli strumenti dell'app non
  rispondevano); nel secondo, con un database locale e due foto finte
  (una chiara, una scura) su un post di prova. L'utente sceglie la
  capsula intera per la didascalia («Sì, a capsula») e approva le
  schermate («Sì, vai»). #1344 in `main` a7a7bd8e.
- Imparato: i post d'esempio del Feed non hanno foto; per vederne servono
  un database e un account (`out/TASK-469/seed.py`, `add_photos.py`).
  `@bacons/apple-targets` (in `main`) non è nel `node_modules` del checkout
  principale: Metro da un worktree lo vuole collegato.

- **2026-11-21**: A5 (#1358): lista col sì del Coordinatore; turno di
  simulatore con un database locale e un account di prova (la campanella
  c'è solo con un account). L'utente approva («Sì, vai») e chiede anche
  l'header che cambia scorrendo («Sì, anche lo scroll»).
- **2026-11-22**: A5b (#1384): lista col sì del Coordinatore (fork 2), senza
  `FeedScreen.tsx`, occupato da altri task; una riga in `TourScrollView`
  per Disegna, col suo sì. L'utente approva le schermate («Sì, vai»). #1358
  in `main` 2dedac1a, #1384 in `main` a2c1b96c, con l'OTA 21. Il
  Coordinatore attivo è ora «Coordinatore (fork 3)».
- Imparato: gli eventi di scroll di React Native non risalgono, quindi ogni
  pagina dice il suo scroll all'header con un hook; una pagina non
  collegata lascia l'header a riposo. Il pulsante degli strumenti di Expo
  Go 57 copre l'angolo destro dell'header: si spegne dal suo menu.
- **2026-11-22**: A5c (#1391): lista col sì del Coordinatore (fork 3), il
  Feed escluso perché occupato. L'utente approva le schermate («Sì, vai»);
  #1391 in `main` 9a2364ef. A6 (#1403): lista col sì del Coordinatore,
  `GearSetting.tsx` aggiunto col suo sì; l'utente approva («Sì, vai»);
  #1403 in `main` 832a554f. A6b: lista col sì del Coordinatore, bozza
  #1407; l'utente approva le schermate («Sì, vai»); #1407 in `main`
  a729ad01. A5c e A6 in produzione con l'OTA 22 (b4c31f09), pubblicata dal
  Coordinatore; documenti #1409.
- **2026-11-23**: A6b in produzione con l'OTA 23 (e427ed2e), pubblicata
  dal Coordinatore. A7a, A7b e A5c-2: liste col sì del Coordinatore,
  bozze #1453, #1455, #1467, prova nel simulatore col suo turno; l'utente
  approva le schermate («Sì, vai a tutte»); in `main` #1453 edcb4018,
  #1467 15d0fe40, #1455 d10104d7. A7c-1: lista col sì del Coordinatore,
  bozza #1472, prova nel simulatore col suo turno; l'utente approva le
  schermate («Sì, vai»); #1472 in `main` 2e23489e. Documenti di A7a, A7b
  e A5c-2 #1474 in `main`. A7c-2: i dieci file liberi (Coordinatore),
  bozza #1494 su quattro; prova nel simulatore col suo turno; l'utente
  approva le schermate («Sì, vai»); #1494 in `main` c3523b12. Documenti
  di A7c-1 #1495 in `main`.
- Imparato: Metro parte con `CI=1`, quindi niente fast refresh: ogni
  modifica al codice vuole Metro riavviato e l'app riaperta. «Riduci
  trasparenza» invece si applica subito. In scuro il rilievo dei chip è
  quasi invisibile (solo il filo in cima), in chiaro si vede l'ombra.
  Dei file con uno stile `chip`, diversi non sono chip da premere
  (etichette di testo, il segno di pausa) o usano già `FilterChip`.
- Imparato: nell'isola il filo di luce viene dal vetro scuro in ogni
  tono, così il filo scuro del tono chiaro non compare sulla capsula
  nera. Passando da una scheda del Feed all'altra, la scheda nascosta va
  a riposo in un layout effect, prima che quella mostrata dica dove si
  trova: l'header non sbatte in nessun ordine.
- Imparato: «Today» dello sci nel simulatore non scorre (la pagina è più
  corta dello schermo), quindi lì lo provano solo i test. Un gruppo di una
  sola riga con gli angoli a 24 sembra quasi una capsula.

## Schermate prima/dopo

Simulatore iPhone, 2026-11-12. Prima = `origin/main`, dopo = le PR.

**A1, la barra** — scuro e chiaro, Feed, Draw, Explore:

![A1 scuro, prima e dopo](TASK-469/TASK-469-A1-scuro-prima-dopo.jpg)
![A1 chiaro, prima e dopo](TASK-469/TASK-469-A1-chiaro-prima-dopo.jpg)
![La barra da vicino](TASK-469/TASK-469-A1-barra-da-vicino.jpg)

Con «Riduci trasparenza» la capsula è opaca (`surface`, letta al pixel:
22,20,17); con «Aumenta contrasto» opaca col bordo `borderStrong`:

![Riduci trasparenza](TASK-469/a1-dark-reduce-transparency-draw.jpg)
![Aumenta contrasto](TASK-469/a1-dark-increase-contrast-draw.jpg)

**A2, i segmenti** — in tedesco (le parole più lunghe), la pillola che
scivola da una scelta all'altra in circa 160 ms senza superarla:

![A2 in tedesco](TASK-469/a2-dark-de-draw.jpg)
![A2, i fotogrammi dello scivolamento](TASK-469/a2-dark-de-slide-frames.jpg)

**A3, la pista e la pillola** — la pista ha un filo di luce sul bordo,
la pillola una luce in cima e un'ombra corta. L'effetto è sottile, più
visibile in scuro; Draw, Feed e Play:

![A3, i segmenti da vicino](TASK-469/TASK-469-A3-segmenti-da-vicino.jpg)
![A3 scuro, prima e dopo](TASK-469/TASK-469-A3-scuro-prima-dopo.jpg)
![A3 chiaro, prima e dopo](TASK-469/TASK-469-A3-chiaro-prima-dopo.jpg)

Con «Riduci trasparenza» la pista è il fondo opaco come prima (11,10,8 al
pixel) e la barra `surface` (22,20,17):

![A3, Riduci trasparenza](TASK-469/a3-dark-reduce-transparency-draw.jpg)

**A4a, i chip** — le città di Explore e i chip della ricerca hanno una
luce in cima e un'ombra corta; i colori restano, il giallo del chip
scelto compreso. In chiaro si nota di più il filo di luce sul chip nero
«Near me»:

![A4a, i chip da vicino](TASK-469/TASK-469-A4a-chip-da-vicino.jpg)
![A4a scuro, prima e dopo](TASK-469/TASK-469-A4a-scuro-prima-dopo.jpg)
![A4a chiaro, prima e dopo](TASK-469/TASK-469-A4a-chiaro-prima-dopo.jpg)

Con «Riduci trasparenza» i chip restano piatti e la barra è `surface`
(22,20,17 al pixel):

![A4a, Riduci trasparenza](TASK-469/a4a-dark-reduce-transparency-explore.jpg)

**A4b, le card di Explore** — angoli a 28 e un filo di vetro intorno
(netto in scuro, leggero in chiaro); la percentuale su una capsula di
vetro, sotto cui la linea gialla si intravede appena. Con «Riduci
trasparenza» la card è come prima, la barra `surface`:

![A4b, le card da vicino](TASK-469/TASK-469-A4b-card-da-vicino.jpg)
![A4b, prima e dopo, e Riduci trasparenza](TASK-469/TASK-469-A4b-prima-dopo.jpg)

**A4c, le card del Feed** — prima il titolo bianco su `Scrim` spariva
sopra un cielo chiaro; ora sta su una capsula di vetro e si legge su
ogni foto, in tutti e due i toni. Sulla foto scura in tono chiaro i
puntini si intravedono appena attraverso la capsula. Con «Riduci
trasparenza» la capsula è opaca:

![A4c, prima e dopo](TASK-469/TASK-469-A4c-card-del-feed.jpg)
![A4c, Riduci trasparenza](TASK-469/a4c-dark-reduce-transparency-bright.jpg)

**A5, i cerchi dell'header** — prima la campanella era un'icona nuda e lo
sport un cerchio pieno; ora sono due cerchi di vetro in rilievo col bordo
forte. Con «Riduci trasparenza» sono opachi:

![A5, prima e dopo, e Riduci trasparenza](TASK-469/TASK-469-A5-intestazione.jpg)

**A5b, l'header che cambia scorrendo** (Disegna) — prima la linea sotto
l'header c'era sempre; ora in cima non c'è, e compare con la fascia
quando la pagina scorre. In chiaro si vede l'ombra corta sul contenuto; in
scuro la fascia somiglia alla vecchia linea, e la differenza è la pagina
in cima senza linea. Con «Riduci trasparenza» la fascia è opaca, con la
linea sottile:

![A5b, a riposo e scorrendo](TASK-469/TASK-469-A5b-intestazione-scorrendo.jpg)

**A5c, il Profilo che scorre** — in cima l'header è a riposo, scorrendo
prende la fascia di vetro, come Disegna; scuro, chiaro e «Riduci
trasparenza» (fascia opaca):

![A5c, Profilo a riposo e scorrendo](TASK-469/TASK-469-A5c-profilo-scorrendo.jpg)

**A6, i gruppi di Impostazioni** — gli angoli passano da 16 a 24, quindi
un gruppo di una riga sembra quasi una capsula. In scuro il bordo è vicino
a quello di prima, in chiaro più morbido; le parole restano su `surface`.
Con «Riduci trasparenza» il bordo è la linea sottile di prima. La scheda
dell'account resta a 16 fino alla A6b:

![A6, prima e dopo, e Riduci trasparenza](TASK-469/TASK-469-A6-impostazioni.jpg)

**A6b, l'account e «Blocked people»** — la scheda dell'account prende un
bordo e gli angoli a 24 (prima non aveva bordo); «Blocked people», una
sola riga, diventa quasi una capsula. Il riquadro prima di «Delete
account» tiene il bordo rosso con gli angoli dei gruppi. Scuro, chiaro e
«Riduci trasparenza» (la linea sottile di prima):

![A6b, prima e dopo, e il riquadro di Delete account](TASK-469/TASK-469-A6b-account.jpg)

**A7a, i fogli dal basso** — gli angoli in alto passano da 26 (o 16) a 28,
la linea dura in cima diventa il filo di luce del vetro e un'ombra
morbida sale sul contenuto dietro: si vede in chiaro, appena in scuro.
«Share» del Feed, i filtri della ricerca, il «…» di un profilo, i
commenti e «Riduci trasparenza» (la linea sottile di prima):

![A7a, fogli prima e dopo](TASK-469/TASK-469-A7a-fogli.jpg)

**A7b, l'isola** — dopo una segnalazione: in scuro un filo di luce
sottile intorno alla capsula, in chiaro un'ombra corta sotto:

![A7b, l'isola prima e dopo](TASK-469/TASK-469-A7b-isola.jpg)

**A5c-2, il Feed che scorre** — prima l'header del Feed non cambiava mai;
ora in cima è a riposo, scorrendo prende la fascia di vetro, e passando a
una scheda in cima torna a riposo. Con «Riduci trasparenza» la fascia è
opaca:

![A5c-2, il Feed a riposo e scorrendo](TASK-469/TASK-469-A5c2-feed-scorrendo.jpg)

**A7c-1, i chip** — «Share your run» (Results e Music) e il foglio
«Photos only» (Tag people, Who can see it). In scuro cambia solo un filo
di luce in cima al chip; in chiaro il chip ha un'ombra corta sotto. Con
«Riduci trasparenza» è uguale a prima:

![A7c-1, i chip prima e dopo](TASK-469/TASK-469-A7c1-chip.jpg)

**A7c-2, i chip degli sport** — la lunghezza della vasca nel nuoto
(«Pool length»). Come in A7c-1: in scuro un filo di luce in cima al chip,
in chiaro un'ombra corta sotto; con «Riduci trasparenza» è uguale a
prima:

![A7c-2, i chip degli sport prima e dopo](TASK-469/TASK-469-A7c2-chip-sport.jpg)

## Esito

*(a fine task)* — A1 e A2 in produzione dal 2026-11-12 (OTA 14); A3 e A4a
in `main` dal 2026-11-12, in produzione al più tardi con l'OTA 17
(2026-11-18); A4b e A4c in produzione con l'OTA 20 (2026-11-21); A5 e A5b
con l'OTA 21 (2026-11-22); A5c e A6 in produzione con l'OTA 22
(2026-11-22, b4c31f09); A6b con l'OTA 23 (2026-11-23, e427ed2e); A7a, A7b, A5c-2, A7c-1 e A7c-2 in `main` dal
2026-11-23.
