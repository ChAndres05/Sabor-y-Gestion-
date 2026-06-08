/**
 * Utilidades de validación para nombres de categorías y productos.
 * Permite evitar el ingreso de caracteres inválidos, números y "gibberish" (texto sin sentido o mashing).
 */

const KEYBOARD_MASHES = /(asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm|qwe|dsa|fds|gfd|hgf|jhg|kjh|lkj|cxz|vcx|bvc|nbv|mnb|ewq)/i;
const SPANISH_LETTERS_ONLY = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
const SPANISH_DESCRIPTION_ALLOWED = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,;:!?()%'"“”-]+$/;
const THREE_CONSECUTIVE_IDENTICAL = /(.)\1\1/;
const REPETITIVE_SYLLABLES = /([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ])([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ])\1\2\1\2/i;
const VOWELS = /[aeiouáéíóúüAEIOUÁÉÍÓÚÜyY]/;
const CONSONANTS_4_OR_MORE = /[bcdfghjklmnñpqrstvwxzBCDFGHJKLMNÑPQRSTVWXZ]{4,}/g;
const VALID_4_CONSONANT_CLUSTERS = /^(nstr|nsgr|bstr|rstr|stpr)$/i;

/**
 * Valida un nombre de categoría o producto.
 * @param name El nombre a validar.
 * @returns Un mensaje de error en español si no es válido, o null si es completamente válido.
 */
export function validateName(name: string): string | null {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return 'El nombre no puede estar vacío.';
  }

  if (trimmed.length < 2) {
    return 'El nombre debe tener al menos 2 letras.';
  }

  // 1. Solo letras (incluyendo acentos y eñes) y espacios
  if (!SPANISH_LETTERS_ONLY.test(trimmed)) {
    return 'El nombre solo puede contener letras y espacios (no se permiten números ni símbolos).';
  }

  // 2. No se permiten caracteres repetidos 3 o más veces consecutivamente (ej. "aaa", "sss")
  if (THREE_CONSECUTIVE_IDENTICAL.test(trimmed)) {
    return 'No se permiten caracteres repetidos consecutivamente.';
  }

  // 3. Dividir en palabras para realizar análisis morfológico de "gibberish"
  const words = trimmed.split(/\s+/);
  for (const word of words) {
    if (word.length >= 3) {
      // 3a. Cada palabra de 3 o más letras debe tener al menos una vocal
      if (!VOWELS.test(word)) {
        return `La palabra "${word}" no parece válida porque no tiene vocales.`;
      }
    }

    // 3b. Evitar mashing de teclado secuencial QWERTY (ej. "asd", "zxc")
    if (KEYBOARD_MASHES.test(word)) {
      return 'El texto ingresado contiene una secuencia de caracteres sin sentido.';
    }

    // 3c. Validar consonantes seguidas
    const consonantMatches = word.match(CONSONANTS_4_OR_MORE);
    if (consonantMatches) {
      for (const cluster of consonantMatches) {
        if (!VALID_4_CONSONANT_CLUSTERS.test(cluster)) {
          return `La combinación de letras en la palabra "${word}" no es válida.`;
        }
      }
    }

    // 3d. Validar vocales seguidas (máximo 3)
    if (/[aeiouáéíóúüAEIOUÁÉÍÓÚÜyY]{4,}/i.test(word)) {
      return `La palabra "${word}" contiene demasiadas vocales seguidas.`;
    }

    // 3e. Control de variedad de caracteres únicos para evitar mashing alterno (ej: "assaasasas", "jkjkjk")
    const uniqueChars = new Set(word.toLowerCase()).size;
    if ((word.length >= 6 && uniqueChars <= 2) || (word.length >= 8 && uniqueChars <= 3)) {
      return `El texto ingresado contiene combinaciones repetitivas de letras sin sentido ("${word}").`;
    }

    // 3f. Bloqueo de sílabas de 2 letras repetidas consecutivamente 3 veces (ej: "asasas", "jkjkjk")
    if (REPETITIVE_SYLLABLES.test(word)) {
      return `El texto ingresado contiene combinaciones repetitivas de letras sin sentido ("${word}").`;
    }
  }

  return null;
}

/**
 * Valida la descripción de una categoría o producto.
 * Permite letras, números, espacios y signos de puntuación comunes, pero evita mashing y símbolos extraños (ej: @).
 * @param description La descripción a validar.
 * @returns Un mensaje de error si no es válida, o null si es completamente válida.
 */
export function validateDescription(description: string | undefined | null): string | null {
  if (!description || !description.trim()) {
    return null; // Es opcional, por lo que vacía es válida
  }

  const trimmed = description.trim();

  // 1. Caracteres permitidos (letras, números, espacios y signos de puntuación)
  if (!SPANISH_DESCRIPTION_ALLOWED.test(trimmed)) {
    return 'La descripción solo puede contener letras, números y signos de puntuación comunes (no se permiten símbolos como @, #, $, etc.).';
  }

  // 2. Caracteres repetidos (ej. "aaa", "...")
  // Nota: permitimos hasta 3 puntos seguidos para puntos suspensivos ("..."), pero no más
  if (trimmed.includes('....') || /(.)\1\1\1/.test(trimmed.replace(/\./g, ''))) {
    return 'No se permiten caracteres repetidos consecutivamente en la descripción.';
  }

  // 3. Dividir en palabras y aplicar comprobación de gibberish
  const words = trimmed.split(/\s+/);
  for (const rawWord of words) {
    // Quitar puntuación del principio y final de la palabra
    const word = rawWord.replace(/^[.,;:!?()'"“”-]+|[.,;:!?()'"“”%-]+$/g, '');

    if (!word) continue;

    // Si es un número puro (ej. "2", "1.5"), se permite
    if (/^\d+(\.\d+)?$/.test(word)) continue;

    if (word.length >= 3) {
      if (!VOWELS.test(word)) {
        return `La palabra "${rawWord}" no parece válida porque no tiene vocales.`;
      }
    }

    if (KEYBOARD_MASHES.test(word)) {
      return 'La descripción contiene palabras o secuencias de caracteres sin sentido.';
    }

    const consonantMatches = word.match(CONSONANTS_4_OR_MORE);
    if (consonantMatches) {
      for (const cluster of consonantMatches) {
        if (!VALID_4_CONSONANT_CLUSTERS.test(cluster)) {
          return `La combinación de letras en la palabra "${rawWord}" no es válida.`;
        }
      }
    }

    if (/[aeiouáéíóúüAEIOUÁÉÍÓÚÜyY]{4,}/i.test(word)) {
      return `La palabra "${rawWord}" contiene demasiadas vocales seguidas.`;
    }

    // 3e. Control de variedad de caracteres únicos para evitar mashing alterno (ej: "assaasasas", "jkjkjk")
    const uniqueChars = new Set(word.toLowerCase()).size;
    if ((word.length >= 6 && uniqueChars <= 2) || (word.length >= 8 && uniqueChars <= 3)) {
      return `La descripción contiene palabras con combinaciones de letras sin sentido ("${rawWord}").`;
    }

    // 3f. Bloqueo de sílabas de 2 letras repetidas consecutivamente 3 veces (ej: "asasas", "jkjkjk")
    if (REPETITIVE_SYLLABLES.test(word)) {
      return `La descripción contiene palabras con combinaciones de letras sin sentido ("${rawWord}").`;
    }
  }

  return null;
}

/**
 * Valida la observación de un ítem de pedido.
 * Solo permite letras, espacios y puntuación común, pero bloquea números y símbolos extraños.
 * Reutiliza las comprobaciones de gibberish.
 */
export function validateObservation(observation: string | undefined | null): string | null {
  if (!observation || !observation.trim()) {
    return null;
  }

  const trimmed = observation.trim();

  // 1. Bloquear si contiene números
  if (/\d/.test(trimmed)) {
    return 'La observación no puede contener números, solo letras.';
  }

  // 2. Solo letras, espacios y puntuación común
  const SPANISH_OBSERVATION_ALLOWED = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.,;:!?()'"“”-]+$/;
  if (!SPANISH_OBSERVATION_ALLOWED.test(trimmed)) {
    return 'La observación solo puede contener letras, espacios y signos de puntuación comunes.';
  }

  // 3. Aplicar control de palabras y mashing
  return validateDescription(trimmed);
}

