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
- ADR-0343 — Carrozzina e passeggino: una rete sua dove si spinge, solo forme semplici di pochi km · 2026-11-08 · Accettato (2026-11-12, parti A e B in `main`, vedi le precisazioni A e B)
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
- ADR-0345, precisazione D1 — «Together» sul server: la stessa corsa a metà del tempo e 2 km, i secondi dalla prima partenza, 600 punti scelti nel tempo · 2026-11-21 · Attiva
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
- ADR-0380 — Il sonno sul server: `sleep_nights`, una riga per notte pubblicata (mai i campioni), nel profilo col sì (`shared`), nel post dell'attività acceso in partenza (`sleep_shown`); si tiene solo quello che è pubblicato · 2026-11-12 · Attiva
- ADR-0383 — Il look Liquid Glass: la direzione «Capsula», vetro velato senza blur via OTA, il vetro nativo dopo la 1.1.0 · 2026-11-12 · Attiva; A finita con A7c-4 il 2026-11-26 (A1–A7c-3 in produzione con l'OTA 25); B in `main` per il taglio nativo dal 2026-11-27: barra, header e fogli in vetro vero velato col fondo del tono, misurati a 4,5:1, approvati dall'utente
- ADR-0381 — La live in chat e nel Feed, anche programmata: una sola `live_share` per registrazione con più pubblici, le live programmate in `planned_lives`, la schermata dal vivo nell'app che legge ogni 10 s · 2026-11-12 · Proposta
- ADR-0381, precisazione A1a — La live vista nell'app: il link facoltativo, `LiveShareMade` per non rompere l'app di oggi, i limiti per persona, `skipped` uguale per tutti, le copie notturne senza destinatari · 2026-11-12 · Attiva
- ADR-0381, precisazione A2a — Le live programmate: il legame va dalla condivisione alla programmata, la fila solo di chi si segue a pagine, montate da `install_live_shares` · 2026-11-12 · Attiva
- ADR-0381, precisazione A1b — La live in un messaggio: un rimando senza chiave esterna, solo in una conversazione aperta, solo per chi dice `live` · 2026-11-12 · Attiva
- ADR-0381, precisazione B1 — La live in chat nell'app: la condivisione senza link per la chat, il menu di «Sharing live», la schermata dal vivo come `Modal` · 2026-11-12 · Attiva
- ADR-0381, precisazione A2b — La push «Remind me» parte con la live, una volta sola, senza giro · 2026-11-18 · Attiva
- ADR-0381, precisazione B2a — La fila «Live» del Feed: schede una sopra l'altra, riletta ogni minuto, «Live in the Feed» senza link · 2026-11-18 · Attiva
- ADR-0381, precisazione B2b — Programmare e chiudere una live dall'app: il foglio senza dipendenze, la domanda all'avvio, la push che apre la live, il post legato dalla coda · 2026-11-21 · Attiva
- ADR-0382 — Il post di un altro si manda come rimando e si linka col consenso dell'autore: l'allegato `post` nei messaggi letto coi permessi di chi legge, la pagina pubblica di un post «Everyone», l'interruttore «Links to my posts» acceso all'inizio · 2026-11-12 · Accettata
- ADR-0384 — Il gesto dal bordo sinistro su iOS: la pagina segue il dito e si chiude come la sua «←» · 2026-11-12 · Attiva
- ADR-0369 — La corsa su misura nelle schede della palestra: un campo `runner` facoltativo nel programma, i ritmi dal telefono, la proposta a fine ciclo dalle corse salvate · 2026-11-11 · Accettata
- ADR-0343, precisazione A — La carrozzina nel motore, nel contratto e nell'API: la rete `wheel`, le forme dell'attività in `Activity.shapes`, i record su 1 e 5 km, il profilo nascosto nell'app · 2026-11-12 · Attiva
- ADR-0380, precisazione B1b/B2 — Il sonno nel post: un campo `sleep` nel disegno visto al posto di una richiesta per riga; nell'app tutto dietro `SLEEP_POSTS_ON` e nessun lettore di Salute in `main`; al server solo con l'interruttore acceso e un post che altri vedono · 2026-11-12 · Attiva
- ADR-0342, precisazione A3 — La città detta subito: gli edifici contati attorno alla partenza prima di leggere la neve, sopra 280 per km² «no open snow», un conteggio che non arriva non cambia nulla · 2026-11-12 · Attiva
- ADR-0380, precisazione B2b — Il sonno a fine palestra e a fine vasca: lo stesso interruttore di B2, e la notte aspetta l'attività nella coda sua prima di partire · 2026-11-12 · Attiva
- ADR-0343, precisazione B — La carrozzina nell'app: le forme di uno sport nel suo profilo, la fila sotto il percorso dalle stesse forme, il tempo della camminata, i record su 1 e 5 km · 2026-11-12 · Attiva
- ADR-0373 — L'alpinismo registrato senza percorso; la parte A solo sul server, prima del contratto, con la deroga in una costante (`SERVER_FIRST`) · 2026-11-12 · Attiva
- ADR-0386 — Lo stretching come sport: l'attività `stretching` registrata senza percorso come la palestra, le routine di ADR-0378 in «Draw», lo sport nato `ready: false` · 2026-11-12 · Attiva
- ADR-0385 — Overpass in errore: un job lo chiede una volta sola, 5 secondi invece di 60 quando il suo stato non si legge, un tentativo su un secondo servizio spento finché il server non lo accende · 2026-11-12 · Accettata
- ADR-0371 — Il pianificatore completo: almeno due sport per piano, il corpo libero senza kg, i giorni di altri sport in `outing` e la meta in `target`, le settimane verso la meta calcolate sul telefono · 2026-11-11 · Attiva
- ADR-0387 — Il «+» del Feed: un'attività aggiunta da lì parte con «Everyone», eccezione ad ADR-0304; il foglio «Add activity» con solo «From a file» · 2026-11-12 · Attiva
- ADR-0375, precisazione R6 — Corsa e volo nella stessa attività (hike & fly): i tratti a piedi e in aria divisi dal GPS sul telefono, corretti a mano, nel JSON delle statistiche; il riepilogo nelle liste dei post; le calorie tratto per tratto · 2026-11-18 · Attiva
- ADR-0375, precisazione R5 — Sotto «Record your flight»: i record del volo da due campi nel JSON delle statistiche, solo per il volo, `GET /me/flight-bests`, il calendario filtrato sui voli, la precisione del GPS · 2026-11-12 · Attiva
- ADR-0352, precisazione — «Share live at start»: il link dal vivo a fine conto alla rovescia di un volo, se il pilota lo ha acceso; resta com'era l'ultima volta, solo il link · 2026-11-12 · Attiva
- ADR-0342, precisazione B e C — Le ciaspole nell'app: `isPlacedFree` dove la neve fa come l'acqua, nessun disegno a mano sulla neve, «Record your day» dentro le ciaspole, il conteggio anche nei job · 2026-11-12 · Attiva
- ADR-0366, precisazione — Le uscite in bici nel catalogo: `activity` solo quando non è una corsa, le uscite in fondo al file di città, il parametro `activity` (senza: le corse), le zone da un estratto, entrano le otto forme lette a occhio · 2026-11-18 · Attiva
- ADR-0388 — Il parapendio completo: uno strumento di volo con dati gratuiti e formati aperti, senza accordi con terzi; gli spazi aerei li carica il pilota; supera «Nessuna guida in volo» di ADR-0375 · 2026-11-21 · Attiva
- ADR-0380, precisazione B3 — La scheda «Sleep» del profilo: quale notte è sul profilo lo dice il server, niente lascia il telefono prima di «Share», «Stop sharing» toglie ogni notte · 2026-11-12 · Attiva

- ADR-0272, precisazione C — Il post di sole foto è un disegno senza corsa: l'autore in `drawings.user_id`, la chiave del telefono, pubblicato con la prima foto, solo alle app che dicono `photos` · 2026-11-21 · Attiva
- ADR-0393 — L'attrezzatura: una lista per iscritto con foto e nota, più attrezzi per attività, i totali contati dal server, visibile come il profilo, legata ai capi taggati · 2026-11-21 · Proposta
- ADR-0390 — Il «+» del Feed per pubblicare tutto: una lista di sei voci in ordine, ognuna costruita dal task che la possiede e mostrata solo quando è pronta; «Everyone» anche per la palestra scritta a mano e la scheda pubblicata · 2026-11-21 · Attiva
- ADR-0394 — La scheda della palestra come post: un disegno senza corsa con la fotografia della scheda in `drawings.plan`, kg compresi, ritmi e data della meta esclusi, solo alle app che dicono `plans`; «Use this plan» con la rotta delle schede che c'è · 2026-11-21 · Attiva
- ADR-0395 — La palestra scritta a mano: lo stesso `PUT /me/gym-sessions` con `source` `manual`, l'editor delle schede, fuori anche dai livelli · 2026-11-21 · Attiva
- ADR-0380, precisazione E — Il post del sonno da solo: un disegno senza corsa che porta la sua notte, un tipo `sleep` in `X-MuW-Reads`, la notte tenuta finché un post è suo · 2026-11-21 · Attiva
- ADR-0375, precisazione R6d — La gara riaperta: i tratti in aria dalla traccia salvata, calcolati a ogni lettura; la mappa a due colori e i tempi divisi in «My activities» · 2026-11-22 · Attiva
- ADR-0392 — Lo storico di ogni esercizio in palestra: «Last time» coi campi già compilati, «History» col massimale stimato, un indirizzo che legge solo le proprie serie · 2026-11-22 · Attiva
- ADR-0391 — Il link di un post apre l'app: l'id resta dopo il `#`, l'app prende dall'indirizzo solo un id a forma di disegno e chiede il post all'API, senza account prima l'ingresso; la barra di Safari subito, i link verificati con la prossima build nativa · 2026-11-22 · Attiva
- ADR-0127, precisazione (TASK-487) — «Feed» senza esempi: senza account l'invito ad accedere, con account e nessun post una riga che lo dice · 2026-11-22 · Attiva
- ADR-0397 — «Alimentazione»: un contacalorie senza diete, cibi da USDA più quelli dell'utente, piano a settimana e diario solo sul telefono, bilancio = assunte − (riposo + attività) senza doppi conti, tabella solo per il proprietario, spenta fino alla build nativa che legge da Salute · 2026-11-22 · Proposta
- ADR-0272, precisazione C2 — Il post di sole foto nell'app: «Photos only» da «Add past activity» e dal «+» del Feed, una coda sul telefono come le corse, la sua scheda e la sua pagina, niente «Share» · 2026-11-22 · Attiva
- ADR-0375, precisazione R6e — Il post di una gara a due colori: `flight` anche in `GET /drawings/{id}`, solo se la linea del post ha i punti della corsa; lo schema openapi delle due risposte torna coi suoi campi · 2026-11-23 · Attiva
- ADR-0398 — La modalità Allenamento: scelta «Gym», la barra diventa «Today» · «Workouts» · «Food» · «Feed» · «Profile» come per lo sci; il Coach è una pagina, il Cibo è la pagina di TASK-489, quattro tab finché `NUTRITION_ON` è spento · 2026-11-23 · Attiva
- ADR-0394, precisazione B — La scheda pubblicata nell'app: `plans` in `X-MuW-Reads`, una coda sul telefono che tiene l'id dei post mandati, la guida di «Use this plan» nello stesso foglio del piano, il limite di 20 guardato prima · 2026-11-23 · Attiva
- ADR-0390, precisazione A — La lista del «+» nell'app: «Record now» come l'avvio senza percorso di «Draw», «Photos only» dritto al modulo di C2, «From a file» con «Files» aperto subito (`fileAtOnce`), il titolo della voce aperta · 2026-11-23 · Attiva
- ADR-0399 — Il Coach MuW: regole scritte con il loro studio, sul telefono e senza AI, al massimo tre consigli, la scheda cambia solo con «Apply», solo con account, l'omino di TASK-490 B · 2026-11-23 · Attiva
- ADR-0397, precisazione — Il codice a barre come parte a sé su Open Food Facts (`expo-camera`, solo il codice esce dal telefono), macronutrienti dopo, «My daily target» scritto solo dall'utente, riposo e kcal di ogni allenamento correggibili a mano · 2026-11-23 · Proposta
- ADR-0397, precisazione 2 — La tabella di base dei cibi: 314 voci da USDA SR Legacy (aprile 2018) ricavate da uno script, nomi in cinque lingue in file loro; la pagina «Nutrition» in due PR, con schermate e testi approvati · 2026-11-23 · Proposta
- ADR-0397, precisazione 3 — Le attività nel bilancio stimate da quello che dice la lista privata (palestra dal solo tempo, escursione senza salita), oggi «finora» e fuori dal totale della settimana, il diario del telefono e non dell'account · 2026-11-23 · Proposta
- ADR-0397, precisazione 4 — Il codice a barre su Open Food Facts in due PR (ricerca senza fotocamera, poi il lettore), solo kcal e mai kilojoule convertiti; un lettore unico degli allenamenti di Salute in `health/`, spento fino alla build nativa · 2026-11-23 · Proposta
- ADR-0396 — La scheda si adatta a com'è andata: un campo `adapt` facoltativo nel programma, una domanda per allenamento, i passi applicati dal telefono, la risposta tenuta con «Save» · 2026-11-23 · Attiva
- ADR-0366, precisazione B3 — Le uscite lunghe in bici (40 e 50 km) solo nel catalogo: il limite dei 30 km tolto solo nello strumento, le uscite lunghe dopo quelle che c'erano nel file di città, limite del pianificatore a 4 GB · 2026-11-23 · Attiva
- ADR-0327, precisazione G — Il battito in palestra: il consenso e i pulsanti del nuoto, le kcal di Keytel col battito, media e massimo sul server, mostrati solo con gli esercizi · 2026-11-23 · Attiva
- ADR-0400 — La mappa dei decolli: i siti da OpenStreetMap estratti dal server, la scheda del decollo con lo storico dei voli di MuW contato dal server, mai giudizi sulle condizioni · 2026-11-23 · Proposta
- ADR-0401 — Le scadenze della vela: revisione, ripiegatura della riserva e controllo dell'imbrago sull'attrezzatura di TASK-486, in tabelle nuove, intervalli scelti dal pilota, l'avviso nella campanella · 2026-11-23 · Proposta
- ADR-0402 — I gruppi per uscire insieme: le uscite sono le corse di gruppo di ADR-0269 con `group_id`, anche senza percorso; Public, Request, Invite only; un solo admin e fino a 3 co-admin; l'elenco dei membri solo ai membri; la chat di gruppo come parte E · 2026-11-23 · Proposta
- ADR-0402, precisazione A — L'API dei gruppi: la foto quadrata del profilo, l'admin di prima diventa membro, un invito a chi ha chiesto lo fa entrare, «Recent activity» solo dai post di una corsa degli sport del gruppo · 2026-11-24 · Attiva
- ADR-0403 — Le proprie bolle nei messaggi sul giallo dell'app: una faccia piena `accent` con parole `onAccent`, non vetro; quello che la bolla porta su una piastra neutra · 2026-11-23 · Attiva
- ADR-0405 — L'animazione iniziale intera solo la prima volta e dopo una versione nuova, corta (1 s) e saltabile con un tocco le altre; animali e musiche del video restano dentro l'app · 2026-11-23 · Attiva
- ADR-0406 — Il proprietario dei dati sul telefono è il `public_id` sul suo server, non l'id numerico; la corsa, gli allenamenti in corso e i dati del corpo sono di ogni account, nascosti finché rientra · 2026-11-26 · Attiva
- ADR-0393, precisazione E–G — L'attrezzatura nel post, nei capi taggati e nella campanella: rotte a parte (`/drawings/{id}/gear`, `/gear/{id}`), `gear_id` sul tag col `SET NULL`, il limite una riga sola nella campanella per attrezzo e limite, «From my gear» coi tipi della foto · 2026-11-23 · Attiva
- ADR-0264, aggiunta (TASK-496) — Con l'app dietro i punti nuovi vanno in un diario accanto al file della corsa, il file intero ogni tanto; in tasca la mappa non riceve niente e l'orologio non scatta · 2026-11-23 · Attiva
- ADR-0397, precisazione 5 — «Nutrition» anche dal profilo e a fine attività, la pagina del giorno animata (anelli su una scala, macronutrienti senza obiettivo), l'obiettivo di calorie proposto da MuW solo come stima in secondo piano con protezioni, il controllo del peso, la lettura dell'energia attiva dopo una build successiva · 2026-11-24 · Attiva
- ADR-0407 — «Longevity»: cinquanta storie animate dentro l'app, ognuna da una fonte pubblica ufficiale citata, senza revisione di un professionista e con scritto che MuW non è fatta da professionisti; video delle persone e compensi dopo · 2026-11-24 · Attiva
- ADR-0408 — La modalità «Nutrition»: scelta come uno sport la barra diventa Today · Plan · Explore · Feed · Profile; la scheda «Food» dell'allenamento resta; dopo TASK-490 D ed E · 2026-11-24 · Attiva
- ADR-0409 — «Sign up» e «Log in» gialli: il pulsante in fondo al modulo è `accent` con parole `onAccent`, un'eccezione scelta dall'utente a «il giallo è del percorso» · 2026-11-24 · Attiva
- ADR-0410 — Le email in produzione: con Resend partono quelle dell'account, le segnalazioni e il feedback; «quando sono via» e il riassunto solo se `SHAPEROUTE_EMAIL_ROUNDS` li nomina · 2026-11-24 · Attiva
- ADR-0411 — Le forme nuove del motore (inverno, feste, sport e i 35 contorni di TASK-418): sagome sulla carta, disegni sulle strade, poi una sola registrazione e il catalogo · 2026-11-27 · Accettata
- ADR-0394, precisazione C — La scheda pubblicata aperta fuori dal Feed: profilo, campanella, push, link e chat la aprono per id sulla scheda della mappa, col riquadro del Feed; nella griglia del profilo una cella sua · 2026-11-23 · Attiva
- ADR-0258, precisazione C2 — La foto a penna alzata nell'API e nell'app: i pezzi solo se il contorno a penna alzata è lo stesso, al più `MAX_WALKS`, `pen_up` e `pieces` insieme, nessun pezzo dopo una modifica, «Lift the pen between parts» acceso all'avvio · 2026-11-26 · Attiva
- ADR-0412 — L'anteprima dal vivo di «Draw»: un'immagine di mappa del Feed a scatti di scala, la sagoma disegnata dall'app col primo punto del contorno sulla partenza · 2026-11-26 · Attiva
- ADR-0311, aggiunta (TASK-499) — Il bollino della campanella chiede solo il numero (`GET /notifications/unread`, una query, niente foto), con il ripiego sulla lista per un server di prima; la riga dei «live» non chiede con l'app dietro · 2026-11-26 · Attiva
- ADR-0175, aggiunta (TASK-497) — La foto di chi scrive un commento: il commento porta l'indirizzo della foto piccola (`author.photo`, quello del feed), l'app non chiede più il profilo intero; supera il punto 7 · 2026-11-24 · Attiva
- ADR-0264, aggiunta C (TASK-496) — Il file intero della corsa si scrive accanto e poi si sposta sopra il vecchio: una chiusura a metà scrittura lascia l'ultimo file intero · 2026-11-26 · Attiva
- ADR-0359, aggiunta (TASK-519) — Su «Map» la freccia punta dove punta il telefono, col cono; la mappa non gira; bussola spenta su «Data» e in tasca · 2026-11-26 · Attiva
- ADR-0177, aggiunta F (TASK-214) — Dopo un percorso che lascia la pagina del motore oltre 700 MB, senza richieste in attesa, la pagina si chiude e la richiesta dopo ne apre una nuova: la memoria di Pyodide non scende mai · 2026-11-26 · Attiva
- ADR-0264, aggiunta D (TASK-496) — In una giornata di sci o un volo registrati, alla mappa vanno solo i punti nuovi dell'ultimo tratto finché la divisione in tratti resta la stessa · 2026-11-26 · Attiva
- ADR-0414 — Le coordinate delle linee intere che l'API risponde all'app a 6 decimali, ognuna dentro la sua cella da 5: il nome della linea (`line_key`, il `favoriteKey` dell'app) non cambia; l'SQL resta a 15 cifre · 2026-11-27 · Attiva
- ADR-0378, aggiunta C ed E (TASK-466) — Lo stretching dopo la palestra entra nell'allenamento; le routine proprie si compongono in «Draw», si salvano nell'account e si pubblicano nel Feed come le schede palestra · 2026-11-26 · Proposta
- ADR-0177, aggiunta G (TASK-214) — Una zona che il server non ha intorno al telefono la prepara da solo, come un luogo tenuto (TASK-334): il telefono la trova all'apertura dopo; il log non scrive mai il nome della zona · 2026-11-26 · Attiva
- ADR-0279, aggiunta (TASK-498) — La chat aperta chiede solo i messaggi nuovi (`latest` nella pagina, `?after=` sulla stessa rotta), più piano nel silenzio (5 s, 15 s, 30 s: scelta dell'utente); la pagina intera una volta al minuto; una risposta uguale non ridisegna · 2026-11-26 · Attiva
- ADR-0413 — «Surprise me»: forma e distanza scelte dall'app fra i percorsi del catalogo vicini alla partenza (10 km), chiesti al primo tocco; fuori dal catalogo le forme di riserva; le sorprese venute sotto il 90% ricordate sul telefono · 2026-11-26 · Attiva
- ADR-0415 — Lo stretching rifatto (TASK-520): una home a categorie con routine composte da un solo elenco di esercizi, i movimenti come respiro largo, la stessa figura vista anche di fronte, gli esercizi nuovi in file nuovi con chiavi stabili · 2026-11-27 · Attiva
- ADR-0397, precisazione 8 — Il controllo del peso (TASK-489 K1): pesate, obiettivo e tappe dell'account e non del telefono, l'ultima pesata diventa il peso del corpo da quel giorno, obiettivo mai sotto un BMI di 18,5 né prima dei 18 anni, congratulazioni per le tappe dell'utente e la costanza, mai per la velocità · 2026-11-27 · Proposta
- ADR-0340, precisazione E — Il meteo del post: MET Norway chiesto dal server al salvataggio, entro 3 ore dalla fine, col punto di partenza a ~1 km; neve esclusa; chiesto una volta · 2026-11-27 · Attiva
- ADR-0397, precisazione 6 — Gli anelli di «Nutrition» in rosso e verde: consumate nel rosso delle calorie (`energy`), mangiate in un verde nuovo (`food`), mai come unico segno e mai come giudizio su surplus e deficit; anelli disegnati con le viste, senza dipendenze nuove; nessuna stima dell'obiettivo nell'anno in cui si compiono 18 anni · 2026-11-26 · Attiva
- ADR-0397, precisazione 7 — Le ricette in «Nutrition»: un ricettario di MuW fatto dei cibi della tabella, numeri calcolati dall'app, la ricetta si cambia e resta sul telefono, entra nel diario come i suoi ingredienti; frasi per chef e supermercati che aprono la posta; niente copiato, niente promesso · 2026-11-27 · Proposta
- ADR-0415, aggiunta B e C (TASK-520) — La figura di fronte tiene i piedi fermi mentre il bacino si sposta e sfuma quando il busto si capovolge; un braccio verso chi guarda si piega; sette viste cambiate dall'utente; le routine composte con una tenuta sola, più lunga prima di un secondo giro; chiavi delle categorie senza punto, come le vuole il server; «Today» con la notte fino alle 4 · 2026-11-27 · Attiva
- ADR-0293, precisazione (TASK-509) — La figura delle pagine vuote si disegna una volta e resta intera; una pagina vuota ha il suo pulsante quando c'è una cosa da fare; una tessera senza percorso mostra la sagoma della forma in grigio · 2026-11-26 · Attiva


## Voci nuove

## ADR-0415, aggiunta B e C (TASK-520) — La figura di fronte coi piedi fermi e la sfumatura; le routine composte; «Today» con la notte

**Stato**: Attiva · 2026-11-27 · TASK-520. Aggiunta ad ADR-0415, che resta
com'è. **Scelte dell'utente** (2026-11-27): cinque movimenti dell'elenco
si disegnano di fronte o dall'alto invece che di lato («Di fronte»);
«90/90 hips» e «Side-lying quad» dall'alto («Sì, dall'alto»); «Today»
propone «Bedtime» dalle 21 alle 4 («Sì, fino alle 4»). **Decise
dall'agente su delega dell'utente** le scelte tecniche qui sotto. Codice:
parte B nelle #1672, #1681, #1684, #1687; A2 nella #1691; parte C nella
#1693.

**Contesto**: scrivendo i 50 esercizi e provandoli al simulatore sono
venuti fuori casi che ADR-0415 non aveva: gesti che vanno verso chi
guarda, piedi che devono restare fermi, un busto che si capovolge. La
parte C ha poi dovuto dire come si compone una routine e con che nome si
salva.

**Decisione**:

1. **Piedi fermi** (`planted` su una posa di fronte, `frontSway`): in un
   affondo laterale e nei cerchi del bacino è il bacino che si sposta sopra
   i piedi, non i piedi che scivolano sotto un bacino fermo. Una posa
   `planted` si disegna coi piedi al centro (`frontDrift`).
2. **La sfumatura** (`frontFlips`): quando tra due pose il busto si
   capovolge (in piedi → piegato in avanti a gambe larghe) la figura di
   fronte sfuma da una all'altra invece di girare. Visto di fronte quel
   gesto non è una rotazione: disegnato come tale, il busto ruotava di lato
   come una lancetta. Trovato al simulatore.
3. **Un braccio che viene verso chi guarda si piega**: braccio e
   avambraccio girano in versi opposti, la mano va dritta di traverso
   (Arm openers, Open book). I segmenti non si accorciano, quindi è il solo
   modo di far vedere uno scorcio. Dove nemmeno questo basta resta un
   limite scritto nei test (a metà dei Knee sways le gambe sono dritte).
4. **Due viste per lo stesso esercizio**: `front` si aggiunge a `pose`
   senza toglierla (90/90, Side-lying quad); la schermata disegna `front`
   quando c'è.
5. **Il catalogo delle categorie è generato** dall'elenco approvato
   (Allegato B del task file): in una categoria vengono prima gli esercizi
   che la nominano per prima. Lo script sta fuori dal repository
   (`out/stretching-nuovo/c/`); i test controllano il risultato.
6. **La composizione** (`compose.ts`): una tenuta sola per tutta la
   routine, vicina a quella che durata e livello chiedono (i riposi il
   doppio); una lista corta si tiene più a lungo prima di fare un secondo
   giro, e al massimo un terzo; una scelta che non riempie i suoi minuti
   (entro 20 secondi, 3 secondi al minuto sulle lunghe) non si offre.
   «Intense» solo dove c'è almeno un esercizio profondo, «solo in piedi»
   solo con almeno tre esercizi non a terra. In ogni giro prima in piedi,
   poi a terra, i riposi alla fine.
7. **Le chiavi delle categorie sono lettere, cifre e trattino basso**
   (`running_after`, `intimacy_before`): è la forma che il server accetta
   come nome di una routine (`ROUTINE_PATTERN` in `stretch_sessions.py`, e
   il CHECK delle tabelle), così una sessione fatta da una categoria si
   salva senza toccare il server.
8. **I 15 esercizi di prima dicono dove si fanno** solo dove serve:
   `position: "floor"` su `hipFlexor`, `cat` e `child`, i tre che non sono
   in piedi.
9. **I cinque colori dei gruppi** tengono 4,5:1 su `background`, `surface`
   e `surfaceRaised` nei due toni a ogni passo: il nome di un gruppo e la
   sua icona sono scritti in quel colore.

**Motivo**: le prime quattro tengono vero il disegno senza librerie e
senza un secondo modo di animare; le altre tengono le routine prevedibili
(la stessa scelta dà sempre la stessa routine) e salvabili col server
com'è.

**Conseguenze**: nessuna dipendenza nuova, nessuna migrazione, nessun
passo sul server, nessuna schermata cambiata. Le tre routine di TASK-466
(`routines.ts`) restano com'erano e sono ancora quelle che i promemoria
aprono: dove subentrano le nuove lo decide la parte D. «After run» da 5
minuti composta ha gli stessi cinque esercizi di oggi, col flessore
dell'anca per ultimo perché è in ginocchio. «Splits» esiste solo
«Intense» (due soli esercizi dolci).

## ADR-0340, precisazione E — Il meteo del post: MET Norway chiesto dal server al salvataggio, entro 3 ore dalla fine, col punto di partenza a ~1 km; neve esclusa; chiesto una volta

**Stato**: Attiva · 2026-11-27 · TASK-410 parte E (privacy #1663, codice
#1633, sul server col passo 26). Le scelte di prodotto sono **dell'utente**
(2026-11-07, scelta 4 «Sì, MET entro 3 ore»; 2026-11-26, E1–E5 in
`tasks/TASK-410.md`); il come è **deciso dall'agente su delega
dell'utente**, con la lista dei file approvata dal Coordinatore (fork 3).

**Contesto**: ADR-0340 prevedeva il meteo dell'attività nella pagina del
post. MET Norway (Locationforecast, CC BY 4.0, già usato per lo sci) non ha
un archivio: dà le ore dall'ora in corso in avanti. Un archivio storico
(Open-Meteo) sarebbe un fornitore nuovo, gratuito solo per uso non
commerciale.

**Decisione**:

1. **Quando**: dopo la risposta a `PUT /me/activities/{key}/stats` (il
   telefono lo manda una volta dopo il salvataggio), in un compito di
   FastAPI fuori dalla transazione: un MET lento non trattiene il telefono,
   `activities.py` non cambia. Solo se l'ora del server è entro 3 ore dalla
   fine della corsa; l'ora di MET che contiene la fine o, senza ore passate,
   la più vicina entro 3 ore.
2. **Quali corse**: registrate con MuW (`source = muw`), con una traccia,
   non sulla neve (`skiing`, `xc_skiing`, `ski_touring`, `snowshoeing`: per
   la neve la Privacy promette a MET la posizione della stazione, mai
   quella dell'utente). Importate, scritte a mano o arrivate tardi: nessun
   meteo, nessuna card (E3).
3. **Cosa va a MET**: il primo punto della traccia arrotondato a 2 decimali
   (~1 km), senza altitudine né nome; lo stesso trasporto dello sci
   (`MetTransport`: User-Agent, contatto, timeout), una cache sua.
4. **Chiesto una volta**: il risultato va in `run_stats.stats.weather`
   (`temperature_c`, `symbol`, `wind_ms`, al decimo); senza risposta o
   senza una temperatura leggibile resta `weather: null` e non si riprova,
   nemmeno a un altro `PUT …/stats`, che conserva il valore.
5. **Chi lo vede**: chi vede il disegno, come le altre stats (non dice
   niente del corpo). Si accende solo nel server avviato da `__main__`
   (`install_run_weather`): un'app di `create_app`, come nei test, non va
   mai in rete.
6. **L'app**: la card «Weather» sotto il riepilogo (simbolo e temperatura
   grandi, il vento sotto; °F e mph con le miglia, come lo sci), senza
   credito (E2: il credito MET sta nei Termini, «Services of others»). Un
   meteo che l'app non sa leggere vale nessuno, senza rifiutare le altre
   stats.

**Conseguenze**: il meteo esiste solo per le corse salvate da quando il
passo 26 è sul server, e per nessuna corsa vecchia; è l'ora in cui il
server chiede, al più 3 ore dopo la fine, non sempre quella della corsa;
nessuna migrazione e nessuna variabile nuova (`SHAPEROUTE_MET_CONTACT`
c'era); la card arriva sui telefoni con un OTA.

## ADR-0397, precisazione 8 — Il controllo del peso: le pesate dell'account, il peso del corpo aggiornato, l'obiettivo dentro una soglia citata

**Stato**: Proposta · 2026-11-27 · TASK-489 parte K1 (parte 0 chiusa,
codice dopo la parte J in `main`). Numero dal Coordinatore (fork 3). Le
scelte di prodotto sono **dell'utente** (2026-11-27, in
`tasks/TASK-489.md`, sezione «K1»); il come è **deciso dall'agente su
delega dell'utente**. Precisa il punto 6 della precisazione 5.

**Contesto**: il punto 6 della precisazione 5 dice che le pesate restano sul
telefono e che le congratulazioni non ci sono sotto la soglia di peso basso
né sotto i 18 anni, ma non dice di chi è il file, se una pesata cambia il
peso con cui MuW conta, né quale soglia. Da TASK-507 D (ADR-0406) il corpo
(`body.json`) è di ogni account; il resto di «Nutrition» è del telefono
(precisazione 3).

**Decisione**:
1. **Le pesate sono dell'account**: le pesate, il peso obiettivo, le tappe,
   ogni quanto chiedere e il «Not now» stanno in un file per account
   (`ownedFile("weigh-ins.json")`, `body/weighIns.ts`), come il corpo. Un
   altro account sullo stesso telefono non li vede. Restano sul telefono e
   non arrivano al server.
2. **L'ultima pesata diventa il peso del corpo** (`saveBody`), da quel giorno
   in poi: riposo e calorie delle attività lo usano da lì; le calorie già
   salvate nei post non cambiano. Un peso cambiato a mano in «Settings» è
   una correzione e non entra nel grafico. Togliere l'ultima pesata non
   cambia il peso del corpo. «Recalculate» si offre solo a chi usa la stima
   di MuW per l'obiettivo di calorie (parte J).
3. **La soglia**: un BMI di 18,5, il sottopeso negli adulti per l'OMS
   (indicatore «Underweight among adults, BMI < 18.5») e per i CDC («Adult
   BMI Categories»), pagine lette il 2026-11-27 e citate in «How we
   calculate». Il peso obiettivo non si scrive sotto 18,5 × altezza² e la
   scheda mostra il minimo.
4. **Chi può avere un obiettivo**: chi ha altezza e anno di nascita, e 18
   anni o più. L'app conosce solo l'anno: chi compie 18 anni nell'anno
   conta ancora come minorenne, come la stima della parte J. Senza quei
   dati, o sotto i 18 anni, niente obiettivo né congratulazioni sul peso.
5. **Le congratulazioni**: per la tappa e l'obiettivo che l'utente ha
   scritto (mai proposti da MuW), non quando il peso di oggi è sotto la
   soglia; per la costanza a 5, 10, 25 e 50 pesate e a 30, 100 e 365
   giorni di diario, per tutti; mai per la velocità. Uguale per chi vuole
   perdere, prendere o mantenere il peso.
6. **Ogni quanto**: 1, 2 (di partenza) o 4 settimane, oppure mai; la scheda
   compare solo aprendo «Nutrition». La notifica è una parte dopo K1,
   spenta di partenza.
7. **Il grafico** è fatto con le viste e `Animated`, come gli anelli della
   parte H: nessuna dipendenza nuova. Il peso ha un colore suo, il token
   `weight` (un viola), aggiunto in `theme/tokens.ts` nel turno del
   Coordinatore e riusato da TASK-523 per il Profilo; con «Riduci
   movimento» niente si muove. Il colore non è mai l'unico segno.

**Alternative scartate**: le pesate nel file delle impostazioni di
«Nutrition» (le vedrebbe un altro account: il difetto chiuso da TASK-507);
la pesata a parte dal peso del corpo (due pesi diversi, e i conti su quello
vecchio finché l'utente non lo riscrive); una soglia scritta a memoria o
proposta all'utente senza fonte; le tappe proposte da MuW.

**Conseguenze**: prima che K1 esca serve la PR di privacy e termini
approvata dall'utente (le pesate nell'elenco di quello che resta sul
telefono, il file per account, il limite dell'obiettivo detto giusto). Per
Apple (linea guida 1.4.1), al taglio nativo le note per la revisione
dicono che la soglia viene da una fonte citata.

## ADR-0415 — Lo stretching rifatto: categorie e routine composte, movimenti, la figura anche di fronte

**Stato**: Attiva · 2026-11-27 · TASK-520. Numero dal Coordinatore (fork 3,
2026-11-27). **Scelte dell'utente** (parte 0, una domanda per volta, tutte
del 2026-11-27): la mappa delle 54 categorie, l'elenco dei 65 esercizi, lo
schizzo della home con un colore per gruppo, il nome «Intimacy», i testi in
inglese, le traduzioni dei 50 esercizi nuovi, il video MP4 della routine
come ultima parte. **Decise dall'agente su delega dell'utente** le scelte
tecniche qui sotto. Il dettaglio di prodotto sta in
`docs/tasks/TASK-520.md` e non si ripete qui. Codice finora: A1 nella
#1666, la parte B dalla #1672; i punti 1, 6, 7 e 8 valgono da ora ma il
loro codice arriva con le parti A2 e C–F.

**Contesto**: lo stretching di TASK-466 (ADR-0378) ha 15 esercizi, poche
routine scritte a mano e una figura fatta di View girate, vista di lato
(ADR-0147: nessuna libreria di disegno). L'utente lo vuole rifatto: una
home a categorie (zona del corpo, momento, prima e dopo ogni sport,
intimità, altro), varianti di durata e di intensità, circa 65 esercizi,
una pagina per esercizio. La struttura prende spunto da un'app del
settore; nomi, disegni, icone, testi e colori sono nostri.

**Decisione**:
1. **Le routine si compongono**, non si scrivono una per una: ogni
   categoria ha un elenco ordinato di esercizi; durata (3, 5, 10, 15–20
   minuti) e variante (dolce o intensa, in piedi o a terra) scelgono
   quanti e con che tenuta, sempre allo stesso modo per gli stessi
   ingressi. Per questo ogni esercizio dice dove si fa (`position`) e
   quanto è forte (`level`). Circa 250 liste a mano non si terrebbero in
   ordine.
2. **Un movimento («Move») è il respiro, più largo e col suo passo**: la
   figura va tra la posa e la sua fine e torna, in loop, mentre il tempo
   scorre come per una tenuta. `Figure` prende solo la durata di un giro
   (`breathMs`, dal `tempoMs` dell'esercizio); il limite di pochi gradi
   (`BREATH_MAX_DEGREES`) resta per le tenute. Nessun motore nuovo e
   nessuna libreria.
3. **La vista di fronte è la stessa figura con altri segmenti**
   (`posesFront.ts`, `FigureFront.tsx`): dieci invece di dodici, le due
   braccia e le due gambe in vista, spalle e anche come due barre corte.
   Gli angoli sono quelli dello schermo (0 giù, 90 a sinistra, 180 su) e
   i lati sono quelli dello schermo, non della persona; l'altro lato è la
   posa specchiata, raggiunta passando per la posizione in piedi.
   `above: true` vuol dire sdraiato visto dall'alto: la figura sta a metà
   del riquadro invece che sul pavimento. Un esercizio la usa se ha il
   campo `front`; `pose` resta obbligatorio per chi legge l'elenco.
4. **I campi nuovi dell'esercizio sono tutti facoltativi** (`kind`,
   `tempoMs`, `position`, `level`, `front`, `frontBreath`): i 15 esercizi
   di prima e le routine salvate non cambiano.
5. **Gli esercizi nuovi stanno in file nuovi** (`posesMore.ts`,
   `exercisesMore.ts`, poi `posesFrontMore.ts`) e **una sola lista li
   raccoglie tutti** (`allExercises.ts`: `ALL_EXERCISES`, `exerciseByKey`,
   `isMove`): prima i 15, poi i nuovi, blocco dopo blocco. **Una chiave
   non cambia mai e non si riusa**: le routine salvate e pubblicate
   (ADR-0378, aggiunta E) nominano gli esercizi per chiave. I file di
   TASK-466 (`exercises.ts`, `poses.ts`, `routines.ts`) si toccano il meno
   possibile.
6. **I colori dei cinque gruppi sono token dedicati** (`stretch.*` in
   `tokens.ts`), con il test di contrasto nelle quattro tinte: non si
   riusano `runDay`, `muscle`, `food`, che vogliono dire altro.
7. **L'anello del tempo è fatto di 48 View tonde**, non di un arco: un
   arco vorrebbe una libreria di disegno.
8. **Gli sport si scrivono «{sport} · Before» e «{sport} · After»**: il
   nome dello sport è già tradotto, non servono frasi «After {sport}» per
   ogni lingua. Il video della routine nasce nella pagina del video della
   corsa (`src/share/videoPage.ts`), con una scena sua.
9. **Ogni posa nuova ha i suoi test**: sta sul pavimento e mai sotto, in
   fondo al respiro come a riposo; resta intera su un telefono stretto
   (scivola quando si allunga molto, come `drift` già fa); le mani e i
   piedi che devono toccarsi o toccare terra lo fanno; il respiro va nel
   verso dell'esercizio (la coscia verso il petto, il tallone verso il
   gluteo). `bones` appende le braccia in cima al busto mentre `Figure`
   le disegna a 0,9: dove conta, il test ha quella tolleranza e lo dice.

**Motivo**: tenere un solo modo di disegnare e di animare la figura, e un
solo elenco di esercizi, fa crescere il catalogo senza che ogni routine
diventi un pezzo a sé da mantenere; i file nuovi tengono separati due
task che lavorano nella stessa cartella.

**Conseguenze**: nessuna dipendenza nuova, nessuna migrazione, nessuna
schermata cambiata finché non entra la parte D (la home). Gli esercizi
nuovi sono nell'elenco ma nessuna routine li mostra prima della parte C.
I testi nuovi entrano con le loro quattro traduzioni, approvate
dall'utente. Il numero 14 dell'elenco approvato, «Hands clasped behind»,
era lo stesso gesto di «Chest opener»: al suo posto `goalpost`, col sì
dell'utente. Nessun consiglio medico: «Stop if it hurts» resta, e le
categorie per la schiena dicono che non sostituiscono un medico. Per
«Intimacy» vale la classificazione d'età sugli store scritta nel task file
(16+ su App Store).

## ADR-0413 — «Surprise me»: forma e distanza scelte dall'app fra i percorsi del catalogo vicini alla partenza

**Stato**: Attiva · 2026-11-26 · TASK-448 (in `main`: #1613 la scelta,
#1641 la pastiglia). Che cosa si vede e che cosa si promette è **scelta
dell'utente** (2026-11-26, sei risposte: «Nel passo 2 di Draw»; «Riempie e
aspetta»; «Forma e 5 o 10 km»; «Come sempre»; «A piedi e in bici»; «Sì,
vanno bene» sui testi; «Sì, va bene» sulle schermate dal simulatore); il
come è deciso dall'agente su delega dell'utente. Numero dal Coordinatore.

**Contesto**: idea I1 della prova dell'11 novembre 2026: chi non sa cosa
disegnare vuole una forma e una distanza «che vengono bene dove sono». Il
motore dice quanto una forma è venuta bene solo **dopo** il calcolo
(`similarity`); un punteggio prima sarebbe un lavoro del motore. Il
catalogo di «Explore» (TASK-441) ha già, in 63 città, percorsi disegnati a
0,90 o più e scelti a occhio: a piedi forme a 5, 10 e 21 km, in bici otto
forme da 20 a 50 km. `GET /recommended-routes` li dà per posizione, con
forma e distanza chiesta. Non c'è un limite di distanza per forma: il
limite è dello sport.

**Decisione**:
- **L'app sceglie solo cosa chiedere**: una coppia forma–distanza, scritta
  in «Draw» come la scriverebbe l'utente (`setShapeText`, la distanza con
  `useDrawDistance().choose`). Il percorso lo decide il motore con «Draw
  route», come sempre. Nessun cambio al motore, all'API o al contratto.
- **«Vicino» sono 10 km** dalla partenza scelta in «Draw»
  (`SURPRISE_RADIUS_M`): i percorsi di una città partono entro 1 km dal suo
  centro, e la richiesta è quella di «Explore», con la posizione
  arrotondata (TASK-363). In bici la stessa richiesta con
  `activity=cycling`.
- **La lista si chiede al primo tocco**, non all'apertura della pagina: chi
  non tocca la pastiglia non fa una richiesta in più. Resta in memoria 10
  minuti per partenza e sport; i tocchi dopo rispondono subito. Se non
  arriva entro 2,5 s, o il server non risponde, la scelta viene dalle forme
  di riserva e la lista si richiede al tocco dopo.
- **La scelta** (`route/surprisePick.ts`, funzione pura): prima la forma,
  alla pari fra le forme vicine, poi una delle sue distanze. A piedi 5 o
  10 km, mai 21; in bici 20, 25 o 30 km e solo le otto forme del suo
  catalogo. Mai la coppia del tocco prima, e finché ce n'è un'altra mai la
  stessa forma: lo stesso cuore a un'altra distanza non è una sorpresa. Il
  caso è iniettato (`random`): nei test un generatore con seme.
- **Le forme di riserva**, senza percorsi vicini: a piedi le sette più
  tenute nel catalogo (cuore, cerchio, stella, luna, smiley, sole,
  farfalla) a 5 o 10 km; in bici una delle otto a 20 km.
- **Quelle venute male non tornano**: una richiesta di forma a una distanza
  da sorpresa che finisce con ogni percorso della risposta sotto 0,90, o
  rifiutata dal motore (`shape_not_drawable`), è tenuta in `surprise.json`
  sul telefono per quella partenza (al più 60, dimenticate oltre 1 km) e
  non è più proposta da lì. Vale per ogni richiesta così, non solo per
  quelle nate dalla pastiglia: l'app non tiene traccia di chi ha scelto la
  forma. Una richiesta a penna alzata non insegna niente: il suo voto non
  si confronta. Se ogni coppia è venuta male, la pastiglia risponde lo
  stesso, con una forma di riserva.
- **Gli sport** stanno in una tabella dentro `surprisePick.ts`: corsa e
  camminata (che disegna sulla rete della corsa e vede i suoi percorsi) e
  bici. Gli altri sport non hanno un catalogo e non hanno la pastiglia.
- **Con «Miles»** la distanza proposta è il miglio intero più vicino, come
  le altre distanze che l'app propone (`offeredDistanceM`).
- **Per chi non vede** la pagina cambiare, il lettore di schermo dice la
  scelta con parole che la pagina ha già («Heart, 5 km»).

**Conseguenze**: nessuna promessa scritta (scelta dell'utente): la
pastiglia dice solo «Surprise me». I percorsi del catalogo partono dalla
piazza della città, non da casa dell'utente: che una forma venga bene in
centro è un buon indizio, non una garanzia, e il risultato ha l'avviso
sotto il 90% e «Try 8 km» come ogni altro. Fuori dalle città del catalogo
la scelta è fra sette forme. Solo JS/TS, l'impronta iOS non cambia; un
solo testo nuovo, nelle cinque lingue. Nel simulatore (Trento, API locale
col catalogo) un tocco ha dato «Fantasmino, 10 km» e «Stella, 10 km» a
piedi, «Sole, 30 km» in bici; su un telefono non è provato.

## ADR-0279, aggiunta (TASK-498) — La chat aperta chiede solo i messaggi nuovi, più piano nel silenzio; la pagina intera una volta al minuto

**Stato**: Attiva · 2026-11-26 · TASK-498. **Deciso dall'agente su delega
dell'utente** («Avvia la 498», 2026-11-26), tranne il ritmo, che è **scelta
dell'utente** («Sì, va bene», 2026-11-26). Aggiunta senza numero nuovo e
lista dei file dal Coordinatore. Codice nella #1610 (server) e nella #1634
(app). **Niente WebSocket**, come in ADR-0279 e in ADR-0381 punto 6: resta
una richiesta HTTP ogni tanto.

**Contesto**: punto O8 della lettura del codice del 2026-11-23. Una
conversazione aperta riscaricava ogni 5 secondi la sua ultima pagina
intera, con la foto dell'altro, anche quando nessuno scriveva (sul database
di prova: 9 283 byte e 8 query a controllo), e a ogni risposta la schermata
si ridisegnava anche se era uguale.

**Decisione**:

1. **`latest` nella prima pagina** di
   `GET /conversations/{public_id}/messages`: il posto del messaggio più
   nuovo, nella forma di `next` (`microsecondi-uuid`); `0-000…0` in una
   conversazione vuota, `null` nelle pagine dei più vecchi. Il posto lo
   dice il server: l'app non lo calcola.
2. **`?after=<latest>` sulla stessa rotta** risponde `MessageNews`:
   `state`, i messaggi dopo quel posto, `more`, il `latest` nuovo. Niente
   `person` (quindi niente foto), niente `attachments`; due query oltre a
   quella del token. `after` insieme a `cursor`: `422`.
3. **La stessa rotta, non una nuova**: un server di prima ignora `after` e
   risponde la pagina, che l'app legge come pagina; un'app che non ha
   ricevuto `latest` non manda mai `after`. Così la parte dell'app non
   aspetta il passo sul server e tornare indietro è sicuro. Nessuna
   migrazione, nessun indice nuovo, `schemas.py` non toccato.
4. **Il ritmo** (dell'utente): ogni 5 s finché ci si scrive; ogni 15 s
   dopo un minuto senza messaggi; ogni 30 s dopo cinque; di nuovo 5 s
   quando arriva un messaggio, quando se ne manda uno, al ritorno
   nell'app. Con l'app dietro non si chiede, come prima.
5. **La pagina intera resta**: all'apertura, al ritorno nell'app, una
   volta al minuto, e subito quando la risposta corta dice un altro
   `state` o `more`. Lei sola porta un messaggio cancellato dall'altro o
   nascosto da una segnalazione, nome e foto dell'altro, una scheda di post
   o di live cambiata, un video scaduto, cosa si può allegare, e un
   messaggio salvato un attimo dopo quello già letto ma scritto un attimo
   prima (resta dietro `latest`).
6. **Niente ridisegno**: `messages/conversationReading.ts` (senza React)
   rende lo stesso oggetto quando la risposta non cambia niente, e ogni
   messaggio non cambiato resta lo stesso oggetto.
7. **Il pallino dei non letti non cambia**: `PUT …/read` quando arriva un
   messaggio dell'altro, poi `recount`.

**Alternative scartate**: una rotta nuova per i messaggi nuovi (un server
di prima risponderebbe `404`, da distinguere da una conversazione
sparita); il posto calcolato dall'app dalle date dei messaggi che tiene (la
forma del posto resta una cosa del server); far dire alla risposta corta
anche le cancellazioni e la foto (tornano le query che si volevano
togliere: bastano entro un minuto con la pagina).

**Conseguenze**: sul database di prova un controllo senza novità passa da
9 283 byte (4 998 con gzip) e 8 query a 104 byte e 3 query; con un
messaggio nuovo 266 byte e 3 query. Un'ora di conversazione aperta e ferma
passa da 720 controlli (circa 3,6 MB e 5 760 query) a 138 (circa 0,31 MB e
714 query). In una chat aperta e ferma un messaggio può comparire fino a
15 s dopo (30 s dopo cinque minuti di silenzio); quello che porta solo la
pagina, entro un minuto invece che entro 5 s. Dodici risposte uguali di
fila danno al più un passaggio di React, senza ridisegnare le righe, poi
nessuno. **Non misurati**: i tempi e il piano della query sul server vero, i
byte e la batteria su un telefono. Nessun cambio nativo, nessuna
dipendenza.

## ADR-0414 — Le coordinate delle risposte a 6 decimali dentro la cella dei 5: la chiave delle linee non cambia

**Stato**: Attiva · 2026-11-27 · TASK-501 parte B (#1650). Deciso
dall'agente su delega dell'utente; numero dal Coordinatore (fork 3,
2026-11-26).

**Contesto**: voce O11 della lettura del codice del 23 novembre: le linee
intere escono dal server con tutte le cifre di un double
(`ST_AsGeoJSON(…, 15)`), mentre 6 decimali sono circa 10 cm e pesano quasi
la metà. Il task file diceva di scrivere `ST_AsGeoJSON(…, 6)`. Una linea
però ha un nome, `best_routes.line_key`, lo stesso del `favoriteKey`
dell'app: due hash sui punti arrotondati a 5 decimali. Con questo nome un
preferito si salva una volta sola, il cuore sa se un percorso è già tenuto,
una corsa conta per il percorso di catalogo che ha seguito
(`count_run`, `best_routes.uses`). Arrotondare a 6 e poi a 5 sposta circa
una coordinata su venti nella cella accanto (46,0671249 → 46,067125 →
46,06713 invece di 46,06712): simulato, cambiano nome 261 linee su 300 con
20 punti e 300 su 300 con 200, sia con le coordinate a 7 decimali di
OpenStreetMap sia con le tracce GPS. Il telefono darebbe a un percorso
ricevuto un nome diverso da quello che il server tiene.

**Decisione**:
- **L'SQL resta a 15 cifre**; l'accorciamento si fa in Python, solo su
  quello che si risponde all'app (`shaperoute_api/answer_lines.py`:
  `short`, `short_point`, `short_line`).
- **Ogni coordinata va a 6 decimali dentro la sua cella da 5**: se
  l'arrotondamento semplice la porterebbe in un'altra cella, prende il
  sesto decimale accanto, un milionesimo di grado (11 cm) più in là. Così
  la linea che l'app riceve ha il nome della linea che il database tiene.
  Su 2 milioni di coordinate: nessun nome cambiato, il 4,8% spostato di un
  passo.
- **Dove**: un'attività aperta (percorso e traccia), un disegno, la pagina
  del link di un post, un preferito e un'uscita di gruppo aperti, e il
  punto di partenza di questi ultimi due nelle loro liste.
- **Dove no**: le anteprime delle liste, già a 5 decimali
  (`recommended.preview`), quindi anche `messages.py`; `best_routes.py`
  (legge a 9); le query che leggono una linea per riscriverla nel database
  (`drawings.RUN_TO_DRAW`, `drawing_retrack.py`). I numeri e le distanze si
  calcolano prima, sulle linee intere.

**Conseguenze**: nessuna scrittura cambia e nessuna migrazione. Le risposte
di una corsa da 3600 punti con un percorso da 2000 scendono, in locale, da
218 781 a 122 238 byte (gzip da 83 629 a 31 861); accorciare costa circa
1 µs a punto. Un percorso fatto di nodi OpenStreetMap ha già 7 decimali:
lì si guadagna una cifra per coordinata. Un test rifà il `favoriteKey`
dell'app riga per riga con i numeri di JavaScript
(`tests/test_coordinate_decimals.py`) e lo confronta con `line_key`: chi
cambia l'uno o l'altro lo vede. Le impronte del motore non cambiano
(`route_store` legge solo `route_engine`). Non misurati: il server vero, il
telefono.

## ADR-0378, aggiunta C ed E (TASK-466) — Lo stretching in palestra e le routine pubblicate

**Stato**: Proposta · 2026-11-26 · TASK-466 parti C ed E, parte 0.
**Scelte dell'utente** del 2026-11-26 (task file, «Parte 0 di C» e «Parte
0 di E»); il modo **deciso dall'agente su delega**, file e forma dal
Coordinatore.

**Decisione**:

1. **C — lo stretching dopo la palestra entra nell'allenamento**: alla
   fine «Remember to stretch» / «Skip» / «Stretch», poi «After gym» da 3,
   5 o 10 minuti; routine, minuti, durata ed esercizi vanno con la
   sessione di palestra (`stretch` in `PUT /me/gym-sessions/{key}`,
   tabella `gym_stretches`, migrazione 0089) e si vedono nel suo post con
   gli esercizi. Un solo post, nessuna attività in più.
2. **E — le routine proprie come le schede palestra** (ADR-0394): si
   compongono in «Draw» › «Stretching» › «My routines» (nome, fino a 20
   dei 15 esercizi in ordine, 20/30/45/60 s ciascuno, fino a 20 routine),
   stanno sul telefono e nell'account, si pubblicano dal «My routines» e
   dal «+» del Feed come fotografia; chi vede il post la fa («Do this
   routine», salvata come sessione di TASK-475) o la copia («Save to my
   routines»).
3. **Privacy**: una frase per le sessioni di stretching (anche quelle di
   TASK-475, mai nominate finora) e una per le routine e i loro post,
   entrambe col sì dell'utente.

**Conseguenze**: C1 e EA passano dal server (migrazioni, passi del
Coordinatore col sì dell'utente); C2 ed EB escono con un OTA. La riga nel
riepilogo di fine palestra (`GymEnd.tsx`) arriva dopo TASK-489 I e
TASK-511 B. Diventa «Attiva» con il codice.
## ADR-0397, precisazione 7 — Le ricette in «Nutrition»

**Stato**: Proposta · 2026-11-27 · TASK-489 parte L (parte 0 chiusa; codice in
una sessione dedicata: dati #1678 e colori #1686 in `main`). Le scelte di prodotto sono **dell'utente** (2026-11-27, sei
risposte in `tasks/TASK-489.md`, sezione «L»); il come è **deciso
dall'agente su delega dell'utente**.

**Contesto**: l'utente vuole ampliare «Nutrition» con un catalogo di
ricette, poterle cambiare vedendo le calorie seguire, uno stile più curato
e a colori, e due frasi che cerchino collaborazioni (chef; supermercati e
negozi di spesa online). ADR-0397 dice che MuW non dà diete né consigli e
che l'AI non produce numeri.

**Decisione**:
1. **Un ricettario, non una dieta**: le ricette non sono consigliate a
   nessuno e non portano parole come «light», «sano», «per dimagrire».
   Resta sotto la riga «Estimates only. MuW does not provide diets or
   medical advice.».
2. **Una ricetta è un elenco di cibi della tabella con i grammi**
   (chiave `usda-…`), più porzioni, tempi e passi. Calorie e
   macronutrienti a porzione li calcola l'app coi conti del diario: nei
   dati delle ricette non c'è nessun numero di calorie. Sale, erbe e
   spezie stanno nei passi e non sono contati; i passi non nominano mai i
   grammi.
3. **Le prime dodici le scrive MuW** (scelta dell'utente, che le ha
   rilette): preparazioni di casa, e l'app lo dice («Home recipes written
   by MuW, not by a chef.»). **Niente copiato** da siti o libri, niente
   foto di altri; il nome di uno chef vero solo con il suo accordo
   scritto.
4. **La ricetta si cambia** (grammi, porzioni, ingredienti aggiunti o
   tolti) e i numeri seguono. La versione dell'utente resta **sul
   telefono**, con le altre cose di «Nutrition», segnata «Changed by you».
5. **Nel diario e nel piano entra come i suoi ingredienti**, una porzione,
   uno per riga, come cibi normali: nessun tipo nuovo di voce, i conti e i
   file restano quelli di oggi, e l'utente vede e corregge ogni grammo.
6. **Le due frasi** aprono la posta del telefono verso
   `hello@getmuw.app` (scelta dell'utente); non mandano niente da sole e
   **non promettono niente**: la spesa dall'app oggi non c'è.
7. **Colori**: tre colori nuovi per proteine, carboidrati e grassi (anche
   nelle barre del diario, scelta dell'utente: cambia il punto 2 della
   precisazione 5 dove erano «senza colore») e le tinte delle schede, in
   `theme/tokens.ts`, con un test di contrasto per ognuno. Non sono il
   giallo del percorso né il rosso e il verde di consumate e mangiate, e
   non sono mai l'unico segno. I toni li sceglie chi scrive il codice.
8. Niente di nuovo esce dal telefono: la privacy non cambia.

**Alternative scartate**: una voce «ricetta» nel diario (cambia i file del
diario e del piano, e nasconde i grammi); calorie scritte nella ricetta
(numeri a mano, e sbagliati appena la si cambia); ricette prese da un sito
(testi e foto sono di altri).

**Conseguenze**: il codice in una sessione dedicata, da `main` dopo la
parte J. Dopo: condividere una ricetta nel Feed con le foto (L2), che
tocca server e privacy e avrà la sua decisione.

## ADR-0397, precisazione 6 — Gli anelli di «Nutrition» in rosso e verde; la stima e i 18 anni

**Stato**: Attiva · 2026-11-26 · TASK-489 parti H e I. Il colore è una
scelta **dell'utente** («Voglio un colore», poi «A: rosso e verde» fra tre
prove mostrate in chat, 2026-11-26); i toni, il nome del token e i
controlli sono **decisi dall'agente su delega dell'utente**, con il sì del
Coordinatore a toccare `theme/tokens.ts`. **Cambia il punto 2 della
precisazione 5**, dove gli anelli erano «nei colori del testo e non in
verde e rosso».

**Decisione**:
1. L'anello di fuori, quello che il corpo ha consumato, è `energy`: il
   rosso che le calorie hanno già in tutta l'app (TASK-424 C3). L'anello
   di dentro, quello che si è mangiato, è un token nuovo, **`food`**, un
   verde: `#4FD08A` nel tono scuro (fino a `#7BE3AA` al passo più
   chiaro), `#095428`–`#0F6B35` nel tono chiaro.
2. Gli stessi due colori nelle colonne di «This week», nei due anelli
   piccoli dell'invito a fine attività e nell'esempio della porta della
   prima volta. Le barre di proteine, carboidrati e grassi restano nel
   colore del testo.
3. **Il colore dice quale numero è, non se va bene**: «Surplus» e
   «Deficit» restano senza colore, come deciso nella parte D. Il verde non
   è un premio e il rosso non è un avviso.
4. **Mai l'unico segno**: ogni anello ha accanto la sua etichetta, il suo
   numero e un puntino del suo colore (regola dell'App Store «non solo
   colore», e chi non distingue rosso e verde legge le parole).
5. Contrasto, a ogni tono e passo, in `theme/foodContrast.test.ts`: `food`
   almeno 4,5:1 su `background`, `surface` e `surfaceRaised`; `food` ed
   `energy` almeno 3:1 su `border`, che è la traccia dell'anello. `food`
   non è `accent` (il giallo resta del percorso) né `energy`.
6. Gli anelli sono disegnati con le viste e `Animated` di React Native:
   l'app non ha `react-native-svg` e non si aggiunge una dipendenza per
   questo. Passano con un aggiornamento normale.

**Alternative scartate**: le altre due prove mostrate in chat, non scelte
dall'utente; il giallo dell'app (è del percorso); un verde già in uso
(`map.green` è il prato della mappa, `videoLine.green` la linea del video:
nessuno dei due è un colore dell'interfaccia, e l'app non ha un token
«success»).

7. **La stima dell'obiettivo e i 18 anni** (parte J, a difesa del punto 4
   della precisazione 5 e di quello che dice la privacy, «never shown to
   people under 18»): l'app conosce solo l'anno di nascita, e chi compie
   18 anni nell'anno in corso può averne ancora 17. In quell'anno MuW non
   propone nessun numero («From your data MuW suggests no number for
   this.»); sotto, come prima, «MuW suggests no calorie number to people
   under 18.». Nessun testo nuovo.

**Conseguenze**: `docs/UI.md` ha la riga di `food` accanto a `energy`.
Visti nel simulatore il 2026-11-26, tono scuro e chiaro
(`out/TASK-489/shots/09`–`12`). Codice nella #1652 (parte H) e nella #1660
(parte I); il punto 7 nella #1673 (parte J).

## ADR-0264, aggiunta D (TASK-496) — Sci e volo: alla mappa solo i punti nuovi dell'ultimo tratto

**Stato**: Attiva · 2026-11-26 · TASK-496 parte D. **Deciso dall'agente su
delega dell'utente** («intanto prepara il fix per sci e volo», 2026-11-26),
dall'idea scritta in «Idee per dopo» del task file; lista dei file e forma
dal Coordinatore. Codice nella #1642. **Estende il punto 7 dell'aggiunta
del 2026-11-23** (i punti nuovi di una corsa) a sci e volo.

**Contesto**: con la mappa in vista, a ogni punto di una giornata di sci
(`showLifts`) o di un volo (`showFlight`) `MapView` mandava alla pagina
tutta la traccia tagliata in tratti (discese e impianti, a piedi e in
aria). In tasca già niente (punto 6).

**Decisione**:

1. **`grownPieces`** (`map/grownPieces.ts`) confronta i tratti di adesso
   con quelli già detti alla pagina: uguali; cresciuto solo l'ultimo tratto
   di un gruppo, coi punti in più; oppure altro.
2. **Il messaggio `extendPiece`** (`layer`: `track`, `lifts` o `air`)
   aggiunge i punti all'ultima linea di quel livello nella pagina.
3. **Tutto intero come prima** quando si trova un impianto o un volo,
   cambiano i numeri delle discese, la pagina si ricarica o la giornata è
   inquadrata alla fine.

**Alternative scartate**: mandare sempre solo l'ultimo punto e lasciare
alla pagina la divisione in tratti (la pagina dovrebbe rifare
`splitAtLifts`/`splitAtAir`, che stanno nell'app); toccare la mappa di volo
di `air/` (è di TASK-479, e non c'entra con la traccia di `MapView`).

**Conseguenze**: misurato nel simulatore con una giornata finta di 40 punti
(non sul telefono): sci 3 messaggi interi e 24 di soli punti (~75 byte
l'uno), volo 2 interi e 28 di soli punti; dopo una ricarica della mappa il
disegno è identico al pixel. Una giornata vera ha migliaia di punti: il
messaggio intero cresceva con lei, quello nuovo no. MapLibre ridisegna
ancora tutta la linea a ogni punto. Nessun cambio nativo, nessuna
dipendenza.

## ADR-0394, precisazione C — La scheda pubblicata aperta fuori dal Feed: profilo, campanella, push, link e chat la aprono per id sulla scheda della mappa, col riquadro del Feed; nella griglia del profilo una cella sua

**Stato**: Attiva · 2026-11-23 · TASK-485 parte C (#1481, `2a5c7590`, in
produzione con l'OTA 26). Le schermate le ha approvate l'utente («Sì,
approvo»); il modo è **deciso dall'agente su delega dell'utente**, con la
lista dei file approvata dal Coordinatore (fork 3).

**Contesto**: dopo la parte B la scheda pubblicata si vedeva bene solo nel
Feed. Da un profilo, dalla campanella, da una push, dal link del post o da
una chat si apriva come un disegno vuoto: niente linea, «0 km», i pulsanti
di una corsa.

**Decisione**:

1. **Una strada sola**: tutte e cinque le porte aprono il post per id con
   `drawings.open`, cioè sulla mappa con `social/DrawingCard.tsx`. Lì, se
   `source` è `plan` e la scheda si legge, la scheda mostra il riquadro del
   Feed (`PlanPost`) con «Use this plan» quando non è tua, e nasconde
   distanza, descrizione doppia, invio, GPX, «Draw it near me» ed «Edit the
   drawing». `PostPage.tsx` non cambia: la apre solo il Feed, che il piano
   lo mostrava già.
2. **Nella griglia del profilo** la cella del piano (`PlanGridTile`) dice
   «Workout plan», il nome e la settimana a quadratini (pieno la palestra,
   bordato una corsa o un'uscita, tenue il riposo). Un piano che non si
   legge tiene la cella di prima.
3. **Niente parte nativa**: il link apre l'app con la strada JS che c'è
   già, quindi non aspetta TASK-482 D; tutta la C esce con un OTA. Nessun
   testo nuovo, nessun cambio all'API.

**Alternative scartate**: aprire il piano con `PostPage` anche da profilo,
notifica e link (cinque chiamanti da cambiare invece di una scheda); un
foglio nuovo solo per il piano (un'altra strada da tenere uguale al Feed).

**Conseguenze**: la prova sul telefono resta all'utente, nella prova
generale.

## ADR-0258, precisazione C2 — La foto a penna alzata nell'API e nell'app

**Stato**: Attiva · 2026-11-26 · TASK-297 parte C2 (#1520) · deciso
dall'agente su delega dell'utente. Il testo nuovo e «Edit the outline»
nascosto a penna alzata sono stati approvati dall'utente il 2026-10-27
(«ok vanno bene», «ok va bene»); il merge è avvenuto col suo «Sì, unisci»
del 2026-11-24.

**Contesto**: ADR-0258 (parte C) insegna al motore a dividere una foto in
pezzi: gli altri soggetti e i buchi. C2 porta i pezzi fino all'app. Il
branch, scritto il 2026-10-28, era rimasto senza PR. Il 2026-11-23 è stato
allineato a un mese di `main`: richiesta con `placement`, `fit` e `laps`,
camminata come corsa (`engine_activity`), disegno ancorato.

**Decisione**:

1. `POST /image-outlines` ricalca la foto anche con `pen_up=True`. Dà
   `pieces` e `image_pieces`, nella cornice di `points`, solo se il
   contorno a penna alzata è **lo stesso** di quello a penna giù. Così
   l'app manda indietro gli stessi `points`, con i pezzi o con i tratti, e
   nel contratto non c'è un secondo contorno. Costa un secondo
   tracciamento: circa il doppio del tempo, sotto 1 s nelle prove.
2. **Al più `MAX_WALKS` pezzi**: ogni pezzo è una camminata, e un
   percorso, una corsa salvata e un preferito ne tengono al più tanti. Con
   più pezzi non se ne manda nessuno e la foto si disegna a penna giù: un
   logo a metà sarebbe un altro disegno.
3. **`pen_up` e `pieces` vanno insieme**: l'uno senza l'altro è
   `invalid_request`, con il motivo. I pezzi che tornano dal telefono si
   controllano senza incroci, come li ha tracciati il motore. Il motivo di
   prima («pen_up is for the letters of a word») resta dentro quello
   nuovo.
4. **Le modifiche** (TASK-079) valgono per la linea a penna giù. Un
   contorno modificato non ha pezzi: `POST /image-outline-edits` risponde
   con `pieces` vuoti. «Edit the outline» si vede solo a penna giù. Dopo
   una modifica l'interruttore sparisce e il disegno si fa a penna giù.
   Lo fissa `test_an_edited_outline_has_no_pieces_and_is_drawn_with_the_pen_down`.
   Una modifica che tenga i pezzi sarebbe un task a parte.
5. In `shared-types`, `ImagePenUpRouteRequest` è un tipo a sé, con
   `pen_up: true` e `pieces` obbligatori. Così `ImageRouteRequest` resta
   com'era. I due campi nuovi di `ImageOutline` sono in una seconda
   dichiarazione, che TypeScript unisce alla prima.
6. Nell'app, l'interruttore è lo stesso «Lift the pen between parts»
   delle forme in pezzi e ha lo stato di quello delle parole: è acceso
   all'avvio. Se l'app non sa disegnare i pezzi uno per uno sopra la foto,
   lascia fuori i pezzi, mai il contorno.
7. L'ordine di uscita è: prima il passo sul server (il 22, `080a4e83`),
   poi l'OTA (la 26, `71fc76c4`). Un'app che manda `pen_up` lo fa solo
   dopo aver ricevuto dei `pieces` dall'API. `images.py` e `schemas.py`
   stanno anche nel motore del telefono, per questo `engine.zip` è stato
   rifatto per ultimo.

**Conseguenze**: le foto pronte di «Draw» vengono da
`samplePictures.json` e non hanno pezzi, anche quando la foto li
avrebbe: lì l'interruttore non compare. La prova sul telefono resta
all'utente.

## ADR-0412 — L'anteprima dal vivo di «Draw»: un'immagine di mappa a scatti di scala, la sagoma disegnata dall'app sulla partenza

**Stato**: Attiva · 2026-11-26 · TASK-449 (in `main`: #1593 le forme,
#1627 le immagini). Che cosa si vede è
**scelta dell'utente** (2026-11-26: «A, mappa vera»; «No, niente testo»;
«Sì, anche immagini»; «Sì, resta com'è» per l'attesa di TASK-442; «Sì, va
bene» sugli screenshot dal simulatore); il come
è deciso dall'agente su delega dell'utente. Numero dal Coordinatore.

**Contesto**: idea I2 della prova dell'11 novembre 2026: mentre cambiano i
km la sagoma si allarga sulla mappa, prima di calcolare. «Draw» è un modulo
a tutta pagina: la mappa grande (una WebView con MapLibre) aspetta nascosta
sotto, e l'anteprima di TASK-361 disegna la forma sempre alla stessa
grandezza in un riquadro con due strade finte; cambia solo la barra di
scala. Una seconda mappa viva dentro il modulo costerebbe una seconda
WebView sempre accesa; aprire il modulo sopra la mappa grande rifarebbe la
pagina. Il Feed ha già una pagina di mappa nascosta che scatta immagini per
una inquadratura data (TASK-162, ADR-0131), e la scheda delle pagine ne
tiene una montata (TASK-480).

**Decisione**:
- **La mappa è un'immagine**, chiesta con `useFeedMap` com'è: nessuna
  modifica a `feed/FeedMaps.tsx` né alla sua pagina. L'inquadratura si dà
  come una linea di due punti, gli angoli opposti del riquadro, che
  `lineCamera` inquadra per intero.
- **Il riquadro va a scatti**: ogni scatto guarda un pezzo di terreno largo
  √2 volte il precedente (due scatti, il doppio; da 250 m, arrotondato al
  metro), ed è centrato sul contorno alla distanza più
  grande che ci entra. Dentro uno scatto la mappa non cambia e solo la
  sagoma cresce: un tocco di − o + non chiede un'immagine e non passa dal
  ponte della WebView. Un'immagine per partenza, forma e scatto, tenuta
  come quelle del Feed. La proposta diceva «il doppio»: nel simulatore,
  appena dopo uno scatto doppio, la sagoma occupava meno di metà del
  riquadro; con √2 ne occupa sempre più di metà, per il doppio delle
  immagini lungo la stessa corsa della distanza.
- **A uno scatto nuovo l'immagine di prima resta**, sotto la sagoma, messa
  dove cade nel riquadro nuovo (`placeIn`), finché arriva la sua: la mappa
  si allontana subito e si fa nitida dopo, invece di restare vuota 1–2 s.
  Solo per la stessa partenza: un'altra partenza è un'altra mappa.
- **La sagoma la disegna l'app**, sopra l'immagine: segmenti tratteggiati
  col token `shapeGhost` (la stessa sagoma del risultato di TASK-442), il
  pallino della partenza `route.color`. Si ricalcola a ogni cambio della
  distanza: una funzione pura (`route/previewFrame.ts`), al più 148 punti
  di contorno. Chiesta a penna alzata, dove la forma lo offre, è disegnata
  nei suoi pezzi e la sua grandezza viene da quelli (`lookOf(…, apart)`).
- **Le immagini tracciate** hanno lo stesso pezzo di mappa sotto il loro
  contorno (`route/pictureLook.ts`), sotto l'anteprima della foto. A penna
  alzata, dove la foto ha pezzi, la grandezza viene da contorno e pezzi
  insieme, come il `pen_up.drawn_m` del motore.
- **Il credito della mappa** (`creditLine()`, la riga che c'è già sulle
  immagini del Feed) sta sull'immagine, su un fondo del colore della mappa.
- **Dove sta**: il primo punto del contorno (`lookOf(...).start`) sulla
  partenza, nord in alto, lunga quanto la distanza chiesta. È il primo
  piazzamento che il motore prova (ROUTE_ENGINE.md §3), non quello che
  sceglie: il motore può girarla, cambiare fase e correggere la scala.
  L'app non lo dice a parole (scelta dell'utente: nessun testo nuovo);
  resta «≈ L × A km». I conti sono in metri sul piano tangente alla
  partenza (`mapdraw/plane.ts`), mai in gradi.
- **Quando non c'è**: senza partenza, per una parola, e dove il server
  mette la forma liberamente (acqua e neve, `isPlacedFree`) resta
  l'anteprima di TASK-361.
- L'attesa e la sagoma del risultato di TASK-442 non cambiano.

**Conseguenze**: l'immagine arriva dalla rete, dopo la sagoma; finché non
c'è la prima la sagoma sta sul fondo della mappa, e senza rete resta così. Le
immagini dell'anteprima fanno la coda con quelle del Feed, una alla volta.
La sagoma può non coincidere con dove il motore metterà la forma: è il
prezzo di non calcolare niente prima di «Draw», e l'app non promette
altro che la grandezza. Nessun cambio al motore, all'API o al contratto;
solo JS/TS, l'impronta iOS non cambia. Misurato: in Node, sulle 31 forme
del catalogo in un riquadro di 340 × 190 punti, al più 0,19 ms per tocco
della distanza e 231 trattini; nel simulatore (bundle di sviluppo),
tenendo premuto − per 2,5 s, 29 mezzi km contro i 31 dell'anteprima di
prima. Su un telefono non è misurato. Una foto vera tracciata non è stata
provata nel simulatore: si prova sul canale preview prima dell'OTA di
produzione.

## ADR-0359, aggiunta (TASK-519) — Su «Map» la freccia punta dove punta il telefono, col cono; la mappa non gira

**Stato**: Attiva · 2026-11-26 · TASK-519. Chiesto dall'utente il
2026-11-26; la freccia **col cono** è scelta sua («Freccia + cono»). Il
resto è **deciso dall'agente su delega dell'utente**. Forma (un'aggiunta,
non un ADR nuovo) dal Coordinatore. **Estende ADR-0359 alla pagina «Map»**:
su «Compass» non cambia niente.

**Contesto**: su «Map» la bussola era spenta e la freccia seguiva solo la
traccia degli ultimi 10 m: da fermi, o appena partiti, non diceva dove si
guardava. Su «Compass» la seguiva già (TASK-431, messaggio `face`).

**Decisione**:

1. **Su «Map» la bussola resta accesa per la freccia sola**:
   `useHeadingUpMap` espone `facing` anche lì, senza chiedere giri alla
   mappa, che resta girata come il disegno. La pagina della mappa riceve
   `face` come su «Compass» e apre il cono; `App.tsx` e `MapView` non
   cambiano.
2. **La stessa direzione di «Compass»** (`mapHeading`: la bussola da fermi;
   correndo la bussola se calibrata, altrimenti la traccia) e gli stessi
   limiti (4°, 400 ms).
3. **Il nord in alto resta solo di «Compass»**: su «Map» il pulsante del
   nord è quello del disegno.
4. **Batteria**: su «Data» e sotto «Pocket» la bussola è spenta (nessuno
   vede la freccia); uscendo dalla tasca una lettura di prima non conta.
5. **Da «Map» a «Compass»** la bussola resta la stessa e la mappa gira
   subito dove punta la freccia, senza aspettare 4° nuovi.
6. **Una libreria senza bussola non fa danni**: `useCompass` prende anche
   l'errore immediato di `watchHeadingAsync` e dà null, come un telefono
   che rifiuta (15 test dell'app la simulavano senza bussola).

**Conseguenze**: nessuna dipendenza nuova, niente di nativo, impronta iOS
invariata; arriva con un OTA. La bussola resta accesa durante la corsa su
«Map», la pagina con cui la corsa si apre: un sensore in più, spento in
tasca. Restano fuori, come idee nel task file: un cono solo quando la
direzione viene dalla bussola, e la bussola spenta in tasca anche su
«Compass».

## ADR-0177, aggiunta G (TASK-214) — Il server prepara la zona che manca intorno al telefono

**Stato**: Attiva · 2026-11-26 · TASK-214 parte G. **Scelta dell'utente**
del 2026-11-26, alla domanda «quando il telefono chiede la mappa della sua
zona e il server non ce l'ha, cosa facciamo?»: **«Il server la prepara»**
(le altre: più zone in anticipo; lasciare così). Il modo è **deciso
dall'agente su delega dell'utente**; file e forma dal Coordinatore.

**Contesto**: `GET /phone-zones/{network}` risponde `404` quando il server
non ha una zona con 3 km intorno al punto: dal 10 al 25 ottobre più di metà
delle richieste (85 su 155). Lì il telefono non ha mappa e senza rete non
disegna. Il registro del server non scrive le posizioni (ADR-0096), quindi
non si sa dove: la scelta è cosa fare a ogni `404`.

**Decisione**:

1. **Dopo un `404` senza `prefetch=1`** il server mette in coda la zona con
   6 km intorno al punto (`PLACE_MARGIN_M`) con lo stesso `PlaceBuilds`
   dei luoghi tenuti (TASK-334, ADR-0290): una zona alla volta, solo quando
   non disegna percorsi (`RouteWork`) e senza `PAUSE_FILE`, con gli stessi
   tetti del giorno (3 per telefono, 20 in tutto, condivisi coi luoghi).
2. **La risposta resta `404`**: l'app non cambia; alla sua apertura dopo
   chiede di nuovo e la trova.
3. **Le zone chieste in anticipo** (`prefetch=1`, parti B2 e B2b) non
   preparano niente.
4. **Il log non scrive mai il nome della zona**: il nome è il suo riquadro,
   centrato sulla posizione arrotondata del telefono. `phone_file`
   scriveva «phone zone foot_46.01600_…» anche per i luoghi tenuti: ora
   scrive solo la rete.

**Privacy**: nessun dato nuovo lascia il telefono; il testo di oggi copre
già la mappa offline intorno a te (posizione arrotondata a circa 1 km) e
Overpass chiesto dal server per un'area che non ha (vede l'area, non chi).

**Alternative scartate**: costruire in anticipo molte più zone (un passo
lungo sul server e molto disco, e solo per le città); una risposta nuova
`202` al telefono (l'app avrebbe dovuto cambiare, senza vantaggio: chiede
già a ogni apertura).

**Conseguenze**: dove i telefoni aprono l'app senza zona, il server la
scarica da Overpass entro il tetto del giorno; carico su Overpass e disco
come per i luoghi tenuti. Solo server; `engine.zip` non cambia. Va sul
server con un passo del Coordinatore, col sì dell'utente.

## ADR-0406 — Il proprietario dei dati sul telefono è il public_id sul suo server, non l'id numerico

**Stato**: Attiva · 2026-11-26 · TASK-507. Le due regole su cosa vede un
altro account sono **scelte dell'utente** (2026-11-23: «Nascosta finché
rientra», «Di ogni account»); il modo è deciso dall'agente su delega
dell'utente. Numero dal Coordinatore.

**Contesto**: nella prova al simulatore del 23 novembre 2026 un account
appena creato aveva «Le mie attività: 3». Erano tre sessioni di stretching
di una prova del 21-11, rimaste nella coda del telefono e partite col
nuovo account, perché il database nuovo gli aveva ridato lo stesso
`User.id` (`out/TASK-507/VERIFICA.md`). Tutte le code del telefono
riconoscevano il proprietario solo da quel numero; la corsa e gli
allenamenti in corso non ne avevano nessuno, e su un telefono condiviso
passavano a chi entrava dopo. In produzione i numeri non si ripetono e
niente è arrivato al server.

**Decisione**:
- **Chi è il proprietario** (`account/phoneOwners.ts`): per ogni numero
  visto il telefono ricorda il `public_id` (un UUID che il server non ridà
  mai) e il server. A ogni ingresso, prima che una coda parta, se il numero
  ora è di un'altra persona o di un altro server, ciò che aspettava sotto
  di lui si lascia andare. Un account visto per la prima volta prende ciò
  che aspetta col suo numero, come prima.
- **La cancellazione dell'account** (`forgetPhoneDataOf`) svuota tutto
  quello che il telefono tiene per lui: code, sonno, palestra, schede e
  storico, piscina, stretching, foto, corpo e cuore, corse messe da parte,
  allenamenti in corso e dell'orologio. Prima ne svuotava cinque.
- **L'account dentro adesso** (`account/currentOwner.ts`): detto da
  `useAccount` prima che l'app mostri qualcosa; `useCurrentOwner()` per le
  schermate. Con nessuno dentro non si vede niente di nessun account.
- **Corpo e cuore di ogni account**: `body.json` diventa `body.<id>.json`,
  lo stesso `heart.json`; il file di prima va al primo account che entra.
  Ricerche e città recenti si cancellano all'uscita. Lingua, unità, tono,
  mappe e luoghi scaricati restano del telefono; la zona di casa si
  cancellava già all'uscita.
- **Le cose in corso hanno un proprietario**: `SavedRun.owner` nel file
  intero della corsa (mai nelle righe del diario); la corsa di un altro
  account va da parte con il suo diario (`current-run.<id>[-n].json`), non
  si scrive mai sopra e torna quando l'account rientra e il posto è libero.
  Palestra e nuotata in corso: un elemento per account. Allenamenti
  dell'orologio: l'account dentro quando sono arrivati, 10 per account.
  Una corsa senza proprietario (di prima, o senza account) è di chiunque.
- **Lo schermo** (`App.tsx`): la fine di una corsa di un altro account
  sparisce quando cambia l'account; quella dell'account che entra appare
  come all'apertura. Lo stato si aggiusta durante il render, non in un
  effetto (`react-hooks/set-state-in-effect`).

**Conseguenze**: una coda o un file nuovo del telefono che tiene dati di un
account deve avere il suo proprietario e la sua funzione di cancellazione
chiamata da `forgetPhoneDataOf`; un file personale si nomina con
`ownerFile`. Se la sessione scade durante una corsa, la sua fine non si
vede finché non rientra quell'account: poi compare e si salva. Nessun
testo nuovo, niente di nativo, niente sul server; la privacy resta vera.
Controllato da `phoneOwners.test.ts`, `accountData.test.ts`,
`trackStoreOwner.test.ts`, `workoutStoreOwner`, `poolStoreOwner`,
`watchRunsOwner` e `AppRunOwner.test.tsx`, e dalla prova al simulatore di
B1 (2026-11-24).

## ADR-0264, aggiunta C (TASK-496) — Il file intero della corsa si scrive accanto e poi si sposta sopra il vecchio

**Stato**: Attiva · 2026-11-26 · TASK-496 parte C. **Deciso dall'agente su
delega dell'utente** («intanto prepara le modifiche per 496», 2026-11-26),
dall'idea scritta in «Idee per dopo» del task file; lista dei file e forma
(un'aggiunta ad ADR-0264, come O1 e O2) dal Coordinatore. Codice nella
#1603. **Precisa il punto 2 dell'aggiunta del 2026-11-23** (il file
intero); la promessa della TASK-304 non cambia.

**Contesto**: `saveRun` scriveva `current-run.json` sul posto: iOS che
chiude MuW a metà di quella scrittura lasciava mezzo file, e all'apertura
`loadRun` non trovava nessuna corsa. Col diario succede molte meno volte,
ma succede ancora a ogni file intero (uscendo dal primo piano, a una pausa,
ogni 300 righe, alla fine). L'aggiunta del 2026-11-23 aveva scartato lo
spostamento perché il comportamento di `move` su un file che esiste non era
verificato: in `expo-file-system` 57 (`FileSystemPath.swift`) `move` con
`overwrite` toglie il file di arrivo e poi sposta, in due passi.

**Decisione**:

1. **`saveRun` scrive `current-run.json.new`** e lo sposta su
   `current-run.json` con `moveSync(…, { overwrite: true })`.
2. **All'apertura, prima di tutto il resto di `takeRunSlot`**, un `.new`
   rimasto accanto al file si sistema: se si legge come una corsa è più
   nuovo del file (lo spostamento è stato interrotto tra i suoi due passi)
   e ne prende il posto; se non si legge (interrotto mentre si scriveva) si
   toglie, e resta il file di prima. Il diario si legge dopo come sempre:
   una riga già dentro il file si salta.
3. **`clearRun` toglie anche il `.new`.**
4. **Dove i file non si spostano** (i finti dischi di molti test) si scrive
   sul posto come prima: i loro test non cambiano.
5. `takeRunSlot` e `moveRuns` di TASK-507 restano come sono.

**Alternative scartate**: scrivere un secondo file intero e tenere il più
nuovo che si legge (il doppio delle scritture del file intero, contro lo
scopo della TASK-496); un `rename` senza togliere prima il file (su iOS
fallisce se il file di arrivo esiste).

**Conseguenze**: una chiusura a metà del file intero lascia l'ultimo file
intero, o quello nuovo se era già scritto. Ogni file intero è una scrittura
e uno spostamento; nessun campo nuovo nel file, nessun cambio nativo,
nessuna dipendenza. Provato nei test (`trackStoreAtomic.test.ts`: scrittura
interrotta, spostamento interrotto, `.new` più nuovo, `.new` a metà,
cancellazione), non sul telefono.

## ADR-0177, aggiunta F (TASK-214) — La pagina del motore che tiene troppa memoria si chiude dopo il percorso

**Stato**: Attiva · 2026-11-26 · TASK-214 parte F. **Deciso dall'agente su
delega dell'utente** («intanto prepara il fix della memoria per 214»,
2026-11-26), dalla prova generale dello stesso giorno; lista dei file e
forma (un'aggiunta ad ADR-0177) dal Coordinatore. Solo app.

**Contesto**: la memoria di Pyodide (la memoria WebAssembly della pagina)
cresce e non scende mai. Misurato il 2026-11-26 col motore dell'app in Node
e nel simulatore: un percorso sulla zona di Trento (2,7 MB) porta la pagina
a 338 MB, su quella di Milano (5,9 MB) a 584 MB, su quella di Berlino
(31,8 MB) a 1,3–1,4 GB, e lì resta anche per i percorsi dopo su zone
piccole. Ripetere lo stesso percorso non la fa crescere (nessuna perdita).
La zona da 3 km che ogni telefono riceve non ha un tetto di dimensione (il
tetto di 12 MB vale per la zona larga della parte E). Se iOS chiude la
WebView durante un percorso, quella morte conta verso `MAX_DEATHS`; in
modalità aereo non c'è il server di riserva.

**Decisione**:

1. **`MEMORY_RELEASE_MB = 700`** (`phoneEngine.ts`): sopra i 584 MB di
   Milano, sotto i 1,3 GB di Berlino.
2. **Dopo il risultato di un percorso, di un «way back» o di un tratto**,
   se la pagina riferisce più di 700 MB e nessuna richiesta aspetta, la
   pagina si chiude con `reload()`, che c'era già: niente pagina finché la
   richiesta dopo non ne monta una nuova.
3. **Con richieste in attesa la pagina resta** e le prende in ordine; si
   chiude dopo l'ultima. Nessuna richiesta si perde.
4. **Dopo la lettura anticipata della zona** (`prepare`, parte E) la
   pagina resta, per quanto grande: quella memoria serve al percorso dopo.
5. **Una chiusura per memoria non è una morte**: non conta verso
   `MAX_DEATHS`.

**Alternative scartate**: riavviare subito la pagina (avvio e batteria
spesi anche quando non arriva nessun percorso); non dare al motore le zone
più grandi (in modalità aereo il telefono non disegnerebbe affatto lì);
liberare la memoria dentro Python (WebAssembly non la restituisce).

**Conseguenze**: dopo un percorso oltre i 700 MB il percorso dopo paga
l'avvio di Python (circa 6 s sul Mac) e la rilettura della zona; una pagina
nuova riparte da circa 80 MB. I percorsi sotto la soglia non cambiano.
Nessun cambio nativo, nessuna dipendenza, `route_engine` e `engine.zip`
invariati. La soglia è misurata sul Mac, non sull'iPhone.

## ADR-0311, aggiunta (TASK-499) — Il bollino della campanella chiede solo il numero; la riga dei «live» non chiede con l'app dietro

**Stato**: Attiva · 2026-11-26 · TASK-499 (punto O9 della lettura del
codice del 2026-11-23, che l'utente ha approvato con «Sì, tutte»). Il
disegno (una rotta a parte, il ripiego, il controllo di `AppState`) è
**deciso dall'agente su delega dell'utente**. Forma (un'aggiunta, non un
ADR nuovo) dal Coordinatore. **Precisa come la campanella di ADR-0311 tiene
il suo numero**; i periodi non cambiano (5 minuti qui, 60 s per la riga dei
«live» di ADR-0381) e l'utente non vede differenze.

**Contesto**: per il bollino dell'header l'app scaricava la prima pagina
delle notifiche (30 righe, ognuna con la foto da 128 px di chi ha agito, in
base64) all'avvio, ogni 5 minuti in primo piano e a ogni ritorno nell'app, e
ne teneva solo `unread`. Il server faceva tre query (la lingua, la pagina,
il conto), due delle quali con le foto. La riga dei «live» del Feed
chiedeva ogni 60 s anche con l'app dietro, al contrario dei bollini dei
messaggi e delle richieste di follow.

**Decisione**:

1. **`GET /notifications/unread`** → `{"unread": n}`
   (`NotificationsUnread`): una query sola, senza la lingua, senza le foto
   e senza i testi. Le regole (blocchi, account nascosti, 90 giorni, quello
   che non è più vero, i disegni che l'app non legge) stanno in un pezzo
   solo di SQL (`RULES_FROM` e `rules_sql`) usato dalla lista e dal conto:
   i due numeri non possono divergere. `GET /notifications` resta com'è e
   porta ancora `unread`.
2. **Una rotta e non `?limit=0` sulla lista**: la risposta ha un tipo suo,
   nel registro delle richieste si distingue dalla lista, e un server di
   prima risponde `404`, che l'app sa già leggere.
3. **Il ripiego nell'app** (`useBellOf`): il bollino chiede il numero da
   solo; con un `404` chiede la prima pagina come prima, e per quel token
   non richiede più il numero. La lista intera si scarica solo aprendo le
   notifiche. Per questo l'app e il server possono uscire in qualsiasi
   ordine.
4. **La riga dei «live»** (`useLives`, ADR-0381): lo stesso controllo di
   `AppState` degli altri bollini. Niente richiesta con l'app dietro o
   sotto il centro di controllo, una al ritorno, poi di nuovo ogni 60 s.

**Misurato** (database di prova sul Mac, 30 notifiche non lette di 30
account con foto finte da circa 5 KB): un controllo della campanella passa
da 159 906 byte (97 726 con gzip) e 3 query a 13 byte e 1 query. **Non
misurato**: i tempi sul server vero, il piano della query su una tabella
grande, i byte e la batteria sul telefono, le foto vere degli utenti.

**Conseguenze**: nessuna migrazione, nessuna variabile, nessuna dipendenza
nuova, impronta iOS invariata. Anche il conto dentro `GET /notifications`
usa la query leggera. Restano fuori, come idee nel task file: una chiamata
sola per i tre bollini, e le foto come indirizzo (`avatar_url`) nelle
liste.

## ADR-0175, aggiunta (TASK-497) — La foto di chi scrive un commento viaggia come indirizzo, non si chiede più al profilo

**Stato**: Attiva · 2026-11-24 · TASK-497 (punto O7 della lettura del
codice del 2026-11-23; l'utente: «Sì, tutte»). Niente che l'utente veda:
tutto **deciso dall'agente su delega dell'utente**. Forma (un'aggiunta, non
un ADR nuovo) dal Coordinatore il 2026-11-24. **Punto 9 di ADR-0175: supera
il punto 7** («l'app la chiede a `GET /users/{public_id}`»), che resta solo
come ripiego verso un'API di prima.

**Contesto**: il punto 7 è del 2026-10-03, quando l'unico modo di avere la
foto di un iscritto era il profilo. Da TASK-355 parte B la foto piccola ha
un indirizzo suo (`/users/{public_id}/photo?v=…`, `avatars.py`) e il feed
lo usa. Intanto il profilo è cresciuto: `GET /users/{public_id}` è una
query con dodici sotto-query più quella dei premi, e porta la foto da
256 px in base64. Il foglio dei commenti ne chiedeva uno per autore, a ogni
apertura dell'app, per tenerne solo la foto.

**Decisione**:

9. **La foto di chi scrive viaggia nel commento come indirizzo.**
   1. `author.photo` in commenti e risposte: lo stesso nome e lo stesso
      indirizzo dell'autore di un post del feed (`FeedAuthorBody.photo`);
      `null` senza foto. Nelle tre liste (`GET /drawings/{id}/comments` con
      e senza `threads`, `GET /comments/{id}/replies`), nella risposta del
      `POST` e nel commento tenuto con un super like. `mention` resta nome
      e id: è solo «@nome».
   2. **Nessuna query in più**: una `LEFT JOIN profile_photos` (una riga al
      più, per chiave) nella query che c'era, e una sotto-query nel
      `RETURNING` dei due `INSERT`. Si legge solo `updated_at`, mai il
      JPEG.
   3. **Un'aggiunta**: un'app di prima non legge il campo e fa come prima.
      Un'app nuova con un'API di prima (campo assente) chiede il profilo,
      come dice il punto 7: `photoOf` resta per questo.
   4. **Nell'app** un indirizzo è un `Image` con token e chiave, tenuto
      dalla cache HTTP del telefono (`Cache-Control: private,
      max-age=86400`; una foto nuova ha un indirizzo nuovo); `null` è
      l'iniziale, senza richieste. L'immagine sta **sopra l'iniziale**
      (`CommentAvatar`): mentre carica, e se non arriva, si vede
      l'iniziale, come mentre si aspettava il profilo.
   5. **Chi non si deve vedere non cambia**: il commento di un iscritto
      bloccato o nascosto non si legge già (`read_sql`), e l'indirizzo
      risponde 404 attraverso un blocco con la stessa regola (`apart_sql`).

**Alternative scartate**: la foto in base64 dentro il commento (venti foto
per pagina: è il motivo del punto 7, e non resterebbe in cache); un
endpoint che dà le foto di più profili insieme (una rotta nuova per quello
che la cache HTTP fa già); alleggerire `GET /users/{public_id}` con un
parametro (resta una richiesta per autore a ogni apertura dell'app, senza
cache); il tipo `FeedAuthorBody` importato da `feed.py` in `comments.py`
(`feed.py` importa già `comments.py`: un giro di import); togliere
`photoOf` (un'app nuova può parlare con un'API di prima).

**Conseguenze**: **misurato in locale**, contando le istruzioni SQL per
richiesta HTTP (autenticazione compresa) su un post con 10 autori: la
pagina dei commenti ne usa 6 prima e 6 dopo, e il numero non cresce con gli
autori (test); le foto costavano 10 `GET /users/{id}` da 3 istruzioni l'una,
una con 64 `SELECT` nel testo, e ora 10 `GET /users/{id}/photo` da 2
istruzioni l'una, che il telefono tiene per un giorno. **Non misurato**: i
tempi sul server e sul telefono, i byte risparmiati, quanto la cache HTTP
di iOS e Android tenga davvero l'immagine. Nessuna migrazione, nessuna
dipendenza, niente di nativo. `reactions.py` costruiva l'autore del
commento del super like a mano: ora usa `comment_author` di `comments.py`.
Le altre liste con la foto in base64 (persone, campanella, messaggi)
restano come sono.

## ADR-0409 — «Sign up» e «Log in» gialli

**Stato**: Attiva · 2026-11-24 · TASK-508. Il colore è **scelta
dell'utente** («Giallo», confermata sulle schermate prima/dopo: «Sì, vanno
bene»); il modo è deciso dall'agente su delega dell'utente. Numero dal
Coordinatore.

**Contesto**: nella prova nel simulatore del 23 novembre 2026 (U14) il
pulsante in fondo al modulo di accesso era `surfaceRaised` col bordo, come
un pulsante secondario: sulla pagina è l'unico comando, e non si
distingueva dalla riga «Guide» sotto. `docs/UI.md` («Il tema», regola 1)
tiene il giallo per il percorso, con un'eccezione già scelta dall'utente
(«Run without a route», ADR-0183) e le proprie bolle nei messaggi
(ADR-0403). All'utente sono state proposte tre strade: chiaro pieno (la
proposta dell'agente, per non toccare la regola), giallo, com'era. Ha
scelto il giallo.

**Decisione**:
- Il pulsante `account-submit` di `SignInScreen.tsx`, «Sign up» e «Log
  in», ha il fondo `color.accent` e le parole `color.onAccent` in
  grassetto, senza bordo: gli stessi due colori di «Draw route», in ogni
  tono. Nessun token nuovo e nessun valore cambiato.
- Mentre la richiesta è in viaggio resta dello stesso giallo, al 60%, e
  non si tocca.
- La forma non cambia (a pillola, alto `MIN_TAP_SIZE`): è il pulsante di
  prima con un altro colore, non un secondo «Draw route».
- L'interruttore «Sign up | Log in» sopra il modulo, «Forgot password?» e
  «Guide» restano neutri.

**Conseguenze**: il giallo ha un terzo posto fuori dal percorso, dopo
«Run without a route» e le proprie bolle: «entra nell'app». La regola 1
di `UI.md` lo nomina; per tutto il resto vale com'era, e un altro pulsante
giallo resta una scelta dell'utente, non dell'agente. Il commento di
`accent` in `tokens.ts` nomina ancora due eccezioni: va allineato alla
prima modifica di quel file. Solo app, niente di nativo. Controllato da
`SignInYellow.test.tsx` (fondo, parole, lo stato in attesa).

## ADR-0411 — Le forme nuove del motore: inverno, feste, sport e i 35 contorni di TASK-418, giudicate sulla carta, poi sulle strade, poi registrate tutte insieme

**Stato**: Accettata · 2026-11-27 · TASK-516 (#1579, #1580, #1622, #1661;
proposta il 2026-11-24, parte 0; la parte A sono i contorni). Il pezzo da cui partire è una scelta **dell'utente**
(2026-11-24, «Forme invernali e contorni»); il come è deciso dall'agente
su delega dell'utente, sulla strada di ADR-0346 e della sua precisazione B.

**Contesto**: TASK-441 ha portato il catalogo di «Explore» a 2031 disegni
senza toccare il motore. La sua parte C chiedeva forme nuove: a tema
(inverno, feste, sport) e i 35 contorni candidati di TASK-418 mai
registrati. Il motore ha 43 forme; registrare una forma cambia il motore,
il contratto, l'API, l'AI, l'app e `engine.zip`, e l'impronta del motore.

**Decisione**:

1. **Undici forme nuove** come candidate: `snowman`, `snowflake`,
   `reindeer`, `santa_hat`, `candy_cane`, `bell`, `stocking`, `comet`,
   `ball`, `racket`, `skis`. Si disegnano come in ADR-0346 (primitive,
   buchi e dettagli come pezzi, partenza in alto) con uno **strumento
   nuovo**, `tools/draw_theme_shapes.py`, che riusa le primitive di
   `draw_new_shapes.py` con un registro suo: i file e il test di TASK-418
   restano come sono. I file vanno in `candidate_outlines/`, fuori dal
   pacchetto (ADR-0346, punto 2).
2. **Tre giudizi dell'utente, in ordine**: la sagoma sulla carta (parte A,
   una per una), i disegni sulle strade (parte B, come TASK-419, per le
   nuove e per le 35), quali forme entrano e in che categoria della
   ricerca (parte C).
3. **Una sola registrazione** per tutte le forme scelte (parte C), con la
   lista dei file di TASK-418 B: una sola impronta nuova del motore, una
   sola prova «stessi percorsi», un solo `engine.zip`, un solo passo sul
   server con un OTA. `prefetch_zones.ZONE_SHAPES` resta sulle 17 forme di
   prima (ADR-0346 B).
4. **Il catalogo dopo il motore** (parte D): i disegni nuovi in fondo ai
   file di città, così gli id di prima non cambiano.
5. **La penna alzata** per le forme nuove con pezzi l'API la accetta (viene
   dal motore, `PEN_UP_SHAPES`), l'app la offre solo dopo un giudizio
   dell'utente (come ADR-0346 B, punto 3).

**Scartate**: registrare ogni forma appena approvata (un'impronta e un
OTA per volta: più passi sul server e più prove per lo stesso lavoro);
aggiungere le forme nuove a `draw_new_shapes.py` (cambia un file e un test
che contano 49 forme scelte dall'utente in TASK-418); frasi con lo spazio e
cifre insieme alle forme (toccano la scrittura delle lettere, un'altra
parte del motore: dopo, per scelta dell'utente).

**Conseguenze**: fino alla parte C nulla cambia per l'app, il server o il
catalogo. La parte C ha bisogno della prova `test_same_routes` con la
fixture della nuova impronta e delle righe di `SAME_ROUTES_AS`, del
controllo dell'impronta nativa iOS, e la PR la unisce l'utente; server e
OTA escono insieme, ciascuno col suo sì.

## ADR-0410 — Le email in produzione: con Resend partono quelle dell'account, le segnalazioni e il feedback; i due giri verso gli iscritti solo se nominati

**Stato**: Attiva · 2026-11-24, in produzione dal 2026-11-26 · TASK-515
(parte 0; il codice è la parte A, #1566; sul server col passo 24, i due
giri spenti; recupero provato dall'utente sul telefono). Quali email accendere è una scelta **dell'utente** (2026-11-24,
risposte in `tasks/TASK-515.md`); il come è deciso dall'agente su delega
dell'utente. Precisa ADR-0244, ADR-0226 (parte B) e ADR-0261 in «si
accende con le stesse tre variabili»; il resto di quegli ADR vale.

**Contesto**: l'utente ha chiesto di poter recuperare la password persa.
La funzione c'è da TASK-300, ma il server di produzione non ha mai avuto
la chiave di Resend: il passo «server dopo Apple» di ottobre non è mai
stato fatto, e il dominio `getmuw.app` non è verificato su Resend. Messe
le tre variabili (`RESEND_API_KEY`, `SHAPEROUTE_EMAIL_SECRET`,
`SHAPEROUTE_DOMAIN`), oggi partono insieme le email dell'account, il giro
di «Email when I'm away» (a ogni iscritto assente da 14 giorni, acceso di
default) e il giro del riassunto delle notifiche: non c'è modo di
accendere le une senza gli altri.

**Decisione**:
1. **Adesso si accendono** (scelta dell'utente) le email dell'account
   (conferma dell'indirizzo, avviso al vecchio, link per la nuova
   password), le segnalazioni e il feedback, che arrivano solo a chi
   gestisce MuW. «Quando sono via» e il riassunto restano spenti: ciascuno
   si accende dopo, con un sì suo.
2. **I due giri hanno una variabile loro**, `SHAPEROUTE_EMAIL_ROUNDS`:
   i nomi dei giri accesi, separati da virgole, fra `away` e `notices`.
   **Vuota, nessuno dei due parte**, anche con le tre variabili di Resend:
   una email a tutti gli iscritti deve essere un gesto voluto sul server,
   non l'effetto di una riga dimenticata. Un nome che non esiste ferma
   l'avvio con un errore che lo dice.
3. **Le email dell'account seguono le tre variabili, come prima**: non
   hanno un interruttore, perché servono all'account e la privacy lo dice
   («che nessun interruttore spegne»). Segnalazioni e feedback restano
   legati al loro indirizzo (`SHAPEROUTE_REPORTS_TO`,
   `SHAPEROUTE_FEEDBACK_TO`).
4. **Un giro spento non lascia niente a metà**: il suo filo non parte e la
   pagina del suo link non c'è, come oggi senza chiave. Il conto di chi la
   riceverebbe (`python -m shaperoute_api.away_email`, senza `--send`)
   funziona lo stesso: serve a decidere prima di accendere.
5. **Gli account di prima restano non confermati** (scelta dell'utente,
   la stessa del 2026-10-25 per i tre di allora, ora per tutti): nessuna
   email parte da sola verso di loro; confermano da «Settings» o aprendo
   un link di recupero.
6. **Testi e privacy non cambiano** (scelte dell'utente): i testi di
   TASK-300 nelle cinque lingue riletti e confermati; la privacy del 23
   novembre 2026 nomina già Resend e queste email, nell'app e sul sito.
7. **Resend col piano gratuito** (3.000 email al mese, 100 al giorno,
   letto il 2026-11-24): basta per le email del punto 1. Il dominio
   verificato è `getmuw.app` intero, perché il mittente è
   `hello@getmuw.app`. Account, record DNS e chiave li fa l'utente; la
   chiave la scrive lui sul server in un passo del Coordinatore.

**Scartate**: accendere tutto insieme (proposto all'utente, non scelto:
il primo giro di «quando sono via» scriverebbe a tutti gli assenti in un
colpo, e col piano gratuito finirebbe la quota del giorno lasciando fuori
i recuperi); una variabile che **spegne** i giri (`…_OFF=away,notices`):
dimenticarla li accenderebbe; accendere solo il recupero senza la
conferma dell'indirizzo (proposto, non scelto: sono lo stesso modulo e
lascerebbe gli indirizzi mai verificati); mandare la conferma a tutti gli
account esistenti (proposto, non scelto).

**Conseguenze**: chi oggi su un server di prova ha le tre variabili e
vuole i due giri deve aggiungere `SHAPEROUTE_EMAIL_ROUNDS=away,notices`;
la produzione non li ha mai avuti, quindi lì niente cambia finché
qualcuno non la scrive. `DEPLOY.md` («Email di ritorno», punti 3 e 5) va
aggiornato con la parte A. L'app non cambia e non serve un OTA:
«Forgot password?» compare quando `GET /account-email` risponde 200. Oltre
100 email in un giorno Resend rifiuta le successive: da riguardare quando
le iscrizioni crescono o quando si accende un giro. Le risposte scritte a
`hello@getmuw.app` oggi tornano indietro (il dominio non riceve posta): è
una scelta aperta, in `tasks/TASK-515.md`.

## ADR-0407 — «Longevity»: cinquanta storie animate dentro l'app, da fonti pubbliche ufficiali citate, senza revisione di un professionista

**Stato**: Attiva · 2026-11-24 · TASK-513 (parte 0; nessun codice).
Le scelte sono **dell'utente** (2026-11-24, in `tasks/TASK-513.md`); le
regole sulle fonti sono decise dall'agente su delega dell'utente. Cambia
il paletto di ADR-0397 «MuW non dà consigli alimentari» nel solo senso
scritto qui; MuW continua a non dare diete.

**Contesto**: l'utente ha chiesto in «Explore» tips e video sulla
longevità, cinquanta fatti da MuW, e più avanti quelli delle persone.
ADR-0397 diceva che MuW non dà diete né consigli alimentari, e privacy e
schede di «Nutrition» lo ripetono. Chiesto quanto cambiare la regola,
l'utente ha scelto prima i consigli generali rivisti da un professionista
con nome, poi: «No, non ho un medico dietista che può rivedere i consigli.
Cerchiamo tutto da Internet, ma chiariamo che non siamo dei
professionisti». Ha poi scelto che i cinquanta siano tutti animati, fatti
dentro l'app, e che stiano nella «Explore» della modalità «Nutrition»
(ADR-0408).

**Decisione**:
1. **Storie, non file video** (scelta dell'utente): ogni storia è un
   copione di 4–6 scene (una frase e una figura che si muove), 30–40
   secondi, suonato da un lettore nell'app. Sta nel repository, nelle
   cinque lingue; nessun file video e nessuno spazio sul server.
2. **Una fonte pubblica ufficiale per ogni storia** (deciso dall'agente):
   OMS, enti sanitari nazionali, società scientifiche. La fonte si legge
   al momento della stesura e si cita nella storia con nome, titolo, data
   e collegamento. Mai a memoria, mai un blog o uno studio singolo. La
   storia dice solo quello che la fonte dice. **Senza una fonte così
   l'argomento non si scrive.**
3. **Nessuna revisione di un professionista** (scelta dell'utente): al suo
   posto ogni storia e la sezione dicono che MuW non è fatta da
   professionisti della salute e che sono informazioni generali, non
   consigli medici.
4. **Mai** integratori, farmaci, dosi, diete, cure, promesse, né cosa deve
   fare chi guarda.
5. **Dalla storia ai numeri dell'utente**: un collegamento alla parte
   dell'app che ne parla. Mostra i numeri, non li giudica.
6. **Nessuna spinta**: niente serie da mantenere, punti, notifiche che
   insistono.
7. **I video delle persone** dopo, con moderazione (come ADR-0228), spazio
   sul server, privacy e termini decisi. **I compensi a chi pubblica**
   («il 30% delle commissioni generate dalle pubblicità», parole
   dell'utente) sono un task nuovo, legato a TASK-153 e dopo di lui: la
   pubblicità è spenta fino alla società (scelta del 2026-10-09). Niente
   si promette nell'app o sul sito finché non c'è.

**Conseguenze**: prima che una storia esca serve una PR di privacy e
termini (oggi dicono che MuW non dà consigli), col sì dell'utente e la
copia del sito; le note per gli store devono dire che sono informazioni
generali con la loro fonte. Il rischio di un'informazione sbagliata su un
tema di salute resta di MuW: per questo la regola 2 non ha eccezioni. Il
nome, il volto o il marchio di una persona reale non si usano senza il suo
accordo.

**Alternative scartate**: una sezione di soli testi in attesa dei video
(l'utente vuole le storie); file video ospitati (spazio, lingue, ogni
correzione un file rifatto); consigli personali o numeri per la persona
(sono una dieta: restano fuori).

## ADR-0408 — La modalità «Nutrition»: scelta come uno sport, la barra dell'app diventa la sua

**Stato**: Attiva · 2026-11-24 · TASK-514 (parte 0; nessun codice; parte
dopo TASK-490 D ed E). Le scelte sono **dell'utente** (2026-11-24, in
`tasks/TASK-514.md`). Cambia ADR-0397 dove dice che «Nutrition» non si
sceglie come uno sport.

**Contesto**: l'utente vuole per la nutrizione «un'altra schermata tipo lo
sci». La modalità sci (ADR-0357) cambia la barra dell'app quando lo sport
scelto è lo sci. Proposte due strade: le pagine di «Nutrition» sopra
l'app, con lo sport scelto che resta, o una modalità vera. Detto che la
seconda va dopo il lavoro in corso sulla barra dell'allenamento (TASK-490)
e che per registrare una corsa si torna a scegliere lo sport, l'utente ha
scelto: «Una modalità vera».

**Decisione**:
1. «Nutrition» si **sceglie** nel pannello degli sport; scelta, la barra è
   **Today · Plan · Explore · Feed · Profile** (approvata dall'utente).
2. «Today» è il diario del giorno, «Plan» il piano della settimana,
   «Explore» la pagina delle storie (ADR-0407). «Balance» non ha una
   pagina: resta la scheda «Calorie balance» nel profilo, in cima in
   questa modalità. «Messages» dal tasto nell'intestazione, come nello
   sci.
3. La scheda **«Food» della modalità allenamento resta** e apre il diario
   (confermato dall'utente).
4. Finché la modalità non c'è, «Nutrition» si apre come dice ADR-0397
   (pannello, profilo, fine di un'attività).

**Conseguenze**: tocca le schede e il pannello degli sport, che oggi sono
di altri task: la lista dei file passa dal Coordinatore, dopo quella di
TASK-490 D/E. «Nutrition» non è uno sport del registro e non si registra:
come entra nel meccanismo della modalità si decide nella parte A.

**Alternative scartate**: le pagine sopra l'app (era la proposta
dell'agente: lo sport scelto restava, e non toccava le schede); togliere
la scheda «Food» dall'allenamento.

## ADR-0397, precisazione 5 — «Nutrition» dal profilo e a fine attività, la pagina animata, l'obiettivo proposto come stima, il peso

**Stato**: Attiva · 2026-11-24 · TASK-489 (parti D2, H, I scritte; J e K
decise, non scritte). Le scelte di prodotto sono **dell'utente**
(2026-11-24, in `tasks/TASK-489.md`); il come è deciso dall'agente su
delega dell'utente. Cambia due paletti di ADR-0397, nei punti 4 e 5.

**Decisione**:
1. **Dal profilo** (D2): chi non ha letto l'avviso vede una riga
   «Nutrition» che apre la pagina; chi la usa ha «Open Nutrition» in fondo
   a «Calorie balance». La finestra della pagina è un file solo, usato dal
   pannello degli sport e dal profilo.
2. **La pagina del giorno animata** (H), senza dipendenze nuove: due
   anelli su **una scala sola** (il più grande tra mangiato, consumato e
   l'obiettivo dell'utente fa il giro intero), nei colori del testo e non
   in verde e rosso; i numeri contano fino al valore; i cibi entrano in
   cascata. Proteine, carboidrati e grassi: grammi e parte dell'energia
   con 4, 4 e 9 kcal al grammo, **senza obiettivo**; un cibo senza i tre
   numeri resta fuori intero e la scheda lo dice. La settimana sotto il
   diario. Il giorno e la settimana leggono le stesse attività: **uno
   solo chiede le pagine mancanti**. Con «Riduci movimento» niente si
   muove.
3. **A fine attività** (I): un invito per chi non l'ha mai aperta, al
   massimo tre volte e mai più dopo «Not now»; per chi la usa «Add what
   you ate». L'invito non promette una dieta. La riga «Counted in today's
   balance» non c'è: quelle schermate vengono prima di «Save».
4. **L'obiettivo di calorie può proporlo MuW** (J; scelta dell'utente:
   «MuW», poi «la nostra è solamente una stima, solo una demo» e «è meglio
   inserire le calorie manualmente»). Cambia «MuW non inventa nessun
   numero». Come: prima il numero scritto dall'utente; la stima di MuW
   sotto, chiusa finché non si apre, segnata come dimostrativa; una
   formula pubblica e fissa, mai l'AI; quantità e soglie da una fonte
   pubblica ufficiale citata in «How we calculate», e dove la fonte manca
   **nessuna proposta**. Protezioni: un minimo sotto cui MuW non propone;
   niente sotto i 18 anni; niente «perdere peso» a chi risulta sottopeso;
   un avviso per gravidanza, malattie e disturbi alimentari; nessuna
   notifica sul deficit. MuW continua a non dire cosa mangiare.
5. **I consigli generali** entrano con le regole di ADR-0407.
6. **Il peso** (K): una scheda chiede di pesarsi ogni 1, 2 o 4 settimane
   (sceglie l'utente; si spegne); le pesate restano sul telefono; grafico
   in chili, variazione e percentuale del peso di partenza; statistiche;
   il bilancio dello stesso periodo accanto, senza giudizio. È un
   controllo a regole, non AI. Le congratulazioni sono per la tappa
   scritta dall'utente e per la costanza, mai per la velocità; nessuna
   sotto la soglia di peso basso né sotto i 18 anni. **Pubblicare** una
   pesata: solo col tasto, di partenza la vede solo l'utente e mostra la
   variazione, non i chili; è un dato di salute che lascia il telefono per
   scelta sua, e la privacy lo dice prima che esca.
7. **Salute e l'energia attiva** (C2): la frase del permesso scelta
   dall'utente per la build nativa parla di battito, sonno e allenamenti,
   non dell'energia attiva, e C2 non la riscrive. La lettura dell'energia
   attiva chiede una build successiva; se alla prima si accendono solo gli
   allenamenti lo decide l'utente al taglio.
8. **La modalità** (ADR-0408) cambia «Nutrition non è uno sport».

**Conseguenze**: prima che J e i consigli escano serve una PR di privacy e
termini col sì dell'utente; le note per gli store dicono che l'obiettivo è
una stima con la sua fonte, non un consiglio medico.

## ADR-0264, aggiunta (TASK-496) — Con l'app dietro i punti nuovi vanno in un diario accanto al file della corsa; quello che nessuno vede non lavora

**Stato**: Attiva · 2026-11-23 · TASK-496 (punti O1 e O2 della lettura del
codice del 2026-11-23). **Scelta dell'utente** del 2026-11-23, alla
domanda «a telefono bloccato oggi ogni punto GPS riscrive tutto il file
della corsa. Propongo di scrivere solo i punti nuovi in un piccolo diario
accanto al file, e il file intero uscendo dall'app, in pausa, alla fine e
ogni 300 punti circa. La tua scelta della TASK-304 resta uguale: nessun
punto perso se iOS chiude MuW. Cambia solo come viene mantenuta. Va
bene?»: **«Sì, così»**. Il resto (il formato del diario, ogni quanto il
file intero, la mappa e l'orologio) è **deciso dall'agente su delega
dell'utente**. Numero e forma (un'aggiunta, non un ADR nuovo) dal
Coordinatore. **Precisa il punto 4 di ADR-0264**; la promessa non cambia.

**Contesto**: il punto 4 di ADR-0264 dice che con l'app dietro «ogni
posizione tenuta riscrive» il file. `saveRun` fa `JSON.stringify` di tutta
la corsa e una scrittura sincrona: a telefono bloccato il lavoro cresce col
quadrato della lunghezza della corsa (un punto ogni 5 m). In modalità tasca
la mappa sotto lo schermo nero riceveva a ogni punto tutta la traccia e
un'animazione di 500 ms, e l'orologio del pannello scattava ogni secondo
anche in tasca e con l'app dietro.

**Decisione**:

1. **Un diario accanto al file** (`current-run.journal`, `runJournal.ts`):
   con l'app «background» o «inactive» ogni scrittura è una riga JSON in
   coda al diario, con i soli punti nuovi, i metri, le pause solo se sono
   cambiate, quanti punti c'erano prima e la chiave del file intero a cui
   segue. La corsa sul telefono è il file con il diario dopo.
2. **Il file intero** si scrive: uscendo dal primo piano, a una pausa, alla
   penna alzata, all'arrivo, a «Stop», e ogni 300 righe di diario
   (`FULL_EVERY_LINES`). In primo piano resta ogni 15 s. Dopo ogni file
   intero il diario si svuota.
3. **`loadRun` legge file + diario**, solo per una corsa `running`. Una
   riga che non si legge (può essere solo l'ultima, tagliata da una
   chiusura a metà scrittura) o che non parte da dove la traccia finisce
   ferma la lettura lì; una riga di un altro file intero si salta. La
   chiave dice la corsa (l'ora del primo punto), quanti punti ha, l'ultimo
   e le pause: i punti si aggiungono soltanto, quindi due file con la
   stessa chiave tengono la stessa traccia. Il file non ha campi nuovi:
   una corsa di prima del diario si legge come sempre.
4. **Se il telefono rifiuta**: la riga, si scrive il file intero; di
   svuotare il diario, si scrive il file intero a ogni punto finché non lo
   svuota; tutto, la corsa resta in memoria per «Stop» (TASK-252).
5. **La pausa di un'assenza oltre 10 minuti si scrive subito**, anche
   quando il punto che la porta non è tenuto: prima restava in memoria
   fino al punto dopo (trovato dai test di questa task).
6. **In modalità tasca la pagina della mappa non riceve niente della
   corsa**: traccia, posizione, bussola, progresso, rientro e mappa
   girata. Entrando le si dice una volta di smettere di lampeggiare
   (TASK-224); uscendo, una volta, com'è adesso. Con l'app in
   «background» la pagina non c'è già (punto 5 di ADR-0264).
7. **In vista vanno alla pagina solo i punti nuovi** (`extendTrack`): la
   pagina tiene la linea. La linea intera torna dopo una pagina
   ricaricata, una traccia tolta, un'altra linea e quando la traccia è
   inquadrata. Sci e volo restano a traccia intera.
8. **La mappa segue chi corre in 250 ms** (`FOLLOW_MS`); il primo
   movimento, quello che porta la mappa su chi corre, resta di 500 ms.
9. **L'orologio dei numeri non scatta quando nessuno lo vede**
   (`useRunSeen`: app «background» o «inactive», o tasca). I numeri sono
   allora quelli dell'ultimo punto, così il link dal vivo li riceve
   giusti; al ritorno l'orologio si legge subito. `useNow` non cambia.

**Alternative scartate**: il file intero ogni 15 s anche dietro (resta un
lavoro che cresce con la corsa, e fino a 15 s di punti persi: contro la
scelta dell'utente); un contatore nel file per legare il diario (il file
avrebbe un campo nuovo e decine di test lo confrontano per intero); una
scrittura atomica del file intero con file temporaneo e spostamento (il
comportamento di `File.move` su un file che esiste non è verificato: resta
com'era, e col diario il file intero si scrive molte meno volte); niente
animazione nel seguire (a scatti); toccare `useNow` (lo usano il conto
alla rovescia, lo sci e il volo).

**Conseguenze**: a telefono bloccato una posizione scrive circa 180 byte
invece dell'intera corsa. **Misurato, non sul telefono**: in Node con un
disco in memoria, 12 km dietro scrivevano 209,5 MB di testo e ora 1,0 MB
(48 km: 3349 MB e 12,6 MB); nel simulatore, sul disco del Mac, il file
intero di 4000 punti costa 11 ms a scrittura e una riga 0,4 ms, e dopo
un'uscita forzata con l'app dietro la corsa è tornata con tutti i 176
punti (155 nel file, 21 nel diario). **Non misurato**: la batteria e i
tempi sul telefono. Nella pagina MapLibre ridisegna ancora tutta la linea
a ogni punto: non cresce più il messaggio che le arriva. Nessun cambio
nativo, nessuna dipendenza: l'impronta iOS resta `5e1b5ce5`. Resta fuori
lo stato della corsa in `App.tsx` (TASK-504).

## ADR-0393, precisazione E–G — L'attrezzatura nel post, nei capi taggati e nella campanella

**Stato**: Attiva · 2026-11-23 · TASK-486 parti E, F, G. Le scelte 5 e 6
sono **dell'utente** (2026-11-21), come i testi e le schermate (approvati
il 2026-11-23); il come è **deciso dall'agente su delega dell'utente**.

**Contesto**: ADR-0393 dice cosa si vede (una riga nel dettaglio del post,
i capi taggati da «From my gear», l'avviso del limite senza push), non
dove passano i dati.

**Decisione**:
- **Rotte a parte, non campi nuovi**: `GET /drawings/{id}/gear` (parte E)
  e `GET /gear/{id}` (parte F) invece di `gear` dentro `DrawingDetail` o
  nel tag. `schemas.py` ed `engine.zip` restano fuori, e le app di prima
  non vedono niente di diverso. Si vede quello che si vede del post e del
  profilo: «Hide from profile» mai, nemmeno al proprietario; nascosto dopo
  una segnalazione, solo al proprietario; un blocco tiene lontano.
- **Il tag tiene `gear_id`** (migrazione 0085), con `ON DELETE SET NULL`:
  cancellare l'attrezzo lascia il capo taggato com'era. Mandato senza
  `gear_id`, un tag che c'era tiene quello che aveva (le app di prima);
  `null` lo toglie. `gear_id` arriva solo a chi vede l'attrezzo.
- **«From my gear» coi tipi della foto**: le scarpe di ogni tipo (anche
  scarponi e scarpette) diventano «Shoes», zaino e orologio restano loro,
  il resto «Other»: la foto ha meno tipi dell'attrezzatura e «Other» non
  dice mai una cosa sbagliata.
- **Il limite è una riga sola nella campanella** (`gear_limit`, in
  `BELL_ONLY`, niente push) quando un'attività porta l'attrezzo da sotto il
  limite a sopra; la chiave è attrezzo e limite, quindi un limite nuovo è
  una riga nuova. Toccata, apre l'editor dell'attrezzo (ritirarlo o
  cambiare il limite); un attrezzo cancellato si porta via la sua riga.

**Alternative scartate**: `gear` in `DrawingDetail` (toccava `schemas.py`
e quindi `engine.zip`); copiare marca e modello nel tag senza legarlo
(il pallino non avrebbe aperto l'attrezzo); una riga per ogni attività
oltre il limite (troppe).

**Conseguenze**: per chi costruisce sopra l'attrezzatura (TASK-494,
ADR-0401): un tipo nuovo va in `GearKind` del server, in `GEAR_KINDS`
dei tipi condivisi e in `GEAR_LOOKS` dell'app (il compilatore lo chiede);
le sue righe nella campanella sono un `kind` nuovo, non `gear_limit`, con
la sua condizione in `shown_sql`; per aprire l'attrezzo dalla campanella
c'è già `openGearItem` (`gear/gearDoor.ts`).

## ADR-0405 — L'animazione iniziale intera solo la prima volta e dopo una versione nuova, corta e saltabile le altre; animali e musiche del video restano dentro l'app

**Stato**: Attiva · 2026-11-23 · TASK-505 (parte A in `main`, #1527).
Le due scelte sono **dell'utente** (2026-11-23, risposte in
`tasks/TASK-505.md`); il come è deciso dall'agente su delega dell'utente.
Aggiorna ADR-0147 nei tempi e in «non si salta con un tocco»; il resto di
ADR-0147 vale.

**Contesto**: la lettura del codice del 2026-11-23 ha trovato due cose che
non sono errori ma scelte (O6 e O15). A ogni apertura a freddo
l'animazione del cuore tiene lo schermo 2,7 s senza poterla saltare
(ADR-0147, scelta dell'utente del 2026-10-02: «almeno due secondi»). E gli
animali e le musiche del video (13 modelli e 10 brani, 5,6 MB) stanno in
ogni installazione anche se servono solo a chi fa un video.

**Decisione**:
1. **Due animazioni** (scelta dell'utente). L'intera, quella di ADR-0147
   (0,35 + 1,6 + 0,45 + 0,3 = 2,7 s), alla prima apertura e alla prima
   dopo una versione nuova dello store. Le altre volte la corta: la penna
   parte subito, il cuore si disegna in 0,6 s, resta 0,15 s, sfuma in
   0,25 s: 1,0 s in tutto. È lo stesso cuore, più veloce: non un altro
   disegno.
2. **Un tocco la chiude** (scelta dell'utente), intera o corta: da
   dovunque sia arrivata sfuma in 0,25 s. Nessun pulsante e nessun testo:
   tutto lo schermo è il tasto.
3. **«Versione nuova» è la `version` di `app.json`** (oggi 1.1.0), letta
   con `expo-constants`: cambia con le uscite sugli store, non con gli
   OTA, che sono decine al mese e ridarebbero l'intera ogni due giorni.
4. **Il telefono lo ricorda in un file**, `intro-seen.json` nei documenti
   dell'app con la versione dell'ultima animazione intera vista, letto
   subito all'avvio come `tour/tourSeen.ts`: niente attesa prima del primo
   fotogramma. Si scrive quando l'animazione finisce o viene chiusa. Chi
   ha già l'app non ha il file: vede l'intera una volta dopo l'OTA, poi la
   corta. File mancante o illeggibile: l'intera.
5. **Animali e musiche restano dentro l'app** (scelta dell'utente): O15
   si chiude senza lavoro.

**Scartate**: lasciare l'animazione com'è, o intera sempre ma saltabile
(proposte all'utente, non scelte); contare gli OTA come versione nuova
(punto 3); togliere del tutto l'animazione dopo la prima volta (il giallo
copre il momento in cui l'app sotto si carica, e nessuno l'ha chiesto).
Per O15: scaricare animali e musiche al primo uso, tutti o tranne i primi.
Si poteva: sono dati e non codice, quindi non è il caso scartato da
ADR-0177 (Pyodide e il motore, regole 2.5.2 e 4.7 di Apple), e senza rete
il video esce già senza animale (ADR-0339, precisazione B, punto 2). Non
conviene: 5,6 MB su 28 di file dell'app, di cui 21 del motore, e accanto a
zone da 7 MB l'una; in cambio servono un posto sul server, un'attesa e un
testo nuovo al primo video, un video senza animale e senza musica a chi è
senza rete; e il risparmio arriva solo con una build nuova, perché un OTA
non toglie file da un'app installata.

**Conseguenze**: dalla seconda apertura l'app si tocca 1,7 s prima; con
l'animazione corta si vede prima anche un'app che non ha finito di
caricarsi, da guardare sul simulatore nella parte A e da dire a TASK-500,
che misura l'avvio. Solo JavaScript, nessuna dipendenza nuova, nessun
testo: l'impronta iOS non cambia, esce con un OTA. O15 si riapre se i
file del video crescono molto (ordine di grandezza: oltre 20 MB).

## ADR-0403 — Le proprie bolle nei messaggi sul giallo dell'app

**Stato**: Attiva · 2026-11-23 · TASK-458. Il colore è **scelta
dell'utente** («Bolle gialle come il tema dell'app», confermata sulle
schermate prima/dopo: «Sì, gialle così»); il modo è deciso dall'agente su
delega dell'utente, col parere della sessione di TASK-469. Numero dal
Coordinatore.

**Contesto**: nella prova dell'11 novembre 2026 (S13) le proprie bolle e
quelle dell'altro erano due grigi (`surfaceRaised` e `surface` col bordo,
ADR-0279 e `docs/UI.md`: «il giallo resta del percorso»). All'utente erano
state proposte tre strade senza giallo (blu tenue, chiaro pieno, neutro col
bordo forte); ha scelto il giallo.

**Decisione**:
- Le proprie bolle hanno il fondo `color.accent` e parole e orario
  `color.onAccent`: gli stessi due colori in ogni tono, 13:1
  (`palettes.test.ts`). Nessun token nuovo e nessun valore cambiato; in
  `tokens.ts` cambia solo il commento di `accent`, che ora nomina due
  eccezioni volute dall'utente: «Run without a route» (ADR-0183) e queste
  bolle.
- È una **faccia piena, non vetro**. ADR-0383 («il giallo mai come tinta»)
  parla della tinta del vetro (`glass.*`) e resta com'è: questa voce la
  cita, non ne fa un'eccezione. Tre regole, dalla sessione di TASK-469:
  (1) la bolla resta opaca nei tre modi (vetro, «Riduci trasparenza»,
  «Aumenta contrasto»), niente velature gialle né `glass.*` tinti; (2) un
  eventuale rilievo usa `glassRaise` com'è, senza colori nuovi (oggi non ne
  ha); (3) che il giallo si intraveda sotto l'header di vetro va bene.
- Quello che una propria bolla porta — un disegno, un post, una live, una
  foto — sta su una piastra `surfaceRaised` dentro il giallo: la linea di
  un disegno è gialla anche lei, e le schede scrivono coi colori del tono.
- Le bolle dell'altro restano `surface` col bordo.

**Conseguenze**: il giallo ha un secondo significato dentro i messaggi
(«l'ho scritto io»), accanto a «percorso». Fuori dai messaggi la regola non
cambia: altrove il giallo resta del percorso e di ciò che lo produce. Solo
app, niente di nativo. Controllato da `ChatMinor.test.tsx` (fondo, parole,
faccia opaca senza ombra né bordo, la piastra).

## ADR-0400 — La mappa dei decolli: i siti da OpenStreetMap, la scheda del decollo con lo storico di MuW

**Stato**: Proposta · 2026-11-23 · TASK-493 (parte 0, soli documenti).
La richiesta e la scelta di farne un task a sé sono **dell'utente**
(2026-11-23); le cinque scelte della parte 0 sono **dell'utente** («Sì, tutte»,
2026-11-23: il bottone «Takeoffs» nel parapendio, tutti i voli salvati
contati senza nomi e solo da 3 piloti in su, i record dai soli post
pubblici col nome, solo OSM con «Add it on OpenStreetMap», chi è in volo
adesso col link solo se già pubblico); il resto è **deciso dall'agente su delega dell'utente**, numeri
dal Coordinatore (fork 3).

**Contesto**: chi vola vuole vedere sulla mappa i decolli e quanta gente
vola da ognuno. TASK-479 prevede i decolli e gli atterraggi da OSM per la
mappa 3D (A) e l'atterraggio più vicino (D), ma non li ha ancora
scaricati; lo studio di TASK-305 (fonti, §1) dice che solo OSM ha una
licenza che permette l'uso commerciale.

**Decisione**:
- **Solo OpenStreetMap** (`free_flying:takeoff`, `free_flying:landing`,
  la vecchia `free_flying:site`), con l'attribuzione sempre visibile;
  niente ParaglidingEarth, DHV, XContest finché non c'è una licenza
  scritta.
- **I siti li estrae il server** dagli estratti OSM che già scarica, in
  una tabella nuova; l'app li legge per riquadro. La tabella può servire
  anche a TASK-479 D, da concordare.
- **Lo storico lo conta il server**: un volo è di un decollo se parte
  entro 300 m e 150 m di quota; numeri per mese, piloti diversi, oggi, in
  volo adesso. Contano tutti i voli salvati, anche privati, ma solo
  come numeri senza nomi, e si vedono da 3 piloti diversi in su (scelta
  dell'utente).
- **Nessun giudizio sulle condizioni**: quota, orientamento, dislivello e
  numeri, mai «volabile», «buono», «sicuro».
- **File nuovi fuori da `src/air/`** (di TASK-479); il vento della parte
  D dipende da TASK-479 H.

**Conseguenze**: una migrazione (numero dal Coordinatore con la lista dei
file), un job settimanale sul server, una riga di privacy prima dell'OTA;
server e OTA col sì dell'utente.

## ADR-0401 — Le scadenze della vela: revisione, riserva e imbrago sull'attrezzatura, con l'avviso

**Stato**: Proposta · 2026-11-23 · TASK-494 (parte 0, soli documenti).
La richiesta e la scelta di farne un task a sé sono **dell'utente**
(2026-11-23); le quattro scelte della parte 0 sono **dell'utente** («Sì,
tutte», 2026-11-23: revisione, riserva, imbrago e una scadenza libera con
gli intervalli del pilota; il tipo `reserve`; classe e taglia sul
profilo, scadenze e peso solo al proprietario; la campanella 30 giorni
prima e il giorno stesso, una riga in «Pronto al decollo»); il
resto è **deciso dall'agente su delega dell'utente**, numeri dal
Coordinatore (fork 3).

**Contesto**: l'attrezzatura (TASK-486, ADR-0393) ha già i tipi
`paraglider` e `harness`, conta le ore dai voli agganciati e ha un limite
in metri con l'avviso nella campanella. Un pilota ha anche scadenze sue:
la revisione della vela, la ripiegatura della riserva, il controllo
dell'imbrago.

**Decisione**:
- **Tabelle nuove accanto a `gear`**, non campi nuovi nel suo corpo: le
  app di oggi leggono l'attrezzo come prima. Un file nuovo accanto a
  `gear.py`, che resta di TASK-486.
- **Gli intervalli li sceglie il pilota** (mesi, ore o tutti e due, vale
  la prima scadenza); i valori tipici già scritti con «Check your
  manual». Nessun catalogo dei costruttori.
- **La prossima scadenza la calcola il server** dalle ore dei voli
  agganciati, come i totali dell'attrezzo.
- **L'avviso dice il fatto**, mai «non volare».

**Conseguenze**: una migrazione (numero dal Coordinatore con la lista dei
file); nessun file `gear` toccato prima che il Coordinatore approvi la
lista; una riga di privacy prima dell'OTA; server e OTA col sì
dell'utente.


## ADR-0327, precisazione G — Il battito in palestra: il consenso e i pulsanti del nuoto, le kcal di Keytel col battito, media e massimo sul server, mostrati solo con gli esercizi

**Stato**: Attiva · 2026-11-23 · TASK-385 parte G: G1 (#1440, `d577db69`,
server al passo 20) e G2 (#1459, `020cb5b8`). «Un sì per tutti» è una
**scelta dell'utente** (2026-11-23); il resto è **deciso dall'agente su
delega dell'utente**, con `FeedPost.tsx`, `FactsText.tsx` e
`postSections.ts` approvati in più dal Coordinatore.

**Contesto**: ADR-0327 (punto 7) lasciava il battito della palestra a dopo
TASK-345 C e TASK-374 D. Il nuoto aveva già il suo: il pulsante «Add heart
rate from Apple Health» a fine vasca, il consenso in `pool-heart.json`, le
zone sul telefono (ADR-0318).

**Decisione**:

1. **Un consenso solo**: la palestra usa il pulsante, le righe
   (`PoolHeartLines`, invariato) e il file del nuoto. Chi l'ha dato in
   piscina vede il battito della palestra senza toccare niente.
2. **Il battito letto a fine allenamento**, tra inizio e fine senza le
   pause: media, massimo, minuti per zona. Senza letture la palestra non
   mostra niente: la riga del nuoto «…for this swim» non va bene per un
   allenamento.
3. **Le kcal**: col battito e con sesso, peso e anno di nascita, l'energia
   attiva di Keytel 2005 (`body/heartKcal.ts`, lorda meno riposo come
   ADR-0318); altrimenti il MET di oggi. I post degli altri restano al
   corpo di 70 kg. Le kcal scritte in Salute restano quelle del MET
   (`gymHealth.ts` invariato).
4. **Sul server** (G1) media e massimo vanno con l'allenamento,
   tutti e due o nessuno, la media non sopra il massimo, mai su un
   allenamento scritto a mano; nelle colonne di `runs` della 0061, senza
   migrazione.
5. **Chi lo vede**: «Show heart rate» nel modulo del post (acceso). Agli
   altri il battito arriva solo con gli esercizi mostrati: con gli esercizi
   nascosti `GET /drawings/{id}/exercises` resta 404 anche per lui.
   L'autore lo vede sempre.

**Alternative scartate**: un secondo consenso solo per la palestra (una
domanda in più per la stessa cosa); il battito agli altri anche con gli
esercizi nascosti (direbbe dell'allenamento quello che l'autore ha tenuto
per sé).

**Conseguenze**: niente testi nuovi e niente nativo. Restano la frase di
Salute in «Privacy» allargata alla palestra (G3, al turno della privacy
col sì dell'utente) e l'OTA del Coordinatore.

## ADR-0366, precisazione B3 — Le uscite lunghe in bici (40 e 50 km) solo nel catalogo: il limite dei 30 km tolto solo nello strumento, le uscite lunghe dopo quelle che c'erano nel file di città, limite del pianificatore a 4 GB

**Stato**: Attiva · 2026-11-23 · TASK-441, parte B3 (#1471, `ba12b1fe`).
Le scelte di prodotto sono dell'utente: **«solo in Explore»** (le uscite da
40 e 50 km sono disegni pronti del catalogo; «Draw» in bici resta a
10–30 km) e **«Tutti i 129»** (entrano tutte quelle che passano il filtro).
Le altre sono **decise dall'agente su delega dell'utente**; il limite di
memoria è del Coordinatore.

**Contesto**: la precisazione del 2026-11-18 chiudeva con «i 40–50 km (B3)
vogliono il limite del motore alzato: una PR a parte». Guardando il codice,
quel limite (`activities/cycling.py`, 30 km) è anche il limite di «Draw»
nell'API, la misura delle zone della bici sul server e sul telefono, il
campo della distanza nell'app, e sta nell'impronta del motore e in
`engine.zip`. Alzarlo voleva dire «Draw» in bici fino a 50 km, ogni zona
della bici rifatta circa 2,4 volte più grande, una PR del motore e un'OTA:
una scelta di prodotto, chiesta all'utente e non presa.

**Decisione**:

1. **Il motore non cambia.** `tools/catalog_bike.py --distances 50000
   40000` toglie il limite dei 30 km solo nel proprio processo
   (`ride_limit`, per la durata del giro). Nessun file in `services/`,
   `packages/`, `apps/`; nessuna OTA.
2. **Stesse otto forme, stesso filtro, stesso registro**
   (`out/TASK-441/bike.jsonl`, chiave `città/forma@cycling/distanza`):
   cinque forme a una distanza e tre all'altra, a turno per città. Entra
   ogni uscita che passa `catalog_seed.reasons`; l'utente le ha guardate
   tutte su una pagina prima del merge.
3. **Le uscite da 40 km in su stanno dopo le uscite che c'erano nel file di
   città** (`catalog_seed._place`, `LATER_RIDES_FROM_M`). L'id di un
   percorso è il suo posto nel file (`recommended.py`): ordinate per
   somiglianza in mezzo alle altre, le uscite lunghe avrebbero cambiato
   l'id delle uscite da 20–30 km già pubblicate. Chi aggiunge altri
   percorsi a un file già pubblicato li mette in fondo, per la stessa
   ragione.
4. **Limite del pianificatore a 4096 MB per ogni città**, guardato ogni 2 s
   (deciso dal Coordinatore, non alzato): 26 città a 50 e 40 km, 8 solo a
   40 km, le più grandi come tentativi, fermandosi al primo oltre il
   limite. Zone ritagliate dagli estratti già sul disco, Overpass chiuso.
5. **Nessun controllo nuovo sulla distanza**: l'API e l'app non guardano
   la distanza di un disegno del catalogo. Su un'uscita da 40 o 50 km
   «Draw it near me» apre «Draw» a 30 km (`againDistanceM` riporta la
   distanza dentro i limiti dello sport): accettato così.

**Motivo**: il catalogo è fatto di disegni calcolati una volta sul Mac, e
può permettersi zone e tempi che «Draw» sul telefono e sul server non può.
Tenere fermo il motore lascia intatte le zone, l'impronta e ogni risposta
di oggi; l'ordine nel file è l'unica cosa che poteva rompere qualcosa di
pubblicato, e si è visto solo provando la scrittura a vuoto.

**Conseguenze**: 34 città, 272 casi, 213 disegnati, **129 entrano** (42 da
50 km, 87 da 40) in 32 città; il catalogo va a **2031 percorsi**, 485
uscite in bici in 60 città (Levico è nuova). 31 file di città identici byte
per byte, nei 32 cambiati il testo di prima è l'inizio del nuovo. La
memoria a 50 km è da 1,5 a 2,5 volte quella a 30 km (Bergamo 4075 MB);
Genova e Nizza non hanno uscite che passano; Amsterdam passa i 4 GB anche a
40 km, e Sydney, Valencia, Milano e Barcellona non sono state provate. 20
casi falliscono perché un candidato esce dalla zona ritagliata (cuore e
cerchio alla distanza più lunga): una zona più larga per quei casi è un
ritocco possibile, non fatto. La previsione del piano (150–200 disegni) era
alta. Il server le carica con un passo «catalogo» (sì dell'utente al
Coordinatore).

## ADR-0396 — La scheda si adatta a com'è andata: un campo `adapt` facoltativo nel programma, una domanda per allenamento, i passi applicati dal telefono, la risposta tenuta con «Save»

**Stato**: Attiva · 2026-11-23 · TASK-488, A (#1415, server e tipi) e B
(#1420, l'app) in `main`; A sul server (passo 19, «adapt ok plans 2
adapted 0»); B esce col prossimo OTA di produzione. La domanda, le regole,
l'interruttore, i testi e il passo sul server sono **scelte dell'utente**
(2026-11-22 e 23, una domanda per volta, tela «Schede palestra guidate»
riga H); il campo, la forma dei passi e quando la risposta si tiene sono
**decisi dall'agente su delega dell'utente**; numero dal Coordinatore.
Estende ADR-0360 (le settimane che cambiano), ADR-0363 (i giorni di corsa)
e ADR-0369 (la corsa su misura).

**Contesto**: le schede guidate crescono sempre allo stesso passo, scritto
nel modo («più kg», «più ripetizioni», «alterna», «sempre uguale»), con
l'ultima settimana di un ciclo di 3 o più più leggera. Non sapevano se
l'allenamento era stato facile o al limite. Il programma sta nel JSONB
`gym_plans.program` (0066), validato da pydantic con `extra="forbid"`: un
campo nuovo va sul server prima dell'app.

**Decisione dell'utente**:
1. **una domanda per allenamento**, «Facile / Giusto / Duro», una volta per
   tutto il giorno della scheda, anche a fine corsa nei giorni di corsa;
   senza risposta la scheda va avanti come previsto; «Change» finché non si
   preme «Save»;
2. **le regole di H2**: Facile un passo in più del previsto, Giusto come
   previsto, Duro la volta dopo uguale, due «Duro» di fila un passo
   indietro;
3. **accesa per ogni scheda**, anche quelle già fatte, si spegne in «My
   plans» con «Adapts to how it went»; accanto ai giorni i segni ↑ = ↓;
4. i testi (titolo in palestra «Come ti è sembrata la scheda?», a fine
   corsa «{corsa} della scheda: com'è andata?», la riga della settimana
   più leggera) e le schermate approvati.

**Decisione dell'agente**:
1. **Un campo facoltativo `adapt`** nel programma: `{off, days}`, al più
   un giorno per giorno della settimana, `{day 1–7, steps −24…24, hard
   0–2, last easy|right|hard}`. Nessuna migrazione. Il server toglie i
   giorni di `adapt` che il programma non ha più, invece di rifiutare la
   scheda: l'app di prima copia `adapt` così com'è salvando.
2. **I passi li applica il telefono** (`program.ts`) a ogni settimana di
   quel giorno, anche a quelle scritte a mano: in «più kg» `step_kg` a
   passo; in «più ripetizioni» un gradino della sua scala, mai sotto la
   prima settimana; senza kg una ripetizione (5 s se tenuto); un giorno di
   corsa un passo della sua crescita, anche con «sempre uguale». In «più
   kg» un esercizio che non cresce non scende sotto quanto è scritto.
3. **Le regole** (`adapt.ts`): Facile `steps + 1`, `hard = 0`; Giusto
   `hard = 0`; Duro `steps − 1` se il modo cresce, `− 1` in più dopo un
   «Duro», `hard` fino a 2. I giorni verso una meta (TASK-461) e le uscite
   di altri sport non si adattano.
4. **Si tiene con «Save»** dell'allenamento o della corsa, sulla scheda nel
   telefono (`keepPlan`); arriva all'API con la sincronizzazione seguente
   delle schede, senza chiamate di rete dalle schermate di fine.
5. **Cosa cambia la volta dopo**: fino a tre righe, prima quelle che
   cambiano, coi pesi come li scrive il telefono; se la settimana dopo è
   quella di recupero del ciclo lo dice, perché «Facile» non mostri un
   peso più basso senza spiegarlo.

**Alternative scartate**: una domanda per esercizio; spenta per le schede
già fatte; una tabella o una rotta nuove; la chiamata all'API dalla fine
dell'allenamento; rifiutare (422) una scheda con risposte per giorni
tolti.

**Conseguenze**: il server prima dell'app (fatto, passo 19). Il Coach MuW
(TASK-491, ADR-0399) legge e scrive gli stessi passi con «Apply». Un'app
di prima dell'OTA mostra la scheda come prevista, senza i passi, e li
conserva.

## ADR-0390, precisazione A — La lista del «+» nell'app: «Record now» come l'avvio senza percorso di «Draw», «Photos only» dritto al modulo di C2, «From a file» con «Files» aperto subito (`fileAtOnce`), il titolo della voce aperta

**Stato**: Attiva · 2026-11-23 · TASK-481 parte A (#1421, `3f124ce7`).
Ordine, «niente Soon», «Record now» in lista, testi e traduzioni
(«Add to Feed», «Record now», «Start an activity now») e schermate:
**scelte dell'utente** (2026-11-21, approvate il 2026-11-23). Il resto è
**deciso dall'agente su delega dell'utente**, con `AddPastActivity.tsx`
come file in più approvato dal Coordinatore il 2026-11-22.

**Contesto**: ADR-0390 vuole il «+» del Feed come una lista di voci pronte,
in ordine. TASK-312 C2 aveva messo «Photos only» dentro le scelte di «Add
past activity»: aperto da «From a file» della lista, l'avrebbe mostrata di
nuovo, e l'ordine non avrebbe tenuto.

**Decisione**:

1. **Le voci in un file solo**, `apps/mobile/src/feed/addToFeedEntries.ts`:
   ogni voce con titolo, riga sotto e «pronta»; oggi «Record now» (se il
   Feed sa avviare una registrazione), «Photos only» (sempre), «From a
   file» (se l'app ha il selettore di file). Sleep, Gym workout e Workout
   plan aggiungono la loro riga lì, al loro posto, quando il loro flusso è
   nell'app.
2. **«Record now» fa quello che fa l'avvio senza percorso di «Draw»** per
   lo sport scelto: palestra e stretching aprono la loro seduta, le
   ciaspole passano dal loro avviso, gli altri sport la corsa libera. Il
   foglio si chiude prima.
3. **«Photos only» apre direttamente il modulo di C2** (`PhotoPostForm`,
   invariato); «Cancel» e «‹» tornano alla lista.
4. **«From a file» apre «Files» subito**: `AddPastActivity` prende la prop
   facoltativa `fileAtOnce`, che con `opened` mostra solo «From a file» e
   apre il selettore una volta al primo disegno; dopo un annullamento resta
   la scelta con il suo aiuto. In «My activities» non cambia niente.
5. **Il titolo del foglio** è «Add to Feed» sulla lista e quello della voce
   aperta dentro, con «‹» per tornare. «Add activity» esce dai testi.

**Alternative scartate**: aprire «Add past activity» intero da «From a
file» (ripete «Photos only»); per «Record now» solo `setScreen("run")`
(con la palestra avrebbe aperto la corsa).

**Conseguenze**: esce col prossimo OTA (Coordinatore, col sì
dell'utente). La privacy è fatta (#1444, `9b946507`, 2026-11-23): «from a
file» nella frase del «+» in «Help» e «Privacy», cinque lingue (le quattro
traduzioni approvate dall'utente) e pagine del sito rifatte con
`make_privacy.mjs`; la data resta il 23 novembre. Restano le righe di
TASK-467 E2, TASK-484 B e TASK-485 B, ognuna al via del Coordinatore.

## ADR-0394, precisazione B — La scheda pubblicata nell'app: `plans` in `X-MuW-Reads`, una coda sul telefono che tiene l'id dei post mandati, la guida di «Use this plan» nello stesso foglio del piano, il limite di 20 guardato prima

**Stato**: Attiva · 2026-11-23 · TASK-485 parte B (#1414, `f4737c66`).
Riquadro e dettaglio, kg nella copia, copia che non segue l'originale,
testi e quattro traduzioni (2026-11-21 e 2026-11-23, con le schermate del
simulatore): **scelte dell'utente**. Il resto è **deciso dall'agente su
delega dell'utente**, con la lista dei file approvata dal Coordinatore
(fork 3).

**Contesto**: la parte A mette sul server la scheda pubblicata (un disegno
senza corsa con `drawings.plan`, solo alle app che dicono `plans`); restava
l'app.

**Decisione**:

1. **L'app dice `plans`** in `X-MuW-Reads` e accetta `activity` `null`
   quando `source` è `photos` o `plan`. Senza questo il Feed rifiutava la
   risposta intera e la pagina non si caricava (visto nel simulatore).
2. **Una coda sul telefono** (`plan-post-outbox.json`, come per le foto):
   il post parte anche più tardi, il più vecchio prima; la chiave la fa il
   telefono. Un post mandato resta nel file col suo id (al più 50 per
   account), perché il Feed dà l'id e non la chiave: «Delete post» c'è solo
   sul telefono che l'ha pubblicato.
3. **Un foglio solo**: «Use this plan» apre la guida *al posto* del piano
   aperto, nello stesso foglio. Due fogli chiusi insieme lasciavano iOS su
   uno schermo nero. «Added to your plans» è una riga sotto il riquadro,
   non un avviso.
4. **La copia nella guida delle schede** (`GymPlanWizard`, `copied`): solo
   gli ultimi passi, «How do you run today?» quando la scheda ha corse e
   poi nome e primo giorno (il lunedì da oggi). Salva con
   `PUT /me/gym-plans/{key}`.
5. **Il limite di 20** si guarda sul telefono prima di aprire la guida; il
   server lo tiene comunque.

**Alternative scartate**: tenere la chiave del post sul server per
cancellarlo da ogni telefono (cambia il contratto di A); la guida come
foglio sopra il piano (lo schermo nero di iOS).

**Conseguenze**: in produzione con l'OTA che la porta, col sì
dell'utente; le app di prima non vedono questi post. Restano la voce nel
«+» del Feed (dopo TASK-481 A), la riga della privacy a turno, e il piano
aperto da un profilo, una notifica o un link.

## ADR-0375, precisazione R6e — Il post di una gara a due colori: `flight` anche in `GET /drawings/{id}`, solo se la linea del post ha i punti della corsa; lo schema openapi delle due risposte torna coi suoi campi

**Stato**: Attiva · 2026-11-23 · TASK-305 parte R6e: server #1411
(`e427ed2e`, col passo 19), app #1412 (`7a0972de`, con l'OTA 23). Che la
si faccia ora è **scelta dell'utente** («Sì, fallo», 2026-11-22); il resto
è **deciso dall'agente su delega dell'utente**, con le liste dei file
approvate dal Coordinatore. Toglie il punto 7 («Fuori») di R6d e corregge
il prezzo del suo punto 3.

1. **`flight` nel post aperto** (`GET /drawings/{id}`): lo stesso di
   `GET /me/activities/{key}` (R6d, punto 1), dallo stesso `flight_of`,
   calcolato a ogni lettura. Lo vede chi vede il post: i tempi a piedi e in
   volo erano già sul post (`flight_split`).
2. **Solo se i punti tornano**: gli indici sono della traccia della corsa;
   il post ha la sua copia (`drawings.track`). Se le due linee non hanno lo
   stesso numero di punti (un disegno tenuto tagliato, prima di ADR-0330)
   `flight` manca, così i tratti non finiscono nel posto sbagliato.
3. **Assente quando manca**, come in R6d. Il serializzatore ora non ha un
   tipo di ritorno, come quello del sonno in `SeenFields`: lo schema
   openapi di tutte e due le risposte resta coi loro campi (R6d lo aveva
   reso un oggetto qualsiasi). Un test lo controlla.
4. **Nell'app** lo stesso `activityFlightOf`, che accetta qualunque
   `{ track, flight? }`: il post di una gara si disegna bianco a piedi e
   giallo in volo, la mappa inquadrata sulla linea, invece che tutto in
   giallo come una rotta. Senza `flight` resta come prima.
5. **Prima il server, poi l'OTA**, ma qui l'ordine non conta: un'app con
   R6e su un server senza mostra il post come oggi.

## ADR-0272, precisazione C2 — Il post di sole foto nell'app: «Photos only» da «Add past activity» e dal «+» del Feed, una coda sul telefono come le corse, la sua scheda e la sua pagina, niente «Share»

**Stato**: Attiva · 2026-11-22 · TASK-312 parte C2 (#1386, `3d4f0d47`). Testi,
partenza dall'ultima scelta, schermate, testi della cancellazione,
«Importata» e riga della privacy con le traduzioni: **scelte dell'utente**
(2026-11-21 e 2026-11-22). Il resto è **deciso dall'agente su delega
dell'utente**, con la lista dei file approvata dal Coordinatore.

**Contesto**: la precisazione C mette sul server il post di sole foto (un
disegno senza corsa, solo alle app che dicono `photos`); restava l'app.

**Decisione**:

1. **L'app dice `photos`** in `X-MuW-Reads` e accetta `activity` `null`
   solo quando `source` è `photos`: un'altra risposta senza attività resta
   una risposta sbagliata.
2. **Una coda sul telefono**, come per le corse e la palestra: il post e
   le sue foto (file `photo-post-outbox.json` e una foto per file) partono
   anche più tardi, una foto alla volta; la chiave la fa il telefono. A
   ogni invio riuscito il Feed rilegge le schede aperte. All'uscita
   dall'account la coda di quell'account si scorda.
3. **Due entrate**: «Photos only» in «Add past activity» e nel «+» del
   Feed. Il «+» c'è con l'account anche senza il selettore di file (la
   1.0): allora ha solo «Photos only».
4. **Una scheda e una pagina proprie** (`PhotoFeedPost`, `PhotoPostPage`):
   foto da scorrere, «Imported», la data della pubblicazione, reazioni,
   commenti, segnalazioni e blocchi come ogni post. Niente «Share»,
   niente numeri della corsa, niente invio in chat; nella griglia del
   profilo la prima foto.
5. **Cambiare e cancellare dalle impostazioni della pagina**: l'app trova
   la chiave con `GET /me/photo-posts` (C1b); «Delete post» chiede
   conferma.

**Alternative scartate**: mettere i post di sole foto in «My activities»
(non sono attività, e «My activities» parte dalle corse); riusare la
scheda di una corsa senza mappa (troppi rami per i campi `null`).

**Conseguenze**: in produzione con l'OTA 23; le app di
prima non vedono questi post. Ricerca, link pubblico e chat restano fuori
come dice la precisazione C.

## ADR-0127, precisazione (TASK-487) — «Feed» senza esempi: senza account l'invito ad accedere, con account e nessun post una riga che lo dice

**Stato**: Attiva · 2026-11-22 · TASK-487, codice #1397. **Scelta
dell'utente** (2026-11-22): «togliamo tutte quelle finte», e alla domanda
su cosa mostrare senza accesso «Invito ad accedere».

**Contesto**: l'ADR-0127 faceva mostrare a «All» i disegni d'esempio
(figure del catalogo con corridori inventati) finché l'account non aveva
nulla da vedere o nessuno aveva fatto l'accesso. Sull'app dell'App Store
aperta sul Mac senza accesso l'utente ha visto quelle attività finte al
posto delle sue e di Rocky, che l'app di prova mostra: le due app usano lo
stesso server, la differenza era solo l'accesso. `GET /feed` vuole il
token, quindi senza accesso non ci sono attività vere da mostrare.

1. **«Feed» non mostra più esempi**, in nessuna scheda: solo i post degli
   iscritti (`postsOf` in `FeedScreen.tsx`).
2. **Senza account**: «All» dice «Log in from Profile to see the
   activities.» (`feed-log-in`), senza schede né «+», come prima.
3. **Con account e nessun post**: «Nobody has published anything yet.»
   (`feed-no-posts-all`). «Following» resta com'era.
4. Il server non cambia; nessun Feed pubblico senza account.

**Conseguenze**: i percorsi MuW (TASK-365) e i post di MuW Style si
mettono solo tra post veri, quindi senza post non compaiono. Il codice che
apre un esempio (`fetchPostRoute`, `paddlePosts`) resta perché gli esempi
compaiono ancora tra i «featured» della ricerca di «Explore»
(`src/search/StartState.tsx`), fuori da questo task. Tolti i test
d'interfaccia che entravano da un esempio del Feed
(`AppFeedPaddle.test.tsx`, un test di `AppExploreMove.test.tsx`).

## ADR-0375, precisazione R6d — La gara riaperta: i tratti in aria dalla traccia salvata, calcolati a ogni lettura; la mappa a due colori e i tempi divisi in «My activities»

**Stato**: Attiva · 2026-11-22 · TASK-305 parti R6c (#1313), R6d-a (#1342,
server al passo 15) e R6d-b (#1352). **Scelta dell'utente**: le schermate
della gara finta nel simulatore («Sì, approvo» per R6c e per R6d). Il resto
è **deciso dall'agente su delega dell'utente**, con le liste dei file
approvate dal Coordinatore.

1. **`flight` nell'attività aperta** (`GET /me/activities/{key}`): `air`
   è una lista di coppie di indici dei punti della traccia salvata, il
   primo e l'ultimo punto il cui tempo (l'M della linea) cade dentro un
   tratto in aria; `split` è lo stesso `flight_split` delle liste. Un
   tratto in aria con un punto solo resta fuori.
2. **Calcolato a ogni lettura**, dalla traccia e dal JSON di
   `run_stats.stats`: nessuna migrazione, niente di nuovo salvato, e le
   gare già salvate lo hanno senza toccarle. Solo per `paragliding` con
   tutti e due i tipi di tratto.
3. **Assente quando manca**: un serializzatore lo toglie se è nullo, così
   ogni altra risposta resta uguale byte per byte. Il prezzo: in openapi
   quella risposta è un oggetto senza proprietà, e il controllo del server
   legge il modello.
4. **L'app non si fida alla cieca**: coppie intere, in ordine, dentro la
   traccia, e uno split valido; se qualcosa non torna, la gara si vede
   come prima, tutta bianca e senza la riga dei tempi.
5. **Alla fine di una gara (R6c)** la mappa inquadra tutta la traccia,
   piedi e aria, non solo l'ultimo tratto.
6. **Prima il server, poi l'OTA**: un server senza R6d-a non dà `flight` e
   l'app mostra la gara come oggi.
7. **Fuori**: il post di una gara aperto dal Feed o da un profilo
   (`GET /drawings/{id}`) resta bianco, per dopo.
## ADR-0391 — Il link di un post apre l'app: l'id dopo il `#`, solo un id a forma di disegno, la barra di Safari subito e i link verificati con la prossima build

**Stato**: Attiva · 2026-11-22 · TASK-482. Che il link debba aprire il post
nell'app, la prova della barra di Safari, «prima l'ingresso e poi il post»,
la frase «Log in to see this drawing.» e la parte nativa «nella prossima»
build sono **scelte dell'utente** (2026-11-21 e 22, una domanda per volta);
il resto è deciso dall'agente su delega dell'utente; numero dal
Coordinatore. Estende ADR-0382 (il link di un post), non lo cambia.

**Contesto**: il link di un post (`https://getmuw.app/p/#<id>`, TASK-455
parte E) apriva sempre la pagina del sito, anche con MuW installata:
`app.json` non dichiara né uno schema né domini associati, l'app non
ascoltava nessun indirizzo in arrivo, il sito non ha `/.well-known/`.
L'utente, provandolo da WhatsApp il 21 novembre: «dovrebbe aprirsi il post
nell'app». Ogni riga di `app.json` cambia l'impronta nativa (`5e1b5ce5`) e
arriva solo con una build dagli store. Lo schema che Expo aggiunge da solo
(l'identificativo dell'app) sul telefono dell'utente **dà errore**: non ci
si costruisce sopra.

**Decisione**:

1. **Il link non cambia**: resta `getmuw.app/p/#<id>`, con l'id dopo il
   `#`, che non arriva a nessun server (ADR-0382), anche quando apre l'app.
   La pagina resta com'è per chi non ha l'app.
2. **L'app non si fida dell'indirizzo** (parte A, `links/postLinkIn.ts`):
   ne prende solo un id a forma di disegno, e solo dalla pagina
   `POST_LINK_PAGE` in `https`; ogni altro sito, pagina o schema è
   ignorato. Se il post esiste e chi può vederlo lo dice l'API quando il
   disegno viene chiesto, come per una notifica toccata
   (`opens.openDrawing`).
3. **Senza account, prima l'ingresso**: la pagina dell'account con la riga
   «Log in to see this drawing.», e il post appena si entra. Il link in
   attesa vive solo finché l'app è aperta.
4. **Niente dipendenze nuove**: `Linking` di React Native. L'indirizzo con
   cui l'app è stata aperta si legge una volta sola; lo stesso post due
   volte in 3 secondi è uno (il telefono lo consegna in due modi).
5. **Subito, senza build**: la barra di Safari sulla pagina del link
   (parte B2) — il meta `apple-itunes-app` fisso in `site/p/index.html`,
   perché Safari lo legge mentre carica, e `bar.js`, eseguito subito, gli
   aggiunge `app-argument` con l'indirizzo della pagina. Provata
   dall'utente: la barra c'è e «Apri» apre MuW.
6. **Con la prossima build nativa** (parti C e D): `associatedDomains`
   (`applinks:getmuw.app`), i filtri verificati di Android e uno schema
   vero in `app.json`; i due file `/.well-known/` sul sito, serviti dal
   server, prima che la build esca. Solo così il link toccato in WhatsApp
   apre direttamente l'app, anche su Android.

**Scartate**: un bottone «Open in MuW» con lo schema dell'identificativo
(sul telefono dà errore); mettere l'id nel percorso o dopo `?` per
semplificare i link verificati (arriverebbe ai server, contro ADR-0382);
una build nativa apposta (l'utente: nella prossima); aprire il post anche
senza account (la pagina del sito lo fa già).

**Conseguenze**: la barra compare anche per un link che non apre più
nessun post (Safari la legge prima che la pagina lo sappia) e solo in
Safari, non nel browser interno delle app di chat. Che iOS passi all'app
l'`app-argument` della barra come indirizzo aperto **non è dimostrato**:
si vede sul telefono dopo l'OTA della parte A; se non lo fa, la parte A
resta inerte fino alla build nativa. `site/config.js` ha un solo
`downloadUrl`, l'App Store anche per chi è su Android: difetto segnalato
al Coordinatore, non di questo task.

**Aggiunta 2026-11-23** (decisa dall'agente su delega dell'utente):

- **Dimostrato**: iOS passa all'app l'`app-argument` della barra di Safari
  come indirizzo aperto. L'utente, sull'iPhone dopo l'OTA 21: «Sì, apre il
  post». La parte A non è inerte: link in Safari → «Apri» → il post in MuW.
- **`assetlinks.json` porta tre impronte, non una** (parte C, metà
  Android, #1436). Nella Play Console la chiave di firma «In uso» ha due
  certificati (classico e post-quantistico, «Predisposta per la tecnologia
  quantistica») e ce n'è una precedente; il JSON che Play propone porta
  solo la precedente. Non potendo sapere con quale Play firma ogni
  installazione, il file elenca tutte e tre («Copia tutte le fingerprint
  del certificato»): sono tutte chiavi di Play per questa app, e
  `sha256_cert_fingerprints` è una lista. **La chiave di caricamento resta
  fuori** (un test lo controlla): un APK di prova firmato da EAS non apre
  i link. Scartata: la sola impronta del JSON di Play (se Play firma con
  la chiave in uso, i link non si verificherebbero).
- I due file `.well-known` vanno online **prima** della build, non con
  essa: da soli non cambiano niente, e il giorno della build i telefoni li
  trovano già.

**Aggiunta 2026-11-23, parte D** (bozza #1461; decisa dall'agente su
delega dell'utente, elenco approvato dal Coordinatore):

- Android prende la pagina di un post coi suoi **tre percorsi esatti**
  (`/p/`, `/p`, `/p/index.html`), gli stessi del file dell'iPhone: un
  prefisso `/p` prenderebbe anche `/privacy`. Android non sa leggere cosa
  c'è dopo `#`: la pagina `/p/` senza id aprirebbe l'app sulla prima
  schermata — nessuno condivide quell'indirizzo.
- Lo schema dell'app è **`muw`**, solo dichiarato: nessun bottone e nessun
  codice lo usa (un «Open in MuW» è una scelta di prodotto).
- Le due impronte native si muovono insieme: `fingerprint.config.js` non
  separa queste righe per telefono, perché la build è per tutti e due gli
  store. Per questo la PR resta bozza fino al taglio: in `main` prima
  taglierebbe la 1.1.0 installata fuori dai suoi aggiornamenti.
- Un test (`postLinkConfig.test.ts`) legge insieme `app.json` e i due file
  `.well-known` del sito: il telefono apre l'app solo se dicono lo stesso.

## ADR-0392 — Lo storico di ogni esercizio in palestra: «Last time» coi campi già compilati, «History» col massimale stimato, un indirizzo che legge solo le proprie serie

**Stato**: Attiva · 2026-11-22 · TASK-483: parte 0 (documenti), A #1385
(server, passo 17), B #1396 (app, OTA 22), #1406 (la virgola nei pesi).
I tre schermi, la regola del suggerimento, l'unione dei nomi liberi e
«History» dalla guida sono **scelte dell'utente** (risposte 1–4 del task
file); il resto è **deciso dall'agente su delega dell'utente**, numero dal
Coordinatore (fork 2).

**Contesto**: l'utente vuole che, scelto un esercizio, l'app dica quanto
ha fatto le volte scorse e mostri tutto lo storico in modo intelligente.
Le serie sono già salvate in `gym_sets` (ADR-0327), ma nessun indirizzo le
rilegge per esercizio e l'app non le mostra.

**Decisione**:
- **Durante l'allenamento** un riquadro «Last time · {data}» con le serie
  dell'ultima seduta di quell'esercizio; la prima serie parte coi valori
  dell'ultima volta. Sotto, un suggerimento di una riga: tutte le serie
  arrivate alle ripetizioni → +2,5 kg alle stesse ripetizioni, altrimenti
  lo stesso peso «again»; a corpo libero +1 ripetizione, a tempo +5
  secondi, il cardio senza. Le ripetizioni da raggiungere sono quelle
  della scheda seguita, altrimenti quelle della prima serie dell'ultima
  volta. Il suggerimento non compila i campi.
- **«History»**: grafico (1M, 3M, 1Y, All), quattro record, tutte le
  sedute dalla più recente con la freccia sulla seduta prima e «PR». Si
  apre dall'allenamento e dalla guida «i» (quindi anche da «+ Exercise»).
- **Il numero del grafico** dipende dal tipo: `load` il **massimale
  stimato** con la formula di Epley, kg × (1 + ripetizioni / 30), solo da
  serie con al più 12 ripetizioni (oltre la stima non regge; una seduta
  senza serie così mostra il peso più alto); `bodyweight` le ripetizioni
  migliori; `timed` i secondi; `cardio` la distanza. Un punto per seduta:
  il meglio di quella seduta.
- **Lo stesso esercizio**: un esercizio del catalogo per la sua chiave; uno
  col nome libero per il nome senza spazi in testa e in coda, con gli
  spazi doppi ridotti a uno e in minuscolo.
- **Un indirizzo nuovo, solo per chi è entrato e solo sulle proprie
  serie**: `GET /me/gym-history?exercise=` o `?name=`, in un modulo nuovo
  (`gym_history.py`). Risponde coi record e un punto per seduta su tutto
  lo storico (pochi byte per seduta, così «All» e i record sono giusti
  senza scaricare ogni serie), e con le sedute intere a pagine dalla più
  recente. Contano tutte le serie, anche quelle non `live` e quelle di
  un allenamento scritto a mano (ADR-0395, quando arriva): lo storico è
  di chi si allena, la classifica resta com'è. Un indice nuovo su `gym_sets` solo se la misura lo chiede.
- **Gli allenamenti ancora in coda** sul telefono (`gymOutbox`) contano
  per «Last time» e «History»: li aggiunge l'app.

**Conseguenze**: parte A sul server col sì dell'utente (controlli in
`out/TASK-483/SERVER-A.md`); parte B nell'app con un OTA, testi e
schermate all'utente prima. Un'API di prima risponde `404`: l'app tiene
spenti riquadro e «History» e lascia i campi come oggi.

**Aggiunte della parte B, decise dall'agente su delega dell'utente**:
- **Campi già compilati**: valgono le serie di questo allenamento, poi i
  valori della scheda seguita; l'ultima volta riempie solo i campi che la
  scheda lascia vuoti (le settimane delle schede guidate restano quelle).
- **Chi pesa in lb**: il suggerimento aggiunge 5 lb, non 2,5 kg.
- **Senza rete**: il telefono tiene l'ultima risposta di 40 esercizi
  (`gym-history.json`), così «Last time» c'è anche in palestra.
- **Le frecce tra sedute** non confrontano un massimale stimato con un
  peso massimo (seduta di sole serie oltre 12 ripetizioni): niente freccia.
- **Un'API senza la rotta (404)** spegne «Last time» e «History».
- **Il grafico è fatto di View** (niente react-native-svg, niente build
  nativa).
- **I pesi con la virgola** dove la lingua dell'app la usa («82,5 kg»),
  chiesto dall'utente dopo la prova: `weightLabel` per tutti i pesi
  dell'app (#1406).

## ADR-0380, precisazione E — Il post del sonno da solo: un disegno senza corsa che porta la sua notte, un tipo `sleep` in `X-MuW-Reads`, la notte tenuta finché un post è suo

**Stato**: Attiva · 2026-11-21 · TASK-467 parte E1 (#1373, `f38b1980`,
migrazione `0082`). Le scelte di prodotto sono dell'utente (risposte 10–12
del task file: «Dal "+", a parte», «Everyone», i testi); le altre sono
**decise dall'agente su delega dell'utente**; lista dei file approvata dal
Coordinatore.

**Contesto**: l'utente ha chiesto il post del sonno da solo nel Feed, che
l'ADR-0380 rimandava ai post senza attività. Da TASK-312 C1 (ADR-0272,
precisazione C) un post senza attività è un disegno senza corsa.

1. **Un disegno senza corsa che porta la sua notte**
   (`drawings.sleep_night_id`), non una corsa finta né una tabella di
   post a parte: così reazioni, commenti, segnalazioni, blocchi, nascosti
   e «Followers» valgono senza una riga nuova, e chi parte da `runs`
   (totali, record, gioco, badge, concorso, «My activities») non lo vede
   mai.
2. **Pubblicato appena nasce, uno per notte, mai «Only me»**: ha la sua
   notte, non aspetta una foto. La chiave è `sleep` più il giorno, quindi
   rimandarlo è lo stesso post; `409` se un post di sole foto ha già
   quella chiave (non lo si trasforma).
3. **Un tipo suo in `X-MuW-Reads`, `sleep`, e non `photos`**: l'app delle
   sole foto lo mostrerebbe come un post senza foto. Il filtro sta in un
   posto solo, `Reads.drawings_sql()`: `feed.py` e gli altri elenchi non
   cambiano. Il server può uscire prima dell'app.
4. **`source` `sleep` e la notte nel campo `sleep`** che il disegno visto
   aveva già (precisazione B1b/B2): l'app non fa richieste in più.
5. **Si tiene solo quello che è pubblicato**: una notte resta finché è nel
   profilo, un'attività la porta o un post è suo. Lo fa il database
   (`sleep_night_left` riscritta, un trigger su `drawings`), così vale
   anche per un post cancellato dalla moderazione.
6. **Il post e il profilo sono separati**: `PUT /me/sleep-posts/{night}`
   non tocca `shared`, «Stop sharing» non toglie il post; `DELETE
   /me/sleep/{night}`, che toglie la notte dal server, porta via anche il
   post.
7. **Le rotte prendono il giorno, non una chiave**: come `/me/sleep/{night}`;
   l'app sa se la notte è già un post con una `GET` che dice solo il
   giorno.

**Conseguenze**: TASK-312 filtra `sleep_night_id IS NULL` nei suoi
endpoint («C1c»). Concorso, badge, gioco, ricerca, link pubblico e post in
chat restano fuori, come per le sole foto. L'app (E2) resta dietro
`SLEEP_POSTS_ON` e dice `sleep` solo quando è accesa.

## ADR-0393 — L'attrezzatura: una lista per iscritto con foto e nota, più attrezzi per attività, i totali contati dal server, visibile come il profilo, legata ai capi taggati

**Stato**: Proposta · 2026-11-21 · TASK-486 (parte 0, soli documenti).
Cosa entra, i tipi, il legame coi capi taggati, la visibilità, il ritiro
con l'avviso e la riga nel post sono **scelte dell'utente**; il resto è
deciso dall'agente su delega dell'utente, numero dal Coordinatore.

**Contesto**: l'utente vuole aggiungere scarpe, bici, sci e «tutto
proprio» (vele, imbraghi, caschi, vestiti), agganciarli alle attività
perché contino i km, vederli sul profilo proprio e degli amici, con una
nota («quando l'hanno comprata»). Esistevano solo i capi taggati sulle
foto dei post (ADR-0333): un pallino per foto, senza lista né km.

**Decisione**:
- **Una lista per iscritto** (`gear`): tipo da una lista fissa con
  `other`, marca, modello, nome, data d'acquisto, nota, una foto. Nome,
  marca, modello e nota passano dal filtro dei commenti; si segnalano.
- **Più attrezzi per attività** (al massimo 10) in `activity_gear`, e
  predefiniti per sport che si agganciano da soli a fine attività.
- **I totali li conta il server** (metri, secondi, uscite) dalle attività
  agganciate, come i totali del profilo; mai i numeri del telefono.
- **Visibile come il profilo**, con «Hide from profile» per attrezzo; nel
  dettaglio del post una riga per attrezzo non nascosto, mai sulla scheda
  del Feed.
- **«Retire»** tiene l'attrezzo e i totali fuori dalla scelta; un limite
  facoltativo dà una voce nella campanella, una volta per limite.
- **Capi taggati legati**: un tag può nascere da un attrezzo
  (`drawing_outfit_tags.gear_id`, `ON DELETE SET NULL`); i tag di prima
  restano come sono.

**Alternative scartate**: un attrezzo solo per attività (casco e imbrago
non conterebbero mai); attrezzatura e capi taggati separati, o fusi in una
cosa sola (scelta dell'utente: collegati); visibile solo agli amici o solo
a chi la possiede (scelta dell'utente: come il profilo); commenti degli
amici subito (scelta dell'utente: base e foto prima).

**Conseguenze**: sette parti (A server, B lista, C fine attività, D
profilo, E post, F capi taggati, G avviso), ognuna una PR coi file
mandati prima al Coordinatore. La privacy cambia nelle cinque lingue e sul
sito prima dell'uscita, col sì dell'utente, come il passo sul server.

## ADR-0388 — Il parapendio completo: uno strumento di volo con dati gratuiti e formati aperti, senza accordi con terzi; gli spazi aerei li carica il pilota

**Stato**: Attiva · 2026-11-21 · scelta di prodotto dell'utente; il come
deciso dall'agente su delega dell'utente (TASK-479; numeri dal
Coordinatore).

**Contesto**: il parapendio è uno sport «Record only» (ADR-0375): registra
il volo, mostra quota, vario e velocità, lo condivide dal vivo. Il
2026-10-26 l'utente aveva scelto «non facciamo da navigatore» (parte G di
TASK-305 fuori) e ADR-0375 diceva «Nessuna guida in volo». Il 2026-11-21
l'utente vuole il parapendio «completo e professionale, come XCTrack,
SeeYou Navigator e Flyskyhy», ma solo con quello che non chiede accordi
con terzi né servizi a pagamento.

**Decisione**:
- **Scelta dell'utente**: MuW diventa uno strumento di volo: schermata di
  widget personalizzabile coi preset, vario sonoro, mappa 3D in volo e
  replay, navigazione e gare (boe, task, cilindri, planata), spazi aerei
  da un file del pilota, analisi e punteggio XC dopo il volo, la task nel
  live, il vento in quota da modelli aperti. **Supera** la scelta del
  2026-10-26 (parte G di TASK-305) e il punto «Nessuna guida in volo» di
  ADR-0375; il resto di ADR-0375 vale.
- **Restano**: l'avviso «MuW is not a … flight instrument» al primo volo
  (testo nuovo approvato il 2026-11-21: «certified», numeri dal GPS,
  strumento di riserva) e una riga fissa sulla schermata; l'app dà numeri
  e informazioni, mai ordini o giudizi: non dice mai «spazio aereo
  libero», «nessun NOTAM», «condizioni sicure», «ce la fai», «qui è legale
  volare», e la planata è sempre una quota d'arrivo, mai un sì o un no.
- **Solo fonti gratuite e senza accordi**: terreno AWS Terrain Tiles (già
  nell'app) e Copernicus DEM sul server se serve; decolli e atterraggi da
  OpenStreetMap (ODbL, le chiavi `sport=free_flying`,
  `free_flying:takeoff/landing` e la vecchia `free_flying:site`); formati
  aperti IGC, GPX, `.cup`, `.wpt`, `.xctsk` e QR di XCTrack; meteo da DWD
  ICON-D2 ed ECMWF open data (CC BY 4.0) elaborati sul nostro server
  (parte H, «Sì, come parte H»). **Non si usano** openAIP,
  ParaglidingEarth, XContest, LiveTrack24, NOTAM, Open-Meteo, Windy,
  Meteo-Parapente: li valuterà l'utente più avanti.
- **Gli spazi aerei li carica il pilota**: un file OpenAir scelto da lui,
  letto e tenuto sul telefono; MuW non include né spedisce dati di spazio
  aereo, mostra sempre il nome del file e la data dell'import e la riga
  «Dati caricati da te: verifica AIP e NOTAM prima di volare». I limiti in
  FL sono approssimati dalla quota GPS e segnati «≈».
- **Tutto sul telefono**: layout, profili, boe, task, spazi aerei e
  punteggio XC vivono sul telefono (`expo-file-system`); niente upload né
  firma IGC (l'export dice «non firmato»). Il server prende solo
  l'estratto OSM dei siti (D), la task nel live (G) e il meteo (H), ognuno
  prima dell'app e col sì dell'utente.
- **Senza dipendenze nuove nell'app** fino alla 1.1: quota e vario dal
  GPS (con la correzione del geoide EGM96 dove il telefono dà la quota
  sull'ellissoide), suono con `expo-audio` e campioni pre-generati, voce
  con `expo-speech` solo per il nome della boa presa e della successiva,
  QR di export scritto in TypeScript. **Dopo la 1.1**, in una build
  nativa e ognuno col suo sì: barometro (`expo-sensors`) e fotocamera per
  leggere il QR (`expo-camera`). Un tocco ad `app.json` per l'audio a
  schermo spento si chiede prima (fingerprint iOS).
- **Logica pura e testata prima dei componenti**: vario medio, L/D, vento
  dalla deriva, termiche, ottimizzazione dei cilindri e del punteggio XC,
  parser IGC/`.cup`/`.wpt`/`.xctsk`/OpenAir in `apps/mobile/src/air/`, con
  test deterministici su file sintetici (nessun file di spazi aerei
  reale nel repository).
- **Ordine** (scelta dell'utente): B1 (numeri e schermata coi preset) →
  B2 (editor; anticipato dall'utente la sera del 2026-11-21) → C (vario
  sonoro) → A1 (mappa 3D in volo) → E (spazi aerei) → D (navigazione e
  gare) → F con A2 (dopo il volo, replay) → G (live) → H (meteo).

**Alternative scartate**:
- *Restare un registratore* (ADR-0375 com'era): superata dalla scelta
  dell'utente.
- *openAIP o un file di spazi aerei incluso*: licenza non commerciale o
  da chiarire (studio di TASK-305), e MuW diventerebbe distributore di
  dati di sicurezza; l'utente valuterà gli accordi più avanti.
- *Open-Meteo o Windy per il meteo*: gratuiti solo per uso non
  commerciale o a pagamento; DWD ed ECMWF sono CC BY 4.0.
- *Barometro e fotocamera subito*: dipendenze e build nativa prima della
  1.1; l'utente li vuole dopo.
- *Una libreria QR o 3D*: niente librerie nuove; MapLibre fa già il 3D.

**Conseguenze**: nove parti, ognuna un branch e una PR «pronta» al
Coordinatore, con schermate dal simulatore e testi in 5 lingue approvati
dall'utente. Server, OTA, sito e store solo col sì dell'utente o del
Coordinatore; prima della pubblicazione una prova con un pilota vero.
ADR-0265 (il pianificatore nel cono) resta Proposta. Dettagli in
`tasks/TASK-479.md`.

**Aggiunta del 2026-11-22 (parte C, deciso dall'agente su delega
dell'utente)**: il vario sonoro suona file, non sintesi: 15 loop WAV fatti
da `tools/vario_tones.py` (un gradino di salita ogni 0,5 m/s, uno di
discesa ogni 1 m/s), un player in loop per tono; il suono appartiene alla
registrazione e non alla schermata di volo, così suona anche a schermata
chiusa; nessun tocco ad `app.json`. Acceso di default: scelta dell'utente.

**Aggiunta del 2026-11-23 (parte A1, deciso dall'agente su delega
dell'utente)**: la mappa di volo è una pagina MapLibre sua in `src/air/`,
non la mappa dell'app (che resta intatta); in 3D la camera punta al
terreno sotto il pilota (`setCenterElevation`). La quota sul terreno si
legge dalle stesse Terrain Tiles «terrarium» della mappa 3D, decodificate
su un canvas in una pagina nascosta: nessuna libreria, nessun server. I
colori del vario sono `vario` in `tokens.ts`.

**Aggiunta del 2026-11-23 (parti E1 ed E2, deciso dall'agente su delega
dell'utente)**: la parte E è divisa in E1 (il file), E2 (in volo), E3
(dopo il volo), col sì del Coordinatore. Il file OpenAir resta sul
telefono (`airspace.json`), uno alla volta, e non va mai al server. La
vicinanza si calcola sul telefono a ogni secondo; i limiti FL dalla quota
GPS con l'atmosfera standard, segnati «≈»; un volume di quota ignota
avvisa sulla sola distanza orizzontale. Il suono d'avviso è un file nostro
(`alert.wav`, da `tools/vario_tones.py`). I volumi sulla mappa usano i
colori `error` e `warning` della tavolozza: nessun colore nuovo.

**Aggiunta del 2026-11-23 (parte E3, deciso dall'agente su delega
dell'utente)**: il registro degli spazi aerei dopo il volo si calcola sul
telefono e resta lì, mai al server né nel Feed. Dopo il volo i limiti dal
terreno contano come rispettati e il tratto è segnato «≈»: la quota sul
terreno sotto ogni punto non c'è. Nel grafico della quota le fasce dei
volumi usano i colori `error` e `warning` della tavolozza.

## ADR-0394 — La scheda della palestra come post: un disegno senza corsa con la fotografia della scheda, solo alle app che dicono `plans`

**Stato**: Attiva (A e B in `main`, A sul server, 2026-11-23) · 2026-11-21 · TASK-485 parte 0 (numero dal
Coordinatore). Che cosa mostra, che cosa copia «Use this plan» (kg
compresi), che il post non segue la scheda, testi e riga di privacy:
**scelte dell'utente** del 2026-11-21 («Riquadro + dettaglio», «Anche i
kg», «No, resta com'era», «Approvo»), con la voce, la riga sotto e
«Everyone» già scelte in TASK-481 (ADR-0390). Il modo è **deciso
dall'agente su delega dell'utente**, da verificare in ogni parte con la
lista dei file approvata dal Coordinatore.

**Contesto**: «Workout plan» è la sesta voce del foglio «Add to Feed»
(ADR-0390). Una scheda (`gym_plans`, ADR-0341, ADR-0360, ADR-0371) oggi la
vede solo il suo autore; dopo TASK-312 C1 (ADR-0272 precisazione C) un
disegno senza corsa ha già autore, chiave del telefono, reazioni,
commenti, segnalazioni, blocchi e nascosti.

**Decisione**:

1. **Un disegno senza corsa**, come il post di sole foto: `run_id` vuoto,
   `key` del telefono, autore in `drawings.user_id`, mai «Only me», nessuna
   traccia, pubblicato alla creazione, niente foto. Chi parte da `runs`
   non lo vede mai.
2. **La fotografia della scheda in `drawings.plan`** (JSONB, migrazione
   provvisoria `0084_plan_posts.sql`): con `plan` è una scheda pubblicata,
   senza è un post di sole foto; `plan` solo senza corsa. Nessun legame con
   la riga di `gym_plans`: cambiare o cancellare la scheda non tocca il
   post (scelta dell'utente).
3. **Che cosa c'è nella fotografia**: nome, giorni, esercizi coi kg e il
   programma (obiettivo, settimane, modo, passo, recupero, allenamenti,
   settimane scritte a mano, la meta senza data), validati dai modelli di
   `gym_plans.py`. Il server rifiuta `runner` (i ritmi dell'autore) e non
   tiene `starts_on`: la privacy nomina solo nome, obiettivo, giorni,
   settimane, esercizi e kg.
4. **Rotte `/me/plan-posts/{key}`** (`PUT`, `GET`, `DELETE`), come quelle
   delle foto; il Feed e il dettaglio lo danno con `source: "plan"` e il
   campo `plan`.
5. **Solo alle app che dicono `plans` in `X-MuW-Reads`**:
   `Reads.drawings_sql()` separa sole foto (`photos`) e schede (`plans`).
   Il server esce prima dell'app senza cambiare niente di quello che si
   vede.
6. **«Use this plan» non ha rotte nuove**: il telefono fa una scheda nuova
   (chiave nuova) dalla fotografia, coi kg, senza ritmi (se ci sono corse
   la guida chiede «How do you run today?») e con la meta «quando sono
   pronto»; l'ultimo passo della guida (nome, primo giorno), poi
   `PUT /me/gym-plans/{key}`, che tiene già il limite di 20.

**Alternative scartate**: il post che punta alla scheda dell'autore
(cambierebbe e sparirebbe con lei); una tabella `plan_posts` a sé
(reazioni, commenti, segnalazioni da rifare); una corsa finta di palestra
(ogni lettore di `runs` da filtrare); copiare anche ritmi e data della
meta (sono dell'autore).

**Conseguenze**: come i post di sole foto, una scheda pubblicata per ora
non si cerca, non ha link pubblico e non va in chat. Prima il server (col
passo del Coordinatore e il sì dell'utente), dopo TASK-467 E che tocca
`reads.py` e `drawings.py`; poi l'app con la riga di privacy approvata, in
coda dopo TASK-481 A. Il comportamento andrà in `docs/sports/gym.md`, il
contratto in `API.md`, la colonna in `DATABASE.md`. TASK-466 E (la
routine di stretching pubblicata) può usare lo stesso modo con un tipo suo.

## ADR-0395 — La palestra scritta a mano: lo stesso `PUT /me/gym-sessions` con `source` `manual`, l'editor delle schede, fuori anche dai livelli

**Stato**: Attiva · 2026-11-24 (TASK-484 Done: B #1489, privacy #1505, OTA 25) · proposta 2026-11-21 · TASK-484 parte 0 (solo documenti).
L'editor, che cosa conta, i testi e le righe della privacy sono **scelte
dell'utente** (2026-11-21, una domanda per volta); la rotta, il valore di
`source`, i controlli dell'API e il giorno senza calendario nativo sono
**decisi dall'agente su delega dell'utente**; numero dal Coordinatore.
Applica ADR-0390 (la voce «Gym workout», «Everyone») e ADR-0272 (le
attività importate) alla palestra (ADR-0327).

**Contesto**: ADR-0390 vuole nel «+» del Feed un allenamento in palestra già
fatto, scritto a mano, con «Imported». La proposta di partenza diceva
`PUT /me/activities/{key}`, ma la palestra si salva già con
`PUT /me/gym-sessions/{key}`: una riga di `runs` con `activity = 'gym'` e
senza traccia, le serie in `gym_sets` con `live`. `runs.source` vale `muw`
o `file` (0034); classifica della palestra, badge, concorso e gioco
leggono solo `muw`, i livelli leggono tutto. Le app di oggi mostrano
«Imported» per ogni `source` diverso da `muw`.

**Decisione dell'utente**:
1. si scrive con **l'editor delle schede** (`SessionEditor`): una riga per
   esercizio, serie × ripetizioni o tempo, un valore per tutte le serie;
   «From a plan» parte dagli esercizi di una propria scheda; sopra giorno,
   ora d'inizio e durata, sotto il post della palestra con «Imported»;
2. conta **come le importate**: Feed, «My activities», calendario, kcal
   dalla durata; fuori da gioco, concorso, badge, classifica, **livelli**
   («New level»), Apple Salute e Health Connect, e dal giorno della scheda;
3. i testi «Gym workout», «Day», «Started», «Duration», «From a plan»,
   «Workouts written by hand don't count for Play, contests, levels or the
   leaderboard.», «Pick a time before now.»;
4. la privacy: una riga nuova («If you add a gym workout written by hand,
   we keep its day, time, duration, exercises, sets and weights like a
   workout recorded with MuW.»), i livelli contati «from the workouts you
   record with MuW», e l'eccezione «Everyone» del «+» che nomina anche la
   palestra scritta a mano (testi interi in `tasks/TASK-484.md`).

**Decisione dell'agente**:
1. **Stessa rotta, un campo**: `source` in `GymSessionRequestBody`, `muw`
   per difetto o `manual`, salvato in `runs.source`. Nessuna tabella e
   nessuna rotta nuove: Feed, «My activities», calendario, reazioni,
   commenti, segnalazioni, chiave del telefono e coda senza rete valgono
   come oggi.
2. **`manual`, non `file`**: una corsa da file ha traccia e orari di
   un'altra app, uno scritto a mano no. La migrazione allarga il `CHECK` a
   `('muw', 'file', 'manual')`; `RunSource` lo legge anche nelle risposte;
   `PUT /me/activities` rifiuta `manual`.
3. **L'API controlla la forma** (422): serie tutte `live: false`, nessuna
   pausa né recupero, `plan` vuoto, fine non dopo adesso. Il segno lo manda
   l'app: non è una prova, come per i file (ADR-0272 punto 2).
4. **I livelli leggono solo `muw`** (`gym_levels.py`, profilo e
   `new_levels`); gli altri lettori lo fanno già.
5. **Nessun tipo nuovo in `X-MuW-Reads`**: le app vecchie vedono un
   allenamento della palestra con «Imported».
6. **Sul telefono** ogni riga diventa tante serie uguali, con `at_s` a
   passo uguale dentro la durata; il giorno con «‹ ›» e ora e durata
   scritte, senza un calendario nativo: impronta iOS invariata, un OTA.

**Alternative scartate**: serie per serie come le correzioni dopo «Stop»;
le righe che si aprono serie per serie; contare per i livelli, o anche per
il giorno della scheda; `source` `file`; `PUT /me/activities` senza
traccia per la palestra; una rotta o una tabella a sé; un tipo in
`X-MuW-Reads`; la frase di oggi delle importate sotto «Imported»; solo la
riga nuova nella privacy.

**Conseguenze**: una migrazione e un passo sul server col sì dell'utente,
prima dell'app. La parte B aggiunge la sua riga in `addToFeedEntries.ts`
dopo TASK-481 A, testi in cinque lingue e la privacy a turno. Un
allenamento scritto a mano non si corregge dopo «Save»: si cancella e si
riscrive.

## ADR-0390 — Il «+» del Feed per pubblicare tutto: una lista di sei voci, ognuna del suo task

**Stato**: Attiva · 2026-11-21 · TASK-481 parte 0 (solo documenti); la
lista nell'app in `main` dal 2026-11-23 (parte A, precisazione A).
Le voci, l'ordine, i testi, «niente Soon», chi vede che cosa e la frase
della privacy sono **scelte dell'utente** (2026-11-21, una domanda per
volta); la lista prima del flusso e il file delle voci sono decisi
dall'agente su delega dell'utente; numero dal Coordinatore. Estende
ADR-0387, non lo sostituisce.

**Contesto**: il «+» del Feed (TASK-476, ADR-0387) apre un foglio «Add
activity» con la sola voce «From a file». L'utente, il 21 novembre: un «+»
per pubblicare il sonno, una corsa, un'immagine, un'attività, da Strava, un
post di Instagram, un allenamento in palestra, una scheda di allenamento.
Ogni cosa ha già, o avrà, un task che la possiede (TASK-312 C2 le foto,
TASK-467 il sonno), e Strava e Instagram non si possono collegare
(ADR-0272).

**Decisione**:
- **Il foglio diventa «Add to Feed»** e si apre su una **lista**: «Record
  now», «Photos only», «From a file», «Sleep», «Gym workout», «Workout
  plan», in quest'ordine, ognuna con una riga sotto (testi in
  `tasks/TASK-481.md`). Una voce apre il suo flusso nello stesso foglio,
  con «‹» per tornare. Le voci stanno in un file a sé, così un task porta
  la sua senza riscrivere il foglio.
- **Una voce compare solo quando è pronta**, niente «Soon» (come in
  ADR-0387). Il «+» c'è con un account anche senza il selettore di file,
  perché «Record now» c'è sempre.
- **Ogni voce la costruisce il suo task**: «Record now» TASK-481 A (apre
  la registrazione di oggi); «Photos only» TASK-312 C2; «From a file» c'è
  (TASK-476); «Sleep» TASK-467 E; «Gym workout» (un allenamento in palestra
  già fatto, scritto a mano, con «Imported») TASK-484 e «Workout plan»
  (una scheda della palestra come post, copiabile con «Use this plan»)
  TASK-485.
- **Chi lo vede**: «Record now» come ogni corsa (ADR-0304); «Photos only»
  l'ultima scelta (TASK-312 C); «From a file» «Everyone» (ADR-0387);
  «Sleep» come gli altri post (TASK-467); «Gym workout» e «Workout plan»
  **«Everyone»**, visibile e cambiabile prima di salvare: altre due
  eccezioni ad ADR-0304, una per ingresso. Ogni tipo nuovo ha la sua riga
  di privacy approvata nel suo task.
- **La privacy di oggi si precisa** con la parte A: «An activity you add
  from a file with the «+» of the Feed…» (approvato dall'utente), perché
  una corsa registrata dal «+» segue le regole di sempre.

**Alternative scartate**: cinque voci senza «Record now»; «Gym workout»
che avvia la palestra adesso, o nessuna voce per la palestra; la scheda
solo da vedere; la routine di stretching dentro «Workout plan»; voci non
pronte grigie con «Soon»; tutto «Everyone» dal «+», o tutto dall'ultima
scelta; i titoli «Add activity» e «New post».

**Conseguenze**: il foglio cresce a ogni uscita senza promettere niente.
`AddToFeed.tsx` è toccato da TASK-312 C2 e poi da TASK-481 A: A parte dopo
il merge di C2. I task di «Gym workout» e «Workout plan» chiedono server,
migrazione e privacy, ognuno col suo sì. Strava resta il file esportato (e
«Open in MuW», nativo, dopo la 1.1); Instagram la foto dalla galleria.

## ADR-0272, precisazione C — Il post di sole foto è un disegno senza corsa: l'autore in `drawings.user_id`, la chiave del telefono, pubblicato con la prima foto, solo alle app che dicono `photos`

**Stato**: Attiva · 2026-11-21 · TASK-312 parte C1 (#1347 in `main`,
`cfd5e956`; migrazione `0080_photo_posts.sql`). Post di sole foto, «Only
me» assente, «Imported», fuori da gioco e concorso: **scelte dell'utente**
(2026-10-27/28). Testi «Up to 10 photos, also from Instagram», partenza
dall'ultima scelta e riga della privacy: **scelte dell'utente** del
2026-11-21. Il modo è **deciso dall'agente su delega dell'utente**, con le
liste dei file approvate dal Coordinatore.

**Contesto**: il punto 6 di ADR-0272 proponeva un disegno senza corsa, da
verificare sul codice. Le query che leggono l'autore con `JOIN runs` sono
51, in 36 moduli.

**Decisione**:

1. **Un disegno senza corsa**, non una corsa finta: chi parte da `runs`
   (totali, record, calendario, gioco, badge, sport, concorso, «My
   activities») non lo vede mai, senza un filtro per lettore.
2. **`drawings.user_id`**, riempito da `runs` per le righe di prima:
   `drawing_seen_sql` e `shown_sql` leggono lì l'autore, così blocchi,
   nascosti, «Followers», commenti, reazioni, segnalazioni, push,
   campanello ed email valgono senza regole nuove. Cambiano solo i
   lettori che partono da un disegno (`LEFT JOIN runs` o `d.user_id`).
3. **Il telefono fa la chiave** (`drawings.key`, unica per account), come
   per una corsa: `PUT /me/photo-posts/{key}` rimandato senza rete resta
   un post. Foto (1–10, nessuna mappa) e ordine con lo stesso codice dei
   disegni.
4. **Pubblicato con la prima foto**: `published_at` vuoto finché non ce
   n'è una, e di nuovo vuoto senza foto. I taggati ricevono la push quando
   è pubblicato. Il vincolo di 0014 fra `visibility` e `published_at` vale
   solo con una corsa; `drawing_seen_sql` e `shown_sql` per gli altri
   vogliono `published_at`.
5. **Solo le app che dicono `photos` in `X-MuW-Reads`** lo ricevono
   (`Reads.drawings_sql()`): il server esce prima dell'app senza cambiare
   niente di quello che si vede.
6. **Nelle risposte** `source: "photos"`, `activity` e i campi della corsa
   `null`, 0 metri e 0 secondi, `started_at` la pubblicazione. In
   `shared-types` solo tipi nuovi (`PhotoDrawing`, `PhotoFeedPost`,
   `PhotoDrawingDetail`, `isPhotoPost`).

**Alternative scartate**: `runs.source = 'photos'` (ogni lettore di
`runs` da filtrare, e «My activities» lo mostrerebbe); una tabella a sé
(reazioni, commenti, segnalazioni da rifare); creare il post con le foto
in una sola richiesta (la coda del telefono manda una foto alla volta).

**Conseguenze**: per ora un post di sole foto non si trova con la ricerca
dei disegni, non ha link pubblico e non si manda in chat: partono tutti da
una corsa, e sono dopo, se l'utente li vuole. Il ritorno indietro del solo
codice vuole prima `user_id` senza `NOT NULL`. Il server col passo del
Coordinatore e il sì dell'utente; poi C2 (l'app) con la riga della privacy
approvata.

## ADR-0380, precisazione B3 — La scheda «Sleep» del profilo: quale notte è sul profilo lo dice il server, niente lascia il telefono prima di «Share», «Stop sharing» toglie ogni notte

**Stato**: Attiva · 2026-11-12 · TASK-467 parte B3 (#1292, `b6e36fcb`).
Le scelte di prodotto sono dell'utente (risposte 8 e 9 del task file:
«Pulsante + riga», «Col giorno»); le altre sono **decise dall'agente su
delega dell'utente**; lista dei file approvata dal Coordinatore. Nessun
codice sul server, nessuna migrazione, niente di nativo.

**Contesto**: l'ADR-0380 mette sul server la notte condivisa nel profilo
(`shared`) con le sue rotte; restava come l'app la mostra e la condivide.

1. **Quale notte è sul profilo lo dice il server, non il telefono**: la
   scheda chiede `GET /users/{il proprio id}/sleep` e confronta il giorno
   con la notte letta da Salute. Vale anche da un altro telefono, e la
   domanda non porta nessun dato del sonno. Parte solo col sì a leggere il
   sonno già tenuto.
2. **Niente lascia il telefono prima di «Share»**: al server vanno solo
   punteggio, minuti e fasi, e il giorno nel percorso. Mai gli orari.
3. **«Stop sharing» toglie ogni notte dal profilo** (`DELETE
   /me/sleep/shared`): spegnere la sola ultima farebbe ricomparire quella
   prima. Una notte che nessun post porta sparisce così anche dal server.
4. **La conferma del primo «Share» è del telefono** (`sleep-share.json`),
   come la domanda del VO₂ max.
5. **La notte condivisa non si aggiorna da sola**: se Salute cambia i
   numeri dopo «Share», sul profilo restano quelli condivisi finché non si
   condivide di nuovo. Nessun invio senza un tocco.
6. **«Stop sharing» ha una chiave sua** (`Stop sharing@@sleep`): quella
   della live è tradotta «Smetti», che qui non dice che cosa.
7. **Spenta come B2**: `OwnSleep` niente senza `sleepPostsOn()` o senza
   lettore, `UserSleep` niente e nessuna richiesta senza `sleepPostsOn()`;
   i test confrontano l'albero intero delle due schermate acceso e spento.

**Conseguenze**: accendere resta un cambio solo, quello della parte C. Il
post nel Feed di una notte da sola resta fuori (TASK-312 C).

## ADR-0381, precisazione B2b — Programmare e chiudere una live dall'app: il foglio senza dipendenze, la domanda all'avvio, la push che apre la live, il post legato dalla coda

**Stato**: Attiva · 2026-11-21 · TASK-468 parti B2b1 (#1322) e B2b2
(#1331). **Deciso dall'agente su delega dell'utente** (la tecnica; testi e
aspetto approvati dall'utente).

- Giorno e ora con − e + (15 minuti, da adesso a 60 giorni): nessun
  selettore di date, nessuna dipendenza nuova.
- La domanda «Start live "…"?» parte alla fine del conto alla rovescia
  (`usePlannedStart`, una riga in `FreeRunScreen.tsx` accanto a
  `useStartLiveAtStart`), solo con una propria programmata nelle sue ore.
- La push `planned_live_started` apre la schermata dal vivo da qualunque
  pagina: `liveViewDoor` (un piccolo store fuori da React) e `LiveViewHost`
  montato da `ProfileLayer`, dove si aprono le push.
- Il post di una corsa appena salvata passa dalla coda dei post
  (`drawingOutbox.sendWaitingDrawings`), non da `drawingsDoor.choose`
  (che modifica un post già fatto): lì, dopo il «Post» detto a fine corsa e
  per un post che altri vedono, `PUT /me/planned-lives/{id}/post`, una
  volta. Il modulo di `RunEnd` si ridisegna con una `key` perché tiene il
  titolo in uno stato suo.

## ADR-0366, precisazione — Le uscite in bici nel catalogo: `activity` solo quando non è una corsa, le uscite in fondo al file di città, il parametro `activity`, le zone da un estratto, entrano le otto forme lette a occhio

**Stato**: Attiva · 2026-11-18 · TASK-441, parte B2 (#1317 il server,
`ee9f143c`; #1248 l'app, in bozza fino al passo sul server). Le scelte di
prodotto sono dell'utente: «Sì, così» (solo bici, 20–30 km senza toccare il
motore; canoa e nuoto fuori dal catalogo; le uscite si vedono con lo sport
«Bike»), «Aspetta il principale» (niente specchi di Overpass), «Osmium sul
Mac», «Le otto forme». Le altre sono **decise dall'agente su delega
dell'utente**.

**Contesto**: il catalogo aveva solo percorsi a piedi fino a 21 km; il
motore disegna in bici da 10 a 30 km. Ogni lettore del catalogo (le liste,
«Recommended», le app già installate) dava per scontato che un percorso
fosse una corsa, e l'id di un percorso è il suo posto nel file di città.

**Decisione**:

1. **`activity` nel seme solo quando non è una corsa** (`"cycling"`); una
   corsa non ha il campo e il suo testo nel file non cambia.
2. **Le uscite in fondo al file di città**, dopo ogni corsa
   (`catalog_seed.city_files`): una corsa tiene il posto, quindi l'id. I
   preferiti, i disegni di «Feed» e i link che puntano a un id restano
   validi.
3. **Il parametro `activity`** su `GET /recommended-routes` e `GET
   /catalog`: senza, le corse. `RecommendedCatalog.routes` resta «solo le
   corse», le altre stanno in `others`: `best_routes.py` e ogni lista che
   non chiede non vedono mai una bici. Nella risposta `activity` manca,
   non è `null`, per una corsa (come `walks` e `gaps`).
4. **L'app chiede `activity=cycling` solo con lo sport «Bike»**
   (`CATALOG_ACTIVITIES`); ogni altro sport chiede come prima. Un server di
   prima ignora il parametro e risponde con le corse: **il server può
   uscire prima dell'app**, al contrario della B1.
5. **Chiave `città/forma@cycling/distanza`** e registro a parte
   (`out/TASK-441/bike.jsonl`), filtro di `catalog_seed.reasons` com'è. Una
   distanza a forma fra 30, 25 e 20 km a turno.
6. **Le zone della bici da un estratto, non da Overpass**: è già la regola
   del progetto (ADR-0153, `MAPS.md`); `catalog_bike.py --extract` ritaglia
   la zona che manca con `zone_extract.zone_from_extract`, non modificato.
   Sul Mac: `osmium-tool` da Homebrew (sì dell'utente), l'estratto d'Italia
   di Geofabrik filtrato una volta alle strade. Una città alla volta, mai
   con un simulatore acceso; limiti del Coordinatore: 4 GB per il ritaglio,
   2 GB per il pianificatore (4 GB nelle nove città grandi).
7. **Il filtro non basta, si legge a occhio** anche per le forme: delle
   dodici provate entrano le otto che si leggono (`READS`: cuore, stella,
   farfalla, gatto, sole, cerchio, luna, pesce). Le altre quattro non si
   disegnano più.

**Motivo**: la chiocciola e la testa di cane passano il filtro a 0,95 e a
20–30 km sono un groviglio; cavallo e smiley si leggono solo ai valori più
alti, e una soglia non li separa dagli altri. Mettere le uscite in fondo e
lasciare `routes` alle corse costa una riga per lettore nuovo e zero per
quelli che c'erano. L'aver chiesto le zone a Overpass all'inizio è stato un
errore dell'agente: cinque giorni di attesa per tre città.

**Conseguenze**: 31 città italiane, 372 disegni provati, 239 passano il
filtro, **148 entrano** (54 da 20 km, 49 da 25, 45 da 30) in 29 città;
Venezia e Levico non ne hanno. Il catalogo va a **1694 percorsi**: 28 MB di
file, +26 MB residenti; 34 file di città identici byte per byte, nei 29
cambiati il testo di prima è l'inizio del nuovo. Il ritaglio di osmium
vuole circa 3,7 GB per uno o due secondi qualunque sia l'estratto; Roma è
l'unica dove il pianificatore arriva a 4 GB. Le 32 città estere vogliono un
estratto per paese: un secondo giro. `tools/sample_feed.py` legge tutto il
seme e, rilanciato, prenderebbe uscite in bici come corse di esempio:
segnalato al Coordinatore, non toccato. I 40–50 km (B3) vogliono il limite
del motore alzato: una PR a parte.

## ADR-0381, precisazione A2b — La push «Remind me» parte con la live, una volta sola, senza giro

**Stato**: Attiva · 2026-11-18 · TASK-468 parte A2b (#1299).
**Deciso dall'agente su delega dell'utente.**

- La push parte dentro `POST /me/planned-lives/{id}/start`, dopo la
  scrittura, e solo se non c'era già una condivisione con quel
  `planned_live_id`: una ripartenza dopo uno stop non la ripete. Nessun
  giro periodico e nessuna migrazione.
- La ricevono solo i promemoria di chi vede ancora la live (`apart_sql`, e
  `follows_sql` per una «followers»), mai il proprietario; i dati
  `{kind, planned_live_id, share_id}` aprono la schermata dal vivo (B2b1).

## ADR-0381, precisazione B2a — La fila «Live» del Feed: schede una sopra l'altra, riletta ogni minuto, «Live in the Feed» senza link

**Stato**: Attiva · 2026-11-18 · TASK-468 parte B2a (#1301).
**Deciso dall'agente su delega dell'utente** (la tecnica; testi e aspetto
approvati dall'utente).

- Al più 5 schede una sopra l'altra: una fila che scorre di lato
  litigherebbe con lo scorrimento fra le schede del Feed. `GET /lives`
  ogni minuto; «Remind me» cambia subito e torna indietro se l'API dice no.
- «Live in the Feed» crea la condivisione senza link col pubblico scelto, o
  la cambia (`PATCH`) se è già accesa; nessun foglio delle persone.
- I test che contano le richieste del Feed escludono `/lives`, come già il
  concorso e Style.

## ADR-0342, precisazione B e C — Le ciaspole nell'app: `isPlacedFree` dove la neve fa come l'acqua, nessun disegno a mano sulla neve, «Record your day» dentro le ciaspole, il conteggio anche nei job

**Stato**: Attiva · 2026-11-12 · TASK-413 B e C (#1280, `335f75f5`),
correzione della A3 (#1266, `b079f067`), accensione (#1296, `ba569576`).
Le scelte di prodotto sono dell'utente (testi «Sì, vanno bene», «Dentro le
ciaspole», «Sì, accendi»); le altre sono **decise dall'agente su delega
dell'utente**, con la lista dei file approvata dal Coordinatore.

1. **`isPlacedFree`** (`src/snow/snow.ts`) vale per l'acqua e per la neve,
   e sta dove la neve fa come l'acqua:
   - pezzi a penna alzata, senza interruttore della penna;
   - nessun «Move» del punto di partenza;
   - nessuna indicazione, né sul telefono né sull'orologio.

   `isOnWater` non si allarga: gli esempi, i posti e gli avvisi dell'acqua
   restano suoi. Un test dice che per ogni attività tranne le ciaspole
   `isPlacedFree` vale quanto `isOnWater`. Il predicato della sola neve è
   `isSnowshoeRoute`, per non confonderlo con `activities/snow.ts`
   `isOnSnow`, che dice una giornata registrata senza forma.
2. **Nessun disegno a mano sulla neve**: il motore lo rifiuta
   (`ON_SNOW_SHAPES_ONLY`). `sportDraw.drawsByHand` decide insieme
   «Freehand» in «Draw» ed «Edit the drawing» sotto il percorso. Lo ha
   trovato il controllo al simulatore.
3. **Nessun tempo sotto la distanza** (`timeAt` assente): il passo di chi
   cammina, sulla neve, prometterebbe meno tempo di quello reale.
4. **«Record your day» dentro le ciaspole** (parte C, «Dentro le
   ciaspole», contro una riga «Snowshoe day» a sé):
   - il bottone in alto di «Draw» è «Record your day» ❄️, al posto di
     «Snowshoe without a route»;
   - l'uscita si salva come `snowshoeing`: niente attività nuova, niente
     migrazione, niente passo sul server;
   - alla fine c'è «Your day» con i numeri del fondo (`SnowFinishCard`) e
     la riga «White: where you walked.».
5. **L'avviso valanghe** (`snow/safetyNotice.ts`, file `snow-notice.json`)
   compare al primo «Start» sulla neve: una forma, «Record your day» o un
   disegno del Feed. In `App.tsx` lo sceglie `noticeOf(activity)`, insieme
   a quelli della canoa e del nuoto.
6. **Il conteggio degli edifici passa anche dai job** (#1266).
   `jobs._ReportingSnow` non aveva `buildings`, e su `/route-jobs` il
   motore non contava mai: è quello che chiedono l'app e i processi caldi.
   Ora lo passa alla sorgente, o dà None se la sorgente non sa contare. Un
   test chiede una città via `/route-jobs`. Al passo 12 (2026-11-12):
   - Milano: 16170 edifici, rifiutata in circa 1,1 s;
   - Trento: 8091 edifici, rifiutata in 0,65–1,1 s.
7. **Privacy**: il server prende le quote da Amazon Web Services. La riga
   è nella #1281, in cinque lingue, col sì dell'utente.

**Conseguenze**: un altro sport piazzato libero userà `isPlacedFree` e
`drawsByHand`, invece di nuovi `isOnWater` sparsi. Il criterio B del task
(l'uscita va in Salute) si chiude dopo la prova sul telefono con l'OTA.

## ADR-0387 — Il «+» del Feed: un'attività aggiunta da lì parte con «Everyone», eccezione ad ADR-0304

**Stato**: Attiva · 2026-11-12 · TASK-476 (#1284 in `main`, `bf049887`).
Il «+», il suo posto, la sua sola voce e «Everyone» sono **scelte
dell'utente**; il modo è deciso dall'agente su delega dell'utente, numero
dal Coordinatore.

**Contesto**: l'utente ha chiesto nel Feed, che è la home, «un tasto +
per poter caricare un'attività manualmente da fuori o dall'app o da
un'altra app». L'import da file c'era già, in «My activities» (TASK-312
B, ADR-0272), e una corsa importata partiva sempre «Only me»: aggiunta
dal Feed, nel Feed non sarebbe comparsa. ADR-0304 dice che nessuno è
pubblico senza averlo scelto, e la privacy lo prometteva.

**Decisione**:
- **Il «+» a destra delle schede del Feed**, solo con un account e in una
  build col selettore di file; apre il foglio «Add activity» con **solo
  «From a file»** (scelta dell'utente: «Solo From a file»; le altre voci
  quando sono pronte, senza «Soon»). Il foglio riusa «Add past activity»
  con due props (`opened`, `onDone`), senza toccare «My activities».
- **Da lì parte «Everyone»** (l'utente: «Sì, Everyone», poi al
  Coordinatore «Everyone + privacy»): `imported.visibility` facoltativo in
  `RunEnd`. «Everyone» si vede scelto, la frase «Every member sees it in
  your profile.» sta anche sopra «Save», e si cambia prima di salvare. In
  «My activities» resta «Only me».
- **La privacy lo dice prima che esca**: nelle cinque lingue (privacy e
  aiuto) e sulle cinque pagine del sito, testo approvato dall'utente
  («Approvo il testo»), data 12 novembre 2026; campo e frase entrati
  insieme.

**Alternative scartate**: «Only me» con il selettore ben in vista sopra
«Save» (proposta del Coordinatore, non scelta dall'utente); «Record now»
o l'inserimento a mano nella prima versione (l'utente ha scelto il solo
file).

**Conseguenze**: un GPX caricato dal Feed spesso parte dalla porta di
casa: la frase sopra «Save» e la privacy lo dicono, il resto delle regole
di ADR-0304 non cambia. Esce col prossimo OTA, poi la copia del sito (sì
dell'utente al Coordinatore). Proposte per dopo nel task file: «Photos
only» (TASK-312 C), «Apri in MuW» da altre app, Apple Salute, inserimento
a mano, collegamenti diretti.

## ADR-0375, precisazione R6 — Corsa e volo nella stessa attività (hike & fly)

**Stato**: Attiva · 2026-11-18 · TASK-305 parte R6 (#1291 server, #1293
app; R6c #1313 in bozza). **Scelte dell'utente** (2026-11-12): «Dentro
Paragliding», niente sport nuovo; i testi in cinque lingue. Il resto è
**deciso dall'agente su delega dell'utente**, con le liste dei file
approvate dal Coordinatore.

1. **La divisione la fa il telefono, dal solo GPS** (`src/air/flightParts.ts`,
   una funzione pura).
   - Decollo: per almeno 15 s |vario| > 1,5 m/s, oppure per almeno 20 s
     più di 25 km/h.
   - Atterraggio: per almeno 60 s meno di 9 km/h e |vario| < 0,7 m/s. Il
     minuto serve per non scambiare un volo fermo controvento.
   - Un tratto sotto il minuto si unisce al vicino.
2. **La correzione a mano** («On foot | In the air») vale da quel momento.
   Il GPS torna a contare solo quando smette di vedere il suo cambio. Un
   tocco entro 5 minuti da un cambio del GPS lo annulla dall'inizio: è il
   caso della navetta del recupero. I tocchi restano sul telefono legati
   al volo.
3. **Il server tiene i tratti solo per il volo**, nel JSON di
   `run_stats.stats`, quindi **nessuna migrazione**; per gli altri sport li
   ignora. Somma i due tipi in `flight_split` solo se ci sono tutti e due,
   e lo dà in ogni lista di post.
4. **Le calorie tratto per tratto**: a piedi come corsa sotto i 7:30 /km,
   altrimenti come escursione; in aria col MET del volo. La velocità
   massima di una gara conta solo i tratti in aria.
5. **Tempi in millisecondi interi**: i fix del telefono hanno i decimali e
   il server vuole interi. Trovato nel simulatore; lo stesso difetto
   c'era nei tratti dello sci (#1304).
6. **Prima il server, poi l'app**: su 422 l'app rimanda le statistiche
   senza i tratti.

## ADR-0375, precisazione R5 — Sotto «Record your flight»: i record del volo, i voli del mese, pronto al decollo

**Stato**: Attiva · 2026-11-12 · TASK-305 parte R5 (#1258 server, #1260
app). **Scelte dell'utente** (2026-11-12): fra quattro proposte «I tuoi
voli», «Record personali» e «Pronto al decollo»; testi approvati nelle
cinque lingue. Il resto è **deciso dall'agente su delega dell'utente**,
con le liste dei file approvate dal Coordinatore.

1. **I record del volo vengono dal server.** Quota massima e velocità
   massima il server non le aveva: il profilo è ridotto a 120 punti e la
   velocità non c'era.
   - Il telefono le manda a fine volo (`max_alt_m`, `top_speed_mps`) con
     `PUT …/stats`.
   - Il server le tiene nel JSON di `run_stats.stats`, quindi **nessuna
     migrazione**, e **solo per il volo**: per gli altri sport le ignora
     invece di rifiutarle.
2. **`GET /me/flight-bests`** sta nel router di `run_stats`, così `app.py`
   non si tocca. Dà il più alto, il più lungo, il più lontano e il più
   veloce.
   - Solo del proprietario.
   - A parità vince il primo volato.
   - Un volo cancellato porta via i suoi record.
3. **«Your flights»** usa il calendario di TASK-462 filtrato sui voli: per
   aprirlo filtrato, un prop `sport` opzionale in `ActivityCalendarSheet`.
4. **«Ready to fly»** legge solo l'errore del GPS (pronto fino a 10 m),
   finché «Draw» è aperto; la posizione non esce dal telefono.
5. **Prima il server, poi l'app**: un server senza R5a rifiuta i due campi
   (422) e l'app rimanda le statistiche senza. L'OTA 16 è uscito prima del
   passo 12: per poco più di un'ora i record sono rimasti nascosti, nessun
   dato perso.

## ADR-0352, precisazione — «Share live at start»

**Stato**: Attiva · 2026-11-12 · TASK-305 parte R5b (#1260). **Scelta
dell'utente** (2026-11-12), con le sue parole «Come l'ultima volta», sulla
proposta del Coordinatore.

ADR-0352 dice che il link dal vivo non si accende mai da solo. Questa
precisazione aggiunge un caso, solo per il volo e solo se è il pilota a
volerlo:

1. Su «Ready to fly» c'è l'interruttore «Share live at start». Parte
   spento; poi **resta com'era l'ultima volta**
   (`flight-live-at-start.json`), e si vede sempre prima di partire.
2. Acceso, **a fine conto alla rovescia di un volo** l'app crea il link e
   apre il foglio di condivisione, come «Share live» a mano. Non lo fa per
   un volo ripreso dopo la chiusura dell'app, né per gli altri sport, né
   senza account.
3. **Solo il link**, mandato a chi vuole il pilota; non va ai pubblici di
   TASK-468. In volo «Sharing live» dice che è acceso.
4. Al primo volo sul telefono il foglio aspetta che «Before you fly» sia
   letto (trovato nel simulatore).

## ADR-0381, precisazione A2a — Le live programmate: il legame va dalla condivisione alla programmata, la fila solo di chi si segue a pagine, montate da `install_live_shares`

**Stato**: Attiva · 2026-11-12 · TASK-468 parte A2a (#1245).
**Deciso dall'agente su delega dell'utente.**

- `live_shares.planned_live_id` → `planned_lives` e non il contrario: i dati
  di `live_shares` restano fuori dalle copie notturne, e una chiave da una
  tabella copiata verso una lasciata fuori ne romperebbe il ripristino.
- La fila (`GET /lives`, scelta 7) unisce le programmate e le live messe nel
  Feed senza programmarle; ordine: in corso prima (l'ultima partita prima),
  poi le programmate (la più vicina prima); cursore `rank_chiave_id`.
- Le rotte stanno in `planned_lives.py`, montato da `install_live_shares`:
  `app.py` e `feed.py` non cambiano. I tipi in `plannedLive.ts`, esportati
  da `liveShare.ts`: `index.ts` non cambia.
- La partenza va da un'ora prima a tre ore dopo; una live fermata per
  sbaglio può ripartire entro quelle ore. Una programmata mai partita esce
  dalla fila tre ore dopo la sua ora.

## ADR-0381, precisazione A1b — La live in un messaggio: un rimando senza chiave esterna, solo in una conversazione aperta, solo per chi dice `live`

**Stato**: Attiva · 2026-11-12 · TASK-468 parte A1b (#1265).
**Deciso dall'agente su delega dell'utente.**

- `messages.live_share_id` senza chiave esterna (le copie tengono
  `messages`, non i dati di `live_shares`); la scheda si legge a ogni
  lettura con `MAY_SEE_SQL`, `null` quando la live non c'è più.
- Come il post (ADR-0382), `live` sta fuori da `MESSAGE_ATTACHMENT_KINDS`:
  lo riceve solo l'app che dice `live` in `X-MuW-Reads`; le altre leggono
  «[Live]».
- «Send in MuW» (`POST /me/live-shares/{id}/send`) manda un messaggio a
  persona con `Messages.send`, e quindi solo dove la conversazione è aperta
  a chi manda: gli altri sono in `skipped`.

## ADR-0381, precisazione B1 — La live in chat nell'app: la condivisione senza link per la chat, il menu di «Sharing live», la schermata dal vivo come `Modal`

**Stato**: Attiva · 2026-11-12 · TASK-468 parte B1 (#1275).
**Deciso dall'agente su delega dell'utente** (la tecnica; testi e aspetto
approvati dall'utente).

- «Send in MuW» crea la condivisione con `link: false`; «Share link» la fa
  dopo, dal menu di «Sharing live». `startLiveShare` resta compatibile
  (`{kind: "started", url}` com'era, in più `started_without_link`).
- La schermata dal vivo è un `Modal` a tutto schermo che chiede ogni 10 s:
  il gesto dal bordo (ADR-0384) non fa nulla, si chiude con «Close»;
  `TabSwipeOwners.test.ts` la ammette come unica mappa fuori da `map/`
  oltre alla tela del disegno.

## ADR-0371 — Il pianificatore completo: almeno due sport per piano, il corpo libero senza kg, i giorni di altri sport in `outing` e la meta in `target`, le settimane verso la meta calcolate sul telefono

**Stato**: Attiva · 2026-11-11 · TASK-461. A1 (#1163) e B1 (#1175, server)
in `main` e sul server (passo 9, 2026-11-12); B2a (#1196) e A2 (#1208,
app) in `main`, A2 esce col prossimo OTA; B2b/C2 (l'app di distanza e
montagna) dopo. Le scelte di prodotto sono dell'utente, una alla volta con
la proposta (2026-11-11: «B, comune a tutti», «Corpo libero», «Sì, quattro
nuovi», «Almeno due, sempre», «Sì, il dislivello», righe E, F, G della tela
«Schede palestra guidate» e i testi «Approvo»; 2026-11-12: «Sì, così» alle
settimane senza kg anche per le schede già fatte, «Approvo» a testi e
schermate della A2). Il modo è deciso dall'agente su delega dell'utente;
numeri dal Coordinatore.

**Contesto**: le schede guidate (ADR-0360, ADR-0363, ADR-0369) erano di
palestra con giorni di corsa. L'utente ha chiesto il corpo libero, la
camminata, la corsa e l'hike, la bici e le gite in montagna nello stesso
pianificatore, e che ogni piano mescoli almeno due sport.

**Decisione**:
- **Un piano nuovo mescola almeno due sport.** «New plan» apre
  «What do you want to train?»: palestra, corpo libero, corsa (distanza e
  montagna dicono «Soon» finché non c'è B2b/C2); con meno di due il tasto
  è spento. Le schede di prima si aprono come prima, senza ingresso.
- **Il corpo libero non cambia il contratto.** Un giorno di corpo libero è
  uno fatto solo di esercizi senza attrezzi della palestra (`bodyweight.ts`),
  «Bodyweight · A» e «· B» in turno; quattro esercizi nuovi
  (`bodyweight_squat`, `glute_bridge`, `superman`, `mountain_climber`)
  vanno prima nel catalogo del server, che rifiuta una chiave che non ha,
  poi nell'app. Nel modo `reps` un esercizio senza kg cresce di una
  ripetizione a settimana (5 s se tenuto), l'ultima settimana del ciclo ha
  una serie in meno, il ciclo dopo riparte da dove è arrivato; vale anche
  per le schede già fatte. Il server non ha copia di questo conto.
- **I giorni di altri sport stanno in `outing`, non in `run`**: sport
  (walk, hike, bike, gravel, mtb, swim, paddle), tipo (easy, intervals,
  long, brisk, climb), distanza o tempo, ripetute, salita a piedi, vasca o
  acque libere. Un'app di prima mostrerebbe un `run` come corsa («Go to the
  run»); un giorno senza `run` e senza esercizi invece lo salta in «Today»
  e nella lista ne dice il nome («Long ride · 30 km»), e salvando di nuovo
  tiene `outing` e `target`. Un giorno fuori è fatto nel calendario da
  un'attività del suo sport (`gym_calendar.py`).
- **La meta è `target` sul programma**: una distanza di uno sport (corsa
  compresa) o la salita di un hike, con una data o «quando sono pronto»;
  solo un piano con `target` supera le 12 settimane, fino a 24.
- **Le settimane verso la meta si calcolano sul telefono**
  (`targetWeeks.ts`), come quelle della palestra: il piano tiene la prima
  settimana. Il lungo (o la salita) arriva alla meta l'ultima settimana, un
  decimo in meno ogni settimana prima, ogni 4ª più leggera; le settimane
  servite sono le meno possibili, almeno 4; oltre 24, o se la data è troppo
  vicina, il piano propone dove si arriva. «Dove sei oggi?» viene dalle
  attività dell'ultimo mese (`outingHistory.ts`).

**Conseguenze**: nessuna migrazione (il programma è già JSONB). Chi resta
su un'app di prima vede i giorni fuori per nome e il giro di ripetizioni
di prima. Partendo da zero la regola del decimo dà piani lunghi (corsa da
2 a 10 km: 23 settimane). La salita di un hike non è nell'elenco delle
attività: finché il server non la dà, l'app la chiede. Il promemoria alle
8 è una notifica locale del telefono (B2b).

**Aggiunta 2026-11-23** (TASK-506 parte B, scelta dell'utente sulla tela
«Schede palestra · migliorie»: «1, 2, 3», poi «Sì, tutte e due» sulla
regola): un piano nuovo ha **uno o più** sport, non più almeno due
(«Almeno due, sempre» del 2026-11-11). `MIN_PLAN_SPORTS` passa da 2 a 1;
all'apertura di «Nuovo piano» è scelta la Palestra (prima corpo libero e
corsa), perché la guida si apre solo dalle pagine della palestra (Draw e la
modalità allenamento di ADR-0398): un piano di sola palestra è «Continue»
fino in fondo. Il resto di questa decisione non cambia: `outing`, `target`
e le settimane verso la meta restano come sopra. Con la parte D gli sport
dell'ingresso e i giorni fuori mostrano il segno del loro profilo
(`profileOf(...).emoji`, lo stesso del menu degli sport) invece delle sigle
«RUN», «BIKE»…, e un solo colore di selezione, il giallo. Nessuna
migrazione, nessun cambio al server.

## ADR-0385 — Overpass in errore: un job lo chiede una volta sola, 5 secondi invece di 60 quando il suo stato non si legge, un tentativo su un secondo servizio spento finché il server non lo accende

**Stato**: Accettata · 2026-11-12 · TASK-471 (#1251 e #1269 in `main`;
#1259 e #1263, i testi, nell'OTA 14). La regola del punto 1 è
decisa dall'agente su delega dell'utente, col via del Coordinatore; i
punti 2, 3 e i testi sono scelte dell'utente, con le sue parole nel task
file.

**Contesto.** Il 12 novembre `overpass-api.de` rispondeva `502` («at
capacity») e due richieste di percorso in una zona nuova hanno aspettato
140 s e 163 s prima di `map_data_unavailable`. Letto nel codice e nel log:
osmnx 2.1.1 prima di ogni richiesta legge `/api/status`, e quando la
pagina non è quella attesa (con Overpass pieno è la pagina 502) aspetta
60 s fissi (`default_pause`, argomento di una funzione privata, non
un'impostazione), poi fa la richiesta comunque. In tutti e due i job la
zona attorno alla partenza è stata scaricata (75 s e 98 s) e la zona più
larga della ricerca lontana (ADR-0040) è fallita un minuto dopo: 120 s
dell'attesa erano la pausa, due volte. Nel codice c'era anche un doppio
tentativo vero: l'archivio (ADR-0256) ingoiava l'errore del suo download
e il processo di calcolo ne provava un altro.

**Decisione.**

1. **Un job chiede a Overpass una volta sola.** Dopo un download fallito,
   il caricamento successivo dello stesso job che ne avrebbe bisogno
   fallisce subito con lo stesso errore; i caricamenti dalla cache
   continuano, quindi un percorso che non ha bisogno di scaricare si
   disegna. Lo stato passa dal thread del job al processo di calcolo
   insieme alla richiesta (`jobs._Reporting.unavailable`,
   `route_processes`).
2. **Cinque secondi invece di sessanta** («Sì, 5 secondi»): per la durata
   di un download chiesto dall'app (`graphs.ZoneGraphs._download`) la
   pausa di osmnx quando lo stato non dice nulla di utile è 5 s
   (`overpass_pause.py`). Non cambiano l'attesa che Overpass chiede da sé
   né il download: nessun limite di tempo, perché uno riuscito dura da 75
   a 200 s. Se osmnx non ha più quella funzione il download va come
   prima, con una riga di avviso.
3. **Un tentativo su un secondo servizio** («Sì, un tentativo»): quando il
   principale risponde con un errore HTTP o non si raggiunge (non dopo un
   timeout), una volta sola (`overpass_fallback.py`). **Spento nel
   codice**: lo accende `SHAPEROUTE_OVERPASS_FALLBACK_URL` sul server,
   dopo che la privacy nomina il servizio (#1263), in un passo a parte
   col sì dell'utente. Il servizio scelto è `overpass.private.coffee`: le
   sue condizioni, lette il 12 novembre, permettono ogni progetto, anche
   commerciale, senza limiti dichiarati; chiedono uno User-Agent che dica
   chi siamo (`MuW/1.0 (https://getmuw.app)`), un avviso prima di usi
   grandi e nessun dato personale nelle richieste (mandiamo il riquadro).
4. Il lavoro a lotti (`prefetch_zones`) resta com'era: 60 s e solo il
   principale, come scelto dall'utente lo stesso giorno.
5. L'errore dice il perché in una riga (prima portava la pagina di
   Overpass); l'app dice «The map service is busy, so this area could not
   be loaded. Try again in a few minutes.».

**Alternative scartate.**

- Chiudere il job al primo errore dell'archivio senza guardare la cache:
  farebbe fallire un percorso che si poteva disegnare.
- Un limite di tempo sul download: sotto i tre minuti taglierebbe
  download che riescono.
- Scaricare subito la zona larga, un download invece di due («Sì,
  com'è»: non si fa): tre volte l'area per ogni prima richiesta, per
  accelerare il 3% dei job che cerca lontano.
- Rispondere col percorso della zona vicina quando fallisce solo la
  larga («ok procedi»: non adesso): sta nel motore, cambia l'impronta, e
  aiuta solo quando vicino c'è un percorso inclinato disegnabile.
- Il secondo servizio acceso nel codice: un altro gestore vedrebbe le
  aree prima che la privacy lo dica.

**Conseguenze.** I percorsi e le impronte non cambiano (niente motore,
niente `route_store.py`). Con Overpass a 502: un download fallito costa
circa 10–20 s invece di 70–80 s, e al massimo uno per job. Acqua e neve
non passano da osmnx e non avevano la pausa; il secondo servizio vale
anche per la loro richiesta («Sì, aggiungilo»), con la stessa variabile
(`paddling.py`, `snowshoeing.py`). I servizi pubblici gratuiti sono per
progetti piccoli e il principale chiede che l'uso commerciale passi a un
servizio a pagamento o proprio: con la società, o se i download
crescono, un servizio con chiave o le zone dagli estratti. Come si
accende il secondo servizio e cosa leggere dopo: `tasks/TASK-471.md`.

## ADR-0386 — Lo stretching come sport: l'attività `stretching` registrata senza percorso come la palestra, le routine di ADR-0378 in «Draw», lo sport nato `ready: false`

**Stato**: Attiva · 2026-11-22 · TASK-475: A #1340 (server, `0079` al
passo 15), B #1348, C #1376 (`f5bccf82`, acceso); proposta il
2026-11-12, parte 0 (documenti). Lo sport,
il salvataggio come attività, il nome e l'emoji sono **scelte
dell'utente** (2026-11-12: «Diventa uno sport», «Sì, come la palestra»,
«Sì, approvati»); il modo è deciso dall'agente su delega dell'utente,
numero dal Coordinatore.

**Contesto**: col pannello degli sport a griglia (TASK-473) l'utente ha
chiesto di aggiungere lo stretching. Fra un quadrato che apre solo le
routine e uno sport vero ha scelto lo sport, e una routine finita deve
restare come una sessione di palestra. Lo stretching stesso (figura,
esercizi, routine Morning, After run, After gym da 3, 5 e 10 minuti,
palestra, mattino, routine pubblicate) è di TASK-466, ADR-0378.

**Decisione**:
- **Uno sport del registro**: `stretching` nel tipo `Sport` e in `ACTIVITY`
  dell'app (TASK-376), nella famiglia «Other» del pannello; sul server
  un'attività registrata senza percorso, come `gym` e `paragliding`
  (migrazione provvisoria 0079 per il vincolo su `runs.activity`, se
  serve). Nome «Stretching» (it Stretching, fr Étirements, de Dehnen, es
  Estiramientos), emoji 🧘: un testo nuovo, separato dal tasto «Stretch»
  di fine corsa.
- **Nasce `ready: false`**: nel pannello dice «Soon» finché server, app e
  routine non ci sono tutti; si accende con le schermate approvate
  dall'utente.
- **Prende da ADR-0378, non lo cambia**: con lo sport scelto «Draw» mostra
  le routine di TASK-466 B e le apre in `StretchScreen`; i file di
  `src/stretch` si toccano solo d'accordo con la sessione di TASK-466 e col
  Coordinatore.
- **La sessione finita è un'attività**: sport, routine, durata, senza
  traccia, in «My activities», nel calendario e condivisibile come una
  sessione di palestra. È diversa dalla routine pubblicata di ADR-0378 E,
  che è una ricetta da rifare, non una sessione fatta.

**Alternative scartate**: un quadrato che apre solo le routine senza
cambiare sport (proposto, l'utente ha scelto lo sport); la sessione non
salvata, senza server (l'utente ha scelto di salvarla); riusare la chiave
«Stretch» come nome dello sport, che in francese, tedesco e spagnolo è un
verbo.

**Conseguenze**: parte A sul server a turno (`app.py`, shared-types,
`docs/API.md` dopo 455 C; `sports/__init__.py`, `activities.py`,
`reads.py` dopo 463 B; `engine.zip` dopo la #1269); parte B nell'app dopo
la #1216 in `main` e dopo 413 (#1280) e 463 B (#1278) su `settings/sport.ts`;
parte C accende. Dettagli in `tasks/TASK-475.md`.

## ADR-0373 — L'alpinismo registrato senza percorso; la parte A solo sul server, prima del contratto, con la deroga in una costante (`SERVER_FIRST`)

**Stato**: Attiva · 2026-11-12 · TASK-463 parte A in `main` (#1242,
`f8d91aba`), sul server col passo 12 del Coordinatore (col sì
dell'utente). Lo sport è una scelta dell'utente dell'11 novembre 2026,
durante TASK-462 («alpinismo: sì, registrato senza percorso»); il modo è
deciso dall'agente su delega dell'utente, la strada «solo server» dal
Coordinatore; numeri dal Coordinatore.

**Contesto**: l'alpinismo (roccia, neve, ghiaccio) non ha una forma da
disegnare: è come lo scialpinismo (ADR-0344) e il parapendio (ADR-0375),
sport «Record only» (ADR-0319). La ricetta (`sports/COME-AGGIUNGERE.md`)
vuole nella parte A anche il contratto e il profilo nascosto nell'app:
un'attività in `shared-types` finisce subito in `X-MuW-Reads` e i test
dell'app chiedono un profilo. Ma `sports/**` e `settings/sport.ts`
erano occupati da TASK-414 B e TASK-413 B.

**Decisione**:
- **`alpinism` è uno sport del registro dell'API**, `record_only`, dopo
  `paragliding` e prima di `gym` (`RunActivity`, `API_SPORTS`,
  `NEWER_ACTIVITIES`). Niente percorsi, record personali, gioco o zone.
- **Strava «Hike», GPX `<type>alpinism</type>`**: Strava non ha
  l'alpinismo. Sono valori tecnici che l'utente può cambiare con una riga
  in `sports/alpinism.py`.
- **La migrazione `0076_alpinism.sql`** allarga solo
  `runs_activity_check`, rileggendolo come la `0069`.
- **Prima il server, poi il contratto**: `packages/shared-types` non
  cambia. Così nessuna app lo dice in `X-MuW-Reads` e nessuna riceve una
  giornata di alpinismo. La deroga sta in **una costante sola**,
  `SERVER_FIRST` in `services/api/tests/test_sport_registry_api.py`, e i
  test che tengono l'API al contratto leggono le sue liste con
  `in_the_contract`. **La toglie la parte app**, che porta insieme il
  contratto e il profilo nascosto.
- `engine.zip` si rifà, perché il registro degli sport va sul telefono.

**Alternative scartate**:
- *Come il parapendio (#1177)*, cioè contratto e profilo nascosto
  nell'app nella stessa PR: tocca `sports/**`, `watch/**` e
  `PublicParts.tsx`, occupati da altri task.
- *Aspettare TASK-414 B e TASK-413 B*: il server sarebbe rimasto fermo.

**Conseguenze**: il calendario delle attività (ADR-0372) accetta già
`sport=alpinism`. L'orologio della build 14 non ha l'alpinismo: arriva con
una build nuova dell'orologio, dopo la parte app. I controlli dopo il passo
sono in `out/TASK-463/SERVER-A.md`; i dettagli in `tasks/TASK-463.md`.

## ADR-0343, precisazione B — La carrozzina nell'app: le forme di uno sport nel suo profilo, la fila sotto il percorso dalle stesse forme, il tempo della camminata, i record su 1 e 5 km

**Stato**: Attiva · 2026-11-12 · TASK-414 B (#1234, `100624e2`) e B2 (#1257,
`e88d491f`). Deciso dall'agente su delega dell'utente; liste dei file
approvate dal Coordinatore; schermate approvate dall'utente («Sì, accendi»).

1. **Le forme di uno sport stanno nel suo profilo**: `SportProfile.shapes`
   (come `Activity.shapes` del motore). La carrozzina ha cerchio, cuore,
   stella e luna; nessun altro sport ne ha, quindi tutti gli altri vedono il
   catalogo intero come prima.
2. **«Disegna» chiede solo quello che lo sport disegna**, letto dal profilo
   in un punto solo (`route/sportDraw.ts`): `drawKindOf` (una parola o
   un'immagine che lo sport non disegna aspetta, come prima sull'acqua),
   `shapeOfSport` (una forma che lo sport non disegna non parte verso il
   server) e `figuresOf` (la fila di figure sotto il percorso: le forme
   dello sport, le immagini solo se lo sport le disegna, «Modifica il
   disegno» solo a chi disegna a mano). Il caso trovato al simulatore: il
   cavallo sotto un cuore in carrozzina chiedeva al server un 422 e lasciava
   la scheda vuota.
3. **Il tempo** sotto la distanza è quello della camminata (`timeAt:
   "walker"`, 12:00 al km prima di una camminata salvata): chi spinge va
   come chi cammina.
4. **I record** su 1 e 5 km stanno nel contratto
   (`WHEELCHAIR_BEST_DISTANCES`, `PersonalBest.sport` con `wheelchair`) e
   nel profilo come «1 km» e «5 km», nel gruppo «Wheelchair & stroller» dopo
   il Roller.
5. **Salute**: Apple `.wheelchairWalkPace` (70), Health Connect
   `EXERCISE_TYPE_WHEELCHAIR` (82), anche per il passeggino (scelta 8);
   nessuna distanza del giorno in Apple Salute, che conterebbe come
   carrozzina i metri di chi spinge un passeggino. L'energia è quella della
   camminata, uno sport solo (scelta 1).
6. **Import**: un file che dice «wheelchair» (MuW, Strava, Garmin
   `wheelchair_push_*`) è una carrozzina, prima di «run». I file FIT no: i
   codici FIT della carrozzina non sono verificati.
7. **Acceso** (`ready: true`) dopo lo sci di fondo (#1249) e il menu a
   griglia (#1254, la carrozzina nella famiglia «wheels»); solo JavaScript,
   l'impronta iOS non cambia; esce con l'OTA, col sì dell'utente.

## ADR-0384 — Il gesto dal bordo sinistro su iOS: la pagina segue il dito e si chiude come la sua «←»

**Stato**: Attiva · 2026-11-12 · TASK-470 parte E, in `main` con la #1243 (OTA 14). Il gesto e la
versione sono scelta dell'utente (2026-11-12, «A, la pagina segue» fra A e
B «solo il colpo»); il modo è deciso dall'agente su delega dell'utente, coi
criteri del Coordinatore; numero dal Coordinatore.

**Contesto**: nell'app non c'è navigazione nativa né `react-native-gesture-handler`:
le pagine sopra le schede (conversazione, campanella, profili, concorso,
pagine di «Profile», «Play») sono viste, e si
chiudevano solo con «←». Su Android il tasto indietro le chiude dalla
fetta B (`useBackCloses`, una pila delle pagine aperte).

**Decisione**:
- **Solo iOS**, in JS (`PanResponder` e `Animated`, nessuna dipendenza
  nuova): esce con un OTA. Su Android c'è il gesto di sistema, che passa
  dal tasto indietro.
- **Una striscia fissa di 24 pt** dal bordo sinistro; il dito deve andare a
  destra di almeno 8 pt e più di lato che in basso: un tocco sulla «←», uno
  scroll, una lista orizzontale che parte più in là restano della pagina.
- **La pagina segue il dito**; sotto, l'app un po' scurita (25% di
  `scrim`, che cala man mano). Lasciata oltre un terzo dello schermo, o con
  un colpo veloce (0,5 pt/ms), esce in `motion.sheetMs` (280 ms, curva a
  tempo fisso, non una molla: una molla è ferma molto dopo che la pagina è
  sparita) e si chiama la sua «←»; altrimenti torna con la molla `glide`.
  La tastiera si chiude quando il dito prende la pagina; il testo resta
  finché la pagina non va, come con la «←» (oggi nessuna pagina della
  lista chiede conferma).
- **«Riduci movimento»**: la pagina sfuma invece di scorrere.
- **Dove**: sulla radice di ogni pagina (`useEdgeBack`), con la stessa
  chiusura della sua «←» e lo stesso «acceso» del tasto indietro. In
  «Play» chiude la pagina più in alto della pila (premi, collezione), poi
  «Play». Non sulle schede della barra (lì lo swipe cambia scheda), non su
  «Profile» come scheda, non sulla mappa, non sui fogli e sulla pagina del
  post (`Modal` dal basso), **non sulle pagine dentro una scheda**
  (località e giorno di sci): provato al simulatore il 2026-11-12, il colpo
  dal bordo chiudeva la pagina e faceva scorrere anche le schede, perché lo
  scroll nativo della striscia non si ferma per il gesto JS.

**Conseguenze**: `src/ui/EdgeBack.tsx` (`useEdgeBack`, `EdgeBack`,
`EdgeKeyboardAvoidingView`), poche righe sulla radice di ogni pagina. Le
pagine dentro una scheda restano col tasto indietro di Android e la «←».

## ADR-0380, precisazione B2b — Il sonno a fine palestra e a fine vasca: lo stesso interruttore di B2, e la notte aspetta l'attività nella coda sua prima di partire

**Stato**: Attiva · 2026-11-12 · TASK-467 parte B2b (#1244, `bb3d3457`).
**Deciso dall'agente su delega dell'utente**; lista dei file approvata dal
Coordinatore. Nessun testo nuovo, nessuna migrazione, niente di nativo.

**Contesto**: B2 (precisazione B1b/B2) mette «Sleep last night» a fine
attività solo dove passa `RunEnd`. Un allenamento in palestra e un nuoto in
vasca hanno una schermata e una coda loro (`gym-outbox.json`,
`pool-outbox.json`), e per l'API sono corse con la stessa chiave.

1. **Lo stesso componente accanto al form**, non dentro: `SleepRunEnd` in
   `gym/GymEnd.tsx` e `pool/PoolSwimEnd.tsx`, sopra «Save»;
   `GymPostForm.tsx` e `PoolPostForm.tsx` non si toccano. La notte è quella
   prima dell'inizio dell'allenamento o del nuoto; il lettore è una prop che
   parte da `sleepReader()`, null in ogni build fino alla parte C.
2. **Una coda sola per le notti**, quella di B2 (`sleep-outbox.json`): a
   «Save», una volta tenuto l'allenamento o il nuoto, la notte ci entra con
   la sua chiave, solo con l'interruttore acceso e un post che altri vedono.
3. **La notte aspetta l'attività dovunque essa aspetti**: `sleepOut.ts`
   guarda la coda delle corse, quella della palestra e quella della vasca.
   Mandata prima, l'API risponderebbe `404` e la notte verrebbe buttata. Un
   allenamento o un nuoto che l'API rifiuta resta nella sua coda: la sua
   notte non parte mai, e dopo 30 giorni si butta.
4. **Le due code mandano le notti dopo i disegni**, con una chiamata a
   `sendWaitingSleep`; senza notti in attesa non chiedono niente.
5. **Con la costante spenta niente cambia**, coi test: l'albero intero
   delle due schermate confrontato con quello che ha un lettore, tolto il
   solo blocco del sonno; «Save» non tiene nessuna notte; nessuna richiesta
   sul sonno.

**Conseguenze**: quando la parte C accende, il sonno compare a fine di ogni
attività che ha un post, senza altro lavoro su palestra e vasca.

## ADR-0342, precisazione A3 — La città detta subito: gli edifici contati attorno alla partenza prima di leggere la neve, sopra 280 per km² «no open snow», un conteggio che non arriva non cambia nulla

**Stato**: Attiva · 2026-11-12 · TASK-413 A3 (#1238, `8f5d0516`, unita
dall'utente). Chiesta dal Coordinatore dopo il passo 8 (Trento 3 km,
`shape_not_drawable` in 76 s); **decisa dall'agente su delega
dell'utente**. La soglia, con Bolzano e Aosta fuori, ha il sì del
Coordinatore. Nessuna ADR nuova.

**Contesto**: una città non è un posto da ciaspole, ma prima della A3 il
motore lo scopriva solo dopo aver scaricato e costruito la neve
(`snow.build_area`, 16–19 s per Milano al banco, quasi tutto shapely
elemento per elemento). Sul server, la prima volta, si aggiunge lo scarico
da Overpass.

1. **Prima di leggere la neve**, `plan_snowshoeing` conta gli edifici in un
   riquadro fisso attorno alla partenza: `snow.town_bbox`, 4,8 km di lato,
   lo stesso per ogni forma e distanza, sempre dentro il riquadro della
   neve. Sopra **280 edifici per km²** (`BUILT_UP_PER_KM2`) risponde subito
   `NoSnowError`: lo stesso «no open snow» di prima, nessun testo nuovo.
2. **Da dove viene il conteggio**, nell'ordine:
   - la neve già in cache che copre il riquadro;
   - un file `<cache>/snow/count_….json`;
   - Overpass `out count`: 5 s per Overpass, 6 s di attesa al massimo,
     fuori dal lucchetto degli scarichi.

   Il conteggio è tenuto in cache come la neve.
3. **Un conteggio che non arriva non è un errore**: Overpass lento, 429,
   502, file rotto. La richiesta va avanti come prima, e la volta dopo il
   rifiuto viene dalla neve scaricata. Le sorgenti senza conteggio (i test)
   non lo chiedono (protocollo `CountsBuildings`).
4. **La soglia**, scelta su 21 posti contati (`sports/snowshoes.md`):
   - il posto con neve più denso è Asiago, 180;
   - sono dette subito Trento (350), Belluno (345) e Milano (700);
   - **Bolzano (207) e Aosta (247) vanno avanti come prima**: per prenderle
     servirebbe una soglia a un passo da Asiago, e conviene più l'attesa
     che un «no» sbagliato.
5. **In città il messaggio cambia**: prima era «the circle does not fit on
   open snow here, even at 0.4 km» (`SnowFitError`, a volte con una
   distanza più corta da provare); ora è «there is no open snow to walk on
   within 2 km of here» (`NoSnowError`). Per l'app è sempre
   `shape_not_drawable`.

**Conseguenze**:
- **Le impronte non cambiano**: `snow.py` e `snowshoeing.py` stanno in
  `SNOW_ONLY` (codice ed efficaci `e0834d054b6e` / `8ab61d8e87f9` su
  `8f5d0516`).
- **`engine.zip` è rifatto** con la #1238.
- **Il banco sul Mac** (72 richieste, dalla cache): le 60 dei cinque posti
  con neve sono identiche, e Milano passa da 67,0 s a 3,3 s (0,3 s a
  richiesta).
- **Il server** la prende col passo 11; i controlli sono in
  `out/TASK-413/SERVER-A3.md`.
- **Bolzano e Aosta restano lente**: per loro serve la parte a sé che rende
  `build_area` più veloce.

## ADR-0380, precisazione B1b/B2 — Il sonno nel post: un campo `sleep` nel disegno visto al posto di una richiesta per riga; nell'app tutto dietro `SLEEP_POSTS_ON` e nessun lettore di Salute in `main`; al server solo con l'interruttore acceso e un post che altri vedono

**Stato**: Attiva · 2026-11-12 · TASK-467 parti B1b (#1227, `3c513355`) e B2
(#1236, `627767a5`). **Deciso dall'agente su delega dell'utente**, dentro le
scelte di prodotto della parte 0 (testi approvati l'11 novembre, «Resta
acceso» il 12); liste dei file approvate dal Coordinatore.

**Contesto**: l'ADR-0380 lasciava aperto come il Feed sa che un post ha il
sonno, e non diceva niente dell'app. La vasca e la palestra chiedono i loro
numeri a parte, ma solo per i loro post; il sonno può stare su qualsiasi
attività. Il modulo nativo di Salute è già nelle build dalla 1.0.1 (per il
battito), col testo del permesso che nomina solo il battito.

**B1b, sul server**:

1. **Il sonno del post è un campo del disegno visto, non una richiesta.**
   `sleep` in `SeenFields`, con una sotto-select per chiave primaria in
   `_SEEN_FIELDS` (`sleep_seen.py`), come `ski_descents` (TASK-424 C2b): è
   in `GET /drawings/{id}` e in ogni lista che passa da `_seen` (Feed,
   profilo, ricerca, stazione, gare). Scartato: `GET /drawings/{id}/sleep`
   per ogni riga del Feed, una richiesta per riga e quasi tutte `404`.
2. **Solo con `sleep_shown`, anche per l'autore**: nella lista l'autore
   vede quello che vedono gli altri; l'interruttore lo legge da `GET
   /me/activities/{key}/sleep`. La chiave c'è sempre: «nascosto» e
   «assente» sono lo stesso `null`, con gli stessi campi (c'è il test).
3. **`stages` manca, mai `null`**, per una notte senza fasi, come
   nell'endpoint: un `field_serializer` senza tipo di ritorno, così lo
   schema in openapi resta quello della notte.
4. `SleepStagesBody` e `SleepSummaryBody` stanno in `sleep_seen.py`:
   `sleep.py` importa `drawings.py`, e il contrario sarebbe un import
   circolare. Nessuna migrazione.

**B2, nell'app**:

5. **Una sola costante spegne tutto**, `SLEEP_POSTS_ON = false`
   (`health/sleepModules.ts`), e `sleepReader()` risponde sempre null:
   l'assenza del modulo nativo non basterebbe a nascondere la funzione.
   **In `main` niente legge il sonno da Salute**: c'è solo il tipo
   `SleepReader` con le funzioni pure; il lettore di Apple arriva con la
   parte C. Un test legge i sorgenti e blocca ogni file del sonno che
   carichi la libreria o chieda un permesso.
6. **Quale notte**: i campioni dalle 18 della sera prima alle 18 del
   giorno dell'attività, sull'ora del telefono, fino all'inizio
   dell'attività; prima delle 6 senza aver ancora dormito, la notte del
   giorno prima. `night` è il giorno del calendario del telefono in cui
   finisce.
7. **Al server solo quello che si pubblica**: la notte lascia il telefono
   solo con «Sleep last night» acceso **e** un post che altri vedono; con
   «Only me» la riga non compare. Due difese: `RunEnd` non la passa alla
   porta, e `sleepOut.ts` non tiene mai una notte con `shown` diverso da
   `true`.
8. **La coda** `sleep-outbox.json`: la notte aspetta sul telefono finché
   l'API ha l'attività, poi `PUT /me/activities/{key}/sleep` dopo il
   disegno; un rifiuto dell'API la butta, senza rete aspetta, dopo 30
   giorni si butta.
9. **A fine attività il permesso non si chiede mai**: il sì è della scheda
   «Sleep» del profilo (B3), tenuto in `sleep-health.json`. Senza notte non
   compare niente.
10. **Dopo la pubblicazione** l'interruttore sta in «Post settings» e va
    all'API subito (`PATCH`), non con «Save»; la riga e la scheda seguono
    all'istante (`health/sleepNow.ts`), senza richiedere la lista.
11. **Le parole con `@@sleep`** («Light», «Deep», «Good»…): chiavi di
    contesto. In francese «REM» è «Paradoxal», come nell'app Santé.

**Conseguenze**: nessuna richiesta in più nel Feed; B1b va sul server col
passo dopo quello dell'aggiornamento completo, col sì dell'utente
(`out/TASK-467/SERVER-B1b.md`), e fino ad allora il campo manca e l'app non
mostra niente. Accendere (parte C) vuol dire `SLEEP_POSTS_ON` vero **e** un
lettore vero solo nella build col testo del permesso nuovo: le build di
prima ricevono lo stesso OTA e devono restare senza lettore. Palestra e
nuoto in vasca (form e code loro) nella B2b.

## ADR-0381, precisazione A1a — La live vista nell'app: il link facoltativo, `LiveShareMade` per non rompere l'app di oggi, i limiti per persona, `skipped` uguale per tutti, le copie notturne senza destinatari

**Stato**: Attiva · 2026-11-12 · TASK-468 parte A1a (#1221, `9328c109`).
**Deciso dall'agente su delega dell'utente.**

- **Il link è facoltativo, il token resta unico**: `token_hash` può essere
  nullo (migrazione `0073`); `POST /me/live-shares/{id}/link` fa un token
  nuovo e il link dato prima smette di funzionare, così non ci sono mai due
  link vivi per la stessa live.
- **`LiveShareCreated.url` resta `string`** nel contratto: l'app di oggi
  (`liveShareStore.ts`) lo mette dove serve una stringa. La risposta senza
  link è un tipo a parte, `LiveShareMade` (`url: string | null`), che usa
  solo l'app nuova (B1).
- **Chi può vedere** si calcola nella query (`MAY_SEE_SQL`) a ogni
  richiesta, con `follows.apart_sql` e `follows_sql`: a chi non può, `404`
  come per una live che non c'è, mai `403`.
- **Limiti**: la vista nell'app conta per persona e live (120 al minuto,
  come la pagina), non per live, perché una gara seguita da tanti non
  diventi «troppe richieste»; `send` 20 persone per volta e 20 invii al
  minuto per account, come i messaggi.
- **`skipped`**: chi non ha un account, se stessi e chi è lontano per un
  blocco o un nascosto sono saltati tutti uguali, per non dire chi ha
  bloccato chi (come il `404` dei messaggi).
- **Le copie notturne**: i dati di `live_share_recipients` restano fuori
  come quelli di `live_shares` (riga in `deploy/backup.sh` col passo sul
  server): con le live fuori e i destinatari dentro il ripristino
  fallirebbe sulla chiave esterna, e chi ha visto la live di chi non va
  tenuto 14 giorni.

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

**Decisione** (parte B, in `main` con la #1216, `05f5a725`, 2026-11-12;
nomi, frasi, traduzioni e schermate col sì dell'utente; il modo deciso
dall'agente su delega dell'utente):
- **Dieci esercizi in più** (`MORE_EXERCISES`), quindici in tutto, tutti
  leggibili di profilo; **tre routine** (`routines.ts`: Morning, After
  run, After gym) in 3, 5 e 10 minuti, una tenuta sola per durata, la
  sessione intera fra il 90% e il 105% dei minuti detti. A fine corsa la
  schermata chiede «How long?» prima del primo esercizio
  (`RoutineChooser`).
- **Nessuna giuntura a dimensione zero**: su iOS una vista riusata con la
  cornice esattamente (0, 0, 0, 0) tiene la posizione che aveva prima, e
  alla seconda apertura dello stretching una gamba restava staccata (in
  produzione con la parte A dall'OTA 12 fino al primo OTA dopo la #1216).
  Ogni giuntura è un quadrato di 2 pt attorno al suo punto (`JOINT`).
  Scartati: l'animazione guidata da JS (non cambia nulla) e
  `collapsable={false}` (peggiora: più viste vere, più viste fuori posto).
- **Una posa che arriva lontano scivola indietro**: oltre `REACH` (0,46
  dell'altezza dall'anca) tutta la figura si sposta di quanto serve
  (`drift`); oggi solo «Child's pose», che usciva dal bordo di un
  telefono da 390 pt.

**Decisione** (parte D, «Morning stretch», in `main` con la #1300,
`749a5cc7`, 2026-11-12; la voce, la notifica 5 minuti dopo la sveglia,
i giorni e le durate sono scelte dell'utente, testi e schermate col suo
sì; il modo deciso dall'agente su delega dell'utente):
- **L'ora della sveglia la scrive l'utente** (iOS non lascia leggere le
  sveglie dell'Orologio), con «−» e «+», senza tastiera; l'impostazione
  resta sul telefono (`morning-stretch.json`), spenta all'inizio.
- **Notifiche locali settimanali con un nome proprio**,
  `morning-stretch-<giorno>`: a ogni cambio si tolgono solo quelle con
  questo inizio e si rimettono, mai `cancelAll`, così il promemoria del
  piano (`muw-plan-day-…`) e la pausa della palestra restano. Il testo si
  scrive quando la notifica è programmata: si rimettono all'apertura
  dell'app e a ogni cambio di lingua.
- **Il tocco ha un ascoltatore suo** (`onMorningTapped`), non quello
  delle push, che apre solo con un account e attraverso le porte di
  «Profile». La notifica che ha aperto l'app si legge senza cancellarla
  (la cancella l'ascoltatore delle push, che parte dopo); quella
  settimanale torna con lo stesso nome e si distingue dalla data.
- **Sopra l'app, mai durante una corsa** (`MorningStretchLayer`, una riga
  in `App.tsx`): la schermata dello stretching usa lo stesso «schermo
  acceso» della corsa e lo spegnerebbe all'uscita.
- Scartato: passare da `notificationTap.ts` e `openTarget.ts`, che
  avrebbe toccato le porte di «Profile» per una cosa che non è un
  profilo né un disegno.

**Le parti dopo** (ciascuna con la sua PR, i testi col sì dell'utente):
C, lo stretching in palestra (col turno su `src/gym`; lo stretching come
sport è di TASK-475, ADR-0386); la prossima sveglia letta su Android,
nativa, in una build; E, le routine dell'utente pubblicate nel Feed con
«Do this routine» (server prima, segnalazione e blocco anche lì).

**Alternative scartate**: una libreria di disegno (svg, Lottie) per la
figura, una dipendenza e un'impronta nativa nuove per poco; il respiro
come scala di tutta la figura, che non mostra dove tira; la voce che legge
gli esercizi, rimandata.

**Conseguenze**: i test della schermata simulano `./chime` (jest dà lo
stesso stub ai due wav); `__tests__/AppStretch` conta il tempo nuovo
(`READY_S + 20 + SWITCH_S + 20` a esercizio). Dettagli in
`tasks/TASK-466.md`.

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

**Stato**: **Attiva per la parte A** (A1 #1219 e A2 #1225 in `main` e in
produzione con l'OTA 14, 2026-11-12; le fette seguenti in corso); la parte
B è avviata dal 2026-11-24, a fette · 2026-11-12 · TASK-469. La
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
- **Parte B, il modo (2026-11-24)**: l'utente l'ha avviata («Inizia parte
  b»); l'installazione della dipendenza aspetta il suo sì a parte. Un
  solo modulo nuovo, `expo-glass-effect` ~57.0.5, quello di Expo per
  l'SDK 57: niente `expo-blur`, perché dove il vetro vero non c'è (iOS
  sotto il 26, Android) il ripiego è il vetro velato della parte A, già
  provato sul contrasto. Il modulo entra con un componente a parte,
  `src/ui/NativeGlass.tsx`, che non lo importa in cima al file e ripiega
  senza errori se la build non lo ha: così le fette che lo usano non
  possono rompere una build vecchia. La dipendenza cambia l'impronta iOS
  e va nel taglio nativo ordinato dal Coordinatore; le superfici (barra,
  header col contenuto sotto, fogli) seguono una per fetta, solo JS.
  L'isola resta velata. Sul vetro vero il contrasto lo regola iOS: ogni
  superficie si misura sulle schermate nei casi peggiori e resta velata
  se scende sotto 4,5:1. Deciso dall'agente su delega dell'utente; la
  scelta di installare è dell'utente.
- **Parte B, la barra (2026-11-26)**: l'utente ha voluto che le pagine
  passino sotto la barra («Sì sotto la barra», 2026-11-24) e che la
  barra galleggi **solo dove il telefono disegna il vetro vero** («Solo
  col vetro vero», 2026-11-26). Provata col vetro velato della parte A,
  la barra che galleggia lasciava leggere il testo dei post dietro le
  icone: il velo non sfoca. Quindi due pezzi. La stanza
  (`useTabBarRoom()`, `src/tabs/tabBarRoom.ts`) è già in `main`: ogni
  pagina della barra la chiede, e vale 0 finché la barra non galleggia.
  La barra (bozza #1562 sopra la #1557) galleggia quando
  `nativeGlassAvailable()` dice sì, con la capsula in `NativeGlass`;
  altrove resta la fascia col fondo di pagina di oggi. Il galleggiare
  dipende dal telefono e non dal modo di accessibilità: con «Riduci
  trasparenza» e «Aumenta contrasto» la barra galleggia opaca, come fa
  iOS, così la pagina non cambia lunghezza quando si tocca
  l'impostazione. Le due bozze entrano insieme nel taglio nativo: nessun
  OTA porta la barra che galleggia a una build che non ha il modulo. La
  scelta di quando galleggia è dell'utente; il resto è deciso
  dall'agente su delega dell'utente.
- **Parte B, il contrasto sul vetro vero (2026-11-26)**: misurata nel
  simulatore nei casi peggiori, la barra in vetro vero non teneva 4,5:1
  (icone a 1,8:1 sopra una foto bianca nel tono scuro): il vetro di iOS
  prende luce da quello che ha dietro e i segni dell'app tengono il loro
  colore. L'utente ha scelto di provare una velatura («Prova la
  velatura»). Il vetro vero prende quindi il fondo del tono
  (`glass.realTint`): il 60 %, o la quota appena sopra a cui il testo
  tiene 4,5:1 sulla sola velatura sopra una foto bianca e una nera, mai
  vicino all'88 % del velo della parte A; e sul vetro vero i segni sono
  nel colore pieno del testo, mai nel secondario. Il test dei token
  controlla solo il pavimento (la velatura senza il vetro): la misura
  vera resta quella sulle schermate, da rifare a questa quota. Il foglio
  dei commenti in vetro vero non teneva 4,5:1 nemmeno lui (testo 3,6:1,
  scritte secondarie 1,5:1): B4 è ferma alla prova su due fogli. Deciso
  dall'agente su delega dell'utente; provare la velatura è una scelta
  dell'utente.
- **Parte B, il vetro velato misurato (2026-11-27)**: a quella quota la
  barra tiene 4,5:1 nei due casi peggiori (icone 7,4:1 e 5,5:1 nel tono
  scuro sopra una foto bianca, 14,9:1 e 11,6:1 nel chiaro sopra una
  scura) e lascia ancora vedere quello che ha dietro. L'utente l'ha
  approvata («Sì, va bene»). I fogli, con la stessa velatura, erano a un
  passo; l'utente ha scelto di andare avanti («Sì, avanti»), tutti o
  nessuno: entrano in una build solo quando sono pronti tutti. Un foglio
  prende un decimo in più del fondo del tono rispetto alla barra
  (`glass.realSheetTint`), perché porta testo corrente e scritte
  secondarie: misurato, testo 12,4:1 e secondarie 5,2:1 nel caso
  peggiore. Con «Riduci movimento» un foglio resta opaco: lì entra
  sfumando l'opacità, e sotto un'opacità che parte da 0 il telefono non
  disegna mai il vetro. Si è scelto di ripiegare dentro `useGlassSheet()`
  invece di cambiare `SheetModal`, che serve a ogni foglio e la cui
  dissolvenza è proprio quello che «Riduci movimento» chiede. Le scelte
  sulla barra e sui fogli sono dell'utente; il resto è deciso dall'agente
  su delega dell'utente.
- **Parte B, l'header (2026-11-26)**: galleggia dove galleggia la barra.
  Lo shell continua a lasciare a ogni pagina lo spazio dell'header: non
  sposta le pagine sotto la fascia. Solo lo scroller principale che lo
  chiede (`useUnderHeader()`) smette di tagliare quello che gli esce in
  alto, e il contenuto si vede passare dietro il vetro. Scartato dare
  allo scroller un margine interno in alto: ogni cosa che una pagina apre
  sopra di sé, e ogni pagina con qualcosa di fisso in cima, sarebbe
  finita sotto l'header finché qualcuno non se ne accorgeva. La fascia in
  vetro si accende e si spegne col suo stesso interruttore
  (`glassEffectStyle`), non con l'opacità, che a 0 ferma il vetro. Deciso
  dall'agente su delega dell'utente.

**Conseguenze**: la A arriva in fette piccole dopo l'aggiornamento
completo, prima i token e `src/ui/Glass.tsx`; l'impronta iOS resta
`6f8bba4c`. Niente blur sopra la mappa mentre si registra. `docs/UI.md`
si aggiorna fetta per fetta.

**Come è fatto (A1 e A2, 2026-11-12)**: la velatura è `GLASS_VEIL` = 0,88
del fondo del tono; `glassOf(scelta)` dà per tono e passo la tinta, il
riempimento, il bordo di luce in cima (bianco al 22% sul tono scuro, al
95% sul chiaro), il filo intorno (bianco all'8% sullo scuro, il testo
all'8% sul chiaro), l'ombra (`scrim` al 55% o al 16%) e la capsula della
scelta (il testo al 12%). Bordo e luce sono ombre interne di `boxShadow`,
l'ombra portata è a 8 pt con 24 di sfocatura. `useGlassMode` legge
«Riduci trasparenza», «Aumenta contrasto» (iOS) e «Testo ad alto
contrasto» (Android), e vince il contrasto. La barra è una capsula
staccata di `space.lg` dai lati e alzata sopra l'indicatore home; la
fascia sotto ha la stessa altezza di prima, così le pagine e `TabShell`
non cambiano. In `Segmented` la pillola della scelta è una vista sola che
scivola con la molla `glide` e si ferma senza superare il segno; finché
la pista non è misurata la scelta porta la pillola da sé. Deciso
dall'agente su delega dell'utente; l'utente ha approvato le schermate.
**A3 (#1276)**: la pista dei segmenti è vetro posato, non sospeso (filo e
luce interni, nessuna ombra portata), la pillola ha la luce in cima e
un'ombra a 2 pt con 6 di sfocatura; nelle modalità opache tutto torna
piatto. Lo stesso in `PlayTabs`. Il fondo passato da chi chiama vince.
**A4a (#1290)**: il rilievo è una funzione sola, `glassRaise(mode)`, che
dà la luce interna in cima e l'ombra a 2 pt e non tocca i colori; la
usano i chip delle città e `FilterChip`. Il giallo del chip scelto resta
(TASK-344, scelta di prodotto).
**A4b (#1333)**: il raggio delle card del vetro è un token nuovo,
`radius.card` = 28 (`xl` resta 20 per chi lo usa). Il bordo della card è
una vista sopra la card, non un'ombra della card stessa: un'ombra interna
starebbe sotto il disegno e la foto, che la coprirebbero.
**A4c (#1344)**: nel Feed la sfumatura `Scrim` sotto le parole di una foto
lascia il posto a una capsula di vetro posata (`segmentTrackFace`); la
forma a capsula intera è scelta dell'utente (2026-11-21). Le parole
prendono i colori del testo; un test controlla anche le calorie a 4,5:1
sul vetro. `Scrim` e i token `onScrim` restano per gli altri che li
usano.
**A5 (#1358)**: la campanella e lo sport dell'header usano lo stesso
cerchio, `headerGlass` (il vetro posato dei segmenti più il rilievo dei
chip, col bordo forte), definito in `BellButton.tsx` e usato anche da
`SportButton.tsx`.
**A5b (#1384)**: gli eventi di scroll di React Native non risalgono, quindi
l'header non può guardare lo scroll da solo: `TabShell` dà a ogni pagina un
contesto, e la pagina mette `useHeaderScroll()` sul suo scroller
principale. L'hook avvisa solo quando cambia (oltre 4 pt), così l'header
non si ridisegna a ogni evento. `TabShell` ricorda quali pagine sono
lontane dalla cima e passa all'header lo stato di quella sullo schermo. La
fascia è una vista animata sul driver nativo dentro l'header, che non
riceve tocchi; la vecchia linea fissa di `TabShell` sparisce. Il
contenuto resta sotto l'header, non dietro: in parte A il vetro non sfoca
niente, quindi farci passare il contenuto lo renderebbe solo meno
leggibile. Deciso dall'agente su delega dell'utente.
**A5c (#1391)**: Profilo, «Today» e «Days» dello sci mettono
`useHeaderScroll()` come le altre pagine. Una pagina pigra o il cambio di
modalità sci possono smontare uno scroller lontano dalla cima: l'hook,
smontandosi, rimette l'header a riposo, invece di lasciarlo in vetro sopra
una pagina in cima. «Resorts» non lo mette: lì il titolo e la ricerca sono
fissi e scorre solo la lista. Deciso dall'agente su delega dell'utente.
**A6 (#1403)**: i gruppi di Impostazioni prendono i bordi della pista dei
segmenti (`segmentTrackFace`) con la faccia `surface` invece del velo,
perché le righe sono testo lungo e il contrasto conta più del vetro. Un
nuovo passo dei raggi, `radius.group` = 24, tra `lg` (16) e `card` (28).
Un solo aiuto, `settingsGroupFace` / `useSettingsGroup`, in un file nuovo,
così ognuno dei 18 file cambia di una riga. Deciso dall'agente su delega
dell'utente.
**A6b (#1407)**: la scheda dell'account e la riga «Blocked people»
prendono `useSettingsGroup()` come gli altri gruppi. Il riquadro che
chiede prima di «Delete account» prende solo gli angoli (`radius.group`) e
tiene il bordo `color.error`: è un avviso, e il vetro lo farebbe sembrare
una riga qualsiasi. «Log out» e «Keep my account» restano come sono, già
capsule. Deciso dall'agente su delega dell'utente.
**A7a (#1453)**: `SheetModal` non disegna il foglio, ogni foglio ha il
suo stile; quindi un aiuto solo, `sheetFace` / `useSheetFace`, in un file
nuovo, messo dopo lo stile del foglio così vince sugli angoli e sul bordo
e lascia al foglio il suo padding. Sul vetro: angoli in alto a 28
(`radius.card`), il filo e la luce in cima disegnati dentro e un'ombra
verso l'alto; la faccia resta `surface` per il contrasto. Con «Riduci
trasparenza» la linea sottile di prima, con «Aumenta contrasto» il bordo
forte. Deciso dall'agente su delega dell'utente.
**A7b (#1455)**: l'isola è sempre scura, quindi prende il filo di luce
del vetro del tono scuro in ogni tono (`glassOf` col tono scuro) e
l'ombra corta del tono attivo; faccia e parole non cambiano. Deciso
dall'agente su delega dell'utente.
**A5c-2 (#1467)**: le schede del Feed restano montate tutte e due, quindi
`useHeaderScroll(active)` fa parlare solo lo scroller sullo schermo. Una
scheda nascosta va a riposo in un layout effect, che corre prima
dell'effect con cui la scheda mostrata dice dove si trova: l'ordine
delle schede nell'albero non conta. «Style» resta fuori per ora.
Deciso dall'agente su delega dell'utente.
**A7c-1 (#1472)**: gli altri chip prendono `glassRaise(useGlassMode())`
subito dopo il loro stile, una riga per componente, senza un componente
comune: ogni pagina ha il suo chip con forma e colori suoi, e riunirli
toccherebbe molto più codice. Un test legge i sorgenti e chiede che ogni
uso di `styles.chip` sia seguito dal rilievo. Deciso dall'agente su
delega dell'utente.
**A7c-2 (#1494)**: lo stesso rilievo su quattro schermate degli sport
(`TargetSteps`, `PaddleExplore`, `PoolDraw`, `DayChoices`), aggiunte alla
lista del test. Prende il rilievo solo un chip che si preme: le etichette
di testo e il segno di pausa che nel codice si chiamano «chip» restano
piatti, perché il rilievo dice «qui si tocca». Deciso dall'agente su
delega dell'utente.
**A7c-3 (#1509)**: i chip condivisi della palestra prendono il rilievo
nelle otto pagine che usano `gymStyles.chip`, non in `gymStyles.ts`: il
rilievo dipende dal modo di accessibilità, che si legge con un hook, e
uno stile condiviso non può farlo. Il controllo sui sorgenti conta ora
anche `gymStyles.chip`. Il pannello del percorso resta fuori: il suo
«chip» è un bottone secondario più stretto accanto ad altri bottoni
piatti. Deciso dall'agente su delega dell'utente.
**Correzione di A5b (#1534)**: A5b ha dato all'header `zIndex: 1`,
perché l'ombra della fascia cada sulle pagine. Con la nuova architettura
quello `zIndex` ordina dentro il più vicino antenato che resta una vista
sua: la radice di `TabShell` veniva appiattita, e l'header usciva sopra
le pagine aperte sopra l'app quando l'app sotto non era nascosta al
lettore di schermo, cioè per «Messages» aperto dalla sua scheda. Due
righe: `collapsable={false}` sulla radice di `TabShell`, che chiude lo
`zIndex` dentro lo shell per ogni pagina presente e futura, e `appUnder`
in `ProfileLayer` che conta anche «Messages», così sotto una
conversazione l'app è nascosta al lettore di schermo come sotto ogni
altra pagina. Deciso dall'agente su delega dell'utente.
**A7c-4 (#1624)**: i chip delle opzioni di volo prendono il rilievo come
gli altri, ma nel vetro dell'aspetto del volo e non del tono dell'app: la
schermata del volo ha un suo «Dark» e «Sunlight», e un'app scura col volo
in chiaro avrebbe messo l'ombra pesante del tono scuro sotto chip su
pagina bianca. `paletteFor` ricorda il vetro di ogni palette che crea.
Con questa la parte A è finita. Deciso dall'agente su delega dell'utente.

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

## ADR-0380 — Il sonno sul server: `sleep_nights`, una riga per notte pubblicata (mai i campioni), nel profilo col sì (`shared`), nel post dell'attività acceso in partenza (`sleep_shown`); si tiene solo quello che è pubblicato

**Stato**: Attiva · 2026-11-12 · TASK-467 parte B1 in `main` (#1211,
`71e24188`); sul server col passo dell'aggiornamento completo. Che cosa si
vede e si pubblica è dell'utente (`tasks/TASK-467.md`: «Resta acceso» nel
post, «Sì, profilo adesso» per la notte da sola, 2026-11-12); la strada
(una tabella a parte, mai una riga di `runs`) è del Coordinatore; il
contratto e il modo sono decisi dall'agente su delega dell'utente, numero
dal Coordinatore.

**Contesto**: il punteggio del sonno lo calcola il telefono (ADR-0379). Per
pubblicarlo serve che il server ne tenga qualcosa. Un post senza attività
non esiste (TASK-312 C è un piano), e una notte come corsa «senza traccia»
finirebbe in calendario, conteggi, record, classifiche e Strava. È un dato
sulla salute (GDPR art. 9; Apple 5.1.3): al server solo quello che l'utente
pubblica, in forma di riassunto.

**Decisione**:

1. **Una tabella a parte**, `sleep_nights` (migrazione `0072`): una riga per
   notte pubblicata, `UNIQUE (user_id, night)`, con punteggio, minuti
   dormiti e svegli, minuti per fase se un orologio li ha detti, `shared`.
   `ON DELETE CASCADE` da `users`. L'attività porta solo il riferimento
   (`runs.sleep_night_id`, `ON DELETE SET NULL`) e `runs.sleep_shown`.
2. **Mai i campioni, mai gli orari**: `night` è il giorno del risveglio;
   l'ora di andare a letto e di svegliarsi non lascia il telefono. La
   parola accanto al punteggio non si salva: la ricava l'app.
3. **Due interruttori separati**: `shared` (profilo) DEFAULT false, spento
   finché il proprietario non lo accende; `sleep_shown` (post) DEFAULT
   true, la scelta dell'utente. Il valore di partenza per l'app sta in una
   costante del contratto (`SLEEP_SHOWN_DEFAULT`): se la revisione di Apple
   lo contesta, si cambia lì.
4. **Si tiene solo quello che è pubblicato**: una notte che non è nel
   profilo e che nessuna attività porta si cancella. Lo fa `sleep.py`
   quando `shared` si spegne (risposta `204` al posto della notte) e lo fa
   il database, quando l'ultima attività la lascia o viene cancellata: la
   funzione `sleep_night_left()` e due trigger su `runs`,
   `runs_sleep_night_deleted` (`AFTER DELETE`) e `runs_sleep_night_changed`
   (`AFTER UPDATE OF sleep_night_id`), che scattano solo per una corsa che
   aveva una notte. **La logica sta nel database, non in `activities.py`**:
   vale per ogni strada che cancella una corsa o le toglie la notte, anche
   quelle scritte dopo. Tre casi coi test: attività cancellata, sonno
   tolto dall'attività, account cancellato (lì basta la cascata).
5. **Chi non è l'autore** legge una notte solo da `GET /users/{id}/sleep`
   (l'ultima condivisa, per chi può aprire il profilo, mai attraverso un
   blocco) e da `GET /drawings/{id}/sleep` (se vede il disegno e `shown` è
   acceso). Una notte non condivisa o nascosta risponde lo stesso `404` di
   una che non c'è; nessuna risposta le conta, openapi non ha esempi. Il
   profilo, il Feed e il dettaglio del post non ne dicono niente.
6. **Una chiamata sola dal post**: `PUT /me/activities/{key}/sleep` porta
   numeri, `night` e `shown`. «La notte prima» è `night` entro 2 giorni
   dall'inizio dell'attività, se no `422`. Più attività dello stesso giorno
   portano la stessa notte; rimandata, la notte prende i numeri nuovi.
7. **Endpoint propri, moduli degli altri intatti**: il profilo ha `GET
   /users/{id}/sleep` e non un campo di `GET /users/{id}`; niente di nuovo
   in `X-MuW-Reads` (li chiama solo un'app che li conosce).
8. **Esportazione**: non esiste un'esportazione automatica dei dati di un
   account; la copia chiesta per email si fa a mano, e la query per il
   sonno sta in `DATABASE.md`. La cancellazione è la cascata.

**Alternative scartate**: la notte come riga di `runs` senza traccia (entra
in calendario, conteggi, Strava); aspettare i post senza attività di
TASK-312 C; i numeri del sonno come colonne di `runs`, come il battito (la
notte condivisa da sola non avrebbe dove stare, e due attività dello stesso
giorno la terrebbero due volte); tenere sul server ogni notte calcolata
(più dati sulla salute di quelli pubblicati); una sola notte condivisa per
account (chiude la strada a una storia nel profilo: oggi si legge l'ultima,
e «smetti di condividere» le spegne tutte); pulire le notti orfane dal
codice che cancella le corse (`activities.py` è di altri, e ogni strada
nuova dovrebbe ricordarsene).

**Conseguenze**: B2 (app, il sonno nel post) e B3 (la scheda «Sleep» nel
profilo) usano questi endpoint. Il Feed e il dettaglio del post non dicono
se un post ha il sonno: lo aggiunge la parte B1b (un campo `sleep` nel
disegno visto, presente solo quando il sonno è mostrato; `drawings.py`,
nessuna migrazione), scritta dalla sessione di B2. Prima
dell'OTA di B2: la frase della privacy, «App Privacy», le note di
revisione (parte C, ognuna col sì dell'utente).

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

**Aggiunta 2026-11-24** (TASK-518, scelte dell'utente sulla tela «Compass ·
migliorie»: «1 e 2; la 3 dopo», poi «Niente etichetta»): «Compass» non è
più senza numeri. Sopra i pulsanti della corsa c'è una riga sola, piccola,
con quanta strada e quanto tempo («2.34 km · 12:05», gli stessi
`RunNumbers` di «Map», anche in pausa); il passo, la barra del percorso, la
riga del gioco e il battito restano fuori. Sotto la freccia del nord, solo
con la mappa che gira dove si guarda, la direzione scritta («NE · 42°»: le
sigle di `compassPoint`, già tradotte, e i gradi interi), che cambia con la
mappa; col nord in alto niente. Il resto di questa decisione non cambia.

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

## ADR-0345, precisazione D1 — «Together» sul server: la stessa corsa a metà del tempo e 2 km, i secondi dalla prima partenza, 600 punti scelti nel tempo

**Stato**: Attiva · 2026-11-21 · TASK-417 parte D1 (#1339, 11f354f1) ·
deciso dall'agente su delega dell'utente; le scelte di prodotto restano le
1–5 del task file (3: bastano tag e visibilità; 4: fino a 4 persone)

- **Un modulo nuovo**, `together.py`, con l'indirizzo
  `GET /drawings/{id}/together`, invece di un campo in `GET /drawings/{id}`:
  i tempi escono solo da qui, solo all'autore, e il dettaglio di un disegno
  resta senza tempi per tutti.
- **La stessa corsa**: le soglie della proposta, prese così come sono.
  Almeno il 50 % del tempo trascorso della più corta in comune (pause
  comprese, il tempo dalla prima all'ultima posizione), e i primi punti a
  meno di 2000 m. Il database sceglie prima le corse che si sovrappongono
  nel tempo (al più 20 per persona), il resto lo controlla Python; fra più
  corse buone vince quella con più tempo in comune.
- **Chi la può vedere**: la corsa di una persona taggata entra solo col suo
  disegno, e solo se `drawing_seen_sql` lo dà all'autore. Una corsa senza
  disegno è privata, quindi non entra.
- **L'orologio**: i secondi di ognuno sono il suo M più lo scarto fra la sua
  partenza e la prima del gruppo, al decimo di secondo. Lo scarto fra le
  partenze resta (serve al video); l'ora e la data no.
- **I 600 punti**: scelti nel tempo, non con Douglas-Peucker. Una scelta
  sulla forma toglierebbe i punti dei rettilinei, e il video li
  interpolerebbe a passo costante dove il passo vero cambiava. Sempre
  tenuti il primo, l'ultimo e i due bordi di ogni pausa; gli altri sono i
  più vicini a secondi equidistanti. Se i bordi delle pause sono più di
  600, se ne tengono 600 a distanza uguale, con i due estremi.
- **Nessun limite di frequenza nuovo**: l’indirizzo legge al più 1 + 10×20
  corse (al più 10 tag, 20 corse ciascuno), di un post dell’autore stesso.

**Conseguenze**: nessuna migrazione; sul server col passo 15. L'app (D2)
legge `fixtures/together.json`; un'API di prima risponde `404`, e l'app
tiene spenta la riga «Together».

## ADR-0397 — «Alimentazione»: un contacalorie senza diete, cibi da USDA più quelli dell'utente, bilancio senza doppi conti, tabella solo per il proprietario

**Stato**: Proposta · 2026-11-22 · TASK-489 (parte 0, soli documenti).
Dove sta la voce, la fonte dei cibi, calorie prima dei macronutrienti, il
piano a settimana, i dati solo sul telefono, chi vede la tabella, le parole
e l'uscita tutta insieme con la build nativa sono **scelte dell'utente**
(risposte 1–8 del task file); il resto è **deciso dall'agente su delega
dell'utente**, numeri dal Coordinatore (fork 3).

**Contesto**: l'utente vuole fra gli sport una voce «Alimentazione»: scrive
la sua dieta (sua o del dietologo), segna ogni giorno quello che mangia e
vede nel profilo i giorni a credito o a debito di calorie, contando tutte
le attività dell'hub privato, comprese quelle lette da Apple Salute. Il
consumo di un'attività e a riposo c'è già (`body/energy.ts`, ADR-0318);
MuW oggi scrive in Salute e legge solo il battito (ADR-0281).

**Decisione**:
- **MuW non fornisce diete, obiettivi né consigli alimentari**, nemmeno
  tramite l'AI: l'AI può interpretare le parole, i numeri li fa solo la
  tabella. Ogni numero è una stima e si chiama così. L'avviso approvato
  dall'utente compare alla prima apertura e, in piccolo, sempre.
- **L'ingresso** è una tessera «Nutrition» in una famiglia sua in fondo al
  pannello degli sport. Non è uno `Sport`: non entra nel registro né nel
  contratto, non ha percorsi e non si registra; toccarla apre la pagina e
  non cambia lo sport scelto. È un componente a sé, così TASK-490
  (ADR-0398) può montarlo nella sua schermata se l'utente lo sceglie.
- **I cibi**: un elenco di base di circa 300 cibi da **USDA FoodData
  Central** (pubblico dominio, CC0 1.0; la fonte è citata nell'app),
  costruito da uno script dallo scarico di USDA e da una lista di
  identificativi scelti a mano, più i **cibi dell'utente** (nome e kcal
  per 100 g). Open Food Facts (ODbL: attribuzione e ricondivisione delle
  basi mescolate; serve la rete) e le tabelle CREA (nessuna licenza di
  riuso trovata) restano fuori. Nessuna dipendenza nuova.
- **Calorie subito**; proteine, carboidrati e grassi per 100 g stanno già
  nella tabella e non si mostrano.
- **Il piano** è una settimana di quattro pasti al giorno con cibi e
  grammi; **il diario** è per giorno di calendario del telefono. «Eaten as
  planned» copia nel diario il piano com'è in quel momento: cambiare il
  piano dopo non riscrive i giorni passati. Un giorno senza voci è vuoto,
  non zero.
- **I dati restano sul telefono**, in file JSON (`expo-file-system`, come
  il corpo). Nessun indirizzo dell'API, nessuna migrazione. Il server è
  una parte dopo, con la sua decisione.
- **Il bilancio del giorno** = assunte − (riposo + attività). Il riposo è
  `restKcalPerMin` × 1440 (Mifflin-St Jeor). L'attività: se il giorno ha
  l'energia attiva di Salute vale quella da sola; altrimenti la somma
  delle attività dell'hub (`activeKcal`, `gymKcal`, `poolKcal`, e per un
  allenamento di un'altra app la sua energia attiva). **Nessun doppio
  conto**: un allenamento di Salute scritto da MuW si scarta; uno di
  un'altra app che si sovrappone a un'attività di MuW per più di metà
  della più corta conta una volta, quella di MuW. Un'attività conta nel
  giorno in cui parte.
- **I numeri letti da Salute non si salvano**: si rileggono quando la
  tabella si apre. Non vanno al server, non servono alla pubblicità
  (regola Apple 5.1.3).
- **La tabella** («Eaten», «Used», «Balance», «Surplus» o «Deficit» col
  segno, mai il colore da solo) sta solo nel profilo di chi è entrato: non
  è un campo del profilo pubblico, non è nel Feed, non si condivide.
- **Tutto insieme con la build nativa**: leggere da Salute allenamenti ed
  energia attiva chiede un testo del permesso nuovo
  (`NSHealthShareUsageDescription`, oggi solo il battito), quindi una
  build nativa e la revisione di Apple; su Android i permessi di lettura
  di Health Connect nel manifest. Le parti prima entrano in `main` spente
  dietro `NUTRITION_ON`, che si accende solo con quella build e dopo il
  sì dell'utente sulle schermate.

**Conseguenze**: file nuovi in `apps/mobile/src/nutrition/`; nessun
cambio al server né al contratto. Il testo del permesso di Salute va
scritto una volta sola insieme a TASK-467 C (sonno). Privacy, etichette
dell'App Store e di Google Play e «How we calculate» col sì dell'utente
prima dell'uscita. Limite noto: senza Apple Watch e senza scrittura in
Salute, in un giorno che ha energia attiva di Salute un'attività di MuW
conta solo per quanto Salute ha misurato dal telefono.

## ADR-0398 — La modalità Allenamento: scelta «Gym», MuW diventa un'app per allenarsi come con lo sci

**Stato**: Attiva · 2026-11-24 · TASK-490, parti A–E in `main` (#1424, #1433,
#1510, #1553, #1571); escono col prossimo OTA. Prima: Proposta (parte 0).
La barra, l'ingresso solo da «Gym» e il Cibo come pagina di TASK-489 sono
**scelte dell'utente** (2026-11-22, task file); le quattro tab finché il
Cibo è spento sono del Coordinatore, da far vedere all'utente nelle
schermate della parte A; il resto è **deciso dall'agente su delega
dell'utente**, numeri dal Coordinatore (fork 3).

**Contesto**: l'utente vuole che allenamenti, palestra e alimentazione
abbiano una schermata loro, «come quando entro nello sport Sci». La
modalità sci (ADR-0357) cambia la barra quando lo sport scelto è lo sci,
senza salvare niente di nuovo. Le parti della palestra ci sono già, ma
stanno sparse in «Draw» e nei fogli (ADR-0341, ADR-0392); il Coach è una
proposta senza numero; il Cibo è TASK-489 (ADR-0397).

**Decisione**:
- **Il modo è lo sport salvato**, come per lo sci: con `"gym"` scelto la
  barra è «Today» · «Workouts» · «Food» · «Feed» · «Profile», «Messages»
  in alto accanto allo sport. Nessuna impostazione nuova; scegliere un
  altro sport riporta l'app di sempre. «Stretching» non entra.
- **«Today» è la pagina «choose»**: ogni ritorno a «Draw» ci atterra;
  dentro c'è la palestra di «Draw» com'è (`GymDrawGuide`). Lasciando il
  modo, «Workouts» (che l'app non ha) porta a «Draw».
- **«Workouts»** mette in una pagina le schede, il mese, gli allenamenti
  fatti e lo storico degli esercizi, aprendo i fogli che esistono: i file
  della palestra si leggono soltanto, così TASK-488 non ha conflitti.
- **Il Coach** non ha una tab: una riga su «Today» e «My plans» aprono la
  sua pagina (parte C, quando il Coach ha numero). L'omino della settimana
  lo costruisce questo task (parte B, file nuovi) e il Coach lo riusa.
- **«Food»** monta la pagina «Nutrition» di TASK-489 così com'è, solo con
  `NUTRITION_ON`; fino ad allora la barra ha quattro tab.
- **Le regole dei tre modi** stanno in un file nuovo
  (`trainingmode/trainingMode.ts`) che `App.tsx` usa al posto di quelle di
  `skimode/skiMode.ts`; il file dello sci non cambia.

**Conseguenze**: nessuna dipendenza, nessun indirizzo dell'API, nessuna
migrazione; tutto con un OTA. `App.tsx` si tocca dopo TASK-481 A (#1421),
`SportButton.tsx` prima di TASK-489 B. Un utente che si allena e corre
cambia barra quando cambia sport, come lo sciatore.

**Precisazione (2026-11-23, parti A e B in `main`, #1424 e #1433)**:
- **Correzione della barra, anche per lo sci** (ok del Coordinatore,
  deciso dall'agente su delega dell'utente): lasciando un modo mentre si
  è su una sua pagina («Days», «Resorts», «Workouts») l'app ora atterra
  su «Draw» con la barra. Prima `App.tsx` guardava la barra nuova invece
  di quella lasciata e la barra spariva, anche nella modalità sci. La
  copre `trainingmode/trainingModeShell.test.tsx`.
- **L'icona di «Today»** è un manubrio nuovo
  (`assets/ui/tabs/dumbbell*.png`), con lo spessore delle linee Lucide.
- **L'omino della settimana** (parte B) usa il **rosa dei muscoli**
  (`color.muscle`, come la guida degli esercizi di ADR-0376), **scelta
  dell'utente** al posto dei verdi della bozza del Coach, in tre aspetti
  che non dipendono solo dal colore: contorno (1–4 serie), metà (5–9),
  pieno (10 o più), con la legenda «Sets» e un'etichetta per lo screen
  reader che elenca i muscoli per livello.
- **Come si contano le serie** (deciso dall'agente su delega
  dell'utente): una serie vale 1 per i muscoli principali dell'esercizio
  e ½ per i secondari; la settimana parte lunedì alle 00:00 dell'ora del
  telefono; la percentuale «of your body trained» è la media, sui 17
  muscoli, di min(serie / 10, 1). Dati: gli allenamenti del mese della
  palestra, le loro serie e quelle in attesa d'invio; senza account
  l'omino non c'è. Il Coach (ADR-0399) riusa `setsByMuscle` e
  `WeekBodyCard`.

**Precisazione (2026-11-24, parti C e D in `main`, #1510 e #1553)**:
- **La riga del Coach su «Today»** (deciso dall'agente su delega
  dell'utente, schermate approvate il 2026-11-23): sotto l'omino, il
  titolo del primo consiglio, o «Based on your last 4 weeks» se non ce
  n'è; apre la pagina del Coach sopra «Today». Senza account non c'è.
  Nessun testo nuovo.
- **«Food»** sta dopo «Workouts» solo con `NUTRITION_ON`
  (`trainingPagesOf`); monta la pagina «Nutrition» di TASK-489 com'è.
  Icona: le posate di Lucide (`assets/ui/tabs/utensils*.png`). La modalità
  Nutrition (TASK-514, ADR-0408) non cambia questa tab.

**Precisazione (2026-11-24, parte E: U4 e U5 della prova del 23-11)** —
**scelte dell'utente** con le domande della parte 0 di E:
- **L'ordine della barra è lo stesso in ogni modalità**: la casetta del
  Feed al primo posto e il Profilo all'ultimo, come nell'app di sempre; in
  mezzo le pagine della modalità. Palestra: Feed · Today · Workouts ·
  (Food) · Profile. Lo sci cambia allo stesso modo: Feed · Today · Days ·
  Resorts · Profile. La modalità Nutrition (TASK-514) farà lo stesso.
  «Messages» resta in alto; ogni modalità si apre ancora su «Today».
- **Niente scritte sotto le icone**, come in tutta l'app: la barra
  (`tabs/TabBar.tsx`) non cambia.
- **«Today» è adesso, «Workouts» è tutto il resto**: «Today» ha l'omino,
  il Coach e la scheda di oggi con «Start» e «Start without a plan»,
  nient'altro; «Workouts» ha le schede con i giorni e «New plan», il mese
  con gli allenamenti fatti, gli esercizi e «How it works» in fondo. Così
  «New plan» e il calendario non si ripetono. L'icona di «Workouts»
  diventa una lista al posto del calendario.

## ADR-0399 — Il Coach MuW: consigli da regole scritte con il loro studio, la scheda che cambia solo con «Apply»

**Stato**: Attiva · 2026-11-23 · TASK-491, A (#1427), B (#1457) e C
(#1476) in `main`; esce col prossimo OTA di produzione. Prima: Proposta
(parte 0, soli documenti).
«Apply», dove si apre, solo con account con l'omino, niente RPE e i
testi dei consigli sono **scelte dell'utente** (2026-11-22 e 23, task
file); l'omino di TASK-490 B e l'ordine dopo TASK-488 sono del
Coordinatore; il resto è **deciso dall'agente su delega dell'utente**,
numeri dal Coordinatore (fork 3).

**Contesto**: l'utente vuole un agente o un algoritmo che legga gli
allenamenti fatti, consigli i prossimi e modifichi le schede con metodi
scientifici. TASK-488 (ADR-0396) cambia già i passi di un giorno da come
l'utente dice che è andata; mancano i numeri: ripetizioni fatte, volume
per muscolo, km che salgono, pause, sonno.

**Decisione**:
- **Regole, non un modello AI.** Una funzione pura sul telefono prende gli
  allenamenti di 4 settimane e la scheda e rende i consigli: stessi dati,
  stessi consigli, un test per regola, niente rete oltre alle letture che
  ci sono, niente costo per utente. È il principio del progetto: l'AI non
  decide i numeri.
- **Tredici regole con il loro studio** (task file): doppia progressione e
  carico (ACSM 2009), stallo col massimale di Epley, volume (Schoenfeld
  2017) e frequenza (Schoenfeld 2016) per muscolo, 48 h di recupero, km
  oltre +30% (Nielsen 2014), 80/20 (Seiler 2010), scarico (Foster 1998,
  Bosquet 2007), pausa (Mujika 2000), OMS 2020. ACWR (Gabbett 2016) e
  sonno (Fullagar 2015) sono **soft**: mai una modifica della scheda.
- **Al massimo tre consigli**, prima la sicurezza, poi la progressione,
  poi l'equilibrio; ognuno con un «Why» che nomina lo studio.
- **«Apply» o niente**: i kg con i passi `adapt` di TASK-488, serie e
  ripetizioni nel `program` della scheda, col salvataggio che c'è; «Not
  now» nasconde il consiglio per 7 giorni sul telefono.
- **Solo con account**: lo storico sta sul server; senza account la
  pagina invita a crearlo e non chiede niente all'API.
- **L'omino** della settimana è quello di TASK-490 B; il Coach non ne
  disegna un altro.

**Conseguenze**: nessuna dipendenza, nessuna migrazione prevista (se ne
servisse una, la 0085 col sì del Coordinatore). Parte dopo TASK-488 A sul
server; gli ingressi in «My plans» e GymEnd dopo TASK-488 B (#1420). I
consigli sono generali, non medici: la pagina lo dice.

## ADR-0397, precisazione — Il codice a barre come parte a sé, i macronutrienti dopo, «My daily target» scritto solo dall'utente, il consumo correggibile a mano

**Stato**: Proposta · 2026-11-23 · TASK-489 (precisazioni 9–12 del task
file, soli documenti). Le tre risposte e la richiesta di correggere a
mano il consumo sono **scelte dell'utente**; come si tengono i prodotti
di Open Food Facts e come una correzione entra nel conto è **deciso
dall'agente su delega dell'utente**.

**Contesto**: il 2026-11-22 l'utente aveva risposto alla sessione di
TASK-490 (ADR-0398) «Diario completo»: codice a barre con Open Food Facts,
macronutrienti per pasto, in cima l'obiettivo del giorno. Tre punti non
coincidevano con ADR-0397: richiesti all'utente, uno alla volta.

**Decisione**:
- **Il codice a barre entra, come parte a sé (G)**: restano la tabella
  USDA e i cibi dell'utente; il lettore cerca il prodotto su Open Food
  Facts, un prodotto alla volta, con la rete. Il prodotto trovato diventa
  un cibo del telefono col suo codice e la scritta «from Open Food
  Facts», correggibile dall'etichetta. I prodotti restano separati dalla
  tabella USDA e MuW non pubblica una base mescolata; l'attribuzione
  (ODbL) è nell'app. Dal telefono esce **solo il codice letto**. La
  dipendenza nativa nuova è `expo-camera`, col sì dell'utente a chiederla;
  va nella stessa build nativa di «Nutrition». Niente ricerca per nome su
  Open Food Facts né copia dei suoi dati dentro l'app.
- **I macronutrienti restano dopo**: la prima uscita mostra solo le kcal.
- **In cima alla pagina** «Eaten», «Used (est.)» e «Balance»; l'utente può
  scrivere «My daily target» in kcal e vedere «Left». MuW non lo propone
  e non lo calcola: il divieto di obiettivi prodotti da MuW e l'avviso
  approvato restano interi. Il «Daily goal» calcolato da MuW è scartato.
- **Il consumo si corregge a mano** (richiesta dell'utente del
  2026-11-23): l'utente può scrivere le kcal al giorno che consuma a
  riposo, che prendono il posto della stima di Mifflin-St Jeor («set by
  you»), e correggere le kcal di ogni singola attività («edited»); in
  tutti e due i casi si torna alla stima togliendo la correzione. Le
  correzioni restano sul telefono, valgono per il bilancio e per la lista
  privata, e non cambiano le calorie del post né quelle scritte in
  Salute. In un giorno che ha l'energia attiva di Salute, un'attività
  corretta sposta il totale della differenza fra il numero corretto e
  quello che contava prima. `body/energy.ts` non cambia: la correzione
  si applica sopra, in `nutrition/`.

**Conseguenze**: la tab «Cibo» di TASK-490 monta la pagina di TASK-489
com'è. Il testo del permesso della fotocamera (oggi solo la foto da
ricalcare) e la riga della privacy sul codice mandato a Open Food Facts
vanno approvati dall'utente prima della build.

## ADR-0397, precisazione 2 — La tabella di base dei cibi da USDA SR Legacy e la pagina «Nutrition» in due PR

**Data**: 2026-11-23 · **Stato**: Proposta · **Task**: TASK-489 (A2, B)

**Contesto**: ADR-0397 dice «un elenco di base piccolo e curato da USDA
dentro l'app»; restava da scegliere l'edizione, come si costruisce il file
e dove stanno i nomi tradotti. L'utente ha detto sì alla parte A2 e allo
scarico dell'archivio, poi alle schermate e ai testi della parte B.

**Decisione** (decisa dall'agente su delega dell'utente, salvo dove è
detto che è dell'utente):

- **L'edizione**: USDA FoodData Central, **SR Legacy** (aprile 2018,
  7.793 cibi, CC0 1.0), non Foundation Foods: quest'ultima è aggiornata ma
  ha poche centinaia di cibi quasi tutti crudi, e mancano pasta cotta,
  pane e piatti comuni.
- **Nessun numero scritto a mano**: `tools/nutrition_foods.csv` elenca i
  cibi scelti (identificativo FDC, nome corto, descrizione di USDA);
  `tools/nutrition_table.py` legge l'archivio di USDA, riconosciuto dal
  suo SHA-256, e scrive `apps/mobile/src/nutrition/foodTable.ts`. Un
  identificativo che non corrisponde alla descrizione, un cibo senza
  energia o un numero che l'app non terrebbe fermano lo script. L'archivio
  resta fuori dal repository.
- **314 cibi**, crudo e cotto come voci diverse. Fuori le voci che USDA
  ha solo di marca e lo strutto (902 kcal per 100 g, sopra il massimo di
  900 dell'app): chi li vuole li aggiunge fra i cibi suoi.
- **La chiave** di un cibo della tabella è `usda-<identificativo FDC>`.
- **I nomi**: in inglese nella tabella; italiano, tedesco, spagnolo e
  francese scritti da MuW in `nutrition/foodNames/`, non in `i18n/`
  (cambiano con la tabella, non con le schermate). Si traducono solo i
  nomi: i numeri sono gli stessi in ogni lingua.
- **La pagina** (scelta dell'utente: schermate e testi approvati il
  2026-11-23): `NutritionPage`, con le viste «Diary» e «My plan», aperta
  dalla tessera «Nutrition» in una famiglia «Food» in fondo al pannello
  degli sport e, nella modalità Allenamento, dalla tab «Food» di TASK-490
  D. In due PR di codice (B1 e B2), tutte e due spente dietro
  `NUTRITION_ON`.

**Conseguenze**: per aggiungere un cibo si aggiunge una riga alla lista e
si rifà girare lo script con l'archivio; la fonte, l'edizione e la data
dello scarico stanno in testa a `foodTable.ts` e in «How we calculate».
«Used (est.)» e «Balance» in cima al diario si riempiono con la parte C1.

## ADR-0397, precisazione 3 — Le attività nel bilancio, la settimana nel profilo, il diario del telefono

**Data**: 2026-11-23 · **Stato**: Proposta · **Task**: TASK-489 (C1, D, F)

**Contesto**: le parti C1 (le attività nel conto del giorno), D (la
tabella nel profilo) e F (la privacy) avevano scelte lasciate «da vedere
con le schermate». L'utente ha visto schermate e testi di ognuna e ha
detto «Sì, approvo» il 2026-11-23.

**Decisione** — scelte dell'utente:

- **Oggi il riposo è contato fino a adesso**, e la pagina lo dice; nella
  tabella del profilo oggi è «so far» e **non entra nel totale della
  settimana** finché il giorno non è finito.
- **Un giorno senza diario è vuoto**, in tutte le colonne, e fuori dal
  totale: non è un giorno a zero calorie.
- Il riquadro del profilo c'è **solo dopo l'avviso di «Nutrition» letto**;
  surplus e deficit nello stesso colore, parole e non un giudizio.
- **Il diario è del telefono, non dell'account**: uscire dall'account o
  eliminarlo non lo cancella, e la privacy lo dice. Scartata: cancellare
  tutto all'uscita.

Decise dall'agente su delega dell'utente:

- **Le calorie di un'attività si stimano da quello che dice la lista
  privata**: sport, metri e tempo. La lista non porta il dislivello né le
  serie, quindi la palestra è contata dal solo tempo e un'escursione senza
  la salita: più grezze dei numeri a fine attività. Per questo la
  correzione a mano è accanto a ogni attività. Chiedere al server il
  dettaglio di ogni attività per un numero più fino è stato scartato:
  una richiesta per attività a ogni apertura del diario.
- La lista si legge dal contesto che l'app ha già
  (`useActivitiesDoor()`); per un giorno o una settimana più vecchi delle
  pagine tenute si chiedono le pagine dopo. **Una pagina che non arriva
  non si richiede da sola**: quei giorni contano solo il riposo, e la
  scheda lo dice.
- Con `NUTRITION_ON` spento la riga della lista privata e il riquadro del
  profilo non leggono niente dal telefono e non rendono niente di nuovo.

**Conseguenze**: con la C2 l'energia attiva di Salute prende il posto
della somma delle attività nei giorni che ce l'hanno (già previsto nei
conti di A1). Se un giorno servisse cancellare il diario all'uscita, è
codice nuovo e un testo di privacy diverso.

## ADR-0397, precisazione 4 — Il codice a barre su Open Food Facts e il lettore unico degli allenamenti di Salute

**Data**: 2026-11-23 · **Stato**: Proposta · **Task**: TASK-489 (G, C2)

**Contesto**: le parti G (il codice a barre) e C2 (la lettura da Salute)
sono legate alla build nativa, ma quasi tutto il loro codice non lo è.
L'utente ha visto schermate e testi di ognuna e ha detto «Sì, approvo» il
2026-11-23.

**Decisione** — scelte dell'utente:

- Il codice a barre si può **scrivere a mano** («Type the code»), oltre a
  leggerlo con la fotocamera.
- Gli allenamenti delle altre app letti da Salute compaiono **solo in
  «Energy you use»**, non nella lista «My activities».
- L'app si presenta a Open Food Facts con l'indirizzo di contatto che già
  pubblica nella privacy.
- La frase in fondo a «How we calculate» dice che un codice a barre
  cercato va a Open Food Facts.

Decise dall'agente su delega dell'utente:

- **Due PR per parte**: quello che non è nativo entra in `main` spento
  (G1: la richiesta a Open Food Facts e il passo «Type the code»; C2a: il
  lettore e il conto), il nativo resta in bozza fino al taglio della build
  (G2: `expo-camera` e il lettore; C2b: accendere `HEALTH_ENERGY_ON`).
- **Open Food Facts**: una richiesta dal telefono per ogni codice letto o
  scritto da una persona, senza account, col `User-Agent` che loro
  chiedono; l'API v2 (`status` 1 o 0), provata dal vivo. Si prende **solo
  `energy-kcal_100g`**: un prodotto che ha solo i kilojoule non diventa un
  cibo, perché MuW non scrive numeri suoi. Il prodotto trovato è un cibo
  dell'utente col suo codice e «from Open Food Facts», separato dalla
  tabella USDA (ODbL); riscritto dall'utente perde il segno e tiene il
  codice. Un codice già salvato non si chiede di nuovo.
- **Un lettore unico degli allenamenti** in `health/energyReader.ts`, per
  TASK-489 C2 e TASK-312 D: `workouts(da, a)` è il punto d'ingresso.
  `health/energyModules.ts` non dà nessun lettore e non carica la libreria
  finché la build non ha il testo del permesso, come `sleepModules.ts`.
- I numeri di Salute si leggono quando una schermata li mostra e non si
  salvano; mentre arrivano il giorno non dice niente; un Salute che non
  risponde, o un permesso negato, è un giorno senza dati.
- Un allenamento di Salute è di MuW (e non si conta due volte) se viene
  dal bundle di MuW o porta la chiave di un'attività della lista.

**Conseguenze**: il testo unico del permesso di Salute lo scrive la PR di
TASK-467 C al taglio; la C2b di questo task è una riga. Android resta
sulla somma delle attività fino alla build con Health Connect.

## ADR-0402 — I gruppi per uscire insieme: le uscite sono le corse di gruppo con `group_id`, anche senza percorso

**Stato**: Proposta · 2026-11-23 · TASK-495 (parte 0, soli documenti).
Le dieci scelte di `GRUPPI.md` (ingresso, ruoli, pagina, uscite, chat,
scoperta, notifiche, avviso dell'alpinismo, cosa resta fuori) sono
**scelte dell'utente** del 2026-11-23, una domanda alla volta; il resto è
**deciso dall'agente su delega dell'utente**; numeri dal Coordinatore
(fork 3).

**Contesto**: l'utente vuole gruppi per camminare, pedalare e fare
alpinismo insieme. Le corse di gruppo di TASK-309 (ADR-0269) sono uscite
singole con percorso, e `EVENTI.md` §13 lasciava fuori i club. Due fatti
pesano: una corsa di gruppo vuole sempre un percorso, e l'alpinismo è
registrato senza (ADR-0373); la chat di oggi è solo fra due (una
conversazione per coppia, ADR-0279).

**Decisione**:
- **Le uscite di un gruppo sono corse di gruppo**, nella stessa tabella,
  con un `group_id` facoltativo e la visibilità `group`: niente secondo
  modello di evento. «I'm going», promemoria, cambi, annullamento,
  segnalazioni e limiti restano quelli di `EVENTI.md`.
- **Uscite senza percorso**: il percorso diventa facoltativo solo per
  queste, con il punto di ritrovo e una `destination` scritta (80).
  Servono all'alpinismo e agli sport `recordOnly`.
- **Tabelle nuove** per gruppi, membri (col ruolo e «Mute»), richieste e
  inviti; un solo admin per gruppo con un indice unico parziale.
- **L'elenco dei membri lo vedono solo i membri**, in ogni modo
  d'ingresso; chi è fuori vede il numero. Con la riga del profilo visibile
  solo a sé, l'appartenenza non si legge da fuori: è il dato nuovo della
  privacy.
- **La zona è una città** con un punto arrotondato a ~1 km: la vicinanza
  di Explore (50 km, `FEED_NEAR_M`) senza tenere un indirizzo.
- **Chi esce o è rimosso** perde le sue uscite in arrivo nel gruppo, con la
  push di annullamento di sempre: un'uscita dei soli membri senza il suo
  organizzatore dentro il gruppo non avrebbe chi la tiene.
- **Un gruppo nascosto** da una segnalazione lo vedono solo i membri: non
  compare in Explore e non entra nessuno; niente si cancella (TASK-291).
- **La chat di gruppo è una parte a sé (E)**, dopo le altre: è un pezzo
  nuovo, non un riuso della chat a due.

**Conseguenze**: nessuna dipendenza, nessun modulo nativo: esce con un
OTA. Una migrazione nella parte A (numero dal Coordinatore con la lista
dei file), e una nella parte C per le colonne di `group_runs`. La parte C
tocca i file di TASK-309 (B2 e C ancora aperte): la lista al Coordinatore
prima. La privacy va in `main` prima dell'OTA che accende i gruppi. Le
corse di gruppo senza gruppo restano come oggi.

## ADR-0402, precisazione A — L'API dei gruppi: la foto quadrata del profilo, l'admin di prima diventa membro, un invito a chi ha chiesto lo fa entrare, «Recent activity» solo dai post di una corsa degli sport del gruppo

**Stato**: Attiva · 2026-11-24 · TASK-495 parti A (#1538) e A2 (#1543).
**Deciso dall'agente su delega dell'utente**; le regole di `GRUPPI.md`
§2–§10 restano le scelte dell'utente.

**Contesto**: la proposta lasciava aperti alcuni come: la foto, cosa
succede a chi passa il ruolo, a chi ha chiesto quando arriva un invito o
il gruppo diventa Public, cosa entra in «Recent activity».

**Decisione** (`GRUPPI.md` §12, «Scelte della parte A»):
- la foto del gruppo è `profile_photos.square_jpeg` (256 px), con la copia
  piccola delle persone nelle schede: nessun codice d'immagine nuovo;
- passato il ruolo, l'admin di prima è membro; un co-admin toglie solo i
  membri;
- un invito a chi ha già chiesto, o un gruppo che diventa Public, fa
  entrare chi aspettava, fino a 300;
- Explore: la ricerca per nome (2 caratteri o più) vale ovunque; senza
  nome serve il punto del telefono;
- un admin nascosto da una segnalazione nasconde il suo gruppo a tutti
  (`follows.apart_sql` com'è);
- «Recent activity» legge i post di una corsa di uno sport del gruppo, con
  `drawings.shown_sql` e le schede del Feed, senza toccare `feed.py`;
- `group_outing_new` arriva con le uscite (parte C).

**Conseguenze**: una migrazione sola (`0087_groups.sql`); `feed.py` e
`drawings.py` invariati. Chiudere un gruppo con membri dentro non c'è:
l'admin passa il ruolo o resta; se serve, lo decide l'utente con le
schermate della parte B.

## ADR-0293, precisazione (TASK-509) — La figura delle pagine vuote si disegna una volta e resta intera; il pulsante quando c'è una cosa da fare; la sagoma grigia nelle tessere senza percorso

**Stato**: Attiva · 2026-11-26 · TASK-509 parti A (#1628), B (#1612) e C
(#1640). **Le scelte sono dell'utente** (cinque risposte del 2026-11-26,
`tasks/TASK-509.md`); il come è **deciso dall'agente su delega
dell'utente**.

**Contesto**: ADR-0293 voleva nella pagina vuota una sagoma in `border`
con «i primi tratti in giallo, come una corsa appena cominciata», ferma.
Nella prova del 2026-11-23 quei pochi tratti si leggevano come un
caricamento che si era bloccato (U3). Le pagine vuote non dicevano che
cosa fare; le voci di «Add to Feed» erano solo testo (U15); una tessera il
cui percorso non c'era ancora era un riquadro nero (U12).

**Decisione**:
- `EmptyState` disegna la figura **una volta**, in giallo, in
  `EMPTY_DRAW_MS` (1,4 s), e la lascia intera; con «Riduci movimento» è
  intera subito. Vale per tutte le pagine che lo usano. Il titolo è
  facoltativo: una pagina che ha già il suo nome in alto non lo ripete.
- Una pagina vuota ha **un pulsante** quando c'è una cosa sola da fare:
  «Record now» e «Log in» nel Feed «All», «Go to your workouts» nel Coach
  (che lì non mostra la scheda del corpo né il sottotitolo), «My position»
  in «Explore» senza partenza. Resta «al più un'azione».
- Le voci di «Add to Feed» hanno un'icona a linea di Lucide (PNG bianchi a
  tre densità, colorati da `tintColor`, come sotto un post: TASK-444). La
  mappa delle icone sta accanto alle voci, tipizzata sugli id: una voce
  nuova senza icona non compila.
- Una tessera di `RouteCard` senza linea e senza foto mostra la **sagoma
  della forma** (`ShapeGlyph`, il contorno del catalogo) in `borderStrong`,
  al centro, più piccola di un percorso. Mai gialla: il giallo è del
  percorso, e la sagoma se ne va quando la linea arriva. Le tessere delle
  parole restano vuote: le lettere non sono sul telefono.

**Conseguenze**: nessuna dipendenza, nessun file nativo, un solo testo
nuovo («Go to your workouts», nelle cinque lingue). Supera, per la sola
figura, «i primi tratti in giallo» di ADR-0293; il resto di ADR-0293 vale.
L'icona accanto a «Explore» nella pagaia non è di questo task.
