# TASK-087 — Il ritaglio della zona più veloce, a percorsi identici

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-087-zone-crop` (parte da `main`)

Approvato dall'utente il 2026-09-30. È la «proposta 2» di TASK-063 e una
delle «idee non ancora approvate» di `PASSAGGIO.md`. Numeri presi senza
coordinatore: primo task e primo ADR liberi guardando branch remoti,
worktree e file non committati (TASK-084/085/086, ADR-0079/0080/0081 presi).

**Vincolo dell'utente, non negoziabile**: i percorsi restano quelli di oggi,
punto per punto. Cambia solo l'attesa.

## Obiettivo

A ogni richiesta l'API ritaglia dalla zona in memoria il grafo che serve
(`ZoneGraphs.load`, `network.crop`): a Milano 6–13 s sul PC di TASK-063.
Alla fine il ritaglio dà lo stesso grafo in una frazione del tempo.

## Contesto da leggere

- `docs/tasks/TASK-063.md`, «Dove va il tempo» e proposta 2
- `docs/API.md`, «Tempi» e «Dove va il tempo (TASK-063)»
- `services/api/shaperoute_api/graphs.py`, `route_engine/network.py`
  (`crop`, `_route_through_zones`)

## Cosa si è trovato

- `crop` passa due volte da una «vista» di NetworkX (un filtro sopra il
  grafo della zona): una per trovare il pezzo connesso più grande, una per
  copiarlo. Ogni passo attraverso la vista costa chiamate Python.
- Il resto del tempo era il **garbage collector** di Python: il ritaglio
  crea centinaia di migliaia di dizionari che restano tutti, e a ogni
  risveglio il collector ripassa l'intera zona in memoria senza trovare
  nulla da buttare.
- I percorsi dipendono dall'**ordine** di nodi e archi nel grafo (a parità
  di costo Dijkstra prende il primo che incontra; le somme sugli archi
  vanno nell'ordine degli archi). Un grafo «uguale» ma in altro ordine può
  dare un altro percorso.
- Lavorare direttamente sulla zona senza ritaglio (una vista, o la zona
  intera) cambierebbe quell'ordine o renderebbe ogni tracciato più lento, e
  il nodo «sink» del motore finirebbe nel grafo condiviso fra le richieste.

## Cosa si è fatto (ADR-0082)

1. `route_engine/zone_crop.py`, file nuovo: `ZoneCrop(zona).crop(bbox)`
   costruisce il ritaglio dai dizionari della zona, senza viste, con nodi e
   archi **nello stesso ordine** di `network.crop` e con dizionari propri.
   `network.crop` resta com'è (la CLI lo usa e salva i ritagli) ed è il
   riferimento dei test.
2. `ZoneGraphs` tiene in memoria uno `ZoneCrop` per zona e sospende il
   garbage collector per la durata del ritaglio.
3. Ogni richiesta ha ancora il **suo** grafo: il «sink» e le richieste in
   parallelo restano come prima, la zona non viene mai modificata.
   `optimizer.py`, `network.py` e `nearby_starts.py` non sono toccati.

## Criteri di accettazione

- [x] Test: il ritaglio nuovo è quello vecchio, nodo per nodo e arco per
      arco, nello stesso ordine (zone inventate con più pezzi, pezzi pari,
      ritagli piccoli e grandi; le strade vere di Levico).
- [x] Test: due richieste di fila e più richieste insieme sulla stessa zona
      non si sporcano; il «sink» non resta né nel ritaglio né nella zona.
- [x] Percorsi identici punto per punto prima e dopo, sui casi di TASK-063
      che questo Mac ha in cache (Milano e Levico; 10, 15 e 21 km), con i
      tempi.
- [x] Test di motore e API verdi; CI verde.

## Confronto prima / dopo

Misurato il 2026-09-30 su questo Mac con uno script usa-e-getta fuori dal
repository, come in TASK-063: `plan_route` con `ZoneGraphs` di `main` e poi
con quello nuovo, zone solo dalla cache, ogni caso due volte di fila (la
prima legge la zona dal disco, la seconda la trova in memoria: è quella
che conta per l'app, ed è quella in tabella). Altre sessioni lavoravano sul
Mac: i totali oscillano di 1–3 s, il tempo del grafo molto meno.

| Caso | Percorso | Identico punto per punto | Grafo prima → dopo (s) | Totale prima → dopo (s) |
|---|---|---|---|---|
| Milano, cuore 10 km | 737 punti, 10088 m, 0,989 | sì | 1,7 → 0,3 | 4,7 → 3,4 |
| Milano, cuore 15 km | 1151 punti, 14262 m, 1,000 | sì | 4,1 → 0,4 | 8,3 → 4,2 |
| Milano, cuore 21 km | 1542 punti, 21953 m, 0,988 | sì | 5,6 → 0,8 | 13,0 → 10,7 |
| Milano, cerchio 10 km | 824 punti, 9791 m, 0,997 | sì | 2,0 → 0,4 | 5,2 → 4,0 |
| Milano, cerchio 15 km | 1204 punti, 16033 m, 1,000 | sì | 4,0 → 1,0 | 9,3 → 12,5 (rumore) |
| Milano, cerchio 21 km | 1409 punti, 20381 m, 0,984 | sì | 4,2 → 0,9 | 13,3 → 9,1 |
| Levico, cuore 10 km | 355 punti, 10469 m, 0,854 | sì | 0,2 → 0,0 | 2,3 → 2,1 |
| Levico, cerchio 10 km | 479 punti, 9961 m, 0,818 | sì | 0,2 → 0,0 | 2,0 → 1,9 |

Alla prima richiesta (zona letta dal disco) il grafo passa da 2,8–9,0 s a
0,9–3,2 s a Milano. «Identico» vuol dire: stessi punti, stessa distanza,
stessa somiglianza, stesse aree caricate con lo stesso numero di nodi e di
archi, nei due giri di fila.

**Non misurati**: Levico a 15 e 21 km. Le loro zone non sono nella cache di
questo Mac e non si scarica per una misura (anche TASK-063 non le aveva).
Per la montagna c'è quindi solo il 10 km; l'uguaglianza del grafo è
comunque provata dai test sulle strade di Levico.

Il cerchio da 15 km ha un totale più alto dopo in quel giro: il grafo è
sceso di 3 s, il resto è il Mac occupato da altre sessioni.

## File toccati

```
services/route-engine/route_engine/zone_crop.py        (nuovo)
services/route-engine/tests/test_zone_crop.py          (nuovo)
services/api/shaperoute_api/graphs.py
services/api/tests/test_graphs.py
docs/tasks/TASK-087.md                                 (nuovo)
docs/API.md
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- Tenere un ritaglio per riusarlo fra richieste uguali: le partenze dal
  GPS cambiano a ogni richiesta, e servirebbe proteggere il «sink».
- La CLI (`OsmnxSource.load` continua a usare `network.crop`).
- Le altre proposte di TASK-063 (seconda ricerca, corridoio, `RoadMask`).

## Esito

Il ritaglio dalla memoria passa a Milano da 2–6 s a 0,3–1 s, con gli stessi
percorsi punto per punto sugli 8 casi misurati. Su questo Mac il risparmio
è di 1,5–5 s a richiesta, meno dei 6–13 s di TASK-063, misurati su un PC
più lento. A Levico il ritaglio era già sotto il mezzo secondo. Restano da
misurare Levico a 15 e 21 km, quando la zona sarà in cache. L'API
dell'utente prende la modifica al prossimo riavvio dopo il merge.
