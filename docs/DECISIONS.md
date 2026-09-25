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
