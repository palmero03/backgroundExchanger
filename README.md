To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. 

## Pre requisites for Windows
You need to install windows build tools, execute the following command on a Powershell with administrator rights.

```bash
npm install --global --production windows-build-tools
```

## To Use

```bash
# Clone this repository
git clone https://github.com/palmero03/backgroundExchanger.git
# Go into the repository
cd backgroundExchanger
# Install dependencies
npm install
# Run the app
npm start
```

## To Generate installers

```bash
# Install packager
npm install electron-packager -g
# Go into the app
cd backgroundExchanger
# For Mac
npm run package-mac
# For Linux
npm run package-linux
# For Windows 32bits
npm run package-win-32
# For Windows 64bits
npm run package-win-64
```