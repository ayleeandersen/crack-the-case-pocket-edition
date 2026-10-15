import raw from '../../crack-the-case-cards.json';
import type { Card } from '../types';

const REQUIRED: (keyof Card)[] = [
  'id', 'number', 'source', 'title', 'difficulty', 'case', 'mystery',
  'clues', 'timetable', 'story', 'specialInformation', 'solution',
];

function validate(cards: Card[]): void {
  for (const card of cards) {
    const missing = REQUIRED.filter((k) => !(k in card) || (card[k] === undefined));
    if (missing.length) console.warn(`[cards] Card ${card.id ?? '?'} is missing: ${missing.join(', ')}`);
    if (!['Easy', 'Medium', 'Difficult'].includes(card.difficulty))
      console.warn(`[cards] Card ${card.id} has unknown difficulty "${card.difficulty}"`);
    if (!Array.isArray(card.clues) || card.clues.length !== 2)
      console.warn(`[cards] Card ${card.id} should have exactly 2 clues`);
  }
}

export const cards: Card[] = (raw as unknown as { cards: Card[] }).cards;

if (import.meta.env.DEV) validate(cards);

export const cardById = new Map(cards.map((c) => [c.id, c]));

/** Official 1–108 first, then AI Cards 1–100. */
export function compareByNumber(a: Card, b: Card): number {
  if (a.source !== b.source) return a.source === 'official' ? -1 : 1;
  return a.number - b.number;
}

export function cardLabel(card: Card): string {
  return card.source === 'official' ? `Card ${card.number}` : `AI Card ${card.number}`;
}
