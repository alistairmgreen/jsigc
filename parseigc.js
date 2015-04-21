function IGCException(message) {
   this.message = message;
   this.name = "IGCException";
}

function parseIGC(igcFile) {
   var invalidFileMessage = 'This does not appear to be an IGC file.';
   var igcLines = igcFile.split('\n');
   if (igcLines.length < 2) {
       throw new IGCException(invalidFileMessage);
   };
   
   // Declare the model object that is to be returned;
   // this contains the position and altitude data and the header
   // values.
   var model = {
       headers: {},
	   recordTime: [],
	   latLong: [],
	   pressureAltitude: [],
	   gpsAltitude: []
   };
   
   // The first line should begin with 'A' followed by
   // a 3-character manufacturer Id and a 3-character serial number.
   if (!/^A[\w]{6}/.test(igcLines[0])) {
       throw new IGCException(invalidFileMessage);
   }
   
   var flightDate = extractDate(igcFile);
   model.headers["Date"] = flightDate;
   
   var lineIndex;
   var positionData;
   var recordType;
   for (lineIndex = 0; lineIndex < igcLines.length; lineIndex++) {
      recordType = igcLines[lineIndex].charAt(0);
	  switch(recordType) {
	    case 'B':
		    positionData = parsePosition(igcLines[lineIndex]);
			if (positionData) {
			   model.recordTime.push(positionData.recordTime);
			   model.latLong.push(positionData.latLong);
			   model.pressureAltitude.push(positionData.pressureAltitude);
			   model.gpsAltitude.push(positionData.gpsAltitude);
			}
		break;
	  }
   }
   
   return model;
   
   // Extracts the flight date from the IGC file.
   function extractDate(igcFile) {
       // Date is recorded as: HFDTEddmmyy (where HFDTE is a literal and dddmmyy are digits).
	   var dateRecord = igcFile.match(/H[FO]DTE([\d]{2})([\d]{2})([\d]{2})/);
	   if (dateRecord === null) {
		   throw new IGCException('The file does not contain a date header.');
	   }
	   
	   var day = parseInt(dateRecord[1]);
	   // Javascript numbers months from zero, not 1!
	   var month = parseInt(dateRecord[2]) - 1;
	   // The IGC specification has a built-in Millennium Bug (2-digit year).
	   // I will arbitrarily assume that any year before "80" is in the 21st century.
	   var year = parseInt(dateRecord[3]);
	   
	   if (year < 80) {
		   year += 2000;
	   } else {
		   year += 1900;
	   }
	   return new Date(Date.UTC(year, month, day));
   }
   
   function parsePosition(positionRecord){
	   // Regex to match position records:
	   // Hours, minutes, seconds, latitude, N or S, longitude, E or W,
	   // Fix validity ('A' = 3D fix, 'V' = 2D or no fix),
	   // pressure altitude, GPS altitude.
	   // Latitude and longitude are in degrees and minutes, with the minutes
	   // value multiplied by 1000 so that no decimal point is needed.
	   //                       hours   minutes  seconds  degrees  minutes  N/S   degrees  minutes  E/W         press alt  gps alt
	   var positionRegex = /^B([\d]{2})([\d]{2})([\d]{2})([\d]{2})([\d]{5})([NS])([\d]{3})([\d]{5})([EW])([AV])([\d]{5})([\d]{5})/;
	   var positionMatch = positionRecord.match(positionRegex);
	   if (positionMatch) {
	       // Convert the time to a date and time. Start by making a clone of the date
		   // object that represents the date given in the headers:
		   var positionTime = new Date(flightDate.getTime());
		   positionTime.setUTCHours(parseInt(positionMatch[1]), parseInt(positionMatch[2]), parseInt(positionMatch[3]));
		   // If the flight crosses midnight (UTC) then we now have a time that is 24 hours out.
		   // We know that this is the case if the time is earlier than the one for the previous position fix.
		   if (model.recordTime.length > 0
		       && model.recordTime[model.recordTime.length - 1] > positionTime) {
		        positionTime.setDate(flightDate.getDate() + 1);
		   }
		   
		   var latitude = parseFloat(positionMatch[4]) + parseFloat(positionMatch[5]) / 60000.0;
		   if (positionMatch[6] === 'S') {
		      latitude = -latitude;
		   }
		   
		   var longitude = parseFloat(positionMatch[7]) + parseFloat(positionMatch[8]) / 60000.0;
		   if (positionMatch[9] === 'W') {
		      longitude = -longitude;
		   }
		   
	       return {
		       recordTime: positionTime,
			   latLong: [latitude, longitude],
		       pressureAltitude: parseInt(positionMatch[11]),
			   gpsAltitude: parseInt(positionMatch[12])
		   };
	   }
   }
}