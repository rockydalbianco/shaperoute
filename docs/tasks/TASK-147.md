# TASK-147 — Le alternative anche sul server Linux

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-147-linux-free-memory`

Chiesto dall'utente il 2026-10-02: «è stata tolta la funzione che mi dà più
alternative sul disegno del cuore o delle emoji». Nessuno l'aveva tolta:
dal 2026-10-01 l'app parla con l'API sul server Hetzner (Linux), e lì le
tessere A · B · C di TASK-093 non comparivano più.

## Obiettivo

Sul server l'API torna a dare fino a tre percorsi fra cui scegliere, per
forme, parole e immagini, come sul Mac.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` «Partenze vicine (TASK-076)», punto 3
- `docs/DECISIONS.md` ADR-0071 (partenze vicine e memoria), ADR-0087
  (alternative)
- `services/route-engine/route_engine/nearby_starts.py`
  (`free_memory_mb`, `workers_that_fit`)

## La causa

Le alternative sono i percorsi delle partenze vicine (ADR-0087), e ogni
partenza vicina parte in un processo suo solo se c'entra nella memoria,
lasciando 1000 MB al piano della partenza dell'utente (ADR-0071). Su
Linux `free_memory_mb` leggeva `SC_AVPHYS_PAGES`, cioè MemFree: la memoria
che nessuno usa, senza la cache dei file, che il kernel restituisce
appena serve. Sul server la cache è piena delle zone lette dal disco:
534 MB liberi su 6,8 GB disponibili, quindi sempre «3 nearby starts left:
memory», nessuna partenza vicina, nessuna alternativa. Sul Mac
`SC_AVPHYS_PAGES` non esiste e si provavano sempre tutte; su Windows si
leggeva già la memoria disponibile.

## Cosa fare

1. Su Linux la memoria per un processo nuovo è MemAvailable
   (`/proc/meminfo`), la stima del kernel che conta la cache che si può
   liberare; sotto un limite cgroup v2 (un container, un servizio) non più
   di quanto resta del limite. In un file nuovo, `route_engine/memory.py`.
2. `free_memory_mb` la usa su Linux; Mac e Windows come prima.
3. Test deterministici su file finti, con i numeri veri del server.
4. Prova sul server, nel container dell'API.

## Criteri di accettazione

- [x] Su Linux la memoria letta è MemAvailable, non MemFree (test con il
      `/proc/meminfo` del server: 0 processi prima, 3 dopo).
- [x] Un limite di memoria del container o del servizio la riduce (test).
- [x] Mac e Windows invariati; i test di `test_nearby_starts.py` verdi.
- [x] Nel container del server, cuore e stella da 5 km a Trento hanno di
      nuovo le alternative (cuore 10,8 s, 1 alternativa; stella 5,8 s,
      2), con le 2 partenze vicine pianificate invece di 0.
- [ ] ~~Server aggiornato dopo il merge~~ Lo fa il coordinatore a fine
      coda dei merge, con `deploy/compose.yaml`; poi prova sull'iPhone.

## File toccati

```
services/route-engine/route_engine/memory.py        (nuovo)
services/route-engine/route_engine/nearby_starts.py (free_memory_mb)
services/route-engine/tests/test_memory.py          (nuovo)
docs/ROUTE_ENGINE.md                                (punto 3 delle partenze vicine)
docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-147.md
```

`nearby_starts.py` e `ROUTE_ENGINE.md` sono anche di TASK-140 (PR #148),
in altri punti dei file: chi mergia per secondo unisce.

## Fuori scope

- Cambiare quante alternative si mostrano o come si filtrano (ADR-0087).
- Cambiare i tempi d'attesa delle partenze vicine o la riserva di 1000 MB.
- Le richieste in parallelo sullo stesso server: ognuna conta la memoria
  quando parte.

## Esito

Sul server Linux le partenze vicine, e con loro le alternative, tornano a
partire: la memoria si legge da MemAvailable, non da MemFree. Provato nel
container dell'API. Resta da aggiornare il server (coordinatore) e
guardarlo sull'iPhone.
