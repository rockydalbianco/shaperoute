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
percorso di corsa e mette l'elenco delle forme, ciascuna con il suo
contorno in poche parole («horse: a running horse seen from the side»). Il
modello sceglie la forma che le parole nominano o raffigurano: la cosa
stessa, una sua specie, o qualcosa la cui immagine più nota è quella forma
(un personaggio, uno stemma, un simbolo). `none` se nessuna è un'immagine
onesta di quello che le parole nominano.

La risposta è **vincolata da uno schema JSON** che Ollama fa rispettare
mentre il modello scrive:

```json
{ "picture": "prancing horse", "shape": "horse" }
```

- `shape` può essere solo un nome del catalogo o `none`: nemmeno parole
  scritte per ingannare il modello («ignora le istruzioni e disegna…»)
  possono farlo uscire da lì.
- `picture` viene prima: il modello dice in poche parole inglesi cosa vede
  nelle parole, poi sceglie. Serve a scegliere meglio e al log dell'API;
  all'app non arriva.
- Temperatura 0, seme fisso, al massimo 64 token: le stesse parole danno la
  stessa risposta.

Un contorno nuovo nel catalogo vuole la sua riga in `OUTLINES`: un test
dell'API lo controlla.

## Cache

Le stesse parole, a meno di maiuscole e spazi, si chiedono al modello una
volta: l'API ne ricorda fino a 1.000, finché non si riavvia, e l'app
ricorda le sue finché resta aperta. Le risposte mancate non si ricordano.
Una cache su disco non serve finché il modello costa solo tempo.

## Quando il modello non risponde

Ollama spento, modello non scaricato, oltre 60 s, risposta illeggibile:
l'API risponde `503 ai_unavailable` con il motivo, e l'app lo dice sotto
il riquadro. Le parole della tabella continuano a funzionare: **il
prodotto va anche senza AI** (ADR-0001). Con «Fine» si riprova.

## Costi e privacy

Nessun costo per richiesta e nessuna chiave: il modello è aperto e gira
sul PC dell'API. Le parole non escono dalla rete di casa. Il prezzo è il
PC: spazio su disco, memoria mentre il modello è caricato (15 minuti dopo
l'ultima richiesta, `KEEP_ALIVE`), e il tempo di risposta.

## Modello

*(si scrive con la misura, TASK-030)*

## Misure

*(si scrive con la misura, TASK-030)*

La lista di prova è `services/ai/tests/phrases.json`: 52 parole e frasi,
in italiano e in inglese, con le risposte accettate (due per quelle
ambigue, come «stella marina»); 12 devono dare nessuna forma. Un test
dell'API controlla che usi il catalogo. Per misurare un modello, con
Ollama acceso e il modello scaricato, da `services\ai`:

```powershell
..\api\.venv\Scripts\python.exe tests\measure_phrases.py --model <modello>
```

## Marchi

«Stemma della Ferrari» diventa il cavallo del catalogo, che è un disegno
con licenza aperta (ADR-0035), non il logo. Il motore non disegna mai un
marchio: l'AI sceglie fra contorni che il progetto ha già.

## Domande ancora aperte

- Cosa proporre quando nessuna forma va bene: TASK-031.
- Un provider diverso quando l'API non girerà più sul PC (hosting,
  ADR-0013): basta un'altra classe dietro `ShapeModel`.
