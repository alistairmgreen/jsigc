$(document).ready(function() {
   var mapControl = L.map('map');
   var trackLayer; // Map layer which glider's track will be drawn onto
   var mapQuestAttribution = ' | Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">';
   var osmLayer = L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg', {
                                   attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
                                                + mapQuestAttribution,
                                   maxZoom: 18
                            }).addTo(mapControl);
   
   var photoLayer = L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg', {
                                   attribution: 'Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
                                                + mapQuestAttribution,
                                   maxZoom: 11
                                });
   
   var baseLayers = {
       'MapQuest OpenStreetMap': osmLayer,
       'MapQuest Open Aerial (Photo)': photoLayer
   };
   
   L.control.layers(baseLayers).addTo(mapControl);
							
   $('#fileControl').change(function() {
      if (this.files.length > 0) {
	      var reader = new FileReader();
		  reader.onload = function(e) {
		      try {
			     $('#errorMessage').text('');
				 if (trackLayer) {
				    mapControl.removeLayer(trackLayer);
				 }
				 
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
                 
                 var trackLine = L.polyline(model.latLong, {color: 'red'});
				 trackLayer = L.layerGroup([
                     trackLine,
                     L.marker(model.latLong[0]).bindPopup('Takeoff'),
                     L.marker(model.latLong[model.latLong.length - 1]).bindPopup('Landing')
				 ]).addTo(mapControl);
				 
				  mapControl.fitBounds(trackLine.getBounds()); 
				 
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
