const fs = require('fs');
const yaml = require('js-yaml');
const chalk = require('chalk');

const getEnvDetails = function (env) {
    let config = ''
    try {
        config = yaml.safeLoad(fs.readFileSync('./config.yml'))
    } catch (e) {
        console.log(chalk.red('✖ ') + `"config.yml" not found in the current directory`)
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

module.exports = {
    getEnvDetails
}