# AI — Le parole della forma

> Scritto con TASK-030. Le scelte e i loro motivi stanno in ADR-0012; il
> confine, l'AI che non disegna, in ADR-0001.

## Cosa fa, e cosa no

L'utente scrive la forma in un riquadro. Se le parole sono nella tabella
dell'app (`shapeWords.ts`, ADR-0036), la forma è quella, subito. Se non ci
sono («stemma della Ferrari», «Nemo», «Garfield»), le legge un modello
AI, che sceglie **una forma del catalogo o nessuna**.

L'AI non disegna: non produce coordinate, contorni o percorsi, e non
inventa forme. Il suo lavoro finisce con un nome, e il percorso lo calcola
il motore come per ogni altra richiesta. Distanza e attività hanno i loro
riquadri: l'AI legge solo la forma.

## Il percorso delle parole

```
app: tabella delle parole ── la conosce ──▶ forma
        │ non la conosce, e l'utente ha finito di scrivere
        ▼
API: POST /shape-readings ── già lette ──▶ cache in memoria
        │
        ▼
shaperoute_ai: ShapeReader ── controlla la risposta
        │
        ▼
OllamaModel ──HTTP──▶ Ollama, sullo stesso PC ──▶ {"picture", "shape"}
```

- L'app manda le parole quando l'utente ha finito di scrivere («Fine», o
  un tocco fuori dal campo), non a ogni lettera (`UI.md`).
- L'API passa al pacchetto dell'AI le parole e il catalogo
  (`SUPPORTED_SHAPES` del motore): `services/ai/` non importa il motore.
- `ShapeReader` pulisce il testo (spazi singoli, da 1 a 60 caratteri),
  guarda nella cache, chiede al modello, e scarta qualunque risposta che
  non sia una forma del catalogo.
- `OllamaModel` è l'unico provider. L'interfaccia `ShapeModel` è una sola
  chiamata, `choose(text, shapes) -> Choice`: un altro provider si aggiunge
  scrivendone un'altra, senza toccare API e app.

## La domanda al modello

Il messaggio di sistema (`prompt.py`) dice che si sceglie il disegno di un
percorso di corsa, e chiede due passi:

1. `picture`: in al massimo sei parole inglesi, cosa raffigura l'immagine
   più nota della cosa nominata; per uno stemma o un logo, cosa c'è
   disegnato, per un personaggio, che creatura è;
2. `shape`: la forma dell'elenco che *è* quell'immagine, o una sua specie.
   Ogni forma ha il suo contorno in poche parole («horse: a running horse
   seen from the side»), e anche `none` è una voce dell'elenco, con esempi
   che non stanno nelle liste di prova («a car, a bird, a bridge…»).
   Qualcosa di solo tondo non è un cerchio, qualcosa di solo appuntito
   non è una stella.

Perché la domanda è fatta così, e quanto è cambiata misurando, sta sotto
in «Misure».

La risposta è **vincolata da uno schema JSON** che Ollama fa rispettare
mentre il modello scrive:

```json
{ "picture": "prancing horse", "shape": "horse" }
```

- `shape` può essere solo un nome del catalogo o `none`: nemmeno parole
  scritte per ingannare il modello («ignora le istruzioni e disegna…»)
  possono farlo uscire da lì.
- `picture` viene prima: il modello dice cosa vede, poi sceglie. Serve a
  scegliere meglio («the Ferrari emblem» → «a red prancing horse») e al
  log dell'API; all'app non arriva.
- Temperatura 0, seme fisso, al massimo 64 token: le stesse parole danno la
  stessa risposta.

Un contorno nuovo nel catalogo vuole la sua riga in `OUTLINES`: un test
dell'API lo controlla. Cambiano anche le liste di prova («Misure»): le
parole che diventano della tabella escono, perché al modello non arrivano
più, e ne entrano di nuove per la forma (TASK-065).

## Cache

Le stesse parole, a meno di maiuscole e spazi, si chiedono al modello una
volta: l'API ne ricorda fino a 1.000, finché non si riavvia, e l'app
ricorda le sue finché resta aperta. Le risposte mancate non si ricordano.
Una cache su disco non serve finché il modello costa solo tempo.

## Quando il modello non risponde

Ollama spento, modello non scaricato, oltre 90 s, risposta illeggibile:
l'API risponde `503 ai_unavailable` con il motivo, e l'app lo dice sotto
il riquadro. Le parole della tabella continuano a funzionare: **il
prodotto va anche senza AI** (ADR-0001). Con «Fine» si riprova.

## Costi e privacy

Nessun costo per richiesta e nessuna chiave: il modello è aperto e gira
sul PC dell'API. Le parole non escono dalla rete di casa. Il prezzo è il
PC: spazio su disco, memoria mentre il modello è caricato (15 minuti dopo
l'ultima richiesta, `KEEP_ALIVE`), e il tempo di risposta.

## Modello

**`qwen3:4b`** di Alibaba, licenza Apache 2.0, 2,5 GB su disco, 3,2 GB di
RAM quando è caricato, solo CPU (ADR-0012). Si scarica una volta, con
Ollama acceso (`SETUP.md` 10.3):

```powershell
ollama pull qwen3:4b
```

È un modello che sa «ragionare» prima di rispondere: qui il ragionamento è
spento (`think: false`), perché su questo PC con il ragionamento non
risponde nemmeno in 5 minuti. Un altro modello si prova con `--ai-model`
all'avvio dell'API; `think: false` lo accettano anche i modelli che non
ragionano.

| Tempo, su questo PC (Ryzen 5 3500U, 7 GB, nessuna GPU) | |
|---|---|
| Prima parola, modello da caricare dal disco | 39–49 s |
| Ogni parola dopo, modello già caricato | 4–6 s, al massimo 10 s |
| Parole già lette | subito, dalla cache |

All'avvio l'API chiede a Ollama di caricare il modello, in background
(TASK-052, ADR-0049): la prima parola nei 15 minuti dopo l'avvio non paga il
caricamento dal disco. Se Ollama è spento, il modello manca o la memoria
libera non basta (servono 3,2 GB), l'API lo scrive nel log («AI model not
preloaded») e parte lo stesso.

Ollama tiene il modello in memoria 15 minuti dopo l'ultima parola
(`KEEP_ALIVE`); l'API aspetta al massimo 90 s (`TIMEOUT_S`). La prima
parola dopo una pausa sta sotto i 60 s dopo i quali iOS chiude una
richiesta ferma (`API.md`, «Tempi»), ma con poco margine: se li supera,
l'app dice che l'API non si raggiunge, e con «Fine» la seconda prova trova
il modello già caricato.

## Misure

Due liste di parole e frasi, in italiano e in inglese, con le risposte
accettate: due per quelle ambigue («stella marina»: stella o pesce), `null`
per quelle che non devono dare una forma.

- **Messa a punto**, `services/ai/tests/phrases.json`: 64 voci, 10 senza
  forma. Su questa si è corretta la domanda al modello.
- **Controllo**, `phrases-holdout.json`: 42 voci nuove, 10 senza forma,
  scritte dopo e misurate una volta per modello. Non serve mai a cambiare
  la domanda: è il numero onesto.

Con farfalla, lumaca, testa di cane e testa di coniglio (TASK-065) «cane»
e «farfalla», che valevano «nessuna forma», sono uscite: ora le legge la
tabella. Sono entrate 14 voci per le quattro forme nella messa a punto
(fra queste «Snoopy», che valeva nessuna forma e ora accetta anche la testa
di cane) e 9 nel controllo, scritte prima di misurarle; «ragno» e «ape»
sono voci nuove senza forma.

Un test dell'API controlla che le due liste usino il catalogo e non abbiano
voci in comune. Risultati del 2026-09-24, con la domanda finale e le
liste di allora (sette forme, 52 e 32 voci):

| Modello | Messa a punto | Controllo | Totale | Forma al posto di nessuna | Secondi, mediana / massimo |
|---|---|---|---|---|---|
| **qwen3:4b** | 45/52 (87%) | 30/32 (94%) | 75/84 (89%) | 3 | 4,9–6,1 / 9,8 |
| granite4:3b | 42/52 (81%) | 28/32 (88%) | 70/84 (83%) | 0 | 4,1–5,1 / 10,8 |
| phi4-mini | 42/52 (81%) | 26/32 (81%) | 68/84 (81%) | 9 | 3,6–3,7 / 7,0 |

Gli errori di qwen3:4b sono quasi tutti «nessuna forma» dove una c'era:
parole poco comuni («puledrino», «Stregatto», «curoe») o legami deboli
(«I love NY», «innamorati», «ciambella»). Le tre forme sbagliate: «Italia» →
circle, «leone» → horse, «Topolino» → cat. L'app mostra la forma prima di
disegnare («→ horse»), quindi un errore così si vede subito.

Com'è cambiata la domanda, sempre con qwen3:4b sulla lista di messa a
punto:

1. `picture` chiedeva cosa nominano le parole: il modello ripeteva
   «Ferrari emblem» e sceglieva a caso. Chiedendo cosa raffigura
   l'immagine più nota della cosa nominata: 69%, ma 10 delle 12 parole
   senza forma prendevano una forma, quasi sempre «circle», usato come
   ripiego.
2. `none` come voce dell'elenco, con esempi scelti fuori dalle liste, e
   «nel dubbio, none»: 85%, nessuna forma di troppo, ma troppi `none`.
3. Senza «nel dubbio»: 87%. È la domanda finale; da qui non si è più
   toccata, e si sono misurati gli altri modelli e la lista di controllo.

«stela» valeva solo `star`: è anche una parola italiana (la stele), e ora
accetta `star` o `null`. Le righe di ogni misura stanno in `out/`
(`TASK-030-*.txt`, fuori dal repository).

Per misurare un modello, con Ollama acceso e il modello scaricato, da
`services\ai`:

```powershell
..\api\.venv\Scripts\python.exe tests\measure_phrases.py --model qwen3:4b
..\api\.venv\Scripts\python.exe tests\measure_phrases.py --model qwen3:4b --list holdout
```

## Limiti

Provato dall'utente sull'iPhone il 2026-09-24: le parole più semplici
funzionano, «stemma della ferrari» e «spirit» no.

- **Quello che il modello non sa, non lo indovina.** Per «stemma della
  Ferrari» descrive a volte un cavallo, a volte un'auto da corsa o uno
  chevron araldico: legge «stemma» come uno stemma di famiglia. Di
  «Spirit» non conosce il cavallo del film e vede «uno spirito». Frasi più
  esplicite funzionano: «logo ferrari» («a red prancing horse»),
  «cavallino rampante», «Spirit cavallo».
- **Sulle parole al limite la risposta cambia.** Temperatura 0 e seme fisso
  non bastano: Ollama riusa i calcoli della richiesta precedente, e la
  stessa frase ripetuta può dare prima horse e poi nessuna forma. Sulle
  parole che il modello conosce bene («Nemo») la risposta è sempre la
  stessa. Anche le misure risentono di questo: ogni numero vale una volta,
  a meno di qualche voce.
- **La cache dell'API tiene la prima risposta** fino al riavvio: ripremere
  «Fine» sulla stessa parola non la cambia. Si cambia la parola.

Un modello più grande saprebbe di più, ma non ci sta nei 7 GB di questo PC
con l'API accesa (qwen3:8b chiede 5–6 GB). Scelto dall'utente: il limite
resta, documentato qui; cosa suggerire all'utente quando non c'è una forma
è TASK-031.

## Marchi

«Stemma della Ferrari» diventa il cavallo del catalogo, che è un disegno
con licenza aperta (ADR-0035), non il logo. Il motore non disegna mai un
marchio: l'AI sceglie fra contorni che il progetto ha già.

## Domande ancora aperte

- Cosa proporre quando nessuna forma va bene: TASK-031. Per esempio,
  suggerire di scrivere la cosa in modo più esplicito («logo» invece di
  «stemma»).
- Un provider diverso quando l'API non girerà più sul PC (hosting,
  ADR-0013): basta un'altra classe dietro `ShapeModel`.
