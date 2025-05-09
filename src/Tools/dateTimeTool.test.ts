import { dateTimeTool } from './dateTimeTool.js';

describe('dateTimeTool', () => {
  let originalDate: DateConstructor;

  beforeAll(() => {
    originalDate = global.Date;
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  beforeEach(() => {
    const mockDate = new Date('2024-01-15T14:30:00Z');
    global.Date = class extends Date {
      constructor() {
        super();
        return mockDate;
      }
    } as DateConstructor;
  });

  it('should return current date and time in Swiss timezone', async () => {
    const result = await dateTimeTool.invoke({});

    expect(result).toBe(
      'It is 1/15/2024, 3:30:00 PM local time in Switzerland.',
    );
  });
});
