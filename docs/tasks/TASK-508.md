# TASK-508 — Rifiniture dell'interfaccia (U1, U11–U14)

**Stato**: In lavorazione · 2026-11-24 · in attesa del sì del Coordinatore
sulla lista dei file
**Fase**: 5 · **Branch**: `feat/TASK-508-ui-polish`
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

In attesa del sì del Coordinatore (chiesto il 24-11):

- `apps/mobile/src/social/FollowLists.tsx`
- `apps/mobile/src/screens/Segmented.tsx`, `apps/mobile/src/route/RoutePanel.tsx`
- `apps/mobile/src/route/ShapeGrid.tsx`, `apps/mobile/src/route/ShapeTiles.tsx`
- `apps/mobile/App.tsx` (il `footer` di «Draw»), nuovo `apps/mobile/src/route/DrawHint.tsx`
- `apps/mobile/src/explore/presets.ts`, `apps/mobile/src/explore/ExploreTools.tsx`,
  `apps/mobile/src/explore/ExploreScreen.tsx`
- `apps/mobile/src/screens/ProfileScreen.tsx`, nuovo `apps/mobile/src/ui/StatusBarCover.tsx`
- `apps/mobile/src/settings/NotificationsSetting.tsx`
- `apps/mobile/src/screens/SignInScreen.tsx`
- `apps/mobile/src/i18n/{it,de,fr,es}.ts` (chiavi nuove nei blocchi giusti, non in coda)
- i test accanto ai file toccati · `docs/tasks/TASK-508.md`
- nella PR dei documenti: `docs/UI.md`, `docs/DECISIONS.md`, `docs/archive/COMPLETATI.md`

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
  lista dei file al Coordinatore. Nessun codice ancora.
