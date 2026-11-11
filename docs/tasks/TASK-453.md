# TASK-453 — Riepilogo palestra senza account e plurali

**Stato**: In corso · 2026-11-11 · codice e test fatti, PR da aprire
**Fase**: 5 · **Branch**: `fix/TASK-453-gym-end-no-account`
**ADR**: nessuno · numero dal Coordinatore l'11 novembre 2026

## Obiettivo

Chi finisce un allenamento in palestra (o una nuotata in piscina) senza
account e tocca «Sign up or log in…» vede davvero la pagina di iscrizione;
il riepilogo scrive «1 exercise · 1 set» e «1 rest», non «1 exercises ·
1 sets» e «1 rests», nelle cinque lingue.

Nasce dai punti S1 e S2 della «Seconda prova: lato social» dell'11 novembre
2026 (`out/prova-app-2026-11-11/PROPOSTE.md`, fuori dal repository): nel
simulatore il link cambiava pagina sotto il riepilogo, che restava sopra a
schermo intero — tre tocchi a vuoto, e l'unica uscita era «Discard».

## Scelta dell'utente (2026-11-11)

**«Come la corsa»**: l'allenamento resta tenuto sul telefono; il riepilogo si
fa da parte e si vede la pagina del profilo con l'iscrizione; appena ci si
iscrive o si entra il riepilogo torna, con «Save»; se si lascia la pagina
senza iscriversi torna com'era (link e «Discard»). È la regola che la fine
di una corsa segue già (TASK-278 parte B, scelta del 13 ottobre).

## Cosa fare

1. **Palestra**: `GymWorkoutHost` è un `Modal` sopra tutta l'app, e il link
   apriva la pagina del profilo sotto. Ora il link passa da
   `useSignUpAside` (file nuovo): chiede la pagina come prima e il `Modal`
   resta chiuso finché quella richiesta è in piedi (`useOwnPage().asked`,
   solo letto): finisce quando qualcuno entra o quando la pagina viene
   lasciata. L'allenamento non si tocca: è nel suo file come sempre.
2. **Piscina** (aggiunta dal Coordinatore l'11 novembre: stesso difetto,
   stessa regola): `PoolSwimHost` e `PoolSwimEnd` allo stesso modo, con lo
   stesso `useSignUpAside`.
3. **Plurali**: `countsLabel` e `restsLabel` in `ExerciseList.tsx` usano
   `tPlural`, il meccanismo che l'app ha già (`i18n/translate.ts`). Valgono
   per il riepilogo, per lo schermo dell'allenamento e per il post nel Feed,
   che scrivono la stessa riga. Sette chiavi nuove nelle quattro tabelle,
   via le due vecchie (`tables.test.ts` rifiuta le chiavi non più usate).

## I testi (da far approvare all'utente prima di «pronta»)

| Inglese | Italiano | Tedesco | Spagnolo | Francese |
| --- | --- | --- | --- | --- |
| {count} exercise | {count} esercizio | {count} Übung | {count} ejercicio | {count} exercice |
| {count} exercises | {count} esercizi | {count} Übungen | {count} ejercicios | {count} exercices |
| {count} set | {count} serie | {count} Satz | {count} serie | {count} série |
| {count} sets | {count} serie | {count} Sätze | {count} series | {count} séries |
| {count} rest | {count} recupero | {count} Satzpause | {count} descanso | {count} récup |
| {count} rests | {count} recuperi | {count} Satzpausen | {count} descansos | {count} récups |
| avg {time} · {total} resting | media {time} · {total} di recupero | Ø {time} · {total} Pause | media {time} · {total} descansando | moy. {time} · {total} de récup |

I plurali e la seconda metà della riga dei recuperi sono le parole approvate
il 4 novembre (TASK-385), solo divise in due; nuovi sono i singolari.

## Criteri di accettazione

- [x] Un test su tutta l'app prova che dal riepilogo senza account il link
      porta alla pagina di iscrizione visibile (riepilogo via, modulo
      «Sign up» a schermo), che dopo l'iscrizione il riepilogo torna con
      «Save» e che lasciando la pagina torna com'era; lo stesso per la
      piscina (`__tests__/AppGymEndSignedOut.test.tsx`; senza la correzione
      fallisce).
- [x] Un test prova i plurali per 1 e per più di 1 nelle cinque lingue
      (`src/gym/ExerciseList.test.tsx`).
- [x] `tsc` pulito; test dei file toccati verdi.
- [ ] Screenshot dal simulatore prima e dopo in `out/TASK-453/`.
- [ ] I testi approvati dall'utente.
- [ ] PR aperta e «#NNN pronta» al Coordinatore.

## File toccati

```
apps/mobile/src/gym/useSignUpAside.ts            (nuovo)
apps/mobile/src/gym/GymWorkoutHost.tsx
apps/mobile/src/gym/GymEnd.tsx
apps/mobile/src/gym/ExerciseList.tsx
apps/mobile/src/gym/ExerciseList.test.tsx
apps/mobile/src/gym/GymWorkoutHost.test.tsx
apps/mobile/src/pool/PoolSwimHost.tsx
apps/mobile/src/pool/PoolSwimEnd.tsx
apps/mobile/__tests__/AppGymEndSignedOut.test.tsx (nuovo)
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
docs/tasks/TASK-453.md                           (nuovo)
```

`src/pool/PoolSwimHost.test.tsx` non è cambiato: la piscina è provata nel
test nuovo su tutta l'app.

## Fuori scope

- `App.tsx`, `screens/ProfileLayer.tsx`, `activities/activitiesDoor.ts`: solo
  letti.
- I file di TASK-452 (`GymPlanWizard.tsx`, `GymDrawGuide.tsx`,
  `RunDayEditor.tsx`, `plans.ts`, `program.ts`).
- Gli altri conteggi della palestra e della piscina scritti a mano
  («{n} times», «{n} plans», «+{n} reps»…): non sono nel riepilogo.
- OTA e server: del Coordinatore, col sì dell'utente.

## Note per chi viene dopo

- `useSignUpAside` importa `useOwnPage` da `screens/ProfileLayer.tsx`, che è
  un file grande: i sei file di test che montano `GymWorkoutHost` o
  `PoolSwimHost` lo caricano (a freddo la suite di `GymWorkoutHost.test.tsx`
  passa da 7 a 12 s sul Mac carico; i singoli test non cambiano). Se pesa
  in CI, `OwnContext` e `useOwnPage` si spostano in un file piccolo: tocca
  `ProfileLayer.tsx`, quindi è un'altra task.
- Se la pagina del profilo viene chiesta mentre l'app mostra una corsa in
  corso (`App.tsx` allora non cambia pagina), il riepilogo resterebbe da
  parte finché qualcuno entra. Oggi non può succedere: un allenamento parte
  solo da «Draw».

## Esito

*(a fine task)*
