/**
 * A telegram sticker
 */
export class Sticker {
    /** The telegram sticker’s file_id */
    public readonly fileId: string;

    /**
     * @param fileId - The telegram sticker’s file_id
     */
    constructor(fileId: string) {
        this.fileId = fileId;
    }
}
