# TASK-496 — Batteria durante la corsa: il diario dei punti, la mappa e l'orologio che nessuno vede

**Stato**: Done · 2026-11-23 · #1529 (O1) e #1531 (O2) in `main`; resta
l'OTA (Coordinatore, col sì dell'utente) e l'occhio dell'utente sulla
batteria, sul telefono. 2026-11-26: parte C (il file intero scritto accanto
e spostato) in `main` dalla #1603 (`2b0d64c0`)
**Prova sul telefono**: provato dall'utente il 2026-11-26 con una corsa vera, telefono bloccato e in tasca: «ok», senza numeri della batteria.
**Fase**: 5 · **Branch**: `feat/TASK-496-a-run-journal` (O1), poi
`feat/TASK-496-b-unseen-map-clock` (O2), `feat/TASK-496-c-atomic-run-file` (C)
**Dipende da**: TASK-304 (ADR-0264), TASK-112 (ADR-0091), TASK-070 (tasca)
**ADR**: aggiunta ad ADR-0264 (lo ha detto il Coordinatore) · numero dal
Coordinatore il 2026-11-23

## Obiettivo

Punti O1 e O2 della lettura del codice del 2026-11-23
(`out/prova-app-2026-11-23/PROPOSTE.md` del Mac, fuori da git; l'utente:
«Sì, tutte»). **I punti sono visti nel codice, i costi sono stime**: la
batteria vera si vede solo sul telefono.

- **O1.** Con l'app dietro o il telefono bloccato ogni punto GPS tenuto (uno
  ogni 5 m) riscrive tutto `current-run.json` (`trackStore.ts`, `saveRun`:
  `JSON.stringify` della corsa intera e scrittura sincrona). Il lavoro
  cresce col quadrato della lunghezza della corsa.
- **O2.** In «modalità tasca» la mappa sotto lo schermo nero riceve a ogni
  punto tutta la traccia e un'animazione di 500 ms; l'orologio del pannello
  scatta ogni secondo anche in tasca e con l'app dietro.

Fuori da questa task: lo stato della corsa fuori da `App.tsx` (TASK-504).

## Scelta dell'utente (2026-11-23)

La domanda, parola per parola: «TASK-496 (batteria in corsa): a telefono
bloccato oggi ogni punto GPS riscrive tutto il file della corsa. Propongo di
scrivere solo i punti nuovi in un piccolo diario accanto al file, e il file
intero uscendo dall'app, in pausa, alla fine e ogni 300 punti circa. La tua
scelta della TASK-304 resta uguale: nessun punto perso se iOS chiude MuW.
Cambia solo come viene mantenuta. Va bene?». La risposta dell'utente:
**«Sì, così»** (l'altra scelta era «No, resta com'è»). Il resto (formato del diario, ogni quanto il
file intero, animazione della mappa) è deciso dall'agente su delega.

## Riverificato su `origin/main` (`8c917647`)

- O1: `trackStore.ts`, `onFix`: `behind(AppState.currentState)` fa partire
  `save()` a ogni punto tenuto; `saveRun` riscrive il file intero.
- O2, mappa: con l'app in «background» durante una corsa la pagina della
  mappa **non c'è già** (`useRunBehind`, ADR-0264 punto 5). Resta la tasca:
  `MapView.tsx` manda traccia intera (`showTrack`), `follow` (`easeTo` di
  500 ms in `mapPage.ts`), `face` e `showProgress` anche sotto lo schermo
  nero.
- O2, orologio: `useRunNumbers` (`RunPanel.tsx`) usa `useNow` ogni secondo;
  l'unico uso «dal vivo» è `RunDashboard`. `numbers.energy` va anche al link
  dal vivo (`useLiveShareFeed`): fermando l'orologio i numeri si calcolano
  all'ultimo punto, non a un «adesso» vecchio.

## Il disegno

**O1, il diario.** Accanto a `current-run.json` il file
`current-run.journal`, una riga JSON per scrittura con l'app dietro: da
quale corsa viene (l'ora del primo punto), quanti punti c'erano prima, i
punti nuovi, i metri, le pause solo se sono cambiate. Il file intero si
scrive: uscendo dal primo piano, in pausa, alla penna alzata, alla fine, e
ogni 300 righe di diario; in primo piano resta ogni 15 s. Dopo un file
intero il diario si svuota. `loadRun` legge file + diario: una riga che non
si legge (l'ultima, troncata da una chiusura a metà) o che non combacia
ferma la lettura lì; una riga già dentro il file si salta; una corsa
vecchia senza diario si legge come prima. Se il telefono rifiuta la riga,
si prova il file intero, e la corsa resta in memoria come oggi.

**O2, la mappa.** In tasca alla pagina non parte nessun messaggio di
traccia, posizione, bussola, progresso e rientro (solo, entrando, il
progresso senza lampeggio, com'era); uscendo dalla tasca parte una volta lo
stato di adesso. In vista, a ogni punto vanno alla pagina solo i punti
nuovi (`extendTrack`); sci e volo restano a traccia intera. L'animazione
che segue chi corre passa da 500 a 250 ms.

**O2, l'orologio.** `useRunNumbers` non scatta in tasca né con l'app non
attiva; al ritorno legge subito l'ora. `useNow` non cambia (conto alla
rovescia, sci, volo).

## File toccati

Liste approvate dal Coordinatore (fork 3) il 2026-11-23, coi test esistenti
«solo se servono». Toccati davvero:

- PR 1 (O1): `apps/mobile/src/navigation/runJournal.ts` (nuovo),
  `runJournal.test.ts` (nuovo), `trackStoreJournal.test.ts` (nuovo),
  `trackStore.ts`; dei test esistenti solo `runSurvives.test.ts` (il finto
  disco scrive in coda, i punti sul telefono si leggono come li legge
  l'app).
- PR 2 (O2): `apps/mobile/src/navigation/runSeen.ts` (nuovo) e il suo test,
  `apps/mobile/src/map/MapView.tsx`, `map/messages.ts`, `map/mapPage.ts`,
  `apps/mobile/src/screens/RunPanel.tsx`; test nuovi
  `map/MapViewPocket.test.tsx`, `map/mapPageExtendTrack.test.ts`,
  `screens/RunPanelUnseen.test.tsx`; nessun test esistente toccato.
- Documenti (PR a parte): questo file, `docs/DECISIONS.md` (aggiunta ad
  ADR-0264), `docs/archive/COMPLETATI.md`, `docs/STATUS.md`.

Niente `App.tsx`, niente nativo, nessuna dipendenza: impronta iOS attesa
invariata (`5e1b5ce5`).

## Criteri di accettazione

- [x] Sì dell'utente sull'aggiunta ad ADR-0264 (2026-11-23, «Sì, così»).
- [x] Sì del Coordinatore sulla lista dei file (2026-11-23).
- [x] O1: test che nessun punto si perde (chiusura a metà diario, riga
      finale troncata, ripristino file + diario, corsa vecchia senza
      diario, diario di un'altra corsa, telefono che rifiuta la scrittura):
      `runJournal.test.ts`, `trackStoreJournal.test.ts`.
- [x] O2: test che in tasca alla mappa non parte nessun messaggio e che
      all'uscita lo stato è allineato; orologio fermo quando non si vede:
      `MapViewPocket.test.tsx`, `mapPageExtendTrack.test.ts`,
      `runSeen.test.ts`, `RunPanelUnseen.test.tsx`.
- [x] Prova nel simulatore (2026-11-23, sotto): corsa simulata dietro →
      davanti → fine, tasca, riapertura dopo un'uscita forzata; numeri
      prima/dopo in Node e sul disco del simulatore. La batteria no.
- [x] CI verde, impronta iOS `5e1b5ce5` invariata (misurata dal
      Coordinatore su 53d8568b e 83a5696c); «pronta» al Coordinatore, che
      ha unito le due PR.
- [x] Documenti di chiusura (questa PR): aggiunta ad ADR-0264, `UI.md`,
      `INDEX.md`, `COMPLETATI.md`.
- [ ] OTA di produzione: del Coordinatore, col sì dell'utente.
- [x] Parte C (2026-11-26): sì del Coordinatore sulla lista dei file
      (`trackStore.ts`, nuovo `trackStoreAtomic.test.ts`); test della
      scrittura e dello spostamento interrotti; i test di TASK-507 passano
      senza modifiche; aggiunta C ad ADR-0264 (questa PR).
- [x] Parte C: CI verde, #1603 unita dal Coordinatore (`2b0d64c0`,
      2026-11-26).
- [ ] Parte C: OTA di produzione (Coordinatore, col sì dell'utente).

## Cronologia

- 2026-11-23: parte 0. Punti riverificati su `main`; sì dell'utente;
  lista dei file al Coordinatore, approvata.
- 2026-11-23: PR #1529 (O1) e #1531 (O2) aperte in bozza. In locale: jest
  sui file toccati e vicini verde, `tsc`, prettier ed eslint puliti.
  Trovato dai test nuovi e corretto in `trackStore.ts`: la pausa di
  un'assenza oltre 10 minuti restava solo in memoria quando il punto che la
  portava non era tenuto.
- Misura (Node, disco in memoria, caratteri passati a `write`; **non** sul
  telefono), punti a 6 m con l'app dietro: 12 km 209,5 MB → 1,0 MB; 24 km
  837,6 MB → 3,6 MB; 48 km 3349 MB → 12,6 MB
  (`out/TASK-496/misura-caratteri.txt` del Mac). Batteria e tempi di
  scrittura sul telefono: non misurati.
- 2026-11-23, sera: prova nel simulatore (iPhone 17e, Expo Go 57, ramo
  locale con le due PR insieme, mai spinto; app di prova temporanea con
  `useFreeRun`, `MapView`, `useRunNumbers`, `usePocketMode` vero entrato e
  uscito a tempo, GPS simulato a 3,3 m/s). **Non è il telefono.**
  - In vista: a ogni punto alla mappa `extendTrack` con un punto e
    `follow`, mai la traccia intera; pannello ridisegnato 15–16 volte ogni
    10 s.
  - In tasca, 60 s e 33 punti: alla mappa niente di traccia, posizione,
    progresso; pannello 5–7 volte ogni 10 s (solo i punti). All'uscita un
    `extendTrack` coi 33 punti e un `follow`.
  - App dietro, 60 s: `current-run.json` scritto intero uscendo (93 punti,
    8834 byte) e poi fermo; il diario +1 riga (~180 byte) a punto.
  - Davanti: file intero entro 15 s, diario tolto; la pagina della mappa
    ricaricata riceve la traccia intera una volta.
  - Dietro e uscita forzata: restano 155 punti nel file e 21 righe di
    diario, 176 punti, l'ultimo 0,58 s prima dell'uscita. Riaperta, l'app
    legge 176 punti e la corsa riprende da sola.
  - Fine: `stopped`, 209 punti, 1308 m, file intero, diario tolto.
  - Sul disco del simulatore: file intero di 4000 punti 11,09 ms a
    scrittura, una riga di diario 0,40 ms.
  Il resoconto è in `out/TASK-496/PROVA-SIMULATORE.md` del Mac.
- 2026-11-23: impronta iOS invariata, «#1529 pronta (53d8568b)» e «#1531
  pronta (83a5696c)» al Coordinatore, che le ha unite.
- 2026-11-26: **prova generale nel simulatore** (iPhone 17e, Expo Go 57,
  app di prova temporanea, GPS simulato a 3,3 m/s, 60 s per fase): secondi
  di processore di Expo Go e dei processi della mappa (WebKit), **non** la
  batteria. In vista 5,06 s; in tasca 0,68 s (−87%); dietro un'altra app
  0,45 s (la pagina della mappa non c'è); telefono bloccato 1,14 s. File e
  diario scritti anche a telefono bloccato. Resoconto in
  `out/prova-generale-sim/ESITO.md` del Mac.
- 2026-11-26: **parte C**, l'idea «scrittura atomica» qui sotto, chiesta
  dall'utente («intanto prepara le modifiche per 496»). Il file intero si
  scrive in `current-run.json.new` e si sposta sopra `current-run.json`;
  all'apertura un `.new` che si legge prende il posto del file, uno a metà
  si toglie. Lista dei file approvata dal Coordinatore (nessuna PR aperta su
  `trackStore.ts`, i rami di 507 già in `main`); `takeRunSlot` e
  `moveRuns` invariati. In locale: 97 test della corsa e 22 di TASK-507
  verdi, `tsc`, eslint e prettier puliti. PR #1603.

## Esito

Fatto. A telefono bloccato una posizione scrive una riga di diario invece
dell'intera corsa; in tasca la mappa e l'orologio non lavorano. La promessa
della TASK-304 è la stessa, e la prova dell'uscita forzata l'ha tenuta.
**Non misurato**: quanta batteria si risparmia; si vede solo sul telefono
dell'utente, dopo l'OTA.

Parte C (2026-11-26): una chiusura a metà del file intero lascia l'ultimo
file intero invece di mezzo file (aggiunta C ad ADR-0264).

## Idee per dopo (non fatte)

- ~~Scrivere il file intero in modo atomico~~: fatto nella parte C
  (2026-11-26, #1603).
- Sci (`showLifts`) e volo (`showFlight`) mandano ancora la traccia intera
  a ogni punto; `FlightLive` e `SkiTourLive` hanno il loro orologio.
- Nella pagina, MapLibre ridisegna tutta la linea a ogni punto.
