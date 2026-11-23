# TASK-490 — La modalità Allenamento: scelta la palestra, MuW diventa un'app per allenarsi

**Stato**: In corso (0, A e B in `main` il 2026-11-23; restano C e D)
**Fase**: 5 · **Branch**: una PR per parte; la parte 0 è
`docs/TASK-490-training-mode-part-0`
**Dipende da**: TASK-429 (la modalità sci, ADR-0357: il modello), TASK-411
(la palestra in «Draw», ADR-0341), TASK-483 (lo storico degli esercizi,
ADR-0392), TASK-465 (la figura dei muscoli, ADR-0376)
**Si incrocia con**: TASK-488 (la scheda si adatta, ADR-0396: i segni
↑ = ↓ nelle schede), TASK-489 (l'Alimentazione, ADR-0397: la tab «Food»),
il Coach (proposta senza numero: la riga «Next time» e la sua pagina),
TASK-481 A (#1421, il turno di `App.tsx` prima di questo)
**ADR**: **ADR-0398** · numero del task e dell'ADR dal Coordinatore
(fork 3) il 2026-11-22.

## Obiettivo

L'utente il 2026-11-22: «La sezione Allenamenti, Palestra, Alimentazione
deve avere una schermata dedicata a loro, come quando entro nello sport
Sci». Come con lo sci (ADR-0357), scegliendo **«Gym»** nel pannello degli
sport MuW diventa un'app per allenarsi, con la sua barra in basso;
scegliendo un altro sport torna l'app di sempre.

Proposta con le bozze delle schermate:
https://claude.ai/artifact/8HAkCaLGqPti68o5CHoKSm (sorgente
`out/hub-allenamento/hub-allenamento.html` nel checkout principale).

## Le scelte dell'utente (2026-11-22)

1. **La barra come lo sci**: «Today» · «Workouts» · «Food» · «Feed» ·
   «Profile»; «Messages» in alto, accanto allo sport, come nella modalità
   sci. Il Coach non ha una tab: è una pagina che si apre da «Today» e da
   «My plans».
2. **Si entra solo con «Gym»**. «Stretching» resta uno sport come gli
   altri, con la pagina che ha oggi.
3. **Il Cibo** è la pagina di TASK-489: la tab «Food» la monta così com'è.
   Cosa c'è dentro lo decide TASK-489 (ADR-0397), non questo task.

Dal Coordinatore il 2026-11-23: finché `NUTRITION_ON` (TASK-489) è spento
la barra ha **quattro tab** (Today · Workouts · Feed · Profile); l'utente
lo vede nelle schermate della parte A e dice sì lì.

## Le pagine

- **«Today»**: la palestra di «Draw» com'è oggi (`GymDrawGuide`: la scheda
  di oggi o «Start workout», il mese, le schede, «How it works»). Con la
  parte B in cima l'omino della settimana; con la parte C la riga del
  Coach.
- **«Workouts»**: le schede (aprono `GymPlansSheet`), il mese (apre
  `GymCalendarSheet`), gli allenamenti fatti e lo storico di ogni
  esercizio (`ExerciseHistory`, ADR-0392). Sono pezzi che esistono: qui
  stanno insieme in una pagina.
- **«Food»**: la pagina «Nutrition» di TASK-489 B, solo con `NUTRITION_ON`.
- **«Feed»** e **«Profile»**: quelli dell'app, come nella modalità sci.

## Le parti

| Parte | Cosa | Dove va |
|---|---|---|
| 0 | Questo file, ADR-0398, le tre scelte | documenti |
| A | La modalità, «Today» e «Workouts» coi pezzi che esistono; niente Coach né Food | app; schermate e testi all'utente |
| B | L'omino della settimana in cima a «Today» (riusa `MuscleMap`); il Coach lo riusa | app, solo file nuovi; schermate all'utente |
| C | La riga «Coach · next time» su «Today» e l'apertura della pagina del Coach | app, quando il Coach ha numero e pagina |
| D | La tab «Food» che monta la pagina di TASK-489 B | app, con `NUTRITION_ON` |

La B parte dopo la A in `main`.

## Parte A — come si fa

- `trainingmode/trainingMode.ts`: `isTrainingMode(sport)` vale per
  `"gym"`; le pagine della barra per tre modi (app, sci, allenamento) e
  dove va l'app quando il modo cambia sotto di lei. `App.tsx` lo importa
  al posto delle funzioni di `skimode/skiMode.ts`, che resta com'è.
- La pagina «choose» di sempre è «Today» anche qui: ogni ritorno a «Draw»
  (fine allenamento, «Discard») ci atterra, come per lo sci.
- Lasciando la modalità, una pagina che l'app non ha più («Workouts»)
  va a «Draw».
- `GymDrawGuide`, `GymPlans`, `GymCalendar`, `ExerciseHistoryPage`,
  `MuscleMap` e `skimode/*` si leggono soltanto: nessun conflitto con
  TASK-488.

## File toccati

Parte 0 (questa PR, soli documenti):

```
docs/tasks/TASK-490.md
docs/DECISIONS.md          (ADR-0398 e la sua riga nell'Indice)
docs/STATUS.md             (la voce in «In lavorazione»)
docs/INDEX.md              (la riga del task)
```

Parte A (elenco approvato dal Coordinatore il 2026-11-23):

```
apps/mobile/src/trainingmode/trainingMode.ts          + trainingMode.test.ts
apps/mobile/src/trainingmode/TrainingTodayPage.tsx    + TrainingTodayPage.test.tsx
apps/mobile/src/trainingmode/TrainingWorkoutsPage.tsx + TrainingWorkoutsPage.test.tsx
apps/mobile/src/trainingmode/TrainingTabIcon.tsx
apps/mobile/App.tsx                    (a turno: dopo #1421, TASK-481 A)
apps/mobile/src/settings/SportButton.tsx  (prima di TASK-489 B)
apps/mobile/src/i18n/{de,es,fr,it}.ts  (solo chiavi nuove)
docs/tasks/TASK-490.md
```

Parte A, file in più approvati dal Coordinatore il 2026-11-23:
`apps/mobile/assets/ui/tabs/dumbbell*.png` (6, nuovi) e
`apps/mobile/src/trainingmode/trainingModeShell.test.tsx` (nuovo).

Parte B (#1433):

```
apps/mobile/src/trainingmode/weekBody.ts       + weekBody.test.ts
apps/mobile/src/trainingmode/useWeekBody.ts
apps/mobile/src/trainingmode/WeekBodyCard.tsx  + WeekBodyCard.test.tsx
apps/mobile/src/trainingmode/TrainingTodayPage.tsx + test (una riga: <WeekBody />)
apps/mobile/src/i18n/{de,es,fr,it}.ts  (5 chiavi nuove)
```

Chiusura A e B (soli documenti, `docs/TASK-490-ab-closing`):

```
docs/tasks/TASK-490.md
docs/DECISIONS.md          (precisazione in ADR-0398)
docs/STATUS.md             (la voce del task)
```

## Criteri di accettazione (parte A)

- [x] Scelto «Gym», la barra è «Today» · «Workouts» · «Feed» · «Profile»
      (più «Food» solo con `NUTRITION_ON`); «Messages» in alto.
- [x] Scelto un altro sport, l'app torna com'era; la modalità sci non cambia
      (salvo la correzione della barra, ADR-0398 precisazione).
- [x] «Today» mostra la palestra di «Draw» com'è oggi; «Start workout»
      apre l'allenamento come prima.
- [x] «Workouts» apre schede e mese coi fogli di oggi, mostra gli
      allenamenti fatti e lo storico di un esercizio.
- [x] Test deterministici dei file nuovi; test dei file toccati e `tsc` verdi.
- [x] Schermate e testi approvati dall'utente (quattro tab compresi).

## Criteri di accettazione (parte B)

- [x] In cima a «Today» l'omino della settimana (da lunedì), muscoli in
      rosa in tre aspetti, legenda «Sets» e la percentuale del corpo allenato.
- [x] Senza account l'omino non c'è; lo screen reader legge i muscoli per livello.
- [x] Test deterministici dei file nuovi; test dei file toccati e `tsc` verdi.
- [x] Schermate e testi approvati dall'utente.

## Esito

- **A** in `main` il 2026-11-23 (#1424, `cc24c61a`): schermate, testi e
  quattro tab approvati dall'utente («Sì, approvo»).
- **B** in `main` il 2026-11-23 (#1433, `d5d1cc33`): sul simulatore, con
  due allenamenti di prova, «52% of your body trained»; figure alte 140;
  rosa scelto dall'utente, schermate e testi approvati («Sì, approvo»).
- Restano: l'OTA (lo pubblica il Coordinatore) e la prova sul telefono;
  **C** (riga «Coach · next time», con TASK-491); **D** (tab «Food»: serve
  da TASK-489 il nome e le props della pagina «Nutrition»).
