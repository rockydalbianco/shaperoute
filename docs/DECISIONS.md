# DECISIONS — Registro delle decisioni

Una voce per decisione, **mai cancellata**. Se una decisione viene
ribaltata, la vecchia voce passa a `Superata da ADR-00XX` e se ne aggiunge
una nuova: sapere cosa si è provato e perché è stato abbandonato vale
quanto sapere cosa si usa oggi.

Formato: contesto in una riga, decisione, motivo, conseguenza.

Stati: `Attiva` · `Aperta` (da decidere) · `Superata`

---

## ADR-0001 — L'AI non genera percorsi
**Stato**: Attiva · 2026-09-22

Un modello linguistico non sa produrre coordinate corrette né rispettare
una rete stradale: inventerebbe tracce plausibili e sbagliate.

**Decisione**: l'AI traduce la richiesta in un `RouteRequest` strutturato e
si ferma lì. Il percorso lo calcola solo il route-engine.

**Conseguenza**: il prodotto funziona anche senza AI, con un form. Questa è
la verifica che il confine regga.

## ADR-0002 — Route engine separato dal backend
**Stato**: Attiva · 2026-09-22

**Decisione**: `services/route-engine/` è una libreria Python pura, senza
dipendenze da API, AI, rete o chiavi.

**Conseguenza**: si sviluppa e si testa da riga di comando, il che rende la
fase 1 possibile senza costruire nient'altro.

## ADR-0003 — Sviluppo per fasi guidate dal rischio
**Stato**: Attiva · 2026-09-22

**Decisione**: prima il route-engine completo e funzionante, poi app e API.
Non si costruisce l'interfaccia prima di avere qualcosa da mostrarci.

**Motivo**: il rischio del progetto è tutto nella conversione forma →
percorso reale. Rimandarla significa scoprire tardi se il prodotto è
possibile.

**Conseguenza**: per tutta la fase 1 si lavora in un solo linguaggio, con
cicli di prova di pochi secondi.

## ADR-0004 — Task piccoli, un branch e una PR ciascuno
**Stato**: Attiva · 2026-09-22

**Decisione**: nessun lavoro ordinario su `main`. Ogni task ha il suo file
in `docs/tasks/`, il suo branch e la sua Pull Request.

**Motivo**: oltre alla tracciabilità, è la misura principale di controllo
del contesto: un task piccolo entra in una sessione sola.

## ADR-0005 — Documentazione stratificata
**Stato**: Attiva · 2026-09-22

**Decisione**: `CLAUDE.md` corto e permanente; il dettaglio in `docs/`,
caricato su richiesta tramite `docs/INDEX.md`.

**Motivo**: `CLAUDE.md` si paga in ogni sessione, i documenti di dominio solo
quando servono.

## ADR-0006 — Gli stub si riempiono quando arriva il loro task
**Stato**: Attiva · 2026-09-22

**Decisione**: `API.md`, `DATABASE.md`, `UI.md`, `AI.md`, `MAPS.md`, `GPX.md`
restano segnaposto finché non inizia il task che li riguarda.

**Motivo**: documentare in anticipo decisioni non ancora prese produce testo
che sembra autorevole ed è inventato. È peggio di un file vuoto.

## ADR-0007 — Lingua: documentazione in italiano, codice in inglese
**Stato**: Attiva · 2026-09-22

**Decisione**: prosa dei documenti in italiano; identificatori, commenti,
messaggi di commit e PR in inglese.

**Conseguenza**: il repository resta apribile a collaboratori non
italofoni senza riscrivere il codice.

## ADR-0008 — OSMnx per la fase 1
**Stato**: Attiva · 2026-09-22

**Decisione**: prototipo di routing con OSMnx, che scarica la rete OSM e
calcola i percorsi in locale.

**Motivo**: nessun server da gestire, ciclo di prova immediato.

**Conseguenza**: è una scelta da prototipo, lenta su aree grandi. Il motore
di produzione è ADR-0009.

## ADR-0009 — Motore di routing di produzione
**Stato**: Aperta

Candidati: OSRM, GraphHopper, Valhalla. Valhalla è interessante per il
supporto a dislivello e superfici, che servirà in fase 4.

**Da decidere entro**: fase 4, con hosting e database (ADR-0013). Era
fase 2, TASK-022: rinviata con ADR-0030, l'MVP resta su OSMnx.

## ADR-0010 — Metrica di somiglianza
**Stato**: Superata da ADR-0023 (e ADR-0025) · 2026-09-23

Hausdorff contro Fréchet discreta: si implementano entrambe in TASK-015, si
confrontano con il giudizio a occhio e si sceglie con dati alla mano.

**Da decidere entro**: fine fase 1.

## ADR-0011 — Provider di mappe e tiles
**Stato**: Superata da ADR-0029 · 2026-09-23

## ADR-0012 — Provider e modello AI
**Stato**: Attiva · 2026-09-24 · provider e modello scelti dall'utente; il
resto proposto dall'agente e approvato dall'utente (TASK-030)

Vincolo già fissato: dietro un'interfaccia astratta, sostituibile senza
toccare l'architettura. Il lavoro dell'AI lo ha deciso la fase 3: leggere le
parole del riquadro della forma che la tabella dell'app non conosce
(«stemma della Ferrari») e scegliere una forma del catalogo (ADR-0036).

**Decisione**:
- **Provider: un modello aperto in locale, in Ollama**, sullo stesso PC
  dell'API. Niente chiavi né costi per richiesta, e le parole non escono
  dalla rete di casa. Ollama e i modelli stanno sul disco D:.
- **Modello: `qwen3:4b`** (Apache 2.0, 2,5 GB), senza «ragionamento»
  (`think: false`). Scelto misurando tre modelli con licenza aperta che
  parlano italiano: qwen3:4b, phi4-mini (MIT) e granite4:3b (Apache 2.0).
  Scartati prima di misurare: qwen2.5:3b (licenza di ricerca), Gemma e
  Llama (licenze proprie).
- **Pacchetto `services/ai/`** (`shaperoute_ai`), solo libreria standard:
  `ShapeModel.choose(text, shapes) -> Choice` è l'interfaccia,
  `OllamaModel` l'unico provider. Il catalogo lo passa l'API, e
  `ShapeReader` scarta ogni risposta fuori catalogo.
- **Risposta vincolata** da uno schema JSON: `picture` (cosa raffigura
  l'immagine più nota della cosa nominata), poi `shape`, un nome del
  catalogo o `none`. Temperatura 0, seme fisso. Testo da 1 a 60 caratteri.
- **API**: `POST /shape-readings`, `{text}` → `{text, shape}`; `503
  ai_unavailable` se Ollama non risponde entro 90 s; cache in memoria.
- **App**: prima la tabella; le altre parole vanno all'API quando l'utente
  ha finito di scrivere. «Draw route» si accende solo con una forma.
- **Soglia**: l'utente ha accettato qwen3:4b sotto il 90% della lista di
  messa a punto (87%), perché sulle parole nuove arriva al 94% e sbaglia
  forma di rado (3 volte su 84). La soglia si guarda sulla lista di
  controllo, che non serve mai a cambiare la domanda al modello.

**Motivo**: l'utente vuole strumenti gratuiti e open source (TASK-030,
punto A). Fra i tre modelli qwen3:4b dà più risposte giuste su tutte e due
le liste (89% in tutto, contro 83% e 81%) in 5–6 s a parola. granite4:3b
non sbaglia mai forma ma dice più spesso «nessuna»; phi4-mini dà 9 forme
sbagliate su 84. Con il ragionamento acceso, qwen3:4b non risponde in 5
minuti su questo PC (`AI.md`, «Misure»).

**Conseguenza**: il PC dell'API deve avere Ollama acceso con il modello
(`SETUP.md` 10.3); senza, l'app va lo stesso con le parole della tabella.
Il modello caricato occupa 3,2 GB di RAM per 15 minuti dopo l'ultima
parola, e la prima parola dopo una pausa aspetta il caricamento, fino a
49 s. Quando l'API lascerà il PC (ADR-0013) servirà un altro provider:
un'altra classe dietro `ShapeModel`. Una forma nuova nel catalogo vuole la
sua riga in `OUTLINES` e le sue parole nelle due liste. Sull'iPhone le
parole semplici vanno, quelle che il modello conosce poco no («stemma della
ferrari», «spirit»): l'utente ha scelto di tenere il limite, documentato in
`AI.md`, «Limiti», invece di cercare un modello più grande.

## ADR-0013 — Database, hosting e autenticazione
**Stato**: Aperta · **Da decidere entro**: fase 4

Ipotesi di partenza: PostgreSQL + PostGIS. Non serve prima di avere account
e percorsi salvati.

## ADR-0014 — I GPX di prova si versionano
**Stato**: Attiva · 2026-09-22

Un GPX guardato una volta e buttato non lascia niente: alla modifica
successiva non c'è modo di sapere se il risultato è migliorato o peggiorato.

**Decisione**: i campioni generati stanno in `samples/`, entrano nel
repository e non si sovrascrivono mai — ogni rigenerazione incrementa la
versione nel nome. Ogni campione guardato ha una riga in `samples/LOG.md`
con punteggio di somiglianza e giudizio a occhio.

**Motivo**: la qualità del risultato non è catturabile da un test
automatico. L'unico modo di misurarla nel tempo è conservare i risultati e
confrontarli.

**Conseguenza**: il confronto fra punteggio e giudizio, accumulato prova
dopo prova, è il dato che chiude ADR-0010. In più `git show` recupera
qualsiasi campione com'era a una data precedente.

Restano ignorati `out/` e `scratch/`, per le prove che non si guardano.

## ADR-0015 — Repository pubblico
**Stato**: Attiva · 2026-09-22

Su GitHub la protezione del ramo `main` è gratuita solo sui repository
pubblici; su uno privato richiede GitHub Pro.

**Decisione**: `rockydalbianco/shaperoute` è pubblico.

**Motivo**: la protezione del ramo è il vincolo che regge tutto il metodo
di lavoro (ADR-0004), e vale più della riservatezza del sorgente. Nel
codice non c'è nulla di riservato: le chiavi stanno in `.env`, che non
entra nel repository.

**Conseguenza**: nessun segreto nei file, mai, nemmeno temporaneamente —
la cronologia di git è pubblica e conserva tutto. Se in futuro servisse
riservatezza, la visibilità si cambia dalle impostazioni, perdendo però la
protezione del ramo a meno di passare a GitHub Pro.

## ADR-0016 — Contratto e CLI del route-engine senza dipendenze runtime
**Stato**: Attiva · 2026-09-22 · le forme ammesse sono superate da ADR-0036

TASK-010 lasciava aperte alcune scelte sullo scheletro del route-engine.

**Decisione**:
- `RouteRequest` e `RouteResult` sono dataclass `frozen`, non modelli
  Pydantic; la validazione sta in `RouteRequest.__post_init__`.
- La CLI usa `argparse` della libreria standard.
- Distanza target ammessa: da 1 000 a 50 000 m.
- Attività ammesse: solo `running`.
- Forme ammesse: `circle` e `heart`, registrate in
  `route_engine/shapes/SUPPORTED_SHAPES`.

**Motivo**: il route-engine è una libreria pura (ADR-0002); ogni dipendenza
runtime evitata è una in meno da installare in CI e da tenere allineata.
Validare nel modello e non solo nella CLI protegge anche i chiamanti futuri
(l'API). I limiti di distanza coprono una corsa plausibile, da un giro breve
a una maratona abbondante; `running` è l'unica attività dell'MVP.

**Conseguenza**: l'API, in fase 2, userà Pydantic ai suoi confini e
convertirà verso le dataclass. Con latitudine negativa la CLI richiede
`--start=-33.9,18.4`, perché argparse legge `-33.9,...` come un'opzione.
Walking e cycling, o limiti di distanza diversi per attività, richiedono una
nuova voce che superi questa. I modelli vivono in `route_engine/models.py`
finché `packages/shared-types/` non esiste (ARCHITECTURE §3).

## ADR-0017 — `n_points` conta i vertici, la chiusura è in più
**Stato**: Attiva · 2026-09-22

Il cuore ha due punte (incavo in alto, punta in basso) a metà esatta della
lunghezza d'arco. Con 64 elementi di cui l'ultimo uguale al primo i segmenti
sono 63, dispari: la punta in basso cade fra due vertici, viene tagliata
(y = −16.2 invece di −17 prima della normalizzazione) e la spaziatura fra
punti consecutivi scende al 23% della media.

**Decisione**: una forma chiamata con `n_points` restituisce `n_points`
vertici equispaziati in lunghezza d'arco, più il primo ripetuto in fondo:
`n_points + 1` elementi, `n_points` segmenti. La chiusura resta esplicita
come vuole `ROUTE_ENGINE.md` §2.

**Motivo**: la regola "ultimo = primo" semplifica proiezione, routing ed
export; contare i vertici invece degli elementi è ciò che lascia al
chiamante il controllo sul numero di segmenti, e quindi sulle punte.

**Conseguenza**: il criterio di TASK-011 "`get_shape("heart")(64)`
restituisce 64 punti" si legge come 64 vertici, 65 elementi. Chi consuma la
lista e vuole i soli vertici usa `points[:-1]`.

## ADR-0018 — Proiezione: piano tangente locale, fase continua, rotazione antioraria
**Stato**: Attiva · 2026-09-22

TASK-012 doveva chiudere la scelta fra formula locale e `pyproj`, e fissare
come si esprimono fase e rotazione.

**Decisione**:
- Conversione metri ↔ gradi con il piano tangente nel punto di partenza
  (`route_engine/geo.py`, R = 6 371 000 m). Niente `pyproj`.
- La fase è una frazione del perimetro in `[0, 1)`, dal vertice 0. La curva
  proiettata inizia e finisce nel punto di partenza; i vertici originali
  restano tutti.
- La rotazione è in gradi, antioraria, applicata dopo la scala.

**Motivo**: misurato su un cuore con distanza fino a 50 km (il massimo di
ADR-0016): errore di perimetro sotto lo 0,05%, spostamento massimo di un
punto 5 m a 46°N e 8 m a 60°N — meno della larghezza di una strada, e lo
snapping sposterà molto di più. Una fase continua è ciò che serve
all'ottimizzatore (TASK-015); tenere i vertici originali conserva le punte
del cuore (ADR-0017). L'antiorario è la convenzione della trigonometria
usata nel codice.

**Conseguenza**: nessuna dipendenza nuova. La formula degenera vicino ai
poli (`cos lat0 → 0`); `RouteRequest` oggi ammette latitudini fino a ±90, e
se servirà un limite si apre un task. Se lo snapping di TASK-014 mostrasse
errori riconducibili alla proiezione, questa voce si riapre.

## ADR-0019 — Export GPX dentro il route-engine, solo libreria standard
**Stato**: Attiva · 2026-09-22

ARCHITECTURE §2 colloca l'export in `services/export/`, ma TASK-013 lo
chiede in `route_engine/export_gpx.py`.

**Decisione**: in fase 1 l'export GPX vive nel route-engine e usa solo
`xml.etree.ElementTree`. Formato: GPX 1.1, un `<trk>` con un `<trkseg>`,
coordinate a 7 decimali, niente quote, metadati senza nomi di persone. La
CLI rifiuta di scrivere su un file esistente.

**Motivo**: la fase 1 vive di generare → guardare → correggere dalla riga
di comando; un servizio separato non aggiunge nulla finché l'unico formato
è GPX. Il rifiuto di sovrascrivere rende automatica la regola di ADR-0014.

**Conseguenza**: in fase 2, con i formati wearable, si decide se spostare
il modulo in `services/export/`. Dettagli del formato in `docs/GPX.md`.

## ADR-0020 — Grafo stradale: cache locale, area della forma, penalità fissa
**Stato**: Attiva · 2026-09-22

Preparando TASK-014 sono emersi tre conflitti: `CLAUDE.md` vuole il
route-engine eseguibile senza rete, OSMnx scarica da internet; `TESTING.md`
chiede di versionare i grafi delle zone, che pesano decine di MB in un
repository pubblico; `ROUTE_ENGINE.md` §4 scarica un raggio pari alla
distanza target, circa 700 km² per 15 km.

**Decisione**:
- Il grafo si scarica una volta e si salva in `data/cache/` (ignorata da
  git); da lì la CLI gira offline. I test usano grafi sintetici costruiti
  nel codice e un grafo reale piccolo (< 1 MB) in `tests/fixtures/`. I
  grafi di zona non si versionano.
- L'area scaricata è il rettangolo della forma teorica proiettata più un
  margine.
- La penalità sugli archi già percorsi entra in TASK-014 con un fattore
  fisso, tarato a occhio sui campioni.

**Motivo**: la cache mantiene la promessa "senza rete" dopo il primo
download senza appesantire il repository; le fixture piccole bastano a
rendere i test deterministici. L'area della forma è ciò che il percorso usa
davvero. Senza penalità i primi campioni reali sarebbero pieni di tratti
ripercorsi, e giudicarli a occhio non direbbe nulla.

**Conseguenza**: `TESTING.md` (fixture) e `ROUTE_ENGINE.md` §4 (area) vanno
corretti in TASK-014. I campioni in `samples/` restano riproducibili solo a
parità di dati OSM: la data del download va annotata. Il fattore di
penalità si rivede con l'ottimizzatore (TASK-015).

## ADR-0021 — Solo `osmnx` come dipendenza; potatura degli speroni
**Stato**: Attiva · 2026-09-22

TASK-014 ha aggiunto la prima dipendenza runtime e ha mostrato che la
penalità sugli archi usati (ADR-0020) non basta contro le andate e ritorno.

**Decisione**:
- Dipendenza runtime: `osmnx>=2.1,<3` e ciò che porta con sé. Niente
  extra `neighbors` (scikit-learn, scipy): il nodo più vicino si calcola in
  metri con `geo.py` e numpy.
- Dopo il routing si potano gli speroni: ogni A → B → A diventa A, finché
  ce ne sono; se non resta un anello si tiene il percorso originale.

**Motivo**: calcolare in metri è la regola del progetto e numpy arriva già
con osmnx; scikit-learn e scipy aggiungerebbero ~60 MB per una sola
funzione. Rispetto a nessuna penalità, la penalità 2.0 cambia la distanza
del 0–3% (cuore 5 km, Trento e Levico); sui 12 campioni la potatura la
riduce del 19–53% e taglia gli archi ripercorsi del 43–90%. A occhio
erano proprio i ritorni a rovinare il disegno.

**Conseguenza**: le deviazioni residue (2,2–3,8× il target) sono il
problema di TASK-017. La penalità resta, con valore da rivedere lì.

## ADR-0022 — Zone e corridoio al posto del nodo più vicino; rete con le ciclopedonali
**Stato**: Attiva · 2026-09-22

TASK-017 doveva portare la distanza su strada entro 1,5× il target senza
ottimizzatore. Misurando anche quanta parte del contorno il percorso segue
davvero (copertura, `MAPS.md`), le varianti che ci arrivano lo fanno
saltando pezzi di forma. Guardando i campioni è emerso anche che la rete
`walk` di OSMnx scarta le ciclabili, quasi tutte ciclopedonali in Trentino.

**Decisione**:
- Ogni punto della forma, tranne la partenza, è una **zona** di nodi
  (raggio 2% del perimetro), non il solo nodo più vicino. Fra una zona e la
  successiva le strade costano di più quanto più stanno lontane dal
  contorno oltre una fascia del 2% del perimetro (**corridoio**, peso 2,0).
  Aggancio all'arco, guardia sulle deviazioni e sfoltimento dei waypoint
  sono stati provati e scartati.
- La rete a piedi è il filtro `walk` di OSMnx **senza** l'esclusione di
  `highway=cycleway`, costruita con `network_type="walk"` perché ogni strada
  resti percorribile nei due sensi. I grafi in cache si chiamano `foot_*`.
- Il traguardo di 1,5× esce da TASK-017 e passa a TASK-015: ruotare e
  scalare la forma, tracciare, misurare e ripetere finché forma e distanza
  vanno bene.

**Motivo**: sui 12 casi zone e corridoio accorciano in 11 casi (rapporto
mediano 2,89× → 2,57×) senza perdere copertura (79%); la guardia arriva a
11/12 entro 1,5× ma con copertura 41%, cioè disegnando un'altra forma. Le
ciclabili, sul cuore da 5 km a Levico, portano 1,82× → 1,47× e copertura
82% → 90%. Il residuo viene da dove cade la forma (campi, fiumi, ferrovie a
scala e rotazione iniziali), che nessun aggancio può correggere.

**Conseguenza**: TASK-017 si chiude con i criteri rivisti (più corto della
TASK-014 senza perdere copertura). TASK-015 usa `snap_to_network` così com'è
come passo di tracciamento e la copertura come candidata alla misura di
somiglianza. Gli 8 grafi `foot` non ancora scaricati si scaricano uno alla
volta quando Overpass risponde (`MAPS.md`).

## ADR-0023 — Un grafo per zona; somiglianza = copertura del contorno
**Stato**: Attiva · 2026-09-23 · la scelta della metrica è superata da ADR-0025

TASK-015 ruota e scala la forma attorno alla partenza: il rettangolo della
forma (ADR-0020) cambia a ogni tentativo, e scaricarlo ogni volta vorrebbe
dire decine di richieste a Overpass per un solo percorso. Serviva anche una
misura di somiglianza per decidere quando fermarsi (`ROUTE_ENGINE.md` §5).

**Decisione**:
- L'area è un **quadrato attorno alla partenza** che contiene la forma a
  ogni rotazione, fase e scala massima, più 500 m: circa 11,5 km di lato per
  15 km. Si scarica **un grafo per zona**; ogni area più piccola si ritaglia
  da un grafo in cache che la contiene, e il ritaglio si salva col suo nome.
  Ogni tracciamento lavora sul ritaglio attorno alla forma candidata.
- La somiglianza è la **copertura**: quota del contorno con il percorso
  entro il 2% del perimetro. Ci si ferma a **0,90** e distanza entro
  **±10%**; il costo pesa la forma 3 e la distanza 1.
- Hausdorff e Fréchet discreta sono implementate e misurate, ma scartate;
  `fit` (copertura nei due sensi) resta come misura di controllo.

**Motivo**: con un grafo per zona bastano 3 download per le tre zone (più
Milano per confronto), e un caso gira dalla cache in 3–24 s. Sui primi sei
percorsi giudicati a occhio, i due `sì` avevano copertura 90–95% e gli
altri 84% o meno; `fit` metteva un `sì` (71%) sotto un `no` (72%), Fréchet
dava il voto più alto a un `no`. La forma conta più della distanza per il
prodotto, da qui il peso 3.

**Conseguenza**: i grafi di zona pesano 8–26 MB in Trentino e 98 MB a
Milano, dove leggere il GraphML porta un caso a 36–85 s. La copertura non
vede anelli interni né punte (andata e ritorno su strade parallele): se i
giudizi a occhio lo chiedono, si passa a `fit` o si corregge lo snapping.
Soglia e pesi si rivedono con i giudizi sui campioni di TASK-015.

## ADR-0024 — Anteprima dei campioni: pagina HTML con Leaflet e tile OSM
**Stato**: Attiva · 2026-09-23

Ogni task di fase 1 produce 12 campioni da guardare a occhio, e caricarli
uno alla volta in gpx.studio costa più che guardarli (TASK-019). Il
provider di mappe e tiles dell'app, ADR-0011, è ancora aperto.

**Decisione**:
- `tools/preview_samples.py`, fuori dal route-engine e con la sola libreria
  standard, scrive una pagina HTML con tutti i GPX di un pattern, un
  livello per file. Le tracce sono dentro la pagina come JSON: si apre da
  `file://`, senza server.
- Mappa con **Leaflet 1.9.4** da unpkg (versione fissata, hash SRI) e
  **tile standard di OpenStreetMap**, con l'attribuzione sempre visibile.
  Uso leggero, interattivo e personale, come chiede la policy delle tile
  OSM: niente download in anticipo né per l'uso offline.
- La pagina va in `out/preview.html`, ignorato da git, e si sovrascrive: è
  usa-e-getta e si rigenera dai GPX versionati (ADR-0014).
- `tools/` è la cartella degli script di sviluppo. In CI lint e test
  girano nello stesso job del route-engine, con le sue regole
  (`--config services/route-engine/pyproject.toml`).

**Motivo**: un comando e un doppio clic al posto di dodici caricamenti,
senza dipendenze nuove né per il route-engine né per chi lancia lo script.
Leaflet con tile raster è il minimo che serve per guardare tracce; MapLibre,
la libreria dell'app, chiederebbe uno stile e un provider, cioè la
decisione di ADR-0011. Il dubbio sul Referer, che una pagina aperta da
`file://` non manda, è stato provato: le tile si caricano (Edge headless,
2026-09-23).

**Conseguenza**: la pagina ha bisogno della rete per Leaflet e per le tile,
anche se i dati sono dentro. La scelta vale solo per lo strumento di
sviluppo: ADR-0011 resta aperta per l'app. Se un giorno le tile da
`file://` venissero rifiutate, le alternative sono servire `out/` con
`python -m http.server` o un altro provider: si decide allora.

## ADR-0025 — Regole dell'ottimizzatore dopo i giudizi a occhio
**Stato**: Attiva · 2026-09-23 · la partenza si sposta anche fino a 2 km con
ADR-0040

I campioni di TASK-015 giudicati a occhio hanno mostrato quattro cose:
- la copertura non vede i pezzi tagliati;
- un cuore senza punta non sembra un cuore;
- forzare la forma a passare per il punto richiesto la fa tagliare vicino
  alla partenza;
- in Valsugana certe forme non si disegnano.

**Decisione**:
- **Somiglianza** = `fit` (copertura nei due sensi) meno 0,10 per ogni
  punta della forma mancata; ci si ferma a 0,90. Le punte sono i vertici
  in cui il contorno gira più di 60° (l'incavo e la punta del cuore). La
  ricerca penalizza già nel conteggio delle strade le punte senza strada.
- **Le punte non si potano**: lo sperone che scende alla punta di un cuore
  e risale è ciò che la disegna. Gli altri speroni si potano come prima.
- **Partenza spostabile** fino a 500 m (anelli a 250 e 500 m, 8 direzioni);
  spostarla deve valere almeno 5 punti di copertura. Il percorso parte e
  finisce nella partenza spostata: il tratto dal punto richiesto non entra
  né nel GPX né nella distanza.
- **Distanza**: obiettivo ±10%; se nessun piazzamento ci riesce, fino a
  **±2 km** pur di tenere la forma.
- **Forma non disponibile** (nessun percorso, errore esplicito) se la
  somiglianza migliore è sotto 0,60 o la distanza è oltre ±2 km.
- Ricerca: fino a 6 piazzamenti e 16 tracciamenti; ogni caso sotto i 40 s.

**Motivo**: sui giudizi v1 la copertura metteva Trento (`quasi`, 91–97%)
alla pari di Milano (`sì`, 95–100%); `fit` li separa (0,71–0,85 contro
0,91–1,00). A Levico la punta del cuore spariva per la potatura degli
speroni; con le punte protette e premiate i due cuori la raggiungono (v3),
ruotati di 45–60°. L'utente preferisce la forma alla rotazione e accetta
fino a 2 km di scarto quando la forma non ci sta, ma non un percorso che
non somiglia alla forma.

**Conseguenza**: `--no-optimize` rifà TASK-017, tranne dove la punta del
cuore era uno sperone potato: lì ora resta (cuore 5 km Valsugana: 15,9 →
16,8 km; Trento e Levico identici).
Soglie e penalità sono tarate su 16 casi e pochi giudizi: si rivedono con
altri campioni. Una forma rifiutata oggi (Valsugana 15 km cuore, 5 km
cerchio) può diventare disponibile con uno snapping migliore.

## ADR-0026 — Validazione del percorso e potatura delle punte parallele
**Stato**: Attiva · 2026-09-23 · lungo i tratti delle forme superata in
parte da ADR-0039

Dopo TASK-015 restavano difetti che nessuna misura vedeva: le "punte" di
andata e ritorno su strade parallele (marciapiede e strada), e tratti su
scale, strade principali e gallerie. La §6 di `ROUTE_ENGINE.md` chiedeva
anche un percorso che passasse per il punto di partenza, superato da
ADR-0025.

**Decisione** (soglie confermate dall'utente, da ritarare):
- ogni percorso misura la **ripercorrenza esatta** (archi già percorsi,
  warning sopra il 5%) e **visiva** (tratti entro 20 m da un altro tratto
  lontano almeno 60 m lungo il percorso, warning sopra il 10%; le punte
  della forma sono escluse) e i **metri su scale, strade principali**
  (`trunk`, `primary`) **e gallerie** (warning appena ci sono), solo con i
  tag già in cache;
- un percorso non chiuso, che non parte dalla sua partenza o con la
  partenza a più di 500 m da quella richiesta è un **errore del motore**,
  non un warning;
- nello snapping si **tolgono le punte parallele**: un tratto che torna
  entro 20 m da dove era passato, dopo almeno 60 m e al massimo il 15% del
  percorso, sottile per il 70% della lunghezza, senza punte della forma e
  con i due estremi collegati da strada in meno di 60 m. Le due potature
  (esatta e parallela) si ripetono finché il percorso non cambia;
- la ricerca resta quella di TASK-015 (correzioni di scala su ogni
  piazzamento), con 20 tracciamenti invece di 16.

**Motivo**: con 200 m di distanza lungo il percorso, come proposto, le
punte sotto i 200 m non si vedevano; con 60 m sì (cerchio 15 km Trento: 2%
→ 7%). Una sola passata di potatura lasciava sul cerchio 5 km di Levico il
59% di percorso ripercorso a vista; ripetendole, il 2%. Tracciare più
piazzamenti una volta sola invece di correggere la scala di ciascuno ha
dato somiglianza media 0,845 contro 0,862 sui 14 casi disegnabili.

**Conseguenza**: i percorsi puliti cambiano le distanze, quindi le
correzioni di scala e l'ordine dei tentativi: il cuore 15 km di Trento non
ritrova il piazzamento della v3 (0,94) e si ferma a 0,89, anche se quel
piazzamento, tracciato a mano, vale ancora 0,94. La ricerca resta sensibile
al percorso esatto dei tentativi. Sterrati, sentieri difficili e
marciapiedi richiedono altri tag (`surface`, `sac_scale`, `sidewalk`) e un
nuovo download.

## ADR-0027 — Cancello di fase 1 superato con la valle sospesa
**Stato**: Attiva · 2026-09-23

Il cancello di fase 1 (`ROADMAP.md`) chiede tre forme generate in città,
paese e valle e giudicate a occhio.

**Decisione**: il cancello è superato, e si passa alla fase 2. Giudizi sui
campioni `TASK-016_*_v1`: Trento (città) `sì` su cuore e cerchio,
Levico (paese) `quasi`, Milano (solo confronto) `sì`. La valle (Valsugana)
è sospesa su scelta dell'utente: dove la rete non basta, il motore dichiara
la forma non disponibile invece di disegnarla male (ADR-0025).

**Motivo**: in città e in paese la forma si riconosce alla distanza giusta;
in valle i casi da 5 km sono rifiutati dalla regola stessa del motore, non
disegnati male. Il rischio più grande adesso è l'app, non il motore.

**Conseguenza**: la valle resta un caso aperto, da riprendere con dati o
ricerca migliori, non in fase 2. Restano annotati in `STATUS.md` i limiti
noti del motore: scale e strade principali solo misurate, non evitate;
ricerca sensibile all'ordine dei tentativi (ADR-0026).

## ADR-0028 — Monorepo npm, app Expo, tipi condivisi scritti a mano
**Stato**: Attiva · 2026-09-23

TASK-020 crea la prima parte TypeScript del repository: servivano gestore
dei pacchetti, forma dell'app, posto e verifica dei tipi condivisi,
strumenti. Confermato dall'utente, con il vincolo che tutto sia aperto e
gratuito (lo è: licenze MIT).

**Decisione**:
- **Monorepo** con i workspace di **npm** (`apps/*`, `packages/*`), un solo
  `package-lock.json`, **Node 24** (`.nvmrc`). Niente pnpm, yarn, Turborepo.
  Alla radice un `overrides` tiene **una sola copia di React**, quella
  dell'SDK di Expo (oggi 19.2.3).
- **App** `apps/mobile` dal template Expo `blank-typescript`, **SDK 57**,
  `strict`, senza expo-router. Del template non si tengono `CLAUDE.md`,
  `AGENTS.md`, `.claude/` (istruzioni per agenti che imponevano expo-router
  ed EAS) e la `LICENSE` di Expo.
- **`@shaperoute/shared-types`**: sorgenti TypeScript senza build, stessi
  nomi dei campi di `models.py` (snake_case), punti `[lat, lon]`. Tre JSON
  di esempio (`fixtures/`) sono controllati da `tsc` e dal test runner di
  Node da un lato, da `tests/test_contract.py` del route-engine dall'altro.
- **Strumenti**: ESLint con `eslint-config-expo` (`expo lint`), Prettier
  (larghezza 88 come `black`, fine riga automatica per Windows), Jest con
  `jest-expo` e `@testing-library/react-native`, `tsc --noEmit` su ogni
  workspace; per `shared-types` `node --test`, che non aggiunge un secondo
  Jest. Job `mobile` in CI.

**Motivo**: npm e Node sono già installati e bastano per due pacchetti;
Expo trova da solo i workspace npm. Expo Go apre solo l'ultimo SDK, per
questo il 57. Copiare i tipi a mano con un test di allineamento costa meno
di un generatore di codice, e la scelta di generarli dall'OpenAPI resta a
TASK-022. Due copie di React nello stesso bundle rompono gli hook: npm, con
i workspace, ne aveva installate due (19.2.3 e 19.3.0).

**Conseguenza**: quando cambia l'SDK di Expo si aggiorna anche la versione
di React in `overrides`. `test-renderer` resta a ~1.2 finché Expo non passa
a React 19.3 (la 1.3 lo richiede). TypeScript 6 non carica più da solo i
tipi `@types`: vanno dichiarati in `types` (`jest` nell'app, `node` in
`shared-types`, che dichiara `@types/node`). `npm audit` segnala 10
vulnerabilità moderate, tutte da `uuid` dentro gli strumenti di build di
Expo (`xcode`), non nell'app: si risolvono con un SDK nuovo, non a mano.

## ADR-0029 — Mappa dell'app in WebView, posizione GPS, ricerca del luogo
**Stato**: Attiva · 2026-09-23

TASK-021 porta nell'app la mappa e la posizione. L'utente prova su iPhone
con Expo Go, da un PC Windows e con strumenti gratuiti: MapLibre React
Native non gira in Expo Go, e su un iPhone vero la *development build*
chiede un Mac o l'Apple Developer Program a pagamento. Confermato
dall'utente, che ha chiesto in più la ricerca del luogo quando la posizione
non c'è.

**Decisione**:
- **Mappa**: l'app scrive una pagina HTML e la apre in
  `react-native-webview`. Dentro, **MapLibre GL JS 5.24.0** da unpkg
  (versione fissata, hash SRI, come ADR-0024) e lo stile `liberty` di
  **OpenFreeMap** (dati OSM, gratuito, senza chiave né account).
  Attribuzione estesa, mai compressa dietro l'icona «i». La 5.x perché è
  l'ultima in un file solo: la 6 è solo moduli ES, con il worker in un file
  separato. URL dello stile in una sola costante.
- **App e pagina** si parlano con messaggi tipati: `setPosition` verso la
  pagina, `ready` ed `error` verso l'app. Lo scambio fra `[lat, lon]` e il
  `[lon, lat]` di MapLibre e GeoJSON avviene solo in
  `apps/mobile/src/map/coordinates.ts`. I link della pagina si aprono nel
  browser del telefono.
- **Posizione** con `expo-location`, solo in primo piano: una lettura
  all'apertura e una a ogni «My position», al massimo 15 s. Non esce dal
  telefono.
- **Senza posizione** (permesso negato, GPS spento o muto): mappa
  sull'Italia e ricerca di una città o una via con **Photon**
  (`photon.komoot.io`: dati OSM, gratuito, senza chiave, uso corretto e
  nessuna garanzia). Richiesta all'invio, non a ogni lettera, al massimo 5
  risultati. Il luogo scelto diventa la partenza; il GPS, quando risponde,
  torna a vincere.
- **Margini dello schermo** con `react-native-safe-area-context`: il
  `SafeAreaView` di React Native è deprecato.
- Dipendenze nuove: `react-native-webview`, `expo-location`,
  `react-native-safe-area-context`, nelle versioni dell'SDK 57, licenza
  MIT, tutte già dentro Expo Go.

**Motivo**: la mappa usa gli stessi dati OSM su cui traccia il motore,
quindi i sentieri del percorso si vedono; è la stessa su iPhone e Android;
non servono chiavi né account; resta MapLibre, e stile e provider si
riusano con MapLibre nativo se un giorno arriva una development build.
Scartati: `react-native-maps` (su iPhone è Apple Maps, senza i dati OSM; su
Android Google Maps con chiave e fatturazione), MapLibre React Native (non
gira in Expo Go), Leaflet con le tile OSM (la loro policy non è per un'app
distribuita); per la ricerca, il geocoder del telefono (su Android vuole
proprio il permesso che manca, e restituisce solo coordinate senza nomi) e
Nominatim (per le app chiede un server intermedio con cache e al massimo
una richiesta al secondo in tutto).

**Conseguenza**: l'app chiama direttamente due servizi esterni, le tile e
Photon; non sono servizi nostri, quindi ARCHITECTURE §4 («`mobile` parla
solo con `api`») non cambia. Senza rete non ci sono né mappa né ricerca, e
l'app lo dice. Il provider delle tile vede quale zona si guarda, Photon il
testo cercato (`UI.md`). OpenFreeMap e Photon non garantiscono nulla: si
cambiano in una costante ciascuno, e con molti utenti si potranno mettere
dietro l'API (TASK-022). A ogni avvio a freddo la WebView scarica circa
1 MB di MapLibre GL JS. La mappa vera non gira in Jest: nei test WebView,
posizione e rete sono finte, la pagina si prova sul telefono.

## ADR-0030 — API FastAPI sul route-engine, grafi di zona in memoria
**Stato**: Attiva · 2026-09-23 · l'app non usa più `POST /routes` ma le
richieste in due tempi, e il lucchetto unico dei grafi è diventato uno per
zona (ADR-0032)

TASK-022 espone il route-engine al telefono. Servivano forma dell'API,
errori, gestione dei grafi e una risposta ad ADR-0009 e alla domanda
lasciata aperta da ADR-0028 sui tipi generati. Confermato dall'utente.

**Decisione**:
- **Pacchetto** `services/api/` (`shaperoute_api`), Python 3.11, FastAPI e
  uvicorn; httpx solo per i test. Il route-engine si installa accanto, nello
  stesso ambiente. `python -m shaperoute_api` risponde solo al PC; con
  `--lan` alla Wi-Fi, e stampa l'indirizzo per il telefono.
- **Endpoint**: `GET /health` e `POST /routes`, con `RouteRequest` e
  `RouteResult` identici a `shared-types`. Richiesta sincrona. Niente
  autenticazione, prefisso di versione e CORS finché l'API gira solo sul PC.
- **Errori** tutti come `{"error": {"code", "message"}}`:
  `invalid_request` e `shape_not_drawable` (422), `map_data_unavailable`
  (503), `engine_error` (500), `http_error` per indirizzi e metodi
  sbagliati. I limiti dei valori restano solo in `models.py`.
- **Grafi**: l'API tiene in memoria gli ultimi 2 grafi di zona e ritaglia
  in memoria, senza salvare i ritagli; le zone nuove si scaricano e si
  salvano come con la CLI. Nel route-engine `read_graph` diventa pubblica.
- **Tipi**: niente generazione dall'OpenAPI. I modelli Pydantic leggono
  gli stessi JSON di esempio di `shared-types`, come `tsc` e il test del
  motore.
- **ADR-0009** (motore di routing di produzione) rinviata alla fase 4.
- **CI**: job `api` con lint e test.

**Motivo**: la CLI salva ogni ritaglio, da 3 a 110 MB per partenza: con
un'API il disco del PC, già quasi pieno, finirebbe in poche decine di
richieste; tenere la zona in memoria evita anche di rileggerla. Con due
oggetti nel contratto un generatore di tipi costa più di quanto risparmia,
e i JSON di esempio tengono già allineate le tre copie. OSRM, GraphHopper e
Valhalla sono server a parte e non conoscono zone e corridoio (ADR-0022):
adottarli vuol dire riscrivere lo snapping, meglio con i tempi misurati in
uso vero. `--lan` esplicito perché un'API senza autenticazione aperta alla
rete deve essere una scelta, non il default.

**Conseguenza**: un grafo di zona in memoria occupa centinaia di MB, da
qui il limite di 2. La prima richiesta in una zona legge il grafo dal
disco, le altre no. Con `--lan` chiunque sulla stessa Wi-Fi può chiedere
percorsi: va usata solo su reti di casa. Se il telefono non aspetta la
risposta di una richiesta lunga, le richieste in due tempi si decidono con
TASK-023.


## ADR-0031 — L'app chiede i percorsi all'API: indirizzo, attesa, errori
**Stato**: Attiva · 2026-09-23 · la richiesta sincrona e il limite di 60 s
sono superati da ADR-0032; i pulsanti delle distanze da ADR-0034, quelli
delle forme da ADR-0036

TASK-023 collega l'app all'API di ADR-0030. Servivano l'indirizzo
dell'API, la scelta di forma e distanza, l'attesa, il disegno del percorso
e un messaggio per ogni errore. Confermato dall'utente, per questa prima
fase.

**Decisione**:
- **Indirizzo**: l'host del server di sviluppo di Expo
  (`Constants.expoConfig.hostUri`) con la porta 8000; `expo-constants`
  diventa una dipendenza dichiarata. Senza host l'app lo dice, non tira a
  indovinare.
- **Forma e distanza** fra pulsanti: `circle` e `heart`; 3, 5, 10, 15 km;
  di partenza cuore da 5 km; attività sempre `running`.
- **Richiesta sincrona**, niente richieste in due tempi. L'app smette di
  aspettare dopo 60 s e ha «Cancel»; una partenza, una forma o una
  distanza nuove scartano l'esito di prima.
- **Percorso sulla mappa** con i messaggi `showRoute` e `clearRoute`, punti
  in `[lon, lat]` da `toLngLat`; il segnaposto resta sulla partenza
  chiesta.
- **Risultato**: distanza reale contro distanza chiesta e avvisi del
  motore così come sono; la somiglianza non si mostra come numero.
- **Errori**: un messaggio per caso (`UI.md`, «Quando non va»).
- **Contratto**: `ApiError` e `API_ERROR_CODES` entrano in `shared-types`,
  con `api-error.json` e `api-error-codes.json` controllati da `tsc`, dal
  test di Node e dal test di contratto dell'API.

**Motivo**: il telefono raggiunge già il PC per scaricare l'app, quindi
l'indirizzo non va scritto a mano e non cambia a ogni rete. Le distanze
proposte sono quelle con tempi misurati; i tempi (7–32 s, `API.md`) stanno
sotto i circa 60 s dopo cui iOS chiude una richiesta ferma, e la richiesta
sincrona basta. `PRODUCT.md` vuole che la forma la giudichi l'occhio: un
numero di somiglianza direbbe altro. Il corpo degli errori è contratto come
richiesta e risultato, e si allinea allo stesso modo.

**Conseguenza**: l'indirizzo vale solo in sviluppo; quello di produzione
arriva con l'hosting (fase 4). Una richiesta che supera i 60 s, di solito
perché la zona va scaricata, finisce in «nessuna risposta»: l'API però
finisce il lavoro e salva la zona, e il tentativo dopo trova la cache.
L'utente ha chiesto, per dopo questa fase, campi liberi per ogni distanza e
ogni forma (`ROADMAP.md`, fase 2).

## ADR-0032 — Richieste in due tempi: accettata subito, chiesta finché è pronta
**Stato**: Attiva · 2026-09-23

Sull'iPhone (TASK-023) i 15 km e le zone nuove superavano i circa 60 s che
il telefono aspetta una risposta: l'API finiva il lavoro, ma il telefono
non c'era più. Confermato dall'utente (TASK-025).

**Decisione**:
- **Endpoint**: `POST /route-jobs` risponde subito `202` con un `RouteJob`;
  `GET /route-jobs/{job_id}` ne dà lo stato e, alla fine, il percorso o
  l'errore; `DELETE /route-jobs/{job_id}` annulla. `POST /routes` resta per
  `/docs`, `curl` e le misure.
- **Stati**: `queued`, `downloading_map`, `computing`, `done`, `failed`.
  Nessuna percentuale.
- **Dove girano**: due thread nel processo dell'API; le richieste stanno in
  memoria e si dimenticano 10 minuti dopo la fine. Nessuna dipendenza
  nuova. Una richiesta annullata in coda non parte; una annullata mentre
  carica il grafo si ferma prima di calcolare; una che calcola finisce nel
  suo thread e il risultato si butta.
- **Un lucchetto per zona** invece di uno per tutti i grafi.
- **L'app** chiede lo stato ogni 2 s, fino a 5 minuti; perdona due errori
  di rete di fila; con «Cancel» o allo scadere manda il `DELETE`. Il
  pannello dice lo stato: attesa, download, calcolo.
- **Contratto**: `RouteJob` e `JOB_STATUSES` in `shared-types`, con JSON di
  esempio per una richiesta in corso, finita e fallita, e per gli stati,
  letti da `tsc`, dal test di Node e dai modelli Pydantic.

**Motivo**: la richiesta sincrona dipende da quanto aspetta il telefono, e
né il download di una zona (72–100 s sui dati mobili) né un 15 km (30–65 s)
ci stanno con margine. Chiedere ogni 2 s costa poche richieste piccole e
non ha bisogno di nuove librerie né di tenere aperta una connessione. Due
thread e non uno perché un calcolo già partito non si interrompe: con un
thread solo, annullare un 15 km lascerebbe in coda la richiesta dopo. Il
lucchetto unico faceva aspettare un 5 km in una zona in memoria dietro il
download di un'altra zona.

**Conseguenza**: riavviare l'API perde le richieste in corso, e l'app lo
dice («lost»). Due richieste insieme si dividono il processore: un 15 km
che finisce nel suo thread rallenta quella dopo, anche se non la blocca.
Una zona si scarica e si salva anche quando la richiesta viene annullata:
circa 40 MB per zona, più le risposte di Overpass in `data/cache/http/`.
Con l'hosting (fase 4) le richieste dovranno sopravvivere a un riavvio e a
più processi: servirà una coda vera. Il motore resta lento sui 15 km,
oltre i 30 s di `PRODUCT.md`: è un lavoro a parte.

## ADR-0033 — Il GPX per il telefono lo scrive l'API, con l'export del motore
**Stato**: Attiva · 2026-09-23

TASK-024 porta l'export GPX nell'app. Servivano chi scrive il file, come
il telefono lo salva e lo condivide, e l'attribuzione di OpenStreetMap.
Confermato dall'utente.

**Decisione**:
- **`POST /gpx`** nell'API riceve `{request, result}` (`GpxRequest`) e
  risponde il GPX scritto da `to_gpx` e `route_name` del motore, con il
  nome del file nell'intestazione (`shaperoute-heart-5km-2026-09-23.gpx`).
  Non ricorda niente.
- **Sul telefono** il file va nella cartella temporanea dell'app
  (`expo-file-system`) e si apre il foglio di condivisione di iOS
  (`expo-sharing`, tipo `com.topografix.gpx`). Dipendenze nuove, MIT,
  dentro Expo Go; `expo install` ha aggiunto il plugin di `expo-sharing` in
  `app.json`.
- **Attribuzione OSM** nei metadati di ogni GPX, anche della CLI:
  `<copyright author="OpenStreetMap contributors">` con la licenza ODbL e
  un `<link>` a `https://www.openstreetmap.org/copyright`.
- **Nell'app** il pulsante «Export GPX» sotto il risultato, con «Preparing
  GPX…» mentre aspetta; gli errori usano i messaggi che ci sono già, più
  due per il telefono (niente foglio di condivisione, file non salvato).
- Il GPX **resta nel motore**: niente `services/export/` finché non
  arrivano i formati per orologi.
- `GpxRequest` entra nel contratto, con il suo JSON di esempio controllato
  da `tsc`, dal test di Node e dai modelli Pydantic.

**Motivo**: un solo scrittore di GPX, già provato dalla CLI e dai campioni,
vuol dire che il file del telefono e quello della CLI sono uguali, e un
test lo controlla. Un endpoint che non ricorda niente non dipende dai 10
minuti di vita delle richieste in due tempi (ADR-0032). Mettere il GPX in
ogni `RouteJob` finito appesantirebbe tutte le risposte per un file che non
tutti vogliono; scriverlo nell'app sarebbe un secondo scrittore da tenere
allineato. Il percorso nasce da dati OSM: la licenza ODbL chiede di dirlo
dove il dato viaggia, e un GPX viaggia.

**Conseguenza**: l'export ha bisogno dell'API accesa, come il calcolo. I
campioni scritti prima del TASK-024 non hanno l'attribuzione e restano come
sono (ADR-0014). Il file nella cartella temporanea può sparire: chi lo vuole
tenere lo salva dal foglio di condivisione.

## ADR-0034 — La distanza si scrive in km, fino a 21 km nell'app
**Stato**: Attiva · 2026-09-23

L'utente ha chiesto un campo libero per la distanza al posto dei pulsanti
(`ROADMAP.md`, fase 2). Oltre i 15 km non c'erano misure: TASK-026 ha
misurato 21 e 30 km a Trento. Confermato dall'utente.

**Decisione**:
- **Un campo «km»** con il tastierino numerico al posto dei pulsanti 3, 5,
  10 e 15 km, senza scorciatoie. Accetta interi e un decimale, con la
  virgola o con il punto; al contratto va `distance_m` intero (7,5 km →
  7500). La conversione è una funzione pura, `toDistanceM`. Di partenza 5.
- **Limite dell'app: 21 km**, in una sola costante (`MAX_APP_DISTANCE_KM`).
  Motore e contratto restano a 1–50 km (ADR-0016).
- **Fuori limite**: «Enter a distance between 1 and 21 km.» sotto il campo,
  e «Draw route» spento. Sopra i 15 km, un avviso prima della richiesta:
  «Long routes take longer: up to a few minutes.»
- La **forma** resta a pulsanti: la forma libera è fase 4.
- **Tastiera**: la schermata si accorcia quando si apre (`KeyboardAvoidingView`
  di React Native), e «Draw route» la chiude, perché il tastierino di iOS
  non ha il tasto invio. Nessuna dipendenza nuova.

**Motivo**: l'app offre la distanza più lunga che arriva entro i 5 minuti
di attesa (ADR-0032) anche in una zona nuova. A Trento il calcolo cresce
poco con la distanza (36–47 s a 21 km, 28–42 s a 30 km); cresce il
download della zona: 105 s a 21 km, 279 s a 30 km, che da solo quasi
esaurisce i 5 minuti, e sui dati mobili è più lento. A 30 km il cuore di
Trento non si disegna. Un campo solo, senza pulsanti, è quello che l'utente
ha chiesto; il limite in una costante si alza quando il download sarà più
veloce.

**Conseguenza**: le distanze fra 21 e 50 km le accetta solo la CLI o
`/docs`. Una zona da 21 km pesa circa 55 MB su disco, più la risposta di
Overpass (`API.md`, «Oltre 15 km»). Alzare il limite chiede prima un modo
più veloce di avere i dati delle zone (ADR-0009). Il tastierino segue la
lingua del telefono: per questo si accettano sia la virgola sia il punto.

## ADR-0035 — Forme da un contorno in un file, per ora solo dalla CLI
**Stato**: Attiva · 2026-09-24 · la spiegazione della somiglianza generosa
è corretta da ADR-0037; i tratti ripassati si aggiungono con ADR-0039

Prima di catalogo e AI (fase 3, `ROADMAP.md`) serviva sapere se le strade
reggono forme più complesse di cerchio e cuore. TASK-032 le ha provate da
file. Confermato dall'utente.

**Decisione**:
- **Il contorno è un JSON** con `name`, `source`, `license` e `points`: un
  solo contorno chiuso (l'ultimo punto ripete il primo), senza buchi, pezzi
  separati o incroci; `x` verso destra e `y` verso l'alto, a qualsiasi
  scala. Il motore lo porta in `[-1, 1]²` e lo ricampiona a 64 punti come
  le altre forme; un file sbagliato è rifiutato con il motivo
  (`shapes/outline.py`). Solo la libreria standard.
- **Solo dalla CLI**: `--outline FILE` al posto di `--shape`.
  `RouteRequest`, contratto, API e app non cambiano. Il lavoro di
  `plan_route` passa a `plan_shape`, che accetta qualsiasi forma
  normalizzata con il suo nome; `plan_route` la chiama con la forma
  registrata. La CLI controlla partenza, distanza e attività con gli stessi
  controlli di `RouteRequest` (`check_start`, `check_distance`,
  `check_activity`).
- **Forme di prova** in `services/route-engine/outlines/`: stella e casa
  disegnate per ShapeRoute, la sagoma di un cavallo al galoppo (OpenClipart
  via FreeSVG, CC0; solo il contorno esterno, convertito da uno script
  usa-e-getta fuori dal repository).
- **Nessuna taratura**: 64 punti, angoli sopra 60°, regole sulle andate e
  ritorno restano come sono.

**Motivo**: provare forme nuove senza prometterle all'app; quali entrano
nel contratto lo decide il catalogo (TASK-033). Fonte e licenza nel file
tengono tracciabile ogni disegno che non è nostro. Gli stessi controlli di
`RouteRequest` fanno fallire allo stesso modo una richiesta sbagliata, con
o senza contorno.

**Conseguenza**: il cancello della fase 3 è superato (giudizio
dell'utente, `samples/LOG.md`): la **stella** si riconosce ovunque, il
**cavallo** a Levico e Milano e quasi a Trento. La **casa** no: senza
camino né porta non si legge come casa da nessuna parte; con camino e porta
(v2) quasi a Milano, no a Trento e Levico. Regge un contorno riconoscibile
dalla sagoma grande (punte, zampe, testa); non regge una forma che si
riconosce da dettagli di poche centinaia di metri o da lati dritti, fuori
da una rete fitta come Milano. La **somiglianza calcolata è più generosa
dell'occhio** sulle forme complesse (casa 0,76–1,00 giudicata `no`): la
tolleranza del 2% del perimetro, 200–300 m, copre i dettagli che mancano.
A Trento e Levico le zampe del cavallo diventano andate e ritorno: dal 5 al
17% del percorso su strade già fatte, dove il limite è il 5%, con un
avviso. Le finestre della
casa, chieste dall'utente, stanno dentro il contorno: servono forme di più
pezzi e tratti percorsi due volte, un lavoro a parte da decidere.

## ADR-0036 — Catalogo delle forme: solo quelle giudicate a occhio, scritte in un riquadro
**Stato**: Attiva · 2026-09-24 · deciso dall'agente su delega dell'utente;
il catalogo cresce con luna, gatto e pesce (TASK-039)

TASK-033 porta nell'app le forme nuove di TASK-032. L'utente, prima di
lasciare lavorare l'agente da solo, gli ha chiesto di prendere le decisioni
migliori senza chiedere: questa voce le registra, perché possa rivederle.

**Decisione**:
- **Nel catalogo entra una forma solo se l'utente l'ha giudicata a occhio**
  sulle strade, con `sì` o `quasi` in almeno una zona (`samples/LOG.md`).
  Oggi: `circle`, `heart`, `star`, `horse`. La casa resta fuori, anche con
  camino e porta.
- **Il catalogo è contratto**: `star` e `horse` entrano in
  `SUPPORTED_SHAPES` del motore, nello schema dell'API, in `SHAPES` di
  `shared-types` e in `contract.json`. Supera le forme ammesse di ADR-0016.
- **I contorni sono dati del pacchetto del motore**,
  `route_engine/shapes/outlines/`, dichiarati in `pyproject.toml`: l'API li
  legge all'avvio anche senza i sorgenti accanto. Ci stanno anche i contorni
  solo di prova (la casa), non registrati come forme.
- **Il riquadro della forma** nell'app è un campo di testo, di partenza
  «heart», nella stessa riga dei km. Una tabella di parole (`shapeWords.ts`)
  porta la parola alla forma: inglese e italiano, singolare e plurale, con o
  senza articolo, accenti e maiuscole indifferenti. Una parola che non è il
  nome della forma lo conferma sotto il campo («→ horse»); una sconosciuta
  spegne «Draw route» con «Unknown shape. Try: circle, heart, star or
  horse.». Niente AI.

**Motivo**: la forma la giudica l'occhio (`PRODUCT.md`), e la somiglianza
calcolata è più generosa dell'occhio sulle forme complesse (ADR-0035):
offrire una forma mai guardata vorrebbe dire promettere un disegno che forse
non si riconosce. Una tabella di parole copre i nomi che l'utente scrive
davvero, è deterministica e si prova con test; le frasi libere («stemma
della Ferrari») restano all'AI di TASK-030. Tenere i contorni nel pacchetto
evita un percorso di file che vale solo con l'installazione in sviluppo.

**Conseguenza**: aggiungere una forma al catalogo vuol dire disegnarla,
generare i campioni, farla giudicare all'utente, poi registrarla e
aggiungerne le parole. Nell'app le forme non si vedono più come pulsanti:
chi non sa cosa scrivere lo scopre dal messaggio, o dal suggerimento nel
campo vuoto. L'API risponde `invalid_request` a una forma fuori catalogo,
come prima.

## ADR-0037 — La somiglianza resta com'è; l'orientamento conta per l'occhio
**Stato**: Attiva · 2026-09-24 · deciso dall'agente su delega dell'utente

TASK-035 doveva trovare una somiglianza che andasse d'accordo con l'occhio,
dopo che TASK-032 e TASK-034 avevano mostrato percorsi con 0,83–1,00
giudicati `no`.

**Decisione**:
- **La somiglianza del motore non cambia** (fit al 2% con la penalità
  sugli angoli, ADR-0025).
- **Il metodo resta**: il motore è deterministico, quindi i casi giudicati
  si rigenerano identici e ogni misura nuova si confronta con i giudizi
  dell'utente prima di entrare nel motore.
- **Prossimo passo**: tenere dritte, entro pochi gradi, le forme che hanno
  un alto e un basso; con campioni nuovi da giudicare.

**Motivo**: su 60 casi giudicati (senza la casa, dove conta il disegno)
nessuna delle 16 misure provate separa i `no`: copertura, precisione e fit
all'1% e allo 0,5%, angoli mancati, Hausdorff, Fréchet, zigzag e svolte
del percorso. La media dei `no` sta sempre fra quella dei `sì` e quella
dei `quasi`. Una tolleranza più stretta separa appena meglio i `sì` dai
`quasi` (coppie ordinate come l'occhio 0,83 contro 0,79): troppo poco per
cambiare tutti i percorsi. Invece, senza cerchio e casa, 25 `sì` su 26
sono dritti, e 8 dei 10 casi inclinati di 15° o più sono `no` (TASK-035,
«L'orientamento»).

**Conseguenza**: la spiegazione di ADR-0035, «la tolleranza del 2% copre i
dettagli che mancano», era sbagliata: la somiglianza misura quanto il
percorso segue il contorno piazzato, e lo misura bene; l'occhio giudica
anche orientamento, disegno e grandezza. Un numero alto non promette una
forma riconoscibile: per questo il catalogo resta legato al giudizio a
occhio (ADR-0036). 16 `no` su 24 sono dritti: sulle strade di Trento e
Levico, a 10–15 km, molte forme non passano comunque. Lì servono i tratti
ripassati e la scelta del posto (`ROADMAP.md`).

## ADR-0038 — Le forme restano dritte, tranne il cerchio
**Stato**: Attiva · 2026-09-24 · deciso dall'agente su delega dell'utente;
confermato dal giudizio dell'utente sui campioni

TASK-035 ha mostrato che l'occhio non riconosce una forma inclinata: 25
`sì` su 26 erano dritti, 8 dei 10 casi inclinati di 15° o più erano `no`.
La ricerca invece ruotava la forma su tutto il giro (ADR-0023).

**Decisione**:
- **Inclinazione massima 15°** (`MAX_TILT_DEG`): la ricerca prova −15°, 0°
  e +15°, e la rifinitura resta dentro lo stesso limite.
- **Il cerchio gira libero** (`FREE_ROTATION`): è lo stesso a ogni angolo,
  e la rotazione attorno alla partenza lo sposta dove le strade lo reggono.
- Vale per il catalogo e per i contorni da file della CLI.
- Nessun altro parametro cambia (fasi, partenze, scale).

**Motivo**: rigenerati i 60 casi giudicati (senza cerchio e casa v1), 45
non cambiano e 15 escono dritti; nessuno è rifiutato. Il giudizio
dell'utente sui 15: 7 migliorano e nessuno peggiora. Il cuore di Levico da
15 km passa da `quasi` a `sì`, la luna di Levico da 10 km da `no` a `sì`;
pesce di Trento, freccia di Trento da 15 km, albero di Levico e gatto di
Trento da `no` a `quasi` (`samples/LOG.md`, TASK-036).

**Conseguenza**: con meno rotazioni la ricerca ha meno posizioni e fa meno
conti. In un posto dove la forma ci sta solo inclinata, esce dritta ma
seguita peggio: non è successo nei casi provati, e il rimedio è cercare il
posto (TASK-038), non inclinarla. La luna ora ha un `sì` a Levico e può
entrare nel catalogo (ADR-0036). Le forme ancora a `no` si riconoscono da
un occhio, una finestra, una rientranza: servono i tratti interni ripassati
(TASK-037).

## ADR-0039 — Tratti ripassati: linee e anelli dentro la forma
**Stato**: Attiva · 2026-09-24 · deciso dall'agente su delega dell'utente;
il giudizio dell'utente sui campioni lo sostiene a Trento e Milano, non a
Levico

Le forme ancora a `no` dopo TASK-036 si riconoscono da un dettaglio
interno, e l'utente ha chiesto di disegnarli come nella Strava art, con
tratti di andata e ritorno. Un contorno era un solo anello, e il motore
potava e segnalava ogni ripasso (ADR-0026).

**Decisione**:
- **Formato**: il JSON del contorno accetta `strokes`, facoltativo. Un
  tratto parte dal contorno o da un tratto precedente; una linea si
  percorre fino in fondo e ritorno, un tratto che finisce su un suo punto
  chiude un anello, percorso una volta. Niente incroci con il contorno, fra
  tratti o su se stessi (`ROUTE_ENGINE.md` §2).
- **Una sola traccia**: il motore inserisce ogni tratto dove parte, e
  ricampiona la linea tenendo tutti i vertici, così andata e ritorno
  coincidono. Senza tratti, il contorno si ricampiona come prima.
- **Potatura e misure**: i lati che la forma disegna due volte (entro 1 m
  da un altro lato percorso in senso contrario) si riconoscono dalla
  geometria, senza altri dati. Verso
  quei punti le strade già percorse non costano di più; la punta di ogni
  linea è un angolo e la potatura la tiene. Entro il 2% del perimetro da un
  tratto nulla conta come ripercorso, né esatto né a vista.
- **Somiglianza**: la stessa misura, sulla forma intera con i tratti.
- **Tolleranze dimezzate per le forme con tratti** (`STROKE_DETAIL` = 0,5):
  raggio delle zone, fascia del corridoio e tolleranza della somiglianza
  passano dal 2% all'1% del perimetro. Le forme senza tratti non cambiano.
- **Forme**: finestre alla casa, fusto e tre coppie di rami all'albero,
  occhi al gatto, occhio al pesce.

**Motivo**: con le tolleranze al 2% del percorso, a 15 km circa 300 m, i
dettagli erano larghi quanto la tolleranza: il percorso passava accanto a
finestre e rami senza disegnarli, e la somiglianza non se ne accorgeva
(albero di Levico 0,99 senza un ramo). All'1% i dettagli entrano nella
ricerca. Giudizio dell'utente sui 12 casi da 15 km (`samples/LOG.md`,
TASK-037): a Trento gatto e pesce `sì` (prima `quasi` e `no`), casa
`quasi` (prima `no`), albero `no` come prima; a Milano tutti `sì` (la casa
prima era `quasi`); a Levico casa e albero `no` (l'albero prima era
`quasi`), gatto e pesce non disponibili (prima `no`). Quattro casi
migliorano, uno peggiora. Le forme del catalogo non hanno tratti e danno
gli stessi percorsi di prima.

**Conseguenza**: i dettagli si disegnano dove le strade sono fitte, e a
Levico no: le strade rade reggono il contorno, non i dettagli a 15 km. Il
rimedio è cercare il posto dove la forma ci sta (TASK-038), o distanze più
lunghe. Gatto e pesce con i tratti hanno ora un `sì` a Trento e a Milano:
possono essere proposti per il catalogo (ADR-0036), in un task a parte.
L'albero con fusto e sei rami è troppo fitto per 15 km. Il 50% di
`STROKE_DETAIL` è un primo valore, da ritarare con altri giudizi.

## ADR-0040 — Trova dove la forma ci sta: una seconda ricerca fino a 2 km
**Stato**: Attiva · 2026-09-24 · proposto dall'agente, approvato
dall'utente; confermato dal suo giudizio sui campioni

Chi fa Strava art sceglie il posto dove la forma ci sta. Il motore invece
cercava solo entro 500 m dalla partenza (ADR-0025): a Levico, a 15 km, gatto
e pesce non erano disponibili e la casa non si riconosceva (ADR-0039).

**Decisione**:
- **Due tempi.** Prima la ricerca di sempre. Solo se non trova un percorso
  buono (distanza ±10%, somiglianza ≥ 0,90), o la forma non è disponibile,
  una seconda ricerca parte da 1, 1,5 e 2 km in 12 direzioni, con altri 20
  tracciamenti (`FAR_RINGS_M`, `FAR_BEARINGS`, `FAR_TRACES`).
- **Il percorso lontano vince solo se è buono**, o se quello vicino non
  c'era. Lo spostamento costa come prima: fra due posti buoni, il più
  vicino.
- **Zona più grande solo nel secondo tempo**: il grafo copre la forma da
  una partenza a 2 km; dove la cache non basta si scarica.
- **Contratto invariato**: il percorso comincia da `points[0]`, e l'avviso
  dice quanto e dove si è spostato. Il rifiuto dice «… nor within 2 km».
- **L'app** mette un segnaposto verde «Start here» sul primo punto del
  percorso quando comincia a più di 50 m dalla partenza chiesta, e inquadra
  tutti e due i segnaposti.

**Motivo**: a Levico 15 km gatto e pesce con gli occhi trovano posto a 1 km
(est e nord-ovest) e l'utente li giudica `sì`: prima non erano disponibili.
Anche il cuore di Trento 15 km e la stella di Levico 10 km, `sì` ma non
buoni per il motore (0,87; −11% dal target), si spostano di 1 km, e restano
`sì` (`samples/LOG.md`, TASK-038). Dove la ricerca vicina è buona (cerchio,
cavallo, albero di Levico) niente cambia; la casa di Levico resta dov'era,
perché lontano il motore trova 0,86, non abbastanza.

**Conseguenza**: una forma che non va vicino costa un secondo tempo:
12–14 s per gatto e pesce a Levico, fino a 52 s per il cuore di Trento da
15 km, che prima consuma tutta la ricerca vicina (`API.md`, «Tempi»). Il
primo secondo tempo in una zona non in cache la scarica: 42 s per quella di
Levico. Il posto si cerca solo quando la somiglianza del motore dice che la
forma non va: dove l'occhio non è d'accordo (l'albero di Levico) non si
sposta.

## ADR-0041 — Quando la forma non ci sta, proporre la distanza che ci sta
**Stato**: Attiva · 2026-09-24 · scelto dall'utente fra quattro proposte
dell'agente (TASK-031)

Quando il motore rifiuta perché il percorso migliore segue la forma ma è
lontano dalla distanza chiesta, la sua lunghezza è già nota: il rifiuto la
porta (`ShapeNotDrawableError.best_distance_m`) e l'API la restituisce
arrotondata al km come `suggested_distance_m`, fra 1 e 50 km. L'app, se è
entro i 21 km che offre, mostra «Try N km», che scrive la distanza e
ridisegna. Se il motivo è la somiglianza, o la distanza è oltre 21 km, l'app
propone le forme del catalogo da toccare. Il campo c'è in ogni errore,
`null` fuori da questo caso.

**Scartate**: provare le altre forme del catalogo nella stessa zona e
proporre quelle che riescono (5–25 s a forma: minuti di attesa); le due
cose insieme; solo testi più chiari.

**Motivo**: nessun calcolo in più, e una via d'uscita da toccare.

**Conseguenza**: la distanza proposta non è garantita: un nuovo disegno
rifà la ricerca, che a quella distanza di solito trova lo stesso percorso,
ma può rifiutare ancora.

## ADR-0042 — Scritte: una linea chiusa percorsa così com'è
**Stato**: Attiva · 2026-09-24 · tratto singolo e parola corta scelti
dall'utente; il formato proposto dall'agente; giudizio dell'utente sui
campioni: `quasi`

La fase 4 comincia dalle scritte (`ROADMAP.md`). L'utente ha scelto il
tratto singolo, come nella Strava art, e di provare subito una parola
corta. Il contorno di ADR-0035 è un anello che non si incrocia, con tratti
appesi (ADR-0039): una parola a tratto singolo non ci entra.

**Decisione**:
- **`path`** al posto di `points` e `strokes`: una sola linea chiusa,
  percorsa così com'è, che può ripassare e toccare se stessa
  (`ROUTE_ENGINE.md` §2). Il resto del motore non cambia: i lati
  ripassati li riconosce già dalla geometria, e con loro dimezza le
  tolleranze (ADR-0039); le forme restano dritte (ADR-0038).
- **«CIAO»** (`shapes/outlines/ciao.json`), disegnato per ShapeRoute:
  maiuscole alte 1 unite da una linea di base; il ritorno alla partenza
  ripassa la base e le gambe della A, per non chiudere la A a triangolo.
  Solo dalla CLI: contratto, API e app non cambiano.

**Motivo**: la cosa più piccola che permette di giudicare una parola a
occhio, senza toccare il motore oltre il formato del file.

**Conseguenza**: a 15 km «CIAO» dà un percorso a Trento (0,93), Levico
(0,91) e Milano (1,00), e l'utente lo giudica `quasi` in tutte e tre
(`samples/LOG.md`, TASK-040). Il giro chiuso costa: il ritorno ripassa
circa un quarto della linea (24%), e le lettere restano alte 750–930 m. Un
percorso aperto, che non torna alla partenza, lascerebbe tutta la
distanza alla parola: è TASK-041, proposto dall'utente.

## ADR-0043 — Percorso aperto: andata e ritorno pianificati, tenuta l'andata
**Stato**: Attiva · 2026-09-24 · proposto dall'utente; il metodo proposto
dall'agente; solo motore e CLI, scelto dall'utente; giudizio dell'utente
sui campioni: peggio del giro chiuso

Durante TASK-040 l'utente ha proposto che una scritta si possa correre
senza tornare alla partenza, a scelta. Il giro chiuso regge tutto il
motore.

**Decisione**:
- **Un `path` aperto è a sola andata** (`Outline.one_way`): il motore lo
  legge come andata e ritorno sulla stessa linea, una linea chiusa.
- **Si pianifica al doppio della distanza**, entrando nella forma solo alla
  fase 0, cioè all'inizio della parola (`search(phases=...)`,
  `planned_distance`). Gli scarti in percentuale e la somiglianza sono gli
  stessi per il tutto e per la metà; i messaggi parlano della distanza
  chiesta.
- **Si tiene l'andata** (`network.first_leg`): fino al nodo più vicino al
  fondo della parola, che è a metà della linea di andata e ritorno, più un
  decimo della distanza da metà percorso (`HALF_WAY_WEIGHT`). Il ritorno
  può fare strade diverse dall'andata, e metà percorso è solo indicativa;
  ma un passaggio precedente vicino al fondo (l'ingresso nella O di
  «CIAO») è chilometri prima di metà. Con peso 1 il taglio cadeva a 124 m
  dal fondo in un percorso che ci passava a 30 m; con 0,1 a 36 m.
- **Solo dalla CLI**, con l'apertura nel file (`ciao_open.json`):
  contratto, API e app non cambiano.

**Motivo**: il motore dei giri chiusi resta quello di prima, senza un
secondo modo di cercare.

**Conseguenza**: «CIAO» aperto a 15 km dà un percorso a Trento (0,96),
Levico (0,91) e Milano (1,00, ma 13,6 km e 263 s: la ricerca lontana
lavora su una zona grande il doppio). L'utente lo giudica peggio del giro
chiuso di TASK-040 (`samples/LOG.md`, TASK-041). Per una forma a sola
andata tutti i lati sono «disegnati due volte», e la misura delle strade
ripercorse non vede niente. Il percorso aperto resta disponibile dalla CLI;
nell'app arriva, se serve, con le parole.

## ADR-0044 — Parole lettera per lettera: alfabeto a tratto singolo, lettere che si spostano
**Stato**: Attiva · 2026-09-24 · chiesto dall'utente dopo TASK-041; il metodo
deciso dall'agente su delega dell'utente; giudizio dell'utente sui
campioni: `sì` nelle tre zone, molto meglio di TASK-040

Dopo TASK-041 l'utente ha chiesto lettere più distanziate, una I corsa
andata e ritorno sulla stessa strada, e di «intensificare i punti di
passaggio e creare le lettere separatamente e poi connetterle». La «CIAO»
di TASK-040 aveva 67 vertici, sopra i 64 punti del motore: lungo la I
nessun punto di passaggio.

**Decisione**:
- **Alfabeto** (`route_engine/letters.json`, per ora C, I, A, O): ogni
  lettera è alta 1 sulla sua base, con un'andata dall'ingresso all'uscita,
  tutti e due sulla base, e, se diversi, un ritorno che non passa dalla
  base: la A torna per le gambe. `words.py` compone la parola: lettere a
  0,6 dell'altezza l'una dall'altra (erano 0,3), unite sulla base, e il
  ritorno ripassa base e ritorni. Ogni lato è di al più 1/16 dell'altezza:
  296 punti per «CIAO». Dalla CLI, `--word` (`ROUTE_ENGINE.md` §2).
- **La ricerca entra nella parola solo a metà di uno spazio**, e lì la
  partenza resta ferma quando le lettere si spostano.
- **Le lettere si spostano** fino a 1/4 dell'altezza, su una griglia di
  1/16, dove i loro tratti hanno più strade entro 1/16 dell'altezza;
  lo spostamento massimo costa il 5% del conteggio. Conta la lettera sola:
  la quota sulla parola intera premiava gli spostamenti che accorciano gli
  spazi. Lo stesso conteggio, lettera per lettera, ordina i piazzamenti da
  tracciare (§5).
- **Somiglianza delle parole**: la copertura di ogni lettera entro 1/8
  dell'altezza, in media sulle lettere, in media armonica con la
  precisione sulla parola intera; niente penalità per gli angoli, che in
  una parola sono decine. Quella delle altre forme (1% del perimetro, circa
  150 m a 15 km) dava 0,92 a una «CIAO» di Trento senza metà della C e
  senza la I.
- **Ripasso sulla stessa strada**: dove la parola torna su se stessa (la I,
  la C, la base) le strade appena percorse pesano la metà
  (`snap_to_network(retrace=0.5)`); prima pesavano come le altre, e la I
  tornava su una parallela. Le altre forme non cambiano.
- Provati e scartati: zone e corridoio del tracciamento larghi 1/8
  dell'altezza invece dell'1% del perimetro. A Milano la I veniva più
  dritta, ma a Trento il percorso perdeva la O e a Levico peggiorava.

**Motivo**: ogni richiesta dell'utente diventa una regola che si prova da
sola, senza cambiare il motore per le forme del catalogo; e la ricerca
guarda le lettere, che sono ciò che l'occhio legge.

**Conseguenza**: a 15 km la somiglianza delle lettere è 0,82 a Trento, 0,86
a Levico e 0,97 a Milano (con la misura delle altre forme 0,90, 0,93 e
0,99); lettere alte 690–810 m (TASK-040: 750–930 m), perché gli spazi più
larghi tolgono distanza alle lettere. I tempi crescono a 40–140 s
(TASK-040: 8–54 s): 296 punti invece di 64, e con la misura più severa la
ricerca si ferma di rado prima del budget e prova anche lontano. Le
lettere si spostano poco: solo la O, di 43–97 m. Per l'utente «CIAO» è
`sì` a Trento, Levico e Milano, molto meglio di TASK-040
(`samples/LOG.md`).

## ADR-0045 — Indicazioni di svolta: dagli incroci del grafo, non dalle curve
**Stato**: Attiva · 2026-09-24 · deciso dall'agente su delega dell'utente
(TASK-047)

Per guidare chi corre servono le svolte. Un incrocio e il nome di una via
sono proprietà del grafo, che ha solo il motore: la funzione sta in
`route_engine/directions.py` e parte da `(grafo, nodi del percorso)`.

**Decisione**:
- **Un incrocio è un nodo con almeno 3 strade** (`MIN_BRANCHES`). Le strade
  si contano come coppie distinte (vicino, lunghezza), in entrata e in
  uscita, non con `graph.degree`: nel grafo a piedi ogni strada è un arco
  per verso, e un nodo in mezzo a una strada ha grado 4. Il grafo di
  `network.py` è semplificato (`graph_from_bbox` di OSMnx, `simplify` di
  default), ma restano nodi con due strade: 27 su 303 nella fixture di
  Levico, 22 di grado 4 (bordi tagliati, vie unite).
- **Si parla solo agli incroci**, mai sul primo e sull'ultimo nodo, e
  quando: la svolta supera 30° (`TURN_MIN_DEG`); oppure si va dritti ma si
  cambia strada (nomi diversi, o fra una via con nome e una senza); oppure
  si va dritti ma un'altra strada va dritta quanto o più di quella presa
  (un bivio): allora il verso è `left`/`right` rispetto a quella.
- **Il verso** viene dalla direzione delle due strade a 20 m dal nodo
  (`HEADING_PROBE_M`), in metri sul piano locale: `straight` fino a 30°,
  `sharp-*` da 135° (a metà fra angolo retto e tornare indietro),
  `u-turn` da 165°.
- **Il nome**: `name`, se manca `ref` (come «SP12»), se manca niente; il
  tipo di strada (`highway`) a parte, per chi mostra le vie senza nome. Un
  arco semplificato con più nomi continua la strada con cui ne condivide
  uno; altrimenti porta tutti i nomi, uniti da « / ». Mai un nome inventato.
- **Distanze** dalla partenza come somma delle `length` degli archi più
  corti, gli stessi che disegna `snap_to_network`.
- **Solo il modulo e i test**: `RouteResult`, API e app non cambiano
  (TASK-048).

**Motivo**: su cuori veri da 15 km (Trento, Levico, Milano, script usa-e-getta)
nessuna indicazione cade su un nodo che OSM stesso (`street_count`) non
conta come incrocio, e ogni cambio di strada a un incrocio ne ha una. Senza
la regola del bivio, a Trento 9 incroci si passavano in silenzio con
un'altra strada più dritta di quella presa (per esempio Via dei Masetti che
piega di 22° mentre una laterale va dritta): chi corre avrebbe sbagliato.
Il numero di indicazioni cambia poco con la sonda (10–40 m: ±5%) e più con
la soglia del dritto (Milano: 296 a 20°, 264 a 30°, 229 a 40°); 30° lascia
in silenzio le vie che piegano un poco all'incrocio senza nascondere le
svolte vere.

**Conseguenza**: 180 indicazioni a Trento, 75 a Levico, 264 a Milano, in
circa 0,1 s. Dove il grafo è fatto di marciapiedi senza nome (Milano: 213
indicazioni su 264 entrano in un `footway`) molte arrivano a coppie a pochi
metri (110 entro 15 m dalla precedente): attraversare una strada è «sinistra,
poi destra». Sono incroci veri, quindi restano; raggrupparle è compito di chi
le presenta (TASK-049). Il nome della via lungo cui corre un marciapiede non
è nel dato, e non si indovina.

## ADR-0046 — Tema Sgrava: i token in un file, lo stile della mappa nostro
**Stato**: Attiva · 2026-09-24 · tavolozza, regole e file consegnati
dall'utente (TASK-045); verifiche e registrazione dell'agente su delega
dell'utente

L'app è grigia e chiara, sopra la mappa «liberty» di OpenFreeMap, e ogni
schermata scrive a mano i suoi colori: un percorso giallo, lì sopra, quasi
non si vede.

**Decisione**:
- **Un file di token** (`apps/mobile/src/theme/tokens.ts`): colori,
  spaziature, raggi, corpi del testo, la linea del percorso e
  `MIN_TAP_SIZE` (44). Nessun colore scritto a mano fuori da lì. Un tema
  solo, scuro.
- **Il giallo `#FFD02B` è il percorso** e il comando che lo produce,
  nient'altro; gli avvisi sono `warning` (`#FF7A59`), gli errori `error`. Sul
  giallo il testo è scuro (`onAccent`). «Start here» (ADR-0040) è ciano,
  `#4DD2FF`.
- **Lo stile della mappa lo scrive l'app** (`src/map/mapStyle.ts`,
  `sgravaDarkStyle`): la stessa sorgente vettoriale OpenMapTiles di
  OpenFreeMap (`tiles.openfreemap.org/planet`, senza chiave), gli stessi
  glifi, i colori dai token. L'attribuzione nella sorgente è quella della
  TileJSON, per intero: OpenFreeMap, OpenMapTiles, OpenStreetMap. In
  MapLibre l'attribuzione di una sorgente sostituisce quella della TileJSON:
  il file consegnato diceva solo «© OpenStreetMap» e avrebbe tolto le altre
  due, che le licenze chiedono (corretto dall'agente su delega
  dell'utente).
- **I test controllano quello che fallisce in silenzio**: ogni strato ha
  sorgente e `source-layer`, gli id sono unici, le strade grandi stanno
  sopra le piccole, i colori vengono solo dai token e nessuno è il giallo.

**Motivo**: un colore si decide una volta, e mappa e pannello non si
separano più; lo stile non cambia sotto di noi quando OpenFreeMap aggiorna
il suo.

**Verificato il 2026-09-24**: la TileJSON risponde e ha tutti gli strati
usati, con `name:it` sui luoghi; il font «Noto Sans Regular», lo stesso di
liberty, risponde. Contrasti: testo scuro sul giallo 13,5:1, bianco 1,5:1;
`textMuted` 7,2:1 e `textFaint` 5,8:1 sul fondo; sulla mappa il percorso
13,2:1, «Start here» 11,0:1, i nomi dei luoghi 5,6:1.

**Conseguenza**: la mappa ha meno strati di liberty: niente nomi delle vie,
numeri civici, punti d'interesse, confini. Se le etichette si vedano
davvero lo dice solo il telefono. Le schermate usano i token da TASK-046;
fino ad allora l'app non cambia.

## ADR-0047 — Indicazioni nell'API: lista piatta, partenza prima, vicine segnate
**Stato**: Attiva · 2026-09-24 · deciso dall'agente su delega dell'utente
(TASK-048)

Le indicazioni di ADR-0045 stavano solo nel motore. Per mostrarle o dirle
servono all'app, con due cose emerse in TASK-047: la via da cui si parte, e
le coppie a pochi metri quando si attraversa una strada.

**Decisione**:
- **`RouteResult.directions`** nel motore, nell'API e in `shared-types`,
  campo per campo come il resto del contratto (ADR-0028), vuoto di
  default: `optimizer.py` non cambia, e `/routes` sincrono lo lascia vuoto.
- **Le calcola `jobs.py`** alla fine di una richiesta in due tempi, sui nodi
  di `Plan.search.best.route` e sul grafo che il loader ha dato al motore
  (l'ultimo se il percorso viene dalla ricerca lontana, ADR-0040).
- **La prima è la partenza**: `turn` `depart`, distanza 0, la via del primo
  arco (`directions.guidance`).
- **Le vicine si segnano, non si fondono**: `joined` è vero quando
  un'indicazione arriva meno di `GROUP_M` = 15 m dopo la precedente. La
  lista resta piatta e nessuna indicazione si perde; chi le presenta le
  legge insieme.

**Motivo**: una lista piatta è lo stesso tipo in Python, in pydantic e in
TypeScript, e i test del contratto la controllano già; un'indicazione che
ne contiene altre avrebbe voluto un tipo ricorsivo su tre lati. Sui cuori
da 15 km, con 15 m i momenti da annunciare scendono da 181 a 138 a
Trento, da 76 a 73 a Levico e da 265 a 155 a Milano; la catena più lunga
è di 5. Con 10 m restano coppie da attraversamento separate (Milano 190);
con 25 m a Milano le catene arrivano a 7, troppe per dirle insieme.

**Conseguenza**: il contratto cresce di un campo che l'app di oggi
ignora. La schermata e la voce sono TASK-049; i nomi dei marciapiedi,
TASK-053.

## ADR-0048 — Avvisi del motore in parole semplici, riconosciuti dall'app
**Stato**: Attiva · 2026-09-24 · chiesto dall'utente («migliorare le note
che vengono fuori»); il metodo deciso dall'agente su delega dell'utente
(TASK-054)

Gli avvisi arrivano all'app come frasi per sviluppatori («shape similarity
0.86 is below 0.90 after 18 attempts»), e l'app li mostrava così com'erano.
Il contratto non ha codici per gli avvisi, e oggi è di TASK-048
(`packages/shared-types`).

**Decisione**: l'app riconosce i testi che il motore scrive oggi, con una
regola per ciascuno (`apps/mobile/src/route/warnings.ts`), e li riscrive
brevi, con un tono: **attenzione** (scale, strade principali, gallerie,
forma poco fedele, pochi tratti di strada, pezzi di forma saltati) o
**da sapere** (partenza spostata, distanza diversa, strade ripercorse,
partenza lontana dalla strada). Prima quelli di attenzione, la stessa frase
una volta sola. Un testo sconosciuto passa com'è: un avviso nuovo non si
perde mai.

**Scartata**: codici negli avvisi del contratto, la strada pulita, ma
tocca motore, API e `shared-types` insieme, oggi di un altro task.

**Motivo**: la richiesta dell'utente subito, senza toccare file di altri.

**Conseguenza**: i testi del motore diventano un contratto nascosto. I test
di `warnings.test.ts` li copiano parola per parola: chi cambia una frase del
motore deve cambiarla anche lì, o l'app torna a mostrarla grezza. Quando il
contratto avrà i codici, questo file si toglie.

## ADR-0049 — Il modello dell'AI si carica all'avvio dell'API, in background
**Stato**: Attiva · 2026-09-24 · deciso dall'agente su delega dell'utente
(TASK-052)

La prima parola letta dall'AI paga il caricamento del modello dal disco:
40–49 s su questo PC, a ridosso dei 60 s dopo i quali iOS chiude una
richiesta (`AI.md`).

**Decisione**:
- **All'avvio l'API chiede a Ollama di caricare il modello**
  (`OllamaModel.preload`: `/api/generate` senza prompt), in un thread in
  background, con una riga di log. L'API risponde subito.
- **Non fallisce mai**: Ollama spento, modello mancante o memoria che non
  basta finiscono nel log («AI model not preloaded»); la prima parola si
  comporta come prima (`ShapeReader.warm_up`).
- **Stessa durata di prima** (`KEEP_ALIVE`, 15 minuti dall'ultima
  richiesta), non per sempre (`keep_alive: -1`).

**Motivo**: di solito l'API si accende per provare l'app subito dopo, e la
prima parola arriva entro 15 minuti. Tenere il modello caricato per sempre
occuperebbe 3,2 GB su 6,9 finché l'API è accesa, anche nelle ore in cui
nessuno scrive. Se servisse, basta cambiare `KEEP_ALIVE` per le richieste
dell'API.

**Conseguenza**: nei 15 minuti dopo l'avvio la RAM del modello è occupata
anche se nessuno scrive una parola. Con il PC carico (1,9 GB liberi, il
2026-09-24) Ollama non riesce a caricarlo entro 90 s: l'API parte lo
stesso e la prima parola resta lenta. Il tempo della prima parola dopo il
precaricamento è da misurare con il PC scarico.

## ADR-0050 — Barra di caricamento: una stima per fasi, mai oltre la fase
**Stato**: Attiva · 2026-09-24 · la barra chiesta dall'utente; la stima
decisa dall'agente su delega dell'utente (TASK-055)

L'API dice solo la fase della richiesta (in coda, download della zona,
calcolo, ADR-0032), non a che punto è. Una barra che si riempie a tempo
fisso mentirebbe: un 21 km in una zona nuova dura minuti, un 5 km in cache
pochi secondi.

**Decisione**: ogni fase ha un tratto della barra (in coda 0–8%, download
8–45%, calcolo 45–95%). Dentro la fase la barra avanza come
`1 − e^(−2t/T)`, con `T` il tempo che la fase di solito prende (in coda
4 s, download 90 s, calcolo 2,5 s a km e non meno di 10 s, dalle misure di
`API.md`): al tempo atteso è all'86% del tratto, poi rallenta senza mai
superarlo. Non torna indietro, e il 100% lo dà solo il percorso arrivato.
Gialla, come il percorso che prende forma (ADR-0046). Nessuna libreria.

**Scartate**: una barra indeterminata che va e viene (non dice niente in
più della rotellina); una percentuale vera dal motore (tocca motore, API e
contratto).

**Conseguenza**: la barra dice la verità sulle fasi e più o meno sul tempo:
un calcolo più lento del solito resta fermo poco sotto il 95%. Se le misure
dei tempi cambiano, vanno cambiate le costanti di `progress.ts`.

## ADR-0051 — La parola nell'API: `word` accanto a `shape`, una delle due
**Stato**: Attiva · 2026-09-24 · chiesto dall'utente (tramite il
coordinatore); il contratto e i limiti decisi dall'agente su delega
dell'utente

L'utente vuole scrivere nell'app la parola da disegnare. Il motore la sa
scrivere dalla CLI (ADR-0044); il contratto con l'app conosceva solo le
forme del catalogo, e l'app controlla che il risultato ne nomini una.

**Decisione**:
- **Contratto**: `RouteRequest` ha `shape` oppure `word`, l'altro assente
  o `null`; `RouteResult` ha `shape: null` e `word` (in maiuscole) per una
  parola, `word: null` per una forma. Sono aggiunte: l'app di oggi manda e
  riceve una forma come prima, e compila senza modifiche. Il nome del file
  e della traccia GPX usa la parola.
- **Controlli nel motore** (`models.check_word`), come gli altri valori:
  solo lettere dell'alfabeto, oggi A, C, I, O; al più 8 lettere; almeno
  3 km di percorso per lettera. Ogni caso è un `invalid_request` con un
  messaggio in inglese che l'app può mostrare così com'è: quali lettere
  mancano e quali ci sono, o la distanza minima.
- **Costanti in `shared-types`** (`LETTERS`, `MAX_WORD_LETTERS`,
  `LETTER_DISTANCE_M`), allineate al motore da `contract.json`: l'app può
  controllare prima di chiedere (TASK-057).

**Motivo**: 3 km per lettera perché «CIAO» è stato giudicato `sì` a 15 km,
3,75 km per lettera, con lettere alte 700–800 m, e con meno le lettere
scendono sotto quello che gli isolati di una città sanno disegnare. 8
lettere perché ognuna aggiunge circa 75 punti di passaggio a una ricerca
che per quattro dura già 40–140 s.

**Conseguenza**: nell'app, che arriva a 21 km, una parola ha al più 7
lettere. Con l'alfabeto di oggi le parole possibili sono poche: allargarlo
è una scelta chiesta all'utente. Il campo nell'app è TASK-057.

## ADR-0052 — Navigazione nell'app: il percorso già disegnato, seguito col GPS
**Stato**: Attiva · 2026-09-25 · chiesta dall'utente («come Google Maps»);
`expo-speech` approvata dall'utente il 2026-09-24; il resto deciso
dall'agente su delega dell'utente (TASK-049)

**Decisione**:
- **Si segue il percorso che c'è**, con le indicazioni di ADR-0047: niente
  ricalcolo. Oltre 40 m dalla linea (`OFF_ROUTE_M`) si dice «Off the route»
  una volta.
- **La posizione si cerca vicino a dov'era** (da 50 m indietro a 300 m
  avanti) e tornare indietro lungo il percorso costa quanto starne fuori:
  una forma passa due volte per la stessa strada (i tratti ripassati,
  ADR-0039), e il punto più vicino di tutto il percorso può essere quello
  sbagliato.
- **Una svolta si annuncia a 50 m** (`ANNOUNCE_M`, circa 15 s di corsa),
  una volta, insieme a quelle `joined`; si considera passata 10 m dopo
  l'incrocio (`PASS_M`), l'arrivo a 25 m dalla fine.
- **Voce e vibrazione**: `expo-speech` in inglese (`en-US`), come
  l'interfaccia; `Vibration` di React Native, 400 ms, per ogni svolta.
- **La mappa segue** con un messaggio nuovo, `follow`: sposta il
  segnaposto e centra a zoom 17 senza rifare l'inquadratura del percorso.

**Motivo**: la prima versione deve dire la verità su un percorso che già
esiste; ricalcolarlo vorrebbe il motore dal telefono a ogni errore, con i
tempi del motore (30–50 s sopra i 10 km).

**Conseguenza**: una dipendenza in più nell'app. Le soglie sono stime,
non misure: vanno provate correndo (TASK-049, «Esito»).

## ADR-0053 — La parola nell'app: un interruttore «Shape | Word», controllata prima di mandarla
**Stato**: Attiva · 2026-09-25 · il campo chiesto dall'utente il 2026-09-24;
la forma decisa dall'agente su delega dell'utente (TASK-057)

L'API accetta `word` al posto di `shape` (ADR-0051). Nell'app il campo
della forma manda già le parole che la tabella non conosce all'AI: un campo
solo per tutte e due renderebbe ambiguo «ciao» (una parola da scrivere, o
una forma da leggere?).

**Decisione**: sopra le tessere un interruttore «Shape | Word», lo stesso
componente della partenza (`Segmented`). Con «Word» un campo in maiuscole
prende il posto di tessere e campo della forma; la richiesta porta `word`
e non `shape`. L'app controlla la parola prima (`wordInput.ts`, con
`LETTERS`, `MAX_WORD_LETTERS`, `LETTER_DISTANCE_M` di `shared-types`) e
dice in inglese cosa non va, con «Draw route» spento. Il limite dell'app è
7 lettere: l'ottava vorrebbe 24 km, oltre i 21 dell'app (ADR-0034). Con una
distanza troppo corta un tasto «Use N km» scrive la minima. Il nome del
percorso, nell'attesa e nel risultato, è la parola fra virgolette, o la
forma.

**Scartate**: un campo unico che indovina (ambiguo con l'AI); togliere gli
accenti da sé («città» → «CITTA», l'utente non vede cosa è stato disegnato);
bloccare il campo a 7 caratteri (l'ottavo sparirebbe senza spiegazione).

**Conseguenza**: la barra usa ancora la stima delle forme, e per una parola
(40–258 s) pulsa prima (ADR-0055): «più lento del solito», non «rotto».
Se si vorrà una stima per le parole, è `progress.ts`.

## ADR-0054 — Marciapiedi senza nome: la via lungo cui corrono, dedotta a parte
**Stato**: Attiva · 2026-09-25 · file a parte per i nomi scelto
dall'utente; il resto deciso dall'agente su delega dell'utente (TASK-053)

A Milano quasi tutte le indicazioni entrano in un `footway` senza nome
(TASK-047): il marciapiede disegnato a parte, accanto alla sua via. La via
col nome spesso non è nel grafo: `FOOT_FILTER` esclude quelle con
`sidewalk=separate`, proprio quelle.

**Decisione**:
- **I nomi delle vie escluse** arrivano da una seconda richiesta a
  Overpass per zona, salvata in un file JSON accanto al grafo
  (`network.named_roads`, `MAPS.md`, «Cache»). Il grafo su cui si corre non
  cambia. **Scartato**: le stesse vie nel grafo marcate non percorribili
  (riscaricare ogni zona, circa 100 MB a Milano, e il rischio che la
  ricerca le usi).
- **La via di un marciapiede** (`sidewalks.py`): contano le vie escluse e
  le vie con nome del grafo. Il marciapiede si campiona ogni 5 m; a ogni
  campione la via con nome più vicina entro **15 m** e parallela entro
  **20°**. Vince la via che accompagna almeno **metà** dei campioni.
  Un attraversamento, perpendicolare, non prende nessuna via.
- **È una deduzione, tenuta a parte**: `alongs(...)` dà una lista
  affiancata alle indicazioni, mai dentro `street`. Non è un campo di
  `Direction`: il contratto (`schemas.py`, `shared-types`) era di un altro
  task, e un test lo vuole identico al motore. Portarla nell'API e
  nell'app è di TASK-049 o seguenti.

**Motivo**: pochi MB per zona e nessun cambio al percorso; le soglie sono
quelle della proposta, e sui cuori reggono (campione sotto).

**Conseguenza**: sui cuori da 15 km le indicazioni senza nome passano da
231 a 81 a Milano, da 118 a 57 a Trento, da 34 a 30 a Levico (sentieri di
campagna, senza vie accanto). Un campione di quattro deduzioni a Milano,
controllato su openstreetmap.org, era giusto in tutti e quattro. Restano
senza via i marciapiedi di piazze e parchi, e quelli più lontani di 15 m
dal centro della strada (i viali larghi).

## ADR-0055 — La barra in ogni attesa, e pulsa quando l'attesa si allunga
**Stato**: Attiva · 2026-09-25 · i tre punti chiesti dall'utente; la forma
decisa dall'agente su delega dell'utente (TASK-058)

La barra di ADR-0050 c'era solo nel disegno del percorso. L'utente la
vuole anche mentre la mappa si carica e mentre si aspetta l'API: la lettura
dell'AI e un'API che non risponde. In quel caso la barra restava ferma
vicino all'8% fino al timeout di iOS (60 s): sembrava bloccata.

**Decisione**: una sola barra (`EstimateBar`), con la regola di ADR-0050
(stima `1 − e^(−2t/T)`, mai indietro, mai piena da sola), usata tre volte:
percorso, lettura dell'AI (`T` = 20 s, fra i 4–10 s a modello caricato e i
39–49 s da caricare, `AI.md`), mappa con le tessere (`T` = 5 s, 0–95%).
Oltre `2T` nella stessa fase la barra **pulsa** e dice «Still waiting» allo
screen reader; la fase dopo la ferma. Niente librerie: `Animated` di React
Native.

**Scartate**: accorciare il timeout della prima chiamata (cambia quando
l'app dice «API non raggiungibile», fuori da questo task); far avanzare la
barra oltre il tratto della fase (poi resterebbe ferma alla fase dopo).

**Conseguenza**: una pulsazione vuol dire «più lento del solito», non
«rotto». Per la mappa la pagina deve dire all'app quando carica e quando ha
finito: il primo `idle` di MapLibre diventa il messaggio `loaded`. La barra
della mappa compare solo al primo caricamento, al centro della mappa
(dentro `MapView`): a ogni spostamento, in navigazione, ci sarebbe sempre.

## ADR-0056 — Alfabeto dalla A alla Z: 26 maiuscole a tratto singolo, E ed L staccate dalla base
**Stato**: Attiva · 2026-09-25 · chiesto dall'utente («sì fai tutte le
lettere dell'alfabeto»); il disegno delle lettere deciso dall'agente su
delega dell'utente (TASK-059); giudizio dell'utente: lettere nuove
approvate, E ed L staccate dalla base sì; sui campioni «MAX» `sì` nelle tre
zone, «BELLO» e «KIWI» `sì` a Milano, `quasi` a Levico, `no` a Trento

Il motore scriveva solo con C, I, A, O (ADR-0044), e l'API rifiutava ogni
altra lettera (ADR-0051): poche parole possibili.

**Decisione**:
- **22 lettere nuove** in `letters.json`, nello stesso formato; A, C, I, O
  restano identiche. Alte 1, larghe 0,5–0,65 come la A (M e W 0,8), curve
  con un punto ogni 20° come la C e la O; M con la V a 0,3 dell'altezza e
  W con la punta a 0,7, così non toccano la base; la coda della Q scende
  dall'interno della O fino alla base, e la Q esce da lì.
- **Ingresso e uscita**: ogni lettera entra dal suo punto più a sinistra
  sulla base ed esce da quello più a destra. La linea che unisce le lettere
  non passa mai sopra una lettera, e non si allunga sotto di lei.
- **La base**: la disegnano solo B, D e Z, che ce l'hanno; H, K, M, N, R,
  W, X tornano per i loro tratti, come la A, perché chiuse sotto
  diventerebbero altre figure.
- **E ed L**: il tratto in basso sta a 0,2 dell'altezza (i bracci della E
  a 1, 0,6 e 0,2). Sulla base la linea di unione se lo mangia, e a metà
  parola la E si legge F e la L si legge I. Provato e scartato: un dentino
  verso l'alto alla fine del braccio, che da lontano sembra un punto dopo
  una F o una I.
- Il messaggio per una lettera che manca dice «a word can use only the
  letters A to Z» invece di elencarle (`words.spell_letters`), anche nella
  descrizione di `word` dell'API. `LETTERS` di `shared-types` e
  `contract.json` hanno le 26 lettere.

**Motivo**: lettere dello stesso stile di «CIAO», giudicata `sì`, e le
regole di ADR-0044 estese a tutte: la A aperta sotto vale per ogni lettera
coi piedi separati. Le due scelte sulla base nascono dal guardare le parole
composte (anteprima di TASK-059), non le lettere da sole.

**Conseguenza**:
- Una lettera senza anelli si corre tutta due volte: tratto di 7,2 altezze
  per la M, 7 la W, 6,3 la N, contro 2,5–3,8 per O, A, C. Con gli spazi,
  «CIAO» è lunga 4,1 altezze a lettera, «BELLO» 5,3, «MAMMA» 6,6: a pari
  distanza le lettere vengono più piccole. A 15 km le lettere di «BELLO»,
  «KIWI» e «MAX» sono alte 493–727 m (CIAO: 690–810 m), con somiglianza
  delle lettere 0,74–0,95 (CIAO: 0,82–0,97; `samples/LOG.md`). I 3 km a
  lettera di ADR-0051 sono misurati su «CIAO»: una distanza minima che
  guardi la lunghezza del tratto invece del numero di lettere tocca
  `models.py` e il contratto, ed è fuori da TASK-059.
- Più punti di passaggio (461 per «BELLO», 297 per «CIAO») e ricerche più
  lunghe: 15–258 s a 15 km, «BELLO» 255 s a Trento e 258 s a Milano (CIAO:
  40–140 s). L'app aspetta al più 5 minuti (`MAX_WAIT_MS`): una parola di
  7 lettere con M o W a 21 km può non bastare.
- La base comincia dopo la prima lettera e finisce prima dell'ultima,
  così una I o una F in prima posizione, con la linea solo a destra, si
  leggono L ed E («IO» sembra «LO»). Proposto un tratto di base anche prima
  della prima lettera e dopo l'ultima: l'utente non lo vuole (2026-09-25),
  resta così.
- Giudizio dell'utente (2026-09-25): le lettere nuove si leggono dove le
  strade le aiutano, «MAX» ovunque, «BELLO» e «KIWI» a Milano; a Trento no.
  Per il seguito l'utente chiede che le lettere si possano unire anche
  dalla cima, se non confonde o se aiuta, e che possano avere scale
  diverse, purché non troppo da quelle vicine: TASK-067 (ADR-0063).

## ADR-0057 — `along` nell'API e nei tipi condivisi
**Stato**: Attiva · 2026-09-25 · deciso dall'agente su delega dell'utente
(TASK-060)

La via lungo cui corre un marciapiede senza nome (ADR-0054) c'era solo nel
motore, in una lista a parte; la navigazione (TASK-061) la vuole nella
risposta dell'API.

**Decisione**:
- **Un campo `along` per indicazione**, accanto a `street` e distinto da
  lui: stringa o `null`, e non `null` solo quando `street` è `null`. È un
  campo di `Direction` nel motore (`directions.py`, predefinito `None`),
  così il test che vuole il contratto uguale al motore resta com'è;
  `guidance` lo lascia `None`, lo riempie l'API (`alongs.py`). Il principio
  di ADR-0054 resta: una deduzione non entra mai in `street`.
- **Retrocompatibile**: in `shared-types` è `along?: string | null`
  (un'API precedente non lo manda), nell'API ha `null` come predefinito
  (un `GpxRequest` di un'app precedente non lo ha). La guardia dell'app
  ignora i campi che non conosce.
- **I nomi solo dalla cache**: l'API legge il file dei nomi della zona
  (`OsmnxSource.named_roads(..., download=False)`), non chiede mai a
  Overpass durante una richiesta. Senza il file, o se non si legge,
  contano le sole vie con nome del grafo: `along` non fa mai fallire un
  percorso.
- **Solo attorno al percorso**: vie del grafo e nomi si prendono nel
  riquadro del percorso allargato di 60 m (4 volte la soglia di 15 m).

**Motivo**: un campo opzionale per indicazione è la forma più semplice da
leggere per l'app, e non cambia niente per chi non lo usa.

**Conseguenza**: sul cuore da 15 km di Trento, dall'API, 118 indicazioni
senza nome, 74 senza via con le sole vie del grafo, 57 col file dei nomi
(come TASK-053); circa 0,3 s in più. Oggi il file dei nomi c'è solo per
le zone di TASK-053 (Trento, Levico, Milano): nessuno lo scarica da solo,
e una zona nuova ha le sole vie del grafo finché non si chiama
`OsmnxSource.named_roads`. Scaricarlo insieme alla zona è un seguito
possibile, non fatto qui.

## ADR-0058 — `along` nella navigazione: «beside», mai «onto»
**Stato**: Attiva · 2026-09-25 · deciso dall'agente su delega dell'utente
(TASK-061)

Con ADR-0057 ogni indicazione può avere `along`: la via che corre accanto a
una strada senza nome, dedotta dalle strade vicine. L'app la ignorava, e un
marciapiede diceva solo «Turn left onto the footpath».

**Decisione**: quando `street` manca e `along` c'è, la frase aggiunge
«beside» e la via dopo il tipo di strada: «Turn left onto the footpath
beside Via Roma», alla partenza «Head out on the footpath beside Via Roma».
Senza tipo di strada resta solo «Turn left beside Via Roma». Vale uguale
per il banner, la seconda riga e la voce, che usano la stessa funzione
(`onto` in `phrases.ts`). `street` vince sempre; senza tutti e due, e con
un'API senza `along`, la frase è quella di prima.

**Scartate**: «along Via Roma» (si legge come se la via fosse quella su cui
si corre, e a voce si confonde con «onto»); «Turn left onto Via Roma» (è un
nome dato a una strada che non l'ha, contro ADR-0045); «near Via Roma»
(troppo vago per decidere a un incrocio).

**Conseguenza**: le frasi dei marciapiedi si allungano di due o tre parole;
il nome è sempre quello di una via vera accanto, non del marciapiede.

## ADR-0059 — Corridoio più veloce, a percorsi identici
**Stato**: Attiva · 2026-09-25 · deciso dall'agente su delega dell'utente
(TASK-063)

Sopra i 10 km il motore stava fra 40 e 97 s sui casi di riferimento, e più
di metà del tempo era il corridoio (`_corridor_costs`): a ogni tracciato,
fino a 40 per richiesta, l'elenco in Python di tutti gli archi della zona
e la distanza dalla forma di tre punti per arco.

**Decisione**: si accelera senza cambiare un solo numero.
- Gli archi di un grafo e i loro passi u→v si elencano una volta e restano
  accanto al grafo, come già i punti campione (mappa debole, rifatta se
  cambia il numero di archi); i costi si calcolano con numpy.
- La distanza dalla forma si calcola una volta per punto distinto: i capi
  degli archi si ripetono, e ogni strada c'è nei due sensi.
- `distance_to_segments` lavora su x e y separati, a blocchi di circa un
  milione di coppie: la stessa aritmetica, circa il doppio più veloce.

**Perché così**: il compito chiedeva prima i tagli che non cambiano i
percorsi. Questi danno gli stessi bit (test in `test_network.py`) e, sui 13
casi misurati, gli stessi percorsi punto per punto. Corridoio da 1,3 a 4,5
volte più veloce; Trento da 15 a 21 km da 80–97 s a 35–64 s.

**Scartato, per ora**: fermare la seconda ricerca fino a 2 km (ADR-0040)
quando la prima ha già un percorso disegnabile, o darle meno tracciati:
taglia di più ma cambia i percorsi, va deciso fuori da questo task. Un
ritaglio della zona senza copia: tocca l'API (`services/api`) e il nodo
temporaneo che il motore aggiunge al grafo.

## ADR-0060 — Animali candidati: la sagoma nel contorno, i dettagli sottili ripassati
**Stato**: Attiva · 2026-09-25 · chiesto dall'utente («aumenta il numero di
forme disponibili», poi «Animali»: farfalla, uccello, cane, lumaca); il
disegno deciso dall'agente su delega dell'utente (TASK-064); giudizio
dell'utente: tutti e quattro `sì` a Milano; farfalla `quasi` a Trento e
Levico, uccello `quasi` a Levico, lumaca `sì` a Trento, il resto `no`

Il catalogo ha sette forme, e ci entra solo ciò che l'utente ha giudicato
a occhio sulle strade (ADR-0036). Servivano quattro animali da provare,
come le candidate di TASK-034.

**Decisione**:
- **Quattro contorni nuovi** in `route_engine/shapes/outlines/`
  (`butterfly`, `bird`, `dog`, `snail`), disegnati dall'agente con pochi
  punti e archi calcolati: nessuna licenza di terzi, nessun download. Si
  provano solo dalla CLI (`--outline`) finché l'utente non li giudica;
  nessun parametro del motore cambia.
- **La sagoma grande sta nel contorno** (ADR-0035): la farfalla vista
  dall'alto, simmetrica, con quattro ali e una rientranza profonda fra
  l'ala superiore e l'inferiore; l'uccello in volo di profilo, con due ali
  alzate e larghe e la coda a forbice; il cane in piedi di profilo, con
  l'orecchio alzato; la lumaca di profilo, con il guscio tondo sul corpo.
  Tutti dritti, come le altre forme (ADR-0038).
- **I dettagli sottili sono tratti ripassati** (ADR-0039): le antenne della
  farfalla, le quattro zampe e la coda del cane, la spirale del guscio (un
  giro, appesa al guscio con una linea corta come gli occhi del gatto) e le
  corna della lumaca. L'uccello resta solo contorno.
- **Campioni come la CLI, senza ritagli**: `read_outline`, `plan_shape` e
  `tilt_limit` come `--outline`, ma con i grafi di zona dell'API in
  memoria, come TASK-032 e TASK-034: nessun ritaglio in `data/cache/` (C:
  quasi pieno) e solo le zone già in cache.

**Motivo**: una prima bozza, provata sulle strade prima dei campioni, aveva
l'uccello con ali strette, il cane con le quattro zampe nel contorno e la
lumaca con una spirale di un giro e un quarto. Le ali strette si chiudevano
in una macchia; le zampe del contorno, larghe 0,11 della forma, si
riducevano a due blocchi o sparivano (un contorno senza tratti si
ricampiona a 64 punti, e un piede ne prende uno o due); la spirale fitta
diventava un groviglio. Con i tratti ripassati ogni vertice resta, e la
strada scende lungo la zampa e torna indietro. Rifatti così, uccello, cane
e lumaca si leggono meglio in due zone su tre (confronto a occhio
dell'agente, non un giudizio); le bozze non sono nei campioni.

**Conseguenza**: 12 campioni a 15 km (`samples/LOG.md`, TASK-064), tutti
con un percorso: somiglianza 0,84–1,00, in 4–60 s, generati prima di
TASK-063, che lascia i percorsi identici (ADR-0059). Tre animali su
quattro hanno tratti, quindi le tolleranze dimezzate di ADR-0039.
Giudizio dell'utente (2026-09-25): a Milano si riconoscono tutti e
quattro; fuori da Milano la farfalla è `quasi` a Trento e Levico,
l'uccello `quasi` a Levico, la lumaca `sì` a Trento, il cane `no` in
tutte e due. Quali animali entrano nel catalogo lo decide l'utente, con
TASK-065 (ADR-0036); gli altri restano nella cartella dei contorni, come
la casa e l'albero.

## ADR-0061 — Farfalla, lumaca, testa di cane e di coniglio nel catalogo; «dog head» sullo schermo
**Stato**: Attiva · 2026-09-26 · le forme scelte dall'utente; il resto
deciso dall'agente su delega dell'utente (TASK-065)

TASK-064 (ADR-0060), TASK-068 (ADR-0065) e TASK-078 (ADR-0073) hanno
disegnato quattro animali, una testa di cane e tre candidate nuove (testa di
coniglio, zucca, albero di Natale), giudicati dall'utente sulle strade a
15 km. Quali entrano nel catalogo lo decide l'utente (ADR-0036).

**Decisione**:
- **Entrano `butterfly`, `snail`, `dog_head` e `rabbit_head`**, scelti
  dall'utente. Tutti e quattro sono `sì` a Milano; la farfalla è `quasi` a
  Trento e Levico, la lumaca `sì` a Trento, la testa di cane `sì` in tutte
  e tre le zone, la testa di coniglio `sì` a Trento e `quasi` a Levico. Il
  cane intero (`dog`), l'uccello (`bird`), la zucca (`pumpkin`) e l'albero
  di Natale (`christmas_tree`) restano contorni da CLI, come la casa: il
  cane è `sì` solo a Milano, e la testa lo sostituisce.
- **Come le forme di TASK-039**: in `SHAPES` del motore, in `shared-types`
  e in `contract.json`, con le parole in `shapeWords.ts` e una riga per
  forma nella domanda all'AI (`OUTLINES`). Tutte e quattro entrano con i
  tratti ripassati (antenne; spirale e corna; occhi, naso e bocca).
- **I nomi nel contratto sono `dog_head` e `rabbit_head`**, come i file.
  **Sullo schermo si legge «dog head», «rabbit head»** (`shapeName` in
  `shapeWords.ts`): tessere, suggerimenti, conferma sotto il campo, attesa,
  nome del percorso. Una tessera, o un chip dopo un percorso che non ci
  sta, scrive nel campo il nome che si legge, e la tabella lo conosce; la
  tabella legge il trattino basso come uno spazio.
- **«cane», «dog», «cagnolino», «puppy» portano alla testa di cane**, e
  «coniglio», «rabbit», «bunny» a quella di coniglio: nel catalogo c'è un
  cane solo e un coniglio solo, e chi li chiede vuole quelli. «chiocciola»
  porta alla lumaca: nel campo della forma è l'animale, non la «@».
- **Tessere con le emoji** 🦋 🐌 🐶 🐰, come gatto, pesce e cavallo (🐶 e
  🐰 sono proprio due teste), quattro per riga come oggi.
- **Liste di prova dell'AI**: «cane» e «farfalla», che valevano nessuna
  forma, escono perché ora le legge la tabella; entrano parole che la
  tabella non conosce per le quattro forme («Snoopy», «Lassie»,
  «escargot», «farfalla monarca», «Bugs Bunny»…) e due senza forma
  («ragno», «ape»).

**Motivo**: la regola del catalogo resta ADR-0036: entra solo ciò che
l'utente ha giudicato a occhio. Un nome di contratto con il trattino basso
è chiaro per l'API ma non per chi corre; un nome solo per lo schermo tiene
il contratto com'è e costa una funzione. Portare «cane» alla testa evita
un «nessuna forma» per la parola più ovvia.

**Conseguenza**: il catalogo ha undici forme. La lumaca (72 vertici), la
testa di cane (69) e quella di coniglio (81) hanno più vertici dei 64 punti
di una forma: con i tratti ogni vertice resta (TASK-037), e i test del
catalogo lo prevedono. Chieste come forme del catalogo danno, punto per
punto, i percorsi dei campioni giudicati (`docs/tasks/TASK-065.md`).
Un'app più vecchia dell'API non conosce le forme nuove: se l'AI risponde
«butterfly», quell'app lo tratta come una risposta sbagliata. App e API si
aggiornano insieme, come oggi dallo stesso checkout. Le tessere sono undici:
tre righe da quattro, l'ultima con tre.

## ADR-0064 — La barra stima una parola dalle sue lettere
**Stato**: Attiva · 2026-09-25 · deciso dall'agente su delega dell'utente
(TASK-069)

Una parola si calcolava come una forma della stessa distanza
(`computeSeconds`, 2,5 s a km): per «CIAO» a 15 km 37,5 s, mentre il motore
ne mette 40–140. La barra arrivava presto in fondo e pulsava a 75 s, quando
un'attesa normale era ancora in corso.

**Misure** (CLI del motore, Trento, zona in cache, PC di sviluppo,
2026-09-25): «UNO» 10 km 45 s; «CIAO» 15 km 75 s e 43 s; «TRENTO» 21 km
106 s; «CAMMINO» 21 km 141 s. A parità di distanza, 7 lettere costano un
terzo più di 6: il tempo lo fanno le lettere, ognuna un percorso a sé
cucito alla vicina.

**Decisione**: nella fase di calcolo, se la richiesta ha `word`, la stima è
`wordSeconds` = 20 s a lettera, mai meno di `computeSeconds` della stessa
distanza. Le altre fasi (coda, download) restano quelle di ADR-0050; la
regola della pulsazione oltre il doppio (ADR-0055) vale uguale: «CIAO»
pulsa dopo 160 s invece di 75 s.

**Scartate**: una retta con lettere e km insieme (con quattro misure, due
parametri inseguono il rumore: «CIAO» varia da 43 a 75 s da solo); 18 s a
lettera, il valore medio (20 s sta un po' sopra, e le attese già annotate
arrivano a 140 s per «CIAO» e 258 s per «BELLO»).

**Conseguenza**: la barra di una parola avanza più piano, e pulsa solo dopo
il doppio del solito per quella parola. Se il motore diventa più veloce
sulle parole, basta cambiare `WORD_LETTER_S` con nuove misure.

## ADR-0065 — Testa di cane: orecchie che pendono, occhi, naso e bocca ripassati
**Stato**: Attiva · 2026-09-25 · chiesto dall'utente («Per il cane prova
anche solo la testa facendo dettagli come bocca naso e occhi»); il disegno
deciso dall'agente su delega dell'utente (TASK-068); giudizio dell'utente:
`sì` a Trento, Levico e Milano

Il cane intero di TASK-064 (ADR-0060) è `sì` a Milano e `no` a Trento e
Levico. L'utente chiede di provare solo la testa, con i dettagli del muso.

**Decisione**:
- **Un contorno nuovo**, `route_engine/shapes/outlines/dog_head.json`,
  accanto a `dog.json`, che resta com'è. Si prova solo dalla CLI
  (`--outline`) finché l'utente non lo giudica; nessun parametro del motore
  cambia.
- **Vista di fronte, orecchie che pendono**: cranio tondo, muso più
  stretto, due orecchie lunghe ai lati delle guance, aperte in basso di
  30°, staccate dalla guancia da una tacca a V larga. È ciò che la
  distingue dal gatto (`cat.json`), che ha le orecchie a punta in su: nella
  testa di cane la cima è il cranio.
- **Occhi, naso e bocca sono tratti ripassati** (ADR-0039): gli occhi, due
  anelli di otto punti appesi con una linea corta alla tacca fra orecchio e
  guancia, come quelli del gatto; il naso, un anello in mezzo al muso,
  appeso a una linea che sale dal mento; la bocca, due linee corte da quella
  linea sotto il naso, una per lato.
- **Campioni come TASK-064**: i grafi di zona dell'API in memoria, solo le
  zone in cache, nessun ritaglio su C:.

**Motivo**: otto bozze provate sulle strade prima dei campioni
(`docs/tasks/TASK-068.md`). Con dettagli piccoli il muso si aggrovigliava;
il motore taglia gli anelli all'interno, quindi occhi e naso devono essere
grandi quasi quanto gli occhi del gatto (470 m contro 560 m a 15 km, a
scala piena) e avere più punti di passaggio; con la tacca stretta il
percorso la scorciava e un orecchio spariva. Con le orecchie aperte la
somiglianza sale a 0,97 · 0,95 · 0,99 (Trento, Levico, Milano), da
0,94 · 0,92 · 0,98.

**Conseguenza**: 3 campioni a 15 km (`samples/LOG.md`, TASK-068), tutti
con un percorso, in 3–17 s. I dettagli, andata e ritorno, sono il 44% della
lunghezza del disegno, contro il 29% del gatto: a 15 km naso e bocca escono
più piccoli del disegno. Giudizio dell'utente (2026-09-25): la testa è
`sì` in tutte e tre le zone, dove il cane intero era `sì` solo a Milano.
Se il cane entra nel catalogo, e come testa o intero, lo decide l'utente
con TASK-065 (ADR-0036).

## ADR-0067 — Parole: il ritorno sulle strade dell'andata, provato e scartato
**Stato**: Scartata · 2026-09-26 · chiesto dall'utente («se si percorre la
stessa strada anche al ritorno le rende più pulite le lettere, e più
fini»); il metodo deciso dall'agente su delega dell'utente (TASK-071);
giudizio dell'utente: 4 parole su 9 peggio, nessuna meglio; l'utente ha
scelto di non farlo entrare nel motore

Una lettera senza anelli si corre tutta due volte (ADR-0056), e dove la
parola torna su se stessa le strade appena usate costano la metà
(ADR-0044). Sui campioni di TASK-050 e TASK-059, rigenerati con il codice
di `main`, il ritorno prende un'altra strada dove l'andata ha fatto
zig-zag, e al posto di una linea viene un anello. Succede soprattutto a
Milano, con marciapiedi e vie parallele fitte: «CIAO» ha il 51% del
percorso su strade corse due volte contro il 74% del disegno, e 3,7 km
corsi una volta sola accanto a un tratto ripassato
(`docs/tasks/TASK-071.md`).

**Provato** (commit `0e8add6` nel branch `feat/TASK-071-retraced-letters`,
tolto dal commit dopo):
- in `words.compose` i tratti ripassati tagliati negli stessi punti
  all'andata e al ritorno (il gambo di E, K, L e la sbarra della B non lo
  erano);
- un tracciatore per le parole, `retrace.snap_retraced`: ogni punto della
  linea tiene il nodo di strada in cui è stato raggiunto la prima volta, e
  un lato già disegnato nel verso opposto ripete all'indietro i nodi
  dell'andata; al primo passaggio le strade già usate costano la metà, come
  prima. Le altre forme restavano con `snap_to_network`, identiche (cuore,
  gatto e stella a 15 km nelle tre zone, stessi punti).

**Esito**: ogni tratto ripassato diventa una linea sola (Milano: «CIAO» 77%
di strade doppie, «MAX» 92%), ma il ritorno ripete gli zig-zag dell'andata
e allo stesso piazzamento il percorso si allunga del 2–24% (mediana 5%). La
ricerca, per stare nella distanza, stringe la parola o sceglie un altro
posto: a Trento e Levico lettere più piccole del 13–28%. Giudizio
dell'utente, prima → dopo: «CIAO» sì · sì · sì → quasi · quasi · sì;
«BELLO» no · quasi · sì → no · no · quasi; «MAX» sì ovunque, come prima (e
grande come prima). Le linee più sottili non compensano lettere più
piccole.

**Decisione**: il motore resta com'è. Il ritorno su un'altra strada nasce
dallo zig-zag dell'andata, cioè da tratti obliqui o curvi su una griglia di
vie: il seguito proposto all'utente sono le lettere squadrate dello
screenshot di Strava, un tratto per via, dove il ritorno pulito viene da
sé (proposta in `docs/tasks/TASK-071.md`).

**Quanta strada costa il ripasso** (per chi non ama strade doppie e
inversioni): sta nel disegno delle lettere, con o senza questa modifica.
Le lettere ripassano il 74–91% della loro linea; a 15 km il 51–92% del
percorso è su strade corse due volte (con il ritorno a specchio 71–92%,
cioè 5,4–7,0 km di secondo passaggio), con 3–25 inversioni a U per parola.

## ADR-0068 — Il contorno ricavato da un'immagine, con regole fisse
**Stato**: Attiva · 2026-09-25 · chiesto dall'utente («l'utente può caricare
un'immagine da rappresentare e dai contorni si ricava la forma»), con il
perimetro della prima versione: un soggetto chiaro su sfondo uniforme, solo
il contorno esterno; Pillow autorizzata dall'utente; il metodo e le soglie
decisi dall'agente su delega dell'utente (TASK-072); giudizio
dell'utente: mela, pera e Italia `sì` ovunque, stella `quasi` a Trento e
`sì` a Milano, gatto `no` a Trento e Milano

Le forme arrivavano solo dal catalogo, dai file dei contorni e dalle
parole. L'utente vuole partire da un'immagine sua. Il principio resta: il
percorso lo decide il motore, e anche il contorno lo ricava il motore, non
l'AI.

**Decisione**:
- **Un modulo nuovo, `route_engine/image_outline.py`**: PNG o JPEG →
  sfondo dal bordo → soggetto per soglia sul colore (o sulla trasparenza) →
  il pezzo più grande → contorno esterno lisciato e semplificato → un
  `Outline` come quelli dei file, controllato da `parse_outline`
  (`ROUTE_ENGINE.md` §2, «Il contorno da un'immagine»). Fuori da
  `shapes/`, che resta alla sola libreria standard.
- **Regole fisse, niente di appreso**: stessa immagine, stesso contorno.
  Soglie: sfondo uniforme se il 70% del bordo sta entro 40 dalla sua
  mediana (RGB); soggetto oltre 60 dallo sfondo; il pezzo più grande
  almeno il 75% del soggetto; il soggetto staccato dal bordo e largo almeno
  48 pixel su 640; al più 100 angoli.
- **Rifiutare invece di indovinare**: sfondo non uniforme, nessun
  soggetto, più soggetti, soggetto che tocca il bordo, troppo piccolo,
  troppo frastagliato, formato sbagliato. Ogni rifiuto ha un motivo in una
  parola (`reason`), per il messaggio dell'app di TASK-073.
- **Lisciato alla scala delle strade**: le parti più sottili del 2% del
  soggetto si tolgono e le fessure altrettanto strette si chiudono, con
  giunzioni ad angolo, così le punte restano punte (ADR-0038, ADR-0039: i
  dettagli sottili sulle strade non restano). Semplificazione di
  Douglas–Peucker all'1% del soggetto.
- **Il contorno si calcola con shapely** (unione dei tratti di pixel di
  ogni riga, `buffer`, `simplify`) e numpy, già installati con osmnx:
  dichiarati in `pyproject.toml` come Pillow, perché il motore li importa
  (come numpy con TASK-062). Nessuna altra libreria (scikit-image, OpenCV).
- **Dalla CLI**: `--image FILE` come `--outline` (`plan_shape`,
  `tilt_limit`, forma dritta), con il nome del file; `--save-outline FILE`
  scrive il contorno in JSON, che `--outline` rilegge uguale.

**Motivo**: un soggetto su sfondo uniforme si separa bene con una soglia,
senza modelli, e la regola si prova con immagini disegnate nei test. Uno
sfondo pieno di cose invece non ha una soglia giusta: meglio un rifiuto con
il motivo che una forma a caso. Il pezzo più grande e il solo contorno
esterno danno una linea chiusa, l'unica cosa che un percorso disegna senza
tratti ripassati.

**Conseguenza**: un pezzo staccato più piccolo (un gambo che non tocca la
mela, un puntino) si perde senza avviso: l'anteprima del contorno
nell'app (TASK-073) lo farà vedere prima di chiedere il percorso. Uno
sfondo con una sfumatura forte, o un'ombra attaccata al soggetto, viene
rifiutato o finisce nel contorno. I dettagli interni (occhi, finestre) non
diventano tratti ripassati: se servono, è un lavoro a parte.
Giudizio dell'utente (2026-09-25, `samples/LOG.md`): mela, pera e Italia
`sì` in ogni zona, stella `quasi` a Trento e `sì` a Milano, gatto `no` a
Trento e Milano. Il gatto non si riconosceva già dal contorno: una sagoma
povera di dettagli resta povera anche sulle strade. Da valutare con
TASK-073: l'anteprima che fa giudicare la sagoma prima del percorso, e se
la semplificazione toglie troppo.

## ADR-0069 — L'immagine nell'API: base64 in JSON, anteprima, poi il contorno
**Stato**: Attiva · 2026-09-26 · perimetro dell'utente (un soggetto chiaro
su sfondo uniforme, solo il contorno esterno, rifiuto con il motivo;
anteprima prima del percorso; `expo-image-picker` autorizzato); il
contratto deciso dall'agente su delega dell'utente, approvato dal
coordinatore (TASK-073)

**Decisione**:

- **Due richieste.** `POST /image-outlines` riceve l'immagine e risponde
  con il contorno che il motore ricava (ADR-0068), in meno di 2 s; l'app lo
  mostra. `POST /image-route-jobs` riceve il contorno, non l'immagine, e
  risponde con un `RouteJob` come `/route-jobs`, letto e annullato sullo
  stesso `/route-jobs/{job_id}`.
- **L'immagine in base64 dentro il JSON**, al più 10 MB prima della
  codifica (`MAX_IMAGE_BYTES`; Pydantic taglia prima la stringa a
  13 333 336 caratteri). Niente multipart, che vorrebbe `python-multipart`:
  nessuna dipendenza Python nuova (Pillow c'era già con il motore). Una foto
  dell'iPhone, ricodificata in JPEG a qualità 0,8 dal selettore, sta fra 1
  e 4 MB. L'API non salva e non scrive l'immagine.
- **Il contorno torna in due forme**: `points`, normalizzati in [-1, 1],
  per il percorso; `image_points`, frazioni della foto dall'alto a
  sinistra, con `aspect`, per disegnarlo sopra la foto nell'anteprima.
- **Il contorno che torna dal telefono si controlla come ogni input**
  (richiesta del coordinatore): da 4 a 101 punti (al più 100 angoli, il
  limite del motore), numeri finiti, dentro [-1, 1] (tolleranza 1e-6), poi
  `parse_outline` del motore (chiuso, 3 punti distinti, senza incroci).
  Altrimenti `invalid_request` con il motivo, prima di creare il job.
- **Il contratto del motore non cambia**: `RouteRequest` e `models.py`
  restano forma o parola. L'API ha il suo `ImageRequest` (partenza,
  distanza e attività controllate con le funzioni di `models.py`) e il suo
  pianificatore, `plan_request`, che per un'immagine chiama `plan_shape`
  come `--image` dalla CLI: dritto (ADR-0038), nome `image`. Il
  `RouteResult` di un'immagine ha `shape` e `word` a `null`.
- **Un codice nuovo, `image_not_usable`** (422), con un campo nuovo in ogni
  errore, `reason`: `null`, tranne con questo codice, dove è il motivo del
  motore (`IMAGE_REASONS`). Un test dell'API controlla che i motivi di
  `image_outline.py` siano tutti nel contratto.
- **`shared-types` resta retrocompatibile**: tipi nuovi
  (`ImageOutlineRequest`, `ImageOutline`, `ImageRouteRequest`,
  `ImageReason`), `reason` opzionale, `GpxRequest.request` che accetta
  anche un `ImageRouteRequest`. Un'app vecchia non chiama i due indirizzi
  nuovi e ignora `reason`.
- **La semplificazione di ADR-0068 resta com'è.** Misurata sui cinque
  campioni di TASK-072: il contorno finale copre il 97–99% della sagoma
  grezza (sovrapposizione mela 0,987, gatto 0,981, Italia 0,968, pera
  0,984, stella 0,985) con 16–42 angoli, lontano dal limite di 100.
  Dimezzare lisciatura e semplificazione porta il gatto a 0,989: la sua
  sagoma resta la stessa. Il gatto non si riconosceva per la sagoma, non per
  la semplificazione.

**Motivo**: l'anteprima fa giudicare la sagoma prima di aspettare il
percorso, ed è la risposta al gatto di TASK-072. Mandare il contorno invece
dell'immagine alla seconda richiesta evita di rimandare megabyte, e lascia
l'API senza stato fra le due. Il contorno però arriva dal telefono, e il
motore non si fida di un input: lo ricontrolla.

**Conseguenza**: l'API potrebbe ricevere un contorno che non ha tracciato
lei. Se passa i controlli è una forma valida come un file di `outlines/`, e
il motore la disegna: nessun rischio per il motore, e il principio resta
(l'AI non produce geometrie; qui l'AI non c'entra). La trasparenza di un PNG
si perde nel selettore di iOS, che consegna JPEG. Un pezzo staccato si perde
ancora, ma ora si vede nell'anteprima.

## ADR-0070 — «Off the route» dopo più posizioni e qualche secondo, non dopo una
**Stato**: Attiva · 2026-09-25 · deciso dall'agente su delega dell'utente
(TASK-074)

L'utente, correndo sul marciapiede opposto a quello del percorso, si è
sentito dire «You are off the route». La soglia era già 40 m
(`OFF_ROUTE_M`, ADR-0052), ma bastava **una** posizione oltre: in OSM il
marciapiede opposto è spesso una linea a sé, a 15–25 m dal percorso, e il
GPS fra le case sbaglia di 10–20 m, a tratti per qualche secondo di fila.
22 m di marciapiede più 20 m di errore passano i 40 m.

**Decisione** (`navigator.ts`):
- **La soglia resta 40 m.** Alzarla non basta (un errore raro supera
  qualunque soglia) e ritarda la via sbagliata, che è a 50 m o più.
- **L'avviso dopo 3 posizioni di fila oltre la soglia, che coprono almeno
  8 s** (`OFF_FIXES`, `OFF_SECONDS`) dalla prima. Una posizione entro la
  soglia azzera la serie. Il GPS che sbaglia di solito torna in pochi secondi; una via
  sbagliata non torna vicina. Il conto da solo non basta: a passo di corsa
  le posizioni arrivano ogni 2 s circa (`FIX_EVERY_M` = 5 m), e 3 posizioni
  sono 4 s. Senza l'ora della posizione conta solo il numero.
- **Una posizione con errore dichiarato oltre 40 m** (`POOR_FIX_M`, da
  `coords.accuracy`) non dice niente sull'essere fuori: non allunga né
  azzera la serie, e non riporta sul percorso. Sul percorso fa avanzare
  come prima.
- **«Back on the route» dopo 2 posizioni di fila entro la soglia**
  (`BACK_FIXES`): su una via parallela a 50 m, una posizione storta verso
  il percorso non deve far dire «Back on the route» e poi di nuovo «off».
  Il ritorno vero, con una posizione ogni 2 s, si sente dopo 2 s in più.

**Scartate**: una soglia che cresce con l'accuracy della posizione (iOS la
dà spesso a gradini larghi, fino a 65 m, e a 65 m nessuna soglia utile resta sotto
i 50 m della via parallela); la media delle ultime posizioni (un errore
grande pesa comunque, e la via sbagliata arriva più tardi).

**Conseguenza**: sulla via parallela sbagliata l'avviso arriva 8–10 s dopo
averla presa, circa 25–30 m di corsa, invece che alla prima posizione. Test
con sequenze finte in `navigator.test.ts`: 4 minuti sul marciapiede opposto
con tre posizioni di fila oltre 40 m, nessun avviso; un punto a 60 m,
nessuno; una via a 47–63 m, uno dopo 8 s; posizioni con errore 80 m,
nessuno. Se sul campo arriva ancora a sproposito, si alza `OFF_SECONDS`.

## ADR-0072 — Lettere squadrate: un secondo alfabeto, girato sulla griglia delle vie
**Stato**: Attiva · 2026-09-26 · chiesto dall'utente dopo TASK-071
(«sì, provale»), sul modello delle scritte di GPS art che ha mandato
(«2024», «HURRY»); disegno delle lettere, rotazione e soglie decisi
dall'agente su delega dell'utente (TASK-077); dopo il giudizio l'utente ha
scelto di tenere tutti e due gli stili, da scegliere nell'app (un task a
parte)

**Contesto**: le lettere di oggi (ADR-0044, ADR-0056) hanno curve e
diagonali che su una griglia di vie diventano scale e zig-zag, ed è lì che
il ritorno prende un'altra strada (ADR-0067). Nelle scritte di Strava che
l'utente ha mandato ogni tratto è una via, corsa all'andata e al ritorno,
e le lettere sono larghe e vicine.

**Decisione**:
- `letters_block.json`, stesso formato di `letters.json`: tratti solo
  orizzontali, verticali o a 45°. O, D, B, Q rettangoli chiusi sulla base
  (come oggi B, D, Z); la U con il fondo sulla base e gli angoli a 45°,
  perché due aste su una linea continua si leggerebbero come «II»; C, G,
  S, J con il tratto basso a 0,2, come E e L oggi. Le diagonali a 45° e
  non a gradini: la strada le fa comunque a gradini, della misura dei suoi
  isolati, mentre un gradino disegnato ha una misura che una via su due
  non ha. Larghe 0,8–1, spazi di 0,3 invece di 0,6.
- Lo stile si sceglie con `style` in `words.compose` e
  `optimizer.plan_route`, `"round"` per difetto: senza, parole e forme
  sono identiche a prima. `RouteRequest`, API e app non lo conoscono
  ancora.
- Una parola squadrata si gira come corrono le vie attorno a ogni
  partenza (`street_grid.py`: direzioni dei pezzi di via pesate per
  lunghezza, ripiegate in 90°, cime dopo una lisciatura di ±4°), invece di
  stare dritta entro ±15° (ADR-0038). Al più 30° fuori dall'orizzontale:
  a Levico la griglia a 43° vinceva il conteggio delle strade e metteva
  «MAX» e «BELLO» di traverso sulla mappa, illeggibili; senza una
  direzione entro 30° la parola sta dritta.

**Alternative scartate**: provare tutte le rotazioni fra −45° e 45° a
passi fini e lasciar scegliere il conteggio delle strade (sei volte i
piazzamenti da contare, e la griglia la trova già l'istogramma); una
direzione sola per tutta la zona (a 1–2 km le vie girano: Trento ha due
griglie a 5° e a −20°); diagonali a gradini disegnati.

**Conseguenze**: le parole squadrate sono più lunghe sul disegno (lettere
più larghe) e, a 15 km, lettere un po' più basse. Dove la griglia è
regolare (Milano) le lettere cadono sulle vie; dove non lo è (Levico,
Trento di là dall'Adige) il percorso resta a zig-zag come oggi.

**Giudizio dell'utente** (2026-09-26), squadrate (oggi): «CIAO» sì ·
quasi · sì (sì · sì · sì); «BELLO» quasi · no · no (no · quasi · sì);
«MAX» no · quasi · sì (sì · sì · sì); «HURRY» no ovunque. Vanno bene le
parole corte con lettere grandi su una griglia regolare (CIAO e MAX a
Milano); con cinque lettere a 15 km le lettere sono troppo piccole anche a
Milano. Lo stile di oggi resta il predefinito.

## ADR-0071 — Partenze vicine: tre nodi entro 100 m in parallelo, si tiene il cuore migliore
**Stato**: Attiva · 2026-09-26 · chiesto dall'utente dopo TASK-075 («il
motore prova alcune partenze vicine e tiene il percorso migliore», con
l'avvicinamento nel percorso); quante partenze, come sceglierle e come
tenere il tempo deciso dall'agente su delega dell'utente (TASK-076);
giudizio dell'utente: Caldonazzo partenza `sì`, vicina `quasi`; Trento 10 km
entrambe `sì`; Trento 15 km partenza spostata `sì`, vicina `quasi`; Milano
`sì`. Scelta dell'utente dopo il giudizio (2026-09-26): «vince il cuore
migliore», anche con la partenza spostata dalla ricerca

**Contesto**: a Caldonazzo 25–100 m di partenza portano il cuore da 10 km
da 0,73 a 0,92 (TASK-075). Il motore però non va toccato: `optimizer.py` è
di TASK-071 mentre si scrive questo.

**Decisione** (`route_engine/nearby_starts.py`):

- **Quali partenze**: fino a 3 nodi a 25–100 m in linea d'aria, uno per
  settore di 120° (il primo sul nord), al più 150 m lungo le strade e 25 m
  l'uno dall'altro; nel settore quello con la strada più vicina a 60 m.
- **In parallelo, in processi**: la partenza dell'utente fa il piano di
  sempre (`plan_shape`, può scaricare, spostare la partenza, cercare a
  2 km) nel processo che la chiede; ogni partenza vicina ha un processo
  (`multiprocessing`, `spawn`, priorità bassa). I processi, non i thread:
  la ricerca è Python puro e il GIL la serializza.
- **Una partenza vicina fa solo la ricerca da quel nodo** (`search` con
  `move_start=False`, `ShapeJob.here`): senza anelli a 250–500 m e senza la
  seconda ricerca a 2 km, i cui percorsi comincerebbero altrove e
  andrebbero scartati. Costa circa metà di un piano intero (Caldonazzo
  7–9 s contro 13–17 s). I passi dopo la ricerca ripetono quelli di
  `plan_shape` per questo caso; un test controlla che diano lo stesso
  risultato. Con un interruttore in `plan_shape`, dopo TASK-071, la copia
  si toglie.
- **Il grafo ai processi**: quello già ritagliato per la partenza, pickled
  una volta sola. La partenza vicina è entro 100 m, dentro il margine di
  500 m dell'area. Leggere la zona intera in ogni processo mandava in swap
  il PC (Trento 15 km: 240 s).
- **Quanto si aspetta**: finita la partenza dell'utente, al più 8 s, mai
  oltre 25 s dalla richiesta; se il suo percorso è già buono (somiglianza
  ≥ 0,90, distanza entro il 10%, partenza non spostata) nessuno. I ritardatari
  si chiudono (`terminate`).
- **Quando non si provano**: grafo oltre 30 000 nodi (Milano: 55 676 a
  10 km, 83 779 a 15 km; lì la sola ricerca da un nodo dura 35 s e il cuore
  è già a 0,99); e solo tanti processi quanti entrano nella memoria libera,
  lasciandone 1 GB alla partenza dell'utente (un processo ≈ 100 MB + 10
  volte il grafo pickled). Senza memoria il percorso è quello di oggi.
- **Quale si tiene** (scelta dell'utente): il cuore migliore fra tutti i
  candidati, cioè la partenza dell'utente, le vicine e la partenza che la
  ricerca ha spostato («Start here», fino a 1 km come prima). Punteggio: la
  somiglianza, meno la distanza oltre il 10% dal target pesata come in
  `search`; dove comincia il percorso non conta. Fra i candidati entro
  0,01 dal migliore vince quello che comincia più vicino all'utente
  (avvicinamento o spostamento), poi la partenza stessa. Soglia decisa
  dall'agente: a Trento 15 km l'occhio ha visto 0,02 (0,90 `sì`, 0,88
  `quasi`), in TASK-075 non sempre meno (0,85 `sì` e `quasi`).
  Scartati: il costo di `search` con la distanza piena (a Caldonazzo
  sceglieva un cuore da 0,82 a 9,4 km al posto di quello da 0,86 a 11,8 km,
  il tipo che l'utente aveva giudicato `no`); e la prima versione, che
  pesava lo spostamento come la ricerca e a Trento 15 km preferiva la
  vicina `quasi` al cuore `sì` a 1 km.
- **L'avvicinamento**: dal nodo della partenza dell'utente al nodo vicino
  per la strada più corta, e ritorno per la stessa; nei metri, nel GPX e
  nei nodi (le indicazioni lo contano). La somiglianza resta quella della
  forma.
- **Nell'API**: `plan_request` (`images.py`) chiama `plan_nearby` al posto
  di `plan_route`, per le forme e le parole; le immagini come prima. Le
  indicazioni non cambiano: quando vince una vicina il grafo è quello della
  partenza, il primo caricato. Dalla CLI: `--nearby N`.

**Misure** (cuore, zona già in memoria; tempi da 2–3 ripetizioni, molto
variabili: il PC ha 7 GB e durante le misure 0,4–2 GB liberi, con altri
agenti al lavoro):

| Caso | Solo partenza | Con 3 vicine | Somiglianza scelta |
|---|---|---|---|
| Caldonazzo 10 km | 8–19 s | 11–20 s | 0,86 → 0,86 (vicine 0,82, 0,79, 0,77) |
| Trento 10 km | 29–40 s | 40–42 s | 0,86 → 0,88 (65 m) |
| Trento 15 km | 34–39 s | 43–69 s | 0,90 spostata di 1 km, tenuta (vicina migliore 0,88) |
| Milano 10 km | 15–18 s | 25–33 s prima del limite sui nodi, ora non provate | 0,99 |
| Milano 15 km | 25–80 s | non provate | 1,00 |

Con 4 vicine: stessi guadagni, più tempo e memoria (Trento 15 km 52–256 s,
Milano 15 km `MemoryError`). Nell'ultima serie di misure, con meno di
1,5 GB liberi, la regola della memoria ha lasciato fuori le vicine in ogni
caso: tempi e percorsi quelli di oggi.

Caldonazzo, 25 posizioni entro ±100 m da Via della Villa, 10 km (le
posizioni del GPS degli screenshot dell'utente): dalla sola partenza
0,73–0,96, media 0,834, 7 sotto 0,80; con le vicine e la regola sopra
0,77–0,96, media 0,847, 4 sotto 0,80. I 7 cuori da 0,90 in su restano 7, e
vengono tutti dalla partenza spostata di 1 km.

**Conseguenza**: dove la rete è rada e la memoria c'è, il cuore dipende
meno dalla partenza: i casi peggiori migliorano, i migliori restano quelli
che la ricerca trova spostandosi. Dove la rete è fitta non cambia nulla. Il tempo cresce di
qualche secondo nei paesi e di 5–15 s a Trento, fuori dai 30 s di
PRODUCT.md dove già lo si era. Su questo PC la memoria decide spesso lei:
più RAM libera (chiudere applicazioni) lascia provare le vicine. La
somiglianza non segue sempre l'occhio (TASK-075): con la regola dell'utente
la scelta coincide con il giudizio in tutti e quattro i casi giudicati
(a Trento 10 km la vicina, 0,88, contro la partenza, 0,86: tutte e due
`sì`).

## ADR-0073 — Coniglio, zucca e albero di Natale: candidate come la testa di cane
**Stato**: Attiva · 2026-09-26 · chiesto dall'utente (spunti da gpsart.info:
animali «solo la testa», temi stagionali, sagome semplici); il disegno
deciso dall'agente su delega dell'utente (TASK-078); giudizio dell'utente:
tutte e tre `sì` a Milano; coniglio `sì` a Trento e `quasi` a Levico,
zucca `quasi` a Levico, albero di Natale `quasi` a Trento, il resto `no`

La testa di cane (ADR-0065) è `sì` in tutte e tre le zone, il cane intero
solo a Milano; il gatto da immagine (TASK-072) non si riconosceva già come
sagoma. Servivano altre forme da provare, riconoscibili dai loro tratti
principali prima che dai dettagli.

**Decisione**:
- **Tre contorni nuovi** in `route_engine/shapes/outlines/`
  (`rabbit_head`, `pumpkin`, `christmas_tree`), disegnati dall'agente con
  archi calcolati: nessuna licenza di terzi. Si provano solo dalla CLI
  (`--outline`) finché l'utente non li giudica; nessun parametro del motore
  cambia; `tree.json` resta com'è.
- **Il tratto che fa riconoscere la forma sta nel contorno** (ADR-0035):
  le orecchie lunghe e dritte del coniglio, più lunghe dei due terzi della
  testa (il gatto le ha corte a punta, il cane le ha pendenti); i tre
  spicchi della zucca, che si toccano in quattro tacche, e il picciolo
  storto; i tre piani dell'abete, con il bordo che risale verso il tronco.
  Dritti (ADR-0038).
- **I dettagli sono tratti ripassati** (ADR-0039, ADR-0065): occhi, naso e
  bocca del coniglio come quelli della testa di cane; occhi a triangolo e
  sorriso della zucca, appesi alle tacche e al fondo; la stella a cinque
  punte in cima all'albero.
- **Campioni come TASK-064 e TASK-068**: i grafi di zona dell'API in
  memoria, solo le zone in cache, nessun ritaglio su C:.

**Motivo**: bozze provate sulle strade prima dei campioni
(`docs/tasks/TASK-078.md`). Le orecchie strette del coniglio si perdevano
a Levico (0,78; con orecchie più larghe 0,88); i denti del sorriso,
larghi 0,12 della forma, sparivano in tutte le zone; tacche più profonde
fra gli spicchi spezzavano la zucca a Levico; con piani poco sporgenti e
la stella piccola l'albero di Trento perdeva i piani.

**Conseguenza**: 9 campioni a 15 km (`samples/LOG.md`, TASK-078), tutti
con un percorso, in 11–44 s: somiglianza 0,81–1,00, la più bassa a
Levico per tutte e tre. L'albero resta difficile fuori da Milano, come
quello di TASK-034/037. Giudizio dell'utente (2026-09-26): a Milano si
riconoscono tutte e tre; il coniglio è `sì` a Trento e `quasi` a Levico,
la zucca `no` a Trento e `quasi` a Levico, l'albero di Natale `quasi` a
Trento e `no` a Levico (l'albero di TASK-034/037 era `no` in tutte e due). Quali forme entrano nel catalogo
lo decide l'utente, con TASK-065 o dopo (ADR-0036).

## ADR-0076 — API da fuori casa: chiave, limite, indirizzo nell'app, Docker

**Data**: 2026-09-26 · **Task**: TASK-081 · **Stato**: accettata ·
deciso dall'agente su delega dell'utente (strade e vincolo «gratis e senza
carta» dall'utente, tramite il coordinatore)

**Decisione**:

- **Strada di adesso: PC + Tailscale** (`DEPLOY.md`, A): l'API resta sul
  PC con `--lan`, che ascolta su tutte le interfacce, anche quella di
  Tailscale; Expo pubblica l'indirizzo `100.x` se
  `REACT_NATIVE_PACKAGER_HOSTNAME` è impostato, e l'app ricava l'API dallo
  stesso host (ADR-0031). Nessuna chiave: la tailnet è privata. Poi
  Cloudflare Tunnel (B), server con carta (C), Raspberry Pi 5 (D), VPS
  pagato con PayPal (E).
- **Chiave**: solo dalla variabile `SHAPEROUTE_API_KEY`, mai da riga di
  comando (resta nella cronologia). Intestazione `X-API-Key`, confronto a
  tempo costante (`hmac.compare_digest`), almeno 16 caratteri o l'API non
  parte. `GET /health` resta aperto. Senza variabile, tutto come prima.
  Errore 401 `unauthorized`, codice nuovo del contratto.
- **Limite in memoria**, senza dipendenze: `SHAPEROUTE_RATE_LIMIT` POST al
  minuto per client (default 30, 0 = spento), finestra scorrevole; 429
  `too_many_requests` con `Retry-After`. Solo i POST, che fanno lavorare
  il PC: il polling dei job (GET ogni 2 s) non conta. Per indirizzo del
  client: dietro un tunnel tutti condividono lo stesso, accettabile per un
  utente solo.
- **Tutto in un modulo nuovo**, `shaperoute_api/access.py`, collegato con
  `protect(app)` in `create_app`.
- **App**: `EXPO_PUBLIC_API_URL` ed `EXPO_PUBLIC_API_KEY` in
  `apps/mobile/.env`, letti da Expo; l'indirizzo configurato vince su
  quello di Expo, la chiave va in ogni chiamata (job, polling, DELETE,
  GPX, letture, contorni). Senza, come prima.
- **Docker**: `python:3.12-slim`, dipendenze prese dai `pyproject.toml`,
  pacchetti eseguiti dai sorgenti con `PYTHONPATH` (così i file di dati
  del motore ci sono tutti, anche quelli che `package-data` non elenca),
  utente non root, grafi nel volume `/app/data/cache`, zone scaricate alla
  prima richiesta o subito con la CLI del motore. Ollama fuori
  dall'immagine: senza, `ai_unavailable`. La CI costruisce l'immagine per
  amd64 (con una prova di `/health` e della chiave) e per ARM64 (Raspberry
  Pi, Oracle Ampere), senza pubblicarla.

**Alternative scartate**: Hugging Face Spaces (Docker a pagamento), Render
e Koyeb gratis (512 MB di RAM, niente disco permanente: una zona ne occupa
centinaia), Cloudflare Workers (memoria); una libreria di rate limiting
(dipendenza nuova, non serve per un utente); la chiave come opzione
`--api-key`.

**Conseguenza**: l'utente può chiedere percorsi in 5G con il PC acceso
(A) senza cambiare codice; le strade senza PC acceso (D, E) sono
documentate e l'immagine è pronta. Il messaggio dell'app quando l'API non
risponde nomina Wi-Fi, Tailscale e l'indirizzo del server.

## ADR-0077 — Un avviso sconosciuto arriva con la prima lettera maiuscola
**Stato**: Attiva · 2026-09-26 · deciso dall'agente su delega dell'utente
(TASK-082)

Con ADR-0048 un avviso che l'app non riconosce passa com'è, e i testi del
motore sono in minuscolo: con «north-east» l'utente vedeva «start moved
250 m north-east of the requested point…» (Caldonazzo, TASK-076).

**Decisione**: la regola della partenza spostata accetta le direzioni col
trattino, tutte quelle di `optimizer._compass`; e un testo sconosciuto
passa ancora com'è, ma con la prima lettera maiuscola.

**Scartata**: cambiare il testo del motore; codici negli avvisi (vedi
ADR-0048), oggi fuori dal task.

**Motivo**: un avviso nuovo non si perde, e non sembra un errore.

**Conseguenza**: resta vero quello che dice ADR-0048: chi cambia una frase
del motore la cambia anche in `warnings.test.ts`.

## ADR-0066 — Modalità tasca: schermo acceso ma nero, invece della posizione in background
**Stato**: Attiva · 2026-09-26 · strada scelta dall'utente; dettagli decisi
dall'agente su delega dell'utente (TASK-070)

L'utente vuole le indicazioni a voce col telefono in tasca. La posizione in
background di `expo-location` non funziona in Expo Go («You must use a
development build»), e una build propria su iPhone da Windows richiede
l'account Apple Developer a pagamento. L'utente ha scelto la «modalità
tasca».

**Decisione**:
- durante la navigazione, «Pocket» accanto a «Stop»: lo schermo resta
  acceso (`expo-keep-awake`, tag `pocket-mode`), la luminosità dell'app va
  a 0 (`expo-brightness`), un `Modal` nero copre tutto e ignora i tocchi;
  si esce solo **tenendo premuto 2 secondi** (`HOLD_MS`), con la scritta
  «Hold for 2 seconds to leave pocket mode» e «Keep holding…» mentre si
  preme. Il tasto indietro di Android non esce;
- la prima volta per avvio dell'app, un avviso con «Cancel» / «Go dark»:
  bloccare il telefono o premere il tasto laterale ferma le indicazioni;
- la luminosità torna com'era all'uscita, all'arrivo, con «Stop» e quando
  l'app va in background; su iOS anche quando l'app è solo «inactive»
  (centro di controllo, tasto laterale), perché la luminosità impostata
  dall'app resta fino al blocco del telefono anche fuori dall'app; se l'app
  torna attiva senza uscire, lo schermo si riabbassa;
- navigazione, voce, vibrazione, GPS e tolleranza «fuori tracciato»
  (ADR-0070) non cambiano: la modalità tasca è solo schermo.

**Scartata**: posizione in background (non va in Expo Go); una build
propria (costa); il nero senza abbassare la luminosità (su un LCD la
retroilluminazione resta accesa); un doppio tocco o uno swipe per uscire
(in tasca capitano); l'avviso salvato per sempre (servirebbe una
dipendenza di storage).

**Motivo**: l'app resta in primo piano, quindi tutto quello che già
funziona continua a funzionare, con due dipendenze Expo che vanno in Expo
Go.

**Conseguenza**: se l'utente blocca il telefono le indicazioni si fermano,
come prima. La mappa sotto il nero continua a seguire la posizione (è in
`App.tsx`, fuori dal task): costa un po' di batteria, stima nel task file.

## ADR-0074 — Modificare il contorno di un'immagine: parti e dettagli disegnati col dito
**Stato**: Attiva · 2026-09-28 · il cosa approvato dall'utente (aggiungere
una parte unita alla sagoma, dettagli come occhi attaccati alla linea e
fatti andata e ritorno, annullare; sempre un tratto solo); il come deciso
dall'agente su delega dell'utente (TASK-079)

Il contorno ricavato da un'immagine è solo la linea esterna (ADR-0068): il
gatto di TASK-072 non si riconosceva, e i dettagli interni si perdevano.
L'utente vuole completarlo a mano sull'anteprima (ADR-0069).

**Decisione**:
- **Il formato c'è già**: un dettaglio è uno `stroke` dei file dei contorni
  (TASK-037): parte dalla linea o da un dettaglio prima, il percorso lo
  segue e torna indietro; se finisce su un suo punto chiude un anello (un
  occhio). `parse_outline` controlla che niente si incroci: la linea resta
  una sola. Il motore non cambia: `plan_shape` disegna già i `strokes`.
- **La geometria la decide il motore**, in un modulo nuovo
  (`route_engine/outline_edits.py`, shapely come `image_outline.py`),
  con regole fisse:
  - *parte*: il disegno si chiude, si semplifica all'1% come il contorno e
    si unisce alla sagoma. Deve sovrapporsi (una parte che tocca solo in un
    punto farebbe due pezzi) e aggiungere almeno lo 0,5% dell'area. I buchi
    si perdono. I dettagli già fatti devono restare attaccati alla linea
    nuova, altrimenti `covers_detail`;
  - *dettaglio*: l'inizio si aggancia al punto più vicino della linea o di
    un dettaglio entro il 6% della sagoma (il dito non è preciso), e i
    punti fatti scorrendo sulla linea si lasciano; dove il disegno si
    incrocia da solo si chiude l'anello e il resto si lascia; se la fine
    torna entro il 3% da un suo punto, l'anello si chiude lì. Poi la
    semplificazione all'1%, anello e gambo ognuno per sé;
  - limiti: al più 100 angoli per il contorno, 50 punti per tutti i
    dettagli insieme (ognuno si fa due volte), 2000 punti per un disegno;
  - **un disegno lontano dalla linea si collega, non si rifiuta**
    (seconda prova sull'iPhone, 2026-09-30: l'utente vuole disegnare dentro
    l'immagine): una linea aperta prende un tratto dritto dal punto più
    vicino al suo capo più vicino; una forma chiusa che non si sovrappone
    alla sagoma, o che ci sta dentro, diventa un anello appeso;
  - **le linee disegnate possono incrociarsi** e incrociare il contorno
    (scelta dell'utente, 2026-09-30: «a me va bene se si incrociano»):
    `parse_outline` ha `allow_crossings`, usato solo per i contorni
    modificati a mano; per i file dei contorni il controllo resta. Provato
    a Milano, 10 km, con un occhio, una bocca e due linee che incrociano:
    10,1 km, somiglianza 0,92; con tanti tratti interni il disegno si
    riconosce meno, e l'andata e ritorno fa a volte un piccolo anello
    (TASK-071);
  - un rifiuto ha un motivo in una parola: `short`, `covers_detail`,
    `too_many_corners`.
- **L'API non tiene stato**: `POST /image-outline-edits` riceve il contorno
  mostrato, nella cornice della foto (`image_points`, `image_strokes`,
  `aspect`), il tipo e la linea disegnata, e risponde con un
  `ImageOutline` nuovo, che ha anche `strokes` e `image_strokes`. Il motore
  lavora con x a destra e y in alto, in altezze della foto, così un
  cerchio su una foto larga resta un cerchio. Il rifiuto è `422`
  `outline_edit_rejected` con `reason`.
- **«Undo» è dell'app**: la pila dei contorni di prima, senza chiamare
  l'API. Una foto nuova azzera la pila.
- **`/image-route-jobs` e `/gpx` accettano `strokes`**, facoltativo, e lo
  controllano come il contorno (numeri finiti, dentro [-1, 1], al più 50
  punti, poi `parse_outline` con i dettagli). Un'app o un'API più vecchie
  vanno come prima: senza `strokes` il contorno è quello di TASK-073.
- **App**: «Edit the outline» apre una lavagna a tutto schermo (`Modal`),
  fuori dalla pagina che scorre, con «Add a part», «Add a detail», «Undo».
  Un dito disegna con un pulsante acceso, due dita ingrandiscono (fino a 8
  volte) e spostano; le linee restano larghe uguali. Tutto con i gestori di
  tocco di React Native (nessuna dipendenza nuova). I punti più vicini
  dell'1% della foto, diviso l'ingrandimento, si lasciano prima di
  mandarla. Le azioni arrivano al pannello dell'immagine con un contesto
  React, senza passare dal pannello del percorso. Prima prova sull'iPhone
  (2026-09-28): disegnando sull'anteprima dentro la pagina, la pagina
  scorreva; l'utente ha chiesto la lavagna a tutto schermo e lo zoom.

**Motivo**: il formato e il disegno dei tratti ripassati esistevano già
(gatto, pesce, testa di cane): basta produrli. Decidere nel motore tiene il
principio (il percorso lo decide il motore, e ora anche cosa diventa un
disegno) e rende tutto provabile con test deterministici. Rifiutare invece
di aggiustare di nascosto: il motivo dice come ridisegnare.

**Conseguenza**: prova da capo a fondo con il motore vero, Milano, 10 km:
una testa disegnata, due orecchie aggiunte, un occhio ad anello: 9,3 km,
somiglianza 0,96, in 3 s, una linea sola. Non si cancella una parte e non si spostano punti: per
togliere c'è solo «Undo». Un dettaglio che esce dalla sagoma è ammesso se
non incrocia la linea (baffi, antenne).

## ADR-0075 — Lo stile delle lettere nella richiesta e nell'app
**Stato**: Attiva · 2026-09-28 · chiesto dall'utente dopo TASK-077
(«tutti e due gli stili, da scegliere nell'app»); forma del campo, nomi e
testi decisi dall'agente su delega dell'utente (TASK-080)

**Contesto**: il motore scrive le parole in due stili (ADR-0072), ma
`style` era solo un argomento di `plan_route`: `RouteRequest`, API, CLI
delle partenze vicine e app non lo conoscevano.

**Decisione**:
- `RouteRequest.style`, `"round"` per difetto, controllato lì come gli
  altri campi: uno stile che non c'è, o `"block"` con una forma, è
  `InvalidRequestError`. `plan_route(style=None)` usa quello della
  richiesta; `ShapeJob.of_request` (partenze vicine, ADR-0071) pure.
- Nell'API `style` è un campo facoltativo di `RouteRequestBody`, passato
  com'è: lo controlla il motore. Non c'è in `ImageRouteRequestBody`.
- In `shared-types`: `LETTER_STYLES`, `LetterStyle`, `style?` nel
  `RouteRequest` (solo `"round"` per una forma); `contract.json` ha
  `styles`, confrontato dai test del motore e dei tipi.
- Nell'app, sotto il campo della parola, un `Segmented` «Round | Square»:
  «Square» perché «block» a un utente non dice niente. «Round» all'avvio,
  non salvato (servirebbe una dipendenza di storage). La parola parte
  sempre con `style`.

**Alternative scartate**: un campo `word_style` separato (un nome in più
per la stessa cosa del motore); lo stile scelto dall'API secondo la
griglia delle vie (è una scelta dell'utente, non del motore); il selettore
anche per le forme (non hanno lettere).

**Conseguenza**: un'app vecchia che non manda `style` ha le lettere di
prima; un'API vecchia rifiuta `style` (`extra="forbid"`): app e API vanno
aggiornate insieme, come per ogni campo nuovo.

---

## ADR-0078 — L'app pubblicata con EAS Update, aperta da Expo Go

**Data**: 2026-09-28 · **Task**: TASK-083 · **Stato**: accettata ·
strada scelta dall'utente (tramite `PASSAGGIO.md`); `expo-updates`
approvato dall'utente; dettagli decisi dall'agente su delega dell'utente

L'utente vuole aprire l'app dall'iPhone senza tenere acceso Expo sul PC.

**Decisione**:

- **EAS Update** sul progetto Expo `@lppl1316/shaperoute` (account
  personale dell'utente, non il team: Expo Go su iPhone apre solo i
  progetti dell'account con cui si entra). `expo-updates` ~57.0.23,
  `runtimeVersion` `exposdk:57.0.0` (l'unica forma che Expo Go accetta),
  `updates.url` e `projectId` in `app.json`; nessun `eas.json`, finché non
  servono build.
- Si pubblica a mano sul branch `preview` (`DEPLOY.md` A.6), non dalla CI:
  servirebbe `EXPO_TOKEN` fra i segreti di GitHub (proposta a parte).
- L'indirizzo dell'API viene da `EXPO_PUBLIC_API_URL` al momento della
  pubblicazione, salvato come variabile dell'ambiente `preview` su EAS
  (visibilità «plain text»: finisce comunque nell'app), non nel `.env` del
  PC: chiunque pubblichi, da qualunque PC, usa lo stesso indirizzo (chiesto
  dall'utente). L'app ricava l'API dall'host di Expo **solo** con
  `__DEV__` (`devServerHost` in `apiUrl.ts`): un update pubblicato è un
  bundle di produzione servito da Expo, e il suo host non è il PC.

**Scartata**: `expo publish` (non esiste più); una build propria o
TestFlight (serve l'account Apple Developer); un indirizzo dell'API letto
da un file remoto a ogni avvio (più codice, un servizio in più).

**Motivo**: una dipendenza ufficiale Expo, nessun codice nuovo tranne
l'host, e Expo Go resta quello di oggi.

**Conseguenza**: indirizzo e chiave dell'API sono dentro l'update,
leggibili da chi lo scarica; cambiare indirizzo o app vuol dire
ripubblicare. Con `expo start --no-dev` l'app non ricava più l'API
dall'host di Expo: serve `EXPO_PUBLIC_API_URL`.

## ADR-0079 — Più soggetti in una foto: fino a 4, appesi con un collegamento nel punto più vicino
**Stato**: Attiva · 2026-09-30 · il cosa deciso dall'utente (al più 4
soggetti, oltre la foto è rifiutata; il collegamento si vede sulla mappa,
fatto andata e ritorno; si collega «nel punto meno problematico per non
intaccare il disegno», cioè dove i soggetti sono più vicini); il come
deciso dall'agente su delega dell'utente (TASK-084)

Una foto con più soggetti era rifiutata (`scattered`, ADR-0068), o ne
restava solo il più grande. L'utente, provando TASK-079, vuole che si
disegnino tutti.

**Decisione**:
- **Il formato c'è già**: un soggetto in più è uno `stroke` con l'anello in
  fondo (TASK-037, ADR-0074). Il gambo è il collegamento, l'anello il
  contorno del soggetto. `parse_outline`, `plan_shape`, l'API e l'app li
  portano e li disegnano già: il lavoro è in `image_outline.py`.
- **Soggetto** è ogni pezzo sopra l'1% del più grande (la soglia delle
  macchioline di prima), tranne: un pezzo dentro un altro; un pezzo
  secondario tagliato dal bordo (prima si ignorava, e si ignora ancora: il
  bordo rifiuta solo il soggetto più grande); un pezzo che la lisciatura
  consuma. Sparisce la regola del 75%.
- **Una scala sola**: lisciatura e semplificazione usano il lato lungo di
  tutto il disegno, non del singolo soggetto. Sulla mappa la scala è una,
  e un soggetto piccolo non può avere più dettagli di quanti le strade ne
  disegnino. Con un soggetto solo il disegno è il soggetto: il contorno è
  quello di prima, punto per punto (verificato su 9 immagini contro il
  codice di `main`).
- **Il collegamento** è il tratto più corto fra il soggetto e tutto ciò
  che è già disegnato: contorno, soggetti e collegamenti di prima
  (`shapely.ops.nearest_points` sulle linee già semplificate). Si attacca
  ogni volta il soggetto più vicino al già disegnato. Per costruzione il
  tratto non attraversa niente: se attraversasse una linea, quella linea
  sarebbe più vicina. Il controllo severo di `parse_outline` (niente
  incroci) lo conferma a ogni foto.
- **Soggetti quasi attaccati diventano uno**: sotto il 2,5% del disegno,
  perché la semplificazione sposta ogni linea fino all'1% e due linee
  potrebbero toccarsi.
- **Limiti**: `MAX_SUBJECTS` = 4; oltre, `scattered`, lo stesso motivo con
  un testo nuovo («more than 4 separate things»): nessun valore nuovo nel
  contratto. Gli `strokes` dei soggetti hanno al più 150 punti
  (`MAX_SUBJECT_POINTS`), altrimenti `jagged`. `MAX_DETAIL_POINTS`, il
  limite di tutti gli `strokes` nell'API e nelle modifiche a mano, passa da
  50 a **200 punti percorsi** (`travelled_points`): un anello conta una
  volta, il gambo e un tratto senza anello due volte, andata e ritorno.
  Sono circa 100 punti di dettagli a mano senza anello: lo ha chiesto
  l'utente dopo i rifiuti `too_many_corners` provando TASK-079 (richiesta
  passata dalla sessione di TASK-079, con le sue misure: a Milano 100
  punti a zig-zag vanno a 5, 10 e 15 km; 120 falliscono a 15 km).
  Contare i punti percorsi tiene insieme le due cose: i soggetti, che si
  fanno una volta, pesano la metà di un dettaglio andata e ritorno.
  Misurato a Milano: 4 ingranaggi, 43 angoli più 118 punti di soggetti,
  a 10 e 15 km con somiglianza 0,99–1,00.

**Motivo**: riusare lo `stroke` ad anello tiene il principio (una linea
sola, decisa dal motore) senza toccare il motore dei percorsi né il
contratto. Il punto più vicino è quello che l'utente ha chiesto, ed è
anche il collegamento più corto da correre due volte.

**Conseguenza**: una foto con un pezzo secondario sopra l'1% (prima
ignorato) ora lo disegna come soggetto, con il suo collegamento. Il limite
resta un'approssimazione: a far fallire la distanza è la lunghezza dei
tratti ripassati, non il numero dei punti. Tre soggetti da 118 punti più
uno zig-zag fitto da 40 punti, dentro il limite, a Milano non si
disegnano né a 10 né a 15 km («does not fit», dopo l'attesa). «Add a part»
unisce solo al contorno principale: una parte disegnata sopra un soggetto
secondario diventa un anello appeso alla linea più vicina. Campioni a
12 km: a Milano somiglianza 0,96–0,98; a Levico 0,76–0,84, come le altre
forme con tratti in montagna.


## ADR-0081 — Comandi più visibili: bordo e fondo schiariti nei token
**Stato**: Attiva · 2026-09-30 · chiesto dall'utente («devono essere più
visibili i vari pulsanti, vedi tu come fare»); valori decisi dall'agente su
delega dell'utente (TASK-086)

**Contesto**: i comandi neutri (ADR-0046) avevano fondo `#1A1A1D` e bordo
`#33333A` sul fondo `#0A0A0B`: contrasto 1,1:1 e 1,6:1. Sull'iPhone,
all'aperto, un pulsante non si distingueva dal pannello.

**Decisione**: tre token cambiano, nessun file oltre `tokens.ts`:
`surfaceRaised` `#2B2B31`, `borderStrong` `#74747E` (4,3:1 sul fondo,
sopra il 3:1 chiesto a un comando), `border` `#3D3D44`. Tutti i comandi li
leggono già, quindi cambiano insieme: «Search», «My position», «Cancel»,
«Export GPX», − e +, l'opzione scelta di un interruttore, le tessere.

**Alternative scartate**: comandi gialli (il giallo è del percorso e di
«Draw route», ADR-0046); uno stile per pulsante, file per file (tocca file
di altri task e i comandi smettono di assomigliarsi); testo più grande
(non era il testo a mancare).

**Conseguenza**: anche i bordi dei campi e delle tessere sono più chiari.
Il testo sui comandi resta sopra 12:1.
## ADR-0080 — I luoghi suggeriti mentre si scrive
**Stato**: Attiva · 2026-09-30 · chiesto dall'utente («il suggerimento
della posizione, città, via, mentre sto scrivendo»); soglie e dettagli
decisi dall'agente su delega dell'utente (TASK-085)

**Contesto**: la ricerca del luogo partiva solo con «Search» o l'invio
(ADR-0029), per non mandare a Photon una richiesta a lettera.

**Decisione**: `PlaceSearch` cerca da solo quando il testo ha almeno 3
lettere e non cambia da 500 ms. «Search» e l'invio restano e cercano
subito; la pausa dopo non ripete la stessa ricerca. Si mostra solo la
risposta all'ultima ricerca chiesta; i suggerimenti di prima restano
sullo schermo finché arrivano i nuovi. Nessuna dipendenza nuova, stesso
servizio e stesso limite di 5 risultati.

**Alternative scartate**: una richiesta a ogni lettera (uso scorretto di
Photon, e risposte che si accavallano); togliere «Search» (con la rete
lenta è il modo di riprovare).

**Aggiunta dopo la prima prova dell'utente** (2026-09-30): «via bel» dava
una strada in Brasile. Quando la posizione GPS è nota (o, senza, l'ultimo
luogo scelto), va a Photon come `lat`/`lon`: i luoghi attorno vengono
prima. Photon risponde in circa 3 s: «Searching…» resta visibile.

**Conseguenza**: più richieste a Photon di prima, una per pausa. Se il
servizio dovesse limitare, la soglia e il ritardo sono due costanti.

## ADR-0082 — Il ritaglio della zona rifatto a mano, nello stesso ordine
**Stato**: Attiva · 2026-09-30 · il lavoro e il vincolo («percorsi
identici») chiesti dall'utente; il come deciso dall'agente su delega
dell'utente (TASK-087)

**Contesto**: l'API ritaglia a ogni richiesta il grafo dalla zona in
memoria (ADR-0030). `network.crop` passa due volte da una vista di
NetworkX, per trovare il pezzo connesso più grande e per copiarlo, e
intanto il garbage collector di Python ripassa più volte tutta la zona: a
Milano 2–5 s su questo Mac, 6–13 s sul PC di TASK-063.

**Decisione**:

- `route_engine/zone_crop.py`: `ZoneCrop(zona).crop(bbox)` costruisce il
  ritaglio dai dizionari della zona, senza viste. Dà il grafo di
  `network.crop` con nodi, archi e attributi **nello stesso ordine**,
  seguendo passo per passo quello che fa NetworkX (l'ordine di una vista,
  la visita in ampiezza dei pezzi, la copia). Dove NetworkX cambia ordine
  (un ritaglio con meno nodi della metà delle strade di un incrocio) lascia
  il lavoro a `network.crop`.
- Il ritaglio ha dizionari **suoi**, anche per gli attributi: ogni
  richiesta ha ancora il suo grafo e la zona non viene mai modificata. Il
  nodo «sink» di `_route_through_zones` e le richieste in parallelo restano
  com'erano; motore e `nearby_starts.py` non si toccano.
- `ZoneGraphs` sospende il garbage collector durante il ritaglio
  (`_gc_paused`, con un contatore per i ritagli contemporanei) e lo
  riaccende alla fine se era acceso. La raccolta è solo rimandata.
- `network.crop` resta: lo usa la CLI, ed è il riferimento dei test.

**Scartate**:

- *Nessun ritaglio: il motore sulla zona intera o su una vista.* L'ordine
  dei nodi e degli archi cambierebbe, e con lui i percorsi a parità di
  costo; una vista rende più lento ogni Dijkstra; il «sink» finirebbe nel
  grafo condiviso dalle richieste in parallelo.
- *Tenere il ritaglio per la stessa area.* Le partenze dal GPS cambiano a
  ogni richiesta (l'area è arrotondata a 10 m), e un grafo riusato andrebbe
  protetto dal «sink» di chi lo sta usando.
- *Attributi condivisi con la zona* (senza copiarli): 0,1 s in meno, ma un
  attributo cambiato da una richiesta arriverebbe a tutte le altre.

**Perché così**: i percorsi dipendono dall'ordine nel grafo, non solo dal
suo contenuto. Rifare lo stesso grafo più in fretta è l'unica strada che
non tocca né il motore né quel che vede.

**Conseguenza**: `zone_crop.py` dipende da come NetworkX 3 ordina viste e
visite. Se una versione nuova lo cambia, `test_zone_crop.py` fallisce (il
confronto è con `network.crop` nello stesso processo): si aggiorna
`ZoneCrop`, o si torna a `crop` in `graphs.py`, una riga. Una zona in
memoria non va modificata dopo essere stata data a `ZoneCrop`.

## ADR-0083 — Suggerimenti dei luoghi: risposte intermedie e tocco che chiude
**Stato**: Attiva · 2026-09-30 · chiesto dall'utente («la ricerca è lenta,
il suggerimento non riesco a premerlo»); deciso dall'agente su delega
dell'utente (TASK-089). Modifica ADR-0080.

**Contesto**: Photon risponde in 2–3 s, tempo del server. Con ADR-0080 si
mostrava solo la risposta all'ultima ricerca: chi continuava a scrivere
non vedeva nulla per 5–6 s. Dopo il tocco su un suggerimento il campo
restava col testo parziale, e un tocco entro la pausa faceva ripartire la
ricerca e riaprire l'elenco.

**Decisione**: le ricerche sono numerate e una risposta con dei luoghi si
mostra se è più nuova di quella sullo schermo, anche con un'altra in
corso; «No place found» e l'errore solo per l'ultima. La pausa scende da
500 a 300 ms. Al tocco il campo prende il nome del luogo, la tastiera si
chiude, le risposte in arrivo si scartano e quel testo non si cerca.

**Alternative scartate**: una richiesta a lettera (ADR-0080); cambiare
servizio o ospitare Photon (scelta dell'utente, fuori dal task).

**Conseguenza**: qualche richiesta in più a Photon. I suggerimenti possono
essere per il testo di un attimo prima, finché arriva la risposta nuova.

## ADR-0090 — Il punteggio di una corsa: somiglianza del percorso per fedeltà
**Stato**: Attiva · 2026-09-30 · il punteggio chiesto dall'utente; il come
deciso dall'agente su delega dell'utente (TASK-111)

**Contesto**: l'utente vuole un punteggio per il disegno corso, «in base
alla somiglianza». Il task proponeva di confrontare la traccia GPS con la
forma ideale, con `shape_similarity`. Ma la forma piazzata (ruotata,
scalata, per le parole con le lettere spostate) non esce dal motore:
`RouteResult` porta i punti del percorso e la sua somiglianza, e così API
e app. Parole e immagini poi non usano la stessa misura delle forme.

**Decisione** (`track_score.py`):
- **Punteggio = arrotonda(100 · somiglianza del percorso · fedeltà).** La
  fedeltà è la media armonica fra la quota del percorso pianificato con la
  traccia entro 40 m e la quota della traccia entro 40 m dal percorso.
- **40 m**, come `OFF_ROUTE_M` dell'app (ADR-0070): chi non ha mai sentito
  «Off the route» non perde punti.
- **Pulizia prima del confronto**: errore oltre 40 m, passi sotto 1 m,
  salti oltre 12 m/s (solo con gli orari).
- **Niente punteggio** sotto 2 posizioni buone o sotto il 10% della
  lunghezza del percorso: un errore con il motivo, non uno zero.
- CLI: `--score-track FILE`, che ripianifica il percorso della richiesta.

**Scartata**: *traccia contro forma piazzata, con la somiglianza del
motore.* Chiede di portare il piazzamento nel contratto (API,
`shared-types`, app) e una strada diversa per parole e immagini; e la sua
tolleranza, il 2% del perimetro, a 15 km è 300 m: chi corre la via
parallela prenderebbe lo stesso voto.

**Conseguenze**: chi corre il percorso per intero prende il voto del
percorso, mai di più: una forma che le strade disegnano male ha un tetto
basso anche corsa bene. Chi devia e disegna la forma *meglio* del piano
perde punti. Il punteggio non riconosce una traccia finta o fatta in bici:
annotato, non fatto. TASK-113 deve mandare all'API punti e somiglianza del
percorso; presa dall'app, la somiglianza si può falsare: TASK-117 la
ricalcola o la conserva col percorso.

## ADR-0085 — Il registro delle richieste dell'API, spento per default
**Stato**: Attiva · 2026-09-30 · la funzione è chiesta dall'utente («serve
a correggere i difetti e non si vede nell'app»); tutto il resto deciso
dall'agente su delega dell'utente (TASK-090)

**Contesto**: in TASK-075 l'utente ha visto sull'iPhone un cuore brutto a
Caldonazzo e non si è potuto rifare: la partenza era il GPS del telefono, e
25–100 m portano la somiglianza da 0,73 a 0,92. L'API non tiene niente
delle richieste. La richiesta contiene la posizione di chi la fa.

**Decisione**:
- Un modulo nuovo, `shaperoute_api/request_log.py`: una riga JSON (JSON
  Lines) per ogni richiesta di percorso finita, in
  `data/requests/requests.jsonl`, fuori dal repository (`.gitignore`), con
  ora, tipo, id del job, il corpo com'è arrivato (`model_dump` del corpo
  già controllato) e l'esito: distanza, somiglianza, secondi, numero di
  punti e un'impronta SHA-256 dei punti; oppure il solo codice dell'errore.
- **Spento per default**; acceso con `--request-log` o
  `SHAPEROUTE_REQUEST_LOG=1`. Acceso per default sarebbe una scelta
  dell'utente (le posizioni restano su disco): non è stata presa qui.
- La riga si scrive nel thread del job, **dopo** che il job ha la sua
  risposta (`on_end` di `RouteJobs`): l'app non aspetta il disco. Ogni
  errore di scrittura è un avviso nel log, senza il corpo; un ascoltatore
  che fallisce non cambia l'esito del job.
- Tetto: a 5 MB il file diventa `requests.old.jsonl` e ne parte uno nuovo;
  al massimo 10 MB. File creato con permessi `0600`, cartella `0700`.
- Si registrano solo le richieste di percorso (`/route-jobs`,
  `/image-route-jobs`, `/routes`). Niente intestazioni, chiave, indirizzo
  del client, foto, punti del percorso, messaggio dell'errore.
- `python -m shaperoute_api.replay`: legge una riga (`--job`, `--line`, o
  l'ultima), ricostruisce la richiesta con `to_request`, la dà a
  `plan_request` sui grafi in cache e confronta l'impronta; codice di
  uscita 1 se il percorso non è quello registrato; `--gpx` lo scrive.

**Alternative scartate**: registrare dentro `data/cache` (la cache si copia
a un collega, `PASSAGGIO.md`: porterebbe con sé le posizioni); scrivere la
riga all'arrivo della richiesta e l'esito in una seconda riga (due righe da
ricomporre; si perde solo la richiesta in corso se l'API muore); salvare
tutti i punti del percorso (file cento volte più grande: l'impronta basta a
dire «uguale», e il percorso si rifà); un middleware HTTP (vedrebbe
intestazioni e foto); `logging.handlers.RotatingFileHandler` (non crea il
file con permessi ristretti).

**Conseguenza**: un percorso si rifà uguale finché motore e grafi in cache
sono gli stessi; se cambiano, il replay lo dice. Il motore non usa le
partenze vicine quando la memoria libera è poca (ADR-0071): in quel caso un
replay può dare un percorso diverso da quello registrato. Su un server il
file conterrebbe le posizioni di tutti gli utenti: `DEPLOY.md` lo dice.
Un'API su più processi scriverebbe nello stesso file da più parti: oggi è
un processo solo.

## ADR-0091 — La traccia della corsa: registrata nella navigazione, in un file
**Stato**: Attiva · 2026-09-30 · la traccia chiesta dall'utente per il
punteggio; il come deciso dall'agente su delega dell'utente (TASK-112)

**Contesto**: il punteggio (ADR-0090) vuole la traccia GPS della corsa.
L'app riceve già le posizioni durante la navigazione (`useNavigation`), con
lo schermo acceso o in modalità tasca; a telefono bloccato Expo Go non le
dà.

**Decisione**:
- `trackRecorder.ts`, puro: tiene una posizione se ha errore entro 40 m
  (`POOR_FIX_M`, ADR-0070), è ad almeno 5 m dall'ultima tenuta e non ha un
  orario precedente. Salti e velocità li giudica il motore (ADR-0090).
- `trackStore.ts`: un solo file, `current-run.json`, nei **documenti**
  dell'app (la cache il sistema la può svuotare), con `expo-file-system`
  già presente. Dentro: percorso pianificato, traccia, stato (`running`,
  `stopped`, `arrived`). Scritto alla prima posizione, poi al più ogni
  15 s, a «Stop» e all'arrivo. `running` trovato alla riapertura vuol dire
  app chiusa durante la corsa.
- **Riprendere senza chiedere**: «Start» sullo stesso percorso, con
  l'ultima posizione a meno di 30 minuti, continua la traccia; se no ne
  comincia una nuova, che sostituisce il file alla prima posizione tenuta.
- Un file che il telefono rifiuta non ferma né la navigazione né la
  traccia in memoria.

**Scartate**: *chiedere «riprendi o scarta» alla riapertura*: serve una
schermata in `App.tsx`, fuori dai file del task; va con la schermata di
fine corsa (TASK-113). *Più corse nel file*: per ora serve solo l'ultima;
i disegni salvati sono di TASK-117. *GPS in background*: serve una build
propria, non Expo Go.

**Conseguenze**: il file tiene i punti del percorso ma non la sua
somiglianza né la richiesta, che `useNavigation` non riceve: TASK-113, che
tocca `App.tsx`, deve passarle e salvarle. Una corsa da 21 km sono circa
4000 posizioni, mezzo MB riscritto ogni 15 s. Dopo la chiusura dell'app il
percorso sullo schermo non c'è più: la traccia resta nel file ma si
riprende solo se l'app ridisegna lo stesso identico percorso.

## ADR-0092 — Nessuna posizione nel log dell'API
**Stato**: Attiva · 2026-09-30 · chiesto dall'utente («togli le partenze
dal log a schermo dell'API»); il come deciso dall'agente su delega
dell'utente (TASK-091)

**Contesto**: da TASK-076 il motore scriveva nel log, per ogni richiesta di
forma o parola, le coordinate della partenza e delle partenze vicine
provate («start 0 (45.9934, 11.258): score…»), e l'errore di una partenza
vicina che non disegna le ripeteva («from (45.99…)»). Emerso in TASK-090.

**Decisione**: `nearby_starts.py` scrive «start N: score…, approach … m»
senza coordinate, e l'errore dice «from this start». Restano il numero
della partenza e i metri di avvicinamento, che bastano a leggere la scelta.
Per rifare una richiesta c'è il registro (ADR-0085), che è spento finché
non lo si accende.

**Non toccato**: il log dice ancora quale file di grafo è stato letto
(`foot_45.97750_11.24860_….graphml`): è il nome del file in cache, cioè il
riquadro di una zona larga chilometri, non la partenza. Cambiarlo tocca
`graphs.py` / `network.py` e i nomi della cache.

**Conseguenza**: chi legge il log non vede più dove si trova l'utente;
per sapere la partenza di una richiesta serve il registro.

## ADR-0093 — Il punteggio a fine corsa: l'API lo calcola, l'app tiene la corsa
**Stato**: Attiva · 2026-09-30 · la schermata chiesta dall'utente; il come
deciso dall'agente su delega dell'utente (TASK-113)

**Contesto**: il motore sa dare il punteggio (ADR-0090) e l'app registra la
traccia (ADR-0091). Manca il giro: chiedere il punteggio e mostrarlo.

**Decisione**:
- **`POST /track-scores`**: punti e somiglianza del percorso più le
  posizioni della corsa; risponde il `TrackScore` del motore. Niente grafo,
  niente stato. La corsa troppo corta è `422 invalid_request` con il motivo
  del motore: nessun codice d'errore nuovo.
- **La somiglianza la manda l'app**, che l'ha avuta col percorso: senza
  account non c'è niente da difendere. Quando il punteggio si salva o si
  pubblica (TASK-117) il server non può fidarsi: va ricalcolata o tenuta
  col percorso.
- **La traccia porta con sé la somiglianza**: `useNavigation` la riceve e
  `trackStore` la scrive nel file (campo facoltativo, la versione resta 1).
- **Fine corsa**: «Stop»/«Finish» chiama `endRun()`, che scrive subito il
  file e restituisce la corsa; la schermata è `FinishCard` dentro
  `MapScreen`, con la mappa che disegna la corsa sopra il percorso (un
  secondo strato, `showTrack`, colori dal token `track`).
- **La corsa si cancella solo dopo il punteggio** (o se è troppo corta).
  Senza rete resta nel file, e alla riapertura l'app parte dalla schermata
  di fine corsa: è la risposta a «riprendi o scarta» rimandata da TASK-112.
  Riprendere la navigazione dopo aver chiuso l'app no: il percorso e le
  indicazioni non sono nel file.

**Scartate**: *calcolare il punteggio nell'app*: sarebbe una seconda copia
della misura del motore, in un altro linguaggio. *Un codice d'errore
`track_not_scorable`*: l'app non chiede altro a questo endpoint che possa
essere rifiutato. *Una domanda «riprendi o scarta» all'avvio*: la schermata
di fine corsa dice già tutto, e «Done» la chiude.

**Conseguenze**: toccati anche file fuori dall'elenco del task, detti nella
PR: `src/map/` (la linea della corsa), `theme/tokens.ts` (il token
`track`), `trackStore.ts` e `useNavigation.ts` (la somiglianza, `endRun`),
i test accanto, e due fixture in `shared-types`. Una corsa senza punteggio
blocca l'avvio sulla schermata di fine corsa finché l'API non risponde o
un'altra corsa la sostituisce.


## ADR-0086 — Tutti i percorsi generati si salvano, i migliori si consigliano
**Stato**: Attiva · 2026-10-01 · **scelta dell'utente** (TASK-092). Il
numero è uno di quelli lasciati liberi (0086 … 0089, `PASSAGGIO.md`), per
non scontrarsi con gli ADR che TASK-110 sta per scrivere.

**Contesto**: l'utente vede percorsi diversi a ogni richiesta (la partenza
GPS si sposta di 25–100 m, TASK-075) e vuole tenere quelli venuti
benissimo. Con la parte social (TASK-110 … 122) vuole un archivio delle
ricerche di tutti, per consigliare i percorsi migliori agli utenti e usarli
sui social del progetto. Proposta dell'agente: salvare e consigliare solo i
percorsi che l'utente sceglie di condividere.

**Decisione dell'utente**: si salvano **tutti** i percorsi generati, senza
che l'utente scelga; i migliori si consigliano agli altri e si usano sui
social. Motivo, con le sue parole: chi corre passa su strade pubbliche,
al massimo davanti alla casa di un altro, senza fare male a nessuno; e
consigliare i percorsi serve anche a **ripopolare strade di solito poco
frequentate**.

**Conseguenza**:
- Serve il database (TASK-114) e l'API sempre accesa (TASK-122): sul Mac
  il registro delle richieste (ADR-0085) raccoglie già le richieste
  dell'utente, non quelle degli altri.
- La partenza di un percorso salvato è spesso dove abita chi l'ha chiesto.
  Resta da decidere con TASK-110 (punto 6, «Dati personali») cosa dice il
  testo della privacy e se un percorso consigliato si mostra partendo da
  un punto del giro invece che dalla partenza vera.

**Aggiunta** (2026-10-01, scelta dell'utente): due percorsi di qualità
uguale si tengono e si propongono **tutti e due**; nessuno dei due passa
davanti all'altro perché tocca strade meno frequentate (era la proposta
dell'agente, scartata).

## ADR-0095 — I luoghi da Geoapify, attraverso l'API
**Stato**: Attiva · 2026-10-01 · servizio scelto dall'utente («Geoapify
via l'API»); dettagli decisi dall'agente su delega dell'utente
(TASK-123). Modifica ADR-0029 per i suggerimenti della partenza.

**Contesto**: Photon pubblico risponde in 2–4 s (misurato il 2026-09-30 e
il 2026-10-01, quasi tutto tempo del server). Nominatim è veloce ma le sue
regole vietano l'autocompletamento.

**Decisione**: `GET /places` nell'API chiede l'autocompletamento di
Geoapify con la chiave `GEOAPIFY_API_KEY`, che resta sull'API. Stesse
etichette di Photon («nome, area»), al più 5 luoghi, `lat`/`lon` come
`bias=proximity`. Cache in memoria di 500 ricerche per un'ora, chiave del
testo in minuscolo a spazi singoli e del punto arrotondato a 0,01°.
Richiesta con `urllib` della libreria standard: nessuna dipendenza nuova.
Il corpo è in `packages/shared-types/fixtures/places.json`, letto dai test
dell'API e dell'app; senza tipo nuovo in `shared-types` (`Place` resta in
`photon.ts`). L'app chiede all'API con 2,5 s di tempo; se manca, è lenta o
dà errore usa Photon; dopo un 503 (niente chiave) non la richiede fino al
riavvio. Senza chiave, `503 http_error`: nessun codice d'errore nuovo.

**Alternative scartate**: la chiave nell'app (`EXPO_PUBLIC_…`): chiunque
la legge dal pacchetto pubblicato; MapTiler e Photon sul Mac (scelta
dell'utente); un codice d'errore `places_unavailable` (tocca il contratto
per un caso che l'app tratta come ogni altro errore).

**Conseguenza**: con l'API spenta la ricerca resta su Photon, lenta. Il
piano gratuito di Geoapify regge 3000 ricerche al giorno, una per pausa
di scrittura, meno quelle in cache.

## ADR-0096 — Nessuna query string nel log di accesso dell'API
**Stato**: Attiva · 2026-10-01 · deciso dall'agente su delega dell'utente
(TASK-124), su segnalazione della sessione di TASK-090/091.

**Contesto**: con TASK-123 l'app chiama `GET /places?q=…&lat=…&lon=…`, e
il log di accesso di uvicorn scrive l'URL intero: la posizione
dell'utente tornava nel log dell'API, che non ne deve avere (ADR-0092).

**Decisione**: un filtro sul logger `uvicorn.access`
(`shaperoute_api/access_log.py`), messo all'avvio, toglie la query string
da ogni riga: restano metodo, percorso e stato. Vale per tutti gli
endpoint, così un parametro nuovo non può riportare dati nel log.

**Alternative scartate**: `lat`/`lon` in un `POST` (cambia il contratto
appena usato dall'app pubblicata); arrotondarli a 1 km prima di mandarli
(nel log resterebbe comunque la zona, e il testo cercato).

**Conseguenza**: nel log non si legge più cosa è stato cercato. Le righe
scritte prima del filtro restano nel file finché non si cancellano.


## ADR-0097 — Il seme del catalogo dei percorsi consigliati
**Stato**: Attiva · 2026-10-01 · scelta dell'utente (13 città, variante C
di TASK-092); il come deciso dall'agente su delega dell'utente (TASK-125)

**Contesto**: la schermata «Explore» di TASK-092 mostra i percorsi
migliori vicino a chi guarda. Finché nessuno ne ha generati, sarebbe vuota
proprio all'arrivo dei primi utenti. Un catalogo per tutta l'Italia costa
ore di download da Overpass, e quasi tutto resterebbe lontano dagli utenti.

**Decisione**:
- **Un seme, poi la crescita dagli utenti**: 13 città (Trento, Levico,
  Milano, Roma, Torino, Bologna, Firenze, Napoli, Verona, Padova, Genova,
  Bari, Palermo), dal centro (una piazza, mai la posizione di qualcuno),
  ogni forma del catalogo a 5, 10 e 21 km, pianificate come l'API
  (`plan_nearby`). Il resto lo portano i percorsi degli utenti (ADR-0086).
- **Si tiene da 0,88 di somiglianza in su**, tutti, anche se equivalenti
  (TASK-092, punto 3). La somiglianza non basta da sola (la zucca a 0,92
  giudicata «no», TASK-078): un campione per città si guarda a occhio.
- **Nei file, non nel database**: `catalog/seed/<città>.json`, un file per
  città, ricostruito ogni volta dal registro delle prove
  (`out/seed_catalog/runs.jsonl`, fuori dal repository). Si caricano nel
  database con TASK-114. Coordinate a 6 decimali.
- **La licenza dei dati è nel file**: i percorsi stanno su strade di
  OpenStreetMap (ODbL): chi li pubblica, anche sui social, cita
  «© OpenStreetMap contributors».
- **Lo script è nel motore** (`route_engine/seed_catalog.py`): usa il
  motore e basta, gira senza API né chiavi; in `tools/` la CI ha solo la
  libreria standard.

**Alternative scartate**: tutta l'Italia subito (8000 comuni, percorsi che
nessuno vede, mappe che invecchiano); solo le zone già in cache (tre città
del nord).

**Conseguenza**: una partenza per città: chi è a 5 km dal centro non ha
ancora niente vicino. Il registro locale serve per rifare la selezione con
un'altra soglia senza ripianificare.

**Aggiunta (2026-10-01, scelta dell'utente)**: anche **le frasi** e **New
York** (Union Square, sulla griglia di Manhattan). Ogni città ha le sue
parole, nella lingua del posto (`PHRASES`): CIAO, TIAMO, GRAZIE, BUONDI,
NOTTE, AMORE, HELLO in Italia, più quelle locali (UELA a Milano, CEREA a
Torino, AO e AMOR a Roma, BONA a Firenze, UAGLIO e AMMORE a Napoli, ROMEO a
Verona, UE a Bari, AMURI a Palermo); HELLO, ILOVENY, THANKS, LOVE, HEY, NYC
a New York. Il motore scrive solo A–Z, senza spazi, al più 7 lettere a
21 km: BUONGIORNO e BUONANOTTE non ci stanno, BUONDI e NOTTE sì. Una parola
si scrive a 3,75 km a lettera (come CIAO a 15 km), da 5 a 21 km, nei due
stili, tonde e squadrate; nel catalogo ha `word` e `style` invece di
`shape`.

## ADR-0098 — «Explore» dal catalogo, prima del database
**Stato**: Attiva · 2026-10-01 · variante C scelta dall'utente (TASK-092);
il come deciso dall'agente su delega dell'utente (TASK-126)

**Contesto**: l'utente ha chiesto di programmare «Explore» e provarlo
subito. Il database (TASK-114) non c'è ancora; il seme del catalogo sì
(ADR-0097).

**Decisione**:
- **L'API serve i file di `catalog/seed/`**, letti all'avvio:
  `GET /recommended-routes` (vicino a un punto, con l'anteprima) e
  `GET /recommended-routes/{id}` (intero). Con TASK-114 la stessa API
  leggerà dal database: il contratto resta.
- **L'anteprima la calcola l'API** (64 punti), così la lista pesa poco; la
  miniatura nell'app sono segmenti di `View` ruotati: nessuna dipendenza
  nuova (niente `react-native-svg`).
- **Una terza schermata**, oltre alle due di TASK-051, nello stesso stato
  di `App.tsx`, senza librerie di navigazione.
- **Niente «Start»** sui percorsi di «Explore»: non hanno le indicazioni di
  svolta. Restano mappa e GPX.
- **I tipi nell'app** (`src/explore/recommendedRoutes.ts`), non in
  `shared-types`, come `Place` (TASK-123): `shared-types` è toccato da
  un'altra PR aperta (TASK-088).

**Conseguenza**: «Explore» mostra solo le città del seme, a 5 km dal
centro; altrove dice che non ci sono ancora percorsi. Nell'immagine Docker
`catalog/` non c'è: là la lista è vuota finché non la si copia.

## ADR-0087 — Più percorsi fra cui scegliere: le partenze vicine non si buttano
**Stato**: Attiva · 2026-10-01 · come si vedono, quanti e le immagini
sono **scelte dell'utente**; il resto deciso dall'agente su delega
dell'utente (TASK-093). Numero preso fra quelli lasciati liberi (0086 …
0089, `PASSAGGIO.md`).

**Contesto**: dalla stessa partenza il percorso è sempre lo stesso, ma
pochi metri di GPS ne danno un altro, a volte più bello (TASK-075,
TASK-090). Il motore ne calcola già fino a 4 per richiesta (ADR-0071) e ne
tiene uno.

**Scelte dell'utente**: tessere «A · B · C» sotto la mappa, con gli altri
percorsi grigi sulla mappa (proposta A di tre); fino a 3 percorsi, solo se
diversi e con somiglianza non più di 10 punti sotto il migliore; le
alternative anche per le immagini, sapendo che possono costare tempo.

**Decisioni tecniche**:
- `route_engine/alternatives.py` (nuovo): sceglie fra i percorsi delle
  partenze provate. «Stesso percorso»: ciascuno entro 20 m dall'altro per
  il 90% della lunghezza (shapely, già dipendenza). `Plan.alternatives` e
  `RouteResult.alternatives`, con default vuoto: niente cambia per chi non
  li usa (CLI, test).
- Il percorso scelto non cambia. Dopo un piano già buono le vicine si
  aspettano al più 3 s (prima: per niente), altrimenti le alternative
  mancavano proprio sui percorsi venuti bene (Trento 12 km: tutte e tre le
  vicine «still running» dopo 1,5 s).
- Le immagini passano anch'esse da `plan_nearby` (`image_job`), con il
  piano di sempre per la partenza dell'utente; nelle misure il tempo è
  rimasto 1,5–2,8 s, e a Caldonazzo l'immagine è migliorata (0,75 → 0,85).
- API: ogni alternativa ha le sue indicazioni (`with_choices`), calcolate
  sugli stessi grafi; +0,03–0,15 s. `/routes` le manda senza indicazioni.
- Contratto: `alternatives?` facoltativo in `shared-types`, un'app o
  un'API vecchie funzionano come prima; `MAX_ALTERNATIVES` in un file di
  esempio nuovo (`route-alternatives.json`), per non toccare
  `contract.json`, modificato in quel momento da TASK-088.
- App: lo stato del percorso scelto (`Picked`) resta legato al risultato a
  cui appartiene, così un risultato nuovo riparte da A senza effetti.
  Navigazione, GPX e avvisi leggono il percorso scelto.

**Alternative scartate**: più ricerche apposta per avere alternative (più
tempo per ogni richiesta); mostrare tutti e 4 i percorsi senza filtri
(scelta dell'utente); alternative dalle prove interne della ricerca
(posizioni o rotazioni diverse dalla stessa partenza: spesso quasi uguali,
e senza la strada fatta per arrivarci).

**Conseguenza**: dove le partenze vicine sono poche o il grafo è troppo
grande (Milano, oltre 30 000 nodi, ADR-0071) le alternative mancano. Una
richiesta con piano buono può durare fino a 3 s di più.

## ADR-0099 — Una forma che passa dai luoghi veri di un tema, in ogni città
**Stato**: Attiva · 2026-10-01 · scelta dell'utente («forma + tappe», città
di tutto il mondo); il come deciso dall'agente su delega dell'utente
(TASK-129)

**Contesto**: l'utente vuole cercare qualsiasi città in «Explore» e
chiedere un percorso in parole («romantico a Parigi», «gastronomico a
Tokyo»), con luoghi veri e niente inventato, al costo più basso.

**Decisione**:
- **L'AI interpreta, i dati danno i luoghi, il motore il percorso**: il
  principio di `CLAUDE.md` resta. Tabelle di parole prima, AI solo per il
  tema che manca e vincolata a una lista; mai luoghi né coordinate.
- **I luoghi da Geoapify Places** (OpenStreetMap), con la chiave che
  c'è già: con un nome, Wikidata per dire «notevole». Niente ricerca
  libera su Internet: costa di più e non dà coordinate verificabili.
- **Le città dalla geocodifica per città**, non dall'autocompletamento
  (il centro vero, non quello dell'area del comune).
- **Forma + tappe nel motore** (`stops.py`): la forma pianificata da
  qualche partenza fra i luoghi, tenuta la più leggibile che ne tocca di
  più; dice quali tocca. Nessun cambio all'ottimizzatore.
- **Un job a parte** (`/themed-route-jobs`), non `/route-jobs`: il
  contratto dei percorsi resta com'è.

**Alternative scartate**: la ricerca web con un modello (luoghi e
coordinate non verificabili, costo per richiesta); un percorso a tappe
senza forma (scelta dell'utente); toccare `optimizer.py` per pesare i
luoghi nella ricerca (più rischio, da rivedere coi risultati).

**Conseguenza**: funziona dove le strade si scaricano. Da questo Mac
Overpass risponde solo da un indirizzo (`MAPS.md`): oggi solo le zone in
cache (Trento, Levico, Milano, Roma, Torino, Bologna); New York, Parigi,
Tokyo dopo TASK-127. Una forma tocca di solito 2–9 luoghi, non tutti.

## ADR-0100 — Overpass dall'indirizzo che risponde
**Stato**: Attiva · 2026-10-01 · via esplicito dell'utente; il come deciso
dall'agente su delega dell'utente (TASK-127)

**Contesto**: da questo Mac uno dei due indirizzi di `overpass-api.de`
rifiuta ogni connessione, e OSMnx usa sempre quello (MAPS.md). Ogni zona
nuova falliva: il catalogo fermo a 6 città, «Explore» a tema senza New
York, Parigi, Tokyo (TASK-125, TASK-129). Nel 2026-09-23 si era deciso di
lasciarlo così; l'utente ha chiesto di sistemarlo.

**Decisione**: un modulo del motore, `overpass_address.py`. Prima di un
download prova a connettersi agli indirizzi IPv4 del server nell'ordine del
resolver; per la durata del download `socket.gethostbyname` e
`socket.getaddrinfo` danno, per quel solo nome, il primo che risponde (come
fa già OSMnx per tenere lo stesso server). Il nome resta nell'URL: il
certificato HTTPS si controlla come sempre. Un lock: un download alla
volta. Se nessun indirizzo risponde, nulla cambia. Vale per i grafi e per
le vie con nome (`_overpass`).

**Alternative scartate**: un altro server Overpass (quelli provati non
rispondevano da qui); l'indirizzo nell'URL (il certificato non
corrisponderebbe); uno script fuori dal motore (non vale per l'API).

**Conseguenza**: il centro di Verona, mai scaricato, in 10 s. Il cambio è
globale al processo per la durata del download: altri nomi non sono
toccati.
