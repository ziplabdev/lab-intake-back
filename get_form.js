'use strict';
const path = require('path');
const google = require('@googleapis/forms');
const {authenticate} = require('@google-cloud/local-auth');
const formID = '1vBiB_vcV86k0mTaedR_H2leTovX9edaAiZGHLjlb3r0';
async function runSample(query) {
const auth = await authenticate({
keyfilePath: path.join(__dirname, 'googleformscreds.json'),
scopes: 'https://www.googleapis.com/auth/forms',
});
const forms = google.forms({
version: 'v1beta',
auth: auth
});
const res = await forms.forms.get({formId:formID});
console.log(res.data);
return res.data;
}
if (module === require.main) {
runSample().catch(console.error);
}
module.exports = runSample;