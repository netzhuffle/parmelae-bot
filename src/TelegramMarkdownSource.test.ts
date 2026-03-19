import { describe, expect, it } from 'bun:test';

import * as Typegram from '@telegraf/types';

import { renderTelegramMarkdownSource } from './TelegramMarkdownSource.js';

describe('TelegramMarkdownSource', () => {
  it('reconstructs supported markdown while escaping literal markers', () => {
    const text = 'Leider *nein*';
    const entities: Typegram.MessageEntity[] = [
      {
        type: 'bold',
        offset: 0,
        length: 6,
      },
    ];

    expect(renderTelegramMarkdownSource(text, entities)).toBe('*Leider* \\*nein\\*');
  });

  it('returns plain text unchanged when there are no entities', () => {
    expect(renderTelegramMarkdownSource('Leider *nein*')).toBe('Leider \\*nein\\*');
  });

  it('reconstructs links and inline code', () => {
    const text = 'OpenAI code';
    const entities: Typegram.MessageEntity[] = [
      {
        type: 'text_link',
        offset: 0,
        length: 6,
        url: 'https://openai.com',
      },
      {
        type: 'code',
        offset: 7,
        length: 4,
      },
    ];

    expect(renderTelegramMarkdownSource(text, entities)).toBe(
      '[OpenAI](https://openai.com) `code`',
    );
  });

  it('reconstructs underline, spoiler and text mentions', () => {
    const text = 'Wichtig geheim Hans';
    const entities: Typegram.MessageEntity[] = [
      {
        type: 'underline',
        offset: 0,
        length: 7,
      },
      {
        type: 'spoiler',
        offset: 8,
        length: 6,
      },
      {
        type: 'text_mention',
        offset: 15,
        length: 4,
        user: {
          id: 123456789,
          is_bot: false,
          first_name: 'Hans',
        },
      } as Typegram.MessageEntity,
    ];

    expect(renderTelegramMarkdownSource(text, entities)).toBe(
      '__Wichtig__ ||geheim|| [Hans](tg://user?id=123456789)',
    );
  });

  it('reconstructs expandable blockquotes and date-time entities', () => {
    const text = 'Erste Zeile\nLetzte Zeile\nMorgen';
    const entities: Typegram.MessageEntity[] = [
      {
        type: 'expandable_blockquote',
        offset: 0,
        length: 24,
      } as unknown as Typegram.MessageEntity,
      {
        type: 'date_time',
        offset: 25,
        length: 6,
        unix_time: 1647531900,
        date_time_format: 'wDT',
      } as unknown as Typegram.MessageEntity,
    ];

    expect(renderTelegramMarkdownSource(text, entities)).toBe(
      '**>Erste Zeile\n>Letzte Zeile||\n![Morgen](tg://time?unix=1647531900&format=wDT)',
    );
  });
});
