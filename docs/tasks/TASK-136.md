# TASK-136 — La CLI non salva più i ritagli dei grafi

**Stato**: In corso
**Fase**: 4 · **Branch**: `fix/TASK-136-no-saved-crops`

Task di miglioramento generale scelto dall'agente su delega dell'utente
(2026-10-01). Il numero è il primo libero fra `main`, i branch remoti e i
worktree (TASK-134 e TASK-135 sono presi).

## Obiettivo

La CLI e lo script del catalogo non riempiono più il disco: un'area dentro
una zona in cache si ritaglia in memoria e non si salva, come fa già l'API
(ADR-0030). Chi vuole togliere i ritagli già salvati ha un comando che li
elenca e, solo se richiesto, li cancella.

## Il problema, oggi

`OsmnxSource.load` (ADR-0023) salva col suo nome ogni ritaglio di una zona
in cache: un GraphML e un pickle per ogni partenza o distanza nuova, da 3 a
170 MB l'uno. Lo usano la CLI e `seed_catalog` (TASK-125, TASK-129), che
prova più partenze per ogni percorso del catalogo.

Sul Mac, il 2026-10-01: `data/cache/` pesa **18,6 GB**, 355 grafi. Di
questi, **346 (17,9 GB)** stanno per intero dentro un grafo più grande della
cache, e si rifanno da quello senza rete; le zone vere sono 9 (0,8 GB). Il
disco ha 19 GB liberi su 228.

Due effetti in più:

- `covering_path` sceglie il grafo **più piccolo** che contiene l'area: con
  centinaia di ritagli, la stessa richiesta può ritagliare da un ritaglio
  salvato prima invece che dalla zona. Il grafo che si ottiene dipende
  dalle richieste fatte prima su quel disco.
- L'API legge dalla stessa cartella: ogni richiesta che cade dentro un
  ritaglio salvato tiene in memoria quel ritaglio invece della zona, e i 2
  posti in memoria (ADR-0030) girano più spesso dal disco.

## Contesto da leggere

- `docs/MAPS.md`, «Cache» e «Area scaricata»
- `docs/DECISIONS.md`, ADR-0023 (il ritaglio si salva) e ADR-0030 (l'API
  non salva i ritagli)

## Cosa fare

1. Test che falliscono oggi: un'area dentro una zona in cache si carica
   senza scrivere file nella cache, e il grafo è quello di `crop` sulla
   zona.
2. `OsmnxSource.load`: il file esatto se c'è, altrimenti il ritaglio in
   memoria dal grafo che la contiene, senza salvarlo; il download di una
   zona nuova si salva come oggi.
3. `python -m route_engine.prune_crops`: elenca i grafi della cache che
   stanno per intero dentro un altro grafo della cache (GraphML e pickle,
   con il peso); con `--delete` li cancella. Di default non cancella nulla.
4. Misura: un percorso dalla CLI su una partenza nuova, prima e dopo, con
   una cache di prova che ha solo la zona.
5. ADR nuova, `MAPS.md`, le note di `STATUS.md` che dicono il contrario,
   la docstring di `graphs.py` nell'API.

## Criteri di accettazione

- [ ] Un percorso dalla CLI dentro una zona in cache non aggiunge file in
      `data/cache/` (test).
- [ ] Il grafo ritagliato è lo stesso di `crop(zona, area)` (test).
- [ ] Una zona nuova scaricata si salva ancora (test esistenti verdi).
- [ ] `prune_crops` senza `--delete` non cancella nulla; con `--delete`
      toglie solo grafi contenuti in un altro che resta (test).
- [ ] Test del route-engine e dell'API verdi; `ruff` e `black` puliti.

## File toccati

```
services/route-engine/route_engine/network.py          (OsmnxSource.load)
services/route-engine/route_engine/prune_crops.py      (nuovo)
services/route-engine/tests/test_prune_crops.py        (nuovo)
services/route-engine/tests/test_no_saved_crops.py     (nuovo)
services/route-engine/tests/test_optimizer.py          (una riga: il ritaglio non si salva)
services/route-engine/tests/test_cache_writes.py       (il test del ritaglio salvato)
services/api/shaperoute_api/graphs.py                  (solo la docstring)
docs/MAPS.md, docs/DECISIONS.md, docs/STATUS.md,
docs/tasks/TASK-136.md
```

`docs/API.md` dice ancora «come invece fa la CLI (ADR-0023)», ma è di
TASK-130 e TASK-134: non si tocca qui.

## Fuori scope

- Cancellare i 17,9 GB di ritagli sul Mac: è una scelta dell'utente. Il
  comando c'è; si lancia con `--delete` solo dopo il suo sì.
- Tenere la zona in memoria fra una partenza e l'altra nella CLI e nello
  script del catalogo (come `ZoneGraphs` nell'API): più veloce, ma è un
  altro cambiamento.
- I file `names_*.json`, i `walk_*` di TASK-014, la cartella `http/`.

## Esito

*(a fine task)*
