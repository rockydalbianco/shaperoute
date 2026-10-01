# TASK-135 — Correre con Strava

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-135-run-with-strava`

Chiesto dall'utente il 2026-10-01: «Avvia con Strava» nella schermata del
percorso, solo con ciò che Strava supporta ufficialmente. Verificata la
documentazione, l'utente ha scelto il flusso ufficiale senza OAuth
(ADR-0106).

## Obiettivo

Da ogni percorso si arriva a seguirlo in Strava con i passi che Strava
permette, spiegati prima.

## Contesto da leggere

- ADR-0106; `docs/UI.md` («Correre con Strava», «Export del GPX»)

## Cosa fare

1. `src/strava/RunWithStrava.tsx`: pulsante e scheda in tre passi.
2. Nelle schede del percorso disegnato, di «Explore» e a tema.
3. Un GPX reale controllato per l'import.

## Criteri di accettazione

- [x] La scheda spiega cosa succede prima di ogni azione; nulla parte da sé.
- [x] Salvare il GPX, aprire il route builder, aprire Strava; un link che
      non si apre è detto.
- [x] Nessun token né credenziale; iOS e Android uguali.
- [x] Test verdi (app 530), lint, tipi.
- [x] Un GPX reale valido per l'import (GPX 1.1, traccia).

## File toccati

```
apps/mobile/src/strava/RunWithStrava.tsx
apps/mobile/src/strava/RunWithStrava.test.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/explore/ExploredCard.tsx
apps/mobile/src/explore/ThemedCard.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-135.md
```

## Fuori scope

- OAuth e collegamento dell'account (scelta dell'utente).
- Caricare il percorso come attività.

## Esito

Il cuore di 21 km di Milano dal catalogo, esportato dall'API come fa
«Save GPX»: GPX 1.1, una traccia di 1542 punti, chiusa, 21,95 km come il
percorso; il route builder risponde (200). L'import su Strava e il «Start»
nell'app vanno provati dall'utente con il suo account.
