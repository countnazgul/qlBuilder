const path = require("path");
const enigma = require('enigma.js');
const WebSocket = require('ws');
const schema = require('enigma.js/schemas/12.170.2.json');
const qAuth = require('qlik-sense-authenticate');

const Spinner = require('cli-spinner').Spinner;
Spinner.setDefaultSpinnerDelay(200)

const helpers = require('./helpers')
const common = require('./common')

const setScript = async function ({ environment, variables, script, doSave = true }) {
    let session = await createQlikSession({ environment, variables })
    if (session.error) return session

    try {
        let spinner = new Spinner('Setting script ..');
        spinner.setSpinnerString('☱☲☴');
        spinner.start();

        let global = await session.message.open()
        let doc = await global.openDoc(environment.appId)
        await doc.setScript(script)
        spinner.stop(true)

        let spinnerSave = new Spinner('Saving ...');
        spinnerSave.setSpinnerString('◐◓◑◒');
        spinnerSave.start();

        if (doSave) {
            await doc.doSave()
        }

        await session.message.close()

        spinnerSave.stop(true)

        return { error: false, message: 'Script was set and document was saved' }
    } catch (e) {
        console.log('')
        return { error: true, message: e.message }
    }
}

const getScriptFromApp = async function ({ environment, variables }) {

    let session = await createQlikSession({ environment, variables })

    if (session.error) return session

    try {
        let spinner = new Spinner('Getting script ..');
        spinner.setSpinnerString('☱☲☴');
        spinner.start();

        let global = await session.message.open()
        let doc = await global.openDoc(environment.appId)
        let qScript = await doc.getScript()

        console.log('')
        common.writeLog('ok', 'Script was received', false)
        await session.message.close()

        spinner.stop(true)
        return { error: false, message: qScript }
    } catch (e) {
        console.log('')
        return { error: true, message: e.message }
    }
}

const checkScriptSyntax = async function ({ environment, variables, script }) {

    let session = await createQlikSession({ environment, variables })
    if (session.error) return session

    try {
        let global = await session.message.open()
        let doc = await global.createSessionApp()
        await doc.setScript(script)
        let syntaxCheck = await doc.checkScriptSyntax()
        await session.message.close()

        return { error: false, message: syntaxCheck }
    } catch (e) {
        await session.message.close()
        return { error: true, message: e.message }
    }
}

const reloadApp = async function ({ environment, variables, script }) {
    let session = await createQlikSession({ environment, variables })
    if (session.error) return session

    try {
        let global = await session.message.open()
        let doc = await global.openDoc(environment.appId)
        await doc.setScript(script)

        let reloadResult = await reloadAndGetProgress({ global, doc })

        let spinner = new Spinner('Saving ...');
        spinner.setSpinnerString('◐◓◑◒');
        spinner.start();

        if (reloadResult.error) {
            spinner.stop(true);
            await session.message.close()
            return { error: true, message: 'Error during reload' }
        }

        await doc.doSave()
        await session.message.close()

        spinner.stop(true);

        return { error: false, message: 'App was reloaded and document was saved' }

    } catch (e) {
        return { error: true, message: e.message }
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
                        error: scriptError, message: {
                            success: result.qSuccess,
                            log: result.qScriptLogFile,
                            script: scriptResult,
                            scriptError: scriptError
                        }
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

                        let loadError = false;

                        try {
                            loadError = msg.qPersistentProgress.toLowerCase().indexOf('script error.') > -1 ? true : false
                        } catch (e) {

                        }


                        if (msg.qErrorData.length > 0 || loadError == true) {
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

async function createQlikSession({ environment, variables }) {

    let authenticationType = 'desktop'

    if (environment.authentication) {
        authenticationType = environment.authentication.type
    }

    let qsEnt = await handleAuthenticationType[authenticationType]({ environment, variables })

    if (qsEnt.error) {
        console.log('')
        common.writeLog('err', qsEnt.message, true)
    }

    try {
        const session = enigma.create({
            schema,
            url: `${environment.host}/app/engineData/identity/${+new Date()}`,
            createSocket: url => new WebSocket(url, qsEnt)
        });

        return { error: false, message: session }
    } catch (e) {
        console.log('')
        common.writeLog('err', e.message, true)
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
    winform: async function ({ environment, variables }) {

        let sessionHeaderName = 'X-Qlik-Session'
        if (environment.authentication.sessionHeaderName) {
            sessionHeaderName = environment.authentication.sessionHeaderName
        }

        if (variables.QLIK_USER.indexOf('\\') == -1) {
            return { error: true, message: 'The username should in format DOMAIN\\USER' }
        }

        let auth_config = {
            type: 'win',
            props: {
                url: environment.host.replace('wss', 'https').replace('ws', 'http'),
                proxy: '',
                username: variables.QLIK_USER,
                password: variables.QLIK_PASSWORD,
                header: sessionHeaderName
            }
        }

        let sessionId = await qAuth.login(auth_config)

        if (sessionId.error) {
            return sessionId
        }

        return {
            headers: {
                'Cookie': `${sessionHeaderName}=${sessionId.message}`,
            }
        }
    },
    purewin: async function (envDetails) {

    }
}

module.exports = {
    setScript,
    checkScriptSyntax,
    reloadApp,
    getScriptFromApp,
    handleAuthenticationType
}