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
        gpsAltitude: [],
        task: {
            coordinates: [],
            names: []
        }
    };

    // The first line should begin with 'A' followed by
    // a 3-character manufacturer Id and a 3-character serial number.
    if (!/^A[\w]{6}/.test(igcLines[0])) {
        throw new IGCException(invalidFileMessage);
    }
    parseManufacturer(igcLines[0]);

    var flightDate = extractDate(igcFile);
    model.headers["Date"] = flightDate.toDateString();

    var lineIndex;
    var positionData;
    var recordType;
    var currentLine;
    var turnpoint; // for task declaration lines
    for (lineIndex = 0; lineIndex < igcLines.length; lineIndex++) {
        currentLine = igcLines[lineIndex]
        recordType = currentLine.charAt(0);
        switch (recordType) {
            case 'B': // Position fix
                positionData = parsePosition(currentLine);
                if (positionData) {
                    model.recordTime.push(positionData.recordTime);
                    model.latLong.push(positionData.latLong);
                    model.pressureAltitude.push(positionData.pressureAltitude);
                    model.gpsAltitude.push(positionData.gpsAltitude);
                }
                break;

            case 'C': // Task declaration
                turnpoint = parseTask(currentLine);
                if (turnpoint) {
                    model.task.coordinates.push(turnpoint.latLong);
                    model.task.names.push(turnpoint.name);
                }
                break;

            case 'H': // Header information
                parseHeader(currentLine);
                break;
        }
    }

    // If the file contains a declared task, then it may start or end with
    // 'turnpoints' at 0 degrees N, 0 degrees E. These represent the takeoff
    // and landing positions, which could not have been known at the time when
    // the declaration was made. Replace them with the actual values so that
    // the task can be plotted correctly on a map.

    if (model.task.coordinates.length > 0) {
        if (model.task.coordinates[0][0] === 0.0 && model.task.coordinates[0][1] === 0.0) {
            model.task.coordinates[0] = model.latLong[0];
            model.task.names[0] = 'Takeoff';
        }
        var lastTask = model.task.coordinates.length - 1;
        if (model.task.coordinates[lastTask][0] === 0.0 && model.task.coordinates[lastTask][1] === 0.0) {
            model.task.coordinates[lastTask] = model.latLong[model.latLong.length - 1];
            model.task.names[lastTask] = 'Landing';
        }
    }

    return model;

    // Looks up the manufacturer name corresponding to
    // the three letter code in the first line of the IGC file
    // (the 'A' record).
    function parseManufacturer(aRecord) {
        var manufacturers = {
            'GCS': 'Garrecht',
            'CAM': 'Cambridge Aero Instruments',
            'DSX': 'Data Swan',
            'EWA': 'EW Avionics',
            'FIL': 'Filser',
            'FLA': 'FLARM',
            'SCH': 'Scheffel',
            'ACT': 'Aircotec',
            'NKL': 'Nielsen Kellerman',
            'LXN': 'LX Navigation',
            'IMI': 'IMI Gliding Equipment',
            'NTE': 'New Technologies s.r.l.',
            'PES': 'Peschges',
            'PRT': 'Print Technik',
            'SDI': 'Streamline Data Instruments',
            'TRI': 'Triadis Engineering GmbH',
            'LXV': 'LXNAV d.o.o.',
            'WES': 'Westerboer',
            'XCS': 'XCSoar',
            'ZAN': 'Zander'
        };

        var manufacturerCode = aRecord.substring(1, 4);
        if (manufacturers[manufacturerCode]) {
            model.headers['Logger manufacturer'] = manufacturers[manufacturerCode];
        }
        else {
            model.headers['Logger manufacturer'] = 'Unknown';
        }

        model.headers['Logger serial number'] = aRecord.substring(4);
    }

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

    function parseHeader(headerRecord) {
        var headerSubtypes = {
            'PLT': 'Pilot',
            'CM2': 'Crew member 2',
            'GTY': 'Glider type',
            'GID': 'Glider ID',
            'DTM': 'GPS Datum',
            'RFW': 'Firmware version',
            'RHW': 'Hardware version',
            'FTY': 'Flight recorder type',
            'GPS': 'GPS',
            'PRS': 'Pressure sensor',
            'FRS': 'Security suspect, use validation program',
            'CID': 'Competition ID',
            'CCL': 'Competition class'
        };

        var headerName = headerSubtypes[headerRecord.substring(2, 5)];
        if (headerName !== undefined) {
            var colonIndex = headerRecord.indexOf(':');
            if (colonIndex !== -1) {
                var headerValue = headerRecord.substring(colonIndex + 1);
                if (headerValue.length > 0 && /[^\s]+/.test(headerValue)) {
                    model.headers[headerName] = headerValue;
                }
            }
        }
    }

    function parsePosition(positionRecord) {
        // Regex to match position records:
        // Hours, minutes, seconds, latitude, N or S, longitude, E or W,
        // Fix validity ('A' = 3D fix, 'V' = 2D or no fix),
        // pressure altitude, GPS altitude.
        // Latitude and longitude are in degrees and minutes, with the minutes
        // value multiplied by 1000 so that no decimal point is needed.
        //                      hours    minutes  seconds  latitude    longitude        press alt  gps alt
        var positionRegex = /^B([\d]{2})([\d]{2})([\d]{2})([\d]{7}[NS][\d]{8}[EW])([AV])([\d]{5})([\d]{5})/;
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

            return {
                recordTime: positionTime,
                latLong: parseLatLong(positionMatch[4]),
                pressureAltitude: parseInt(positionMatch[6]),
                gpsAltitude: parseInt(positionMatch[7])
            };
        }
    }

    // Parses a latitude and longitude in the form:
    // DDMMmmmNDDDMMmmmE
    // where M = minutes and m = decimal places of minutes.
    function parseLatLong(latLongString) {
        var latitude = parseFloat(latLongString.substring(0, 2))
            + parseFloat(latLongString.substring(2, 7)) / 60000.0;
        if (latLongString.charAt(7) === 'S') {
            latitude = -latitude;
        }

        var longitude = parseFloat(latLongString.substring(8, 11))
            + parseFloat(latLongString.substring(11, 16)) / 60000.0;
        if (latLongString.charAt(16) === 'W') {
            longitude = -longitude;
        }

        return [latitude, longitude];
    }

    function parseTask(taskRecord) {
        var taskRegex = /^C([\d]{7}[NS][\d]{8}[EW])(.*)/;
        var taskMatch = taskRecord.match(taskRegex);
        if (taskMatch) {
            return {
                latLong: parseLatLong(taskMatch[1]),
                name: taskMatch[2]
            };
        }
    }
}