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
        var lat1 = pt1['lat'] * degToRad;
        var lon1 = pt1['lng'] * degToRad;
        var lat2 = pt2['lat'] * degToRad;
        var lon2 = pt2['lng'] * degToRad;

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
        var latdiff = pt2['lat'] - pt1['lat'];
        var northmean = (pt1['lat'] + pt2['lat']) * Math.PI / 360;
        var startrads = pt1['lat'] * Math.PI / 180;
        var longdiff = (pt1['lng'] - pt2['lng']) * Math.cos(northmean);
        var hypotenuse = Math.sqrt(latdiff * latdiff + longdiff * longdiff);
        //assume earth is a sphere circumference 40030 Km 
        var latdelta = linerad * longdiff / hypotenuse / 111.1949269;
        var longdelta = linerad * latdiff / hypotenuse / 111.1949269 / Math.cos(startrads);
        var linestart =  L.latLng(pt1['lat'] - latdelta, pt1['lng'] - longdelta);
        var lineend =  L.latLng(pt1['lat'] + latdelta, longdelta + pt1['lng']);
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

//Airspace control functions are now private to facilitate calling from the map move event

 function zapAirspace()  {
                if (mapLayers.airspace) {
                map.removeLayer(mapLayers.airspace);
            }
 }

    function showAirspace() {
       var mapbounds= map.getBounds();

       //Don't show airspace if the map is zoomed out so north/south latitude distance is over 10 degrees
       //roughly 1000 Km. Too much data in the layer slows everything down.
       //Values here are a tradeoff between window size,  smooth factor and responsiveness
       if ((airClip >0) && ((mapbounds.getNorth()- mapbounds.getSouth()) < 10)) {
       $.post("getairspace.php",
           {
               maxNorth: mapbounds.getNorth(),
               minNorth: mapbounds.getSouth(),
               maxEast: mapbounds.getEast() ,
                minEast: mapbounds.getWest()
        } ,
              function(data,status) {
              if(status==="success")  {
                     $('#airspace_src').html(data.country);
                     $('#airspace_info').show();
                     var i;
                    var polyPoints;
                     var suacircle;
                     var airStyle = {
                    "color": "black",
                    "weight": 1,
                    "opacity": 0.20,
                    "fillColor": "red",
                    "smoothFactor": 1
                    };
                var suafeatures=[];
                zapAirspace();

            for(i=0 ; i < data.polygons.length;i++) {
                if(data.polygons[i].base < airClip)  {
                  polyPoints=data.polygons[i].coords;
                    suafeatures.push(L.polygon(polyPoints,airStyle));
                }
            }
            for(i=0; i < data.circles.length; i++) {
                if (data.circles[i].base <  airClip)  {
                    suafeatures.push(L.circle(data.circles[i].centre, 1000*data.circles[i].radius, airStyle));
                    }
                }
                    mapLayers.airspace = L.layerGroup(suafeatures).addTo(map); 
                  // layersControl.addOverlay(mapLayers.airspace, 'Airspace');
                       }
    },"json");
        }
    else  {
        zapAirspace();
    }
    }

    // End of private methods

    var map = L.map(elementName);

    //Airspace clip altitude now a property of this object
   var airClip= 0;

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
            var trackLine = L.polyline(latLong, { color: 'blue' ,weight: 4});
            timePositionMarker = L.marker(latLong[0], { icon: planeIcon });
            mapLayers.track = L.layerGroup([
                trackLine,
                timePositionMarker
            ]).addTo(map);
            layersControl.addOverlay(mapLayers.track, 'Flight path');

            map.fitBounds(trackLine.getBounds());
        },
        
       zapTask: function()  {
            if (mapLayers.task) {
                map.removeLayer(mapLayers.task);
                layersControl.removeLayer(mapLayers.task);
            }
        },
        
       addTask: function (coordinates, names) {
            var taskLayers = [L.polyline(coordinates, { color: 'dimgray' })];
            var lineDrawOptions = {
                fillColor: 'green',
                color: 'black',
                weight: 2,
                opacity: 0.8
            };
            var sectorDrawOptions = {
                fillColor: 'green',
                fillOpacity :0.1,
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
                        var tpsector = getTpSector(coordinates[j], coordinates[j - 1], coordinates[j + 1], tpSectorRadius, tpSectorAngle,sectorDrawOptions);
                       taskLayers.push(tpsector);
                  }
              }
            mapLayers.task = L.layerGroup(taskLayers).addTo(map);
            layersControl.addOverlay(mapLayers.task, 'Task');
        },
        
        updateAirspace:  function(clip) {
            airClip=clip;
           showAirspace();
        },

        //called to turn on airspace updating
        activateEvents: function() {
         map.on('moveend', showAirspace);
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




