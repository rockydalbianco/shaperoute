# TASK-180 — Venezia finisce in `engine_error`: nessuna strada va detta, e l'isola va tenuta

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-180-venice-empty-crop` · ADR-0148

Emerso da TASK-168: sul server `draw_examples` ha disegnato gli esempi di
62 città, e **Venezia non riesce**: `engine_error` su cuore, cerchio e
stella, il ritaglio attorno al centro storico è senza nodi.

## Obiettivo

Un ritaglio senza strade finisce in un errore col suo nome, non in
`engine_error`; e la zona di una città su un'isola tiene le strade
dell'isola.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §4, `docs/MAPS.md` («Area scaricata», «Zone
  scaricate prima», «Warning»), `docs/TESTING.md`
- `services/route-engine/route_engine/network.py` (`OsmnxSource.load`,
  `crop`), `zone_crop.py`, `optimizer.py` (`RoadMask`, `plan_shape`)
- `services/api/shaperoute_api/prefetch_zones.py`, `zone_extract.py`,
  `graphs.py`, `errors.py`

## Cosa fare

1. **Riprodurre** con un test deterministico: un ritaglio vuoto e un grafo
   senza archi, dal motore e dall'API.
2. **Un errore col suo nome**: `NoRoadsError`, che è un
   `ShapeNotDrawableError`, da `crop` (nessun nodo nell'area) e da
   `RoadMask` (nessun arco). L'API risponde `shape_not_drawable` senza
   toccare `errors.py` né `app.py`; la CLI dice «No route».
3. **Trovare la causa** del ritaglio vuoto di Venezia, con prove: il
   centro che dà la ricerca delle città, il filtro `foot`, il ponte, come
   OSMnx costruisce il grafo, l'estratto.
4. **Tenere l'isola**: il download di una zona tiene ogni pezzo connesso
   (`retain_all=True`); il pezzo più grande si sceglie nel ritaglio, area
   per area, e chi chiede la zona intera riceve il suo pezzo più grande,
   come prima (`largest_piece`).
5. Documenti: `MAPS.md`, `ROUTE_ENGINE.md` §4, `API.md` (la riga
   dell'errore), ADR-0148, `STATUS.md`.

## Criteri di accettazione

- [x] `crop` e `ZoneCrop.crop` su un'area senza nodi alzano
      `NoRoadsError` (che resta un `ValueError`: il test di prima è verde
      com'era); `RoadMask` su un grafo senza archi pure (test).
- [x] `plan_shape`, `plan_nearby` e la CLI, da una partenza senza strade
      attorno dentro una zona in cache, rifiutano con «there are no roads
      to run on around here»; nessun download (test).
- [x] Un job dell'API da una partenza in mezzo all'acqua finisce `failed`
      con `shape_not_drawable`, non `engine_error` (test via HTTP, sulla
      zona costruita come fa `prefetch_zones --extract`).
- [x] Una zona con una terraferma più grande e un'isola, unite solo da un
      ponte `foot=no`: il file della zona ha i due pezzi, la zona intera
      dà la terraferma come prima, l'area attorno all'isola dà l'isola, e
      un cerchio chiesto dall'isola è disegnato sull'isola (test, motore e
      API). Con il motore di prima gli stessi test falliscono con
      `ValueError: max() iterable argument is empty` e `engine_error`.
- [x] I test che c'erano restano verdi senza cambiare un valore atteso:
      motore 1026 (10 nuovi), API (4 nuovi); ruff e black come la CI.
- [x] Zone di oggi rifatte con la regola nuova danno gli stessi ritagli:
      visto sui dati veri, dalle risposte di Overpass in cache sul Mac
      (vedi Esito).

## File toccati

```
services/route-engine/route_engine/errors.py        (nuovo)
services/route-engine/route_engine/network.py
services/route-engine/route_engine/optimizer.py
services/route-engine/tests/test_no_roads.py        (nuovo)
services/api/shaperoute_api/zone_extract.py         (solo la docstring)
services/api/tests/test_island_zone.py              (nuovo)
docs/MAPS.md
docs/ROUTE_ENGINE.md
docs/API.md                                         (una riga della tabella degli errori)
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-180.md                              (nuovo)
```

## Fuori scope

- Il server: rifare lì la zona di Venezia e i suoi esempi vuole l'ok
  dell'utente (comandi nell'Esito).
- Scegliere nel ritaglio il pezzo **della partenza** invece del più
  grande: cambierebbe i percorsi dove oggi la partenza sta su un pezzo
  piccolo e si aggancia alla rete grande. È un task a parte.
- `prefetch_zones.py` (TASK-195 ne cambia `EXAMPLE_SHAPES`): non toccato.
- Una zona scaricata al momento dall'API resta in memoria col solo pezzo
  più grande fino al riavvio (`ZoneGraphs` tiene quello che `load`
  restituisce); dal disco si legge intera.
- Un'area senza nessuna strada da scaricare (mare aperto, zona non in
  cache): OSMnx non trova dati e l'API dice `map_data_unavailable`.

## Esito

Fatto (2026-10-02). Un'area senza strade è `NoRoadsError`, un
`ShapeNotDrawableError`: l'API dice `shape_not_drawable`, la CLI «No
route: there are no roads to run on around here». Chi scarica una zona
tiene ogni pezzo connesso; il più grande si sceglie nel ritaglio.

**La causa, e come si è vista.**

- *Sui dati veri (OpenStreetMap del 2026-10-02, dall'API di OSM: una
  striscia attraverso il Ponte della Libertà e il suo capo verso Venezia,
  passate per `FOOT_FILTER`)*: a piedi il centro storico non è unito alla
  terraferma. Le carreggiate cadono (`trunk`, `foot=no` o
  `sidewalk:right=separate`); la ciclopedonale resta fino al nodo
  5690409049 (45,44258 N 12,31505 E) e lì continua come way 597743868,
  `highway=cycleway` con `foot=no`, che cade; il marciapiede dell'isola è
  a 5 m, senza un nodo in comune.
- *Sui dati veri*: il centro della ricerca delle città è giusto (45,4372 N
  12,3346 E), e l'area del cuore da 5 km è tutta isola e laguna. L'ipotesi
  del centro sbagliato cade.
- *Nel codice*: OSMnx (`graph_from_polygon`) tiene solo il pezzo connesso
  più grande, se non gli si chiede `retain_all`.
- *Su dati sintetici* (test): una zona costruita come fa `prefetch_zones
  --extract`, con terraferma, isola e ponte `foot=no`, col motore di prima
  perde l'isola e dà `ValueError: max() iterable argument is empty`, cioè
  `engine_error`: il sintomo di Venezia. L'estratto non c'entra.
- *Non verificato*: che nella zona vera di Venezia la terraferma abbia più
  nodi dell'isola (lo dice il ritaglio vuoto del server), e che dal centro
  storico esca un buon cuore da 5 km. Overpass rifiutava le connessioni
  dal Mac (porta 443 chiusa sui due indirizzi, all'inizio del task e di
  nuovo più tardi), la cache del Mac non ha una zona di Venezia, e in
  locale non ci sono né l'estratto né osmium: il download della zona non
  è stato tentato. Durante una prova due richieste del motore sono partite
  per sbaglio verso Overpass, per un'area fuori dalla zona di prova,
  rifiutate alla connessione; da lì ogni prova e ogni test ha il download
  bloccato.

**Le città di oggi non cambiano**, sui dati veri: Trento e Verona a 17 km,
la zona piccola di Verona e Rosolina Mare, rifatte sul Mac dalle risposte
di Overpass in cache (senza rete) con tutti i pezzi, hanno come pezzo più
grande il grafo di prima, nodo per nodo e arco per arco nello stesso
ordine, e gli stessi ritagli; il cuore da 5 km dal centro di Trento e di
Verona ha la stessa linea (numeri in `MAPS.md`).

**Sul server, con l'ok dell'utente** (non fatto: il server non è stato
toccato). La zona di Venezia in cache è quella senza isola e va rifatta,
dopo che l'API del server è a un `main` con questo task (`DEPLOY.md`
F.12). Comandi ricavati dai documenti, non provati; la cartella
dell'estratto va guardata sul server (`MAPS.md` dice
`italy-highways.osm.pbf`, TASK-137 `/srv/shaperoute/extracts`):

```bash
# 1. L'immagine dei download sopra l'API nuova (ha il motore nuovo).
printf 'FROM shaperoute-api\nUSER root\nRUN apt-get update && apt-get install -y --no-install-recommends osmium-tool\nUSER shaperoute\n' | docker build -t shaperoute-prefetch -

# 2. Le zone di Venezia di prima via dai nomi della cache, non cancellate:
#    quella a 17 km (foot_45.36070_12.22560_45.51370_12.44360) e, se c'è,
#    quella a 14 km del primo giro. Guardare l'elenco prima di spostare.
cd /root/shaperoute/data/cache
ls foot_45.[34]*_12.[23]*
for f in foot_45.[34]*_12.[23]*; do mv "$f" "before-task180-$f"; done

# 3. La zona di nuovo, con tutti i pezzi (i nomi delle strade restano).
docker run --rm -m 4g --env-file /root/shaperoute/deploy/.env \
  -v /root/shaperoute/data/cache:/app/data/cache \
  -v /srv/shaperoute/extracts:/extracts \
  shaperoute-prefetch python -m shaperoute_api.prefetch_zones "Venezia" \
  --extract /extracts/italy-highways.osm.pbf

# 4. L'API rilegge la zona dal disco (qualche secondo ferma), poi i tre esempi.
cd /root/shaperoute/deploy && docker compose restart api
docker compose exec api python -m shaperoute_api.draw_examples \
  --api http://127.0.0.1:8000 Venezia
```

Se gli esempi di Venezia escono `shape_not_drawable`, è il motore che non
trova la forma fra calli e ponti: un task a parte, non questo errore.

**Seguiti**: scegliere nel ritaglio il pezzo della partenza (una forma
lunga da Venezia prende più terraferma che isola; la Giudecca vista dal
centro); il tratto `foot=no` del ponte è un dato di OSM, forse da
correggere lì.
