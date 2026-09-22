# TASK-010 — Scheletro del pacchetto route-engine e CLI

**Stato**: Done
**Fase**: 1 · **Branch**: `feat/TASK-010-route-engine-skeleton`

## Obiettivo

`python -m route_engine --shape circle --distance 5000 --start 46.0122,11.2986`
si avvia, valida gli argomenti e stampa la richiesta interpretata. Nessuna
geometria ancora: si costruisce il contenitore.

## Contesto da leggere

- `docs/ARCHITECTURE.md` §3 e §4
- `docs/TESTING.md`

## Cosa fare

1. Creare il pacchetto Python in `services/route-engine/` con `pyproject.toml`
   (Python 3.11+, `ruff`, `black`, `pytest`).
2. Definire `RouteRequest` e `RouteResult` come dataclass o modelli
   Pydantic, secondo `ARCHITECTURE.md` §3.
3. Scrivere il `__main__.py` con il parsing degli argomenti:
   `--shape`, `--distance`, `--start`, `--out`, `--activity` (default `running`).
4. Validare gli input: latitudine in `[-90, 90]`, longitudine in `[-180, 180]`,
   distanza positiva e plausibile, forma tra quelle registrate.
   Un messaggio d'errore chiaro, non un traceback.
5. Predisporre la struttura interna dei moduli, vuoti ma presenti:
   `shapes/`, `projection.py`, `network.py`, `optimizer.py`, `metrics.py`.
6. Test: argomenti validi producono il `RouteRequest` atteso; argomenti
   non validi producono l'errore atteso.

## Criteri di accettazione

- [x] Il comando si avvia e stampa la richiesta interpretata.
- [x] Coordinate o distanze assurde danno un errore leggibile, non un crash.
- [x] `pytest` verde.
- [x] `ruff` e `black` puliti.
- [x] Il pacchetto non importa nulla da `api/` o `ai/`.
- [x] `docs/STATUS.md` aggiornato.

## File toccati

```
services/route-engine/pyproject.toml
services/route-engine/route_engine/__init__.py
services/route-engine/route_engine/__main__.py
services/route-engine/route_engine/models.py
services/route-engine/tests/test_cli.py
```

## Fuori scope

- Generare forme (TASK-011).
- Qualsiasi cosa tocchi la rete o scarichi dati.
- Export GPX (TASK-013).

## Esito

CLI funzionante con validazione di coordinate, distanza (1–50 km), forma
e attività; 14 test verdi, `ruff` e `black` puliti. Contratto in
`route_engine/models.py` come dataclass frozen, senza dipendenze runtime.
