# TASK-247 — `run_scored` registrato dal server al salvataggio della corsa

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-241-h-run-scored-at-save` (aperto
come «TASK-241 parte H» prima che arrivasse il numero; la PR è #386)
**Dipende da**: TASK-241 (in `main`). **ADR**: aggiornamento sotto
ADR-0207.

Seguito di TASK-241. Con il punteggio tolto dall'app, l'app non chiama
più `POST /track-scores` a fine corsa, e con lui il server non registrava
più l'evento `run_scored` degli `insights`. Alla domanda «vuoi che il
server torni a registrare l'evento "run scored" quando una corsa viene
salvata?» l'utente ha risposto «si» (2026-10-06).

## Obiettivo

Il server registra di nuovo `run_scored`, con la sola `quality`, quando
una corsa con punteggio viene salvata la prima volta.

## Contesto da leggere

- `docs/INSIGHTS.md` §1 («Raccolta»)
- `docs/API.md`, `PUT /me/activities/{key}`
- `docs/tasks/TASK-241.md`, «Cosa resta nell'API»

## Cosa fare

1. In `activities.py`, al primo `PUT /me/activities/{key}` di una corsa
   con punteggio (`201`), `insights.record("run_scored", quality=…)`;
   `install_activities` riceve gli insights, `app.py` li passa.
2. Test nuovo in `services/api/tests/`.
3. Rimettere «a run scored» nella bozza di «Privacy» (`about/content`).
4. Documenti: `INSIGHTS.md`, `API.md`, DECISIONS, STATUS.

## Criteri di accettazione

- [x] Il primo `PUT /me/activities/{key}` di una corsa con punteggio
      registra `run_scored` con la sola `quality` (punteggio / 100).
- [x] La stessa corsa rimandata con la stessa chiave non registra un
      secondo evento.
- [x] Una corsa senza percorso non registra niente.
- [x] Senza registro degli eventi la corsa si salva lo stesso.
- [x] «Privacy» nomina di nuovo «a run scored» fra gli eventi tenuti.
- [x] ruff, black e test dell'API verdi; test di `about` dell'app verdi.

## File toccati

```
services/api/shaperoute_api/activities.py
services/api/shaperoute_api/app.py
services/api/tests/test_activities_insights.py
apps/mobile/src/about/content/en.ts
apps/mobile/src/about/content/it.ts
docs/INSIGHTS.md
docs/API.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-241.md
docs/tasks/TASK-247.md
```

## Fuori scope

- `POST /track-scores`: resta com'è e registra ancora l'evento. Un'app
  più vecchia di TASK-241 conta la stessa corsa due volte (a fine corsa e
  al «Save») finché non si aggiorna.
- Il motore, le migrazioni, il contratto dell'API: non cambiano.

## Esito

Fatto il 2026-10-06 (PR #386). Nessuna migrazione, nessun contratto
cambiato, il motore non è toccato (niente `draw_examples`). **Serve
l'aggiornamento del server** perché l'evento torni: con l'ok dell'utente,
lo guida il coordinatore.
