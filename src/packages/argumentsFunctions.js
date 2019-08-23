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

const helpers = require('./helpers');
const qlikComm = require('./qlik-comm');
const common = require('./common')

const create = async function (project) {

    if (project) {
        let spinner = new Spinner('Creating ...');
        spinner.setSpinnerString('◐◓◑◒');
        spinner.start();

        if (!fs.existsSync(`${process.cwd()}/${project}`)) {
            helpers.createInitFolders(project)
            helpers.createInitialScriptFiles(project)
            helpers.createInitConfig(project)
            spinner.stop(true)
            common.writeLog('ok', 'All set', false)
        } else {
            spinner.stop(true)
            common.writeLog('err', `Folder "${project}" already exists`, false)
        }
    } else {
        common.writeLog('err', `Please specify project name`, true)
    }
}

const buildScript = async function () {
    let loadScript = helpers.buildLoadScript()
    helpers.writeLoadScript(loadScript)
    common.writeLog('ok', 'Load script created', false)
    return loadScript
}

const setScript = async function (env) {
    let script = await buildScript()
    await qlikComm.setScript(script, env)
}

const getScript = async function (env) {

    const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'This will overwrite all local files. Are you sure?',
        initial: false
    })

    if (response.value == true) {
        let getScriptFromApp = await qlikComm.getScriptFromApp(env)
        let scriptTabs = getScriptFromApp.split('///$tab ')

        helpers.clearLocalScript()
        writeScriptToFiles(scriptTabs)

        common.writeLog('ok', 'Local script files were created', false)
    } else {
        console.log('Nothing was changed')
    }
}

const checkScript = async function (env, script) {
    let spinner = new Spinner('Checking for syntax errors ...');
    spinner.setSpinnerString('☱☲☴');
    spinner.start();

    if (!script) {
        console.log('')
        var script = await buildScript()
    }

    let scriptResult = ''

    try {
        scriptResult = await qlikComm.checkScriptSyntax(script, env)
    } catch (e) {
        common.writeLog('err', e.message, false)
    }
    finally {
        spinner.stop(true)
    }


    if (scriptResult.length > 0) {
        common.writeLog('err', `Syntax errors found!`, false)
        displayScriptErrors(scriptResult)
    } else {
        common.writeLog('ok', 'No syntax errors were found', false)
    }


    return scriptResult
}

const startWatching = async function (reload, setScript, env) {

    console.log(`\nCommands during watch mode:
- set script: s or set
- reload app: r or rl
- clear console: c or clr
- exit - x
(script is checked for syntax errors anytime one of the qvs files is saved)

    `)

    if (reload) {
        console.log(`Reload is set to "true"! 
Each successful build will trigger:
    - set script
    - check the script for syntax errors
      - if error - stop here. The app is not saved and the script is not updated
    - reload app
    - save app
   
You know ... just saying :)`)
    }



    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', async function (line) {
        if (line.toLowerCase() === "rl" || line.toLowerCase() === "r") {
            await qlikComm.reloadApp(env)
            // console.log('Here goes the reload')
        }

        if (line.toLowerCase() === "x") {
            process.exit()
        }

        if (line.toLowerCase() === "c" || line.toLowerCase() === "clr") {
            // console.clear()
            process.stdout.write("\u001b[2J\u001b[0;0H");
            console.log('Still here :)')
        }

        if (line.toLowerCase() === "s" || line.toLowerCase() == "set") {
            let script = await buildScript()

            common.writeLog('ok', 'Script was build', false)
            await qlikComm.setScript(script, env)
        }
    })

    const watcher = chokidar.watch('./src/**/*.qvs');

    watcher
        .on('change', async function (path) {
            let script = await buildScript()
            await checkScript(env, script)

            if (reload) {
                await qlikComm.setScript(script, env)
                await qlikComm.reloadApp(env)
            }

            if (reload && setScript) {
                await qlikComm.setScript(script, env)
                await qlikComm.reloadApp(env)
            }

            if (!reload && setScript) {
                await qlikComm.setScript(script, env)
            }
        })
}

const reload = async function (env) {
    await qlikComm.reloadApp(env)
}

const checkForUpdate = async function () {
    try {
        let getGitData = await axios.get('https://raw.githubusercontent.com/countnazgul/qluilder/master/package.json')
        let gitVersion = getGitData.data.version

        if (compareVersions(gitVersion, currentVersion, '>')) {
            console.log('New version is available!')
            console.log(`Current version: ${currentVersion}`)
            console.log(`Remote version: ${gitVersion}`)
            console.log('To install it run:')
            console.log('npm install -g qlbuilder')
        } else {

            console.log('Latest version is already installed')
        }

    } catch (e) {
        console.log('')
        common.writeLog('err', `Unable to get the remote version number :'(`, false)
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

                fs.writeFileSync(`${process.cwd}\\src\\${i}--${tabNameSafe}.qvs`, scriptContent)
            }
        }
    } catch (e) {
        common.writeLog('err', e.message, false)
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