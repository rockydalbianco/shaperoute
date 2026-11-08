# TASK-412 — Documenti snelli: cosa legge una sessione all'avvio

**Stato**: In corso · proposta approvata dall'utente il 2026-11-08 («Sì, approvo») · numero dal Coordinatore (local_3f55a0e9), nessun ADR
**Branch**: `docs/TASK-412-lean-docs` · una PR
**Richiesta dell'utente**: «rendere il progetto più veloce ed efficiente per
le sessioni Claude, riducendo ciò che ogni sessione legge all'avvio» —
traguardo: CLAUDE.md + STATUS.md + INDEX.md + task file sotto i 30 KB,
senza perdere informazioni.

## Il problema, misurato (2026-11-08, `main` 8c1e84da, al momento della proposta)

| File | Byte | Righe | Si legge all'avvio? |
|---|---:|---:|---|
| `docs/STATUS.md` | 437.930 | 6.223 | sì, intero |
| `docs/DECISIONS.md` | 1.477.584 | 24.951 | no, ma `INDEX.md` lo indica in 50+ righe |
| `docs/INDEX.md` | 10.576 | 117 | sì, intero |
| `docs/AGENTI.md` | 10.757 | 193 | con più agenti |
| `CLAUDE.md` | 6.303 | 136 | sì, sempre |
| task file | mediana 6.143, 90° pct 19.173, max 53.979 | | sì |

Oggi una sessione legge almeno **455 KB** prima di cominciare.

In `STATUS.md`: «In lavorazione» ha 136 voci (circa 120 task), ma secondo i
task file **circa 80 sono già Done**; «Prossimo passo» (128 righe) è fermo al
2026-10-25; «Note per la prossima sessione» parla ancora del PC Windows.
`AGENTI.md` è fermo al 2026-10-10 (prossimo task «TASK-275»).

## La proposta

### Regola d'oro: niente si cancella

Tutto ciò che esce da un file viene copiato **parola per parola** in un file
d'archivio **nuovo**. Gli archivi «fino-al-2026-11» sono congelati: non si
modificano più. Alla fine un controllo meccanico (script usa-e-getta, fuori
dal repository) verifica che ogni riga tolta sia presente nell'archivio.

File nuovi:

- `docs/archive/STATUS-fino-al-2026-11.md` — copia integrale dello
  `STATUS.md` di oggi (tutte le 6.223 righe, in ordine).
- `docs/archive/DECISIONS-fino-al-2026-11.md` — tutte le 422 voci di oggi,
  intere, in ordine.
- `docs/archive/INDEX-fino-al-2026-11.md` — le righe tolte da `INDEX.md`.
- `docs/archive/COMPLETATI.md` — **unico archivio che cresce**: una riga per
  ogni task chiuso da qui in avanti.

### `STATUS.md` nuovo (obiettivo ≤ 10 KB)

```
# STATUS — Dove siamo adesso
(3 righe: unica fonte di verità; lo storico è in docs/archive/)
Ultimo aggiornamento · Fase

## In una riga          ≤ 10 righe, riscritta e attuale
## Prossimo passo       un task, più una riga «Da pubblicare con l'ok
                        dell'utente» (OTA/server in sospeso di task già Done)
## In lavorazione       solo task non Done, al massimo 5 righe ciascuno:
  - **TASK-NNN — titolo** · stato in una frase (parte, PR, cosa aspetta)
    File toccati: solo quelli occupati adesso (branch/PR aperti), oppure «—»
    → `tasks/TASK-NNN.md`
  Task fermi su una scelta dell'utente (Proposto/Todo, nessun file
  occupato): una riga sola, «In attesa dell'utente: TASK-…, …».
## Bloccato
## Come si aggiorna     le regole nuove (sotto)
```

Il dettaglio che oggi sta nelle voci lunghe c'è già nei task file e, parola
per parola, nell'archivio. La lista dei task davvero aperti la confronto con
i task file e la faccio confermare al Coordinatore prima del merge (alcuni
task file sono indietro rispetto a `STATUS.md`, per esempio TASK-401).

### `DECISIONS.md` nuovo

```
# DECISIONS — Registro delle decisioni
(intestazione di oggi + «non si legge intero: grep»)

## Indice
ADR-0001 — L'AI non genera percorsi · 2026-09-22 · Attiva
…una riga per ognuna delle 422 voci (numero, titolo, data, stato), con
le precisazioni e aggiunte come righe a sé…

## Voci nuove
(le voci da qui in avanti, intere, nel formato di oggi)
```

Una voce archiviata che passa a «Superata» non si tocca: si cambia la sua
riga d'indice («Superata da ADR-0xxx») e la voce nuova lo dice. Le voci
nuove le archivia il Coordinatore a ogni cambio di mese
(`docs/archive/DECISIONS-<anno>-<mese>.md`), lasciando la riga d'indice.

### `CLAUDE.md` (resta ≤ 7 KB)

In «Prima di iniziare»:

> **`DECISIONS.md` e i file in `docs/archive/` non si leggono interi**: si
> cercano con grep per numero, per esempio
> `grep -n "ADR-0300" docs/DECISIONS.md docs/archive/*.md` o
> `grep -n "TASK-347" docs/archive/*.md`, e si legge solo la voce trovata.

In «A fine task, sempre», al posto della riga su `STATUS.md`:

> - [ ] `docs/STATUS.md`: la voce del task **esce** da «In lavorazione» e
>   diventa **una riga** in fondo a `docs/archive/COMPLETATI.md`
>   (`TASK-NNN — titolo · data · PR · esito in una frase`). Quello che resta
>   da fare (OTA, server, prova) va nel task file e, se aspetta l'utente, in
>   «Prossimo passo». In «In lavorazione» al massimo 5 righe per task:
>   i dettagli vanno nel task file, non qui.
> - [ ] Decisione tecnica: voce intera in «Voci nuove» di `DECISIONS.md` e
>   la sua riga in «Indice».

### `INDEX.md` (obiettivo ≤ 6 KB)

- La stessa regola del grep, nella tabella «Regola generale».
- Le righe di instradamento restano per **area** (documento di dominio +
  ADR); i rimandi a task file chiusi si tolgono quando un documento di
  dominio copre l'area, le descrizioni si accorciano a una riga; righe
  doppie unite. «Stato dei documenti» (tutti «pieno» tranne due) diventa
  due righe. Le righe originali vanno in `archive/INDEX-fino-al-2026-11.md`.

### `AGENTI.md`: lo riallinea il Coordinatore, non questo task

Il nuovo Coordinatore (sessione del 2026-11-08) lo riallinea sul suo branch
`docs/agenti-2026-11-08`: due PR sullo stesso file andrebbero in conflitto.
Gli ho chiesto di copiare parola per parola le righe che toglie (coda del
2026-10-10, «Fatto in questa tornata», «Chiusi dal…», «Numeri» fermi a
TASK-275) in `docs/archive/AGENTI-fino-al-2026-11.md`.

### Quanto si legge dopo

| | Oggi | Dopo (obiettivo) |
|---|---:|---:|
| `CLAUDE.md` | 6,3 KB | ≤ 7 KB |
| `STATUS.md` | 438 KB | ≤ 10 KB |
| `INDEX.md` | 10,6 KB | ≤ 6 KB |
| **parte fissa** | **455 KB** | **≤ 23 KB** |

Con un task file fino a 7 KB (il 56% di quelli di oggi; la mediana è 6,1 KB)
si sta sotto i 30 KB. I task file grandi (90° percentile 19 KB) restano
sopra: accorciarli non è in questo task, lo propongo a parte (per esempio un
paragrafo «Dove si è» in cima, da leggere per primo).

## Come si fa (dopo il sì)

1. Numero e finestra dal Coordinatore: nessun'altra sessione scrive su
   `STATUS.md` e `DECISIONS.md` finché la PR non entra.
2. Branch da `origin/main` aggiornato; misure «prima».
3. Archivi creati per copia integrale (`cp`, poi intestazione di una riga).
4. `STATUS.md`, `DECISIONS.md` (indice generato da script dalle intestazioni
   `## ` e dalle righe `**Stato**`), `CLAUDE.md`, `INDEX.md`.
5. Controllo meccanico «nessuna riga persa»; misure «dopo» nella PR.
6. Le PR aperte che aggiungono voci a `STATUS.md`/`DECISIONS.md` andranno
   riscritte nel formato nuovo al loro aggiornamento da `main`: lo dico al
   Coordinatore.

## Fuori scope (proposti al Coordinatore come task separati)

- Compattare la memoria del Coordinatore `coordinatore-session-2026-10-09.md`
  (305 KB → stato attuale sotto 5 KB, cronologia in archivio) e
  `hosting-hetzner-cax21.md` (59 KB).
- Velocità della CI (tempi da `gh run list`) e dei test locali.
- Accorciare i task file grandi.

## File toccati

```
CLAUDE.md
docs/STATUS.md
docs/DECISIONS.md
docs/INDEX.md
docs/tasks/TASK-412.md
docs/archive/STATUS-fino-al-2026-11.md      (nuovo)
docs/archive/DECISIONS-fino-al-2026-11.md   (nuovo)
docs/archive/INDEX-fino-al-2026-11.md       (nuovo)
docs/archive/COMPLETATI.md                  (nuovo)
```

## Criteri di accettazione

- [ ] CLAUDE.md + STATUS.md + INDEX.md ≤ 23 KB.
- [ ] Ogni riga tolta da un file è presente, identica, in un archivio.
- [ ] `DECISIONS.md` ha una riga d'indice per ognuna delle 422 voci.
- [ ] La regola del grep è in `CLAUDE.md` e in `INDEX.md`; le regole di fine
      task dicono dove va la riga di un task chiuso.
- [ ] Misure prima/dopo (byte e righe) nella descrizione della PR.
- [ ] CI verde (PR di soli documenti).

## Esito (2026-11-08, da `main` 843afc9f)

| File | Prima (byte / righe) | Dopo (byte / righe) |
|---|---:|---:|
| `CLAUDE.md` | 6.303 / 136 | 6.913 / 147 |
| `docs/STATUS.md` | 454.374 / 6.459 | 9.030 / 161 |
| `docs/INDEX.md` | 12.260 / 124 | 5.109 / 83 |
| **letti all'avvio, senza task file** | **472.937** | **21.052** |
| `docs/DECISIONS.md` | 1.521.842 / 25.723 | 52.977 / 470 (indice di 437 voci) |
| `docs/archive/STATUS-fino-al-2026-11.md` | — | 454.535 / 6.461 (nuovo) |
| `docs/archive/DECISIONS-fino-al-2026-11.md` | — | 1.522.006 / 25.725 (nuovo) |
| `docs/archive/INDEX-fino-al-2026-11.md` | — | 12.420 / 126 (nuovo) |
| `docs/archive/COMPLETATI.md` | — | 308 / 7 (nuovo) |

Ogni archivio è la copia integrale del file di `main` più due righe di
intestazione: controllato con `diff` (identici riga per riga). La lista dei
task in «In lavorazione» segue i task file non Done (scelta del
Coordinatore); TASK-310 e TASK-315 hanno il task file «In corso» ma erano
in «Completato»: da chiudere nei loro task file. Con un task file di 6 KB
(la mediana) si leggono circa 27 KB all'avvio.
