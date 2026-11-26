# TASK-489 — «Alimentazione»: il diario di quello che mangio e il bilancio delle calorie

**Stato**: In corso (parte 0 chiusa il 2026-11-22; **A1, A2, B1, B2, C1, D e la privacy F in `main`** (#1437, #1460, #1473, #1490, #1501, #1517, #1496), tutte spente (`NUTRITION_ON`); in fila, una PR dopo l'altra: **D2 = #1547**, G1, C2a, H, I (scritte in locale); decise il 2026-11-24 e non scritte: J (l'ingresso) e K (il peso); per la build nativa G2, C2b e l'accensione; la modalità è TASK-514, le storie TASK-513)
**Fase**: 5 · **Branch**: una PR per parte; la parte 0 è
`docs/TASK-489-nutrition-part-0`
**Dipende da**: TASK-374 (il mio corpo, `body/energy.ts`), TASK-321 (Apple
Salute e Health Connect), TASK-462 (il calendario delle attività), TASK-473
(il pannello a griglia degli sport)
**Si incrocia con**: TASK-490 (l'«hub Allenamento», ADR-0398: dove sta
l'ingresso), TASK-467 C e TASK-322 B (la stessa build nativa), TASK-312 D
(leggere da Salute), TASK-321 C (la build Android con Health Connect)
**ADR**: **ADR-0397** · numero del task e dell'ADR dal Coordinatore
(fork 3) il 2026-11-22.

## Obiettivo

Nella sezione degli sport entra una voce nuova, **«Alimentazione»**
(nell'app «Nutrition»). Non è uno sport che si registra: è la porta di un
**contacalorie**. L'ha chiesto l'utente il 2026-11-22
(`out/alimentazione/PROMPT.md`):

1. **La mia dieta la scrivo io**: il piano è quello che l'utente ha deciso
   di mangiare o la dieta del suo dietologo. MuW non fornisce diete né
   consigli alimentari, e lo dice in chiaro.
2. **Segno quanto mangio**: ogni giorno cibi e quantità; MuW fa una
   **stima** delle calorie assunte da una tabella di composizione degli
   alimenti con la fonte scritta nell'app.
3. **Le mie attività contano tutte**: quelle dell'hub privato, pubblicate o
   no, comprese quelle lette da Apple Salute (su Android Health Connect).
4. **Una tabella nel profilo** dice, giorno per giorno, se l'utente è
   andato a credito o a debito di calorie (assunte meno consumate).

## Paletti (non si discutono)

- **Mai una dieta, un obiettivo o un consiglio prodotto da MuW**, nemmeno
  dall'AI. Se un giorno l'AI leggerà «200 g di pasta al pomodoro», vale il
  principio del progetto: l'AI interpreta le parole, la tabella fa i conti;
  l'AI non produce mai un numero di calorie.
- Ogni numero è una **stima** e nell'app si chiama così.
- La tabella a credito e a debito la vede **solo il proprietario**.
- I dati di Salute non si usano per la pubblicità e non escono dal telefono
  senza una scelta esplicita dell'utente (regola Apple 5.1.3).
- `services/route-engine/` non si tocca. Nessuna dipendenza nuova senza
  chiederlo (lettore di codici a barre compreso).
- Il consumo si calcola con `apps/mobile/src/body/energy.ts`, non con
  formule nuove.

## Com'è oggi (letto in `main` a `7650b65f`, 2026-11-22)

- **Il consumo**: `body/energy.ts` dà l'energia attiva di un'attività
  (`activeKcal`: equazioni ACSM per corsa e camminata, MET del Compendium
  2024 per gli altri sport) e il consumo a riposo (`restKcalPerMin`:
  Mifflin-St Jeor con sesso, età, peso e altezza; con un campo mancante un
  MET standard). La palestra conta le sue serie (`gym/gymKcal.ts`), la
  vasca le sue (`pool/poolKcal.ts`).
- **Il mio corpo**: `body/bodyProfile.ts`, `settings/BodyPage.tsx`; i
  dati stanno in un file del telefono (`expo-file-system`).
- **L'hub delle attività**: `activities/useActivities.ts` legge dal server
  la lista delle corse di chi è entrato (pubblicate o no, importate da file
  comprese); `ActivityCalendar.tsx` le mostra per giorno.
- **Apple Salute**: MuW **scrive** gli allenamenti finiti (TASK-321) e
  **legge solo il battito** (TASK-345 C). Il testo del permesso di lettura
  in `app.json` nomina solo il battito. La lettura del sonno è nella bozza
  #1334 (TASK-467 C), fuori da `main`. **Non legge** gli allenamenti delle
  altre app né l'energia attiva del giorno: lo studio di TASK-312 D non è
  stato fatto, e in TASK-481 «From Apple Health» è fuori scope.
- **Health Connect** (Android): MuW scrive soltanto (`health/healthConnect.ts`);
  la build Android con Health Connect è TASK-321 C.
- **Il pannello degli sport**: `settings/SportButton.tsx` con le famiglie
  di `settings/sportFamilies.ts` («On foot», «On wheels», «On the water»,
  «On snow», «Other»); ogni tessera è uno `Sport` del registro.
- **Il profilo**: `profile/ProfileHome.tsx` monta `ProfileStats`,
  `OwnVo2Max`, `OwnSleep`.
- **Interruttori**: le parti non pronte stanno dietro una costante spenta,
  come `SLEEP_POSTS_ON` (`health/sleepModules.ts`).

## Le scelte dell'utente (parte 0, 2026-11-22, una alla volta)

1. **Dove sta la voce.** Proposta: una tessera «Nutrition» in una famiglia
   sua, in fondo al pannello degli sport, che apre la pagina e non cambia
   lo sport scelto. **Risposta: «Famiglia sua, in fondo».** Scartate: dentro
   «Other»; pannello più una riga nel profilo.
   *Nota*: TASK-490 (l'«hub Allenamento», aperto lo stesso giorno) può
   spostare l'ingresso dentro la sua schermata; la tessera è un componente
   solo, montabile nell'uno o nell'altro posto, e il posto finale lo decide
   l'utente quando risponde alle domande di TASK-490.
2. **Da dove vengono i numeri dei cibi.** Licenze verificate il
   2026-11-22: USDA FoodData Central è di pubblico dominio (CC0 1.0, chiede
   solo di citare la fonte); Open Food Facts è ODbL (attribuzione, e una
   base di dati mescolata va ricondivisa); per le tabelle CREA non ho
   trovato una licenza di riuso. Proposta: un elenco di base piccolo e
   curato da USDA dentro l'app, più i cibi scritti dall'utente.
   **Risposta: «USDA di base + cibi miei».** Scartate: chiedere il permesso
   a CREA; solo cibi miei; Open Food Facts in una parte dopo.
3. **Solo calorie o anche i macronutrienti.** **Risposta: «Calorie subito,
   macro dopo»**: la prima uscita conta le kcal; la tabella dei cibi tiene
   già proteine, carboidrati e grassi per 100 g, non mostrati.
4. **Come si scrive il piano.** **Risposta: «Settimana a pasti»**: per ogni
   giorno della settimana quattro pasti («Breakfast», «Lunch», «Dinner»,
   «Snacks»), ognuno con cibi e grammi; un giorno si copia su un altro. Nel
   diario, «Eaten as planned» segna tutto il piano del giorno, oppure si
   corregge il singolo pasto o si aggiunge un cibo fuori piano. Scartate:
   un solo giorno tipo; solo diario senza piano.
5. **Dove restano i dati.** **Risposta: «Prima solo sul telefono»**: piano,
   cibi dell'utente e diario restano sul telefono; il server (parte E, con
   migrazione, passo e sì dell'utente) in una parte dopo.
6. **Chi vede la tabella.** **Risposta: «Solo io, sempre»**: mai sul
   profilo pubblico, mai nel Feed, mai in un post, mai per la pubblicità;
   nessun interruttore per mostrarla. Scartata: un tasto «Share» a mano.
7. **Le parole.** **Risposta: «Approvo l'avviso completo»**: toni neutri,
   «Surplus» e «Deficit» senza giudizi, nessun obiettivo di peso proposto
   da MuW, mai rosso e verde come unico segnale. I testi approvati sono
   nella tabella qui sotto. Scartate: l'avviso corto; «Credit» e «Debit».
8. **Le attività dall'iPhone.** Detto all'utente: oggi MuW scrive in
   Salute e legge solo il battito; per leggere gli allenamenti delle altre
   app e l'energia attiva del giorno serve una build nativa con la
   revisione di Apple (il testo del permesso cambia), non basta un OTA.
   Proposta: due tempi (prima un OTA con riposo e attività di MuW, poi la
   lettura da Salute con la build nativa). **Risposta: «Tutto insieme, con
   la nativa»**: «Nutrition» resta spenta finché la lettura da Salute non è
   pronta ed esce in una volta sola con la build nativa. Scartate: due
   tempi; due tempi con i soli allenamenti.

Le domande della parte 0 sono finite il 2026-11-22.

### Precisazioni del 2026-11-23 (tre differenze con TASK-490)

Lo stesso giorno l'utente aveva risposto alla sessione di TASK-490 (l'«hub
Allenamento») «C · Diario completo»: ricerca dei cibi e codice a barre
(Open Food Facts), grammi e macronutrienti per pasto, in cima l'obiettivo
del giorno. Tre punti non coincidevano con le scelte 2, 3 e 7: richiesti
all'utente, uno alla volta.

9. **Il codice a barre.** **Risposta: «Codice a barre, parte a sé»**:
   restano l'elenco di base USDA e i cibi dell'utente (scelta 2); in più
   una parte a sé, la **G**, col lettore di codici a barre che cerca il
   prodotto su Open Food Facts. Con la risposta l'utente ha detto sì a
   chiedere la dipendenza nativa nuova (`expo-camera`); entra nella stessa
   build nativa da cui «Nutrition» esce. Scartate: nessun codice a barre;
   deciderlo più avanti.
10. **I macronutrienti.** **Risposta: «Calorie prima, macro dopo»**: resta
    la scelta 3. La prima uscita mostra solo le kcal.
11. **In cima alla pagina.** **Risposta: «Stima + obiettivo scritto da
    me»**: in cima «Eaten», «Used (est.)» e «Balance»; se l'utente vuole,
    scrive lui «My daily target» in kcal (il suo o quello del dietologo) e
    la pagina mostra «Left». **MuW non lo propone e non lo calcola mai**:
    il paletto e l'avviso approvato restano come sono. Scartate: solo la
    stima; un «Daily goal» calcolato da MuW.

12. **Correggere a mano il consumo** (chiesto dall'utente il 2026-11-23,
    parole sue: «metti anche la possibilità di modificare manualmente
    quante kcal il nostro corpo consuma al giorno a riposo… oltre agli
    allenamenti, metti che puoi modificare anche lì le kcal»):
    - **il riposo**: l'utente può scrivere lui le kcal al giorno che il suo
      corpo consuma a riposo (per esempio quelle misurate dal dietologo);
      da allora il conto usa quel numero al posto della stima di
      Mifflin-St Jeor, con la scritta «set by you», e si può tornare alla
      stima;
    - **ogni allenamento**: l'utente può correggere le kcal di una singola
      attività dell'hub; il conto usa il numero corretto, con la scritta
      «edited», e si può tornare alla stima.
    *Deciso dall'agente su delega dell'utente, da vedere con le schermate*:
    le correzioni restano sul telefono e valgono per il bilancio e per la
    lista privata; non cambiano le calorie del post né quelle scritte in
    Salute. In un giorno che ha l'energia attiva di Salute, un'attività
    corretta sposta il totale del giorno della differenza fra il numero
    corretto e quello che contava prima.

La tab «Cibo» di TASK-490 monta la pagina di questo task così com'è.

## Testi approvati dall'utente (2026-11-22, in inglese)

| Dove | Testo |
|---|---|
| Prima apertura, titolo | «Before you start» |
| Prima apertura, testo | «MuW does not provide diets, meal plans or medical advice. The plan here is the one you write: your own, or the one your dietitian gave you.» |
|  | «Every number is an estimate, from food composition tables and from formulas for the energy you use.» |
|  | «If you have a medical condition, are pregnant or have a history of eating disorders, talk to a doctor or a dietitian before counting calories.» |
| Prima apertura, tasto | «I understand» |
| Sempre nella pagina, in piccolo | «Estimates only. MuW does not provide diets or medical advice.» · «How we calculate» |
| La tabella | «Eaten» · «Used» · «Balance» · «Surplus» · «Deficit» (col segno + o −) |
| I pasti | «Breakfast» · «Lunch» · «Dinner» · «Snacks» |
| Il diario | «Eaten as planned» |
| In cima alla pagina (2026-11-23) | «Eaten» · «Used (est.)» · «Balance» · «My daily target» · «(set by you)» · «Left» |

Il testo nuovo del permesso di Salute e quelli della privacy si approvano
nelle parti F e C2.

### Testi della parte B (approvati dall'utente il 2026-11-23, «Sì, approvo»)

Mostrati con sei schermate disegnate (ingresso dal pannello, avviso,
diario del giorno, piano della settimana, aggiunta di un cibo, «How we
calculate»). L'inglese è il testo dell'app; le altre quattro lingue
entrano in `i18n/{it,de,es,fr}.ts`, in ogni PR solo le chiavi che quella PR
usa. I nomi dei giorni sono quelli che l'app ha già.

Le traduzioni dei testi già approvati in inglese:

| English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|
| Before you start | Prima di iniziare | Bevor du anfängst | Antes de empezar | Avant de commencer |
| MuW does not provide diets, meal plans or medical advice. The plan here is the one you write: your own, or the one your dietitian gave you. | MuW non fornisce diete, piani alimentari né consigli medici. Il piano qui è quello che scrivi tu: il tuo, o quello che ti ha dato il tuo dietista. | MuW gibt keine Diäten, Ernährungspläne oder medizinischen Ratschläge. Der Plan hier ist der, den du schreibst: dein eigener oder der von deiner Ernährungsfachkraft. | MuW no ofrece dietas, planes de comidas ni consejos médicos. El plan de aquí es el que escribes tú: el tuyo o el que te dio tu dietista. | MuW ne fournit ni régimes, ni plans de repas, ni conseils médicaux. Le plan ici est celui que tu écris : le tien, ou celui que ton diététicien t'a donné. |
| Every number is an estimate, from food composition tables and from formulas for the energy you use. | Ogni numero è una stima, ricavata da tabelle di composizione degli alimenti e da formule per l'energia che consumi. | Jede Zahl ist eine Schätzung aus Nährwerttabellen und aus Formeln für die Energie, die du verbrauchst. | Cada número es una estimación, a partir de tablas de composición de alimentos y de fórmulas para la energía que gastas. | Chaque chiffre est une estimation, tirée de tables de composition des aliments et de formules pour l'énergie que tu dépenses. |
| If you have a medical condition, are pregnant or have a history of eating disorders, talk to a doctor or a dietitian before counting calories. | Se hai una condizione medica, sei in gravidanza o hai avuto disturbi alimentari, parla con un medico o un dietista prima di contare le calorie. | Wenn du eine Erkrankung hast, schwanger bist oder eine Essstörung hattest, sprich mit einer Ärztin, einem Arzt oder einer Ernährungsfachkraft, bevor du Kalorien zählst. | Si tienes una enfermedad, estás embarazada o has tenido trastornos alimentarios, habla con un médico o un dietista antes de contar calorías. | Si tu as un problème de santé, si tu es enceinte ou si tu as eu des troubles alimentaires, parle à un médecin ou à un diététicien avant de compter les calories. |
| I understand | Ho capito | Verstanden | Entendido | J'ai compris |
| Estimates only. MuW does not provide diets or medical advice. | Solo stime. MuW non fornisce diete né consigli medici. | Nur Schätzungen. MuW gibt keine Diäten oder medizinischen Ratschläge. | Solo estimaciones. MuW no ofrece dietas ni consejos médicos. | Estimations uniquement. MuW ne fournit ni régimes ni conseils médicaux. |
| How we calculate | Come calcoliamo | So rechnen wir | Cómo calculamos | Comment nous calculons |
| Eaten | Mangiate | Gegessen | Ingeridas | Mangées |
| Used (est.) | Consumate (stima) | Verbraucht (gesch.) | Gastadas (est.) | Dépensées (est.) |
| Balance | Bilancio | Bilanz | Balance | Bilan |
| Surplus | Surplus | Überschuss | Superávit | Excédent |
| Deficit | Deficit | Defizit | Déficit | Déficit |
| Breakfast | Colazione | Frühstück | Desayuno | Petit-déjeuner |
| Lunch | Pranzo | Mittagessen | Comida | Déjeuner |
| Dinner | Cena | Abendessen | Cena | Dîner |
| Snacks | Spuntini | Snacks | Tentempiés | En-cas |
| Eaten as planned | Mangiato come da piano | Wie geplant gegessen | Comido según el plan | Mangé comme prévu |
| My daily target | Il mio obiettivo del giorno | Mein Tagesziel | Mi objetivo diario | Mon objectif du jour |
| (set by you) | (scritto da te) | (von dir festgelegt) | (lo pones tú) | (fixé par toi) |
| Left | Restano | Übrig | Quedan | Restent |

I testi nuovi:

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Pannello degli sport, titolo della famiglia | Food | Cibo | Essen | Comida | Alimentation |
| Pannello, tessera; titolo della pagina | Nutrition | Alimentazione | Ernährung | Nutrición | Nutrition |
| Le due viste | Diary | Diario | Tagebuch | Diario | Journal |
|  | My plan | Il mio piano | Mein Plan | Mi plan | Mon plan |
| Giorno del diario | Today | Oggi | Heute | Hoy | Aujourd'hui |
|  | Yesterday | Ieri | Gestern | Ayer | Hier |
| Frecce (letti dallo schermo parlante) | Previous day | Giorno prima | Vorheriger Tag | Día anterior | Jour précédent |
|  | Next day | Giorno dopo | Nächster Tag | Día siguiente | Jour suivant |
| Senza obiettivo scritto | Set my daily target | Scrivi il mio obiettivo del giorno | Mein Tagesziel festlegen | Poner mi objetivo diario | Fixer mon objectif du jour |
| Scheda dell'obiettivo | kcal a day | kcal al giorno | kcal pro Tag | kcal al día | kcal par jour |
|  | Your own number, or the one your dietitian gave you. MuW never suggests one. | Il tuo numero, o quello che ti ha dato il tuo dietista. MuW non ne propone mai uno. | Deine eigene Zahl oder die von deiner Ernährungsfachkraft. MuW schlägt nie eine vor. | Tu propio número, o el que te dio tu dietista. MuW nunca propone uno. | Ton propre chiffre, ou celui que ton diététicien t'a donné. MuW n'en propose jamais. |
|  | Remove target | Togli l'obiettivo | Ziel entfernen | Quitar objetivo | Retirer l'objectif |
| Pasto | Add food | Aggiungi cibo | Lebensmittel hinzufügen | Añadir alimento | Ajouter un aliment |
| Giorno senza niente | Nothing written for this day. | Niente scritto per questo giorno. | Für diesen Tag ist nichts eingetragen. | Nada escrito para este día. | Rien d'écrit pour ce jour. |
| Piano | Copy this day to… | Copia questo giorno su… | Diesen Tag kopieren nach… | Copiar este día a… | Copier ce jour vers… |
|  | This is the plan you write. MuW never changes it. | Questo è il piano che scrivi tu. MuW non lo cambia mai. | Das ist der Plan, den du schreibst. MuW ändert ihn nie. | Este es el plan que escribes tú. MuW nunca lo cambia. | C'est le plan que tu écris. MuW ne le modifie jamais. |
| Scheda «aggiungi un cibo», titolo | Add to breakfast / lunch / dinner / snacks | Aggiungi a colazione / pranzo / cena / spuntini | Zum Frühstück / Mittagessen / Abendessen / zu den Snacks hinzufügen | Añadir al desayuno / a la comida / a la cena / a los tentempiés | Ajouter au petit-déjeuner / au déjeuner / au dîner / aux en-cas |
| Campo di ricerca | Search food | Cerca un cibo | Lebensmittel suchen | Buscar alimento | Chercher un aliment |
| Segno sui cibi dell'utente | My food | Cibo mio | Mein Lebensmittel | Alimento mío | Mon aliment |
| Ricerca senza risultati | No food found. | Nessun cibo trovato. | Kein Lebensmittel gefunden. | Ningún alimento encontrado. | Aucun aliment trouvé. |
| In fondo alla ricerca | Add my own food | Aggiungi un cibo mio | Eigenes Lebensmittel hinzufügen | Añadir un alimento mío | Ajouter mon propre aliment |
| Grammi | Grams | Grammi | Gramm | Gramos | Grammes |
| Calorie della porzione | Estimate | Stima | Schätzung | Estimación | Estimation |
| Tasti | Add | Aggiungi | Hinzufügen | Añadir | Ajouter |
|  | Save | Salva | Speichern | Guardar | Enregistrer |
|  | Remove | Togli | Entfernen | Quitar | Retirer |
| Cibo mio, modulo | My own food | Un cibo mio | Eigenes Lebensmittel | Mi alimento | Mon aliment |
|  | Name | Nome | Name | Nombre | Nom |
|  | Calories in 100 g (kcal) | Calorie in 100 g (kcal) | Kalorien in 100 g (kcal) | Calorías en 100 g (kcal) | Calories pour 100 g (kcal) |
|  | Copy the number from the label, or from your dietitian's sheet. | Copia il numero dall'etichetta, o dal foglio del tuo dietista. | Übernimm die Zahl vom Etikett oder vom Blatt deiner Ernährungsfachkraft. | Copia el número de la etiqueta o de la hoja de tu dietista. | Recopie le chiffre de l'étiquette ou de la fiche de ton diététicien. |
|  | Delete food | Elimina il cibo | Lebensmittel löschen | Eliminar alimento | Supprimer l'aliment |
| «How we calculate», titoletti | Food | Cibo | Lebensmittel | Alimentos | Aliments |
|  | Energy you use | Energia che consumi | Energie, die du verbrauchst | Energía que gastas | Énergie que tu dépenses |
|  | Estimates | Stime | Schätzungen | Estimaciones | Estimations |
| «How we calculate», testo | Calories of the foods in the list come from USDA FoodData Central (SR Legacy, April 2018), a public-domain food composition table. Your own foods use the numbers you wrote. | Le calorie dei cibi dell'elenco vengono da USDA FoodData Central (SR Legacy, aprile 2018), una tabella di composizione degli alimenti di pubblico dominio. I cibi tuoi usano i numeri che hai scritto tu. | Die Kalorien der Lebensmittel in der Liste stammen aus USDA FoodData Central (SR Legacy, April 2018), einer gemeinfreien Nährwerttabelle. Deine eigenen Lebensmittel nutzen die Zahlen, die du eingetragen hast. | Las calorías de los alimentos de la lista vienen de USDA FoodData Central (SR Legacy, abril de 2018), una tabla de composición de alimentos de dominio público. Tus alimentos usan los números que escribiste. | Les calories des aliments de la liste viennent de USDA FoodData Central (SR Legacy, avril 2018), une table de composition des aliments du domaine public. Tes propres aliments utilisent les chiffres que tu as écrits. |
|  | At rest: the Mifflin-St Jeor equation, from the body data in your profile. Activities: ACSM equations and the 2024 Compendium of Physical Activities. On days when Apple Health has your active energy, that number is used instead. | A riposo: l'equazione di Mifflin-St Jeor, dai dati del corpo nel tuo profilo. Attività: equazioni ACSM e il Compendium of Physical Activities 2024. Nei giorni in cui Salute di Apple ha la tua energia attiva, si usa quel numero. | In Ruhe: die Mifflin-St-Jeor-Gleichung, aus den Körperdaten in deinem Profil. Aktivitäten: ACSM-Gleichungen und das Compendium of Physical Activities 2024. An Tagen, an denen Apple Health deine Aktivitätsenergie hat, wird stattdessen diese Zahl verwendet. | En reposo: la ecuación de Mifflin-St Jeor, con los datos del cuerpo de tu perfil. Actividades: ecuaciones del ACSM y el Compendium of Physical Activities 2024. Los días en que Salud de Apple tiene tu energía activa, se usa ese número. | Au repos : l'équation de Mifflin-St Jeor, à partir des données corporelles de ton profil. Activités : équations de l'ACSM et le Compendium of Physical Activities 2024. Les jours où Santé d'Apple a ton énergie active, c'est ce chiffre qui est utilisé. |
|  | Real values change with the product, the recipe and the person. MuW does not provide diets or medical advice. | I valori reali cambiano con il prodotto, la ricetta e la persona. MuW non fornisce diete né consigli medici. | Die tatsächlichen Werte hängen vom Produkt, vom Rezept und von der Person ab. MuW gibt keine Diäten oder medizinischen Ratschläge. | Los valores reales cambian con el producto, la receta y la persona. MuW no ofrece dietas ni consejos médicos. | Les valeurs réelles varient selon le produit, la recette et la personne. MuW ne fournit ni régimes ni conseils médicaux. |
|  | Only you see this page. Nothing here leaves your phone. | Questa pagina la vedi solo tu. Niente di quello che c'è qui esce dal tuo telefono. | Diese Seite siehst nur du. Nichts davon verlässt dein Handy. | Esta página solo la ves tú. Nada de lo que hay aquí sale de tu teléfono. | Toi seul vois cette page. Rien de ce qui s'y trouve ne quitte ton téléphone. |

### Testi della parte C1 (approvati dall'utente il 2026-11-23, «Sì, approvo»)

Mostrati con cinque schermate disegnate (il diario coi numeri pieni, «Energy
you use», «Energy at rest», «Calories of this activity», la lista privata).

L'inglese è il testo dell'app.
Restano quelli già approvati: «Eaten», «Used (est.)», «Balance», «Surplus»,
«Deficit», «(set by you)», «Energy you use», «kcal a day», «Save», «Close».

#### In cima al diario

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Sotto i tre numeri, solo oggi | Today the energy at rest is counted up to now. | Oggi l'energia a riposo è contata fino a adesso. | Heute wird die Energie in Ruhe bis jetzt gezählt. | Hoy la energía en reposo se cuenta hasta ahora. | Aujourd'hui, l'énergie au repos est comptée jusqu'à maintenant. |

«Balance» mostra il numero col segno e la parola: «−660 · Deficit»,
«+120 · Surplus». Senza niente di mangiato scritto resta «—».

#### La scheda «Energy you use» (si apre toccando «Used (est.)»)

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Riga del riposo | At rest | A riposo | In Ruhe | En reposo | Au repos |
| Titoletto | Activities | Attività | Aktivitäten | Actividades | Activités |
| Giorno senza attività | No activities on this day. | Nessuna attività in questo giorno. | Keine Aktivitäten an diesem Tag. | Ninguna actividad este día. | Aucune activité ce jour-là. |
| Segno su un numero corretto a mano | edited | modificato | bearbeitet | editado | modifié |
| Senza account | Log in to count your activities. | Accedi per contare le tue attività. | Melde dich an, um deine Aktivitäten zu zählen. | Inicia sesión para contar tus actividades. | Connecte-toi pour compter tes activités. |
| Lista non arrivata | Your activities could not be loaded. Only the energy at rest is counted. | Non è stato possibile caricare le tue attività. È contata solo l'energia a riposo. | Deine Aktivitäten konnten nicht geladen werden. Es wird nur die Energie in Ruhe gezählt. | No se han podido cargar tus actividades. Solo se cuenta la energía en reposo. | Impossible de charger tes activités. Seule l'énergie au repos est comptée. |

#### La scheda «Energy at rest» (toccando la riga «At rest»)

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Titolo | Energy at rest | Energia a riposo | Energie in Ruhe | Energía en reposo | Énergie au repos |
| Sotto il campo | Your own number, for example the one your dietitian measured. It takes the place of MuW's estimate. | Il tuo numero, per esempio quello misurato dal tuo dietista. Prende il posto della stima di MuW. | Deine eigene Zahl, zum Beispiel die von deiner Ernährungsfachkraft gemessene. Sie ersetzt die Schätzung von MuW. | Tu propio número, por ejemplo el que midió tu dietista. Sustituye a la estimación de MuW. | Ton propre chiffre, par exemple celui mesuré par ton diététicien. Il remplace l'estimation de MuW. |
| La stima, sempre in vista | MuW's estimate: {kcal} kcal | Stima di MuW: {kcal} kcal | Schätzung von MuW: {kcal} kcal | Estimación de MuW: {kcal} kcal | Estimation de MuW : {kcal} kcal |
| Tasto per togliere il numero scritto | Back to the estimate | Torna alla stima | Zurück zur Schätzung | Volver a la estimación | Revenir à l'estimation |

#### La scheda «Calories of this activity» (toccando un'attività)

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Titolo | Calories of this activity | Calorie di questa attività | Kalorien dieser Aktivität | Calorías de esta actividad | Calories de cette activité |
| Sotto il campo | Your number stays on this phone. Your post and Apple Health keep theirs. | Il tuo numero resta su questo telefono. Il tuo post e Salute di Apple tengono i loro. | Deine Zahl bleibt auf diesem Handy. Dein Beitrag und Apple Health behalten ihre. | Tu número se queda en este teléfono. Tu publicación y Salud de Apple conservan los suyos. | Ton chiffre reste sur ce téléphone. Ta publication et Santé d'Apple gardent les leurs. |

Usa anche «MuW's estimate: {kcal} kcal» e «Back to the estimate».

#### La lista privata («My activities»)

Nessun testo nuovo: ogni attività chiude la riga dei numeri con le sue
calorie, «7.2 km · 38:12 · 412 kcal», come oggi fa già la vasca. Un numero
corretto a mano porta «(edited)»: «250 kcal (edited)».

### Testi della parte D (approvati dall'utente il 2026-11-23, «Sì, approvo»)

Mostrati con due schermate disegnate (la settimana in corso e una finita).

L'inglese è il testo dell'app.
Restano quelli già approvati o già nell'app: «Eaten», «Balance», «Surplus»,
«Deficit», «Only you see this», «This week», «Mon» … «Sun», «Estimates only.
MuW does not provide diets or medical advice.».

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Titolo del riquadro | Calorie balance | Bilancio delle calorie | Kalorienbilanz | Balance de calorías | Bilan calorique |
| Colonna (approvata in inglese il 2026-11-22) | Used | Consumate | Verbraucht | Gastadas | Dépensées |
| Frecce (lette dallo schermo parlante) | Previous week | Settimana prima | Vorherige Woche | Semana anterior | Semaine précédente |
|  | Next week | Settimana dopo | Nächste Woche | Semana siguiente | Semaine suivante |
| Segno sulla riga di oggi | so far | finora | bisher | hasta ahora | jusqu'ici |
| Ultima riga | Week total | Totale della settimana | Wochensumme | Total de la semana | Total de la semaine |
| Sotto il totale, solo nella settimana in corso | Today is not in the total until the day is over. | Oggi non entra nel totale finché il giorno non è finito. | Heute zählt erst zur Summe, wenn der Tag vorbei ist. | Hoy no entra en el total hasta que acabe el día. | Aujourd'hui n'entre dans le total qu'une fois la journée terminée. |

Una settimana che non è quella in corso ha per titolo le sue date,
«16 Nov – 22 Nov», scritte coi nomi dei mesi che l'app ha già.

Le righe: il giorno («Mon 23»), «Eaten», «Used», «Balance» col segno
(«−470», «+330»). Un giorno senza niente scritto nel diario mostra «—» in
tutte e tre le colonne e non entra nel totale. Le parole «Surplus» e
«Deficit» stanno accanto al totale della settimana; sulle righe le legge lo
schermo parlante.

### Testi della parte F (approvati dall'utente il 2026-11-23, «Sì, approvo»)

Entrano in `apps/mobile/src/about/content/{en,it,de,es,fr}.ts`
(la privacy nell'app) e, non prima dell'app che li porta, in `site/privacy/**`.

Tre pezzi. I primi due descrivono quello che il codice delle parti A–D fa
già (tutto sul telefono). Il terzo descrive la lettura da Salute, che arriva
con la parte C2 nella build nativa: entra nel testo solo con quella.

#### 1 · Sezione nuova «Nutrition», prima di «Apple Health and Health Connect»

**English**

Heading: Nutrition

«Nutrition» is a diary you keep for yourself. The foods you add, your weekly plan, what you write that you ate each day, your daily target and the calories you correct by hand are kept on your phone only: they do not reach our server and nobody else can see them. The «Calorie balance» on your profile is worked out on your phone and shown only to you.

To estimate the energy you use, MuW counts on your phone the activities of your account and the body data you entered in «Settings». Every number is an estimate: MuW does not provide diets or medical advice.

This data was never on our server, so logging out or deleting your account does not delete it: it stays on your phone until you remove it there or uninstall the app.

**Italiano**

Titolo: Alimentazione

«Alimentazione» è un diario che tieni per te. I cibi che aggiungi, il tuo piano della settimana, quello che scrivi di aver mangiato ogni giorno, il tuo obiettivo del giorno e le calorie che correggi a mano restano solo sul tuo telefono: non arrivano al nostro server e nessun altro può vederli. Il «Bilancio delle calorie» nel tuo profilo è calcolato sul telefono e lo vedi solo tu.

Per stimare l'energia che consumi, MuW conta sul telefono le attività del tuo account e i dati del corpo che hai inserito in «Impostazioni». Ogni numero è una stima: MuW non fornisce diete né consigli medici.

Questi dati non sono mai stati sul nostro server, quindi uscire dall'account o eliminarlo non li cancella: restano sul telefono finché non li togli lì o non disinstalli l'app.

**Deutsch**

Überschrift: Ernährung

«Ernährung» ist ein Tagebuch, das du für dich führst. Die Lebensmittel, die du hinzufügst, dein Wochenplan, was du für jeden Tag als gegessen einträgst, dein Tagesziel und die Kalorien, die du von Hand korrigierst, bleiben nur auf deinem Handy: Sie erreichen unseren Server nicht, und niemand sonst kann sie sehen. Die «Kalorienbilanz» in deinem Profil wird auf deinem Handy berechnet und nur dir angezeigt.

Um die Energie zu schätzen, die du verbrauchst, zählt MuW auf deinem Handy die Aktivitäten deines Kontos und die Körperdaten, die du in den «Einstellungen» eingegeben hast. Jede Zahl ist eine Schätzung: MuW gibt keine Diäten oder medizinischen Ratschläge.

Diese Daten waren nie auf unserem Server. Deshalb löscht weder das Abmelden noch das Löschen deines Kontos sie: Sie bleiben auf deinem Handy, bis du sie dort entfernst oder die App deinstallierst.

**Español**

Título: Nutrición

«Nutrición» es un diario que llevas para ti. Los alimentos que añades, tu plan de la semana, lo que escribes que comiste cada día, tu objetivo diario y las calorías que corriges a mano se guardan solo en tu teléfono: no llegan a nuestro servidor y nadie más puede verlos. El «Balance de calorías» de tu perfil se calcula en tu teléfono y solo lo ves tú.

Para estimar la energía que gastas, MuW cuenta en tu teléfono las actividades de tu cuenta y los datos del cuerpo que introdujiste en «Ajustes». Cada número es una estimación: MuW no ofrece dietas ni consejos médicos.

Estos datos nunca estuvieron en nuestro servidor, así que cerrar sesión o eliminar tu cuenta no los borra: se quedan en tu teléfono hasta que los quites allí o desinstales la app.

**Français**

Titre : Nutrition

«Nutrition» est un journal que tu tiens pour toi. Les aliments que tu ajoutes, ton plan de la semaine, ce que tu notes avoir mangé chaque jour, ton objectif du jour et les calories que tu corriges à la main restent uniquement sur ton téléphone : ils n'arrivent pas sur notre serveur et personne d'autre ne peut les voir. Le «Bilan calorique» de ton profil est calculé sur ton téléphone et n'est affiché qu'à toi.

Pour estimer l'énergie que tu dépenses, MuW compte sur ton téléphone les activités de ton compte et les données corporelles que tu as saisies dans les «Réglages». Chaque chiffre est une estimation : MuW ne fournit ni régimes ni conseils médicaux.

Ces données n'ont jamais été sur notre serveur : te déconnecter ou supprimer ton compte ne les efface donc pas. Elles restent sur ton téléphone jusqu'à ce que tu les retires là ou que tu désinstalles l'app.

#### 2 · Una riga in più in «Where your data is and for how long», nel punto «On your phone»

Dopo «…to suggest lakes and the sea near it; it is deleted when you log out.»
un punto nuovo:

| English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|
| On your phone only, also after you log out: what you write in «Nutrition». | Solo sul tuo telefono, anche dopo che esci dall'account: quello che scrivi in «Alimentazione». | Nur auf deinem Handy, auch nach dem Abmelden: was du in «Ernährung» einträgst. | Solo en tu teléfono, también después de cerrar sesión: lo que escribes en «Nutrición». | Uniquement sur ton téléphone, même après ta déconnexion : ce que tu écris dans «Nutrition». |

#### 3 · Con la parte C2 (build nativa): un capoverso in più in «Apple Health and Health Connect»

**English**

If you allow it, MuW also reads from Apple Health (on Android, from Health Connect) the workouts other apps recorded and your active energy of each day, to count the energy you use in «Nutrition». These numbers are read on your phone each time they are needed: MuW does not save them, they do not reach our server and they are never used for advertising. You can stop it at any time in the Health app or in Health Connect.

**Italiano**

Se lo permetti, MuW legge da Salute di Apple (su Android, da Health Connect) anche gli allenamenti registrati da altre app e la tua energia attiva di ogni giorno, per contare l'energia che consumi in «Alimentazione». Questi numeri sono letti sul telefono ogni volta che servono: MuW non li salva, non arrivano al nostro server e non sono mai usati per la pubblicità. Puoi fermare la lettura in ogni momento nell'app Salute o in Health Connect.

**Deutsch**

Wenn du es erlaubst, liest MuW aus Apple Health (auf Android aus Health Connect) auch die Trainings, die andere Apps aufgezeichnet haben, und deine Aktivitätsenergie jedes Tages, um in «Ernährung» die Energie zu zählen, die du verbrauchst. Diese Zahlen werden auf deinem Handy jedes Mal gelesen, wenn sie gebraucht werden: MuW speichert sie nicht, sie erreichen unseren Server nicht und sie werden nie für Werbung verwendet. Du kannst das jederzeit in der Health-App oder in Health Connect beenden.

**Español**

Si lo permites, MuW también lee de Salud de Apple (en Android, de Health Connect) los entrenamientos que registraron otras apps y tu energía activa de cada día, para contar la energía que gastas en «Nutrición». Estos números se leen en tu teléfono cada vez que hacen falta: MuW no los guarda, no llegan a nuestro servidor y nunca se usan para publicidad. Puedes detenerlo en cualquier momento en la app Salud o en Health Connect.

**Français**

Si tu l'autorises, MuW lit aussi dans Santé d'Apple (sur Android, dans Health Connect) les entraînements enregistrés par d'autres apps et ton énergie active de chaque jour, pour compter l'énergie que tu dépenses dans «Nutrition». Ces chiffres sont lus sur ton téléphone chaque fois qu'ils sont nécessaires : MuW ne les enregistre pas, ils n'arrivent pas sur notre serveur et ils ne servent jamais à la publicité. Tu peux arrêter cette lecture à tout moment dans l'app Santé ou dans Health Connect.

#### Negozi (da fare a mano nelle console, col sì dell'utente, quando esce la build)

- **App Store, etichette della privacy**: i dati di «Nutrition» e quelli
  letti da Salute restano sul telefono e non arrivano a MuW: per Apple non
  sono «raccolti», quindi le etichette non dovrebbero cambiare. Da
  ricontrollare sulla pagina di App Store Connect al momento della build.
- **App Store, revisione**: serve il testo del permesso di Salute già
  approvato (TASK-312), e la privacy deve dire che i dati di Salute non
  vanno alla pubblicità (pezzo 3).
- **Google Play, sicurezza dei dati**: come sopra, i dati lavorati solo sul
  telefono non sono «raccolti». Per leggere da Health Connect Play chiede
  una dichiarazione a parte, con il motivo per ogni tipo di dato
  (allenamenti, calorie attive) e una privacy che lo dice (pezzo 3). Va con
  la build Android di TASK-321 C.

### Testi della parte G (approvati dall'utente il 2026-11-23, «Sì, approvo»)

Mostrati con quattro schermate disegnate (la ricerca col tasto, il lettore,
il prodotto trovato, il prodotto che non c'è).

L'inglese è il testo dell'app.
Restano quelli che l'app ha già: «Add my own food», «Edit», «Cancel»,
«Try again», «Open Settings», «My food», «kcal / 100 g».

#### Nella scheda «Add food»

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Tasto sotto la ricerca; titolo del lettore | Scan a barcode | Leggi un codice a barre | Barcode scannen | Escanear un código de barras | Scanner un code-barres |
| Sotto l'inquadratura | Point the camera at the barcode on the pack. | Inquadra il codice a barre sulla confezione. | Richte die Kamera auf den Barcode auf der Packung. | Apunta la cámara al código de barras del envase. | Vise le code-barres sur l'emballage. |
| Sempre nel lettore, in piccolo | Only the barcode goes to Open Food Facts, to find the product. | A Open Food Facts va solo il codice a barre, per trovare il prodotto. | Nur der Barcode geht an Open Food Facts, um das Produkt zu finden. | A Open Food Facts solo va el código de barras, para encontrar el producto. | Seul le code-barres est envoyé à Open Food Facts, pour trouver le produit. |
| Collegamento per scriverlo a mano | Type the code | Scrivi il codice | Code eingeben | Escribir el código | Saisir le code |
| Campo | Barcode | Codice a barre | Barcode | Código de barras | Code-barres |
| Tasto | Look up | Cerca | Suchen | Buscar | Rechercher |
| Mentre cerca | Looking it up… | Lo cerco… | Suche läuft… | Buscando… | Recherche en cours… |

#### Il prodotto trovato

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Segno accanto al prodotto | from Open Food Facts | da Open Food Facts | von Open Food Facts | de Open Food Facts | d'Open Food Facts |
| Sotto i numeri | Check the numbers against the label: you can correct them. | Controlla i numeri sull'etichetta: puoi correggerli. | Vergleiche die Zahlen mit dem Etikett: Du kannst sie korrigieren. | Comprueba los números con la etiqueta: puedes corregirlos. | Vérifie les chiffres sur l'étiquette : tu peux les corriger. |
| Tasto | Use this food | Usa questo cibo | Dieses Lebensmittel verwenden | Usar este alimento | Utiliser cet aliment |

#### Quando non va

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Prodotto che non c'è | This product is not on Open Food Facts. | Questo prodotto non è su Open Food Facts. | Dieses Produkt ist nicht bei Open Food Facts. | Este producto no está en Open Food Facts. | Ce produit n'est pas sur Open Food Facts. |
| Prodotto senza calorie | Open Food Facts has no calories for this product. | Open Food Facts non ha le calorie di questo prodotto. | Open Food Facts hat keine Kalorien für dieses Produkt. | Open Food Facts no tiene las calorías de este producto. | Open Food Facts n'a pas les calories de ce produit. |
| Senza rete, o se Open Food Facts non risponde | The product could not be looked up. Check your connection and try again. | Non è stato possibile cercare il prodotto. Controlla la connessione e riprova. | Das Produkt konnte nicht gesucht werden. Prüfe deine Verbindung und versuche es erneut. | No se ha podido buscar el producto. Comprueba tu conexión e inténtalo de nuevo. | Impossible de rechercher le produit. Vérifie ta connexion et réessaie. |
| Fotocamera negata | MuW can't use the camera. Allow it in Settings, or type the code. | MuW non può usare la fotocamera. Permettilo in Impostazioni, o scrivi il codice. | MuW kann die Kamera nicht verwenden. Erlaube es in den Einstellungen oder gib den Code ein. | MuW no puede usar la cámara. Permítelo en Ajustes o escribe el código. | MuW ne peut pas utiliser l'appareil photo. Autorise-le dans les Réglages ou saisis le code. |

#### «How we calculate», un capoverso in più sotto «Food»

| English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|
| Products found by barcode contain data from Open Food Facts, available under the Open Database License. They are kept apart from the USDA list. | I prodotti trovati col codice a barre contengono dati di Open Food Facts, disponibili con la Open Database License. Restano separati dall'elenco USDA. | Per Barcode gefundene Produkte enthalten Daten von Open Food Facts, verfügbar unter der Open Database License. Sie bleiben von der USDA-Liste getrennt. | Los productos encontrados por código de barras contienen datos de Open Food Facts, disponibles bajo la Open Database License. Se mantienen separados de la lista del USDA. | Les produits trouvés par code-barres contiennent des données d'Open Food Facts, disponibles sous l'Open Database License. Ils restent séparés de la liste USDA. |

Con un collegamento a openfoodfacts.org, come chiede la loro licenza.

E la frase in fondo alla pagina cambia (sì dell'utente del 2026-11-23,
«Sì, cambiala»), perché il codice cercato esce dal telefono:

| | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Prima | Only you see this page. Nothing here leaves your phone. | Questa pagina la vedi solo tu. Niente di quello che c'è qui esce dal tuo telefono. | | | |
| Ora | Only you see this page. What you write here stays on your phone; a barcode you look up goes to Open Food Facts. | Questa pagina la vedi solo tu. Quello che scrivi qui resta sul tuo telefono; un codice a barre che cerchi va a Open Food Facts. | Diese Seite siehst nur du. Was du hier einträgst, bleibt auf deinem Handy; ein Barcode, den du suchst, geht an Open Food Facts. | Esta página solo la ves tú. Lo que escribes aquí se queda en tu teléfono; un código de barras que buscas va a Open Food Facts. | Toi seul vois cette page. Ce que tu écris ici reste sur ton téléphone ; un code-barres que tu recherches est envoyé à Open Food Facts. |

#### Il permesso della fotocamera (finestra del telefono; build nativa)

Oggi dice solo: «MuW uses the photo you take to trace the outline your
route will draw.», in inglese in ogni lingua. Il testo nuovo:

| English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|
| MuW uses the camera for the photo you trace a route from, and to read the barcode of a food. | MuW usa la fotocamera per la foto da cui ricalchi un percorso, e per leggere il codice a barre di un cibo. | MuW verwendet die Kamera für das Foto, aus dem du eine Route nachzeichnest, und um den Barcode eines Lebensmittels zu lesen. | MuW usa la cámara para la foto de la que calcas una ruta y para leer el código de barras de un alimento. | MuW utilise l'appareil photo pour la photo à partir de laquelle tu traces un parcours, et pour lire le code-barres d'un aliment. |

#### Privacy: una riga in più in «Others who receive data» (con questa parte)

| English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|
| Open Food Facts receives the barcode you scan or type in «Nutrition», to find the product: it sees the barcode and, like any site, your IP address, never your account or your diary. The product it sends back is kept on your phone. | Open Food Facts riceve il codice a barre che leggi o scrivi in «Alimentazione», per trovare il prodotto: vede il codice e, come ogni sito, il tuo indirizzo IP, mai il tuo account né il tuo diario. Il prodotto che rimanda resta sul tuo telefono. | Open Food Facts erhält den Barcode, den du in «Ernährung» scannst oder eingibst, um das Produkt zu finden: Es sieht den Barcode und, wie jede Website, deine IP-Adresse, nie dein Konto oder dein Tagebuch. Das zurückgesendete Produkt bleibt auf deinem Handy. | Open Food Facts recibe el código de barras que escaneas o escribes en «Nutrición», para encontrar el producto: ve el código y, como cualquier sitio, tu dirección IP, nunca tu cuenta ni tu diario. El producto que devuelve se guarda en tu teléfono. | Open Food Facts reçoit le code-barres que tu scannes ou saisis dans «Nutrition», pour trouver le produit : il voit le code et, comme tout site, ton adresse IP, jamais ton compte ni ton journal. Le produit renvoyé reste sur ton téléphone. |

#### Note (lette il 2026-11-23 sulle pagine di Open Food Facts e di Expo)

- Lettura di un prodotto senza account; chiedono un'intestazione
  `User-Agent` del tipo `NomeApp/Versione (indirizzo di contatto)` e non più
  di 15 letture al minuto per indirizzo IP: una lettura = un codice letto
  da una persona.
- Licenze: la base di dati ODbL 1.0, i contenuti DbCL 1.0, le foto CC BY-SA
  3.0 (MuW non mostra le foto). Chi riusa i dati deve nominare la licenza e
  Open Food Facts con un collegamento.
- `expo-camera`: componente `CameraView`, tipi `ean13`, `ean8`, `upc_a`,
  `upc_e`; il suo plugin scrive il testo del permesso e, se non lo si
  spegne, aggiunge su Android anche il permesso del microfono
  (`recordAudioAndroid`), che qui va spento.

### Testi della parte C2 (approvati dall'utente il 2026-11-23, «Sì, approvo»)

Mostrati con tre schermate disegnate di «Energy you use» (prima del sì, un
giorno contato da Salute, un giorno senza).

L'inglese è il testo dell'app.
Già approvati e non ripetuti qui: il testo del permesso di Salute (in
`TASK-312.md`, «Approvo» del 2026-11-23), il capoverso della privacy sulla
lettura da Salute (pezzo 3 della parte F), la frase di «How we calculate»
sui giorni che hanno l'energia attiva di Salute.

#### Nella scheda «Energy you use»

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Tasto, prima del sì | Use Apple Health | Usa Salute di Apple | Apple Health verwenden | Usar Salud de Apple | Utiliser Santé d'Apple |
| Sotto il tasto | MuW reads your active energy and the workouts other apps recorded, to count the energy you use. They are read on your phone and stay there. | MuW legge la tua energia attiva e gli allenamenti registrati da altre app, per contare l'energia che consumi. Sono letti sul telefono e restano lì. | MuW liest deine Aktivitätsenergie und die Trainings, die andere Apps aufgezeichnet haben, um die Energie zu zählen, die du verbrauchst. Sie werden auf deinem Handy gelesen und bleiben dort. | MuW lee tu energía activa y los entrenamientos que registraron otras apps, para contar la energía que gastas. Se leen en tu teléfono y se quedan ahí. | MuW lit ton énergie active et les entraînements enregistrés par d'autres apps, pour compter l'énergie que tu dépenses. Ils sont lus sur ton téléphone et y restent. |
| Riga, in un giorno che ha l'energia di Salute | Active energy | Energia attiva | Aktivitätsenergie | Energía activa | Énergie active |
| Segno sulla riga e sugli allenamenti delle altre app | from Apple Health | da Salute di Apple | von Apple Health | de Salud de Apple | de Santé d'Apple |
| Sotto le attività, in un giorno contato da Salute | Your activities are already inside Apple Health's active energy: they are not added again. | Le tue attività sono già dentro l'energia attiva di Salute di Apple: non si sommano di nuovo. | Deine Aktivitäten stecken schon in der Aktivitätsenergie von Apple Health: Sie werden nicht noch einmal addiert. | Tus actividades ya están dentro de la energía activa de Salud de Apple: no se suman otra vez. | Tes activités sont déjà comprises dans l'énergie active de Santé d'Apple : elles ne sont pas ajoutées une seconde fois. |
| Giorno senza energia in Salute, dopo il sì | Apple Health has nothing for this day: your activities are counted. | Salute di Apple non ha niente per questo giorno: si contano le tue attività. | Apple Health hat nichts für diesen Tag: Deine Aktivitäten werden gezählt. | Salud de Apple no tiene nada para este día: se cuentan tus actividades. | Santé d'Apple n'a rien pour ce jour : tes activités sont comptées. |
| Collegamento, dopo il sì | Stop using Apple Health | Non usare più Salute di Apple | Apple Health nicht mehr verwenden | Dejar de usar Salud de Apple | Ne plus utiliser Santé d'Apple |

#### Come conta (già deciso nella parte 0 e nei conti di A1)

- Un giorno che ha l'energia attiva di Salute usa **quella da sola**: le
  attività di MuW non si sommano sopra, perché Salute le ha già contate.
- Un giorno senza energia in Salute usa la somma delle attività: quelle di
  MuW e gli allenamenti delle altre app letti da Salute, ognuno una volta.
- Un numero corretto a mano vale sempre: in un giorno contato da Salute
  sposta il totale della differenza.
- Salute non dice se la lettura è stata negata: un permesso negato si legge
  come «nessun dato», e il giorno usa le attività.

### Testi delle parti D2, H e I (approvati dall'utente il 2026-11-24)

D2, «Sì approvo continua»:

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Sotto «Nutrition», nel profilo | Write what you eat and see your calorie balance. | Scrivi quello che mangi e guarda il tuo bilancio delle calorie. | Schreib auf, was du isst, und sieh deine Kalorienbilanz. | Escribe lo que comes y mira tu balance de calorías. | Note ce que tu manges et vois ton bilan calorique. |
| In fondo a «Calorie balance» | Open Nutrition | Apri Alimentazione | Ernährung öffnen | Abrir Nutrición | Ouvrir Nutrition |

H, «Sì, approvo»:

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Titolo della scheda | Protein, carbs and fat (est.) | Proteine, carboidrati e grassi (stima) | Eiweiß, Kohlenhydrate und Fett (gesch.) | Proteínas, carbohidratos y grasas (est.) | Protéines, glucides et lipides (est.) |
| Barra | Protein | Proteine | Eiweiß | Proteínas | Protéines |
| Barra | Carbs | Carboidrati | Kohlenhydrate | Carbohidratos | Glucides |
| Barra | Fat | Grassi | Fett | Grasas | Lipides |
| Accanto ai grammi | {percent}% of the energy | {percent}% dell'energia | {percent}% der Energie | {percent}% de la energía | {percent}% de l'énergie |
| Un cibo senza questi numeri | Counted only for the foods that have these numbers. | Contati solo per i cibi che hanno questi numeri. | Nur für Lebensmittel gezählt, die diese Zahlen haben. | Se cuentan solo para los alimentos que tienen estos números. | Comptés uniquement pour les aliments qui ont ces chiffres. |
| Giorno senza questi numeri | No protein, carbs or fat to count for this day. | Niente proteine, carboidrati o grassi da contare per questo giorno. | Für diesen Tag gibt es kein Eiweiß, keine Kohlenhydrate und kein Fett zu zählen. | No hay proteínas, carbohidratos ni grasas que contar para este día. | Pas de protéines, de glucides ni de lipides à compter pour ce jour. |

I, «Sì va bene» (letto come il sì a questa parte: era l'ultima domanda
davanti all'utente):

| Dove | English | Italiano | Deutsch | Español | Français |
|---|---|---|---|---|---|
| Titolo dell'invito | Count what you eat too | Conta anche quello che mangi | Zähl auch, was du isst | Cuenta también lo que comes | Compte aussi ce que tu manges |
| Sotto il titolo | Write your own diet and what you eat: MuW estimates the calories you eat and the ones you use, this activity included. | Scrivi la tua dieta e quello che mangi: MuW stima le calorie che mangi e quelle che consumi, compresa questa attività. | Schreib deinen eigenen Ernährungsplan auf und was du isst: MuW schätzt die Kalorien, die du isst und die du verbrauchst, diese Aktivität eingeschlossen. | Escribe tu propia dieta y lo que comes: MuW estima las calorías que comes y las que gastas, incluida esta actividad. | Écris ton propre plan alimentaire et ce que tu manges : MuW estime les calories que tu manges et celles que tu dépenses, cette activité comprise. |
| Per chi la usa già | This activity: {kcal} kcal (est.) | Questa attività: {kcal} kcal (stima) | Diese Aktivität: {kcal} kcal (gesch.) | Esta actividad: {kcal} kcal (est.) | Cette activité : {kcal} kcal (est.) |
| Tasto per chi la usa già | Add what you ate | Aggiungi cosa hai mangiato | Hinzufügen, was du gegessen hast | Añade lo que has comido | Ajoute ce que tu as mangé |

Approvata e **non usata**: «Counted in today's balance». Le schermate di
fine attività vengono prima di «Save»: lì la frase sarebbe falsa.

## Le parti

| Parte | Cosa | Dove va |
|---|---|---|
| 0 | Questo file, ADR-0397, le otto scelte | documenti |
| A1 | I conti, senza schermate: cibi dell'utente, piano, diario, calorie assunte, bilancio del giorno, i file sul telefono, `NUTRITION_ON` spento | app, solo file nuovi |
| A2 | La tabella di base da USDA (circa 300 cibi) con lo script che la costruisce e i nomi in cinque lingue | app e `tools/`, solo file nuovi |
| B | La pagina: tessera, avviso alla prima apertura, piano, diario, ricerca del cibo, cibi miei, «How we calculate» | app, spenta; testi e schermate all'utente |
| C1 | L'hub delle attività nel conto: ogni attività dell'hub con le sue calorie, per giorno | app, spenta |
| D | La tabella nel profilo, solo per il proprietario | app, spenta; schermate all'utente |
| F | Privacy: testi sul sito e nell'app, etichette dell'App Store e di Google Play, fonti e formule | testi e pubblicazione col sì dell'utente |
| C2 | La lettura da Salute (allenamenti delle altre app, energia attiva del giorno), testo del permesso, poi l'accensione | **build nativa**, tempi dal Coordinatore; Android con la build di TASK-321 C |
| G | Il codice a barre: il prodotto cercato su Open Food Facts (precisazione 9) | **build nativa** (`expo-camera`, dipendenza nuova col sì dell'utente); testi e privacy all'utente |
| E | Il server, per ritrovare i dati sul telefono nuovo | dopo l'uscita; migrazione, passo e sì dell'utente |

Tutte le parti prima di C2 entrano in `main` **spente** dietro
`NUTRITION_ON`: nessuna build pubblica mostra «Nutrition» prima della build
nativa (scelta 8). L'interruttore si accende solo dopo che l'utente ha
visto e approvato le schermate dal simulatore.

### A1 — I conti

Funzioni pure con test deterministici, in `apps/mobile/src/nutrition/`:

- **Un cibo**: chiave, nome, kcal per 100 g; proteine, carboidrati e grassi
  per 100 g quando ci sono. Un cibo dell'utente ha nome e kcal per 100 g
  obbligatori.
- **Il piano**: sette giorni della settimana, quattro pasti, ogni pasto una
  lista ordinata di (cibo, grammi); copiare un giorno su un altro.
- **Il diario**: un giorno di calendario del telefono (`AAAA-MM-GG`), gli
  stessi quattro pasti. «Eaten as planned» copia nel diario il piano di
  quel giorno della settimana **com'è in quel momento**: cambiare il piano
  dopo non cambia i giorni già segnati. Il pulsante c'è **solo finché il
  giorno è vuoto**: non scrive mai sopra quello che l'utente ha segnato a
  mano (scelta dell'utente, 2026-11-23). Un giorno senza nessuna voce è
  **vuoto**, non zero.
- **Assunte**: somma di kcal per 100 g × grammi / 100, arrotondata alla
  fine. Un cibo dell'utente cancellato resta nei giorni già segnati col
  valore che aveva.
- **Il bilancio del giorno** = assunte − (riposo + attività):
  - riposo: `restKcalPerMin` × 1440 col corpo dell'utente;
  - attività: **se il giorno ha l'energia attiva di Salute vale quella da
    sola**, e le attività di MuW non si sommano sopra; altrimenti la somma
    delle calorie delle attività dell'hub di quel giorno;
  - **nessuna attività contata due volte**: un allenamento letto da Salute
    che MuW stessa ha scritto (la sua origine o il suo identificativo di
    sincronizzazione) si scarta; uno di un'altra app che si sovrappone nel
    tempo a un'attività di MuW per più di metà della più corta è la stessa
    attività e conta una volta, quella di MuW;
  - un'attività conta nel giorno in cui è partita.
- **«My daily target»** (precisazione 11): un numero di kcal scritto
  dall'utente, facoltativo; «Left» = obiettivo − assunte. Nessuna funzione
  lo propone o lo calcola.
- **Le correzioni a mano** (precisazione 12): le kcal al giorno a riposo
  scritte dall'utente prendono il posto di `restKcalPerMin` × 1440; le
  kcal corrette di un'attività prendono il posto della sua stima. Con
  l'energia attiva di Salute: attività = energia di Salute + somma di
  (kcal corrette − kcal che l'attività contava prima). Togliere una
  correzione riporta la stima.
- **I file sul telefono**: cibi dell'utente, piano e diario in file JSON
  con `expo-file-system`, come `body/bodyProfile.ts`. I numeri letti da
  Salute non si salvano: si rileggono quando servono.

### A2 — La tabella di base

Circa 300 cibi comuni scelti a mano da USDA FoodData Central (CC0), con
l'identificativo FDC, kcal, proteine, carboidrati e grassi per 100 g. Uno
script in `tools/` la ricostruisce dallo scarico di USDA e dalla lista
degli identificativi scelti, così i numeri non si scrivono a mano; il
risultato è un file dell'app. I nomi in inglese vengono da USDA accorciati;
le traduzioni nelle altre quattro lingue le scrive MuW, in file suoi (non
in `i18n/*.ts`: sono 300 righe per lingua). Versione e data della tabella
si leggono in «How we calculate».

### B — La pagina

Tessera «Nutrition» nella famiglia nuova in fondo al pannello (un
componente a sé, montato con poche righe in `settings/SportButton.tsx`),
avviso alla prima apertura, piano della settimana, diario del giorno,
ricerca del cibo nella tabella e fra i cibi miei, «Add my own food»,
«Eaten as planned», la pagina «How we calculate» con fonti e formule.
Componenti di `src/ui/`, colori solo da `src/theme/tokens.ts`. Prima del
codice: il posto dell'ingresso confermato con TASK-490.

### C1 — L'hub delle attività nel conto

Le calorie di ogni attività dell'hub (`energy.ts`, `gymKcal.ts`,
`poolKcal.ts`) e le attività raggruppate per giorno del telefono; nella
lista privata ogni attività mostra le sue calorie stimate.

Com'è fatta (schermate e testi approvati dall'utente il 2026-11-23):

- In cima al diario «Used (est.)» = riposo + attività della lista privata
  partite quel giorno; «Balance» = assunte − consumate, col segno e la
  parola «Surplus» o «Deficit», «—» senza niente di mangiato scritto.
- **Oggi il riposo è contato fino a adesso** (scelta dell'utente), con la
  riga «Today the energy at rest is counted up to now.».
- Un tocco su «Used (est.)» apre **«Energy you use»**: la riga «At rest» e
  ogni attività con le sue calorie. Toccando il riposo o un'attività si
  scrive il proprio numero (precisazione 12): il campo parte vuoto, la
  stima di MuW resta in vista, «Back to the estimate» toglie il numero
  scritto. Segni: «(set by you)» sul riposo, «edited» su un'attività.
- Senza account, o se la lista non arriva, conta solo il riposo e la
  scheda lo dice. Mentre le attività del giorno sono in arrivo «Used
  (est.)» è «—».
- Nella lista privata («My activities») ogni attività chiude la riga dei
  numeri con le calorie che il bilancio conta, «(edited)» se corrette.
  Solo con `NUTRITION_ON` acceso.
- L'energia attiva di Salute non c'è ancora: arriva con C2.

### D — La tabella nel profilo

Per giorno: «Eaten», «Used», «Balance» con «Surplus» o «Deficit» e il
segno; il totale della settimana. Montata solo nel profilo di chi è entrato
(`profile/ProfileHome.tsx`, una riga); nessun campo dell'API, niente esce
dal telefono. I giorni senza diario restano vuoti.

Com'è fatta (schermate e testi approvati dall'utente il 2026-11-23): il
riquadro **«Calorie balance»** con «Only you see this», sotto il sonno; la
settimana da lunedì a domenica, le frecce verso le settimane prima;
«Week total» con «Surplus» o «Deficit». Scelte dell'utente: **oggi è «so
far» e non entra nel totale** finché il giorno non è finito; **un giorno
senza diario è «—»** in tutte le colonne e fuori dal totale; il riquadro
compare **solo dopo che l'avviso di «Nutrition» è stato letto**; surplus e
deficit nello stesso colore.

### F — Privacy

Testi della privacy sul sito e nell'app (`site/privacy/**`,
`about/content/*.ts`), etichette dell'App Store e dichiarazioni di Google
Play sui dati di salute, «How we calculate» con le fonti: USDA FoodData
Central, equazioni ACSM, Compendium of Physical Activities 2024,
Mifflin-St Jeor, energia attiva di Apple Salute. Testi e pubblicazione col
sì dell'utente, sul sito **non prima** dell'app che li porta.

Testi approvati dall'utente il 2026-11-23 («Sì, approvo»), in tre pezzi,
più sotto. Scelta dell'utente: **il diario è del telefono, non
dell'account**; uscire dall'account o eliminarlo non lo cancella, e la
privacy lo dice (scartata: cancellare tutto all'uscita). Quando entrano
(Coordinatore, 2026-11-23): i pezzi 1 e 2 nell'app **prima**
dell'accensione, perché la privacy online deve esserci già quando
`NUTRITION_ON` diventa `true`; il pezzo 3 con la C2, quando MuW comincia a
leggere da Salute. I file della privacy si toccano a turno: il
Coordinatore scrive «privacy tua».

### C2 — La lettura da Salute e l'accensione (build nativa)

- iPhone: leggere `HKWorkoutTypeIdentifier` e
  `HKQuantityTypeIdentifierActiveEnergyBurned` con la libreria già nelle
  build (`@kingstinct/react-native-healthkit`); il testo
  `NSHealthShareUsageDescription` di `app.json` e di `locales/*.json`
  deve nominare anche allenamenti ed energia attiva (oggi solo il battito;
  TASK-467 C aggiunge il sonno: **un testo solo per tutti**, approvato
  dall'utente). Serve una build nativa e la revisione di Apple.
- Android: i permessi di lettura di Health Connect nel manifest
  (allenamenti, calorie attive), con la build di TASK-321 C.
- Salute non dice se la lettura è stata negata: un giorno senza dati di
  Salute usa la somma delle attività.
- Gli allenamenti delle altre app entrano nella lista privata con le loro
  calorie; non diventano post e non contano per Play né per i concorsi.
- **Quale build e quando lo dice il Coordinatore**: non si promettono
  tempi all'utente prima.

Com'è fatta (schermate e testi approvati dall'utente il 2026-11-23), in
tre PR concordate col Coordinatore:

- **C2a**, niente di nativo, in `main` spenta: il lettore e il conto.
  - `health/energyReader.ts` è **il lettore unico degli allenamenti di
    Salute** (accordo con TASK-312 D): chiede in lettura solo
    `HKWorkoutTypeIdentifier` e l'energia attiva. **`workouts(da, a)` è il
    punto d'ingresso per TASK-312 D**: dà gli allenamenti partiti in un
    intervallo, di qualunque app, con tipo, inizio, fine, kcal, metri, app
    che li ha scritti e la chiave che MuW mette ai suoi (`HKSyncIdentifier`).
    Per le tracce, 312 D aggiunge il suo tipo alla richiesta.
  - `health/energyModules.ts`: `HEALTH_ENERGY_ON = false`. Finché è spento
    non c'è nessun lettore e la libreria non si carica mai (un test lo
    tiene fermo), come `sleepModules.ts`.
  - Il sì è «Use Apple Health» nella scheda «Energy you use», l'unico punto
    in cui il permesso si chiede; resta sul telefono
    (`nutrition-health.json`); «Stop using Apple Health» lo dimentica.
  - Un giorno che ha l'energia attiva di Salute usa quella da sola, e le
    attività restano in elenco senza sommarsi; un giorno senza usa la somma
    delle attività, comprese quelle delle altre app, «from Apple Health».
  - **Scelta dell'utente**: gli allenamenti delle altre app compaiono solo
    in «Energy you use», non in «My activities» (scartato «Anche in My
    activities»: portarli lì è l'importazione di TASK-312 D).
  - I numeri letti da Salute non si salvano: si rileggono quando una
    schermata li mostra.
- **C2b**, nativa, bozza fino al taglio della build: solo
  `HEALTH_ENERGY_ON = true`. Il testo unico del permesso in `app.json` e
  `locales/*.json` lo scrive #1334 (TASK-467 C) al taglio. Il capoverso di
  privacy sulla lettura da Salute (pezzo 3 della parte F) è una PR a sé, a
  turno, prima della build.
- **L'accensione**, ultima: `NUTRITION_ON = true` e
  `settings/SportButtonGrid.test.tsx` con la famiglia «Food», dopo che
  l'utente ha visto le schermate dal simulatore.
- Android resta sulla somma delle attività fino alla build con Health
  Connect (TASK-321 C).

### G — Il codice a barre (build nativa)

- Il lettore legge il codice di un prodotto confezionato e lo cerca su
  **Open Food Facts**; serve la rete. Il prodotto trovato diventa un cibo
  del telefono (nome, kcal per 100 g, il suo codice, la scritta «from Open
  Food Facts»), che l'utente può correggere dall'etichetta. Un prodotto
  non trovato o senza kcal si scrive a mano, come un cibo dell'utente.
- I prodotti di Open Food Facts restano **separati** dalla tabella USDA:
  MuW non pubblica una base di dati mescolata. L'attribuzione a Open Food
  Facts (ODbL) sta in «How we calculate» e accanto al prodotto.
- A Open Food Facts va **solo il codice letto**, senza account né altri
  dati dell'utente; lo dice la privacy (parte F).
- Dipendenza nativa nuova: `expo-camera` (sì dell'utente del 2026-11-23 a
  chiederla); il testo del permesso della fotocamera oggi parla solo della
  foto da ricalcare e va riscritto, con l'approvazione dell'utente. La
  lista dei file di `app.json` e `package.json` va al Coordinatore quando
  la build è decisa.

Com'è fatta (schermate e testi approvati dall'utente il 2026-11-23), in
due PR concordate col Coordinatore:

- **G1**, niente di nativo, in `main` spenta: nella ricerca dei cibi il
  collegamento **«Type the code»** (scelta dell'utente: il codice si può
  scrivere a mano, scartato «Senza codice a mano»). Prima di cercare la
  pagina dice «Only the barcode goes to Open Food Facts, to find the
  product.». Il prodotto trovato mostra nome, kcal per 100 g, il codice e
  «from Open Food Facts»; «Use this food» lo salva fra i cibi dell'utente
  col suo codice, «Edit» lo apre: riscritto, i numeri sono dell'utente e
  il segno sparisce. Un codice già salvato si ritrova sul telefono, senza
  un'altra richiesta. Prodotto assente o senza calorie: si scrive a mano,
  e il codice resta con lui. Senza rete: «Try again».
- **G2**, nativa, bozza fino al taglio: `expo-camera`, il lettore con
  «Scan a barcode», il testo nuovo del permesso della fotocamera.
  `npm install` solo col turno del Coordinatore.
- A Open Food Facts va il codice e, come a ogni sito, l'indirizzo IP;
  l'app si presenta con nome, versione e l'indirizzo di contatto che già
  pubblica nella privacy (scelta dell'utente).
- In fondo a «How we calculate» la frase approvata nella parte B cambia
  (sì dell'utente, «Sì, cambiala»): «Only you see this page. What you
  write here stays on your phone; a barcode you look up goes to Open Food
  Facts.».

### D2 — «Nutrition» dal profilo (richiesta del 2026-11-24)

«Anche dal profilo puoi trovare questa sezione». Chi non ha letto l'avviso
vede in `<OwnBalance />` una riga «Nutrition» che apre la pagina; chi la
usa ha «Open Nutrition» in fondo alla scheda. `NutritionWindow.tsx` è la
finestra della pagina, usata dalla tessera e dal profilo.
`profile/ProfileHome.tsx` non si tocca. PR #1547.

### H — La pagina del giorno animata (richiesta del 2026-11-24)

«Una cosa innovativa che attira l'attenzione, tabella di animazione del
cibo stile Apple, tutto più integrato». Nessuna dipendenza nuova (l'app
non ha una libreria di disegno): `Ring.tsx` disegna un anello con due
finestre e due mezzi anelli che girano, con le molle di `ui/motion`.

- `dayRings.ts`: la scala dei due anelli. `EnergyRings.tsx`: consumato
  fuori, mangiato dentro, la tacca dell'obiettivo dell'utente.
- `CountUp.tsx`: i numeri che contano; chi legge lo schermo sente sempre
  il valore finale.
- `intake.ts`: `macrosOf`, `macroShares`. `MacroBars.tsx`: le tre barre.
- `WeekStrip.tsx`: la settimana sotto il diario; `weekText.ts`: il nome
  della settimana, uscito da `OwnBalance.tsx`.
- `useDayEnergy.ts`: un parametro dice chi chiede le pagine mancanti (il
  giorno no, la settimana sì), altrimenti la stessa pagina partiva due
  volte.
- `MealCard.tsx`: i cibi in cascata, la figura del pasto. Un tocco leggero
  del telefono quando si aggiunge un cibo.

Prova al simulatore fatta il 2026-11-24 (iPhone 17, `NUTRITION_ON` acceso
solo in locale): anelli, numeri, barre e settimana si vedono bene, anche
con «Riduci movimento». Schermate in `out/TASK-489/shots/`.

**I colori (scelta dell'utente del 2026-11-26, davanti alle schermate:
«Voglio un colore», poi «A: rosso e verde» fra tre proposte)**: le
consumate in rosso, il colore che le calorie hanno già in tutta l'app
(`color.energy`); le mangiate in verde, un colore nuovo del tema,
`color.food`. Gli stessi due colori negli anelli del giorno, nelle
colonnine della settimana, negli anelli piccoli dell'invito (parte I) e
nell'esempio dell'ingresso (parte J); le barre di proteine, carboidrati e
grassi restano neutre. Il colore non è mai il solo segno: accanto a ogni
anello restano etichetta e numero, con un pallino del suo colore.

- `theme/tokens.ts`: `food`, solo aggiunte (file condiviso, concordato
  col Coordinatore). I toni li ha scelti l'agente su delega: scuro
  `#4FD08A` (fino a `#7BE3AA` al passo più chiaro), chiaro
  `#095428`–`#0F6B35`.
- `theme/foodContrast.test.ts` (nuovo): a ogni tono e a ogni passo, almeno
  4,5:1 su `background`, `surface` e `surfaceRaised`, e almeno 3:1 sul
  binario dell'anello (`border`), per il verde e per il rosso.
- `theme/palettes.test.ts`: una riga, `food` nella tavolozza attesa.

I colori veri non sono ancora stati visti nel simulatore.

### I — L'invito a fine attività (richiesta del 2026-11-24)

«Alla fine di una corsa invita la gente a usare la modalità nutrizione […]
con il tasto per entrare». `NutritionInvite.tsx`, una riga in
`activities/RunEnd.tsx` e una in `gym/GymEnd.tsx`. Le impostazioni tengono
quante volte l'invito è stato visto e il «Not now». A fine corsa le kcal
non si mostrano (quella schermata non le calcola); a fine allenamento sì.

### J — L'ingresso (richiesta del 2026-11-24; decisa, non scritta)

«Una home page dove ci sono delle regole e spiego come funziona, gli
obiettivi in breve, un'anteprima […] fare delle domande per avvicinare
l'utente». Quattro passi la prima volta: anteprima, regole, domande (perché
sei qui; hai già un numero; i dati del corpo), punto di partenza. Sul
numero l'utente ha scelto «MuW», poi «solamente una stima, solo una demo»
e «è meglio inserire le calorie manualmente»: vedi ADR-0397, precisazione
5, punto 4. Proposta in `out/TASK-489/PROPOSTA-PARTE-J-INGRESSO.md`.

Scritta in locale il 2026-11-24 (ramo `feat/TASK-489-j-welcome`, sopra la
parte I): schermate e testi nelle cinque lingue approvati dall'utente il
2026-11-24 (`out/TASK-489/TESTI-PARTE-J.md`), fonti della stima lette e
citate (`out/TASK-489/FONTI-PARTE-J.md`). La sua PR resta in bozza finché
la PR di privacy e termini non è in `main`.

**Privacy e termini della stima (testi approvati dall'utente il
2026-11-26, «Sì, approvo»; `out/TASK-489/TESTI-PRIVACY-TERMINI-PARTE-J.md`)**,
in una PR sua, nel turno privacy del Coordinatore:

1. privacy, «Nutrition», primo capoverso: resta sul telefono anche il
   motivo scelto in «What brings you here?»;
2. privacy, «Nutrition», secondo capoverso: se l'utente la chiede, MuW
   calcola sul telefono una stima dell'obiettivo di calorie, solo
   dimostrativa, mai mostrata sotto i 18 anni; «MuW is not made by health
   professionals»;
3. termini: sezione nuova «Nutrition» dopo «Safety» (diario e
   calcolatrice, non un servizio sanitario; stime solo informative; chi
   deve sentire prima il medico).

File: `apps/mobile/src/about/content/{en,it,de,es,fr}.ts`, i due test
delle date in `src/about/`, le cinque pagine `site/privacy/**` rigenerate
con `site/tools/make_privacy.mjs` (un test del sito le vuole uguali
all'app) e `site/tests/privacy.test.mjs`. Termini e privacy datati 26
novembre 2026. La copia del sito sul server resta un passo a parte, non
prima dell'app che porta la stima.

### K — Il peso (richiesta del 2026-11-24; decisa, non scritta)

«Dopo ogni tot settimane chiedi di pesare l'utente […] vedi anche il
grafico dei chili […] e poi pubblicare anche quell'attività», e «deve
essere un po' più completa»: post modificabile, foto, video, commenti,
grafico anche in percentuale, statistiche, congratulazioni alle tappe.
K1 = pesata, grafico, statistiche, obiettivo di peso scritto dall'utente
(tocca `body/`: dopo il merge di TASK-507 D). K2 = il post del peso
(compositore, Feed, server, migrazione, privacy). Vedi ADR-0397,
precisazione 5, punto 6. Proposta in
`out/TASK-489/PROPOSTA-PARTE-K-PESO.md`. Il Coordinatore valuta sessioni
dedicate per J e K.

### E — Il server

Solo dopo l'uscita, se l'utente lo conferma: una tabella sua, la
migrazione col primo numero libero al merge, il passo sul server col sì
dell'utente, i testi della privacy prima.

## File toccati

Parte 0: `docs/tasks/TASK-489.md` (nuovo), `docs/DECISIONS.md` (ADR-0397),
`docs/STATUS.md` (la voce del task), `docs/INDEX.md` (una riga).

Parte A1, solo file nuovi (lista mandata al Coordinatore il 2026-11-22;
parte col suo via):

```
apps/mobile/src/nutrition/nutritionOn.ts          (NUTRITION_ON = false)
apps/mobile/src/nutrition/localDay.ts             + localDay.test.ts
apps/mobile/src/nutrition/foods.ts                + foods.test.ts
apps/mobile/src/nutrition/ownFoods.ts             + ownFoods.test.ts
apps/mobile/src/nutrition/plan.ts                 + plan.test.ts
apps/mobile/src/nutrition/diary.ts                + diary.test.ts
apps/mobile/src/nutrition/intake.ts               + intake.test.ts
apps/mobile/src/nutrition/dayBalance.ts           + dayBalance.test.ts
apps/mobile/src/nutrition/nutritionStore.ts       + nutritionStore.test.ts
apps/mobile/src/nutrition/ownTarget.ts            + ownTarget.test.ts   (aggiunto il 2026-11-23: «My daily target»)
apps/mobile/src/nutrition/energyEdits.ts          + energyEdits.test.ts (aggiunto il 2026-11-23: riposo e attività corretti a mano)
docs/tasks/TASK-489.md                            (il registro)
```

Parte A2, solo file nuovi (lista approvata dal Coordinatore il 2026-11-23;
parte col sì dell'utente alla parte e allo scarico di USDA):
`tools/nutrition_table.py` (lo script, solo libreria standard),
`tools/test_nutrition_table.py`, `tools/nutrition_foods.csv` (i cibi
scelti: identificativo FDC e nome corto), `apps/mobile/src/nutrition/foodTable.ts`
(generato, con fonte, versione e data in testa) e `foodTable.test.ts`,
`apps/mobile/src/nutrition/foodNames.ts` e `foodNames.test.ts`,
`apps/mobile/src/nutrition/foodNames/{de,es,fr,it}.ts`. Lo scarico grezzo
di USDA resta in `out/TASK-489/` sul T9, fuori dal repository e dal
bundle; prima del «pronta» si misura il peso dei file che entrano nel
bundle (stima: sotto i 100 KB).

Parte B (lista approvata dal Coordinatore il 2026-11-23), in due PR.
File nuovi in `apps/mobile/src/nutrition/`, con i loro test:
`NutritionPage.tsx`, `NutritionNotice.tsx`, `DiaryView.tsx`,
`MealCard.tsx`, `AddFoodSheet.tsx`, `OwnFoodForm.tsx`, `TargetSheet.tsx`,
`NutritionTile.tsx`, `useNutrition.ts` (B1); `PlanView.tsx`,
`HowWeCalculate.tsx` (B2). File esistenti: `settings/SportButton.tsx`
(B1: poche righe dietro `NUTRITION_ON`), `i18n/{de,es,fr,it}.ts` (in ogni
PR solo le chiavi che usa), `docs/UI.md` (nella PR di documenti).

Parte C1 (lista approvata dal Coordinatore il 2026-11-23). Nuovi in
`apps/mobile/src/nutrition/`, coi test: `activityEnergy.ts`,
`useDayEnergy.ts`, `EnergySheet.tsx`, `EnergyEditForm.tsx`,
`useListKcal.ts`. Esistenti: `nutrition/DiaryView.tsx`,
`nutrition/useNutrition.ts`, `activities/ActivityRow.tsx` (un hook e poche
righe, dietro `NUTRITION_ON`), `i18n/{de,es,fr,it}.ts` (15 chiavi).

Parte D (lista approvata dal Coordinatore il 2026-11-23). Nuovi in
`apps/mobile/src/nutrition/`, coi test: `weekBalance.ts`, `OwnBalance.tsx`.
Esistenti: `nutrition/useDayEnergy.ts`, `profile/ProfileHome.tsx` (un
import e `<OwnBalance />` sotto `<OwnSleep />`), `i18n/{de,es,fr,it}.ts`
(7 chiavi).

Parte F (#1496): `apps/mobile/src/about/content/{en,it,de,es,fr}.ts` e
`site/privacy/**`, riscritte da `site/tools/make_privacy.mjs` nella stessa
PR: un test del sito vuole le pagine uguali al testo dell'app. Pubblicare
il sito resta un passo a parte, col sì dell'utente.

Parte G1 (lista approvata dal Coordinatore il 2026-11-23). Nuovi in
`apps/mobile/src/nutrition/`, coi test: `openFoodFacts.ts`,
`BarcodeStep.tsx`. Esistenti: `nutrition/foods.ts`, `ownFoods.ts`,
`OwnFoodForm.tsx`, `AddFoodSheet.tsx`, `HowWeCalculate.tsx`,
`i18n/{de,es,fr,it}.ts` (13 chiavi, una tolta).

Parte C2a (lista approvata dal Coordinatore il 2026-11-23). Nuovi coi
test: `health/energyReader.ts`, `health/energyModules.ts`,
`nutrition/healthEnergyChoice.ts`, `nutrition/useHealthEnergy.ts`.
Esistenti: `nutrition/activityEnergy.ts`, `useDayEnergy.ts`,
`EnergySheet.tsx`, `i18n/{de,es,fr,it}.ts` (7 chiavi).

Le parti dopo toccano anche file esistenti, da chiedere al Coordinatore
prima di ognuna: B `settings/SportButton.tsx` (montare la tessera),
`App.tsx` o la pagina che ospita «Nutrition» (a turno), `i18n/{de,es,fr,it}.ts`,
`docs/UI.md`; C1 la riga della lista privata (`activities/ActivityRow.tsx`);
D `profile/ProfileHome.tsx` (una riga); F `about/content/**`,
`site/privacy/**`; C2 `app.json`, `locales/*.json`,
`health/nativeConfig.test.ts` e file nuovi in `health/`.

## Fuori scope

- Diete, obiettivi di calorie o di peso, consigli: mai, nemmeno dall'AI.
- La ricerca per nome su Open Food Facts e una copia dei suoi dati
  dentro l'app: solo il codice a barre, un prodotto alla volta (parte G).
- Un obiettivo di calorie calcolato o proposto da MuW: «My daily target»
  lo scrive solo l'utente.
- Le tabelle CREA senza un permesso scritto.
- Proteine, carboidrati e grassi mostrati (una parte dopo: i dati ci sono).
- Condividere la tabella, il Feed, il profilo pubblico.
- Scrivere in Salute l'energia assunta (`DietaryEnergyConsumed`).
- Acqua, peso nel tempo, digiuno, ricette con più ingredienti.

## Criteri di accettazione

- [x] **0**: le otto scelte dell'utente qui e in ADR-0397; la lista dei
      file della parte A1 al Coordinatore.
- [ ] L'utente scrive il suo piano, segna una giornata e vede le calorie
      assunte.
- [ ] Il profilo mostra, solo a lui, la tabella dei giorni in «Surplus» o
      «Deficit», con le attività dell'hub privato nel conto e nessuna
      contata due volte.
- [ ] L'avviso «non forniamo diete» è approvato dall'utente e sempre
      raggiungibile.
- [ ] Test deterministici verdi per conti, piano, diario e tabella.
- [ ] `NUTRITION_ON` acceso solo con la build nativa che legge da Salute,
      dopo il sì dell'utente sulle schermate.
- [ ] ADR scritto, task file `Done`, «TASK-489 fatto» al Coordinatore.

## Registro

- **2026-11-26, sera**: #1563 (C2a) e #1619 (privacy e termini della
  parte J) in `main`. **Parte H = #1652**, armata dal Coordinatore col
  «Sì» dell'utente, ferma finché non escono il passo 25 e l'OTA 27.
  Rosso e verde visti nel simulatore (iPhone 17), tono scuro e chiaro:
  anelli, puntini e colonne della settimana, più «Calorie balance» nel
  profilo; nessun difetto (`out/TASK-489/shots/09`–`13`). Non visto
  l'invito a fine attività coi colori. La decisione sui colori è
  ADR-0397, precisazione 6; `docs/UI.md` descrive D2, H, I e J. I e J
  allineate in locale: la I si apre con H in `main`, poi la J.
- **2026-11-26**: l'utente sceglie i colori degli anelli («rosso e
  verde»): `color.food` in `theme/tokens.ts`, concordato col Coordinatore,
  dentro la parte H. Il «Sì, unisci» per C2a (#1563) dato dall'utente al
  Coordinatore; #1563 riallineata due volte a `main` (conflitto in coda
  alle tabelle dei testi dopo #1560). Testi di privacy e termini per la
  stima della parte J approvati dall'utente e aperti come #1619 (armata
  dal Coordinatore col «Sì, unisci» dell'utente). H, I e J allineate a
  `main` in locale, non spinte: H si apre quando #1563 è in `main`.
  G1 è #1552, D2 #1547, la stanza per la barra #1565 (TASK-469), tutte in
  `main`.
- **2026-11-24, richieste nuove dell'utente**: D2 (dal profilo), H (la
  pagina animata), I (l'invito a fine attività), J (l'ingresso con le
  domande), K (il peso), le storie di «Longevity» (TASK-513) e la modalità
  (TASK-514). D2 è #1547; H e I sono scritte su rami locali sopra C2a
  (`feat/TASK-489-h-animated-day`, `feat/TASK-489-i-invite`) e diventano
  PR dopo C2a; non sono state viste nel simulatore. Due paletti cambiati
  dall'utente dopo aver letto cosa comportano: l'obiettivo di calorie può
  proporlo MuW, come stima in secondo piano; i consigli generali entrano
  senza revisione di un professionista, da fonti ufficiali citate.
  ADR-0397 precisazione 5, ADR-0407, ADR-0408. Nota per C2: la frase del
  permesso di Salute scelta per la build nativa non nomina l'energia
  attiva, che chiede una build successiva.
- **2026-11-24, D in `main`** (#1517), dopo C1 (#1501) e la privacy
  (#1496) il 2026-11-23.
- **2026-11-23, parte C2a scritta**: l'utente ha detto «Sì, parti con la
  parte C2» e, viste le tre schermate e i sette testi, «Sì, approvo». Sul
  ramo `feat/TASK-489-c2a-health-energy`, sopra la G1; diventa una PR
  quando la G1 è in `main`. Il lettore è spento: la lettura vera da Salute
  non è stata provata, i test usano un Salute finto; `tsc` controlla il
  lettore contro i tipi della libreria. Decisi dall'agente su delega
  dell'utente: mentre Salute risponde «Used (est.)» è «—»; un Salute che
  non risponde è un giorno senza dati; un allenamento è di MuW se viene
  dal suo bundle o porta la chiave di un'attività della lista, e la stessa
  uscita registrata anche da un orologio conta una volta (la regola della
  sovrapposizione di A1); gli allenamenti delle altre app si correggono a
  mano come le attività; un allenamento di Salute si chiama come MuW
  chiama quello sport, «Workout» se non lo conosce.
- **2026-11-23, parte G1 scritta**: l'utente ha detto «Sì, parti con la
  parte G» e, viste le quattro schermate e i testi, «Sì, approvo»; poi
  «Sì, cambiala» per la frase in fondo a «How we calculate». Sul ramo
  `feat/TASK-489-g1-barcode-lookup`, sopra la D. Letto sulle pagine di
  Open Food Facts e provato con due prodotti e un codice inesistente il
  2026-11-23: `GET /api/v2/product/<codice>.json`, `status` 1 con
  `product` oppure 0; `nutriments["energy-kcal_100g"]` è un numero.
  Decisi dall'agente su delega dell'utente: si usa **solo il campo in
  kcal**, e un prodotto che ha solo i kilojoule è «senza calorie» (MuW
  non scrive un numero convertito); un prodotto senza nome prende la prima
  marca, o il codice; un codice è di 8, 12, 13 o 14 cifre; la richiesta
  scade dopo 10 secondi; l'ingresso di G1 è «Type the code», il tasto
  «Scan a barcode» arriva con G2.
- **2026-11-23, parte F in PR**: #1496, dopo «privacy tua» del
  Coordinatore; l'utente ha detto «Sì, unisci» al Coordinatore. Dentro
  anche la riga di Open Food Facts della parte G.
- **2026-11-23, B1 e B2 in `main`**: #1473 (`ccccd731`) e #1490
  (`454acaf8`); C1 = #1501. La PR di documenti #1488 è in `main`.
- **2026-11-23, parte F: testi della privacy approvati**: l'utente ha detto
  «Sì, parti con la parte F» e, visti i tre pezzi nelle cinque lingue, «Sì,
  approvo»: il diario resta del telefono e non si cancella all'uscita
  dall'account (scartato «Cancella all'uscita»). Nessun file toccato:
  l'app aspetta il turno dei file della privacy (dopo TASK-486 e TASK-385
  G3), il sito viene dopo l'app, il pezzo sulla lettura da Salute con la
  C2. Per i negozi, da ricontrollare nelle console quando esce la build:
  i dati che restano sul telefono non sono «raccolti», quindi etichette
  dell'App Store e sicurezza dei dati di Play non dovrebbero cambiare;
  leggere da Health Connect chiede a Play una dichiarazione a parte.
- **2026-11-23, parte D scritta**: l'utente ha detto «Sì, parti con la
  parte D» e, viste le due schermate e i sette testi, «Sì, approvo». Sul
  ramo `feat/TASK-489-d-profile-balance`, sopra la C1; diventa una PR
  quando la C1 è in `main`. Dietro `NUTRITION_ON` spento; non provata nel
  simulatore. Diverso dal disegno: «so far» è scritto dopo il giorno
  («Thu 26 · so far»), non in un'etichetta. Decisi dall'agente su delega
  dell'utente: il conto di più giorni sta in `useDayEnergy.ts`
  (`useDaysEnergy`), e le pagine della lista si chiedono fino a coprire il
  lunedì della settimana guardata; mentre arrivano non c'è totale; prima
  dell'avviso letto il riquadro non chiede niente alla lista; le
  intestazioni delle colonne non sono lette una per una dallo schermo
  parlante, perché ogni riga le dice.
- **2026-11-23, parte C1 scritta**: l'utente ha detto «Sì, parti con la
  parte C1» e, viste le cinque schermate e i testi, «Sì, approvo». Sul
  ramo `feat/TASK-489-c1-activity-energy`, sopra la B2; diventa una PR
  quando la B2 è in `main`. Dietro `NUTRITION_ON` spento; non provata nel
  simulatore. Diverso dal disegno, detto all'utente: il campo del numero
  parte vuoto; accanto a «Save» c'è «Cancel»; «Back to the estimate» solo
  dopo un numero scritto. Decisi dall'agente su delega dell'utente: la
  lista privata dice sport, metri e tempo, non il dislivello né le serie,
  quindi **la palestra si conta dal solo tempo** (pesi per tutta la
  durata) e **un'escursione senza la salita**; lo stretching col suo MET
  sul tempo; uno sport che l'app non conosce conta zero; la lista si legge
  con `useActivitiesDoor()` senza toccare `activities/`; per un giorno più
  vecchio delle pagine tenute si chiedono le pagine dopo, e **una pagina
  che non arriva non si richiede da sola** (quel giorno conta solo il
  riposo, e la scheda lo dice); una sola scheda a passi (elenco, riposo,
  attività) invece di schede una sopra l'altra; `useListKcal` non legge
  niente dal telefono con `NUTRITION_ON` spento.
- **2026-11-23, B1 in conflitto con `main`**: due volte la coda delle
  tabelle `i18n/` (altri task aggiungono righe in fondo): tenute entrambe
  le parti, prima quelle di `main`; testa di #1473 `dc179cd9`. La PR di
  documenti #1475 è in `main`.
- **2026-11-23, parte B scritta**: **B1** = #1473 (pagina «Nutrition»,
  avviso, diario, aggiunta del cibo, cibo mio, «My daily target», tessera;
  14 file nuovi in `apps/mobile/src/nutrition/`, 5 righe in
  `settings/SportButton.tsx`, 38 testi nelle quattro tabelle). **B2**
  (piano della settimana, «Copy this day to…», «Eaten as planned», «How we
  calculate»; 13 testi) è scritta sul ramo `feat/TASK-489-b2-week-plan` e
  diventa una PR quando B1 è in `main`. Tutto dietro `NUTRITION_ON`
  spento; non provata nel simulatore.
  **Scelta dell'utente** (2026-11-23, «Va bene così, «Eaten as planned»
  solo a giorno vuoto»): «Eaten as planned» si offre solo finché il giorno
  non ha niente di scritto.
  Diverso dalle schermate approvate, detto all'utente lo stesso giorno, e
  deciso dall'agente su delega dell'utente: i pulsanti non sono gialli (il
  giallo è del percorso); i numeri non hanno il separatore delle migliaia
  («1240»), come nel resto dell'app; in cima al diario «Today» e
  «Yesterday» senza data, la data per i giorni più vecchi; i giorni dopo
  oggi non si scrivono; i giorni del piano hanno i nomi corti che l'app ha
  già («Mon»); un cibo mio si corregge o si elimina con «Edit» dal passo
  dei grammi; la tessera apre la pagina sopra il pannello degli sport e
  chiudendola si torna lì, senza cambiare sport; in italiano «Aggiungi agli
  spuntini»; il testo approvato «Nothing written for this day.» non è
  usato (un pasto vuoto mostra «—»), quindi non è nelle tabelle.
  Tecnica: `nutrition/useNutrition.ts` è un solo deposito per tutte le
  viste, sopra `nutritionStore`; un mese del diario si legge dal telefono
  una volta. **Da fare all'accensione**: `settings/SportButtonGrid.test.tsx`
  elenca le famiglie del pannello e deve avere anche «Food».
- **2026-11-23, parte B: schermate e testi approvati**: l'utente ha detto
  «Sì, parti con la parte B» e, viste le sei schermate e i testi nelle
  cinque lingue, «Sì, approvo». Lista dei file approvata dal Coordinatore,
  in due PR di codice: **B1** (pagina, avviso, diario, aggiunta del cibo,
  cibo mio, «My daily target», tessera) e **B2** (piano della settimana,
  «Eaten as planned», «How we calculate»). «Used (est.)» e «Balance» in
  cima al diario restano vuoti fino a C1. Per TASK-490 D: la pagina è
  `NutritionPage` in `apps/mobile/src/nutrition/NutritionPage.tsx`, senza
  props obbligatorie; mostra da sé l'avviso alla prima apertura. La tessera
  resta nel pannello degli sport, in una famiglia «Food» in fondo.
  Il testo unico di `NSHealthShareUsageDescription` (467 C, 312 D, 489 C2)
  è stato approvato dall'utente alla sessione di TASK-312 («Approvo»,
  2026-11-23, in `TASK-312.md`): la frase sull'energia attiva aspetta se la
  build esce con «Nutrition» spenta; lo scrive in `app.json` e nelle
  traduzioni la prima PR della build nativa che arriva in `main`.
- **2026-11-23, A2 fatta**: #1460 in `main` (`1d5d530e`): 11 file nuovi.
  L'utente ha detto sì alla parte e allo scarico di
  `FoodData_Central_sr_legacy_food_csv_2018-04.zip` (5,8 MB, da
  fdc.nal.usda.gov, CC0 1.0), che resta in `out/TASK-489/` sul T9. 314
  cibi; `tools/nutrition_table.py` ricava kcal, proteine, carboidrati e
  grassi per 100 g dall'archivio (riconosciuto dal suo SHA-256) e scrive
  `nutrition/foodTable.ts`; `--check` dice se il file è aggiornato. I nomi
  nelle altre quattro lingue in `nutrition/foodNames/`. Peso nel bundle
  quando la parte B li importa: circa 56 KB. Decisi dall'agente su delega
  dell'utente: l'edizione SR Legacy (aprile 2018) invece di Foundation
  Foods, che ha poche centinaia di cibi quasi tutti crudi; la chiave di un
  cibo è `usda-<identificativo FDC>`; `tools/nutrition_foods.csv` porta
  anche la descrizione di USDA, e un identificativo che non le corrisponde
  ferma la tabella; fuori le voci che USDA ha solo di marca (kefir,
  bevanda sportiva) o non ha (prosciutto crudo, muesli, hot dog) e lo
  strutto (902 kcal per 100 g, sopra le 900 che l'app tiene); crudo e
  cotto sono cibi diversi.
- **2026-11-23, A1 fatta**: #1437 in `main` (`dd29df5b`): 21 file nuovi
  in `apps/mobile/src/nutrition/` (giorni del telefono, cibi e cibi
  dell'utente, piano, diario, assunte, «My daily target», correzioni a
  mano, bilancio del giorno, file sul telefono), 98 test; `NUTRITION_ON`
  spento e niente importa ancora la cartella. Decisi dall'agente su delega
  dell'utente: la settimana parte da lunedì; una porzione porta con sé il
  suo cibo (un giorno scritto non cambia se il cibo cambia dopo); le
  chiavi dei cibi dell'utente non si ridanno mai; il diario è un file al
  mese; due allenamenti di altre app sovrapposti per più di metà del più
  corto contano una volta, il primo.
  Accordi con le altre sessioni: TASK-490 monta la tab «Food» in TASK-490
  D (solo con `NUTRITION_ON` acceso) e libera `settings/SportButton.tsx`
  per la tessera dopo la sua #1424; il testo unico di
  `NSHealthShareUsageDescription` lo raccoglie la sessione di TASK-312 D
  (con 467 C) e lo porta all'utente: l'energia attiva vi è detta solo per
  il bilancio che vede il proprietario, e la frase aspetta se la build
  esce con «Nutrition» spenta; un solo lettore di Salute in `health/` per
  312 D e 489 C2, lo scrive chi arriva prima.
- **2026-11-23, precisazioni**: #1417 in `main` dal 2026-11-22; via del
  Coordinatore per A1 e «Nutrition» nella lista della prossima build
  nativa (nessuna data; il testo del permesso di Salute si scrive una
  volta sola con TASK-467 C). Tre differenze con le risposte date a
  TASK-490 chiarite con l'utente (9–11): codice a barre come parte G,
  macronutrienti dopo, «My daily target» scritto dall'utente. Richiesta
  nuova dell'utente (12): le kcal a riposo al giorno e le kcal di ogni
  allenamento si possono correggere a mano. Due file nuovi in più nella
  lista di A1 (`ownTarget`, `energyEdits`), detti al Coordinatore.
- **2026-11-22, parte 0**: numeri dal Coordinatore (fork 3); verificato in
  `main` che MuW non legge da Salute né allenamenti né energia attiva;
  licenze delle fonti dei cibi verificate; otto scelte dell'utente, una
  alla volta; ADR-0397; PR di soli documenti; lista dei file della parte
  A1 al Coordinatore. La parte A1 parte col suo via.

## Esito

*(si compila a fine task)*
