import { DECKS, DIFFICULTIES, type Filters } from '../types';
import { ChipGroup, DIFF_BG } from './ui';

export function FilterChips({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  return (
    <div className="space-y-3">
      <ChipGroup
        label="Difficulty"
        options={DIFFICULTIES}
        selected={value.difficulties}
        render={(d) => d}
        colors={DIFF_BG}
        onChange={(difficulties) => onChange({ ...value, difficulties })}
      />
      <ChipGroup
        label="Deck"
        options={DECKS}
        selected={value.decks}
        render={(d) => (d === 'official' ? 'Official' : 'Originals')}
        onChange={(decks) => onChange({ ...value, decks })}
      />
    </div>
  );
}
