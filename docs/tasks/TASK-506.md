# TASK-506 — Le schede della palestra: la tabella, la sola palestra, il prossimo allenamento

**Stato**: Done · 2026-11-24 · A #1523 (`8b84b0c4`), B e D #1525
(`1bca4123`), C #1528 (`fee20d90`) in `main`; documenti nella PR di soli
documenti. Esito: in «My plans» la tabella del piano e il prossimo
allenamento con «Questa settimana: 1 di 3 fatti»; un piano nuovo di sola
palestra, la Palestra già scelta; i segni degli sport dal menu degli sport
e un solo giallo. Resta l'OTA di produzione (Coordinatore, col sì
dell'utente) e la prova sul telefono
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

## Parte B — Un piano di sola palestra

- In «Cosa vuoi allenare?» basta uno sport (`MIN_PLAN_SPORTS` da 2 a 1):
  «Next · 1 chosen», il tasto spento solo senza nessuno sport. Cambia la
  regola «Almeno due, sempre» del 2026-11-11 (ADR-0371): l'aggiunta datata
  va nella PR di soli documenti.
- All'apertura è scelta la Palestra (prima corpo libero e corsa):
  «Nuovo piano» sta solo nelle pagine della palestra (Draw e la modalità
  allenamento). Un piano di sola palestra è «Continue» fino in fondo.
- La riga sotto il titolo: «Choose one or more. Then we guide you in 5
  steps.» al posto di «Choose at least two: a plan always mixes two
  sports…», nelle cinque lingue.
- In `main` con #1525 (`1bca4123`, insieme alla D).

## Parte D — I segni degli sport e un solo giallo (punto U7)

Aggiunta dal Coordinatore il 2026-11-23: il punto U7 della prova al
simulatore del 2026-11-23 (`out/prova-app-2026-11-23/PROPOSTE.md`),
approvato dall'utente («Sì, tutti»). In «Nuovo piano» gli sport di distanza
avevano sigle in inglese («RUN», «WALK», «BIKE», «SWIM») e un colore di
selezione azzurro accanto al giallo.

- `SPORT_BADGES` prende il segno dai profili degli sport
  (`profileOf(...).emoji` di `src/sports`), la stessa fonte del menu degli
  sport: oggi l'emoji (🏃 🚶 🚴 🏊 ⛰️), con TASK-510 le icone a linea
  senza toccare la guida (condizione del Coordinatore: niente emoji scritte
  a mano). Il segno sta nei quadratini dell'ingresso, nelle caselle dei
  giorni, nelle righe «Come dividiamo il lavoro», nelle linguette, e (con
  la C) nel riquadro di «I miei piani» al posto di «RUN».
- Un solo colore di selezione nell'ingresso, il giallo; `runDay` resta per i
  giorni di corsa nel resto della guida.
- Nessun testo nuovo. In `main` con #1525.

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
`i18n/{it,de,fr,es}.ts`, e `tabs/TabSwipeOwners.test.ts` (il registro
degli scroll orizzontali, approvato dal Coordinatore dopo la CI rossa);
documenti `docs/tasks/TASK-506.md`, `docs/sports/gym.md`.

Parte B: `gym/SportsDoor.tsx`, `gym/SportsDoor.test.tsx`,
`gym/GymPlans.test.tsx`, `gym/GymPlanWizard.tsx` (un commento), i18n,
`docs/sports/gym.md`. Parte D, nella stessa PR (lista approvata dal
Coordinatore): `gym/SportsDoor.tsx` e il suo test, `gym/GymPlans.test.tsx`,
`docs/sports/gym.md`; nella C `gym/GymPlans.tsx` («RUN» → il segno) e
l'attesa in `gym/GymPlans.test.tsx`.

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
- [x] CI verde e merge (#1523, `8b84b0c4`), col «Sì, unisci» dell'utente al
      Coordinatore; prima un ritocco: la tabella nel registro degli scroll
      orizzontali (`TabSwipeOwners.test.ts`).
- [ ] OTA.

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
- [x] CI verde e merge (#1528, `fee20d90`), col «Sì, unisci» dell'utente al
      Coordinatore.
- [ ] OTA.

Parte B e parte D (#1525):
- [x] Uno sport basta, la Palestra scelta all'apertura, un piano di sola
      palestra fino in fondo; le corse e il corpo libero partono dalla
      Palestra già scelta (`SportsDoor.test.tsx`, `GymPlans.test.tsx`).
- [x] I segni dai profili degli sport, nessuna sigla in inglese, un solo
      giallo (`SportsDoor.test.tsx`); le caselle dei giorni col segno
      (`GymPlans.test.tsx`).
- [x] Schermate, testi e scelte approvati dall'utente (2026-11-23).
- [x] CI verde e merge (#1525, `1bca4123`), col «Sì, unisci» dell'utente al
      Coordinatore.
- [ ] OTA.

## Uscita e prova

- Tutto solo app, nessun server: esce col prossimo OTA di produzione,
  pubblicato dal Coordinatore col sì dell'utente.
- Dopo l'OTA, sul telefono: «My plans» → «Table» (le quattro settimane,
  l'intestazione apre «Weeks»), il riquadro col prossimo allenamento e «This
  week: X of Y done», «New guided plan» con la Palestra già scelta e i segni
  degli sport.
- Il quarto punto della tela, «Fallo oggi» per un allenamento saltato
  (tocca anche il server), resta per un giro dopo: un task nuovo col suo
  numero.
