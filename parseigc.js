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
	   latitude: [],
	   longitude: [],
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
	   var positionRegex = /^B([\d]{2})([\d]{2})([\d]{2})([\d]{7})([NS])([\d]{8})([EW])([AV])([\d]{5})([\d]{5})/;
	   var positionMatch = positionRecord.match(positionRegex);
	   if (positionMatch) {
	       var positionTime = new Date(flightDate.getTime());
		   positionTime.setUTCHours(parseInt(positionMatch[1]), parseInt(positionMatch[2]), parseInt(positionMatch[3]));
	       return {
		       recordTime: positionTime,
		       pressureAltitude: parseInt(positionMatch[9]),
			   gpsAltitude: parseInt(positionMatch[10])
		   };
	   }
   }
}