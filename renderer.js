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
	document.getElementById('portform').innerHTML = '';
	renderPorts(data);
});

ipcRenderer.on('renderPortParam', (event, data) => {
	document.getElementById('login').innerHTML = '';
	document.getElementById('portform').style.display = "block";
});

ipcRenderer.on('renderParams', (event, data) => {
	document.getElementById('portform').innerHTML = '';
	document.getElementById('params').style.display = "block";
});

ipcRenderer.on('renderPin', (event, data) => {
	document.getElementById('params').innerHTML = '';
	document.getElementById('pinform').style.display = "block";
});

ipcRenderer.on('hidePin', (event, data) => {
	document.getElementById('pinform').style.display = "none";
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