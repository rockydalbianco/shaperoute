# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.**
> Primo file da leggere in ogni sessione, ultimo da aggiornare a fine task.
> Se è disallineato dalla realtà, tutto il resto del sistema smette di
> funzionare: aggiornarlo non è burocrazia, è la parte che regge il metodo.

**Ultimo aggiornamento**: 2026-09-22 · **Fase corrente**: 1 — Route Engine

---

## In una riga

Il route-engine genera circle e heart normalizzati in `[-1, 1]²`, con
punti equispaziati in lunghezza d'arco. Niente coordinate geografiche ancora.

## Prossimo passo

**TASK-012 — Proiezione della forma in coordinate geografiche.**

## In lavorazione

Niente.

## Completato

- **TASK-011** — `get_shape("heart")(64)` dà 64 vertici equispaziati (±0.5%)
  più la chiusura, con entrambe le punte del cuore; `n_points` conta i
  vertici (ADR-0017).
- **TASK-010** — `python -m route_engine --shape circle --distance 5000
  --start 46.0122,11.2986` stampa la richiesta; input assurdi danno un
  errore di una riga (exit 2), non un traceback.
- **TASK-001** — Repository **pubblico** su GitHub
  (`rockydalbianco/shaperoute`), `main` protetto da ruleset con Pull
  Request obbligatoria; push diretto su `main` provato e rifiutato;
  prima PR mergiata con CI verde.

## Bloccato

Niente.

## Note per la prossima sessione

- Setup locale del route-engine: in `services/route-engine/`,
  `python -m venv .venv` e `pip install -e ".[dev]"`.
- `projection.py`, `network.py`, `optimizer.py`, `metrics.py` sono vuoti
  apposta: si riempiono da TASK-012 in poi.
- matplotlib non è una dipendenza: per guardare le forme basta uno script
  usa-e-getta fuori dal repository.
- Con latitudine negativa serve la forma `--start=-33.9,18.4`: argparse
  scambia `-33.9,...` per un'opzione.
- Le cartelle `apps/` e `packages/` restano vuote fino alla fase 2. È
  voluto, non è un file mancante.
- Il primo riscontro visivo arriva con TASK-013: fino a lì non c'è niente
  da guardare su una mappa, ed è normale.
- `samples/` è vuota per ora: si riempie da TASK-013 in poi, un GPX per
  ogni prova guardata.
- Il repository è pubblico: nessun segreto nei file, mai. Le chiavi stanno
  solo in `.env`, che non entra nel repository.

---

## Come si aggiorna

A fine task, in un solo commit dentro la stessa PR:

1. Sposta il task da **In lavorazione** a **Completato**, con una riga di
   esito: cosa funziona adesso che prima non funzionava.
2. Riscrivi **Prossimo passo** con un solo task.
3. Aggiorna **In una riga**.
4. Svuota o aggiorna **Note per la prossima sessione**.

Tenere breve questo file è parte del lavoro: è quello che si paga in ogni
sessione. Lo storico sta nei commit e nelle PR, non qui. Se **Completato**
supera una decina di righe, si condensa per fase.
