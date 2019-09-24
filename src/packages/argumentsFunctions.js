const fs = require('fs');
const chokidar = require('chokidar');
const readline = require('readline');
const compareVersions = require('compare-versions');
const axios = require('axios');
const filenamify = require('filenamify');
const Spinner = require('cli-spinner').Spinner;
Spinner.setDefaultSpinnerDelay(200)
const prompts = require('prompts');

const currentVersion = require('..\\..\\package.json').version
const messages = require('./messages');

const helpers = require('./helpers');
const qlikComm = require('./qlik-comm');
const common = require('./common');

const create = async function (project) {
    let spinner = new Spinner('Creating ...');
    spinner.setSpinnerString('◐◓◑◒');
    spinner.start();

    if (!fs.existsSync(`${process.cwd()}/${project}`)) {
        helpers.createInitFolders(project)
        helpers.createInitialScriptFiles(project)
        helpers.createInitConfig(project)
        spinner.stop(true)
        // common.writeLog('ok', 'All set', false)
        return {error: false, message: 'All set'}
    } else {
        spinner.stop(true)
        return { error: true, message: `Folder "${project}" already exists` }
    }
}

const buildScript = async function () {
    let loadScript = helpers.buildLoadScript()

    let writeScript = helpers.writeLoadScript(loadScript)
    if (writeScript.error) return writeScript

    return ({ error: false, message: loadScript })
}

const setScript = async function ({ environment, variables }) {
    let script = await buildScript()
    if (script.error) return script

    let setScript = await qlikComm.setScript({ environment, variables, script: script.message })
    if (setScript.error) return setScript

    return { error: false, message: setScript.message }
}

const getScript = async function ({ environment, variables }) {

    const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'This will overwrite all local files. Are you sure?',
        initial: false
    })

    if (response.value == true) {
        let getScriptFromApp = await qlikComm.getScriptFromApp({ environment, variables })
        if (getScriptFromApp.error) return getScriptFromApp

        let scriptTabs = getScriptFromApp.message.split('///$tab ')

        let clearLocalScript = helpers.clearLocalScript()
        if (clearLocalScript.error) return clearLocalScript
        common.writeLog('ok', 'Local script files removed', false)

        let writeScriptFiles = writeScriptToFiles(scriptTabs)
        if (writeScriptFiles.error) common.writeLog('ok', writeScriptFiles.message, false)

        return { error: false, message: writeScriptFiles.message }
    } else {
        return { error: false, message: 'Nothing was changed' }
    }
}

const checkScript = async function ({ environment, variables, script }) {
    let spinner = new Spinner('Checking for syntax errors ...');
    spinner.setSpinnerString('☱☲☴');
    spinner.start();

    let loadScript = ''

    if (script) {
        let script = await buildScript()
        if (script.error) return script

        loadScript = script.message
    }

    let scriptResult = await qlikComm.checkScriptSyntax({ environment, variables, script: loadScript })
    if (scriptResult.error) return scriptResult

    spinner.stop(true)

    if (scriptResult.message.length > 0) {
        displayScriptErrors(scriptResult.message)
        return { error: true, message: 'Syntax errors found!' }
    }
    return { error: false, message: 'No syntax errors were found' }
}

const startWatching = async function ({ environment, variables, args }) {

    console.log(messages.watch.commands())

    if (args.reload) console.log(messages.watch.reload())

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.setPrompt('qlBuilder> ');
    rl.prompt();

    rl.on('line', async function (line) {
        // User exit
        if (line.toLowerCase() === "x") {
            common.writeLog('ok', 'Bye!', true)
        }

        // Clear screen
        if (line.toLowerCase() === "c" || line.toLowerCase() === "clr") {
            process.stdout.write("\u001b[2J\u001b[0;0H");
            console.log('Still here :)')
            rl.prompt();
            return { error: true, message: 'Bye!' }
        }

        // Reload app
        if (line.toLowerCase() === "rl" || line.toLowerCase() === "r") {
            let script = await buildScript()
            if (script.error) common.writeLog('err', script.message, true)

            let reload = await qlikComm.reloadApp({ environment, variables, script: script.message })
            if (reload.error) {
                common.writeLog('err', reload.message, false)
                rl.prompt();
                return { error: true, message: reload.message }
            }
        }

        // Set script
        if (line.toLowerCase() === "s" || line.toLowerCase() == "set") {
            let script = await buildScript()
            if (script.error) common.writeLog('err', script.message, true)

            common.writeLog('ok', 'Script was build', false)

            let setScript = await qlikComm.setScript({ environment, variables, script: script.message })
            if (setScript.error) common.writeLog('err', setScript.message, true)

            common.writeLog('ok', setScript.message, false)
        }

        if (line == '?') console.log(messages.watch.commands())

        rl.prompt();
    })

    const watcher = chokidar.watch('./src/**/*.qvs');

    watcher
        .on('change', async function () {
            let script = await buildScript()
            if (script.error) common.writeLog('err', script.message, false)

            let checkLoadScript = await checkScript({ environment, variables, script: script.message })
            if (checkLoadScript.error) {
                common.writeLog('err', checkLoadScript.message, false)
                rl.prompt();
                return { error: true, message: checkLoadScript.message }
            }

            common.writeLog('ok', checkLoadScript.message, false)

            // if only SetScript is set
            if (!args.reload && args.setScript) {
                let setScript = await qlikComm.setScript({ environment, variables, script: script.message })
                if (setScript.error) {
                    common.writeLog('err', setScript.message, true)
                    // return { error: true, message: setScript.message }
                }

                common.writeLog('ok', setScript.message, false)
            }

            // if Reload is set AND/OR SetScript is set
            if (args.reload) {
                let reload = await qlikComm.reloadApp({ environment, variables, script: script.message })
                if (reload.error) {
                    common.writeLog('err', reload.message, true)
                    // rl.prompt();
                    // return { error: true, message: reload.message }
                }

                common.writeLog('ok', reload.message, false)
            }

            rl.prompt();
        })
}

const reload = async function ({ environment, variables }) {
    let script = await buildScript()
    if (script.error) return script

    let scriptResult = await qlikComm.checkScriptSyntax({ environment, variables, script: script.message })
    if (scriptResult.error) return scriptResult

    if (scriptResult.message.length > 0) {
        displayScriptErrors(scriptResult.message)
        return { error: true, message: 'Syntax errors found!' }
    }

    common.writeLog('ok', 'No syntax errors', false)

    let reloadApp = await qlikComm.reloadApp({ environment, variables, script: script.message })
    if (reloadApp.error) return reloadApp

    return { error: false, message: reloadApp.message }
}

const checkForUpdate = async function () {
    try {
        let getGitData = await axios.get('https://raw.githubusercontent.com/countnazgul/qlBuilder/master/package.json')
        let gitVersion = getGitData.data.version

        if (compareVersions(gitVersion, currentVersion, '>')) {
            let message = `New version is available!
Current version: ${currentVersion}
Remote version: ${gitVersion}
To install it run:
npm install -g qlbuilder`

            return { error: false, message: message }
        } else {

            return { error: false, message: 'Latest version is already installed' }
        }

    } catch (e) {
        console.log('')
        return { error: true, message: `Unable to get the remote version number :'(` }
    }
}

function displayScriptErrors(scriptResultObj) {
    let scriptFiles = fs.readdirSync(`./src`).filter(function (f) {
        return f.indexOf('.qvs') > -1
    })

    let scriptErrorsPrimary = scriptResultObj.filter(function (e) {
        return !e.qSecondaryFailure
    })

    for (let scriptError of scriptErrorsPrimary) {
        let tabScript = fs.readFileSync(`./src/${scriptFiles[scriptError.qTabIx]}`).toString().split('\n')

        console.log(`
Tab : ${scriptFiles[scriptError.qTabIx]} 
Line: ${scriptError.qLineInTab} 
Code: ${tabScript[scriptError.qLineInTab - 1]}`)
    }


}

function writeScriptToFiles(scriptTabs) {
    try {
        for (let [i, tab] of scriptTabs.entries()) {

            if (tab.length > 0) {
                let rows = tab.split('\r\n')
                let tabName = rows[0]
                let tabNameSafe = filenamify(tabName, { replacement: '' });

                let scriptContent = rows.slice(1, rows.length).join('\r\n')

                fs.writeFileSync(`${process.cwd()}\\src\\${i}--${tabNameSafe}.qvs`, scriptContent)
            }
        }
        return { error: false, message: 'Local script files were created' }
    } catch (e) {
        return { error: true, message: e.message }
    }
}

module.exports = {
    create,
    buildScript,
    setScript,
    checkScript,
    reload,
    startWatching,
    checkForUpdate,
    getScript
}