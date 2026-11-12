# TASK-475 — Lo stretching come sport

**Stato**: Da fare · parte 0 (documenti) nella PR di soli documenti; A e B in coda
**Fase**: 5 · **Branch**: `docs/TASK-475-stretching-sport` (parte 0); A, B
ciascuna col suo branch e la sua PR
**ADR**: ADR-0386
**Dipende da**: TASK-466 (lo stretching nuovo, ADR-0378): la parte B qui
parte solo dopo che la #1216 (466 B, le routine) è in `main`.

## Obiettivo

Lo stretching diventa uno sport del pannello degli sport (gruppo «Other»),
come la palestra: lo scegli, «Draw» ti propone le routine, e una routine
finita è un'attività.

## Scelte dell'utente (2026-11-12)

- «aggiungi lo streching» al pannello degli sport (TASK-473).
- Fra «Apre le routine» (un quadrato che apre solo lo stretching, senza
  cambiare sport) e «Diventa uno sport»: **«Diventa uno sport»**.
- Una routine finita si salva come attività («My activities», calendario,
  condivisione) come la palestra? **«Sì, come la palestra»**: la parte A
  (server) serve.

## Cosa prende da TASK-466 e cosa aggiunge

TASK-466 (ADR-0378) costruisce lo stretching: A la figura e la schermata
(in `main`), B gli esercizi e le routine Morning, After run, After gym da 3,
5 e 10 minuti (#1216), C lo stretching in palestra, D «Morning stretch» al
mattino, E le routine dell'utente pubblicate nel Feed («Do this routine»).

TASK-475 **prende** da 466 la schermata (`StretchScreen`) e le routine di
B, senza cambiarle; **aggiunge** solo:

1. lo sport `stretching` nel registro (app e server), `ready: false` finché
   non è pronto tutto;
2. con lo sport scelto, «Draw» mostra le routine di 466 B e le avvia;
3. la sessione finita salvata come attività (sport,
   routine, durata), come una sessione di palestra.

Nessuna parte di 466 prevede di salvare una sessione di stretching: la E
pubblica una *routine* (la ricetta), non una sessione fatta. Le due cose non
si contraddicono; un post di sessione e un post di routine restano due cose
diverse.

## Parti

- **A — Server** (se la sessione si salva): l'attività `stretching` nel
  contratto e nell'API; migrazione provvisoria **0079** per il vincolo su
  `runs.activity`, se serve. Lista dei file al Coordinatore prima del codice;
  turno su `app.py`, `shared-types`, `docs/API.md` (ora 455 C) e su
  `sports/__init__.py`, `activities.py`, `reads.py` (dopo 463 B, #1278);
  `engine.zip` dopo la #1269 di 471.
- **B — App**: `settings/sport.ts` e `sportFamilies.ts` (dopo 413 #1280 e
  463 B #1278), «Draw» con le routine, il salvataggio; i file di
  `src/stretch` concordati con la sessione di TASK-466 B e col
  Coordinatore. Dopo la #1216 in `main`.
- **C — Acceso**: `ready: true`, col sì dell'utente sulle schermate.

## Testi nuovi (approvati dall'utente il 2026-11-12)

| Inglese | Italiano | Francese | Tedesco | Spagnolo | Emoji |
|---|---|---|---|---|---|
| Stretching | Stretching | Étirements | Dehnen | Estiramientos | 🧘 |

Il nome dello sport è una chiave nuova, separata da «Stretch» (il tasto di
fine corsa, un verbo in francese, tedesco e spagnolo). Sì dell'utente,
viste nome, emoji e le quattro traduzioni: «Sì, approvati». Altri testi
della pagina «Draw» o del post, se servono, tornano all'utente prima del
codice della parte B.

## Criteri di accettazione

- [ ] A: il server accetta e rilegge una sessione `stretching` senza
      traccia (durata, routine), come la palestra; test dell'API e dei
      tipi condivisi verdi.
- [ ] B: «Stretching» 🧘 nella famiglia «Other» del pannello, `ready:
      false` («Soon»); `FAMILY_OF` lo copre (test di TASK-473 verdi).
- [ ] B: con lo sport scelto «Draw» mostra le routine di TASK-466 B e una
      routine finita si salva come attività, in «My activities» e nel
      calendario.
- [ ] Nessun file di `src/stretch` cambiato senza l'accordo della
      sessione di TASK-466 e del Coordinatore.
- [ ] C: acceso (`ready: true`) col sì dell'utente sulle schermate.

## File toccati (parte 0)

```
docs/tasks/TASK-475.md   (nuovo)
docs/DECISIONS.md        (ADR-0386, voce e riga d'indice)
```

## Esito

*(a fine task)*
