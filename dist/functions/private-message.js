"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// Imports global types
require("@twilio-labs/serverless-runtime-types");
const handler = function (context, event, callback) {
    const assets = Runtime.getAssets();
    // After compiling the assets, the result will be "message.js" not a TypeScript file.
    const privateMessageAsset = assets['/message.js'];
    const privateMessagePath = privateMessageAsset.path;
    const message = require(privateMessagePath);
    const twiml = new Twilio.twiml.MessagingResponse();
    twiml.message(message.privateMessage());
    callback(null, twiml);
};
exports.handler = handler;
//# sourceMappingURL=private-message.js.map