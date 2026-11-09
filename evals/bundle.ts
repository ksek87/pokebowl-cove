import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

const compress = promisify(gzip);

const APPLICATION = 'application';
const NODE_MODULES = 'node_modules/';
const SCOPE_PREFIX = '@';
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VLQ_SHIFT = 5;
const VLQ_CONTINUE = 32;
const VLQ_VALUE_MASK = 31;
const SIGN_BIT = 1;
const GZIP_LEVEL = 9;
const START = 0;
const NEXT = 1;
const NO_CHANGE = 0;
const EMPTY: Size = { raw: 0, gzip: 0 };

export interface Size {
  raw: number;
  gzip: number;
}

export interface Segment {
  column: number;
  source: number;
}

export interface Contributor {
  name: string;
  rawBytes: number;
  gzipBytes: number;
}

export async function sizeOf(content: Buffer | string): Promise<Size> {
  const buffer = Buffer.from(content);
  return { raw: buffer.length, gzip: (await compress(buffer, { level: GZIP_LEVEL })).length };
}

/** The npm package a module comes from, or `application` for our source files. */
export function packageOf(source: string): string {
  if (!source.includes(NODE_MODULES)) {
    return APPLICATION;
  }
  const parts = source.slice(source.lastIndexOf(NODE_MODULES) + NODE_MODULES.length).split('/');
  const [scopeOrName, name] = parts;
  return scopeOrName.startsWith(SCOPE_PREFIX) ? `${scopeOrName}/${name}` : scopeOrName;
}

function decodeVlq(text: string): number[] {
  const values: number[] = [];
  let value = START;
  let shift = START;
  for (const character of text) {
    const digit = BASE64.indexOf(character);
    value += (digit & VLQ_VALUE_MASK) << shift;
    if (digit & VLQ_CONTINUE) {
      shift += VLQ_SHIFT;
      continue;
    }
    values.push(value & SIGN_BIT ? -(value >>> SIGN_BIT) : value >>> SIGN_BIT);
    value = START;
    shift = START;
  }
  return values;
}

/**
 * Reads the generated column and source index of every segment in a source map.
 * The column restarts on each line; the source index carries over, as the format defines.
 */
export function decodeMappings(mappings: string): Segment[][] {
  let source = START;
  return mappings.split(';').map((line) => {
    let column = START;
    return line
      .split(',')
      .filter(Boolean)
      .map((segment) => {
        const [columnDelta, sourceDelta] = decodeVlq(segment);
        column += columnDelta;
        source += sourceDelta ?? NO_CHANGE;
        return { column, source };
      });
  });
}

/** Credits each stretch of generated code to the package of the module it came from, largest first. */
export async function contributorsFor({ code, sources, mappings }: { code: string; sources: string[]; mappings: string }): Promise<Contributor[]> {
  const lines = code.split('\n');
  const text = new Map<string, string[]>();
  decodeMappings(mappings).forEach((segments, lineIndex) => {
    const line = lines[lineIndex] ?? '';
    const isLast = lineIndex === lines.length - NEXT;
    segments.forEach((segment, position) => {
      const following = segments.at(position + NEXT);
      const end = following?.column ?? line.length;
      const ending = following || isLast ? '' : '\n';
      const name = packageOf(sources[segment.source] ?? '');
      text.set(name, [...(text.get(name) ?? []), line.slice(segment.column, end) + ending]);
    });
  });
  const contributors = await Promise.all(
    [...text.entries()].map(async ([name, parts]) => {
      const size = await sizeOf(parts.join(''));
      return { name, rawBytes: size.raw, gzipBytes: size.gzip };
    }),
  );
  return contributors.sort((a, b) => b.rawBytes - a.rawBytes);
}

async function total(files: { content: Buffer }[]): Promise<Size> {
  const sizes = await Promise.all(files.map((file) => sizeOf(file.content)));
  return sizes.reduce((sum, size) => ({ raw: sum.raw + size.raw, gzip: sum.gzip + size.gzip }), EMPTY);
}

/** `initial` holds the files the page loads before anything else; the rest load only when needed. */
export async function summarizeAssets(files: { name: string; content: Buffer }[], initial: string[]): Promise<{
  js: Size;
  css: Size;
  initial: Size;
  lazy: Size & { count: number };
}> {
  const lazy = files.filter((file) => !initial.includes(file.name) && file.name.endsWith('.js'));
  return {
    js: await total(files.filter((file) => file.name.endsWith('.js'))),
    css: await total(files.filter((file) => file.name.endsWith('.css'))),
    initial: await total(files.filter((file) => initial.includes(file.name))),
    lazy: { count: lazy.length, ...(await total(lazy)) },
  };
}
