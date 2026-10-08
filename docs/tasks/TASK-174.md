# TASK-174 — La mappa sotto le schede di «Explore»

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-174-explore-card-map`
**Dipende da**: TASK-162 (la foto della mappa), TASK-167 (le schede), in `main`

Chiesto dall'utente il 2026-10-02: «Nella sezione explore, quando ci sono i
vari sample, mettimi sotto anche la mappa», poi «nel senso sotto
all'immagine, mettimi la mappa con scritto il nome del paese». Numeri
assegnati dal coordinatore (ADR-0142).

## Obiettivo

Ogni scheda di «Explore» con un disegno mostra, sotto la linea gialla, la
mappa vera della zona, con i nomi dei paesi: negli esempi di una città
(«EXAMPLES IN …») e in «Best near you». Come in «Feed» (TASK-162).

## Contesto da leggere

- `docs/UI.md` «Le due schermate» punto 3 («Explore») e «Le pagine»
- ADR-0131 (la foto della mappa), ADR-0135 (le schede)
- `apps/mobile/src/explore/RouteCard.tsx`, `CityExamples.tsx`,
  `ExploreScreen.tsx`
- `apps/mobile/src/feed/FeedMaps.tsx`, `feedMapPage.ts`

## Cosa fare

1. `RouteCard.tsx`: con `map`, la foto di `useFeedMap` sotto la linea; il
   nome della foto viene dall'inquadratura, non dall'`id` del percorso.
2. `CityExamples.tsx` ed `ExploreScreen.tsx`: le schede chiedono la mappa;
   il credito della mappa una volta sola, accanto alle schede.
3. Negli esempi, il nome del paese sotto il titolo della scheda.
4. Test; `UI.md`, ADR, `STATUS.md`.

## Criteri di accettazione

- [x] Una scheda di «Explore» con la foto arrivata mostra la mappa sotto la
      linea; senza foto resta com'era (linea sul fondo scuro).
- [x] Una scheda senza disegno («Drawing…», «Next», «Not drawn») non chiede
      nessuna foto.
- [x] Le schede di «Favorites» restano come sono: la mappa si accende con
      `map`, che solo «Explore» passa.
- [x] Il credito «Maps: OpenFreeMap © OpenMapTiles · Data from
      OpenStreetMap» c'è una volta accanto alle schede che hanno un disegno,
      e non c'è quando non ce ne sono.
- [x] Negli esempi di una città la scheda pronta dice il paese («Genova»)
      sotto forma e km.
- [x] Nessuna dipendenza nuova, nessuna richiesta all'API, colori dai
      token, testi in inglese; `FeedMaps.tsx`, `FeedPost.tsx` e `App.tsx`
      non toccati.
- [x] Test dell'app verdi; lint, typecheck e prettier puliti.
- [x] Visto su un simulatore con Expo Go.
- [ ] Prova sull'iPhone.

## File toccati

```
apps/mobile/src/explore/RouteCard.tsx
apps/mobile/src/explore/RouteCard.test.tsx
apps/mobile/src/explore/CityExamples.tsx
apps/mobile/src/explore/CityExamples.test.tsx
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreScreen.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-174.md
```

## Fuori scope

- La mappa nelle schede di «Favorites» (stesso componente, basta `map`: va
  chiesto all'utente, e va controllato che la pagina delle foto sia montata
  mentre «Profile» è aperto).
- Cambiare i colori della mappa o dei nomi: sono i token di `map.*`.
- Un tetto alle foto tenute in memoria, o tenerle sul telefono.
- Togliere dalla coda le foto di una città che non si guarda più.

## Esito

Fatto (2026-10-02, ADR-0142). Le schede di «Explore» con un disegno hanno la
mappa sotto la linea: strade, acqua, verde e nomi dei paesi, con lo stile
dell'app. Le foto le fa la pagina nascosta di «Feed» (TASK-162), che il
`Pager` tiene montata: «Explore» non ha una pagina sua. Il credito della
mappa non è su ogni foto come in «Feed»: una scheda è larga mezzo telefono,
e il credito copriva i nomi dei paesi; sta una volta sola, sopra le schede
di «Best near you» e sotto quelle degli esempi. Negli esempi la scheda
pronta dice anche il paese sotto forma e km.

Nel simulatore (iPhone 17e, Expo Go, API sul Mac): a Trento le 27 foto di
«Best near you» arrivano in 1,6 s dopo l'elenco, con «Feed» due pagine più
in là; a Genova, senza percorsi consigliati, cuore e cerchio hanno la mappa
con «Genova» scritto sopra appena disegnati. 8 test nuovi nell'app (906 →
914), lint, typecheck e prettier puliti.

**Da provare sull'iPhone**, con l'app ripubblicata: le mappe sotto le
schede, in una città con percorsi e in una con gli esempi.

Seguiti:

- Le foto restano in memoria finché l'app è aperta, una per scheda vista:
  con molte città aperte di fila serve un tetto (già scritto in TASK-162).
- Cambiata città, le foto chieste per quella di prima si fanno lo stesso,
  prima di quelle nuove: con le tile già scaricate sono decimi di secondo
  l'una; se sull'iPhone si nota, la coda di `FeedMaps` va accorciata.
- TASK-176 toglie i filtri da `ExploreScreen.tsx`: il credito sta fra i
  filtri e le schede, e resta sopra le schede.
- La mappa in «Favorites»: da chiedere all'utente.
- Android non è stato provato.
