import { readContent, loadTemplates } from './content-loader.js';
const catalog = await readContent('catalog.json');
export const templates = await loadTemplates(catalog.templates);
