import { readContent, loadLessons } from './content-loader.js';
const catalog = await readContent('catalog.json');
export const { skillLabels, gameSkills, games } = catalog;
export const lessons = await loadLessons(skillLabels);
