(function ($) {
    $(document).ready(function () {
        mapControl.initialise('map');

        $('#fileControl').change(function () {
            if (this.files.length > 0) {
                var reader = new FileReader();
                reader.onload = loadIgc;
                reader.readAsText(this.files[0]);
            }
        });

        $('#altitudeUnits').change(function () {
        });
    });

    function loadIgc(e) {
        try {
            $('#errorMessage').text('');
            mapControl.reset();

            var model = parseIGC(this.result);
            displayIgc(model);
        } catch (e) {
            if (e instanceof IGCException) {
                $('#errorMessage').text(e.message);
            }
            else {
                throw e;
            }
        }
    }

    function displayIgc(igcFile) {
        // Display the headers.
        var headerTable = $('#headerInfo tbody');
        headerTable.html('');
        var headerName;
        for (headerName in igcFile.headers) {
            headerTable.append(
                $('<tr></tr>').append($('<th></th>').text(headerName))
                              .append($('<td></td>').text(igcFile.headers[headerName]))
            );
        }

        // Show the task declaration if it is present.
        if (igcFile.task.coordinates.length > 0) {
            $('#task').show();
            var taskList = $('#task ol').first().html('');
            var j;
            for (j = 0; j < igcFile.task.names.length; j++) {
                taskList.append($('<li></li>').text(igcFile.task.names[j]));
            }

            mapControl.addTask(igcFile.task.coordinates, igcFile.task.names);
        }
        else {
            $('#task').hide();
        }

        // Reveal the map and graph. We have to do this before
        // setting the zoom level of the map or plotting the graph.
        $('#igcFileDisplay').show();

        mapControl.addTrack(igcFile.latLong);

        plotBarogram(igcFile);
    }

    function plotBarogram(igcFile) {
        var nPoints = igcFile.recordTime.length;
        var pressureBarogramData = [];
        var gpsBarogramData = [];
        var j;
        var timestamp;
        var altitudeUnit = $('#altitudeUnits').val();
        var altitudeConversionFactor;
        if (altitudeUnit === 'feet') {
            altitudeConversionFactor = 3.2808399;
        }
        else {
            altitudeConversionFactor = 1.0;
        }

        for (j = 0; j < nPoints; j++) {
            timestamp = igcFile.recordTime[j].getTime();
            pressureBarogramData.push([timestamp, igcFile.pressureAltitude[j] * altitudeConversionFactor]);
            gpsBarogramData.push([timestamp, igcFile.gpsAltitude[j] * altitudeConversionFactor]);
        }

        $('#barogram').plot([{
            label: 'Pressure altitude',
            data: pressureBarogramData
        }, {
            label: 'GPS altitude',
            data: gpsBarogramData
        }], {
            axisLabels: {
                show: true
            },
            xaxis: {
                mode: 'time',
                timeformat: '%H:%M',
                axisLabel: 'Time (UTC)'
            },
            yaxis: {
                axisLabel: 'Altitude / ' + altitudeUnit
            }
        });
    }

})(jQuery);