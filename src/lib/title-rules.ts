// Metodología de construcción de títulos para Mercado Libre.
//
// Estas 10 reglas no son una invención de MeliBoost: son el método que el
// usuario ya aplica a mano (tablero "Titulos e Imagenes Mpro"). La idea de
// fondo es una sola: un título excelente está compuesto SOLAMENTE por
// palabras clave que aparecieron en la investigación. Cuanto menos "sentido"
// tenga la frase como oración, mejor, porque significa que no se gastaron
// caracteres en algo que nadie busca.
//
// Viven acá, y no sueltas dentro del prompt, porque se usan en dos lugares:
// para instruir al modelo que genera los títulos y para auditar después lo
// que devolvió (el modelo se salta reglas como "sin tildes" con facilidad).

export type TitleRule = {
  id: number;
  label: string;
  detail: string;
};

export const TITLE_RULES: TitleRule[] = [
  { id: 1, label: "Solo palabras clave", detail: "Nada que no sea una palabra clave de la investigación ocupa espacio en el título." },
  { id: 2, label: "Usar todos los caracteres", detail: "Completar el máximo que admita la categoría; un título corto desperdicia búsquedas." },
  { id: 3, label: "Sin conectores", detail: "Nada de «de», «para», «con»… salvo que el conector sea parte de una palabra clave." },
  { id: 4, label: "Sin especificaciones", detail: "Ni tamaño, ni potencia, ni medidas, salvo que sean palabra clave." },
  { id: 5, label: "Sin colores ni variantes", detail: "El color cambia entre unidades de la misma publicación, salvo que sea palabra clave." },
  { id: 6, label: "Títulos muy distintos", detail: "Las variantes tienen que ser realmente diferentes, no la misma frase retocada." },
  { id: 7, label: "Sin frases lógicas", detail: "No se busca una oración que se lea bien, sino palabras clave una detrás de otra." },
  { id: 8, label: "Sin copiar a nadie", detail: "No replicar el título de otra publicación." },
  { id: 9, label: "Sin tildes", detail: "Se escriben sin acentos." },
  { id: 10, label: "Las 3 primeras, las más buscadas", detail: "Las 3 primeras palabras describen el producto y son las de mayor demanda real, en ese orden." },
];

// Conectores y muletillas que no aportan búsquedas. Se comparan en minúscula
// y sin tildes, así que acá van sin acentos.
const CONNECTORS = new Set([
  "a", "al", "ante", "bajo", "con", "contra", "de", "del", "desde", "e", "en",
  "entre", "hacia", "hasta", "la", "las", "lo", "los", "mas", "o", "para",
  "por", "segun", "sin", "sobre", "su", "sus", "tras", "u", "un", "una",
  "unas", "unos", "y",
]);

// Valor de respaldo: es el limite mas restrictivo que usa Mercado Libre, y
// solo se usa cuando no se pudo leer el de la categoria real
// (getCategoryMaxTitleLength). No es "el" limite: hay categorias de 150.
export const DEFAULT_TITLE_MAX_LENGTH = 60;
export const CATALOG_TITLE_MAX_LENGTH = 120;

// Regla 9. Se usa también para comparar palabras entre sí, de modo que
// "depilacion" y "depilación" cuenten como la misma palabra clave.
//
// La ñ se conserva: en español es una letra propia, no una vocal acentuada.
// Convertirla en "n" cambiaría la palabra ("niño" -> "nino", "año" -> "ano")
// y dejaría de coincidir con lo que la gente busca. Como NFD la descompone
// en n + virgulilla, se la protege antes de quitar los diacríticos.
const N_TILDE = "";
const N_TILDE_UPPER = "";

export function stripAccents(text: string): string {
  return text
    .replace(/ñ/g, N_TILDE)
    .replace(/Ñ/g, N_TILDE_UPPER)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(new RegExp(N_TILDE, "g"), "ñ")
    .replace(new RegExp(N_TILDE_UPPER, "g"), "Ñ");
}

function words(text: string): string[] {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Deja el título como debe salir: sin tildes, sin espacios de más y dentro
// del límite de caracteres, cortando por palabra entera para no dejar una
// palabra clave partida a la mitad.
export function normalizeTitle(title: string, maxLength = DEFAULT_TITLE_MAX_LENGTH): string {
  const clean = stripAccents(title).replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

// En un título compuesto solo por palabras clave, repetir una palabra es
// siempre desperdicio: no suma una búsqueda nueva y gasta caracteres que
// podría ocupar otra keyword. El modelo lo hace igual de vez en cuando, así
// que se limpia acá. Compara sin tildes y sin mayúsculas, de modo que
// "Presion" y "presión" cuenten como la misma palabra.
export function removeRepeatedWords(title: string): string {
  const seen: string[] = [];
  return title
    .split(/\s+/)
    .filter((word) => {
      const key = stripAccents(word).toLowerCase().replace(/[^a-z0-9ñ]/g, "");
      if (!key) return true;
      // No basta con descartar repeticiones exactas: "Licuadora Licuadoras"
      // gasta el doble de espacio para la misma busqueda, porque Mercado
      // Libre las trata igual. Se descarta tambien la variante con la misma
      // raiz.
      if (seen.some((prev) => sharesRoot(prev, key))) return false;
      seen.push(key);
      return true;
    })
    .join(" ")
    .trim();
}

// Dos palabras cuentan como la misma si comparten una raiz larga
// ("licuadora"/"licuadoras", "monohidratada"/"monohidratadas"). Es una
// aproximacion deliberadamente simple: no hay stemmer de espanol acá y
// equivocarse de mas solo cuesta una palabra, no una busqueda.
function sharesRoot(a: string, b: string): boolean {
  if (a === b) return true;

  // Caso principal: el plural o la variante de genero de algo que ya esta
  // ("cama"/"camas", "licuadora"/"licuadoras", "monohidratada"/"monohidratadas").
  const [corta, larga] = a.length <= b.length ? [a, b] : [b, a];
  if (corta.length >= 4 && larga.startsWith(corta)) {
    const sufijo = larga.slice(corta.length);
    if (["s", "es", "as", "os", "a", "o"].includes(sufijo)) return true;
  }

  // Red de seguridad para palabras largas que comparten casi toda la raiz
  // pero no encajan en el caso anterior. Se exige bastante longitud para no
  // fusionar palabras que solo empiezan parecido.
  const minLen = Math.min(a.length, b.length);
  if (minLen < 7) return false;
  const prefix = Math.floor(minLen * 0.85);
  return a.slice(0, prefix) === b.slice(0, prefix);
}


export type RankedWord = {
  word: string;
  // Peso relativo: 1 es la palabra más buscada de la categoría.
  weight: number;
  // En cuántas búsquedas reales distintas aparece. Es el "6 búsquedas con
  // Tensiometro Digital" del método: cuantas más, más demanda confirmada.
  searches: number;
};

// El paso que el vendedor hace a mano: mirar las búsquedas reales de la
// categoría y deducir qué palabra va primera, cuál segunda, etc.
//
// `orderedKeywords` tiene que venir en el orden en que Mercado Libre las
// devuelve (/trends ya las entrega de más a menos buscada). Cada búsqueda
// aporta un peso según su posición, y el peso de una palabra es la suma de
// los pesos de las búsquedas donde aparece. Así, una palabra que sale en
// muchas búsquedas y además en las de arriba queda primera.
//
// No depende de ninguna categoría, producto ni cuenta en particular:
// funciona con cualquier lista de búsquedas ordenada.
export function rankKeywordWords(orderedKeywords: string[], limit = 12): RankedWord[] {
  const total = orderedKeywords.length;
  if (total === 0) return [];

  const weightByWord = new Map<string, number>();
  const searchesByWord = new Map<string, number>();

  orderedKeywords.forEach((keyword, index) => {
    const positionWeight = (total - index) / total;
    // Set: que una búsqueda repita una palabra no la cuenta dos veces.
    for (const word of new Set(words(keyword))) {
      // Las palabras de 1-2 letras no son términos de búsqueda por sí solas.
      if (CONNECTORS.has(word) || word.length < 3) continue;
      weightByWord.set(word, (weightByWord.get(word) ?? 0) + positionWeight);
      searchesByWord.set(word, (searchesByWord.get(word) ?? 0) + 1);
    }
  });

  const entries = [...weightByWord.entries()].sort((a, b) => b[1] - a[1]);
  const top = entries[0]?.[1] ?? 1;

  return entries.slice(0, limit).map(([word, weight]) => ({
    word,
    weight: Number((weight / top).toFixed(3)),
    searches: searchesByWord.get(word) ?? 0,
  }));
}

export type TitleIssue = {
  ruleId: number;
  message: string;
};

// Audita solo lo que se puede comprobar sin criterio: el resto de las reglas
// (no copiar, que las variantes sean distintas entre sí) va en el prompt.
// Devuelve avisos, no errores: un título con un aviso sigue siendo usable, y
// la decisión final es del vendedor.
export function auditTitle(
  title: string,
  keywords: string[],
  maxLength = DEFAULT_TITLE_MAX_LENGTH,
  // Ranking real de palabras por demanda (rankKeywordWords). Sin él, la
  // regla 10 solo puede comprobar que las 3 primeras sean palabras clave;
  // con él comprueba además que sean LAS MÁS buscadas, que es lo que de
  // verdad decide si la publicación sale arriba.
  rankedWords: RankedWord[] = [],
): TitleIssue[] {
  const issues: TitleIssue[] = [];
  const titleWords = words(title);
  if (titleWords.length === 0) return issues;

  const keywordWordsPerPhrase = keywords.map((phrase) => ({ phrase, parts: words(phrase) }));
  const usedWords = new Set(titleWords);

  // Regla 2 — se avisa por debajo del 85% del límite, pero SOLO si queda
  // alguna palabra clave sin usar que de verdad entre en lo que sobra. En
  // una categoría de 150 caracteres con pocas keywords investigadas no hay
  // con qué llenar el espacio, y avisar ahí sería pedirle al vendedor algo
  // que no puede hacer.
  if (title.length < Math.floor(maxLength * 0.85)) {
    // Solo cuentan las palabras realmente nuevas, y que no sean conectores:
    // sugerir "proteina en polvo" cuando el título ya dice "proteina" y
    // "polvo" no aporta ninguna búsqueda, solo un "en". Tampoco cuentan las
    // variantes de algo que ya está ("monohidratadas" cuando el título dice
    // "monohidratada"): comparten raíz, Mercado Libre las encuentra igual y
    // sugerirlas sería ruido.
    const esVarianteDeAlgoUsado = (word: string) => [...usedWords].some((used) => sharesRoot(used, word));

    // Cuando hay ranking se sugiere desde ahi: ya viene sin marcas ajenas y
    // ordenado por demanda, asi que lo primero que propone es lo que mas
    // suma. Sin ranking se cae a las frases clave sueltas.
    const candidatos =
      rankedWords.length > 0
        ? rankedWords.map((r) => [r.word])
        : keywordWordsPerPhrase.map(({ parts }) => parts);

    const aportanAlgo = candidatos
      .map((parts) =>
        parts.filter((w) => !usedWords.has(w) && !CONNECTORS.has(w) && !esVarianteDeAlgoUsado(w)),
      )
      .filter((nuevas) => nuevas.length > 0)
      .map((nuevas) => nuevas.join(" "))
      .filter((texto) => title.length + 1 + texto.length <= maxLength);

    if (aportanAlgo.length > 0) {
      issues.push({
        ruleId: 2,
        message: `Sobran ${maxLength - title.length} caracteres: cabría "${aportanAlgo[0]}"`,
      });
    }
  }

  const keywordWords = new Set(keywordWordsPerPhrase.flatMap((k) => k.parts));

  // Regla 3 — la excepción del tablero es "si son palabras claves sí las
  // puedo incluir", y eso se juzga por posición, no por presencia: un "de"
  // vale si está DENTRO de una frase clave que el título usa entera
  // ("monitor de presion arterial"), y no vale si quedó suelto en otra
  // parte del título. Por eso se marcan primero las posiciones que cubre
  // cada frase clave de varias palabras.
  const covered = new Set<number>();
  for (const phrase of keywords) {
    const phraseWords = words(phrase);
    if (phraseWords.length < 2) continue;
    for (let i = 0; i + phraseWords.length <= titleWords.length; i++) {
      if (phraseWords.every((w, j) => titleWords[i + j] === w)) {
        for (let j = 0; j < phraseWords.length; j++) covered.add(i + j);
      }
    }
  }
  const looseConnectors = [
    ...new Set(titleWords.filter((w, i) => CONNECTORS.has(w) && !covered.has(i))),
  ];
  if (looseConnectors.length > 0) {
    issues.push({
      ruleId: 3,
      message: `Tiene conectores sueltos: ${looseConnectors.join(", ")}`,
    });
  }

  // Regla 9
  if (stripAccents(title) !== title) {
    issues.push({ ruleId: 9, message: "Tiene tildes" });
  }

  // Regla 10 — se comprueba contra las keywords reales de la investigación;
  // si no hubo keywords no se puede opinar, así que se omite.
  // Se miran las 3 primeras palabras que de verdad describen algo: un
  // conector que va dentro de una frase clave entera ("monitor DE presion
  // arterial") no cuenta ni a favor ni en contra, porque arrancar por la
  // frase que la gente realmente busca es lo correcto. Un conector suelto
  // sí cuenta en contra, pero de eso ya avisa la regla 3.
  const descriptive = titleWords.filter((w, i) => !(CONNECTORS.has(w) && covered.has(i)));
  const firstThree = descriptive.slice(0, 3);

  if (rankedWords.length > 0) {
    // Lo que de verdad decide la posición es con qué palabra ABRE el
    // título. Las otras dos solo tienen que ser búsquedas reales: exigir
    // que las tres estén en el top sería más estricto que el método y
    // marcaría como error un diferenciador legítimo ("cama perro grande").
    const primera = descriptive[0];
    if (primera && !sharesRoot(primera, rankedWords[0].word)) {
      issues.push({
        ruleId: 10,
        message: `Abre con "${primera}", pero la más buscada es "${rankedWords[0].word}" (${rankedWords[0].searches} búsquedas)`,
      });
    }
    const sinDemanda = firstThree.filter((w) => CONNECTORS.has(w) || !keywordWords.has(w));
    if (sinDemanda.length > 0) {
      issues.push({
        ruleId: 10,
        message: `No son búsqueda real al arrancar: ${sinDemanda.join(", ")}`,
      });
    }
  } else if (keywordWords.size > 0) {
    const notKeywords = firstThree.filter((w) => CONNECTORS.has(w) || !keywordWords.has(w));
    if (notKeywords.length > 0) {
      issues.push({
        ruleId: 10,
        message: `No son palabra clave al arrancar: ${notKeywords.join(", ")}`,
      });
    }
  }

  return issues;
}
