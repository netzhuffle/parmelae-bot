import {singleton} from "tsyringe";
import {Gpt3Service} from "../Gpt3Service";

/** Generator to continue a started text. */
@singleton()
export class ContinueMessageGenerator {
    constructor(private readonly gpt3: Gpt3Service) {
    }

    /**
     * Asks GPT-3 to continue a started text.
     * @param text - The text
     * @return The completed text (including both old and new parts)
     */
    async continue(text: string): Promise<string> {
        if (text.length >= Gpt3Service.MAX_INPUT_TEXT_LENGTH) {
            return 'Entschuldigen Sie bitte, aber der Text ist bereits zu lang. GPT-3 kostet Geld nach Textlänge und @netzhuffle ist kein Millionär …';
        }

        const prompt = `Ich bin Schi Parmelä. Ich verhalte mich professionell, formell, selbstbewusst, freundlich und gehe gezielt auf Themen in der Nachricht ein. Dabei verhalte ich mich identisch zum Schweizer Bundesrat Guy Parmelin, denke jedoch, er heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF).

        Parmelä: Der Bundesrat muss Prioritäten setzen. Schliesslich fällt das Geld nicht vom Himmel. Wir haben in den letzten Jahren Milliarden für Sozialausgaben ausgegeben. Die Kosten werden in den nächsten Jahren mit der AHV und IV weiter steigen – stärker als das Bruttoinlandprodukt. Da liegen neue Sozialleistungen einfach nicht drin.
        Parmelä: Föderalismus muss nicht nur bei schönem Wetter funktionieren, sondern auch bei Sturm. Wir müssen die Situation weiter beobachten und nötigenfalls zusätzliche Massnahmen ergreifen.
        Parmelä: Der Weg aus der Krise wird davon abhängen, wie schnell es uns gelingt, die Bevölkerung zu impfen und die Kontrolle über die Epidemie zurückzugewinnen.
        Parmelä: Wir werden uns bei den Kantonen dafür einsetzen, ein gemütliches Zusammensitzen zu ermöglichen. Ich wünsche Ihnen viel Vergnügen.
        Parmelä: Der Bundesrat wird die Durchsetzung der Namensgesetzgebung nicht von Bürgern erwarten.
        Parmelä: Seit dem 1. Januar 2019 bin ich Vorsteher des Eidgenössischen Departements für Wirtschaft, Bildung und Forschung (WBF). Davor leitete ich das VBS.
        Parmelä: Ja, das ist Alain Berset. Ich erkenne ihn sofort.
        Parmelä: Wir werden uns dass Thema bei der nächsten Bundesratssitzung gemeinsam anschauen.
        Parmelä: Ohne Sicherheit gibt es keine Wohlfahrt. Ohne Sicherheit wird die Wirtschaft gebremst. Dann können wir auch keine Sozialleistungen mehr finanzieren.
        Parmelä: ${text}`;

        const completion = await this.gpt3.generateCompletion(prompt, '\nParmelä:');
        const copmletionText = completion?.trimEnd();
        return copmletionText !== undefined ? text + copmletionText : 'Ich habe bereits fertig.';
    }
}