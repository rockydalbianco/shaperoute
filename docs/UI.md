# UI — Interfaccia mobile

> Scritto con TASK-021: mappa, posizione e ricerca del luogo. Le domande
> ancora aperte stanno in fondo e si scrivono con TASK-023 e TASK-024.

## Cosa è deciso

- React Native + Expo + TypeScript; si prova con Expo Go (ADR-0028).
- La mappa è una pagina MapLibre GL JS dentro una WebView, con le tile di
  OpenFreeMap (ADR-0029). Non MapLibre React Native: in Expo Go non gira.
- Per i percorsi l'app parla solo con l'API; mappa e ricerca del luogo
  chiamano direttamente due servizi esterni (ADR-0029).
- Testi in inglese, come il codice; le traduzioni verranno dopo.

## La schermata

Per ora è una sola, senza navigazione. Dall'alto:

1. **Pannello**: il titolo, una riga che dice da dove partirà il percorso
   e, quando servono, il rimando alle Impostazioni, la ricerca del luogo e
   l'errore della mappa.
2. **Mappa**: all'apertura l'Italia intera, poi la partenza con un
   segnaposto, a zoom 15 (qualche via attorno). Si sposta e si ingrandisce
   con le dita o con i pulsanti + e −. L'attribuzione dei dati è sempre
   visibile in basso, per intero; i suoi link si aprono nel browser del
   telefono.
3. **Barra in basso**: il pulsante «My position» e le forme disponibili,
   per ora non cliccabili.

Pannello e barra stanno fuori dalla mappa, così non coprono l'attribuzione;
i margini seguono la tacca e la barra in basso di ogni telefono.

## La partenza

È un punto `(lat, lon)` con la sua origine, `gps` o `search`: in TASK-023
diventa lo `start` del `RouteRequest`.

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

## Cosa esce dal telefono

- **La posizione GPS**: niente, resta nel telefono. In TASK-023 andrà
  all'API come partenza.
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

- Come si sceglie la forma e si imposta la distanza (TASK-023).
- Come si mostra l'attesa durante la generazione (TASK-023).
- Come si comunica un percorso mediocre senza mentire (TASK-023).
- Anteprima, rigenerazione, export (TASK-023, TASK-024).
- Navigazione, quando le schermate saranno più di una.
