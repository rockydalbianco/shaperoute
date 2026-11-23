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
`gym/weekDone.ts` (+ test); modificati `gym/GymPlans.tsx`, i18n.

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

Parte B e parte C: i criteri quando partono.
