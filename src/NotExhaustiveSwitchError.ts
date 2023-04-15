/** Error for Switch that should handle all cases but doesn’t. */
export class NotExhaustiveSwitchError extends Error {
    /** The type never will lead to a compile-time error if the switch is not exhaustive. */
    constructor(value: never) {
        /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */
        super(`Unknown value: ${value}`);
    }
}
