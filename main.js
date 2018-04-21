const electron = require('electron');
const ipcMain  = require('electron').ipcMain;
const serialport = require('serialport');
const WebSocket = require('ws');
var request = require('request');
var request = request.defaults({jar: true})

const ws_url = 'wss://echo.websocket.org/'; //TODO change
const api_url = "https://jagwallet.herokuapp.com/"; //TODO change
const line_default = '\n';

// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow


var infMsg = '';
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
 ipcMain.on('form-login', function (event, data) {
    console.log("user ->", data.user);
	user = data.user;
	pwd = data.password;
	// Set the headers
	var headers = {
		'User-Agent': 'Super Agent/0.0.1',
		'Content-Type': 'application/json'
	}
	// Configure the request
	var options = {
		url: api_url + 'user/signin',
		method: 'POST',
		headers: headers,
		form: {'email': user, 'hashed_pwd': pwd} //TODO hash the password
	}
	// Start the request
	request(options, function (error, response, body) {
		if (error) {
			console.log(error);
		}
		//console.log(response);
		//console.log(body);
		if (!error && response.statusCode == 200) {
			// Print out the response body
			body = JSON.parse(body);
			console.log(body);
			session_token  = body.session_token;
			//searchPorts_mock();
			searchPorts();
		} else {
			console.log('unable to connect to ' + api_url + '/user/signin');
			
			mainWindow.webContents.send('errorMsg', 'unable to connect to ' + api_url + '/user/signin');
		}
	});
});

ipcMain.on('form-param', function (event, data) {
	let payeeAddr = data.payeeAddr;
	let amount = data.amount;
	let fee = data.fee;
	// Set the headers
	var headers = {
		'User-Agent': 'Super Agent/0.0.1',
		'Content-Type': 'application/json'
	}
	// Configure the request
	var options = {
		//url: api_url + 'wallet/createunsigned_mock',
		url: api_url + 'wallet/createunsigned',
		method: 'POST',
		headers: headers,
		form: {"logged":{"email": user,"session_token":session_token}, 'xpub': xpub, 'payeeAddr': payeeAddr, 'amount': amount, 'fee': fee, 'wid':wid, 'devid': devid}
	}
	// Start the request
	request(options, function (error, response, body) {
		if (error) {
			console.log(error);
		}
		//console.log(response);
		console.log(body);
		if (!error && response.statusCode == 200) {
			// Print out the response body
			body = JSON.parse(body);
			console.log(body);
			//sendUnsignedTxn_mock(body);
			sendUnsignedTxn(body);			
		} else {
			console.log('unable to connect to ' + url);
			mainWindow.webContents.send('errorMsg', 'unable to connect to ' + url);
		}
	});
});

ipcMain.on('form-pin', function (event, data) {
	console.log('pin: ' + data);
	//sendPin_mock(data);
	sendPin(data);
});

function sendResult(signed_txn) {
	// Set the headers
	var headers = {
		'User-Agent': 'Super Agent/0.0.1',
		'Content-Type': 'application/json'
	}
	// Configure the request
	var options = {
		//url: api_url + 'wallet/broadcast_payment_mock',
		url: api_url + 'wallet/broadcast_payment',
		method: 'POST',
		headers: headers,
		form: {"logged":{"email": user,"session_token":session_token}, 'signed_txn': signed_txn}
	}
	// Start the request
	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			// Print out the response body
			body = JSON.parse(body);
			console.log(body);
			showInfoData('Transaction ID:' + body.txid);
		} else {
			console.log('unable to connect to ' + url);
			mainWindow.webContents.send('errorMsg', 'unable to connect to ' + url);
		}
	});

}

function searchPorts() {
	serialport.list((err, ports) => {		
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
			var sp = new serialport(port.comName,{baudrate: 9600, autoOpen: false, parser: serialport.parsers.readline(line_default)});
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
							//sendWalletConnected();
							mainWindow.webContents.send('renderParams', '');
						} else if (data == 'get:pin') {
							//Call websocket waiting_pin
							//sendWaitingPin();
							mainWindow.webContents.send('renderPin', '');
						} else if (data.startsWith('signed:')) {
							signed = data.split(':')[1];
							//Call websocket signing_result
							//sendSigningResult();
							sendResult(signed);
						}
					});					 
				} else {
					mainWindow.webContents.send('errorMsg', error.message);
				}					
			}); 
		});
	});	
}

function sendWalletConnected() {	 
	let ws = new WebSocket(ws_url);
	console.log('started connection');
	infMsg += 'Called wallet_connected.<br/>';
	showInfoData(infMsg);	  	
	ws.on('open', function open() {
	  	console.log('connected to ' + ws_url);
		ws.emit('wallet_connected',{ message:{"xpub_payer": xpub, "wallet_id": wid,"device_id": devid, "logged":{"email": user,"session_token":session_token}} });	  	
	});
	ws.on('error', function (error) {
		console.log('error : ' + error);
		mainWindow.webContents.send('errorMsg', error.message);
	});
	ws.on('send_unsigned', function (data) {
	  	console.log(data);
		infMsg += 'Received unsigned_txn<br/>';
		showInfoData(infMsg);
		sendUnsignedTxn(data.message);
	});
	//testing!!!
	ws.on('message', function (data) {//testing!!!
	  	console.log(data);
		infMsg += 'Received unsigned_txn<br/>';
		showInfoData(infMsg);
	  	sendUnsignedTxn(data.message);
	});
	ws.emit('message',{ message:{"unsigned_txn": "001010101001"} });//testing!!!	
}

function sendWaitingPin() {
	let ws = new WebSocket(ws_url);
	console.log('started connection');
	infMsg += 'Called waiting_pin.<br/>';
	showInfoData(infMsg);	  	
	ws.on('open', function open() {
	  	console.log('connected to ' + ws_url);
		ws.emit('waiting_pin',{ message:{"waiting":"True","logged":{"email": user,"session_token":session_token}} });	  	
	});
	ws.on('error', function (error) {
		console.log('error : ' + error);
		mainWindow.webContents.send('errorMsg', error.message);
	});
	ws.on('send_pin', function (data) {
	  	console.log(data);
		infMsg += 'Received pin<br/>';
		showInfoData(infMsg);
	  	sendPin(data.message);
	}); 
	//testing!!!
	ws.on('message', function (data) {//testing!!!
	  	console.log(data);
		infMsg += 'Received pin<br/>';
		showInfoData(infMsg);
	  	sendPin(data.message);
	});
	ws.emit('message',{ message:{"pin": "123123123"} });//testing!!!
}

function sendSigningResult() {
	let ws = new WebSocket(ws_url);
	console.log('started connection');
	infMsg += 'Called signing_result.<br/>';
	showInfoData(infMsg);	  	
	ws.on('open', function open() {
	  	console.log('connected to ' + ws_url);
		ws.emit('signing_result',{ message:{"success": "True","signed_txn" : signed, "logged":{"email": user,"session_token":session_token}} });
	});
	ws.on('error', function (error) {
		console.log('error : ' + error);
		mainWindow.webContents.send('errorMsg', error.message);
	});
	sendOK(currentComPort);
}

function sendOK(sp) {
	sp.write('ok', function(err) {
		if(err) {
			console.log('error port: ' + sp + ' ' + err.message);
			mainWindow.webContents.send('errorMsg', err.message);
		} else {
			console.log('sended ok to ' + sp);
			infMsg += 'Sended ok to port.<br/>';
			showInfoData(infMsg);
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
			infMsg += 'Sended unsigned_txn to port.<br/>';
			showInfoData(infMsg);
		}			
	});
}

function sendPin(data) {
	currentComPort.write('pin:' + data.pin, function(err) {
		if(err) {
			console.log('error port: ' + currentComPort);
			mainWindow.webContents.send('errorMsg', err.message);
		} else {
			console.log('sended '+data.pin + ' to ' + currentComPort);
			infMsg += 'Sended pin to port.<br/>';
			showInfoData(infMsg);
		}			
	});
}

function showInfoData(msg) {
	let infoData = {
		usr: user,
		info: msg
	};
	mainWindow.webContents.send('renderPorts', infoData);
}

/*
function searchPorts_mock() {
	xpub = 'xpub661MyMwAqRbcFgLUSaHosne9KH8Y4jURPkyTj89c5nHMdB8hgSDU856p4LXHe6YELhWxE9dF1thyKT4eX9Wev1hLfuTaPg1ukcBorzdseun';
	wid = '10';
	devid = 'naf7asfd4f9dg';
	mainWindow.webContents.send('renderParams', '');
}

function sendUnsignedTxn_mock(data) {
	console.log('sended '+data.unsigned_txn + ' to mock');
	mainWindow.webContents.send('renderPin', '');
}

function sendPin_mock(data) {
	console.log('sended '+data.pin + ' to mock');
	mainWindow.webContents.send('hidePin', '');
	signed = '010000000110c5d3408e11dc7d1327f3f2e0e789cce8c578209ed';
	sendResult(signed);
}
*/