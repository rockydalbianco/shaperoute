# ROADMAP — Fasi e ordine di esecuzione

Questo documento dice **cosa** e **in che ordine**. Lo stato reale di
avanzamento sta solo in `STATUS.md`.

## Il criterio d'ordine

L'ordine non segue la struttura del prodotto, segue il rischio: prima si
affronta ciò che può far fallire il progetto.

Il rischio maggiore non è l'app, la mappa o il backend: sono problemi noti,
con soluzioni note. Il rischio è che **un cuore su rete stradale reale non
sia riconoscibile come un cuore**. Se questo non funziona, tutto il resto è
lavoro buttato.

Perciò la fase 1 costruisce solo il route-engine, in Python, da riga di
comando, senza app e senza server. Si guarda il GPX in un visualizzatore
web. Un solo linguaggio, cicli rapidi, poco contesto per sessione.

L'app si costruisce quando c'è qualcosa da mostrarci dentro.

---

## Fase 0 — Fondamenta

Obiettivo: repository pronto e disciplina di lavoro in piedi.

| Task | Titolo |
|---|---|
| TASK-001 | Repository locale, GitHub, `main` protetto |
| TASK-002 | Verifica documentazione e `CLAUDE.md` |

Fine fase: esiste una PR aperta e mergiata, e nessuno può committare su `main`.

## Fase 1 — Route Engine (il cuore)

Obiettivo: `python -m route_engine --shape heart --distance 15000 --start ...`
produce un GPX che, aperto in un visualizzatore, **sembra un cuore**.

| Task | Titolo |
|---|---|
| TASK-010 | Scheletro pacchetto `route-engine` + CLI |
| TASK-011 | Forme parametriche: circle e heart normalizzati |
| TASK-012 | Proiezione forma → coordinate geografiche |
| TASK-013 | Export GPX minimo (per vedere subito qualcosa) |
| TASK-014 | Snapping alla rete reale con OSMnx |
| TASK-017 | Snapping robusto: seguire il contorno (prima di TASK-015) |
| TASK-015 | Metrica di somiglianza + ottimizzatore |
| TASK-016 | Validazione: distanza, ripercorrenza, percorribilità |
| TASK-018 | README e CI allineati allo stato della fase 1 |
| TASK-019 | Anteprima dei campioni su mappa, in una sola pagina |

**Cancello di fase**: tre forme generate in tre zone diverse (città, paese,
valle) e giudicate a occhio. Se il cuore non si riconosce, si resta qui.
Non si passa alla fase 2 per stanchezza. Superato il 2026-09-23, con la
valle sospesa (ADR-0027).

Nota su TASK-013: l'export GPX arriva prima del routing reale apposta.
Serve a vedere la forma teorica sulla mappa già dopo TASK-012, cioè ad
avere un riscontro visivo il prima possibile.

## Fase 2 — App e API

Obiettivo: la stessa cosa, ma dal telefono.

| Task | Titolo |
|---|---|
| TASK-020 | Bootstrap monorepo, mobile Expo, shared-types |
| TASK-021 | Mappa MapLibre + posizione GPS |
| TASK-022 | API FastAPI che espone il route-engine |
| TASK-023 | Collegamento app ↔ API, anteprima percorso |
| TASK-025 | Richieste in due tempi: percorsi lunghi e zone nuove (prima di TASK-024) |
| TASK-024 | Export e condivisione GPX dal telefono |
| TASK-026 | Distanza libera: un campo in km al posto dei pulsanti, fino a 21 km |

Fine fase: **il MVP di `PRODUCT.md` è completo**. Chiusa il 2026-09-24 con
TASK-026: le sei funzioni del MVP ci sono tutte, provate sull'iPhone; resta
sopra la soglia di 30 s il tempo di generazione oltre i 10 km e con le zone
nuove (`STATUS.md`).

**Richiesta dell'utente (2026-09-23), per dopo TASK-023.** In TASK-023
forma e distanza si scelgono fra pochi pulsanti (cerchio o cuore; 3, 5, 10,
15 km). Dopo, si scrivono in **campi liberi**: l'app deve saper disegnare
ogni distanza e ogni forma che l'utente chiede. Le due metà hanno pesi
diversi:
- la distanza libera è vicina: il motore accetta già da 1 a 50 km, ma i
  tempi oltre 15 km non sono misurati;
- la forma libera tocca il confine di ADR-0001: il testo lo interpreta
  l'AI (fase 3), ma disegnare si può solo le forme che il motore conosce, e
  quelle nuove sono lavoro di fase 4.

Deciso con l'utente scrivendo TASK-025: prima TASK-025 (senza le richieste
in due tempi 15 km e zone nuove non arrivano), poi TASK-024, poi la
**distanza libera** in TASK-026. La **forma libera** va in fase 4, insieme
alle forme nuove del motore.

TASK-026 ha misurato 21 e 30 km a Trento: il calcolo regge, il download di
una zona nuova no (279 s a 30 km). L'app arriva a **21 km**; motore e
contratto restano a 50 (ADR-0034).

## Fase 3 — La forma scritta dall'utente

Obiettivo: l'utente scrive nel riquadro della forma una parola («stella»,
«cavallo») e il percorso la disegna.

| Task | Titolo |
|---|---|
| TASK-032 | Il motore segue un contorno qualunque: stella, casa, cavallo (prima di tutto) |
| TASK-033 | Catalogo di forme con licenza aperta e riquadro della forma nell'app |
| TASK-034 | Forme candidate: disegni nuovi e campioni pronti per il giudizio |
| TASK-035 | Una somiglianza che vede i dettagli, confrontata con i giudizi a occhio |
| TASK-036 | Forme dritte: le forme con un alto e un basso non si inclinano |
| TASK-037 | Tratti interni ripassati: rami, occhi, gambe, finestre |
| TASK-038 | Trova dove la forma ci sta: partenze nel raggio di qualche km |
| TASK-030 | L'AI riconosce la parola scritta e sceglie la forma del catalogo (ADR-0012) |
| TASK-031 | Parole senza forma nel catalogo e forme che le strade non reggono |

**Cancello dopo TASK-032**: la stella e la sagoma del cavallo si
riconoscono a occhio a Trento a 15 km. Se no, ci si ferma e la fase si
ripensa, per esempio con un catalogo di sole forme semplici. **Superato il
2026-09-24**: stella `sì` ovunque, cavallo `quasi` a Trento e `sì` a
Levico e Milano. La casa invece no, neanche con camino e porta (`quasi`
solo a Milano): il catalogo deve preferire forme che si riconoscono dalla
sagoma grande, non dai dettagli (ADR-0035). La somiglianza calcolata dà
voti alti anche a forme che l'occhio non riconosce: TASK-035 ha mostrato
che non è colpa della tolleranza, e che la somiglianza resta com'è
(ADR-0037). Il catalogo resta legato al giudizio a occhio (ADR-0036).

**TASK-034 (2026-09-24)**: sei forme nuove disegnate dall'agente (luna,
pesce, freccia, albero, corona, testa di gatto) si riconoscono a Milano e
non a Trento e Levico, secondo l'utente. Oltre a stella e cavallo, sulle
strade di Trento e Levico non passa nessuna delle forme provate: allargare
il catalogo chiede un motore che segua meglio il contorno dove le strade
sono rade, prima di altri disegni. La somiglianza le dava 0,83–0,97:
TASK-035 parte da questi giudizi.

**Richiesta dell'utente (2026-09-24)**: la casa con le finestre. Le
finestre stanno dentro il contorno: servono forme fatte di più pezzi e
tratti percorsi due volte. Task da definire, dopo TASK-035.

**Deciso dall'utente (2026-09-24), guardando la Strava art**: per le figure
complesse **ripassare le strade è voluto**, perché migliora molto la forma.
Chi fa Strava art disegna occhi, finestre, rami e scritte con tratti di
andata e ritorno, lavora in grande e sceglie il posto dove la forma ci sta.
TASK-036 ha tenuto dritte le forme: dei 15 casi che cambiano, a giudizio
dell'utente 7 migliorano e nessuno peggiora; la luna ha ora un `sì` a
Levico e può entrare nel catalogo (ADR-0038). Le forme ancora a `no` si
riconoscono da un dettaglio interno, e l'utente lo ha ribadito: servono i
tratti interni. In quest'ordine:
- **tratti interni ripassati** (TASK-037): il contorno porta linee aperte attaccate al
  bordo (rami, occhi, gambe sottili) e anelli interni (finestre); il
  percorso le fa andata e ritorno, senza potarle né penalizzarle. Supera in
  parte ADR-0026, che scoraggia ogni ripasso;
- **trova dove la forma ci sta** (TASK-038): la ricerca prova partenze nel raggio di
  qualche km e l'app dice dove andare.

**Deciso con l'utente (2026-09-24).** Non serve interpretare una frase:
distanza e attività si scrivono nei loro riquadri, e l'AI serve solo per la
forma. Il lavoro si divide in due:
- **riconoscere la parola** è il ruolo che il progetto dà all'AI: da
  «stemma della Ferrari» a «cavallo rampante» (TASK-030);
- **il disegno** viene da un catalogo di contorni con licenza aperta:
  l'AI sceglie, il contorno non lo inventa. Il catalogo pesa poco (un
  contorno è circa 1 KB, 10.000 forme circa 10 MB): distanza, partenza e
  rotazione le applica il motore a ogni richiesta. Il limite è quali
  parole copre, non lo spazio.

Far disegnare all'AI le forme che il catalogo non ha va contro ADR-0001:
l'AI non produce geometrie. Si decide dopo TASK-032, con i risultati in
mano, e lo decide l'utente. In ogni caso le strade reggono solo il contorno
esterno e i dettagli grandi, e i loghi sono marchi registrati.

Prima era «Linguaggio naturale»: una frase libera tradotta in un
`RouteRequest`. TASK-030 e TASK-031 hanno cambiato titolo; il loro file non
era ancora scritto.

## Fase 4 — Estensione

Walking e cycling; scritte (lettere e parole); account e percorsi salvati;
database PostgreSQL + PostGIS; preferenze di dislivello e superficie;
distanze oltre i 21 km nell'app, con un modo più veloce di avere i dati
delle zone (ADR-0009, ADR-0034); hosting, perché l'app funzioni anche a PC
spento (ADR-0013).

## Fase 5 — Oltre

Sincronizzazione smartwatch; web app; SUP; parapendio. Queste ultime due
non sono varianti del running: hanno un modello di percorso diverso e vanno
riprogettate, non adattate.

---

## Regole sulla roadmap

- Un task che cresce oltre una sessione di lavoro va **spezzato**, non
  portato avanti.
- La numerazione lascia buchi apposta: un task nuovo in fase 1 prende un
  numero libero della decina, senza rinumerare nulla.
- Le fasi non si sovrappongono. Se in fase 1 viene voglia di scrivere
  l'app, è il segnale che la fase 1 sta annoiando, non che è finita.
