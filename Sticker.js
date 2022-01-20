'use strict';

/**
 * A telegram sticker
 */
export class Sticker {
    /**
     * Constructs a sticker
     * @param {string} fileId - The telegram sticker’s file_id
     */
    constructor(fileId) {
        this.fileId = fileId;
    }
}
