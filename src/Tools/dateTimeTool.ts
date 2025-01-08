import { tool } from '@langchain/core/tools';

export const dateTimeTool = tool(
  async (): Promise<string> => {
    const dateTime = new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Zurich',
    });
    return Promise.resolve(`It is ${dateTime} local time in Switzerland.`);
  },
  {
    name: 'date-time',
    description: 'Useful to get the current date and/or time.',
  },
);
