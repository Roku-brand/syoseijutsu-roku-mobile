import fs from "node:fs";

const generated = JSON.parse(
  fs.readFileSync("src/data/generated/techniques.json", "utf8"),
);
const cards = generated.categories.flatMap((category) =>
  category.subcategories.flatMap((subcategory) =>
    subcategory.items.map((card) => ({
      ...card,
      categoryName: category.name,
      subcategory: subcategory.name,
    })),
  ),
);

const failures = [];
const requiredQueries = {
  第一印象: 5,
  会話下手: 8,
  会話が苦手: 8,
  コミュ障: 8,
  恋愛: 5,
  なめられない: 8,
  なめられたくない: 8,
  仕事ができる人: 8,
  出世: 5,
  交渉: 20,
  先延ばし: 4,
  不安: 6,
  人生を充実: 10,
  立ち直り: 8,
};

if (cards.length !== 214) {
  failures.push(`Expected 214 cards, found ${cards.length}.`);
}

for (const card of cards) {
  const tagCount = card.tags?.length ?? 0;
  if (tagCount < 8 || tagCount > 12) {
    failures.push(`${card.id} has ${tagCount} tags; expected 8-12.`);
  }
}

for (const [query, minimum] of Object.entries(requiredQueries)) {
  const count = cards.filter((card) =>
    [
      card.title,
      card.subtitle,
      card.explanation,
      card.categoryName,
      card.subcategory,
      ...(card.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  ).length;
  if (count < minimum) {
    failures.push(`Query "${query}" returns ${count}; expected at least ${minimum}.`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Search audit passed: ${cards.length} cards, ${Object.keys(requiredQueries).length} representative queries.`,
);
