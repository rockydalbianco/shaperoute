# TASK-076 — Il cuore meno sensibile alla partenza: più partenze vicine, si tiene la migliore

**Stato**: In revisione (PR aperta; collegamento all'API dopo TASK-073)
**Fase**: 4 · **Branch**: `feat/TASK-076-nearby-starts`

## Obiettivo

Il motore prova la forma anche da alcuni nodi della rete vicini alla
partenza (entro circa 100 m) e tiene il percorso migliore; il percorso
comincia e finisce comunque dalla posizione dell'utente, con il breve tratto
di avvicinamento incluso nel percorso, nei km e nel GPX. Tempo entro
PRODUCT.md (≤ 30 s) dove oggi ci sta.

Scelta dell'utente dopo TASK-075: 25–100 m di partenza portano la
somiglianza del cuore da 10 km di Caldonazzo da 0,73 a 0,92.

## Contesto da leggere

- `docs/tasks/TASK-075.md` (Esito e giudizio)
- `docs/ROUTE_ENGINE.md` §5 («Trova dove la forma ci sta»)

## Cosa fare

1. Un modulo nuovo del motore, `route_engine/nearby_starts.py`, che chiama
   il motore senza modificare `optimizer.py` (di TASK-071).
2. Un'opzione della CLI per provarlo (`--nearby N`).
3. Misure prima/dopo: il cuore da 10 km a Caldonazzo e casi di riferimento
   a Trento e Milano da 10 e 15 km; campioni `samples/TASK-076_*`, righe in
   `samples/LOG.md`, pagina di giudizio sì / quasi / no.
4. Il collegamento all'API (`app.py`/`jobs.py`) **solo dopo il merge di
   TASK-073**: se 073 non è in `main`, la PR esce senza, e si fa dopo.

## Criteri di accettazione

- [x] Il modulo sceglie le partenze vicine, pianifica in parallelo, tiene
      la migliore e aggiunge l'avvicinamento (andata e ritorno); test
      deterministici.
- [x] Percorso scelto da una partenza vicina: primo e ultimo punto sul nodo
      della partenza dell'utente, avvicinamento nei metri e nel GPX.
- [x] Tempi prima/dopo misurati sui casi di riferimento e scritti qui e in
      ADR-0071.
- [x] Campioni, righe in `samples/LOG.md` e pagina di giudizio.
- [x] `optimizer.py`, `network.py`, `words.py`, `shapes/`, `services/api`
      non toccati (collegamento all'API a parte, dopo TASK-073).

## File toccati

```
services/route-engine/route_engine/nearby_starts.py      (nuovo)
services/route-engine/tests/test_nearby_starts.py        (nuovo)
services/route-engine/route_engine/__main__.py           (--nearby)
services/route-engine/tests/test_cli.py                  (test di --nearby)
docs/tasks/TASK-076.md
docs/ROUTE_ENGINE.md
docs/STATUS.md            (righe di TASK-076)
docs/DECISIONS.md         (ADR-0071)
samples/TASK-076_*
samples/LOG.md            (righe di TASK-076)
```

Dopo TASK-073, se ci si arriva: una riga in `services/api/shaperoute_api/app.py`
o `jobs.py` e i loro test.

## Fuori scope

- `optimizer.py` (TASK-071), anche dove un interruttore aiuterebbe (vedi
  Esito, «Per dopo»).
- `words.py`, `letters.json`, `network.py`, `image_outline.py`, `shapes/`.
- `apps/mobile`, `packages/shared-types`.
- Zone nuove: le misure usano solo zone già in cache.

## Esito

**Fatto nel motore, non ancora nell'API.** `nearby_starts.plan_nearby`
prova la forma dalla partenza e da 3 nodi vicini in parallelo e tiene il
percorso migliore, con l'avvicinamento (ADR-0071). Dalla CLI: `--nearby 3`.
Il collegamento all'API aspetta il merge di TASK-073.

### Come funziona, in breve

- Partenze vicine: 3 nodi a 25–100 m, uno per settore di 120°, al più
  150 m lungo le strade.
- La partenza dell'utente fa il piano di sempre, nel processo che la
  chiede; ogni vicina ha un processo e fa solo la ricerca da quel nodo, sul
  grafo della partenza (niente anelli né ricerca a 2 km).
- Si aspetta al più 8 s dopo la partenza dell'utente, mai oltre 25 s, e
  nessuno se il suo percorso è già buono. Niente vicine su grafi oltre
  30 000 nodi (Milano) né più processi di quanti ne entrano in memoria.
- Vince una vicina solo con 0,02 di somiglianza in più (distanza contata
  solo oltre il 10%, spostamento della partenza come nella ricerca).

### Numeri

Tempi e somiglianze in ADR-0071. In sintesi: Caldonazzo 10 km, nessuna
vicina batte la partenza (0,86), +3 s; Trento 10 km 0,86 → 0,88, +5–10 s;
Trento 15 km la partenza veniva spostata di 1 km (0,90), ora parte
dall'utente con 57 m di avvicinamento (0,88), +5–30 s; Milano non
cambia. Con poca memoria libera (sotto ~1,5 GB, come nell'ultima serie di
misure) le vicine non partono e tutto resta come oggi.

### Campioni e giudizio

`samples/TASK-076_heart_{10km_caldonazzo,10km_trento,15km_trento}_{start,nearby}_v1.gpx`
e `TASK-076_heart_10km_milano_start_v1.gpx`, righe in `samples/LOG.md`.
Pagina: https://claude.ai/artifact/FsvjRQC2wokCjUG9UChJv4

Giudizio dell'utente (2026-09-26):

| Caso | Dalla partenza | Dalla vicina | Scelto dal motore |
|---|---|---|---|
| Caldonazzo 10 km | sì (0,86) | quasi (0,82) | partenza ✔ |
| Trento 10 km | sì (0,86) | sì (0,88) | vicina, pari all'occhio |
| Trento 15 km | sì (0,90, spostata di 1 km) | quasi (0,88) | vicina: all'occhio peggio |
| Milano 10 km | sì (0,99) | — | partenza |

### Per dopo

- **Scelta di prodotto aperta**: a Trento 15 km il motore preferisce un
  cuore `quasi` che parte dalla porta di casa a uno `sì` che parte a 1 km
  («Start here»). Lo spostamento pesa come nella ricerca (0,1 a 1 km).
  Se debba pesare meno, lo decide l'utente.
- **API** (dopo TASK-073): `plan_nearby(ShapeJob.of_request(request), …)`
  al posto di `plan_route` in `jobs.py`; per le indicazioni usare
  `NearbyPlan.graph` quando vince una vicina.
- **`optimizer.py`** (dopo TASK-071): un interruttore in `plan_shape` per
  la sola ricerca dalla partenza toglierebbe la copia dei suoi ultimi passi
  in `ShapeJob.here`; e la partenza dell'utente fa ancora la ricerca a 2 km
  anche quando la sua è già disegnabile, metà del suo tempo sul cuore.
- **Memoria**: sul PC dell'API (7 GB) le vicine partono solo con ~1,5 GB
  liberi; con l'app Claude e altri agenti aperti spesso non ci sono.
