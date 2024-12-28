import { injectable } from 'inversify';
import { Tool } from '@langchain/core/tools';

@injectable()
export class DateTimeTool extends Tool {
  name = 'date-time';

  description =
    'Useful to get the current date and/or time. Input is an empty string.';

  protected _call(): Promise<string> {
    const dateTime = new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Zurich',
    });
    return Promise.resolve(`It is ${dateTime} local time in Switzerland.`);
  }
}
