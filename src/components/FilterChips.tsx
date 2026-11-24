import { TYPE_COLOR } from './graphColors';

export type FilterType = 'experience' | 'education' | 'project' | 'skill' | 'certification';
export type VisibleTypes = Record<FilterType, boolean>;

const labels: { id: FilterType; label: string }[] = [
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'project', label: 'Projects' },
  { id: 'skill', label: 'Skills' },
  { id: 'certification', label: 'Certifications' },
];

interface FilterChipsProps {
  value: VisibleTypes;
  onChange: (type: FilterType) => void;
}

export default function FilterChips({ value, onChange }: FilterChipsProps) {
  return (
    <div className="filter-chips" role="group" aria-label="Filter node types">
      {labels.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className="filter-chip"
          aria-pressed={value[id]}
          onClick={() => onChange(id)}
        >
          <span className={`filter-chip__swatch filter-chip__swatch--${id}`} style={{ background: TYPE_COLOR[id] }} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
