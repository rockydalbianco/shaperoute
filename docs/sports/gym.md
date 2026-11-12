# Gym 🏋️ — la palestra (TASK-385, ADR-0327)

Sport senza rete e senza motore: niente banco, niente zone, niente impronta
del motore. Questo file dice cosa registra, cosa no, il catalogo degli
esercizi e le scale dei traguardi. Lo scrive la sessione di TASK-385.

## Cosa registra

- **Il tempo della sessione**, da «Start workout» a «Finish»: i recuperi
  dentro, «Pause» fuori. Inizio e pause in un file sul telefono, così il
  tempo resta giusto anche se l'app si chiude; niente GPS, niente permesso
  di posizione, niente modalità in background.
- **Le serie**, esercizio per esercizio, con i campi del loro tipo (sotto),
  l'ora in cui sono state segnate e se erano dal vivo (durante la sessione)
  o aggiunte dopo «Stop».
- **I recuperi**: quanti, quanto in media, quanto in tutto (i singoli
  restano sul telefono).
- **Le calorie** (energia attiva, ADR-0318): MET dei pesi sul tempo che non
  è cardio, la formula della macchina sui blocchi cardio; col battito,
  Keytel 2005 (parte G).
- **Il battito** a sessione finita, da Salute (TASK-345 C): medio, massimo,
  tempo nelle zone.

## Cosa non registra

- Nessuna traccia, nessuna distanza della sessione (la distanza di un blocco
  cardio è del blocco, non della sessione: non entra nei km del profilo).
- Nessun battito in tempo reale (vuole codice nativo per l'orologio, 1.0.2).
- Niente gioco delle forme, record personali di corsa, GPX, Strava, video
  della corsa.

## I tipi di serie

| Tipo | Campi | Misura dei traguardi e della classifica |
|---|---|---|
| carico (L) | ripetizioni, peso | il peso più alto con almeno 1 ripetizione |
| corpo libero (B) | ripetizioni, zavorra facoltativa | le ripetizioni più alte in una serie |
| a tempo (T) | secondi | i secondi più alti in una serie |
| cardio (C) | tempo, e secondo la macchina distanza, velocità, pendenza, livello, piani | la distanza più alta in un blocco; il tempo per le macchine senza distanza |

Pesi salvati in kg (mostrati in kg o lb come nelle unità), distanze in
metri, tempi in secondi. Un peso con il manubrio è **per mano**.

## Le scale (sette livelli, sette figure)

Ogni livello sblocca una figura MuW: 🐭 Mouse · 🐰 Rabbit · 🦊 Fox · 🐺 Wolf ·
🐻 Bear · 🦏 Rhino · 🦍 Gorilla (Topo, Coniglio, Volpe, Lupo, Orso,
Rinoceronte, Gorilla · Maus, Hase, Fuchs, Wolf, Bär, Nashorn, Gorilla ·
Souris, Lapin, Renard, Loup, Ours, Rhinocéros, Gorille · Ratón, Conejo,
Zorro, Lobo, Oso, Rinoceronte, Gorila).

| Scala | Livelli 1–7 | Tetto (sopra non conta) |
|---|---|---|
| L-XL | 40 · 80 · 120 · 160 · 200 · 250 · 300 kg | 1000 kg |
| L-big | 40 · 60 · 80 · 100 · 140 · 180 · 220 kg | squat 510, stacco 510, hip thrust 600 kg |
| L-M | 20 · 40 · 60 · 80 · 100 · 120 · 140 kg | panca 360 kg; le altre 350 kg |
| L-S | 10 · 20 · 30 · 40 · 50 · 60 · 80 kg | 200 kg |
| L-XS (per mano) | 4 · 6 · 8 · 10 · 14 · 18 · 24 kg | 80 kg |
| B-hard | 1 · 3 · 5 · 10 · 15 · 20 · 30 rip. | 150 rip. |
| B-easy | 10 · 20 · 30 · 40 · 50 · 75 · 100 rip. | 500 rip. |
| T | 30 s · 1 · 2 · 3 · 5 · 8 · 10 min | 2 h |
| C-run | 1 · 3 · 5 · 10 · 15 · 21 · 42 km | 100 km |
| C-bike | 5 · 10 · 20 · 30 · 40 · 60 · 100 km | 300 km |
| C-row | 1 · 2 · 5 · 10 · 15 · 21 · 42 km | 100 km |
| C-time | 5 · 10 · 15 · 20 · 30 · 45 · 60 min | 4 h |

I tetti sono sopra i record mondiali noti (le alzate) o sopra quello che una
macchina carica; servono contro gli errori di battitura e i numeri
inventati, non a giudicare. Un «Custom» non ha scala né classifica.

## I traguardi sul profilo e nel post (parte E)

- **Contano tutti gli allenamenti**, anche i privati (scelta dell'utente
  del 2026-11-06, come i record personali): il profilo mostra figura,
  esercizio e valore, mai l'allenamento. Contano anche le serie aggiunte
  dopo «Stop»; «solo dal vivo» vale per la classifica.
- **Sul profilo** il blocco «🏋️ Gym», dopo i record e il VO₂ max: ogni
  esercizio dal livello 1, prima il livello più alto, con la figura e la
  serie migliore. I primi cinque, gli altri sotto «Show more» (scelta
  dell'utente del 2026-11-06).
- **Nel post** «New level: 🦍 Gorilla · Panca piana 140 kg» per ogni
  livello che l'allenamento supera rispetto a quelli cominciati prima:
  sotto il riquadro nel Feed, sopra gli esercizi nella scheda. Spento
  «Show exercises», niente livelli.
- Il server li conta a ogni lettura dalle serie salvate: cancellato un
  allenamento, il livello torna quello degli altri.

## Come si fa un esercizio (TASK-411 E)

Accanto a ogni esercizio del catalogo c'è un omino che fa il movimento, col
carico (bilanciere, manubrio o maniglia) in giallo: nei riquadri di un
gruppo, nelle righe della ricerca, accanto all'esercizio in corso; i
riquadri dei gruppi hanno un movimento tipico (panca, lat machine, squat,
alzate laterali, curl, crunch, kettlebell, corsa). Con «Riduci movimento»
l'omino resta fermo a metà del movimento. «i» apre la guida: l'omino grande,
tre passi e «Watch out» con l'errore da evitare; aperta da «+ Exercise» ha
«Add to workout», durante l'allenamento solo «‹». Un esercizio col nome
libero non ha né omino né guida (`gym/moves.ts`, `gym/ExerciseFigure.tsx`,
`gym/ExerciseGuide.tsx`, `gym/guides/`).

## Il muscolo allenato accanto all'omino (TASK-465)

Accanto all'omino c'è una sagoma del corpo, ferma, coi muscoli che
l'esercizio allena (ADR-0376): negli stessi posti dell'omino. Piccola
(riquadri, ricerca, esercizio in corso) mostra un lato solo, davanti o
dietro, quello del primo muscolo principale, coi principali **pieni**; nella
guida davanti e dietro, i muscoli che aiutano col **contorno** e sotto i
nomi («Chest», «Also: shoulders, triceps»). Pieno o contorno, mai solo il
colore (il rosa del token `muscle`); il lettore di schermo dice i nomi.
I muscoli sono 17 e stanno in una tabella dell'app, non nel catalogo del
server: chi aggiunge un esercizio aggiunge la sua riga, e un esercizio col
nome libero non ha sagoma (`gym/muscles.ts`, `gym/MuscleMap.tsx`).

## La scelta dell'esercizio (TASK-411 A)

«+ Exercise» si apre sugli otto gruppi muscolari, due per riga: ognuno con
la sua emoji (Petto 🫁, Schiena 🧗, Gambe 🦵, Spalle 🤸, Braccia 💪, Addome
🧘, Total body 🏋️, Cardio 🏃), il nome e quanti esercizi ha. Toccato un
gruppo, i suoi esercizi in riquadri a due colonne, nell'ordine del catalogo;
«‹» torna ai gruppi. Scrivendo nella ricerca l'elenco cerca in tutti i
gruppi, per nome nella lingua dell'app o in inglese, e «Add “{name}”»
aggiunge un esercizio col nome libero (`gym/ExerciseGrid.tsx`,
`gym/ExercisePicker.tsx`).

## Le schede (TASK-411 C)

«Plans ›» in «Draw» elenca le proprie schede (nome, giorni, quanti
esercizi); «New plan» ne scrive una: un nome, i giorni della settimana, gli
esercizi dalla griglia in ordine, per ognuno le serie (1–20, tre all'inizio)
e i valori obiettivo nei campi del suo tipo, anche vuoti. «Delete plan»
chiede prima. Al massimo 20 schede da 30 esercizi; le vede solo chi le ha
fatte. Il giorno di una scheda «Draw» dice «Today: {plan}» e «Start
workout» la segue: parte dal primo esercizio coi valori già scritti, sotto
il cronometro «{plan} · Plan: {done}/{total} sets», e finite le serie di un
esercizio passa al successivo; si può sempre cambiare esercizio o scrivere
altri valori, e si salvano le serie fatte. «Start without the plan» fa un
allenamento libero. Nel calendario ogni allenamento ha il nome della sua
scheda e i giorni di una scheda passati senza di lei hanno un pallino
grigio («In programma»).

## Le schede guidate (TASK-433)

Scelte dell'utente del 2026-11-10, una alla volta, sulla tela «Schede
palestra guidate»: «New plan» è una guida in **cinque passi**, ognuno con una
domanda sola e la risposta già scelta («Continue» fino in fondo fa una
scheda buona):

1. **Obiettivo**: «More muscle» (4 × 10, poi 3 × 12, recupero 90 s), «More
   strength» (5 × 5, poi 3 × 8, 3 min), «Tone up and lose weight» (3 × 15,
   45 s), «Get back in shape» (3 × 12, 60 s, quattro esercizi invece di
   cinque). «I'll write the plan myself» salta la proposta: gli allenamenti
   restano vuoti («Workout A», «B»…).
2. **Giorni**: 2, 3, 4 o 5 a settimana coi giorni già scelti (un giorno di
   riposo in mezzo dove ci sta: lun-gio, lun-mer-ven, lun-mar-gio-ven,
   lun–ven), da cambiare uno per uno; sotto, come si divide il lavoro (2:
   total body A/B; 3: petto-spalle-tricipiti, schiena-bicipiti,
   gambe-addome; 4: parte alta e bassa A/B; 5: un gruppo al giorno).
3. **La scheda pronta**: una linguetta per allenamento («A · Mon»), il nome
   da cambiare, gli esercizi del catalogo coi valori dell'obiettivo e i kg
   vuoti (si scrivono al primo allenamento); toccato un esercizio si
   cambiano serie, valori, ordine, lo si sostituisce o si toglie.
4. **Le settimane**, quattro modi: «More load each week» (+2,5 kg a
   settimana, l'ultima di un ciclo di 3 o più è più leggera: i kg della
   prima e una serie in meno), «More reps each week» (+1 ripetizione per due
   settimane, poi +2,5 kg e si torna alle ripetizioni di partenza), «Weeks A /
   B in turn» (la seconda settimana con altri esercizi degli stessi muscoli),
   «Always the same». Il ciclo è di 4 settimane (6 o 8 con un tasto; 2 per
   A/B, 1 per «uguale»); finito, ricomincia un passo più pesante. Le barre
   delle settimane si toccano: una settimana scritta a mano prende il posto
   di quella calcolata («Back to the automatic week» la toglie).
5. **Nome e via**: il nome già scritto («More strength · 2 days»), il primo
   giorno (oggi o lunedì prossimo; le settimane contano dal suo lunedì), il
   riepilogo; «Save plan».

In «My plans» una scheda con le settimane è un riquadro: «In progress»,
«Week 2 of 4» con le tacche del ciclo, i giorni di questa settimana con la
lettera dell'allenamento (oggi cerchiato), «Edit» (passo 3) e «Weeks» (passo
4); le schede di prima sono righe «sempre uguale» e si aprono nella guida
allo stesso modo. In «Draw» «Today» mostra l'allenamento del giorno della
settimana del ciclo, coi valori di quella settimana, e «Week 2 of 4»;
l'allenamento parte col recupero dell'obiettivo per ogni esercizio. Il
calendario segna saltati i giorni con un allenamento nella settimana del
ciclo. Calcolo in `apps/mobile/src/gym/program.ts`, proposta in
`proposal.ts`, la guida in `GymPlanWizard.tsx`.

La prima volta che si tocca «Palestra» in «Draw» (mai all'avvio, mai con
un altro sport) sale un riquadro «Your plan, step by step» con le barre
delle settimane e tre passi; «Create my plan» apre la guida, «Not now» lo
chiude per sempre, la riga «How plans work» lo riapre (TASK-433 B,
`gymIntro.ts`, `GymIntroSheet.tsx`).

**I giorni di corsa** (TASK-433 C): al passo 2 «And running?» aggiunge 1–3
corse nei giorni senza palestra e «Your week» cambia ogni giorno (palestra,
corsa, riposo). Un giorno di corsa è Lenta, Ripetute o Lungo, in km o
minuti; con le settimane +10% circa (le ripetute +1), l'ultima settimana di
un ciclo di 3 o più all'80% della prima. In «Draw» quel giorno «Today» dice
la corsa e «Go to the run · 5.5 km» passa a «Run» coi km già scritti; una
corsa fatta quel giorno conta come fatta nel calendario. La sigla «RUN» ha
il suo colore (`runDay`). `runDay.ts`, `RunDayEditor.tsx`.

**La corsa su misura** (TASK-452): con almeno una corsa la guida chiede
«How do you run today?»: il ritmo sui 10 km (o il livello) e il lungo di oggi
(km o minuti). I ritmi vengono da lì (lenta +1:05/km, lungo +1:15, ripetute
da 400 m −0:25), il lungo parte dal suo e cresce di 1 km a settimana, la
lenta è circa metà del lungo; «Your paces» li mostra prima della scheda. In
«Draw» il giorno di corsa dice ritmo e tempo; a fine ciclo, se le corse
salvate delle ultime 4 settimane dicono un ritmo più veloce, «Your runs say
5:20/km over 10 km: update the paces?» li cambia solo col sì.
`runPace.ts`, `RunnerStep.tsx`.

**Il pianificatore completo** (TASK-461, ADR-0371): un piano nuovo mescola
sempre almeno due sport (scelta dell'utente del 2026-11-11, «Almeno due,
sempre»): palestra, corpo libero, corsa, camminata e hike, bici, nuoto e
canoa, montagna. Un piano può portare a un obiettivo (`target`): una
distanza di uno sport (corsa 5–42,2 km, bici 30–150 km, nuoto 1–5 km…) o la
salita di una gita in montagna (500–2000 m), in una data o «Quando sono
pronto», fino a 24 settimane. I giorni di corsa restano `run`; quelli degli
altri sport sono `outing` (camminata svelta, uscita in bici, serie in
vasca, uscita in salita), fatti nel calendario da un'attività del loro
sport quel giorno. Il nome del giorno dice sport e misura («Long ride · 30
km»), così anche un'app di prima, che non mostra «Today» per un giorno
fuori, nella lista dice il vero. Il resto (le domande della guida, «Oggi»
oltre il massimo di Draw, il promemoria alle 8) è nel task file.

**L'ingresso e il corpo libero** (TASK-461 A2). «New plan» apre prima
«What do you want to train?» (in italiano «Cosa vuoi allenare?»): Palestra,
Corpo libero e Corsa si scelgono, almeno due («Next · 2 chosen»; con uno
solo il tasto resta spento); «Toward a distance» e «Mountains» dicono «Soon».
All'apertura sono scelti corpo libero e corsa. Una scheda di sola palestra
non si può più fare da nuova; le schede di prima si aprono come prima, senza
ingresso. Poi i cinque passi:
1. senza palestra gli obiettivi sono quelli del corpo libero: «More muscle»
   4 × 12 recupero 60 s, «More strength» 5 × 6 con gli esercizi più duri
   recupero 2 min, «Tone up» 3 × 15 recupero 30 s, «Get back in shape» 3 ×
   10 recupero 60 s, quattro esercizi; col corpo libero anche «What do you
   have?»: niente, una sbarra (trazioni), sbarra e parallele (dip);
2. «How many days for each sport?»: una riga di giorni per sport, già
   alternati col riposo in mezzo (corpo libero lun-mer-ven, corsa mar-sab);
   un giorno toccato passa allo sport dopo, poi al riposo;
3. il corpo libero è «Bodyweight · A» e «· B» in turno, tutto il corpo
   (squat a corpo libero, piegamenti, affondi, ponte glutei, plank; B
   affondi, piegamenti o dip, trazioni supine o superman, mountain climber,
   plank laterale); «More strength» usa split squat bulgaro e, con la
   sbarra, trazioni e dip. Senza kg: la nota dice l'attrezzo;
4. senza palestra i modi sono «More each week», A / B e «Always the same».
   In «More reps each week» (anche nelle schede di palestra) un esercizio
   senza kg cresce di una ripetizione a settimana, 5 s se tenuto; l'ultima
   settimana di un ciclo di 3 o più ha una serie in meno coi valori della
   settimana prima; il ciclo dopo riparte da dove è arrivato (10, 11, 12,
   più leggera, 13…). Scelta dell'utente del 2026-11-12, «Sì, così», anche
   per le schede già fatte; un esercizio coi kg fa come prima.
Un giorno di corpo libero è uno fatto solo di esercizi senza attrezzi della
palestra (`bodyweight.ts`): così la guida riconosce i giorni di ogni sport
quando si cambiano. In italiano la scheda di più settimane è il «piano»
(«Nuovo piano», «I miei piani»); il singolo allenamento resta «scheda».
`SportsDoor.tsx`, `bodyweight.ts`.

## Il calendario e la guida in «Draw» (TASK-411 B, rifatta in F)

In «Draw» la palestra ha una pagina sua (parte F, 2026-11-08). Con una
scheda per oggi un riquadro «Today · Mon» col nome della scheda, i suoi
esercizi («Bench press 4×8») e un solo tasto giallo «Start “Push”», che la
segue; sotto «Start without the plan». Senza una scheda per oggi «Start
workout» con la sua riga e «New plan». Sotto, per chi è dentro all'account,
due riquadri: «📅 Gym calendar» con «This month: {n} times» e «Last workout:
{when} · {time}», che apre il calendario, e «📋 Plans» con quante schede
(«New plan» se nessuna), che apre le schede. «How it works» in tre passi
(scegli dalla griglia; segna ogni serie, il recupero parte da solo; «Save»:
calorie, traguardi e classifica) resta solo finché non c'è un allenamento
salvato. Sul proprio profilo il calendario lo apre anche «Gym calendar ›»
nel riquadro 🏋️.

Durante l'allenamento di una scheda, sotto il cronometro una barra gialla
dell'avanzamento e «{plan} · Plan: {done}/{total} sets»; sull'esercizio in
corso «Set 2 of 4» coi pallini, «✓ Log set» su una riga sua, e sotto «Then:
Dips 3×10», il prossimo esercizio della scheda.

Il calendario (`GET /me/gym-calendar?tz=&month=`, solo il proprietario) è un
mese a griglia da lunedì sul fuso del telefono: un pallino giallo nei giorni
con un allenamento, il giorno di oggi bordato, «‹ ›» per i mesi (mai oltre
questo), sopra quanti allenamenti e il loro tempo. Un giorno toccato elenca
i suoi allenamenti con l'ora e il tempo; quello con un post lo apre. Letto
da `runs` con `activity = 'gym'`: nessuna tabella sua.

## Il catalogo

Tipo e scala per ogni esercizio; nomi, figure e scale approvati dall'utente
il 2026-11-04 («Sì, approvo tutto»).

| Chiave | en | it | de | fr | es | Gruppo | Tipo · scala |
|---|---|---|---|---|---|---|---|
| bench_press | Bench press | Panca piana | Bankdrücken | Développé couché | Press de banca | Chest | L-M |
| incline_bench_press | Incline bench press | Panca inclinata | Schrägbankdrücken | Développé incliné | Press inclinado | Chest | L-M |
| decline_bench_press | Decline bench press | Panca declinata | Negativbankdrücken | Développé décliné | Press declinado | Chest | L-M |
| dumbbell_bench_press | Dumbbell bench press | Panca con manubri | Kurzhantel-Bankdrücken | Développé couché haltères | Press de banca con mancuernas | Chest | L-XS |
| dumbbell_fly | Dumbbell fly | Croci con manubri | Kurzhantel-Fliegende | Écarté haltères | Aperturas con mancuernas | Chest | L-XS |
| chest_press_machine | Chest press machine | Chest press | Brustpresse | Presse pectorale | Press de pecho en máquina | Chest | L-M |
| pec_deck | Pec deck | Pectoral machine | Butterfly-Maschine | Pec deck | Contractor de pecho | Chest | L-S |
| cable_crossover | Cable crossover | Croci ai cavi | Kabelzug-Crossover | Croisé à la poulie | Cruce de poleas | Chest | L-S |
| push_up | Push-up | Piegamenti | Liegestütze | Pompes | Flexiones | Chest | B-easy |
| dips | Dips | Dip alle parallele | Dips | Dips | Fondos | Chest | B-hard |
| deadlift | Deadlift | Stacco da terra | Kreuzheben | Soulevé de terre | Peso muerto | Back | L-big |
| pull_up | Pull-up | Trazioni | Klimmzüge | Tractions | Dominadas | Back | B-hard |
| chin_up | Chin-up | Trazioni presa inversa | Klimmzüge im Untergriff | Tractions en supination | Dominadas supinas | Back | B-hard |
| assisted_pull_up | Assisted pull-up machine | Trazioni assistite | Klimmzugmaschine mit Unterstützung | Tractions assistées | Dominadas asistidas | Back | L, senza scala (meno peso è più difficile) |
| lat_pulldown | Lat pulldown | Lat machine | Latziehen | Tirage vertical | Jalón al pecho | Back | L-M |
| seated_cable_row | Seated cable row | Pulley basso | Rudern am Kabel | Tirage horizontal | Remo en polea baja | Back | L-M |
| row_machine | Seated row machine | Rematore alla macchina | Rudermaschine | Rowing machine guidée | Remo en máquina | Back | L-M |
| barbell_row | Barbell row | Rematore con bilanciere | Langhantelrudern | Rowing barre | Remo con barra | Back | L-M |
| dumbbell_row | Dumbbell row | Rematore con manubrio | Kurzhantelrudern | Rowing haltère | Remo con mancuerna | Back | L-S |
| t_bar_row | T-bar row | Rematore T-bar | T-Bar-Rudern | Rowing T-bar | Remo en barra T | Back | L-M |
| straight_arm_pulldown | Straight-arm pulldown | Pullover ai cavi | Überzüge am Kabel | Pull-over à la poulie | Pullover en polea | Back | L-S |
| back_extension | Back extension | Hyperextension | Rückenstrecker | Extension lombaire | Hiperextensiones | Back | B-easy |
| superman | Superman | Superman | Superman | Superman | Superman | Back | B-easy |
| bodyweight_squat | Bodyweight squat | Squat a corpo libero | Kniebeuge ohne Gewicht | Squat au poids du corps | Sentadilla sin peso | Legs | B-easy |
| back_squat | Squat | Squat | Kniebeuge | Squat | Sentadilla | Legs | L-big |
| front_squat | Front squat | Front squat | Frontkniebeuge | Squat avant | Sentadilla frontal | Legs | L-M |
| smith_squat | Smith machine squat | Squat al multipower | Kniebeuge an der Multipresse | Squat à la Smith machine | Sentadilla en multipower | Legs | L-M |
| leg_press | Leg press | Leg press | Beinpresse | Presse à cuisses | Prensa de piernas | Legs | L-XL |
| hack_squat | Hack squat | Hack squat | Hackenschmidt-Kniebeuge | Hack squat | Sentadilla hack | Legs | L-XL |
| leg_extension | Leg extension | Leg extension | Beinstrecker | Leg extension | Extensión de cuádriceps | Legs | L-M |
| leg_curl | Leg curl | Leg curl | Beinbeuger | Leg curl | Curl femoral | Legs | L-M |
| romanian_deadlift | Romanian deadlift | Stacco rumeno | Rumänisches Kreuzheben | Soulevé de terre roumain | Peso muerto rumano | Legs | L-M |
| lunge | Lunges | Affondi | Ausfallschritte | Fentes | Zancadas | Legs | L-XS |
| bulgarian_split_squat | Bulgarian split squat | Squat bulgaro | Bulgarische Kniebeuge | Squat bulgare | Sentadilla búlgara | Legs | L-XS |
| step_up | Step-up | Step-up | Step-ups | Step-up | Subidas al cajón | Legs | L-XS |
| hip_thrust | Hip thrust | Hip thrust | Hip Thrust | Hip thrust | Hip thrust | Legs | L-big |
| glute_bridge | Glute bridge | Ponte glutei | Glute Bridge | Pont fessier | Puente de glúteos | Legs | B-easy |
| glute_machine | Glute machine | Glute machine | Gesäßmaschine | Machine à fessiers | Máquina de glúteos | Legs | L-M |
| hip_abduction | Hip abduction machine | Abductor machine | Abduktorenmaschine | Machine à abducteurs | Máquina de abductores | Legs | L-M |
| hip_adduction | Hip adduction machine | Adductor machine | Adduktorenmaschine | Machine à adducteurs | Máquina de aductores | Legs | L-M |
| standing_calf_raise | Standing calf raise | Calf raise in piedi | Wadenheben stehend | Mollets debout | Elevación de talones de pie | Legs | L-M |
| seated_calf_raise | Seated calf raise | Calf raise seduto | Wadenheben sitzend | Mollets assis | Elevación de talones sentado | Legs | L-M |
| overhead_press | Overhead press | Lento avanti | Schulterdrücken | Développé militaire | Press militar | Shoulders | L-S |
| dumbbell_shoulder_press | Dumbbell shoulder press | Shoulder press con manubri | Kurzhantel-Schulterdrücken | Développé épaules haltères | Press de hombros con mancuernas | Shoulders | L-XS |
| shoulder_press_machine | Shoulder press machine | Shoulder press alla macchina | Schulterpresse | Presse épaules | Press de hombros en máquina | Shoulders | L-S |
| lateral_raise | Lateral raise | Alzate laterali | Seitheben | Élévations latérales | Elevaciones laterales | Shoulders | L-XS |
| front_raise | Front raise | Alzate frontali | Frontheben | Élévations frontales | Elevaciones frontales | Shoulders | L-XS |
| rear_delt_fly | Rear delt fly | Alzate posteriori | Reverse Flys | Oiseau | Pájaros | Shoulders | L-XS |
| reverse_pec_deck | Reverse pec deck | Reverse pectoral machine | Reverse-Butterfly | Pec deck inversé | Contractor inverso | Shoulders | L-S |
| face_pull | Face pull | Face pull | Face Pulls | Face pull | Face pull | Shoulders | L-S |
| upright_row | Upright row | Tirate al mento | Aufrechtes Rudern | Rowing menton | Remo al mentón | Shoulders | L-S |
| shrug | Shrugs | Scrollate | Shrugs | Shrugs | Encogimientos | Shoulders | L-M |
| barbell_curl | Barbell curl | Curl con bilanciere | Langhantel-Curls | Curl barre | Curl con barra | Arms | L-S |
| dumbbell_curl | Dumbbell curl | Curl con manubri | Kurzhantel-Curls | Curl haltères | Curl con mancuernas | Arms | L-XS |
| hammer_curl | Hammer curl | Curl a martello | Hammer-Curls | Curl marteau | Curl martillo | Arms | L-XS |
| preacher_curl | Preacher curl | Curl alla panca Scott | Scott-Curls | Curl au pupitre | Curl predicador | Arms | L-S |
| cable_curl | Cable curl | Curl ai cavi | Kabel-Curls | Curl à la poulie | Curl en polea | Arms | L-S |
| biceps_curl_machine | Biceps curl machine | Curl alla macchina | Bizepsmaschine | Machine à biceps | Máquina de bíceps | Arms | L-S |
| triceps_pushdown | Triceps pushdown | Push down ai cavi | Trizepsdrücken am Kabel | Extension triceps à la poulie | Extensión de tríceps en polea | Arms | L-S |
| skull_crusher | Skull crusher | French press | French Press | Barre au front | Press francés | Arms | L-S |
| overhead_triceps_extension | Overhead triceps extension | Estensioni sopra la testa | Trizepsstrecken über Kopf | Extension triceps au-dessus de la tête | Extensión de tríceps sobre la cabeza | Arms | L-XS |
| close_grip_bench_press | Close-grip bench press | Panca presa stretta | Enges Bankdrücken | Développé couché prise serrée | Press de banca agarre cerrado | Arms | L-M |
| triceps_machine | Triceps machine | Tricipiti alla macchina | Trizepsmaschine | Machine à triceps | Máquina de tríceps | Arms | L-S |
| wrist_curl | Wrist curl | Curl per i polsi | Handgelenk-Curls | Curl poignets | Curl de muñeca | Arms | L-XS |
| crunch | Crunch | Crunch | Crunches | Crunch | Abdominales | Core | B-easy |
| ab_crunch_machine | Ab crunch machine | Crunch alla macchina | Bauchmaschine | Machine à abdos | Máquina de abdominales | Core | L-S |
| cable_crunch | Cable crunch | Crunch ai cavi | Kabel-Crunches | Crunch à la poulie | Crunch en polea | Core | L-S |
| hanging_leg_raise | Hanging leg raise | Sollevamento gambe alla sbarra | Hängendes Beinheben | Relevé de jambes suspendu | Elevación de piernas colgado | Core | B-hard |
| russian_twist | Russian twist | Russian twist | Russian Twist | Russian twist | Giro ruso | Core | B-easy |
| ab_wheel | Ab wheel | Ruota addominale | Bauchroller | Roue abdominale | Rueda abdominal | Core | B-hard |
| plank | Plank | Plank | Unterarmstütz | Gainage | Plancha | Core | T |
| side_plank | Side plank | Plank laterale | Seitstütz | Gainage latéral | Plancha lateral | Core | T |
| wall_sit | Wall sit | Sedia al muro | Wandsitzen | Chaise | Sentadilla isométrica en pared | Core | T |
| mountain_climber | Mountain climber | Mountain climber | Bergsteiger | Grimpeur | Escaladores | Core | T |
| power_clean | Power clean | Girata al petto | Umsetzen | Épaulé | Cargada | Full body | L-M |
| snatch | Snatch | Strappo | Reißen | Arraché | Arrancada | Full body | L-M |
| kettlebell_swing | Kettlebell swing | Swing con kettlebell | Kettlebell-Swing | Swing kettlebell | Swing con kettlebell | Full body | L-S |
| farmer_carry | Farmer's carry | Farmer walk | Farmer's Walk | Marche du fermier | Paseo del granjero | Full body | L-S |
| burpee | Burpees | Burpee | Burpees | Burpees | Burpees | Full body | B-easy |
| box_jump | Box jump | Box jump | Box Jumps | Sauts sur box | Saltos al cajón | Full body | B-easy |
| battle_ropes | Battle ropes | Battle rope | Battle Ropes | Cordes ondulatoires | Cuerdas de batalla | Full body | T |
| treadmill | Treadmill | Tapis roulant | Laufband | Tapis de course | Cinta de correr | Cardio | C-run (tempo, distanza, velocità, pendenza) |
| curved_treadmill | Curved treadmill | Tapis roulant curvo | Kurvenlaufband | Tapis de course incurvé | Cinta curva | Cardio | C-run (tempo, distanza) |
| exercise_bike | Exercise bike | Cyclette | Heimtrainer | Vélo d'appartement | Bicicleta estática | Cardio | C-bike (tempo, distanza, livello) |
| spin_bike | Spin bike | Bici da spinning | Spinning-Rad | Vélo de biking | Bici de spinning | Cardio | C-bike (tempo, distanza, livello) |
| recumbent_bike | Recumbent bike | Cyclette reclinata | Liegeergometer | Vélo semi-allongé | Bicicleta reclinada | Cardio | C-bike (tempo, distanza, livello) |
| air_bike | Air bike | Air bike | Air Bike | Air bike | Air bike | Cardio | C-bike (tempo, distanza) |
| elliptical | Elliptical | Ellittica | Crosstrainer | Vélo elliptique | Elíptica | Cardio | C-run (tempo, distanza, livello) |
| rowing_machine | Rowing machine | Vogatore | Rudergerät | Rameur | Máquina de remo | Cardio | C-row (tempo, distanza, livello) |
| ski_machine | Ski machine | Ski ergometro | Skiergometer | Ergomètre de ski | Ergómetro de esquí | Cardio | C-row (tempo, distanza) |
| stair_climber | Stair climber | Scala | Treppensteiger | Simulateur d'escalier | Escaladora | Cardio | C-time (tempo, piani, livello) |
| stepper | Stepper | Stepper | Stepper | Stepper | Stepper | Cardio | C-time (tempo, livello) |
| vertical_climber | Vertical climber | Climber verticale | Vertikal-Kletterer | Grimpeur vertical | Escalador vertical | Cardio | C-time (tempo) |
| arm_ergometer | Arm bike | Ergometro per braccia | Armergometer | Ergomètre à bras | Ergómetro de brazos | Cardio | C-time (tempo, livello) |
| jump_rope | Jump rope | Salto della corda | Seilspringen | Corde à sauter | Comba | Cardio | C-time (tempo) |

95 esercizi; un nome libero («Add "{name}"») per quello che manca, con il
tipo scelto da chi lo scrive. Le aggiunte al catalogo dopo il task sono righe
nuove qui e nel file del catalogo dell'app.

TASK-461 (ADR-0371) aggiunge quattro esercizi a corpo libero per i piani
senza attrezzi: `superman`, `bodyweight_squat`, `glute_bridge`,
`mountain_climber` (scelta dell'utente del 2026-11-11, «Sì, quattro nuovi»;
nomi e guide approvati lo stesso giorno). Prima il server (A1), poi l'app
(A2), con omino e guida; un'app che non li ha ancora li mostra come un
esercizio dal nome libero (sotto).

## Il post nel Feed (parte D)

- **Fino a 10 foto** e il riquadro giallo fra le pagine (scelta
  dell'utente del 2026-11-05, «10 foto»): fino a 11 pagine, una più di
  una corsa. Mai riordinato, il post mostra prima le foto e il riquadro
  per ultimo; spostato il riquadro, l'ordine va al server come per le
  corse.
- **Il riquadro** ha 🏋️, «Gym», il tempo e gli esercizi principali: i tre
  con più serie, a pari serie quello fatto prima, e le kcal (parte C).
  Il battito viene con la parte G. È anche l'immagine condivisa.
- **«Show exercises»**, acceso finché lo si spegne: alla fine
  dell'allenamento, nel modulo del post, e sulla scheda in «My
  activities». Spento, il post non mostra l'elenco né gli esercizi nel
  riquadro.
- **Il modulo del post a fine allenamento** (scelta dell'utente del
  2026-11-05, «Sì, anche alla fine»): foto, titolo, «How did it go?», le
  persone taggate, chi lo vede e «Show exercises», sopra «Save». Partono
  dopo l'allenamento, anche senza rete.
- **Condividere**: il riquadro, senza risultati, emoji, video né Strava.

## La classifica (parte F)

Scelte dell'utente: la scelta 9 («Sì, così») e del 2026-11-06 «Profilo +
esercizio nel post» e «Per esercizio, almeno 3». Valori e regole in
ADR-0327, precisazione F.

- **Per esercizio e mese di calendario di Roma**, un esercizio del catalogo
  con una scala. Una riga per persona: la sua serie migliore, letta come i
  traguardi (kg assoluti per i carichi, ripetizioni, secondi, metri), a
  pari valore la serie segnata prima.
- **Contano** solo le serie segnate dal vivo, sotto il tetto, di allenamenti
  cominciati e pubblicati nel mese, per tutti e con gli esercizi mostrati.
  Un post nascosto dalla moderazione non conta: ogni riga si segnala
  segnalando il suo post. Mai attraverso un blocco.
- **Si apre** dalla riga «Gym leaderboard · {month}» sotto il riquadro
  «🏋️ Gym» del profilo (sull'esercizio più alto) e toccando un esercizio
  nella scheda del post. «‹» porta ai mesi prima; una riga apre il post,
  «…» lo segnala. «Only sets logged live count.» sotto il titolo.
- **«Winner»**: il primo di ogni esercizio a mese finito, se almeno 3
  persone sono in classifica; senza push.

## Le calorie (parte C)

Sul telefono, in `gym/gymKcal.ts`; i valori e i codici sono in ADR-0327
(precisazione C).

- Tapis roulant (anche curvo): ACSM della camminata sotto i 7 km/h, della
  corsa da 7 km/h, con la velocità o i metri sul tempo e la pendenza in
  salita (ADR-0318, punto 2). Senza velocità né metri il blocco resta nel
  tempo dei pesi.
- Cyclette, ellittica, vogatore, scala, stepper e le altre: MET del
  Compendium 2024 per fascia di livello (1–7 leggero, 8–14 moderato, oltre
  vigoroso), per il vogatore coi metri dai watt del passo; copiati nel
  codice con il codice attività, come bici e paddle. Una macchina col nome
  libero resta nel tempo dei pesi.
- Il resto della sessione: il MET dei pesi con più esercizi (3,5, 02054).
  Quel MET è la media di una sessione con i recuperi dentro, quindi i
  recuperi non si tolgono una seconda volta.
- Si vedono sotto il cronometro, alla fine, sul riquadro e nella riga del
  post, nel riquadro condiviso. Con gli esercizi nascosti chi guarda il
  post non vede le kcal (scelta dell'utente del 2026-11-06, «Niente
  kcal»); l'autore sì.
- **Salute**: con «Save», dopo il sì dell'utente, un allenamento di forza
  con le kcal e le pause, senza percorso né distanza; su Apple al chiuso.
