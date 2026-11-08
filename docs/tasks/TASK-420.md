# TASK-420 — La pagina del catalogo in «Explore» (grande catalogo, parte C)

**Stato**: In lavorazione · mockup approvato dall'utente il 2026-11-08
(«Sì, approvo»); proposta in PR; il codice dopo il via del Coordinatore
sulla lista dei file
**Fase**: 5 · **Branch**: `docs/TASK-420-catalog-page` (documenti), poi
`feat/TASK-420-catalog-page` (codice)
**Dipende da**: TASK-418 (forme e parole nuove: i nomi e le categorie),
TASK-419 (i 1000 disegni in `catalog/seed/*.json`); nessuna delle due
blocca il codice, che parte dai dati di `catalog/seed` di oggi
**ADR**: ADR-0348 (proposto) · numeri dal Coordinatore il 2026-11-08

## Obiettivo

In «Explore» si apre un catalogo grande e scorrevole di tutti i disegni
che il motore ha già pianificato nelle città, con filtri per città, paese,
categoria, distanza e sport, la ricerca per nome e tre ordinamenti; ogni
scheda mostra la forma, la città, i km, la somiglianza, il cuore dei
preferiti e «Start». Fluido con centinaia di voci.

## Contesto da leggere

- `.claude/prompts/catalogo-esplora.md` (nel checkout principale, non
  tracciato), sezione «Task C»: il brief dell'utente
- `DECISIONS.md` ADR-0348 (questo task), ADR-0097 (il seme del catalogo),
  ADR-0135 (le schede due per riga), ADR-0144 (niente filtri in «Best near
  you»: qui invece ci sono, per scelta dell'utente), ADR-0293 (il look)
- `catalog/README.md`: il formato dei file `seed/<città>.json`
- `UI.md`, «Explore» in «Le due schermate» e «Il look premium»
- `apps/mobile/src/explore/ExploreScreen.tsx`, `RouteCard.tsx`,
  `RouteThumb.tsx`, `ExploreSearch.tsx`, `ExploreTools.tsx` (i chip delle
  città), `src/ui/SheetModal.tsx`, `src/favorites/favoritesDoor.ts`

## Com'è oggi (main `fa3485d7`)

- «Explore» mostra «Best near you»: i percorsi del seme entro 5 km dalla
  partenza (`GET /recommended-routes`), le città in evidenza, gli esempi
  disegnati sul momento, le idee a tema. Non c'è un posto dove vedere
  **tutti** i disegni del catalogo, né filtri (ADR-0144).
- `catalog/seed/` ha 23 città e 312 percorsi (13 italiane e New York con
  tutte le forme; 9 in evidenza con cerchio, cuore e stella). L'API dà a
  ogni percorso l'id `<city>-<shape|word>-<distance_m>-<i>`
  (`recommended.py`, `parse_city`), stabile finché il file non cambia.
- Il cuore dei preferiti vive sulla mappa (`FavoriteHeart`) con la chiave
  fatta dai punti interi del percorso (`favoriteKey`).

## Il mockup approvato (2026-11-08)

Artifact https://claude.ai/artifact/N1g83bkw5P4VwBsAC6NwoW. Tre schermate:

1. **L'ingresso**: in «Explore», sotto il campo di ricerca, una scheda
   larga con cinque disegnini in fila, «Catalog» e «312 drawings in 23
   cities · filters, search»; un tocco apre il catalogo come pagina a sé,
   «←» torna a «Explore».
2. **La pagina**: titolo «Catalog» col conteggio; «Search by name»;
   cinque chip (Country, City, Category, Distance, Sport; un filtro attivo
   diventa chiaro con «×»); l'ordine come interruttore Nearest · Best ·
   Shortest; le schede due per riga come in «Explore»: il disegno giallo
   sul fondo della mappa con la somiglianza in un angolo e il cuore
   nell'altro, «Heart · 10.2 km», «Trento · Italy · 450 m away», il
   bottone giallo «Start». La griglia carica 40 voci alla volta.
3. **Un filtro**: un chip apre un foglio dal basso con tutti i filtri
   (distanza 5 · 10 · 21 km, categoria, sport, paese, città); il bottone
   giallo dice quante voci corrispondono («Show 48 drawings»).

Scelte dell'utente, tutte come proposte: il nome **«Catalog»**, la scheda
d'ingresso, cuore e «Start» sulla scheda, l'ordine come interruttore.

## Cosa fare

1. **Documenti** (questa PR): task file, ADR-0348, STATUS, INDEX.
2. **I dati**: `apps/mobile/scripts/catalog-data.mjs` (Node, senza
   dipendenze) legge `catalog/seed/*.json` e scrive
   `src/explore/catalog.json`: per ogni percorso l'id come lo fa l'API,
   città, paese, forma o parola con lo stile, categoria, `distance_m`,
   `route_m`, somiglianza, partenza, `rotation_deg`, l'anteprima a 48
   punti e la chiave dei preferiti (`favoriteKey` sui punti interi). Si
   rilancia quando TASK-419 cambia il seme.
3. **I filtri e l'ordine** (`catalogFilters.ts`, funzioni pure): paese,
   città, categoria, distanza (5 · 10 · 21 km), sport; ricerca per nome
   (forma nella lingua dell'app, parola, città); ordine per vicinanza
   dalla partenza, per somiglianza, per km; le pagine da 40.
4. **La pagina** (`CatalogScreen.tsx`, `CatalogGrid.tsx` con `FlatList`
   a due colonne, `CatalogCard.tsx` con `RouteThumb`,
   `CatalogFilterSheet.tsx` su `SheetModal`), e la scheda d'ingresso
   (`CatalogEntry.tsx`) in `ExploreScreen.tsx`, sotto la ricerca.
5. **Il tocco** apre il percorso sulla mappa come ogni percorso di
   «Explore» (`onOpen` con un `RecommendedRoute`; il dettaglio arriva da
   `GET /recommended-routes/{id}`); «Start» fa lo stesso: la mappa si apre
   col percorso e il suo «Start» a portata (la partenza immediata vuole
   `App.tsx`, fuori da questo task: seguito). Il cuore chiede il dettaglio
   e passa da `useFavoritesDoor().press`; senza account, «Profile» come
   sulla mappa.
6. **Testi** in inglese con `t()` e le chiavi in `it`, `de`, `fr`, `es`.
7. **Test Jest**: filtri, ricerca e ordine (puri); la griglia che chiede
   la pagina dopo; la scheda (testi, cuore, «Start»); il foglio dei
   filtri; l'ingresso in «Explore».

## Criteri di accettazione

- [ ] In «Explore», sotto la ricerca, la scheda «Catalog» col conteggio;
      un tocco apre la pagina, «←» torna.
- [ ] La pagina mostra tutti i percorsi di `catalog.json` in due colonne,
      a pagine di 40 mentre si scorre, senza mappe sotto le miniature.
- [ ] Ogni filtro riduce la lista e il chip lo dice; il foglio dice quante
      voci corrispondono; «Clear» toglie tutto.
- [ ] La ricerca trova per nome della forma (nella lingua dell'app), per
      parola e per città.
- [ ] Nearest ordina dalla partenza (o dalla città scelta), Best per
      somiglianza, Shortest per km.
- [ ] Un tocco su una scheda apre il percorso sulla mappa; «Start» anche.
- [ ] Il cuore è pieno per un percorso già fra i preferiti e lo tiene o lo
      toglie, con l'account; senza, apre «Profile».
- [ ] Test Jest verdi; `tsc` e `eslint` puliti; nessun colore fuori da
      `tokens.ts`; nessuna dipendenza nuova.

## File toccati

Documenti (questa PR): `docs/tasks/TASK-420.md` (nuovo),
`docs/DECISIONS.md` (ADR-0348), `docs/STATUS.md` (una voce),
`docs/INDEX.md` (una riga).

Codice (`feat/TASK-420-catalog-page`), tutti nuovi in
`apps/mobile/src/explore/` salvo dove detto:

```
apps/mobile/scripts/catalog-data.mjs            (nuovo)
apps/mobile/src/explore/catalog.json            (nuovo, scritto dallo script)
apps/mobile/src/explore/catalog.ts              (nuovo)
apps/mobile/src/explore/catalog.test.ts         (nuovo)
apps/mobile/src/explore/catalogFilters.ts       (nuovo)
apps/mobile/src/explore/catalogFilters.test.ts  (nuovo)
apps/mobile/src/explore/CatalogScreen.tsx       (nuovo)
apps/mobile/src/explore/CatalogScreen.test.tsx  (nuovo)
apps/mobile/src/explore/CatalogGrid.tsx         (nuovo)
apps/mobile/src/explore/CatalogGrid.test.tsx    (nuovo)
apps/mobile/src/explore/CatalogCard.tsx         (nuovo)
apps/mobile/src/explore/CatalogCard.test.tsx    (nuovo)
apps/mobile/src/explore/CatalogFilterSheet.tsx  (nuovo)
apps/mobile/src/explore/CatalogFilterSheet.test.tsx (nuovo)
apps/mobile/src/explore/CatalogEntry.tsx        (nuovo)
apps/mobile/src/explore/CatalogEntry.test.tsx   (nuovo)
apps/mobile/src/explore/ExploreScreen.tsx       (solo l'ingresso)
apps/mobile/src/i18n/it.ts, de.ts, fr.ts, es.ts (solo le chiavi nuove)
```

## Fuori scope

- Le forme e le parole nuove (TASK-418) e i 1000 disegni (TASK-419): la
  pagina li mostra quando `catalog-data.mjs` viene rilanciato sul seme
  nuovo.
- I dati paginati dall'API: solo se `catalog.json` supera il megabyte
  (ADR-0348, «Seguiti»).
- La partenza immediata da «Start» sulla scheda (vuole `App.tsx`).
- Le mappe sotto le miniature (le schede di «Best near you» le hanno): qui
  sono centinaia, restano linee gialle sul fondo della mappa.
- `App.tsx`, `services/`, `catalog/`, i file di altri task.

## Esito

*(a fine task)*
