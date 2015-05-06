 // monkey patching
 String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var libsw = new LibSpaceWalk();

var activeController = 0;
var knownControllers = [0];

var storedData = {};
var dirty = false;

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
		digital: {
			'button-11': 'cross',
			'button-12': 'circle',
			'button-13': 'square',
			'button-14': 'triangle',

			'button-8': 'L1',
			'button-9': 'R1',
			'button-6': 'L3',
			'button-7': 'R3',

			'button-0': 'Dpad-up',
			'button-1': 'Dpad-down',
			'button-2': 'Dpad-left',
			'button-3': 'Dpad-right',

			'button-4': 'start',
			'button-5': 'select',
			'button-10': 'special'
		},
		analog: {
			'axis-0': {id: 'LS', property: 'x'},
			'axis-1': {id: 'LS', property: 'y'},

			'axis-3': {id: 'RS', property: 'x'},
			'axis-4': {id: 'RS', property: 'y'},

			'axis-4': {id: 'L2'},
			'axis-5': {id: 'R2'}
		}
	},
	ps3: {
		digital: {
			'button-14': 'cross',
			'button-13': 'circle',
			'button-15': 'square',
			'button-12': 'triangle',

			'button-10': 'L1',
			'button-11': 'R1',
			'button-8': 'L2',
			'button-9': 'R2',
			'button-1': 'L3',
			'button-2': 'R3',

			'button-4': 'Dpad-up',
			'button-6': 'Dpad-down',
			'button-7': 'Dpad-left',
			'button-5': 'Dpad-right',

			'button-3': 'start',
			'button-0': 'select',
			'button-16': 'special'
		},
		analog: {
			'axis-0': {id: 'LS', property: 'x'},
			'axis-1': {id: 'LS', property: 'y'},

			'axis-2': {id: 'RS', property: 'x'},
			'axis-3': {id: 'RS', property: 'y'},
		}
	}
}

currentMapping = mapping.unityXbox360;

var sticks = {
	LS: {
		x: 0,
		y: 0
	},
	RS: {
		x: 0,
		y: 0
	}
}

var update = function() {
	if (dirty === false) {
		return;
	}
	dirty = false;

	// for obvious reasons (name spaces and such) there is no way to
	// directly access things iside the external svg
	var svg = d3.select(document.getElementById('controller-svg').contentDocument);

	for (var input in storedData) {
		if (storedData.hasOwnProperty(input)) {
			var payload = storedData[input];

	 		if (payload.type === 'digital') { // aka button press/release

				var mapping = currentMapping.digital[payload.name];
				if (mapping) {

					var path = svg.selectAll('#' + mapping + ' path');

					if (payload.value === 0) {
						path.style('fill', '')
							.style('opacity', 1); // workaround for LR2
					} else {
						path.style('fill', colors.red)
							.style('opacity', 1); // workaround for LR2
					}
				}
			} else if (payload.type === 'analog') { // aka axis
				var mapping = currentMapping.analog[payload.name]
				if (mapping) {
					if (mapping.id === 'LS' || mapping.id === 'RS') {
						sticks[mapping.id][mapping.property] = payload.value;

						var x = map(-1, 1, -15, 15, sticks[mapping.id].x);
						var y = map(-1, 1, -15, 15, sticks[mapping.id].y);

						svg.select('#' + mapping.id)
							.attr('transform', 'translate(' + x + ', ' + y + ')');
					} else if(mapping.id === 'L2' || mapping.id === 'R2') {

						svg.selectAll('#' + mapping.id + ' path')
							.style('fill', colors.red)
							.style('opacity', payload.value);
					}
				}
			}
		}
	}
}

libsw.onMessage = function(data) {
	if (data.type === 'ext.input.gamePad.sample') {
        var controllerNumber = parseInt(data.payload.controllerNumber);
		if (controllerNumber === activeController) {
			var payload = data.payload;
			storedData[payload.name] = payload;
			dirty = true;
		} else {
			if (knownControllers.indexOf(controllerNumber) === -1) {
				knownControllers.push(controllerNumber);

				drawControllerSelect();
			}
		}
	}
}

libsw.onSessionStarted = function() {

}

$(document).ready(function() {
	$('#mapping-xbox').click(function() {
		currentMapping = mapping.xbox360;

		$(this).addClass('active');
		$('#mapping-ps3').removeClass('active');
	})

	$('#mapping-ps3').click(function() {
		currentMapping = mapping.ps3;

		$(this).addClass('active');
		$('#mapping-xbox').removeClass('active');
	})

	window.setInterval(function() {
		update();
	}, 10);

	drawControllerSelect();
});

var drawControllerSelect = function() {
	var divs = d3.select('#controllerSelect').selectAll('div').data(knownControllers);
	divs.enter()
		.append('div')
			.text(function(d) { return d; })
			.attr('id', function(d) { return 'controller' + d; })
			.on('click', function(d) {
				activeController = d;
				drawControllerSelect();
			})

	divs.text(function(d) { return d; })
		.attr('class', '');

	$('#controller' + activeController).addClass('active');
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
