# TASK-093 — Scegliere fra più percorsi

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-093-route-choice`

Chiesto dall'utente il 2026-10-01, dopo le prove dall'iPhone di TASK-090:
dalla stessa partenza il percorso è sempre lo stesso, ma basta che il GPS
si sposti di qualche decina di metri per averne un altro, a volte più
bello. Era fra le idee non approvate (`PASSAGGIO.md`, `AGENTI.md`,
`UI.md` «Domande ancora aperte»: «la ricerca li ha già»).

## Obiettivo

Dopo una richiesta l'app mostra fino a 3 percorsi diversi per la stessa
forma o parola, e l'utente sceglie quello che gli piace; GPX e navigazione
usano quello scelto.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` «Partenze vicine (TASK-076)» e §5
- `docs/DECISIONS.md` ADR-0071 (partenze vicine), ADR-0086 (tutti i
  percorsi salvati; a parità di qualità si tengono tutti)
- `docs/API.md` «Richieste in due tempi»
- `docs/UI.md` «Il risultato»
- `services/route-engine/route_engine/nearby_starts.py` (`plan_nearby`,
  `_choose`), `services/api/shaperoute_api/images.py` (`plan_request`)

## Cosa c'è già

Per una forma o una parola il motore calcola già 4 percorsi: dalla
partenza e da 3 punti vicini (25–100 m, ADR-0071), e ne tiene uno. Gli
altri 3 si buttano. Per un'immagine (`plan_image`) le partenze vicine non
ci sono: un percorso solo.

## Cosa fare

**Prima di scrivere codice, da far scegliere all'utente** (prodotto, una
domanda per volta, con un'immagine della schermata):

1. Come si vedono le alternative. Proposta: sulla mappa il percorso scelto
   pieno e gli altri sottili e grigi; sotto, tre tessere «A · B · C» con km
   e somiglianza in percentuale; tocco una tessera e diventa il percorso
   scelto. Il primo è quello che sceglie il motore oggi.
2. Quanti: proposta fino a 3, solo se davvero diversi (non lo stesso
   percorso spostato di pochi metri) e con somiglianza non più bassa di
   0,10 rispetto al migliore.
3. Per un'immagine: niente alternative per ora, oppure alternative dalla
   ricerca stessa (posizioni o rotazioni diverse della forma). Proposta:
   per ora niente.

**Poi** (scelte tecniche su delega, da registrare in `DECISIONS.md`):

4. Motore: `plan_nearby` restituisce anche i percorsi non scelti, in
   ordine, senza calcolare niente in più (nessun secondo in più).
5. API: `RouteResult` ha un campo nuovo, facoltativo, con le alternative
   (punti, distanza, somiglianza, indicazioni di svolta); contratto in
   `packages/shared-types` e `API.md`. Un'app vecchia lo ignora.
6. App: le tessere, la linea sulla mappa, GPX e navigazione dal percorso
   scelto.
7. Registro delle richieste (ADR-0085): l'esito registra anche le
   alternative (impronta, somiglianza), così il replay le controlla tutte.

Se il lavoro risulta troppo grande per una PR, dividerlo in motore + API e
app, chiedendo il numero del secondo task.

## Criteri di accettazione

- [ ] Le scelte 1–3 sono dell'utente e scritte in `DECISIONS.md`.
- [ ] Una forma o una parola dà fino a 3 percorsi diversi, il primo
      uguale a quello di oggi punto per punto (test deterministico sul
      grafo di prova).
- [ ] Il tempo della richiesta non cresce più di 1 s (indicazioni delle
      alternative comprese), misurato su un cuore da 10 km.
- [ ] Un'app che non conosce il campo nuovo funziona come oggi (test di
      contratto).
- [ ] Nell'app si sceglie un'alternativa e GPX e navigazione la usano
      (test); provato sull'iPhone dall'utente.

## File toccati

Previsti; da confermare all'inizio guardando `STATUS.md` «In
lavorazione», perché alcuni sono spesso di altri task.

```
services/route-engine/route_engine/nearby_starts.py
services/route-engine/tests/test_nearby_starts.py
services/api/shaperoute_api/schemas.py, jobs.py, request_log.py, test
packages/shared-types (src/index.ts, fixtures)
apps/mobile/src/route/ (RoutePanel.tsx, una tessera nuova, test)
docs/API.md, docs/UI.md, docs/ROUTE_ENGINE.md, docs/DECISIONS.md,
docs/STATUS.md, docs/tasks/TASK-093.md
```

## Fuori scope

- «Rigenera» per avere altri percorsi oltre ai 3 (più tempo di calcolo).
- Salvare i percorsi per gli altri utenti: TASK-092.
- Cambiare come il motore sceglie il migliore (`_choose`).

## Esito
