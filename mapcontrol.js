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
            var taskLayers = [L.polyline(coordinates, { color: 'blue' })];
             var taskDrawOptions = {
               color: 'green',
               weight: 3,
               opacity: 0.8
             };
             //definitions from BGA rules
             //defined here as any future changes will be easier
             var startLineRadius= 5;
             var finishLineRadius= 1;
             var tpCircleRadius= 500;
             var tpSectorRadius= 20000;
             var tpSectorAngle = 90;
            var j;
            for (j = 0; j  < coordinates.length; j++) {
                taskLayers.push(L.marker(coordinates[j]).bindPopup(names[j]));
                 switch(j)   {
                    case 0:
                         var startline=this.getline(coordinates[0],coordinates[1],startLineRadius,taskDrawOptions);
                        taskLayers.push(startline);
                        break;
                    case (coordinates.length-1):
                       var finishline= this.getline(coordinates[j], coordinates[j-1], finishLineRadius,taskDrawOptions);
                        taskLayers.push(finishline);
                        break;
                    default:
                        taskLayers.push(L.circle(coordinates[j], tpCircleRadius, taskDrawOptions));
                         var tpsector=this.getTpSector(coordinates[j], coordinates[j-1],coordinates[j+1],tpSectorRadius,tpSectorAngle,taskDrawOptions);
                        taskLayers.push(tpsector);
                }
            }
            mapLayers.task = L.layerGroup(taskLayers).addTo(map);
            layersControl.addOverlay(mapLayers.task, 'Task');
        },
        
    getline: function(pt1,pt2,linerad,drawOptions) {
      //returns line through pt1, at right angles to line between pt1 and pt2, length linerad.
     //Use Pythogoras- accurate enough on this scale
      var latdiff=pt2[0] - pt1[0];
      //need radians for cosine function
      var northmean=(pt1[0] + pt2[0]) *Math.PI / 360;
      var startrads=pt1[0]*Math.PI/180;
     var longdiff=(pt1[1] - pt2[1])  * Math.cos( northmean);
     var hypotenuse = Math.sqrt(latdiff*latdiff + longdiff * longdiff);
     //assume earth is a sphere circumference 40030 Km 
     var latdelta= linerad * longdiff / hypotenuse / 111.1949269;
     var longdelta = linerad * latdiff / hypotenuse /111.1949269/Math.cos(startrads);
    var linestart = new L.LatLng(pt1[0] - latdelta,pt1[1] - longdelta);
    var lineend= new L.LatLng(pt1[0] + latdelta, longdelta + pt1[1]);
    var polylinePoints = [linestart,lineend];
         var polylineOptions = {
               color: 'green',
               weight: 3,
               opacity: 0.8
             };

     return new  L.Polyline(polylinePoints,drawOptions);
},

getTpSector: function(centrept,pt1,pt2,sectorRadius,sectorAngle,drawOptions)  {
    var headingIn= getBearing(pt1,centrept);
    var bearingOut= getBearing(pt2,centrept);
    var bisector= headingIn + (bearingOut-headingIn)/2;
    if(Math.abs(bearingOut-headingIn) > 180)  {
        bisector = (bisector + 180) % 360;
    }
   var beginangle= bisector -sectorAngle/2;
    if (beginangle < 0) {
       beginangle += 360;
    }
   var endangle=(bisector + sectorAngle/2) % 360;
   var sectorOptions= jQuery.extend({},drawOptions,{startAngle:beginangle,stopAngle:endangle});
   return L.circle(centrept,sectorRadius,sectorOptions);

}  

    };
}    



function getBearing(pt1,pt2)    {
    //get bearing from pt1 to pt2 in degrees
    //need radians for cosine function
      //Use Pythogoras
      var northmean=(pt1[0] + pt2[0]) *Math.PI / 360;
     var longdiff=(pt2[1] - pt1[1])  * Math.cos( northmean);
     var latdiff= pt2[0]-pt1[0];
     return (Math.atan2(longdiff,latdiff) *180/Math.PI +360) % 360;
}




