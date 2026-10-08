# TASK-213 — Nessun commento negativo

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-213-negative-comment-filter`
**Insieme a**: TASK-120 (i commenti), che chiama il filtro · **ADR**: ADR-0176

## Obiettivo

Un commento negativo o brutto non si pubblica. La scelta è dell'utente, del
2026-10-03: «non si possono fare commenti negativi, se uno scrive qualcosa
di negativo o brutto il messaggio viene bloccato». E sull'avviso: «Fai
uscire un alert, dicendo: in questa app non puoi scrivere commenti
negativi, cambia app».

## Contesto da leggere

- ADR-0114, punto 8 (la moderazione): questa scelta ne è la prima eccezione.
- `tasks/TASK-120.md`: l'endpoint dei commenti, che è di TASK-120.

## Cosa fare

1. Un file nuovo, `services/api/shaperoute_api/comment_filter.py`, con la
   funzione pura `check_comment(text: str) -> str | None`. Restituisce `None`
   se il commento si può pubblicare, altrimenti il motivo: per ora solo
   `"negative"`. Niente rete, niente AI, nessuna dipendenza nuova, nessun
   import da altri moduli dell'API.
2. L'elenco delle parole, in italiano e in inglese: gli insulti, che sono
   negativi sempre, e le parole negative, che una negazione subito prima
   rovescia («non è brutto», «not bad»).
3. Le parole si riconoscono anche scritte in modo diverso: maiuscole,
   accenti, lettere tenute lunghe, cifre al posto delle lettere, una lettera
   alla volta.
4. Test: commenti gentili che passano, commenti negativi rifiutati, le
   parole camuffate, le negazioni, i nomi di posti e le parole innocue.
   I test dei posti li ha chiesti il coordinatore.

**Accordo con TASK-120** (sessione «Possibilità di commentare i post»):
TASK-120 chiama `check_comment` in `comments.py` prima di salvare, risponde
`422` con il codice `comment_rejected` e `"reason": "negative"`, e l'app
mostra l'alert. Il testo dell'alert sta nell'app: «You can't write negative
comments in this app. Try another app.». L'utente l'ha detto in italiano,
«In questa app non puoi scrivere commenti negativi, cambia app». Il testo
scritto resta nel campo, così si può correggere.

## Criteri di accettazione

- [x] «Che brutto percorso», «Fa schifo», «You're an idiot», «Worst run
      ever»: rifiutati.
- [x] «BRUTTO», «str0nz0», «m e r d a», «schifoooo»: rifiutati.
- [x] «Non è affatto brutto», «not bad at all»: passano. «non sei uno
      stronzo» resta rifiutato, perché un insulto non si rovescia.
- [x] Troia, Bastardo, Bad Ischl, Cazzago San Martino, Palazzo Schifanoia,
      Scunthorpe, la puttanesca e i funghi porcini: passano.
- [x] Ogni parola dell'elenco, da sola, è rifiutata. Le liste sono scritte
      come si confrontano (minuscole, senza accenti).
- [x] Test verdi, `ruff` e `black` puliti.

## File toccati

```
services/api/shaperoute_api/comment_filter.py
services/api/tests/test_comment_filter.py
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-213.md
```

## Fuori scope

- L'endpoint dei commenti, il `422` e l'alert nell'app: sono di TASK-120.
- Riconoscere il tono, cioè una critica detta con garbo («un po'
  noioso»): servirebbe un'AI. Sul server non c'è (manca Ollama),
  e un servizio esterno vuole il sì dell'utente.
- Titolo e descrizione delle corse pubblicate (TASK-208): restano liberi,
  finché l'utente non sceglie diversamente.
- Segnalare e bloccare chi scrive: TASK-121.

## Esito

Fatto il 2026-10-03. `check_comment` rifiuta insulti, parolacce e parole
negative in italiano e in inglese, anche camuffati, ma non i nomi di posti
(79 test). Non riconosce una critica gentile, «Sei un Bastardo» scritto con
la maiuscola (passa come il paese) né una lettera raddoppiata una sola volta
(«troiaa»). Rifiuta «Brutta caduta, rimettiti presto», che è un commento
affettuoso. I limiti sono scritti in ADR-0176. Il filtro entra in funzione
quando TASK-120 lo chiama.
