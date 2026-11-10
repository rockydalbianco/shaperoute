# TASK-419 — I 1000 disegni del catalogo e la selezione (Explore, parte B)

**Stato**: In corso — primo giro sul server (#966, 155); secondo giro in
`main` (#1028, 386); terzo giro in PR (530 in 63 città); restano i 20
contorni dopo TASK-418 B e una quindicina di casi da 21 km da Overpass
**Fase**: 4 · **Branch**: `docs/TASK-419-catalog-seed` (proposta, #951),
`feat/TASK-419-catalog-seed` (codice e primo giro, #966),
`docs/TASK-419-first-round` (questi documenti) · **ADR**: ADR-0347 e la sua
precisazione
· numeri dal Coordinatore (2026-11-08) · sessione «task-419-catalog-seed»,
avviata dal Coordinatore su «Sì, avviale» dell'utente

Parte B del grande catalogo di «Explore» chiesto dall'utente il 2026-11-08
(`.claude/prompts/catalogo-esplora.md`, non tracciato). Le altre parti:
TASK-418 (forme e parole nuove), TASK-420 (la pagina nell'app).

## Obiettivo

In `catalog/seed/` ci sono i 200–400 disegni migliori, scelti **dall'utente**
fra circa 1000 generati dal motore in città italiane ed europee (almeno 3 per
città), con la licenza ODbL; il filtro automatico che li ha preselezionati ha
test deterministici; il catalogo sul server è pronto da aggiornare ma non
pubblicato.

## Contesto da leggere

- `catalog/README.md` (il formato dei file e `seed_catalog`)
- `docs/MAPS.md` «Overpass: come si scarica», «Zone scaricate prima»
- `docs/ROUTE_ENGINE.md` §5 («Funzione obiettivo», «Misura della somiglianza»)
- `services/route-engine/route_engine/seed_catalog.py` (si usa, non si tocca)
- ADR-0097, ADR-0107, ADR-0130, ADR-0132, ADR-0347

## Cosa fare

1. **Lo strumento** `tools/catalog_seed.py` (nuovo, usa `seed_catalog` e il
   motore a runtime; la parte di filtro e selezione in sola libreria
   standard, così `pytest tools` la prova senza il motore):
   - le città con una piazza pubblica ciascuna: le 14 del seme, le altre
     italiane di `prefetch_zones.ITALY` più Rovereto, poi capitali e città
     turistiche europee;
   - il **piano** dei casi (≈1000): nelle città del seme tutte le 17 forme a
     5, 10 e 21 km (le sei forme entrate dopo il 2026-10 non sono mai state
     seminate) più le frasi di `PHRASES`; nelle città nuove un nucleo di
     forme che leggono bene a 5 e 10 km, le tre semplici a 21 km, un saluto
     locale nei due stili; le forme di TASK-418 quando sono in `main`;
   - il **giro** col motore: una zona per città (quella di
     `engine_prepare`), con l'attesa dello slot dalla pagina di stato di
     Overpass come `prefetch_zones`, a lotti di poche città, con pausa, e il
     registro `out/TASK-419/runs.jsonl` che riparte da dove era;
     `--overpass-url` per un mirror. Ogni riga del registro ha in più la
     quota di tratti ripassati oltre quelli della forma e la quota su strade
     grandi;
   - il **filtro**: somiglianza ≥ 0,90, distanza reale entro ±10%, ripassi
     in più ≤ 10%, nessun tratto su `motorway` o `trunk`;
   - la **preselezione**: per città i migliori per punteggio
     (somiglianza − 1,5 × ripassi − scarto di distanza), fino a 8, almeno 3
     dove ce ne sono;
   - i **candidati del 2026-10** (`out/seed_catalog/runs.jsonl`, 683
     disegni) entrano come candidati: costano zero e le loro zone non sono
     più sul Mac.
2. **La pagina di revisione** `tools/catalog_review.py` (nuova, sola libreria
   standard): griglia per città con la miniatura SVG di ogni candidato (i
   punti proiettati in locale, niente tessere), punteggio, misure e casella
   «tieni» già spuntata per la preselezione; un tasto copia la lista delle
   chiavi tenute. La pagina va all'utente, **che sceglie**.
3. **I tenuti**: le chiavi scelte in `tools/catalog_kept.json`; da lì e dai
   registri `catalog_seed.py --write` riscrive `catalog/seed/<città>.json`
   nel formato di `catalog/README.md` (licenza ODbL). Per le città già nel
   seme i file si riscrivono con i tenuti; cuore, cerchio e stella da 5 km
   delle città in evidenza restano (`tools/test_featured_catalog.py`).
4. **Test deterministici** in `tools/test_catalog_seed.py` e
   `tools/test_catalog_review.py`: filtro, punteggio, preselezione, scrittura
   dei file, pagina; nessuna rete, nessun motore.
5. **Il server**: `catalog/` sul server è il bind mount `../catalog` del
   checkout `~/shaperoute` (`deploy/compose.yaml`), letto dall'API
   all'avvio: il catalogo nuovo entra con un `git pull` e un riavvio
   dell'API, senza ricostruire l'immagine. **Non si pubblica** senza il
   «via server catalogo» del Coordinatore (che chiede l'ok all'utente); lo
   lancia l'utente via ssh, sotto.

## Scelte dell'utente

- 2026-11-08, con la pagina di revisione davanti: «ok si» alla preselezione
  dell'agente come primo giro (155 percorsi, fino a 8 per città, almeno 3);
  può aggiungere o togliere chiavi dopo.
- 2026-11-08, via Coordinatore: «Non inserirli come catalogo, inseriscili e
  basta nella lista», «Sì, nella lista»: niente pagina «Catalog» (TASK-420),
  i tenuti compaiono nella lista di «Explore» che c'è, dal catalogo del
  server (ADR-0347, precisazione).
- 2026-11-08, via Coordinatore: «Sì, solo lettura» alla copia delle zone dal
  server alla cache del Mac.
- 2026-11-10: «Vai con la proposta» al secondo giro: i 155 del primo più la
  proposta per 22 città nuove e per le città in evidenza, 386 in tutto.
- 2026-11-10: «Vai con 530» al terzo giro: 8 per ciascuna delle 18 città
  europee nuove (l'alternativa a 3 per città, 440, per restare nei 200–400
  del brief, scartata dall'utente).

## Le zone copiate dal server (sola lettura)

Il 2026-11-08 sera, dal terminale dell'utente (la sessione dell'agente non
può leggere dal server di produzione), con il server fermo per il resto:

```bash
rsync -av --partial --bwlimit=20000 --include='foot_*.graphml' --include='foot_*.pickle' --exclude='*' root@188.245.9.220:shaperoute/data/cache/ /Volumes/T9/Progetti/shaperoute/data/cache/
```

1837 file (tutte le zone a piedi del server, anche quelle chieste dagli
utenti nel mondo), nessun comando che scrive sul server. Servono al secondo
giro: le 52 città italiane, Rovereto e le 10 in evidenza senza Overpass.

## Aggiornare il catalogo sul server (lo lancia l'utente, dopo il via)

**Fatto il 2026-11-08 sera** («via server catalogo» del Coordinatore,
utente «Sì, ok catalogo»), con la variante che porta solo `catalog/`:
`git fetch && git checkout origin/main -- catalog/`, poi il riavvio
dell'API; il log ha detto «155 recommended routes from catalog/seed». Il
checkout del server resta a `8e898de5` per il codice, con `catalog/` di
`6d140645` nell'indice.

```bash
ssh root@188.245.9.220 'cd ~/shaperoute && git pull --ff-only && cd deploy && docker compose restart api && sleep 20 && docker compose logs --tail 50 api | grep -i "recommended routes"'
```

Deve stampare «N recommended routes from catalog/seed» con il numero dei
tenuti (155 dopo il primo giro). `git pull` porta nel checkout anche il
codice entrato in `main` nel frattempo, che però non gira finché non si
fa `docker compose up -d --build` (quello resta col Coordinatore). Poi
dall'app: «Explore» in una città del seme mostra i percorsi nuovi in
«Best near you». Tornare indietro: `git checkout <commit di prima> --
catalog/` e lo stesso `restart`.

## Criteri di accettazione

- [x] Circa 1000 casi pianificati nel registro, in città italiane ed europee
      (1600 candidati dopo il secondo giro, 917 pianificati da TASK-419;
      16 città europee aspettano Overpass).
- [x] Il filtro automatico scarta sotto 0,90, fuori ±10%, con ripassi in più
      oltre il 10% o con tratti su `motorway`/`trunk`; provato con test
      deterministici (40 test, #966).
- [x] Pagina di revisione mandata all'utente; la scelta è sua (primo giro).
- [x] 200–400 disegni in `catalog/seed/*.json`, almeno 3 per città, ODbL
      (530 dopo il terzo giro, scelta dell'utente sopra i 400; almeno 4 per
      città).
- [x] `pytest tools` verde; `test_featured_catalog` verde.
- [x] CI verde; STATUS, task file e ADR aggiornati; Coordinatore avvisato
      (primo giro).

## File toccati

```
tools/catalog_seed.py               (nuovo)
tools/catalog_review.py             (nuovo)
tools/catalog_kept.json             (nuovo: le chiavi scelte dall'utente)
tools/test_catalog_seed.py          (nuovo)
tools/test_catalog_review.py        (nuovo)
catalog/seed/<città>.json           (nuovi; riscritti quelli delle città già nel seme)
catalog/README.md                   (un paragrafo sullo strumento, se il Coordinatore lo lascia)
docs/tasks/TASK-419.md              (nuovo)
docs/DECISIONS.md                   (ADR-0347 in fondo)
docs/STATUS.md, docs/INDEX.md       (le mie righe)
```

`services/route-engine/route_engine/` **non si tocca** (TASK-413 A1,
TASK-414 A, TASK-418): se `seed_catalog.py` dovesse cambiare, lista al
Coordinatore prima.

## Fuori scope

- Le forme e le parole nuove (TASK-418) e la pagina nell'app (TASK-420).
- Pubblicare il catalogo sul server.
- Cambiare il motore, le soglie di `seed_catalog` o il formato dei file.
- Le città fuori dall'Europa oltre a quelle già in evidenza.

## Esito

*Terzo giro (2026-11-10)*: le 16 città europee avevano la zona nella copia
del server (chieste da utenti), Zurigo da Overpass con `--slot-wait-hours 0`
(la pagina di stato di Overpass non risponde agli strumenti da riga di
comando mentre al browser sì; MAPS.md: un tentativo, poi più tardi). 1930
candidati, 1311 passano, 530 tenuti in 63 città (4–11 per città, 7,9 MB).
Restano circa 15 casi da 21 km in 8 città che vogliono una zona nuova.

*Secondo giro (2026-11-10)*: 1600 candidati (327 nuovi dalle zone copiate:
18 città italiane, più Vienna, Praga e Budapest che avevano la zona sul
server; 6 zone da Overpass nella notte del 9: Parigi, Tokyo, Barcellona,
Dubai, Berlino, Lisbona), 1029 passano il filtro, 386 tenuti in 45 città
(almeno 4 per città). Berlino esce da `MISSING` di
`tools/test_featured_catalog.py`. Restano 16 città europee senza zona
(Overpass chiuso dal 9 sera) per un terzo giro, e i contorni in attesa.

*Primo giro (2026-11-08)*: strumenti e 40 test in `main` (#966); 1058
candidati (683 del 2026-10, le sei forme nuove e i 49 contorni di TASK-418
nelle città in cache), 626 passano il filtro, 155 tenuti in 23 città (la
preselezione, accettata dall'utente); 20 candidati dai contorni in
`pending_outlines`. Resta: il «via server catalogo», il secondo giro con le
zone copiate dal server, le città europee quando Overpass risponde.
