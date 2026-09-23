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

**Da decidere entro**: fase 2, TASK-022.

## ADR-0010 — Metrica di somiglianza
**Stato**: Superata da ADR-0023 (e ADR-0025) · 2026-09-23

Hausdorff contro Fréchet discreta: si implementano entrambe in TASK-015, si
confrontano con il giudizio a occhio e si sceglie con dati alla mano.

**Da decidere entro**: fine fase 1.

## ADR-0011 — Provider di mappe e tiles
**Stato**: Superata da ADR-0029 · 2026-09-23

## ADR-0012 — Provider e modello AI
**Stato**: Aperta · **Da decidere entro**: TASK-030

Vincolo già fissato: dietro un'interfaccia astratta, sostituibile senza
toccare l'architettura.

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
**Stato**: Attiva · 2026-09-22

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
**Stato**: Attiva · 2026-09-23

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
**Stato**: Attiva · 2026-09-23

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

