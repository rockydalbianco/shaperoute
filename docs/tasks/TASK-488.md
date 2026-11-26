# TASK-488 — La scheda si adatta a com'è andata

**Stato**: Done · 2026-11-23 · A #1415 e B #1420 in `main`, A sul server
(passo 19); esce col prossimo OTA di produzione, poi la prova sul telefono
(«Uscita e prova»)
**Prova sul telefono**: fatta dall'utente il 2026-11-26, prova generale sull'OTA 25: «ok».
**Fase**: 5 · **Branch**: `feat/TASK-488-a-adapt-server`, `feat/TASK-488-b-adapt-app`
**Dipende da**: TASK-433 (schede guidate), TASK-452 (corsa su misura), TASK-461 (pianificatore)
**ADR**: ADR-0396 · numeri dal Coordinatore il 2026-11-22

## Obiettivo

Dopo TASK-452, l'utente ha scelto il 2026-11-22 il miglioramento successivo
delle schede: «La scheda si adatta». A fine allenamento di un giorno della
scheda una domanda, «Facile / Giusto / Duro», e la volta dopo quel giorno
sale, resta o scende invece di crescere sempre allo stesso passo.

## Scelte dell'utente (2026-11-22, una alla volta)

Sulla tela «Schede palestra guidate»
(https://claude.ai/artifact/4Z1qMhK5bc3p2JLgu8t8Ym), riga H, schermate
H1–H3:

1. **La domanda**: «Una per allenamento» — una volta sola, per tutti gli
   esercizi del giorno, anche nei giorni di corsa; senza risposta va avanti
   come previsto.
2. **Le regole**: «Così, come in H2» — Facile un passo in più del previsto,
   Giusto come previsto, Duro la volta dopo uguale, due «Duro» di fila un
   passo indietro; nei giorni di corsa lo stesso.
3. **Acceso?**: «Accesa, si può spegnere» — per ogni scheda, anche quelle già
   fatte; interruttore e segni ↑ = ↓ in «My plans».
4. **Testi e grafica**: «Approvo».
5. **Server**: «Sì, procedi».

## Il disegno tecnico (ADR-0396, deciso dall'agente su delega dell'utente)

- **Un campo facoltativo `adapt` nel programma**: `off` e `days`, al più uno
  per giorno della settimana, `{day, steps −24…24, hard 0–2, last}`. Nessuna
  migrazione: sta nel JSONB `gym_plans.program`; `gym_plans.py` lo valida
  (`GymPlanAdaptBody`). Un giorno tolto dal programma perde le sue risposte
  invece di far rifiutare la scheda (un'app che copia `adapt` così com'è).
- **I passi li applica il telefono** (`program.ts`, `shiftOf`): in «più kg»
  `step_kg` a passo; in «più ripetizioni» un gradino della sua scala (mai
  sotto la prima settimana); senza kg una ripetizione (5 s se tenuto); i
  giorni di corsa un passo della loro crescita (anche con «sempre uguale»).
  Le settimane scritte a mano si spostano allo stesso modo.
- **Le regole** (`adapt.ts`, `answerDay`): Facile `steps + 1`; Giusto
  niente; Duro `steps − 1` se il modo cresce, e `− 1` in più dopo un «Duro»;
  `hard` conta i «Duro» di fila fino a 2. I giorni verso una meta
  (TASK-461) e le uscite non si adattano: seguono la loro scala fino al giorno.
- **Quando si tiene**: la risposta si tiene con «Save» dell'allenamento (o
  della corsa), sulla scheda nel telefono; parte verso l'API con la
  sincronizzazione seguente delle schede (la pagina della palestra, «My
  plans»), senza chiamate dalla fine dell'allenamento.
- **La guida** (`GymPlanWizard.tsx`) tiene `adapt` quando si modifica la
  scheda, per i giorni che ha ancora.
- **L'app di prima** (OTA 22) legge un programma con `adapt` (campo
  ignorato) e lo copia così com'è salvando la scheda. Il server va aggiornato
  prima dell'OTA: oggi rifiuta il campo.

## File toccati

Lista approvata dal Coordinatore il 2026-11-22. PR A (server e tipi):
`services/api/shaperoute_api/gym_plans.py`, `tests/test_gym_plans.py`,
`packages/shared-types/src/gym.ts`, `fixtures/gym-plans.json`,
`test/gym.test.ts`, `docs/API.md`. PR B (l'app): `api/gymPlans.ts` (+ test),
nuovi `gym/adapt.ts`, `gym/adapt.test.ts`, `gym/AdaptQuestion.tsx`,
`gym/GymEndAdapt.test.tsx`, `activities/RunEndAdapt.test.tsx`;
`gym/program.ts` (+ test), `gym/GymEnd.tsx`, `activities/RunEnd.tsx`,
`gym/GymPlans.tsx`, `gym/GymPlans.test.tsx`, `gym/GymPlanWizard.tsx`,
`i18n/{it,de,fr,es}.ts`; `docs/tasks/TASK-488.md`, `docs/sports/gym.md`.
STATUS, DECISIONS (ADR-0396) e INDEX in una PR di soli documenti dopo il
merge.

## Testi

In inglese nell'app, tradotti in it, de, fr, es (chiavi in fondo ai file).
Tre piccole differenze dalla tela, per le lingue: «Change» è
`Change@@answer` (la chiave «Change» esiste già come «Differenza»); «Lunedì
prossimo» è «La prossima volta (lunedì)», perché il giorno cambia genere;
a fine corsa il titolo è «Lungo della scheda: com'è andata?», perché il modulo
della corsa ha già un «Com'è andata?» (la descrizione).
In palestra il titolo è «Come ti è sembrata la scheda?», scelta dell'utente
del 2026-11-23 dopo le schermate (il modulo del post sotto ha già «Com'è
andata?»). Dal simulatore una riga nuova: «La prossima è la settimana più
leggera, per recuperare.», quando la settimana dopo è quella di recupero del
ciclo (altrimenti «Facile» mostrerebbe un peso più basso senza dire perché).
Gli esercizi che in «più kg» non crescono (senza kg) non scendono mai sotto
quanto è scritto.

## Criteri di accettazione

- [x] Il server tiene e valida `adapt` (`test_gym_plans.py`).
- [x] Le regole, i passi nelle settimane, i segni, cosa cambia
      (`adapt.test.ts`, `program.test.ts`).
- [x] La domanda a fine allenamento e a fine corsa, «Change», tenuta con
      «Save» (`GymEndAdapt.test.tsx`, `RunEndAdapt.test.tsx`).
- [x] Segni e interruttore in «My plans», la guida che tiene le risposte
      (`GymPlans.test.tsx`).
- [x] Testi nelle cinque lingue.
- [x] CI verde; A in `main` (#1415, `29ac99be`) e sul server (passo 19
      del 2026-11-22, col sì dell'utente: «adapt ok plans 2 adapted 0»),
      poi B in `main` (#1420, `32096511`, 2026-11-23).
- [x] Schermate dal simulatore all'utente (`out/TASK-488/`), approvate il
      2026-11-23.
- [ ] OTA di produzione col sì dell'utente (Coordinatore); prova sul
      telefono.

## Esito

La domanda a fine allenamento e a fine corsa, le regole di H2, i segni e
l'interruttore in «My plans» sono in `main`; il server tiene `adapt` dal
passo 19. Documenti: ADR-0396 in `DECISIONS.md`, riga in `INDEX.md` e in
`archive/COMPLETATI.md` (PR di soli documenti).

## Uscita e prova

- **OTA**: B esce col prossimo OTA di produzione, che il Coordinatore
  chiede all'utente quando la coda si calma.
- **Prova sul telefono** dopo l'OTA: finire un allenamento di una scheda
  con account, rispondere «Facile», vedere cosa cambia la volta dopo,
  «Save»; in «My plans» il segno ↑ accanto al giorno e l'interruttore;
  un giorno di corsa della scheda con la sua domanda a fine corsa.
