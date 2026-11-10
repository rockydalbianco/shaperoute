# TASK-431 — La pagina «Compass» più bella: la freccia che punta dove guardi, le tre schede con i disegni

**Stato**: Codice in `main` · 2026-11-10 · #1081 (`5747259d`); documenti
nella PR di `docs/TASK-431-docs`. Restano l'OTA di produzione (col sì
dell'utente) e la prova sul telefono, l'ultimo criterio.
**Fase**: 5 · **ADR**: ADR-0359 · numeri dal Coordinatore («Coordinatore
(fork)», 2026-11-10) · seguito di TASK-422

## Obiettivo

Chiesto dall'utente il 2026-11-10, provando su iPhone l'OTA di produzione
del mattino: «ok funziona ma bisogna migliorare l'estetica delle tre
sezioni, e sulla mappa come indicazione della nostra posizione ci deve
essere una freccia nella quale si capisce cosa e dove sta puntando come
direzione; magari usa un po' di colori per migliorare l'estetica e fai sì
che sia tutto più ordinato e bello».

Il difetto vero: su «Compass» la mappa gira con la bussola, ma la freccia
della posizione seguiva solo la traccia GPS degli ultimi 10 m, e la mappa le
mandava la direzione solo con un fix nuovo. Da fermi, o appena partiti, la
freccia non diceva dove si guardava.

## Scelte (dell'utente)

Su un'anteprima con due varianti (2026-11-10), l'utente ha scelto la
**«B»**: freccia bianca grande dentro un anello azzurro, con un cono azzurro
davanti. Nella stessa anteprima, approvate con lei: le tre schede con un
disegno sopra il nome e la pagina aperta segnata da una linea azzurra; la
punta rossa della freccia del nord. I pulsanti della corsa («Pocket»,
«Pause», «Music») erano già tondi con il disegno: non cambiano.

## Scelte tecniche (dell'agente, ADR-0359)

- **Due token nuovi** in `tokens.ts`, nei due toni: `you` (azzurro, chi
  corre: anello, cono, schede) e `north` (rosso, la punta del nord). Né
  giallo (il percorso) né ciano («Start here»). Contrasti ≥ 3:1 in ogni tono
  e passo (`palettes.test.ts`).
- **Messaggio nuovo `face`** alla pagina della mappa: la direzione di
  «Compass» (o null fuori). La freccia gira lì anche senza un fix nuovo e
  apre il cono; un fix con la direzione della traccia non la sovrascrive;
  con null il cono si chiude e il fix dopo rigira la freccia come la
  traccia. `stopFollow` dimentica la direzione.
- **La direzione è quella della mappa** (`useHeadingUpMap` la espone come
  `facing`): la freccia sta sempre in alto, girata con la mappa, e cambia
  insieme a lei (4°, 400 ms). Null col nord in alto e fuori pagina.
- **Un solo disegno di freccia** per «Compass» e «Map», il cono solo su
  «Compass». Il riquadro è largo come il cono (160 pt) e lascia passare le
  dita (`pointer-events: none`).
- **Disegni delle schede fatti di View** (`RunPageGlyphs.tsx`): l'app non ha
  icone né SVG; nascosti a VoiceOver.

## Criteri di accettazione

- [x] Su «Compass» la freccia punta dove punta la mappa, anche da fermi, e
      apre il cono; fuori dalla pagina e col nord in alto il cono è chiuso.
- [x] La freccia è la «B» su tutte le pagine con la mappa; il cono solo su
      «Compass».
- [x] Le tre schede hanno il loro disegno; la pagina aperta è azzurra con
      la linea; le altre grigie. Alte come prima (56 pt), larghe uguali.
- [x] La punta della freccia del nord è rossa.
- [x] Colori solo da `tokens.ts`; nessuna dipendenza nuova; niente di
      nativo; le righe SRI di `mapPage.ts` non toccate.
- [x] Test deterministici: `face` (messaggio, pagina, MapView), `facing`
      del hook, i disegni e la linea delle schede, i contrasti dei token.
- [ ] Prova sul telefono (dell'utente) dopo l'OTA.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapPageFacing.test.ts          (nuovo)
apps/mobile/src/map/messages.ts
apps/mobile/src/map/messages.test.ts
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/MapViewFacing.test.tsx         (nuovo)
apps/mobile/src/map/NorthArrow.tsx
apps/mobile/src/map/NorthArrow.test.tsx
apps/mobile/src/map/useHeadingUpMap.ts
apps/mobile/src/map/useHeadingUpMap.test.tsx
apps/mobile/src/screens/RunDashboard.tsx
apps/mobile/src/screens/RunDashboard.test.tsx
apps/mobile/src/screens/RunPageGlyphs.tsx          (nuovo)
apps/mobile/src/theme/tokens.ts
apps/mobile/src/theme/palettes.test.ts
docs/UI.md
docs/tasks/TASK-431.md
```

Dopo il merge, in una PR di soli documenti: ADR-0359 intero in «Voci
nuove» di `docs/DECISIONS.md` con la sua riga nell'Indice, una riga in
`docs/INDEX.md`, una riga in `docs/archive/COMPLETATI.md`.

## Verifica

Test dei file toccati (34 suite, 256 test) e `tsc` verdi. La grafica è stata
guardata su un'anteprima fatta con l'SVG e i colori veri del codice; non
ancora in un simulatore né sul telefono.

## Fuori scope

- Un cono che si allarga quando la bussola è poco precisa.
- Cambiare i pulsanti della corsa o i numeri di «Map» e «Data».
