# TASK-506 — Le schede della palestra: la tabella, la sola palestra, il prossimo allenamento

**Stato**: In lavorazione · 2026-11-23 · A #1523, B e D #1525, C #1528;
schermate, testi e scelte approvati dall'utente
**Fase**: 5 · **Branch**: `feat/TASK-506-a-plan-table` (A), poi un branch
da `main` per B e per C
**Dipende da**: TASK-433 (schede guidate, ADR-0360), TASK-488 (la scheda si
adatta, ADR-0396), TASK-461 (il pianificatore, ADR-0371), TASK-492
**ADR**: nessuno nuovo (Coordinatore, 2026-11-23). La parte B cambia una
regola di ADR-0371: un'«Aggiunta» datata ad ADR-0371 nella PR di soli
documenti finale.

## Obiettivo

Il 2026-11-23 l'utente ha chiesto di continuare a migliorare, una alla
volta, tre sezioni di MuW: prima le schede della palestra (creazione
guidata, settimane diverse, tabella, grafica), poi la pagina «Compass»
della corsa, poi la modalità allenamento. Ordine scelto dall'utente:
«Schede → Compass → Allen.». Questo task è la prima sezione.

## Scelte dell'utente (2026-11-23, una alla volta)

Sulla tela «Schede palestra · migliorie»
(https://claude.ai/artifact/EUvAqFkxCVKLTs5VxFhLtZ, sorgente
`out/schede-migliorie/schede-migliorie.html` del checkout principale),
quattro proposte con l'anteprima del telefono:

1. **Quali**: «1, 2, 3; la 4 dopo» — la tabella del piano (A), un piano di
   sola palestra (B), «I miei piani» che dice il prossimo allenamento (C).
   La 4, «Fallo oggi» per un allenamento saltato, tocca anche il server e
   resta per un giro dopo.
2. **La tabella**: «Da guardare + Settimane» — si guarda e basta; toccata
   l'intestazione di una settimana si apre il passo «Settimane» della guida
   che c'è già, dove la si cambia a mano. Scartate: caselle modificabili
   nella tabella, una tabella senza nessun tocco.
3. **Le schermate** dal simulatore (A, B, C e D insieme, `out/TASK-506/`
   del checkout principale): «Approvo». Dalla prova un ritocco nella A: le
   colonne più strette, le quattro settimane di un ciclo stanno sul
   telefono.
4. **La Palestra già scelta** all'apertura di «Nuovo piano» (dalla pagina
   palestra di Draw e dalla modalità allenamento): «Sì, Palestra già
   scelta». Scartato: nessuno sport già scelto.
5. **I testi** nelle quattro lingue (`out/TASK-506/TESTI.md`): «Approvo».
6. **La regola di ADR-0371** («Almeno due, sempre» diventa «basta uno
   sport», un'aggiunta datata ad ADR-0371) e **i segni degli sport** della
   parte D presi dal menu degli sport (oggi le emoji, le icone a linea con
   TASK-510): «Sì, tutte e due».

## Parte A — La tabella del piano

- In «My plans» il riquadro di un piano con le settimane ha un terzo tasto,
  «Table», accanto a «Edit» e «Weeks». Le schede di prima (righe «sempre
  uguale») non lo hanno.
- La pagina: «‹», il titolo «Table», sotto il nome del piano e «Week 3 of
  4»; una linguetta per allenamento come nella guida («A · Mon», «Run ·
  Tue», l'emoji dello sport per un giorno fuori); una riga per esercizio
  (il nome del catalogo nella lingua dell'app), una colonna per settimana
  del ciclo in corso: serie × ripetizioni (o il tempo) e i kg in grassetto.
  Una corsa o un giorno fuori è una riga sola con quanto (5 km, 6 × 400 m).
- La settimana di oggi ha la colonna contornata di giallo; le settimane
  passate e quella più leggera hanno i valori spenti; sotto l'intestazione
  «Lighter» o «By hand». Un esercizio che in una settimana non c'è (le
  settimane A / B, una settimana scritta a mano) ha «—» e la sua riga.
- I valori sono quelli che «Today» calcola (`sessionsOfWeek` di
  `program.ts`): le settimane scritte a mano e i passi delle risposte di
  TASK-488 ci sono già. Prima che il piano parta, il primo ciclo senza
  settimana contornata.
- Molte settimane (fino a 24 per un piano verso una meta) scorrono di
  lato; i nomi restano fermi a sinistra.
- Toccata l'intestazione di una settimana si chiude la tabella e si apre la
  guida al passo «Settimane» (`WizardStep` «weeks»), come il tasto «Weeks».
- Testi nuovi (it, de, fr, es; da approvare con le schermate): «Table»,
  «No exercises yet.», «Change week {n}» (solo per VoiceOver), «kg · touch
  a week to change it».
- Solo app: niente server, niente migrazione, niente nativo; esce con un
  OTA.

## Parte C — «I miei piani» dice cosa viene dopo

- Nel riquadro di un piano con le settimane, sotto i giorni: il prossimo
  allenamento. Quello di oggi se non è ancora fatto (una palestra oggi nel
  calendario), altrimenti il primo giorno dopo che ne ha uno, anche nella
  settimana dopo coi suoi valori. Il titolo dice quando e quale: «Today ·
  B», «Tomorrow · Run», «Fri · C»; sotto il nome dell'allenamento («Back,
  biceps») o, per una corsa o un giorno fuori, la riga sola («Easy run · 5
  km»).
- I primi tre esercizi coi valori di quella settimana («Bench press 4 × 10
  · 62.5 kg») e «+ 2 more» per gli altri; a sinistra l'omino piccolo
  (`MuscleMap` di TASK-465) coi muscoli principali di tutti i suoi esercizi
  pieni e quelli che aiutano col bordo; niente omino per una corsa o per
  esercizi scritti a mano.
- Sotto i giorni del piano, con un account, «This week: 1 of 3 done»: un
  giorno passato è fatto se il calendario della palestra non lo dà saltato
  (il server conta fatta anche la corsa di quel giorno), quello di oggi con
  un allenamento in palestra oggi (anche uno che aspetta sul telefono), i
  giorni che vengono no; si conta dal giorno in cui il piano parte. Senza
  account la riga non c'è.
- Testi nuovi (it, de, fr, es; da approvare con le schermate): «Tomorrow»,
  «+ 1 more», «+ {n} more», «This week: {done} of {total} done».
- Il disegno: `gym/NextWorkout.tsx` (`nextWorkout`, che cerca con
  `sessionOn` di `program.ts` fino a 14 giorni avanti, e la parte che si
  vede), `gym/weekDone.ts` (il calendario della settimana, come
  `useWeekBody` di TASK-490 B: i mesi della settimana, gli allenamenti che
  aspettano sul telefono; chiesto una volta per tutta la pagina, non per
  piano). Solo app.

## Il disegno tecnico (deciso dall'agente su delega dell'utente)

- `gym/tableOfPlan.ts`: una funzione pura, `planTable(program, today,
  language)`, che per ogni settimana del ciclo in corso chiama
  `sessionsOfWeek` e mette insieme le righe per giorno: un esercizio per la
  sua chiave del catalogo (o il nome scritto), la seconda volta nello stesso
  allenamento una riga sua; nell'ordine in cui compaiono la prima volta. La
  settimana più leggera segue la stessa regola delle barre della guida
  (`weekCaption`). Il nome non è `planTable.ts`: sul disco del Mac, che non
  distingue maiuscole e minuscole, `./PlanTable` avrebbe trovato il file
  sbagliato (come `byHand.ts` di TASK-484).
- `gym/PlanTable.tsx`: la pagina; in `GymPlans.tsx` uno stato in più
  (la chiave del piano in tabella), come «Coach».

## File toccati

Lista approvata dal Coordinatore il 2026-11-23.

Parte A: nuovi `apps/mobile/src/gym/tableOfPlan.ts` (+ `.test.ts`; nella
lista come `planTable.ts`, rinominato per il motivo sopra),
`gym/PlanTable.tsx` (+ `PlanTable.test.tsx`); modificati `gym/GymPlans.tsx`,
`i18n/{it,de,fr,es}.ts`; documenti `docs/tasks/TASK-506.md`,
`docs/sports/gym.md`.

Parte B (dopo): `gym/SportsDoor.tsx` e il suo test (o `GymPlans.test.tsx`),
`gym/GymPlanWizard.tsx` solo se serve, i18n.

Parte C (dopo A, stesso `GymPlans.tsx`): nuovi `gym/NextWorkout.tsx`,
`gym/weekDone.ts` (+ `NextWorkout.test.tsx`, `weekDone.test.ts`);
modificati `gym/GymPlans.tsx`, i18n, e `gym/PlanTable.test.tsx` della parte
A (una prova del riquadro intero con l'impalcatura che ha già).

STATUS, DECISIONS (l'aggiunta ad ADR-0371) e INDEX in una PR di soli
documenti dopo il merge.

## Criteri di accettazione

Parte A:
- [x] La tabella di un piano: linguette, righe, colonne, kg di ogni
      settimana, «—» dove un esercizio manca, «By hand» e «Lighter», le
      corse come una riga, i valori di «Today» coi passi di TASK-488, il
      secondo ciclo (`tableOfPlan.test.ts`).
- [x] «Table» in «My plans» solo per un piano con le settimane; le
      linguette; l'intestazione di una settimana apre il passo 4; «‹»
      torna ai piani (`PlanTable.test.tsx`).
- [x] Testi nelle cinque lingue (`tables.test.ts`).
- [x] Schermate dal simulatore e testi approvati dall'utente (2026-11-23,
      «Approvo»).
- [ ] CI verde; merge dal Coordinatore col «Sì, unisci» dell'utente; OTA.

Parte C:
- [x] Il prossimo allenamento: oggi, fatto oggi, domani, la settimana
      dopo, prima che il piano parta; i valori; i muscoli; tre esercizi e
      «+ 2 more»; una corsa in una riga senza omino (`NextWorkout.test.tsx`).
- [x] «This week: 1 of 3 done»: i giorni passati, saltati, oggi, un piano
      che parte a metà settimana, un allenamento che aspetta sul telefono
      (`weekDone.test.ts`); nel riquadro (`PlanTable.test.tsx`).
- [x] Testi nelle cinque lingue (`tables.test.ts`).
- [x] Schermate dal simulatore e testi approvati dall'utente (2026-11-23,
      «Approvo»).
- [ ] CI verde; merge dal Coordinatore col «Sì, unisci» dell'utente; OTA.

Parte B: i criteri quando la parte A è in `main` (la sezione arriva con la
sua PR).
