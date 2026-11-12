# TASK-461 — Il pianificatore completo: corpo libero, piani verso una distanza, gite in montagna

**Stato**: In corso · 2026-11-12 · parte 0 chiusa; A1 e B1 in `main` e
sul server (passo 9, 2026-11-12); B2a in `main` (#1196); A2 (app del corpo
libero) in `main` (#1208, `da3d86f1`), esce col prossimo OTA col sì
dell'utente; poi B2b/C2 (lista dei file al Coordinatore prima del codice)
**Fase**: 5 · **Branch**: `feat/TASK-461-a1-bodyweight-catalog` (A1),
`feat/TASK-461-b1-distance-mountain-server` (B1),
`feat/TASK-461-b2a-target-plans` (B2a), `feat/TASK-461-a2-bodyweight-app` (A2)
**Dipende da**: TASK-433 (la guida delle schede, `gym_plans.program`),
TASK-452 (i ritmi di corsa: la parte A2 parte dopo la sua PR dell'app)
**ADR**: ADR-0371 (proposto) · numeri dal Coordinatore il 2026-11-11

## Obiettivo

Estendere le schede guidate di TASK-433 a un pianificatore completo. Parole
dell'utente del 2026-11-11: «aggiungi la pianificazione della palestra corpo
libero e corsa e pianifica anche tipo un allenamento con le camminate anche
per la sezione corsa camminare correre hike», «facciamo un pianificatore
completo anche per la bici», «e ci aggiunge anche le gite in montagna». Da
un'altra sessione lo stesso giorno: piani verso una distanza costruiti da
poche domande iniziali («magari anche 5 km di corsa o 15 di camminata? …
oppure nuoto 5 km o bici 60 km»).

## Scelte dell'utente (2026-11-11, una alla volta, ognuna con la proposta)

Sulla tela «Schede palestra guidate»
(https://claude.ai/artifact/4Z1qMhK5bc3p2JLgu8t8Ym), riga E:

1. **Dove vive**: «B, comune a tutti» — un pianificatore per tutti gli sport
   sulla guida a 5 passi che c'è; davanti un ingresso «Cosa vuoi allenare?»
   fuori dai 5 passi; più sport nello stesso piano; una lista sola.
2. **Da dove partire**: «Corpo libero» (parte A).
3. **Grafica della riga E**: «Approvo» — ingresso, obiettivo e attrezzi
   (Niente / Una sbarra / Sbarra e parallele), il piano, le settimane.
4. **Esercizi nuovi**: «Sì, quattro nuovi» — squat a corpo libero, ponte
   glutei, mountain climber, superman.
5. **Nomi**: «Sì, «I miei piani»» — in italiano «Nuova scheda» →
   «Nuovo piano», «Le mie schede» → «I miei piani»; il singolo allenamento
   di palestra resta «scheda».
6. **Testi della parte A**: «Approvo» (elenco sotto).
7. **Domande iniziali dei piani a distanza (parte B)**: «Sì, così» — sport,
   dove vuoi arrivare, dove sei oggi, quanti giorni, per quando.
8. **Almeno due sport**: l'utente, a metà lavoro: «nel pianificatore di che
   devono scegliere almeno due sport...»; alla domanda (uno o più, oppure
   almeno due sempre): «Almeno due, sempre». Ogni piano nuovo mescola almeno
   due sport; l'ingresso è a scelta multipla; i piani di sola palestra già
   fatti restano.
9. **Ingresso a più sport e giorni per ogni sport** (E0 rifatta, E2 nuova):
   «Approvo».
10. **Nuoto (B)**: «Tutte e due» — «Dove nuoti?» Piscina (già scelta: serie
    come 8 × 100 m, «Oggi» apre il nuoto in piscina) o Acque libere («Oggi»
    apre Draw del nuoto coi metri).
11. **Oltre il massimo di Draw (B)**: «Sì, così» — entro il massimo «Oggi»
    apre Draw coi km; oltre (corsa 21, camminata/hike/bici 30, nuoto 3,
    canoa 5 km) «Registra libero» (principale, coi km che mancano) e
    «Disegna 30 km»; un'attività di quello sport quel giorno segna il giorno
    fatto, anche più corta.
12. **Promemoria**: «Sì, alle 8» — una notifica del telefono alle 8 solo nei
    giorni del piano («Oggi: Lungo · 12 km»), riga «Ricordamelo alle 8»
    all'ultimo passo, accesa, ora cambiabile; il permesso una volta al primo
    piano; niente se il giorno è già fatto.
13. **Riga F della tela (piani a distanza)**: «Approvo».
14. **Testi della parte B**: «Approvo».
15. **Obiettivo della montagna (C)**: «Sì, il dislivello» — 500, 1000, 1500,
    2000 m o Altro, con una data o «Quando sono pronto».
16. **Riga G della tela (montagna)** e **testi della parte C**: «Approvo».
17. **Le settimane degli esercizi senza kg (A2, 2026-11-12)**: «Sì, così»
    alla domanda «Va bene così per tutti gli esercizi senza kg?», con
    l'esempio piegamenti 3×10 e plank 3×40 s. Prima: 10, 11, 12, 10, 11,
    12… e il plank fermo a 40 s. Dopo: 10, 11, 12, la 4ª settimana più
    leggera (2 serie da 12), poi 13, 14, 15…; plank 40, 45, 50, 4ª leggera,
    poi 55 s. Vale anche per le schede che ci sono già; gli esercizi coi kg
    restano come prima. Il server non ha una copia del conto
    (`gym_plans.py` e il calendario contano solo i giorni): cambia solo
    l'app.
18. **Testi della parte A2 e «scheda» → «piano» (2026-11-12)**: «Approvo» —
    i testi nuovi nelle quattro lingue (ingresso, corpo libero, giorni per
    sport, settimane senza kg) e in italiano «piano» per la scheda di più
    settimane («Nuovo piano», «I miei piani»…), mentre il singolo
    allenamento resta «scheda».
19. **Schermate della A2 al simulatore (2026-11-12)**: «Approvo» —
    l'ingresso col caso «solo palestra» (tasto spento, «Avanti · 1
    scelto»), obiettivo e attrezzi, giorni per sport, allenamenti A e B, le
    settimane senza kg e il prima/dopo di una scheda esistente
    (`out/TASK-461/shots`, fuori da git). Dalla prova: alla sbarra e alle
    parallele metà ripetizioni (3 × 8 trazioni accanto a 3 × 15
    piegamenti).

### I testi approvati della parte A (italiano; le altre lingue con lo stesso senso)

- Ingresso: «Nuovo piano» · «Cosa vuoi allenare?» · «Poi ti guidiamo in 5
  passi. Nello stesso piano puoi mettere anche giorni di corsa.» ·
  «Palestra» «Con pesi e macchine» · «Corpo libero» «A casa o al parco,
  senza attrezzi» · «Verso una distanza» «Corsa, camminata, bici, nuoto»
  «Presto» · «Montagna» «Hike e gite, dislivello che cresce» «Presto».
- Passo 1: «Senza pesi si cresce con le ripetizioni e i secondi.» · «Più
  muscoli» «4 × 12 · recupero 60 s» · «Più forza» «5 × 6 con gli esercizi
  più duri · recupero 2 min» · «Tonificare e dimagrire» «3 × 15 · recupero
  30 s» · «Rimettermi in forma» «3 × 10 · recupero 60 s · per iniziare» ·
  «Cosa hai a disposizione?» «Niente» «Una sbarra» «Sbarra e parallele» ·
  «Con la sbarra aggiungiamo trazioni, con le parallele i dip.»
- Passi 3 e 4: «Ecco il tuo piano» · «Tutto il corpo, tre volte a
  settimana. Tocca un esercizio per cambiarlo.» · «Nessun attrezzo» · «Un
  ciclo di 4 settimane, poi riparte da dove sei arrivato.» · «Di più ogni
  settimana» «+1 ripetizione, +5 s nei tenuti; la 4ª più leggera».
- Esercizi e guide (tre passi e un avviso):
  - Squat a corpo libero: «Piedi alla larghezza delle spalle, braccia
    avanti.» «Scendi col bacino indietro finché le cosce sono parallele a
    terra.» «Spingi sui talloni e torna su.» «Ginocchia nella direzione
    delle punte.»
  - Ponte glutei: «Sdraiato sulla schiena, ginocchia piegate, piedi a
    terra.» «Spingi sui talloni e solleva il bacino.» «Stringi i glutei in
    alto, poi scendi piano.» «Non inarcare la schiena.»
  - Mountain climber: «In posizione di piegamento, braccia distese.» «Porta
    un ginocchio verso il petto.» «Cambia gamba in fretta, come se
    corressi.» «Bacino basso, spalle sopra le mani.»
  - Superman: «Sdraiato a pancia in giù, braccia distese avanti.» «Solleva
    insieme braccia, petto e gambe.» «Tieni un attimo, poi scendi piano.»
    «Sguardo a terra, collo lungo.»
- «Gli esercizi più duri» di «Più forza»: trazioni e dip con sbarra e
  parallele, altrimenti split squat bulgaro e piegamenti lenti.

### I testi approvati delle parti B e C (italiano)

- Ingresso: «Scegline almeno due: un piano mescola sempre due sport. Poi
  ti guidiamo in 5 passi.» · «Avanti · 2 scelti» · «Corsa» «Lenta,
  ripetute, lungo» / «Verso 5, 10, 21 o 42 km» · «Camminata e hike» «Verso
  10, 15, 20, 30 km» · «Bici» «Strada, gravel, MTB · verso 30–150 km» ·
  «Nuoto e canoa» «Piscina o acque libere» · «Montagna» «Hike e gite,
  dislivello che cresce» · «Quanti giorni per ogni sport?» «Già alternati,
  col riposo in mezzo. Tocca un giorno per cambiarlo.»
- B: «Dove vuoi arrivare?» «La distanza dell'ultimo giorno del piano.» ·
  «Altro» · «Solo tenermi in forma» «Un piano che resta uguale, senza un
  giorno obiettivo» · «Dove nuoti?» «Piscina» «Acque libere» · «Dove sei
  oggi?» «Il più lungo che hai fatto nell'ultimo mese senza fermarti.» «Già
  scritto dalle tue corse: 6,2 km il 3 novembre.» · «Comincio da zero» «Si
  parte col cammina-corri: 1′ di corsa e 2′ a piedi» · «Per quando?»
  «Quando sono pronto» «Il piano conta le settimane da solo: 10 settimane»
  «Una data» «Una gara, un'uscita» «Per 10 km servono 8 settimane, ne hai
  5.» «Arriva a 8 km» «Sposta la data» · «Verso i 10 km» «10 settimane. Il
  lungo cresce di un decimo, ogni 4ª più leggera, l'ultimo giorno è la
  gara.» · «Ricordamelo alle 8» «Solo nei giorni del piano» «Inizia
  lunedì» · «Oggi: lungo · 45 km» «Verso i 60 km, settimana 7 di 10.»
  «Draw disegna al massimo 30 km» «Registra libero e vedi quanto manca ai
  45 km, oppure disegna 30 km di forma e il resto lo fai libero.»
  «Registra libero · 45 km» «Disegna 30 km» «Una pedalata di oggi segna il
  giorno fatto, anche più corta.» (corsa, camminata, nuotata) «Mancano
  12,4 km» · promemoria «Oggi: Lungo · 12 km», «Oggi: Corpo libero · A».
- C: «Che gita vuoi fare?» «Quanta salita in un giorno. Il piano ti porta
  lì.» «Di dislivello in salita. 1000 m sono, per esempio, un rifugio alto
  sopra il paese.» «Il giorno della gita» · «Quanta salita fai oggi?» «La
  più lunga dell'ultimo mese, in un'uscita sola.» «Già scritto dai tuoi
  hike: 452 m il 26 ottobre.» «Si parte da 200 m, su sentieri facili» ·
  «Verso i 1000 m» «10 settimane. La salita cresce di un decimo, ogni 4ª
  più leggera, l'ultimo giorno è la gita.» «Corpo libero · gambe»
  «Camminata svelta in salita · 45′» «Uscita in salita · 450 m» «La gita ·
  1000 m» · «Oggi: uscita in salita · 600 m» «Verso i 1000 m, settimana 5
  di 10.» «Cerca almeno 600 m di salita» «Draw disegna l'hike coi km già
  scritti (12 km); la salita dipende da dove parti. Oppure registra libero
  e vedi quanta salita manca.» «Disegna l'hike · 12 km» «Registra libero ·
  600 m» «Un hike di oggi segna il giorno fatto, anche con meno salita.»
  «Mancano 230 m di salita» · promemoria «Oggi: Uscita in salita · 600 m».
- Il ritmo obiettivo (per esempio 10 km in 50′) resta fuori: i ritmi e il
  lungo della corsa sono quelli di TASK-452.

## Le parti

- **A1 — server, catalogo** (questa PR): i quattro esercizi in
  `gym_catalog.py`, nella fixture `gym-exercises.json` e nella tabella di
  `docs/sports/gym.md`; nessuna migrazione. Il server li conosce prima
  dell'app: le schede e gli allenamenti che li usano passano la validazione.
- **A2 — app, corpo libero** (branch `feat/TASK-461-a2-bodyweight-app`,
  lista dei file col sì del Coordinatore il 2026-11-12): ingresso «Cosa vuoi
  allenare?» (almeno due fra palestra, corpo libero e corsa; distanza e
  montagna «Presto»), giorni per sport, obiettivi e attrezzi del corpo
  libero, giorni «Corpo libero · A/B», settimane senza kg che crescono di una
  ripetizione e 5 s nei tenuti con l'ultima più leggera (anche nelle schede
  già fatte: sì dell'utente del 2026-11-12, «Sì, così», all'esempio
  piegamenti 3×10 e plank 3×40 s); i quattro esercizi nel catalogo dell'app
  con omino e guida; in italiano «piano» per la scheda di più settimane.
  Prima di «pronta»: le schermate al simulatore (l'ingresso col caso «solo
  palestra» ben visibile) e il sì dell'utente su testi e traduzioni.
- **B1 — server di B e C insieme** (questa PR): `outing` sui giorni e
  `target` sul programma, fino a 24 settimane; il calendario segna fatto un
  giorno fuori da un'attività del suo sport.
- **B2a — app, la logica dei piani verso un obiettivo** (#1196, in `main`; il sì
  del Coordinatore il 2026-11-12): solo file nuovi in
  `apps/mobile/src/gym/`, nessun testo e niente di collegato, quindi niente
  di visibile nell'app. `targetWeeks.ts` (la scala delle settimane),
  `targetPlan.ts` (il piano dalle risposte della guida), `outingHistory.ts`
  («Dove sei oggi?» dalle attività dell'ultimo mese), coi loro test.
- **B2b — app dei piani a distanza** (corsa, camminata, hike, bici, nuoto,
  canoa) e **C2 — app della montagna**: dopo la PR dell'app di TASK-452
  (#1159) e A2, che toccano gli stessi file (la guida, «Today», le tabelle
  delle lingue). Le schermate delle righe F e G, l'ingresso senza «Presto»,
  la scheda «Oggi» dei giorni fuori, il promemoria alle 8, i testi;
  `sessionsOfWeek` passa i giorni dello sport dell'obiettivo da
  `targetDayInWeek`. I ritmi e il lungo della corsa vengono da TASK-452.

## Il disegno tecnico (ADR-0371, deciso dall'agente su delega dell'utente)

- **Un esercizio nuovo va prima sul server.** Le schede (`gym_plans.py`) e
  gli allenamenti (`gym_sessions.py`) rifiutano una chiave che il catalogo
  del server non ha; quindi il catalogo si allarga prima sul server e poi
  nell'app. Scale: `bodyweight_squat`, `glute_bridge`, `superman` a
  ripetizioni (`B-easy`, come piegamenti e crunch), `mountain_climber` a
  tempo (`T`, come il plank).
- **Un'app di prima legge gli esercizi nuovi senza rompersi.** Un telefono
  non aggiornato che legge una scheda o un allenamento con uno dei quattro
  mostra il nome dalla chiave in parole («Bodyweight squat», «Glute
  bridge», «Mountain climber», «Superman», in ogni lingua), senza omino né
  guida né classifica; le serie si registrano col tipo che la riga porta.
  Lo prova `apps/mobile/src/gym/catalog.test.ts` («an app older than the
  server…»), che intanto confronta il catalogo dell'app con la fixture
  meno i quattro; A2 li aggiunge e svuota l'elenco.
- **Il corpo libero non cambia il contratto delle schede.** Le settimane
  «Di più ogni settimana» stanno nel modo `reps` che c'è: un esercizio senza
  kg cresce di una ripetizione (5 s se tenuto) a settimana, l'ultima del
  ciclo più leggera. Un'app di prima mostra il giro di ripetizioni di prima
  (10, 11, 12): una differenza di numeri, non un errore.

- **I giorni fuori stanno in `outing`, non in `run`.** Nell'app di prima
  «Today» di un giorno con `run` dice «Long run · 60 km» e «Go to the run»
  (il nome del giorno lì non compare): una bici salvata come `run` direbbe
  il falso. Un giorno senza `run` e senza esercizi l'app di prima lo salta
  in «Today» e nella lista ne mostra il nome, che dice sport e misura
  («Long ride · 30 km», «Pool · 8 × 100 m», «Hike · 450 m climb»). Le sue
  modifiche copiano giorni e programma interi, quindi `outing` e `target`
  restano quando salva di nuovo la scheda. Lo prova
  `apps/mobile/src/gym/olderAppOutings.test.ts`. I giorni di corsa di un
  piano a distanza restano `run`. Conta di più dopo la 1.1.0: chi resta
  sulla 1.0.2 non riceve più aggiornamenti dell'app.
- **Un piano verso un obiettivo arriva a 24 settimane.** I cicli della
  palestra restano 4, 6 o 8; `weeks` sale da 12 a 24 per un piano con
  `target` (una maratona). L'app di prima conta le settimane a giro e non
  rompe.
- **Un giorno fuori è fatto da un'attività del suo sport** (camminata,
  hike, bici, gravel, MTB, nuoto in vasca o in acque libere, canoa), come
  un giorno di corsa da una corsa: `gym_calendar.py`.
- **Le settimane verso un obiettivo si calcolano sul telefono**
  (`targetWeeks.ts`), come quelle della palestra: il piano tiene la prima
  settimana e il `target`. Il giorno lungo (o la salita, per un hike verso
  un dislivello) sale una scala: l'ultima settimana è l'obiettivo, ogni
  settimana prima un decimo in meno, ogni 4ª più leggera (4/5 della
  precedente) e senza passo; con più settimane del necessario le prime
  restano dove si è oggi. Le settimane servite sono le meno possibili, almeno
  4, perché la scala parta da dove si è (da 6 a 10 km di corsa: 8, come nel
  testo approvato «Per 10 km servono 8 settimane»); oltre 24 il piano
  propone dove si arriva («Arriva a 8 km»). Gli altri giorni dello sport
  crescono con il lungo, le ripetute di una ogni due passi, e sulla
  settimana dell'obiettivo sono più leggeri. Arrotondati: mezzo km a piedi,
  in corsa e in canoa, km in bici, 100 m in acqua, 50 m di salita.
  Partendo da zero la regola dà molte settimane (corsa da 2 a 10 km: 23):
  è il «un decimo a settimana» approvato.
- **«Dove sei oggi?» viene dall'elenco delle attività** (`GET
  /me/activities`, pagine fino a un mese fa): il più lungo dell'ultimo mese
  dello sport (a piedi camminata e hike insieme, in bici ogni bici). La
  salita di un hike l'elenco oggi non la dà: finché non la dà, l'app la
  chiede invece di scriverla.
- **Il promemoria è del telefono**: notifiche locali (`expo-notifications`,
  c'è già); il server non ne sa niente.

## Controlli

- API: `test_gym_catalog.py` (95 esercizi, fixture e docs uguali),
  `test_gym_plans.py`.
- App: `catalog.test.ts`, `setKinds.test.ts`, `Leaderboard.test.tsx`, `tsc`.
- A2: app `bodyweight.test.ts`, `proposal.test.ts`, `program.test.ts`,
  `catalog.test.ts`, `moves.test.ts`, `muscles.test.ts`,
  `GymPlans.test.tsx`, `GymIntro.test.tsx`, `olderAppOutings.test.ts`,
  `plans.test.ts`, i test di `src/i18n`, `tsc`, eslint e prettier.
- B1: API `test_gym_plans.py` e `test_gym_calendar.py`; shared-types
  `gym.test.ts`; app `olderAppOutings.test.ts`, `plans.test.ts`,
  `GymPlans.test.tsx`, `api/gymPlans.test.ts`, `tsc`.
- B2a: app `targetWeeks.test.ts`, `targetPlan.test.ts`,
  `outingHistory.test.ts`, `tsc`, eslint e prettier sui file nuovi.
- Dopo il passo sul server: le righe di sola lettura in
  `out/TASK-461/SERVER.md` (fuori da git).
