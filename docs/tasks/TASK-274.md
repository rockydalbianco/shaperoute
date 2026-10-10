# TASK-274 — Il database dei test se ne va col suo volume

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-274-test-db-volume`

## Obiettivo

Un giro dei test dell'API con il database avviato da docker non lascia
niente sul disco: né il container né il volume dei suoi dati.

## Contesto

Il 2026-10-10 il disco di Colima sul Mac (20 GB, `/var/lib/docker`) era
pieno: 168 volumi anonimi, 17,6 GB, nessun container. PostgreSQL non
partiva più («could not write file "postmaster.opts": No space left on
device») e tutti i test del database finivano in «connection refused».
L'utente ha approvato un `docker volume prune -f` una tantum.

La causa è in `services/api/tests/conftest.py`: `_docker_server` avvia
`postgis/postgis:16-3.4` con `--rm` e alla fine lo toglie con
`docker rm -f <container>`. L'immagine dichiara `PGDATA` come volume, e
`docker rm` senza `-v` lascia il volume anonimo: uno per giro.

Provato sul Mac (Colima) con l'immagine vera:

| Fine del container | Volumi rimasti |
|---|---|
| `docker rm -f` (prima) | 1 |
| `docker rm -f -v` | 0 |
| `docker stop` di un container `--rm` | 0 (e nessun container) |

## Contesto da leggere

- `docs/DECISIONS.md`: ADR-0120, «Test»
- `services/api/tests/conftest.py`

## Cosa fare

1. In `conftest.py` il comando di chiusura diventa
   `docker rm -f -v <container>`, in una funzione `_removal`.
2. Test deterministici, senza docker: `subprocess.run` finto, si guarda
   l'ultimo comando dato, anche quando il server non parte mai.

## Criteri di accettazione

- [x] Alla fine di `_docker_server` il comando è
      `docker rm -f -v <container>`, anche se l'attesa del server fallisce
      (test).
- [x] Un giro vero di `tests/test_accounts.py` sul Mac non aggiunge
      volumi (`docker volume ls` uguale prima e dopo).
- [x] Un container `--rm` fermato da solo non lascia il volume (provato a
      mano, tabella sopra).

## File toccati

```
services/api/tests/conftest.py
services/api/tests/test_conftest_teardown.py
docs/tasks/TASK-274.md
docs/STATUS.md
docs/DECISIONS.md
```

## Fuori scope

- Pulire i volumi già lasciati da altri giri: il prune l'ha fatto il
  coordinatore su richiesta dell'utente.
- Cambiare l'immagine, il modo di avviarla o la CI (i runner sono usa e
  getta).

## Esito

Fatto il 2026-10-10: la chiusura usa `docker rm -f -v`, due test nuovi in
`test_conftest_teardown.py`. Un giro vero dei test del database non
lascia più volumi. Un volume anonimo creato alle 11:48Z da un giro col
vecchio comando (un'altra sessione) è rimasto: si toglie col prossimo
prune, non qui.
