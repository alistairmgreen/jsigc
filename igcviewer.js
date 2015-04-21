$(document).ready(function() {
   $('#fileControl').change(function() {
      if (this.files.length > 0) {
	      var reader = new FileReader();
		  reader.onload = function(e) {
		      try {
			     $('#errorMessage').text('');
		         var model = parseIGC(this.result);
				 var nPoints = model.recordTime.length;
				 var pressureBarogramData = [];
				 var gpsBarogramData = [];
				 var j;
				 var timestamp;
				 for (j = 0; j < nPoints; j++) {
				     timestamp = model.recordTime[j].getTime();
				     pressureBarogramData.push([timestamp, model.pressureAltitude[j]]);
                     gpsBarogramData.push([timestamp, model.gpsAltitude[j]]);					 
				 }
				 
				 var map = L.map('map');
				 L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg', {
                              attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">',
                              maxZoom: 18
                            }).addTo(map);
				 
				 var gliderTrack = L.polyline(model.latLong, {color: 'red'}).addTo(map);
                 map.fitBounds(gliderTrack.getBounds());
				 
				 $('#barograph').plot([{
					label: 'Pressure altitude',
					data: pressureBarogramData}, {
					label: 'GPS altitude',
				    data: gpsBarogramData}], {
					 axisLabels: {
					    show: true
					 },
				     xaxis: {
						mode: 'time',
                        timeformat: '%H:%M:%S',
						axisLabel: 'Time'
                     },
					 yaxis: {
					    axisLabel: 'Altitude / metres'
					 }
				 });
			  } catch (e) {
			    if (e instanceof IGCException) {
				    $('#errorMessage').text(e.message);
				}
				else {
				    throw e;
				}
			  }
		  };
		  reader.readAsText(this.files[0]);
	  }
   });
});