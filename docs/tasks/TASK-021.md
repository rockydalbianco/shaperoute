# TASK-021 — Mappa e posizione GPS

**Stato**: In corso
**Fase**: 2 · **Branch**: `feat/TASK-021-map-location`

## Obiettivo

Aprendo l'app sull'iPhone con Expo Go, l'utente vede una mappa interattiva
centrata sulla sua posizione GPS, con l'attribuzione dei dati; se la
posizione non è condivisa, può cercare una città o una via e partire da
lì; se la mappa non si carica, l'app lo dice invece di restare vuota.

## Contesto da leggere

- `docs/UI.md` (stub: si scrive qui, solo la parte di questo task)
- `docs/PRODUCT.md` «Che cosa deve fare il MVP», punto 1
- `docs/DECISIONS.md` ADR-0011 (aperta), ADR-0024 (tile OSM e loro
  policy), ADR-0028
- `docs/ARCHITECTURE.md` §4 (regole di dipendenza)
- `docs/TESTING.md` «Test automatici»
- `docs/SETUP.md` passo 9 (Expo Go sull'iPhone)
- `apps/mobile/App.tsx`, `apps/mobile/__tests__/App.test.tsx`,
  `packages/shared-types/src/index.ts` (`LatLon`)

## Cosa c'è già

App Expo SDK 57 con una schermata (titolo e forme da `shared-types`) e uno
smoke test Jest. L'utente prova su **iPhone** con Expo Go, da un **PC
Windows**, solo con strumenti gratuiti. Expo Go contiene già
`react-native-webview` 13.16.1, `react-native-maps` 1.27.2 ed
`expo-location` ~57.0.19; **non** contiene MapLibre React Native.
In `.env.example` ci sono `MAP_TILES_URL` e `MAP_TILES_API_KEY`, commentate
e mai usate.

## Cosa fare

1. **Confermato dall'utente il 2026-09-23** (A, B e D come proposte; C
   cambiata dall'utente). La nuova ADR si scrive nella PR che implementa.
   - **A. Mappa: WebView con MapLibre GL JS e tile OpenFreeMap.** L'app
     scrive una pagina HTML e la apre in `react-native-webview`. MapLibre
     GL JS (licenza BSD-3) da CDN, con versione fissata e hash SRI come
     Leaflet in ADR-0024. Stile vettoriale di
     [OpenFreeMap](https://openfreemap.org): dati OpenStreetMap, gratuito,
     senza chiave né account, uso commerciale ammesso. Attribuzione sempre
     visibile, non compressa dietro l'icona «i».
     Perché: sono gli stessi dati OSM su cui traccia il motore, quindi i
     sentieri e i vialetti del percorso si vedono anche sulla mappa; stessa
     mappa su iPhone e Android; resta MapLibre, e stile e provider si
     riusano tali e quali se un giorno si passa a MapLibre nativo. Costi:
     un ponte di messaggi fra app e pagina; più lenta di una mappa nativa;
     senza rete non arrivano né la libreria né la mappa; OpenFreeMap vive di
     donazioni e non garantisce nulla, per questo l'URL dello stile sta in
     una sola costante.
     Scartate:
     - `react-native-maps`: su iPhone è Apple Maps, non i dati OSM del
       motore, quindi sentieri e passaggi pedonali possono mancare e il
       percorso sembrerebbe tagliare nel vuoto; su Android è Google Maps,
       che in una build vera vuole una chiave di Google Cloud con un
       account di fatturazione;
     - MapLibre React Native (quello che dice oggi `UI.md`): non gira in
       Expo Go, e su un iPhone vero la *development build* chiede un Mac o
       l'Apple Developer Program a pagamento;
     - Leaflet con le tile standard OSM (ADR-0024): la loro policy tollera
       l'uso leggero e personale, non un'app distribuita.
   - **B. Posizione**: `expo-location`, solo in primo piano. Una lettura
     all'apertura e un pulsante per rileggerla e ricentrare la mappa. La
     posizione resta nel telefono: nessuna chiamata di rete oltre a
     libreria e tile (che, come per ogni mappa, dicono al provider quale
     zona si sta guardando).
   - **C. Senza posizione** (permesso negato, GPS spento, errore): mappa
     sull'Italia intera, un messaggio con il motivo (se il permesso è
     negato, il rimando alle Impostazioni) e un **campo per cercare una
     città o una via**. Il luogo scelto diventa la partenza.
     - Geocoding con **Photon** (`photon.komoot.io`): servizio pubblico di
       komoot, gratuito, senza chiave, con dati OpenStreetMap; «uso
       corretto», nessuna garanzia di disponibilità. URL in una sola
       costante. Il testo cercato arriva al server di komoot: va detto in
       `UI.md`.
     - Scartati: il geocoder del telefono (`geocodeAsync` di
       `expo-location`), che su Android vuole proprio il permesso di
       posizione mancante e restituisce solo coordinate, senza nomi fra cui
       scegliere; Nominatim, che per le app chiede un server intermedio con
       cache e al massimo una richiesta al secondo sommando tutti gli
       utenti.
   - **D. Dipendenze nuove**: `react-native-webview` ed `expo-location`,
     installate con `npx expo install` (versioni dell'SDK 57, licenza
     MIT). MapLibre GL JS solo da CDN, non da npm; Photon con il `fetch` di
     React Native. Nessuna dipendenza di sviluppo nuova.
     → Aggiunta durante il lavoro, confermata dall'utente il 2026-09-23:
     `react-native-safe-area-context` (~5.7.0, MIT, dentro Expo Go), perché
     il `SafeAreaView` di React Native è deprecato.
2. **Pagina della mappa** (`apps/mobile/src/map/`):
   - una funzione pura che scrive l'HTML, con versione e SRI di MapLibre
     GL JS e URL dello stile in costanti, controlli di attribuzione e zoom,
     nessuna chiave;
   - messaggi tipati: app → pagina `setPosition` con un `LatLon`; pagina →
     app `ready` ed `error` (anche quando lo script non si carica);
   - la conversione da `[lat, lon]` a `[lon, lat]` di MapLibre e GeoJSON
     sta in **una sola funzione**, usata anche per le risposte di Photon;
   - un componente che monta la WebView, manda i messaggi e riporta gli
     errori.
3. **Posizione** (`apps/mobile/src/location/`): un hook che chiede il
   permesso e restituisce uno stato fra `loading`, `ok` (con un `LatLon`),
   `denied` e `unavailable`, più una funzione per rileggere.
4. **Ricerca del luogo** (`apps/mobile/src/places/`):
   - funzioni pure: l'URL della richiesta (testo codificato, al massimo 5
     risultati) e la lettura della risposta GeoJSON in un elenco di
     `{ label, point: LatLon }`, con etichette come «Via Roma, Trento»;
   - la richiesta parte all'invio, non a ogni lettera, e mai con il testo
     vuoto;
   - nessun risultato ed errore di rete danno ciascuno il suo messaggio;
   - sotto i risultati «© OpenStreetMap contributors».
5. **Schermata**: `App.tsx` tiene la partenza come `{ point: LatLon,
   source: "gps" | "search" }`, pronta per il `RouteRequest` di TASK-023.
   Mostra la mappa a tutto schermo con il segno sulla partenza, il
   pulsante per rileggere il GPS (se riesce, la partenza torna `gps`) e,
   quando la posizione manca, messaggio, campo di ricerca e risultati.
   L'elenco delle forme resta sotto la mappa, non cliccabile. Testi in
   inglese come oggi, nessuna libreria di navigazione: la schermata è
   ancora una.
6. **Test** (Jest, offline, deterministici; WebView, `expo-location` e
   `fetch` sostituiti da finti; la risposta di Photon da un JSON di
   esempio nei test):
   - conversione di un punto asimmetrico (la partenza di Trento), nei due
     sensi: uno scambio fra lat e lon non passa;
   - l'HTML contiene versione, SRI, URL dello stile, attribuzione non
     compressa e nessuna chiave;
   - hook: permesso concesso → posizione `(lat, lon)`; negato → `denied`
     senza chiedere la posizione; errore → `unavailable`; la rilettura
     funziona;
   - ricerca: URL con il testo codificato; risposta di esempio → etichette
     e punti `(lat, lon)`; risposta vuota → nessun risultato; testo vuoto
     → nessuna richiesta; errore di rete → messaggio;
   - schermata: con la posizione, la mappa riceve `setPosition` e il campo
     di ricerca non c'è; con il permesso negato compaiono messaggio e
     campo, e scegliere un risultato manda la mappa lì con partenza
     `search`; un `error` dalla pagina mostra il messaggio della mappa;
     `circle` e `heart` si trovano come in TASK-020.
7. **Prova sull'iPhone** con Expo Go (criteri sotto). Android non ha un
   telefono per provarlo: resta coperto solo dai test e dalla CI.
8. **Documentazione**: nuova ADR con le scelte del punto 1 e ADR-0011
   chiusa da quella; la ADR dice anche che l'app chiama direttamente due
   servizi esterni (tile e Photon), non servizi nostri, per cui
   ARCHITECTURE §4 non cambia. `UI.md` scritto per la parte di questo task
   (schermata, posizione e permessi, ricerca del luogo, messaggi, cosa esce
   dal telefono), con le altre domande lasciate a TASK-023 e TASK-024 e
   «Cosa è già deciso» corretto; `INDEX.md` (stato di `UI.md`); `MAPS.md`
   «Ancora aperto» (provider di tile, attribuzione sulla mappa);
   `SETUP.md` passo 9 (permesso di posizione in Expo Go, serve la rete);
   `TESTING.md` (i finti, la prova a mano); `.env.example` (via le due
   variabili: non serve nessuna chiave); `STATUS.md`.

## Criteri di accettazione

- [ ] Sull'iPhone dell'utente, con Expo Go: al primo avvio compare la
      richiesta del permesso di posizione; concesso, la mappa mostra la
      zona attorno con il segno della posizione, si sposta e si ingrandisce
      con le dita, e l'attribuzione è leggibile senza toccare nulla.
- [ ] Sull'iPhone, negando il permesso l'app non si blocca: mostra la mappa
      dell'Italia, il messaggio e il campo di ricerca; cercando una città
      (per esempio «Levico Terme») e una via (per esempio una via di
      Trento) e scegliendo un risultato, la mappa va lì con il segno sulla
      partenza.
- [ ] Sull'iPhone, concesso il permesso dalle Impostazioni, il pulsante
      trova la posizione e la partenza torna quella del GPS.
- [x] Se libreria o stile non si caricano, l'app mostra un messaggio e non
      uno schermo bianco (test automatico: in Expo Go non si toglie
      internet lasciando il Wi-Fi verso il PC). Provato anche sulla pagina
      vera in Edge headless: hash SRI sbagliato e stile inesistente danno
      `error`.
- [x] Dalla radice `npm run lint`, `npm run typecheck` e `npm test`
      passano, offline dopo l'installazione (52 test nell'app).
- [x] Scambiare lat e lon nella conversione fa fallire un test (provato a
      mano: 10 test cadono scambiando `toLngLat`, 6 con `fromLngLat`).
- [ ] I job `mobile` e `route-engine` della CI sono verdi sulla PR.
- [x] Nessuna chiave né segreto nel repository.
- [x] ADR-0029, ADR-0011 superata; `UI.md`, `INDEX.md`, `MAPS.md`,
      `SETUP.md` (passo 9.4), `TESTING.md`, `.env.example`, `STATUS.md`
      aggiornati.

Differenze dal piano: MapLibre GL JS è la 5.24.0 e non la 6, che è solo
moduli ES con il worker in un file separato (ADR-0029); in più
`react-native-safe-area-context` (punto 1, D). La partenza da ricerca
porta anche l'etichetta del luogo, per la riga di stato. Il test della
schermata resta in `apps/mobile/__tests__/`, gli altri accanto al codice.
Prima della prova sul telefono la pagina è stata guardata in Edge headless:
Italia all'apertura, segnaposto in piazza Duomo a Trento, attribuzione
intera a 390 px.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/package.json
apps/mobile/src/map/**
apps/mobile/src/location/**
apps/mobile/src/places/**
apps/mobile/__tests__/**
apps/mobile/__mocks__/react-native-webview.tsx
package-lock.json
.env.example
docs/DECISIONS.md
docs/UI.md
docs/INDEX.md
docs/MAPS.md
docs/SETUP.md
docs/TESTING.md
docs/STATUS.md
docs/tasks/TASK-021.md
```

## Fuori scope

- Scelta di forma e distanza, chiamata all'API, percorso disegnato sulla
  mappa (TASK-022, TASK-023). I messaggi della pagina si scrivono pensando
  anche al percorso, ma quel messaggio arriva con TASK-023.
- Cercare un luogo quando la posizione c'è, suggerimenti mentre si scrive,
  scegliere la partenza toccando la mappa, ricordare le ricerche fatte.
- Spostare geocoding o tile dietro l'API (cache, cambio di provider senza
  aggiornare l'app): se serve, si decide con TASK-022.
- Seguire la posizione durante la corsa, posizione in background, bussola,
  cerchio di precisione.
- Mappe offline, tile scaricate in anticipo, MapLibre GL JS copiata dentro
  l'app.
- MapLibre React Native, development build, EAS, account Apple Developer.
- Navigazione fra schermate, tema scuro, stile della mappa personalizzato,
  icone, traduzioni.

## Esito

*(si compila a fine task)*
