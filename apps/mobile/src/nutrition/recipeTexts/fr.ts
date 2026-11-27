import type { RecipeTexts } from "../recipeTexts";

/**
 * The recipes of MuW in French (TASK-489 part L, ADR-0397): written by
 * MuW, under each recipe's id (recipes.ts). The steps never name the
 * grams: the user can change them.
 */
export const FR: RecipeTexts = {
  "porridge-banana-walnuts": {
    name: "Porridge à la banane et aux noix",
    steps: [
      "Mets les flocons d'avoine et le lait dans une petite casserole avec une pincée de sel.",
      "Porte à léger frémissement et fais cuire à feu doux, en remuant, jusqu'à ce que le porridge soit crémeux.",
      "Verse dans un bol et ajoute la banane en rondelles, les noix concassées et le miel.",
    ],
  },
  "greek-yogurt-berries-granola": {
    name: "Yaourt grec aux fruits rouges et granola",
    steps: [
      "Mets le yaourt dans un bol.",
      "Lave et sèche les fruits rouges, puis dispose-les sur le yaourt.",
      "Ajoute le granola au dernier moment, pour qu'il reste croquant, et termine par un filet de miel.",
    ],
  },
  "scrambled-eggs-wholemeal-toast": {
    name: "Œufs brouillés sur pain complet",
    steps: [
      "Bats les œufs dans un bol avec une pincée de sel.",
      "Fais fondre le beurre dans une poêle à feu doux, verse les œufs et remue doucement jusqu'à ce qu'ils soient crémeux : retire-les du feu avant qu'ils ne sèchent.",
      "Fais griller le pain, dépose les œufs dessus avec un tour de moulin à poivre et sers avec la tomate en tranches.",
    ],
  },
  "pasta-tomato": {
    name: "Pâtes à la sauce tomate",
    steps: [
      "Fais chauffer l'huile dans une poêle avec l'ail écrasé, à feu doux, pendant une minute.",
      "Ajoute le coulis de tomate et une pincée de sel. Laisse mijoter une dizaine de minutes.",
      "Pendant ce temps, fais cuire les pâtes dans de l'eau bouillante salée et égoutte-les al dente, en gardant un peu d'eau de cuisson.",
      "Retire l'ail, fais sauter les pâtes dans la sauce avec une cuillerée de leur eau et sers avec le parmesan et quelques feuilles de basilic.",
    ],
  },
  "rice-salad": {
    name: "Salade de riz",
    steps: [
      "Fais cuire le riz dans de l'eau bouillante salée, égoutte-le al dente et passe-le sous l'eau froide pour arrêter la cuisson.",
      "Égoutte le thon et le maïs. Coupe l'œuf dur en quartiers et les olives en rondelles.",
      "Mélange le tout dans un saladier avec les petits pois, l'huile et une pincée de sel.",
      "Laisse reposer au réfrigérateur au moins une demi-heure avant de servir.",
    ],
  },
  "chicken-rice-broccoli": {
    name: "Poulet, riz et brocoli",
    steps: [
      "Fais cuire le riz dans de l'eau bouillante salée et égoutte-le.",
      "Sépare le brocoli en fleurettes et fais-les cuire à la vapeur ou à l'eau bouillante cinq à six minutes : elles doivent rester vertes et fermes.",
      "Coupe le poulet en lanières, sale-le et fais-le cuire à la poêle avec la moitié de l'huile, à feu vif, jusqu'à ce qu'il soit doré et cuit à cœur.",
      "Dresse l'assiette avec le riz, le brocoli et le poulet. Assaisonne avec le reste de l'huile et le jus de citron.",
    ],
  },
  "salmon-potatoes-green-beans": {
    name: "Saumon, pommes de terre et haricots verts",
    steps: [
      "Épluche les pommes de terre, coupe-les en morceaux et fais-les cuire dans de l'eau salée environ quinze minutes. Pour les six ou sept dernières minutes, ajoute les haricots verts équeutés.",
      "Pendant ce temps, sale le saumon et fais-le cuire dans une poêle antiadhésive, d'abord côté peau, trois à quatre minutes par face.",
      "Égoutte les pommes de terre et les haricots verts et assaisonne-les avec l'huile.",
      "Sers le saumon avec les légumes et le jus de citron.",
    ],
  },
  "lentil-soup": {
    name: "Soupe de lentilles",
    steps: [
      "Hache l'oignon, la carotte et le céleri et fais-les revenir dans l'huile dans une casserole, à feu doux, pendant cinq minutes.",
      "Ajoute les lentilles rincées (les petites n'ont pas besoin de trempage), le coulis de tomate et de l'eau jusqu'à les recouvrir de deux doigts.",
      "Fais cuire à couvert environ vingt-cinq minutes, jusqu'à ce que les lentilles soient tendres. Ajoute de l'eau chaude si besoin et sale seulement à la fin.",
      "Sers avec le pain grillé et, si tu aimes, du romarin ou du laurier.",
    ],
  },
  "courgette-frittata": {
    name: "Frittata aux courgettes",
    steps: [
      "Coupe les courgettes en fines rondelles et l'oignon en lamelles. Fais-les cuire à la poêle avec l'huile huit à dix minutes, jusqu'à ce qu'ils soient tendres, puis sale.",
      "Bats les œufs avec le parmesan, une pincée de sel et du poivre.",
      "Verse les œufs sur les courgettes, baisse le feu, couvre et laisse cuire cinq minutes.",
      "Retourne la frittata à l'aide d'une assiette et poursuis la cuisson deux à trois minutes.",
    ],
  },
  "couscous-chickpeas-vegetables": {
    name: "Couscous aux pois chiches et aux légumes",
    steps: [
      "Coupe les courgettes, le poivron et la carotte en dés et fais-les sauter à la poêle avec la moitié de l'huile pendant environ huit minutes : ils doivent rester croquants. Sale.",
      "Ajoute les pois chiches égouttés et réchauffe deux minutes.",
      "Verse sur la semoule le même volume d'eau bouillante salée, couvre et laisse gonfler cinq minutes. Égrène-la ensuite à la fourchette avec le reste de l'huile.",
      "Mélange les légumes et les pois chiches à la semoule. Menthe ou persil à volonté.",
    ],
  },
  "caprese-bread": {
    name: "Caprese et pain",
    steps: [
      "Coupe les tomates et la mozzarella en tranches de même épaisseur.",
      "Alterne-les sur une assiette.",
      "Assaisonne avec l'huile, une pincée de sel et des feuilles de basilic.",
      "Sers avec le pain.",
    ],
  },
  "hummus-pita-carrots": {
    name: "Houmous, pain pita et carottes",
    steps: [
      "Mixe les pois chiches égouttés avec le tahin, le jus de citron, l'ail, une pincée de sel et deux ou trois cuillerées d'eau, jusqu'à obtenir une crème lisse.",
      "Goûte et rectifie le sel et le citron.",
      "Verse dans un bol et termine avec l'huile et, si tu aimes, du paprika ou du cumin.",
      "Coupe les carottes en bâtonnets et la pita en triangles, et sers-les avec le houmous.",
    ],
  },
};
