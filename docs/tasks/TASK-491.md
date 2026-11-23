# TASK-491 — Il Coach MuW: consigli dagli allenamenti fatti e la scheda che cambia con «Apply»

**Stato**: In corso (parte 0 e A in `main` il 2026-11-23; poi B dopo TASK-490 B, poi C dopo #1420)
**Fase**: 5 · **Branch**: una PR per parte; la parte 0 è
`docs/TASK-491-coach`
**Dipende da**: TASK-488 (la scheda si adatta, ADR-0396: i passi `adapt`
nel programma; la A sul server prima di tutto), TASK-490 B (l'omino della
settimana, ADR-0398), TASK-483 (lo storico degli esercizi, ADR-0392),
TASK-433 (le schede guidate, ADR-0360), TASK-467 (il punteggio del sonno)
**Si incrocia con**: TASK-490 C (la riga del Coach su «Today»), TASK-488 B
(#1420: i fogli delle schede e GymEnd, il turno prima della parte C di
questo task)
**ADR**: **ADR-0399** · numero del task e dell'ADR dal Coordinatore
(fork 3) il 2026-11-23.

## Obiettivo

L'utente il 2026-11-22: un agente o un algoritmo, con una schermata sua,
che analizzi gli allenamenti fatti, dia consigli sui prossimi e modifichi
le schede in base a quello che l'utente ha già fatto, con regole prese da
studi scientifici.

Proposta con la bozza della schermata, le regole coi loro studi e i testi:
https://claude.ai/artifact/YboyrVDGfr9NWw8G7aXCpi (sorgente
`out/coach/coach-proposta.html` nel checkout principale).

## Le scelte dell'utente (2026-11-22 e 23)

1. **La scheda cambia solo con «Apply»**. Il Coach propone; niente
   modifiche da solo.
2. **Dove**: una pagina «Coach» che si apre da «My plans», più una riga
   «Next time: …» a fine allenamento (GymEnd). Con TASK-490 C anche da
   «Today».
3. **Solo con un account**: senza account la pagina mostra l'invito a
   crearlo. In cima l'omino della settimana, davanti e dietro, colorato
   per intensità (grigio, poi tre verdi: 1–4, 5–9, 10+ serie) con la
   percentuale del corpo allenata. Dal Coordinatore il 2026-11-23: l'omino
   lo costruisce TASK-490 B (`trainingmode/weekBody.ts`,
   `WeekBodyCard.tsx`) e il Coach lo riusa.
4. **Niente domanda sulla fatica (RPE)** per ora: la regola T2 resta fuori.
5. **I testi dei consigli**: quelli della sezione «I testi» qui sotto,
   **approvati dall'utente il 2026-11-23** («Approvo»).

## Come funziona (deciso dall'agente su delega dell'utente, ADR-0399)

- **Regole deterministiche sul telefono, niente LLM.** Una funzione pura
  prende gli allenamenti delle ultime 4 settimane e la scheda e rende i
  consigli. Gli stessi dati danno sempre gli stessi consigli; un test per
  regola.
- **Al massimo tre consigli**, in quest'ordine: prima la sicurezza (C1,
  P6, T3, T4, C3), poi la progressione (P1, P2, P3, T1), poi l'equilibrio
  della settimana (P4, P5, C2, T5). A parità, quello che tocca il giorno
  più vicino della scheda.
- **«Apply» cambia la scheda** con le stesse strade di TASK-488: i kg con
  i passi di `adapt`, le serie e le ripetizioni nel `program` della
  scheda, salvate con `PUT` della scheda che c'è. «Not now» nasconde quel
  consiglio per 7 giorni (sul telefono).
- **Le regole soft** (C3, T3) non toccano mai la scheda da sole: T3 cambia
  solo la seduta di oggi, C3 ha solo «OK».

## Le regole della prima versione

| Regola | Guarda | Consiglia | Studio |
|---|---|---|---|
| P1 | tutte le serie al massimo delle ripetizioni per 2 allenamenti di fila | +2,5 kg parte alta, +5 kg gambe, si riparte dal minimo; a corpo libero +1 rip | ACSM 2009 |
| P2 | sotto il minimo di ripetizioni per 2 allenamenti di fila | −5/10% del peso (con 488: vale la prima che scatta) | ACSM 2009 |
| P3 | massimale stimato (Epley) fermo per 3 allenamenti | un altro intervallo di ripetizioni | Epley 1985, ACSM 2009 |
| P4 | serie della settimana per muscolo sotto 10 / sopra 20 | aggiungi serie / avviso | Schoenfeld, Ogborn, Krieger 2017 |
| P5 | un muscolo allenato un giorno solo a settimana | dividi le serie su due giorni | Schoenfeld, Ogborn, Krieger 2016 |
| P6 | stesso muscolo allenato pesante meno di 48 h prima | un altro muscolo o più leggero | ACSM 2009 |
| C1 | km della settimana oltre +30% della media di 4 settimane | tieni i km | Nielsen et al. 2014; Buist et al. 2008 |
| C2 | meno del ~75–80% della corsa facile | la prossima lenta e lunga | Seiler & Kjerland 2006; Seiler 2010 |
| C3 (soft) | carico settimana / media 4 settimane sopra 1,5 | una settimana più leggera | Gabbett 2016 (criticato, Impellizzeri 2020) |
| T1 | 4–6 settimane di carico che sale, o monotonia sopra 2 | settimana di scarico: −40/60% serie, stessi kg | Foster 1998; Bosquet et al. 2007 |
| T3 (soft) | punteggio del sonno basso prima di un giorno di scheda | oggi una serie in meno | Fullagar et al. 2015 |
| T4 | pausa oltre 14 giorni | una settimana all'85% dei kg | Mujika & Padilla 2000 |
| T5 | meno di 2 giorni di forza a settimana | un invito, solo «OK» | OMS 2020 |

Le soglie sono costanti in un file solo, ciascuna col suo studio nel
commento.

## I testi (approvati dall'utente il 2026-11-23)

In inglese come l'app, poi tradotti; `{…}` sono i numeri del Coach.

| Regola | Titolo | Frase | Why | Tasto |
|---|---|---|---|---|
| P1 | {Exercise}: {kg} kg | You did all your reps at {old} kg twice in a row. Add weight and start again from {min} reps. | Double progression · ACSM 2009 | Apply to plan |
| P1 corpo libero | {Exercise}: one more rep | You did all your reps twice in a row. Add one rep to each set. | Double progression · ACSM 2009 | Apply to plan |
| P2 | {Exercise}: {kg} kg | You stopped below {min} reps twice in a row. A little less weight helps you finish your sets. | Load that fits the reps · ACSM 2009 | Apply to plan |
| P3 | {Exercise} has stalled | Your estimated max hasn't moved in 3 workouts. Try {min2}–{max2} reps for the next weeks. | Change the stimulus · ACSM 2009 | Apply to plan |
| P4 | Add {n} sets for {muscle} | {Muscle} got {sets} sets this week. Around 10 a week builds muscle better. | Weekly volume · Schoenfeld 2017 | Add to {day} |
| P4 alto | A lot for {muscle} | {Muscle} got {sets} sets this week. Above 20 adds tiredness more than muscle. | Weekly volume · Schoenfeld 2017 | OK |
| P5 | Train {muscle} twice a week | All your {muscle} sets are on {day}. Split them over two days for more growth. | Frequency · Schoenfeld 2016 | OK |
| P6 | {Muscle} is still recovering | You trained it hard {hours} hours ago. Today pick another muscle, or keep it light. | 48 hours to recover · ACSM 2009 | OK |
| C1 | Keep {km} km this week | Last week you ran {pct}% more than your usual. Hold the distance before adding more. | Safe increase · Nielsen 2014 | OK |
| C2 | Next run: slow and long | Only {pct}% of your running was easy. Most of it should feel easy, around 80%. | 80/20 · Seiler 2010 | OK |
| C3 | Maybe a lighter week | This week's load is high compared with the last month. | Workload ratio · Gabbett 2016 | OK |
| T1 | Time for an easy week | {weeks} weeks of steady work. Do about half the sets this week, same weights. | Deload · Bosquet 2007 | OK |
| T3 | Short night: go lighter | Your sleep score was {score}. Same workout today, one set less per exercise. | Sleep and performance · Fullagar 2015 | OK |
| T4 | Welcome back | You've been away {days} days. Start this week at about 85% of your weights. | Coming back · Mujika 2000 | OK |
| T5 | One more strength day | {n} strength day this week. Two a week keep muscles and bones strong. | WHO guidelines 2020 | OK |

Nella prima versione «Apply» c'è per P1, P2, P3 e P4; le altre regole spiegano cosa fare e hanno «OK». Spostare un giorno, cambiare una settimana sola o una corsa della scheda viene dopo, se serve.

Fissi: «Coach», «Based on your last 4 weeks», «Not now», «{pct}% of your
body trained this week», «Create an account to get tips from your
workouts», «Log a few workouts and your tips will show up here», «Tips
are general, not medical advice. If something hurts, stop and ask a
professional.», in GymEnd «Next time: {exercise} {kg} kg».

## Le parti

| Parte | Cosa | Dove va |
|---|---|---|
| 0 | Questo file, ADR-0399, i testi all'utente | documenti |
| A | Le regole: dati in, consigli fuori, una funzione pura con i test; la lettura degli allenamenti delle 4 settimane | app, solo file nuovi |
| B | La pagina «Coach»: omino (da TASK-490 B), consigli, «Apply» / «Not now», invito senza account, i testi tradotti | app, file nuovi più le tabelle dei testi; schermate all'utente |
| C | Gli ingressi: la voce in «My plans» e la riga «Next time» in GymEnd | app, dopo TASK-488 B (#1420) |

L'elenco dei file di ogni parte va al Coordinatore prima del codice.

## Dove siamo

- **Parte 0** in `main` (#1426, 2026-11-23): scelte, ADR-0399, testi
  approvati dall'utente («Approvo»).
- **Parte A** in `main` (#1427, `66c9a2d1`, 2026-11-23):
  `coach/rules.ts` (13 regole, `coachTips`), `coach/coachData.ts` (letture
  con gli indirizzi che ci sono: mesi del calendario, al massimo 20
  sessioni intere, schede, attività) e `coach/applyTip.ts` («Apply» su
  P1, P1bw, P2, P3, P4; le altre «OK»), 53 test. Non la usa ancora niente.
- **Parte B**: parte quando TASK-490 B (#1433, l'omino) è in `main`.
  Accordi con TASK-490: `rules.ts` smette di contare le serie da sé e usa
  `setsByMuscle` di `trainingmode/weekBody.ts` sugli ultimi 7 giorni
  (P4, P4hi, P5); la pagina monta `WeekBodyCard` com'è, nel rosa dei
  muscoli scelto dall'utente. I testi tradotti sono pronti in
  `out/coach/testi-tradotti.md` nel checkout principale («Not now» c'è
  già in `it.ts`).
- **Parte C**: dopo TASK-488 B (#1420).

## Criteri di accettazione

- [x] Parte 0: questo file, ADR-0399 e i testi approvati dall'utente.
- [ ] Ogni regola ha un test che la fa scattare e uno che non la fa
      scattare; gli stessi dati danno gli stessi consigli.
- [ ] Mai più di tre consigli, nell'ordine scritto sopra.
- [ ] «Apply» cambia la scheda salvata, e in «My plans» si vede il
      cambio; «Not now» nasconde il consiglio per 7 giorni.
- [ ] Senza account: solo l'invito, nessuna richiesta all'API.
- [ ] Nessuna dipendenza nuova, nessuna chiamata a un modello AI.

## File toccati

Parte 0:

```
docs/tasks/TASK-491.md
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Parti A–C: l'elenco va al Coordinatore prima del codice.

## Fuori scope

- La domanda sulla fatica a fine allenamento (T2, scelta 4).
- Un modello AI che scrive i consigli.
- L'omino della settimana (TASK-490 B) e la riga su «Today» (TASK-490 C).
- Consigli su cibo e calorie (TASK-489).
- Sport diversi da palestra e corsa, oltre a T1, T4 e T5.
- Pareri medici, dolore, infortuni: la pagina lo dice in fondo.

## Esito

*(a fine task)*
