# TASK-452 — La corsa su misura nelle schede della palestra

**Stato**: Done · 2026-11-12 · PR1 server e tipi (#1158, `30407b83`) in
`main` e sul server (passo 9, 2026-11-12 08:38Z); PR2 l'app (#1159,
`881489fd`) in `main`; documenti in una PR a parte
**Esito**: la guida chiede il ritmo sui 10 km e il lungo a chi mette corse
nella scheda; ritmi, lungo e lenta su misura in scheda e in «Draw»; a fine
ciclo, dalle corse salvate, la proposta di ritmi nuovi solo col sì. Esce con
l'aggiornamento completo dell'app.
**Fase**: 5 · **Branch**: `feat/TASK-452-run-pace` (unito)
**Dipende da**: TASK-433 (le schede guidate e i giorni di corsa, Done)
**ADR**: ADR-0369 · numeri dal Coordinatore il 2026-11-11

## Obiettivo

Parole dell'utente del 2026-11-11: «per la corsa implementa un po' chiedi
andatura media per i 10 km cos'è una long run per lei e fai piani
personalizzati». I giorni di corsa delle schede (TASK-433 C) diventano su
misura: la guida chiede il ritmo sui 10 km e il lungo di oggi, e i ritmi e le
distanze vengono da lì.

## Scelte dell'utente (2026-11-11, una alla volta)

Sulla tela «Schede palestra guidate»
(https://claude.ai/artifact/4Z1qMhK5bc3p2JLgu8t8Ym), riga D, schermate
D1–D3:

1. **Quando**: «Così, nella guida» — un passo «How do you run today?» dopo i
   giorni, solo per chi aggiunge corse; due domande già compilate (5:30/km,
   lungo 12 km; «Get back in shape» parte dal principiante), con − e +; chi
   non sa il ritmo sceglie il livello (Principiante 7:00, Intermedio 5:45,
   Esperto 4:45 sui 10 km).
2. **Ritmi**: «Sì, così» — dal ritmo sui 10 km: lenta +1:05/km, lungo
   +1:15/km, ripetute da 400 m −0:25 (200 m −0:30, 800 m −0:15, 1000 m
   −0:10, a tempo −0:20). Il lungo parte dal suo e cresce di 1 km (5 min) a
   settimana, l'ultima settimana di un ciclo di 3 o più all'80%; la lenta è
   circa metà del lungo (almeno 3 km), cresce come prima del 10%.
3. **Aggiornare**: «Dalle mie corse» — a fine ciclo (l'ultima settimana)
   l'app guarda le corse salvate delle ultime 4 settimane (almeno 3 km),
   stima il ritmo sui 10 km dalla migliore con la formula di Riegel (t₂ =
   t₁·(d₂/d₁)^1.06) e il lungo dalla più lunga.
4. **Come proporlo**: «Chiedi prima» — se è più veloce di almeno 5 s/km, in
   «Draw» «Your runs say 5:20/km over 10 km: update the paces?» con Sì / No;
   cambia solo col sì; una volta a ciclo.
5. **Testi e grafica**: «Approvo».
6. **Server**: «Sì, procedi».

## Il disegno tecnico (ADR-0369, deciso dall'agente su delega dell'utente)

- **Un campo facoltativo `runner` nel programma** (`pace_10k_s` 180–900;
  `long_m` 1–60 km o `long_s` 10 min–6 h): nessuna migrazione, sta nel JSONB
  `gym_plans.program`; `gym_plans.py` lo valida (`GymPlanRunnerBody`).
- **I ritmi li calcola il telefono** (`gym/runPace.ts`): `paceOf`, `runFor`
  (il lungo suo, la lenta metà), `withRunner`; il lungo con il corridore
  cresce di 1 km a settimana (`runInWeek(..., personal)`). Nella scheda ogni
  giorno di corsa dice «at 6:35/km»; in «Draw» «Today» ha le caselle «Pace»
  e «Time».
- **La stima dalle corse** legge la lista delle corse che l'app ha già
  (`useActivitiesDoor().list`), senza chiamate nuove; la proposta già vista
  sta sul telefono (`gym-pace-asked.json`, piano e ciclo).
- **L'app di prima** (OTA 8) legge un programma con `runner` (campo
  ignorato); se lo salva, lo copia così com'è. Il server va aggiornato prima
  dell'OTA: oggi rifiuta il campo.

## File toccati

Lista mandata al Coordinatore il 2026-11-11. PR1 (server e tipi):
`services/api/shaperoute_api/gym_plans.py`, `tests/test_gym_plans.py`,
`packages/shared-types/src/gym.ts`, `fixtures/gym-plans.json`,
`test/gym.test.ts`, `docs/API.md`. PR2 (l'app): `api/gymPlans.ts`,
nuovi `gym/runPace.ts`, `gym/runPace.test.ts`, `gym/RunnerStep.tsx`;
`gym/program.ts` (+ test), `gym/plans.ts`, `gym/GymPlanWizard.tsx`,
`gym/RunDayEditor.tsx`, `gym/GymDrawGuide.tsx`, `gym/GymPlans.test.tsx`,
`i18n/{it,de,fr,es}.ts`; `docs/tasks/TASK-452.md`, `docs/sports/gym.md`.
STATUS, DECISIONS (ADR-0369) e INDEX in una PR di soli documenti dopo il
merge.

## Criteri di accettazione

- [x] Il passo «How do you run today?» solo con le corse, i ritmi su
      «Your paces», la scheda col corridore (`GymPlans.test.tsx`).
- [x] Ritmi, lungo, lenta, crescita, stima e proposta (`runPace.test.ts`,
      `program.test.ts`).
- [x] Il server tiene e valida `runner` (`test_gym_plans.py`).
- [x] Testi nelle cinque lingue, approvati.
- [x] CI verde; PR1 in `main` e sul server (passo 9), poi PR2 in `main`.

## Cosa resta

- L'uscita con l'aggiornamento completo dell'app (OTA di produzione, dal
  Coordinatore col sì dell'utente): fino ad allora i telefoni non vedono il
  passo «How do you run today?».
- La prova sul telefono dopo l'OTA: una scheda con corse nuova, i ritmi in
  «Draw», e a fine ciclo la proposta (serve una corsa più veloce salvata
  nelle ultime 4 settimane).
