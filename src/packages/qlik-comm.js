const enigma = require('enigma.js');
const WebSocket = require('ws');
const schema = require('enigma.js/schemas/12.20.0.json');

const setScript = async function (script) {
    const session = enigma.create({
        schema,
        url: 'ws://localhost:4848/app/engineData',
        createSocket: url => new WebSocket(url),
    });

    let global = await session.open()
    let doc = await global.openDoc('C:\\Users\\Home\\Documents\\Qlik\\Sense\\Apps\\Build TEST.qvf')
    await doc.setScript(script)
    await doc.doSave()

    await session.close()
}

const checkScriptSyntax = async function (script) {
    const session = enigma.create({
        schema,
        url: 'ws://localhost:4848/app/engineData',
        createSocket: url => new WebSocket(url),
    });

    let global = await session.open()
    let doc = await global.createSessionApp()
    await doc.setScript(script)
    let syntaxCheck = await doc.checkScriptSyntax()
    await session.close()

    return syntaxCheck
}

const reloadApp = function () {

}


module.exports = {
    setScript,
    checkScriptSyntax
}