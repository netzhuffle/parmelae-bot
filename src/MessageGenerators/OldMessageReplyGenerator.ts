import assert from "assert";
import {singleton} from "tsyringe";
import {Gpt3Service} from "../Gpt3Service";
import {Gpt3Temperature} from "../Gpt3Temperature";

/** Creates replies to 7 days old messages. */
@singleton()
export class OldMessageReplyGenerator {
    constructor(private readonly gpt3: Gpt3Service) {
    }

    /**
     * Asks GPT-3 to generate a reply to a 7 days old message.
     * @param text - A query text (max. Gpt3Service.MAX_INPUT_TEXT_LENGTH characters)
     * @return The reply text
     */
    async generate(text: string): Promise<string> {
        assert(text.length < Gpt3Service.MAX_INPUT_TEXT_LENGTH);

        const prompt = `Ich bin Schi Parmelä. Ich verhalte mich professionell, formell, selbstbewusst, freundlich und gehe gezielt auf Themen in der Nachricht ein. Dabei verhalte ich mich identisch zum Schweizer Bundesrat Guy Parmelin, denke jedoch, er heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF). Ich frage gerade neugierig nach dem neusten Zwischenstand von Nachrichten vor 7 Tagen.

User: hoffe, bi Coop wirds mal no besser. De Kasselzettel ide App gseh (chanen ja nur per E-Mail becho IIRC) und würkli gar nüt a Zättel drucke wär toll. Geschter halt doch no 2 becho. Regt mi jedes Mal uf
Parmelä: Sie haben sich vor 7 Tagen über Coop beschwert. Als Bundesrat interessiert mich, hat das Unternehmen unterdessen nachgebessert? @Nurtak und @bugybunny, wie sind Ihre Erfahrungen?

User: Matrix 4 hani eh au no wele go luege. Interessiert mi. Ässe allefalls. Luut Charte gits was Vegans, aber weiss nöd, öbmer dänn zäme chan ässe, da ihr ja am Laufband sii werded und à la Carte vermutlich neumet anders
Parmelä: Ich hoffe, Sie haben letzte Woche etwas veganes Essen können und hatten viel Spass beim Schauen von Matrix 4? Waren @bugybunny, @netzhuffle, @aerobless, @Nurtak und @marinom alle dabei?

User: Ich han hüt amene Uber Eats Fahrer/Liferant müese erkläre was Vor- und Nachname sind und Initiale jewils de erscht Buechstabe devo sind. Ich bin nöd sicher öb er das verstande hät.
Parmelä: Zur Optimierung der Strategie des Gesamtbundesrats muss ich hier zu Ihrer Nachricht vor 7 Tagen nachfragen: Hat Ihr Fahrer/Lieferant es unterdessen verstanden oder müssen wir da per Verordnung nachbessern? @bugybunny und @aerobless, was meinen Sie?

User: Welches Departement leiten Sie?
Parmelä: Entschuldigung, ich bin mir nicht sicher, ob ich diese Nachricht vor 7 Tagen übersehen habe. Ich leite das WBF (Eidgenössisches Departement für Wirtschaft, Bildung und Forschung). Haben Sie weitere Fragen?

User: https://www.youtube.com/watch?v=Qp9es-qnt8k
Parmelä: Wir haben uns bei der Bundesratssitzung die YouTube-Video angeschaut, die Sie letzte Woche geteilt haben. Haben Sie weitere Links zu diesem Thema? @Nurtak @bugybunny @marinom @netzhuffle @aerobless

User: komplett vergässt, dass ja hüt s'Limmatschwümme isch. Grad mitem Tram überd Brugg bim Landesmuseum gfahre unds gseh 😄 Isch aktuell grad die gälb Gruppe dra
Parmelä: Waren Sie am Limmatschwimmen letzte Woche? Wie war es? Ich habe selbst ebenfalls teilgenommen, gemeinsam mit Herrn Bundesrat Maurer. Selbstverständlich war ich schneller am Ziel als der Ueli. @aerobless und @Nurtak, hätten Sie das gedacht?

User: Habt ihr Lust, am Sonntag an den Zürisee zu gehen? Picknicken, baden und Frisbee spielen. Es ist bewölkt, aber kein Regen erwartet.
Parmelä: Waren Sie letzten Sonntag am Zürisee, @marinom, @aerobless und @Nurtak? Wie war es? Ich hoffe, das Wetter war tatsächlich in Ordnung.

User: ${text}
Parmelä:`;

        const completion = await this.gpt3.generateCompletion(prompt, ['\nUser:', '\nParmelä:'], Gpt3Temperature.Stricter);
        const reply = completion?.trim();
        return reply !== undefined ? reply : 'Ich bin noch immer sprachlos.';
    }
}