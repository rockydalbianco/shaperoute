# TASK-518 — «Compass»: la riga dei numeri e la direzione scritta

**Stato**: In lavorazione · 2026-11-24 · parte A nel branch
`feat/TASK-518-a-compass-line`; parte B dopo (aspetta il turno di `App.tsx`)
**Fase**: 5 · **Branch**: `feat/TASK-518-a-compass-line` (A), poi un branch
da `main` per la B
**Dipende da**: TASK-422 (la pagina «Compass», ADR-0350), TASK-431 (la
freccia «B», ADR-0359)
**ADR**: nessuno nuovo (Coordinatore, 2026-11-24). La parte A cambia la
scelta del 2026-11-08 «solo la mappa, grande» di ADR-0350: un'aggiunta
datata ad ADR-0350 nella PR di soli documenti finale.

## Obiettivo

Seconda delle tre sezioni che l'utente ha chiesto di migliorare il
2026-11-23, una alla volta («Schede → Compass → Allen.»): la pagina
«Compass» della corsa.

## Scelte dell'utente (2026-11-24, una alla volta)

Sulla tela «Compass · migliorie»
(https://claude.ai/artifact/GBHmLUM7GMMmyGaSAwxBH3, sorgente
`out/compass-migliorie/compass-migliorie.html` del checkout principale):

1. **La prova di TASK-431 sul telefono**: «Sì, funziona» (la freccia
   nell'anello azzurro punta dove si guarda anche da fermi, col cono). La
   chiusura di TASK-431 va nella PR di soli documenti finale.
2. **Quali proposte**: «1 e 2; la 3 dopo» — una riga con distanza e tempo
   (A), la direzione scritta sotto la freccia del nord (B). La terza, il
   cono che si allarga quando la bussola è incerta con l'avviso «muovi il
   telefono a 8», resta per un giro dopo: va provata sul telefono vero.
   «Torna alla partenza», che era sulla tela, è stata tolta prima della
   domanda: correndo senza percorso il banner «La tua partenza, in linea
   retta» c'è già.

## Parte A — Una riga sola: quanta strada e quanto tempo

- Su «Compass», sopra i pulsanti della corsa, una riga centrata: i km (o le
  miglia) con l'unità piccola, un punto, il tempo: «2.34 km · 12:05». Gli
  stessi valori di «Map» (`RunNumbers`), niente passo, niente battito.
- C'è anche in pausa (sopra «Stop» e «Resume»). Su «Map» e «Data» no.
- VoiceOver la legge come un elemento solo: «Distance: 2.34 km, Time:
  12:05» (testi che ci sono già). Nessun testo nuovo.
- `screens/CompassLine.tsx`; in `RunDashboard.tsx` montata solo con
  «Compass» aperta.

## Parte B — La direzione scritta (dopo)

Sotto la freccia del nord, su «Compass», l'etichetta con la direzione verso
cui si guarda: «NE · 42°» (otto direzioni nelle lingue dell'app; col nord
in alto solo «N»). Le sigle sono testi nuovi in quattro lingue: prima del
merge vanno all'utente con le schermate, e il suo sì al Coordinatore.

## File toccati

Lista approvata dal Coordinatore il 2026-11-24.

Parte A: nuovi `apps/mobile/src/screens/CompassLine.tsx` (+
`CompassLine.test.tsx`); modificati `screens/RunDashboard.tsx`,
`screens/RunDashboard.test.tsx`; documenti `docs/tasks/TASK-518.md`,
`docs/UI.md` («La corsa: tre pagine», punto «Compass»).

Parte B: nuovi `map/headingLabel.ts` (+ test); modificati
`map/NorthArrow.tsx` (+ `NorthArrow.test.tsx`), `App.tsx` (una riga nel
`compass={…}`, al suo turno), `i18n/{it,de,fr,es}.ts`, `docs/UI.md`.

STATUS, DECISIONS (l'aggiunta ad ADR-0350, la chiusura di TASK-431) e INDEX
in una PR di soli documenti dopo il merge.

## Criteri di accettazione

Parte A:
- [x] Su «Compass» la riga con distanza e tempo, anche in pausa; su «Map»
      no; le miglia (`CompassLine.test.tsx`, `RunDashboard.test.tsx`).
- [ ] Schermata dal simulatore (una corsa simulata) all'utente.
- [ ] CI verde; merge dal Coordinatore; OTA.

Parte B: i criteri quando parte.
