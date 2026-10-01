# TASK-149 — Correre senza percorso: «Run» nella prima schermata

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-149-free-run`

## Obiettivo

Dalla prima schermata si può iniziare una corsa senza disegnare niente:
l'app registra la traccia, mostra km, tempo e passo, e a «Stop» il
riepilogo. Chiesto dall'utente il 2026-10-02.

## Contesto da leggere

- `docs/UI.md` «La navigazione» (la traccia), «La fine della corsa»
- `apps/mobile/src/navigation/trackStore.ts`, `useNavigation.ts`
- `docs/DECISIONS.md` ADR-0091

## Cosa fare

1. «Run» nella prima schermata, accanto a «Explore».
2. Un hook che registra la traccia col GPS, senza percorso, nel file di
   TASK-112 (`startRun` con il percorso vuoto).
3. La schermata della corsa: la mappa segue la posizione e disegna la
   linea; banner con km, tempo e passo; «Pocket» e «Stop». A ogni km la
   voce dice tempo e passo medio (chiesto dall'utente il 2026-10-02, prima
   del merge).
4. La fine della corsa: km, tempo, passo, «Keep running» e «Done»; una
   corsa lasciata a metà si riapre con l'app.
5. Test; `UI.md`, ADR.

## Criteri di accettazione

- [x] «Run» apre la corsa senza chiedere niente all'API.
- [x] Le posizioni finte diventano la traccia nel file, con il percorso
      vuoto; il banner mostra km, tempo e passo.
- [x] La voce dice ogni km una volta, con tempo e passo, e non ripete i
      km di una corsa ripresa.
- [x] «Stop» mostra il riepilogo; «Keep running» continua la stessa
      traccia; «Done» torna alla prima schermata e cancella il file.
- [x] Una corsa libera lasciata nel file si apre con l'app.
- [x] Nessuna dipendenza nuova; test, lint e typecheck dell'app verdi.
- [ ] Prova sull'iPhone camminando qualche centinaio di metri.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/__tests__/AppFreeRun.test.tsx
apps/mobile/src/navigation/freeRun.ts
apps/mobile/src/navigation/freeRun.test.ts
apps/mobile/src/navigation/useFreeRun.ts
apps/mobile/src/navigation/useFreeRun.test.ts
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/screens/FreeRunScreen.tsx
apps/mobile/src/screens/FreeRunScreen.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-149.md
```

`App.tsx` è anche di TASK-132 (in corso): righe diverse, segnalato nella
PR.

## Fuori scope

- Salvare le corse finite, la cronologia: TASK-117.
- Pausa e ripresa del tempo.
- Inquadrare tutta la linea a fine corsa (messaggio nuovo della mappa).
- Esportare la corsa libera in GPX.
- GPS a telefono bloccato: serve una build propria, come per la
  navigazione.

## Esito

Codice e test fatti (2026-10-02): 4 file di test nuovi, 631 test dell'app
verdi; la voce a ogni km aggiunta su richiesta dell'utente prima del
merge. Il riepilogo non inquadra tutta la linea (resta a zoom 15 sulla
partenza): seguito possibile, annotato in ADR-0122 e in `STATUS.md`.
**Manca la prova sull'iPhone**, che si fa dopo la ripubblicazione
dell'app.
