**Under development!**

## Motivation

`qBuilder` is a CLI tool from command prompt (or PowerShell) by providing the required arguments. The tool allows Qlik Sense developers to write their Qlik script on the local machine and set this script in Qlik app and reload the app from within Qlik Sense. 

## Installation

**(not published yet but this will be the way)**
> npm install -g qBuilder

Once the global package is installed you can use `qbuilder` command from anywhere

## How to use?

Run one of the following commands from CMD/PowerShell

* `qBuilder create [name]` - create the initial folders and files in the current folder. `name` is used as root folder name

* `qBuilder build`
    * builds the full load script from `/src/*.qvs` files. The produced script is saved in `dist` folder (`LoadScript.qvs`)

* `qBuilder checkscript [env]`
    * builds the script (from `/src/*.qvs` files)
    * connects to Qlik and checks the script for syntax errors - `env` is the environment name from `config.yml`

* `qBuilder reload [env]`
    * connects to Qlik and reload the app - `env` is the environment name from `config.yml`. Once the reload has started `qBuilder` will display the progress in the same console (check the video below to see it in action)

* `qBuilder setscript [env]`
    * builds the script (from `/src/*.qvs` files)
    * connects to Qlik and checks the script for syntax errors - `env` is the environment name from `config.yml`
    * sets the new script
    * saves the app

* `qBuilder getscript [env]` - (the opposite of `setscript`) get the remote script, split it to tabs and save the files to `scr` folder. `config.yml` should present to indicate from which env/app to extract the script
    * connects to Qlik and get the script from desired app - `env` is the environment name from `config.yml`
    * split the script into tabs/files
    * saves the `qvs` files into `src` folder


* `qBuilder watch [env]` - enters in watch mode. The default behavior is to build and check the script syntax on any `*.qvs` file inside `src` folder. Can accept two additional flags:

    * `-r` - reloads the script on any `qvs` file change
    * `-s` - sets the script (and save the app) on any `qvs` file change

    Inside `watch` mode the console is active and the developer can perform additional actions. Just type one of the letters/commands below in the console to trigger them:

    * `s` or `set` - build, syntax check and set script
    * `r` or `rl` - build and set the script, reload the app and save. If any syntax error (during the build and set) the reload is not triggered
    * `c` or `clr` - clear console
    * `x` - exit 

* `qBuilder checkupdate` - compares the current version number to the remote one

## config.yml

The `create` command is creates few folders and `config.yml` file. The config file is pre-populated with example values. This file specifies Qlik environments (dev, test, prod etc.)

At the moment `qBuilder` support non-authentication environments (desktop or Core). Certificates connections to QSE is in wip

The config file is in `yaml` format. The config below defines one environment (`desktop`) and the connection to it is made on `ws://localhost:4848` and the app that we will target there is `qBuilder Test.qvf`

```
qlik-environments:
  - name: desktop
    host: ws://localhost:4848
    appId: C:\Users\MyUserName\Documents\Qlik\Sense\Apps\qBuilder Test.qvf
```    

You can have as many environments as you want (will make more sense when its possible to connect to QSE). Make sure that the application ids are correct in each environment. `qBuilder` will not create app if it cant find it and will throw an error.

The environment name is used as an command argument (so try not to have spaces in the environment names)

## Naming script files

At the moment (it will probably change in near future) the script is build by reading the `qvs` files in `src` folder by alphabetical order. The files should have the following naming convention:

> number--name.qvs

To ensure alphabetical order the files should start with number followed by separator (`--`) and name. The name will be used as a tab name when setting the script in Qlik. 

For example having the following files:

```
1--Variables.qvs
2--DBLoad.qvs
3--Transformation.qvs
4--StoreData.qvs
5--DropTables
```

Will result in the following tabs in Qlik

![Tab View](https://github.com/countnazgul/qBuilder/blob/master/images/tab_names.png?raw=true)

## Extra

Having the script files as local files allows to put them in version control. This will put the `src`, `dist` and `config.yml` files in the repository. 

In some cases the Prod environment app can be without the original (full) script and just include (via REST API call) the final load script (the one in `dist` folder) from Git's master branch. This was technically you don't need to touch the Prod app in case of script change ... this is just an idea how to benefit from this approach

## Roadmap

* QSE support (certificates, header etc)
* `include` and `must_include` - (option) parse the script and get the content of the script that are included and get the content of these files as a separate tabs. This way the script will not be dependant on external files
* different logic how to name the script files - instead of naming convention why not specify the other in the config file?

---

If you have any issues, comments, suggestions etc please use the [GitHub issue tracker](https://github.com/countnazgul/qBuilder/issues)
