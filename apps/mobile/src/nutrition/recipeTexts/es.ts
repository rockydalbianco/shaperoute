import type { RecipeTexts } from "../recipeTexts";

/**
 * The recipes of MuW in Spanish (TASK-489 part L, ADR-0397): written by
 * MuW, under each recipe's id (recipes.ts). The steps never name the
 * grams: the user can change them.
 */
export const ES: RecipeTexts = {
  "porridge-banana-walnuts": {
    name: "Porridge con plátano y nueces",
    steps: [
      "Pon los copos de avena y la leche en un cazo con una pizca de sal.",
      "Lleva a un hervor suave y cuece a fuego bajo, removiendo, hasta que el porridge esté cremoso.",
      "Viértelo en un cuenco y añade el plátano en rodajas, las nueces troceadas y la miel.",
    ],
  },
  "greek-yogurt-berries-granola": {
    name: "Yogur griego con frutos rojos y granola",
    steps: [
      "Pon el yogur en un cuenco.",
      "Lava y seca los frutos rojos y repártelos sobre el yogur.",
      "Añade la granola en el último momento, para que siga crujiente, y termina con un hilo de miel.",
    ],
  },
  "scrambled-eggs-wholemeal-toast": {
    name: "Huevos revueltos sobre pan integral",
    steps: [
      "Bate los huevos en un cuenco con una pizca de sal.",
      "Derrite la mantequilla en una sartén a fuego bajo, vierte los huevos y remueve despacio hasta que estén cremosos: retíralos del fuego antes de que se sequen.",
      "Tuesta el pan, pon encima los huevos con un poco de pimienta recién molida y sirve con el tomate en rodajas.",
    ],
  },
  "pasta-tomato": {
    name: "Pasta con tomate",
    steps: [
      "Calienta el aceite en una sartén con el ajo aplastado, a fuego bajo, durante un minuto.",
      "Añade el tomate triturado y una pizca de sal. Deja que hierva suavemente unos diez minutos.",
      "Mientras tanto, cuece la pasta en agua hirviendo con sal y escúrrela al dente, guardando un poco del agua de cocción.",
      "Retira el ajo, saltea la pasta en la salsa con una cucharada de su agua y sirve con el parmesano y unas hojas de albahaca.",
    ],
  },
  "rice-salad": {
    name: "Ensalada de arroz",
    steps: [
      "Cuece el arroz en agua hirviendo con sal, escúrrelo al dente y pásalo por agua fría para cortar la cocción.",
      "Escurre el atún y el maíz. Corta el huevo duro en gajos y las aceitunas en rodajas.",
      "Mézclalo todo en un cuenco con los guisantes, el aceite y una pizca de sal.",
      "Déjala reposar en la nevera al menos media hora antes de servir.",
    ],
  },
  "chicken-rice-broccoli": {
    name: "Pollo con arroz y brócoli",
    steps: [
      "Cuece el arroz en agua hirviendo con sal y escúrrelo.",
      "Separa el brócoli en ramilletes y cuécelo al vapor o en agua hirviendo cinco o seis minutos: debe quedar verde y firme.",
      "Corta el pollo en tiras, sálalo y cocínalo en una sartén con la mitad del aceite, a fuego vivo, hasta que esté dorado por fuera y hecho por dentro.",
      "Monta el plato con el arroz, el brócoli y el pollo. Aliña con el resto del aceite y el zumo de limón.",
    ],
  },
  "salmon-potatoes-green-beans": {
    name: "Salmón con patatas y judías verdes",
    steps: [
      "Pela las patatas, córtalas en trozos y cuécelas en agua con sal unos quince minutos. En los últimos seis o siete minutos añade las judías verdes sin las puntas.",
      "Mientras tanto, sala el salmón y cocínalo en una sartén antiadherente, primero por el lado de la piel, tres o cuatro minutos por cada lado.",
      "Escurre las patatas y las judías verdes y alíñalas con el aceite.",
      "Sirve el salmón con las verduras y el zumo de limón.",
    ],
  },
  "lentil-soup": {
    name: "Sopa de lentejas",
    steps: [
      "Pica la cebolla, la zanahoria y el apio y póchalos en el aceite en una olla, a fuego bajo, durante cinco minutos.",
      "Añade las lentejas lavadas (las pequeñas no necesitan remojo), el tomate triturado y agua hasta cubrirlas dos dedos.",
      "Cuece con la tapa puesta unos veinticinco minutos, hasta que las lentejas estén tiernas. Añade agua caliente si hace falta y sala solo al final.",
      "Sirve con el pan tostado y, si te gusta, romero o laurel.",
    ],
  },
  "courgette-frittata": {
    name: "Frittata de calabacín",
    steps: [
      "Corta los calabacines en rodajas finas y la cebolla en tiras. Cocínalos en una sartén con el aceite de ocho a diez minutos, hasta que estén tiernos, y sálalos.",
      "Bate los huevos con el parmesano, una pizca de sal y pimienta.",
      "Vierte los huevos sobre los calabacines, baja el fuego, tapa y cocina cinco minutos.",
      "Da la vuelta a la frittata con ayuda de un plato y cocínala dos o tres minutos más.",
    ],
  },
  "couscous-chickpeas-vegetables": {
    name: "Cuscús con garbanzos y verduras",
    steps: [
      "Corta en dados los calabacines, el pimiento y la zanahoria y saltéalos en una sartén con la mitad del aceite unos ocho minutos: deben quedar crujientes. Sálalos.",
      "Añade los garbanzos escurridos y calienta dos minutos.",
      "Vierte sobre el cuscús el mismo volumen de agua hirviendo con sal, tapa y deja que se hinche cinco minutos. Después suéltalo con un tenedor y el resto del aceite.",
      "Mezcla las verduras y los garbanzos con el cuscús. Menta o perejil al gusto.",
    ],
  },
  "caprese-bread": {
    name: "Caprese con pan",
    steps: [
      "Corta los tomates y la mozzarella en rodajas del mismo grosor.",
      "Altérnalas en un plato.",
      "Aliña con el aceite, una pizca de sal y hojas de albahaca.",
      "Sirve con el pan.",
    ],
  },
  "hummus-pita-carrots": {
    name: "Hummus con pan de pita y zanahorias",
    steps: [
      "Tritura los garbanzos escurridos con el tahini, el zumo de limón, el ajo, una pizca de sal y dos o tres cucharadas de agua, hasta que la crema quede fina.",
      "Prueba y rectifica de sal y limón.",
      "Viértelo en un cuenco y termina con el aceite y, si te gusta, pimentón o comino.",
      "Corta las zanahorias en bastones y la pita en triángulos, y sírvelas con el hummus.",
    ],
  },
};
