# TASK-469 — Il look Liquid Glass

**Stato**: In corso (parte 0 fatta: «Capsula»; A aspetta l'aggiornamento completo)
**Fase**: 5 · **ADR**: ADR-0383 · **Branch**: `docs/TASK-469-liquid-glass`
(questo file), poi `feat/TASK-469-a1-glass-tokens` e le fette seguenti

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
  - A1 i token del vetro in `tokens.ts` (solo token nuovi) e un componente
    `src/ui/Glass.tsx` (file nuovo), con le schermate prima/dopo;
  - A2 la barra delle schede (capsula, bordo di luce, ombra; icone spente da
    `textFaint` a `textMuted` per il contrasto sul vetro);
  - A3 i segmenti a pillola con l'indicatore che scivola (`Segmented`,
    `FeedTabs`, `ExploreTools`);
  - A4 le card di Explore e Feed (superfici stratificate, raggi più grandi);
  - A5 l'header che si dissolve allo scroll (`AppHeader`);
  - A6 Settings (dopo TASK-457, che tiene `src/profile/**`);
  - A7 il resto (fogli, isola, chip), da elencare dopo A6.
- **B — Liquid Glass nativo** con `expo-glass-effect` (UIGlassEffect su
  iOS 26; `expo-blur` o opaco prima e su Android). Dipendenza nuova e
  impronta iOS che cambia: solo in una build **dopo l'uscita della 1.1.0**,
  col sì dell'utente e chiedendo prima al Coordinatore. Prima di installare
  qualcosa ci si ferma e si chiede.

## Inventario delle superfici

| Superficie | File | Oggi | Con il vetro | Libero? |
|---|---|---|---|---|
| Barra delle schede | `src/tabs/TabBar.tsx` | `background` al 95%, filo in cima, capsula `surfaceRaised` che scivola | capsula di vetro, bordo di luce, ombra morbida | sì; letto dai test di quasi ogni schermata (con `TabShell.tsx`, `TabSwipeOwners.test.ts`) |
| Header | `src/tabs/AppHeader.tsx` | pieno, logo e pulsanti | si dissolve in vetro allo scroll; pulsanti in cerchi di vetro | sì |
| Isola | `src/ui/Island.tsx`, `IslandLayer.tsx` | capsula scura | capsula di vetro scuro | sì |
| Fogli dal basso | `src/ui/SheetModal.tsx` | `surface` pieno | vetro con bordo di luce, angoli 28 | sì |
| Segmenti | `src/screens/Segmented.tsx`, `src/feed/FeedTabs.tsx`, `src/explore/ExploreTools.tsx`, `src/game/PlayTabs.tsx` | pillola su `background` | pillola di vetro, indicatore in rilievo che scivola | sì |
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

- [ ] Test deterministici dei componenti toccati, verdi; `tsc` verde.
- [ ] Il test del contrasto sul vetro passa per ogni tono e passo.
- [ ] «Riduci trasparenza», «Aumenta contrasto» e «Riduci movimento» hanno
      un test ciascuno.
- [ ] L'impronta iOS resta `6f8bba4c`.
- [ ] Schermate prima/dopo in chiaro e scuro qui sotto.
- [ ] Decisione in `DECISIONS.md` (ADR-0383) e `docs/UI.md` aggiornato,
      nella PR di soli documenti dopo il merge.

## File toccati

Questa PR: `docs/tasks/TASK-469.md`, `docs/STATUS.md`, `docs/DECISIONS.md`.
La lista di ogni fetta di A va al Coordinatore prima del codice.

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

## Schermate prima/dopo

*(si riempie fetta per fetta)*

## Esito

*(a fine task)*
