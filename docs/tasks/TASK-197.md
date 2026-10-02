# TASK-197 — La penna alzata nelle parole: motore e API

**Stato**: Todo
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
   coordinatore): si aggiunge `walks` senza togliere né cambiare niente.
   Un'app che non lo conosce vede una linea sola, come oggi.
8. **Il punteggio**: `POST /track-scores` prende anche `walks`, facoltativo,
   e confronta la corsa con le sole lettere.
9. **Il GPX del percorso** (`export_gpx.py`): la linea resta una sola, da
   seguire; ogni tratto a piedi aggiunge un `<wpt>` «Pause» dove comincia
   e uno «Resume» dove finisce, per chi corre con l'orologio e mette in
   pausa a mano. Da scrivere in `GPX.md`.
10. **La CLI**: `--pen-up` con `--word`; stampa la lunghezza di ogni
    tratto a piedi.
11. **`shared-types`** e i suoi fixture: `pen_up` nella richiesta, `walks`
    nel risultato.
12. **ADR-0157** in `DECISIONS.md`: perché indici in `points` e non pezzi
    separati (le app installate e tutto ciò che legge `points`, come la
    navigazione, le indicazioni e il GPX, restano come sono). Deciso
    dall'agente su delega dell'utente.

## Criteri di accettazione

- [ ] `pen_up: true` con `shape` o con un'immagine risponde
      `invalid_request`, con il messaggio del punto 1.
- [ ] Una parola senza `pen_up` dà lo stesso percorso di prima, punto per
      punto: un test lo controlla sul grafo dei fixture. Così gli esempi
      sul server non vanno ridisegnati per questo task.
- [ ] Con `pen_up` e n lettere, `walks` ha n − 1 coppie; ognuna è dentro
      `points`, in ordine, senza sovrapporsi; dove finisce un tratto a
      piedi comincia la lettera successiva.
- [ ] La somiglianza con `pen_up` non cambia se si allunga un tratto a
      piedi: test.
- [ ] La lunghezza delle sole lettere sta nella tolleranza di distanza che
      il motore usa oggi.
- [ ] Un `RouteResult` senza `walks` (un'API vecchia) si legge ancora:
      test del contratto.
- [ ] `POST /track-scores` con `walks` non conta i punti della corsa sui
      tratti a piedi: test.
- [ ] Il GPX di una parola con `pen_up` e n lettere ha 2 × (n − 1)
      waypoint, nell'ordine del percorso.
- [ ] Test verdi: motore, API, `shared-types`; `ruff`, `black`.

## File toccati

Elenco previsto; la PR dichiara i suoi.

```
services/route-engine/route_engine/words.py
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/models.py
services/route-engine/route_engine/export_gpx.py
services/route-engine/route_engine/track_score.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/track_scores.py
services/api/tests/
packages/shared-types/src/index.ts
packages/shared-types/fixtures/
docs/ROUTE_ENGINE.md
docs/API.md
docs/GPX.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-197.md
```

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
- **Ridisegnare gli esempi** sul server: non serve se il secondo criterio
  tiene. Se un cambio tocca anche i percorsi senza `pen_up`, va detto al
  coordinatore, e gli esempi si ridisegnano dopo l'aggiornamento del
  server, con l'ok dell'utente.

## Esito

*(a fine task)*
