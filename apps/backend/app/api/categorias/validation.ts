import { prisma } from '@/lib/prisma';

const MAX_CATEGORY_NAME_LENGTH = 30;
const CATEGORY_NAME_PATTERN = /^[\p{L}\p{M} ]+$/u;

const normalizeCategoryName = (value: string) =>
    value.trim().replace(/\s+/g, ' ');

const normalizeForComparison = (value: string) =>
    normalizeCategoryName(value)
        .toLocaleLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const containsOffensiveWord = async (normalizedName: string) => {
    const words = await prisma.palabras_ofensivas.findMany({
        select: { palabra: true },
    });

    if (words.length === 0) return false;

    const tokens = normalizedName.split(' ').filter(Boolean);
    const nameWithSpaces = ` ${normalizedName} `;

    return words.some(({ palabra }) => {
        const normalizedWord = normalizeForComparison(palabra);
        if (!normalizedWord) return false;

        if (normalizedWord.includes(' ')) {
            return nameWithSpaces.includes(` ${normalizedWord} `);
        }

        return tokens.includes(normalizedWord);
    });
};

export const validateCategoryName = async (rawName: string) => {
    const normalizedName = normalizeCategoryName(rawName);

    if (!normalizedName) {
        return { error: 'El nombre de la categoria es obligatorio' };
    }

    if (normalizedName.length > MAX_CATEGORY_NAME_LENGTH) {
        return {
            error: `El nombre no puede superar ${MAX_CATEGORY_NAME_LENGTH} caracteres`,
        };
    }

    if (!CATEGORY_NAME_PATTERN.test(normalizedName)) {
        return { error: 'El nombre solo puede contener letras y espacios' };
    }

    const normalizedComparison = normalizeForComparison(normalizedName);
    const hasOffensiveWord = await containsOffensiveWord(normalizedComparison);

    if (hasOffensiveWord) {
        return { error: 'El nombre contiene palabras no permitidas' };
    }

    return { value: normalizedName };
};
