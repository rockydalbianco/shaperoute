# TASK-441 — «Explore» a 2000 disegni: parole, penna alzata, bici, canoa, nuoto

**Stato**: In lavorazione — A sul server (1261); B1 (parole a penna alzata, 1546) **in produzione dal 2026-11-12** (#1184 sul server col passo 10, #1185 nell'OTA 12); **B2 (bici fino a 30 km) in lavorazione**: strumento e API scritti, app nella bozza #1248, giro dei disegni fermo ad aspettare Overpass
**Fase**: 5 · **Branch**: `feat/TASK-441-a-explore-2000` (parte A); una PR
per parte · **ADR**: ADR-0366 (i due campi nuovi del catalogo, parte B) ·
numeri dal Coordinatore il 2026-11-11 · seguito di TASK-419

## Obiettivo

Il catalogo di «Explore» passa da 572 a circa 2000 disegni: molte più
parole, parole lunghe a penna alzata, percorsi lunghi in bici, forme in
canoa e a nuoto. Le liste di parole e i temi li approva l'utente.

## Contesto

L'utente, 2026-11-11: «Lavora tanto anche su parole e amplia il settore
explore con parole, frasi anche con l'alzata di penna e anche nuove
immagini, magari anche trend topic. Lavoro anche se più chilometri tipo 50 km
in bici, sul nuoto, canoa: arriviamo a 2000 immagini».

Da leggere: `catalog/README.md`, `tasks/TASK-419.md` (lo strumento, il
filtro, il passo «catalogo» sul server), `tasks/TASK-311.md` (la misura
delle parole), ADR-0347, ADR-0130, ADR-0157 (penna alzata). La proposta
intera, con le liste: `out/explore-2000/proposta.md` (checkout principale,
non tracciato).

## Com'è oggi (main `88d0a492`)

- 572 percorsi in 63 città, tutti a piedi, al massimo 21 km; 30 forme e
  solo 55 parole (CIAO 33, LOVE 8).
- Il registro di TASK-419 (`out/TASK-419/runs.jsonl`, copiato nel checkout
  principale) ha 878 disegni che passano il filtro e non sono tenuti: 776
  di forme che il motore ha o di parole, 102 di 35 contorni mai registrati.
- Sul filtro del catalogo le parole su una riga passano così, per
  lunghezza (registro di TASK-419): 2 lettere 4/4, 3 lettere 14/14,
  4 lettere 95/106, 5 lettere 29/131, 6 lettere 0/56.
- Il motore scrive solo A–Z (niente spazio, niente cifre), al massimo 8
  lettere, almeno 3 km a lettera; parole e immagini sull'acqua le rifiuta.
- Il seme non ha né le camminate fra le lettere (`walks`) né lo sport
  (`activity`): i percorsi in bici stanno a parte in `catalog/muw_routes`.
- L'API non ha un filtro delle parole (TASK-311 C e D non sono partite):
  le liste sono scelte a mano.

## Le parti

| Parte | Cosa | Tocca | Uscita |
|---|---|---|---|
| A1 | i 776 già disegnati che passano il filtro | catalogo | passo «catalogo» sul server |
| A2 | parole corte (2–4 lettere) su una riga nelle 63 città, la migliore dei due stili | `tools/`, catalogo | come A1, stessa PR |
| B1 | `walks` nel catalogo: le parole a penna alzata, fino a 6 lettere, solo quelle che si leggono; due PR, prima il server poi l'app | API, esempi condivisi, `tools/`, catalogo; poi app | server, poi OTA |
| B2 | `activity` nel catalogo: **solo bici, 20–30 km** (scelta dell'utente del 2026-11-12); due PR, prima il server poi l'app | API, esempi condivisi, `tools/`, catalogo; poi app | server, poi OTA |
| B3 | bici a 40–50 km: il limite del motore da 30 a 50 km e le zone bici grandi | `services/route-engine`, contratto, app | **da chiedere al Coordinatore** (PR del motore, dell'utente) |
| C | motore: spazio nelle frasi, cifre, forme nuove a tema, i 35 contorni in attesa | `services/route-engine` | **task e ADR a parte**, da chiedere al Coordinatore |

## Parte A — cosa fare

1. `tools/catalog_words.py` (nuovo, usa `catalog_seed.py` senza cambiarlo):
   le parole per città (quelle sue, quelle della lingua, un turno di una
   lista comune con stagione e parole del momento), il giro col motore dalle
   zone foot di `data/cache` senza scaricare niente, e la proposta delle
   chiavi: le tenute, poi A1 (`spare`), poi A2 (`best_words`).
2. Il giro: `bash out/TASK-441/run.sh` (un processo, `nice -n 10`,
   ripartibile; registro `out/TASK-441/runs.jsonl`, log `run.log`). 1326
   prove.
3. La pagina di revisione (`tools/catalog_review.py`) all'utente, col sì
   sulle liste di parole **prima del merge**.
4. `tools/catalog_kept.json` con le chiavi scelte (`--propose`);
   `catalog/seed/*.json` riscritti da `catalog_words.py --write` sui due
   registri.
5. «NEAR YOU»: l'API ne dà già al massimo 60 (`MAX_ROUTES`), le più simili
   prima. Con 130 disegni a Milano le prime sarebbero quasi tutte cerchi e
   cuori: proposta all'utente, **prima la migliore di ogni forma e parola,
   poi la seconda…** (`recommended.py` + test, stessa PR).
6. Prima della PR: tempo d'avvio e memoria dell'API con 1348 e con 2000
   percorsi (richiesta del Coordinatore), scritti qui sotto.

## Cosa costa il catalogo all'API

`out/TASK-441/measure_api.py <cartella del seme>` (checkout principale): il
tempo di `RecommendedCatalog.from_dir`, la memoria residente in più, una
`near` più una `page` da Milano. Sul Mac, col giro delle parole in corso:

| Seme | Percorsi | File | Lettura | Memoria | `near` + `page` |
|---|---|---|---|---|---|
| `main` | 572 | 8,8 MB | 0,16 s | +57 MB | 3,5 ms |
| A1 | 1348 | 21,6 MB | 0,62 s | +134 MB | 14,4 ms |
| A1 + A2 (questa PR) | 1963 | 32,6 MB | 0,43 s | +218 MB | 6,1 ms |

L'ultima riga è misurata a giro finito, col Mac scarico: per questo è più
veloce di quella sopra.

Il catalogo sta solo nel processo principale (i route worker nascono dal
fork server, senza). A 2000 percorsi: circa 32 MB di file e +200 MB di
memoria. Quasi tutta è dei punti tenuti come tuple di float (104 byte a
punto): tenerli in un `array('d')` li porterebbe a 16 byte, circa 35 MB a
2000 percorsi, senza cambiare i file. **Coordinatore, 2026-11-11**: il
server ha 7,7 GB, 6,2 disponibili, il contenitore dell'API ne usa 627 MB:
+150–200 MB non pesano, l'`array('d')` non si fa in questa PR; se il
catalogo cresce ancora, a parte.

## Con quale motore sono nati i disegni

Serve se un cambio del motore chiede di rifarne una parte (TASK-447, «via i
baffi», in coda: penalizza andata e ritorno sullo stesso arco e gli anelli
piccoli alla partenza; da decidere con l'utente se passa prima o vale solo
per le richieste nuove).

- **A2**, le parole di `out/TASK-441/runs.jsonl`: motore `8ab61d8e87f9`
  (codice `b4967ef32e9a`, `main` `88d0a492`; `out/TASK-441/fingerprint.py`),
  l'11 novembre 2026.
- **A1**, dal registro di TASK-419: ogni riga ha `planned_at` e `source`
  (`2026-10` il seme di ottobre, `TASK-419` i giri dell'8–10 novembre,
  `TASK-418 outline` i contorni).
- I baffi il filtro li conta già: `extra_doubled`, la quota di strada
  ripassata oltre quella che la forma ripassa di suo, scarta sopra il 10 %.

## Criteri di accettazione (parte A)

- [x] `pytest tools` verde (550); `tools/test_catalog_words.py` copre
      parole, piano, A1, A2 e la proposta senza rete né motore.
- [x] Il giro delle parole finito: registro in `out/TASK-441/runs.jsonl`
      (1326 prove, nessun errore).
- [x] Sì dell'utente sulle liste di parole e sull'ordine di «NEAR YOU»
      (2026-11-11).
- [x] L'ordine misto in `near` e dentro ogni città in `page`
      (`recommended.varied`), con test; le pagine si uniscono ancora.
- [x] `catalog/seed/*.json` riscritti; `test_featured_catalog` verde.
- [x] Avvio e memoria dell'API misurati e scritti qui.
- [x] CI verde; numero nuovo dei percorsi detto al Coordinatore per il
      passo «catalogo» (1963).

## File toccati (parte A)

```
tools/catalog_words.py            (nuovo)
tools/test_catalog_words.py       (nuovo)
tools/catalog_kept.json
catalog/seed/<città>.json
catalog/README.md
services/api/shaperoute_api/recommended.py   (l'ordine misto)
services/api/tests/test_recommended.py
packages/shared-types/fixtures/recommended-routes.json   (l'ordine: il secondo cuore dopo CIAO)
apps/mobile/src/explore/ExploreRecommended.test.tsx      (prendeva «l'ultimo» dell'esempio: ora CIAO per nome)
docs/tasks/TASK-441.md            (nuovo)
```

`tools/catalog_seed.py` e `services/route-engine/` non si toccano.

## Scelte dell'utente

- 2026-11-11, «Sì, vai»: le liste di parole di
  `out/explore-2000/proposta.md` (quelle di `tools/catalog_words.py`, senza
  LFG) e l'ordine misto di «NEAR YOU»: prima la migliore di ogni forma e
  parola, poi la seconda, e così via.
- 2026-11-11, «Sì, vanno bene»: i disegni nuovi delle due pagine
  (`review-new-words.html`, `review-already-drawn.html`) entrano tutti,
  anche le 60 parole che in una città compaiono nei due stili (l'altra
  scelta era «Togli i doppi», 1903).
- 2026-11-11, viste le parole nell'app dopo il merge di #1149, nella
  sessione «Forme generate strane» (che lo riporta così): «Le forme che
  hai aggiunto non vengono bene come le altre … copia il metodo», poi «Sì,
  toglile». Le 702 parole aggiunte (615 di A2, 87 di A1) erano a riga
  unica con le lettere unite e non si leggevano; gli esempi di città
  (`services/api/shaperoute_api/city_examples.py`) le scrivono a penna
  alzata, tonde, 3 km a lettera. Escono dal catalogo; nella parte B tutte
  le parole si rifanno con quel metodo.
- 2026-11-11, sui passi dopo la correzione: merge «ok procedi garzie»;
  server dopo la #1155 con 1261 «si va bene»; parte B e le 55 parole di
  prima da rifare a penna alzata «si procedi e ifalle».
- 2026-11-11, vista la pagina di prova: «Sì, rifai il giro».
- 2026-11-12, «Sì, così»: la B2 è **solo bici, subito fino a 30 km**, e i
  40–50 km un passo a parte. Canoa e nuoto non entrano nel catalogo: con
  lo sport «Paddle» o «Open water swim» «Explore» mostra già laghi e
  spiagge con otto forme l'uno. I disegni in bici si vedono quando lo
  sport è «Bike».
- 2026-11-12, «Sì, vanno bene»: le 340 parole a penna alzata entrano nel
  catalogo. Viste le due pagine (`parole-che-entrano.html`,
  `parole-scartate.html`) e il campione grande (`campione-grande.html`:
  57 parole disegnate grandi, per ogni lunghezza le meno somiglianti,
  quelle di mezzo e le più somiglianti).

## Com'è uscita la parte A

- **1963 percorsi** in 63 città (erano 572): 1206 forme e 757 parole, 79
  parole diverse (erano 55 disegni di parole). Somiglianza media 0,96.
- **A1, +776**: tutti i disegni del registro di TASK-419 che passano il
  filtro. In 60 casi la stessa parola nella stessa città entra nei due
  stili (tondo e a blocchi): con l'ordine misto il secondo arriva dopo.
- **A2, +615**: 663 coppie città-parola provate nei due stili (1326 prove),
  615 con almeno uno stile che passa. Per lunghezza, prove che passano:
  2 lettere 168/174, 3 lettere 539/600, 4 lettere 432/552.
- Milano ne ha 91, Roma e Bari 62, la città più piccola 9. «NEAR YOU» ne
  mostra sempre al massimo 60, la migliore di ogni forma e parola per prima.
- Gli id dei percorsi (`<città>-<nome>-<distanza>-<posto nel file>`)
  cambiano dove il file è cresciuto, come a ogni giro di TASK-419: i 15
  disegni di «Feed» ritrovano il loro percorso per città, forma e lunghezza
  (provato: 14 su 15 fra i primi 21 di «NEAR YOU»; `trento-star-5000-0` non
  c'era già più in `main`).
- `exploreCatalogEdit.test.ts` (app) passa su tutti i 1963: ognuno ha il
  suo «Edit the drawing»; 10 s sul Mac, tempo massimo 60 s.
- `main` intanto ha il motore di TASK-436 (#1106, stessi percorsi provati):
  i disegni di A2 restano quelli del motore `8ab61d8e87f9`.
- Le due pagine coi soli disegni nuovi, per l'utente:
  `out/TASK-441/review-new-words.html` (615) e
  `out/TASK-441/review-already-drawn.html` (776), checkout principale.

## Le parole tolte (2026-11-11 sera, #1155)

Dalla sessione «Forme generate strane», che ha fatto la correzione:

- Prova a Milano col metodo degli esempi di città (`pen_up`, `round`,
  3 km a lettera; `out/TASK-441/penup/`, checkout principale): BACI,
  FAST, COOL, STAR si leggono, somiglianza 0,97–1,00 contro 0,91–0,96 a
  riga unica, 5 s l'una. Confronto: `out/TASK-441/penup/milano.html`.
- `tools/catalog_kept.json` tiene le 572 di prima più le **689 forme** di
  A1: **1261 percorsi**, 55 parole (quelle di prima). Seme riscritto con
  `catalog_words.py --write`; Milano 71, la città più piccola 4.
- Il catalogo non tiene `walks`: senza, l'app unirebbe le lettere a
  piedi come prima. Per questo le parole aspettano la parte B, che dà il
  campo al catalogo e poi rigenera tutte le parole a penna alzata (anche
  le 55 di prima, da decidere con l'utente).
- `catalog_words.py --propose` rimette ancora le parole a riga unica: **non
  usarlo per le parole** fino alla parte B.
- I numeri di «Com'è uscita la parte A» qui sopra (1963, 757 parole, 91 a
  Milano) sono quelli del merge di #1149, prima della correzione.

## Parte B1 — le parole a penna alzata (ADR-0366)

Divisione approvata dal Coordinatore il 2026-11-11: B1 le parole, B2 bici,
canoa e nuoto; B1 in due PR, **prima il server, poi l'app e l'OTA**.

**La prova** (2026-11-11 sera, `out/TASK-441/penup/`): 30 parole in quattro
città, come gli esempi di città (`city_examples.py`: tonde, `pen_up`, 3 km
a lettera). Fino a 6 lettere passano nelle città grandi (0,92–1,00); a 7
(FOREVER) restano fra 0,85 e 0,89 dovunque; a 8 serve una zona più grande
di quelle in cache. L'utente: «Sì, rifai il giro».

**Il giro** (`bash out/TASK-441/run-pen-up.sh`, 2026-11-11 notte, un'ora e
venti): 1047 parole da 2 a 6 lettere in 63 città, comprese quelle che il
catalogo aveva a riga unica. 1011 disegnate (36 senza zona in cache:
Overpass è chiuso apposta), **761 passano il filtro**: per lunghezza
85/89, 267/315, 261/328, 113/179, 35/100. Il filtro guarda la lunghezza
del solo disegno: i tratti fra le lettere aggiungono in media il 20%.

**Quelle che si leggono**: il filtro non lo dice. A Levico HI e SI a 0,92–
0,94 non si leggono; a Nizza YES a 0,99 nemmeno. Le 761 sono state lette
una per una su fogli da 45, alla grandezza di una scheda dell'app,
**senza il nome sotto** e raddrizzate come le raddrizza l'app
(`rotation_deg`, fino a ±30°): una parola entra solo se ogni lettera si
riconosce. **340 su 761** (per lunghezza 60, 117, 132, 22, 9), in 59
città; somiglianza mediana 0,98 contro 0,94 delle scartate. Le chiavi sono
in `tools/catalog_pen_up_read.json`. Delle 44 coppie città-parola che il
catalogo aveva a riga unica, 19 tornano a penna alzata (CIAO era in 33
città, ora in 10).

**Il catalogo**: 1546 percorsi (1206 forme, 340 parole). Costo per l'API:
24,7 MB di file, 0,32 s, +166 MB (a 1261: 19 MB). Da Milano «NEAR YOU» dà
60 percorsi, 50 nomi diversi, i primi 50 tutti diversi, 19 con `gaps`;
119 KB prima della compressione.

**Cosa cambia**:

- `tools/catalog_words.py --pen-up` (`--plan`, `--run`, `--propose`,
  `--page`, `--unread`), `tools/catalog_pen_up_read.json` (nuovo).
- `tools/catalog_seed.py`: `_route_body` scrive `walks` quando la riga li
  ha (tre righe, permesso del Coordinatore). Prova: `--write` in una
  cartella a parte dai registri di prima dà 63 file identici byte per byte
  a `catalog/seed` di `main` (sha256 dei file in fila `ef27c63fe76807c5`).
- API (`recommended.py`): `walks` nel dettaglio, `gaps` nell'anteprima
  delle liste (ogni lettera fino a 32 punti, i tratti fra le lettere fuori);
  tutti e due mancano dalla risposta di un percorso a riga unica, che resta
  identica. Esempi nuovi: `recommended-routes-pen-up.json`,
  `recommended-route-pen-up.json`.
- `exploreCatalogEdit.test.ts`: una parola a pezzi non è un anello;
  «Edit the drawing» la prende tutta in una riga, tratti compresi, chiusa
  dal lato che torna alla partenza, come le parole degli esempi di città.
  **Limite noto**: modificarla lettera per lettera non si può.

**L'app** (branch `feat/TASK-441-b1-app-pen-up`, PR #1185): `gaps` alle schede in `ExploreScreen.tsx` e `route/NearYou.tsx`,
`pen_up` in `toRequest` (`explored.ts`) per una parola con `walks`, due
commenti in `recommendedRoutes.ts`. Senza l'OTA le schede uniscono le
lettere con un tratto dritto; la mappa le mostra già staccate (`toResult`
porta `walks`).

### File toccati (B1, PR del server)

```
tools/catalog_words.py, tools/test_catalog_words.py
tools/catalog_pen_up_read.json                          (nuovo)
tools/catalog_seed.py                                   (tre righe: `walks`)
tools/catalog_kept.json, catalog/seed/<città>.json, catalog/README.md
services/api/shaperoute_api/recommended.py, services/api/tests/test_recommended.py
services/api/tests/fixtures/catalog_pen_up/trento.json  (nuovo)
packages/shared-types/fixtures/recommended-routes-pen-up.json, recommended-route-pen-up.json  (nuovi)
apps/mobile/src/route/exploreCatalogEdit.test.ts
docs/tasks/TASK-441.md
```

### File toccati (B1, PR dell'app)

```
apps/mobile/src/explore/ExploreScreen.tsx, explored.ts, explored.test.ts
apps/mobile/src/explore/recommendedRoutes.ts            (solo commenti)
apps/mobile/src/explore/ExplorePenUpWords.test.tsx      (nuovo)
apps/mobile/src/route/NearYou.tsx
```

### Criteri di accettazione (B1)

- [x] Giro finito, registro in `out/TASK-441/pen-up.jsonl`.
- [x] Test deterministici: strumento (39), API (61), l'app sul catalogo.
- [x] I file di oggi identici byte per byte con le tre righe nuove.
- [x] Sì dell'utente alla pagina delle 340 parole
      (`out/TASK-441/penup/parole-che-entrano.html`; le scartate in
      `parole-scartate.html`) **prima del merge**.
- [x] CI verde, merge del Coordinatore (#1184, `defe1357`, 2026-11-12).
- [x] PR dell'app (#1185).
- [x] Passo sul server e OTA, insieme nell'aggiornamento completo (sì
      dell'utente «Sì, oggi», dal Coordinatore): passo 10 alle 12:20Z del
      2026-11-12, OTA 12 alle 12:28Z. Controlli di
      `out/TASK-441/SERVER-B1.md` tutti come attesi (sotto).

## Parte B2 — i disegni in bici (ADR-0366)

**Cosa c'era** (`main` di 2026-11-12): con lo sport «Paddle» o «Open water
swim» «Explore» è `PaddleExplore` (760 laghi e 67 spiagge, otto forme
l'uno; sull'acqua la forma è appoggiata, somiglianza sempre 1): niente da
aggiungere dal catalogo. Con «Bike» mostra il catalogo a piedi (5–21 km) e
le tre idee di «RIDE IT YOURSELF». Il motore disegna in bici da 10 a 30 km
(`activities/cycling.py`).

**La prova** (`out/TASK-441/b2/`, checkout principale): a 25–30 km dalle
zone bici in cache Milano, Trento e Barcellona danno 0,94–0,97 in dieci
secondi a disegno. A 40 e 50 km (solo a Mantova, col limite tolto nello
script di prova e una zona scaricata apposta): cuore 0,92 e 0,90, stella
0,95 e 0,94, cerchio 0,77 e 0,92. Una richiesta di 30 km vuole una zona di
22,7 km di lato, una di 40 km 29,5, una di 50 km 36,5. L'utente: «Sì,
così» (sopra).

**Cosa cambia**:

- `tools/catalog_bike.py` (nuovo): dodici forme per città (`SHAPES`: le
  sette di base più cavallo, gatto, pesce, lumaca, testa di cane), una
  distanza a forma fra 30, 25 e 20 km a turno, sulla rete bici
  (`OsmnxSource.for_activity`), dalla piazza delle stesse 63 città. Chiave
  `città/forma@cycling/distanza`. Filtro: `catalog_seed.reasons` com'è.
  `--plan`, `--run [--downloads N]`, `--page [--whole]`, `--propose`,
  `--write` (legge i quattro registri).
- `tools/catalog_seed.py`: `_route_body` scrive `activity` quando la riga
  lo ha; `city_files` mette le uscite in bici **in fondo** al file della
  città, così un percorso a piedi tiene il posto e quindi l'id. Prova:
  `--write` dai registri di prima dà 63 file identici byte per byte a
  `catalog/seed` di `main` (sha256 dei file in fila `792e815e52dccb22`).
- API (`recommended.py`, `app.py`): un percorso del seme dice `activity`
  (una corsa quando non lo dice). `GET /recommended-routes` e `GET
  /catalog` prendono `activity` (senza: le corse, come prima);
  `RecommendedCatalog.routes` resta «solo le corse», le uscite stanno in
  `others`: `best_routes.py` e ogni lista senza parametro non vedono mai
  una bici. `activity` manca dalla risposta di una corsa, che resta
  identica. Esempi nuovi: `recommended-routes-bike.json`,
  `recommended-route-bike.json`.

**Il giro**: Milano dalla zona in cache, 12 su 12 passano (0,93–1,00). Le
altre 62 città con `zsh out/TASK-441/b2/run-bike.sh` (checkout principale):
una città alla volta, una zona bici a città da Overpass, le piccole prima;
si ferma da solo se una città supera 25 minuti o 2 GB (limiti del
Coordinatore) o se Overpass non dà una zona per un'ora; rilanciato,
riprende dalla città dov'era. Registro `out/TASK-441/bike.jsonl`.

**L'app** (PR dopo il server; `App.tsx` dopo il via del Coordinatore): con
lo sport «Bike», «Explore» chiede le liste con `activity=cycling`.

### File toccati (B2, PR del server)

```
tools/catalog_bike.py, tools/test_catalog_bike.py       (nuovi)
tools/catalog_seed.py                                   (`activity`, le uscite in fondo)
tools/catalog_kept.json, catalog/seed/<città>.json, catalog/README.md
services/api/shaperoute_api/recommended.py, services/api/tests/test_recommended.py
services/api/shaperoute_api/app.py                      (il parametro `activity` sulle due rotte)
services/api/tests/fixtures/catalog_bike/trento.json    (nuovo)
packages/shared-types/fixtures/recommended-routes-bike.json, recommended-route-bike.json  (nuovi)
docs/tasks/TASK-441.md
```

### File toccati (B2, PR dell'app)

```
apps/mobile/src/explore/recommendedRoutes.ts, catalogList.ts, ExploreScreen.tsx
apps/mobile/src/explore/ExploreBike.test.tsx            (nuovo)
apps/mobile/App.tsx                                     (una riga: lo sport a ExploreScreen)
```

«NEAR YOU» sotto la distanza di «Draw» (`route/NearYou.tsx`) non si tocca:
è della corsa soltanto, per scelta già presa (TASK-306). Nessun testo nuovo.

### Criteri di accettazione (B2)

- [x] Test deterministici: strumento (14), API (`test_recommended.py`).
- [x] I file di oggi identici byte per byte con le righe nuove.
- [ ] Giro finito nelle 63 città.
- [ ] Campione grande all'utente per lunghezza (20, 25, 30 km) e il suo sì
      **prima del merge**.
- [ ] `catalog/seed` riscritto, `catalog/README.md`, controlli di sola
      lettura in `out/TASK-441/SERVER-B2.md`.
- [ ] CI verde, merge del Coordinatore; `app.py` reso al Coordinatore.
- [ ] PR dell'app, OTA (sì dell'utente).

## Dove siamo

*2026-11-12, 16:20, B2*: **il giro aspetta Overpass**, giù dalle 10:30
(anche per il server di produzione: TASK-471). Fatta solo Milano (12 su
12), restano 62 città da Trento. Il giro riprova da solo ogni 10 minuti
(`out/TASK-441/b2/run-bike.sh` in un ciclo, registro `run-bike.log`); si è
fermato due volte su richiesta del Coordinatore (11:09–13:08, 13:43–13:50)
e una per il riavvio della sessione. **Scelta dell'utente («Aspetta il
principale»)**: niente specchi. Quello di OpenStreetMap Francia risponde,
ma rifiuta le richieste presentate col nome generico di OSMnx; lo
strumento ha comunque `--overpass-url` (senza attesa del posto libero,
pausa di un minuto fra due città) e `run-bike.sh` legge `OVERPASS_URL`.
**App della B2: bozza #1248** (`feat/TASK-441-b2-app-bike`, CI verde): solo
la bici chiede `&activity=cycling` (`CATALOG_ACTIVITIES`), ogni altro
sport chiede come prima; una riga in `App.tsx`. Resta in bozza finché il
server della B2 non è in `main` e sul server.

*2026-11-12, B2*: branch `feat/TASK-441-b2-bike` (worktree
`.claude/worktrees/TASK-441-b2`), pubblicato senza PR: strumento e API.
Il giro delle 62 città aspetta Overpass (pieno dalle 10:30). **Da fare
quando finisce**: `catalog_bike.py --page` (campione grande) → sì
dell'utente → `--propose` in `tools/catalog_kept.json` → `--write` coi
registri del checkout principale (`--old-log out/TASK-419/runs.jsonl
--words-log out/TASK-441/runs.jsonl --pen-up-log out/TASK-441/pen-up.jsonl
--log out/TASK-441/bike.jsonl`) → `exploreCatalogEdit.test.ts` sul seme
nuovo → README, `SERVER-B2.md`, PR. `docs/API.md` (il parametro) nella PR
di soli documenti dopo il merge.

*2026-11-12, 12:28Z*: **la B1 è in produzione** («server B1 fatto e OTA
uscito», Coordinatore). Passo 10 alle 12:20Z, server a `1eb3e5a8`; OTA 12
di produzione alle 12:28Z con la #1185 (iOS `86033ea0`, Android
`77e8b96b`), anteprima 12 (`4524060c`); fra passo e OTA 8 minuti. Controlli
di sola lettura, tutti come attesi: nel log «1546 recommended routes from
catalog/seed»; da Milano `60 50 50`, 19 parole a penna alzata,
`milano-star-12000-0`; STAR intera con 1093 punti e i tre tratti a penna
alzata `[[389, 506], [714, 811], [888, 912]]`; nessun aeroplano fra le
parole; API a 362 MiB (era 330); nessun Traceback.

*2026-11-12*: **il server della B1 è in `main`** (#1184), entrato col sì
dell'utente alle 340 parole; l'app è la #1185. In produzione non c'è
ancora niente: il server resta al catalogo a 1261 finché non esce l'OTA,
perché un'app senza la #1185 unisce le lettere con un tratto dritto sulle
schede. Attesi dopo il passo: nel log «1546 recommended routes from
catalog/seed»; da Milano `60 50 50`, 19 parole a penna alzata;
`milano-star-12000-0` coi suoi tre tratti. **Poi B2** (bici 30–50 km,
canoa, nuoto, il campo `activity`): prima la lista dei file al
Coordinatore.

*2026-11-11, 22:14Z*: **parte A sul server** («passo 8 fatto», Coordinatore):
checkout `ab5b2983`, nel log «1261 recommended routes from catalog/seed»,
il controllo da Milano dà `60 31 31`; il contenitore dell'API appena
partito usa 345 MB (processo principale 279 MB). «Explore» in produzione ha
il catalogo senza le parole a riga unica e l'ordine misto.

*2026-11-11*: **parte A in `main`** (#1149, merge del Coordinatore dopo il
sì dell'utente; documenti #1153, ADR-0347 precisazione C). Giro delle
parole dalle 14:21 alle 16:10.

**La correzione**: l'utente ha poi tolto le 702 parole nuove (sopra,
«Scelte dell'utente»). La PR è la #1155 di un'altra sessione, sul branch
`fix/TASK-441-a-drop-words`, che lavora nel worktree
`.claude/worktrees/TASK-441-a`: `tools/catalog_kept.json` e
`catalog/seed/**` non si toccano finché il Coordinatore non scrive che è
in `main`. Dopo: 1261 percorsi (572 + 689 forme); una riga di documenti
col numero vero.

**Il server** (un sì dell'utente, dal Coordinatore) aspetta la correzione:
file di `catalog/` e immagine nuova (l'ordine misto è codice), nessuna
migrazione. Controlli dopo: il log dice «1261 recommended routes from
catalog/seed»; i primi disegni di `GET /recommended-routes` da Milano
hanno tutti un nome diverso (i numeri «60 48 48» valevano con le parole:
da ricontare sul seme corretto).

**Poi la parte B**: il turno su API, shared-types e app lo dà il
Coordinatore dopo «#1130 in main»; prima mandargli la lista dei file (la
#1139 di TASK-435 B tocca `schemas.py`, `app.py` e
`packages/shared-types/src/index.ts`). ADR-0366. **Le parole si rifanno
qui, a penna alzata**: prima una pagina di prova all'utente con poche
parole in due o tre città, e solo dopo il suo sì il giro intero. Il
registro di A2 (`out/TASK-441/runs.jsonl`) resta, ma quei disegni non
entrano.
