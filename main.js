const electron = require('electron');
const ipcMain  = require('electron').ipcMain;
const serialport = require('serialport');
const WebSocket = require('ws');

// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
var currentComPort = null;
var user = '';
var pwd = '';
var xpub = '';
var wid = '';
var devid = '';
var signed = '';


function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit()
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
 ipcMain.on('form-submission', function (event, data) {
    console.log("user ->", data.user);
	if (1==1) {//Call API signin
		user = data.user;
		pwd = data.password;	
		searchPorts();
	} else {
		mainWindow.webContents.send('errorMsg', 'Invalid Login');
	}
	//sendWalletConnected();
});

function searchPorts() { 
	serialport.list((err, ports) => {
		var portsStr = '';
		var infMsg = '';
		console.log('ports', ports);
		if (err) {
			mainWindow.webContents.send('errorMsg', err.message);
			return;
		}
		if (ports.length === 0) {
			mainWindow.webContents.send('errorMsg', 'No ports discovered');
		}
		infMsg = '<br/>Waiting for Messages:<br/>';					
		showInfoData(infMsg);
					
		ports.forEach(function(port) {
			var sp = new serialport(port.comName,{baudrate: 9600, autoOpen: false, parser: serialport.parsers.readline("\n")}); //Works only for linux type devices	
			sp.open(function (error) {
				if (!error) { 
					console.log('opened port: ' + port.comName);
					sp.on('data', function(data) {
						console.log('data received: ' + port.comName + ' ' + data);
						if (currentComPort == null) {
							currentComPort = sp;
						} else if (currentComPort != sp) {
							console.log('data already receiving from: ' + currentComPort);
							return;
						}
						infMsg += 'Received: ' + data + '<br/>';
						showInfoData(infMsg);
						if(data.startsWith('xpub:')) {
							xpub = data.split(':')[1];							
							sendOK(sp);	
						} else if (data.startsWith('wid:')) {
							wid = data.split(':')[1];
							sendOK(sp);
						} else if (data.startsWith('devid:')) {
							devid = data.split(':')[1];
							sendOK(sp);
						} else if (data == 'get:unsigned' && xpub != '' && wid != '' && devid != '') {
							//Call websocket wallet_connected
							sendWalletConnected();
						} else if (data == 'get:pin') {
							//Call websocket waiting_pin
							sendWaitingPin();
						} else if (data.startsWith('signed:')) {
							signed = data.split(':')[1];
							//Call websocket signing_result
							sendSigningResult();
						}
					});					 
				} else {
					mainWindow.webContents.send('errorMsg', error.message);
				}					
			}); 
		});
	});	
}

function sendOK(sp) {
	sp.write('ok', function(err) {
		if(err) {
			console.log('error port: ' + sp + ' ' + err.message);
			mainWindow.webContents.send('errorMsg', err.message);
		} else {
			console.log('sended ok to ' + sp);
		}			
	});
}

function sendUnsignedTxn(data) {
	currentComPort.write('unsigned:' + data.unsigned_txn, function(err) {
		if(err) {
			console.log('error port: ' + currentComPort);
			mainWindow.webContents.send('errorMsg', err.message);
		} else {
			console.log('sended '+data.unsigned_txn + ' to ' + currentComPort);
		}			
	});
}

function sendPin(data) {
	currentComPort.write('pin:' + data.pin, function(err) {
		if(err) {
			console.log('error port: ' + currentComPort);
			mainWindow.webContents.send('errorMsg', err.message);
		} else {
			console.log('sended '+data.unsigned_txn + ' to ' + currentComPort);
		}			
	});
}

function sendWalletConnected() {
	let ws = new WebSocket('ws://echo.websocket.org/');
	console.log('started connection');
	ws.on('open', function open() {
	  console.log('connected to ws://echo.websocket.org/');
	  ws.emit('wallet_connected',{ message:{"xpub_payer": xpub, "wallet_id": wid,"device_id": devid} });
	  ws.send('testing 1');
	});
	ws.on('error', function (error) {
		console.log('error : ' + error);
		mainWindow.webContents.send('errorMsg', error);
	});
	ws.on('send_unsigned', function (data) {
	  console.log(data);
	  sendUnsignedTxn(data.message);
	});	
}

function sendWaitingPin() {
	let ws = new WebSocket('ws://echo.websocket.org/');
	console.log('started connection');
	ws.on('open', function open() {
	  console.log('connected to ws://echo.websocket.org/');
	  ws.emit('waiting_pin',{ message:{"waiting":"True"} });
	  ws.send('testing 1');
	});
	ws.on('error', function (error) {
		console.log('error : ' + error);
		mainWindow.webContents.send('errorMsg', error);
	});
	ws.on('send_pin', function (data) {
	  console.log(data);
	  sendPin(data.message);
	}); 
}

function sendSigningResult() {
	let ws = new WebSocket('ws://echo.websocket.org/');
	console.log('started connection');
	ws.on('open', function open() {
	  console.log('connected to ws://echo.websocket.org/');
	  ws.emit('signing_result',{ message:{"success": "True","signed_txn" : signed} });
	  ws.send('testing 1');
	});
	ws.on('error', function (error) {
		console.log('error : ' + error);
		mainWindow.webContents.send('errorMsg', error);
	});
	sendOK(currentComPort);
}

function showInfoData(msg) {
	let infoData = {
		usr: user,
		info: msg
	};
	mainWindow.webContents.send('renderPorts', infoData);

}

