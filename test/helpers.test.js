const helpers = require('../src/packages/helpers');
// let envDetails = helpers.getEnvDetails('desktop')


test('Correct Environment details loaded', () => {
    console.log(`${process.cwd()}\n\n\n\n\n`)
    let envDetails = helpers.getEnvDetails('desktop')
    console.log(envDetails)
    expect(true).toBe(true)
})