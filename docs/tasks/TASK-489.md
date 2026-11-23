# TASK-489 — «Alimentazione»: il diario di quello che mangio e il bilancio delle calorie

**Stato**: In corso (parte 0 chiusa il 2026-11-22: otto scelte dell'utente, #1417 in `main`; quattro precisazioni il 2026-11-23; **A1 e A2 in `main`** (#1437, #1460, 2026-11-23); schermate e testi della parte B approvati il 2026-11-23; poi B1, B2, C1, D, F, C2, G)
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

### D — La tabella nel profilo

Per giorno: «Eaten», «Used», «Balance» con «Surplus» o «Deficit» e il
segno; il totale della settimana. Montata solo nel profilo di chi è entrato
(`profile/ProfileHome.tsx`, una riga); nessun campo dell'API, niente esce
dal telefono. I giorni senza diario restano vuoti. *Proposta dell'agente,
da vedere con le schermate*: oggi è «so far» (il riposo contato fino a
adesso) e non entra nel totale della settimana finché il giorno non è
finito.

### F — Privacy

Testi della privacy sul sito e nell'app (`site/privacy/**`,
`about/content/*.ts`), etichette dell'App Store e dichiarazioni di Google
Play sui dati di salute, «How we calculate» con le fonti: USDA FoodData
Central, equazioni ACSM, Compendium of Physical Activities 2024,
Mifflin-St Jeor, energia attiva di Apple Salute. Testi e pubblicazione col
sì dell'utente, sul sito **non prima** dell'app che li porta.

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
