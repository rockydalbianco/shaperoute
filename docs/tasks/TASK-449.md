# TASK-449 — Anteprima dal vivo della sagoma in «Draw»

**Stato**: Done · 2026-11-26 · in «Draw» la forma scelta e il contorno di
un'immagine tracciata stanno su un pezzo di mappa vera attorno alla
partenza e crescono coi km; in `main` (#1598 parte 0, #1593 A, #1627 B),
ciò che si vede approvato dall'utente sugli screenshot. Restano l'OTA di
produzione (Coordinatore, col sì dell'utente), la prova con una foto vera
sul canale preview e l'occhio sul telefono («Cosa resta», in fondo).
**Fase**: 5 · **Branch**: parte 0 `docs/TASK-449-part-0`; parte A
`feat/TASK-449-a-live-preview`; parte B `feat/TASK-449-b-picture-preview`;
chiusura `docs/TASK-449-done`
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

5. Il riepilogo, con due conseguenze della scelta 1 proposte dall'agente:
   «Confermi il riepilogo delle scelte, con le due conseguenze (l'anteprima
   segue km, forma e partenza; su acqua e neve e senza partenza resta lo
   schema di oggi): sì, confermo, o cambia qualcosa?» → **«Sì, confermo»**.
   La risposta l'utente l'ha data nella sessione che smista i task, che
   l'ha riferita parola per parola a questa: non è scritta qui da lui.
   - L'anteprima segue km, forma e partenza.
   - Sull'acqua e sulla neve (`isPlacedFree`) resta lo schema di oggi: lì
     il server mette la forma dove trova posto, non alla partenza.
   Nella stessa domanda gli è stato detto del credito della mappa
   («OpenFreeMap © OpenMapTiles · Data from OpenStreetMap», la riga che c'è
   già sulle mappe del Feed): sta sull'immagine, non è un testo nuovo.
6. Ciò che si vede, sui sei screenshot dal simulatore (cuore a 3, 5 e
   10 km, cavallo, sole a penna alzata, il contorno di un'immagine): «Ti va
   bene come si vede il pezzo di mappa con la sagoma: sì, va bene, o cambia
   qualcosa?» → **«Sì, va bene»**, scritto dall'utente nella sessione del
   task il 2026-11-26.

## Come funziona

- **Dove sta la sagoma**: la partenza è sul primo punto del contorno
  (`lookOf(...).start`), la forma a nord in alto, lunga quanto la distanza
  chiesta. È il primo piazzamento che il motore prova (ROUTE_ENGINE.md §3),
  non quello che sceglierà: il motore può girarla, cambiare il punto del
  contorno che sta sulla partenza e correggere la scala. I conti sono in
  metri sul piano tangente alla partenza (`mapdraw/plane.ts`,
  `mapdraw/figure.ts`), mai in gradi.
- **Il riquadro** guarda un pezzo di terreno a scatti: ogni scatto è largo
  √2 volte il precedente (due scatti, il doppio; `FRAME_STEP` in
  `previewFrame.ts`, da 250 m) ed è centrato sul contorno alla distanza più
  grande che contiene. Dentro uno scatto la mappa sta ferma e la sagoma
  cresce; passato il limite, la mappa si allontana. La partenza sta dentro
  il contorno più grande dello scatto, quindi la sagoma cresce da lì e non
  esce mai dal riquadro. La parte 0 diceva «il doppio»: nel simulatore,
  subito dopo uno scatto doppio, la sagoma restava piccola nel riquadro.
- **La mappa** è un'immagine, non una mappa viva: la scatta la pagina
  nascosta che già fa le immagini del Feed (`feed/FeedMaps.tsx`,
  `useFeedMap`; la scheda delle pagine ha già il suo `FeedMapShooter`).
  Un'immagine per partenza, forma e scatto: i tocchi di − e + dentro uno
  scatto non passano dal ponte della WebView. Finché la prima immagine non
  c'è, la sagoma è sul fondo scuro della mappa. A uno scatto nuovo
  l'immagine di prima resta sotto la sagoma, messa dove cade nel riquadro
  nuovo (`placeIn`), finché arriva la sua: la mappa si allontana subito e
  poi si fa nitida, invece di restare vuota 1–2 s. Solo per la stessa
  partenza. Sull'immagine c'è il credito della mappa (`creditLine()`),
  come su ogni sua immagine, su un fondo del colore della mappa: i nomi
  dei luoghi non si leggono attraverso.
- **La sagoma** è disegnata dall'app (segmenti tratteggiati, token
  `shapeGhost`; il pallino della partenza `route.color`), ridisegnata a
  ogni cambio della distanza: al più 148 punti di contorno. Una forma
  chiesta a penna alzata (`penUp && offersPenUp(shape)`) è disegnata nei
  suoi pezzi, ed è più grande per gli stessi km: i tratti contano una
  volta, non andata e ritorno.
- **Le immagini tracciate** (parte B): sotto l'anteprima della foto, lo
  stesso pezzo di mappa col contorno tracciato (`pictureLook.ts`,
  `OutlineOnMap`), con partenza e distanza. A penna alzata, dove la foto
  ha pezzi, la grandezza viene da contorno e pezzi insieme, come il
  `pen_up.drawn_m` del motore.
- **Quando non c'è**: senza partenza, sull'acqua e sulla neve, o per una
  parola, resta quello che c'è oggi (per un'immagine: solo la sua
  anteprima sulla foto).
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

- [x] Forma, distanza e partenza danno un contorno in WGS84 col primo punto
      sulla partenza, lungo quanto la distanza, a nord in alto; il conto è
      in metri sul piano (`previewFrame.test.ts`). «Lungo quanto la
      distanza» è la lunghezza che il motore dà alla forma
      (`lookOf(...).length`), non quella della linea disegnata: il test
      controlla l'unità, distanza diviso quella lunghezza.
- [x] Dentro uno scatto il riquadro non cambia e la sagoma cresce con la
      distanza; oltre, il riquadro si allarga di √2 (due scatti, il
      doppio); il contorno sta sempre dentro il riquadro, per ogni forma
      del catalogo (`previewFrame.test.ts`).
- [x] Con una partenza e una forma del catalogo «Draw» mostra il pezzo di
      mappa con la sagoma tratteggiata e il pallino; cambiando i km la
      sagoma cambia grandezza senza chiedere un'altra immagine finché lo
      scatto è lo stesso (`LivePreview.test.tsx`).
- [x] Senza partenza, sull'acqua e sulla neve resta `ShapePreview`
      (`LivePreview.test.tsx`).
- [x] Parte B: un'immagine tracciata, con partenza e distanza, ha lo stesso
      pezzo di mappa sotto il suo contorno (`ImageChoice.test.tsx`,
      `pictureLook.test.ts`). Nel simulatore visto con un contorno messo a
      mano; con una foto vera è ancora da provare («Cosa resta»).
- [x] Nessun testo nuovo; nessun colore scritto a mano. La frase per chi
      non vede («{name}, about {size} on the map») è quella della 361.
- [x] `tsc` pulito, test dei file toccati verdi; nella PR come è stato
      misurato il ridisegno (immagini chieste per tocco, tempo del
      ridisegno della sagoma più lunga).
- [x] Sì dell'utente su ciò che si vede (screenshot dal simulatore, col
      turno del Coordinatore) prima di «pronta»: scelta 6.

## File toccati

Approvati dal Coordinatore il 2026-11-26. `App.tsx` è a turno: una riga
sola, dentro la PR della parte A; se ne serve più di una ci si ferma.

Parte A:

- `apps/mobile/src/route/previewFrame.ts` (nuovo; nella lista approvata
  era `livePreview.ts`: accanto a `LivePreview.tsx` i due nomi cambiano
  solo per maiuscole, e su un disco che non le distingue l'import prende
  il file sbagliato)
- `apps/mobile/src/route/previewFrame.test.ts` (nuovo)
- `apps/mobile/src/route/LivePreview.tsx` (nuovo)
- `apps/mobile/src/route/LivePreview.test.tsx` (nuovo)
- `apps/mobile/src/route/RoutePanel.tsx` (la prop `start` di `RouteChoice`
  e la scelta fra `LivePreview` e `ShapePreview`)
- `apps/mobile/App.tsx` (una riga: `start` a `<RouteChoice>`)

Parte B:

- `apps/mobile/src/route/ImageChoice.tsx` (le prop `start` e `distanceM`,
  `OutlineOnMap` sotto l'anteprima della foto)
- `apps/mobile/src/route/RoutePanel.tsx` (partenza e distanza a
  `ImageChoice`; niente partenza sull'acqua e sulla neve)
- `apps/mobile/src/route/ImageChoice.test.tsx` (due test in più)
- `apps/mobile/src/route/pictureLook.ts` e
  `apps/mobile/src/route/pictureLook.test.ts` (nuovi, non nella prima
  lista: approvati dal Coordinatore il 2026-11-26 prima della PR)

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
  dopo 469 e un'altra sessione.
- 2026-11-26: parte A scritta, PR in bozza #1593 (`b2213f68`): test dei
  file toccati 33 su 33, `tsc`, ESLint e Prettier puliti in locale.
  Ridisegno misurato in Node sulle 31 forme: al più 0,19 ms a tocco e 231
  trattini; un tocco dentro uno scatto non chiede immagini. Sì dell'utente
  al riepilogo (scelta 5). Mancano: il verde della CI, gli screenshot dal
  simulatore (in coda dal Coordinatore) e il sì dell'utente su ciò che si
  vede, poi «pronta»; poi la parte B.
- 2026-11-26: la PR della parte 0 (#1595) è stata chiusa e raccolta com'era
  nella #1598 del Coordinatore 3, in `main` (`a6c96894`).
- 2026-11-26: turno del simulatore (iPhone 17e, Expo Go, partenza a
  Trento). Visto e corretto nella #1593: scatti di √2 invece del doppio,
  l'immagine di prima tenuta sotto la sagoma mentre arriva la nuova, il
  fondo sotto il credito; in più la forma a penna alzata nei suoi pezzi.
  Tenendo premuto − per 2,5 s da 21 km: 29 mezzi km con l'anteprima nuova,
  31 con quella di prima. Solo simulatore e bundle di sviluppo: su un
  telefono non è misurato. Sì dell'utente sugli screenshot (scelta 6).
  **#1593 in `main`** (`cfd8f9d7`).
- 2026-11-26: parte B, **#1627 in `main`** (`81d716b6`): test dei file
  toccati 60 su 60, `tsc`, ESLint e Prettier puliti in locale. Nel
  simulatore il contorno era messo a mano (la testa di coniglio del
  catalogo): senza l'API in locale nessuna foto è stata tracciata. Il
  Coordinatore non l'ha tenuta ferma per questo: la prova si fa sull'app di
  prova. Dopo la B, `RoutePanel.tsx` passa a TASK-448 B.
- 2026-11-26: chiusura, PR di soli documenti da `docs/TASK-449-done`.

## Cosa resta

- **OTA di produzione**: del Coordinatore, col sì dell'utente. Solo JS/TS,
  l'impronta iOS resta `5e1b5ce5`.
- **Foto vera: da provare sul preview.** Sull'app di prova, prima dell'OTA
  di produzione: «Image», una foto dalla libreria, e sotto la sua anteprima
  il pezzo di mappa col contorno tracciato; a penna alzata con una foto che
  ha pezzi.
- **L'occhio sul telefono** dopo l'OTA: «Draw» con una forma, − e + tenuti
  premuti (la sagoma cresce, la mappa si allontana a scatti e non resta
  vuota), una partenza cercata lontano, senza rete (la sagoma resta sul
  fondo scuro).
- TASK-509 C (la sagoma nelle tessere) aspettava la 449 in `main`: c'è.
