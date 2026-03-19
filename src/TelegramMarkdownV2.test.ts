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

  it('accepts blockquotes with repeated expandable markers on later lines', () => {
    const text =
      'Gerne — hier ein Beispiel:\n\n>Kurzfassung  \n>Die Lage ist stabil.  \n>Weitere Details folgen gleich.||\n>Längerer Abschnitt.  \n>Am Schluss bleibt alles ordentlich zusammengefasst.||';

    expect(containsSupportedMarkdownV2(text)).toBe(true);
    expect(isValidSupportedMarkdownV2(text)).toBe(true);
    expect(renderSupportedTelegramEntities(text)).toEqual({
      text: 'Gerne — hier ein Beispiel:\n\nKurzfassung  \nDie Lage ist stabil.  \nWeitere Details folgen gleich.\nLängerer Abschnitt.  \nAm Schluss bleibt alles ordentlich zusammengefasst.',
      entities: [
        {
          type: 'expandable_blockquote',
          offset: 28,
          length: 67,
        },
        {
          type: 'expandable_blockquote',
          offset: 96,
          length: 73,
        },
      ],
    });
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

  it('renders a long mixed message with normal and expandable blockquotes as entities', () => {
    const text = `Gerne — hier ist ein längeres Beispiel mit verschiedenen Markdown-Elementen:

*Wichtiger Einstieg*  
Das ist ein _kursiver_ Satz, daneben __unterstrichener__ Text und auch ~durchgestrichenes~ Altes.  
Ein kleines Geheimnis: ||das bleibt verborgen||.

\`inline_code_beispiel\`

\`\`\`text
Dies ist ein Codeblock.
Mehrzeilig.
Sauber formatiert.
\`\`\`

[Bundesrat](https://www.admin.ch/) ist ein nützlicher Link für den Alltag.

> Das ist ein normales Blockzitat.  
> Es kann mehrere Zeilen haben.  
> Und es bleibt gut lesbar.

>Kurzfassung  
>Die Lage ist stabil.  
>Weitere Details folgen gleich.||
>Längerer, einklappbarer Abschnitt:  
>Hier kann man mehrere Zeilen unterbringen.  
>Das eignet sich für Zusatzinformationen, Hintergrund und Notizen.  
>Auch etwas längere Texte passen hinein, wenn man sie kompakt halten will.  
>Am Schluss bleibt alles ordentlich zusammengefasst.||

Heute um 12:12 Uhr war die Lage jedenfalls übersichtlich.  
Wenn Sie wünschen, kann ich Ihnen als Nächstes eine noch stärkere Version schreiben, mit *mehr* Formatierung und etwas formellerem Ton.`;

    expect(renderSupportedTelegramEntities(text)).not.toBeNull();
  });

  it('keeps invalid markdown plaintext while still extracting later valid entities', () => {
    const text = 'Einleitung *fett* und *offen [Bundesrat](https://www.admin.ch/).';

    expect(renderSupportedTelegramEntities(text)).toEqual({
      text: 'Einleitung fett und *offen Bundesrat.',
      entities: [
        {
          type: 'bold',
          offset: 11,
          length: 4,
        },
        {
          type: 'text_link',
          offset: 27,
          length: 9,
          url: 'https://www.admin.ch/',
        },
      ],
    });
  });
});
