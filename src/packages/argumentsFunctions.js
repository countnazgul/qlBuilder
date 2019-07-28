const fs = require('fs');

const chokidar = require('chokidar');
const readline = require('readline');

const helpers = require('./helpers');
const qlikComm = require('./qlik-comm');

const create = async function (project) {
    if (!fs.existsSync(`./${project}`)) {
        await helpers.checkInitFoldersExists()
        await helpers.checkConfigExists()
    } else {
        console.log(`Folder ${project} already exists`)
    }
}

const buildScript = async function () {
    let loadScript = helpers.buildLoadScript()
    helpers.writeLoadScript(loadScript)

    return loadScript
}

const setScript = async function () {
    let script = await buildScript()
    await qlikComm.setScript(script)
}

const checkScript = async function () {
    let script = await buildScript()
    return await qlikComm.checkScriptSyntax(script)
}

const startWatching = async function (reload) {

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

    rl.on('line', function (line) {
        if (line.toLowerCase() === "rl") {
            console.log('Here goes the reload')
        }
    })

    const watcher = chokidar.watch('./src/**/*.qvs');

    watcher
        .on('add', path => console.log(`${path} has been added. Added to the watching list`))
        .on('change', async function (path) {
            console.log(path)
            let script = await buildScript()
            let scriptErrors = await qlikComm.checkScriptSyntax(script)
            console.log(scriptErrors.length)

            if (reload) {
                await qlikComm.setScript(script)
                await qlikComm.reload()
            }
        })
}

module.exports = {
    create,
    buildScript,
    setScript,
    checkScript,
    startWatching
}