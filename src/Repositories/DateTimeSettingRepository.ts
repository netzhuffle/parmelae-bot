import { PrismaClient } from '../generated/prisma/client.js';
import { injectable } from 'inversify';

/** Manages DateTime settings. */
@injectable()
export class DateTimeSettingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Gets the Date for a setting.
   *
   * Creates and stores in the database if it doesn't exist.
   * If the stored date is invalid, returns the startingValue and logs a warning.
   *
   * @param setting The setting’s name
   * @param startingValue The starting value if the setting does not exist yet
   */
  async get(setting: string, startingValue: Date): Promise<Date> {
    const dateTimeSetting =
      (await this.prisma.dateTimeSetting.findUnique({
        where: {
          setting,
        },
      })) ??
      (await this.prisma.dateTimeSetting.create({
        data: {
          setting,
          dateTime: startingValue,
        },
      }));

    const storedDate = dateTimeSetting.dateTime;
    if (!this.isValidDate(storedDate)) {
      console.warn(
        `Invalid date stored for setting "${setting}". Using starting value instead.`,
      );
      // Repair the corrupted value by updating it with the starting value
      await this.prisma.dateTimeSetting.update({
        where: { setting },
        data: { dateTime: startingValue },
      });
      return startingValue;
    }

    return storedDate;
  }

  /**
   * Updates an existing setting to a new Date, if it is newer than the current date.
   * @param setting The setting’s name
   * @param newDate The new date
   */
  async update(setting: string, newDate: Date): Promise<void> {
    if (!this.isValidDate(newDate)) {
      throw new Error(
        `Cannot update setting "${setting}": provided date is invalid`,
      );
    }

    const oldSetting = await this.prisma.dateTimeSetting.findUnique({
      where: {
        setting,
      },
    });
    const oldDate = oldSetting?.dateTime;

    // If oldDate exists but is invalid, treat it as if there's no old date
    const validOldDate = oldDate && this.isValidDate(oldDate) ? oldDate : null;

    if (validOldDate && validOldDate >= newDate) {
      return;
    }

    // If oldDate was invalid, we can't use it in the where clause for updateMany
    // Instead, use update directly (which will fail if setting doesn't exist, which is fine)
    if (!validOldDate) {
      await this.prisma.dateTimeSetting.update({
        where: { setting },
        data: { dateTime: newDate },
      });
      return;
    }

    await this.prisma.dateTimeSetting.updateMany({
      where: {
        setting,
        // Send old date as a fingerprint to make sure it didn't get changed asynchronously in the meantime.
        dateTime: validOldDate,
      },
      data: {
        setting,
        dateTime: newDate,
      },
    });
  }

  private isValidDate(date: unknown): date is Date {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }
}
