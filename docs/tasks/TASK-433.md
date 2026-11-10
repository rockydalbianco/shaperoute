# TASK-433 — Le schede della palestra guidate, con le settimane che cambiano

**Stato**: In lavorazione · 2026-11-10 · PR di codice aperta, aspetta CI e merge
**Fase**: 5 · **Branch**: `feat/TASK-433-gym-guided-plans`
**Dipende da**: TASK-411 (le schede, parte C: tabella `gym_plans`, 0058)
**ADR**: ADR-0360 (proposto) · numeri dal Coordinatore il 2026-11-10

## Obiettivo

Fare una scheda in palestra è facilissimo e guidato, le settimane possono
cambiare (non una sola settimana ripetuta) e la grafica è elegante. Parole
dell'utente del 2026-11-10, dopo aver provato le schede di TASK-411 sul
telefono: «ottimo la base c'è, cerca di migliorarla e fa sì di creare una
tabella il più facilmente possibile, deve essere una cosa guidata, poi le
settimane devono poter cambiare… lavoraci ed amplia questa cosa, migliora
anche la grafica, fai una cosa elegante e facile da utilizzare».

## Scelte dell'utente (2026-11-10, una alla volta)

Sulla tela «Schede palestra guidate»
(https://claude.ai/artifact/4Z1qMhK5bc3p2JLgu8t8Ym, sette schermate):

1. **Flusso**: «5 passi così» — obiettivo, giorni, la scheda pronta,
   le settimane, nome e via.
2. **Settimane**: «Tutti e 4 i modi» — più peso ogni settimana (+2,5 kg,
   l'ultima più leggera), più ripetizioni, settimane alternate A/B, sempre
   uguale; ogni settimana si cambia anche a mano.
3. **Ciclo**: «4 settimane, cambiabile» — 6 o 8 con un tasto; A/B è di 2;
   poi ricomincia coi pesi nuovi.
4. **Grafica**: «Approvo» la tela per tutte le schermate nuove.
5. **Server**: «Sì, con la migrazione» — le schede di prima restano, schede
   di una settimana che si ripete; il server lo aggiorna il Coordinatore col
   sì dell'utente.

Il comportamento per intero in `docs/sports/gym.md` «Le schede guidate».

## Il disegno tecnico (ADR-0360, deciso dall'agente su delega dell'utente)

La voce intera di ADR-0360 va in `docs/DECISIONS.md` con la PR di soli
documenti dopo il merge; qui il suo contenuto.

- **Una colonna, non una tabella**: `gym_plans.program` JSONB nullable
  (migrazione 0066). Una scheda guidata è una riga di `gym_plans` con il suo
  programma: allenamenti della prima settimana (`sessions`, uno per giorno),
  `weeks`, `mode`, `step_kg`, `starts_on`, `rest_s`, `goal` e le settimane
  scritte a mano (`custom`). I `days` della riga sono quelli dei suoi
  allenamenti, `items` è vuoto: il limite di 20 schede, la sincronia e la
  chiave restano quelli di TASK-411.
- **I valori di ogni settimana li calcola il telefono** (`program.ts`) dalla
  prima settimana e dal modo; il server tiene il programma com'è e sa solo
  quali giorni sono in programma (`GymProgramBody.sessions_on`, per i giorni
  saltati del calendario). Una settimana scritta a mano sostituisce quella
  calcolata.
- **Compatibilità**: un `PUT` senza `program` (l'app di prima, finché non
  arriva l'OTA) lascia il programma com'era; l'app di prima vede la scheda
  coi suoi giorni e zero esercizi e non la avvia (serve almeno un
  esercizio). `program: null` la riporta a una scheda di un allenamento.
- **Cosa vede l'app in produzione (l'OTA del 2026-11-10) davanti a una
  scheda con le settimane**: il contratto cambia solo con un campo nuovo
  facoltativo (`program`), nessun campo rinominato o tolto. La sua
  `isGymPlan` guarda solo `key`, `name`, `days`, `items`, `position`,
  `updated_at`: la scheda passa, con i giorni dei suoi allenamenti e zero
  esercizi. In «Plans» è una riga «Mon · Wed · Fri · 0 exercises»; in
  «Draw» non diventa «Today» (serve almeno un esercizio) e «Start
  workout» resta libero; il calendario (server) segna i suoi giorni saltati
  per settimana del ciclo. Se l'app vecchia la modifica e la salva, manda il
  `PUT` senza `program` e il server tiene le settimane com'erano. Lo provano
  `apps/mobile/src/api/gymPlans.test.ts` («an app of before reads a plan
  with weeks») e `test_gym_plans.py`
  («a_program_is_kept_and_an_older_app_leaves_it»).
- **Le schede di prima** si aprono nella guida come un programma di una
  settimana «sempre uguale» (`programOfPlan`); salvate, diventano un
  programma.
- **Il vecchio editor** (`GymPlanEditor.tsx`) lascia il posto alla guida;
  le sue costanti restano in `planLimits.ts`.
- **Il recupero dell'obiettivo** (90 s, 3 min, 45 s, 60 s) è il primo
  recupero di ogni esercizio dell'allenamento che segue la scheda.

## File toccati

Lista approvata dal Coordinatore il 2026-11-10. Server:
`services/api/migrations/0066_gym_plan_weeks.sql` (nuovo; il primo numero
libero al merge),
`shaperoute_api/gym_plans.py`, `shaperoute_api/gym_calendar.py`,
`tests/test_gym_plans.py`. Shared-types: `src/gym.ts`,
`fixtures/gym-plans.json`, `test/gym.test.ts`. App: `api/gymPlans.ts`,
`api/gymPlans.test.ts`, `gym/plans.ts`, `gym/workout.ts`,
`gym/GymDrawGuide.tsx`, `gym/GymPlans.tsx`, `gym/GymPlans.test.tsx`,
`gym/GymPlanEditor.tsx` → `gym/planLimits.ts`, nuovi
`gym/GymPlanWizard.tsx`, `gym/SessionEditor.tsx`, `gym/program.ts`,
`gym/program.test.ts`, `gym/proposal.ts`, `gym/proposal.test.ts`;
`i18n/{it,de,fr,es}.ts`. Documenti: `docs/tasks/TASK-433.md`,
`docs/sports/gym.md`, `docs/API.md`, `docs/DATABASE.md`. STATUS, DECISIONS
(ADR) e INDEX in una PR di soli documenti dopo il merge.

## Criteri di accettazione

- [x] «New plan» apre la guida in 5 passi con le risposte già scelte; la
      scheda salvata va all'API col suo programma (`GymPlans.test.tsx`).
- [x] I quattro modi delle settimane, il ciclo 4/6/8, la settimana scritta a
      mano, il ciclo che ricomincia (`program.test.ts`,
      `proposal.test.ts`).
- [x] «Today» in «Draw» segue la settimana del ciclo e dice «Week n of N»;
      l'allenamento parte col recupero dell'obiettivo.
- [x] Il server tiene e valida il programma, l'app di prima non lo cancella,
      il calendario segna i giorni saltati del ciclo (`test_gym_plans.py`).
- [x] Testi nelle cinque lingue (`tables.test.ts`).
- [x] Testi approvati dall'utente («Approvo», 2026-11-10).
- [ ] CI verde; merge, migrazione sul server e OTA dal Coordinatore col sì
      dell'utente.
- [ ] Prova sul telefono dell'utente.

## Da fare dopo il merge (Coordinatore, col sì dell'utente)

1. Server: backup, migrazione 0066, deploy, nel passo che compone il
   Coordinatore. Prima del server l'app nuova salva le schede guidate solo
   sul telefono: il `PUT` con `program` torna `422` dall'API vecchia e la
   scheda resta in attesa; per questo l'OTA va dopo il server.
2. OTA di produzione.
3. La privacy non cambia: le schede (nome, giorni, esercizi e valori
   obiettivo) restano sul telefono e sull'account come in TASK-411 D.
