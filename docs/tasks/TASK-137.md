# TASK-137 — Le zone delle città in evidenza, scaricate prima

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-137-featured-zones`

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

- [ ] Il comando, rilanciato a lavoro finito, dice «già pronta» per tutte
      e 10 le città.
- [ ] Per ognuna delle 10 città, Food, Famous Places e Romantic dall'API
      danno un percorso o un errore onesto (`no_places`,
      `shape_not_drawable`), mai `map_data_unavailable`, con Overpass
      irraggiungibile (tabella sotto).
- [ ] Mai due download insieme; il primo errore di Overpass ferma il
      comando; sotto i 5 GB liberi non scarica (test).
- [ ] Test dell'API verdi; `ruff`, `black` e tipi puliti; il motore non
      importa niente dall'API.
- [ ] Lo spazio aggiunto alla cache è annotato.

## File toccati

```
services/api/shaperoute_api/prefetch_zones.py     (nuovo)
services/api/tests/test_prefetch_zones.py         (nuovo)
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
- Una sorgente di mappe diversa da Overpass, o un Overpass proprio.
- Le zone sull'API sempre accesa (TASK-122), quando ci sarà.
- Cancellare i ritagli della cache (TASK-136, scelta dell'utente).
- I percorsi consigliati del catalogo per queste città (TASK-128).

## Esito

*(a fine task)*
