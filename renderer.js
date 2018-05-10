// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const serialport = require('serialport')
const createTable = require('data-table')
const ipcRenderer = require('electron').ipcRenderer;

ipcRenderer.on('errorMsg', (event, data) => {
	document.getElementById('error').innerHTML = '<div class="error">' + data + '</div>';
	setTimeout(function(){ document.getElementById('error').innerHTML = ''; }, 3000);
});

ipcRenderer.on('renderPorts', (event, data) => {
	document.getElementById('login').innerHTML = '';
	renderPorts(data);
});
 

function renderPorts(data) {
	str = '<div class="card">'+
			'<div class="card-header">Logged as '+data.usr+'</div>'+
			'<div class="card-body">'+
					data.info +
			'</div>'+
		  '</div>';
	document.getElementById('ports').innerHTML = str;
}