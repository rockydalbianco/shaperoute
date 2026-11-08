# TASK-419 — I 1000 disegni del catalogo e la selezione (Explore, parte B)

**Stato**: In corso — proposta (solo documenti), poi il codice
**Fase**: 4 · **Branch**: `docs/TASK-419-catalog-seed` (proposta), poi
`feat/TASK-419-catalog-seed` (codice e i file del seme) · **ADR**: ADR-0347
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
5. **Il server**: il catalogo nuovo entra con la prossima immagine dell'API
   (`catalog/seed` sta nell'immagine); si prepara, **non si pubblica** senza
   l'ok dell'utente e il via del Coordinatore.

## Criteri di accettazione

- [ ] Circa 1000 casi pianificati nel registro, in città italiane ed europee.
- [ ] Il filtro automatico scarta sotto 0,90, fuori ±10%, con ripassi in più
      oltre il 10% o con tratti su `motorway`/`trunk`; provato con test
      deterministici.
- [ ] Pagina di revisione mandata all'utente; la scelta è sua.
- [ ] 200–400 disegni in `catalog/seed/*.json`, almeno 3 per città, ODbL.
- [ ] `pytest tools` verde; `test_featured_catalog` verde.
- [ ] CI verde; STATUS, task file e ADR aggiornati; Coordinatore avvisato.

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

*(a fine task)*
