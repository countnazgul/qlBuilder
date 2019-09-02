const fs = require('fs');
const helpers = require('../src/packages/helpers');

test('Env details exists', () => {
    let envDetails = helpers.getEnvDetails('desktop')
    expect(envDetails.length).toBe(1)
})

test('Correct Environment details loaded', () => {
    let envDetails = helpers.getEnvDetails('desktop')
    expect(envDetails[0].host).toBe('ws://localhost:4848')
})

test('Init folders can be created', () => {
    let rootFolder = 'run-test'
    helpers.createInitFolders(rootFolder)

    let folders = [`./${rootFolder}/src`, `${rootFolder}/dist`, `./${rootFolder}`]
    let allFoldersExists = []

    for (let folder of folders) {
        let exists = fs.existsSync(folder)
        allFoldersExists.push(exists)

        if (exists) {
            fs.rmdirSync(folder)
        }
    }

    expect(allFoldersExists).toEqual([true, true, true])
})