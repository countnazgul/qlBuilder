const program = require('commander');
const argsFunctions = require('./argumentsFunctions');



const setScript = async function () {
    return program
        .command('setscript [env]')
        .action(async function (env) {
            console.log(env)
        })
}

// const setScript = async function () {
//     return program
//         .option("-s, --set", "Which setup mode to use")
// }


const all = async function () {
    // await init()
    await setScript()
}

module.exports = all