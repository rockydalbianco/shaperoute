# TASK-137 — Le zone delle città in evidenza, scaricate prima

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-137-featured-zones`

Ripreso il 2026-10-02, chiesto dall'utente: «scarica un po' di mappe almeno
per l'Italia». Due cambi rispetto a quanto scritto sotto, decisi
dall'agente su delega dell'utente (ADR-0119): oltre alle città in evidenza
(`--preset featured`), **52 città italiane** (`--preset italy`: i
capoluoghi di regione, poi le più grandi e visitate); e si scarica **sul
server Hetzner**, l'API che l'app usa dal 2026-10-01 e da cui Overpass
risponde, non sul Mac. Il riquadro contiene anche gli esempi di TASK-143
(cuore, cerchio e stella da 5 km) e i nomi delle strade. Dopo 5 città
Overpass ha bloccato anche il server: su scelta dell'utente le altre
vengono dall'estratto OSM dell'Italia di Geofabrik (`--extract`).

Chiesto dall'utente il 2026-10-01, dopo le prove di «Explore»: «sì, apri il
task per le zone». Il numero è il primo libero fra `main`, i branch remoti e
i worktree (TASK-136 è preso, TASK-128 è riservato al giro del catalogo).

## Obiettivo

Un tocco su una delle città in evidenza di «Explore» e uno su una categoria
danno un percorso a tema anche quando Overpass non risponde: la zona della
città è già in `data/cache/`.

## Il problema, oggi

TASK-134 (PR #135) mette in evidenza 14 città. Sul Mac, il 2026-10-01, la
cache ha la zona solo di **New York, Roma, Milano e Torino**. Per le altre
10 (Londra, Parigi, Tokyo, Barcellona, Dubai, Amsterdam, Berlino, Lisbona,
Sydney, San Francisco) il primo percorso a tema deve scaricarla da
Overpass, che dopo una serie di download smette di accettare connessioni da
questo Mac per ore (`MAPS.md`, «Overpass: come si scarica»). Quella sera,
dalle 19:40 in poi, Parigi, Tokyo, Lubiana e Verona finivano tutte in
`map_data_unavailable`, mentre New York (15 s), Torino (15 s), Trento (3 s)
e Pergine Valsugana (3 s) davano un percorso, perché la loro zona c'era.

Quanto serve per città: un percorso a tema scarica **una zona** per tutte
le partenze, l'unione di `required_area` dal centro e da fino a 3 luoghi
(`themed.plan_shape_through`, `prepare`). I luoghi stanno entro
`search_radius_m` dal centro: 2,5 km per i 10 km che le categorie chiedono.
Con le forme dei temi di oggi (cerchio, cuore, stella) e una partenza
ovunque entro 2,5 km, il riquadro è di circa **14 × 14 km (197 km²)**: più
della zona di Milano (155 km², 85.336 nodi). In una grande città è un
download lungo e pesante.

Il disco del Mac ha **14 GB liberi** (la cache pesa 18 GB, quasi tutti
ritagli: TASK-136).

## Contesto da leggere

- `docs/MAPS.md`, «Overpass: come si scarica», «Cache», «Area scaricata»
- `docs/API.md`, `POST /themed-route-jobs` (ADR-0099)
- `services/api/shaperoute_api/themed.py`, `plan_shape_through` e
  `search_radius_m`; `cities.py`, `CitySearch.search`

## Cosa fare

1. Un comando nell'API, perché serve la stessa ricerca delle città di
   `GET /cities` (il centro è quello che l'app riceve al tocco):
   `python -m shaperoute_api.prefetch_zones "London" "Paris" …`. Per ogni
   città:
   - il centro da `CitySearch.search(nome)`, il primo risultato;
   - il riquadro che contiene `required_area` di **ogni forma dei temi**
     (letta da `THEMES` al momento, così i temi di TASK-134 entrano da
     soli), a 10 km, da **ogni partenza entro `search_radius_m(10_000)`**
     dal centro;
   - se la cache ha già un grafo che contiene il riquadro, la città è
     «già pronta» e non si scarica niente;
   - altrimenti un download con `OsmnxSource.load`.
2. Prudenza con Overpass e col disco, come dice `MAPS.md`:
   - un download alla volta, un tentativo per città, nessun ciclo di
     tentativi;
   - prima di ogni città, la pagina di stato di Overpass con uno User-Agent
     vero; se Overpass non risponde o un download fallisce, il comando si
     **ferma** e dice quali città mancano;
   - si ferma anche se sul disco restano meno di 5 GB;
   - alla fine, per ogni città: pronta, scaricata (MB, s) o mancante.
   Rilanciato, riparte dalle città mancanti.
3. Test deterministici, senza rete: il riquadro contiene l'area di ogni
   forma da partenze ai bordi del raggio; una città coperta non si
   riscarica; il primo errore ferma il comando; poco disco lo ferma.
4. Sul Mac, quando Overpass risponde: le 10 città, anche in più giorni.
   Dopo ogni città, dall'API: «Food in <città>», «Famous Places in
   <città>» e «Romantic in <città>», annotati qui sotto (forma, km,
   somiglianza, luoghi toccati, tempo) senza download nuovi.
5. Un paragrafo in `MAPS.md`; la decisione in `DECISIONS.md` (il primo ADR
   libero al momento, controllando i branch: ADR-0106 è usato due volte);
   `STATUS.md`.

## Criteri di accettazione

Le città sono diventate le 52 italiane (`--preset italy`), chieste
dall'utente il 2026-10-02; le 14 città in evidenza restano per il seguito
(sotto, Esito).

- [x] Il comando, rilanciato a lavoro finito, dice «ready» per tutte le 52
      città italiane (sul server, 2026-10-02).
- [x] In 7 di queste città, Food, Famous Places e Romantic dall'API in
      servizio danno un percorso o un errore onesto (`shape_not_drawable`),
      mai `map_data_unavailable`, con Overpass irraggiungibile dal server
      (tabella sotto); nessuna zona scaricata.
- [x] Mai due download insieme; due errori di Overpass di fila fermano il
      comando (prima: il primo errore, ADR-0119); sotto i 5 GB liberi non
      scarica (test).
- [x] Test dell'API verdi (377); `ruff` e `black` puliti; il motore non
      importa niente dall'API.
- [x] Lo spazio aggiunto alla cache è annotato.

## File toccati

```
services/api/shaperoute_api/prefetch_zones.py     (nuovo)
services/api/tests/test_prefetch_zones.py         (nuovo)
services/api/shaperoute_api/zone_extract.py       (nuovo, dall'estratto)
services/api/tests/test_zone_extract.py           (nuovo)
docs/MAPS.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-137.md
```

Si leggono, non si modificano: `themed.py` e `themes.py` (TASK-130,
PR #128; TASK-134, PR #135), `network.py` (TASK-136). Se serve una
funzione del motore per il riquadro, va in un file nuovo.

## Fuori scope

- Le città scritte a mano: fuori dalle 14 dipendono ancora da Overpass al
  momento della richiesta.
- Distanze diverse da 10 km: un percorso a tema da 15–21 km in quelle città
  può ancora scaricare.
- Un Overpass proprio. (Una sorgente diversa da Overpass è entrata, su
  scelta dell'utente del 2026-10-02: l'estratto di Geofabrik.)
- Le zone sull'API sempre accesa (TASK-122), quando ci sarà.
- Cancellare i ritagli della cache (TASK-136, scelta dell'utente).
- I percorsi consigliati del catalogo per queste città (TASK-128).

## Esito

Sul server Hetzner, l'API che l'app usa, 52 città italiane pronte con zona
di circa 17 × 17 km e nomi delle strade: 5 da Overpass (Roma, Milano,
Napoli, Torino, Palermo, poi Overpass ha bloccato il server) e tutte poi
dall'estratto Geofabrik del 30 settembre (`--extract`, un processo per
città, container separato con 4 GiB). Da 20 a 30 s (solo i nomi) a 228 s
(Roma, 126 MB) per città; un'ora in tutto. Cache del server da circa 20 a
23,6 GB (le zone a 14 km del primo giro restano, l'API preferisce la più
piccola che copre); estratto 2,2 GB e strade 647 MB in
`/srv/shaperoute/extracts`. Memoria del container: picco 3,7–4,0 GiB,
quasi tutto osmium mentre ritaglia (una decina di secondi per città), mai
OOM; l'API intorno ai 0,3–0,5 GB.

Verifica dall'API in servizio, senza nessuna zona scaricata (log: 11 zone
dal disco, 88 dalla memoria):

| Città | Cuore 5 km | Food | Famous Places | Romantic |
|---|---|---|---|---|
| Genova | 4,9 km 0,97 | cerchio 9,6 km 0,91 | stella 9,7 km 1,00 | cuore 9,5 km 0,96 |
| Verona | 4,8 km 0,91 | cerchio 9,6 km 0,94 | stella 10,5 km 0,96 | cuore 10,3 km 0,90 |
| Lecce | 5,1 km 0,95 | cerchio 9,2 km 0,93 | stella 9,6 km 0,95 | cuore 10,1 km 0,96 |
| Bolzano | 5,0 km 0,96 | cerchio 10,2 km 0,89 | stella 9,9 km 0,94 | cuore 9,2 km 0,92 |
| Vercelli | 4,8 km 0,74 | `shape_not_drawable` | stella 9,6 km 0,95 | cuore 9,0 km 0,91 |
| Padova | 4,7 km 0,94 | cerchio 9,5 km 0,98 | stella 9,0 km 1,00 | cuore 10,4 km 0,93 |
| Monza | 4,8 km 1,00 | cerchio 9,7 km 0,90 | stella 9,6 km 0,99 | cuore 10,9 km 0,98 |

Emerso: il primo riquadro (14 km, senza la ricerca lontana del motore)
lasciava fuori Romantic a Verona e Bolzano (0,4–0,7 km a nord); allargato a
17 km, rifatto tutto. L'estratto dà zone uguali a Overpass (Napoli e
Palermo: stessi percorsi). Rimandato: le 14 città in evidenza (estere,
fuori dall'estratto dell'Italia: servono i loro estratti o Overpass quando
risponde) e le zone per percorsi oltre i 10 km o lontani dal centro.
