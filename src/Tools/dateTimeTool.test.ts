import { describe, it, beforeEach, expect, setSystemTime } from 'bun:test';
import { dateTimeTool } from './dateTimeTool.js';

describe('dateTimeTool', () => {
  beforeEach(() => {
    setSystemTime(new Date('2024-01-15T14:30:00Z'));
  });

  it('should return current date and time in Swiss timezone', async () => {
    const result = await dateTimeTool.invoke({});

    expect(result).toBe(
      'It is 1/15/2024, 3:30:00 PM local time in Switzerland.',
    );
  });
});
