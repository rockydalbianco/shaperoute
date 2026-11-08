# TASK-411 — La palestra per tutti i giorni: griglia, guida, schede e calendario

**Stato**: In lavorazione · proposta in `main` (#928); parte A in `main`
(#930); ogni parte dopo la sua lista dei file al Coordinatore
**Fase**: 5 · **Branch**: `feat/TASK-411-a-…` per il codice
**Dipende da**: TASK-385 (la palestra: B, E e F in `main`), la #927 (la
schermata dell'allenamento si apre da «Draw»)
**ADR**: ADR-0341 (proposto) · numeri dal Coordinatore il 2026-11-06

## Obiettivo

Chi va in palestra trova in MuW quello che usa ogni settimana: i macchinari
divisi per gruppo muscolare in una griglia, in «Draw» due righe per
cominciare e quante volte è andato, le sue schede con i giorni (e
l'allenamento che le segue), un calendario del mese.

## Contesto da leggere

- `DECISIONS.md` ADR-0341 (questo task), ADR-0327 con le precisazioni
  della palestra
- `docs/sports/gym.md`: il catalogo, i gruppi, i tipi di serie
- `tasks/TASK-385.md`: le scelte della palestra e i testi già approvati

## Com'è oggi (main `8c1e84da`)

- «+ Exercise» apre il catalogo con la ricerca, i gruppi come filtri in
  una riga e l'elenco dei 91 esercizi (`gym/ExercisePicker.tsx`).
- In «Draw», con «Gym», c'è solo «Start workout» con la sua riga sotto
  (`screens/ChooseScreen.tsx`); fino alla #927 non apriva niente.
- Gli allenamenti stanno in «My activities» fra le corse; nessun
  calendario, nessuna scheda.

## Scelte dell'utente (2026-11-06, una alla volta)

1. **Griglia**: «Gruppi, poi macchinari». «+ Exercise» apre 8 riquadri
   grandi, uno per gruppo muscolare con la sua emoji e quanti esercizi ha;
   toccato un gruppo, i suoi in una griglia a 2 colonne; la ricerca resta
   in alto e il nome libero c'è ancora.
2. **Guida in «Draw»**: «3 passi + ultimo allenamento». Sotto «Start
   workout» un riquadro «How it works» con tre passi; sotto, l'ultimo
   allenamento e quante volte questo mese, che apre il calendario.
3. **Piano di lavoro**: «Schede + giorni». Schede con un nome, gli
   esercizi in ordine e per ognuno serie × ripetizioni × kg (o i campi del
   suo tipo); i giorni della settimana di ogni scheda. In «Draw» «Today:
   Push» e «Start workout» la segue, esercizio dopo esercizio, coi valori
   già scritti; «Start without the plan» per un allenamento libero. Le
   schede stanno sull'account e le vede solo chi le ha fatte.
4. **Calendario**: «Mese con giorni segnati». Si apre dalla riga «This
   month» di «Draw» e dal riquadro «🏋️ Gym» del profilo: un mese a
   griglia, un pallino giallo nei giorni con un allenamento (il nome della
   scheda sotto), grigio nei giorni di una scheda non fatta; «‹ ›» per i
   mesi; un giorno toccato apre l'allenamento. Lo vede solo il
   proprietario.
5. **Testi**: «Approvo» per la guida e il calendario, «Approvo» per le
   schede (sotto, nelle cinque lingue).

## Il disegno tecnico

In ADR-0341 (proposto, deciso dall'agente su delega dell'utente).

## Le parti

| Parte | Cosa | Server · testi · OTA |
|---|---|---|
| A | La griglia dei gruppi e dei macchinari in «+ Exercise» | solo app; nessun testo nuovo; OTA col sì |
| B | Il calendario del mese e la guida in «Draw» (`GET /me/gym-calendar`) | server col sì; testi approvati; OTA col sì |
| C | Le schede: tabella, migrazione (numero dal Coordinatore con la lista), API, l'editor, «Today» in «Draw», l'allenamento guidato, i giorni saltati nel calendario | migrazione, server e OTA col sì |
| D | La privacy: una riga sulle schede | testo col sì dell'utente |
| E | Un omino animato accanto a ogni esercizio e una mini guida (3 passi e un avviso) — richiesta dell'utente del 2026-11-07 | solo app; testi approvati; OTA col sì |
| F | La palestra più chiara: in «Draw» una sola scheda con un tasto, calendario e schede come riquadri; nell'allenamento barra, «Set n of m», «Then: …» — richiesta dell'utente del 2026-11-08 | solo app; testi approvati; OTA col sì |

## File toccati

Proposta (#928, in `main`): `docs/tasks/TASK-411.md` (nuovo),
`docs/DECISIONS.md` (ADR-0341), `docs/STATUS.md` (una voce),
`docs/INDEX.md` (una riga). La lista precisa di ogni parte va al
Coordinatore prima della parte.

**Parte E** (#941, in `main` a `512e916a`): nuovi in `apps/mobile/src/gym/`
`moves.ts`, `moves.test.ts`, `ExerciseFigure.tsx`, `ExerciseGuide.tsx`,
`ExerciseGuide.test.tsx`, `guides/{types,index,en,it,de,fr,es}.ts`;
modificati `ExerciseGrid.tsx`, `ExerciseGrid.test.tsx`, `ExercisePicker.tsx`,
`WorkoutScreen.tsx`, `i18n/{it,de,fr,es}.ts` (tre righe ciascuno). Documenti
di chiusura: `docs/tasks/TASK-411.md`, `docs/STATUS.md`, `docs/DECISIONS.md`,
`docs/sports/gym.md`.

**Parte A** (#930, in `main` a `a56f78c5`): `apps/mobile/src/gym/ExerciseGrid.tsx`
(nuovo), `ExerciseGrid.test.tsx` (nuovo), `ExercisePicker.tsx`; i test che
ora toccano un gruppo prima dell'esercizio: `GymWorkoutHost.test.tsx`,
`GymKcalShown.test.tsx`, `GymPostForm.test.tsx`; `tabs/TabSwipeOwners.test.ts`
(la riga dei gruppi scorrevole non c'è più). Documenti di chiusura:
`docs/tasks/TASK-411.md`, `docs/STATUS.md`, `docs/sports/gym.md`.

**Parte B** (lista approvata dal Coordinatore il 2026-11-08): server
`services/api/shaperoute_api/gym_calendar.py` (nuovo), `app.py` (una
riga), `tests/test_gym_calendar.py` (nuovo); shared-types `src/gym.ts`,
`fixtures/gym-calendar.json` (nuovo), `test/gym.test.ts`; app
`api/gymCalendar.ts` e `.test.ts` (nuovi), `gym/GymCalendar.tsx`,
`gym/GymDrawGuide.tsx`, `gym/GymCalendar.test.tsx` (nuovi),
`screens/ChooseScreen.tsx`, `i18n/{it,de,fr,es}.ts`; documenti
`docs/tasks/TASK-411.md`, `docs/STATUS.md`, `docs/DECISIONS.md`,
`docs/sports/gym.md`; `gym/GymLevels.tsx` («Gym calendar ›» nel riquadro 🏋️
del profilo, solo con `own`) e `profile/ProfileHome.tsx` (la sola prop `own`,
ok del Coordinatore il 2026-11-08: il riquadro compare anche sui profili
degli altri, `UserProfilePage` resta com'è).

**Parte C** (lista approvata dal Coordinatore il 2026-11-08; l'utente ha
detto «ok va bene» a farla lo stesso giorno): server
`migrations/0060_gym_plans.sql` (numero in bozza, il vero è il primo libero
in `main` al merge), `shaperoute_api/gym_plans.py` (nuovo),
`gym_sessions.py` (`plan`), `gym_calendar.py` (nome della scheda, giorni
saltati), `app.py` (una riga), `tests/test_gym_plans.py` (nuovo);
shared-types `src/gym.ts`, `fixtures/gym-plans.json` (nuovo),
`fixtures/gym-calendar.json`, `test/gym.test.ts`; app `api/gymPlans.ts` e
`.test.ts`, `gym/plans.ts`, `gym/plans.test.ts`, `gym/GymPlans.tsx`,
`gym/GymPlanEditor.tsx`, `gym/GymPlans.test.tsx` (nuovi), `gym/workout.ts`,
`gym/useWorkout.ts`, `gym/WorkoutScreen.tsx`, `gym/GymDrawGuide.tsx`,
`gym/GymCalendar.tsx`, `i18n/{it,de,fr,es}.ts`; documenti
`docs/tasks/TASK-411.md`, `docs/STATUS.md`, `docs/DECISIONS.md`,
`docs/sports/gym.md`, `docs/API.md`, `docs/DATABASE.md`.

## Testi dell'interfaccia (approvati il 2026-11-06)

| en | it | de | fr | es |
|---|---|---|---|---|
| How it works | Come funziona | So funktioniert's | Comment ça marche | Cómo funciona |
| Pick an exercise from the grid | Scegli un esercizio dalla griglia | Wähle eine Übung aus dem Raster | Choisis un exercice dans la grille | Elige un ejercicio de la cuadrícula |
| Log each set: the rest starts by itself | Segna ogni serie: il recupero parte da solo | Trag jeden Satz ein: die Satzpause startet von selbst | Note chaque série : la récup démarre toute seule | Anota cada serie: el descanso empieza solo |
| «Save»: calories, milestones and leaderboard | «Salva»: calorie, traguardi e classifica | «Speichern»: Kalorien, Stufen und Rangliste | « Enregistrer » : calories, niveaux et classement | «Guardar»: calorías, niveles y clasificación |
| Last workout: {when} · {time} | Ultimo allenamento: {when} · {time} | Letztes Training: {when} · {time} | Dernière séance : {when} · {time} | Último entrenamiento: {when} · {time} |
| This month: 1 time | Questo mese: 1 volta | Diesen Monat: 1 Mal | Ce mois-ci : 1 fois | Este mes: 1 vez |
| This month: {n} times | Questo mese: {n} volte | Diesen Monat: {n} Mal | Ce mois-ci : {n} fois | Este mes: {n} veces |
| Gym calendar | Calendario palestra | Fitness-Kalender | Calendrier salle | Calendario gimnasio |
| {n} times · {time} | {n} volte · {time} | {n} Mal · {time} | {n} fois · {time} | {n} veces · {time} |
| Workout · Planned (screen reader) | Allenamento · In programma | Training · Geplant | Séance · Prévue | Entrenamiento · Previsto |
| Plans | Schede | Pläne | Programmes | Rutinas |
| New plan | Nuova scheda | Neuer Plan | Nouveau programme | Nueva rutina |
| Plan name | Nome della scheda | Name des Plans | Nom du programme | Nombre de la rutina |
| Days | Giorni | Tage | Jours | Días |
| Sets | Serie | Sätze | Séries | Series |
| {n} exercises | {n} esercizi | {n} Übungen | {n} exercices | {n} ejercicios |
| Today: {plan} | Oggi: {plan} | Heute: {plan} | Aujourd'hui : {plan} | Hoy: {plan} |
| Start without the plan | Inizia senza scheda | Ohne Plan starten | Commencer sans programme | Empezar sin rutina |
| Plan: {done}/{total} sets | Scheda: {done}/{total} serie | Plan: {done}/{total} Sätze | Programme : {done}/{total} séries | Rutina: {done}/{total} series |
| Delete plan | Elimina la scheda | Plan löschen | Supprimer le programme | Eliminar la rutina |
| Delete “{name}”? | Eliminare «{name}»? | „{name}“ löschen? | Supprimer « {name} » ? | ¿Eliminar «{name}»? |

«Reps», «Weight», «Back», «Close», i nomi dei gruppi e dei mesi ci sono
già. `{when}` è «Today», «Yesterday» o il giorno di `dayLabel`.

**Parte F** (richiesta dell'utente del 2026-11-08, «cerca di renderla più
chiara e facile da utilizzare»; anteprima scelta «Sì, così»; lista al
Coordinatore lo stesso giorno): `gym/GymDrawGuide.tsx`,
`screens/ChooseScreen.tsx`, `gym/WorkoutScreen.tsx`, `gym/workout.ts`,
`i18n/{it,de,fr,es}.ts` (cinque testi nuovi, «Today: {plan}» tolto), i test
`gym/GymCalendar.test.tsx`, `gym/GymPlans.test.tsx`; documenti
`docs/tasks/TASK-411.md`, `docs/STATUS.md`, `docs/sports/gym.md`. Parte dal
branch della C e la PR si apre dopo la #964.

## Testi della parte F (approvati il 2026-11-08)

| en | it | de | fr | es |
|---|---|---|---|---|
| Start “{plan}” | Inizia «{plan}» | „{plan}“ starten | Commencer « {plan} » | Empezar «{plan}» |
| {n} plans | {n} schede | {n} Pläne | {n} programmes | {n} rutinas |
| 1 plan | 1 scheda | 1 Plan | 1 programme | 1 rutina |
| Set {n} of {total} | Serie {n} di {total} | Satz {n} von {total} | Série {n} sur {total} | Serie {n} de {total} |
| Then: {exercise} | Poi: {exercise} | Danach: {exercise} | Ensuite : {exercise} | Después: {exercise} |

## Testi della parte E (approvati il 2026-11-07)

| en | it | de | fr | es |
|---|---|---|---|---|
| How to do it | Come si fa | So geht's | Comment faire | Cómo se hace |
| Watch out | Attenzione | Achtung | Attention | Cuidado |
| Add to workout | Aggiungi all'allenamento | Zum Training hinzufügen | Ajouter à la séance | Añadir al entrenamiento |

Le 91 guide (tre passi e un avviso) sono in `apps/mobile/src/gym/guides/`:
l'italiano approvato dall'utente, le altre lingue dicono le stesse cose.

## Criteri di accettazione

- [x] Le scelte 1–4 hanno una risposta scritta qui.
- [x] I testi sono approvati dall'utente.
- [ ] La lista dei file di ogni parte è approvata dal Coordinatore prima
  della parte.
- [ ] Ogni parte ha test deterministici; impronta iOS 6f8bba4c invariata
  (solo JavaScript); impronta del motore invariata.
- [ ] Le schede e il calendario li vede solo il proprietario (test
  dell'API).

## Note

- 2026-11-06: nata dalla segnalazione dell'utente «ho premuto Start workout
  ma non succede nulla» (corretta nella #927) e dalla sua richiesta di
  griglia, guida, piano e calendario.
- 2026-11-08: **parte E in `main`** (#941, `512e916a`), dalla richiesta
  dell'utente del 2026-11-07 («aggiungi a fianco ai nomi animazioni degli
  esercizi, e fai anche una mini guida»), scelta «Omino nell'app». Accanto a
  ogni esercizio (riquadri, righe della ricerca, riquadri dei gruppi,
  l'esercizio in corso) un omino disegnato dall'app che fa il movimento, col
  carico in giallo; fermo con «Riduci movimento». «i» apre la guida: l'omino
  grande, tre passi, «Watch out», e «Add to workout» se aperta da
  «+ Exercise». 58 movimenti per i 91 esercizi; pose controllate in una
  galleria nel browser (`out/TASK-411-e/gallery.ts`), non nel simulatore.
  Solo JavaScript; OTA col sì dell'utente.
- 2026-11-08: **parte A in `main`** (#930, `a56f78c5`). «+ Exercise» si apre
  sugli 8 riquadri dei gruppi (emoji, nome, quanti esercizi); un gruppo
  mostra i suoi esercizi in riquadri a 2 colonne, «‹» torna ai gruppi;
  scrivendo nella ricerca l'elenco cerca in tutti i gruppi e il nome libero
  c'è ancora. Emoji cambiate rispetto all'anteprima: Schiena 🧗 (era 🔙),
  Spalle 🤸 (era 🤷), si leggono meglio. Solo JavaScript, nessun testo
  nuovo; non vista nel simulatore (spento per lo spazio su disco). OTA col
  sì dell'utente.
- 2026-11-08: **parte B scritta** (`feat/TASK-411-b-gym-calendar`).
  `GET /me/gym-calendar?tz=&month=`: i giorni del mese sul fuso del
  telefono con i loro allenamenti (inizio, tempo, post se c'è), il totale e
  l'ultimo allenamento di sempre; senza migrazione. In «Draw», sotto «Start
  workout», «How it works» in tre passi, «Last workout: {when} · {time}» e
  «This month: {n} times ›», che apre il calendario (anche da «Gym
  calendar ›» nel riquadro 🏋️ del proprio profilo): il mese a griglia da
  lunedì, un pallino giallo nei giorni con un allenamento, «‹ ›»; un giorno
  toccato elenca i suoi allenamenti e uno col post lo apre. Senza il server
  nuovo (404) restano i tre passi e il calendario dice perché. I test del
  database li fa girare la CI (Docker spento sul Mac). Server e OTA col sì.
- 2026-11-08: **parte C scritta** (`feat/TASK-411-c-gym-plans`), dopo
  l'«ok va bene» dell'utente. Le schede: nome, giorni della settimana,
  esercizi in ordine con serie e valori obiettivo; sul telefono anche senza
  rete e sull'account (`GET/PUT/DELETE /me/gym-plans`, al massimo 20 da 30
  esercizi, solo il proprietario). In «Draw» «Today: {plan}», che «Start
  workout» segue, «Start without the plan» e «Plans ›» (elenco, «New plan»,
  editor, «Delete plan» che chiede prima). L'allenamento di una scheda parte
  dal primo esercizio coi valori già scritti, dice «Plan: {done}/{total}
  sets» e passa da solo all'esercizio dopo; il salvataggio dice quale scheda
  ha seguito. Il calendario scrive la scheda di ogni allenamento e mette un
  pallino grigio nei giorni di una scheda passati senza di lei. Migrazione,
  server e OTA col sì dell'utente; i test del database li fa la CI.
- 2026-11-08: **parte F scritta** (`feat/TASK-411-f-gym-clearer`, sopra la
  C), dalla richiesta dell'utente «cerca di renderla più chiara e facile da
  utilizzare poi la mandiamo in produzione, deve uscire sull'App Store con
  il prossimo aggiornamento». In «Draw» la palestra è una pagina sua: con
  una scheda di oggi un riquadro «Today · Mon» con il nome, gli esercizi
  («Bench press 4×8») e un solo tasto giallo «Start “Push”», sotto «Start
  without the plan»; senza, «Start workout» e «New plan». Sotto due
  riquadri: il mese (quante volte, l'ultimo allenamento) che apre il
  calendario, e le schede. «How it works» solo prima del primo allenamento
  salvato. Nell'allenamento una barra gialla dell'avanzamento della scheda,
  «Set 2 of 4» coi pallini, «✓ Log set» più alto su una riga sua, «Then:
  Dips 3×10». L'uscita (build o OTA) la decide il Coordinatore col sì
  dell'utente.
- 2026-11-08: **l'uscita** (dal Coordinatore). La palestra completa (A, B,
  C, D, E, F) va in produzione con un OTA dedicato dopo che C, D e F sono in
  `main` e il server ha la migrazione delle schede (0058 o il primo libero)
  e l'endpoint del calendario; il sito della privacy si ripubblica prima
  dell'OTA; ogni passo col sì dell'utente, chiesto dal Coordinatore. Sul
  telefono arriva a tutti con l'OTA (anche a chi ha la 1.0.1) e nella build
  1.0.3; la 1.0.2 (TASK-407) è solo screenshot per scelta dell'utente: la
  palestra anche lì è un cambio a TASK-407, che gli chiede il Coordinatore.
