const fs = require('fs');
const chokidar = require('chokidar');
const readline = require('readline');
const axios = require('axios')

const helpers = require('./helpers');
const qlikComm = require('./qlik-comm');

const create = async function (project) {
    if (!fs.existsSync(`./${project}`)) {
        helpers.createInitFolders(project)
        helpers.createInitialScriptFiles(project)
        helpers.createInitConfig(project)
    } else {
        console.log(`Folder ${project} already exists`)
    }
}

const buildScript = async function () {
    let loadScript = helpers.buildLoadScript()
    helpers.writeLoadScript(loadScript)

    return loadScript
}

const setScript = async function (env) {
    let script = await buildScript()
    await qlikComm.setScript(script, env)
}

const checkScript = async function (env) {
    let script = await buildScript()
    let scriptResult = await qlikComm.checkScriptSyntax(script, env)
    console.log(scriptResult.length)

    console.log('Checking for syntax errors ...')
    if (scriptResult.length > 0) {
        displayScriptErrors(scriptResult)
    } else {
        console.log('No syntax errors were found')
    }

    return scriptResult
}

const startWatching = async function (reload, env) {

    if (reload) {
        console.log(`Reload is set to "true"! 
Each succesful build will trigger:
    - set script
    - save app
    - reload app
    - save app
   
You know ... just saying :)`)
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', async function (line) {
        if (line.toLowerCase() === "rl") {
            console.log('Here goes the reload')
        }

        if (line.toLowerCase() === "x") {
            process.exit()
        }

        if (line.toLowerCase() === "s") {
            let script = await buildScript()
            console.log('Script build')
            await qlikComm.setScript(script, env)
        }
    })

    const watcher = chokidar.watch('./src/**/*.qvs');

    watcher
        .on('add', path => console.log(`${path} has been added. Added to the watching list`))
        .on('change', async function (path) {

            let script = await buildScript()
            let scriptErrors = await qlikComm.checkScriptSyntax(script, env)

            console.log('Checking for syntax errors ...')
            if (scriptErrors.length > 0) {
                displayScriptErrors(scriptErrors)
            } else {
                console.log('No syntax errors were found')
            }

            if (reload) {
                await qlikComm.setScript(script, env)
                await qlikComm.reload()
            }
        })
}

const reload = async function(env) {
    await qlikComm.reloadApp(env)
}

const checkForUpdate = async function () {
    // try {
    // let getGitData = axios.get('https://github.com/countnazgul/qBuilder/blob/master/package.json')
    let getGitData = await axios.get('https://raw.githubusercontent.com/countnazgul/enigma-mixin/master/package.json')
    let gitVersion = getGitData.data.version
    let a = 1

    // } catch (e) {

    // }
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
        console.log(tabScript[scriptError.qLineInTab - 1])
    }
}

module.exports = {
    create,
    buildScript,
    setScript,
    checkScript,
    reload,
    startWatching,
    checkForUpdate
}