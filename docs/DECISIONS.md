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
- ADR-0339 — L'editor del video dell'attività: un animale 3D corre il percorso con three.js nella pagina del video, l'editor, il prompt letto dal telefono · 2026-11-06 · Attiva
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
- ADR-0343 — Carrozzina e passeggino: una rete sua dove si spinge, solo forme semplici di pochi km · 2026-11-08 · Accettato (2026-11-12, parte A in `main`, vedi la precisazione A)
- ADR-0314, precisazione — La parte B2: il percorso chiuso e i pezzi, con le stesse tracce · 2026-11-08 · Attiva
- ADR-0347 — Il grande catalogo di «Explore»: mille disegni da uno strumento in `tools/`, il filtro automatico, la scelta all'utente · 2026-11-08 · Accettata (chiuso il 2026-11-10: 572 percorsi in 63 città)
- ADR-0347, precisazione — I tenuti entrano nella lista di «Explore» che c'è, dal catalogo del server; il primo giro · 2026-11-08 · Accettata
- ADR-0347, precisazione B — Tutti i disegni del catalogo nella pagina «Explore», città per città dalla più vicina, a pagine da `GET /catalog` · 2026-11-10 · Accettata
- ADR-0348 — Il catalogo in «Explore»: una pagina sua, i dati del seme nell'app, filtri e ordine sul telefono · 2026-11-08 · Superata (scelta dell'utente del 2026-11-08: i disegni nella lista esistente di «Explore», pagina tolta con la #978)
- ADR-0322 e ADR-0324, precisazione — Gravel, MTB e Roller registrano con i numeri della bici · 2026-11-08 · Accettata
- ADR-0352 — «Share live activity»: punti ogni 15 s dal task della posizione, la pagina statica chiede ogni 10 s, link a token dopo il `#` · 2026-11-08 · Accettato
- ADR-0352, precisazione A1 — Il server dei link dal vivo · 2026-11-08 · Attiva
- ADR-0352, precisazione A2 — La pagina dei link dal vivo · 2026-11-08 · Attiva
- ADR-0352, precisazione B1 — L'app: lo stato fuori da React, gli invii dal task della posizione, il consenso a ogni link · 2026-11-10 · Attiva
- ADR-0352, precisazione B2 — Piscina e palestra: gli stessi pulsante e invii, i numeri senza traccia, il consenso senza mappa · 2026-11-10 · Attiva
- ADR-0352, precisazione C — I dati dal vivo che mancano: il battito su «Data», la piscina dal vivo, le calorie di ogni attività (lo sci sulle discese) · 2026-11-10 · Attiva
- ADR-0352, precisazione C2b — I tratti della giornata di sci nei run-stats, le discese in ogni lista di post: un campo solo con TASK-429, nessuna migrazione · 2026-11-10 · Attiva
- ADR-0352, precisazione C3 — Le calorie in rosso ovunque: un token per tono, due fissi per il giallo e le foto, solo le kcal in rosso nella riga dei fatti · 2026-11-10 · Attiva
- ADR-0341, precisazione C — Le schede della palestra: la chiave nell'allenamento, l'ultima modifica vince, i giorni saltati · 2026-11-08 · Attiva
- ADR-0342, aggiunta — La parte A1: la neve nel motore prima del contratto, le quote condivise in `heights.py` · 2026-11-08 · Accettato
- ADR-0349 — I cancelli chiusi tolgono il nodo dalla rete foot: si passa o no · 2026-11-08 · Accettato

---

- ADR-0345 — La mia immagine al posto dell'animale e il video «Together»: un lettore GIF nostro, i tempi delle tracce solo per il video insieme · 2026-11-08 · Proposto
- ADR-0345, precisazione B — La mia immagine nel video: i fotogrammi in RGBA entro 2 MiB, le scelte sotto la riga, il cartellino sul 3D · 2026-11-10 · Attiva
- ADR-0351 — «Play» grande: 94 forme in 10 collezioni, passi su 10 distanze, sfide personali e premi dentro l'app · 2026-11-08 · Accettata
- ADR-0350 — La corsa a tre pagine: «Compass», la mappa grande che gira dove punta il telefono · 2026-11-08 · Accettata
- ADR-0314, precisazione — La parte B3a1: il percorso all'orologio e la lista «Routes» · 2026-11-08 · Attiva
- ADR-0339, precisazione C2 — Le scene del video: i tempi, la foto piatta, i finali · 2026-11-08 · Attiva
- ADR-0340, precisazione F — La card del Feed come la pagina: i numeri in riquadri e la barra delle quattro azioni; supera la scelta 4 di TASK-355 · 2026-11-08 · Attiva
- ADR-0346 — Le forme candidate: disegnate da primitive, fuori dal pacchetto finché l'utente non le giudica · 2026-11-08 · Attiva
- ADR-0346, precisazione B — Le 14 forme approvate entrano nel catalogo; le zone restano sulle 17 forme di prima · 2026-11-10 · Attiva
- ADR-0334, precisazione D, aggiunta B1 — Il battito sulla corsa: medio, massimo, «Show heart rate» · 2026-11-08 · Attiva
- ADR-0334, precisazione D, aggiunta B2 — Il battito a fine nuoto: lettura da Salute, tempo nelle zone, privacy · 2026-11-08 · Attiva
- ADR-0338, aggiunta — Seguire una stazione: «Le tue stazioni» senza notifiche, i post della stazione da `runs.ski_resort_id` · 2026-11-08 · Attiva
- ADR-0314, precisazione — La parte B3a2: i preferiti sull'orologio da soli, uno alla volta · 2026-11-08 · Attiva
- ADR-0339, precisazione C2b — La camera dietro l'animale: calcolata nell'app, mossa dalla pagina · 2026-11-08 · Attiva
- ADR-0339, precisazione C2c — L'anteprima nel foglio: la pagina del video in modo «play» · 2026-11-08 · Attiva
- ADR-0340, precisazione C — `run_stats`: passi dal server, profilo e calorie dal telefono, il battito resta in `runs` · 2026-11-08 · Attiva
- ADR-0314, precisazione — La parte B3b1: cosa mostra e come vibra il polso · 2026-11-08 · Attiva
- ADR-0314, precisazione — La parte B3b2: la corsa guidata sull'orologio · 2026-11-08 · Attiva
- ADR-0338, aggiunta — La pagina della stazione nell'app: una sola lista delle seguite, i post con l'autore · 2026-11-08 · Attiva
- ADR-0339, precisazione D — «Describe your video»: una tabella di parole letta sul telefono · 2026-11-10 · Superata dalla scelta dell'utente del 2026-11-10 (TASK-408 D2, #1075)
- ADR-0353 — «Edit the drawing» chiude la traccia aperta con un lato fino alla partenza, invece di correrla due volte · 2026-11-10 · Accettata
- ADR-0314, precisazione — La parte B3c1: la traccia dell'orologio al telefono e in Apple Salute · 2026-11-10 · Attiva
- ADR-0314, precisazione — La parte B3c2: la corsa dell'orologio sul telefono, avviso e scheda · 2026-11-10 · Attiva
- ADR-0314, precisazione — La parte B5: mappa nella corsa libera, colori, zone del battito dal telefono · 2026-11-10 · Attiva
- ADR-0314, precisazione — La parte B4: il telefono sveglia l'orologio con `startWatchApp` della libreria HealthKit · 2026-11-10 · Attiva
- ADR-0242 — I percorsi dell'API in 2 processi caldi, non nei 2 thread che si dividevano il GIL · 2026-11-10 · Accettata
- ADR-0340, precisazione D — Le sezioni della pagina: parziali, altimetria, battito medio e massimo; zone e minimo rimandati, dislivello dal profilo · 2026-11-10 · Attiva
- ADR-0356 — «Edit the drawing»: la traccia aperta che si incrocia diventa un anello alla partenza, corso una volta · 2026-11-10 · Accettata
- ADR-0354 — La partenza di «Draw on the map» si sposta lungo il disegno: il contorno ricomincia da lì · 2026-11-10 · Accettata
- ADR-0339, precisazione B2 — L'elefante: animato da MuW, e la pelle legata alle ossa come vuole glTF · 2026-11-10 · Attiva
- ADR-0357 — La modalità sci: scelto lo sci, le schede e le pagine diventano quelle dello sci · 2026-11-10 · Accettata
- ADR-0358 — I percorsi di MuW fuori dal Feed: un interruttore nell'app, endpoint e catalogo restano · 2026-11-10 · Accettata
- ADR-0359 — «Compass»: la freccia di chi corre punta dove punta la mappa, col cono azzurro; le schede della corsa coi disegni · 2026-11-10 · Accettata
- ADR-0340, correzione — La pagina del post: margini propri nel Modal, chiusa prima di «Edit & run», il tasto solo dove c'è un disegno · 2026-11-10 · Attiva
- ADR-0356, precisazione — Anche il percorso chiuso che si incrocia diventa un anello alla partenza: «Edit the drawing» su ogni percorso di «Explore» · 2026-11-10 · Attiva
- ADR-0351, precisazione D — L'app di «Play» grande: collezioni contate dal telefono, una lista sola, l'ora del telefono con il secondo invio senza · 2026-11-10 · Attiva
- ADR-0357, precisazione A — La modalità sci nell'app: le schede dallo sport, «Oggi» sulla pagina «choose», le icone come `face`, la barra ricostruita · 2026-11-10 · Attiva
- ADR-0360 — Le schede della palestra guidate: le settimane in una colonna `program`, i valori di ogni settimana dal telefono, l'app di prima che legge ancora · 2026-11-10 · Accettata
- ADR-0361 — Primo percorso subito: `plan_nearby` avvisa quando la partenza ha il suo piano, il job lo porta in `first` a chi lo chiede, nell'app il primo resta A · 2026-11-10 · Accettata
- ADR-0351, precisazione E1 — I premi sul server: le edizioni come righe di `game_unlocks`, cornici, titoli e badge letti a ogni richiesta, la scelta del profilo in `game_prefs` · 2026-11-10 · Attiva
- ADR-0357, precisazione B1 — La giornata di sci a colori: un solo calcolo dei tratti, i colori come token, i numeri sulle linee · 2026-11-10 · Attiva
- ADR-0357, precisazione C1 — I tratti della giornata salvata e la stagione sul server: `parts` solo quando ci sono, nomi alla lettura con una cache per processo · 2026-11-10 · Attiva
- ADR-0364 — I test dell'API in CI girano in 4 parti per file; il check `api` è un job finale · 2026-11-10 · Attiva
- ADR-0363 — I giorni di corsa nelle schede della palestra: un campo `run` facoltativo nel giorno del programma, la crescita dal telefono, «Go to the run» con i km di «Draw» · 2026-11-10 · Accettata
- ADR-0362 — Le due tabelle che il motore calcola una volta per grafo si fanno a blocchi con shapely, uguali bit per bit a prima; `math.dist` decide ancora i quasi-pareggi · 2026-11-11 · Attiva
- ADR-0351, precisazione D2 — La barra di una forma di passo fra il livello prima e questo, sul telefono; una distanza mai corsa di fila senza percentuale · 2026-11-11 · Attiva
- ADR-0351, precisazione E2 — I premi nell'app: la pagina «Prizes», le schede di edizioni e collezioni, la scelta del profilo e la privacy · 2026-11-11 · Attiva
- ADR-0357, precisazione B2/C2 — I tratti della giornata a «Salva» col ripiego al 422; la stagione da luglio a giugno, la giornata salvata a tre sezioni, la mappa del post di sci da `from_fix`/`to_fix` · 2026-11-11 · Attiva
- ADR-0347, precisazione C — Il catalogo a 1963 disegni: i già fatti che passano il filtro, le parole corte per città, l'ordine misto nelle liste · 2026-11-11 · Attiva
- ADR-0342, precisazione A2 — Le ciaspole nel contratto e nell'API: nessun percorso sulla neve tenuto, le quote dal disco a ogni richiesta, il profilo nascosto nell'app · 2026-11-11 · Attiva
- ADR-0344, precisazione B — Fasi, cambi pelli e VAM sul telefono sopra i tratti della neve; il pannello sopra la scheda della corsa · 2026-11-11 · Attiva
- ADR-0375 — Il parapendio registrato senza forma, con la condivisione dal vivo e i numeri del volo (quota, variometro, velocità del momento) · 2026-11-11 · Attiva
- ADR-0372 — Il calendario di tutte le attività: `GET /me/activity-calendar` letto da `runs` e `run_stats`, i 12 mesi e gli sport dell'account nella stessa risposta, nessuna migrazione · 2026-11-11 · Attiva
- ADR-0374 — Le zone a piedi calde nei processi di calcolo: un tetto in MB invece di 2 zone, le più usate rilette all'avvio in background · 2026-11-11 · Attiva
- ADR-0377 — Risposte e reazioni ai commenti: una risposta è una riga di `comments` a un livello solo, le cinque emoji in `comment_reactions`, la lista piatta per le app di prima, la reazione solo nella campanella · 2026-11-12 · Attiva
- ADR-0376 — Il muscolo allenato su una sagoma accanto all'omino della palestra: la tabella esercizio → muscoli nell'app, il corpo fatto di `View`, un token `muscle` · 2026-11-11 · Attiva
- ADR-0361, precisazione — Com'è stato costruito il primo percorso: senza `?first=1` il campo non c'è, il primo tiene la sua distanza migliore, i test dell'app che fingono il server ignorano il parametro · 2026-11-12 · Attiva
- ADR-0366 — Le parole del catalogo a penna alzata: `walks` nel seme e nel dettaglio, `gaps` nelle liste, entrano solo quelle lette a occhio · 2026-11-12 · Attiva
- ADR-0378 — Lo stretching nuovo: la figura che respira, si rialza e si gira, «Get ready» e «Switch sides» prima della tenuta, tick e «Skip»; poi routine da 3, 5, 10 minuti, palestra, mattino, routine pubblicate · 2026-11-12 · Attiva
- ADR-0379 — Il punteggio del sonno di MuW: calcolato sul telefono dai campioni di sonno di Apple Salute (durata 50, regolarità 30, interruzioni 20), perché HealthKit non espone quello di Apple · 2026-11-12 · Attiva
- ADR-0383 — Il look Liquid Glass: la direzione «Capsula», vetro velato senza blur via OTA, il vetro nativo dopo la 1.1.0 · 2026-11-12 · Proposta
- ADR-0381 — La live in chat e nel Feed, anche programmata: una sola `live_share` per registrazione con più pubblici, le live programmate in `planned_lives`, la schermata dal vivo nell'app che legge ogni 10 s · 2026-11-12 · Proposta

## Voci nuove

## ADR-0378 — Lo stretching nuovo: la figura che respira, si rialza e si gira, «Get ready» e «Switch sides» prima della tenuta, tick e «Skip»; poi routine da 3, 5, 10 minuti, palestra, mattino, routine pubblicate

**Stato**: Attiva · 2026-11-12 · TASK-466, parte A in `main` (#1181,
`437f152f`), solo app; esce con l'aggiornamento completo dell'app (c'è un
asset nuovo, `assets/stretch/tick.wav`: le impronte le misura il
Coordinatore prima dell'OTA). Il piano in cinque parti, i testi «End» e
«Next: {exercise}» e l'aspetto (schermate e video dal simulatore) sono
scelte dell'utente (2026-11-11 «Sì, vai»; 2026-11-12 «Sì, approvo» due
volte); il modo è deciso dall'agente su delega dell'utente, numero dal
Coordinatore.

**Contesto**: l'utente l'11 novembre 2026 ha chiesto di migliorare lo
stretching e le sue animazioni, di portarlo in palestra, di farlo al
mattino dopo la sveglia per 3, 5 o 10 minuti e di poter comporre e
pubblicare una propria routine. Lo stretching dopo la corsa (TASK-285,
ADR-0247) aveva cinque esercizi, una figura di `View` girate che passava
da una posa all'altra con uno scatto al cambio lato, la tenuta che partiva
subito e solo il «ding» alla fine.

**Decisione** (parte A):
- **La figura resta di `View` girate** (ADR-0147, ADR-0247), niente
  librerie di disegno. Ogni giuntura ha due `rotate`: il movimento fra le
  pose (keyframe 0..n-1 su un solo `Animated.Value`) e il respiro.
- **Il respiro**: durante la tenuta la posa va un po' più a fondo e torna
  ogni `BREATH_MS` = 4 s (`Animated.loop`), al massimo 12 gradi
  (`BREATH_MAX_DEGREES`), solo sui segmenti che fanno l'allungamento: un
  `Breath` per esercizio in `poses.ts`. Il bacino scende con la posa
  (`grounding`). In pausa il respiro si posa in 300 ms.
- **In piedi fra due pose piegate e al cambio lato**: `path()` passa da
  `STAND`; in piedi la figura si gira stringendosi di profilo (`scaleX` da
  1 a -1 attorno al momento in piedi), non più lo scatto.
- **Il tempo**: «Get ready» 5 s prima di ogni esercizio, «Switch sides»
  3 s fra i lati; la tenuta (20 s a lato) parte solo a figura in posa.
- **I suoni**: un tick all'inizio della tenuta e sugli ultimi 3 s, poi il
  «ding» di prima. `tick.wav` è nostro, fatto da `tools/stretch_chime.py`
  come il ding, che resta identico. expo-audio si carica al primo suono.
- **I tasti**: «Pause», «Skip» (salta l'esercizio: la chiave `Next` c'era
  già tradotta «A seguire», quindi niente «Next» sul tasto) ed «End»;
  all'ultimo esercizio «Pause» e «Done». «Next: {exercise}» negli ultimi
  5 s dell'ultimo lato.
- **«Riduci movimento»**: ogni posa subito, niente respiro.

**Le parti dopo** (ciascuna con la sua PR, i testi col sì dell'utente):
B, ~15 esercizi e le routine Morning, After run, After gym da 3, 5, 10
minuti; C, lo stretching in palestra (dopo TASK-461 A2 e TASK-465, col
turno su `src/gym`); D, «Morning stretch» con l'orario scritto dall'utente
e una notifica locale (iOS non lascia leggere le sveglie dell'Orologio;
la prossima sveglia di Android è nativa e va in una build); E, le routine
dell'utente pubblicate nel Feed con «Do this routine» (server prima,
segnalazione e blocco anche lì).

**Alternative scartate**: una libreria di disegno (svg, Lottie) per la
figura, una dipendenza e un'impronta nativa nuove per poco; il respiro
come scala di tutta la figura, che non mostra dove tira; la voce che legge
gli esercizi, rimandata.

**Conseguenze**: i test della schermata simulano `./chime` (jest dà lo
stesso stub ai due wav); `__tests__/AppStretch` conta il tempo nuovo
(`READY_S + 20 + SWITCH_S + 20` a esercizio). Dettagli in
`tasks/TASK-466.md`.
- ADR-0382 — Il post di un altro si manda come rimando e si linka col consenso dell'autore: l'allegato `post` nei messaggi letto coi permessi di chi legge, la pagina pubblica di un post «Everyone», l'interruttore «Links to my posts» acceso all'inizio · 2026-11-12 · Accettata

## Voci nuove

## ADR-0382 — Il post di un altro si manda come rimando e si linka col consenso dell'autore: l'allegato `post` nei messaggi letto coi permessi di chi legge, la pagina pubblica di un post «Everyone», l'interruttore «Links to my posts» acceso all'inizio

**Stato**: Accettata · 2026-11-12 · TASK-455, parte 0 chiusa; le parti A–E
sono da costruire. Quello che si vede e si promette è **scelta
dell'utente** (2026-11-12, una domanda alla volta: «Tutte e tre insieme»,
«Share» nella riga su ogni post, «Il post, col nome dell'autore», «Si
manda, lo apre solo chi può», «Interruttore, acceso all'inizio», «Mappa
con la linea intera», testi «Approvo così»); il modo è deciso dall'agente
su delega dell'utente. Numero dal Coordinatore. Estende ADR-0289 (gli
allegati nei messaggi) e ADR-0170 (chi vede un disegno); capovolge, per i
soli link, la scelta 5 di TASK-355 («Share» fuori dall'app solo sui
propri disegni).

**Contesto**: nella prova dell'11 novembre 2026 (S5 di
`out/prova-app-2026-11-11/PROPOSTE.md`) il post di un altro non si poteva
mandare a un amico né condividere. «Send to a friend» c'era già
(TASK-333), ma non nel Feed, e manda **una copia** della linea (ADR-0289,
punto 2): dalla scheda di un disegno altrui un follower può così mandare
la traccia intera di un disegno «Followers» a chi non segue l'autore, e la
copia resta anche se l'autore cancella il post. I post non hanno link: un
disegno lo vede solo un iscritto (`drawings.drawing_seen_sql`).

**Decisione**:

1. **Un allegato nuovo nei messaggi, `post`: un rimando, mai una copia.**
   Il messaggio tiene l'id del disegno e nient'altro: né linea, né titolo,
   né autore. Vale la regola di ogni allegato: solo in una conversazione
   aperta (ADR-0289, punto 1).
2. **Mandarlo** vuole che chi manda veda il disegno
   (`drawing_seen_sql(chi manda)`); altrimenti `404`, come per un id che
   non c'è.
3. **Leggerlo: i permessi sono di chi legge, a ogni lettura.** Ogni pagina
   della conversazione risolve la scheda per l'account che la chiede con
   la stessa domanda di sempre (`drawing_seen_sql`: visibilità, follow
   accettato, blocchi nei due versi, disegno o iscritto nascosto) e dà
   titolo, autore, metri, sport e linea, oppure la scheda vuota: «non
   disponibile». Vale anche per chi l'ha mandato. Niente è tenuto nel
   messaggio, quindi cancellare il post, cambiare «Who can see it»,
   bloccare, smettere di seguire agiscono dalla lettura dopo, senza
   ripulire niente. Lo stesso per la lista delle conversazioni e per la
   push, che dicono solo «🗺️ Post».
4. **Le app di prima**: un'app di oggi chiede già `?with=attachments` e
   non conosce `post`. Il rimando arriva solo a chi dice di saperlo
   leggere; agli altri il testo con davanti «[Post]», come «[Drawing]».
   **Lo dice con `post` nell'header `X-MuW-Reads`** (ADR-0328), non con un
   valore nuovo di `?with=`: quel parametro ha un modello fisso, e un
   server di prima risponderebbe `422` a ogni pagina della chat di
   un'app nuova; l'header invece lascia cadere i valori che non conosce.
   `post` non è un tipo di corsa: lo legge `messages.py`, e `reads.py`
   non cambia. Chi lo dice trova `post` anche in `attachments.kinds`, e
   sa così che il server lo accetta (parte A, deciso dall'agente su
   delega dell'utente, d'accordo col Coordinatore).
5. **Da dove**: da un post («Share» del Feed e della pagina del post, la
   scheda di un disegno altrui) si manda sempre il rimando, anche se il
   post è proprio. Dalla mappa, dai preferiti e da «My activities» resta
   la copia di ADR-0289: lì non c'è un post, o il percorso si manda per
   correrlo.
6. **Il buco della copia si chiude nell'app**, non sul server: una copia è
   una fila di punti e il server non può sapere da quale disegno viene. La
   scheda di un disegno altrui smette di mandare la copia (parte B; prima,
   se serve, togliendo il pulsante dai disegni «Followers» altrui). Un'app
   non aggiornata lo tiene finché non si aggiorna: è il limite che resta.
7. **Il link di un post** porta a una pagina del sito, sul modello di
   «Share live» (ADR-0352). La lettura senza account risponde **solo** per
   un post `everyone`, non nascosto, di un autore non nascosto e con
   l'interruttore acceso; per ogni altro caso `404`, uguale a un id che non
   c'è. Dà la linea **come la vede già un iscritto, non di più** (ADR-0330),
   titolo, nome, metri e sport; mai foto, commenti, reazioni, tempi,
   descrizione o persone taggate. La pagina ha `noindex` e nessuna
   anteprima per i motori di ricerca.
8. **«Links to my posts»**: un campo dell'account, **acceso all'inizio**
   (scelta dell'utente). Spento, gli altri sui miei post hanno solo «Send
   to a friend» e i link smettono di funzionare alla lettura dopo. Cambia
   l'esposizione dei post «Everyone» già pubblicati: la frase della
   privacy e l'avviso nelle novità vanno approvati dall'utente **prima**
   che la parte C vada sul server.
9. **Nessuna dipendenza nuova**: il link passa dal foglio del telefono
   (`Share` di React Native), «Share link». Aprire il post dentro l'app
   dal link vuole i link universali, cioè una build nativa: parte F.

**Alternative scartate**: la copia con in più autore e rimando al post
(l'utente ha scelto il rimando: l'autore tiene il controllo);
l'interruttore spento all'inizio e il link solo dell'autore (proposti,
l'utente ha scelto acceso); la pagina con la sola figura senza mappa;
`expo-clipboard` per un «Copy link» vero (cambia l'impronta iOS).

**Conseguenze**: una migrazione per la parte A (provvisoria `0075`) e una
per la C; `messages.py` e `push.py` li tocca dopo anche TASK-468, quindi
l'allegato sta in un blocco suo. Da chiedere all'utente prima della parte
C: con l'interruttore spento, il link che l'autore prende del proprio
post funziona o no.

## ADR-0383 — Il look Liquid Glass: la direzione «Capsula», vetro velato senza blur via OTA, il vetro nativo dopo la 1.1.0

**Stato**: Proposta · 2026-11-12 · TASK-469, nessun codice ancora. La
direzione è scelta dell'utente (2026-11-12, «Capsula» fra tre direzioni:
https://claude.ai/artifact/HD397UmJcu94vNZvGBH2bs); il modo è deciso
dall'agente su delega dell'utente, coi vincoli del Coordinatore; numero
dal Coordinatore.

**Contesto**: l'utente vuole l'app più moderna, nello stile Liquid Glass
di iOS 26. Oggi la barra è `background` al 95% e le superfici sono piene
(TASK-339, TASK-388). Nell'app non ci sono `expo-blur` né
`expo-glass-effect`; React Native 0.86 ha già ombre anche interne,
sfumature e bordi di colore diverso per lato. Sull'App Store sono
dichiarati «Sufficient Contrast» e il tema scuro.

**Decisione**:
- **«Capsula»**: la barra delle schede si stacca dai bordi e diventa una
  capsula di vetro che galleggia, con bordo di luce e ombra morbida; la
  scheda attiva ha una pillola chiara che scivola. I segmenti sono una
  pillola di vetro con l'indicatore in rilievo; nelle card la riga del
  titolo è una lastra di vetro dentro la foto, a 8 pt dal bordo. Raggi:
  card 28, gruppi 24, il resto a capsula. L'header si dissolve in vetro
  allo scroll.
- **Parte A senza blur, via OTA**: il vetro è una velatura del fondo del
  tono a circa 86–92%, più il bordo di luce e l'ombra. Si intravede
  appena: è il prezzo per tenere testo e icone ≥ 4,5:1 sul caso peggiore
  (foto bianca sotto il tono scuro, nera sotto il chiaro). Le icone spente
  della barra passano da `textFaint` a `textMuted`. Colori solo da token
  nuovi in `tokens.ts`; i valori esistenti non cambiano; il giallo mai
  come tinta.
- **Accessibilità**: «Riduci trasparenza» → superfici opache; «Aumenta
  contrasto» → opache col bordo `borderStrong`; «Riduci movimento» → solo
  dissolvenze brevi.
- **Parte B** con `expo-glass-effect` solo in una build dopo l'uscita
  della 1.1.0, col sì dell'utente.

**Conseguenze**: la A arriva in fette piccole dopo l'aggiornamento
completo, prima i token e `src/ui/Glass.tsx`; l'impronta iOS resta
`6f8bba4c`. Niente blur sopra la mappa mentre si registra. `docs/UI.md`
si aggiorna fetta per fetta.

## ADR-0381 — La live in chat e nel Feed, anche programmata: una sola `live_share` per registrazione con più pubblici, le live programmate in `planned_lives`, la schermata dal vivo nell'app che legge ogni 10 s

**Data**: 2026-11-12 · **Stato**: Proposta (parte 0 di TASK-468) ·
**Deciso dall'agente su delega dell'utente** (la tecnica); le scelte di
prodotto sono dell'utente, in `tasks/TASK-468.md`. Estende ADR-0352.

**Contesto.** «Share live» (TASK-424) fa solo un link per una pagina web.
L'utente vuole mandare la live anche nella chat dell'app, metterla nel
Feed (follower o tutti, scelto a ogni live) e programmarla in anticipo
(una gara), sempre per scelta sua.

**Decisione.**

1. **Una `live_share` per registrazione, più pubblici.** Link, chat e Feed
   sono modi di vedere la stessa condivisione, non condivisioni diverse:
   oggi un link nuovo ferma quelli non finiti dello stesso account, e così
   resta. Nuove colonne: `audience_feed` (`none`/`followers`/`everyone`),
   `heart_visible` (falso di partenza: il battito non esce verso chat e
   Feed se non è acceso; il link di TASK-424 lo mostra come oggi); il
   token del link diventa facoltativo (si fa al primo «Share link»).
   `live_share_recipients` (share, account) per le persone scelte in chat.
2. **Vedere nell'app**: `GET /live-shares/{id}?after=<seq>` col token
   d'account, stessa forma di `LiveView` (battito `null` se spento). Può
   vedere chi è fra i destinatari, chi segue il proprietario se
   `followers`, chiunque abbia un account se `everyone`; mai attraverso un
   blocco o un nascosto (`follows.apart_sql`). Chi non può: `404`, come
   una live che non c'è. Stesso limite di richieste per live del `GET
   /live`.
3. **In chat**: `POST /me/live-shares/{id}/send` con fino a 20
   `public_id`; per ciascuno un messaggio con `live_share_id` (colonna
   nuova di `messages`, `ON DELETE SET NULL`) e un testo di ripiego («Follow
   my activity live on MuW»), così un'app di prima mostra il testo. Le
   regole di `messages.py` restano (richieste, filtro, 20 al minuto); la
   push è un `MessagePushKind` nuovo, `live`.
4. **Le live programmate**: `planned_lives` (proprietario, sport, titolo,
   `starts_at`, `audience_feed`, `heart_visible`, percorso facoltativo,
   `live_share_id`, `post_id`, stato `planned`/`live`/`ended`/`deleted`) e
   `planned_live_reminders` (account, live). La scheda entra nel Feed come
   quella delle corse di gruppo (`group_runs.py`). Alla partenza (dal
   foglio all'avvio o da «Start live») la `live_share` si lega alla
   programmata e parte la push «{name} is live» a chi ha chiesto «Remind
   me». Una programmata non partita entro 3 ore dall'ora prevista diventa
   `ended`.
5. **Alla fine diventa il post**: al salvataggio l'app chiede «Post it in
   the Feed?»; con sì il post dell'attività si salva come oggi e
   `planned_lives.post_id` lo lega, e la scheda della live nel Feed lascia
   il posto al post. I punti dal vivo si cancellano comunque un'ora dopo
   la fine (ADR-0352): il post tiene la traccia salvata della corsa, non i
   punti della live.
6. **Niente WebSocket né dipendenze nuove**: la schermata dal vivo
   nell'app chiede ogni 10 s come la pagina web, con la mappa che l'app
   ha già. Una migrazione, numero provvisorio `0074`.
7. **Ordine**: il server esce prima dell'app (`extra="forbid"`); niente
   OTA di produzione fino all'aggiornamento completo.

**Conseguenze.** La posizione esatta esce verso follower, tutti o le
persone scelte: una frase nuova nella privacy dell'app e del sito, App
Privacy e Data safety da rivedere, ogni live accesa solo da una scelta
esplicita. Il link di TASK-424 non cambia.
- ADR-0369 — La corsa su misura nelle schede della palestra: un campo `runner` facoltativo nel programma, i ritmi dal telefono, la proposta a fine ciclo dalle corse salvate · 2026-11-11 · Accettata

## Voci nuove

## ADR-0369 — La corsa su misura nelle schede della palestra: un campo `runner` facoltativo nel programma, i ritmi dal telefono, la proposta a fine ciclo dalle corse salvate

**Stato**: Accettata · 2026-11-11 · TASK-452: PR1 server e tipi (#1158,
`30407b83`, sul server al passo 9 del 2026-11-12), PR2 l'app (#1159,
`881489fd`). Le scelte di quello che si vede sono dell'utente, una alla
volta sulle schermate D1–D3 della tela («Così, nella guida», «Sì, così»,
«Dalle mie corse», «Chiedi prima», «Approvo», «Sì, procedi»); il modo è
deciso dall'agente su delega dell'utente, numero dal Coordinatore.

**Contesto**: i giorni di corsa delle schede (ADR-0363) avevano distanze
uguali per tutti e nessun ritmo. L'utente ha chiesto di chiedere il ritmo
sui 10 km e il lungo di ognuno e fare piani su misura.

**Decisione**:
- **Un campo, nessuna migrazione**: il programma ha `runner` facoltativo,
  `pace_10k_s` (180–900) e uno solo fra `long_m` (1–60 km) e `long_s`
  (10 min–6 h). Sta nel JSONB `program` di `gym_plans` (0066), lo valida
  `gym_plans.py` (`GymPlanRunnerBody`).
- **I ritmi li calcola il telefono** (`gym/runPace.ts`): lenta +65 s/km,
  lungo +75 s/km, ripetute per lunghezza (200 m −30, 400 m −25, 800 m −15,
  1000 m −10, a tempo −20). Il lungo parte dal suo e, con `runner`, cresce
  di 1 km (o 5 min) a settimana, l'ultima settimana di un ciclo di 3 o più
  all'80% (`runInWeek(..., personal)`); la lenta è circa metà del lungo,
  almeno 3 km (20 min).
- **La stima dalle corse**: a fine ciclo (l'ultima settimana) le corse
  salvate delle ultime 4 settimane da 3 km in su, già nella lista che l'app
  ha (`useActivitiesDoor().list`), senza chiamate nuove; il ritmo sui 10 km
  dalla migliore con Riegel (t₂ = t₁·(d₂/d₁)^1.06), il lungo dalla più
  lunga. Proposta solo se più veloce di almeno 5 s/km, una volta a ciclo
  (`gym-pace-asked.json` sul telefono); cambia la scheda solo col sì.
- **Due PR**, come per ADR-0363: lo schema vieta i campi in più (`422`),
  quindi il server prima dell'app.

**Cosa vede l'app di prima** (OTA 8): legge un programma con `runner` (la
sua `isGymProgram` non lo guarda) e mostra le distanze scritte; se salva la
scheda, lo copia così com'è.

**Conseguenze**: la stima vale solo per chi salva le corse nell'app; i
ritmi sono indicativi, non vengono dal battito. I testi e le scelte in
`docs/tasks/TASK-452.md`; il comportamento in `sports/gym.md`; il contratto
in `API.md`.
- ADR-0343, precisazione A — La carrozzina nel motore, nel contratto e nell'API: la rete `wheel`, le forme dell'attività in `Activity.shapes`, i record su 1 e 5 km, il profilo nascosto nell'app · 2026-11-12 · Attiva

## Voci nuove

## ADR-0343, precisazione A — La carrozzina nel motore, nel contratto e nell'API: la rete `wheel`, le forme dell'attività in `Activity.shapes`, i record su 1 e 5 km, il profilo nascosto nell'app

**Stato**: Attiva · 2026-11-12 · TASK-414 A (#1183, `f614821c`). Deciso
dall'agente su delega dell'utente; lista dei file e migrazione 0071
approvate dal Coordinatore. ADR-0343 (archiviato) passa a «Accettato»: le
scelte dell'utente del 2026-11-08 sono in `main`, tranne l'app (parte B).

1. **Una rete sua, `wheel`** (`networks/wheel.py`): il download della rete
   foot (stesso filtro, stessa cache di Overpass) con i tag di
   accessibilità in più (`kerb`, `wheelchair`, `smoothness`, `incline`,
   `sidewalk`), poi le regole di `wheelcalm` del banco della parte 0
   (`rollable`, `blocks_wheels`: niente scale, cordoli alti, superfici
   ruvide, sentieri senza superficie, pendenze scritte oltre l'8%, strade
   grandi senza marciapiede) e quelle della rete foot di TASK-421. Sui 30
   download grezzi della parte 0 ha gli stessi km e le stesse vie della
   rete del banco.
2. **Le forme dell'attività**: un campo nuovo `Activity.shapes` (None =
   tutto il catalogo). `wheelchair` ha cerchio, cuore, stella e luna;
   `models.py` rifiuta con `invalid_request` ogni altra forma, le parole,
   le immagini, i contorni e i tratti, col messaggio «wheelchair draws only
   these shapes: …». Nessuno sport di prima cambia.
3. **Lo sport nei registri**: `wheelchair` (1–5 km) dopo `snowshoeing` in
   `ENGINE_ACTIVITIES`, `PLANNED_SPORTS`, `RunActivity`,
   `reads.NEWER_ACTIVITIES` e nel gioco come una camminata
   (`game_rules.ON_FOOT`, `RULES_VERSION` resta 3). Strava `Wheelchair`,
   GPX `wheelchair`; zone di 8,5 × 8,5 km coi nomi delle strade, una in
   memoria (da 2 a circa 170 MB, `sports/wheelchair.md`).
4. **Record su 1 e 5 km** (scelta 7), con 25 km/h come tetto di un passo,
   come un salto del GPS a piedi. Ogni corsa salvata scrive anche i record
   `wheelchair` in `run_bests`: la migrazione `0071_wheelchair.sql`, che
   allarga i vincoli di `runs`, `favorites`, `group_runs` e `run_bests`
   rileggendoli (come la 0055), va applicata prima che giri il codice
   nuovo.
5. **L'impronta**: il registro la cambia senza cambiare un percorso. Tre
   righe in `SAME_ROUTES_AS` (`e0834d054b6e → 427ed1a16a97`,
   `1063cc95fea3 → d943bfbe8c44`, `4c549677eefb → f54db2ee707d`) con la
   prova `e0834d054b6e.json` (i nove percorsi fissi identici): nessun
   `draw_examples`. Sul server: `e0834d054b6e 8ab61d8e87f9 b9d00c37d28d
   574fbfba41eb`.
6. **Il profilo nell'app è nascosto** fino a B: nessuna riga in
   «Impostazioni», fuori dalla ricerca (`searchFilters.NOT_YET`); nome in
   inglese, calorie della camminata, Apple Salute `.wheelchairWalkPace`
   (70), Health Connect 82. Solo JavaScript e i file del Watch generati:
   l'impronta iOS non cambia.

## ADR-0366 — Le parole del catalogo a penna alzata: `walks` nel seme e nel dettaglio, `gaps` nelle liste, entrano solo quelle lette a occhio

**Stato**: Attiva · 2026-11-12 · TASK-441, parte B1 (#1184 il server, #1185
l'app). L'utente ha chiesto di rifare a penna alzata tutte le parole del
catalogo («si procedi e ifalle», poi «Sì, rifai il giro» sulla pagina di
prova) e ha approvato le 340 che entrano («Sì, vanno bene», viste le due
pagine e il campione grande). Le scelte tecniche sono dell'agente su delega
dell'utente.

**Contesto**: le 702 parole a riga unica della parte A avevano le lettere
unite e non si leggevano: tolte lo stesso giorno (ADR-0347, precisazione
C). Gli esempi di città scrivono le parole a penna alzata, tonde, 3 km a
lettera, e si leggono. Il seme del catalogo non aveva dove tenere i tratti
fra le lettere, e le schede delle liste disegnano una riga sola.

**Decisione**:

- **Il metodo degli esempi di città**: ogni parola del catalogo è tonda, a
  penna alzata, 3 km a lettera, da 2 a 6 lettere (a 7 la somiglianza resta
  sotto 0,90 dovunque). Le 55 parole a riga unica di prima escono.
- **`walks` nel seme e nel dettaglio**: coppie di indici dei punti, in
  ordine, dei tratti camminati fra le lettere; `catalog_seed._route_body`
  li scrive solo quando ci sono e `GET /recommended-routes/{id}` li dà
  uguali. È lo stesso campo del risultato di un percorso: l'app lo leggeva
  già.
- **`gaps` nelle liste**: l'anteprima di una parola è fatta lettera per
  lettera (fino a 32 punti a lettera, i tratti fuori) e `gaps` dice dove
  una lettera finisce. È il campo che `RouteCard` leggeva già.
- **I due campi mancano, non sono `null`**, in un percorso a riga unica: la
  sua risposta resta identica byte per byte e i contratti di prima non
  cambiano.
- **Il filtro non basta, si legge a occhio**: per le parole il filtro
  guarda la lunghezza del solo disegno (±10%), la somiglianza e le strade,
  ma entra nel catalogo solo la chiave scritta in
  `tools/catalog_pen_up_read.json`, cioè una parola letta alla grandezza di
  una scheda, dritta e senza il nome sotto, in cui ogni lettera si
  riconosce.
- **L'app chiede di nuovo `pen_up`** quando un disegno del catalogo ha
  `walks` («Use this route» ridà una parola dello stesso tipo).

**Motivo**: la somiglianza del motore è la media di quanto ogni lettera è
coperta: a Nizza YES a 0,99 non si legge, a Levico HI a 0,94 nemmeno. Una
soglia più alta non le separa (mediana 0,98 delle tenute contro 0,94 delle
scartate, ma si sovrappongono). Riusare `walks` e `gaps` non chiede
contratti nuovi né codice nuovo nelle schede.

**Conseguenze**: 761 parole passano il filtro, **340 entrano** (60, 117,
132, 22 e 9 da 2 a 6 lettere; 83 parole diverse in 59 città). Il catalogo
va a **1546 percorsi** (1206 forme, 340 parole): 24,7 MB di file, +166 MB
residenti. Da Milano «NEAR YOU» dà 60 percorsi con 50 nomi diversi, 19 a
penna alzata. Un'app senza l'OTA della #1185 unisce le lettere con un
tratto dritto sulle schede (la mappa le mostra già staccate): **server e
OTA escono insieme**, nell'aggiornamento completo. «Edit the drawing»
prende una parola a pezzi come una riga sola, tratti compresi: modificarla
lettera per lettera non si può, come per gli esempi di città. Una parola
nuova vuole di nuovo la lettura a occhio: è lavoro a mano, e a 5–6 lettere
ne resta una su cinque.

## ADR-0361, precisazione — Com'è stato costruito il primo percorso: senza `?first=1` il campo non c'è, il primo tiene la sua distanza migliore, i test dell'app che fingono il server ignorano il parametro

**Stato**: Attiva · 2026-11-12 · TASK-435, parti A (#1105), B (#1139) e C
(#1161) in `main`. Deciso dall'agente su delega dell'utente, costruendo;
le scelte di prodotto restano quelle di ADR-0361.

1. **Senza `?first=1` il campo `first` non c'è**, non è `null` (ADR-0361
   diceva «`null` di norma»). Il job letto con `?first=1` è un tipo a sé,
   `RouteJobWithFirstBody` nell'API e `RouteJobWithFirst` in
   `packages/shared-types`; `RouteJob` e `RouteJobBody` restano com'erano.
   Perché: il corpo per un'app non aggiornata resta quello di prima campo
   per campo, e i controlli del contratto (`contract.test.ts`,
   `test_contract.py`) confrontano i campi di `RouteJob` con le risposte
   d'esempio: un campo in più lì li faceva fallire.
2. **Il pianificatore chiama `plan_nearby` come prima quando nessuno
   mostra il primo percorso** (`images._plan_nearby`): `on_first` passa
   solo se la sorgente del job lo sa mostrare (`job_times.ShowsFirst`).
   Mostrarlo non fa mai fallire il job: un errore lì si scrive nel log e il
   job va avanti fino alla risposta intera.
3. **Nell'app il primo percorso tiene la sua `better_distance_m`**, e gli
   altri non ne hanno, come le alternative del motore (`choices.withFirst`):
   la riga «This shape comes out better at…» non cambia quando arrivano le
   schede. Un primo percorso che non si può disegnare vale come nessuno.
   Se l'utente annulla dopo il primo, lo stato torna vuoto come per ogni
   annullamento.
4. **Un server di prima ignora `?first=1`**: provato sul codice del commit
   in produzione prima del passo 8 (`2ed26af7`), che risponde come senza
   parametro. Quattro test dell'app (`__tests__/AppBikeNavigation`,
   `AppEditDrawing`, `AppEditRun`, `AppFavoriteActivity`) fingevano un
   server che rispondeva alla lettura del job solo all'indirizzo esatto:
   ora ignorano il parametro, come fa il server vero.
5. **Misure** (`tasks/TASK-435.md`, «Parte D»): sul Mac 0,8 s in mediana
   coi 2 processi caldi; sul server 2,7 s nella prova dopo il passo 8, e
   `wait` 2,9 s in mediana su 22 job di prima del passo.

## ADR-0379 — Il punteggio del sonno di MuW: calcolato sul telefono dai campioni di sonno di Apple Salute (durata 50, regolarità 30, interruzioni 20), perché HealthKit non espone quello di Apple

**Stato**: Attiva · 2026-11-12 · TASK-467 parte A in `main` (#1193,
`665e408c`): solo
funzioni pure, nessuna schermata le usa ancora. Che cosa si vede e si
pubblica è dell'utente (parte 0 di `tasks/TASK-467.md`, 2026-11-11: «Sì,
punteggio MuW», le cinque fasce, le fasi nel post); la formula, le soglie
e il modo sono decisi dall'agente su delega dell'utente, numero dal
Coordinatore.

**Contesto**: l'utente ha chiesto il 2026-11-11 di pubblicare su MuW il
punteggio del sonno di Apple Salute. Quel punteggio non si può leggere:
HealthKit non ha un tipo per lui (header dell'SDK iPhoneOS 27.0
controllati il 2026-11-12; un ingegnere Apple lo conferma sul forum
sviluppatori, settembre 2025). Si leggono i campioni da cui nasce
(`HKCategoryTypeIdentifierSleepAnalysis`), e Apple dice in pubblico le tre
parti del suo punteggio e i loro pesi, non le soglie.

**Decisione**:

1. **Il punteggio si calcola sul telefono**, in `apps/mobile/src/health/`,
   con funzioni pure e test deterministici. Al server non arrivano mai i
   campioni: solo il riassunto che l'utente pubblica (parte B).
2. **La notte** (`sleepNight.ts`): le sorgenti sovrapposte si uniscono
   senza contare due volte (fase detta › sveglio › sonno senza fase; fra
   le fasi la più profonda); un silenzio di più di 60 minuti separa i
   tratti; la notte è il tratto con più sonno, da quando ci si addormenta
   all'ultimo risveglio; il tempo senza campioni dentro la notte conta
   come sveglio; sotto i 60 minuti di sonno non c'è notte. «A letto» non
   conta. Il «Core» di Salute è `light`.
3. **Il punteggio** (`sleepScore.ts`), intero da 0 a 100, con i pesi di
   Apple e soglie di MuW, in linea retta fra gli estremi:
   - durata, 50: zero fino a 240 minuti di sonno, tutti da 480;
   - regolarità, 30: lo scarto fra l'ora in cui ci si addormenta e la
     mediana di quelle delle notti prima, come ora del giorno: tutti entro
     15 minuti, zero da 120;
   - interruzioni, 20: i minuti svegli nella notte: tutti fino a 5, zero
     da 60.
4. **Senza storia**: con meno di 3 notti prima la regolarità non si sa, e
   il punteggio sono le altre due parti portate a 100.
5. **Le fasce** sono quelle dell'utente: 0–39, 40–59, 60–74, 75–89,
   90–100.

**Alternative scartate**: leggere il punteggio di Apple (non c'è l'API);
calcolarlo sul server (porterebbe i campioni di Salute fuori dal
telefono); contare il numero dei risvegli invece dei minuti svegli (gli
orologi scrivono risvegli di pochi secondi, il numero cambia da un
orologio all'altro); un obiettivo di sonno per persona al posto delle 8
ore (MuW non lo chiede a nessuno).

**Conseguenze**: il numero può differire di qualche punto da quello
dell'app Salute, e nell'interfaccia non si chiama mai «di Apple». Un
giorno vale 24 ore: le notti prima di un cambio d'ora leggono un'ora di
scarto nella regolarità. Cambiare una soglia cambia i punteggi delle notti
non ancora pubblicate; quelli pubblicati restano com'erano, perché al
server va il numero e non i campioni. Non è una misura medica.

## ADR-0376 — Il muscolo allenato su una sagoma accanto all'omino della palestra: la tabella esercizio → muscoli nell'app, il corpo fatto di `View`, un token `muscle`

**Stato**: Attiva · 2026-11-11 · TASK-465 in `main` (#1173, `55c98f8b`),
solo app; esce con l'aggiornamento completo dell'app, niente server. Le
scelte di quello che si vede sono dell'utente (2026-11-11, una domanda
alla volta: «B, sagoma accanto», «Tutti e tre», «Anche i secondari»; i
nomi «Sì, vanno bene»; gli screenshot «Vanno bene»); il modo è deciso
dall'agente su delega dell'utente, numero dal Coordinatore.

**Contesto**: l'utente l'11 novembre 2026: «sulla palestra fai vedere
sull omino in un altro quale muscolo alleni». L'omino di un esercizio
(TASK-411 E, ADR-0341) è fatto di `View`, sette ossa e il carico in
giallo; il catalogo (`catalog.ts`, `gym_catalog.py`, la fixture
`gym-exercises.json`) sa solo il gruppo di un esercizio, non il muscolo.

**Decisione**:
- **Una sagoma del corpo accanto all'omino**, ferma, non un colore
  sull'omino che si muove (scelta dell'utente). Si vede nella guida,
  accanto all'esercizio in corso, nei riquadri di un gruppo e nelle righe
  della ricerca (scelta dell'utente: «Tutti e tre»).
- **La tabella esercizio → muscoli sta nell'app** (`gym/muscles.ts`,
  `MUSCLES_OF`), come quella dei movimenti (`MOVE_OF`): 17 muscoli (8
  davanti, 9 dietro), per ogni esercizio uno o più principali e zero o più
  secondari. Serve solo a disegnare: nessun campo nel contratto, nessuna
  migrazione, niente sul server.
- **I nomi dei muscoli e le quattro parole** («Main muscles», «Also»,
  «Front», «Back») nelle cinque lingue stanno nello stesso file, come i
  gruppi in `groups.ts`, non nei file di `i18n`.
- **Il corpo è fatto di `View`** (`gym/MuscleMap.tsx`), senza
  `react-native-svg` né altre dipendenze: blocchi arrotondati in una
  scatola 40 × 104, scalati all'altezza chiesta.
- **Pieno o contorno, mai solo il colore**: il corpo è un contorno vuoto,
  un muscolo principale è pieno, uno secondario ha il contorno spesso;
  dietro la testa è piena, così i due lati si distinguono anche in piccolo.
- **Piccola, un lato solo**: quello del primo muscolo principale, e solo i
  principali di quel lato; il lettore di schermo li dice tutti. **Nella
  guida** davanti e dietro, i secondari, e sotto i nomi scritti (la figura
  lì è nascosta al lettore di schermo: lo dicono le parole).
- **Un token nuovo `muscle`** in `theme/tokens.ts`, un rosa nei due toni
  (`#FF6FB5` nel tema scuro): giallo, rosso, azzurro e blu nell'app hanno
  già un significato. `palettes.test.ts` chiede 3:1 su sfondo, carta e
  controllo a ogni passo di luminosità.
- **I test tengono la tabella intera**: ogni esercizio del catalogo ha un
  principale, nessun muscolo sconosciuto o doppio, nessuna chiave fuori
  dalla fixture condivisa, il primo principale sta nel gruppo
  dell'esercizio (`wall_sit` a parte).

**Alternative scartate**:
- *Il muscolo in un altro colore sullo stesso omino* (la proposta A):
  l'utente ha scelto la sagoma; sette ossa non bastano a dire petto o
  dorsali.
- *I muscoli nel catalogo del server* (`gym_catalog.py`, la fixture):
  contratto e server da cambiare per un dato che serve solo al disegno;
  si può fare dopo, se servirà altrove.
- *`react-native-svg` o immagini*: una dipendenza nativa nuova (l'impronta
  iOS cambierebbe) o file da tenere per tema e per muscolo.
- *I secondari anche nelle sagome piccole*: a 18 pt di larghezza un
  contorno non si legge.

**Conseguenze**: chi aggiunge un esercizio al catalogo aggiunge la sua
riga in `muscles.ts` (`muscles.test.ts` lo dice); la tabella ha già i
quattro esercizi di TASK-461 A1. Un esercizio col nome libero non ha
sagoma, come non ha omino. In un gruppo come «Chest» le sagome piccole
sono tutte uguali: l'utente l'ha visto negli screenshot. Solo JavaScript.
Dettagli in `tasks/TASK-465.md`.

## ADR-0377 — Risposte e reazioni ai commenti: una risposta è una riga di `comments` a un livello solo, le cinque emoji in `comment_reactions`, la lista piatta per le app di prima, la reazione solo nella campanella

**Stato**: Accettata · 2026-11-12 · TASK-454 parte C1 in `main` (#1180,
`02214e9b`, migrazione `0070_comment_replies.sql`); sul server col
prossimo passo del Coordinatore, col sì dell'utente; l'app è la parte C2.
Le scelte di quello che si vede sono dell'utente (2026-11-11, una domanda
alla volta: «Sì adesso, dentro TASK-454», «Un solo livello», «Le sei
reazioni anche qui» poi «Sui commenti solo le cinque emoji», «Risposte sì,
reazioni solo nella campanella»); il modo è deciso dall'agente su delega
dell'utente, numero dal Coordinatore.

**Contesto**: nella prova del lato social dell'11 novembre 2026 (S3 e S4
di `out/prova-app-2026-11-11/PROPOSTE.md`) l'utente ha chiesto di
rispondere a un commento e di reagirci. Sotto un disegno c'erano solo
commenti in fila (ADR-0193) e le sei reazioni al disegno.

**Decisione**:
- **Una risposta è una riga di `comments`** con `parent_id`: controlli,
  filtro delle parole, limite al minuto, segnalazione, `hidden_at`, blocchi
  e cancellazione sono quelli dei commenti, senza codice a parte.
  Cancellare un commento cancella le sue risposte e le reazioni
  (`ON DELETE CASCADE`).
- **Un livello solo, tenuto dal server**: `reply_to` in `POST
  /drawings/{id}/comments` può essere un commento o una risposta;
  `parent_id` è sempre il commento in cima. Chi si nomina («@nome») è una
  colonna (`mention_user_id`) e un campo (`mention`), non testo scritto
  dall'app: il testo resta quello dell'utente, il nome segue un cambio di
  username e sparisce per chi ha bloccato quell'iscritto.
- **Due modi di leggere, uno per le app di prima**: senza `threads` la
  lista è piatta e per data, risposte comprese; `?threads=true` dà i
  commenti con le due risposte più vecchie (`REPLIES_SHOWN`) e
  `reply_count`, le altre da `GET /comments/{id}/replies`. I campi nuovi
  sono tutti facoltativi: un test («an app from before reads the list it
  knew») tiene fermo quello che un'app di prima legge.
- **Una risposta si legge col suo commento**: chi non legge il commento in
  cima (blocco, nascosto) non legge le risposte sotto, e non contano in
  `total`.
- **Le reazioni ai commenti in una tabella loro**, `comment_reactions`:
  cinque codici (`fire`, `clap`, `strong`, `laugh`, `wow`; niente
  `super_like`), una per iscritto e commento. Si leggono dentro ogni
  commento (`reactions`: `counts`, `total`, `mine`), senza una richiesta in
  più per riga, e si scrivono con `PUT`/`DELETE /comments/{id}/reaction`.
- **Avvisi**: `comment_reply` a chi ha scritto il commento o la risposta a
  cui si risponde, con la notifica sul telefono se «Push notifications» è
  acceso (`users.notify_push`, l'unico interruttore che c'è); il
  proprietario del disegno riceve il solito `comment`, ma non quando è lui
  quello a cui si risponde. `comment_reaction` passa solo agli ascoltatori
  di `push.py` (`BELL_ONLY`): la campanella la tiene, nessun telefono
  suona. Nessuno dei due entra nell'email delle notizie.

**Scartato**: nascondere le risposte alle app di prima (la notifica
aprirebbe un disegno dove la risposta non c'è); riusare la tabella
`reactions` con una colonna in più (chiave e vincolo dei sei tipi sono del
disegno, e i concorsi contano i `super_like` di quella tabella); il nome
di chi si nomina scritto nel testo (non seguirebbe un cambio di username
né un blocco).

**Conseguenze**: il contratto in `API.md` «Risposte e reazioni ai
commenti»; tabelle e migrazione in `DATABASE.md`; gli esempi
`fixtures/comment-reply*.json`, `comment-threads.json`,
`comment-reaction*.json`, controllati dall'API e da `shared-types`. Gli
esempi di prima (`comment.json`, `comment-request.json`,
`reaction-result.json`) restano com'erano e sono ora una parte del corpo,
non tutto. La frase della privacy sulle reazioni ai commenti si aggiorna
con la parte C2, col sì dell'utente. Il controllo dopo il passo sul server
in `out/TASK-454/SERVER-C1.md`. I dettagli in `tasks/TASK-454.md`.

## ADR-0374 — Le zone a piedi calde nei processi di calcolo: un tetto in MB invece di 2 zone, le più usate rilette all'avvio in background

**Stato**: Accettata · 2026-11-11 · TASK-464 (#1167, in `main` dal
2026-11-12; sul server col passo 9). Deciso dall'agente
su delega dell'utente («solo percorsi identici», TASK-445), col via del
Coordinatore.

**Contesto.** TASK-445 ha misurato che leggere la zona dal disco costa
0,6 s sul Mac (pickle da 19 MB di Trento) e 0,5–3,3 s sul server, in circa
un percorso calcolato su quattro. Le cause, dal codice e dai log:
- ognuno dei 2 processi di calcolo (ADR-0242) ha le sue zone;
- vince la zona più piccola che copre la richiesta, quindi una città ha
  molte zone (960 zone a piedi), e un processo ne teneva 2 (`MAX_ZONES`);
- dopo ogni aggiornamento del server i processi ripartono vuoti.

**Decisione.**

1. Un modulo nuovo, `services/api/shaperoute_api/warm_zones.py`, solo per
   la rete a piedi (corsa e camminata) e solo nei processi di calcolo:
   `__main__.py` dà loro `partial(warm_graphs, cache_dir, zones_mb)`. Il
   processo principale dell'API e gli altri sport restano come prima.
2. **Un tetto in MB.** Ogni processo tiene le zone a piedi fino a
   `SHAPEROUTE_ZONES_MB` (default 500, al massimo 16 zone). Una zona è
   stimata 12 volte il suo pickle (TASK-276: Trento più Milano, 893 MB).
   Ne restano comunque almeno 2 come prima: nessuna zona si rilegge più
   spesso di prima. Un valore sbagliato ferma l'API all'avvio.
3. **Le zone usate, contate** in `data/cache/zone-usage/running.json`:
   scrittura atomica (file accanto, poi `os.replace`) sotto `flock`, per
   due processi insieme. Un file mancante, rotto o non scrivibile non fa
   mai fallire un percorso.
4. **Precarico all'avvio in background.** Ogni processo rilegge le zone più
   usate in un thread suo, finché ci stanno nel tetto: risponde subito al
   primo percorso. Un percorso che vuole una zona in lettura aspetta quella
   lettura invece di rifarla. Le zone precaricate escono per prime.
5. **Percorsi identici.** Zona scelta (`covering_path`), letta
   (`read_graph`) e ritagliata (`ZoneCrop`) come prima: cambia solo quando
   si legge. `test_warm_zones.py` controlla lo stesso grafo e lo stesso
   piano in un processo di calcolo vero; il motore non cambia, quindi
   `test_same_routes` resta verde.

**Alternative scartate.**

- Cambiare `graphs.py` o `activity_graphs.py`: sono dentro `engine.zip`
  del telefono, e cambiarli vorrebbe dire ricostruirlo. Con un modulo
  nuovo si cambia una riga sola di `__main__.py`.
- Usare una zona più grande già in memoria al posto di una più piccola dal
  disco: il ritaglio potrebbe cambiare, quindi i percorsi.
- Una lista fissa di zone in una variabile: invecchia quando le zone si
  rifanno, e va tenuta a mano.
- Un tetto alto da subito (1000 MB, ~+1,2 GB in tutto): i figli delle
  partenze vicine partono solo se c'è memoria (`workers_that_fit`), quindi
  con meno memoria cambierebbero i percorsi. Il valore del server si
  sceglie dopo il passo 8 dalla memoria vera.

**Conseguenze.** I percorsi e il contratto non cambiano. Col default:
~+0,2–0,5 GB in tutto nel caso tipico; il caso peggiore (2 zone grandi)
resta quello di prima. Nel log compaiono `zone … warmed` e `N zones
warmed`. Per tornare indietro senza rifare l'immagine basta
`SHAPEROUTE_ZONES_MB=0`: restano 2 zone e non si precarica niente. Le
letture per il dopo sono in `out/TASK-464/SERVER.md`.

## ADR-0372 — Il calendario di tutte le attività: `GET /me/activity-calendar` letto da `runs` e `run_stats`, i 12 mesi e gli sport dell'account nella stessa risposta, nessuna migrazione

**Stato**: Accettata · 2026-11-11 · TASK-462 parte A in `main` (#1162,
`279a737a`), sul server col passo 9 del Coordinatore (col sì dell'utente);
parte B, l'app, nella #1172 in bozza. Le scelte di quello che si vede sono
dell'utente, una alla volta dopo un'anteprima («In tutti e due», «Icone nel
mese, dati nel giorno», «Andamento mese per mese», l'alpinismo «Sì,
registrato senza percorso»); il modo è deciso dall'agente su delega
dell'utente, numero dal Coordinatore.

**Contesto**: l'utente ha chiesto il 2026-11-11 «un calendario dove vedi
tutte le attività fatte nel profilo con lo storico tempi... tutti gli sport
possibili». Esisteva solo il calendario della palestra (`GET
/me/gym-calendar`, ADR-0341), di un'attività sola; i record personali per
distanza erano già nel profilo (ADR-0312).

**Decisione**:
- **Una rotta di sola lettura, nessuna tabella e nessuna migrazione**:
  `activity_calendar.py`, sul modello di `gym_calendar.py`. Legge `runs`
  con le kcal che il telefono ha mandato (`run_stats.stats->>'kcal'`, `null`
  senza). Un mese sul fuso del telefono (`tz`, nome IANA; `month`
  `YYYY-MM`, questo se manca), `sport` facoltativo (un'attività di una
  corsa, `422` se no).
- **Una risposta sola per la pagina**: i giorni con un'attività (`id`,
  `activity`, inizio, metri, tempo, `kcal`, `tracked`, forma, parola,
  titolo, luogo), le somme del mese, `trend` (i 12 mesi fino a quello
  chiesto, anche vuoti, dello sport chiesto: le barre dello «storico tempi»)
  e `sports` (tutti gli sport dell'account, il più frequente prima: i
  filtri). Così il calendario fa una richiesta per mese.
- **Lo storico è una somma, non un calcolo nuovo**: tempo, km e numero per
  mese; sotto le barre l'app mostra i record che ci sono già
  (`personal_bests`), filtrati per sport.
- **Solo ciò che l'app legge** (`X-MuW-Reads`, `reads.py`), come «My
  activities»: un giorno non mostra mai un'attività che la lista non
  aprirebbe. `tracked` dice se c'è una traccia: una nuotata in piscina non
  apre una mappa.
- **Due PR**: A (server e tipi) in `main` e sul server, poi B (l'app), che
  con un'API senza la rotta (404) non mostra niente nel profilo.

**Fuori**: l'alpinismo come sport nuovo è TASK-463 / ADR-0373, con la sua
migrazione; il calendario lo mostrerà da solo quando sarà uno sport del
registro.

**Conseguenze**: il contratto in `API.md` «Il calendario delle attività»;
l'esempio `fixtures/activity-calendar.json`, controllato dall'API e da
`shared-types`; il controllo dopo il passo sul server in
`out/TASK-462/SERVER.md`. I dettagli in `tasks/TASK-462.md`.

## ADR-0375 — Il parapendio registrato senza forma, con la condivisione dal vivo e i numeri del volo

**Stato**: Attiva · 2026-11-11 · scelte di prodotto dell'utente; il come
deciso dall'agente su delega dell'utente (TASK-305, parti R; numero e
ordine dal Coordinatore).

**Contesto**: il pianificatore del parapendio (ADR-0265) aspetta una
licenza per gli spazi aerei che non c'è. L'utente il 2026-11-11: un amico
fa una gara e vuole condividere posizione, velocità, battito e calorie in
tempo reale, e tracciare tutto il volo. La condivisione dal vivo (TASK-424,
ADR-0352) e la categoria «Record only» (TASK-375, ADR-0319) ci sono già.

**Decisione**:
- **Il parapendio diventa uno sport «Record only»**, attività
  `paragliding`, prima del pianificatore e senza toccarlo: si registra, si
  condivide dal vivo, si salva, si pubblica. Strava non ha il parapendio:
  il volo ci va come `Workout`.
- **Quattro numeri facoltativi nel live**: `alt_m`, `max_alt_m`,
  `vario_mps`, `speed_mps` in `LiveStatsBody` e `LiveStats` (scelta
  dell'utente: «Sì, numeri del volo»). Con `extra="forbid"` il server
  esce prima dell'app e della pagina.
- **Dalla quota del GPS, senza barometro**: la quota dei fix c'è già
  (TASK-324); il variometro è la pendenza della quota su 10 s, non fra due
  fix. Un barometro sarebbe più preciso ma è un modulo nativo nuovo.
- **Le calorie** con la formula di ADR-0352 C2 e il MET 3,5 del volo
  libero (Compendium, «hang gliding»).
- **Nessuna guida in volo**: l'app mostra numeri, non direzioni; un
  avviso breve al primo volo registrato, testo dell'utente.
- **Il battito dal vivo** resta quello dell'orologio (ADR-0352): senza il
  parapendio nell'app dell'orologio un volo non ha battito; è una parte a
  sé (R4, nativa, dopo la 1.1), da proporre.

**Alternative scartate**:
- *Registrare il volo come un altro sport* (escursione, bici): numeri,
  calorie e Feed sbagliati, e la quota non arriva al link.
- *Aspettare il pianificatore*: la licenza degli spazi aerei non ha una
  data.
- *Solo i numeri di oggi sul link*: l'utente ha scelto i numeri del volo.

**Conseguenze**: tre parti (R1 server e contratto con una migrazione che
allarga `runs_activity_check`, R2 app, R3 pagina `site/live/`), ognuna
col sì dell'utente per server, OTA e sito. Un'app vecchia non riceve i
voli (`X-MuW-Reads`). Dettagli in `tasks/TASK-305.md`, «Le parti R».

## ADR-0344, precisazione B — Fasi, cambi pelli e VAM sul telefono sopra i tratti della neve; il pannello sopra la scheda della corsa

**Stato**: Attiva · 2026-11-11 · TASK-415 parte B (#1160, `c378cd69`).
Deciso dall'agente su delega dell'utente, dentro le scelte dell'utente del
2026-11-07 (metriche, «Acceso con a e b»); lista dei file approvata dal
Coordinatore, testi e schermate approvati dall'utente l'11-11.

**Decisione**:

1. **Un modulo puro e generico**, `activities/mountainPhases.ts`: legge la
   traccia coi tratti di `snowDay.ts` (`legs`, `isLift`, `droppedM`,
   esportati con una svolta facoltativa `turnM`; lo sci non cambia) e una
   svolta di 20 m. Un tratto che sale ed è un impianto è **risalita**, che
   sale e non lo è **salita**, che scende di almeno 30 m **discesa**; il
   resto si unisce alla fase vicina, e due fasi uguali vicine sono una.
2. **Un cambio pelli** sta fra una salita e ciò che non lo è: le
   posizioni ferme attorno alla svolta (sotto 0,5 m/s sull'orologio del
   telefono, pause comprese, entro 50 m di quota), almeno 90 s. «Pelli
   tolte» dopo una salita, «Pelli messe» prima.
3. **La VAM** è metri saliti (a passi di 3 m, come `climbM`) sul tempo in
   movimento: i passi sotto 0,2 m/s e le pause non contano. In gita: gli
   ultimi 5 minuti, solo in salita e dopo 2 minuti di salita. Il D+ conta
   le salite (non gli impianti), il D− le discese.
4. **In gita**, «Cambio pelli» quando la gita è ferma da 90 s, o in pausa,
   vicino alla quota della svolta; altrimenti la fase in corso.
5. **Dove sta**: lo sport in «Settings» è `skimo`, salvato come
   `ski_touring`, pronto. La fine gita è una scheda sua
   (`SkiTourFinishCard.tsx`), il pannello sta sopra la scheda della corsa
   in `FreeRunScreen.tsx` come `DayResort` per lo sci (`SkiTourLive.tsx`):
   `RunDashboard.tsx` non cambia. Due caselle per riga, perché le
   etichette in italiano e tedesco sono lunghe.

**Conseguenze**: solo app; impronta del motore `427ed1a16a97 8ab61d8e87f9`
e impronta iOS `6f8bba4c` invariate; nessun invio nuovo al server (le fasi
nel post sono la B2, in `run_stats`). Le soglie si tarano su una gita vera
(parte E): una sosta lunga a metà salita può sembrare un cambio. Hike e
ciaspole possono usare lo stesso modulo.

## ADR-0342, precisazione A2 — Le ciaspole nel contratto e nell'API: nessun percorso sulla neve tenuto, le quote dal disco a ogni richiesta, il profilo nascosto nell'app

**Stato**: Attiva · 2026-11-11 · TASK-413 A2 (#1130, `ac08ae94`). Deciso
dall'agente su delega dell'utente; lista dei file e migrazione 0068
approvate dal Coordinatore.

1. **Le ciaspole sono uno sport del contratto.** `snowshoeing` passa da
   `activities.ENGINE_ONLY` (ora vuota) a `ENGINE_ACTIVITIES`, dopo
   `inline_skating`; `SNOWSHOEING` (0,5–3 km) entra in `PLANNED_SPORTS` di
   shared-types, in `RunActivity`, in `reads.NEWER_ACTIVITIES` e nel gioco
   come una camminata (`game_rules.ON_FOOT`), senza record. La migrazione
   `0068_snowshoeing.sql` allarga i vincoli d'attività di `runs`,
   `favorites` e `group_runs` rileggendoli (come la 0055); `run_bests` no.
2. **Niente ancorato sulla neve**: `anchored.check_placement` rifiuta
   `FREE_ACTIVITIES` (acqua e neve), e `way_back` non propone ritorni sulla
   neve.
3. **Nessun percorso sulla neve è tenuto**: né `route_store` né l'archivio
   (`route_archive._kept`). I file della neve stanno fuori dall'impronta
   (`SNOW_ONLY`, ADR-0342 aggiunta 5): un percorso tenuto sopravvivrebbe
   alle regole che l'hanno disegnato.
4. **Neve e quote nella cache del server**, scaricate alla prima richiesta
   di un posto: `ServerSnow` in `<cache>/snow/`, le tegole Terrarium in
   `<cache>/heights/` lette con un `TerrariumTiles` nuovo per richiesta, così
   le tegole decodificate non restano in memoria per ogni posto. Un download
   che non riesce è `503 map_data_unavailable`, come una zona. Il ramo della
   neve è in `activity_graphs.ground_for`, nei job, nei processi caldi
   (ADR-0242) e in `images.plan_request`.
5. **L'errore propone il mezzo km** a cui la forma entra, come sull'acqua
   (`errors.suggested_distance` su `FREE_ACTIVITIES`), e nessuna distanza
   sotto 0,5 km.
6. **L'impronta**: il registro la cambia senza cambiare un percorso. Tre
   righe in `SAME_ROUTES_AS` dopo quelle di TASK-436 (`427ed1a16a97 →
   ca29e58777cb`, `d943bfbe8c44 → c9c2683a72ea`, `f54db2ee707d →
   3984555281d5`) con la prova `427ed1a16a97.json` (i nove percorsi fissi
   identici, darwin-arm64): nessun `draw_examples`.
7. **Il profilo nell'app è nascosto** fino a B: nessuna riga in
   «Impostazioni», fuori dalla ricerca (`searchFilters.NOT_YET`) e dal
   modulo per pubblicare; nome in inglese, niente `caution` né tempo.
   Calorie di Hike (TASK-424 C2), Apple Salute `hiking` (24), Health
   Connect `EXERCISE_TYPE_SNOWSHOEING` (63). Solo JavaScript: l'impronta iOS
   resta `6f8bba4c`.
8. **La città lenta** (fino a 44 s al banco) resta: un controllo «poca neve»
   prima del piazzamento toccherebbe il motore. Se i tempi del server lo
   chiedono, è un passo a parte.
## ADR-0347, precisazione C — Il catalogo a 1963 disegni: i già fatti che passano il filtro, le parole corte per città, l'ordine misto nelle liste

**Stato**: Attiva · 2026-11-11 · TASK-441, parte A (#1149). L'utente ha
chiesto di portare «Explore» a 2000 disegni e ha approvato le liste di
parole e l'ordine misto («Sì, vai»), poi i disegni nuovi dalle due pagine
(«Sì, vanno bene»). Le scelte tecniche sono dell'agente su delega
dell'utente.

**Contesto**: il catalogo aveva 572 percorsi, 55 soli di parole. Il
registro di TASK-419 teneva altri 878 disegni che passavano il filtro e non
erano mai entrati. Su una riga le parole passano il filtro fino a 4 lettere
(a 5 una su cinque, a 6 nessuna).

**Decisione**:

- **I già fatti entrano tutti** quando passano il filtro e sono di una
  parola o di una forma che il motore ha (776; i 102 di contorni non
  registrati aspettano la parte C). Anche la stessa parola nei due stili
  nella stessa città (60 casi).
- **Parole corte, 2–4 lettere, su una riga**, da uno strumento nuovo
  accanto a quello di TASK-419 (`tools/catalog_words.py`, che usa
  `catalog_seed.py` senza cambiarlo): le parole della città, quelle della
  sua lingua, un turno di una lista comune con stagione e parole del
  momento. Ogni parola nei due stili, entra la migliore (615). Nessuna zona
  scaricata: bastano quelle a piedi di `data/cache`.
- **L'ordine misto** (`recommended.varied`): `GET /recommended-routes` e
  ogni città di `GET /catalog` danno prima la migliore di ogni forma e di
  ogni parola, poi la seconda, e così via; dentro un giro vale l'ordine di
  prima (somiglianza, poi distanza). Il tetto di 60 in «NEAR YOU» resta.
- **Niente memoria compatta per ora**: i punti restano tuple (32,6 MB di
  file, +218 MB residenti all'avvio contro +57). Deciso dal Coordinatore
  sui numeri del server; se il catalogo cresce ancora, un `array('d')`.

**Motivo**: i già fatti costavano zero e avevano già passato lo stesso
filtro. Le parole lunghe vogliono la penna alzata, che il formato del seme
non tiene ancora (parte B, ADR-0366). Senza l'ordine misto i 60 disegni
vicino a Milano, che ora ne ha 91, sarebbero quasi tutti cerchi e cuori.

**Conseguenze**: 1963 percorsi in 63 città, 757 di parole (79 diverse). Gli
id dei percorsi tengono il posto nel file e cambiano dove il file cresce,
come a ogni giro di TASK-419: «Feed» ritrova il percorso per città, forma e
lunghezza. I disegni delle parole sono del motore `8ab61d8e87f9`: se un
cambio del motore chiede di rifarli (TASK-447), il giro riparte da
`out/TASK-441/run.sh`. Sul server servono i file del catalogo **e**
l'immagine nuova (l'ordine è codice).

**Corretto lo stesso giorno, prima del server**: guardate nel catalogo, le
parole nuove a riga unica hanno le lettere unite e non si leggono. L'utente
(«Sì, toglile», riferito dal Coordinatore) le toglie tutte e 702, le 615
di questa voce e le 87 dei già fatti, con una PR di correzione
(`fix/TASK-441-a-drop-words`): il catalogo scende a 1261, i 572 di prima
più 689 forme. Le parole tornano con la parte B, a penna alzata fra le
lettere come negli esempi delle città, dopo una pagina di prova mostrata
all'utente. Il filtro (somiglianza ≥ 0,90) non misura se una parola si
legge: per le parole non basta. Dei punti qui sopra restano i già fatti di
forme, l'ordine misto e lo strumento.

## ADR-0351, precisazione D2 — La barra di una forma di passo fra il livello prima e questo, sul telefono; una distanza mai corsa di fila senza percentuale

**Stato**: Attiva · 2026-11-11 · TASK-423, «Play» dopo l'uso (#1113).
Richiesta dall'utente dopo averla usata («Dalla 1 alla 4»); i testi
approvati dall'utente («Sì, approvo»). Le scelte tecniche sono dell'agente
su delega dell'utente.

**Decisione**:

- **La barra di una forma di passo non è più `target / best`** (il
  `progress` del server): 5:00 /km non è il 60% di 3:00 /km. Il telefono
  (`shapeProgress.ts`, puro) la calcola fra il livello prima sulla stessa
  distanza (il passo più lento più vicino; per il primo livello, un minuto
  in più) e questo, dal tempo migliore che `/game/me` dà già: vuota finché
  il livello prima non è fatto. Il server non cambia.
- **Una distanza mai corsa di fila non ha percentuale**: «First run 15 km in
  one go · longest 12 km». I totali e i traguardi tengono la quota di
  strada.
- **Le distanze di una corsa per nome** (`runDistanceLabel`): 400 m, 1
  mile, Half marathon, Marathon. I totali restano in km o miglia;
  `goalDistanceLabel` e `progressText`, usati da altri task, non cambiano.

## ADR-0351, precisazione E2 — I premi nell'app: la pagina «Prizes», le schede di edizioni e collezioni, la scelta del profilo e la privacy

**Stato**: Attiva · 2026-11-11 · TASK-423 parte E2 (#1132, #1144). Testi
(55 e 4) e frase della privacy approvati dall'utente («Sì, approvo»).
Deciso dall'agente su delega dell'utente.

**Decisione**:

- **Due PR**: E2a mette i premi dentro «Play» senza cambiare niente di
  quello che vedono gli altri; E2b porta la scelta del profilo insieme alla
  frase della privacy, così il profilo mostra i premi solo da quando
  l'informativa lo dice.
- **Le schede di sblocco** sono una sola `UnlockCard` per forma, edizione,
  collezione e riepilogo; oltre 3 cose da una corsa, una scheda sola.
  L'app legge `editions` e `collections_done` della corsa con prudenza: un
  campo assente (API vecchia) o rotto non mostra niente.
- **Le push** `edition_up` e `collection_done` aprono «Play» (non il
  profilo che i dati nominano) e ad app aperta non si mostrano, come
  `shape_unlocked`.
- **La scelta del profilo** si fa toccando un premio preso nella pagina
  «Prizes» (`PUT /game/prizes/shown`), salvata a ogni tocco. Il profilo
  legge `game_prizes` con `isGamePrizesShown`; una cornice che il catalogo
  del telefono non conosce resta fuori.
- **I colori delle cornici** sono un blocco `gamePrize` in `tokens.ts`, mai
  da soli: la cornice ha sempre il nome della collezione accanto.

## ADR-0357, precisazione B2/C2 — I tratti della giornata a «Salva» col ripiego al 422; la stagione da luglio a giugno, la giornata salvata a tre sezioni, la mappa del post di sci da `from_fix`/`to_fix`

**Stato**: Attiva · 2026-11-11 · TASK-429 parti B2 (#1129, `a0837cec`) e C2
(#1131, `d327ff41`). Deciso dall'agente su delega dell'utente, dentro le
scelte dell'utente di ADR-0357 (i tratti dal telefono, «Sì, così»; i testi
della stagione e di «Pista senza nome» approvati il 2026-11-10).

**Decisione**:

1. **I tratti partono a «Salva» dentro i run-stats** (B2): `runStatsRequest`
   aggiunge `ski_parts` per una giornata di sci (`skiPartsOf`: i `snowParts`
   dei punti mandati, al più 500 come li tiene l'API; `moving_s` mai più
   della durata del tratto; `top_mps` nullo per le risalite). Un altro
   sport, o una giornata senza quote, non manda il campo.
2. **Il ripiego al `422`** (B2): `sendRunStats` rimanda una volta sola i
   run-stats **senza `ski_parts`** quando l'API risponde `422
   invalid_request` (un server prima della C2b di TASK-424 rifiuta le chiavi
   che non conosce), così profilo e calorie non si perdono coi tratti.
   Nessun secondo invio quando i tratti non c'erano.
3. **La stagione va dal 1° luglio al 30 giugno** (C2, `seasonOf` sulla data
   del telefono, «2026/27»): `GET /me/ski-season` si chiede con quei due
   giorni. Una giornata salvata prima dei tratti conta solo come giornata;
   senza risposta o senza giornate la stagione non si mostra.
4. **La giornata salvata ha le tre sezioni di fine giornata** (C2,
   `SkiDayPage`, da un tocco in «Giornate»): «Summary · Map · Runs» dai
   `parts` del server; «Map» apre il post sulla mappa; «Runs» ha ogni
   risalita e discesa col suo nome, «Piste without a name» dove il server
   non l'ha trovato. Una giornata senza tratti mostra chilometri e tempo.
5. **La mappa del post di sci si disegna da `from_fix`/`to_fix`** (C2,
   `useSkiDayMap`, `App.tsx`): le risalite e i numeri vengono dai punti che
   il server lega a ogni tratto, coi token e i `lifts`/`liftLabels` di B1.
   Senza una risalita coi suoi punti il post si disegna come prima;
   `partsOf` tiene solo i tratti ben formati, così un'API prima della C1 non
   cambia nulla.

**Conseguenze**: solo JavaScript, impronta iOS `6f8bba4c` invariata
(misurata l'11-11 su tutte e due le PR); il server non cambia. In
produzione con l'ottavo OTA dell'11-11 (da `main` `cd0c8b08`).

## ADR-0362 — Le due tabelle che il motore calcola una volta per grafo si fanno a blocchi con shapely, uguali bit per bit a prima; `math.dist` decide ancora i quasi-pareggi

**Stato**: Attiva · 2026-11-11 · deciso dall'agente su delega dell'utente
(TASK-436, #1106, `4dfeca6d`; numero e lista dei file dal Coordinatore).

**Contesto**: il profilo di TASK-434 (proposte 1 e 7) ha trovato che il
30–40% di ogni ricerca su un grafo da 5 km andava in due tabelle calcolate
una volta per grafo con una chiamata Python a shapely per arco (circa
31.000 archi): i tre punti di ogni arco (`network._work_out_samples`,
0,12 s) e i punti di ogni strada per la maschera (`RoadMask.__init__`,
0,09 s). Le rifanno il processo della richiesta e ogni figlio delle
partenze vicine. In più `road_fit` ricalcolava `perimeter(shape)` a ogni
piazzamento (circa 5.500 volte a ricerca, sempre lo stesso valore).

**Decisione**:
- **Una lettura sola delle geometrie**: `shapely.get_coordinates(...,
  return_index=True)` su tutte le geometrie insieme, in
  `_work_out_samples` e nella nuova `optimizer._road_points`; verso della
  geometria, punto di mezzo e capi escono da indici numpy. Nessuna
  dipendenza nuova: shapely 2 e numpy c'erano già, anche sul telefono.
- **Gli stessi numeri, per costruzione**: quale capo di una geometria
  viene prima lo diceva `math.dist`, che non arrotonda come la radice di
  numpy. Dove le due distanze sono uguali entro 1e-9 (i cappi, di fatto)
  decide ancora `math.dist`, arco per arco. Nella maschera l'array dei
  punti è quello di prima nello stesso ordine e il conto che segue non è
  toccato.
- **`perimeter(shape)` una volta** in `search`, col prodotto
  `band_share * shape_perimeter * scale` nello stesso ordine.
- **Stessi percorsi, impronte tenute**: tre righe in coda a
  `SAME_ROUTES_AS` (ADR-0320), dopo quelle di TASK-435 A: motore
  `ca29e58777cb` → `b4967ef32e9a`, nuotate `c9c2683a72ea` →
  `3ce5d60ec0cd`, esempi di canoa `3984555281d5` → `cf585f8fb31b`. Le
  impronte efficaci restano `8ab61d8e87f9`, `b9d00c37d28d`,
  `574fbfba41eb`: sul server nessun percorso tenuto, zona o esempio si
  rifà.

**Alternative scartate**:
- *Il prototipo così com'era* (solo `np.sqrt` per il verso): uguale sui 10
  grafi misurati, ma non per costruzione; un test mostra quasi-pareggi in
  cui girerebbe l'arco dall'altra parte.
- *Tenere le tabelle tra una richiesta e l'altra, o passarle ai figli*: è
  un'altra proposta di TASK-434, fuori da questo task.

**Conseguenze**: sul Mac `_work_out_samples` 0,123 → 0,017 s e
`RoadMask.__init__` 0,094 → 0,025 s a grafo; un percorso da 5 km 1,725 →
1,509 s (−12,5%) e 4,00 → 3,40 s di CPU tra processo e figli (−15%); sul
cuore da 10 km il tempo intero non cambia (−0,4%, si aspettano i figli),
la CPU −4,4%. Sul server non è misurato. Chi tocca queste due funzioni ha
in `tests/test_graph_tables.py` il codice di prima come riferimento: le
tabelle devono restare uguali con `np.array_equal`. Dettagli e misure in
`tasks/TASK-436.md`.

## ADR-0363 — I giorni di corsa nelle schede della palestra: un campo `run` facoltativo nel giorno del programma, la crescita dal telefono, «Go to the run» con i km di «Draw»

**Stato**: Accettata · 2026-11-10 · TASK-433 parte C: C1 server e tipi
(#1117, `2ed26af7`), C2 l'app (#1115). Le scelte di quello che si vede sono
dell'utente, una alla volta sulle schermate C1–C3 della tela («Giorni di
corsa nella scheda», «Così», «Sì, così», «Sì, così», «Approvo»); il modo è
deciso dall'agente su delega dell'utente, numero dal Coordinatore.

**Contesto**: dopo le schede guidate (ADR-0360) l'utente ha chiesto di
poter mettere la corsa nella scheda della palestra. Un giorno del programma
era solo un allenamento di esercizi.

**Decisione**:
- **Un campo, nessuna tabella e nessuna migrazione**: un giorno del
  programma (`GymPlanSession`) ha `run` facoltativo e allora nessun
  esercizio. `run` è `kind` (`easy`, `intervals`, `long`) con `distance_m`
  (100–100 000) o `duration_s` (60 s–6 h); le ripetute `reps` (1–50) con
  `rep_m` (50–5000) o `rep_s` (10–1800). Sta nel JSONB `program` di
  `gym_plans` (0066), lo valida `gym_plans.py` (`GymPlanRunBody`).
- **La crescita la calcola il telefono** (`program.ts`, `runInWeek`): circa
  +10% a settimana, in mezzi km o minuti interi; le ripetute +1; l'ultima
  settimana di un ciclo di 3 o più all'80% della prima (le ripetute 2 in
  meno); il ciclo dopo riparte un passo avanti; «Always the same» la lascia
  com'è. Una settimana scritta a mano tiene la corsa scritta.
- **Fatto nel calendario**: `gym_calendar.py` dà per fatto un giorno di
  corsa se quel giorno (sul fuso chiesto) c'è una corsa (`runs.activity =
  'running'`), qualunque; un giorno di palestra come prima.
- **«Go to the run»**: `saveSport("run")` e un canale nuovo in
  `units/useDrawDistance.ts` (`chooseDrawDistance`) che scrive i km nel
  campo di «Draw», entro i limiti dello sport; le ripetute e le corse a
  tempo non scrivono km. «Start workout» quel giorno è un allenamento libero
  (`planForToday` è null).
- **Il colore**: un token nuovo `runDay` per la sigla «RUN», con i valori
  di `startHere` per tono (l'azzurro che l'utente ha approvato) ma suo, così
  ognuno ha un significato; contrasto ≥ 3:1 su `surface` e `surfaceRaised`
  in ogni tono (`palettes.test.ts`).
- **Due PR**, condizione del Coordinatore: il server deve accettare `run`
  prima che l'app lo mandi (lo schema vieta i campi in più: `422`, e la
  scheda resterebbe in attesa sul telefono). Quindi C1 (server e tipi) in
  `main` e sul server, poi C2 (l'app).

**Cosa vede l'app di prima** (l'OTA 5 e 6): un giorno di corsa è un giorno
senza esercizi; la sua `isGymProgram` non guarda `run`; non diventa mai
«Today»; la sua guida lo mostra come un giorno di palestra vuoto e non
lascia salvare finché non ha esercizi. Lo prova `api/gymPlans.test.ts`
(«the example of the API is what the app reads») con l'esempio «Lift and
run» di `fixtures/gym-plans.json`, verde sul codice dell'app di prima.

**Conseguenze**: un giorno di corsa conta come fatto con qualsiasi corsa di
quel giorno, anche più corta di quella scritta. I testi in
`docs/tasks/TASK-433.md` «Parte C»; il comportamento in `sports/gym.md`; il
contratto in `API.md`.

## ADR-0352, precisazione C3 — Le calorie in rosso ovunque: un token per tono, due fissi per il giallo e le foto, solo le kcal in rosso nella riga dei fatti

**Stato**: Attiva · 2026-11-10 · TASK-424 parte C3 (#1123, 801408fd).
Scelta dell'utente del 2026-11-10, parole sue: «le calorie devono essere
calcolate per ogni attività, e segnate con colore rosso in tutte». Il
resto deciso dall'agente su delega dell'utente.

- **Un token nuovo per tono**, `energy`: scuro `#FF6363` → `#FFA3A3`,
  chiaro `#8F1216` → `#B71C1C`; almeno 4,5:1 su `background`, `surface` e
  `surfaceRaised` a ogni passo di luminosità (`palettes.test.ts`).
- **Due rossi fissi** dove il fondo non è quello del tono:
  `energyOnAccent` `#8F1216` sul giallo della palestra (6,3:1) e
  `energyOnScrim` `#FF6363` sopra una foto (6,8:1 sul velo).
- **Dove**: riquadri della corsa e della neve (numero e unità), piscina,
  palestra, riquadri e righe del post, la riga dei fatti di un post, di
  un'attività e del post mostrato mentre si disegna. Nella riga dei fatti
  solo le «280 kcal» finali sono rosse (`feed/FactsText.tsx`): un lettore
  di schermo sente sempre una riga sola.
- **Fuori**: l'app dell'orologio (Swift, build nativa) e la pagina web dal
  vivo di getmuw.app; seguiti, se l'utente li vuole.
- Solo JavaScript, nessun testo nuovo, nessuna dipendenza nuova.

## ADR-0364 — I test dell'API in CI girano in 4 parti per file; il check `api` è un job finale

**Stato**: Attiva · 2026-11-10 · deciso dall'agente su delega dell'utente
(TASK-438; numero e via libera del Coordinatore).

**Contesto**: il job `api` di `ci.yml` eseguiva tutta la suite dell'API su
una macchina: 27 minuti sulla PR #1105, 39 sulla #1103, annullata al limite
di 40 con ogni passo verde. Misurato su quattro run del 2026-11-10 (3099
test, 176 file): tutto il tempo è in pytest; nessun file pesa più del
4,5 %; tra un run da 27 e uno da 37 minuti ogni file è più lento dello
stesso fattore, cioè è la macchina; il costo è per test, perché ogni test
riceve un database vuoto a cui la fixture del file applica tutte le
migrazioni. La suite è raddoppiata in tre settimane.

**Decisione**:

- il job diventa la matrice `api-tests` con 4 parti (`fail-fast: false`,
  25 minuti di limite ciascuna). `tools/ci_api_shards.py`, solo libreria
  standard, dà ogni file di `services/api/tests` a una parte sola: un file
  pesa quanti `def test_` ha e va, dal più pesante, alla parte più leggera;
  a parità decide il nome. Stessi file, stesse parti. Il numero delle parti
  è la sola lista `shard` di `ci.yml` (`strategy.job-total` fa il resto);
- lint e controllo di copertura girano una volta, nella parte 1: pytest
  elenca tutta la suite senza eseguirla e il job fallisce se raccoglie un
  test da un file che nessuna parte esegue; lo stesso passo stampa il
  totale dei test raccolti;
- un job finale `api` (`needs: api-tests`, `if: always()`) passa solo se il
  risultato della matrice è `success`. Il check obbligatorio del ruleset
  resta `api`; `api-tests (1)` … `api-tests (4)` non sono obbligatori;
- ogni parte stampa i suoi 25 test più lenti (`--durations=25`).

**Perché così**: senza un file dominante non c'è un test da sistemare, e
dividere per file non chiede dipendenze né cambia i test. Il giro
alfabetico dei file con 4 parti lasciava la più lenta a 9–13 minuti contro
7–10 del bilanciamento sul numero di test, che resta entro il 10 % dalla
divisione ideale senza tempi salvati che invecchiano. `always()` sul job
finale perché un job saltato vale come passato per il ruleset, e con il
default una parte fallita o annullata lo farebbe saltare. Con una lista di
file vuota pytest eseguirebbe tutta la suite: lo script rifiuta più parti
che file e il passo controlla che la lista non sia vuota.

**Scartato**: `pytest-xdist` (dipendenza nuova, stato condiviso tra file da
verificare; non serve per stare sotto i 15 minuti); tempi per file salvati
nel repository (invecchiano a ogni PR); un database modello con le
migrazioni applicate una volta per run (`CREATE DATABASE … TEMPLATE`): è
la riduzione più grande del tempo totale, ma cambia `tests/conftest.py` e
le fixture dei test, quindi è una proposta a parte, non costruita.

**Conseguenze**: sulla #1119, due run consecutivi con la parte più lenta a
10 min 48 s e 10 min 02 s; le quattro parti raccolgono 833 + 739 + 790 +
752 = 3114 test, quanti la suite intera sullo stesso commit. I minuti di
macchina non calano: si dividono su quattro job, più circa un minuto di
installazione per parte. Un file di test nuovo entra da solo in una parte.
Una PR di soli documenti fa partire quattro job `api-tests` invece di uno,
tutti verdi in pochi secondi col passo «Changes» (ADR-0331). In locale non
cambia niente: `pytest` esegue tutta la suite.

## ADR-0352, precisazione C2b — I tratti della giornata di sci nei run-stats, le discese in ogni lista di post: un campo solo con TASK-429, nessuna migrazione

**Stato**: Attiva · 2026-11-10 · TASK-424 parte C2b (#1110, d5226b1e),
disegnata con TASK-429 (modalità sci). Scelta dell'utente del 2026-11-10,
«Sì, il server» (le calorie dello sci nel Feed come a fine giornata). Il
resto deciso dall'agente su delega dell'utente, d'accordo con la sessione
della 429 e col Coordinatore («un campo solo, una migrazione al più»).

- **Un campo per due usi**: il telefono manda `ski_parts` (risalite e
  discese: tipo, numero, inizio e fine sull'orologio della traccia, tempo
  in movimento, metri, dislivello, velocità massima; al più 500, in
  ordine) dentro `PUT /me/activities/{key}/stats`. La 429 ne legge la
  lista per riepilogo e mappa; il Feed le somme delle discese per le
  calorie.
- **Nessuna migrazione**: stanno in `run_stats.stats` (jsonb della 0064),
  coi tempi portati sui secondi della traccia del server (`start_s`,
  `end_s`) e la somma delle discese (`ski_descents`) calcolata una volta al
  `PUT`. Le liste dei post la leggono con una sottoquery sulla chiave
  primaria di `run_stats`.
- **Visibilità**: `ski_parts` e `ski_descents` a chiunque veda il post,
  come i passi e il profilo; non sono battito né calorie.
- **Prima il server, poi l'app**: il corpo dei run-stats rifiuta le chiavi
  sconosciute (`extra="forbid"`), quindi un server senza C2b dà 422 a un
  `PUT` con i tratti e la giornata perde tutti i suoi dati. L'app di C2b
  non li manda (solo tipi e lettura); li manda la 429 B, dopo il server.
- **Il Feed dello sci alpino** conta le calorie su `ski_descents` (MET 5,3
  sui secondi delle sole discese), lo stesso numero di fine giornata; un
  post senza tratti, salvato prima o da un telefono che non li manda, resta
  senza.

## ADR-0352, precisazione C — I dati dal vivo che mancano: il battito su «Data», la piscina dal vivo, le calorie di ogni attività (lo sci sulle discese)

**Stato**: Attiva · 2026-11-10 · TASK-424 parti C1 (#1096, in produzione
con l'OTA 5) e C2 (#1098, a064a486). Scelte dell'utente del 2026-11-10,
parole sue: «Formula da sci» (sulla domanda delle calorie dello sci), poi
«le calorie devono essere calcolate per ogni attività, e segnate con colore
rosso in tutte», e «Sì, il server» per lo sci nel Feed (parte C2b). Il
resto deciso dall'agente su delega dell'utente.

- **Superate dalla scelta dell'utente del 2026-11-10**: «Niente calorie
  sulla neve» di TASK-375 (ADR-0319) e la scelta 2 di TASK-415
  (scialpinismo, «Niente calorie sulla neve (come TASK-375)»). I file di
  quei task non si toccano (CLAUDE.md): vale questa voce.
- **C1**: su «Data» la stessa riga del battito di «Map» (`WatchHeart`),
  sotto i sei riquadri; in piscina, sotto l'orologio, vasche e calorie
  stimate da `poolLiveStats`, gli stessi numeri che manda «Share live»,
  ogni secondo, fermi in pausa.
- **C2, una formula per ogni attività** (`src/sports/`, tabella in
  `UI.md` «Calories»): acque libere con le fasce a MET per passo della
  piscina; sci alpino MET 5,3 (discesa, sforzo moderato, solo tempo
  attivo) sui soli metri e secondi delle discese; sci di fondo MET per
  velocità media (Compendium 2024: 6,8 / 9,0 / 12,5 / 15,0 a 4, 5 e 8
  mph); scialpinismo l'equazione ACSM del cammino, come l'hike. Solo la
  palestra conta le sue serie.
- **Una funzione sola per le discese**: `activities/trackEffort.ts`
  (`skiedDay`, `trackEffort`) dà metri, secondi e salita di una traccia,
  per lo sci alpino quelli delle discese di `snowDay` (che dà anche
  `skiedMs`). La usano lo schermo, Apple Salute, la pagina del post; la
  riusa TASK-429 B.
- **Dal vivo le calorie sono dello sport registrato** (quello di
  «Settings» che «Save» salva), non di `freeRunAs`: lo sci tiene le
  velocità della bici e prende le sue calorie.
- **Uno sport più nuovo dell'app** non ha calorie e non fa errori
  (`findProfile`).
- **Il Feed dello sci alpino** resta senza calorie fino a C2b: il post ha
  solo distanza e tempo della giornata intera, risalite comprese.
- **Impronta iOS** invariata: C1 e C2 sono solo JavaScript. Nessuna
  dipendenza nuova.

## ADR-0351, precisazione E1 — I premi sul server: le edizioni come righe di `game_unlocks`, cornici, titoli e badge letti a ogni richiesta, la scelta del profilo in `game_prefs`

**Stato**: Attiva · 2026-11-10 · TASK-423 parte E1 (#1099). Deciso
dall'agente su delega dell'utente; i testi delle due push approvati
dall'utente («Sì, approvo», 2026-11-10).

**Decisione**:

- **Le edizioni argento e oro sono righe di `game_unlocks`** (`edition`
  `silver`, `gold`), accanto a `solo` (il bronzo) e `team`: la stessa
  tabella dice quando e con quale corsa. La CHECK di `edition` si allarga
  (0067), mai si stringe, e il codice di prima filtra già `solo` e `team`.
  Si scrivono nella transazione del salvataggio (`record_editions`)
  contando le corse contate che fanno il requisito; il backfill le dà alle
  corse vecchie con la corsa che le ha date, alla sua fine, senza push.
- **Cornici, titoli e badge non si salvano**: si leggono a ogni richiesta
  (`game_prizes.py` puro, `facts_of`) da quello che il gioco tiene già.
  Niente da tenere allineato, niente backfill; se una corsa si cancella un
  premio di km può tornare indietro, e il profilo smette di mostrarlo.
- **La scelta del profilo è in `game_prefs`** (una cornice, un titolo,
  fino a 3 badge), accettata solo fra i premi presi; il profilo pubblico
  mostra `game_prizes` solo per quello che si ha ancora, `null` di
  default. I campi nuovi di `/game/me`, `/game/runs/{key}` e del profilo
  sono facoltativi: l'app in produzione li ignora (test con i suoi
  validatori).
- **Due push nuove**, `edition_up` (l'oro ha le sue parole) e
  `collection_done`, una per corsa ciascuna, dopo `shape_unlocked`.

**Perché**: il server conta, l'app mostra; meno stato salvato vuol dire
meno cose che possono andare fuori sincronia, e l'app installata resta
intatta.

## ADR-0361 — Primo percorso subito: `plan_nearby` avvisa quando la partenza ha il suo piano, il job lo porta in `first` a chi lo chiede, nell'app il primo resta A

**Stato**: Accettata · 2026-11-10 · TASK-435. Scelte di prodotto
dell'utente: mostrare il primo percorso appena è pronto e aggiungere dopo
le alternative; costruirlo anche col guadagno misurato; «il primo resta
A». Il come è deciso dall'agente su delega dell'utente.

**Contesto.** Un percorso è pianificato dalla partenza dell'utente e,
insieme, da fino a 3 partenze vicine in processi figli (ADR-0071); finito
il piano della partenza il job aspetta i figli fino a 8 s (3 s se quel
piano è già buono, ADR-0087), sceglie la forma migliore e manda tutto
insieme. Misurato (`tasks/TASK-435.md`): una vicina vince in 31 richieste
di prova su 81 (38%, +3,6 punti di somiglianza in mediana); l'attesa dopo
il piano della partenza vale circa 1 s in mediana sul server (0–3,5 s su
9 job), 0,2 s sul Mac. TASK-434 stima che coi figli già avviati ne resti
meno: l'utente ha scelto di costruirlo lo stesso.

**Decisione.**

1. **Motore.** `nearby_starts.plan_nearby(..., on_first=None)`: chiamato
   una volta col piano della partenza appena c'è, se ci sono partenze
   vicine da aspettare; mai senza vicine, né quando la partenza non ha un
   percorso. La scadenza dei figli si calcola prima della chiamata. La
   scelta, le alternative e i punti non cambiano: prova
   `test_same_routes` e riga in `SAME_ROUTES_AS`.
2. **Job.** La sorgente del job (`jobs._Reporting`) riceve quel piano
   (`first_plan`), gli dà le indicazioni e il job lo tiene in `first`, con
   lo stato che resta `computing`. Dal processo caldo (ADR-0242) arriva
   come messaggio `("first", seq, plan)`, accanto allo stato.
3. **Contratto, solo esteso.** `RouteJob.first`, `null` di norma.
   `GET /route-jobs/{id}?first=1` lo riempie mentre il job calcola; a
   `done` il `result` è quello di sempre (scelto + alternative). Un
   parametro e non `X-MuW-Reads`: l'app lo chiede finché non l'ha avuto e
   poi smette, e chi non lo chiede non riceve un percorso in più a ogni
   lettura. Un'app non aggiornata non lo chiede e ignora il campo; un
   server non aggiornato ignora il parametro.
4. **App: il primo resta A.** All'arrivo di `first` il percorso è sullo
   schermo, con «Start» e l'esportazione. A `done` gli altri si aggiungono
   come B e C, dal migliore (la percentuale è già sulle schede); quello
   uguale al primo non si ripete; tre in tutto, quindi se il primo non è
   fra quelli che il motore tiene esce l'ultima alternativa. Se dopo il
   primo il job fallisce o il server non risponde, il primo resta da solo.
5. Archivio, registro delle richieste, `POST /routes`, «Explore», acqua e
   motore sul telefono: come prima, sul risultato finale.

**Alternative scartate.** Il migliore sostituisce il primo (la mappa
cambierebbe sotto gli occhi in 38 richieste su 100); `first` in ogni
risposta (un percorso in più a ogni lettura, anche per le app vecchie); un
nuovo stato del job (un'app vecchia lo leggerebbe come `computing`, ma il
`result` a metà cambierebbe il contratto di `done`).

**Conseguenze.** Chi vede il primo percorso può avere come A un percorso
che non è il migliore; l'archivio tiene comunque la risposta del motore,
col migliore per primo. Tre PR (motore, API, app), poi server e OTA, ognuno
col sì dell'utente.

## ADR-0360 — Le schede della palestra guidate: le settimane in una colonna `program`, i valori di ogni settimana dal telefono, l'app di prima che legge ancora

**Stato**: Accettata · 2026-11-10 · TASK-433 (#1095, `8138b456`). Le
scelte di quello che si vede sono dell'utente, una alla volta su una tela
di sette schermate («5 passi così», «Tutti e 4 i modi», «4 settimane,
cambiabile», «Approvo» la grafica e i testi, «Sì, con la migrazione»); il
modo è deciso dall'agente su delega dell'utente.

**Contesto**: provate le schede di TASK-411 (ADR-0341) sul telefono,
l'utente ha chiesto di crearne una «il più facilmente possibile», guidata,
con le settimane che possono cambiare e una grafica più elegante. Una
scheda di TASK-411 è un solo allenamento sui suoi giorni (`days`, `items`),
uguale ogni settimana.

**Decisione**:
- **Una colonna, non una tabella**: `gym_plans.program` JSONB nullable
  (migrazione `0066_gym_plan_weeks.sql`). Una scheda guidata è una riga di
  `gym_plans` col suo programma: `goal`, `starts_on` (le settimane contano
  dal suo lunedì), `weeks` 1–12, `mode` (`load`, `reps`, `alternate`,
  `same`), `step_kg`, `rest_s`, `sessions` (la prima settimana, un
  allenamento per giorno) e `custom` (le settimane scritte a mano, dalla 2).
  Chiave, ordine, limite di 20 schede, «l'ultima modifica vince» e
  sincronia restano quelli di ADR-0341; al massimo 300 esercizi per
  programma. Con un `program` i `days` della riga sono quelli dei suoi
  allenamenti e `items` è vuoto.
- **I valori di ogni settimana li calcola il telefono**
  (`apps/mobile/src/gym/program.ts`) dalla prima settimana e dal modo:
  `load` +`step_kg` a settimana con l'ultima di un ciclo di 3 o più più
  leggera (i kg della prima e una serie in meno), `reps` +1 ripetizione per
  due settimane e poi +`step_kg`, `alternate` due settimane in turno,
  `same` sempre uguale; finito il ciclo ricomincia un passo più pesante.
  Una settimana scritta a mano prende il posto di quella calcolata. Il
  server tiene il programma com'è e sa solo quali giorni sono in programma
  (`GymProgramBody.sessions_on`), per i giorni saltati del calendario.
- **L'app di prima legge ancora** (condizione del Coordinatore: il
  contratto è già usato dall'app in produzione): il contratto cambia solo
  con il campo nuovo facoltativo `program`, nessun campo rinominato o
  tolto. L'app di prima guarda solo `key`, `name`, `days`, `items`,
  `position`, `updated_at`: una scheda con le settimane passa, con i giorni
  dei suoi allenamenti e zero esercizi; in «Plans» è una riga «Mon · Wed ·
  Fri · 0 exercises», in «Draw» non diventa mai «Today» (serve almeno un
  esercizio) e «Start workout» resta libero. Se la modifica, manda il `PUT`
  senza `program` e il server lascia le settimane com'erano;
  `program: null` riporta una scheda a un solo allenamento. Lo provano
  `apps/mobile/src/api/gymPlans.test.ts` («an app of before reads a plan
  with weeks») e `test_gym_plans.py`
  (`test_a_program_is_kept_and_an_older_app_leaves_it`).
- **Le schede di prima** si aprono nella guida come un programma di una
  settimana «sempre uguale» (`programOfPlan`); il vecchio editor lascia il
  posto alla guida (`GymPlanWizard.tsx`, `SessionEditor.tsx`; le costanti in
  `planLimits.ts`). La proposta pronta (`proposal.ts`) usa solo esercizi del
  catalogo coi valori dell'obiettivo, i kg vuoti.
- **Il recupero dell'obiettivo** (90 s, 3 min, 45 s, 60 s) è il primo
  recupero di ogni esercizio nell'allenamento che segue la scheda.

**Conseguenze**: prima il server, poi l'OTA: l'API di prima risponde `422`
a un `PUT` con `program` (campi in più vietati) e la scheda resta in attesa
sul telefono finché il server non c'è. Tornare all'immagine di prima del
server non chiede di toccare il database: la colonna è nullable e il codice
di prima legge le colonne per nome. Il comportamento in
`docs/sports/gym.md` «Le schede guidate»; il contratto in `API.md`, la
colonna in `DATABASE.md`.

## ADR-0351, precisazione D — L'app di «Play» grande: collezioni contate dal telefono, una lista sola, l'ora del telefono con il secondo invio senza

**Stato**: Attiva · 2026-11-10 · TASK-423 parte D (#1080). Deciso
dall'agente su delega dell'utente; i 50 testi nuovi nelle 5 lingue
approvati dall'utente («Sì, approvo», 2026-11-10).

**Decisione**:

- **«7 / 13» si conta sul telefono** dagli stati delle forme di
  `GET /game/me`, non da `collections` della risposta: la riga e la
  griglia della pagina non possono dire due cose diverse. Il test confronta
  il conto del telefono con quello dell'esempio dell'API. Un catalogo senza
  collezioni (API prima di 423 A) mostra la griglia unica di prima.
- **«Challenges» è una lista sola** (`GIOCO.md` §6.8) in una schermata:
  le carte personali e la streak da `GET /game/personal`, le squadre da
  `GET /game/teams`, la sfida del mese da `useContest` di TASK-343, solo
  per chi ha l'account. Un 404 di `/game/personal` (API prima di 423 C)
  toglie le carte senza errore, come già per le squadre. La sfida del mese
  è solo una riga che apre la sua pagina (`openContestPage`): niente in
  `src/contest/` cambia. «YOUR TEAMS» non c'è più: i titoli sono In corso ·
  Disponibili · Finite.
- **L'ora del telefono si aggiunge all'invio** (`saveActivity`,
  `withOffset`), non quando la corsa entra nella coda: la coda salvata sul
  telefono non cambia forma, e vale l'offset del primo punto della traccia.
  Le corse importate da un file non lo mandano: non contano per «Play». Se
  l'API rifiuta il campo, la corsa riparte senza, prima degli altri ritiri
  per le API vecchie (altezze, rotazione, penna alzata). Un offset 0 si
  scrive `0`, mai `-0`.
- **I limiti delle sfide di squadra** (20 pezzi, 30 giorni) restano costanti
  in `packages/shared-types`, legate a `game_challenges.py` da un test di
  contratto che legge le due righe del Python.
- Impronta iOS invariata (6f8bba4c su copia pulita): niente dipendenze né
  codice nativo.

**Perché**: ogni scelta tiene l'app installata e i server vecchi senza
errori, e lascia le parti degli altri task (TASK-343, TASK-422) come sono.

## ADR-0314, precisazione — La parte B5: mappa nella corsa libera, colori, zone del battito dal telefono

**Stato**: Attiva · 2026-11-10 · TASK-370 parte B5 (#1085). Proposta
approvata dall'utente («Sì, tutta») dopo la prova della build 11; il
resto è deciso dall'agente su delega dell'utente.

**Decisione**:
1. **Gli sport col GPS hanno una mappa anche senza percorso**
   (`LiveMapView`). Le pagine sono Numeri → Mappa → Dettagli. La linea
   (`LiveLine`) prende un punto ogni 5 m, al massimo 1500, e oltre tiene
   un punto ogni due. La freccia (`HereMarker`) segue la direzione del
   GPS sopra 0,5 m/s ed è la stessa sulla mappa del percorso.
2. **Le zone del battito le conta il telefono.** Il messaggio `settings`
   ha un campo facoltativo `heartZones`, i sei limiti di «Heart rate
   zones»; un orologio vecchio lo ignora. Il telefono lo rimanda a ogni
   cambio di unità, battito o profilo; l'orologio lo tiene per la volta
   dopo.
3. **I colori sono quelli di sistema**, non esadecimali: il giallo della
   distanza è il `.yellow` di watchOS, come la linea del percorso. Così
   `tokens.ts` resta del solo telefono.
4. **Il dislivello è quello del telefono** (`climbM`, scalini di 3 m), in
   metri anche in miglia come «Elev. gain», solo sugli sport a terra.

**Conseguenze**: i colori e la mappa si vedono solo al polso: la prova a
vista è la build 12.

## ADR-0314, precisazione — La parte B4: il telefono sveglia l'orologio con `startWatchApp` della libreria HealthKit

**Stato**: Attiva · 2026-11-10 · TASK-370 parte B4 (#1089), decisa
dall'agente su delega dell'utente; lista dei file dal Coordinatore.

**Contesto**: con la build 11 una corsa avviata sul telefono faceva
partire l'orologio solo se MuW era già aperta al polso. `sendMessage`
arriva solo a un'app raggiungibile.

**Decisione**:
1. **Al conto alla rovescia il telefono chiede ad Apple di avviare
   l'allenamento sull'orologio** (`HKHealthStore.startWatchApp(with:)`).
   Usa `startWatchApp` di @kingstinct/react-native-healthkit 16.2.0, già
   nella build 1.0.1, senza codice nativo nuovo; l'impronta iOS resta
   6f8bba4c. La libreria si carica come in `healthModules.ts`.
2. **Un no di Apple** (senza permesso di Salute, senza orologio o senza
   app) fallisce in silenzio: la corsa sul telefono va avanti.
3. **Lo sport esatto arriva col messaggio di partenza**, che il telefono
   rimanda quando Apple dice sì. La configurazione dice solo il tipo di
   Apple, e bici, mountain bike e gravel sono tutte «ciclismo».
   L'orologio aspetta 3 s quel messaggio, poi parte col primo sport di
   quel tipo e con lo stesso GPS (`WatchWake.sport`). Una seconda
   partenza durante un allenamento non cambia nulla.

**Conseguenze**: il risveglio vero si prova solo al polso, con la build
12. Il battito specchiato in tempo reale (`workoutSessionMirroringStartHandler`)
resta fuori: il battito arriva ogni 5 s coi messaggi.

## ADR-0340, correzione — La pagina del post: margini propri nel Modal, chiusa prima di «Edit & run», il tasto solo dove c'è un disegno

**Stato**: Attiva · 2026-11-10 · TASK-410, correzione (#1078,
`db3d131c`). Deciso dall'agente su delega dell'utente, dopo la sua
segnalazione sull'iPhone.

**Contesto**: dopo l'OTA 3 l'utente non riusciva a usare «‹» della pagina
del post («troppo in alto») e «Edit & run» non faceva niente, né sulla
card né nella pagina. Tre cause: dentro un `Modal` iOS i margini dell'app
valgono 0, così «‹» stava sotto l'orologio; la mappa di «Draw on the map»
si apriva sotto la pagina, che restava sopra; le corse chiuse il cui
contorno non fa un disegno mostravano il tasto senza effetto.

**Decisione**:

1. **La pagina ha i suoi margini**: un `SafeAreaProvider` con
   `initialWindowMetrics` dentro il `Modal`, lo schema di «Heart rate
   zones» e della ricerca (TASK-366). Anche la barra delle quattro azioni
   sta sopra il bordo basso del telefono.
2. **«Edit & run» chiude la pagina, poi apre la mappa**.
3. **Il tasto solo dove c'è un disegno**: `useEditRunOf` riceve
   `editsLine` (la linea fa un disegno secondo `cardTrack(routeTrack)`),
   come «Edit the drawing» sulle schede. Il difetto delle tracce chiuse
   che si incrociano lo corregge ADR-0356 / TASK-432 (#1079) su tutto il
   catalogo; la modifica doppia è stata tolta dalla #1078.

**Conseguenze**: esce con l'OTA 4. Il calcolo di `cardTrack` gira a ogni
card del Feed (al più 64 punti per traccia).

## ADR-0359 — «Compass»: la freccia di chi corre punta dove punta la mappa, col cono azzurro; le schede della corsa coi disegni

**Stato**: Accettata · 2026-11-10 · TASK-431 (#1081, `5747259d`). Le
scelte di quello che si vede sono dell'utente, che su un'anteprima con due
varianti ha scelto la «B»; il modo è deciso dall'agente su delega
dell'utente.

**Contesto**: provando l'OTA del 2026-11-10 l'utente ha chiesto una pagina
«Compass» (TASK-422, ADR-0350) più ordinata e una freccia della posizione da
cui si capisca dove punta. La mappa girava con la bussola, ma la freccia
seguiva solo la traccia GPS degli ultimi 10 m, e `MapView` mandava la
direzione alla pagina della mappa solo con un fix nuovo: da fermi la
freccia non diceva dove si guardava.

**Decisione**:
- **La direzione della mappa è quella della freccia**: `useHeadingUpMap`
  espone `facing`, la direzione dell'ultima rotazione su «Compass» (null
  fuori pagina e col nord in alto). `App.tsx` la passa a `MapView`, che la
  manda alla pagina col messaggio nuovo `face` a ogni grado intero nuovo, e
  una volta `null` all'uscita. Nella pagina la freccia gira lì anche senza
  un fix, un fix con la direzione della traccia non la sovrascrive, e
  `stopFollow` la dimentica. Così la freccia sta sempre in alto e cambia
  con la mappa (4°, 400 ms, ADR-0350).
- **Un solo disegno** (`HEADING_ARROW_SVG`, riquadro di 160 pt): freccia
  chiara grande col bordo scuro, anello azzurro, e davanti un cono a
  gradiente radiale acceso solo da `face`. Il riquadro ha
  `pointer-events: none`, così le dita sul cono spostano la mappa.
- **Due token nuovi**, nei due toni: `you` (azzurro: anello, cono, la
  scheda aperta) e `north` (rosso: la punta della freccia del nord). Né
  giallo, che è del percorso, né ciano, che è di «Start here».
  `palettes.test.ts` controlla ≥ 3:1 su mappa, fondo e `surfaceRaised` per
  ogni tono e passo.
- **Le schede Compass | Map | Data** hanno un disegno fatto di View
  (`RunPageGlyphs.tsx`: l'app non ha icone né SVG), nascosto a VoiceOver.
  La pagina aperta ha la superficie chiara, il disegno `you` e una linea
  `you`; l'altezza resta 56 pt.

**Alternative scartate**: girare la freccia sulla bussola grezza (avrebbe
tremato in mano e si sarebbe staccata dalla mappa, che gira a soglie);
mandare la direzione dentro `follow` (arriva solo con un fix: da fermi non
basta); il cono anche su «Map» (lì la bussola è spenta, e un cono sulla
traccia promette quello che non sa); un'icona di una libreria (dipendenza
nuova).

**Conseguenze**: un solo stile di freccia per tutte le pagine con la mappa.
Il cono non mostra quanto è precisa la bussola (fuori scope). Arriva sui
telefoni con l'OTA di produzione, col sì dell'utente; resta la prova sul
telefono.

## ADR-0358 — I percorsi di MuW fuori dal Feed: un interruttore nell'app, endpoint e catalogo restano

**Stato**: Accettata · 2026-11-10 · TASK-430 (#1074). La scelta di prodotto
è dell'utente («togli tutti i percorsi fatti da MuW, ad esempio Yellow Arrow
Valencia»; poi «Solo il Feed»); il modo è deciso dall'agente su delega
dell'utente.

**Contesto**: dal TASK-365 (ADR-0310) il Feed mescola a «All» i 25
percorsi di `catalog/muw_routes/`, letti da `GET /muw-routes`. L'utente li
vuole fuori dal Feed; la fila «RIDE IT YOURSELF» di «Explore» (TASK-364)
resta.

**Decisione**: un interruttore nell'app, `MUW_ROUTES_IN_FEED = false` in
`apps/mobile/src/feed/muwInFeed.ts`. Spento, `FeedScreen` non chiede
`GET /muw-routes` e non passa percorsi a `feedWithMuw`. Endpoint, file di
`catalog/muw_routes/`, schede e codice restano: **si riaccende con una
riga**, mettendo `true`. I test del comportamento acceso restano
(`FeedScreenMuw.test.tsx` accende l'interruttore); `FeedScreenNoMuw.test.tsx`
prova lo spento.

**Alternative scartate**: svuotare `catalog/muw_routes/` sul server
(effetto subito su tutte le versioni, ma tocca il server e cancella dati
approvati a mano); togliere il codice del TASK-365 (più diff, e
riaccenderlo vorrebbe dire rifarlo).

**Conseguenze**: arriva sui telefoni con l'OTA di produzione, col sì
dell'utente; fino ad allora le versioni installate li mostrano ancora.
Il server continua a rispondere a `GET /muw-routes`, che nessuna app nuova
chiama.

## ADR-0242 — I percorsi dell'API in 2 processi caldi, non nei 2 thread che si dividevano il GIL

**Stato**: Accettata · 2026-11-10 · TASK-276 parte B (#1038). Deciso
dall'agente su delega dell'utente («ok continua» alla proposta della parte
A), col via del Coordinatore. Numero riservato nel task file dal
2026-10-11.

**Contesto.** Misurato sul server (TASK-276 parte A): il tetto è di circa
7–8 percorsi al minuto, comunque arrivino le richieste. I job di
`/route-jobs` giravano in 2 thread di un solo processo (ADR-0032); il
lavoro del motore teneva il GIL, quindi un percorso alla volta su circa
1,1 core, e i figli delle partenze vicine (ADR-0071) su circa 1,4 core
accanto. Un percorso da 5 km costa circa 19 s di CPU; con 8 richieste
insieme l'attesa media è di 28 s. Il traffico vero è più basso (7 giorni:
148 percorsi calcolati, 121 già pronti, 8 dall'archivio vicino, cioè circa
21 calcoli al giorno): questa decisione è per i picchi e per i concorsi.

**Decisione.**

1. `services/api/shaperoute_api/route_processes.py`: `RouteProcesses` è un
   planner (`jobs.Planner`), che `__main__.py` passa a `create_app`
   (`--route-processes N`, default 2; 0 torna ai thread). `RouteJobs`, la
   sua coda, l'archivio (ADR-0256) e i suoi 2 thread restano come sono: il
   thread di un job dà la richiesta a un processo e ne aspetta il piano.
2. **Percorsi identici.** Il processo usa lo stesso planner
   (`images.plan_request`), le stesse zone (`ActivityGraphs.from_cache`
   della stessa cartella) e lo stesso `jobs._Reporting`. Le indicazioni le
   calcola il processo, che ha le zone, sul piano e su ogni alternativa;
   il thread del job non ha grafi e `with_choices` le lascia come sono.
   Un test lo confronta a Levico. Il motore non cambia: niente prova
   `test_same_routes`.
3. **Cosa passa per il tubo:** lo stato («downloading_map»), i tempi del
   job, il piano, oppure l'errore del planner intero (pickle: `error_of`
   dà gli stessi codici; un errore che non si serializza diventa
   `engine_error`), oppure «dropped». Verso il processo passano la
   richiesta e il «cancel» di un job dimenticato, che il processo guarda
   dopo ogni caricamento, dove lo guardava il thread. Ogni messaggio ha il
   numero del suo percorso.
4. **Niente `Pool`** (TASK-248, ADR-0212): un `Process` per lavoratore,
   non daemon (deve avviare i figli delle partenze vicine), nel suo gruppo
   di processi. Un percorso ha al massimo 600 s (`MAX_JOB_S`); oltre, il
   processo e i figli vengono uccisi (`killpg`) e il percorso fallisce
   come `engine_error`. Così anche un processo morto; il percorso dopo ne
   avvia uno nuovo. `close()` li ferma alla fine dell'API, anche da
   `atexit`.
5. **Quanti: 2**, dalla RAM e dai core misurati. Circa 0,9 GB per processo
   con zone grandi, figli fino a circa 0,4 GB l'uno (già limitati da
   `workers_that_fit`), 5,6 GB liberi. Un terzo processo toglierebbe core
   ai figli senza alzare il tetto: previsto circa +40%, 10–11 percorsi al
   minuto.
6. **Il fork server.** I processi li crea il forkserver di
   `multiprocessing`, avviato con `RouteProcesses` all'avvio dell'API. Sul
   Mac, un processo avviato dall'API dopo che un thread già finito aveva
   letto una zona GraphML moriva tra fork ed exec (SIGSEGV); dal fork
   server parte. Su Linux non succede.

**Alternative scartate.**

- Cambiare `jobs.py`: è dentro `engine.zip` del telefono (`on_phone` lo
  importa); cambiarlo vuol dire ricostruire lo zip e pubblicare l'app.
- Un `ProcessPoolExecutor`: il suo `shutdown` a metà lavoro è il caso di
  TASK-248, e non dà un tempo massimo per percorso.
- 3 o 4 processi: con le partenze vicine accese non alzano il tetto.
  Spegnere le partenze vicine sotto carico (circa ×3 nei picchi) è una
  scelta di prodotto dell'utente, non presa.

**Conseguenze.** I percorsi e il contratto non cambiano. Nel container ci
sono 3 processi in più (il forkserver e 2 lavoratori). Il forkserver vuole
una cartella temporanea scrivibile per l'uid 10001: si controlla al
passaggio sul server (`out/TASK-276/SERVER-B.md`). Le zone sono in memoria
nei lavoratori; l'API ne carica solo per l'archivio vicino. Lo stesso
difetto del Mac tocca anche le partenze vicine avviate dal thread
principale (test, comandi), fuori da questa decisione.

## ADR-0341, precisazione C — Le schede della palestra: la chiave nell'allenamento, l'ultima modifica vince, i giorni saltati

**Stato**: Attiva · 2026-11-08 · TASK-411 parte C. Deciso dall'agente su
delega dell'utente, dalla sua scelta «Schede + giorni» del 2026-11-06
(ADR-0341 in `docs/archive/DECISIONS-fino-al-2026-11.md`).

L'allenamento dice la sua scheda con la **chiave** (`gym_sessions.plan_key`),
non con un riferimento: può arrivare all'API prima della scheda, e una
scheda eliminata lascia i suoi allenamenti come erano (senza nome). I giorni
in API sono 1 lunedì–7 domenica, nel database sette bit. Una scheda mandata
più vecchia di quella tenuta non la sostituisce (due telefoni dello stesso
account: vince l'ultima modifica); eliminarne una che non c'è non è un
errore. I giorni saltati contano da quando la scheda è arrivata all'API
(`created_at`) fino a ieri, sul fuso chiesto; un allenamento libero non
riempie il giorno di una scheda. Sul telefono le schede stanno in un file
(`gym-plans.json`): una modifica o un'eliminazione aspetta lì finché l'API
non l'ha, e la lista dell'API sostituisce solo quelle che il telefono non
ha cambiato dopo. «Start workout» segue la prima scheda di oggi
dell'account mostrato in «Draw»; l'allenamento copia la scheda quando
comincia. Una serie conta per il primo esercizio della scheda dello stesso
tipo ancora incompleto; finito un esercizio, quello dopo diventa quello in
corso da solo, coi valori della scheda nei campi se non ci sono serie di
prima.
## ADR-0342, aggiunta — La parte A1: la neve nel motore prima del contratto, le quote condivise in `heights.py`

**Stato**: Accettato · 2026-11-08 · TASK-413 A1. Deciso dall'agente su
delega dell'utente; `ENGINE_ONLY` e `heights.py` approvati dal Coordinatore
il 2026-11-08.

1. **Le ciaspole entrano nel motore prima che nel contratto.** Una tupla
   nuova del registro, `activities.ENGINE_ONLY`, tiene le attività che il
   motore disegna e il contratto non ha ancora: `snowshoeing` fino ad A2.
   `SUPPORTED_ACTIVITIES` (e quindi `API_ACTIVITIES`, shared-types, l'API)
   non cambia; `ACTIVITIES`, `DISTANCE_LIMITS_M`, `SNOW_ACTIVITIES` e
   `FREE_ACTIVITIES` la contano. A2 la sposta in `ENGINE_ACTIVITIES` insieme
   alle righe del contratto. È come prima di TASK-376, quando
   `SUPPORTED_ACTIVITIES` era un sottoinsieme di `ACTIVITIES`.
2. **`FREE_ACTIVITIES` = acqua + neve**: niente parole, immagini né
   disegni (`ON_SNOW_SHAPES_ONLY`, testo suo), `near` permesso come
   sull'acqua (il testo di `NEAR_ON_WATER_ONLY` resta: l'API lo usa).
3. **`route_engine/heights.py` è il modulo condiviso delle quote** (ADR-0300
   parte G, ADR-0344 C): tegole Terrarium zoom 13 in `<cache>/heights/`
   come PNG scaricati, decodificate con Pillow (già dipendenza del motore,
   quindi anche del server), quota bilineare per punto, griglia di pendenze
   a celle di 25 m. Il download passa da una funzione sostituibile
   (`fetch`): i test non usano la rete. TASK-347 G vi aggiunge
   `elevation_profile`, TASK-415 C la pendenza sotto la traccia: nessun
   `terrain.py` nuovo nel server.
4. **La neve è un `water.WaterArea`** costruito da `snow.build_area` con le
   regole della variante `chosen` (`snow.CHOSEN`); `water.py` e
   `water_fit.py` non cambiano. Gli errori di `water_fit` sono detti per la
   neve (`NoSnowError`, `SnowFitError`, con la distanza a cui la forma
   entra). La verifica è `snowshoeing.check_on_snow`: chiusa, nulla fuori
   dalla neve permessa, entro il 10%; nessuna fascia di riva.
5. **L'impronta**: `heights.py`, `snow.py` e `snowshoeing.py` stanno fuori
   (`route_store.SNOW_ONLY`, come `DRAWN_WATER_ONLY`); `models.py`,
   `activities/` e `__main__.py` la cambiano senza cambiare un percorso: tre
   righe in `SAME_ROUTES_AS` con la prova `5e374d843dda.json` (i nove
   percorsi fissi identici, darwin-arm64) e la canoa del banco identica
   (`compare --same`, 27 percorsi). Quando G farà leggere le quote a ogni
   percorso, `heights.py` esce da `SNOW_ONLY`.
6. **La cache della neve** è `<cache>/snow/snow_<s>_<w>_<n>_<e>.json`, nel
   formato dell'acqua (`water.read_water`); un file che contiene l'area
   chiesta la serve. Il riquadro di una richiesta è quello dell'acqua senza
   la fascia di 1 km di riva, più 100 m (`snow.snow_bbox`). Il filtro chiede
   anche le `relation` di parchi, giardini, golf e campi: al banco un parco
   di città disegnato così (Parco Sempione, Milano) passava per neve.

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

## ADR-0352, precisazione A1 — Il server dei link dal vivo

**Stato**: Attiva · 2026-11-08 · TASK-424 parte A1 (#983) · deciso
dall'agente su delega dell'utente

- Migrazione `0063_live_shares.sql`: `live_shares` (hash SHA-256 del
  token, mai il token) e `live_share_points`, `CASCADE` dall'account.
- Un token sconosciuto e uno scaduto rispondono uguali (`200`, `status:
  "expired"`): la pagina non distingue un link mai esistito da uno finito.
  Uno fermato risponde `stopped` finché la sua riga vuota resta (un
  giorno).
- Un link nuovo ferma quelli dello stesso account non ancora finiti; quelli
  finiti tengono la loro ora di riepilogo. Dopo `finished`, `stop` o la
  scadenza, gli aggiornamenti rispondono `410`.
- Limiti: 20 link al giorno per account, 200 punti per aggiornamento,
  20 000 per link, 2000 per risposta (`more`), 120 letture al minuto per
  link, anche il `429` con l'intestazione CORS del sito.
- Le copie notturne del database (`deploy/backup.sh`) lasciano fuori le
  righe dei due tavoli (`--exclude-table-data`): la privacy dice che le
  posizioni si cancellano, e nelle copie resterebbero 14 giorni.

## ADR-0352, precisazione A2 — La pagina dei link dal vivo

**Stato**: Attiva · 2026-11-08 · TASK-424 parte A2 (#1010) · deciso
dall'agente su delega dell'utente

- `site/live/` senza framework né build: la logica pura in `view.js`
  (token, richieste, risposte, riga sotto il titolo, numeri, stile della
  mappa), provata con la fixture `live-view.json`; `live.js` solo pagina,
  mappa e timer. `view.js` è un file in più rispetto alla lista approvata,
  nuovo e nella stessa cartella.
- Le richieste: ogni 10 s; subito con `more`; ogni 60 s quando l'attività
  è finita (non cambia più, si aspetta solo la scadenza); nessuna più dopo
  `stopped` o `expired`; dopo un `429` 30 s, perché il browser non può
  leggere `Retry-After` (l'API non lo espone col CORS). Una richiesta alla
  volta; al ritorno sulla scheda una subito.
- L'ora dell'ultimo aggiornamento si misura col clock del browser: la
  prima risposta usa `updated_at`, le altre al più un giro (10 s) prima
  dell'arrivo, così un orologio del computer sbagliato non fa dire «No
  update since» a un link vivo. Il tempo avanza fra due risposte solo con
  `live`; dopo 2 minuti di silenzio torna l'ultimo del telefono.
- Passo o velocità come l'app: velocità per bici, gravel, MTB, roller e
  sci alpino, passo per 500 m in canoa e per 100 m a nuoto, passo per km
  per gli altri (anche gli sport che verranno); arrotondato come
  `paceClock`. Miglia e piedi per un browser `en-US`/`en-GB` (le regioni
  di `phoneUnits.ts`).
- La mappa ha lo stile scuro dell'app copiato in `view.js`; i suoi colori
  stanno una volta in `live.css` e un test li confronta con `tokens.ts`.
  MapLibre 5.24.0 copiato dal pacchetto npm; un test ne confronta gli hash
  con gli SRI di `mapPage.ts`.
- Un indirizzo senza token valido dice «This link has expired», come
  l'API. `?api=` (solo da `127.0.0.1`/`localhost`, solo verso un indirizzo
  locale) serve a provarla sul Mac contro un finto `/live`: l'API vera
  lascia leggere `/live` solo a `https://getmuw.app`.
## ADR-0352, precisazione B1 — L'app: lo stato fuori da React, gli invii dal task della posizione, il consenso a ogni link

**Stato**: Attiva · 2026-11-10 · TASK-424 parte B1 (#1025, a25a24a9) ·
deciso dall'agente su delega dell'utente; il consenso a ogni link è
scelta dell'utente del 2026-11-10 («ok procedi»)

- **Lo stato del link sta fuori da React** (`src/liveShare/liveShareStore.ts`),
  un link alla volta come la corsa: il task della posizione
  (`navigation/runPosition.ts`) gli passa ogni posizione e fa partire
  l'invio, anche a telefono bloccato; nessun task nuovo. Lo schermo della
  corsa (`RunCard`, con `useLiveShareFeed`) gli passa traccia, calorie,
  battito dell'orologio e pausa; i numeri si calcolano dalla traccia al
  momento dell'invio. Davanti un timer di 5 s porta i segnali della pausa e
  i nuovi tentativi della fine anche senza posizioni.
- **La macchina degli invii** (`liveSharer.ts`) non ha orologio né timer
  suoi: 15 s in movimento, 60 s in pausa, subito a ogni cambio di stato;
  un punto ogni 5 s al più, 200 per invio (subito il resto dopo un invio
  pieno), coda di 500 che perde i più vecchi; un tentativo fallito aspetta
  il giro normale. `410`, `404` e `401` chiudono il link; un `422` scarta
  quei punti; rete, `5xx` e `429` li tengono. `finished` riprovato fino a 4
  volte, poi il link scade da solo. Lo stop chiude subito sul telefono e
  manda il `DELETE`, una seconda volta se manca la rete.
- **I punti** vengono dal task della posizione (precisione entro
  `MAX_ACCURACY_M`) e, dove il GPS va solo in primo piano (Expo Go, un
  servizio Android rifiutato), dalle posizioni nuove della traccia dello
  schermo; la stessa posizione non entra due volte. Solo da quando c'è il
  link: il server non prende punti più vecchi di 5 minuti.
- **La fine** è quando la scheda della corsa se ne va (finita, salvata o
  no), non quando `live` diventa falso: un GPS perso a metà corsa non
  chiude il link. Una fine mentre il link si sta facendo lo cancella.
- **Il consenso** torna a ogni link nuovo: ogni link è nuovo e il battito
  è un dato di salute (scelta dell'utente del 2026-11-10). Il foglio di
  condivisione del telefono si apre solo dopo che il nostro foglio è
  sparito (su iOS a `onDismiss`, come TASK-358). Su «Compass» niente
  pulsante né etichetta.
- **Impronta iOS** invariata: `6f8bba4c`, come la build 8 di produzione.
  Nessuna dipendenza nuova: `fetch` e `Share` di React Native.

## ADR-0352, precisazione B2 — Piscina e palestra: gli stessi pulsante e invii, i numeri senza traccia, il consenso senza mappa

**Stato**: Attiva · 2026-11-10 · TASK-424 parte B2 (#1053, 52010be4) ·
deciso dall'agente su delega dell'utente; il testo del consenso è scelta
dell'utente del 2026-11-10 («Testo nuovo»), l'uscita a parte la sua scelta
dello stesso giorno («Esce ora», per B1)

- **Nessuna seconda copia di B1**: lo stesso store, la stessa macchina
  degli invii, lo stesso pulsante. Uno schermo senza traccia passa allo
  store una funzione che dà i numeri a un dato momento
  (`observeLiveNumbers`, dall'hook `useLiveShareNumbers`): l'orologio si
  legge a ogni invio, senza un valore nuovo ogni secondo; i punti non ci
  sono. Una corsa dopo torna ai numeri della traccia.
  `LiveShareButton` prende `trackless` (attività e vasca).
- **I numeri** (`liveStats.tracklessStats`) nei limiti di `LiveStatsBody`:
  tempo senza pause, calorie (`null` a zero, come lo schermo non le
  mostra), battito, vasche, esercizio (al più 80 caratteri, contati come
  l'API). Niente distanza né dislivello.
- **Piscina** (`pool/poolLive.ts`): `activity: "swimming"` e
  `pool_length_m`; le vasche con `estimateLengths` e il passo medio delle
  nuotate prima, come «How many lengths?», ma 0 prima di mezza vasca (la
  stima di fine nuotata parte da 1); le calorie con `poolKcal` su quelle
  vasche.
- **Palestra** (`gym/gymLive.ts`): `activity: "gym"`; l'esercizio in corso
  col nome nella lingua dell'app (`entryName`), le calorie di `gymKcal`
  come sullo schermo.
- **Il battito** parte `null`: oggi nessuna fonte dal vivo segue piscina e
  palestra (`useWatch` segue solo la corsa; quello della piscina di
  TASK-409 B si legge da Apple Salute a fine nuotata). Il campo c'è per
  quando una fonte arriverà.
- **Il consenso** di piscina e palestra ha un primo testo suo, senza mappa
  né percorso; il secondo resta quello di B1.
- **La fine** è quando lo schermo della registrazione se ne va (fine,
  «Still training?» senza risposta), come in B1.
- **Impronta iOS** invariata: `6f8bba4c`. Nessuna dipendenza nuova.

## ADR-0347, precisazione B — Tutti i disegni del catalogo nella pagina «Explore», città per città dalla più vicina, a pagine da `GET /catalog`

**Stato**: Accettata · 2026-11-10 · TASK-420 parte D. Scelta dell'utente,
parole sue: «tutte le forme devono essere nella pagina ma non dentro
catalogo, migliora la pagina esterna»; sul mockup «A, griglia per città».
Il resto deciso dall'agente su delega dell'utente.

**Contesto**: la precisazione precedente mette i tenuti «nella lista di
«Explore» che c'è», cioè «Best near you» entro 5 km e gli esempi per città:
così si vede solo quello che sta vicino. L'utente vuole invece **tutte** le
forme del catalogo nella pagina, senza una pagina a parte (ADR-0348,
superata) e senza filtri (ADR-0144).

**Decisione**:

1. **«Explore» è una lista sola, virtualizzata** (`FlatList`): la testata è
   la pagina com'era (ricerca, chip, paesi vicini, esempi, «Recommended»,
   le schede entro 5 km sotto «NEAR YOU»), le righe sono il catalogo.
2. **Il catalogo arriva dal server a pagine**: `GET /catalog?lat&lon&offset&limit`
   dà `{total, cities, routes}` con le stesse voci di `/recommended-routes`,
   città per città dalla più vicina al punto, per somiglianza dentro la
   città. L'app chiede 40 voci alla volta mentre si scorre e non mostra due
   volte quelle di «NEAR YOU». Niente JSON nell'app.
3. **Senza l'endpoint la pagina è quella di prima**: 404 o una risposta
   che non è una pagina valgono «niente catalogo»; l'app entra prima del
   server. Una pagina fallita dopo la prima lo dice in fondo con «Try again».
4. **«Ask for a route» diventa una riga** che apre il modulo sotto di sé:
   la pagina continua e il modulo non può più stare in fondo.
5. **Il titolo è «Explore»** con il conto del catalogo; «Best near you»
   resta solo come etichetta «NEAR YOU» della prima sezione.

**Alternative**: righe orizzontali per figura (B del mockup), scartata
dall'utente; un JSON nel bundle (ADR-0348), superato: il seme cresce con
TASK-419; alzare i limiti di `/recommended-routes` (60 entro 50 km): non
dà l'ordine per città né il totale.

**Conseguenze**: un endpoint nuovo nell'API, senza migrazione, da
assegnare (TASK-420 parte E o TASK-419); l'app in #1022.

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

## ADR-0345, precisazione B — La mia immagine nel video: i fotogrammi in RGBA entro 2 MiB, le scelte sotto la riga, il cartellino sul 3D

**Stato**: Attiva · 2026-11-10 · TASK-417 parti B e C (#1067, 87f98fd6) ·
deciso dall'agente su delega dell'utente; le scelte di prodotto restano le
1–5 del task file

- **Il ritaglio**: `expo-image-picker` con `allowsEditing` e
  `aspect: [1, 1]`, per la libreria e per la fotocamera. Su iOS l'editor
  ritaglia ogni fotogramma di una GIF e la lascia animata
  (`processGifData` con `cropRect` in expo-image-picker 57). Una foto si
  tiene come JPEG di 256 px (`expo-image-manipulator`), una GIF così com'è,
  dopo averla letta una volta. Un'immagine sola, nella cartella documenti
  dell'app (`my-image.jpg` o `my-image.gif`).
- **Il formato verso la pagina** (punto 3, misurato): una foto passa come
  data URL JPEG, letta da un `img`; una GIF come i suoi fotogrammi in RGBA
  base64, posati con `putImageData`. Al più 8 fotogrammi a distanza uguale,
  di al più 256 px; tutti insieme entro **2 MiB** di RGBA: se non ci stanno,
  meno fotogrammi, mai meno di uno. Ognuno dura quanto i fotogrammi che
  rappresenta, così il giro tiene la sua velocità. Oltre 40 milioni di
  pixel da posare (una GIF lunga) si legge solo il primo. Una GIF di 12
  fotogrammi scritta da ImageIO: 8 fotogrammi in 7 ms (Node).
- **Le scelte sotto la riga**, non in un foglio sopra il foglio: «Choose a
  photo», «Take a photo» e «Remove image» compaiono sotto «Character»,
  come quelle della foto del profilo; così il picker di sistema si apre
  sopra senza un Modal che si chiude. La casella vuota apre le scelte;
  un'immagine tenuta e non scelta si sceglie con un tocco; toccata da
  scelta, riapre le scelte.
- **Nel video**: tonda, larga 0,6 della lunghezza dell'animale, con un
  anello del colore della linea; inclinata al più di 12° nel verso della
  strada, mai capovolta; il saltello lo calcola la scena (`hop`, |sin| a
  2,5 salti al secondo, al più il 7 % della lunghezza dell'animale, 0 a
  riposo). Sul 3D sta in piedi su un'asticella alta 0,55 volte la sua
  larghezza, sopra un'ombra tonda.
- **Il personaggio** è `Actor = Character | "my_image"`
  (`share/videoActor.ts`); `prepareActorCall` dà alla pagina la chiamata
  per l'animale o per l'immagine, `null` se non si legge.
- **Nessuna rete**: `prepareImage` non carica three.js né altro; un test
  legge l'immagine dalla cartella dell'app con `fetch` e `XMLHttpRequest`
  sotto controllo.
- **Impronta** iOS `6f8bba4c` e Android `227457f3`, invariate; nessuna
  dipendenza nuova.

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

## ADR-0314, precisazione — La parte B3a1: il percorso all'orologio e la lista «Routes»

**Stato**: Attiva · 2026-11-08 · TASK-370 parte B3a1, decisa dall'agente su
delega dell'utente; scelte dell'utente 4, 5, 7, 8 del task file; lista dei
file approvata dal Coordinatore (local_3f55a0e9).

**Contesto**: l'orologio deve correre senza telefono un percorso che il
telefono gli ha mandato («Pulsante e preferiti»). I preferiti e i percorsi
di «Explore» non hanno direzioni: il telefono le chiede a `/route-directions`
al via.

**Decisione**:
1. **Il telefono decide, l'orologio segue**: `src/watch/watchRoute.ts`
   prepara il percorso una volta (direzioni semplificate, tratti a penna
   alzata che stanno sui punti, `startsAnywhere`, `isRide`, canoa, distanza
   d'annuncio, coordinate a 6 decimali) e lo manda col messaggio nuovo
   «route» (`transferUserInfo`). «routes» porta le chiavi dei preferiti
   (B3a2). Nessuna versione nuova del protocollo: un tipo sconosciuto si
   ignora già.
2. **Il contratto** è `Fixtures/routes.json`, scritto da
   `scripts/watch-routes.sh` dal codice del telefono e letto da
   `WatchRoute.swift`; `messages.json` ha i casi validi e rifiutati.
3. **«Send to watch»** sta sotto «Send to a friend» nella colonna del cuore
   (`FavoriteHeart.tsx`, non `App.tsx`), solo con un orologio abbinato che
   ha l'app (`watchLink.ready()`); chiede le direzioni come al via, nessuna
   sull'acqua; senza rete «No connection…», testo che l'app ha già.
4. **Sull'orologio** `RouteShelf` (WatchCore, puro) tiene tutti i preferiti
   e gli ultimi 20 mandati, sostituisce per chiave; `RouteStore` lo salva in
   un file; la prima pagina è «Routes» con «Run without a route» in cima. Un
   percorso fa partire il suo sport: la guida in corsa è B3b.
5. **Un testo che vede solo l'orologio** sta nelle tabelle dell'app e in
   `watchTexts.ts` con `tLater`, così il controllo dei testi non usati lo
   tiene.

**Conseguenze**: il telefono chiede le direzioni a ogni invio (rete
necessaria, come al via). B3a2 manderà i preferiti da soli col messaggio
«routes». Il codice dell'orologio si prova con un prebuild locale
`MUW_WATCH=1`; impronta iOS senza variabile invariata.
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

## ADR-0340, precisazione F — La card del Feed come la pagina

**Stato**: Attiva · 2026-11-08 · TASK-410 parte F (#980). Scelta
dell'utente, «Tutto come la pagina»; il resto deciso dall'agente su delega
dell'utente.

**Contesto**: vista la pagina del post (parte B), l'utente ha chiesto lo
stesso aspetto nella card del Feed; TASK-410 la lasciava com'era.

**Decisione**: la card di un post di un membro ha i numeri in riquadri
(`SummaryBoxes`, dalle righe di `postSections`) al posto della riga di
testo, e la stessa barra delle quattro azioni della pagina (`PostActions`,
condivisa con `PostSheet`): Like (le sei reazioni), Comment, Share solo sui
propri, Edit & run. Supera la scelta 4 di TASK-355 (ADR-0306): il «Draw it
near me» giallo lascia la card e resta sul disegno aperto sulla mappa.
`ActionBar` si toglie invece di tenerne due; gli esempi tengono la riga di
testo.

**Conseguenze**: card e pagina cambiano insieme; il testo «Reactions» esce
dalle tabelle; `DrawAgainContext` resta in `App.tsx` senza chi lo usa nel
Feed, da togliere a parte.

## ADR-0346 — Le forme candidate: disegnate da primitive, fuori dal pacchetto finché l'utente non le giudica

**Stato**: Attiva · 2026-11-08 · TASK-418. Deciso dall'agente su delega
dell'utente; numero dal Coordinatore.

**Contesto**: 49 forme nuove per il catalogo grande di «Explore», approvate
dall'utente sulla carta. Le forme di prima erano disegnate a mano, punto per
punto, una alla volta (ADR-0035). ADR-0036 vuole il giudizio su strade vere
prima che una forma entri nel catalogo.

**Decisione**:

1. Ogni forma è scritta in `tools/draw_new_shapes.py` come unione di
   cerchi, ellissi, rettangoli e linee spesse (shapely, già dipendenza del
   motore): il contorno esterno è il contorno, i buchi (l'anello
   dell'ancora, l'arco del lucchetto) e i dettagli staccati (gli occhi, le
   ruote della bici) sono `pieces`. Semplificata a 0,006, partenza nel
   punto più alto; un dettaglio a meno di 0,03 da un'altra linea resta
   fuori.
2. I file stanno in `services/route-engine/candidate_outlines/`, **fuori**
   da `route_engine/`: non entrano in `SHAPES`, né nello zip del motore sul
   telefono (`tools/phone_engine`, che prende il pacchetto intero). Il CLI
   li pianifica con `--outline`. Una chiave in più, `category`, dice il
   gruppo del catalogo; `read_outline` la ignora.
3. Una forma approvata su strade vere si sposta in
   `route_engine/shapes/outlines/` e si registra (motore, contratto, app)
   in un task suo.

**Motivo**: 49 forme a mano costano giorni e sbagliano più spesso; dalle
primitive si ridisegnano in un secondo e il test controlla che i file siano
quelli dello script. Fuori dal pacchetto non toccano l'app né il catalogo
finché l'utente non ha scelto.

**Alternative**:

- **Subito in `outlines/`**: cambia lo zip del motore sul telefono (un file
  dell'app) e porta sul telefono forme non giudicate; scartata.
- **Dalle immagini generate** (`image_outline.py`): contorni più
  irregolari e licenze delle immagini da chiarire; scartata per ora.

**Conseguenze**: TASK-419 pianifica le candidate con `--outline` (o con il
seme esteso a leggere `candidate_outlines/`). La registrazione delle forme
approvate è una parte successiva di TASK-418.

## ADR-0334, precisazione D, aggiunta B1 — Il battito sulla corsa: medio, massimo, «Show heart rate»

**Stato**: Attiva · 2026-11-08 · TASK-409 parte B1. Scelte dell'utente in
`tasks/TASK-409.md` (5: «Anche nel post del Feed»; 6: «Pulsante a fine
nuoto»); il resto è deciso dall'agente su delega dell'utente, e col
Coordinatore: la parte B costruisce i pezzi di TASK-345 B (server) e C, e di
TASK-374 D.

1. **Sulla corsa, non sul nuoto**: `runs.heart_avg_bpm`, `heart_max_bpm`,
   `heart_shown` (`0061`), così TASK-345 B li usa per ogni sport senza una
   migrazione sua. Oggi li scrive solo `PUT /me/pool-swims/{key}`.
2. **Limiti**: da 30 a 230 bpm, tutti e due o nessuno, il medio non sopra il
   massimo: nel contratto (`422`) e nel vincolo del database.
3. **Chi li vede**: il proprietario sempre; gli altri in `GET
   /drawings/{id}/pool-swim` solo se `heart_shown` (vero se il telefono non
   lo manda). Il filtro sta nel server. Il Feed generico (`FeedPost`) e «My
   activities» non li hanno ancora: arrivano con TASK-345 B.
4. **Una volta sola**: col primo `PUT`, come il resto del nuoto. Cambiare
   «Show heart rate» dopo non si può ancora.
5. **Compatibilità**: senza battito le risposte non hanno i campi
   (`response_model_exclude_none`), così le app di oggi e i loro test vedono
   lo stesso corpo di prima; il vecchio esempio `pool-swim.json` resta, quello
   col battito è `pool-swim-heart.json`.

## ADR-0334, precisazione D, aggiunta B2 — Il battito a fine nuoto: lettura da Salute, tempo nelle zone, privacy

**Stato**: Attiva · 2026-11-08 · TASK-409 parte B2. Scelte dell'utente in
`tasks/TASK-409.md` (5, 6, 7); il resto è deciso dall'agente su delega
dell'utente.

1. **Moduli condivisi, file nuovi**: `health/heartSamples.ts` (la lettura in
   una finestra, pause escluse; letture fuori da 30–230 scartate; medio e
   massimo interi, il medio mai sopra il massimo) e `body/zoneTime.ts` (i
   secondi in ogni zona). Sono i pezzi di TASK-345 C e TASK-374 D: quei task
   li agganciano alle corse senza riscriverli.
2. **Solo dove c'è il nativo**: `health/heartModules.ts`, separato da
   `healthModules.ts`, carica la libreria solo con Nitro su iOS. Sulla build 7
   e su Android è null e non si chiede nulla. La 1.0.1 ha già
   `NSHealthShareUsageDescription` per il battito: il tipo si chiede a runtime
   (`toRead`), l'impronta `6f8bba4c` non cambia.
3. **Il consenso**: il primo tocco su «Add heart rate from Apple Health»
   apre la richiesta di iOS ed è tenuto in `pool-heart.json`; ai nuoti dopo si
   legge da solo. iOS non dice se la lettura è stata negata: negata vuol dire
   nessuna lettura, e allora «No heart rate from your watch for this swim.».
4. **Tempo in zona**: una lettura dura fino alla successiva, al più 60 s (un
   buco più lungo è una lettura persa); l'ultima fino alla fine, con lo stesso
   limite. Sotto la zona 1 non conta, sopra il massimo è zona 5. Le zone sono
   quelle di «Heart rate zones» (TASK-374 B); senza FC massima né anno di
   nascita si vede solo il medio.
5. **Dove si vede**: a fine nuoto (medio, zone, fonte); «Show heart rate»
   nel modulo del post, acceso; il medio nella tessera del Feed e nella
   scheda, quando l'API lo dà. Il tempo nelle zone resta sul telefono.
6. **Privacy** dell'app e del sito con i testi approvati (scelta 7), datata 8
   novembre 2026: da ridatare al giorno del merge se entra dopo.

## ADR-0338, aggiunta — Seguire una stazione: «Le tue stazioni» senza notifiche, i post della stazione da `runs.ski_resort_id`

**Stato**: Attiva · 2026-11-08 · TASK-406 parte D3a. La scelta di cosa vuol
dire seguire è dell'utente («Le tue stazioni», 2026-11-08); il resto è
deciso dall'agente su delega dell'utente, con la lista dei file mandata al
Coordinatore.

**Contesto**: la domanda 4 voleva nella pagina della stazione i post dei
membri e un tasto per seguirla. Seguire poteva dare anche notifiche.

**Decisione**:

1. **Seguire** mette la stazione fra «Your resorts», per prime nella scheda
   «Ski» e in «Cambia» durante la giornata. Nessuna notifica. La tabella
   `resort_follows` (migrazione `0062`) ha l'account e la stazione, tutti e
   due con `ON DELETE CASCADE`: una stazione tolta da un import esce dalle
   seguite.
2. **Le rotte**: `PUT` e `DELETE /me/ski-resorts/{id}/follow` (204, la
   `PUT` dà 404 per una stazione che non c'è), `GET /me/ski-resorts` (le
   seguite, l'ultima prima, nella forma della ricerca, al più 200).
3. **I post della stazione**: `GET /ski-resorts/{id}/drawings` dà le
   giornate di sci con quella stazione (`runs.ski_resort_id`, della D1) che
   chi chiede vede su un profilo (`shown_sql`), con `X-MuW-Reads`, dalla più
   recente, a pagine come un profilo. Riusa le colonne e i dettagli di
   `drawings.py` come fa `contests.py`, senza cambiare quel file.

**Alternative**:

- **Le notifiche** a ogni giornata pubblicata in una stazione seguita:
  scartate dall'utente.
- **Le seguite sul telefono**: scartate, perché si perdono cambiando
  telefono e non seguono l'account.

**Conseguenze**: una migrazione (`0062`), quindi
il server col sì dell'utente. L'app (D3b) viene dopo, con i suoi testi.

---

## ADR-0349 — I cancelli chiusi tolgono il nodo dalla rete foot: si passa o no

**Stato**: Accettato · 2026-11-08 · TASK-421, PR #973. Numeri dal
Coordinatore. La richiesta è dell'utente (correndo ha trovato strade del
percorso chiuse da un cancello); la lista dei tag e il modo di togliere
sono decisi dall'agente su delega dell'utente.

**Contesto**: `FOOT_FILTER` (`networks/foot.py`) scarta le vie
`access=private` e `foot=no`, ma Overpass filtra solo le vie: un cancello è
un **nodo** (`barrier=gate`, `lift_gate`, `swing_gate`…) con i suoi tag
(`access`, `foot`, `locked`), e il filtro non lo vede. OSMnx semplificava il
grafo appena scaricato, unendo le vie in archi e buttando i tag dei nodi:
nelle zone in cache un cancello chiuso è un punto qualunque di un arco, e
il motore ci disegna sopra. La rete `roller` (ADR-0324, `skate_ways`) e la
carrozzina (ADR-0343, punto 2: «una barriera che blocca toglie il nodo»)
hanno già il modo: scaricare senza semplificare, con i tag che servono,
togliere, poi semplificare. Misurato offline dalle risposte Overpass in
cache (`data/cache/http/`): Trento 17 km 1.871 nodi `barrier`, 122 tolti
(6,5 %), 7,0 km di vie chiuse, rete 841,8 → 832,0 km; Milano 28.462 (quasi
tutti `kerb`), 123 tolti, 46,0 km di vie (38,6 km di `service` con
`access=no`), 3.224,8 → 3.176,7 km; Levico 126, 26 tolti, 2,1 km, 628,9 →
626,1 km; Parigi 11.755, 132 tolti, 14,7 km, 1.391,6 → 1.375,4 km. I
cancelli **senza tag** sono la maggioranza (Trento 627 `gate` e 220
`lift_gate` nudi) e restano. Cancelli nudi su vie `access=destination`: 4 a
Trento, 9 a Milano.

1. **Il download della rete foot non semplifica** (`download_foot_graph`,
   `simplify=False`), chiede i tag dei nodi `barrier`, `access`, `foot`,
   `locked` (`FOOT_NODE_TAGS`, `base.node_tags` accanto a `way_tags`) e
   `foot` sulle vie; `foot_ways` toglie i nodi che bloccano e le vie
   chiuse, poi semplifica come OSMnx (`simplify_graph`, come `skate_ways`).
   Il grafo foot resta senza attributo `network`, come prima.
2. **Un nodo `barrier` si toglie** (`blocks_foot`), nell'ordine:
   `foot=no|private` → tolto; `foot=yes|designated|permissive|destination`
   → resta, qualunque cosa dicano gli altri tag; `barrier=fence|wall` (una
   recinzione disegnata come nodo della via) → tolto; `bollard`, `kerb`,
   `cycle_barrier`, `block`, `kissing_gate`, `stile`, `cattle_grid`, `log`,
   `planter`, `chain`, `rope`, `height_restrictor`, `motorcycle_barrier`,
   `jersey_barrier`, `sump_buster`, `bus_trap`, `debris` → resta (il suo
   `access` parla ai veicoli: un dissuasore con `access=no` ferma le auto);
   ogni altra barriera (`gate`, `lift_gate`, `swing_gate`, `sliding_gate`,
   `wicket_gate`, `turnstile`, `entrance`, `yes`…) → tolta se `access=no`,
   `access=private` o `locked=yes`, altrimenti resta. Un cancello nudo
   passa. Togliere il nodo taglia la via lì: si passa o no, niente tratti
   «a piedi».
3. **Una via si toglie** (`closed_to_foot`) se `foot=no|private`, o se
   `access=no|private` senza un `foot` che apre; `access=destination`,
   `customers`, `permit`, `agricultural` restano. Il filtro Overpass resta
   com'è (l'estratto lo legge, `zone_extract`, e serve i tag dei nodi).
4. **La rete `hike` eredita** tutto: passa da `download_foot_graph`.
5. **Il bordo della zona cambia di poco**: OSMnx semplificava con 500 m di
   margine e poi ritagliava, buttando intere strade con un capo fuori; ora
   si ritaglia prima e si semplifica dopo (come `bike` e `roller`), e il
   tratto interno di una strada che esce resta (Levico: 3.531 → 3.621 nodi,
   607 → 629 km con la stessa risposta). Al banco la rete ricostruita così
   senza la regola dà le stesse 72 forme della cache di oggi, punto per
   punto (una diversa, stessa somiglianza).
6. **Le zone in cache restano valide** finché non si rifanno: sono
   semplificate e senza tag, quindi i cancelli restano lì dentro. Il piano
   (Mac dalle risposte in cache, server dall'estratto) è in `MAPS.md` «I
   cancelli chiusi» e `DEPLOY.md` F.15; l'azione sul server aspetta il sì
   dell'utente, con `phone_zone_api` e `draw_examples` dopo.
7. **L'impronta del motore cambia** (è un cambio di comportamento):
   `ROUTES` nuovo in `tests/test_walk_fingerprint.py`; nuotate e canoa non
   usano la rete foot e tengono la loro con una prova delle stesse rotte
   (`SAME_ROUTES_AS`, ADR-0320).

**Motivo**: la regola segue i tag di OpenStreetMap così come sono scritti
(`access` sul nodo, `foot` che vince, `locked`), e toglie poco: l'1–7 % dei
nodi `barrier` e l'1–1,5 % dei km, soprattutto cortili privati. Al banco di
corsa (8 forme × 3/5/10 km) Trento e Milano non cambiano (mediana 0,91 e
0,96); a Levico la mediana passa da 0,84 a 0,80 perché le forme piccole
dal Lido non attraversano più otto cancelli privati o chiusi a chiave dei
vialetti del lido e del parco: è il caso del task.

**Alternative scartate**:
- togliere ogni `barrier=gate`: a Trento 627 cancelli nudi su 1.001, quasi
  tutti aperti o di campagna;
- ereditare l'`access` della via sul cancello nudo (`access=destination`):
  4 casi a Trento, 9 a Milano, e una via `access=destination` si percorre;
- un costo alto invece di togliere: un cancello chiuso non si passa, e un
  arco caro finisce nei percorsi lo stesso quando è l'unica via;
- rileggere i tag dei nodi dalle zone già in cache: non ci sono più;
- lasciare che l'utente segnali un cancello dall'app: scelta di prodotto,
  fuori scope (`tasks/TASK-421.md`).

**Conseguenze**:
- i percorsi nuovi evitano i cancelli chiusi e privati e le vie
  `access=no`; qualche vicolo cieco in più (Trento 231 → 266 pezzi,
  spezzoni dietro un cancello); dove c'era un cancello la forma cambia;
- ogni zona foot va rifatta per avere l'effetto: Mac e server (piano in
  `MAPS.md`/`DEPLOY.md`), poi `phone_zone_api` e `draw_examples`;
- `bike`, `mtb` e `roller` non cambiano (reti loro); `hike` sì;
- `engine.zip` del telefono ricostruito; le misure e il banco in
  `tasks/TASK-421.md`.
---

## ADR-0314, precisazione — La parte B3a2: i preferiti sull'orologio da soli, uno alla volta

**Stato**: Attiva · 2026-11-08 · TASK-370 parte B3a2, decisa dall'agente su
delega dell'utente («Pulsante e preferiti»); lista dei file approvata dal
Coordinatore (local_3f55a0e9). In `main` con la #993.

**Contesto**: i preferiti devono stare sull'orologio senza che l'utente li
mandi uno per uno, ma l'API li dà senza direzioni: ognuno va scaricato
intero e le sue direzioni chieste, come al via di una corsa.

**Decisione**:
1. **`useWatchFavorites`**, montato in `favoritesDoor.ts`, a ogni cambio
   della lista dei preferiti (con l'orologio pronto e l'account aperto)
   manda all'orologio quelli che non ha («route», `favorite: true`) e alla
   fine le chiavi di tutti («routes»): l'orologio lascia andare i tolti.
2. **Uno alla volta**: scaricato, direzioni, consegnato a WatchConnectivity,
   poi il successivo; mai due giri insieme, un cambio durante un giro ne fa
   partire un altro dopo.
3. **Senza rete si ferma** dove è arrivato: le chiavi già mandate stanno in
   un file (`watchSent.ts`, scritto dopo ognuna), il resto parte al cambio o
   all'apertura successiva. Un percorso che l'orologio non può tenere non si
   riprova.

**Conseguenze**: chi ha molti preferiti li vede arrivare sull'orologio uno
dopo l'altro, la prima volta. Se l'app dell'orologio viene reinstallata il
telefono non lo sa: i preferiti tornano al cambio successivo della lista.

## ADR-0339, precisazione C2b — La camera dietro l'animale: calcolata nell'app, mossa dalla pagina

**Stato:** deciso dall'agente su delega dell'utente (2026-11-08), con la
scelta dell'utente 12 (la camera si sceglie solo sul 3D).

1. **L'anteprima nel foglio diventa C2c**: è un modo nuovo della pagina
   del video, in una WebView visibile, e merita una PR sua. C2b è solo la
   camera.
2. **Tre modi di vedere il percorso sul 3D**: «Camera around» (il giro di
   prima, la scelta all'apertura del post: il video non cambia), «Camera
   behind» e «Line in 2D». Quest'ultima disegna tutto sulla foto dall'alto
   di C2a, come uno stile piatto.
3. **La camera la calcola l'app** (`videoChase.ts`), dalla traccia vera in
   metri su un piano attorno alla partenza: il centro 60 m davanti
   all'animale, la direzione della strada presa su 120 m e smussata su
   300 m (niente scossoni dal GPS), inclinazione 62°, 1,8 livelli di zoom
   più vicino del disegno intero (al massimo 16,5). Ogni fotogramma del
   percorso porta la sua camera e quanto la camera è scesa dalla vista
   intera (`u`): giù nel primo secondo, su nel secondo dopo il percorso.
   Così i test la provano senza la mappa.
4. **La pagina muove la mappa** a ogni fotogramma (modo `chase`). Prima del
   video prova 16 camere lungo il percorso, per le tessere e per il costo,
   come il giro di prima; sopra il budget, o finito il tempo, la mappa
   resta ferma con lo zoom lento (`still`) e l'animale corre lo stesso.
5. **Lungo la linea si misura in metri**: con la camera bassa la linea
   posata ha i pixel stirati vicino alla camera, quindi nel modo `chase`
   la pagina mette punta, emoji e animale alla quota di metri della
   scena, non di pixel. Gli altri modi restano come prima.

## ADR-0339, precisazione C2c — L'anteprima nel foglio: la pagina del video in modo «play»

**Stato:** deciso dall'agente su delega dell'utente (2026-11-08), con la
scelta dell'utente 13 (il video vero in loop, non un fotogramma fermo).

1. **La stessa pagina del video, visibile**: l'anteprima è `videoPage` in
   una WebView in cima a «Edit video», in un modo nuovo `play` che disegna
   i fotogrammi della scena in tempo reale su un canvas sopra la pagina,
   senza codificarli. Mappa, animale e camera sono quelli del video: niente
   secondo disegnatore da tenere uguale al primo. L'esportazione (`make`)
   non cambia.
2. **La pagina alla misura della sua mappa** (360 × 640 punti), mostrata
   rimpicciolita a 150 punti di larghezza: la mappa si disegna come per il
   video, dentro una pagina visibile.
3. **La scena si calcola mezzo secondo dopo l'ultima scelta**, non a ogni
   tocco; una nuova scena prende il posto della vecchia allo stesso
   secondo. Un nuovo stile o un nuovo animale ricaricano la pagina, perché
   la pagina prepara la mappa e il modello una volta sola.
4. **Sulle mappe parte a mappa pronta** (o quando non è venuta): prima
   resta fermo il fondo, anche sul 3D che può chiedere qualche secondo
   (richiesta del Coordinatore). Senza mappa parte subito.
5. **Il costo**: nel simulatore circa il 32 % di un core del Mac sulla
   Notte e il 40 % sul 3D con la camera dietro, solo con il foglio aperto
   (che smonta la pagina quando si chiude) e fermabile con un tocco. La
   batteria si misura sul telefono nella parte E.

## ADR-0340, precisazione C — `run_stats`: passi dal server, profilo e calorie dal telefono, il battito resta in `runs`

**Stato**: Attiva · 2026-11-08 · TASK-410 parte C (#1001). Scelte
dell'utente in `tasks/TASK-410.md` (2: «Visibili, nascondibili»); il posto
del battito deciso dal Coordinatore; il resto deciso dall'agente su delega
dell'utente.

**Contesto**: la pagina del post mostra passi, dislivello, cadenza, calorie
e battito solo quando ci sono. ADR-0340 metteva tutto in una tabella
`run_stats`; nel frattempo TASK-409 B1 (#979, `0061`) ha messo il battito
in `runs`.

**Decisione**:

1. **`run_stats`** (`0064`): una riga per corsa, `stats` `jsonb` con
   `splits_km`, `splits_mile`, `elevation`, `cadence_spm`, `kcal`. **Il
   battito non c'è**: si legge da `runs.heart_*` (scelta del Coordinatore,
   un posto solo), e `heart_shown` decide anche le calorie per chi guarda.
2. **I passi li conta il server** dalla traccia e dalle pause, a ogni `PUT
   /me/activities/{key}/stats`, non al salvataggio della corsa:
   `activities.py` resta com'è. L'ultimo pezzo dopo l'ultimo intero è un
   passo marcato (`partial_m`) solo da 100 m in su.
3. **Il telefono manda** profilo (dalle altezze dei punti, al più 120 a
   passi uguali) e calorie (`activeKcal` col corpo del telefono, metri e
   secondi del server), una volta, dopo che il server ha preso la corsa;
   niente nuovi tentativi: la pagina funziona senza. La cadenza resta
   `null` finché una registrazione non la dà.
4. **Il filtro sta nel server**: `stats` in `GET /drawings/{id}`, con
   battito e calorie per gli altri solo se `heart_shown`; all'autore
   sempre; `null` senza dati. `GET /feed` non lo manda.
5. **Le corse vecchie**: i passi col backfill `python -m
   shaperoute_api.run_stats` (solo le righe che mancano), col sì
   dell'utente; profilo e calorie non li avranno.

**Conseguenze**: la parte D legge `stats` con `statsOf`
(`api/runStats.ts`) senza toccare `DrawingDetail`; TASK-345 B scrive il
battito in `runs` e lo trova già nella pagina; il server ha la `0064` da
applicare nel passo unico.

## ADR-0314, precisazione — La parte B3b1: cosa mostra e come vibra il polso

**Stato**: Attiva · 2026-11-08 · TASK-370 parte B3b1, decisa dall'agente su
delega dell'utente («Come Apple Maps», «Freccia prima»); lista dei file
approvata dal Coordinatore. In `main` con la #1008.

**Contesto**: gli avvisi di B1 e B2 sono tipi, non frasi; l'orologio deve
farne una schermata e una vibrazione, uguali per ogni sport.

**Decisione**:
1. **`GuideDisplay`**, puro in WatchCore: dagli avvisi la vibrazione
   (`GuideHaptic`: svolta a destra, a sinistra, altra manovra, fuori rotta,
   di nuovo sul percorso, arrivo, penna), ogni tipo una volta per posizione;
   la partenza e «dov'è il percorso» si vedono soltanto.
2. **La schermata** (`GuideScreen`): in attesa del percorso chiuso, lungo il
   percorso, fuori rotta, arrivo; la freccia girata dell'angolo della
   svolta, o fuori rotta verso il percorso rispetto alla direzione di marcia
   (a nord in su senza direzione); i metri alla svolta, alla fine o al
   percorso; il tipo di svolta e la via; la penna («To the O», «Next part»).

**Conseguenze**: l'app dell'orologio disegna e suona soltanto; ogni regola
di cosa mostrare ha i suoi test in Swift.

## ADR-0314, precisazione — La parte B3b2: la corsa guidata sull'orologio

**Stato**: Attiva · 2026-11-08 · TASK-370 parte B3b2, decisa dall'agente su
delega dell'utente; testi e permesso di posizione approvati dall'utente il
2026-11-08 (scelte 5 e 9 del task file); lista dei file approvata dal
Coordinatore. In `main` con la #1012.

**Decisione**:
1. **Un tocco su un percorso di «Routes»** fa partire il suo sport con la
   guida; `GuideSession` chiede la posizione al via e accende il GPS a fine
   conto alla rovescia; a ogni posizione Navigator, Pen, la schermata e le
   vibrazioni di watchOS (quelle di navigazione di Apple Maps per le
   svolte, «failure», «success», «click»).
2. **Le pagine** lungo un percorso: la freccia (`GuideView`), la mappa
   piccola che inquadra il disegno intero (`RouteMapView`), poi i numeri.
   Senza percorso le pagine restano quelle di prima.
3. **Niente parole delle svolte** sullo schermo: la freccia vale in ogni
   lingua e lo schermo è piccolo. «Back on route» e «Pen down» non si
   scrivono: lo dice la vibrazione.
4. **Il permesso di posizione dell'orologio** ha una frase sua, approvata
   dall'utente nelle cinque lingue: quella del telefono parla del telefono
   bloccato e della barra blu. CoreLocation e MapKit nel target dell'orologio;
   l'impronta iOS senza `MUW_WATCH` resta `6f8bba4c`.

**Conseguenze**: la traccia della corsa resta sull'orologio finché B3c non
la manda al telefono. Le vibrazioni si provano al polso con la build A-flip.

## ADR-0338, aggiunta — La pagina della stazione nell'app: una sola lista delle seguite, i post con l'autore

**Stato**: Attiva · 2026-11-08 · TASK-406 parte D3b (#1006) e #1004. Deciso
dall'agente su delega dell'utente, con la lista dei file approvata dal
Coordinatore; i testi sono dell'utente («Sì, approvati», 2026-11-08).

**Contesto**: la pagina della stazione mostra «Follow», la neve dei membri e
le loro giornate lì; «Your resorts» sta in cima all'elenco delle stazioni,
nella scheda «Ski» e in «Cambia».

**Decisione**:

1. **Una sola lista delle stazioni seguite** per tutta l'app
   (`useFollowedResorts`), letta una volta per sessione dalla porta dei
   disegni. Un tocco la cambia subito, e torna com'era se il server dice di
   no: la pagina e l'elenco cambiano insieme.
2. **I post di una stazione hanno l'autore**, come nel Feed: `GET
   /ski-resorts/{id}/drawings` risponde `{posts, next, total}` con
   `FeedPostBody` (#1004). Sono di più membri, mentre la pagina di un profilo
   è di uno solo. La forma è cambiata prima che la rotta arrivasse sul
   server.
3. **Un post toccato si apre sulla mappa e chiude la ricerca**, come i
   risultati della ricerca (`SearchScreen`: `onLeave={onClose}`).
4. **Le parti vuote non compaiono**; senza account la pagina resta quella
   della parte C.

**Alternative**:

- **Le seguite lette da ogni schermo**: scartate, la pagina e l'elenco
  avrebbero potuto dire cose diverse.
- **I post senza autore**: scartati, non si saprebbe di chi è la giornata.

**Conseguenze**: solo JavaScript nell'app; sul server nessuna migrazione in
più. Tutto esce con il passo unico sul server e l'OTA unico.

## ADR-0339, precisazione D — «Describe your video»: una tabella di parole letta sul telefono

**Stato:** deciso dall'agente su delega dell'utente (2026-11-10), dentro la
scelta dell'utente 9 (nessuna AI, nessun costo, la prima tabella).

**Superata dalla scelta dell'utente del 2026-11-10**, dopo la prova sul
telefono: «togli la parte di scrivere per modificare il video». Il campo
«Describe your video» e la tabella `share/videoWords.ts` sono tolti
dall'app (TASK-408 D2, #1075); la voce resta come storia.

1. **La tabella è un file dell'app** (`share/videoWords.ts`), nelle cinque
   lingue, letta come le parole delle forme (ADR-0036): accenti, maiuscole
   e apostrofi non contano, e le parole di ogni lingua valgono qualunque
   sia la lingua dell'app. Parole nuove arrivano con un OTA.
2. **Sceglie solo le voci del foglio** (animale, stile, colore, emoji,
   apertura, camera, finale) e niente altro: il risultato è un `VideoEdit`
   con gli stessi campi, e un test prova che numeri come coordinate non
   danno nulla (ADR-0001).
3. **Come legge**: la frase si divide in parti alle virgole e alle «e»; i
   nomi più lunghi prima («cavallo bianco» prima di «cavallo» e «bianco»).
   Un'emoji va «alla fine» se la sua parte lo dice, altrimenti lungo il
   percorso; «cuore» è il finale dove la parte parla del finale, altrimenti
   l'emoji; i finali contano solo dove si parla della fine. Una camera
   senza stile sceglie il 3D, l'unico stile dove si muove.
4. **Quando**: alla fine del campo (Invio o uscita), non a ogni lettera.
   Una parola sconosciuta si salta senza messaggi; il resto del foglio
   resta com'era.

## ADR-0353 — «Edit the drawing» chiude la traccia aperta con un lato fino alla partenza, invece di correrla due volte

**Stato**: Accettata · 2026-11-10 · TASK-425 (#1021). Scelta dell'utente del
2026-11-10: «Sì, chiudile»; il ripiego quando la chiusura non fa un disegno
è deciso dall'agente su delega dell'utente.

**Contesto**: dal TASK-369 (ADR-0313) una traccia che finisce lontano dalla
partenza (oltre `CLOSED_SHARE`, il 15% della sua grandezza) restava aperta in
«Edit the drawing»: un anellino alla partenza e tutta la linea come
dettaglio. I dettagli si contano e si corrono andata e ritorno, quindi la
distanza chiesta era il doppio della traccia (4.000 m → 8.029 m). Lo ha
notato un amico dell'utente: «come se ci passasse sopra due volte».

**Decisione**:

1. `trackInPlace` (`route/figureLines.ts`) **chiude anche la traccia che
   finisce lontano**, con un lato dritto dalla fine al primo punto. La
   distanza diventa la traccia più il ritorno, e la partenza resta dov'era.
2. **Se chiusa non fa un disegno** (`drawingOf` nullo: la traccia si incrocia
   da sola, o il lato di ritorno la attraversa), resta aperta come prima,
   perché il tasto deve continuare a funzionare.

**Alternative**:

- **Lasciare la linea aperta e contarla una volta sola**: scartata, il motore
  corre comunque i dettagli andata e ritorno; la distanza sarebbe stata
  sbagliata.
- **Tenere solo l'anello più grande quando la traccia chiusa si incrocia**:
  scartata, toglie pezzi del disegno.

**Conseguenze**: su 124 tracce aperte vere (i percorsi di `samples/` tagliati
al 50% e al 75%), 46 si chiudono con la distanza giusta (0,9–1,0 volte la
traccia più il ritorno) e 76 restano doppie come prima, perché si incrociano
da sole e il motore prende solo contorni semplici. Per loro servirebbe il
motore (linea aperta corsa una volta, ritorno per la via più breve): è
proposto all'utente come task a parte. Solo JavaScript nell'app, nell'OTA
unico.

## ADR-0314, precisazione — La parte B3c1: la traccia dell'orologio al telefono e in Apple Salute

**Stato**: Attiva · 2026-11-10 · TASK-370 parte B3c1, decisa dall'agente su
delega dell'utente; lista dei file approvata dal Coordinatore. In `main`
con la #1020.

**Decisione**:
1. **Un file a fine allenamento** (`WatchTrack`, contratto in Swift e
   TypeScript su `Fixtures/tracks.json`): sport, inizio e fine, arrivato o
   fermato, il percorso seguito (con la somiglianza, per il punteggio anche
   se il telefono non ha più quel percorso), le posizioni
   `[lat, lon, ms, precisione, quota]`, le pause, distanza, tempo in
   movimento, calorie e battito medio. Va con `WCSession.transferFile`, che
   lo tiene finché il telefono non lo prende.
2. **`TrackRecorder` ha il GPS** per ogni sport col GPS, anche senza
   percorso; dà le posizioni alla guida, a `TrackLog` (le regole del
   registratore del telefono: niente fix oltre 40 m, fuori ordine o in
   pausa, al massimo 20 000) e a `HKWorkoutRouteBuilder`, così la linea sta
   anche nell'allenamento di Salute.
3. **`WatchRoute` porta `similarity`**, facoltativa: un percorso senza
   (telefono più vecchio) la legge come sconosciuta.

**Conseguenze**: il permesso di Salute chiede anche la linea
dell'allenamento. La corsa simulata dopo lo spostamento del GPS non si è
potuta ripetere nel simulatore (il foglio di Salute non prende i tocchi): si
prova al polso.

## ADR-0314, precisazione — La parte B3c2: la corsa dell'orologio sul telefono, avviso e scheda

**Stato**: Attiva · 2026-11-10 · TASK-370 parte B3c2; scelta dell'utente
«Avviso e scheda» e testi approvati il 2026-11-10; lista dei file e turno su
`App.tsx` dal Coordinatore. In `main` con la #1041.

**Decisione**:
1. **Il telefono tiene in attesa** ogni corsa dell'orologio (`watchRuns.ts`,
   al massimo 10, in un file), anche quelle arrivate ad app chiusa
   (`getQueuedFiles`), e manda una notifica locale.
2. **Una scheda in cima a «My activities»** («From your Apple Watch», «Open»,
   «Discard») finché non la si apre o scarta; «Open» apre la fine corsa di
   sempre (`finish` col punteggio, `runFinish` senza percorso). Niente si
   apre da solo mentre si usa l'app.
3. **La linea la rifà il registratore del telefono** (`watchRun.ts`:
   `addFix`, `pauseTrack`, `resumeTrack`): metri, pause e fix lasciati fuori
   sono quelli di una corsa registrata col telefono.
4. **I file dell'orologio** stanno in `watchFiles()`, a parte dal
   collegamento dei messaggi.

**Conseguenze**: l'arrivo del file e la notifica si provano con l'orologio
vero (build 1.1).

## ADR-0346, precisazione B — Le 14 forme approvate entrano nel catalogo; le zone restano sulle 17 forme di prima

**Stato**: Attiva · 2026-11-10 · TASK-418 parte B (#1042). Deciso
dall'agente su delega dell'utente (la scatola delle zone: dal Coordinatore,
su delega).

**Contesto**: l'utente ha approvato su strada 20 percorsi di TASK-419 fatti
con 14 forme candidate. `prefetch_zones.longest_route_box` faceva l'unione
delle zone di **tutte** le forme del catalogo: pera e Torre di Pisa, strette
e alte, a parità di distanza disegnano più in grande e la allargavano di un
decimo per ogni sport (la corsa a 50 km da circa 40 a 44 km di lato). Ogni
zona tenuta sul server avrebbe cambiato chiave e andava riscaricata.

**Decisione**:

1. I 14 file passano da `candidate_outlines/` a
   `route_engine/shapes/outlines/` (`APPROVED` in
   `tools/draw_new_shapes.py`) ed entrano in `SHAPES`, nel contratto,
   nell'API, nelle descrizioni per l'AI e nell'app; le altre 35 restano
   candidate.
2. `prefetch_zones.ZONE_SHAPES`: la scatola dei percorsi più lunghi resta
   calcolata sulle 17 forme di prima. `test_zone_shapes.py` fissa le
   scatole di ogni sport come erano.
3. Penna alzata: ancora, orso, bici e tazzina hanno pezzi, quindi l'API le
   accetta (`PEN_UP_SHAPES` viene dal motore, come per il sole); l'app non
   la offre finché l'utente non le ha giudicate così.
4. Le categorie della ricerca restano quelle di TASK-344: orso e cigno negli
   animali, ancora, quadrifoglio e nota nei simboli, il resto nelle emoji.

**Il limite accettato**: in bici, pera e Torre di Pisa stanno nella zona
già scaricata fino a 26 km, non a 30 (`test_prefetch_zones.py`). Oltre,
come ogni percorso vicino al bordo, possono prendere qualche strada fuori
zona. Le altre forme nuove stanno nella zona a 30 km.

**Motivo**: nessuna zona da riscaricare e nessun download in più su
Overpass per un caso raro (una pera di 30 km).

**Alternative**:

- **La scatola sull'intero catalogo**: zone del 10% più larghe e tutte da
  riscaricare; scartata.
- **Una scatola per forma**: più chiavi di zona per la stessa città;
  scartata.

**Conseguenze**: impronta del codice 2bca806f467b (nuoto 55b54eea0e14,
pagaiata cf585f8fb31b), con le righe `SAME_ROUTES_AS` verso le impronte di
prima: le 9 rotte di `test_same_routes.py` sono identiche, gli esempi
tenuti restano validi. Sul server, il passo 2 (`out/TASK-418/SERVER.md`);
nell'app le forme arrivano con l'OTA dopo il server.

## ADR-0340, precisazione D — Le sezioni della pagina: parziali, altimetria, battito medio e massimo; zone e minimo rimandati, dislivello dal profilo

**Stato**: Attiva · 2026-11-10 · TASK-410 parte D (#1043). Testi approvati
dall'utente il 2026-11-07 (scelta 6); i punti 1 e 2 decisi dal Coordinatore
su delega dell'utente, il resto deciso dall'agente su delega dell'utente.

**Contesto**: la parte C (precisazione C) mette nel dettaglio del post
`stats`: parziali per km e per miglio, profilo, cadenza, calorie
dell'autore, battito medio e massimo. Il brief chiedeva anche il battito
minimo e il tempo e la % per zona: nessuna fonte li manda ancora.

**Decisione**:

1. **Zone e minimo rimandati**: la card «Battito» mostra medio e massimo. Le
   barre delle zone, il minimo e il criterio «% per zona» arrivano quando
   TASK-345 C o TASK-374 D danno i secondi per zona.
2. **Il dislivello si conta dal profilo** (al più 120 punti, la regola dei
   3 m di `climbM`): è una sotto stima di quello della traccia intera, che
   il post non porta. In miglia è in piedi.
3. **La pagina legge `GET /drawings/{id}` una volta all'apertura**
   (`usePostStats`, `statsOf`): `GET /feed` resta leggero. Senza stats o
   senza rete resta il riepilogo di prima.
4. **Calorie**: quelle dell'autore (`stats.kcal`) quando il server le manda;
   se l'autore le nasconde, la stima di prima (70 kg), che non dice niente
   del suo corpo.
5. **Per sport** (`postMetrics`): parziali a piedi e su ruote, non in
   acqua, sulla neve, in palestra; altimetria ovunque tranne acqua e
   palestra; cadenza solo a piedi.
6. **Grafici a `View`**: barre dei parziali lunghe quanto il passo rispetto
   al più veloce (il più veloce in `accent`), una colonna per punto del
   profilo; niente `react-native-svg`, niente build nuova.

**Conseguenze**: la parte D esce con un OTA; le zone hanno un posto pronto
nella card «Battito» quando arrivano i secondi; il dislivello del post può
essere qualche metro sotto quello dello schermo della corsa.

## ADR-0356 — «Edit the drawing»: la traccia aperta che si incrocia diventa un anello alla partenza, corso una volta

**Stato**: Accettata · 2026-11-10 · TASK-428 (#1040). Numeri dal
Coordinatore. Scelta dell'utente del 2026-11-10: «Sì, fallo così» (l'anello
solo nell'app, invece del ritorno disegnato a parte dal motore); come
costruire l'anello è deciso dall'agente su delega dell'utente.

**Contesto**: dopo ADR-0353 una traccia aperta che, chiusa con un lato
dritto, non fa un contorno (si incrocia da sola, o il lato di ritorno la
attraversa) restava una linea appesa a un anellino alla partenza, corsa
andata e ritorno: 1,4–1,8 volte la traccia più il ritorno, su circa il 60%
delle tracce aperte vere. Motore e API sapevano già fare il resto: un
dettaglio che finisce sul **proprio primo punto** è un anello corso una
volta sola (`_loop_start` in `shapes/outline.py`, `travelledLength`
nell'app), e le richieste di un disegno passano da
`parse_outline(..., allow_crossings=True)`, che lascia incrociare un
dettaglio.

**Decisione**:

1. `trackInPlace` (`route/figureLines.ts`), quando la traccia chiusa non fa
   un disegno, la manda come **anellino alla partenza più un dettaglio**: la
   linea, semplificata come una prima linea disegnata (`firstLineOf`), e un
   ultimo lato fino al suo primo punto. Il percorso la fa una volta e torna
   verso la partenza seguendo quel lato.
2. L'anello si costruisce **dalla linea aperta**, non passando la traccia
   chiusa a `firstLineOf`: quella proverebbe `outlineOf`, che di una linea che
   si incrocia tiene l'anello più grande e taglia il resto (7 tracce su 124
   perdevano fino a un terzo della figura).
3. Se nemmeno l'anello fa un disegno, la traccia resta aperta come prima.

**Alternative**:

- **Ritorno disegnato a parte, sulla strada più breve calcolata dal
  motore**: scartata dall'utente per ora; chiede che il motore segni dove
  finisce la figura e dove comincia il ritorno, la prova `test_same_routes`
  e un cambio di contratto, qualche giorno di lavoro.
- **Mandare la traccia chiusa come `path`** (la linea sola delle parole, che
  può incrociarsi): scartata, il contratto delle richieste di un disegno non
  ha `path` e la modifica sulla mappa lavora su contorno e dettagli.

**Conseguenze**: su 124 tracce aperte vere (1 GPX ogni 8 di `samples/`,
tagliato al 50% e al 75%), 45 si chiudono come con ADR-0353 e 79 diventano
anello: distanza chiesta 0,76–0,99 volte la traccia più il ritorno dritto
(mediana 0,97; prima 1,60), tutte accettate da `outline_of`. Tre percorsi
veri a Trento (`plan_request`, `placement="anchored"`): 7,6 km per 7,0
chiesti, 10,5 per 10,7, 19,3 per 17,0, somiglianza 0,97–1,00. Il ritorno è
dritto verso la partenza, non la via più breve, e sulla mappa fa parte della
figura. Solo JavaScript nell'app: esce con il prossimo OTA di produzione,
dopo il passo server 2.

## ADR-0354 — La partenza di «Draw on the map» si sposta lungo il disegno: il contorno ricomincia da lì

**Stato**: Accettata · 2026-11-10 · TASK-426 (#1035). Il gesto e cosa si
vede sono scelta dell'utente del 2026-11-10 («Sì, così»); il modo di farlo
è deciso dall'agente su delega dell'utente.

**Contesto**: in «Draw on the map» il percorso parte sempre dal primo punto
del contorno (`lookOf(...).start`), che la mappa non mostrava. L'utente
voleva poterlo spostare in un altro punto della linea. Il motore mette il
primo punto della figura sulla partenza (`anchored.py`) e prova anche altre
fasi lungo la forma (`optimizer.PHASES`), sempre con la partenza chiesta.

**Decisione**:

1. **Un pallino** (ciano, `color.startHere`) sul primo punto della figura
   mostrata, in tutti i modi; con «Move» un dito che parte sul pallino lo
   trascina lungo la linea, e la pagina dice dove lo lascia (`started`).
2. **Il contorno ricomincia dal punto scelto** (`mapdraw/startPoint.ts`):
   un angolo entro mezzo dito (`CORNER_SHARE · REACH_PX`), altrimenti un
   punto nuovo sul lato, se il contorno ha meno di `MAX_OUTLINE_POINTS`
   angoli. La figura non si muove e `start` della richiesta viene da sé
   (`placedStart`): niente di nuovo nel contratto né nel motore.
3. **Linea aperta**: solo le due estremità; all'altra la linea si gira e
   l'anellino di partenza (`startRing`) si rifà lì. Non si gira se finisce
   in un occhiello o se un altro dettaglio è appeso all'anellino.
4. **Emoji**: spostata, diventa il suo contorno (`shapeOutline`), come una
   girata (ADR-0336); a penna alzata il pallino è fermo.
5. **Pezzi**: si sposta il primo pezzo, che dà il contorno; fermo mentre è
   scelto un altro pezzo. **Sull'acqua** nessun pallino: lì il motore parte
   dalla riva e la figura non è ancorata (ADR-0313).
6. Ogni spostamento è un passo di «Undo» (`swap`, o del pezzo).

**Alternative**:

- **Un campo nuovo con la partenza, separato dal contorno**: scartata, ogni
  modifica della figura (penna, gomma, piega) avrebbe dovuto tenerlo
  allineato; girare il contorno basta, e la richiesta resta quella di oggi.
- **Tenere premuto il pallino prima di trascinarlo**: scartata dall'utente;
  tenere premuto su una linea resta la piega.

**Conseguenze**: solo JavaScript nell'app (`mapdraw/`, `map/mapPage.ts`,
`map/messages.ts`, `map/MapView.tsx`), nessun testo nuovo, hash SRI di
MapLibre invariati; esce con l'OTA di produzione. Come oggi il motore può
ancora spostare la figura per trovare le strade, ma parte dal punto scelto.

## ADR-0339, precisazione B2 — L'elefante: animato da MuW, e la pelle legata alle ossa come vuole glTF

**Stato:** deciso dall'agente su delega dell'utente (2026-11-10), con le
scelte dell'utente: scaricarlo dal suo account («fallo tu»), installare
Blender, e i crediti con i due nomi («Tutti e due»).

1. **Il modello**: «Elephant Anim»
   (https://sketchfab.com/3d-models/elephant-anim-766f267ff6bd4a87a45e3d26286b9d27),
   CC BY 4.0. Nessuno dei file scaricabili (GLB, glTF, `.blend`) ha
   animazioni. MuW gli ha fatto due cicli in Blender ruotando le ossa
   («Gallop», un passo veloce in sequenza laterale, 0,8 s; «Idle»,
   orecchie, proboscide e coda, 3 s) e un grigio piatto, la media della
   sua texture, senza immagini: 330 KB. Lo script è fuori dal repository
   (`out/TASK-408/elephant-tools/animate.py`).
2. **I crediti**: la pagina lo attribuisce a @Shivoahm, il file di licenza
   a SahuAvdhesh; i Termini nominano tutti e due e dicono che MuW l'ha
   animato e adattato.
3. **La pelle legata alle ossa con l'identità**: per glTF la trasformazione
   del nodo di una mesh con scheletro si ignora, perché le ossa la portano
   già. Legata con la matrice del suo nodo, la mesh dell'elefante (sotto
   nodi ruotati e scalati) veniva sottosopra, e a pezzi in corsa. Poi le
   matrici si aggiornano prima di misurare l'animale, altrimenti la misura
   era sbagliata e l'animale finiva fuori vista. Gli animali di Quaternius,
   con la mesh nell'origine, si disegnano identici.

## ADR-0357 — La modalità sci: scelto lo sci, le schede e le pagine diventano quelle dello sci

**Stato**: Accettata · 2026-11-10 · TASK-429, parte 0 (solo documenti).
Numero dal Coordinatore. Le scelte di prodotto sono dell'utente, quattro
domande nel task file, tutte con «Sì»; il disegno tecnico è deciso
dall'agente su delega dell'utente.

**Contesto**: dopo TASK-406 l'utente non trova lo sci nell'app: sta nella
Ricerca e dietro lo sport «Ski». Il 2026-11-10 chiede che, scelto lo sci,
«l'app deve cambiare» e diventare un'app per lo sci «tipo Slopes», con più
sezioni, tutti i dati (impianti presi compresi) e la mappa con linee
colorate e legenda. Lo sci non va messo in vista nell'app normale.

**Decisione** (dettagli e mockup in `tasks/TASK-429.md`):

1. **La modalità segue lo sport già salvato** (`saveSport`, `useSport`):
   con «Ski» l'app è nella modalità sci, con un altro sport è quella di
   sempre. Si entra e si esce dal tasto dello sport in alto o da
   Impostazioni; nessuno stato nuovo da ricordare (domanda 1).
2. **Le stesse cinque schede di `TabShell`**, con tre pagine diverse: Oggi ·
   Giornate · Stazioni · Feed · Profilo. I messaggi passano a un'icona in
   alto, col numero rosso. È lo schema che «Explore» usa già per acqua e
   nuoto (`PaddleExplore`), allargato (domanda 1).
3. **Sei sezioni nella prima versione**: Oggi, riepilogo della giornata,
   mappa con legenda, discesa per discesa, la stagione, Stazioni. La
   Ricerca dell'app normale perde la scheda «Ski» (domanda 2).
4. **Si riusa quello che c'è**: `src/ski/` (stazioni, meteo, neve,
   seguite), `SnowFinishCard`, `snowDay.ts`, `ski-names`.
5. **I colori della giornata, solo nella modalità sci e solo come token**:
   `ski.descent` giallo, linea piena, discese numerate 1, 2…; `ski.lift`
   rosso più chiaro del badge (`#FF5A4E` sul tono scuro), tratteggiato,
   risalite numerate L1, L2…; la legenda dice tutto a parole. È
   un'eccezione voluta dall'utente alle due regole di `tokens.ts` (giallo =
   percorso, rosso = badge), valida perché nella modalità non ci sono
   percorsi; fuori la giornata resta bianca (domanda 3).
6. **I testi** della tabella della domanda 4, approvati.
7. **Il server** serve per due cose sole: i totali della stagione e i nomi
   tratto per tratto (parti C e D, ognuna col sì dell'utente).

**Alternative**: un tasto «Ski» in più nell'app normale, scartato
dall'utente il 2026-11-10; un'app a parte, che vorrebbe una build nativa
nuova e l'impronta iOS cambiata; l'alternativa B delle schede (la scheda
dei messaggi resta, il Feed esce dalla barra), scartata con la domanda 1.

**Conseguenze**: solo JavaScript, impronta iOS `6f8bba4c` ferma; motore
non toccato. Le parti A–E si elencano nel task file, ognuna con la sua
lista al Coordinatore; una parte che tocca `src/ski/**` lo concorda prima.

## ADR-0356, precisazione — Anche il percorso chiuso che si incrocia diventa un anello alla partenza: «Edit the drawing» su ogni percorso di «Explore»

**Stato**: Attiva · 2026-11-10 · TASK-432 (#1079). Numero dal Coordinatore;
nessuna domanda nuova all'utente: la figura sulla mappa cambia come con
ADR-0356, già scelto dall'utente (Coordinatore, 2026-11-10). Deciso
dall'agente su delega dell'utente.

**Contesto**: l'utente, provando l'OTA di produzione del 2026-11-10: «non mi
lascia modificare il disegno in explore». La scheda mostra «Edit the
drawing» solo se la linea del percorso fa un disegno (`cardTrack` in
`App.tsx`). Un percorso che torna alla partenza era un solo contorno chiuso;
se si incrocia da solo (parole, farfalle, smiley) `outlineOf` non ne fa uno,
e il pulsante spariva. ADR-0356 dava l'anello solo alle tracce che finiscono
lontano dalla partenza. 334 percorsi del catalogo su 575 erano senza
pulsante, già prima di ADR-0353: il problema c'era da ADR-0313.

**Decisione**:

1. `trackInPlace` (`route/figureLines.ts`) manda come anello alla partenza
   (punto 1 di ADR-0356) **ogni** traccia il cui contorno chiuso non fa un
   disegno, anche quella che finisce vicino alla partenza.
2. Se l'anello non fa un disegno, vale `firstLineOf` sulla linea intera: per
   un percorso chiuso è il contorno che trova su tutti i punti (l'anello
   più grande, come per le altre tracce chiuse), per una traccia aperta la
   linea aperta di prima.
3. Un test legge tutto `catalog/` (`exploreCatalogEdit.test.ts`): ogni
   percorso deve avere un disegno e non chiedere più della propria
   lunghezza.

**Alternative**:

- **L'anello per le tracce chiuse senza il punto 2** (la prima versione
  della correzione di TASK-410, #1078): lasciava fuori 23 percorsi del
  catalogo (552 su 575), quelli il cui contorno di 100 punti si incrocia ma
  che su tutti i punti ne hanno uno; tolta dalla #1078.

**Conseguenze**: sul catalogo di allora 575 percorsi su 575 col pulsante
(264 contorni, 311 anelli), dopo il quarto giro di TASK-419 597 su 597.
Gli anelli chiedono 0,91–1,00 volte il percorso (mediana 0,97), mai andata
e ritorno. Sulla mappa la figura si vede intera con l'anellino alla
partenza. Solo JavaScript nell'app: esce con il prossimo OTA di produzione.

## ADR-0357, precisazione A — La modalità sci nell'app: le schede dallo sport, «Oggi» sulla pagina «choose», le icone come `face`, la barra ricostruita

**Stato**: Attiva · 2026-11-10 · TASK-429 parte A (#1093). Deciso
dall'agente su delega dell'utente, dentro le scelte dell'utente di ADR-0357.

**Decisione**:

1. **La modalità è una funzione dello sport** (`src/skimode/skiMode.ts`):
   `isSkiMode(sport)`, `barPagesOf(sport)` e `shellPagesOf`, pure e
   testate. Nessuno stato nuovo: scelto un altro sport, `App.tsx` torna
   alle pagine di prima.
2. **«Oggi» è la pagina «choose»**: ogni «indietro» che portava a «Draw»
   (fine giornata, «Discard») porta a «Oggi» senza toccare quei percorsi.
   «Giornate» e «Stazioni» sono due schermate nuove, `skiDays` e
   `skiResorts`.
3. **«Giornate»** legge le giornate dai post del profilo (`pageOf`, attività
   `skiing`), fino a 5 pagine per volta finché ne trova una.
4. **Le icone delle schede sci** (Lucide `mountain`, `calendar`,
   `cable-car`, disegnate dagli SVG con lo Swift del Mac alle stesse linee
   delle altre) passano dal `face` della barra: `TabBar.tsx` non cambia.
5. **La barra si ricostruisce quando la modalità cambia** (`key` di
   `TabShell`): senza, le luci della barra si animavano su schede sparite.
6. **I messaggi** hanno un tasto nell'header e si aprono sopra l'app
   (`SkiMessages`), con «‹ Back» e il tasto indietro di Android.

**Conseguenze**: solo JavaScript e immagini, impronta iOS `6f8bba4c`
invariata; `src/ski/` non cambia. Per le parti dopo, l'utente ha scelto il
2026-11-10 («Sì, così») che il telefono mandi i tratti della giornata a
«Salva», in un solo campo `ski_parts` dei run-stats condiviso con TASK-424
C2b (`tasks/TASK-429.md`, «La parte C»).

## ADR-0357, precisazione B1 — La giornata di sci a colori: un solo calcolo dei tratti, i colori come token, i numeri sulle linee

**Stato**: Attiva · 2026-11-10 · TASK-429 parte B1 (#1108). Deciso
dall'agente su delega dell'utente, dentro le scelte dell'utente di ADR-0357
(domande 3 e 4).

**Decisione**:

1. **Un solo calcolo dei tratti**: `snowDay.ts` tiene una funzione interna,
   `liftsAndDescents`, che usano sia `snowDay` sia la nuova
   `snowParts(track) → SnowPart[] | null` (tipo, numero, inizio e fine, tempo
   in movimento, metri, dislivello, velocità massima). Il resto
   (`skiedDay`, `skiedMs` di TASK-424 C2) si riusa.
2. **I colori solo come token** (`ski.descent`, `ski.lift`, `ski.onLine`):
   la pagina della mappa colora la traccia e le risalite quando arriva una
   giornata di sci, e spenta torna al bianco della corsa.
3. **I numeri sulle linee** sono un punto del colore della linea col numero
   scuro, a metà del tratto (`skiDayLabels`); la legenda in parole sta in
   cima alla mappa, al posto della riga di prima.
4. **«Summary · Map · Runs»** sulla scheda di fine giornata: «Map» nasconde
   i numeri e lascia la mappa; «Runs» mostra i tratti e le soste di 10
   minuti o più.

**Conseguenze**: solo app, impronta iOS `6f8bba4c` invariata, nessun invio
nuovo al server (quello è la B2).

## ADR-0357, precisazione C1 — I tratti della giornata salvata e la stagione sul server: `parts` solo quando ci sono, nomi alla lettura con una cache per processo

**Stato**: Attiva · 2026-11-10 · TASK-429 parte C1 (#1114). Deciso
dall'agente su delega dell'utente, dentro la scelta dell'utente del
2026-11-10 («Sì, così»: i tratti dal telefono, le giornate di prima senza).

**Contesto**: il server tiene la traccia con le ore ma senza le quote. I
tratti li manda il telefono come `ski_parts` dei run-stats (TASK-424 C2b,
`run_stats.stats` della `0064`), un solo campo per lo sci e per le calorie.

**Decisione**:

1. **`GET /drawings/{id}/ski-day` dà `parts` solo quando ci sono**: un corpo
   suo per il `GET` (`SkiDayPartsBody`, `response_model_exclude_unset`), così
   la risposta senza tratti e quella del `PUT` restano identiche e l'app in
   produzione legge quello che leggeva.
2. **I tratti si legano alla traccia per ore**: `start_s` ed `end_s` danno il
   primo e l'ultimo punto (`from_fix`, `to_fix`) della traccia del post, che
   il post mostra intera (ADR-0330).
3. **I nomi alla lettura**, con `ski_names.py` sul pezzo di traccia di ogni
   tratto, in una cache di ogni processo: al più 256 giornate, per 10
   minuti, per corsa e per l'ultimo invio dei run-stats. Niente colonne né
   migrazioni.
4. **`GET /me/ski-season?from&to`**: solo le giornate di chi chiede, solo
   numeri, al più 400 giorni; una giornata senza tratti conta solo come
   giornata.

**Conseguenze**: nessuna migrazione; sul server col passo 7, insieme alla
C2b di TASK-424.

