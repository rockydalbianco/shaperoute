# GIOCO — Il gioco delle forme

> Documento di dominio del gioco: come si contano i km, come si sblocca
> una forma, come funzionano squadre e sfide, dove stanno i dati.
> Perché è fatto così: ADR-0255 e, per collezioni, passi, sfide personali e
> premi, ADR-0351. Lo stato delle parti: `tasks/TASK-296.md` e
> `tasks/TASK-423.md` (catalogo intero in `tasks/TASK-423-proposta.md`).
> Le parti di TASK-423 non ancora in `main` sono segnate «(423 X)».

## 1. L'idea

Le corse a piedi salvate in «My activities» valgono per un gioco. I km
sommati e i tempi migliori sbloccano **forme da collezionare**, raccolte
in **collezioni** a tema (423 A). In **squadra** si ricrea insieme una
forma divisa in **pezzi**, entro una scadenza. Da soli ci sono le **sfide
personali** della settimana e del mese e la **streak** (423 C). Forme
rifatte, collezioni complete e sfide finite danno **premi** dentro l'app:
edizioni, cornici, titoli, badge e medaglie (423 E).

Tutto sta in **«Play»**, con due schede: **Collection** e
**Challenges**. Fino al 2026-10-29 era una pagina accanto a Feed, Draw ed
Explore (scelta dell'utente del 2026-10-23); da TASK-327 (scelta
dell'utente del 2026-10-29) si apre a tutto schermo dalla sua riga in
«Draw», subito sotto la distanza.

Le forme del gioco sono figurine: **non** chiudono niente in «Draw», dove
ogni forma resta libera. Non c'è punteggio né classifica: TASK-241 ha tolto
il punteggio su richiesta dell'utente, e il gioco mostra solo la
collezione e le barre di avanzamento. Nessun premio vale denaro e nel
gioco non c'è pubblicità (ADR-0351).

## 2. Chi decide che cosa

- **Il server conta, l'app mostra.** Km, passo e sblocchi si calcolano
  solo sull'API, dalla traccia salvata in `runs`. Un'app modificata non
  può dire «ho corso 100 km».
- **Le regole sono pure.** `services/api/shaperoute_api/game_rules.py`
  riceve una traccia e restituisce un risultato: niente database, rete o
  orologio. Ogni regola ha test deterministici su tracce finte.
- **Il route engine non cambia.** Il gioco non genera percorsi: usa solo
  `clean_track`, `haversine_m` e i contorni di `route_engine/shapes/`, che
  l'API già importa.
- **Tempo reale senza infrastruttura nuova.** L'app rilegge la sfida
  aperta ogni 15 s e quando torna in primo piano; poi ci sono le push.
  Niente WebSocket.
- **Agli altri nessuna coordinata.** I compagni di squadra vedono nome,
  foto, pezzi e km, mai tracce, orari o luoghi.

## 3. Che cosa conta

- Solo le corse a piedi salvate nell'account (`runs.activity =
  'running'`) e, dalle regole 2 (TASK-371, ADR-0315), le camminate
  (`'walking'`). Bici, pagaia, nuoto e sci no. Una camminata conta i suoi
  metri con gli stessi controlli di una corsa (veicolo, sovrapposizione,
  tetto del giorno), ma **senza tempi migliori** (`best_s` vuoto): le forme
  col ritmo restano della corsa, come i record (scelta dell'utente, «Solo i
  metri»). I suoi metri entrano però nella corsa più lunga (`longest_m`), che
  muove la barra di una forma col ritmo finché la distanza non è stata
  corsa: la barra si muove, la forma non si sblocca.
- Solo le corse **registrate dall'app** (`runs.source = 'muw'`, TASK-312,
  ADR-0272). Un'attività aggiunta dal file di un'altra app (`file`, con
  «Imported») non entra in `after_run_saved` né in `game_backfill`: niente
  riga in `game_runs`, niente forme sbloccate, niente pezzi delle sfide.
  Non conta nemmeno come corsa sovrapposta a un'altra. `GET
  /game/runs/{key}` di una corsa così risponde `404`, come per una corsa
  che il gioco non ha calcolato. Il segno lo manda l'app: non è una prova,
  e le regole del §4 valgono per ogni corsa che conta.
- Contano anche le corse salvate **prima** del gioco. Un comando le
  calcola una volta sul server (§7), senza mandare push.
- Due corse dello stesso account che si sovrappongono nel tempo contano
  una volta sola: vale quella salvata prima, l'altra ha la ragione
  `overlap`.
- Al massimo **120 km contati al giorno** (giorno UTC di `started_at`).
  Oltre il tetto la corsa conta solo fino a 120 km.
- Una corsa cancellata toglie i suoi km dal totale, ma le forme già
  sbloccate e i pezzi già finiti restano.
- Una corsa che non conta resta in «My activities» e la ragione si vede
  nel dettaglio della corsa, dentro «Play».

## 4. Anti-imbroglio

Lavora sulla traccia già pulita da `clean_track`: al salvataggio sono già
scartate le posizioni con precisione oltre 40 m, quelle ripetute e i
salti oltre 12 m/s. La traccia salvata non ha più la precisione, quindi
le regole sotto usano solo posizioni e tempi (`M`) e le pause della corsa.

1. **Tratti da veicolo.** Una finestra di passi consecutivi lunga almeno
   200 m e percorsa sopra **7,0 m/s** (2:23/km, più veloce di un record
   del mondo sui 1500 m) non conta.
2. **Corsa da veicolo.** La corsa non conta per niente (ragione
   `vehicle`) se i tratti scartati superano il **10 %** della distanza,
   oppure se la media in movimento supera **6,0 m/s** su più di 3 km.
   Il Roller ha soglie sue: **35 km/h** su 200 m e **28 km/h** di media
   (`speed_limits`, TASK-380, scelta dell'utente).
3. **Buchi.** Un passo fra due posizioni distanti più di 30 s nel tempo
   conta nei km, se la sua velocità è da corsa, ma interrompe i tempi
   migliori: nessuna finestra lo attraversa.
4. **Tempi migliori solo su tratti densi.** Una finestra vale se ha in
   media almeno una posizione ogni 10 s.
5. **Pause.** Il tempo delle pause, manuali e automatiche, non conta. Il
   passo attraverso una pausa manuale non conta né nei km né nei tempi,
   come in `activities.recorded`.

**Limite noto**: una bici guidata piano, a passo di corsa, il solo GPS
non la riconosce. Servirebbe la cadenza dall'accelerometro, cioè una
dipendenza nativa nuova e quindi un task a parte, con il sì dell'utente.

Le soglie stanno in costanti di `game_rules.py`. Ogni volta che una regola
cambia si alza `RULES_VERSION` e il comando del §7 ricalcola le corse.

## 5. La collezione

### 5.1 Sbloccare

- **Per distanza**: la somma dei km contati raggiunge la soglia.
- **Per velocità**: in una sola corsa, un tratto continuo di distanza `D`
  ha un passo pari o migliore della soglia. Per ogni corsa si calcola il
  **miglior tempo in movimento** su 1 000, 5 000, 10 000 e 21 097 m con
  due indici che scorrono la traccia (O(n)), interpolando ai bordi della
  finestra. Dalle regole 3 (423 B) le distanze sono 11: 400, 1 000, 1 609
  (il miglio), 3 000, 5 000, 10 000, 15 000, 21 097, 30 000, 42 195 e
  50 000 m, e il backfill le calcola anche sulle corse vecchie.
- **Con una corsa sola** (423 A, i traguardi): una corsa che ha un tempo
  migliore su `D`, cioè `D` di fila con le regole dei tempi (§4). Nel
  catalogo è un requisito `pace` a 20:00/km con `single_run: true`, perché
  l'app installata rifiuta i tipi di requisito che non conosce; l'app
  nuova scrive «One run of 5 km». Le camminate non hanno tempi, quindi non
  valgono.
- Una forma sbloccata resta per sempre (`game_unlocks`), anche se si
  cancella la corsa che l'ha sbloccata.

### 5.2 Avanzamento delle forme bloccate

- **Distanza**: km contati / soglia, per esempio «14.2 / 20 km — 71 %».
- **Velocità**: se hai già corso `D` di fila, tempo obiettivo / tuo
  miglior tempo, per esempio «Best 1 km 5:22 · target 5:00 — 93 %».
  Altrimenti la tua corsa più lunga / `D`.
- L'avanzamento si ferma al 99 % finché la forma non è sbloccata.

### 5.3 Catalogo

Il catalogo sta in `shaperoute_api/game_catalog.py`. Le forme si
cambiano con un deploy dell'API, senza toccare l'app. Ogni forma ha `id`,
nome, tipo (`distance` o `pace`), requisito, ordine e contorno in
coordinate **del disegno**, da 0 a 1 e mai geografiche:

- star, heart, circle, moon, sun, lightning, arrow e crown vengono da
  `route_engine/shapes/`;
- triangle, square, hexagon e diamond sono poligoni regolari.

| id | Requisito |
|---|---|
| `triangle` | 5 km in totale |
| `square` | 10 km |
| `hexagon` | 20 km |
| `circle` | 42 km |
| `star` | 100 km |
| `heart` | 250 km |
| `moon` | 500 km |
| `sun` | 1 000 km |
| `lightning` | 1 km sotto 5:00/km |
| `diamond` | 5 km sotto 5:30/km |
| `arrow` | 10 km sotto 6:00/km |
| `crown` | 21,1 km sotto 6:00/km |

Il catalogo è una proposta dell'agente: l'utente può cambiarlo quando
vuole, perché costa solo un deploy dell'API.

**Da TASK-423 (423 A)**: 94 forme in 10 collezioni, approvate dall'utente
il 2026-11-08. Le 12 sopra restano con id e requisito. Ogni requisito è una
forma: 24 gradini di km totali (1, 3, 5, 10, 15, 20, 30, 42, 50, 75, 100,
150, 200, 250, 300, 400, 500, 750, 1 000, 1 500, 2 000, 3 000, 5 000,
10 000 km), 6 traguardi di una corsa (5K, 10K, mezza, 30K, maratona, 50K) e
64 livelli di passo su 10 distanze:

| Distanza | Livelli (min/km) |
|---|---|
| 400 m | 6:00 · 5:00 · 4:30 · 4:00 · 3:30 · 3:00 |
| 1 km | 7:00 · 6:30 · 6:00 · 5:30 · 5:00 · 4:30 · 4:00 · 3:30 |
| miglio | 7:00 · 6:00 · 5:00 · 4:30 · 4:00 |
| 3 km | 7:00 · 6:00 · 5:30 · 5:00 · 4:30 · 4:00 |
| 5 km | 7:30 · 7:00 · 6:30 · 6:00 · 5:30 · 5:00 · 4:30 · 4:00 |
| 10 km | 7:30 · 7:00 · 6:30 · 6:00 · 5:30 · 5:00 · 4:30 · 4:00 |
| 15 km | 7:00 · 6:00 · 5:30 · 5:00 · 4:30 |
| mezza | 7:30 · 7:00 · 6:30 · 6:00 · 5:30 · 5:00 · 4:30 |
| 30 km | 7:00 · 6:00 · 5:30 · 5:00 |
| maratona | 7:30 · 7:00 · 6:30 · 6:00 · 5:30 · 5:00 · 4:30 |

Le collezioni: Geometrie (10), Animali (13), Mare (5), Cielo (9), Natura
(12), Città (13), Traguardi (7), Feste e stagioni (7), Leggende (11),
Antica Grecia (7). Ogni forma ha la sua `collection`; ogni collezione ha
id, nome nelle 5 lingue e ordine. Le forme, i nomi e i requisiti uno per
uno: `tasks/TASK-423-proposta.md` §2. Contorni: 18 letti dal motore, 8
calcolati, 56 disegnati come poligoni nel catalogo.

### 5.4 Premi (server in `main` con 423 E1; l'app è 423 E2)

Solo dentro l'app, mai denaro.

- **Edizioni**: per le 70 forme di passo e di traguardo, **bronzo** allo
  sblocco (la riga `solo` di oggi), **argento** quando il requisito è
  fatto in 3 corse diverse, **oro** in 10. Le forme dei km totali non ne
  hanno. L'edizione squadra (§6.4) resta a parte.
- **Cornici**: una per collezione completa, per la foto del profilo.
- **Titoli** (8): Corridore (100 km), Esploratore (1 000 km), Viaggiatore
  (3 000 km), Giramondo (10 000 km), Maratoneta, Ultramaratoneta (50 km),
  Costante (streak di 26 settimane), Collezionista (tutte le collezioni).
  Il titolo è un nome, senza numero.
- **Badge** (8): streak 4, 12 e 52 settimane; 10 e 50 sfide personali; 10
  edizioni oro; 1 e 10 sfide di squadra completate.
- **Medaglie**: ogni sfida personale finita dà la medaglia del gradino più
  alto preso (§6.6).
- **Sul profilo pubblico** niente del gioco finché non lo si sceglie: una
  cornice, un titolo e fino a 3 badge. Di default niente.
- **Come si contano** (E1): le edizioni argento e oro sono righe di
  `game_unlocks` scritte quando si salva la corsa che le dà, contando le
  corse contate che fanno il requisito; il backfill le dà alle corse
  vecchie senza push. Cornici, titoli e badge non si salvano: si leggono a
  ogni richiesta da quello che il gioco tiene già (km contati, tempi
  migliori, la streak più lunga con almeno 1 uscita a settimana, le
  medaglie, le edizioni oro, le sfide di squadra completate a cui si è
  contribuito). La scelta del profilo è in `game_prefs`; il profilo mostra
  solo i premi scelti che si hanno ancora.
- **Push** (E1): `edition_up` e `collection_done`, una per corsa ciascuna,
  a chi corre, come `shape_unlocked`. Niente push per le sfide personali.

## 6. Squadre e sfide

### 6.1 Squadre

- Una squadra ha un nome, da 1 a 40 caratteri, che passa dal filtro
  delle parole di TASK-213 (`check_comment`). Ha fino a **20 iscritti**.
  Un account sta in al massimo 10 squadre.
- Si entra con un **codice di 6 caratteri** (`A–Z` e `2–9`, senza `I`,
  `O`, `0` e `1`). La squadra è privata: non compare in nessuna ricerca.
  Un link che apre direttamente l'app è un seguito, se chiede una build
  nativa.
- Chi crea la squadra può togliere un iscritto, e ognuno può uscire. Se
  chi l'ha creata se ne va o cancella l'account, la squadra passa
  all'iscritto più vecchio. Una squadra senza iscritti si cancella.
- **Blocchi (TASK-121)**: chi ha bloccato un iscritto, o ne è stato
  bloccato, non può entrare nella squadra e riceve un «You can't join this
  team.» generico, senza sapere perché. Se un blocco nasce fra due che
  sono già nella stessa squadra, uno dei due esce: la regola è nel
  task file, parte C, ed è da confermare con l'utente.

### 6.2 Sfide

- Una sfida ha una forma del catalogo divisa in **N pezzi**, da 2 a 12
  (da 2 a 20 con 423 C), di lunghezza uguale sul contorno. Ogni pezzo chiede **X km**, da 1 a
  50, oppure è un **pezzo veloce**: 1 km o 5 km sotto un passo scelto.
- Ha una scadenza da 1 a 14 giorni (da 1 a 30 con 423 C), **7 di
  default**. Una squadra ha al
  massimo una sfida attiva alla volta, e qualunque iscritto può crearne una
  quando non ce n'è.
- Il contorno dei pezzi non si salva: si ricava sempre da forma e N con
  una funzione pura, che dà gli stessi pezzi sul telefono e sul server.

### 6.3 Pezzi

- Un iscritto tocca un pezzo libero e il pezzo diventa suo (`held_at`).
  Ognuno tiene un solo pezzo in corso alla volta.
- Riempiono il pezzo le sue corse che contano, iniziate dopo `held_at` e
  prima della scadenza.
- Finito un pezzo, i km che avanzano passano da soli al prossimo pezzo
  libero, che diventa suo. Se non ce ne sono, i km avanzati si perdono.
- Un pezzo lasciato a metà torna libero con i km già fatti, che restano
  contati per chi li ha corsi.
- Un pezzo veloce è fatto quando una corsa del suo titolare, nella
  finestra di tempo della sfida, ha il miglior tempo richiesto.

### 6.4 Fine

- **Completa** quando tutti i pezzi sono fatti.
- **Scaduta** se alla scadenza ne manca anche uno solo. Conta una corsa
  iniziata prima della scadenza e salvata entro 3 ore dopo, per le corse
  ancora in coda sul telefono. La sfida si chiude a scadenza + 3 h.
- Chi ha dato km o ha finito un pezzo veloce in una sfida completa
  riceve la forma in **edizione squadra** (`edition = 'team'`).

### 6.5 Com'è fatta (parte C)

Scelte dell'agente su delega dell'utente, registrate in ADR-0255:

- «Un solo pezzo in corso alla volta» vale **dentro una sfida**: chi sta
  in due squadre tiene un pezzo in ognuna, e una corsa che conta riempie
  tutti e due. Prendere un secondo pezzo della stessa sfida è rifiutato:
  prima si lascia il primo.
- Tutti i pezzi di una sfida chiedono la stessa cosa; i km in avanzo
  passano solo a pezzi di distanza liberi, in ordine di numero.
- Una corsa riempie il pezzo nella transazione del salvataggio, con i km
  già tolti di sovrapposizioni e tetto; le corse del backfill non toccano
  le sfide.
- La chiusura non scrive niente: la sfida è `active` finché non è completa
  e non sono passate 3 ore dalla scadenza, poi `expired`. Una nuova si
  può creare solo dopo.
- «1 day left» parte una volta per sfida, dal timer dell'API (ogni 15
  minuti), solo per le sfide più lunghe di un giorno.
- Il contorno dei pezzi: `pieces_of(outline, n)` misura il contorno chiuso
  segmento per segmento (`sqrt(dx²+dy²)`), lo taglia a `k·L/n`, interpola
  gli estremi sul segmento in cui cadono e arrotonda a 4 decimali;
  l'ultimo pezzo finisce esattamente in `L`. L'API lo serve in ogni pezzo
  (`outline`), e il telefono può rifarlo uguale.
- La squadra mostra la sfida più recente in qualunque stato; i contributi
  sono sommati per persona e pezzo, senza orari.
- Con l'account spariscono iscrizioni e contributi; i metri restano nei
  pezzi, che tornano liberi; la squadra passa all'iscritto più vecchio.

### 6.6 Sfide personali (423 C)

- Da soli, **senza iscriversi**, uguali per tutti nella stessa settimana:
  **3 settimanali** (da lunedì a domenica) e **2 mensili**. Ognuna ha tre
  gradini, **bronzo, argento, oro**, su una barra sola.
- **Uscita**: una corsa, camminata, escursione o roller che conta per il
  gioco (§3) con almeno 1 km contato. I km sono quelli contati, dopo
  sovrapposizioni e tetto. Le sfide di passo valgono solo per le corse.
- **Rotazione**: tre posti settimanali, ognuno con la sua lista, una voce a
  settimana dal numero della settimana (si ripete ogni 15 settimane):
  - Volume: km della settimana (10 · 20 · 40 km), giorni attivi (2 · 4 ·
    6), uscite di almeno 3 km (2 · 3 · 5);
  - Abitudine: uscite iniziate prima delle 8:00 (1 · 2 · 3), km di sabato
    e domenica (5 · 10 · 20), uscite iniziate dopo le 19:00 (1 · 2 · 3);
  - Corsa: 5 km di fila sotto 7:00 · 6:00 · 5:00 /km, un'uscita di 8 · 12 ·
    18 km, 1 km sotto 6:00 · 5:00 · 4:15 /km, 10 km di fila sotto 7:30 ·
    6:30 · 5:30 /km, corse di almeno 5 km (2 · 3 · 4).
  - Mensili, mesi dispari: km del mese (50 · 100 · 200) e uscite di almeno
    10 km (1 · 3 · 6); mesi pari: giorni attivi (8 · 12 · 16) e uscite
    prima delle 8:00 (3 · 6 · 10).
- **L'ora locale** viene da `utc_offset_min`, che l'app manda con la corsa;
  senza (corse vecchie, app vecchie) vale UTC. Una corsa conta nel periodo
  in cui è iniziata, anche se arriva più tardi dalla coda.
- Un gradino preso si scrive nella transazione del salvataggio
  (`game_personal`) e resta. Il backfill non scrive sfide: le medaglie
  partono dalla settimana del rilascio.
- Niente push per le sfide personali.

### 6.7 Streak (423 C)

Tre righe: le settimane di fila con almeno **1**, **2** e **3** uscite. La
streak conta le settimane finite di fila fino all'ultima, più quella in
corso se ha già raggiunto la soglia; una settimana in corso non la rompe
finché non finisce. Si calcola da tutta la storia del gioco, con la
settimana locale, e si tiene anche la più lunga di sempre. Nessuna soglia
da scegliere, niente promemoria.

### 6.8 La lista «Challenges»

Una lista sola in tre gruppi:

- **In corso**: le sfide personali con i loro gradini e il tempo che
  resta, la streak, la sfida attiva di ogni squadra, la sfida del mese
  (TASK-343) se ci si è iscritti.
- **Disponibili**: le squadre senza sfida («New challenge»), «Create team»
  e «Join team», la sfida del mese se non ci si è iscritti.
- **Finite**: le personali delle ultime 8 settimane con la medaglia, le
  sfide di squadra completate o scadute, l'archivio delle sfide del mese.

Le sfide del mese restano di TASK-343 (`CONCORSI.md`): qui c'è solo il
link alla loro pagina, per chi ha l'account. Su un server senza le sfide
personali (404) la lista non ha le loro carte e non dice nessun errore.
L'app manda `utc_offset_min` con il salvataggio della corsa (l'ora del
telefono al primo punto; non per le corse importate da un file); un server
che non lo conosce la riceve di nuovo senza.

## 7. Dati

Una migrazione nuova per la parte A e una per la parte C. Il numero è
il primo libero in `main` quando la PR entra. La tabella `runs` non
cambia. Ogni riga che appartiene a un account si cancella con l'account
(`ON DELETE CASCADE`). Le righe della squadra (sfide e pezzi) restano agli
altri iscritti, con il titolare del pezzo a `NULL`.

| Tabella | Parte | Che cosa |
|---|---|---|
| `game_runs` | A | per ogni corsa: `rules_version`, `counted`, `reason`, `counted_m`, `best_s` (jsonb, secondi su 1000/5000/10000/21097), `started_at`, `ended_at` |
| `game_unlocks` | A | `(user_id, shape_id, edition)`, `unlocked_at`, `run_id` (`SET NULL`); la parte C aggiunge `challenge_id` (`SET NULL`) |
| `game_teams` | C | `id` uuid, `name`, `invite_code` unico, `owner_id` (`SET NULL`), `created_at` |
| `game_team_members` | C | `(team_id, user_id)`, `joined_at` |
| `game_challenges` | C | `id`, `team_id`, `shape_id`, `created_by` (`SET NULL`), `starts_at`, `ends_at`, `completed_at`, `ending_told_at` (la push «1 day left», una volta) |
| `game_pieces` | C | `(challenge_id, idx)`, `required_m` oppure `fast_distance_m` + `max_pace_s`, `holder_id` (`SET NULL`), `held_at`, `done_m`, `done_at` |
| `game_contributions` | C | `challenge_id`, `piece_idx`, `user_id` (`CASCADE`), `run_id` (`SET NULL`), `metres`, `at` |
| `game_runs.utc_offset_min` | 423 C | i minuti dell'orologio del telefono da UTC all'inizio della corsa; `NULL` = UTC |
| `game_personal` | 423 C | `(user_id, period_start, challenge_id)`, `tier` (1–3), `done_at`, `run_id` (`SET NULL`) |
| `game_unlocks.edition` | 423 E | anche `silver` e `gold` |
| `game_prefs` | 423 E | `user_id`, `title_id`, `frame_id`, `shown_badges` (fino a 3): che cosa mostra il profilo |

Dalle regole 3 (423 B) `best_s` ha le 11 distanze del §5.1.

Le corse di prima del gioco si calcolano con
`python -m shaperoute_api.game_backfill`: è idempotente, salta le righe
già alla `RULES_VERSION` corrente e le corse con `source` diverso da `muw`
(TASK-312), e non manda push. Si lancia una volta
dopo il deploy della parte A e di nuovo a ogni cambio di regole.

## 8. API

| Metodo | Percorso | Account | Parte |
|---|---|---|---|
| — | `PUT /me/activities/{key}` (c'è già) | sì | A: nella transazione del salvataggio, `game.after_run_saved`, solo per `source` `muw` (TASK-312); la risposta non cambia |
| GET | `/game/runs/{key}` | sì | A: che cosa ha valso la corsa: `counted`, `reason`, `counted_m`, `best_s`, `unlocked[]` (C aggiunge i pezzi) |
| GET | `/game/catalog` | no | A: il catalogo con i contorni. Se risponde 404, l'app nasconde «Play» (ADR-0255) |
| GET | `/game/me` | sì | A: km contati, migliori tempi, sblocchi, avanzamento |
| POST | `/game/teams` | sì | C |
| POST | `/game/teams/join` | sì | C: `{code}` |
| GET | `/game/teams` | sì | C: le mie squadre con la sfida attiva |
| DELETE | `/game/teams/{id}/members/{public_id}` | sì | C: esci, o togli un iscritto |
| POST | `/game/teams/{id}/challenges` | sì | C |
| GET | `/game/challenges/{id}` | sì | C: pezzi, titolari, km, contributi, tempo che resta |
| POST / DELETE | `/game/challenges/{id}/pieces/{idx}/hold` | sì | C: prendi o lascia un pezzo |
| — | `GET /game/catalog`, `GET /game/me` | | 423 A: `collections[]`, per forma `collection` e `goal.single_run`; in `me` l'avanzamento per collezione. Campi solo aggiunti |
| — | `PUT /me/activities/{key}` | sì | 423 C: `utc_offset_min` facoltativo; la risposta non cambia |
| GET | `/game/personal` | sì | 423 C: le sfide della settimana e del mese con i gradini, la streak, le finite delle ultime 8 settimane |
| GET / PUT | `/game/prizes` | sì | 423 E: edizioni, cornici, titoli, badge presi e da prendere; che cosa mostra il profilo |

Le push sono `Kind` nuovi in `push.py`: `shape_unlocked` (parte A),
`piece_done`, `challenge_done` e `challenge_ending` (parte C). Valgono gli
interruttori di TASK-262 A (`notify_push`) e i blocchi, come per le altre
push. La push di una forma sbloccata parte sempre, ma con l'app aperta
il telefono non la mostra, perché c'è già la scheda dopo «Save». Serve
per le corse mandate più tardi dalla coda del telefono. Con 423 E, allo
stesso modo, `edition_up` (un'edizione nuova) e `collection_done` (una
collezione completa, con la sua cornice). I testi delle push li approva l'utente
nelle cinque lingue.

Dalla parte C `GET /game/runs/{key}` ha anche `pieces_done` (i pezzi che
la corsa ha finito, con squadra e forma) e `GET /game/me` ha per ogni
forma `team_unlocked_at`. Le push delle sfide portano `{kind,
challenge_id}` e cominciano con il nome della forma nella lingua del
telefono; `challenge_ending` la trova un timer dell'API ogni 15 minuti,
una volta per sfida.

## 9. App

- **«Play»**, aperta a tutto schermo dalla riga «PLAY» di «Draw», subito
  sotto la distanza, con «←» che torna lì (TASK-327; fino ad allora la
  quarta pagina da scorrere, fra Explore e il profilo, con il suo nome in
  alto, parte B; `UI.md`, «“Play”: la collezione delle forme»). Dalla
  parte D ha due schede (`Segmented`):
  - **Collection**: una griglia di forme. Le sbloccate sono in giallo, con
    il giorno. Le bloccate sono in grigio, con il requisito, la barra di
    avanzamento e quanto manca, nelle unità scelte. Senza account le forme
    sono grigie con il requisito, e sopra «Sign in to collect shapes.»
    porta al profilo.
  - **Challenges** (parte D): le mie squadre, «Create» con il nome e «Join»
    con il codice; la squadra aperta con il codice, «Share code» (il foglio
    di condivisione con una frase), gli iscritti, «Leave team» e, per chi
    l'ha creata, «Remove»; la sfida: la forma con i pezzi colorati per
    persona per quanto è corsa, chi ha dato quanto, i pezzi liberi, presi
    e fatti con «Take this piece» e «Leave», quanto manca e il conto alla
    rovescia; «New challenge» (forma, pezzi, km o pezzo veloce, giorni)
    quando non ce n'è una in corso. La sfida si rilegge ogni 15 s mentre è
    sullo schermo e in corso, e quando l'app torna in primo piano. Su un
    server senza la parte C la scheda dice solo che le squadre non ci sono
    ancora. Senza account, «Sign in to play with a team.».
- **La riga si vede solo se il server ha il gioco**: all'avvio l'app
  chiede `GET /game/catalog` e tiene la risposta sul telefono
  (`game-catalog.json`). Con 200 la riga compare, anche subito, mentre
  l'app è aperta; con 404 sparisce. Senza rete vale l'ultima risposta
  salvata, e un telefono che non ha mai sentito il server non la mostra.
- **Dopo che l'API ha preso la corsa** (`activitiesDoor.send`, subito dopo
  «Save» o più tardi dalla coda), l'app chiede `GET /game/runs/{key}`; se
  la corsa ha sbloccato forme, sopra l'app compare la scheda «New shape
  unlocked» con il contorno che si disegna in giallo. Per una corsa appena
  salvata la scheda aspetta che il logo di TASK-212 sia sparito; per una
  mandata più tardi compare subito. Più forme, una scheda dopo l'altra;
  «See collection» apre «Play».
- **La push `shape_unlocked`** non si mostra con l'app in primo piano; dal
  centro notifiche apre «Play». **Le push delle sfide** (`piece_done`,
  `challenge_done`, `challenge_ending`) si mostrano anche con l'app
  aperta, e toccate aprono la sfida che nominano, nella scheda
  «Challenges».
- **Durante la corsa** (parte E; `UI.md`, «La navigazione», «La riga del
  gioco») c'è una riga sottile sotto i numeri della scheda, su «Map» e su
  «Data», per la corsa a piedi con l'account: la prossima forma per
  distanza con i km contati dal server più quelli della corsa, «Hexagon
  14.2 / 20 km», che cresce mentre si corre e, passata la soglia, passa
  alla forma dopo senza dire «unlocked»; oppure, con un pezzo veloce in
  mano in una sfida in corso, il passo dell'ultimo km contro l'obiettivo,
  «Last km 5:12 · target 5:00 /km». È una stima del telefono: il conto
  vero lo fa il server dopo «Save». Il server si chiede una volta sola,
  all'inizio della corsa (`GET /game/me` e `GET /game/teams`), mai
  durante; senza rete, senza account, senza il gioco, in bici e in canoa
  la riga non c'è e non compare nessun errore.
- **Da TASK-423 parte D**: «Collection» è la lista delle 10 collezioni,
  ognuna con il contorno della prima forma non presa, «7 / 13» e la barra;
  toccata, apre la sua pagina con la griglia delle sue forme. Con un
  catalogo senza collezioni resta la griglia unica. I traguardi dicono
  «One run of 5 km». «Challenges» è la lista del §6.8. «New challenge»
  sceglie la forma per collezione, fino a 20 pezzi e 30 giorni.
- **(423 E)**: in cima a «Collection», «Prizes» apre la pagina dei premi,
  dove si sceglie che cosa mostra il profilo; la cornice in fondo alla
  pagina di una collezione. Le carte delle forme di passo e di traguardo
  hanno il segno dell'edizione. La scheda di sblocco dice la collezione
  («Animals · 8 / 13»), le edizioni nuove e la collezione completa; oltre 3
  cose in una corsa, una scheda sola di riepilogo. Il profilo mostra
  cornice, titolo e badge scelti.
- I colori vengono da `src/theme/tokens.ts`. I testi sono in inglese e
  tradotti nelle cinque lingue.
