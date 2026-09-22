export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  labels: string[];
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  checklist?: boolean;
  reminder?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ChecklistItem {
  text: string;
  checked: boolean;
}

interface CheckedState {
  text: string;
  checked: boolean;
}

export interface NoteTemplate {
  name: string;
  icon: string;
  title: string;
  content: string;
  checklist?: boolean;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    name: 'Grocery list',
    icon: 'checklist',
    title: 'Grocery list',
    content: '- [ ] Oat milk\n- [ ] Avocados x2\n- [ ] Sourdough bread\n- [ ] Espresso beans\n- [ ] Dark chocolate',
    checklist: true,
  },
  {
    name: 'To-do list',
    icon: 'list',
    title: 'To-do',
    content: '- [ ] Morning run\n- [ ] Reply to emails\n- [ ] Finish report\n- [ ] Call the dentist',
    checklist: true,
  },
  {
    name: 'Meeting notes',
    icon: 'templates',
    title: 'Meeting notes',
    content: 'Agenda:\n\nDecisions:\n\nAction items:',
  },
];

export function parseChecklist(content: string): ChecklistItem[] | null {
  const lines = content.split('\n');
  const items: ChecklistItem[] = [];
  let matched = 0;
  for (const line of lines) {
    const m = /^-\s\[( |x|X)\]\s*(.*)$/.exec(line);
    if (m) {
      items.push({ text: m[2], checked: m[1].toLowerCase() === 'x' });
      matched++;
    } else if (matched > 0) {
      break;
    }
  }
  return matched > 0 ? items : null;
}

export function setChecklistItem(
  content: string,
  index: number,
  { text, checked }: CheckedState,
): string {
  const lines = content.split('\n');
  let itemIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = /^-\s\[( |x|X)\]\s*(.*)$/.exec(lines[i]);
    if (m) {
      if (itemIndex === index) {
        lines[i] = `- [${checked ? 'x' : ' '}] ${text}`;
        return lines.join('\n');
      }
      itemIndex++;
    }
  }
  return content;
}

export function addChecklistItem(content: string, text: string): string {
  return content ? `${content}\n- [ ] ${text}` : `- [ ] ${text}`;
}

export function wordCount(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

export function formatRelativeTime(ms: number, now = Date.now()): string {
  const diff = Math.max(1, Math.floor((now - ms) / 1000));
  if (diff < 60) return 'just now';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatReminderTime(ms: number): string {
  const date = new Date(ms);
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (isToday) return `Today · ${time}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();
  if (isTomorrow) return `Tomorrow · ${time}`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ` · ${time}`;
}

export interface NoteColor {
  name: string;
  value: string;
}

export const NOTE_COLORS: NoteColor[] = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#f28b82' },
  { name: 'Amber', value: '#fdce5c' },
  { name: 'Yellow', value: '#fde293' },
  { name: 'Green', value: '#a7e9a0' },
  { name: 'Teal', value: '#7fe3d0' },
  { name: 'Blue', value: '#aecbfa' },
  { name: 'Purple', value: '#d7aefb' },
  { name: 'Pink', value: '#fdcfe8' },
];

export const NOTE_COLOR_MAP = new Map(NOTE_COLORS.map((c) => [c.value, c.name]));