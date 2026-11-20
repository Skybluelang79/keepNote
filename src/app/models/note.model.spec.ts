import { NOTE_TEMPLATES } from './note.model';

describe('NOTE_TEMPLATES', () => {
  it('includes the original and new productivity templates', () => {
    const names = NOTE_TEMPLATES.map((template) => template.name);

    expect(names).toEqual(
      jasmine.arrayContaining([
        'Grocery list',
        'To-do list',
        'Meeting notes',
        'Daily standup',
        'Project brief',
        'Research notes',
        'Journal entry',
      ]),
    );
  });

  it('has unique, non-empty template names and titles', () => {
    const names = NOTE_TEMPLATES.map((template) => template.name);
    const titles = NOTE_TEMPLATES.map((template) => template.title);

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(titles).size).toBe(titles.length);
    for (const template of NOTE_TEMPLATES) {
      expect(template.name.trim().length).toBeGreaterThan(0);
      expect(template.title.trim().length).toBeGreaterThan(0);
      expect(template.content.trim().length).toBeGreaterThan(0);
    }
  });
});
