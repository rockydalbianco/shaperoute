# TASK-461 — Il pianificatore completo: corpo libero, piani verso una distanza, gite in montagna

**Stato**: In corso · 2026-11-11 · parte 0 in corso; A1 (server) in PR
**Fase**: 5 · **Branch**: `feat/TASK-461-a1-bodyweight-catalog` (A1)
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

## Le parti

- **A1 — server, catalogo** (questa PR): i quattro esercizi in
  `gym_catalog.py`, nella fixture `gym-exercises.json` e nella tabella di
  `docs/sports/gym.md`; nessuna migrazione. Il server li conosce prima
  dell'app: le schede e gli allenamenti che li usano passano la validazione.
- **A2 — app, corpo libero**: dopo la PR dell'app di TASK-452. Ingresso
  «Cosa vuoi allenare?», passo 1 con gli attrezzi, piano senza kg, settimane
  che crescono di una ripetizione e 5 s nei tenuti; i quattro esercizi nel
  catalogo dell'app con omino e guida; «I miei piani».
- **B — piani verso una distanza** (corsa, camminata, hike, bici, nuoto,
  canoa): server prima (tipi nuovi di giorno in `gym_plans.program`), poi
  l'app; le app già uscite ignorano i giorni nuovi senza rompersi. I ritmi
  e il lungo della corsa vengono da TASK-452.
- **C — gite in montagna**: server prima, poi l'app.

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

## Controlli

- API: `test_gym_catalog.py` (95 esercizi, fixture e docs uguali),
  `test_gym_plans.py`.
- App: `catalog.test.ts`, `setKinds.test.ts`, `Leaderboard.test.tsx`, `tsc`.
- Dopo il passo sul server: le righe di sola lettura in
  `out/TASK-461/SERVER.md` (fuori da git).
