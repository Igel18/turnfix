import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { describe, it, expect } from 'vitest';

type Violation = {
  file: string;
  line: number;
  column: number;
  kind: string;
  text: string;
};

type BaselineEntry = {
  id: string;
  file: string;
  line: number;
  column: number;
  kind: string;
  text: string;
};

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SRC_ROOT = path.join(PROJECT_ROOT, 'src');
const UI_DIRS = [
  path.join(SRC_ROOT, 'components'),
  path.join(SRC_ROOT, 'pages'),
];
const BASELINE_FILE = path.join(__dirname, 'noHardcodedUiStrings.baseline.json');

const TRANSLATION_KEY_RE = /^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/;
const URL_RE = /^(https?:\/\/|\/api\/|\/|mailto:)/i;
const FILE_EXT_RE = /\.(png|jpg|jpeg|svg|gif|webp|pdf|json|xml|csv)$/i;
const TECH_TOKEN_RE = /^[A-Z0-9_\-:/.]+$/;
const IGNORE_EXACT = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'button',
  'submit',
  'reset',
  'text',
  'number',
  'email',
  'password',
  'url',
  'date',
  'table',
  'grid',
  'card',
  'asc',
  'desc',
]);

const IGNORE_JSX_ATTRIBUTES = new Set([
  'className',
  'id',
  'key',
  'name',
  'type',
  'role',
  'value',
  'to',
  'href',
  'target',
  'rel',
  'src',
  'd',
  'viewBox',
  'stroke',
  'fill',
  'width',
  'height',
  'min',
  'max',
  'step',
  'tabIndex',
  'htmlFor',
  'data-testid',
  'data-slot',
  'aria-hidden',
]);

const UI_PROPERTY_NAMES = new Set([
  'title',
  'subtitle',
  'description',
  'label',
  'placeholder',
  'message',
  'helperText',
  'helpText',
  'tooltip',
  'confirmText',
  'cancelText',
  'buttonText',
  'emptyText',
  'errorText',
  'warningText',
]);

function listTsxFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];

  const out: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__' || entry.name === 'test') continue;
      out.push(...listTsxFiles(fullPath));
      continue;
    }

    if (!entry.name.endsWith('.tsx')) continue;
    if (entry.name.endsWith('.test.tsx')) continue;
    out.push(fullPath);
  }

  return out;
}

function toRel(absPath: string): string {
  return path.relative(PROJECT_ROOT, absPath).replace(/\\/g, '/');
}

function isHumanString(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  if (IGNORE_EXACT.has(text)) return false;
  if (TRANSLATION_KEY_RE.test(text)) return false;
  if (URL_RE.test(text)) return false;
  if (FILE_EXT_RE.test(text)) return false;
  if (TECH_TOKEN_RE.test(text)) return false;
  if (/^[0-9]+$/.test(text)) return false;
  if (/^[{}[\](),.;:+\-*/\\<>!?@#$%^&|~`=]+$/.test(text)) return false;
  if (text.length < 2) return false;
  if (!/[A-Za-zÄÖÜäöüß]/.test(text)) return false;
  return true;
}

function createId(v: Violation): string {
  return `${v.file}:${v.line}:${v.column}:${v.kind}:${v.text}`;
}

function hasJsxAncestor(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (
      ts.isJsxElement(cur) ||
      ts.isJsxFragment(cur) ||
      ts.isJsxSelfClosingElement(cur)
    ) {
      return true;
    }
    cur = cur.parent;
  }
  return false;
}

function getViolation(file: string, sourceFile: ts.SourceFile, node: ts.Node, kind: string, text: string): Violation {
  const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    file,
    line: pos.line + 1,
    column: pos.character + 1,
    kind,
    text: text.trim(),
  };
}

function collectViolationsForFile(filePath: string): Violation[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const relFile = toRel(filePath);
  const violations: Violation[] = [];

  function visit(node: ts.Node): void {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile).replace(/\s+/g, ' ').trim();
      if (isHumanString(text)) {
        violations.push(getViolation(relFile, sourceFile, node, 'jsx-text', text));
      }
    }

    if (ts.isJsxAttribute(node)) {
      const attrName = node.name.text;
      if (!IGNORE_JSX_ATTRIBUTES.has(attrName) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          const text = node.initializer.text;
          if (isHumanString(text)) {
            violations.push(getViolation(relFile, sourceFile, node.initializer, `jsx-attr:${attrName}`, text));
          }
        }

        if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          const expr = node.initializer.expression;
          if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
            const text = expr.text;
            if (isHumanString(text)) {
              violations.push(getViolation(relFile, sourceFile, expr, `jsx-attr-expr:${attrName}`, text));
            }
          }
        }
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = ts.isIdentifier(node.name) ? node.name.text : ts.isStringLiteral(node.name) ? node.name.text : '';
      if (name && UI_PROPERTY_NAMES.has(name)) {
        if (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
          const text = node.initializer.text;
          if (isHumanString(text)) {
            violations.push(getViolation(relFile, sourceFile, node.initializer, `ui-prop:${name}`, text));
          }
        }
      }
    }

    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && hasJsxAncestor(node)) {
      const text = node.text;
      if (isHumanString(text)) {
        const parent = node.parent;
        if (!ts.isJsxAttribute(parent)) {
          violations.push(getViolation(relFile, sourceFile, node, 'jsx-expr-string', text));
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const dedup = new Map<string, Violation>();
  for (const v of violations) {
    dedup.set(createId(v), v);
  }

  return Array.from(dedup.values()).sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.text.localeCompare(b.text);
  });
}

function collectAllViolations(): Violation[] {
  const files = UI_DIRS.flatMap((dir) => listTsxFiles(dir));
  return files.flatMap((file) => collectViolationsForFile(file));
}

function toBaselineEntries(violations: Violation[]): BaselineEntry[] {
  return violations.map((v) => ({
    id: createId(v),
    file: v.file,
    line: v.line,
    column: v.column,
    kind: v.kind,
    text: v.text,
  }));
}

function readBaseline(): BaselineEntry[] {
  if (!fs.existsSync(BASELINE_FILE)) {
    return [];
  }

  const raw = fs.readFileSync(BASELINE_FILE, 'utf8');
  return JSON.parse(raw) as BaselineEntry[];
}

function formatViolations(violations: Violation[]): string {
  return violations
    .slice(0, 200)
    .map((v) => `- ${v.file}:${v.line}:${v.column} [${v.kind}] ${JSON.stringify(v.text)}`)
    .join('\n');
}

describe('i18n guard: no new hardcoded UI strings', () => {
  it('blocks newly introduced hardcoded strings across UI files', () => {
    const violations = collectAllViolations();

    if (process.env.UPDATE_I18N_BASELINE === '1') {
      const entries = toBaselineEntries(violations);
      fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
      expect(entries.length).toBeGreaterThanOrEqual(0);
      return;
    }

    const baseline = readBaseline();
    expect(
      baseline.length,
      `Missing baseline file: ${toRel(BASELINE_FILE)}. Run with UPDATE_I18N_BASELINE=1 once.`
    ).toBeGreaterThan(0);

    const baselineIds = new Set(baseline.map((b) => b.id));
    const newViolations = violations.filter((v) => !baselineIds.has(createId(v)));

    expect(
      newViolations,
      `Found ${newViolations.length} new hardcoded UI string(s).\n\n${formatViolations(newViolations)}`
    ).toEqual([]);
  });
});
