# TASK-467 — Il punteggio del sonno MuW, da pubblicare

**Stato**: In lavorazione · parte 0 chiusa l'11 novembre 2026 (le risposte dell'utente, sotto) · nessun codice · poi A, B, C col sì del Coordinatore
**Fase**: 4 · **Branch**: `docs/TASK-467-sleep-score` (documenti)
**Dipende da**: TASK-321 (Apple Salute nell'app, la stessa libreria),
TASK-345 C / TASK-409 B (la lettura del battito: il modello del «leggere
da Salute dopo un tocco»)
**Si incrocia con**: TASK-312 D (studio «leggere da Salute»), TASK-454
(reazioni nel Feed: `src/feed/**`), TASK-321 C (Health Connect), TASK-322
(«Accedi con Apple»: la stessa build nativa, dopo la 1.1.0)
**ADR**: da assegnare dal Coordinatore, con la prima scelta tecnica (parte A)

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

| Dove | Testo |
|---|---|
| Permesso di iOS (`NSHealthShareUsageDescription`, al posto di quello di oggi) | «MuW reads your heart rate during each activity and your sleep from Apple Health, to show them with your activities and in your posts. You can hide them before you publish.» |
| Profilo, scheda «Sleep», prima del sì | pulsante «Show my sleep from Apple Health» · sotto: «MuW works out a sleep score from your Apple Health sleep data.» |
| Scheda «Sleep», con i dati | «Sleep score» · «82 · Very good» · «7 h 40 min» · fasi «Awake», «REM», «Light», «Deep» · pulsante «Share» |
| Sotto il punteggio | «Worked out by MuW from Apple Health data. It can differ from the score in the Health app.» |
| Primo «Share» | «Share your sleep? Your score, hours slept and sleep stages become a post, seen like your other posts.» · «Share» / «Cancel» |
| Post dell'attività, prima di pubblicare | interruttore «Sleep last night» · «82 · Very good · 7 h 40 min» · «Shown in this post. Turn it off to keep it to yourself.» |
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
codice. Prima della parte A: controllare sugli header dell'SDK che il
punteggio di Apple non sia leggibile.

## Criteri di accettazione (parte 0)

- [x] Le scelte di prodotto sono dell'utente e stanno in questo file.
- [x] I testi sono approvati dall'utente (tabella della risposta 7).
- [ ] Parti A–D: criteri scritti qui quando partono.

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
