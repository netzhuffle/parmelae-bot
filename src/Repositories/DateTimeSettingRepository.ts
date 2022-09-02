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
     * Updates an existing setting to a new Date.
     * @param setting The setting’s name
     * @param oldDate The old date (used as a fingerprint to avoid concurrent updates)
     * @param newDate The new date
     */
    async update(setting: string, oldDate: Date, newDate: Date): Promise<void> {
        await this.prisma.dateTimeSetting.updateMany({
            where: {
                setting,
                dateTime: oldDate,
            },
            data: {
                setting,
                dateTime: newDate,
            }
        });
    }
}
