# TASK-067 — Lettere unite anche dalla cima

**Stato**: In corso — in attesa del giudizio dell'utente sui campioni
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

## Misure (punto 1, 2026-10-02)

Una lettera entrata o lasciata in cima è la stessa linea chiusa, cominciata
e tagliata altrove: la sua lunghezza non cambia. Cambia solo lo spazio, che
va dal punto d'uscita di una lettera al punto d'ingresso della successiva.
Per ogni coppia, quindi:

    lunghezza = lettera 1 + lettera 2 + 2 × (spazio + sporgenza d'uscita
                della prima + sporgenza d'ingresso della seconda)

dove la sporgenza è quanto il punto d'uscita (o d'ingresso) sta dentro il
bordo della lettera, sulla base o in cima. Le tabelle danno le sporgenze di
ogni lettera, in altezze di lettera; «Cima» è il punto più a sinistra e più
a destra della lettera sulla cima, senza regole di lettura. L'ultima
colonna dice dove le tre regole di ADR-0063 lasciano unire.

**Tonde** (spazio 0,6):

| Lettera | Lunghezza | Base: ingresso · uscita | Cima: ingresso · uscita | Unita in cima |
|---|---|---|---|---|
| A | 3,28 | 0,00 · 0,00 | 0,30 · 0,30 | no |
| B | 3,60 | 0,00 · 0,28 | 0,00 · 0,30 | solo ingresso |
| C | 3,76 | 0,30 · 0,23 | 0,30 · 0,23 | no |
| D | 2,84 | 0,00 · 0,34 | 0,00 · 0,34 | solo ingresso |
| E | 5,10 | 0,00 · 0,55 | 0,00 · 0,00 | no |
| F | 4,00 | 0,00 · 0,55 | 0,00 · 0,00 | no |
| G | 4,85 | 0,30 · 0,30 | 0,30 · 0,30 | no |
| H | 5,20 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| I | 2,00 | 0,00 · 0,00 | 0,00 · 0,00 | no |
| J | 3,12 | 0,25 · 0,25 | 0,50 · 0,00 | no |
| K | 5,06 | 0,00 · 0,00 | 0,00 · 0,05 | solo ingresso |
| L | 3,00 | 0,00 · 0,50 | 0,00 · 0,50 | no |
| M | 7,22 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| N | 6,33 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| O | 2,54 | 0,30 · 0,30 | 0,30 · 0,30 | no |
| P | 2,86 | 0,00 · 0,55 | 0,00 · 0,30 | solo ingresso |
| Q | 3,17 | 0,30 · 0,00 | 0,30 · 0,35 | no |
| R | 4,08 | 0,00 · 0,00 | 0,00 · 0,35 | solo ingresso |
| S | 4,50 | 0,27 · 0,30 | 0,27 · 0,30 | no |
| T | 3,20 | 0,30 · 0,30 | 0,00 · 0,00 | no |
| U | 4,64 | 0,30 · 0,30 | 0,00 · 0,00 | sì |
| V | 4,18 | 0,30 · 0,30 | 0,00 · 0,00 | sì |
| W | 6,99 | 0,20 · 0,20 | 0,00 · 0,00 | sì |
| X | 4,66 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| Y | 3,33 | 0,30 · 0,30 | 0,00 · 0,00 | sì |
| Z | 4,73 | 0,00 · 0,00 | 0,00 · 0,00 | no |

Coppie più corte dalla cima: 294 su 676 senza regole, 68 con le regole; le più accorciate: YY 1,2, YV 1,2, YU 1,2, VY 1,2, VV 1,2, VU 1,2, UY 1,2, UV 1,2

Lunghezza della parola, in altezze di lettera; `‾` è uno spazio in
cima, `_` uno sulla base.

| Parola | Oggi | Senza regole | Con le regole | Unioni |
|---|---|---|---|---|
| CIAO | 16,2 | 16,2 | 16,2 | `___` |
| BELLO | 26,3 | 25,2 (−4,2%) | 26,3 | `____` |
| MAX | 17,6 | 17,6 | 17,6 | `__` |
| KIWI | 20,4 | 19,6 (−3,9%) | 20,4 | `___` |
| VIVA | 19,0 | 17,8 (−6,3%) | 19,0 | `___` |
| TUTTI | 25,2 | 21,0 (−16,6%) | 25,2 | `____` |
| UVA | 16,3 | 15,1 (−7,4%) | 15,1 (−7,4%) | `‾_` |

**Squadrate** (spazio 0,3):

| Lettera | Lunghezza | Base: ingresso · uscita | Cima: ingresso · uscita | Unita in cima |
|---|---|---|---|---|
| A | 3,93 | 0,00 · 0,00 | 0,40 · 0,40 | no |
| B | 5,00 | 0,00 · 0,00 | 0,00 · 0,10 | solo ingresso |
| C | 5,20 | 0,00 · 0,80 | 0,00 · 0,00 | no |
| D | 3,37 | 0,00 · 0,20 | 0,00 · 0,20 | solo ingresso |
| E | 6,60 | 0,00 · 0,80 | 0,00 · 0,00 | no |
| F | 5,00 | 0,00 · 0,80 | 0,00 · 0,00 | no |
| G | 6,60 | 0,00 · 0,80 | 0,00 · 0,00 | no |
| H | 5,60 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| I | 2,00 | 0,00 · 0,00 | 0,00 · 0,00 | no |
| J | 3,70 | 0,60 · 0,00 | 0,60 · 0,00 | no |
| K | 4,83 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| L | 3,60 | 0,00 · 0,80 | 0,00 · 0,80 | no |
| M | 6,83 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| N | 6,83 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| O | 3,60 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| P | 3,60 | 0,00 · 0,80 | 0,00 · 0,00 | sì |
| Q | 4,45 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| R | 5,01 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| S | 6,80 | 0,00 · 0,80 | 0,00 · 0,00 | no |
| T | 3,60 | 0,40 · 0,40 | 0,00 · 0,00 | no |
| U | 5,01 | 0,25 · 0,25 | 0,00 · 0,00 | sì |
| V | 4,83 | 0,50 · 0,50 | 0,00 · 0,00 | sì |
| W | 6,83 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| X | 5,66 | 0,00 · 0,00 | 0,00 · 0,00 | sì |
| Y | 3,83 | 0,50 · 0,50 | 0,00 · 0,00 | sì |
| Z | 6,83 | 0,00 · 0,00 | 0,00 · 0,00 | no |

Coppie più corte dalla cima: 320 su 676 senza regole, 87 con le regole; le più accorciate: PY 2,6, PV 2,6, PU 2,1, YY 2,0, YV 2,0, VY 2,0, VV 2,0, PX 1,6

Lunghezza della parola, in altezze di lettera; `‾` è uno spazio in
cima, `_` uno sulla base.

| Parola | Oggi | Senza regole | Con le regole | Unioni |
|---|---|---|---|---|
| CIAO | 18,1 | 16,5 (−8,8%) | 18,1 | `___` |
| BELLO | 29,6 | 28,0 (−5,4%) | 29,6 | `____` |
| MAX | 17,6 | 17,6 | 17,6 | `__` |
| KIWI | 17,5 | 17,5 | 17,5 | `___` |
| VIVA | 20,4 | 18,2 (−10,8%) | 20,4 | `___` |
| TUTTI | 25,2 | 20,2 (−19,8%) | 25,2 | `____` |
| UVA | 17,5 | 15,8 (−9,7%) | 16,0 (−8,6%) | `‾_` |

Il 5% è superato: senza regole da «VIVA», «TUTTI» e «UVA» tonde e da
cinque parole squadrate; con le regole solo da «UVA» (7,4% tonda, 8,6%
squadrata). Quasi tutto il guadagno senza regole viene da T, E, F e I, cioè
dai casi che il task stesso vieta (la sbarra della T, il braccio della E) o
che cambiano la lettera (la I fra due unioni in cima è una T: «VIVA» si
legge «VTVA»). Altre parole che cambiano con le regole: «NUVOLA» 5,2%
(8,5% squadrata), «HUB» 7,0%, «YUMMY» 7,3%, «LUNA» 2,6%, «FUMO» 2,4%,
«PUNK» squadrata 10,5%.

## Campioni (punto 5, 2026-10-02)

Delle sette parole cambia solo «UVA»: campioni tondi e squadrati, e in più
«HUB» tonda, che ha tutte e due le unioni in cima. 15 km, Trento, Levico e
Milano, solo dalla cache, con `tests/measure_words.py` (`--top-joins` per
la colonna di destra). I file sono
`samples/TASK-067_<parola>-<stile>[-top]_15km_<zona>_v1.gpx`.

| Caso | Oggi: somigl. · lettere · km · tracciamenti · tempo | Unioni in cima: somigl. · lettere · km · tracciamenti · tempo |
|---|---|---|
| UVA tonda, Trento | 0,96 · 802 m · 14,7 · 7 · 12 s | 0,93 · 692 m · 16,5 · 7 · 11 s |
| UVA tonda, Levico | 0,90 · 737 m · 14,9 · 2 · 29 s | 0,87 · 689 m · 15,1 · 11 · 12 s |
| UVA tonda, Milano | 0,97 · 817 m · 15,5 · 2 · 40 s | 0,98 · 829 m · 14,4 · 2 · 20 s |
| UVA squadrata, Trento | 0,95 · 580 m · 14,4 · 7 · 59 s | 0,93 · 683 m · 13,8 · 6 · 12 s |
| UVA squadrata, Levico | 0,86 · 612 m · 14,5 · 11 · 25 s | 0,95 · 719 m · 15,2 · 18 · 6 s |
| UVA squadrata, Milano | 0,94 · 735 m · 14,8 · 2 · 22 s | 0,98 · 812 m · 15,2 · 2 · 20 s |
| HUB tonda, Trento | 0,88 · 734 m · 14,8 · 14 · 67 s | 0,91 · 722 m · 14,0 · 14 · 16 s |
| HUB tonda, Levico | 0,96 · 748 m · 14,1 · 2 · 19 s | 0,94 · 639 m · 14,0 · 10 · 5 s |
| HUB tonda, Milano | 0,94 · 774 m · 14,7 · 2 · 19 s | 0,97 · 947 m · 16,4 · 1 · 16 s |

Tempo dei nove casi: 292 s oggi, 118 s con le unioni in cima, con tre
casi alla volta e le altre sessioni al lavoro; i tracciamenti sono dello
stesso ordine. La ricerca non dura di più.

Sulle strade le lettere non vengono sempre più alte: la ricerca sceglie
scala e posto, e un disegno più corto può finire più piccolo (UVA tonda a
Trento e Levico, HUB a Levico). UVA squadrata è più alta nelle tre zone
(580 → 683 m, 612 → 719 m, 735 → 812 m) e più somigliante a Levico e a
Milano.

Pagina di giudizio (sì / quasi / no per ogni percorso, «quale preferisci»,
le parole che le regole vietano, «Copia le risposte»):
https://claude.ai/artifact/HHjCVwPgncphRNbiyrnpHj

## Esito

*(si compila a fine task)*
