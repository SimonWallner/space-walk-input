// TODOs
// - performance???
// - special treating of axes?
// 		- dead zones?
// 		- beats?
// - operators
// - different window types
// 		binning of data, variable bin size???
// 		multiply with weight vector
// - plotting of history data...


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
var ramp = linspace(0, 1, 10);

var storedData = {};
var externalClock = 0; // time reference from the streaming data, not precise!
var historyData = {
	maxSize: 100, // some magic value
	box: [[], [], []],
	saw: [[], [], []]
};


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

// startTime < endTime
var wasActiveBinned = function(arr, startTime, endTime, numBins) {
	result = [];
	for (var i = 0; i < numBins; i++) {
		result[i] = false;
	}

	for (var i = 0; i < arr.length; i++) {
		var binIndex = findBinIndex(arr[i].time, startTime, endTime, numBins);
		result[binIndex] = result[binIndex] || isActive(arr[i].value);
	}

	return result;
}

// reduce across the 2d array
// i.e. NOT 
// for each a in arr: a.reduce()
// f is a function(previous, current)
var reduce2D = function(arr, f, init) {

	if (arr.length === 0) {
		return [];
	}

	result = [];
	// init
	for (var j = 0; j < arr[0].length; j++) {
		result[j] = init;
	}

	for (var i = 0; i < arr.length; i++) {
		for (var j = 0; j < arr[i].length; j++) {
			result[j] = f(result[j], arr[i][j])
		}
	}

	return result;
}

var weightedAverage = function(values, weights) {
	var sum = values.reduce(function(prev, current, index) {
		return prev + (current * weights[index]);
	}, 0)

	var weightsSum = weights.reduce(function(prev, current) {
		return prev + current;
	}, 0);

	var average = sum / weightsSum;
	return average;
}

var update = function(time) {

	var activeCount = [0, 0, 0];
	var activityBins = [[] ,[], []];
	var binned = [];

	for (var input in storedData) {
		if (storedData.hasOwnProperty(input)) {
			
			for (var i = 0; i < windowSize.length; i++) {
				var index = findFirstIndex(storedData[input], function(element) {
					return (element.time > (time - windowSize[i]));
				});

				if (index != undefined) {
					var subset = storedData[input].slice(index);
					if (wasActive(subset)) {
						activeCount[i]++;
					}
					activityBins[i].push(wasActiveBinned(subset, time - windowSize[i], time, 10))
				}
			}
		}
	}



	// update max complexity first to avoid any kind of lag/weirdness in the display
	for (var i = 0; i < windowSize.length; i++) {
		maxComplexity = Math.max(maxComplexity, activeCount[i]);
	}

	for (var i = 0; i < windowSize.length; i++) {
		historyData.box[i].push(activeCount[i]);
		$('#live-box span').eq(i).text(activeCount[i]);
		$('#live-box div.element').eq(i).width(200 * (activeCount[i]/maxComplexity));


		var binned = reduce2D(activityBins[i], function(previous, current) {
			if (current) {
				return previous + 1;
			} else {
				return previous
			}
			return (previous + current);
		}, 0);

		var average = weightedAverage(binned, ramp);

		var scalar = binned.reduce(function(prev, current) {
			return Math.max(prev, current);
		}, 0);

		historyData.saw[i].push(average);
		$('#live-saw span').eq(i).text(average.toFixed(2));
		$('#live-saw div.element').eq(i).width(200 * (average/maxComplexity));
	}
}

var updateHistory = function() {
	for (var i = 0; i < historyData.box.length; i++) {
		var bits = d3.select('#bits-box-' + i).selectAll('.bit').data(historyData.box[i]);
		bits.enter()
			.append('div')
				.attr('class', 'bit')
		bits
			.style('transform', function(d) {return 'scale(1, ' + Math.max(0.05, (d / maxComplexity)) + ')';});
	}
}

var truncateHistory = function() {
	for (var i = 0; i < historyData.box.length; i++) {
		if (historyData.box[i].length > historyData.maxSize) {
			historyData.box[i] = historyData.box[i].slice(historyData.box[i].length - historyData.maxSize);
		}
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

		externalClock = payload.time;
	}
}



libsw.onSessionStarted = function() {}

$(document).ready(function() {
	window.setInterval(function() {
		externalClock += updateInterval / 1000; // convert to seconds
		truncateAll(externalClock);
		update(externalClock);
		truncateHistory();
		updateHistory();
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