const program = require('commander');
const argsFunctions = require('./packages/argumentsFunctions');
const helpers = require('./packages/helpers');
const common = require('./packages/common');
const currentVersion = require('..\\package.json').version

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

(async function () {
    program
        .name("qlbuilder")
        .usage("command [environment name]")
        .version(currentVersion, '-v, --version', 'Output the current version');

    program
        .command('create [name]')
        .description('Create new project folder structure')
        .action(async function (name, options) {
            if (!name) common.write.log({ error: true, message: `Please specify project name`, exit: true })

            let init = await argsFunctions.create(name)
            common.writeLog(init.error ? 'err' : 'ok', init.message, true)
        });

    program
        .command('setscript [env]')
        .description('Build and set the script')
        .action(async function (envName, options) {
            // helpers.initialChecks.combined()
            // helpers.initialChecks.environment(env)

            let initialChecks = helpers.initialChecks.combined(envName)
            if (initialChecks.error) common.writeLog('err', initialChecks.message, true)

            let setScript = await argsFunctions.setScript({ environment: initialChecks.message.env, variables: initialChecks.message.variables })
            common.writeLog(setScript.error ? 'err' : 'ok', setScript.message, true)
        });

    program
        .command('getscript [env]')
        .description('Get the script from the target Qlik app and overwrite the local script')
        .action(async function (envName, options) {
            let initialChecks = helpers.initialChecks.combined(envName)
            if (initialChecks.error) common.writeLog('err', initialChecks.message, true)

            let script = await argsFunctions.getScript({ environment: initialChecks.message.env, variables: initialChecks.message.variables })
            common.writeLog(script.error ? 'err' : 'ok', script.message, true)
        });

    program
        .command('checkscript [env]')
        .description('Check local script for syntax errors')
        .action(async function (envName, options) {
            let initialChecks = helpers.initialChecks.combined(envName)
            if (initialChecks.error) common.writeLog('err', initialChecks.message, true)

            let checkScript = await argsFunctions.checkScript({ environment: initialChecks.message.env, variables: initialChecks.message.variables })
            common.writeLog(checkScript.error ? 'err' : 'ok', checkScript.message, true)
        });

    program
        .command('watch [env]')
        .description('Start qlBuilder in watch mode')
        .option('-r', 'Reload and save on each file change')
        .option('-s', 'Set script and save app on each file change')
        .action(async function (envName, options) {
            let initialChecks = helpers.initialChecks.combined(envName)
            if (initialChecks.error) common.writeLog('err', initialChecks.message, true)

            let watching = await argsFunctions.startWatching({
                environment: initialChecks.message.env,
                variables: initialChecks.message.variables,
                args: {
                    reload: options.R || false,
                    setScript: options.S || false,
                }
            })
        });

    program
        .command('build')
        .description('Combine the tab script files into one')
        .action(async function (envName, options) {
            // the full initial checks are not required
            // just check if src and dist folders are present
            let initialChecks = helpers.initialChecks.short()
            if (initialChecks.error) common.writeLog('err', initialChecks.message, true)

            let buildScript = await argsFunctions.buildScript()
            if (buildScript.error) common.writeLog('err', buildScript.message, true)

            common.writeLog('ok', 'Load script created and saved', true)
        });

    program
        .command('reload [env]')
        .description('Set script and reload the target app')
        .action(async function (envName, options) {
            let initialChecks = helpers.initialChecks.combined(envName)
            if (initialChecks.error) common.writeLog('err', initialChecks.message, true)

            let reload = await argsFunctions.reload({ environment: initialChecks.message.env, variables: initialChecks.message.variables })
            common.writeLog(reload.error ? 'err' : 'ok', reload.message, true)
        });

    program
        .command('checkupdate')
        .description('Check for qlBuilder updates')
        .action(async function () {
            let checkUpdate = await argsFunctions.checkForUpdate()
            if (checkUpdate.error) common.writeLog('err', checkUpdate.message, true)

            common.writeLog('ok', checkUpdate.message, true)
        });

    program.on('--help', function () {
        console.log('')
        console.log('Examples:');
        console.log(' > qlbuilder setscript desktop');
        console.log(' > qlbuilder reload desktop');
        console.log(' > qlbuilder watch desktop -r');
        console.log(' > qlbuilder watch desktop -s');
        console.log('');
        console.log('More info: https://github.com/countnazgul/qlBuilder');
        console.log('');
    });

    program.on('command:*', function () {
        console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
        process.exit(1);
    });

    program.parse(process.argv);
})()

