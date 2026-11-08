# DECISIONS — Registro delle decisioni

Una voce per decisione, **mai cancellata**. Se una decisione viene
ribaltata, la vecchia voce passa a `Superata da ADR-00XX` e se ne aggiunge
una nuova: sapere cosa si è provato e perché è stato abbandonato vale
quanto sapere cosa si usa oggi.

Formato: contesto in una riga, decisione, motivo, conseguenza.

Stati: `Attiva` · `Aperta` (da decidere) · `Superata`

**Non si legge intero**: si cerca con grep per numero, per esempio
`grep -n "ADR-0300" docs/DECISIONS.md docs/archive/*.md`, e si legge solo
la voce trovata.

Le voci fino al 2026-11-08 sono intere in
`docs/archive/DECISIONS-fino-al-2026-11.md` (congelato). Qui restano
l'**Indice**, una riga per voce (titolo · data · stato), e le **Voci
nuove**, intere. Una voce archiviata che passa a «Superata» non si tocca: si
aggiorna la sua riga d'indice e lo dice la voce nuova. A ogni cambio di mese
il Coordinatore sposta le voci nuove in `docs/archive/DECISIONS-<anno>-<mese>.md`,
lasciando le righe d'indice.

---

## Indice

- ADR-0001 — L'AI non genera percorsi · 2026-09-22 · Attiva
- ADR-0002 — Route engine separato dal backend · 2026-09-22 · Attiva
- ADR-0003 — Sviluppo per fasi guidate dal rischio · 2026-09-22 · Attiva
- ADR-0004 — Task piccoli, un branch e una PR ciascuno · 2026-09-22 · Attiva
- ADR-0005 — Documentazione stratificata · 2026-09-22 · Attiva
- ADR-0006 — Gli stub si riempiono quando arriva il loro task · 2026-09-22 · Attiva
- ADR-0007 — Lingua: documentazione in italiano, codice in inglese · 2026-09-22 · Attiva
- ADR-0008 — OSMnx per la fase 1 · 2026-09-22 · Attiva
- ADR-0009 — Motore di routing di produzione · Aperta
- ADR-0010 — Metrica di somiglianza · 2026-09-23 · Superata da ADR-0023 (e ADR-0025)
- ADR-0011 — Provider di mappe e tiles · 2026-09-23 · Superata da ADR-0029
- ADR-0012 — Provider e modello AI · 2026-09-24 · Attiva
- ADR-0013 — Database, hosting e autenticazione · 2026-10-01 · Superata da ADR-0114 (scelte dell'utente) e ADR-0115 (come)
- ADR-0014 — I GPX di prova si versionano · 2026-09-22 · Attiva
- ADR-0015 — Repository pubblico · 2026-09-22 · Attiva
- ADR-0016 — Contratto e CLI del route-engine senza dipendenze runtime · 2026-09-22 · Attiva
- ADR-0017 — `n_points` conta i vertici, la chiusura è in più · 2026-09-22 · Attiva
- ADR-0018 — Proiezione: piano tangente locale, fase continua, rotazione antioraria · 2026-09-22 · Attiva
- ADR-0019 — Export GPX dentro il route-engine, solo libreria standard · 2026-09-22 · Attiva
- ADR-0020 — Grafo stradale: cache locale, area della forma, penalità fissa · 2026-09-22 · Attiva
- ADR-0021 — Solo `osmnx` come dipendenza; potatura degli speroni · 2026-09-22 · Attiva
- ADR-0022 — Zone e corridoio al posto del nodo più vicino; rete con le ciclopedonali · 2026-09-22 · Attiva
- ADR-0023 — Un grafo per zona; somiglianza = copertura del contorno · 2026-09-23 · Attiva
- ADR-0024 — Anteprima dei campioni: pagina HTML con Leaflet e tile OSM · 2026-09-23 · Attiva
- ADR-0025 — Regole dell'ottimizzatore dopo i giudizi a occhio · 2026-09-23 · Attiva
- ADR-0026 — Validazione del percorso e potatura delle punte parallele · 2026-09-23 · Attiva
- ADR-0027 — Cancello di fase 1 superato con la valle sospesa · 2026-09-23 · Attiva
- ADR-0028 — Monorepo npm, app Expo, tipi condivisi scritti a mano · 2026-09-23 · Attiva
- ADR-0029 — Mappa dell'app in WebView, posizione GPS, ricerca del luogo · 2026-09-23 · Attiva
- ADR-0030 — API FastAPI sul route-engine, grafi di zona in memoria · 2026-09-23 · Attiva
- ADR-0031 — L'app chiede i percorsi all'API: indirizzo, attesa, errori · 2026-09-23 · Attiva
- ADR-0032 — Richieste in due tempi: accettata subito, chiesta finché è pronta · 2026-09-23 · Attiva
- ADR-0033 — Il GPX per il telefono lo scrive l'API, con l'export del motore · 2026-09-23 · Attiva
- ADR-0034 — La distanza si scrive in km, fino a 21 km nell'app · 2026-09-23 · Attiva
- ADR-0035 — Forme da un contorno in un file, per ora solo dalla CLI · 2026-09-24 · Attiva
- ADR-0036 — Catalogo delle forme: solo quelle giudicate a occhio, scritte in un riquadro · 2026-09-24 · Attiva
- ADR-0037 — La somiglianza resta com'è; l'orientamento conta per l'occhio · 2026-09-24 · Attiva
- ADR-0038 — Le forme restano dritte, tranne il cerchio · 2026-09-24 · Attiva
- ADR-0039 — Tratti ripassati: linee e anelli dentro la forma · 2026-09-24 · Attiva
- ADR-0040 — Trova dove la forma ci sta: una seconda ricerca fino a 2 km · 2026-09-24 · Attiva
- ADR-0041 — Quando la forma non ci sta, proporre la distanza che ci sta · 2026-09-24 · Attiva
- ADR-0042 — Scritte: una linea chiusa percorsa così com'è · 2026-09-24 · Attiva
- ADR-0043 — Percorso aperto: andata e ritorno pianificati, tenuta l'andata · 2026-09-24 · Attiva
- ADR-0044 — Parole lettera per lettera: alfabeto a tratto singolo, lettere che si spostano · 2026-09-24 · Attiva
- ADR-0045 — Indicazioni di svolta: dagli incroci del grafo, non dalle curve · 2026-09-24 · Attiva
- ADR-0046 — Tema Sgrava: i token in un file, lo stile della mappa nostro · 2026-09-24 · Attiva
- ADR-0047 — Indicazioni nell'API: lista piatta, partenza prima, vicine segnate · 2026-09-24 · Attiva
- ADR-0048 — Avvisi del motore in parole semplici, riconosciuti dall'app · 2026-09-24 · Attiva
- ADR-0049 — Il modello dell'AI si carica all'avvio dell'API, in background · 2026-09-24 · Attiva
- ADR-0050 — Barra di caricamento: una stima per fasi, mai oltre la fase · 2026-09-24 · Attiva
- ADR-0051 — La parola nell'API: `word` accanto a `shape`, una delle due · 2026-09-24 · Attiva
- ADR-0052 — Navigazione nell'app: il percorso già disegnato, seguito col GPS · 2026-09-25 · Attiva
- ADR-0053 — La parola nell'app: un interruttore «Shape | Word», controllata prima di mandarla · 2026-09-25 · Attiva
- ADR-0054 — Marciapiedi senza nome: la via lungo cui corrono, dedotta a parte · 2026-09-25 · Attiva
- ADR-0055 — La barra in ogni attesa, e pulsa quando l'attesa si allunga · 2026-09-25 · Attiva
- ADR-0056 — Alfabeto dalla A alla Z: 26 maiuscole a tratto singolo, E ed L staccate dalla base · 2026-09-25 · Attiva
- ADR-0057 — `along` nell'API e nei tipi condivisi · 2026-09-25 · Attiva
- ADR-0058 — `along` nella navigazione: «beside», mai «onto» · 2026-09-25 · Attiva
- ADR-0059 — Corridoio più veloce, a percorsi identici · 2026-09-25 · Attiva
- ADR-0060 — Animali candidati: la sagoma nel contorno, i dettagli sottili ripassati · 2026-09-25 · Attiva
- ADR-0061 — Farfalla, lumaca, testa di cane e di coniglio nel catalogo; «dog head» sullo schermo · 2026-09-26 · Attiva
- ADR-0063 — Lettere unite anche dalla cima: tre regole di lettura, la parola più corta · 2026-10-02 · Attiva
- ADR-0064 — La barra stima una parola dalle sue lettere · 2026-09-25 · Attiva
- ADR-0065 — Testa di cane: orecchie che pendono, occhi, naso e bocca ripassati · 2026-09-25 · Attiva
- ADR-0067 — Parole: il ritorno sulle strade dell'andata, provato e scartato · 2026-09-26 · Scartata
- ADR-0068 — Il contorno ricavato da un'immagine, con regole fisse · 2026-09-25 · Attiva
- ADR-0069 — L'immagine nell'API: base64 in JSON, anteprima, poi il contorno · 2026-09-26 · Attiva
- ADR-0070 — «Off the route» dopo più posizioni e qualche secondo, non dopo una · 2026-09-25 · Attiva
- ADR-0072 — Lettere squadrate: un secondo alfabeto, girato sulla griglia delle vie · 2026-09-26 · Attiva
- ADR-0071 — Partenze vicine: tre nodi entro 100 m in parallelo, si tiene il cuore migliore · 2026-09-26 · Attiva
- ADR-0073 — Coniglio, zucca e albero di Natale: candidate come la testa di cane · 2026-09-26 · Attiva
- ADR-0076 — API da fuori casa: chiave, limite, indirizzo nell'app, Docker · 2026-09-26 · accettata
- ADR-0077 — Un avviso sconosciuto arriva con la prima lettera maiuscola · 2026-09-26 · Attiva
- ADR-0066 — Modalità tasca: schermo acceso ma nero, invece della posizione in background · 2026-09-26 · Attiva
- ADR-0074 — Modificare il contorno di un'immagine: parti e dettagli disegnati col dito · 2026-09-28 · Attiva
- ADR-0075 — Lo stile delle lettere nella richiesta e nell'app · 2026-09-28 · Attiva
- ADR-0078 — L'app pubblicata con EAS Update, aperta da Expo Go · 2026-09-28 · accettata
- ADR-0079 — Più soggetti in una foto: fino a 4, appesi con un collegamento nel punto più vicino · 2026-09-30 · Attiva
- ADR-0081 — Comandi più visibili: bordo e fondo schiariti nei token · 2026-09-30 · Attiva
- ADR-0080 — I luoghi suggeriti mentre si scrive · 2026-09-30 · Attiva
- ADR-0082 — Il ritaglio della zona rifatto a mano, nello stesso ordine · 2026-09-30 · Attiva
- ADR-0083 — Suggerimenti dei luoghi: risposte intermedie e tocco che chiude · 2026-09-30 · Attiva
- ADR-0090 — Il punteggio di una corsa: somiglianza del percorso per fedeltà · 2026-09-30 · Attiva
- ADR-0085 — Il registro delle richieste dell'API, spento per default · 2026-09-30 · Attiva
- ADR-0091 — La traccia della corsa: registrata nella navigazione, in un file · 2026-09-30 · Attiva
- ADR-0092 — Nessuna posizione nel log dell'API · 2026-09-30 · Attiva
- ADR-0093 — Il punteggio a fine corsa: l'API lo calcola, l'app tiene la corsa · 2026-09-30 · Attiva
- ADR-0086 — Tutti i percorsi generati si salvano, i migliori si consigliano · 2026-10-01 · Attiva
- ADR-0095 — I luoghi da Geoapify, attraverso l'API · 2026-10-01 · Attiva
- ADR-0096 — Nessuna query string nel log di accesso dell'API · 2026-10-01 · Attiva
- ADR-0097 — Il seme del catalogo dei percorsi consigliati · 2026-10-01 · Attiva
- ADR-0098 — «Explore» dal catalogo, prima del database · 2026-10-01 · Attiva
- ADR-0087 — Più percorsi fra cui scegliere: le partenze vicine non si buttano · 2026-10-01 · Attiva
- ADR-0099 — Una forma che passa dai luoghi veri di un tema, in ogni città · 2026-10-01 · Attiva
- ADR-0100 — Overpass dall'indirizzo che risponde · 2026-10-01 · Attiva
- ADR-0101 — Le ricerche insegnano, ma solo con una firma · 2026-10-01 · Attiva
- ADR-0102 — Un annuncio AdMob fra «percorso pronto» e «percorso mostrato» · 2026-10-01 · Attiva
- ADR-0104 — I file della cache delle zone si scrivono interi o non si scrivono · 2026-10-01 · Attiva
- ADR-0105 — «Explore»: città → categoria → percorso · 2026-10-01 · Attiva
- ADR-0106 — Strava: il flusso ufficiale, senza account collegato · 2026-10-01 · Superata da ADR-0138
- ADR-0107 — Il cuore evita i «baffi»: le strade fatte due volte costano · 2026-10-01 · Attiva
- ADR-0108 — La CLI non salva più i ritagli dei grafi · 2026-10-01 · Attiva
- ADR-0109 — Anche cerchio e stella evitano i «baffi» · 2026-10-01 · Attiva
- ADR-0110 — «Explore»: città e luoghi mentre si scrive · 2026-10-01 · Attiva
- ADR-0111 — Il server a pagamento: quale, e la configurazione in `deploy/` · 2026-10-01 · Attiva
- ADR-0112 — Le ricerche imparano anche da cosa fa l'app · 2026-10-01 · Attiva
- ADR-0114 — La parte social: le scelte dell'utente · 2026-10-01 · Attiva
- ADR-0115 — Database, account e server: come · 2026-10-01 · Attiva
- ADR-0116 — «Explore»: due categorie, ed esempi disegnati subito per una città · 2026-10-01 · Attiva
- ADR-0117 — «Start» sui percorsi di «Explore»: le indicazioni dai punti · 2026-10-01 · Attiva
- ADR-0084 — Zucca e albero di Natale nel catalogo; «albero» da solo resta fuori · 2026-09-30 · Attiva
- ADR-0118 — I baffi delle altre forme: solo quelli oltre i tratti voluti · 2026-10-02 · Attiva
- ADR-0119 — Le zone delle città scaricate prima, sul server dell'app · 2026-10-02 · Attiva
- ADR-0121 — Su Linux la memoria per le partenze vicine è MemAvailable · 2026-10-02 · Attiva
- ADR-0120 — Account nell'API: endpoint, errori, tentativi, test · 2026-10-02 · Attiva
- ADR-0122 — Correre senza percorso: «Run» registra solo la traccia · 2026-10-02 · Attiva
- ADR-0123 — Il database sul server, e le sue copie sul Mac · 2026-10-02 · Attiva
- ADR-0125 — L'account nell'app: due schede, la sessione nel portachiavi, l'uscita · 2026-10-02 · Attiva
- ADR-0126 — «Explore»: gli esempi di una città con le alternative A · B · C · 2026-10-02 · Attiva
- ADR-0124 — Tre pagine affiancate con lo swipe, al posto delle schede in basso · 2026-10-02 · Attiva
- ADR-0127 — «Feed» con quindici esempi dal catalogo, finché non pubblicano gli iscritti · 2026-10-02 · Attiva
- ADR-0129 — Il logo: una S fatta come un percorso, l'icona dell'app e il suo nome · 2026-10-02 · Attiva
- ADR-0131 — La mappa sotto i disegni di «Feed» è una foto, fatta da una pagina nascosta · 2026-10-02 · Attiva
- ADR-0134 — La schermata di avvio: `expo-splash-screen`, logo su nero · 2026-10-02 · Attiva
- ADR-0130 — Nel catalogo solo parole corte · 2026-10-02 · Attiva
- ADR-0132 — «Explore»: i disegni del feed mentre una città si disegna, e le città in evidenza già nel catalogo · 2026-10-02 · Attiva
- ADR-0133 — La schermata della corsa: gli stessi numeri con un percorso e senza, e una freccia di direzione dalla traccia · 2026-10-02 · Attiva
- ADR-0135 — «Explore» a schede: due per riga, e i filtri in una riga sola · 2026-10-02 · Attiva
- ADR-0136 — Gli esempi di una città restano sull'API una volta disegnati · 2026-10-02 · Attiva
- ADR-0138 — Niente «Run with Strava»: da un percorso si esce con il GPX · 2026-10-02 · Attiva
- ADR-0137 — La corsa: conto alla rovescia, due pagine, pausa, «Stop» da tenere premuto e tutti i numeri che il telefono sa misurare · 2026-10-02 · Attiva
- ADR-0139 — «Favorites»: una copia del percorso, legata all'account · 2026-10-02 · Attiva
- ADR-0141 — La musica nella corsa: «Music» apre Spotify, Sgrava non suona niente · 2026-10-02 · Attiva
- ADR-0143 — La mappa senza pulsanti di zoom: si ingrandisce solo con le dita · 2026-10-02 · Attiva
- ADR-0142 — La mappa anche sotto le schede di «Explore», con un credito solo · 2026-10-02 · Attiva
- ADR-0147 — L'animazione all'avvio: un componente sopra l'app, il cuore del video sul giallo · 2026-10-02 · Attiva
- ADR-0140 — «My activities»: «Save» a fine corsa, e i numeri della corsa li conta l'API · 2026-10-02 · Attiva
- ADR-0148 — Una zona tiene ogni pezzo della sua rete, e dove non ci sono strade il motore lo dice · 2026-10-02 · Attiva
- ADR-0151 — Un disegno di «Feed» si apre come un percorso di «Explore», e il suo percorso si ritrova dalla partenza · 2026-10-02 · Attiva
- ADR-0145 — «Profile»: emoji per le voci, due riquadri con il numero, l'account in «Settings» · 2026-10-02 · Attiva
- ADR-0144 — «Explore»: niente filtri, altre forme dopo le prime tre, «Near me» al posto di «My start» · 2026-10-02 · Attiva
- ADR-0152 — «Sport» in «Settings»: un elenco nell'app, la scelta sul telefono, «Soon» finché il motore non c'è · 2026-10-02 · Attiva
- ADR-0153 — La rete della bici: strade e ciclabili, sensi unici rispettati, una cache sua · 2026-10-02 · Attiva
- ADR-0155 — «Explore»: il luogo scelto ha i suoi percorsi, quelli dei vicini stanno sotto · 2026-10-02 · Attiva
- ADR-0156 — «Send to Strava»: il collegamento passa dal server, e la corsa tiene cosa ne ha fatto Strava · 2026-10-02 · Attiva
- ADR-0146 — La foto del profilo: un quadrato di 256 px fatto dall'API, cambiato da «Settings» · 2026-10-02 · Attiva
- ADR-0154 — Sull'acqua la forma è il percorso: la fascia entro 1 km dalla riva, la ricerca di dove ci sta, la partenza dalla riva dove si arriva a piedi · 2026-10-02 · Attiva
- ADR-0157 — La penna alzata: indici dei tratti a piedi in `points`, non pezzi separati · 2026-10-02 · Attiva
- ADR-0158 — La penna alzata nelle corse salvate e nei preferiti: una colonna `walks`, e una richiesta rifiutata si rimanda come prima · 2026-10-02 · Attiva
- ADR-0128 — Il profilo: `PATCH /me` per nome e bio, `GET /users/{public_id}` con un id casuale, mai l'email · 2026-10-02 · Attiva
- ADR-0159 — Pubblicare una corsa salvata: una tabella `drawings`, 200 m tagliati lungo la traccia, mai il percorso pianificato agli altri · 2026-10-03 · Attiva
- ADR-0160 — L'attività nei preferiti e le pause nel dettaglio di una corsa: una colonna con le attività dell'API, un rimando solo come prima · 2026-10-02 · Attiva
- ADR-0162 — Ciò che il motore tiene per grafo vale finché NetworkX non cambia il grafo · 2026-10-03 · Attiva
- ADR-0161 — La canoa nel motore: 1–5 km, 200 m dalla riva al mare, solo forme del catalogo, la validazione sull'acqua · 2026-10-03 · Attiva
- ADR-0163 — La grafica della corsa in corso: il numero prima del nome, pulsanti tondi con icone disegnate, barre grigie per i km · 2026-10-03 · Attiva
- ADR-0164 — La canoa nell'API: l'acqua nella cache del server, nessuna indicazione né alternativa, la distanza suggerita per difetto al mezzo km · 2026-10-03 · Attiva
- ADR-0165 — Lo sport accanto al profilo: un pulsante tondo con l'emoji, un menu sotto di sé, la stessa scelta di «Settings» · 2026-10-03 · Attiva
- ADR-0166 — Pubblicare una corsa, l'app: la scelta dopo la corsa, una coda sua senza rete, il disegno sulla mappa come una corsa · 2026-10-03 · Attiva
- ADR-0167 — La bici a mano: brevi tratti a piedi nella rete della bici, a sei volte il costo · 2026-10-03 · Attiva
- ADR-0168 — La foto dal cerchio di «Profile»: un «+» bianco, le scelte di «Settings» in un riquadro sopra «Edit profile» · 2026-10-03 · Attiva
- ADR-0169 — La canoa nell'app: solo forme, da 2 km, «Start» senza indicazioni dietro l'avviso della prima volta, «Explore» con i luoghi d'acqua · 2026-10-03 · Attiva
- ADR-0171 — La voce della corsa in cinque lingue: le frasi dette in `src/voice/`, una tabella per lingua, la scelta in «Data» · 2026-10-03 · Attiva
- ADR-0172 — La lingua dell'app: l'inglese resta la base e la chiave, la lingua del telefono alla partenza, nessuna dipendenza · 2026-10-03 · Attiva
- ADR-0173 — Seguire con richiesta, l'API: una tabella `follows` con due stati, la ricerca per nome, gli elenchi solo propri · 2026-10-03 · Attiva
- ADR-0174 — Il logo dopo «Save»: il giallo e il logo dell'avvio, 1,65 s, sopra l'app, anche senza rete · 2026-10-03 · Attiva
- ADR-0175 — I commenti: legati al disegno, chi lo vede li legge, in un foglio dal basso aperto dal disegno · 2026-10-03 · Attiva
- ADR-0176 — Nessun commento negativo: un elenco di parole nell'API, rifiutato con un avviso · 2026-10-03 · Attiva
- ADR-0178 — «Find friends» in cima a «Feed»: la ricerca degli iscritti in una pagina sopra l'app · 2026-10-03 · Attiva
- ADR-0177 — Il motore sul telefono: Pyodide nella WebView, le zone come dati, il server come riserva · 2026-10-03 · Attiva
- ADR-0170 — Pubblicare come su Strava, l'API: chi lo vede in tre valori, una domanda sola per saperlo, foto in posti fissi, campi nuovi che un'app di prima non cancella · 2026-10-03 · Attiva
- ADR-0181 — Le immagini ufficiali di Strava: il pulsante «Connect with Strava» e «Compatible with Strava» dal pacchetto di Strava, mai ridisegnate · 2026-10-03 · Attiva
- ADR-0182 — «Find friends» è solo una lente; inviti, contatti e Facebook a tappe, Strava no · 2026-10-03 · Attiva
- ADR-0179 — La navigazione in bici: km/h, la voce ogni 10 km, svolte e tratti a mano detti 100 m prima · 2026-10-03 · Attiva
- ADR-0183 — «Run without a route» è giallo · 2026-10-03 · Attiva
- ADR-0185 — Le forme a pezzi: un file solo, con la penna alzata o giù · 2026-10-03 · Attiva
- ADR-0184 — Il cuore su giallo, segno di Sgrava: il cuore dell'avvio, fermo, in un quadrato giallo, un componente solo · 2026-10-03 · Attiva
- ADR-0186 — Correndo un percorso: il fatto giallo pieno, il da fare tratteggiato che lampeggia · 2026-10-03 · Attiva
- ADR-0187 — L'acqua della canoa da un estratto Geofabrik: un riquadro grande per luogo, `route_engine` invariato · 2026-10-03 · Accettato
- ADR-0191 — Dalla lavagna del contorno si esce con «Save», in fondo · 2026-10-04 · Attiva
- ADR-0192 — L'acqua da Overpass con `out body geom`: i membri delle relazioni, quindi i laghi multipoligono · 2026-10-04 · Accettato
- ADR-0189 — «Explore» con «Paddle»: le otto forme della corsa, e gli esempi dei quattro luoghi dentro l'app · 2026-10-04 · Accettato
- ADR-0193 — Le reazioni ai disegni pubblicati, e il super like di Sgrava con un commento · 2026-10-04 · Attiva
- ADR-0194 — Il post di una corsa: un'immagine fatta dall'app, Instagram dal foglio di condivisione, Strava come testo · 2026-10-04 · Accettato
- ADR-0180 — Il confronto dei km nella voce: i secondi della fine corsa, una frase a parte, in bici ogni 10 km senza numeri · 2026-10-05 · Attiva
- ADR-0188 — Gli occhi staccati sull'acqua: i pezzi piazzati col contorno, lasciato dove sono più vicini, e la distanza di tutto il percorso · 2026-10-05 · Accettato
- ADR-0195 — Le forme si inclinano fino a 45°, e la mappa gira perché si vedano dritte · 2026-10-05 · Accettato; motore e API fatti (parte A),
- ADR-0197 — «Viene meglio a N km»: la distanza consigliata anche quando la forma riesce · 2026-10-05 · Accettato; motore e API fatti (parte A),
- ADR-0199 — Seguire nell'app: il tasto sul profilo di un altro, tre numeri in «Profile» con i loro elenchi · 2026-10-05 · Attiva
- ADR-0190 — Il «Feed» sull'acqua: quattro post che leggono gli esempi dentro l'app · 2026-10-05 · Accettato
- ADR-0196 — «Explore» della canoa come la corsa: l'elenco dei laghi dentro l'app, il più vicino per primo, forme più corte sui laghi piccoli · 2026-10-05 · Accettato
- ADR-0198 — La pubblicità fra i post del «Feed»: un annuncio nativo ogni 5 post, niente più annuncio alla ricerca · 2026-10-05 · Accettato
- ADR-0201 — Il sito web: una pagina statica in `site/`, e il merch venduto da un servizio di stampa su ordinazione · 2026-10-05 · Attiva
- ADR-0200 — I paesi vicini sotto «Near me»: quattro paesi e i due posti più vicini, dal Places di Geoapify, con i campioni chiesti dal telefono · 2026-10-05 · Accettato
- ADR-0204 — Con «Paddle», i laghi e le spiagge nella ricerca di «Another place»: dall'elenco dentro l'app, sopra i luoghi trovati · 2026-10-05 · Attiva
- ADR-0202 — Spostare la figura sull'acqua: l'utente dice «vicino a dove», il motore decide il posto · 2026-10-05 · Accettato
- ADR-0207 — Niente punteggio sopra il disegno dei post del «Feed» · 2026-10-05 · Accettato
- ADR-0203 — Le richieste di follow si vedono da fuori: un numero rosso sul pulsante di «Profile», e «Follow back» nella riga accettata · 2026-10-05 · Attiva
- ADR-0150 — Cambiare email e numero di telefono: l'email con la password e senza mail di conferma, il numero privato e non provato · 2026-10-05 · Attiva
- ADR-0208 — Con la penna alzata, la deviazione di un pezzo si cammina invece di disegnarla · 2026-10-05 · Attiva
- ADR-0149 — Le unità di misura: km o miglia scelti in «Settings», l'unità del telefono alla partenza, la conversione solo dove si mostra · 2026-10-05 · Attiva
- ADR-0205 — «Help», «Terms», «Privacy»: i testi come dati in inglese e italiano, una pagina sopra «Settings», e le bozze che dicono di esserlo · 2026-10-05 · Attiva
- ADR-0206 — I due interruttori delle notifiche: salvati nell'account, spenti all'inizio, e niente si manda ancora · 2026-10-05 · Attiva
- ADR-0210 — Le spiagge di «Paddle»: i paesi scelti dall'utente, il punto della riva dai dati, un riquadro d'acqua a paese · 2026-10-05 · Attiva
- ADR-0149 — aggiornamento (parte C): la corsa e la voce in miglia · 2026-10-05 · Attiva
- ADR-0211 — Le figure «Paddle» dei tre posti più vicini si disegnano prima, in un file loro sul telefono · 2026-10-05 · Attiva
- ADR-0149 — aggiornamento (parte B): «Draw» in miglia · 2026-10-05 · Attiva
- ADR-0149 — aggiornamento (ultimo passo): l'app segue l'unità del telefono, e «Share» è nell'unità scelta · 2026-10-05 · Attiva
- ADR-0149 — aggiornamento (parte E): la distanza di «Draw» la tiene `App.tsx`, come testo scritto o metri scelti dall'app · 2026-10-07 · Attiva
- ADR-0210 — aggiornamento (parte B): una parola comune scritta sceglie fra i nomi trovati · 2026-10-05 · Attiva
- ADR-0210 — aggiornamento (parte C): 38 posti di mare in più · 2026-10-09 · Attiva
- ADR-0209 — Con la penna alzata, sul contorno si camminano solo i baffi · 2026-10-05 · Attiva
- ADR-0212 — La CI ha un tempo massimo per job e dice dove un test si è fermato · 2026-10-06 · Attiva
- ADR-0215 — Con «Paddle» la velocità è in km/h e l'andatura è il tempo di 500 m · 2026-10-06 · Attiva
- ADR-0212 — aggiornamento (parte B): le partenze vicine senza `multiprocessing.Pool` · 2026-10-06 · Attiva
- ADR-0213 — Un luogo ha un punto solo: il suo nodo `place` di OpenStreetMap · 2026-10-06 · Accettato
- ADR-0216 — Le code sul telefono: una copia accanto al file, un tempo massimo alle richieste dell'account, una corsa rifiutata non ferma le altre · 2026-10-06 · Attiva
- ADR-0217 — La posizione sul percorso preferisce il passaggio vicino, l'arrivo vuole due posizioni, la navigazione riprende da dove era · 2026-10-06 · Attiva
- ADR-0217 — aggiornamento: nessun rientro più avanti, chi sbaglia strada disegna un'alternativa · 2026-10-06 · Attiva
- ADR-0221 — Una corsa rifiutata resta sul telefono con il motivo; il telefono pieno lo dice invece di lasciarne andare una · 2026-10-06 · Attiva
- ADR-0219 — La corsa tiene lo schermo acceso, l'app in secondo piano è una pausa, niente calorie fuori dalla corsa · 2026-10-06 · Attiva
- ADR-0220 — Gli errori parlano a chi corre: il dettaglio tecnico solo in sviluppo, «Try again» dove la richiesta può andare, uno schermo giallo al posto di quello bianco · 2026-10-06 · Attiva
- ADR-0218 — Le correzioni piccole della revisione: tolleranza ai 5xx e a quello che l'app non conosce, posizione arrotondata dove è solo «qui vicino» · 2026-10-06 · accettata
- ADR-0222 — Il post condiviso resta sul server: emoji, risultati e titolo con la corsa, mai l'immagine · 2026-10-06 · Accettato
- ADR-0214 — Un lago che la mappa segna come stagno entra nell'elenco di «Paddle» scritto come lago nel suo file d'acqua, senza cambiare il motore · 2026-10-06 · Attiva
- ADR-0223 — «Open Settings» accanto a ogni permesso negato, e il «Retry» di «Draw» monta di nuovo la mappa · 2026-10-06 · Attiva
- ADR-0224 — L'app si chiama «MuW» · 2026-10-06 · Attiva
- ADR-0225 — La corsa registra anche a telefono bloccato: «While using», la pillola blu, e la linea si taglia solo se iOS congela l'app · 2026-10-08 · Attiva
- ADR-0227 — Il feed vero, versione semplice · 2026-10-08 · Attiva
- ADR-0229 — «Recommended»: prima il disegno, poi le reazioni, poi le corse · 2026-10-08 · Attiva
- ADR-0230 — La ricerca lontana parte solo dove vicino non si disegna niente · 2026-10-08 · Attiva
- ADR-0231 — Tono scuro o chiaro, con la luminosità in cinque passi · 2026-10-08 · Attiva
- ADR-0233 — La build dello store ha il runtime dal fingerprint, Expo Go resta su `exposdk:57.0.0` · 2026-10-08 · Attiva
- ADR-0234 — Il dominio getmuw.app: si resta su Hetzner, l'API anche su api.getmuw.app · 2026-10-08 · Attiva
- ADR-0232 — Il tipo di mappa: Standard, Satellite, 3D in un solo stile · 2026-10-09 · Attiva
- ADR-0211 — aggiornamento (parte B): il server tiene le figure «Paddle» dei laghi e delle spiagge · 2026-10-09 · Attiva
- ADR-0215 — aggiornamento (parte C): in bici senza percorso, la velocità · 2026-10-09 · Attiva
- ADR-0235 — Il tour del primo avvio sulle schermate vere, e «Guide» in «Profile» · 2026-10-09 · Attiva
- ADR-0197, aggiunta — Il «Try» della riga si conta come `better_distance` · 2026-10-09 · Attiva
- ADR-0137, aggiunta — Su «Data» scorrono solo i numeri · 2026-10-09 · Attiva
- ADR-0237 — La build dello store senza AdMob: niente codice nativo con APP_VARIANT=production · 2026-10-09 · Attiva
- ADR-0228 — Segnalare e bloccare: due tabelle, un blocco nei due sensi, nessun pannello · 2026-10-09 · Attiva
- ADR-0225, aggiunta — La voce parla a telefono bloccato, col silenzioso, e abbassa la musica · 2026-10-10 · Attiva
- ADR-0226 — Le notifiche push partono: Expo, un token per telefono, il permesso solo dall'interruttore · 2026-10-08 · Attiva
- ADR-0052, aggiunta — Dopo un'assenza del GPS il corridore si cerca su tutto il percorso avanti · 2026-10-10 · Attiva
- ADR-0239 — «Paddle»: i posti suggeriti dalla zona di casa, calcolata sul telefono, e il filtro «Lakes» / «Sea» · 2026-10-10 · Attiva
- ADR-0226, aggiunta — Gli amici dalla rubrica: hash dei numeri, confrontati e mai tenuti · 2026-10-10 · Attiva
- ADR-0120, aggiunta — Il database dei test se ne va col suo volume · 2026-10-10 · Attiva
- ADR-0228, aggiunta — Segnalare un commento e bloccare chi l'ha scritto · 2026-10-11 · Attiva
- ADR-0240 — La corsa interrotta si riapre in pausa · 2026-10-10 · Attiva
- ADR-0241 — Una forma chiusa si comincia dove la si raggiunge · 2026-10-10 · Attiva
- ADR-0243 — Le foto dei paesi vicini: l'immagine di Wikidata, tenuta sul nostro server · 2026-10-11 · Attiva
- ADR-0144, aggiunta — Le parole di una città, dopo le sue forme · 2026-10-13 · Attiva
- ADR-0244 — L'email di ritorno a chi non apre l'app da 14 giorni · 2026-10-11 · Attiva
- ADR-0245 — «Draw on the map»: la figura sulla mappa la misura l'app, il percorso lo fa il motore · 2026-10-13 · Attiva
- ADR-0246 — Sotto «Draw» i giri a tema e dodici sagome pronte, col contorno già nell'app · 2026-10-13 · Attiva
- ADR-0247 — A fine corsa l'app ricorda lo stretching, con «Skip» · 2026-10-13 · Attiva
- ADR-0248 — Una sola coda per le richieste di percorso dell'app, e un annullo vero sul telefono · 2026-10-16 · Attiva
- ADR-0249 — Le ricerche dell'API più veloci: gzip, Geoapify in parallelo, indici e anteprime nel database · 2026-10-16 · Attiva
- ADR-0250 — Una riga di tempi per ogni job di percorso, e il bytecode nell'immagine · 2026-10-16 · Attiva
- ADR-0251 — Ogni segnalazione arriva per email, con un link firmato che nasconde · 2026-10-17 · Attiva
- ADR-0252 — La partenza scelta sulla mappa, con il segnaposto fermo al centro · 2026-10-18 · Attiva
- ADR-0225, aggiunta — Su Android la corsa registra e parla a schermo bloccato, in un servizio con la sua notifica · 2026-10-23 · Proposta
- ADR-0254 — Il video di una corsa: fatto sul telefono nel WebView, H.264 con WebCodecs, MP4 scritto dall'app · 2026-10-23 · Attiva
- ADR-0255 — Il gioco delle forme: regole sul server, pagina «Play» accesa dall'API · 2026-10-23 · Attiva
- ADR-0256 — Tutti i percorsi disegnati restano nel database, e una richiesta entro 100 m riceve quello pronto · 2026-10-24 · Attiva
- ADR-0257 — Il piazzamento imparato da una ricerca vicina: misurato e scartato · 2026-10-24 · Scartata (misurata)
- ADR-0258 — Le immagini con la penna alzata: i soggetti staccati e i fori sono pezzi · 2026-10-24 · Attiva
- ADR-0045, aggiunta — Si dice «u-turn» anche dove si torna indietro fuori da un incrocio · 2026-10-10 · Attiva
- ADR-0259 — Fermarsi prima nella ricerca: misurato e scartato; resta solo il tracciamento mai ripetuto · 2026-10-25 · Scartata (misurata), tranne una regola piccola
- ADR-0040, aggiunta — Un contorno che cade su un nodo solo non si disegna, e la ricerca va avanti · 2026-10-11 · Attiva
- ADR-0253 — MuW su Google Play: un pacchetto sul dominio, le push con Firebase, il test chiuso prima della pubblicazione · 2026-10-25 · Proposta
- ADR-0226, aggiunta — L'email delle notifiche: un riassunto al giorno · 2026-10-25 · Attiva
- ADR-0047, aggiunta — L'app dice come una sola le svolte di un incrocio attraversato a piedi · 2026-10-25 · Attiva
- ADR-0260 — Il primo concorso: il post con più reazioni vince un premio senza valore, deciso dal server · 2026-10-24 · Attiva
- ADR-0261 — Email confermata e «Forgot password?», con link firmati · 2026-10-25 · Attiva
- ADR-0262 — La musica nel video della corsa: dieci brani nostri, scritti da uno script, copiati nel MP4 come traccia AAC · 2026-10-25 · Attiva
- ADR-0269 — Le corse di gruppo: una forma, un ritrovo, un'ora, «I'm going» · 2026-10-26 · Attiva
- ADR-0237, aggiunta — AdMob mai collegato su Android · 2026-10-26 · Attiva
- ADR-0266 — Forme pronte vicino a te in «Draw», ed «Explore» preparato all'apertura · 2026-10-26 · Attiva
- ADR-0263 — Dopo una deviazione la corsa rientra più avanti, e mostra dove riprende il percorso · 2026-10-26 · Attiva
- ADR-0269, aggiunta — Come l'API delle corse di gruppo tiene le regole · 2026-10-27 · Attiva
- ADR-0270 — pytest fermato sotto la 9.2 finché i test confrontano liste con un solo `approx` · 2026-10-27 · Accettata
- ADR-0271 — Le parole misurate su 1000 casi, e sul server tutto quello che si chiede · 2026-10-27 · Proposta (parte A misurata il 2026-10-28)
- ADR-0267 — Correre il disegno di un altro: la traccia tagliata come percorso, senza svolte, e il GPX scritto sul telefono · 2026-10-26 · Attiva
- ADR-0264 — La corsa continua mentre si usa un'altra app: dieci minuti di assenza sono corsa · 2026-10-26 · Attiva
- ADR-0265 — Il parapendio come sport di MuW: una forma nel cono di planata, esportata allo strumento di volo, mai guidata in volo · 2026-10-26 · Proposto
- ADR-0268 — «Send feedback» in «Settings»: un modulo nell'app, tenuto dal server e mandato per email · 2026-10-26 · Attiva
- ADR-0275 — Le foto di un post si scorrono nella scheda del Feed, dopo il disegno · 2026-10-28 · Accettata
- ADR-0276 — Explore pronto prima: il telefono prende solo i disegni che il server ha già · 2026-10-27 · Attiva
- ADR-0274 — Fuori percorso, la strada per tornarci sulle vie, come un ricalcolo · 2026-10-28 · Attiva (parte A in `main` con la #588; parte B da fare)
- ADR-0273 — «Draw it near me»: la forma o la parola di un percorso o di un disegno scelte in «Draw», alla stessa distanza · 2026-10-27 · Attiva
- ADR-0272 — Attività fatte con altre app: un file letto sul telefono, segnato «Imported», fuori dal gioco e dal concorso; e i post di sole foto · 2026-10-28 · Proposta
- ADR-0271 — aggiunta, parte B: «Lift the pen» quando la riga non riesce · 2026-10-28 · Attiva
- ADR-0277 — L'attesa in «Draw»: un testo da corridore e i disegni del Feed, senza rete · 2026-10-28 · Attiva
- ADR-0280 — Disegnare a mano in «Draw», e ogni figura proposta che si riapre nella tavola · 2026-10-28 · Attiva
- ADR-0278 — Nelle build dello store gli sport non pronti non si vedono · 2026-10-28 · Attiva
- ADR-0279 — I messaggi privati: le richieste come su Instagram, una conversazione per coppia, il blocco la cancella · 2026-10-26 · Attiva
- ADR-0282 — Entrare e iscriversi con Apple e con Google · 2026-10-28 · Proposta
- ADR-0283 — Il nuoto in acque libere: l'acqua della canoa con la fascia dei bagnanti, le curve con un nome a riva, l'orologio in due fasi · 2026-11-05 · Accettato
- ADR-0283 — aggiunta, parte A1: il nuoto in file nuovi, la canoa e le impronte come prima; 130 m di fascia tengono mezzo chilometro · 2026-10-29 · Attiva
- ADR-0283 — aggiunta, parte A1: i giri ripetuti, il disegno a mano sull'acqua, la forma più grande o più piccola · 2026-10-29 · Attiva
- ADR-0283 — aggiunta, parte A2: le curve dove si gira davvero, il posto con un nome più vicino, i waypoint · 2026-10-29 · Attiva
- ADR-0283 — aggiunta, parte B: il nuoto nel contratto, l'app ancora a tre attività, un'impronta per i nuoti tenuti · 2026-10-30 · Attiva
- ADR-0283 — aggiunta, parte C: i testi approvati, C in due tempi, lo sport ancora una corsa finché è «Soon» · 2026-10-30 · Attiva
- ADR-0283 — aggiunta, parte B: l'impronta degli esempi della canoa aggiornata, i percorsi gli stessi · 2026-11-03 · Attiva
- ADR-0283 — aggiunta, parte C2: il nuoto è un'attività dell'app, a mezzo km, coi giri sul risultato · 2026-10-30 · Attiva
- ADR-0283 — aggiunta, parte C4: «Explore» a nuoto, i posti della canoa, gli esempi dall'API · 2026-10-30 · Attiva
- ADR-0283 — aggiunta, parte D: il nuoto col telefono nella boa, senza voce, il passo di 100 m · 2026-10-30 · Attiva
- ADR-0283 — aggiunta, parte E: le due dipendenze dell'orologio sì, il codice dopo TASK-321 B, sul Mac · 2026-10-30 · Attiva
- ADR-0283 — aggiunta, il nuoto acceso: per tutti, anche nelle build dello store · 2026-11-04 · Attiva
- ADR-0283 — aggiunta, il nuoto prima in preview: acceso in Expo Go e `preview`, lo store dopo TASK-387 · 2026-11-05 · Attiva
- ADR-0281 — L'attività finita anche in Apple Salute e in Health Connect: un allenamento con il percorso, scritto sul telefono a ogni «Save» dopo il primo sì · 2026-10-28 · Proposta
- ADR-0281 — aggiunta, parte A: l'allenamento dalla corsa salvata, tipo per tipo quello che il permesso concede · 2026-10-28 · Attiva
- ADR-0284 — I totali e le foto di un profilo: km e dislivello di ogni corsa, anche privata; i like ricevuti; «Drawings» e «Photos» · 2026-10-26 · Attiva
- ADR-0282 — aggiunta, parte A: cosa l'API fa con i token di Apple e di Google · 2026-10-29 · Attiva
- ADR-0207 — aggiunta (TASK-326): il passo medio nella riga dei fatti del «Feed» · 2026-10-26 · Accettato
- ADR-0285 — Due repository uguali: MUW sotto l'utente, specchiato con shaperoute nei due versi da un flusso in MUW · 2026-10-28 · Attiva
- ADR-0286 — «Play» sotto la distanza di «Draw», non più una pagina · 2026-10-29 · Attiva
- ADR-0287 — Le idee per un percorso solo in «Ask for a route»: sempre aperto, con i nostri percorsi nelle città d'Europa, poi le foto vere dei posti · 2026-10-29 · Attiva
- ADR-0287, aggiunta — Le foto dei posti: nella risposta di un percorso, e da una lista per le idee · 2026-10-29 · Attiva
- ADR-0289 — Gli allegati nei messaggi privati: un disegno, una foto o un video per messaggio, i file su disco, i video con un limite e una scadenza · 2026-10-29 · Proposta
- ADR-0290 — I posti che l'utente tiene sul telefono: «Add a place» in «Offline maps», la zona preparata dal server se manca · 2026-10-29 · Attiva
- ADR-0291 — La mappa sotto i disegni mentre «Draw» calcola: le foto si scattano durante l'attesa · 2026-10-29 · Attiva
- ADR-0289 — aggiunta, parte D: lo spazio pieno toglie i video dei messaggi più vecchi; il lettore è expo-video dalla 1.0.2 · 2026-10-29 · Attiva
- ADR-0288 — A mano solo sulla mappa: la linea aperta corsa andata e ritorno, «Erase», «Edit the drawing» sulla mappa e mai per le emoji · 2026-10-29 · Attiva
- ADR-0292 — Un video nei post: un file su disco finché altri vedono il post, l'ultima pagina della striscia del Feed, un lettore nativo nella 1.0.2 · 2026-10-29 · Proposta
- ADR-0288, aggiunta — Gli strumenti di disegno sulla mappa: la gomma a pezzi, la linea a tocchi, «Redo» e «Clear all», la piega · 2026-10-29 · accettata (TASK-331 parte B)
- ADR-0293 — Il look premium: titoli grandi e leggeri, grigi caldi, immagini a tutta scheda, un solo feedback al tocco, divisioni a filo, pagine vuote disegnate · 2026-10-29 · Proposta
- ADR-0048 — aggiunta (TASK-337): due avvisi alla volta sotto il percorso, mai quelli di sicurezza dietro «Show more» · 2026-10-29 · Attiva
- ADR-0296 — Le sfide del mese: un tema sul concorso, l'iscrizione esplicita, la galleria, l'archivio, tre push · 2026-10-29 · Accettata
- ADR-0294 — I badge sul profilo: primo disegno, 10 disegni, 30 km, decisi dal server · 2026-10-29 · Attiva
- ADR-0298 — Calorie e battito nei post del Feed: le calorie contate dalla distanza, il battito riassunto, acceso e nascondibile da chi pubblica · 2026-10-29 · Proposta
- ADR-0300 — Il disegno libero ancorato alle strade: il map matching è una modalità del nostro motore, per tratto, al sollevamento del dito · 2026-10-30 · Accettata
- ADR-0297 — Cercare i disegni dalla lente del Feed: `GET /search/drawings`, le parole senza accenti, la complessità dalla linea · 2026-10-29 · Attiva
- ADR-0288 — aggiunta (TASK-340): «Freehand» prima di «Shape | Word | Image», niente «Edit the drawing» in «Draw» · 2026-10-29 · Attiva
- ADR-0304 — «Who can see it» parte da «Only me», poi dall'ultima scelta salvata · 2026-10-30 · Attiva
- ADR-0301 — Il compositore del post: fino a 10 elementi in ordine, i layout appiattiti a «Publish», l'editor nativo dalla 1.0.2 · 2026-10-30 · Proposta
- ADR-0292, aggiunta — Fino a 3 video per post: il tetto resta, si raggiunge prima · 2026-10-30 · Proposta
- ADR-0302 — Nelle schede di «Explore» prima il disegno, la foto a uno swipe · 2026-10-30 · accettata
- ADR-0303 — Il video della corsa con la mappa sotto: la mappa nella pagina del video, uno scatto e la linea sopra, il giallo come riserva, tre stili dai token, il 3D proiettato dalla pagina · 2026-11-04 · Accettata e realizzata
- ADR-0306 — La scheda del Feed: due parti, il look di ADR-0293 prima del brief, la posizione arrotondata e detta · 2026-10-30 · Proposta
- ADR-0299 — «Edit the drawing» su un disegno del Feed: la traccia sulla mappa dov'è stata corsa · 2026-10-29 · Accettata
- ADR-0308 — Le schede del Feed: «Tutti» e «Seguiti», un `filter` facoltativo sul server, una cache per scheda · 2026-10-30 · Proposta
- ADR-0305 — Quanti messaggi nuovi: un numero dall'API fermato a 10, contato a parte solo sulla pagina · 2026-10-30 · Accepted
- ADR-0307 — «Draw» in tre secondi: un solo giallo, la via della partenza, la forma in scala, mezzo km per passo, la vibrazione solo dove c'è · 2026-10-30 · Accettata
- ADR-0300, precisazione — Modificare i nodi della traccia vera non è in nessun task · 2026-10-30 · Attiva
- ADR-0260, precisazione — Il regolamento legge i margini veri del telefono · 2026-10-31 · Attiva
- ADR-0074, precisazione — La tavola del contorno legge i margini veri del telefono · 2026-11-02 · Attiva
- ADR-0310 — I percorsi di MuW nel Feed: un tipo a parte, da file, senza account né tempi · 2026-10-31 · Proposta
- ADR-0281 — aggiunta, parte B: HealthKit nella 1.0.1, le librerie solo su iOS · 2026-10-29 · Attiva
- ADR-0281 — aggiunta, il taglio della 1.0.1: Apple Salute con contatti e selettore, e il testo per leggere il battito · 2026-10-30 · Accettata
- ADR-0281 — aggiunta, la build della 1.0.1: anche la vibrazione · 2026-11-02 · Accettata
- ADR-0311 — La navigazione come Instagram: una barra di schede in basso, un header solo · 2026-11-02 · Proposta
- ADR-0312 — I record personali: calcolati sul server da ogni attività, a piedi e in bici, visibili a tutti con la corsa chiusa se privata · 2026-11-02 · Proposta
- ADR-0309 — «RIDE IT YOURSELF»: percorsi in bici di MuW in «Explore», da un file nell'app · 2026-11-03 · Attiva
- ADR-0315 — La camminata: un'attività dell'API sulla rete foot della corsa, nel gioco ma non nei record · 2026-11-04 · Proposta
- ADR-0318 — Il mio corpo: kcal da peso, sesso ed età per corsa, bici e paddle, e zone del battito sul telefono · 2026-11-04 · Proposta
- ADR-0313 — «Edit the drawing» su ogni disegno: la traccia dov'è, una copia senza legami, l'acqua a parte · 2026-11-04 · Proposta
- ADR-0313, precisazione — «Freehand» anche sull'acqua con «Paddle» (TASK-396) · 2026-11-05 · Accettata
- ADR-0297, aggiunta — La schermata della ricerca (TASK-344 parte B) · 2026-11-04 · Attiva
- ADR-0301, aggiunta — Parte A app: come il compositore compone, ordina e manda · 2026-11-04 · Accettata
- ADR-0317 — Lo sci alpino in MuW: prima la giornata registrata, le forme solo dopo un prototipo · 2026-11-04 · Proposto
- ADR-0320 — Il registro degli sport: ogni sport nei suoi file, un banco di misura comune · 2026-11-05 · Accettato
- ADR-0319 — Gli sport «Record only»: si registrano senza forma, il motore non li vede · 2026-11-04 · Proposto
- ADR-0316 — Lo sci di fondo senza rete propria: le piste non disegnano forme, lo sport va in «Record only» · 2026-11-04 · Accettato
- ADR-0194, precisazione — Il post da condividere legge i margini veri del telefono · 2026-11-04 · Attiva
- ADR-0327 — «Gym»: una sessione senza traccia, le serie sul server, i post senza linea solo a chi li sa leggere · 2026-11-04 · Proposto
- ADR-0318, precisazione — «bpm» sta dentro il riquadro anche nelle zone del battito · 2026-11-04 · Attiva
- ADR-0318, precisazione — L'unità di peso e altezza sta dentro il riquadro · 2026-11-04 · Attiva
- ADR-0326 — «MuW Style»: post nostri con immagini AI e tag affiliati, fuori da `GET /feed` · 2026-11-04 · Accettata
- ADR-0323 — Lo swipe fra le schede: le pagine si scorrono anche con la barra in basso · 2026-11-04 · Proposta
- ADR-0326, precisazione — L'API di MuW Style (TASK-384 parte A) · 2026-11-04 · Attiva
- ADR-0329 — I movimenti come iOS: molle condivise con un rimbalzo appena percettibile · 2026-11-04 · Proposta
- ADR-0245, precisazione — Il contorno di «Draw route» si controlla come parte · 2026-11-04 · Attiva
- ADR-0249, precisazione — I test della pool contano solo le connessioni dei client · 2026-11-04 · Attiva
- ADR-0245, precisazione — Un contorno rifiutato dice perché, non «our side» · 2026-11-05 · Attiva
- ADR-0330 — Il disegno intero: gli altri vedono anche partenza e arrivo · 2026-11-05 · Attiva
- ADR-0328 — L'header `X-MuW-Reads`: le app vecchie non ricevono ciò che non sanno leggere · 2026-11-05 · Attiva
- ADR-0311, precisazione — Nell'header il logo di «Draw», che lascia la pagina · 2026-11-05 · Attiva
- ADR-0331 — La CI salta i test sulle PR di soli documenti e cancella i run superati · 2026-11-05 · Attiva
- ADR-0327, precisazione — La palestra usa l'header di ADR-0328 · 2026-11-05 · Attiva
- ADR-0327, precisazione — La parte A: dove sta la palestra nel server e nei tipi · 2026-11-05 · Attiva
- ADR-0326, precisazione — MuW Style nell'app (TASK-384 parte B) · 2026-11-05 · Attiva
- ADR-0332 — Il VO₂ max nel profilo pubblico: da Salute, se no stimato dai record, solo dopo un sì · 2026-11-05 · Proposto
- ADR-0327, precisazione — La parte B0: come l'app mostra un post senza linea · 2026-11-05 · Attiva
- ADR-0321 — L'escursionismo: una rete sua, fuori dalle strade delle auto, sulla struttura degli sport · 2026-11-05 · Accettato
- ADR-0321, precisazione — La parte A: l'impronta del motore resta, il profilo dell'app entra nascosto · 2026-11-05 · Accettato
- ADR-0327, precisazione — La parte B: come il telefono registra un allenamento senza GPS · 2026-11-05 · Attiva
- ADR-0332, precisazione — Il sì e il valore di Salute in una tabella loro, `vo2max` · 2026-11-05 · Attiva
- ADR-0314 — L'app per Apple Watch: Swift nativo, tutti gli sport, anche senza telefono · 2026-11-05 · Proposto
- ADR-0314, precisazione — La parte A1: il nucleo Swift, i messaggi e la tabella degli sport · 2026-11-05 · Attiva
- ADR-0322 — Gravel e MTB: la bici di oggi per il gravel, una rete sua per la MTB · 2026-11-05 · Accettato
- ADR-0333 — I capi sulle foto degli iscritti: tabelle loro, ogni link https controllato con Web Risk senza mandare il link · 2026-11-05 · Accettato
- ADR-0327, precisazione — La parte D: il post di palestra nel Feed · 2026-11-05 · Attiva
- ADR-0327, precisazione — La parte E: i traguardi della palestra · 2026-11-06 · Attiva
- ADR-0327, precisazione — La parte C: le calorie della palestra e Salute · 2026-11-06 · Attiva
- ADR-0327, precisazione — La parte F: la classifica mensile della palestra · 2026-11-06 · Attiva
- ADR-0335 — Le indicazioni a schermo bloccato: notifica con un OTA, Live Activity nella 1.0.2 · 2026-11-05 · Proposto
- ADR-0335, aggiunta — Il testo della notifica è la frase della voce · 2026-11-05 · Proposto
- ADR-0336 — Ruotare il disegno sulla mappa e aggiungere pezzi da tessere, tutto sul telefono · 2026-11-06 · Accettato
- ADR-0337 — «Edit the drawing» torna sotto le opzioni A, B e C del risultato di «Draw» · 2026-11-05 · Proposto
- ADR-0335, aggiunta 2 — La Live Activity mostra solo la guida · 2026-11-05 · Proposto
- ADR-0314, precisazione — La parte A2: l'app SwiftUI dell'orologio · 2026-11-06 · Attiva
- ADR-0321, precisazione — La parte B: Hike nell'app, «Soon» fino al server · 2026-11-05 · Accettato
- ADR-0334 — Il nuoto in piscina: una scelta dentro il nuoto, le vasche scritte alla fine, il post senza traccia · 2026-11-05 · Proposto
- ADR-0322, precisazione — La parte A: Gravel come la bici, MTB con una rete sua, l'impronta del motore resta · 2026-11-06 · Accettato
- ADR-0334, precisazione — La parte A: il nuoto in piscina nel server · 2026-11-06 · Attiva
- ADR-0334, precisazione — La parte B: l'app registra il nuoto in piscina · 2026-11-06 · Attiva
- ADR-0334, precisazione — La parte C: il post del nuoto in piscina · 2026-11-06 · Attiva
- ADR-0310, precisazione — Un percorso di MuW non dice quanto somiglia · 2026-11-06 · Accettato
- ADR-0322, precisazione — La parte B: Gravel e MTB nell'app · 2026-11-06 · Accettato
- ADR-0338 — Le stazioni sciistiche: dati OSM, meteo MET Norway dal server, la giornata completa · 2026-11-06 · Proposto
- ADR-0333, precisazione B — I capi nell'app: testi a parte, un ponte per il compositore, i capi accanto alle foto · 2026-11-06 · Accettato
- TASK-407 — La 1.0.2 esce con il JS dell'ultimo OTA di produzione · 2026-11-06 · Accettato
- ADR-0338, aggiunta — Le stazioni da OpenSkiData, non dagli estratti · 2026-11-06 · Attiva
- ADR-0338, aggiunta — Il meteo: due quote, una stima della neve, la cache · 2026-11-06 · Attiva
- ADR-0324 — Il Roller: una rete sua di vie lisce e asfaltate, ogni via nei due sensi · 2026-11-06 · Accettato
- ADR-0324, precisazione — La parte A: il Roller nel motore, nel contratto e nell'API, l'impronta del motore resta · 2026-11-06 · Accettato
- ADR-0324, seconda precisazione — Le soglie «veicolo» del Roller: 35 km/h su 200 m, 28 di media · 2026-11-06 · Accettata (scelta dell'utente, «Sì, 35 e
- ADR-0339 — L'editor del video dell'attività: un animale 3D corre il percorso con three.js nella pagina del video, l'editor, il prompt letto dal telefono · 2026-11-06 · Proposto
- ADR-0339, precisazione B — L'animale disegnato a parte e posato sul fotogramma, three.js r159, i modelli in uno zip · 2026-11-06
- ADR-0274, precisazione B — Lo schermo di corsa: la strada nel ciclo delle posizioni, nessun testo nuovo, il server a telefono bloccato · 2026-11-06 · Accettato
- ADR-0339, precisazione C — Il foglio «Edit video»: le scelte in un oggetto, il colore come ruolo, le emoji dove passa la linea · 2026-11-06
- ADR-0318, precisazione — Il nuoto in piscina · 2026-11-06 · Attiva
- ADR-0334, precisazione D — Calorie, battito e zone del nuoto in piscina · 2026-11-06 · Attiva
- ADR-0324, terza precisazione — Il Roller nell'app: energia, tempo stimato, file importati · 2026-11-06 · Accettata
- ADR-0340 — La pagina del post: video nella pagina, foglio con quattro azioni, sezioni di dati da una tabella `run_stats` · 2026-11-06 · Proposto
- ADR-0341 — La palestra per tutti i giorni: la griglia, il calendario dal server, le schede sull'account · 2026-11-06 · Proposto
- ADR-0338, aggiunta — La giornata di sci: stazione, modello e neve in una rotta a parte · 2026-11-08 · Attiva
- ADR-0342 — Le ciaspole: forme piccole piazzate libere sulla neve, come sull'acqua · 2026-11-08 · Accettato
- ADR-0314, precisazione — La parte B1: la guida in Swift, legata al telefono dalle tracce · 2026-11-08 · Attiva
- ADR-0314, precisazione — La parte A3: il telefono · 2026-11-08 · Attiva
- ADR-0344 — Ski touring: lo scialpinismo «Record only», fasi e VAM sul telefono, pendenza e vette dal server · 2026-11-08 · Proposto
- ADR-0343 — Carrozzina e passeggino: una rete sua dove si spinge, solo forme semplici di pochi km · 2026-11-08 · Proposto
- ADR-0314, precisazione — La parte B2: il percorso chiuso e i pezzi, con le stesse tracce · 2026-11-08 · Attiva
- ADR-0347 — Il grande catalogo di «Explore»: mille disegni da uno strumento in `tools/`, il filtro automatico, la scelta all'utente · 2026-11-08 · Proposto
- ADR-0347, precisazione — I tenuti entrano nella lista di «Explore» che c'è, dal catalogo del server; il primo giro · 2026-11-08 · Accettata
- ADR-0348 — Il catalogo in «Explore»: una pagina sua, i dati del seme nell'app, filtri e ordine sul telefono · 2026-11-08 · Superata (scelta dell'utente del 2026-11-08: i disegni nella lista esistente di «Explore», pagina tolta con la #978)
- ADR-0322 e ADR-0324, precisazione — Gravel, MTB e Roller registrano con i numeri della bici · 2026-11-08 · Accettata
- ADR-0352 — «Share live activity»: punti ogni 15 s dal task della posizione, la pagina statica chiede ogni 10 s, link a token dopo il `#` · 2026-11-08 · Accettato

---

- ADR-0345 — La mia immagine al posto dell'animale e il video «Together»: un lettore GIF nostro, i tempi delle tracce solo per il video insieme · 2026-11-08 · Proposto
- ADR-0351 — «Play» grande: 94 forme in 10 collezioni, passi su 10 distanze, sfide personali e premi dentro l'app · 2026-11-08 · Accettata
- ADR-0339, precisazione C2 — Le scene del video: i tempi, la foto piatta, i finali · 2026-11-08 · Attiva
- ADR-0350 — La corsa a tre pagine: «Compass», la mappa grande che gira dove punta il telefono · 2026-11-08 · Accettata

## Voci nuove

## ADR-0352 — «Share live activity»: punti ogni 15 s dal task della posizione, la pagina statica chiede ogni 10 s, link a token dopo il `#`

**Data**: 2026-11-08 · **Stato**: Accettato · **Task**: TASK-424 · deciso
dall'agente su delega dell'utente (la tecnica); le scelte di prodotto e la
privacy sono dell'utente e si scrivono in `tasks/TASK-424.md`

**Contesto**: l'utente vuole un link da mandare a chi non ha l'app, che
mostri dal vivo posizione, percorso fatto, dati e fine dell'attività, per
tutti gli sport. Oggi nessun punto lascia il telefono durante una
registrazione; il sito è statico; l'API ha già pagine a token
(`account_email.py`) e giri di pulizia in thread (`SweepRound`).

**Decisione**:
- **Telefono → server**: un `POST` ogni 15 s in movimento, con i punti
  nuovi (al massimo uno ogni 5 s) e i numeri del momento; subito a pausa,
  ripresa, fine e stop; in pausa ogni 60 s. Parte dal task della posizione
  che già gira a telefono bloccato (`runPosition.ts`), senza task nuovi.
  Senza rete i punti restano in coda (al massimo 500).
- **Pagina ← server**: polling ogni 10 s, `GET /live?t=<token>&after=<seq>`
  con i soli punti nuovi. Niente WebSocket né SSE: niente da cambiare in
  Caddy, risposte piccole, facile da provare.
- **Link**: `https://getmuw.app/live/#<token>`; token di 128 bit
  (`secrets.token_urlsafe(16)`), salvato come SHA-256. Il token dopo il `#`
  non arriva al server del sito né nel Referer; all'API va in query, che il
  log d'accesso non scrive (ADR-0096). `/live` in `OPEN_PATHS`, con
  `Access-Control-Allow-Origin: https://getmuw.app` solo lì; un limite di
  richieste per token.
- **Dati**: `live_shares` e `live_share_points`, `ON DELETE CASCADE`
  dall'account; un giro di pulizia ogni 5 min cancella i punti scaduti.
  Nessuna posizione nel log (ADR-0092).
- **Nessuna dipendenza nuova**: `fetch` e `Share` di React Native nell'app,
  la libreria standard sul server; la pagina usa MapLibre copiato sul sito
  alla versione dell'app (scelta dell'utente) e le tile di OpenFreeMap. L'impronta iOS si misura nella parte B.

**Alternative scartate**: WebSocket o SSE (una connessione aperta per ogni
spettatore, Caddy e i thread dell'API da cambiare, per un guadagno di pochi
secondi); invio a ogni fix (una richiesta ogni pochi secondi a telefono
bloccato: batteria); pagina disegnata dall'API su `api.getmuw.app` (fuori
dal sito, più HTML nel server); token nel percorso dell'URL (finirebbe nel
log d'accesso).

**Conseguenze**: la pagina del sito carica le tile da fuori, la prima volta
per `getmuw.app` (va nella privacy, col sì dell'utente); il
server va aggiornato col sì; una richiesta ogni 15 s in più durante una
condivisione.
## ADR-0347, precisazione — I tenuti entrano nella lista di «Explore» che c'è, dal catalogo del server; il primo giro

**Stato**: Accettata · 2026-11-08 · TASK-419. Scelta dell'utente, parole
sue: «Non inserirli come catalogo, inseriscili e basta nella lista»,
confermata «Sì, nella lista». Il resto deciso dall'agente su delega
dell'utente, dentro ADR-0347.

**Contesto**: ADR-0347 prevedeva una pagina «Catalog» nell'app
(TASK-420). L'utente la toglie: i disegni tenuti devono comparire nella
lista di «Explore» che esiste già («Best near you», gli esempi per città),
cioè nei file `catalog/seed/<città>.json` che l'API legge all'avvio
(`recommended.py`) e che sul server sono il bind mount `../catalog`
del checkout (`deploy/compose.yaml`), non dentro l'immagine.

**Decisione**:

1. **Nessuna pagina nuova**: i tenuti stanno in `catalog/seed/`, il primo
   giro (PR #966, 155 percorsi in 23 città, 2,3 MB invece di 5,7) è in
   `main`. Sul server il catalogo si aggiorna con `git pull --ff-only` nel
   checkout e `docker compose restart api` (l'API lo legge all'avvio); il
   codice entrato in `main` nel frattempo non cambia finché non si fa
   `--build`. Lo lancia l'utente via ssh, dopo il «via server catalogo» del
   Coordinatore; la sequenza è in `tasks/TASK-419.md`.
2. **I ripassi pesano per forma** come `optimizer.W_DOUBLED` (1,5 per
   cuore, cerchio, stella, cavallo, luna, farfalla, lumaca; 0 per le forme
   con i tratti): il punteggio segue il motore. Il filtro (≤ 10% in più)
   vale per tutte, tolta la quota che la forma disegna due volte apposta,
   misurata con `network.twice_drawn` sul contorno alla scala pianificata:
   la stima con `doubled_share` sul contorno ricampionato dava zero e
   bocciava zucca e faccina.
3. **I 49 contorni candidati di TASK-418** (`candidate_outlines/`, non
   registrati) si pianificano come casi a 5 e 10 km (`--outlines DIR`,
   `ShapeJob` come `--outline`), segnati «TASK-418 outline»; i 20
   preselezionati aspettano in `pending_outlines` di `tools/catalog_kept.json`
   finché TASK-418 non registra le forme (Coordinatore, 2026-11-08).
4. **Le parole** sono solo quelle approvate dall'utente in TASK-418 (CIAO,
   HOLA, OLA, SALUT, HALLO, HEJ, LOVE…) o il nome corto della città (WIEN,
   PRAHA, PORTO); una parola oltre la distanza massima della città (Venezia,
   10 km) non si pianifica.
5. **Le zone del server sul Mac**: con il «Sì, solo lettura» dell'utente
   (via Coordinatore) le `foot_*` del server sono copiate in `data/cache`
   con `rsync` dal terminale dell'utente, perché la sessione dell'agente
   non può leggere dal server di produzione; Overpass l'8 novembre sera
   non rispondeva (502, poi nessuna risposta) e i mirror nemmeno.
6. **Il primo giro è la preselezione dell'agente**, accettata dall'utente
   («ok si») con la pagina di revisione davanti: fino a 8 per città, almeno
   3, le tre forme semplici da 5 km nelle città in evidenza; l'utente può
   aggiungere o togliere chiavi dopo, dalla stessa pagina.

**Conseguenze**: la pagina «Catalog» di TASK-420 esce; «Explore» mostra
meno percorsi nelle 14 città del seme (i migliori), e quelli nuovi nelle
città europee arriveranno col secondo giro, dallo stesso strumento.

## ADR-0348 — Il catalogo in «Explore»: una pagina sua, i dati del seme nell'app, filtri e ordine sul telefono

**Stato**: **Superata** il 2026-11-08, lo stesso giorno. La pagina è stata
costruita e mergiata (#954), poi l'utente ha scelto, parole sue, «Non
inserirli come catalogo, inseriscili e basta nella lista» («Sì, nella
lista»): i disegni del seme vanno nella lista di «Explore» che c'è già
(«Best near you», gli esempi per città) attraverso il catalogo del server,
cioè TASK-419 e ADR-0347; la #978 toglie pagina, scheda, `catalog.json` e
script. Niente al suo posto: nessuna pagina, nessun JSON nell'app. Sotto,
la decisione com'era. · 2026-11-08 · TASK-420 (parte C del grande catalogo,
con TASK-418 e TASK-419). Le scelte di prodotto sono dell'utente (il
mockup approvato il 2026-11-08: il nome «Catalog», la scheda d'ingresso
sotto la ricerca di «Explore», cuore e «Start» sulla scheda, l'ordine come
interruttore); il resto è deciso dall'agente su delega dell'utente.

**Contesto**: «Explore» mostra i percorsi del seme solo entro 5 km dalla
partenza («Best near you», ADR-0098) e senza filtri (ADR-0144). L'utente
vuole un catalogo grande e completo, riempito dai 1000 disegni di
TASK-419, da scorrere e filtrare per città, paese, categoria, distanza e
sport, con la ricerca per nome. Il seme di oggi ha 350 percorsi in 23
città, in media 350 punti l'uno; l'API li conosce con id stabili
(`<city>-<shape|word>-<distance_m>-<i>`, `recommended.py`).

**Decisione**:

1. **Una pagina a sé dentro «Explore»**, aperta da una scheda sotto la
   ricerca (`CatalogEntry`) e chiusa da «←»: componenti nuovi in
   `apps/mobile/src/explore/` (`CatalogScreen`, `CatalogGrid`,
   `CatalogCard`, `CatalogFilterSheet`); `ExploreScreen.tsx` cambia solo
   per la scheda e lo stato «aperto». `App.tsx` non cambia: il tocco su
   una scheda passa dall'`onOpen` di «Explore» con un `RecommendedRoute`,
   e la mappa chiede il dettaglio a `GET /recommended-routes/{id}` come
   oggi.
2. **I dati viaggiano con l'app**, in `src/explore/catalog.json`, scritto
   da `apps/mobile/scripts/catalog-data.mjs` dai file di `catalog/seed/`
   (come `tools/bike_ideas.py` scrive `bikeIdeas.json`, ADR-0309): per
   ogni percorso l'id dell'API, città e paese, forma o parola con lo
   stile, la categoria, le distanze, la somiglianza, la partenza, il giro
   (`rotation_deg`), un'anteprima a 48 punti e la chiave dei preferiti
   (`favoriteKey` sui punti interi, così il cuore sulla scheda sa se il
   percorso è già tenuto senza scaricarlo). Niente rete per sfogliare:
   la pagina funziona anche senza server; solo aprire e tenere un
   percorso chiedono l'API. A 350 voci il file pesa 426 KB; a 1000,
   circa 1,2 MB.
3. **Filtri, ricerca e ordine sul telefono**, in funzioni pure
   (`catalogFilters.ts`): paese, città, categoria (la tabella
   forma → categoria vive nell'app finché TASK-418 non la scrive nel
   catalogo delle forme), distanza fra 5, 10 e 21 km (quelle del seme),
   sport (il seme di oggi è tutto corsa; il campo c'è per i seguiti); la
   ricerca sul nome della forma nella lingua dell'app, sulla parola e
   sulla città; l'ordine «Nearest» dalla partenza o dalla città scelta,
   «Best» per somiglianza, «Shortest» per km.
4. **La griglia è una `FlatList` a due colonne** che mostra 40 voci alla
   volta e ne aggiunge 40 alla fine dello scorrimento; le miniature sono
   `RouteThumb` (segmenti, niente mappa sotto: le mappe delle schede di
   «Best near you» sono foto di «Feed», troppe per centinaia di voci).
5. **Il cuore sulla scheda** usa `useFavoritesDoor`: pieno quando la
   chiave è fra i preferiti; premuto, chiede il dettaglio all'API e passa
   da `press` con `exploredKeepable`, così il percorso tenuto è lo stesso
   della mappa; senza account apre «Profile» come il cuore sulla mappa.
   «Start» apre il percorso sulla mappa, dove c'è il suo «Start»: la
   partenza immediata vuole `App.tsx` ed è un seguito.
6. **Testi in inglese con `t()`**, tradotti nelle quattro lingue; colori
   solo da `tokens.ts`; nessuna dipendenza nuova; test Jest sulle
   funzioni pure e sui componenti.

**Alternative**:

- **I dati dall'API, paginati** (`GET /catalog?offset=`): nessun peso
  nell'app, ma un endpoint nuovo in `services/api/` (fuori dai confini
  del task), la pagina vuota senza rete e una richiesta a ogni filtro.
  Si riprende se `catalog.json` supera **mezzo megabyte** (limite fissato
  col Coordinatore il 2026-11-08): lo script scrive allora solo l'indice
  (senza anteprime) e la griglia chiede le anteprime a pagine.
- **Leggere `catalog/seed/*.json` direttamente dall'app**: 2,5 MB di
  punti interi nel bundle e il bundler che guarda fuori da `apps/`.
- **Una sezione dentro «Best near you»** invece di una pagina: la lista
  di «Explore» è già lunga e il catalogo vuole filtri suoi.
- **Le mappe sotto le miniature** come in «Best near you»: una foto per
  scheda, centinaia di schede.

**Seguiti**: i dati paginati dall'API oltre mezzo megabyte; la partenza
immediata da «Start» (`App.tsx`); le categorie dal catalogo delle forme
quando TASK-418 le scrive; il rilancio di `catalog-data.mjs` a ogni seme
nuovo, da chi cambia il seme (TASK-419; una riga nel suo task file e nel
`README` del catalogo, dalla sua sessione).

## ADR-0345 — La mia immagine al posto dell'animale e il video «Together»: un lettore GIF nostro, i tempi delle tracce solo per il video insieme

**Stato**: Proposto · 2026-11-08 · TASK-417. Le scelte di prodotto sono
dell'utente (`tasks/TASK-417.md`, scelte 1–5); il come è deciso
dall'agente su delega dell'utente.

**Contesto**: nel video della corsa (TASK-408, ADR-0339) corre un animale
3D sulla punta della linea. Si vuole anche la propria immagine (foto o GIF)
al suo posto e, se nel post ci sono persone taggate che hanno corso la
stessa corsa, un video solo con le tracce di tutti, sullo stesso orologio.
Su Safari iOS non c'è ImageDecoder. Il server tiene i tempi di ogni punto
(`runs.track` `LineStringM`) ma non li restituisce a nessuno, e la privacy
promette che gli altri vedono le corse «senza orari». Il tag non ha un
«accetta».

**Decisione (proposta)**:

1. **L'immagine è un personaggio in più** accanto agli animali: la scena
   la porta come fotogrammi (uno, o fino a 8 per una GIF) di 256 px al
   massimo; la pagina la disegna sulla punta della linea, tonda, con un
   saltello, girata un poco nel verso della strada; sul 3D come cartellino
   in piedi sulla linea; a fine percorso si ferma come l'animale.
2. **Si crea solo con la foto ritagliata tonda** (scelta 1):
   `expo-image-picker` (libreria o fotocamera, permessi già in `app.json`)
   con il ritaglio quadrato di sistema, `expo-image-manipulator` a 256 px.
   Nessuna dipendenza nuova, niente di nativo: l'impronta iOS non cambia.
3. **Le GIF si leggono con un lettore nostro** in TypeScript
   (`share/gifFrames.ts`), non con ImageDecoder, che su iOS non c'è. Al più
   8 fotogrammi a distanza uguale; il formato verso la pagina e il tetto del
   peso si misurano nella parte B.
4. **Se l'immagine non si legge, il video esce senza**, come senza animale
   (ADR-0339, precisazione B, punto 2): mai un errore.
5. **L'immagine resta sul telefono**: non va al server, ne esce solo nel
   video condiviso o pubblicato. Nel Feed il video vale come i video
   propri dei post, senza controlli in più (scelta 2). Nessuna immagine
   offerta dall'app.
6. **«Together» usa tag e visibilità, nient'altro** (scelta 3): entra la
   traccia di una persona taggata nel post la cui attività della stessa
   corsa è visibile a chi fa il video (`drawing_seen_sql`). «La stessa
   corsa»: tempi sovrapposti per almeno metà della più corta e partenze a
   meno di 2 km (da misurare nella parte D). Al più 4 persone, chi fa il
   video compreso (scelta 4).
7. **I tempi escono solo per questo**: un endpoint nuovo dà all'autore del
   post le tracce del gruppo con i **secondi dalla prima partenza**, mai
   l'ora del giorno né la data, al più 600 punti a traccia, senza spostarne
   nessuno. Gli altri endpoint restano senza tempi.
8. **Un orologio solo, vero**, compresso nei secondi del pezzo «The route»:
   ognuno sta dove era in quel secondo, fra due punti registrati; in pausa
   è fermo. Dove due tracce passano a meno di 25 m nella stessa finestra di
   10 s spunta un ⚡, al più uno ogni 3 s di video. Ognuno ha il suo colore
   dai token e il suo animale o immagine.
9. **La privacy cambia per «Together»**: la frase «senza orari» prende
   l'eccezione e un punto nuovo dice che il video mostra il passo vero di
   chi è taggato, senza ora né data (testi approvati, scelta 5).
10. Cinque parti: A proposta, B immagine, C foto scattata e ritagliata, D
   «Together» (server e app), E prova sul telefono. I file di TASK-408
   (`videoScene.ts`, `videoPage.ts`, `EditVideoSheet.tsx`, il resto di
   `share/`) si toccano solo dopo la sua parte C2, con la lista approvata
   dal Coordinatore.

**Alternative**:

- **ImageDecoder nella WebView**: non c'è su Safari iOS.
- **Una libreria GIF da npm**: una dipendenza nuova per poche centinaia di
  righe che si provano bene da sole.
- **Scatti in fila e disegno a dito**: proposti, non scelti dall'utente per
  la prima versione (scelta 1).
- **La sagoma scontornata**: vuole codice nativo (Vision), quindi
  un'impronta iOS nuova.
- **Un sì esplicito della persona taggata, per ogni video o una volta per
  persona**: proposto dall'agente; l'utente ha scelto tag e visibilità
  (scelta 3).
- **Ogni traccia sul suo orologio** (tutti partono insieme e arrivano
  insieme): niente tempi dal server, ma il video non direbbe chi andava più
  veloce né dove ci si è incrociati, che è quello che si chiede.
---

## ADR-0351 — «Play» grande: 94 forme in 10 collezioni, passi su 10 distanze, sfide personali e premi dentro l'app

**Stato**: Accettata · 2026-11-08 · TASK-423 (estende ADR-0255). Proposta
approvata dall'utente il 2026-11-08 con «Sì, approvo»
(`docs/tasks/TASK-423-proposta.md`); le scelte tecniche sotto sono
dell'agente su delega dell'utente.

**Contesto**: il gioco delle forme (ADR-0255, `GIOCO.md`) ha 12 forme in una
griglia, tempi migliori su 4 distanze e le sfide di squadra; le sfide del
mese (TASK-343) stanno a parte. L'utente vuole collezioni a tema, 80–100
forme, km da 1 a 10 000, livelli di passo su 10 distanze, sfide personali e
streak, e premi dentro l'app, senza punti né classifiche (TASK-241), senza
denaro né pubblicità.

**Decisione**:

1. **Ogni requisito è una forma**: 94 forme in 10 collezioni (24 gradini
   di km totali, 6 traguardi di una corsa, 64 livelli di passo). Le 12
   forme di oggi tengono id, nome e requisito: nessuno perde niente.
2. **Il catalogo resta nel codice dell'API** (`game_catalog.py`), contorni
   in coordinate del disegno: 18 letti dal motore, che non cambia, 8
   calcolati, 56 disegnati come poligoni. Il foglio di tutte le forme lo
   approva l'utente.
3. **I traguardi di una corsa sono requisiti `pace` a 20:00/km con
   `single_run: true`**: l'app installata rifiuta tutto il catalogo se
   trova un tipo di requisito sconosciuto (`isGoal` di `gameApi.ts`) e
   nasconderebbe «Play». Valgono le regole dei tempi: le camminate restano
   fuori.
4. **Tempi migliori su 11 distanze** (le 10 del passo e 50 000 m per
   l'ultra), `RULES_VERSION` 3, stesso calcolo O(n); backfill una volta
   dopo il deploy di A e B insieme, senza push.
5. **Sfide personali senza iscrizione**, uguali per tutti: 3 settimanali e
   2 mensili, a rotazione dal numero della settimana e del mese, con tre
   gradini su una barra. Funzioni pure; una tabella `game_personal` scritta
   nella transazione del salvataggio, come i pezzi; il backfill non la
   tocca, e le medaglie partono dalla settimana del rilascio.
6. **L'ora locale da `utc_offset_min`** mandato dall'app con la corsa e
   salvato in `game_runs` (`runs` non cambia); senza, UTC. Dato nuovo: il
   testo della privacy lo approva l'utente (parte C).
7. **Streak a tre righe** (1, 2, 3 uscite a settimana) calcolata da tutta
   la storia del gioco, senza scelte da salvare: niente da imbrogliare
   abbassando la soglia.
8. **Edizioni come righe di `game_unlocks`** (`silver` a 3 corse, `gold` a
   10; la `solo` di oggi è il bronzo), contate da `game_runs`; solo per le
   forme di passo e di traguardo.
9. **Il profilo pubblico mostra premi del gioco solo se scelti** (cornice,
   titolo, fino a 3 badge, in `game_prefs`); di default niente. Privacy
   approvata dall'utente (parte E).
10. **Sei passi**: documenti, A (catalogo), B (passi), C (personali), D
    (app, dopo la #971 di TASK-422), E (premi). Server A+B, poi C, poi E;
    un OTA dopo D+E; ognuno col sì dell'utente e il via del Coordinatore.

**Alternative**:

- **Livelli di passo come tabella a parte, non forme**: due modi di
  mostrare lo stesso avanzamento; «Play mostra tutto» vuole una cosa sola.
- **Un tipo di requisito nuovo `single_run`**: più pulito, ma spegne
  «Play» su tutte le app installate fino all'OTA.
- **Sfide personali su misura** (dal passato di ognuno): più dati, più
  regole da spiegare; tre gradini coprono principianti e forti.
- **Una soglia di streak scelta dall'utente**: va salvata, e cambiarla
  riscrive la storia.

**Conseguenze**: il catalogo diventa grande (94 contorni nella risposta di
`GET /game/catalog`, circa 150 KB contro i 20 di oggi); l'app di oggi
mostra le 94 forme nella griglia di sempre finché arriva l'OTA. Due
migrazioni (C, E).

## ADR-0339, precisazione C2 — Le scene del video: i tempi, la foto piatta, i finali

**Stato:** deciso dall'agente su delega dell'utente (2026-11-08); le scene
di base sono una scelta dell'utente (scelta 12 del task file, «Come oggi»).

1. **C2 si fa in due PR**: C2a le scene e il finale; C2b la camera dietro
   l'animale sul 3D e l'anteprima nel foglio, che toccano la pagina in
   modo più pesante.
2. **I tempi**: con tutte e tre accese, 3 s di apertura, 6 di percorso e 3
   di finale (scelta 8). Una scena spenta dà i suoi secondi al percorso; a
   percorso spento, le altre se li dividono a metà. Il video dura sempre
   12 s. Così, con l'apertura spenta, il percorso ha 9 s (1 s di logo, 8 di
   linea) e il finale 3: è il video di prima, e un test lo confronta
   fotogramma per fotogramma con quello salvato prima di C2.
3. **Le scelte delle scene** sono campi di `VideoEdit` (`order`, `off`,
   `opening`, `cut`, `ending`); `videoScene` le legge dalle opzioni, quelle
   mancanti come all'apertura del post.
4. **L'apertura «Drawing in 2D»** disegna la linea dall'alto in quei
   secondi, senza numeri; il percorso poi la ridisegna con l'animale. Sul
   3D la pagina scatta prima la mappa da dritto sopra (dove sta la linea
   piatta della scena), poi la inclina come sempre: la descrizione della
   mappa dice `flat`, e il file della mappa non cambia. Se la foto piatta
   non c'è, sotto resta quella inclinata. **«Title»** mette il titolo
   grande in mezzo (o «MuW», senza titolo) e nasconde quello in alto.
   **«Cut»** passa alla scena dopo di colpo; **«Fade»** sfuma nell'ultimo
   mezzo secondo dell'apertura.
5. **I finali**: «Whole drawing» è quello di prima; «Numbers» mette i
   risultati grandi in colonna in mezzo, su un velo del fondo dello stile;
   «Heart» fa spuntare in mezzo il quadrato giallo con il cuore che si
   disegna e «MuW» sotto; «All three» tiene il disegno con i numeri e poi,
   a metà del finale, il cuore. Il marchio nell'angolo resta sempre.
6. **Riordino senza testi nuovi**: i tre riquadri stanno in fila come
   nella tavola («2D › 3D › Reveal») e si spostano con «‹ ›», etichettati
   con «Move left»/«Move right», già tradotti. Le cose del finale spariscono
   quando dopo viene un'altra scena; le emoji del post restano.
---
## ADR-0350 — La corsa a tre pagine: «Compass», la mappa grande che gira dove punta il telefono

**Data**: 2026-11-08 · **Stato**: Accettata · **Task**: TASK-422 ·
aggiorna ADR-0137 (le due pagine) e ADR-0195 (la mappa girata e la freccia
del nord)

Chiesto dall'utente il 2026-11-08: una pagina nuova con la mappa sola, a
tutto schermo, che ruota in base a dove punta il telefono, con un pulsante
per tornare al nord; da fermo la bussola, in corsa la traccia GPS quando la
bussola è inaffidabile, la regola da proporre. Le scelte di prodotto (nome
«Compass», ordine Compass | Map | Data con apertura su «Map», cosa resta
nella scheda, la freccia del nord a due tocchi, i due testi) approvate
dall'utente il 2026-11-08 («approvo tutto»); la regola tecnica decisa
dall'agente su delega dell'utente. In `main` con la #971.

**Contesto**: la corsa aveva due pagine (ADR-0137): «Map», la mappa col
nord in alto o girata come il disegno (ADR-0195), e «Data». Chi corre in
un posto nuovo vuole leggere la mappa come la vede: quello che ha davanti
in alto, come fanno i navigatori.

**Decisione**:
- **Tre pagine**, «Compass» | «Map» | «Data»; si apre su «Map» come oggi.
  Lo swipe passa una pagina alla volta, dalla scheda; i tre nomi con un
  tocco. La pagina aperta vive in un modulo (`navigation/runPage.ts`),
  come i comandi della corsa (`runControl`): la scheda la imposta, e la
  mappa, che sta sopra la scheda in `App.tsx`, la legge. `App.tsx` cambia
  per poche righe: l'hook `useHeadingUpMap` si mette sopra `useTurnedMap`
  e dà alla mappa lo stesso `turn` della freccia del nord.
- **«Compass» è la scheda ridotta ai pulsanti**, non una seconda mappa:
  la mappa (`MapView`, una sola, mai ricaricata) prende lo spazio lasciato
  libero. Niente numeri, barra, riga del gioco né battito; il banner della
  svolta resta sopra la mappa.
- **Da dove viene la direzione** (`navigation/headingUp.ts`): la bussola
  (`expo-location` `watchHeadingAsync`, già nell'app: nessuna dipendenza
  nuova; `trueHeading`, o `magHeading` quando il telefono non sa il nord
  vero) **da fermi sempre**, perché la traccia dice da dove si è venuti,
  non dove si guarda; **correndo la bussola finché la sua calibrazione è
  media o alta** (≥ 2 sulla scala 0–3 di expo-location: sotto i 35° di
  incertezza su iOS); **con calibrazione bassa o nulla, in movimento, la
  traccia** (`headingDeg`, gli ultimi 10 m, la stessa della freccia). «In
  movimento» è un fix GPS negli ultimi 10 s, la soglia dell'auto-pausa
  (`AUTO_PAUSE_AFTER_MS`): le due cose dicono la stessa cosa su cosa sia
  stare fermi. Senza bussola (un telefono che non ce l'ha, o la rifiuta)
  vale la traccia in movimento, e da fermi la mappa resta com'è.
- **Non trema**: una lettura della bussola sostituisce quella tenuta solo
  se l'ago si è mosso di 2° o la calibrazione è cambiata, e non prima di
  250 ms; la mappa gira solo per cambi di almeno 4° e non più di una volta
  ogni 400 ms (`easeTo` di 500 ms, come la freccia del nord). La bussola è
  accesa solo con «Compass» aperta e il nord non fissato: costa batteria.
- **Il nord**: la freccia del nord di ADR-0195, nello stesso posto, sempre
  visibile su «Compass». Un tocco mette il nord in alto e lo tiene (la
  bussola si spegne), un secondo rimette la direzione; per VoiceOver il
  secondo tocco è «Turns the map where you face» (`NorthArrow` prende
  `northUp` e `upHint`). Lasciando la pagina, o a fine corsa, la mappa
  torna al `bearing` del disegno, e la freccia è di nuovo quella del
  disegno. La pagina aperta torna «Map» quando la scheda sparisce.

**Conseguenze**: due testi nuovi nelle cinque lingue («Compass», «Turns
the map where you face»); solo JavaScript, l'impronta iOS non cambia. Da
provare sul telefono: la rotazione in mano da fermi e correndo, e se il
banner su «Compass» dà fastidio (toglierlo è una riga in `App.tsx`).
