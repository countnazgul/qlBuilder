const messages = {
    watch: {
        reload: `Reload is set to "true"! 
Each successful build will trigger:
    - set script
    - check the script for syntax errors
        - if error - stop here. The app is not saved and the script is not updated
    - reload app
    - save app
    
You know ... just saying :)`,
        commands: `\nCommands during watch mode:
- set script: s or set
- reload app: r or rl
- clear console: c or clr
- exit - x
(script is checked for syntax errors anytime one of the qvs files is saved)

    `
    }
}


module.exports = messages;