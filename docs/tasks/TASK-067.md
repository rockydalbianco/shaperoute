# TASK-067 — Lettere unite anche dalla cima

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-067-top-joins`

Chiesto dall'utente il 2026-09-25, nel giudizio di TASK-059: «Se serve, il
collegamento con l'altra lettera può essere anche non dal basso: se questo
non confonde o serve per migliorare, anche connetterle dalla cima.» Task
file scritto il 2026-10-02, su richiesta dell'utente.

## Obiettivo

Fra due lettere di una parola l'unione può passare dalla cima invece che
dalla base, dove accorcia la parola e non confonde la lettura. La scelta la
fa il motore, e diventa il modo predefinito solo se l'utente, sui campioni,
la preferisce.

## Perché

Oggi ogni lettera entra ed esce sulla base (y = 0), e le unioni si corrono
due volte, all'andata e al ritorno. Undici lettere tonde non entrano dal
bordo sinistro (C, G, J, O, Q, S, T, U, V, W, Y), e V, U, T, Y e O entrano
a metà: l'unione va da metà a metà. Fra due V, per esempio, dalla base
l'unione va da punta a punta (1,2 altezze), dalla cima dall'angolo destro
della prima al sinistro della seconda (0,6), e la V si corre lo stesso
numero di volte.

Misure su `main` del 2026-10-02 (`words.compose`): lunghezza della linea
della parola in altezze di lettera, e quanta parte ne fanno le unioni.

| Parola | Tonde | Unioni | Squadrate | Unioni |
|---|---|---|---|---|
| CIAO | 16,2 | 29% | 18,1 | 19% |
| BELLO | 26,3 | 34% | 29,6 | 24% |
| MAX | 17,6 | 14% | 17,6 | 7% |
| KIWI | 20,4 | 22% | 17,5 | 10% |
| VIVA | 19,0 | 28% | 20,4 | 24% |
| TUTTI | 25,2 | 36% | 25,2 | 29% |
| UVA | 16,3 | 26% | 17,5 | 21% |

A pari chilometri una linea più corta dà lettere più grandi, e da TASK-071
(ADR-0067) sappiamo che lettere più piccole si leggono peggio.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §2 «Parole lettera per lettera» e «Lettere
  squadrate»; §5 «Lettere che si spostano» e «Parole squadrate sulla
  griglia delle vie»
- `docs/DECISIONS.md` ADR-0044 (alfabeto, lettere che si spostano),
  ADR-0056 (E e L staccate dalla base; niente base prima della prima
  lettera né dopo l'ultima), ADR-0067 (scartata: lettere più piccole),
  ADR-0072 (squadrate)
- `docs/tasks/TASK-059.md` «Esito», `docs/tasks/TASK-071.md` «Esito»
- `services/route-engine/route_engine/words.py`; in `optimizer.py`
  `fit_letters` e `plan_route`

## Cosa fare

1. **Misurare prima.** Per ogni coppia di lettere, nei due stili: la
   lunghezza con l'unione dalla base e quella dalla cima, lettere comprese.
   Poi quanto si accorciano le sette parole della tabella. Se nessuna si
   accorcia almeno del 5%, fermarsi e riportare le misure all'utente: il
   task finisce lì.
2. **Il formato.** Una lettera può avere un ingresso e un'uscita anche in
   cima (y = 1), con i loro `out` e `back`, in `letters.json` e
   `letters_block.json`. `parse_letters` li valida come quelli sulla base.
   Una lettera senza cima si unisce solo dalla base, come oggi.
3. **La scelta.** Ogni spazio va o sulla base o in cima, mai in diagonale.
   Il motore tiene la combinazione più corta che rispetta le regole di
   lettura: con al più 8 lettere sono 128 combinazioni, si provano tutte.
   La scelta deve essere deterministica. Le regole le scrive l'agente in
   ADR-0063, ognuna con un test. Il caso già noto: un'unione dalla cima
   non continua un tratto orizzontale in cima (la sbarra della T, il
   braccio alto di E, F, Z), che si allungherebbe come la base inghiottiva
   il braccio basso di E e L (ADR-0056). Da guardare anche una lettera
   unita in cima da un lato e in basso dall'altro: la I diventerebbe una
   specie di Z.
4. **La ricerca.** `fit_letters` sposta le lettere come oggi: gli spazi in
   cima si allungano e accorciano come quelli in basso. La partenza resta a
   metà di uno spazio, che può essere in cima. Un parametro di `plan_route`
   accende e spegne le unioni in cima, per i campioni.
5. **Campioni.** Con `tests/measure_words.py`, solo dalla cache: le parole
   della tabella che cambiano, a 15 km, a Trento, Levico e Milano. Lettere
   tonde, con e senza unioni in cima, una accanto all'altra; squadrate solo
   per le due parole che si accorciano di più. Una pagina di giudizio con
   sì / quasi / no, come in TASK-059.
6. **Il giudizio dell'utente**, scritto in `samples/LOG.md`, decide il
   predefinito, anche separatamente per i due stili. Se l'utente non le
   preferisce, il motore resta com'è: il codice esce dal branch e restano
   misure, campioni e ADR-0063 «Scartata», come in TASK-071.

## Criteri di accettazione

- [ ] Le misure per coppia e per parola sono scritte nel task file.
- [ ] Con le unioni in cima spente, ogni parola è identica a `main` punto
      per punto, nei due stili (test).
- [ ] Ogni regola di lettura ha un test con una coppia che la viola.
- [ ] Stessa parola, stesse unioni (test).
- [ ] Sui campioni la ricerca non dura più del 10% in più di oggi: «BELLO»
      è già a 255–258 s, e l'app aspetta al più 5 minuti.
- [ ] Il giudizio dell'utente è in `samples/LOG.md`, e il predefinito lo
      segue.
- [ ] API, `shared-types` e app non cambiano: la richiesta resta quella
      di oggi.
- [ ] `ruff`, `black`, tipi e `pytest` del motore sono verdi; il motore
      non importa niente da `services/api/` né da `services/ai/`.
- [ ] `ROUTE_ENGINE.md` §2 e §5 sono aggiornati, e ADR-0063 è scritto.

## File toccati

```
services/route-engine/route_engine/words.py
services/route-engine/route_engine/letters.json
services/route-engine/route_engine/letters_block.json
services/route-engine/route_engine/optimizer.py   (il parametro di plan_route)
services/route-engine/tests/test_words.py
services/route-engine/tests/measure_words.py      (con e senza unioni in cima)
samples/TASK-067_*, samples/LOG.md
docs/ROUTE_ENGINE.md, docs/DECISIONS.md (ADR-0063), docs/STATUS.md,
docs/tasks/TASK-067.md
```

## Fuori scope

- La scala per lettera, l'altra metà della richiesta del 2026-09-25:
  **l'utente la lascia fuori** (2026-10-02), perché TASK-071 ha mostrato
  che lettere più piccole si leggono peggio. Non si fa, né qui né in un
  task a parte; ADR-0063 lo annota, perché ADR-0056 la rimanda ancora qui.
- Un tratto di base prima della prima lettera e dopo l'ultima: l'utente
  non lo vuole (ADR-0056).
- Unioni a metà altezza o in diagonale.
- Ridisegnare le lettere oltre agli ingressi e alle uscite in cima.
- Il ritorno sulle strade dell'andata (ADR-0067, scartato).
- `MAX_WORD_LETTERS`, `LETTER_DISTANCE_M`, l'API, `shared-types`, l'app.
- `network.py`, `retracing.py`.
- Nessuna dipendenza nuova.

## Esito

*(si compila a fine task)*
