# TASK-514 — La modalità «Nutrition»: scelta come uno sport, l'app ha le sue pagine

**Stato**: In corso (parte 0 chiusa il 2026-11-24: le scelte dell'utente
qui sotto; nessun codice; parte dopo TASK-490 D ed E)
**Fase**: 5 · **Branch**: una PR per parte; la parte 0 è
`docs/TASK-513-514-part-0`
**Dipende da**: TASK-490 parti D ed E (la barra della modalità
allenamento, in revisione), TASK-489 (le pagine che la modalità mostra),
TASK-429 (la modalità sci, ADR-0357: il meccanismo da riusare)
**Si incrocia con**: TASK-513 («Longevity», che vive nella sua
«Explore»), TASK-473 (il pannello degli sport), i file delle schede
(`tabs/*`) e `settings/SportButton*`
**ADR**: **ADR-0408** · numeri dal Coordinatore (fork 3) il 2026-11-24.
**Sessione**: la parte 0 l'ha scritta la sessione di TASK-489; **il codice
va in una sessione sua**. Con la sessione di TASK-490 parla il
Coordinatore, che vuole la lista dei file prima di partire.

## Obiettivo

Richiesta dell'utente del 2026-11-24: «nella sezione explore della sezione
nutrizione deve essere un'altra schermata tipo lo sci ma solo per la
nutrizione». Alla domanda «le sue pagine sopra l'app, o una modalità che
cambia la barra» ha risposto: **«Una modalità vera»**.

Scelta «Nutrition» nel pannello degli sport, la barra dell'app diventa
quella della nutrizione, come scelto «Ski» diventa quella dello sci.

## Le scelte dell'utente (2026-11-24)

1. **Una modalità vera**, sapendo che va dopo il lavoro in corso sulla
   barra dell'allenamento e che per registrare una corsa si torna a
   scegliere lo sport.
2. **La barra**: **Today · Plan · Explore · Feed · Profile** («Sì va
   bene»). La stessa forma di sci (Today · Days · Resorts · Feed ·
   Profile) e allenamento (Today · Workouts · Food · Feed · Profile).
   - «Today»: il diario del giorno (TASK-489 B e H).
   - «Plan»: il piano della settimana (TASK-489 B).
   - «Explore»: le storie di «Longevity» (TASK-513).
   - «Balance» non ha una pagina sua: resta la scheda «Calorie balance»
     nel profilo, che in questa modalità sta in cima.
   - «Messages» dal tasto nell'intestazione, come nello sci.
3. **La scheda «Food» della modalità allenamento resta** e apre il diario
   del giorno, come oggi («Sì va bene», poi «La prima»): chi è in
   palestra scrive il pasto senza cambiare modalità.

## Cosa cambia rispetto a TASK-489

La parte B di 489 diceva: «Nutrition» non è uno sport, il suo tasto apre
una pagina sopra il pannello e lo sport scelto resta. Con la modalità
«Nutrition» diventa una voce che **si sceglie**. È scritto come
precisazione 5 di ADR-0397. Finché la modalità non c'è, vale 489 com'è:
la pagina si apre dal pannello degli sport, dal profilo (parte D2) e dalla
fine di un'attività (parte I).

## Da decidere nella parte A (tecnico, con la sessione di 490)

- Come la modalità entra nel meccanismo di `skimode/skiMode.ts`
  (`barPagesOf(sport)`): «Nutrition» non è uno sport del registro
  (TASK-376) e non si registra.
- Come si torna allo sport di prima.
- La prima pagina la prima volta: l'ingresso di TASK-489 parte J.

## Le parti

- **0** — questo file e ADR-0408. Fatta.
- **A** — La modalità e la sua barra, dietro `NUTRITION_ON`; lista dei
  file al Coordinatore dopo quella di 490 D/E.
- **B** — «Today» e «Plan» come pagine della barra; il profilo con
  «Calorie balance» in cima.
- **C** — «Explore» (con TASK-513 C).

## File toccati

Parte 0: `docs/tasks/TASK-514.md`, `docs/DECISIONS.md`, `docs/STATUS.md`,
`docs/INDEX.md`. Per le altre parti la lista la manda la sessione che le
scrive.

## Fuori scope

Registrare un'attività dalla modalità «Nutrition». Togliere la scheda
«Food» dall'allenamento.

## Criteri di accettazione (parte 0)

- [x] Le scelte dell'utente sono scritte con le sue parole.
- [x] ADR-0408 dice cosa cambia di ADR-0397 e da cosa dipende.

## Registro

- **2026-11-24, parte 0**: numeri dal Coordinatore; tre scelte
  dell'utente; prova della pagina «Explore» mostrata.

## Esito

*(si compila a fine task)*
