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
				 
				 $('#barograph').plot([{
					label: 'Pressure altitude',
					data: pressureBarogramData}, {
					label: 'GPS altitude',
				    data: gpsBarogramData}], {
				     xaxis: {
						mode: 'time',
                        timeformat: '%H:%M:%S'
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