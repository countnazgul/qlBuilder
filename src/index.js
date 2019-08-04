const program = require('commander');
const argsFunctions = require('./packages/argumentsFunctions');
const helpers = require('./packages/helpers')

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

(async function () {
    program
        .command('create [project]')
        .description('run setup commands for all envs')
        .action(async function (project, options) {
            await argsFunctions.create(project)
        });

    program
        .command('setscript [env]')
        .description('run setup commands for all envs')
        .action(async function (env, options) {
            helpers.initialChecks.combined()
            await argsFunctions.setScript(env)
        });

    program
        .command('getscript [env]')
        .description('run setup commands for all envs')
        .action(async function (env, options) {
            helpers.initialChecks.combined()
            await argsFunctions.getScript(env)
        });

    program
        .command('checkscript [env]')
        .description('run setup commands for all envs')
        .action(async function (env, options) {
            helpers.initialChecks.combined()
            await argsFunctions.checkScript(env)
        });

    program
        .command('watch [env]')
        .description('run setup commands for all envs')
        .action(async function (env, options) {
            helpers.initialChecks.combined()
            await argsFunctions.startWatching(program.reload, env)
        });

    program
        .command('build')
        .description('run setup commands for all envs')
        .action(async function (env, options) {
            helpers.initialChecks.combined()
            await argsFunctions.buildScript()
        });

    program
        .command('reload [env]')
        .description('run setup commands for all envs')
        .action(async function (env, options) {
            helpers.initialChecks.combined()
            await argsFunctions.reload(env)
        });

    program
        .command('checkupdate [env]')
        .description('run setup commands for all envs')
        .action(async function (env, options) {
            await argsFunctions.checkForUpdate()
        });

    program
        .version('0.0.1')
        .option('-r, --reload', 'Reload the app')

    program.on('--help', function () {
        console.log('')
        console.log('Examples:');
        console.log('  $ custom-help --help');
        console.log('  $ custom-help -h');
    });

    program.parse(process.argv);
})()

