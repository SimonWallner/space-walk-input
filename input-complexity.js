 // monkey patching
 String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var libsw = new LibSpaceWalk();

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

var windowSize = 1; // seconds

var storedData = {};

var truncateData = function(arr, time) {
	// remove all entries from the data array that are older than time
	
	// time is monotonous, find last index that fails the test
	var i = 0;
	for (; i < arr.length; i++) {
		if (arr[i].time > time) { // found first valid element
			break;
		}
	}

	arr = arr.splice(i); // might be off by one...
	return arr;
}

var wasActive = function(arr) {
	var active = arr.reduce(function(accumulator, current) {
		return accumulator || (current.value !== 0);
	}, false)

	return active;
}

libsw.onMessage = function(data) {
	if (data.type === 'input') {
		var payload = data.payload;

		if (!storedData[payload.name]) {
			storedData[payload.name] = [];
		}

		storedData[payload.name].push({
			value: payload.value,
			time: payload.time
		})
		
		storedData[payload.name] = truncateData(storedData[payload.name], payload.time - 1);

		var activeCount = 0;
		for (var input in storedData) {
			if (storedData.hasOwnProperty(input)) {
				if (wasActive(storedData[input])) {
					activeCount++;
				}
			}
		}
		$('#complexity').text(activeCount);
	}
}



libsw.onSessionStarted = function() {}

$(document).ready(function() {})

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