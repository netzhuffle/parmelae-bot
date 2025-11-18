/**
 * Fake implementation of DateTimeSettingRepository for testing.
 */
export class DateTimeSettingRepositoryFake {
  private settings = new Map<string, Date>();
  public getCallArgs: { setting: string; startingValue: Date }[] = [];
  public updateCallArgs: { setting: string; newDate: Date }[] = [];

  get(setting: string, startingValue: Date): Promise<Date> {
    this.getCallArgs.push({ setting, startingValue });
    if (this.settings.has(setting)) {
      return Promise.resolve(this.settings.get(setting)!);
    }
    this.settings.set(setting, startingValue);
    return Promise.resolve(startingValue);
  }

  update(setting: string, newDate: Date): Promise<void> {
    this.updateCallArgs.push({ setting, newDate });
    this.settings.set(setting, newDate);
    return Promise.resolve();
  }

  /**
   * Sets a stored date value (for testing invalid dates).
   */
  setStoredDate(setting: string, date: Date): void {
    this.settings.set(setting, date);
  }

  /**
   * Clears all stored settings and call args.
   */
  reset(): void {
    this.settings.clear();
    this.getCallArgs = [];
    this.updateCallArgs = [];
  }
}
