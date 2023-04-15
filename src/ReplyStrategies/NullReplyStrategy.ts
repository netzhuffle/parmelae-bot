import {ReplyStrategy} from "../ReplyStrategy";
import {injectable} from "inversify";

/** Handles all messages by doing nothing. */
@injectable()
export class NullReplyStrategy implements ReplyStrategy {
    willHandle(): boolean {
        return true;
    }

    async handle(): Promise<void> {
        // Do nothing.
    }
}
