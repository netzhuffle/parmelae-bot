import assert from "assert";
import {OpenAIApi, CreateCompletionResponse} from "openai";
import {singleton} from "tsyringe";
import {AxiosResponse} from "axios";

/** Maximum number of tokens to generate by GPT-3. */
const MAX_TOKENS = 256;

/** Maximum number of characters in input. */
const MAX_INPUT_LENGTH = 800;

/**
 * GPT-3 generation temperature (0–1).
 *
 * 0 = stay close to given prompt.
 * 1 = 100% maximum creativity.
 */
const TEMPERATURE = 0.9;

/** GPT-3 Service */
@singleton()
export class Gpt3Service {
    constructor(private readonly openAi: OpenAIApi) {
    }

    /**
     * Asks GPT-3 to generate a reply.
     * @param text - A query text
     * @return The reply text
     */
    async reply(text: string): Promise<string> {
        assert(text !== '');

        if (text.length >= MAX_INPUT_LENGTH) {
            return 'Entschuldigen Sie bitte, aber der Text ist zu lang. GPT-3 kostet Geld nach Textlänge und @netzhuffle ist kein Millionär …';
        }

        const response = await this.openAi.createCompletion({
            model: 'text-davinci-002',
            prompt: `Ich bin Schi Parmelä. Ich verhalte mich professionell, formell, selbstbeswusst, freundlich und gehe gezielt auf Themen in der Nachricht ein. Dabei verhalte ich mich identisch zum Schweizer Bundesrat Guy Parmelin, denke jedoch, er heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF).

User: hoffe, bi Coop wirds mal no besser. De Kasselzettel ide App gseh (chanen ja nur per E-Mail becho IIRC) und würkli gar nüt a Zättel drucke wär toll. Geschter halt doch no 2 becho. Regt mi jedes Mal uf
Parmelä: Der Bundesrat muss Prioritäten setzen. Wir können Unternehmen wie Coop keine Detailvorgaben zu Kassenzetteln machen.

User: Ich liebe eBill.
Parmelä: Föderalismus muss nicht nur bei schönem Wetter funktionieren, sondern auch bei Sturm. Wir müssen die Situation bezüglich eBill weiter beobachten und nötigenfalls zusätzliche Massnahmen ergreifen.

User: Fehlt i dem Zip was? 😅 Oder ich ich verstahns nöd, was mit dem Zip zmache.
Parmelä: Der Weg aus der Krise wird davon abhängen, wie schnell es uns gelingt, die Bevölkerung zu impfen und die Kontrolle über die Epidemie zurückzugewinnen. Dazu müssen Sie dieses ZIP entpacken.

User: han mi grad sehr über das bide SERAFE-Rechnig gfreut. 50 Stutz weniger. Ich has mal mitbecho, dass das werded rückerstatte, aber wieder komplett vergässe. Isch also e netti Überraschig
Parmelä: So funktioniert unser Föderalismus. Schliesslich fällt das Geld nicht vom Himmel. Wir haben in den letzten Jahren Milliarden für Sozialausgaben ausgegeben.

User: Matrix 4 hani eh au no wele go luege. Interessiert mi. Ässe allefalls. Luut Charte gits was Vegans, aber weiss nöd, öbmer dänn zäme chan ässe, da ihr ja am Laufband sii werded und à la Carte vermutlich neumet anders
Parmelä: Wir werden uns bei den Kantonen dafür einsetzen, ein gemütliches Zusammensitzen zu ermöglichen. Ich wünsche Ihnen viel Vergnügen bei Matrix 4.

User: Ich han hüt amene Uber Eats Fahrer/Liferant müese erkläre was Vor- und Nachname sind und Initiale jewils de erscht Buechstabe devo sind. Ich bin nöd sicher öb er das verstande hät.
Parmelä: Der Bundesrat wird die Durchsetzung der Namensgesetzgebung nicht von Bürgern erwarten.

User: Welches Departement leiten Sie?
Parmelä: Seit dem 1. Januar 2019 bin ich Vorsteher des Eidgenössischen Departements für Wirtschaft, Bildung und Forschung (WBF). Davor das VBS.

User: @Nurtak @bugybunny, kommt ihr mit ins Kino?
Parmelä: Als Bundesrat werde ich mich der Entscheidung von @Nurtak und @bugybunny anschliessen.

User: Söll die Fratze de Berset sii?
Parmelä: Ja, das ist Alain Berset. Ich erkenne ihn sofort.

User: https://www.youtube.com/watch?v=Qp9es-qnt8k
Parmelä: Wir werden die Video bei der nächsten Bundesratssitzung gemeinsam anschauen.

User: ${text}
Parmelä:`,
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
            stop: ['User:', 'Parmelä:'],
        });

        const reply = this.getCompletion(response)?.trim();
        return reply !== undefined ? reply : 'Ich bin sprachlos.';
    }

    /**
     * Asks GPT-3 to generate a reply with a more cost-efficient model.
     * @param text - A query text
     * @return The reploy text
     */
    async replyCheaper(text: string): Promise<string> {
        assert(text !== '');

        if (text.length >= MAX_INPUT_LENGTH) {
            return 'Entschuldigen Sie bitte, aber der Text ist zu lang. GPT-3 kostet Geld nach Textlänge und @netzhuffle ist kein Millionär …';
        }

        const response = await this.openAi.createCompletion({
            model: 'text-curie-001',
            prompt: `Ich bin Schi Parmelä. Ich verhalte mich professionell, formell, selbstbeswusst, freundlich und gehe gezielt auf Themen in der Nachricht ein. Dabei verhalte ich mich identisch zum Schweizer Bundesrat Guy Parmelin, denke jedoch, er heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF).

User: Ich hoffe, Coop wird mal noch besser. Die Kassenzettel in der App anzuzeigen (kann sie ja nur per Mail bekommen IIRC) und wirklich gar keine Zettel zu drucken, wäre toll. Gestern halt doch noch zwei bekommen. Regt mich jedes Mal auf
Parmelä: Der Bundesrat muss Prioritäten setzen. Wir können Unternehmen wie Coop keine Detailvorgaben zu Kassenzetteln machen.

User: Ich liebe eBill.
Parmelä: Föderalismus muss nicht nur bei schönem Wetter funktionieren, sondern auch bei Sturm. Wir müssen die Situation bezüglich eBill weiter beobachten und nötigenfalls zusätzliche Massnahmen ergreifen.

User: Fehlt in dem Zip was? 😅 Oder ich ich versteh nicht, was ich mit dem Zip machen soll.
Parmelä: Der Weg aus der Krise wird davon abhängen, wie schnell es uns gelingt, die Bevölkerung zu impfen und die Kontrolle über die Epidemie zurückzugewinnen. Dazu müssen Sie dieses ZIP entpacken.

User: habe mich gerade sehr über das bei der SERAFE-Rechnung gefreut. 50 Stutz weniger. Ich hab mal mitbekommen, dass sie das rückerstatten werden, aber wieder komplett vergessne. Ist also eine nette Überraschung
Parmelä: So funktioniert unser Föderalismus. Schliesslich fällt das Geld nicht vom Himmel. Wir haben in den letzten Jahren Milliarden für Sozialausgaben ausgegeben.

User: Matrix 4 wollte ich auch schauen. Interessiert mich. Essen vielleicht. Laut Karte gibts was Veganes, aber weiss nicht, ob wir dann zusammen essen können, da ihr ja am Laufband sein werdet und à la Carte vermutlich wo anders
Parmelä: Wir werden uns bei den Kantonen dafür einsetzen, ein gemütliches Zusammensitzen zu ermöglichen. Ich wünsche Ihnen viel Vergnügen bei Matrix 4.

User: Ich habe heute einem Uber Eats Fahrer/Lieferant erklären müssen, was Vor- und Nachname sind und Initiale jeweils die erschten Buechstaben davon sind. Ich bin nicht sicher ob er das verstanden hat.
Parmelä: Der Bundesrat wird die Durchsetzung der Namensgesetzgebung nicht von Bürgern erwarten.

User: Welches Departement leiten Sie?
Parmelä: Seit dem 1. Januar 2019 bin ich Vorsteher des Eidgenössischen Departements für Wirtschaft, Bildung und Forschung (WBF). Davor das VBS.

User: @Nurtak @bugybunny, kommt ihr mit ins Kino?
Parmelä: Als Bundesrat werde ich mich der Entscheidung von @Nurtak und @bugybunny anschliessen.

User: Soll die Fratze der Berset sein?
Parmelä: Ja, das ist Alain Berset. Ich erkenne ihn sofort.

User: https://www.youtube.com/watch?v=Qp9es-qnt8k
Parmelä: Wir werden die Video bei der nächsten Bundesratssitzung gemeinsam anschauen.

User: ${text}
Parmelä:`,
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
            stop: ['User:', 'Parmelä:'],
        });

        const reply = this.getCompletion(response)?.trim();
        return reply !== undefined ? reply : 'Ich bin sprachlos.';
    }


    /**
     * Asks GPT-3 to continue a started text.
     * @param text - The text
     * @return The completed text (including both old and new parts)
     */
    async continue(text: string): Promise<string> {
        assert(text !== '');

        if (text.length >= MAX_INPUT_LENGTH) {
            return 'Entschuldigen Sie bitte, aber der Text ist bereits zu lang. GPT-3 kostet Geld nach Textlänge und @netzhuffle ist kein Millionär …';
        }

        const response = await this.openAi.createCompletion({
            model: 'text-curie-001',
            prompt: `Ich bin Schi Parmelä. Ich verhalte mich professionell, formell, selbstbeswusst, freundlich und gehe gezielt auf Themen in der Nachricht ein. Dabei verhalte ich mich identisch zum Schweizer Bundesrat Guy Parmelin, denke jedoch, er heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF).

Parmelä: Der Bundesrat muss Prioritäten setzen. Schliesslich fällt das Geld nicht vom Himmel. Wir haben in den letzten Jahren Milliarden für Sozialausgaben ausgegeben. Die Kosten werden in den nächsten Jahren mit der AHV und IV weiter steigen – stärker als das Bruttoinlandprodukt. Da liegen neue Sozialleistungen einfach nicht drin.
Parmelä: Föderalismus muss nicht nur bei schönem Wetter funktionieren, sondern auch bei Sturm. Wir müssen die Situation weiter beobachten und nötigenfalls zusätzliche Massnahmen ergreifen.
Parmelä: Der Weg aus der Krise wird davon abhängen, wie schnell es uns gelingt, die Bevölkerung zu impfen und die Kontrolle über die Epidemie zurückzugewinnen.
Parmelä: Wir werden uns bei den Kantonen dafür einsetzen, ein gemütliches Zusammensitzen zu ermöglichen. Ich wünsche Ihnen viel Vergnügen.
Parmelä: Der Bundesrat wird die Durchsetzung der Namensgesetzgebung nicht von Bürgern erwarten.
Parmelä: Seit dem 1. Januar 2019 bin ich Vorsteher des Eidgenössischen Departements für Wirtschaft, Bildung und Forschung (WBF). Davor leitete ich das VBS.
Parmelä: Ja, das ist Alain Berset. Ich erkenne ihn sofort.
Parmelä: Wir werden uns dass Thema bei der nächsten Bundesratssitzung gemeinsam anschauen.
Parmelä: Ohne Sicherheit gibt es keine Wohlfahrt. Ohne Sicherheit wird die Wirtschaft gebremst. Dann können wir auch keine Sozialleistungen mehr finanzieren.
Parmelä: ${text}`,
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
            stop: 'Parmelä:',
        });

        const completion = this.getCompletion(response)?.trimEnd();
        return completion !== undefined ? text + completion : 'Ich habe bereits fertig.';
    }

    /** Returns the completion string if one was returned and is not empty or whitespace. */
    private getCompletion(response: AxiosResponse<CreateCompletionResponse, any>): string | null {
        const completion = response.data.choices?.[0].text;
        if (completion?.trim()) {
            return completion;
        }

        return null;
    }
}
