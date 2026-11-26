# TASK-448 — «Surprise me»: forma e distanza scelte dall'app

**Stato**: In corso · parte 0 (domande di prodotto, nessun codice)
**Fase**: 5 · **Branch**: `docs/TASK-448-part-0` (documenti), poi `feat/TASK-448-…`
**Dipende da**: TASK-449 parte A (#1593) per la riga in `RoutePanel.tsx`,
se l'ingresso sta in «Draw»
**ADR**: nessuno finora · numero dal Coordinatore l'11 novembre 2026 (idea
I1 di `out/prova-app-2026-11-11/PROPOSTE.md`); avviato dall'utente il
2026-11-26 («Avvia la 448»)

## Obiettivo

Chi non sa cosa disegnare tocca «Surprise me» e riceve una forma e una
distanza scelte per lui, fra quelle che dove si trova vengono bene. L'app
sceglie solo **cosa chiedere** (forma, distanza); il percorso lo decide il
motore, col giro di sempre. Nessuna coordinata nasce fuori dal motore.

## Cosa sa già l'app (letto su `main` c33f3920, 2026-11-26)

- **Le forme**: 31 nel catalogo (`SHAPES`). Ogni sport dice le sue in
  `src/sports` (`shapes`: la carrozzina ne ha 4) e le sue distanze
  (`drawKm`: corsa 1–21 km, bici 10–30, canoa 1–5, nuoto 0,5–3…). **Non
  c'è un limite di distanza per forma**: il limite è dello sport.
- **Il catalogo di «Explore»** (TASK-441): 1546 corse in 63 città, di cui
  1206 sono forme (il resto parole), a **5, 10 e 21 km**, tutte con
  somiglianza ≥ 0,90 e scelte a occhio dall'utente. Per città da 7 a 79
  forme (mediana 23). Le più tenute: cuore 158, cerchio 146, stella 142,
  luna 120, smiley 115, sole 112, farfalla 92; le altre da 35 in giù. In
  bici 485 uscite in 59 città, otto forme, 20–50 km.
  `GET /recommended-routes?lat&lon&radius_m` (fino a 50 km, 60 percorsi,
  i migliori prima) dà già forma, distanza chiesta e somiglianza di ognuno:
  è la stessa richiesta di «Explore», con la posizione arrotondata a circa
  un chilometro (TASK-363). **Nessun endpoint nuovo.**
  Limite da dire: quei percorsi partono dalla piazza della città, non da
  casa dell'utente. Che una forma venga bene in centro è un buon indizio
  per il resto della città, non una garanzia.
- **«NEAR YOU»** (TASK-306): cerchio, cuore e stella da 5 km dalla
  posizione del telefono, tenuti in `near-you.json` con la somiglianza, o
  segnati «rifiutati» quando il motore lì non li disegna. È l'unico dato
  preso proprio dal punto dell'utente.
- **La somiglianza** torna con ogni percorso (`similarity`, «Roads follow
  your drawing: 87%»), con l'avviso sotto lo 0,90 e, quando il motore la
  trova, la distanza migliore («This shape comes out better at about
  8 km», «Try 8 km»). Sotto 0,60 il motore rifiuta (`shape_not_drawable`).
  Tutto questo si legge **dopo** il calcolo: prima non c'è un punteggio.
  Un punteggio prima del calcolo sarebbe un lavoro del motore (prova
  `same routes`, banco, PR unita dall'utente): **fuori da questo task**.
- **Il primo percorso subito** (TASK-435, scelta dell'utente del
  2026-11-10): «Draw route» mostra il primo percorso, le alternative
  arrivano dopo. «Surprise me» passa di lì senza cambiarlo.
- **«Draw» si lascia riempire da fuori**: la forma con `setShapeText`, la
  distanza con `useDrawDistance().choose(metri)`; la griglia mostra sempre
  la forma scelta e il pulsante dice già «Draw heart · 5 km».
- **Il caso senza dati vicini** (fuori dalle 63 città): restano le sette
  forme che vengono quasi ovunque (sopra) e le distanze di partenza dello
  sport.

## Parti (bozza, da confermare dopo le risposte)

- **0** — domande di prodotto, una per volta; questo file; PR di soli
  documenti.
- **A** — la scelta: un modulo puro (`surprisePick.ts`) che da forme dello
  sport, limiti di distanza, percorsi vicini del catalogo, scelta di prima
  e un generatore con seme dà forma e distanza. Test deterministici.
- **B** — l'ingresso nell'app, i testi nelle cinque lingue, le schermate
  per il sì dell'utente.

## Domande all'utente (parte 0)

Una per volta, ognuna con la sua proposta.

1. Dove sta l'ingresso. — *risposta il 2026-11-26*
2. Cosa fa il tocco: riempie forma e distanza e aspetta «Draw route», o
   disegna subito. — *risposta il 2026-11-26*
3. Cosa è a caso: solo la forma o anche la distanza, e fra quali km. —
   *chiesta il 2026-11-26*
4. Cosa promette «viene bene» e cosa succede quando il risultato è scarso.
5. Per quali sport.
6. I testi nelle cinque lingue.

Già deciso dai documenti, non chiesto: nessun account in più di quello che
«Draw» già vuole; nessun dato nuovo che esce dal telefono (la richiesta dei
percorsi vicini è quella di «Explore»).

## Risposte dell'utente

1. **Dove sta l'ingresso: «Nel passo 2 di Draw»** (2026-11-26). Una
   pastiglia «Surprise me» sulla riga del titolo «2 WHAT YOU DRAW», a
   destra: dove uno non sa cosa scegliere, in vista senza scorrere.
   Scartate: una tessera nella griglia delle forme (toglie una forma alla
   griglia chiusa), una riga sotto la distanza (da cercare scorrendo), una
   scheda anche in «Explore».
2. **Cosa fa il tocco: «Riempie e aspetta»** (2026-11-26). Il tocco mette
   forma e distanza nella pagina (la griglia segna la forma, la distanza si
   sposta, il pulsante dice «Draw heart · 5 km»); un altro tocco ne dà
   un'altra; il calcolo parte solo con «Draw route». Scartate: disegnare
   subito (ogni cambio un calcolo intero, testi nuovi nel risultato), un
   foglio di conferma (un passaggio e testi in più).

## File toccati

Parte 0: `docs/tasks/TASK-448.md` (nuovo). Le parti A e B: lista al
Coordinatore prima del codice. Vicini: `RoutePanel.tsx` e una riga di
`App.tsx` sono di TASK-449 (#1593) finché non è in `main`; le pagine di
«Explore» di TASK-509.

## Criteri di accettazione (bozza)

- Con lo stesso seme e gli stessi dati la scelta è la stessa.
- La distanza scelta sta nei limiti dello sport, nell'unità dell'app.
- Mai una forma che lo sport non disegna.
- Un secondo tocco non ridà la scelta di prima.
- Senza percorsi vicini, o senza posizione, la scelta viene dalle forme
  semplici e dalle distanze di partenza dello sport.
- Impronta iOS ferma a `5e1b5ce5`; nessuna dipendenza nuova; nessun colore
  scritto a mano; testi nuovi nelle cinque lingue, al loro posto nelle
  tabelle.

## Registro

- 2026-11-26 — parte 0 avviata: letto il codice, scritta questa bozza,
  chiesta la domanda 1.
- 2026-11-26 — risposta 1 («Nel passo 2 di Draw»); chiesta la domanda 2.
- 2026-11-26 — risposta 2 («Riempie e aspetta»); chiesta la domanda 3.
