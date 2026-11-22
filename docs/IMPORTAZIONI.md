# IMPORTAZIONI — Attività fatte con altre app, e post di sole foto

> Le regole di TASK-312 (ADR-0272). Il perché delle scelte sta nell'ADR;
> le parti, i file e i criteri stanno in `tasks/TASK-312.md`.

L'utente, il 2026-10-27: «Possibilità di caricare anche attività che hanno
già fatto in precedenza con altre app o instagram sul nostro feed». Le sue
scelte, fra il 27 e il 28 ottobre 2026:

- prima un **file** (GPX, TCX, FIT), poi **Apple Salute** in una parte
  dopo, e anche **Strava, Garmin e le app più famose**;
- nel Feed anche **post di sole foto**, senza traccia;
- la dipendenza nuova `expo-document-picker`, **come i contatti**
  (TASK-262 C): la 1.0 non cambia e il pulsante si accende con la build
  nativa dopo;
- le attività importate e i post di sole foto **contano solo per il
  Feed**, con la scritta «Imported»: niente gioco, niente concorso.

## 1. Cosa si può aggiungere

| Che cosa | Da dove | Parte |
|---|---|---|
| Un'attività con la sua traccia | un file GPX, TCX o FIT esportato da un'altra app (Strava dal sito, Garmin Connect, Komoot, Polar Flow, Suunto, Coros, Wahoo…) e salvato in «File» | A (API), B (app) |
| Un post di sole foto | da 1 a 10 foto dal rullino, anche quelle già messe su Instagram | C |
| Gli allenamenti già sul telefono | Apple Salute (iOS), Health Connect (Android) | D, prima uno studio (§7) |
| Le attività di un account esterno | un collegamento diretto a Garmin, Polar, Suunto, Coros, Wahoo, Strava… | E, prima uno studio (§8) |
| Un allenamento in palestra già fatto | scritto a mano dal «+» del Feed («Gym workout»: esercizi, serie, pesi, giorno, ora, durata) | TASK-484, ADR-0395 (`sports/gym.md`) |

**Instagram non si collega.** La sua API legge solo gli account Business o
Creator, e solo dopo la revisione di Meta. Un post di Instagram, poi, è
un'immagine senza GPS. Le foto arrivano dal rullino, come quelle di ogni
post (ADR-0170).

## 2. Dove si comincia

In «My activities» (Profile) c'è un pulsante «Add past activity». Apre due
scelte: «From a file» e «Photos only». *Proposta, da confermare con i
testi della parte B.*

Anche dal Feed (TASK-476, ADR-0387; TASK-481, ADR-0390): il «+» a destra
delle schede apre il foglio «Add to Feed» sulla lista delle voci pronte,
nell'ordine «Record now», «Photos only», «From a file» (poi «Sleep», «Gym
workout», «Workout plan» quando arrivano). «Record now» chiude il foglio e
fa partire la registrazione dello sport scelto; «Photos only» apre il modulo
del post di sole foto; «From a file» apre subito «Files». Una voce si apre
nello stesso foglio, con «‹» per tornare alla lista. Il «+» c'è con
l'account anche senza il selettore di file (TASK-312 C2): allora manca
solo «From a file».

Senza account il pulsante non c'è, come «My activities». Senza il modulo
nativo del selettore di file (la 1.0 da App Store, finché non arriva la
build dopo) «From a file» è nascosto e resta «Photos only».

## 3. Un'attività da un file

1. **Si legge sul telefono.** Dal file si prendono solo i punti con
   latitudine, longitudine e orario. Senza orari (un percorso, non
   un'attività) il file è rifiutato: «This file has no times: it is a
   route, not an activity.». Senza posizioni (il tapis roulant) è
   rifiutato anche lui.
2. **Diventa una corsa di «My activities»**, con lo stesso
   `PUT /me/activities/{key}` di una corsa registrata, più
   `"source": "file"`. La chiave è quella di sempre (`activityKey`, dal
   primo punto): lo stesso file caricato due volte è salvato una volta, e
   l'app dice «Already in My activities.».
3. **Gli orari sono quelli del file.** `started_at` è l'orario del primo
   punto tenuto. Prima del 2020 l'API rifiuta già (`422`): l'app lo dice
   prima di mandarla.
4. **Senza percorso, senza punteggio**: come una corsa libera. Lo sport
   (`running`, `cycling`, `paddling`, `swimming`) è quello del file quando
   lo dice, altrimenti quello di «Settings»; si cambia nel modulo, come
   sempre. Un nuoto (TASK-323 D): `swimming` nel `<type>` del GPX o nello
   Sport del TCX, `sport` 5 nel FIT; in acque libere l'orologio scrive le
   posizioni, il file di una piscina non ne ha e non diventa un disegno.
5. **La traccia la pulisce l'API**, con `clean_track` come ogni corsa. Un
   buco di più di 60 s fra due punti diventa una pausa `auto`: il tempo
   non conta, i metri sì. Più di 20 000 punti: il telefono ne tiene uno
   ogni tanti, a passo uguale, fino a 20 000. Un file di più di 25 MB è
   rifiutato.
6. **Poi il modulo di sempre**: titolo, descrizione, 3 foto, persone
   taggate, sport, chi la vede, con «Only me» all'inizio come a ogni corsa
   (TASK-208); dal «+» del Feed con «Everyone», che si vede sopra «Save»
   e si cambia (ADR-0387). Sopra il modulo, la scritta «Imported».
7. **«Send to Strava» non c'è** per una corsa importata: viene da un'altra
   app, e spesso da Strava stessa. *Proposta, da confermare.*

Il file non si tiene: resta solo la corsa, come la tiene l'API.

## 4. Un post di sole foto

1. **Lo stesso modulo senza la mappa e senza i risultati**: da 1 a 10 foto
   (almeno una; scelta dell'utente del 2026-11-21, «Fino a 10 foto»),
   titolo, descrizione, persone taggate. Chi lo vede: «Everyone» o
   «Followers», all'inizio l'ultima scelta salvata (la prima volta, o dopo
   un «Only me», «Everyone»). «Only me» non c'è, perché le foto vanno sul
   server solo quando altri vedono il post (ADR-0170): un post solo foto
   «Only me» sul server sarebbe vuoto. Sul server è un disegno senza corsa
   (`API.md` «Photo posts», `DATABASE.md` migrazione `0080`), pubblicato
   con la prima foto.
2. **Nel Feed** la scheda mostra le foto al posto del disegno, da scorrere
   come in ADR-0275, con «Imported». La data è quella della
   pubblicazione.
3. **Non ha un punto**: nel Feed lo vedono l'autore, chi lo segue e chi
   guarda «tutti», non la fila dei vicini (50 km).
4. **Reazioni, commenti, tag, segnalazioni, blocchi, nascosti** come ogni
   post (TASK-119–121, TASK-213, TASK-291). Titolo e descrizione non
   passano dal filtro dei testi negativi, come quelli di un post
   (TASK-208).
5. **Solo le app che lo sanno mostrare lo ricevono** (`photos` in
   `X-MuW-Reads`): le app di prima non lo vedono mai. Per ora non si
   trova con la ricerca dei disegni, non ha link pubblico e non si manda
   in chat: partono tutti da una corsa.
6. **Si cambia e si cancella dalla sua pagina** (TASK-312 C2): chi l'ha
   scritto apre il post e, dalle impostazioni, cambia titolo, descrizione
   e chi lo vede, o lo cancella («Delete this post? It cannot be
   undone.»). Niente «Share» e niente numeri della corsa. Senza rete il
   post e le sue foto aspettano sul telefono e partono dopo, una foto alla
   volta.

## 5. Cosa non conta

- **Il gioco** (TASK-296: km, passo, forme, sfide, squadre): una corsa con
  `source` diverso da `muw` non entra in `after_run_saved` né nel
  recupero di `game_backfill`. Un post solo foto non ha corsa.
- **Il concorso** (TASK-299): la classifica prende solo i disegni di corse
  con `source = 'muw'`. Un post solo foto non ha corsa, quindi resta fuori
  da sé.
- **La palestra scritta a mano** (TASK-484, ADR-0395, `source = 'manual'`):
  fuori anche dai livelli e dalla classifica della palestra, dai badge,
  da Apple Salute e dal giorno della scheda. Sotto «Imported» la sua
  frase: «Workouts written by hand don't count for Play, contests, levels
  or the leaderboard.»
- **«Imported» si vede** nella scheda del Feed, nel post aperto e nella
  scheda di «My activities». Sotto il titolo del modulo: «Imported
  activities don't count for Play or contests.» *(testo da approvare)*.
- La scritta la mette l'app: non è una prova. Un'app modificata potrebbe
  mandare un file come corsa registrata; `clean_track` e i controlli di
  `game_rules` valgono per ogni corsa, come oggi.

## 6. Privacy

- Gli altri vedono la stessa traccia di ogni post: tagliata di 200 m
  all'inizio e alla fine, senza orari (ADR-0159).
- Gli orari del file valgono come quelli di una corsa salvata; si
  cancellano con la corsa e con l'account.
- Una riga nuova nella privacy, da approvare dall'utente nella parte B:
  «If you add a past activity from a file, we keep its track and times
  like a run recorded with MuW. We do not keep the file.»
- La riga dei post di sole foto, approvata dall'utente il 2026-11-21
  (traduzioni il 2026-11-22), nella privacy dal 22 novembre 2026: «A post
  with «Photos only» has no track, no place and no times. Its photos go to
  our server resized, without the data your phone adds, such as where and
  when they were taken. They are seen, with the title, the description
  and the people you tag, by «Everyone» or by your «Followers»: there is
  no «Only me». The choice starts from your last post, or on «Everyone»,
  and you see it before «Post». The post stays until you delete it or
  your account.»

## 7. Apple Salute e Health Connect (studio, parte D)

Prima di scrivere codice, uno studio scritto risponde a queste domande:

- quali app scrivono in Salute anche la **traccia** (`HKWorkoutRoute`;
  `ExerciseRoute` su Android) e quali solo km e tempo: senza traccia non
  c'è disegno;
- quale libreria: è una dipendenza nativa nuova e vuole il sì dell'utente;
- le regole di Apple sui dati di salute: non si usano per la pubblicità
  (MuW avrà gli annunci, ADR-0198), la privacy va aggiornata, c'è il
  permesso HealthKit; su Android, la dichiarazione di Health Connect su
  Google Play;
- tutto entra solo con una build nativa (1.0.1 iOS, la prima Android).

## 8. Collegamenti diretti (studio, parte E)

Uno studio scritto, provider per provider: chi può entrare nel programma,
se serve un'azienda, quanto costa, quali formati dà, e **se le attività
possono essere mostrate ad altri** iscritti.

- **Strava**: dal novembre 2024 l'accordo API lascia mostrare i dati di
  un utente solo a quell'utente. Lo studio lo verifica sul testo in
  vigore, per iscritto, prima di ogni codice. Il file esportato
  dall'utente (§3) è un suo dato e resta la strada di oggi.
- **Garmin Connect Developer Program**: l'accesso per le aziende si chiede
  con un modulo; la via «Personal» dà solo i propri dati. L'Activity API
  dà JSON e FIT.
- **Polar AccessLink, Suunto, Coros, Wahoo, Komoot**: le stesse domande.

L'esito è una tabella per la scelta dell'utente, nessun codice.

## 9. Limiti noti

- Niente attività prima del 2020 (la regola dell'API sugli orologi).
- Un file compresso (lo «Export Original» di Garmin è uno zip) va aperto
  prima in «File»: l'app non legge gli zip.
- Altitudine, battito e cadenza del file non si tengono: le corse di MuW
  non li hanno (`DATABASE.md`, `runs`).
- «Open in MuW» da un'altra app (MuW nel foglio di condivisione per i
  file GPX) vuole una configurazione nativa: resta per la build nativa
  dopo, insieme al selettore.
