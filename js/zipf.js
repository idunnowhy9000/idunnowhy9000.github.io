(function () {
	
	google.load('visualization', '1.0', {'packages':['corechart']});
	google.load("visualization", "1", {packages: ["line"]});
	
	function counts(text) {
		if (!text) {
			return;
		}
		
		var words = text.replace(/\d/g, '').match(/[a-z'\-]+/gi);
		if (words == null) {
			return;
		}
		
		var counter = {};
		words.forEach(function (word) {
			word = word.toLowerCase();
			if (counter[word]) {
				counter[word]++;
			} else {
				counter[word] = 1;
			}
		});
		
		var rows = [];
		for (var word in counter) rows.push([word, counter[word]]);
		rows.sort(function(a, b) {return b[1] - a[1]});
		
		console.log(rows);
		
		return rows;
	}
	
	function drawTable(rows) {
		var table = $('#table');
		$('#table-section').show();
		
		table.empty();
		table.append($('<tr><td>Rank</td><td>Word</td><td>Occurrences</td></tr>'));
		
		rows.forEach(function (row, n) {
			var index = n + 1, word = row[0], occ = row[1];
			table.append($('<tr><td>' + index + '</td><td>' + word + '</td><td>' + occ + '</td></tr>'));
		});
	}
	
	function drawChart(rows) {
		var data = new google.visualization.DataTable();
		
		data.addColumn('string', 'Words');
		data.addColumn('number', 'Occurrences');
		data.addRows(rows);
		
		var chart = new google.charts.Line(document.getElementById('chart'));
		$('#chart-section').show();
		chart.draw(data, {
			chart: {
				title: "Zipf's law chart"
			},
			width: 900,
			height: 500
		});
	}
	
	function generateTable(e) {
		e.preventDefault();
		
		var dict = counts($('#text').val());
		if (!dict) {
			return;
		}
		
		drawTable(dict);
	}
	
	function generateChart(e) {
		e.preventDefault();
		
		var dict = counts($('#text').val());
		if (!dict) {
			return;
		}
		
		drawChart(dict);
	}
	
	$(document).ready(function () {
		$('#table-section').hide();
		$('#chart-section').hide();
		$('#gen-table').click(generateTable);
		$('#gen-chart').click(generateChart);
	});
	
})();