# TASK-520 — Lo stretching rifatto: home a categorie, routine per zona, momento e sport

**Stato**: In corso · parte 0 chiusa il 2026-11-27 (tutte le scelte
approvate dall'utente); A1 in `main` (#1666); parte B in corso a blocchi
(B1 #1672, B2 pronto in locale)
**Fase**: 4 · **Filone**: Allenamento (Coordinatore fork 3, 2026-11-27)
**Branch**: una PR per parte (`feat/TASK-520-a1-figure-moves`,
`feat/TASK-520-b1-side-holds`, …); i documenti in PR a sé
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
- [x] b) Elenco degli esercizi nuovi — **approvato dall'utente il
      2026-11-27 («Sì, approvo»)**: 50 nuovi, 65 in tutto, con la vista di
      fronte per 8 esercizi; vedi «Esercizi approvati» sotto.
- [x] c) Schizzo della home — **approvato dall'utente il 2026-11-27
      («Sì, approvo»)**, seconda versione dopo «fallo più figo e moderno e
      professionale, usa anche più colori, animazioni»; vedi «Schizzo
      approvato» sotto.
- [x] d) Testi in inglese — **approvati dall'utente il 2026-11-27
      («Sì, approvo»)**, tabella nell'Allegato C; gli
      sport si scrivono «Running · Before» / «Running · After»; riga per
      la schiena «This is not medical advice. If your back hurts, see a
      doctor.»; le quattro traduzioni con ogni parte di codice, col sì
      dell'utente.
- [x] Nome della categoria «intimità» — **«Intimacy»**, approvato
      dall'utente il 2026-11-27 («Sì, «Intimacy»»): it «Intimità», de
      «Intimität», fr «Intimité», es «Intimidad»; routine «Before
      intimacy» e «After intimacy»; riga «Hips, pelvis, lower back and
      breath». Fascia d'età controllata il 2026-11-27:
      la pagina App Store di MuW mostra **16+** (questionario tutto «No»
      tranne i contenuti degli utenti, età alzata a 16+ come i termini,
      TASK-152); la categoria non cambia nessuna risposta (nessun contenuto
      sessuale: esercizi di anche e schiena, respiro, la stessa figura).
      Google Play: l'app non è ancora pubblica (TASK-294), il questionario
      IARC lo compila l'utente e la risposta resta «nessun contenuto
      sessuale».
- [x] Video MP4 — **sì, come ultima parte** (utente, 2026-11-27: «Sì,
      come ultima»): un video verticale della **routine** (la figura fa
      ogni esercizio per qualche secondo, col nome e il tempo; titolo e
      minuti in apertura, logo MuW in chiusura), fatto sul telefono con la
      pagina nascosta del video della corsa (`src/share/videoPage.ts`,
      WebCodecs: nessuna libreria nuova, nessuna build), condiviso dal
      foglio del telefono, non pubblicato nel Feed. Niente video del
      singolo esercizio. La privacy si ricontrolla in quella parte.

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
- **Intimacy** (nome approvato il 2026-11-27): Before e After, 5/10 min,
  testi sobri; età sugli store controllata (16+ su App Store).
- **More**: Beginners, Joint mobility, Back care (riga «non sostituisce un
  medico»), Touch your toes, Splits.
- **Varianti**: 3/5/10, più 15/20 dove indicato; Gentle/Intense;
  Standing/Floor. Default 5 min, Gentle, Standing+Floor; l'ultima scelta
  ricordata per categoria. Routine composte da regole deterministiche, non
  scritte a mano.
- **Today**: dopo uno sport in lista nelle ultime 3 ore → After {sport};
  prima delle 10 → Morning; dopo le 21 → Bedtime; feriale 10–18 → Desk
  break; altrimenti Full body 5 min.
- Lunghezze per categoria: tabelle nell'Allegato A.

## Esercizi approvati (2026-11-27)

Tabella completa (zona, tipo, lati, posizione, livello, vista, secondi,
categorie, «How to») nell'Allegato B. In breve:

- I 15 di oggi restano, con categorie in più.
- 50 nuovi: collo 3 (neckSide, neckTurn, chinTuck), spalle 5
  (armCircles, shoulderRolls, threadNeedle, sideReachChild, armOpeners),
  braccia e polsi 4 (wristFlexor, wristExtensor, wristCircles, bicepsWall),
  petto 2 (doorwayChest, goalpost), schiena alta 3 (openBook, sideBend,
  trunkTurns), schiena bassa 6 (catCow, sphinx, lyingTwist, pelvicTilt,
  kneeSway, seatedTwist), anche 7 (butterfly, lizard, frog, hipCircles,
  ninetyNinety, sideLunge, deepSquat), glutei 4 (figureFour, pigeon,
  chairFigureFour, bridge), gambe 7 (legSwings, lungeReach, seatedFold,
  lyingHamstring, sideQuad, halfSplit, wideFold), polpacci e piedi 5
  (soleus, calfRaises, ankleCircles, toeStretch, shinStretch), tutto il
  corpo e respiro 4 (downDog, inchworm, legsUpWall, restBreath).
- 18 `Move` (loop tra due pose, a tempo) per i «Before» e la mobilità.
- **Vista di fronte** della stessa figura (View girate, nessuna libreria)
  per 9: neckSide, neckTurn, sideBend, lyingTwist, butterfly, frog,
  sideLunge, wideFold e goalpost (vedi sotto). Parte di codice in più.
- **Cambio approvato dall'utente il 2026-11-27**: il numero 14, «Hands
  clasped behind», era lo stesso gesto di «Chest opener» (uno dei 15 di
  oggi). Al suo posto c'è `goalpost`, «Goalpost arms», visto di fronte. I
  conti non cambiano: 50 nuovi, 65 in tutto.
- Niente mani: i polsi si vedono a grandi linee. Muro, porta, sedia non si
  disegnano.
- Intimità: prima Cat–cow, Pelvic tilt, Hip circles, Bridge, Butterfly;
  dopo Lying twist, Figure four, Child's pose, Resting breath.

## Schizzo approvato (2026-11-27)

Canvas: https://claude.ai/artifact/CaiBLTDaSRn7dRydoatwLL (privato
dell'utente); sorgenti in `out/stretching-nuovo/canvas/` del checkout
principale. Tre schermate, tinta scura:

- **Home**: «Stretching»; striscia **«This week»** (sette giorni con la
  spunta, «3 sessions · 24 min» — aggiunta approvata); scheda **Today**
  (figura dentro anelli che pulsano, etichette minuti/esercizi/variante,
  «Start» giallo, link «See the 8 exercises»); **My routines** (466 E) con
  «New routine»; scorciatoie ai gruppi; **Body** griglia a 3 colonne (senza
  icona: la figura fa da icona, Lucide non ha parti del corpo); **Moments**
  fila che scorre di lato, con icona; **Sports** due colonne, figura +
  icona + «Before · After»; intimità una scheda larga; **More** griglia a 3.
  Le tessere entrano una dopo l'altra, alone che respira dietro la figura.
- **Categoria** (es. Running): interruttore Before/After che scorre,
  durate, Gentle/Intense, Standing only/Standing + floor, riepilogo con la
  barra del peso di ogni esercizio, esercizi numerati lungo una linea,
  «Start». Una riga apre la pagina dell'esercizio.
- **Pagina dell'esercizio**: figura in loop dentro un anello di 48 puntini
  che si spegne coi secondi, tempo grande, lato, «Breathe in / out»,
  pausa; Hold / Sides / Position; «How to»; «Good for» con le categorie;
  «Try it · 1 min» (aggiunta approvata).
- **Cinque colori nuovi, uno per gruppo** (approvati): corallo Body, viola
  Moments, azzurro Sports, rosa intimità, verde More — token dedicati allo
  stretching in `src/theme/tokens.ts`, con i test di contrasto nelle
  quattro tinte (valori dello schizzo, tinta scura: `#FF8A5C`, `#A99BFF`,
  `#4DD2FF`, `#FF6FB5`, `#4FD08A`). Il giallo resta solo su «Start».
- Tutto senza librerie nuove: forme, colori pieni, animazioni di scala e
  rotazione (ADR-0147).

## Parti di codice (proposta, 2026-11-27)

Ognuna con la sua PR, la lista dei file al Coordinatore prima del codice,
le quattro traduzioni dei testi che aggiunge col sì dell'utente, test
deterministici. **File nuovi dove si può**, per toccare il meno possibile
quelli di TASK-466 (`exercises.ts`, `poses.ts`, `routines.ts`,
`Figure.tsx`), da concordare con la sua sessione.

- **A — Fondamenta**: il tipo `Move` (loop tra due pose, a tempo); la
  vista di fronte della figura; i campi nuovi dell'esercizio (tipo,
  posizione, livello, vista); i cinque token di colore con i test di
  contrasto nelle quattro tinte. Nessuna schermata cambia.
- **B — Pose ed esercizi nuovi**, a blocchi di 10–15: B1 e B2 le tenute
  viste di lato (12 + 12: in piedi, su sedia e le prime a terra, poi
  seduti, in ginocchio e sdraiati), B3 i movimenti di lato (17, in due PR
  se serve), B4 la vista di fronte (9, con `goalpost`). Ogni posa col test
  «sta in piedi / sta nel riquadro» come oggi. La parte A si è divisa: **A1**
  (movimenti, vista di fronte, campi nuovi, lista unica) e **A2** (i cinque
  token di colore, quando `tokens.ts` è libero: lo dice il Coordinatore).
- **C — Categorie e routine**: il catalogo (54 voci), la composizione
  deterministica per durata e variante, la regola di «Today», i test (ogni
  categoria ha abbastanza esercizi; i minuti tornano).
- **D — Home nuova e pagina della categoria**: «This week», «Today», «My
  routines» di 466 E, i gruppi, le icone Lucide (PNG a tre densità con
  `out/TASK-444/tools/icon.swift`); qui lo stretching nuovo diventa
  visibile. Schermate dal simulatore col turno del Coordinatore.
- **E — Pagina dell'esercizio**, con l'anello di puntini e «Try it».
- **F — Video MP4 della routine** (ultima).

### Decisioni tecniche (per ADR-0415, «Proposta»; decise dall'agente su delega dell'utente)

1. Le routine si **compongono**: ogni categoria ha un elenco ordinato di
   esercizi con le etichette (posizione, livello); durata e variante
   scelgono quanti e con che tenuta, sempre allo stesso modo. Non ~250
   liste a mano.
2. `Move` è un loop tra due pose della stessa figura, col tempo che scorre
   come per le tenute; nessuna libreria (ADR-0147).
3. La vista di fronte è un secondo insieme di segmenti della stessa
   figura, disegnato allo stesso modo (View girate).
4. I colori dei gruppi sono token dedicati (`stretch.*`), non il riuso di
   `runDay`, `muscle`, `food`, che vogliono dire altro.
5. L'anello del tempo è fatto di 48 View tonde, non di un arco.
6. Gli sport si scrivono «{sport} · Before/After»: niente frasi «After
   {sport}» per lingua.
7. Il video nasce nella pagina del video della corsa, con una scena sua.

## Criteri di accettazione

- [x] Parte 0 approvata dall'utente e scritta qui (2026-11-27).
- [ ] Ogni parte di codice con test deterministici (`docs/TESTING.md`).
- [ ] Testi nuovi in cinque lingue, col sì dell'utente.
- [ ] Niente consigli medici: «Stop if it hurts» resta; nelle categorie
      per la schiena una riga che non sostituisce un medico.
- [ ] Nessuna dipendenza nuova.

## File toccati

Parte 0: `docs/tasks/TASK-520.md`. Le liste delle parti di codice si
aggiungono qui dopo il sì del Coordinatore. Tutti i percorsi sotto
`apps/mobile/src/`.

- **A1** (#1666, in `main` il 2026-11-27): modificati `stretch/exercises.ts`
  (solo campi facoltativi nel tipo `Exercise`), `stretch/Figure.tsx` (la
  prop `breathMs`), `stretch/StretchScreen.tsx` (sceglie la figura di
  fronte); nuovi `stretch/posesFront.ts`, `stretch/FigureFront.tsx`,
  `stretch/allExercises.ts` e i test `posesFront.test.ts`,
  `FigureFront.test.tsx`, `allExercises.test.ts`, `FigureMove.test.tsx`,
  `StretchScreenMove.test.tsx`. I tre file modificati sono di TASK-466:
  ordine concordato con la sua sessione (520 passa per prima).
- **B, tutti i blocchi** (#1672, #1681, #1684, #1687, in `main` il
  2026-11-27): nuovi `stretch/posesMore.ts`, `stretch/exercisesMore.ts`,
  `stretch/posesFrontMore.ts` (B4) e i loro test (`posesMore.test.ts`,
  `exercisesMore.test.ts`, `posesFrontMore.test.tsx`); modificati
  `stretch/allExercises.ts` e il suo test (di 520) e le quattro tabelle
  `i18n/{it,de,fr,es}.ts` (un solo blocco segnato «TASK-520 part B»). Il
  blocco 4 ha toccato anche quattro file della A1, col sì del Coordinatore:
  `stretch/posesFront.ts`, `stretch/posesFront.test.ts`,
  `stretch/FigureFront.tsx`, `stretch/FigureFront.test.tsx` (i piedi che
  restano fermi, la sfumatura quando il busto si capovolge).
- **A2** (#1691): `theme/tokens.ts` e `theme/palettes.test.ts`, col turno
  dato dal Coordinatore dopo la #1686 di TASK-489.
- **C** (#1693): nuovi `stretch/categories.ts`, `stretch/compose.ts`,
  `stretch/today.ts` e i loro tre test; modificato `stretch/exercises.ts`
  (di TASK-466, d'accordo con la sua sessione): tre righe,
  `position: "floor"` su `hipFlexor`, `cat` e `child`.
- **D1** (#1710, in `main` il 2026-11-27): nuovi `stretch/categoryText.ts`,
  `stretch/stretchChoices.ts`, `stretch/categoryIcons.ts`,
  `stretch/CategoryTile.tsx`, `stretch/TodayCard.tsx`,
  `stretch/CategoryPage.tsx`, `stretch/StretchHome.tsx` e i loro test; 54
  PNG nuovi in `apps/mobile/assets/ui/icons/` (18 icone Lucide, licenza ISC
  già lì). Modificati: `screens/ChooseScreen.tsx` (solo il blocco dello
  sport «Stretching»), `stretchSport/StretchSessionHost.tsx` e il suo test
  (di TASK-475, chiuso), `stretch/StretchScreen.tsx` (di TASK-466: la prop
  facoltativa `session`), `i18n/{it,de,fr,es}.ts`,
  `tabs/TabSwipeOwners.test.ts` (il registro delle file che scorrono di
  lato: una riga).
- **D2** (#1714): nuovi `stretch/useStretchWeek.ts`,
  `stretch/StretchWeek.tsx` e i loro test; modificati
  `stretch/StretchHome.tsx`, `stretch/categoryText.ts`, i loro test e
  `stretch/TodayCard.test.tsx`, `i18n/{it,de,fr,es}.ts`.
- **E** (#1721): nuovi `stretch/ExercisePage.tsx`, `stretch/DotRing.tsx`,
  `stretch/goodFor.ts` e i loro test; modificati `stretch/CategoryPage.tsx`
  e il suo test, `stretch/CategoryTile.tsx` (la prop facoltativa `mirrored`
  di `PoseFigure`), `i18n/{it,de,fr,es}.ts`.

## Dove siamo

2026-11-27: numeri dal Coordinatore (TASK-520 / ADR-0415). Parte 0 chiusa:
mappa, esercizi, schizzo, nome «Intimacy», testi in inglese, video MP4
come ultima parte — tutti col sì dell'utente.

2026-11-27, codice: **A1 in `main`** (#1666). **Traduzioni dei 50 esercizi
approvate** dall'utente in una volta («Sì, approvo»): nomi e «How to» in
italiano, tedesco, francese, spagnolo (it ed es col «tu», fr col «vous»,
de all'infinito).

2026-11-27, **parte B chiusa: i 50 esercizi nuovi sono in `main`**, in
quattro blocchi: B1 12 tenute di lato (#1672), B2 12 tenute seduti, in
ginocchio e sdraiati (#1681), B3 12 movimenti di lato (#1684), B4 14
esercizi visti di fronte o dall'alto (#1687). Nessuna schermata li mostra
ancora: la home nuova è la parte D. Le pose si disegnano prima su un
foglio, con un aiuto in Python che ripete la geometria della figura
(`out/stretching-nuovo/pose/` nel checkout principale, fuori dal
repository), poi si scrivono nel codice coi loro test.

Scelte dell'utente durante la parte B (2026-11-27), scritte negli allegati:

- **«Di fronte»**: cinque movimenti che l'elenco aveva di lato (Arm
  openers, Open book, Trunk turns, Knee sways, Hip circles) si disegnano di
  fronte, i due da sdraiati dall'alto: il gesto va verso chi guarda e di
  lato non si capiva.
- **«Sì, dall'alto»**: «90/90 hips» e «Side-lying quad» si disegnano
  dall'alto; le pose di lato restano nel codice. «Figure four» resta di
  lato.

**Simulatore** (iPhone 17e, Expo Go, turno del Coordinatore, 2026-11-27):
visti tutti i 50 in una galleria e quattro nella schermata vera; fogli in
`out/TASK-520/b/` del checkout principale. Due correzioni nate dalla prova,
dentro la #1687: l'ingresso del «Wide-leg forward fold» sfuma invece di far
ruotare il busto di lato, e «Chin tuck» è più ampio. Le due pose dall'alto
aggiunte per ultime non sono state viste al simulatore.

Limiti noti, detti all'utente: «Neck turn» si inclina appena (una testa
senza faccia non gira); «Pelvic tilt» e «Chin tuck» sono gesti piccoli; a
metà dei «Knee sways» le gambe passano per dritte (i segmenti non si
accorciano); «Figure four» di lato si legge poco; il «90/90» dall'alto ha
il busto lungo come da sdraiati.

2026-11-27, **A2** nella #1691 (i cinque colori dei gruppi) e **parte C**
nella #1693 (catalogo delle 54 categorie, composizione, regola di
«Today»), tutte e due «pronta» al Coordinatore. Sul telefono vero non è
stato ancora provato niente.

2026-11-27, **A2 e parte C in `main`** (#1691, #1693).

2026-11-27, **parte D1 in `main`** (#1710): la home nuova dello stretching
e la pagina della categoria, in «Draw» al posto delle tre routine. Sì
dell'utente, tutti del 2026-11-27: i 61 testi con le quattro traduzioni
(«Sì, approvo»), il download delle icone Lucide («Sì, scaricale»), le
schermate dal simulatore («Sì, approvo»), l'unione («sì unisci entrambe»,
detto al Coordinatore). Viste al simulatore (iPhone 17e, Expo Go) aprendo
ogni schermata direttamente; fogli in `out/TASK-520/d/` del checkout
principale. **Parte D2** nella #1714 («This week» e «Today» dopo uno
sport), col sì dell'utente all'unione; la striscia non è stata vista al
simulatore, perché vuole un account con attività.

Rispetto allo schizzo restano fuori, detti all'utente: la fila di
scorciatoie ai gruppi in cima alla home; il tocco su un esercizio della
lista (apre la pagina dell'esercizio: parte E). I promemoria («Morning
stretch», dopo la corsa, dopo la palestra) aprono ancora le tre routine di
TASK-466; `stretchSport/StretchRoutines.tsx` resta nel codice, non più
montato. Il pulsante «Start stretching» in fondo a «Draw» e la sua riga
«No route for stretching: choose a routine and MuW guides you.» non ci
sono più: si parte da «Today» o da una categoria.

Da provare sul telefono dopo l'OTA che porta D1 e D2: una tessera apre la
sua pagina, «Start» avvia la routine, la sessione finita compare in «My
activities» e la settimana dopo in «This week»; le tinte chiare.

2026-11-27, **parte D2 in `main`** (#1714) e documenti di D1 e D2 (#1715).

2026-11-27, **parte E** nella #1721 (pagina dell'esercizio): 14 testi con
le quattro traduzioni («Sì, approvo») e schermate dal simulatore («Sì,
approvo»), aperta direttamente con tre esercizi; fogli in
`out/TASK-520/e/` del checkout principale. «Play» esiste già come «Gioca»:
qui ha il segno `Play@@timer`. Per i movimenti il primo riquadro dice
comunque «Hold»: è il testo approvato, detto all'utente.

### Cosa resta (consegna per chi continua)

Questa parte l'ha scritta una sola sessione, dalla parte 0 alla E. Chi
continua parte da qui e dal task file, non dalla sua conversazione.

1. **Parte F — video MP4 della routine**, l'ultima. Non c'è ancora niente:
   né scelte né codice. Prima una **parte 0 con l'utente**, una domanda
   per volta con la proposta pronta: da dove si apre (fine di una sessione?
   pagina della categoria?), cosa mostra (la figura che fa gli esercizi
   della routine, nomi, tempi, il colore del gruppo?), quanto dura, cosa
   se ne fa (salvare, condividere, post nel Feed?). Decisione tecnica già
   scritta in ADR-0415: nasce nella pagina del video della corsa
   (`src/share/videoPage.ts`), con una scena sua. La figura oggi è fatta
   di View di React Native: nella pagina del video va ridisegnata con gli
   stessi numeri (`poses.ts`, `posesFront.ts` dicono dove sta ogni
   segmento). Poi l'elenco dei file al Coordinatore, prima del codice.
2. **Le scorciatoie ai gruppi** in cima alla home (Body · Moments ·
   Sports · Intimacy · More), che lo schizzo ha e il codice no: la home
   sta dentro lo scorrimento di «Draw», quindi serve che `ChooseScreen`
   la lasci scorrere fino a un gruppo. Piccola, a parte.
3. **Prova sul telefono** dopo l'OTA che porta D1, D2 ed E (lo decide il
   Coordinatore): una tessera apre la sua pagina; «Start» avvia la routine
   e la sessione finita compare in «My activities» e in «This week»;
   «Today» propone l'«After» dopo uno sport; una riga apre la pagina
   dell'esercizio, pausa e «Try it» funzionano; le tinte chiare. Nel
   simulatore tutto questo è stato visto senza tocchi.
4. **Da sapere**: i promemoria («Morning stretch», dopo la corsa, dopo la
   palestra) aprono ancora le tre routine di TASK-466 (`routines.ts`);
   `stretchSport/StretchRoutines.tsx` non è più montato e resta nel
   codice; «My routines» di TASK-466 parte E si monta in
   `StretchHome.tsx`, tra «Today» e i gruppi.
5. **Chiusura del task** quando F è in `main`: stato `Done` qui con una
   riga di esito, la riga in `docs/archive/COMPLETATI.md` e la voce di
   `STATUS.md` (le tiene il Coordinatore 3), «TASK-520 fatto» al
   Coordinatore.

Strumenti fuori dal repository, nel checkout principale: fogli delle pose
e generatori in `out/stretching-nuovo/pose/` e `out/stretching-nuovo/c/`;
tabelle dei testi `out/stretching-nuovo/testi-{d,e}.psv`; schermate e
attrezzi del simulatore in `out/TASK-520/{b,d,e}/` (l'app di prova
`Harness520*.tsx.txt`, `rec.sh`, gli script Swift dei fotogrammi).

---

## Allegato A — Mappa delle categorie e delle routine

Approvata dall'utente il 2026-11-27. Nomi in inglese = testi dell'app;
spiegazioni in italiano.

### Struttura della home (dall'alto)

1. **Today** — una scheda grande con la routine consigliata adesso.
2. **My routines** — quelle di TASK-466 E (non cambia, cambia solo dove sta).
3. Le categorie a gruppi, ognuna una tessera con icona Lucide e la figura
   che si muove in una posa tipica:
   - **Body** (zone del corpo)
   - **Moments** (momenti della giornata)
   - **Sports** (prima e dopo)
   - **Intimacy**
   - **More** (le categorie in più)

### Gruppo «Body» — 12 categorie

| Categoria | Cosa allunga | Lunghezze |
|---|---|---|
| Neck | collo, trapezio alto | 3 · 5 · 10 |
| Shoulders | spalle, cuffia | 3 · 5 · 10 |
| Arms & wrists | bicipiti, tricipiti, avambracci, polsi | 3 · 5 · 10 |
| Chest | pettorali, davanti delle spalle | 3 · 5 · 10 |
| Upper back | dorsali, tra le scapole | 3 · 5 · 10 |
| Lower back | lombari, quadrato dei lombi | 3 · 5 · 10 · 15 |
| Hips & pelvis | flessori, adduttori, rotatori | 3 · 5 · 10 · 15 · 20 |
| Glutes | glutei, piriforme | 3 · 5 · 10 |
| Legs | quadricipiti, femorali, adduttori | 3 · 5 · 10 · 15 |
| Calves | polpacci, soleo | 3 · 5 · 10 |
| Ankles & feet | caviglie, pianta, dita | 3 · 5 · 10 |
| Full body | tutto | 3 · 5 · 10 · 15 · 20 |

### Gruppo «Moments» — 7 categorie

| Categoria | Quando | Lunghezze |
|---|---|---|
| Morning | al risveglio (c'è già, resta legata al promemoria «Morning stretch») | 3 · 5 · 10 · 15 |
| Bedtime | prima di dormire, lento, a terra, respiro lungo | 3 · 5 · 10 · 15 · 20 |
| Desk break | alla scrivania, seduto o in piedi, senza tappetino | 3 · 5 |
| After sitting | dopo tante ore seduto: anche, schiena, petto | 5 · 10 |
| After travel | dopo auto, treno o aereo: gambe, schiena, collo | 5 · 10 |
| Posture | petto aperto, schiena alta, collo | 5 · 10 · 15 |
| Relax & breathe | respiro guidato con pose dolci | 3 · 5 · 10 · 15 · 20 |

### Gruppo «Sports» — 14 sport, ognuno «Before» e «After»

Corsa (Running), bici (Cycling), nuoto (Swimming), sci (Skiing), snowboard
(Snowboarding), scialpinismo (Ski touring), palestra (Gym), moto
(Motorbike), trekking (Hiking), arrampicata (Climbing), canoa e paddle
(Paddling), calcio (Football), tennis e padel (Racket sports), golf (Golf).

- Una tessera per sport; dentro, l'interruttore **Before / After**.
- **Before** = mobilità dinamica (movimenti ripetuti: cerchi delle braccia,
  slanci delle gambe, affondi lenti), 3 · 5 · 10 min. Prepara, non allunga
  a lungo.
- **After** = allungamenti tenuti, 3 · 5 · 10 · 15 min. «After run» e
  «After gym» di oggi diventano queste.
- Gli sport di MuW che non sono in lista (es. parapendio, sci di fondo) per
  ora non hanno tessera: si possono aggiungere dopo.

### Gruppo «Intimacy» — 2 routine

- **Before** e **After**, 5 · 10 min: mobilità di anche, bacino e schiena
  bassa, respiro. Testi sobri, nessuna immagine o parola esplicita, la
  figura è la stessa di sempre.
- Fascia d'età controllata il 2026-11-27: 16+ su App Store, la categoria
  non cambia le risposte del questionario; Google Play non ancora pubblica.

### Gruppo «More» — 5 categorie (tutte tenute dall'utente)

| Categoria | Perché |
|---|---|
| Beginners | pose facili, tenute corte, spiegazioni più lunghe |
| Joint mobility | cerchi di collo, spalle, polsi, anche, caviglie |
| Back care | schiena bassa dolce, con la riga che non sostituisce un medico (Allegato C) |
| Touch your toes | obiettivo flessibilità: femorali e schiena, 10 min |
| Splits | obiettivo spaccata: anche e femorali, 15 · 20 min |

### Varianti (per ogni categoria, dove hanno senso)

- **Lunghezza**: 3 · 5 · 10, più 15 · 20 dove scritto sopra.
- **Gentle / Intense**: dolce = pose più facili, tenute più corte, respiro
  più lento; intenso = pose più profonde e tenute più lunghe.
- **Standing / Floor**: solo in piedi (senza tappetino) o anche a terra.
- Default: 5 min, Gentle, Standing+Floor. La scelta resta ricordata per
  categoria.

Come funziona dietro (scelta tecnica, non di prodotto): le routine non
sono ~250 liste scritte a mano. Ogni categoria ha un elenco ordinato di
esercizi con le loro etichette (in piedi/a terra, dolce/intenso); la
routine di una lunghezza e variante si compone sempre allo stesso modo
(deterministica, testata), come fa oggi `routines.ts` con la tenuta.

### «Today» — cosa consiglia

In ordine, la prima che vale:

1. Hai finito un'attività di uno sport in lista nelle ultime 3 ore →
   «After {sport}».
2. Dalle 21 alle 4 di notte → «Bedtime».
3. Dalle 4 alle 10 → «Morning».
4. Giorno feriale tra le 10 e le 18 → «Desk break».
5. Altrimenti → «Full body» 5 min.

La notte fino alle 4 è una scelta dell'utente dello stesso giorno («Sì,
fino alle 4»): la prima versione diceva «prima delle 10 → Morning» e
all'una di notte avrebbe proposto il risveglio. Gli sport dell'app che
hanno una tessera: corsa, bici (anche gravel e mountain bike), nuoto, sci,
scialpinismo, palestra, trekking, canoa e paddle (`STRETCH_SPORT` in
`stretch/today.ts`); dopo gli altri decide l'ora.

(«Before {sport}» per un'attività pianificata: solo se l'app sa cosa farai,
oggi lo sa per gli allenamenti in calendario di Training — da vedere.)

### Conti

12 + 7 + 14 sport × 2 + 2 + 5 = **54 categorie/routine**, con le
lunghezze ~200 routine, con le varianti di più (composte, non scritte).

---

## Allegato B — Elenco degli esercizi

Approvato dall'utente il 2026-11-27, prima di disegnare le pose.

Oggi ci sono **15** esercizi; qui se ne aggiungono **50** → **65** in
tutto.

### Come leggere la tabella

- **Tipo**: `Hold` = posizione tenuta col respiro (come oggi); `Move` =
  movimento ripetuto in loop tra due pose (per i «Before» degli sport e la
  mobilità), a tempo, con un ritmo (circa 2 s a ripetizione).
- **Lati**: `2` = si fa a destra e a sinistra (con «Switch sides»).
- **Pos.**: `S` in piedi · `C` seduto su sedia · `F` a terra.
- **Liv.**: `G` dolce · `I` intenso (entra solo nella variante «Intense»).
- **Vista**: `L` di lato (come la figura di oggi) · `F` di fronte (vedi la
  nota in fondo).
- **Tempo**: secondi di default per lato; le routine lo cambiano (come
  oggi, una tenuta per tutta la routine).
- **Categorie**: Body = `Neck` `Shoulders` `Arms` `Chest` `UpperBack`
  `LowerBack` `Hips` `Glutes` `Legs` `Calves` `Feet` `Full`; Moments =
  `Morning` `Bedtime` `Desk` `Sitting` `Travel` `Posture` `Relax`; sport
  con `b·` (Before) o `a·` (After): `Run` `Bike` `Swim` `Ski` `Snow`
  `Tour` (scialpinismo) `Gym` `Moto` `Hike` `Climb` `Paddle` `Foot`
  (calcio) `Racket` `Golf`; `Int-b` `Int-a` = intimità prima/dopo; More =
  `Begin` `Joints` `Back` `Toes` `Splits`.

### I 15 di oggi (restano, cambiano solo le categorie)

| key | Nome | Categorie in più |
|---|---|---|
| quad | Quad stretch | Legs · a·Run a·Bike a·Hike a·Ski a·Tour a·Foot a·Gym a·Snow |
| hamstring | Hamstring stretch | Legs Toes · a·Run a·Foot a·Racket a·Hike |
| calf | Calf stretch | Calves · a·Run a·Hike a·Tour a·Racket Travel a·Snow |
| hipFlexor | Hip flexor stretch | Hips Sitting Travel · a·Run a·Bike a·Moto a·Foot Splits a·Snow a·Ski a·Golf |
| glute | Glute stretch | Glutes · a·Run a·Bike a·Hike a·Snow a·Ski |
| neck | Neck stretch | Neck Desk Posture · a·Bike a·Moto a·Swim |
| overheadReach | Overhead reach | Full Morning Desk · b·Swim b·Climb |
| shoulder | Shoulder stretch | Shoulders · a·Swim a·Racket a·Paddle a·Climb a·Gym a·Golf |
| chest | Chest opener | Chest Posture Desk · a·Bike a·Moto a·Gym |
| triceps | Triceps stretch | Arms Shoulders · a·Swim a·Climb a·Gym |
| upperBack | Upper back stretch | Neck UpperBack Desk · a·Paddle a·Bike |
| forwardFold | Forward fold | Calves Legs Full Toes Morning · a·Run |
| cat | Cat stretch | LowerBack UpperBack Back Begin |
| child | Child's pose | LowerBack Relax Bedtime Back Begin Int-a |
| kneeHug | Knee hug | LowerBack Bedtime Back Begin |

### I 50 nuovi

#### Collo (3)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | neckSide | Neck side tilt | Hold | 2 | S/C | G | F | 20 | Neck Desk Posture Travel Bedtime · a·Bike a·Moto | Tilt one ear toward your shoulder. Keep both shoulders low. |
| 2 | neckTurn | Neck turn | Hold | 2 | S/C | G | F | 20 | Neck Desk Travel · b·Swim b·Moto b·Paddle | Turn your head to look over one shoulder. Chin level. |
| 3 | chinTuck | Chin tuck | Move | – | S/C | G | L | 30 | Neck Posture Desk Begin | Draw your chin straight back, then release. Eyes forward. |

#### Spalle (5)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 4 | armCircles | Arm circles | Move | – | S | G | L | 30 | Arms Shoulders Joints Morning · b·Swim b·Racket b·Climb b·Paddle b·Gym b·Golf b·Ski b·Tour | Swing your arms in big, slow circles. Change direction halfway. |
| 5 | shoulderRolls | Shoulder rolls | Move | – | S/C | G | L | 30 | Neck Shoulders Desk Posture Travel Begin · b·Moto b·Bike | Roll your shoulders up, back and down. Slow and wide. |
| 6 | threadNeedle | Thread the needle | Hold | 2 | F | G | L | 30 | Shoulders UpperBack · a·Swim a·Climb a·Paddle a·Racket | On all fours, slide one arm under your body. Rest your shoulder down. |
| 7 | sideReachChild | Side child's pose | Hold | 2 | F | G | L | 30 | Shoulders UpperBack Relax · a·Climb a·Swim a·Paddle a·Gym | From child's pose, walk both hands to one side. Breathe into your ribs. |
| 8 | armOpeners | Arm openers | Move | – | S | G | L | 30 | Chest Shoulders Posture · b·Swim b·Paddle b·Climb b·Racket | Hug yourself, then open your arms wide. Squeeze your shoulder blades. |

#### Braccia e polsi (4)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 9 | wristFlexor | Wrist stretch, palm up | Hold | 2 | S/C | G | L | 20 | Arms Desk · a·Climb a·Racket a·Golf a·Moto a·Bike | Arm straight, palm up. Gently pull your fingers back with the other hand. |
| 10 | wristExtensor | Wrist stretch, palm down | Hold | 2 | S/C | G | L | 20 | Arms Desk · a·Climb a·Racket a·Golf a·Moto a·Paddle | Arm straight, palm down. Gently press the back of your hand toward you. |
| 11 | wristCircles | Wrist circles | Move | – | S/C | G | L | 30 | Arms Joints Desk · b·Climb b·Racket b·Golf b·Moto b·Paddle | Make slow circles with both wrists. Change direction halfway. |
| 12 | bicepsWall | Biceps stretch | Hold | 2 | S | G | L | 20 | Arms Chest · a·Climb a·Paddle a·Gym | Palm on a wall behind you, arm straight. Turn your chest away. |

#### Petto (2)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 13 | doorwayChest | Doorway chest stretch | Hold | 2 | S | G | L | 30 | Chest Posture Sitting · a·Swim a·Gym a·Bike | Forearm on a door frame, elbow at shoulder height. Step through gently. |
| 14 | goalpost | Goalpost arms | Hold | – | S | G | F | 20 | Chest Shoulders Posture Desk · a·Moto a·Bike | Elbows at shoulder height, hands up. Draw your elbows back, chest open. |

#### Schiena alta (3)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 15 | openBook | Open book | Move | 2 | F | G | L | 30 | Chest UpperBack Joints Sitting · b·Golf b·Racket b·Paddle a·Swim | Lie on your side, knees bent. Open your top arm wide and follow it with your eyes. |
| 16 | sideBend | Standing side bend | Hold | 2 | S | G | F | 20 | Full UpperBack Morning Desk · b·Paddle b·Ski b·Golf | Reach one arm overhead and lean to the other side. Hips still. |
| 17 | trunkTurns | Trunk turns | Move | – | S | G | L | 30 | UpperBack Joints · b·Golf b·Racket b·Ski b·Snow b·Paddle b·Foot b·Bike b·Moto | Feet wide, turn your upper body side to side. Let your arms swing. |

#### Schiena bassa (6)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 18 | catCow | Cat–cow | Move | – | F | G | L | 30 | LowerBack Morning Back Joints Begin Int-b | On all fours, round your back, then let it dip. Move with your breath. |
| 19 | sphinx | Sphinx | Hold | – | F | G | L | 30 | LowerBack Posture Sitting Bedtime Back | Lie on your belly, forearms down. Lift your chest gently. |
| 20 | lyingTwist | Lying twist | Hold | 2 | F | G | F | 30 | LowerBack Bedtime Relax Back · a·Run a·Golf a·Bike Int-a a·Snow | Lying down, drop both knees to one side. Shoulders stay on the floor. |
| 21 | pelvicTilt | Pelvic tilt | Move | – | F | G | L | 30 | LowerBack Back Begin Relax Int-b | Lie on your back, knees bent. Press your lower back down, then release. |
| 22 | kneeSway | Knee sways | Move | – | F | G | L | 30 | LowerBack Bedtime Back Joints | Lying, knees bent and feet wide. Let your knees sway side to side. |
| 23 | seatedTwist | Seated twist | Hold | 2 | F | G | L | 30 | LowerBack Full · a·Golf a·Bike a·Paddle | Sit tall, one knee bent over the other leg. Turn toward the bent knee. |

#### Bacino e anche (7)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 24 | butterfly | Butterfly | Hold | – | F | G | F | 30 | Hips Splits Bedtime Int-b · a·Bike a·Run | Sit with the soles of your feet together. Let your knees fall open. |
| 25 | lizard | Lizard lunge | Hold | 2 | F | I | L | 30 | Hips Splits · a·Foot a·Climb a·Tour a·Snow | From a low lunge, both hands inside your front foot. Sink your hips. |
| 26 | frog | Frog | Hold | – | F | I | F | 30 | Hips Splits | On all fours, knees wide. Push your hips gently back. |
| 27 | hipCircles | Hip circles | Move | – | S | G | L | 30 | Hips Joints Morning Int-b · b·Run b·Foot b·Racket b·Ski b·Snow b·Hike b·Bike b·Gym b·Moto b·Tour | Hands on hips, draw big slow circles. Change direction halfway. |
| 28 | ninetyNinety | 90/90 hips | Hold | 2 | F | G | L | 30 | Glutes Hips Joints · a·Climb a·Golf a·Snow | Sit with both knees bent at right angles, one in front, one to the side. Sit tall. |
| 29 | sideLunge | Side lunge | Move | 2 | S | I | F | 30 | Legs Hips · b·Foot b·Racket b·Ski b·Snow | Feet wide, shift your weight into one bent knee. Other leg straight. |
| 30 | deepSquat | Deep squat | Hold | – | S | I | L | 30 | Hips Feet Joints · a·Climb b·Snow a·Gym | Feet wide, sink low, heels down. Elbows press your knees open. |

#### Glutei (4)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 31 | figureFour | Figure four | Hold | 2 | F | G | L | 30 | Glutes Bedtime Back Travel · a·Run a·Bike a·Hike Int-a a·Snow a·Ski | On your back, ankle over the other knee. Pull that thigh toward you. |
| 32 | pigeon | Pigeon | Hold | 2 | F | I | L | 30 | Glutes Hips Splits · a·Run a·Tour a·Hike | Front shin across your mat, back leg long. Fold forward over it. |
| 33 | chairFigureFour | Seated figure four | Hold | 2 | C | G | L | 30 | Glutes Desk Travel Sitting · a·Moto | Sit on a chair, ankle over the other knee. Lean forward, back long. |
| 34 | bridge | Bridge | Move | – | F | G | L | 30 | Glutes LowerBack Back Sitting Int-b · b·Gym b·Run | On your back, knees bent. Lift your hips, then lower slowly. |

#### Gambe (7)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 35 | legSwings | Leg swings | Move | 2 | S | G | L | 30 | Legs Joints · b·Run b·Foot b·Racket b·Hike b·Ski b·Tour b·Bike b·Gym | Hold on to something. Swing one leg forward and back, relaxed. |
| 36 | lungeReach | Lunge with reach | Move | 2 | S | I | L | 30 | Legs Hips Full · b·Run b·Foot b·Hike b·Tour b·Gym b·Bike | Step into a lunge and reach both arms up. Step back and switch. |
| 37 | seatedFold | Seated forward fold | Hold | – | F | I | L | 30 | Legs Toes Bedtime | Sit with legs straight. Fold forward from your hips, back long. |
| 38 | lyingHamstring | Lying hamstring stretch | Hold | 2 | F | G | L | 30 | Toes Legs Back Begin Bedtime · a·Bike a·Run | On your back, raise one straight leg. Hold behind your thigh. |
| 39 | sideQuad | Side-lying quad | Hold | 2 | F | G | L | 30 | Legs Bedtime · a·Bike a·Run a·Ski | Lie on your side. Pull your top heel toward your glutes. |
| 40 | halfSplit | Half split | Hold | 2 | F | I | L | 30 | Legs Splits Toes · a·Run a·Foot | Kneel, front leg straight, toes up. Fold over it with a long back. |
| 41 | wideFold | Wide-leg forward fold | Hold | – | S | I | F | 30 | Legs Hips Splits · a·Foot a·Ski | Feet wide, fold forward from the hips. Hands to the floor. |

#### Polpacci, caviglie e piedi (5)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 42 | soleus | Bent-knee calf stretch | Hold | 2 | S | G | L | 20 | Feet Calves · a·Run a·Hike a·Tour a·Ski | Step back, bend both knees. Keep the back heel down. |
| 43 | calfRaises | Calf raises | Move | – | S | G | L | 30 | Calves Feet Travel Desk · b·Run b·Hike b·Racket b·Tour | Rise onto your toes, then lower slowly. Hold on if you need to. |
| 44 | ankleCircles | Ankle circles | Move | 2 | C | G | L | 30 | Feet Joints Travel Desk · b·Run b·Hike b·Foot b·Ski b·Snow b·Bike b·Tour | Lift one foot and draw slow circles with your ankle. |
| 45 | toeStretch | Toe stretch | Hold | – | F | I | L | 30 | Feet · a·Run a·Hike a·Ski a·Tour | Kneel with your toes tucked under. Sit back gently on your heels. |
| 46 | shinStretch | Shin stretch | Hold | – | F | G | L | 30 | Feet Calves · b·Swim a·Run | Kneel with the tops of your feet flat. Sit back on your heels. |

#### Tutto il corpo, respiro (4)

| # | key | Nome | Tipo | Lati | Pos. | Liv. | Vista | Tempo | Categorie | How to |
|---|---|---|---|---|---|---|---|---|---|---|
| 47 | downDog | Downward dog | Hold | – | F | I | L | 30 | Toes Full Calves Morning · a·Run a·Climb a·Swim | Hands and feet down, hips high. Press your heels toward the floor. |
| 48 | inchworm | Inchworm | Move | – | S | I | L | 30 | Full · b·Gym b·Foot b·Racket b·Climb | Fold down, walk your hands out to a plank, then walk them back. |
| 49 | legsUpWall | Legs up the wall | Hold | – | F | G | L | 60 | Relax Bedtime Travel · a·Run a·Hike a·Bike | Lie down with your legs resting up a wall. Arms relaxed. |
| 50 | restBreath | Resting breath | Hold | – | F | G | L | 60 | Relax Bedtime Int-a Begin | Lie on your back, eyes closed. Breathe slowly into your belly. |

### Le intimità (parte di «Int-b» e «Int-a»)

- **Before** (mobilità, risveglio del bacino): Cat–cow, Pelvic tilt, Hip
  circles, Bridge, Butterfly.
- **After** (sciogliere e respirare): Lying twist, Figure four, Child's
  pose, Resting breath.

Nessun esercizio nuovo solo per questa categoria: sono esercizi comuni di
anche e schiena; testi sobri.

### Viste cambiate dopo l'approvazione (2026-11-27)

La colonna «Vista» delle tabelle qui sopra è quella approvata all'inizio.
Durante la parte B l'utente ne ha cambiate sette:

- **di fronte** invece che di lato: Arm openers (8), Trunk turns (17), Hip
  circles (27);
- **dall'alto** invece che di lato: Open book (15), Knee sways (22),
  90/90 hips (28), Side-lying quad (39). Delle ultime due resta nel codice
  anche la posa di lato.

In tutto 16 esercizi hanno una vista di fronte o dall'alto (erano 9).
Nomi, «How to» e categorie non cambiano.

### Note tecniche (da sapere prima di dire sì)

1. **Vista di fronte**: 8 esercizi (Neck side tilt, Neck turn, Standing
   side bend, Lying twist, Butterfly, Frog, Side lunge, Wide-leg forward
   fold) si capiscono solo guardando la figura di fronte. La figura di oggi
   è vista di lato. Proposta: una **seconda vista della stessa figura, di
   fronte**, fatta allo stesso modo (View girate, nessuna libreria), usata
   solo da questi 8. È una parte di codice in più.
2. **Mani**: la figura non ha mani. Le due di polso (9, 10) e i cerchi dei
   polsi si vedono a grandi linee (il braccio teso e l'altro che lo
   tiene); il «How to» spiega il resto.
3. **«Move»**: oggi la figura respira dentro una posa (si piega di poco).
   Gli esercizi `Move` (18 in tutto) vanno tra due pose, avanti e indietro,
   in loop, con il tempo che scorre come per le tenute. È una piccola
   aggiunta al motore di oggi, senza librerie.
4. Oggetti (muro, porta, sedia): non si disegnano; la figura fa la posa
   come se ci fossero.

### Conti per categoria (contati su questa tabella)

- Body e Moments: almeno 6 esercizi ciascuna, tranne Calves (6 con
  Forward fold) — Bedtime 13, Desk 16, Relax 6.
- «Before» di ogni sport: da 5 (Climb, Golf, Hike, Moto, Snow, Swim) a 10
  (Racket), quasi tutti `Move`; Swim e Moto mescolano qualche tenuta breve.
- «After» di ogni sport: da 6 (Foot, Racket, Tour) a 18 (Run).
- Intimità: 5 prima, 4 dopo (routine da 5 e 10 min).
- More: Begin 9, Joints 11, Back 11, Toes 6, Splits 7.

Con 5–6 esercizi una routine da 10 min ripete qualche esercizio con una
tenuta più lunga, come fa oggi `routines.ts`. Il controllo esatto diventa
un test della parte «categorie e routine».

---

## Allegato C — Testi in inglese

Approvati dall'utente il 2026-11-27. Le quattro traduzioni
(it, de, fr, es) arrivano con ogni parte di codice, insieme ai testi che
quella parte aggiunge, col sì dell'utente su ognuna.

«c'è già» = la chiave esiste già nell'app con le sue traduzioni.

### Home

| Testo | Dove | Nota |
|---|---|---|
| Stretching | titolo | c'è già |
| This week | striscia in cima | c'è già |
| {count} sessions · {minutes} min | striscia in cima | singolare «1 session · {minutes} min» |
| Today | scheda del giorno | c'è già |
| After your activity today | Today, dopo uno sport | nuovo |
| A good start to the day | Today, mattino | nuovo |
| Wind down before sleep | Today, sera | nuovo |
| A break from sitting | Today, scrivania | nuovo |
| A little of everything | Today, tutto il corpo | nuovo |
| {count} exercises | etichetta | singolare «1 exercise» |
| Gentle · Intense | etichette e tasto | nuovi |
| Start | pulsante giallo | c'è già |
| See the {count} exercises | link sotto Start | nuovo |
| My routines · New routine | TASK-466 E | già approvati lì |
| Body · Moments · Sports · Intimacy · More | titoli dei gruppi e scorciatoie | «More» e «Body» ci sono già |
| 12 areas | accanto a Body | nuovo |
| 7 moments | accanto a Moments | nuovo |
| Before and after | accanto a Sports | nuovo |
| Goals and gentle starts | accanto a More | nuovo |
| Before · After | sotto ogni sport, interruttore | nuovi |
| Stop if it hurts. | in fondo | c'è già |

### Categorie

**Body**: Neck · Shoulders · Arms & wrists · Chest · Upper back · Lower
back · Hips & pelvis · Glutes · Legs · Calves · Ankles & feet · Full body.

**Moments**: Morning (c'è già) · Bedtime · Desk break · After sitting ·
After travel · Posture · Relax & breathe.

**Sports**: Running · Cycling · Swimming · Ski touring · Gym · Football
(ci sono già) · Skiing · Snowboarding · Motorbike · Hiking · Climbing ·
Paddling · Racket sports · Golf.

**Intimacy** (nome approvato il 2026-11-27): Intimacy · Before intimacy ·
After intimacy · «Hips, pelvis, lower back and breath».

**More**: Beginners · Joint mobility · Back care · Touch your toes ·
Splits.

**Sport con prima e dopo, come si scrivono**: «Running · Before»,
«Running · After» (nome dello sport + Before/After), anche in «Today» e
in «Good for». Così non servono 28 frasi «After {sport}» per cinque
lingue, con gli articoli diversi in ognuna. «After run» e «After gym» di
oggi restano dove sono già (il promemoria dopo la corsa e la palestra).

### Pagina della categoria

| Testo | Dove | Nota |
|---|---|---|
| Length | sopra le durate | c'è già |
| {minutes} min | durate | c'è già |
| Standing only · Standing + floor | tasto posizione | nuovi |
| {minutes} min · {count} exercises | riepilogo | nuovo |
| Held stretches | riepilogo, After e categorie | nuovo |
| Moving warm-up | riepilogo, Before | nuovo |
| {seconds} s · {seconds} s each side | sotto ogni esercizio | nuovi |
| This is not medical advice. If your back hurts, see a doctor. | Lower back, Back care | nuovo |

### Pagina dell'esercizio

| Testo | Dove | Nota |
|---|---|---|
| Left side · Right side | sotto il tempo | ci sono già |
| Breathe in · Breathe out | sotto il tempo | nuovi |
| Hold · Sides · Position | tre riquadri | nuovi |
| Both · One | valore di Sides | nuovi |
| Standing · Chair · Floor | valore di Position | nuovi |
| How to | titolo | nuovo |
| Good for | titolo | nuovo |
| Try it · {minutes} min | pulsante giallo | nuovo |
| Pause · Play | per VoiceOver | «Pause» c'è già |

### Esercizi nuovi (50): nome e «How to»

| # | Nome | How to |
|---|---|---|
| 1 | Neck side tilt | Tilt one ear toward your shoulder. Keep both shoulders low. |
| 2 | Neck turn | Turn your head to look over one shoulder. Chin level. |
| 3 | Chin tuck | Draw your chin straight back, then release. Eyes forward. |
| 4 | Arm circles | Swing your arms in big, slow circles. Change direction halfway. |
| 5 | Shoulder rolls | Roll your shoulders up, back and down. Slow and wide. |
| 6 | Thread the needle | On all fours, slide one arm under your body. Rest your shoulder down. |
| 7 | Side child's pose | From child's pose, walk both hands to one side. Breathe into your ribs. |
| 8 | Arm openers | Hug yourself, then open your arms wide. Squeeze your shoulder blades. |
| 9 | Wrist stretch, palm up | Arm straight, palm up. Gently pull your fingers back with the other hand. |
| 10 | Wrist stretch, palm down | Arm straight, palm down. Gently press the back of your hand toward you. |
| 11 | Wrist circles | Make slow circles with both wrists. Change direction halfway. |
| 12 | Biceps stretch | Palm on a wall behind you, arm straight. Turn your chest away. |
| 13 | Doorway chest stretch | Forearm on a door frame, elbow at shoulder height. Step through gently. |
| 14 | Goalpost arms | Elbows at shoulder height, hands up. Draw your elbows back, chest open. |
| 15 | Open book | Lie on your side, knees bent. Open your top arm wide and follow it with your eyes. |
| 16 | Standing side bend | Reach one arm overhead and lean to the other side. Hips still. |
| 17 | Trunk turns | Feet wide, turn your upper body side to side. Let your arms swing. |
| 18 | Cat–cow | On all fours, round your back, then let it dip. Move with your breath. |
| 19 | Sphinx | Lie on your belly, forearms down. Lift your chest gently. |
| 20 | Lying twist | Lying down, drop both knees to one side. Shoulders stay on the floor. |
| 21 | Pelvic tilt | Lie on your back, knees bent. Press your lower back down, then release. |
| 22 | Knee sways | Lying, knees bent and feet wide. Let your knees sway side to side. |
| 23 | Seated twist | Sit tall, one knee bent over the other leg. Turn toward the bent knee. |
| 24 | Butterfly | Sit with the soles of your feet together. Let your knees fall open. |
| 25 | Lizard lunge | From a low lunge, both hands inside your front foot. Sink your hips. |
| 26 | Frog | On all fours, knees wide. Push your hips gently back. |
| 27 | Hip circles | Hands on hips, draw big slow circles. Change direction halfway. |
| 28 | 90/90 hips | Sit with both knees bent at right angles, one in front, one to the side. Sit tall. |
| 29 | Side lunge | Feet wide, shift your weight into one bent knee. Other leg straight. |
| 30 | Deep squat | Feet wide, sink low, heels down. Elbows press your knees open. |
| 31 | Figure four | On your back, ankle over the other knee. Pull that thigh toward you. |
| 32 | Pigeon | Front shin across your mat, back leg long. Fold forward over it. |
| 33 | Seated figure four | Sit on a chair, ankle over the other knee. Lean forward, back long. |
| 34 | Bridge | On your back, knees bent. Lift your hips, then lower slowly. |
| 35 | Leg swings | Hold on to something. Swing one leg forward and back, relaxed. |
| 36 | Lunge with reach | Step into a lunge and reach both arms up. Step back and switch. |
| 37 | Seated forward fold | Sit with legs straight. Fold forward from your hips, back long. |
| 38 | Lying hamstring stretch | On your back, raise one straight leg. Hold behind your thigh. |
| 39 | Side-lying quad | Lie on your side. Pull your top heel toward your glutes. |
| 40 | Half split | Kneel, front leg straight, toes up. Fold over it with a long back. |
| 41 | Wide-leg forward fold | Feet wide, fold forward from the hips. Hands to the floor. |
| 42 | Bent-knee calf stretch | Step back, bend both knees. Keep the back heel down. |
| 43 | Calf raises | Rise onto your toes, then lower slowly. Hold on if you need to. |
| 44 | Ankle circles | Lift one foot and draw slow circles with your ankle. |
| 45 | Toe stretch | Kneel with your toes tucked under. Sit back gently on your heels. |
| 46 | Shin stretch | Kneel with the tops of your feet flat. Sit back on your heels. |
| 47 | Downward dog | Hands and feet down, hips high. Press your heels toward the floor. |
| 48 | Inchworm | Fold down, walk your hands out to a plank, then walk them back. |
| 49 | Legs up the wall | Lie down with your legs resting up a wall. Arms relaxed. |
| 50 | Resting breath | Lie on your back, eyes closed. Breathe slowly into your belly. |

I 15 esercizi di oggi tengono nome e «How to» che hanno.
