# TASK-305 — Parapendio: proposta e prova di fattibilità

**Stato**: In lavorazione · parti R (la registrazione in volo, ADR-0375):
PR di documenti, poi R1 → R2 → R3. Le parti del pianificatore (A1…F)
restano Proposte: partono dopo le tre condizioni dello studio (licenza
degli spazi aerei, decolli scelti, parere legale)
**Fase**: 5 · **Branch**: `docs/TASK-305-paragliding-proposal` (studio),
`docs/TASK-305-r-recording` (le parti R); il codice
`feat/TASK-305-r1-paragliding-api` e così via
**Dipende da**: nulla per le parti R. Le parti del pianificatore dipendono
da scelte dell'utente (in fondo) e da due licenze da sciogliere (spazi
aerei, decolli).
**ADR**: ADR-0265 (proposto, il pianificatore), ADR-0375 (le parti R)

## Obiettivo

Dire con numeri, non a parole, se MuW può avere lo sport «Paragliding»: il
pilota sceglie un decollo, l'app propone una forma che sta nel cono di
planata fra il decollo e il suo atterraggio ufficiale, fuori dagli spazi
aerei e lontano dai centri abitati, la esporta allo strumento di volo e,
dopo l'atterraggio, importa la traccia per mostrare il disegno nel Feed.
Lo studio è `out/TASK-305/studio.md` del Mac (`out/` è ignorato da git),
con gli script e la pagina a griglia `paragliding-samples-grid.html`.

## Contesto

L'utente il 2026-10-26: aggiungere lo sport «Parapendio»: lo si sceglie e
l'app si adatta al volo, e il pilota disegna la forma nel cielo con la sua
traccia. `PRODUCT.md` e `ROADMAP.md` (Fase 5) dicono da sempre che il
parapendio «ha un modello di percorso diverso e va riprogettato, non
adattato». Le condizioni del Coordinatore: la sicurezza prima di tutto (cosa
l'app non deve mai fare); da dove vengono i dati delle zone e cosa dicono
le regole; il motore resta sulle strade, un motore per termiche e
traiettorie è un costo a parte; se non si può fare bene, lo studio dice
«non conviene».

## Scelte dell'utente (2026-10-26)

- **La prima versione**: «continua con il parapendio, secondo me è una
  bella idea; non facciamo da navigatore, diamo solo la tratta e facciamo
  sì che la gente possa caricare la loro volata». Quindi: pianificazione,
  export allo strumento di volo, import della traccia dopo l'atterraggio;
  **nessuna guida in volo** e nessuna schermata di volo (la parte G esce
  dal piano).

## Scelte dell'utente (2026-10-27)

- **Dove si vede**: «mostra Paragliding in Settings adesso con «Soon»,
  come la canoa». La riga c'è da subito, non si può scegliere, e la accende
  la parte D1 (proposta era: nascosto finché non è pronto). È la parte D0
  qui sotto, l'unica che non aspetta le tre condizioni del verdetto.
- **Il nome**: «Paragliding» 🪂 nell'interfaccia; **Parapendio** in
  italiano, **Gleitschirmfliegen** in tedesco, **Parapente** in francese e
  in spagnolo.
- **L'avviso di sicurezza**, approvato com'era proposto: compare la prima
  volta, prima di pianificare un volo su quel telefono (come la canoa):

  > **Before you fly**
  > - MuW is not a flight instrument. The shape is a plan made on the
  >   ground, in still air, with a glide ratio of 8 and 300 m over the
  >   terrain. The sky on the day is yours to judge.
  > - Check the wind, the airspace, the NOTAMs and the site rules yourself.
  >   MuW's data has a date; the sky does not.
  > - Fly it only if you hold a valid licence and insurance, in VMC,
  >   outside controlled and forbidden airspace, away from towns and
  >   crowds.
  > - Load the shape into your flight instrument. MuW does not guide you in
  >   the air.
  >
  > «I understand» · «Not now»

  E su ogni risultato, sempre visibile, con la data dei dati degli spazi
  aerei:

  > Still air, glide 8, 300 m over the ground. Check the wind, the airspace
  > and the NOTAMs yourself.

  Le traduzioni nelle altre lingue si fanno con la parte D1 e si fanno
  approvare all'utente.

## Scelte dell'utente (2026-11-11)

- **La registrazione prima del pianificatore**: «per il parapendio continua
  lo sviluppo ma lavora sulla registrazione: un mio amico fa la gara e vuole
  condividerci la posizione, la velocità, i battiti, le calorie in tempo
  reale più tracciare il tutto». Il parapendio si accende come sport
  «Record only» (TASK-375, ADR-0319), come lo sci e lo scialpinismo: si
  registra il volo, si condivide dal vivo col link di TASK-424, si salva e
  si pubblica. Le parti del pianificatore restano dove sono. Non è una
  guida in volo: l'app registra e mostra numeri, non dice dove andare
  (la scelta del 2026-10-26 resta).
- **I numeri del volo sul link**: «Sì, numeri del volo». Chi guarda il
  link vede, oltre a posizione, traccia, distanza, tempo, battito e
  calorie, anche **la quota, il variometro (m/s), la velocità del momento,
  la quota massima e il tempo di volo**. Servono un passo sul server e la
  copia del sito, ognuno col sì dell'utente.

## Il punto, in breve

- **Il modello**: niente strade, il cono di planata. Da ogni punto della
  forma l'atterraggio deve restare raggiungibile con 300 m sopra il
  terreno, efficienza 8, aria calma. Il motore decide dove e quanto grande;
  l'AI interpreta soltanto. Il motore resta una libreria senza rete:
  terreno, spazi aerei, centri abitati e decolli entrano come file.
- **I numeri** (`studio.md` §1): in aria calma il cuore più grande è di
  **2,8 km al Monte Baldo** (1667 m di dislivello), **1,2 km al Grappa**
  (1399 m) e **1,0 km alla Panarotta** (1044 m); la stella 2,3 · 1,0 ·
  0,8 km, la M 2,6 · 0,9 · 0,7 km. Con spazi aerei e centri abitati il
  Baldo resta a 2,7 km; il Grappa scende a 0,24 km (la pianura è costruita:
  0,74 km con i 300 m della regola invece dei nostri 500); **alla
  Panarotta non ci sta niente**, perché il file comunitario mette
  l'atterraggio ufficiale di Levico dentro la riserva «Inghiale» (GND –
  1500 ft). Con 15 km/h di vento contro la planata il Grappa e la Panarotta
  non hanno forma, il Baldo scende a 1,6 km. Con una termica fino a 150 m
  sotto la CTA: 6,0 · 2,5 · 4,8 km. Un cuore
  regge 12–16 boe; con il vento conta il raggio di virata (60–80 m di
  errore con 30 m, 90–135 con 50 m): sotto 1,5 km la forma si deforma, da
  2 km si legge. Senza termiche è una planata di 10–20 minuti; con le
  termiche il motore accetta una quota di partenza più alta, non pianifica
  la termica.
- **I dati** (§2): decolli da OSM (incompleti) o da un catalogo con
  licenza; terreno Copernicus; **gli spazi aerei sono il nodo**: la fonte
  aperta più usata non ammette l'uso commerciale, quella ufficiale non è
  in un formato leggibile. **Senza una fonte di spazi aerei che si possa
  spedire nell'app, la parte A3 e la B2 non si fanno, e senza quelle non si
  propone nessuna forma.**
- **La sicurezza** (§3): l'app non dice mai «vola qui», non propone mai un
  punto dentro o sotto uno spazio aereo né sopra un centro abitato, non
  spinge verso il pendio, non conta su una termica, non parla in decollo e
  in atterraggio, non dice «ce la fai», non sostituisce AIP e NOTAM.
  **Nessuna guida in volo** nella prima versione: la fa lo strumento.
- **Gli strumenti** (§4): export come task di boe (XCTrack QR e `.xctsk`,
  `.cup`, `.wpt`), import IGC dopo l'atterraggio.
- **Il costo** (§6): 10–14 sessioni (la schermata di volo è fuori per
  scelta dell'utente); la canoa ne ha prese 15 con una sola fonte di dati
  già nel motore. Qui le fonti sono quattro, due con una licenza da
  sciogliere prima del codice, e serve una prova con un pilota vero.
- **Il verdetto** (§7): conviene a tre condizioni, altrimenti no: una
  fonte di spazi aerei con licenza prima del codice; un elenco di decolli
  scelti a mano dove la forma è ≥ 1,5 km; un parere legale e una prova con
  un pilota e il club prima di pubblicare.

## Le parti R — la registrazione in volo (ADR-0375)

Ordine dal Coordinatore (2026-11-11): questa PR di documenti, poi R1 → R2
→ R3. Ogni parte è un branch e una PR; la lista dei file va al
Coordinatore prima di ogni PR; il merge è suo («#NNNN pronta»). Server,
OTA e sito solo col sì dell'utente, dato al Coordinatore. Il 2026-11-11
l'utente ha deciso: nessun OTA di produzione per due giorni, poi
un'uscita completa.

### R1 — Contratto, API, migrazione

Come TASK-415 A (`23a3c23f`, lo scialpinismo):

1. `paragliding` come attività registrata senza forma: un file nuovo in
   `packages/shared-types/src/sports/` e in
   `services/api/shaperoute_api/sports/` (`record_only=True`; Strava non
   ha il parapendio: `strava_type="Workout"`), le fixture
   `run-activities.json` e `reads.json`, `reads.py` (un'app vecchia non
   riceve i voli che non sa leggere).
2. La migrazione che allarga `runs_activity_check` leggendolo, come 0044:
   `0069_paragliding.sql` (il primo numero libero in main al merge; era
   provvisoriamente 0070).
3. `LiveStatsBody` (`live_shares.py`, `extra="forbid"`) e `LiveStats` di
   `liveShare.ts` prendono quattro campi facoltativi: `alt_m` (quota
   adesso, m, −500…9000), `max_alt_m`, `vario_mps` (m/s, −30…30, un
   decimale) e `speed_mps` (velocità adesso, 0…100). Un'app vecchia non li
   manda; una pagina vecchia non li legge.
4. **Il server prima dell'app e della pagina**: con `extra="forbid"` un
   update coi campi nuovi a un server vecchio prende 422. Il controllo
   dopo il passo sta in `out/TASK-305/SERVER-R1.md`, senza TestClient
   (l'immagine di produzione non ha httpx).

### R2 — App: il volo registrato

1. `paragliding` in `settings/sport.ts` prende la sua attività e diventa
   `ready` e `recordOnly`: «Draw» mostra solo «Record your flight» (il
   testo da approvare); il pianificatore non c'è.
2. I numeri del volo dalla quota dei fix (TASK-324, già nei fix): quota
   adesso, quota massima, variometro su una finestra di 10 s (la quota del
   GPS è rumorosa, un fix solo non basta), velocità del momento dalla
   velocità del fix, tempo di volo. Niente barometro: è un modulo nativo
   nuovo e una dipendenza da chiedere.
3. Le calorie con la formula di C2 di TASK-424 e il MET del volo libero
   del Compendium (3,5, «hang gliding»), in rosso come le altre (C3).
4. L'update dal vivo manda i quattro campi nuovi; la fine del volo mostra
   tempo di volo, distanza, quota massima, dislivello, velocità massima e
   calorie; il post nel Feed ha il tipo `paragliding`.
5. Un avviso breve prima del primo volo registrato su quel telefono, da
   far approvare all'utente; la proposta: «MuW is not a flight
   instrument: it records your flight and shares it. Fly with your own
   instrument, licence and judgement.»

**Testi di R2**, approvati dall'utente il 2026-11-12 (en e it, poi
de/fr/es; «Sì, approvo»). Quota, quota massima e velocità massima usano le
parole che l'app ha già («Altitude», «Max altitude», «Top speed»);
«Vario» è quello di R3.

| en | it | de | fr | es |
|---|---|---|---|---|
| Record your flight | Registra il volo | Flug aufzeichnen | Enregistrer le vol | Registra tu vuelo |
| Before you fly | Prima di volare | Vor dem Flug | Avant de voler | Antes de volar |
| MuW is not a flight instrument: it records your flight and shares it. Fly with your own instrument, licence and judgement. | MuW non è uno strumento di volo: registra il volo e lo condivide. Vola con il tuo strumento, il tuo brevetto e il tuo giudizio. | MuW ist kein Fluginstrument: Es zeichnet deinen Flug auf und teilt ihn. Flieg mit deinem eigenen Instrument, deiner Lizenz und deinem Urteilsvermögen. | MuW n'est pas un instrument de vol : il enregistre votre vol et le partage. Volez avec votre propre instrument, votre licence et votre jugement. | MuW no es un instrumento de vuelo: graba tu vuelo y lo comparte. Vuela con tu propio instrumento, tu licencia y tu criterio. |
| Got it | Ho capito | Verstanden | Compris | Entendido |
| Flight time | Tempo di volo | Flugzeit | Temps de vol | Tiempo de vuelo |

File, a grandi linee (la lista vera al Coordinatore prima della PR, col
turno: `settings/sport.ts`, `sports/**` e `social/PublicParts.tsx` sono
oggi della #1160, poi di TASK-413 B e TASK-463): `settings/sport.ts`, i
file della registrazione libera e dei dati dal vivo, `src/air/` (nuovi),
le lingue, i test.

**Il battito dal vivo viene solo dall'orologio** (TASK-424, ADR-0352): il
telefono non lo misura. La build 1.1.0 dell'orologio (in revisione da
Apple) non ha il parapendio nel suo `sports.json`, quindi un volo avviato
dal telefono non parte al polso. Il battito in tempo reale chiede una
parte in più (R4: il parapendio nell'app dell'orologio, codice nativo,
una build nuova dopo la 1.1), da proporre all'utente.

### R3 — La pagina del link

`site/live/`: per l'attività `paragliding` la pagina mostra quota,
variometro (sale/scende), velocità del momento, quota massima e tempo di
volo, nelle cinque lingue; le altre attività come oggi. La copia sul sito
è una pubblicazione: col sì dell'utente, dal Coordinatore
(`out/coordinatore/sito.sh <sha>`).

I numeri, dopo distanza e tempo: velocità del momento (la media se l'app
è di prima), quota, variometro col segno (+ sale, − scende; m/s, ft/min
in miglia), quota massima, poi dislivello, calorie e battito come per le
altre attività.

**Testi di R3** (le tre etichette nuove; le altre sono quelle approvate di
TASK-424). **Approvati dall'utente il 2026-11-12**: en e it («Sì,
approvo»), poi de/fr/es («Sì, approvo»), con le parole che l'app ha già
per quota e quota massima.

| lingua | quota | variometro | quota massima |
|---|---|---|---|
| en | Altitude | Vario | Max altitude |
| it | Quota | Variometro | Quota massima |
| de | Höhe | Vario | Max. Höhe |
| fr | Altitude | Vario | Alt. max |
| es | Altitud | Variómetro | Alt. máx. |

### R4 — Il volo sull'orologio, per il battito dal vivo

Scelta dell'utente (2026-11-12): «si ok continua anche per il battito».
Il battito dal vivo viene solo dall'orologio (TASK-424, ADR-0352), quindi
il volo deve essere uno sport dell'orologio.

1. `paragliding` esce da `NOT_ON_WATCH` (`src/watch/watchSports.ts`):
   l'orologio lo offre col tipo Apple `.other` (3000), all'aperto col GPS,
   senza percorso da seguire. `sports.json` si riscrive con
   `scripts/watch-sports.sh`.
2. `WatchWakeTests.swift`: il tipo 3000 sveglia il volo; per «nessuno
   sport» il test usa un tipo che MuW non ha (1, football americano).
3. **Cosa NON c'è al polso**: quota, quota massima e variometro restano sul
   telefono. L'orologio mostra quello che mostra per gli altri sport senza
   percorso: tempo, distanza, passo e battito. Il battito va al telefono e
   da lì al link, come per la corsa.

**Quando esce** (Coordinatore, 2026-11-12): la PR resta in bozza e fuori da
`main` fino alla build dell'orologio dopo la 1.1.0. Via OTA il telefono
sveglierebbe un orologio 1.1.0, che non conosce il volo: il volo non
partirebbe al polso e chi vola aspetterebbe un battito che non arriva.
Senza R4 il telefono non prova nemmeno a svegliarlo. Entra in `main`
quando il Coordinatore prepara quella build, insieme alle altre cose
dell'orologio rimaste indietro.

File: `apps/mobile/src/watch/watchSports.ts` e `watchSports.test.ts`,
`apps/mobile/targets/watch/Core/Sources/WatchCore/Resources/sports.json`,
`apps/mobile/targets/watch/Core/Tests/WatchCoreTests/WatchWakeTests.swift`,
`docs/tasks/TASK-305.md`.

## Cosa fare (se l'utente decide di sì)

Parti piccole, una sessione per parte, nell'ordine. Ogni parte è un branch
e una PR. I file sono quasi tutti **nuovi**: nessuna parte tocca i file
delle strade e dell'acqua.

### A1 — Motore: il cono sul terreno

1. Un pacchetto nuovo `route_engine/air/` con `cone.py`: griglia di
   terreno in metri sul piano tangente, Dijkstra in avanti dal decollo e
   all'indietro dall'atterraggio, 300 m sopra il terreno (nessun margine
   nei primi 300 m dal decollo, 100 m sopra il campo all'arrivo), vento
   come correzione della deriva. Niente rete.
2. Fixture sintetiche (un pendio, una valle, una collina) e test
   deterministici: il cono è vuoto senza quota, cresce con la quota, si
   sposta sottovento, non entra sotto il margine.

Criteri: dalla CLI, senza rete e senza chiavi, sulle fixture, il cono dei
tre siti dello studio (terreno in `tests/fixtures/`) ha l'area che lo
studio misura, ±5 %.

File: `services/route-engine/route_engine/air/__init__.py`,
`services/route-engine/route_engine/air/cone.py`,
`services/route-engine/tests/test_air_cone.py`,
`services/route-engine/tests/fixtures/air_*.npz`, `docs/ROUTE_ENGINE.md`
(§9 nuovo).

### A2 — Motore: dove la forma ci sta, le boe, la planata

1. `air/fit.py`: la forma più larga del catalogo (e una lettera) che sta
   nel cono, scale decrescenti e bisezione, inclinazione entro ±30°, punto
   d'ingresso; il percorso decollo → forma → atterraggio; la quota prevista
   lungo la forma e la riserva.
2. `air/task.py`: la forma come boe (12–16 per un cuore, i vertici per
   stella e lettere; raggio 30–50 m), con i tipi `TAKEOFF`, `SSS`, `ESS`.
3. `RouteRequest` con `activity="paragliding"` e i campi `takeoff`,
   `landing` (coordinate e quota); `RouteResult` con le boe e i numeri;
   `--activity paragliding --takeoff --landing --dem` nella CLI.
4. Rifiuta: parole di più lettere, immagini, forme a pezzi, `near`,
   `nearby`, una distanza (la grandezza la decide il cono).

Criteri: sui tre siti dello studio, dalla CLI senza rete, la forma più
larga di ogni tipo con le misure dello studio ±5 %; nessun punto della
forma sotto `h_req`; i test della corsa, della bici e della canoa passano
senza modifiche ai valori.

File: `services/route-engine/route_engine/air/fit.py`,
`services/route-engine/route_engine/air/task.py`,
`services/route-engine/route_engine/models.py`,
`services/route-engine/route_engine/__main__.py`,
`services/route-engine/tests/test_air_fit.py`,
`services/route-engine/tests/test_air_cli.py`, `docs/ROUTE_ENGINE.md` §9.

### A3 — Motore: spazi aerei, riserve, centri abitati e vento

1. `air/limits.py`: i poligoni (GeoJSON) con pavimento e soffitto in metri
   AMSL o AGL diventano per cella un soffitto (stare sotto) o un pavimento
   (stare sopra); i centri abitati un pavimento a 500 m; una zona da terra
   al cielo blocca la cella.
2. Il vento come vettore nella richiesta (direzione e forza), già nel
   modello di A1.

Criteri: con una zona sopra la forma di A2 la forma scende o si sposta;
con una riserva sotto il decollo il primo chilometro resta volabile; tutto
senza rete.

File: `services/route-engine/route_engine/air/limits.py`,
`services/route-engine/tests/test_air_limits.py`,
`services/route-engine/tests/fixtures/air_zones.json`.

### B1 — Server: decolli, atterraggi e terreno

1. La tabella `air_sites` (decollo, atterraggio ufficiale, quote, fonte,
   licenza, data) e il comando che la riempie dalla fonte scelta
   (`studio.md` §2: **da decidere con l'utente**, la licenza prima del
   codice).
2. Le mattonelle del terreno (Copernicus GLO-30) per ogni sito, in cache
   sul server come le zone delle città, scaricate da un comando, mai dal
   job.

File: `services/api/shaperoute_api/air_sites.py`,
`services/api/shaperoute_api/air_terrain.py`,
`services/api/migrations/00XX_air_sites.sql` (numero al merge),
`services/api/tests/test_air_sites.py`, `docs/ARIA.md` (nuovo),
`docs/DATABASE.md`.

### B2 — Server: spazi aerei e centri abitati, aggiornamento AIRAC

1. `airspace_cache.py`: lettura della fonte scelta (OpenAir o GeoJSON) in
   poligoni per il motore, con il ciclo AIRAC (28 giorni) e la data; i
   centri abitati OSM attorno a ogni sito.
2. Un lavoro di aggiornamento ogni ciclo; **se i dati sono più vecchi di un
   ciclo, il job rifiuta la richiesta** (errore che lo dice).

File: `services/api/shaperoute_api/airspace_cache.py`,
`services/api/shaperoute_api/air_towns.py`,
`services/api/tests/test_airspace_cache.py`, `docs/ARIA.md`.

### C — API

1. `activity: "paragliding"` in `SUPPORTED_ACTIVITIES` e in
   `shared-types`; la richiesta con `takeoff_id` (o decollo e atterraggio
   espliciti), la forma, la riserva voluta; la risposta con le boe, il cono
   (come immagine o poligono), la quota prevista, i numeri, la data dei dati.
2. `GET /air/sites?near=` per Draw ed Explore.
3. Gli export: `GET /drawings/{id}/task.xctsk`, `.cup`, `.wpt`, e il testo
   del QR di XCTrack.
4. Gli errori nuovi: «no takeoff here», «the shape does not fit in the
   glide», «airspace data too old».

File: `services/api/shaperoute_api/paragliding.py`,
`services/api/shaperoute_api/air_export.py`,
`services/api/shaperoute_api/app.py`, `services/api/shaperoute_api/schemas.py`,
`services/api/shaperoute_api/jobs.py`, `packages/shared-types/src/index.ts`,
`services/api/tests/test_paragliding.py`, `docs/API.md`.

### D0 — App: la riga «Paragliding» con «Soon» in Settings (subito)

Scelta dell'utente del 2026-10-27. Non dipende da licenze né dal motore.

1. In `sport.ts` la voce `{ id: "paragliding", emoji: "🪂", name:
   tLater("Paragliding"), ready: false }`, dopo «Paddle»: «Settings» la
   mostra con «Soon» e non si può scegliere (`canChoose`), come la canoa
   prima di TASK-191 C.
2. `Sport` diventa `"run" | "bike" | "paddle" | "paragliding"`: dove l'app
   elenca tutti gli sport (`Record<Sport, …>`, `switch`) la voce nuova
   prende il valore della corsa o nessuno, mai un percorso; `loadSport`
   continua a dare «run» per uno sport non pronto.
3. Il nome nelle quattro lingue, in fondo ai file: `Paragliding:
   "Parapendio"` (`it.ts`), `"Gleitschirmfliegen"` (`de.ts`),
   `"Parapente"` (`fr.ts`, `es.ts`), scelti dall'utente il 2026-10-27.
4. Test: la riga c'è, dice «Soon», toccarla non cambia lo sport; i test di
   prima passano senza modifiche ai valori.

Criteri: in «Settings → Sport» quattro righe, l'ultima «Paragliding» 🪂 con
«Soon»; nessun altro cambiamento visibile. Solo app, nessun server;
l'impronta nativa iOS non cambia (solo JS).

Condizioni del Coordinatore (2026-10-27): parte dopo il merge della #578
(il nome è scelto); le chiavi nuove in fondo ai file delle lingue;
l'impronta iOS si controlla su una copia pulita; «#NNN pronta» al
Coordinatore, e per il merge serve la parola dell'utente.

**Apple e le voci «Soon».** Alla regola 2.1 (completezza dell'app) Apple
può contestare voci «coming soon» o funzioni che non fanno niente in una
build in revisione. **Non c'è un precedente**: la canoa è stata «Soon» solo
dal 2026-10-02 al 2026-10-03 (da TASK-189 a TASK-191 C), e le due build
della 1.0 viste da Apple (5 da `793fa112`, 7 da `26990fd4`) hanno tutti e
tre gli sport pronti, nessuna riga «Soon». D0 non tocca la 1.0: su
production non va nessuna OTA prima del verdetto. **Prima della build
1.0.1 va deciso** se tenere la riga o nasconderla nelle build per lo store
(proposta: nasconderla nelle build per lo store finché il parapendio non è
pronto, tenerla in `preview`).

File: `apps/mobile/src/settings/sport.ts`,
`apps/mobile/src/settings/sport.test.ts`,
`apps/mobile/src/settings/SportSetting.test.tsx`,
`apps/mobile/src/i18n/it.ts`, `de.ts`, `fr.ts`, `es.ts`, e solo se il tipo
lo chiede i file con un `Record<Sport, …>` (da elencare nella PR).
Aggiunti il 2026-10-28 con l'ok del Coordinatore (solo test: i conteggi
dei «Soon» presi da `SPORTS` salgono di uno):
`apps/mobile/src/settings/SportButton.test.tsx`,
`apps/mobile/src/settings/SportVoiceItalian.test.tsx`,
`apps/mobile/src/profile/SettingsPage.test.tsx`.

**Esito D0** (2026-10-28): fatta nella PR #591 (branch
`feat/TASK-305-d0-soon-row`). «Paragliding» 🪂 è l'ultima riga di
«Settings → Sport», con «Soon», e non si sceglie. Nell'app non c'è nessun
`Record<Sport, …>`; `activityOf` e `withoutRouteLabel` le danno già i
valori della corsa. **Scelta dell'utente del 2026-10-27**: la riga compare
anche nel menu dello sport di «Draw» (`SportButton`, ADR-0165, che mostra
gli sport di «Settings» con i loro «Soon»); `SportButton.tsx` non cambia.
I test che contano le righe «Soon» o i nomi da `SPORTS` salgono di uno:
`sport.test.ts`, `SportSetting.test.tsx` e i tre aggiunti all'elenco
qui sopra, `SportButton.test.tsx`, `SportVoiceItalian.test.tsx`,
`profile/SettingsPage.test.tsx` (solo test). Su una copia pulita, dopo
l'allineamento con `main` (la #576 aveva messo le sue chiavi in fondo alle
lingue): tsc, Prettier, eslint e jest (23 suite, 174 test) verdi, impronta
iOS `83793e26…` invariata. Merge sulla parola dell'utente e il «merge 591»
del Coordinatore.

### D1 — App: lo sport, Draw dai decolli, l'avviso

1. La voce di D0 diventa `ready: true` e prende la sua attività
   (`activityOf`).
2. Con «Paragliding» Draw parte da un decollo (`src/air/TakeoffPicker.tsx`,
   lista dai `GET /air/sites`), non dalla posizione; la distanza sparisce
   e al suo posto c'è la riserva («safer / bigger»); forme del catalogo e
   lettere sole.
3. L'avviso di sicurezza la prima volta, prima di pianificare
   (`src/air/safetyNotice.ts`, come `src/paddle/safetyNotice.ts`), e la riga
   fissa su ogni risultato: i testi inglesi approvati il 2026-10-27
   («Scelte dell'utente»); le traduzioni da far approvare.

File: `apps/mobile/src/settings/sport.ts`, `apps/mobile/src/air/*.tsx`,
`apps/mobile/src/air/safetyNotice.ts`, i file delle lingue in
`apps/mobile/src/i18n/`, `apps/mobile/__tests__/AppParagliding.test.tsx`,
`docs/UI.md`.

### D2 — App: il risultato e l'export

1. La pagina del risultato: la forma, il cono, le boe, i numeri, l'avviso
   fisso con la data dei dati; niente «Start».
2. «Open in XCTrack» (QR a schermo: **serve una libreria QR, da chiedere
   prima**) e «Download task» con lo share sheet.

File: `apps/mobile/src/air/AirResult.tsx`, `apps/mobile/src/air/taskExport.ts`,
`apps/mobile/src/air/*.test.tsx`, `docs/UI.md`.

### E — Import della traccia IGC

1. `src/air/igc.ts`: lettura dei record B (posizione e quota), scarto dei
   record H con nome del pilota e vela; la traccia diventa posizioni come
   quelle di una corsa.
2. «Import IGC» dallo share sheet e da file; il punteggio sulla forma
   (`track_scores`, come per una corsa), il salvataggio in «My activities»
   e la pubblicazione nel Feed con il tipo `paragliding`.

File: `apps/mobile/src/air/igc.ts`, `apps/mobile/src/air/igcImport.ts`,
`apps/mobile/src/air/igc.test.ts`, `services/api/shaperoute_api/track_scores.py`
(solo se il punteggio in aria vuole la quota), `docs/GPX.md`.

### F — Explore con i decolli e il Feed

1. Con «Paragliding» le card di Explore sono i decolli con i loro esempi
   (cuore, stella, lettera), disegnati sul server come oggi
   (`draw_examples.py --air`).
2. Il post nel Feed mostra traccia, forma e quota.

File: `apps/mobile/src/air/AirExplore.tsx`, `apps/mobile/src/explore/ExploreScreen.tsx`,
`services/api/shaperoute_api/draw_examples.py`, `apps/mobile/src/feed/*`
(solo le righe del tipo), test relativi.

### ~~G — La schermata di volo~~

Fuori per scelta dell'utente (2026-10-26): MuW non fa da navigatore.

## Criteri di accettazione dello studio (questa PR)

- [x] Tre decolli reali con il loro atterraggio ufficiale, da OSM.
- [x] Per ognuno il cono di planata in aria calma con efficienza 8 e 300 m
      di margine, e la misura del cuore, della stella e di una lettera che
      ci stanno; gli scenari con vento, margine 150 m, +500 m, termica,
      spazi aerei e centri abitati (`data/results_*.json`).
- [x] Quanti spigoli regge con raggio 30–50 m e vento (`data/fly_sim.json`).
- [x] Le fonti con licenza, aggiornamento e peso; le regole del VDS; gli
      strumenti e i formati (`research_*.md`).
- [x] La pagina a griglia `out/TASK-305/paragliding-samples-grid.html`.
- [x] ADR-0265 in stato «proposto»; righe in `STATUS.md`.
- [x] Le scelte di prodotto dell'utente: la prima versione (2026-10-26),
      la visibilità, il nome e l'avviso (2026-10-27).

## File toccati (questa PR)

```
docs/tasks/TASK-305.md          (nuovo)
docs/DECISIONS.md               (ADR-0265, righe mie)
docs/STATUS.md                  (righe mie)
```

Lo studio, gli script e i dati stanno in `out/TASK-305/` del worktree
`.claude/worktrees/wizardly-knuth-22b876` (git li ignora, come per TASK-297
e TASK-299): **prima di archiviare il worktree vanno copiati in
`out/TASK-305/` del checkout principale**, o si perdono. Si rifanno da
capo con `fetch_dem.py`, `run_study.py`, `fly_sim.py` e `build_grid.py`
(circa 40 minuti, terreno dall'API pubblica di OpenTopoData).

## File toccati (PR di documenti delle parti R)

```
docs/tasks/TASK-305.md          (le parti R, le scelte del 2026-11-11)
docs/DECISIONS.md               (ADR-0375, voce e riga d'indice)
docs/STATUS.md                  (la voce di TASK-305)
docs/INDEX.md                   (una riga: il parapendio registrato)
```

## Fuori scope

- Codice dell'app, del motore o dell'API: niente, nemmeno uno stub.
- Un motore per le termiche, i rotori e le traiettorie: costo a parte, non
  proposto.
- La guida in volo, a voce o a schermo: esclusa dall'utente.
- Dipendenze o fonti nuove: nessuna aggiunta; ogni fonte è una proposta
  con la sua licenza, da scegliere con l'utente.
- Pubblicazioni e merge senza il «merge NNN» del Coordinatore.

## Scelte di prodotto da chiedere all'utente

Una alla volta, ognuna con la proposta pronta (`studio.md`, in fondo):

1. ~~Dove si vede~~ — **decisa** (2026-10-27): in Settings subito, con
   «Soon» (parte D0).
2. ~~Prima versione~~ — **decisa** (2026-10-26): solo la traccia e il
   caricamento del volo, nessun navigatore.
3. ~~L'avviso di sicurezza~~ — **approvato** (2026-10-27) com'era
   proposto, la prima volta prima di pianificare, più la riga fissa su ogni
   risultato.
4. ~~Il nome~~ — **deciso** (2026-10-27): «Paragliding» 🪂; Parapendio,
   Gleitschirmfliegen, Parapente.

## Esito

Proposto il 2026-10-26: lo studio dice che si può fare come pianificatore
(forme di 2–3 km dai decolli con molto dislivello, 1 km dagli altri) e che
il nodo sono i dati degli spazi aerei, non il motore. L'utente ha scelto
la traccia più il caricamento del volo, senza navigatore (2026-10-26), e la
riga in Settings con «Soon» da subito, il nome «Paragliding» e l'avviso di
sicurezza (2026-10-27; la riga è la parte D0). Restano le tre condizioni
del verdetto prima della parte A1 e, prima della build 1.0.1, la scelta se
tenere «Soon» nelle build per lo store.

Il 2026-11-11 l'utente ha chiesto la registrazione in volo con la
condivisione dal vivo, prima del pianificatore: parti R (ADR-0375), da
questa PR di documenti.

**Esito R1** (2026-11-12): PR #1177 in main (83bbbc5d). `paragliding` è
nel contratto come attività «Record only» (Strava «Workout», GPX
`paragliding`), la migrazione `0069_paragliding` allarga solo
`runs_activity_check`, e `LiveStatsBody` prende `alt_m`, `max_alt_m`,
`vario_mps` e `speed_mps`. Nell'app il profilo c'è ma resta nascosto, e
il parapendio è fuori dall'orologio (`NOT_ON_WATCH`: il tipo Apple 3000
«other» è quello che i test dell'orologio usano per uno sport non
offerto); un volo non è una giornata sulla neve (`SNOW_ACTIVITIES` in
`social/PublicParts.tsx`). Server al passo 9 il 2026-11-12 alle 08:38Z
(02214e9b), controlli di `out/TASK-305/SERVER-R1.md` passati. Nota per
R2: `activities/snow.ts` e `sports/postMetrics.ts` trattano ogni attività
«Record only» come neve (niente parziali al km): da rivedere per il volo.

**Esito R3** (2026-11-12): PR #1191 in main (60c801aa). Per `paragliding`
la pagina del link mostra, dopo distanza e tempo, velocità del momento,
quota, variometro col segno (m/s; ft/min in miglia) e quota massima; da
un'app di prima la velocità media. Testi approvati dall'utente («Testi di
R3»). Copia sul sito alle 09:33Z dal Coordinatore col sì dell'utente («Sì,
copia»; quella di prima, e60e0b35, in `/srv/getmuw-site.old`): cambiano
solo `live/texts.js` e `live/view.js`, i cinque file serviti sono uguali al
commit e i controlli di `out/TASK-305/SITO-R3.md` sono passati. Un volo
vero sulla pagina si vedrà dopo l'aggiornamento completo con R2 (#1201).
