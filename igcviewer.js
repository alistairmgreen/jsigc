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

        // Reveal the map and graph. We have to do this before
        // setting the zoom level of the map or ploting the graph.
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
        for (j = 0; j < nPoints; j++) {
            timestamp = igcFile.recordTime[j].getTime();
            pressureBarogramData.push([timestamp, igcFile.pressureAltitude[j]]);
            gpsBarogramData.push([timestamp, igcFile.gpsAltitude[j]]);
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
                axisLabel: 'Altitude / metres'
            }
        });
    }

})(jQuery);