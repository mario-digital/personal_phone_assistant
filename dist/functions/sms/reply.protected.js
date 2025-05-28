"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// Imports global types
require("@twilio-labs/serverless-runtime-types");
const handler = function (context, event, callback) {
    const twiml = new Twilio.twiml.MessagingResponse();
    twiml.message('Hello World!');
    callback(null, twiml);
};
exports.handler = handler;
//# sourceMappingURL=reply.protected.js.map