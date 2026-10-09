# INSIGHTS — La ricerca che impara dalle ricerche

TASK-130, ADR-0101; i segnali dell'app e le città imparate: TASK-142,
ADR-0112. Il codice è in `services/api/shaperoute_api/insights/` e
`signals.py`; nell'app, `apps/mobile/src/api/signals.ts`.

## Il ciclo

```
ricerche ─┐
          ├─► eventi ──► report + propose ──► explain / why ──► apply ──► vocabolario vN
scelte    │   (data/insights,                 (prove, controlli, (a mano,    (nel repo,
dell'app ─┘    mai cancellati)                 cosa manca)        validato)   versionato)
(/signals)
   ▲
   └── l'API legge il vocabolario: correzioni → tabelle → vocabolario → AI;
       /cities cerca il nome imparato
         impact: la versione ha aiutato?  →  se peggio, revert
         compare --split GIORNO: e un cambio del motore, del catalogo, dell'app?
```

1. **Raccolta.** L'API scrive un evento per: parole della forma
   (`shape_reading`), percorsi (`route`, con i percorsi offerti `n` e la
   distanza chiesta; `cancelled` se l'app li annulla mentre aspetta),
   percorsi a tema (`themed`), città cercate (`city_search`), «Explore»
   (`recommended_list`, `recommended_open`), e i segnali d'uso
   (`gpx_export`, `run_scored`). **`run_scored`** (da TASK-247)
   nasce quando una corsa **nuova** lungo un percorso viene salvata con
   un punteggio (`PUT /me/activities/{key}` che risponde `201`): porta
   solo `quality`, il punteggio fra 0 e 1, niente di chi ha corso né di
   dove. Una corsa rimandata con la stessa chiave, o senza percorso, non
   è un evento. `POST /track-scores` lo registra ancora, ma l'app non lo
   chiama più: una versione dell'app più vecchia di TASK-241 conta la
   stessa corsa due volte (a fine corsa e al «Save»). Ogni evento ha esito, codice d'errore,
   numero di risultati, somiglianza, tappe trovate e toccate, millisecondi
   (`ms`; per i percorsi a tema anche `read_ms`, la sola lettura delle
   parole), chi ha risposto (`table`, `learned`, `ai`) e la **versione del
   vocabolario**. (Fino a TASK-142 i percorsi dell'API non si registravano:
   un errore li scartava in silenzio; c'erano solo quelli importati.)

   **Cosa fa l'app** (TASK-142, `POST /signals`): solo l'app sa cosa è
   venuto da una ricerca. `city_chosen`: la città o il luogo scelto in
   «Explore» e come (`suggestion`, `recent`, `featured`, `typed`): un
   suggerimento toccato non chiama `/cities`, quindi senza questo segnale
   la città si perdeva (dal vivo: Vercelli, vuota 3 volte, mai proposta).
   `route_chosen`: il percorso usato (Start, Export GPX) fra A, B e
   C, una volta per percorso. `hint_taken`: «Try N km», o una forma del
   catalogo dopo un percorso fallito; `better_distance` è il «Try N km»
   della riga sotto un percorso riuscito (TASK-234 C).
2. **Analisi** (`report`): metriche totali e per versione; cosa si chiede di
   più (lingue, città, forme, parole); le richieste che vanno quasi sempre
   bene, da suggerire come esempi, e quelle che falliscono più volte, cioè
   ciò che manca.
3. **Proposte** (`propose`): ognuna con id stabile, motivo, numero di
   eventi, esempi e **i controlli superati**. Tipi:
   - `theme_synonym`, `shape_synonym`: una frase che l'AI ha letto allo
     stesso modo ≥ 3 volte e mai diversamente, **in ≥ 2 giorni o luoghi
     diversi**, che non contraddice le tabelle. Applicata, l'API risponde
     senza l'AI.
   - `correction`: un refuso di una parola delle tabelle («rmantico»,
     «curoe»), visto ≥ 2 volte in ≥ 2 giorni o luoghi, se l'AI non l'ha
     letto in un altro modo. Per i temi è una parola corretta prima delle
     tabelle, in ogni richiesta e città; per le forme è la frase intera.
   - `conflict`: l'AI e l'ortografia non concordano (dal vivo, qwen3:4b
     legge «curoe» come cerchio). Non si impara mai da solo: se una persona
     la applica, vince l'ortografia.
   - `city_name` (TASK-142): parole cercate come città e lasciate entro 3
     minuti per una città che le parole possono voler dire (l'inizio del
     nome, o poche lettere diverse): «levic» → Levič → Levico Terme. Almeno
     2 volte, in ≥ 2 giorni, e in almeno metà delle ricerche di quelle
     parole. Applicata, `/cities` cerca il nome imparato.
   - `catalog_city`: una città, cercata o scelta fra i suggerimenti, dove
     «Explore» è stato vuoto ≥ 3 volte. Un luogo (Arena di Verona) no: il
     catalogo è per città.
   - `catalog_phrase`: una parola disegnata ≥ 3 volte che il catalogo non ha.
   - `review_unknown_theme`, `review_no_places`: per una persona; non si
     applicano.
   - `review_ranking` (TASK-142): per una forma, B o C scelti al posto di A
     in almeno metà di ≥ 5 scelte, in ≥ 2 giorni: la classifica del motore
     non è quella delle persone. `review_distance`: «Try N km» preso ≥ 3
     volte per la stessa forma, in ≥ 2 giorni: dirlo prima, o partire da
     quella distanza? Riguardano il motore e l'app, non il vocabolario: per
     una persona.
4. **Spiegazione** (`explain ID`): la proposta, i controlli, gli esempi, lo
   stato (nuova, in vigore, annullata), da quanti giorni o luoghi vengono le
   prove, e quanti eventi passati avrebbe risolto senza l'AI (il replay).
   Funziona anche per una proposta già applicata.
5. **Applicazione** (`apply ID`): una nuova versione di
   `shaperoute_api/learned/vocabulary.json`, con data, proposta e motivo.
   Prima si valida la versione nuova; `--dry-run` la mostra senza salvarla.
   Rifiutata se è già in vigore, se è una «review», o se era stata
   annullata (allora serve `--again`). Poi: riavviare l'API, rivedere e
   committare il file (PR come per il codice).
6. **Misura** (`impact`): ogni versione contro la precedente che ha servito
   ricerche, metrica per metrica, con un test sulle proporzioni: «better»,
   «worse», «same», o «too few» sotto i 20 eventi per lato. Dice anche quante
   richieste la modifica ha servito, quante chiamate all'AI ha risparmiato e
   quanto durava la lettura prima e dopo. «worse» indica la versione a cui
   tornare: `revert N` aggiunge una versione uguale alla N. Una proposta
   annullata non si ripropone (`propose --all` la mostra).
7. **Ogni altro cambio** (`compare --split GIORNO`, TASK-142): un merge del
   motore, un catalogo nuovo, un'app ripubblicata non cambiano il
   vocabolario; si misurano prima e dopo il giorno in cui sono arrivati,
   con lo stesso test. `trend` mostra le metriche settimana per settimana.

## Perché le regole sono queste

- **Giorni o luoghi diversi.** Il modello gira a `temperature 0, seed 0`:
  le stesse parole hanno sempre la stessa risposta, quindi tre risposte
  uguali non provano nulla da sole. E una persona che ripete la stessa
  richiesta non deve poter insegnare qualcosa all'API (avvelenamento).
- **Due segnali per i refusi.** L'ortografia vicina a una parola delle
  tabelle, più le richieste ripetute (e l'AI d'accordo, se le ha lette):
  bastano 2 eventi. Parole sotto le 5 lettere non si correggono.
- **Mai contro le tabelle, mai contro l'ortografia senza una persona.**
- **Nessuna persona negli eventi, quindi niente sessioni.** Una ricerca e la
  scelta che la segue si legano solo per tempo (3 minuti): due persone
  vicine nel tempo possono mescolarsi. Per questo una `city_name` vuole che
  le parole somiglino al nome, giorni diversi, e metà delle ricerche.
- **Dati, mai codice.** Il vocabolario è JSON, validato contro il catalogo
  delle forme, i temi e le tabelle; una voce sbagliata (scritta a mano) non
  arriva all'app: l'API la scarta all'avvio con un avviso, e un test della CI
  fa fallire la PR che la contiene.

## Comandi

Dalla radice del repository, con l'ambiente dell'API:

```
services/api/.venv/bin/python -m shaperoute_api.insights report
services/api/.venv/bin/python -m shaperoute_api.insights impact
services/api/.venv/bin/python -m shaperoute_api.insights propose [--all]
services/api/.venv/bin/python -m shaperoute_api.insights explain <id>
services/api/.venv/bin/python -m shaperoute_api.insights apply <id> [--dry-run] [--again]
services/api/.venv/bin/python -m shaperoute_api.insights history
services/api/.venv/bin/python -m shaperoute_api.insights revert <versione>
services/api/.venv/bin/python -m shaperoute_api.insights validate
services/api/.venv/bin/python -m shaperoute_api.insights import-history
services/api/.venv/bin/python -m shaperoute_api.insights compare --split 2026-10-01
services/api/.venv/bin/python -m shaperoute_api.insights trend
services/api/.venv/bin/python -m shaperoute_api.insights why levic
```

`--since` / `--until AAAA-MM-GG` tengono solo gli eventi di quei giorni,
per ogni comando.

`--dir` cambia la cartella degli eventi, `--vocab` il vocabolario,
`--json` dà l'uscita per un programma (`report`, `impact`, `propose`).
`import-history` porta il registro delle richieste (TASK-090) negli eventi,
in un file a parte rigenerato ogni volta, senza le partenze.

## Le metriche

| Metrica | Meglio se | Tipo |
|---|---|---|
| `ai_rate`: letture fatte dall'AI | scende | costo |
| `learned_rate`: letture dal vocabolario | sale | costo |
| `ai_calls_saved`, `reading_ms` per chi ha letto | salgono / scende | costo |
| `theme_unknown_rate` | scende | utilità |
| `themed_success_rate`, `themed_mean_passed` | salgono | utilità |
| `route_success_rate`, `route_mean_similarity` | salgono | utilità |
| `explore_empty_rate` | scende | utilità |
| `gpx_per_route`: GPX esportati per percorso mostrato | sale | utilità |
| `city_left_rate`: ricerche di città lasciate per un'altra entro 3 minuti | scende | utilità |
| `cancel_rate`: percorsi annullati mentre si aspetta | scende | comportamento |
| `first_choice_rate`: A, il primo del motore, scelto fra due o tre | sale | comportamento |

`impact` chiede il ritorno indietro solo per una metrica d'utilità peggiore:
una di costo o di comportamento peggiore si legge, ma da sola non basta (il
vocabolario non cambia cosa si sceglie fra A, B e C). `compare` le misura
tutte. `route_success_rate` conta solo i percorsi finiti: un annullato non
è un fallimento del motore.

## Privacy, sicurezza, costi

- Nessun identificativo, nessun indirizzo, nessuna posizione precisa:
  celle di ~1 km, o il nome di una città. Email e numeri lunghi oscurati.
  `/places` non si registra (indirizzi digitati), né `/city-suggestions`
  (le lettere mentre si scrive): conta la città scelta (`city_chosen`), un
  nome pubblico con la sua cella, mai le lettere né la partenza.
- I segnali sono validati campo per campo (`signals.py`): un campo in più
  è un 422. Oltre 60 al minuto, tutti i client insieme, non si registrano:
  un client che ne manda tanti non riempie il disco né conta più degli altri.
- File in `data/insights/`, fuori dal repository (`.gitignore`), modo 600.
  Mensili, mai riscritti né cancellati: la storia resta, e gli eventi
  vecchi si leggono anche quando se ne aggiungono campi.
- **Accesi di default** (scelta dell'utente); `--no-insights` o
  `SHAPEROUTE_INSIGHTS=0` per spegnerli. Scrivere un evento non fa mai
  fallire una richiesta.
- Nessuna modifica automatica: solo `apply`, a mano, su dati validati; il
  codice non si genera.
- L'analisi legge file locali: nessuna chiamata all'AI o a servizi, nessun
  token. Ogni frase imparata o refuso corretto toglie una chiamata al
  modello (dal vivo: 1,0 s di lettura → 0 ms).

## Debug

- `explain <id>`: perché una proposta esiste (motivo, controlli, prove,
  stato, replay).
- `why <parole>`: il contrario, perché una proposta **non** c'è ancora: per
  ogni regola cosa hanno quelle parole e cosa manca («2 times (needs 3)»,
  «1 days or places (needs 2)»), se le tabelle le leggono già, e le
  proposte che le riguardano.
- `history`: ogni versione del vocabolario, quando, da quale proposta,
  perché.
- `validate`: cosa c'è di sbagliato nel vocabolario.
- Gli eventi sono JSON a una riga: `grep`, `jq`.
- All'avvio l'API scrive dove registra e quale versione del vocabolario
  usa; una voce scartata è un avviso nel log.

## Come provarlo

1. API con eventi in una cartella di prova (non tocca quella sulla 8000):
   `python -m shaperoute_api --port 8007 --insights-dir out/insights_v2 --vocabulary out/insights_v2/vocab.json`
   (copiare prima `learned/vocabulary.json` in quella cartella).
2. Due richieste a tema con un refuso, in due città: «un giro rmantico a
   Bologna», «… a Torino» (`POST /themed-route-jobs`).
3. `propose` mostra la correzione; `explain`, `apply --dry-run`, `apply`.
4. Riavviare l'API; «un percorso rmantico a Milano» ha `"by":"learned"` e
   `read_ms` 0: l'AI non è chiamata. `impact` confronta v2 con v1.
5. `revert 1`, riavvio: l'AI torna a rispondere; `propose` nasconde la
   correzione annullata.

Le città imparate (TASK-142), sulla stessa API di prova:

1. In due giorni diversi: `GET /cities?q=levic` (Geoapify: Levič,
   Slovenia), poi entro 3 minuti `POST /signals` con
   `{"kind":"city_chosen","label":"Levico Terme, …","point":[46.01,11.30],"via":"recent"}`,
   come fa l'app quando si torna a Levico.
2. `propose` mostra `city_name` «levic» → Levico Terme; `why levic` dice
   cosa è soddisfatto; `apply`, riavvio.
3. `GET /cities?q=levic` risponde Levico Terme (`"by":"learned"`);
   `impact` mostra `city_left_rate` prima e dopo.
