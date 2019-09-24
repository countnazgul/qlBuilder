const fs = require('fs');
const yaml = require('js-yaml');
const os = require('os');
const path = require('path');

const common = require('./common');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const getEnvDetails = function (env) {
    let config = ''
    try {
        config = yaml.safeLoad(fs.readFileSync(`${process.cwd()}/config.yml`))
    } catch (e) {
        return { error: true, message: e.message }
    }

    try {
        let envDetails = config["qlik-environments"].filter(function (e) {
            return e.name.toLowerCase() == env.toLowerCase()
        })

        if (envDetails.length == 0) {
            return { error: true, message: `The specified environment (${env}) do not exists in the config` }
        }

        return { error: false, message: envDetails }
    } catch (e) {
        return { error: true, message: e.message }
    }
}

const createInitFolders = function (project) {
    try {
        fs.mkdirSync(`./${project}`)
        fs.mkdirSync(`./${project}/src`)
        fs.mkdirSync(`./${project}/dist`)
    } catch (e) {
        common.writeLog('err', e.message, true)
    }
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
                "host": "ws://localhost:4848",
                "appId": `C:/Users/${os.userInfo().username}/Documents/Qlik/Sense/Apps/test.qvf`
            },
            {
                "name": "qse",
                "host": "wss://my-qs-engine-host:4747",
                "appId": "12345678-1234-1234-1234-12345678901",
                "authentication": {
                    "type": "certificates",
                    "certLocation": "C:/path/to/cert/folder",
                    "user": "DOMAIN\\username"
                }
            },
            {
                "name": "jwt",
                "host": "wss://my-qs-engine-host/virtual-proxy-prefix",
                "appId": "12345678-1234-1234-1234-12345678901",
                "authentication": {
                    "type": "jwt",
                    "tokenLocation": "C:/path/to/jwt/file/location",
                    "sessionHeaderName": "X-Qlik-Session"
                }
            },
            {
                "name": "winform",
                "host": "wss://my-qs-proxy",
                "appId": "12345678-1234-1234-1234-12345678901",
                "parseInclude": true,
                "authentication": {
                    "type": "winform",
                    "sessionHeaderName": "X-Qlik-Session"
                }
            }
        ]
    }
    try {
        fs.writeFileSync(`./${project}/config.yml`, yaml.dump(defaultConfig))
    } catch (e) {
        common.writeLog('err', e.message, true)
    }
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

        buildScript.push(`///$tab ${tabName}\r\n${fileContent}`)
    }

    return buildScript.join('\n\n')
}

const writeLoadScript = function (script) {
    try {
        fs.writeFileSync('./dist/LoadScript.qvs', script)

        return { error: false, message: 'Script saved' }
    } catch (e) {
        return { error: true, message: e.message }
    }
}

const setScript = async function () {

}

const readCert = function (certPath, filename) {
    return fs.readFileSync(`${certPath}/${filename}`);
}

const clearLocalScript = async function () {
    try {
        let directory = './src'

        let files = fs.readdirSync(directory)

        for (let file of files) {
            fs.unlinkSync(path.join(directory, file));
        }

        return { error: false, message: 'Local script files removed' }
    } catch (e) {
        return { error: true, message: e.message }
    }
}

const initialChecks = {
    configFile: function () {
        if (!fs.existsSync(`${process.cwd()}/config.yml`)) {
            return { error: true, message: `"config.yml" do not exists! I'm running at the correct folder?` }
        }

        return { error: false, message: 'config.yml was found' }
    },
    srcFolder: function () {
        if (!fs.existsSync(`${process.cwd()}/src`)) {
            // fs.mkdirSync(`${process.cwd()}/src`)
            return { error: true, message: `config is present but "src" folder was not` }
        }

        return { error: false, message: '"src" folder was found' }
    },
    distFolder: function () {
        if (!fs.existsSync(`${process.cwd()}/dist`)) {
            // fs.mkdirSync(`${process.cwd()}/dist`)
            return { error: true, message: `config is present but "dist" folder was not` }
        }

        return { error: false, message: '"dist" folder was found' }
    },
    environment: function (env) {
        let envDetails = getEnvDetails(env)
        if (envDetails.error) return envDetails

        if (envDetails.message.length == 0) {
            return { error: true, message: `Environment "${env}" was not found in the "config.yml"` }
        }
        return { error: false, message: envDetails.message[0] }
    },
    environmentVariables: function (env) {
        let allEnvVariables = common.envVariablesCheck.combined(env)
        if (allEnvVariables.error) return allEnvVariables

        return { error: false, message: allEnvVariables.message }
    },
    combined: function (envName) {
        // if the config file exists
        let configFile = initialChecks.configFile()
        if (configFile.error) return configFile

        // if src folder exists - else create it
        let srcFolder = initialChecks.srcFolder()
        if (srcFolder.error) return srcFolder

        // if src dist exists - else create it
        let distFolder = initialChecks.distFolder()
        if (distFolder.error) return distFolder

        // if the required env setup parameters are present
        // in the config file
        let envDetails = initialChecks.environment(envName)
        if (envDetails.error) return envDetails

        // if the required variables are set
        // or specified in .qlbuilder file
        let envVariables = initialChecks.environmentVariables(envDetails.message)
        if (envVariables.error) return envVariables

        return { error: false, message: { env: envDetails.message, variables: envVariables.message } }
    },
    short: function () {
        // if src folder exists - else create it
        let srcFolder = initialChecks.srcFolder()
        if (srcFolder.error) return srcFolder

        // if src dist exists - else create it
        let distFolder = initialChecks.distFolder()
        if (distFolder.error) return distFolder

        return { error: false, message: 'SRC and DIST folders exists' }
    }
}

const generateXrfkey = function (length) {
    return [...Array(length)].map(i => (~~(Math.random() * 36)).toString(36)).join('')
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
    initialChecks,
    generateXrfkey
}