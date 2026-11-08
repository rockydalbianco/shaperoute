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
- ADR-0322 e ADR-0324, precisazione — Gravel, MTB e Roller registrano con i numeri della bici · 2026-11-08 · Accettata

---

## Voci nuove

**Stato**: Proposta · 2026-10-30 · TASK-348. La richiesta è dell'utente
(2026-10-30, «Vai con la proposta»); le scelte di prodotto (quanti video,
i layout, il disegno spostabile, appiattire, cosa c'è nell'editor, testi e
privacy) le ha fatte l'utente il 2026-10-30 e sono in TASK-348; i punti
tecnici sono decisi dall'agente su delega dell'utente. Numeri dati dal
Coordinatore. Estende ADR-0170 (le foto dei post), ADR-0275 (la striscia
del Feed) e ADR-0292 (il video nei post); usa ADR-0254 (il video della
corsa).

**Contesto**: l'utente vuole mettere in primo piano le sue foto e i suoi
video, con il disegno GPS come secondo piano, in un post a carosello fino a
10 elementi riordinabili, con un editor foto e video integrato. Oggi un
post ha la mappa e al più 3 foto in posti fissi (`DRAWING_MAX_PHOTOS`); il
video nei post (ADR-0292) è uno solo e arriva con `expo-video` nella 1.0.2.
L'app non ha gesti nativi né una libreria grafica; la 1.0.1 tiene
l'impronta iOS `83793e26`.

**Decisione** (proposta):

1. Un post è una lista ordinata di elementi, al più 10: il disegno (sempre
   uno, la mappa viva), foto, e al più 3 video tra propri e video della
   corsa (scelta dell'utente, «Sì, al più 3»; vedi «ADR-0292, aggiunta»).
2. Le modifiche sono non distruttive (un JSON sul telefono accanto
   all'originale) fino a «Publish», che **appiattisce**: JPEG 1080 × 1350
   per le foto, MP4 nei limiti di ADR-0292 per i video. Il server riceve
   file normali e non conosce l'editor.
3. Il layout è una funzione pura, la stessa per anteprima ed esportazione.
   Il disegno dentro la foto è sempre la linea già tagliata del Feed: una
   foto appiattita non si può tagliare dopo.
4. API: fino a 10 foto e un ordine riscrivibile; un'app vecchia vede le
   foto in ordine.
5. Parte A via OTA senza dipendenze nuove (`PanResponder` + `Animated`,
   `react-native-view-shot`); dalla 1.0.2 `react-native-gesture-handler`,
   `react-native-reanimated`, `@shopify/react-native-skia`, `expo-video` e
   un modulo Expo nostro per esportare i video (AVFoundation, Media3
   Transformer), ognuno col sì dell'utente.
6. Scartati ffmpeg-kit (ritirato, GPL, peso) e WebCodecs nella WebView per i
   video dell'utente (demuxer, lentezza, Android).

**Conseguenze**: un post pesa fino a circa 2,5 MB di foto invece di 0,75;
più video per post riempiono prima il tetto di ADR-0292 (stima in «ADR-0292,
aggiunta»). `FeedPost.tsx`, `PublicParts.tsx` e `drawingsDoor.ts`
sono anche di TASK-336: le parti si accordano con quella sessione.

---

## ADR-0292, aggiunta — Fino a 3 video per post: il tetto resta, si raggiunge prima

**Stato**: Proposta · 2026-10-30 · TASK-348, ADR-0301. Scelta dell'utente
del 2026-10-30: «Sì, al più 3». Le altre regole di ADR-0292 e ADR-0289 non
cambiano; la modifica esplicita l'ha chiesta il Coordinatore.

**Decisione** (cambia i punti 1 e 13):

1. **Punto 1**: al posto di un video per post, **al più 3**, propri o il
   video della corsa (che conta come uno). Ognuno resta nei limiti del
   punto 11: 30 s, 40 MB, 960 × 540 sull'iPhone.
2. **Punto 13**, la stima per 1000 iscritti, stesse ipotesi e video medio
   di 7 MB:

   | Ipotesi | Post con video a settimana | Al mese, 1 video (oggi) | Al mese, 1,5 video | Al mese, 3 video | In un anno, 3 video |
   |---|---|---|---|---|---|
   | Bassa | 50 | 1,5 GB | 2,3 GB | 4,5 GB | 54 GB |
   | Media | 125 | 3,8 GB | 5,7 GB | 11,4 GB | 135 GB |
   | Alta | 667 | 20 GB | 30 GB | 60 GB | 720 GB |

   «3 video» è il caso peggiore, con ogni post che arriva al massimo; la
   media vera sta in mezzo, e 1,5 è un'ipotesi. Con l'ipotesi media il tetto
   di 15 GB si raggiunge in **5–10 settimane** invece che in circa quattro
   mesi.
3. **Il tetto resta 15 GB**, scelta dell'utente («Server disk, 15 GB cap»),
   e resta l'avviso del log all'80 %: arriva prima, e con lui la scelta di
   allargare. Lo spazio libero misurato il 2026-10-29 (57 GB su `/`) non
   cambia il conto del punto 13.
4. **Il contratto**: un video per post non è più una riga per disegno e un
   solo percorso. La parte che arriva prima in `main` tra TASK-336 A e
   TASK-348 C dà a ogni video il suo posto; l'ordine lo decide il
   Coordinatore. Finché TASK-348 C non c'è, l'app ne manda uno.

---

## ADR-0302 — Nelle schede di «Explore» prima il disegno, la foto a uno swipe

**Data**: 2026-10-30 · **Stato**: accettata · **Task**: TASK-350. L'ordine è
una scelta dell'utente («prima l'immagine e poi swipe destra e vedi la foto
della città»); il modo è deciso dall'agente su delega dell'utente.

**Contesto**: da ADR-0243 la foto di un paese prendeva il posto di disegno e
mappa, e da ADR-0287 quella di un'idea aveva sopra la forma in piccolo.
L'app si riconosce dal disegno: l'utente vuole vedere prima quello.

**Decisione**: `RouteCard`, con `photo` e una linea, ha due pagine da
scorrere: il disegno sulla mappa, poi la foto col credito, con due pallini in
alto. Senza linea mostra la sola foto: serve a un paese il cui disegno è
fallito. In `NearbyTowns` la foto aspetta il disegno, così una scheda non
passa dalla foto al disegno sotto gli occhi. Il tocco sta dentro le pagine,
come in `FeedPost`: una `Pressable` attorno a uno `ScrollView` diventa
responder e ne ferma lo scorrimento nativo, mentre la fila, che è fuori,
scorre. `bounces={false}` fa passare lo swipe alla fila dall'ultima pagina.

**Alternative scartate**: la foto subito e il disegno quando arriva (la
scheda cambierebbe da sola); una freccia da toccare al posto dello swipe (non
è quello chiesto).

**Conseguenze**: uno swipe su una scheda con foto cambia pagina invece di far
scorrere la fila, che si scorre dalla seconda pagina o da nome e distanza. Le
mappe si prendono anche per le schede con foto, una alla volta come le altre.
Nessun testo nuovo, nessuna dipendenza, niente di nativo, server non toccato.

## ADR-0303 — Il video della corsa con la mappa sotto: la mappa nella pagina del video, uno scatto e la linea sopra, il giallo come riserva, tre stili dai token, il 3D proiettato dalla pagina

**Stato**: Accettata e realizzata · 2026-11-04 (A #669, B #679, C #706,
D #724; proposta il 2026-10-30) · TASK-351. La richiesta è dell'utente
(2026-10-30: «fai anche lo restyle del video post corsa con questo stile
aggiungendo la mappa sotto, magari la mappa in 3d come strava... e la
possibilità di avere 3 stili per il video»); la scelta sulla privacy (la
mappa nel video mostra dove si è corso) e i nomi degli stili sono
dell'utente («Sì, va bene» e «Sì, questi», 2026-10-30; `tasks/TASK-351.md`,
scelte 5 e 1); il giallo
che sparisce, il 3D sulla mappa scura, la camera che gira e il credito
sono la raccomandazione, accettata su delega dell'utente del 2026-10-29,
da rivedere; il giallo come riserva senza mappa è una condizione del
Coordinatore; i punti tecnici sono decisi dall'agente su delega
dell'utente. Estende ADR-0254 (il video) e ADR-0262 (la musica), che
restano validi per tutto quello che non cambia; sostituisce il punto 1 di
ADR-0254 solo per «sul giallo del post». Usa ADR-0293 (il look premium),
ADR-0231 (il bordo della linea sul chiaro), ADR-0232 (la mappa 3D:
terreno e colline) e ADR-0131 (la mappa sotto un disegno del Feed).

**Contesto**: il video di «Export video» è il post sul giallo che prende
vita: 360 fotogrammi decisi dall'app (`videoScene.ts`) e disegnati su un
canvas 2D nel WebView nascosto (`videoPage.ts`), codificati con WebCodecs,
scritti dall'app in un MP4. L'utente vuole la mappa sotto, in 3D come
Strava, e tre stili. Il Feed scatta già una mappa nascosta con MapLibre
(`feed/feedMapPage.ts`); la pagina della mappa ha la specie 3D (terreno
Terrarium, colline, inclinazione 55°). Vincoli: niente di nativo e nessuna
dipendenza (impronta iOS `83793e26` fino al taglio della 1.0.x); nessun
colore a mano; durata e memoria del video che non dipendono dalla corsa
(ADR-0254, punto 9). Misure del 2026-10-30, nel simulatore e dentro
l'app in Expo Go, in `tasks/TASK-351.md`; sul telefono da rifare.

**Decisione**:

1. **La mappa sta nella pagina del video**, non in un'altra. `videoPage.ts`
   carica MapLibre GL JS dal CDN con lo stesso indirizzo e la stessa
   impronta SRI di `mapPage.ts`, con lo stile dei token (`darkMapStyle`,
   con le specie di `withKinds` per il terreno e le colline), in un
   contenitore di 360 × 640 pt a `pixelRatio` 3: un canvas 1080 × 1920
   come il video, i nomi grandi come sullo schermo di un telefono.
   `preserveDrawingBuffer`, `interactive: false`, `fadeDuration: 0`,
   nessun controllo. La pagina resta a `https://video.muw.invalid/`
   (WebCodecs vuole un contesto sicuro): il CDN e le tegole sono https e
   arrivano con CORS, così il canvas resta pulito e diventa un
   `VideoFrame`. Misurato nel WebView nascosto dell'app (1 × 1, opacità
   0, dentro il Modal): `requestAnimationFrame` va a circa 18 al secondo,
   la mappa si disegna e arriva a `idle` da sola.
2. **Uno scatto, poi 360 fotogrammi in 2D.** Al primo `idle` (ogni tegola
   in vista disegnata o fallita) la pagina copia il canvas della mappa in
   un'immagine di sfondo; ogni fotogramma è sfondo, velo, linea fino alla
   quota del fotogramma, punta, logo, titolo, numeri, emoji, credito:
   0,1–0,3 ms l'uno, il video costa come oggi più le tegole (0,5–0,8 s in
   cache, qualche secondo a freddo).
3. **Senza mappa, il giallo di oggi** (condizione del Coordinatore): se
   MapLibre non arriva dal CDN o la mappa non dice `idle` entro 15 s, la
   pagina fa il video sul giallo del post com'è oggi, senza avvisi e senza
   testi nuovi: l'export non fallisce mai per la mappa. La scena gialla
   resta nel codice come riserva.
4. **Che cosa disegnare lo decide l'app; dove sta la linea lo sa la
   mappa.** `videoScene.ts` dà lo stile, la camera (centro, zoom,
   rotazione, inclinazione), la traccia (al più 2000 punti, le estremità
   tagliate di `POST_CUT_M` con `withoutEnds`, testato) e, per
   fotogramma, la quota della linea da 0 a 1 (`share`, al posto dei pixel
   `upTo`); la pagina proietta la traccia con `map.project` (sul 3D con il
   terreno) e disegna linea e punta in quei pixel. Sulle mappe piatte la
   camera è quella di `lineCamera` del Feed (ADR-0131): la linea sta nella
   banda 20–70 % come il post; sul 3D la pagina chiede `fitBounds` con
   l'inclinazione. Tutto il resto resta in pixel decisi e testati
   nell'app. La misura del video resta un parametro della pagina, per il
   video dei post (TASK-336 B).
5. **Tre stili, tutti dai token** (`videoStyle.ts`): Night, la mappa del
   tono scuro al suo passo più scuro; Day, la mappa del tono chiaro al suo
   passo più chiaro (`paletteOf`), qualunque tono abbia l'app, perché il
   video è per chi lo guarda; 3D, Night con `setTerrain` (×1,3), le
   colline di `hillshadeOf` e `PITCH_3D`. Lo stile della mappa per una
   palette data è una funzione nuova accanto a `darkMapStyle`, che non
   cambia. La linea `route.color`, sul chiaro con il bordo di
   `routeCasingOf("light")`. Il velo è la curva di `tools/ui_scrim.py`
   (0 → 82 % di `scrim`) come gradiente del canvas; su Day
   `map.background` chiaro 0 → 94 %, perché le parole scure sulla mappa
   chiara restano scure. Le scritte usano le quote di `font` sulla
   larghezza del telefono (display 44/390, title 30/390, label 11/390,
   con il tracking disegnato lettera per lettera) e il font di sistema
   della pagina, come oggi.
6. **La riga «Style»** in «Share your run», sopra «Music»: tre tessere
   9:16 (`StyleRow.tsx`) con il disegno della corsa nei colori dello stile
   (lo stesso `fitLines` del post), «Night» all'apertura; la scelta non
   si salva col post, come la musica.
7. **La camera che gira nel 3D** (parte D): la pagina rende la mappa a
   ogni fotogramma (`jumpTo` e `redraw`, sincroni, senza aspettare
   `requestAnimationFrame`) dopo un giro a vuoto che carica le tegole di
   tutte le rotazioni; nel giro a vuoto misura il costo di un fotogramma,
   e sopra i 25 ms resta lo scatto fermo con uno zoom lento (1,00 → 1,06).
   Il peso del video sale (8,6 MB contro 4,4 a 6 Mbit/s). Se sul telefono
   nemmeno lo scatto inclinato regge, la parte D cade, con i numeri.
8. **La privacy**: la mappa nel video mostra dove si è corso, e il file
   esce dall'app dal foglio di condivisione; è una scelta esplicita
   dell'utente, fatta prima del codice (TASK-351, scelta 5, 2026-10-30:
   «Sì, va bene»). Le estremità
   restano tagliate di 200 m come nel post e nel Feed, e il taglio è
   verificato sulla linea del video; la regola è una sola per ogni corsa,
   anche «Only me» o non salvata: il video lo fa e lo manda solo chi ha
   corso, come l'immagine (ADR-0194, ADR-0254). La riga della privacy su
   OpenFreeMap («it sees which area you look at») copre le tegole del
   video, che sono quelle della zona già guardata; la riga sull'immagine
   di «Share» va estesa al video (un testo di privacy, col sì
   dell'utente); le tegole del terreno (Amazon S3) e le foto aeree (Esri),
   già scaricate dalla mappa 3D e satellite di oggi, non sono nominate:
   una riga da proporre a parte prima della parte D.
9. **Il credito** in fondo al video, 0,0065 della larghezza in
   `textFaint`: «© OpenStreetMap contributors · OpenFreeMap» (ODbL e
   CC-BY), e «Terrain Tiles» sul 3D.
10. **I limiti** di ADR-0254 restano (360 fotogrammi, 2000 punti, una
    ventina di cose per fotogramma, 6 Mbit/s); in più una sola mappa
    1080 × 1920 e il suo scatto, circa 8 MB in memoria ciascuno; le tegole
    sono quelle in vista, una ventina. Il tempo di export si misura a ogni
    parte (la pagina dice all'app i tempi delle tegole, dello scatto e
    della codifica); se raddoppia, lo si scrive.

**Aggiunta (parte B, 2026-10-30, decisa dall'agente su delega
dell'utente)**: sulle mappe piatte la linea resta quella che l'app calcola
con `fitLines`, e la mappa è messa sotto con la camera di `lineCamera` e il
`padding` del riquadro del disegno, come il Feed (ADR-0131): la differenza
fra la proiezione piatta e quella di Mercatore è sotto il pixel su pochi
chilometri; la proiezione dalla pagina (`map.project`) arriva con la D,
dove l'inclinazione la rende necessaria, e il punto 4 vale da lì. Il
credito è a 0,02 della larghezza (22 px su 1080), non 0,0065, perché si
legga su un telefono. Il canvas non ha le cifre tabulari: i numeri sono
allineati a sinistra e il tremolio mentre salgono è piccolo; le lettere
spaziate usano `letterSpacing` del canvas dove c'è (iOS 17) e una lettera
per volta prima. Mentre le tegole arrivano l'app mostra lo stato di attesa
che c'è già («Making the video… 0%»), senza testi nuovi; a tegole fredde
l'export può raddoppiare (misure in `tasks/TASK-351.md`). La B non va
nell'OTA di produzione finché l'utente non ha esportato un video vero
sull'iPhone e visto la mappa (condizione del Coordinatore): il rischio da
guardare è un telefono che ricade sul giallo in silenzio.

**Aggiunta (il fix del 2026-11-03, deciso dall'agente su delega
dell'utente)**: sul telefono dell'utente il video è uscito senza mappa.
Un WebView tenuto fuori vista può non ricevere da iOS i fotogrammi di
animazione, e MapLibre carica lo stile e disegna su quelli: la mappa non
arrivava mai e, passati i 15 s, il video usciva sul giallo come previsto.
La pagina del video si dà quindi i fotogrammi da sola, con un
`requestAnimationFrame` fatto di timer messo prima di MapLibre: i timer
della pagina girano ovunque stia, come l'encoder dimostra da TASK-295, e
nessuno in quella pagina ha bisogno di un fotogramma fluido. In più la
mappa è disegnata anche da un battito di 100 ms e la foto è presa quando
è intera da tre battiti, e il WebView è un punto 1 × 1 a opacità piena
nell'angolo, non più a opacità zero fuori dallo schermo, come la pagina
delle mappe del Feed, che sul telefono le mappe le fa. Riprodotto e
provato nel simulatore con un harness che toglie i fotogrammi alla
pagina: prima 15,2 s e il giallo, dopo la mappa in 1,5 s. Se sul telefono
non basta, la prova seguente mette il WebView a grandezza piena sotto una
vista opaca, come il Feed.

**Aggiunta (2026-11-04, deciso dall'agente su delega dell'utente)**: con
il fix del 3 novembre in `main` e sulla preview, sul telefono il video è
ancora senza mappa. Prova successiva: il WebView del video a grandezza
piena (360 × 640 punti) sotto una vista opaca del colore dello schermo,
montato per primo nello schermo del post, com'è tenuta la pagina delle
mappe del Feed, che sul telefono le mappe le fa; e, finché la causa non è
trovata, il video giallo di riserva porta in fondo una riga piccola con il
motivo che la pagina ha dato e i suoi tempi, **solo sul canale preview**
(`isPreview()` in `src/updates/channel.ts`, da `Updates.channel` di
`expo-updates`; un test prova che sulla build degli store non compare):
condizione del Coordinatore, perché `main` va in produzione con altro
lavoro prima che il video sia risolto, e la riga non può dipendere dal
ricordarsi di toglierla. La produzione del video resta ferma finché
l'utente non vede la mappa sul telefono. L'utente ha risposto che il video
della preview fb15613e era «giallo», con l'app riaperta due volte: la
riserva con il fix #703 caricato. PR #707, riallineata su `main` dopo la
#620: da lì l'impronta iOS di `main` è `6f8bba4c`.

**Aggiunta (2026-11-04, la parte D, deciso dall'agente su delega
dell'utente)**: il 3D com'è nella pagina del video. La linea sulle colline
la proietta la pagina (`map.project` col terreno), non l'app: una resa in
prospettiva non si fa in piano. La traccia per il 3D è ridotta a 150 punti
in metri, perché la proiezione col terreno costa 80 µs a punto sul
telefono (misurato il 30 ottobre) e con la camera che gira si rifà a ogni
fotogramma: 2000 punti sarebbero 160 ms. Il fit inclinato è a due passate
di proiezione, perché la prospettiva cambia con lo zoom. Il giro a vuoto è
doppio: una passata per le tegole di ogni rotazione (al primo giro mancano
tutte, misurato), una misurata, e vale la mediana; lo scatto si prende
prima del giro, così lo scadere dei 15 s dà il modo fermo e non il giallo.
La mappa resta viva durante la codifica solo nel modo `orbit`. La tessera
«3D» inclina il disegno con `perspective` e `rotateX`, senza colline. Il
testo «3D» è quello già in tabella per la mappa 3D. La riga di privacy
sulle tegole del terreno (scelta 8) entra con la D col sì dell'utente
(«Sì, questa», 2026-11-04), e
i file della D nell'elenco del task crescono di conseguenza (la tessera e
il flusso, lasciati dalla C). Scartate: la proiezione una volta sola con
le quote dal terreno attraverso le API interne di MapLibre (fragili alla
versione); la linea come layer della mappa (una resa per fotogramma anche
da ferma); il giro senza prova (sul simulatore un fotogramma inclinato
costa 15–25 ms, sopra o sotto la soglia a seconda del momento).

**Alternative scartate**: la mappa scattata da `feedMapPage` e passata
all'app in base64 (due WebView, 450 KB di testo attraverso l'app, e il 3D
con la linea in prospettiva non si fa); la linea come layer di MapLibre
aggiornato a ogni fotogramma (una resa della mappa per fotogramma anche
sulle mappe piatte); le foto aeree di Esri nel 3D (un credito in più e, al
primo giro, 27 fotogrammi su 60 con tegole mancanti); un testo d'errore
senza mappa (il video deve uscire comunque); un video sul server o un
modulo nativo (ADR-0254); il giallo come quarto stile (la richiesta dice
«aggiungendo la mappa sotto»); `letterSpacing` del canvas (manca su
iOS 16).

**Conseguenze**: solo app, via OTA; nessuna dipendenza, nessun file nativo,
impronta iOS `83793e26fc0da7cdc7d8c7f7b1b7ad09e6f823b3` invariata; la
pagina del video carica circa 1 MB di MapLibre dal CDN (in cache dopo la
prima volta) e le tegole della zona; il video mostra dove si è corso, con
le estremità tagliate di 200 m, per scelta esplicita dell'utente (il Feed
mostra già la mappa sotto i disegni pubblicati); quattro testi nuovi in
fondo alle tabelle (la riga e i tre nomi) e una riga di privacy estesa,
col sì dell'utente; TASK-336 B (il video nei post a 540 × 960) prende
questo video con lo stile scelto; `docs/UI.md` («Il post da condividere»)
descrive il video nuovo con la parte B.

## ADR-0306 — La scheda del Feed: due parti, il look di ADR-0293 prima del brief, la posizione arrotondata e detta

**Stato**: Proposta · 2026-10-30 · TASK-355. La richiesta e il piano sono
dell'utente («Sì, procedi», 2026-10-30); numeri dal Coordinatore; le scelte
di prodotto sono dell'utente, con le sue parole in `tasks/TASK-355.md`. Il
resto è deciso dall'agente su delega dell'utente. Estende ADR-0293; non tocca ADR-0127,
ADR-0193, ADR-0207.

**Contesto**: il brief chiede una scheda più chiara «senza cambiare le
API». Ma `GET /feed` non manda foto dell'autore, conteggi né filtri; varie
voci esistono già altrove (TASK-119, 120, 178, 307, 313, 315); alcune
contraddicono scelte già fatte: il punteggio, il colore unico del canvas
approvato, il cuore che vuole un commento. E il Feed manda già la
posizione non arrotondata, cosa che «Your position» non dice.

**Decisione** (proposta):

1. **Due parti.** A solo app, piccola, senza `FeedScreen.tsx`; B con
   l'API (campi facoltativi). I conteggi non si chiedono card per card. I
   filtri li sostituiscono le schede di TASK-362 (scelta dell'utente).
2. **Dove il brief e ADR-0293 divergono decide l'utente**, voce per voce: ha
   scelto ogni volta il canvas (avatar grigio, segni neutri, riga di testo).
3. **Il contatore delle slide è di TASK-348 A**, che riscrive il carosello
   (confermato dal Coordinatore).
4. **La posizione nel Feed**: arrotondata a due decimali dall'app (circa
   1 km; il raggio è di 50 km) e scritta in «Your position». È un task a sé,
   TASK-356, perché il testo è incompleto già oggi; testo approvato
   dall'utente il 2026-10-30.
5. **Niente `expo-blur`**: l'header è già opaco e sopra le pagine, basta un
   filo; l'impronta iOS `83793e26` resta.

**Conseguenze**: `FeedPost` si accorcia (`RouteMap`, `ActionBar`), a favore
di 348 A e 336 B. Il `GET /feed` di B pesa di più: la PR misura tempo e
peso, e se 20 foto da 128 px sono troppe si passa a una rotta per la foto.
Un'app di prima continua a mandare il punto intero fino all'aggiornamento:
il server lo accetta come oggi e non lo tiene.

---

## ADR-0299 — «Edit the drawing» su un disegno del Feed: la traccia sulla mappa dov'è stata corsa

**Stato**: Accettata · 2026-10-29 · TASK-346. La scelta di prodotto è
dell'utente («Traccia dov'è», 2026-10-29); i punti tecnici sono decisi
dall'agente su delega dell'utente. Numero dato dal Coordinatore. Cambia
ADR-0288 (TASK-331) per la sola scheda di un disegno di un membro.

**Contesto**: l'utente il 2026-10-29: «nel Feed quando premo modifica il
disegno devo poter modificare la traccia sulla mappa, non il disegno in
sé». Fino ad allora la scheda del disegno metteva la traccia corsa,
raddrizzata e chiusa, nel mezzo della partenza di «Draw» e lunga quanto la
sceglierebbe «Draw it near me»: un disegno spostato altrove, non la traccia.
Fra «Traccia dov'è», «Traccia vicino a me» e «Trascinare il percorso» (un
punto tenuto e il tratto ricalcolato sulle vie, che vuole una funzione
nuova nel motore) l'utente ha scelto la prima.

**Decisione**:

1. Su un disegno di un membro «Edit the drawing» mette la traccia su «Draw
   on the map» **dove è stata corsa e grande com'è**: il contorno nel
   riquadro della figura, il suo mezzo e i metri di un'unità calcolati in
   metri sul piano tangente (`mapdraw/plane.ts`, mai in gradi), così ogni
   punto torna dov'era (`figureLines.trackInPlace`). Il contorno resta
   quello di prima: al più `MAX_OUTLINE_POINTS` punti distribuiti, il primo
   è la partenza della corsa, chiuso; `drawingOf` lo raddrizza come ogni
   disegno.
2. Il disegno resta dentro le distanze di «Draw» come ogni figura della
   mappa (`withinLimits`): una traccia più lunga del massimo dello sport si
   rimpicciolisce attorno al suo mezzo.
3. Si modifica con gli strumenti di ADR-0288; «Draw route» lo chiede come
   ogni disegno della mappa, quindi dal primo punto della corsa. Per
   portarlo vicino a sé resta «Draw it near me».
4. La scheda di «Explore» e il risultato di «Draw» restano come prima
   (la figura nel mezzo della partenza): la richiesta parla solo del Feed.

**Alternative scartate**: la traccia vicino all'utente (un disegno di un
altro posto, come prima, solo non raddrizzato); trascinare il percorso sulle
vie come Google Maps (un percorso fra punti nel motore e sul telefono,
lavoro molto più grande); un campo nuovo nel contratto per la traccia
(il disegno della mappa basta).

**Conseguenze**: niente cambia nel contratto, nell'API, nel motore, nei
testi, nelle dipendenze e nel nativo; arriva con un OTA. `useMapCanvas`
ha `editInPlace` accanto a `edit`; `figureLines.drawingLines` diventa
`drawingTrack`.

## ADR-0308 — Le schede del Feed: «Tutti» e «Seguiti», un `filter` facoltativo sul server, una cache per scheda

**Stato**: Proposta · 2026-10-30 · TASK-362. La richiesta è dell'utente (un
brief del 2026-10-30); numeri dal Coordinatore. Le scelte di prodotto sono
dell'utente, in `tasks/TASK-362.md`; il resto è deciso dall'agente su delega
dell'utente. Estende ADR-0227; toglie i filtri da ADR-0306 e TASK-355 B.

**Contesto**: il Feed è una lista sola in tre gruppi: i propri, quelli di chi
si segue, gli altri vicini. L'utente vuole scegliere cosa vedere, in ordine
cronologico inverso. TASK-355 B prevedeva i filtri All, Friends e Mine; alla
domanda se le schede li sostituissero l'utente ha risposto «Sì, sostituiscono».

**Decisione** (proposta):

1. `GET /feed` prende un `filter` facoltativo, `all` o `following`. Senza, la
   risposta è quella di oggi: le app già installate non cambiano.
2. Con `filter`, solo `published_at DESC, id DESC`, e `lat` e `lon` non contano.
   `all` è `everyone`; `following` sono i propri e chi si segue con la richiesta
   accettata («No, includili»), `everyone` e `followers`. Entrambi passano da `shown_sql`, quindi blocchi e
   disegni nascosti restano fuori.
3. Nell'app una lettura e un cursore per scheda e due `FlatList` montate:
   cambiare scheda non rilegge e non perde la posizione.
4. L'ultima scheda sta in un file del telefono, come lo sport; non va al server.
   Le schede sono il `Segmented` di «Draw» (in codice: il componente che c'era).
   Il nome «Following» della scheda non passa da `t`: la chiave è già del
   pulsante «Segui già».
5. Con le schede l'app non manda più la posizione al Feed. La riga di privacy di
   TASK-356 resta vera per le app già installate; si toglie più avanti, col sì
   dell'utente.
5b. La pagina con `filter` ripete la sua scheda in `filter`. Un'API di prima
   ignora il parametro e non lo manda: l'app mostra il feed che riceve, senza
   schede, così l'OTA non dipende dall'aggiornamento del server (richiesta del
   Coordinatore, 2026-11-03).
6. Un indice nuovo solo se l'`EXPLAIN` su 10.000 disegni lo chiede: la chiave di
   `follows` e gli indici di `drawings` e `runs` ci sono già.

**Alternative scartate**: filtrare sul telefono (pagine vuote e dati scaricati
per nulla); cambiare la risposta senza parametro (romperebbe le app già
installate); i filtri accanto alle schede (due modi per la stessa cosa);
smontare la lista non aperta (perde la posizione); AsyncStorage (dipendenza
nuova, e il file basta).

**Conseguenze**: TASK-355 B si riduce a foto dell'autore, conteggi e skeleton.
Chi non segue nessuno e apre «Tutti» non vede più prima i vicini, ma gli ultimi
pubblicati (scelta 3 del task). Il codice arriva col via del Coordinatore;
server solo col sì dell'utente.

## ADR-0305 — Quanti messaggi nuovi: un numero dall'API fermato a 10, contato a parte solo sulla pagina

**Stato**: Accepted · 2026-10-30 · deciso dall'agente su delega dell'utente
per la parte tecnica (TASK-353). Estende ADR-0279. Il piano l'ha confermato
l'utente, «Sì, passi 1 e 2».

**Contesto**: l'elenco delle conversazioni aveva solo un pallino (`unread`).
L'utente vuole il numero dei messaggi nuovi. `read_at` c'è già, quindi non
serve una migrazione, ma il conteggio non deve rallentare l'elenco. Il server
si aggiorna solo con il sì dell'utente, e l'app esce prima o dopo di lui.

**Decisione**:

1. `unread_count` in ogni conversazione di `GET /me/conversations`, **fino a
   10**: l'app da dieci in su dice «9+», come la riga «Messages». Così ogni
   conversazione legge al più dieci righe, qualunque sia la sua lunghezza.
2. **Una query a parte, solo per la pagina**, invece di una colonna nella
   query dell'elenco. Quella query legge tutte le conversazioni della casella
   per ordinarle: con il conteggio dentro, su 2000 conversazioni, la mediana
   passava da 125 a 647 ms; a parte è 211 ms contro i 173 di prima con tutto
   non letto, 143 contro 178 con tutto letto (`tasks/TASK-353.md`).
3. `unread` resta, uguale a `unread_count > 0`. Il campo è facoltativo in
   `shared-types`: con un server di prima l'app mostra il pallino.
4. Il tempo si scrive con i testi che l'app ha già (`DAYS`, `MONTHS`,
   `dayLabel` di `activityText.ts`), a 24 ore come in «My activities», non
   con `Intl`, che l'app finora non usa da nessuna parte.
5. I messaggi vecchi arrivano con `onEndReached` della lista invertita;
   «Show earlier messages» resta per quando il caricamento fallisce, perché
   la lista non lo richiede da sola finché il contenuto non cambia.

**Alternative scartate**: un conteggio senza limite (costa di più proprio su
chi ha più messaggi non letti, e l'app non lo mostra oltre «9+»); una colonna
di contatore da aggiornare a ogni messaggio (migrazione e un dato in più da
tenere allineato); togliere del tutto il tasto (un caricamento fallito
lascerebbe la chat ferma).

**Conseguenze**: nessuna migrazione, nessuna dipendenza, niente di nativo. Il
numero si vede solo dopo l'aggiornamento del server, col sì dell'utente;
fino ad allora orari, giorni e scorrimento funzionano con il pallino.

---

## ADR-0307 — «Draw» in tre secondi: un solo giallo, la via della partenza, la forma in scala, mezzo km per passo, la vibrazione solo dove c'è

**Stato**: Accettata · 2026-10-30 · la richiesta è **dell'utente**
(TASK-361, «Obiettivo»: i sette problemi e i miglioramenti, parola per
parola); l'ordine dei lavori è **dell'utente** («Dopo la #661»); i punti
tecnici sono **decisi dall'agente su delega dell'utente**. Numeri dal
Coordinatore (TASK-361, ADR-0307 confermato, 2026-10-30).

**Contesto**: «Draw» aveva due pulsanti gialli («Run without a route» in
alto, ADR-0183, e «Draw route» in basso), una fila di forme tagliata a
destra (ADR-0084), un campo che ripeteva la forma scelta, «Starting from
your position.» al posto di un posto vero, e la scheda «Play» sotto il
pulsante fisso.

**Decisione**:

1. **Un solo giallo**: «Run without a route» con contorno
   (`borderStrong`), 🏃 (🚴 con la bici) e testo in un pulsante
   (`RunNoRouteButton`). **Supera ADR-0183** per questo pulsante: la scelta
   dell'utente del 2026-10-30 sostituisce quella di TASK-220.
2. **La via della partenza** dal geocoder del telefono (`expo-location`
   `reverseGeocodeAsync`, già nell'app): via e paese, mai il numero
   civico (il GPS non è così preciso); chiesta di nuovo solo dopo 75 m;
   senza risposta la riga di prima. Solo col GPS come partenza. Scartati:
   Photon e Geoapify (scartati già da ADR-0252 per il punto sulla
   mappa: rete in più, un servizio terzo che vede la posizione; il
   geocoder del telefono non vuole chiavi). **Conseguenza**:
   la posizione va ad Apple o Google; una riga nuova nella privacy
   («Others who receive data»), nell'app e sul sito, approvata dall'utente
   il 2026-10-30 (TASK-361, «Le risposte dell'utente»).
3. **La forma in scala** senza SVG: il contorno del catalogo
   (`catalogueShapes.json`, lo stesso di «Draw on the map») misurato con
   `lookOf`, la sua lunghezza = la distanza; disegnato coi segmenti di
   `ImagePreview` su un pezzo di mappa finto; una barra di scala rotonda
   (50 m–10 km, al più il 40 % del riquadro) e «≈ L × A km».
4. **Mezzo km per passo** (mezzo miglio con «Miles») con
   `steppedDistance`: tenuto premuto, dopo 400 ms un passo ogni 150 ms,
   poi 70, poi 40 (da 1 a 21 km in meno di 3 s); al rilascio nessun passo
   in più. Il numero resta un campo; per VoiceOver «adjustable».
5. **Il tempo stimato**: tutti i metri su tutti i secondi delle ultime 10
   corse a piedi, ognuna di almeno 1 km e fra 2:30 e 15:00 al km (fuori:
   una bici salvata come corsa, una registrazione dimenticata); senza
   corse 6:00 al km, e la riga lo dice («a usual pace»).
6. **La griglia**: quattro per riga, sette forme e «See all» chiusa; la
   forma scelta, se è fra le altre dieci, prende il settimo posto.
   Supera ADR-0084 (la fila che scorre) per «Draw».
7. **La vibrazione**: `expo-haptics` nel `package.json` ma **escluso
   dall'autolinking** e caricato solo se `ExpoHaptics` c'è
   (`requireOptionalNativeModule`), come `expo-contacts` (TASK-262 C): in
   Expo Go vibra, nella 1.0 dello Store no, nella prossima build nativa sì
   togliendolo dall'esclusione. Impronta iOS `83793e26` misurata
   invariata. Una scelta: `selectionAsync`; un passo: `impactAsync`
   leggero.
8. **Il pulsante in fondo** è ancorato sopra la pagina, e la pagina
   finisce più in basso della sua altezza misurata (con l'area sicura) +
   24: l'ultima scheda («Play», «Near you») si vede sempre. Ancorato in una
   scatola dentro il `KeyboardAvoidingView`, non nel `KeyboardAvoidingView`:
   `bottom: 0` ignora il padding che fa posto alla tastiera, e il pulsante
   finirebbe sotto di lei.

9. **Il campo della forma** in «Shape» non c'è più sotto la griglia: sta
   dietro «Type another shape» (`OtherShapeField`), **scelta dell'utente
   del 2026-10-30**, perché senza campo una forma fuori catalogo
   («prancing horse», ADR-0012) non si potrebbe più scrivere. Si apre al
   tocco, vuoto; o da solo quando le parole scritte non sono il nome della
   forma scelta, così una parola che l'AI legge non resta nascosta.

10. **Parte B** (col via del Coordinatore del 2026-10-31): il pulsante
   giallo ha `testID="draw-route"` perché le sue parole cambiano con la
   scelta, e i test lo cercano per quello; il campo della distanza **non**
   è dentro un riquadro «adjustable» (lo nasconderebbe a VoiceOver, e il
   numero non si potrebbe più scrivere): bastano − e + coi loro nomi. In
   `Segmented` le scelte non prese passano da `textMuted` al colore del
   testo, più leggere (la richiesta dell'utente: «troppo spente»; l'AA
   c'era già); la presa si riconosce da superficie, bordo e grassetto.
   Al limite della distanza − e + non chiamano più `onText`: niente si
   muove, niente vibra.

**Conseguenza**: testi nuovi nelle cinque lingue (righe aggiunte in fondo
alle tabelle); solo app, OTA; motore, API e contratti invariati. Il
collegamento in `RoutePanel` e `App.tsx` (parte B) aspetta la #661.

---

## ADR-0300, precisazione — Modificare i nodi della traccia vera non è in nessun task

**Stato**: Attiva · 2026-10-30 · precisazione del Coordinatore, registrata
dalla sessione della parte A di TASK-347. ADR-0300 (punto 7) e
`tasks/TASK-347.md` dicevano che modificare i nodi di una traccia vera (il
percorso registrato o calcolato) è del TASK-346. Non è così: la #655 di
TASK-346 non ha nodi, perché l'utente ha scelto «Traccia dov'è» e ha
scartato «Trascinare il percorso». Quel lavoro **non è in nessun task**; se
servirà, lo chiede l'utente. TASK-347 modifica solo i tratti disegnati e li
riaggancia, come ADR-0300 dice. ADR-0300 resta com'è.

---
alle tabelle); solo app, OTA; motore, API e contratti invariati.

## ADR-0260, precisazione — Il regolamento legge i margini veri del telefono

**Stato**: Attiva · 2026-10-31 · deciso dall'agente su delega dell'utente
(TASK-360). `ContestRules` copre tutto lo schermo ma si apre anche dalla scheda
del Feed, in una pagina del `Pager`, che ha il margine alto a zero. Il `Modal`
tiene quindi un suo `SafeAreaProvider`, con `initialWindowMetrics`, come
`Tour.tsx`. Scartato: cambiare `Pager.tsx`, su cui lavora TASK-339, e far
scegliere il margine a chi apre il regolamento, che lo farebbe sbagliare al
prossimo che lo apre da un'altra pagina.

---

## ADR-0074, precisazione — La tavola del contorno legge i margini veri del telefono

**Stato**: Attiva · 2026-11-02 · deciso dall'agente su delega dell'utente
(TASK-366). La tavola di «Edit the outline» si apre da «Draw», una pagina del
`Pager`, e il titolo finiva sopra l'orologio. Come per il regolamento
(ADR-0260, precisazione), il `Modal` tiene un suo `SafeAreaProvider` con
`initialWindowMetrics`. Le altre sei finestre elencate da TASK-360 restano
come sono: aperte nel simulatore, nessuna si apre da una pagina del `Pager`.
Scartato: un provider in ogni `Modal` che legge i margini, «per sicurezza»,
che toccherebbe file di altri task senza un difetto da correggere.

---

## ADR-0310 — I percorsi di MuW nel Feed: un tipo a parte, da file, senza account né tempi

**Stato**: Proposta · 2026-10-31 · deciso dall'agente su delega dell'utente per
la parte tecnica; le scelte di prodotto restano aperte in `tasks/TASK-365.md`.
Numero dal Coordinatore.

**Contesto**: l'utente vuole nel Feed percorsi-disegno originali di MuW, soprattutto
in bici, che non sembrino attività di utenti reali. Un post di oggi è un `drawings`
su un `runs`, con utente, `started_at` e `duration_s` obbligatori, senza stato
«bozza». Le app già pubblicate leggono `GET /feed` e non devono rompersi.

**Decisione**:

1. **Fuori da `GET /feed`**: un endpoint proprio, `GET /muw-routes`. Un'app già
   pubblicata non lo chiede e non vede nulla di nuovo; la nuova app, col server
   di oggi, riceve `404` e mostra il Feed di sempre. `feed.py` non si tocca.
2. **Da file, come ADR-0097**: `catalog/muw_routes/<id>.json`, letti all'avvio
   dell'API, nessuna migrazione. **La bozza non è uno stato nel database**: resta
   fuori dal repository finché l'utente non la approva. Togliere un percorso è
   togliere un file.
3. **Le linee vengono dal motore** (`plan_nearby`, `activity: cycling`), mai
   scritte a mano. Fatte a mano sono solo le sagome di partenza, che non entrano nel
   catalogo delle forme (ADR-0036).
4. **Nessun account «MuW»**, salvo scelta dell'utente. Quindi sul post: niente
   reazioni né commenti (non c'è un `drawings` a cui attaccarli), niente profilo,
   follow o messaggi. `POST /reports` non si estende: il contenuto è nostro e
   non di un iscritto, e la correzione è togliere il file.
5. **Niente che sembri una corsa fatta**: nessuna persona, data di uscita, tempo,
   passo o calorie, e l'etichetta sempre sulla card. Il dislivello è detto come
   stima.
6. **Un componente nuovo**, `feed/MuwPost.tsx`: `FeedScreen` si tocca il minimo,
   `FeedPost` per niente.

**Scartate**: righe finte in `runs` e `drawings` (vorrebbe dire inventare tempi e
un utente); un campo `kind` in `GET /feed` (un'app già pubblicata lo mostrerebbe
come una corsa, e quella risposta è di TASK-362); un utente «MuW» nel database
(porta con sé follow, messaggi e segnalazioni che nessuno gestisce).

**Conseguenze**: nessuna migrazione e nessuna dipendenza. Un percorso nuovo vuole
una PR e un riavvio dell'API. Il punteggio del motore non basta a dire se una
forma si legge, quindi ogni percorso passa dall'occhio. `sampleFeed.json` e gli
esempi restano fuori: la scelta è aperta col Coordinatore (TASK-362, scelta 4).

---

## ADR-0281 — aggiunta, parte B: HealthKit nella 1.0.1, le librerie solo su iOS

**Stato**: Attiva · 2026-10-29 · deciso dall'agente su delega dell'utente
(TASK-321 parte B). Aggiunta ad ADR-0281, senza numero nuovo.

**Contesto**: B porta nella build iOS quello che A ha lasciato fuori: le
librerie dentro il linking, la capability, il testo del permesso e la
privacy. Restano da decidere il modo e i confini.

**Decisione**:

1. **Le tre librerie dell'iPhone collegate solo su iOS**
   (`platforms: { android: null }` in `react-native.config.js`):
   `@kingstinct/react-native-healthkit`, `@react-native-healthkit/core` e
   `react-native-nitro-modules`. Su Android non servono a niente e
   sposterebbero la build Android; `react-native-health-connect` resta
   fuori da tutte e due, fino a C.
2. **Gli entitlements e il testo in `app.json`, senza il plugin della
   libreria**, come previsto: `com.apple.developer.healthkit` e
   `…healthkit.access` vuoto (niente cartelle cliniche), niente consegne in
   background, niente `NSHealthShareUsageDescription`: MuW non legge, e
   iOS vuole il testo per leggere solo da chi chiede di leggere. Il testo
   approvato in `app.json` e nelle cinque `locales/*.json`.
3. **La privacy entra con B**, intera (anche la riga di Health Connect,
   com'è stata approvata), con la data del giorno del merge al taglio
   della 1.0.1 (condizione del Coordinatore): così non va online prima che
   la 1.0.1 sia sull'App Store. Le traduzioni del testo del permesso e
   della privacy le ha approvate l'utente il 2026-10-29.
4. **La PR resta in bozza fino al taglio della 1.0.1**: l'impronta iOS
   passa da `83793e26…` a `fd0cbb43…`, e in `main` gli `eas update` non
   arriverebbero più alla 1.0.0 (7).

**Conseguenze**: anche l'impronta Android si muove (`e2d33497…` →
`e9a0bda0…`), solo per la configurazione dell'app: le chiavi `ios` di
`app.json` contano nell'impronta di tutti e due i telefoni, come le
impostazioni Android contavano in quella dell'iPhone prima di
`ANDROID_ONLY` (TASK-294). Tenerla ferma vorrebbe un elenco gemello in
`fingerprint.config.js`, che è di TASK-294: il Coordinatore ha scelto di
no, perché Android ha comunque la sua build 1.0.1 (contatti, document
picker, accesso con Google) e la sua impronta si muove con quella iOS.
Sul simulatore, dopo «Save», l'allenamento è in Fitness con la mappa, il
tempo, la distanza e le calorie di MuW.

## ADR-0281 — aggiunta, il taglio della 1.0.1: Apple Salute con contatti e selettore, e il testo per leggere il battito

**Stato**: Accettata · **Data**: 2026-10-30 · **Deciso**: dall'utente (la
separazione dall'accesso con Apple e Google, il testo), dal Coordinatore (la
build dal branch), dall'agente su delega per il resto (TASK-321 parte B,
TASK-345 C). Aggiunta ad ADR-0281, senza numero nuovo.

**Contesto**: la parte B era di sola scrittura e diceva che MuW non chiede di
leggere. TASK-345 C vuole leggere il battito, e una sola modifica nativa:
dentro la #620 o tutto nella 1.0.2.

**Decisione**:

1. **La chiave entra nella 1.0.1**, il codice no. Nel binario c'è
   `NSHealthShareUsageDescription`; il tipo si chiede a runtime, quindi C può
   arrivare dopo con un update sulla 1.0.1. Gli entitlements non cambiano.
2. **La privacy della #620 non cambia**: «MuW never reads your health data»
   resta vera finché C non legge. La frase nuova va con C.
3. **`expo-contacts` col suo plugin**, come chiede il promemoria di TASK-262:
   togliere l'esclusione da sola lascerebbe l'app senza il testo della domanda.
4. **La build dal branch, il merge dopo Apple**: finché è in revisione, `main`
   continua a raggiungere la 1.0.0 (7).

**Conseguenze**: impronta iOS `67253126…`, Android `8aac71c3…` al merge. Fino
al merge chi ha la 1.0.1 non riceve gli update da `main`. Sul simulatore
scrittura, lettura, contatti e selettore funzionano con la build Release.

## ADR-0281 — aggiunta, la build della 1.0.1: anche la vibrazione

**Stato**: Accettata · **Data**: 2026-11-02 · **Deciso**: dall'utente
(`expo-haptics` nella 1.0.1, «Sì, accendila», nella chat del Coordinatore),
dall'agente su delega per il resto (TASK-321 parte B). Aggiunta ad ADR-0281,
senza numero nuovo.

**Decisione**: `expo-haptics` esce da `autolinking.exclude` con contatti e
selettore, come ADR-0307 diceva per la prossima build nativa. Un test
confronta il nome del modulo che l'app chiede con quello registrato da ogni
libreria. La privacy porta la data del riallineamento, il 2 novembre 2026.

**Conseguenze**: impronta iOS `6f8bba4c…`, Android `227457f3…`. Sul
simulatore la build Release ha i quattro moduli nativi e ognuno risponde.
## ADR-0311 — La navigazione come Instagram: una barra di schede in basso, un header solo

**Stato**: Proposta · 2026-11-02 · TASK-367. La richiesta è dell'utente (un
brief del 2026-11-02); numeri dal Coordinatore. Le scelte di prodotto sono
dell'utente, in `tasks/TASK-367.md`; il resto è deciso dall'agente su delega
dell'utente. Sostituisce ADR-0124 (le pagine affiancate) e il `Pager` di
TASK-339 A.

**Contesto**: le pagine stanno una accanto all'altra, con i nomi «Feed · Draw ·
Explore» sotto la Dynamic Island e il profilo dietro un cerchio. I messaggi si
aprono dal Profilo, le impostazioni da una riga del Profilo. L'utente vuole la
struttura di Instagram: cinque schede in basso e un header uguale ovunque.
Sull'immagine della barra e dell'header, nei due toni coi colori dei token, ha
risposto «Sì, così».

**Decisione** (proposta):

1. Una barra in basso con cinque icone senza testo: Feed, Draw, Messages,
   Explore, il cerchio del profilo. La scheda attiva in `text`, le altre in
   `textFaint`: il giallo resta del percorso (ADR-0293). Il cerchio attivo ha un
   bordo `text`.
2. Un header solo: il cuore e «MuW» a sinistra, lo sport a destra. Nessun nome
   di pagina.
3. Niente swipe fra le pagine. Le pagine restano montate dopo la prima visita,
   come oggi; il tocco sulla scheda attiva torna in cima o alla radice.
4. La barra e l'header spariscono dove oggi sparisce il Pager: mappa, corsa,
   «Play», la corsa riaperta.
5. Icone PNG prese da Lucide (licenza ISC), colorate dai token («PNG da
   Lucide»): nessuna dipendenza nuova, l'impronta iOS non cambia, arriva con un
   OTA. Lo sfondo della barra è semitrasparente senza blur: `expo-blur` è nativo.
6. La campanella aspetta una lista vera di notifiche sul server, in una parte a
   sé con una migrazione («Aspetta la lista vera»): niente schermate
   segnaposto agli utenti.
7. Messages diventa una scheda con la lista di oggi; le impostazioni si aprono
   dall'ingranaggio del Profilo. Nessuna funzione si perde.
8. Nella prima parte nessun testo nuovo: le etichette di VoiceOver riusano nomi
   già tradotti («Sì, approvo»).

**Conseguenze**: tre parti: A la barra (solo app, dopo TASK-355 A e 362), B la
ricerca in Explore (dopo 344 B), C le notifiche (API, migrazione, app). Le
schermate dell'App Store (TASK-328) vanno rifatte. Chi aveva imparato lo swipe
fra le pagine non lo trova più.

**Parte A, scelte tecniche** (2026-11-04, decise dall'agente su delega
dell'utente):

- `TabShell` al posto di `Pager`: le pagine sovrapposte, quella fuori vista
  con `display: none`, così restano montate senza uno ScrollView orizzontale.
  Il tour usa gli stessi nomi di prima (`tab:` e `page:`), quindi i suoi testi
  non cambiano.
- Il tocco sulla scheda attiva passa per un contesto per pagina
  (`useTabReselect`): Feed, Draw, Explore (anche sull'acqua) e Messages
  tornano in cima con una riga ciascuno; il profilo si ricostruisce, come già
  faceva a ogni ritorno. Questo aggiunge al task `FeedScreen.tsx`,
  `ExploreScreen.tsx`, `PaddleExplore.tsx` e `TourScrollView.tsx`, una riga
  ciascuno: dentro le pagine non cambia altro.
- La lista di «Messages» aperta da altrove va alla scheda (`useInboxTab`); le
  richieste e le conversazioni restano sopra l'app, e «←» torna alla scheda.
  Senza account la scheda porta al profilo, a «Sign up» e «Log in»: nessun
  testo nuovo.
- Le icone attive hanno il tratto più spesso (2,5 contro 1,75), non il pieno:
  Lucide non ha icone piene. Il cuore dell'header è il cuore di Lucide pieno,
  nel giallo del marchio come al lancio.
- La barra usa `background` al 95% (`F2`), come `hairline` usa `text` al 20%:
  un colore derivato dai token, non scritto a mano.
- Android: il tasto indietro torna alla scheda mostrata prima (una pila delle
  schede viste), poi lascia uscire.

**Parte B, scelte tecniche** (2026-11-04, decise dall'agente su delega
dell'utente):

- Il campo in cima a «Explore» non è un campo vero: apre la pagina della
  ricerca di TASK-344, che ha già il suo campo con la tastiera aperta. Riusa
  il testo «Search drawings, people, places» e la lente della barra: nessun
  testo nuovo, nessuna icona nuova.
- C'è anche nell'«Explore» della canoa: senza, chi pagaia avrebbe perso la
  ricerca con la lente del Feed.
- Un esempio del Feed trovato dalla ricerca si apre come dal Feed
  (`fetchPostRoute`, che controlla che il percorso sia ancora lo stesso):
  `ExploreScreen` e `PaddleExplore` ricevono `onOpenExample` da `App.tsx`.
- Da lì «Indietro» e «Back to the list» tornano a «Explore», dove era la
  ricerca, non al Feed (`routeList` «explore»). Sull'acqua l'esempio trovato
  si può quindi spostare come quelli di «Explore» (TASK-244): è lo stesso
  percorso dell'app.
- La pagina della ricerca è un Modal aperto da una pagina della barra di
  schede, che riceve `top: 0` (l'intestazione tiene la barra di stato): il
  suo campo finiva sotto l'ora. Il difetto c'era già in produzione con la
  lente del Feed. Rimedio come TASK-366 per OutlineBoard: dentro il Modal un
  `SafeAreaProvider` proprio con `initialWindowMetrics`.

**Parte C1, scelte tecniche** (2026-11-04, decise dall'agente su delega
dell'utente; la divisione in C1 API e C2 app è del Coordinatore):

- La lista si riempie come l'email delle notizie: un «listener» del
  `Pusher` (`notification_list.py`). Così prende esattamente gli eventi
  che le push lasciano passare (non i propri, uno al giorno), senza toccare
  i moduli che li scrivono; a differenza dell'email, per tutti, push
  accese o spente.
- Nessun testo nel database: il testo è quello della push (`text_of`),
  scritto alla lettura nella lingua dell'account; cosa apre è il `data`
  della push (`data_of`). L'app riceve righe già pronte e apre quello che
  apre oggi la push.
- Quello che non è più vero resta fuori con le stesse condizioni
  dell'email delle notizie, riscritte nel modulo invece di cambiare
  `notice_email.py`.
- Lo stesso evento di nuovo cancella la riga di prima e ne scrive una
  nuova: l'ordine per `id` resta l'ordine nel tempo, e la pagina usa `id`
  come segnalibro.
- La lettura segna fino all'`id` mostrato, non «tutto adesso»: una riga
  arrivata fra la lettura della lista e il segno resta non letta.
- Le righe più vecchie di `KEPT_DAYS` si cancellano alla prima scrittura
  dopo, per tutti, con un indice su `at`; in lettura non si mostrano già.

**Parte C2, scelte tecniche** (2026-11-04, decise dall'agente su delega
dell'utente; i tre testi sono dell'utente):

- La campanella sta nell'header (`AppHeader`) e legge un contesto che dà
  «Profile» (`bell/bellDoor.ts`), come i messaggi: `App.tsx` non cambia.
- Senza lista da aprire non c'è: un 404 su `/notifications` (server di prima)
  la toglie e non si chiede più per quell'account. È la scelta dell'utente
  «Aspetta la lista vera»: mai una pagina vuota segnaposto.
- Il numero si chiede ogni 5 minuti, non ogni minuto come i messaggi: una
  pagina porta le foto di chi ha agito. Più all'avvio, al ritorno dell'app e
  quando la lista si chiude.
- Quello che apre una riga è quello che apre la sua push: `tapTarget` legge
  `opens`, e `openTarget` (nuovo, usato anche dalle push) apre la porta.
- La lista è letta fino alla riga più nuova appena la prima pagina è sullo
  schermo; le righe nuove restano marcate finché la lista è aperta.
- L'icona è la `bell` di Lucide, resa in PNG bianca a 26 pt con tratto 1,75
  come le altre (`out/TASK-367-c2/icon.swift`).

## ADR-0312 — I record personali: calcolati sul server da ogni attività, a piedi e in bici, visibili a tutti con la corsa chiusa se privata

**Stato**: Proposta · 2026-11-02 · TASK-368. La richiesta è dell'utente
(2026-11-02); numeri dal Coordinatore. Le scelte di prodotto sono dell'utente,
in `tasks/TASK-368.md`; il resto è deciso dall'agente su delega dell'utente.
Estende ADR-0284 (i totali del profilo).

**Contesto**: il Profilo mostra distanza, dislivello e like. L'utente vuole i
record sulle distanze classiche, come i «best effort» di Strava. Ogni attività
salvata con un account è già sul server con la traccia a tempi e le pause.

**Decisione** (proposta):

1. A piedi 5K, 10K, 15K, mezza, 30K, maratona, 60K («Sì, con la maratona»); in
   bici 10, 20, 40, 50, 100, 160 km («Sì, queste»). La canoa no.
2. Contano tutte le attività dell'account: private, di gruppo, importate
   («tutte anche quelle importate», «e anche le private tutte»).
3. Il record è il tratto più veloce dentro un'attività, in movimento: pause
   tolte, pezzi con salti del GPS scartati, nessun tempo sotto il record del
   mondo («Sì, così»).
4. Il calcolo sta sul server, in un modulo puro, con una tabella di cache
   aggiornata a ogni attività salvata, cambiata o cancellata, e uno script che
   riempie la cache dalle attività già salvate.
5. Gli altri vedono tempo e data («Anche data e corsa»); la corsa si apre solo
   a chi può già vederla: un record di una corsa privata mostra tempo e data e
   resta chiuso («Sì, corsa chiusa»). L'API manda la chiave della corsa solo in
   quel caso.
6. La Guida e la privacy lo dicono, con il testo approvato («Sì, approvo»).

**Conseguenze**: una migrazione e un aggiornamento del server, col sì
dell'utente. Un record di una corsa privata dice agli altri che quel giorno
l'utente ha corso: è la scelta dell'utente, scritta nella privacy. Un file
importato modificato può dare un record falso, visibile a tutti: accettato con
la scelta 2.

**Parte A, scelte tecniche** (2026-11-04, decise dall'agente su delega
dell'utente):

- **Una riga per corsa, non per record**: `run_bests` tiene i tempi di ogni
  corsa per tutti e due gli sport, qualunque fosse, e il profilo prende il
  migliore fra le corse dello sport che hanno adesso. Il task diceva una
  tabella `personal_bests` con una riga per record: così invece cancellare
  una corsa lascia da solo il migliore dopo (la chiave esterna), e cambiare
  lo sport pubblicando il disegno non chiede di ricontare (`drawings.py` non
  cambia). Il costo: circa 14 righe per corsa, 10 ms di lettura a 1000 corse.
- **I metri come `distance_m`**: lungo la traccia con `haversine_m`, nessuno
  dentro una pausa del corridore, come li conta `activities.recorded`. Una
  corsa che dice 10,00 km ha il suo 10K: mezzo metro sotto la distanza conta
  ancora (l'arrotondamento di `distance_m`).
- **Il limite del record del mondo in bici**: per queste distanze non c'è un
  record su strada, e una discesa va più veloce del record dell'ora; il
  limite è la velocità del salto del GPS, 90 km/h di media. A piedi i record
  di World Athletics dove ci sono, e per 15, 30 e 60 km un tempo tondo più
  basso di quanto si sia mai corso: un limite basso non scarta mai un tempo
  vero.
- **Il calcolo** è vettoriale (numpy, già dell'API): meno di 10 ms per 25 000
  punti; fatto prima di aprire la transazione del salvataggio, che tiene il
  blocco dell'account.
- Il codice del profilo sta in `profile_bests.py`: `personal_bests.py` resta
  puro e non importa `drawings.py`, che importa `activities.py`.
- Lo script una tantum è un modulo, `python -m
  shaperoute_api.personal_bests_backfill`, come `game_backfill`: una corsa
  per transazione, così i profili rispondono mentre gira.
- Nota: `clean_track` scarta già le posizioni oltre 12 m/s (43 km/h), anche
  in bici: il salto dei 90 km/h raramente scatta. Non cambiato qui.

---

## ADR-0309 — «RIDE IT YOURSELF»: percorsi in bici di MuW in «Explore», da un file nell'app

**Stato**: Attiva · 2026-11-03 · deciso dall'agente su delega dell'utente per la
parte tecnica; numero dal Coordinatore; scelte e testi dell'utente in
`tasks/TASK-364.md`.

**Contesto**: l'utente vuole in «Explore» le migliori bozze in bici di MuW. Le
idee di ADR-0287 sono a tema, con tappe e «Make it near me» che richiede le
stesse parole all'API: queste no. Non sono state pedalate.

**Decisione**:

1. **Una fila nuova con dati fissi**, `RideItYourself` sotto «IDEAS FROM EUROPE»;
   `themedIdeas.json` non si tocca.
2. **Dal motore, non a mano**: i percorsi sono quelli che il motore ha
   pianificato sulla rete bici; `tools/bike_ideas.py` li sceglie e toglie punti
   entro 2 m. Una traccia fatta da uno script fuori dal motore non entra
   (lo studio di «MARRY ME» in `out/marry-me/`).
3. **Aperti dal telefono**: `useExplored` trova un percorso della fila prima di
   chiedere al server; nessun endpoint nuovo, nessuna foto, solo app.
4. **Una figura fuori catalogo** porta il suo contorno (`outline`) nel dettaglio:
   la richiesta che «Start» e «Export GPX» leggono è quella di un contorno, in
   bici.
5. **Niente numeri non veri**: la scheda dice città, figura, «In bici» e la
   distanza; sotto la fila, che nessuno li ha ancora pedalati.
6. **Un percorso sta in Explore o nel Feed**, non in tutti e due senza una
   scelta dell'utente (con ADR-0310).

**Motivo**: la stessa strada degli esempi di «Explore» già sul telefono, senza
toccare il server né le app pubblicate; il principio di ADR-0001 resta intero.

**Conseguenza**: aggiungere un percorso vuol dire rigenerare il file con lo
strumento e una PR; togliere la nota quando qualcuno li avrà pedalati è una
scelta dell'utente.

---

## ADR-0315 — La camminata: un'attività dell'API sulla rete foot della corsa, nel gioco ma non nei record

**Stato**: Proposta · 2026-11-04 · TASK-371. La richiesta è dell'utente
(2026-11-04); numeri dal Coordinatore. Le scelte di prodotto sono dell'utente,
in `tasks/TASK-371.md`; il resto è deciso dall'agente su delega dell'utente.

**Contesto**: l'utente vuole lo sport «Walk». La corsa usa già la rete «foot»
di `network.py`; il nuoto (ADR-0283, #709) ha introdotto `API_ACTIVITIES` per
le attività dell'API prima che l'app le offra. Ogni cambio di `models.py`
sposta l'impronta del motore e fa rifare gli esempi della canoa.

**Decisione** (proposta):

1. **`walking` è un'attività dell'API** come le altre, 1–30 km (scelta
   dell'utente), disegnata sulla **rete foot della corsa**: stesso grafo,
   stessa cache, nessuna rete nuova; sul server il grafo già in memoria della
   corsa.
2. **Tre parti**: A motore, contratto, API e migrazione 0043, dopo #709 e
   prima della notte degli esempi, così si rifanno una volta sola; B l'app,
   dopo TASK-367 A, con `ACTIVITIES` che si allarga solo allora; C il gioco
   delle forme sul server.
3. **Il GPX di una camminata lo dice**: `<type>walking</type>` nella traccia,
   nel GPX del percorso e in quello della corsa salvata; i file degli altri
   sport restano quelli di prima, byte per byte (condizione del
   Coordinatore).
4. **Ritmo in min/km** come la corsa; tempo previsto su 12:00 /km finché non ci
   sono camminate salvate.
5. **Apple Salute `.walking`, Health Connect WALKING, Strava «Walk»**, con le
   calorie stimate da camminata (scelta dell'utente).
6. **Nel gioco delle forme sì, nei record personali no** (scelta
   dell'utente): una camminata dà metri al gioco con una nuova versione delle
   regole; i record di ADR-0312 restano della corsa.

**Motivo**: la camminata cammina sulle stesse vie della corsa; riusare la rete
non costa memoria né download e tiene il principio di ADR-0001 intero.

**Conseguenze**: una migrazione e un aggiornamento del server, col sì
dell'utente; l'impronta del motore cambia insieme a quella del nuoto. Nel
gioco, chi cammina raccoglie metri come chi corre: le regole lo accettano per
scelta dell'utente.

**Aggiunta (parte A, 2026-11-04)** · deciso dall'agente su delega
dell'utente, approvato dal Coordinatore: **il motore non cambia impronta**.
Gli esempi si ridisegnano la notte del nuoto, e un secondo ridisegno
chiederebbe il sì dell'utente. Quindi `models.py`, `network.py`,
`__main__.py` ed `export_gpx.py` restano come sono: la camminata vive in un
file nuovo, `route_engine/walking.py` (`API_ACTIVITIES`, 1–30 km,
`engine_activity` che la chiede al motore come corsa, la riga di comando
`python -m route_engine.walking`), lasciato fuori dall'impronta da
`route_store.WALK_ONLY`, come i file del nuoto e dei disegni ancorati. Un
test tiene le impronte 5b5e026cea9b e b9d00c37d28d. Una camminata e una
corsa con la stessa richiesta sono lo stesso percorso tenuto. Il `<type>`
del GPX c'è solo per la camminata: gli altri file restano byte per byte
quelli di prima (punto 3). La «Conseguenza» sull'impronta del motore qui sopra
non vale più.

**Aggiunta (parte B, 2026-11-04)** · deciso dall'agente su delega
dell'utente, col via del Coordinatore; testi e NEAR YOU sono scelte
dell'utente:

- `walking` entra in `ACTIVITIES` dell'app, e `API_ACTIVITIES` diventa
  `ACTIVITIES`.
- «Walk» 🚶 viene dopo il nuoto (il suo test vuole il nuoto subito dopo
  «Paddle») ed entra con `ready: false`, come il nuoto, finché il server non
  ha la parte A e la 0043. Con `ready: false` né il modulo per pubblicare
  né i filtri della ricerca offrono «Walk» (`sport.activityOffered`,
  condizione del Coordinatore: l'OTA non dipende dal server). Quando lo
  sport si accende, compaiono insieme.
- Il ritmo usuale è 12:00 al km. Contano le camminate fra 6:00 e 25:00 al km
  (`averagePace().walking`), così `App.tsx` non cambia.
- Le calorie usano l'equazione ACSM del cammino: 0,1 ml/kg per metro e 1,8
  per metro di salita. Il nuoto resta a 0.
- Apple Salute la riceve come `.walking` (52), con la distanza
  `DistanceWalkingRunning`; Health Connect come `WALKING` (79).
- Il telefono la disegna sulle sue zone a piedi (`NETWORKS.walking`).
- Nei file importati è camminata il `walking` del GPX, il «10» di Strava e
  lo sport FIT 11. L'escursionismo no: è di TASK-377.
- «NEAR YOU» resta solo per la corsa («Solo corsa, per ora»).

**Aggiunta (parte C, 2026-11-04)** · scelta dell'utente per i ritmi
(«Solo i metri»), il resto deciso dall'agente su delega dell'utente col via
del Coordinatore:

- Nel gioco delle forme una camminata conta i suoi metri come una corsa,
  con gli stessi controlli, ma senza tempi migliori: le forme col ritmo non
  si sbloccano camminando.
- `RULES_VERSION` passa a 2, così `game_backfill` ricalcola le corse già
  tenute.
- I concorsi non filtrano per sport, quindi i post a piedi c'erano già.
- L'app non cambia: la striscia del gioco conta già «a piedi» tutto ciò che
  non è bici, canoa o nuoto.
---

## ADR-0318 — Il mio corpo: kcal da peso, sesso ed età per corsa, bici e paddle, e zone del battito sul telefono

**Stato**: Proposta · 2026-11-04 · TASK-374. La richiesta è dell'utente
(2026-11-04); numero del task dal Coordinatore. Le scelte di prodotto sono
dell'utente, in `tasks/TASK-374.md`. La formula e il calcolo delle zone sono
decisi dall'agente su delega dell'utente. Supera ADR-0219 §3 (calorie solo
correndo) ed estende ADR-0298 (le calorie nel Feed).

**Contesto**: le kcal sono `km × 70 kg × 1,036`, solo per la corsa: nel
riquadro della corsa, nel Feed (TASK-345 A) e in Health. ADR-0219 aveva
tolto il riquadro in bici e in canoa aspettando «una formula per sport».
L'app non conosce il corpo dell'utente. Sesso, peso, altezza, età e zone sono
dati sulla salute (GDPR art. 9).

**Decisione** (proposta; le scelte dell'utente ancora aperte sono in
`tasks/TASK-374.md`):

1. Sesso, peso, altezza e anno di nascita sono facoltativi e restano **solo
   sul telefono** (scelta dell'utente, «Solo sul telefono», 2026-11-04):
   niente server, niente migrazione, privacy invariata. Ogni dato che manca
   torna al valore di oggi.
2. **Energia totale** (deciso dall'agente):
   - *Corsa*: equazione ACSM della corsa, VO₂ = 3,5 + 0,2·v + 0,9·v·pendenza
     (ml/kg/min, v in m/min). Sommata sulla corsa diventa
     `peso × (0,0175 × minuti + 1,0 × km + 0,0045 × metri di salita)` kcal,
     con 5 kcal per litro di O₂. La salita viene da `climbM()`.
   - *Bici e paddle*: MET dal *Compendium of Physical Activities* 2024, per
     fasce di velocità media in movimento. Le fasce sono copiate nel codice con
     il codice attività del Compendium. Energia = `MET × 0,0175 × peso × minuti`.
3. **Energia attiva**, quella mostrata e scritta in Health come «active
   energy»: totale meno il consumo a riposo nello stesso tempo in movimento.
   A riposo vale Mifflin-St Jeor (sesso, età, peso, altezza) diviso 1440. Se
   manca sesso, età o altezza, vale 1 MET standard (`0,0175 × peso` al minuto).
   Il sesso ha tre valori più il vuoto: «Male» (+5), «Female» (−161),
   «Prefer not to say», che usa la media delle due costanti (−78) (scelta
   dell'utente, «Male, Female, Prefer not», 2026-11-04).
4. Senza nessun dato, una corsa in piano dà `1,0 × km × 70`, cioè −3,5%
   rispetto a oggi (1,036). Su una corsa con salita il valore cresce.
5. Il Feed usa i dati solo per i post propri. Per i post degli altri resta la
   formula senza dati (70 kg): i dati non lasciano il telefono.
6. **Zone** (deciso dall'agente): FC max = 208 − 0,7 × età (Tanaka 2001),
   oppure inserita a mano. Le cinque zone vanno dal 50 al 100% della FC max, a
   passi del 10%. Con la FC a riposo si usa Karvonen: riposo + % × (max −
   riposo), con le stesse percentuali. I limiti cambiati a mano restano e
   tengono le zone contigue: cambiare il limite alto di una zona sposta il
   limite basso di quella dopo.
7. Peso, altezza e data di nascita si leggono da Apple Salute / Health
   Connect solo dalla 1.0.2 (scelta dell'utente, «Sì, nella 1.0.2»,
   2026-11-04): riempiono i campi vuoti, mai quelli inseriti a mano. Il testo
   della chiave di lettura e App Privacy cambiano una volta sola, con TASK-345
   C.
8. Le zone servono come tabella e per il tempo in ogni zona a fine corsa,
   dai campioni di battito di TASK-345 C (scelta dell'utente, «Tabella +
   tempo in zona», 2026-11-04). Niente battito in tempo reale.
9. La sezione sta nelle Impostazioni, sotto «Units», non nel Profilo
   (scelta dell'utente, «Nelle Impostazioni», 2026-11-04).
10. Limiti dei campi (deciso dall'agente): peso 30–300 kg, altezza 100–250
    cm, anno di nascita da 100 a 13 anni fa; FC massima 100–230 bpm, a riposo
    30–120 bpm. Fuori dai limiti il campo non si salva e dice perché.
11. I testi delle parti A e B sono approvati (scelta dell'utente, «Sì,
    approvo», 2026-11-04), in `tasks/TASK-374.md`.
12. L'età è l'anno in corso meno l'anno di nascita.
13. Fatto nella parte A (deciso dall'agente su delega dell'utente): i MET sono
    quelli del Compendium 2024 (pacompendium.com), bici 4,0 sotto i 10 mph,
    6,8 / 8,0 / 10,0 / 12,0 per fasce di 2–4 mph, 15,8 da 20 mph; canoa e
    kayak 2,8 sotto i 4 mph, 5,8 fino a 6, 12,5 oltre. Senza metri l'energia è
    zero (da fermi è riposo). Nel Feed il tempo è quello del post (`minutes`),
    la salita non c'è; i post in bici e in canoa ora hanno le kcal. In Salute e
    Health Connect le kcal si scrivono per ogni sport: il testo di
    `NSHealthUpdateUsageDescription` della 1.0.1 dice ancora «for runs» e si
    corregge nella 1.0.2, con la parte C.
14. Il nuoto (TASK-323 C2, entrato prima) non ha ancora una formula: zero kcal,
    nessun riquadro «Calories» e nessuna energia in Salute, come aveva deciso
    il suo task. Una formula per il nuoto è una scelta a parte. Basta per Tanaka e per
   Mifflin, e non chiede la data intera.
15. Fatto nella parte B (deciso dall'agente su delega dell'utente): le zone
    hanno sei limiti condivisi (inizio della zona 1, cima delle zone 1–4, FC
    massima), così restano contigue per costruzione. La pagina fa scrivere la
    cima delle zone 1–4; l'inizio della zona 1 segue il calcolo (il modulo
    accetta anche quello). Un limite scritto fuori ordine non dà errore: si
    ferma un battito sotto la cima della zona dopo, o sopra quella della zona
    prima. Un limite cambiato a mano resta in bpm anche se cambiano FC massima
    o a riposo; i limiti calcolati gli stanno intorno, e se la FC massima
    scende sotto un limite fissato lo spinge giù quanto basta per tenere
    l'ordine. Una FC a riposo pari o sopra la massima non conta (zone in % della
    massima). La casella svuotata torna al calcolo; un testo che non è un numero
    lascia il valore di prima. Tutto in `heart.json` accanto a `body.json`;
    senza niente di scritto a mano il file non c'è. Il testo d'errore delle FC,
    «Enter a heart rate between {min} and {max} bpm.» → «Scrivi una frequenza
    tra {min} e {max} bpm.», è approvato (scelta dell'utente, «Sì, approvo»,
    2026-11-04).

**Motivo**: l'equazione ACSM e il Compendium sono pubblici e citabili, e si
verificano a mano nei test. Togliere il consumo a riposo dà l'«energia attiva»
come la intendono Apple Health e Health Connect, e porta dentro sesso, età e
altezza nel solo punto in cui contano senza il battito.

**Conseguenze**: il peso cambia le kcal in proporzione. Sesso ed età, senza il
battito, le spostano di pochi punti percentuali: in un'ora a 70 kg, pochi kcal.
Bisogna dirlo senza promettere di più. Una formula che usa sesso ed età col
battito (Keytel 2005) resta fuori: il battito arriva solo a corsa finita e
non sempre. Le kcal dei post altrui
restano a 70 kg, perché i dati restano sul telefono.
## ADR-0313 — «Edit the drawing» su ogni disegno: la traccia dov'è, una copia senza legami, l'acqua a parte

**Stato**: Proposta · 2026-11-04 · TASK-369. Le scelte di prodotto sono
dell'utente (2026-11-03 e 2026-11-04, una per volta, in `tasks/TASK-369.md`);
i punti tecnici sono decisi dall'agente su delega dell'utente. Numero dal
Coordinatore. Estende ADR-0299 a ogni scheda; cambia ADR-0288 per le emoji e
le parole; cambia ADR-0161 per i disegni sull'acqua (parte B). ADR-0288 per
il risultato di «Draw» (TASK-340) resta.

**Contesto**: l'utente il 2026-11-03 vuole «Modifica il disegno» su tutti i
disegni dell'app, anche su quelli degli altri nel Feed, così ogni disegno si
modifica e poi si corre. Prima il tasto c'era sulla scheda di un disegno di
un membro (la traccia dov'è stata corsa, ADR-0299) e sulla scheda di
«Explore» solo per un contorno (nel mezzo della partenza, ADR-0288); mai per
un'emoji, una parola, un percorso a tema, una corsa libera o importata,
sull'acqua.

**Decisione**:

1. Ogni scheda con una linea sulla mappa ha «Edit the drawing», che mette
   **la traccia, o la linea del percorso, dov'è e grande com'è** su «Draw on
   the map» (`figureLines.trackInPlace`, in metri sul piano): un disegno di
   un membro, un'emoji, una parola, un percorso a tema, una corsa libera o
   importata, un esempio di «Explore» o del Feed, un preferito, un disegno
   ricevuto in un messaggio. Scelte dell'utente: emoji, parole, percorsi a
   tema, corse libere e importate «Sì, la traccia».
2. Anche la scheda di «Explore» passa dalla figura chiesta nel mezzo della
   partenza alla linea del risultato dov'è (deciso dall'agente su delega
   dell'utente: una regola sola per ogni scheda, come le scelte del punto 1).
   Per portarla vicino a sé resta «Draw it near me».
3. Una traccia che finisce lontano dalla partenza resta aperta, con la regola
   di ADR-0288 (`CLOSED_SHARE`, l'anello minuscolo e la linea come
   dettaglio); una più lunga dei limiti di «Draw» si rimpicciolisce attorno
   al suo mezzo (ADR-0299, punto 2).
4. Una parola modificata è un disegno a mano: niente più tratti a penna
   alzata. Un percorso a tema modificato perde i luoghi del tema e la riga
   «Passes by N of M places».
5. Niente tasto per un post di sole foto («Sì, niente tasto») e sotto il
   risultato di «Draw» («No, resta tolto», TASK-340).
6. Un disegno di un altro si modifica sempre in una **copia** di chi lo
   modifica; il post originale non cambia mai. La copia **non dice da chi
   viene** («No, niente scritta») e l'autore **non può impedirla** («Sì,
   nessun blocco»): non resta nessun legame fra copia e originale, né
   nell'app né sul server. Se l'autore blocca chi ha copiato, rende privato
   o cancella l'originale, **la copia resta di chi l'ha fatta** (l'utente, il
   2026-11-04: «si si»); chi è bloccato non vede più il disegno e non ne fa
   altre copie.
7. **Sull'acqua** (parte B, «Voglio anche Pagaia», «Sì, parte separata»):
   l'API accetta un'immagine con «paddling» (solo `placement` «free») e il
   motore la mette dove c'è posto vicino alla partenza, con
   `water_fit.plan_on_water` da un file nuovo (`drawn_water.py`) escluso
   dall'impronta come `ANCHORED_ONLY` (ADR-0300): l'impronta del motore non
   cambia e i percorsi tenuti restano. Se non si può, la parte B va di notte
   col sì dell'utente. Niente «Freehand» sull'acqua in «Draw».

**Alternative scartate**: la figura chiesta invece della traccia per le
emoji (la scelta del 2026-10-29, «non serve a nulla»); tenere i luoghi del
tema in un disegno a mano (un campo nuovo nel contratto e nel motore); la
scritta «Based on @name's drawing» (un campo del post sul server e una riga
di privacy); un'impostazione dell'autore che vieti le copie (server,
contratto, testi); la Pagaia nella parte A (l'API la rifiuta); cambiare
`paddling.py` (impronta nuova, ore di `draw_examples --water`).

**Conseguenze**: la parte A non cambia contratto, API, motore, testi,
dipendenze né nativo: arriva con un OTA, impronta iOS 6f8bba4c. La parte B
cambia il comportamento dell'API (accetta quello che rifiutava), non la forma
del contratto, e vuole l'aggiornamento del server col sì dell'utente.
## ADR-0313, precisazione — «Freehand» anche sull'acqua con «Paddle» (TASK-396)

**Data**: 2026-11-05 · **Stato**: Accettata

Cambia la scelta 4 di ADR-0313 («niente "Freehand" sull'acqua in "Draw"») e
i criteri di TASK-320 e TASK-340, per scelta dell'utente del 2026-11-05: «Dai
le possibilità di disegnare a mano libera anche nella sezione draw con la
canoa sui laghi e Mari», confermata con «Sì, confermo: Freehand con la canoa
accanto alle forme, niente Word e niente Image».

- Con «Paddle», in «Draw», «Freehand · Shape»; il disegno va al motore
  sull'acqua di TASK-369 B, dove c'è posto vicino alla partenza. Niente
  «Word» (l'API la rifiuta sull'acqua) e niente «Image» (scelta dell'utente).
- Sopra il selettore la nota «On the water, the drawing goes where it fits
  near the start.», approvata dall'utente.
- Un disegno che non sta sull'acqua (canoa e nuoto) dice «This drawing…» e
  non offre le forme del catalogo; testi approvati dall'utente.
- Deciso dall'agente su delega dell'utente: la scelta sta nel profilo dello
  sport (`noWords`, `noImages`, `drawNote` in `sports/`), non in un confronto
  sull'attività in `RoutePanel.tsx`; `shapesOnly` è tolto perché nessuno sport
  lo usa più. Solo JavaScript: impronta iOS `6f8bba4c`.

## ADR-0297, aggiunta — La schermata della ricerca (TASK-344 parte B)

**Stato**: Attiva · 2026-11-04 · TASK-344 parte B. Deciso dall'agente su
delega dell'utente, dentro le sei scelte approvate il 2026-10-29.

**Decisione**:

1. **La ricerca è un `Modal` aperto dalla lente** (`FindFriendsButton`),
   non una pagina di `ProfileLayer`: così `ProfileLayer.tsx` non cambia.
   Per aprire un esempio come percorso la lente riceve da `FeedScreen` il
   suo `onOpen`, una riga. Toccato un risultato, la ricerca si chiude
   prima di aprire il disegno, il percorso o il profilo.
2. **«Find friends» resta**, raggiungibile da «Find people to follow»;
   la scheda «People» della ricerca usa la stessa API (`findPeople`) e,
   senza account, porta alla quarta pagina come prima la lente.
3. **«Words» è `shape=word`** sul server: una corsa con una parola e
   senza forma. Le altre quattro categorie sono elenchi di forme del
   catalogo, decisi nell'app (`categories.ts`); ogni forma sta in una
   sola. **La risposta lo dichiara** (`words: true`, condizione del
   Coordinatore, come le schede di TASK-362): l'app offre «Words» solo
   dopo una risposta che lo dice. La ricerca di «Featured drawings» parte
   all'apertura, quindi la conferma arriva subito. Col server di prima,
   o senza account, «Words» non c'è: mai un «No drawings found» falso, e
   l'OTA non dipende dall'ordine col server.
4. **Gli esempi senza campi nuovi**: categoria dalla forma, posto dal
   nome della città, complessità dalla linea con la stessa formula del
   server (`drawingMatch.complexityOf`), popolarità dal punteggio;
   «Most recent» tiene l'ordine del Feed. `sampleFeed.json` non cambia.
5. **«Routes» sono gli esempi** (si aprono come percorso); «Drawings» i
   disegni dei membri e poi gli esempi; «All» anche i primi tre membri.
6. **Gli stati si ricavano**, non si impostano negli effetti: ogni
   risposta porta la chiave della ricerca a cui risponde, e una ricerca
   nuova mostra «loading» finché non arriva la sua (regola
   `react-hooks/set-state-in-effect`).
7. **Le animazioni dentro i `Modal` girano in JS** (`useNativeDriver:
   false`), come `SuperLikeSheet`: col driver nativo, su iOS con la nuova
   architettura, dentro un `Modal` non si muove niente.

**Conseguenze**: il server va aggiornato (`shape=word` e `words`,
nessuna migrazione) col sì dell'utente, in qualsiasi ordine con l'OTA:
fino ad allora «Words» non si vede. Impronta iOS invariata:
nessun file nativo, nessuna dipendenza.
## ADR-0301, aggiunta — Parte A app: come il compositore compone, ordina e manda

**Stato**: Accettata · 2026-11-04 · TASK-348, parte A app. Deciso
dall'agente su delega dell'utente, dentro le scelte già fatte dall'utente
(«Sì, i quattro», «Sì, spostabile», «Sì, appiattire», «10 col disegno»,
«Approvo così»).

**Decisione**:

1. **Il disegno dentro la foto è la linea, non la mappa**: nera sul giallo
   di MuW nei tre layout con il riquadro, gialla con un bordo scuro nella
   «Line on the photo», come il post condiviso (`PostImage`). Una mappa con
   le strade dentro la foto vorrebbe la WebView, che `view-shot` non
   fotografa con certezza. La linea è sempre quella tagliata del Feed
   (`withoutEnds`, 200 m per parte), con un test.
2. **La foto si compone appena si sceglie il layout**, non al tocco di
   «Save»: `ComposedPhoto` disegnata fuori dallo schermo a 288 punti e
   fotografata a 864 × 1080 px (4:5, il lato lungo che l'API tiene).
   «Save» resta immediato e la foto parte come ogni altra; se la foto non
   si compone, il modulo lo dice e la tiene com'era.
3. **Il layout si cambia finché la foto è nel modulo**: a fine corsa per
   tutte, in «My activities» per le foto aggiunte su quella scheda (l'app
   ne tiene l'originale finché la scheda è aperta). Dopo, la foto è quella
   pubblicata: per cambiarla si toglie e si rimette, come detto all'utente
   con la scelta «Sì, appiattire».
4. **L'ordine**: a fine corsa le foto prendono i posti 1… nell'ordine del
   post e l'ordine va solo se il disegno non è primo; in «My activities»
   l'ordine nomina i posti come sono. Sul telefono in
   `drawing-orders.json`, mandato dopo le foto (outbox e `choose`), con le
   stesse regole delle foto: solo mentre gli altri vedono il disegno, un
   409 aspetta, un 422 lo lascia andare. Toglie la corsa o l'account, va
   via con le foto.
5. **Riordino** con `PanResponder` e `Animated` di React Native (nessuna
   dipendenza nuova): si tiene premuto 250 ms e si trascina; VoiceOver ha
   «Move left» e «Move right». Le foto si contano tra le foto («Photo 2» è
   la seconda foto del post), non per posto.
6. **Nel Feed** le pagine seguono `order` (il disegno primo se manca); si
   carica la pagina vista e quella dopo, come prima. Il contatore «2/5» sta
   in alto a sinistra, perché in alto a destra c'è la figura piccola;
   VoiceOver non lo legge, come i puntini.
7. **Limite dell'app**: `DRAWING_MAX_PHOTOS` = 9 (10 pagine col disegno);
   l'API tiene 10 posti (`DRAWING_PHOTO_PLACES`). Il server ha la 0041 dal
   2026-11-03.

---

## ADR-0317 — Lo sci alpino in MuW: prima la giornata registrata, le forme solo dopo un prototipo

**Stato**: Proposto · 2026-11-04 · studio con misure (TASK-373,
`out/TASK-373/` del Mac). Scelta dell'utente lo stesso giorno: «A,
giornata registrata» (punto 1); B e C non si fanno ora. Le altre scelte
(domande 2–4 di `tasks/TASK-373.md`) sono ancora aperte

**Contesto**: l'utente vuole lo sport «Ski» (sci alpino). Le piste da
discesa di OSM (`piste:type=downhill`) si fanno solo in discesa e si
risale con gli impianti (`aerialway=*`). La struttura è quella della rete
`bike`, un grafo a sensi unici con il pezzo in cui ogni nodo si raggiunge
da ogni altro (ADR-0153). Misurato su Paganella, Campiglio–Pinzolo–
Folgarida e Sella Ronda: la rete c'è ed è coerente (pezzo utile di 35,
97,5 e 265,5 km di piste, con le stazioni collegate a piedi fino a 100 m e
il verso controllato sul terreno), ma il motore di oggi, su 19 richieste
(cerchio e cuore da 5 a 40 km), **non ne propone nessuna**: somiglianza
0,22–0,58 contro il minimo di 0,60, percorsi due-cinque volte più lunghi
del chiesto, il 27–43% della lunghezza sugli impianti, che sono linee
dritte attraverso la figura. Ogni lato di una forma dovrebbe essere una
discesa. TASK-372 (ADR-0316) trova lo stesso per lo sci di fondo.

**Decisione proposta**:

1. **Opzione A, adesso**: «Ski» è uno sport che si registra senza forma.
   «Draw» apre la registrazione libera; il riepilogo dà discese, km
   sciati, dislivello in discesa e velocità massima, con le risalite
   riconosciute (salita a velocità costante) e tratteggiate sulla mappa;
   Feed, video e Salute come le altre attività; gioco e concorsi non la
   contano. Un'attività nuova `skiing` nel contratto e nel database. 4–6
   sessioni, probabilmente in OTA.
2. **Opzione B, dopo e solo se un prototipo lo regge**: forme fatte di
   discese, con le risalite a penna alzata (come TASK-197). Prima un
   prototipo di soli motore (3–4 sessioni); se su tre comprensori almeno
   metà delle richieste non arriva a 0,60, ci si ferma. Tutto compreso
   12–18 sessioni.
3. **Opzione C («Soon») no da sola**: le build dello store non mostrano
   gli sport «Soon» (ADR-0278), quindi chi scia non la vedrebbe.
4. Il motore resta una libreria pura: con B la rete «piste» (comune con lo
   sci di fondo, TASK-372) entra come le altre (OSM e terreno da file),
   l'AI interpreta soltanto. Attività `skiing` e `xc_skiing` con una sola
   migrazione.
5. **Sicurezza**: mai un tratto fuori pista né una `freeride`; un livello
   si filtra sulla difficoltà di OSM, che torna col terreno (tratto più
   ripido: blu 19%, rosse 31%, nere 43% di mediana); OSM non sa se una
   pista è aperta, quindi A non propone piste e B direbbe sempre di
   verificarlo; nessuna guida a voce in discesa. Gli impianti in un
   percorso valgono come penna alzata, non come distanza.

**Conseguenze**: con A MuW in montagna è un registratore come gli altri,
con il video in 3D come pezzo distintivo, e arriva per la stagione
(dicembre–aprile). Nulla in OSM dice se una pista è aperta o adatta a chi
scia: nessuna opzione propone piste come «da fare». La scelta fra uno sport
o due con lo sci di fondo è dell'utente.

---

## ADR-0320 — Il registro degli sport: ogni sport nei suoi file, un banco di misura comune

**Stato**: Accettato · 2026-11-05, alla chiusura di TASK-376 (proposto il
2026-11-04) · TASK-376 (sessione «Coordinatore Sport»).
Le scelte tecniche sono dell'agente su delega dell'utente; il ridisegno
degli esempi (punto 3) vuole il sì dell'utente al momento del server, come
ogni aggiornamento

**Contesto**: l'utente vuole molti sport nuovi, aggiunti con più sessioni in
parallelo. Oggi uno sport tocca gli stessi file di tutti gli altri: nel
motore `models.py` (`SUPPORTED_ACTIVITIES`, `DISTANCE_LIMITS_M`,
`WATER_ACTIVITIES`) e `network.py` (`NETWORKS`, `FILTERS`, le regole di
foot e bike); nell'API `activity_graphs.py`, `activities.py`, `strava.py`,
`prefetch_zones.py`, `personal_bests.py`; in `shared-types` `index.ts`;
nell'app `settings/sport.ts` e una ventina di file con 53 confronti
`activity ===`/`sport ===` (pannello di Draw, distanze, schermata di corsa,
voce, penna alzata, Feed, importazione, Salute, zone sul telefono). Due
sport insieme sono due sessioni sugli stessi file. TASK-372 e TASK-373 hanno
anche mostrato che misurare la rete **prima** del codice risparmia lavoro:
ognuno ha scritto il suo banco.

L'impronta del motore (`route_store.engine_fingerprint`) è l'hash del
percorso relativo e del contenuto di ogni file `.py` e `.json` di
`route_engine/`: spostare codice da `network.py` a `networks/foot.py` la
cambia anche senza cambiare un solo percorso, e con lei tutti gli esempi
(8–16 ore di `draw_examples`) e le risposte dell'archivio.

**Decisione**:

1. **Un registro per strato, un file per sport.** Motore:
   `route_engine/networks/<rete>.py` (filtro Overpass, regole dei tag,
   sensi unici) e `route_engine/activities/<attività>.py` (rete o acqua,
   limiti di distanza, tipo GPX); `models.py` e `network.py` derivano dal
   registro gli stessi valori, nello stesso ordine. Contratto:
   `shared-types/src/sports/<attività>.ts`. API:
   `shaperoute_api/sports/<attività>.py` (Strava, zone in memoria, record).
   App: `src/sports/<sport>.ts` con un `SportProfile` (emoji, nome, attività,
   `ready`, `drawable` per «Record only», come si segue il percorso, ritmo o
   velocità, testo «… without a route», tipo di allenamento in Salute,
   codici FIT, etichetta del Feed, rete delle zone sul telefono); testi di
   ogni sport in file propri. I file condivisi restano elenchi di import,
   **una riga per sport**.
2. **Il refactor non cambia comportamento** e parte solo quando i lavori
   aperti sugli stessi file (TASK-371 A+B, TASK-375 A+B, TASK-323 C2) sono
   in `main`, in una sessione sola, con i file bloccati dal Coordinatore:
   test esistenti invariati, test di uguaglianza dei valori derivati,
   impronta iOS invariata, banco prima e dopo senza peggioramenti.
3. **L'impronta del motore: un ridisegno solo, insieme al primo sport.**
   Fra un'impronta che regga gli spostamenti (che la cambierebbe comunque
   una volta, e un'impronta sul comportamento rischia di non vedere un
   cambiamento vero e di servire percorsi vecchi) e un ridisegno accettato,
   si sceglie il ridisegno, ma **senza una notte in più**: il refactor del
   motore entra in `main` e il server si aggiorna solo insieme al motore
   del primo sport della fase 1 (Escursionismo o Gravel/MTB), che cambia
   l'impronta in ogni caso. Una notte di esempi, col sì dell'utente.
4. **Un banco comune**, `tools/sport_bench/`: per un'attività (o una rete
   non ancora registrata, `--loader FILE:FUNCTION`) su sei zone fisse
   (Trento, Valsugana, Milano, Val di Fiemme, Asiago, Pianura mantovana)
   misura la rete, le forme del catalogo (riuscite ≥ 0,60, buone ≥ 0,90) e
   i tempi; `compare` dice cosa è peggiorato fra due misure. Le misure di
   ogni sport stanno in `docs/sports/<sport>.md`, un file per sport, così
   nessuno scrive nel file di un altro; le scoperte comuni in
   `docs/sports/CONDIVISO.md`, che tiene solo il Coordinatore Sport. Sul Mac
   un banco alla volta, col turno del Coordinatore.
5. **Le righe di registrazione non le scrivono le sessioni degli sport**:
   le raccoglie il Coordinatore Sport in una PR di integrazione unica a fine
   fase, una alla volta e con i test.

**Conseguenze**: dopo la parte B uno sport nuovo è una manciata di file
nuovi più una riga per registro, e tre sessioni possono lavorarci insieme.
Il prezzo è un refactor ampio dell'app (circa venti file) in un momento in
cui nessun altro tocca quei file, e un aggiornamento del server rimandato
fino al primo sport nuovo. Il pilota della struttura non è la camminata
(già TASK-371 con la struttura di oggi), ma l'Escursionismo (TASK-377),
scelta dell'utente del 2026-11-04.

**Aggiornamento 2026-11-04 (parte B1, approvato dal Coordinatore): il punto
3 cambia.** Niente notte di esempi per uno spostamento: `route_store.py` ha
`SAME_ROUTES_AS`, {impronta del codice spostato: impronta di prima}, e
`engine_fingerprint` (anche quello degli esempi della canoa,
`paddle_examples.engine_fingerprint`) dà quella di prima, seguendo le righe
a catena. Una riga entra solo con la sua prova:
`services/api/tests/test_same_routes.py` disegna offline nove percorsi
fissi (corsa, bici, canoa, nuoto) e ne scrive l'hash del risultato intero
in `tests/fixtures/same_routes/<impronta>.json`; un test vieta una riga
senza le prove delle sue due impronte, fatte sulla stessa piattaforma, con
gli stessi hash, e un altro controlla che il motore di adesso disegni la
sua prova (solo sulla piattaforma della prova: il Mac arm64 e Linux in CI
disegnano alcuni di questi percorsi diversi nelle ultime cifre). Basta
perché uno spostamento di codice non cambia le operazioni in virgola
mobile: una differenza di piattaforma è la stessa prima e dopo, e la prova
su una piattaforma più il banco bastano. Non bastano per un cambiamento di
comportamento, che per questo non usa mai l'alias. In più il banco
su `main` e sul branch, `compare --same`, punto per punto. **Un cambiamento
di comportamento non usa mai `SAME_ROUTES_AS`**: i suoi percorsi si
ridisegnano, col sì dell'utente. Così il server si può aggiornare da `main`
quando serve. Il primo sport della fase 1 cambia l'impronta con il suo
codice nuovo: se può avere anche lui una riga (nessun percorso di prima
cambia) o se serve la notte di esempi, si decide allora col Coordinatore.

**Aggiornamento 2026-11-05, chiusura di TASK-376 (deciso dall'agente su
delega dell'utente, col Coordinatore).** Com'è andata rispetto alla
decisione:

- **Punto 1.** I registri ci sono nei quattro strati. Il profilo dell'app
  non ha `ready` né i testi: `ready` resta in `settings/sport.ts`, perché
  accendere uno sport è una scelta dell'utente presa lì. I testi restano
  nelle tabelle `i18n`, col file dello sport che tiene la chiave inglese
  (approvato in B3).
- **Punto 3.** Il primo sport della fase 1, Hike, ha tenuto le impronte con
  `SAME_ROUTES_AS` e la sua prova (precisazione di ADR-0321): nessuna notte
  di esempi finora.
- **Punto 5 non vale più.** Ogni sport scrive le sue righe di registro
  nella sua PR, con la lista dei file approvata prima dal Coordinatore:
  le PR per strato sono piccole, e una PR di integrazione a fine fase
  avrebbe tenuto fermi gli sport.
- **Il pilota** ha toccato file nuovi, righe di registro, i punti fissi e
  le liste dei test «di prima». Le sue deroghe ora sono passi di
  `docs/sports/COME-AGGIUNGERE.md`, segnati «(pilota)».
## ADR-0319 — Gli sport «Record only»: si registrano senza forma, il motore non li vede

**Stato**: Proposto · 2026-11-04 · TASK-375. Scelte dell'utente lo stesso
giorno: la categoria prima dello sci («Prima la categoria»), lo sci alpino
«Ski» ⛷️ separato dal fondo («Sì, separati»), tutte le metriche proposte
(«Sì, tutte»); per il fondo «Record only» anche lui (scelta in TASK-372)

**Contesto**: lo sci alpino (ADR-0317) e lo sci di fondo (TASK-372,
ADR-0316) non hanno forme da proporre: il motore di oggi non ne trova
nessuna sulle piste. Serve un modo di avere uno sport in MuW che si
registra e si pubblica senza passare dal Route Engine.

**Decisione** (il disegno tecnico è deciso dall'agente su delega
dell'utente):

1. Le attività senza forma hanno un tipo a parte in `shared-types`,
   `RECORD_ACTIVITIES` = `skiing`, `xc_skiing`; ciò che si salva è
   `RunActivity` = `ApiActivity | RecordActivity`. `Activity` e
   `ApiActivity` non cambiano, quindi il motore, la sua impronta e le
   tabelle chiavate sulle attività dei percorsi restano come sono.
2. Il server le salva come le altre corse: una migrazione sola, 0044, per
   tutte e due, sul CHECK di `runs` soltanto (preferiti e corse di gruppo
   tengono un percorso da rifare).
3. Nell'app uno sport `recordOnly` porta «Draw» alla registrazione libera
   (TASK-220); le metriche di fine giornata dipendono dallo sport.
4. Le risalite in impianto si riconoscono sul telefono; i nomi di impianti
   e piste li dà il server dalle linee di OSM, senza mandare la posizione a
   servizi esterni.
5. Niente moduli nativi: l'impronta iOS resta 6f8bba4c e tutto arriva con
   aggiornamenti OTA.
6. (B0, 2026-11-04, deciso dall'agente su delega dell'utente) Un disegno
   con un'attività che l'app non conosce si legge come senza attività: il
   campo cade dal corpo letto, il post si mostra come una corsa e la pagina
   resta intera. Prima una sola camminata o giornata di sci faceva rifiutare
   tutta la pagina del Feed, dei profili e della ricerca. I tipi di
   `shared-types` dei disegni restano `Activity`, cioè ciò che l'app sa
   mostrare: allargarli a `RunActivity` toccava sei file di altri task, e
   si fa con la parte che mostra lo sci (B2).
7. (B1, 2026-11-04, deciso dall'agente su delega dell'utente) «Ski» e
   «Cross-country ski» nascono `recordOnly` e `ready: false`, come la
   camminata prima del server: «Soon» in Expo Go e preview, assenti dalle
   build di negozio, finché il server non ha la 0044 e la giornata non ha
   le sue metriche (parte C). «Draw» di uno sport `recordOnly` è il solo
   «Record your day» giallo con la riga sotto; `ChooseScreen` legge lo
   sport da sé, così `App.tsx` non cambia. «Save» manda `skiing` o
   `xc_skiing` (`runActivityOf`); il file della corsa resta quello di
   oggi, e fino alla parte C i numeri sono quelli di una pedalata in
   discesa (km/h) e di una corsa sul fondo (passo). I disegni propri e la
   coda sul telefono tengono `skiing`, così cambiare chi li vede non li fa
   diventare corse. In Apple Salute vanno come `downhillSkiing` (61) e
   `crossCountrySkiing` (60), con la sola distanza totale: le loro distanze
   giornaliere sarebbero un permesso nuovo da chiedere. In Health Connect
   vanno tutti e due come `SKIING` (61), con la distanza. Le calorie non ci
   sono, finché manca una stima.
8. (B2, 2026-11-04; la scelta di prodotto è dell'utente, «Sì, così», il
   modo è deciso dall'agente su delega dell'utente) Ogni lettore dei
   disegni conosce la neve, e l'attività di `Drawing` e `DrawingDetail` è
   `RunActivity`; un'attività che l'app non conosce cade ancora come in
   B0. Una regola sola, `activities/snow.ts` (`isOnSnow`, `routeActivity`),
   toglie alla neve ciò che si fa con un percorso: «Start» e «Send to a
   friend» (`runnable`), «Draw it near me» e «Edit the drawing». Toglie
   anche le calorie stimate. La scheda dice il nome dello sport; un filtro
   per attività della ricerca la lascia fuori, perché nessun filtro di oggi
   è la neve. L'export GPX resta, perché non era tra le azioni escluse.
   `App.tsx` non cambia: `followedOf` non dà mai alla neve l'attività di
   un percorso.
9. (C1, 2026-11-05; i testi sono dell'utente, «Sì, approvati», il modo è
   deciso dall'agente su delega dell'utente) La giornata di sci si legge
   sul telefono, in `activities/snowDay.ts`, dalla traccia con ora e
   altitudine di ogni punto. La traccia si divide dove l'altezza, dopo
   essere andata in un verso, torna indietro di 10 m. Un tratto che sale è
   un impianto se dura almeno un minuto, sale almeno 0,3 m al secondo (più
   di chi sale a piedi o con le pelli) e ha almeno il 60% dei passi vicino
   alla sua velocità solita. Quello che sta fra due impianti è una discesa
   se scende almeno 30 m. La velocità massima tiene almeno 5 secondi e
   ignora ciò che supera i 200 km/h, cioè i salti del GPS. Senza altezze i
   km sono quelli di tutta la giornata, e discese, dislivello e risalite
   restano «–». Le soglie sono una prima stima, da tarare su tracce vere
   prima della stagione (parte E). Il fondo usa i numeri di una corsa,
   senza le calorie. `FreeFinishCard` sceglie la scheda dallo sport di
   «Settings»; `App.tsx` non cambia.
10. (C2, 2026-11-05; il testo è dell'utente, approvato con gli altri della
    parte C con «Sì, approvati», il modo è deciso dall'agente su delega
    dell'utente) Sulla mappa di fine giornata di sci la traccia si taglia
    agli impianti trovati da `snowDay`. Ciò che è stato sciato resta la
    linea bianca piena di una corsa; le risalite sono la stessa linea,
    tratteggiata come i tratti in bici a piedi (`onFoot.dash`): nessun
    colore nuovo. `snowLiftsOf` le dà solo per lo sci alpino e solo se ce
    ne sono; il fondo e gli altri sport restano una linea sola. Il banner
    dello sci dice «White: your descents. Dashed: the lifts.» anche in una
    giornata senza impianti trovati, perché non conosce la traccia: è un
    caso raro, e non mostra niente di sbagliato. In `App.tsx` ci sono solo
    il campo `lifts` di `FreeFinished` e il prop di `MapView`.
11. (D1, 2026-11-05; le scelte sono dell'utente: «Nel post, per tutti» e
    «Tutte le Alpi»; il modo è deciso dall'agente su delega dell'utente) I
    nomi di impianti e piste vengono dagli estratti Geofabrik di Italia,
    Austria, Svizzera, Francia, Germania e Slovenia, non da Overpass
    (ADR-0154). Il filtro è `osmium tags-filter w/aerialway
    nwr/piste:type=downhill`. `ski_extract.py` scrive le linee in riquadri
    di 0,25° in `cache/ski/`, uniti estratto dopo estratto, così un
    impianto di confine resta uno solo. `ski_names.py` confronta la traccia
    con quelle linee, in metri, sul server:
    - **una risalita** è un tratto entro 30 m da un impianto che lo percorre
      dal basso in alto, come OSM disegna gli impianti, per almeno il 60%
      della sua lunghezza. Fra due impianti vicini la prende il più vicino;
      un impianto con stazione intermedia conta una sola volta;
    - **una pista** si conta dopo 150 m fuori dagli impianti, entro 30 m da
      una pista con quel nome. Una pista fatta di più vie è un nome solo, e
      tre punti di GPS lontani non la spezzano;
    - **senza nome:** le piste senza nome non si contano; gli impianti senza
      nome restano, con il loro tipo.

    Una giornata di 8.000 punti contro 2.000 linee richiede 0,19 s: con D2
    il risultato si scrive una volta in `runs` (migrazione 0048, riservata),
    invece di ricalcolarlo a ogni lettura del Feed.
12. (D2, 2026-11-05; il modo è deciso dall'agente su delega dell'utente, la
    rotta a parte d'accordo con il Coordinatore) I nomi si scrivono in
    `runs.ski_names` (0048) quando si salva una giornata `skiing`, e una
    volta sola: i riquadri nuovi non cambiano le giornate già salvate. Gli
    impianti senza nome non si scrivono.

    Il post li dà con una rotta sua, `GET /drawings/{id}/ski-names`, e non
    con un campo del dettaglio. Così `DrawingDetail`, la sua fixture e la
    decina di test dell'app che la leggono restano come sono, e
    `drawings.py` non si tocca. La rotta vede ciò che vede il dettaglio: chi
    può aprire il post (`drawing_seen_sql`) e solo un'app che legge lo sci
    (`X-MuW-Reads`, ADR-0328); negli altri casi risponde `404`. Un'altra
    attività e una giornata senza nomi danno due elenchi vuoti. Il server
    trova i riquadri nella sua cache (`install_ski_names` in
    `__main__.py`); senza i riquadri, la giornata si salva senza nomi.
13. (D3, 2026-11-05; i testi e la riga della privacy sono dell'utente,
    approvati con «Sì, approvati» e «Sì, approvata», il modo è deciso
    dall'agente su delega dell'utente) Il post di una giornata di sci
    (`skiing`) chiede i nomi quando si apre, e li mostra sotto la
    descrizione e i tag: il titolo «Lifts and pistes», poi una riga
    «{name} ×{times}» per ogni impianto e per ogni pista. VoiceOver legge
    «{name}, {times} times» oppure «{name}, once», perché «×» non si legge
    «volte».

    Mentre i nomi arrivano non si vede niente, e niente si vede neanche in
    una giornata senza nomi o se la rete non risponde: un elenco vuoto o un
    errore non dicono niente a chi guarda. Il fondo e gli altri sport non
    chiedono niente. La richiesta passa dalla porta dei post
    (`skiNamesOf`), l'unico punto che ha l'account dentro la scheda, così
    `App.tsx` resta com'è.

    La riga della privacy approvata chiude la sezione sulle corse e le
    tracce GPS, nell'app e nelle pagine del sito, che si rigenerano da lì.

**Conseguenze**: un altro sport senza forma (una camminata in montagna, lo
scialpinismo) costa una riga in `RECORD_ACTIVITIES`, una migrazione e i
testi. La neve buona e le recensioni dei comprensori non sono in questa
decisione: si chiedono all'utente più avanti, una alla volta.
## ADR-0316 — Lo sci di fondo senza rete propria: le piste non disegnano forme, lo sport va in «Record only»

**Stato**: Accettato · 2026-11-04 · TASK-372. La richiesta è dell'utente; i
numeri vengono dal Coordinatore. La scelta di prodotto («Sì, Record only») è
dell'utente; il benchmark e il modo di dividere il lavoro con TASK-375 sono
decisi dall'agente su delega dell'utente.

**Contesto**: l'utente voleva lo sport «Cross-country ski» sul modello della
bici (ADR-0153). La rete sarebbe stata `nordic`: le vie OSM con
`piste:type=nordic` e le relazioni `route=piste`, `piste:oneway` rispettato,
niente strade normali. Prima del codice un benchmark su Val di Fiemme, Asiago
e Dobbiaco (`tasks/TASK-372.md`):
- la rete c'è: 81–178 km di pista, pezzo connesso più grande di 54–65 km;
- il motore di oggi però non disegna forme. Su 45 richieste (cerchio, cuore e
  stella da 3 a 20 km, piste nei due sensi) nessuna arriva a 0,90 e sei
  superano 0,60, irriconoscibili; il cerchio resta sotto 0,49;
- le forme piccole non vanno meglio: le piste sono lunghe e seguono la valle,
  con pochi incroci vicini.

Lo sci alpino trova lo stesso (ADR-0317).

**Decisione**:

1. **Nessuna rete `nordic` nel motore**, né un filtro delle piste: il
   motore e la sua impronta non cambiano.
2. **Lo sci di fondo è uno sport che si registra senza forma**, nella
   categoria «Record only» di TASK-375 (ADR-0319), come lo sci alpino.
3. **L'attività `xc_skiing`** entra nel contratto, nell'API e nei vincoli del
   database insieme a `skiing`, con TASK-375 e una sola migrazione (la 0044):
   quei file hanno un solo padrone.
4. Se un giorno si faranno le forme sulle piste, sarà con una rete «piste»
   unica per i due sci (ADR-0317 punto 4), dopo un prototipo che le regga.

**Conseguenze**:
- Chi fa fondo registra l'uscita come le altre attività, senza un percorso
  proposto.
- OSM non dice se una pista è battuta o aperta: MuW non propone piste da fare.
- Stagione ed estate restano scelte dell'utente, in TASK-375.

---

## ADR-0194, precisazione — Il post da condividere legge i margini veri del telefono

**Stato**: Attiva · 2026-11-04 · deciso dall'agente su delega dell'utente
(TASK-381). Dalla #700 «Share» sulla card del Feed apre il post da una pagina
del `Pager`, e «Close» finiva sotto l'orologio. Come per il regolamento
(ADR-0260, precisazione) e la tavola del contorno (ADR-0074, precisazione), il
`Modal` di `SharePost` tiene un suo `SafeAreaProvider` con
`initialWindowMetrics`, per ogni punto da cui si apre. Scartato: far passare
il margine da `ActionBar`, che lascerebbe il difetto al prossimo che apre il
post da un'altra pagina, e cambiare il `Pager`.

---

## ADR-0327 — «Gym»: una sessione senza traccia, le serie sul server, i post senza linea solo a chi li sa leggere

**Stato**: Proposto · 2026-11-04 · TASK-385. Richiesta dell'utente del
2026-11-04; numeri dal Coordinatore. Le scelte di prodotto sono
dell'utente, una alla volta, in `tasks/TASK-385.md`; i punti tecnici qui
sotto sono decisi dall'agente su delega dell'utente. Usa ADR-0319 (Record
only), ADR-0318 (calorie), ADR-0301 (composer), ADR-0281 (Salute), ADR-0320
(registro degli sport).

**Contesto**: la palestra non ha posizioni. Il server vuole una traccia per
ogni corsa (`runs.track NOT NULL`) e per ogni disegno visibile; le app di oggi
rifiutano una pagina del Feed, del profilo o della ricerca se un solo post
non ha `track_preview`. «Record only» registra col GPS. L'utente vuole anche
esercizi e serie, traguardi che sbloccano figure, una classifica mensile, un
timer di recupero e il video della serie.

**Decisione**:

1. **Un'attività `gym`**, in un gruppo nuovo `TRACKLESS_ACTIVITIES`, dentro
   `RunActivity`; `Activity` e `ApiActivity` non cambiano. Il motore e la
   sua impronta non la vedono: niente banco, niente rete.
2. **Database, una migrazione** (numero dal Coordinatore al merge):
   `gym` nel CHECK di `runs`; `runs.track` facoltativa solo per le attività
   senza traccia (`track IS NOT NULL OR activity = 'gym'`); il CHECK dei
   disegni accetta un post senza traccia solo se la sua corsa non ne ha;
   una tabella nuova `gym_sets` (corsa, posto, esercizio del catalogo o nome
   libero, tipo, ripetizioni, peso in kg, secondi, metri, velocità,
   pendenza, livello, piani, ora, `live`). `favorites` e `group_runs` no.
3. **I post senza traccia solo a chi li sa leggere**: ogni risposta con
   disegni (Feed, profilo, ricerca, dettaglio, messaggi, condivisione) li
   lascia fuori se la richiesta non porta l'header `X-MuW-Reads:
   trackless`; il dettaglio senza header è 404. Le app di oggi non li
   ricevono mai, qualunque sia l'ordine degli aggiornamenti. L'ordine resta
   comunque: prima l'OTA che legge (B0), poi quello che salva (B).
4. **Fuori per costruzione**: record personali, gioco delle forme e
   concorsi di disegno, km e dislivello del profilo (0 m), GPX, Strava,
   video della corsa, «Draw it near me», «Start», «Edit the drawing».
5. **Sul telefono**: «Gym» nel registro degli sport (TASK-376 B3) con
   `trackless`, `ready: false` finché server e B0 non ci sono. Il tempo è
   inizio, pause e fine in un file: nessun GPS, nessun permesso di posizione,
   nessuna modalità in background. Il catalogo (91 esercizi, quattro tipi di
   serie, scale e tetti) sta in un file TypeScript puro e testato, specchio di
   `docs/sports/gym.md`; il server tiene la stessa tabella delle scale e dei
   tetti per traguardi e classifica, con un test che confronta le due.
6. **Timer di recupero solo JS**: lo stato è l'ora di fine; ad app aperta
   vibrazione (`expo-haptics`) e un suono breve (`expo-audio`, file
   nell'app); in background una notifica locale programmata
   (`expo-notifications`, trigger a intervallo, suono di sistema), tolta se
   il recupero cambia o finisce prima; schermo acceso con `expo-keep-awake`.
   Sono tutti moduli della build 1.0.1: impronta iOS 6f8bba4c invariata.
7. **Calorie** (energia attiva, ADR-0318): i blocchi cardio con la formula
   della loro macchina (ACSM per il tapis roulant, MET del Compendium 2024
   per le altre), il resto del tempo col MET del Compendium per i pesi.
   Quel MET è la media di una sessione con i recuperi dentro: i recuperi non
   si contano a parte a 1 MET, che li toglierebbe due volte (correzione della
   formulazione mostrata all'utente nella domanda sui recuperi). Col battito
   a sessione finita, Keytel 2005 se ci sono sesso, età e peso; altrimenti
   MET. Le kcal dei post altrui restano a 70 kg.
8. **Salute**: HealthKit `.traditionalStrengthTraining`, Health Connect
   `EXERCISE_TYPE_STRENGTH_TRAINING` (i numeri si verificano sulle librerie
   nella parte C), senza percorso né distanza, con l'energia attiva e la
   chiave di sincronizzazione di ADR-0281. Nessun permesso nuovo. Se in
   Salute c'è già un allenamento di forza di un'altra app nella stessa
   finestra (l'orologio), il telefono non lo riscrive.
9. **Traguardi e classifica dal server**, dalle serie salvate: per ogni
   esercizio del catalogo il miglior valore del suo tipo, sotto il tetto.
   La classifica è del mese di calendario, conta solo serie `live` di
   sessioni pubblicate e visibili a tutti (come i concorsi), una riga per
   persona; una riga segnalata e tolta dalla moderazione non conta. Il primo
   del mese prende «Winner» (`CONCORSI.md`).
10. **Battito in tempo reale e video della serie sono della 1.0.2**: il primo
    vuole codice nativo per l'orologio (con TASK-345 C e la build), il secondo
    `expo-video` (TASK-348 C / TASK-336). La scritta di esercizio e carico
    sul video la disegna l'app sopra il lettore; dentro il file solo con il
    modulo di esportazione di ADR-0301.

**Alternative scartate**: una traccia finta di un punto per la palestra
(dati falsi in Salute e nel profilo); allargare `isDrawing` e contare sul
solo ordine degli OTA (chi non aggiorna perderebbe il Feed intero); mettere
`gym` in `RECORD_ACTIVITIES` (lì si registra col GPS); esercizi solo sul
telefono (persi cambiando telefono, niente traguardi né classifica);
contare i recuperi a 1 MET.

**Conseguenze**: un'attività che il server salva senza traccia e una
tabella nuova; l'API cambia comportamento solo per chi manda l'header.
Testi nuovi in cinque lingue (interfaccia, 91 esercizi, sette figure), una
riga della privacy per esercizi e classifica. Il codice parte dopo la #758 e
TASK-376 B2 e B3, con le righe di registrazione raccolte dal Coordinatore
Sport. Server, migrazione e OTA di produzione col sì dell'utente.
## ADR-0318, precisazione — «bpm» sta dentro il riquadro anche nelle zone del battito

**Stato**: Attiva · 2026-11-04 · scelta dell'utente («Sì, task a parte»,
dopo «Dentro il riquadro» di TASK-383), il resto deciso dall'agente su delega
dell'utente (TASK-386). Nella pagina «Heart rate zones» «bpm» stava a destra
di ogni casella, piccolo e grigio. Ora sta dentro il riquadro, dopo il numero
e nella sua stessa dimensione, come «kg» e «cm» in «Body»: in «Max heart
rate», «Resting heart rate» e nel limite alto delle zone 1–4. Il riquadro è un
`Pressable` e un tocco ovunque, anche su «bpm», apre la tastiera del campo. Il
limite della zona 5, che non si scrive, resta senza riquadro, ma il numero e
«bpm» stanno allo stesso posto delle caselle sopra (un margine pari al bordo
che manca). Scartati: un riquadro anche sulla zona 5, che sembrerebbe da
scrivere, e per ora un componente comune con `NumberInput` di «Body», che è di
TASK-383 finché #759 non è in `main`.

---

## ADR-0318, precisazione — L'unità di peso e altezza sta dentro il riquadro

**Stato**: Attiva · 2026-11-04 · scelta dell'utente («Dentro il riquadro»),
il resto deciso dall'agente su delega dell'utente (TASK-383). In «Body»
l'unità stava a destra del riquadro, piccola e grigia, e sul telefono non si
notava. Ora «kg» e «cm» (con le miglia «lb», «ft» e «in») stanno dentro il
riquadro, dopo il numero e nella sua stessa dimensione; il riquadro è un
`Pressable` e un tocco ovunque, anche sull'unità, apre la tastiera del campo.
I valori restano in kg e cm (punto 10). Scartati: l'unità nel nome del campo
(«Weight (kg)»), che con le miglia cambia il nome, e un segnaposto, che sparisce
appena si scrive.

---

## ADR-0326 — «MuW Style»: post nostri con immagini AI e tag affiliati, fuori da `GET /feed`

**Stato**: Accettata · 2026-11-04 · TASK-384 («Sì, approvo» dell'utente
sulla proposta). Le scelte di prodotto sono
dell'utente (tema, frequenza, strumento, partenza prima della società:
`tasks/TASK-384.md`); il come è deciso dall'agente su delega dell'utente.
Numeri dal Coordinatore.

**Contesto**: l'utente vuole nel Feed post di MuW con modelli generati dall'AI
in outfit sportivi e tag che portano a comprare i capi con link affiliati.
Un post del Feed è un `drawings` su un `runs`, con un utente e dei tempi; i
percorsi di MuW (ADR-0310) stanno già fuori da `GET /feed`. Termini e Privacy
oggi dicono che MuW non mostra pubblicità (TASK-267).

**Decisione**:

1. **Tabelle proprie**, `style_posts`, `post_product_tags` e
   `product_tag_clicks`, e un endpoint proprio, `GET /style`: `GET /feed` e
   `drawings` non cambiano, un'app già pubblicata non vede niente di nuovo.
2. **Le etichette «AI-generated» e «Affiliate links» sono fisse sul post**, e
   la scheda del tag dice che il capo nella foto è simile, non il prodotto:
   AI Act art. 50, pubblicità riconoscibile, niente pratica ingannevole.
3. **I clic si contano per giorno e per tag**, senza utente, IP o
   identificativo: niente tracciamento, niente ATT, nessun dato nuovo
   nell'App Privacy.
4. **Uscita a data** (`publish_at`, 2–3 al giorno) e **controllo dei link**
   prima dell'uscita, dal feed prodotti del programma affiliato quando c'è;
   un tag senza prodotto si spegne, un post senza tag non esce.
5. **Le immagini si generano da testo**, con persone inventate e capi senza
   loghi; nessuna foto dei negozi, nemmeno come riferimento.
6. **Nel Feed al massimo 1 su 8, solo «All»**, con un interruttore per
   toglierli e la lente «Style».

**Scartato**: un account MuW con post `drawings` finti (vorrebbe corse e tempi
inventati, come in ADR-0310); scaricare le foto di Zalando (diritti del
negozio, e l'utente l'ha escluso); contare i clic per utente (tracciamento,
consenso, App Privacy).

**Conseguenze**:
- Servono testi legali nuovi e le dichiarazioni negli store prima della
  prima build con Style.
- Il catalogo preparato invecchia in giorni: prezzi e disponibilità vanno
  riletti prima di ogni uscita.
## ADR-0323 — Lo swipe fra le schede: le pagine si scorrono anche con la barra in basso

**Stato**: Proposta · 2026-11-04 · TASK-379. La richiesta è dell'utente
(2026-11-04); numeri dal Coordinatore. Le scelte di prodotto sono
dell'utente, in `tasks/TASK-379.md`; il resto è deciso dall'agente su delega
dell'utente. **Corregge il punto 3 di ADR-0311** («niente swipe fra le
pagine»); il resto di ADR-0311 resta.

**Contesto**: con TASK-367 parte A le pagine sono sotto una barra di schede e
si cambiano solo toccandola. L'utente vuole anche «poter swippare da una
scheda all'altra slidando verso destra e sinistra con il dito», come si
faceva con le pagine affiancate di TASK-154 (ADR-0124).

**Decisione** (proposta):

1. Uno swipe orizzontale sulla pagina porta alla scheda accanto, e la barra
   segue; il tocco sulla barra resta e mostra la pagina subito. Le scelte
   dell'utente: la pagina **segue il dito**, con le pagine affiancate
   («Segue il dito»); dal profilo si va al Feed e dal Feed al profilo, **in
   giro continuo** («Torna alla prima»); vale su **tutte e cinque** le schede
   («Tutte e cinque»).
2. Nessuna dipendenza nativa: React Native di base, come il `Pager` di
   TASK-154. L'impronta iOS non cambia e arriva con un OTA.
3. Un gesto che parte su un carosello o su una fila di schede resta suo. Dentro
   le pagine non c'è una mappa da trascinare: le mappe di Feed, Explore e
   Profilo sono immagini, e la mappa vera prende lo schermo senza barra.
4. Resta tutto quello che fa `TabShell`: pagine costruite al primo arrivo e
   tenute, tocco sulla scheda attiva che torna in cima, «indietro» di Android,
   il giro guidato, VoiceOver con le schede `tab` e lo stato `selected`.

**Conseguenze**: chi aveva imparato lo swipe prima di TASK-367 lo ritrova.
La Guida non cambia: «tocca una scheda per andarci» resta vero. Android si
prova solo con i test.

**Scelte tecniche** (2026-11-04, decise dall'agente su delega dell'utente):

- Lo `ScrollView` orizzontale a pagine di React Native, come il `Pager` di
  TASK-154: uno scroll orizzontale dentro una pagina si tiene il dito che parte
  su di lui (UIKit lo dà alla vista più interna, e una che rimbalza lo tiene
  anche ai bordi). Scartato `PanResponder` con `Animated`: con Fabric uno
  `ScrollView` interno scorre anche quando il responder JS è un genitore, e le
  due cose si muoverebbero insieme.
- Il giro senza salti: le pagine stanno su una striscia di 2000 posti larghi
  uno schermo (`tabs/tabStrip.ts`). La pagina sullo schermo ha un posto e le due
  vicine quelli ai lati; una pagina cambia posto solo fuori vista, così lo
  scroll non torna mai indietro. Mille swipe nella stessa direzione prima di un
  capo, dove lo swipe si ferma; non di più, perché il layout conta in float a
  32 bit.
- Tocco sulla barra, giro guidato, «indietro» di Android, e il profilo al posto
  di «Messages» senza account: la pagina arriva subito dove sta la striscia,
  senza scorrere su quelle in mezzo e senza costruirle. La barra cambia quando
  lo swipe si ferma.
- Una pagina pigra si costruisce ai primi pixel che entrano nello schermo, come
  nel `Pager`: «Explore» e il profilo, la prima volta, entrano vuoti per un
  attimo.
- Con VoiceOver o TalkBack acceso lo swipe è spento: tre dita direbbero
  «pagina 1001 di 2000». Le schede restano `tab` con lo stato `selected`.
- `scrollsToTop={false}` sulla striscia: il tocco sull'orologio va allo scroll
  della pagina.
- Il limite: una seconda scivolata veloce mentre una fila rimbalza ancora alla
  fine passa alla pagina accanto (UIKit). Toglierlo vorrebbe cambiare le file;
  `tabs/TabSwipeOwners.test.ts` controlla che ogni scroll orizzontale rimbalzi.

### Precisazione — TASK-391 (2026-11-05)

**Deciso dall'agente su delega dell'utente**, numero dal Coordinatore. Una
pagina che lo swipe porta sullo schermo non si ricostruisce più quando lo
swipe si ferma: la si è vista scorrere intera e deve restare così.
«Messages» rilegge la lista sul posto, tenendo quella vecchia finché arriva
la nuova; il profilo si ricostruisce quando lascia lo schermo per un'altra
scheda, fuori vista, e al ritorno da una sua pagina aperta sopra l'app come
prima. Scartato: rileggere sul posto anche il profilo, che vorrebbe cambiare
`useOwnProfile`, le liste di chi segue e la galleria; il prezzo della scelta
è che un follow fatto su un'altra scheda si vede nei numeri del profilo alla
visita dopo.

---

## ADR-0326, precisazione — L'API di MuW Style (TASK-384 parte A)

**Stato**: Attiva · 2026-11-04 · deciso dall'agente su delega dell'utente,
dentro la proposta approvata; migrazione e righe condivise col via del
Coordinatore.

1. **I post entrano solo con `style_import.py`**, da un file con i campi
   esatti e una foto JPEG: nessun endpoint scrive un post. Un post caricato
   non si sovrascrive; si nasconde.
2. **Il link affiliato si fa a ogni «Shop»** dalla pagina del negozio
   tenuta nella riga: cambiare programma o ID è cambiare `.env`, non le
   righe. La pagina deve essere di un sito del negozio, così una riga
   sbagliata non manda il telefono altrove.
3. **«Shop» è un `POST` che risponde il link**: lo stesso tocco conta e dà
   l'indirizzo, e l'elenco dei post non porta link che l'app potrebbe aprire
   senza contare.
4. **Un limite per indirizzo solo in memoria** (120 tocchi l'ora) tiene i
   conteggi puliti senza scrivere l'indirizzo, come per «Send feedback».
5. **Le foto in `data/media/style`**, sotto il `--media-dir` di sempre
   (ADR-0289): non sono nelle copie del database, e si rigenerano dai
   prompt.

Scartato: un endpoint di amministrazione per caricare i post (una
superficie in più sul server pubblico per una cosa che si fa a mano e di
rado); il link affiliato scritto nella riga (legato all'ID di oggi).
## ADR-0329 — I movimenti come iOS: molle condivise con un rimbalzo appena percettibile

**Stato**: Proposta · 2026-11-04 · TASK-388. Il brief è dell'utente
(2026-11-04): movimenti «fluidi ed eleganti, nello stile Apple (Dynamic
Island, molle naturali, niente effetti da cartone animato)»; numeri dal
Coordinatore. Le scelte tecniche qui sotto sono decise dall'agente su delega
dell'utente; l'aspetto lo approva l'utente sui video, prima di ogni merge.
**Aggiorna il punto 4 di ADR-0293** («Mai rimbalzi») solo per i movimenti:
il resto di ADR-0293 resta.

**Contesto**: ADR-0293 aveva dato all'app movimenti brevi su curve fisse
(`Animated.timing`). Una curva fissa non si lascia interrompere bene e non
ha l'assestamento che su iOS dice «questa cosa ha un peso». Il brief chiede
molle «con un rimbalzo appena percettibile, mai elastiche», senza dipendenze
nuove: `react-native-reanimated` cambierebbe l'impronta iOS e fermerebbe gli
OTA.

**Decisione** (proposta):

1. **Tre molle con un nome** in `motion.spring` (`tokens.ts`), massa 1, nelle
   misure di SwiftUI (risposta = 2π/√rigidità, frazione di smorzamento =
   smorzamento/(2√rigidità)):
   - `snappy` (270/25): risposta ~0,38 s, oltre il segno ~2,5%. Un
     controllo lasciato, la capsula della barra, un'icona che prende la
     scheda.
   - `smooth` (170/24): ~0,48 s, oltre il segno meno dello 0,1%. Fogli e
     pagine (parte C).
   - `island` (160/20): ~0,5 s, ~1,7%. L'«isola» (parte B).
   Nessuna schermata scrive i suoi numeri: passano tutte da `src/ui/motion.ts`
   (`springTo`, `fadeTo`), che le mette sul driver nativo. Un test controlla
   che ognuna risponda in 0,35–0,5 s e superi il segno al massimo del 3%.
2. **Solo `transform` e `opacity`, sul driver nativo** (`Animated` di React
   Native): niente larghezze, altezze o posizioni animate sul thread JS.
   L'allungamento della capsula è un `scaleX`.
3. **Ogni movimento si interrompe**: una molla avviata su un valore che si
   muove riparte da dov'è, con la sua velocità. Un tocco a metà corsa non
   salta.
4. **«Riduci movimento»** (`useReduceMotion`): nessuna molla e nessuno
   spostamento; restano dissolvenze brevi (`fadeTo`, `motion.pressMs`). `Tap`
   resta una `Pressable` che si scurisce sotto il dito, come con ADR-0293.
5. **`Tap`**: premuto scende come prima in `pressMs` con la curva; lasciato
   torna con `snappy`, appena oltre la sua misura. La luce non va mai oltre
   il pieno (opacità limitata a 1). `Tap` prende `pressScale`: le icone della
   barra scendono a 0,88, il resto dell'app resta a `motion.pressScale`.
6. **La barra in basso**: una capsula morbida (`color.surfaceRaised`, 56×34,
   raggio pieno) dietro la scheda attiva scivola alla nuova con `snappy` e si
   allunga a metà corsa (8% per scheda attraversata, al massimo 20%), come
   una goccia. Con lo swipe di TASK-379 segue la posizione del dito (prop
   `drag`: `TabShell` la mette dal suo `onScroll`, già in JS ogni 16 ms, in
   pagine dalla pagina dell'app contate da quella che la striscia ha sullo
   schermo, col giro più vicino all'ultimo valore, così anche più swipe di
   fila senza fermarsi vanno avanti; un `Animated.event` sul driver nativo
   è scartato perché `TabBar` deve leggere `drag` da JS); una pagina arrivata col
   dito trova la capsula già lì, e non parte nessuna molla. Nel giro dal
   profilo al Feed una seconda capsula, a una barra di distanza, entra da
   sinistra mentre la prima esce a destra. L'icona che prende la scheda sale
   di 1,5 pt e passa dal contorno al pieno in dissolvenza incrociata.
7. **La vibrazione**: `selectionFeel()` (TASK-361, `selectionAsync`) solo
   quando un tocco cambia scheda, non sulla scheda già attiva né allo swipe
   (iOS non vibra scorrendo le pagine). Senza `expo-haptics` nella build non
   succede niente: nessuna dipendenza nuova, l'impronta non cambia.
8. **I test vedono le molle**: sotto jest il driver nativo è uno stub che non
   muove niente; `src/ui/animationsOnJs.testing.ts` fa girare le stesse
   animazioni su JS, fotogramma per fotogramma con i timer finti, ancora
   chieste con `useNativeDriver: true`.

**Alternative scartate**: Reanimated (impronta nuova, build nativa, niente
OTA); molle diverse per ogni schermata (è il modo in cui un'app smette di
sembrare una sola); `Animated.timing` con una curva che rimbalza (non si
interrompe con la velocità).

**Conseguenze**: tutta l'app risponde al dito con la stessa molla. `releaseMs`
resta in `motion` finché le PR aperte che lo leggono sono in `main`; poi va
tolto. Le parti B (l'«isola») e C (fogli, `Modal`, liste) usano `island` e
`smooth`.

**Aggiornamento A2 (2026-11-05, deciso dall'agente su delega dell'utente)**:
l'utente ha provato la parte A sul telefono (anteprima 0fd6c1dc): «funziona
[…] è un po' macchinosa rendila più fluida». Nel simulatore la capsula partiva
solo nel commit della pagina nuova, cioè dopo che JS l'aveva costruita (Feed,
Explore: decimi di secondo), e poi faceva due rimbalzi, quello di `snappy` e
quello dell'allungamento. Ora:
1. **La barra ha la sua molla, `glide`** (rigidità 256, smorzamento 32,
   risposta ~0,39 s): smorzata criticamente, non passa mai il segno. Anche le
   icone e il loro ritorno dopo il tocco (`Tap` con `settle`). Niente più
   allungamento: un solo movimento. `snappy` resta per il resto dell'app.
2. **Capsula e icona partono al tocco**, prima di `onTab`. Su iOS
   `startAnimatingNode` va subito al thread UI (`queueFlushedOperationBlock`),
   e in bridgeless `setImmediate` è una microtask messa in coda prima di
   quella di React: la molla corre mentre JS costruisce la pagina. Se l'app
   tiene la sua pagina («Messages» senza account, dal profilo) la capsula
   torna indietro al primo giro dei timer.
3. **Un tocco durante uno swipe**: la capsula parte da dove il dito l'ha
   lasciata, e `TabShell` tiene `drag` a 0 finché un dito non riprende la
   striscia, così il resto dello scorrimento non la sposta.
Impronta iOS invariata (6f8bba4c), nessuna dipendenza.

**Parte B, l'isola (2026-11-05, deciso dall'agente su delega dell'utente)**:
1. **Solo `scaleX`/`scaleY` e opacità** su una sola capsula (`color.scrim`,
   parole in `onScrim`: scura in tutti e due i temi, come quella di iOS).
   Nasce al 30% della larghezza e al 75% dell'altezza; ogni passo parte 120
   ms dopo il precedente (larghezza, altezza, parole), tutto sulla molla
   `island`; resta 1,8 s, poi si chiude nell'ordine inverso. Le molle non
   aspettano la fine della precedente: in sequenza la coda di ognuna
   rallenterebbe tutto.
2. **Qualcosa di nuovo detto mentre è aperta** cambia le parole e fa
   ripartire il tempo, senza chiudere e riaprire: le molle partono da dove
   sono.
3. **Un solo punto, scelto dall'agente**: «Sent to {name}.» di «Send to a
   friend», una conferma breve dopo un gesto, il caso tipico dell'isola. I
   problemi restano scritti sopra la lista. Dentro un `Modal` l'isola va nel
   `Modal` (`useIsland` restituisce l'elemento da mettere per ultimo).
4. Durata e misure sono costanti di `Island.tsx`, non in `tokens.ts`, che
   altri task stanno toccando.
Scartato: un'isola sola in cima all'app (sotto un `Modal` non si vede).
5. **Anche «Thanks for telling us. We will look at it.»** (scelta
   dell'utente, 2026-11-05: «Anche «Thanks for…»»): ogni segnalazione andata
   a buon fine, dal «…» di un post o di un profilo, da un messaggio e da un
   commento. Il foglio si chiude e l'isola dice grazie; i problemi restano
   nel foglio. Per i commenti l'isola prende il posto dell'`Alert`.
   `sayInIsland` (`src/ui/IslandLayer.tsx`) parla nell'ultimo
   `IslandLayer` montato: uno sopra l'app in `Root.tsx` (fuori dal
   `SafeAreaProvider`, quindi prende i margini da `initialWindowMetrics`) e
   uno nel foglio dei commenti, che resta aperto. Così `App.tsx` non si
   tocca. Il punto 3 resta com'è: «Send to a friend» tiene il suo
   `useIsland`, perché parla mentre il suo `Modal` è aperto.

**Parte C, fogli e liste (2026-11-05, deciso dall'agente su delega
dell'utente)**:
1. **`SheetModal`**: `Modal` trasparente senza animazione nativa, il
   contenuto sale e scende sulla molla `smooth` (`translateY` dall'altezza
   della finestra a 0). Il `Modal` resta montato finché il foglio è giù:
   così anche la chiusura è una molla e si interrompe. Il contenuto si
   rimonta a ogni apertura, come prima. Solo i sette fogli trasparenti con
   `slide`; i `Modal` a tutto schermo tengono la pagina nativa di iOS, che
   è già il movimento del sistema.
2. **Lo sfondo scuro sale con il foglio**, come con `slide`: è dentro il
   contenuto di ogni foglio. Farlo sfumare a parte vorrebbe dire spostarlo
   in `SheetModal` in tutti e sette i file; resta una scelta per dopo.
3. **`MessageSheet`** si chiudeva solo smontandolo il genitore: ora tiene
   un suo `open` e chiama `onClose` a foglio sparito (`onHidden`), senza
   toccare `ConversationScreen`.
4. **Cascata**: 25 ms fra una riga e l'altra, 6 punti di salita, solo le
   prime 6 righe; una riga che arriva dopo (una pagina in più) entra da
   sola. Su conversazioni, campanella, commenti e risultati della ricerca;
   non su «Feed» (riga di TASK-365 in sospeso).
5. **C2, lo sfondo che sfuma** (l'utente: «VA BENE», 2026-11-05): il punto
   2 non resta per dopo. `SheetModal` ha `dim`, uno strato `color.scrim`
   fermo dietro il foglio che segue la stessa molla del foglio fino a 0,5;
   oggi lo usa solo `FilterSheet`, l'unico foglio con lo sfondo scuro.
## ADR-0245, precisazione — Il contorno di «Draw route» si controlla come parte

**Stato**: Attiva · 2026-11-04 · deciso dall'agente su delega dell'utente
(TASK-382). Dopo «Edit the drawing» su un esempio sull'acqua (TASK-369 B),
«Draw route» riceveva un 422 «outline: the outline crosses itself»: l'app
controllava il contorno prima che `canvasRequest.framed` lo arrotondasse al
decimillesimo, e l'arrotondamento faceva toccare i due lati della punta o del
nastro lasciati dal tratto dalla riva.

**Decisione**:

1. **Il contorno si controlla con i numeri che partono**, dopo
   l'arrotondamento, e con la regola del motore copiata operazione per
   operazione (`shapes/outline.py`: `_ring`, `_orient`, `_meet`,
   `_folds_back`, `_first_crossing`), in `mapdraw/sentOutline.ts`: sugli
   stessi numeri app e motore danno lo stesso verdetto.
2. **Dove due lati si incontrano si tolgono gli angoli fra loro**, dal lato
   con meno angoli, finché nessuno si incontra; mai un punto nuovo, così non
   si riarrotonda niente. Il contorno riparte dall'angolo più vicino al suo
   primo punto.
3. **Se resterebbe troppo poco, o un dettaglio non partirebbe più sul
   contorno** (`ATTACH_TOLERANCE`), il contorno va com'era: l'API dice
   perché, come prima.

**Alternative scartate**: mandare i numeri senza arrotondare (in un caso su
otto il solo cambio di riquadro fa già toccare i lati); un controllo con
tolleranza nel motore (cambia l'impronta del motore e vuole il server);
rifare `outlineOf` sul contorno arrotondato (crea punti nuovi, da
riarrotondare); un testo nuovo per questo 422 (non serve se il 422 non c'è
più, e vorrebbe il sì dell'utente).

**Conseguenze**: vale per ogni figura della mappa, sull'acqua e sulle strade;
un contorno che il motore prende già parte identico a prima. Solo JS, nessun
testo, impronta iOS invariata; funziona col server di oggi.

---

## ADR-0249, precisazione — I test della pool contano solo le connessioni dei client

**Stato**: Attiva · 2026-11-04 · deciso dall'agente su delega dell'utente
(TASK-389). `test_the_pool_closes_when_the_app_never_started` contava una
volta sola ogni riga di `pg_stat_activity` del database del test, e a volte
trovava tre righe invece di due. La terza era un autovacuum worker, che
analizza `spatial_ref_sys` dopo che PostGIS l'ha riempita (migrazione 0002),
nel momento che sceglie lui: provato sul Mac dai log del server. Ora
`others()` conta solo i `client backend`. Il test aspetta che il conteggio
arrivi a `POOL_MIN_SIZE`, perché una connessione chiusa da `migrate()` può
restare un attimo, e verifica anche il conteggio della pool stessa
(`get_stats`). Resta severo: una connessione in più della pool non se ne va
da sola, e due varianti della pool con una connessione in più lo fanno ancora
fallire. Scartato: un margine come «da 2 a 3», che lascerebbe passare proprio
la connessione in più, e il nome dell'applicazione sulle connessioni della
pool, che avrebbe cambiato il server.

---

## ADR-0245, precisazione — Un contorno rifiutato dice perché, non «our side»

**Stato**: Attiva · 2026-11-05 · deciso dall'agente su delega dell'utente
(TASK-382, parte B, #769; richiesta del Coordinatore). Un 422
`invalid_request` il cui messaggio comincia con «outline: » è un contorno
che `parse_outline` rifiuta, che si incrocia per esempio: non è un guasto
del server, e un «Try again» fallirebbe sempre. `route/problems.ts` lo
riconosce dal prefisso: a terra mostra il testo che c'era già per un
contorno che non sta sulle strade, sull'acqua quello dell'acqua
(`waterProblemText`, con «pick a shape»). Nessun testo nuovo; gli altri
`invalid_request` restano col messaggio generico. Scartato: un testo nuovo
per il contorno che si incrocia (vorrebbe il sì dell'utente, e dopo #767
il caso è raro).

---

## ADR-0330 — Il disegno intero: gli altri vedono anche partenza e arrivo

**Stato**: Attiva · 2026-11-05 · **scelta dell'utente** (TASK-390); il
come deciso dall'agente su delega dell'utente. Cambia il punto 4 di
ADR-0114 («senza i primi e gli ultimi 200 m») e il punto 4 di ADR-0159 (il
taglio lungo la traccia).

**Contesto**: dal 2026-10-01 gli altri vedevano una corsa pubblicata senza
i primi e gli ultimi 200 m, perché spesso parte e finisce davanti a casa.
L'utente, 2026-11-05: «togli la questione che il disegno non conteggia la
prima e l'ultima parte per privacy, rovina il disegno...». Alla domanda su
come, con tre proposte (solo i disegni nuovi; anche i vecchi; un'opzione
nelle impostazioni), ha scelto **anche i vecchi**.

**Decisione**:
1. **La traccia intera**: `drawings.track` è la traccia pulita della corsa,
   dal primo all'ultimo punto, sempre senza orari, pause, `walks` e
   percorso pianificato (resta il punto 5 di ADR-0159). Sotto un metro
   resta il `422`, ora «This run is too short to publish.».
2. **L'app non taglia più**: immagine e video di «Share», la foto composta e
   il disegno nei messaggi usano la traccia intera (parte B).
3. **I disegni già pubblicati** si ridisegnano con
   `python -m shaperoute_api.drawing_retrack --apply`, dalla corsa com'è
   tenuta: la stessa linea che darebbe un `PUT` adesso. Uno script, non una
   migrazione: è una scrittura sui dati di chi ha pubblicato, e parte solo
   col sì dell'utente dopo che l'informativa nuova è sul sito (ordine del
   Coordinatore). Senza `--apply` conta e non scrive; ripetuto non cambia
   niente. `updated_at` non cambia, così le foto tengono il loro indirizzo;
   `drawings.preview` è generata e segue.
4. **I testi** (sotto «Who can see it» e nell'informativa, app e sito, in
   cinque lingue) non promettono più il taglio e dicono che partenza e
   arrivo si vedono; approvati dall'utente il 2026-11-05.

**Scartato**: solo i disegni nuovi (proposto come più prudente: chi aveva
pubblicato contava sul taglio; l'utente ha scelto anche i vecchi);
un'opzione «Nascondi partenza e arrivo» (più lavoro, non scelta); una
migrazione che ricalcola da sola al deploy (scriverebbe prima che
l'informativa nuova sia sul sito).
## ADR-0328 — L'header `X-MuW-Reads`: le app vecchie non ricevono ciò che non sanno leggere

**Stato**: Attiva · 2026-11-05 · TASK-387. La protezione è chiesta
dall'utente («sì protezione», 2026-11-04) e il suo disegno (un header con i
tipi in più, nessun header = app vecchia) viene dal Coordinatore; i dettagli
qui sotto sono decisi dall'agente su delega dell'utente. Numeri dal
Coordinatore. Usa ADR-0319 (punto 6, la tolleranza B0) e ADR-0327 (punto 3).

**Contesto**: il nuoto (TASK-323), la camminata (TASK-371), lo sci e il
fondo (TASK-375) e la palestra senza traccia (TASK-385) mettono nelle liste
del server attività che le build di prima non conoscono. La B0 di TASK-375
(#749) le legge come «senza attività» e le mostra come corse, ma solo nelle
build che hanno quell'OTA; le altre rifiutano la pagina intera, e anche con
la B0 un post di sci mostrato come una corsa è sbagliato. Contare solo
sull'ordine degli OTA lascia esposto chi non aggiorna.

**Decisione**:

1. **Un header, una lista.** L'app manda `X-MuW-Reads` con i tipi in più che
   sa mostrare, separati da virgole: `swimming`, `walking`, `skiing`,
   `xc_skiing`, `trackless` (una corsa o un post senza traccia). Nome e
   valori senza maiuscole/minuscole, spazi ignorati, più righe dell'header
   unite, valori sconosciuti ignorati (un'app più nuova del server non
   sbaglia). La lista sta in `packages/shared-types/fixtures/reads.json`,
   letta dai test dei due lati.
2. **Nessun header = una build vecchia**: corsa, bici e pagaia, con la
   traccia. Un header vuoto vale lo stesso.
3. **Una lista chiusa.** Passa un'attività delle tre di base o dichiarata;
   tutto il resto esce, anche un'attività che il server imparerà dopo. Una
   nuova entra con il suo valore: la palestra di TASK-385 vorrà `gym`
   insieme a `trackless` (così si legge il punto 3 di ADR-0327). Senza
   traccia vuol dire `runs.track` nullo: oggi nessuna corsa lo è, la
   condizione c'è già e si prova sul frammento SQL e sul filtro in Python;
   la prova sul database arriva con la migrazione della palestra.
4. **Dove**: Feed (All e Following), ricerca, disegni di un profilo e
   propri, galleria e podio dei concorsi, corse di gruppo, messaggi,
   preferiti, «My activities», foto del profilo, lista della campanella. Un
   dettaglio illeggibile (`GET /drawings/{id}`, `GET /group-runs/{id}`,
   `GET /messages/{id}/drawing`) è 404, come uno che non c'è.
5. **Come, caso per caso**: nelle liste a pagine il filtro sta nella query,
   così una pagina resta piena e il cursore giusto. Nei concorsi i posti
   restano quelli veri (un'app vecchia vede un buco nella numerazione, non
   un podio falso) e un vincitore illeggibile resta con `drawing: null`, il
   caso che la risposta ha già. In una conversazione il messaggio resta: il
   disegno illeggibile diventa «[Drawing]» davanti al testo, come per
   un'app senza allegati (TASK-333), perché togliere il messaggio cambierebbe
   la conversazione.
6. **Il frammento SQL nasce da una lista fissa** (`reads.py`), mai dal testo
   dell'header: i valori sono letterali scelti dal server.
7. **L'app** manda l'header in ogni richiesta di `ask` (`src/api/accounts.ts`),
   da cui passano tutte le liste: il valore è `RUN_ACTIVITIES` meno le tre di
   base, oggi `swimming,walking,skiing,xc_skiing`. Non `trackless`, finché
   nessuna schermata sa mostrare un post senza linea. La tolleranza B0
   resta, seconda linea di difesa.
8. **L'ordine del rilascio** lo tiene il Coordinatore con l'utente: prima
   il server con la guardia, poi l'OTA con l'header, poi il nuoto (#765).
   Nessun passo rompe qualcosa: fra il server e l'OTA l'app di produzione è
   trattata come vecchia e perde solo i post di nuoto salvati dalle build di
   sviluppo (camminata e sci il server non li salva ancora: 0043 e 0044 non
   ci sono); l'header senza la guardia non cambierebbe niente.

**Fuori per scelta**: `/muw-routes` (il catalogo lo pubblica MuW: uno sport
nuovo ci entra quando le app che lo leggono sono in produzione), `/style`
(nessuna attività), il gioco (dà metri, non attività), reazioni e commenti
(di un disegno che l'app vecchia non apre), le push (aprono il dettaglio, che
dà 404), i conteggi del profilo (un'app vecchia può contare un disegno in più
di quelli che vede).

**Alternative scartate**: la versione dell'app in un header (il server
dovrebbe sapere quale build legge cosa, e una build di sviluppo non ha un
numero affidabile); una lista di ciò che l'app *non* legge (un'app vecchia
non sa cosa verrà); filtrare in Python dopo la pagina (pagine corte, o vuote
con un cursore, che un'app può leggere come la fine); togliere il messaggio
intero.

**Conseguenze**: nessuna migrazione, nessun testo nuovo, nessuna dipendenza;
l'API cambia per chi non manda l'header. Ogni sport nuovo aggiunge un valore
in `reads.py`, nella fixture e nell'app (dal registro di TASK-376, quando ci
sarà). Server e OTA di produzione col sì dell'utente.
## ADR-0311, precisazione — Nell'header il logo di «Draw», che lascia la pagina

**Stato**: Attiva · 2026-11-05 · scelta dell'utente (TASK-392); le misure
decise dall'agente su delega dell'utente. Il punto 2 di ADR-0311 voleva
nell'header «il cuore e «MuW»»: era il cuore pieno di Lucide, 22 punti, e
«MuW» in `font.heading`. L'utente l'ha voluto «come logo come nella sezione
disegno», col cuore stilizzato, e il logo tolto da «Draw» accanto a «Run
without a route». Ora l'header ha `HeartBadge` da 32 punti e «MuW» in
`fontSize.title` grassetto, le misure che il logo aveva in «Draw»; in
«Draw» resta solo il pulsante, a destra. Cambia, solo per «Draw», la
scelta di TASK-367 di lasciare i loghi dentro le pagine; «Explore» e
«Paddle» tengono il loro. Scartato: un logo più piccolo dell'originale per
tenere l'header basso (l'utente ha chiesto lo stesso logo).

---

## ADR-0331 — La CI salta i test sulle PR di soli documenti e cancella i run superati

**Stato**: Attiva · 2026-11-05 · deciso dall'agente su delega dell'utente
(TASK-393; richiesta dell'utente del 2026-11-05).

**Contesto**: ogni PR faceva girare i cinque job di `ci.yml`, anche quelle
di soli documenti (chiusure, righe di STATUS). Il job `api` dura 25–30
minuti; con 8–11 run insieme la coda delle unioni si fermava per un'ora, e i
run delle head vecchie dello stesso branch continuavano. Il ruleset «protect
main» chiede i check `route-engine`, `mobile`, `api`, `ai`.

**Decisione**:

- ogni job di `ci.yml` comincia con `tools/ci_changes.py`: sul merge commit
  della PR (checkout con `fetch-depth: 2`) confronta col primo genitore,
  cioè `main`, senza rinomine e con `-z`. Se ogni percorso è un documento —
  tutto `docs/`, e i `.md` fuori da `apps/`, `packages/`, `services/`,
  `tools/`, `site/`, `deploy/` — gli altri passi hanno `if:` falso e il job
  finisce verde con lo stesso nome. Nel dubbio (nessun merge commit, git che
  fallisce, nessun file) gira tutto; su `main` gira sempre tutto;
- `concurrency` in `ci.yml` e `site.yml`: per le PR il gruppo è
  `ci-<ref>` / `site-<ref>` con `cancel-in-progress`; per i push su `main`
  il gruppo è l'id del run, così nessun run di `main` aspetta o viene
  cancellato. `mirror.yml` resta col suo gruppo `mirror`, senza
  cancellazione.

**Perché così**: un filtro `paths` in `on:` non fa partire il workflow e
lascia i check obbligatori «Expected» per sempre. Un job saltato con `if:`
a livello di job conta come riuscito, ma con un job `changes` in `needs:`
un suo errore farebbe saltare, quindi passare, tutti gli altri senza test;
con il controllo dentro ogni job, un errore del controllo fa fallire il job.
I `.md` dentro `apps/` e `packages/` li controlla prettier
(`format:check`), quelli del pacchetto `route_engine` finiscono in
`engine.zip`: lì sono codice. Un gruppo `ci-${{ github.ref }}` anche per
`main` avrebbe messo in fila i run di `main` e cancellato quelli in attesa.
I gruppi valgono per tutto il repository: lo stesso prefisso in due
workflow farebbe cancellare l'uno dall'altro.

**Scartato**: un'azione di terzi per i percorsi (non serve, e vorrebbe il sì
del Coordinatore); un job `changes` con `needs:` (sopra); saltare solo i job
che una PR di codice non tocca (fuori scope: ogni PR di codice fa girare
tutto come prima).

**Conseguenze**: una PR di soli documenti finisce in pochi secondi per job.
Se un test comincia a leggere un file di `docs/` o un `.md` fuori da quelle
cartelle, la regola in `tools/ci_changes.py` cambia nella stessa PR. `site.yml`
continua a girare quando cambia `docs/DEPLOY.md`, che i suoi test leggono.

---

## ADR-0327, precisazione — La palestra usa l'header di ADR-0328

**Stato**: Attiva · 2026-11-05 · TASK-385, decisa dall'agente su delega
dell'utente. Il punto 3 di ADR-0327 voleva un header della palestra,
`X-MuW-Reads: trackless`, e un filtro scritto dalla parte A. Nel frattempo
TASK-387 (ADR-0328, in `main`) ha messo un header solo per tutti gli sport
nuovi, con `trackless` già fra i valori e la condizione «senza traccia» già
nel frammento SQL e nel filtro in Python di `reads.py`.

**Decisione**: la palestra non scrive un filtro suo. La parte A aggiunge
`gym` a `NEWER_ACTIVITIES` in `reads.py` e a `kinds` in
`packages/shared-types/fixtures/reads.json`, e porta la prova sul database
che ADR-0328 punto 3 rimanda alla migrazione della palestra. Un post di
palestra passa solo se l'header dice **sia** `gym` **sia** `trackless`; il
dettaglio senza i due valori è 404, come voleva ADR-0327. La parte B0
aggiunge i due valori a `READS` in `apps/mobile/src/api/reads.ts` nello
stesso OTA che sa mostrare la card e il dettaglio senza linea, non prima:
fino a quel giorno l'app di produzione non riceve post di palestra.

**Conseguenze**: dalla parte A esce il punto di registrazione «il filtro
dei disegni (`drawings.py` `shown_sql`)», dalla B0 «il client che manda
l'header»; entrano `reads.py`, `reads.json` e `reads.ts`, una riga
ciascuno. L'ordine dei rilasci di ADR-0327 non cambia: la B0 in produzione
prima della B.

---

## ADR-0327, precisazione — La parte A: dove sta la palestra nel server e nei tipi

**Stato**: Attiva · 2026-11-05 · TASK-385 parte A, decisa dall'agente su
delega dell'utente; lista dei file approvata dal Coordinatore.

**Decisione**:

1. **Un endpoint suo**, `PUT /me/gym-sessions/{key}`, invece di
   `PUT /me/activities/{key}`: quello vuole una traccia di almeno due punti
   e ci costruisce sopra metri, punteggio, record e gioco. Lì `activity:
   "gym"` è `422`. La corsa senza traccia ha `distance_m` 0 e nessun luogo.
2. **Il CHECK dei disegni** non può leggere la corsa: invece di un trigger,
   una colonna `drawings.trackless` che l'API mette vera pubblicando una
   corsa senza traccia; il CHECK accetta un disegno visibile senza traccia
   solo se è `trackless`, e un `trackless` non ha traccia.
3. **I tipi**: nel server `gym` entra in `RunActivity` e nel registro degli
   sport (`ApiSport.trackless`); in `shared-types` sta in un gruppo suo,
   `TRACKLESS_SPORTS` / `TRACKLESS_ACTIVITIES`, **fuori** da
   `RUN_ACTIVITIES` fino alla parte B0. Dentro, l'app di oggi manderebbe
   `gym` in `X-MuW-Reads` (`reads.ts` lo ricava da lì) e romperebbero le due
   mappe di Salute (`Record<RunActivity, …>`) e i profili degli sport di
   TASK-376 B3: la B0 lo sposta con quelle righe.
4. **Strava** risponde `422 invalid_request` a una palestra, senza un codice
   d'errore nuovo nel contratto; `SPORT_TYPES` non la contiene.
5. **Recuperi e «Show exercises»** in una tabella `gym_sessions`, una riga
   per corsa; il proprietario vede sempre i suoi esercizi.
6. **I tetti non rifiutano**: una serie sopra il tetto si salva, ma per i
   traguardi non conta (`gym_catalog.measured`). Il database tiene solo
   limiti larghi; i campi di ogni tipo li controlla l'API. Un allenamento
   dura al più 24 ore e ha al più 500 serie.
7. **Le risposte lasciano fuori i campi vuoti** di una serie, come
   `shared-types` li descrive (facoltativi).

**Conseguenze**: nessuna dipendenza, nessun testo dell'app, impronta iOS e
del motore invariate. Server e migrazione 0047 in produzione col sì
dell'utente, anche prima della B0: l'header tiene fuori i post senza
traccia.
## ADR-0326, precisazione — MuW Style nell'app (TASK-384 parte B)

**Stato**: Attiva · 2026-11-05 · deciso dall'agente su delega dell'utente,
dentro la proposta approvata; (a) e (b) viste dal Coordinatore.

1. **(a) La scheda «Style» e le card ci sono solo quando GET /style ha almeno
   un post.** Un'API senza Style, o senza post usciti, lascia il Feed com'era:
   l'app si può pubblicare prima del primo post.
2. **(b) Senza account, con dei post, le schede sono «All · Style».**
   «Following» vuole un account; i post Style sono di MuW e per tutti.
3. **Il posto in «All»**: dopo il 7° disegno e poi ogni 7, sempre fra due
   disegni; se il posto è di un annuncio scende di uno, e il successivo conta
   da lì, così in nessuna finestra di 8 righe ce ne sono due.
4. **I testi approvati stanno in una tabella per lingua** (`styleWords.ts`),
   come «Following» in `FeedTabs.tsx`: nelle tabelle di `t`, che vanno per
   testo inglese, «Running», «Bike» o «Women» sono già altre parole.
5. **Prezzo e giorno senza `Intl`**: «€84.99» in inglese, «84,99 €» nelle
   altre lingue; il mese abbreviato dalla tabella.
6. **«Shop» apre solo una pagina https** che l'API risponde, con
   `Linking.openURL`: il browser del telefono. Se l'API non risponde, non si
   apre niente e il pulsante torna attivo, senza un testo nuovo.
7. **L'interruttore sta sul telefono** (`style-in-feed.json`), come la
   scheda scelta: l'API non lo sa.
## ADR-0332 — Il VO₂ max nel profilo pubblico: da Salute, se no stimato dai record, solo dopo un sì

**Stato**: Proposto · 2026-11-05 · TASK-397. Fonte e visibilità sono
**scelte dell'utente**; il come è deciso dall'agente su delega
dell'utente.

**Contesto**: l'utente, 2026-11-05: «Fai il conteggio del VO2 Max, magari
prendi le informazioni da Apple, e pubblicalo nel profilo dell'utente, come
valore che lo possono vedere tutti». Alle due domande ha scelto: il valore
di Apple Salute / Health Connect quando c'è, se no una stima di MuW dai
record di corsa con la scritta «stima»; visibile a chi apre il profilo,
solo dopo un sì esplicito, spegnibile in Impostazioni. Il VO₂ max è un dato
di Salute: Apple (linea guida 5.1.3) vuole il consenso prima di mostrarlo ad
altri e vieta di usarlo per la pubblicità.

**Decisione**:
1. **Il sì sta sul server**: colonna `accounts.show_vo2max boolean NOT NULL
   DEFAULT false` (migrazione col numero del Coordinatore). Si accende e si
   spegne con `PATCH /me` (`show_vo2max`). Spento, `PublicProfile.vo2max` è
   `null` per tutti, anche per il titolare visto da un altro account.
2. **Il valore di Salute resta sul telefono fino al sì.** Dopo, il telefono
   manda solo l'ultimo campione: `PUT /me/vo2max` con `value` (ml/kg/min,
   accettato fra 10 e 90, se no `422`), `measured_on` (il giorno, non
   l'ora) e `source` (`apple_health` o `health_connect`). Una riga per
   account (`vo2max_readings`), sovrascritta. `PUT` con `show_vo2max`
   spento è `409`. Spegnere, `DELETE /me/vo2max` o cancellare l'account
   cancellano la riga.
3. **La stima la fa il server**, dai record di `run_bests` (ADR-0312): per
   ogni record di corsa degli ultimi 365 giorni fra 5K e maratona (il 60K
   resta fuori, oltre le quattro ore la formula non vale) il VDOT di Daniels
   e Gilbert, con `v` in m/min e `t` in minuti:
   `VO₂ = −4,60 + 0,182258·v + 0,000104·v²`,
   `%max = 0,8 + 0,1894393·e^(−0,012778·t) + 0,2989558·e^(−0,1932605·t)`,
   `VDOT = VO₂ / %max`. Vale il più alto, arrotondato all'intero e tenuto
   fra 20 e 90; fuori, nessuna stima. Funzione pura in
   `vo2max_estimate.py`, calcolata a ogni lettura: niente da tenere in pari
   quando un record cambia o una corsa si cancella. Esempio di test: 5K in
   20:00 → 50.
4. **Precedenza**: il valore di Salute con `measured_on` negli ultimi 365
   giorni; se no la stima; se no `null`. Anche il valore di Salute si mostra
   intero, come la stima.
5. **Forma nel profilo**: `PublicProfile.vo2max` è `null` oppure
   `{ value, source, measured_on, from_distance }`, dove `source` è
   `apple_health`, `health_connect` o `estimate` e `from_distance` è il nome
   del record (`5k`, `10k`, `15k`, `half`, `30k`, `marathon`) solo per la
   stima. Un campo in più, facoltativo: le app che non lo conoscono lo
   ignorano (`isPublicProfile` non guarda i campi in più), quindi niente
   valore nuovo in `X-MuW-Reads`. `GET /me` porta `show_vo2max`.
6. **La lettura da Salute** (parte C) chiede `HKQuantityTypeIdentifierVO2Max`
   in `toRead` a runtime, solo dopo il sì nell'app, e manda l'ultimo
   campione al massimo una volta al giorno e dopo ogni corsa salvata. Il
   testo di `NSHealthShareUsageDescription` è nativo e oggi parla solo del
   battito: il VO₂ max entra nel testo unico della 1.0.2 con TASK-345 C
   (battito) e TASK-374 C (dati del corpo), e nella stessa voce «Health» di
   App Privacy. L'ordine fra i tre è del Coordinatore. Android (Health
   Connect, `Vo2MaxRecord`) con TASK-321 C.
7. **Mai per la pubblicità**: il VO₂ max non entra nei dati passati agli
   annunci (TASK-235) né nelle liste o nelle ricerche; si vede solo aprendo
   il profilo.

**Conseguenze**: le parti A (API) e B (app, solo stima) non leggono Salute e
possono andare con un OTA prima della 1.0.2; la C aspetta la build. Il
profilo pubblico porta un dato di salute: la riga dell'informativa (app e
sito, cinque lingue) entra con la parte A per la stima e si allarga con la
C per Salute, ogni volta col sì dell'utente.

**Scartato**: tenere sul server la cronologia dei valori (basta l'ultimo;
meno dati di salute tenuti); calcolare la stima sul telefono (i record sono
già sul server, e la stima di un profilo non dipenderebbe dal telefono di
chi lo apre); la stima dal battito a riposo (vuole il battito, che MuW non
legge ancora, e l'età); mostrarlo senza un sì (scelta dell'utente, e Apple
5.1.3).

---

## ADR-0327, precisazione — La parte B0: come l'app mostra un post senza linea

**Stato**: Attiva · 2026-11-05 · TASK-385 parte B0, decisa dall'agente su
delega dell'utente dentro le sue scelte del 2026-11-04 («Prima foto, se no
riquadro»); lista dei file approvata dal Coordinatore.

**Decisione**:

1. **`gym` entra in `RUN_ACTIVITIES`** e l'app manda `gym,trackless` in
   `X-MuW-Reads` dalla stessa build che sa mostrarli. Il cancello è
   `isTrackless` (`activities/snow.ts`), letto da `TRACKLESS_ACTIVITIES`,
   accanto a quello dello sci; `routeActivity` dà `undefined` anche per la
   palestra.
2. **Nel Feed** il riquadro giallo (🏋️, «Gym», il tempo) sta al posto della
   mappa; con le foto e senza un ordine scelto, la prima foto viene prima e
   il riquadro per ultimo; nessuna miniatura della figura sulle foto. Le
   kcal, il battito e gli esercizi principali nel riquadro vengono con le
   parti C, G e D: in B0 nessuna richiesta in più per card.
3. **Il dettaglio** resta `DrawingCard` sopra la mappa senza linea, come lo
   sci coi suoi impianti: il tempo al posto dei km e gli esercizi
   (`GET /drawings/{id}/exercises`) raggruppati per esercizio, i pesi in kg
   o lb come le unità. Spariscono «Start», GPX, «Send to a friend», «Draw it
   near me», «Edit the drawing», l'iscrizione al concorso e Strava.
4. **Le miniature** (profilo, ricerca, «My activities») sono il riquadro
   piccolo, solo 🏋️; nessuna distanza scritta a 0 m.
5. **I nomi degli esercizi** stanno in `gym/catalog.ts` con le cinque lingue
   (approvati il 2026-11-04), non nelle tabelle di `i18n`: sono dati del
   catalogo, confrontati con la fixture del server.

**Conseguenze**: nessuna dipendenza, nessun permesso, nessun file nativo;
tre testi nuovi nelle tabelle, già approvati. L'OTA va in produzione col sì
dell'utente prima della parte B, che fa registrare la palestra.

---
## ADR-0321 — L'escursionismo: una rete sua, fuori dalle strade delle auto, sulla struttura degli sport

**Stato**: Accettato · 2026-11-05 · TASK-377. Le scelte dell'utente, il
2026-11-05, sono in `tasks/TASK-377.md`:

- la rete senza strade delle auto (punto 2);
- `sac_scale` fino a T3;
- 1–30 km;
- nel gioco come la camminata;
- acceso appena pronto.

Pilota della struttura degli
sport (ADR-0320), scelta dell'utente del 2026-11-04; numeri dal
Coordinatore. Le scelte di prodotto sono dell'utente, una alla volta, in
`tasks/TASK-377.md`. I punti tecnici qui sotto sono decisi dall'agente su
delega dell'utente, e restano proposti finché le scelte non ci sono.

**Contesto**: la camminata (ADR-0315) usa la rete «foot» della corsa, che
tiene ogni strada dove si può andare a piedi, comprese quelle trafficate.
Un'escursione le evita. Il banco ha provato due reti senza toccare il
motore (`docs/sports/hike.md`):

- **solo sentieri**: a Trento resta un pezzo di 88 km attorno alla
  partenza, con 3 forme su 9;
- **«foot» senza le strade delle auto**: 46 forme su 54 sulle sei zone; in
  montagna 6–7 su 9, e la rete lì è soprattutto `track` e `path`.

**Decisione (proposta)**:

1. **Un'attività `hiking`** fra quelle che si disegnano (`PLANNED_SPORTS`),
   nei file nuovi di ogni strato e con una riga in ogni registro, come dice
   `docs/sports/COME-AGGIUNGERE.md`. Ogni file fuori ricetta è una deroga
   scritta in `CONDIVISO.md`.
2. **Una rete nuova `hike`** (`route_engine/networks/hike.py`). È il
   filtro «foot» senza `trunk`, `primary`, `secondary` e `tertiary`, ed
   esclude `sac_scale` oltre T3 («demanding mountain hiking»). Ogni via
   resta percorribile nei due sensi, come «foot». Ha file di cache suoi
   (`hike_*`).
3. **La prima rete nuova dopo la bici** porta `__main__.py` e `anchored.py`
   a `OsmnxSource.for_activity` (`CONDIVISO.md`, «Il motore»).
4. **L'impronta del motore cambia**: server, migrazione (numero dal
   Coordinatore) e notte degli esempi si fanno solo col sì dell'utente.
5. **Sul telefono**: un `SportProfile` con Apple `.hiking` (24), Health
   Connect `EXERCISE_TYPE_HIKING` (37), l'energia ACSM a piedi con la
   salita, e la rete `hike` sul telefono se le zone si scaricano come per
   «foot». Solo JavaScript: l'impronta iOS non si muove.

**Restano all'utente**:

- nome ed emoji;
- la rete fra le due misurate;
- le distanze (il banco ha provato 5–20 km);
- il limite `sac_scale`;
- se conta nel gioco e nei record;
- i testi;
- quando si accende.

**Alternative**:

- **Solo sentieri**: troppo frammentata vicino alle città.
- **La rete «foot» così com'è**: è la camminata, già fatta.
- **Preferire i sentieri col peso degli archi invece di togliere le
  strade**: cambierebbe la ricerca del motore per tutti. Se serve, si
  valuta dopo la parte A, misurando quanto di ogni percorso sta su `track`
  e `path`.

## ADR-0321, precisazione — La parte A: l'impronta del motore resta, il profilo dell'app entra nascosto

**Stato**: Accettato · 2026-11-05 · TASK-377 parte A. Scelte del
Coordinatore; le scelte tecniche sono decise dall'agente su delega
dell'utente.

**Contesto**: la parte A aggiunge al motore l'attività `hiking` e la rete
`hike`. Questo cambia l'impronta del motore, e ADR-0320 dice che
`SAME_ROUTES_AS` non vale «mai per un cambiamento di comportamento». Poi,
un'attività nel contratto entra subito anche nelle liste dell'app.

**Decisione**:

1. **L'impronta resta quella di prima** (`SAME_ROUTES_AS`): 9be259696402 →
   e13ded92b52d, e lo stesso per i nuoti e gli esempi di canoa
   dell'app. La regola di ADR-0320 protegge i percorsi tenuti. Qui il
   comportamento nuovo è solo un'attività che non ha percorsi tenuti. I
   percorsi di prima sono provati uguali:
   - i nove percorsi fissi di `test_same_routes.py` (darwin-arm64);
   - il banco su sei zone: corsa 54/54, bici 54/54, canoa 27/27, identici
     punto per punto.

   Così non serve una notte di esempi. Gli esempi di Explore per la hike,
   se servono, sono un giro a parte, solo hike, col sì dell'utente.
2. **Il profilo Hike dell'app entra con la parte A, nascosto.** Senza il
   profilo l'app non partirebbe (`search/searchFilters.ts` chiama
   `profileOf` per ogni attività). `main` resta pubblicabile a ogni merge:
   - nessuna riga in «Settings»;
   - nessun chip nella ricerca;
   - il nome senza `tLater` fino alla parte B, che porta i testi.

   L'header `X-MuW-Reads` dice `hiking`, e una hike salvata altrove si
   vede come una camminata (`hikeFeed.test.tsx`).
3. **Le zone della hike nell'API**: `explore`, con i nomi delle strade,
   una sola in memoria. La rete è sua, quindi le zone della corsa non
   servono, e la RAM del server cresce di una zona sola.
4. **Il gioco**: una hike conta come una camminata. `RULES_VERSION` resta
   2, perché nessuna corsa salvata prima della 0051 può essere una hike.
5. **Niente vie ferrate.** La rete «foot» tiene `highway=via_ferrata`. Il
   primo banco ne ha trovati 2,6 km a Trento e 3,0 km a Fiemme, anche
   senza `sac_scale`. Una via ferrata è un'arrampicata con l'imbrago,
   oltre i sentieri fino a T3 scelti dall'utente: la rete `hike` la
   toglie.

**Server**: migrazione 0051 e deploy, col sì dell'utente.
## ADR-0327, precisazione — La parte B: come il telefono registra un allenamento senza GPS

**Stato**: Attiva · 2026-11-05 · TASK-385 parte B, deciso dall'agente su
delega dell'utente; la lista dei file l'ha approvata il Coordinatore.

1. **Lo stato è un valore solo**, in `gym/workout.ts`: inizio, pause, l'esercizio
   in corso, le serie, il recupero (inizio e fine), i recuperi contati, l'ultima
   cosa fatta. Ogni azione dà un valore nuovo, scritto subito in
   `gym-workout.json` (`keptList`): l'app chiusa a metà riapre sull'allenamento.
   Il tempo è quello dell'orologio, senza GPS né modalità in background.
2. **Il recupero conta da solo**: finito mentre nessuno guarda, vale fino alla
   sua fine; interrotto da una serie, da «Skip» o da «Pause», vale quanto è
   durato. Una serie o un recupero chiudono una «Pause». «Still training?» dopo
   30 minuti senza niente; senza risposta per altri 5 minuti l'allenamento si
   chiude all'ultima serie scritta (o all'ultima cosa fatta, senza serie). I 5
   minuti sono dell'agente.
3. **L'avviso del recupero**: con l'app aperta vibrazione e `chime()`, e un
   tocco leggero 10 s prima; una notifica locale si programma solo quando l'app
   va in background e si toglie quando torna, così con l'app aperta non suona
   due volte. Il permesso è `askPushPermission`, chiesto al primo recupero.
4. **«Save» passa da una coda sua**, `gym-outbox.json`: quella delle corse vuole
   una traccia. 422 e 409 restano sul telefono e non si rimandano, come per le
   corse. La chiave è l'inizio in base 36 più otto caratteri a caso.
5. **Un tempo scritto senza «:»** vale secondi per una serie a tempo e minuti
   per un blocco cardio. Le serie aggiunte alla fine non sono `live` e hanno
   l'ora della fine.
6. **Testi**: solo quelli approvati e parole già nell'app («Pause», «Resume»,
   «Save», «Discard», «Keep it», «Delete», «Done», «Stop»). I gruppi del
   catalogo stanno in `gym/groups.ts` nelle cinque lingue, non in `t()`: «Back»
   è già «Indietro». Il tipo di un esercizio col nome libero si sceglie con le
   parole dei campi: «Weight», «Reps», «Time», «Cardio». Tre parole che altre
   schermate usano già restano come sono: «Geschw.» (non «Geschwindigkeit»),
   «Temps» (non «Durée»), «Omitir» (non «Saltar»). Il messaggio di un salvataggio
   fallito sul telefono è quello delle corse.
7. **«Gym» è `ready: true`, anche nelle build dello store**: l'utente ha
   detto «ok accendi» il 2026-11-05, insieme al sì all'OTA di produzione con
   la B0, invece di aspettare qualche giorno. Le app senza la B0 non vedono
   comunque i post di palestra: il server li tiene fuori (`X-MuW-Reads`).
## ADR-0332, precisazione — Il sì e il valore di Salute in una tabella loro, `vo2max`

**Stato**: Attiva · 2026-11-05 · TASK-397 parte A, decisa dall'agente su
delega dell'utente; file approvati dal Coordinatore. Cambia i punti 1, 2 e
5 di ADR-0332, non le scelte dell'utente.

**Contesto**: il punto 1 metteva il sì in una colonna degli account, con
`PATCH /me` e `GET /me`. La tabella è `users` e la forma di `User` sta in
`accounts.py` (`USER_COLUMNS`, `UserBody`), che la parte A non tocca:
cambiarla avrebbe allargato il task a un file di tutti.

**Decisione**:
1. **Una tabella sua**, `vo2max` (migrazione `0049`): `user_id`, `show`,
   `value`, `source`, `measured_on`, con `CHECK` che vogliono i tre campi
   del valore insieme e solo col sì.
2. **Endpoint suoi** in `vo2max.py`: `GET` e `PUT /me/vo2max` (`{"show"}`)
   al posto di `GET /me` e `PATCH /me`; `PUT` e `DELETE
   /me/vo2max/reading` per il valore di Salute. La risposta,
   `Vo2MaxSettings`, dà anche a sì spento il `Vo2Max` che si vedrebbe: è
   quello che l'app mostra al titolare con «Only you see this».
3. **Il giorno della stima** è quello della corsa da cui viene, così
   `measured_on` c'è sempre.
4. **L'esempio del profilo** in `fixtures/public-profile.json` ha `vo2max:
   null`: con un oggetto, il JSON letto da TypeScript avrebbe `source:
   string` e i test dell'app che lo usano come `PublicProfile` non
   compilerebbero più. La forma intera sta in `fixtures/vo2max-settings.json`.

**Conseguenze**: `accounts.py` non cambia; il profilo prende il campo con
una sottoquery (`vo2max_sql`) e l'orologio degli account (`Profiles.now`).

---

## ADR-0314 — L'app per Apple Watch: Swift nativo, tutti gli sport, anche senza telefono

**Stato**: Proposto · 2026-11-05 · TASK-370. Scelta di prodotto
dell'utente (punto 1); il resto deciso dall'agente su delega dell'utente,
da confermare con le scelte ancora aperte del task.

**Contesto**: l'utente vuole un'app per Apple Watch «completa per tutti gli
sport» e, alla domanda sulla prima versione, ha scelto «Subito anche senza
telefono». Oggi la guida (svolte, fuori rotta, rientro) è JavaScript sul
telefono; React Native non gira su watchOS; un OTA non arriva al codice
dell'orologio.

**Decisione**:
1. **Prima versione anche senza telefono** (utente): l'orologio porta
   percorsi già decisi, li segue, registra col suo GPS e salva in Salute; la
   traccia passa al telefono quando torna vicino.
2. **L'orologio non disegna percorsi**: il Route Engine resta sul telefono e
   sul server. Disegnare dall'orologio (cellular + API) è fuori dalla prima
   versione.
3. **App nativa SwiftUI** (watchOS 10+) come target dell'app con
   `@bacons/apple-targets`; il ponte con `react-native-watch-connectivity`.
   Le due dipendenze hanno il sì dell'utente del 2026-10-30 (TASK-323 E).
4. **La guida riscritta in Swift** (`WatchGuide`, puro) e tenuta uguale al
   TypeScript con gli stessi fixture JSON di `navigation/fixtures/`, verdi
   in jest e in XCTest.
5. **Un'attività, un allenamento** (TASK-321): se registra l'orologio, è lui
   a salvare l'allenamento in Salute; il telefono non lo riscrive. Il
   battito in tempo reale arriva al telefono col mirroring di
   `HKWorkoutSession`.
6. **Gli sport dell'orologio vengono dal registro** `src/sports/`, con un
   test che tiene uguali le due liste.
7. **Assorbe TASK-323 E** e il battito in tempo reale rimandato da TASK-169
   e TASK-374.
8. **La build**: una sua, la **1.1**, dopo la 1.0.2 (scelta dell'utente del
   2026-11-05, «Build sua, la 1.1»).

**Alternative**:
- **Prima col telefono, poi da solo**: meno lavoro all'inizio, scartata
  dall'utente.
- **Solo battito e comandi**: troppo poco rispetto a «completa».
- **Guida calcolata sul telefono e mandata all'orologio**: non funziona
  senza telefono.

**Conseguenze**: due copie della logica di guida (TypeScript e Swift),
legate dai fixture; ogni correzione all'orologio richiede una build per
l'App Store; serve un Apple Watch vero per le prove.

---

## ADR-0314, precisazione — La parte A1: il nucleo Swift, i messaggi e la tabella degli sport

**Stato**: Attiva · 2026-11-05 · TASK-370 parte A1, deciso dall'agente su
delega dell'utente; piano della parte A approvato dal Coordinatore.

**Decisione**:

1. **Un pacchetto Swift puro**, `apps/mobile/targets/watch/Core/`
   (`WatchCore`), senza HealthKit, WatchConnectivity né schermate: si prova
   con `swift test` su qualsiasi Mac, senza progetto Xcode né `prebuild`.
   L'app dell'orologio di A2 lo userà come pacchetto locale.
2. **Lo stato dell'allenamento**: pronto → conto alla rovescia → in corso ⇄
   in pausa → finito → pronto. Un comando che non vale nella fase in cui si
   è (una pausa già in pausa) non cambia niente: lo stesso comando arrivato
   due volte, dal polso e dal telefono, conta una volta. «Fine» durante il
   conto alla rovescia lo annulla e non registra niente. Il tempo in
   movimento lascia fuori le pause; l'ora la dà chi chiama, così i test non
   usano il tempo vero.
3. **I messaggi** sono oggetti di valori JSON, come li porta
   WatchConnectivity: `command` (start con lo sport, pause, resume, end),
   `state` (fase, sport, tempo in movimento, metri) e `heartRate`. Ognuno ha
   la versione `v`: un lato legge le versioni fino alla sua e rifiuta una
   più nuova (l'orologio non si aggiorna con un OTA); una versione dopo
   aggiunge solo campi, e quelli che un lato non conosce restano fuori. Gli
   errori hanno gli stessi codici nei due lati (`notAnObject`,
   `unsupportedVersion`, `unknownType`, `invalidField`). Lo sport di uno
   start non è controllato sulla tabella: un telefono più nuovo può avere
   uno sport che l'orologio non conosce, e decide A2 cosa mostrare.
4. **Gli stessi fixture** in `targets/watch/Core/Fixtures/`
   (`messages.json`, `transitions.json`): XCTest li legge dal percorso del
   file di test, jest con `fs`. Se uno dei due lati cambia e l'altro no, un
   test diventa rosso.
5. **La tabella degli sport** viene da `src/sports/`: sport, nome inglese,
   emoji, `appleWorkout`, il passo (`km`, `paddle`, `swim`), sull'acqua,
   `guided` (l'app disegna percorsi: c'è `drawKm`), `gps`, `onWatch`. Quello
   che il registro non dice sta in `watchSports.ts`: al chiuso senza GPS
   solo la palestra; non offerto sull'orologio solo il nuoto, fino alla
   prova in acqua. La bici per ora ha il passo per km come nell'app; la
   velocità è della parte C. Quali sport il telefono offre davvero (la
   camminata e il fondo sono ancora «Soon») non sta nella tabella: lo dirà
   il telefono all'orologio in A2/A3.
6. **`sports.json` si riscrive** con `apps/mobile/scripts/watch-sports.sh`,
   che fa girare il test jest con `WRITE_WATCH_SPORTS=1`: niente script nel
   `package.json` (A1 non lo tocca) e niente dipendenze nuove. Il test
   confronta anche il testo, così il file è sempre quello dello script.
7. **`watch.yml`** gira su `macos-15` solo quando cambiano
   `apps/mobile/targets/watch/**` o il workflow; `timeout-minutes: 15`,
   gruppo `watch-` che cancella i giri vecchi come `ci.yml`. Non è un
   check obbligatorio del ruleset, quindi il filtro in `on:` non lascia
   check «Expected».

**Alternative**:
- **`Codable` per i messaggi**: più breve, ma WatchConnectivity dà
  dizionari, e i codici d'errore uguali al TypeScript sarebbero più
  difficili; scartata.
- **La tabella degli sport generata al `prebuild`**: richiede il plugin, che
  entra solo con A-flip; il file nel repository con il test che lo tiene
  uguale funziona da subito.

**Conseguenze**: l'impronta iOS di `main` resta `6f8bba4c` (misurata su una
copia pulita con `APP_VARIANT=production`). In A2 va verificato che
`@bacons/apple-targets` non compili `Core/Tests` dentro il target
dell'orologio: il pacchetto va collegato come pacchetto locale.

---
## ADR-0322 — Gravel e MTB: la bici di oggi per il gravel, una rete sua per la MTB

**Stato**: Accettato · 2026-11-05 · TASK-378. Le scelte dell'utente, il
2026-11-05, sono in `tasks/TASK-378.md`:

- due sport, «Gravel» 🚲 sulla rete bike e «MTB» 🚵 sulla rete `mtb`;
- 10–30 km per tutte e due;
- sentieri MTB fino a `mtb:scale` S2 (senza scala, `sac_scale` T2);
- fuori dal gioco come la bici, con record personali propri;
- i testi approvati;
- accesi appena pronti.

Le attività del contratto si chiamano `gravel_biking` e `mountain_biking`
(deciso dall'agente su delega dell'utente).

Numeri dal Coordinatore (2026-11-04). Le scelte di prodotto sono
dell'utente, una alla volta, in `tasks/TASK-378.md`. I punti tecnici qui
sotto sono decisi dall'agente su delega dell'utente.

**Contesto**: la bici (`cycling`, ADR-0153, ADR-0167) pedala già ogni
`track`. Un `path` lo pedala solo con `bicycle=designated`: negli altri casi
lo fa a piedi con la bici, a 6 volte il costo. Il banco ha provato due reti
senza toccare il motore (`docs/sports/gravel.md`):

- **`gravel`** (`track` fino a grade3, sentieri con la bici ammessa fino a
  `mtb:scale` 1): 54 percorsi su 54, come la bici. Lo sterrato è lo stesso,
  22,7% contro 23,3%: i percorsi non cambiano.
- **`mtb`** (in più ogni `track` e i sentieri non chiusi alle bici fino a
  `mtb:scale` 2, o `sac_scale` T2 se non lo dicono): 49 su 54, 24 buoni
  (la bici 23). A piedi con la bici scende dal 4,9% all'1,4% dei km. In
  montagna si pedala il 24–39% di rete in più. Le 5 mancate sono a 30 km,
  quattro stelle e un cuore, e sbagliano la distanza di 2,0–2,8 km.
- **Lo sterrato lo decide il posto**: 35–45% a Fiemme e ad Asiago, 3–13% a
  Milano e in pianura, con tutte le reti. Un metro d'asfalto che costa 2 o
  4 volte lo alza di pochi punti (prova a Trento).

**Decisione (proposta)**:

1. **Gravel si disegna come la bici**, sulla rete bike, come la camminata
   si disegna come una corsa (ADR-0315): l'API offre l'attività e chiede al
   motore una bici. Nessuna rete nuova e nessun file nel motore fuori
   dall'impronta. Le distanze e i nomi sono suoi.
2. **MTB ha una rete nuova `mtb`** (`route_engine/networks/mtb.py`): la
   rete bike con le regole di `mtb` qui sopra. I file di cache sono suoi
   (`mtb_*`) e il grafo dice `network: mtb`. Un'attività nuova in
   `activities/`, nei file nuovi di ogni strato, con una riga per registro
   (`docs/sports/COME-AGGIUNGERE.md`).
3. **La rete `mtb` tiene i sensi unici e i tratti a piedi come la bici.**
   Oggi `network.one_way_streets` e i controlli di `validation.usability`
   riconoscono solo il nome `bike`: la parte A li porta a una proprietà
   della rete. È una deroga alla ricetta, da scrivere in `CONDIVISO.md`.
4. **L'impronta del motore cambia** con la rete `mtb`: server, migrazione
   (numero dal Coordinatore) e notte degli esempi solo col sì dell'utente.
   Se arriva dopo 377-A, che porta già `__main__.py` e `anchored.py` a
   `OsmnxSource.for_activity`, quel punto non si ripete.
5. **Sul telefono**: un `SportProfile` per sport, con Apple `.cycling` (13)
   e Health Connect `EXERCISE_TYPE_BIKING` (8), perché nessuno dei due ha
   un tipo gravel o MTB (da verificare sulle librerie). Strava
   `GravelRide` e `MountainBikeRide`. L'energia segue il Compendium, come
   la bici. Solo JavaScript: l'impronta iOS non si muove.
6. **Niente preferenza per lo sterrato nel costo**: cambierebbe la ricerca
   del motore per poco sterrato in più.

**Restano all'utente**:

- uno sport o due;
- nome ed emoji;
- la rete;
- le distanze (il banco ha provato 10–30 km);
- il limite `mtb:scale`;
- se conta nel gioco e nei record;
- i testi;
- quando si accende.

**Alternative**:

- **Una rete `gravel` sua**: misurata, dà i percorsi della bici. Costerebbe
  un'altra cache e un altro download per zona, senza nulla in più.
- **Gravel senza strade principali** (via `primary` e `secondary`): a
  Trento a piedi con la bici sale al 10,3%, e la somiglianza scende.
- **Preferire lo sterrato col costo degli archi**: vedi il punto 6.
- **Un solo sport «Gravel/MTB» sulla rete `mtb`**: possibile, è la prima
  domanda all'utente.

---

## ADR-0333 — I capi sulle foto degli iscritti: tabelle loro, ogni link https controllato con Web Risk senza mandare il link

**Stato**: Accettato · 2026-11-05 · TASK-394 parte A. Le cinque scelte e i
testi sono **dell'utente** (`tasks/TASK-394.md`, «Le scelte dell'utente»);
il come è deciso dall'agente su delega dell'utente. Numero dal
Coordinatore.

**Contesto**: un iscritto segna sulle foto dei suoi post i capi che indossa
(tipo, marca, modello facoltativo, link al negozio facoltativo); chi vede la
foto apre il negozio nel browser. Scelte dell'utente del 2026-11-05: ogni
link `https`, controllato da fuori e con più moderazione a mano (1); MuW
non guadagna sui link degli iscritti (2); tipo e marca obbligatori, link
facoltativo (3); puntini nascosti dietro la gruccia (4, app); i totali di
aperture e «Shop» solo all'autore, mai chi (5). L'API Safe Browsing di
Google è solo per uso non commerciale: il controllo è **Google Web Risk**.

**Decisione**:

1. **Tabelle loro, non quelle di Style**: `drawing_outfit_tags`,
   `outfit_tag_clicks`, `outfit_blocked_domains` (migrazione `0050`).
   `post_product_tags` di Style resta legata a `style_posts`, già in
   produzione: chi scrive, chi toglie, chi vede e chi segnala sono diversi.
2. **Il capo segue la foto**: chiave esterna `(drawing_id, n)` su
   `drawing_photos` con `ON DELETE CASCADE`, così una foto tolta, un
   disegno tornato «Only me» (che toglie le foto dal server, ADR-0170), la
   corsa o l'account si portano via i capi. Il riordino (ADR-0301) cambia
   solo `item_order`, non `n`: i capi restano. **Una foto sostituita** nello
   stesso posto è un `UPDATE` di `drawing_photos`, che la chiave non vede:
   un trigger (`drawing_photo_replaced`, `AFTER UPDATE OF jpeg ... WHEN
   (OLD.jpeg IS DISTINCT FROM NEW.jpeg)`) cancella i capi di quel posto. Il
   confronto è sul JPEG e non sull'ora, perché l'app rimanda la stessa foto
   dalla sua coda dopo un errore di rete, e il JPEG appiattito è lo stesso:
   i capi non devono sparire per un nuovo tentativo. Un trigger e non una
   riga in `drawing_photos.py` per non toccare quel file (ok del
   Coordinatore). È il primo trigger del database.
3. **La lista intera**: `PUT /me/activities/{key}/drawing/photos/{n}/tags`
   riceve tutti i capi della foto; uno con il suo `id` si aggiorna e tiene
   conteggi e `hidden_at`, uno che manca si toglie con i suoi conteggi. Al
   più 5 per foto e 10 per post, controllati con la corsa bloccata (`FOR
   UPDATE`, come le foto). Gli errori che l'app dice con parole sue hanno
   un codice nuovo, `outfit_tag_rejected`, con un `reason` (`not_https`,
   `shortened`, `blocked`, `link_in_text`, `too_many_on_photo`,
   `too_many_in_post`, `words`): in `schemas.py` e in `shared-types`, come
   `comment_rejected`.
4. **Chi vede cosa**: i capi stanno dentro ogni foto (`PhotoBody.outfit_tags`),
   letti da `drawings._details` con chi guarda (`viewer_id`, facoltativo:
   senza, come chiunque altro). Arrivano solo a chi vede la foto, perché
   solo lui riceve la foto. Il proprietario ha `url`, `hidden` e i totali
   `opens`/`shops`; gli altri hanno `null` e chiedono il link a `POST
   /outfit-tags/{id}/shop`, così ogni «Shop» ripassa dal controllo. Un capo
   nascosto lo vede solo il proprietario. Ricerca e concorsi chiamano
   `_details` senza chi guarda: lì il proprietario vede i suoi capi come gli
   altri, senza nascosti né totali (quei file non cambiano). `X-MuW-Reads`
   non serve: nessuna attività nuova, e i capi stanno nelle foto di disegni
   già filtrati.
5. **Il link** (`outfit_links.py`): solo `https` su un nome di dominio
   (niente utente, password, porta, indirizzo IP, nome senza punto o con un
   dominio di primo livello che non è di lettere), al più 1000 caratteri.
   Gli accorciatori e i rimandi noti (bit.ly, t.co, amzn.to, linktr.ee, i
   rimandi di Facebook e Instagram, Awin, Skimlinks, CJ…) sono rifiutati,
   anche per un host sotto di loro. Il server **pulisce** il link: via il
   frammento e i parametri noti di tracciamento e di affiliazione, `tag` e
   simili solo sui siti di Amazon; il resto della query resta scritto
   com'era, nel suo ordine. L'host si tiene in ASCII (punycode). Il server
   non visita mai il link.
6. **Il nome del negozio** (`store`) è quello di Style per
   `RETAILER_HOSTS` (anche senza `www.`), se no l'host senza `www.`.
   **Un'etichetta in lettere non latine resta in punycode**, non solo una
   che mescola alfabeti: un nome tutto in cirillico che imita un sito
   latino («аррӏе») è di un solo alfabeto e passerebbe. Le lettere latine
   con accenti si mostrano come sono («müller.de»).
7. **Web Risk nella forma «Update API»** (`web_risk.py`), mai la «Lookup
   API», che riceve il link: il server tiene in memoria i prefissi di 4
   byte delle impronte SHA-256 delle liste `MALWARE`,
   `SOCIAL_ENGINEERING` e `UNWANTED_SOFTWARE`, aggiornati da
   `threatLists.computeDiff` in un thread quando Google dice
   (`recommendedNextDiff`, fra 1 minuto e 6 ore), con il controllo SHA-256
   di ogni lista. Un link si canonicalizza e si scompone in espressioni
   host/percorso come dice la documentazione di Web Risk; solo se
   un'impronta comincia con un prefisso della lista, `hashes.search` riceve
   **quel prefisso** e risponde le impronte intere, tenute fino a
   `expireTime` (o il prefisso sicuro fino a `negativeExpireTime`). Al più
   2^18 prefissi per lista (circa 12 MB): Google dà prima i più rilevanti.
   La chiave è `SHAPEROUTE_WEB_RISK_KEY`, solo nel `.env` del server, in
   un'intestazione (`X-Goog-Api-Key`), mai nell'indirizzo né nei log; i log
   dicono solo il tipo d'errore e lo stato HTTP.
8. **Quando Web Risk non può dire** (nessuna chiave, liste non aggiornate
   da 24 ore, Google che non risponde a una ricerca) un link è
   «unknown»: si salva e si apre solo un negozio di Style. Un link non passa
   mai senza controllo; dopo un riavvio i primi secondi, finché le liste
   arrivano, valgono come senza chiave. Le liste stanno in memoria e non nel
   database: l'API è un solo processo, e un riavvio le riscarica.
9. **L'elenco dei bloccati** è nostro, `outfit_blocked_domains`, scritto a
   mano dopo una segnalazione (l'email ha il link intero e il dominio): Web
   Risk non conosce siti per adulti né spam. Un dominio blocca anche gli
   host sotto di lui. Vale al salvataggio e a ogni «Shop».
10. **I conteggi** come in Style (ADR-0326 punto 3): uno in più per capo e
    per giorno, nient'altro, e 120 tocchi l'ora per indirizzo contati solo
    in memoria. **I tocchi del proprietario sui suoi capi non si contano**
    nemmeno sul server, anche se un'app li mandasse. `open` e `shop`
    vogliono il token, perché la foto si vede solo da iscritti; il server
    non scrive chi ha toccato.
11. **Segnalare un capo**: `kind` `outfit_tag` in `POST /reports` e
    nell'email; «Hide» nasconde solo quel capo (`hidden_at`), come un
    commento, e cambiarlo non lo rimostra.

**Conseguenze**: la parte B (app) legge `outfit_tags` delle foto e manda la
lista dopo la foto. In produzione servono la migrazione `0050` e, per i
link fuori dai negozi di Style, il progetto Google Cloud con Web Risk e la
sua chiave nel `.env` del server: tutto dell'utente, col suo sì. Il nome
della società di Google per Web Risk entra nella Privacy quando l'utente lo
attiva. Senza la chiave la funzione è già sicura, solo più stretta.

**Scartato**: la Lookup API di Web Risk o Safe Browsing (riceve il link, e
Safe Browsing non è per uso commerciale); una sola tabella con Style e due
chiavi facoltative (meno chiara, e cambierebbe la `0046` in produzione);
le liste nel database (un processo solo: non serve, e sarebbero qualche MB
da riscrivere a ogni aggiornamento); visitare il link per vedere dove
porta (il server non fa richieste ai negozi a nome di chi scrive); lasciar
passare un link non controllato quando Web Risk non risponde.
## ADR-0327, precisazione — La parte D: il post di palestra nel Feed

**Stato**: Attiva · 2026-11-05 · TASK-385 parte D, decisa dall'agente su
delega dell'utente dentro le sue scelte («Prima foto, se no riquadro»,
«Visibili, nascondibili», e del 2026-11-05 «10 foto», «Sì, anche alla
fine»); lista dei file approvata dal Coordinatore. Usa solo la parte A di
TASK-348 (ADR-0301), già in `main`.

**Decisione**:

1. **Il riquadro è il «disegno» dell'ordine**: l'ordine del post vuole
   `drawing` una volta, e per la palestra quella pagina è il riquadro.
   Con 10 foto (`GYM_MAX_PHOTOS` = `DRAWING_PHOTO_PLACES`) il post ha fino
   a 11 pagine; l'API ne tiene già 11 nell'ordine e 10 posti per le foto.
   `photosOf` legge tutti i posti dell'API; per le corse il decimo resta
   vuoto.
2. **Mai riordinato, il riquadro è l'ultimo** (come la B0 nel Feed): il
   compositore mette le foto nuove prima del riquadro, e l'ordine si manda
   solo se il riquadro non è l'ultimo. Il contrario delle corse, dove la
   mappa è prima.
3. **Gli esercizi principali** sono i tre con più serie, a pari serie il
   primo fatto (`gym/mainExercises.ts`). Nel Feed il riquadro li chiede con
   `GET /drawings/{id}/exercises`, una volta per post mentre l'app è
   aperta, la stessa risposta per la scheda; solo i post di palestra
   chiedono. Nascosti (404), il riquadro ha il solo tempo.
4. **Il modulo a fine allenamento passa dalla coda della palestra**: la
   scelta e «Show exercises» spento stanno nell'attesa di
   `gym-outbox.json`, foto e ordine nei file dei disegni da «Save». Quando
   l'API ha l'allenamento: prima `PUT …/show-exercises` (senza rete
   l'allenamento si rimanda, uguale), poi la scelta nella coda dei disegni
   e `sendWaitingDrawings`, come per una corsa. Così gli esercizi non si
   vedono mai prima di essere nascosti.
5. **«Show exercises» in «My activities»** legge `GET
   /me/gym-sessions/{key}` e scrive subito; non preso, torna com'era con le
   parole del modulo del disegno.
6. **Condividere**: l'immagine è il riquadro (`GymSharePicture`), con gli
   esercizi principali letti dall'allenamento; niente risultati, emoji,
   «Style», «Music», «Export video», Strava; il titolo del foglio è
   «Share»; nessun `RunPost` salvato.

**Conseguenze**: un testo nuovo nelle tabelle, «Show exercises», già
approvato il 2026-11-04. Nessuna dipendenza, niente nativo, niente server:
impronta iOS 6f8bba4c invariata. «Up to 10 in a post.» resta anche per la
palestra: dice le foto, non le pagine.

## ADR-0327, precisazione — La parte E: i traguardi della palestra

**Stato**: Attiva · 2026-11-06 · TASK-385 parte E, decisa dall'agente su
delega dell'utente dentro le sue scelte (la scelta 8, «100 kg di panca
piana sblocchi quella figura», e del 2026-11-06 «Tutti» e «I primi 5 +
altro»); lista dei file approvata dal Coordinatore.

**Decisione**:

1. **Si contano a ogni lettura, nessuna tabella**: il livello di un
   esercizio è la serie migliore sotto il tetto, da `gym_sets`, con la
   regola di `gym_catalog.measured` e `level_of` scritta in SQL
   (`gym_levels.py`); un test confronta le due. Niente migrazione: un
   account ha poche centinaia di serie.
2. **Contano tutti gli allenamenti, anche i privati** (scelta dell'utente,
   come i record personali di TASK-368): il profilo mostra figura,
   esercizio e valore, mai l'allenamento. Le serie aggiunte dopo «Stop»
   contano: la regola «solo dal vivo» è della classifica (parte F).
3. **Sul profilo** `gym_levels` in `GET /users/{public_id}`, prima il
   livello più alto, poi nell'ordine del catalogo. L'app mostra il blocco
   «🏋️ Gym» dopo i record e il VO₂ max: i primi cinque, gli altri sotto
   «Show more» (scelta dell'utente). Testi già approvati: «Gym», «Show
   more» e i sette nomi delle figure.
4. **Nel post** `new_levels` in `GET /drawings/{id}/exercises`: i livelli
   che l'allenamento supera rispetto a quelli cominciati prima, anche se
   salvati dopo. Seguono gli esercizi: nascosti loro, nascosti anche i
   livelli. L'app scrive «New level: {figure} · {exercise} {value}» sotto
   il riquadro nel Feed e sopra gli esercizi nella scheda.
5. **Il valore si legge come una serie del post**: kg o lb come dicono le
   unità (per mano col manubrio), «×30» per le ripetizioni, il tempo, la
   distanza.

**Conseguenze**: campi nuovi e facoltativi; le app vecchie li ignorano, e
il server può andare prima dell'app. Nessuna dipendenza, niente nativo:
impronta iOS invariata. Il server va col sì dell'utente.

## ADR-0327, precisazione — La parte C: le calorie della palestra e Salute

**Stato**: Attiva · 2026-11-06 · TASK-385 parte C, decisa dall'agente su
delega dell'utente dentro le sue scelte (la scelta 2, «Stima MET sempre»,
e del 2026-11-06 «Niente kcal» per gli esercizi nascosti); lista dei file
approvata dal Coordinatore.

**Decisione**:

1. **Si contano sul telefono, come per gli altri sport** (`gym/gymKcal.ts`,
   ADR-0318): energia attiva, ossigeno meno il riposo di Mifflin-St Jeor
   (o un MET senza i dati del corpo), 70 kg senza peso. Niente sul server.
2. **I blocchi cardio con la formula della macchina**:
   - tapis roulant (anche curvo): l'equazione ACSM della camminata sotto
     i 7 km/h, della corsa da 7 km/h (il mezzo dei 3,7–5 mph in cui
     l'ACSM lascia la scelta), con la velocità o i metri sul tempo, la
     pendenza solo in salita;
   - le altre macchine: il MET del Compendium 2024 copiato col codice:
     cyclette e reclinata 4,0 / 6,8 / 10,3 per fascia di livello (01214,
     01224, 01232), 6,8 senza livello (01200), spin 9,0 senza livello
     (01270); air bike 6,8 (01200); ellittica 5,0 / 9,0 (02048, 02049);
     vogatore coi metri per i watt del passo (2,80 / (s/m)³: 5,0 / 7,5 /
     11,0 / 14,0, 02071–02074), senza metri 7,3 (02070); ski erg 6,8
     (02080); scala, stepper e climber 9,3 (02065, il più vicino); arm
     ergometer 2,0 / 2,8 / 3,5 (02116, 02115, 02118); corda 11,0 (02068);
   - il livello di una macchina sulla scala comune 1–20: fino a 7 leggero,
     fino a 14 moderato, oltre vigoroso.
3. **Il resto del tempo** al MET dei pesi con più esercizi, 3,5 (02054):
   è la media di una sessione coi recuperi, che non si tolgono due volte.
   Un blocco di cui la formula non sa niente (tapis roulant senza velocità
   né metri, una macchina col nome libero) resta in quel tempo.
4. **Dove si vedono**: sotto il cronometro durante l'allenamento, sotto il
   tempo alla fine, sul riquadro e nella riga dei fatti del post, nel
   riquadro condiviso. Nessun testo nuovo: «kcal» come le corse.
5. **Esercizi nascosti, niente kcal** (scelta dell'utente del 2026-11-06,
   «Niente kcal»): chi non vede le serie non vede le kcal, perché un
   numero senza il cardio non sarebbe quello dell'autore. L'autore le
   vede sempre: l'API gli dà le sue serie.
6. **Salute** come il nuoto in piscina (TASK-400 B): con «Save», dopo il sì
   dell'utente e col permesso, l'allenamento di forza (Apple 50, Health
   Connect 70) con le kcal e le pause, niente percorso né distanza (i
   metri di un blocco sono del blocco); su Apple al chiuso
   (`HKIndoorWorkout`).

**Conseguenze**: solo JavaScript, nessuna dipendenza: impronta iOS
invariata, OTA col sì. Col battito (parte G) le kcal passano a Keytel.

## ADR-0327, precisazione — La parte F: la classifica mensile della palestra

**Stato**: Attiva · 2026-11-06 · TASK-385 parte F, decisa dall'agente su
delega dell'utente dentro le sue scelte (la 9, «Sì, così», e del
2026-11-06 «Profilo + esercizio nel post», «Per esercizio, almeno 3» e il
testo della privacy approvato); lista dei file approvata dal Coordinatore.

**Decisione**:

1. **Si conta a ogni lettura, nessuna tabella** (`gym_leaderboard.py`):
   le serie dei post pubblicati nel mese si leggono dall'indice del Feed
   (`drawings_published_idx`, un test lo verifica col piano), poi la serie
   migliore di ognuno, `row_number` e quanti sono. Mostra i primi 50 e chi
   chiede.
2. **Il mese** è quello di calendario di Roma, come i concorsi; contano gli
   allenamenti cominciati **e** pubblicati nel mese, così uno vecchio
   pubblicato tardi non entra.
3. **Cosa conta**: serie `live`, sotto il tetto della scala, post per
   tutti, esercizi mostrati (nascosti, la riga sparisce: come «Niente
   kcal» della parte C), non nascosto dalla moderazione, account non
   nascosto, corsa registrata con MuW. Il valore è quello dei livelli (kg
   assoluti, scelta 9). A pari valore vince la serie segnata prima.
4. **Segnalare una riga** è segnalare il suo post (`kind: "drawing"`): nessun
   tipo nuovo. Nascosto dalla moderazione, il post non conta più.
5. **Blocchi**: la classifica è una sola; chi è tenuto lontano da chi
   chiede non si vede, gli altri tengono il loro posto (come i concorsi).
6. **«Winner»** (scelta dell'utente): il primo di un esercizio in un mese
   finito con almeno 3 persone. Si conta nel profilo pubblico
   (`profiles.py`, `contest_wins` = concorsi + palestra), guardando solo i
   mesi e gli esercizi in cui l'account ha serie. Non in `USER_COLUMNS`:
   lì si calcolerebbe a ogni richiesta con il token (`current_user`), e
   `test_notifications` legge quelle colonne dividendole sulle virgole. La
   lista approvata diceva `accounts.py`: il cambio a `profiles.py` e a una
   riga di `ProfileHome.tsx` l'ha approvato il Coordinatore. L'app legge
   «Winner» dal proprio profilo pubblico. Nessuna push.
7. **Quando servirà una tabella**: quando la classifica di un mese
   supera i 200 ms sul server (il log delle richieste), o quando un mese ha
   più di 50 000 serie dello stesso esercizio. Allora una tabella
   `gym_monthly_best` (mese, esercizio, persona, valore, post), scritta al
   salvataggio e alla pubblicazione, e i vincitori scritti a mese chiuso
   come `close` dei concorsi.

**Conseguenze**: un endpoint nuovo e un campo che cambia valore; niente
migrazione. La privacy dice la palestra e la classifica (testo approvato
dall'utente il 2026-11-06). Server e OTA col sì dell'utente.
## ADR-0335 — Le indicazioni a schermo bloccato: notifica con un OTA, Live Activity nella 1.0.2

**Stato**: Proposto · 2026-11-05 · TASK-401. Scelta di prodotto
dell'utente (punto 1); il resto deciso dall'agente su delega dell'utente,
da confermare con le scelte ancora aperte del task.

**Contesto**: a schermo bloccato la corsa registra e la voce dice le svolte
(ADR-0225), ma sul lock screen non si vede niente. L'utente vuole vedere
«quella percentuale, svolta a destra, sinistra» senza sbloccare. Una
notifica locale è solo JavaScript (`expo-notifications` è già nella build
1.0.1) e arriva con un OTA; una Live Activity vuole un widget extension e
un modulo nativo, cioè una build per l'App Store.

**Decisione**:

1. **Tutte e due, in quest'ordine** (utente, «Live Activity, poi anche
   OTA»): parte A, una notifica locale con un OTA; parte B, la Live
   Activity (lock screen e Dynamic Island) nella build 1.0.2.
2. **Una sola uscita in più del navigatore**: notifica e Live Activity
   mostrano la stessa indicazione della voce, dallo stesso `onFix`; nessuna
   logica di guida nuova.
3. **La notifica**: solo con l'app dietro, senza suono, sempre con lo
   stesso identificativo (una alla volta), alla svolta annunciata, al fuori
   rotta e al rientro; si toglie a fine corsa e con l'app davanti. Permesso
   delle notifiche push, come il recupero della palestra (ADR-0327).
4. **La Live Activity si aggiorna dal telefono** quando cambia ciò che si
   vede, al massimo una volta al secondo; niente push di ActivityKit,
   niente server. Con la Live Activity attiva la notifica non parte.
5. **Il nativo**: widget extension SwiftUI in `apps/mobile/targets/
   live-activity/` con `@bacons/apple-targets`, più un modulo Expo locale
   (`start`, `update`, `end`). Il JavaScript controlla che il modulo ci sia:
   sulla 1.0.1 resta la notifica.
6. **La dipendenza con TASK-370**: `@bacons/apple-targets` arriva con la
   1.0.2 e la aggiunge TASK-401 B; TASK-370 (build 1.1) mette `targets/watch/`
   accanto. Versione e plugin si concordano con la sua sessione; la
   dipendenza e il codice nativo partono solo col sì dell'utente e il via
   del Coordinatore sulla lista dei file.

**Alternative**:

- **Solo la notifica**: arriva subito, ma non conta i metri e non c'è nella
  Dynamic Island. Scartata dall'utente come unica strada.
- **Solo la Live Activity**: niente fino alla revisione della 1.0.2.
  Scartata dall'utente.
- **Una libreria Live Activity già fatta** (per esempio `expo-live-activity`):
  porta il suo target e un aspetto a modello fisso; due sistemi di target
  nell'app quando arriva l'orologio. Meglio un solo `@bacons/apple-targets`.
- **Aggiornare la notifica fissa del servizio su Android**: expo-location
  non la cambia senza riavviare il GPS. Su Android la parte A manda la sua.

## ADR-0335, aggiunta — Il testo della notifica è la frase della voce

**Stato**: Proposto · 2026-11-05 · TASK-401. Scelta di prodotto
dell'utente.

Alla domanda «Cosa scrive la notifica a schermo bloccato?» l'utente ha
scelto **«Frase della voce + %»** (contro «Corta, stile navigatore»): il
titolo della notifica è la frase che la voce dice in quel momento, con la
freccia davanti; fuori rotta «Off the route»; sotto «{percent}% drawn ·
{distance} left». Le frasi della voce sono già approvate e tradotte in
cinque lingue; l'unico testo nuovo è «{distance} left», nelle unità scelte.
## ADR-0336 — Ruotare il disegno sulla mappa e aggiungere pezzi da tessere, tutto sul telefono

**Stato**: Accettato · 2026-11-06 (proposto il 2026-11-05) · TASK-402,
parti A (#857) e B (#873) in `main`. Scelta di prodotto
dell'utente («Aggiungere pezzi», punto 2); il resto deciso dall'agente su
delega dell'utente; confine con TASK-347 deciso dal Coordinatore.

**Contesto**: in «Draw on the map» (TASK-281, TASK-331) la figura si
sposta e si ridimensiona ma non si ruota, e una tessera sostituisce il
disegno invece di aggiungersi. L'utente vuole «ruotare il disegno di tot
gradi» e un elenco interno di figure «da poter selezionare e muovere sulla
mappa». La parte D di TASK-347 (ADR-0300) prevedeva già «seleziona / sposta
/ ruota (due dita) / ridimensiona», mai partita.

**Decisione**:

1. **Il giro è dell'app**: la figura gira in unità attorno al mezzo del suo
   riquadro (`mapdraw/turn.ts`), di 15° per tocco, del numero di gradi
   scritto o con due dita insieme al ridimensionamento (sullo schermo in
   pixel, non in lng/lat; sotto i 3° non gira). Niente campo nuovo nel
   contratto, niente motore toccato.
2. **I pezzi** (scelta dell'utente, «Aggiungere pezzi»): con «Add» una
   tessera aggiunge una forma o un'immagine sopra il disegno; ogni pezzo si
   seleziona con un tocco in «Move» e si sposta, si ridimensiona, si gira e
   si toglie da solo. Il primo pezzo dà il contorno, gli altri sono dettagli
   appesi col collegamento tratteggiato di TASK-331 parte B: la richiesta è
   l'`ImageOutline` di oggi. Al massimo 6 pezzi, e mai oltre
   `MAX_OUTLINE_POINTS`/`MAX_DETAIL_POINTS`.
3. **Una forma del catalogo girata, o unita ad altri pezzi, si manda come
   contorno** (le sue linee `down`), perché una forma mandata per nome non
   ha angolo; da sola e a 0° resta la forma per nome, come oggi.
4. **L'angolo è il punto di partenza del motore**: per le strade il motore
   può ancora girarla fino a ±45° (TASK-232, `MAX_TILT_DEG`). L'angolo
   esatto arriva con il disegno `anchored` di TASK-347.
5. **Confine** (Coordinatore): la parte D di TASK-347 passa a TASK-402;
   magnete, penna a punti, nodi, righello, blocco della mappa e cronologia
   restano a TASK-347 con le parti B, C ed E.

**Alternative**:

- **«Elenco delle parti»**: un elenco delle linee già disegnate, da cui
  sceglierne una e muoverla. Scartata dall'utente.
- **Solo la rotazione**, con la fila di tessere di oggi. Scartata
  dall'utente.
- **Un campo `rotation_deg` nella richiesta**, rispettato dal motore: vuole
  contratto, motore e la prova degli stessi percorsi; lo fa meglio il
  disegno `anchored` di TASK-347.
- **Girare in lng/lat sulla pagina della mappa**, come oggi il
  ridimensionamento: lontano dall'equatore storce la figura (un grado di
  longitudine è più corto di uno di latitudine).

**Precisazioni della parte B** (2026-11-06, decise dall'agente su delega
dell'utente):

- **I pezzi stanno nell'app** (`mapdraw/pieces.ts`): il primo pezzo resta
  `placed`, su cui lavorano penna, linea, gomma e piega; gli altri sono una
  lista accanto. `joinedPieces` li unisce sul piano del primo: il contorno
  del primo; poi, pezzo per pezzo, il suo contorno come dettaglio chiuso,
  dal suo angolo più vicino al disegno; entro `SNAP_SHARE` parte sul
  disegno senza collegamento, più lontano con il collegamento tratteggiato
  (`linked`), percorso andata e ritorno. I dettagli del pezzo si riattaccano
  al suo contorno. I pezzi aggiunti si semplificano al 1% della loro
  grandezza (`SIMPLIFY_SHARE`), il primo no.
- **Un pezzo solo non passa da `joinedPieces`**: la richiesta è esattamente
  quella di prima (anche una forma per nome, anche a penna alzata).
- **«Change» con più pezzi** cambia il pezzo scelto, o il primo senza
  scelta, dov'è e grande com'è.
- **Con più pezzi, spostare la figura intera è un passo di «Undo»**, come
  spostare un pezzo: ogni passo ricorda i pezzi dopo il primo, e un
  movimento senza passo li farebbe tornare indietro da soli.
- **Limiti**: il totale dentro i limiti di «Draw» (tutti i pezzi
  ridimensionati insieme attorno al mezzo del primo); un pezzo scelto non
  scende sotto un sesto della distanza più corta (`lowest / MAX_PIECES`).
  Un cambio che porterebbe il disegno oltre i punti del contratto non si
  fa e dice `too_much`.
- **Il tocco che sceglie**: la pagina della mappa dice `{type: "tapped",
  lngLat, metresPerPx}` per un dito che non si muove con «Move», solo
  quando ci sono pezzi; l'app sceglie il pezzo con la linea più vicina
  entro la portata del dito, se no il più piccolo nel cui riquadro cade il
  tocco. In `setCanvas` tre campi facoltativi: `choosing`, `chosen` (le
  linee del pezzo scelto, le sole che le dita muovono; le altre in un layer
  più chiaro, `FAINT_OPACITY`) e `box` (il riquadro girato col pezzo).
- **«Change» e il «Change» della corsa**: in italiano il secondo è
  «Differenza». Un testo uguale in inglese e diverso altrove si scrive
  `t("Change@@piece")`: `translate` mostra in inglese quello che viene prima
  di `@@` (`CONTEXT_MARK`), le tabelle hanno la chiave intera. È una
  modifica al traduttore di tutta l'app: `apps/mobile/src/i18n/translate.ts`
  e il suo test `translate.test.ts`; i testi senza `@@` restano come prima.

## ADR-0337 — «Edit the drawing» torna sotto le opzioni A, B e C del risultato di «Draw»

**Stato**: Proposto · 2026-11-05 · TASK-403. Scelta di prodotto
dell'utente; il come deciso dall'agente su delega dell'utente.

**Contesto**: il tasto «Edit the drawing» sotto il risultato di «Draw» era
stato tolto su richiesta dell'utente il 2026-10-29 (TASK-340, aggiunta ad
ADR-0288), e il 2026-11-04 l'utente aveva confermato «No, resta tolto»
(TASK-369, scelta 7 di ADR-0313). Il 2026-11-05 l'utente ha chiesto:
«Possibilità di di modificare anche quando seleziono quando fai tu il
calcolo del disegno tipo il coniglio poi mi dai le tre opzioni AB e C però
lì non c'è la possibilità di modificare l'immagine». Ricordati i due «no»,
alla proposta di rimettere il tasto ha risposto «Sì, rimettilo».

**Decisione**:

1. Sotto il risultato di «Draw», dopo «Another figure» e sopra «Start»,
   c'è di nuovo «Edit the drawing» (testo già tradotto, nessun testo nuovo).
2. Il tasto mette sulla mappa di «Draw on the map» la **linea dell'opzione
   scelta** (A, B o C), dov'è e grande com'è: lo stesso `editTrackOf` /
   `trackInPlace` delle schede (TASK-346, ADR-0299; TASK-369, ADR-0313).
   Per un'emoji o una parola si modifica la linea del percorso, non la
   figura chiesta; anche dal risultato di un disegno a mano si apre la linea
   dell'opzione scelta.
3. Niente parte verso l'API prima di «Draw route». Solo JS: contratto,
   motore, API e impronta iOS invariati.
4. Vale in ogni sport che arriva al risultato, sull'acqua e a nuoto
   compresi, come per le schede.

Questa decisione supera, per il solo risultato di «Draw», l'aggiunta di
ADR-0288 (TASK-340) e la scelta 7 di ADR-0313, che restano scritte com'erano.

**Alternative**:

- **La figura chiesta** (l'emoji o il disegno di partenza) invece della
  linea dell'opzione: scartata, perché A, B e C sono linee diverse e
  l'utente vuole modificare quella che ha davanti; per un'emoji, poi, la
  figura non si modifica (ADR-0288).
- **Tornare al disegno di partenza**, come faceva il tasto prima di
  TASK-340 dal risultato di «Freehand»: lo fa già «←».

## ADR-0335, aggiunta 2 — La Live Activity mostra solo la guida

**Stato**: Proposto · 2026-11-05 · TASK-401. Scelta di prodotto
dell'utente.

Alla domanda «Cosa mostra la Live Activity durante una corsa con
percorso?» l'utente ha scelto **«Solo la guida»** (contro «Guida + numeri
della corsa»): freccia, metri alla svolta, la svolta in breve e la via; una
barra con la percentuale disegnata e la distanza che manca. Nella Dynamic
Island compatta la freccia e i metri. Fuori rotta il segno «⚠» e i metri
per rientrare. Tempo, passo e distanza fatta restano sulla schermata della
corsa.
Senza percorso nessuna Live Activity (scelta dell'utente «No, solo con
percorso», contro «Sì, con i numeri»).
A fine corsa, all'arrivo, il riquadro mostra «You have arrived.» con la
barra al 100% e sparisce da solo dopo 5 minuti; con «Stop» prima
dell'arrivo sparisce subito (scelta dell'utente «Riepilogo per qualche
minuto», contro «Sparisce subito»).
L'utente dà il sì a `@bacons/apple-targets` 5.0.0 e al modulo locale in
Swift nella build 1.0.2 («Sì, nella 1.0.2»).

---

## ADR-0314, precisazione — La parte A2: l'app SwiftUI dell'orologio

**Stato**: Attiva · 2026-11-06 · TASK-370 parte A2, deciso dall'agente su
delega dell'utente; lista dei file approvata dal Coordinatore; numeri in
più sullo schermo e logo chiesti dall'utente durante la prova.

**Decisione**:

1. **`targets/watch/`** è il target `type: "watch"` di
   `@bacons/apple-targets` (bundle `.watchkitapp`, watchOS 10, HealthKit).
   Lo costruisce solo un `match` che nomina `watch`: oggi solo con
   `MUW_WATCH=1`, da A-flip in `app.json`. La dipendenza la porta TASK-401 B
   (confermato dal Coordinatore il 2026-11-05); A2 non tocca
   `package.json`, `app.json` né il lock.
2. **`Core/` fuori dai file del target, come pacchetto locale**: il plugin
   (5.0.0) mette l'intera cartella del target in un
   `PBXFileSystemSynchronizedRootGroup` ed esclude solo `Info.plist` e
   `expo-target.config.js`: senza intervento compilerebbe `Package.swift`,
   `Core/Tests` e `.build`, e `Bundle.module` di WatchCore non esisterebbe.
   `plugins/withWatchCore.js` aggiunge `Core` (e il `.gitignore`) alle
   eccezioni e collega `Core/` come `XCLocalSwiftPackageReference` con il
   prodotto `WatchCore`, con lo stesso mod `xcodeProjectBeta2` del plugin.
   Va **prima** di `@bacons/apple-targets` nei plugin: Expo esegue le
   modifiche Xcode in ordine inverso. Verificato: nel build nessun file di
   `Core/Tests`, `sports.json` nel bundle `WatchCore_WatchCore.bundle`.
3. **`MUW_WATCH=1`** in `app.config.ts` chiama `plugins/watchConfig.js`:
   se `app.json` ha già il plugin allarga `match` (`live-activity` →
   `{live-activity,watch}`), altrimenti lo aggiunge con `match: "watch"`
   (per le prove prima di 401 B, col pacchetto installato solo in locale).
   È JavaScript perché Expo legge `app.config.ts` da solo e non risolve un
   import TypeScript da lì (provato: «Cannot find module»). Si carica con un
   `require` solo quando la variabile c'è: l'impronta conta ogni file che
   la config carica (`expoConfigPlugins`), e con un `import` in cima era
   `c770de78` invece di `6f8bba4c` anche senza `MUW_WATCH` (misurato).
4. **Lo stato è di WatchCore, la registrazione di HealthKit**:
   `HKWorkoutSession` + `HKLiveWorkoutBuilder` (salva l'allenamento in
   Salute alla fine: un'attività, un allenamento), mirroring al telefono
   avviato a ogni allenamento, `WCSession` coi messaggi di WatchCore: lo
   stato a ogni cambio e ogni 5 s, il battito ogni 5 s; comandi dal telefono
   (avvio, pausa, ripresa, fine). Uno sport che l'orologio non offre,
   mandato da un telefono più nuovo, è lasciato fuori. Pausa e ripresa coi
   due tasti del sistema passano dallo stesso stato.
5. **I numeri come il pannello della corsa dell'app** (`RunPanel.tsx`), su
   richiesta dell'utente durante la prova («andatura, battito, andatura
   ultimo km… più informazioni»): pagina principale tempo, distanza,
   «Pace now», battito; seconda pagina «Avg pace», «Last km» («Last mi»,
   «Last 500 m» in acqua), calorie; in palestra tempo, calorie e battito.
   «–» dove il numero non c'è ancora, come `NO_NUMBER`. «Pace now» e
   «Last km» sono in `WatchPaces` (WatchCore, XCTest) con le regole di
   `runStats.ts` (ultimi 200 m, fermo oltre 20 min/km, 60 nel nuoto; la
   fine del km in proporzione fra due campioni), ma su distanza e tempo in
   movimento di Salute invece che sui fix GPS: niente fixture comuni,
   perché gli ingressi sono diversi. Tempo, distanza e passo invece si
   scrivono con `WatchFormat`, tenuto uguale a `clockLabel`,
   `runDistanceLabel`, `paceLabel` e ai passi di pagaia e nuoto da
   `Fixtures/format.json`, letto da XCTest e da jest (anche i mezzi esatti
   di `toFixed`, dove `%.2f` arrotonda al pari). La bici resta a passo,
   come in A1; la velocità è della parte C.
6. **Il logo** (richiesta dell'utente): in cima alla lista degli sport e
   nel riepilogo, il cuore dell'icona e il nome di `splash-logo-dark.png`,
   immagini generate dal plugin a ogni prebuild (`Assets.xcassets` è nel
   `.gitignore` del target). Nessun colore scritto a mano: colori di
   sistema e quelli delle immagini.
7. **I testi** sono solo quelli che l'app ha già, con le sue traduzioni:
   `src/watch/watchTexts.ts` li elenca, un test controlla che ognuno sia in
   ogni tabella, `scripts/watch-texts.sh` scrive
   `<lingua>.lproj/Localizable.strings`; le due frasi di Salute sono quelle
   dell'iPhone (`app.json`, `locales/*.json`) in `InfoPlist.strings`. Un
   nome di sport ancora senza traduzione resta inglese, come nell'app.
8. **Le unità** sono quelle del sistema di misura dell'orologio, come fa
   l'app finché non se ne sceglie una; la scelta del telefono arriva in A3.

**Alternative**:
- **Compilare i sorgenti di WatchCore nel target** invece del pacchetto:
  niente plugin locale, ma `Bundle.module` non c'è fuori da SwiftPM e i
  test andrebbero esclusi lo stesso; scartata.
- **Spostare `Core/` fuori da `targets/watch/`**: cambierebbe A1 già in
  `main` (percorsi di jest e di `watch.yml`); scartata.

**Conseguenze**: senza `MUW_WATCH` la config è quella di prima e
l'impronta iOS resta quella di `main` (misurata nella PR). La prova sul
polso aspetta una build firmata con il team dell'utente; watchOS 27 non gira
più sulla Series 6, ma l'app chiede watchOS 10.
## ADR-0321, precisazione — La parte B: Hike nell'app, «Soon» fino al server

**Stato**: Accettato · 2026-11-05 · TASK-377 parte B. Lista dei file
approvata dal Coordinatore; le scelte tecniche sono decise dall'agente su
delega dell'utente.

1. **«Hike» sta dopo «Walk» in «Settings»**, `ready: false` finché il
   server non ha la parte A (0051 e deploy). Si accende con una riga, col
   sì dell'utente.
2. **Offerta quando è pronta.** `activityOffered` legge una tabella,
   `OFFERED_WHEN_READY` (camminata → «Walk», hike → «Hike»): la ricerca e
   il modulo per pubblicare non offrono la hike prima della sua riga, così
   l'API non risponde 422 a un filtro che l'app mostra.
3. **L'avviso sui sentieri è un campo del profilo**, `caution`, letto in un
   punto solo: `RoutePanel.tsx` lo mostra sotto ogni percorso dello sport,
   col bordo «caution», fuori dalle due note del motore di TASK-337.
4. **Il tempo stimato** usa il passo delle camminate (`timeAt: "walker"`,
   12:00/km senza camminate). Le hike non entrano nel passo: dipende dalla
   salita e piegherebbe la stima della camminata.
5. **Gli import**: FIT `sport` 17 (hiking), GPX/TCX con «hik…», il numero
   4 di Strava. Prima «hiking» era nessuno sport.
6. **L'orologio** tiene la hike come la camminata: non entra in
   `NOT_ON_WATCH`. Se TASK-370 la vuole fuori, è una riga sua.
7. **La rete resta quella di A** (domanda all'utente, 2026-11-05: «Va bene
   così»): in montagna circa metà di un'escursione sta su strade
   secondarie tranquille. Pesare gli archi, l'alternativa di ADR-0321, è un
   task a parte del motore, dopo le prime escursioni vere.

## ADR-0334 — Il nuoto in piscina: una scelta dentro il nuoto, le vasche scritte alla fine, il post senza traccia

**Stato**: Proposto · 2026-11-05 · TASK-400. Le scelte di prodotto (come si
contano le vasche, le lunghezze, dove sta, il Feed, i testi) sono
**dell'utente**, prese una alla volta; il come è deciso dall'agente su
delega dell'utente. Numeri dal Coordinatore.

**Contesto**: il nuoto in acque libere (TASK-323, ADR-0283) ha lasciato
fuori la piscina. In piscina il GPS non dà la distanza; il telefono resta
fuori dall'acqua. Il server e l'app sanno già tenere e mostrare una corsa
senza traccia (TASK-385, ADR-0327) e tenerla lontana dalle app che non la
sanno leggere (ADR-0328).

**Decisione**:

1. **Uno sport, due posti.** Lo sport `swim` resta uno e si chiama «Swim»;
   in «Draw» si sceglie «Open water» (com'è oggi) o «Pool». L'attività resta
   `swimming`; la piscina è una corsa `swimming` **senza traccia** con i
   suoi campi. L'ultima scelta fra i due resta sul telefono.
2. **La vasca**: 25 m, 50 m o «Other» da 10 a 100 m, con al più due
   decimali (33,33 m). Tenuta sul telefono, proposta la volta dopo. Niente
   yard.
3. **Le vasche alla fine.** Durante la nuotata c'è il cronometro (con
   «Pause»), nessun GPS. Alla fine «How many lengths?» propone la stima
   `round(tempo / (passo × vasca / 100))` con il passo/100 m medio delle
   ultime nuotate in piscina, o 2:00/100 m se non ce ne sono; il numero si
   corregge a mano, da 1 a 1000. Metri = vasche × vasca; passo/100 m =
   tempo × 100 / metri.
4. **Server (parte A)**: un endpoint suo, `PUT /me/pool-swims/{key}`, come
   la palestra (ADR-0327 A, punto 1): `PUT /me/activities` vuole una
   traccia. La corsa ha `track` nullo e `distance_m` dalle vasche; una
   tabella `pool_swims` (`pool_length_m`, `lengths`) con il numero di
   migrazione libero al merge; nessun punteggio di forma, nessun record di
   corsa, nessun gioco.
5. **Chi lo riceve**: un valore nuovo, `pool`, in `X-MuW-Reads`
   (`packages/shared-types/fixtures/reads.json`). Un post di piscina passa
   solo se l'app dichiara `swimming`, `trackless` **e** `pool`: un'app con
   la palestra ma senza la piscina lo mostrerebbe senza vasche.
6. **Salute** (parte B): HealthKit, allenamento `swimming` con
   `HKMetadataKeySwimmingLocationType` = piscina, `HKMetadataKeyLapLength`
   e la distanza a nuoto; Health Connect, `EXERCISE_TYPE_SWIMMING_POOL` con
   la distanza. Dove basta, dal profilo dello sport (`sports/swimming.ts`)
   invece di toccare `health/appleWorkout.ts` e `healthConnectWorkout.ts`,
   che nella 1.0.2 cambiano con TASK-374 C, 345 C e 397 C. Nessun permesso
   nuovo: il tipo dell'allenamento non è un permesso.
7. **Il post** (parte C): senza mappa, come la palestra (ADR-0327 D), con
   vasche, metri, tempo e passo/100 m e la solita scelta di visibilità.
8. **Ordine e accensione**: A, poi B con C. Server, OTA e accensione nelle
   build dello store ciascuno col sì dell'utente. L'Apple Watch (TASK-323 E)
   potrà poi contare le vasche da solo.

**Conseguenze**: nessuna dipendenza nuova, nessun permesso nuovo di Salute.
Il nome dello sport cambia da «Open water swim» a «Swim» in tutte le lingue
(testi approvati, tabella in `tasks/TASK-400.md`). Una migrazione nuova.

**Scartato**: un tocco grande per vasca (mani bagnate, ci si deve fermare
ogni volta); uno sport nuovo «Pool swim» (scelta dell'utente); le yard (per
ora); mandare il post a chi dichiara solo `trackless` (lo vedrebbe senza le
vasche).
---

## ADR-0322, precisazione — La parte A: Gravel come la bici, MTB con una rete sua, l'impronta del motore resta

**Stato**: Accettato · 2026-11-06 · TASK-378 parte A. Lista dei file e
impronta: scelte del Coordinatore; le scelte tecniche sono decise
dall'agente su delega dell'utente.

**Contesto**: la parte A porta `gravel_biking` e `mountain_biking` nel
motore, nel contratto e nell'API, e i loro profili nascosti nell'app, come
377-A per la hike (precisazione di ADR-0321).

**Decisione**:

1. **L'ordine del contratto**: running, cycling, paddling, swimming,
   hiking, mountain_biking, walking, gravel_biking. MTB è un'attività del
   motore, dopo la hike. Gravel si disegna come una bici in
   `route_engine/walking.py` (`DRAWN_AS`, accanto alla camminata disegnata
   come una corsa), e segue la camminata. Così `walking.py` resta fuori
   dall'impronta (`WALK_ONLY`) e il Gravel non cambia nulla del motore.
2. **Sensi unici e tratti a piedi sono una proprietà della rete**
   (`Network.by_bike`, `networks/base.py`): `network.one_way_streets`, e
   quindi i controlli di `validation.usability` (sterrato, a piedi con la
   bici), la leggono invece del nome `bike`. `bike_ways` prende le regole
   di una rete (`ride`) e il suo nome; `download_ways` scarica le vie con i
   tag che le regole leggono. La bici non cambia.
3. **La rete `mtb`** (`networks/mtb.py`) ha le regole del banco della
   parte 0, uguali a `out/TASK-378/loader.py`:
   - il filtro Overpass della bici, che scarica già i sentieri;
   - i sentieri aperti alle bici fino a S1;
   - quelli non chiusi alle bici fino a S2, o fino a T2 se non dicono
     `mtb:scale`;
   - il resto come la bici, con le `track` di ogni grado.

   Un sentiero oltre S2 si fa a piedi con la bici anche se è segnato
   ciclabile: il limite S2 è dell'utente.
4. **L'impronta resta quella di prima** (`SAME_ROUTES_AS`): 54061c20df45 →
   9be259696402, e lo stesso per i nuoti e gli esempi di canoa dell'app.
   Il comportamento nuovo è solo un'attività senza percorsi tenuti, come
   per la hike. I percorsi di prima sono provati uguali:
   - i nove percorsi fissi di `test_same_routes.py` (darwin-arm64);
   - il banco su sei zone, contro `main` con la stessa cache: corsa 54/54,
     bici 54/54, canoa 27/27, identici punto per punto.
5. **Nell'API**:
   - MTB ha zone sue, grandi come quelle della bici (`longest`), senza
     nomi delle strade, una sola in memoria;
   - Gravel usa le zone della bici, come la camminata quelle della corsa;
   - Strava `MountainBikeRide` e `GravelRide`;
   - il `<type>` del GPX è il nome dell'attività;
   - i record sono quelli della bici (`BY_BIKE`), separati.
     `personal_bests` li conta per ogni corsa, come quelli della bici, e il
     profilo mostra quelli delle corse di quello sport. La 0052 allarga
     anche `run_bests_sport_check`.
6. **Nell'app**:
   - i profili entrano nascosti: nessuna riga in «Settings» e nessun chip
     nella ricerca (`searchFilters.ts`);
   - il nome resta senza `tLater` e l'energia non si conta fino alla parte
     B;
   - nessuna rete sul telefono: li disegna solo il server;
   - `sports.json` dell'orologio li elenca, come la hike.

**Server**: migrazione 0052 e deploy, col sì dell'utente. Nessuna notte di
esempi.

## ADR-0334, precisazione — La parte A: il nuoto in piscina nel server

**Stato**: Attiva · 2026-11-06 · TASK-400 parte A, decisa dall'agente su
delega dell'utente; lista dei file e migrazione `0053` dal Coordinatore.

1. **Un endpoint suo**, `PUT /me/pool-swims/{key}`, come la palestra: la
   corsa ha `activity` `swimming`, `track` nullo e `distance_m` = vasche ×
   vasca, al metro. `GET /me/pool-swims/{key}` al proprietario, `GET
   /drawings/{id}/pool-swim` (vasca e vasche) a chi vede il disegno.
2. **La vasca al centimetro** (`numeric(5, 2)`, 10–100 m): 33⅓ m si tiene
   33,33 m e 30 vasche fanno 1000 m. Le vasche da 1 a 1000.
3. **Un tetto di velocità**, 2,5 m/s (sopra i record del mondo sui 50 m):
   oltre è `422`, perché vasche o vasca sono scritte male. Il telefono lo
   controlla prima (parte B).
4. **Il CHECK delle corse senza traccia** si allarga a `swimming`; un CHECK
   non legge `pool_swims`, quindi è l'API che non salva mai un nuoto senza
   traccia fuori da `pool_swims.py`.
5. **Il disegno apre solo il caso della piscina** (`drawings.py`, con la
   condizione del Coordinatore): una corsa con una riga in `pool_swims` si
   pubblica solo come `swimming`. Ogni altra corsa senza traccia resta col
   `NOT_TRACKLESS` di prima (solo attività di `TRACKLESS_ACTIVITIES`): una
   corsa di Salute senza GPS pubblicata come `running` arriverebbe senza
   mappa ad app che non la sanno mostrare, perché nessun valore di
   `X-MuW-Reads` la copre.
6. **`pool` in `X-MuW-Reads`**, entrato dopo TASK-378 A: `Reads.pool`;
   chi dice `swimming` e `trackless` ma non `pool` riceve i nuoti con la
   traccia e non quelli senza (`r.activity <> 'swimming' OR r.track IS NOT
   NULL` nell'SQL). `this_app` in `reads.json` resta senza `pool` finché
   l'app non lo dice (parte B).

**Conseguenze**: una migrazione, nessuna dipendenza, nessun testo
dell'app, impronta iOS e del motore invariate (`pool_swims.py` e
`drawings.py` non sono in `engine.zip`). Server col sì dell'utente.

## ADR-0334, precisazione — La parte B: l'app registra il nuoto in piscina

**Stato**: Attiva · 2026-11-06 · TASK-400 parte B, decisa dall'agente su
delega dell'utente; lista dei file dal Coordinatore.

1. **Una cartella sua**, `apps/mobile/src/pool/`, sul modello della
   palestra: la nuotata in corso in un file (un'app riaperta la ritrova),
   uno schermo sopra l'app dallo «Start swim» al «Save», i nuoti salvati
   senza rete in un file loro, mandati alla prima rete. La chiave si fa come
   quella della palestra (`gymKey`): non c'è un primo punto GPS.
2. **«Open water / Pool» sta in cima a «Draw»** con lo sport «Swim»; in
   «Pool» spariscono partenza, forma e «Draw route». Scelta, vasca e gli
   ultimi cinque passi/100 m restano sul telefono (`pool-choice.json`); la
   stima di «How many lengths?» usa la media di quei passi, o 2:00/100 m.
3. **Il limite di 2,5 m/s sul telefono**: «+» si ferma all'ultimo numero di
   vasche sotto il limite, un numero più alto scritto a mano resta non
   valido (bordo rosso, «Save» spento). Nessun testo nuovo: una frase che
   spieghi il perché vorrebbe un testo da approvare.
4. **Salute**: `Workout` ha un campo `pool` facoltativo; con quello
   `appleWorkout.ts` mette `HKSwimmingLocationType` = piscina e
   `healthConnectWorkout.ts` il tipo `EXERCISE_TYPE_SWIMMING_POOL`. I
   numeri stanno nel profilo (`sports/swimming.ts`). Nessuna traccia e
   nessuna energia, come il nuoto in acque libere.
5. **La vasca non va in Apple Salute (limite)**: `HKMetadataKeyLapLength`
   vuole un `HKQuantity`, e `@kingstinct/react-native-healthkit` 16.2.0
   passa i metadati come `AnyMap`, che arriverebbe a HealthKit come un
   dizionario: il salvataggio di tutto l'allenamento fallirebbe. Salute
   riceve il nuoto in piscina con i metri, senza la lunghezza della vasca,
   finché la libreria non la porta. Accettato dal Coordinatore.
6. **«My activities»**: una corsa `swimming` senza traccia e senza percorso
   è un nuoto in piscina; la sua riga mostra la tessera 🏊, «Pool swim»,
   metri, tempo e passo, e non apre una mappa che non ha. Il post è la
   parte C.
7. **`pool` in `this_app`** (`reads.json`, `api/reads.ts`): dalla parte B
   «My activities» riceve i nuoti in piscina. Nessun post ne arriva prima
   della parte C, che li pubblica. Tre test dell'API che leggevano
   `this_app` senza `pool` cambiano con lui.

**Conseguenze**: nessuna dipendenza, nessun permesso nuovo, solo JS; il
nome dello sport è «Swim» in ogni lingua. OTA e store col sì dell'utente.

## ADR-0334, precisazione — La parte C: il post del nuoto in piscina

**Stato**: Attiva · 2026-11-06 · TASK-400 parte C, decisa dall'agente su
delega dell'utente; lista dei file dal Coordinatore.

1. **Un nuoto in piscina si riconosce dalla linea**: un post o un disegno
   `swimming` senza linea (`isPoolLine`). Un nuoto in acque libere ne ha
   sempre una. Nessun campo nuovo nel contratto.
2. **Il post come quello della palestra** (ADR-0327 D): a fine nuotata il
   modulo (foto, titolo, «How did it go?», persone, chi lo vede), con la
   tessera 🏊 fra le foto e fino a dieci foto; mai ordinato, prima le foto
   e la tessera in fondo. Si manda dopo il `PUT /me/pool-swims/{key}`,
   dal file dei disegni in attesa, come `swimming`. L'attività resta solo
   «Swim» (l'API vuole `swimming`) e non c'è la gara del mese.
3. **La tessera**: «Pool swim», vasche e vasca (da `GET
   /drawings/{id}/pool-swim`, chiesto una volta per post), metri, tempo e
   passo/100 m; senza le vasche (un'app a cui non arrivano) restano metri,
   tempo e passo. Nel Feed, nelle griglie del profilo, nella ricerca e
   nell'immagine condivisa. La scheda del disegno scrive vasche × vasca e
   passo sotto i fatti, e non offre «Draw it near me» né «Edit the
   drawing».
4. **L'immagine condivisa** è la tessera sola, come la palestra: niente
   risultati, emoji, video né Strava. Dal proprio nuoto le vasche vengono
   da `GET /me/pool-swims/{key}`; dal Feed, che non ha la chiave, da `GET
   /drawings/{id}/pool-swim` (`PostRun.drawingId`, messo da
   `postOfDrawing` in `feed/ActionBar.tsx`).
5. **Nei file condivisi** poche righe: un `pool` in `PostComposer` e
   `DrawingForm`, `alone` in `ActivityChips`, un ramo nella tessera di
   `FeedPost`, `DrawingCard`, `DrawingsGrid`, `DrawingResultCard` e
   `SharePost`. Il resto in `apps/mobile/src/pool/`.

**Conseguenze**: nessun testo nuovo (solo i testi approvati), nessuna
dipendenza, solo JS. Il post arriva solo alle app che dicono `pool`
(ADR-0334, punto 5). Server, OTA e store col sì dell'utente.
## ADR-0310, precisazione — Un percorso di MuW non dice quanto somiglia

**Stato**: Accettato · 2026-11-06 · TASK-405. Deciso dall'agente su
delega dell'utente, lista dei file approvata dal Coordinatore.

I percorsi di MuW non hanno punteggio da mostrare (TASK-365: ogni percorso
passa dall'occhio, non dal punteggio del motore), ma il foglio aperto dal
Feed diceva «looks 100% like it» per il `similarity: 1` messo solo perché
il tipo vuole un numero.

1. **Il segno è un campo a parte**, `RecommendedRoute.scored?: false`,
   messo solo da `muwCardRoute` e portato da `optionsOf` anche a percorso
   caricato. Assente per ogni altro percorso, che resta com'è.
2. **`ExploredCard`** con `scored === false` scrive `{title} · {city}`
   come stringa composta: nessuna chiave, nessun testo nuovo.
3. **`similarity` resta un numero**: renderla opzionale toccherebbe una
   decina di file che la leggono (card, preferiti, `RouteResult`).

**Scartato**: riconoscere i percorsi di MuW dall'id (`muw:`) nella card,
un caso speciale sul nome.

## ADR-0322, precisazione — La parte B: Gravel e MTB nell'app

**Stato**: Accettato · 2026-11-06 · TASK-378 parte B. Testi, ordine dei
record e «ready» sono scelte dell'utente (TASK-378.md); lista dei file del
Coordinatore; il resto è deciso dall'agente su delega dell'utente.

1. **In «Settings»** gli sport si chiamano `gravel` e `mtb`, dopo «Hike»,
   nell'ordine dei profili. `ready` resta falso finché l'utente non li
   accende (il Coordinatore glielo chiede con la parte B in `main`): nei
   build dello store non si vedono, in Expo Go dicono «Soon». Ricerca e modulo per pubblicare li offrono solo da
   pronti (`OFFERED_WHEN_READY`); via la lista `NOT_YET` di
   `searchFilters.ts`.
2. **Partire senza percorso** è quello della bici, «Ride without a
   route», con l'emoji dello sport: nessun testo nuovo.
3. **L'energia** (Compendium 2024): Gravel con le fasce di velocità della
   bici, copiate nel suo file perché un file di sport non importa un altro
   sport; MTB «bicycling, mountain, general» (01009), 8,5 MET a ogni
   velocità, perché su un sentiero la velocità dice poco della fatica.
4. **Salute**: Apple `.cycling` (13) e Health Connect `BIKING` (8),
   controllati sulle librerie dell'app: nessuna delle due ha un tipo
   gravel o MTB.
5. **I file importati**: in un FIT il sub-sport di una bici (sport 2)
   dice `mountain` (8), `gravel_cycling` (46) ed `e_bike_mountain` (47),
   numeri del profilo dell'SDK Garmin; ogni altro resta una bici. Nei GPX
   e TCX le parole «gravel», «mountain bike» e «mtb», mai
   «mountaineering».
6. **I record**: `PersonalBest.sport` del contratto si allarga ai due
   sport, e il profilo li mostra dopo quelli della bici, «GRAVEL» e
   «MTB».
7. **Nessuna rete sul telefono**: li disegna solo il server, come nella
   parte A. L'impronta iOS non si muove (solo JavaScript) e `sports.json`
   dell'orologio non cambia.
## ADR-0338 — Le stazioni sciistiche: dati OSM, meteo MET Norway dal server, la giornata completa

**Stato**: Proposto · 2026-11-06 · TASK-406. Le scelte di prodotto sono
dell'utente (domande aperte in `tasks/TASK-406.md`); il come è deciso
dall'agente su delega dell'utente.

**Contesto**: l'utente vuole tutte le stazioni sciistiche nella ricerca
«Ski», con com'è la neve e il meteo. In «Record your day» vuole anche:
- la stazione;
- il modello;
- il tipo di neve;
- il numero degli impianti;
- i km totali;
- gli impianti presi («copia Slopes»).

TASK-375 ha già la giornata, le risalite e gli impianti presi per nome. Ha
anche gli estratti OSM del mondo sul server.

**Decisione (proposta)**:

1. **Le stazioni** sono le aree OSM `landuse=winter_sports` con un nome,
   prese dagli stessi estratti di TASK-375 (niente Overpass, ADR-0154). Il
   server le salva con il numero degli impianti e i km di piste, contati
   dai riquadri dello sci.
2. **Il meteo** viene da MET Norway Locationforecast: dati aperti CC BY
   4.0, permessi anche a un'app commerciale. Lo chiede il server, con:
   - un User-Agent che identifica MuW;
   - le coordinate della stazione, a 4 decimali, mai quelle dell'utente;
   - una cache fino a `Expires`.

   L'app mostra l'attribuzione. Un contatto o una chiave stanno solo in
   `.env` e `.env.example`.
3. **Com'è la neve**: la proposta è la stima di MET Norway (precipitazione
   sotto lo zero) più il tipo di neve segnato dai membri nelle ultime 24
   ore. Un bollettino a pagamento solo se l'utente lo sceglie.
4. **«Copia Slopes»**: si prendono le funzioni, non il nome, la grafica o i
   testi di quell'app.
5. Cinque parti: A stazioni sul server, B meteo, C ricerca «Ski», D
   «Record your day», E prova sulla neve. Ogni parte ha la sua lista dei
   file approvata dal Coordinatore.

**Alternative**:

- **Open-Meteo**: scartato, perché il piano gratis è solo per uso non
  commerciale.
- **Il meteo chiesto dal telefono**: scartato, perché manderebbe a un
  terzo la posizione dell'utente e non avrebbe una cache condivisa.
- **Le stazioni da un servizio esterno**: scartato. Costerebbe, e OSM le ha
  già, nello stesso estratto di impianti e piste.

## ADR-0333, precisazione B — I capi nell'app: testi a parte, un ponte per il compositore, i capi accanto alle foto

**Stato**: Accettato · **Data**: 2026-11-06 · **Task**: TASK-394 parte B

Deciso dall'agente su delega dell'utente, salvo il punto 6, che è una scelta
dell'utente.

1. **I testi dei capi stanno in `social/outfit/outfitWords.ts`**, nelle
   cinque lingue, come quelli di Style (`feed/styleWords.ts`), e non nelle
   tabelle di `t`. Due motivi:
   - le tabelle vanno per testo inglese, e «Top», «Cap», «Watch», «Other»
     lì sono già altre parole;
   - i file `i18n/` erano contesi da TASK-378 B e TASK-400 B.

   «Shop on {store}» è quello di Style. «Done», «Save» e «Report» sono
   testi che ci sono già.
2. **Un ponte per il compositore** (`OutfitTagging`, un context): lo danno
   la fine della corsa e la scheda di «My activities», e `DrawingForm`
   (`PublicParts.tsx`, conteso) resta com'è. Senza ponte non c'è «Tag what
   you wear». Così non c'è a fine allenamento in palestra (`GymPostForm`):
   un limite scritto nel task, il seguito lo decide l'utente.
3. **I capi sul telefono, accanto alle foto** (`drawing-outfits.json`,
   per posto della foto).
   - Vanno al server subito dopo le foto, dentro `syncPhotos`, così la coda
     dei disegni e la scheda non cambiano.
   - Una foto rimessa nel suo posto (un layout scelto) rimanda i capi: un
     JPEG diverso li perde sul server.
   - Una foto tolta li toglie.
   - Un rifiuto `outfit_tag_rejected` resta sul telefono col suo motivo, e
     si vede sotto «Tag what you wear». Non si rimanda finché i capi non
     cambiano.
   - Gli altri rifiuti definitivi (404, 409, `invalid_request`) lasciano
     andare la lista: il server tiene la sua. Senza rete, o col server
     occupato, i capi aspettano come le foto.
   - Dopo un sì del server, il telefono tiene i capi con gli `id` del server:
     rimandati, tengono i loro conteggi.
4. **I controlli nel modulo** sono solo un aiuto: `https`, niente utente,
   porta o indirizzo IP, gli accorciatori più comuni, un indirizzo scritto
   nella marca o nel modello, 5 per foto e 10 per post. L'ultima parola
   resta all'API (Web Risk, l'elenco dei bloccati, il filtro delle parole).
5. **La scheda è un componente nuovo** (`OutfitTagSheet`), con lo stesso
   aspetto di `StyleProductSheet`, che resta com'è.
   - «Report» è il solito «…» (Report o Block), e solo per gli altri.
   - L'autore si riconosce dai totali, che il server manda solo a lui. I
     suoi tocchi non mandano `open` né `shop`, e il suo «Shop» apre il suo
     link senza passare dal server.
   - Un capo nascosto dopo una segnalazione, l'autore lo vede sbiadito.
6. **Nel Feed i puntini li mostra la gruccia** (scelta dell'utente,
   2026-11-06, «Gruccia nel Feed»): nel Feed un tocco sulla foto apre il
   disegno (TASK-330), quindi lì apre i puntini la gruccia, sotto il
   contatore delle pagine. Nel disegno aperto li mostra anche il tocco sulla
   foto.
7. **Nel Feed la foto è tagliata per riempire la pagina**: un capo che cade
   nella parte tagliata non si mostra. Il modulo mostra la foto intera.
8. **Nel modulo** un capo nuovo si conferma con «Add», uno già messo con
   «Save». Chiudere il foglio tiene i capi; quello che si stava scrivendo e
   non è stato aggiunto si perde.
9. **Termini e Privacy hanno la data del 6 novembre 2026**, il giorno del
   merge previsto. Se il merge slitta, si cambia la data nei cinque file e
   nei tre test che la scrivono (`documents.test.ts`, `AboutPage.test.tsx`,
   `site/tests/privacy.test.mjs`). In «Chi altro riceve dati» resta
   «Google»; il nome della società si copia dal contratto quando l'utente
   attiva Web Risk (sì anticipato del 2026-11-05).
## TASK-407 — La 1.0.2 esce con il JS dell'ultimo OTA di produzione

**Stato**: Accettato · 2026-11-06 · TASK-407. Deciso dal Coordinatore su
delega dell'utente.

La 1.0.2 esce solo per gli screenshot nuovi. La build parte da
`release/1.0.2` = `76305c1a` (ultimo OTA di produzione) più il commit della
versione, non da `main`: il JS dentro la build è quello che vede chi la
installa prima del primo OTA, e `main` ha JS non ancora approvato per la
produzione. `release/1.0.2` non si unisce a `main`. L'impronta resta
`6f8bba4c`, perché `fingerprint.config.js` esclude la versione.
## ADR-0338, aggiunta — Le stazioni da OpenSkiData, non dagli estratti

**Stato**: Attiva · 2026-11-06 · TASK-406 parte A. Deciso dall'agente su
delega dell'utente, con l'approvazione del Coordinatore. La scelta della
domanda 1 è dell'utente: «Sì, gratis + membri».

**Contesto**: il punto 1 voleva le aree OSM `landuse=winter_sports` dagli
estratti di TASK-375. Ma quegli estratti erano già stati filtrati senza le
stazioni, in tutti i continenti, e gli estratti interi erano stati
cancellati. Riprenderle avrebbe voluto circa 60 GB di download, un paese
alla volta.

**Decisione**:

1. **La fonte.** Le stazioni vengono da `ski_areas.geojson` di OpenSkiData
   (openskidata.org): un file da 21 MB, ricavato da OpenStreetMap e
   Skimap.org.
   - Licenza ODbL, uso commerciale permesso.
   - Attribuzione a OpenStreetMap contributors, OpenSkiMap.org, Skimap.org
     e Who's On First. Il testo nell'app si chiede all'utente con la
     domanda 5.
   - Al massimo un download automatico al giorno; il server lo fa a mano,
     una volta a stagione.
2. **Cosa si tiene.** Le aree aperte, con piste da discesa e un nome: 4.768
   il 2026-11-06.
   - Ognuna in `ski_resorts` (0054) con il centro di OpenSkiMap, il
     riquadro, gli impianti, i km di piste per difficoltà, le quote e il
     sito.
   - Un nome troppo lungo tiene le forme separate da virgole che stanno in
     120 caratteri.
   - Il formato non è promesso stabile. Un campo che serve, se manca o è
     di un altro tipo, ferma l'import con il nome del campo prima di
     scrivere qualsiasi cosa. La scrittura è una transazione: tutto o
     niente.
3. **Le rotte.** `GET /ski-resorts` (per nome o per posizione, al più 50) e
   `GET /ski-resorts/{id}`.
   - Senza token, perché le stazioni non contengono dati degli utenti; con
     la chiave dell'API come ogni percorso.
   - La posizione resta fuori dal registro degli accessi.
4. **Cosa non cambia.** I riquadri dello sci di TASK-375 restano come sono
   e servono ancora per gli impianti presi. Il motore, `schemas.py` e le
   impronte non cambiano.
5. **La licenza.** `ski_resorts` è un database derivato da dati ODbL, con
   gli stessi obblighi dei dati OSM che il motore usa già.
   - Mostrare all'app una stazione alla volta, o una ricerca, è un
     «produced work»: basta l'attribuzione.
   - Se un giorno la tabella si desse in blocco (un'esportazione, un'API di
     tutte le stazioni), andrebbe offerta sotto ODbL.

**Alternative**:

- **Riprendere le aree OSM da tutti gli estratti**, un paese alla volta:
  scartata, perché vuole circa 60 GB di download per un file che esiste
  già raggruppato.
- **Ricostruire le stazioni raggruppando impianti e piste dei riquadri**:
  scartata, perché in OSM impianti e piste non portano il nome della
  stazione.

## ADR-0338, aggiunta — Il meteo: due quote, una stima della neve, la cache

**Stato**: Attiva · 2026-11-06 · TASK-406 parte B. Deciso dall'agente su
delega dell'utente, con la lista dei file approvata dal Coordinatore e tre
sue richieste: la quota a MET Norway nella chiave della cache, un timeout
breve, un campo che dica che la neve è una stima.

**Contesto**: la domanda 1 («Sì, gratis + membri») vuole il meteo e la neve
fresca prevista da MET Norway. In una stazione la valle e la cima hanno
anche 1.500 m di differenza, e la neve o la pioggia dipendono dalla quota.

**Decisione**:

1. **Due quote.** `GET /ski-resorts/{id}/weather` chiede a MET Norway il
   centro della stazione due volte: a `min_elevation_m` (`base`) e a
   `max_elevation_m` (`top`), col parametro `altitude`. Con una quota sola
   se ne chiede una; senza quote, una senza `altitude`.
2. **La neve fresca è una stima.** La precipitazione delle prossime 24 ore,
   contata solo nelle ore a 0,5 °C o meno, 1 mm d'acqua per 1 cm di neve.
   La risposta lo dice con `snow_estimate: true`. Il testo per l'utente è
   della parte C, da approvare.
3. **Le ore** sono solo quelle che MET Norway dà una per una, cioè i primi
   due giorni circa. I passi da sei ore si lasciano fuori.
4. **La cache** sta in memoria, nel processo dell'API. La chiave è il centro
   con 4 decimali più la quota. Una risposta vale fino al suo `Expires`,
   tenuto fra 1 minuto e 6 ore, oppure 30 minuti se manca. Poi si richiede
   con `If-Modified-Since`. Al più 4.000 voci: le più vecchie escono per
   prime.
5. **Il timeout** è di 4 secondi. Se MET Norway non risponde, si dà
   l'ultima previsione tenuta con `stale: true`. Se non ce n'è nessuna, la
   risposta è `503`.
6. **Il contatto.** `SHAPEROUTE_MET_CONTACT` è facoltativo: se c'è, si
   aggiunge al User-Agent `MuW/1.0 (https://getmuw.app)`. Sta solo nel
   `.env` del server; `.env.example` lo ha vuoto. Nessuna dipendenza nuova
   (urllib) e nessuna migrazione.

**Alternative**:

- **Una quota sola**, a metà: scartata, perché a metà la pioggia in valle e
  la neve in cima si confondono.
- **La cima calcolata dalla valle** con il gradiente standard (6,5 °C ogni
  km): scartata, perché MET Norway corregge già la temperatura per la quota
  chiesta, e lo fa meglio di una costante.
- **La cache nel database** o su disco: scartata per ora. Dopo un riavvio
  si richiede una volta per stazione, e MET Norway regge bene questo
  carico.
## ADR-0324 — Il Roller: una rete sua di vie lisce e asfaltate, ogni via nei due sensi

**Stato**: Accettato · 2026-11-06 · TASK-380. Le scelte dell'utente, il
2026-11-06, sono in `tasks/TASK-380.md`:

- «Roller» 🛼 (in tedesco «Inline», in spagnolo «Patines»);
- la rete `roller`: città e pianura, non la montagna;
- 5–30 km;
- **nel gioco**, come chi va a piedi, con record personali propri su 5,
  10, 21,1 e 42,2 km (la proposta era fuori dal gioco, come la bici);
- i testi approvati, con l'avviso su traffico e discese;
- acceso appena pronto.

Numeri dal Coordinatore (2026-11-04). Le scelte di prodotto sono dell'utente, una alla volta, in
`tasks/TASK-380.md`. I punti tecnici qui sotto sono decisi dall'agente su
delega dell'utente.

**Contesto**: il Roller è il terzo sport della fase 1 (TASK-376, scelta
dell'utente del 2026-11-04: asfalto liscio e `inline_skates=yes`, e prima
si misura quanta rete resta). Nessuna rete di oggi va bene:

- la rete foot prende sentieri, sterrati, ciottoli e porfido;
- la rete bike pedala ogni `track` e le strade principali, rispetta i
  sensi unici e fa i marciapiedi «a piedi con la bici».

Il banco ha provato quattro reti dai download della bici, senza toccare il
motore (`docs/sports/roller.md`), contro la bici sulla stessa area (54 su
54, 23 buoni):

- **`roller`**:
  - cosa prende: ciclabili, marciapiedi, aree pedonali, strade residenziali,
    `service`, `unclassified` e terziarie, con superficie liscia o non
    scritta; `path` e `track` solo se dicono una superficie liscia;
  - cosa lascia fuori: `smoothness` da `bad` in giù, strade principali e
    secondarie;
  - i risultati: 34 su 54, 10 buoni. Milano 8 su 9, Trento 9 su 9,
    pianura 8 su 9; Fiemme e Asiago 2 su 9. Mai su ciottoli, sterrato o
    strade principali; il 61% dei km su strade con le auto.
- **`rollersec`** (con le secondarie): 42 su 54, ma il 12,4% dei km su
  strade secondarie.
- **`rollerquiet`** (senza terziarie né autobloccanti): 21 su 54.
- **`rollerflat`** (senza i tratti oltre l'8%): 26 su 54; a Trento la
  salita scende da 210 a 95 m ogni 10 km.
- **Il tag `inline_skates`** c'è solo per 4,5 km a Trento, e in nessun'altra
  zona.

**Decisione**:

1. **Una rete nuova `roller`** (`route_engine/networks/roller.py`) con le
   regole di `roller` qui sopra, scaricata con un suo filtro Overpass
   (strade fino alle terziarie, ciclabili, marciapiedi, aree pedonali,
   `path` e `track`), con file di cache suoi (`roller_*`). Il grafo dice
   `network: roller`.
2. **Ogni via va nei due sensi** (`by_bike` falso): chi pattina, per il
   Codice della strada (art. 190), è un pedone. Niente tratti «a piedi»: si
   pattina o non si passa.
3. **Il tag `inline_skates`** non fa la rete: `inline_skates=no` toglie una
   via, `yes` o `designated` la tiene anche se la superficie non lo dice.
4. **Un'attività nuova** `inline_skating` in `activities/`, nei file nuovi
   di ogni strato, con una riga per registro
   (`docs/sports/COME-AGGIUNGERE.md`). Il nome non è `skating`, che alcuni
   test usano come attività sconosciuta (`CONDIVISO.md`).
5. **L'impronta del motore**: una rete nuova è un file nuovo nel motore.
   Se i nove percorsi fissi di `test_same_routes.py` restano identici, una
   riga in `SAME_ROUTES_AS`, come Hike e MTB; altrimenti una notte di
   esempi, col sì dell'utente. Server e migrazione (numero dal
   Coordinatore) col sì dell'utente.
6. **Niente quote nel motore per ora**: il filtro delle salite vorrebbe le
   tegole Terrarium dentro il motore, sul server e sul telefono. Si riprende
   quando la parte G di TASK-347 porta il dislivello (ADR-0300).
7. **Sul telefono**: un `SportProfile` con:
   - Apple `.skatingSports` (39) e Health Connect `EXERCISE_TYPE_SKATING`
     (60), da verificare sulle librerie;
   - Strava `InlineSkate`;
   - l'energia dal Compendium («inline skating»);
   - un passo di circa 15 km/h per il tempo stimato.

   Solo JavaScript: l'impronta iOS non si muove.

8. **Nel gioco** (scelta dell'utente 4): `game_rules.py` conta il Roller
   con la corsa, la camminata e Hike, con gli stessi controlli. Come la
   camminata, niente tempi migliori del gioco; i record personali sono a
   parte. Il controllo «veicolo» (oltre 25 km/h su 200 m per più del 10%
   della corsa) può scartare un pattinatore veloce: la parte A lo misura,
   e una soglia per sport andrebbe chiesta all'utente.

**Alternative**:

- **`rollersec`, con le secondarie**: otto forme in più, quasi tutte in
  montagna, ma un ottavo del percorso su strade veloci, dove coi pattini non
  si va. Non la propongo.
- **`rollerquiet`**: più sicura sulla carta, ma regge solo a Milano.
- **`rollerflat`**: toglie le discese ripide, ma costa forme a Trento e
  vuole le quote nel motore. Dopo TASK-347 G.
- **La rete foot o bike così come sono**: porterebbero chi pattina su
  porfido, sterrato o strade principali.
- **Una rete fatta col tag `inline_skates`**: 4,5 km in sei zone.

## ADR-0324, precisazione — La parte A: il Roller nel motore, nel contratto e nell'API, l'impronta del motore resta

**Stato**: Accettato · 2026-11-06 · TASK-380 parte A. Lista dei file e
migrazione (0055): Coordinatore. Le scelte tecniche sono decise
dall'agente su delega dell'utente.

**Contesto**: la parte A porta `inline_skating` nel motore, nel contratto
e nell'API, e il suo profilo nascosto nell'app, come 377-A e 378-A.

**Decisione**:

1. **L'ordine del contratto**: running, cycling, paddling, swimming,
   hiking, mountain_biking, inline_skating, walking, gravel_biking. Il
   Roller è un'attività del motore, dopo la MTB.
2. **La rete `roller`** (`networks/roller.py`) ha le regole del banco
   della parte 0 (`out/TASK-380/loader.py`), più il tag `inline_skates`
   (punto 3 di ADR-0324: `no` toglie la via, `yes` o `designated` la tiene
   comunque):
   - due filtri Overpass come la bici: le strade fino alle terziarie, le
     ciclabili e le `track`, senza le private; poi `footway`, `path`,
     `bridleway`, `pedestrian`. Le regole decidono sui tag tenuti
     (`surface`, `smoothness`, `tracktype`, `foot`, `inline_skates`);
   - il download con `network_type="walk"`: ogni via nei due sensi, come
     a piedi; la rete non è `by_bike`, quindi niente sensi unici né tratti
     a piedi, e i controlli di un percorso sono quelli a piedi.
3. **L'impronta resta quella di prima** (`SAME_ROUTES_AS`): 66509163156f →
   54061c20df45, e lo stesso per i nuoti (07f13e87d494 → 25b3163837e8) e
   gli esempi di canoa (6b1ca82cd4e3 → 1751ee7eca8a). I nove percorsi
   fissi di `test_same_routes.py` hanno gli stessi hash (darwin-arm64), e
   al banco corsa, bici e canoa sono identiche punto per punto a `main`.
4. **Nell'API**:
   - zone sue, grandi come quelle della bici (`longest`, i 30 km), senza
     nomi delle strade (il grafo ha già i marciapiedi accanto alle
     strade), una sola in memoria;
   - Strava `InlineSkate`; il `<type>` del GPX è `inline_skating`;
   - i record propri (`ON_SKATES`) su 5, 10, 21,1 e 42,2 km. Il limite è
     un salto del GPS a 60 km/h, come la bici ha i suoi 90: in discesa coi
     pattini si va più forte di qualunque gara. `personal_bests` li conta
     per ogni corsa, come gli altri; la 0055 allarga anche
     `run_bests_sport_check`;
   - nel gioco (`game_rules.ON_FOOT`) il Roller conta come la camminata:
     i metri sì, con gli stessi controlli della corsa, i tempi migliori no.
     `RULES_VERSION` resta 2: nessuna corsa salvata prima della 0055 può
     essere un Roller.
5. **Nell'app**: il profilo entra nascosto (nessuna riga in «Settings»,
   nessun chip nella ricerca: `searchFilters.ts`), con i numeri di Salute
   verificati sulle librerie (`.skatingSports` 39, `EXERCISE_TYPE_SKATING`
   60). Nome senza `tLater`, niente record, energia e avviso fino alla
   parte B. `sports.json` dell'orologio lo elenca.

**Misure** (`sports/roller.md`, «La parte A sul motore vero»):

- la rete del motore, scaricata col suo filtro, è quella della parte 0
  zona per zona, e così le forme: 34 su 54 a 10–30 km, 13 su 18 a 5 km;
- una zona `roller` pesa meno di una della bici: 76 MB a Trento, 452 MB a
  Milano;
- il controllo «veicolo» del gioco non scarta mai chi pattina tranquillo,
  scarta in collina chi va a 20 km/h e sempre chi va a 25. Una soglia per
  sport resta una scelta dell'utente, con la proposta di 35 km/h su 200 m
  e 28 km/h di media.

**Server**: migrazione 0055 e deploy, col sì dell'utente. Nessuna notte di
esempi.

## ADR-0324, seconda precisazione — Le soglie «veicolo» del Roller: 35 km/h su 200 m, 28 di media

**Data**: 2026-11-06 · **Stato**: Accettata (scelta dell'utente, «Sì, 35 e
28») · **Task**: TASK-380

Il gioco scarta un tratto di 200 m sopra i 25,2 km/h e una corsa con la
media sopra i 21,6 km/h oltre i 3 km. Con queste soglie, al banco della
parte A (`sports/roller.md`, «Il controllo veicolo») chi pattina a 20
km/h è scartato in collina 21 volte su 47, e chi va a 25 km/h sempre.

**Decisione**: il Roller ha soglie sue, **35 km/h** su 200 m e **28 km/h**
di media oltre i 3 km (`game_rules.speed_limits`). Il resto non cambia:
corsa, camminata e Hike, il 10% dei tratti, i 3 km. Al banco nessuno che
pattina tranquillo o allenato è scartato, e chi è veloce lo è 19 volte su 47.

- `RULES_VERSION` resta 2: nessuna attività `inline_skating` è salvata
  prima della 0055, che va sul server insieme a questa regola.
- Il prezzo, accettato: una bici a 25–30 km/h salvata come Roller conta.
  Un'auto su strada aperta resta fuori.

Deciso dall'agente su delega dell'utente: le soglie come una funzione per
attività in `game_rules.py`, invece di una tabella per sport nel registro.
Il gioco non legge il registro degli sport.

## ADR-0339 — L'editor del video dell'attività: un animale 3D corre il percorso con three.js nella pagina del video, l'editor, il prompt letto dal telefono

**Stato**: Proposto · 2026-11-06 · TASK-408. Le scelte di prodotto sono
dell'utente (domande aperte in `tasks/TASK-408.md`); il come è deciso
dall'agente su delega dell'utente.

**Contesto**: l'utente vuole un animale (un cavallo, un elefante…) che
corre il percorso nel video, in 3D, e tante modifiche: il finale, i
colori, le emoji, il 2D e il 3D, i cambi di scena, anche scritte con un
prompt, senza un costo per ogni richiesta. Il video di TASK-351 si fa già
in una WebView, con MapLibre e WebCodecs, senza niente di nativo.

**Decisione (proposta)**:

1. **Il personaggio** è un modello glTF animato, disegnato da **three.js**
   come «custom layer» di MapLibre nella pagina del video (`videoPage.ts`).
   three.js si carica come MapLibre: versione fissata e hash SRI. Niente di
   nativo, quindi l'impronta iOS non cambia e si pubblica con un OTA.
   three.js è una dipendenza nuova: l'utente ha detto sì il 2026-11-06.
2. **I modelli** hanno una licenza scritta e nessun personaggio di altri.
   Il pacchetto CC0 di Quaternius «Ultimate Animated Animals» (glTF,
   galoppo e passo): l'utente vuole tutti i suoi 12 animali più l'elefante
   (2026-11-06, `tasks/TASK-408.md`, scelta 7).
   L'elefante non c'è in nessun pacchetto CC0 trovato: l'utente lo vuole
   nella prima versione (2026-11-06). Si usa solo con una licenza letta e
   scritta nel task. L'utente ha scelto «Elephant Anim» di Shivoahm
   (Sketchfab, CC BY 4.0, gratis): titolo, autore, fonte, licenza e «adapted
   by MuW» in una riga dei crediti dell'app; il testo l'ha approvato
   l'utente il 2026-11-06 (`tasks/TASK-408.md`, scelta 6).
3. **Il percorso non si inventa**: il personaggio sta sul punto della
   traccia dove arriva la linea in quel fotogramma, girato nella direzione
   della strada. La camera lo segue; su un telefono lento resta ferma, e
   senza modello il video esce come oggi.
4. **L'editor** offre righe chiuse (personaggio, stile, colori dai token,
   emoji, scene, finale). La scena resta un elenco di cose da disegnare
   (`VideoScene`), con pezzi in più: apertura, corsa e finale in 12
   secondi, da riordinare o spegnere (scelta 8 dell'utente, 2026-11-06).
5. **Il prompt** si legge **sul telefono** con una tabella di parole, come
   le forme (ADR-0036): niente rete, nessun servizio AI, nessun costo per
   richiesta (scelta dell'utente). Le parole scelgono solo voci
   dell'editor, mai coordinate o geometrie (ADR-0001). Testo del riquadro e
   prima tabella approvati il 2026-11-06 (`tasks/TASK-408.md`, scelta 9).
6. Cinque parti: A proposta, B personaggio 3D, C editor, D prompt, E prova
   sul telefono. Ogni parte ha la sua lista dei file approvata dal
   Coordinatore.

**Alternative**:

- **Un'AI esterna per il prompt**: scartata dall'utente, per il costo a
  ogni richiesta.
- **Animali 2D (emoji o disegni piatti) che scorrono sulla linea**: più
  leggeri, ma l'utente vuole il 3D. Restano la riserva se three.js non
  entra.
- **Un renderer 3D nativo** (SceneKit, Filament): una build nuova e
  un'impronta nuova per ogni ritocco. La pagina del video ha già WebGL.
- **I modelli 3D nel layer di MapLibre senza three.js**: MapLibre GL JS non
  carica glTF da solo.

## ADR-0339, precisazione B — L'animale disegnato a parte e posato sul fotogramma, three.js r159, i modelli in uno zip

**Stato:** deciso dall'agente su delega dell'utente (2026-11-06), con i
vincoli del Coordinatore sulla lista della parte B.

1. **three.js 0.159.0**, `build/three.min.js` da unpkg con l'hash SRI, come
   MapLibre. È l'ultima versione con una build per uno script semplice:
   dalla r160 three.js è solo un modulo ES, e un modulo importato da un
   altro non si controlla con l'SRI sui telefoni di oggi. La pagina lo
   carica **solo quando c'è un animale**, con un tag creato al momento.
2. **Senza rete il video esce lo stesso** (vincolo del Coordinatore): se
   three.js o il modello non arrivano entro 10 secondi, la pagina risponde
   `character` con `ok: false` e il perché, l'app va avanti come prima e la
   pagina salta gli op `character`; sotto l'animale c'era già la punta della
   penna, che resta. Test: `videoPage.test.ts`, «the video page, with an
   animal».
3. **L'animale si disegna in un canvas suo** (WebGL, 512 × 512, camera
   ortografica) e si posa sul fotogramma 2D alla punta della linea, girato
   nella direzione da cui arriva. Non è un «custom layer» di MapLibre come
   diceva il punto 1 di ADR-0339: così funziona uguale su carta, Notte,
   Giorno e 3D, anche quando la mappa è una foto ferma o manca. Sul 3D la
   camera dell'animale è alta quanto quella della mappa (90° − `PITCH_3D`).
4. **Un lettore glTF piccolo nella pagina**, non il GLTFLoader di three.js,
   che esiste solo come modulo ES. Legge quello che i nostri modelli hanno:
   nodi, mesh con skin, colori piatti, animazioni lineari; niente texture,
   niente compressione, ogni attributo nel suo array.
5. **I modelli**: i 12 glTF di Quaternius ridotti al galoppo («Gallop») e
   al riposo («Idle») da `out/TASK-408/shrink.mjs` (gltf-transform,
   installato a parte, non dipendenza del repository): da 1,4–3,6 MB a
   266–358 KB l'uno, 3,5 MB in tutto. Ogni `.glb` sta in uno `.zip` **non
   compresso** (`zip -0`): Metro impacchetta gli `.zip` tra i suoi asset di
   sempre e non i `.glb`, e aggiungere `glb` agli `assetExts` vorrebbe dire
   un `metro.config.js` nuovo, che entra nell'impronta iOS. Così l'impronta
   resta ferma e l'animale arriva con un OTA. Non compresso perché l'app
   lo apre da sola, in poche righe (`storedFileOf`), senza una libreria
   per lo zip; poi lo passa alla pagina in base64.
6. **La parte B si fa in due PR**: B1 l'animale sulla linea, in tutti gli
   stili, con la riga «Character»; B2 l'elefante (dal file che scarica
   l'utente), la riga dei crediti nei Termini, che lo nomina, e la camera
   che segue l'animale sul 3D.
## ADR-0274, precisazione B — Lo schermo di corsa: la strada nel ciclo delle posizioni, nessun testo nuovo, il server a telefono bloccato

**Stato**: Accettato · **Data**: 2026-11-06 · **Task**: TASK-314 parte B

Deciso dall'agente su delega dell'utente, salvo il punto 6, che è una scelta
dell'utente. I punti 3 e 7 li ha visti anche il Coordinatore.

1. **La strada si chiede nel ciclo delle posizioni** (`navigation/
   wayBackRun.ts`, chiamato da `useNavigation.ts` come `lockNotice`), non
   da una schermata. Così:
   - la voce passa dallo stesso `cue()`, dopo le parole del navigatore;
   - la stessa frase va nella notifica a schermo bloccato (TASK-401 A);
   - niente dipende da una schermata montata.

   La strada sta in `Navigation.wayBack`. Il navigatore la porta da una
   posizione all'altra ma non la legge: il rientro resta il suo (ADR-0263).
   Banner e mappa la leggono da lì, `App.tsx` non cambia.
2. **Quando**:
   - alla prima posizione fuori percorso;
   - poi solo senza strada: nessuna, lasciata dopo `OFF_FIXES` posizioni
     oltre `OFF_ROUTE_M`, o con il rientro fuori dalla finestra;
   - al più ogni `WAY_BACK_EVERY_S` = 15 s, una richiesta alla volta, persa
     dopo 25 s;
   - mai con una posizione scarsa;
   - al rientro la richiesta in corso si annulla, e una risposta tardiva
     non si mostra.

   15 s sono meno della metà delle 6 al minuto che `/way-back` concede a
   un telefono.
3. **Con l'app non in primo piano si chiede subito al server**: le zone
   passate a `wayBackOnPhoneFirst` sono vuote. La pagina del motore,
   probabilmente sospesa a telefono bloccato, farebbe aspettare 20 s
   (`WAY_BACK_TIMEOUT_MS`).
4. **Il tratto mandato** è la finestra di ADR-0263 (`rejoinWindow`,
   esportata dal navigatore, la stessa di `rejoinFor`), tagliata a 3 km
   come `MAX_WAY_M`. Su una forma chiusa non ancora agganciata, 3 km
   intorno al punto dei puntini.
5. **Nessun testo nuovo**:
   - il banner tiene «Off the route» e sotto mostra la svolta della strada
     come quella del percorso;
   - la voce dice le svolte con `announcement`, a `ANNOUNCE_M`;
   - «una frase al ricalcolo» è la prossima svolta con i metri, al più una
     volta al minuto per uscita; se è più lontana di `ANNOUNCE_M`, si ridice
     vicino;
   - le svolte passano da `simplifyDirections` come quelle del percorso.
6. **Privacy** (scelta dell'utente del 2026-11-06, «Sì, aggiungi la
   frase»):
   - fuori percorso, la posizione esatta e il tratto davanti vanno al
     server quando il telefono non trova la strada da solo, e il server non
     li tiene;
   - una frase in «Your position», nelle cinque lingue, e le pagine di
     `site/privacy` rifatte.
7. **TASK-401 B** (#862, nella 1.0.3): quando unisce `main`, `liveStateOf`
   fuori percorso legge `navigation.wayBack` (`upcomingOnWay`) invece di
   `navigation.rejoin`. Altrimenti la Live Activity direbbe «120 m NE»
   mentre voce, banner e notifica danno la svolta. Lo cambia 401 B nel suo
   file; il Coordinatore glielo passa.

**Alternative**:

- **Un hook nello schermo** (`NavigateScreen` o `App.tsx`): voce fuori dal
  ciclo della corsa, notifica non raggiunta, `App.tsx` conteso.
- **Richiedere ogni 15 s anche con una strada**: più richieste, e svolte
  che cambiano sotto i piedi.
- **Una frase nuova al ricalcolo** («Recalculating»): l'utente non l'ha
  chiesta, e la svolta con i metri dice già dove andare.
- **Solo il motore del telefono**: niente frase nella Privacy, ma a
  telefono bloccato la strada quasi non ci sarebbe. L'utente ha scelto il
  server.

## ADR-0339, precisazione C — Il foglio «Edit video»: le scelte in un oggetto, il colore come ruolo, le emoji dove passa la linea

**Stato:** deciso dall'agente su delega dell'utente (2026-11-06), con la
lista della parte C1 approvata dal Coordinatore; lo stile «2D» è una scelta
dell'utente (scelta 11 del task file).

1. **La parte C si fa in due PR**: C1 il foglio con stile (2D compreso),
   animale, colore della linea ed emoji; C2 scene, finale, la camera dietro
   l'animale sul 3D (tolta da B2, perché «Camera behind» è una voce delle
   scene) e l'anteprima.
2. **Il foglio è un `SheetModal`** dal basso, come i filtri della ricerca,
   aperto da una riga «Edit video» di «Share your run» con sotto il
   riassunto delle scelte. Ogni scelta vale subito; «Done» chiude. «Style»
   e «Character» si spostano dentro il foglio; «Music» resta nella pagina.
3. **Le scelte vanno a `videoScene` in un oggetto** (`SceneOptions`), non
   più come quinto argomento: l'animale, il colore, le due emoji, e in C2
   le scene.
4. **Il colore è un ruolo nuovo della scena, `line`**, per la linea e la
   punta della penna: la pagina del video non cambia per questo. Il giallo
   è l'`accent` della tavolozza del video; gli altri quattro vengono dal
   blocco `videoLine` di `tokens.ts` (vincolo del Coordinatore: nessun
   secondo giallo scritto a mano). Sul giallo di riserva la linea resta
   nera, perché un colore chiaro non si leggerebbe.
5. **Le emoji del percorso** spuntano a un quarto, metà e tre quarti della
   linea, nell'istante in cui la linea ci arriva (l'inverso della sua
   curva), sotto l'animale; sul 3D stanno sulla linea come la mappa la
   posa (`share`, la pagina le proietta come la punta della penna). **Le
   emoji della fine** scoppiano in sei punti fissi agli angoli e a metà dei
   lati del disegno, lontano dal titolo, dal logo e dai numeri (posti
   scelti guardando i video del simulatore).
6. **Il 2D** è lo stile Notte senza la mappa: la scena non chiede la mappa
   alla pagina e il video esce subito, senza velo né crediti della mappa.
   Le quattro caselle di «Style» stanno in una riga di 76 punti l'una.

## ADR-0318, precisazione — Il nuoto in piscina

**Stato**: Attiva · 2026-11-06 · TASK-409 parte A. Cambia §14 per il nuoto in
piscina; le acque libere restano come lì. La formula è una scelta
dell'utente («MET per passo», 2026-11-06); i dettagli sono decisi dall'agente
su delega dell'utente.

1. **Formula**: i MET del *Compendium of Physical Activities* 2024 per il
   crawl, scelti dal passo medio /100 m (tempo senza le pause, metri =
   vasche × vasca): più lento di 2:18 → 5,8 (18292); fino a 1:45 → 8,0
   (18290); fino a 1:13 → 10,5 (18280); più veloce → 14,5 (18294). I bordi
   stanno a metà fra le velocità del Compendium (45 e 50 yd/min, 50 e 75
   yd/min) e a 90 yd/min; un passo uguale al bordo va nella fascia più
   veloce. Energia attiva = MET × 0,0175 × peso × minuti − il riposo di §3
   negli stessi minuti, intera, mai sotto zero; zero senza metri o senza
   tempo.
2. **Dove sta**: `pool/poolKcal.ts`, non `body/energy.ts`: lo sport «Swim»
   resta senza `energy`, così un nuoto in acque libere non ne ha (§14), né
   nel riquadro della corsa, né nel Feed, né in Salute.
3. **Dove si vede**: un quinto riquadro «Calories» a fine nuoto («–» finché
   le vasche non valgono); l'energia attiva dell'allenamento in Apple Salute
   e Health Connect; «· 206 kcal» in fondo alla riga del post nel Feed (un
   nuoto senza linea, come `isPoolLine`; il proprio col corpo del telefono,
   quello degli altri a 70 kg, §5) e alla riga di «My activities». Nessun
   testo nuovo: «Calories» e «kcal» ci sono già.

## ADR-0334, precisazione D — Calorie, battito e zone del nuoto in piscina

**Stato**: Attiva · 2026-11-06 · TASK-409. Scelta dell'utente: «Calorie
subito, battiti da Salute» (2026-11-06). Numero del task dal Coordinatore,
nessun ADR nuovo.

1. **Calorie subito**, con un OTA: ADR-0318, precisazione «il nuoto in
   piscina».
2. **Battito medio e tempo nelle zone** nella 1.0.3, letti da Apple Salute /
   Health Connect nella finestra del nuoto, dall'orologio che li ha scritti.
   Nessun lettore nuovo: il nuoto in piscina passa la sua finestra alle
   funzioni di TASK-345 C (medio e massimo) e TASK-374 D (tempo in zona).
   Senza campioni o con la lettura negata, solo le calorie. Testi approvati
   in `tasks/TASK-409.md`.
## ADR-0324, terza precisazione — Il Roller nell'app: energia, tempo stimato, file importati

**Data**: 2026-11-06 · **Stato**: Accettata · **Task**: TASK-380 parte B

- **Il tempo stimato** sotto la distanza di «Disegna» usa il passo di chi
  pattina: le ultime dieci pattinate tra 8 e 36 km/h, e **4:00/km** (15
  km/h) finché non ce ne sono. Scelta dell'utente del 2026-11-06 («Sì,
  4:00/km»); il profilo dice `timeAt: "skater"`.

Deciso dall'agente su delega dell'utente:

- **L'energia** viene dalle voci «in-line skating» del Compendium 2024:
  - 7,5 MET a 14,4 km/h (15591);
  - 9,8 a 17,7 km/h (15592);
  - 12,3 a 21–21,7 km/h (15593);
  - 15,5 a 24 km/h (15594).

  Ogni fascia arriva fino a metà strada dalla velocità successiva: 16, 19,5
  e 23 km/h.
- **I record personali** nell'app sono quelli della corsa, chiamati come
  gare: 5K, 10K, mezza e maratona (`INLINE_SKATING_BEST_DISTANCES` nel
  contratto). Il gruppo «Roller» viene dopo la MTB.
- **I file importati**: il FIT dice `sport` 30 (`inline_skating`); GPX e
  TCX dicono `inline_skating`, `InlineSkate`, `rollerblading` o il numero
  «6» di Strava. `IceSkate` e `RollerSki` non sono Roller.
- **Apple Salute** `.skatingSports` (39), senza la distanza del giorno, e
  **Health Connect** `EXERCISE_TYPE_SKATING` (60): controllati sulle
  librerie installate.

---
## ADR-0340 — La pagina del post: video nella pagina, foglio con quattro azioni, sezioni di dati da una tabella `run_stats`

**Stato**: Proposto · 2026-11-06 · TASK-410. Le scelte di prodotto e di
privacy sono dell'utente (`tasks/TASK-410.md`, «Scelte dell'utente»); il
come è deciso dall'agente su delega dell'utente.

**Contesto**: l'utente vuole una pagina del post con la foto dell'autore,
il video dell'attività, un foglio con quattro azioni e sezioni di dati
(riepilogo, meteo, passi per km, dislivello, battito e zone). Oggi i dati
oltre a distanza, tempo e dislivello totale restano sul telefono
dell'autore, il video non va al server, l'app non ha un lettore video né
`react-native-svg`, e il meteo c'è solo come previsione (MET Norway).

**Decisione (proposta)**:

1. **Una pagina nuova** (`feed/PostPage.tsx`) al tocco di un post del Feed;
   `DrawingCard` resta per gli altri ingressi.
2. **Il video** si gioca nella pagina con la WebView di TASK-351/408, dalla
   traccia del disegno: niente file sul server, niente lettore nativo,
   l'impronta iOS non cambia.
3. **Il foglio** è un componente nuovo con `Animated` e `PanResponder`:
   niente librerie di bottom sheet.
4. **I grafici** sono fatti di `View` (colonne per il profilo, barre per le
   zone): niente `react-native-svg`, che cambierebbe l'impronta.
5. **I dati** stanno in una tabella nuova `run_stats` (`jsonb`), in un modulo
   nuovo dell'API: **non si tocca `schemas.py`**, quindi né `engine.zip` né il
   motore. I passi per km li calcola il server dalla traccia con i tempi
   (anche per le corse vecchie); profilo del dislivello, cadenza e calorie li
   manda il telefono; il battito viene da TASK-345 B/C. `GET /drawings/{id}`
   dà `stats` già filtrato secondo le scelte dell'autore; `GET /feed` no.
6. **Il meteo** si chiede a MET Norway al salvataggio, solo entro 3 ore dalla
   fine: MET non ha un archivio, e un fornitore storico sarebbe una
   dipendenza esterna nuova.
7. **Le sezioni** vengono da una funzione pura: una sezione senza dati non
   c'è, una riga senza valore non c'è; quali righe ha ogni sport lo dice un
   file nuovo `sports/postMetrics.ts`.

**Alternative scartate**: caricare il file video e mostrarlo con
`expo-video` (nativo, build nuova, spazio sul server); `react-native-svg`
(nativo); colonne nuove in `runs` per ogni dato (una migrazione per ogni
metrica); `stats` dentro `GET /feed` (pagine del Feed più pesanti);
Open-Meteo archivio (gratuito solo non commerciale).

**Conseguenze**: le corse salvate prima della parte C hanno solo passi per
km (dal backfill) e i campi di oggi; meteo solo per le corse salvate subito.

**Parte B** (2026-11-08, deciso dall'agente su delega dell'utente): la
pagina è un `Modal` aperto da `FeedScreen`, non una schermata di `App`;
«Like» apre le sei reazioni (scelta dell'utente, non c'è un 👍); le icone
del foglio sono emoji (niente icone né SVG nell'app); «Edit & run» passa
per una porta nuova (`feed/editRunDoor.ts`) verso `editTrackOf` di `App`;
le impostazioni del proprio post trovano la corsa in `GET /me/drawings`
per id e salvano con `DrawingsDoor.choose`.
## ADR-0341 — La palestra per tutti i giorni: la griglia, il calendario dal server, le schede sull'account

**Stato**: Proposto · 2026-11-06 · TASK-411. Le scelte di prodotto sono
dell'utente (griglia «Gruppi, poi macchinari», guida «3 passi + ultimo
allenamento», piano «Schede + giorni», calendario «Mese con giorni
segnati», testi approvati); il resto è deciso dall'agente su delega
dell'utente, da confermare con la lista di ogni parte.

**Contesto**: la palestra (ADR-0327) registra un allenamento, ma per usarla
ogni settimana mancano un modo rapido di trovare il macchinario, un punto
di partenza in «Draw», le schede e un calendario. La segnalazione «Start
workout non fa niente» è stata corretta a parte (#927).

**Decisione**:

1. **La griglia è solo dell'app** (`gym/ExercisePicker.tsx`): otto riquadri
   dei gruppi con un'emoji e quanti esercizi hanno, poi una griglia a 2
   colonne del gruppo; scrivere nella ricerca mostra i risultati di tutti i
   gruppi, come oggi, e il nome libero resta. Nessun testo nuovo («Back» c'è).
2. **Il calendario si legge dal server**: `GET /me/gym-calendar?month=`
   (mese di calendario sul fuso del telefono, mandato dall'app come
   `tz`), per giorno gli allenamenti con l'ora di inizio, il tempo e
   l'id del post se c'è; il totale del mese. Niente migrazione: `runs` con
   `activity = 'gym'` dell'account. Solo il proprietario (è sotto `/me`).
   La guida in «Draw» legge lo stesso endpoint per «Last workout» e «This
   month».
3. **Le schede sull'account**: una tabella `gym_plans` (account, nome 1–40,
   giorni come sette bit, esercizi in ordine con il tipo e i valori
   obiettivo nei limiti delle serie di `gym_catalog`, posizione,
   aggiornata il), al massimo 20 schede da 30 esercizi;
   `GET/PUT/DELETE /me/gym-plans/{id}` con la chiave scelta dal telefono
   come per gli allenamenti (si salvano senza rete e poi partono). Una
   colonna `gym_sessions.plan_id` (nullable, `ON DELETE SET NULL`) dice
   quale scheda ha seguito l'allenamento: il calendario ne scrive il nome
   e i giorni saltati sono i giorni della scheda senza un allenamento.
   Migrazione col numero del Coordinatore (lista della parte C).
4. **L'allenamento guidato è sul telefono**: «Start workout» con «Today:
   …» copia la scheda nello stato dell'allenamento (`gym/workout.ts`):
   l'esercizio corrente è il primo non finito, i campi della serie hanno
   già i valori obiettivo, «Plan: {done}/{total} sets» sotto il cronometro.
   Si può sempre cambiare esercizio o scrivere altri valori; le serie
   salvate sono quelle fatte, non la scheda.
5. **«Today»** è la prima scheda (per posizione) col giorno della settimana
   di oggi sul telefono; più schede lo stesso giorno: la prima, le altre in
   «Plans».
6. **Privacy** (parte D): le schede sono dati dell'account, private, si
   cancellano con l'account; una riga nel testo, col sì dell'utente.

**Alternative scartate**: le schede solo sul telefono (perse cambiando
telefono, come gli esercizi di ADR-0327); il calendario da «My activities»
a pagine (un mese può chiedere molte pagine); i giorni saltati calcolati
senza sapere quale scheda è stata fatta (un allenamento libero li
«riempirebbe» tutti).

**Precisazione E (2026-11-08, deciso dall'agente su delega dell'utente;
scelta dell'utente «Omino nell'app» del 2026-11-07)**: l'omino è disegnato
dall'app con `Animated` di React Native sul driver nativo, ogni osso una
`View` ruotata e allungata: niente `react-native-svg`, niente immagini da
scaricare, impronta iOS invariata. Le pose stanno in `gym/moves.ts` (58
movimenti per i 91 esercizi, un riquadro 80 × 80, il pavimento a y = 74);
25 fotogrammi a giro. Fra due pose corpo e gambe vanno in linea retta (il
piede a terra resta lì), testa e braccia girano attorno al giunto per la via
più corta, così un braccio che passa davanti alla spalla non si accorcia a
zero (un test lo controlla). Il carico è giallo per la scelta dell'utente.
La guida si apre al posto del contenuto, non in un `Modal`: il catalogo e
l'allenamento sono già in un foglio (TASK-358). Tre passi e un avviso, al
massimo 110 caratteri a riga; tedesco, francese e spagnolo tradotti
dall'inglese.

**Conseguenze**: un endpoint senza migrazione (B), una tabella e una
colonna (C); solo JavaScript nell'app, impronta iOS invariata. Server,
migrazione, privacy e OTA col sì dell'utente.

**Precisazione B (2026-11-08, deciso dall'agente su delega dell'utente)**:
il fuso è quello del telefono (`Intl`, «UTC» se non lo dice), un nome del
database IANA, altrimenti 422; senza `month` il mese di oggi su quel fuso.
La risposta porta solo i giorni con un allenamento e `last`, l'ultimo di
sempre, per «Last workout» anche a inizio mese. Il post è quello del run se
la moderazione non l'ha nascosto. Il calendario parte da lunedì; un giorno
toccato elenca i suoi allenamenti (ora e tempo) e apre il post di quello che
ne ha uno: un allenamento senza post non ha ancora una pagina sua. «Draw» lo
chiede di nuovo quando cambia il numero delle attività dell'account (un
allenamento appena salvato), non a ogni secondo. Un mese con un allenamento
dice «Workout · {time}» invece di «1 times».

## ADR-0338, aggiunta — La giornata di sci: stazione, modello e neve in una rotta a parte

**Stato**: Attiva · 2026-11-08 · TASK-406 parte D1. Deciso dall'agente su
delega dell'utente, con la lista dei file approvata dal Coordinatore
(2026-11-08). I cinque tipi di neve sono la risposta dell'utente alla
domanda 3 («Sì, così», 2026-11-07); il modello in testo libero la sua
risposta alla domanda 2.

**Contesto**: «Record your day» deve tenere la stazione, il modello e il
tipo di neve, e la pagina della stazione mostrare la neve segnata dai
membri. La giornata si salva già con `PUT /me/activities/{key}`, il cui
corpo è un contratto usato da tutte le attività (`activity-request.json`).

**Decisione**:

1. **Una rotta a parte**, `PUT /me/activities/{key}/ski`, come il post
   (`/post`). Il salvataggio della giornata resta com'era, e l'app manda
   la stazione, il modello e la neve dopo, anche più volte: vince
   l'ultimo, sempre intero.
2. **Tre colonne in `runs`** (migrazione `0056`): `ski_resort_id` con `ON
   DELETE SET NULL` verso `ski_resorts`, `ski_gear` (1–60) e `snow` (CHECK
   sui cinque). Solo su `skiing`, altrimenti `422`.
3. **Sul post** con `GET /drawings/{id}/ski-day`, per chi vede il
   disegno e con `X-MuW-Reads`, come i nomi di impianti e piste. Il nome
   della stazione si legge dalla tabella delle stazioni, quindi segue gli
   import.
4. **La neve dei membri** con `GET /ski-resorts/{id}/snow`: le giornate
   finite nelle ultime 24 ore, con quella stazione e una neve, il cui post
   chi chiede vede su un profilo (`shown_sql`). Dà solo quante per tipo,
   mai chi, e chiede il token.

**Alternative**:

- **I tre campi nel corpo di `PUT /me/activities/{key}`**: scartata. Quel
  contratto lo usano tutte le attività, l'outbox e l'import, e un campo in
  più tocca file di altri task.
- **Una sola colonna `jsonb`**: scartata. Contare la neve per stazione
  vuole un indice sulla stazione, e il CHECK sui cinque tipi è più chiaro
  su una colonna.
- **Il nome della stazione copiato nella giornata**: scartato. Con il
  riferimento il nome resta quello di OpenSkiData; una stazione tolta lascia
  la giornata senza nome, ed è raro.

**Conseguenze**: una migrazione (`0056`), quindi il server col sì
dell'utente. Niente motore e niente nativo, impronte ferme. L'app (D2) e
la pagina della stazione (D3) vengono dopo.
## ADR-0342 — Le ciaspole: forme piccole piazzate libere sulla neve, come sull'acqua

**Stato**: Accettato · 2026-11-08 · TASK-413. Scelte dell'utente: «SI ANCHE
FORME LIBERE SULLA NEVE PIÙ PICCOLE» (2026-11-07); il 2026-11-08 nome,
distanze, regole della neve, testi, gioco e accensione (`tasks/TASK-413.md`)

**Contesto**: le ciaspole non hanno una rete. Sci di fondo e sci alpino
sono «Record only» perché sulle piste le forme non vengono (ADR-0316,
ADR-0317); con le ciaspole invece si cammina dove c'è neve. Il motore sa
già piazzare una forma libera dove non c'è rete: sull'acqua, la forma
piazzata è il percorso (ADR-0154, `water_fit.py`). Al banco, con la neve
permessa al posto dell'acqua, una forma di 0,5–3 km entra 60 volte su 60 in
cinque posti di montagna, 48 su 60 senza boschi (`sports/snowshoes.md`).

**Decisione** (le scelte di prodotto sono dell'utente; il modo è deciso
dall'agente su delega dell'utente):

1. «Snowshoes» ❄️ è uno sport disegnato, `snowshoeing`, da 0,5 a 3 km.
   Si può anche partire senza percorso, come ogni sport.
2. La forma è piazzata da `water_fit.fit_shape` così com'è, su un'area di
   **neve permessa**: il riquadro attorno alla partenza meno i pendii oltre
   25° (con 30 m attorno a quelli oltre 30°), i boschi, i ruscelli, le
   piste, gli impianti, roccia e ghiacciai, l'acqua, i paesi e le strade
   principali, le riserve e i biotopi (i parchi restano). Si entra da un
   punto di strada minore, carrareccia o sentiero entro 2 km. `water.py` e
   `water_fit.py` non cambiano: canoa e nuoto restano identici.
3. Le pendenze vengono dalle tegole Terrarium (zoom 13, circa 30 m), già
   usate dall'app e dagli studi dello sci. Il modulo delle quote del motore
   è quello condiviso voluto da ADR-0300 (parte G di TASK-347): il primo
   che lo scrive lo scrive per tutti, tramite il Coordinatore.
4. Solo dal server, come l'acqua: neve e quote si scaricano alla prima
   richiesta di un posto e restano in cache; nessuna zona in memoria. Il
   telefono non disegna sulla neve.
5. I moduli nuovi del motore stanno fuori dall'impronta (come
   `DRAWN_WATER_ONLY`): gli esempi tenuti non si ridisegnano.
6. Un avviso di sicurezza al primo «Start», come canoa e nuoto (ADR-0283),
   e una riga sotto ogni percorso, con i testi approvati in cinque lingue.
   Il motore non conosce il bollettino valanghe, la neve del giorno, i
   divieti locali e i terreni privati: l'avviso lo dice.
7. Nel gioco come Hike: i metri contano, niente tempi migliori né record
   personali.
8. Le parti: A1 (la neve nel motore), A2 (contratto, API, migrazione,
   profilo nascosto), B (app). «ready» appena pronte; server, migrazione e
   produzione ciascuno col sì dell'utente.

**Conseguenze**:

- Un terzo modo di disegnare accanto a rete e acqua. I punti dell'API che
  dicono «sull'acqua non c'è rete» (`jobs.py`, `activity_graphs.py`,
  `errors.py`, `way_back.py`, `route_archive.py`) diventano «acqua o neve».
- Una forma sulla neve non garantisce che la neve ci sia, né che il pendio
  sia sicuro quel giorno: lo promette l'avviso, non il motore.
- A 3 km la forma spesso non entra senza boschi: l'errore dice a quale
  distanza entra.
- Un posto nuovo aspetta Overpass (20–40 s) alla prima richiesta, come la
  prima acqua di un lago.

## ADR-0314, precisazione — La parte B1: la guida in Swift, legata al telefono dalle tracce

**Stato**: Attiva · 2026-11-08 · TASK-370 parte B1, decisa dall'agente su
delega dell'utente; lista dei file approvata dal Coordinatore (local_3f55a0e9).

**Contesto**: l'orologio deve guidare senza telefono (scelta dell'utente,
ADR-0314 punto 1), quindi la guida del telefono (`navigator.ts`,
`progress.ts`, `rejoin.ts`) va riscritta in Swift. Due copie della stessa
logica divergono, se niente le lega.

**Decisione**:
1. **Una riscrittura riga per riga** in `WatchCore/Guide/`, con le stesse
   costanti e gli stessi nomi; B1 copre la guida dalla partenza (svolte,
   fuori rotta, rientro, buco di GPS, deviazione con rientro più avanti, fix
   poco precisi, arrivo). Il percorso chiuso preso dove lo si tocca e i
   pezzi a penna alzata sono B2.
2. **Avvisi per tipo, non frasi**: `GuideCue` (partenza, svolta con la
   catena e i metri, fuori rotta, dov'è il percorso, di nuovo sul percorso,
   arrivato) e `vibrates` come il `vibrate` del telefono. L'orologio mostra e
   vibra; le parole restano del telefono.
3. **Le tracce come contratto**: `src/watch/guideScenarios.ts` fa uscite
   deterministiche sui due percorsi di `navigation/fixtures/`, con i fix a 8
   decimali; `guideTrace.ts` le fa seguire al navigator del telefono e scrive
   lo stato dopo ogni fix e gli avvisi per tipo (il tipo si ricava dalle
   parole inglesi; una frase senza tipo è un errore). Le 14 tracce stanno in
   `targets/watch/Core/Fixtures/guide/`, scritte da `scripts/watch-guide.sh`
   e formattate con Prettier; jest controlla che dicano ciò che il codice di
   oggi fa (per contenuto, non per impaginazione), XCTest le rigioca (metri
   entro 1 cm, il resto uguale).
4. **Gli scenari hanno denti**: una deviazione sta a una distanza e da un
   lato liberi da ogni altra parte del percorso, e quella lunga rientra 700 m
   più avanti, oltre la finestra che si avrebbe con meno di `REJOIN_PER_M`.
   Provato cambiando una costante per volta nello Swift (`forwardCost`,
   `passM`, `gapMs`, `poorFixM`, `joinM`, `offFixes`, `perM`): ogni cambio fa
   fallire i test.

**Conseguenze**: un cambio a `navigator.ts`, `progress.ts` o `rejoin.ts`
vuole `scripts/watch-guide.sh` e lo stesso cambio in Swift, o fallisce jest o
`swift test`. Le tracce pesano circa 670 KB.

---
---
## ADR-0314, precisazione — La parte A3: il telefono

**Stato**: Attiva · 2026-11-08 · TASK-370 parte A3, deciso dall'agente su
delega dell'utente; lista dei file approvata dal Coordinatore il
2026-11-08.

**Decisione**:

1. **Niente `react-native-watch-connectivity` prima di A-flip.** La 2.0.0
   prende il modulo nativo con `TurboModuleRegistry.getEnforcing`, che
   lancia appena si importa il pacchetto in un'app senza la sua parte
   nativa (tutte le build fino alla 1.1). `src/watch/watchLink.ts` chiama il
   modulo nativo `WatchConnectivity` con i nomi della 2.0.0 (metodi ed
   eventi letti in `src/NativeWatchConnectivity.ts` e
   `ios/WatchConnectivity.mm` del pacchetto) attraverso
   `TurboModuleRegistry.get`: senza modulo, su Android, in Expo Go e nei
   test il ponte è `null` e non succede niente. Il pacchetto, fissato a
   **2.0.0**, entra con A-flip; i nomi vanno ricontrollati se la versione
   cambia.
2. **Il pacchetto manda ogni messaggio aspettando una risposta**
   (`sendMessage:replyHandler:`): l'orologio deve avere
   `session(_:didReceiveMessage:replyHandler:)`, altrimenti l'invio
   fallisce. `PhoneLink.swift` risponde con un dizionario vuoto; il
   telefono risponde allo stesso modo a un messaggio con `id`.
3. **Le unità non viaggiano nell'application context**: il pacchetto
   rimanda all'orologio ogni context che riceve
   (`didReceiveApplicationContext` chiama `updateApplicationContext`), quindi
   il context del telefono è sempre l'ultimo stato dell'orologio. Le unità
   vanno con `transferUserInfo` in un messaggio nuovo, `settings`
   (`units`: `km` o `mi`), negli stessi fixture (`messages.json`), in Swift
   e in TypeScript; l'orologio le tiene in `UserDefaults`. La versione dei
   messaggi resta **1**: nessun orologio ha ancora l'app. Il context del
   telefono (`getApplicationContext`) si legge comunque all'inizio: per
   l'eco è l'ultimo stato dell'orologio.
4. **Lo stesso stato sui due** (`src/watch/useWatch.ts`, montato in
   `RunCard`, la card di corsa libera e percorso): il conto alla rovescia
   del telefono avvia l'allenamento dell'orologio con lo sport di
   «Settings» (quello che «Save» usa), pausa e ripresa (a mano o da fermo)
   vanno come comandi, la fine della corsa o l'uscita dalla schermata lo
   chiudono. Dall'orologio arrivano solo stati: conta un **cambio** fra due
   stati suoi (in corso → in pausa, in pausa → in corso, → finito), così uno
   stato partito prima del comando del telefono e arrivato dopo non cambia
   niente; «finito» dal polso chiude la corsa come «Stop». Uno stato più
   vecchio di 5 s rispetto alla schermata (un allenamento di prima) è
   lasciato fuori.
5. **Un'attività, un allenamento**: se durante la corsa l'orologio ha
   detto di registrare (in corso, in pausa o finito), `saveToHealth` in
   `useHealth.ts` non scrive in Salute: l'allenamento lo salva l'orologio.
   Vale fino al conto alla rovescia della corsa dopo.
6. **Il battito** arriva come messaggio `heartRate` (ogni 5 s) e la card lo
   mostra con `WatchHeart` («♥ 142 bpm», con la zona di «Heart rate zones»
   quando ci sono età o battito massimo; i nomi delle zone sono quelli già
   tradotti). Nessun testo nuovo.
7. **Il mirroring di HealthKit** (`workoutSessionMirroringStartHandler`) si
   imposta solo da codice nativo: aspetta A-flip, con un piccolo plugin
   nativo. Stato e battito passano già da WCSession.

**Alternative**:
- **Il pacchetto subito, caricato con `require` solo se il modulo c'è**:
  porta la dipendenza in `package.json` e muove l'impronta iOS; scartata.
- **Le unità nell'application context**: l'eco del pacchetto le
  sovrascriverebbe con lo stato dell'orologio; scartata.

**Conseguenze**: impronta iOS `6f8bba4c` invariata (copia pulita,
`APP_VARIANT=production`). Fino ad A-flip il codice del telefono non fa
niente: la prova vera è con la build 1.1, al polso.
## ADR-0344 — Ski touring: lo scialpinismo «Record only», fasi e VAM sul telefono, pendenza e vette dal server

**Stato**: Proposto · 2026-11-08 · TASK-415. Numeri dal Coordinatore. Le
scelte di prodotto sono dell'utente, prese una alla volta il 2026-11-07
(`tasks/TASK-415.md`): «Ski touring» 🏔️; le metriche proposte; l'avviso
sulla pendenza nelle cinque lingue; la collezione delle vette nel profilo,
visibile come i post; acceso con fasi e VAM. I punti tecnici qui sotto
sono decisi dall'agente su delega dell'utente.

**Contesto**: lo scialpinismo non ha forme da disegnare (come lo sci,
ADR-0317), ma ha numeri suoi: chi sale con le pelli guarda il dislivello,
la velocità di salita e i cambi; chi sceglie una gita guarda la pendenza;
chi la finisce vuole la vetta. L'app ha già la categoria «Record only»
(ADR-0319), le salite e le discese di una giornata di sci
(`activities/snowDay.ts`), le quote dei punti salvate (TASK-324), i nomi di
impianti e piste dal server da estratti OSM (ADR-0319, punto 11), e una
decisione presa ma non ancora codice sulle quote dalle tegole Terrarium
(ADR-0300, parte G). TASK-410 propone `run_stats` per i numeri del post.

**Decisione**:

1. **Uno sport «Record only» nuovo**, `ski_touring`, nei file della
   ricetta (`COME-AGGIUNGERE.md`): Strava `BackcountrySki`, GPX
   `ski_touring`, fuori dal gioco e senza record. Il motore non cambia.
2. **Fasi e VAM sul telefono**, in un modulo TypeScript puro e generico
   (`activities/mountainPhases.ts`) sopra le svolte di `snowDay.ts`: salita,
   discesa, impianto; un cambio è una sosta di almeno 90 s alla svolta. La
   VAM è il D+ (a passi di 3 m) sul tempo in movimento; in gita sugli
   ultimi 5 minuti. Nessun barometro diretto: niente moduli nativi.
3. **I numeri del post in `run_stats`** (TASK-410 C), non in colonne nuove
   di `runs`.
4. **La pendenza dal server, in un modulo condiviso** `terrain.py`: tegole
   Terrarium a zoom 13 in cache sul Volume, PNG decodificato con `zlib`,
   pendenza di Horn su 3 × 3 pixel. È il modulo della parte G di TASK-347:
   uno solo, chi parte primo lo scrive. Si calcola dopo il salvataggio, in
   sottofondo; il post mostra la sezione quando c'è. Quattro classi (sotto
   30°, 30–35°, 35–40°, oltre 40°), legenda con testo e numeri, l'avviso
   approvato dall'utente.
5. **Le vette dal server, da un estratto** (`osmium tags-filter
   n/natural=peak`, file a tegole come `ski_extract.py`): raggiunta se la
   traccia passa entro 60 m dal nodo e, con le due quote, entro 80 m. Una
   tabella `run_summits` con la cascata dalla corsa; la collezione è una
   query con la visibilità dei post. Prima le Alpi, poi il mondo con gli
   stessi comandi.
6. **Le parti**: A contratto e API; B fasi e VAM nell'app (con lei si
   accende); B2 i numeri nel post; C la pendenza; D le vette; E la neve.

**Alternative scartate**:
- la pendenza sul telefono, nella WebView della mappa (la tela legge i
  pixel delle tegole): ogni telefono che guarda un post rifarebbe il
  calcolo, e il tempo sopra i 30° tornerebbe dalla pagina con un messaggio
  in più. Il server lo fa una volta e il modulo serve anche a TASK-347 G;
- un barometro diretto (`expo-sensors`): un modulo nativo, impronta iOS
  nuova, per un guadagno che sull'iPhone la quota fusa dà già;
- le vette chieste a Overpass a ogni gita: Overpass rifiuta il server
  (ADR-0154), e dal telefono la posizione andrebbe a un servizio esterno;
- le fasi e le vette in colonne di `runs`: TASK-410 ha già chiesto un posto
  solo per i numeri del post.

**Conseguenze**:
- fasi e VAM sono solo JavaScript: un OTA, impronta iOS invariata;
- C e D cambiano il server e vogliono il sì dell'utente; D anche una
  migrazione e una riga della privacy;
- la pendenza sottostima i pendii corti e ripidi (dato di circa 30 m):
  l'avviso lo dice;
- le ciaspole e Hike possono avere fasi, pendenza e vette con gli stessi
  moduli, senza riscriverli.

**Precisazione (2026-11-08, TASK-415 parte A, decisa dall'agente su
delega dell'utente)**: `ski_touring` viene dopo `xc_skiing` in
`RECORDED_SPORTS`, quindi fra `xc_skiing` e `gym` in `RUN_ACTIVITIES`,
`RunActivity` e `X-MuW-Reads`. Il profilo dell'app ha il nome «Ski touring»
senza `tLater` e nessuna riga in «Settings» fino alla parte B, come il
Roller nella sua parte A; il passo di una corsa senza percorso è quello di
chi corre (`freeRunAs` vuoto), come lo sci di fondo, finché B non dà fasi e
VAM. Apple `.crossCountrySkiing` (60) e Health Connect `EXERCISE_TYPE_SKIING`
(61) sono verificati su `@kingstinct/react-native-healthkit` e
`react-native-health-connect`. La migrazione allarga solo
`runs_activity_check`: preferiti, corse di gruppo e `run_bests` restano
com'erano. Il contratto dei percorsi (`contract.json`) e il motore non
cambiano.

## ADR-0343 — Carrozzina e passeggino: una rete sua dove si spinge, solo forme semplici di pochi km

**Stato**: Proposto · 2026-11-08 · TASK-414. Le scelte dell'utente, il
2026-11-08, sono in `tasks/TASK-414.md`:

- uno sport solo, «Carrozzina e passeggino» ♿ (la proposta erano due sport
  sulla stessa rete);
- la rete `wheelcalm`: città e pianura, non la montagna;
- 1–5 km; solo cerchio, cuore, stella e luna;
- nel gioco come la camminata, con record propri su 1 e 5 km;
- il tipo «carrozzina» in Salute e su Strava, anche per il passeggino;
- i testi approvati, con l'avviso su cordoli, gradini e salite;
- acceso appena pronto.

Numeri dal Coordinatore. I punti tecnici qui sotto sono decisi dall'agente
su delega dell'utente.

**Contesto**: scelta dell'utente del 2026-11-07, «studia percorsi
percorribili e solo forme semplici di pochi km». Nessuna rete di oggi va
bene: la rete foot passa per scale, sentieri, ciottoli e porfido; la rete
roller non guarda cordoli e barriere ed è pensata per 5–30 km.

Il banco ha provato sei reti da un download per zona (il filtro della rete
foot con i tag di accessibilità), a 1, 2, 3 e 5 km, cerchio, cuore, stella
e luna (`docs/sports/wheelchair.md`), contro la rete foot sulla stessa area
(92 su 96, 31 buoni):

- **`wheel`**: fuori scale, cordoli alti (`kerb=raised`), `incline` oltre
  l'8%, superfici ruvide, `smoothness` da `bad` in giù, `wheelchair=no`,
  `sac_scale`, tornelli e scalette; `path` e `track` solo con una superficie
  scritta. 81 su 96, 13 buoni; nessuna scala, nessun cordolo alto, nessuna
  superficie ruvida sui percorsi (la rete foot: 7,4 km di scale e 92 cordoli
  alti). Ma il 9% dei km su strade principali e secondarie senza
  marciapiede scritto.
- **`wheelcalm`**: `wheel` senza quelle strade. 69 su 96, 9 buoni: Trento e
  Milano 16 su 16, pianura 13, Asiago 11, Valsugana 9, Fiemme 4. Strade
  grandi all'1,1% (quelle con `sidewalk` scritto).
- **`wheelstrict`** (anche ghiaino, `incline` senza numero, cordoli non
  detti ribassati): 65 su 96, 5 buoni.
- **`wheelflat6`** (senza i tratti oltre il 6%, tegole Terrarium): 67 su 96;
  in montagna la rete crolla, e vorrebbe le quote nel motore.
- **OSM incompleto**: i cordoli si sanno a Milano (13.858 nodi) e in parte a
  Trento (710), quasi mai altrove; sui percorsi di `wheelcalm` 36
  attraversamenti su 1.000 dicono il cordolo. `incline` c'è sull'1–3% dei
  km, `wheelchair` quasi solo a Milano (36,6 km).

**Decisione**:

1. **Una rete nuova `wheel`** (`route_engine/networks/wheel.py`) con le
   regole di `wheelcalm`: il filtro della rete foot, scaricato senza
   semplificare con i tag delle vie e dei nodi che servono, le vie e i nodi
   che le regole scartano tolti, poi semplificato (come `networks/roller.py`
   `skate_ways`). Il grafo dice `network: wheel`; file di cache suoi.
2. **Un cordolo alto o una barriera che blocca tolgono il nodo**, e con lui
   il passaggio: si passa o no, niente tratti «a piedi».
3. **Il tag `wheelchair`** non fa la rete: `no` toglie una via o un nodo,
   `yes` o `designated` li tiene.
4. **Ogni via va nei due sensi**, come a piedi (`by_bike` falso).
5. **Un'attività nuova** `wheelchair` (1–5 km) in `activities/`, nei file
   nuovi di ogni strato, con una riga per registro: uno sport solo per
   carrozzina e passeggino.
6. **Niente quote nel motore per ora**: come per il Roller (ADR-0324,
   punto 6), si riprende quando la parte G di TASK-347 porta il dislivello
   (ADR-0300). Il limite si dice nell'avviso.
7. **Le forme semplici** (cerchio, cuore, stella, luna) sono una lista
   dell'attività. La proposta: il motore e l'API rifiutano le altre, l'app
   mostra solo quelle; la lista della parte A col Coordinatore può fermarsi
   all'app.
8. **L'impronta del motore**: `SAME_ROUTES_AS` se i nove percorsi fissi di
   `test_same_routes.py` restano identici, altrimenti una notte di esempi
   col sì dell'utente.
9. **Sul telefono e su Strava**: Apple `.wheelchairWalkPace`, Health
   Connect `EXERCISE_TYPE_WHEELCHAIR`, Strava `Wheelchair`, per tutti.
   Da verificare sulle librerie. Solo JavaScript: l'impronta iOS non si
   muove.
10. **Nel gioco** come la camminata, con record propri su 1 e 5 km e le
   soglie «veicolo» della corsa.

**Alternative**:

- **Due sport sulla stessa rete** (la proposta dell'agente): il tipo giusto
  in Salute e Strava per tutti e due, record separati, un file in più per
  strato. L'utente ha scelto uno sport solo.

- **`wheel`, con le strade grandi**: 12 forme in più, ma un percorso su
  undici passa per strade principali o secondarie senza marciapiede, in
  mezzo al traffico. Non la propongo.
- **`wheelstrict`**: lascia fuori ciclabili in terra battuta che un
  passeggino fa, e tratta come gradino ogni cordolo non detto: 4 forme e
  4 buone in meno di `wheelcalm`.
- **`wheelflat6`**: toglie le salite, ma vuole le quote nel motore. Dopo
  TASK-347 G.
- **La rete foot o roller così come sono**: scale, ciottoli, cordoli.
- **Una rete fatta col tag `wheelchair`**: c'è quasi solo a Milano.
## ADR-0314, precisazione — La parte B2: il percorso chiuso e i pezzi, con le stesse tracce

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

**Stato**: Attiva · 2026-11-08 · TASK-370 parte B2, decisa dall'agente su
delega dell'utente; lista dei file approvata dal Coordinatore (local_3f55a0e9).

**Contesto**: la guida del telefono ha altri due modi oltre a quello dalla
partenza: il percorso chiuso preso dove lo si tocca (TASK-273, ADR-0241) e
le parole o le forme a pezzi con la penna alzata fra un pezzo e l'altro
(TASK-198, TASK-223, TASK-226).

**Decisione**:
1. **Riscrittura riga per riga**: `Loop.swift` (`startAnywhere.ts`,
   compresa la svolta alla partenza ricalcolata con le soglie del motore),
   `Pen.swift` (`penUp.ts`), e in `Navigator.swift` la presa del percorso
   chiuso (`towardsJoin`, `joiningWith`, `joinedPass`). `passesNear` sta in
   `Loop.swift` come estensione di `RouteProgress`, per non toccare un file
   fuori lista.
2. **Ciò che decide il telefono resta del telefono**: quali percorsi si
   prendono dove li tocchi (`startsAnywhere`), le direzioni semplificate
   (`simplifyDirections`), i tratti a piedi (`walksOf`) e se lo sport va coi
   numeri della bici (`isRide`, che con TASK-416 vale anche per gravel, MTB e
   Roller) li calcola il telefono e li manda con il percorso (B3): `Pen.start`
   riceve `ride` e `paddle`, non il nome dello sport. L'orologio porta solo
   ciò che serve durante la corsa.
3. **La penna dà due avvisi** (`penUp`, `penDown`, con la lettera che viene);
   come dirli (a piedi, in bici, in canoa, lettere o parti) sta nelle
   bandierine della penna, per la schermata di B3.
4. **Le tracce, versione 2**: in più il percorso chiuso (`anywhere`, se si
   aspetta ancora di prenderlo, dove è stato preso, e il percorso da lì con
   le sue direzioni al fix che lo prende) e la penna dopo ogni fix. Le
   direzioni portano anche `branches`. Gli scenari nuovi sono scelti perché
   ogni costante conti: prendere il giro al passo della bici distingue
   `JOIN_FIXES`, prima della fine `AT_START_M`, prima di un angolo
   `GROUP_M`. Provato cambiando una costante per volta.

**Conseguenze**: un cambio a `startAnywhere.ts` o `penUp.ts` vuole
`scripts/watch-guide.sh` e lo stesso cambio in Swift. Le tracce sono 26,
circa 1,7 MB.

---


## ADR-0347 — Il grande catalogo di «Explore»: mille disegni da uno strumento in `tools/`, il filtro automatico, la scelta all'utente

**Stato**: Proposto · 2026-11-08 · TASK-419 (parte B del catalogo chiesto
dall'utente il 2026-11-08; A è TASK-418, C è TASK-420).

**Contesto**: «Explore» propone oggi i percorsi del seme di ADR-0097: 11
forme e qualche parola in 13 città italiane e New York, più tre forme da
5 km nelle città in evidenza (ADR-0132), tutti i disegni da 0,88 in su.
L'utente vuole un catalogo grande e bello: circa 1000 disegni generati in
città italiane ed europee, con le forme nuove, e **sceglie lui** i
200–400 che restano. Sul Mac la cache ha solo le zone di Trento, Levico,
Milano e un pezzo di Barcellona e Parigi; le 52 città italiane e le 10
estere sono sul server, che non si tocca. Overpass rifiuta per ore dopo
pochi download grandi (`MAPS.md`). `seed_catalog.py` appartiene al motore,
che altri task stanno toccando.

**Decisione**:

1. **Uno strumento nuovo**, `tools/catalog_seed.py`, che importa
   `seed_catalog` a runtime (`plan_case`, `engine_planner`,
   `engine_prepare`, `read_runs`) e ne tiene il formato del registro: il
   motore non cambia. Filtro, punteggio, selezione e scrittura dei file
   sono funzioni di sola libreria standard, provate da `pytest tools`.
2. **Le città** sono piazze pubbliche scritte nello strumento, mai la
   posizione di una persona: le 14 del seme, le altre di
   `prefetch_zones.ITALY` più Rovereto, poi capitali e città turistiche
   europee. Le zone si scaricano **una per città** (la zona di
   `engine_prepare`, che contiene ogni caso), con l'attesa dello slot dalla
   pagina di stato di Overpass come `prefetch_zones`, a lotti piccoli con
   una pausa, e un registro che riparte da dove era; `--overpass-url` per
   un mirror. Le zone nuove restano in `data/cache` e servono anche agli
   altri.
3. **Il piano**: nelle città del seme tutte le forme a 5, 10 e 21 km (le
   sei entrate dopo il 2026-10 — zucca, albero, faccina, fantasmino,
   ciambella, sole — non sono mai state seminate) più le frasi di
   `PHRASES`; nelle città nuove un nucleo di forme che leggono a 5 e
   10 km, le tre semplici a 21 km e un saluto locale nei due stili. Circa
   1000 casi.
4. **I 683 disegni del giro del 2026-10** (`out/seed_catalog/runs.jsonl`)
   entrano fra i candidati: sono disegni veri del motore, costano zero, e
   le loro zone non sono più sul Mac. Nella pagina si vede da quale giro
   viene ogni candidato.
5. **Il filtro automatico**: somiglianza ≥ 0,90 (l'occhio dice «sì» da lì,
   TASK-076); distanza reale entro ±10% della chiesta; **ripassi in più**
   rispetto a quelli della forma (`extra_doubled_share`, ADR-0118) ≤ 10%
   (l'unico cuore giudicato «sì» ne aveva 0%, gli altri 4–23%, ADR-0107);
   nessun tratto su `motorway` o `trunk` (la rete `foot` già li esclude: è
   un controllo). La quota su strade grandi (`primary`, `secondary`) si
   mostra, non si filtra: in centro sono viali con il marciapiede.
6. **Il punteggio** per ordinare: somiglianza − 1,5 × ripassi in più −
   scarto di distanza, cioè il costo del motore con il segno cambiato. La
   **preselezione** è per città: i migliori fino a 8, almeno 3 dove
   passano; cuore, cerchio e stella da 5 km delle città in evidenza
   restano sempre (ADR-0132).
7. **La pagina di revisione** (`tools/catalog_review.py`) disegna ogni
   candidato in **SVG dai suoi punti**, proiettati in locale: si apre da
   `file://` senza rete, mostra mille miniature in un attimo, e non
   dipende da tessere. Punteggio, misure e casella «tieni»; un tasto copia
   le chiavi tenute. **La scelta è dell'utente**: le chiavi finiscono in
   `tools/catalog_kept.json`, e `catalog/seed/<città>.json` si riscrive da
   lì e dai registri, nel formato di ADR-0097, con la licenza ODbL.
8. **Il server** riceve il catalogo con l'immagine dell'API, come oggi:
   si prepara e si pubblica solo con l'ok dell'utente e il via del
   Coordinatore.

**Alternative**:

- **Estendere `seed_catalog.py`**: tocca il motore mentre tre task lo
  stanno cambiando, e la selezione a mano (`UNREADABLE`, `REJECTED`) vive
  lì come costanti; la scelta dell'utente sta meglio in un file di dati.
- **Girare il motore sul server**, dove le zone ci sono: il server è
  dell'app pubblicata e non si tocca per un lavoro di ore.
- **L'estratto Geofabrik sul Mac** (ADR-0119): 2,2 GB da scaricare e
  `osmium` da installare; resta la via se Overpass non riapre, da
  chiedere.
- **Miniature con le tessere di OpenStreetMap** (`preview_samples.py`):
  mille mappe Leaflet sono lente e vogliono la rete; la forma si giudica
  dalla linea, la mappa serve dopo, per i dubbi.
- **Una soglia più alta per i ripassi** o il filtro sulle strade grandi:
  taglierebbero stelle e cuori buoni; meglio mostrarli e lasciar decidere.
---
## ADR-0322 e ADR-0324, precisazione — Gravel, MTB e Roller registrano con i numeri della bici

**Data**: 2026-11-08 · **Stato**: Accettata · **Task**: TASK-416

Scelte dell'utente: Gravel e MTB «tutti dati da bici diciamo non corsa»
(2026-11-07); Roller «Sì, km/h» (2026-11-08). Velocità e media in km/h,
parziali in km/h, voce ogni 10 km, svolte dette 100 m prima.

Approvato dal Coordinatore, deciso dall'agente su delega dell'utente:

- **Un campo del profilo** `rides?: true` («i suoi numeri sono quelli di un
  giro in bici») in `sports/base.ts`, detto da bici, Gravel, MTB e Roller.
  `isRide` in `navigation/ride.ts` lo legge con `findProfile`, invece di
  confrontare l'attività con `"cycling"`. Uno sport nuovo che si registra
  come un giro lo dice nel suo file, senza toccare `navigation/`.
- **Nessun ciclo di import**: `sports/` non importa `navigation/ride`.
- **Gli stessi testi della bici**: il Roller sente «Average speed» e
  «kilometres per hour» come chi pedala. Solo JavaScript, l'impronta iOS
  resta `6f8bba4c`.
_(nessuna dal 2026-11-08)_
