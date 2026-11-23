# TASK-492 — «Delete plan» in ogni passo della modifica di una scheda

**Stato**: In lavorazione · 2026-11-23 · PR #1487, schermate approvate dall'utente
**Fase**: 5 · **Branch**: `feat/TASK-492-delete-plan-in-edit`
**Dipende da**: TASK-433 (schede guidate)
**ADR**: nessuno (un ingresso in più a una cosa che c'è già) · numero dal
Coordinatore il 2026-11-23

## Obiettivo

L'utente, il 2026-11-23: «inserisci la possibilità di eliminare il piano
della palestra anche quando entro in edit». Oggi «Delete plan» c'è solo
all'ultimo passo della guida («ready»), ma «Edit» in «My plans» apre sul
passo 3 e «Weeks» sul passo 4: per eliminare una scheda bisognava arrivare
in fondo.

## Scelta dell'utente (2026-11-23)

«In ogni passo»: il link rosso «Delete plan» sotto il bottone principale,
in qualsiasi passo della guida quando si modifica una scheda che esiste;
la stessa domanda di prima («Delete “{name}”?», «Cancel» / «Delete»).
Scartato: un pulsante «Delete» in alto a destra.

## Il disegno

- `GymPlanWizard.tsx`: il link non dipende più dal passo; resta solo per
  una scheda che esiste (`plan !== null`) e quando chi apre la guida sa
  eliminarla (`onDelete`). Una scheda nuova o copiata da un post non lo ha.
- Nessun testo nuovo (le chiavi ci sono già in cinque lingue), nessun
  server, nessun cambio nativo: esce con un OTA.

## File toccati

Lista approvata dal Coordinatore il 2026-11-23:
`apps/mobile/src/gym/GymPlanWizard.tsx`,
`apps/mobile/src/gym/GymPlans.test.tsx`, `docs/tasks/TASK-492.md`,
`docs/sports/gym.md`. `GymPlans.tsx` non si tocca (TASK-491 C).

## Criteri di accettazione

- [x] «Delete plan» al passo su cui apre «Edit» e nei passi dopo; la
      stessa domanda; «Delete» toglie la scheda e torna a «My plans»
      (`GymPlans.test.tsx`).
- [x] Una scheda nuova non ha «Delete plan» (`GymPlans.test.tsx`).
- [x] Schermate dal simulatore all'utente (passo 3, conferma, passo 4;
      `out/TASK-492/`), approvate il 2026-11-23 («Approvo»).
- [ ] CI verde; merge e OTA dal Coordinatore col sì dell'utente.
