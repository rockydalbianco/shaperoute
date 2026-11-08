# TASK-406 — Le stazioni sciistiche: la ricerca «Ski», la neve, il meteo e la giornata

**Stato**: Proposto · nessun codice prima delle scelte dell'utente e della
lista dei file di ogni parte, approvata dal Coordinatore
**Fase**: 5 · **Branch**: `docs/TASK-406-ski-resorts` (documenti); il
codice `feat/TASK-406-a-…`
**Dipende da**: TASK-375 (lo sci «Record only», impianti e piste per nome,
gli estratti OSM del mondo sul server). TASK-375 resta chiuso così com'è.
**ADR**: ADR-0338 (proposto)

## Obiettivo

L'utente il 2026-11-06, testuale:

> «Nella sezione Ski in ricerca ci devono essere tutte le stazioni
> sciistiche da poter selezionare e vedere com'è la neve, eccetera eccetera
> invece nella sezione record, my Day devi poter selezionare il comprensorio
> in cui si è il poter inserire che ci stai usando il modello poter vedere il
> meteo della stazione, selezionata il tipo di neve, numero degli impianti,
> poi bisogna devono registrare anche i chilometri totali. Impianti presi
> copia Slopes.»

Si vuole questo:
- **la ricerca «Ski»**: le stazioni sciistiche di tutto il mondo, da
  scegliere, con com'è la neve e il meteo;
- **«Record your day»**: la stazione dove si è, il modello di sci o
  snowboard, il meteo, il tipo di neve, il numero degli impianti, i km
  totali e gli impianti presi.

**«Copia Slopes»** è una scelta dell'utente. Di Slopes si prendono le
funzioni: gli impianti presi, i km totali, il meteo della stazione. Il nome,
la grafica e i testi di quell'app restano fuori, e le pagine sono nello
stile di MuW.

## Cosa c'è già (TASK-375)

- **La giornata.** «Record your day» per lo sci, e a fine giornata i km
  delle discese, le discese, il dislivello, la velocità massima e media e
  le risalite, con le risalite tratteggiate sulla mappa (parti B e C).
- **I nomi.** Gli impianti e le piste presi, per nome e quante volte. Li
  trova il server confrontando la traccia con OpenStreetMap, e il post li
  mostra (parte D, `runs.ski_names`, migrazione 0048).
- **I dati del mondo.** Gli estratti OSM di tutto il mondo arrivano sul
  server continente per continente (`out/TASK-375/estratti-mondo-continenti.md`).
- **La ricerca.** Filtra per sport, sci compreso, ma non conosce le
  stazioni.

## Da dove vengono i dati

| Cosa | Da dove | Note |
|---|---|---|
| Le stazioni del mondo | OSM: le aree `landuse=winter_sports` con un nome, dagli stessi estratti di TASK-375 | Gratis, licenza ODbL, già citata nell'app. Per ogni stazione si contano impianti e km di piste dai riquadri dello sci. |
| Il meteo della stazione | MET Norway, Locationforecast | Dati aperti CC BY 4.0, anche per un'app commerciale. Open-Meteo gratis vale solo per uso non commerciale. |
| La neve fresca prevista | MET Norway: la precipitazione con temperatura sotto lo zero | È una stima, non un bollettino. |
| Com'è la neve, secondo chi scia | Il tipo di neve segnato dai membri di MuW nella stazione | Vedi la domanda 1. |
| Un bollettino vero (altezza della neve, impianti aperti) | Solo servizi a pagamento, con un contratto | Vedi la domanda 1. |

**MET Norway** (vincoli del Coordinatore, 2026-11-06):
- lo chiama **il server**, mai il telefono, con un User-Agent che
  identifica MuW e un contatto;
- la risposta resta in **cache** sul server fino al suo `Expires`;
- le coordinate sono quelle della **stazione**, con al massimo 4 decimali,
  mai quelle dell'utente;
- l'app mostra l'**attribuzione** («Weather: MET Norway»);
- un contatto o una chiave stanno solo in `.env` e `.env.example`.

## Scelte dell'utente

- 2026-11-06, domanda 1: «Sì, gratis + membri». Com'è la neve si mostra
  con meteo e neve fresca prevista da MET Norway, più il tipo di neve
  segnato dai membri nella stazione nelle ultime 24 ore. Niente bollettino
  a pagamento.
- 2026-11-06, domanda 2: «Testo libero». Il modello è un testo libero,
  «sci» o «snowboard» più marca e modello, ricordato per la volta dopo
  (parte D).
- 2026-11-06, domanda 4: «Sì, così», e poi «Sì, scheda Ski». La ricerca ha
  una scheda **«Ski»** accanto a «All · Drawings · People · Routes»: il
  filtro Sport della ricerca non offre lo sci, che si registra soltanto.
  - Senza scrivere niente, le stazioni vicine («Near you»); scrivendo,
    quelle con quel nome.
  - La pagina della stazione: nome, regione, impianti, km di piste per
    difficoltà, quote, sito, il meteo in valle e in cima per 24 ore con la
    neve fresca stimata, i crediti.
  - Il tipo di neve dei membri, i post e il tasto per seguirla arrivano con
    la parte D.
- 2026-11-06, domanda 5, i testi della parte C: «Sì, approvati».
  - «Ski resorts», «Near you», «No ski resort with this name.», «Lifts»
    («Impianti»), «Pistes», «Novice · Easy · Intermediate · Advanced ·
    Expert · Freeride», «Website», «Base · Top» («Valle · Cima»), «Next 24
    hours», «Fresh snow», «Estimated from the forecast, not a snow
    report.», «Weather unavailable right now.», «Older forecast: MET Norway
    is not answering.».
  - I crediti, chiesti così dal Coordinatore per le licenze: «Weather: MET
    Norway (CC BY 4.0) · Resorts: OpenSkiMap.org, © OpenStreetMap
    contributors».
  - La riga della privacy resta per la parte D.
- 2026-11-07, domanda 3: «Sì, così». Il tipo di neve è una sola scelta,
  facoltativa, a fine giornata: «Powder · Groomed · Icy · Spring · Heavy»
  («Farinosa · Battuta · Ghiacciata · Primaverile · Pesante»).
- 2026-11-08, i testi della parte D2 e la riga della privacy: «Sì,
  approvati». In inglese, con l'italiano; de, fr ed es tradotti allo stesso
  modo.
  - Durante la giornata: «Where are you skiing?» («Dove stai sciando?»),
    «Change» («Cambia»), «No ski resort nearby» («Nessuna stazione
    sciistica vicina»), «{temperature} now · {snow} fresh snow»
    («{temperature} adesso · {snow} di neve fresca»).
  - A fine giornata: «Total» («Totale», discese più risalite), «How was the
    snow?» («Com'era la neve?»), i cinque tipi qui sopra, «Your gear» («La
    tua attrezzatura»), «Ski or snowboard, brand and model» («Sci o
    snowboard, marca e modello»).
  - Sul post: «Resort» («Stazione»), «Snow» («Neve»), «Gear»
    («Attrezzatura»).
  - La riga della privacy, in fondo a «Le tue corse e le loro tracce GPS»:
    «Per una giornata di sci, l'app manda al nostro server la tua posizione
    arrotondata a circa 1 km per trovare la stazione più vicina; il meteo lo
    chiede il server a MET Norway con la posizione della stazione, mai la
    tua. Stazione, neve e attrezzatura che aggiungi si vedono sul post, per
    chi può vederlo, e la neve conta anche, senza il tuo nome, nella neve
    del giorno della stazione.»
- 2026-11-08, seguire una stazione: «Le tue stazioni». Le stazioni seguite
  compaiono per prime nella scheda «Ski» («Your resorts») e per prime in
  «Cambia» durante la giornata. Nessuna notifica. La pagina della stazione
  mostra anche la neve segnata oggi dai membri e i loro post fatti lì,
  quelli che chi guarda vede (parte D3).

## Domande aperte (una alla volta)

1. **Com'è la neve** — la prima, perché decide il costo.
   **Risposta dell'utente, 2026-11-06: «Sì, gratis + membri».**
   - **Proposta: gratis + membri.** Meteo e neve fresca prevista da MET
     Norway, più il tipo di neve segnato dai membri nella stazione nelle
     ultime 24 ore.
   - **Alternativa: bollettino a pagamento**, con altezza della neve e
     impianti aperti, preso da un fornitore con un contratto.
2. **Il modello**. Proposta: testo libero, «sci o snowboard» più marca e
   modello, ricordato per la volta dopo. L'alternativa è un elenco di
   marche e modelli.
3. **Il tipo di neve**. Proposta: una sola scelta, facoltativa, a fine
   giornata, fra farinosa, battuta, ghiacciata, primaverile e pesante.
   **Risposta dell'utente, 2026-11-07: «Sì, così».**
4. **La pagina della stazione** nella ricerca «Ski». Proposta: nome,
   numero degli impianti, km di piste, meteo, neve, i post dei membri lì e
   un tasto per seguirla.
5. **I testi** in cinque lingue e la **riga della privacy**: il meteo
   chiesto dal server, il tipo di neve e la stazione visibili a chi vede il
   post.

## Le parti

- **A — le stazioni sul server.** Le aree `landuse=winter_sports`, prese
  dagli estratti come impianti e piste. Si salvano nome, centro, contorno,
  numero degli impianti e km di piste, più un'API che le cerca per nome e
  per vicinanza. La migrazione la assegna il Coordinatore con la lista; la
  prima libera il 2026-11-06 è la 0054.
- **B — il meteo.** Il server chiede MET Norway per la stazione guardata e
  tiene la risposta in cache. La neve fresca si stima dalla precipitazione
  sotto lo zero.
- **C — la ricerca «Ski».** Nell'app, l'elenco delle stazioni (per nome e
  vicine) e la pagina della stazione.
- **D — «Record your day».** La stazione trovata dalla posizione, da
  cambiare con un tocco; il modello, il meteo, il tipo di neve e i km
  totali (discese più risalite). Poi il post che li mostra.
- **E — la prova sulla neve**, insieme a quella di TASK-375.

Ogni parte manda prima al Coordinatore la sua lista dei file.

**Parte A, 2026-11-06.** Le stazioni sono sul server, da OpenSkiData
(sotto, nell'aggiunta ad ADR-0338). Si cercano con `GET /ski-resorts`, per
nome o per vicinanza, e una alla volta con `GET /ski-resorts/{id}`:
`API.md` «Ski resorts», `DATABASE.md` (0054), `MAPS.md` «Le stazioni
sciistiche da OpenSkiData». Prossimo: il server con la 0054 e il primo
import, comandi dell'utente col suo sì. Poi la parte B, il meteo.

**Parte B, 2026-11-06.** `GET /ski-resorts/{id}/weather` dà il meteo da
MET Norway:
- in valle e in cima, cioè alle quote minima e massima della stazione;
- le prossime 24 ore e la neve fresca attesa, che è una stima
  (`snow_estimate: true`);
- la richiesta parte dal server, con il centro della stazione (4 decimali)
  e la quota;
- le risposte restano in cache fino al loro `Expires`, con un timeout di 4
  secondi;
- se MET Norway tace, si dà l'ultima previsione con `stale: true`.

Dettagli in `API.md` («Il meteo») e nell'aggiunta ad ADR-0338. Prossimo: il
deploy col sì dell'utente; poi la domanda 2 e la parte C.

**Parte C, 2026-11-06.** Nella ricerca c'è la scheda «Ski»
(`src/ski/`):
- senza scrivere niente, chiede la posizione e mostra «Near you», le
  stazioni più vicine; da due lettere, quelle con quel nome, 300 ms dopo
  l'ultima lettera, come la ricerca dei disegni;
- toccata una stazione, la sua pagina si apre sopra la ricerca, e «Back»
  la riporta com'era;
- la pagina mostra nome, regione, impianti, km di piste (totali e per
  difficoltà, dalla più facile), le quote, il sito (solo un indirizzo
  `http` o `https`), il meteo e i crediti;
- il meteo: valle e cima, la temperatura di adesso, la neve fresca con la
  riga della stima, e un'ora ogni tre delle prossime 24. Con `stale` c'è
  la riga «Older forecast». Con un `503` c'è «Weather unavailable right
  now.».

Scelte tecniche, decise dall'agente su delega dell'utente:
- all'API va la posizione arrotondata a 2 decimali, circa un chilometro,
  come per i luoghi intorno. Per ordinare le stazioni basta;
- chi usa le miglia vede le quote in piedi, i gradi Fahrenheit e la neve
  in pollici; gli altri metri, gradi Celsius e centimetri;
- le ore sono quelle del telefono;
- i simboli del meteo di MET Norway diventano emoji, quindi senza
  immagini nuove;
- «Lifts» e «Top» hanno già un'altra traduzione nell'app («Risalite»,
  «Top»), quindi qui si scrivono `Lifts@@resort` e `Top@@resort`.

Prossimo: la parte D, con la sua lista dei file.

**La parte D in tre PR**, ognuna da main dopo la precedente:
- **D1, il server:** stazione, modello e neve della giornata.
- **D2, l'app:** «Record your day» con la stazione e il suo meteo, a fine
  giornata la neve, il modello e i km totali, e il post che li mostra.
- **D3, la pagina della stazione:** la neve dei membri, i loro post e il
  tasto per seguirla.

**Parte D1, 2026-11-08.** La giornata di sci tiene la stazione, il modello
e il tipo di neve (`API.md`, «La giornata di sci: stazione, modello e
neve»; migrazione `0056`):
- `PUT /me/activities/{key}/ski` li scrive dopo il salvataggio della
  giornata, come il post. Il corpo di `PUT /me/activities/{key}` resta
  com'era;
- `GET /drawings/{id}/ski-day` li mostra sul post a chi lo vede;
- `GET /ski-resorts/{id}/snow` conta la neve segnata dai membri nella
  stazione nelle ultime 24 ore. Contano solo i post che chi chiede vede su
  un profilo, e dà solo numeri.

Le scelte tecniche sono nell'aggiunta ad ADR-0338. Prossimo: il server con
la `0056`, col sì dell'utente; poi la parte D2.

D1 è in `main` (#935) e sul server dal 2026-11-08 (`c9bc0da9`).

**Parte D2, 2026-11-08.** Nell'app, «Record your day» per lo sci:
- **durante la giornata**, sopra i numeri, la stazione più vicina con la
  temperatura di adesso e la neve fresca in valle. «Cambia» ne sceglie
  un'altra per nome o vicina, con l'elenco della ricerca «Ski». La stazione
  resta per la giornata, anche se l'app si riapre;
- **a fine giornata** il riquadro «Totale» (discese più risalite), poi «Com'era
  la neve?» con i cinque tipi (uno o nessuno) e «La tua attrezzatura»,
  ricordata per la volta dopo;
- **con «Salva»** le scelte partono con la giornata (`PUT
  /me/activities/{key}/ski`);
- **sul post** compaiono «Stazione», «Neve» e «Attrezzatura», sotto impianti
  e piste;
- **la riga della privacy** approvata è in fondo a «Le tue corse e le loro
  tracce GPS», in cinque lingue e sul sito.

Scelte tecniche, decise dall'agente su delega dell'utente:
- **le scelte si mandano dopo la giornata.** Un piccolo outbox
  (`useSkiDayOutbox`) le prova appena la giornata è sul server: un `404`
  vuol dire che non c'è ancora, quindi riprova ogni minuto, e dopo 7 giorni
  lascia perdere. Così `activitiesDoor.ts` e il salvataggio della giornata
  restano com'erano;
- **le scelte stanno in un file del telefono** (`ski-day.json`). Stazione e
  neve valgono solo per la giornata, l'attrezzatura resta. La stazione
  scelta più di 18 ore prima è di un altro giorno;
- **la stazione si prende da sola solo entro 5 km** da dove parte la
  giornata; oltre c'è «Nessuna stazione sciistica vicina» e si sceglie con
  «Cambia»;
- **la data della pagina privacy non cambia**, come per la palestra
  (TASK-385 F): la riga si aggiunge alla pagina del 6 novembre.

Prossimo: l'OTA col sì dell'utente; poi la parte D3, la pagina della
stazione con la neve dei membri, i loro post e il tasto per seguirla.

D2 è in `main` (#960); esce con il prossimo OTA di produzione del
Coordinatore, col sì dell'utente.

**La parte D3 in due PR:** D3a sul server, D3b nell'app.

**Parte D3a, 2026-11-08.** Sul server (`API.md`, «Seguire una stazione e i
suoi post»; migrazione `0062`):
- `PUT` e `DELETE /me/ski-resorts/{id}/follow`, e `GET /me/ski-resorts`:
  «Your resorts», l'ultima seguita prima, nessuna notifica;
- `GET /ski-resorts/{id}/drawings`: i post delle giornate di sci in quella
  stazione che chi chiede vede, dalla più recente, a pagine come un
  profilo.

D3a è in `main` (#976). Le scelte tecniche sono nell'aggiunta ad ADR-0338.
La `0062` va sul server nel passo unico con la `0061` e la `0063`.

**I testi della D3b**, approvati dall'utente il 2026-11-08 («Sì,
approvati»), in inglese con l'italiano; de, fr ed es tradotti allo stesso
modo:
- «Your resorts» («Le tue stazioni»), in cima alla scheda «Ski» e a
  «Cambia»;
- «Follow» e «Following», gli stessi dei membri («Segui», «Segui già»);
  toccato di nuovo, non la segue più;
- «Snow today» («Neve di oggi»), con «{snow} ×{days}», e «Marked by the
  members in the last 24 hours.» («Segnata dai membri nelle ultime 24
  ore.»);
- «Members' days here» («Le giornate dei membri qui»).

Le parti vuote non compaiono. Prossimo: la D3b.

**Parte D3b, 2026-11-08.** Nell'app, la pagina della stazione e «Your
resorts»:
- **«Follow»** sotto il nome, che diventa «Following»; toccato di nuovo,
  non la segue più. Cambia subito, e torna com'era se il server dice di no;
- **«Snow today»**: la neve segnata dai membri nelle ultime 24 ore, la più
  segnata prima («Powder ×3 · Groomed ×1»), con la riga che lo spiega;
- **«Members' days here»**: i post delle giornate di sci in quella stazione
  che chi guarda vede, due per riga come i disegni della ricerca, ognuno
  con chi l'ha fatto. Toccato, si apre sulla mappa e la ricerca si chiude;
  «Show more» porta la pagina dopo;
- **«Your resorts»** in cima all'elenco delle stazioni, nella scheda «Ski»
  e in «Cambia», finché non si scrive niente.

Scelte tecniche, decise dall'agente su delega dell'utente:
- **una sola lista delle stazioni seguite** per tutta l'app
  (`useFollowedResorts`), letta una volta per sessione: la pagina e
  l'elenco si vedono cambiare insieme;
- **i post con l'autore**: la rotta della D3a dà ora `posts` con `author`
  come il Feed (#1004), perché i post di una stazione sono di più membri;
- **le parti vuote non compaiono**, e senza account la pagina resta quella
  della parte C.

Prossimo: il server con la `0062` nel passo unico; poi l'OTA col sì
dell'utente, e la parte E, la prova sulla neve.

## File toccati

Questa PR (documenti): `docs/tasks/TASK-406.md` (nuovo), `docs/DECISIONS.md`
(ADR-0338), `docs/STATUS.md` (una voce), `docs/INDEX.md` (una riga).

Parte A (approvata dal Coordinatore il 2026-11-06, migrazione 0054). La
fonte è OpenSkiData, approvata dal Coordinatore lo stesso giorno al posto
delle aree OSM degli estratti. File nuovi:
- `services/api/migrations/0054_ski_resorts.sql`;
- `services/api/shaperoute_api/ski_resorts.py`, `ski_resorts_api.py` e
  `resort_import.py`;
- `services/api/tests/test_ski_resorts_api.py`, `test_resort_import.py` e
  `fixtures/ski/ski_areas.geojson`.

File da cambiare: `services/api/shaperoute_api/__main__.py` (una riga),
`docs/API.md`, `docs/DATABASE.md`, `docs/MAPS.md`, `docs/DECISIONS.md`
(un'aggiunta ad ADR-0338), `docs/STATUS.md` e questa lista.

Parte B (approvata dal Coordinatore il 2026-11-06). File nuovi:
- `services/api/shaperoute_api/resort_weather.py`;
- `services/api/tests/test_resort_weather.py` e
  `fixtures/ski/met_compact.json`.

File da cambiare: `services/api/shaperoute_api/ski_resorts_api.py`,
`services/api/tests/test_ski_resorts_api.py`, `.env.example`,
`docs/API.md`, `docs/DECISIONS.md` (un'aggiunta ad ADR-0338),
`docs/STATUS.md` e questa lista.

Parte C (approvata dal Coordinatore il 2026-11-06). File nuovi:
- `packages/shared-types/src/skiResorts.ts`,
  `fixtures/ski-resorts.json`, `fixtures/ski-resort-weather.json` e
  `test/skiResorts.test.ts`;
- `apps/mobile/src/api/skiResorts.ts` e il suo test;
- `apps/mobile/src/ski/ResortList.tsx`, `ResortPage.tsx` e
  `ResortWeather.tsx`, ognuno col suo test;
- `apps/mobile/src/search/skiResorts.test.tsx`.

File da cambiare: `packages/shared-types/src/index.ts` (una riga),
`apps/mobile/src/search/SearchScreen.tsx`,
`apps/mobile/src/i18n/{it,de,fr,es}.ts`, `docs/API.md` (una riga sui
tipi), `docs/STATUS.md` e questa lista. Aggiunto col via del Coordinatore
il 2026-11-06: `apps/mobile/src/tabs/TabSwipeOwners.test.ts` (una riga,
la fila delle ore del meteo che scorre di lato).

Parte D1 (approvata dal Coordinatore il 2026-11-08; la migrazione è la
prima libera al merge, `0056` quel giorno). File nuovi:
- `services/api/migrations/0056_ski_days.sql`;
- `services/api/shaperoute_api/ski_days.py` e
  `services/api/tests/test_ski_days_api.py`;
- `packages/shared-types/src/skiDays.ts`, `fixtures/ski-day-request.json`,
  `fixtures/ski-day.json`, `fixtures/resort-snow.json` e
  `test/skiDays.test.ts`.

File da cambiare: `services/api/shaperoute_api/__main__.py` (una riga),
`packages/shared-types/src/index.ts` (una riga), `docs/API.md`,
`docs/DATABASE.md`, `docs/DECISIONS.md` (un'aggiunta ad ADR-0338),
`docs/STATUS.md` e questa lista.

Parte D2 (approvata dal Coordinatore il 2026-11-08). File nuovi:
- `apps/mobile/src/api/skiDays.ts` e il suo test;
- `apps/mobile/src/ski/skiDayStore.ts`, `useSkiDayOutbox.ts`,
  `DayResort.tsx`, `DayChoices.tsx` e `SkiDayLine.tsx`, ognuno col suo
  test, e `skiDayFlow.test.tsx`.

File da cambiare: `apps/mobile/src/screens/FreeRunScreen.tsx`,
`SnowFinishCard.tsx` e `SnowFinishCard.test.tsx`, `apps/mobile/App.tsx`
(otto righe), `apps/mobile/src/social/drawingsDoor.ts`, `DrawingCard.tsx`
(una riga), `apps/mobile/src/i18n/{it,de,fr,es}.ts`,
`apps/mobile/src/about/content/{en,it,de,fr,es}.ts` (la riga della
privacy), `site/privacy/` (rigenerata), `docs/STATUS.md` e questa lista.

Parte D3a (approvata dal Coordinatore il 2026-11-08; migrazione `0062`).
File nuovi:
- `services/api/migrations/0062_followed_resorts.sql`;
- `services/api/shaperoute_api/resort_follows.py` e
  `services/api/tests/test_resort_follows.py`;
- `packages/shared-types/src/resortFollows.ts`,
  `fixtures/followed-resorts.json` e `test/resortFollows.test.ts`.

File da cambiare: `services/api/shaperoute_api/__main__.py` (una riga),
`packages/shared-types/src/index.ts` (una riga), `docs/API.md`,
`docs/DATABASE.md` e questa lista. Le righe di `STATUS.md` e
`DECISIONS.md` in una PR di soli documenti (la regola del Coordinatore del
2026-11-08).

Parte D3b (approvata dal Coordinatore il 2026-11-08). File nuovi:
- `apps/mobile/src/api/resortFollows.ts` e il suo test;
- `apps/mobile/src/ski/ResortSnow.tsx`, `ResortPosts.tsx` e
  `useFollowedResorts.ts`, ognuno col suo test.

File da cambiare: `apps/mobile/src/ski/ResortPage.tsx` e `ResortList.tsx`,
`apps/mobile/src/social/drawingsDoor.ts`,
`apps/mobile/src/i18n/{it,de,fr,es}.ts` e questa lista. Aggiunto col via
del Coordinatore il 2026-11-08: `apps/mobile/src/search/SearchScreen.tsx`
(la sola riga `onLeave={onClose}`). I test di `ResortPage` e `ResortList`
restano com'erano: «Follow» e «Your resorts» sono provati in
`useFollowedResorts.test.tsx`.

La parte E: si elenca prima.

## Criteri di accettazione

- [ ] Le domande 1–5 hanno una risposta scritta qui.
- [ ] Ogni parte ha la lista dei file approvata dal Coordinatore e test
  deterministici. I test del meteo non usano la rete.
- [ ] MET Norway: User-Agent identificabile, cache sul server, coordinate
  della stazione, attribuzione nell'app.
- [ ] L'impronta del motore e quella iOS non cambiano, salvo una lista che
  lo dica.
