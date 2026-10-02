# TASK-201 — Le partenze vicine senza processi nuovi a ogni richiesta

**Stato**: In lavorazione — fermo dopo le misure (punto 1), aspetta il
coordinatore
**Fase**: 4 · **Branch**: `feat/TASK-201-nearby-pool`
**ADR**: ADR-0161, dal coordinatore il 2026-10-02, solo se la scelta del
pool lo merita
**Dipende da**: niente; seguito di TASK-168 («Esito», i tempi del server)

## Obiettivo

Un esempio di «Explore» sul server costa 7–19 s contro 1–2,5 del Mac
(`STATUS.md`, seguiti di TASK-168). Una parte potrebbe essere che
`plan_nearby` apre a ogni richiesta un `Pool` `spawn` nuovo: interpreti
nuovi e import su 4 vCPU condivise. Il task misura quanto pesa e, se pesa,
tiene i processi accesi fra una richiesta e l'altra.

Assegnato dal coordinatore il 2026-10-02 sera su delega dell'utente.

## Cosa fare

1. **Misurare prima**, sul Mac, senza rete, su Trento già in cache:
   aprire il pool, mandare il grafo (`OneGraph`), il piano. Se l'apertura
   pesa poco, fermarsi e dirlo al coordinatore prima di cambiare il codice.
2. Se pesa: processi tenuti accesi e riusati, sempre `spawn`. Restano veri:
   i ritardatari non mangiano CPU dopo la scadenza (un pool con un lavoro in
   ritardo si butta e se ne apre uno nuovo), `workers_that_fit`,
   `_lower_priority`, `processes=False` per i test; più richieste insieme
   (thread dell'API) non si pestano; il pool si chiude pulito all'uscita.
3. Il risultato non cambia: stessi piani, stessa scelta (test deterministici,
   senza rete né chiavi).
4. Misurare dopo, con gli stessi numeri del punto 1.

## Criteri di accettazione

- [x] Numeri di prima nel task file (sotto, «Misure»).
- [ ] Decisione del coordinatore sul punto 2, visti i numeri.
- [ ] Se il punto 2 si fa: test verdi, stessi piani e stessa scelta,
      numeri di dopo, `ROUTE_ENGINE.md` (partenze vicine) aggiornato.

## File toccati

- `docs/tasks/TASK-201.md` (nuovo)
- `services/route-engine/route_engine/nearby_starts.py`
- `services/route-engine/tests/test_nearby_starts.py` e test nuovi
- `docs/ROUTE_ENGINE.md` (solo «Partenze vicine»)
- `docs/STATUS.md`, `docs/DECISIONS.md` (solo le righe di questo task)

## Misure (punto 1)

Mac (10 core, 16 GB), Python 3.12, 2026-10-02 sera, `main` a `bbcc801`.
Zona di Trento (`foot_45.98370_11.00140_46.15030_11.24160`) letta una
volta e ritagliata in memoria come fa l'API (`ZoneCrop`); partenza
46.0671, 11.1214; 3 partenze vicine. Il flusso di `plan_nearby` rifatto
pezzo per pezzo, con i tempi presi dentro i processi; due giri per
richiesta, i numeri sono i due estremi. Lo script è fuori dal repository
(nello scratchpad della sessione): misura e non cambia il motore.

| Richiesta | Nodi | Grafo | Pickle | Pool pronto | Invio | Unpickle | Piano vicine | Piano partenza | `plan_nearby` |
|---|---|---|---|---|---|---|---|---|---|
| cuore 10 km | 17 479 | 8,5 MB | 0,16 s | 0,22–0,25 s | ≤ 0,02 s | 0,12–0,16 s | 2,0–2,3 s | 5,0–5,1 s | 5,2–5,4 s |
| stella 5 km | 10 870 | 5,0 MB | 0,10 s | 0,21–0,23 s | ≤ 0,01 s | 0,08–0,10 s | 0,44–0,52 s | 0,53–0,56 s | 1,0 s |
| «CIAO» 12 km | 14 927 | 7,1 MB | 0,14 s | 0,21–0,24 s | ≤ 0,01 s | 0,10–0,12 s | 2,6–4,2 s | 8,3 s | 8,5–8,7 s |
| cerchio 15 km | 22 617 | 11,8 MB | 0,21–0,24 s | 0,22–0,30 s | ≤ 0,07 s | 0,16–0,20 s | 2,8–3,6 s | 6,8 s | 7,0–7,1 s |

- **Pool pronto**: dall'apertura del pool al momento in cui il processo
  comincia il lavoro. È fatto di 0,04–0,07 s per l'interprete nuovo e
  0,16–0,19 s per importare `route_engine.nearby_starts` (numpy,
  networkx, shapely; osmnx e pandas no: `read_graph` importa osmnx solo
  quando legge una zona).
  Chiudere il pool (`terminate`, `join`): 3–10 ms.
- **Pickle**: `OneGraph(graph)`, nel processo della richiesta, **prima**
  del piano della partenza: è sul cammino della richiesta.
- **Unpickle**: in ogni processo, alla prima `load`.
- **Piano vicine** e **Piano partenza** corrono insieme: sul Mac le vicine
  finiscono sempre prima della partenza, che fa anche gli anelli a
  250–500 m.

**Con i processi già accesi** (lo stesso giro, pool aperto e scaldato
prima): i processi cominciano il lavoro dopo 0,002–0,018 s invece di
0,21–0,30. La richiesta finisce:

| Richiesta | Pool nuovo | Pool acceso |
|---|---|---|
| cuore 10 km | 5,06–5,07 s | 4,99–5,17 s |
| stella 5 km | 0,77–0,81 s | 0,54–0,61 s |
| «CIAO» 12 km | 8,27–8,34 s | 8,34–8,39 s |
| cerchio 15 km | 6,76–6,83 s | 6,72–6,80 s |

**Che cosa dicono.** Sul Mac aprire il pool costa circa **0,25 s a
richiesta**. Conta solo quando le vicine finiscono dopo la partenza, cioè
nelle forme corte: la stella da 5 km passa da 1,0 a circa 0,8 s. Nelle
altre tre il piano della partenza (5–8 s) copre tutto. Mandare il grafo
costa poco; trasformarlo in byte costa 0,1–0,24 s ed è sul cammino della
richiesta.

**Che cosa non dicono.** Il server ha 4 vCPU condivise e più lente, e
lì tre interpreti nuovi partono mentre la partenza fa il suo piano. Quanto
costano lì non è misurato: il task non tocca il server. Una prova di sola
lettura dentro il container dell'API
(`python -X importtime -c "import route_engine.nearby_starts"`, e lo
stesso script) lo direbbe in un minuto, con l'ok dell'utente.

## Note per il deploy

Nessuna finché il codice del motore non cambia. Se cambia, l'impronta
degli esempi tenuti cambia: dopo l'aggiornamento del server va rilanciato
`draw_examples` (`AGENTI.md` regola 11).
