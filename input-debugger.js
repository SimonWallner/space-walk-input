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


libsw.onMessage = function(data) {
	if (data.type === 'ext.input.gamePad.sample') {
		var payload = data.payload;
		if (payload.type === 'digital') { // aka button press/release

			var digitalDiv = d3.select('#digital');
			var selection = digitalDiv.selectAll('#' + payload.name).data([payload]);
			selection.enter()
				.append('div')
				.attr('id', function(d) { return d.name; })
				.attr('class', 'digitalIndicator')
				.text(function(d) { return d.name; })

			if (storedValues[payload.name]) {
				// on --> off transition
				if (storedValues[payload.name].value === 1 && payload.value === 0) {
					selection
						.style('background-color', colors.lavender)
						.transition()
							.duration(500)
							.style('width', '100px');
				}

				// off --> on transition
				if (storedValues[payload.name].value === 0 && payload.value === 1) {
					selection
						.style('background-color', colors.red)
						.transition()
							.duration(500)
							.style('background-color', colors.lavender);

				}
			}

			if (payload.value === 1) {
				selection.transition()
					.duration(0)
					.style('width', '300px');
			}


			// store value
			storedValues[payload.name] = payload;
		} else { // analog values, i.e. axes
			var selection = d3.select('#analog').selectAll('#' + payload.name).data([payload]);
			var div = selection.enter().append('div')
				.attr('id', payload.name)
				.text(payload.name);

			div.append('hr');
			div.append('span')
				.text('•');

			var margin = map(payload.range.min, payload.range.max, 0, 300, payload.value);
			selection.select('span')
				.style('margin-left', margin + 'px');

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