const os = require('os');

const messages = {
    watch: {
        reload: function () {
            let rows = [
                '\n',
                'Reload is set to "true"!\n',
                'Each successful build will trigger:\n',
                '    - check the script for syntax errors\n',
                '        - if error - stop here. The app is not saved and the script is not updated\n',
                '    - set script\n',
                '    - reload app\n',
                '    - save app\n',
                'You know ... just saying :)\n',
            ]

            return rows.join('')
        },
        commands: function () {
            let rows = [
                '\n',
                'Commands during watch mode:\n',
                '    - set script: s or set\n',
                '    - reload app: r or rl\n',
                '    - clear console: c or clr\n',
                '    - show this message again: ?\n',
                '    - exit - x\n',
                '(script is checked for syntax errors every time one of the qvs files is saved)\n'
            ]
            return rows.join('')
        }
    },
    script: function () {
        let scriptRows = [
            `SET ThousandSep=',';\n`,
            `SET DecimalSep='.';\n`,
            `SET MoneyThousandSep=',';\n`,
            `SET MoneyDecimalSep='.';\n`,
            `SET MoneyFormat='$#,##0.00;($#,##0.00)';\n`,
            `SET TimeFormat='h:mm:ss TT';\n`,
            `SET DateFormat='M/D/YYYY';\n`,
            `SET TimestampFormat='M/D/YYYY h:mm:ss[.fff] TT';\n`,
            `SET MonthNames='Jan;Feb;Mar;Apr;May;Jun;Jul;Aug;Sep;Oct;Nov;Dec';\n`,
            `SET DayNames='Mon;Tue;Wed;Thu;Fri;Sat;Sun';\n`
        ]

        return scriptRows.join('')
    },
    defaultConfig: function () {
        return [
            {
                "name": "desktop",
                "host": "ws://localhost:4848",
                "appId": `C:/Users/${os.userInfo().username}/Documents/Qlik/Sense/Apps/test.qvf`
            },
            {
                "name": "qse",
                "host": "wss://my-qs-engine-host:4747",
                "appId": "12345678-1234-1234-1234-12345678901",
                "authentication": {
                    "type": "certificates",
                    "certLocation": "C:/path/to/cert/folder",
                    "user": "DOMAIN\\username"
                }
            },
            {
                "name": "jwt",
                "host": "wss://my-qs-engine-host/virtual-proxy-prefix",
                "appId": "12345678-1234-1234-1234-12345678901",
                "authentication": {
                    "type": "jwt",
                    "tokenLocation": "C:/path/to/jwt/file/location",
                    "sessionHeaderName": "X-Qlik-Session"
                }
            },
            {
                "name": "winform",
                "host": "wss://my-qs-proxy",
                "appId": "12345678-1234-1234-1234-12345678901",
                "parseInclude": true,
                "authentication": {
                    "type": "winform",
                    "sessionHeaderName": "X-Qlik-Session"
                }
            }
        ]
    },
    newVersion: function (currentVersion, gitVersion) {
        return [
            `New version is available!`,
            `Current version: ${currentVersion}`,
            `Remote version: ${gitVersion}`,
            `To install it run:`,
            `npm install -g qlbuilder`]
    }
}

module.exports = messages;