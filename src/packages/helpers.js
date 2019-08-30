const fs = require('fs');
const yaml = require('js-yaml');
const os = require('os');
const path = require('path');
const axios = require('axios');
const url = require('url');

const common = require('./common');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const getEnvDetails = function (env) {
    let config = ''
    try {
        config = yaml.safeLoad(fs.readFileSync(`${process.cwd()}\\config.yml`))
    } catch (e) {
        common.writeLog('err', '`"config.yml" not found in the current directory`', true)
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
            ,
            {
                "name": "jwt",
                "host": "wss://my-qs-engine-host/virtual-proxy-prefix",
                "appId": "12345678-1234-1234-1234-12345678901",
                "authentication": {
                    "type": "jwt",
                    "tokenLocation": "C:/path/to/jwt/file/location"
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
    try {
        let directory = './src'

        let files = fs.readdirSync(directory)

        for (let file of files) {
            fs.unlinkSync(path.join(directory, file));
        }

        common.writeLog('ok', 'Local script files removed', false)
    } catch (e) { }
}

const initialChecks = {
    configFile: function () {
        if (fs.existsSync(`${process.cwd()}/config.yml`)) {
            return true
        } else {
            common.writeLog('err', `"config.yml" do not exists! I'm running at the correct folder?`, true)
        }
    },
    srcFolder: function () {
        if (fs.existsSync(`${process.cwd()}/src`)) {
            return true
        } else {
            common.writeLog('ok', `config is present but "src" folder was not and was created`, true)
        }
    },
    distFolder: function () {
        if (fs.existsSync(`${process.cwd()}/dist`)) {
            return true
        } else {
            common.writeLog('ok', `config is present but "dist" folder was not and was created`, true)
        }
    },
    environment: function (env) {
        let envDetails = getEnvDetails(env)
        if (envDetails.length > 0) {
            return true
        } else {
            common.writeLog('err', `Environment "${env}" was not found in the "config.yml"! Typo?`, true)
        }

    },
    combined: function () {
        initialChecks.configFile()
        initialChecks.srcFolder()
        initialChecks.distFolder()
    }

}

const winFormSession = {
    firstRequest: async function (config) {

        config.xrfkey = generateXrfkey(16);

        config.host = config.host.replace('wss://', 'https://').replace('ws://', 'http://')

        try {
            let firstRequest = await axios.get(`${config.host}/qrs/about?xrfkey=${config.xrfkey}`, {
                headers: {
                    "x-qlik-xrfkey": config.xrfkey,
                    'User-Agent': 'Form'
                },
                maxRedirects: 0,
                validateStatus: null
            })

            return firstRequest.headers.location
        } catch (e) {
            common.writeLog('err', e.message, false)
        }
    },
    secondRequest: async function (config, credentialsData) {

        let urlParams = url.parse(config.authLocation, { parseQueryString: true }).query

        let reqOptions = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "x-qlik-xrfkey": urlParams.xrfkey
            }
        }

        let secondRequest = ''

        try {
            secondRequest = await axios.post(config.authLocation, credentialsData, reqOptions)
        } catch (e) {
            common.writeLog('err', e.message, true)
        }
        try {
            let cookieSessionId = secondRequest.headers['set-cookie'].filter(function (c) {
                return c.indexOf(config.sessionHeaderName) > -1
            })[0].split(';')[0].split(`${config.sessionHeaderName}=`)[1]

            return cookieSessionId
        } catch (e) {
            common.writeLog('err', `Error parsing the response for Session ID. Most likely the session header is not correctly set`, true)
        }
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
    winFormSession,
    generateXrfkey
}