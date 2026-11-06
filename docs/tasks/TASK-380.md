# TASK-380 — Roller: i pattini in linea sull'asfalto liscio

**Stato**: In corso — parte 0 (misure e proposta) in PR.
**Fase**: 4 · **Branch**: `docs/TASK-380-0-roller` (parte 0), poi
`feat/TASK-380-a-roller-engine-api`, `feat/TASK-380-b-roller-app` ·
**ADR**: ADR-0324 · numeri dal Coordinatore (2026-11-04) · sessione
dello sport, avviata dal «Coordinatore Sport»

## Obiettivo

Chi va sui pattini in linea riceve un percorso che disegna la forma **solo
dove si pattina**: asfalto e cemento lisci, ciclabili, aree pedonali e
strade tranquille; niente sterrato, niente porfido o ciottoli, niente
strade principali. Lo pattina con passo, voce, salvataggio, Feed, Apple
Salute, Health Connect e Strava del suo sport.

È il terzo sport della fase 1 (TASK-376, ADR-0320), dopo Escursionismo
(TASK-377) e Gravel/MTB (TASK-378): file nuovi più una riga per registro,
come dice `docs/sports/COME-AGGIUNGERE.md`. Ogni altro file è una deroga,
da scrivere in `docs/sports/CONDIVISO.md`.

## Contesto

Scelta dell'utente del 2026-11-04 (`tasks/TASK-376.md`, punto 3): «Sì,
Roller», al posto dello sci di fondo, già «Record only». Indicazione di
allora: asfalto liscio e `inline_skates=yes`, e prima si misura quanta rete
resta.

Nessuna rete di oggi va bene così com'è:

- la rete **foot** (corsa, camminata) prende sentieri, sterrati, scalinate
  escluse ma anche ciottoli e porfido;
- la rete **bike** (ADR-0153, ADR-0167) pedala ogni `track` e le strade
  principali, e fa i marciapiedi «a piedi con la bici».

Chi pattina, per il Codice della strada (art. 190), è un pedone: niente
sensi unici, e le aree pedonali e i marciapiedi sono suoi.

Da leggere: `docs/sports/COME-AGGIUNGERE.md`, `docs/sports/CONDIVISO.md`,
`docs/sports/README.md` (il banco), `docs/sports/bike.md` e
`docs/sports/gravel.md` (le misure della bici), `docs/sports/roller.md`
(le misure di questo task), ADR-0320, ADR-0322.

## Cosa fare

### Parte 0 — misura e proposta (solo documenti)

1. Col banco, un comando per volta, `nice -n 10`, aspettando gli altri banchi
   e le suite: reti di prova con `--loader` (`out/TASK-380/loader.py`),
   senza toccare il motore e senza Overpass (i download grezzi della bici
   della parte 0 di TASK-378). Forme del catalogo a 5, 10, 20 e 30 km
   sulle sei zone.
2. Su cosa corrono i percorsi (superficie, strade con le auto, ciclabili),
   e quanto salgono e scendono, dalle tegole Terrarium (`CONDIVISO.md`, «Le
   quote»): `out/TASK-380/mix.py`. La bici di oggi come base.
3. Quanta rete dice `inline_skates` in OSM (`out/TASK-380/skates_tag.py`).
4. Le misure in `docs/sports/roller.md`, ADR-0324 in DECISIONS come
   «Proposto».
5. Le domande all'utente, una per volta, con una proposta già pronta: nome
   ed emoji, la rete, le distanze, gioco e record, i testi in en/it/de/fr/es,
   «ready». Le risposte qui sotto; ADR-0324 «Accettato».
6. La lista della parte A al Coordinatore, con il numero della migrazione.

## Scelte dell'utente

Da fare, una alla volta. Le proposte dell'agente, dalle misure di
`roller.md`:

1. **Nome ed emoji**: «Roller» 🛼. In tedesco «Inline», perché «Roller» è
   il monopattino; in spagnolo «Patines».
2. **La rete**: `roller` di `roller.md`, cioè asfalto e cemento lisci,
   ciclabili, marciapiedi, aree pedonali e strade fino alle terziarie;
   niente sterrato, ciottoli, porfido, strade principali e secondarie; ogni
   via nei due sensi. Si promette la città e la pianura: in montagna il
   motore spesso dice che la forma non si disegna (Fiemme e Asiago 2 su 9).
3. **Le distanze**: da 5 a 30 km (a 5 km 13 su 18, a 10–30 km 34 su 54).
4. **Gioco e record**: come la bici. Fuori dal gioco delle forme, perché
   su ruote; record personali propri su 5, 10, 21,1 e 42,2 km (le
   maratone sui pattini esistono).
5. **I testi** in en/it/de/fr/es: il nome, «… without a route», e un
   avviso sotto il percorso in «Disegna» su traffico e discese.
6. **Quando si accende**: appena pronto, come Hike, Gravel e MTB: server
   con la parte A e app con la parte B, ciascun passo col sì dell'utente.

## Criteri di accettazione

- [x] 0: le misure delle reti sono in `roller.md`; ADR-0324 è proposto.
- [ ] 0: le scelte dell'utente sono scritte qui, una per una.
- [ ] 0: la lista della parte A è al Coordinatore, con la domanda sul numero
      della migrazione.
- [ ] A: un percorso roller sul grafo di prova sta sull'asfalto liscio e
      lascia fuori sterrato, ciottoli e strade principali; test
      deterministici; corsa, bici e canoa invariate al banco (`compare`).
- [ ] B: lo sport si sceglie, si pattina, si salva e va in Salute; i testi
      sono in cinque lingue.

## File toccati

Parte 0:

```
docs/tasks/TASK-380.md     (nuovo)
docs/sports/roller.md      (nuovo)
docs/DECISIONS.md          (solo ADR-0324, in fondo)
docs/STATUS.md             (righe proprie)
docs/INDEX.md              (una riga)
```

## Dove si è

2026-11-06: misurate col banco quattro reti di prova, dai download
grezzi della bici della parte 0 di TASK-378, senza Overpass. La bici sulla
stessa area è la base:

- **`roller`** (asfalto liscio, niente strade principali e secondarie):
  34 su 54, 10 buoni. Regge in città e in pianura, non in montagna, dove
  senza le secondarie la rete si spezza.
- **`rollersec`** (con le secondarie): 42 su 54, col 12% dei km su strade
  veloci.
- **`rollerquiet`**: 21 su 54.
- **`rollerflat`** (senza le salite oltre l'8%): 26 su 54. Vorrebbe le
  quote nel motore.
- **`inline_skates`**: 4,5 km in sei zone.

Le misure sono in `roller.md`, e ADR-0324 è scritto come proposto.
Prossimo: le scelte dell'utente, una alla volta.

- Gli script del banco sono in `out/TASK-380/` nel worktree della parte 0
  (`friendly-shirley-762bd1`), ignorato da git: `loader.py`, `mix.py`,
  `elevation.py`, `summ.py`, `tags.py`, `skates_tag.py`, `six.sh`.
- Le tegole Terrarium scaricate sono in `out/TASK-380/dem`.
