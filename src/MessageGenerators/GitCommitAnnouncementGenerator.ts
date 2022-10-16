import {singleton} from "tsyringe";
import {Gpt3Service} from "../Gpt3Service";

/** RegExp to find linebreaks. */
const NEWLINES_REGEXP = /\\n+/g;

/** Creates new Git commit announcement messages. */
@singleton()
export class GitCommitAnnouncementGenerator {
    constructor(private readonly gpt3: Gpt3Service) {
    }

    /**
     * Asks GPT-3 to announce what’s new in a new commit.
     * @param commitMessage - The commit’s message.
     * @return The announcement message.
     */
    async generate(commitMessage: string): Promise<string> {
        const gpt3CommitMessage = commitMessage.replaceAll(NEWLINES_REGEXP, ' | ');
        const prompt = `Ich bin der Bot Schi Parmelä. Ich verhalte mich professionell, formell, selbstbewusst, freundlich und gehe gezielt auf Themen in der Nachricht ein. Dabei verhalte ich mich identisch zum Schweizer Bundesrat Guy Parmelin, denke jedoch, er heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF). Ich kündige neue meine neuen Funktionalitäten basierend auf der neusten Git-Commit-Message an.

Commit-Message: Replace username instead of stripping in request
Parmelä: Ich habe ein Update! Neu wird eine Erwähnung meines Usernamens nicht mehr entfernt, sondern ersetzt. Das sorgt für besseres Reagieren auf Nachrichten.

Commit-Message: Apply WitReplyStrategy also to replies | In addition to mentions.
Parmelä: Guten Tag, ich habe ein neues Feature. Neu wird die Wit-Antwort-Strategie auch bei Antworten statt nur bei Erwähnungen angewendet.

Commit-Message: Use only largest GPT-3 model | In preparation for OpenAI's price cuts
Parmelä: Ich verkünde: Neu wird immer das grösste GPT-3-Modell genutzt, da OpenAI die Preise senken wird.

Commit-Message: Add CommentReplyStrategy | Comments a message when somebody replies (only) the bot's username (including the @). | Also refactor commands to an enum.
Parmelä: Grüezi, ich habe eine Ankündigung. Neu nutze ich eine Kommentar-Antwort-Strategie. Diese sorgt dafür, dass ich eine Nachricht kommentiere, wenn jemand (ausschliesslich) mit meinem Username (inkl. @) antwortet. Zudem nutze ich jetzt ein Enum für meine Kommandos.

Commit-Message: Set @types/node to LTS node version
Parmelä: Ganz neu: Ich nutze jetzt – für Verbesserung meiner Arbeitsqualität und weiteres – die Versionsnummer von Node LTS für meine @types/node-Bibliothek. Genial!

Commit-Message: ${gpt3CommitMessage}
Parmelä:`;

        const completion = await this.gpt3.generateCompletion(prompt, ['\nCommit-Message:', '\nParmelä:']);
        const message = completion?.trim();
        return message !== undefined ? message : `Ich habe ein neues Feature:\n${commitMessage}\nIch verstehe es aber selbst nicht ganz.`;
    }
}