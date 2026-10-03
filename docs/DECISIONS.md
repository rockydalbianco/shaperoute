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
**Stato**: Superata da ADR-0114 (scelte dell'utente) e ADR-0115 (come) ·
2026-10-01 (TASK-110)

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

## ADR-0063 — Lettere unite anche dalla cima: tre regole di lettura, la parola più corta
**Stato**: Attiva · 2026-10-02 · chiesto dall'utente nel giudizio di
TASK-059 (2026-09-25: «anche connetterle dalla cima», se non confonde o
aiuta); formato, regole e scelta decisi dall'agente su delega dell'utente
(TASK-067); accese per difetto in tutti e due gli stili per scelta
dell'utente (2026-10-02)

**Contesto**: ogni lettera entra ed esce sulla base, e le unioni si corrono
due volte. U, V, W, Y e T toccano la base a metà: l'unione passa sotto
mezza lettera, mentre in cima hanno un angolo sul bordo. A pari chilometri
una parola più corta dà lettere più alte, e lettere più basse si leggono
peggio (ADR-0067). Le misure sono in `docs/tasks/TASK-067.md`.

**Decisione**:
- **Il formato**: una lettera che si può unire in cima lo dichiara in
  `letters.json` e `letters_block.json` con `"top": {"in": [x, 1], "out":
  [x, 1]}`, uno o tutti e due. Il task chiedeva per ogni ingresso e uscita
  i suoi `out` e `back` scritti a mano; li ricava invece il motore
  (`Letter.route`) dalla linea chiusa che la lettera ha già, cominciata
  dall'ingresso e tagliata all'uscita. La lettera è per costruzione la
  stessa, corsa lo stesso numero di volte, e non ci sono 150 linee in più
  da tenere uguali a mano. Ne segue che la lunghezza delle lettere non
  cambia mai: una coppia si accorcia solo per lo spazio.
- **Tre regole di lettura**, controllate da `parse_letters` sull'alfabeto
  (un `top` che ne viola una è rifiutato), ognuna con un test e una coppia
  che la viola:
  1. un'unione in cima non allunga un tratto che finisce sulla cima (la
     sbarra della T, il braccio alto di E, F, Z e delle C, G, S squadrate):
     «TU», «EH», «CH» squadrata restano sulla base. Era la regola già
     scritta nel task, sul modello di ADR-0056;
  2. un'unione in cima non passa sopra la lettera, entra dal bordo sinistro
     ed esce dal destro: «PU» resta sulla base. Sotto la lettera la linea è
     il rigo; sopra è un tratto in più;
  3. una lettera che tocca la cima in un punto solo non si unisce lì: «VI»
     e «UL» restano sulla base. La I fra due unioni in cima è una T («VIVA»
     si legge «VTVA»); con la cima da un lato e la base dall'altro la I e
     la L sono un gradino, il caso che il task chiedeva di guardare.
- **Cima da un lato e base dall'altro è permesso** alle lettere che passano
  le tre regole (H, M, N, U, V, W, X, Y…): hanno due punti in cima e
  restano loro stesse (la V di «UVA»).
- **La scelta** (`choose_joins`): ogni spazio tutto sulla base o tutto in
  cima; fra le combinazioni permesse, al più 128, la parola più corta; a
  pari lunghezza meno unioni in cima, poi la base per prima. Deterministica.
- **Accese per difetto in tutti e due gli stili** (`words.TOP_JOINS`),
  scelta dell'utente. Sui campioni l'utente ha preferito il percorso di
  oggi in tutti e sette i casi giudicati (unioni in cima: 5 «no», 2
  «quasi», nessun «sì») e ha detto che le tre regole vanno bene; nella
  scelta finale ha chiesto di accenderle per tonde e squadrate, e
  interpellato sulla differenza fra le due risposte ha confermato
  «accendi in cima». `compose` e `plan_route` hanno `top_joins`,
  `measure_words.py` ha `--no-top-joins`: con le unioni spente ogni parola
  è identica a prima, punto per punto (test). API, `shared-types` e app
  non cambiano.
- **La scala per lettera non si fa**: era l'altra metà della richiesta del
  2026-09-25, che ADR-0056 rimanda qui. L'utente la lascia fuori
  (2026-10-02), perché lettere più piccole si leggono peggio (ADR-0067).

**Alternative scartate**: `out` e `back` scritti a mano per ogni ingresso e
uscita (sopra); i punti in cima dedotti dalla geometria senza dichiararli
(togliere una lettera dopo il giudizio dell'utente vorrebbe codice, non una
riga dell'alfabeto); unire anche la I e la T, che danno quasi tutto il
guadagno senza regole («TUTTI» −16,6%, «VIVA» −6,3%) ma cambiano la
parola; unioni a metà altezza o in diagonale (fuori scope).

**Conseguenze**: con le regole si accorciano solo le coppie in cui una
lettera è U, V, W o Y (tonde), P, U, V o Y (squadrate), e l'altra arriva in
cima con un angolo: 68 coppie tonde e 87 squadrate su 676. Delle sette
parole misurate cambia solo «UVA» (−7,4% tonda, −8,6% squadrata); «NUVOLA»
−5,2%, «LUNA» −2,6%. Le altre parole restano identiche. Sulle strade le
lettere non vengono sempre più alte: su nove campioni a 15 km lo sono in
cinque, e sempre per «UVA» squadrata (`docs/tasks/TASK-067.md`). La ricerca
non dura di più. `nearby_starts.py`, la CLI e `seed_catalog.py`
compongono la parola con il predefinito dello stile, quindi le seguono
senza altre modifiche. L'app pubblicata le vede quando l'API sul server è
aggiornata (`DEPLOY.md` F.12, con l'ok dell'utente). Le parole già nel
catalogo restano com'erano finché non si ridisegnano: fra quelle di oggi
cambierebbe solo «NYC» tonda. Per tornare indietro basta `TOP_JOINS` a
`False`.

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

**Aggiornamento 2026-10-02** (deciso dall'agente su delega dell'utente,
TASK-161): anche le parole si guardano a occhio, una per città e stile, e
quelle che non si leggono restano fuori come le forme: `UNREADABLE_WORDS`,
terne (città, parola, stile), accanto a `UNREADABLE`. Una parola tolta da
`PHRASES` (ADR-0130) resta nel registro ma non entra più nel catalogo. Le
forme illeggibili delle città nuove vanno in `UNREADABLE` come le altre.
Prima di scaricare la zona di una città, se la zona di ogni suo caso è già
in cache (per esempio costruita sul server dall'estratto Geofabrik,
TASK-137) non si scarica niente: Genova, Bari, Palermo e New York sono
entrate così, con Overpass che rifiutava il Mac.

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

## ADR-0101 — Le ricerche insegnano, ma solo con una firma
**Stato**: Attiva · 2026-10-01 · raccolta sempre accesa: scelta dell'utente;
il come deciso dall'agente su delega dell'utente (TASK-130)

**Contesto**: l'utente vuole che la ricerca migliori con le ricerche vere:
query frequenti, risultati mancanti, errori, città, lingue, segnali di
utilità. Senza modifiche automatiche rischiose, con versioni e rollback,
metriche, storia conservata, attenzione a privacy e costi.

**Decisione**:
- **Eventi, non log grezzi** (`shaperoute_api/insights/events.py`): una
  riga per ricerca e per segnale (GPX esportato, corsa con punteggio), in
  `data/insights/events-AAAA-MM.jsonl`, mai riscritti, leggibili solo dal
  proprietario. Testo in minuscolo, email e numeri lunghi oscurati, 200
  caratteri; posizioni solo come celle di 0,01° (~1 km); nessun
  identificativo. **Accesi di default** (scelta dell'utente); si spengono
  con `--no-insights` o `SHAPEROUTE_INSIGHTS=0`. `/places` non si registra
  (indirizzi digitati, ADR-0096).
- **Proposte da prove ripetute** (`analyze.py`): un sinonimo solo se l'AI
  ha letto la stessa frase allo stesso modo almeno 3 volte e mai
  diversamente, e se non contraddice le tabelle; una città se «Explore» vi
  è stato vuoto 3 volte; una frase se disegnata 3 volte. Le richieste mai
  capite e i temi senza luoghi sono proposte «review», per una persona.
- **Dati, mai codice** (`vocabulary.py`): ciò che si applica va in
  `shaperoute_api/learned/vocabulary.json`, nel repository, una versione
  per cambio con data, motivo e prove; `revert` aggiunge una versione, non
  cancella. Si applica solo a mano (`apply`), si rivede e si committa.
- **Dove agisce**: tabelle, poi vocabolario, poi AI, per i temi
  (`themes.read_with_ai`) e per le parole della forma (`/shape-readings`):
  ogni frase imparata è una chiamata al modello in meno.
- **Metriche per versione** del vocabolario (`report`): quota di letture
  dall'AI, temi sconosciuti, successo dei percorsi a tema e tappe toccate,
  «Explore» vuoto, GPX per percorso. Ogni evento porta la versione.
- **Nessun costo**: l'analisi gira sul Mac, sui file; niente AI né servizi.

**Alternative scartate**: un database (non c'è ancora: TASK-114); modifiche
automatiche al vocabolario o al codice (rischio, scelta dell'utente);
imparare dalla prima risposta dell'AI (una risposta può essere sbagliata:
«zzz qualcosa di strano» è stato letto «romantic»).

**Conseguenza**: provato dal vivo: tre richieste «un giro per innamorati»
lette dall'AI → proposta → `apply` → la quarta, a Roma, letta dal
vocabolario (v1: quota AI da 1,0 a 0,0). Lisbona proposta per il catalogo.

**Aggiornamento** (2026-10-01, stesso task; deciso dall'agente su delega
dell'utente, che ha chiesto di nuovo il sistema completo):
- **Prove da giorni o luoghi diversi** (≥ 2): il modello gira a
  temperatura 0, quindi tre risposte uguali alla stessa frase non provavano
  nulla, e una persona sola poteva insegnare all'API ripetendo una
  richiesta.
- **Correzioni dei refusi** (`correction`): una parola vicina (distanza di
  modifica 1, o 2 da 8 lettere) a una parola delle tabelle, ≥ 2 volte, mai
  letta altrimenti dall'AI; per i temi si corregge la parola prima delle
  tabelle, in ogni richiesta. **`conflict`** quando l'AI e l'ortografia non
  concordano (dal vivo: «curoe» letto come cerchio): mai imparato da solo.
- **Validazione** (`Vocabulary.check`, comando `validate`): risposte fuori
  catalogo, chiavi mai cercate, correzioni di parole già note o verso parole
  che le tabelle non leggono, storia con buchi. `apply` valida prima di
  salvare; l'API scarta all'avvio le voci sbagliate; un test della CI
  valida il file del repository.
- **Impatto per versione** (`impact`): ogni tasso contro la versione
  precedente con un test sulle proporzioni (|z| ≥ 1,96, almeno 20 eventi per
  lato, altrimenti «too few»); un peggioramento di una metrica d'utilità
  indica la versione a cui tornare. Il tempo della sola lettura
  (`read_ms`) misura il costo dell'AI.
- **Una proposta annullata non torna** da sola (`apply --again`).

Scartato: correggere le parole sotto le 5 lettere (troppe parole vere
vicine: «lana»/«luna»); dare ragione all'ortografia senza una persona.
Dal vivo: «rmantico» a Bologna e Torino → correzione → a Milano letto dal
vocabolario, lettura da 1,0 s a 0 ms.

## ADR-0102 — Un annuncio AdMob fra «percorso pronto» e «percorso mostrato»
**Stato**: Attiva · 2026-10-01 · AdMob con una build dell'app: scelta
dell'utente; il come deciso dall'agente su delega dell'utente (TASK-132) ·
2026-10-02: un annuncio a ogni ricerca, scelta dell'utente

**Contesto**: l'utente vuole pubblicità solo dopo «Draw route» (o «Ask for
a route» in «Explore»), prima del percorso; con una rete ufficiale, consenso
e privacy rispettati, e il percorso subito se non c'è annuncio. L'app gira
in Expo Go, che non ha il codice nativo di nessuna rete pubblicitaria
ufficiale: l'utente ha scelto AdMob e una build propria dell'app.

**Decisione**:
- `react-native-google-mobile-ads` (AdMob), interstitial (immagine o
  video, con la X di Google). Nessuna schermata nostra: niente annunci finti.
- `useAdBeforeRoute` sta fra lo stato della richiesta e lo schermo: mentre
  il motore lavora prepara un annuncio; quando il percorso è pronto, se
  l'annuncio è carico lo mostra e tiene sullo schermo l'attesa; alla
  chiusura (o a un errore) mostra il percorso. Senza annuncio carico, il
  percorso subito: non si aspetta il caricamento.
- Un annuncio a ogni ricerca: scelta dell'utente del 2026-10-02, dopo la
  prova nel simulatore (prima era al più uno ogni 3 minuti). Chiuso un
  annuncio, il prossimo si carica subito, così è pronto alla ricerca dopo
  anche quando il percorso arriva in 1–3 s. «Draw route» sullo stesso
  percorso già disegnato non è una ricerca: lo mostra di nuovo, senza
  annuncio.
- Consenso: il modulo di Google (UMP, `gatherConsent`) alla prima richiesta
  di percorso, mentre il motore lavora; mai all'apertura. Senza
  `canRequestAds`, nessun annuncio. Niente richiesta ATT di Apple: su iOS
  annunci senza IDFA.
- In Expo Go, sul web e nei test il modulo nativo manca
  (`TurboModuleRegistry.get`): `NO_ADS`, l'app come prima. Lo stesso
  `eas update` va bene per Expo Go e per la build.
- ID di prova di Google (app e annuncio) finché non c'è l'account AdMob:
  gli ID veri in `app.json` e in `EXPO_PUBLIC_ADMOB_INTERSTITIAL_*`.
- `apps/mobile/eas.json`, profilo `preview` (distribuzione interna, canale
  `preview`). Bundle identifier iOS `com.lppl1316.sgrava`, scelto
  dall'utente.

**Alternative scartate**: AdSense in una WebView (vietato dalle regole
AdMob nelle app); un annuncio fatto da noi (finto); al più un annuncio ogni
3 minuti (la prima scelta, tolta dall'utente il 2026-10-02); aspettare il
caricamento dell'annuncio quando il percorso è pronto (blocca l'utente); il
consenso all'apertura (l'utente non vuole nulla all'apertura).

**Conseguenza**: in Expo Go nessun annuncio. Per vederli serve una build
EAS (iPhone: account Apple Developer); per annunci veri l'account AdMob e
l'app in uno store. Con gli ID veri vanno aggiunti gli identificativi
SKAdNetwork di Google (opzione `skAdNetworkItems` del plugin): l'SDK ne
segnala 50 mancanti. La prima ricerca dopo l'installazione di solito non
ha annuncio: il consenso e il caricamento arrivano dopo il percorso.
Una build fatta con Xcode 27 (SDK iOS 27) non si apre senza il ciclo di
vita a scene (`UIScene`), che il modello nativo di Expo SDK 57 non usa
ancora: per la prova nel simulatore (2026-10-02) la cartella `ios/`
generata, che non è nel repository, è stata adattata a mano con
`ExpoAppSceneDelegate` di Expo. Le build EAS usano il loro Xcode.

**Aggiornamento 2026-10-02 (TASK-166)**: l'annuncio copre l'attesa invece
di stare fra «percorso pronto» e «percorso mostrato», scelta dell'utente.
Quando una ricerca parte, un annuncio già carico si mostra subito e il
motore lavora dietro; alla chiusura lo schermo mostra quello che c'è (il
percorso, o l'attesa). Senza annuncio carico la ricerca va avanti senza, e
se ne carica uno per la prossima: di solito resta senza solo la prima
ricerca dopo l'installazione. Uno per ricerca, mai all'apertura, come
prima. Lo stato della ricerca non si trattiene più: `useAdBeforeRoute` lo
passa com'è e guarda solo l'inizio dell'attesa. L'ID dell'app AdMob vero
dell'utente sostituisce quello di prova in `app.json`; l'unità resta quella
di prova di Google fino a TASK-153.

## ADR-0104 — I file della cache delle zone si scrivono interi o non si scrivono
**Stato**: Attiva · 2026-10-01 · deciso dall'agente su delega dell'utente
(TASK-133, miglioramento generale)

**Contesto**: GraphML, pickle e vie con nome si scrivevano direttamente sul
nome definitivo. Un GraphML di zona pesa 50–120 MB e si scrive in secondi:
un'API o uno script fermati in quel momento lasciavano un file a metà, che
la cache trovava per nome. Un GraphML a metà o un pickle a metà (più
recente del GraphML, quindi letto per primo) facevano fallire ogni percorso
della zona; un file di vie con nome a metà mandava il percorso in
`engine_error`. Si usciva solo cancellando il file a mano. Sul Mac, il
2026-10-01, nessuno dei 355 GraphML in cache era rotto: è prevenzione.

**Decisione**: in `network.py` ogni file della cache si scrive su un nome
temporaneo accanto, `.<nome>.<8 cifre esadecimali>.part`, e prende il suo
nome con `os.replace` solo quando è scritto per intero (`_whole`). Un
errore o un'interruzione (Ctrl+C) tolgono il file temporaneo; un processo
ucciso lo lascia, ma un nome che comincia col punto non è trovato da
nessuna ricerca della cache (`foot_*.graphml`, `names_*.json`). Il pickle,
che fa solo risparmiare tempo: se non si legge si legge il GraphML e lo si
riscrive; se non si riesce a scrivere (`OSError`: disco pieno, cartella in
sola lettura) il caricamento va avanti senza.

**Alternative scartate**: `tempfile.mkstemp` (crea il file coi permessi
0600, diversi da quelli di oggi); un lock fra processi (non serve: due
scritture dello stesso file finiscono in due file temporanei diversi, e
vince l'ultima, intera); riscaricare da solo un GraphML già rotto (il
GraphML è il formato di riferimento: cancellarlo è una scelta di chi guarda
la cache).

**Conseguenza**: nessun cambio nei percorsi né nei tempi; un `.part`
rimasto da un processo ucciso si può cancellare a mano quando si vuole.

## ADR-0105 — «Explore»: città → categoria → percorso
**Stato**: Attiva · 2026-10-01 · le funzioni chieste dall'utente; il come
deciso dall'agente su delega dell'utente (TASK-134)

**Contesto**: l'utente vuole meno passaggi: città già pronte, ricerca con
suggerimenti, categorie da toccare, esempi che seguono la città.

**Decisione**:
- **Le città in evidenza sono solo nomi**: il centro lo dà `/cities` al
  tocco (una chiamata, in cache un giorno). Nessuna coordinata scritta
  nell'app (il principio di `CLAUDE.md`).
- **Suggerimenti** da `GET /city-suggestions` (autocompletamento per
  città), non da `/places`: lì le città hanno il centro dell'area.
- **Una categoria è un tema**: l'app manda le parole «Food in New York»,
  che le tabelle dell'API leggono; nessun campo nuovo nel contratto.
  Otto temi nuovi in `themes.py`, con categorie di Geoapify provate a New
  York. Parole brevi («bar», «pub», «run») si confrontano intere.
- **Recenti, non preferiti**: le ultime 5 città scelte, in un file sul
  telefono come la corsa (`trackStore`). I preferiti sarebbero un'altra
  lista da gestire per lo stesso scopo.
- **Le categorie sono gli esempi**: ognuna mostra «in <città>», così gli
  esempi cambiano con la città senza una seconda lista.

**Alternative scartate**: coordinate delle città nell'app; un campo
`theme` nella richiesta (contratto più grande per lo stesso effetto);
animazioni di layout (su Android chiedono API sperimentali).

**Conseguenza**: due tocchi per un percorso. Le categorie dove OSM ha pochi
luoghi (Family, Running in centro) lo dicono con `no_places`.

## ADR-0106 — Strava: il flusso ufficiale, senza account collegato
**Stato**: Superata da ADR-0138 · 2026-10-01 · scelta dell'utente («flusso ufficiale»);
il come deciso dall'agente su delega dell'utente (TASK-135)

**Contesto**: l'utente vuole «Avvia con Strava»: trasferire il percorso e
seguirlo in Strava, solo con ciò che Strava supporta ufficialmente.
Verificato sulla documentazione (2026-10-01): le API dei percorsi sono in
sola lettura (`GET /routes/{id}`, export GPX/TCX, elenco dell'atleta);
`POST /uploads` crea **attività**, non percorsi; nessun deep link
documentato per aprire un percorso o avviare una registrazione; il GPX si
importa come percorso dal route builder del sito; nell'app un percorso
salvato si segue da Record → Add Route.

**Decisione**: «Run with Strava» spiega e guida in tre passi: salvare il
GPX (l'export esistente), aprire il route builder ufficiale, aprire Strava.
Niente OAuth, niente token, niente dati inviati da noi. Funziona uguale su
iOS e Android (`Linking.openURL` su indirizzi https).

**Alternative scartate**: caricare il percorso come attività con
`POST /uploads` (sul profilo comparirebbe una corsa mai fatta); OAuth per
ritrovare il percorso importato (registrazione dell'app su Strava e token
da custodire per poco); URI `strava://` non documentati.

**Conseguenza**: l'import su Strava resta un passo a mano dell'utente,
dal sito. Se Strava aprirà la creazione di percorsi via API, il pulsante
potrà farlo da solo.

## ADR-0107 — Il cuore evita i «baffi»: le strade fatte due volte costano
**Stato**: Attiva · 2026-10-01 · giudizio e scelte dell'utente; misura e
peso decisi dall'agente su delega dell'utente (TASK-131). ADR-0106 era
stato preso intanto da un'altra sessione (Strava): numero cambiato.

**Contesto**: «ad occhio saprei farlo un po' meglio il cuore». Su 7 cuori
veri (Caldonazzo, Levico, Trento, Milano) l'utente ha dato 6 `quasi` e un
`sì` (Milano). Tre forme ideali più larghe o con lobi più tondi (che aveva
chiesto) hanno perso contro quella di oggi su 5 righe su 7: la forma non è
il problema. Alla domanda «cosa rende Milano migliore» ha risposto: linee
più pulite, senza pezzi avanti e indietro. Misurati: Milano 0% del
percorso fatto due volte, gli altri cuori scelti 1–23%.

**Decisione**:
- `route_engine/retracing.py` (nuovo): `doubled_share`, la quota della
  lunghezza su pezzi di strada percorsi più di una volta (dai punti degli
  archi del grafo, in un verso o nell'altro).
- Nel costo della ricerca, solo per il cuore: `+ 1,5 · doubled_share`
  (`W_DOUBLED`, `doubled_weight(nome)`); nella scelta fra le partenze
  vicine lo stesso termine diviso per `W_SHAPE`. Pesi 1,5 e 3 danno gli
  stessi cuori sulle 7 prove; si tiene il più piccolo.
- La forma ideale del cuore non cambia.

**Giudizio dell'utente** sui cuori cambiati: Levico 8 km e Trento 15 km
meglio i nuovi; Caldonazzo 10 km nessuna preferenza; gli altri 4 uguali.

**Alternative scartate**: cuore più largo (A) o a lobi tondi (B, C):
preferito quello di oggi; penalizzare i baffi per tutte le forme (gatto,
pesce e lettere li hanno apposta; sarebbe da rigiudicare tutto il
catalogo); un filtro dopo la ricerca invece del costo (scarta, non cerca
un percorso pulito).

**Conseguenza**: alcuni cuori cambiano e la loro somiglianza può scendere
di qualche punto; nessun tempo in più. Le altre forme e le parole danno gli
stessi percorsi (registro rifatto: stella, cavallo, farfalla, CIAO,
cerchio identici). Se l'occhio lo chiede, il peso si può dare ad altre
forme senza tratti (cerchio, stella), con un loro giudizio.

## ADR-0108 — La CLI non salva più i ritagli dei grafi
**Stato**: Attiva · 2026-10-01 · deciso dall'agente su delega dell'utente
(TASK-136); supera ADR-0023 solo sul salvataggio dei ritagli

**Contesto**: da ADR-0023 `OsmnxSource.load` salva col suo nome ogni
ritaglio di una zona in cache, GraphML e pickle. L'API non lo fa
(ADR-0030), ma la CLI e `seed_catalog` sì, una volta per partenza. Sul Mac,
il 2026-10-01, `data/cache/` pesava 18,6 GB: 346 grafi su 355 (17,9 GB)
stavano per intero dentro un grafo più grande della cache, con 19 GB
liberi sul disco. E `covering_path` sceglie il grafo più piccolo che
contiene l'area: con i ritagli salvati, lo stesso percorso può venire da un
ritaglio di un ritaglio, a seconda delle richieste fatte prima su quel
disco, e l'API tiene in memoria quei ritagli invece della zona.

**Decisione**:
- Un'area dentro una zona in cache si **ritaglia in memoria e non si
  salva**, come nell'API. Il file esatto, se c'è, si legge ancora; una zona
  nuova scaricata si salva come prima (ADR-0104).
- `python -m route_engine.prune_crops` elenca i grafi contenuti in un altro
  grafo della cache, raggruppati per zona; con `--delete` li cancella
  (GraphML e pickle). Senza, non cancella nulla. Un grafo si cancella solo
  se lo contiene un grafo che resta; zone, `names_*.json`, `walk_*` e
  `http/` non si toccano.

**Misure** (Mac, cache di prova con la sola zona, stesso percorso punto per
punto prima e dopo):

| Caso | Prima | Dopo |
|---|---|---|
| Trento, cuore 5 km, partenza nuova | 2,4 s, scrive 19,7 MB | 1,4 s, niente |
| Milano, cuore 10 km, partenza nuova | 11,8 s, scrive 108 MB | 5,5 s, niente |
| Trento, stessa richiesta rifatta | 0,9 s | 1,3 s |
| Milano, stessa richiesta rifatta | 2,9 s | 5,5 s |

Scrivere il GraphML del ritaglio era metà del tempo di una partenza nuova.

**Alternative scartate**:
- *Tenere i ritagli, con un limite di spazio o di numero*: la cache
  cancellerebbe da sola file dell'utente, e il percorso dipenderebbe ancora
  da quali ritagli ci sono.
- *Salvare solo i ritagli dei casi di riferimento*: serve un elenco da
  tenere allineato a `TESTING.md`, per guadagnare 0,4–2,6 s a richiesta.
- *Tenere la zona in memoria fra una partenza e l'altra nella CLI e in
  `seed_catalog`*, come `ZoneGraphs`: più veloce ancora, ma è un altro
  cambiamento; annotato in `tasks/TASK-136.md`.

**Conseguenza**: la cache cresce solo con le zone nuove. Rifare la stessa
richiesta costa 0,4 s in più a Trento e 2,6 s a Milano, perché si rilegge
la zona. I ritagli già salvati restano e si leggono come prima finché non
li si cancella con `prune_crops --delete`: è una scelta dell'utente, perché
i casi di riferimento letti dal loro ritaglio passerebbero a un ritaglio
fatto dalla zona.

## ADR-0109 — Anche cerchio e stella evitano i «baffi»
**Stato**: Attiva · 2026-10-01 · chiesto dall'utente («fai lo stesso per
cerchio e stella») e giudicato da lui; il peso deciso dall'agente su
delega dell'utente (TASK-139). Segue ADR-0107.

**Decisione**: `W_DOUBLED` vale 1,5 anche per `circle` e `star`, come per
il cuore. Le forme con tratti ripassati apposta (gatto, pesce, lettere,
immagini) restano senza.

**Misure** (7 partenze: Caldonazzo 10 km, Levico 12, 5, 8 km, Trento 10,
15 km, Milano 10 km): il cerchio non cambia in nessuna. La stella cambia in
3: Levico 5 km, Levico 8 km, Trento 15 km.

**Giudizio dell'utente**: Levico 8 km e Trento 15 km meglio la stella
nuova; Levico 5 km nessuna preferenza. Peso doppio (3,0) scartato: a
Levico 5 km la stella somiglia meno (0,81 → 0,73).

**Conseguenza**: alcune stelle cambiano, con la somiglianza a volte un
po' più bassa (Levico 8 km 0,93 → 0,86); i tempi no. Cavallo, farfalla,
CIAO e il cerchio del registro danno gli stessi percorsi di prima.

## ADR-0110 — «Explore»: città e luoghi mentre si scrive
**Stato**: Attiva · 2026-10-01 · la funzione chiesta dall'utente («scrivo
ver, devono uscirmi Verona centro, Arena di Verona»); il come deciso
dall'agente su delega dell'utente (TASK-138). Allarga ADR-0105, che
suggeriva solo città.

**Contesto**: provata «Explore» sull'iPhone, il campo della città non
suggeriva nulla: l'app pubblicata era di prima di TASK-134 e l'API del Mac
era partita prima del suo merge (`/city-suggestions` → 404). Ma anche con
TASK-134 i suggerimenti erano solo città (`type=city`).

**Decisione**:
- **Una sola chiamata**, l'autocompletamento di Geoapify senza `type`.
  Provato su 10 città (Milano, Roma, Parigi, New York, Londra, Torino,
  Trento, Levico, Tokyo, Barcellona): i risultati `city` hanno lo stesso
  punto di `type=city` (Parigi 2 km più a est, all'Hôtel de Ville). Il
  centro dell'area del comune che ADR-0105 temeva (Milano: Baggio) viene
  dai risultati `county`, che si scartano con regioni, stati e CAP.
- **L'ordine del servizio**, non prima le città: «casa di giu» mette
  davanti la Casa di Giulietta, non una frazione col nome simile.
- **`kind` nella risposta** (`city` | `place`): una città si nomina nelle
  parole («Food in Verona», come prima); un luogo no, la richiesta è solo
  «Food» col suo punto, come dalla partenza. Le parole «Food in Verona
  Arena» farebbero cercare una città con quel nome (`themed.py`).
- **Etichetta col nome del risultato**: «Parè, Colverde, Italy», non
  «Colverde» per chi scrive «par». Niente luoghi senza nome (edifici con
  il solo indirizzo); due luoghi a meno di 150 m sono un solo punto.
- **Invio sceglie il primo suggerimento**: è quello che si vede.

**Alternative scartate**: i luoghi famosi della prima città già da «ver»,
come Google: la ricerca dei luoghi di Geoapify li dà per distanza (a Roma
statue prima del Colosseo, provato) e l'autocompletamento non ha un
ordine per fama; servirebbe un'altra fonte. Photon trova meglio i
monumenti a metà parola («colos» → Colosseo) ma risponde in 3 s contro
1 s (ADR-0095). Un endpoint nuovo accanto a `/city-suggestions`:
lascerebbe codice morto.

**Conseguenza**: «arena di ver» → Verona Arena, «duomo di mil» → Duomo,
«colosseo» → Piazza del Colosseo; «ver» dà ancora solo città. Una
categoria da un luogo parte dal suo punto (provato: Duomo di Milano →
Food, cerchio di 9,8 km, 4 ristoranti). Etichette in inglese, come le
città di TASK-134.

## ADR-0111 — Il server a pagamento: quale, e la configurazione in `deploy/`
**Stato**: Attiva · 2026-10-01 · TASK-144 · la configurazione decisa
dall'agente su delega dell'utente; il server scelto dall'utente

Chiesto dall'utente: le istruzioni per mettere l'app su un server, da
usare con il computer spento e un giorno da pubblicare, e i server a
pagamento migliori per qualità e prezzo.

**Contesto**: la strada C di ADR-0076 aveva i prezzi del 2026-09-26, e
Hetzner li ha alzati il 1° aprile e il 15 giugno 2026 (CX33 da 6,49 a
8,49 €, CPX e CCX più che raddoppiati). Il solo `docker run` del
pacchetto lascia fuori `catalog/` («Explore» vuoto), perde gli eventi di
TASK-130 a ogni container nuovo e non ha HTTPS né l'AI.

**Decisione**:
- **Il server** (`DEPLOY.md`, F.1, prezzi del 2026-10-01): **Hetzner
  CX33** (4 vCPU, 8 GB, 80 GB, 10,97 €/mese IVA compresa, a ore), scelto
  dall'utente il 2026-10-01 al posto dell'Oracle di ADR-0114, che
  rispondeva «Out of capacity», e già acceso: messo su a mano, con
  `docker run` e Caddy da apt su un nome `sslip.io`. L'alternativa
  annotata è OVHcloud VPS-3 (6 vCore, 12 GB, 100 GB, 12,69 €/mese con 12
  mesi, backup incluso).
- **`deploy/compose.yaml`**: l'API dal `Dockerfile`, senza cambiarlo.
  Zone, eventi e registro in `data/` del checkout con bind mount (cartelle
  normali: `rsync` dal Mac le riempie, e sopravvivono alle immagini
  nuove); `catalog/` in sola lettura; un servizio `data-owner` (busybox)
  che a ogni avvio crea le cartelle e le dà all'utente 10001 dell'API.
  Porta 8000 solo su `127.0.0.1`: Docker aprirebbe `0.0.0.0` scavalcando
  `ufw`. Log di Docker limitati a 3 × 10 MB per servizio.
- **Profili** in `COMPOSE_PROFILES` di `deploy/.env`: `ai` (immagine
  `ollama/ollama`, `--ai-url http://ollama:11434`; senza il profilo il nome
  non si risolve e le parole fuori tabella danno `ai_unavailable`, come con
  Ollama spento) e `public` (Caddy).
- **Privato prima di pubblico**, nella guida: `tailscale serve` sul
  server dà HTTPS con certificato vero solo alla tailnet, senza dominio né
  porte aperte. Per il pubblico **Caddy**, che chiede e rinnova da solo il
  certificato di `SHAPEROUTE_DOMAIN`: un dominio vostro, o per cominciare
  un nome `sslip.io`, come il server di oggi. Non Tailscale Funnel: il
  suo nome pubblico non è stato creato (tailscale/tailscale#21502).
- **Il limite per telefono anche dietro il proxy**:
  `FORWARDED_ALLOW_IPS="*"`, letto da uvicorn, fa vedere all'API
  l'indirizzo di `X-Forwarded-For`. Si può fidare di tutti perché alla
  porta arrivano solo Caddy e `tailscale serve`.
- **Segreti in `deploy/.env`**, copia di `.env.example` (`.gitignore` lo
  esclude già); variabili nuove `SHAPEROUTE_DOMAIN` e `COMPOSE_PROFILES`.
- **CI**: il job `docker` avvia `deploy/compose.yaml` e controlla
  `/health`, la chiave (401/200), il proprietario di `data/cache`, i
  percorsi di «Explore» a Trento e il `Caddyfile` (`caddy validate`).

**Alternative scartate**: DigitalOcean, Vultr, Linode, Lightsail (4–5
volte il prezzo per la stessa RAM); Render, Railway, Fly.io (RAM e disco
permanente a parte); netcup (14,50 € per 8 GB); vCPU dedicati Hetzner
dopo i rincari; Contabo come prima scelta (processore e disco più lenti,
impegno di 24 mesi); nginx con certbot (più passi e un rinnovo da
controllare); Cloudflare Tunnel con dominio (il dominio deve stare su
Cloudflare e il traffico passa da loro); volumi Docker con nome per le
zone (da riempire servirebbe root); cambiare il `Dockerfile` per
`catalog/` (il montaggio basta, e un catalogo nuovo non chiede
un'immagine nuova).

**Conseguenza**: dal server comprato all'app sull'iPhone a Mac spento sono
i passi F.2–F.7 di `DEPLOY.md`. Il server di oggi non usa ancora questa
configurazione: spostarlo (F.12, stessi dati e stesso indirizzo) si fa a
parte, a fine coda dei merge. Misurato lì, a mano: cuore da 5 km a Trento
in 18,7 s con la zona in cache, l'API in 0,56 GB; l'AI su CPU è da
provare. TASK-122 aggiunge il database a `deploy/compose.yaml`.
## ADR-0112 — Le ricerche imparano anche da cosa fa l'app
**Stato**: Attiva · 2026-10-01 · deciso dall'agente su delega dell'utente
(TASK-142), che ha chiesto di nuovo il sistema di auto-miglioramento

**Contesto**: ADR-0101 impara da cosa l'API vede. Ma l'API non vede le
scelte: da TASK-134/138 una città scelta fra i suggerimenti non passa da
`/cities` (dal vivo: Vercelli, «Explore» vuoto 3 volte, nessuna proposta);
non sa quale percorso si usa fra A, B e C, né se si prende «Try N km».
Una ricerca sbagliata e corretta subito («levic» → Levič, Slovenia → 16 s
dopo Levico) non insegnava nulla. Un cambio del motore o del catalogo non
si misurava: `impact` confronta solo versioni del vocabolario.

**Decisione**:
- **`POST /signals`** (`signals.py`): tre corpi in lista bianca,
  `city_chosen`, `route_chosen`, `hint_taken`; un campo in più è un 422.
  Sempre `204`, mai un errore sul telefono. Oltre 60 al minuto, tutti i
  client insieme, non si registrano. Il nome di una città è pubblico e si
  tiene con le maiuscole; il punto diventa la cella di ~1 km; mai le lettere
  digitate, mai la partenza. Nell'app un invio che non fallisce mai, da
  `ExploreTools.tsx` (la città e come) e `RoutePanel.tsx` (il primo uso di
  un percorso, «Try N km», una forma del catalogo), senza toccare `App.tsx`.
- **Percorsi annullati** come eventi (`cancelled`, con lo stato a cui
  erano), registrati da `DELETE`; il risultato buttato non conta.
- **`city_name`**, una proposta applicabile: parole cercate come città e
  lasciate entro 3 minuti per una città il cui nome comincia con quelle
  parole o ne dista poche lettere, ≥ 2 volte, in ≥ 2 giorni, in metà delle
  ricerche. Nel vocabolario (`city_names`), `/cities` cerca il nome
  imparato. Senza un identificativo, ricerca e scelta si legano solo per
  tempo: da qui le tre condizioni.
- **Metriche di comportamento** (`cancel_rate`, `first_choice_rate`): si
  leggono, ma non chiedono di tornare indietro col vocabolario, che non le
  cambia. `city_left_rate` sì: è quella che un nome imparato abbassa.
- **`compare --split GIORNO`** per ogni cambio, con lo stesso test di
  `impact`; `trend` per settimana; `why` per sapere cosa manca a una
  proposta.

**Alternative scartate**: un identificativo di sessione nei segnali
(legherebbe ricerca e scelta con certezza, ma è un dato di una persona:
scelta dell'utente, con gli account di TASK-110); registrare le lettere di
`/city-suggestions` (ADR-0101); imparare dalle scelte fra A, B e C (la
classifica è codice del motore: `review_ranking`, per una persona);
il tipo dei segnali in `shared-types/src/index.ts` (è di TASK-088, aperto:
per ora `src/signals.ts`).

**Conseguenza**: provato dal vivo su un'API di prova con Geoapify: il primo
giorno ricostruito dall'evento vero di «levic», il secondo dal vivo →
proposta `city_name` → `apply` → `GET /cities?q=levic` risponde Levico
Terme (`"by":"learned"`). Vercelli scelta fra i suggerimenti → proposta per
il catalogo. Trovato e corretto un errore di TASK-130: `Insights.record`
riceveva `ms` due volte, e nessun percorso dell'API era mai stato
registrato (c'erano solo quelli importati dallo storico).

## ADR-0114 — La parte social: le scelte dell'utente
**Stato**: Attiva · 2026-10-01 · **scelte dell'utente**, una domanda per
volta (TASK-110). Chiude, con ADR-0115, ADR-0013.

**Contesto**: la parte social (`ROADMAP.md`, TASK-110 … 122) aspettava le
scelte su dove stanno i dati, come si entra, chi vede cosa e chi modera.
Le proposte, con le alternative scartate, sono nel task file.

**Decisione dell'utente**:
1. **Punteggio**: la corsa contro il percorso pianificato (ADR-0090).
2. **Hosting**: **Oracle Cloud Always Free**, VM ARM Ampere A1 (oggi 2
   OCPU e 12 GB gratis), per API e database. Scartati Hetzner (circa
   6–11 €/mese), un VPS con database e accessi gestiti (Supabase), un
   Raspberry Pi a casa.
3. **Accesso**: email e password. Apple e Google forse dopo, con una build
   propria.
4. **Corse salvate**: private finché l'iscritto non le pubblica;
   pubblicate, le vedono gli iscritti (il feed non si legge senza account),
   senza i primi e gli ultimi 200 m della traccia.
5. **Percorsi consigliati** (ADR-0086): mostrati da un punto del giro a
   più di 500 m dalla partenza vera, mai con il nome di chi li ha chiesti.
6. **Età minima**: 16 anni, con la casella «I am at least 16».
7. **Cancellare l'account** cancella tutto, anche i percorsi generati da
   quell'iscritto nel catalogo dei consigliati. Un percorso generato senza
   account non è di nessuno e resta.
8. **Moderazione**: due admin, l'utente e il collega, avvisati per email a
   ogni segnalazione; un contenuto si toglie entro 24 ore, a mano. Nessun
   contenuto si nasconde da solo.
9. **Pacchetti e servizi nuovi approvati**: psycopg e argon2-cffi
   nell'API, expo-secure-store nell'app, PostgreSQL con PostGIS in Docker
   sulla VM, Object Storage di Oracle per le copie, Brevo per le email.

**Conseguenze sui task già scritti**: nel task file di TASK-110,
«Esito».

## ADR-0115 — Database, account e server: come
**Stato**: Attiva · 2026-10-01 · deciso dall'agente su delega
dell'utente, dentro le scelte di ADR-0114 (TASK-110)

**Decisione**:
- **PostgreSQL 16 con PostGIS**, in Docker sulla stessa VM dell'API
  (immagine `postgis/postgis`). Tracce e percorsi come geometrie PostGIS in
  WGS84: le domande «vicino a me» (TASK-092, TASK-118) si fanno nel
  database con un indice spaziale. Schema in `DATABASE.md`.
- **Migrazioni**: file SQL numerati in `services/api/migrations/`,
  applicati all'avvio dell'API in una transazione, con la tabella
  `schema_migrations`. Niente Alembic: una dipendenza in meno, e lo schema
  si legge in SQL.
- **psycopg 3** senza ORM: le query sono poche e PostGIS si scrive meglio
  in SQL.
- **Password** con Argon2id (`argon2-cffi`), mai nei log. **Sessione**: un
  token casuale di 32 byte dato all'app; nel database solo il suo hash
  (SHA-256), con scadenza a 90 giorni dall'ultimo uso. Niente JWT: un token
  si revoca cancellando la riga. Nell'app il token sta in
  `expo-secure-store`.
- **Foto del profilo**: un JPEG quadrato piccolo (256 px) nel database,
  così le copie di sicurezza le prendono con il resto.
- **Copie di sicurezza**: `pg_dump` ogni notte sulla VM, caricato
  nell'Object Storage gratuito di Oracle (20 GB), 14 copie; un ripristino
  provato in TASK-122. Le copie stanno fuori dalla VM perché Oracle può
  reclamarla (ADR-0114).
- **Admin**: una colonna `role` negli utenti; i due admin si nominano con
  una riga SQL sulla VM, senza schermate.
- **Email** con Brevo, dall'API soltanto: la chiave in `.env`, mai
  nell'app.

**Da decidere in TASK-122, con l'utente**: HTTPS (serve un nome di
dominio, qualche euro all'anno, o un altro modo) e se passare l'account
Oracle a «Pay As You Go», che resta gratis dentro i limiti e, secondo le
regole di Oracle, non reclama le VM poco usate: la VM dell'API usa poca
CPU e rischia proprio quello.

**Scartate**: *Supabase* per database e accessi (scelta dell'utente:
tutto sulla VM); *SQLite* (niente PostGIS, un solo processo che scrive);
*le foto nell'Object Storage* (un servizio in più da chiamare per ogni
profilo, per pochi KB).

## ADR-0116 — «Explore»: due categorie, ed esempi disegnati subito per una città
**Stato**: Attiva · 2026-10-01 · chiesto dall'utente dopo la prova di
TASK-138 («solo due e poi altro con tre puntini»; «devono partire subito i
cuori, le forme più semplici, e gli dai l'esempio»); forme, distanza e il
come decisi dall'agente su delega dell'utente (TASK-143). Allarga ADR-0105.

**Contesto**: 13 categorie occupavano lo schermo. Una città fuori dal
catalogo (Vercelli) mostrava solo «No recommended routes near this start
yet»: il catalogo ha percorsi per 6 città.

**Decisione**:
- **Due categorie e «More…»**: le prime due dell'ordine di ADR-0105 (Food,
  Famous Places); «More…» apre le altre nella stessa griglia, a tre per
  riga. Il componente sta in un file nuovo, `AskForRoute.tsx`: quello
  vecchio in `ExploreTools.tsx` resta finché TASK-142, che ha quel file,
  non è in `main`.
- **Esempi solo dove il catalogo non ha niente**: cuore, cerchio e stella
  da 5 km dal centro della città, le forme più semplici del catalogo e la
  distanza più breve che si chiede di solito. Con `/route-jobs`, come
  «Draw route»: nessun contratto nuovo.
- **Uno alla volta, il cuore per primo**: ogni forma chiede un riquadro un
  po' diverso, e due richieste insieme potevano scaricare due zone da
  Overpass, che dopo pochi download rifiuta il Mac per ore. La prima
  scarica, le altre la trovano in cache.
- **Fuori dalla schermata**: gli esempi stanno in un modulo, non nello
  stato di `ExploreScreen`; aprire un esempio sulla mappa non ferma quelli
  in calcolo. Un'altra città sì: l'API ha 2 worker, la città nuova ha la
  precedenza.
- **Si aprono come un percorso consigliato** (`onOpen`, `useExplored`):
  `explored.ts` trova il percorso intero già sul telefono e non lo chiede
  al catalogo. `App.tsx` non cambia (lo tocca la PR #130).
- **Restano sul telefono**: in memoria e in `city-examples.json` (ultime 8
  città), come le città recenti. La seconda volta sono immediati, anche
  dopo aver chiuso l'app.
- **Mappa non scaricabile o API spenta**: un solo messaggio
  (`problemText`) e «Try again»; le altre forme non si chiedono, finirebbero
  uguali.

**Alternative scartate**: salvare gli esempi nel catalogo dell'API per
tutti (il catalogo è guardato a occhio, ADR-0097; i percorsi salvati per
tutti aspettano il database, ADR-0086); un endpoint che disegni le tre
forme in una volta (contratto nuovo per lo stesso effetto); chiedere gli
esempi già mentre si scrive la città (scaricherebbe zone di città non
scelte).

**Conseguenza**: provato sull'API del Mac il 2026-10-01: Pergine Valsugana
(zona in cache, niente catalogo) cuore 4,4 km 0,87, cerchio 4,6 km 0,77,
stella 4,8 km 0,94, 2 s l'uno; New York uguale. Vercelli:
`map_data_unavailable` dopo 63 s, finché Overpass rifiuta il Mac: lì
servono le zone scaricate prima (TASK-137).

## ADR-0117 — «Start» sui percorsi di «Explore»: le indicazioni dai punti
**Stato**: Attiva · 2026-10-01 · chiesto dall'utente («dalla sezione di
explore implementa la stessa funzione di start del percorso con le
indicazioni»); il come deciso dall'agente su delega dell'utente
(TASK-145). Toccare `App.tsx` (anche di TASK-132) e `app.py` (anche di
TASK-142) approvato dall'utente.

**Contesto**: un percorso aperto da «Explore» aveva solo «Export GPX»: il
catalogo tiene i punti e basta (ADR-0097), il percorso a tema e gli
esempi di una città arrivano all'app allo stesso modo. Le indicazioni di
svolta (ADR-0045) vogliono i nodi del grafo, che l'app non ha.

**Decisione**:
- **Le indicazioni si ricavano dai punti, sull'API**: i punti del motore
  sono i nodi e la geometria degli archi fra loro, quindi ogni nodo è uno
  dei punti (entro 1 m, anche coi 6 decimali dei file). Un modulo nuovo
  del motore, `route_nodes.py`, ritrova i nodi; l'API ci mette
  `guidance` e gli `along` come per un percorso pianificato. Un solo
  endpoint, `POST /route-directions` (`{points}` → `{directions}`), per
  tutti i percorsi di «Explore», qualunque sia la loro origine.
- **Una richiesta sola, non un job**: con la zona in cache bastano 0,1–
  0,5 s; i percorsi di «Explore» stanno in zone già usate (il catalogo è
  stato pianificato lì, a tema ed esempi sono appena stati disegnati). Una
  zona da scaricare può metterci di più: la scheda lo dice se fallisce, e
  «Start» riprova.
- **Errori senza codici nuovi**: una linea fuori dalla mappa è
  `invalid_request` (`RouteNotOnGraphError` è un `InvalidRequestError`),
  una zona che non si scarica `map_data_unavailable`.
- **Nell'app**: «Start» giallo nelle due schede di «Explore», sopra
  «Export GPX» come per un percorso disegnato. Le indicazioni si chiedono
  al tocco, non all'apertura: chi guarda e basta non chiede niente.
  Restano in memoria per quella linea (stessa lista di punti), così un
  secondo «Start» dopo «Stop» parte subito. La navigazione, la traccia e
  il punteggio sono quelli di sempre (ADR-0052, ADR-0091, ADR-0093), sulla
  linea di «Explore»; uscire da «Explore» lascia perdere l'attesa e la
  corsa.
- **Tipi nel modulo dell'app** (`routeDirections.ts`), come
  `themedRoutes.ts`: `packages/shared-types/src/index.ts` è di TASK-088
  (PR #112). Il contratto sta nelle fixture.

**Alternative scartate**: salvare le indicazioni nel catalogo
(`seed_catalog.py` è di TASK-128, e un percorso a tema o un esempio non
passano dal catalogo); mandarle già con `GET /recommended-routes/{id}` e
nel risultato a tema (due endpoint da cambiare, e indicazioni calcolate
anche per chi non parte); calcolarle sul telefono dalla sola geometria
(senza grafo niente nomi delle vie né incroci veri); ricalcolare il
percorso dalla partenza (sarebbe un altro percorso).

**Conseguenza**: provato sull'API del Mac il 2026-10-01: percorsi del
catalogo a Trento (5 e 23 km), Bologna, Milano e Levico, tutta la linea
ritrovata in 0,1–0,5 s; 4 percorsi appena pianificati (Trento e Bologna,
con le alternative) danno indicazioni identiche a quelle del motore. Da
provare sull'iPhone.

## ADR-0084 — Zucca e albero di Natale nel catalogo; «albero» da solo resta fuori
**Stato**: Attiva · 2026-09-30 · le forme scelte dall'utente; parole,
tessere e domanda all'AI decise dall'agente su delega dell'utente (TASK-088)

**Contesto**: TASK-078 (ADR-0073) ha disegnato zucca di Halloween e albero
di Natale, giudicati a 15 km: zucca `sì` a Milano, `no` a Trento, `quasi`
a Levico; albero `sì` a Milano, `quasi` a Trento, `no` a Levico. ADR-0061
li aveva lasciati contorni da CLI. Nel motore c'è anche `tree.json`
(TASK-034/037), un albero qualsiasi, mai entrato nel catalogo.

**Decisione**:
- **Entrano `pumpkin` e `christmas_tree`**, scelti dall'utente
  (2026-09-30) sapendo il giudizio: fuori da una rete fitta possono non
  riuscire, e l'app propone già un'altra distanza o le altre forme
  (ADR-0041). Come le forme di ADR-0061: `SHAPES` del motore,
  `shared-types`, `contract.json`, `shapeWords.ts`, `OUTLINES`. Sullo
  schermo «pumpkin» e «christmas tree».
- **Parole**: «zucca», «zucche», «zucca di halloween», «pumpkin»,
  «halloween pumpkin», «jack-o'-lantern»; «albero di natale», «alberi di
  natale», «alberello di natale», «christmas tree», «xmas tree».
- **«albero» e «tree» da soli non cambiano significato**: non sono nella
  tabella e per l'AI restano «nessuna forma» (due voci nella lista di
  messa a punto lo controllano). La riga dell'AI dice «a decorated
  Christmas tree with a star on top, not a plain tree»: senza le ultime
  parole qwen3:4b sceglieva l'albero di Natale per «tree». «Natale»,
  «Halloween», «abete addobbato» le legge l'AI, e portano alle due forme.
- **Tessere** 🎃 e 🎄, **in una riga sola che scorre di lato** (chiesto
  dall'utente, 2026-10-01: nella griglia di quattro per riga zucca e albero
  non si trovavano). Tessere larghe 88 punti, poco meno di quattro per
  schermo: quella tagliata sul bordo dice che la riga continua. Una forma
  scritta nel campo («zucca») porta la sua tessera in vista.

**Alternative scartate**: portare «albero» all'albero di Natale (chi
scrive «albero» a luglio non vuole la stella in cima; è una scelta di
prodotto, non delegata); mettere «halloween» e «natale» nella tabella
(sono feste, non disegni: le legge l'AI, e si possono spostare se sbaglia).

**Conseguenza**: il catalogo ha tredici forme. Chieste all'API a Milano a
15 km danno, punto per punto, i campioni giudicati di TASK-078. Se un
giorno `tree` entra nel catalogo, «albero» e «tree» sono liberi per lui.

## ADR-0118 — I baffi delle altre forme: solo quelli oltre i tratti voluti
**Stato**: Attiva · 2026-10-02 · chiesto dall'utente («fai lo stesso per
le altre forme») e giudicato da lui forma per forma; misura e peso decisi
dall'agente su delega dell'utente (TASK-140). Segue ADR-0107 e ADR-0109.

**Contesto**: senza tratti ripassati restano solo cavallo e luna. Gatto,
pesce, farfalla, lumaca, testa di cane e di coniglio ripassano apposta
occhi, antenne, spirale (TASK-037): contare tutto il percorso fatto due
volte li avrebbe puniti per i loro tratti.

**Decisione**:
- `extra_doubled_share(percorso, forma)`: la quota fatta due volte del
  percorso meno quella della forma piazzata; mai sotto zero. Sostituisce
  `doubled_share` nel costo della ricerca e nello `score` delle partenze
  vicine. Per una forma senza tratti è la stessa cosa: cuore, cerchio e
  stella restano identici (77 percorsi confrontati con `main`).
- `W_DOUBLED` = 1,5 per cuore, cerchio, stella, cavallo, luna, farfalla,
  lumaca.

**Giudizio dell'utente** sui 13 percorsi che cambiavano con il peso su
tutte le forme: meglio i nuovi per luna (1 su 1), farfalla (1 su 1),
lumaca (1 su 1); meglio quelli di prima per gatto (3 su 4), pesce (1 su 1),
testa di cane (2 su 3), testa di coniglio (1 su 1, l'altro indifferente).
Il cavallo non cambiava: entra come il cerchio, perché non ha tratti.

**Alternative scartate**: il peso per tutte le forme (gatto, pesce e teste
avrebbero perso forma, giudicati peggio); un peso diverso per forma (con
7 prove ciascuna non c'è abbastanza per tararlo).

**Conseguenza**: sulle prove cambiano solo i 3 percorsi giudicati meglio.
Gatto, pesce e le teste possono tenere dei baffi: se l'occhio lo chiede,
servono altre idee (ritoccare la forma, o la somiglianza delle teste).

## ADR-0119 — Le zone delle città scaricate prima, sul server dell'app
**Stato**: Attiva · 2026-10-02 · chiesto dall'utente («scarica un po' di
mappe almeno per l'Italia»); quali città, il riquadro e il come decisi
dall'agente su delega dell'utente (TASK-137).

**Contesto**: la prima richiesta per una città nuova scarica la sua zona da
Overpass: Vercelli, la prima volta, 94 s per i tre esempi (TASK-143), quasi
tutti download. Dal Mac Overpass rifiuta per ore dopo pochi download; dal
server Hetzner, che l'app usa dal 2026-10-01, risponde.

**Decisione**:
- **Un comando dell'API**, `python -m shaperoute_api.prefetch_zones`: usa la
  stessa ricerca delle città di `GET /cities`, quindi lo stesso centro che
  l'app riceve al tocco.
- **Il riquadro di «Explore»**: ogni forma dei temi (lette da `THEMES`) a
  10 km da qualunque partenza entro `search_radius_m(10 km)` (2,5 km), con
  l'area della ricerca lontana del motore da quelle partenze
  (`zone_area(..., FAR_OFFSET_M)`), e gli esempi di TASK-143 a 5 km da
  qualunque partenza entro `FAR_OFFSET_M` (2 km). Bastano le quattro
  partenze più lontane a nord, est, sud e ovest: i riquadri sono allineati
  agli assi. Circa 17 × 17 km, 289 km². Il primo riquadro, senza la ricerca
  lontana, era di 14 km: Romantic a Verona e Bolzano usciva di 0,4–0,7 km a
  nord e chiedeva Overpass. Le zone a 14 km già fatte restano: l'API prende
  la zona più piccola che copre la richiesta, quindi la più leggera.
- **Con i nomi delle strade** (ADR-0057): l'API li legge solo dalla cache,
  e «Start» (TASK-145) li dice. Una città con la zona ma senza nomi scarica
  solo i nomi.
- **Le città**: `--preset italy`, 52 città (i 21 capoluoghi di regione e
  provincia autonoma, poi le più grandi e visitate, Vercelli e Levico
  comprese); `--preset featured`, le 14 città in evidenza dell'app. Solo
  nomi, nessuna coordinata scritta.
- **Prudenza con Overpass**: un download alla volta, 60 s fra una città e
  l'altra; prima di ognuna la pagina di stato, e se un posto si libera fra
  N secondi si aspetta (fino a 5 minuti): è quello che il servizio chiede, e
  il primo giro sul server senza attesa si era fermato a Milano con un
  errore HTTP subito dopo Roma. Un tentativo per città; una città che
  fallisce resta per il giro dopo, e due errori di fila fermano il comando
  (TASK-137 diceva «il primo errore»: pensato per il Mac, che Overpass
  blocca per ore; dal server l'errore tipico è un 504 passeggero, e il
  secondo giro si era fermato a Torino per uno solo). Stop anche se Overpass
  non risponde, `--max-downloads` per stare nell'uso corretto del servizio
  pubblico; stop sotto i 5 GB liberi. Rilanciato riparte dalle mancanti.
- **Sul server, in un container a parte** con la cartella della cache
  dell'API: l'API in servizio non si ferma, e legge le zone nuove dal disco
  alla prima richiesta (le scritture sono intere, ADR-0104).

- **Dall'estratto di Geofabrik** (scelta dell'utente del 2026-10-02, dopo
  che Overpass aveva bloccato il server alla quinta città): `--extract`,
  osmium solo nell'immagine dei download. **osmium-tool è una dipendenza
  nuova, approvata dall'utente** il 2026-10-02 (nell'opzione scelta, poi
  alla domanda diretta del Coordinatore); serve solo a chi rifà le zone
  (`SETUP.md` 10.5: `brew install osmium-tool` sul Mac), non all'API né
  all'app. OSMnx e il motore ricevono dal
  ritaglio le risposte di Overpass (sostituendo per la durata del download
  `osmnx._overpass._download_overpass_network` e `network._overpass`) e
  fanno tutto il resto come sempre: così la zona è quella di un download,
  verificato su Napoli e Palermo (stessa linea per cuore e stella).
  Costruire il grafo da un file `.osm` con `graph_from_xml` saltava il
  taglio al riquadro e il filtro: zone diverse.

**Alternative scartate**: Overpass molto piano (una città ogni due ore,
giorni per l'Italia, e il server ribloccato ogni tanto anche per l'app);
pyosmium nel progetto (una dipendenza Python in più per l'API, che non ne ha
bisogno); zone più grandi per le città grandi:
più download per le stesse richieste di «Explore»; scaricare sul Mac:
Overpass lo rifiuta, e l'app non usa più il Mac.

**Conseguenza**: nelle città scaricate «Explore» non aspetta Overpass;
fuori, la prima richiesta scarica ancora. Il riquadro non copre «Draw
route» da partenze lontane dal centro né percorsi a tema oltre i 10 km.

## ADR-0121 — Su Linux la memoria per le partenze vicine è MemAvailable
**Stato**: Attiva · 2026-10-02 · deciso dall'agente su delega dell'utente
(TASK-147), dopo che l'utente non vedeva più le alternative sul server.

**Contesto**: le partenze vicine (ADR-0071) partono ciascuna in un
processo solo se c'entra nella memoria, lasciando 1000 MB al piano della
partenza dell'utente; le alternative (ADR-0087) sono i loro percorsi. Su
Linux la memoria si leggeva da `SC_AVPHYS_PAGES`, cioè MemFree, che non
conta la cache dei file. Sul server Hetzner la cache è piena delle zone
lette dal disco: 534 MB liberi su 6,8 GB disponibili, quindi nessuna
partenza vicina e nessuna alternativa, per forme, parole e immagini. Sul
Mac `SC_AVPHYS_PAGES` non esiste (si provano sempre tutte), su Windows si
legge già la memoria disponibile: per questo non si era visto.

**Decisione**:
- Su Linux si legge **MemAvailable** da `/proc/meminfo`: la stima del
  kernel della memoria che un processo nuovo può prendere senza swap,
  cache liberabile compresa.
- Sotto un **limite cgroup v2** (container con `--memory`, servizio
  systemd con `MemoryMax`) non più di quanto resta del limite, contando
  come libera la cache inattiva (`inactive_file`), come fa `docker stats`.
  Senza limite (`max`), solo MemAvailable.
- Senza MemAvailable (kernel prima di 3.14) si torna a `SC_AVPHYS_PAGES`.
- In un modulo nuovo, `route_engine/memory.py`; `free_memory_mb` lo usa su
  Linux. Riserva, peso per processo e attese restano quelli di ADR-0071.

**Conseguenza**: sul server, nel container dell'API, il cuore da 5 km a
Trento torna con un'alternativa (10,8 s) e la stella con due (5,8 s),
come sul Mac. Due richieste insieme contano la memoria ognuna quando
parte, come prima.

## ADR-0120 — Account nell'API: endpoint, errori, tentativi, test
**Stato**: Attiva · 2026-10-02 · deciso dall'agente su delega dell'utente,
dentro ADR-0114 e ADR-0115 (TASK-114); Colima sul Mac scelto dall'utente

**Contesto**: ADR-0115 decide database, libreria, hash della password e
token. Restavano i nomi degli endpoint, gli errori che l'app deve
distinguere, il limite ai tentativi, cosa fa l'API senza database e come
girano i test con un database vero.

**Decisione**:
- **Endpoint**: `POST /accounts` (iscriversi, e si entra), `POST /session`
  (entrare), `DELETE /session` (uscire da questo telefono), `GET /me`,
  `DELETE /me`. Il token va in `Authorization: Bearer`, separato dalla
  chiave dell'API in `X-API-Key` (ADR-0076). Gli altri endpoint restano
  aperti; quelli che verranno usano la dipendenza `current_user`.
- **Errori**: sei codici nuovi, in `schemas.py` e `shared-types`:
  `email_taken` e `username_taken` (409), `wrong_credentials`,
  `not_signed_in` e `session_expired` (401), `accounts_unavailable` (503).
  Troppi tentativi riusano `too_many_requests` (429, `Retry-After`).
- **Email sconosciuta e password sbagliata** danno la stessa risposta, nello
  stesso tempo (la password si verifica contro un hash finto): la risposta
  non dice chi è iscritto. L'iscrizione con un'email già usata invece lo
  dice (`email_taken`): il task lo chiede, e senza l'app non saprebbe cosa
  rispondere.
- **Tentativi**: 5 password sbagliate per la stessa email in 15 minuti,
  poi 429 finché la più vecchia esce dalla finestra, anche con la password
  giusta. In memoria: un riavvio li azzera, accettato per un'API con un
  solo processo. Il limite dei POST di ADR-0076 vale in più.
- **Valori**: email in minuscolo, fino a 254 caratteri; password 8–128
  (Argon2 legge tutto: il tetto evita un «password» da un megabyte); nome
  3–20 fra lettere, cifre, `_` e `.`, unico senza badare alle maiuscole e
  mostrato com'è scritto.
- **Scadenza**: una sessione vale finché l'ultimo uso è entro 90 giorni, e
  ogni uso la allunga. Quella scaduta si cancella al primo uso e risponde
  `session_expired` una volta, poi `not_signed_in`.
- **`DELETE /me`** basta il token, senza ripetere la password: la conferma
  la chiede l'app (TASK-115, TASK-121).
- **Senza database** (`SHAPEROUTE_DATABASE_URL` vuota) l'API parte come
  prima e gli account rispondono `503 accounts_unavailable`. **Con
  l'indirizzo ma il database irraggiungibile**, o una migrazione che
  fallisce, l'API non parte e dice perché: meglio che account rotti una
  richiesta alla volta.
- **Migrazioni**: le applica `__main__` prima di aprire la porta, ognuna
  nella sua transazione, sotto un advisory lock; una che fallisce non
  lascia niente. L'estensione PostGIS la crea la prima migrazione con una
  geometria.
- **Connessioni**: una per richiesta, nessun pool (`psycopg_pool` sarebbe
  un pacchetto in più); da rivedere se gli account diventano tanti.
- **Test**: `conftest.py` avvia `postgis/postgis:16-3.4` con docker, una
  volta per giro, e dà a ogni test un database vuoto. I runner della CI
  hanno docker: `ci.yml` non cambia. Senza docker i test del database si
  saltano sul PC e falliscono in CI. Sul Mac docker è Colima (scelta
  dell'utente, 2026-10-02): niente Docker Desktop né licenze.

**Scartate**: `/signup` e `/login` (verbi, mentre l'API nomina le cose);
un servizio `postgres` nella CI (cambia `ci.yml`, e il conftest basta);
un database finto o SQLite nei test (`DATABASE.md`: niente finti);
un 401 diverso per l'email sconosciuta (direbbe chi è iscritto).

**Conseguenze**: TASK-115 usa questi endpoint e i tipi di `shared-types`
(`SignUpRequest`, `Session`, `User`). TASK-122 mette il database sul
server, accanto all'API, con `SHAPEROUTE_DATABASE_URL`. La password
dimenticata resta fuori: serve la posta (Brevo, ADR-0115).

## ADR-0122 — Correre senza percorso: «Run» registra solo la traccia
**Stato**: Attiva · 2026-10-02 · chiesto dall'utente («la possibilità
anche di iniziare una corsa senza disegnare nulla, magari la prima
facciata scrivi Run»); il come deciso dall'agente su delega dell'utente
(TASK-149). Toccare `App.tsx`, che è anche di TASK-132 (in corso), è
segnalato nella PR: le righe cambiate sono altre.

**Contesto**: fino a qui una corsa partiva solo da un percorso (disegnato
o di «Explore») con le indicazioni, e la traccia registrata (ADR-0091)
serviva al punteggio (ADR-0090). Chi vuole solo correre doveva disegnare
qualcosa.

**Decisione**:
- **«Run» nella prima schermata**, un pulsante come «Explore», accanto a
  lui: la corsa parte subito, dal GPS, senza scegliere partenza, forma o
  distanza.
- **Stessa traccia, stesso file**: `startRun` di TASK-112 con il percorso
  vuoto (`FREE_ROUTE`). Valgono le regole di ADR-0091 (posizioni scartate,
  salvataggio ogni 15 s, «una corsa per volta», ripresa entro 30 minuti),
  e un percorso vuoto basta a riconoscere una corsa libera nel file
  (`pendingFreeRun`). Nessuna modifica a `trackStore.ts`.
- **Niente punteggio e niente API**: senza forma non c'è niente da
  giudicare. La fine della corsa mostra km, tempo e passo medio; «Done» la
  cancella subito dal telefono (una corsa con la forma resta finché non ha
  il punteggio).
- **Banner da corsa**: km con due decimali, tempo dalla prima posizione
  (va avanti ogni secondo), passo medio dopo 100 m.
- **La voce a ogni km** (chiesta dall'utente dopo la prima versione): km,
  tempo e passo medio, come un orologio da corsa, con la voce della
  navigazione (`play`, inglese). Una volta per km: se il GPS ne salta uno,
  si dice l'ultimo; una corsa ripresa non ripete i km già detti. Senza
  vibrazione: in navigazione la vibrazione è una svolta.
- **Codice in file nuovi** (`freeRun.ts`, `useFreeRun.ts`,
  `FreeRunScreen.tsx`); `App.tsx` collega le due schermate nuove (`run`,
  `runFinish`) e `ChooseScreen.tsx` ha il pulsante.

**Alternative scartate**: un file a parte per le corse libere (due corse
in corso insieme, e la ripresa da riscrivere); usare `useNavigation` con
un percorso vuoto (il navigatore vuole una linea e dice «You have
arrived»); chiedere un punteggio di sola distanza all'API (non c'è niente
da confrontare); salvare le corse finite (è la cronologia, TASK-117).

**Conseguenza**: dopo uno «Stop» la mappa resta dove si è partiti a zoom
15, non inquadra tutta la linea: inquadrarla vuole un messaggio nuovo
della pagina della mappa (seguito possibile). Il messaggio di «Pocket»
parla di indicazioni anche qui. Da provare sull'iPhone, anche la voce a
schermo nero.

## ADR-0123 — Il database sul server, e le sue copie sul Mac
**Stato**: Attiva · 2026-10-02 · le copie sul Mac sono una **scelta
dell'utente**; il resto deciso dall'agente su delega dell'utente
(TASK-122). Cambia ADR-0115 per le copie di sicurezza.

**Contesto**: ADR-0115 metteva il database sulla VM dell'API e le copie
nell'Object Storage gratuito di Oracle. L'API pubblicata è su Hetzner
(ADR-0111) e Oracle non c'è più. TASK-122 porta gli account (TASK-114)
sul server, e con loro lo spostamento del server su `deploy/compose.yaml`
(`DEPLOY.md` F.12), fatto una volta sola con il database dentro.

**Decisione**:
- **Il servizio `db`** in `deploy/compose.yaml`: `postgis/postgis:16-3.4`,
  i dati nel volume `db` e non in `data/` (`data-owner` dà `data/`
  all'utente dell'API, PostgreSQL vuole i suoi), nessuna porta verso
  fuori, un controllo di salute; l'API parte quando il database risponde e
  ha il suo indirizzo da `POSTGRES_PASSWORD` (solo lettere e cifre, perché
  sta dentro un URL). Il database c'è sempre, senza profili: gli account
  sono parte dell'app.
- **La copia notturna** nel servizio `backup`, con la stessa immagine (un
  `pg_dump` della stessa versione del server): ogni giorno alle 02:00 UTC,
  formato custom, scritta con un nome nascosto e rinominata quando è
  intera, leggibile solo dal proprietario. Le copie con più di 13 giorni
  si cancellano, e solo dopo una copia riuscita: un account cancellato
  esce da ogni copia entro 14 giorni (ADR-0114, punto 7). `backup.sh
  check` ripristina una copia in un database a parte e lo cancella.
- **Le copie sul Mac** (scelta dell'utente, fra il *Backup* di Hetzner, lo
  Storage Box, un object storage S3 e il Mac): `launchd` ogni 6 ore e
  all'accesso, `rsync` sopra SSH con la chiave che il Mac usa già; le
  copie del database sono uguali a quelle del server e quelle con più di
  13 giorni si cancellano anche a server irraggiungibile; gli eventi delle
  ricerche si aggiungono e non si cancellano.
- **La CI** (job `docker`): con `POSTGRES_PASSWORD`, un'iscrizione vera
  (`201`), `/me` senza token (`401`, cioè account accesi), una copia, il
  suo ripristino con un account dentro, il file in modo `600`.
- **Il ripristino vero** cancella e ricrea il database e vi ripristina la
  copia; l'API, riavviata, riapplica le migrazioni più nuove della copia.

**Scartate**: il *Backup* di Hetzner (+20%), lo Storage Box e un object
storage (scelta dell'utente: il Mac, gratis; il primo resta possibile in
più); i dati del database in una cartella di `data/` (il `chown` di
`data-owner` li toglierebbe a PostgreSQL); un `cron` sul server (un
servizio di `compose.yaml` si avvia con tutto il resto, con un comando);
tenere le ultime 14 copie invece dei 13 giorni (una copia fatta a mano in
più accorcerebbe i giorni, e la promessa dei 14 giorni è sui giorni).

**Conseguenze**: a Mac spento per giorni le copie stanno solo sul server.
Il server passa su `compose.yaml` dentro TASK-122, dopo il sì
dell'utente. Sul Mac Docker vuole il plugin `buildx`: senza BuildKit
l'heredoc del `Dockerfile` si salta in silenzio e l'immagine nasce senza
dipendenze (visto il 2026-10-02; la CI e il server hanno BuildKit).

**Aggiornamento 2026-10-02** (scelta dell'utente: «Storage Box, sposto
ora»): le copie fuori dal server vanno in uno **Storage Box Hetzner**
(BX11, Falkenstein), non sul Mac; `deploy/mac/` è tolto. Un servizio
`offsite` le manda ogni notte alle 02:30 UTC, mezz'ora dopo la copia, con
`rsync` sopra SSH sulla porta 23: le copie del database in `sgrava-db/`,
le stesse del server (quelle con più di 13 giorni spariscono anche lì, e
la promessa dei 14 giorni vale anche fuori), e gli eventi delle ricerche
in `sgrava-insights/`, solo aggiunti. `offsite` è un'immagine Alpine a
parte: quella di `postgis/postgis:16-3.4` è su Debian 11, il suo archivio
di PostgreSQL non c'è più e lì non si installa niente. La chiave è una
chiave SSH dedicata, generata sul server in `/root/.ssh/storagebox/`, fuori
dal repository; la chiave dello Storage Box si fissa una volta in
`known_hosts`. Lo Storage Box lo crea l'utente nel pannello; finché non
c'è, le copie restano sul server. Il server è passato su `compose.yaml`
con il database lo stesso giorno, alle 07:27Z, con 18 s di API ferma. Un
server di sviluppo, se l'utente lo vorrà, è un task a parte.

## ADR-0125 — L'account nell'app: due schede, la sessione nel portachiavi, l'uscita
**Stato**: Attiva · 2026-10-02 · deciso dall'agente su delega dell'utente,
dentro ADR-0114, ADR-0115 e ADR-0120 (TASK-115)

**Contesto**: ADR-0114 e ADR-0115 decidono email e password e il token in
`expo-secure-store`; ADR-0120 gli endpoint e gli errori. Restavano come
fare le schede senza librerie di navigazione (TASK-051), cosa tiene il
telefono, cosa fa l'app senza rete e cosa fa quando la sessione finisce.

**Decisione**:
- **Schede fatte a mano** (`src/screens/Tabs.tsx`), come le schermate di
  TASK-051: niente `react-navigation`. «Draw» resta montata sotto
  «Profile», così la mappa non si ricarica e le scelte restano.
- **La barra solo sotto le schermate che scelgono** («What to draw»,
  «Explore»): ognuna lo dice con `useTabBar`; mappa, corsa e fine della
  corsa la tolgono, come le app iOS nelle schermate di dettaglio. È
  l'elenco di chi la vuole, non di chi non la vuole: una schermata nuova
  (TASK-149) parte senza. Sopra la barra il margine in basso vale zero
  (`SafeAreaInsetsContext`): l'indicatore di home lo tiene la barra.
- **Nel portachiavi la `Session` intera**, token e `User`, sotto una chiave
  sola (`shaperoute.session`), letta in modo sincrono all'avvio come la
  corsa non giudicata (TASK-113): la prima schermata è già giusta, e il
  nome si vede anche senza rete. La password non resta mai sul telefono.
- **All'apertura un `GET /me`**: aggiorna l'utente; `session_expired` o
  `not_signed_in` fanno uscire e «Profile» lo dice, con un pallino
  `warning` sulla scheda; senza risposta l'app resta dentro (offline non
  è uscito). Lo stesso vale per ogni richiesta dell'account.
- **«Log out» esce subito**, anche senza rete: il telefono dimentica il
  token e `DELETE /session` parte senza aspettarlo. Un'API irraggiungibile
  non tiene nessuno dentro; la sessione rimasta sull'API scade in 90
  giorni.
- **«Delete account» esce solo con il 204 dell'API**: altrimenti
  l'account resterebbe sull'API e sparirebbe dal telefono. La conferma è
  sulla schermata, non un `Alert` di sistema: si prova nei test.
- **I campi si controllano nell'app** con le regole di `accounts.py`
  (email, nome 3–20, password 8–128, casella dei 16 anni), e si dice il
  primo che non va: l'API resta il giudice, l'app evita un `invalid_request`
  che sarebbe un bug.

**Scartate**: `react-navigation` (una dipendenza in più contro TASK-051);
il solo token nel portachiavi (senza rete l'app non saprebbe chi è
dentro); la barra sempre visibile (ruba spazio alla mappa e alla corsa);
un «Log out» che aspetta l'API; un `Alert` per la conferma.

**Conseguenze**: i task che useranno il token (TASK-116 e seguenti)
lo prendono dallo stato di `useAccount` (`src/account/`, oggi tenuto da
`Tabs.tsx`: un contesto React quando servirà a più schermate) e lo
mandano con `authHeaders` di `src/api/accounts.ts`.

## ADR-0126 — «Explore»: gli esempi di una città con le alternative A · B · C
**Stato**: Attiva · 2026-10-02 · chiesto dall'utente («seleziono New York
e un cuore da 5,2 km: non ci sono le tre opzioni»); il come deciso
dall'agente su delega dell'utente (TASK-151).

**Contesto**: un esempio di città (ADR-0116) è un percorso chiesto
all'API come uno disegnato, e l'API manda già fino a due alternative
(ADR-0087; sul server da ADR-0121). L'app teneva solo il primo percorso,
quindi la scheda di «Explore» non aveva le tessere. `App.tsx`, che passa
alla scheda il percorso aperto, è di altri tre task in corso.

**Decisione**:
- **L'esempio tiene le alternative**, ognuna un percorso intero
  (`ExampleDetail.alternatives`), in memoria e nel file sul telefono. Il
  campo c'è sempre, anche vuoto.
- **Un esempio salvato senza il campo si ridisegna**, una volta: è di
  prima di questo task, e senza rifarlo le città già viste non avrebbero
  mai le tessere. Con la zona in cache sono pochi secondi a forma.
- **La scelta sta dentro il percorso aperto** (`useExplored`): `choices`,
  `chosen`, `choose`, e `route`, `detail`, `request`, `result` sono quelli
  del percorso scelto. `App.tsx` li legge già così, quindi mappa, «Start»
  (ADR-0117) e GPX seguono la scelta senza toccarlo. Ogni percorso ha il
  suo `result`, fatto una volta: è da quello che «Start» e l'export
  riconoscono un percorso.
- **Le tessere sono quelle di sempre** (`RouteTiles`), sopra «Start».
  Mentre si aspettano le indicazioni un tocco non cambia percorso: la
  risposta in arrivo è di quello scelto.

**Scartate**: tenere la scelta in `App.tsx` come per i percorsi disegnati
(il file è occupato; da rivedere insieme alle linee grigie); mostrare gli
esempi vecchi senza tessere (l'utente non le vedrebbe mai sul cuore che
ha già); un file nuovo sul telefono (lascerebbe il vecchio orfano).

**Conseguenze**: gli altri percorsi non sono in grigio sulla mappa e la
scelta non manda il segnale di ADR-0112: tutte e due le cose passano da
`App.tsx`, seguiti scritti in `tasks/TASK-151.md`. I percorsi del catalogo
e quelli a tema restano uno solo. Provato sull'API del Mac a New York:
cuore, cerchio e stella da 5 km arrivano con due alternative ciascuno.

## ADR-0124 — Tre pagine affiancate con lo swipe, al posto delle schede in basso
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («vai
con lo swipe fra le tre pagine», fra la variante con i nomi in alto e
quella con la barra in basso); il come deciso dall'agente su delega
dell'utente (TASK-154). **Supera**, di ADR-0125, i punti «Schede fatte a
mano» e «La barra solo sotto le schermate che scelgono».

**Contesto**: l'utente ha chiesto di passare fra le schermate con uno
swipe a destra e a sinistra, con «Explore» da un lato e dall'altro una
pagina con i disegni pubblicati dagli iscritti. TASK-115 aveva appena
messo due schede in basso, «Draw» e «Profile»; «Explore» si apriva da un
pulsante della prima schermata e si chiudeva con «←».

**Decisione**:
- **Tre pagine, in quest'ordine**: «Feed», «Draw», «Explore». L'app si
  apre su «Draw», al centro. I nomi in alto sono anche i comandi: si
  toccano, e mostrano l'ordine delle pagine.
- **Lo scorrimento a pagine di React Native** (`ScrollView` orizzontale
  con `pagingEnabled`, `src/screens/Pager.tsx`): nessuna dipendenza nuova,
  nessuna libreria di navigazione, come in TASK-051.
- **Lo stato resta in `App.tsx`**: `feed`, `choose` ed `explore` sono tre
  valori di `Screen`, e il pager dice quale è sullo schermo. Mappa, corsa e
  fine corsa restano schermate intere: lì il pager non è montato, così lo
  swipe non compete con il dito sulla mappa.
- **«Explore» si monta alla prima visita** (`lazy`): chiede i percorsi
  all'API appena si apre, e non deve farlo a ogni avvio dell'app. Si monta
  ai primi pixel dello swipe verso di lei, così entra già disegnata. Le
  altre due pagine sono montate subito.
- **La barra in basso sparisce**. «Profile» si apre da un pulsante tondo
  accanto ai nomi e si chiude con «←» (`src/screens/ProfileLayer.tsx`, al
  posto di `Tabs.tsx`); il pallino `warning` della sessione finita passa
  sul pulsante. `useTabBar` non serve più.
- **La figura del pulsante è disegnata con due `View`**, testa e spalle:
  l'app non ha icone né `react-native-svg`. Con un account, l'iniziale.
- **«Feed» per ora è una pagina vuota e onesta**: dice che lì arriveranno
  i disegni pubblicati. La riempie TASK-118.
- **Sotto l'intestazione il margine in alto vale zero**
  (`SafeAreaInsetsContext`): la tacca la tiene l'intestazione, e le
  schermate di prima non cambiano.
- **Una pagina fuori dallo schermo è nascosta all'accessibilità**: uno
  screen reader legge solo la pagina che si vede.

**Scartate**: la barra in basso con quattro schede (la variante B del
canvas: l'utente ha scelto l'altra); `react-navigation` o
`react-native-pager-view` (dipendenze nuove contro TASK-051); un gesto
fatto a mano con `PanResponder` (lo scorrimento a pagine del sistema ha già
inerzia e rimbalzo giusti); montare «Explore» all'avvio (una richiesta
all'API a ogni apertura, anche per chi non la guarda).

**Conseguenze**: TASK-118 riempie `FeedScreen.tsx` e non ha più `Tabs.tsx`
da toccare. Le righe che scorrono di lato dentro una pagina (le tessere,
le città) dovrebbero tenere il gesto per sé, con lo swipe fra le pagine
che parte da fuori: va provato con il dito sull'iPhone, e su Android non è
stato provato niente. Il nome «Sgrava» resta in
cima a «Draw» e «Best near you» in cima a «Explore»: toglierli o no è
parte del ridisegno delle due pagine, non ancora scelto.

## ADR-0127 — «Feed» con quindici esempi dal catalogo, finché non pubblicano gli iscritti
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («nella
sezione feed crea già in automatico 15 attività con nomi inventati, utenti
inventati, che hanno fatto delle figure in sette città differenti d'Italia,
e seleziona le figure che sono venute meglio»); il come deciso dall'agente
su delega dell'utente (TASK-156).

**Contesto**: dopo TASK-154 «Feed» era una pagina vuota. Il feed vero
(TASK-118) vuole account, disegni salvati e un endpoint: non c'è ancora.
L'utente vuole la pagina piena da subito.

**Decisione**:
- **Le linee vengono dal catalogo seme** (`catalog/seed/`, sette città): le
  ha tracciate il motore, e uno script (`tools/sample_feed.py`) le sceglie
  e le scrive in `apps/mobile/src/feed/sampleFeed.json`. Nessuna coordinata
  è inventata, né dall'AI né a mano (`CLAUDE.md`).
- **La scelta**: ogni città dà due figure di forme diverse, le sue meglio
  riuscite; fra quelle riuscite almeno al 95% prende prima una forma non
  ancora nel feed; nessuna forma più di due volte; scelgono prima le città
  con meno figure buone; la quindicesima è la migliore rimasta. Oggi: 11
  forme, somiglianza minima 0,954, Firenze con tre.
- **Meno punti, stessi angoli**: ogni linea scende a 120 punti al più con
  Douglas-Peucker in metri, non un punto ogni tanti come l'anteprima
  dell'API a 64: a tutta larghezza gli angoli contano.
- **Inventati e sempre uguali**: corridori, titoli, tempi (da 5:15 a 6:40
  al km) e punteggi (qualche punto sotto la somiglianza) escono dallo
  script con regole fisse. Il file cambia solo se cambia il catalogo, e si
  rifà a mano: nessun test lo lega al catalogo, così chi aggiunge una città
  non rompe la CI di questo.
- **Niente sulla pagina dice che sono esempi**: scelta dell'utente
  (2026-10-02). L'agente aveva messo una riga in cima («Examples, drawn by
  the route engine on real streets…») perché corridori finti mostrati come
  veri ingannano chi entra; l'utente, sentito il motivo, l'ha fatta
  togliere. Niente like, commenti o tocchi: quelle cose non esistono ancora.
- **I dati stanno nell'app**, non nell'API: nessuna richiesta, funziona
  senza rete. Il disegno si fa come le miniature di «Explore»
  (`thumbSegments`), una `View` per tratto, in un elenco che monta poche
  schede alla volta.

**Scartate**: scrivere a mano corridori e linee; chiedere i percorsi
all'API a ogni apertura (sette richieste per una pagina di esempi); like e
commenti finti; orari finti («2 h ago» per sempre).

**Conseguenze**: TASK-118 sostituisce gli esempi con i disegni veri, o li
tiene sotto finché sono pochi: lo decide l'utente allora. **Prima di
invitare persone che non conoscono l'app** (il cancello di `ROADMAP.md`,
«La parte social») va rivisto se gli esempi restano senza dirlo: chi entra
li prende per corse di iscritti veri. Gli `id` sono
quelli che l'API dà ai percorsi del catalogo: servono a TASK-118 per aprire
il percorso dal feed. Se il catalogo cambia, `python tools/sample_feed.py`
rifà il file.

## ADR-0129 — Il logo: una S fatta come un percorso, l'icona dell'app e il suo nome
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** fra tre proposte
(«scelgo la A, metti l'icona nell'app») e per il nome («cambia il nome
sotto l'icona in Sgrava»); le misure e i file decisi dall'agente su delega
dell'utente (TASK-159).

**Contesto**: l'utente ha chiesto un logo «più futuristico, più moderno» di
quello disegnato a mano il 2026-09-20 («grava» su asfalto). L'icona
dell'app era ancora il segnaposto di Expo, azzurro.

**Decisione**:
- **Il segno**: una S di un tratto solo, con gli angoli arrotondati, e un
  punto in alto a destra: il percorso e la sua partenza. In un quadro di
  77 × 87: tratto `M40 24H12Q0 24 0 36V48Q0 60 12 60H48Q60 60 60 72V84Q60
  96 48 96H0`, largo 14, estremità tonde; punto in (62, 24), raggio 8.
- **Il logo**: il segno fa da S, seguito da «GRAVA» con lo stesso tratto;
  le due A senza trattino, come la V rovesciata. Come nel logo di prima, il
  segno è la prima lettera del nome.
- **I colori sono quelli del tema** (ADR-0046): giallo `#FFD02B` su nero
  `#0A0A0B`, o nero su giallo. Nessun colore nuovo.
- **L'icona**: il segno giallo su nero, alto il 53% del lato; 1024 × 1024,
  senza trasparenza (l'App Store la rifiuta). Su Android il segno è alto il
  43% del lato, dentro il cerchio sicuro dell'icona adattiva; fondo nero,
  icona a un colore bianca su trasparente.
- **Il nome sotto l'icona è «Sgrava»**: `name` in `app.json`, che era
  ancora «ShapeRoute». `slug` (`shaperoute`), `bundleIdentifier` e il
  progetto EAS non cambiano: gli aggiornamenti arrivano come prima.
- **I vettoriali stanno in `docs/brand/`**: le immagini si rifanno da lì.
  Nessuno script nel repository: sono sei immagini, rifatte di rado.

**Scartate**: «Nodi», la S su una griglia di incroci (i puntini si perdono
sotto i 30 px); «Scatto», due frecce inclinate (simile a molti marchi
sportivi); il fondo giallo con il segno nero per l'icona (nell'app il
giallo è il percorso su fondo nero, e l'icona lo anticipa).

**Conseguenze**: le proposte, l'immagine del profilo e i post per Instagram
stanno in un canvas privato dell'utente, non nel repository. La schermata
di avvio non è configurata in `app.json`: `splash-icon.png` è ridisegnata
ma non usata. L'icona e il nome sulla schermata di casa si vedono solo in
una build propria (TASK-152). Una cartella `ios/` generata prima porta il
nome vecchio: si rifà con `npx expo prebuild --clean`. Tre testi dell'app
dicono ancora «Location is off for ShapeRoute…»: da allineare in un task a
parte, perché in una build propria le Impostazioni elencano «Sgrava».

## ADR-0131 — La mappa sotto i disegni di «Feed» è una foto, fatta da una pagina nascosta
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («nella
sezione feed sotto le immagini, bisogna aggiungere la mappa»); il come
deciso dall'agente su delega dell'utente (TASK-162).

**Contesto**: da TASK-156 una scheda di «Feed» è la linea gialla su un
fondo vuoto. L'utente vuole sotto la mappa. La mappa dell'app è MapLibre
GL JS in una WebView (ADR-0029): una per scheda vorrebbe dire fino a una
decina di pagine con WebGL vive insieme in un elenco che scorre.
OpenFreeMap dà solo tile vettoriali: non c'è un'immagine da chiedere.

**Decisione**:
- **Una foto, non una mappa**: la scheda non si tocca (ADR-0127), quindi
  le basta un'immagine. **Una sola pagina MapLibre**, in «Feed», sotto
  l'elenco che la copre: inquadra una mappa alla volta, aspetta che ogni
  tile sia disegnata (`idle`) e manda all'app il canvas come JPEG
  (`toDataURL`, `preserveDrawingBuffer`). La scheda lo mostra con `Image`
  sotto la linea.
- **Stesso stile e stessa libreria della mappa grande** (`MAP_STYLE`,
  MapLibre con SRI): i colori restano i token, niente chiave. Senza
  controlli e senza gesti.
- **La linea resta dell'app**: le `View` di `thumbSegments`, sopra la foto.
  `lineCamera` dà a MapLibre centro e zoom dello stesso riquadro; su pochi
  chilometri la proiezione della mappa e quella piana della linea
  differiscono di meno di un punto (un test lo misura). Così la scheda è
  subito quella di prima, e la mappa le arriva sotto.
- **Una alla volta, a richiesta**: la foto la chiede la scheda quando
  l'elenco la monta (`useFeedMap`); la pagina c'è solo finché c'è una foto
  da fare, poi si smonta e libera la memoria. Ogni richiesta porta la sua
  misura: la pagina si ridimensiona da sola.
- **Le foto restano in memoria** per tutta la vita dell'app, per `id` e
  misura: il `Pager` smonta «Feed» ogni volta che si apre la mappa grande.
- **Quando non va**: una tile che manca dà una scheda senza mappa, non
  mezza mappa; una foto che non arriva in 20 s si salta; se MapLibre non si
  carica la pagina si smonta. Nessun messaggio: la scheda senza mappa è
  quella di TASK-156. Una scheda che torna sullo schermo richiede.
- **Il credito su ogni foto**: «OpenFreeMap © OpenMapTiles / Data from
  OpenStreetMap», il testo di `ATTRIBUTION`, senza link perché la scheda
  non si tocca. In due righe, in basso a destra, accanto al punteggio.

**Scartate**: una WebView per scheda (memoria, e i gesti della mappa
contro lo swipe delle pagine); immagini già pronte nell'app, fatte da uno
script (vuole un browser senza testa fra gli strumenti, e non serve al feed
vero); tile raster di un altro fornitore (un'altra mappa, chiara, e una
chiave); disegnare anche la linea in MapLibre (la scheda resterebbe vuota
finché la foto non arriva).

**Conseguenze**: all'apertura dell'app partono le foto delle prime schede
(«Feed» è costruita subito: `App.tsx` non si tocca qui), cioè MapLibre da
unpkg e qualche tile per città; nel simulatore 2 s la prima volta, meno di
1 s con le tile in cache. Le foto non restano fra un'apertura e l'altra.
Con il feed vero (TASK-118) la stessa pagina fotografa qualsiasi linea, ma
serve un tetto alle foto in memoria. `FeedPost` mostrato altrove (TASK-163)
ha la mappa finché «Feed» è montata. Android non è stato provato.

## ADR-0134 — La schermata di avvio: `expo-splash-screen`, logo su nero
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («metti
anche la schermata di avvio con il logo») e per la dipendenza («Sì,
aggiungila»); il come deciso dall'agente su delega dell'utente (TASK-165).

**Contesto**: l'app non aveva una schermata di avvio. In Expo SDK 57 la
chiave `splash` di `app.json` non esiste più, tranne che per il web: la
schermata nativa la scrive solo il plugin del pacchetto `expo-splash-screen`,
che nel progetto non c'era.

**Decisione**:
- **Dipendenza nuova: `expo-splash-screen` ~57.0.9**, il pacchetto ufficiale
  di Expo per l'SDK 57 (è in `bundledNativeModules.json` di `expo`, quindi
  fra i moduli che Expo Go ha già dentro). Con sé porta `xml2js`,
  `@expo/image-utils` e `@expo/config-plugins`, già nel lock.
- **Solo il plugin, nessun codice**: l'app non importa il modulo e non
  chiama `preventAutoHide`. La schermata sparisce quando l'app è pronta.
  In Expo Go quindi non cambia niente, e un `eas update` resta sicuro.
- **Fondo `#0A0A0B`, logo giallo** (ADR-0129, ADR-0046).
- **Su iOS il logo intero**, largo 260 punti: `assets/splash-logo.png`,
  1040 × 1040 trasparente, perché il plugin mette l'immagine in un quadrato
  largo `imageWidth`.
- **Su Android il segno da solo**, `assets/splash-icon.png` a 240 dp: da
  Android 12 il sistema ritaglia l'immagine in un cerchio di 192 dp, dove
  il logo largo starebbe minuscolo; il segno ha una diagonale di 131 dp.

**Scartate**: un plugin scritto da noi per non aggiungere il pacchetto
(codice nativo generato a mano, da provare e mantenere); un componente
React che mostra il logo all'avvio (prima che parta il JavaScript lo schermo
resta vuoto, e toccava `App.tsx`); il logo intero anche su Android.

**Conseguenze**: si vede solo in una build propria (TASK-152). Il prebuild
di prova genera `SplashScreen.storyboard` con il logo in un riquadro di
260 × 260 al centro e il colore `SplashScreenBackground` a `#0A0A0B`; su
Android `windowSplashScreenBackground` e `splashscreen_logo`. Il prebuild
scrive anche `android.package` in `app.json` e cambia due script di
`package.json`: sono effetti della prova, non vanno committati. Tenere la
schermata finché i dati sono pronti vorrebbe `preventAutoHide` in `App.tsx`:
un task a parte, se servirà.

**Aggiornamento 2026-10-02 (TASK-181)** — **scelta dell'utente** («sì, fai
gialla anche la schermata di avvio nativa»): il fondo è `#FFD02B`, il
giallo `accent`, e le immagini sono nere: `assets/splash-logo-dark.png` su
iOS e `assets/splash-icon-dark.png` su Android, le stesse di prima con ogni
pixel a `#0A0A0B`. Larghezze invariate (260 e 240). Le due immagini gialle
sono cancellate: niente le usa più. Così l'avvio è giallo dall'inizio alla
fine, schermata nativa e animazione (ADR-0147). Il prebuild di iOS genera
`SplashScreenBackground` a 255, 208, 43 e il logo nero di 260 × 260 al
centro.

## ADR-0130 — Nel catalogo solo parole corte
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** («Solo parole
corte»); l'elenco preciso deciso dall'agente su delega dell'utente
(TASK-161).

**Contesto**: il giro del 2026-10-02 ha scritto le frasi di ADR-0097 in 14
città. Guardate a occhio, al tetto dei 21 km si leggono solo le parole fino
a 4 lettere (CIAO, AO, BONA, UE) e qualche TIAMO sulle griglie regolari;
da 5–6 lettere in su (AMORE, BUONDI, GRAZIE, NOTTE, HELLO, CEREA, UAGLIO)
le lettere sono più piccole degli isolati e non si leggono. Sotto 0,88 di
somiglianza nessuna parola si legge.

**Decisione**: `PHRASES` tiene solo parole corte. In Italia CIAO e TIAMO,
più AO e AMOR a Roma, BONA a Firenze, UE a Bari, UELA a Milano; a New York
LOVE, HEY e NYC. Escono GRAZIE, BUONDI, NOTTE, AMORE, HELLO, CEREA,
UAGLIO, AMMORE, ROMEO, AMURI, ILOVENY, THANKS. Fra quelle rimaste, il
catalogo tiene solo le combinazioni di città e stile che si leggono
(ADR-0097, aggiornamento 2026-10-02).

**Alternative scartate**: tenere tutte le frasi e lasciare decidere la
soglia (parole illeggibili sopra 0,88); alzare il tetto oltre i 21 km per
le parole lunghe (percorsi che quasi nessuno corre).

**Conseguenze**: meno parole nel catalogo (Bologna nessuna), ma tutte
leggibili. Parole più lunghe torneranno con un motore che le scriva meglio,
non allungando la lista.

## ADR-0132 — «Explore»: i disegni del feed mentre una città si disegna, e le città in evidenza già nel catalogo
**Stato**: Attiva · 2026-10-02 · chiesto dall'utente («almeno un cuore, un
cerchio e la stella devono essere già disegnate [in] tutte le città che
consigliamo»; «mentre sta caricando fai vedere dei post […] quelli che
abbiamo già tenuto in feed»); quanti, quali e fino a quando decisi
dall'agente su delega dell'utente (TASK-163). Allarga ADR-0116.

**Contesto**: una città cercata la prima volta scarica la mappa prima di
disegnare cuore, cerchio e stella (Vercelli sul server: 94 s), e in
quell'attesa la pagina aveva tre righe «Drawing…» / «Next» e nient'altro.
Delle 14 città in evidenza (`FEATURED_CITIES`) solo Roma, Milano e Torino
hanno le tre forme nel catalogo: le altre le disegnano al tocco.

**Decisione, l'attesa (parte B)**:
- **I disegni di «Feed» sotto gli esempi**, finché uno è «Next» o
  «Drawing…»: 5, in colonna, resi dallo stesso `FeedPost` della pagina
  «Feed», che non si tocca. Cinque bastano per un minuto, e ogni disegno
  sono un centinaio di `View`: tutti e quindici insieme peserebbero su una
  pagina che non è un elenco a finestra.
- **In colonna, non in una fila da scorrere di lato**: le pagine si
  cambiano con lo swipe orizzontale (ADR-0124), e una fila in più dentro
  «Explore» gli ruba il gesto.
- **Città diverse, disegni diversi per primi**: il primo è scelto dalla
  chiave della città (`cityKey`), poi l'ordine del feed. Sempre lo stesso
  per la stessa città: niente caso, i test restano deterministici.
- **Restano finché non si cambia città**: se sparissero all'arrivo
  dell'ultimo esempio, la pagina salterebbe sotto il dito di chi li sta
  guardando. La riga sotto il titolo passa da «la mappa si scarica, fino a
  un minuto» a «The shapes of this city are ready above.».
- **Solo dove c'è un'attesa**: una città con percorsi consigliati, o con
  gli esempi già sul telefono, non li mostra.
- **Non si aprono al tocco**, come in «Feed» oggi: aprire un disegno del
  feed è di TASK-118 e TASK-162.
- **Un file nuovo** (`WhileDrawing.tsx`), e in `ExploreScreen.tsx` solo
  l'aggancio.

**Decisione, le città in evidenza (parte A)**:
- **Nel catalogo, con lo strumento del catalogo** (ADR-0097):
  `seed_catalog.py --featured`. Le città in evidenza che il seme non ha
  stanno in una tabella a parte (`FEATURED`), non in `CITIES`: così il giro
  intero (ogni forma a 5, 10 e 21 km, le frasi) non parte anche per loro,
  che hanno le zone solo sul server e a 17 km.
- **Solo cuore, cerchio e stella da 5 km**, come gli esempi che l'app
  disegnava al tocco (ADR-0116), da una piazza del centro entro 5 km dal
  centro che l'API dà per il nome della città: è il raggio dell'elenco di
  «Explore».
- **Le zone copiate dal server in sola lettura** (`rsync`, 1,2 GB per nove
  città, nella cache del Mac): niente Overpass, niente chiave dell'API,
  niente scritto sul server.
- **La soglia resta 0,88**: le 27 forme sono fra 0,91 e 1,00, tutte viste a
  occhio dall'agente (`samples/LOG.md`). Le più deboli sono il cuore e la
  stella di Dubai: da far vedere all'utente.
- **Un test tiene il patto**: `tools/test_featured_catalog.py` legge
  `FEATURED_CITIES` dall'app e fallisce se una città in evidenza non ha le
  tre forme vicino al suo centro.
- **Berlino manca**: la sua zona non è sul server (TASK-137) e Overpass
  rifiuta il Mac. Nel test è una mancanza dichiarata (`MISSING`, `xfail`
  rigido: il giorno che le forme ci sono, il test chiede di toglierla). In
  app Berlino continua a disegnarle al tocco, con i disegni del feed
  nell'attesa. **Scelta dell'utente (2026-10-02)**: il catalogo entra con
  13 città, Berlino dopo, quando Overpass riapre.
- **Il registro delle prove** è lo stesso del seme
  (`out/seed_catalog/runs.jsonl`, fuori dal repository): le 27 righe sono
  state aggiunte lì.

**Scartate**: disegnare le forme delle città in evidenza chiedendole
all'API del server con uno script a parte (uno strumento parallelo a
quello del catalogo, e la chiave dell'API fuori dal suo posto; paletto del
coordinatore); metterle dentro l'app come file (un megabyte di punti nel
bundle, e chi è vicino a quelle città senza toccare la tessera non le
vedrebbe); una fila orizzontale di disegni; i post che si aprono sulla
mappa da «Explore» prima che lo facciano in «Feed».

**Conseguenze**: `WhileDrawing` dipende da `FeedPost`. Con la mappa di
TASK-162 (ADR-0131) i disegni in «Explore» hanno anche loro la foto della
mappa sotto la linea: la chiede la scheda, la fa la pagina nascosta di
«Feed», che resta montata accanto a «Explore»; visto in un simulatore
senza aver mai aperto «Feed». Il feed vero (TASK-118) deciderà se qui
restano gli esempi o entrano i disegni degli iscritti. **In due PR**, per
richiesta dell'utente (2026-10-02, «pubblica intanto la parte dei post
sul telefono»): prima l'attesa, poi il catalogo. Una città in evidenza
ora mostra «Best near you» con tre righe invece di «EXAMPLES IN …»: senza
le alternative A · B · C degli esempi (ADR-0126), che il catalogo non
tiene. **Per vederle nell'app pubblicata va aggiornato `catalog/` sul
server** e riavviata l'API (`DEPLOY.md` F.12): con l'ok dell'utente.

## ADR-0133 — La schermata della corsa: gli stessi numeri con un percorso e senza, e una freccia di direzione dalla traccia
**Stato**: Attiva · 2026-10-02 · chiesto dall'utente («mi devi dire la
andatura media, chilometri fatti, tra quanti metri devo girare, ci deve
essere la freccia di indicazione dove sto andando… così è troppo
semplice»); il cosa scelto dall'utente su un mockup in chat («sì, fallo»),
il come deciso dall'agente su delega dell'utente (TASK-164).

**Contesto**: la corsa con un percorso mostrava la svolta e i km rimasti,
ma né i km fatti né il passo; la corsa senza percorso (ADR-0122) mostrava
km, tempo e passo medio, e nient'altro. Senza percorso le svolte non
esistono: non c'è una linea da seguire. La mappa non sapeva disegnare un
segnaposto orientato, e l'app non leggeva la direzione.

**Decisione**:
- **Un pannello solo per le due corse** (`RunPanel.tsx`), sotto la mappa:
  km fatti in grande, «Avg pace», «Pace now», «Time». Con un percorso,
  accanto ai km, «… to go» e «about … min», e la barra del percorso fatto;
  senza, «Last km» con il passo dell'ultimo km intero.
- **I km fatti sono quelli della traccia**, anche con un percorso: è
  quello che si è corso davvero, lo stesso numero della fine della corsa
  (ADR-0093). I km rimasti e la barra vengono invece dalla posizione lungo
  il percorso (`alongM`).
- **«Pace now» è il passo degli ultimi 200 m di traccia**, fino a adesso:
  abbastanza lungo da non seguire gli errori del GPS, abbastanza corto da
  mostrare un cambio di ritmo. Il tempo va avanti fra una posizione e
  l'altra, quindi da fermi il passo rallenta, e oltre 20:00 /km sparisce:
  è stare fermi, non correre. Come il passo medio, compare dopo 100 m.
- **«about 17 min» è i km rimasti al passo medio fin lì**: una stima, e lo
  dice. Il tempo conta anche le soste, come prima (ADR-0091).
- **La direzione viene dalla traccia, non dalla bussola**: il verso dalla
  posizione di 10 m prima all'ultima (`headingDeg`). Funziona uguale su
  ogni telefono e nei test; la bussola del telefono sbaglia in tasca e
  vicino al metallo, e `coords.heading` del GPS manca da fermi. Una sola
  posizione di distanza (5 m) sta dentro l'errore del GPS e la freccia
  tremerebbe. Da fermi la direzione resta l'ultima.
- **La freccia sulla mappa**: `follow` porta `heading` (gradi interi, o
  null), e la pagina mette al posto del segnaposto una freccia chiara,
  `rotationAlignment: "map"`, con il bordo scuro per leggersi sul giallo.
  `stopFollow`, mandato quando la corsa finisce, rimette il segnaposto.
  La mappa resta col nord in alto.
- **Senza percorso, la partenza al posto della svolta**: freccia, distanza
  in linea d'aria e «Your start, in a straight line». È l'unica direzione
  che una corsa senza percorso può dare senza inventare niente, e dice
  quanto manca per tornare. La freccia è relativa a chi corre (in su =
  davanti), come le frecce delle svolte; è azzurra, il colore della
  partenza (ADR-0040), non gialla (ADR-0046). «In a straight line» è
  scritto: non è la strada da fare.
- **Il giallo della barra è quello del percorso** (ADR-0046): la barra è
  il percorso, per quanto è stato corso. I km restano bianchi.
- **`useNavigation` dà la traccia** nello stato, come `useFreeRun`: il
  registratore parte prima del primo stato. Nessuna modifica a
  `trackStore.ts`, `freeRun.ts`, `navigator.ts`.

**Alternative scartate**: girare la mappa nel verso di marcia (la figura
del percorso si legge col nord in alto, e i gesti della mappa vanno
ripensati); la bussola del telefono (`expo-sensors`: dipendenza nuova, e
inaffidabile in corsa); il passo istantaneo fra due posizioni (salta di
minuti con un errore di pochi metri); il nome della via in cui si è, senza
percorso (vuole l'API o i dati delle strade sul telefono); tenere due
schermate diverse per le due corse.

**Conseguenze**: il pannello è più alto della riga di prima, e la mappa
più bassa di circa 90 punti. «Pause», lo «Stop» da tenere premuto e la
voce a ogni km nella corsa con percorso restano fuori: task a parte, se
l'utente li vuole. La freccia compare dopo i primi 10 m. Chi preme «Start»
lontano dall'inizio del percorso («Start here») ha nei km e nel passo anche
il tratto per arrivarci: la traccia parte con «Start» (ADR-0091), e i km
rimasti no. Provato nel simulatore con un GPS simulato, nelle due corse;
camminando con l'iPhone no.
## ADR-0135 — «Explore» a schede: due per riga, e i filtri in una riga sola
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («Pagina
Explore a schede», fra le proposte del canvas); il come deciso dall'agente
su delega dell'utente (TASK-167).

**Contesto**: in «Explore» ogni percorso era una riga con una miniatura da
72 × 60: il disegno, che è il motivo per cui si sceglie un percorso, era la
cosa più piccola della riga. I filtri erano due file di chip, una sopra
l'altra, prima dell'elenco.

**Decisione**:
- **Una scheda per percorso** (`src/explore/RouteCard.tsx`), due per riga:
  il disegno in alto, largo quanto la scheda e alto due terzi, poi forma e
  km, poi città e distanza. La somiglianza sta in un angolo del disegno.
  Il disegno è fatto come le miniature, una `View` per tratto
  (`thumbSegments`), con la linea da 3: nessuna dipendenza nuova.
- **La larghezza viene dalla finestra**, non da una misura dopo il primo
  disegno: i tratti si calcolano in punti, e la scheda non salta.
- **Gli esempi di una città sono le stesse schede**: una non ancora
  disegnata tiene il posto del disegno vuoto e dice «Drawing…» o «Next»,
  e non è un pulsante.
- **I filtri in una riga** (`src/explore/RouteFilters.tsx`): un pulsante
  per filtro, che dice cosa tiene («Shape: Star ▾»); le scelte si aprono
  sotto la riga, lì dove sono, e una scelta le richiude. Niente menu a
  comparsa né fogli: non servono librerie, e la pagina non perde il posto.
  «▾» e «▴» sono caratteri, come «←» e «↺» nel resto dell'app.
- **«Scelto» è il bordo chiaro**, non il fondo chiaro di prima: è il modo
  delle tessere delle forme, e il giallo resta del percorso.
- **Due filtri che insieme non lasciano niente lo dicono**, invece di una
  pagina vuota.

**Scartate**: una colonna sola di schede larghe (metà dei percorsi a
schermo); la foto della mappa sotto il disegno come in «Feed» (ADR-0131:
una foto per scheda, con decine di percorsi a città); un menu a comparsa
per i filtri; tenere le due file di chip.

**Conseguenze**: il componente `RouteThumb` non è più usato da «Explore»
(resta ai suoi test; `thumbSegments`, nello stesso file, lo usano le schede
e «Feed»); `Chips` non c'è più. Le righe che scorrono di lato
dentro la pagina restano due, le città e le scelte di un filtro aperto. Da
provare con il dito sull'iPhone.

## ADR-0136 — Gli esempi di una città restano sull'API una volta disegnati
**Stato**: Attiva · 2026-10-02 · chiesto dall'utente («in Explore deve
essere molto più veloce quando seleziono una nuova città, gli esempi in
Rovereto»); il come deciso dall'agente su delega dell'utente (TASK-168).
Allarga ADR-0116, che aveva scartato «salvare gli esempi nel catalogo
dell'API per tutti».

**Contesto**: in una città senza percorsi consigliati l'app chiede cuore,
cerchio e stella da 5 km dal centro, uno alla volta (ADR-0116). Misurato
il 2026-10-02: sul Mac libero 1,2–2,4 s di calcolo l'uno, sul server circa
18 s (5 km a Trento), più il download della zona dove manca. L'app chiede
lo stato ogni 2 s fissi: nel registro del Mac i tre esempi di Pergine,
calcolati in 2 s l'uno, arrivano a 4 s l'uno dall'altro. E ogni telefono
rifà gli stessi tre calcoli: la richiesta di una città è uguale per tutti,
e il motore dà lo stesso percorso.

**Decisione**:
- **Un percorso disegnato dal centro di una città resta in un file**
  (`shaperoute_api/route_store.py`), e la stessa richiesta riceve il job
  già `done` nella risposta al `POST /route-jobs`. Nessun contratto nuovo:
  l'app pubblicata legge già un job `done` alla prima risposta, e ci
  guadagna senza essere ripubblicata.
- **Solo dal centro di una città.** Tenere **ogni** percorso è la scelta
  dell'utente di ADR-0086, ed è di TASK-092: nel database, con le regole
  sui dati personali di TASK-110 (la partenza è spesso dove abita chi
  chiede) ancora da scrivere. Qui non la si anticipa: su disco vanno solo
  i percorsi che partono da un centro, che non è la posizione di nessuno
  (come per gli eventi di ADR-0101). I centri sono quelli che l'API stessa
  ha dato con `GET /cities` e, per le sole città, con `GET
  /city-suggestions`; un posto suggerito può essere la via di qualcuno, e
  resta fuori. Una partenza è un centro nello stesso quadrato di circa
  10 m (4 decimali, il `cityKey` dell'app). Le immagini mai.
- **Come si lega ad ADR-0086 / TASK-092.** Questo è una memoria delle
  risposte, non l'archivio dei percorsi: non sceglie i migliori, non
  propone niente, e si può cancellare senza perdere nulla. Non è un
  secondo archivio accanto a quello di TASK-092, che in `main` oggi ha
  solo i documenti (#118, #120). È fatto perché TASK-092 lo prenda:
  `RouteJobs` parla a un `KeepsRoutes` con due metodi (`get`, `put`), e
  `put` è chiamato per **ogni** percorso finito, nel punto dove TASK-092
  deve salvare; oggi `RouteStore` scarta quelli che non partono da un
  centro. Una versione sul database dello stesso `KeepsRoutes` salva
  tutto e risponde agli esempi dalla stessa tabella. Ogni file porta già
  quello che TASK-092 vuole di un percorso (la richiesta, i punti, la
  distanza, la somiglianza, le alternative, la data) più l'impronta del
  motore, e si importa così com'è.
- **Non è il catalogo.** Il catalogo dei percorsi consigliati resta
  guardato a occhio (ADR-0097). Qui c'è solo quello che l'API risponderebbe
  comunque alla stessa richiesta, senza rifare il calcolo.
- **Un motore cambiato ridisegna**: nel nome del file entra un'impronta dei
  `.py` e `.json` di `route_engine`, dal contenuto e non dalle date (una
  immagine Docker rifatta con lo stesso codice tiene quello che ha). Chi
  prova una modifica al motore sull'API del Mac non riceve percorsi vecchi.
  Dopo 30 giorni si ridisegna comunque: la zona può essere più nuova.
- **In `routes/` dentro la cartella dei grafi**: sul server `data/cache` è
  già montata fuori dal contenitore, e `deploy/compose.yaml` (di TASK-122)
  non si tocca. I file dei grafi si cercano per nome (`foot_*`), la
  cartella non li disturba. Al massimo 3000 percorsi, circa 90 kB l'uno.
- **Anche un job annullato si tiene**, se il motore l'ha finito: chi cambia
  città mentre una si disegna la trova pronta tornando.
- **`draw_examples`**: un comando che fa il primo telefono per un elenco
  di città, contro un'API accesa. Con le zone già sul server (ADR-0119)
  rende gli esempi immediati dal primo utente.
- **L'app chiede lo stato più spesso all'inizio** (`pollDelay` in
  `routes.ts`): ogni 0,5 s nei primi 6 s, ogni secondo fino a 20 s, poi
  ogni 2 s come prima. Il controllo è un GET senza limite (ADR-0076) e la
  risposta di un job non finito è di poche decine di byte. Vale per ogni
  percorso.

**Alternative scartate**: tenere già qui ogni percorso, da qualsiasi
partenza (è ADR-0086, che aspetta il database di TASK-092 e le regole di
TASK-110); un campo `example` nella richiesta, messo dall'app
(contratto nuovo, app da ripubblicare, e la riservatezza affidata al
telefono); un endpoint che disegni le tre forme insieme (ADR-0116: stesso
effetto, contratto nuovo); i tre esempi chiesti insieme (l'API ha due
thread e il motore usa già più processi: sul server si pesterebbero i
piedi); il database (sul Mac l'API gira senza; un file basta); tenerli
solo in memoria (un riavvio li perde, e sul server l'API si riavvia a ogni
aggiornamento); disegnare gli esempi già quando la città compare fra i
suggerimenti (calcoli per città non scelte, ADR-0116).

**Conseguenze**: aspetta solo il primo telefono in una città; sul Mac la
seconda richiesta dei tre esempi di Trento risponde in 0,0 s invece di
10–14 s. Una città **nuova per tutti** costa come prima: per quelle servono
le zone sul server e `draw_examples`, che toccano il server e aspettano
l'ok dell'utente. Il tempo di un esempio sul server (18 s contro 2 del
Mac) resta da capire dai log del server. Negli eventi delle ricerche una
risposta tenuta conta come un percorso da 0 ms. In «Explore» i disegni del
feed («MEANWHILE, FROM THE FEED», ADR-0132) compaiono anche quando gli
esempi arrivano subito: da rivedere in un task dell'app.

## ADR-0138 — Niente «Run with Strava»: da un percorso si esce con il GPX
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** («L'impostazione
run with strava la vorrei togliere»); il come deciso dall'agente su delega
dell'utente (TASK-170). Supera ADR-0106.

**Contesto**: «Run with Strava» (ADR-0106) era un pulsante sotto «Export
GPX» in ogni scheda di un percorso. Strava non lascia creare percorsi ad
altre app, quindi il pulsante apriva solo una spiegazione in tre passi:
salvare il GPX, importarlo a mano dal sito di Strava, seguirlo dall'app
Strava. L'utente non lo vuole più.

**Decisione**: il pulsante e la sua scheda si tolgono dalle tre schede
(percorso disegnato, di «Explore», a tema), e `apps/mobile/src/strava/` si
cancella. Per portare un percorso in un'altra app resta «Export GPX», che
già apre il foglio di condivisione. Il segnale `route_chosen` non cambia:
il pulsante di Strava contava come `via: "gpx"`, lo stesso valore di
«Export GPX».

**Alternative scartate**: tenere il codice e nascondere il pulsante dietro
un interruttore (codice morto da mantenere e da provare; torna con git se
serve); tenere una riga di aiuto su Strava vicino a «Export GPX» (non
chiesta: è una scelta di prodotto).

**Conseguenza**: una riga in meno in ogni scheda di un percorso. Fuori
dall'app non c'era niente da togliere: ADR-0106 non aveva account
collegati, token, chiavi né parti nell'API o sul server. Se Strava aprirà
la creazione di percorsi via API, si riparte da ADR-0106.

## ADR-0137 — La corsa: conto alla rovescia, due pagine, pausa, «Stop» da tenere premuto e tutti i numeri che il telefono sa misurare
**Stato**: Attiva · 2026-10-02 · chiesto dall'utente con una registrazione
di Nike Run Club («voglio che sia simile a questa, sempre con il nostro
stile, ma deve esserci tutto: metriche; mancano battito, musica») e poi
precisato («in tutti i casi tieni dislivello e passo dell'ultimo km;
dividi in due schermate, una con meno dati e la mappa con le indicazioni,
una con solo i dati, con uno swipe»); il come deciso dall'agente su delega
dell'utente (TASK-169). Aggiorna ADR-0133 (il pannello), ADR-0091 (la
traccia), ADR-0122 (la corsa senza percorso).

**Contesto**: la corsa di TASK-164 aveva un pannello solo sotto la mappa e
«Stop» da toccare; il tempo contava le soste, non c'erano dislivello,
calorie né i km uno per uno, e la corsa partiva al tocco, senza un attimo
per mettere via il telefono. I tre seguiti di TASK-164 («Pause», «Stop» da
tenere premuto, la voce a ogni km con un percorso) aspettavano l'utente.

**Decisione**:
- **Due pagine, non tre**: «Map» (mappa, banner, tre numeri: km, passo di
  adesso, tempo) e «Data» (tutti i numeri, i km uno per uno, gli
  interruttori, nessuna mappa). Nike ne ha tre («Controls», numeri,
  «Splits») perché non ha una mappa da seguire: qui la mappa con le
  svolte è la pagina principale, e l'utente ha chiesto due schermate.
- **«Data» scorre sopra «Map»**, da destra, in un `Modal` trasparente con
  la sua animazione; il dito la trascina via verso destra. Così la mappa
  resta una sola (`MapView` in `App.tsx`, mai ricaricata) e `App.tsx` non
  cambia: la scheda (`RunCard`) vive dentro `FreeRunCard` e
  `NavigationCard`, che tengono le loro props. Lo swipe verso «Data» parte
  dalla scheda, perché sulla mappa il dito sposta la mappa. I due nomi in
  fondo fanno lo stesso con un tocco.
- **I comandi della corsa in un modulo** (`runControl.ts`), uno per volta
  come il file della corsa: conto alla rovescia, «Pause», «Resume», pausa
  da sola, «Voice». Le schermate premono lì e i due registratori
  (`useFreeRun`, `useNavigation`) eseguono: la pausa non poteva passare
  dalle props senza toccare `App.tsx`.
- **La pausa sta nella traccia** (`Track.pauses`, da quando a quando): il
  tempo della corsa è quello passato meno le pause, ovunque (orologio,
  passi, ultimo km, splits, voce, fine corsa). In pausa le posizioni non
  entrano nella traccia; la prima dopo «Resume» ha `gap` e non aggiunge
  metri. Si scrive nel file subito, così regge alla chiusura dell'app.
- **«Keep running» è una pausa**: il tempo fra «Stop» (o la chiusura
  dell'app) e la ripresa non conta più, e la linea non si unisce. Prima
  contava: era il difetto annotato in ADR-0091.
- **La pausa da sola**: dieci secondi senza una posizione tenuta. Le
  posizioni arrivano ogni 5 m, quindi chi cammina piano ne dà una ogni
  4–5 secondi; dieci stanno sopra. La pausa parte da quel momento, non
  dall'ultima posizione: l'orologio non torna indietro sotto gli occhi di
  chi lo guarda, al costo di dieci secondi contati per sosta. Finisce con
  la prima posizione che si sposta di 5 m, che tiene i suoi metri. Accesa
  di default, come nel riferimento; si spegne da «Data».
- **«Stop» solo dalla pausa, e tenuto un secondo**: una mano che sfiora
  lo schermo in corsa non chiude più la corsa. Prima della prima posizione
  resta lo «Stop» da toccare, e all'arrivo «Finish».
- **Il conto alla rovescia è tempo, non una schermata da aspettare**:
  `runControl` lo chiude da solo dopo 3 secondi; lo schermo lo mostra
  soltanto. Il GPS parte prima, la traccia dopo: l'ultima posizione vista
  durante il conto diventa la prima della corsa, con l'ora in cui il conto
  finisce. Senza, chi parte da fermo non avrebbe una posizione fino ai
  primi 5 m (il GPS ne dà una ogni 5 m) e l'orologio aspetterebbe.
- **Dislivello dalla quota del GPS** (`coords.altitude`, già nel
  permesso): la somma delle salite di almeno 3 m, perché da fermi la quota
  oscilla di qualche metro. Il barometro sarebbe più preciso ma è una
  dipendenza nuova (`expo-sensors`).
- **Calorie stimate**: 1,036 kcal per kg e per km, con 70 kg finché il
  profilo non ha il peso (TASK-116 e seguiti). È una stima e come tale va
  letta; il numero giusto arriva col peso.
- **La voce a ogni km anche con un percorso**, dopo la svolta se cadono
  insieme. «Voice» spenta toglie tutta la voce e lascia la vibrazione.
- **Niente giallo su «Pause»**: è chiaro; il giallo resta del percorso e
  dell'azione principale (ADR-0046), che in pausa è «Resume». «Stop» si
  riempie di arancio (`warning`).
- **Un token nuovo**, `fontSize.hero` (88): i km a braccio teso.

**Battito e musica, fuori da qui**. L'utente vuole il battito sia da un
sensore Bluetooth sia da Apple Watch, e la casella solo quando un sensore
è collegato. Il telefono non lo misura: il sensore Bluetooth vuole
`react-native-ble-plx`, Apple Watch vuole HealthKit e un'app per
l'orologio; tutti e due solo in una build propria, non in Expo Go, dove
l'utente prova oggi. Finché non c'è un sensore la casella non c'è, quindi
qui non cambia niente da vedere. La musica (aprire Spotify o Apple Music,
o i comandi nella schermata) aspetta la risposta dell'utente su quale app
usa. Sono task a parte (`tasks/TASK-169.md`, «Fuori scope»). La risposta è
arrivata lo stesso giorno, «uso Spotify»: ADR-0141 (TASK-173).

**Alternative scartate**: tre pagine come Nike (la mappa finirebbe dietro
un pulsante); un pager vero con la mappa dentro (vuole riscrivere
`App.tsx` e il `MapView`, occupati da altri task, e lo swipe sulla mappa
resterebbe della mappa); la pausa da sola retroattiva dall'ultima
posizione (più giusta di dieci secondi, ma l'orologio salta indietro); la
pausa come stato delle schermate e non della traccia (si perdeva alla
chiusura dell'app, e ogni numero avrebbe dovuto sottrarla per conto suo);
la cadenza (vuole il contapassi, `expo-sensors`).

**Conseguenze**: il tempo di una corsa è il tempo senza le pause, anche a
fine corsa e nella voce; il punteggio non cambia (usa i punti, non il
tempo). La linea sulla mappa unisce ancora con un tratto dritto il punto
della pausa e quello della ripresa: i metri non contano, il segno sì. Un
tunnel o un GPS che si perde più di dieci secondi mettono in pausa la
corsa, se «Auto-pause» è accesa. Con «Data» aperta i pulsanti esistono due
volte nell'albero (sotto e sopra): è voluto, la scheda sotto si vede
mentre la pagina scorre. Provato nel simulatore con un GPS simulato, nelle
due corse: conto alla rovescia, «Map», «Data», pausa a mano e da sola,
splits. Lo swipe col dito e «Stop» tenuto premuto no (il simulatore non si
poteva toccare): restano per l'iPhone.

**Aggiornamento 2026-10-02 (TASK-186)**: **scelta dell'utente** per il
cosa («ingrandiscimi pulsante map e data sotto»); il come deciso
dall'agente su delega dell'utente. «Map» e «Data» erano due scritte da 13
punti con un trattino sotto, larghe quanto la parola. Ora sono due
pulsanti che si dividono la larghezza della scheda, alti 56 punti
(`MIN_TAP_SIZE` più un passo), con la scritta da 16 in grassetto; la pagina
aperta ha la superficie più chiara e il bordo, come `Segmented` nel resto
dell'app. Restano due `tab` per VoiceOver. Scartati: il giallo per la
pagina aperta (è del percorso); solo la scritta più grande (il bersaglio
del dito restava stretto); riusare `Segmented` (i suoi pulsanti sono
`button`, e la sua altezza serve ad altre schermate). Conseguenza: la
scheda sotto la mappa è più alta di circa 36 punti, tolti alla mappa. Visto in
un simulatore con un GPS simulato, sulle due pagine.

## ADR-0139 — «Favorites»: una copia del percorso, legata all'account
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («mettere
nei preferiti i percorsi che gli utenti vedono», con la voce «Favorites» nel
profilo di chi è entrato); il come deciso dall'agente su delega dell'utente
(TASK-171).

**Contesto**: un percorso che piace oggi si perde: quello disegnato sparisce
con la richiesta successiva, quello di «Explore» va ricercato fra le schede.
L'utente vuole ritrovarli nel profilo, «una volta loggati»: quindi stanno
con l'account, sul server, non sul telefono.

**Decisione**:
- **Un preferito è una copia intera del percorso** nella tabella `favorites`
  (migrazione `0002`): la linea, cosa disegna, le due distanze, la
  somiglianza, la città. Non un rimando: un percorso disegnato non è
  salvato da nessun'altra parte (TASK-092 non c'è ancora), e un percorso
  del catalogo può cambiare o sparire quando il catalogo si rigenera.
- **La chiave la fa l'app dalla linea** (`favoriteKey`: due hash FNV-1a sui
  punti arrotondati a cinque decimali, 16 cifre esadecimali), unica per
  account. Così il cuore sa se il percorso sulla mappa è già tenuto senza
  chiedere niente, lo stesso percorso è un preferito solo comunque ci si
  arrivi, e `PUT /me/favorites/{key}` è idempotente. L'API non ricalcola la
  chiave: è un nome dentro un account, non una prova.
- **La linea in PostGIS** (`geometry(LineString, 4326)`), come `DATABASE.md`
  vuole per ogni geometria; è la prima, e la migrazione crea l'estensione.
  Torna cifra per cifra (`ST_AsGeoJSON(line, 15)`), perché la chiave si
  rifà sui punti.
- **L'elenco è leggero**: 64 punti di anteprima per preferito, come i
  percorsi consigliati; la linea intera solo aprendo un preferito.
- **Al massimo 200 preferiti per account**, detto con `invalid_request` e
  un messaggio che l'app mostra: niente codice d'errore nuovo, che avrebbe
  toccato `schemas.py` e `shared-types` mentre altri task li usano.
- **Il cuore sta sulla mappa**, di fronte a «←», non dentro le schede del
  percorso: vale per i tre modi di arrivare a un percorso con un solo
  pezzo, e non tocca `RoutePanel`, `ExploredCard` e `ThemedCard`, che
  TASK-170 ha cambiato lo stesso giorno. È un carattere («♡», «♥»), come
  «←»: l'app non ha icone. Non è giallo.
- **Cambia subito e torna indietro se l'API rifiuta**: il modo già scritto
  per il like (TASK-119).
- **Un preferito aperto è un percorso di «Explore»**: la stessa scheda, lo
  stesso «Start» e lo stesso export, senza un'altra schermata. Per un
  preferito senza forma né parola (una foto) l'export manda come contorno
  la linea stessa, ridotta a 100 punti: il contorno vero il telefono non
  lo ha più.
- **Senza account il cuore porta a «Profile»** e tiene il percorso appena
  si entra; non ci sono preferiti senza account.
- **`Account.sessionEnded`**: una richiesta dei preferiti che trova la
  sessione finita fa uscire l'app, come `UI.md` già diceva («a una
  richiesta»).

**Scartate**: tenere i preferiti sul telefono (non seguono l'account);
salvare solo l'id del catalogo (non vale per i percorsi disegnati); far
calcolare la chiave all'API (l'app dovrebbe aspettarla per riempire il
cuore); il cuore su ogni scheda di «Explore» e di «Feed» (dopo, se serve: i
file sono di altri task); una linea in `jsonb` (contro `DATABASE.md`).

**Conseguenze**: il database tiene linee che spesso partono vicino a casa
di chi le ha disegnate; le vede solo il loro account e spariscono con lui
(`UI.md`, «Cosa esce dal telefono»). L'app chiede l'elenco a ogni apertura
con un account: una richiesta in più. Sul server la migrazione parte al
primo avvio dell'API nuova (`DEPLOY.md` F.12). «My activities» (TASK-172,
ADR-0140) userà la stessa pagina di «Profile» e la tabella `runs`.

## ADR-0141 — La musica nella corsa: «Music» apre Spotify, Sgrava non suona niente
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa (la
musica nella corsa, chiesta con ADR-0137; «uso Spotify»); il come deciso
dall'agente su delega dell'utente (TASK-173). Aggiorna ADR-0137 (la musica
era rimasta fuori).

**Contesto**: il riferimento dell'utente (Nike Run Club) ha «Connect
Music». La corsa di TASK-169 non ha niente per la musica; l'utente prova in
Expo Go, dove non entrano moduli nativi nuovi.

**Decisione**:
- **Un pulsante che apre l'app di musica, non un lettore.** «Music» apre
  Spotify con il suo link (`spotify:`): l'app si apre dove era rimasta, e
  si torna a Sgrava da soli. Sgrava non suona, non mette in pausa e non sa
  cosa suona. Nessuna dipendenza: `Linking` di React Native.
- **Si apre, non si chiede prima.** `canOpenURL` risponde no per ogni
  schema che la build non dichiara (`LSApplicationQueriesSchemes`), ed
  Expo Go non dichiara i nostri: direbbe «Spotify non c'è» anche quando
  c'è. `openURL` invece non vuole dichiarazioni e fallisce da solo se
  l'app manca (visto nel simulatore: «Unable to open URL: spotify:»).
- **Senza Spotify, la sua pagina nello store** del telefono (App Store,
  Google Play; altrove `open.spotify.com`). Se non si apre nemmeno quella,
  niente: nessun avviso sopra una corsa.
- **Di fronte a «Pocket»**, nel posto vuoto accanto a «Pause», quindi su
  «Map» e su «Data» con un pezzo solo. Solo mentre si corre: in pausa la
  scheda ha «Stop» e «Resume» ed è già alta, e prima della prima posizione
  e all'arrivo c'è un pulsante solo.
- **«Music» non mette in pausa la corsa.** Chi sceglie una playlist
  correndo non vuole trovare la corsa ferma.
- **Solo Spotify**, scritto in un file (`music.ts`): è l'app dell'utente.
  Un'altra app di musica è un altro link nello stesso file.

**Scartate**: brano, pausa e avanti dentro Sgrava adesso (vogliono un'app
Spotify Developer dell'utente con Premium, l'accesso al conto Spotify con
tre dipendenze nuove, e in sviluppo valgono per 5 persone aggiunte a mano:
è la domanda aperta in `tasks/TASK-173.md`); `canOpenURL` e il pulsante
nascosto senza Spotify (in Expo Go sarebbe sempre nascosto); un avviso
«Spotify is not installed» (un testo in più da leggere correndo; lo store
dice la stessa cosa); il link `https://open.spotify.com` per tutti (senza
l'app apre il sito in Safari, non lo store); la scelta fra più app di
musica (nessuno l'ha chiesta).

**Conseguenze**: mentre Spotify è davanti, Sgrava non registra (registra
solo in primo piano): i secondi passati a scegliere la musica sono un buco
nella traccia, come ogni uscita dall'app. Come si mescolano la voce delle
svolte e la musica lo decide iOS, perché l'app non imposta niente
dell'audio: se la voce ferma la musica o non si sente, serve `expo-audio`
(dipendenza nuova, task a parte). Tutte e due le cose si vedono solo
sull'iPhone e sono fra le prove di `tasks/TASK-173.md`. Con una build
propria si potrà dichiarare lo schema e mostrare «Music» solo a chi ha
Spotify.

## ADR-0143 — La mappa senza pulsanti di zoom: si ingrandisce solo con le dita
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** («togli la
possibilità di zumare in alto a destra […] si potrà zumare solamente con
il touch»); il come deciso dall'agente su delega dell'utente (TASK-175).

**Contesto**: la pagina della mappa aveva il `NavigationControl` di
MapLibre, due pulsanti «+» e «−» in alto a destra. Su un telefono
ripetono un gesto che si fa già con due dita, e occupavano l'angolo: il
cuore dei preferiti (ADR-0139) stava sotto di loro, più in basso di «←».

**Decisione**: la pagina non crea più il controllo. Lo zoom resta quello
dei gesti di MapLibre, che la pagina non tocca: due dita, doppio tocco.
Il cuore dei preferiti sale nell'angolo, alla stessa altezza di «←»
(`insets.top` più lo stesso margine).

**Alternative scartate**: nascondere i pulsanti con il CSS (il controllo
resterebbe nella pagina, da mantenere); toglierli solo dall'anteprima di
un percorso e tenerli in corsa (la pagina è una sola, e in corsa la mappa
segue la posizione da sé); spegnere anche la rotazione con due dita (non
chiesto).

**Conseguenza**: chi non può fare il gesto con due dita ha il doppio
tocco per avvicinare. I pulsanti mancano apposta: un test della pagina
controlla che il controllo non torni e che il gesto non venga spento.

## ADR-0142 — La mappa anche sotto le schede di «Explore», con un credito solo
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («nella
sezione explore, quando ci sono i vari sample, mettimi sotto anche la
mappa […] con scritto il nome del paese»); il come deciso dall'agente su
delega dell'utente (TASK-174). Cambia un punto di ADR-0135, che aveva
scartato la foto della mappa nelle schede.

**Contesto**: da TASK-167 un percorso di «Explore» è una scheda larga mezzo
telefono, la linea gialla su un fondo vuoto. In «Feed» sotto la linea c'è
la foto della mappa (ADR-0131), e l'utente la vuole anche qui. ADR-0135
l'aveva scartata per il numero: una foto per scheda, decine di percorsi a
città.

**Decisione**:
- **Le stesse foto di «Feed»**: `RouteCard` con `map` chiede la foto a
  `useFeedMap` e la mette sotto la linea. Le fa la pagina nascosta di
  «Feed», che il `Pager` tiene montata accanto a «Explore»: nessuna pagina
  MapLibre in più. Misurato sul simulatore: 27 foto in 1,6 s con le tile
  della zona già scaricate, perché i percorsi di una città stanno sulle
  stesse tile.
- **La foto ha il nome di ciò che inquadra** (centro e zoom di
  `lineCamera`), non l'`id` del percorso: un esempio ridisegnato tiene il
  suo `id` e può cambiare linea, e due percorsi con lo stesso riquadro
  hanno la stessa foto.
- **`map` va chiesto**: lo passano le schede di «Explore» (esempi e «Best
  near you»). «Favorites» usa lo stesso componente e resta com'è.
- **Il credito una volta sola, accanto alle schede**, in una riga: «Maps:
  OpenFreeMap © OpenMapTiles · Data from OpenStreetMap». Sopra le schede di
  «Best near you», che sono molte e scorrono; sotto quelle degli esempi,
  che sono tre. Scritto su ogni foto, come in «Feed», su una scheda di 170
  punti andava a capo, perdeva «Data from OpenStreetMap» e copriva i nomi
  dei paesi, che sono ciò che l'utente ha chiesto.
- **Il nome del paese anche in parole** negli esempi: la scheda pronta lo
  dice sotto forma e km, come le schede di «Best near you» dicono già la
  città. Sulla mappa il nome c'è quando il centro del paese cade nel
  riquadro, cioè quasi sempre, non sempre.

**Scartate**: una pagina delle foto anche in «Explore» (due pagine
farebbero la stessa foto due volte); il credito su ogni foto con un
carattere più piccolo (sotto gli 11 punti non c'è un token, e resta sopra
i nomi); un'etichetta con il nome del paese disegnata sopra la foto
(doppia, quando la mappa lo scrive già).

**Conseguenze**: aprire «Explore» chiede a OpenFreeMap le tile delle zone
dei percorsi mostrati (`UI.md`, «Cosa esce dal telefono»). Le foto restano
in memoria finché l'app è aperta, una per scheda vista; cambiata città, le
foto già in coda per quella di prima si fanno lo stesso. Fuori dal `Pager`
(«Explore» aperta con `onBack`) la pagina delle foto non c'è e le schede
restano senza mappa.

## ADR-0147 — L'animazione all'avvio: un componente sopra l'app, il cuore del video sul giallo
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («il
logo e l'animazione che deve durare almeno due secondi quando apri
l'applicazione: un cuore che si disegna su uno sfondo giallo, come il
video»); il come deciso dall'agente su delega dell'utente (TASK-179).

**Contesto**: la schermata di avvio di ADR-0134 è nativa, ferma, e si vede
solo in una build propria. L'utente apre l'app in Expo Go: non vedeva né il
logo né un'animazione. ADR-0134 aveva scartato un componente React perché
prima che parta il JavaScript lo schermo resta vuoto e perché toccava
`App.tsx`; per un'animazione il componente è l'unica strada, e le due cose
stanno insieme: la schermata nativa copre l'attesa del JavaScript,
l'animazione viene dopo.

**Decisione**:
- **Un componente sopra l'app**, `src/intro/LaunchIntro.tsx`, montato da
  `src/intro/Root.tsx`, che `index.ts` registra al posto di `App`.
  `App.tsx` non cambia. L'app parte subito sotto: posizione, mappa e prime
  richieste si caricano mentre il cuore si disegna.
- **Il cuore è quello del video**: il percorso a cuore di Milano da 10 km
  del catalogo seme (`catalog/seed/milano.json`), semplificato a 8 m, 99
  punti in `src/intro/heartLine.ts`. È un percorso vero del Route Engine,
  con le sue strade: il segno che dice cosa fa l'app.
- **I tempi**: 0,35 s il giallo `accent` riempie lo schermo dal centro,
  1,6 s il cuore si disegna, 0,45 s resta, 0,3 s l'animazione sfuma
  sull'app. Il giallo si vede 2,4 secondi: sopra i due chiesti, sotto i tre
  che a ogni apertura peserebbero.
- **Nero su giallo**: la linea, la penna e il logo sono `onAccent`; il logo
  è `assets/splash-logo.png` (giallo) colorato con `tintColor`. Il punto di
  partenza è chiaro con il bordo scuro, come sul logo e sulla mappa.
- **Senza SVG e senza dipendenze**: la linea è fatta di tratti, View
  sottili e girate come in `RouteThumb`; ognuno compare al suo momento da
  un solo valore animato sul thread nativo. I tratti lunghi sono tagliati
  (al più 1/110 della linea) perché la linea non salti.
- **La durata la tiene un timer**, non la fine dell'animazione: con le
  animazioni spente sul telefono il disegno finisce subito, e il cuore deve
  restare comunque il suo tempo. È anche ciò che rende il test
  deterministico (sotto jest le animazioni finiscono all'istante).
- **Una volta per apertura**: non si salta con un tocco, e finché c'è
  prende i tocchi.

**Scartate**: una riga in `App.tsx` (è di TASK-172 e TASK-174, e non
serve); `react-native-svg` o Lottie (dipendenze nuove per un disegno che
l'app sa già fare); una pagina in una WebView (parte tardi e lampeggia); un
cuore geometrico pulito (non è «come il video», e non dice che il disegno
è fatto di strade); `preventAutoHide` di `expo-splash-screen` per tenere
la schermata nativa (resta ferma, e in Expo Go non c'è).

**Conseguenze**: ogni apertura costa 2,7 secondi prima di poter toccare
l'app, che intanto si carica. In Expo Go prima dell'animazione resta la
schermata di caricamento di Expo Go. In una build propria la schermata
nativa è nera con il logo giallo e poi arriva il giallo: farla gialla è
una riga di `app.json`, lasciata all'utente. La barra di stato resta
chiara sul giallo: la decide `App.tsx`. Chi ha «Riduci movimento» vede la
stessa animazione.

**Aggiornamento 2026-10-02 (TASK-181)**, deciso dall'agente su delega
dell'utente dopo la sua scelta della schermata nativa gialla (ADR-0134,
aggiornamento):
- **L'animazione parte già gialla.** Il fondo è `accent` dal primo
  fotogramma e il cerchio che riempiva lo schermo dal nero non c'è più:
  dopo una schermata nativa gialla sarebbe stato giallo, nero, giallo. I
  0,35 s restano come attesa della penna sul punto di partenza; il giallo
  si vede sempre 2,4 secondi. Il logo è `splash-logo-dark.png`, senza
  `tintColor`.
- **Attesa e disegno sono una sola animazione nativa**, che parte al primo
  fotogramma (`penProgress`: ferma per l'attesa, poi il disegno). Filmando
  con il Mac molto carico, il disegno partiva in ritardo: fra l'attesa e il
  disegno serviva un passaggio dal JavaScript, occupato ad avviare l'app,
  mentre il timer dell'uscita scattava puntuale e la dissolvenza tagliava
  il cuore a metà. Era così anche nella versione pubblicata di TASK-179.
- **L'uscita segue la fine del disegno**: il cuore finito resta 0,45 s, e
  comunque l'animazione non dura meno di 2,4 s (con le animazioni spente
  il disegno finisce subito). Il timer da solo è scartato per il motivo
  qui sopra; la sola fine del disegno era già scartata.

Resta com'era: il logo passa dal centro (schermata nativa) a sotto il cuore
con un salto. Si giudica in una build propria.

## ADR-0140 — «My activities»: «Save» a fine corsa, e i numeri della corsa li conta l'API
**Stato**: Attiva · 2026-10-02 · **scelte dell'utente** per il cosa («le
mie attività con tutte le attività che hanno registrato, con lo storico:
data, ora, posizione e l'anteprima di cosa aveva disegnato»; senza account
resta com'è, con una riga che invita a entrare; il luogo lo trova l'API);
il come deciso dall'agente su delega dell'utente (TASK-172).

**Scelta nuova dell'utente, lo stesso giorno** (riferita dal coordinatore
da un'altra sessione): «quando termino l'attività devi salvarmi l'attività
in activity sul mio profilo, e prima mi fai comparire una nuova schermata
nella quale mi dici salva, cancella, invia a Strava». Quindi **la corsa
non si salva più da sola**, com'era nella prima scelta («sì a tutte e
tre»): a fine corsa «Save» e «Discard», e solo «Save» la mette in «My
activities». «Send to Strava» è un task a parte (TASK-187), da chiedere
all'utente: ADR-0138 aveva tolto Strava dall'app.

**Contesto**: una corsa finita si perdeva: il telefono la teneva solo
finché non aveva il punteggio (ADR-0093), e quella senza percorso fino a
«Done» (ADR-0122). L'utente vuole ritrovarle nel profilo. È la metà
privata di TASK-117 («salvare un disegno»): titolo, «Public» e traccia
tagliata restano là.

**Decisione**:
- **La tabella `runs`** (migrazione `0003`), una riga per corsa, solo del
  proprietario. Tiene il percorso seguito (o nessuno), cosa disegnava, la
  traccia, le pause, l'inizio, km, tempo, punteggio e luogo.
- **L'app manda la corsa com'è stata registrata**, posizione per
  posizione con le pause; **km, tempo e punteggio li conta l'API** e l'app
  non li può nemmeno mandare (campi in più: `422`). Il punteggio è quello
  di `track_score.py` (ADR-0090), come `POST /track-scores`; la traccia
  tenuta è quella pulita dal motore (`clean_track`), non la grezza. Così
  un numero in «My activities» non dipende dalla versione dell'app che ha
  corso, e TASK-117 potrà pubblicarlo senza fidarsi del telefono.
- **Le pause sono nel contratto** (`pauses`, da TASK-169, ADR-0137): il
  tempo le toglie tutte; i metri tolgono solo il passo a cavallo di una
  pausa chiesta dal corridore, come fa l'app (`gap`). M della traccia sono
  i secondi dalla prima posizione, pause comprese, e le pause stanno
  accanto in `jsonb`: dalla riga si rifà l'orario di ogni punto.
- **Una corsa troppo corta per il punteggio si salva lo stesso**, senza
  punteggio; con meno di due posizioni buone non si salva. Non c'è una
  lunghezza minima: con «Save» e «Discard» lo decide chi ha corso.
- **La chiave la fa l'app dalla prima posizione** (`activityKey`: orario e
  punto), come per i preferiti la fa dalla linea: `PUT` due volte salva una
  volta, e resta la prima. Dall'inizio e non da tutta la traccia perché una
  corsa ripresa è la stessa corsa.
- **Il luogo**: geocoding inverso di Geoapify, con la chiave che l'API ha
  già, per la partenza **arrotondata a due decimali** (circa 1 km), come la
  ricerca dei luoghi fa con `near` (ADR-0095). Chiesto una volta, al
  salvataggio; se non arriva, la corsa non ha luogo. Il servizio non vede
  la porta di casa, e l'API non scrive posizioni nel log (ADR-0092).
- **L'elenco a pagine con cursore** sull'ordine `(inizio, id)`, dalla più
  recente, 20 per volta, con il totale: cancellare o salvare fra due pagine
  non ne ripete e non ne salta. Anteprime di 64 punti per linea, come i
  preferiti. Al massimo 2 000 corse per account.
- **«Save» e «Discard» stanno sulla schermata di fine corsa**, quella che
  «Stop» già apre con la mappa, i numeri e il punteggio: è la schermata
  che l'utente chiede, e una in più dopo «Done» sarebbe un tocco in più
  per dire la stessa cosa. Con un account prendono il posto di «Done»,
  sotto la scheda; «Keep running» resta. «Discard» chiede conferma: un
  tocco sbagliato butterebbe una corsa che non si rifà. Con «Save» o
  «Discard» la corsa lascia il file della corsa in corso anche senza
  punteggio: non torna alla prossima apertura.
- **Niente parte a «Stop»**: fra «Stop» e «Save» c'è «Keep running», e
  una corsa mandata a metà resterebbe a metà (resta la prima). Con «Save»
  la corsa va in un file del telefono (`activities-outbox.json`), con
  l'account di chi l'ha corsa, e da lì all'API: subito, o alla prossima
  apertura con la rete, o aprendo «My activities». Un `422` la toglie dalla
  coda (rimandarla non cambierebbe niente); ogni altro errore la lascia.
  Dopo un salvataggio l'elenco si richiede all'API: i numeri sono i suoi.
- **Cosa disegnava il percorso** l'app lo sa finché quel percorso è ancora
  sullo schermo (disegnato, di «Explore», a tema, un preferito); una corsa
  rimasta da un'altra apertura manda solo la linea.
- **La pagina** è una riga per corsa, non due schede affiancate come i
  preferiti: giorno, ora, luogo, km, tempo, passo e punteggio non stanno
  sotto mezzo schermo. Il disegno ha le due linee nella stessa cornice
  (`fitLines`), come a fine corsa.
- **Una corsa aperta è sulla mappa come a fine corsa**, non come un
  percorso di «Explore»: niente «Start», niente cuore. «Delete» chiede
  prima, sulla scheda.
- **Le schede di fine corsa cambiano di poco**: `FinishCard` e
  `FreeFinishCard` non mostrano «Done» quando non ricevono `onDone`; i due
  pulsanti e la riga per chi non ha account sono un pezzo solo sotto la
  scheda (`RunEnd`), uguale con un percorso e senza. `POST /track-scores`
  resta com'è: la scheda mostra il punteggio subito, il salvataggio va per
  conto suo.

**Scartate**: salvare da sola a «Done» (la prima scelta dell'utente,
cambiata da lui); salvare a «Stop» (vedi sopra); una schermata a parte
dopo «Done» con i due pulsanti; «Discard» senza conferma; fidarsi di km, tempo e punteggio dell'app; tenere la traccia
grezza (sulla mappa avrebbe i salti del GPS, e il punteggio è già sulla
pulita); la chiave da tutta la traccia (la stessa corsa, ripresa,
cambierebbe nome); mandare a Geoapify la partenza
esatta; un elenco di città dentro l'API (vale solo dove c'è il catalogo);
pagine con `offset` (saltano o ripetono quando l'elenco cambia); tenere le
corse senza account sul telefono (scelta dell'utente: restano com'erano).

**Conseguenze**: il database tiene tracce intere, con gli orari: il dato
più personale dell'app; le vede solo il loro account, spariscono con lui e
dalle copie entro 14 giorni (`UI.md`, «Cosa esce dal telefono»). Geoapify
riceve un punto al chilometro per ogni corsa salvata. Sul server la
migrazione `0003` parte al primo avvio dell'API nuova (`DEPLOY.md` F.12):
finché non c'è, l'app nuova tiene le corse nella coda. Una corsa chiusa
con «Discard» non si recupera. Chi chiude l'app sulla schermata di fine
corsa senza scegliere la ritrova alla prossima apertura, da salvare o
buttare. L'altitudine delle posizioni (TASK-169) non si salva. Il
punteggio di una corsa salvata non cambia se il motore cambia. TASK-117 parte da
`runs` con una migrazione sua (traccia tagliata, «pubblica», il titolo
dell'utente: `title` qui è cosa disegna il percorso) e il suo task file
va aggiornato da chi lo prende.

## ADR-0148 — Una zona tiene ogni pezzo della sua rete, e dove non ci sono strade il motore lo dice
**Stato**: Attiva · 2026-10-02 · deciso dall'agente su delega dell'utente
(TASK-180).

**Contesto**: sul server gli esempi di Venezia finivano in `engine_error`
(TASK-168): il ritaglio attorno al centro storico non aveva nodi. Due
difetti, uno sopra l'altro.

Il primo: un grafo senza strade non aveva un nome. `crop` chiamava `max()`
su nessun pezzo (`ValueError`), e un ritaglio di un nodo solo arrivava a
`RoadMask`, che indicizzava nessun campione (`IndexError`): l'API poteva
solo dire `engine_error`, «vedi il log».

Il secondo, la causa: OSMnx di un download tiene **il pezzo connesso più
grande** (`retain_all=False`, due volte in `graph_from_polygon`) e butta
gli altri. Verificato:

- il centro che dà la ricerca delle città è giusto: 45,4372 N 12,3346 E,
  in mezzo al centro storico; l'area del cuore da 5 km (45,4127–45,4617 N,
  12,2997–12,3695 E) è tutta isola e laguna;
- a piedi l'isola non è unita alla terraferma. Sui dati di OpenStreetMap
  del 2026-10-02, letti dall'API di OSM in una striscia attraverso il
  Ponte della Libertà e al suo capo verso Venezia, e passati per
  `FOOT_FILTER`: le due carreggiate cadono (`highway=trunk` con `foot=no`
  o `sidewalk:right=separate`); la ciclopedonale «Ciclabile per Venezia»
  resta (`foot=designated`, poi `foot=yes`) fino al nodo 5690409049
  (45,44258 N 12,31505 E), dove continua come way 597743868,
  `highway=cycleway` con `foot=no`, che cade. Il marciapiede dell'isola
  corre lì accanto, a 5 m, senza un nodo in comune. Il pezzo che arriva
  dalla terraferma ha 57 nodi in quel riquadro e non tocca la rete
  dell'isola (2.881 nodi nello stesso riquadro);
- l'estratto (`prefetch_zones --extract`) non c'entra: dà a OSMnx le
  stesse strade di Overpass, e il taglio lo fa OSMnx. Un test costruisce
  la zona da un estratto con una terraferma, un'isola e un ponte `foot=no`
  e, col motore di prima, trova il file senza l'isola e l'area dell'isola
  vuota.

**Non verificato**: che nella zona vera di Venezia (17 × 17 km, con Mestre
e Marghera) la terraferma abbia più nodi dell'isola. Lo dice il ritaglio
vuoto visto sul server; contarlo voleva la zona, e il 2026-10-02 Overpass
rifiutava le connessioni dal Mac (niente estratto né osmium in locale).

**Decisione**:

- **Chi scarica una zona tiene tutti i pezzi** (`retain_all=True` in
  `OsmnxSource.load`): il file della zona è la rete com'è. **Il pezzo più
  grande si sceglie area per area**, nel ritaglio, come `crop` e
  `ZoneCrop` fanno già; chi chiede la zona intera riceve il suo pezzo più
  grande (`largest_piece`), cioè quello che OSMnx dava prima. Una zona
  salvata prima, tutta d'un pezzo, torna com'è.
- **Dove non ci sono strade il motore rifiuta col suo nome**:
  `NoRoadsError`, da `crop` (nessun nodo nell'area) e da `RoadMask`
  (nessun arco). È un `ShapeNotDrawableError`: lì nessuna forma si
  disegna, e la CLI («No route: …»), i job e `POST /routes` rispondono già
  a quell'errore, con `shape_not_drawable`. Niente codice d'errore nuovo:
  l'app lo mostra già («This shape does not fit the roads here… another
  start»), e un codice nuovo sarebbe stato un contratto da cambiare
  nell'app.
- I due errori stanno in un modulo loro, `route_engine/errors.py`:
  `network.py` non può importare da `optimizer.py`, che lo importa.
  `optimizer.ShapeNotDrawableError` resta lo stesso oggetto, e nessun
  import cambia.

**Motivo**: buttare i pezzi piccoli ha senso per l'area di una richiesta,
dove la partenza si aggancia alla rete che c'è; non per una zona di 17 km
scaricata una volta per tutti, dove «il più grande» è deciso da cosa c'è a
8 km dal centro. Per le città di terraferma non cambia niente, e si è
visto sui dati veri: quattro zone del Mac rifatte dalle risposte di
Overpass in cache, senza rete (Trento e Verona a 17 km, 32.728 e 30.838
nodi; la zona piccola di Verona; Rosolina Mare). Con tutti i pezzi le due
grandi hanno il 3% circa di nodi in più (Trento 33.880 in 425 pezzi,
Verona 31.761 in 300; i pezzi in più hanno al massimo 36 nodi), Rosolina,
fra canali e lidi, il 26%. In tutte il pezzo più grande è il grafo di
prima: stessi nodi e stessi archi nello stesso ordine, stesse lunghezze e
geometrie; così i ritagli (cuore, cerchio e stella da 5 km da tre
partenze per zona), e il cuore da 5 km dal centro di Trento e di Verona
esce con la stessa linea. Cambia solo l'ordine dei valori dentro le
etichette di una strada fatta di più tratti (`name`, `highway`, `lanes`,
`maxspeed`…), che OSMnx mette in un insieme e non tiene fermo nemmeno fra
due costruzioni dello stesso download: la linea non ne dipende.

**Scartate**: un codice `no_roads` nell'API (contratto nuovo per l'app,
scelta di prodotto); mappare l'errore in `errors.py` e `app.py` dell'API
(`app.py` è di un altro task in corso, e la CLI sarebbe rimasta fuori);
restituire un grafo vuoto da `crop` e controllare in ogni chiamante (tre
punti nel motore, e uno dimenticato torna `engine_error`); una zona più
piccola solo per Venezia (un dato da ricordare, non una regola); scegliere
nel ritaglio il pezzo **della partenza** invece del più grande (più giusto
per chi parte da un'isola piccola, ma cambia i percorsi di oggi dove la
partenza sta su un pezzo minore: è un task a parte, da misurare).

**Conseguenze**: le zone già in cache restano col solo pezzo più grande:
**quella di Venezia sul server va rifatta** dopo l'aggiornamento dell'API
(con l'ok dell'utente; i comandi in `tasks/TASK-180.md`), poi i suoi tre
esempi. Che il centro storico dia un buon cuore da 5 km non è stato
provato: calli e ponti sono una rete molto diversa da una città di
strade. Le zone nuove pesano qualche punto percento in più. Un'area che
prende più terraferma che isola dà ancora la terraferma (una forma lunga
da Venezia, una partenza alla Giudecca vista da un'area che prende il
centro storico). Una zona scaricata al momento dall'API resta in memoria
col solo pezzo più grande fino al riavvio. `engine_fingerprint` cambia
come a ogni modifica del motore: gli esempi tenuti sul server si
ridisegnano alla prima richiesta.

## ADR-0151 — Un disegno di «Feed» si apre come un percorso di «Explore», e il suo percorso si ritrova dalla partenza
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («quando
sono in feed […] cliccare sull'attività delle persone inventate e mettere
nei preferiti o fare inizia percorso»); il come deciso dall'agente su
delega dell'utente (TASK-188).

**Contesto**: i disegni di «Feed» sono esempi (ADR-0127): corridori, titoli,
tempi e punteggi inventati, ma la linea è di un percorso vero del catalogo
(ADR-0098), e l'`id` del disegno è l'`id` di quel percorso. Sulla mappa un
percorso di «Explore» ha già tutto ciò che l'utente chiede: il cuore dei
preferiti (ADR-0139), «Start» con le indicazioni (TASK-145), il GPX. Il
disegno ha la linea con 120 punti, pochi per correrla: serve il percorso
intero. E l'`id` di un percorso del catalogo è la sua **posizione nel file
della città**: il catalogo è cresciuto dopo che il feed è stato scritto, e
sotto `roma-butterfly-21000-11` oggi c'è un cerchio di 5 km (la farfalla è
alla posizione 12).

**Decisione**:
- **Un tocco sulla scheda apre il percorso sulla mappa**, con la scheda di
  «Explore» (`useExplored`, `ExploredCard`): niente pulsanti nuovi sulla
  scheda del feed. Cuore, «Start» e GPX sono quelli che ci sono già; «←» e
  «Back to the list» tornano alla pagina da cui si è partiti, che `App.tsx`
  ricorda in uno stato (`routeList`).
- **Il percorso si chiede per `id` e si controlla**: è quello del disegno
  solo se ha la stessa città, la stessa forma e la stessa lunghezza
  (`isRouteOf`). Se sotto l'`id` c'è un altro percorso, o nessuno, lo si
  cerca fra i percorsi che partono dove parte il disegno
  (`GET /recommended-routes` attorno al primo punto della linea) e si
  chiede quello. `useExplored.open` prende, da chi apre, un modo diverso
  di chiedere il percorso intero; senza, chiede per `id` come prima.
- **Se il percorso non c'è più, non se ne apre un altro**: la scheda dice
  «The route could not load. Try again.», come per un percorso che non
  arriva. Un percorso sbagliato sotto il titolo di un altro sarebbe peggio
  di un messaggio.
- **Uno swipe non è un tocco**: «Feed» è la prima pagina, uno swipe verso
  destra non fa scorrere niente, nessuno toglie il tocco alla scheda e il
  dito alzato sopra di lei contava come un tocco (visto nel simulatore).
  La scheda ricorda dove il dito è sceso e ignora un dito che si è mosso
  più di 12 punti.
- La scheda è un pulsante solo quando chi la mostra le dà cosa aprire: in
  «Explore», fra i disegni mostrati mentre una città si disegna (ADR-0132),
  resta da guardare.

**Alternative scartate**: cuore e «Start» sulla scheda del feed (due
pulsanti per quindici schede, e «Start» senza aver visto dove si parte;
si può aggiungere, vedi il task file); mettere il percorso intero nel
file del feed (da 120 a 300–1600 punti per disegno, nel pacchetto
dell'app, e una copia che invecchia); correggere a mano gli `id` nel file
(lo scrive `tools/sample_feed.py`, e il catalogo cambierà ancora);
riscrivere il feed sul catalogo nuovo (cambia i disegni che l'utente
vede: è il seguito di TASK-161); `id` stabili nel catalogo (cambia un
contratto dell'API usato dai preferiti e da «Explore»: un task suo).

**Conseguenze**: un disegno apre in una richiesta se il suo `id` regge,
in tre se è cambiato. La ricerca dalla partenza vede i 60 percorsi
migliori entro 5 km (i limiti dell'API): la città più ricca ne ha 37.
Mentre il percorso arriva, la scheda sulla mappa dice «looks N% like it»
con il punteggio inventato del disegno, poi con la somiglianza vera del
percorso (di solito più alta): meno di un secondo. Il preferito salvato
da un disegno è il percorso, non il post: non ricorda chi l'ha «corso».
Le schede di «Explore», ultima pagina, hanno probabilmente lo stesso
difetto dello swipe verso sinistra: da guardare in un task suo.

## ADR-0145 — «Profile»: emoji per le voci, due riquadri con il numero, l'account in «Settings»
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («cambia
un po' la grafica, rendila più accattivante», un cuore accanto a
«Favorites», l'uomo che corre «come emoji» accanto alle attività, una
sezione «Settings» da riempire «con calma»); il come deciso dall'agente su
delega dell'utente (TASK-177).

**Contesto**: «Profile» con l'account era una scheda «LOGGED IN AS», un
elenco di righe di solo testo e, sotto, «Log out» e «Delete account»: tutto
grigio, con i due comandi che si usano una volta sola in vista quanto le
cose che si aprono ogni giorno.

**Decisione**:
- **Le voci hanno un'emoji**: ❤️ «Favorites», 🏃‍♂️ «My activities», ⚙️
  «Settings», ognuna in un tondo `surfaceRaised`. L'app non ha icone e
  una libreria di icone sarebbe una dipendenza nuova; l'emoji è il
  carattere che l'utente ha chiesto, e porta l'unico colore di «Profile»
  che non viene dai token. Non è giallo, quindi non si confonde con il
  percorso. Il cuore sulla mappa resta il carattere «♡»/«♥» di ADR-0139: è
  un comando con due stati, neutro come «←».
- **«Favorites» e «My activities» sono due riquadri affiancati** con il
  numero in grande (`fontSize.display`) e il nome sotto: il numero è la
  cosa che cambia, e si legge senza aprire la pagina. Finché l'elenco non
  è arrivato c'è un trattino, non uno zero.
- **In alto chi è**: un cerchio con l'iniziale, come il pulsante che apre
  «Profile», poi nome ed email. «LOGGED IN AS» sparisce: lo dice il
  cerchio. La foto prenderà il posto dell'iniziale con TASK-178.
- **«Log out» e «Delete account» stanno in «Settings»**, con l'account
  (nome, email), senza cambiare comportamento né testi. «Settings» è una
  pagina di «Profile» come «Favorites»: «←» torna a «Profile».
- **Le voci da sviluppare ci sono già, con «Soon»**: l'utente ha
  elencato cosa vuole in «Settings» (foto, cambiare email, numero di
  telefono, unità di misura, notifiche email e push, help, termini,
  privacy) e ha chiesto di aggiungerle subito e svilupparle dopo. Sono
  righe con il nome e «Soon», senza interruttori e senza tocco: si vede
  cosa arriverà e niente finge di funzionare. Ogni task che ne accende una
  la toglie dall'elenco `COMING` di `SettingsPage.tsx`.
- **Usciti da «Settings»**, per «Log out» o per l'account cancellato, la
  pagina torna «Profile»: chi rientra non si ritrova in «Settings».
- **Pezzi nuovi in `src/profile/`** (`Avatar`, `ProfileHome`,
  `SettingsPage`), che ricevono numeri e account come proprietà:
  `ProfileScreen.tsx`, che TASK-172 cambiava nelle stesse ore, li monta e
  basta.

**Scartate**: una libreria di icone (`@expo/vector-icons`: dipendenza
nuova, e l'utente ha chiesto un'emoji); il giallo per dare colore (il
giallo è del percorso, `UI.md` «Il tema»); un ingranaggio accanto al titolo
al posto della riga «Settings» (l'utente ha chiesto una sezione, come le
altre due); lasciare «Log out» sulla prima pagina (resterebbe la cosa più
in vista di «Profile»; l'utente ha confermato lo spostamento); interruttori
già disegnati per le notifiche (prometterebbero una cosa che non c'è).

**Conseguenze**: per uscire dall'account serve un tocco in più. Le emoji
le disegna il telefono: su Android hanno un altro tratto. «Settings»
mostra nove voci che ancora non fanno niente: le accendono TASK-178 (la
foto, ADR-0146, che riusa `Avatar`), TASK-183 (email e telefono), TASK-182
(unità), TASK-184 (help, termini, privacy, dopo TASK-152) e TASK-185
(notifiche, per ultime).

## ADR-0144 — «Explore»: niente filtri, altre forme dopo le prime tre, «Near me» al posto di «My start»
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa
(«toglimi i filtri, non mi piacciono»; le prime tre figure «più velocemente
possibile, ma poi allo stesso tempo cerca di farne altre mentre li
selezionano»; «non mi piace il tasto My start … non è intuibile, devi
rivederla»); il come deciso dall'agente su delega dell'utente
(TASK-176). Supera la parte dei filtri di ADR-0135 e allarga ADR-0116.

**Contesto**: «Best near you» aveva due filtri in una riga, «Shape» e
«Distance» (ADR-0135). Una città scelta senza percorsi consigliati
disegnava tre esempi, cuore, cerchio e stella da 5 km, e poi si fermava
(ADR-0116); una con percorsi consigliati mostrava solo quelli. Per tornare
dalla città ai percorsi vicini c'era un pulsante «My start» accanto al nome
della città, sotto il campo di ricerca.

**Decisione**:
- **I filtri si tolgono**, non si nascondono: `RouteFilters.tsx` e i suoi
  test si cancellano, con `filterOptions` e `filtered`. «Best near you»
  mostra tutti i percorsi nell'ordine dell'API, i migliori per primi.
- **Dopo le prime tre forme l'app ne disegna altre cinque**: luna, cavallo,
  lumaca, testa di cane, testa di coniglio (`MORE_SHAPES` in
  `exampleRoutes.ts`). Scelte misurando, il 2026-10-02 sul Mac, ogni forma
  del catalogo a 5 km dal centro di quattro città, come la chiede l'app
  (somiglianza del percorso scelto dal motore):

  | Forma | Trento | Verona | Bologna | Padova | Media |
  |---|---|---|---|---|---|
  | cavallo | 0,98 | 0,97 | 0,99 | 0,94 | 0,97 |
  | lumaca | 0,92 | 0,99 | 0,95 | 0,94 | 0,95 |
  | stella | 0,92 | 0,97 | 0,96 | 0,94 | 0,95 |
  | luna | 0,92 | 0,94 | 0,97 | 0,92 | 0,94 |
  | testa di cane | 0,92 | 0,90 | 0,98 | 0,90 | 0,92 |
  | testa di coniglio | 0,91 | 0,91 | 0,94 | 0,92 | 0,92 |
  | cerchio | 0,91 | 0,92 | 0,92 | 0,91 | 0,92 |
  | cuore | 0,81 | 0,91 | 0,95 | 0,94 | 0,90 |
  | farfalla | 0,89 | 0,94 | 0,89 | 0,88 | 0,90 |
  | gatto | 0,83 | 0,92 | 0,88 | 0,81 | 0,86 |
  | pesce | 0,87 | 0,77 | 0,75 | 0,75 | 0,79 |

  Le cinque scelte vengono come il cerchio e il cuore o meglio; farfalla,
  gatto e pesce restano fuori, zucca e albero di Natale sono di stagione.
- **Una alla volta, come le prime**: l'API lavora due richieste alla volta e
  il motore usa già più processi (ADR-0136 ha scartato le richieste
  insieme). Le altre forme partono solo quando le prime tre sono finite.
- **Una scheda solo quando tocca a lei.** La forma in corso ha la scheda
  «Drawing…», quelle dopo non si annunciano: nessuno le ha chieste, e una
  fila di schede vuote spingerebbe sotto lo schermo i disegni del feed
  (ADR-0132). Una forma che l'API non riesce a disegnare lì
  (`shape_not_drawable`) non compare e non viene richiesta finché l'app
  resta aperta: darebbe lo stesso esito al costo di una ricerca intera. Un
  guaio che non è della forma (rete, troppe richieste al minuto) ferma le
  altre in silenzio; si richiedono alla prossima scelta della città. Le
  prime tre si comportano come prima: scheda, messaggio, «Try again».
- **Le forme in più stanno dentro una parte del limite dell'API**
  (`EXAMPLES_PER_MINUTE`, 18). L'API accetta 30 POST al minuto da un
  telefono (ADR-0076), e una città che ha già disegnato risponde subito
  alle sue otto richieste: tre città così in un minuto li userebbero
  tutti, e verrebbero rifiutati «Start», «Export GPX» o le prime tre forme
  della città dopo. Le prime tre non aspettano mai, e costano quanto
  prima; una forma in più parte solo se nell'ultimo minuto sono partite
  meno di 18 richieste di esempi, altrimenti aspetta, senza scheda.
  Il tetto è preso sul 30 che l'API ha da sola, non su quello del server:
  lì oggi `SHAPEROUTE_RATE_LIMIT` è 120 a telefono (`deploy/.env`, rimasto
  da quando tutti i telefoni contavano come uno), e `DEPLOY.md` F.12 dice
  che può tornare vuoto, cioè a 30. L'app non sa quale dei due vale, e
  con 120 il tetto costa solo l'attesa delle forme in più della terza
  città sfogliata in un minuto.
- **Il cerchio si chiede per primo**, anche se la prima scheda resta il
  cuore. La zona di una forma è un quadrato attorno al centro, largo quanto
  la forma arriva lontano, e l'API ne scarica una solo se nessuna di quelle
  sul disco la contiene (`covering_path`). Mezzo lato a 5 km, dal motore:
  cerchio 2751 m, cuore 2718, luna 2579, stella 2471, cavallo 2426, lumaca
  1971, testa di coniglio 1794, testa di cane 1681. Col cuore per primo una
  città nuova per l'API scaricava la zona del cuore e subito dopo quella
  del cerchio, 33 m più larga per lato: due download da Overpass invece di
  uno (a Rovereto, prima che avesse la zona, i log di TASK-168 ne contano
  uno per forma). Fra le altre forme la luna va per prima per lo stesso
  motivo. **Lo stesso ordine nell'API**: `EXAMPLE_SHAPES` in
  `prefetch_zones.py` diventa cerchio, cuore, stella, e da lì lo prende
  `draw_examples`, così app e server chiedono le prime tre allo stesso
  modo. Per le zone di `prefetch_zones` l'ordine non conta: sono
  l'unione delle aree.
- **Anche le città con percorsi consigliati**: fra le otto forme l'app
  disegna quelle che la città non ha, e le aggiunge in coda alle sue
  schede, uguali alle altre. Sono tutte «in più»: niente sezione degli
  esempi, niente messaggi. Le città in evidenza, che dal catalogo hanno
  solo cuore, cerchio e stella (ADR-0132), ricevono così le altre cinque.
  Senza una città scelta non si disegna niente: una richiesta dalla
  posizione di chi usa l'app non resta sull'API (ADR-0136), e si rifarebbe
  a ogni apertura. Sulle schede aggiunte la città ha il nome che le danno
  le sue schede del catalogo («Milano», dove la ricerca dice «Milan»): è
  quello del percorso che parte più vicino al centro, entro un chilometro
  (`ownCityName`); vale anche per la scheda sulla mappa.
- **I disegni del feed sotto gli esempi** (ADR-0132) restano legati alle
  prime tre forme: quando arrivano le altre c'è già qualcosa da scegliere.
- **«Near me» è la prima voce della fila delle città**, con il segno della
  posizione (un anello col suo centro, due `View`: nessuna icona nuova). È
  accesa finché non si sceglie una città; da una città, un tocco riporta
  ai percorsi vicini alla partenza. La riga col nome della città e «My
  start» sparisce: la città scelta è la voce accesa, e il suo nome intero
  è già sotto il titolo della pagina («Starting within 5 km of …»).

**Scartate**: nascondere i filtri dietro un pulsante (l'utente non li
vuole); disegnare le otto forme insieme, o a coppie (i due thread
dell'API); annunciare subito tutte le schede (cinque schede vuote in più, e
i disegni del feed fuori dallo schermo); una soglia di somiglianza per le
altre forme (le prime tre non l'hanno, e la scheda dice già la
percentuale); `maintainVisibleContentPosition` sulla pagina, per non
spostare i disegni del feed quando si aggiunge una riga di schede (terrebbe
fermo anche quello che sta sotto il campo della città quando compaiono i
suggerimenti, spingendo il campo fuori dallo schermo); aggiungere le
altre cinque forme a `EXAMPLE_SHAPES` dell'API perché `draw_examples` le
disegni prima (oltre un'ora e mezza di calcolo in più sulle città già
previste, e restano comunque sull'API dal primo telefono: si può fare
dopo, rilanciando il comando); chiamare la voce col nome
della partenza quando è un luogo cercato (servirebbe una riga in `App.tsx`,
che è di altri task in lavorazione); un pulsante con una freccia, o «Back
to my position» scritto per esteso (resta un pulsante in più, lontano
dalla fila in cui si sceglie).

**Conseguenze**: una città nuova chiede all'API otto percorsi invece di
tre, sempre uno alla volta: sul server 7–19 s l'uno (TASK-168, dai log),
ma solo al primo telefono, perché restano sull'API come le prime tre. Nelle
62 città disegnate prima con `draw_examples` le prime tre arrivano subito,
e il primo telefono disegna le altre cinque. Chi sfoglia più di due città
già disegnate per intero in un minuto vede le forme in più della terza
arrivare quando il minuto è passato. Il file degli esempi sul
telefono tiene fino a otto percorsi per città invece di tre (ultime 8
città). Quando si aggiunge una riga di schede i disegni del feed scendono
di una riga, al più due volte. `draw_examples` disegna ancora solo le
prime tre forme. Se la partenza è un
luogo cercato e non la posizione, la voce dice comunque «Near me». Con la
mappa sotto le schede (ADR-0142) ogni forma in più chiede anche la sua
foto. Da provare con il dito sull'iPhone.

## ADR-0152 — «Sport» in «Settings»: un elenco nell'app, la scelta sul telefono, «Soon» finché il motore non c'è
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** («Nelle
impostazioni, fai scegliere anche il tipo di sport, perché poi
implementiamo anche per Bici e padel canoa»; fra tre proposte: «Run»
scelto, gli altri visibili con «Soon»); il come deciso dall'agente su
delega dell'utente (TASK-189).

**Contesto**: il motore disegna solo percorsi da corsa (la richiesta
all'API ha già `activity`, che oggi vale solo `"running"`). Bici e canoa
sono task del motore (TASK-190, TASK-191). «Settings» (ADR-0145) è a
sezioni, e le voci non ancora fatte dicono «Soon» senza prendere il tocco.

**Decisione**: gli sport sono un elenco nell'app,
`src/settings/sport.ts`: «Run», «Bike», «Paddle» (canoa, kayak, SUP),
ognuno con `ready`. In «Settings» hanno una sezione loro, «SPORT», tre
righe: uno sport pronto è un pulsante di scelta, con «✓» su quello
scelto; uno non pronto dice «Soon» e non si tocca, come le altre voci da
fare. La scelta resta nei documenti del telefono (`sport.json`), come le
città recenti; senza scelta, o con una scelta non pronta, vale «Run». Il
«✓» è bianco: il giallo è del percorso. Per ora la scelta non va all'API:
con un solo sport non cambierebbe niente.

**Alternative scartate**: far scegliere subito bici e canoa, con una
riga che avvisa che i percorsi sono da corsa (scartata dall'utente:
promette una cosa che non c'è); una riga sola «Sport» con «Soon»
(scartata dall'utente); tenere la scelta nell'account (serve l'API e una
migrazione, per una scelta che oggi ha un valore solo); una riga in
«Preferences» che apre una pagina (per tre voci basta l'elenco sul
posto, e «Settings» non ha altre pagine sotto).

**Conseguenza**: accendere uno sport è `ready: true` nella sua riga, più
il lavoro del motore: lo fa il task che lo porta, che manda anche la
scelta all'API in `activity`. La scelta vale per il telefono, non per
l'account: su un altro telefono si riparte da «Run». La sezione è un
componente a parte (`SportSetting`), con gli stili delle righe di
«Settings» ripetuti: `SettingsPage.tsx` era di TASK-177 mentre si
scriveva.

## ADR-0153 — La rete della bici: strade e ciclabili, sensi unici rispettati, una cache sua
**Stato**: Attiva · 2026-10-02 · deciso dall'agente su delega dell'utente
(TASK-190, parte A: il motore). Le distanze, 10–30 km, e `activity:
"cycling"` invece di un campo `sport` sono **scelte dell'utente** (task
file).

**Contesto**: il motore aveva una rete sola, `foot` (ADR-0022): ogni
strada nei due sensi, scale e marciapiedi compresi, le strade col
marciapiede disegnato a parte escluse. In bici servono altre strade, i
sensi unici, e una cache che non si mescoli con quella a piedi.

**Misure sui dati veri, e il loro limite.** Overpass il 2026-10-02 rifiuta
le connessioni dal Mac: un tentativo solo, alle 18:23Z, dalla CLI
(`--activity cycling`, cerchio da 10 km dal centro di Trento), «Connection
refused» su tutti e due gli indirizzi. **Nessuna zona della bici è stata
scaricata.** Le misure vengono dalle risposte di Overpass già in cache sul
Mac (`data/cache/http/`, lette senza scriverci), che sono quelle del
filtro **a piedi**: ci sono i tag veri di ogni strada, ma **mancano le
strade col marciapiede disegnato a parte** (`sidewalk=separate`, spesso le
vie principali di una città) e quelle con `foot=no`. Quattro zone: Trento
(città, 17 km), Valsugana (valle: Levico, Caldonazzo, Pergine), Padova
(città di pianura), Bologna. Km di strada:

| | Trento | Valsugana | Padova | Bologna |
|---|---|---|---|---|
| tutta la risposta | 4.102 | 3.883 | 4.619 | 3.561 |
| `highway=cycleway` | 113 | 29 | 86 | 277 |
| `path` + `bicycle=designated` | 19 | 25 | **310** | 13 |
| `footway` + `bicycle=designated` | 0,9 | 0 | 15,6 | 8,4 |
| `path`/`footway` + `bicycle=yes` | 63 | 79 | 26 | 50 |
| pedonali aperte alle bici | 4,2 | 1,4 | 7,0 | 12,6 |
| `trunk` (con le rampe) | 51,5 | 50,4 | 125,3 | 11,7 |
| `primary` (con le rampe) | 29,6 | 83,3 | 60,6 | 134,4 |
| `track` | 1.168 | 1.361 | 248 | 174 |
| vietate alle bici¹ | 45 | 46 | 29 | 27 |
| sensi unici, fra le strade della bici | 147 | 56 | 520 | 519 |
| … aperti alle bici in contromano² | 4,1 | 1,0 | 13,9 | 8,1 |
| … con una corsia ciclabile nell'altro senso³ | 0,2 | 0 | 7,8 | 5,1 |
| sterrato (`surface`, o `track` senza) | 1.096 | 1.271 | 375 | 251 |

¹ `bicycle=no|dismount|use_sidepath|private`, `access=no|private|
agricultural|forestry`, `vehicle=no|private`, `motorroad=yes`.
² `oneway:bicycle=no` (Padova 113 strade, Bologna 65, Trento 68,
Valsugana 5) o `cycleway*=opposite*` (Padova 21, Trento 1).
³ `cycleway:left|right:oneway=-1|no`, spesso insieme al tag di ².

Rete della bici costruita **dal codice del motore** su quelle risposte
(sempre senza le strade col marciapiede a parte): con i sensi unici, il
pezzo più grande in cui ogni nodo si raggiunge da ogni altro è il 99,0%
del pezzo più grande senza sensi (Valsugana), il 98,1% (Padova), il 79,5%
(Trento); nessun arco su scale, marciapiedi, `trunk` o vie vietate. Percorsi
pianificati lì (cuore, cerchio, stella; somiglianza, sterrato):

- **Valsugana** (partenza a Levico): tutti e sei disegnati, 0,62–0,92; a
  10 km 0,79 cuore, 0,68 cerchio, 0,83 stella; a 20 km 0,76, 0,62, 0,92;
  sterrato 0–6,2 km, `primary` 0–1,5 km; 2–4 s l'uno.
- **Padova** (centro): a 20 km cuore 0,86, cerchio 0,93, stella 0,91; a
  10 km stella 0,79, cuore e cerchio non disegnabili.
- **Trento** (centro): stella 0,90 a 10 km e 0,74 a 20, cuore 0,66 a
  10 km, il resto non disegnabile. Nell'area del cuore da 10 km la rete
  approssimata è a pezzi già senza i sensi unici (il pezzo più grande ha
  7.152 nodi su 9.978), e coi sensi unici 3.763, senza la partenza: mancano
  proprio le vie principali col marciapiede a parte.

Queste misure dicono **quali tag contano** e che il motore li legge; non
dicono come viene una forma sulla rete vera della bici in città. Non sono
campioni da giudicare.

**Decisione**:

1. **Quali strade** (`network.rideable`, `BIKE_ROADS`): ciclabili e strade
   fino alle `primary` (`primary`, `secondary`, `tertiary` con le rampe,
   `unclassified`, `residential`, `living_street`, `service`, `road`,
   `track`). `path`, `footway` e `bridleway` **solo con
   `bicycle=designated`** (a Padova sono 310 km, più delle sue `cycleway`);
   non con `bicycle=yes`, che a Trento e in Valsugana è soprattutto un
   sentiero di montagna (58 e 76 km di `path`) e in città un marciapiede.
   Zone pedonali con `bicycle=yes|designated|permissive|destination`. **Mai**
   scale, `trunk` e autostrade. Una strada è chiusa con `bicycle=no|
   private|dismount|use_sidepath`, `motorroad=yes`, `vehicle=no|private`,
   `access=no|private|agricultural|forestry`, salvo un `bicycle=yes|
   designated|permissive|destination` esplicito. Le `track` restano (in
   valle sono la rete fra i paesi) e le `primary` anche: tutte e due
   diventano warning (punto 5).
2. **Il download**: `network_type="bike"` (OSMnx tiene i sensi unici:
   `oneway=yes|-1`, rotatorie), con **due filtri Overpass** (`BIKE_FILTER`):
   le strade, e solo i sentieri e le zone pedonali con un tag `bicycle` che
   le apre. Due richieste per zona invece di una, ma la seconda porta pochi
   km: un filtro solo con tutti i `footway` e `path` scaricherebbe il 25%
   delle vie a Trento (7.644 `footway` su 30.910) e l'80% a Parigi e New
   York, per buttarle. Sono condizioni semplici, come `FOOT_FILTER`, che
   l'estratto (`zone_extract.tag_filter`) sa leggere. I tag che servono
   (`BIKE_TAGS`) si aggiungono a quelli che OSMnx tiene, solo per il
   download. Il grafo arriva **non semplificato**: `bike_ways` decide
   strada per strada, poi semplifica come OSMnx.
3. **Sensi unici: un percorso contromano non esiste.** Il grafo è
   orientato e il percorso segue gli archi, quindi non è un warning ma
   un'impossibilità. Un senso unico è aperto alle bici nei due sensi solo
   dove OSM lo dice: `oneway:bicycle=no`, `cycleway[:both|:left|:right]=
   opposite*`, `cycleway:left|right:oneway=-1|no` con una corsia
   (`bike_direction`); `oneway:bicycle=yes|-1` su una strada a doppio
   senso la fa a senso unico per le bici. Conseguenze nel motore:
   - un ritaglio della rete `bike` tiene il pezzo più grande **in cui ogni
     nodo si raggiunge da ogni altro** (`crop`, `largest_piece`), non solo
     quello con le strade unite: da un senso unico cieco non si torna. Per
     le zone `bike`, `ZoneCrop` passa da `crop` (la scorciatoia di
     ADR-0082 segue i pezzi a piedi);
   - da una partenza vicina (ADR-0071) **il ritorno è la via più breve
     consentita**, non l'andata al contrario (`with_approach`); se non c'è,
     quella partenza si scarta.
4. **Una cache sua**: `bike_<sud>_<ovest>_<nord>_<est>.graphml` col suo
   pickle, accanto ai `foot_*`; una zona si cerca solo fra i file della sua
   rete. I `foot_*` non cambiano nome né contenuto. Un grafo `bike` porta
   `network="bike"`; i grafi a piedi non hanno l'attributo, quindi tutti
   quelli già salvati restano «foot». `plan_shape` e `ShapeJob` ricevono
   l'`activity` e rifiutano un grafo di un'altra rete (`check_network`,
   `WrongNetworkError`): una sorgente sbagliata è un errore, non un
   percorso a piedi chiamato bici.
5. **Le attività** (`models.py`): `DISTANCE_LIMITS_M` con `running` 1–50 km
   (come prima) e `cycling` **10–30 km**; `ACTIVITIES` sono quelle che il
   motore disegna e che `check_activity` accetta; `check_distance(distance,
   activity)`: «distance must be between 10000 and 30000 metres for
   cycling, got 5000». Per la corsa messaggi e ordine dei controlli sono
   quelli di prima. **`SUPPORTED_ACTIVITIES` resta `("running",)`**: è il
   contratto che `packages/shared-types` rispecchia (ADR-0028), e
   `test_contract.py` lo confronta con `fixtures/contract.json`;
   cambiarlo da solo rompe quel test, e `shared-types` è della parte B.
   Passa a `("running", "cycling")` nella parte B, insieme al suo
   specchio.
6. **Validazione (§6) in bici**: le stesse misure; le scale non possono
   esserci; le strade principali sono le `primary`; in più `unpaved`, solo
   sulla rete `bike`: metri su `surface` senza fondo duro
   (`validation.UNPAVED`) o su `track` senza `surface` e non
   `tracktype=grade1`, warning appena c'è («… m of the route on unpaved
   roads»). A piedi le misure restano cinque, senza `unpaved`.
7. **La CLI**: `--activity cycling` usa la rete `bike` e stampa i metri di
   sterrato.

**Scartate**: il filtro `bike` di OSMnx com'è (prende ogni `path` e
`bridleway`, le `trunk`, e non legge `oneway:bicycle` né `cycleway`); un
solo filtro Overpass con tutti i marciapiedi (sopra); escludere tutti i
`path` (Padova perde 310 km di ciclabili); prendere anche i `path` con
`bicycle=yes` (sentieri); escludere le `track` (la valle resta senza rete
fra i paesi; la superficie è fuori scope, e lo sterrato è un warning come
chiede il task); i sensi unici come warning invece che come regola (il
task: un percorso contromano non è accettabile); i pezzi «con le strade
unite» anche in bici; aggiungere ora `cycling` a `SUPPORTED_ACTIVITIES`
(sopra); un campo nuovo nel grafo per ogni arco al posto dell'attributo
del grafo (le zone a piedi già salvate non l'avrebbero).

**Conseguenze**:

- La corsa non cambia: stessi file, stesso filtro, stessi percorsi; i test
  di prima passano senza toccarli (motore 1.026, API 574).
- **Fra la parte A e la B** il motore accetta `cycling` (`RouteRequest`), e
  quindi anche l'API: una richiesta `cycling` a `/route-jobs` o `/routes`
  finisce in `WrongNetworkError` (`engine_error`), perché l'API dà ancora
  la rete a piedi. Le foto (`images.py`) invece costruiscono `ShapeJob`
  senza `activity` e controllano la distanza della corsa: una foto
  `cycling` uscirebbe a piedi. L'app non manda `cycling` (la riga «Bike» è
  «Soon», ADR-0152). La parte B chiude tutti e due.
- Una zona della bici costa **due richieste a Overpass**.
- **Le zone della bici sono grandi**: cerchio da 10 km, 9 km di lato; da
  20 km, 16; da 30 km, **23 km** (530 km²), 26 con la ricerca lontana. Le
  zone di oggi (17 × 17 km, ADR-0119) non bastano per 30 km: va misurato
  nella parte B prima di promettere i tempi.
- `ZoneCrop` non accelera le zone `bike`: in una città grande il ritaglio
  costa di più che a piedi (da misurare nella parte B).
- `engine_fingerprint` cambia come a ogni modifica del motore: gli esempi
  tenuti sul server si ridisegnano alla prima richiesta.
- **Non verificato**: una zona vera della bici (Overpass), i tempi su di
  essa, quanto la rete vera di una città resta a pezzi coi sensi unici, e
  i campioni da far giudicare all'utente (cuore, cerchio e stella a 10, 20
  e 30 km a Trento e in una città di pianura). Da fare appena Overpass
  riapre o con l'estratto (parte B, `prefetch_zones --extract`).

**Aggiornamento (parte B, l'API, 2026-10-02)** — deciso dall'agente su
delega dell'utente (TASK-190, parte B). Cosa mostrano «Explore», «Feed» e
la corsa con «Bike» scelto resta una scelta dell'utente (parte C).

1. **Il contratto**: `SUPPORTED_ACTIVITIES = ("running", "cycling")`,
   rispecchiato da `ACTIVITIES` di `shared-types` e da
   `fixtures/contract.json`, che ora porta anche i limiti di ogni attività
   (`distance_limits_m`; in `shared-types` `DISTANCE_LIMITS_M`, per la
   parte C). `min_distance_m` e `max_distance_m` restano quelli della
   corsa. Una fixture nuova, `route-request-cycling.json`, letta dai test
   dei due lati. L'app pubblicata manda `running` e legge le stesse
   risposte: per lei non cambia niente.
2. **Ogni richiesta sulla rete della sua attività**: l'API tiene un
   `ZoneGraphs` per attività (`activity_graphs.ActivityGraphs`), ognuno
   sulla sua cache (`OsmnxSource.for_activity`: `foot_*`, `bike_*`);
   `/routes`, `/route-jobs`, `/image-route-jobs` e il replay danno al
   motore quello della richiesta (`source_for`). Quello che non ha
   un'attività resta a piedi: i percorsi a tema e `/route-directions` (i
   percorsi di «Explore» sono corse). Un'API con un solo loader (i test) lo
   dà a ogni richiesta, e il motore rifiuta una bici su un grafo a piedi
   (`engine_error`): mai un percorso a piedi chiamato bici.
3. **Solo le attività del contratto**: il motore può disegnarne di più
   (`ACTIVITIES`; domani `paddling`, TASK-191), e una che l'API non serve è
   `invalid_request` («unsupported activity 'paddling'; choose one of:
   running, cycling», `check_supported`), non un 500.
4. **Limiti ed errori**: in bici fuori da 10–30 km è `invalid_request` col
   messaggio del motore («distance must be between 10000 and 30000 metres
   for cycling, got 5000»); la corsa ha i messaggi di prima. La distanza
   suggerita di `shape_not_drawable` resta nei limiti dell'attività (in
   bici mai sotto 10 né sopra 30 km): `/routes` la sa dalla richiesta
   (`request.state`), i job dal loro `RouteRequest`. Una foto in bici ha
   limiti e rete della bici (`ImageRequest`, `image_job`).
5. **Una zona della bici alla volta in memoria** (`ZONES_IN_MEMORY`): le
   zone a piedi restano 2 (`MAX_ZONES`), quelle della bici 1. Una richiesta
   in bici in un'altra città rilegge la sua zona dal disco (il pickle:
   0,3–0,5 s sul Mac).
6. **Le zone della bici** (`prefetch_zones --activity cycling`,
   `bike_zone_box`): **26 × 26 km** attorno al centro della città, cioè
   ogni forma del catalogo a 30 km dal centro con la ricerca lontana del
   motore (la più larga è il cerchio; una parola, che ripiega la sua
   linea, sta in meno). Ci stanno anche un 30 km da una partenza fino a
   circa 1,4 km dal centro (senza ricerca lontana), un 20 km fino a circa
   3,4 km, un 10 km fino a circa 6,9 km. Senza i nomi delle strade: la rete
   della bici ha già le vie col marciapiede a parte (parte A).
   **Solo dall'estratto**: il
   comando rifiuta `--activity cycling` senza `--extract`, perché una zona
   della bici sono due richieste grandi, e Overpass rifiuta il Mac e il
   server. Un riquadro di 30 km (anche il 30 km da 2 km dal centro)
   costerebbe un terzo in più di memoria e di disco: scartato per ora.
   Fuori dalle zone, una richiesta in bici scarica da Overpass come una a
   piedi.
7. **Quali città**: prima **Trento**, la prova vera sul server (con l'ok
   dell'utente; comandi nel task file). Poi, con un altro ok, le 52 di
   `--preset italy`, una alla volta nel container da 4 GiB di TASK-137;
   una città che non ci sta (come Berlino a piedi) resta senza. Le città
   estere no: non c'è il loro estratto, restano a Overpass.
8. **Gli esempi delle città** (`draw_examples`): nessuna variante della
   bici adesso. Cosa mostra «Explore» con «Bike» scelto è la domanda 1 del
   task file, una scelta di prodotto della parte C.
9. **I percorsi tenuti** (`route_store`): la chiave aveva già
   `activity`; un test lo prova (lo stesso cuore dallo stesso centro in
   bici è un altro file, e quello della corsa resta). Nessun nome di file
   cambia.

**Misure, sul Mac e senza rete.** Zone `bike` costruite **per la strada
dell'estratto** (`zone_extract.served_from`, che legge i due `BIKE_FILTER`
senza modifiche) dalle risposte a piedi già in cache, sullo stesso
riquadro della zona a piedi. Mancano quindi le vie col marciapiede a
parte: nei file `names_*` del server sono lo 0–2% dei km di strada a
Palermo, Bari e Genova, il 23% a Londra, più del doppio a New York.
«In memoria» è quanto cresce un processo che fa `read_graph` e `ZoneCrop`
come l'API:

| Zona | Lato | Nodi | Archi | Pickle | In memoria | Costruzione |
|---|---|---|---|---|---|---|
| Trento, bici | 18,6 km | 20.424 | 43.110 | 11 MB | 127 MB | 10 s, picco 0,97 GB |
| Valsugana, bici | 22,6 km | 12.152 | 27.540 | 9 MB | 105 MB | 8 s |
| Milano, bici | 19,4 km | 52.493 | 104.856 | 24 MB | 236 MB | 29 s, picco 1,79 GB |
| Roma, bici | 16,7 km | 41.073 | 77.995 | 19 MB | 186 MB | 18 s, picco 1,69 GB |
| Trento, piedi | 18,6 km | 32.728 | 85.988 | 19 MB | 185 MB | |
| Milano, piedi | 19,4 km | 136.447 | 406.392 | 72 MB | 618 MB | |
| Roma, piedi | 16,7 km | 91.894 | 262.808 | 51 MB | 454 MB | |

Il ritaglio di una zona della bici passa da `network.crop` (punto 3 della
decisione):
0,1–0,7 s (Milano, tutta la zona), e mentre c'è il processo cresce del
25–35% della zona. **Stima per una zona di 26 km** (676 km²), in
proporzione all'area: 0,14 GB in valle, 0,25 GB a Trento, 0,43–0,45 GB a
Milano e Roma, fino a circa 0,6 GB contando le vie che qui mancano; più il
ritaglio durante una richiesta. Una zona della bici pesa quanto o meno di
una zona a piedi della stessa città di oggi (Milano a piedi 0,62 GB): con
una sola in memoria, l'API sul server (8 GB) cresce al più di circa
0,6–0,8 GB; i processi delle partenze vicine partono solo se la memoria
c'è (ADR-0121). La costruzione dall'estratto, per 26 km: circa 1,9 GB a
Trento e 3,2 GB a Milano oltre a osmium, dentro i 4 GiB del container per
le città medie, da guardare per le grandi.

**Conseguenze**: una richiesta `cycling` all'API ora arriva sulla rete
della bici; cambia `models.py`, quindi di nuovo `engine_fingerprint` (gli
esempi tenuti sul server si ridisegnano alla prima richiesta). Gli eventi
delle ricerche (`insights`) non scrivono l'attività: un percorso in bici
vi compare come una corsa (il registro delle richieste invece ha il corpo
intero). **Non verificato**: una zona vera della bici, i tempi di un
percorso su di essa, i campioni da far giudicare all'utente.

**Aggiornamento (parte C, l'app, 2026-10-02)** — deciso dall'agente su
delega dell'utente (TASK-190, parte C). Le due domande di prodotto
(«Explore», «Feed» e la corsa con «Bike» scelto) restano dell'utente: con
la bici quelle pagine non cambiano.

1. **Lo sport arriva a «Draw» subito**: `saveSport` avvisa chi ascolta
   (`subscribeSport`), `useSport` lo legge dal telefono una volta e poi
   segue le scelte. Scartati: rileggere `sport.json` a ogni disegno (un
   accesso al disco per ogni render) e un contesto React attorno all'app
   (`App.tsx` e `ProfileLayer` da cambiare per una scelta sola).
2. **Sport e attività**: `activityOf` in `sport.ts` («Bike» → `cycling`,
   il resto → `running`); uno sport non pronto non è mai quello scelto. Con
   «Run» la richiesta resta la stessa, campo per campo e nello stesso
   ordine.
3. **Le distanze di ogni sport nell'app**: `APP_DISTANCE_LIMITS_KM`
   (`distance.ts`), corsa 1–21 km (`MAX_APP_DISTANCE_KM`, come prima), bici
   i limiti del contratto, 10–30 km (`DISTANCE_LIMITS_M.cycling`). Campo,
   messaggio, − e +, «Try N km» e il numero di lettere di una parola (7 a
   piedi, 8 in bici) li leggono da lì; ogni funzione ha la corsa come
   valore di partenza, così chi non passa un'attività fa quello di prima.
4. **Uno sport nuovo porta la distanza nei suoi limiti** (`fitDistance`,
   la regola di − e +): 5 → 10 in bici, 25 → 21 a piedi, una distanza che
   sta nei due resta. Scartato: tenere una distanza per sport (due stati da
   ricordare per un caso raro) e lasciare il campo fuori dai limiti con
   «Draw route» spento (l'utente vedrebbe un errore senza aver fatto
   niente).
5. **Gli errori restano quelli di prima**: un'API senza la parte B
   (`invalid_request`) e i 5 minuti (`MAX_WAIT_MS`, che non cambia) hanno i
   loro testi di sempre. Due testi nuovi, da confermare con l'utente: «Ride
   without a route» al posto di «Run without a route» con «Bike», e «At most
   8 letters.» per una parola troppo lunga in bici.

**Conseguenze**: l'app pubblicata con questa parte chiede `cycling` solo
con «Bike» scelto; va pubblicata dopo che il server ha la parte B, o chi
sceglie «Bike» legge «The app and the API do not agree». **Non
verificato**: niente sull'iPhone.

## ADR-0155 — «Explore»: il luogo scelto ha i suoi percorsi, quelli dei vicini stanno sotto
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa
(«premo su Caldonazzo, ma non vengono fuori suggerimenti a Caldonazzo: mi
vengono fuori Levico perché è vicino … va bene dare le alternative, ma
bisogna lavorare anche su Caldonazzo, ad esempio anche le frazioni, Barco
eccetera; va bene tenere 5 km, però bisogna lavorare anche sul paese
selezionato»); il come deciso dall'agente su delega dell'utente
(TASK-192). Precisa ADR-0116 e ADR-0144.

**Contesto**: una città scelta in «Explore» riceve i percorsi del catalogo
che partono entro 5 km dal suo centro, e gli esempi disegnati dal suo
centro solo se quelli mancano (ADR-0116); da TASK-176 una città con
percorsi riceve le forme che non ha (ADR-0144). «Entro 5 km» però non vuol
dire «suoi»: Caldonazzo ha gli otto percorsi di Levico fra 3,3 e 4,3 km,
quindi mostrava solo quelli, e da Caldonazzo non partiva niente. Lo stesso
per ogni paese o frazione accanto a una città del catalogo.

**Decisione**:
- **I percorsi vicini a un luogo scelto si dividono in due** (`byPlace` in
  `ownRoutes.ts`): **suoi**, con la partenza entro `OWN_RADIUS_M` =
  **1500 m** dal punto scelto, e **dei vicini**, il resto entro i 5 km.
- **La soglia viene dal catalogo**, misurato il 2026-10-02: dei 350
  percorsi di `catalog/seed/`, il 98% parte entro 500 m dal centro della
  propria città e il più lontano a 1013 m (Levico, Trento, Verona e Padova
  ne hanno attorno a 1 km); quelli di un altro paese partono più lontano:
  i percorsi di Levico sono a 3,3 km dal centro di Caldonazzo e a 1,8 km
  da Barco. 1500 m sta in mezzo.
- **Vale per ogni luogo scelto**: città, paesi, frazioni e luoghi arrivano
  tutti da `/city-suggestions` come un punto con un nome (`Place`, `kind`
  «city» o «place»), e la divisione guarda solo il punto. Barco, a 2,8 km
  dal centro di Levico, ha i suoi esempi; un luogo dentro Levico ha i
  percorsi di Levico come suoi.
- **Le forme che il luogo «ha» sono solo quelle dei percorsi suoi.** Senza
  percorsi suoi è una città senza percorsi consigliati: la sezione
  «EXAMPLES IN …» con cuore, cerchio e stella da 5 km dal suo centro, poi le
  altre cinque forme, come in ADR-0116 e ADR-0144. Con percorsi suoi resta
  com'era: le sue schede più le forme che non ha.
- **I percorsi dei vicini stanno sotto**, in una griglia loro con
  l'etichetta **«NEAR <LUOGO>»**; le schede dicono già il paese e la
  distanza («Levico · 3.3 km away»). Il raggio resta 5 km e l'API non
  cambia.
- **Con i vicini sotto gli esempi, i disegni del feed nell'attesa non
  compaiono** (ADR-0132): c'è già qualcosa da guardare. Il credito della
  mappa resta uno solo: quello della sezione degli esempi appena uno è
  pronto, prima quello della pagina.
- **Una soglia sola**: `ownCityName` di TASK-176 usava 1000 m per lo stesso
  concetto; ora usa `OWN_RADIUS_M`.
- **Senza città scelta («Near me») non cambia niente**: una lista sola,
  nessuna etichetta, niente disegnato (ADR-0136).

**Alternative scartate**: stringere il raggio di «near you» (l'utente
tiene i 5 km, e le alternative vicine gli vanno bene); riconoscere il paese
dal nome (il catalogo dice «milano» dove la ricerca dice «Milan», e una
frazione nel catalogo non ha nome); 1000 m come soglia (quattro percorsi
del catalogo partono fra 1001 e 1013 m dal proprio centro); una griglia sola
con i suoi e quelli dei vicini mescolati per somiglianza (è quello che
l'utente ha visto: Levico al posto di Caldonazzo); disegnare cuore,
cerchio e stella dal centro anche a una città che ha già percorsi suoi
(doppioni delle sue schede); cambiare l'API perché dica di che paese è un
percorso (serve un confine per ogni paese, e la distanza dalla partenza
basta).

**Conseguenze**: il motore, provato sul Mac da Caldonazzo a 5 km con le
tre partenze vicine dell'API, disegna cuore 0,88, cerchio 0,72 e stella
0,90: in un paese piccolo le forme vengono, non tutte bene. Un paese
accanto a una città del catalogo chiede all'API
otto percorsi la prima volta che lo si sceglie, uno alla volta; se la sua
zona non è sul server la scarica (fino a un minuto), poi i percorsi restano
sull'API (ADR-0136) e la volta dopo sono subito lì. Nell'attesa sotto ci
sono già i percorsi dei vicini. Da «Near me» a Caldonazzo si vedono ancora
solo quelli di Levico: dalla posizione di qualcuno non si disegna
(ADR-0136), cambiarlo è una scelta dell'utente. Paesi piccoli e frazioni
non sono disegnati in anticipo sul server (`draw_examples`): da fare lì,
con l'ok dell'utente. Da provare con il dito sull'iPhone.

## ADR-0156 — «Send to Strava»: il collegamento passa dal server, e la corsa tiene cosa ne ha fatto Strava
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa («Sì,
fallo vero»: l'invio vero della corsa fatta, con un'app Strava sua, fra
tre proposte); il come deciso dall'agente su delega dell'utente
(TASK-187, parte API). Non riapre ADR-0138: quello toglieva il passaggio a
mano di un *percorso*; questo carica la *corsa fatta*, che Strava permette
alle altre app (`POST /uploads`).

**Contesto**: l'utente vuole, a fine corsa, «salva, cancella, invia a
Strava». Le corse salvate ci sono (`runs`, ADR-0140). Per caricare
un'attività Strava chiede OAuth con il permesso `activity:write`, un
Client Secret che non può stare in un'app, token d'accesso che scadono
dopo sei ore e un file con l'orario di ogni punto. Documentazione riletta
il 2026-10-02: la revoca si fa con `POST /oauth/revoke` (dal 1° giugno
2026; `/oauth/deauthorize` finisce il 1° giugno 2027); un'app non rivista
collega un atleta solo; 200 richieste ogni quarto d'ora e 2 000 al giorno.

**Decisione**:
- **Tutto OAuth sta sul server.** L'app chiede `POST /me/strava/connect`,
  apre nel browser l'indirizzo che riceve e non vede altro: né il secret
  né un token. Strava rimanda il browser a `GET /strava/callback`
  dell'API, che scambia il codice e risponde una pagina. Nessuna
  dipendenza nuova, né nell'app né nell'API (`urllib`, come per Geoapify).
- **Lo `state` lega la callback all'account**: casuale, 32 byte, vale una
  volta per 10 minuti, uno per account, nel database solo il suo SHA-256
  (tabella `strava_states`). La callback è fuori da `X-API-Key`
  (`OPEN_PATHS`): un browser non ha la chiave, e senza uno `state` buono
  la pagina non fa niente.
- **Si chiede solo `activity:write`**, e si controlla che l'atleta non
  l'abbia tolto: senza, non si chiede nemmeno il token.
- **I token in chiaro nel database** (`strava_accounts`). Vanno rimandati
  a Strava, quindi un hash non basta; cifrarli vorrebbe una dipendenza e
  una chiave in più da custodire nello stesso `.env`. Chi copia il
  database ha token d'accesso che durano al più sei ore e refresh token
  inutili senza il Client Secret, che sta solo nell'ambiente del server.
- **Un atleta è di un account solo, l'ultimo che l'ha collegato**: Strava
  dà una sola serie di token per atleta, e due righe se li romperebbero a
  vicenda a ogni rinnovo.
- **Il rinnovo è dell'API**: prima di usare un token a meno di cinque
  minuti dalla scadenza lo rinnova, una richiesta alla volta per atleta
  (`FOR UPDATE`), e tiene il refresh token nuovo. Un token rifiutato
  mentre è ancora buono per l'orologio si rinnova una volta: se Strava
  rifiuta anche il refresh token l'atleta ha tolto l'accesso, la riga si
  cancella e l'app torna a «Connect with Strava» (`409`). Un Client Secret
  sbagliato sul server (`401` di Strava) non scollega nessuno.
- **La corsa tiene cosa ne ha fatto Strava** (`strava_status`,
  `strava_upload_id`, `strava_activity_id` su `runs`): una già mandata non
  si rimanda, una in lettura si riprende a guardare. Due invii insieme si
  mettono in fila sulla riga della corsa. `external_id` è la chiave della
  corsa: se il server dimentica, Strava rifiuta il doppione dicendo quale
  attività è, e l'API la prende per mandata.
- **L'invio aspetta Strava per pochi secondi** (5 sguardi, uno al
  secondo, come Strava chiede), poi risponde `202 processing` e la stessa
  chiamata rifatta riprende: niente lavori in sottofondo nell'API, e la
  coda dell'app (`outbox`) sa già riprovare.
- **Lo stato dell'invio ha un endpoint suo** (`GET
  /me/activities/{key}/strava`) invece di un campo in più nelle corse di
  «My activities»: `activities.py`, i suoi esempi e i tipi dell'app non
  cambiano, e chi non ha Strava non riceve niente di Strava.
- **Nessun codice d'errore nuovo**: `http_error` con `503` (Strava
  spento), `409` (non collegato), `502` (Strava non risponde),
  `too_many_requests` con `Retry-After` (il limite di Strava),
  `invalid_request` (`422`, Strava non legge la corsa). L'app li distingue
  dallo stato HTTP; il contratto degli errori (`schemas.py`,
  `shared-types`) resta com'è.
- **Il GPX della corsa lo scrive l'API** (`run_gpx.py`), non il motore:
  non è un percorso, è la traccia salvata con i suoi orari, e una pausa
  chiude un `<trkseg>` (`GPX.md`, «La corsa fatta»). Il motore resta
  l'unico a scrivere il GPX di un percorso (ADR-0033).
- **Scollegare cancella i token comunque**, poi revoca su Strava; se
  Strava non risponde non resta niente da noi, e l'atleta può togliere
  Sgrava dalle impostazioni di Strava. `DELETE /me` fa lo stesso prima di
  cancellare l'account, senza aspettare Strava (`before_account_delete` in
  `accounts.py`: `accounts.py` non sa niente di Strava).
- **Il dominio della callback** è `SHAPEROUTE_DOMAIN`, che il server ha
  già per Caddy; vuota, l'indirizzo a cui è arrivata la richiesta. Nessuna
  variabile in più oltre a `STRAVA_CLIENT_ID` e `STRAVA_CLIENT_SECRET`.
- **Il nome e la descrizione**, proposti dal task file e poi **scelti
  dall'utente** il 2026-10-02 sera: il nome si scrive nell'app prima di
  «Save» (`{ "name": … }`, facoltativo; vuoto, «Heart in Trento» o quello
  di Strava); la descrizione su ogni corsa, «Drawn with Sgrava» con un
  percorso, «Recorded with Sgrava» senza.

**Parte app** (2026-10-02 sera; l'arancione di Strava e l'interruttore
che ricorda sono **scelte dell'utente**, il resto deciso dall'agente su
delega dell'utente):

- **Strava si chiede all'API solo quando una schermata lo mostra** (fine
  della corsa, una corsa aperta, «Settings»), una volta per account, e di
  nuovo quando l'app torna in primo piano dopo aver aperto la pagina di
  Strava. Un'API senza Strava, o più vecchia di TASK-187 (`404`), è
  «Strava spento»: niente si vede. Il resto dell'app non fa richieste in
  più all'apertura.
- **La scelta passa da `RunEnd` a «Save» con `toStrava`** della porta
  delle corse (`activitiesDoor.ts`), detta subito prima di `onSave`:
  `App.tsx` non cambia (era di TASK-200).
- **Le corse che aspettano Strava hanno un file loro**
  (`strava-outbox.json`: account, chiave e nome), non restano in
  `activities-outbox.json`: quello tiene la corsa intera e conta «runs
  waiting for a connection»; una corsa che l'API ha già non aspetta più la
  connessione per «My activities». Una corsa con l'interruttore acceso
  porta `strava: { name }` nel primo file finché l'API non l'ha; poi passa
  al secondo, scritto prima di togliere la corsa dal primo. Si riprova a
  ogni apertura: `202`, `502`, `429` e senza rete restano; `409`, `422`,
  `404` e `503` escono (rimandare non cambierebbe niente).
- **Lo stato HTTP resta nella risposta** (`http` in `StravaOutcome`):
  l'API dice `http_error` per `404`, `409`, `502` e `503`, e l'app fa una
  cosa diversa per ognuno. `accounts.ts` non cambia.
- **Nessun ritorno automatico nell'app** dopo il browser (uno schema
  `sgrava://` nella callback): Expo Go non ha schemi nostri (come
  `music.ts`), e la pagina della callback dice già «Go back to Sgrava.».
- **Nessuna dipendenza nuova**: `Linking` e `AppState` di React Native.

**Scartate**: OAuth nell'app con `expo-auth-session` (una dipendenza, e il
secret dovrebbe comunque stare sul server per lo scambio del codice); lo
`state` in memoria (si perde a ogni riavvio e non si prova con l'orologio
dei test); cifrare i token (sopra); rifiutare un atleta già collegato a un
altro account (chi prova con due account resterebbe bloccato; e non ferma
chi convince una persona ad autorizzare un collegamento non suo, che
resta il limite di ogni collegamento cominciato nell'app e finito nel
browser: si vede solo `activity:write`, e la persona lo toglie da Strava);
un lavoro in sottofondo che segue l'upload (un'altra cosa che gira, per
due secondi di attesa); il campo `strava` dentro `Activity` (sopra);
codici d'errore nuovi (tre file del contratto in più, per casi che lo
stato HTTP già distingue); scrivere il GPX nel motore (il motore non sa
niente di corse salvate, pause e orari); `/oauth/deauthorize` (in
dismissione).

**Conseguenze**: sul server arrivano la migrazione `0004` e due variabili
(`DEPLOY.md`, «Strava»); finché l'utente non crea la sua app Strava,
Strava è spento e niente cambia. Finché Strava non approva l'app si
collega solo l'atleta dell'utente. La prova dal vero (data, ora e durata
dell'attività; se Strava legge i `<trkseg>` come pause) è dell'utente,
dopo la parte app. Strava conta le sue richieste per tutta l'app: 200
ogni quarto d'ora bastano a qualche decina di corse mandate insieme, non
a migliaia. Un'attività cancellata su Strava resta `sent` da noi: per
rimandarla serve un task. La parte app (`RunEnd`, «My activities»,
«Settings», la coda senza rete) è la seconda PR di TASK-187.

## ADR-0146 — La foto del profilo: un quadrato di 256 px fatto dall'API, cambiato da «Settings»
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa (la
foto del profilo, da mettere in «Settings», chiesta con TASK-177); il come
deciso dall'agente su delega dell'utente (TASK-178).

**Contesto**: ADR-0115 aveva già detto dove sta la foto, un JPEG quadrato
di 256 px nel database, perché le copie di sicurezza la prendano con il
resto. TASK-116 doveva farla insieme a nome utente, bio e profilo
pubblico; l'utente l'ha chiesta prima, da «Settings», dove ADR-0145 l'ha
messa con «Soon».

**Decisione**:
- **Una tabella sua**, `profile_photos` (migrazione `0005`): una riga per
  account con la foto, `bytea`, `ON DELETE CASCADE`. Non una colonna di
  `users`: ogni `GET /me` e ogni richiesta con il token leggono `users`,
  e non devono trascinarsi i KB della foto.
- **Tre endpoint con il token**, `GET`, `PUT` e `DELETE /me/photo`, come i
  preferiti. La foto va e viene in base64 dentro JSON, come per i contorni
  delle immagini (ADR-0069): nessun formato nuovo per l'app e per i test.
  Nella risposta il JPEG intero (pochi KB), che l'app mostra come
  `data:image/jpeg;base64,…`: niente indirizzo da chiedere con il token,
  niente cache da invalidare.
- **L'API fa il quadrato**, sempre: raddrizza con l'EXIF, prende il
  quadrato in mezzo, riduce a 256 px, salva un JPEG nuovo. Il file del
  telefono non si tiene, e con lui l'EXIF: dove è stata scattata una foto
  non arriva nel database. Oltre 50 megapixel, o un formato che non è JPEG
  o PNG, è `422` prima di leggere i pixel.
- **Il quadrato lo sceglie la persona** nell'editor del telefono
  (`allowsEditing` con `aspect: [1, 1]` di `expo-image-picker`, già una
  dipendenza); quello dell'API, in mezzo, conta per una foto che arriva
  non quadrata (Android, o un'altra app).
- **10 `PUT` al minuto per account**, in memoria come le password
  sbagliate: il limite di `access.py` conta solo i POST per indirizzo, e
  ridurre una foto è il lavoro più caro degli account.
- **Nell'app**: la riga «Profile picture» di «Settings» (in un file suo,
  `PhotoRow.tsx`, lontano dalle righe che TASK-189 cambia) apre sotto di sé
  «Choose a picture», «Take a photo» e «Remove picture», come «Delete
  account» apre la sua domanda: niente menu del sistema, che in Expo Go e
  nei test si comporta in un altro modo. La foto la tiene un contesto di
  `ProfileLayer.tsx`, come preferiti e corse: il pulsante in alto, il
  cerchio di «Profile» e la riga la leggono dallo stesso posto, e si
  cambiano insieme.
- **Senza foto, senza rete o con un'API non ancora aggiornata** si vede
  l'iniziale, come prima, e non si dice niente: una foto non vale un
  errore sullo schermo. Gli errori si dicono solo quando la persona prova a
  cambiarla.

**Scartate**: la foto come colonna di `users` (sopra); un file su disco o
un servizio a parte (ADR-0115); `multipart/form-data` (una dipendenza nuova
nell'API, `python-multipart`, per un solo endpoint); un indirizzo della
foto da caricare con `Image` (vorrebbe il token in un'intestazione di
`Image`, o un indirizzo pubblico, che è TASK-116); tenere la foto sul
telefono fra un'apertura e l'altra (un'altra copia da tenere allineata;
per ora l'iniziale per un attimo va bene); `ActionSheetIOS` o `Alert` per
le tre scelte (diversi su Android, non provabili nei test come il resto di
«Settings»).

**Conseguenze**: all'apertura l'app chiede una richiesta in più, `GET
/me/photo`, con l'account. Sul server serve la migrazione `0005` (un
aggiornamento dell'API, con l'ok dell'utente); finché non c'è, la riga
dice «Profile pictures are not available on this API yet.» a chi prova. La
foto la vede solo il suo proprietario: mostrarla agli altri, con nome e
bio, resta a TASK-116, con una migrazione sua.

## ADR-0154 — Sull'acqua la forma è il percorso: la fascia entro 1 km dalla riva, la ricerca di dove ci sta, la partenza dalla riva dove si arriva a piedi
**Stato**: Attiva · 2026-10-02 · **scelta dell'utente** per il cosa (il
disegno resta entro circa 1 km dalla riva; esempi a Lago di Garda, Lago di
Como, Jesolo, Riccione); il come deciso dall'agente su delega dell'utente
(TASK-191, parte A1: solo moduli nuovi del motore).

**Contesto**: sull'acqua non c'è una rete di strade. La forma proiettata
(`ROUTE_ENGINE.md` §3) **è** il percorso, se sta tutta sull'acqua: il
lavoro è trovare rotazione, scala e posizione in cui ci sta, e una
partenza sulla riva. Il motore aveva solo le strade; serve l'acqua da
OpenStreetMap, che per il mare non ha un poligono ma la linea
`natural=coastline`, con la terra a sinistra del suo verso.

**Decisione** (`route_engine/water.py`, `route_engine/water_fit.py`):

- **L'acqua.** I laghi sono `natural=water` con `water=lake`,
  `water=reservoir` o senza `water`, di almeno **10 ha**, e non marine,
  porti o fontane; una relazione multipoligono si ricompone dalle sue way
  (esterne meno interne: le isole). Il mare è **il riquadro meno la
  terra**: la coastline taglia il riquadro in facce, e ogni faccia sta a
  sinistra (terra) o a destra (mare) dei tratti di coastline che la
  delimitano, a voti dei suoi lati più lunghi. Senza coastline nel
  riquadro non c'è mare: il mare aperto lontano da ogni riva non serve
  alla fascia. Tutto il resto del riquadro è **terra**, isole comprese.
- **Gli ostacoli**: moli, frangiflutti e pennelli (`man_made=pier`,
  `breakwater`, `groyne`; una way aperta conta larga 6 m), scogliere
  (`natural=reef`), marine e porti (`leisure=marina`, `landuse=harbour`) e
  ogni altra acqua (fiumi, canali, lagune, darsene, stagni): si tolgono
  dall'acqua navigabile. Fiumi, canali e lagune sono fuori dal task.
- **La fascia**: l'acqua navigabile entro **1000 m** dalla riva, meno
  **50 m** dalla riva e **30 m** dagli ostacoli, e a 50 m dal bordo del
  riquadro (oltre il bordo non si sa cosa c'è). La riva che conta per il
  chilometro è la terraferma e le isole di almeno **1 ha**: uno scoglio o
  un frangiflutti staccato si evita, ma non allunga la fascia di un
  chilometro in mare aperto.
- **I margini, sui dati** (API di OSM, 2026-10-02): a Jesolo i 17 pennelli
  di legno di 1,7 km di spiaggia escono dalla riva di 17–66 m (mediana
  37); a Riva del Garda i moli di 1–36 m (mediana 14), i frangiflutti di
  2–7 m, una scogliera di 12 m, una marina di 9 m; a Riccione nessuno.
  Con 50 m dalla riva la forma passa oltre la metà dei pennelli senza
  contarli; i 30 m dagli ostacoli tengono la forma lontana dalle punte
  degli altri (il pennello più lungo, 66 m, la spinge a 96 m dalla
  riva). 50 m tengono anche il disegno staccato dalla spiaggia sulla
  mappa, alla scala di un percorso di 2–3 km; 30 m tengono conto della
  base di un frangiflutti a scogliera, più larga della linea disegnata.
- **La ricerca** (`fit_shape`): la forma a grandezza intera (contorno
  lungo quanto la distanza chiesta), poi più piccola del 3% alla volta fino
  al 40%; dritta entro ±15° ogni 5°, il cerchio una volta sola (ADR-0038).
  Per ogni scala e angolo, la fascia su una griglia di celle di
  1/200 del contorno (10–40 m), ristretta di 1,25 celle: un centro va
  bene se tutti i punti del contorno cadono su celle della fascia, e allora
  il contorno è nella fascia. I centri si guardano dal più vicino alla
  partenza, 20 000 alla volta, finché 200 vanno bene; dei centri buoni se
  ne tengono 3, lontani fra loro, il cui contorno passa più vicino alla
  partenza, e si controllano esattamente con shapely
  (`band.contains`). Nessuna linea esce dal motore senza quel controllo.
- **Il costo** = |distanza − chiesta| / chiesta + **2** × (i due tratti
  dalla riva) / chiesta + **0,1** × km fra la partenza chiesta e quella
  sulla riva. Un metro di tratto costa il doppio di un metro mancato: un
  tratto più lungo non compra mai una forma più piccola. La forma «ci sta»
  se la distanza è entro **±10%** (come sulle strade); altrimenti è un
  errore che dice a quanti km ci sta (`best_distance_m`, come TASK-031).
  La somiglianza è quella della forma con sé stessa: il costo dice quanto
  si è rimpicciolita (`scale`) e spostata (`move_m`).
- **La partenza sulla riva**: i punti della riva della **terraferma** ogni
  10 m, che toccano l'acqua navigabile e stanno entro **40 m** da una
  spiaggia (`natural=beach`, `leisure=beach_resort`), uno scivolo
  (`leisure=slipway`), un molo o una via che si percorre a piedi
  (`highway`, non autostrade, superstrade, `foot=no` o private). Un nodo
  conta solo se è uno scivolo. Per una forma piazzata si tengono i punti
  entro 2 km dalla partenza chiesta e entro **300 m** dalla forma, e vince
  quello di costo minore il cui tratto dritto fino al punto più vicino
  della forma sta tutto sull'acqua navigabile (mezzo metro di tolleranza
  sul bordo). Il percorso: riva, tratto, la forma intera da lì, lo stesso
  tratto, riva. I tratti contano nella distanza e sono nel GPX.
- **Gli errori** sono `ShapeNotDrawableError`, come `NoRoadsError`
  (ADR-0148), quindi ogni chiamante li sa già trattare: `NoWaterError`
  («there is no lake or sea to paddle on within 2 km of here»), e
  `WaterFitError` («the heart does not fit at 6 km … it fits at 3.1 km»;
  «… even at 4.0 km»; «… no shore within 300 m of it can be reached on
  foot»).
- **La cache**: `data/cache/water/water_<s>_<w>_<n>_<e>.json`, separata
  dalle strade, scritta intera o niente (ADR-0104); un file che contiene
  l'area la serve. Un mancato è **una** richiesta Overpass
  (`WATER_QUERY`: coastline, `natural=water`, ostacoli, spiagge, scivoli
  e le sole vie entro 40 m dall'acqua), dall'indirizzo che risponde
  (ADR-0100). L'area di una richiesta è la partenza ± (2 km + 300 m + il
  diametro della forma + 1 km).
- **Per i campioni**, quando Overpass rifiuta: `python -m
  route_engine.water --osm-api …` legge le risposte dell'API di OSM
  (`map.json` di un riquadro piccolo, più `relation/<id>/full.json` per un
  lago grande, di cui `map` dà solo le way nel riquadro). Mai nell'API.

**Verificato sui dati veri** (API di OSM, 2026-10-02, sei chiamate: due
strisce sottili per trovare la costa, un riquadro a Riccione, uno a
Jesolo, uno a Riva del Garda e la relazione 8569 del lago intera):
il mare dalla coastline a Riccione (1,5 × 1,4 km) e a Jesolo
(1,7 × 1,8 km), il lago dalla relazione a Riva (1,9 × 2,3 km), gli
ostacoli e i punti di partenza; nove campioni (cuore e cerchio da 2 km,
stella da 3 km nei tre posti), chiusi, sull'acqua, fra 63 e 81 m dalla
terra, al più 835 m dalla riva. Fin dove le forme ci stanno, chiedendo
1, 2, 3, 4, 5, 6, 8 e 10 km: l'ultima distanza chiesta che dà un
percorso, la prima che non lo dà, e a quanto l'errore dice che la forma ci
sta (fra parentesi i km del percorso, quando non sono quelli chiesti):

| Dove | cuore | cerchio | stella |
|---|---|---|---|
| Riccione (costa dritta) | 3 sì · 4 no, «3,3» | 3 sì (2,9) · 4 no, «2,9» | 4 sì (3,7) · 5 no, «3,7» |
| Jesolo (costa dritta) | 3 sì · 4 no, «3,2» | 3 sì (2,9) · 4 no, «2,9» | 4 sì (3,7) · 5 no, «3,7» |
| Riva del Garda (riquadro di 1,9 × 2,3 km) | 4 sì · 5 no, «4,3» | 4 sì (3,6) · 5 no, «3,6» | 6 sì (5,7) · 8 no, «5,5» |
| Lago della fixture (largo 1,8 km) | 6 sì (5,6) · 8 no, «5,8» | 5 sì · 6 no, «5,1» | 6 sì · 8 no, «6,3» |

Ogni piano sui dati veri richiede meno di un secondo; costruire l'acqua
di un'area intera (8–9 km, con la relazione del Garda) 0,1 s.

**Solo sulle fixture o non verificato**: la richiesta Overpass (un
tentativo il 2026-10-02: «No route to host»; la query non è mai stata
eseguita), e quindi un riquadro intero di una richiesta vera con tutti
i suoi ostacoli e accessi; isole in mare e un lago con un'isola (fixture);
il Lago di Como (nessun dato scaricato). I campioni sono fatti solo dentro
i riquadri scaricati: oltre il bordo non si vede niente, e la fascia si
ferma a 50 m dal bordo.

**Alternative scartate**: un grafo sull'acqua a cui agganciare la forma
(non c'è una rete da prendere: sarebbe inventarla); spostare o piegare i
punti della forma dove escono dalla fascia (la forma non sarebbe più
quella, e sull'acqua niente obbliga a deformarla); 200 m dalla riva, la
fascia dei bagnanti delle ordinanze balneari sul mare (è una regola del
posto, fuori dal task; con 200 m restano 800 m, e la scelta va fatta
dall'utente); girare liberamente le forme lungo una costa obliqua
(ADR-0038: una forma inclinata non si riconosce; riaprirlo è una scelta
dell'utente); `features_from_bbox` di OSMnx (scarica tutte le strade del
riquadro per trovare quelle vicino all'acqua, e un GeoDataFrame per
leggerle; la query fatta a mano chiede solo le vie entro 40 m
dall'acqua, e basta shapely); la partenza sulla riva più vicina alla
partenza chiesta invece che alla forma (un tratto lungo fino alla forma,
o un posto da cui la forma non si vede); unire e allargare tutte le vie
per trovare la riva raggiungibile (2,7 s su Riva; con un indice spaziale
0,1 s per tutta l'acqua).

**Conseguenze**: con la fascia di 1 km, **su una costa dritta le forme
stanno fino a circa 3 km** (la stella fino a 4): la proposta di 1–10 km
del task non regge al mare, e le distanze per la canoa vanno chieste
all'utente (domanda 2 del task). Su un lago stretto, dove tutto è entro
1 km da una riva, si arriva a 5–6 km. I due tratti dalla riva (60–90 m
l'uno) pesano su un percorso corto: un cuore da 1 km si disegna all'88%.
Il motore non conosce le regole del posto (bagnanti, corridoi di lancio,
traffico di barche): l'avviso di sicurezza della parte C deve dirlo.
`activity: "paddling"`, i limiti, la CLI `--activity paddling` e la
validazione di §6 sull'acqua sono la parte A2, dopo la bici (TASK-190,
PR #214), che ha toccato gli stessi file (`models.py`, `validation.py`,
`__main__.py`).
La corsa non cambia: nessun file del motore che già c'era è toccato; ma
`engine_fingerprint` dell'API legge ogni `.py` del motore, quindi dopo il
prossimo aggiornamento del server gli esempi tenuti (ADR-0136) si
ridisegnano alla prima richiesta, uguali a prima.

**Aggiornamento** (2026-10-03, ADR-0161): al mare la forma sta oltre
**200 m** dalla riva, sui laghi resta a 50 m; le distanze sono 1–5 km;
fra i centri buoni si tengono quelli da cui si arriva alla riva col costo
minore, non i più vicini alla partenza chiesta.

## ADR-0157 — La penna alzata: indici dei tratti a piedi in `points`, non pezzi separati
**Stato**: Attiva · 2026-10-02 · deciso dall'agente su delega dell'utente
(TASK-197, motore e API). Il cosa è **scelta dell'utente** («per le
scritte, stoppare il tragitto, camminare fino alla seconda lettera senza
tracciare»), con la pausa automatica e l'avviso a voce nell'app (TASK-198).

**Contesto**: una parola si scrive come una linea chiusa: ogni lettera
andata e ritorno, unita alla successiva da una linea di base, e il ritorno
alla partenza (ADR-0044). Quella base deve passare su una strada: dove non
c'è, il percorso gira e sporca la parola. Con la penna alzata ogni lettera
si disegna da sola e fra due lettere si cammina con la registrazione in
pausa; Strava, in una pausa, traccia una linea dritta dal punto dove ci si
è fermati a quello dove si riparte. Il contratto (`RouteRequest`,
`RouteResult`) lo usa anche l'app già pubblicata: non deve rompersi.

**Decisione**:

1. **La richiesta**: `pen_up`, vero o falso, falso se manca. Solo con
   `word`: con `shape` o in una richiesta d'immagine è `invalid_request`
   (`pen_up is for the letters of a word`). L'immagine ha il campo solo per
   rifiutarlo con questo messaggio invece di «Extra inputs».
2. **La risposta**: `walks`, una lista di coppie `[da, a]` di indici in
   `points`, compresi tutti e due, in ordine; dove finisce un tratto
   comincia la lettera successiva; con n lettere n − 1 coppie. **Indici in
   una linea sola, non pezzi separati**: tutto quello che oggi legge
   `points` (la navigazione e il «fuori percorso» dell'app, le
   indicazioni di svolta calcolate sui nodi del percorso, il GPX, i
   preferiti e le corse salvate, le alternative, il registro e il replay)
   continua a leggere una linea da seguire, e un'app che non conosce
   `walks` la segue tutta, camminando dove non disegna. Pezzi separati
   (una lista di linee) avrebbero voluto un campo nuovo al posto di
   `points` o due copie del percorso, e ogni lettore da cambiare insieme.
3. **Facoltativi in tutti e due i sensi**: l'API manda sempre `walks`
   (vuoto per una forma, un'immagine, una parola senza `pen_up`); in
   `shared-types` è `walks?`, così un'app nuova legge un'API vecchia come
   una linea sola. `pen_up?` nella richiesta (`false` per una forma e
   un'immagine). Le fixture scritte prima restano come sono, e i test le
   leggono come richieste e risposte di un'app e di un'API precedenti
   (come le fixture senza dettagli di ADR-0074).
4. **Il motore** (`pen_up.py`, `ROUTE_ENGINE.md` §2 e §5): ogni lettera
   è il suo `out` una volta, tracciato come linea aperta
   (`snap_to_network(closed=False)`, un parametro nuovo che per difetto
   lascia tutto com'era), con le zone e il corridoio del disegno intero;
   fra due lettere la strada più breve, senza zone né corridoio. Una fase
   sola, l'ingresso della prima lettera, che non si sposta perché tiene la
   partenza; le altre si spostano come prima. Somiglianza e distanza sono
   delle sole lettere; `distance_m` resta la lunghezza di tutti i
   `points`. Il percorso non è chiuso: si controlla solo dove comincia.
5. **Senza `pen_up` niente cambia**: le stesse funzioni con gli stessi
   argomenti, e un test confronta i percorsi di cinque parole (sul grafo
   dei fixture di Levico e su una griglia, anche con le partenze vicine)
   con le impronte di `main` a 59dd8a7, punto per punto.
6. **Il punteggio di una corsa** (`POST /track-scores`) prende i `walks`,
   facoltativi: la corsa si confronta con le sole lettere, e non contano le
   posizioni su un tratto a piedi né sulla linea dritta fra il suo inizio e
   la sua fine (una registrazione in pausa salta lì). **Il GPX del
   percorso** resta una linea sola e aggiunge un waypoint «Pause» e uno
   «Resume» per tratto (`GPX.md`).
7. **I percorsi tenuti** (`route_store.py`, ADR-0136) distinguono la penna
   alzata; la chiave delle altre richieste non cambia.

**Scartate**: pezzi separati al posto di `points` (sopra); un tratto a
piedi anche dalla partenza alla prima lettera (n tratti invece di n − 1:
la partenza è l'ingresso della prima lettera, come la fase 0 di una forma
aperta, TASK-041); tracciare ogni lettera andata e ritorno e tenerne
l'andata con `first_leg` (TASK-041), senza toccare `network.py`: costa il
doppio dei tracciamenti e rende economico ripassare ogni strada già fatta
anche all'andata (ogni lato sarebbe «ripassato»), col rischio di baffi
nelle lettere chiuse come la O;
copiare `snap_to_network` in `pen_up.py` per non cambiarlo (due copie
dello stesso tracciamento da tenere allineate); misurare ripercorrenza e
scale sulle sole lettere (le misure sono di tutto il percorso: anche nei
tratti a piedi si cammina); un `walks` che manca invece che vuoto nelle
risposte (un serializzatore apposta, e nessun vantaggio: le app installate
ignorano un campo in più).

**Conseguenze**: a parità di km le lettere sono più alte (la distanza è
delle lettere: «CIAO» 9,5 altezze invece di 16,2) e i tratti a piedi
aggiungono il 20–30% di strada: a Trento «CIAO» da 15 km fa 15,4 km di
lettere e 19,6 in tutto. L'app lo deve dire (TASK-198). Il percorso di
una parola con la penna alzata **non è chiuso**: chi legge `points`
supponendo che l'ultimo punto sia il primo (l'app pubblicata non lo
chiede mai) va guardato in TASK-198. Ogni cambio di `route_engine` cambia
`engine_fingerprint`, quindi dopo l'aggiornamento del server gli esempi
tenuti si ridisegnano (anche se i percorsi senza `pen_up` restano gli
stessi): server e `draw_examples` con l'ok dell'utente. Provato sulle
strade vere solo dalle zone già in cache (Trento, Levico), non giudicato
a occhio dall'utente.

## ADR-0158 — La penna alzata nelle corse salvate e nei preferiti: una colonna `walks`, e una richiesta rifiutata si rimanda come prima
**Stato**: Attiva · 2026-10-02 · deciso dall'agente su delega dell'utente
(TASK-199). Il cosa (le corse e i preferiti tengono i tratti a piedi) è
nei seguiti di TASK-198, assegnati dal coordinatore su delega
dell'utente; il contratto dei `walks` è ADR-0157, le corse salvate
ADR-0140, i preferiti ADR-0139.

**Contesto**: `PUT /me/activities/{key}` e `PUT /me/favorites/{key}`
rifiutano un campo che non conoscono (`extra="forbid"`): un'API precedente
a TASK-199 risponde `422 invalid_request` a una corsa o a un preferito con
`walks`. Una corsa nella coda del telefono che riceve `422` viene tolta
(ADR-0140: rimandarla non cambierebbe niente), quindi si perderebbe.
Server e app si aggiornano in momenti diversi, e tutti e due solo con
l'ok dell'utente: un server con TASK-197 ma senza TASK-199 dà già i
`walks` ai percorsi, e l'app li rimanderebbe.

**Decisione**:

1. **Una colonna `walks` (`jsonb`, default `[]`)** in `runs` e in
   `favorites`, nella stessa migrazione: indici nei punti della linea, come
   `RouteResult.walks`, non una geometria (la linea resta una, ADR-0157).
   Le righe di prima prendono `[]`. In `runs`, `walks` vuoto quando non c'è
   `route`. Il dettaglio (`GET /me/activities/{key}`, `GET
   /me/favorites/{key}`) ha **sempre** `walks`, vuoto per ogni altra corsa
   o percorso, come `RouteResult` (ADR-0157, punto 3); gli elenchi non
   cambiano.
2. **Nella richiesta `walks` è facoltativo**, controllato come in `POST
   /track-scores` (`walks_problem`): fuori dai punti, all'indietro, che si
   sovrappongono, o senza `points` per una corsa: `422 invalid_request`.
   Con i `walks` il punteggio di una corsa è quello delle sole lettere, lo
   stesso di `POST /track-scores` con gli stessi dati.
3. **`pen` nella pausa**, facoltativo, falso se manca, nel `pauses` già
   `jsonb` di `runs`: si scrive **solo quando è vero**, così le altre pause
   restano byte per byte quelle di prima. Per km e tempo vale come una
   pausa chiesta dal corridore (`auto` falso), come la manda l'app da
   TASK-198. Il dettaglio non ha le pause (non le aveva, e la linea corsa
   resta unita): `pen` sta nella riga, per chi la leggerà (TASK-117).
4. **L'app manda `walks` e `pen` solo per una parola con la penna alzata**,
   e solo i `walks` che stanno nei punti (`walksOf`): una corsa con
   `walks` sbagliati verrebbe rifiutata e persa. Per ogni altra corsa o
   percorso il corpo è quello di prima, campo per campo e nello stesso
   ordine; i test lo confrontano come testo.
5. **Un rifiuto si rimanda una volta come prima**: se l'API risponde `422
   invalid_request` a una corsa con `walks` o `pen`, l'app la rimanda
   subito senza (`withoutPenUp`); lo stesso per un preferito con `walks`.
   Un'API precedente a TASK-199 salva la corsa con il punteggio su tutto il
   percorso e le pause «penna» come pause del corridore, e tiene il
   preferito come una linea sola: com'era prima di TASK-199, invece di
   perdere la corsa o di mostrare «Extra inputs are not permitted» sotto il
   cuore. Senza rete, o con un altro errore, niente si rimanda: resta la
   regola di ADR-0140.
6. **I tipi restano nell'app** (`src/api/activities.ts`,
   `src/api/favorites.ts`), dove TASK-171 e TASK-172 li hanno messi:
   `shared-types` prende le fixture nuove (`activity-request-walks.json`,
   `activity-walks.json`, `favorite-request-walks.json`,
   `favorite-walks.json`) e un controllo nel suo test; quelle di prima
   restano com'erano, come richieste di un'app e risposte di un'API
   precedenti.
7. **Un preferito con i `walks`** si apre come una parola appena
   disegnata con la penna alzata: il risultato ha i `walks`, la richiesta
   `pen_up: true` (l'export GPX la rimanda all'API, che vuole `pen_up`
   solo con una parola: senza parola i `walks` non si leggono).

**Scartate**: una geometria per i tratti a piedi (una seconda linea da
tenere allineata alla prima); scrivere sempre `pen` (cambierebbe le pause
di ogni corsa, e i test di prima); le pause nel dettaglio della corsa
(nessuno le legge: la linea corsa resta unita, scelta dell'utente fuori
da qui); rimandare dopo ogni `422`, anche senza `walks` né `pen` (la
richiesta sarebbe la stessa); chiedere prima all'API che versione è (una
richiesta in più per ogni corsa, e la coda lavora anche quando la rete
torna dopo); spostare i tipi in `shared-types` (file usati da altri task
oggi, e nessun vantaggio per il contratto, che le fixture già tengono).

**Conseguenze**: la migrazione `0006` e i campi nuovi arrivano al
telefono solo dopo l'aggiornamento del server e la pubblicazione
dell'app, tutti e due con l'ok dell'utente. Con un'API precedente a
TASK-199 una corsa su una parola con la penna alzata si salva con un
punteggio più basso di quello visto a fine corsa (la camminata fra le
lettere conta), e un preferito si riapre come una linea sola: tenuto così,
resta così anche dopo l'aggiornamento (la chiave è la stessa, e il
secondo `PUT` non cambia niente). Un `422` di una corsa con i `walks`
costa una richiesta in più.

## ADR-0128 — Il profilo: `PATCH /me` per nome e bio, `GET /users/{public_id}` con un id casuale, mai l'email
**Stato**: Attiva · 2026-10-02 · deciso dall'agente su delega dell'utente
(TASK-116), dentro le scelte di ADR-0114 (gli iscritti vedono ciò che è
pubblicato, il feed non si legge senza account) e ADR-0115 (il database).
Numero tenuto dal coordinatore per TASK-116. La foto è di ADR-0146.

**Contesto**: ogni account ha un nome dall'iscrizione (ADR-0120) e, da
TASK-178, una foto che vede solo lui. Il profilo aggiunge la bio, il modo
di cambiare nome e bio, e una pagina che gli altri iscritti possono
leggere. Restava da dire con che id si chiede un profilo, chi lo può
leggere, cosa ci si legge e cosa vuol dire «numero di disegni» quando
pubblicare una corsa ancora non si può (TASK-117).

**Decisione**:
1. **`PATCH /me`** con solo quello che cambia (`username`, `bio`; assente
   o `null` resta com'è), risposta il `User` di adesso. Un endpoint solo
   per i due campi, come `GET /me` legge l'account: niente `/me/profile`.
   I valori rifiutati sono `422 invalid_request` con un messaggio scritto
   per le persone (non quello di Pydantic), che l'app mostra così com'è;
   il nome di un altro è `409 username_taken`, il codice dell'iscrizione.
   Con un errore non cambia niente.
2. **Il nome segue la regola dell'iscrizione** di ADR-0120: da 3 a 20 fra
   lettere, cifre, `_` **e `.`**, unico senza badare alle maiuscole. Il
   task file diceva «lettere, cifre e `_`», scritto prima di ADR-0120:
   due regole per lo stesso campo farebbero rifiutare in «Edit profile» un
   nome che l'iscrizione accetta, e un account con il punto non potrebbe
   rimetterlo. Il proprio nome con altre maiuscole si può.
3. **La bio**: al più 160 caratteri contati come li conta PostgreSQL (un
   carattere, non un byte né un'unità UTF-16: un'emoji è uno; l'app conta
   allo stesso modo), senza spazi in testa e in coda, a capo come `\n`,
   nessun carattere di controllo (un NUL farebbe fallire PostgreSQL). `""`
   la toglie. Una colonna di `users`, come diceva `DATABASE.md`: è corta e
   la legge ogni `GET /me`.
4. **`{id}` è `public_id`**, un UUID casuale (`gen_random_uuid()`) dato a
   ogni account dalla migrazione `0007`, anche a quelli di prima. Non
   `users.id`, che è in sequenza: direbbe quanti account ci sono e farebbe
   leggere tutti i profili uno dopo l'altro. Non il nome: cambia con
   `PATCH /me`, e un profilo aperto dal feed o da un commento salvato
   (TASK-118, 120) deve restare lo stesso. `User` porta `public_id` al
   proprietario, per i link che verranno; un id che non è un UUID è `404`,
   come uno sconosciuto.
5. **Il profilo lo legge solo un iscritto** (il token, come il feed,
   ADR-0114 punto 4), anche il proprio. Ha `public_id`, `username`, `bio`,
   `photo` (il JPEG in base64, come `GET /me/photo`: pochi KB, nessuna
   richiesta in più) e `drawings`. **Mai** email, `role`, `id` o data
   d'iscrizione: la risposta è un modello suo, non `User` con dei campi
   tolti, e un test cerca l'email in tutto il testo della risposta.
6. **«Numero di disegni» sono i disegni pubblicati**: le corse salvate sono
   private (ADR-0114, punto 4), e anche il loro numero dice qualcosa di
   chi corre. Pubblicare è di TASK-117: fino ad allora `drawings` è 0 per
   tutti, e TASK-117 cambia una riga di `profiles.py`. Se l'utente vuole
   contare anche le corse private, è una scelta sua (task file, «Esito»).
7. **Chi non ha un nome** non c'è: il nome è obbligatorio all'iscrizione
   dalla `0001` (`NOT NULL`), e `PATCH /me` non lo toglie. Chi non ha bio
   mostra solo nome e foto (o l'iniziale); chi non ha foto, l'iniziale.
8. **Nell'app** (`src/profile/`): «Edit profile» è un pulsante sotto il
   nome in «Profile» e una pagina di «Profile» (`EditProfile.tsx`, «←»
   torna senza salvare), non una riga di «Settings»: è la cosa che si
   cambia guardando il proprio profilo. Nome e bio cambiati diventano la
   sessione (`useAccount.editProfile`, che la tiene nel portachiavi come un
   ingresso): «Profile», «Settings» e il pulsante in alto li mostrano
   subito. La pagina del profilo di un altro (`UserProfilePage.tsx`) usa la
   stessa testa (`ProfileHeader.tsx`) e **non ha ancora una strada per
   arrivarci**: da dove si apre lo decide l'utente.
9. **Con un server di prima**: `User` senza `bio` né `public_id` si legge
   (campi facoltativi nei tipi dell'app), `PATCH /me` risponde `405
   http_error` e la pagina dice «Editing the profile is not available on
   this API yet.». L'app pubblicata, con il server nuovo, ignora i campi in
   più di `User` (`isUser` non li guarda).

**Scartate**: `users.id` come `{id}` (sopra); il nome come `{id}` (cambia,
e i link si romperebbero); un id corto fatto in Python (servirebbe un
generatore nella migrazione per gli account di prima, e `random()` di
PostgreSQL non è fatto per questo); il profilo aperto senza account (il
feed non lo è, ADR-0114); la foto a un indirizzo suo (`GET
/users/{id}/photo`: una richiesta in più per una pagina sola; per il feed,
con molti profili insieme, TASK-118 potrà aggiungerlo); contare le corse
private (sopra); un codice d'errore nuovo per il profilo che non c'è
(`404 http_error` è quello di un preferito o di una corsa che non c'è);
un limite ai `PATCH` al minuto (un `UPDATE` di una riga costa quanto un
`GET /me`, che non ha limiti); la regola del nome senza il punto (sopra).

**Conseguenze**: la migrazione `0007` riscrive `users` una volta (il
default casuale si calcola riga per riga): con gli account di oggi è un
attimo. Il server la prende solo con il suo aggiornamento, e «Edit
profile» si vede sul telefono solo dopo la pubblicazione dell'app, tutti e
due con l'ok dell'utente; finché il server non è aggiornato, «Save» dice
che l'API non ha i profili. TASK-117 conta i disegni pubblicati; TASK-118
e seguenti aprono il profilo di un altro con `public_id`.

## ADR-0159 — Pubblicare una corsa salvata: una tabella `drawings`, 200 m tagliati lungo la traccia, mai il percorso pianificato agli altri
**Stato**: Attiva · 2026-10-03 · deciso dall'agente su delega dell'utente
(TASK-117, parte A), dentro le scelte di ADR-0114 (corse private finché
non pubblicate; pubblicate le vedono gli iscritti, senza i primi e gli
ultimi 200 m). Due **scelte dell'utente** del 2026-10-03: il punteggio lo
vedono tutti; una corsa senza percorso si pubblica anche lei, senza
punteggio. Numero tenuto dal coordinatore.

**Contesto**: il task file di TASK-117 era scritto prima di TASK-172:
voleva `POST /drawings` per salvare un disegno a fine corsa. Salvare una
corsa c'è già («My activities», ADR-0140), con km, tempo e punteggio
contati dall'API. Restava pubblicarla: un titolo, «Public», cosa ne vedono
gli altri, come la si apre. L'app della fine corsa (`RunEnd.tsx`) e la
scheda della corsa sono di TASK-187 e TASK-200, in lavorazione: l'utente ha
scelto due PR, l'API adesso e l'app dopo.

**Decisione**:
1. **Una tabella `drawings`**, una riga per corsa titolata o pubblicata,
   con `run_id` unico e `ON DELETE CASCADE`: cancellare la corsa o
   l'account cancella il disegno, senza codice. Non colonne nuove in
   `runs`: `activities.py` resta com'è (è di TASK-200), e una corsa mai
   toccata non ha niente da dire agli altri.
2. **Un id suo, casuale** (`uuid`), con cui gli altri aprono il disegno
   (`GET /drawings/{id}`): la chiave della corsa è del telefono, unica solo
   dentro un account, e un numero in sequenza direbbe quante sono. L'id non
   cambia togliendo e rimettendo «Public»: un link resta buono.
3. **`PUT /me/activities/{key}/drawing` con la scelta intera** (`title` e
   `public`), non un `PATCH`: rimandato dopo un telefono senza rete non
   cambia niente la seconda volta, come il `PUT` della corsa. Accanto,
   `GET` dello stesso indirizzo e `GET /me/drawings` per sapere quali
   corse sono pubbliche, come `GET /me/activities/{key}/strava` di
   ADR-0156: gli endpoint di «My activities» non cambiano.
4. **Il taglio**: 200 m lungo la traccia pulita, da ognuna delle due
   estremità, con il punto del taglio interpolato in metri sul piano del
   segmento (`route_engine.geo`). Lungo la traccia, non in linea d'aria,
   perché così l'ha scelto l'utente (ADR-0114: «i primi e gli ultimi
   200 m»). Un cerchio di 200 m attorno a partenza e arrivo toglierebbe
   di più a chi gira attorno all'isolato prima di partire, ma bucherebbe a
   metà le forme che ripassano vicino alla partenza: da riproporre
   all'utente se serve. La linea tagliata si calcola nell'API a ogni `PUT`
   e si tiene in `drawings.track`, senza orari: la stessa corsa dà la
   stessa linea, e chi legge non ricalcola niente. Con meno di un metro
   rimasto la corsa non si pubblica (`422`, con il motivo in parole).
5. **Agli altri mai il percorso pianificato**, né orari, pause, `walks` o
   la chiave: il percorso parte dalla porta di chi corre, e tagliato
   direbbe lo stesso dove comincia il giro. Arrivano la traccia tagliata,
   il paese (già arrotondato, ADR-0140), forma o parola, km, tempo,
   punteggio, la data. Rifare la stessa forma partendo da un disegno di
   un altro è un'altra cosa (TASK-118 o dopo).
6. **Il punteggio è quello della corsa**, contato dall'API al salvataggio:
   il disegno non accetta numeri dall'app (`422` per un campo in più). Lo
   vedono tutti (scelta dell'utente). Una corsa senza percorso si pubblica
   con `score` `null` (scelta dell'utente): un disegno a mano libera.
7. **Il proprietario vede il suo disegno come lo vedono gli altri** da
   `GET /drawings/{id}`, anche privato (`public` falso); la corsa intera
   resta in `GET /me/activities/{key}`. Uno privato, per chiunque altro, è
   `404` come un id che non c'è.
8. **Il profilo conta i disegni pubblici** (`PublicProfile.drawings`) ed
   elenca solo quelli, a pagine, dalla corsa più recente, anche a chi lo
   guarda dal proprio account. Il cursore porta l'id casuale del disegno,
   non quello della riga.

## ADR-0160 — L'attività nei preferiti e le pause nel dettaglio di una corsa: una colonna con le attività dell'API, un rimando solo come prima
**Stato**: Attiva · 2026-10-02 · deciso dall'agente su delega dell'utente
(TASK-200). Il cosa (un preferito ricorda l'attività, il dettaglio di una
corsa ha le pause) è nei seguiti di TASK-190 parte C e TASK-199, assegnati
dal coordinatore su delega dell'utente; le aggiunte al contratto seguono
ADR-0157 e ADR-0158, i preferiti ADR-0139, le corse ADR-0140, la bici
ADR-0153. Numero tenuto dal coordinatore per TASK-200.

**Contesto**: `favorites` non sapeva l'attività: un percorso in bici,
riaperto, si esportava come una corsa. Il dettaglio di una corsa non aveva
le pause, che la riga tiene, `pen` compreso, da TASK-199 (ADR-0158 le
lasciava fuori perché nessuno le leggeva). `PUT /me/favorites/{key}`
rifiuta un campo che non conosce, e server e app si aggiornano in momenti
diversi.

**Decisione**:

1. **Una colonna `activity`** in `favorites` (migrazione `0008`), `text
   NOT NULL DEFAULT 'running'`, con il vincolo `activity IN ('running',
   'cycling')`: le attività dell'API (`SUPPORTED_ACTIVITIES`), come
   `style` elenca i suoi valori. Un'attività nuova vuole una migrazione che
   allarghi il vincolo; un test tiene un preferito per ogni attività
   dell'API, così l'API non può offrirne una che il database rifiuta
   (sarebbe un 500). I preferiti di prima diventano `running`.
2. **Nella richiesta è facoltativa** (`running` se manca), controllata con
   `check_supported`, le parole di `POST /routes`; l'elenco e il dettaglio
   la hanno **sempre**. La chiave resta quella della linea (ADR-0139): la
   stessa linea è un preferito solo, con l'attività della prima volta.
3. **L'app la manda solo quando non è `running`**, ultima dopo `walks`: la
   richiesta di una corsa resta quella di prima, campo per campo. La
   prende dalla richiesta del percorso disegnato; quelli di «Explore» e a
   tema non la mandano. Un preferito riaperto la mette nella sua richiesta
   (quella che «Export GPX» manda), qualunque sport dica «Settings».
4. **Un rifiuto si rimanda una volta sola, come un'app precedente a
   TASK-199**: se `PUT` torna `422 invalid_request` a un preferito con
   `walks` o `activity`, l'app lo rimanda subito senza tutti e due
   (`asBefore`), la richiesta che ogni API da TASK-171 accetta. Un'API con
   TASK-199 e senza TASK-200 perde così i `walks` di una parola con la
   penna alzata tenuta in bici: un caso che non c'è (il server prenderà
   TASK-199 e TASK-200 insieme), contro un secondo rimando in più.
5. **L'app legge un'attività che manca, o che non conosce, come `running`**
   (`favoriteActivity`): l'elenco accetta qualunque stringa, come fa con
   `style`, perché un preferito di un'attività arrivata dopo (la canoa)
   non deve far sparire l'elenco a un'app più vecchia; quel preferito si
   esporta come una corsa, come prima di TASK-200.
6. **`pauses` nel dettaglio di una corsa**, sempre (`[]` se non ce ne
   sono), così come la colonna le tiene: `from_s`, `to_s`, `auto`, e
   `pen` solo quando è vero; in secondi dal primo punto di `track`, solo
   quello che di ogni pausa sta dentro la corsa, nell'ordine mandato, le
   sovrapposte come sono. L'elenco non le legge (una colonna in meno per
   20 righe). Nella risposta sono un `TypedDict` con `pen` non
   obbligatorio: così `pen: false` non compare, su ogni Pydantic 2 e su
   Python 3.11 (da `typing_extensions`, che Pydantic ha già). L'app le
   accetta solo ben fatte, e non le mostra: spezzare la linea corsa sulle
   pause è una scelta dell'utente. Questo toglie una delle «Scartate» di
   ADR-0158, che le lasciava fuori perché nessuno le leggeva.

**Scartate**: un'attività senza vincolo nel database (un errore di
battitura dell'API resterebbe scritto); un formato (`^[a-z]+$`) invece
dell'elenco (non dice quali sono); rimandare due volte, prima senza
`activity` e poi senza `walks` (due richieste per un caso che non c'è);
leggere dagli errori di Pydantic quale campo l'API non conosce (testi che
cambiano con le versioni); un'attività sconosciuta come risposta sbagliata
(tutto l'elenco non si aprirebbe); `exclude_if` di Pydantic per `pen`
(una funzione recente, mentre FastAPI chiede soltanto Pydantic 2.9); un `model_serializer` (lo
schema OpenAPI della pausa resterebbe vuoto).

**Conseguenze**: la migrazione `0008` e i campi nuovi arrivano al telefono
solo dopo l'aggiornamento del server e la pubblicazione dell'app, tutti e
due con l'ok dell'utente. Un preferito in bici tenuto con un'API
precedente a TASK-200 è una corsa, e resta tale (si toglie e si rimette).
Le indicazioni di «Start» e il punteggio non hanno l'attività: `POST
/route-directions` prende solo i punti e cerca sulla rete a piedi, `POST
/track-scores` confronta due linee; dare l'attività a `/route-directions`
è un'aggiunta al suo contratto, da decidere con cosa fa «Start» in bici
(TASK-190, parte C, seguito 2).

## ADR-0162 — Ciò che il motore tiene per grafo vale finché NetworkX non cambia il grafo
**Stato**: Attiva · 2026-10-03 · deciso dall'agente su delega dell'utente
(TASK-203; proposte A1 e A2 approvate dal coordinatore)

Il piano della partenza costa 4,5–7,5 s sulle richieste lunghe di Trento
(TASK-203). Fra l'11 e il 30% era il controllo delle cache del corridoio:
ADR-0059 le rifaceva «se cambia il numero di archi», e `number_of_edges()`
di NetworkX su un `MultiDiGraph` conta gli archi nodo per nodo (7–12 ms),
due volte per tracciamento, fino a 40 tracciamenti per richiesta e
altrettanti in ogni partenza vicina. In più `nearest_nodes` e
`_route_through_zones` rifacevano a ogni chiamata la lista delle coordinate
di tutti i nodi (quasi un milione di letture per un cuore da 10 km).

**Decisione**:
- I dati tenuti per grafo (campioni degli archi, punti distinti, passi
  u→v, e ora id e coordinate dei nodi, `_node_table`) valgono finché il
  grafo ha lo stesso **segno** in `graph.__networkx_cache__`. NetworkX
  (dalla 3.3, che `ZoneCrop` già richiede) svuota quel dizionario a ogni
  nodo o arco aggiunto o tolto: un segno sparito vuol dire grafo cambiato.
  Niente più conteggio degli archi. Sostituisce il «rifatta se cambia il
  numero di archi» di ADR-0059; il resto di ADR-0059 resta.
- Il nodo pozzo di `_route_through_zones` entra e esce a ogni zona: tolto,
  il grafo è quello di prima nodo per nodo e arco per arco, nello stesso
  ordine, e il segno gli si ridà (`_same_graph`).
- Una vista di un altro grafo (`subgraph`) cambia con lui senza che
  NetworkX lo dica: per una vista non si tiene niente.
- `nearest_nodes` e `_route_through_zones` prendono id e coordinate dei
  nodi dalla tabella del grafo: gli stessi numeri, nello stesso ordine.

**Perché così**: gli stessi percorsi punto per punto, e lo dicono tre
prove: 7 casi fissati in `test_kept_per_graph.py` sul codice di prima
(griglia, una città finta con parchi e un fiume, la fixture di Levico; con
partenze vicine, alternative e ricerca lontana), i 5 casi di Trento di
TASK-203 e le richieste del registro rifatte prima e dopo. Sul Mac tolgono
1,1–1,6 s alle richieste lunghe di Trento (14–36%) e il 15–43% della CPU di
una richiesta, contando le partenze vicine. Il
segno vede anche ciò che il conteggio non vedeva: un arco tolto e uno
aggiunto lasciano lo stesso numero di archi.

**Scartato**: passare i dati dalla ricerca ai tracciamenti (cambia la firma
di `snap_to_network` e tocca `pen_up.py`, i cui tracciamenti delle lettere
sono quelli che guadagnano di più); tenere i dati per grafo senza nessun
controllo (un grafo cambiato, in un test o in una richiesta futura, li
troverebbe vecchi); controllare solo il numero dei nodi (non vede gli
archi).

**Conseguenze**: una modifica fatta sul posto agli attributi di un arco non
si vede, come prima. Con una NetworkX che non svuota `__networkx_cache__`
(prima della 3.3) i dati resterebbero vecchi: lo dice
`test_a_change_to_the_graph_is_seen`, e `ZoneCrop` già non funzionerebbe.
Il grafo mandato alle partenze vicine (`OneGraph`) porta con sé il segno,
pochi byte, che nel processo nuovo non corrisponde a niente: lì i dati si
calcolano da capo, come prima. Cambia l'impronta del motore
(`engine_fingerprint`): i percorsi tenuti si buttano e dopo l'aggiornamento
del server va rilanciato `draw_examples` (`AGENTI.md`, regola 11).

## ADR-0161 — La canoa nel motore: 1–5 km, 200 m dalla riva al mare, solo forme del catalogo, la validazione sull'acqua
**Stato**: Attiva · 2026-10-03 · **scelta dell'utente** per le distanze
(1–5 km) e per quanto stare lontani dalla riva (200 m al mare, 50 m sui
laghi); il resto deciso dall'agente su delega dell'utente (TASK-191,
parte A2). Aggiorna ADR-0154.

**Contesto**: A1 (ADR-0154) ha messo nel motore l'acqua, la fascia entro
1 km dalla riva e la ricerca di dove la forma ci sta, ma solo da `python
-m route_engine.water`. A2 collega la canoa a una richiesta: l'attività,
le distanze, la CLI, la validazione. L'utente ha guardato i nove campioni
di A1 (Riccione, Jesolo, Riva del Garda): «buoni, ma troppo vicini alla
riva» (la forma passava a 60–80 m dalla spiaggia).

**Decisione**:

1. **Le distanze** (scelta dell'utente): `DISTANCE_LIMITS_M["paddling"] =
   (1000, 5000)`, un limite solo come per corsa e bici. Al mare una forma
   sta fino a circa 3 km: oltre, `WaterFitError` dice a quanti km ci sta
   (`best_distance_m`, come TASK-031), e l'app lo può proporre.
2. **Dalla riva** (scelta dell'utente): al mare la forma sta oltre
   **200 m** dalla riva, fuori dalla fascia dei bagnanti di molte
   ordinanze (`water.SEA_SHORE_MARGIN_M`): dalla fascia si toglie il mare
   entro 200 m dalla terraferma e dalle isole di almeno 1 ha. Sui laghi, e
   attorno a scogli e frangiflutti, restano 50 m e 30 m. Solo i tratti
   dalla riva attraversano i 200 m.
3. **Fra i centri buoni, quelli da cui si arriva alla riva**
   (`water_fit._join_costs`, `_promising`): A1 teneva, per ogni scala e
   angolo, i tre centri il cui contorno passava più vicino alla partenza
   chiesta. Con tratti di almeno 200 m questo non regge: dietro il
   frangiflutti della fixture i tre centri più vicini erano a più di 300 m
   da ogni riva raggiungibile, e un cuore da 2 km «ci stava a 2,2 km»
   mentre accanto, davanti alla spiaggia, ci stava a 2 km. Ora ogni cella
   della fascia ha il costo di unirla alla riva (i due tratti fino al
   punto della riva raggiungibile più vicino, entro 2 km dalla partenza,
   più lo spostamento fino a lì, con i pesi del costo), e si tengono i tre
   centri il cui contorno passa dove costa meno; a parità, i più vicini
   alla partenza.
4. **Le scale, con i loro tratti**: nessun tratto è più corto della via
   dal punto della riva raggiungibile più vicino alla fascia (al mare
   circa 200 m). Le scale per cui forma e tratti sono già oltre il +10%
   si saltano, e la ricerca si ferma quando |scala + tratti − 1| + 2 ·
   tratti (il costo minimo di qualunque forma più piccola) non batte il
   migliore trovato. Senza, al mare la ricerca scendeva 15 scale invece di
   5: un cuore da 2 km sulla costa della fixture 5,7 s, ora 0,4 s; i test
   dell'acqua girano in 5,2 s come in `main`.
5. **`paddling` è un'attività del motore, non ancora del contratto**:
   entra in `ACTIVITIES` con `DISTANCE_LIMITS_M`, ed è in
   `WATER_ACTIVITIES` (`models.py`), le attività senza rete: non è in
   `network.NETWORKS` e non ci deve essere. `SUPPORTED_ACTIVITIES` e
   `shared-types` la prendono con la parte B, come per la bici
   (ADR-0153): fino ad allora l'API la rifiuta come prima.
6. **Sull'acqua solo forme del catalogo**: una parola, un'immagine o un
   contorno da file sono `InvalidRequestError` («on the water only a
   shape of the catalogue is drawn, not a word»), da
   `models.check_drawn_on_land`: nella `RouteRequest` per una parola
   (prima della distanza per lettera, che direbbe altro), nella CLI per
   immagine e contorno prima di tracciare l'immagine; l'API la usa per le
   immagini nella parte B (`ON_WATER_SHAPES_ONLY`). Una parola vuole 3 km
   a lettera (`LETTER_DISTANCE_M`): in 5 km ci sta una lettera. Il
   contorno di un'immagine ci starebbe (`water_fit` prende qualunque linea
   chiusa), ma è una cosa che l'utente vede: si apre dopo, se la chiede.
7. **La validazione sull'acqua** (`validation.check_on_water`, da
   `water_fit.measure`): chiuso; nessun metro sulla terra oltre mezzo
   metro dentro (`ON_LAND_M`: il tratto parte dal bordo dell'acqua);
   nessun punto oltre 1000 m dalla riva; la distanza entro ±10%. Non sono
   warning: un percorso che non li rispetta è un errore del motore
   (`InvalidRouteError`), come un percorso aperto sulle strade. Niente
   scale, strade principali, sterrati e ripercorrenza.
8. **Il piano di una richiesta** (`route_engine/paddling.py`, nuovo):
   `plan_paddling(request, source)` disegna la forma con 128 punti (il
   contorno è il percorso: il doppio di una forma sulle strade, come i
   campioni), la piazza con `plan_on_water`, la controlla e dà
   `WaterPlan`: il `RouteResult` (somiglianza 1, nessun warning, nessuna
   indicazione di svolta: le dà l'API dal grafo, che sull'acqua non c'è,
   parte B), il `WaterRoute` e l'acqua. La usano la CLI e, nella parte B,
   l'API.
9. **La CLI**: con `--activity paddling` il piano è `plan_paddling` con
   `OverpassWaterSource(<cache-dir>)`, deciso prima di qualunque grafo
   delle strade; stampa scala, rotazione, partenza sulla riva e il suo
   tipo, tratto, distanza, quanto la forma sta lontana dalla terra e il
   punto più lontano dalla riva. `--score-track` vale (servono solo i
   punti); `--nearby` e `--no-optimize` sono delle strade e si rifiutano;
   `--reuse-penalty` sull'acqua non conta.
10. **Le fixture**: la coastline della costa prosegue dritta fino a ±9 km,
    così taglia anche l'area di una richiesta (circa 8 km di lato per un
    cuore da 2 km); `build_area` la taglia al riquadro chiesto, e i test
    di A1 vedono la stessa costa. I test della CLI mettono l'acqua delle
    fixture in una cartella di cache, col nome dell'area della richiesta,
    come la lascerebbe un download; un download nei test è un errore.

**Misurato sulle fixture** (dati veri non scaricabili oggi: la cartella
di A1 con le risposte dell'API di OSM non c'è più): sulla costa la forma
sta a 208–223 m dalla terra, con tratti di 209–223 m per lato; a 1 km la
forma è il 58% del giro, a 2 km il 79%, a 3 km l'85%; il cuore ci sta fino
a 3,0 km, il cerchio a 2,8, la stella a 3,4. Sul lago, come in A1: tratti
di 59–96 m, 1–5 km tutti disegnati, scala 0,88–0,97. Ogni piano al più un
secondo.

**Alternative scartate**: un limite per il mare e uno per i laghi (1–3 e
1–5 km: il limite dipenderebbe dall'acqua, che si conosce solo dopo
averla letta, e l'app non saprebbe cosa proporre prima); 1–3 km ovunque
(offerte all'utente, che ha scelto 1–5); 200 m anche sui laghi, o 100 m
ovunque (offerte all'utente); 200 m anche dagli scogli (non c'è una
spiaggia di bagnanti attorno a uno scoglio); tratti più lunghi (300 →
450 m) invece di scegliere i centri dalla riva (accanto al frangiflutti
avrebbe preso tratti di 380 m invece di 215); parole e immagini
sull'acqua adesso; una rete della canoa in `NETWORKS`; i controlli
sull'acqua come warning.

**Conseguenze**: la richiesta `running` non cambia (nessun modulo delle
strade è toccato; `models.py` aggiunge la canoa e rifiuta solo le parole
sull'acqua). I campioni v1 del mare (Riccione, Jesolo) non sono più quello
che il motore disegna, e quelli di Garda vengono da una scelta dei centri
diversa: si rifanno tutti, con Como, quando Overpass risponde o dal
server con l'ok dell'utente (punto 5 di A2). `engine_fingerprint` cambia:
dopo il prossimo aggiornamento del server gli esempi tenuti si
ridisegnano (`draw_examples`). Per la parte B: `SUPPORTED_ACTIVITIES`,
`shared-types`, l'API che chiama `plan_paddling` con la cache dell'acqua
del server e manda `NoWaterError` e `WaterFitError` come
`shape_not_drawable` con la distanza suggerita, e le immagini rifiutate
con `check_drawn_on_land`. Le regole del posto restano fuori: i 200 m
non dicono che un percorso è permesso, e i tratti attraversano la fascia
dei bagnanti (l'avviso di sicurezza della parte C).

## ADR-0163 — La grafica della corsa in corso: il numero prima del nome, pulsanti tondi con icone disegnate, barre grigie per i km
**Stato**: Attiva · 2026-10-03 · deciso dall'agente su delega dell'utente
(TASK-204). La richiesta è dell'utente («Migliora la parte grafica di
quando registri una corsa»); il modo, qui sotto, è dell'agente. Numero
preso come primo libero dopo ADR-0162, con TASK-204 dato dal coordinatore.

**Contesto**: la schermata di TASK-169 (ADR-0137) aveva tutto quello che
serve, ma sotto la mappa tre riquadri uguali, con il nome sopra il numero:
la distanza, il numero che si cerca, pesava quanto il tempo. «Pocket» e
«Music» erano pillole di testo accanto a un «Pause» tondo; «Paused» una
riga grigia; gli interruttori due scatole con «On» e «Off»; i km di «Data»
una tabella senza niente da vedere. L'app non ha librerie di icone né di
grafica (niente SVG), e una dipendenza nuova va chiesta.

**Decisione**:

1. **Il numero prima del nome**: valore grande, unità piccola accanto, nome
   sotto in maiuscolo spaziato (lo stile delle etichette di sezione
   dell'app, `fontSize.label`). Su «Map» niente riquadri: la distanza più
   grande (`fontSize.display`) e con più larghezza, poi passo e tempo
   (`fontSize.title`), separati da righe sottili.
2. **Tutti i pulsanti della corsa tondi, con il nome sotto**: «Pocket» e
   «Music» di 56 punti (`MIN_TAP_SIZE + space.md`, come «Map» e «Data»),
   centrati sull'altezza di «Pause» (72) così cerchi e nomi stanno in riga.
   Le icone sono `View` (un telefono) e il carattere «♪»: come già la
   pausa, il «play» e lo «stop».
3. **Le barre dei km** vanno dal più lento (0,35 della larghezza) al più
   veloce (intera), non in proporzione al passo: fra un km a 5:00 e uno a
   5:20 la proporzione darebbe barre quasi uguali. Grigie (`borderStrong`)
   e la più veloce chiara (`text`): **non gialle**, il giallo è del percorso
   (ADR-0046).
4. **Gli interruttori disegnati**: la pista chiara col pallino a destra
   acceso, scura col pallino grigio a sinistra spento; la riga resta tutta
   da toccare, come prima.
5. **Il conto alla rovescia** si anima con `Animated` di React Native
   (driver nativo): il numero entra rimpicciolendo, un anello giallo si
   allarga e svanisce. Il giallo resta quello dell'azione che il conto
   annuncia (ADR-0137).
6. Nessun colore nuovo, nessun token nuovo: tutto da `tokens.ts`.

**Perché così**: è il modo delle app di corsa che l'utente ha preso a
riferimento (Nike Run Club, TASK-169): il numero si legge per primo,
correndo, e il nome serve una volta sola. Pulsanti tutti tondi e con il
nome sono un solo linguaggio fra corsa e pausa. Nessuna dipendenza: le
forme da disegnare sono poche e semplici.

**Scartato**: una libreria di icone (`@expo/vector-icons`, dipendenza
nuova per due icone); `Switch` di React Native (nativo, colori e forma
diversi fra iOS e Android, fuori dai token); colorare i km più veloci o
più lenti di verde e rosso (colori nuovi con un significato nuovo);
abbassare «Map» e «Data», che l'utente ha voluto alti (TASK-186);
cambiare la linea della corsa sulla mappa o l'attribuzione (sono della
mappa, comune a ogni schermata).

**Conseguenze**: anche il riquadro di fine corsa senza percorso
(`FreeFinishCard`, che usa `RunGrid`) prende il nome sotto il numero. I
test che cercano i numeri per etichetta d'accessibilità non cambiano:
«Distance: 2.30 km» è lo stesso. Il carattere «♪» viene dal font del
telefono: su un Android senza quel segno si vedrebbe un quadratino, da
guardare quando l'app avrà una build Android.

## ADR-0164 — La canoa nell'API: l'acqua nella cache del server, nessuna indicazione né alternativa, la distanza suggerita per difetto al mezzo km
**Stato**: Attiva · 2026-10-03 · deciso dall'agente su delega dell'utente
(TASK-191, parte B: l'API). Le distanze, 1–5 km, e «l'errore dice a
quanti km la forma ci sta» sono **scelte dell'utente** (ADR-0161).

**Contesto**: A2 (ADR-0161) ha messo la canoa nel motore
(`paddling.plan_paddling`), ma non nel contratto: l'API la rifiutava come
un'attività qualunque. La bici, nella sua parte B (ADR-0153), ha dato a
ogni attività le zone della sua rete (`activity_graphs.py`); la canoa non
ha una rete, ha l'acqua (`water.OverpassWaterSource`), e il suo piano non
passa dal grafo: niente partenze vicine, niente alternative, niente
indicazioni.

**Decisione**:

1. **Il contratto, solo aggiunte**: `SUPPORTED_ACTIVITIES = ("running",
   "cycling", "paddling")` nel motore, `ACTIVITIES` e
   `DISTANCE_LIMITS_M.paddling = [1000, 5000]` in `shared-types`,
   `contract.json`, la fixture `route-request-paddling.json` letta dai
   test dei due lati. L'app ha un `Record<Activity, …>` dei suoi limiti
   (`distance.ts`) che vuole la riga della canoa per compilare, e due test
   che usavano `"paddling"` come esempio di attività sconosciuta (ora
   `"swimming"`): tre righe, col permesso del coordinatore; l'app non
   cambia comportamento, perché «Paddle» resta «Soon» (parte C).
2. **L'acqua dell'API**: `ActivityGraphs` tiene, accanto alle zone delle
   attività sulle strade (`ROAD_ACTIVITIES`), l'acqua
   (`paddling.ServerWater`: `OverpassWaterSource` su `<cache>/water/`,
   cioè `--cache-dir` come le zone, sul server `data/cache/water/`).
   `ground_for` dà a una richiesta le zone della sua rete o l'acqua; il
   planner dell'API (`plan_request`) sceglie dall'attività e chiama
   `plan_paddling`. Così `/routes`, `/route-jobs` e il replay dicono la
   stessa cosa, e i test che sostituiscono il planner restano come sono.
3. **Il download dell'acqua** è uno alla volta (un lucchetto, e la cache
   ricontrollata dopo), e uno non riuscito è `503 map_data_unavailable`,
   come una zona. Il job lo mostra come `downloading_map`, e uno annullato
   nel frattempo si ferma prima di piazzare la forma (`_ReportingWater`,
   come `_Reporting` per i grafi). Nessuna zona da preparare:
   `prefetch_zones --activity` è solo per corsa e bici.
4. **Il risultato** è il `RouteResult` del motore: somiglianza 1,
   `directions` vuoto (si leggono sul grafo, e sull'acqua non c'è),
   `alternatives` vuoto (il motore piazza la forma una volta), nessun
   avviso. Il GPX è quello di ogni percorso.
5. **La distanza suggerita, per difetto al mezzo km**
   (`errors.WATER_STEP_M`): `WaterFitError` porta la distanza a cui la
   forma ci sta (`best_distance_m`), e `suggested_distance_m` è quella
   arrotondata **per difetto** al mezzo km, fra 1 e 5 km, `null` se ci sta
   solo sotto 1 km. Sull'acqua una forma ci sta fino a una certa grandezza
   e non oltre: al km più vicino «ci sta a 2,6 km» diventerebbe 3 km, la
   cui tolleranza (±10%, 2,7–3,3 km) non arriva a 2,6, e la distanza
   suggerita, chiesta, fallirebbe di nuovo. Il mezzo km perché la canoa va
   da 1 a 5 km e il campo dell'app prende un decimale. Corsa e bici restano
   al km più vicino (ADR-0041, ADR-0153). Sulle fixture: cuore da 5 km al
   mare, «ci sta a 3,1 km» → 3000, chiesto → disegnato; cerchio da 4 km,
   «2,8» → 2500, chiesto → disegnato (test).
6. **Parole e immagini** (ADR-0161): la parola la rifiuta già
   `RouteRequest`; l'immagine `ImageRequest`, prima della distanza («on the
   water only a shape of the catalogue is drawn, not an image»), da
   `/image-route-jobs` e da `/gpx`.
7. **`/route-directions` resta senza attività**: la richiesta ha solo i
   punti, e un campo in più l'API di prima lo rifiuterebbe (`extra:
   forbid`). Con i punti di un percorso sull'acqua l'API carica la zona a
   piedi attorno alla linea e risponde `422 invalid_request` («The route
   does not follow the roads of this map.», test). L'app non le deve
   chiedere: il percorso di un job sull'acqua ha già `directions` vuoto.
8. **I preferiti**: la migrazione `0010_favorite_paddling.sql` allarga il
   vincolo della `0008`, come diceva il suo commento.
9. **Esempi**: gli esempi tenuti (`route_store`) hanno già l'attività
   nella chiave. `draw_examples` non disegna la canoa: dove stanno laghi e
   mare in «Explore» è una scelta di prodotto (domanda 3 del task file).

**Alternative scartate**: una «rete» finta della canoa in
`ActivityGraphs`, un `GraphLoader` che dà l'acqua (il motore la
rifiuterebbe giustamente, e il tipo mentirebbe); il piano sull'acqua
chiamato fuori dal planner, nei tre posti che lo usano (tre copie della
stessa scelta); la distanza suggerita al km più vicino come per le strade
(sopra); scaricare un'area più larga di quella della richiesta, perché le
partenze vicine trovino lo stesso file (l'acqua letta dal motore non
sarebbe più quella della CLI per la stessa richiesta: è un seguito, con
le aree d'acqua preparate prima); un campo `activity` in
`/route-directions`; un messaggio dell'API che sostituisce quello del
motore.

**Conseguenze**: una richiesta `paddling` all'API ora disegna sull'acqua;
la corsa e la bici non cambiano (test di prima, tranne l'esempio di
attività rifiutata). **Ogni partenza nuova sull'acqua è una richiesta
Overpass** per un'area di 8–10 km di lato: Overpass rifiuta dopo molti
download, e dal Mac oggi non risponde; la richiesta d'acqua non è mai
stata provata dal vero (ADR-0154). Seguiti: le aree d'acqua dei quattro
luoghi d'esempio scaricate prima sul server, con l'ok dell'utente. Cambia
`models.py`, quindi `engine_fingerprint`, già cambiato da A2: un solo
aggiornamento del server, poi `draw_examples`. Per la parte C: «Paddle»
pronto, l'avviso di sicurezza, i testi «does not fit the roads» da dire
per l'acqua, e niente `/route-directions` sull'acqua.
