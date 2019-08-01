const enigma = require('enigma.js');
const WebSocket = require('ws');
const schema = require('enigma.js/schemas/12.20.0.json');
const Spinner = require('cli-spinner').Spinner;
const chalk = require('chalk');

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
        let spinner = new Spinner('Setting script ..');
        spinner.setSpinnerString('☱☲☴');
        spinner.start();

        let global = await session.open()
        let doc = await global.openDoc(envDetails.appId)
        await doc.setScript(script)
        await doc.doSave()
        await session.close()

        spinner.stop(true)
        console.log( chalk.hex('#00FF00')('\u2713 ') + 'Script was set and document was saved')
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

const reloadApp = async function (env) {
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
        let doc = await global.openDoc(envDetails.appId)
        // let reloadResult = await doc.doReload()
        await reloadAndGetProgress({ global, doc })
        await session.close()






    } catch (e) {
        console.log(e.message)
        process.exit(0)
    }

}

function reloadAndGetProgress({ global, doc }) {
    return new Promise(function (resolve, reject) {
        console.log('')
        console.log('--------------- RELOAD STARTED ---------------')
        console.log('')

        let reloaded = false;
        let scriptError = false;
        let scriptResult = []

        let persistentProgress = '';

        doc.doReloadEx()
            .then(function (result) {
                setTimeout(function () {
                    reloaded = true
                    console.log('')
                    console.log('--------------- RELOAD COMPLETED ---------------')
                    console.log('')

                    resolve({
                        success: result.qSuccess,
                        log: result.qScriptLogFile,
                        script: scriptResult,
                        scriptError: scriptError
                    })
                }, 1000)
            })


        let progress = setInterval(function () {
            if (reloaded != true) {
                global.getProgress(-1)
                    .then(function (msg) {


                        var timestampOptions = {
                            year: "numeric", month: "2-digit",
                            day: "2-digit", hour: "2-digit", minute: "2-digit",
                            second: "2-digit", hour12: false
                        };

                        let timestamp = new Date().toLocaleString("en-US", timestampOptions)

                        if (msg.qPersistentProgress && msg.qTransientProgress) {
                            persistentProgress = msg.qPersistentProgress
                            if (persistentProgress.split('\n').length > 1) {
                                console.log(`${timestamp}: ${persistentProgress.split('\n')[0]}`)
                                console.log(`${timestamp}: ${persistentProgress.split('\n')[1]} <-- ${msg.qTransientProgress}`)
                            } else {
                                console.log(`${timestamp}: ${msg.qPersistentProgress} <-- ${msg.qTransientProgress}`)
                            }
                        }

                        if (!msg.qPersistentProgress && msg.qTransientProgress) {
                            if (persistentProgress.split('\n').length > 1) {
                                console.log(`${timestamp}: ${persistentProgress.split('\n')[1]} <-- ${msg.qTransientProgress}`)
                            } else {
                                console.log(`${timestamp}: ${persistentProgress} <-- ${msg.qTransientProgress}`)
                            }
                        }

                        if (msg.qPersistentProgress && !msg.qTransientProgress) {
                            console.log(`${timestamp}: ${msg.qPersistentProgress}`)
                        }

                        if (msg.qPersistentProgress.indexOf('Script Error. ') > -1) {
                            reloaded = true
                            scriptError = true
                        }
                    })
            } else {
                clearInterval(progress)
            }
        }, 500)
    })
}

module.exports = {
    setScript,
    checkScriptSyntax,
    reloadApp
}