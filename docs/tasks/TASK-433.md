# TASK-433 — Le schede della palestra guidate, con le settimane che cambiano

**Stato**: In lavorazione · 2026-11-11 · A (#1095) sul server e nell'OTA 5,
B (#1103) nell'OTA 6, C1 (#1117) sul server, C2 (#1115) in `main`: esce col
settimo OTA, col sì dell'utente; resta la prova sul telefono
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
- [x] CI verde e merge (#1095, `8138b456`).
- [x] Migrazione sul server e poi OTA, dal Coordinatore col sì dell'utente
      (0066 il 2026-11-10, OTA 5 da 2c3442f7; B nell'OTA 6 da c4ab00a3; C1
      sul server col passo 7 del 2026-11-11, 2ed26af7, controlli di
      `out/TASK-433/SERVER-C.md` tutti come attesi); righe di controllo di sola
      lettura in `out/TASK-433/SERVER.md` e `SERVER-C.md`
      (cartella `out/` del checkout principale).
- [ ] Settimo OTA con la C2 (#1115, 23308c9e), dal Coordinatore col sì
      dell'utente.
- [ ] Prova sul telefono dell'utente. **Sul simulatore la guida non è stata
      vista girare**: provata solo coi test (jest); l'utente la prova dopo
      l'OTA del 2026-11-10.

## Parte B — «Come funzionano le schede» toccando Palestra

Chiesta dall'utente il 2026-11-10 al Coordinatore («inserire la scheda che
spieghi come funziona ma solamente quando l'utente clicca sullo sport
gym»); scelte una alla volta, sulla schermata «B» della tela:

1. **Quando**: «Solo la prima volta» che tocca Palestra in «Draw»; mai
   all'avvio dell'app (anche con la palestra già scelta), mai negli altri
   sport. Ascolta lo sport scelto (`saveSport` avvisa solo di una scelta
   fatta), non la pagina della palestra che compare; vista, resta vista sul
   telefono (`gym-intro.json`).
2. **Chiudere e rivedere**: «Così» — «Create my plan» apre la guida in 5
   passi (dopo che il riquadro è sceso: un Modal alla volta), «Not now» o un
   tocco fuori lo chiude; la riga «How plans work» nella palestra di
   «Draw» lo riapre quando si vuole. Senza account c'è solo «Not now».
3. **Testi e grafica**: «Approvo» — riquadro dal basso con le quattro barre
   delle settimane, «Your plan, step by step», tre passi numerati.

| en | it |
|---|---|
| Your plan, step by step | La tua scheda, passo per passo |
| A minute to make it, then it guides you every time. | Un minuto per farla, poi ti guida ogni volta. |
| Choose your goal and days | Scegli obiettivo e giorni |
| More muscle, more strength, tone up or get back in shape, 2 to 5 days. | Più muscoli, più forza, tonificare o rimetterti in forma, da 2 a 5 giorni. |
| The plan is ready | La scheda è già pronta |
| Exercises, sets and reps proposed: touch an exercise to change it. | Esercizi, serie e ripetizioni proposti: tocca un esercizio per cambiarlo. |
| The weeks change by themselves | Le settimane cambiano da sole |
| More load, more reps or weeks A / B. Here you find today's workout. | Più peso, più ripetizioni o settimane A / B. Qui trovi l'allenamento di oggi. |
| Create my plan · Not now · How plans work | Crea la mia scheda · Non ora · Come funzionano le schede |

File (solo app, lista mandata al Coordinatore): nuovi
`apps/mobile/src/gym/gymIntro.ts`, `GymIntroSheet.tsx`, `GymIntro.test.tsx`;
`gym/GymDrawGuide.tsx`, `i18n/{it,de,fr,es}.ts`; `docs/tasks/TASK-433.md`,
`docs/sports/gym.md`. Niente server: esce con l'OTA dopo il merge. Sul
simulatore non è stata vista girare.

## Parte C — I giorni di corsa nella scheda

Chiesta dall'utente il 2026-11-10 («aggiungi anche la possibilità di
aggiungere una scheda di allenamento di corsa nella sezione palestra»);
alla prima domanda «Giorni di corsa nella scheda», poi «continua con questa
task»; scelte una alla volta sulle schermate C1–C3 della tela:

1. **Come si aggiunge**: «Così» — al passo 2, sotto i giorni, «And
   running?» No / 1 / 2 / 3: le corse vanno nei giorni senza palestra
   (martedì e sabato per primi); in «Your week» ogni giorno si tocca:
   palestra, corsa, riposo. Di base «No».
2. **Che corsa**: «Sì, così» — Lenta, Ripetute, Lungo; km o minuti (le
   ripetute: quante e quanto ciascuna, 200/400/800/1000 m); con le
   settimane +10% circa a settimana (mezzi km, minuti interi), le ripetute
   +1, l'ultima settimana di un ciclo di 3 o più all'80% della prima;
   «Always the same» la lascia com'è.
3. **In «Draw»**: «Sì, così» — «Today» mostra la corsa della settimana
   («Easy run · 5.5 km», la riga del tipo); «Go to the run · 5.5 km» passa
   «Draw» a «Run» coi km già scritti (forma o corsa senza percorso); «Gym
   today instead» fa un allenamento libero. Una corsa fatta quel giorno
   conta come fatta nel calendario della palestra.
4. **Testi e grafica**: «Approvo» — la sigla «RUN» nell'azzurro di un token
   nuovo `runDay` (lo stesso colore di `startHere`, ma un token suo, così
   ognuno ha un significato), le lettere dei giorni di palestra in giallo.

**Il disegno tecnico** (ADR-0363, numero del Coordinatore del 2026-11-10;
la voce intera con la PR di soli documenti dopo il merge): un giorno del programma ha un campo nuovo
facoltativo `run` (`kind`, `distance_m` o `duration_s`; per le ripetute
`reps` e `rep_m` o `rep_s`) e nessun esercizio; niente migrazione, sta nel
JSONB di `program`. I valori di ogni settimana li calcola il telefono
(`program.ts`, `runInWeek`). Il calendario (`gym_calendar.py`) dà per fatto
un giorno di corsa se quel giorno c'è una corsa (`runs.activity =
'running'`). «Go to the run» usa `saveSport("run")` e un canale nuovo di
`useDrawDistance.ts` (`chooseDrawDistance`) per scrivere i km di «Draw».

**Cosa vede l'app in produzione** (l'OTA del 2026-11-10, che ha le schede
guidate ma non i giorni di corsa): un giorno di corsa è un allenamento senza
esercizi; la sua `isGymProgram` non guarda `run` e lo legge; in «Draw» non
diventa «Today» (zero esercizi); in «Edit» la guida di prima lo mostra come
un giorno di palestra vuoto e non lascia salvare finché non ha esercizi. Il
server va aggiornato prima dell'OTA: quello di oggi rifiuta un giorno con
`run` (campi in più vietati) e la scheda resta in attesa sul telefono.

**Due PR** (Coordinatore): C1 #1117 server e shared-types, C2 #1115
l'app, che entra in `main` solo dopo il «server C1 fatto» del Coordinatore
(l'app manderebbe `run` a un server che lo rifiuta con `422`). Righe di
controllo del server in `out/TASK-433/SERVER-C.md`.

File (lista approvata dal Coordinatore il 2026-11-10): server `gym_plans.py`,
`gym_calendar.py`, `tests/test_gym_plans.py`; shared-types `src/gym.ts`,
`fixtures/gym-plans.json`, `test/gym.test.ts`; app `api/gymPlans.ts` (+
test), `gym/program.ts` (+ test), `gym/proposal.ts` (+ test),
`gym/plans.ts`, `gym/GymPlanWizard.tsx`, `gym/GymPlans.tsx` (+ test),
`gym/GymDrawGuide.tsx`, nuovi `gym/runDay.ts`, `gym/RunDayEditor.tsx`;
`units/useDrawDistance.ts` e il test nuovo
`units/chooseDrawDistance.test.tsx`; `theme/tokens.ts` e
`theme/palettes.test.ts` (il token `runDay`); `tabs/TabSwipeOwners.test.ts` (le linguette che scorrono, una riga); `i18n/{it,de,fr,es}.ts` (via
«Which days» e la sua riga, che il passo 2 non mostra più); documenti
`docs/tasks/TASK-433.md`, `docs/sports/gym.md`, `docs/API.md`. Sul
simulatore non è stata vista girare.

## Da fare dopo il merge (Coordinatore, col sì dell'utente)

1. Server: backup, migrazione 0066, deploy, nel passo che compone il
   Coordinatore. Prima del server l'app nuova salva le schede guidate solo
   sul telefono: il `PUT` con `program` torna `422` dall'API vecchia e la
   scheda resta in attesa; per questo l'OTA va dopo il server.
   **Fatto il 2026-11-10**: server a 8138b456, 0066 applicata, copia
   `shaperoute-2026-11-10T1738Z.dump`, ritorno = immagine
   `shaperoute-api:before-passo5`; controlli di `out/TASK-433/SERVER.md`
   («plans 0 without weeks 0 read ok», rotte 401/404 come attese).
2. OTA di produzione: partito dal Coordinatore da main 2c3442f7 (senza la
   parte B, che esce con l'OTA dopo il suo merge).
3. La privacy non cambia: le schede (nome, giorni, esercizi e valori
   obiettivo) restano sul telefono e sull'account come in TASK-411 D.
