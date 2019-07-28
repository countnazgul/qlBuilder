const fs = require('fs');
const yaml = require('js-yaml')

const checkInitFoldersExists = async function () {    
    if (!fs.existsSync('./src')) {
        let initialScriptContent = `SET ThousandSep=',';
SET DecimalSep='.';
SET MoneyThousandSep=',';
SET MoneyDecimalSep='.';
SET MoneyFormat='$#,##0.00;($#,##0.00)';
SET TimeFormat='h:mm:ss TT';
SET DateFormat='M/D/YYYY';
SET TimestampFormat='M/D/YYYY h:mm:ss[.fff] TT';
SET MonthNames='Jan;Feb;Mar;Apr;May;Jun;Jul;Aug;Sep;Oct;Nov;Dec';
SET DayNames='Mon;Tue;Wed;Thu;Fri;Sat;Sun';        
`
        let changeLogContent = `// Script changes

//${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}: Automated: Script created 
`

        fs.mkdirSync('./src')
        fs.writeFileSync('0--Main', initialScriptContent)
        fs.writeFileSync('1--ChangeLog', changeLogContent)
    } else {
        console.log('"src" folder exists. Nothing was changed!')
    }

    if (!fs.existsSync('./dist')) {
        fs.mkdirSync('./dist')
    } else {
        console.log('"dist" folder exists. Nothing was changed!')
    }
}

const checkConfigExists = async function () {

    let defaultConfig = {
        "qlik-environments": [
            {
                "name": "desktop",
                "host": "localhost:4747",
                "appId": 123
            },
            {
                "name": "core",
                "host": "localhost:9076",
                "appId": 456
            }
        ]
    }

    if (!fs.existsSync('./config.yml')) {
        fs.writeFileSync('./config.yml', yaml.safeDump(defaultConfig))
        console.log('"config.yaml" was created and populated with default values')
    } else {
        console.log('"config.yaml" exists. Nothing was changed!')
    }
}

const buildLoadScript = function () {
    let scriptFiles = fs.readdirSync('./src').filter(function (f) {
        return f.indexOf('.qvs') > -1
    })

    let buildScript = []
    for (let file of scriptFiles) {
        let tabName = file.replace('.qvs', '').split('--')[1]
        let fileContent = fs.readFileSync(`./src/${file}`)

        buildScript.push(`///$tab ${tabName}\n${fileContent}`)
    }

    return buildScript.join('\n\n')
}

const writeLoadScript = function (script) {
    fs.writeFileSync('./dist/LoadScript.qvs', script)
}

const setScript = async function () {

}



module.exports = {
    checkInitFoldersExists,
    checkConfigExists,
    buildLoadScript,
    writeLoadScript,
    setScript
}