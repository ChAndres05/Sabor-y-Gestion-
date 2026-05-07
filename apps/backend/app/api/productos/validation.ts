import { prisma } from '@/lib/prisma';

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalizeForComparison = (value: string) =>
    normalizeText(value)
        .toLocaleLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const containsOffensiveWord = async (normalizedText: string) => {
    const words = await prisma.palabras_ofensivas.findMany({
        select: { palabra: true },
    });

    if (words.length === 0) return false;

    const tokens = normalizedText.split(' ').filter(Boolean);
    const textWithSpaces = ` ${normalizedText} `;

    return words.some(({ palabra }) => {
        const normalizedWord = normalizeForComparison(palabra);
        if (!normalizedWord) return false;

        if (normalizedWord.includes(' ')) {
            return textWithSpaces.includes(` ${normalizedWord} `);
        }

        return tokens.includes(normalizedWord);
    });
};

export const validateProductText = async (
    rawText: string,
    fieldLabel: string
) => {
    const normalizedText = normalizeText(rawText);

    if (!normalizedText) {
        return { value: normalizedText };
    }

    const normalizedComparison = normalizeForComparison(normalizedText);
    const hasOffensiveWord = await containsOffensiveWord(normalizedComparison);

    if (hasOffensiveWord) {
        return { error: `${fieldLabel} contiene palabras no permitidas` };
    }

    return { value: normalizedText };
};
