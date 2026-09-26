# TASK-082 — Le direzioni col trattino nel messaggio della partenza spostata

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-082-hyphen-directions`

## Obiettivo

Ogni avviso «start moved … of the requested point» arriva all'utente in
parole semplici, qualunque direzione scriva il motore; e nessun avviso
sconosciuto arriva più grezzo in minuscolo.

## Contesto da leggere

- `apps/mobile/src/route/warnings.ts` e `warnings.test.ts`
- `services/route-engine/route_engine/optimizer.py` — `_compass`, `plan_shape`
- `docs/DECISIONS.md` — ADR-0040, ADR-0048

## Cosa fare

1. Nella regola della partenza spostata (ADR-0040) accettare le direzioni
   col trattino: `optimizer._compass` scrive north, north-east, east,
   south-east, south, south-west, west, north-west.
2. Un test per ciascuna delle otto direzioni, in metri e in chilometri.
3. Confrontare le altre regole con le f-string del motore (`validation.py`,
   `optimizer.py`, `network.py`) e con il branch di TASK-076.
4. Un avviso sconosciuto: prima lettera maiuscola (ADR-0077).

## Criteri di accettazione

- [x] Le otto direzioni di `_compass` sono tradotte, con un test ciascuna.
- [x] Le altre regole corrispondono ai testi veri del motore.
- [x] Un avviso sconosciuto arriva con la prima lettera maiuscola, testato.
- [x] `jest`, `tsc --noEmit` ed `expo lint` verdi.

## File toccati

```
apps/mobile/src/route/warnings.ts
apps/mobile/src/route/warnings.test.ts
docs/tasks/TASK-082.md
docs/STATUS.md
docs/DECISIONS.md
```

## Fuori scope

- Cambiare i testi del motore o dare codici agli avvisi nel contratto
  (la strada pulita di ADR-0048, che tocca motore, API e `shared-types`).
- `problems.ts` e `src/api/` (TASK-081).

## Esito

Il pattern `(\w+)` non prendeva «north-east»: ora la direzione è
`[a-z]+(?:-[a-z]+)*`, e le otto direzioni hanno un test. Le altre regole
corrispondono ai testi del motore; TASK-076 (PR #93) non aggiunge avvisi
nuovi (`nearby_starts.py` riusa quelli di `search` e di `validate`). Un
avviso sconosciuto ora ha la prima lettera maiuscola (ADR-0077). Emerso,
non corretto (è il motore): sopra 1 km la distanza è scritta con `:g`,
che per uno spostamento non tondo darebbe decimali lunghi («1.0004 km»);
oggi gli spostamenti sono a passi tondi, quindi non si vede.
