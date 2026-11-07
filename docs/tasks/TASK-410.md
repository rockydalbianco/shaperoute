# TASK-410 — La pagina del post: più dati e più ordine

**Stato**: Proposta (in attesa delle scelte dell'utente)
**Fase**: 4 · **Branch**: `docs/TASK-410-post-page` (documenti), poi una PR
per parte · numeri dal Coordinatore il 2026-11-06 (TASK-410, ADR-0340)

## Obiettivo

Toccando un post nel Feed si apre una pagina sola, ordinata: in alto il
video dell'attività, sotto i dati in card con un titolo, una per tipo di
dato, e un foglio dal basso con le quattro azioni. Chi guarda il post di
un altro vede gli stessi dati, tranne quelli che l'autore tiene per sé.

## La richiesta (brief del 2026-11-06)

1. **Foto dell'autore** accanto al nome, più grande di oggi, con
   `profile/Avatar.tsx` (foto, o lettera se non c'è).
2. **Video** dell'attività (TASK-351/408) in alto, a tutta larghezza, con
   play e pausa.
3. **Foglio dal basso** con quattro azioni a icona: 👍 Mi piace ·
   💬 Commenta · ↗ Condividi · ✏️ Modifica e corri. Le impostazioni del
   post (visibilità…) dentro il foglio. Riusare `ActionBar`, `SharePost`,
   `drawAgainDoor`.
4. **Sezioni** in card: a) riepilogo (distanza, tempo, passo medio, km più
   veloce, cadenza media, calorie, dislivello positivo); b) meteo; c) tabella
   dei passi, una riga per km (min/km a sinistra, numero del km a destra),
   il più veloce evidenziato, miglia per chi usa le miglia; d) grafico del
   dislivello; e) battito: minimo, medio, massimo, tempo e % per zona a barre
   orizzontali. **Una sezione senza dati non si mostra.** Vale per ogni
   sport, con le sole metriche che hanno senso.

## Com'è oggi (main `758bccd1`, verificato)

- **Nessuna pagina del post.** Toccare un post apre il disegno sulla mappa
  con `social/DrawingCard.tsx` sotto (`App.tsx` ~1486): titolo, giorno,
  foto, descrizione, reazioni, commenti, Start, GPX, «Draw it near me».
  Niente passi, niente grafici.
- **Foto dell'autore**: `FeedPost.tsx` 362-383 disegna una lettera sua, non
  `Avatar`. `GET /feed` e `GET /drawings/{id}` danno dell'autore solo
  `public_id` e `username` (`AuthorBody`, `drawings.py:336`). Il server ha
  già la foto piccola da 128 px (`follows.py` `small_photo`, cache LRU), in
  base64 dentro `PersonBody` per ricerca, messaggi, notifiche. **È la parte B
  di TASK-355** («foto dell'autore, conteggi, skeleton»), non ancora fatta.
- **Video**: si fa solo sul telefono dell'autore (`share/RunVideo.tsx`, una
  WebView con MapLibre e three.js, ~12 s, indipendente dai tempi della
  corsa) e si condivide come file. **Non va mai al server** e l'app **non ha
  un lettore video** (né `expo-video` né `expo-av`).
- **Foglio dal basso**: c'è `ui/SheetModal.tsx` (Modal con molla), usato da
  commenti, segnalazione, filtri. Nessuna libreria di bottom sheet.
- **Impostazioni del post** (`DrawingChoice`: titolo, descrizione, attività,
  tag, visibilità) si cambiano in `RunEnd`, in «My activities»
  (`ActivityCard` `PublicRow`) e nei moduli palestra e piscina.
- **Metriche**:
  - passi per km: `navigation/runMetrics.ts` `splits(track, unitM)`, usato
    solo sullo schermo della corsa (`RunDashboard` `Splits`); miglia con
    `splits(track, metresPer(units))`; il km più veloce si trova in linea;
  - dislivello: `climbM(track)` sul telefono; il server salva `runs.climb_m`
    ma **butta via l'altitudine dei punti**: un profilo non esiste;
  - battito: **non esiste**. TASK-345 B (dai file importati) e C (da Apple
    Salute) lo portano, con `heart_avg_bpm`, `heart_max_bpm`, `heart_shown`;
    le zone ci sono (`body/heartZones.ts`, TASK-374 B), il tempo in zona è
    TASK-374 D;
  - cadenza: **non esiste** da nessuna parte;
  - calorie: `feed/postEnergy.ts` (TASK-345 A) le stima dalla distanza; per
    gli altri con 70 kg fissi; i dati del corpo «restano su questo telefono»
    (testo di TASK-374);
  - il server ha la traccia con i tempi (`runs.track` `LineStringM`): i
    passi per km si possono calcolare lì, **anche per le corse vecchie**.
- **Meteo**: solo `resort_weather.py` (MET Norway Locationforecast, senza
  chiave, CC BY 4.0, `urllib`). **Sono solo previsioni**: MET non ha un
  archivio, quindi il meteo di una corsa passata non si può chiedere dopo.
- **Grafici**: `react-native-svg` **non c'è**; nessun componente grafico.
- **Registro degli sport** (`src/sports/`, TASK-376): nessuna lista di
  metriche per sport; ci sono `pace` (paddle/swim), `onWater`, `isRide()`.

## Proposta

### La pagina

Una pagina a tutto schermo, `feed/PostPage.tsx` (file nuovo), aperta dal
Feed al tocco di un post. Dall'alto:

1. **Intestazione**: foto dell'autore 40 pt (oggi la lettera è 28 pt), nome,
   luogo e giorno; il menu «Segnala» dov'è oggi.
2. **Video** a tutta larghezza, in una finestra **4:5** che mostra il centro
   della scena (il video vero è 9:16, 1080 × 1920: a tutta altezza
   coprirebbe la prima schermata e i dati non si vedrebbero); ⤢ lo apre a
   tutto schermo in 9:16. Prima un fermo immagine (il disegno sulla mappa,
   come la card del Feed) con ▶. Al tocco parte la scena del video **dentro la
   pagina**, nella stessa WebView di TASK-351/408, dalla traccia di
   `GET /drawings/{id}`: niente file da caricare, niente lettore nuovo,
   niente di nativo. Pausa e ripresa al tocco. La WebView si crea solo al
   primo ▶ e si chiude lasciando la pagina.
3. **Titolo e descrizione** del post, poi le **sezioni** (sotto).
4. **Il foglio**: una barra fissa in basso con le quattro icone, sempre
   visibile; trascinata in su (o con la maniglia) si apre e mostra, **solo
   sui propri post**, le impostazioni: visibilità, «Show heart rate»,
   titolo e descrizione. Un componente nuovo (`feed/PostSheet.tsx`) con
   `Animated` e `PanResponder` di React Native: niente librerie.
   - 👍 **Mi piace**: la reazione 👍 di `DrawingReactions`; tenuto premuto,
     le sei reazioni (la scelta 3 di TASK-355).
   - 💬 **Commenta**: apre `DrawingComments` come oggi.
   - ↗ **Condividi**: sui propri post `SharePost` (scelta 5 di TASK-355,
     «Solo i miei»); sui post degli altri l'icona non c'è (da confermare,
     scelta 5 qui sotto).
   - ✏️ **Modifica e corri**: `drawAgainDoor` apre il disegno nella modifica
     di TASK-369 e poi la corsa sullo stesso percorso. Nascosta per neve e
     palestra, come «Draw it near me» oggi.

### Le sezioni

Ogni sezione è una card con un titolo. Si costruisce da una funzione pura
(`feed/postSections.ts`, nuovo, con i test) che dà la lista delle sezioni da
mostrare: **una sezione senza dati non entra nella lista**, e una riga senza
valore non entra nella card (mai «—»).

| Sezione | Dati | Da dove |
|---|---|---|
| Riepilogo | distanza, tempo, passo (o velocità per le bici), km più veloce, cadenza, calorie, dislivello + | campi del post + `stats` (parte C) |
| Meteo | temperatura, condizioni (icona MET), vento | `stats.weather` (parte E) |
| Passi | una riga per km/miglio: tempo a sinistra, numero a destra, barra di lunghezza relativa; il più veloce in `accent` | `stats.splits`, calcolati dal server |
| Dislivello | profilo altitudine/distanza, totale in alto | `stats.elevation` (fino a 120 punti) |
| Battito | min, medio, max; Z1–Z5 a barre orizzontali con tempo e % | `stats.heart` (TASK-345 B/C + zone) |

**Per sport** un file nuovo, `sports/postMetrics.ts`: per ogni sport quali
righe e sezioni hanno senso. Proposta: corsa, camminata, escursione tutte;
bici, gravel, roller velocità al posto del passo, niente cadenza; nuoto e
canoa passo per 100 m / 500 m, niente dislivello; sci niente passi per km;
palestra solo riepilogo e battito.

**Grafici senza librerie**: `react-native-svg` non c'è e aggiungerlo cambia
l'impronta iOS (una build nuova). Il profilo del dislivello si disegna con
colonne sottili di `View` (una per punto, altezza relativa, colore
`textMuted` su `surface`); le zone con barre di `View`. Va con un OTA.

### I dati sul server (parte C)

- **Una tabella nuova `run_stats`** (chiave della corsa, una colonna `jsonb`
  `stats`, `updated_at`), in un modulo nuovo dell'API
  (`shaperoute_api/run_stats.py`). **Non tocca `schemas.py`**, quindi non
  tocca `engine.zip` né il motore (vincolo del Coordinatore).
- **Passi per km**: li calcola il server dalla traccia con i tempi, per le
  corse nuove e, con un backfill (col sì dell'utente), per le vecchie.
- **Profilo del dislivello e cadenza**: li manda il telefono a fine attività
  con `PUT /me/activities/{key}/stats` (il profilo ridotto a 120 punti;
  la cadenza solo quando c'è: file importati con cadenza, orologio). Le corse
  vecchie non li avranno: la sezione non c'è.
- **Battito**: viene da TASK-345 B/C; al riassunto si aggiungono minimo e
  secondi per zona. **Vincolo per TASK-345 B** (Coordinatore, 2026-11-06):
  un posto solo, `run_stats`, niente colonne nuove in `runs`. Chi parte
  prima fra TASK-345 B e la parte C di questo task crea la tabella; l'altro
  ci scrive. La nota nel task file di 345 la passa il Coordinatore.
- **Calorie**: le calcola il telefono dell'autore con i suoi dati
  (`body/energy.ts`) e manda solo il numero; per chi guarda vale la regola
  di privacy della scelta 2.
- `GET /drawings/{id}` restituisce `stats`, **già filtrato dal server**
  secondo le scelte dell'autore (il battito solo se `heart_shown`, ecc.).
  `GET /feed` non lo manda: la card resta leggera.

### Il meteo (parte E)

MET Norway non ha un archivio. Proposta: **quando la corsa si salva entro
3 ore dalla fine**, il server chiede a MET l'ora dell'attività (temperatura,
simbolo, vento) nel punto di partenza arrotondato a ~1 km, con lo stesso
trasporto di `resort_weather.py`, e lo salva in `stats.weather`. Corse
importate o salvate più tardi: niente meteo, e la sezione non c'è. Un
archivio storico (Open-Meteo) sarebbe un fornitore nuovo, gratuito solo per
uso non commerciale: sconsigliato. Credito «MET Norway» sotto la card.

### Le corse vecchie

La pagina funziona con i soli campi di oggi: intestazione, video, titolo e
riepilogo con distanza, tempo, passo, calorie stimate. Il resto appare
quando c'è.

## Le parti (una PR ciascuna)

- **A — Foto dell'autore** (server + app): è TASK-355 B (scelta 1). Il
  server aggiunge `photo_url` all'autore in `GET /feed` e
  `GET /drawings/{id}`, un URL della foto da 128 px con versione
  (`/people/{id}/photo?v=…`, cache HTTP), invece del base64 che
  appesantirebbe ogni pagina del Feed; l'app usa `Avatar` (40 pt nella
  pagina, 32 pt nella card).
- **B — La pagina** (solo app, OTA): `PostPage`, il video nella pagina, il
  foglio con le quattro azioni e le impostazioni, il riepilogo con i campi
  di oggi.
- **C — `run_stats`** (server + app): migrazione (primo numero libero al
  merge), `run_stats.py`, passi dal server, `PUT …/stats` a fine attività,
  `stats` filtrato in `GET /drawings/{id}`; backfill dei passi col sì.
- **D — Le sezioni** (solo app, OTA): passi, dislivello, battito e zone,
  `postSections.ts`, `postMetrics.ts`, i grafici a `View`.
- **E — Il meteo** (server + app): MET al salvataggio, la card, il credito,
  la riga della privacy.

Ordine: A e B in parallelo (file diversi), poi C, poi D ed E. Server, OTA e
testi di privacy col sì dell'utente.

## Scelte dell'utente (una alla volta, con la proposta)

1. **La foto dell'autore**: resta TASK-355 B (proposta), o si chiude dentro
   TASK-410 con una riga qui?
   **Risposta dell'utente (2026-11-06): «Resta TASK-355 B».** La parte A di
   questo task è TASK-355 B, con il suo task file; qui non si duplica.
2. **Battito e calorie degli altri**: il 2026-10-29 l'utente ha scelto per
   il battito «On, publisher can hide» (TASK-345); il brief propone «solo
   l'autore, a meno che non scelga di mostrarli». Proposta: tenere la scelta
   del 29, estesa a tutta la sezione battito (min, medio, max, zone) e alle
   calorie calcolate col suo corpo.
   **Risposta dell'utente (2026-11-07): «Visibili, nascondibili».** Resta la
   regola del 2026-10-29: battito (min, medio, max, zone) e calorie si vedono
   nei post degli altri; l'autore li spegne con «Show heart rate» nel foglio.
   Il filtro è nel server: un dato spento non arriva al telefono di chi
   guarda.
3. **Il video per chi guarda**: la scena giocata nella pagina dalla traccia,
   con l'aspetto standard (proposta), o il file vero dell'autore caricato sul
   server (serve un lettore nativo: build 1.0.3)?
   **Risposta dell'utente (2026-11-07): «File vero caricato».** È il lavoro di
   TASK-336 (ADR-0292): caricare il video della corsa nel post (parte A, API)
   e mostrarlo con `expo-video` (parte C), dipendenza già approvata
   dall'utente il 2026-10-29 («expo-video in 1.0.2»), che ora va con la
   build nativa dopo la 1.0.2 (TASK-407). Qui non si duplica: la pagina usa
   il lettore e il file di TASK-336. Senza video caricato (post vecchi, o
   l'autore non l'ha messo) in alto c'è il disegno sulla mappa, fermo, senza
   ▶. La parte B esce prima con un OTA, col disegno fermo; il video compare
   quando c'è TASK-336 C nella build.
4. **Il meteo**: MET al salvataggio, solo per le corse salvate entro 3 ore
   (proposta), con la riga della privacy («il punto di partenza, arrotondato
   a ~1 km, va a MET Norway per il meteo»).
   **Risposta dell'utente (2026-11-07): «Sì, MET entro 3 ore».** Niente
   archivio storico. Il testo esatto della riga della privacy, nelle cinque
   lingue, va all'utente prima del merge della parte E.
5. **Il foglio**: barra fissa con le quattro icone, impostazioni trascinando
   in su; 👍 = reazione 👍; «Condividi» solo sui propri post (proposta).
6. **I testi** delle sezioni e delle righe nelle cinque lingue, prima del
   merge di B e D.

## Criteri di accettazione

- [ ] La pagina si apre dal Feed e funziona con un post senza `stats`.
- [ ] Una sezione senza dati non c'è; una riga senza valore non c'è.
- [ ] La tabella dei passi: una riga per km (o miglio), il più veloce
      evidenziato, l'ultimo km parziale indicato come tale.
- [ ] Le % per zona sommano a 100 (arrotondate) e si calcolano dai secondi.
- [ ] Foto se c'è, lettera se no, nel Feed e nella pagina.
- [ ] Colori solo da `tokens.ts`; testi con i18n nelle cinque lingue.
- [ ] Niente dipendenze nuove; `schemas.py` e `engine.zip` intatti.
- [ ] Test deterministici: tabella dei km, % per zona, sezioni che
      spariscono, foto/lettera.
- [ ] Provato sul simulatore con un post con tutti i dati e uno senza.

## File toccati

Questa PR (documenti):

```
docs/tasks/TASK-410.md   (nuovo)
docs/DECISIONS.md        (ADR-0340, Proposto)
docs/STATUS.md           (una riga)
docs/INDEX.md            (una riga)
```

Le parti elencano i loro file quando partono.

## Fuori scope

- Il battito in tempo reale e l'app dell'orologio (TASK-370).
- Leggere il battito da Apple Salute (TASK-345 C) e il tempo in zona a fine
  corsa sullo schermo della corsa (TASK-374 D).
- Caricare il video e il lettore: sono TASK-336 (scelta 3).
- La card del Feed: resta com'è, salvo la foto (parte A).
- Un punteggio o una «precisione» (ADR-0207, nessun punteggio).

## Bozza visiva

Canvas privato, quattro tavole (cima della pagina; le sezioni; il foglio
aperto su un proprio post; un post vecchio di un altro, senza `stats`):
https://claude.ai/artifact/AoKBE6wBXbbzvZvndRERk9

## Esito

*(a fine task)*
