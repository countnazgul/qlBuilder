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
    }
}

module.exports = messages;