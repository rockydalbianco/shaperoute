# TASK-158 — Il pulsante «Run» dice che si corre senza percorso

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-158-run-without-a-route`

Chiesto dall'utente il 2026-10-02: «il tasto Run, fai capire che potrà
correre ma senza seguire quel percorso, tipo "only run" oppure "run
without", o decidi tu come gestirla».

## Obiettivo

Chi guarda la pagina «Draw» capisce dal pulsante che la corsa libera
(TASK-149) non segue il percorso scelto sotto.

## Contesto da leggere

- `docs/UI.md` «Correre senza percorso» (TASK-149)
- `apps/mobile/src/screens/ChooseScreen.tsx`

## Cosa fare

1. La scritta del pulsante: «Run without a route», per intero. È la stessa
   frase che la schermata della corsa libera mostra già, ed era già
   l'etichetta per lo screen reader.
2. Test; `UI.md`, `STATUS.md`.

## Criteri di accettazione

- [x] Il pulsante dice «Run without a route»; «Run» da solo non c'è più.
- [x] La corsa libera parte come prima.
- [x] Test, lint, typecheck e prettier verdi.
- [ ] Prova sull'iPhone: la scritta sta nella riga accanto a «Sgrava».

## File toccati

```
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/__tests__/AppFreeRun.test.tsx
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-158.md
```

## Fuori scope

- Spostare il pulsante, o ridisegnare la cima di «Draw».

## Esito

Fatto (2026-10-02). Il pulsante dice «Run without a route». Scartate «Only
run», che non è inglese corrente, e «Just run» o «Free run», che si possono
ancora leggere come correre il percorso, o gratis. 1 test nuovo, 728 test
dell'app verdi, lint, typecheck e prettier puliti. Visto su un simulatore:
la scritta sta nella riga. **Da provare sull'iPhone**, con l'app
ripubblicata.

Nessun ADR: è un testo.
