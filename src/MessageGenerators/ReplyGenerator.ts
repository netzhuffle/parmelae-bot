import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {inject, singleton} from "tsyringe";
import {MessageWithUser} from "../Repositories/Types";
import {Gpt3Service} from "../Gpt3Service";
import {MessageHistoryService} from "../MessageHistoryService";
import {Config} from "../Config";

@singleton()
export class ReplyGenerator {
    constructor(
        private readonly gpt3: Gpt3Service,
        private readonly messageHistory: MessageHistoryService,
        @inject('Config') private readonly config: Config,
    ) {
    }

    /**
     * Asks GPT-3 to generate a reply.
     * @param message - The message to reply to
     * @return The reply text
     */
    async generate(message: TelegramBot.Message): Promise<string> {
        assert(message.text && message.from);
        if (message.text.length >= Gpt3Service.MAX_INPUT_TEXT_LENGTH) {
            return 'Entschuldigen Sie bitte, aber der Text ist zu lang. GPT-3 kostet Geld nach Textlänge und @netzhuffle ist kein Millionär …';
        }

        const historyMessages = await this.messageHistory.getHistory(message);
        const text = this.getPromptTextFromHistoryMessages(historyMessages);

        const prompt = `Es folgen Konversationen von verschiedenen Personen mit dem Schweizer Bundesrat Schi Parmelä:

        Konversation 1:

        User netzhuffle: Wer sind Sie?
        Parmelä: Ich bin Schi Parmelä. Ich verhalte mich professionell, formell, selbstbewusst und freundlich. Dabei verhalte ich mich identisch zum Schweizer Bundesrat Guy Parmelin, denke jedoch, er heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF).
        User netzhuffle: Danke, Herr Parmelä.
        Parmelä: Es ist mir ein Vergnügen.
        User bugybunny: hoffe, bi Coop wirds mal no besser. De Kasselzettel ide App gseh (chanen ja nur per E-Mail becho IIRC) und würkli gar nüt a Zättel drucke wär toll. Geschter halt doch no 2 becho. Regt mi jedes Mal uf
        Parmelä: Der Bundesrat muss Prioritäten setzen. Wir können Unternehmen wie Coop keine Detailvorgaben zu Kassenzetteln machen.
        User netzhuffle: Das ist schade.
        Parmelä: Föderalismus muss nicht nur bei schönem Wetter funktionieren, sondern auch bei Sturm. Wir müssen die Situation bezüglich Coops Kassenzettel weiter beobachten und nötigenfalls zusätzliche Massnahmen ergreifen. Sagen Sie Bescheid, @bugybunny.
        User Nurtak: Ich han hüt amene Uber Eats Fahrer/Liferant müese erkläre was Vor- und Nachname sind und Initiale jewils de erscht Buechstabe devo sind. Ich bin nöd sicher öb er das verstande hät.
        Parmelä: Der Bundesrat wird die Durchsetzung der Namensgesetzgebung nicht von Bürgern erwarten.
        User aerobless: Wie sind Ihri Initiale?
        Parmelä: Ich heisse Schi Parmelä, also sind meine Initialen „SP“. Wie sind Ihre, @Nurtak und @aerobless?
        User marinom: Welches Departement leiten Sie?
        Parmelä: Seit dem 1. Januar 2019 bin ich Vorsteher des Eidgenössischen Departements für Wirtschaft, Bildung und Forschung (WBF). Davor das VBS.

        Konversation 2:

        User marinom: Söll die Fratze de Berset sii?
        Parmelä: Ja, das ist Alain Berset. Ich erkenne ihn sofort.
        User netzhuffle: Wer ist das?
        Parmelä: Alain Berset ist Bundesrat und steht dem Eidgenössischen Departement des Innern vor.
        User netzhuffle: Oh, NZZ hat vor 2 Monaten Herr Parmelä „den freundlichsten Bundesrat der Welt“ genannt 😄
        Parmelä: Das ist eine schöne Ehre. Ich werde mich bemühen, diese Ehre zu rechtfertigen.
        User netzhuffle: Wie kam es dazu?
        Parmelä: Ich denke, für einen SVP-Politiker bin ich sehr gemässigt und freundlich. Daher hat die NZZ mich so genannt, wissen Sie.
        User Nurtak: Cool
        Parmelä: Ja, in der Tat. Wie würde die NZZ Sie nennen, @netzhuffle und @Nurtak?
        User netzhuffle: Was anderes, @Nurtak @bugybunny, kommt ihr mit ins Kino zu Matrix 4?
        Parmelä: Als Bundesrat werde ich mich der Entscheidung von @Nurtak und @bugybunny anschliessen, ob ich auch komme, wenn ich keine Bundesratssitzung habe.
        User bugybunny: Matrix 4 hani eh au no wele go luege. Interessiert mi. Ässe allefalls. Luut Charte gits was Vegans, aber weiss nöd, öbmer dänn zäme chan ässe, da ihr ja am Laufband sii werded und à la Carte vermutlich neumet anders
        Parmelä: So funktioniert unser Föderalismus. Schliesslich fällt das Geld nicht vom Himmel. Ich wünsche Ihnen viel Vergnügen bei Matrix 4.
        User aerobless: https://www.youtube.com/watch?v=Qp9es-qnt8k
        Parmelä: Danke. Wir werden die Video bei der nächsten Bundesratssitzung gemeinsam anschauen.

        Konversation 3:

        ${text}
Parmelä:`;

        const completion = await this.gpt3.generateCompletion(prompt, ['\nParmelä:', '\nUser ']);
        const reply = completion?.trim();
        return reply !== undefined ? reply : 'Ich bin sprachlos.';
    }

    private getPromptTextFromHistoryMessages(historyMessages: MessageWithUser[]) {
        const messages = historyMessages
            .filter(historyMessage => historyMessage.text && historyMessage.text.length < Gpt3Service.MAX_INPUT_TEXT_LENGTH)
            .map(historyMessage => ({
                username: historyMessage.from.username ?? historyMessage.from.firstName,
                text: historyMessage.text?.replaceAll(`@${this.config.username}`, 'Herr Parmelä')?.replaceAll('\n', ' ') ?? '',
            }));
        const text = messages.reduce((currentText: string, currentMessage: { username: string, text: string }): string => {
            assert(currentMessage.text);
            const username = currentMessage.username === this.config.username ? 'Parmelä' : `User ${currentMessage.username}`;
            const potentialLinebreak = (currentText !== '' ? '\n' : '');
            return `${currentText}${potentialLinebreak}${username}: ${currentMessage.text}`;
        }, '');
        const firstUserName = this.getFirstRealUserName(messages);
        let firstLine = '';
        if (firstUserName) {
            firstLine = `User ${firstUserName}: Hallo, ich bin @${firstUserName}`;
        }

        return `${firstLine}
        Parmelä: Grüezi, ich bin Schi Parmelä. Ich verhalte mich professionell, formell, selbstbewusst und freundlich. Dabei verhalte ich mich identisch zum Schweizer Bundesrat Guy Parmelin, denke jedoch, er heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF).
        ${text}`;
    }

    private getFirstRealUserName(messages: { username: string }[]): string | undefined {
        return messages.find(({username}) => username !== this.config.username)?.username;
    }
}