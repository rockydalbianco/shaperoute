# TASK-062 — Dichiarare `numpy` fra le dipendenze del motore

**Stato**: Done
**Fase**: manutenzione · **Branch**: `chore/TASK-062-declare-numpy` (parte da `main`)

Assegnato dal coordinatore: era in sospeso in `STATUS.md`, «Note per la
prossima sessione».

## Obiettivo

`services/route-engine/pyproject.toml` dichiara `numpy`, che il motore
importa direttamente (`geo.py`, `metrics.py`, `network.py`, `optimizer.py`,
`sidewalks.py`, `validation.py`, `words.py`) ma oggi riceve solo perché
arriva con osmnx.

## Contesto da leggere

- `services/route-engine/pyproject.toml`, `[project] dependencies`

## Cosa fare

1. Aggiungere `numpy` a `dependencies`, con un intervallo che comprenda la
   versione installata in `services/api/.venv` (2.5.3).
2. Nulla da installare: numpy c'è già.

## Criteri di accettazione

- [x] `pyproject.toml` dichiara `numpy>=1.24,<3`.
- [x] `pip install -e services/route-engine` risolve numpy.
- [x] Test del motore verdi.

## File toccati

```
services/route-engine/pyproject.toml
docs/tasks/TASK-062.md
docs/STATUS.md
```

## Fuori scope

- Aggiornare la versione di numpy o di osmnx.
- Dichiarare altre dipendenze indirette.

## Esito

`numpy>=1.24,<3`: il limite basso è quello che osmnx già chiede, l'alto
esclude una futura versione maggiore non provata. Nessuna installazione
nuova, test del motore verdi. Nessun ADR.
