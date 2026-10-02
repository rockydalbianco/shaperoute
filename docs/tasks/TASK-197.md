# TASK-197 — La penna alzata nelle parole: motore e API

**Stato**: Done (2026-10-02; il merge è del coordinatore)
**Fase**: 4 · **Branch**: `feat/TASK-197-pen-up-words`
**ADR**: ADR-0157, dal coordinatore il 2026-10-02 (il contratto dei tratti
a piedi)
**Dipende da**: niente di nuovo. **Si accorda con TASK-190 (bici) e
TASK-191 (canoa)**, che cambiano gli stessi file del motore e dell'API
(`models.py`, `__main__.py`, `schemas.py`, `shared-types`): chi parte dopo
riparte da `main` con i loro cambi dentro, e la coda la tiene il
coordinatore.
**Dopo**: TASK-198, la parte dell'app.

## Obiettivo

Una parola si può chiedere «con la penna alzata». Il motore disegna ogni
lettera per conto suo. Fra una lettera e l'altra c'è un tratto a piedi, la
strada più breve dalla fine di una lettera all'inizio della successiva, che
non fa parte del disegno. La risposta dice quali punti del percorso sono a
piedi.

Chiesto dall'utente il 2026-10-02: «per le scritte, stoppare il tragitto,
camminare fino alla seconda lettera senza tracciare, e lei ricomincia a
tracciare». Confermato lo stesso giorno: **pausa automatica con avviso a
voce** (è TASK-198).

## Perché

- Oggi le lettere sono unite da una linea di base, e quella linea deve
  passare su una strada: dove non c'è, il percorso fa giri che sporcano la
  parola. Con la penna alzata le lettere non hanno bisogno di essere unite
  per strada.
- La corsa si registra già con le pause (TASK-169, ADR-0137) e il GPX per
  Strava apre un segmento nuovo a ogni pausa (TASK-187, `run_gpx.py`): un
  tratto a piedi è una pausa che l'app mette da sola.
- Strava, durante una pausa, disegna una linea dritta dal punto dove ci si
  è fermati a quello dove si riparte. Se ogni lettera finisce sulla base e
  la successiva comincia sulla base, quella linea è una base dritta.
- Una prova fuori dal repository (sessione social, 2026-10-02, script in
  `out/social/runclub/src/penup9.py`): a Trento le stesse lettere tracciate
  una per una, con i tratti a piedi fra loro, coprono di più la forma e
  escono meno dalle strade della parola tracciata tutta unita.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §2 «Parole lettera per lettera», «Lettere
  squadrate»; §5 «Lettere che si spostano», «Il punteggio di una traccia
  corsa»
- `docs/API.md` «`POST /routes`», «Una parola invece di una forma»,
  «`POST /track-scores`»
- `docs/GPX.md`
- `services/route-engine/route_engine/words.py`, `optimizer.py`
  (`fit_letters`, la ricerca con una parola), `network.py` (`first_leg`)

## Cosa fare

1. **La richiesta**: `RouteRequest` prende `pen_up`, vero o falso, falso
   di default. Solo con `word`: con `shape` o con un'immagine è
   `invalid_request` (`pen_up is for the letters of a word`).
2. **Le lettere**: con `pen_up` ogni lettera è una linea a sola andata,
   il suo `out`, dall'ingresso all'uscita sulla base, senza `back` e senza
   la linea che la unisce alla successiva. La parola parte dall'ingresso
   della prima lettera e finisce all'uscita dell'ultima: non è più chiusa.
   Lo spazio fra le lettere resta quello dello stile, così la linea dritta
   di Strava cade sulla base.
3. **I tratti a piedi**: dalla fine di una lettera all'inizio della
   successiva, la strada più breve. Non hanno corridoio né somiglianza.
4. **La ricerca**: le lettere si spostano come oggi (§5), ma un tratto a
   piedi non conta nella somiglianza né nel corridoio. La somiglianza del
   risultato è quella delle sole lettere.
5. **La distanza**: quella chiesta vale per le lettere, cioè la parte che
   la corsa registra. `distance_m` resta la lunghezza di tutti i `points`,
   tratti a piedi compresi.
6. **La risposta**: `RouteResult` prende `walks`, una lista di coppie
   `[da, a]` di indici in `points`: i punti da `da` ad `a` compresi sono un
   tratto a piedi. Vuota per una forma e per una parola senza `pen_up`. Le
   `alternatives` hanno ognuna i suoi `walks`.
7. **Le app già installate continuano a funzionare** (attenzione del
   coordinatore: il contratto lo usa l'app pubblicata): `pen_up` e `walks`
   sono **in aggiunta e facoltativi**, niente si toglie né cambia. Un'app
   vecchia con l'API nuova non manda `pen_up` e non legge `walks`: vede
   una linea sola, come oggi. In `shared-types` `walks` è facoltativo,
   così l'app nuova legge anche un'API vecchia.
8. **Il punteggio**: `POST /track-scores` prende anche `walks`, facoltativo,
   e confronta la corsa con le sole lettere.
9. **Il GPX del percorso** (`export_gpx.py`): la linea resta una sola, da
   seguire; ogni tratto a piedi aggiunge un `<wpt>` «Pause» dove comincia
   e uno «Resume» dove finisce, per chi corre con l'orologio e mette in
   pausa a mano. Da scrivere in `GPX.md`.
10. **La CLI**: `--pen-up` con `--word`; stampa la lunghezza di ogni
    tratto a piedi.
11. **`shared-types`** e i suoi fixture: `pen_up` nella richiesta, `walks`
    nel risultato, tutti e due facoltativi.
12. **ADR-0157** in `DECISIONS.md`: perché indici in `points` e non pezzi
    separati (le app installate e tutto ciò che legge `points`, come la
    navigazione, le indicazioni e il GPX, restano come sono). Deciso
    dall'agente su delega dell'utente.
13. **Dopo il merge**: l'aggiornamento del server, poi `draw_examples`
    rilanciato. Ogni cambio di `route_engine` cambia `engine_fingerprint`
    e gli esempi tenuti si ridisegnano (`API.md`, TASK-168): anche se i
    percorsi senza `pen_up` restano gli stessi. Tutti e due con l'ok
    dell'utente, da `origin/main` pulito.

## Criteri di accettazione

- [x] `pen_up: true` con `shape` o con un'immagine risponde
      `invalid_request`, con il messaggio del punto 1.
- [x] Una parola senza `pen_up` dà lo stesso percorso di prima, punto per
      punto: un test lo controlla sul grafo dei fixture.
- [x] Con `pen_up` e n lettere, `walks` ha n − 1 coppie; ognuna è dentro
      `points`, in ordine, senza sovrapporsi; dove finisce un tratto a
      piedi comincia la lettera successiva.
- [x] La somiglianza con `pen_up` non cambia se si allunga un tratto a
      piedi: test.
- [x] La lunghezza delle sole lettere sta nella tolleranza di distanza che
      il motore usa oggi.
- [x] Un `RouteResult` senza `walks` (un'API vecchia) si legge ancora:
      test del contratto.
- [x] `POST /track-scores` con `walks` non conta i punti della corsa sui
      tratti a piedi: test.
- [x] Il GPX di una parola con `pen_up` e n lettere ha 2 × (n − 1)
      waypoint, nell'ordine del percorso.
- [x] Test verdi: motore, API, `shared-types`; `ruff`, `black`.

## File toccati

Quelli della PR, file per file (i nuovi segnati):

```
services/route-engine/route_engine/pen_up.py            (nuovo)
services/route-engine/route_engine/words.py
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/network.py
services/route-engine/route_engine/nearby_starts.py
services/route-engine/route_engine/models.py
services/route-engine/route_engine/export_gpx.py
services/route-engine/route_engine/track_score.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_pen_up.py              (nuovo)
services/route-engine/tests/test_contract.py
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/track_scores.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/route_store.py
services/api/tests/test_pen_up.py                       (nuovo)
services/api/tests/test_contract.py
services/api/tests/test_track_scores.py
services/api/tests/test_request_log.py
packages/shared-types/src/index.ts
packages/shared-types/test/contract.test.ts
packages/shared-types/fixtures/route-request-pen-up.json        (nuovo)
packages/shared-types/fixtures/route-result-pen-up.json         (nuovo)
packages/shared-types/fixtures/track-score-request-walks.json   (nuovo)
docs/ROUTE_ENGINE.md
docs/API.md
docs/GPX.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-197.md
```

Fuori dall'elenco previsto, e perché (nessuna PR aperta li toccava il
2026-10-02; nessun task in lavorazione li elenca):

- `network.py`: `snap_to_network(closed=False)` traccia una lettera come
  linea aperta, e `NetworkRoute.walks` porta i tratti a piedi fino al
  risultato. Per difetto tutto com'era (ADR-0157, «Scartate»: le due
  strade senza toccarlo).
- `nearby_starts.py`: l'API pianifica le parole da lì
  (`ShapeJob.of_request`): `pen_up` alla parola, i `walks` spostati con
  l'avvicinamento, la distanza delle sole lettere nella scelta fra le
  partenze.
- `app.py`: `pen_up` al motore, rifiutato per un'immagine con il messaggio
  del punto 1, i `walks` al GPX.
- `route_store.py`: i percorsi tenuti distinguono la penna alzata e
  rileggono i `walks` (quelli scritti prima, senza, come vuoti).
- `test_request_log.py`: la riga del registro ha `pen_up`, come ebbe
  `style` con TASK-080.
- `shared-types/test/contract.test.ts`: i controlli del contratto dalla
  parte di `tsc`.

## Fuori scope

- **L'app**: la pausa automatica, l'avviso a voce, i tratti tratteggiati,
  l'interruttore in «Draw». È TASK-198.
- **Le cifre** nelle parole (il «9» di «9AM», il club che ha fatto nascere
  l'idea): l'alfabeto resta dalla A alla Z. È un task a parte, da chiedere
  all'utente.
- **Le forme fatte di più pezzi** (due occhi, i due punti di «9:00»): la
  stessa idea, ma un'altra richiesta.
- **Meno di 3 km per lettera** (`LETTER_DISTANCE_M`): con la penna alzata
  forse basta meno, ma si misura dopo, con le prove.

## Esito

**Fatto**, motore e API, PR #217 dal branch `feat/TASK-197-pen-up-words`
(ADR-0157). Come funziona: `ROUTE_ENGINE.md` §2 e §5, «La penna alzata»;
`API.md`, «La penna alzata»; `GPX.md`, «La penna alzata».

- **Richiesta**: `pen_up` in `RouteRequest`, falso se manca; con `shape`, o
  in una richiesta d'immagine, `invalid_request` (`pen_up is for the
  letters of a word`). La CLI ha `--pen-up`, solo con `--word`.
- **Lettere e tratti a piedi** (`pen_up.py`): ogni lettera è il suo `out`
  una volta, tracciata come linea aperta (`snap_to_network(closed=False)`)
  con le zone e il corridoio del disegno intero; fra due lettere la strada
  più breve, senza zone né corridoio. Una fase sola, l'ingresso della prima
  lettera, che non si sposta; le altre si spostano come prima. Il percorso
  è una linea sola e **non è chiuso**.
- **`walks`** in `RouteResult` (e in ogni alternativa): coppie `[da, a]` di
  indici in `points`, compresi, in ordine; n − 1 per n lettere; dove finisce
  un tratto comincia la lettera successiva. Esempio in `API.md` e nella
  fixture `route-result-pen-up.json`: `"walks": [[2, 5]]` per «IO».
- **Somiglianza e distanza** delle sole lettere; `distance_m` di tutti i
  `points`. Le partenze vicine spostano i `walks` con l'avvicinamento.
- **`POST /track-scores`** prende `walks`: non contano le posizioni su un
  tratto a piedi né sulla linea dritta di una registrazione in pausa.
  **GPX**: una linea sola, più «Pause» e «Resume» per tratto, prima del
  `<trk>`. **Percorsi tenuti**: la penna alzata è un'altra richiesta.
- **Senza `pen_up` niente cambia**: un test di
  `services/route-engine/tests/test_pen_up.py` confronta cinque percorsi
  di parole (griglia e grafo dei fixture di Levico, anche con le partenze
  vicine dell'API) con le impronte calcolate su `main` a 59dd8a7 prima di
  cambiare il codice: uguali. I
  test di prima restano verdi; cambiano solo i controlli del contratto che
  confrontano i campi delle fixture vecchie (ora «senza `pen_up` e
  `walks`», come per i dettagli di TASK-079) e l'atteso del registro delle
  richieste (`pen_up: false` in più).

**Sulle strade vere** (2026-10-02, dalla CLI con `--nearby 3`, zone di
Trento e della Valsugana copiate da `data/cache/` del checkout principale
in una cartella temporanea; Overpass non provato): «CIAO» 15 km dal centro
di Trento, chiusa 0,83 e 15,96 km con lettere alte 659 m in 11 s; con la
penna alzata 0,90, 15,37 km di lettere più 2,09, 1,05 e 1,09 km a piedi
(19,59 in tutto), lettere alte 1.121 m, partenza spostata di 1 km, 18 s.
«IO» 6 km da Levico: chiusa 0,97 (5,12 km), penna alzata 0,92 (5,13 km di
lettere e 0,98 a piedi). **Non giudicati a occhio dall'utente.** Il resto
(i criteri qui sopra) solo su griglie e sul grafo dei fixture.

**Per TASK-198 (l'app)**: mandare `pen_up: true` solo con una parola;
leggere `walks` se c'è (un'API vecchia non lo manda: una linea sola); il
percorso con `walks` **non è chiuso**, va dalla prima lettera all'ultima,
e l'ultimo punto non è la partenza; mettere in pausa la registrazione al
punto `da` di ogni tratto e riprendere al punto `a`; mostrare i km delle
lettere e quelli a piedi (le lettere a parità di km sono 1,7 volte più
alte, e i tratti a piedi aggiungono il 20–30%); rimandare i `walks` a
`POST /gpx` e a `POST /track-scores`; le indicazioni di svolta coprono
anche i tratti a piedi.

**Dopo il merge, con l'ok dell'utente**: l'aggiornamento del server
(`DEPLOY.md` F.12) e poi `draw_examples` rilanciato, da `origin/main`
pulito: il motore cambiato cambia `engine_fingerprint`, e gli esempi tenuti
si ridisegnano anche se i percorsi senza `pen_up` restano gli stessi.
