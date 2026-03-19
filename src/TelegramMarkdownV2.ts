import * as Typegram from '@telegraf/types';

const RESERVED_CHARACTERS = /[_*[\]()~`>#+\-=|{}.!\\]/g;
const LINK_URL_RESERVED_CHARACTERS = /[)\\]/g;
const CODE_RESERVED_CHARACTERS = /[`\\]/g;

interface DateTimeEntity {
  date_time_format?: string;
  length: number;
  offset: number;
  type: 'date_time';
  unix_time: number;
}

interface ExpandableBlockquoteEntity {
  length: number;
  offset: number;
  type: 'expandable_blockquote';
}

type TelegramRenderableEntity =
  | Typegram.MessageEntity
  | DateTimeEntity
  | ExpandableBlockquoteEntity;

type Node =
  | { kind: 'blockquote'; expandable: boolean; lines: Node[][] }
  | { kind: 'code'; text: string }
  | { kind: 'empty_bold' }
  | { kind: 'format'; marker: '*' | '_' | '__' | '~' | '||'; children: Node[] }
  | { kind: 'link'; label: Node[]; url: string; withBang: boolean }
  | { kind: 'pre'; language: string; text: string }
  | { kind: 'text'; text: string };

interface Analysis {
  hasMarkdown: boolean;
  hasPotentialMarkdown: boolean;
  isValid: boolean;
  nodes?: Node[];
  renderedText?: string;
}

interface SequenceResult {
  foundStop: boolean;
  nodes: Node[];
  valid: boolean;
}

function escapePlainText(text: string): string {
  return text.replaceAll(RESERVED_CHARACTERS, '\\$&');
}

function escapeCodeContent(text: string): string {
  return text.replaceAll(CODE_RESERVED_CHARACTERS, '\\$&');
}

function escapeLinkUrl(text: string): string {
  return text.replaceAll(LINK_URL_RESERVED_CHARACTERS, '\\$&');
}

class MarkdownV2SourceParser {
  private hasMarkdown = false;
  private hasPotentialMarkdown = false;
  private index = 0;

  constructor(private readonly text: string) {}

  analyze(): Analysis {
    const sequence = this.parseSequence({ allowBlockquotes: true, stopAtNewline: false });
    if (!sequence.valid || sequence.foundStop || this.index !== this.text.length) {
      return {
        hasMarkdown: this.hasMarkdown,
        hasPotentialMarkdown: this.hasPotentialMarkdown,
        isValid: false,
      };
    }

    return {
      hasMarkdown: this.hasMarkdown,
      hasPotentialMarkdown: this.hasPotentialMarkdown,
      isValid: true,
      nodes: sequence.nodes,
      renderedText: sequence.nodes.map(renderNode).join(''),
    };
  }

  analyzeBestEffort(): Analysis {
    const sequence = this.parseBestEffortSequence({
      allowBlockquotes: true,
      stopAtNewline: false,
    });
    return {
      hasMarkdown: this.hasMarkdown,
      hasPotentialMarkdown: this.hasPotentialMarkdown,
      isValid: true,
      nodes: sequence.nodes,
      renderedText: sequence.nodes.map(renderNode).join(''),
    };
  }

  parseInlineOnly(): Analysis {
    const sequence = this.parseSequence({ allowBlockquotes: false, stopAtNewline: false });
    if (!sequence.valid || sequence.foundStop || this.index !== this.text.length) {
      return {
        hasMarkdown: this.hasMarkdown,
        hasPotentialMarkdown: this.hasPotentialMarkdown,
        isValid: false,
      };
    }

    return {
      hasMarkdown: this.hasMarkdown,
      hasPotentialMarkdown: this.hasPotentialMarkdown,
      isValid: true,
      nodes: sequence.nodes,
      renderedText: sequence.nodes.map(renderNode).join(''),
    };
  }

  private parseSequence(options: {
    allowBlockquotes: boolean;
    stopAtNewline: boolean;
    stopToken?: string;
  }): SequenceResult {
    const nodes: Node[] = [];
    let textBuffer = '';

    const flushTextBuffer = () => {
      if (textBuffer.length === 0) {
        return;
      }
      nodes.push({ kind: 'text', text: textBuffer });
      textBuffer = '';
    };

    while (this.index < this.text.length) {
      if (options.stopToken && this.text.startsWith(options.stopToken, this.index)) {
        flushTextBuffer();
        return { nodes, foundStop: true, valid: true };
      }

      const character = this.text[this.index];
      if (options.stopAtNewline && character === '\n') {
        flushTextBuffer();
        return { nodes, foundStop: false, valid: true };
      }

      if (character === '\\') {
        this.hasPotentialMarkdown = true;
        if (this.index === this.text.length - 1) {
          return { nodes, foundStop: false, valid: false };
        }
        textBuffer += this.text[this.index + 1];
        this.index += 2;
        continue;
      }

      if (
        options.allowBlockquotes &&
        this.isLineStart() &&
        (this.text.startsWith('**>', this.index) || this.text.startsWith('>', this.index))
      ) {
        flushTextBuffer();
        const blockquote = this.parseBlockquote();
        if (!blockquote) {
          return { nodes, foundStop: false, valid: false };
        }
        nodes.push(blockquote);
        continue;
      }

      if (this.isLineStart() && this.text.startsWith('```', this.index)) {
        flushTextBuffer();
        const pre = this.parsePre();
        if (!pre) {
          return { nodes, foundStop: false, valid: false };
        }
        nodes.push(pre);
        continue;
      }

      if (this.text.startsWith('![', this.index)) {
        flushTextBuffer();
        const link = this.parseLink(true);
        if (!link) {
          return { nodes, foundStop: false, valid: false };
        }
        nodes.push(link);
        continue;
      }

      if (character === '[') {
        flushTextBuffer();
        const link = this.parseLink(false);
        if (!link) {
          return { nodes, foundStop: false, valid: false };
        }
        nodes.push(link);
        continue;
      }

      if (character === '`') {
        flushTextBuffer();
        const code = this.parseInlineCode();
        if (!code) {
          return { nodes, foundStop: false, valid: false };
        }
        nodes.push(code);
        continue;
      }

      if (this.text.startsWith('__', this.index)) {
        flushTextBuffer();
        const underline = this.parseFormat('__');
        if (!underline) {
          return { nodes, foundStop: false, valid: false };
        }
        nodes.push(underline);
        continue;
      }

      if (this.text.startsWith('||', this.index)) {
        flushTextBuffer();
        const spoiler = this.parseFormat('||');
        if (!spoiler) {
          return { nodes, foundStop: false, valid: false };
        }
        nodes.push(spoiler);
        continue;
      }

      if (character === '*' || character === '_' || character === '~') {
        flushTextBuffer();
        const format = this.parseFormat(character);
        if (!format) {
          return { nodes, foundStop: false, valid: false };
        }
        nodes.push(format);
        continue;
      }

      textBuffer += character;
      this.index++;
    }

    flushTextBuffer();
    return { nodes, foundStop: false, valid: true };
  }

  private parseBestEffortSequence(options: {
    allowBlockquotes: boolean;
    stopAtNewline: boolean;
    stopToken?: string;
  }): SequenceResult {
    const nodes: Node[] = [];
    let textBuffer = '';

    const flushTextBuffer = () => {
      if (textBuffer.length === 0) {
        return;
      }
      nodes.push({ kind: 'text', text: textBuffer });
      textBuffer = '';
    };

    while (this.index < this.text.length) {
      if (options.stopToken && this.text.startsWith(options.stopToken, this.index)) {
        flushTextBuffer();
        return { nodes, foundStop: true, valid: true };
      }

      const character = this.text[this.index];
      if (options.stopAtNewline && character === '\n') {
        flushTextBuffer();
        return { nodes, foundStop: false, valid: true };
      }

      if (character === '\\') {
        this.hasPotentialMarkdown = true;
        if (this.index === this.text.length - 1) {
          textBuffer += character;
          this.index += 1;
          continue;
        }
        textBuffer += this.text[this.index + 1];
        this.index += 2;
        continue;
      }

      if (
        options.allowBlockquotes &&
        this.isLineStart() &&
        (this.text.startsWith('**>', this.index) || this.text.startsWith('>', this.index))
      ) {
        const blockquote = this.tryParseNode((parser) => parser.parseBlockquote());
        if (blockquote) {
          flushTextBuffer();
          nodes.push(blockquote);
          continue;
        }
      }

      if (this.isLineStart() && this.text.startsWith('```', this.index)) {
        const pre = this.tryParseNode((parser) => parser.parsePre());
        if (pre) {
          flushTextBuffer();
          nodes.push(pre);
          continue;
        }
      }

      if (this.text.startsWith('![', this.index)) {
        const link = this.tryParseNode((parser) => parser.parseLink(true));
        if (link) {
          flushTextBuffer();
          nodes.push(link);
          continue;
        }
      }

      if (character === '[') {
        const link = this.tryParseNode((parser) => parser.parseLink(false));
        if (link) {
          flushTextBuffer();
          nodes.push(link);
          continue;
        }
      }

      if (character === '`') {
        const code = this.tryParseNode((parser) => parser.parseInlineCode());
        if (code) {
          flushTextBuffer();
          nodes.push(code);
          continue;
        }
      }

      if (this.text.startsWith('__', this.index)) {
        const underline = this.tryParseNode((parser) => parser.parseFormat('__'));
        if (underline) {
          flushTextBuffer();
          nodes.push(underline);
          continue;
        }
      }

      if (this.text.startsWith('||', this.index)) {
        const spoiler = this.tryParseNode((parser) => parser.parseFormat('||'));
        if (spoiler) {
          flushTextBuffer();
          nodes.push(spoiler);
          continue;
        }
      }

      if (character === '*' || character === '_' || character === '~') {
        const format = this.tryParseNode((parser) => parser.parseFormat(character));
        if (format) {
          flushTextBuffer();
          nodes.push(format);
          continue;
        }
      }

      textBuffer += character;
      this.index += 1;
    }

    flushTextBuffer();
    return { nodes, foundStop: false, valid: true };
  }

  private parseBlockquote(): Node | null {
    this.hasMarkdown = true;
    this.hasPotentialMarkdown = true;

    const hasExpandablePrefix = this.text.startsWith('**>', this.index);
    const rawLines: string[] = [];

    while (this.index < this.text.length) {
      if (!this.isLineStart()) {
        return null;
      }

      if (rawLines.length === 0 && hasExpandablePrefix) {
        if (!this.text.startsWith('**>', this.index)) {
          return null;
        }
        this.index += 3;
      } else {
        if (!this.text.startsWith('>', this.index)) {
          break;
        }
        this.index += 1;
      }

      const lineEnd = this.text.indexOf('\n', this.index);
      const currentLineEnd = lineEnd === -1 ? this.text.length : lineEnd;
      const line = this.text.slice(this.index, currentLineEnd);
      rawLines.push(line);
      this.index = currentLineEnd;

      if (this.index >= this.text.length || this.text[this.index] !== '\n') {
        break;
      }

      if (line.endsWith('||')) {
        break;
      }

      const nextLineStart = this.index + 1;
      const continuesBlockquote = this.text.startsWith('>', nextLineStart);

      if (!continuesBlockquote) {
        break;
      }
      this.index++;
    }

    if (rawLines.length === 0) {
      return null;
    }

    const expandableSuffixLineIndices = rawLines.flatMap((line, lineIndex) =>
      line.endsWith('||') ? [lineIndex] : [],
    );
    const hasExpandableSuffix = expandableSuffixLineIndices.length > 0;
    const expandable = hasExpandablePrefix || hasExpandableSuffix;

    if (hasExpandablePrefix && !hasExpandableSuffix) {
      return null;
    }

    const normalizedLines = rawLines.map((line, lineIndex) => {
      if (expandableSuffixLineIndices.includes(lineIndex)) {
        return line.slice(0, -2);
      }
      return line;
    });

    const lines = normalizedLines.map((line) => {
      const parser = new MarkdownV2SourceParser(line);
      const analysis = parser.parseInlineOnly();
      this.hasMarkdown ||= analysis.hasMarkdown;
      this.hasPotentialMarkdown ||= analysis.hasPotentialMarkdown;
      if (!analysis.isValid || analysis.renderedText === undefined) {
        return null;
      }

      const inlineParser = new MarkdownV2SourceParser(line);
      const sequence = inlineParser.parseSequence({
        allowBlockquotes: false,
        stopAtNewline: false,
      });
      if (!sequence.valid || sequence.foundStop || inlineParser.index !== line.length) {
        return null;
      }
      this.hasMarkdown ||= inlineParser.hasMarkdown;
      this.hasPotentialMarkdown ||= inlineParser.hasPotentialMarkdown;
      return sequence.nodes;
    });

    if (lines.some((line) => line === null)) {
      return null;
    }

    return {
      kind: 'blockquote',
      expandable,
      lines: lines.filter((line): line is Node[] => line !== null),
    };
  }

  private parsePre(): Node | null {
    this.hasMarkdown = true;
    this.hasPotentialMarkdown = true;
    this.index += 3;

    const languageLineEnd = this.text.indexOf('\n', this.index);
    if (languageLineEnd === -1) {
      return null;
    }

    const language = this.text.slice(this.index, languageLineEnd).trim();
    if (language !== '' && !/^[A-Za-z0-9_+-]+$/.test(language)) {
      return null;
    }

    const closingToken = '\n```';
    const closingIndex = this.text.indexOf(closingToken, languageLineEnd);
    if (closingIndex === -1) {
      return null;
    }

    const code = this.text.slice(languageLineEnd + 1, closingIndex);
    this.index = closingIndex + closingToken.length;
    return { kind: 'pre', language, text: code };
  }

  private parseLink(withBang: boolean): Node | null {
    this.hasMarkdown = true;
    this.hasPotentialMarkdown = true;
    this.index += withBang ? 2 : 1;

    const label = this.parseSequence({
      allowBlockquotes: false,
      stopAtNewline: true,
      stopToken: ']',
    });
    if (!label.valid || !label.foundStop) {
      return null;
    }

    this.index += 1;
    if (this.text[this.index] !== '(') {
      return null;
    }
    this.index += 1;

    let url = '';
    while (this.index < this.text.length) {
      const character = this.text[this.index];
      if (character === '\n') {
        return null;
      }
      if (character === '\\') {
        if (this.index === this.text.length - 1) {
          return null;
        }
        url += character + this.text[this.index + 1];
        this.index += 2;
        continue;
      }
      if (character === ')') {
        break;
      }
      url += character;
      this.index++;
    }

    if (this.index >= this.text.length || this.text[this.index] !== ')') {
      return null;
    }
    this.index += 1;

    if (withBang && !url.startsWith('tg://time?unix=')) {
      return null;
    }

    return { kind: 'link', label: label.nodes, url, withBang };
  }

  private parseInlineCode(): Node | null {
    this.hasMarkdown = true;
    this.hasPotentialMarkdown = true;
    this.index += 1;

    let code = '';
    while (this.index < this.text.length) {
      const character = this.text[this.index];
      if (character === '\n') {
        return null;
      }
      if (character === '\\') {
        if (this.index === this.text.length - 1) {
          return null;
        }
        code += this.text[this.index + 1];
        this.index += 2;
        continue;
      }
      if (character === '`') {
        this.index += 1;
        return { kind: 'code', text: code };
      }
      code += character;
      this.index++;
    }

    return null;
  }

  private parseFormat(marker: '*' | '_' | '__' | '~' | '||'): Node | null {
    this.hasPotentialMarkdown = true;
    this.hasMarkdown = true;
    this.index += marker.length;

    if (marker === '*' && this.text.startsWith('*', this.index)) {
      this.index += 1;
      return { kind: 'empty_bold' };
    }

    const inner = this.parseSequence({
      allowBlockquotes: false,
      stopAtNewline: false,
      stopToken: marker,
    });
    if (!inner.valid || !inner.foundStop) {
      return null;
    }
    if (inner.nodes.length === 0) {
      return null;
    }

    this.index += marker.length;
    return { kind: 'format', marker, children: inner.nodes };
  }

  private isLineStart(): boolean {
    return this.index === 0 || this.text[this.index - 1] === '\n';
  }

  private tryParseNode<T extends Node>(
    parse: (parser: MarkdownV2SourceParser) => T | null,
  ): T | null {
    const parser = new MarkdownV2SourceParser(this.text);
    parser.index = this.index;

    const node = parse(parser);
    if (node === null) {
      return null;
    }

    this.index = parser.index;
    this.hasMarkdown ||= parser.hasMarkdown;
    this.hasPotentialMarkdown ||= parser.hasPotentialMarkdown;
    return node;
  }
}

function renderNode(node: Node): string {
  if (node.kind === 'text') {
    return escapePlainText(node.text);
  }

  if (node.kind === 'empty_bold') {
    return '**';
  }

  if (node.kind === 'code') {
    return `\`${escapeCodeContent(node.text)}\``;
  }

  if (node.kind === 'pre') {
    return `\`\`\`${node.language}\n${escapeCodeContent(node.text)}\n\`\`\``;
  }

  if (node.kind === 'link') {
    const prefix = node.withBang ? '!' : '';
    return `${prefix}[${node.label.map(renderNode).join('')}](${escapeLinkUrl(node.url)})`;
  }

  if (node.kind === 'blockquote') {
    return node.lines
      .map((line, lineIndex) => {
        const prefix = node.expandable && lineIndex === 0 ? '**>' : '>';
        const suffix = node.expandable && lineIndex === node.lines.length - 1 ? '||' : '';
        const content = line.map(renderNode).join('');
        return `${prefix}${content}${suffix}`;
      })
      .join('\n');
  }

  const renderedChildren = node.children.map(renderNode).join('');
  return `${node.marker}${renderedChildren}${node.marker}`;
}

function analyzeTelegramMarkdown(text: string): Analysis {
  return new MarkdownV2SourceParser(text).analyze();
}

function parseDateTimeUrl(url: string): { date_time_format?: string; unix_time: number } | null {
  const match = /^tg:\/\/time\?unix=(\d+)(?:&format=([rwdDtT]+))?$/.exec(url);
  if (!match) {
    return null;
  }

  const unix_time = Number(match[1]);
  if (!Number.isSafeInteger(unix_time)) {
    return null;
  }

  const format = match[2];
  return format ? { unix_time, date_time_format: format } : { unix_time };
}

function renderEntityNodes(nodes: Node[]): {
  entities: TelegramRenderableEntity[];
  text: string;
} {
  let text = '';
  const entities: TelegramRenderableEntity[] = [];

  const appendNode = (node: Node) => {
    if (node.kind === 'text') {
      text += node.text;
      return;
    }

    if (node.kind === 'empty_bold') {
      return;
    }

    if (node.kind === 'code') {
      const offset = text.length;
      text += node.text;
      entities.push({ type: 'code', offset, length: node.text.length });
      return;
    }

    if (node.kind === 'pre') {
      const offset = text.length;
      text += node.text;
      entities.push({
        type: 'pre',
        offset,
        length: node.text.length,
        language: node.language || undefined,
      });
      return;
    }

    if (node.kind === 'format') {
      const offset = text.length;
      node.children.forEach(appendNode);
      const length = text.length - offset;
      if (length === 0) {
        return;
      }
      const type =
        node.marker === '*'
          ? 'bold'
          : node.marker === '_'
            ? 'italic'
            : node.marker === '__'
              ? 'underline'
              : node.marker === '~'
                ? 'strikethrough'
                : 'spoiler';
      entities.push({ type, offset, length } as Typegram.MessageEntity);
      return;
    }

    if (node.kind === 'link') {
      const offset = text.length;
      node.label.forEach(appendNode);
      const length = text.length - offset;
      if (length === 0) {
        return;
      }

      if (node.withBang) {
        const dateTime = parseDateTimeUrl(node.url);
        if (!dateTime) {
          throw new Error('Invalid tg://time link');
        }
        entities.push({ type: 'date_time', offset, length, ...dateTime });
        return;
      }

      entities.push({
        type: 'text_link',
        offset,
        length,
        url: node.url,
      });
      return;
    }

    if (node.kind === 'blockquote') {
      const offset = text.length;
      node.lines.forEach((line, lineIndex) => {
        line.forEach(appendNode);
        if (lineIndex !== node.lines.length - 1) {
          text += '\n';
        }
      });
      const length = text.length - offset;
      if (length === 0) {
        return;
      }
      entities.push({
        type: node.expandable ? 'expandable_blockquote' : 'blockquote',
        offset,
        length,
      });
    }
  };

  nodes.forEach(appendNode);

  entities.sort((left, right) => {
    if (left.offset !== right.offset) {
      return left.offset - right.offset;
    }
    return right.length - left.length;
  });

  return { text, entities };
}

export function containsSupportedMarkdownV2(text: string): boolean {
  return analyzeTelegramMarkdown(text).hasMarkdown;
}

export function isValidSupportedMarkdownV2(text: string): boolean {
  const analysis = analyzeTelegramMarkdown(text);
  return analysis.hasMarkdown && analysis.isValid;
}

export function renderSupportedMarkdownV2(text: string): string | null {
  const analysis = analyzeTelegramMarkdown(text);
  if (!analysis.hasMarkdown || !analysis.isValid) {
    return null;
  }
  return analysis.renderedText ?? null;
}

export function renderSupportedTelegramEntities(text: string): {
  entities: TelegramRenderableEntity[];
  text: string;
} | null {
  try {
    const strictAnalysis = analyzeTelegramMarkdown(text);
    if (strictAnalysis.hasMarkdown && strictAnalysis.isValid && strictAnalysis.nodes) {
      return renderEntityNodes(strictAnalysis.nodes);
    }

    const bestEffortAnalysis = new MarkdownV2SourceParser(text).analyzeBestEffort();
    if (!bestEffortAnalysis.hasMarkdown || !bestEffortAnalysis.nodes) {
      return null;
    }

    const rendered = renderEntityNodes(bestEffortAnalysis.nodes);
    return rendered.entities.length === 0 ? null : rendered;
  } catch {
    return null;
  }
}

export function renderSupportedTelegramDraftEntities(text: string): {
  entities: TelegramRenderableEntity[];
  text: string;
} | null {
  const rendered = renderSupportedTelegramEntities(text);
  if (rendered === null) {
    return null;
  }

  let trailingBlockquoteIndex = -1;
  let trailingBlockquoteEnd = -1;
  rendered.entities.forEach((entity, index) => {
    const entityEnd = entity.offset + entity.length;
    if (entity.type === 'blockquote' && entityEnd >= trailingBlockquoteEnd) {
      trailingBlockquoteIndex = index;
      trailingBlockquoteEnd = entityEnd;
    }
  });

  if (
    trailingBlockquoteIndex === -1 ||
    rendered.text.slice(trailingBlockquoteEnd).trim().length > 0
  ) {
    return rendered;
  }

  const entities = [...rendered.entities];
  entities[trailingBlockquoteIndex] = {
    ...entities[trailingBlockquoteIndex],
    type: 'expandable_blockquote',
  } as TelegramRenderableEntity;
  return { text: rendered.text, entities };
}

export function escapeTelegramMarkdownV2(text: string): string {
  return escapePlainText(text);
}

export function hasPotentialMarkdownV2(text: string): boolean {
  return analyzeTelegramMarkdown(text).hasPotentialMarkdown;
}
