# TASK-444 — Icone e colori coerenti

**Stato**: In corso · 2026-11-11
**Fase**: 5 · **Branch**: `feat/TASK-444-line-icons` (parte 1)
**Dipende da**: parte 2 — TASK-435 C (#1161, `RoutePanel.tsx`) e TASK-465
(`gym/ExerciseGrid.tsx`, `ExercisePicker.tsx`) in `main`
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
3. **Colore degli avvisi** (parte 2): da scegliere sugli screenshot, tra
   cambiare il valore del token `warning` (vale per 11 schermate) e
   togliere la striscia colorata lasciando un'icona.
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

### Parte 2 — avvisi, palestra (dopo)

- **Avvisi su scale e tunnel** (`route/RoutePanel.tsx` `NoteRow`,
  `route/warnings.ts`): una riga con un'icona; il colore secondo la scelta
  3. Trovato: gli avvisi usano già il token `warning`, non `error`; è
  `warning` che sul tema scuro è corallo (`#FF7A59`) accanto a `error`
  (`#FF6B6B`) ed `energy` (`#FF6363`).
- **Palestra** (`gym/ExerciseGrid.tsx`, `ExercisePicker.tsx`): via le emoji
  dei gruppi dove c'è già la figura a linea; dopo TASK-465, che in quei
  riquadri mette la sagoma del muscolo.

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

Parte 2 (lista da confermare col Coordinatore quando parte):
`route/RoutePanel.tsx`, `route/warnings.ts` coi test,
`route/RoutePanelNotes.test.tsx`, forse `theme/tokens.ts` e
`theme/palettes.test.ts`, `gym/ExerciseGrid.tsx`, `gym/ExercisePicker.tsx`
coi test.

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

## Cronologia

- **2026-11-11** — parte 1 nella PR #1176. Prima e dopo dal simulatore
  (iPhone 17e, Expo Go dal worktree) in `out/TASK-444/` del checkout
  principale: `TASK-444-1-griglia.jpg` … `TASK-444-5-profilo.jpg`.
  L'API locale non ha account, quindi nel Feed ci sono solo gli esempi,
  senza azioni né data: per le immagini un innesto temporaneo, non
  committato, le ha mostrate sotto gli esempi. Su un post vero la riga
  delle azioni va guardata sul telefono. Sì dell'utente lo stesso giorno.
- Parte 2: da iniziare quando `RoutePanel.tsx` (#1161) e i riquadri della
  palestra (TASK-465, #1173) sono in `main`.

## Esito

(da scrivere alla chiusura, dopo la parte 2)
