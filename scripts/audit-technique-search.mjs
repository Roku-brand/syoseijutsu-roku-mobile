import fs from 'node:fs';

const generated = JSON.parse(fs.readFileSync('src/data/generated/techniques.json', 'utf8'));
const cards = generated.categories.flatMap((category) =>
  category.subcategories.flatMap((subcategory) =>
    subcategory.items.map((card) => ({
      ...card,
      categoryName: category.name,
      subcategory: subcategory.name,
      articleTitle: subcategory.articleTitle ?? subcategory.name,
    })),
  ),
);

const failures = [];
const ids = new Set();
const searchableFields = ['title', 'essence', 'explanation', 'field', 'persona', 'categoryName', 'subcategory', 'articleTitle'];

for (const card of cards) {
  if (ids.has(card.id)) failures.push(`Duplicate technique id: ${card.id}`);
  ids.add(card.id);
  const corpus = searchableFields.map((field) => card[field] ?? '').join(' ').trim();
  if (!corpus) failures.push(`${card.id} has no searchable text.`);
}

const representativeQueries = ['初対面', '会話', '交渉', '先延ばし', '不安', '挫折', '人生'];
for (const query of representativeQueries) {
  const count = cards.filter((card) => searchableFields
    .map((field) => card[field] ?? '')
    .join(' ')
    .toLocaleLowerCase()
    .includes(query.toLocaleLowerCase())).length;
  if (count === 0) failures.push(`Query "${query}" returns no current-master results.`);
}

if (cards.length !== new Set(cards.map((card) => card.id)).size) {
  failures.push('Technique ids are not unique.');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Search audit passed: ${cards.length} current-master cards, ${representativeQueries.length} representative queries.`);
