# UI — Interfaccia mobile

> Scritto con TASK-021 (mappa, posizione, ricerca del luogo) e TASK-023
> (forma, distanza, percorso); la distanza libera con TASK-026. Le domande
> ancora aperte stanno in fondo.

## Cosa è deciso

- React Native + Expo + TypeScript; si prova con Expo Go (ADR-0028).
- La mappa è una pagina MapLibre GL JS dentro una WebView, con le tile di
  OpenFreeMap (ADR-0029). Non MapLibre React Native: in Expo Go non gira.
- I percorsi li chiede all'API sul PC (ADR-0030, ADR-0031); mappa e
  ricerca del luogo chiamano direttamente due servizi esterni (ADR-0029).
- Testi in inglese, come il codice; le traduzioni verranno dopo.

## La schermata

Per ora è una sola, senza navigazione. Dall'alto:

1. **Pannello**: il titolo con il pulsante «My position», una riga che
   dice da dove partirà il percorso e, quando servono, il rimando alle
   Impostazioni, la ricerca del luogo e l'errore della mappa.
2. **Mappa**: all'apertura l'Italia intera, poi la partenza con un
   segnaposto, a zoom 15 (qualche via attorno); con un percorso, la linea
   e la mappa inquadrata su di lui. Si sposta e si ingrandisce con le dita
   o con i pulsanti + e −. L'attribuzione dei dati è sempre visibile in
   basso, per intero; i suoi link si aprono nel browser del telefono.
3. **Pannello del percorso**: forma, distanza, «Draw route», poi l'attesa
   e l'esito.

I pannelli stanno fuori dalla mappa, così non coprono l'attribuzione; i
margini seguono la tacca e la barra in basso di ogni telefono.

## La partenza

È un punto `(lat, lon)` con la sua origine, `gps` o `search`, e diventa lo
`start` del `RouteRequest`.

| Situazione | Riga di stato | Cosa c'è in più |
|---|---|---|
| In attesa del GPS | «Finding your position…» | — |
| GPS riuscito | «Starting from your position.» | — |
| Permesso negato | «Location is off for ShapeRoute…» | «Open Settings», ricerca |
| GPS spento, errore, nessuna risposta in 15 s | «Your position is not available right now…» | ricerca |
| Luogo scelto dalla ricerca | «Starting from Via Rodolfo Belenzani, Trento.» | ricerca, per cambiarlo |

«My position» rilegge il GPS e chiede di nuovo il permesso, se il telefono
lo permette ancora. Quando il GPS risponde, vince anche su un luogo cercato
prima, e la ricerca sparisce. Ogni nuova partenza, anche nello stesso
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

La forma si sceglie fra pulsanti, `circle` e `heart`; la forma libera
arriva con la fase 4. La distanza si scrive in un campo in km con il
tastierino numerico (ADR-0034):

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

Di partenza cuore e 5 km. L'attività è sempre `running` e non si mostra.
Il tastierino non ha il tasto invio: si chiude toccando «Draw route», e
mentre è aperto la mappa si accorcia perché non copra il campo.

## Chiedere un percorso

«Draw route» è spento finché non c'è una partenza. Toccato, la richiesta va
all'API in due tempi (ADR-0032): l'API la accetta subito, poi l'app chiede
ogni 2 s a che punto è. Il pannello dice cosa sta succedendo, sempre con i
secondi che passano, e offre «Cancel»:

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

Sulla mappa la linea del percorso, inquadrata. Sotto, «4.0 km on roads
(target 5 km)», gli avvisi del motore **così come sono**, in inglese, uno
per riga, e il pulsante «Export GPX» (sotto, «Export del GPX»). Gli
avvisi dicono per esempio che la partenza è stata spostata, o che la forma
somiglia meno di quanto dovrebbe. La somiglianza non si mostra come
numero: la forma la giudica l'occhio (`PRODUCT.md`), e sotto 0,90 il
motore aggiunge già un avviso. Il segnaposto resta sulla partenza chiesta;
se il motore l'ha spostata (fino a 500 m), lo dice l'avviso.

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
| Forma che non ci sta (`shape_not_drawable`) | This shape does not fit the roads here. Try another distance, shape or start. |
| Dati OSM non scaricabili (`map_data_unavailable`) | Map data for this area could not be downloaded. Try again later. |
| Errore del motore (`engine_error`) | The route engine failed. Try again; if it happens again, look at the API log. |
| `invalid_request`, `http_error`, risposta illeggibile | The app and the API do not agree (a bug): … |
| API non raggiungibile | Cannot reach the API at http://…:8000. Start it on the PC with --lan, on the same Wi-Fi. |
| Nessun risultato in 5 minuti | The API took more than 5 minutes. Try again later, or a shorter distance. |
| L'API non conosce più la richiesta (riavviata) | The API lost this request (was it restarted?). Try again. |
| Indirizzo dell'API sconosciuto | The app does not know where the API is: open it from the QR code of npm run mobile on the PC. |

## Cosa esce dal telefono

- **La partenza**: va all'API sul PC, in rete locale, con forma e
  distanza. L'API non la scrive nel log. Se la zona non è in cache, il PC
  la scarica da Overpass, che vede quale area si chiede.
- **Le tile**: il provider vede quale zona si guarda, come con ogni mappa.
- **La ricerca**: il testo cercato arriva a Photon (komoot).
- **La libreria**: MapLibre GL JS arriva da unpkg a ogni avvio a freddo.

## Quando la mappa non si carica

La pagina avvisa l'app se lo script di MapLibre non arriva (anche con un
hash SRI che non torna) o se non si carica lo stile. Una tile mancante,
dopo, non è un errore. L'app mostra «The map could not load (motivo).
Check the connection and reopen the app.» invece di uno schermo bianco. Se
iOS chiude la pagina per liberare memoria, la WebView la ricarica da sola.

## Domande ancora aperte

- Forma libera e forme nuove (`ROADMAP.md`, fase 4).
- Distanze oltre i 21 km: aspettano un download delle zone più veloce
  (ADR-0009).
- Miglia al posto dei km.
- Avvisi in parole semplici: servono codici negli avvisi del contratto.
- Rigenerare o scegliere fra percorsi alternativi.
- Navigazione, quando le schermate saranno più di una.
