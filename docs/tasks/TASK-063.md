# TASK-063 — Dove va il tempo del motore sopra i 10 km, e un primo taglio

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-063-engine-time` (parte da `main`)

Assegnato dal coordinatore. `PRODUCT.md` chiede un percorso in ≤ 30 s
(MVP), con ≤ 10 s come obiettivo; oggi da 15 a 21 km ci vogliono 30–50 s
(`API.md`, «Tempi»).

## Obiettivo

1. Misurare, sui casi di riferimento a 10, 15 e 21 km, come si divide il
   tempo fra lettura del grafo, ricerca, tracciati e validazione.
2. Scrivere i numeri qui.
3. Se c'è un taglio che non cambia i percorsi, farlo e mostrarlo; se ogni
   taglio li cambia, fermarsi e proporli al coordinatore.

## Contesto da leggere

- `services/route-engine/route_engine/optimizer.py`, `network.py`
- `docs/API.md`, «Tempi»; `docs/TESTING.md` (partenze)

## Come si è misurato

Uno script usa-e-getta fuori dal repository chiama `plan_route` con
`ZoneGraphs` dell'API (zone in memoria, nessun ritaglio salvato), solo con
zone già in cache: una zona mancante si salta, non si scarica. Il tempo di
ogni fase si somma avvolgendo le funzioni del motore. Cuore e cerchio a 10,
15 e 21 km a Trento, Levico e Milano; ogni caso due volte di fila (la prima
legge la zona dal disco, la seconda la trova in memoria), nella tabella la
media. PC di sviluppo, con altre sessioni al lavoro: i tempi oscillano di
qualche secondo da un giro all'altro. Quel giorno il PC era più carico che nelle
misure di `API.md` (cuore da 21 km a Trento: 42–47 s il 2026-09-23, 90–104 s
qui prima del taglio): conta il confronto prima/dopo, fatto nelle stesse
condizioni.

Non si misurano: cuore e cerchio da 21 km a Levico e a Milano, e il
cerchio da 15 km a Levico nella sua seconda ricerca (fino a 2 km): le loro
zone non sono in cache.

## Dove va il tempo (prima del taglio)

Secondi, media di due giri. **Grafo**: lettura della zona e ritaglio.
**Ricerca**: conta delle strade lungo le posizioni candidate (`RoadMask`,
nessun tracciato). **Tracciati**: `snap_to_network`, di cui **corridoio**
(costo di ogni strada per la sua distanza dalla forma) e **Dijkstra**.
**Somiglianza** di ogni tracciato. **Validazione** del percorso scelto.

| Caso | Totale | Grafo | Ricerca | Tracciati (n) | di cui corridoio | Dijkstra | Somiglianza | Validazione |
|---|---|---|---|---|---|---|---|---|
| Trento, cuore 10 km | 81,0 | 9,1 | 5,1 | 60,7 (38) | 47,3 | 6,9 | 5,0 | 0,1 |
| Trento, cuore 15 km | 81,1 | 7,2 | 6,0 | 59,5 (33) | 46,5 | 7,0 | 7,5 | 0,1 |
| Trento, cuore 21 km | 97,0 | 10,0 | 8,1 | 66,7 (32) | 51,3 | 8,6 | 11,0 | 0,2 |
| Trento, cerchio 10 km | 39,8 | 2,8 | 3,9 | 29,4 (20) | 23,1 | 3,2 | 2,3 | 0,1 |
| Trento, cerchio 15 km | 84,0 | 8,5 | 9,8 | 54,9 (30) | 42,8 | 6,3 | 6,6 | 0,2 |
| Trento, cerchio 21 km | 80,8 | 8,4 | 11,6 | 49,9 (24) | 38,9 | 6,1 | 7,4 | 0,3 |
| Levico, cuore 10 km | 15,9 | 1,1 | 1,9 | 9,5 (36) | 6,7 | 1,2 | 2,8 | 0,1 |
| Levico, cuore 15 km | 22,3 | 2,1 | 2,9 | 12,2 (30) | 8,7 | 1,5 | 4,3 | 0,1 |
| Levico, cerchio 10 km | 27,1 | 1,2 | 7,9 | 9,9 (28) | 7,0 | 1,1 | 3,1 | 0,1 |
| Milano, cuore 10 km | 41,1 | 17,3 | 6,0 | 16,9 (2) | 14,9 | 1,1 | 0,4 | 0,1 |
| Milano, cuore 15 km | 43,1 | 17,6 | 5,7 | 18,7 (2) | 16,4 | 1,3 | 0,6 | 0,1 |
| Milano, cerchio 10 km | 30,7 | 8,3 | 5,8 | 15,6 (2) | 13,9 | 1,1 | 0,4 | 0,1 |
| Milano, cerchio 15 km | 56,8 | 26,3 | 7,8 | 21,3 (2) | 18,5 | 1,7 | 0,6 | 0,1 |

Cosa dicono:

- **Il corridoio è il grosso**: da metà a due terzi del totale a Trento,
  1,2–1,6 s per tracciato. A ogni tracciato il motore rifaceva in Python
  l'elenco di tutti gli archi della zona e misurava la distanza dalla
  forma di tre punti per arco, anche dove più archi hanno lo stesso punto.
- **Trento cerca due volte**: tutti i casi tranne il cerchio da 10 km non
  convergono vicino alla partenza e rifanno la ricerca fino a 2 km
  (ADR-0040), 20 tracciati in più su un grafo più grande. Anche a Levico.
  Milano converge al primo o al secondo tracciato.
- **Il grafo pesa a Milano**: 8–26 s. Anche con la zona già in memoria
  (secondo giro), il ritaglio (`crop`, fatto dall'API a ogni richiesta)
  costa 6–13 s su una zona così fitta.
- Ricerca 2–12 s; Dijkstra 0,15–0,55 s per tracciato; somiglianza
  0,1–0,35 s per tracciato; validazione trascurabile.

## Il taglio: il corridoio, a percorsi identici

Due cambi in `network.py`, nessuno che cambi un numero (ADR-0059):

1. **Gli archi di un grafo si elencano una volta**, alla prima traccia, e
   restano accanto al grafo come già i punti campione (`_edge_steps`); il
   costo di ogni passo si calcola poi con numpy, il minimo fra archi
   paralleli con `np.minimum.at`. Stesse moltiplicazioni, stessi risultati.
2. **Ogni punto distinto si misura una volta** (`_distinct_samples`): i
   capi di un arco sono i capi dei suoi vicini, e ogni strada c'è nei due
   sensi. E `distance_to_segments` fa i conti su x e y separati invece che
   su coppie: la stessa aritmetica, circa il doppio più veloce.

Prova che i percorsi non cambiano: sui 13 casi misurati, prima e dopo,
stessi punti del percorso (confrontati tutti), stessa somiglianza, stessa
distanza, stesso numero di tracciati. Nei test: `distance_to_segments` dà
gli stessi bit della versione a coppie, `_corridor_costs` gli stessi costi
della versione arco per arco, anche dopo che il grafo cambia.

| Caso | Totale prima | Totale dopo | Corridoio prima → dopo | Tracciati prima → dopo |
|---|---|---|---|---|
| Trento, cuore 10 km | 81,0 | **28,1** | 47,3 → 10,4 | 60,7 → 16,9 |
| Trento, cuore 15 km | 81,1 | **35,3** | 46,5 → 13,0 | 59,5 → 22,4 |
| Trento, cuore 21 km | 97,0 | **63,5** | 51,3 → 22,6 | 66,7 → 37,4 |
| Trento, cerchio 10 km | 39,8 | **26,3** | 23,1 → 8,1 | 29,4 → 14,6 |
| Trento, cerchio 15 km | 84,0 | **47,4** | 42,8 → 12,8 | 54,9 → 21,8 |
| Trento, cerchio 21 km | 80,8 | **44,1** | 38,9 → 13,8 | 49,9 → 22,0 |
| Levico, cuore 10 km | 15,9 | **9,7** | 6,7 → 2,5 | 9,5 → 4,7 |
| Levico, cuore 15 km | 22,3 | **15,2** | 8,7 → 4,1 | 12,2 → 7,1 |
| Levico, cerchio 10 km | 27,1 | 29,2 | 7,0 → 4,8 | 9,9 → 7,9 |
| Milano, cuore 10 km | 41,1 | **22,4** | 14,9 → 7,6 | 16,9 → 8,8 |
| Milano, cuore 15 km | 43,1 | **32,2** | 16,4 → 11,6 | 18,7 → 13,5 |
| Milano, cerchio 10 km | 30,7 | **26,1** | 13,9 → 9,2 | 15,6 → 11,0 |
| Milano, cerchio 15 km | 56,8 | **38,6** | 18,5 → 14,7 | 21,3 → 17,1 |

Il cerchio da 10 km di Levico non migliora nel totale: la sua ricerca
(`RoadMask`) è passata da 8 a 12 s fra i due giri, rumore del PC; il suo
corridoio scende come gli altri. A Milano, con due soli tracciati, pesa la
preparazione una tantum (elenco degli archi, punti distinti) su un grafo
ritagliato di nuovo a ogni richiesta.

## Cosa resta, e le proposte (cambiano i percorsi o i file di altri)

Dopo il taglio, Trento da 15 a 21 km sta fra 35 e 64 s: ancora sopra i
30 s. Le prossime voci, in ordine di peso:

1. **Seconda ricerca fino a 2 km** (ADR-0040): a Trento corre quasi
   sempre e vale circa il 40% dei tracciati. Farla solo quando la prima non
   ha un percorso disegnabile (oggi basta che non converga), o con meno
   tracciati, taglia molto ma **cambia i percorsi**: scelta da proporre.
2. **Ritaglio della zona a ogni richiesta** (`ZoneGraphs.load` in
   `services/api`, `network.crop`): 6–13 s a Milano con la zona già in
   memoria. Un ritaglio senza la copia del grafo, o tenuto per la stessa
   zona, non cambia i percorsi ma tocca l'API e il fatto che il motore
   modifica il grafo (il nodo «sink» di `_route_through_zones`): task a
   parte.
3. **Corridoio ancora 0,4–0,7 s per tracciato**: la distanza esatta di
   ogni punto della zona dalla forma. Si può limitare ai punti vicini
   senza cambiare i costi solo con un indice spaziale; lavoro più lungo.
4. **Ricerca (`RoadMask`) 3–12 s**: la maschera si costruisce due volte
   (zona vicina e zona a 2 km) e ogni posizione candidata si conta da capo.

## Criteri di accettazione

- [x] Numeri per fase a 10, 15 e 21 km scritti qui.
- [x] Un taglio che non cambia i percorsi, mostrato sui casi misurati.
- [x] Test deterministici del taglio; test del motore verdi.
- [x] ADR-0059 e le proposte per il resto.

## File toccati

```
services/route-engine/route_engine/network.py
services/route-engine/tests/test_network.py
docs/tasks/TASK-063.md
docs/API.md
docs/DECISIONS.md
docs/STATUS.md
```

## Esito

Corridoio da 1,3 a 4,5 volte più veloce, percorsi identici: Trento da 15 a
21 km passa da 80–97 s a 35–64 s, Levico e Milano sotto i 40 s. Sopra i
30 s resta soprattutto la seconda ricerca, da decidere (proposta 1).
