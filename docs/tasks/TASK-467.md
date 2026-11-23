# TASK-467 — Il punteggio del sonno MuW, da pubblicare

**Stato**: In lavorazione · parte 0 in `main` (#1182) · **A in `main`** (#1193, `665e408c`: il calcolo sul telefono, ADR-0379) · **B1 in `main`** (#1211, `71e24188`: server e contratto, ADR-0380; sul server dal 2026-11-12 (passo 10)) · **B1b in `main`** (#1227, `3c513355`: il campo `sleep` nel disegno visto; sul server col passo dopo quello dell'aggiornamento completo) · **B2 in `main`** (#1236, `627767a5`: app, il sonno nel post, spenta da `SLEEP_POSTS_ON`) · **B2b in `main`** (#1244, `bb3d3457`: palestra e vasca, spenta) · **B3 in `main`** (#1292, `b6e36fcb`: app, la scheda «Sleep» del profilo, spenta) · **C avviata** (bozza #1334, da non unire: il lettore vero e il sonno acceso; build di prova per il solo iPhone dell'utente dal 2026-11-21) · **E1 in `main`** (#1373, `f38b1980`: il post del sonno da solo, server e contratto, migrazione `0082`; sul server col passo 17, col sì dell'utente) · **E2 in `main`** (app, spenta: #1419, `d0b89470`: il post del sonno nel Feed, nella sua pagina e nella griglia di un profilo; #1441, `57e4d4b4`: la voce «Sleep» del «+») · **C0** (il sonno acceso solo sul canale di prova `preview`, con `isPreview()`; spento negli store), poi privacy, App Privacy e la build nativa (C), D (Android)
**Fase**: 4 · **Branch**: `docs/TASK-467-sleep-score` (documenti),
`feat/TASK-467-a-sleep-score` (A), `feat/TASK-467-b1-sleep-server` (B1),
`feat/TASK-467-b1b-sleep-in-feed` (B1b), `feat/TASK-467-b2-sleep-post` (B2),
`feat/TASK-467-b2b-sleep-gym-pool` (B2b), `feat/TASK-467-b3-sleep-profile` (B3)
**Dipende da**: TASK-321 (Apple Salute nell'app, la stessa libreria),
TASK-345 C / TASK-409 B (la lettura del battito: il modello del «leggere
da Salute dopo un tocco»)
**Si incrocia con**: TASK-312 D (studio «leggere da Salute»), TASK-454
(reazioni nel Feed: `src/feed/**`), TASK-321 C (Health Connect), TASK-322
(«Accedi con Apple»: la stessa build nativa, dopo la 1.1.0)
**ADR**: ADR-0379 (la formula e le soglie), ADR-0380 (dove sta il sonno sul
server e il contratto: con B1), ADR-0380 precisazione B1b/B2 (il campo
`sleep` nel disegno visto, e come l'app resta spenta), ADR-0380
precisazione B2b (palestra e vasca)

## Obiettivo

Chi tiene traccia del sonno con Apple Salute vede in MuW un punteggio del
sonno della notte, da 0 a 100, e può pubblicarlo come post.

## Contesto

La domanda dell'utente, l'11 novembre 2026: «fai che si può pubblicare su
MuW il punteggio del sonno di Apple Salute».

- **Il punteggio di Apple non si può leggere.** Esiste da iOS 26 nell'app
  Salute, ma HealthKit non ha un tipo per lui. Lo dice un ingegnere Apple
  sul forum sviluppatori (settembre 2025,
  `developer.apple.com/forums/thread/800403`); fonti di seconda mano
  dicono che l'SDK di iOS 27.1 non lo ha ancora. **Da verificare sugli
  header dell'SDK** prima del codice: se nel frattempo c'è, si legge quello.
- **Si possono leggere i dati da cui nasce**: `HKCategoryTypeIdentifierSleepAnalysis`
  (a letto, sveglio, leggero, profondo, REM, con gli orari).
- **La formula di Apple è pubblica**: durata 50 punti, regolarità
  dell'orario 30, interruzioni 20. Le soglie esatte no: il numero di MuW
  può differire di qualche punto da quello di Salute.
- **Scelta dell'utente (2026-11-11)**: «Sì, punteggio MuW» — MuW calcola
  un punteggio suo dai dati di Salute; l'alternativa scartata era
  pubblicare solo ore e fasi.
- **Oggi nell'app**: `src/health/` scrive gli allenamenti (TASK-321) e
  legge il battito dopo un tocco (`heartSamples.ts`). Del sonno non legge
  nulla. Il testo `NSHealthShareUsageDescription` in `app.json` nomina
  solo il battito.

## Vincoli già noti

- **Build nativa** (Coordinatore, 2026-11-11): il testo del permesso
  deve nominare il sonno → cambia `app.json` → cambia l'impronta iOS.
  La parte nativa non entra in `main` finché la 1.1.0 non è uscita, e
  arriva con una build successiva, insieme ad «Accedi con Apple»
  (TASK-322). Il codice senza nativo può entrare prima, nascosto, senza
  muovere le impronte.
- **Apple 5.1.3**: dati di Salute mai per pubblicità, marketing o data
  mining; pubblicarli richiede il consenso esplicito di chi li pubblica.
  2.5.1: la funzione va detta nella descrizione dell'app.
- **Privacy**: oggi la policy dice che MuW legge da Salute solo il
  battito. Serve una frase nuova (col sì dell'utente) e «Health» su App
  Privacy copre un dato in più che lascia il telefono.
- **Non si chiama «di Apple»**: nell'interfaccia è il punteggio di MuW,
  «from Apple Health data».
- **Il calcolo sta sul telefono**: una funzione pura con test
  deterministici; al server arriva solo quello che l'utente pubblica, in
  forma di riassunto (punteggio, ore, minuti per fase, data), mai i
  campioni grezzi di Salute (Coordinatore, 2026-11-11).
- **Senza pretese mediche** (Coordinatore, 2026-11-11): è un numero di
  MuW, non una misura clinica; nessun consiglio di salute.
- **«Parte acceso» e il gesto esplicito**: nel post dell'attività il
  sonno compare già acceso (risposta 6b). Il gesto esplicito è «Publish»
  con l'interruttore «Sleep last night» in vista prima di pubblicare,
  come per il battito. Se la revisione di Apple lo contesta, la riserva è
  «parte spento» e torna all'utente.

## Parte 0 — Le scelte dell'utente (2026-11-11)

La prima, prima di tutto: «Sì, punteggio MuW» (Contesto). Poi, una per
volta, ognuna con la proposta dell'agente:

1. **Dove nasce il post.** ~~Proposta: una scheda «Sleep» nel profilo.~~
   **Risposta dell'utente (2026-11-11): «In entrambe»** — una scheda
   «Sleep» nel profilo («Il mio corpo») con il punteggio dell'ultima
   notte e «Share», **e** il punteggio della notte dentro il post
   dell'attività del giorno, come oggi il battito (si può nascondere
   prima di pubblicare). Nessun post automatico.
2. **Che cosa mostra il post.** ~~Proposta: punteggio, ore e una parola.~~
   **Risposta dell'utente (2026-11-11): «Anche le fasi»** — punteggio,
   ore dormite, una parola («Good»…) e le fasi del sonno (leggero,
   profondo, REM, sveglio). Gli orari di quando si va a letto e ci si
   sveglia restano fuori (non chiesti; la proposta li escludeva).
3. **Chi lo vede.** **Risposta dell'utente (2026-11-11): «Sì, come gli
   altri post»** — la stessa visibilità degli altri post di chi
   pubblica, senza regole a parte; dentro il post dell'attività il
   punteggio segue quel post.
4. **Che cosa resta sul server.** **Risposta dell'utente (2026-11-11):
   «Sì, solo i pubblicati»** — al server arriva solo quello che si
   pubblica (punteggio, ore, fasi, data); lo storico delle notti resta
   sul telefono, letto ogni volta da Salute.
5. **Le fasce e i nomi.** **Risposta dell'utente (2026-11-11): «Sì,
   cinque fasce»** — 0–39 «Poor», 40–59 «Fair», 60–74 «Good», 75–89
   «Very good», 90–100 «Excellent». Nomi di MuW, non di Apple; le
   traduzioni nelle altre quattro lingue con gli altri testi (domanda 7).
6. **Android.** **Risposta dell'utente (2026-11-11): «Sì, prima
   iPhone»** — prima l'iPhone; Health Connect in una parte successiva,
   con la build Android di TASK-321 C. Lo studio di Health Connect per
   il sonno si fa all'inizio di quella parte.
6b. **Nel post dell'attività, acceso o spento in partenza.**
   **Risposta dell'utente (2026-11-11): «Parte acceso»** — dato il
   permesso a Salute, il sonno compare in ogni post dell'attività, come
   il battito; lo si spegne prima di pubblicare (la proposta era
   «spento»).
7. **I testi.** **Risposta dell'utente (2026-11-11): «Approvo così»**
   a questa tabella, in inglese; le altre quattro lingue le prepara
   l'agente. «Light» per il sonno leggero (Salute dice «Core»). La
   frase della privacy è approvata nel contenuto: se per incastrarla
   con quella sul battito cambia, torna all'utente.

8. **Come si smette di condividere (B3).** **Risposta dell'utente
   (2026-11-12): «Pulsante + riga»** — dopo «Share» la scheda dice «On
   your profile» e il pulsante diventa «Stop sharing»: un tocco toglie il
   sonno dal profilo, senza conferma. Prima di «Share» la scheda dice
   «Only you see this» (il testo del VO₂ max). Testo nuovo: «On your
   profile». Scartati: il solo pulsante; un interruttore in «Settings».
9. **Una notte condivisa non recente (B3).** **Risposta dell'utente
   (2026-11-12): «Col giorno»** — sul profilo, accanto a «Sleep score», il
   giorno della notte («12 Nov», il formato del VO₂ max, mai un orario).
   Resta finché se ne condivide un'altra o si tocca «Stop sharing». Sulla
   propria scheda, se sul profilo c'è ancora una notte più vecchia: la
   notte di oggi con «Share» e sotto «On your profile · 11 Nov» con «Stop
   sharing». Scartati: far sparire da sola la notte dopo un giorno; nessun
   giorno.

10. **Il post del sonno da solo nel Feed.** L'utente, il 2026-11-21, dopo
   aver provato la build sul telefono: «fai il post del sonno da solo nel
   Feed e nella sezione feed il tasto + per poter aggiungere l'attività
   sonno…». **Da dove nasce: «Dal "+", a parte»** — nel Feed, «+» ›
   «Sleep» mostra la notte scorsa e «Publish» la mette nel Feed come post,
   visto come gli altri post. «Share» sulla scheda del profilo resta
   com'è, solo profilo. Scartati: «Share» fa tutte e due; solo nel Feed.
11. **Con quale scelta parte il selettore.** **«Everyone»**, in vista
   prima di «Publish», come le cose aggiunte dal «+» (ADR-0387). Scartati:
   «Followers»; l'ultima scelta fatta.
12. **I testi del post del sonno.** **«Approvo così»** (2026-11-21) alla
   riga «Post del sonno» della tabella; le altre quattro lingue le prepara
   l'agente.

| Dove | Testo |
|---|---|
| Permesso di iOS (`NSHealthShareUsageDescription`, al posto di quello di oggi) | «MuW reads your heart rate during each activity and your sleep from Apple Health, to show them with your activities and in your posts. You can hide them before you publish.» |
| Profilo, scheda «Sleep», prima del sì | pulsante «Show my sleep from Apple Health» · sotto: «MuW works out a sleep score from your Apple Health sleep data.» |
| Scheda «Sleep», con i dati | «Sleep score» · «82 · Very good» · «7 h 40 min» · fasi «Awake», «REM», «Light», «Deep» · pulsante «Share» |
| Sotto il punteggio | «Worked out by MuW from Apple Health data. It can differ from the score in the Health app.» |
| Primo «Share» | «Share your sleep? Your score, hours slept and sleep stages show on your profile, to everyone who can see it.» · «Share» / «Cancel» (riscritto e riapprovato il 2026-11-12, dopo «Sì, profilo adesso»; prima finiva «…become a post, seen like your other posts.») |
| Post dell'attività, prima di pubblicare | interruttore «Sleep last night» · «82 · Very good · 7 h 40 min» · «Shown in this post. Turn it off to keep it to yourself.» |
| Scheda «Sleep», chi la vede (risposte 8 e 9, 2026-11-12) | prima di «Share»: «Only you see this» · dopo: «On your profile» e pulsante «Stop sharing» · una notte più vecchia ancora sul profilo: «On your profile · 11 Nov» · accanto a «Sleep score» il giorno della notte: «12 Nov» |
| Post del sonno nel Feed (risposte 10–12, 2026-11-21) | foglio del «+»: voce «Sleep», sotto «Last night's sleep score, from Apple Health» · pagina: titolo «Sleep», la scheda col punteggio come sul profilo, selettore «Everyone / Followers», pulsante «Publish», sotto «Your score, hours slept and sleep stages go in the Feed.» · notte già pubblicata: «Already in the Feed» e «Remove post» · scheda nel Feed: «Sleep score», «82 · Very good», «7 h 40 min», le fasi |
| Nessun dato | «No sleep data for last night in Apple Health.» |
| Permesso negato o tolto | «MuW can't read your sleep. Allow it in the Health app: your profile › Apps › MuW.» |
| Privacy | «Once you allow it, MuW reads your sleep from Apple Health (time asleep and sleep stages) on your phone and works out a sleep score there. Nothing reaches our server until you publish it: then the score, the hours slept, the stages and the date are kept with your post, seen by whoever can see your posts, until you delete the post or your account. We never use health data for advertising.» |
| Descrizione App Store (a mano) | «Shows a sleep score from your Apple Health sleep data.» |

## Parti

- **A — Il punteggio sul telefono**: lettura del sonno e calcolo, file
  nuovi in `src/health/`, nascosti senza il modulo nativo.
- **B — Il post**: API (un tipo di post nuovo) e app (scheda e «Share»).
- **C — La build nativa**: `app.json`, testi, privacy, App Privacy; con
  la build dopo la 1.1.0, ogni passo col sì.
- **D — Android** (Health Connect), dopo l'iPhone, con la build di
  TASK-321 C.

La lista precisa dei file di ogni parte va al Coordinatore prima del
codice.

### Parte A — com'è fatta (2026-11-12, branch `feat/TASK-467-a-sleep-score`)

Solo funzioni pure, file nuovi, non importati da nessuna schermata: niente
nativo, niente dipendenze, niente server, impronte ferme (condizione del
Coordinatore: prima dell'uscita della 1.1.0 non si tocca il nativo).

- **Controllo sull'SDK** (iPhoneOS 27.0, header di HealthKit sul Mac):
  nessun tipo per il punteggio del sonno di Apple, solo
  `HKCategoryTypeIdentifierSleepAnalysis`. Il calcolo di MuW serve.
- **`src/health/sleepNight.ts`** — dai campioni di sonno alla notte:
  - le fasi di MuW: `awake`, `rem`, `light` (il «Core» di Salute), `deep`,
    `asleep` (sonno senza fase, il telefono senza orologio); «a letto»
    non conta;
  - sorgenti sovrapposte unite senza contare due volte: dove due
    campioni si sovrappongono vince chi dice di più (fase detta › sveglio ›
    sonno senza fase; fra le fasi la più profonda);
  - un silenzio di più di 60 minuti separa i tratti di sonno; la notte è
    il tratto con più sonno (un pisolino non è la notte), da quando ci si
    addormenta all'ultimo risveglio; il tempo senza campioni dentro la
    notte conta come sveglio; sotto i 60 minuti di sonno non c'è notte.
- **`src/health/sleepScore.ts`** — il punteggio 0–100 (ADR-0379, deciso
  dall'agente su delega dell'utente):
  - **durata, 50 punti**: zero fino a 4 ore di sonno, tutti da 8, in
    linea retta in mezzo;
  - **regolarità, 30 punti**: l'ora in cui ci si addormenta contro quella
    solita (la mediana delle notti prima, come ora del giorno): tutti
    entro 15 minuti, zero da 2 ore;
  - **interruzioni, 20 punti**: i minuti svegli durante la notte: tutti
    fino a 5, zero da 60;
  - con meno di 3 notti prima l'ora solita non si sa: il punteggio sono
    le altre due parti portate a 100 (`withBedtime: false`);
  - le cinque fasce dell'utente (`sleepBand`).
- **Limiti noti**: un giorno vale 24 ore, quindi le notti prima di un
  cambio d'ora leggono un'ora di scarto; le soglie sono di MuW, il numero
  può differire da quello dell'app Salute.
- **Per dopo**: la lettura da Salute (chiede il permesso: con la build
  nativa), quale finestra di campioni è «la notte scorsa» (serve l'ora
  locale: sta nel lettore), e nella parte B il valore di partenza
  dell'interruttore nel post dell'attività in **una sola costante**
  (richiesta del Coordinatore). La scelta «acceso/spento» è stata
  riproposta all'utente il 2026-11-12, con «spento» come proposta e i
  due rischi detti (il consenso esplicito di Apple 5.1.3; la frase della
  privacy «private unless you choose otherwise»): **«Resta acceso»**.

**File toccati (parte A)**: `apps/mobile/src/health/sleepNight.ts`,
`sleepNight.test.ts`, `sleepScore.ts`, `sleepScore.test.ts` (nuovi),
`docs/tasks/TASK-467.md`.

### Parte B — studio (2026-11-12, nessun codice)

Che cosa c'è oggi, guardato su `main` del 2026-11-12:

- **Il battito nel post esiste solo per il nuoto in vasca** (TASK-409 B):
  colonne su `runs` (`0061_run_heart.sql`: `heart_avg_bpm`,
  `heart_max_bpm`, `heart_shown boolean DEFAULT true`), corpo in
  `pool_swims.py`, interruttore «Show heart rate» in
  `pool/PoolPostForm.tsx` (acceso in partenza, `newPoolPost`), nascosto
  agli altri dal server (`seen_stats` in `run_stats.py`, `CASE WHEN
  r.heart_shown OR r.user_id = viewer`). Per le altre attività non c'è
  ancora un interruttore «nascondi prima di pubblicare»
  (`feed/PostSettings.tsx` lo rimanda a TASK-345 B).
- **Un post senza attività non esiste.** I post di sole foto (TASK-312 C)
  sono solo un piano: niente `drawings.user_id`, `run_id` obbligatorio,
  ogni ricerca dell'autore passa da `JOIN runs`. L'unico modello vivo di
  post senza traccia è la corsa «senza traccia» (palestra, vasca), che ha
  comunque una riga in `runs`.
- **Il profilo**: le schede stanno in `profile/ProfileHome.tsx` (accanto a
  `OwnVo2Max`, TASK-397); «Il mio corpo» è nelle impostazioni
  (`settings/BodyPage.tsx`), non nel profilo.
- **Migrazioni**: l'ultima in `main` è la `0070`; la `0071` è prenotata da
  TASK-414. Il numero lo dà il Coordinatore.

**Il taglio** (approvato dal Coordinatore il 2026-11-12, che ha dato il
modo; migrazione provvisoria `0072`, **ADR-0380** per dove sta il sonno
sul server e il contratto):

- **La notte non entra in `runs`** come attività «senza traccia»
  (finirebbe in calendario, conteggi, Strava, record, classifiche), e non
  si aspettano i post senza attività di TASK-312 C. Una tabella a parte,
  **`sleep_nights`**: una riga per notte pubblicata (utente, data della
  notte, punteggio, minuti dormiti e svegli, minuti per fase, `shared`).
  L'attività porta solo il riferimento alla notte e il suo `sleep_shown`.
- **Scelta dell'utente (2026-11-12): «Sì, profilo adesso»** — la notte
  condivisa da sola compare nella scheda «Sleep» del profilo, visibile a
  chi apre il profilo; nessun post nel Feed adesso. Il post della sola
  notte nel Feed arriva più avanti, coi post senza attività (TASK-312 C).
  Il testo del primo «Share» approvato l'11 novembre («…become a post,
  seen like your other posts») va riscritto e riapprovato.
- **B1 — Server e contratto.** NUOVI:
  `services/api/migrations/0072_sleep_nights.sql` (la tabella, più
  `runs.sleep_night_id` e `runs.sleep_shown boolean DEFAULT true`, coi
  CHECK), `shaperoute_api/sleep.py` (salvare la notte e il suo `shared`;
  attaccarla a un'attività con `sleep_shown`; leggerla per il post, nascosta
  agli altri se spenta; leggere l'ultima notte condivisa di un profilo),
  `tests/test_sleep.py`, `packages/shared-types/src/sleep.ts` con fixture e
  test. MODIFICO: `shared-types/src/index.ts` (una riga di export),
  `docs/API.md`, `docs/DATABASE.md`, e per ultima la riga del router in
  `app.py` (oggi di TASK-441 B2: quando il Coordinatore dice che è
  libero). Da controllare scrivendo: se l'esportazione o la cancellazione
  dei dati dell'account elencano le tabelle a mano. B1 può stare in
  `main` e sul server senza che nessuna app lo usi; sul server va col sì
  dell'utente.
- **B2 — App, il sonno nel post dell'attività**, nascosta finché non c'è
  la build nativa: lettore di Salute (`health/sleepSamples.ts`),
  `api/sleep.ts`, l'interruttore «Sleep last night» a fine attività (il
  valore di partenza in una sola costante: acceso, confermato
  dall'utente), la riga nel Feed e nella pagina del post, i testi nelle
  quattro lingue. `src/feed/**` dopo TASK-454 (#1195) e TASK-444.
- **B3 — App, la scheda «Sleep» nel profilo** (`profile/ProfileHome.tsx`,
  accanto a `OwnVo2Max`; sul profilo degli altri
  `profile/UserProfilePage.tsx`): legge `sleep_nights`, «Share» la rende
  visibile a chi apre il profilo.
- **C — Prima dell'OTA di B2** (ognuno col sì dell'utente): la frase
  della privacy (`about/content` e `site/privacy`, a turno dopo la #1200
  di TASK-454), la scheda «App Privacy» su App Store Connect (dati sulla
  salute raccolti e collegati all'utente), le note di revisione; poi la
  build nativa col testo del permesso, dopo l'uscita della 1.1.0.

**Condizioni del Coordinatore per B1 (2026-11-12, lista dei file approvata)**:

- `shared` DEFAULT **false** sulla notte: è la condivisione nel profilo,
  spenta finché l'utente non la accende. `sleep_shown` DEFAULT **true**
  sull'attività: è la scelta dell'utente («Resta acceso», 2026-11-12).
- **Criterio di accettazione**: esportazione e cancellazione dei dati
  dell'account coprono `sleep_nights` (la cancellazione la dà
  `ON DELETE CASCADE`; l'esportazione va controllata; se serve toccare
  quel file, prima lo si scrive al Coordinatore).
- **Test**: chi non è l'autore non legge mai una notte con `shared` false
  né il sonno di un post con `sleep_shown` false, nemmeno dai conteggi o
  dagli esempi di openapi.
- Numero della migrazione: `0072` provvisorio, quello vero è il primo
  libero al merge (lo dice il Coordinatore). `app.py` per ultimo.
- Sul server B1 va con un passo del Coordinatore, col sì dell'utente: i
  controlli di sola lettura in `out/TASK-467/SERVER-B1.md`, senza
  `TestClient`.
- B1 si scrive in un contesto pulito, da `STATUS.md` e da questo file.

**Testo del primo «Share» dal profilo, approvato dall'utente il
2026-11-12 («Approvo così»)**: «Share your sleep? Your score, hours slept
and sleep stages show on your profile, to everyone who can see it.» Prende
il posto di «…become a post, seen like your other posts.» nella tabella
della risposta 7; lo usa B3, con le traduzioni nelle altre tre lingue.

### Parte B1 — com'è fatta (2026-11-12, branch `feat/TASK-467-b1-sleep-server`)

Il sonno sul server e nel contratto (ADR-0380, deciso dall'agente su delega
dell'utente dentro la strada data dal Coordinatore). Nessuna app lo usa
ancora: può stare in `main` e sul server senza che si veda niente.

**File**. NUOVI: `services/api/migrations/0072_sleep_nights.sql`,
`services/api/shaperoute_api/sleep.py`, `services/api/tests/test_sleep.py`
(42 test), `packages/shared-types/src/sleep.ts`,
`packages/shared-types/fixtures/sleep-*.json` (sei),
`packages/shared-types/test/sleep.test.ts`. MODIFICATI:
`packages/shared-types/src/index.ts` (una riga di export), `docs/API.md`
(«Sleep»), `docs/DATABASE.md` (la migrazione `0072`), questo file, e per
ultima la riga del router in `services/api/shaperoute_api/app.py` (import
e `install_sleep(app)`, col via del Coordinatore del 2026-11-12: il cambio
di TASK-441 B2 è in un altro punto del file, chi entra per secondo unisce
`main`). Il numero `0072` è confermato: il primo libero dopo la `0071`.

**Che cosa c'è** (il dettaglio in `API.md`, «Sleep»):

- `sleep_nights`, una riga per notte pubblicata: giorno del risveglio,
  punteggio, minuti dormiti e svegli, minuti per fase se detti, `shared`
  DEFAULT false. Su `runs`: `sleep_night_id` (`ON DELETE SET NULL`) e
  `sleep_shown` DEFAULT true («Resta acceso»).
- Nel profilo: `PUT`/`PATCH`/`GET`/`DELETE /me/sleep/{night}`, `DELETE
  /me/sleep/shared` («smetti di condividere»), `GET /users/{id}/sleep`
  (l'ultima notte condivisa, per chi può aprire il profilo).
- Nel post: `PUT`/`PATCH`/`GET`/`DELETE /me/activities/{key}/sleep`, `GET
  /drawings/{id}/sleep` (per chi vede il disegno, finché `shown` è acceso).

**Le scelte tecniche (ADR-0380)**:

1. **Si tiene solo quello che è pubblicato.** Una notte che non è nel
   profilo e che nessuna attività porta si cancella: lo fa `sleep.py`
   quando `shared` si spegne (la risposta è `204` al posto della notte) e
   lo fa il database, con due trigger su `runs`, quando l'ultima attività
   la lascia o viene cancellata. Così «al server solo quello che l'utente
   pubblica» vale anche dopo, non solo all'arrivo. La logica sta nel
   database e non in `activities.py` (d'accordo il Coordinatore: è la
   scelta che tiene meno dati); i tre casi hanno il test: attività
   cancellata, sonno tolto dall'attività, account cancellato. Il lanciatore
   delle migrazioni (`db.py`, `migrate`) manda il file intero a PostgreSQL
   senza spezzarlo sui punti e virgola: il corpo `$$ … $$` passa com'è.
2. **Nessun orario**: `night` è il giorno del risveglio; l'ora di andare a
   letto e di svegliarsi non lascia il telefono. La parola («Poor» …
   «Excellent») non si salva: la ricava l'app dal punteggio.
3. **Una notte per account e per giorno**; rimandata prende i numeri
   nuovi. Più attività dello stesso giorno portano la stessa notte.
4. **Una chiamata sola dal post**: `PUT /me/activities/{key}/sleep` porta
   i numeri, `night` e `shown`, salva la notte e la dà all'attività. La
   notte deve essere «quella prima»: entro 2 giorni dall'inizio
   dell'attività (fusi orari compresi), se no `422`.
5. **Chi non è l'autore riceve lo stesso `404`** per una notte non
   condivisa, per il sonno nascosto di un post e per un profilo o un post
   che una notte non ce l'ha; nessun conteggio, nessun esempio in openapi
   (c'è il test). I due interruttori sono separati.
6. **Il profilo ha un endpoint suo** (`GET /users/{id}/sleep`), non un
   campo di `GET /users/{id}`: `profiles.py` non si tocca; B3 fa una
   chiamata in più.
7. **Niente in `X-MuW-Reads`**: gli endpoint li chiama solo un'app che li
   conosce; il post resta leggibile dalle app di prima, senza il sonno.

**Esportazione e cancellazione dell'account**: la cancellazione è la
cascata da `users` (c'è il test). **Un'esportazione automatica non
esiste**: nessun file elenca le tabelle; la copia che uno chiede per email
(policy, «ask us for a copy of your data») si fa a mano, e le due query
per il sonno (le notti, e le attività che le portano con `sleep_shown`)
sono scritte in `DATABASE.md` e in `out/TASK-467/SERVER-B1.md`: una
richiesta di copia comprende il sonno. Nessun file da toccare.

**Da sapere per B2 e B3**:

- Il Feed e il dettaglio del post **non dicono** se un post ha il sonno
  (`feed.py` e `drawings.py` non toccati). B2 sceglie: chiedere `GET
  /drawings/{id}/sleep` quando la riga si vede (come la vasca per il
  nuoto), oppure un campo nella riga del Feed, che vuol dire toccare
  `drawings.py` col suo proprietario.
- Il valore di partenza dell'interruttore sta in `SLEEP_SHOWN_DEFAULT`
  (`shared-types/src/sleep.ts`): l'app usa quello.
- «Smetti di condividere» nel profilo è `DELETE /me/sleep/shared`: spegnere
  solo l'ultima notte farebbe comparire quella prima.
- Sul server: i controlli di sola lettura in `out/TASK-467/SERVER-B1.md`
  (checkout principale), il passo è del Coordinatore col sì dell'utente.

### Parte B1b — com'è fatta (2026-11-12, branch `feat/TASK-467-b1b-sleep-in-feed`)

Il punto lasciato aperto da B1 («il Feed non dice se un post ha il sonno»),
chiuso prima di B2 col sì del Coordinatore. Deciso dall'agente su delega
dell'utente; nessuna migrazione, nessuna app lo legge ancora.

**Perché un campo e non una richiesta.** La vasca e la palestra chiedono i
loro numeri a parte (`GET /drawings/{id}/pool-swim`), ma solo per i loro
post. Il sonno può stare su qualsiasi attività: chiedere `GET
/drawings/{id}/sleep` vorrebbe dire una richiesta per riga del Feed, quasi
tutte `404`, accanto a quella delle reazioni. Il precedente è
`ski_descents` (TASK-424 C2b): un campo facoltativo del disegno visto.

**Che cosa c'è.** Ogni disegno visto porta `sleep`: lo stesso
`SleepSummary` di `GET /drawings/{id}/sleep`, **solo mentre `sleep_shown`
è acceso**; `null` per un post senza notte e per uno col sonno nascosto,
anche al suo autore (l'interruttore lo legge da `GET
/me/activities/{key}/sleep`: nella lista vede quello che vedono gli
altri). Vale per `GET /drawings/{id}` e per ogni lista che passa da
`_seen`: Feed, profilo, ricerca, stazione, gare. Chi non vede il post non
lo trova in nessuna lista, e così attraverso un blocco. `stages` manca per
una notte senza fasi, come nell'endpoint, mai `null`.

**Com'è fatto.** Una sotto-select in `_SEEN_FIELDS` (`sleep_seen.py`,
`SEEN_SLEEP_SQL`: una riga di `sleep_nights` per chiave primaria, con
`AND r.sleep_shown`), letta da `_seen`. `SleepStagesBody` e
`SleepSummaryBody` passano da `sleep.py` a `sleep_seen.py`, perché
`sleep.py` importa `drawings.py` e non può valere il contrario. Un nome
solo in openapi, nessun esempio.

**File**. NUOVI: `services/api/shaperoute_api/sleep_seen.py`,
`packages/shared-types/fixtures/drawing-sleep.json`. MODIFICATI:
`services/api/shaperoute_api/drawings.py` (`SeenFields`, `_SEEN_FIELDS`,
`_seen`), `services/api/shaperoute_api/sleep.py` (le due classi importate),
`packages/shared-types/src/index.ts` (il campo accanto a `ski_descents`),
`packages/shared-types/test/sleep.test.ts`, `services/api/tests/test_sleep.py`
(8 test nuovi; quello di B1 sul sonno nascosto ora vuole `"sleep":null`),
`docs/API.md` («Sleep»), questo file. E, a una riga, quello che fissa
l'elenco dei campi del disegno visto, come per `ski_descents`:
`services/api/tests/test_drawings.py`, `test_feed.py`, e `"sleep": null`
in `fixtures/drawing-ski.json`, `feed-imported.json`,
`drawing-details-imported.json`.

**Sul server**: va col passo dopo l'aggiornamento completo del 12
novembre, col sì dell'utente; prima di allora le app non vedono il campo
e B2 non mostra niente.

### Parte B2 — com'è fatta (2026-11-12, branch `feat/TASK-467-b2-sleep-post`)

Il sonno dentro il post di un'attività, nell'app. **Spento in ogni build
di oggi**: niente di quello che segue si vede o parte finché la parte C non
lo accende. Deciso dall'agente su delega dell'utente, dentro le scelte
della parte 0 e la lista dei file approvata dal Coordinatore.

**Come resta nascosto.** Una sola costante, `SLEEP_POSTS_ON = false`
(`health/sleepModules.ts`), e `sleepReader()` che risponde sempre null. Il
modulo nativo di Salute è già nelle build dalla 1.0.1 (per il battito):
la sua assenza non basterebbe, e il sonno non si chiede col testo del
permesso di oggi, che nomina solo il battito. Il lettore vero di Apple non
è in `main`: arriva con la parte C. `sleepModules.test.ts` legge i
sorgenti e blocca ogni file del sonno che carichi la libreria di Salute o
chieda un permesso. Nessun cambio ad `app.json`, nessun modulo nativo,
nessuna dipendenza: l'impronta iOS non si muove (misurata, vedi la PR).

**Che cosa c'è** (com'è quando è acceso; il dettaglio in `UI.md`, «Il
sonno della notte prima»):

- **La notte** (`health/sleepSamples.ts`, funzioni pure sopra `sleepNight`
  e `sleepScore` della parte A): i campioni dalle 18 della sera prima alle
  18 del giorno dell'attività, sull'ora del telefono, fino all'inizio
  dell'attività; per un'attività prima delle 6 senza aver ancora dormito,
  la notte del giorno prima. Il punteggio usa le 14 notti prima per l'ora
  solita. Esce il riassunto del contratto (`SleepSummary`): giorno del
  risveglio, punteggio, minuti, fasi mai più del sonno.
- **A fine attività** (`health/SleepRunEnd.tsx`, montato in `RunEnd.tsx`
  in vista sopra «Save»): l'interruttore «Sleep last night», che parte da
  `SLEEP_SHOWN_DEFAULT` (acceso, «Resta acceso»), la riga «82 · Very good ·
  7 h 40 min» e «Shown in this post. Turn it off to keep it to yourself.».
  Serve il sì a leggere il sonno (`health/sleepChoice.ts`: lo accenderà la
  scheda «Sleep» del profilo, B3; a fine attività il permesso non si
  chiede mai). Senza notte non compare niente. Mai per un'attività
  aggiunta da un file.
- **Al server solo quello che si pubblica**: la notte lascia il telefono
  solo con l'interruttore acceso **e** un post che altri vedono; con «Only
  me» la riga non compare nemmeno. Due difese: `RunEnd` non la passa alla
  porta (`toSleep(null)`), e `activities/sleepOut.ts` non tiene mai una
  notte con `shown` diverso da `true`.
- **La coda** (`activities/sleepOut.ts`, `sleep-outbox.json`): detta a
  «Save» (`toSleep` in `activitiesDoor.ts`, come `toOutfit`), aspetta sul
  telefono finché l'API ha l'attività, poi `PUT
  /me/activities/{key}/sleep`, dopo il disegno. Un rifiuto dell'API (non è
  la notte prima, attività sconosciuta) la butta; senza rete aspetta; dopo
  30 giorni si butta; una corsa rifiutata e scartata se la porta via.
- **Dove si legge**: nel Feed una riga sotto i numeri del post
  (`health/SleepLine.tsx`); nella pagina del post una scheda dopo quelle
  della corsa (`health/SleepCard.tsx`: punteggio e parola, ore, fasi, e
  «Worked out by MuW from Apple Health data…»). Leggono il campo `sleep`
  del post (B1b): nessuna richiesta in più. Mai orari, mai la data.
- **Dopo la pubblicazione** (`health/SleepPostSwitch.tsx`, in «Post
  settings»): il proprietario spegne o riaccende; va all'API subito
  (`PATCH`), e la riga e la scheda seguono all'istante
  (`health/sleepNow.ts`).
- **Il client** `api/sleep.ts`: `PUT`/`PATCH`/`GET`/`DELETE
  /me/activities/{key}/sleep`, `GET /drawings/{id}/sleep`, e la lettura
  prudente del campo `sleep` di una lista.
- **I testi** approvati, nelle quattro lingue, con le chiavi di contesto
  `@@sleep` per le parole che altrove vorrebbero un'altra traduzione
  («Light», «Deep», «Good»…). In francese «REM» è «Paradoxal», come
  nell'app Santé. Nessun testo fuori dalla tabella della risposta 7.

**File**. NUOVI in `apps/mobile/src/`: `health/sleepSamples.ts`,
`sleepModules.ts`, `sleepChoice.ts`, `sleepText.ts`, `useLastNight.ts`,
`sleepNow.ts`, `SleepRunEnd.tsx`, `SleepLine.tsx`, `SleepCard.tsx`,
`SleepPostSwitch.tsx`, `api/sleep.ts`, `activities/sleepOut.ts`, coi test
(`health/sleepSamples.test.ts`, `sleepModules.test.ts`,
`sleepChoice.test.ts`, `sleepText.test.ts`, `SleepInPost.test.tsx`,
`api/sleep.test.ts`, `activities/sleepOut.test.ts`,
`RunEndSleep.test.tsx`, `activitiesDoorSleep.test.tsx`,
`feed/FeedSleep.test.tsx`). MODIFICATI: `activities/RunEnd.tsx`,
`activities/activitiesDoor.ts`, `feed/FeedPost.tsx` e `feed/PostPage.tsx`
(una riga e un import ciascuno), `feed/PostSettings.tsx` (una riga),
`i18n/{it,de,es,fr}.ts`, `docs/UI.md`, questo file.

**Da sapere per B2b, B3 e C**:

- **B2b**: palestra e nuoto in vasca hanno form e code loro
  (`GymPostForm`, `PoolPostForm`, `usePoolOutbox`): stesso componente
  `SleepRunEnd`, stessa coda. Prima della build nativa.
- **B3**: la scheda «Sleep» del profilo chiama `keepSleepOn()` al sì
  dell'utente; da lì a fine attività il sonno si legge.
- **C**: accendere vuol dire `SLEEP_POSTS_ON` vero **e** un
  `sleepReader()` vero solo nella build col testo del permesso nuovo (le
  build di prima ricevono lo stesso OTA: devono restare senza lettore), e
  aggiornare `sleepModules.test.ts`. Prima: frase della privacy, «App
  Privacy», note di revisione, ognuna col sì dell'utente.
- I controlli del server per B1b: `out/TASK-467/SERVER-B1b.md`.

### Parte B2b — com'è fatta (2026-11-12, branch `feat/TASK-467-b2b-sleep-gym-pool`)

«Sleep last night» anche a fine allenamento in palestra e a fine nuoto in
vasca, che hanno un form e una coda loro. **Spenta come B2**: stessa
costante, nessun lettore; lista dei file approvata dal Coordinatore.
Deciso dall'agente su delega dell'utente; nessun testo nuovo.

- **Le due schermate** (`gym/GymEnd.tsx`, `pool/PoolSwimEnd.tsx`): lo
  stesso `SleepRunEnd` di B2, sotto il form del post e in vista sopra
  «Save». La notte è quella prima dell'inizio dell'allenamento o del nuoto
  (`useLastNight(reader, startedMs)`); il lettore è una prop che parte da
  `sleepReader()`, quindi null in ogni build. Parte da
  `SLEEP_SHOWN_DEFAULT`; compare solo con un post che altri vedono.
- **A «Save»**, una volta che l'allenamento o il nuoto è tenuto sul
  telefono, la notte entra nella stessa coda di B2 (`keepSleepFor`, con la
  chiave dell'allenamento o del nuoto, che per l'API è una corsa): solo con
  l'interruttore acceso e un post che altri vedono, se no niente.
- **La coda aspetta anche loro** (`activities/sleepOut.ts`): una notte
  mandata prima che l'API abbia l'attività riceverebbe `404` e verrebbe
  buttata. Ora aspetta finché la sua chiave è nella coda delle corse, in
  quella della palestra (`gym-outbox.json`) o in quella della vasca
  (`pool-outbox.json`). Un allenamento o un nuoto che l'API rifiuta resta
  nella sua coda: la sua notte non parte mai, e dopo 30 giorni si butta.
- **Chi la manda** (`gym/useGymOutbox.ts`, `pool/usePoolOutbox.ts`): dopo i
  disegni, una chiamata a `sendWaitingSleep`; senza notti in attesa non
  chiede niente.
- **Con la costante spenta** (condizione del Coordinatore, coi test): le
  due schermate si disegnano esattamente come prima (il confronto è
  sull'albero intero, tolto il solo blocco del sonno), «Save» non tiene
  nessuna notte e le due code non fanno nessuna richiesta sul sonno.

**File**. MODIFICATI: `apps/mobile/src/gym/GymEnd.tsx`,
`gym/useGymOutbox.ts`, `pool/PoolSwimEnd.tsx`, `pool/usePoolOutbox.ts`,
`activities/sleepOut.ts` e `activities/sleepOut.test.ts` (di B2),
`docs/UI.md`, questo file. NUOVI: `gym/GymEndSleep.test.tsx`,
`pool/PoolSwimEndSleep.test.tsx`, `health/sleepEnd.testing.tsx` (quello
che i due test hanno in comune). `GymPostForm.tsx` e `PoolPostForm.tsx`
non toccati.

### Parte B3 — com'è fatta (2026-11-12, branch `feat/TASK-467-b3-sleep-profile`)

La scheda «Sleep» del profilo, con «Share» di una notte da sola. **Spenta
come B2**: stessa costante, nessun lettore; niente di quello che segue si
vede o parte finché la parte C non lo accende. Deciso dall'agente su delega
dell'utente, dentro le scelte della parte 0 e le risposte 8 e 9; lista dei
file approvata dal Coordinatore. Nessun codice sul server: bastano le rotte
di B1.

**Che cosa c'è** (com'è quando è acceso; il dettaglio in `UI.md`, «La
scheda Sleep del profilo»):

- **Sul proprio profilo** (`profile/OwnSleep.tsx`, montata in
  `ProfileHome.tsx` sotto il VO₂ max):
  - *prima del sì*: il pulsante «Show my sleep from Apple Health» e sotto
    «MuW works out a sleep score from your Apple Health sleep data.». Il
    tocco è il sì: apre il foglio del telefono (`reader.ask()`), legge la
    notte e tiene il sì (`keepSleepOn()`, `health/sleepChoice.ts`): da lì
    anche la fine di un'attività legge il sonno (B2). Un telefono che non
    può leggere dice «MuW can't read your sleep…» e il sì non si tiene;
  - *col sì tenuto*, a ogni apertura del profilo la notte si rilegge dal
    telefono, senza richiedere il permesso: «Sleep score» col giorno, «82 ·
    Very good», «7 h 40 min», le fasi se un orologio le ha dette, la nota
    «Worked out by MuW…». Senza notte: «No sleep data for last night in
    Apple Health.»;
  - *chi la vede*: «Only you see this» e «Share». Il primo «Share» chiede
    «Share your sleep?» col testo approvato («Cancel» / «Share»), una
    volta sola per telefono (`sleep-share.json`); poi `PUT
    /me/sleep/{night}` coi soli numeri e `shared: true`. Da lì «On your
    profile» e «Stop sharing», che è `DELETE /me/sleep/shared`, senza
    conferma;
  - *una notte più vecchia ancora sul profilo*: sotto quella di oggi (o
    sotto «No sleep data…») la riga «On your profile · 11 Nov» con «Stop
    sharing». Condivisa quella di oggi, prende il suo posto.
- **Sul profilo di un altro** (`profile/UserSleep.tsx`, montata in
  `UserProfilePage.tsx` sotto il VO₂ max): l'ultima notte condivisa, da
  `GET /users/{id}/sleep`, nello stesso riquadro
  (`profile/ProfileSleep.tsx`), sola lettura. Un `404` (nessuna notte,
  notte non condivisa, blocco: tutti uguali) non mostra niente.
- **La notte** (`health/sleepProfile.ts`): quella da cui ci si è svegliati
  oggi, con le stesse funzioni di B2 (`lastNightOf`); distingue «nessuna
  notte» da «non si può leggere» (telefono senza dati di Salute, o lettura
  fallita), che `readLastNight` di B2 confonde.
- **Il client** (`api/sleepProfile.ts`): `PUT /me/sleep/{night}`, `DELETE
  /me/sleep/shared`, `GET /users/{id}/sleep`.

**Le scelte tecniche** (per «ADR-0380, precisazione B3»):

1. **Quale notte è sul profilo lo dice il server, non il telefono**: la
   scheda chiede `GET /users/{il proprio id}/sleep` e confronta il giorno
   con la notte letta. Così vale anche da un altro telefono, e la domanda
   non porta nessun dato del sonno. Parte solo col sì a leggere il sonno
   già tenuto: prima, nessuna richiesta.
2. **Niente lascia il telefono prima di «Share»**: la notte letta resta
   nella scheda; al server vanno solo punteggio, minuti e fasi, e il giorno
   nel percorso. Mai gli orari.
3. **«Stop sharing» toglie ogni notte dal profilo** (`DELETE
   /me/sleep/shared`), non solo l'ultima: spegnere la sola ultima farebbe
   ricomparire quella prima (B1). Una notte che nessun post porta sparisce
   così anche dal server.
4. **La conferma del primo «Share» è del telefono**, come la domanda del
   VO₂ max (`vo2max-asked.json`): un telefono nuovo la richiede.
5. **La notte condivisa non si aggiorna da sola**: se Salute cambia i
   numeri dopo «Share» (l'orologio sincronizza tardi), sul profilo restano
   quelli condivisi finché non si condivide di nuovo. Nessun invio senza un
   tocco.
6. **«Stop sharing» ha una chiave sua** (`Stop sharing@@sleep`): quella
   della live è tradotta «Smetti», «Beenden», «Arrêter», che qui non dice
   che cosa.

**Come resta nascosta.** `OwnSleep` non disegna niente, non legge e non
chiede niente con `sleepPostsOn()` falso **o** senza lettore
(`sleepReader()` è null in ogni build); `UserSleep` niente e nessuna
richiesta con `sleepPostsOn()` falso. I test confrontano l'albero intero
delle due schermate, spento e acceso, tolto il solo riquadro del sonno
(`ProfileHomeSleep.test.tsx`, `UserProfileSleep.test.tsx`), anche con un
lettore finto e il sì già tenuto. `sleepModules.test.ts` invariato: i file
nuovi passano il suo controllo (nessuna libreria di Salute, nessun
permesso). Nessun cambio ad `app.json`, `app.config.ts`, plugin o
dipendenze.

**File**. NUOVI in `apps/mobile/src/`: `api/sleepProfile.ts`,
`health/sleepProfile.ts`, `profile/ProfileSleep.tsx`, `profile/OwnSleep.tsx`,
`profile/UserSleep.tsx`, coi test (`api/sleepProfile.test.ts`,
`health/sleepProfile.test.ts`, `profile/OwnSleep.test.tsx`,
`profile/UserSleep.test.tsx`, `profile/ProfileHomeSleep.test.tsx`,
`profile/UserProfileSleep.test.tsx`). MODIFICATI: `profile/ProfileHome.tsx`
e `profile/UserProfilePage.tsx` (un import e una riga ciascuno),
`i18n/{it,de,es,fr}.ts`, `docs/UI.md`, questo file.

**Da sapere per C**:

- **Condizione del Coordinatore (2026-11-12)**: prima che la C accenda il
  sonno per tutti, l'utente deve aver visto la scheda e i post accesi.
  Dal 2026-11-21 la vede sul suo iPhone con la build di prova (sotto,
  «Parte C — avviata»); quello che chiede di cambiare entra prima
  dell'accensione.

- Il lettore vero deve **lanciare un errore** quando sa che non può
  leggere (permesso negato dove iOS lo dice, dati di Salute non
  disponibili): è quello che fa dire «MuW can't read your sleep…». iOS non
  dice se la lettura è negata: una lettura negata torna vuota e la scheda
  dice «No sleep data for last night…». Se serve distinguere meglio, è una
  scelta della parte C.
- La frase della privacy approvata dice «kept with your post»: la notte
  condivisa sul profilo non è in un post. La frase va riletta con l'utente
  prima di accendere.
- La prova nel simulatore (un lettore finto, la costante accesa in locale)
  è della parte C o del turno del simulatore: qui niente si vede.

### Parte C — avviata (2026-11-21, branch `feat/TASK-467-c-sleep-on`, bozza #1334)

L'utente, il 21 novembre: «non vedo ancora i post di come ho dormito», e
alla domanda come vederli prima dell'uscita ha scelto **«Build di prova sul
mio iPhone»** (scartate: le schermate dal simulatore; aspettare la build
nativa); il sì alla build lo ha dato anche al Coordinatore («Sì, build»).
La 1.1.0 risulta sullo Store dal 12 novembre: la condizione «dopo la
1.1.0» è caduta, restano i sì della C.

**Che cosa c'è nel branch, fuori da `main`** (la #1334 resta in bozza: non
si unisce prima della build nativa che porta il testo nuovo):

- `health/appleSleep.ts`: Apple Salute come lettore del sonno
  (`HKCategoryTypeIdentifierSleepAnalysis`), l'unico file che nomina quel
  tipo e che lo interroga. «A letto» e i valori che MuW non conosce restano
  fuori. Una lettura negata torna vuota (iOS non dice se è negata): la
  scheda dice «No sleep data for last night in Apple Health.».
- `health/sleepModules.ts`: `SLEEP_POSTS_ON = true`; `sleepReader()` è il
  lettore di Apple su un iPhone la cui build ha il codice nativo di
  Salute, null altrove.
- `app.json` e `locales/{en,it,de,es,fr}.json`:
  `NSHealthShareUsageDescription` col testo approvato nella risposta 7
  (il battito e il sonno), le altre quattro lingue preparate dall'agente.
- `sleepModules.test.ts` riscritto per la C: acceso solo con un testo del
  permesso che nomina il sonno; la libreria di Salute caricata in un file
  solo e interrogata in un file solo; il permesso chiesto in un posto
  solo, la scheda del profilo.
- `eas.json`: il profilo `preview-sleep` (come `preview`, canale suo). Una
  build `preview` ha il runtime `exposdk:57.0.0` e il canale `preview`: al
  secondo avvio prenderebbe l'OTA di prova di `main` e il sonno si
  rispegnerebbe. Sul canale `preview-sleep` arrivano solo gli update
  pubblicati da questo branch.

**La build di prova**: EAS `c9dc5e44-5cd3-4ee3-8636-158cfa67d539`, dal
commit `637a2db6`, distribuzione interna, solo l'iPhone dell'utente; parla
con l'API di produzione (il sonno che condivide va sul suo profilo vero;
gli altri, con la costante spenta, non lo vedono). Parte da `main`, che
non ha ancora l'app dell'orologio: sul telefono prende il posto della
1.1.0 finché non la si reinstalla dallo Store (detto all'utente: «Parti
adesso da main»).

**Resta per chiudere la C** (ognuno col sì dell'utente dove serve):

- il resto dei test con la costante accesa (quelli che contavano sul
  «spento»), le impronte misurate su una copia pulita;
- la frase della privacy, da rileggere con l'utente (dice «kept with your
  post»: la notte condivisa sul profilo non è in un post), «App Privacy»,
  le note di revisione, la riga della descrizione sullo Store;
- quello che l'utente chiede di cambiare dopo la prova sul telefono;
- la build nativa che porta il testo nuovo, e solo allora il merge.

**La frase della privacy, approvata («Approvo così», 2026-11-21)**. Prende
il posto di quella della risposta 7, che diceva «kept with your post»: la
notte condivisa sul profilo non è in un post, e con la parte E il sonno si
pubblica in tre modi. In inglese, così com'è nell'app:

> Once you tap «Show my sleep from Apple Health», MuW reads your sleep from
> Apple Health (the time asleep and the sleep stages) on your phone and
> works out a sleep score there. Nothing of it reaches our server until you
> publish it: with «Share» on your profile, with «Publish» as a post of its
> own, or with «Sleep last night» in the post of an activity. Then the
> score, the hours slept, the stages and the day are kept on our server and
> seen by whoever can see your profile or that post, until you stop
> sharing, remove the post or delete your account. Never the hour you went
> to bed or woke up.

È il secondo blocco di «Apple Health and Health Connect» in
`about/content/{en,it,de,es,fr}.ts`, **solo sulla bozza #1334**; le altre
quattro lingue le ha preparate l'agente e citano i pulsanti come sono
tradotti. Un cambio in quei file vuole `node site/tools/make_privacy.mjs`
dalla radice, che riscrive `site/privacy/**` (un test del sito le
confronta): fatto sulla bozza. Sono le pagine nel repository: la copia sul
sito pubblicato è un passo a parte, col sì dell'utente. Prima del merge
della C i file della privacy vanno riallineati a quello che è entrato in
`main` nel frattempo (Coordinatore, 2026-11-21).

**Dal 2026-11-22** la bozza è allineata a `main` (1.1.0 con l'orologio e
E1) e ha la CI tutta verde a `3bea4a3c`: è la suite intera con la costante
accesa. Per non cambiare `targets/watch/**` l'orologio ha una frase sua,
solo sul battito (`WATCH_HEALTH_READ` in `src/watch/watchTexts.ts`). Dei
punti qui sopra restano: la data della privacy, la copia sul sito, «App
Privacy», le note di revisione, le impronte su una copia pulita, la build
nativa.

### Parte E — il post del sonno da solo nel Feed: il piano (2026-11-21, nessun codice)

Chiesta dall'utente dopo la prova sul telefono (risposte 10–12). Era la
parte rimandata a TASK-312 C; ora C1 è in `main` (`0080_photo_posts.sql`,
`photo_posts.py`, il tipo `photos` in `X-MuW-Reads`): un post senza
attività è **un disegno senza corsa** (`drawings.user_id`, `key`, mai
`only_me`, mai traccia). Il post del sonno ci si appoggia. *Proposta
tecnica dell'agente*: numeri (migrazione, ADR o «ADR-0380, precisazione
E»), nome della parte e file li dà il Coordinatore prima del codice; i
file di `drawings.py`, `feed.py`, `reads.py` e del foglio del «+» sono di
TASK-312 C.

**Server**

- `drawings.sleep_night_id` → `sleep_nights`, solo per un disegno senza
  corsa; un post del sonno è pubblicato appena nasce (ha la sua notte: non
  aspetta una foto come il post di sole foto).
- `PUT /me/sleep-posts/{key}` (i numeri della notte, il giorno,
  `everyone` o `followers`; la seconda volta lo cambia) e `DELETE
  /me/sleep-posts/{key}`. Una notte portata da un post conta come
  pubblicata: `sleep.py` non la cancella finché il post c'è, e il post
  cancellato se la porta via se niente altro la pubblica.
- Il disegno visto porta `sleep` anche da `d.sleep_night_id`; `source:
  "sleep"`; un tipo nuovo `sleep` in `X-MuW-Reads`, così le app di prima
  non lo vedono in nessun elenco.
- Fuori di proposito, come il post di sole foto: concorso, badge, gioco,
  ricerca, link pubblico, post mandato in chat.

**App**

- Nel foglio del «+» (`feed/AddToFeed.tsx`) la voce «Sleep»; la pagina
  «Sleep» con la scheda del profilo (`ProfileSleep`), il selettore e
  «Publish»; serve il sì a leggere il sonno (lo stesso pulsante della
  scheda del profilo se manca).
- La scheda nel Feed e la pagina del post per `source: "sleep"`: il
  punteggio al posto della mappa, mai orari.
- Tutto dietro `SLEEP_POSTS_ON`, come il resto: in `main` resta spento
  fino alla parte C.

**Il «+» con tutte le voci** (la seconda metà della richiesta: una corsa,
un'immagine, una corsa da Strava, un post di Instagram, un allenamento in
palestra, una scheda di allenamento) è più largo di questo task: passato
al Coordinatore il 2026-11-21 perché lo tagli. Sui documenti di oggi:
l'attività da un file c'è già (TASK-476, anche il GPX esportato da
Strava); l'immagine è il post di sole foto (TASK-312 C2); allenamento e
scheda come post sono nuovi; il collegamento diretto a Strava non può
mostrare ad altri i dati (studio TASK-312 E); da Instagram non si importa
niente, resta la foto dalla galleria.

### Parte E1 — com'è fatta (2026-11-21, branch `feat/TASK-467-e-sleep-post-api`, #1373)

Il post del sonno da solo, sul server e nel contratto («ADR-0380,
precisazione E», deciso dall'agente su delega dell'utente dentro le
risposte 10–12; lista dei file approvata dal Coordinatore). Nessuna app lo
usa ancora: può stare in `main` e sul server senza che si veda niente.

- **Un disegno senza corsa che porta la sua notte** (migrazione
  `0082_sleep_posts.sql`): `drawings.sleep_night_id` → `sleep_nights`
  (`ON DELETE CASCADE`), solo senza corsa e pubblicato appena nasce
  (`drawings_sleep_post_check`), uno per notte
  (`drawings_of_sleep_night`). È il modello dei post di sole foto
  (TASK-312 C1, `0080`): reazioni, commenti, segnalazioni, blocchi e
  «Followers» valgono senza regole nuove.
- **Le rotte** (`sleep_posts.py`): `PUT`/`GET`/`DELETE
  /me/sleep-posts/{night}`. `PUT` porta i numeri della notte e
  `everyone` o `followers` (mai «Only me»); rimandato è lo stesso post,
  coi numeri e la scelta dell'ultima volta, e non si ripubblica. La chiave
  del disegno è `sleep` più il giorno (`sleep20260921`); `409` se un post
  di sole foto ha già quella chiave.
- **Chi lo riceve**: solo un'app che dice `sleep` in `X-MuW-Reads`
  (`reads.py`, `Reads.drawings_sql()`: un disegno senza corsa con una
  notte passa con `sleep`, uno senza notte con `photos`). Tutti gli
  elenchi filtrano da lì: `feed.py` non è stato toccato. Negli elenchi e
  nel disegno aperto ha `source` `sleep` e la notte nel campo `sleep`
  (`sleep_seen.py` la legge anche da `d.sleep_night_id`).
- **Si tiene solo quello che è pubblicato**, anche qui: una notte resta
  finché è nel profilo, un'attività la porta o un post è suo
  (`sleep.py`, e nel database la funzione `sleep_night_left` riscritta più
  il trigger `drawings_sleep_night_deleted`). Cancellato il post, da
  chiunque, la notte va via se niente altro la pubblica; `DELETE
  /me/sleep/{night}` porta via anche il post. Il post e il profilo sono
  separati: `shared` non cambia, e «Stop sharing» non toglie il post.
- **Fuori di proposito**, come le sole foto: concorso, badge, gioco,
  totali, ricerca, link pubblico, post mandato in chat.
- **Il contratto**: `SleepPostRequest`, `MySleepPost`, `SLEEP_SOURCE`,
  `SLEEP_POST_VISIBILITIES` in `shared-types/src/sleep.ts`;
  `DrawingSource` con `sleep`; `reads.json` col tipo nuovo.

**File**. NUOVI: `services/api/migrations/0082_sleep_posts.sql`,
`shaperoute_api/sleep_posts.py`, `tests/test_sleep_posts.py` (28 test),
`packages/shared-types/fixtures/sleep-post-request.json`,
`sleep-post.json`, `test/sleepPost.test.ts`. MODIFICATI:
`shaperoute_api/sleep.py`, `sleep_seen.py`, `reads.py`, `drawings.py`
(`DrawingSource` e la `source` in `_SEEN_FIELDS`), `app.py` (due righe),
`tests/test_reads.py`, `shared-types/src/sleep.ts`, `src/index.ts`,
`fixtures/reads.json`, `docs/API.md` («Sleep»), `docs/DATABASE.md`.

**Da sapere**:

- TASK-312 fa una sua «C1c»: `GET /me/photo-posts` e gli endpoint delle
  foto trovano un disegno senza corsa per account e chiave senza guardare
  `sleep_night_id`. Va prima dell'app E2.
- Sul server: passo 17 (del Coordinatore, col sì dell'utente); i controlli
  di sola lettura in `out/TASK-467/SERVER-E1.md`, non provati sul server.
- **Sul server dal 2026-11-22** (passo 17, server a `40789324`): la `0082`
  passata in ordine dopo la `0081`, `/me/sleep-posts/{night}` risponde
  `401` senza token, nessun `Traceback`. Finché nessuna app dice `sleep`
  non cambia niente di quello che si vede.

### Parte E2 — l'app del post del sonno (2026-11-21, branch `feat/TASK-467-e2-sleep-post-app`, in corso)

Scritti i file nuovi, non montati (nessuna PR): `api/sleepPosts.ts` (le
tre chiamate), `feed/SleepPostPage.tsx` (la pagina «Sleep»: la scheda del
profilo, il selettore che parte su «Everyone», «Publish» e la riga sotto;
notte già pubblicata: «Already in the Feed» e «Remove post»; senza il sì a
leggere il sonno, lo stesso pulsante della scheda del profilo),
`feed/SleepPostCard.tsx` (nel Feed, al posto della mappa: «Sleep score»,
punteggio e parola, ore, le fasi; nella pagina del post anche la nota), coi
test. Tutto dietro `SLEEP_POSTS_ON`.

**Restano gli agganci**, dopo TASK-312 C2 (l'app dei disegni senza corsa)
e TASK-481 A (il foglio nuovo del «+», `feed/addToFeedEntries.ts`):
`api/reads.ts` dice `sleep` solo con la costante accesa; la voce «Sleep»
nel foglio; un ramo dove C2 separa i disegni senza corsa (scheda del Feed,
pagina del post, griglia del profilo); i testi nelle quattro lingue;
`UI.md`. La lista esatta al Coordinatore quando i due sono in `main`. Per
vederlo sul telefono servirà una build di prova nuova (col sì
dell'utente, chiesta al Coordinatore).

**2026-11-22, il secondo gruppo di file nuovi** (testa `0fc1999a`, sempre
senza PR), scritti leggendo la bozza di TASK-312 C2 (#1386), che dà ai post
di sole foto una scheda e una pagina loro e li separa con `isPhotoPost`:

- `feed/sleepPost.ts`: `isSleepPost`, dal `source` come `isPhotoPost`;
- `feed/SleepFeedPost.tsx`: la riga del Feed. Autore e quando, la notte
  dove una corsa ha la mappa, le azioni sotto; un tocco sulla notte apre la
  pagina, due sono il super like; «…» sul post di un altro;
- `feed/SleepPostDetailPage.tsx`: la pagina del post, con la nota di chi è
  il punteggio; sul proprio, «Remove post» sotto la barra, che lo toglie
  dal Feed e chiude la pagina (senza conferma, come nella pagina del «+»:
  si ripubblica da lì);
- `feed/SleepTile.tsx`: la tessera nella griglia di un profilo, il
  punteggio sopra «Sleep», muta per un lettore di schermo;
- `feed/sleepPost.testing.ts` e i test: 39 verdi con quelli di prima.

Nessun testo oltre ai sei approvati. **Gli agganci, punto per punto**
(da ricontrollare sul diff finale di C2, e da mandare al Coordinatore
prima di toccare un file esistente):

1. `api/reads.ts`: `sleep` in `X-MuW-Reads` solo con `sleepPostsOn()`
   (oggi `READS` è una costante; spento, l'intestazione è quella di oggi);
2. `api/drawings.ts`: `activity: null` letta come nessuna anche con
   `source` «sleep»;
3. `screens/FeedScreen.tsx`: `SleepFeedPost` nella lista e
   `SleepPostDetailPage` come pagina; tolto un post, le schede rileggono;
4. `feed/PostActions.tsx`: niente «Share» sul post del sonno (oggi sul
   proprio comparirebbe: non ha linea né link);
5. `social/DrawingCard.tsx`: senza i fatti della corsa e senza «Send to a
   friend»;
6. `social/DrawingsGrid.tsx`: `SleepTile` nella cella;
7. `feed/addToFeedEntries.ts` (di TASK-481 A): la voce «Sleep», solo con
   la costante accesa;
8. i sei testi nelle quattro lingue;
9. `fixtures/feed-sleep.json` (nuovo), letto da API e app;
10. `UI.md` e questo file.

Da guardare su `main` vero: dove C2 apre la pagina di un post fuori dal
Feed (profilo, notifica) e la ricerca dei disegni.

**2026-11-22, tempo 1 degli agganci** (dopo #1386 in `main`; il
Coordinatore ha detto sì ai due tempi; l'elenco esatto gli è stato
mandato prima di toccare un file). Tutto dietro `sleepPostsOn()`:

- `api/reads.ts`: `reads()` è `READS` più `sleep` con l'interruttore
  acceso; l'intestazione di ogni richiesta e quella dei messaggi passano
  da lì. Spento, la stringa è quella di `fixtures/reads.json`;
- `api/drawings.ts`: `activity: null` letta come nessuna anche con
  `source` «sleep»; ogni altro disegno con attività nulla resta rifiutato;
- `screens/FeedScreen.tsx`: `SleepFeedPost` nella lista e
  `SleepPostDetailPage` come pagina; tolto il post, le schede rileggono;
- `feed/PostActions.tsx`: niente «Share»; `social/DrawingCard.tsx`: la
  notte al posto dei fatti della corsa, niente «Imported» (la `source` non
  è `muw`, ma non è un'importazione), niente «Send to a friend»;
  `social/DrawingsGrid.tsx`: `SleepTile` nella cella;
- quattro testi nelle quattro lingue («Publish» c'era già);
- test nuovi: `api/readsSleep.test.ts`, `api/drawingsSleep.test.ts`,
  `screens/FeedScreenSleep.test.tsx` (acceso: scheda e pagina; spento:
  l'app non dice `sleep` e il Feed è quello di prima),
  `social/DrawingCardSleep.test.tsx`, `social/DrawingsGridSleep.test.tsx`.

Resta il **tempo 2**: la voce «Sleep» in `feed/addToFeedEntries.ts` con
«Last night's sleep score, from Apple Health», dopo TASK-481 A. Fino ad
allora la pagina «Sleep» non si apre da nessuna parte. Ordine di unione
detto dal Coordinatore: TASK-485 B, TASK-481 A, poi questo.

**2026-11-23, tempo 2 (la voce «Sleep» del «+»)**, scritto sopra la bozza
di TASK-481 A e portato su un ramo da `main` quando quella è entrata:

- `feed/addToFeedEntries.ts`: la voce `sleep`, quarta nell'ordine
  dell'utente, con `sleep` falso quando non è detto: la lista di chi non
  lo dice è quella di prima;
- `feed/AddToFeed.tsx`: la voce c'è con `sleepPostsOn()` e un lettore del
  sonno nel telefono; scelta, apre `SleepPostPage` nello stesso foglio;
- `feed/SleepPostPage.tsx`: senza più un titolo suo (è quello del foglio),
  e dice `onChanged` quando la notte entra nel Feed o ne esce;
- `screens/FeedScreen.tsx`: a quel segnale le due schede rileggono;
- il testo «Last night's sleep score, from Apple Health» nelle quattro
  lingue;
- test nuovi: `feed/addToFeedEntriesSleep.test.ts`,
  `feed/AddToFeedSleep.test.tsx` (spento e senza lettore: il foglio è
  quello di prima; acceso: la voce, la pagina nel foglio, «Publish» che
  chiude e fa rileggere).

## Criteri di accettazione

- [x] Le scelte di prodotto sono dell'utente e stanno in questo file.
- [x] I testi sono approvati dall'utente (tabella della risposta 7).
- [x] A: dai campioni alla notte e dalla notte al punteggio, con test
  deterministici (22), `tsc` ed `eslint` puliti; nessun file esistente
  dell'app toccato, impronte ferme.
- [x] B1: `sleep_nights` e il sonno dell'attività sul server e nel
  contratto, coi test; chi non è l'autore non legge mai una notte con
  `shared` false né il sonno di un post con `sleep_shown` false;
  esportazione e cancellazione dell'account coprono `sleep_nights`.
- [x] B1b: il disegno visto porta `sleep` solo con `sleep_shown` acceso,
  la stessa regola di `GET /drawings/{id}/sleep` per chi non è l'autore,
  in ogni lista che usa `_seen`; coi test per chi non è l'autore, per chi
  non vede il post e attraverso un blocco; nessuna migrazione.
- [x] B2: a fine attività «Sleep last night» in vista sopra «Save», che
  parte da `SLEEP_SHOWN_DEFAULT`; la riga nel Feed e la scheda nella
  pagina del post dal campo `sleep`, senza richieste in più; i testi
  approvati nelle quattro lingue; test deterministici, `tsc`, ESLint e
  Prettier puliti.
- [x] B2: **niente in `main` legge Salute**: `sleepReader()` risponde null,
  nessun `require` della libreria, nessuna richiesta di permesso, col test
  che lo blocca; `SLEEP_POSTS_ON` è `false` e con lui spento niente si
  vede; `app.json` non toccato, impronta iOS ferma.
- [x] B2: **al server solo quello che si pubblica**: la notte parte solo
  con l'interruttore acceso e un post che altri vedono, coi test (`RunEnd`
  e la coda).
- [x] B2b: «Sleep last night» a fine allenamento in palestra e a fine
  nuoto in vasca, con le regole di B2 (parte acceso, solo con un post che
  altri vedono, nessun permesso chiesto); la notte parte dopo l'attività,
  mai prima.
- [x] B2b: con `SLEEP_POSTS_ON` spento `GymEnd` e `PoolSwimEnd` si
  disegnano esattamente come prima e le due code non mandano niente sul
  sonno, coi test; nessun file nativo, `sleepModules.test.ts` invariato.
- [x] B3: sul proprio profilo la scheda «Sleep» (il sì al tocco, la
  notte, «Share» con la conferma la prima volta, «Stop sharing»); sul
  profilo di un altro l'ultima notte condivisa; i testi approvati e le
  risposte 8 e 9, nelle quattro lingue; test deterministici, `tsc`, ESLint
  e Prettier puliti.
- [x] B3: **chi non è l'autore non vede mai una notte non condivisa**: il
  profilo di un altro mostra solo quello che `GET /users/{id}/sleep` dà, e
  un `404` non mostra niente (coi test); niente lascia il telefono prima di
  «Share».
- [x] B3: con `SLEEP_POSTS_ON` spento `ProfileHome` e `UserProfilePage` si
  disegnano esattamente come prima e non parte nessuna richiesta sul
  sonno, coi test; `SLEEP_POSTS_ON` resta `false`, nessun lettore, nessun
  file nativo, `sleepModules.test.ts` invariato.
- [x] E1: il post del sonno sul server e nel contratto, coi test (28): uno
  per notte, mai «Only me», pubblicato appena nasce; lo riceve solo
  un'app che legge `sleep`; la notte resta sul server solo finché
  qualcosa la pubblica; nessun orario.
- [x] E2: la voce «Sleep» nel «+», la pagina con «Publish», la scheda nel
  Feed e la pagina del post; con `SLEEP_POSTS_ON` spento niente si vede e
  l'app non dice `sleep`, coi test.
- [ ] Parti C, D: criteri scritti qui quando partono.

## File toccati (documenti, questa PR)

- `docs/tasks/TASK-467.md` (nuovo)
- `docs/STATUS.md` (la voce di TASK-467, solo righe aggiunte)
- `docs/INDEX.md` (una riga)

## Fuori scope

- Leggere il punteggio di Apple (non c'è l'API).
- Consigli sul sonno, sveglie, obiettivi.
- Il sonno da orologi che non scrivono in Salute.

## Esito

- **2026-11-11**: parte 0 chiusa in una sessione (sette risposte più la
  6b). Numero dal Coordinatore; nessun codice, nessun ADR ancora.
- **2026-11-12**: parte 0 in `main` (#1182). Parte A scritta: il calcolo
  sul telefono, ADR-0379 (#1193, in `main` lo stesso giorno). Studio della
  parte B, taglio B1/B2/B3 e strada `sleep_nights` dal Coordinatore;
  l'utente: «Resta acceso» (il sonno nel post dell'attività) e «Sì,
  profilo adesso» (la notte da sola). B1 parte in un contesto pulito.
- **2026-11-12, B1**: scritta in una sessione, #1211 (migrazione `0072`,
  `sleep.py`, contratto, 42 test). Restano: il merge del Coordinatore, la
  PR di soli documenti (ADR-0380, `STATUS.md`), il server. Sul server B1
  non va da sola: arriva col passo dell'aggiornamento completo, che il
  Coordinatore compone e per cui chiede lui il sì all'utente (`main` ha già
  le parole a penna alzata di Explore, che escono solo con la loro OTA). Il
  testo nuovo del primo «Share» è approvato («Approvo così», 2026-11-12).
- **2026-11-12, B1 in `main`**: #1211 unita dal Coordinatore a CI verde
  (`71e24188`); ADR-0380 in `DECISIONS.md`. La `0072` va sul server col
  passo dell'aggiornamento completo; i controlli di sola lettura sono in
  `out/TASK-467/SERVER-B1.md`. B1b e B2 le scrive una sessione a parte:
  B1b è il campo `sleep` nel disegno visto (riga del Feed, liste,
  dettaglio), solo quando il sonno è mostrato, in `drawings.py`.
- **2026-11-12, B1b**: #1211 in `main` (`71e24188`). Scritta la B1b, il
  campo `sleep` nel disegno visto, perché il Feed non faccia una richiesta
  per riga. Restano: il merge del Coordinatore e il passo sul server dopo
  quello dell'aggiornamento completo, col sì dell'utente. Poi B2.
- **2026-11-12, B2**: #1227 (B1b) in `main` (`3c513355`). Scritta B2:
  l'interruttore a fine attività, la coda, la riga nel Feed, la scheda nella
  pagina del post, l'interruttore nelle impostazioni del post, i testi in
  quattro lingue; tutto spento da `SLEEP_POSTS_ON`. Restano: il merge del
  Coordinatore, la PR di soli documenti (le scelte di B1b e B2), il server
  di B1b col sì dell'utente, la prova nel simulatore al turno; poi B2b e B3.
- **2026-11-12, B1 sul server**: passo 10 alle 12:20Z, server a `1eb3e5a8`,
  `0072_sleep_nights` applicata, nessun Traceback. Controlli di
  `out/TASK-467/SERVER-B1.md` come attesi: `runs.sleep_shown` true e
  `sleep_nights.shared` false, le due chiavi esterne (SET NULL, CASCADE), i
  due trigger, i tre indici, `sleep_nights` vuota, `runs` 12|0|0, le cinque
  rotte del sonno `401` senza token. Nessuna app usa ancora queste rotte.
- **2026-11-12, B2 in `main`**: #1236 unita dal Coordinatore a CI verde
  (`627767a5`), impronta iOS ferma a `6f8bba4c`. Resta spenta
  (`SLEEP_POSTS_ON = false`): non è nell'OTA 12, va nel prossimo e comunque
  non si vede. Le scelte tecniche di B1b e B2 sono in `DECISIONS.md`,
  «ADR-0380, precisazione B1b/B2». Restano: B1b sul server col passo dopo
  quello dell'aggiornamento completo (col sì dell'utente; controlli in
  `out/TASK-467/SERVER-B1b.md`), la prova nel simulatore al turno, poi B2b
  (palestra e vasca: lista dei file al Coordinatore), B3, C, D.
- **2026-11-12, B2b**: scritta la B2b (#1244): l'interruttore a fine
  palestra e a fine vasca, la coda che aspetta anche loro; spenta come B2.
  Restano: il merge del Coordinatore, B1b sul server col passo dopo quello
  dell'aggiornamento completo, la prova nel simulatore al turno; poi B3.
- **2026-11-12, B2b in `main`**: #1244 unita dal Coordinatore a CI verde
  (`bb3d3457`), spenta; le scelte in `DECISIONS.md`, «ADR-0380,
  precisazione B2b». Restano: B1b sul server col passo dopo quello
  dell'aggiornamento completo (col sì dell'utente), la prova nel simulatore
  al turno. Prossima **B3**, la scheda «Sleep» del profilo, in una sessione
  nuova: parte da «Da sapere per B2b, B3 e C» e manda prima la lista dei
  file al Coordinatore (`profile/**` è di TASK-457 finché non lo libera).
- **2026-11-12, B3**: scritta la B3 in una sessione nuova: la scheda
  «Sleep» sul proprio profilo e l'ultima notte condivisa su quello di un
  altro, spente come B2. Due scelte dell'utente (risposte 8 e 9): «Stop
  sharing» con la riga «On your profile», e il giorno della notte accanto
  a «Sleep score». Nessun codice sul server. Restano: il merge del
  Coordinatore, la PR di soli documenti («ADR-0380, precisazione B3», la
  riga di `STATUS.md`), B1b sul server, la prova nel simulatore; poi C.
- **2026-11-12, B3 in `main`**: #1292 unita dal Coordinatore a CI verde
  (`b6e36fcb`), spenta; le scelte in `DECISIONS.md`, «ADR-0380,
  precisazione B3».
- **2026-11-21, C avviata**: l'utente non vede ancora il sonno e sceglie la
  build di prova sul suo iPhone. Scritti il lettore vero di Apple Salute e
  l'accensione in un branch a parte (bozza #1334, da non unire), lanciata
  la build EAS `c9dc5e44` col profilo `preview-sleep`. Restano: la prova
  dell'utente e quello che chiede di cambiare, poi privacy, «App Privacy»,
  note di revisione e la build nativa, ognuna col suo sì.
- **2026-11-21, la prova sul telefono**: installata la build `233f0c6a`
  (la prima, `c9dc5e44`, era caduta sul profilo ad hoc senza HealthKit,
  rifatto con l'accesso Apple dell'utente). Sul profilo il pulsante c'è
  («Compare») e dopo il tocco la notte si legge da Apple Salute («Sì, col
  punteggio»): la condizione della C per la scheda del profilo è
  soddisfatta. Non ancora provati: «Share», «Sleep last night» a fine
  attività, il sonno nel post. L'utente chiede il post del sonno da solo
  nel Feed e il «+» con tutte le voci: risposte 10–12 e «Parte E — il
  piano».
- **2026-11-21, E1 in `main`**: #1373 unita dal Coordinatore a CI verde
  (`f38b1980`), migrazione `0082` (la `0081` è di TASK-484 A, entrata
  prima). Le scelte in `DECISIONS.md`, «ADR-0380, precisazione E». Il
  «+» con tutte le voci è TASK-481. Restano: il passo 17 sul server col sì
  dell'utente, gli agganci di E2 dopo TASK-312 C2 e TASK-481 A, una build
  di prova nuova per vederlo sul telefono; poi la C.
- **2026-11-22**: la frase della privacy approvata dall'utente e messa
  sulla bozza #1334, con le pagine del sito rigenerate nel repository; la
  bozza è verde con la costante accesa. **E1 sul server** (passo 17,
  `40789324`). E2: scritti anche la riga del Feed, la pagina del post e la
  tessera del profilo, file nuovi senza PR; gli agganci, elencati in
  «Parte E2», aspettano ancora TASK-312 C2 (bozza #1386) e TASK-481 A.
- **2026-11-23, E2 in `main`**: in due tempi, col sì del Coordinatore.
  Tempo 1 (#1419, `d0b89470`, dopo TASK-312 C2, TASK-485 B e TASK-481 A):
  l'app dice `sleep` in `X-MuW-Reads` solo con l'interruttore acceso; la
  riga del Feed, la pagina del post col proprio «Remove post», la tessera
  nella griglia di un profilo, niente «Share» né «Imported» su un post del
  sonno. Tempo 2 (#1441, `57e4d4b4`): la voce «Sleep» del «+», quarta dopo
  «From a file», che apre la pagina nello stesso foglio; la pagina non ha
  più un titolo suo (è quello del foglio) e dopo «Publish» o «Remove
  post» le schede del Feed rileggono. L'esempio condiviso della riga del
  Feed è `fixtures/feed-sleep.json` (#1395). Tutto spento in `main`:
  `SLEEP_POSTS_ON` falso e nessun lettore, quindi il «+» e il Feed sono
  quelli di prima. Restano: le traduzioni dei cinque testi della parte E
  da far vedere all'utente con la build di prova, prima di accendere; la
  build di prova nuova (prima l'impronta su copia pulita, al turno del
  Coordinatore, che chiede lui il sì all'utente per l'aggiornamento o la
  build); poi la C. Il testo unico del permesso di Salute per 467 C, 489
  C2 e 312 D lo raccoglie TASK-312 D e lo porta all'utente: fino al suo sì
  sulla bozza #1334 resta la frase approvata per il sonno.
- **2026-11-23, bozza #1334 con E2**: `main` (con #1419 e #1441) unito
  nella bozza del sonno acceso, senza conflitti. Tre test toccati solo
  qui, perché con la costante accesa l'app dice `sleep`:
  `api/reads.test.ts` (la lista di prima, con l'interruttore finto
  spento), `api/accounts.test.ts` (l'intestazione con `sleep`),
  `health/sleepModules.test.ts` (il permesso si chiede in due posti: la
  pagina «Sleep» del «+» e la scheda del profilo). **Al taglio della C**:
  `this_app` di `fixtures/reads.json` prende `sleep`, con
  `services/api/tests/test_reads.py`, `shared-types/test/sleepPost.test.ts`
  e i tre test qui sopra. La build di prova `233f0c6a` ha runtime
  `exposdk:57.0.0` sul canale `preview-sleep`, lo stesso di `app.json`:
  un `eas update` su quel canale la raggiunge senza una build nuova.

- **2026-11-23, parte C0 — il sonno acceso solo sulla build di prova.**
  Scelta del Coordinatore, al posto dell'aggiornamento sulla build
  `233f0c6a`: la build di prova nuova da `main` la sostituisce sul
  telefono, quindi il sonno deve arrivare da `main`. `sleepPostsOn()` è
  `SLEEP_POSTS_ON || isPreview()` (`src/updates/channel.ts`, il canale
  `preview` di EAS Update, come per TASK-351): sugli store il canale è
  `production` e la costante resta falsa, quindi lì niente si vede, il
  lettore è `null` e la libreria di Salute non viene nemmeno cercata;
  in Expo Go il canale è `null`. Sul canale `preview` il lettore è quello
  vero di Apple Salute (`health/appleSleep.ts`, dalla bozza #1334) e l'app
  dice `sleep` in `X-MuW-Reads`. Non con `APP_VARIANT`: non arriva al
  codice dell'app, e passarlo da `app.config.ts` sposterebbe l'impronta
  della build degli store. Niente di nativo cambia (`app.json`,
  `locales/`, `eas.json`, `app.config.ts` intatti). Deciso dall'agente su
  delega dell'utente, con l'ok del Coordinatore all'elenco.
  **Cosa manca alla build di prova rispetto alla C**: il foglio di Apple
  Salute, quando chiede il sonno, mostra la frase di oggi che parla solo
  del battito (la frase nuova è nativa: parte C); la riga di privacy sul
  sonno, nell'app e sul sito, non c'è ancora. La build interna ce l'ha
  solo l'utente; le due cose gliele dice il Coordinatore prima della
  prova. Restano alla parte C, sulla bozza #1334: la frase del permesso
  (quella unica di TASK-312 D, scritta dalla PR di build nativa che
  indica il Coordinatore), la privacy, l'App Privacy, le note di
  revisione, `this_app` di `fixtures/reads.json` e la costante a `true`.
