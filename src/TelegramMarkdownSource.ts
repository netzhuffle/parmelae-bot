import * as Typegram from '@telegraf/types';

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

type TelegramMessageEntity = Typegram.MessageEntity | DateTimeEntity | ExpandableBlockquoteEntity;

type SupportedEntity =
  | (TelegramMessageEntity & { type: 'blockquote' })
  | (TelegramMessageEntity & { type: 'bold' })
  | (TelegramMessageEntity & { type: 'code' })
  | DateTimeEntity
  | ExpandableBlockquoteEntity
  | (TelegramMessageEntity & { type: 'italic' })
  | (TelegramMessageEntity & { language?: string; type: 'pre' })
  | (TelegramMessageEntity & { type: 'spoiler' })
  | (TelegramMessageEntity & { type: 'strikethrough' })
  | (TelegramMessageEntity & { type: 'text_link'; url: string })
  | (TelegramMessageEntity & { type: 'text_mention'; user: { id: number | bigint } })
  | (TelegramMessageEntity & { type: 'underline' });

interface EntityNode {
  children: EntityNode[];
  end: number;
  entity: TelegramMessageEntity;
  start: number;
}

const SOURCE_RESERVED_CHARACTERS = /[\\*_[\]()~|`]/g;
const LINK_URL_RESERVED_CHARACTERS = /[)\\]/g;
const CODE_RESERVED_CHARACTERS = /[`\\]/g;

function escapeMarkdownSourceText(text: string): string {
  return text.replaceAll(SOURCE_RESERVED_CHARACTERS, '\\$&').replaceAll(/(^|\n)>/g, '$1\\>');
}

function escapeLinkUrl(text: string): string {
  return text.replaceAll(LINK_URL_RESERVED_CHARACTERS, '\\$&');
}

function escapeCodeContent(text: string): string {
  return text.replaceAll(CODE_RESERVED_CHARACTERS, '\\$&');
}

function isSupportedEntity(entity: TelegramMessageEntity): entity is SupportedEntity {
  return [
    'bold',
    'blockquote',
    'code',
    'date_time',
    'expandable_blockquote',
    'italic',
    'pre',
    'spoiler',
    'strikethrough',
    'text_link',
    'text_mention',
    'underline',
  ].includes(entity.type);
}

function buildEntityTree(entities: TelegramMessageEntity[]): EntityNode[] {
  const sortedEntities = entities.toSorted((left, right) => {
    if (left.offset !== right.offset) {
      return left.offset - right.offset;
    }
    return right.length - left.length;
  });

  const roots: EntityNode[] = [];
  const stack: EntityNode[] = [];

  for (const entity of sortedEntities) {
    const node: EntityNode = {
      children: [],
      end: entity.offset + entity.length,
      entity,
      start: entity.offset,
    };

    while (stack.length > 0 && node.start >= stack[stack.length - 1].end) {
      stack.pop();
    }

    const parent = stack.at(-1);
    if (parent) {
      if (node.end > parent.end) {
        continue;
      }
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  }

  return roots;
}

function renderNodes(text: string, nodes: EntityNode[], start: number, end: number): string {
  let renderedText = '';
  let cursor = start;

  for (const node of nodes) {
    if (node.start > cursor) {
      renderedText += escapeMarkdownSourceText(text.slice(cursor, node.start));
    }
    renderedText += renderNode(text, node);
    cursor = node.end;
  }

  if (cursor < end) {
    renderedText += escapeMarkdownSourceText(text.slice(cursor, end));
  }

  return renderedText;
}

function renderBlockquote(text: string, node: EntityNode, expandable: boolean): string {
  const content = renderNodes(text, node.children, node.start, node.end);
  const lines = content.split('\n');
  return lines
    .map((line, lineIndex) => {
      const prefix = expandable && lineIndex === 0 ? '**>' : '>';
      const suffix = expandable && lineIndex === lines.length - 1 ? '||' : '';
      return `${prefix}${line}${suffix}`;
    })
    .join('\n');
}

function renderDateTimeEntity(entityText: string, entity: SupportedEntity): string {
  if (entity.type !== 'date_time') {
    return entityText;
  }

  const formatSuffix =
    entity.date_time_format && entity.date_time_format.length > 0
      ? `&format=${entity.date_time_format}`
      : '';
  return `![${escapeMarkdownSourceText(entityText)}](tg://time?unix=${entity.unix_time}${formatSuffix})`;
}

function renderNode(text: string, node: EntityNode): string {
  const entityText = text.slice(node.start, node.end);
  const childContent = renderNodes(text, node.children, node.start, node.end);

  if (!isSupportedEntity(node.entity)) {
    return childContent;
  }

  if (node.entity.type === 'bold') {
    return `*${childContent}*`;
  }

  if (node.entity.type === 'italic') {
    return `_${childContent}_`;
  }

  if (node.entity.type === 'underline') {
    return `__${childContent}__`;
  }

  if (node.entity.type === 'strikethrough') {
    return `~${childContent}~`;
  }

  if (node.entity.type === 'spoiler') {
    return `||${childContent}||`;
  }

  if (node.entity.type === 'code') {
    return `\`${escapeCodeContent(entityText)}\``;
  }

  if (node.entity.type === 'pre') {
    const language = node.entity.language ?? '';
    return `\`\`\`${language}\n${escapeCodeContent(entityText)}\n\`\`\``;
  }

  if (node.entity.type === 'blockquote') {
    return renderBlockquote(text, node, false);
  }

  if (node.entity.type === 'expandable_blockquote') {
    return renderBlockquote(text, node, true);
  }

  if (node.entity.type === 'text_link') {
    return `[${childContent || escapeMarkdownSourceText(entityText)}](${escapeLinkUrl(node.entity.url)})`;
  }

  if (node.entity.type === 'text_mention') {
    return `[${childContent || escapeMarkdownSourceText(entityText)}](tg://user?id=${node.entity.user.id})`;
  }

  if (node.entity.type === 'date_time') {
    return renderDateTimeEntity(entityText, node.entity);
  }

  return childContent;
}

export function renderTelegramMarkdownSource(
  text: string,
  entities?: Typegram.MessageEntity[],
): string {
  if (!entities?.length) {
    return escapeMarkdownSourceText(text);
  }

  const roots = buildEntityTree(entities as TelegramMessageEntity[]);
  return renderNodes(text, roots, 0, text.length);
}
