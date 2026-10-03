# TASK-220 — «Run without a route» giallo

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-220-yellow-free-run-button`
**Dipende da**: TASK-149, TASK-190 (fatti) · **ADR**: ADR-0183

## Obiettivo

In cima alla pagina «Draw» il pulsante «Run without a route» («Ride
without a route» con «Bike») è giallo. Chiesto dall'utente il 2026-10-03:
«il pulsante fallo giallo».

## Contesto da leggere

- `docs/UI.md` «Colori» (regola 1: il giallo è del percorso) e «Correre
  senza percorso»
- `apps/mobile/src/screens/ChooseScreen.tsx`

## Cosa fare

1. Il pulsante prende il fondo `accent` e il testo `onAccent`, come
   «Draw route»; senza il bordo dei pulsanti neutri.
2. Test, `UI.md` (l'eccezione alla regola 1), ADR.

## Criteri di accettazione

- [x] «Run without a route» e «Ride without a route» hanno il fondo
      `accent` e il testo `onAccent` (test).
- [x] Nel simulatore il testo scuro si legge bene sul giallo (13,5:1,
      `UI.md` regola 2).
- [x] Test verdi dell'app (typecheck, lint, prettier, jest).

## File toccati

```
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/screens/ChooseScreen.test.tsx
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-220.md
```

## Fuori scope

- Gli altri pulsanti: restano come sono, la regola 1 vale per tutto il
  resto.
- Il commento di `accent` in `src/theme/tokens.ts`, che dice ancora «una
  cosa sola»: l'eccezione è scritta in `UI.md` e in ADR-0183.

## Esito

Fatto il 2026-10-03: in cima a «Draw» «Run without a route» è giallo con
il testo scuro, anche come «Ride without a route». Provato nel simulatore
(iPhone Air): si legge bene e si distingue da «Draw route», giallo spento
finché la richiesta non è completa.
