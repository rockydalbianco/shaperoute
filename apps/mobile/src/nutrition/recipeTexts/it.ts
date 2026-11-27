import type { RecipeTexts } from "../recipeTexts";

/**
 * The recipes of MuW in Italian (TASK-489 part L, ADR-0397): written by
 * MuW, under each recipe's id (recipes.ts). The steps never name the
 * grams: the user can change them.
 */
export const IT: RecipeTexts = {
  "porridge-banana-walnuts": {
    name: "Porridge con banana e noci",
    steps: [
      "Versa i fiocchi d'avena e il latte in un pentolino, con un pizzico di sale.",
      "Porta a un bollore leggero e cuoci a fuoco basso, mescolando, finché il porridge diventa cremoso.",
      "Versa in una ciotola e aggiungi la banana a rondelle, le noci spezzettate e il miele.",
    ],
  },
  "greek-yogurt-berries-granola": {
    name: "Yogurt greco con frutti di bosco e granola",
    steps: [
      "Metti lo yogurt in una ciotola.",
      "Lava e asciuga i frutti di bosco e disponili sopra lo yogurt.",
      "Aggiungi la granola all'ultimo momento, così resta croccante, e finisci con un filo di miele.",
    ],
  },
  "scrambled-eggs-wholemeal-toast": {
    name: "Uova strapazzate su pane integrale",
    steps: [
      "Sbatti le uova in una ciotola con un pizzico di sale.",
      "Sciogli il burro in una padella a fuoco basso, versa le uova e mescola piano finché sono cremose: toglile dal fuoco prima che si asciughino.",
      "Tosta il pane, mettici sopra le uova con una macinata di pepe e servi con il pomodoro a fette.",
    ],
  },
  "pasta-tomato": {
    name: "Pasta al pomodoro",
    steps: [
      "Scalda l'olio in una padella con l'aglio schiacciato, a fuoco basso, per un minuto.",
      "Aggiungi la passata e un pizzico di sale. Lascia sobbollire una decina di minuti.",
      "Intanto cuoci la pasta in acqua bollente salata e scolala al dente, tenendo da parte un po' d'acqua di cottura.",
      "Togli l'aglio, salta la pasta nel sugo con un cucchiaio della sua acqua e servi con il parmigiano e qualche foglia di basilico.",
    ],
  },
  "rice-salad": {
    name: "Insalata di riso",
    steps: [
      "Cuoci il riso in acqua bollente salata, scolalo al dente e passalo sotto l'acqua fredda per fermare la cottura.",
      "Scola il tonno e il mais. Taglia l'uovo sodo a spicchi e le olive a rondelle.",
      "Mescola tutto in una ciotola con i piselli, l'olio e un pizzico di sale.",
      "Lascia riposare in frigorifero almeno mezz'ora prima di servire.",
    ],
  },
  "chicken-rice-broccoli": {
    name: "Pollo con riso e broccoli",
    steps: [
      "Cuoci il riso in acqua bollente salata e scolalo.",
      "Dividi i broccoli in cimette e cuocili a vapore o in acqua bollente per cinque o sei minuti: devono restare verdi e sodi.",
      "Taglia il pollo a strisce, salalo e cuocilo in padella con metà dell'olio, a fuoco vivace, finché è dorato fuori e cotto all'interno.",
      "Componi il piatto con riso, broccoli e pollo. Condisci con il resto dell'olio e il succo di limone.",
    ],
  },
  "salmon-potatoes-green-beans": {
    name: "Salmone con patate e fagiolini",
    steps: [
      "Sbuccia le patate, tagliale a pezzi e lessale in acqua salata per circa quindici minuti. Negli ultimi sei o sette minuti aggiungi i fagiolini spuntati.",
      "Intanto sala il salmone e cuocilo in una padella antiaderente, prima dal lato della pelle, tre o quattro minuti per lato.",
      "Scola patate e fagiolini e condiscili con l'olio.",
      "Servi il salmone con le verdure e il succo di limone.",
    ],
  },
  "lentil-soup": {
    name: "Zuppa di lenticchie",
    steps: [
      "Trita cipolla, carota e sedano e falli appassire nell'olio in una pentola, a fuoco basso, per cinque minuti.",
      "Aggiungi le lenticchie sciacquate (quelle piccole non hanno bisogno di ammollo), la passata e acqua fino a coprirle di due dita.",
      "Cuoci con il coperchio per circa venticinque minuti, finché le lenticchie sono tenere. Aggiungi acqua calda se serve e sala solo alla fine.",
      "Servi con il pane tostato e, se ti piace, rosmarino o alloro.",
    ],
  },
  "courgette-frittata": {
    name: "Frittata di zucchine",
    steps: [
      "Taglia le zucchine a rondelle sottili e la cipolla a fettine. Cuocile in padella con l'olio per otto o dieci minuti, finché sono morbide, e sala.",
      "Sbatti le uova con il parmigiano, un pizzico di sale e pepe.",
      "Versa le uova sulle zucchine, abbassa il fuoco, copri e cuoci cinque minuti.",
      "Gira la frittata aiutandoti con un piatto e cuoci altri due o tre minuti.",
    ],
  },
  "couscous-chickpeas-vegetables": {
    name: "Cuscus con ceci e verdure",
    steps: [
      "Taglia zucchine, peperone e carota a dadini e saltali in padella con metà dell'olio per circa otto minuti: devono restare croccanti. Sala.",
      "Aggiungi i ceci scolati e scalda per due minuti.",
      "Versa sul cuscus lo stesso volume di acqua bollente salata, copri e lascia gonfiare cinque minuti. Poi sgranalo con una forchetta e il resto dell'olio.",
      "Unisci verdure e ceci al cuscus. Menta o prezzemolo a piacere.",
    ],
  },
  "caprese-bread": {
    name: "Caprese con pane",
    steps: [
      "Taglia i pomodori e la mozzarella a fette dello stesso spessore.",
      "Alternale su un piatto.",
      "Condisci con l'olio, un pizzico di sale e foglie di basilico.",
      "Servi con il pane.",
    ],
  },
  "hummus-pita-carrots": {
    name: "Hummus con pane pita e carote",
    steps: [
      "Frulla i ceci scolati con la tahina, il succo di limone, l'aglio, un pizzico di sale e due o tre cucchiai d'acqua, finché la crema è liscia.",
      "Assaggia e regola di sale e limone.",
      "Versa in una ciotola e completa con l'olio e, se ti piace, paprika o cumino.",
      "Taglia le carote a bastoncini e la pita a spicchi, e servili con l'hummus.",
    ],
  },
};
