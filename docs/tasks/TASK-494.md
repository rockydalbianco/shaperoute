# TASK-494 — Le scadenze della vela: revisione, ripiegatura della riserva e i dati della vela

**Stato**: Proposto · parte 0 (questa PR, soli documenti): le domande
all'utente
**Fase**: 5 · **Branch**: `docs/TASK-493-494-takeoffs-glider-checks` (parte 0), poi
`feat/TASK-494-<parte>-…` per ogni parte
**ADR**: ADR-0401 · numeri dal Coordinatore (fork 3), 2026-11-23

## Obiettivo

Nella scheda di una vela, di una riserva e di un imbrago dell'attrezzatura
(TASK-486) il pilota scrive i dati che contano in volo (classe EN/LTF,
taglia, peso al decollo) e le sue scadenze: la revisione della vela, la
ripiegatura della riserva, il controllo dell'imbrago. MuW gliele ricorda
prima che arrivino, a una data o a un numero di ore di volo.

## La richiesta (2026-11-23)

> «Attrezzatura anche per il parapendio.» Tra le idee proposte: «la
> scadenza della vela in un'altra [scheda]».

## Contesto da leggere

- `tasks/TASK-486.md` e ADR-0393: l'attrezzatura (tipi in una lista fissa
  che può solo crescere, le ore contate dal server, «Retire», il limite e
  la parte G, l'avviso nella campanella).
- `services/api/shaperoute_api/gear.py` (docstring), `docs/API.md`
  «Gear».
- `tasks/TASK-479.md` «Gli avvisi» (le frasi sulla sicurezza passano
  dall'utente).

## Cosa c'è già

- I tipi `paraglider` e `harness`; manca `reserve`.
- Le ore e le uscite di ogni attrezzo, contate dal server dai voli
  agganciati; il limite in metri (`limit_m`) e il suo avviso (486 G).

## Vincoli dal Coordinatore (2026-11-23)

- Il modello dell'attrezzatura è di TASK-486 (E2, F2, G2 in corso):
  nessun file `gear` si tocca prima che il Coordinatore approvi la lista.
- La migrazione si chiede al Coordinatore con la lista dei file del
  server, non si prenota prima.
- Date e promemoria sono dati che raccogliamo: una riga di privacy prima
  dell'OTA.

## Le parti (proposta, l'ordine dopo le risposte)

### Parte 0 — documenti (questa PR)

Il task, l'ADR, le domande all'utente.

### Parte A — Il server

- Migrazione: il tipo `reserve` nella lista; una tabella nuova
  `gear_checks` (attrezzo, tipo di scadenza, ultimo controllo, ogni quanti
  mesi, ogni quante ore, nota) e i campi di volo dell'attrezzo (classe,
  taglia, peso minimo e massimo) in una tabella a parte, per non cambiare
  il corpo di `gear` usato dalle app di oggi.
- Rotte nuove sotto `/me/gear/{id}/checks`; la prossima scadenza
  calcolata dal server (data e ore, la prima che arriva).
- Un file nuovo accanto a `gear.py`, che resta della sessione di 486.

### Parte B — L'app

- Nella scheda di vela, riserva e imbrago: «Flight data» e «Checks»
  («Last repack», «Every 12 months», «Next: 12 Mar 2027»); un componente
  nuovo in `src/gear/`, agganciato a `GearEditor.tsx` col via di 486.

### Parte C — L'avviso

- Una voce nella campanella 30 giorni prima e il giorno della scadenza,
  una volta sola per scadenza (come 486 G); in «Pronto al decollo» una
  riga se una scadenza dell'attrezzatura del volo è passata (testo
  approvato dall'utente).

## Domande all'utente (parte 0)

1. **Quali scadenze.** Proposta: revisione della vela (di solito ogni 24
   mesi o 100 ore), ripiegatura della riserva (di solito ogni 6–12 mesi),
   controllo dell'imbrago; più una scadenza libera con un nome («Radio
   battery»). Gli intervalli li sceglie il pilota, con questi valori già
   scritti e la frase «Check your manual».
2. **Il tipo «riserva».** Proposta: un tipo nuovo `reserve` nella lista
   dell'attrezzatura (le sue ore salgono coi voli come per la vela).
3. **Chi vede cosa.** Proposta: classe e taglia si vedono come il resto
   dell'attrezzo sul profilo; scadenze e peso solo per il proprietario.
4. **Come si avvisa.** Proposta: la campanella 30 giorni prima e il
   giorno stesso, niente push nella prima versione; e una riga in
   «Pronto al decollo» quando una scadenza è passata. Mai «non volare»:
   solo il fatto («Reserve repack was due on 12 Mar»).

## Criteri di accettazione (per tutto il task)

- [ ] Il pilota aggiunge una riserva, scrive l'ultima ripiegatura e
      l'intervallo, e vede la prossima scadenza.
- [ ] Una scadenza a ore si sposta con le ore dei voli agganciati,
      contate dal server.
- [ ] La voce della campanella arriva una volta per scadenza; dopo un
      nuovo controllo la scadenza riparte.
- [ ] Le app di oggi leggono `gear` come prima.
- [ ] Nessun testo dice che si può o non si può volare.
- [ ] La privacy dice delle scadenze nelle cinque lingue e sul sito
      prima dell'OTA; server e OTA col sì dell'utente.

## File toccati

Parte 0 (questa PR, soli documenti):

```
docs/tasks/TASK-494.md        (nuovo)
docs/tasks/TASK-493.md        (nuovo, stessa PR)
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Le liste delle parti si scrivono qui prima di ogni parte, dopo il via del
Coordinatore e della sessione di TASK-486.

## Fuori scope

- Le schede dei costruttori (intervalli presi da un catalogo): li scrive
  il pilota.
- I laboratori di revisione, le prenotazioni, i prezzi.
- Push e email.

## Esito

*(a fine task)*
