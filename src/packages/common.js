const chalk = require('chalk');

const writeLog = function (type, message, exit) {
    let symbol = {
        err: chalk.red('✖'),
        warn: chalk.yellow('\u26A0'),
        ok: chalk.red('√')
    }

    let logMessage = `${symbol[type]} ${message}`

    console.log(logMessage)

    if (exit) {
        process.exit()
    }

}

module.exports = {
    writeLog
}