// Interest topics are editable in the app and stored in a small JSON file.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export function createTopicStore(file, defaults) {
  async function load() {
    try {
      const data = JSON.parse(await readFile(file, 'utf8'));
      if (Array.isArray(data.topics)) return data.topics;
    } catch {
      /* missing or invalid file: fall back to defaults */
    }
    return defaults;
  }

  async function save(topics) {
    const clean = [...new Set(topics.map((t) => String(t).trim()).filter(Boolean))].slice(0, 20);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ topics: clean }, null, 2));
    return clean;
  }

  return { load, save };
}
