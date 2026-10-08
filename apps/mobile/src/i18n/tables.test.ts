/// <reference types="node" />

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import ts from "typescript";

import { TABLES } from "./translate";

/**
 * Every text the app shows is written in English inside a call to `t`,
 * `tLater` or `tPlural` (ADR-0172). This test reads those calls in the
 * app's code, as TypeScript reads them, and checks each language has every
 * text, with the same `{marks}`, and no text nobody shows any more.
 */

const APP = join(__dirname, "..", "..");
const CALLS: Readonly<Record<string, readonly number[]>> = {
  // The arguments that are English texts, by position.
  t: [0],
  tLater: [0],
  tPlural: [1, 2],
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** The English texts of a literal, or of a choice between literals. */
function literals(node: ts.Expression): string[] | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [node.text];
  }
  if (ts.isParenthesizedExpression(node)) {
    return literals(node.expression);
  }
  if (ts.isConditionalExpression(node)) {
    const yes = literals(node.whenTrue);
    const no = literals(node.whenFalse);
    return yes !== null && no !== null ? [...yes, ...no] : null;
  }
  return null;
}

type Found = { texts: Map<string, string>; computed: string[] };

/** The texts of every call in the app, with the first file that has each. */
function findTexts(): Found {
  const texts = new Map<string, string>();
  const computed: string[] = [];
  const files = [join(APP, "App.tsx"), ...sourceFiles(join(APP, "src"))];
  for (const path of files) {
    const file = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const where = relative(APP, path);
    // The local names of t, tLater and tPlural in this file: imported from
    // the i18n folder, or the folder's own.
    const names = new Map<string, string>();
    if (where.startsWith(join("src", "i18n"))) {
      for (const name of Object.keys(CALLS)) {
        names.set(name, name);
      }
    }
    for (const statement of file.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        /(^|\/)i18n(\/translate)?$/.test(statement.moduleSpecifier.text) &&
        statement.importClause?.namedBindings !== undefined &&
        ts.isNamedImports(statement.importClause.namedBindings)
      ) {
        for (const element of statement.importClause.namedBindings.elements) {
          const imported = (element.propertyName ?? element.name).text;
          if (imported in CALLS) {
            names.set(element.name.text, imported);
          }
        }
      }
    }
    if (names.size === 0) {
      continue;
    }
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const call = names.get(node.expression.text);
        if (call !== undefined) {
          for (const at of CALLS[call]) {
            const argument = node.arguments[at];
            const found = argument === undefined ? null : literals(argument);
            if (found === null) {
              // `t(row.name)`: the text was marked where it is written.
              if (call !== "t") {
                const line = file.getLineAndCharacterOfPosition(node.getStart()).line;
                computed.push(`${where}:${line + 1}`);
              }
              continue;
            }
            for (const text of found) {
              if (!texts.has(text)) {
                texts.set(text, where);
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return { texts, computed };
}

function marks(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

const { texts, computed } = findTexts();
const LANGUAGES = Object.keys(TABLES) as (keyof typeof TABLES)[];

test("the app's texts are found", () => {
  expect(texts.get("Log out")).toBe(join("src", "profile", "SettingsPage.tsx"));
  expect(texts.get("Phone language")).toBe(
    join("src", "settings", "LanguageSetting.tsx"),
  );
  // A choice between two texts gives both.
  expect(texts.has("Deleting…")).toBe(true);
  expect(texts.has("Delete my account")).toBe(true);
});

test("tLater and tPlural are always given their English texts as written", () => {
  expect(computed).toEqual([]);
});

test.each(LANGUAGES)("every text has its translation in «%s»", (language) => {
  const missing = [...texts]
    .filter(([text]) => !(text in TABLES[language]))
    .map(([text, where]) => `${where}: ${JSON.stringify(text)}`);
  expect(missing).toEqual([]);
});

test.each(LANGUAGES)("«%s» has no text nobody shows any more", (language) => {
  const unused = Object.keys(TABLES[language]).filter((text) => !texts.has(text));
  expect(unused).toEqual([]);
});

test.each(LANGUAGES)("«%s» keeps the {marks} of every text", (language) => {
  const wrong = Object.entries(TABLES[language])
    .filter(([text, translation]) => marks(text).join() !== marks(translation).join())
    .map(([text, translation]) => `${text} → ${translation}`);
  expect(wrong).toEqual([]);
});

test.each(LANGUAGES)("«%s» has no empty text", (language) => {
  const empty = Object.entries(TABLES[language])
    .filter(([, translation]) => translation.trim() === "")
    .map(([text]) => text);
  expect(empty).toEqual([]);
});
