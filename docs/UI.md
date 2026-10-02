# UI — Interfaccia mobile

> Scritto con TASK-021 (mappa, posizione, ricerca del luogo) e TASK-023
> (forma, distanza, percorso); la distanza libera con TASK-026, il
> riquadro della forma con TASK-033, le parole lette dall'AI con TASK-030,
> il tema con TASK-045. Le domande ancora aperte stanno in fondo.

## Cosa è deciso

- React Native + Expo + TypeScript; si prova con Expo Go (ADR-0028).
- La mappa è una pagina MapLibre GL JS dentro una WebView, con le tile di
  OpenFreeMap (ADR-0029). Non MapLibre React Native: in Expo Go non gira.
- I percorsi li chiede all'API sul PC (ADR-0030, ADR-0031); mappa e
  ricerca del luogo chiamano direttamente due servizi esterni (ADR-0029).
- Testi in inglese, come il codice; le traduzioni verranno dopo.

## Il tema

Uno solo, scuro, con il nome Sgrava (ADR-0046). Tutti i valori stanno in
`apps/mobile/src/theme/tokens.ts`: colori, spaziature a passi di 4, raggi,
corpi del testo, la linea del percorso (gialla, larga 5) e `MIN_TAP_SIZE`,
44, l'altezza minima di ogni cosa da toccare. **Nessun colore scritto a
mano fuori da lì**: lo stile della mappa e le schermate leggono gli stessi
token, e un colore nuovo è un token nuovo. Applicato all'app con TASK-046:
mappa scura, percorso giallo, pannelli scuri, tastiere scure, barra di
stato chiara. «Draw route» è l'unico comando giallo, con il testo scuro; gli
altri («My position», «Search», «Cancel», «Export GPX», le forme da
toccare) sono neutri, su `surfaceRaised`, con il bordo `borderStrong`:
schiariti con TASK-086 (ADR-0081) perché sul fondo nero non si vedevano. Il segnaposto della partenza è
chiaro (`text`): quello di MapLibre è un azzurro che si confonde con il
ciano di «Start here».

| Token | Colore | Per cosa |
|---|---|---|
| `accent` | `#FFD02B` | il percorso e il comando che lo produce, «Draw route» |
| `onAccent` | `#0A0A0B` | testo e icone sul giallo |
| `background` | `#0A0A0B` | il fondo dell'app, nero neutro |
| `surface`, `surfaceRaised` | `#141416`, `#2B2B31` | campi, schede, il pannello sopra la mappa; una superficie sopra un'altra |
| `border`, `borderStrong` | `#3D3D44`, `#74747E` | divisioni; bordi dei comandi (4,3:1 sul fondo, TASK-086) |
| `text` | `#F5F5F4` | il testo |
| `textMuted` | `#9B9B9F` | etichette e righe secondarie (7,2:1 sul fondo) |
| `textFaint` | `#8A8A90` | il testo più tenue ancora leggibile (5,8:1), non per il corpo |
| `warning` | `#FF7A59` | gli avvisi sul percorso prodotto |
| `error` | `#FF6B6B` | una richiesta fallita |
| `startHere` | `#4DD2FF` | il segnaposto «Start here» (ADR-0040) |
| `map.*` | dal `#0D0E10` al `#3A3D45` | fondo, acqua, verde, costruito, edifici, quattro livelli di strade, nomi dei luoghi |

Quattro regole:

1. **Il giallo significa una cosa sola**: il percorso, il comando che lo
   produce e la barra che lo mostra mentre si disegna. Gli avvisi usano `warning`, arancio: un avviso giallo
   renderebbe il colore muto.
2. **Sul giallo il testo è scuro** (`onAccent`, 13,5:1). Il bianco si ferma
   a 1,5:1, sotto il minimo, e in pieno sole, dove l'app si usa, non si
   legge.
3. **«Start here» è ciano**, non più verde: su una mappa scura il verde è
   spento, e il ciano non si scambia per il percorso.
4. **Lo stile della mappa è dell'app** (`src/map/mapStyle.ts`), non si
   scarica più da OpenFreeMap: le tile e i font sono gli stessi
   (OpenMapTiles, «Noto Sans Regular»), i colori li decidono i token.
   Prima era un file altrui, che poteva cambiare sotto di noi. La mappa
   mostra fondo, acqua, verde, edifici, strade e i nomi di città, paesi e
   villaggi; non i nomi delle vie, i numeri civici e i punti d'interesse.
   Nessuno strato della mappa usa il giallo.

## Il logo e l'icona (TASK-159, ADR-0129)

Il segno è una S fatta come un percorso: un tratto solo, di spessore
costante, con gli angoli arrotondati, e un punto in alto a destra da cui
parte. Giallo `accent` su `background`, o nero su giallo. Il logo intero è
il segno seguito da «GRAVA» con lo stesso tratto, le due A senza trattino.
I vettoriali stanno in `docs/brand/` (`sgrava-mark.svg`, `sgrava-logo.svg`).

Sotto l'icona il nome è «Sgrava» (`name` in `app.json`). L'icona dell'app
è il segno giallo su nero (`assets/icon.png`, 1024 × 1024,
senza trasparenza). Su Android il segno sta nel cerchio sicuro dell'icona
adattiva, il fondo è nero e l'icona a un colore è il segno bianco. In Expo
Go sulla schermata di casa resta l'icona di Expo Go: la nostra si vede con
una build propria. Dentro l'app il nome in cima a «Draw» resta un testo.

**La schermata di avvio** (TASK-165, ADR-0134): fondo `background`, il logo
giallo al centro. Su iOS il logo intero, largo 260 punti
(`assets/splash-logo.png`); su Android il segno da solo
(`assets/splash-icon.png`), perché il sistema ritaglia l'immagine in un
cerchio. La genera il plugin `expo-splash-screen` da `app.json`: nessun
codice la tiene aperta, sparisce quando l'app è pronta. Come l'icona, si
vede solo in una build propria.

## Le due schermate

Due, senza librerie di navigazione (TASK-051, scelta dell'utente). La
prima ed «Explore» sono due delle tre pagine affiancate (sotto, «Le
pagine»):

1. **«What to draw»**, all'apertura: la pagina «Draw». Dall'alto: il nome
   «Sgrava» con il pulsante «Run without a route» (TASK-149, sotto); una
   scheda che dice da dove partirà il percorso,
   con, quando servono, il rimando alle Impostazioni e la ricerca del
   luogo; l'errore della mappa; le forme del catalogo come tessere, con un
   simbolo e il nome (quella scelta ha il bordo chiaro); il campo per
   un'altra parola; la distanza, grande, fra − e +. In fondo, fermo mentre
   il resto scorre, «Draw route».
2. **La mappa**, che si apre con «Draw route» e chiede il percorso. La
   mappa va da bordo a bordo, con «←» in alto a sinistra; sotto, una
   scheda con l'attesa, il risultato o il problema. All'apertura la mappa
   mostra l'Italia intera, poi la partenza con un segnaposto, a zoom 15
   (qualche via attorno); con un percorso, la linea e la mappa inquadrata
   su di lui. Si sposta e si ingrandisce con le dita o con i pulsanti + e
   −. L'attribuzione dei dati è sempre visibile in basso, per intero; i
   suoi link si aprono nel browser del telefono.

3. **«Explore»** (TASK-126, variante C di TASK-092), la pagina a destra
   di «Draw» (TASK-154): «Best near you», i percorsi
   migliori che partono entro 5 km dalla partenza scelta, con i filtri per
   forma o parola e per distanza. **I percorsi sono schede, due per riga**
   (TASK-167, ADR-0135, scelto dall'utente): in alto il disegno, largo
   quanto la scheda, giallo su fondo scuro, con la somiglianza in un angolo
   («97%»); sotto, forma e km («Star · 5.1 km») e città e distanza dalla
   partenza («Trento · 450 m away»). **I filtri stanno in una riga sola**:
   due pulsanti, «Shape: All ▾» e «Distance: All ▾», che dicono cosa
   tengono; toccato uno, sotto la riga si aprono le sue scelte («All»,
   «Star», «Circle»…, che scorrono di lato), e una scelta le richiude. Se ne
   apre uno alla volta; un filtro che tiene qualcosa ha il bordo chiaro. Se
   i due filtri insieme non lasciano niente: «No route here is both: change
   one of the two filters.». Toccata una scheda, il percorso si apre sulla
   mappa con «Export GPX» e «Back to the list»; «←» torna all'elenco. Da
   TASK-145 ha anche «Start» (sotto).

   Sopra l'elenco (TASK-129): **«City»**, il campo «Search a city» per
   qualsiasi città del mondo (l'elenco e la richiesta partono dal suo
   centro, «Change» torna alla partenza). **In fondo alla pagina**, sotto
   gli esempi della città e l'elenco (TASK-157, chiesto dall'utente): una
   riga discreta, «Ask for a route», grigia e sottolineata. Un tocco la
   apre lì dov'è, e la pagina scorre fino a lei: **«Ask for a route»**, una
   richiesta in parole («a romantic heart», «famous places in Paris,
   15 km») e «Make my route», giallo come «Draw route». Il percorso si
   apre sulla mappa coi luoghi: pallini chiari col nome quelli da cui
   passa, più tenui quelli trovati e non raggiunti (token `stop`). Sotto,
   km, forma, città, somiglianza, «Passes by N of the M … found» coi nomi,
   «Export GPX» e «Back to Explore». Se i luoghi verificati sono troppo
   pochi, la scheda lo dice.

   **Da TASK-134** il percorso è: città → categoria → percorso, due tocchi.
   «City» mostra in alto le città recenti (↺, le ultime 5, salvate sul
   telefono) e una fila di città di tutto il mondo (New York, London,
   Paris, Tokyo, Rome, Milan, Torino, Barcelona, Dubai…): un tocco la
   sceglie, il centro viene dall'API, mai scritto nell'app. Sotto, «Type a
   city» suggerisce le città mentre si scrive (da 2 lettere, pausa 250 ms);
   «My start» torna alla partenza. «Ask for a route» ha le categorie come
   pulsanti, Food per prima (Famous Places, Romantic, Best Views, Shopping,
   Culture, Nightlife, Hidden Gems, Running, Walking, Family, Photography,
   Local Experience), ognuna con «in <città>» sotto: un tocco chiede
   «Food in New York». Il campo libero resta, con un esempio per la città.
   Ciò che si tocca si attenua (opacità), niente si sposta.

   **Da TASK-138** il campo è «Type a city or a place»: a metà parola
   suggerisce città e luoghi (monumenti, piazze, quartieri, vie), al più 6,
   nell'ordine del servizio. Ogni voce ha due righe: il nome, e sotto
   «City centre · Veneto, Italy» per una città o la sua città per un luogo
   («Verona, Italy»). Invio sceglie il primo suggerimento. Scelto un luogo,
   le categorie dicono «near Verona Arena» e chiedono il tema dal suo punto
   (le parole sono solo «Food»); l'esempio del campo libero non nomina
   città.

   **Da TASK-143** «Ask for a route» mostra due categorie, Food e Famous
   Places, e una terza tessera «More…» («11 more») che apre tutte le 13;
   tre tessere per riga. Scelta una città senza percorsi consigliati entro
   5 km, sotto «City» compare **«EXAMPLES IN VERCELLI»**: cuore, cerchio e
   stella da 5 km dal centro, chiesti da soli, uno alla volta, il cuore per
   primo. Sono schede come quelle di «Best near you», due per riga
   (TASK-167): una scheda dice «Drawing…» o «Next» con il posto del
   disegno vuoto, poi ha il disegno, i km e la somiglianza; un tocco apre il
   percorso sulla mappa con «Export GPX» e «Back to Explore». Se la mappa
   della zona
   non si scarica, un messaggio solo e «Try again». Gli esempi pronti
   restano sul telefono (ultime 8 città): la volta dopo sono subito lì.
   Una città con percorsi consigliati mostra quelli e non chiede esempi.

   **Da TASK-163**, chiesto dall'utente: finché un esempio è «Next» o
   «Drawing…», sotto «EXAMPLES IN …» c'è **«MEANWHILE, FROM THE FEED»**,
   con una riga che dice perché si aspetta (la prima volta in una città la
   mappa si scarica: fino a un minuto) e 5 disegni del feed d'esempio
   (TASK-156), uguali a come sono in «Feed». Partono da un punto del feed
   che dipende dalla città: città diverse, disegni diversi per primi.
   Arrivato l'ultimo esempio i disegni restano, e la riga dice «The shapes
   of this city are ready above.»; spariscono cambiando città. Una città
   con gli esempi già sul telefono non li mostra. «Ask for a route» resta
   in fondo, sotto i disegni.

   **Da TASK-145** ogni percorso di «Explore» aperto sulla mappa
   (consigliato, esempio, a tema) ha «Start», giallo, sopra «Export GPX».
   Questi percorsi arrivano senza indicazioni: al tocco l'app le chiede
   all'API (`POST /route-directions`) e il pulsante dice «Getting
   directions…»; poi la navigazione parte come per un percorso disegnato
   (sotto, «La navigazione»), lungo la linea di «Explore». «Stop» e la fine
   della corsa tornano alla sua scheda. Le indicazioni avute restano finché
   la scheda è aperta: un secondo «Start» non aspetta. Se non arrivano, la
   scheda dice perché in rosso e «Start» riprova; «Back to the list» o «←»
   lasciano perdere l'attesa.

   **Da TASK-151** un esempio di città aperto sulla mappa ha le tessere
   «A · B · C» (sotto, «Il risultato»), sopra «Start», quando l'API ha
   mandato delle alternative: A è il percorso del motore. Una tessera
   toccata diventa il percorso: km e somiglianza della scheda, la linea
   sulla mappa, «Start» e «Export GPX» sono i suoi. Mentre si aspettano le
   indicazioni la scelta resta ferma. Da TASK-155 gli altri percorsi sono
   linee grigie sulla mappa, sotto quello scelto, e spariscono durante la
   corsa. Un percorso consigliato o a tema è uno
   solo: niente tessere. Gli esempi salvati prima si ridisegnano una volta.

Passare da una schermata all'altra:

- «←» torna alla scelta con forma e distanza di prima. Se il percorso è
  ancora in calcolo, lo abbandona, come «Cancel».
- «Cancel» torna alla scelta. Una forma toccata dopo un problema anche.
- «Try N km» ridisegna restando sulla mappa.
- «Draw route» con forma, distanza e partenza di un percorso già disegnato
  lo mostra di nuovo, senza chiederlo di nuovo all'API.

La mappa resta caricata anche sotto la prima schermata: andare e tornare
non la ricarica. La scheda sta sotto la mappa, non sopra, così non copre
l'attribuzione; i margini seguono la tacca e la barra in basso di ogni
telefono.

## Le pagine: «Feed», «Draw», «Explore» (TASK-154, ADR-0124)

Tre pagine affiancate, scelta dell'utente: **«Feed»** a sinistra,
**«Draw»** al centro, **«Explore»** a destra. Si passa dall'una all'altra
con uno swipe a destra o a sinistra, oppure toccando il nome in alto. I tre
nomi stanno in alto a sinistra, nell'ordine in cui sono le pagine: dicono
dove porta lo swipe. Il nome della pagina sullo schermo è chiaro, con una
lineetta sotto; gli altri sono grigi. Niente giallo: è del percorso.

- L'app si apre su «Draw». Forma, parola, distanza e partenza restano come
  erano dopo un giro sulle altre pagine.
- **«Feed»** è la pagina dei disegni che gli iscritti pubblicano
  (TASK-118). Finché non ci sono mostra **quindici disegni di esempio**
  (TASK-156, ADR-0127, chiesto dall'utente). Niente sulla pagina dice che
  sono esempi: scelta dell'utente. Ogni scheda ha l'iniziale e il nome di
  chi ha corso, la
  città, il disegno in giallo a tutta larghezza, il punteggio («98», «out
  of 100»), il titolo e una riga «Horse · 19.2 km · 1 h 41 min». Sono le
  figure venute meglio nelle sette città del catalogo, due per città e
  nessuna forma più di due volte; corridori, titoli, tempi e punteggi sono
  inventati. Le schede non si toccano: aprire un disegno arriva con
  TASK-118.
  **Sotto ogni linea c'è la mappa** della zona (TASK-162, ADR-0131,
  chiesto dall'utente): strade, acqua, verde e nomi dei paesi, con lo
  stile dell'app. È una foto, non una mappa da muovere: la fa una pagina
  MapLibre che l'elenco copre, una mappa alla volta, inquadrata come la
  linea; finché non arriva la scheda è la linea sul fondo scuro, e senza
  rete resta così. In basso a destra di ogni mappa il credito,
  «OpenFreeMap © OpenMapTiles / Data from OpenStreetMap», in due righe
  accanto al punteggio. Le foto fatte restano finché l'app è aperta.
- **«Explore»** chiede i suoi percorsi all'API la prima volta che ci si
  arriva, non all'apertura dell'app; tornandoci l'elenco è ancora lì. Non
  ha più «←»: per tornare c'è lo swipe, o il nome «Draw».
- La mappa, la corsa e la sua fine prendono tutto lo schermo: lì i nomi e
  lo swipe non ci sono. «←» da un percorso di «Explore» torna sulla pagina
  «Explore», da un percorso disegnato su «Draw».
- Uno swipe chiude la tastiera.
- Una pagina fuori dallo schermo non la legge nemmeno VoiceOver.
- **Da provare con il dito**: lo swipe stesso, e le righe che scorrono di
  lato dentro una pagina (le tessere delle forme, le città). L'attesa è
  che la riga scorra lei e che lo swipe fra le pagine parta da fuori; su
  Android non è stato provato niente.

## «Profile» (TASK-115, ADR-0125; TASK-154)

In alto a destra, accanto ai nomi delle pagine, un pulsante tondo apre
**«Profile»**, l'account: mostra l'iniziale di chi è entrato, o una
figura quando non c'è nessuno. «Profile» si apre sopra l'app e si chiude
con «←»: sotto, forma, distanza e mappa restano come erano. Sulla mappa e
durante la corsa il pulsante non c'è.

**«Profile» senza account**: «Sign up» e «Log in», due pulsanti affiancati.
«Sign up» chiede email, nome (da 3 a 20 fra lettere, cifre, `_` e `.`),
password (almeno 8 caratteri) e la casella «I am at least 16» (ADR-0114);
«Log in» email e password. I campi si controllano prima di partire, con le
regole dell'API, e l'errore si dice in parole sotto il pulsante (sotto,
«Quando non va»). Si apre su «Sign up»; dopo «Log out» o una sessione
finita, su «Log in».

**«Profile» con l'account**: «LOGGED IN AS», il nome e l'email; «Log out»;
«Delete account», in rosso, che chiede prima sulla schermata stessa:
«Delete my account» o «Keep my account». Nessun pulsante dell'account è
giallo.

- **Chiusa e riaperta**, l'app è già dentro: la sessione sta nel
  portachiavi del telefono. All'apertura chiede all'API (`GET /me`) se vale
  ancora; senza rete resta dentro.
- **Sessione finita** (90 giorni senza uso, o chiusa altrove), all'apertura
  o a una richiesta: l'app esce da sola, il pulsante di «Profile» ha un
  pallino arancio e «Profile» dice «Your session has ended. Log in
  again.». «Draw» va come prima.
- **«Log out»** esce subito, anche senza rete, e dice «You are logged out
  on this phone.».
- **«Delete account»** esce solo con il sì dell'API; se l'API non risponde
  l'account resta e la scheda dice perché. Fatto, dice «Your account and
  everything that was yours have been deleted.» e torna a «Sign up».
- **Senza account** si disegna, si esplora e si corre come prima: oggi
  nessun'altra richiesta vuole il token.

## La partenza

È un punto `(lat, lon)` con la sua origine, `gps` o `search`, e diventa lo
`start` del `RouteRequest`.

| Situazione | Riga di stato | Cosa c'è in più |
|---|---|---|
| In attesa del GPS | «Finding your position…» | — |
| GPS riuscito | «Starting from your position.» | — |
| Permesso negato | «Location is off for Sgrava…» | «Open Settings», ricerca |
| GPS spento, errore, nessuna risposta in 15 s | «Your position is not available right now…» | ricerca |
| «Another place», nessun luogo ancora | «Search for a city or street to start from.» | ricerca |
| Luogo scelto dalla ricerca | «Starting from Via Rodolfo Belenzani, Trento.» | ricerca, per cambiarlo |

La partenza si sceglie con due pulsanti affiancati nella scheda «START»
(TASK-054): **«My position»**, il GPS, e **«Another place»**, un luogo
cercato. Con «Another place» c'è la ricerca, e il luogo scelto resta la
partenza anche se il GPS risponde: si può partire da un'altra città con il
GPS acceso. «My position» torna al GPS, lo rilegge e chiede di nuovo il
permesso, se il telefono lo permette ancora; la ricerca sparisce. Senza GPS
(permesso negato, nessuna risposta) la ricerca c'è comunque, e il luogo
cercato fa da partenza finché il GPS non risponde. Ogni nuova partenza, anche nello stesso
punto, ricentra la mappa.

## Ricerca del luogo

- Compare solo quando la posizione manca. Campo «City or street», pulsante
  «Search» o invio della tastiera.
- I luoghi si suggeriscono **mentre si scrive** (TASK-085, ADR-0080): da 3
  lettere, 300 ms dopo l'ultima (`MIN_SUGGEST_LENGTH`,
  `SUGGEST_DELAY_MS` in `PlaceSearch.tsx`), non a ogni lettera: Photon
  chiede un uso corretto. «Search» e l'invio cercano subito, mai con il
  campo vuoto. I suggerimenti di prima restano finché arrivano i nuovi;
  sotto le 3 lettere spariscono. Una risposta si mostra se è più nuova di
  quella sullo schermo, anche con un'altra ricerca in corso (TASK-089,
  ADR-0083): Photon impiega 2–3 s.
- I luoghi li dà l'API (`GET /places`, Geoapify, TASK-123, ADR-0095); se
  l'API non c'è, non risponde entro 2,5 s o non ha la chiave, Photon come
  prima. Dopo un «non ho la chiave» l'API non si richiede fino al riavvio.
- Toccato un suggerimento, il campo ne prende il nome, la tastiera si
  chiude e l'elenco sparisce; la riga si illumina mentre è premuta.
- Con la posizione GPS nota (o l'ultimo luogo scelto), Photon riceve
  `lat`/`lon` e mette prima i luoghi attorno: «via bel» a Trento trova vie
  del Trentino, non del Brasile.
- Al massimo 5 risultati. Ognuno si legge come nome e prima area più ampia
  diversa dal nome: «Via Rodolfo Belenzani, Trento», «Levico Terme,
  Provincia di Trento». Le etichette uguali si mostrano una volta sola (una
  via spezzata in più tratti OSM torna una volta per tratto).
- Sotto i risultati, «© OpenStreetMap contributors».
- Nessun risultato: «No place found. Try adding the city.» Errore di rete o
  del servizio: «The search failed. Check the connection and try again.»

## Forma e distanza

Sopra, un interruttore **«Shape | Word | Image»** (TASK-057, ADR-0053;
«Image» dal TASK-073): il percorso disegna una forma del catalogo, una
parola **oppure** il contorno di un'immagine, mai due insieme, e
l'interruttore mostra quale. Di partenza «Shape». Passare dall'uno all'altro
non cancella quanto scritto o scelto negli altri.

La forma si sceglie toccando una tessera, che scrive il nome nel campo, o
scrivendo nel campo. I simboli delle tessere sono caratteri (♥ ★ ◯ ☾ e le
emoji di gatto, pesce, cavallo, farfalla, lumaca, cane, coniglio, zucca
e albero di Natale):
disegnare i contorni veri vuole `react-native-svg`, una dipendenza non
ancora chiesta.
Le tessere stanno in una riga sola che scorre di lato col dito (TASK-088,
ADR-0084, chiesto dall'utente): se ne vedono poco meno di quattro, e la
tessera tagliata sul bordo dice che ce ne sono altre. Una forma scritta nel
campo porta la sua tessera in vista.

La **forma** è una parola, in inglese o in italiano (ADR-0036). Le forme
sono quelle del catalogo, le sole che l'utente ha giudicato riconoscibili
sulle strade:

| Forma | Parole |
|---|---|
| `circle` | circle, ring, round · cerchio, anello, tondo |
| `heart` | heart, love · cuore, cuoricino, amore |
| `star` | star · stella, stellina |
| `horse` | horse, pony, stallion · cavallo, cavallino, stallone, puledro |
| `moon` | moon, crescent, crescent moon · luna, mezzaluna, falce di luna |
| `cat` | cat, kitty, kitten · gatto, gatta, gattino, micio |
| `fish` | fish · pesce, pesciolino |
| `butterfly` | butterfly · farfalla, farfallina |
| `snail` | snail · lumaca, lumachina, chiocciola |
| `dog_head` | dog, dog head, doggy, puppy · cane, cagnolino, testa di cane |
| `rabbit_head` | rabbit, rabbit head, bunny · coniglio, coniglietto, testa di coniglio |
| `pumpkin` | pumpkin, halloween pumpkin, jack-o'-lantern · zucca, zucca di halloween |
| `christmas_tree` | christmas tree, xmas tree · albero di natale, alberello di natale |

- Anche al plurale («stelle», «hearts»), con l'articolo («una stella»,
  «l'amore»), con maiuscole e accenti qualsiasi. La tabella sta in
  `shapeWords.ts`.
- Una parola che non è il nome della forma la conferma sotto il campo:
  «cavallo» mostra «→ horse».
- Le teste si chiamano `dog_head` e `rabbit_head` nel contratto, «dog
  head» e «rabbit head» sullo schermo: nelle tessere, nei messaggi, nel
  campo e nel nome del percorso (ADR-0061). «cane» e «dog» portano alla
  testa di cane, «coniglio» e «bunny» a quella di coniglio: gli animali
  interi non sono nel catalogo.
- «albero» e «tree» da soli **non** sono l'albero di Natale (ADR-0084): un
  albero qualsiasi non è nel catalogo, e resta «nessuna forma». Sullo
  schermo `christmas_tree` si legge «christmas tree».
- Il campo vuoto: «Unknown shape. Try: circle, heart, star, horse, moon,
  cat, fish, butterfly, snail, dog head, rabbit head, pumpkin or christmas
  tree.» e «Draw route» resta spento.
- Nel campo vuoto il suggerimento è «heart, star, horse…». Il campo
  accetta al massimo 60 caratteri.

Le **parole che la tabella non conosce** («stemma della Ferrari», «Nemo»)
le legge l'AI sul PC (ADR-0012, `AI.md`). La tabella viene sempre prima:
è immediata e non ha bisogno dell'AI.

| Quando | Sotto il campo | «Draw route» |
|---|---|---|
| Mentre si scrive | Press Done and the AI will read it. | spento |
| Dopo «Fine», o toccando fuori dal campo | The AI is reading it… | spento |
| L'AI trova una forma | → horse | acceso |
| L'AI non trova una forma | No shape in the catalogue for “Batman”. Describe what it looks like (“prancing horse”, not “Ferrari badge”), or pick one: (le tessere sono sopra il campo) | spento |
| L'AI non risponde (`ai_unavailable`) | The AI that reads shape words is not running on the PC (Ollama). These words work without it: circle, … | spento |

- Le parole partono quando la scrittura finisce («Fine» sulla tastiera, o
  un tocco fuori dal campo), non a ogni lettera: il modello impiega secondi
  e le parole a metà non servono.
- L'app ricorda le letture finché resta aperta: tornare sulle stesse parole,
  a meno di maiuscole e spazi, non le rimanda. Un errore invece non si
  ricorda: con «Fine» si riprova.
- Se l'API non si raggiunge, i messaggi sono quelli di «Quando non va».

La **parola** (con «Word») si scrive in un campo che va in maiuscole; al
posto delle tessere e del campo della forma. L'app la controlla prima di
mandarla, con le regole dell'API (`API.md`, «Una parola invece di una
forma»), e la manda come `word`, in maiuscole e senza `shape`:

| Quando | Sotto il campo | «Draw route» |
|---|---|---|
| Campo vuoto | Write a word to draw, with the letters A to Z. (grigio) | spento |
| Uno spazio in mezzo | One word only, without spaces. | spento |
| Una lettera fuori da A–Z | No letter “À”: a word can use only the letters A to Z, without accents. | spento |
| Più di 7 lettere | At most 7 letters: each needs 3 km, and the app goes up to 21 km. | spento |
| Meno di 3 km a lettera | “CIAO” needs at least 12 km: 3 km for each letter. e il tasto «Use 12 km» | spento |
| La parola va | 4 letters: at least 12 km. A word takes a few minutes to draw. | acceso |

Sotto la nota, **«LETTERS: Round | Square»** (TASK-080, ADR-0075): le
lettere di oggi o quelle squadrate, che nell'API sono `style: "block"`.
«Round» è la scelta all'avvio; con «Square» sotto compare, in grigio,
«Square letters follow the street grid: best for short words.». La scelta
va nella richiesta di ogni parola come `style` e non si salva fra un
avvio e l'altro.

- Le lettere sono `LETTERS` di `shared-types`; il contratto ne ammette 8
  (`MAX_WORD_LETTERS`), ma a 3 km l'una (`LETTER_DISTANCE_M`) l'ottava
  vorrebbe 24 km, oltre i 21 dell'app: il limite dell'app è 7.
- Gli accenti non si tolgono di nascosto: «città» dice quale lettera manca,
  come l'API.
- «Use 12 km» scrive la distanza minima nel campo dei km.
- Il campo accetta 20 caratteri, così oltre il limite si legge perché.
- Le regole stanno in `src/route/wordInput.ts`.

La **distanza** si scrive con il tastierino numerico (ADR-0034):

- interi o un decimale, con la virgola o con il punto: `7`, `7,5`, `7.5`;
  gli spazi attorno non contano. Al motore va in metri interi (7,5 km →
  7500);
- da 1 a **21 km**: il limite lo hanno deciso le misure (`API.md`, «Oltre
  15 km»), e sta in una costante dell'app (`MAX_APP_DISTANCE_KM`). Motore
  e contratto arrivano a 50 km;
- con un valore non valido, anche il campo vuoto, sotto compare «Enter a
  distance between 1 and 21 km.» e «Draw route» resta spento;
- sopra i 15 km, prima della richiesta: «Long routes take longer: up to a
  few minutes.»

Di partenza «heart» e 5 km. L'attività è sempre `running` e non si
mostra. − e + cambiano la distanza di 1 km, fermi fra 1 e 21; un valore fuori
dai limiti torna dentro, un testo che non è un numero riparte da 1. Il
tastierino numerico non ha il tasto invio: si chiude toccando «Draw
route»; quello della forma si chiude con «Fine». Mentre una tastiera è
aperta la schermata si accorcia perché non copra i campi.

### L'immagine (TASK-073)

Con «Image» due pulsanti: **«Choose picture»**, dalla libreria delle foto,
e **«Take photo»**, con la fotocamera (`expo-image-picker`). La libreria
non chiede permessi su iOS: il selettore di sistema consegna solo la foto
scelta. La fotocamera chiede il suo la prima volta. La foto arriva intera,
senza ritaglio quadrato: il soggetto vuole sfondo tutto intorno. iOS la
consegna in JPEG anche se è HEIC; un PNG trasparente perde la trasparenza.

Prima di scegliere, una riga dice cosa funziona: *One subject on a plain
background works best: a drawing, a logo, an object on a bare table. The
route follows its outside line. Up to 4 separate subjects are joined in one
line.*

La foto va all'API (`POST /image-outlines`, ADR-0069) e mentre il motore
ricava il contorno la riga dice *Tracing the outline…* (meno di 2 s). Poi
l'**anteprima**: la foto attenuata, e sopra il contorno in giallo, il
colore del percorso, perché è quello che il percorso disegnerà. Quello che
non è diventato linea resta visibile sotto: un dettaglio lisciato, una
macchiolina. Con più soggetti staccati, fino a 4 (TASK-084, ADR-0079),
ognuno ha la sua linea gialla, e un trattino giallo lo collega al più
vicino: il percorso lo fa andata e ritorno. Sotto, *The yellow line is what the route
will draw. If it does not look like the subject, the route will not
either: try another picture, or edit the outline. Separate subjects are
joined by a short line, which the route runs there and back.* e un link
«Hide the picture» che lascia solo la linea, come sarà sulla mappa: il
gatto di TASK-072 non si riconosceva già dal contorno, e senza la foto
sotto si vede. Un'immagine alta resta entro 320 punti d'altezza, così la
distanza resta a vista. La linea è fatta di rettangoli sottili ruotati,
senza SVG (`react-native-svg` non è una dipendenza dell'app).

**Modificare il contorno** (TASK-079, ADR-0074). Sotto l'anteprima,
**«Edit the outline»** apre una **lavagna a tutto schermo**: la foto
attenuata con il contorno, e sotto **«Add a part»**, **«Add a detail»**,
**«Undo»**; in alto «Done» per tornare e «Fit» quando la foto è ingrandita.
La lavagna sta fuori dalla pagina che scorre: mentre si disegna lo schermo
resta fermo (nella prima prova sull'iPhone l'anteprima, dentro la pagina,
scorreva col dito). L'anteprima nella pagina mostra soltanto.

- **Due dita** ingrandiscono (fino a 8 volte) e spostano la foto, sempre.
- **Un dito**, con «Add a part» o «Add a detail» acceso (giallo), disegna:
  la linea segue il dito, gialla e più sottile, e quando il dito si alza va
  all'API, che risponde con il contorno nuovo (*Adding the part…*). Se
  durante il tratto si appoggia un secondo dito, il tratto si lascia e si
  ingrandisce. Senza pulsante acceso, un dito sposta la foto ingrandita.
- Le linee restano larghe uguali a ogni ingrandimento; ingranditi si
  disegnano dettagli più fini.

Sopra i pulsanti una riga dice cosa fare:

- nessun pulsante: *Choose what to add. Two fingers zoom and move the
  picture.*
- parte: *Draw a closed shape. Across the yellow line it becomes part of
  the outline; anywhere else it is joined to the nearest yellow line.*
- dettaglio: *Draw a line anywhere: it is joined to the nearest yellow
  line, and the route runs along it and back. Close a loop to make an eye.*

Si disegna dove si vuole, anche dentro l'immagine: ciò che non tocca la
linea gialla il motore lo collega con un trattino nel punto più vicino. Le linee
possono incrociarsi e uscire dal contorno.

I dettagli si vedono gialli come il contorno. «Undo» toglie l'ultima
modifica, fino al contorno ricavato dalla foto; è spento finché non c'è
niente da togliere. «Choose another» riparte da capo. Se l'API rifiuta la
linea, al posto della riga il motivo, con sotto il testo del motore:

| `reason` | Messaggio |
|---|---|
| `short` | This line is too short to add. Draw a longer one. |
| `covers_detail` | This part covers where a detail starts. Undo the detail first, or draw the part elsewhere. |
| `too_many_corners` | That is too much for one route. Undo something, or draw simpler lines. |

«Draw route» si accende solo con un contorno: il percorso si chiede come
per una forma, con la distanza del campo sotto, e manda il contorno
dell'anteprima, con i dettagli disegnati (`POST /image-route-jobs`). «Choose another» sostituisce la
foto; annullare il selettore lascia quella di prima. Sotto la distanza del
risultato si legge «Picture · on roads · target 15 km».

Se l'immagine è rifiutata, al posto dell'anteprima il motivo in parole
semplici, con sotto il testo del motore:

| `reason` | Messaggio |
|---|---|
| `background` | The background is too busy. Use one subject on a plain background, like a drawing on white paper or an object on a bare table. |
| `no_subject` | Nothing stands out from the background. Use a subject much darker or brighter than what is around it. |
| `scattered` | The picture shows more than 4 separate things. Use a picture with 4 subjects at most. |
| `edge` | The subject touches the edge of the picture. Leave some background all around it. |
| `small` | The subject is too small. Get closer, or use a bigger picture. |
| `jagged` | The outline is too jagged to run on roads. Try a simpler subject. |
| `format` | Only PNG and JPEG pictures work. Choose another one. |
| `unreadable` | This picture could not be read. Choose another one. |
| fotocamera negata | The camera is off for this app. Allow it in Settings, or choose a picture instead. |
| oltre 10 MB | This picture is too large: 12.3 MB, at most 10 MB. Choose a smaller one. |

## Chiedere un percorso

«Draw route» è spento finché non c'è una partenza. Toccato, la richiesta va
all'API in due tempi (ADR-0032): l'API la accetta subito, poi l'app chiede
ogni 2 s a che punto è. La scheda dice cosa sta succedendo e offre «Cancel»;
sotto, una barra gialla che avanza (TASK-055, ADR-0050). L'API dice la fase,
non una percentuale, quindi la barra è una stima: ogni fase ha il suo
tratto (in coda fino all'8%, download della zona fino al 45%, calcolo fino
al 95%) e lo percorre al ritmo dei tempi misurati qui sotto, rallentando
verso la fine senza superarlo. Non torna mai indietro, e si riempie solo
quando arriva il percorso. Se una fase dura più del doppio del solito
(anche la prima risposta dell'API, che di solito arriva in pochi secondi),
la barra pulsa: si sta ancora aspettando (TASK-058, ADR-0055).

La stessa barra, con la stessa regola, compare anche nelle altre attese:
sotto «The AI is reading it…» mentre l'AI legge le parole (di solito 20 s,
fino a 50 s se deve caricare il modello), e al centro della mappa mentre MapLibre e
le prime tessere si caricano (di solito 5 s): solo la prima volta, finché la
pagina non dice `loaded`; se la mappa non si carica, al suo posto l'errore.

| Stato dell'API | Il pannello dice |
|---|---|
| richiesta partita, o in coda | «Waiting for the API…» |
| zona da scaricare | «Downloading map data for this area…» |
| calcolo | «Drawing a 15 km heart…», per una parola «Drawing “CIAO”, 12 km…» |

Forma e distanza non si cambiano durante l'attesa.

- Fino a 10 km il percorso di solito arriva in 5–35 s, da 15 a 21 km in
  30–50 s; una zona nuova aggiunge il suo download, circa 105 s per un
  21 km (`API.md`, «Tempi»).
- Dopo 5 minuti l'app smette di aspettare e dice all'API di lasciar
  perdere.
- Due errori di rete di fila durante l'attesa si perdonano; al terzo l'app
  dice che l'API non si raggiunge.
- Una parola chiede più tempo di una forma: 40–140 s per «CIAO» a 15 km,
  fino a 258 s per «BELLO» (`API.md`). Per una parola la barra stima il
  calcolo dalle lettere, circa 20 s l'una, mai meno di una forma della
  stessa distanza (TASK-069, ADR-0064); pulsa oltre il doppio di quella
  stima (ADR-0055), per «CIAO» dopo 160 s.
- «Cancel» interrompe l'attesa e dice all'API di lasciar perdere: una
  richiesta in coda non parte, una in download si ferma prima di calcolare.
- Una partenza, una forma, una parola o una distanza nuove tolgono il percorso e
  l'esito di prima.

## Il risultato

Sulla mappa la linea del percorso, inquadrata. Sotto, la distanza in grande
(«4.0 km») e, dopo il nome del percorso, «heart · on roads · target 5 km»
o «“CIAO” · on roads · target 12 km» (TASK-057); poi gli avvisi del motore, uno per
riga, e «Export GPX» largo (sotto, «Export del GPX»).

**Più percorsi fra cui scegliere** (TASK-093, ADR-0087, scelte
dell'utente): quando l'API manda delle alternative, sotto il nome ci sono
fino a tre tessere «A · B · C», con km e somiglianza in percento
(«4.0 km · 91%»); A è il percorso scelto dal motore ed è selezionata. Sulla
mappa il percorso selezionato è giallo, gli altri sono linee sottili grigie
sotto (`otherRoute` nei token); una tessera toccata diventa il percorso:
distanza, avvisi, «Start» e «Export GPX» sono i suoi. Durante la corsa le
linee grigie spariscono. Un nuovo risultato riparte da A. Con un percorso
solo, niente tessere, come prima.

Gli avvisi sono **in parole semplici** (TASK-054, ADR-0048): l'app
riconosce i testi che il motore scrive e li riscrive brevi, con una
striscia arancio (`warning`) per quelli a cui fare attenzione (scale,
strade principali, gallerie, forma poco fedele, pochi tratti di strada) e
grigia per quelli da sapere (partenza spostata, distanza diversa da quella
chiesta, strade ripercorse); prima quelli a cui fare attenzione, e la
stessa frase una volta sola. Un testo che l'app non conosce resta com'è,
in inglese. La somiglianza non si mostra come
numero, tranne nelle tessere dei percorsi alternativi, dove serve a
confrontarli (TASK-093, scelta dell'utente): la forma la giudica l'occhio
(`PRODUCT.md`), e sotto 0,90 il motore aggiunge già un avviso. Il segnaposto resta sulla partenza chiesta.
Se il percorso comincia a più di 50 m da lì, perché il motore ha spostato la
forma dove ci sta (fino a 2 km, ADR-0040), un secondo segnaposto ciano con
l'etichetta «Start here» segna dove andare, e la mappa inquadra tutti e due;
l'avviso dice di quanto e in che direzione.

## La navigazione

Sotto il risultato, «Start» giallo, quando il percorso ha le indicazioni di
svolta (TASK-049, ADR-0052). Anche sotto un percorso di «Explore», che le
chiede all'API al tocco (TASK-145). Si resta sulla schermata della mappa: al posto
di «←» un banner con la prossima svolta (freccia gialla, distanza dal GPS
dal vivo, «Turn left onto Via Roma», e una seconda riga per le svolte a
pochi metri da leggere insieme); sotto la mappa i numeri della corsa e
«Stop», che torna al risultato. La mappa segue la posizione, vicina (zoom
17), e dopo «Stop» inquadra di nuovo il percorso.

**I numeri della corsa** (TASK-164, ADR-0133), chiesti dall'utente: uguali
con un percorso e senza. Sotto la mappa i km fatti in grande, due decimali
(«2.34 km»), e tre riquadri: «Avg pace» (il passo medio, «5:21», /km),
«Pace now» (il passo degli ultimi 200 m) e «Time», che va avanti ogni
secondo dalla prima posizione del GPS. I passi compaiono dopo 100 m, prima
c'è «–»; «Pace now» torna «–» anche da fermi (più lenti di 20:00 /km).
Con un percorso, accanto ai km, «3.2 km to go» e «about 17 min» (i km
rimasti al passo medio), e sotto una barra gialla con la parte di percorso
fatta; all'arrivo il tempo si ferma. Sotto il banner della svolta due
etichette piccole: «42% drawn», quanta parte del disegno è fatta, e il
punto cardinale verso cui si corre («NE»). Poi «Pocket» e «Stop», larghi
uguali.

**La freccia di direzione** (TASK-164). Mentre si corre il segnaposto sulla
mappa è una freccia chiara, girata dove si sta andando; la mappa resta col
nord in alto. La direzione viene dalla traccia, dagli ultimi 10 m: serve
qualche passo perché compaia (prima c'è il segnaposto di sempre), e da
fermi resta quella di prima. A fine corsa torna il segnaposto.

Ogni svolta si dice a voce 50 m prima, in inglese come il resto dell'app
(«In 50 metres, turn left onto Via Roma, then turn right onto the
footpath»), con una vibrazione. Una via senza nome è «the footpath», «the
path», «the road»: mai un nome inventato. Se accanto corre una via con nome
(dedotta dall'API, ADR-0057), la si dice con «beside»: «Turn left onto the
footpath beside Via Roma», sul banner e a voce (ADR-0058). Oltre 40 m dal percorso per almeno
tre posizioni di fila e 8 secondi il banner diventa arancio, «Off the
route», e la voce lo dice una volta, con una vibrazione; il percorso non si
ricalcola. Il marciapiede opposto e un GPS che sbaglia per qualche secondo
non bastano, e una posizione con un errore dichiarato oltre 40 m non conta;
una via parallela sbagliata sì (ADR-0070). Dopo due posizioni di fila sul
percorso, «Back on the route». Alla fine, «You have arrived». Funziona con lo schermo
acceso e l'app aperta; la posizione non esce dal telefono.

**Modalità tasca** (TASK-070, ADR-0066). Accanto a «Stop», «Pocket»: lo
schermo diventa nero, la luminosità va al minimo e resta acceso, e i tocchi
non fanno niente; voce, vibrazione e GPS vanno avanti come prima. Si esce
tenendo premuto lo schermo 2 secondi: in basso, fioca, «Hold for 2 seconds
to leave pocket mode», e «Keep holding…» mentre si preme. La prima volta
per avvio dell'app un avviso, «Pocket mode», con «Cancel» e «Go dark»: «The
screen goes dark but stays on, so directions go on. Do not lock the phone:
if you press the side button, directions stop. To come back, hold the
screen for 2 seconds.» La luminosità torna com'era all'uscita, all'arrivo
(che toglie anche il pulsante), con «Stop» e quando l'app esce dal primo
piano.

**La traccia della corsa** (TASK-112, ADR-0091). Durante la navigazione
l'app tiene la linea di quello che si è corso: ogni posizione del GPS,
tranne quelle con errore oltre 40 m e quelle a meno di 5 m dalla
precedente, con distanza e durata. Anche in modalità tasca. La traccia sta
in un file nei documenti dell'app (`current-run.json`), insieme al percorso
pianificato: si scrive alla prima posizione, poi al più ogni 15 secondi, a
«Stop» e all'arrivo, e resta lì se l'app viene chiusa. Una corsa per volta:
«Start» sullo stesso percorso entro 30 minuti continua la traccia, un altro
percorso la sostituisce alla prima posizione. Sullo schermo non cambia
niente, e la traccia non esce dal telefono: la usa la schermata di fine
corsa (TASK-113).

## La fine della corsa

«Stop» durante la navigazione, o «Finish» all'arrivo (lo stesso pulsante),
chiude la corsa e apre la schermata di fine corsa (TASK-113, ADR-0093), se
la traccia ha almeno due posizioni; se no si torna al risultato come
prima. Sulla mappa il percorso giallo e, sopra, più sottile e chiara
(`track` nei token), la linea di quello che si è corso. In alto «Your run»
con la legenda «Yellow: the route. White: what you ran.». Sotto, il
punteggio in grande («91», «out of 100») e una riga «4.0 km · 32 min · 97%
of the route»: distanza e durata della corsa, e quanta parte del percorso
è stata coperta. Il punteggio lo calcola l'API (`POST /track-scores`);
nell'attesa «Scoring your run…», con distanza e durata già lì.

- **Senza rete o senza API**: «The score will come later», la corsa resta
  nel file sul telefono, «Try again» la richiede. Anche con «Done» la
  corsa resta: alla prossima apertura l'app si apre su questa schermata e
  chiede di nuovo il punteggio.
- **Corsa troppo corta**: «Too short for a score».
- **«Keep running»**, dopo uno «Stop» e con il percorso ancora sullo
  schermo: torna alla navigazione, e la traccia continua (ADR-0091).
- **«Done»**: torna al risultato, o alla prima schermata se il percorso
  non c'è più. Con il punteggio arrivato, o la corsa troppo corta, la
  traccia si cancella dal telefono: salvarla è di TASK-117.

Il punteggio non è giallo: il giallo resta del percorso e dell'azione
principale.

## Correre senza percorso (TASK-149, ADR-0122)

**«Run without a route»**, in alto nella pagina «Draw» accanto a «Sgrava»,
fa partire una corsa senza disegnare niente: niente forma, niente percorso,
niente API. La scritta è per intero (TASK-158, chiesto dall'utente): «Run» da
solo si leggeva come correre il percorso scelto sotto. Si apre la mappa, che segue la posizione come in navigazione (zoom
17) e disegna la linea corsa fin lì, sottile e chiara (`track`), con la
freccia di direzione della navigazione. Senza percorso non ci sono svolte
da dire: al posto di «←» un banner con il punto di partenza (TASK-164,
ADR-0133), cioè una freccia azzurra, il colore della partenza, la distanza
in grande («1.2 km») e «Your start, in a straight line»; sotto, «Heading
north-east». La freccia è come la vede chi corre: in su vuol dire davanti,
in giù alle spalle. A meno di 30 m dalla partenza, «You are at your start»
senza freccia. Prima della prima posizione, «Finding your position…»; senza
permesso, «Location is off for Sgrava: allow it in Settings to record a
run.». Sotto la mappa i numeri della corsa, gli stessi della navigazione
(km, «Avg pace», «Pace now», «Time»); accanto ai km, dal primo km in poi,
«Last km» e il passo dell'ultimo km intero («5:14 /km»). Poi «Pocket» (la
stessa modalità tasca della navigazione) e «Stop». A ogni km la voce, in
inglese come il resto,
dice il tempo e il passo medio: «1 kilometre. Time: 5 minutes 42 seconds.
Average pace: 5 minutes 42 seconds per kilometre.» (oltre l'ora, ore e
minuti). Anche in modalità tasca; niente vibrazione, che in navigazione
vuol dire una svolta. «Keep running» non ripete i km già detti.

La traccia è quella della navigazione (ADR-0091), con le stesse regole,
nello stesso file `current-run.json`, con il percorso vuoto: resta se
l'app si chiude, e una corsa per volta (una nuova sostituisce quella nel
file alla prima posizione).

**«Stop»** apre la fine della corsa: in alto «Your run» e «White: what you
ran.»; sotto i km in grande e «25:00 · 5:56 /km». Senza forma non c'è
punteggio, e niente va all'API. **«Keep running»** torna alla corsa, con la
stessa traccia; **«Done»** torna alla prima schermata e cancella la corsa
dal telefono. Uno «Stop» prima della prima posizione torna subito alla
prima schermata. Se l'app si chiude durante la corsa, alla riapertura si
apre su questa schermata; «Keep running» c'è solo se l'ultima posizione è
di meno di 30 minuti prima.

## Correre con Strava (TASK-135, ADR-0106)

Sotto «Export GPX», in ogni scheda di un percorso (disegnato, di «Explore»,
a tema), **«Run with Strava»** apre una scheda che spiega prima di fare
qualunque cosa: Strava non permette ad altre app di aggiungere percorsi,
e nulla va a Strava finché l'utente non carica il file. Tre passi:
1. «Save GPX»: l'esportazione di sempre (foglio di condivisione).
2. «Open Strava route builder»: `https://www.strava.com/maps/create`, dove
   si accede, si carica il GPX e si salva il percorso.
3. «Open Strava»: l'app se c'è (link universale), altrimenti il sito; lì
   Record → Add Route → il percorso → Start.
Se un link non si apre, la scheda lo dice con l'indirizzo da aprire a mano.

## Export del GPX

«Export GPX» chiede il file all'API e apre il foglio di condivisione di
iOS: File, AirDrop, Mail, le app di corsa (`GPX.md`, «Dal telefono»).
Mentre l'API prepara il file il pulsante dice «Preparing GPX…». Se
l'utente chiude il foglio senza scegliere, non succede niente. Un errore
compare sotto il pulsante, con i messaggi di «Quando non va»; in più:

| Caso | Messaggio |
|---|---|
| Il telefono non ha il foglio di condivisione | This phone cannot open the share sheet. |
| Il file non si salva sul telefono | The GPX could not be saved on the phone. Try again. |

Un percorso nuovo toglie l'errore dell'export di prima.

## Quando non va

Un messaggio per caso, con sotto il testo dell'API quando aiuta:

| Caso | Messaggio |
|---|---|
| Forma che non ci sta, con una distanza che ci sta (`shape_not_drawable`, ADR-0041) | This shape does not fit the roads here at this distance. It fits at about 4 km. e un pulsante «Try 4 km» che scrive la distanza e ridisegna |
| Forma che non ci sta, senza distanza (somiglianza bassa, o distanza oltre 21 km) | This shape does not fit the roads here. Try another shape, or another start: e le forme del catalogo come pulsanti |
| Contorno di un'immagine che non ci sta (TASK-073) | come per la forma, con «This image…»; senza distanza: This outline does not fit the roads here. Try another distance, another start, or a simpler picture. (niente forme da toccare) |
| Parola che non ci sta (TASK-057) | come per la forma, con «This word…»; senza distanza: This word does not fit the roads here. Try a shorter word, or another start. (niente forme da toccare) |
| Dati OSM non scaricabili (`map_data_unavailable`) | Map data for this area could not be downloaded. Try again later. |
| Errore del motore (`engine_error`) | The route engine failed. Try again; if it happens again, look at the API log. |
| L'AI non risponde (`ai_unavailable`) | The AI that reads shape words is not running on the PC (Ollama). These words work without it: circle, heart, star, horse, moon, cat, fish, butterfly, snail, dog head, rabbit head, pumpkin or christmas tree. |
| `invalid_request`, `http_error`, risposta illeggibile | The app and the API do not agree (a bug): … |
| API non raggiungibile | Cannot reach the API at http://…:8000. Start it on the PC with --lan, on the same Wi-Fi. |
| Nessun risultato in 5 minuti | The API took more than 5 minutes. Try again later, or a shorter distance. |
| L'API non conosce più la richiesta (riavviata) | The API lost this request (was it restarted?). Try again. |
| Indirizzo dell'API sconosciuto | The app does not know where the API is: open it from the QR code of npm run mobile on the PC. |
| Account: email già usata (`email_taken`, TASK-115) | This email already has an account. Log in instead. |
| Account: nome già usato (`username_taken`) | This username is taken. Try another one. |
| Account: email o password sbagliate (`wrong_credentials`) | Wrong email or password. |
| Account: troppi tentativi (`too_many_requests`, con `Retry-After`) | Too many tries. Wait 10 minutes and try again. (al minuto intero; sotto il minuto, «Wait a minute») |
| Account: sessione scaduta o chiusa (`session_expired`, `not_signed_in`) | Your session has ended. Log in again. |
| Account: l'API non ha un database (`accounts_unavailable`) | Accounts are not available on this API: it has no database. |
| Account: API non raggiungibile | Cannot reach the API at http://…:8000. Check the connection and try again. |
| Account: un campo che l'API rifiuterebbe | il primo che non va: Enter an email address, like name@example.com. · A username is 3 to 20 letters, digits, _ or . (no spaces). · A password is at least 8 characters. · You must be at least 16 to sign up. |

## Cosa esce dal telefono

- **La partenza**: va all'API sul PC, in rete locale, con forma e
  distanza. Se la zona non è in cache, il PC la scarica da Overpass, che
  vede quale area si chiede. Il log dell'API non la scrive (TASK-091,
  ADR-0092: prima il motore scriveva le partenze vicine provate); dice
  solo quale zona in cache ha letto, un riquadro largo chilometri. Resta
  scritta solo nel **registro delle richieste**, e solo se chi avvia l'API
  lo accende (`--request-log`, spento per default; TASK-090, ADR-0085): un
  file sul computer dell'API, `data/requests/requests.jsonl`, con partenza,
  distanza, forma, parola o contorno dell'immagine di ogni richiesta, per
  poterla rifare (`API.md`). Mai la foto, mai la chiave. Non entra nel
  repository, non torna al telefono, non va a nessun servizio; al massimo
  10 MB, poi le righe vecchie si perdono. Per cancellarlo basta cancellare
  il file.
- **Le parole della forma** che la tabella non conosce: vanno all'API sul
  PC, e da lì al modello in Ollama, sullo stesso PC. Non escono dalla rete
  di casa; il log dell'API le scrive, con la forma scelta.
- **La foto scelta per «Image»** (TASK-073): va all'API sul PC, in rete
  locale, una volta; l'API non la salva e non la scrive nel log. Poi viaggia
  solo il contorno. Non va a nessun servizio esterno né all'AI.
- **Le tile**: il provider vede quale zona si guarda, come con ogni mappa.
  Da TASK-162 anche le zone dei disegni di «Feed», a ogni apertura
  dell'app: sono le città degli esempi, uguali per tutti, non la posizione
  di chi guarda.
- **La ricerca**: il testo cercato e la posizione (per mettere prima i
  luoghi vicini) vanno all'API, che li gira a Geoapify (TASK-123); senza
  API o senza chiave, a Photon (komoot). Il log dell'API scrive solo
  `GET /places`, né testo né posizione (TASK-124, ADR-0096).
- **La libreria**: MapLibre GL JS arriva da unpkg a ogni avvio a freddo.
- **L'account** (TASK-115): email, nome e password vanno all'API solo con
  «Sign up» e «Log in». Il telefono tiene la sessione, cioè il token e
  l'utente (numero, email, nome, ruolo), nel portachiavi
  (`expo-secure-store`, ADR-0125); mai la password. Il token va all'API
  solo con le richieste dell'account (`GET /me`, `DELETE /session`,
  `DELETE /me`), in `Authorization`.

## Quando la mappa non si carica

La pagina avvisa l'app se lo script di MapLibre non arriva (anche con un
hash SRI che non torna), se lo stile non è valido, o se non arriva la
descrizione delle tile di OpenFreeMap (la TileJSON): lo stile è nella
pagina, ma senza di lei la mappa resta vuota. Una tile mancante, dopo, non
è un errore. L'app mostra «The map could not load (motivo).
Check the connection and reopen the app.» invece di uno schermo bianco. Se
iOS chiude la pagina per liberare memoria, la WebView la ricarica da sola.

## Domande ancora aperte

- Cosa proporre quando l'AI non trova una forma: TASK-031.
- Forme nuove nel catalogo: si disegnano, si provano e si giudicano prima
  di entrare (ADR-0036).
- Distanze oltre i 21 km: aspettano un download delle zone più veloce
  (ADR-0009).
- Miglia al posto dei km.
- Avvisi in parole semplici: oggi l'app riconosce i testi del motore
  (ADR-0048); la strada pulita sono i codici negli avvisi del contratto.
- Rigenerare altri percorsi oltre a quelli proposti (scegliere fra quelli
  calcolati c'è da TASK-093).
- Contorni disegnati delle forme e cursore della distanza: vogliono
  dipendenze (TASK-051).
