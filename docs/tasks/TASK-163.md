# TASK-163 — «Explore»: le città in evidenza già disegnate, e il feed mentre una città si disegna

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-163-explore-featured-and-feed` · ADR-0132

Chiesto dall'utente il 2026-10-02: «nella sezione Explore almeno un cuore,
un cerchio e la stella devono essere già disegnate [in] tutte le città che
consigliamo; poi per le città dove la gente deve fare la ricerca, mentre
si stanno scaricando le mappe […] mentre sta caricando fai vedere dei
post, fai vedere i percorsi già fatti, sempre quelli che abbiamo già
tenuto in feed».

Com'è oggi: delle 14 città in evidenza (`FEATURED_CITIES`, `presets.ts`)
solo Roma, Milano e Torino hanno cuore, cerchio e stella nel catalogo. Le
altre 11 (New York, London, Paris, Tokyo, Barcelona, Dubai, Amsterdam,
Berlin, Lisbon, Sydney, San Francisco) li disegnano al tocco, uno alla
volta (ADR-0116): 5–25 s l'uno con la zona sul server. Una città cercata
la prima volta aspetta anche il download della mappa (Vercelli: 94 s), e
in quell'attesa la pagina mostra solo tre righe «Drawing…» / «Next».

## Obiettivo

Toccata una città in evidenza, cuore, cerchio e stella sono già lì, senza
attesa; in una città cercata, finché gli esempi si disegnano, sotto ci
sono dei disegni del feed da guardare.

## Contesto da leggere

- ADR-0097 (il seme del catalogo), ADR-0098 (Explore dal catalogo),
  ADR-0116 (gli esempi di una città), ADR-0119 (le zone sul server),
  ADR-0127 (il feed d'esempio)
- `docs/UI.md` («Explore»), `catalog/README.md`

## Cosa fare

**Parte B — l'app (fatta, vedi «Dove sono arrivato»)**

1. File nuovo `WhileDrawing.tsx`: sotto «EXAMPLES IN …», finché un esempio
   è «Next» o «Drawing…», «MEANWHILE, FROM THE FEED» con 5 disegni di
   `SAMPLE_FEED`, resi da `FeedPost` com'è in «Feed». `FeedPost` e
   `sampleFeed.*` non si toccano (sono di TASK-162).
2. I disegni partono da un punto del feed che dipende dalla città: un'altra
   città, altri disegni per primi.
3. Restano finché non si cambia città: non spariscono sotto il dito
   all'arrivo dell'ultimo esempio; la riga sotto il titolo allora dice
   «The shapes of this city are ready above.». Una città con gli esempi già
   sul telefono, o con percorsi consigliati, non li mostra.

**Parte A — il catalogo (parte dopo TASK-161, paletto del coordinatore)**

4. Con lo strumento del catalogo (`seed_catalog.py`, dove lo lascia
   TASK-161), non con uno parallelo, e con le zone copiate dal server in
   sola lettura (`rsync` da
   `root@188.245.9.220:/root/shaperoute/data/cache/`, come TASK-161 per
   Genova e New York; niente si scrive sul server, niente chiave
   dell'API): prima si guarda quali città in evidenza mancano ancora delle
   tre forme dopo TASK-161 (New York forse no), poi quelle entrano in `CITIES`
   con una piazza del centro, e si pianificano almeno cuore, cerchio e
   stella da 5 km.
5. Ogni città in evidenza deve avere almeno un cuore, un cerchio e una
   stella nel catalogo, che partono entro 5 km dal centro che l'API dà per
   quel nome (`GET /cities`). Se una forma resta sotto 0,88 (la soglia di
   ADR-0097) si decide nell'ADR di questo task cosa tenere; le 33 linee si
   guardano a occhio (`tools/preview_samples.py`).
6. `cityName` in `recommendedRoutes.ts`: «San Francisco» (oggi solo «New
   York» ha due parole).
7. Un test deterministico: ogni città di `FEATURED_CITIES` ha le tre forme
   nel catalogo del repository.
8. Dopo il merge: `catalog/` aggiornato sul server e API riavviata
   (`DEPLOY.md` F.12). **Lo chiede il coordinatore all'utente.**

## Criteri di accettazione

- [x] In una città senza percorsi consigliati, mentre gli esempi si
      disegnano, sotto ci sono 5 disegni del feed; restano quando l'ultimo
      esempio arriva; con percorsi consigliati non compaiono.
- [x] «Ask for a route» resta in fondo alla pagina.
- [ ] Ognuna delle 14 città in evidenza ha nel catalogo almeno un cuore, un
      cerchio e una stella entro 5 km dal suo centro (test).
- [ ] Toccata una città in evidenza nell'app, con l'API aggiornata, le tre
      forme sono nell'elenco senza «Drawing…».
- [x] Test verdi (app 780); lint, tipi e formattazione.

## File toccati

```
apps/mobile/src/explore/WhileDrawing.tsx
apps/mobile/src/explore/WhileDrawing.test.tsx
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/ExploreScreen.test.tsx
apps/mobile/src/explore/recommendedRoutes.ts        (solo cityName, parte A)
apps/mobile/src/explore/recommendedRoutes.test.ts   (parte A)
services/route-engine/route_engine/seed_catalog.py  (parte A, dopo TASK-161)
services/route-engine/tests/test_seed_catalog.py    (parte A, dopo TASK-161)
catalog/seed/<città in evidenza>.json               (parte A, dopo TASK-161)
catalog/README.md                                   (parte A, dopo TASK-161)
samples/LOG.md                                      (parte A: il giudizio a occhio)
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-163.md
```

## Fuori scope

- Aprire sulla mappa un disegno del feed da «Explore»: i post si vedono
  come in «Feed»; la mappa sotto ogni post è TASK-162.
- Altre forme o altre distanze per le città in evidenza oltre a quelle
  che servono al criterio (il giro intero è il lavoro di TASK-161).
- Berlino sul server (resta a Overpass, TASK-137): qui serve solo la sua
  zona per pianificare.
- Il feed vero (TASK-118).

## Dove sono arrivato (2026-10-02)

- **In due PR**, per richiesta dell'utente («pubblica intanto la parte dei
  post sul telefono»): la prima porta la parte B in `main`, e si pubblica
  su `preview`; la seconda, dallo stesso task, il catalogo. Il task resta
  «In corso» fino alla seconda.
- **Parte B fatta** sul branch: `WhileDrawing.tsx` e l'aggancio in
  `ExploreScreen.tsx`, con i test. Vista in un simulatore (iPhone 17, Expo
  Go, API del Mac): Pergine Valsugana, «Drawing…» e sotto i disegni del
  feed; arrivati i tre esempi, i disegni restano. Dopo il merge da `main`
  con TASK-162: i disegni in «Explore» hanno la foto della mappa, anche
  senza aver aperto «Feed»; una città con gli esempi già sul telefono non
  mostra i disegni. App 780 test verdi.
- **Parte A ferma**: aspetta TASK-161 in `main` (`catalog/seed/`,
  `catalog/README.md` e `seed_catalog.py` sono suoi). Fatto solo
  `cityName` («San Francisco»), che non è di nessuno.
- **I centri che l'app usa** (`GET /cities` sull'API del Mac, 2026-10-02):
  le forme del catalogo devono partire entro 5 km da questi.

  | Città | Centro `(lat, lon)` |
  |---|---|
  | New York | 40.7127, -74.0060 |
  | London | 51.5074, -0.1278 |
  | Paris | 48.8535, 2.3484 |
  | Tokyo | 35.6769, 139.7639 |
  | Rome | 41.8933, 12.4829 |
  | Milan | 45.4642, 9.1896 |
  | Torino | 45.0678, 7.6825 |
  | Barcelona | 41.3826, 2.1771 |
  | Dubai | 25.2647, 55.2924 |
  | Amsterdam | 52.3731, 4.8925 |
  | Berlin | 52.5174, 13.3951 |
  | Lisbon | 38.7078, -9.1366 |
  | Sydney | -33.8698, 151.2083 |
  | San Francisco | 37.7879, -122.4075 |

  New York nel seme parte da Union Square (40.7359, -73.9911), a 2,9 km
  dal centro che dà l'API: dentro i 5 km.
- **TASK-162 è in `main`** (#173): `FeedPost` tiene le props `post` e
  `width`; la foto della mappa la fa `FeedMapShooter`, montato in
  `FeedScreen`, e arriva anche alle schede di «Explore». Niente da
  adattare. Se si volessero i disegni senza foto in «Explore», TASK-162
  ha offerto una prop facoltativa.

## Esito

*(a fine task)*
