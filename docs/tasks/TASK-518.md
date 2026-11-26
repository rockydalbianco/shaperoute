# TASK-518 — «Compass»: la riga dei numeri e la direzione scritta

**Stato**: Done · 2026-11-26 · A #1577 (`a6d59645`) e B #1578
(`9b746fa8`) in `main`; documenti nella PR di soli documenti. Esito: su
«Compass» una riga sola con quanta strada e quanto tempo sopra i pulsanti, e
sotto la freccia del nord la direzione scritta («NE · 42°»), niente col nord
in alto. Restano l'OTA di produzione (Coordinatore, col sì dell'utente) e la
prova sul telefono
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
3. **Le schermate** dal simulatore (una corsa simulata, A e B insieme,
   `out/TASK-518/` del checkout principale): «Approvo».
4. **Col nord in alto**: «Niente etichetta» — sotto la freccia del nord non
   si scrive niente (la freccia dice già N), invece della «N» della tela.

## Parte A — Una riga sola: quanta strada e quanto tempo

- Su «Compass», sopra i pulsanti della corsa, una riga centrata: i km (o le
  miglia) con l'unità piccola, un punto, il tempo: «2.34 km · 12:05». Gli
  stessi valori di «Map» (`RunNumbers`), niente passo, niente battito.
- C'è anche in pausa (sopra «Stop» e «Resume»). Su «Map» e «Data» no.
- VoiceOver la legge come un elemento solo: «Distance: 2.34 km, Time:
  12:05» (testi che ci sono già). Nessun testo nuovo.
- `screens/CompassLine.tsx`; in `RunDashboard.tsx` montata solo con
  «Compass» aperta.

## Parte B — La direzione scritta

- Sotto la freccia del nord, solo su «Compass» con la mappa che gira dove
  si guarda, una piccola etichetta: «NE · 42°», il più vicino degli otto
  punti e i gradi interi da nord, che cambiano con la mappa (le stesse
  regole: almeno 4°, non più di una volta ogni 400 ms). Col nord in alto, e
  sulle altre mappe, niente.
- Le sigle sono quelle della voce (`compassPoint` di
  `navigation/runStats.ts`, già tradotte: «SO», «O» in italiano): **nessun
  testo nuovo**.
- `map/headingLabel.ts`; in `NorthArrow.tsx` la prop facoltativa `facing`;
  in `App.tsx` una riga nel `compass={…}` (turno dal Coordinatore il
  2026-11-24, dopo la 508 C).

## File toccati

Lista approvata dal Coordinatore il 2026-11-24.

Parte A: nuovi `apps/mobile/src/screens/CompassLine.tsx` (+
`CompassLine.test.tsx`); modificati `screens/RunDashboard.tsx`,
`screens/RunDashboard.test.tsx`; documenti `docs/tasks/TASK-518.md`,
`docs/UI.md` («La corsa: tre pagine», punto «Compass»).

Parte B: nuovi `map/headingLabel.ts` (+ test); modificati
`map/NorthArrow.tsx` (+ `NorthArrow.test.tsx`), `App.tsx` (una riga nel
`compass={…}`, al suo turno), `docs/UI.md`. Nessun file di i18n: le sigle
c'erano già.

STATUS, DECISIONS (l'aggiunta ad ADR-0350, la chiusura di TASK-431) e INDEX
in una PR di soli documenti dopo il merge.

## Criteri di accettazione

Parte A:
- [x] Su «Compass» la riga con distanza e tempo, anche in pausa; su «Map»
      no; le miglia (`CompassLine.test.tsx`, `RunDashboard.test.tsx`).
- [x] Schermata dal simulatore (una corsa simulata) approvata dall'utente
      (2026-11-24, «Approvo»).
- [x] CI verde e merge (#1577, `a6d59645`).
- [ ] OTA.

Parte B (#1578):
- [x] «NE · 42°» coi gradi interi, l'italiano «SO», «O»
      (`headingLabel.test.ts`); sotto la freccia solo con `facing`, niente
      col nord in alto né altrove (`NorthArrow.test.tsx`).
- [x] Schermate approvate dall'utente, «Niente etichetta» col nord in alto
      (2026-11-24).
- [x] CI verde e merge (#1578, `9b746fa8`).
- [ ] OTA.

## Uscita e prova

- Solo app, nessun testo nuovo, nessun server: esce col prossimo OTA di
  produzione, pubblicato dal Coordinatore col sì dell'utente.
- Dopo l'OTA, correndo, sulla pagina «Compass»: la riga «km · tempo» sopra
  i pulsanti (anche in pausa), «NE · 42°» sotto la freccia del nord che
  cambia girandosi, niente col nord in alto.
- TASK-431 l'ha chiusa il Coordinatore 3 il 2026-11-26 con la prova sul
  telefono; la sua prova di questo giro («Sì, funziona», 2026-11-24) è
  sopra, scelta 1.
- Per un giro dopo: il cono che si allarga quando la bussola è incerta, con
  l'avviso «muovi il telefono a 8» (proposta 3 della tela): va provato sul
  telefono vero.
