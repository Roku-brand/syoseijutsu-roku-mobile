import fs from "node:fs";

const source = JSON.parse(
  fs.readFileSync("content/shoseijutsu_cards_135_with_explanations.json", "utf8"),
);
const cards = source.cards ?? [];
const failures = [];
const explanationOwners = new Map();
const paragraphOwners = new Map();
const bannedPhrases = [
  "という感覚から、目の前の相手が安全かどうかを素早く判断する",
  "ただし、技法として露骨に演じれば",
  "好印象とは、目立った記憶ではなく",
  "集団での居場所は、目立つ者より",
  "交渉力とは、巧く話す力より",
  "充実した人生とは、他人に説明しやすい人生ではなく",
];

if (cards.length !== 214) {
  failures.push(`Expected 214 cards, found ${cards.length}.`);
}

for (const [index, card] of cards.entries()) {
  const expectedId = `secret_${String(index + 1).padStart(3, "0")}`;
  const explanation = String(card.explanation ?? "").trim();
  const paragraphs = explanation
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (card.id !== expectedId) {
    failures.push(`Card ${index + 1} has id ${card.id}; expected ${expectedId}.`);
  }
  if (explanation.length < 120) {
    failures.push(`${card.id} explanation is too short (${explanation.length} chars).`);
  }
  if (paragraphs.length < 2) {
    failures.push(`${card.id} needs at least two meaningful paragraphs.`);
  }
  if (bannedPhrases.some((phrase) => explanation.includes(phrase))) {
    failures.push(`${card.id} still contains a rejected template phrase.`);
  }

  explanationOwners.set(
    explanation,
    [...(explanationOwners.get(explanation) ?? []), card.id],
  );
  for (const paragraph of paragraphs) {
    paragraphOwners.set(paragraph, [
      ...(paragraphOwners.get(paragraph) ?? []),
      card.id,
    ]);
  }
}

for (const owners of explanationOwners.values()) {
  if (owners.length > 1) {
    failures.push(`Duplicate explanation: ${owners.join(", ")}`);
  }
}
for (const owners of paragraphOwners.values()) {
  if (owners.length > 1) {
    failures.push(`Duplicate paragraph: ${owners.join(", ")}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

const lengths = cards.map((card) => card.explanation.length);
console.log(
  `Technique audit passed: ${cards.length} cards, ${Math.min(...lengths)}-${Math.max(...lengths)} chars, no duplicated explanations or paragraphs.`,
);
