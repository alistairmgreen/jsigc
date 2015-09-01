// Wrapper for the leaflet.js map control with methods
// to manage the map layers.
function createMapControl(elementName) {
    'use strict';
    
    var map = L.map(elementName);

    var mapQuestAttribution = ' | Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">';
    var mapLayers = {
        openStreetMap: L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>' +
                         mapQuestAttribution,
            maxZoom: 18
        }),

        photo: L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg', {
            attribution: 'Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency' +
                         mapQuestAttribution,
            maxZoom: 11
        })
    };

    var layersControl = L.control.layers({
        'MapQuest OpenStreetMap': mapLayers.openStreetMap,
        'MapQuest Open Aerial (Photo)': mapLayers.photo
    });

    mapLayers.openStreetMap.addTo(map);
            layersControl.addTo(map);
    
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
            var trackLine = L.polyline(latLong, { color: 'red' });
            mapLayers.track = L.layerGroup([
                trackLine,
                L.marker(latLong[0]).bindPopup('Takeoff'),
                L.marker(latLong[latLong.length - 1]).bindPopup('Landing')
            ]).addTo(map);
            layersControl.addOverlay(mapLayers.track, 'Flight path');

            map.fitBounds(trackLine.getBounds());
        },

        addTask: function (coordinates, names) {
            //Clearer if we don't show track to and from start line and finish line, as we are going to show lines
            //So throw away first and last points
            coordinates.shift();
            names.shift();
            coordinates.pop();
            names.pop();
            var taskLayers = [L.polyline(coordinates, { color: 'blue' })];
            var j;
            for (j = 0; j < coordinates.length; j++) {
                taskLayers.push(L.marker(coordinates[j]).bindPopup(names[j]));
            }
            mapLayers.task = L.layerGroup(taskLayers).addTo(map);
            layersControl.addOverlay(mapLayers.task, 'Task');
        }
    };
}
