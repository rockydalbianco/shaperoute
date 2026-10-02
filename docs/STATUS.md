# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.**
> Primo file da leggere in ogni sessione, ultimo da aggiornare a fine task.
> Se è disallineato dalla realtà, tutto il resto del sistema smette di
> funzionare: aggiornarlo non è burocrazia, è la parte che regge il metodo.

**Ultimo aggiornamento**: 2026-10-02 · **Fase corrente**: 4 — Estensione

---

## In una riga

Sgrava gira dall'iPhone in Expo Go; l'app pubblicata usa l'API sul server
Hetzner, in HTTPS e sempre accesa, con il database degli account; il Mac
serve per lavorare. L'app ha tre pagine da scorrere, «Feed» (per ora
disegni d'esempio), «Draw» ed «Explore», e «Profile» per iscriversi ed
entrare. In «Draw» si sceglie una forma del catalogo (cerchio, cuore,
stella, cavallo, luna, gatto, pesce, farfalla, lumaca, testa di cane,
testa di coniglio, zucca, albero di Natale), una parola dalla A alla Z,
tonda o squadrata, o una foto, e una distanza fino a 21 km: fino a tre
percorsi fra cui scegliere, il GPX, la navigazione a voce, il punteggio a
fine corsa; si corre anche senza percorso.
«Explore» propone percorsi in ogni città: esempi già disegnati, categorie,
percorsi a tema dai luoghi veri, e «Start». Un annuncio di prova prima di
ogni percorso, solo nella build propria. Le ricerche insegnano sinonimi e
correzioni, applicati a mano (`INSIGHTS.md`). Tempi: 3–10 km nelle zone in
cache in 5–25 s, da 15 a 21 km in 30–50 s. 52 città italiane e 10 estere
hanno la zona già sul server; le altre la scaricano da Overpass, che dopo
molti download rifiuta per qualche ora (`MAPS.md`).

## Prossimo passo

**TASK-122 — le copie fuori dal server**: il server è spostato, manca lo
Storage Box Hetzner, che crea l'utente (`DEPLOY.md` F.13, punto 2); poi
il servizio `offsite` sul server. Dopo, la parte social (`ROADMAP.md`,
«La parte social») riprende da **TASK-116** (il profilo), **TASK-117**
(salvare un disegno) e **TASK-118** (il feed vero, al posto degli esempi
di TASK-156), poi 119–121. **TASK-092 — Percorsi consigliati** (ADR-0086)
ora ha il database e il server. Tutti Todo.

In coda, dopo o accanto:

- **TASK-172 — «My activities»** (ADR-0140 tenuto), chiesto dall'utente il
  2026-10-02 insieme a «Favorites» (TASK-171): le corse registrate nel
  profilo, con giorno, ora, luogo e l'anteprima del disegno. Il task file è
  scritto, con le tre scelte confermate dall'utente (si salva da sola;
  senza account resta com'è; il luogo lo trova l'API). Dipende da TASK-171
  e, per la fine della corsa, da TASK-169. Prende la metà privata di
  TASK-117: chi prende TASK-117 ne aggiorna lo scope.
- **TASK-067 — Lettere unite anche dalla cima** (ADR-0063): il task file
  è scritto (2026-10-02), da assegnare. La scala per lettera non si fa,
  scelta dell'utente: da TASK-071 lettere più piccole si leggono peggio.
- **Pubblicità che paga**, chiesta dall'utente il 2026-10-02: **TASK-150**
  (account AdMob e pagamenti) e **TASK-152** (Sgrava sull'App Store) in
  parallelo, poi **TASK-153** (gli annunci veri). Partono da scelte e
  account dell'utente.
- **Seguiti scritti nei task fatti**: le forme a 21 km di Bari, Palermo
  e New York, quando Overpass riapre, e il feed d'esempio da rifare sulle
  14 città (TASK-161); cuore, cerchio e stella di Berlino nel catalogo,
  quando Overpass riapre, e `catalog/` da aggiornare sul server
  (TASK-163); Berlino, che resta a Overpass, e le zone da rifare
  quando l'estratto invecchia (TASK-137); il segnale della scelta fra
  A · B · C negli esempi (TASK-151); la linea intera a fine corsa
  (TASK-149); zone scaricate con un margine (TASK-143); un GraphML già
  rotto (TASK-133); la password dimenticata, che vuole la posta (TASK-114).
- **Da provare sull'iPhone**: la navigazione camminando un percorso vero
  (TASK-049), il punteggio a fine corsa (TASK-112, 113), iscriversi ed
  entrare (TASK-115: l'API sul server ha il database dal 2026-10-02),
  «Explore» (TASK-126, 134) e il suo «Start» (TASK-145), correre senza
  percorso (TASK-149), «A · B · C» negli esempi (TASK-151, 155), lo swipe
  col dito (TASK-154), il feed d'esempio e i ritocchi di TASK-156, 157,
  158, la schermata della corsa con i numeri e la freccia di direzione
  (TASK-164). Tutti pubblicati su `preview` il 2026-10-02 (ultimo update
  `eba74321`, da 73095e7).
- **Battito e musica nella corsa**, chiesti dall'utente il 2026-10-02
  (seguiti di TASK-169, numeri dal coordinatore): il battito da un sensore
  Bluetooth (`react-native-ble-plx`, dipendenza nuova) e da Apple Watch
  (HealthKit e un'app per l'orologio, dopo TASK-152), tutti e due solo in
  una build propria; la musica: l'utente usa Spotify, «Music» lo apre
  (TASK-173, fatto). **Aspetta la risposta dell'utente**: brano, pausa e
  avanti dentro Sgrava (app Spotify Developer sua, Premium, dipendenze
  nuove, 5 persone al massimo finché è in sviluppo); la proposta è di non
  farlo adesso (`tasks/TASK-173.md`, «La seconda parte»).
- **Task file rimasti aperti**: TASK-055 e TASK-065 dicono «In corso»,
  TASK-076 «In revisione» (PR #93): da controllare e chiudere.

Dal 2026-09-24 più sessioni lavorano insieme, con le regole di
`CLAUDE.md` («Autonomia», «Merge», «Lavoro in parallelo»).

## In lavorazione

- **TASK-122 — L'API e il database sempre accesi** (ADR-0123): il server
  Hetzner gira su `deploy/compose.yaml` con il database e la copia
  notturna dal 2026-10-02 (07:27Z, 18 s di API ferma); iscrizione,
  cancellazione e ripristino provati dal vivo. Le copie fuori dal server
  vanno in uno Storage Box Hetzner (scelta dell'utente; il servizio
  `offsite` è in `main` dalla PR #167): manca che l'utente lo crei
  (`DEPLOY.md` F.13). Sessione «Sistema di auto-miglioramento ricerca»; da
  dove riprendere: il task file.

## Completato

- **App** — TASK-174: le schede di «Explore» hanno la mappa sotto la linea,
  con i nomi dei paesi, chiesto dall'utente (ADR-0142): negli esempi di una
  città e in «Best near you». Sono le foto di «Feed» (TASK-162), fatte
  dalla stessa pagina nascosta; il credito della mappa sta una volta sola
  accanto alle schede. Negli esempi la scheda dice anche il paese. Solo
  app, niente API. **Da pubblicare su `preview`**, con l'ok dell'utente,
  poi da provare sull'iPhone.
- **App** — TASK-173: la musica nella corsa, chiesta dall'utente («uso
  Spotify», ADR-0141). Mentre si corre, sulle pagine «Map» e «Data», «Music»
  di fronte a «Pocket» apre Spotify; su un telefono senza Spotify, la sua
  pagina nello store. Sgrava non suona niente e la corsa non va in pausa.
  Nessuna dipendenza nuova. Visto nel simulatore, dove Spotify non c'è.
  **Da pubblicare e da provare sull'iPhone**: «Music» con Spotify vero; la
  voce delle svolte con la musica accesa (la abbassa, la ferma, ci parla
  sopra?); la corsa mentre si è in Spotify. **Una domanda per l'utente**
  nel task file: brano, pausa e avanti dentro Sgrava.
- **App** — TASK-175: la mappa non ha più i pulsanti «+» e «−» in alto a
  destra, chiesto dall'utente (ADR-0143): si ingrandisce solo con le dita.
  Il cuore dei preferiti sale nell'angolo, alla stessa altezza di «←».
  Solo app, niente API. **Da pubblicare su `preview`**, con l'ok
  dell'utente.
- **App** — TASK-169: la corsa rifatta sul modello di Nike Run Club, chiesta
  dall'utente (ADR-0137), con un percorso e senza. Parte con «3 · 2 · 1»;
  due pagine da scorrere, «Map» (mappa, indicazioni, km, passo di adesso e
  tempo) e «Data» (i km in grande, passo medio, ultimo km, dislivello,
  calorie stimate, i km uno per uno); «Pause» e «Resume», la pausa da sola
  dopo 10 secondi fermi, «Stop» da tenere premuto. Il tempo non conta più
  le pause, nemmeno fra «Stop» e «Keep running»; la voce dice i km anche
  con un percorso, e «Voice» la spegne. Chiude i tre seguiti di TASK-164.
  Nessuna dipendenza nuova, niente API, `App.tsx` non toccato. Visto nel
  simulatore con un GPS simulato. Pubblicato su `preview` il 2026-10-02
  (update `38f9a17b`, da fa6462b). **Da provare sull'iPhone**: lo swipe col
  dito, «Stop» tenuto premuto, la pausa da sola.
  Fuori, già chiesto dall'utente: il battito da sensore Bluetooth e da
  Apple Watch (solo in una build propria). La musica: l'utente usa Spotify
  (TASK-173).
- **API e app** — TASK-171: «Favorites», chiesti dall'utente (ADR-0139).
  Sulla mappa, di fronte a «←», un cuore tiene fra i preferiti dell'account
  il percorso che si vede (disegnato, di «Explore», a tema); in «Profile»
  la riga «Favorites» li elenca a schede e li riapre sulla mappa, da
  correre ed esportare. Senza account il cuore porta a «Sign up». Nell'API
  la tabella `favorites` (migrazione `0002`, la prima con PostGIS) e
  `/me/favorites`. Visto in un simulatore, con un'API e un database
  locali: l'elenco, un preferito aperto sulla mappa con il suo cuore, la
  riga in «Profile». **Sul telefono si vede dopo due passi che vogliono l'ok
  dell'utente**: l'API del server aggiornata (`DEPLOY.md` F.12) e l'app
  pubblicata. Poi **da provare sull'iPhone**. Segue TASK-172, «My
  activities»: le corse registrate, nel profilo.
- **API e app** — TASK-168: gli esempi di una città in «Explore» più
  veloci, chiesto dall'utente (ADR-0136). Un cuore, un cerchio o una stella
  disegnati dal centro di una città restano sull'API
  (`data/cache/routes/`), e la stessa richiesta riceve il percorso nella
  risposta al `POST`: aspetta solo il primo telefono in una città (sul
  Mac: 0,0 s invece di 10–14 s). Solo dai centri delle città, mai dalla
  posizione di qualcuno; un motore cambiato ridisegna. L'app chiede lo
  stato di ogni percorso ogni 0,5 s all'inizio, non più ogni 2 s.
  `python -m shaperoute_api.draw_examples` disegna prima gli esempi di un
  elenco di città. **Mancano, con l'ok dell'utente**: aggiornare l'API sul
  server (l'app pubblicata ci guadagna senza essere ripubblicata per la
  parte dell'API), lanciare `draw_examples` sulle città con la zona, e le
  zone delle città medie come Rovereto. Da capire dai log del server
  perché un esempio lì costa 18 s e sul Mac 2.
- **App** — TASK-170: «Run with Strava» tolto, chiesto dall'utente
  (ADR-0138, che supera ADR-0106). Nelle tre schede di un percorso
  (disegnato, di «Explore», a tema) restano «Start» ed «Export GPX»; il
  GPX è il modo di portare un percorso in un'altra app. Solo app, niente
  API. **Da pubblicare su `preview`**, con l'ok dell'utente.
- **App** — TASK-166: l'annuncio AdMob compare all'inizio della ricerca
  («Draw route», «Ask for a route») e copre il calcolo; alla X lo schermo
  mostra il percorso, se è pronto, o l'attesa (ADR-0102, aggiornamento).
  L'ID vero dell'app AdMob dell'utente per iOS è in `app.json`; l'unità
  resta quella di prova finché non ci sono profilo pagamenti, app sullo
  store e annunci veri (TASK-150, 152, 153). Provato nel simulatore.
- **App e catalogo** — TASK-163 (ADR-0132), chiesto dall'utente: in
  «Explore», finché una città cercata disegna cuore, cerchio e stella,
  sotto ci sono 5 disegni del feed con la foto della mappa (#174,
  pubblicata il 2026-10-02, update `4cab12c4`; **da provare
  sull'iPhone**). E 13 delle 14 città in evidenza hanno le tre forme da
  5 km già nel catalogo: nove file nuovi, 27 forme fra 0,91 e 1,00, da
  `seed_catalog.py --featured` con le zone copiate dal server (New York
  le aveva da TASK-161). **Manca Berlino**, per scelta dell'utente
  rimandata a quando Overpass riapre: la sua zona non è sul server.
  **L'app pubblicata le vede solo dopo aver aggiornato `catalog/` sul
  server** (`DEPLOY.md` F.12), con l'ok dell'utente.
- **App** — TASK-167: in «Explore» i percorsi sono schede, due per riga,
  con il disegno grande in alto, scelto dall'utente fra le proposte
  grafiche (ADR-0135). I filtri stanno in una riga sola, «Shape» e
  «Distance», e le scelte si aprono sotto. Anche gli esempi di una città
  sono schede. Visto su un simulatore con il catalogo di Trento. **Da
  provare sull'iPhone** (ripubblicare l'app).
- **App** — TASK-164: la schermata della corsa rifatta, chiesta dall'utente
  (ADR-0133). Sotto la mappa, con un percorso e senza: km fatti, passo
  medio, passo di adesso (ultimi 200 m) e tempo; con un percorso anche i km
  rimasti, i minuti stimati e la barra del disegno fatto («42% drawn»
  sotto la svolta), senza percorso il passo dell'ultimo km. Sulla mappa il
  segnaposto è una freccia girata dove si sta andando. Senza percorso le
  svolte non esistono: al loro posto freccia e distanza verso la partenza.
  Nessuna dipendenza nuova, niente API. Visto nel simulatore con un GPS
  simulato. Pubblicata il 2026-10-02 (update `eba74321`). **Da provare
  sull'iPhone** camminando.
  Fuori, da chiedere all'utente: «Pause», «Stop» da tenere premuto, la voce
  a ogni km nella corsa con percorso.
- **Catalogo** — TASK-161: il catalogo seme in tutte le 14 città, 323
  percorsi (Napoli, Verona, Padova, Genova, Bari, Palermo e New York
  nuove; Genova, Bari, Palermo e New York con le zone del server), e le
  parole. Solo parole corte, scelta dell'utente (ADR-0130); parole e forme
  illeggibili tolte a occhio (ADR-0097, aggiornamento 2026-10-02).
  Mancano le forme a 21 km di Bari, Palermo e New York (Overpass).

- **App** — TASK-162: in «Feed» ogni disegno ha sotto la mappa della sua
  zona, chiesta dall'utente (ADR-0131): strade, acqua, verde e nomi, con
  lo stile dell'app. È una foto: una pagina MapLibre nascosta sotto
  l'elenco ne fa una alla volta e la scheda la mette sotto la linea, con
  il credito della mappa. Senza rete le schede restano come prima. Nessuna
  dipendenza nuova, niente API. Pubblicata il 2026-10-02 (update
  `d186a9ef`) e provata dall'utente sull'iPhone: «la mappa nei feed c'è».
- **App** — TASK-165: la schermata di avvio con il logo, chiesta
  dall'utente (ADR-0134): fondo nero, su iOS il logo intero, su Android il
  segno. Usa `expo-splash-screen`, dipendenza nuova approvata dall'utente;
  è fra i moduli di Expo Go, e l'app non lo importa: in Expo Go non cambia
  niente. **Da guardare in una build propria** (TASK-152). Dopo il merge:
  `npm install` nel checkout principale.
- **App** — TASK-160: i tre messaggi sulla posizione spenta dicono
  «Location is off for Sgrava…» invece di «…for ShapeRoute…» (prima
  schermata, navigazione, corsa libera): è il nome sotto l'icona da
  TASK-159, e quello che le Impostazioni elencano in una build propria. In
  Expo Go il permesso resta sotto «Expo Go».
- **App** — TASK-159: l'icona dell'app è il nuovo logo scelto dall'utente
  (ADR-0129): una S gialla su nero, fatta come un percorso che parte da un
  punto. Sostituisce il segnaposto di Expo, anche su Android (icona
  adattiva e a un colore); i vettoriali in `docs/brand/`. In Expo Go sulla
  schermata di casa non si vede: **da guardare in una build propria**
  (TASK-152). Sotto l'icona il nome è «Sgrava», non più «ShapeRoute»
  (`name` in `app.json`). Restano la schermata di avvio, da decidere, e tre
  testi dell'app che dicono ancora «Location is off for ShapeRoute…».
- **Documentazione** — TASK-141: `STATUS.md` allineato ai task file e
  alle PR del 2026-10-02: prossimo passo, task in lavorazione, In una riga;
  TASK-126, 128, 129, 131 e 134 qui sotto.
- **App** — TASK-156: «Feed» mostra quindici disegni di esempio, chiesti
  dall'utente (ADR-0127): le figure venute meglio nelle sette città del
  catalogo, due per città, undici forme, con corridori, titoli, tempi e
  punteggi inventati. Le linee sono quelle del motore; le sceglie e le
  scrive `tools/sample_feed.py`. Niente sulla pagina dice che sono esempi,
  per scelta dell'utente: da rivedere prima di invitare altre persone.
  Niente API, niente like o commenti: il feed vero resta TASK-118. Visto
  su un simulatore. **Da provare sull'iPhone** (pubblicata il 2026-10-02; resta la prova sull'iPhone).
- **App** — TASK-157: in «Explore», «Ask for a route» sta in fondo alla
  pagina, sotto gli esempi della città e i percorsi consigliati, chiuso
  dietro una riga grigia e sottolineata; un tocco lo apre lì, e la pagina
  scorre fino a lui. Chiesto dall'utente: prima le figure già pronte delle
  zone, la richiesta in parole quasi nascosta. **Da provare sull'iPhone**
  (pubblicata il 2026-10-02; resta la prova sull'iPhone).
- **App** — TASK-158: il pulsante della corsa libera, in cima a «Draw», dice
  «Run without a route» invece di «Run», chiesto dall'utente: «Run» da solo
  si leggeva come correre il percorso scelto sotto. **Da provare
  sull'iPhone** (pubblicata il 2026-10-02; resta la prova sull'iPhone).
- **Mappe** — TASK-137: 52 città italiane con la zona già sul server
  Hetzner (circa 17 × 17 km attorno al centro, nomi delle strade compresi),
  da `python -m shaperoute_api.prefetch_zones --preset italy --extract …`
  (ADR-0119): esempi e categorie di «Explore» lì non aspettano Overpass
  (provato in 7 città, nessun download). Overpass aveva bloccato il server
  dopo 5 città; le altre vengono dall'estratto Geofabrik dell'Italia, con
  osmium solo nell'immagine dei download. Anche 10 delle 11 città estere in
  evidenza, dai loro estratti; Berlino no (memoria: non sta in 4 GiB). Una
  zona estera grande pesa 0,5–0,76 GB nella memoria dell'API (seguiti per
  TASK-122 nel task file). Berlino resta a Overpass. Da fare: rifare le zone
  quando l'estratto invecchia.
- **App** — TASK-155: in «Explore», sulla mappa di un esempio di città gli
  altri percorsi fra «A · B · C» sono linee grigie sotto quello scelto,
  come per un percorso disegnato; chiesto dall'utente dopo aver provato
  TASK-151 sull'iPhone (2026-10-02: «ora funziona»). In `App.tsx` cambia
  solo cosa riceve la mappa. **Da provare sull'iPhone** (app
  pubblicata il 2026-10-02; resta la prova sull'iPhone). Resta il segnale della scelta (`TASK-151.md`).
- **App** — TASK-154: tre pagine affiancate, «Feed», «Draw», «Explore»,
  scelta dell'utente dopo le proposte grafiche (ADR-0124). Si passa con
  uno swipe a destra o a sinistra, o toccando i nomi in alto; l'app si apre
  su «Draw». La barra in basso di TASK-115 non c'è più: «Profile» si apre
  da un pulsante tondo accanto ai nomi e si chiude con «←». «Explore»
  chiede i percorsi alla prima visita; «Feed» è vuota finché non arriva
  TASK-118. Mappa e corsa restano a tutto schermo, senza swipe. Viste le
  tre pagine e «Profile» su un simulatore. **Da provare con il dito
  sull'iPhone**: lo swipe, e le righe che scorrono di lato dentro le
  pagine (app pubblicata il 2026-10-02; resta la prova sull'iPhone). Seguiti nel task
  file, fra cui i «File toccati» di TASK-118.
- **App** — TASK-132: un annuncio AdMob a schermo intero a ogni ricerca
  («Draw route» e «Ask for a route» in «Explore»), prima del percorso; alla
  X, o senza annuncio, il percorso subito (ADR-0102). Consenso di Google
  alla prima ricerca, mai all'apertura. Solo in una build propria: in Expo
  Go nessun annuncio e l'app come prima. Annunci di prova di Google finché
  non ci sono account e app sullo store (TASK-150, 152, 153). Provato nel
  simulatore iPhone e in Expo Go (2026-10-02).
- **App** — TASK-115: ci si iscrive, si entra e si esce dall'app
  (ADR-0125). Due schede in fondo, «Draw» (le schermate di prima, intatte)
  e «Profile»: «Sign up» (email, nome, password, «I am at least 16») e
  «Log in», con gli errori in parole; dentro, «Log out» e «Delete account»
  con la conferma. La sessione sta nel portachiavi (`expo-secure-store`):
  riaperta, l'app è già dentro e lo verifica con `GET /me`; una sessione
  finita fa uscire e «Profile» chiede di rientrare. La barra si toglie
  sulla mappa e durante la corsa. **Da provare sull'iPhone contro l'API
  vera**: serve un'API con `SHAPEROUTE_DATABASE_URL`, che il server di
  TASK-122 ha dal 2026-10-02 (app pubblicata il 2026-10-02; resta la prova sull'iPhone). Seguito:
  TASK-116 (il profilo).
- **App** — TASK-151: in «Explore» un esempio di città (il cuore da 5 km
  di New York) si apre con le tessere «A · B · C», chiesto dall'utente
  (ADR-0126): l'API mandava già le alternative, l'app teneva solo la prima.
  Scheda, mappa, «Start» e GPX sono del percorso scelto; gli esempi già
  sul telefono si ridisegnano una volta. `App.tsx` non è toccato, quindi
  gli altri percorsi non sono ancora in grigio sulla mappa: seguito nel
  task file. I percorsi del catalogo restano uno solo. **Da provare
  sull'iPhone** (app pubblicata il 2026-10-02; resta la prova sull'iPhone).
- **App** — TASK-149: si può correre senza disegnare niente, chiesto
  dall'utente (ADR-0122). «Run» in alto nella prima schermata, accanto a
  «Explore», apre la mappa che segue la posizione e disegna la linea
  corsa; il banner dice km, tempo e passo medio, sotto «Pocket» e «Stop»;
  a ogni km la voce dice tempo e passo.
  A «Stop» il riepilogo (km, tempo, passo), «Keep running» e «Done», che
  cancella la corsa dal telefono. Niente forma, niente punteggio, niente
  API: la traccia è quella di TASK-112, nello stesso file, con il percorso
  vuoto, e si riapre con l'app se si chiude a metà. **Da provare
  sull'iPhone** (app pubblicata il 2026-10-02; resta la prova sull'iPhone). Seguito
  possibile: inquadrare tutta la linea a fine corsa.
- **App** — TASK-148: tolto da `ExploreTools.tsx` il vecchio «Ask for a
  route», con i suoi test e gli stili che usava solo lui: è il «da fare
  dopo il merge di TASK-142» di TASK-143. Quello vero è in
  `AskForRoute.tsx`; l'app non cambia, niente da ripubblicare.
- **App** — TASK-146: `apps/mobile/app.json` nomina il proprietario vero
  del progetto Expo, l'organizzazione `lppl1316s-team` (trasferito
  dall'account `lppl1316` il 2026-10-02). `eas update` da una copia pulita
  di `main` non chiede più di correggere `owner` a mano; `DEPLOY.md` A.6
  aggiornato. L'app non cambia: niente da ripubblicare per questo.
- **Catalogo** — TASK-128: Firenze nel catalogo seme (22 percorsi, 159 in
  7 città), una zona per città; la città salta se Overpass rifiuta. In
  `main` (PR #147). Mancano Napoli, Verona, Padova, Genova, Bari, Palermo,
  New York e le frasi: un seguito.
- **API** — TASK-114: gli account nell'API, su PostgreSQL con PostGIS
  (ADR-0115, ADR-0120). `POST /accounts` per iscriversi, `POST /session`
  ed `DELETE /session` per entrare e uscire, `GET /me`, `DELETE /me` che
  cancella tutto; token in `Authorization: Bearer`, password Argon2id,
  sessioni di 90 giorni dall'ultimo uso, 5 password sbagliate per email in
  15 minuti. I percorsi restano aperti. Con `SHAPEROUTE_DATABASE_URL`
  l'API applica le migrazioni all'avvio; senza, gli account rispondono 503.
  Test su un PostGIS vero, avviato con docker (sul Mac Colima,
  `SETUP.md` 10.4). Il database sul server è di TASK-122; il seguito è
  TASK-115, le schermate dell'app. La password dimenticata resta fuori:
  serve la posta (Brevo).
- **Server** — TASK-144: la guida per portare l'API su un server a
  pagamento, con il Mac spento (`DEPLOY.md`, strada F, ADR-0111), e la
  configurazione pronta in `deploy/`: l'API con zone, eventi e catalogo,
  l'AI (profilo `ai`) e HTTPS con Caddy (profilo `public`) a scelta. Prima
  privato con Tailscale e `tailscale serve`, poi un dominio, poi gli
  store, e i prezzi del 2026-10-01. Il server scelto dall'utente, Hetzner
  CX33 (10,97 €/mese IVA compresa), è già acceso ma messo su a mano:
  **spostarlo su `deploy/compose.yaml`** (F.12, stessi dati e stesso
  indirizzo, l'app non cambia) è il passo dopo, a fine coda dei merge. La
  CI avvia la configurazione.
- **Motore** — TASK-147: sul server Linux tornano le alternative A · B · C
  (forme, parole, immagini), che l'utente non vedeva più (ADR-0121). Il
  motore leggeva la memoria libera (MemFree, 534 MB: il resto è cache
  delle zone) invece di quella disponibile (MemAvailable, 6,8 GB), e non
  avviava mai le partenze vicine. Provato nel container del server: cuore
  da 5 km a Trento con 1 alternativa (10,8 s), stella con 2 (5,8 s), prima
  0. Il server si aggiorna a `main` subito dopo il merge, perché l'utente
  vuole le alternative presto; l'app non va ripubblicata.
- **API e app** — TASK-142: le ricerche imparano anche da cosa fa l'app
  (ADR-0112, `docs/INSIGHTS.md`). `POST /signals` riceve la città scelta in
  «Explore» e come, il percorso usato fra A·B·C, «Try N km» e la forma presa
  dopo un errore; i percorsi annullati sono eventi. Nuove proposte:
  `city_name` («levic» → Levico Terme, applicata `/cities` la cerca),
  `review_ranking`, `review_distance`; Vercelli scelta fra i suggerimenti
  ora si propone per il catalogo. Comandi `why`, `compare --split`, `trend`,
  `--since/--until`. Corretto un errore di TASK-130: nessun percorso
  dell'API era mai stato registrato. Provato su un'API di prova con
  Geoapify. L'API sul server e l'app sono aggiornate (app pubblicata il
  2026-10-02; resta la prova sull'iPhone). Seguiti
  possibili: esportare il tipo dei segnali da `shared-types/src/index.ts`,
  ora che TASK-088 è entrato; la forma toccata dopo parole non lette
  (`ShapeTiles.tsx`) come prova per i sinonimi.
- **Motore** — TASK-140: luna, farfalla, lumaca (e il cavallo, che non
  cambia) evitano i baffi come cuore, cerchio e stella; si contano solo
  quelli oltre i tratti voluti della forma (ADR-0118). Gatto, pesce e le
  teste restano come prima, per scelta dell'utente. Provato sull'iPhone
  (2026-10-02): funziona.
- **Catalogo** — TASK-088: zucca di Halloween (`pumpkin`) e albero di
  Natale (`christmas_tree`) nel catalogo, con parole, tessere 🎃 🎄 e AI
  (ADR-0084); «albero» e «tree» da soli restano nessuna forma. Le tessere
  ora sono una riga che scorre di lato. Provato sull'iPhone a Milano
  (2026-10-01): «va tutto». Da decidere con l'utente: quali altri contorni
  già disegnati (uccello, cane intero, albero, freccia, corona) mettere
  nella riga.

- **Motore** — TASK-136 (miglioramento generale scelto dall'agente): la
  CLI e `seed_catalog` non salvano più i ritagli dei grafi, come già
  l'API (ADR-0108). Una partenza nuova è più veloce (Milano, cuore da
  10 km: da 11,8 a 5,5 s) e non scrive 20–110 MB; la stessa richiesta
  rifatta costa 0,4–2,6 s in più. Stessi percorsi. I ritagli già salvati
  si elencano con `python -m route_engine.prune_crops` e si cancellano con
  `--delete`: sul Mac erano 346 su 355 grafi, 17,9 GB su 18,6; alla
  cancellazione, dopo il merge su richiesta dell'utente (2026-10-01), erano
  382, per 19,4 GB.
- **Motore, API e app** — TASK-145: «Start» anche sui percorsi di
  «Explore» (consigliati, esempi delle città, a tema), chiesto dall'utente
  (ADR-0117). Al tocco l'app chiede le indicazioni a `POST
  /route-directions`, che ritrova i nodi della linea sul grafo della zona
  (`route_nodes.py`), poi la navigazione di sempre; «Stop» torna alla
  scheda. Sull'API del Mac 0,1–0,5 s, e indicazioni identiche a quelle
  del motore su 4 percorsi appena pianificati. L'API sul server e l'app
  sono aggiornate (app pubblicata il 2026-10-02; resta la prova
  sull'iPhone).
- **App** — TASK-143: «Ask for a route» mostra Food, Famous Places e
  «More…»; una città senza percorsi consigliati disegna da sola cuore,
  cerchio e stella da 5 km, uno alla volta, che si aprono sulla mappa e
  restano sul telefono (ADR-0116). Pergine Valsugana: 6 s per tutti e tre.
  Sul server Hetzner, che l'app usa, Vercelli la prima volta: 94 s (cuore
  40, cerchio 48, stella 5), quasi tutti download da Overpass; il cerchio
  riscarica una zona più larga di soli 30 m per lato (proposta: zone
  scaricate con un margine, dopo TASK-136). Il vecchio `AskForRoute` di
  `ExploreTools.tsx` l'ha tolto TASK-148. TASK-138 provato sull'iPhone
  (2026-10-01): funziona.
- **Scelte** — TASK-110: la parte social decisa dall'utente (ADR-0114):
  Oracle Always Free, email e password, corse private finché pubblicate,
  consigliati da un punto del giro, 16 anni, cancellazione totale, due
  moderatori; il come in ADR-0115, lo schema in `DATABASE.md`.

- **API e app** — TASK-138: in «Explore» il campo «Type a city or a
  place» suggerisce a metà parola città e luoghi (ADR-0110): «arena di ver»
  → Verona Arena, «duomo di mil» → Duomo, «ver» → Verona come centro città.
  Un luogo scelto fa partire le categorie dal suo punto. L'API sul server
  e l'app sono aggiornate (app pubblicata il 2026-10-02); provato
  sull'iPhone il 2026-10-01 (voce di TASK-143).
  «ver» non dà ancora i luoghi famosi di Verona: Geoapify non li ordina per
  fama (Fuori scope del task file).
- **Motore** — TASK-139: anche cerchio e stella evitano i pezzi fatti
  avanti e indietro (ADR-0109), con lo stesso peso del cuore. Il cerchio
  non cambia sulle 7 prove; 3 stelle su 7 cambiano, 2 giudicate meglio.
  Provato sull'iPhone (2026-10-01): funziona.
- **API** — TASK-130: le ricerche che insegnano (ADR-0101,
  `docs/INSIGHTS.md`). L'API registra ogni ricerca e ogni segnale d'uso in
  `data/insights/` (acceso di default, senza dati personali); `python -m
  shaperoute_api.insights` propone sinonimi, correzioni dei refusi, città e
  frasi per il catalogo, con le prove e i controlli superati (`explain`).
  Si impara solo da giorni o luoghi diversi (il modello risponde sempre
  uguale) e mai se l'AI e l'ortografia non concordano. Si applica solo a
  mano, validato (`validate`, anche in CI), versionato, reversibile;
  `impact` dice se una versione ha aiutato, solo con eventi sufficienti.
  Provato dal vivo: «rmantico» a Bologna e Torino → correzione → a Milano
  letto dal vocabolario, senza AI (1,0 s → 0 ms). Seguiti possibili, da
  approvare: i segnali dell'app (percorso scelto fra A·B·C, «Try N km»),
  e TASK-128 che legge città e frasi desiderate.
- **Motore** — TASK-131: un cuore più bello a occhio, provato
  sull'iPhone (2026-10-01). Il cuore evita i pezzi fatti avanti e indietro
  (ADR-0107); la forma ideale resta quella di oggi, preferita dall'utente.
  Il seguito, lo stesso peso per cerchio e stella, è TASK-139.
- **App e API** — TASK-134: «Explore»: città → categoria → percorso
  (ADR-0105): città in evidenza e recenti, suggerimenti mentre si scrive,
  13 categorie da toccare. In `main` (PR #135), da provare sull'iPhone
  (task file «In revisione»).
- **App** — TASK-135: «Run with Strava» in ogni scheda di percorso, il
  flusso ufficiale (ADR-0106): salvare il GPX, importarlo nel route builder
  di Strava, seguirlo dall'app Strava. Strava non permette di creare
  percorsi via API. L'import va provato con un account vero.
- **Motore** — TASK-133 (miglioramento generale scelto dall'agente): i
  file della cache delle zone si scrivono interi o non si scrivono
  (ADR-0104). Un'API o uno script fermati a metà scrittura non lasciano più
  un GraphML, un pickle o un file di vie con nome rotti, che facevano
  fallire ogni percorso della zona finché non si cancellavano a mano; un
  pickle che non si legge cede al GraphML. Stessi percorsi, stessi tempi.
- **API e app** — TASK-129: «Explore» per ogni città e percorsi a tema
  (ADR-0099): «Search a city» e «Ask for a route», una forma che passa dai
  luoghi veri di un tema. Provato a Torino, Bologna, Milano, Roma e New
  York; Parigi e Tokyo quando Overpass riapre. In `main` (PR #126; task
  file «In revisione»).
- **Motore** — TASK-127: Overpass dall'indirizzo che risponde (ADR-0100);
  le zone nuove si scaricano dal Mac. Dopo una serie di download Overpass
  smette comunque di rispondere per qualche ora (MAPS.md).
- **Motore, API e app** — TASK-093: fino a tre percorsi fra cui scegliere
  (ADR-0087). Sotto la mappa le tessere «A · B · C» con km e somiglianza,
  gli altri percorsi grigi sulla mappa; GPX, «Start» e avvisi del percorso
  scelto. Anche per le immagini. Il percorso scelto dal motore resta lo
  stesso (le 8 richieste dall'iPhone del 2026-10-01 rifatte uguali); dopo
  un piano già buono le partenze vicine si aspettano al più 3 s. Provato
  sull'iPhone (2026-10-01): funziona. L'utente: «il cuore ad occhio
  saprei farlo un po' meglio» (da proporre come task sul motore).
- **API e app** — TASK-126: «Explore» (ADR-0098): `GET
  /recommended-routes` dai file del catalogo e la terza schermata
  dell'app. In `main` (PR #124), da provare sull'iPhone (task file «In
  corso»).
- **Catalogo** — TASK-125: il seme dei percorsi consigliati, 137 in 6
  città (Trento, Levico, Milano, Roma, Torino, Bologna), guardati a occhio
  (ADR-0097). Lo script ha già le frasi di ogni città e New York: si
  generano con un nuovo giro, insieme a Firenze, Napoli, Verona, Padova,
  Genova, Bari e Palermo, quando Overpass risponde da questo Mac.
- **API** — TASK-124: il log di accesso dell'API non scrive più le query
  string, quindi niente posizione né testo di `GET /places` (ADR-0096);
  provato sull'API del Mac, che gira con `--request-log`.
- **API e app** — TASK-123: i luoghi della partenza da Geoapify attraverso
  l'API (`GET /places`, ADR-0095), con cache; l'app torna a Photon senza
  API o senza chiave. Serve `GEOAPIFY_API_KEY` sull'API (`DEPLOY.md`, «La
  ricerca dei luoghi»), in `.env` sul Mac. Provato sull'iPhone (2026-10-01):
  0,4–1,2 s invece dei 2–4 s di Photon.
- **API e app** — TASK-113 (prova sull'iPhone non riportata, vale anche
  per TASK-112): a fine corsa l'app mostra
  la corsa sopra il percorso e il punteggio da 0 a 100, chiesto a `POST
  /track-scores` (ADR-0093). Senza rete la corsa resta sul telefono e il
  punteggio si richiede dopo. Il seguito della parte social è **TASK-110**,
  le scelte dell'utente su account e dati.
- **Motore** — TASK-091: il log dell'API non scrive più le coordinate
  della partenza né delle partenze vicine provate (ADR-0092); resta
  «start N: score…, approach … m». Il nome del file della zona in cache
  (un riquadro di chilometri) c'è ancora.
- **App** — TASK-112 (prova sull'iPhone da fare con TASK-113): durante la
  navigazione l'app registra la traccia della corsa e la tiene in un file
  sul telefono, anche se l'app si chiude (`trackRecorder.ts`,
  `trackStore.ts`, ADR-0091). Sullo schermo non cambia niente: la usa
  **TASK-113**, che deve anche salvare la somiglianza del percorso e
  chiedere «riprendi o scarta» alla riapertura.

- **Motore, API e app** — TASK-084: più soggetti in una foto, fino a 4,
  in una linea sola (ADR-0079). Il più grande è il contorno, gli altri
  sono appesi con un trattino nel punto più vicino, fatto andata e
  ritorno; con più di 4 la foto è rifiutata («more than 4 separate
  things»). I dettagli a mano passano da 50 punti a 200 punti percorsi
  (circa 100 andata e ritorno). Campioni a 12 km: Milano «sì», Levico
  «quasi». Provato sull'iPhone dall'utente (2026-09-30): funziona.
- **API** — TASK-090: il registro delle richieste (ADR-0085). Con
  `--request-log` l'API scrive ogni richiesta di percorso, partenza
  compresa, in `data/requests/requests.jsonl`; `python -m
  shaperoute_api.replay` la rifà e dice se il percorso è lo stesso punto
  per punto. **Spento per default**: accenderlo sempre sul Mac è una scelta
  dell'utente. Non si vede nell'app. Provato: cuore 10 km a Caldonazzo e
  «CIAO» a Levico, rifatti identici (467 e 626 punti).
- **Motore** — TASK-111: il punteggio di una traccia corsa, da 0 a 100
  (`track_score.py`, ADR-0090): la somiglianza del percorso per la fedeltà
  della corsa al percorso, entro 40 m. Dalla CLI con `--score-track
  corsa.gpx`. Il seguito è **TASK-112** (registrare la traccia nell'app),
  poi TASK-113.

- **API e motore** — TASK-087: il ritaglio della zona più veloce, a
  percorsi identici (ADR-0082, la proposta 2 di TASK-063). A Milano, con
  la zona in memoria, da 2–6 s a 0,3–1 s a richiesta su questo Mac; stessi
  percorsi punto per punto su 12 casi (Milano e Levico a 10, 15 e
  21 km; a Levico il ritaglio pesava già meno di mezzo secondo).
  L'API va riavviata dopo il merge per prenderlo.
- **App** — TASK-089: un suggerimento toccato riempie il campo, chiude la
  tastiera e non fa ripartire la ricerca; i suggerimenti arrivano anche
  mentre si continua a scrivere, pausa 300 ms (ADR-0083). Photon resta a
  2–3 s a risposta. Provato sull'iPhone (2026-09-30).
- **App** — TASK-086: pulsanti più visibili, bordo e fondo dei comandi
  schiariti nei token (ADR-0081). Provato sull'iPhone (2026-09-30).
- **App** — TASK-085: i luoghi della partenza suggeriti mentre si scrive,
  da 3 lettere, prima quelli vicini alla posizione (ADR-0080). Provato
  sull'iPhone (2026-09-30).
- **App e motore** — TASK-079: modificare il contorno di un'immagine
  (ADR-0074). «Edit the outline» apre una lavagna a tutto schermo con zoom:
  «Add a part» unisce una forma alla sagoma, «Add a detail» aggiunge un
  tratto fatto andata e ritorno, «Undo» toglie l'ultima modifica. Si
  disegna dove si vuole: ciò che non tocca la linea è collegato alla linea
  più vicina, e le linee possono incrociarsi. `POST /image-outline-edits`,
  `strokes` in `/image-route-jobs`. Provato sull'iPhone dall'utente
  (2026-09-30): funziona. Il seguito è **TASK-084**: più soggetti in una
  foto, fino a 4, collegati in una linea sola.
- **App** — TASK-083: l'app su Expo con EAS Update (ADR-0078). Si apre
  in Expo Go sull'iPhone senza `npm run mobile` acceso; l'API serve
  sempre (Mac + Tailscale). Si ripubblica dopo ogni modifica dell'app
  (`DEPLOY.md` A.6). Provata dall'utente (2026-09-28): funziona.
- **App** — TASK-080: le lettere di una parola «Round» o «Square»,
  scelte nell'app sotto il campo della parola; `style` in `RouteRequest`,
  API e `shared-types` (ADR-0075). Provato sull'iPhone (2026-09-28).
- **App** — TASK-070: modalità tasca (ADR-0066). «Pocket» durante la
  navigazione: schermo nero e acceso, luminosità al minimo, tocchi
  ignorati, si esce tenendo premuto 2 s; voce e GPS come prima. Provata
  sull'iPhone dall'utente (2026-09-28): funziona.
- **App** — TASK-074: «Off the route» solo dopo 3 posizioni di fila oltre
  40 m, per almeno 8 s; una posizione con errore oltre 40 m non conta;
  «Back on the route» dopo 2 posizioni sul percorso (ADR-0070). Il
  marciapiede opposto e il GPS che sbaglia per qualche secondo non danno
  più l'avviso; una via parallela sbagliata sì, 8–10 s dopo.
- **Riparatore** — TASK-082: le direzioni col trattino («north-east»,
  «south-west») nell'avviso della partenza spostata ora si traducono come
  «north»; test per le otto direzioni del motore. Un avviso che l'app non
  conosce arriva con la prima lettera maiuscola (ADR-0077).
- **Motore** — TASK-076 (PR aperta, merge del coordinatore): il motore
  prova il cuore anche da 3 nodi a 25–100 m, in parallelo, e tiene il
  migliore; il percorso parte comunque dall'utente, con l'avvicinamento nei
  km e nel GPX (`nearby_starts.py`, ADR-0071, CLI `--nearby 3`). Trento
  10 km 0,86 → 0,88; Caldonazzo, Trento 15 km e Milano uguali. Vince il
  cuore migliore anche se la ricerca sposta la partenza (scelta
  dell'utente). Più 3–15 s; niente vicine su grafi oltre 30 000 nodi o
  senza memoria libera. Nell'API per forme e parole (`plan_request`).
  Caldonazzo: stesso motore di ieri; il cuore cambia con la posizione del
  GPS (0,73–0,98 entro 100 m). Il testo inglese grezzo di uno screenshot è
  un bug dell'app: TASK-082.
- **Programmatore Lettere** — TASK-078: tre forme candidate come contorni,
  sagoma nel contorno e dettagli ripassati (ADR-0073): testa di coniglio
  (`rabbit_head`), zucca di Halloween (`pumpkin`), albero di Natale con la
  stella (`christmas_tree`); provate dalla CLI a 15 km: somiglianza
  0,97 · 0,88 · 0,97, 0,92 · 0,83 · 1,00 e 0,93 · 0,81 · 1,00 (Trento,
  Levico, Milano). Giudizio dell'utente: tutte e tre `sì` a Milano;
  coniglio `sì` a Trento e `quasi` a Levico, zucca `no` a Trento e `quasi`
  a Levico, albero `quasi` a Trento e `no` a Levico. Quali entrano nel catalogo lo decide l'utente, con
  TASK-065 o dopo.
- **Programmatore Lettere** — TASK-077: lettere squadrate, un secondo
  stile delle parole nel motore (`letters_block.json`, `style="block"`,
  ADR-0072): tratti dritti o a 45°, lettere larghe e vicine, la parola
  girata sulla griglia delle vie al più di 30°. Lo stile di oggi resta il
  predefinito, identico. Giudizio: CIAO sì · quasi · sì, MAX no · quasi ·
  sì, BELLO quasi · no · no, HURRY no (Trento · Levico · Milano): bene le
  parole corte con lettere grandi su una griglia regolare. L'utente vuole
  **tutti e due gli stili, da scegliere nell'app**: task da assegnare.
- **Interfaccia Grafica** — TASK-073: l'immagine nell'app e nell'API
  (ADR-0069). «Image» accanto a Shape e Word, foto dalla libreria o dalla
  fotocamera, anteprima del contorno prima del percorso, motivo del rifiuto
  in parole semplici. Provato sull'iPhone dall'utente (2026-09-26): «sì,
  funziona tutto».
- **Programmatore Lettere** — TASK-071: verificato che il ritorno di un
  tratto ripassato prende a volte un'altra via e disegna un anello,
  soprattutto a Milano («CIAO» 51% di strade doppie contro il 74% del
  disegno). Provato il ritorno sulle strade dell'andata: una linea sola, ma
  percorso più lungo e lettere più piccole (fino a −28%); per l'utente 4
  parole su 9 peggio, nessuna meglio. Il motore resta com'è (ADR-0067
  «Scartata», codice nel commit `0e8add6`). Proposta all'utente, da
  decidere: lettere squadrate come nello screenshot di Strava (task file).
- **Motore** — TASK-075: il cuore da 10 km di Caldonazzo non è peggiorato.
  Motore di ieri (`87304b0`) e di oggi (`709f4f5`) danno lo stesso percorso
  punto per punto su 9 partenze su 9, oggi in 16,9 s invece di 21,4 s.
  Cambia invece con la partenza: 25–100 m di GPS portano la somiglianza da
  0,73 a 0,92. Nessun codice cambiato; da decidere se il motore debba
  provare partenze vicine (task file). Giudizio: 5 `sì`, 3 `quasi`, 2 `no`
  su 10 cuori; l'utente ha scelto che il motore provi più partenze vicine e
  tenga la migliore: **TASK-076**.
- **Motore** — TASK-072: la forma ricavata da un'immagine. Da un PNG o
  JPEG con un soggetto chiaro su sfondo uniforme il motore ricava il
  contorno esterno con regole fisse (`image_outline.py`, ADR-0068) e la CLI
  ne fa un percorso (`--image`, `--save-outline`); sfondo non uniforme,
  più soggetti, soggetto sul bordo, piccolo o frastagliato sono rifiutati
  con il motivo. Campioni a 15 km a Trento e Milano: mela, pera e Italia
  `sì`, stella `quasi`/`sì`, gatto `no` (non si riconosceva già dal
  contorno). Il seguito è **TASK-073**: l'immagine nell'app e nell'API,
  con l'anteprima del contorno prima del percorso (task file).
- **App** — TASK-061: un marciapiede senza nome con accanto una via dice
  «Turn left onto the footpath beside Via Roma», sul banner e a voce
  (ADR-0058). `street` vince sempre; un'API senza `along` legge come prima.
- **Programmatore Lettere** — TASK-068: la testa di cane come contorno
  candidato (`dog_head`), vista di fronte con le orecchie che pendono, e
  occhi, naso e bocca ripassati (ADR-0065); provata dalla CLI a 15 km:
  somiglianza 0,97 a Trento, 0,95 a Levico, 0,99 a Milano. Giudizio
  dell'utente in attesa (pagina nel task file); decide se il cane entra nel
  catalogo con TASK-065, e se come testa o intero.
- **Indicazioni** — TASK-060: ogni indicazione dell'API ha `along`, la via
  lungo cui corre una strada senza nome, distinta da `street` (ADR-0057);
  opzionale in `shared-types`. Nomi solo dalla cache, mai da Overpass
  durante una richiesta. Cuore da 15 km di Trento: 118 → 57 indicazioni
  senza nome né via. Il seguito è TASK-061, `along` nella navigazione.
- **App** — TASK-069: la barra di una parola stima il calcolo dalle
  lettere, 20 s l'una (misure nel task file, ADR-0064): «CIAO» a 15 km
  pulsa dopo 160 s invece di 75 s. Le forme come prima.
- **Programmatore Lettere** — TASK-064: quattro animali candidati
  (farfalla, uccello, cane, lumaca) disegnati come contorni, con antenne,
  zampe, coda, spirale e corna ripassate (ADR-0060), provati dalla CLI a
  15 km. Giudizio dell'utente: tutti `sì` a Milano; farfalla `quasi` a
  Trento e Levico, uccello `quasi` a Levico, lumaca `sì` a Trento, il
  resto `no`. Quali entrano nel catalogo lo decide l'utente, con TASK-065.
- **App** — TASK-057: un interruttore «Shape | Word»; la parola si scrive
  nell'app, controllata prima (A–Z, al più 7 lettere, 3 km a lettera, con
  «Use N km»), parte come `word` ed è il nome del percorso (ADR-0053);
  provato sull'iPhone. Seguito possibile: una stima della barra per le
  parole (`progress.ts`).
- **Motore** — TASK-063: dove va il tempo sopra i 10 km (numeri nel task
  file) e corridoio da 1,3 a 4,5 volte più veloce a percorsi identici
  (ADR-0059): Trento da 15 a 21 km da 80–97 s a 35–64 s sul PC carico.
- **App** — TASK-066: una risposta senza `directions` (API precedente a
  TASK-048) è `bad_answer`, non un crash; la guardia accetta anche i
  percorsi di una parola (`shape: null`, `word`), pronta per TASK-057.
- **App** — TASK-058: la barra di caricamento anche sulla mappa che si
  carica e sotto la lettura dell'AI; pulsa quando un'attesa dura più del
  doppio del solito, anche con l'API che non risponde (ADR-0055); provato
  sull'iPhone.
- **Indicazioni** — TASK-062: `numpy` dichiarato fra le dipendenze del
  motore (`>=1.24,<3`, lo stesso limite basso di osmnx).
- **Indicazioni** — TASK-053: un marciapiede senza nome prende la via lungo
  cui corre, dedotta a parte (`sidewalks.alongs`, ADR-0054); i nomi delle
  vie escluse dal grafo in un file per zona. Cuori da 15 km, indicazioni
  senza nome né via: Milano 231 → 81, Trento 118 → 57, Levico 34 → 30.
  Nell'API c'è da TASK-060; nell'app non ancora.
- **App** — TASK-055: barra di caricamento gialla sotto la mappa, stimata
  per fasi (ADR-0050); provata sull'iPhone.
- **App** — TASK-054: partenza dal GPS o da un altro luogo anche con il
  GPS acceso, rotellina durante l'attesa, avvisi in parole semplici
  (ADR-0048); provato sull'iPhone. TASK-051: due schermate, prima cosa disegnare (tessere delle
  forme, distanza con − e +) poi la mappa; provato sull'iPhone.
- **Tema dell'app** — TASK-045: i token Sgrava
  (`apps/mobile/src/theme/tokens.ts`) e uno stile MapLibre scuro che li usa
  (`src/map/mapStyle.ts`), con i test che lo dicono ben formato (ADR-0046,
  `UI.md`, «Il tema»). TASK-046: l'app li usa, mappa scura e percorso
  giallo; provato sull'iPhone.
- **Fase 4 finora** — TASK-040: il contorno accetta `path`, una linea
  chiusa percorsa così com'è (ADR-0042); «CIAO» a tratto singolo, dalla
  CLI, `quasi` a Trento, Levico e Milano a 15 km. TASK-041: un `path`
  aperto si corre a sola andata (ADR-0043); per l'utente «CIAO» aperto è
  peggio del chiuso. TASK-047: indicazioni di svolta agli incroci nel
  motore (`directions.py`, ADR-0045), solo la funzione: su cuori da 15 km
  nessuna in mezzo a una strada; 180 a Trento, 75 a Levico, 264 a Milano,
  dove i marciapiedi senza nome le rendono difficili da leggere. TASK-048:
  le richieste in due tempi le restituiscono, con la partenza e le vicine
  segnate (`joined`, ADR-0047); l'app non le mostra ancora. TASK-050:
  le parole si compongono da un alfabeto a tratto singolo (C, I, A, O),
  con lettere più distanziate, un punto di passaggio ogni 1/16
  dell'altezza, ogni lettera spostata dove ha più strade e la I andata e
  ritorno sulla stessa strada (ADR-0044); «CIAO» dalla CLI (`--word`) è
  `sì` a Trento, Levico e Milano a 15 km, molto meglio di TASK-040.
  TASK-056: l'API accetta `word` al posto di `shape` e risponde con
  `"word": "CIAO"` e `"shape": null`; lettere dell'alfabeto, al più 8, e
  almeno 3 km per lettera, se no un `invalid_request` che dice perché
  (ADR-0051); `shared-types` ha le costanti per l'app. TASK-059: tutte le
  lettere dalla A alla Z, la E e la L col tratto basso staccato dalla base
  (ADR-0056); a 15 km «MAX» `sì` nelle tre zone, «BELLO» e «KIWI» `sì` a
  Milano, `quasi` a Levico, `no` a Trento.
- **Fase 3** — TASK-032: forme da un contorno in JSON, dalla CLI
  (`--outline`, ADR-0035). Cancello superato: stella sì ovunque, cavallo
  quasi a Trento e sì a Levico e Milano; la casa no, anche con camino e
  porta. TASK-033: catalogo di quattro forme (cerchio, cuore, stella,
  cavallo) e riquadro della forma che legge la parola in italiano o in
  inglese (ADR-0036); provato sull'iPhone. TASK-034: sei forme candidate
  (luna, pesce, freccia, albero, corona, gatto) si riconoscono solo a
  Milano, nessuna entra nel catalogo. TASK-035: nessuna misura di
  somiglianza separa i «no» dell'utente, la somiglianza resta com'è; conta
  l'orientamento (ADR-0037). TASK-036: le forme restano dritte entro 15°,
  tranne il cerchio; 7 casi su 15 migliorano, nessuno peggiora (ADR-0038).
  TASK-037: tratti interni ripassati nei contorni, con tolleranze dimezzate
  per le forme che li hanno (ADR-0039); a 15 km 4 casi su 12 migliorano,
  uno peggiora; gatto e pesce `sì` a Trento e Milano, Levico `no`.
  TASK-039: luna, gatto e pesce nel catalogo, scelti dall'utente; provati
  sull'iPhone. TASK-038: se la forma non va vicino, un posto fino a 2 km
  e «Start here» nell'app (ADR-0040); a Levico gatto e pesce `sì` a 1 km;
  provato sull'iPhone. TASK-030: le parole che la tabella non conosce le
  legge qwen3:4b in Ollama sul PC (ADR-0012): 94% sulle parole nuove,
  circa 5 s a parola; sull'iPhone vanno le parole semplici, non «stemma
  della ferrari» né «spirit» (`AI.md`, «Limiti»). TASK-031: con
  «nessuna forma» l'app offre le forme del catalogo come pulsanti, provato
  sull'iPhone; se la forma non ci sta per la distanza, l'API suggerisce
  quella che ci sta e l'app mostra «Try N km» (ADR-0041), un caso raro:
  sull'iPhone non è mai uscito.
- **Fase 2 — App e API** (TASK-020–026): monorepo npm con app Expo e
  `shared-types` (ADR-0028); mappa MapLibre GL JS in WebView con posizione
  GPS e ricerca del luogo (ADR-0029); API FastAPI con grafi di zona in
  memoria (ADR-0030); app che chiede i percorsi, li disegna e spiega ogni
  errore (ADR-0031); richieste in due tempi con stati, per 15 km e zone
  nuove (ADR-0032); export GPX con attribuzione OSM, aperto in Garmin
  Connect (ADR-0033); distanza scritta in km, fino a 21 km, scelta con le
  misure di 21 e 30 km a Trento (ADR-0034). Tutto provato sull'iPhone.
- **Fase 1 — Route engine** (TASK-010–019): CLI e GPX; forme circle e
  heart; snapping su OSMnx con zone e corridoio (ADR-0022); ottimizzatore
  che ruota, scala e sposta la partenza fino a 500 m (ADR-0023, ADR-0025);
  validazione con ripercorso e percorribilità (ADR-0026); anteprima dei
  campioni su mappa (ADR-0024). Cancello superato con la valle sospesa
  (ADR-0027).
- **TASK-001** — Repository pubblico, `main` protetto da PR obbligatoria.

## Bloccato

Niente.

## Note per la prossima sessione

- Navigazione col GPS (TASK-049): da provare sull'iPhone camminando un
  percorso vero; dopo il merge serve `npm install` dalla radice
  (`expo-speech`).
- Ollama 0.34.4 è installato in `D:\Ollama` e parte con Windows; i
  modelli stanno in `D:\Ollama\models` (variabile `OLLAMA_MODELS`
  dell'account). C'è solo `qwen3:4b`: i due scartati e l'installer sono
  già tolti. L'ambiente dell'API ha anche `services\ai` installato.
- Precaricamento del modello (TASK-052): da misurare con il PC scarico,
  riga «AI model loaded in … s» nel log dell'API.
- In sospeso, dall'AI (`AI.md`): precaricare il modello all'avvio
  dell'API (prima parola da 40–49 s a circa 5 s, 3,2 GB di RAM da subito).
- Su questo PC il route-engine usa l'ambiente dell'API: non c'è
  `services/route-engine/.venv` (`SETUP.md`, passo 10.2).
- In cache ci sono i grafi `foot` di zona di trento, levico, valsugana e
  milano (ADR-0023), più le zone di Trento da 21 e 30 km (TASK-026) e
  quelle di Levico e Milano larghe 12,7 km (casa da 15 km, TASK-032), e
  una zona di Levico larga 15 km (TASK-038, per cercare il posto a 2 km):
  tutti i casi girano offline. Da questo PC un indirizzo di
  `overpass-api.de` non risponde: prima di scaricare, leggere `MAPS.md`,
  "Overpass: come si scarica".
- Per generare campioni senza salvare ritagli in `data/cache/`: uno script
  usa-e-getta che chiama `plan_shape` con `ZoneGraphs` dell'API, come in
  TASK-032. Da TASK-136 anche la CLI non salva più i ritagli (ADR-0108).
- Per giudicare le forme senza mappa basta un PNG scritto con la libreria
  standard (`zlib`, `struct`), come `out/TASK-037-before-after.png`: niente
  matplotlib né PIL.
- Il 50% di `STROKE_DETAIL` (ADR-0039) è un primo valore; l'albero con
  fusto e sei rami è troppo fitto per 15 km.
- Per misurare sui casi di riferimento (in `services/route-engine/`, con
  `..\api\.venv\Scripts\python.exe`): `tests/measure_optimizer.py`
  (ottimizzatore, `--no-optimize` per TASK-017) e
  `tests/measure_snapping.py` (solo snapping).
- Fuori scope di TASK-016, annotati: tag `surface`, `sac_scale` e
  `sidewalk` (serve riscaricare i grafi), ed evitare scale e strade
  principali nella ricerca (oggi si misurano e si avvisa soltanto).
- Dopo TASK-063, sopra i 30 s restano la seconda ricerca fino a 2 km
  (ADR-0040), che a Trento corre quasi sempre, e il ritaglio della zona
  nell'API (6–13 s a Milano): proposte in `tasks/TASK-063.md`, da decidere.
- Motore lento sulle distanze lunghe: 30–50 s da 15 a 30 km, più il
  download di una zona nuova (TASK-023, TASK-026; `API.md`, «Tempi»). Le
  richieste in due tempi lo rendono sopportabile, non veloce: `PRODUCT.md`
  chiede al massimo 30 s.
- Far scegliere all'utente fra più percorsi alternativi: è TASK-093.
- La Valsugana è sospesa su richiesta dell'utente: cuore e cerchio da 5 km
  lì non sono disponibili (ADR-0025, ADR-0027).
- matplotlib non è una dipendenza: per guardare le forme basta uno script
  usa-e-getta fuori dal repository.
- Con latitudine negativa serve la forma `--start=-33.9,18.4`: argparse
  scambia `-33.9,...` per un'opzione.
- App: dalla radice `npm install`, poi `npm run mobile` e il QR con la
  Fotocamera dell'iPhone (`SETUP.md`, passo 9). In PowerShell di questo PC
  si scrive `npm.cmd` al posto di `npm` (script bloccati). Sull'iPhone
  Expo Go vuole l'accesso con lo stesso account Expo sul PC e sul telefono
  (già fatto); il permesso di posizione è di Expo Go (`SETUP.md`, 9.4).
- API: dalla radice `services\api\.venv\Scripts\python.exe -m
  shaperoute_api --lan` (`SETUP.md`, passo 10); risponde anche su `/docs`.
- Il disco C: di questo PC ha poco spazio (5,5 GB liberi il 2026-09-23,
  dopo la pulizia: tolti MATLAB, i ritagli in `data/cache/` e la venv del
  route-engine). Ogni zona nuova scaricata vale circa 40 MB, più le
  risposte di Overpass in `data/cache/http/`; Expo si ferma con `ENOSPC`
  quando finisce lo spazio. Fino a TASK-136 la CLI salvava un ritaglio per
  ogni partenza o distanza nuova dentro una zona in cache: quelli rimasti
  si elencano e si cancellano con `python -m route_engine.prune_crops`
  (ADR-0108). Il disco D: ha più di 270 GB liberi.
- Le partenze delle tre zone sono in `docs/TESTING.md`.
- Nell'app la partenza è la posizione GPS o un luogo cercato (`UI.md`);
  le zone fisse servono solo a confrontare le prove.
- Il MVP non rispetta ancora il tempo di `PRODUCT.md` (≤ 30 s) sopra i
  10 km e con le zone nuove: è il motore lento annotato sopra.
- Il repository è pubblico: nessun segreto nei file, mai. Le chiavi stanno
  solo in `.env`, che non entra nel repository.
- Più sessioni lavorano insieme, ognuna nel suo worktree: l'app in
  `D:\shaperoute-app`, con i suoi `node_modules` (`npm ci --cache
  D:/npm-cache`: il 2026-09-24 C: aveva 2,8 GB liberi). Il primo `jest` a
  freddo può superare i 5 s di un test e fallire; al secondo giro è verde.

---

## Come si aggiorna

A fine task, in un solo commit dentro la stessa PR:

1. Sposta il task da **In lavorazione** a **Completato**, con una riga di
   esito: cosa funziona adesso che prima non funzionava.
2. Riscrivi **Prossimo passo** con un solo task.
3. Aggiorna **In una riga**.
4. Svuota o aggiorna **Note per la prossima sessione**.

Tenere breve questo file è parte del lavoro: è quello che si paga in ogni
sessione. Lo storico sta nei commit e nelle PR, non qui. Se **Completato**
supera una decina di righe, si condensa per fase.
