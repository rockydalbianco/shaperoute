# TASK-466 — Lo stretching nuovo: animazioni, routine, palestra, mattino, routine pubblicate

**Stato**: In corso · parte A in PR (bozza)
**Fase**: 4 · **Branch**: `feat/TASK-466-a-stretch-motion` (A); B, C, D, E
ciascuna col suo branch e la sua PR
**ADR**: ADR-0378 (una per tutte le parti; la voce va nella PR di soli
documenti dopo il merge della A)
**Dipende da**: TASK-285 (lo stretching dopo la corsa, chiuso). C dopo
TASK-461 A2 e TASK-465 (file di `src/gym`, turno dal Coordinatore).

## Obiettivo

Lo stretching diventa una parte vera dell'app: animazioni più belle e vive,
più esercizi e routine pronte da 3, 5 e 10 minuti, lo stretching anche in
palestra, al mattino dopo la sveglia, e routine fatte dall'utente da
pubblicare.

## Contesto

Richieste dell'utente del 2026-11-11, in questa sessione:

1. «migliora la parte sullo stretching… migliora le animazioni anche»;
2. «aggiungi lo stretching alla palestra e dai la possibilità di fare
   stretching 3, 5 o 10 minuti al mattino dopo la sveglia, l'app ti legge
   quando hai la sveglia e l'utente può impostare lo stretching e poi
   pubblicarlo».

La proposta in cinque parti è stata approvata dall'utente («Sì, vai»).
Durate lette come **3, 5 e 10 minuti** («30niunti 5 o 10»): se l'utente
voleva anche 30 minuti, si aggiunge in B.

**La sveglia**: su iPhone nessuna app può leggere le sveglie dell'app
Orologio (Apple non lo permette). Su iOS l'utente scrive in MuW l'orario
e i giorni della sveglia; su Android la prossima sveglia si legge con
`AlarmManager.getNextAlarmClock()`, codice nativo: arriva con una build
(1.0.3), separata dalla parte JS. Più avanti, sempre in una build, MuW
potrebbe suonare la sveglia da sé su iOS 26 (AlarmKit).

Regole del Coordinatore (2026-11-11): una PR per parte; testi nuovi e
aspetto col sì dell'utente, con screenshot o video dal simulatore solo
quando il Coordinatore dà il turno; PR di codice senza STATUS, DECISIONS,
INDEX; registro i18n condiviso: se altri entrano prima, unire `main`
tenendo tutte le voci; nessun OTA di produzione per due giorni.

## Contesto da leggere

- `apps/mobile/src/stretch/` (tutto: è piccolo)
- ADR-0247 (TASK-285, lo stretching dopo la corsa), ADR-0147 (animare
  con `Animated` e View girate, senza librerie)
- `docs/TESTING.md` (jest: tempo finto, animazioni istantanee)

## Parte A — Animazioni e schermata

*(branch `feat/TASK-466-a-stretch-motion`)*

1. **Respiro**: mentre la posa è tenuta, la figura va lentamente un po'
   più a fondo e torna (`Breath` in `poses.ts`, `BREATH_MS` = 4 s), pochi
   gradi sui segmenti che fanno l'allungamento, diversi per esercizio.
2. **In piedi fra due pose**: da un esercizio piegato all'altro la figura
   si rialza e poi scende nella posa nuova (`path` in `Figure.tsx`).
3. **Il cambio lato**: in piedi la figura si gira (si stringe di profilo e
   si apre dall'altra parte), poi scende di nuovo; non più lo scatto.
4. **Il disegno**: giunture tonde (niente buchi sulle pieghe), testa un po'
   più tonda.
5. **«Get ready»** di 5 s prima di ogni esercizio e **«Switch sides»** di
   3 s fra i lati: il tempo della tenuta parte solo a figura in posa.
6. **Suoni**: un tick all'inizio della tenuta e sugli ultimi 3 secondi,
   poi il «ding» di prima. `tick.wav` è nostro, fatto da
   `tools/stretch_chime.py` come il ding (che resta identico).
7. **«Next: …»** negli ultimi 5 s dell'ultimo lato di un esercizio.
8. **Tasti**: «Pause», «Skip» (salta l'esercizio), «End» (esce); all'ultimo
   esercizio «Pause» e «Done». «Next» era nella proposta, ma la chiave
   `Next` esiste già tradotta «A seguire»: si riusa «Skip» / «Salta».
9. **«Riduci movimento»** acceso: ogni posa subito, niente respiro.

Testi nuovi, approvati dall'utente il 2026-11-12: «End» (Fine, Beenden,
Terminer, Terminar), «Next: {exercise}» (Dopo: …, Als Nächstes: …,
Ensuite : …, Siguiente: …).

## Parte B — Più esercizi e routine pronte

~15 esercizi (collo, spalle, petto, schiena, fianchi, adduttori, oltre ai
cinque delle gambe), tre routine — **Morning**, **After run**, **After gym**
— in tre durate, 3, 5 e 10 minuti. Solo `src/stretch/**` e i18n. Nomi e
testi col sì dell'utente.

## Parte C — In palestra

«Stretch» alla fine dell'allenamento come dopo la corsa, e una voce
«Stretching» nella pagina Palestra con le routine. Dopo TASK-461 A2 e
TASK-465, col turno del Coordinatore su `src/gym`.

## Parte D — Al mattino

Impostazione «Morning stretch»: orario della sveglia, giorni, durata;
notifica locale con `expo-notifications` (già dipendenza) che apre la
routine. JS, esce con un OTA. La lettura della sveglia su Android è una
parte separata, nativa, con una build.

## Parte E — La tua routine, pubblicata

Scegli esercizi, ordine e secondi; la salvi; la pubblichi nel Feed
(«Stretching · 10 min · 8 exercises»); chi la vede la fa con «Do this
routine». Server prima dell'app: nuovo tipo di post, migrazione col primo
numero libero al merge; segnalazione e blocco valgono anche lì; il testo
della privacy se cambia cosa vedono gli altri (sì dell'utente).

## Criteri di accettazione (parte A)

- [x] La figura respira durante la tenuta, si ferma in pausa e con
      «riduci movimento».
- [x] Fra due esercizi piegati passa dalla posizione in piedi; il cambio
      lato gira la figura in piedi.
- [x] «Get ready» 5 s e «Switch sides» 3 s prima della tenuta; tick
      all'inizio e sugli ultimi 3 s; ding alla fine.
- [x] «Skip» passa al «Get ready» dell'esercizio dopo; «End» esce.
- [x] Test di `src/stretch`, `src/i18n`, `__tests__/AppStretch`,
      `src/gym/restAlert` verdi; `tsc` pulito.
- [x] Screenshot o video dal simulatore, col turno del Coordinatore
      (2026-11-12, iPhone 17e, Expo Go: `out/TASK-466/`, cinque schermate
      e un video di 3 minuti); aspetto approvato dall'utente il 2026-11-12.
- [x] Sì dell'utente sui due testi nuovi (2026-11-12, «Sì, approvo»).

## File toccati (parte A)

```
apps/mobile/src/stretch/Figure.tsx
apps/mobile/src/stretch/Figure.test.tsx          (nuovo)
apps/mobile/src/stretch/StretchScreen.tsx
apps/mobile/src/stretch/StretchScreen.test.tsx
apps/mobile/src/stretch/chime.ts
apps/mobile/src/stretch/exercises.ts
apps/mobile/src/stretch/poses.ts
apps/mobile/src/stretch/poses.test.ts
apps/mobile/assets/stretch/tick.wav              (nuovo)
apps/mobile/__tests__/AppStretch.test.tsx
apps/mobile/src/i18n/{it,de,fr,es}.ts            (due chiavi)
tools/stretch_chime.py
docs/tasks/TASK-466.md                           (nuovo)
```

Non tocca `App.tsx`, la fine corsa, `src/gym`, `haptics/`,
`ui/useReduceMotion.ts` (solo importato). Niente dipendenze, niente
nativo, niente server.

## Fuori scope

- Una libreria di disegno (svg, Lottie): resta la figura di View girate.
- La voce che legge gli esercizi: per ora suoni e testo.
- Leggere le sveglie di iPhone: non si può.

## Esito

*(a fine task)*
