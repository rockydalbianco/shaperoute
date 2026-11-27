# TASK-521 — «Explore»: revisione a occhio del catalogo e 3000 disegni nuovi

**Stato**: In lavorazione — parti 0, A e B fatte; parte C = PR #1685 verde
(`e31c380a`), **da non unire finché la 1.2.0 con #1664 non è sui telefoni**
(il Coordinatore la unisce)
**Fase**: 5 · **Branch**: `feat/TASK-521-feed-posts` (#1664, in `main`),
`feat/TASK-521-catalogue` (#1685), `docs/TASK-521` (questi documenti)
**ADR**: ADR-0416 · numeri dal Coordinatore (fork 3), 2026-11-27
**Viene da**: TASK-441 (il catalogo a 2000), TASK-516 (le forme nuove; la sua
D2, le 35 forme nelle altre 59 città, è dentro questo task), TASK-419

## Obiettivo

Guardare a occhio ogni disegno del catalogo di «Explore», togliere quelli che
non si leggono, disegnarne circa 3000 nuovi e tenere solo quelli davvero
riconoscibili. Poi mostrarli all'utente in classifica, dal più bello al più
brutto in ogni categoria.

## Scelte dell'utente

- 2026-11-27, la pagina dei disegni da togliere: «Sì, tutti i 499».
- 2026-11-27: «si ne voglio 3000 nuovi utilizzabili e poi fai una classifica
  e mettili in mostra dal più bello al più brutto in ogni categoria».
- 2026-11-27, la lista delle forme nuove da disegnare: «Sì, va bene».
- 2026-11-27, la pagina della classifica, sui 1263 disegni con qualche
  difetto (voto 1): «Sì, tienili tutti».

## Parte 0 — l'analisi (fatta)

Tutti i 2031 disegni di allora guardati a occhio su fogli da 45. **La
somiglianza ≥ 0,90 non vuol dire che il disegno si legga.** Usciti 162 sicuri
e 337 dubbi: forme che non si riconoscono, grovigli di strade, linee che si
incrociano, scatole. Le parole che non si leggono sono uscite anche loro. La
A a penna alzata non ha la punta e sembra una «n»: è TASK-522, un task del
motore, e nel giro le parole con la A non ci sono.
Il dettaglio è in `out/TASK-521/analisi.md` e `out/TASK-521/da-togliere.json`
(checkout principale, non tracciati).

Due post del feed di esempio usavano percorsi tolti: #1664 li cambia ed è in
`main`, ma arriva ai telefoni solo con la 1.2.0.

## Parte A — i disegni (fatta)

A lotti di circa 300, una città alla volta, ripartibili: un registro jsonl
con una chiave per caso, `out/TASK-521/run.sh`. Le regole del Mac:
- nessun simulatore acceso;
- carico sotto 8, memoria libera almeno al 30%, 10 GB liberi sul disco di
  sistema;
- il pianificatore sotto il limite, controllato ogni 2 s (30 GB a piedi,
  5 GB in bici). Una città che lo supera va in `over-limit.txt` e il limite
  non si alza.
- Il Coordinatore ha chiesto due pause, per un `npm ci` e per le foto di
  TASK-520: il file `PAUSA`.

Il motore non è cambiato.

| Gruppo | Casi | Passano il filtro | Tenuti a occhio |
|---|---|---|---|
| Forme a piedi (8 forme, 5–21 km) | 1817 | 1422 | 1359 |
| Forme di TASK-516 (10 forme, 5 e 10 km, 36 città) | 680 | 455 | 421 |
| Parole a penna alzata senza la A | 851 | 745 | 596 |
| Bici (8 forme, 20–50 km) | 1310 | 863 | 744 |
| **Totale** | 4658 | 3485 | **3120** |

- **Le forme di TASK-516:** pupazzo di neve, pallone e racchetta escono dal
  giro dopo i lotti 7 e 8.
  - Sulle strade il pupazzo di neve sembra una bottiglia: nessun disegno
    buono su 16.
  - Il pallone e la racchetta escono belli solo 3 volte su 24 e 2 su 19.
  - Nell'app le forme restano.
- **Milano e Barcellona** sono fuori dai lotti delle forme di TASK-516:
  sono le città della D1.
- **Le estrazioni per la bici:** le mappe vengono da Geofabrik, una alla
  volta. Ognuna è filtrata con `osmium tags-filter w/highway` e il file
  grezzo viene cancellato.
- **Bici oltre i 5 GB:** sette gruppi sono finiti nella lista: Berlino,
  Dublino e Amburgo a 40 e 50 km, Bruxelles a 50.
- **Dodici città bici non fatte:** Londra, Lione, Monaco, Praga, Stoccolma,
  Vienna, Zagabria, Zurigo, Dubai, New York, San Francisco e Sydney. Sono
  rimaste ferme perché i 3000 c'erano già (il Coordinatore, 2026-11-27).

## Parte B — il filtro, l'occhio, la classifica (fatta)

- **Il filtro:** quello del catalogo (somiglianza ≥ 0,90, distanza ±10%, niente
  autostrade e superstrade) più una regola nuova. Le strade fatte due volte
  non superano di più di 8 punti la mediana della stessa forma nel catalogo
  (ADR-0416).
- **L'occhio:** dopo il filtro ho guardato tutti i disegni, un voto da 0 a 3:
  - 0: esce;
  - 1: si legge con qualche difetto;
  - 2: buono;
  - 3: bellissimo.

  Voti nei `lots/*/grades.tsv`.
- **La classifica:** in ogni categoria prima il voto, poi la somiglianza meno
  le strade in più. È in `out/TASK-521/classifica.html` (mandata
  all'utente) e `tenuti.tsv`.

## Parte C — il catalogo (PR #1685, verde, ferma)

- **Il seme:** 2161 − 499 + 3120 = **4782 percorsi**: 2756 forme, 868 parole,
  1158 uscite in bici.
- **Come si scrive:** con `out/TASK-521/scrivi_catalogo.py`, che usa
  `catalog_seed.city_files` com'è. Prima di scrivere, lo script prova che
  chiavi e registri di `main` ridanno il seme di prima, identico byte per
  byte.
- **I file:** `catalog/seed/*.json` (63), `tools/catalog_kept.json` e
  `catalog/README.md`. La lista è approvata dal Coordinatore.
- **Le prove:**
  - jest: `exploreCatalogEdit.test.ts`, `AppFeed` e `AppExploreStart`;
  - pytest: 261 test del catalogo e di `recommended`;
  - CI verde.

**Per il passo sul server** (Coordinatore, col sì dell'utente):
- **La memoria:** il seme passa da 42 a 99 MB. Al caricamento l'API ha un
  picco di 650 MB invece di 306, circa +350 MB.
- **Gli id:** cambiano per i 499 tolti. Per questo il passo va fatto solo
  con la 1.2.0 sui telefoni.
- **Da dove si parte:** il passo 26 ha caricato 2161 percorsi.

## Cosa resta

1. La 1.2.0 con #1664 sui telefoni; poi il Coordinatore unisce #1685. Se
   `main` tocca `catalog/` prima di allora, la PR si riallinea rifacendo
   `scrivi_catalogo.py` su `main`.
2. Il passo sul server del catalogo nuovo (Coordinatore, sì dell'utente).
3. La chiusura: questo file a `Done`, la riga in `archive/COMPLETATI.md`,
   ADR-0416 a «Attiva», «TASK-521 fatto» al Coordinatore.
