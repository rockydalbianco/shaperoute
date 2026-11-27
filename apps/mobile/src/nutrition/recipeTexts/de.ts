import type { RecipeTexts } from "../recipeTexts";

/**
 * The recipes of MuW in German (TASK-489 part L, ADR-0397): written by
 * MuW, under each recipe's id (recipes.ts). The steps never name the
 * grams: the user can change them.
 */
export const DE: RecipeTexts = {
  "porridge-banana-walnuts": {
    name: "Porridge mit Banane und Walnüssen",
    steps: [
      "Gib die Haferflocken und die Milch mit einer Prise Salz in einen kleinen Topf.",
      "Bring alles leicht zum Kochen und lass es bei niedriger Hitze unter Rühren köcheln, bis der Porridge cremig ist.",
      "Fülle ihn in eine Schale und gib die Banane in Scheiben, die grob gehackten Walnüsse und den Honig darauf.",
    ],
  },
  "greek-yogurt-berries-granola": {
    name: "Griechischer Joghurt mit Beeren und Granola",
    steps: [
      "Gib den Joghurt in eine Schale.",
      "Wasche die Beeren, tupfe sie trocken und verteile sie auf dem Joghurt.",
      "Gib das Granola erst zum Schluss dazu, damit es knusprig bleibt, und träufle etwas Honig darüber.",
    ],
  },
  "scrambled-eggs-wholemeal-toast": {
    name: "Rührei auf Vollkornbrot",
    steps: [
      "Verquirle die Eier in einer Schüssel mit einer Prise Salz.",
      "Lass die Butter in einer Pfanne bei niedriger Hitze schmelzen, gieße die Eier hinein und rühre langsam, bis sie cremig sind: Nimm sie vom Herd, bevor sie trocken werden.",
      "Toaste das Brot, gib das Rührei mit etwas frisch gemahlenem Pfeffer darauf und serviere es mit der Tomate in Scheiben.",
    ],
  },
  "pasta-tomato": {
    name: "Pasta mit Tomatensauce",
    steps: [
      "Erhitze das Öl mit dem angedrückten Knoblauch eine Minute lang bei niedriger Hitze in einer Pfanne.",
      "Gib die passierten Tomaten und eine Prise Salz dazu. Lass die Sauce etwa zehn Minuten leise köcheln.",
      "Koche inzwischen die Pasta in kochendem Salzwasser al dente und gieße sie ab; hebe etwas Kochwasser auf.",
      "Nimm den Knoblauch heraus, schwenke die Pasta mit einem Löffel Kochwasser in der Sauce und serviere sie mit dem Parmesan und ein paar Basilikumblättern.",
    ],
  },
  "rice-salad": {
    name: "Reissalat",
    steps: [
      "Koche den Reis in kochendem Salzwasser bissfest, gieße ihn ab und spüle ihn mit kaltem Wasser ab, damit er nicht weitergart.",
      "Lass den Thunfisch und den Mais abtropfen. Schneide das gekochte Ei in Spalten und die Oliven in Ringe.",
      "Mische alles in einer Schüssel mit den Erbsen, dem Öl und einer Prise Salz.",
      "Lass den Salat vor dem Servieren mindestens eine halbe Stunde im Kühlschrank ziehen.",
    ],
  },
  "chicken-rice-broccoli": {
    name: "Hähnchen mit Reis und Brokkoli",
    steps: [
      "Koche den Reis in kochendem Salzwasser und gieße ihn ab.",
      "Teile den Brokkoli in Röschen und gare ihn fünf bis sechs Minuten im Dampf oder in kochendem Wasser: Er soll grün und bissfest bleiben.",
      "Schneide das Hähnchen in Streifen, salze es und brate es mit der Hälfte des Öls bei starker Hitze in einer Pfanne, bis es außen goldbraun und innen durchgegart ist.",
      "Richte Reis, Brokkoli und Hähnchen auf dem Teller an. Gib das restliche Öl und den Zitronensaft darüber.",
    ],
  },
  "salmon-potatoes-green-beans": {
    name: "Lachs mit Kartoffeln und grünen Bohnen",
    steps: [
      "Schäle die Kartoffeln, schneide sie in Stücke und koche sie etwa fünfzehn Minuten in Salzwasser. Gib für die letzten sechs bis sieben Minuten die geputzten grünen Bohnen dazu.",
      "Salze inzwischen den Lachs und brate ihn in einer beschichteten Pfanne, zuerst auf der Hautseite, drei bis vier Minuten pro Seite.",
      "Gieße Kartoffeln und Bohnen ab und mische sie mit dem Öl.",
      "Serviere den Lachs mit dem Gemüse und dem Zitronensaft.",
    ],
  },
  "lentil-soup": {
    name: "Linsensuppe",
    steps: [
      "Hacke Zwiebel, Karotte und Sellerie fein und dünste sie fünf Minuten bei niedriger Hitze im Öl in einem Topf an.",
      "Gib die abgespülten Linsen (kleine müssen nicht eingeweicht werden), die passierten Tomaten und so viel Wasser dazu, dass alles zwei Finger hoch bedeckt ist.",
      "Lass die Suppe zugedeckt etwa fünfundzwanzig Minuten kochen, bis die Linsen weich sind. Gieße bei Bedarf heißes Wasser nach und salze erst am Ende.",
      "Serviere sie mit dem getoasteten Brot und, wenn du magst, mit Rosmarin oder Lorbeer.",
    ],
  },
  "courgette-frittata": {
    name: "Zucchini-Frittata",
    steps: [
      "Schneide die Zucchini in dünne Scheiben und die Zwiebel in feine Streifen. Brate beides acht bis zehn Minuten mit dem Öl in einer Pfanne, bis es weich ist, und salze es.",
      "Verquirle die Eier mit dem Parmesan, einer Prise Salz und Pfeffer.",
      "Gieße die Eier über die Zucchini, stelle die Hitze kleiner, lege den Deckel auf und lass alles fünf Minuten stocken.",
      "Wende die Frittata mithilfe eines Tellers und brate sie noch zwei bis drei Minuten.",
    ],
  },
  "couscous-chickpeas-vegetables": {
    name: "Couscous mit Kichererbsen und Gemüse",
    steps: [
      "Würfle Zucchini, Paprika und Karotte und brate sie etwa acht Minuten mit der Hälfte des Öls in einer Pfanne: Sie sollen knackig bleiben. Salze sie.",
      "Gib die abgetropften Kichererbsen dazu und erwärme sie zwei Minuten.",
      "Gieße die gleiche Menge kochendes Salzwasser (nach Volumen) über den Couscous, decke ihn ab und lass ihn fünf Minuten quellen. Lockere ihn dann mit einer Gabel und dem restlichen Öl auf.",
      "Mische Gemüse und Kichererbsen unter den Couscous. Minze oder Petersilie nach Geschmack.",
    ],
  },
  "caprese-bread": {
    name: "Caprese mit Brot",
    steps: [
      "Schneide Tomaten und Mozzarella in gleich dicke Scheiben.",
      "Lege sie abwechselnd auf einen Teller.",
      "Gib das Öl, eine Prise Salz und Basilikumblätter darüber.",
      "Serviere die Caprese mit dem Brot.",
    ],
  },
  "hummus-pita-carrots": {
    name: "Hummus mit Pitabrot und Karotten",
    steps: [
      "Püriere die abgetropften Kichererbsen mit dem Tahin, dem Zitronensaft, dem Knoblauch, einer Prise Salz und zwei bis drei Löffeln Wasser, bis die Creme glatt ist.",
      "Probiere und schmecke mit Salz und Zitrone ab.",
      "Fülle den Hummus in eine Schale und gib das Öl und, wenn du magst, Paprikapulver oder Kreuzkümmel darüber.",
      "Schneide die Karotten in Stifte und das Pitabrot in Ecken und serviere beides zum Hummus.",
    ],
  },
};
