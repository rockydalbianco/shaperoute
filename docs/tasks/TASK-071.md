# TASK-071 — Lettere ripassate: al ritorno la stessa strada dell'andata

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-071-retraced-letters`

## Obiettivo

Quando una lettera ripassa un tratto, il percorso torna sulle **stesse
strade** dell'andata: ogni tratto è una linea sola e sottile, non un anello
o una macchia. Le forme che non sono parole non cambiano.

Chiesto dall'utente dopo aver provato l'app: «le scritte vengono abbastanza
male; secondo me se si percorre la stessa strada anche al ritorno le rende
più pulite le lettere, e più fini».

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §2 «Parole lettera per lettera», §4 (zone,
  corridoio, speroni), §5 «Lettere che si spostano»
- `docs/DECISIONS.md` ADR-0044 (ripasso a metà prezzo), ADR-0056 (A–Z)
- `services/route-engine/route_engine/words.py`, `optimizer.py` (la parte
  delle parole), `network.py` (`snap_to_network`, da leggere e non toccare)

## Cosa fare

1. Verificare prima che succeda davvero: campioni di TASK-050/059
   rigenerati con il codice di `main`, e misura di quanto del ritorno va
   su strade diverse dall'andata.
2. Far tornare il percorso sulle strade dell'andata dove la parola ripassa
   se stessa, solo per le parole.
3. Campioni prima e dopo di «CIAO», «BELLO», «MAX» a 15 km, a Trento,
   Levico e Milano (solo zone in cache, nessun ritaglio su C:), e una
   pagina di giudizio con sì / quasi / no e «Copia le risposte».
4. Dimostrare che le altre forme non cambiano.
5. Scrivere quanta strada in più costa il ripasso, e proporre, senza
   farlo, le lettere squadrate dello screenshot di Strava.

## Criteri di accettazione

- [x] Nel task file, cosa succede davvero sui campioni di `main`, con i
      numeri.
- [x] Una parola torna sulle strade dell'andata: in un test, una parola
      senza anelli usa ogni strada un numero pari di volte, anche dove
      `snap_to_network` non lo fa; e il ritorno resta sulla stessa strada
      anche quando un'altra è più corta. *(Nel commit `0e8add6`, tolto dopo
      il giudizio.)*
- [x] Ogni tratto che una parola disegna due volte ha gli stessi punti
      all'andata e al ritorno (test su A–Z). *(Come sopra.)*
- [x] Le forme che non sono parole restano identiche: test, e cuore, gatto
      e stella a 15 km nelle tre zone con gli stessi punti prima e dopo.
- [x] 18 campioni (9 prima, 9 dopo) in `samples/`, righe in `LOG.md`, pagina
      di giudizio pubblicata.
- [x] Quanta strada in più costa il ripasso, scritto qui e in ADR-0067.
- [x] Test, `ruff` e `black` verdi; CI verde.

## File toccati

Nel diff finale della PR:

```
samples/TASK-071_*                                    (nuovi)
samples/LOG.md                                        (righe di TASK-071)
docs/DECISIONS.md                                     (ADR-0067)
docs/STATUS.md                                        (righe di TASK-071)
docs/tasks/TASK-071.md
```

Toccati e poi riportati come in `main`, dopo il giudizio (commit
`0e8add6` e il successivo): `route_engine/words.py`, `route_engine/optimizer.py`,
`tests/test_words.py`, e i file nuovi `route_engine/retrace.py` e
`tests/test_retrace.py`, tutti in `services/route-engine/`.
`docs/ROUTE_ENGINE.md` non cambia: il motore non cambia.

## Fuori scope

- `network.py`, `directions.py`, `shapes/image_outline.py`, `__main__.py`,
  `pyproject.toml` (TASK-072), `apps/mobile`, `services/api`,
  `packages/shared-types`.
- Le lettere squadrate: è un cambio di stile, lo decide l'utente (sotto,
  «Proposta»).
- Lettere unite dall'alto e scala per lettera: TASK-067.
- Nessuna dipendenza nuova.

## Verifica: cosa succede sui campioni di `main`

«CIAO», «BELLO» e «MAX» a 15 km rigenerati con il codice di `main`
(`TASK-071_*_v1.gpx`): distanza, somiglianza, lettere, scale e gallerie
uguali ai campioni di TASK-050 e TASK-059. Misure sul disegno piazzato
dalla ricerca: quota del percorso su strade corse due volte, contro la quota
del disegno che la lettera ripassa; quota dei tratti ripassati con il
percorso entro 1/8 dell'altezza, e con una strada corsa due volte entro la
stessa distanza; metri corsi una volta sola accanto a un tratto ripassato.

| Caso | Somigl. | Strade doppie / disegno | Tratti vicini al percorso / a una strada doppia | Corsi una volta accanto a un tratto |
|---|---|---|---|---|
| CIAO Trento | 0,82 | 72% / 74% | 82% / 82% | 731 m |
| CIAO Levico | 0,87 | 80% / 74% | 92% / 90% | 540 m |
| CIAO Milano | 0,97 | 51% / 74% | 99% / 87% | 3694 m |
| BELLO Trento | 0,74 | 75% / 79% | 83% / 72% | 2524 m |
| BELLO Levico | 0,75 | 76% / 79% | 84% / 80% | 982 m |
| BELLO Milano | 0,91 | 77% / 79% | 89% / 83% | 1167 m |
| MAX Trento | 0,92 | 92% / 91% | 94% / 91% | 812 m |
| MAX Levico | 0,89 | 91% / 91% | 87% / 87% | 393 m |
| MAX Milano | 0,95 | 77% / 91% | 94% / 94% | 2325 m |

Cosa si vede sovrapponendo percorso e disegno:

- **Sì, succede**, e soprattutto a **Milano**: marciapiedi e vie parallele
  a 20–60 m danno al ritorno un'altra strada, e la base fra le lettere va e
  torna su due vie diverse, con anelli larghi quanto un isolato. A Trento
  «BELLO» ha anelli sulla base e nella E, «MAX» un anello di 800 m sulla X.
- Succede dove l'andata ha fatto zig-zag: con le strade appena usate a metà
  prezzo (ADR-0044), il ritorno prende la via dritta accanto appena lo
  zig-zag è lungo più del doppio.
- **Non è l'unico difetto**, e a Trento e Levico non il più grande: il
  percorso spesso non arriva alle punte dei tratti (gambe della M, bracci
  della E) e ondeggia fra le vie per tutta la fascia del corridoio
  (1% del percorso, circa 150 m a 15 km). Questo il ritorno sulla stessa
  strada non lo cambia.
- Sul grafo piccolo di Levico dei test (1 km) il ritorno è già quasi sempre
  sulla stessa strada: 151 m fuori posto in «MAX», niente nelle altre.

## Cosa è stato provato

`words.compose` taglia i tratti ripassati negli stessi punti all'andata e
al ritorno; le parole si tracciano con `retrace.snap_retraced`: ogni punto
tiene il suo nodo di strada, e un lato già disegnato al contrario ripete
all'indietro i nodi dell'andata (ADR-0067; codice nel commit `0e8add6`).

Provato e scartato, sugli stessi 9 piazzamenti di `main`
(`out/task071/variants.py`, fuori dal repository):

| Variante | Percorso rispetto a `main` | Somiglianza |
|---|---|---|
| ritorno a specchio, strade usate al primo passaggio a metà prezzo (scelta) | +2…+24%, mediana +5% | uguale ±0,03, MAX Levico −0,04 |
| come sopra, strade usate al primo passaggio al doppio | +6…+23%, mediana +15% | da −0,10 a +0,05 |
| come la scelta, senza il nodo fisso per punto | simile | a Milano «CIAO» resta al 55% di strade doppie |
| come la scelta, avvicinarsi al disegno a metà prezzo al primo passaggio | simile | più bassa in 8 casi su 9 |

La prima versione (strade usate al doppio) ha dato campioni con lettere
fino al 40% più piccole («BELLO» a Trento 339 m invece di 571): scartata.

## Campioni e giudizio

18 GPX in `samples/`: `TASK-071_*_v1.gpx` prima, `TASK-071_*_v2.gpx` dopo;
righe in `samples/LOG.md`.

| Caso | Prima: somigl. · lettere | Dopo: somigl. · lettere · km | Strade doppie dopo / disegno |
|---|---|---|---|
| CIAO Trento | 0,82 · 773 m | 0,91 · 603 m · 15,2 (partenza a 1 km) | 71% / 74% |
| CIAO Levico | 0,87 · 693 m | 0,75 · 496 m · 14,7 | 82% / 74% |
| CIAO Milano | 0,97 · 810 m | 0,97 · 785 m · 15,3 | 77% / 74% |
| BELLO Trento | 0,74 · 571 m | 0,78 · 410 m · 14,9 | 92% / 79% |
| BELLO Levico | 0,75 · 493 m | 0,74 · 371 m · 15,8 | 84% / 79% |
| BELLO Milano | 0,91 · 571 m | 0,87 · 495 m · 15,3 | 81% / 79% |
| MAX Trento | 0,92 · 655 m | 0,91 · 664 m · 14,5 | 88% / 91% |
| MAX Levico | 0,89 · 542 m | 0,84 · 635 m · 15,9 | 88% / 91% |
| MAX Milano | 0,95 · 724 m | 0,96 · 715 m · 15,3 | 92% / 91% |

In tutti e 9 i casi dopo, ogni tratto ripassato che ha il percorso vicino
ha anche una strada corsa due volte (le due quote coincidono).

**Quanta strada costa il ripasso**: il 71–92% del percorso è su strade
corse due volte, cioè 5,4–7,0 km su 15 sono il secondo passaggio. È il
prezzo delle lettere a tratto singolo (ADR-0056), c'era anche prima; il
ritorno sulla stessa strada aggiunge circa il 5% a parità di piazzamento,
che la ricerca paga con lettere un po' più piccole. Inversioni a U: 5–25 a
parola (MAX a Milano 13, BELLO a Levico 25).

Pagina di giudizio (sì / quasi / no, «Copia le risposte»):
https://claude.ai/artifact/Ksqdw6Uq9a1Qj5kqBMLcBd

**Giudizio dell'utente** (2026-09-26), sui campioni dopo, con quello di
prima fra parentesi:

| | Trento | Levico | Milano |
|---|---|---|---|
| CIAO | quasi (sì) | quasi (sì) | sì (sì) |
| BELLO | no (no) | no (quasi) | quasi (sì) |
| MAX | sì (sì) | sì (sì) | sì (sì) |

Quattro casi peggiorano, nessuno migliora. I quattro sono quelli con le
lettere più piccole di prima (−13…−28%); «MAX», grande quanto prima, resta
`sì` ovunque. Le linee più sottili non compensano lettere più piccole.

**Forme non-parola**: cuore, gatto e stella a 15 km a Trento, Levico e
Milano, con il codice di `main` e con quello del branch: stessi punti
(impronta SHA-256 dei punti uguale in tutti e 9 i casi,
`out/task071/shapes_hash.py`, fuori dal repository).

## Proposta per l'utente: lettere squadrate (non fatta)

Nello screenshot di Strava che l'utente ha mandato («2024», «2025»,
«2026», «HURRY») le lettere sono **squadrate**: solo tratti dritti ad
angolo retto, ciascuno lungo una via della griglia, corso all'andata e al
ritorno sulla stessa strada. Sono alte uguali, larghe quasi quanto alte e
vicine fra loro: quattro cifre stanno in circa 7–9 km. Il nostro alfabeto
(ADR-0044, ADR-0056) ha curve (C, O, S, G, U, J, B, D, P, R) e diagonali
(A, K, M, N, V, W, X, Y, Z) che su una griglia di vie diventano scale e
zig-zag: è la parte del percorso che si legge peggio, ed è da lì che
nasce il ritorno su un'altra strada.

Cosa sarebbe, se l'utente la vuole:

- un secondo alfabeto, `letters_block.json`, nello stesso formato: O e D
  rettangoli, C e U rettangoli aperti, S e G a gradini, E F H I L T come
  oggi; le diagonali (K, M, N, V, W, X, Y, Z, A) o a 45° o a gradini, da
  provare sulle strade;
- lettere larghe 0,8–1 dell'altezza e spazi più stretti (0,3 invece di
  0,6), come nello screenshot;
- la parola girata sulla griglia delle vie invece che dritta entro ±15°
  (oggi ADR-0038): un'altra ricerca della rotazione, solo per le parole;
- campioni «CIAO», «BELLO», «MAX» squadrati accanto a quelli di oggi, e il
  giudizio dell'utente decide se lo stile sostituisce quello di oggi o se
  diventa una scelta nell'app.

È un cambio di stile, cioè di cosa l'utente vede: lo decide l'utente
(`CLAUDE.md`, «Autonomia»). Andrebbe in un task suo, dopo TASK-067 o al
posto di una parte di TASK-067.

## Esito

Verificato: il ritorno su un'altra strada c'è, soprattutto a Milano. Il
ritorno sulla stessa strada lo toglie del tutto, ma allunga il percorso e
la ricerca rimpicciolisce le parole: per l'utente 4 parole su 9 peggio,
nessuna meglio. Su scelta dell'utente (2026-09-26) il motore resta com'è:
il codice è nel commit `0e8add6` e il commit dopo lo toglie; nella PR
restano verifica, 18 campioni, giudizio e ADR-0067 «Scartata». Il seguito
proposto sono le lettere squadrate (sopra), da decidere dall'utente;
TASK-067 va rivisto sapendo che lettere più piccole si leggono peggio.
