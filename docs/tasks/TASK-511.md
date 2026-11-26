# TASK-511 — L'allenamento in palestra dal vivo e la sua fine

**Stato**: In lavorazione · parte 0 chiusa il 2026-11-26 (quattro scelte
dell'utente); lista dei file al Coordinatore prima del codice
**Fase**: 5 · **Branch**: `feat/TASK-511-gym-live-end`
**Filone**: Allenamento (cornice del 2026-11-26) · numero dal Coordinatore
il 2026-11-23
**ADR**: nessuno nuovo; un'«aggiunta (TASK-511)» ad ADR-0327 (la palestra)
nella PR di documenti finale
**Dipende da**: TASK-385 (la palestra, ADR-0327), TASK-483 B (l'ultima
volta nelle caselle), TASK-491 C («Next time»)

## Obiettivo

Nella prova al simulatore del 2026-11-23 (`out/prova-app-2026-11-23/
PROPOSTE.md`, U8 e U9, schermate s23–s25):

- **U8**: il cronometro parte a «Inizia l'allenamento», mentre si sceglie
  ancora il primo esercizio (0:33 prima della prima serie); ripetizioni e
  peso sono caselle vuote da scrivere; toccando «Stop» i pulsanti saltano
  per far posto a «Tieni premuto per fermare».
- **U9**: a fine allenamento arriva subito il modulo del post, senza un
  riepilogo; con zero serie il pulsante giallo resta «Salva».

## Le scelte dell'utente (2026-11-26)

1. **Cronometro**: «Al primo esercizio». Parte quando si sceglie il primo
   esercizio; prima resta 0:00 con «Starts with the first exercise». Con
   una scheda il primo esercizio c'è già: parte subito, come ora.
2. **Serie**: «− e + accanto». Ogni casella ha − e + ai lati
   (ripetizioni di 1, peso di 2,5 kg o 5 lb) e resta scrivibile. Senza
   scheda né volta prima: 10 ripetizioni, peso vuoto.
3. **Riepilogo**: «Riquadro in cima». Sopra il modulo del post, nella
   stessa pagina: l'omino coi muscoli lavorati, gli esercizi raggruppati
   («Bench press · 3 × 10 · 60 kg», si toccano per correggere), serie e
   kg totali, «Next time».
4. **Zero serie**: «Giallo su "+ Exercise"». Una riga «No sets logged»;
   il giallo passa a «+ Exercise»; «Save» resta, grigio, e salva solo tempo
   e kcal (un corso, per esempio).

Deciso dall'agente su delega: «Stop» non sposta più niente. La scritta
sotto il pulsante ha una larghezza fissa e va a capo; vale per corsa,
piscina e palestra, che usano lo stesso `HoldButton`.

## Le parti

- **A — Dal vivo** (U8): il cronometro, − e +, «Stop» fermo.
  - `workout.ts`: `chooseExercise` del primo esercizio, senza serie e prima
    della fine, rimette l'inizio (`startedMs`, `lastActiveMs`) a quel
    momento e toglie le pause di prima.
  - `WorkoutScreen.tsx`: senza esercizio 0:00 e «Starts with the first
    exercise».
  - `SetFields.tsx`: − e + per ogni campo con un passo (ripetizioni,
    peso, piani, livello; il tempo di 5 s, la distanza no); le stesse
    caselle in `GymEnd` e `SessionEditor`.
  - Le 10 ripetizioni di partenza in `startTexts`.
  - `screens/HoldButton.tsx`: la scritta a larghezza fissa.
- **B — La fine** (U9): `GymEndSummary.tsx` (nuovo) col riquadro; in
  `GymEnd.tsx` il riquadro al posto del conteggio e delle righe, e il caso
  zero serie.

## Testi nuovi (inglese; le traduzioni in it, de, fr, es)

- «Starts with the first exercise» — «Parte col primo esercizio»
- «No sets logged» — «Nessuna serie segnata»
- «{load} lifted» — «{load} sollevati»
- «Less {field}» / «More {field}» (solo per VoiceOver) — «{field}: meno» /
  «{field}: più»

## Criteri di accettazione

- [ ] Il cronometro segna 0:00 finché non si sceglie il primo esercizio,
      poi parte da lì; con una scheda parte subito; un esercizio aggiunto a
      fine allenamento non lo tocca (`workout` test).
- [ ] − e + cambiano il valore del passo giusto, mai sotto zero, e la
      casella resta scrivibile; la prima volta 10 ripetizioni.
- [ ] Toccando «Stop» né «Pause» né «Stop» cambiano posto (corsa, piscina,
      palestra).
- [ ] La fine mostra il riquadro con omino, esercizi raggruppati e totali;
      un esercizio toccato si corregge come prima.
- [ ] Con zero serie: «No sets logged», giallo su «+ Exercise», «Save»
      grigio e funzionante.
- [ ] Testi in cinque lingue; test toccati, `tsc` ed `eslint` verdi; la
      suite intera in CI. Niente di nativo, niente sul server.

## File toccati (da confermare col Coordinatore)

```
apps/mobile/src/gym/workout.ts, workout.test.ts (o un test nuovo)
apps/mobile/src/gym/WorkoutScreen.tsx
apps/mobile/src/gym/SetFields.tsx
apps/mobile/src/gym/GymEnd.tsx                     (lo elenca anche TASK-489)
apps/mobile/src/gym/GymEndSummary.tsx, *.test.tsx  (nuovi)
apps/mobile/src/screens/HoldButton.tsx              (corsa, piscina, palestra)
apps/mobile/src/i18n/en.ts, it.ts, de.ts, fr.ts, es.ts
docs/tasks/TASK-511.md                              (nuovo)
```

## Diario

- **2026-11-26** — Task dato dal Coordinatore (fork 3). Parte 0: quattro
  domande all'utente, tutte con la proposta dell'agente.
