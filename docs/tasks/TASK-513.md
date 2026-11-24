# TASK-513 — «Longevity»: cinquanta storie animate nella «Explore» di «Nutrition»

**Stato**: In corso (parte 0 chiusa il 2026-11-24: le scelte dell'utente
qui sotto; nessun codice)
**Fase**: 5 · **Branch**: una PR per parte; la parte 0 è
`docs/TASK-513-514-part-0`
**Dipende da**: TASK-514 (la modalità «Nutrition», che ha la pagina
«Explore» dove le storie vivono), TASK-489 parte H (gli anelli, le barre e
il contatore che le storie riusano)
**Si incrocia con**: TASK-153 (la pubblicità, in pausa fino alla società:
i compensi ai creatori vengono dopo di lei), TASK-295 (il motore video del
telefono, per esportare una storia), TASK-467 (il punteggio del sonno, per
i collegamenti «ai tuoi numeri»)
**ADR**: **ADR-0407** · numeri dal Coordinatore (fork 3) il 2026-11-24.
**Sessione**: la parte 0 l'ha scritta la sessione di TASK-489; **il codice
va in una sessione sua**, che parte da questo file (regola del
Coordinatore).

## Obiettivo

Richiesta dell'utente del 2026-11-24: in «Explore» «qualche tip e video
degli esperti», «50 video sulla longevity», e più avanti i video caricati
dalle persone. Diventa: **cinquanta storie animate** sulla longevità,
fatte dentro l'app, che stanno nella pagina «Explore» della modalità
«Nutrition».

## Paletti

- Ogni storia dice **solo quello che dice una fonte pubblica ufficiale**
  (OMS, enti sanitari nazionali, società scientifiche), letta al momento
  della stesura e citata nella storia con nome, titolo, data e
  collegamento. Mai a memoria, mai da un blog o da uno studio singolo. Un
  argomento senza una fonte così **non si scrive**.
- Ogni storia e la sezione dicono che **MuW non è fatta da professionisti
  della salute**, che sono informazioni generali e non consigli medici.
- Niente integratori, farmaci, dosi, diete, cure, promesse («vivi dieci
  anni di più»). Si dice cosa mostra la ricerca in generale, mai cosa deve
  fare chi guarda.
- L'AI non scrive numeri di salute nell'app: i testi delle storie sono
  file del repository, letti e approvati prima di uscire.
- Niente serie da mantenere, punti o notifiche che insistono.
- Prima che esca: la PR di privacy e termini (oggi dicono che MuW non dà
  consigli) col sì dell'utente e la copia del sito.
- Il nome, il volto o il marchio di una persona reale (l'utente ha citato
  uno stile «tipo Giacomo Spazzini») non si usano senza il suo accordo.

## Le scelte dell'utente (2026-11-24, una alla volta)

1. **Consigli sì, generali**: prima «opzione B» (tips generali rivisti da
   un professionista con nome), poi cambiata: «No, non ho un medico
   dietista che può rivedere i consigli. […] Cerchiamo tutto da Internet,
   ma chiariamo che non siamo dei professionisti». Quindi nessuna
   revisione, e al suo posto le regole sulle fonti scritte nei paletti
   (decise dall'agente su delega dell'utente, ADR-0407).
2. **Tutti animati**: «li facciamo in questi giorni, con te, tutti video
   animati». Niente riprese.
3. **Storie dentro l'app**, non file video: un copione di 4–6 scene per
   storia, suonato da un lettore nell'app, nelle cinque lingue.
4. **Dove**: nella «Explore» della modalità «Nutrition» (TASK-514).
5. **L'elenco dei 50 argomenti** approvato («Sì anche»): cinque gruppi da
   dieci, in `out/TASK-513/VIDEO-50-ARGOMENTI.md` del checkout principale;
   la parte A lo porta nel repository.
6. **I video delle persone** dopo, con moderazione, spazio e privacy
   decisi (ordine approvato: «Ottimo procedi sì»).
7. **I compensi a chi pubblica** («diamo il 30% delle commissioni generate
   dalle pubblicità»): un task nuovo, legato a TASK-153 e dopo di lui; il
   numero lo dà il Coordinatore con la società. Niente si promette
   nell'app o sul sito finché non c'è.

## Com'è fatta una storia

- 4–6 scene, 30–40 secondi; ogni scena una frase e una figura che si
  muove (barre, anelli, un numero che conta), con le molle dell'app.
- Avanza da sola; un tocco passa alla scena dopo; in alto i segmenti del
  progresso.
- L'ultima scena: la fonte, «Not medical advice», che MuW non è fatta da
  professionisti, e il collegamento «ai tuoi numeri» quando c'è (dopo «Le
  fibre» i macronutrienti del giorno, dopo «Camminare conta» le attività).
  Il collegamento mostra i numeri dell'utente, non li giudica.
- Con «Riduci movimento» è una serie di schede ferme. Il testo è sempre
  testo vero.
- Senza voce. Funziona senza rete: le storie stanno nell'app.

## La pagina «Explore» di «Nutrition»

Dall'alto: la storia del giorno (una diversa ogni giorno, già animata in
anteprima); le storie per gruppo, dieci per fila, col segno «vista»;
«Continua»; «Cerca»; «Salvate». Prova mostrata all'utente il 2026-11-24.

## Le parti

- **0** — questo file e ADR-0407. Fatta.
- **A** — Il formato di una storia e il lettore, dietro un interruttore
  spento; l'elenco dei 50 argomenti nel repository; tre storie di prova
  con le loro fonti. Schermate e testi all'utente prima del codice.
- **B** — Le altre storie, a gruppi di dieci: per ognuna fonte letta,
  copione, cinque lingue, sì dell'utente sui testi.
- **C** — La pagina «Explore» (dipende da TASK-514).
- **D** — Privacy e termini, note per gli store, accensione.
- **E** — Condividere una storia come video (motore di TASK-295).
- **F** — I video delle persone: moderazione (regola Apple sui contenuti
  degli utenti, come ADR-0228), spazio sul server, privacy, termini.

## File toccati

Parte 0: `docs/tasks/TASK-513.md`, `docs/DECISIONS.md`, `docs/STATUS.md`,
`docs/INDEX.md`. Le liste delle altre parti le manda al Coordinatore la
sessione che le scrive, prima del codice; la proposta è una cartella nuova
`apps/mobile/src/longevity/`.

## Fuori scope

La pubblicità e i compensi (TASK-153 e il task dopo). La voce registrata.
I file video ospitati sul server.

## Criteri di accettazione (parte 0)

- [x] Le scelte dell'utente sono scritte con le sue parole.
- [x] ADR-0407 dice le regole sulle fonti al posto della revisione.

## Registro

- **2026-11-24, parte 0**: numeri dal Coordinatore; sette scelte
  dell'utente; due prove mostrate (una storia, la pagina «Explore»);
  l'elenco dei 50 argomenti approvato. Le fonti non sono ancora state
  lette: si leggono alla stesura di ogni storia.

## Esito

*(si compila a fine task)*
