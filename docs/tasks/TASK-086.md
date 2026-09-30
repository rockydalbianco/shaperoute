# TASK-086 — Pulsanti più visibili

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-086-visible-buttons`

## Obiettivo

I comandi dell'app si vedono come pulsanti, anche all'aperto.

## Contesto da leggere

- `docs/UI.md` «Il tema»
- `docs/DECISIONS.md` ADR-0046

## Cosa fare

1. Schiarire nei token il fondo e il bordo dei comandi, con il contrasto
   del bordo sopra 3:1 sul fondo.
2. `UI.md` e ADR-0081.

## Criteri di accettazione

- [x] Il bordo dei comandi ha contrasto ≥ 3:1 sul fondo (4,3:1).
- [x] Il giallo resta solo di «Draw route»; nessun colore fuori dai token.
- [x] Test dell'app verdi.
- [x] Prova sull'iPhone: l'utente vede i pulsanti.

## File toccati

```
apps/mobile/src/theme/tokens.ts
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-086.md
```

## Fuori scope

- Forma, misura o posizione dei pulsanti.
- Un tema chiaro.

## Esito

Bordo e fondo dei comandi schiariti in tre token; provato sull'iPhone
dall'utente il 2026-09-30 («ora funziona, merge 103»).
