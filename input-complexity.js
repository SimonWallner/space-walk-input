// TODOs
// - performance???
// - special treating of axes?
// 		- dead zones?
// 		- beats?
// - operators
// - different window types
// 		binning of data, variable bin size???
// 		multiply with weight vector


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

var windowSize = [1, 2, 3]; // seconds
var deadZone = 0.3;
var updateInterval = 100; // ms
var maxComplexity = 10;

var storedData = {};
var externalClock = 0; // time reference from the streaming data, not precise!


var findFirstIndex = function(arr, predicate) {
	for (var i = 0; i < arr.length; i++) {
		if (predicate(arr[i])) {
			return i;
		}
	}

	return undefined;
}

// remove all entries from the data array 'arr' that are older than 'time'
var truncateData = function(arr, time) {
	
	var i = findFirstIndex(arr, function(element) {
		return (element.time > time);
	})

	arr = arr.splice(i);
	return arr;
}

// truncate all data using the largest window size.
// i.e. last(windowSize)
var truncateAll = function(time) {
	for (var input in storedData) {
		if (storedData.hasOwnProperty(input)) {
			storedData[input] = truncateData(storedData[input], time - last(windowSize));
		}
	}
}

var isActive = function(value) {
	return (Math.abs(value) > deadZone);
}

var wasActive = function(arr) {
	var active = arr.reduce(function(accumulator, current) {
		return accumulator || isActive(current.value);
	}, false)

	return active;
}

// find the bin index within the boundaries 'lower' and 'higher'
// the result is bounded in [0, numbins - 1]
var findBinIndex = function(value, lower, higher, numBins) {
	var index = Math.floor(((value - lower) / (higher - lower)) * numBins);
	return Math.max(0, Math.min(numBins - 1, index));
}

var wasActiveBinned = function(arr, startTime, endTime, numBins) {
	result = [];
	for (var i = 0; i < arr.length; i++) {
		var binIndex = findBinIndex(arr[i].time, startTime, endTime, numBins);
		result[binIndex] = result[binIndex] || isActive(arr[i].value);
	}

	return result;
}

var update = function(time) {

	var activeCount = [0, 0, 0];

	for (var input in storedData) {
		if (storedData.hasOwnProperty(input)) {
			
			for (var i = 0; i < windowSize.length; i++) {
				var index = findFirstIndex(storedData[input], function(element) {
					return (element.time > (time - windowSize[i]));
				});

				 if (index != undefined) {
					if (wasActive(storedData[input].slice(index))) {
						activeCount[i]++;
					}	
				}
			}
		}
	}

	// update max complexity first to avoid any kind of lag/weirdness in the display
	for (var i = 0; i < windowSize.length; i++) {
		maxComplexity = Math.max(maxComplexity, activeCount[i]);	
	}

	for (var i = 0; i < windowSize.length; i++) {
		maxComplexity = Math.max(maxComplexity, activeCount[i]);	
		$('#live-box span').eq(i).text(activeCount);
		$('#live-box div.element').eq(i).width(200 * (activeCount[i]/maxComplexity));
	}
	

	
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
		
		// storedData[payload.name] = truncateData(storedData[payload.name], payload.time - windowSize);

		externalClock = payload.time;
	}
}



libsw.onSessionStarted = function() {}

$(document).ready(function() {
	window.setInterval(function() {
		externalClock += updateInterval / 1000; // convert to seconds
		truncateAll(externalClock);
		update(externalClock);
	}, updateInterval);
})

// ================================= util ================================

// create a linear space of size 'size' spanning [a, b]
// the first element is a, the last is b
function linspace(a, b, size) {
	var result = [];
	for (var i = 0; i < size; i++) {
		var t = i / (size - 1);
		result[i] = (a * (1 - t) + b * t);
	}

	return result;
}

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