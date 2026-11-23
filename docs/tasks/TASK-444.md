# TASK-444 — Icone e colori coerenti

**Stato**: Done · 2026-11-12 (con la PR #1190 in `main`)
**Fase**: 5 · **Branch**: `feat/TASK-444-line-icons` (parte 1, #1176),
`feat/TASK-444-2-notes-gym` (parte 2, #1190)
**Dipende da**: —
**ADR**: nessuno · numero dal Coordinatore l'11 novembre 2026 (P3, S11 e S12
di `out/prova-app-2026-11-11/PROPOSTE.md`)

## Obiettivo

Nella prova dell'11 novembre 2026 l'app mescolava tre modi di disegnare un
segno: glifi bianchi (cerchio, cuore, stella, luna), emoji a colori
(cavallo, gatto, pesce; 👍 💬 ✏️ sotto i post; ❓ su «Guide»; polmoni e
arrampicata sui gruppi della palestra) e le icone a linea della barra in
basso. Gli avvisi su scale e tunnel sembravano errori. Alla fine: un solo
stile, a linea, coi colori dei token.

Solo app (`apps/mobile`). Nessuna dipendenza nuova, niente codice nativo
(impronta iOS `6f8bba4c`).

## Scelte dell'utente (2026-11-11)

1. **Le calorie restano rosse.** La scelta del 10 novembre («le calorie in
   rosso ovunque», ADR-0352 precisazione C3) non si tocca, nemmeno nel Feed.
2. **Data nel Feed: solo «yesterday».** Il Feed era già relativo fino a 7
   giorni («just now», «5 min ago», «3 h ago», «2 d ago», poi il giorno):
   nella prova il post era vecchio. Un testo nuovo, tra 24 e 48 ore al
   posto di «1 d ago», nel Feed e nei commenti: en `yesterday`, it `ieri`,
   de `gestern`, fr `hier`, es `ayer`.
3. **Avvisi del percorso: «A · solo il segno»** (12 novembre 2026, sulle
   schermate a confronto in chiaro e in scuro,
   `out/TASK-444/TASK-444-6-avvisi-confronto.jpg`): un segno a linea
   accanto al testo e nessuna striscia colorata; il token `warning` resta
   com'è. Scartata «B · striscia ambra»: avrebbe cambiato `warning` in
   tutta l'app (altre 9 schermate e un colore delle persone nel gioco,
   `game/personColors.ts`), e l'ambra sta vicino al giallo `accent`, che
   vuol dire «percorso».
4. **La parte 1 va bene così** («Sì, va bene», sulle cinque coppie prima e
   dopo del simulatore): anche i contorni **a penna alzata** dove il
   catalogo li ha (faccina, ciambella, gatto, sole: senza la riga che
   attraversa la figura per arrivare agli occhi), al posto della linea
   unica che il percorso disegna.

## Parti

Due PR, decise col Coordinatore: i file della parte 2 sono occupati.

### Parte 1 — forme, Feed, «Guide» (questa PR)

- **Forme**: `ShapeGlyph` disegna il contorno vero di ogni forma del
  catalogo, lo stesso dell'anteprima di «Draw» (`shapeScale`, cioè
  `mapdraw/catalogueShapes.json`, scritto dal motore). Niente SVG: lati
  fatti di `View` girate, come `OutlineLines`. Alla misura di un riquadro i
  punti si sfoltiscono (Douglas–Peucker, tolleranza 0,6 % del lato: solo
  punti del catalogo, nessuno spostato): stessa figura, circa 45 `View` a
  forma invece di 65. Dove il catalogo ha la figura a penna alzata si usa
  quella (`lookOf(…, true)`). Deciso dall'agente su delega dell'utente,
  senza ADR (Coordinatore, 2026-11-11); visto e approvato dall'utente. Usato nella griglia di «Draw» e in
  «See all» (`ShapeGrid`), nella riga che scorre (`ShapeTiles`) e nella
  riga delle figure sotto il risultato e in «Draw on the map»
  (`FigureTiles`). `SHAPE_SIGNS` (le emoji) esce.
- **Feed**: «Like», «Comment», «Share», «Edit & run» hanno icone PNG di
  Lucide (ISC), bianche e colorate dai token come quelle della barra
  (scelta dell'utente in TASK-367): `heart`, `message-circle`, `share`,
  `pencil`, in `assets/ui/icons/` con la licenza accanto. «Edit & run»
  resta giallo, icona compresa.
- **Data**: `agoLabel` dice «yesterday» tra 24 e 48 ore.
- **«Guide»** (profilo senza account, `tour/GuideRow.tsx`): `circle-help`
  di Lucide in `textMuted` al posto del ❓.

### Parte 2 — avvisi, palestra (PR #1190)

- **Avvisi del percorso** (`route/NoteRow.tsx`, nuovo: la riga esce da
  `RoutePanel.tsx`, che la importa): accanto al testo un segno a linea di
  Lucide, `triangle-alert` in `text` per le cose a cui fare attenzione
  (scale, gallerie, strade principali…), `info` in `textMuted` per quelle
  da sapere. La differenza la dice la forma del segno, non un colore: la
  striscia a sinistra non c'è più, né arancio né grigia (scelta 3). Il
  segno è nascosto al lettore di schermo. Trovato: gli avvisi usavano già
  il token `warning`, non `error`; è `warning` che sul tema scuro è corallo
  (`#FF7A59`) accanto a `error` (`#FF6B6B`) ed `energy` (`#FF6363`).
  `warnings.ts` non cambia: scale e gallerie restano due righe, ognuna
  con la sua misura.
- **Il riquadro di «Try 8 km»** (`BetterDistance` in `RoutePanel.tsx`)
  perde la striscia grigia con le altre righe: resta il riquadro.
- **Nota del nuoto** (`swim/SwimRouteNote.tsx`, col sì del Coordinatore):
  aveva la stessa striscia `warning`; ora è la stessa riga, col triangolo.
- **Palestra** (`gym/ExerciseGrid.tsx`, `ExercisePicker.tsx`): via le emoji
  dei gruppi (`GROUP_EMOJI`) dai riquadri di «+ Exercise» e dal titolo del
  gruppo: resta la figura a linea, che c'era già accanto.

### Lasciato ad altri

- **«Guide» nel profilo con account**: `profile/ProfileHome.tsx` riga 158,
  `<SectionRow emoji="❓" …>`. Il file è di TASK-462 B e poi di TASK-457
  (profilo nuovo): **da fare nella 457**, con l'icona
  `assets/ui/icons/circle-help.png` già pronta (come in `GuideRow`).
  Lì ci sono anche le emoji di `SECTION_EMOJI` («Favorites», «My
  activities»).
- `about/AboutRows.tsx` («Help» con ❓) e `settings/FeedbackSetting.tsx`
  (💬): non chiesti, non toccati.

## File toccati

Parte 1:

```
apps/mobile/src/route/ShapeGlyph.tsx                 (nuovo)
apps/mobile/src/route/ShapeGlyph.test.tsx            (nuovo)
apps/mobile/src/route/ShapeTiles.tsx
apps/mobile/src/route/ShapeGrid.tsx
apps/mobile/src/route/ShapeGrid.test.tsx
apps/mobile/src/mapdraw/FigureTiles.tsx
apps/mobile/src/mapdraw/FigureTiles.test.tsx
apps/mobile/src/feed/PostActions.tsx
apps/mobile/src/feed/PostActions.test.tsx
apps/mobile/src/social/commentText.ts
apps/mobile/src/social/commentText.test.ts
apps/mobile/src/i18n/{it,de,fr,es}.ts                (una chiave: «yesterday»)
apps/mobile/src/tour/GuideRow.tsx
apps/mobile/src/tour/GuideRowTap.test.tsx
apps/mobile/assets/ui/icons/**                       (nuovi: PNG di Lucide e licenza)
docs/tasks/TASK-444.md                               (nuovo)
docs/UI.md
```

Parte 2 (lista confermata dal Coordinatore il 12 novembre 2026):

```
apps/mobile/src/route/NoteRow.tsx                    (nuovo)
apps/mobile/src/route/NoteRow.test.tsx               (nuovo)
apps/mobile/src/route/RoutePanel.tsx                 (solo NoteRow e i suoi stili)
apps/mobile/src/route/RoutePanelNotes.test.tsx
apps/mobile/src/swim/SwimRouteNote.tsx
apps/mobile/src/swim/safetyNotice.test.tsx
apps/mobile/src/gym/ExerciseGrid.tsx
apps/mobile/src/gym/ExerciseGrid.test.tsx
apps/mobile/src/gym/ExercisePicker.tsx
apps/mobile/assets/ui/icons/triangle-alert*.png, info*.png   (nuovi, Lucide)
docs/tasks/TASK-444.md
docs/UI.md
```

Non toccati: `route/warnings.ts`, `theme/tokens.ts`.

## Criteri di accettazione

Parte 1:

- [x] Ogni forma del catalogo ha il suo contorno, preso da
      `catalogueShapes.json`; nessuna emoji nei riquadri delle forme
      (`ShapeGlyph.test.tsx`, `ShapeGrid.test.tsx`, `FigureTiles.test.tsx`).
- [x] Il contorno sfoltito resta dentro la tolleranza da quello vero e
      tiene primo e ultimo punto (`ShapeGlyph.test.tsx`).
- [x] Sotto un post nessuna emoji: quattro icone, nascoste al lettore di
      schermo, che legge la parola (`PostActions.test.tsx`).
- [x] «yesterday» tra 24 e 48 ore, «2 d ago» da 48 (`commentText.test.ts`);
      il testo c'è nelle cinque lingue.
- [x] «Guide» senza ❓ (`GuideRowTap.test.tsx`).
- [x] Solo colori dei token; `tsc` pulito. Impronta iOS: il diff è solo
      JavaScript e risorse di Metro (nessun `package.json`, `app.json`,
      config o nativo); la misura su `main` la fa il Coordinatore prima di
      pubblicare.
- [x] Screenshot prima e dopo in `out/TASK-444/`, visti dall'utente.

Parte 2:

- [x] Ogni avviso ha il suo segno, triangolo o «i», e nessuna striscia né
      colore di avviso o di errore (`NoteRow.test.tsx`,
      `RoutePanelNotes.test.tsx`); il segno non si legge ad alta voce.
- [x] La nota del nuoto è la stessa riga (`safetyNotice.test.tsx`).
- [x] Nessuna emoji nei riquadri dei gruppi né nel titolo di un gruppo
      (`ExerciseGrid.test.tsx`).
- [x] Solo colori dei token; `tsc` pulito; nessuna dipendenza, niente
      nativo.
- [x] Schermate in `out/TASK-444/` viste dall'utente: avvisi nelle tre
      versioni in chiaro e in scuro, palestra prima e dopo.

## Cronologia

- **2026-11-11** — parte 1 nella PR #1176. Prima e dopo dal simulatore
  (iPhone 17e, Expo Go dal worktree) in `out/TASK-444/` del checkout
  principale: `TASK-444-1-griglia.jpg` … `TASK-444-5-profilo.jpg`.
  L'API locale non ha account, quindi nel Feed ci sono solo gli esempi,
  senza azioni né data: per le immagini un innesto temporaneo, non
  committato, le ha mostrate sotto gli esempi. Su un post vero la riga
  delle azioni va guardata sul telefono. Sì dell'utente lo stesso giorno.
- **2026-11-11, 23:20** — #1176 in `main` (anteprima 11 dell'app di prova).
- **2026-11-12** — parte 2 nella PR #1190, dopo #1161 e #1173 in `main`.
  Schermate dal simulatore (iPhone 17e, Expo Go dal worktree) su un
  percorso vero, il cuore da 5 km in Piazza del Duomo a Trento, percorso B
  con «Show more»: `TASK-444-6-avvisi-confronto.jpg` (oggi, A, B; scuro e
  chiaro), `-7-avvisi-schermo-intero.jpg`, `-8-palestra.jpg`. La versione
  B era un innesto temporaneo solo per le immagini (ambra `#FFAA33` in
  scuro, `#9A5600` in chiaro), mai committato. L'utente sceglie A.

## Esito

Fatto in due PR, #1176 e #1190. L'app ha un solo modo di disegnare un
segno, a linea e coi colori dei token: contorni veri per le forme, icone
di Lucide sotto i post, su «Guide» e accanto agli avvisi del percorso,
nessuna emoji sui gruppi della palestra. Le calorie restano rosse.

Resta fuori, per altri task: «Guide» nel profilo con account
(`profile/ProfileHome.tsx`, TASK-457, icona già pronta), «Help» in
`about/AboutRows.tsx` e `settings/FeedbackSetting.tsx`. In produzione
esce con l'aggiornamento completo dell'app (OTA del Coordinatore). Da
guardare sul telefono: la riga delle azioni sotto un post vero.
