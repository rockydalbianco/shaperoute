# TASK-233 — «Explore» della canoa come la corsa, e tutti i laghi

**Stato**: Done (2026-10-05) — parte A PR #319 (merge `1dc4bb9`), parte B
in questa PR; l'acqua dei laghi è sul server. Esce con la prossima
pubblicazione, del coordinatore.
**Fase**: 4 · **Branch**: `feat/TASK-233-paddle-lakes`
**Dipende da**: TASK-227 («Explore» con «Paddle», gli esempi dentro
l'app), TASK-225 (l'acqua da un estratto), TASK-230 (i laghi multipoligono)

## Obiettivo

Richiesta dell'utente (2026-10-05): «Migliora la sezione Explore di
Paddle, prendi esempio dalla corsa e fai anche tutti i laghi, tipo vicino a
me c'è il lago di Levico Terme». Con «Paddle», «Explore» ha ogni lago su
cui una forma ci sta, il più vicino per primo, e si usa come quello della
corsa.

## Scelte dell'utente

Una domanda per volta, ognuna con una proposta:

1. **2026-10-05 — le forme più corte sui laghi piccoli**: «sì, vanno bene
   le forme più corte». Un lago che non tiene le forme da 2 km le ha da
   1,5 o da 1 km, viste sui campioni di Toblino, Serraia e Tovel.
2. **2026-10-05 — «Near me» acceso da subito**: «sì, acceso da subito come
   nella corsa». Aprendo «Explore» con «Paddle» e una partenza, la pagina
   mostra il lago più vicino e chiede subito le sue otto forme.
3. **2026-10-05 — i bacini artificiali**: «sì, restano anche i bacini
   artificiali». L'elenco ha laghi e bacini; dove pagaiare è vietato la
   mappa non lo dice, e vale l'avviso di sicurezza del primo «Start».
4. **2026-10-05 — i testi**: «sì, vanno bene così». Visti in inglese e in
   italiano: «Choose a lake or a beach: eight shapes on its water, from the
   shore.» (quella di prima senza «of 2 km»), «Type a lake or a beach», «No
   lake or beach matches “…”.», «… km away» · «a … km». Tedesco, spagnolo e
   francese tradotti allo stesso modo.

## Contesto da leggere

- `docs/tasks/TASK-227.md`, ADR-0189 (le otto forme, gli esempi dentro l'app)
- `docs/tasks/TASK-225.md`, ADR-0187 (`water_extract`, l'acqua sul server)
- `docs/MAPS.md`, «L'acqua da un estratto» e «I laghi di Explore»
- `docs/UI.md`, «Sull'acqua: «Paddle»»
- `apps/mobile/src/explore/ExploreTools.tsx` (il `CityPicker` della corsa)

## Cosa fare

Parte A (questa PR):

1. Un comando che scrive l'elenco dei laghi da un estratto di
   OpenStreetMap, provando ogni punto con il motore.
2. «Explore» con «Paddle» come la corsa: «Near me» acceso, il lago più
   vicino, i laghi vicini da toccare, la ricerca per nome.
3. Campioni veri da far giudicare all'utente (ADR-0036).

Parte B (dopo l'ok dell'utente per il server):

4. L'elenco di tutta l'Italia, dall'estratto dell'Italia che è sul server.
5. L'acqua di ogni lago dell'elenco in `data/cache/water/` del server.
6. Pubblicare l'app solo dopo il punto 5.

## Criteri di accettazione

Parte A:

- [x] Con una partenza a Levico Terme «Near me» è acceso da subito e
      mostra «LAGO DI LEVICO», con le otto forme chieste dal punto
      dell'elenco (test).
- [x] Un lago si trova scrivendone il nome, anche senza accenti (test).
- [x] Un lago piccolo ha le forme alla sua distanza, 1,5 o 1 km (test).
- [x] I quattro luoghi scelti a mano restano com'erano: gli esempi dentro
      l'app, niente chiesto all'API (test).
- [x] Lontano da ogni lago «Near me» disegna dalla partenza, come prima
      (test).
- [x] Ogni punto dell'elenco è stato provato dal motore sull'acqua vera:
      cuore, cerchio e stella ci stanno alla distanza scritta.
- [x] Con «Run» e «Bike» «Explore» è quello di prima; il motore non cambia;
      niente server, niente pubblicazione.

Parte B:

- [x] L'elenco copre l'Italia intera.
- [x] Il server ha l'acqua di ogni lago dell'elenco (provato dentro
      l'API: il cuore e la testa di coniglio sul lago di Levico). Un lago
      scelto nell'app pubblicata è da provare sull'iPhone, dopo la
      pubblicazione.

## File toccati

- `apps/mobile/src/paddle/PaddleExplore.tsx` e `.test.tsx`
- `apps/mobile/src/paddle/waterSpots.ts` e `.test.ts` (nuovi)
- `apps/mobile/src/paddle/lakes.json` (nuovo)
- `apps/mobile/__tests__/AppPaddle.test.tsx` (un test: «Near me» acceso)
- `apps/mobile/src/i18n/{it,de,es,fr}.ts` (tre frasi nuove, una cambiata)
- `services/api/shaperoute_api/lake_catalog.py` (nuovo)
- `services/api/tests/test_lake_catalog.py` (nuovo)
- `docs/tasks/TASK-233.md` (nuovo), `docs/UI.md` (la canoa in «Explore»),
  `docs/MAPS.md` («I laghi di Explore»), `docs/DECISIONS.md` (ADR-0196),
  `docs/STATUS.md` (solo le righe di questo task)

`waterPlaces.ts`, `exampleRoutes.ts`, `paddleExamples.json` e il motore non
cambiano.

## Fuori scope

- Le spiagge del mare oltre Jesolo e Riccione.
- I laghi che OpenStreetMap non segna come lago: il Lago di Ledro è
  `water=pond`, e il motore non ci pagaia (`water.is_lake`). Seguito.
- I laghi fuori dall'Italia, e le rive svizzere di Maggiore e Lugano.
- Forme più grandi di 2 km sui laghi grandi.
- Gli esempi dei laghi dentro l'app: sono disegnati dal server quando si
  sceglie il lago (25 KB a lago: 41 laghi sarebbero già 1 MB).
- Gli occhi staccati sull'acqua negli esempi (TASK-226 B).

## Esito

### 2026-10-05, parte A

**Quanti sono i laghi** (estratto Geofabrik del nord-est, 2026-10-02:
Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia, Emilia-Romagna):

- 29.650 acque `natural=water`, 2.185 con un nome;
- 41 laghi dell'elenco: quelli su cui il motore pagaia, con un nome da
  lago, larghi abbastanza per un cerchio da 1 km a 50 m dalla riva;
- 93 punti della riva (un lago lungo ne ha uno ogni 4 km: il Garda 29, e
  manca la riva lombarda, che è nell'estratto del nord-ovest);
- 16 laghi con le forme da 2 km, 10 da 1,5 km, 15 da 1 km. Nessuno
  scartato dal motore.

**Quanto costa**: l'acqua dei 41 laghi sono 41 file, 12 MB in tutto (il
Garda 4,7 MB, gli altri 0,1–0,6 MB). Provare i 93 punti con il motore: 4
minuti e mezzo sul Mac. Per l'Italia intera la stima è 150–200 laghi,
40–60 MB e 20–30 minuti di prove.

**I campioni**: `out/task233-lakes-samples.html` (fuori dal repository), le
otto forme su Levico, Caldonazzo e Molveno (2 km), Toblino (1,5 km),
Serraia e Tovel (1 km): 48 su 48 ci stanno. Il giudizio è dell'utente.

**Fatto** (ADR-0196):

- `services/api/shaperoute_api/lake_catalog.py` (nuovo): dalle acque di un
  estratto (`osmium export`, un GeoJSON a riga) i laghi, i punti della riva
  e, con `--boxes`, il riquadro d'acqua che serve a ciascuno; con
  `--cache-dir`, ogni punto provato con `plan_water` a 2, 1,5 e 1 km, e
  l'elenco scritto in `lakes.json`. Niente scaricato.
- `apps/mobile/src/paddle/lakes.json` (nuovo): 93 punti di 41 laghi, 7 KB
  senza spazi.
- `waterSpots.ts` (nuovo): i quattro luoghi scelti a mano e l'elenco, senza
  doppioni; un nome è il suo punto più vicino; la ricerca per nome; «Near
  me» entro 30 km; gli esempi a 1,5 e 1 km tenuti a parte da quelli a 2 km.
- `PaddleExplore.tsx`: «Near me» acceso finché non si sceglie un luogo, con
  il segno della posizione; sotto, il lago più vicino con la distanza
  («LAGO DI LEVICO · 1.2 KM AWAY»); gli otto luoghi più vicini da toccare,
  in una riga che scorre; «Type a lake or a beach», con i nomi mentre si
  scrive; il cuore di Sgrava in alto a destra, come nella corsa.
- La frase d'attesa non dice più «of 2 km»: su un lago piccolo le forme
  sono più corte.

**Come è stata fatta l'acqua sul Mac**: `osmium` nella VM docker del Mac
non ha memoria per un estratto regionale (`MAPS.md`). I 41 file sono stati
scritti con `water_extract.write_from`, il codice del repository, da dati
letti dall'estratto con pyosmium in un ambiente di prova fuori dal
repository. Sono in `out/task233-lakes/cache/water/`. Sul server si fanno
con `water_extract --extract`, come quelli di TASK-225.

**Da dove riprendere** (parte B):

1. Le scelte fatte su delega (ADR-0196) sono tutte confermate dall'utente
   («Scelte dell'utente»): niente da chiedere prima della parte B.
2. Con l'ok dell'utente, dal coordinatore: sul server, `osmium export`
   delle acque dall'estratto dell'Italia, `lake_catalog --boxes`, poi
   `water_extract --extract ... --bbox` per ogni riga (`MAPS.md`, «I laghi
   di Explore»).
3. Copiare l'acqua del server sul Mac (`scp`, sola lettura), `lake_catalog
   --cache-dir`, Prettier su `lakes.json`, una PR.
4. Pubblicare l'app dopo il punto 2: finché il server non ha l'acqua di un
   lago, sceglierlo dà «Map data for this area could not be downloaded.».

### 2026-10-05, parte B

Ok dell'utente nella sessione del task («ok per il server, fai tutta
l'Italia», «quando hai i numeri copia l'acqua sul server») e «vai» del
coordinatore. Strada leggera: sul server solo una lettura e una copia di
file.

**L'elenco dell'Italia** (`lakes.json`, 55 KB senza spazi): **211 laghi,
758 punti** della riva, dall'estratto `italy-260930-water.osm.pbf` del
server, copiato sul Mac in sola lettura (674 MB).

- 221 laghi trovati; 7 scartati dal motore (nessuna riva raggiungibile a
  piedi, o nemmeno le forme da 1 km: Griessee, Lago Salarno, Lago
  Sciaguana, Lago dell'Esaro, Lago di Castelnuovo, Lago di Gannano, Lago
  di Sant'Anna); 3 lasciati fuori per il nome (il bacino della centrale di
  Presenzano, una cassa di espansione, una zona umida: regola aggiunta
  nella #319).
- 128 laghi con le forme da 2 km, 48 da 1,5 km, 35 da 1 km.
- I più lunghi: Como 46 punti, Garda 44, Maggiore 43, Omodeo 21, Lugano e
  Iseo 19.
- Tempi sul Mac: 9 minuti per scrivere l'acqua, 26 per provare i punti.

**L'acqua sul server** (2026-10-05, 04:22Z): **210 file, 50,4 MB**, in
`/root/shaperoute/data/cache/water/`, che ora ne ha 219 (71 MB). Copiati
in una cartella d'appoggio e poi spostati uno per uno senza sovrascrivere;
proprietario e permessi come gli altri; nessun riavvio. I sei file di
TASK-225 e due scaricati da Overpass quella notte non sono toccati. Provato
dentro il container dell'API, senza rete: sul lago di Levico il cuore da
2 km in 1,2 s e la testa di coniglio a pezzi in 1,5 s. I 93 punti del
nord-est della #319 sono coperti dagli stessi file.

**Rifare l'elenco** (un estratto nuovo, o il motore dell'acqua che
cambia): `MAPS.md`, «I laghi di Explore». Gli script usati sul Mac al
posto di `osmium` sono in `out/task233-lakes/scripts/`, fuori dal
repository.

**Seguiti**:

- La prova sull'iPhone dopo la pubblicazione: «Near me» da Levico Terme,
  un lago cercato per nome, un lago piccolo.
- Il Lago di Ledro (`water=pond` in OpenStreetMap) e i sette laghi
  scartati dal motore.
- I «laghi vicini» come sottocategoria di «Near me» (TASK-236 li propone).
