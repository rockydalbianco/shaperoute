# TASK-445 — Quanto dura ogni fase di un percorso

**Stato**: Done — misure fatte, le 3 ottimizzazioni scritte, l'utente ha
scelto «solo percorsi identici» (2026-11-11)
**Fase**: 5 · **Branch**: `docs/TASK-445-route-job-timing` (#1147),
`docs/TASK-445-done` (chiusura) ·
**ADR**: nessuno (solo misure)

## Obiettivo

Sapere dove va il tempo di `POST /route-jobs` prima di ottimizzare (P4 della
prova nel simulatore del 2026-11-11, `out/prova-app-2026-11-11/PROPOSTE.md`).
In uscita: una tabella dei tempi per fase, le 3 ottimizzazioni che fanno
guadagnare di più con la loro stima, e una domanda all'utente.

## Confini

- Nessun file di motore, API o app. Solo `out/TASK-445/` (git-ignored) e
  questo file.
- Misure sul Mac in locale, un processo alla volta, col «turno del Mac» del
  Coordinatore e carico a 1 minuto non sopra 4 (lo script esce da solo).
- Server: nessuna misura nuova. Si usano le righe «times» già raccolte
  (`out/TASK-435/server-times.txt`,
  `out/TASK-436/server-job-times-snapshot-2026-11-11T1330Z.txt`). Una misura
  sul server solo dopo il passo server 8 e col via del Coordinatore.
- Un'ottimizzazione che tocca il motore entra nella coda del motore (oggi
  #1130 → TASK-435 B → TASK-447), con un task suo.

## Come si misura

`out/TASK-445/phases.py` (lanciato da `run.sh`) fa la richiesta come il
processo di calcolo dell'API: `images.plan_request` (zona, ricerca dalla
partenza, partenze vicine nei processi figli, scelta, alternative), poi
`jobs.with_choices` (indicazioni) e il corpo JSON. Cuore da 5 km da Piazza
Duomo, Trento; zona da `out/TASK-434/cache-view`, nessuna rete.

- **A freddo**: un processo nuovo per richiesta (import, zona letta dal
  disco, richiesta). 10 volte.
- **A caldo**: un processo, zona in memoria e una richiesta di riscaldamento,
  poi 10 richieste (il processo caldo dell'API, ADR-0242).

Le fasi dentro la ricerca: maschera delle strade, piazzamento
(`RoadMask.fit_xy`), proiezione (`project_shape`), routing
(`snap_to_network`), somiglianza, misure del percorso.

## Il server, dalle righe «times» (20 percorsi con partenze vicine)

| Fase | Mediana | Q1–Q3 | Max |
|---|---|---|---|
| Totale | 5,44 s | 4,92–7,02 | 11,65 |
| Zona (crop) | 0,12 s | 0,06–0,46 | 3,30 |
| Piano dalla partenza | 4,05 s | 2,75–5,13 | 8,12 |
| Attesa delle partenze vicine | 1,12 s | 0,70–2,21 | 4,05 |
| Resto (scelta, indicazioni, JSON) | 0,04 s | 0,01–0,07 | 0,24 |

Il piano dalla partenza è circa tre quarti del totale; l'attesa delle
vicine circa un quinto (fino a tre quarti in un caso). La zona costa solo
quando va letta dal disco (5 su 20 sopra 0,5 s). In 10 su 20 la ricerca
usa tutte le 30 tracce; converge prima solo in 3. In 12 su 20 vince il
percorso dalla partenza dell'utente.

Queste righe sono del motore di prima di #1105 e #1106, che arrivano sul
server col passo 8 (dove girano già due processi di calcolo caldi,
TASK-276 B): vanno rilette dopo quel passo.

`traces=30` vuol dire che la ricerca dritta (20 tracce, `MAX_TRACES`) non
ha trovato un percorso buono ed è ripartita con la forma inclinata (10 in
più, `TILTED_TRACES`, TASK-232).

## Il Mac (2026-11-11, 15:09–15:10)

Codice a `c713bed2` (`origin/main`, dopo #1105 e #1106). Carico a 1 minuto
3,7–4,5, col giro delle parole di TASK-441 acceso (un processo, ~77% di una
CPU). Stesso risultato in tutte le 20 prove: somiglianza 0,94, 4 724 m, 2
alternative, vince una partenza vicina. Dati in `out/TASK-445/`
(`cold.jsonl`, `warm.jsonl`, `summary.txt`).

| Fase (secondi, mediana di 10) | A freddo | A caldo |
|---|---|---|
| Avvio del processo e import | 0,33 | — |
| Zona letta dal disco (pickle 19 MB) | 0,59 | 0 |
| Zona ritagliata | 0,03 | 0,04 |
| Grafo serializzato per i processi figli | 0,13 | 0,12 |
| **Piano dalla partenza** | **0,88** | **0,85** |
| · maschera delle strade | 0,14 | 0,04 |
| · piazzamento (1 230 prove) | 0,05 | 0,05 |
| · routing delle 17 tracce | 0,57 | 0,63 |
| · · di cui costi del corridoio | 0,25 | 0,29 |
| · somiglianza | 0,07 | 0,08 |
| **Attesa delle partenze vicine** | **0,62** | **0,73** |
| Scelta, alternative, misure | 0,01 | 0,01 |
| Indicazioni | 0,09 | 0,09 |
| JSON (103 KB) | 0,01 | 0,01 |
| **Richiesta intera** | **2,50** (2,28–2,78) | **2,00** (1,78–2,30) |

I processi figli delle partenze vicine ci mettono 1,0–1,5 s contro 0,85 s
del piano dalla partenza, per la stessa ricerca: ognuno è un processo
nuovo (`spawn`: import di nuovo, ~0,3 s), riceve il grafo per pipe, rifà
le tabelle del grafo e la maschera a freddo, e gira a priorità bassa.
L'attesa è quella differenza.

## Le 3 ottimizzazioni

Stime sul Mac misurate; quelle sul server sono una proporzione (il server
è 4–5 volte più lento sul piano), da verificare.

1. **Partenze vicine in processi già caldi.** Oggi ogni richiesta apre 2–3
   processi nuovi. Se i processi restano accesi accanto al processo di
   calcolo, con la zona già in memoria e le tabelle già fatte, i figli
   finiscono insieme al piano dalla partenza. Guadagno: sul Mac −0,5 s su
   2,0 (attesa da 0,73 a ~0,2, grafo serializzato 0,12 → 0); sul server
   ~−1 s sulla mediana di 5,4 (attesa 1,12 + serializzazione). Stessi
   percorsi. Tocca motore (`nearby_starts.py`) e API
   (`route_processes.py`). Rischi: memoria (una zona per processo, sul CX33)
   e il blocco di TASK-248 coi pool. **Non accorcia il primo percorso**:
   l'attesa delle vicine la toglie già dalla vista TASK-435 (A in `main`
   con la #1105, B nella #1139, C l'app con «Looking for other routes…»),
   dopo la quale il primo percorso arriva in ~1,3 s sul Mac. Questa
   accorcia il tempo delle alternative e il lavoro del server.
2. **Routing più veloce, stessi percorsi.** Il routing è tre quarti del
   piano (0,63 di 0,85 s), e quasi metà sono i costi del corridoio, ricalcolati
   per ogni traccia. Vettorizzarli o riusarli tra le tracce: stima −0,15/−0,3 s
   sul Mac (10–15% del piano), −0,7/−1,4 s sul server. Stima incerta: prima
   serve un profilo di `snap_to_network` (un altro turno del Mac). Tocca
   solo il motore; serve la prova degli stessi percorsi.
3. **Zone già in memoria nei processi di calcolo.** Leggere la zona dal
   disco costa 0,6 s sul Mac e 0,5–3,3 s sul server, in 5 percorsi su 20:
   ogni processo tiene solo 2 zone (`MAX_ZONES`). Caricare all'avvio le
   zone più usate, o tenerne di più se la memoria basta. Guadagno: in media
   ~−0,4 s per percorso, fino a −3 s in un percorso su quattro. Solo API,
   nessun percorso cambia: è la più economica.

Non entrano: indicazioni (0,09 s) e JSON (0,01 s) sono già piccoli; la
lettura dei risultati da parte dell'app ha già i giri veloci
(`QUICK_POLLS` in `routes.ts`).

## La domanda all'utente

Nella metà dei percorsi sul server la ricerca con la forma dritta non
trova un percorso buono e ne fa una seconda con la forma inclinata: 10
tracce in più su 30, circa un terzo del tempo del piano (~1,3 s sul
server). Tagliarla o accorciarla rende quei percorsi più veloci, ma
qualche forma verrebbe meno fedele o non verrebbe proprio. **Si prova a
tagliarla (più veloce, forme a volte peggiori), o si ottimizza solo a
percorsi identici (le tre sopra)?**

Ogni scelta che tocca `services/route-engine` entra nella coda del motore
(#1130 → TASK-435 B → TASK-447) con un numero di task chiesto al
Coordinatore; il profilo di `snap_to_network` chiede un altro turno del
Mac.

**Risposta dell'utente (2026-11-11)**: «Solo percorsi identici». La
seconda ricerca inclinata resta com'è; si fanno solo ottimizzazioni che
lasciano gli stessi percorsi (le tre sopra).

## Esito

Done il 2026-11-11 (#1147 e la PR di chiusura). Il tempo di un cuore da 5 km
sul Mac è 2,0 s a caldo: tre quarti della ricerca sono routing, e l'attesa
delle partenze vicine viene dai processi figli aperti a ogni richiesta.
Restano come task nuovi, coi numeri del Coordinatore: le 3 ottimizzazioni
a percorsi identici (la 1 e la 2 nella coda del motore; la 2 dopo un
profilo di `snap_to_network`, con un turno del Mac) e la rilettura dei
tempi del server dopo il passo 8.
