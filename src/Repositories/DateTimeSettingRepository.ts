import {PrismaClient} from "@prisma/client";
import {singleton} from "tsyringe";

/** Manages DateTime settings. */
@singleton()
export class DateTimeSettingRepository {
    constructor(private readonly prisma: PrismaClient) {
    }

    /**
     * Gets the Date for a setting.
     *
     * Creates and stores in the database if it doesn’t exist.
     *
     * @param setting The setting’s name
     * @param startingValue The starting value if the setting does not exist yet
     */
    async get(setting: string, startingValue: Date): Promise<Date> {
        let dateTimeSetting = await this.prisma.dateTimeSetting.findUnique({
            where: {
                setting
            }
        });
        if (!dateTimeSetting) {
            dateTimeSetting = await this.prisma.dateTimeSetting.create({
                data: {
                    setting,
                    dateTime: startingValue,
                }
            });
        }
        return dateTimeSetting.dateTime;
    }

    /**
     * Updates an existing setting to a new Date, if it is newer than the current date.
     * @param setting The setting’s name
     * @param newDate The new date
     */
    async update(setting: string, newDate: Date): Promise<void> {
        const oldSetting = await this.prisma.dateTimeSetting.findUnique({
            where: {
                setting
            }
        });
        const oldDate = oldSetting?.dateTime;
        if (oldDate && oldDate >= newDate) {
            return;
        }

        await this.prisma.dateTimeSetting.updateMany({
            where: {
                setting,
                // Send old date as a fingerprint to make sure it didn’t get changed asynchronously in the meantime.
                dateTime: oldDate,
            },
            data: {
                setting,
                dateTime: newDate,
            }
        });
    }
}
