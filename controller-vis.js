 // monkey patching
 String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var libsw = new LibSpaceWalk();

var storedValues = {};

var colors = {
	orange: '#e89f49',
	lime: '#b6ce4e',
	turquise: '#5dd1a4',
	blue: '#3fc0c9',
	lightBlue: '#C1DFE1',
	lavender: '#8885ed',
	rose: '#c673d8',
	red: '#e25454'
}

var mapping = {
	xbox360: {
		'button-0': 'cross',
		'button-1': 'circle',
		'button-2': 'square',
		'button-3': 'triangle',

		'button-4': 'L1',
		'button-5': 'R1',
		'button-6': 'L3',
		'button-7': 'R3',

		'button-11': 'Dpad-up',
		'button-12': 'Dpad-down',
		'button-13': 'Dpad-left',
		'button-14': 'Dpad-right',

		'button-8': 'start',
		'button-9': 'select',
		'button-10': 'special'
	}
}

var analogMapping = {
	xbox360: {
		'axis-0': {id: 'LS', property: 'margin-left'},
		'axis-1': {id: 'LS', property: 'margin-top'},

		'axis-3': {id: 'RS', property: 'margin-left'},
		'axis-4': {id: 'RS', property: 'margin-top'},

		'axis-2': {id: 'L2', property: 'margin-top'},
		'axis-5': {id: 'R2', property: 'margin-top'}
	}
}


libsw.onMessage = function(data) {
	if (data.type === 'input') {
		var payload = data.payload;
		if (payload.type === 'digital') { // aka button press/release


			if (storedValues[payload.name]) {
				// on --> off transition
				if (storedValues[payload.name].value === 1 && payload.value === 0) {
					d3.select('#input-' + mapping.xbox360[payload.name])
						.style('background-color', '');
				}

				// off --> on transition
				if (storedValues[payload.name].value === 0 && payload.value === 1) {
					d3.select('#input-' + mapping.xbox360[payload.name])
						.style('background-color', colors.red)

				}
			}


			// store value
			storedValues[payload.name] = payload;
		} else if (payload.type === 'analog') { // aka axis
			d3.select('#input-' + analogMapping.xbox360[payload.name].id)
				.style(analogMapping.xbox360[payload.name].property, map(-1, 1, -20, 20, payload.value) + 'px');
		}
	}
}

libsw.onSessionStarted = function() {

}

// ================================= util ================================
function round(value, decimals) {
	decimals = decimals || 0;
	var v = value * Math.pow(10, decimals);
	return Math.round(v) / Math.pow(10, decimals);
}

function last(arr) {
	return arr[arr.length-1];
}

// map value, from [a, b] to [r, s]
function map(a, b, r, s, value) {
	var t = (value - a) / (b -a);
	return r + (s - r) * t;
}