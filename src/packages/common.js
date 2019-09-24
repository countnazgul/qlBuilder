const fs = require('fs');
const homedir = require('os').homedir();
const chalk = require('chalk');
const yaml = require('js-yaml');

const write = {
    log: function ({ error, message, exit = false }) {
        let symbol = {
            true: chalk.red('✖'),
            warn: chalk.yellow('\u26A0'),
            false: chalk.green('√')
        }

        let logMessage = `${symbol[error.toString()]} ${message}`

        console.log(logMessage)

        if (exit) {
            process.exit()
        }

    },

    file: function (path, content) {
        return fs.writeFileSync(path, content)
    }
}

const writeLog = function (type, message, exit) {
    let symbol = {
        err: chalk.red('✖'),
        warn: chalk.yellow('\u26A0'),
        ok: chalk.green('√')
    }

    let logMessage = `${symbol[type]} ${message}`

    console.log(logMessage)

    if (exit) {
        process.exit()
    }

}

const envVariablesCheck = {
    auth_config: {
        winform: ['QLIK_USER', 'QLIK_PASSWORD'],
        noVar: []
    },
    homeConfig: function (environment) {
        if (!fs.existsSync(`${homedir}/.qlbuilder.yml`)) {
            return { error: true, message: `.qlbuilder.yml do not exists in the user home folder` }
        }

        let config = yaml.safeLoad(fs.readFileSync(`${homedir}/.qlbuilder.yml`))

        if (!config[environment]) {
            return { error: true, message: 'config exists but there is no env config there' }
        }

        return { error: false, message: config[environment] }
    },
    homeConfigEnvironmentsCheck: function (auth_type, homeVariables) {
        if (!envVariablesCheck.auth_config[auth_type]) {
            return { error: true, message: 'the required type was not found' }
        }

        if (auth_type == 'noVar') {
            return { error: false, message: 'the required type do not need any variables' }
        }

        let variablesContent = { error: false, message: {} }

        for (let eVar of envVariablesCheck.auth_config[auth_type]) {
            if (!homeVariables[eVar]) {
                variablesContent = { error: true, message: `${eVar} is not set` }
                break;
            }

            variablesContent.message[eVar] = homeVariables[eVar]
        }

        return variablesContent

    },
    variables: function (auth_type) {
        if (!envVariablesCheck.auth_config[auth_type]) {
            return { error: true, message: 'the required type was not found' }
        }

        if (auth_type == 'noVar') {
            return { error: false, message: 'the required type do not need any variables' }
        }

        let variablesContent = { error: false, message: {} }

        for (let eVar of envVariablesCheck.auth_config[auth_type]) {
            if (!process.env[eVar]) {
                variablesContent = { error: true, message: `${eVar} is not set` }
                break;
            }

            variablesContent.message[eVar] = process.env[eVar]

        }

        return variablesContent
    },
    combined: function (envConfig) {
        let homeConfig = envVariablesCheck.homeConfig(envConfig.name)
        let envVariables = envVariablesCheck.variables(envConfig.authentication.type)

        // both env var and home config are in error
        if (homeConfig.error && envVariables.error) {
            return {
                error: true,
                message: `Home config: ${homeConfig.message}\n${chalk.red('✖')} Environment variable: ${envVariables.message}`
            }
        }

        // only home config exists
        if (!homeConfig.error && envVariables.error) {
            return envVariablesCheck.homeConfigEnvironmentsCheck(envConfig.authentication.type, homeConfig.message)
        }

        // only env variables exists
        if (homeConfig.error && !envVariables.error) {
            return envVariables
        }

        // if both are ok:
        // check if the home config variables are ok. 
        //   yes - return home config
        //   no  - return env variables
        let homeConfigCheck = envVariablesCheck.homeConfigEnvironmentsCheck(envConfig.authentication.type, homeConfig.message)

        if (!homeConfigCheck.error) {
            return homeConfig
        }

        return envVariables
    }
}

const read = {

}

module.exports = {
    writeLog,
    write,
    envVariablesCheck
}