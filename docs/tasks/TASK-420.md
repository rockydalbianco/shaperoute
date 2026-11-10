# TASK-420 — La pagina del catalogo in «Explore» (grande catalogo, parte C)

**Stato**: **Riaperto il 2026-11-10** come parte D, «tutte le forme in
«Explore»»: app in #1022, endpoint `GET /catalog` in #1027 (parte E,
«Sì, fallo tu» dell'utente); poi il server col sì dell'utente e l'OTA. Prima: pagina costruita (#954), poi tolta
con la #978 per scelta dell'utente del 2026-11-08; documenti in #952
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
- `catalog/seed/` ha 23 città e 350 percorsi (13 italiane e New York con
  tutte le forme; 9 in evidenza con cerchio, cuore e stella). L'API dà a
  ogni percorso l'id `<city>-<shape|word>-<distance_m>-<i>`
  (`recommended.py`, `parse_city`), stabile finché il file non cambia.
- Il cuore dei preferiti vive sulla mappa (`FavoriteHeart`) con la chiave
  fatta dai punti interi del percorso (`favoriteKey`).

## Il mockup approvato (2026-11-08)

Artifact https://claude.ai/artifact/N1g83bkw5P4VwBsAC6NwoW. Tre schermate:

1. **L'ingresso**: in «Explore», sotto il campo di ricerca, una scheda
   larga con cinque disegnini in fila, «Catalog» e «350 drawings in 23
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

## I dati: `catalog.json` e il seme

`apps/mobile/src/explore/catalog.json` è un'**istantanea** di
`catalog/seed/*.json`, scritta da:

```
node apps/mobile/scripts/catalog-data.mjs
```

da qualunque cartella (Node solo, nessuna dipendenza). Il seme resta la
fonte: ogni volta che cambia, lo script si rilancia e il file nuovo va
in PR con la riga «rigenerato da catalog/seed a `<commit>`».

- **Chi lo rigenera**: chi cambia il seme. TASK-419 (i 1000 disegni),
  quando aggiunge città o percorsi, rilancia lo script nella stessa PR o
  in una PR dell'app subito dopo; il task file di TASK-419 lo dice (una
  riga da aggiungere lì, dalla sua sessione). Una città nuova senza paese
  nella tabella `COUNTRIES` dello script esce con la città sola: la
  tabella si allunga nella stessa PR.
- **Il limite**: 426 KB oggi (350 percorsi). **Oltre mezzo megabyte**
  (circa 420 percorsi con l'anteprima a 48 punti) si passa ai dati
  paginati dall'API, come dice ADR-0348 fra le alternative: lo script
  scrive solo l'indice (senza anteprime) e la griglia chiede le anteprime
  a pagine a un endpoint nuovo in `services/api/` (task a sé, lista al
  Coordinatore). Fino a lì, il file viaggia con l'app.
- `catalog.test.ts` controlla che il file sia coerente (id dell'API, una
  forma o una parola, anteprima ≤ 48 punti, la chiave dei preferiti uguale
  a `favoriteKey` sui punti interi del seme).

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
apps/mobile/src/explore/ExploreHeart.test.tsx   (un bottone in più: la scheda)
apps/mobile/src/explore/ExploreScreen.test.tsx  (idem)
apps/mobile/src/tabs/TabSwipeOwners.test.ts     (una riga: i chip scorrono di lato)
```

I tre test esistenti sono toccati perché la scheda d'ingresso è un bottone
in più su «Explore» e i chip dei filtri sono uno scroll orizzontale nuovo,
che il registro di `TabSwipeOwners.test.ts` deve elencare.

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

## Il seguito del 2026-11-10: tutte le forme in «Explore» (parte D)

L'utente, in questa sessione, parole sue: «sì ma io voglio togliere il
catalogo tutte le forme devono essere nella pagina ma non dentro catalogo,
migliora la pagina esterna…». Mockup (https://claude.ai/artifact/QPEGVb9T2soNs2KFQqjnSB)
con due disposizioni; scelta: **«A, griglia per città»**.

**Cosa cambia in «Explore»** (#1022, branch `feat/TASK-420-explore-all-drawings`):

- la pagina è una sola `FlatList` virtualizzata: tutto quello che c'era
  (ricerca, chip delle città, paesi vicini, esempi, «Recommended», le
  schede vicine) è la sua testata, le righe sono quelle del catalogo;
- titolo «Explore», sotto «N drawings in M cities · the nearest first»
  appena il catalogo risponde (altrimenti la riga di prima); sopra le
  schede vicine «NEAR YOU · within 5 km · N»;
- «Ask for a route» è una riga che apre il modulo sotto di sé
  (`AskLine.tsx`): la pagina ora continua, il modulo non sta più in fondo;
- «FARTHER AWAY · N drawings · by city»: il catalogo città dopo città
  dalla più vicina («ROVERETO · 22 km · 8»), due per riga, le stesse schede
  di «Near you» (mappa sotto quando la scheda è a schermo), 40 alla volta
  mentre si scorre (`catalogList.ts`, `FartherAway.tsx`); le vicine non
  compaiono due volte; una pagina fallita lo dice in fondo con «Try again»;
- niente filtri (ADR-0144): i chip delle città e la ricerca in alto.

**Il contratto col server, parte E** (#1027, «Sì, fallo tu» dell'utente
del 2026-11-10: `services/api/shaperoute_api/recommended.py` e `app.py`,
`tests/test_recommended.py`, `packages/shared-types/fixtures/catalog.json`
nuovo, `docs/API.md`; nessuna migrazione, motore non toccato):

```
GET /catalog?lat=<lat>&lon=<lon>&offset=0&limit=40      (limit ≤ 200)
→ { "total": 155, "cities": 23, "routes": [ …come /recommended-routes, con away_m… ] }
```

ordinati per città dalla più vicina a `near` (la città per la sua
partenza più vicina), dentro la città per somiglianza; `total` e `cities`
sull'intero catalogo. Finché l'endpoint non c'è (404, o una risposta che
non è una pagina) la pagina è esattamente quella di prima: la #1022 può
entrare per prima. L'app misura `away_m` dal punto vero, come per
`/recommended-routes` (TASK-363).

**File toccati (#1022)**, nuovi in `apps/mobile/src/explore/`:
`catalogList.ts` + test, `FartherAway.tsx` + test, `AskLine.tsx` + test,
`ExploreFartherAway.test.tsx`; esistenti: `ExploreScreen.tsx`,
`ExploreScreen.test.tsx`, `ExploreHeart.test.tsx`,
`ExploreOwnRoutes.test.tsx` (l'etichetta «NEAR YOU»), `i18n/{it,de,fr,es}.ts`
(chiavi nuove; «Best near you» tolta perché non più mostrata). Solo app,
impronta ferma, nessuna dipendenza nuova.

**Criteri di accettazione della parte D**

- [ ] #1022 in `main`: con un'API senza `/catalog` la pagina è come prima
      (titolo a parte) e i test di `explore` restano verdi.
- [ ] Con l'endpoint sul server: il titolo conta il catalogo, «FARTHER
      AWAY» mostra ogni città dalla più vicina, lo scorrimento carica le
      pagine seguenti, le schede aprono il percorso sulla mappa.
- [ ] #1027 in `main` e sul server (deploy col sì dell'utente).
- [ ] Prova sul telefono con l'OTA, col sì dell'utente.
- [ ] Seguito piccolo: il test di contratto lato app su `catalog.json`
      (`catalogList.test.ts`), quando #1022 e #1027 sono tutte e due in `main`.

**Fuori scope della parte D**: filtri e ordinamenti (ADR-0144); un JSON
nell'app (ADR-0348, superata); la partenza immediata da una scheda.

## Esito

**2026-11-08, Done: pagina costruita, poi tolta.** La pagina «Catalog» è
stata costruita e mergiata (#954, `1df7dbf5`: scheda d'ingresso sotto la
ricerca di «Explore», griglia a due colonne a pagine di 40, ricerca per
nome, cinque filtri in un foglio, ordine Nearest · Best · Shortest, cuore e
«Start» su ogni scheda; i 350 percorsi del seme in `catalog.json`; test
Jest e CI verdi). Lo stesso giorno l'utente ha scelto altrimenti, parole
sue: «Non inserirli come catalogo, inseriscili e basta nella lista»,
confermato con «Sì, nella lista». La #978 toglie la pagina, la scheda,
`catalog.json` e lo script (revert esatto della #954, impronta ferma); i
disegni del seme arrivano nella lista di «Explore» che c'è già («Best near
you» e gli esempi per città) attraverso il catalogo del server, lavoro di
TASK-419. ADR-0348 passa a «Superata». Nessun OTA della pagina. Resta
nella storia di git, se mai servisse: filtri e ordine come funzioni pure
(`catalogFilters.ts`), la griglia virtualizzata, il foglio dei filtri.
