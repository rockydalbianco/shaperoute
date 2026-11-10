# TASK-429 — La modalità sci: scelto lo sci, MuW diventa un'app per lo sci

**Stato**: Todo · parte 0 fatta il 2026-11-10: proposta, mockup e le
quattro scelte dell'utente qui sotto; prossima la parte A, con la lista dei
file al Coordinatore
**Fase**: 5 · **Branch**: `docs/TASK-429-ski-mode` e `docs/TASK-429-part0`
(documenti); il codice
`feat/TASK-429-a-…`
**Dipende da**: TASK-375 (la giornata di sci, impianti e piste per nome) e
TASK-406 (stazioni, meteo, neve, «Follow»), tutti e due online dal
2026-11-10. Non li riapre: ne riusa le pagine.
**ADR**: ADR-0357 (accettata il 2026-11-10)

## Obiettivo

L'utente, il 2026-11-10, dopo TASK-406 (parole sue riassunte):

1. «Una volta premuto sullo sci deve uscire un'app per lo sci, l'app deve
   cambiare»: con lo sci scelto, schede, pagine e grafica sono quelle dello
   sci. Non un tasto in più nell'app normale.
2. Una grafica migliore, più sezioni, «tipo Slopes».
3. Tutti i dati dello sci, compresi gli impianti di risalita presi.
4. Sulla mappa linee di più colori con una legenda: per esempio in rosso le
   risalite, in giallo le discese.

Lo sci non va messo «in vista» nell'app normale. Di Slopes si copiano le
funzioni, non il nome, la grafica o i testi: lo stile resta quello di MuW,
con i colori di `src/theme/tokens.ts`.

**Mockup**: canvas privato «MuW · modalità sci»,
https://claude.ai/artifact/AyNeFVszw9gDsRyEdMGPPb (8 tavole: entrare e
uscire, Oggi, giornata in corso, riepilogo, mappa con legenda, discesa per
discesa, la stagione, le stazioni). Testi in inglese da approvare, numeri di
esempio.

## Scelte dell'utente

- 2026-11-10, domanda 1: «Sì, così». Si entra nella modalità sci scegliendo
  «Ski» dal tasto dello sport in alto o da Impostazioni; si esce scegliendo
  un altro sport dallo stesso tasto. Le schede sono Oggi · Giornate ·
  Stazioni · Feed · Profilo; i messaggi passano all'icona in alto, col
  numero rosso.
- 2026-11-10, domanda 2: «Sì, tutte e sei». La prima versione ha le sei
  sezioni del punto 3: Oggi, riepilogo della giornata, mappa con legenda,
  discesa per discesa, la stagione, Stazioni. Con la stessa risposta la
  Ricerca dell'app normale perde la scheda «Ski»: le stazioni stanno solo
  nella modalità sci.
- 2026-11-10, domanda 3: «Sì, così». Nella modalità sci le discese sono
  gialle, a linea piena, numerate 1, 2…; le risalite rosse, tratteggiate,
  numerate L1, L2…, in un rosso più chiaro del numero rosso (`#FF5A4E` sul
  tono scuro). Due token nuovi in `tokens.ts`, `ski.descent` e `ski.lift`;
  la legenda dice tutto anche a parole. Fuori dalla modalità la giornata
  resta bianca come oggi.
- 2026-11-10, domanda 4: «Sì, approvati». I testi della tabella della
  domanda 4, in inglese con l'italiano; de, fr ed es tradotti allo stesso
  modo. «Discese» resta anche il nome della sezione discesa per discesa
  («Runs»).

## Cosa c'è già (non si rifà)

| Cosa | Dove | Nella modalità sci |
|---|---|---|
| Stazioni vicine e per nome, «Your resorts», pagina della stazione con meteo, neve, «Follow», giornate dei membri | `src/ski/ResortList`, `ResortPage`, `ResortWeather`, `ResortSnow`, `ResortPosts` (nella Ricerca, scheda «Ski») | diventano la scheda **Stazioni** |
| «Record your day» con stazione e meteo, «Cambia» | `screens/FreeRunScreen`, `ski/DayResort` | il cuore della scheda **Oggi** |
| Fine giornata: discese, dislivello, vel. max e media, risalite, tempo, «Total», neve, attrezzatura | `screens/SnowFinishCard`, `ski/DayChoices` | il **riepilogo** della giornata |
| Discese e risalite dalla traccia | `activities/snowDay.ts` (`descents`, `lifts` come tratti) | la **linea del tempo** e la **mappa a colori** |
| Impianti e piste per nome e volte | server `GET /drawings/{id}/ski-names`, `social/SkiNamesList` | «Impianti presi» nel riepilogo |
| Risalite tratteggiate sulla mappa | `activities/snowLifts.ts`, `map/mapPage.ts` (strato `lifts`) | le stesse linee, colorate |
| Le pagine cambiano già con lo sport | `App.tsx`: «Explore» diventa `PaddleExplore` per acqua e nuoto | lo stesso schema, per tutte le schede |

## La proposta

### 1. Entrare e uscire (domanda 1)

- **Si entra** scegliendo «Ski» dove lo sport si sceglie già: il tasto dello
  sport in alto (`SportButton`) e Impostazioni (`SportSetting`). Nel menu la
  riga dello sci dice «Turns MuW into your ski app». Scelto, l'app passa alla
  modalità sci con una dissolvenza (niente movimento con «Riduci
  movimento»).
- **Si resta** nella modalità sci finché lo sport è lo sci: riaprendo l'app,
  si riapre lì. Lo stato è lo sport già salvato (`saveSport`), nessuna
  scelta nuova da ricordare.
- **Si esce** dallo stesso tasto in alto: nella modalità sci il menu dice
  «Ski mode · Choose another sport to go back to MuW as always.» e scelto un
  altro sport l'app torna quella di sempre. Durante una giornata registrata
  il tasto non cambia sport (come oggi durante una corsa).
- **Non cambia**: lo sci di fondo resta «Soon» e fuori dalla modalità; lo
  scialpinismo (TASK-415) e le ciaspole (TASK-413) restano sport normali.

### 2. Le schede (domanda 1)

Cinque schede come oggi, così la barra e i gesti (`TabShell`, `TabBar`)
restano gli stessi; cambiano tre pagine.

| Scheda | Al posto di | Cosa c'è |
|---|---|---|
| 1 **Oggi** (si apre qui) | Feed | la stazione dove sei, meteo valle e cima, neve fresca, neve di oggi dei membri, «Record your day»; durante la giornata i numeri dal vivo; la stagione in breve; gli amici che hanno sciato qui oggi |
| 2 **Giornate** | Draw | i totali della stagione, una barra per giornata, l'elenco delle giornate; toccata, la giornata con «Summary · Map · Runs» |
| 3 **Stazioni** | Messages | la scheda «Ski» della Ricerca, ingrandita: «Your resorts» come schede col meteo, «Near you», cerca |
| 4 **Feed** | Explore | lo stesso Feed di sempre |
| 5 **Profilo** | Profilo | lo stesso profilo |

«Draw» ed «Explore» non ci sono: lo sci non ha forme da disegnare.

I **messaggi** passano a un'icona in alto, accanto al tasto dello sport, col
numero rosso come oggi sulla scheda. L'alternativa (B) tiene la scheda dei
messaggi e mette la stagione dentro «Giornate» al posto del Feed: meno
cambi, ma il Feed esce dalla barra.

### 3. Le sezioni della prima versione (domanda 2)

1. **Oggi** — stazione, meteo, neve, «Record your day»; durante la
   giornata: dislivello sciato in grande, discese, risalite, km, vel. max e
   media, quota più alta, «Sulla risalita» quando il telefono è su un
   impianto, la mappa piccola a colori.
2. **Riepilogo della giornata** — i numeri di `SnowFinishCard` in griglia,
   «Impianti presi» e «Piste» con nome e volte, neve e attrezzatura.
3. **Mappa con legenda** — discese e risalite di colori diversi, numerate
   (1, 2… e L1, L2…), la legenda sotto.
4. **Discesa per discesa** («Runs») — risalita, discesa, risalita… con ora,
   durata, dislivello, vel. max; le soste lunghe come una riga.
5. **La stagione** — giornate, km, dislivello, discese, risalite, vel. max,
   ore sulla neve; l'elenco delle giornate.
6. **Stazioni** — quello che c'è, con la grafica nuova.

Dopo, ognuna con la sua domanda: la mappa delle piste della stazione, gli
amici sulle piste dal vivo (con TASK-424), le classifiche fra amici, il
confronto fra stagioni.

### 4. I colori della mappa (domanda 3)

- **Discese gialle, piene** e **risalite rosse, tratteggiate**, come chiede
  l'utente. Nuovi token in `tokens.ts`: `ski.descent` e `ski.lift`, con i
  valori per tono scuro e chiaro, controllati da `palettes.test.ts`.
- Due regole scritte in `tokens.ts` vanno toccate, ed è una scelta
  dell'utente:
  - il **giallo** oggi vuol dire solo «percorso» (ADR-0183). Nella modalità
    sci non ci sono percorsi da disegnare, quindi il giallo delle discese non
    si confonde; fuori dalla modalità la giornata resta bianca come oggi;
  - il **rosso** oggi è solo il numero di chi aspetta («badge»). Le risalite
    usano un rosso diverso e più chiaro (proposta `#FF5A4E` sul tono scuro),
    sempre tratteggiato.
- **Senza colori** si legge lo stesso: tratteggio contro linea piena, numeri
  sulle linee (1, 2… e L1, L2…), e la legenda a parole.

### 5. Cosa resta uguale

Account, profilo, Feed, messaggi, notifiche, la privacy, le giornate
salvate e i post (che restano post di MuW, visibili come oggi anche a chi
non è nella modalità sci). La Ricerca dell'app normale **perde** la scheda
«Ski»: le stazioni stanno solo nella modalità sci (scelta dell'utente,
domanda 2).

## I dati: cosa c'è e cosa manca

| Sezione | Dati | Ci sono? |
|---|---|---|
| Oggi, Stazioni | stazioni, meteo, neve dei membri, seguite | sì, server di TASK-406 |
| Giornata dal vivo, mappa, discesa per discesa | la traccia e `snowDay` sul telefono | sì, solo app |
| Impianti presi, piste | `GET /drawings/{id}/ski-names` | sì; ma un nome per impianto con le volte, non tratto per tratto |
| Nomi nella linea del tempo (L1 = «Ciampinoi») | i tratti con il nome | **no**: serve un campo in più nella risposta dei nomi (server) |
| Elenco delle giornate | `GET /me/drawings` (attività `skiing`) | sì, km e tempo |
| Totali della stagione (discese, dislivello, vel. max, risalite) | per ogni giornata i numeri di `snowDay` | **no**: proposta, il telefono li manda con la giornata (`PUT /me/activities/{key}/ski`, campi nuovi) e il server somma (`GET /me/ski-season`); le giornate di prima si contano dalla traccia una volta |
| Amici che hanno sciato qui oggi | i post delle giornate nella stazione (`GET /ski-resorts/{id}/drawings`) | sì, filtrati sui seguiti dal telefono |
| Amici dal vivo sulle piste | posizione condivisa | no; dopo, con TASK-424 e una sua domanda di privacy |

## Le parti

- **A — la modalità**: `skiMode` dallo sport, le cinque schede, l'icona dei
  messaggi in alto, il menu dello sport che entra ed esce. Solo app.
- **B — le pagine della giornata**: Oggi, riepilogo, discesa per discesa,
  mappa con legenda e i token nuovi. Solo app.
- **C — la stagione**: i numeri della giornata al server, `GET
  /me/ski-season`, la scheda Giornate. Server col sì dell'utente.
- **D — i nomi tratto per tratto** nella linea del tempo. Server.
- **E — la grafica nuova delle Stazioni** (le schede di «Your resorts»
  col meteo). La Ricerca senza «Ski» passa nella parte A, perché le stazioni
  cambiano posto nello stesso momento.

**La parte A, il piano (2026-11-10).** Cosa vede l'utente:
- con «Ski» scelto, la barra in basso ha Oggi · Giornate · Stazioni · Feed ·
  Profilo, e l'app si apre su Oggi;
- **Oggi**: la stazione della giornata con il suo meteo (`DayResort`, così
  com'è) e «Record your day», che apre la registrazione di sempre. Le altre
  sezioni di Oggi (numeri dal vivo, la stagione in breve, gli amici)
  arrivano con le parti B e C;
- **Giornate**: le proprie giornate di sci, dalla più recente, con stazione,
  km e tempo (`fetchMyDrawings`, attività `skiing`); toccata, si apre il suo
  post come oggi. I totali della stagione arrivano con la parte C, il
  riepilogo a tre pagine con la parte B;
- **Stazioni**: l'elenco e la pagina della stazione della Ricerca
  (`ResortList`, `ResortPage`), così come sono;
- **i messaggi**: un'icona in alto, accanto al tasto dello sport, col
  numero rosso; toccata, apre i messaggi sopra l'app, con «←»;
- **il menu dello sport**: sotto «Ski» la riga «Turns MuW into your ski
  app»; nella modalità, in cima, «Ski mode» e «Choose another sport to go
  back to MuW as always.»;
- **la Ricerca** dell'app normale non ha più la scheda «Ski».

Scelte tecniche, decise dall'agente su delega dell'utente:
- **la barra si ricostruisce quando la modalità cambia** (`key` di
  `TabShell`): le schede sono altre, e le luci della barra ripartono dalla
  pagina sullo schermo;
- **le icone delle schede sci** sono di Lucide come le altre, disegnate
  dagli SVG con lo Swift del Mac alle stesse linee (1,8 e 2,6 su 24),
  senza dipendenze nuove;
- **la modalità è una funzione dello sport** (`isSkiMode(sport)`), nessuno
  stato nuovo: scelto un altro sport, `App.tsx` torna alle pagine di prima;
- **Oggi usa la pagina «choose»**: ogni «indietro» che oggi riporta a
  «Draw» (fine giornata, «Discard») riporta a Oggi senza toccare quei
  percorsi del codice;
- **le pagine nuove stanno in `src/skimode/`**, file nuovi; `src/ski/` non
  si tocca, si importano `DayResort`, `ResortList` e `ResortPage`;
- **in `App.tsx` il minimo**: le pagine della barra scelte da una funzione
  pura (`skiModePages`, testata), l'icona dei messaggi nell'header, i
  messaggi sopra l'app quando non hanno una scheda.

Ogni parte manda prima al Coordinatore la sua lista dei file. TASK-406
resta della sua sessione (la parte E, la prova sulla neve): una parte che
tocca `src/ski/**` lo concorda col Coordinatore prima della lista. Solo
JavaScript, impronta iOS `6f8bba4c` ferma, nessuna dipendenza nuova. Testi
nuovi in cinque lingue col sì dell'utente; server e OTA col sì dell'utente.

## Domande all'utente (una alla volta)

1. **Come si entra e quali schede.** Proposta: si entra scegliendo «Ski» nel
   tasto dello sport in alto o in Impostazioni, si esce scegliendo un altro
   sport dallo stesso tasto; schede «Oggi · Giornate · Stazioni · Feed ·
   Profilo», messaggi dall'icona in alto. Alternativa B sopra.
   **Risposta dell'utente, 2026-11-10: «Sì, così».** Vale la proposta: si
   entra con «Ski» dal tasto dello sport in alto o da Impostazioni, si esce
   scegliendo un altro sport dallo stesso tasto; schede Oggi · Giornate ·
   Stazioni · Feed · Profilo, messaggi dall'icona in alto.
2. **Le sezioni della prima versione.** Proposta: le sei del punto 3, e la
   Ricerca normale perde «Ski». **Risposta dell'utente, 2026-11-10: «Sì,
   tutte e sei».**
3. **I colori della legenda.** Proposta: discese gialle piene, risalite
   rosse tratteggiate (un rosso diverso dal numero rosso), con numeri ed
   etichette. **Risposta dell'utente, 2026-11-10: «Sì, così».**
4. **I testi** in cinque lingue. Proposta: la tabella qui sotto, in inglese
   con l'italiano; de, fr ed es tradotti allo stesso modo. I testi che
   l'app ha già (stazione, meteo, neve, «Record your day», le caselle di
   fine giornata, «Lifts and pistes») restano quelli approvati.
   **Risposta dell'utente, 2026-11-10: «Sì, approvati».**

   | Dove | en · it |
   |---|---|
   | Menu dello sport, sotto «Ski» | «Turns MuW into your ski app» · Trasforma MuW nella tua app per lo sci |
   | Menu dello sport, nella modalità | «Ski mode» · Modalità sci; «Choose another sport to go back to MuW as always.» · Scegli un altro sport per tornare a MuW di sempre. |
   | Schede (VoiceOver) | «Today» · Oggi; «Days» · Giornate; «Resorts» · Stazioni |
   | Oggi | «This season» · Questa stagione; «Friends here today» · Amici qui oggi; «{names} skied {resort}» · {names} hanno sciato a {resort} |
   | Giornata in corso | «On a lift» · Sulla risalita; «Vertical skied» · Dislivello sciato; «Highest» · Quota massima; «End day» · Fine giornata |
   | La giornata | «Summary» · Riepilogo; «Map» · Mappa; «Runs» · Discese; «Lifts taken» · Impianti presi; «{rides} rides · {lifts} lifts» · {rides} salite · {lifts} impianti |
   | Legenda | «Legend» · Legenda; «Descents · solid, numbered» · Discese · linea piena, numerate; «Lifts · dashed, L1, L2…» · Risalite · tratteggiate, L1, L2…; «Start and end» · Partenza e arrivo |
   | Discesa per discesa | «Lift» · Risalita; «Piste without a name» · Pista senza nome; «{speed} top» · {speed} max; «Stopped {minutes} min» · Fermo {minutes} min |
   | Stagione | «Season {years}» · Stagione {years}; «Vertical this season» · Dislivello della stagione; «Days» · Giornate; «On snow» · Sulla neve; «Your days» · Le tue giornate |

## File toccati

Parte 0 (documenti): `docs/tasks/TASK-429.md` (nuovo), `docs/DECISIONS.md`
(ADR-0357), `docs/STATUS.md` (una voce), `docs/INDEX.md` (una riga). La
proposta è in `main` con #1065, la risposta 2 con #1072; le risposte 3 e 4
e l'ADR accettata in una sola PR di documenti.

Parte A (mandata al Coordinatore il 2026-11-10). File nuovi:
- `apps/mobile/src/skimode/skiMode.ts` (`isSkiMode`, `skiModePages`) e
  `skiMode.test.ts`;
- `apps/mobile/src/skimode/SkiTodayPage.tsx`, `SkiDaysPage.tsx`,
  `SkiResortsPage.tsx` e `MessagesButton.tsx`, ognuno col suo test;
- `apps/mobile/src/skimode/skiModeShell.test.tsx` (entrare e uscire: le
  schede cambiano con lo sport).
- aggiunti strada facendo, file nuovi: `apps/mobile/src/skimode/SkiMessages.tsx`
  (i messaggi sopra l'app, con «‹ Back») e `SkiTabIcon.tsx` (le icone delle
  schede sci come `face` della barra, così `TabBar.tsx` non cambia), ognuno
  col suo test; le icone Lucide `mountain`, `calendar` e `cable-car` in
  `apps/mobile/assets/ui/tabs/` (normale e `-active`, 1x, 2x, 3x).

File da cambiare: `apps/mobile/App.tsx` (le pagine della barra, l'icona
dei messaggi, i messaggi sopra l'app), `apps/mobile/src/settings/SportButton.tsx`
e `SportButton.test.tsx` (le righe del menu),
`apps/mobile/src/search/SearchScreen.tsx` (via la scheda «Ski») e
`apps/mobile/src/search/skiResorts.test.tsx` (diventa la prova che la
scheda non c'è), `apps/mobile/src/i18n/{it,de,fr,es}.ts` (i testi approvati
della parte A) e questa lista. Nessun file di `src/ski/`, nessun token,
nessun server.

Parti B–E: si elencano prima di ciascuna.

## Criteri di accettazione

- [ ] Le domande 1–4 hanno una risposta scritta qui.
- [ ] Ogni parte ha la lista dei file approvata dal Coordinatore e test
  deterministici.
- [ ] Scelto un altro sport, l'app è quella di prima, pagina per pagina.
- [ ] La legenda si legge senza colori; i colori nuovi sono solo token.
- [ ] L'impronta del motore e quella iOS (`6f8bba4c`) non cambiano.
