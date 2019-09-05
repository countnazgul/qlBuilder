const path = require("path");
const enigma = require('enigma.js');
const WebSocket = require('ws');
const schema = require('enigma.js/schemas/12.170.2.json');
const querystring = require('querystring');
const Spinner = require('cli-spinner').Spinner;
Spinner.setDefaultSpinnerDelay(200)

const helpers = require('./helpers')
const common = require('./common')

const setScript = async function (script, env) {
    let { session, envDetails } = await createQlikSession(env)

    try {
        let spinner = new Spinner('Setting script ..');
        spinner.setSpinnerString('☱☲☴');
        spinner.start();

        let global = await session.open()
        let doc = await global.openDoc(envDetails.appId)
        await doc.setScript(script)
        spinner.stop(true)

        let spinnerSave = new Spinner('Saving ...');
        spinnerSave.setSpinnerString('◐◓◑◒');
        spinnerSave.start();

        await doc.doSave()
        await session.close()

        spinnerSave.stop(true)
        common.writeLog('ok', 'Script was set and document was saved', false)
    } catch (e) {
        console.log('')
        common.writeLog('err', e.message, true)
    }
}

const getScriptFromApp = async function (env) {

    let { session, envDetails } = await createQlikSession(env)

    try {
        let spinner = new Spinner('Getting script ..');
        spinner.setSpinnerString('☱☲☴');
        spinner.start();

        let global = await session.open()
        let doc = await global.openDoc(envDetails.appId)
        let qScript = await doc.getScript()
        await session.close()

        spinner.stop(true)
        common.writeLog('ok', 'Script was received', false)
        return qScript
    } catch (e) {
        console.log('')
        common.writeLog('err', e.message, true)
    }
}

const checkScriptSyntax = async function (script, env) {
    let { session, envDetails } = await createQlikSession(env)
    try {
        let global = await session.open()
        let doc = await global.createSessionApp()
        await doc.setScript(script)
        let syntaxCheck = await doc.checkScriptSyntax()
        await session.close()

        return syntaxCheck
    } catch (e) {
        console.log('')
        common.writeLog('err', e.message, true)
    }
}

const reloadApp = async function (env) {
    let { session, envDetails } = await createQlikSession(env)

    try {
        let global = await session.open()
        let doc = await global.openDoc(envDetails.appId)
        await reloadAndGetProgress({ global, doc })

        let spinner = new Spinner('Saving ...');
        spinner.setSpinnerString('◐◓◑◒');
        spinner.start();

        await doc.doSave()
        await session.close()

        spinner.stop(true);
        common.writeLog('ok', 'App was reloaded and document was saved', false)

    } catch (e) {
        console.log('')
        common.writeLog('err', e.message, true)
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

                        if (msg.qErrorData.length > 0) {
                            reloaded = true
                            scriptError = true
                        }

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


                    })
            } else {
                clearInterval(progress)
            }
        }, 500)
    })
}

async function createQlikSession(env) {
    let envDetails = helpers.getEnvDetails(env)[0];

    let authenticationType = 'desktop'

    if (envDetails.authentication) {
        authenticationType = envDetails.authentication.type
    }

    let qsEnt = await handleAuthenticationType[authenticationType](envDetails)

    try {
        const session = enigma.create({
            schema,
            url: `${envDetails.host}/app/engineData`,
            createSocket: url => new WebSocket(url, qsEnt)
        });

        return { session, envDetails }
    } catch (e) {
        console.log('')
        common.writeLog('err', e.message, false)
    }
}

const handleAuthenticationType = {
    desktop: async function () {
        return {}
    },
    certificates: async function (envDetails) {
        try {
            return {
                ca: [helpers.readCert(envDetails.authentication.certLocation, 'root.pem')],
                key: helpers.readCert(envDetails.authentication.certLocation, 'client_key.pem'),
                cert: helpers.readCert(envDetails.authentication.certLocation, 'client.pem'),
                headers: {
                    'X-Qlik-User': `UserDirectory=${encodeURIComponent(envDetails.authentication.user.split('\\')[0])}; UserId=${encodeURIComponent(envDetails.authentication.user.split('\\')[1])}`,
                },
            }
        } catch (e) {
            common.writeLog('err', e.message, true)
        }
    },
    jwt: async function (envDetails) {
        try {
            let tokenFileName = path.basename(envDetails.authentication.tokenLocation);
            let tokenPath = path.dirname(envDetails.authentication.tokenLocation);

            return {
                headers: { Authorization: `Bearer ${helpers.readCert(tokenPath, tokenFileName)}` },
            }
        } catch (e) {
            common.writeLog('err', e.message, true)
        }
    },
    winform: async function (envDetails) {

        let credentials = getEnvCredentials(envDetails);
        let queryCredentials = querystring.stringify({
            username: credentials.user,
            pwd: credentials.pwd
        })

        envDetails.authLocation = await helpers.winFormSession.firstRequest(envDetails)

        let sessionHeaderName = "X-Qlik-Session"

        if (!envDetails.sessionHeaderName) {
            // envDetails.sessionHeaderName = 'X-Qlik-Session'
            common.writeLog('warn', `Session Header not specified. Will try and use the default one ("X-Qlik-Session")`, false)
        } else {
            sessionHeaderName = envDetails.sessionHeaderName
        }

        let sessionId = await helpers.winFormSession.secondRequest(envDetails, queryCredentials)

        return {
            headers: {
                'Cookie': `${sessionHeaderName}=${sessionId}`,
            }
        }
    },
    purewin: async function (envDetails) {

    }
}

function getEnvCredentials() {
    if (!process.env.QLIK_USER) {
        common.writeLog('err', `"QLIK_USER" variable is not set!`, true)
    }

    if (!process.env.QLIK_PASSWORD) {
        common.writeLog('err', `"QLIK_PASSWORD" variable is not set!`, true)
    }

    return { user: process.env.QLIK_USER, pwd: process.env.QLIK_PASSWORD }
}

module.exports = {
    setScript,
    checkScriptSyntax,
    reloadApp,
    getScriptFromApp,
    handleAuthenticationType
}