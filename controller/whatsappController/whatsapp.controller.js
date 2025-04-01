const asyncHandler = require('express-async-handler'); // Ensure you have this package installed

// GET webhook verification

const verifyWebhook = (req, res) => {
    try {
        console.log('GET: Someone is pinging me!');

        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];

        if (
            mode &&
            token &&
            mode === 'subscribe' &&
            process.env.Meta_WA_VerifyToken === token
        ) {
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        console.error({ error });
        return res.sendStatus(500);
    }
};

// POST webhook handling

const handleWebhookPost = asyncHandler(async (req, res) => {
    console.log('POST: Someone is pinging me!');

    try {
        let bodyParam = req.body;

        console.log(JSON.stringify(bodyParam, null, 2));

        if (bodyParam.object) {
            console.log('inside body param');
            if (
                bodyParam.entry &&
                bodyParam.entry[0].changes &&
                bodyParam.entry[0].changes[0].value.messages &&
                bodyParam.entry[0].changes[0].value.messages[0]
            ) {
                let phoneNoId = bodyParam.entry[0].changes[0].value.metadata.phone_number_id;
                let from = bodyParam.entry[0].changes[0].value.messages[0].from;
                let msgBody = bodyParam.entry[0].changes[0].value.messages[0].text.body;

                console.log('Phone Number ID: ' + phoneNoId);
                console.log('From: ' + from);
                console.log('Message Body: ' + msgBody);

                // Add your message handling or API call logic here
                // Example:
                // await sendDocumentOrMessage(phoneNoId, from, msgBody);

                return res.sendStatus(200);
            } else {
                return res.sendStatus(404);
            }
        } else {
            return res.sendStatus(400); // Bad request if the body param is invalid
        }
    } catch (error) {
        console.error({ error });
        return res.sendStatus(500);
    }
});

module.exports = { verifyWebhook, handleWebhookPost };
