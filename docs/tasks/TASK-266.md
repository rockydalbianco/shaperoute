# TASK-266 — Il tour del primo avvio e la guida in «Profile»

**Stato**: Done
**Fase**: app · **Branch**: `feat/TASK-266-first-run-tour` · **ADR**: ADR-0235

## Obiettivo

Chi apre MuW la prima volta vede, sulle schermate vere, come funziona
l'app; il tour si può saltare, ma non nei primi 5 secondi. La guida
d'uso si trova dalla prima pagina di «Profile», anche senza account, e
da lì si rivede il tour.

Richiesta dell'utente del 2026-10-09: «una sezione con la guida su come
utilizzare l'app, ed un breve tutorial all'inizio da poter skippare anche
però i primi 5 secondi no e fai vedere come funziona l'app la prima volta
che la scarichi». Fra tre proposte (animazioni disegnate, schermate vere
come immagini, tour sulle schermate vere) l'utente ha scelto **il tour
sulle schermate vere**.

## Contesto da leggere

- `docs/UI.md`, «L'animazione all'avvio» e «Help», «Terms», «Privacy»
  (TASK-184).
- `docs/DECISIONS.md`, ADR-0235.

## Cosa fare

1. Dopo l'animazione all'avvio (TASK-179), alla prima apertura, un tour
   sopra l'app: una parte vera dello schermo nella luce, il resto scuro,
   poche parole accanto, «Next». Otto passi: il benvenuto, «START», le
   forme, la distanza, il fondo di «Draw» con «Draw route», sport e
   «Profile», poi la pagina «Explore» e la pagina «Feed»; finisce su
   «Draw».
2. «Skip» c'è dal primo passo ma per 5 secondi non si tocca e conta alla
   rovescia, «Skip (5)»…«Skip»; il conto si ferma mentre il telefono
   chiede qualcosa sopra l'app (la posizione).
3. Visto fino in fondo o saltato, il telefono lo ricorda
   (`tour-seen.json`): non torna alle aperture dopo.
4. «Guide» sulla prima pagina di «Profile», con e senza account (con un
   account subito sotto «Settings»): apre
   «How MuW works» (il testo di «Help») con sopra «Watch the tour», che
   chiude «Profile» e rifà il tour, con «Skip» subito.
5. I testi nuovi in en/it/de/es/fr, approvati dall'utente prima del merge.
   **Approvati dall'utente il 2026-10-10** («sì vanno bene, procedi»),
   nelle cinque lingue.

## Criteri di accettazione

- [x] Alla prima apertura, finita l'animazione, il tour parte su «Draw».
- [x] Nei primi 5 secondi «Skip» non si tocca e mostra i secondi che
      mancano; dopo chiude il tour.
- [x] Ogni passo mette nella luce la parte vera che descrive; una parte
      sotto il bordo viene portata in vista scorrendo.
- [x] «Explore» e «Feed» si vedono davvero; il tour finisce su «Draw».
- [x] Alla seconda apertura il tour non c'è.
- [x] «Guide» in «Profile» apre la guida anche senza account; «←» torna a
      «Profile»; «Watch the tour» rifà il tour.
- [x] Test deterministici del tour, del ricordo e della guida; tutti i
      controlli dell'app verdi.
- [x] Testi approvati dall'utente; provato nel simulatore.

## File toccati

```
apps/mobile/src/tour/                      (nuovi: Tour, tourParts, tourSteps,
                                            tourTexts, tourSeen, tourPlace,
                                            useTour, GuideRow, TourPartView,
                                            TourScrollView e i loro test)
apps/mobile/src/intro/Root.tsx
apps/mobile/src/screens/Pager.tsx
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/profile/ProfileHome.tsx     («Guide» sotto «Settings»,
                                            richiesta dell'utente del 2026-10-10,
                                            dopo il merge di TASK-121)
apps/mobile/src/route/ShapeTiles.tsx
apps/mobile/src/route/DistanceStepper.tsx
apps/mobile/src/about/AboutScreen.tsx
apps/mobile/src/about/AboutInProfile.test.tsx
apps/mobile/src/theme/tokens.ts            (i colori fissi `scrim`, `onScrim`)
apps/mobile/src/theme/palettes.test.ts
docs/tasks/TASK-266.md
docs/DECISIONS.md
docs/STATUS.md
docs/UI.md
```

Non si toccano `route/RoutePanel.tsx` (TASK-234 C), `about/content/*`,
`screens/ProfileLayer.tsx` e `i18n/*` (TASK-262 A e C): i testi nuovi
stanno in `tour/tourTexts.ts`.

## Fuori scope

- Riscrivere «How MuW works» (i testi di `about/content/*` sono di
  TASK-262 A e C in questo momento).
- Un tour per la corsa (non si può mostrare senza un percorso disegnato) e
  per «Paddle» oltre a quello che «Draw» già mostra.
- Togliere «Help» da «Settings»: resta, con «Watch the tour» anche lì.

## Esito

In `main` con la #479 (`1f64621e`, 2026-10-10). Alla prima apertura il
tour parte dopo l'animazione: otto passi sulle schermate vere, «Skip»
bloccato per 5 secondi con il conto alla rovescia, poi non torna più.
«Guide» è subito sotto «Settings» con un account (spostata lì su richiesta
dell'utente del 2026-10-10, dopo il merge di TASK-121) e in fondo senza;
«Watch the tour» rifà il tour. Testi approvati dall'utente, provato nel
simulatore (iPhone 17e, tono chiaro, «Paddle»), jest 3135/3135.

Emerso: la regola `react-hooks/refs` del lint scambia per un ref ogni
oggetto passato a un hook il cui risultato fa da ref, per questo lo
scorrimento è un componente di classe (`TourScrollView`); una pagina che
entra scorrendo va misurata finché è ferma, non dopo un tempo fisso.
Chi aggiorna l'app vedrà il tour una volta, come chi la scarica. Su
`preview` dal 2026-10-10 nel gruppo `ab5706fc` (da `1f64621e`), pubblicato
dal coordinatore su richiesta dell'utente.
