const enigma = require('enigma.js');
const WebSocket = require('ws');
const schema = require('enigma.js/schemas/12.20.0.json');

const helpers = require('./helpers')

const setScript = async function (script, env) {
    let envDetails = helpers.getEnvDetails(env)[0]

    let qsEnt = {}
    if (envDetails.certificates) {
        qsEnt = {
            ca: [helpers.readCert(envDetails.certificates, 'root.pem')],
            key: helpers.readCert(envDetails.certificates, 'client_key.pem'),
            cert: helpers.readCert(envDetails.certificates, 'client.pem'),
            headers: {
                'X-Qlik-User': `UserDirectory=${encodeURIComponent(envDetails.user.domain)}; UserId=${encodeURIComponent(envDetails.user.name)}`,
            },
        }
    }

    const session = enigma.create({
        schema,
        url: `${envDetails.host}/app/engineData`,
        createSocket: url => new WebSocket(url, qsEnt)
    });

    try {
        let global = await session.open()
        console.log('Connected')

        console.log('Opening app ...')
        let doc = await global.openDoc(envDetails.appId)
        console.log('App open!')

        await doc.setScript(script)
        console.log('Script set')

        console.log('Saving ...')
        await doc.doSave()
        console.log('Document saved!')

        await session.close()
    } catch (e) {
        console.log(e.message)
        process.exit(0)
    }
}

const checkScriptSyntax = async function (script, env) {
    let envDetails = helpers.getEnvDetails(env)[0]

    let qsEnt = {}
    let session = {}

    if (envDetails.certificates) {
        qsEnt = {
            ca: [helpers.readCert(envDetails.certificates, 'root.pem')],
            key: helpers.readCert(envDetails.certificates, 'client_key.pem'),
            cert: helpers.readCert(envDetails.certificates, 'client.pem'),
            headers: {
                'X-Qlik-User': `UserDirectory=${encodeURIComponent(envDetails.user.domain)}; UserId=${encodeURIComponent(envDetails.user.name)}`,
            },
        }
    }    

    try {
        session = enigma.create({
            schema,
            url: `${envDetails.host}/app/engineData`,
            createSocket: url => new WebSocket(url, qsEnt),
        });
    } catch (e) {
        console.log(e.message)
        process.exit()
    }

    try {
        let global = await session.open()
        let doc = await global.createSessionApp()
        await doc.setScript(script)
        let syntaxCheck = await doc.checkScriptSyntax()
        await session.close()

        return syntaxCheck
    } catch (e) {
        console.log(e.message)
        process.exit(0)
    }
}

const reloadApp = function () {

}


module.exports = {
    setScript,
    checkScriptSyntax
}