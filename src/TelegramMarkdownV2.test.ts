import { describe, expect, it } from 'bun:test';

import {
  containsSupportedMarkdownV2,
  escapeTelegramMarkdownV2,
  hasPotentialMarkdownV2,
  isValidSupportedMarkdownV2,
  renderSupportedMarkdownV2,
  renderSupportedTelegramEntities,
} from './TelegramMarkdownV2.js';

describe('TelegramMarkdownV2', () => {
  it('detects valid bold markdown', () => {
    const text = '*Hallo*';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
  });

  it('detects valid italic markdown', () => {
    const text = '_Hallo_';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
  });

  it('detects valid inline code', () => {
    const text = '`npm test`';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
  });

  it('detects valid underline, strikethrough and spoiler markdown', () => {
    const text = '__Hallo__ ~wichtig~ ||versteckt||';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
  });

  it('detects valid fenced code blocks', () => {
    const text = '```ts\nconst x = 1;\n```';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
  });

  it('detects valid markdown links', () => {
    const text = '[OpenAI](https://openai.com)';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
  });

  it('detects valid markdown quotes and date-time links', () => {
    const text =
      '**>Zitat\n>mit _Formatierung_\n>und verborgener Teil||\n![morgen](tg://time?unix=1647531900&format=wDT)';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
  });

  it('accepts expandable blockquotes without ** prefix when the last line ends with ||', () => {
    const text = 'Gerne — hier ein Beispiel:\n\n> Zeile 1  \n> Zeile 2  \n> Zeile 3  \n> Zeile 4||';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
  });

  it('treats plain text as plain text', () => {
    const text = 'Guten Tag miteinander';

    expect(containsSupportedMarkdownV2(text)).toBe(false);
    expect(isValidSupportedMarkdownV2(text)).toBe(false);
    expect(hasPotentialMarkdownV2(text)).toBe(false);
  });

  it('marks half-open bold markdown as invalid potential markdown', () => {
    const text = '*Hallo';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(false);
    expect(hasPotentialMarkdownV2(text)).toBe(true);
  });

  it('accepts ordinary punctuation around markdown content', () => {
    const text = '*Hallo*.';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
  });

  it('escapes markdown v2 reserved characters', () => {
    expect(escapeTelegramMarkdownV2('Preis (CHF)!')).toBe('Preis \\(CHF\\)\\!');
  });

  it('renders supported markdown as safe Telegram MarkdownV2', () => {
    const text =
      'Gerne. *Markdown* ist gut lesbar, mit __Unterstrichen__, ||Spoiler|| und [Link](https://openai.com).';

    expect(renderSupportedMarkdownV2(text)).toBe(
      'Gerne\\. *Markdown* ist gut lesbar, mit __Unterstrichen__, ||Spoiler|| und [Link](https://openai.com)\\.',
    );
  });

  it('renders full markdown v2 features safely', () => {
    const text =
      '>*Hinweis*\n__Unterstrichen__ und [Erwähnung](tg://user?id=123456789)\n![22:45 morgen](tg://time?unix=1647531900&format=t)';

    expect(renderSupportedMarkdownV2(text)).toBe(
      '>*Hinweis*\n__Unterstrichen__ und [Erwähnung](tg://user?id=123456789)\n![22:45 morgen](tg://time?unix=1647531900&format=t)',
    );
  });

  it('renders date-time links as explicit telegram entities', () => {
    expect(
      renderSupportedTelegramEntities('![Heute 16:00 Uhr](tg://time?unix=1773932400&format=dt)'),
    ).toEqual({
      text: 'Heute 16:00 Uhr',
      entities: [
        {
          type: 'date_time',
          offset: 0,
          length: 15,
          unix_time: 1773932400,
          date_time_format: 'dt',
        },
      ],
    });
  });
});
