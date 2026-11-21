# TASK-483 — Lo storico di ogni esercizio in palestra

**Stato**: In corso (parte 0, solo documenti: le domande all'utente)
**Fase**: 5 · **Branch**: una PR per parte; la parte 0 è
`docs/TASK-483-exercise-history`
**Dipende da**: TASK-385 (la palestra, le serie salvate), TASK-411 (la
scelta dell'esercizio, la guida «i»)
**ADR**: **ADR-0392** · numero del task e dell'ADR dal Coordinatore
(fork 2) il 2026-11-21.

## Obiettivo

Scelto un esercizio in palestra, l'app dice quanto si è fatto le volte
scorse e mostra tutto lo storico di quell'esercizio in modo che si capisca
a colpo d'occhio se si sta migliorando. L'ha chiesto l'utente il
2026-11-21: «Quando seleziono un esercizio da fare in palestra, mi deve
dire quanto ha fatto l'scorse volte con tutto lo storico DA POTER
VISUALIZZARE IN MANIERA INTELIGENTE».

## Com'è oggi (letto in `main` a `5ef3d45b`, 2026-11-21)

- **Le serie ci sono tutte, sul server**: `gym_sets`
  (`migrations/0047_gym.sql`), una riga per serie con `run_id`, `n`,
  `exercise` (chiave del catalogo) o `name` (nome libero), `kind`
  (`load`, `bodyweight`, `timed`, `cardio`) e i campi del tipo (`reps`,
  `load_kg`, `duration_s`, `distance_m`, …), `live`. L'allenamento è una
  corsa (`runs`) dell'attività `gym` senza traccia.
- **Nessuno le rilegge per esercizio**: l'API ha `PUT`/`GET
  /me/gym-sessions/{key}` (un allenamento intero), il calendario, le
  schede, i livelli (`gym_levels.py`, il meglio per esercizio, solo per la
  figura) e la classifica del mese. Non c'è un «tutte le mie serie di
  questo esercizio».
- **L'app non mostra le volte scorse**: sull'esercizio in corso
  (`gym/WorkoutScreen.tsx`, `gym/SetFields.tsx`) i campi partono vuoti o
  dai valori della scheda seguita; la guida «i» (`gym/ExerciseGuide.tsx`)
  spiega il movimento e basta.
- **Un allenamento fatto senza rete** resta nella coda del telefono
  (`gym/gymOutbox.ts`) finché non arriva al server.

## La proposta (dell'agente, mostrata all'utente il 2026-11-21)

Tre schermi:

1. **Durante l'allenamento**, sotto il nome dell'esercizio, un riquadro
   «Last time · {data}» con le serie dell'ultima volta («80 × 8 · 80 × 8 ·
   75 × 10») e un suggerimento per crescere («Try 82.5 kg × 8»). Peso e
   ripetizioni della prima serie **già compilati** con quelli
   dell'ultima volta. Sotto, «History».
2. **«History»**: il grafico dell'andamento (1M, 3M, 1Y, All) e quattro
   record (Heaviest, Most reps, Best volume, Level). Il grafico segue il
   **massimale stimato** per i carichi, così 80 × 8 e 85 × 5 si
   confrontano; a corpo libero le ripetizioni, per i tempi i secondi, per
   il cardio la distanza.
3. **Tutte le sedute**, dalla più recente, con le loro serie e una freccia
   rispetto alla volta prima (↑ +2,5 kg, =, ↓), «PR» sui record.

«History» si apre anche dalla guida «i» dell'esercizio, quindi anche da
«+ Exercise» fuori da un allenamento.

## Le parti (proposta dell'agente)

| Parte | Cosa | Dove va |
|---|---|---|
| 0 | Questo file, ADR-0392, le domande all'utente | documenti |
| A | `GET /me/gym-history?exercise=` (o `name=`): record e un punto per seduta per il grafico su tutto lo storico, le sedute con le serie a pagine dalla più recente; file nuovi (`gym_history.py`, test, fixture, tipi in shared-types), in `app.py` solo righe aggiunte; un indice nuovo solo se la misura lo chiede | server, poi un passo sul server col sì dell'utente (controlli di sola lettura in `out/TASK-483/SERVER-A.md`) |
| B | App: il riquadro «Last time» e i campi già compilati, la pagina «History» con grafico, record e sedute; gli allenamenti ancora in coda contano | app, OTA; elenco dei file al Coordinatore prima del codice, testi e schermate all'utente |

### Cose da tenere ferme

- **Solo le proprie serie**: lo storico è di chi è entrato, mai di altri;
  nessun dato nuovo lascia il telefono.
- **Il massimale stimato** è un numero calcolato, non una promessa: si
  dice «estimated» e si calcola solo da serie con poche ripetizioni (vedi
  ADR-0392).
- **Pesi salvati in kg**, mostrati in kg o lb come nelle unità.
- Nessuna dipendenza nuova: il grafico si disegna con quello che l'app ha
  già.

## Domande all'utente (una alla volta; le risposte qui sotto)

1. **La proposta in tre schermi** (riquadro «Last time», campi già
   compilati, «History» con massimale stimato, record e sedute): va bene
   così? **Risposta dell'utente, 2026-11-22: «Sì, così».**
2. Il suggerimento «Try 82.5 kg × 8»: sì o no, e con che regola (proposta:
   +2,5 kg se l'ultima volta tutte le serie sono arrivate alle ripetizioni,
   altrimenti lo stesso peso).
3. Un esercizio col nome libero: lo storico unisce le serie con lo stesso
   nome, senza badare a maiuscole e spazi (proposta).
4. «History» anche fuori dall'allenamento, dalla guida «i» (proposta).

## File toccati

Parte 0: `docs/tasks/TASK-483.md` (nuovo), `docs/DECISIONS.md` (ADR-0392),
`docs/STATUS.md` (la voce del task), `docs/INDEX.md` (una riga). Gli
elenchi delle parti A e B vanno al Coordinatore prima del codice.

## Fuori scope

- Lo storico di un altro (il profilo pubblico, la classifica restano come
  sono).
- Grafici di gruppi muscolari o del volume settimanale di tutta la
  palestra.
- Modificare o cancellare una serie vecchia dallo storico.
- Schede che si adattano da sole allo storico (le settimane delle schede
  guidate restano quelle di TASK-433).

## Registro

- 2026-11-21: task aperto su richiesta dell'utente; numero e ADR dal
  Coordinatore (fork 2), che dice: file palestra liberi, A solo server con
  file nuovi e `app.py` solo righe aggiunte (merge di main prima di ogni
  push), passo sul server col sì dell'utente, B con l'elenco dei file
  prima del codice e il simulatore su «simulatore tuo». Proposta in tre
  schermi mostrata all'utente; domanda 1 in attesa.
