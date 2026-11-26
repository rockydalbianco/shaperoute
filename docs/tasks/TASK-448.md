# TASK-448 — «Surprise me»: forma e distanza scelte dall'app

**Stato**: In corso · parte 0 chiusa il 2026-11-26 (sei scelte dell'utente); poi A e B, lista dei file al Coordinatore
**Fase**: 5 · **Branch**: `docs/TASK-448-part-0` (documenti), poi `feat/TASK-448-…`
**Dipende da**: TASK-449 parte A (#1593) in `main`, per le righe in
`RoutePanel.tsx` e `App.tsx` (parte B)
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

## Parti

- **0** — domande di prodotto, una per volta; questo file; PR di soli
  documenti. **Fatta il 2026-11-26.**
- **A** — la scelta, solo file nuovi, niente che si veda:
  - `surprisePick.ts`: funzione pura. Entrano lo sport, i percorsi del
    catalogo vicini (forma, distanza chiesta), la scelta di prima, le
    coppie da non riproporre e un generatore di numeri a caso; esce una
    coppia forma–distanza, o niente per uno sport senza «Surprise me».
  - `surpriseKept.ts`: le sorprese venute sotto il 90% (o rifiutate dal
    motore) da un punto, in un file del telefono, come `near-you.json`.
  - `useSurprise.ts`: mette insieme i due con i percorsi vicini (la lista
    che «Explore» prepara già, `exploreAhead`; in bici la stessa richiesta
    con `activity=cycling`) e con l'esito del percorso.
- **B** — quello che si vede: la pastiglia (`SurprisePill.tsx`, l'icona del
  dado), il testo nelle cinque lingue, le righe in `RoutePanel.tsx` e
  `App.tsx`; schermate nelle cinque lingue per il sì dell'utente; poi i
  documenti (`UI.md`, la voce in `DECISIONS.md`).

Scelte tecniche, dell'agente su delega dell'utente (vanno nell'ADR):

- «Nella tua città» = i percorsi del catalogo che partono entro un raggio
  dalla partenza scelta in «Draw» (da fissare nella parte A, proposta
  10 km: i percorsi di una città partono entro 1 km dal suo centro).
- La scelta è alla pari fra le coppie forma–distanza diverse, tolte quella
  di prima e quelle da non riproporre; se non ne resta nessuna, le forme
  di riserva (le sette a piedi, le otto in bici).
- Il caso è iniettato (`random: () => number`): nei test un generatore con
  seme, nell'app `Math.random`.
- Se era scelta una parola, un'immagine o un disegno a mano, il tocco
  porta «WHAT YOU DRAW» su «Shape».
- Nessuna richiesta nuova al server, nessun cambio al motore, all'API o al
  contratto.

## Domande all'utente (parte 0)

Una per volta, ognuna con la sua proposta.

1. Dove sta l'ingresso. — *risposta il 2026-11-26*
2. Cosa fa il tocco: riempie forma e distanza e aspetta «Draw route», o
   disegna subito. — *risposta il 2026-11-26*
3. Cosa è a caso: solo la forma o anche la distanza, e fra quali km. —
   *risposta il 2026-11-26*
4. Cosa promette «viene bene» e cosa succede quando il risultato è scarso.
   — *risposta il 2026-11-26*
5. Per quali sport. — *risposta il 2026-11-26*
6. I testi nelle cinque lingue. — *risposta il 2026-11-26*

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
3. **Cosa è a caso: «Forma e 5 o 10 km»** (2026-11-26). A piedi l'app
   sceglie una coppia forma–distanza già venuta bene nella città
   dell'utente, a 5 o a 10 km, mai quella del tocco prima; 21 km mai a
   sorpresa. Dopo il tocco la distanza si può cambiare, prima di «Draw
   route». Scartate: anche 21 km; solo la forma con la distanza
   dell'utente (meno sicura fuori da 5 e 10 km).
4. **Se viene male: «Come sempre»** (2026-11-26). Nessuna promessa
   scritta: la pastiglia dice solo «Surprise me», e nessun testo dice
   «provata vicino a te». Il risultato è un percorso come gli altri, con
   l'avviso sotto il 90% e «Try 8 km» che ci sono già. L'app ricorda sul
   telefono le sorprese venute sotto il 90% da quel punto e non le
   ripropone. Fuori dalle città del catalogo la scelta viene dalle sette
   forme che vengono quasi ovunque (cuore, cerchio, stella, luna, smiley,
   sole, farfalla), a 5 o 10 km. Scartate: «Another surprise» sotto un
   risultato scarso (testi nuovi), il ricalcolo da solo (doppia attesa).
5. **Per quali sport: «A piedi e in bici»** (2026-11-26). «Run» e «Walk»
   come sopra; «Bike» con le otto forme del suo catalogo (sole, luna,
   farfalla, cuore, stella, cerchio, gatto, pesce) a 20, 25 o 30 km, e
   fuori dalle città del catalogo una delle otto a 20 km. Negli altri
   sport la pastiglia non c'è. Scartate: solo a piedi; ogni sport che
   disegna forme (una scelta al buio dove non c'è catalogo).
6. **Il testo: «Sì, vanno bene»** (2026-11-26). Un solo testo nuovo, il
   nome della pastiglia, col «tu» come «Remind me at 8»:

   | en | it | de | es | fr |
   |---|---|---|---|---|
   | Surprise me | Sorprendimi | Überrasch mich | Sorpréndeme | Surprends-moi |

   Scartato: «Pick for me» / «Scegli tu». VoiceOver, dopo il tocco, legge
   la scelta con parole che ci sono già («Heart, 5 km»). L'icona (un dado
   a linea di Lucide, come le altre icone) l'utente la giudica sulle
   schermate, nelle cinque lingue, prima di «pronta».

## File toccati

Lista mandata al Coordinatore il 2026-11-26, prima del codice.

```
# Parte 0 (documenti)
docs/tasks/TASK-448.md                                  (nuovo)
docs/STATUS.md                                          (la voce del task)

# Parte A (solo file nuovi)
apps/mobile/src/route/surprisePick.ts, .test.ts         (nuovi)
apps/mobile/src/route/surpriseKept.ts, .test.ts         (nuovi)
apps/mobile/src/route/useSurprise.ts, .test.ts          (nuovi)

# Parte B (dopo #1593 in main)
apps/mobile/src/route/SurprisePill.tsx, .test.tsx       (nuovi)
apps/mobile/assets/ui/icons/dices.png, @2x, @3x         (nuovi, Lucide)
apps/mobile/src/route/RoutePanel.tsx                    (la riga del titolo del passo 2, una prop)
apps/mobile/App.tsx                                     (l'hook e la prop: poche righe)
apps/mobile/src/i18n/it.ts, de.ts, es.ts, fr.ts         (una chiave ciascuno)

# Documenti di chiusura (PR di soli documenti)
docs/UI.md, docs/DECISIONS.md, docs/INDEX.md, docs/STATUS.md,
docs/archive/COMPLETATI.md, docs/tasks/TASK-448.md
```

Vicini: `RoutePanel.tsx` e una riga di `App.tsx` sono di TASK-449 (#1593)
finché non è in `main`; le pagine di «Explore» di TASK-509; `App.tsx` ha i
turni di TASK-490.

## Criteri di accettazione

- Con lo stesso seme e gli stessi dati la scelta è la stessa.
- A piedi la distanza è 5 o 10 km, mai 21; in bici 20, 25 o 30 km; sempre
  nei limiti dello sport, e con «Miles» al miglio intero come le altre
  distanze che l'app propone.
- Mai una forma che lo sport non disegna; in bici solo le otto del suo
  catalogo.
- Un secondo tocco non ridà la scelta di prima.
- Una sorpresa venuta sotto il 90% o rifiutata dal motore da un punto non
  torna da quel punto.
- Senza percorsi vicini, o senza risposta dal server, la scelta viene
  dalle forme di riserva: a piedi le sette a 5 o 10 km, in bici una delle
  otto a 20 km.
- Il tocco non fa partire nessun calcolo: riempie forma e distanza, e
  «Draw route» resta com'è.
- La pastiglia c'è con «Run», «Walk» e «Bike», non con gli altri sport.
- Impronta iOS ferma a `5e1b5ce5`; nessuna dipendenza nuova; nessun colore
  scritto a mano; testi nuovi nelle cinque lingue, al loro posto nelle
  tabelle.

## Registro

- 2026-11-26 — parte 0 avviata: letto il codice, scritta questa bozza,
  chiesta la domanda 1.
- 2026-11-26 — risposta 1 («Nel passo 2 di Draw»); chiesta la domanda 2.
- 2026-11-26 — risposta 2 («Riempie e aspetta»); chiesta la domanda 3.
- 2026-11-26 — risposta 3 («Forma e 5 o 10 km»); chiesta la domanda 4.
- 2026-11-26 — risposta 4 («Come sempre»); chiesta la domanda 5.
- 2026-11-26 — risposta 5 («A piedi e in bici»); chiesta la domanda 6.
- 2026-11-26 — risposta 6 («Sì, vanno bene»): parte 0 chiusa. Lista dei
  file e richiesta del numero di ADR al Coordinatore.
