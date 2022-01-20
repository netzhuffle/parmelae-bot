'use strict';

export default {
    /**
     * Asks GPT-3 to generate a reply
     * @param {string} text - A query text
     * @param {function(string)} callback - The callback for successful execution, called with response text
     * @param {OpenAI} openAi - The OpenAI-Dependency
     * @returns {void}
     */
    reply: function (text, callback, openAi) {
        if (!text) {
            return;
        }

        if (text.length >= 400) {
            callback('Entschuldigen Sie bitte, aber der Text ist zu lang. GPT-3 kostet Geld nach Textlänge und @netzhuffle ist kein Millionär …');
        }

        const textOnOneLine = text.replace(/\n/, ' ');
        openAi.createCompletion('davinci', {
            prompt: `Parmelä is a chat bot that replies to randomly picked sentences in a professional, formal, positive, friendly, and engaging way, mimicking a Swiss federal council politician.

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

User: @Nurtak @bugybunny, kommt ihr mit ins Kino?
Parmelä: Als Bundesrat werde ich mich der Entscheidung von @Nurtak und @bugybunny anschliessen.

User: Söll die Fratze de Berset sii?
Parmelä: Ja, das ist Alain Berset. Ich erkenne ihn sofort.

User: https://www.youtube.com/watch?v=Qp9es-qnt8k
Parmelä: Wir werden die Video bei der nächsten Bundesratssitzung gemeinsam anschauen.

User: ${textOnOneLine}
Parmelä:`, temperature: 0.9, max_tokens: 64, stop: ["\n"]
        }).then((completion) => {
            const response = completion && completion.choices && completion.choices.length && completion.choices[0].text;
            if (response) {
                callback(response);
            }
        })
            .catch((error) => console.error(error));
    }
};
