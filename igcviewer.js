(function ($) {

    // Object holding the Leaflet.js map control and references to the map layers:
    var map = {
        control: {},
        layers: {
            osm: {},
            photo: {},
            track: {}
        }
    };

    $(document).ready(function () {
        map.control = L.map('map');
        var mapQuestAttribution = ' | Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">';
        map.layers.osm = L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
                         + mapQuestAttribution,
            maxZoom: 18
        }).addTo(map.control);

        map.layers.photo = L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg', {
            attribution: 'Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
                         + mapQuestAttribution,
            maxZoom: 11
        });

        L.control.layers({
            'MapQuest OpenStreetMap': map.layers.osm,
            'MapQuest Open Aerial (Photo)': map.layers.photo
        }).addTo(map.control);
        L.control.scale().addTo(map.control);

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
            if (map.layers.track) {
                map.control.removeLayer(map.layers.track);
            }

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
     
        // Draw the map.
        var trackLine = L.polyline(igcFile.latLong, { color: 'red' });
        map.layers.track = L.layerGroup([
            trackLine,
            L.marker(igcFile.latLong[0]).bindPopup('Takeoff'),
            L.marker(igcFile.latLong[igcFile.latLong.length - 1]).bindPopup('Landing')
        ]).addTo(map.control);

        // Reveal the map and graph. We have to do this before
        // setting the zoom level of the map or ploting the graph.
        $('#igcFileDisplay').show();
        map.control.fitBounds(trackLine.getBounds());

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