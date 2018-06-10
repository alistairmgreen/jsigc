// Wrapper for the leaflet.js map control with methods
// to manage the map layers.
function createMapControl(elementName) {
    'use strict';

    // Private methods for drawing turn point sectors and start / finish lines

    function getBearing(pt1, pt2) {
        // Get bearing from pt1 to pt2 in degrees
        // Formula from: http://www.movable-type.co.uk/scripts/latlong.html
        // Start by converting to radians.
        var degToRad = Math.PI / 180.0;
        var lat1 = pt1[0] * degToRad;
        var lon1 = pt1[1] * degToRad;
        var lat2 = pt2[0] * degToRad;
        var lon2 = pt2[1] * degToRad;

        var y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        var x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

        var bearing = Math.atan2(y, x) / degToRad;
        bearing = (bearing + 360.0) % 360.0;
        return bearing;
    }

    function getLine(pt1, pt2, linerad, drawOptions) {
        //returns line through pt1, at right angles to line between pt1 and pt2, length linerad.
        //Use Pythogoras- accurate enough on this scale
        var latdiff = pt2[0] - pt1[0];
        //need radians for cosine function
        var northmean = (pt1[0] + pt2[0]) * Math.PI / 360;
        var startrads = pt1[0] * Math.PI / 180;
        var longdiff = (pt1[1] - pt2[1]) * Math.cos(northmean);
        var hypotenuse = Math.sqrt(latdiff * latdiff + longdiff * longdiff);
        //assume earth is a sphere circumference 40030 Km 
        var latdelta = linerad * longdiff / hypotenuse / 111.1949269;
        var longdelta = linerad * latdiff / hypotenuse / 111.1949269 / Math.cos(startrads);
        var linestart = L.latLng(pt1[0] - latdelta, pt1[1] - longdelta);
        var lineend = L.latLng(pt1[0] + latdelta, longdelta + pt1[1]);
        var polylinePoints = [linestart, lineend];
        var polylineOptions = {
            color: 'green',
            weight: 3,
            opacity: 0.8
        };

        return L.polyline(polylinePoints, drawOptions);
    }

    function getTpSector(centrept, pt1, pt2, sectorRadius, sectorAngle, drawOptions) {
        var headingIn = getBearing(pt1, centrept);
        var bearingOut = getBearing(pt2, centrept);
        var bisector = headingIn + (bearingOut - headingIn) / 2;

        if (Math.abs(bearingOut - headingIn) > 180) {
            bisector = (bisector + 180) % 360;
        }

        var beginangle = bisector - sectorAngle / 2;

        if (beginangle < 0) {
            beginangle += 360;
        }

        var endangle = (bisector + sectorAngle / 2) % 360;
        var sectorOptions = jQuery.extend({}, drawOptions, { startAngle: beginangle, stopAngle: endangle });
        return L.circle(centrept, sectorRadius, sectorOptions);
    }

    // End of private methods

    var map = L.map(elementName);

    var cartoAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>';
    var mapLayers = {
        positron: L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
            attribution: cartoAttribution,
            maxZoom: 18
        }),

        darkMatter: L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
            attribution: cartoAttribution,
            maxZoom: 18
        }),

        toner: L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
            attribution: 'Map tiles by <a href="https://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
            maxZoom: 18
        }),

        watercolor: L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.png', {
            attribution: 'Map tiles by <a href="https://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.',
            maxZoom: 18
        }),
        terrain: L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png', {
            attribution: 'Map tiles by <a href="https://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
            maxZoom: 18
        })
    };

    var layersControl = L.control.layers({
        'Carto Positron': mapLayers.positron,
        'Carto Dark Matter': mapLayers.darkMatter,
        'Stamen Toner': mapLayers.toner,
        'Stamen Watercolor': mapLayers.watercolor,
        'Stamen Terrain': mapLayers.terrain
    });

    mapLayers.terrain.addTo(map);
    layersControl.addTo(map);

    var trackLatLong = [];
    var timePositionMarker;
    L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';
    var planeIcon = L.AwesomeMarkers.icon({
        icon: 'plane',
        iconColor: 'white',
        markerColor: 'red'
    });

    return {
        reset: function () {
            // Clear any existing track data so that a new file can be loaded.
            if (mapLayers.track) {
                map.removeLayer(mapLayers.track);
                layersControl.removeLayer(mapLayers.track);
            }

            if (mapLayers.task) {
                map.removeLayer(mapLayers.task);
                layersControl.removeLayer(mapLayers.task);
            }
        },

        addTrack: function (latLong) {
            trackLatLong = latLong;
            var trackLine = L.polyline(latLong, { color: 'red', weight: 3 });
            timePositionMarker = L.marker(latLong[0], { icon: planeIcon });
            mapLayers.track = L.layerGroup([
                trackLine,
                timePositionMarker
            ]).addTo(map);
            layersControl.addOverlay(mapLayers.track, 'Flight path');

            map.fitBounds(trackLine.getBounds());
        },

        addTask: function (coordinates, names) {
            //Clearer if we don't show track to and from start line and finish line, as we are going to show lines
            var taskLayers = [L.polyline(coordinates, { color: 'blue', weight: 3 })];
            var lineDrawOptions = {
                fillColor: 'green',
                color: 'black',
                weight: 2,
                opacity: 0.8
            };
            var sectorDrawOptions = {
                fillColor: 'green',
                fillOpacity: 0.1,
                color: 'black',
                weight: 1,
                opacity: 0.8
            };
            //definitions from BGA rules
            //defined here as any future changes will be easier
            var startLineRadius = 5;
            var finishLineRadius = 1;
            var tpCircleRadius = 500;
            var tpSectorRadius = 20000;
            var tpSectorAngle = 90;
            var j;
            for (j = 0; j < coordinates.length; j++) {
                taskLayers.push(L.marker(coordinates[j]).bindPopup(names[j]));
                switch (j) {
                    case 0:
                        var startline = getLine(coordinates[0], coordinates[1], startLineRadius, lineDrawOptions);
                        taskLayers.push(startline);
                        break;
                    case (coordinates.length - 1):
                        var finishline = getLine(coordinates[j], coordinates[j - 1], finishLineRadius, lineDrawOptions);
                        taskLayers.push(finishline);
                        break;
                    default:
                        taskLayers.push(L.circle(coordinates[j], tpCircleRadius, sectorDrawOptions));
                        var tpsector = getTpSector(coordinates[j], coordinates[j - 1], coordinates[j + 1], tpSectorRadius, tpSectorAngle, sectorDrawOptions);
                        taskLayers.push(tpsector);
                }
            }
            mapLayers.task = L.layerGroup(taskLayers).addTo(map);
            layersControl.addOverlay(mapLayers.task, 'Task');
        },

        setTimeMarker: function (timeIndex) {
            var markerLatLng = trackLatLong[timeIndex];
            if (markerLatLng) {
                timePositionMarker.setLatLng(markerLatLng);

                if (!map.getBounds().contains(markerLatLng)) {
                    map.panTo(markerLatLng);
                }
            }
        }
    };
}




