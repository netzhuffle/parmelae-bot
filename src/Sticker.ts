/**
 * A telegram sticker
 */
export class Sticker {
    /**
     * @param fileId - The telegram sticker’s file_id
     */
    constructor(public readonly fileId: string) {
    }
}
