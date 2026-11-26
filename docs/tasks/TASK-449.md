# TASK-449 — Anteprima dal vivo della sagoma in «Draw»

**Stato**: In lavorazione · parte 0 (scelte di prodotto) il 2026-11-26
**Fase**: 5 · **Branch**: parte 0 `docs/TASK-449-part-0`; parte A
`feat/TASK-449-a-live-preview`; parte B `feat/TASK-449-b-picture-preview`
**Dipende da**: TASK-361 (l'anteprima in scala di «Draw»), TASK-442 (la
sagoma fantasma), TASK-162 (le immagini di mappa del Feed)
**ADR**: ADR-0412 (dal Coordinatore, 2026-11-26) · numero del task dal
Coordinatore l'11 novembre 2026 (I2 di `out/prova-app-2026-11-11/PROPOSTE.md`); avviato
dall'utente il 2026-11-26 («Avvia la 449»)

## Obiettivo

Idea I2 della prova dell'11 novembre 2026: «mentre cambiano i km, la sagoma
si allarga sulla mappa di Crea, prima di calcolare». Oggi «Draw» è un modulo
a tutta pagina senza mappa (la mappa grande aspetta nascosta sotto), e
l'anteprima della 361 (`ShapePreview`, un riquadro di 112 punti con due
strade finte) disegna la forma sempre alla stessa grandezza: cambiano solo
la barra di scala e «≈ 0,9 × 0,8 km». Alla fine: in «Draw» c'è un pezzo di
mappa vera attorno alla partenza, con la sagoma sopra in grandezza reale,
che cresce o si stringe a ogni − e + della distanza.

Il principio non cambia: l'anteprima è solo la forma ideale, mai un
percorso. L'app non calcola strade; il motore decide dove va la forma.

## Scelte dell'utente (2026-11-26)

Una domanda alla volta, con la proposta dell'agente; le parole sono sue.

1. «Dove vive l'anteprima: A, pezzo di mappa vera, o B, schema che cresce?»
   → **«A, mappa vera»**. Il riquadro è largo quanto la scheda e mostra le
   strade vere attorno alla partenza; la sagoma ci sta sopra in grandezza
   reale e cresce a ogni tocco di − e +; quando non entra più la mappa si
   allontana di uno scatto. Senza partenza resta lo schema di oggi.
   L'immagine della mappa viene dalla rete e può arrivare un attimo dopo la
   sagoma. Scartata anche una terza strada (il modulo come foglio sopra la
   mappa viva): rifarebbe tutta la pagina.
2. «Metto la riga "Più o meno qui: il percorso segue le strade." sotto la
   mappa: sì, con la riga, o no, niente testo?» → **«No, niente testo»**.
   Nessun testo nuovo: la sagoma è tratteggiata come quella sotto il
   risultato (442), un pallino giallo sulla partenza, e resta «≈ L × A km».
3. «L'anteprima sulla mappa vale anche per le immagini, come seconda parte:
   sì, anche immagini, o solo le forme?» → **«Sì, anche immagini»**. Parte
   A le forme del catalogo, parte B le immagini tracciate. Per le parole
   non cambia niente (le lettere le ha solo il motore); «A mano libera» è
   già sulla mappa vera.
4. «Dopo "Disegna", l'attesa animata della 442: sì, resta com'è, o sagoma
   sulla mappa?» → **«Sì, resta com'è»**. L'anteprima vive solo in «Draw».

Conseguenze della scelta 1, proposte dall'agente, in attesa del sì
dell'utente nel riepilogo:

- l'anteprima segue km, forma e partenza;
- sull'acqua e sulla neve (`isPlacedFree`) resta lo schema di oggi: lì il
  server mette la forma dove trova posto, non alla partenza.

## Come funziona

- **Dove sta la sagoma**: la partenza è sul primo punto del contorno
  (`lookOf(...).start`), la forma a nord in alto, lunga quanto la distanza
  chiesta. È il primo piazzamento che il motore prova (ROUTE_ENGINE.md §3),
  non quello che sceglierà: il motore può girarla, cambiare il punto del
  contorno che sta sulla partenza e correggere la scala. I conti sono in
  metri sul piano tangente alla partenza (`mapdraw/plane.ts`,
  `mapdraw/figure.ts`), mai in gradi.
- **Il riquadro** guarda un pezzo di terreno a scatti: ogni scatto è largo
  il doppio del precedente ed è centrato sul contorno alla distanza più
  grande che contiene. Dentro uno scatto la mappa sta ferma e la sagoma
  cresce; passato il limite, la mappa si allontana.
- **La mappa** è un'immagine, non una mappa viva: la scatta la pagina
  nascosta che già fa le immagini del Feed (`feed/FeedMaps.tsx`,
  `useFeedMap`; la scheda delle pagine ha già il suo `FeedMapShooter`).
  Un'immagine per partenza, forma e scatto: i tocchi di − e + dentro uno
  scatto non passano dal ponte della WebView. Finché l'immagine non c'è, la
  sagoma è sul fondo scuro della mappa.
- **La sagoma** è disegnata dall'app (segmenti tratteggiati, token
  `shapeGhost`; il pallino della partenza `route.color`), ridisegnata a
  ogni cambio della distanza: al più 148 punti di contorno.
- **Quando non c'è**: senza partenza, sull'acqua e sulla neve, o per una
  parola, resta quello che c'è oggi.
- Nessun testo nuovo, nessuna dipendenza, nessun cambio al motore, all'API
  o al contratto. Solo JS/TS: l'impronta iOS resta `5e1b5ce5`.

## Parti

- **0** — scelte dell'utente e questo file (PR di soli documenti).
- **A** — le forme del catalogo: la funzione pura, il componente, l'aggancio
  in `RouteChoice` (prop `start`), una riga in `App.tsx`.
- **B** — le immagini tracciate: lo stesso pezzo di mappa sotto il contorno
  dell'immagine (`ImageChoice`), dopo la A.
- **Chiusura** — PR di soli documenti: `STATUS.md`, `COMPLETATI.md`,
  `UI.md`, la voce dell'ADR, stato `Done`.

## Criteri di accettazione

- [ ] Forma, distanza e partenza danno un contorno in WGS84 col primo punto
      sulla partenza, lungo quanto la distanza, a nord in alto; il conto è
      in metri sul piano (`livePreview.test.ts`).
- [ ] Dentro uno scatto il riquadro non cambia e la sagoma cresce con la
      distanza; oltre, il riquadro raddoppia; il contorno sta sempre dentro
      il riquadro (`livePreview.test.ts`).
- [ ] Con una partenza e una forma del catalogo «Draw» mostra il pezzo di
      mappa con la sagoma tratteggiata e il pallino; cambiando i km la
      sagoma cambia grandezza senza chiedere un'altra immagine finché lo
      scatto è lo stesso (`LivePreview.test.tsx`).
- [ ] Senza partenza, sull'acqua e sulla neve resta `ShapePreview`
      (`LivePreview.test.tsx` o il test di `RoutePanel` toccato).
- [ ] Parte B: un'immagine tracciata, con partenza e distanza, ha lo stesso
      pezzo di mappa sotto il suo contorno.
- [ ] Nessun testo nuovo; nessun colore scritto a mano.
- [ ] `tsc` pulito, test dei file toccati verdi; nella PR come è stato
      misurato il ridisegno (immagini chieste per tocco, tempo del
      ridisegno della sagoma più lunga).
- [ ] Sì dell'utente su ciò che si vede (screenshot dal simulatore, col
      turno del Coordinatore) prima di «pronta».

## File toccati

Approvati dal Coordinatore il 2026-11-26. `App.tsx` è a turno: una riga
sola, dentro la PR della parte A; se ne serve più di una ci si ferma.

Parte A:

- `apps/mobile/src/route/livePreview.ts` (nuovo)
- `apps/mobile/src/route/livePreview.test.ts` (nuovo)
- `apps/mobile/src/route/LivePreview.tsx` (nuovo)
- `apps/mobile/src/route/LivePreview.test.tsx` (nuovo)
- `apps/mobile/src/route/RoutePanel.tsx` (la prop `start` di `RouteChoice`
  e la scelta fra `LivePreview` e `ShapePreview`)
- `apps/mobile/App.tsx` (una riga: `start` a `<RouteChoice>`)

Parte B:

- `apps/mobile/src/route/ImageChoice.tsx`
- `apps/mobile/src/route/RoutePanel.tsx` (partenza e distanza a
  `ImageChoice`)
- il test di `ImageChoice` (nuovo o quello che c'è)

Documenti (PR di soli documenti): `docs/tasks/TASK-449.md`,
`docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md`,
`docs/archive/COMPLETATI.md`.

## Fuori scope

- L'attesa e la sagoma del risultato della 442; `MapView.tsx`,
  `map/mapPage.ts`, `ShapeGhost.tsx`.
- Un'anteprima per le parole (servirebbero le lettere del motore).
- La pagina «Draw» come foglio sopra la mappa viva.
- `feed/FeedMaps.tsx` e `feedMapPage.ts`: si usano come sono.
- Motore, API, `engine.zip`, i18n, `app.config.ts`, dipendenze.

## Dove sono arrivato

- 2026-11-26: letto il codice su `origin/main` (`aed5ca3f`); nessuna PR né
  worktree sulla 449. Quattro risposte dell'utente (sopra). Sì del
  Coordinatore alla lista dei file, ADR-0412, turno di `App.tsx` per una
  riga; `RoutePanel.tsx` e `ImageChoice.tsx` liberi (la riga di AGENTI.md
  su #1190 è vecchia). La PR di soli documenti della parte 0 la apre il
  task e la unisce il Coordinatore. Il simulatore si chiede a lui, in coda
  dopo 469 e un'altra sessione. In attesa: il sì dell'utente al riepilogo
  (le due conseguenze).
