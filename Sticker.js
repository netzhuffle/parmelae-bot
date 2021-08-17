'use strict';

/**
 * A telegram sticker
 */
class Sticker {
    /**
     * Constructs a sticker
     * @param {string} fileId - The telegram sticker’s file_id
     */
    constructor(fileId) {
        this.fileId = fileId;
    }
}

module.exports = Sticker;
