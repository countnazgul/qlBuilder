const program = require('commander');
// require('./packages/argumentsSetup.js')();
let argsFunctions = require('./packages/argumentsFunctions');

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
            await argsFunctions.setScript()
        });

    program
        .command('checkscript [env]')
        .description('run setup commands for all envs')
        // .option("-s, --setup_mode [mode]", "Which setup mode to use")
        .action(async function (env, options) {
            await argsFunctions.checkScript()
            // console.log(env);
        });



    program
        .command('watch [env]')
        .description('run setup commands for all envs')
        .action(async function (env, options) {
            await argsFunctions.startWatching(program.reload)
        });

    program
        .version('0.0.1')
        .option('-b, --build', 'Build the load script from "src" folder files')
        .option('-r, --reload', 'Reload the app')
    // .option('-P, --pineapple', 'Add pineapple')
    // .option('-b, --bbq-sauce', 'Add bbq sauce')
    // .option('-c, --cheese [type]', 'Add the specified type of cheese [marble]')

    program.on('--help', function () {
        console.log('')
        console.log('Examples:');
        console.log('  $ custom-help --help');
        console.log('  $ custom-help -h');
    });

    program.parse(process.argv);

    // if (program.cheese) console.log(program.cheese);

    if (program.build) {
        await argsFunctions.buildScript()
    }

})()

