import rawGroups from "@/data/words.json";

export interface Word {
  id: string;
  word: string;
  definition: string;
  group: number;
}

export interface WordGroup {
  id: number;
  name: string;
  words: Word[];
}

interface RawWord {
  word: string;
  definition: string;
}

interface RawGroup {
  group: number;
  words: RawWord[];
}

function makeId(word: string, group: number): string {
  return `g${group}_${word.toLowerCase().replace(/[^a-z]/g, "_")}`;
}

const sourceGroups = rawGroups as RawGroup[];

export const wordGroups: WordGroup[] = sourceGroups.map((g) => ({
  id: g.group,
  name: `Group ${g.group}`,
  words: g.words.map(({ word, definition }) => ({
    id: makeId(word, g.group),
    word,
    definition,
    group: g.group,
  })),
}));

export const allWords: Word[] = wordGroups.flatMap((g) => g.words);

export function getGroup(id: number): WordGroup | undefined {
  return wordGroups.find((g) => g.id === id);
}

export function getWord(wordId: string): Word | undefined {
  return allWords.find((w) => w.id === wordId);
}

export function searchWords(query: string): Word[] {
  const q = query.toLowerCase();
  return allWords.filter(
    (w) =>
      w.word.toLowerCase().includes(q) ||
      w.definition.toLowerCase().includes(q)
  );
}
