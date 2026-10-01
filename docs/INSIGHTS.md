# INSIGHTS — La ricerca che impara dalle ricerche

TASK-130, ADR-0101. Il codice è in `services/api/shaperoute_api/insights/`.

## Il ciclo

```
ricerche ──► eventi ──► report + propose ──► explain ──► apply ──► vocabolario vN
   ▲          (data/insights,                (prove e    (a mano,    (nel repo,
   │           mai cancellati)                 controlli)  validato)   versionato)
   └──────── l'API legge il vocabolario: correzioni → tabelle → vocabolario → AI ◄─┘
                  impact: la versione ha aiutato?  →  se peggio, revert
```

1. **Raccolta.** L'API scrive un evento per: parole della forma
   (`shape_reading`), percorsi (`route`), percorsi a tema (`themed`), città
   cercate (`city_search`), «Explore» (`recommended_list`,
   `recommended_open`), e i segnali d'uso (`gpx_export`, `run_scored`).
   Ogni evento ha esito, codice d'errore, numero di risultati, somiglianza,
   tappe trovate e toccate, millisecondi (`ms`; per i percorsi a tema anche
   `read_ms`, la sola lettura delle parole), chi ha risposto (`table`,
   `learned`, `ai`) e la **versione del vocabolario**.
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
   - `catalog_city`: una città dove «Explore» è stato vuoto ≥ 3 volte.
   - `catalog_phrase`: una parola disegnata ≥ 3 volte che il catalogo non ha.
   - `review_unknown_theme`, `review_no_places`: per una persona; non si
     applicano.
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

## Perché le regole sono queste

- **Giorni o luoghi diversi.** Il modello gira a `temperature 0, seed 0`:
  le stesse parole hanno sempre la stessa risposta, quindi tre risposte
  uguali non provano nulla da sole. E una persona che ripete la stessa
  richiesta non deve poter insegnare qualcosa all'API (avvelenamento).
- **Due segnali per i refusi.** L'ortografia vicina a una parola delle
  tabelle, più le richieste ripetute (e l'AI d'accordo, se le ha lette):
  bastano 2 eventi. Parole sotto le 5 lettere non si correggono.
- **Mai contro le tabelle, mai contro l'ortografia senza una persona.**
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
```

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

`impact` chiede il ritorno indietro solo per una metrica d'utilità peggiore:
una di costo peggiore si legge, ma da sola non basta.

## Privacy, sicurezza, costi

- Nessun identificativo, nessun indirizzo, nessuna posizione precisa:
  celle di ~1 km, o il nome di una città. Email e numeri lunghi oscurati.
  `/places` non si registra.
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
