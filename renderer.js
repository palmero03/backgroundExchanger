// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const serialport = require('serialport')
const createTable = require('data-table')

var portsStr = '';

serialport.list((err, ports) => {
	console.log('ports', ports);
	if (err) {
		document.getElementById('error').textContent = err.message;
		return;
	} else {
		document.getElementById('error').textContent = ''
	}

	if (ports.length === 0) {
		document.getElementById('error').textContent = 'No ports discovered'
	}

	ports.forEach(function(port) {
		var sp = new serialport(port.comName,{baudrate: 9600, autoOpen: false, parser: serialport.parsers.readline("\n")}); 	
		sp.open(function (error) { 
			if ( !error ) { 
				console.log('open port: ' + port.comName);
				portsStr += 'Port Opened: ' + port.comName + '<br/>';	
				document.getElementById('ports').innerHTML = 'COM Port connection Test:<br/>' + portsStr + 'Waiting for Messages:<br/>'				
				sp.on('data', function(data) {
					console.log('data received: ' + port.comName + ' ' + data);
					document.getElementById('ports').innerHTML+='Received: ' + data + '<br/>';
					sp.write('ok', function(err) {
						if(err) {
							console.log('error port: ' + port.comName);
						} else {
							console.log('sended ok to ' + port.comName);
						}			
					}); 
				});
				 
			} 
		}); 
	});
	//document.getElementById('ports').innerHTML += portsStr + 'Waiting for Messages:<br/>';  
});
