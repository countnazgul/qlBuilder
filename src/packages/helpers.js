const fs = require('fs');
const yaml = require('js-yaml');
const os = require('os');
const path = require('path');
const chalk = require('chalk');

const getEnvDetails = function (env) {
    let config = ''
    try {
        config = yaml.safeLoad(fs.readFileSync('./config.yml'))
    } catch (e) {
        console.log(`"config.yml" not found in the current directory`)
        process.exit()
    }

    try {
        let envDetails = config["qlik-environments"].filter(function (e) {
            return e.name.toLowerCase() == env.toLowerCase()
        })
        return envDetails
    } catch (e) {
        return false
    }
}

const createInitFolders = function (project) {
    fs.mkdirSync(`./${project}`)
    fs.mkdirSync(`./${project}/src`)
    fs.mkdirSync(`./${project}/dist`)
}

const createInitialScriptFiles = function (project) {
    let initialScriptContent = `SET ThousandSep=',';
SET DecimalSep='.';
SET MoneyThousandSep=',';
SET MoneyDecimalSep='.';
SET MoneyFormat='$#,##0.00;($#,##0.00)';
SET TimeFormat='h:mm:ss TT';
SET DateFormat='M/D/YYYY';
SET TimestampFormat='M/D/YYYY h:mm:ss[.fff] TT';
SET MonthNames='Jan;Feb;Mar;Apr;May;Jun;Jul;Aug;Sep;Oct;Nov;Dec';
SET DayNames='Mon;Tue;Wed;Thu;Fri;Sat;Sun';        
    `
    let changeLogContent = `// Script changes
    
//${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}: Automated: Script created 
    `
    fs.writeFileSync(`./${project}/src/0--Main.qvs`, initialScriptContent)
    fs.writeFileSync(`./${project}/src/1--ChangeLog.qvs`, changeLogContent)
    fs.writeFileSync(`./${project}/dist/LoadScript.qvs`, buildLoadScript(project))
}

const createInitConfig = function (project) {

    let defaultConfig = {
        "qlik-environments": [
            {
                "name": "desktop",
                "host": `ws://localhost:4848`,
                "appId": `C:\\Users\\${os.userInfo().username}\\Documents\\Qlik\\Sense\\Apps\\test.qvf`
            },
            {
                "name": "core",
                "host": "ws://localhost:9076",
                "appId": 456
            }
        ]
    }

    fs.writeFileSync(`./${project}/config.yml`, yaml.safeDump(defaultConfig))
}

const buildLoadScript = function (initProject) {
    let projectFolder = ''
    if (initProject) {
        projectFolder = `${initProject}/`
    }
    let scriptFiles = fs.readdirSync(`./${projectFolder}src`).filter(function (f) {
        return f.indexOf('.qvs') > -1
    })

    let buildScript = []
    for (let file of scriptFiles) {
        let tabName = file.replace('.qvs', '').split('--')[1]
        let fileContent = fs.readFileSync(`./${projectFolder}src/${file}`)

        buildScript.push(`///$tab ${tabName}\n${fileContent}`)
    }

    return buildScript.join('\n\n')
}

const writeLoadScript = function (script) {
    try {
        fs.writeFileSync('./dist/LoadScript.qvs', script)
    } catch (e) {
        console.log(e.message)
    }
}

const setScript = async function () {

}

const readCert = function (certPath, filename) {
    return fs.readFileSync(`${certPath}/${filename}`);
}

const clearLocalScript = async function () {
    let directory = './src'

    let files = fs.readdirSync(directory)

    for (let file of files) {
        fs.unlinkSync(path.join(directory, file));
    }

    console.log(chalk.green('√ ') + 'Local script files removed')
}

const initialChecks = {
    configFile: function () {
        if (fs.existsSync('.\\config.yml')) {
            return true
        } else {
            console.log(chalk.red('✖ ') + `"config.yml" do not exists! I'm running at the correct folder?`)
            process.exit()
        }
    },
    srcFolder: function () {
        if (fs.existsSync('.\\src')) {
            return true
        } else {
            console.log(chalk.green('√ ') + `config is present but "src" foder was not and was created`)
            process.exit()
        }
    },
    distFolder: function () {
        if (fs.existsSync('.\\dist')) {
            return true
        } else {
            console.log(chalk.green('√ ') + `config is present but "dist" foder was not and was created`)
            process.exit()
        }
    },
    combined: function () {
        initialChecks.configFile()
        initialChecks.srcFolder()
        initialChecks.distFolder()
    }

}

module.exports = {
    getEnvDetails,
    createInitFolders,
    createInitialScriptFiles,
    createInitConfig,
    buildLoadScript,
    writeLoadScript,
    setScript,
    readCert,
    clearLocalScript,
    initialChecks
}