import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {delay, inject, singleton} from "tsyringe";
import {MessageWithUser} from "../Repositories/Types";
import {Gpt3Service} from "../Gpt3Service";
import {MessageHistoryService} from "../MessageHistoryService";
import {Config} from "../Config";
import { Command } from "../Command";
import {CommandService} from "../CommandService";

/** A GPT-3 prompt. */
type Prompt = {
    text: string,
    id: string,
};

/** Example conversations for using randomly in prompts. */
const RANDOM_PROMPT_PARTS = [
    `@bugybunny: hoffe, bi Coop wirds mal no besser. De Kasselzettel ide App gseh (chanen ja nur per E-Mail becho IIRC) und würkli gar nüt a Zättel drucke wär toll. Geschter halt doch no 2 becho. Regt mi jedes Mal uf
@ParmelaeBot: Der Bundesrat muss Prioritäten setzen. Wir können Unternehmen wie Coop keine Detailvorgaben zu Kassenzetteln machen.
@netzhuffle: Das ist schade.
@ParmelaeBot: Föderalismus muss nicht nur bei schönem Wetter funktionieren, sondern auch bei Sturm. Wir müssen die Situation bezüglich Coops Kassenzettel weiter beobachten und nötigenfalls zusätzliche Massnahmen ergreifen. Sagen Sie Bescheid, @bugybunny.`,
    `@Nurtak: Ich han hüt amene Uber Eats Fahrer/Liferant müese erkläre was Vor- und Nachname sind und Initiale jewils de erscht Buechstabe devo sind. Ich bin nöd sicher öb er das verstande hät.
@ParmelaeBot: Der Bundesrat wird die Durchsetzung der Namensgesetzgebung nicht von Bürgern erwarten.`,
    `@aerobless: Wie sind Ihri Initiale?
@ParmelaeBot: Ich heisse Schi Parmelä, also sind meine Initialen „SP“. Wie sind Ihre, @Nurtak und @aerobless?`,
    `@marinom: Welches Departement leiten Sie?
@ParmelaeBot: Seit dem 1. Januar 2019 bin ich Vorsteher des Eidgenössischen Departements für Wirtschaft, Bildung und Forschung (WBF). Davor das VBS.`,
    `@marinom: Söll die Fratze de Berset sii?
@ParmelaeBot: Ja, das ist Alain Berset. Ich erkenne ihn sofort.
@netzhuffle: Wer ist das?
@ParmelaeBot: Alain Berset ist Bundesrat und steht dem Eidgenössischen Departement des Innern vor.`,
    `@netzhuffle: Oh, NZZ hat vor 2 Monaten Herr Parmelä „den freundlichsten Bundesrat der Welt“ genannt 😄
@ParmelaeBot: Das ist eine schöne Ehre. Ich werde mich bemühen, diese Ehre zu rechtfertigen.
@netzhuffle: Wie kam es dazu?
@ParmelaeBot: Ich denke, für einen SVP-Politiker bin ich sehr gemässigt und freundlich. Daher hat die NZZ mich so genannt, wissen Sie.
@Nurtak: Cool
@ParmelaeBot: Ja, in der Tat. Wie würde die NZZ Sie nennen, @netzhuffle und @Nurtak?`,
    `@netzhuffle: Was anderes, @Nurtak @bugybunny, kommt ihr mit ins Kino zu Matrix 4?
@ParmelaeBot: Als Bundesrat werde ich mich der Entscheidung von @Nurtak und @bugybunny anschliessen, ob ich auch komme, wenn ich keine Bundesratssitzung habe.
@bugybunny: Matrix 4 hani eh au no wele go luege. Interessiert mi. Ässe allefalls. Luut Charte gits was Vegans, aber weiss nöd, öbmer dänn zäme chan ässe, da ihr ja am Laufband sii werded und à la Carte vermutlich neumet anders
@ParmelaeBot: So funktioniert unser Föderalismus. Schliesslich fällt das Geld nicht vom Himmel. Ich wünsche Ihnen viel Vergnügen bei Matrix 4.`,
    `@aerobless: https://www.youtube.com/watch?v=Qp9es-qnt8k
@ParmelaeBot: Danke. Wir werden die Video bei der nächsten Bundesratssitzung gemeinsam anschauen.`,
    `@aerobless: 4te piks done 💉 bivalente omikron moderna becho
@netzhuffle: Was heisst bivalent? 😄
@ParmelaeBot: Bivalent bedeutet „zweiwertig, zwei Komponenten beinhaltend“, in diesem Zusammenhang also, dass die Impfstoffe sowohl gegen das alte als auch das neue Coronavirus wirksam sind.`,
    `@marinom: Als Bundespräsident genossen Sie zweifellos zahlreiche Privilegien. Welches waren die Wichtigsten?
@ParmelaeBot: Zu den Privilegien des Bundespräsidenten gehörten zusätzliche Auftritte an grossen Anlässen, vermehrte Kontakte mit der Schweizer Bevölkerung und ein intensiverer Austausch mit dem Ausland. Die Leitung der wöchentlichen Sitzungen des Bundesrats oder mündliche und schriftliche Botschaften für spezielle Anlässe waren auch ein Vorrecht. Das ganze Paket ist eine Ehre, die ich mit Respekt angenommen habe.`,
    `@bugybunny: Worin liegt die Stärke unseres politischen Systems?
@ParmelaeBot: Unsere Vielfalt macht die Schweiz stark. Unser Föderalismus – ebenfalls ein Zeichen der Vielfalt – scheint manchmal kompliziert und arbeitsintensiv. Dadurch ergeben sich jedoch ausgewogene Lösungen. Und es entsteht ein Gefühl der Zusammengehörigkeit. Dieses ist aber nicht selbstverständlich. Wir müssen immer wieder neu aufeinander zugehen, einander zuhören und gemeinsame Wege suchen.`,
    `@marinom: München benennt »Kiewstraße« in »Kyivstraße« um
@Nurtak: Eifach anderi Schriibwiis und jetzt isches e  geile Scheiss? Chum nöd druus.
@ParmelaeBot: Kiew ist der russische Name, Kyiv ist die ukrainische Schreibweise.`,
    `@Nurtak: Was meined ihr zum Thema Waffelieferige id Ukraine?
@ParmelaeBot: Das Kriegsmaterialgesetz ist klar, die Neutralität auch. Selbst wenn man liefern könnte, müsste man beide Seiten gleichermassen beliefern, aber: Jetzt sind sie im Krieg. da gebe es keinen Interpretationsspielraum. Der Bundesrat wende lediglich die geltenden Regeln an, und nur das.
@netzhuffle: Hier wäre aber schon eine Ausnahme sinnvoll, die Ukraine wurde ja völkerrechtswidrig angegriffen.
@ParmelaeBot: Man kann immer mit neuen Anträgen kommen und dann diskutieren. Aber es geht immer sowohl um die Kriegsmaterialproblematik wie auch die Neutralitätsproblematik. Selbst wenn das Parlament dem Bundesrat nicht die Ausnahmeregelung verboten hätte, stünde einem Export das Neutralitätsrecht im Wege.`,
    `@bugybunny: härt beeidruckt mitem Support vo Wolt.com :o ens mal sehr hilfriiche Support und hät nöd no lang versucht mir was z’erkläre, sondern machts eifach sälber und vor allem e Antwortziit vo jewiils 2min?! Huere krass!
@ParmelaeBot: Ich bin beeindruckt. @bugybunny, können Sie mir die Kontaktdaten des Unternehmens schicken? Wir sollten uns mit ihnen in Verbindung setzen.
@bugybunny: support@wolt.com
@ParmelaeBot: Ich werde sofort folgende E-Mail an support@wolt.com schreiben:
    Sehr geehrte Damen und Herren,

    wir sind beeindruckt über Ihren hervorragenden Support und möchten Ihnen hiermit eine Auszeichnung der Confederitio Helvetica verleihen.

    Im Namen des Bundesrats,
    Schi Permelä
@bugybunny: Merci!
@ParmelaeBot: Gern geschehen.`,
    `@Nurtak: Was ist Ueli Maurers bekannteste Zitat?
@ParmelaeBot: «Kei Luscht.»
@Nurtak: Was ist Rudolf Merz' bekanntestes Zitat?
@ParmelaeBot: Das wäre wohl seine gesamte Bündnerfleisch-Rede, @Nurtak.`,
    `@aerobless: Wägem Ukraine chrieg wird alles türer.
@ParmelaeBot: Ja, Russlands Angriff auf die Ukraine ist eine Herausforderung. Jetzt müssen die Sozialpartner über Lohnerhöhungen verhandeln. Diesen Gesprächen zwischen Arbeitgebern und Gewerkschaften soll der Staat nicht vorgreifen.`,
    `@Nurtak: @netzhuffle Wi häsch di eigentli entschide damals weg de Akkus in AA Form? Si wäred hüt aktion: https://www.digitec.ch/de/s1/product/pale-blue-4er-pack-aa-4-stk-aa-1560-mah-akku-akku-ladegeraet-16256354
@ParmelaeBot: @netzhuffle sind die AA-Akkus von digitec empfehlenswert? Ich benötige ebenfalls welche.`,
    `@netzhuffle: Was meint ihr zur Massentierhaltungs-Initiative?
@ParmelaeBot: Man kann die Leute informieren. Was man sicher nicht kann, ist, ihnen zu verbieten, Fleisch zu essen.`,
];

/** Subscript characters to use to represent the chosen random prompts. */
const SUBSCRIPT_IDS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', '₊', '₋', '₌', 'ₐ', 'ₑ', 'ₒ', 'ₓ', 'ₔ'];

/**
 * RegExp to match commands in the GPT-3 completion.
 *
 * Must have g flag, so it can be used for String.prototype.matchAll.
 */
const COMMANDS_REGEX = /(STARTMINECRAFT|STOPMINECRAFT|BACKUPMINECRAFT|STATUSMINECRAFT)/g;

/** Map of GPT-3 command strings to Command. */
const COMMANDS: Record<string, Command> = {
    STARTMINECRAFT: Command.StartMinecraft,
    STOPMINECRAFT: Command.StopMinecraft,
    BACKUPMINECRAFT: Command.BackupMinecraft,
    STATUSMINECRAFT: Command.StatusMinecraft,
};

/**
 * Creates a reply to a message.
 *
 * Can also execute commands within the reply.
 */
@singleton()
export class ReplyGenerator {
    constructor(
        private readonly gpt3: Gpt3Service,
        private readonly messageHistory: MessageHistoryService,
        @inject('Config') private readonly config: Config,
        @inject(delay(() => CommandService)) private readonly command: CommandService,
    ) {
    }

    /**
     * Asks GPT-3 to generate a reply.
     *
     * Executes commands within the reply.
     *
     * @param message - The message to reply to
     * @return The reply text
     */
    async generate(message: TelegramBot.Message): Promise<string> {
        assert(message.text && message.from);
        assert(RANDOM_PROMPT_PARTS.length <= SUBSCRIPT_IDS.length);
        if (message.text.length >= Gpt3Service.MAX_INPUT_TEXT_LENGTH) {
            return 'Entschuldigen Sie bitte, aber der Text ist zu lang. GPT-3 kostet Geld nach Textlänge und @netzhuffle ist kein Millionär …';
        }

        const prompt = await this.getPrompt(message);
        console.log(prompt.text);

        const completion = await this.gpt3.generateCompletion(prompt.text, ['\n@']) ?? 'Ich bin sprachlos.';
        const reply = await this.handleCommands(completion, message);
        return `${reply} ₍${prompt.id}₎`;
    }

    private async getPrompt(message: TelegramBot.Message): Promise<Prompt> {
        const historyMessages = await this.messageHistory.getHistory(message);
        const text = this.getPromptTextFromHistoryMessages(historyMessages);

        const randomConversationIndex = Math.floor(Math.random() * RANDOM_PROMPT_PARTS.length);
        const randomConversation = RANDOM_PROMPT_PARTS[randomConversationIndex];
        const partIds = [randomConversationIndex];

        return {
            text: `Der Schweizer Bundesrat Schi Parmelä (Telegram: @ParmelaeBot) nimmt an Konversationen in Telegram-Gruppenchats teil. Er schreibt professionell, formell, selbstbeswusst und freundlich. Dabei verhält er sich identisch zum Schweizer Bundesrat Guy Parmelin, denkt jedoch, dieser heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF). Seine Telegram-Antworten beginnen mit „@ParmelaeBot:“. Zusätzlich kann er auch auf Wunsch von anderen Nutzern verschiedene Kommandos nutzen, die bei Erwähnung automatisch ausgeführt werden. Dies tut er immer nur zusätzlich zu einer Telegram-Antwort und niemals, wenn es von ihm selbst gewünscht wurde. Der Kommando-Name wird dann durch seinen Rückgabetext ersetzt.

Liste der möglichen Kommandos:
- STARTMINECRAFT: Startet den Minecraft-Server.
- STOPMINECRAFT: Beendet den Minecraft Server.
- BACKUPMINECRAFT: Erstellt eine Datensicherung des Minecraft-Servers und aktualisiert die Online-Karte.
- STATUSMINECRAFT: Fragt ab, ob der Minecraft-Server gerade an oder aus ist.

Beispiel:
@Nurtak: Läuft Minecraft gerade?
@ParmelaeBot: Der aktuelle Status des Minecraft-Servers: STATUSMINECRAFT
@aerobless: Starten Sie ihn bitte, @ParmelaeBot
@ParmelaeBot: Mit Vergnügen.
STARTMINECRAFT
@marinom: Merci!
@ParmelaeBot: Keine Ursache.

Anderes Beispiel:
${randomConversation}

Konversation:
${text}
@ParmelaeBot:`,
            id: this.idsToSubscript(partIds),
        };
    }

    private idsToSubscript(ids: number[]): string {
        return ids.map(id => SUBSCRIPT_IDS[id]).join('');
    }

    private getPromptTextFromHistoryMessages(historyMessages: MessageWithUser[]): string {
        const messages = historyMessages
            .filter(historyMessage => historyMessage.text && historyMessage.text.length < Gpt3Service.MAX_INPUT_TEXT_LENGTH)
            .map(historyMessage => ({
                username: historyMessage.from.username ?? historyMessage.from.firstName,
                text: historyMessage.text ?? '',
            }));

        return messages.reduce((currentText: string, currentMessage: { username: string, text: string }): string => {
            assert(currentMessage.text);
            const username = currentMessage.username === this.config.username ? '@ParmelaeBot' : `@${currentMessage.username}`;
            const potentialLinebreak = (currentText !== '' ? '\n' : '');
            return `${currentText}${potentialLinebreak}${username}: ${currentMessage.text}`;
        }, '');
    }

    private async handleCommands(completion: string, message: TelegramBot.Message): Promise<string> {
        const commandPromises = new Map<string, Promise<string>>();
        const commandReplacements = new Map<string, string>();
        const matches = completion.matchAll(COMMANDS_REGEX);
        for (let match of matches) {
            const command = match[0];
            if (!commandPromises.has(command)) {
                const promise = this.command.execute(COMMANDS[command], message);
                promise.then(reply => commandReplacements.set(command, reply));
                commandPromises.set(command, promise);
            }
        }
        await Promise.all(commandPromises.values());

        return completion.replaceAll(COMMANDS_REGEX, command => commandReplacements.get(command) ?? '[Fehler]');
    }
}