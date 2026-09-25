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
toccare) sono neutri, su `surfaceRaised`. Il segnaposto della partenza è
chiaro (`text`): quello di MapLibre è un azzurro che si confonde con il
ciano di «Start here».

| Token | Colore | Per cosa |
|---|---|---|
| `accent` | `#FFD02B` | il percorso e il comando che lo produce, «Draw route» |
| `onAccent` | `#0A0A0B` | testo e icone sul giallo |
| `background` | `#0A0A0B` | il fondo dell'app, nero neutro |
| `surface`, `surfaceRaised` | `#141416`, `#1A1A1D` | campi, schede, il pannello sopra la mappa; una superficie sopra un'altra |
| `border`, `borderStrong` | `#26262A`, `#33333A` | divisioni; bordi dei comandi |
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

## Le due schermate

Due, senza librerie di navigazione (TASK-051, scelta dell'utente):

1. **«What to draw»**, all'apertura. Dall'alto: il nome «Sgrava» con il
   pulsante «My position»; una scheda che dice da dove partirà il percorso,
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

## La partenza

È un punto `(lat, lon)` con la sua origine, `gps` o `search`, e diventa lo
`start` del `RouteRequest`.

| Situazione | Riga di stato | Cosa c'è in più |
|---|---|---|
| In attesa del GPS | «Finding your position…» | — |
| GPS riuscito | «Starting from your position.» | — |
| Permesso negato | «Location is off for ShapeRoute…» | «Open Settings», ricerca |
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
- La richiesta parte all'invio, non a ogni lettera, e mai con il campo
  vuoto: Photon chiede un uso corretto.
- Al massimo 5 risultati. Ognuno si legge come nome e prima area più ampia
  diversa dal nome: «Via Rodolfo Belenzani, Trento», «Levico Terme,
  Provincia di Trento». Le etichette uguali si mostrano una volta sola (una
  via spezzata in più tratti OSM torna una volta per tratto).
- Sotto i risultati, «© OpenStreetMap contributors».
- Nessun risultato: «No place found. Try adding the city.» Errore di rete o
  del servizio: «The search failed. Check the connection and try again.»

## Forma e distanza

La forma si sceglie toccando una tessera, che scrive il nome nel campo, o
scrivendo nel campo. I simboli delle tessere sono caratteri (♥ ★ ◯ ☾ e le
emoji di gatto, pesce, cavallo): disegnare i contorni veri vuole
`react-native-svg`, una dipendenza non ancora chiesta.

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

- Anche al plurale («stelle», «hearts»), con l'articolo («una stella»,
  «l'amore»), con maiuscole e accenti qualsiasi. La tabella sta in
  `shapeWords.ts`.
- Una parola che non è il nome della forma la conferma sotto il campo:
  «cavallo» mostra «→ horse».
- Il campo vuoto: «Unknown shape. Try: circle, heart, star, horse, moon,
  cat or fish.» e «Draw route» resta spento.
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
| calcolo | «Drawing a 15 km heart…» |

Forma e distanza non si cambiano durante l'attesa.

- Fino a 10 km il percorso di solito arriva in 5–35 s, da 15 a 21 km in
  30–50 s; una zona nuova aggiunge il suo download, circa 105 s per un
  21 km (`API.md`, «Tempi»).
- Dopo 5 minuti l'app smette di aspettare e dice all'API di lasciar
  perdere.
- Due errori di rete di fila durante l'attesa si perdonano; al terzo l'app
  dice che l'API non si raggiunge.
- «Cancel» interrompe l'attesa e dice all'API di lasciar perdere: una
  richiesta in coda non parte, una in download si ferma prima di calcolare.
- Una partenza, una forma o una distanza nuove tolgono il percorso e
  l'esito di prima.

## Il risultato

Sulla mappa la linea del percorso, inquadrata. Sotto, la distanza in grande
(«4.0 km») e «on roads · target 5 km»; poi gli avvisi del motore, uno per
riga, e «Export GPX» largo (sotto, «Export del GPX»).

Gli avvisi sono **in parole semplici** (TASK-054, ADR-0048): l'app
riconosce i testi che il motore scrive e li riscrive brevi, con una
striscia arancio (`warning`) per quelli a cui fare attenzione (scale,
strade principali, gallerie, forma poco fedele, pochi tratti di strada) e
grigia per quelli da sapere (partenza spostata, distanza diversa da quella
chiesta, strade ripercorse); prima quelli a cui fare attenzione, e la
stessa frase una volta sola. Un testo che l'app non conosce resta com'è,
in inglese. La somiglianza non si mostra come
numero: la forma la giudica l'occhio (`PRODUCT.md`), e sotto 0,90 il
motore aggiunge già un avviso. Il segnaposto resta sulla partenza chiesta.
Se il percorso comincia a più di 50 m da lì, perché il motore ha spostato la
forma dove ci sta (fino a 2 km, ADR-0040), un secondo segnaposto ciano con
l'etichetta «Start here» segna dove andare, e la mappa inquadra tutti e due;
l'avviso dice di quanto e in che direzione.

## La navigazione

Sotto il risultato, «Start» giallo, quando il percorso ha le indicazioni di
svolta (TASK-049, ADR-0052). Si resta sulla schermata della mappa: al posto
di «←» un banner con la prossima svolta (freccia gialla, distanza dal GPS
dal vivo, «Turn left onto Via Roma», e una seconda riga per le svolte a
pochi metri da leggere insieme); sotto, i km rimasti e «Stop», che torna al
risultato. La mappa segue la posizione, vicina (zoom 17), e dopo «Stop»
inquadra di nuovo il percorso.

Ogni svolta si dice a voce 50 m prima, in inglese come il resto dell'app
(«In 50 metres, turn left onto Via Roma, then turn right onto the
footpath»), con una vibrazione. Una via senza nome è «the footpath», «the
path», «the road»: mai un nome inventato. Oltre 40 m dal percorso il banner
diventa arancio, «Off the route», e la voce lo dice una volta; il percorso
non si ricalcola. Alla fine, «You have arrived». Funziona con lo schermo
acceso e l'app aperta; la posizione non esce dal telefono.

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
| Dati OSM non scaricabili (`map_data_unavailable`) | Map data for this area could not be downloaded. Try again later. |
| Errore del motore (`engine_error`) | The route engine failed. Try again; if it happens again, look at the API log. |
| L'AI non risponde (`ai_unavailable`) | The AI that reads shape words is not running on the PC (Ollama). These words work without it: circle, heart, star, horse, moon, cat or fish. |
| `invalid_request`, `http_error`, risposta illeggibile | The app and the API do not agree (a bug): … |
| API non raggiungibile | Cannot reach the API at http://…:8000. Start it on the PC with --lan, on the same Wi-Fi. |
| Nessun risultato in 5 minuti | The API took more than 5 minutes. Try again later, or a shorter distance. |
| L'API non conosce più la richiesta (riavviata) | The API lost this request (was it restarted?). Try again. |
| Indirizzo dell'API sconosciuto | The app does not know where the API is: open it from the QR code of npm run mobile on the PC. |

## Cosa esce dal telefono

- **La partenza**: va all'API sul PC, in rete locale, con forma e
  distanza. L'API non la scrive nel log. Se la zona non è in cache, il PC
  la scarica da Overpass, che vede quale area si chiede.
- **Le parole della forma** che la tabella non conosce: vanno all'API sul
  PC, e da lì al modello in Ollama, sullo stesso PC. Non escono dalla rete
  di casa; il log dell'API le scrive, con la forma scelta.
- **Le tile**: il provider vede quale zona si guarda, come con ogni mappa.
- **La ricerca**: il testo cercato arriva a Photon (komoot).
- **La libreria**: MapLibre GL JS arriva da unpkg a ogni avvio a freddo.

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
- Rigenerare o scegliere fra percorsi alternativi.
- Contorni disegnati delle forme e cursore della distanza: vogliono
  dipendenze (TASK-051).
