# TASK-019 — Anteprima dei campioni su mappa

**Stato**: Todo
**Fase**: 1 · **Branch**: `feat/TASK-019-sample-preview`

## Obiettivo

Un solo comando genera una pagina HTML autonoma che mostra su una mappa
tutti i GPX che corrispondono a un pattern (per esempio
`samples/TASK-017_*_v1.gpx`): un livello per file, accendibile e
spegnibile, con nome, distanza e numero di punti.

## Perché esiste

Ogni task di fase 1 produce 12 campioni, e ognuno va giudicato a occhio
(`TEAM_WORKFLOW.md`, `samples/README.md`). Oggi si caricano uno alla volta
in gpx.studio: dodici caricamenti a ogni versione, e altrettanti per rifare
un confronto prima/dopo. Con una pagina per pattern il giro diventa un
comando e un doppio clic, e il prima/dopo è un pattern con `v*`.

## Contesto da leggere

- `samples/README.md` (nomenclatura, come si guarda un campione)
- `docs/TESTING.md` §Verifica visiva e §CI
- `docs/DECISIONS.md` ADR-0011 (provider di mappe e tiles, aperta) e
  ADR-0014
- `docs/ARCHITECTURE.md` §2 (albero del repository)
- `.github/workflows/ci.yml`

## Cosa fare

1. **Fermarsi e chiedere conferma.** Nessuna di queste scelte è in
   `DECISIONS.md`; l'ADR si scrive nella PR che implementa, non prima.
   - **Libreria e tile.** Proposta: **Leaflet** 1.9 da CDN (unpkg o
     cdnjs), con versione fissata e hash SRI; tile **standard di
     OpenStreetMap** (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`)
     con l'attribuzione «© OpenStreetMap contributors», linkata a
     `https://www.openstreetmap.org/copyright` e sempre visibile.
     La [policy delle tile OSM](https://operations.osmfoundation.org/policies/tiles/)
     ammette un uso leggero, interattivo e personale come questo; vieta i
     download massivi e quelli per l'uso offline. La pagina quindi non
     scarica niente in anticipo: carica solo le tile che si guardano.
     - Alternative: MapLibre GL JS (è la libreria dell'app, ma più pesante,
       e stile e provider per l'app sono la decisione di ADR-0011);
       continuare con gpx.studio.
     - ADR-0011 (Aperta, da decidere entro TASK-021) riguarda l'app.
       Proposta: la nuova ADR vale solo per questo strumento di sviluppo e
       lascia aperta ADR-0011.
     - **Da verificare per primo**: la policy chiede un Referer valido alle
       pagine web, e una pagina aperta da `file://` non lo manda. Se le
       tile vengono rifiutate, si torna a chiedere: servire la cartella con
       `python -m http.server` (libreria standard, ma niente più doppio
       clic) oppure un altro provider (ADR-0011).
     - La pagina è autonoma ma non offline: Leaflet e tile arrivano dalla
       rete. Copiare Leaflet dentro l'HTML (circa 150 KB) toglierebbe il
       CDN: non proposto, sarebbe una dipendenza aggiornata a mano.
   - **Dove va l'HTML.** Proposta: in `out/`, già ignorato da git
     (ADR-0014); per default `out/preview.html`, con `--out` per cambiarlo.
     La pagina si sovrascrive: è usa-e-getta e si rigenera dai GPX
     versionati. Alternativa: versionarla accanto ai campioni, che
     duplicherebbe i dati dei GPX senza che GitHub la mostri come pagina.
   - **Cartella `tools/`** nuova alla radice, fuori dal route-engine: va
     aggiunta ad `ARCHITECTURE.md` §2 e alla Struttura del README.
   - **Test e lint in CI.** Oggi la CI lavora solo in
     `services/route-engine/`. Proposta: un passo in più nello stesso job,
     dalla radice: `ruff check`, `black --check` e `pytest` su `tools/`,
     con le regole di `services/route-engine/pyproject.toml` (`--config`)
     invece di una seconda configurazione. Si fa dopo il merge di
     TASK-018, che tocca lo stesso `ci.yml`.
2. **Script** `tools/preview_samples.py`: solo libreria standard,
   Python 3.11, type hints.
   - `python tools/preview_samples.py "samples/TASK-017_*_v1.gpx"
     [--out out/preview.html]`: uno o più pattern, espansi dallo script
     con `glob` e ordinati (PowerShell non espande i pattern, bash sì:
     funziona in entrambi i casi).
   - Parsing con `xml.etree.ElementTree` dei `trkpt` di GPX 1.1
     (namespace `http://www.topografix.com/GPX/1/1`), come li scrive
     `export_gpx.py`.
   - Nome del livello = nome del file senza estensione: il `<name>` del
     GPX (`heart 5 km · 2026-09-22`) non distingue zona e versione.
   - Distanza con haversine e raggio 6 371 000 m, lo stesso di
     `route_engine/geo.py`, senza importare il route-engine (lo script gira
     senza il venv). Verificato scrivendo questo task: sui 12 campioni
     `TASK-017_*_v1` dà le distanze di `samples/LOG.md` a 0,1 km.
   - Dati incorporati come JSON in `<script type="application/json">`,
     con `<` scritto `<`, perché nessun nome possa chiudere il tag.
     Così la pagina si apre da `file://` senza server. Per i 12 campioni
     sono circa 19 000 punti, mezzo MB di pagina.
   - Un colore per livello da una tavolozza fissa, nell'ordine dei file;
     controllo dei livelli di Leaflet per accendere e spegnere; nome,
     distanza (km, una cifra decimale come in `LOG.md`) e punti
     nell'etichetta del livello o in un popup; all'apertura la mappa
     inquadra tutte le tracce.
   - Uscita deterministica: stesso input, stessi byte (niente data o ora
     di generazione nella pagina).
   - Errori di una riga ed exit code 2, senza traceback, come la CLI
     (TASK-010): pattern senza file, GPX malformato o senza punti (con il
     nome del file).
3. **Test deterministici** in `tools/test_preview_samples.py` (o dove si
   decide al passo 1), senza rete, su GPX sintetici scritti in `tmp_path`:
   - parsing: punti attesi, nell'ordine; distanza attesa su una traccia
     lungo un meridiano (0,001° di latitudine ≈ 111,19 m);
   - il JSON incorporato, riletto dalla pagina generata, è uguale ai dati
     di partenza;
   - due generazioni sullo stesso input danno file identici byte per byte;
   - un nome file con `</script>` non esce dal blocco JSON;
   - pattern senza corrispondenze: exit code 2 e un messaggio di una riga.
4. **Prova vera**: la pagina dei 12 campioni `TASK-017_*_v1`, aperta nel
   browser e guardata livello per livello.
5. **Documentazione**: `samples/README.md` §Come si guarda un campione e
   `docs/TESTING.md` §Verifica visiva citano il comando; ADR nuova in
   `DECISIONS.md` con le scelte del passo 1 (numero: il primo libero al
   momento del merge, perché TASK-015 ne aggiunge in parallelo);
   `ARCHITECTURE.md` §2 e README con `tools/`; `STATUS.md`.

## Criteri di accettazione

- [ ] `python tools/preview_samples.py "samples/TASK-017_*_v1.gpx"`,
      lanciato con il Python di sistema fuori dal venv, scrive la pagina e
      ne stampa il percorso.
- [ ] Lo script importa solo moduli della libreria standard; nessuna riga
      nuova in un `pyproject.toml` o in un file di requisiti.
- [ ] Aperta con doppio clic (`file://`), la pagina mostra i 12 campioni
      `TASK-017_*_v1` come 12 livelli, ognuno accendibile e spegnibile, con
      la mappa sotto e l'attribuzione OSM visibile. Se al passo 1 le tile
      da `file://` risultano rifiutate, vale la soluzione confermata allora.
- [ ] Ogni livello mostra nome del file, distanza e numero di punti; le 12
      distanze coincidono con quelle di `samples/LOG.md` a 0,1 km.
- [ ] Due esecuzioni sullo stesso input producono file identici.
- [ ] Dopo la generazione `git status` è pulito (la pagina sta in un
      percorso ignorato), salvo diversa decisione al passo 1.
- [ ] Test del passo 3 verdi e offline; `ruff` e `black` puliti su
      `tools/`; la CI li esegue.
- [ ] ADR scritta; `samples/README.md`, `TESTING.md`, `ARCHITECTURE.md`,
      README e `STATUS.md` aggiornati.

## File toccati

```
tools/preview_samples.py
tools/test_preview_samples.py
.github/workflows/ci.yml
samples/README.md
docs/TESTING.md
docs/ARCHITECTURE.md
docs/DECISIONS.md
docs/STATUS.md
README.md
```

## Fuori scope

- La forma teorica sovrapposta alla traccia: il GPX non la contiene.
  Servirebbe rigenerarla col route-engine o salvarla accanto al campione:
  eventualmente un task a sé.
- Importare `route_engine` o toccare `services/route-engine/`.
- Punteggi, somiglianza o confronti automatici tra versioni: il prima/dopo
  si fa con il pattern (es. `samples/TASK-017_heart_5km_levico_v*.gpx`).
- Scaricare tile in anticipo o per l'uso offline (lo vieta la policy OSM);
  pubblicare la pagina (GitHub Pages) o servirla da un server.
- Scegliere il provider di mappe dell'app (ADR-0011, TASK-021).
- Quota, tempi, velocità: i campioni non li hanno.
- Modificare i campioni: l'anteprima li legge e basta.

## Esito

*(si compila a fine task)*
