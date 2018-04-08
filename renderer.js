// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const serialport = require('serialport')
const createTable = require('data-table')
const ipcRenderer = require('electron').ipcRenderer;

ipcRenderer.on('error', (event, data) => {
	document.getElementById('error').textContent = data;
});

ipcRenderer.on('renderPorts', (event, data) => {
	document.getElementById('login').textContent = '';
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