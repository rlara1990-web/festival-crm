import { describe, expect, it } from 'vitest';
import { lit } from '../src/import/sql.ts';

describe('lit (literales SQL)', () => {
  it('escapa comillas y tipa arrays y json', () => {
    expect(lit("Festival d'Été")).toBe("'Festival d''Été'");
    expect(lit(null)).toBe('null');
    expect(lit(['rock', 'pop'])).toBe("array['rock', 'pop']::text[]");
    expect(lit([])).toBe("'{}'::text[]");
    expect(lit([{ hasta: null, valor: 65 }])).toBe(`'[{"hasta":null,"valor":65}]'::jsonb`);
    expect(lit({ a: 1 })).toBe(`'{"a":1}'::jsonb`);
  });
});
