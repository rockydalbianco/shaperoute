# TASK-441 — «Explore» a 2000 disegni: parole, penna alzata, bici, canoa, nuoto

**Stato**: In lavorazione — parte A in `main` (#1149, 2026-11-11): 1963 percorsi; resta il server; poi B
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
| B | `walks` e `activity` nel catalogo: parole di 5–8 lettere a penna alzata, bici 30–50 km, canoa e nuoto | API, shared-types, app, `tools/` | server, poi OTA |
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

## Dove siamo

*2026-11-11*: **parte A in `main`** (#1149, merge del Coordinatore dopo il
sì dell'utente; documenti in una PR a parte, ADR-0347 precisazione C).
Giro delle parole dalle 14:21 alle 16:10 dal worktree
`.claude/worktrees/TASK-441-a`.

**Resta per la parte A, sul server** (un sì dell'utente, dal Coordinatore):
i file di `catalog/` e l'immagine nuova (l'ordine misto è codice), nessuna
migrazione. Controlli dopo: il log dice «1963 recommended routes from
catalog/seed»; `GET /recommended-routes?lat=45.4642&lon=9.19` dà 60
percorsi con 48 nomi diversi, i primi 48 tutti diversi.

**Poi la parte B**: il turno su API, shared-types e app lo dà il
Coordinatore dopo «#1130 in main»; prima mandargli la lista dei file (la
#1139 di TASK-435 B tocca `schemas.py`, `app.py` e
`packages/shared-types/src/index.ts`). ADR-0366.
