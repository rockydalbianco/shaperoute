# TASK-520 — Lo stretching rifatto: home a categorie, routine per zona, momento e sport

**Stato**: In corso · parte 0 (nessun codice) con l'utente
**Fase**: 4 · **Filone**: Allenamento (Coordinatore fork 3, 2026-11-27)
**Branch**: `docs/TASK-520-part-0` (parte 0); poi una PR per parte
**ADR**: ADR-0415
**Dipende da**: TASK-466 (A, B, D in `main`; C ed E in corso nella
sessione local_433adb76, che tiene `apps/mobile/src/stretch/**`),
TASK-475 (lo sport «Stretching», ADR-0386).

## Obiettivo

Rifare lo stretching di MuW «come Bend ma fatta meglio con le
implementazioni che t'ho dato» (utente, 2026-11-27): una home fatta di
categorie con icone e la figura che si muove; routine brevi pronte per ogni
zona del corpo, momento della giornata e sport, prima e dopo; ogni
esercizio con la sua pagina, la figura in loop e il suo tempo.

Ispirazione dalla **struttura** di Bend, mai dai suoi nomi, disegni, icone,
testi, colori o schermate. Lo stile resta MuW: colori da
`src/theme/tokens.ts`, la figura fatta di View girate (ADR-0147, niente svg
né Lottie), icone Lucide.

## Contesto

Brief: `out/stretching-nuovo/PROMPT.md` nel checkout principale.
Oggi in `main`: 15 esercizi (`exercises.ts`), le pose (`poses.ts`,
`Figure.tsx`), tre routine da 3/5/10 min «Morning», «After run», «After
gym» (`routines.ts`), il promemoria «Morning stretch», lo sport
«Stretching» in Draw con le sessioni salvate.

**Con TASK-466 E**: la home nuova ospita «My routines» di E così com'è,
sotto «Today». Le parti di codice che toccano `exercises.ts`, `poses.ts`,
`routines.ts`, `Figure.tsx` si concordano con la sessione di 466; la lista
dei file va al Coordinatore prima del codice, che decide l'ordine se si
sovrappone a E.

## Parte 0 — senza codice (una domanda per volta all'utente)

- [x] a) Mappa delle categorie e delle routine — **approvata dall'utente
      il 2026-11-27 («Sì, approvo»)**; vedi «Mappa approvata» sotto.
- [ ] b) Elenco degli esercizi nuovi (zona, categorie, lati, secondi,
      respiro, due righe su come farlo), prima di disegnare le pose —
      bozza di 50 nuovi (65 in tutto) in `out/stretching-nuovo/ESERCIZI.md`,
      chiesta all'utente il 2026-11-27.
- [ ] c) Schizzo della home (artifact).
- [ ] d) Testi in inglese, poi le quattro traduzioni.
- [ ] Nome della categoria «intimità» e controllo della fascia d'età su
      App Store e Google Play.
- [ ] Video MP4 condivisibile dell'esercizio: sì o no.

## Mappa approvata (2026-11-27)

- **Home**: «Today», poi «My routines» (TASK-466 E, così com'è), poi le
  categorie a gruppi; ogni tessera con icona Lucide e la figura che si muove.
- **Body** (12): Neck, Shoulders, Arms & wrists, Chest, Upper back, Lower
  back, Hips & pelvis, Glutes, Legs, Calves, Ankles & feet, Full body.
- **Moments** (7): Morning (resta legato a «Morning stretch»), Bedtime,
  Desk break, After sitting, After travel, Posture, Relax & breathe.
- **Sports** (14, una tessera con Before/After): Running, Cycling,
  Swimming, Skiing, Snowboarding, Ski touring, Gym, Motorbike, Hiking,
  Climbing, Paddling, Football, Racket sports, Golf. Before = mobilità in
  movimento (3/5/10), After = tenute (3/5/10/15); «After run» e «After gym»
  di oggi diventano gli After di corsa e palestra.
- **Intimità**: Before e After, 5/10 min, testi sobri; nome ed età sugli
  store da decidere a parte.
- **More**: Beginners, Joint mobility, Back care (riga «non sostituisce un
  medico»), Touch your toes, Splits.
- **Varianti**: 3/5/10, più 15/20 dove indicato; Gentle/Intense;
  Standing/Floor. Default 5 min, Gentle, Standing+Floor; l'ultima scelta
  ricordata per categoria. Routine composte da regole deterministiche, non
  scritte a mano.
- **Today**: dopo uno sport in lista nelle ultime 3 ore → After {sport};
  prima delle 10 → Morning; dopo le 21 → Bedtime; feriale 10–18 → Desk
  break; altrimenti Full body 5 min.
- Lunghezze per categoria: tabelle in `out/stretching-nuovo/MAPPA.md`
  (checkout del worktree), da copiare qui con la parte 0 completa.

## Parti di codice (da confermare dopo la parte 0)

Ognuna con la sua PR e la lista dei file al Coordinatore prima:
pose ed esercizi nuovi a blocchi di 10–15; categorie e routine; home
nuova; pagina dell'esercizio; icone (Lucide, PNG a tre densità con
`out/TASK-444/tools/icon.swift`); video MP4 se l'utente lo vuole.

## Criteri di accettazione

- [ ] Parte 0 approvata dall'utente e scritta qui.
- [ ] Ogni parte di codice con test deterministici (`docs/TESTING.md`).
- [ ] Testi nuovi in cinque lingue, col sì dell'utente.
- [ ] Niente consigli medici: «Stop if it hurts» resta; nelle categorie
      per la schiena una riga che non sostituisce un medico.
- [ ] Nessuna dipendenza nuova.

## File toccati

Parte 0: `docs/tasks/TASK-520.md`. Le liste delle parti di codice si
aggiungono qui dopo il sì del Coordinatore.

## Dove siamo

2026-11-27: numeri dal Coordinatore (TASK-520 / ADR-0415); mappa
approvata; elenco esercizi all'utente, si aspetta la risposta.
