# TASK-162 — La mappa sotto i disegni di «Feed»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-162-feed-map`
**Dipende da**: TASK-156 (in `main`)

Chiesto dall'utente il 2026-10-02: «Nella sezione feed sotto le immagini,
bisogna aggiungere la mappa».

## Obiettivo

Ogni scheda di «Feed» mostra, sotto la linea gialla del disegno, la mappa
vera della zona in cui è stato corso, con lo stile scuro dell'app.

## Contesto da leggere

- `docs/UI.md` «Le pagine» e «Il tema»
- `apps/mobile/src/feed/FeedPost.tsx`, `src/screens/FeedScreen.tsx`
- `apps/mobile/src/map/mapPage.ts`, `mapStyle.ts`
- `apps/mobile/src/explore/RouteThumb.tsx` (`thumbSegments`)

## Cosa fare

1. `src/feed/feedMapPage.ts`: la pagina MapLibre che fotografa una mappa, e
   l'inquadratura che la mette sotto la linea di `thumbSegments`.
2. `src/feed/FeedMaps.tsx`: la coda delle foto, la WebView nascosta, il
   hook `useFeedMap`.
3. `FeedPost.tsx`: la foto sotto la linea, e il credito della mappa.
4. `FeedScreen.tsx`: la WebView sotto l'elenco.
5. Test; `UI.md`, ADR, `STATUS.md`.

## Criteri di accettazione

- [x] Una scheda con la foto arrivata mostra la mappa sotto la linea; senza
      foto resta com'era (linea sul fondo scuro).
- [x] La linea cade sulla mappa dove la disegna `thumbSegments`: un test lo
      misura con la proiezione di MapLibre, entro mezzo punto.
- [x] Il credito «OpenFreeMap © OpenMapTiles Data from OpenStreetMap» è su
      ogni mappa.
- [x] Una foto alla volta; una foto fatta non si rifà; senza rete o senza
      MapLibre le schede restano senza mappa, senza errori.
- [x] Nessuna dipendenza nuova, nessuna richiesta all'API, colori dai
      token, testi in inglese; `App.tsx` non toccato.
- [x] Test dell'app verdi; lint, typecheck e prettier puliti.
- [x] Visto su un simulatore con Expo Go.
- [ ] Prova sull'iPhone.

## File toccati

```
apps/mobile/src/feed/feedMapPage.ts
apps/mobile/src/feed/feedMapPage.test.ts
apps/mobile/src/feed/FeedMaps.tsx
apps/mobile/src/feed/FeedMaps.test.tsx
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/feed/FeedPost.test.tsx
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/screens/FeedScreen.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-162.md
```

## Fuori scope

- Una mappa da muovere dentro la scheda, o aprire il disegno sulla mappa
  grande: arriva con TASK-118.
- Cambiare i colori della mappa: sono i token di `map.*`, gli stessi della
  mappa grande.
- Tenere le foto sul telefono fra un'apertura e l'altra.
- `App.tsx` (di TASK-160): «Feed» resta costruita all'apertura dell'app.

## Esito

Fatto (2026-10-02, ADR-0131). Ogni scheda di «Feed» ha la mappa sotto la
linea: strade, acqua, verde e nomi dei paesi, con lo stile dell'app. La fa
una pagina MapLibre nascosta sotto l'elenco, che fotografa una mappa alla
volta e sparisce quando non ce ne sono da fare; la scheda mette la foto
sotto la linea e il credito in basso a destra. Nel simulatore (iPhone 17e,
Expo Go) le prime sette foto arrivano in 2 s alla prima apertura, in meno
di 1 s dopo, anche con «Feed» fuori schermo. 31 test nuovi nell'app (739 →
770), lint, typecheck e prettier puliti.

**Da provare sull'iPhone**, con l'app ripubblicata: le mappe sotto le
linee, e scorrere l'elenco fino in fondo (nel simulatore non si è potuto
scorrere: le foto delle schede più in basso si fanno mentre si scorre).

Seguiti:

- La mappa è scura e quieta come quella grande: se in «Feed» si vuole più
  leggibile, è una scelta dei token `map.*` (vale per tutte e due) o di uno
  stile solo per le foto.
- Le foto restano in memoria finché l'app è aperta. Con il feed vero
  (TASK-118) serve un tetto, o tenerle sul telefono.
- TASK-163 mostra `FeedPost` in «Explore»: le mappe arrivano anche lì,
  perché le foto le fa la pagina di «Feed», che il `Pager` tiene montata,
  e ogni foto porta la sua misura.
- Android non è stato provato.
