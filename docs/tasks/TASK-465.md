# TASK-465 — Il muscolo allenato accanto all'omino della palestra

**Stato**: In corso · 2026-11-11 (codice scritto, mancano screenshot e sì)
**Fase**: 5 · **Branch**: `feat/TASK-465-muscle-on-figure`
**Dipende da**: TASK-411 E (l'omino, ADR-0341); TASK-461 A1 (#1163) per i
quattro esercizi nuovi a corpo libero
**ADR**: ADR-0376 (dal Coordinatore, 2026-11-11; la voce va nella PR di
sola documentazione dopo il merge) · numero del task dal Coordinatore l'11
novembre 2026

## Obiettivo

Richiesta dell'utente, 2026-11-11, scritta nella sessione di TASK-453:

> «sulla palestra fai vedere sull omino in un altro quale muscolo alleni»

Alla fine: dove oggi c'è l'omino di un esercizio di palestra, accanto c'è
una sagoma del corpo con accesa la zona che quell'esercizio allena.

## Parte 0 — le risposte dell'utente (2026-11-11)

Tre domande, una alla volta, ognuna con una proposta e un disegno.

1. **Cosa vuol dire «in un altro»**: il muscolo in un altro colore sullo
   stesso omino (A, la proposta) o una sagoma ferma accanto, davanti e
   dietro, con la zona accesa (B)?
   Risposta: **«B, sagoma accanto»**.
2. **Dove si vede**: scheda dell'esercizio (1), durante l'allenamento (2),
   griglia e lista di «+ Exercise» (3)? La proposta era 1 + 2, senza la
   griglia (sagoma troppo piccola, riquadri di TASK-444).
   Risposta: **«Tutti e tre»**.
3. **Solo il muscolo principale o anche i secondari**: la proposta era
   «anche i secondari, ma solo nella scheda», il principale pieno e i
   secondari col solo contorno; nelle sagome piccole (allenamento, griglia)
   solo il principale. Detto nella domanda: «Se scegli "Anche i secondari"
   faccio così».
   Risposta: **«Anche i secondari»**.

Resta da far vedere all'utente negli screenshot, prima della PR: il colore
della zona accesa (nei disegni era un rosa provvisorio: giallo, rosso,
azzurro e blu nell'app hanno già un significato).

## Cosa c'è oggi

- L'omino (`ExerciseFigure.tsx`, `moves.ts`) è fatto di `View`: sette ossa,
  il carico in giallo. Nell'app non c'è `react-native-svg`.
- Il catalogo (`catalog.ts`, `gym_catalog.py`, la fixture
  `gym-exercises.json`) sa solo il **gruppo** di un esercizio (`chest`,
  `back`, `legs`, `shoulders`, `arms`, `core`, `full_body`, `cardio`): il
  muscolo non c'è da nessuna parte.
- L'omino si vede in quattro posti: `ExerciseGuide.tsx` (200 pt),
  `WorkoutScreen.tsx` (48 pt), `ExerciseGrid.tsx` (52 pt),
  `ExercisePicker.tsx` (40 pt, la ricerca).

## Come si fa

- **La tabella dei muscoli** sta nell'app, in un file nuovo
  (`muscles.ts`), come già la tabella dei movimenti (`MOVE_OF`): per ogni
  esercizio del catalogo uno o più muscoli principali e zero o più
  secondari, e i nomi dei muscoli nelle cinque lingue (lì, come i gruppi in
  `groups.ts`, non nei file di `i18n`). Niente campo nuovo sul server:
  serve solo a disegnare, come l'omino.
- **La sagoma** (`MuscleMap.tsx`, file nuovo) è disegnata con `View`,
  senza dipendenze nuove: il corpo davanti e dietro, il principale pieno, i
  secondari col contorno (la differenza non sta solo nel colore). Ferma:
  niente da fare per «Riduci movimento».
- **Dove**: nella scheda davanti e dietro, coi nomi scritti sotto; durante
  l'allenamento e in griglia e lista una sagoma sola, il lato dove sta il
  principale, senza secondari.
- **Colore**: un token nuovo in `src/theme/tokens.ts`, nessun colore
  scritto a mano.

## File toccati

Approvati dal Coordinatore l'11 novembre 2026 («lista approvata»).

- Nuovi: `apps/mobile/src/gym/muscles.ts`, `muscles.test.ts`,
  `MuscleMap.tsx`, `MuscleMap.test.tsx`, `docs/tasks/TASK-465.md`.
- Esistenti: `apps/mobile/src/gym/ExerciseGuide.tsx`, `WorkoutScreen.tsx`,
  `ExerciseGrid.tsx`, `ExercisePicker.tsx`, `apps/mobile/src/theme/tokens.ts`,
  `apps/mobile/src/theme/palettes.test.ts`.

## Com'è fatto

- **`muscles.ts`**: 17 muscoli (8 davanti, 9 dietro), `MUSCLES_OF` con una
  riga per ognuno dei 95 esercizi (i 91 più i quattro di TASK-461 A1), i
  nomi dei muscoli e quattro parole («Main muscles», «Also», «Front»,
  «Back») nelle cinque lingue. Chi aggiunge un esercizio al catalogo
  aggiunge la sua riga qui: `muscles.test.ts` lo dice.
- **`MuscleMap.tsx`**: il corpo è un contorno vuoto fatto di `View`; un
  muscolo principale è **pieno**, uno secondario ha il **contorno spesso**:
  pieno o contorno, mai solo il colore. Dietro la testa è piena (i
  capelli), così i due lati si distinguono anche in piccolo.
  - piccola (allenamento 48 pt, griglia 48 pt, ricerca 40 pt): un lato
    solo, quello del primo muscolo principale, e solo i principali di quel
    lato; l'etichetta per il lettore di schermo li dice tutti («Main
    muscles: quads, glutes.»);
  - nella scheda (`detail`, 132 pt): davanti e dietro con «Front» e «Back»
    sotto, i secondari col contorno, e sotto i nomi (`MuscleCaption`): un
    pallino pieno e i principali, un anello e «Also: …». Su uno schermo
    stretto i corpi vanno sotto l'omino.
- **Colore**: token nuovo `muscle`, un rosa, nei due toni (`#FF6FB5` nel
  tema scuro di sempre); `palettes.test.ts` chiede 3:1 su sfondo, carta e
  controllo a ogni passo di luminosità.
- Un esercizio scritto dall'utente non ha corpo, come non ha omino.

## Testi nuovi da far approvare all'utente

I nomi dei 17 muscoli e le quattro parole, nelle cinque lingue, sono in
`muscles.ts` (`NAMES`, `WORDS`). Da mostrare all'utente con gli screenshot,
prima di «#NNNN pronta» (richiesta del Coordinatore).

## Criteri di accettazione

- [ ] Ogni esercizio del catalogo ha almeno un muscolo principale; nessun
      muscolo sconosciuto; nessuna chiave della tabella fuori dal catalogo
      condiviso (test deterministici).
- [ ] La sagoma si vede nella scheda, durante l'allenamento, in griglia e
      in lista; nella scheda anche i secondari, col contorno, e i nomi.
- [ ] Il principale non si distingue solo per il colore; contrasti
      rispettati nei due toni.
- [ ] Screenshot prima/dopo dal simulatore e il sì dell'utente scritto qui.
- [ ] Solo JavaScript: impronta iOS
      `6f8bba4cf1b6f95fc3c1c84ba9812d950a2232a1`.
- [ ] PR verde, segnalata al Coordinatore («#NNNN pronta»). Niente OTA,
      niente server.

## Cronologia

- 2026-11-11 — parte 0 chiusa con le tre risposte qui sopra; worktree
  `.claude/worktrees/TASK-465` creato su richiesta del Coordinatore; lista
  dei file mandata al Coordinatore.
- 2026-11-11 — sì del Coordinatore sulla lista, ADR-0376; codice e test
  scritti (test dei file toccati, `tsc` ed `eslint` verdi in locale).
  Mancano: screenshot dal simulatore (al «simulatore tuo»), il sì
  dell'utente su aspetto, colore e nomi, la PR.
