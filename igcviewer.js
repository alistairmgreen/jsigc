(function ($) {
   'use strict';

    var igcFile = null;
    var barogramPlot = null;
    var altitudeConversionFactor =  3.2808399; // Conversion from metres to required units
    var timezone =  {
            zonename:  "Europe/London",
            zoneabbr: "UTC",
            offset: 0,
            dst: false
        };
var flightarea= null;

var task= null;

function showTask()  {
    var i;
    $('#taskinfo').html("");
    for(i=0;i < task.labels.length; i++) {
        $('#taskinfo').append('<tr><th>' + task.labels[i]  +':</th><td>' +task.names[i]  + ':</td><td>' + task.descriptions[i] + '</td></tr>');
    }
      $('#tasklength').text("Task length: " +  task.distance.toFixed(1) + " Km");
      $('#task').show();
}
    
function pointDescription(coords) {
    var latdegrees= Math.abs(coords['lat']);
    var latdegreepart=Math.floor(latdegrees);
    var latminutepart=60*( latdegrees-latdegreepart);
   var latdir= (coords['lat']  >  0)?"N":"S";
   var lngdegrees= Math.abs(coords['lng']);
    var lngdegreepart=Math.floor(lngdegrees);
    var lngminutepart=60*( lngdegrees-lngdegreepart);
   var lngdir= (coords['lng']  >  0)?"E":"W";
   
    var retstr= latdegreepart.toString() + "&deg;" + latminutepart.toFixed(3) + "&prime;" + latdir + " " + lngdegreepart.toString() + "&deg;" + lngminutepart.toFixed(3) + "&prime;" + lngdir;
    return retstr;
}

function clearTask(mapControl) {
    $('#taskinfo').html("");
    $('#tasklength').html("");
    mapControl.zapTask();
    $('#task').hide();
    task= null;
}

//Get display information associated with task
function maketask(points) {
    var i;
    var j=1;
    var distance=0;
    var leglength;
    var names=[];
    var labels = [];
    var coords= [];
    var descriptions= [];
   names[0]=points.name[0];
    labels[0]= "Start";
    coords[0]=points.coords[0];
   descriptions[0]=pointDescription(points.coords[0]);
   for(i=1;i < points.coords.length;i++) {
        leglength=points.coords[i].distanceTo(points.coords[i-1]);
        //eliminate situation when two successive points are identical (produces a divide by zero error on display. 
        //To allow for FP rounding, within 30 metres is considered identical.
        if(leglength >30) {
            names[j]= points.name[i];
            coords[j]= points.coords[i];
           descriptions[j]=pointDescription(points.coords[i]);
           labels[j]= "TP" + j;
            distance += leglength;
            j++;
    }
}
    labels[labels.length-1]= "Finish";
    distance= distance/1000;
    var retval = {
                                names: names,
                                labels: labels,
                                coords: coords,
                                descriptions: descriptions,
                                distance: distance
    };
    //Must be at least two points more than 30 metres apart
    if(names.length > 1) {
         return retval;
    }
    else {
        return null;
    }
}

function getPoint(instr) {
    var latitude;
    var longitude;
    var pointname="Not named";
    var matchref;
    var statusmessage= "Fail";
    var count;
      var pointregex = [
                                       /^([A-Za-z]{2}[A-Za-z0-9]{1})$/,
                                   /^([\d]{2})([\d]{2})([\d]{3})([NnSs])([\d]{3})([\d]{2})([\d]{3})([EeWw])([\w\s]*)$/,
                                  /^([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})[\s]*([NnSs])[\W]*([0-9]{1,3}):([0-9]{1,2}):([0-9]{1,2})[\s]*([EeWw])$/
];
for(count=0;count < pointregex.length;count++) {
        matchref=instr.match(pointregex[count]);
        if(matchref) {
            switch(count)  {
        case 0:
           $.ajax({
                   url: "findtp.php",
                   data:  {trigraph: matchref[0]},
                      timeout: 3000,
                      method: "POST",
                      dataType: "json",
                      async: false,
                     success:   function(data) {
                        pointname=data.tpname;
                        if(pointname !=="Not found") {
                          latitude=data.latitude;
                           longitude=data.longitude;
                           statusmessage="OK";
                        }
                     }
              });  
        break;
        case 1:
                 latitude= parseFloat(matchref[1]) + parseFloat(matchref[2])/60 +parseFloat(matchref[3])/60000;
                if(matchref[4].toUpperCase()==="S") {
                  latitude=-latitude;  
                    }
                 longitude= parseFloat(matchref[5]) + parseFloat(matchref[6])/60 +parseFloat(matchref[7])/60000;
                if(matchref[8].toUpperCase()==="W") {
                  longitude=-longitude;  
                }
                if(matchref[9].length > 0) {
                    pointname= matchref[9];
                }
                 statusmessage="OK";

            break;
        case 2:
            latitude= parseFloat(matchref[1]) + parseFloat(matchref[2])/60 +parseFloat(matchref[3])/3600;
                if(matchref[4].toUpperCase()==="S") {
                  latitude=-latitude;  
                    }
                 longitude= parseFloat(matchref[5]) + parseFloat(matchref[6])/60 +parseFloat(matchref[7])/3600;
                if(matchref[8].toUpperCase()==="W") {
                  longitude=-longitude;  
                }
                statusmessage="OK";
            break;
         }
        }
    }
    
     return   {
       message: statusmessage,
        coords:  L.latLng(latitude,longitude),
       name:  pointname
    };
    
}

function parseUserTask() {
    var input;
    var pointdata;
    var success = true;
    var taskdata =   {
                                    coords: [],
                                    name:   []
                                     }
     $("#requestdata :input[type=text]").each(function() {
         input = $(this).val().replace(/ /g,'');
       if(input.length > 0) {
          pointdata= getPoint(input);
          if(pointdata.message==="OK") {
              taskdata.coords.push(pointdata.coords);
              taskdata.name.push(pointdata.name);
          }
          else {
             success=false;
            alert("\""+input +"\"" + " not recognised-" + " ignoring entry");
         }
       }
      });
        if(success) {
           task= maketask(taskdata);
        }
       else {
           task=null;
       }
}

//get timezone data from timezonedb.  Via php to avoid cross-domain data request from the browser
//Timezone dependent processes run  on file load are here as request is asynchronous
//If the request fails or times out, silently reverts to default (UTC)
function gettimezone(igcFile,mapControl)  {
    var flightdate= igcFile.recordTime[0];
   $.ajax({
                   url: "gettimezone.php",
                   data:  {
                             stamp: flightdate/1000,
                             lat: igcFile.latLong[0][0],
                             lon: igcFile.latLong[0][1]
                              },
                      timeout: 3000,
                      method: "POST",
                      dataType: "json",
                     success:   function(data) {
                         if(data.status==="OK")  {
                         timezone.zonename=data.zoneName;
                          timezone.zoneabbr=data.abbreviation;
                           timezone.offset=1000*parseFloat(data.gmtOffset);
                           if (data.dst==="1")  {
                               timezone.zonename += ", daylight saving";
                           }
                         }
                              }  ,
                        complete: function() {
                        //Local date may not be the same as UTC date
                        var localdate=new Date(flightdate.getTime() + timezone.offset);
                        $('#datecell').text(localdate.toDateString());
                        barogramPlot = plotBarogram(igcFile);
                        updateTimeline(0, mapControl);
                        }
});
}
   
function showAirspace(mapControl)  {
    var clip=Number( $("#airclip").val());
    if(clip!==0) {
    $.post("getairspace.php",
           {
               maxNorth: flightarea['north'],
               minNorth: flightarea['south'],
               maxEast: flightarea['east'] ,
                minEast:flightarea['west']
        } ,
              function(data,status) {
              if(status==="success")  {
                     $('#airspace_src').html(data.country);
                     $('#airspace_info').show();
                     mapControl.addAirspace(data,clip);
                       }
    },"json");
    }
    else {
        mapControl.zapAirspace();
    }
}
    
    
    function pad(n) {
        return (n < 10) ? ("0" + n.toString()) : n.toString();
    }
    
    function plotBarogram(igcFile) {
        var nPoints = igcFile.recordTime.length;
        var pressureBarogramData = [];
        var gpsBarogramData = [];
        var j;
        var timestamp;
        for (j = 0; j < nPoints; j++) {
            timestamp = igcFile.recordTime[j].getTime() + timezone.offset;
            pressureBarogramData.push([timestamp, igcFile.pressureAltitude[j] * altitudeConversionFactor]);
            gpsBarogramData.push([timestamp, igcFile.gpsAltitude[j] * altitudeConversionFactor]);
        }
        var baro = $.plot($('#barogram'), [{
            label: 'Pressure altitude',
            data: pressureBarogramData
        }, {
            label: 'GPS altitude',
            data: gpsBarogramData
        }],
        {
             axisLabels: {
                show: true
            },
           xaxis: {
                mode: 'time',
                timeformat: '%H:%M',
                axisLabel: 'Time (' + timezone.zonename +')'
            },
         yaxis: {
                axisLabel: 'Altitude / ' + $('#altitudeUnits').val()
            },
            
            crosshair: {
                mode: 'xy'
            },
            
            grid: {
                clickable: true,
                autoHighlight: false
            }
        }
        );
        return baro;
    }
    
    function updateTimeline (timeIndex, mapControl) {
        var currentPosition = igcFile.latLong[timeIndex];
        //var positionText=positionDisplay(currentPosition);
        var positionText=pointDescription(L.latLng(currentPosition));
        var unitName = $('#altitudeUnits').val();
        //add in offset from UTC then convert back to UTC to get correct time in timezone!
        var adjustedTime= new Date(igcFile.recordTime[timeIndex].getTime() + timezone.offset);
       $('#timePositionDisplay').html(adjustedTime.getUTCHours() + ':' +pad(adjustedTime.getUTCMinutes()) + ':' + pad(adjustedTime.getSeconds()) +  " " + timezone.zoneabbr + '; '+ 
            (igcFile.pressureAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
            unitName + ' (barometric) / ' +
            (igcFile.gpsAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
            unitName + ' (GPS); ' +
            positionText);
        mapControl.setTimeMarker(timeIndex);
        
        barogramPlot.lockCrosshair({
           x: adjustedTime.getTime(),
           y: igcFile.pressureAltitude[timeIndex] * altitudeConversionFactor
        });
    }
    
    function displayIgc(mapControl) {
        
        clearTask(mapControl);
        //check for user entered task- must be entry in start and finish
         if($('#start').val().trim() && $('#finish').val().trim())  {
              parseUserTask();
         }
         //if user defined task is empty or malformed
         if(task===null)  {
            if(igcFile.taskpoints.length > 4) {
           var i;
            var pointdata;
            var taskdata= {
                   coords: [],
                    name: []
            };
            //For now, ignore takeoff and landing
             for(i=1;   i  < igcFile.taskpoints.length -1; i++) {
                 pointdata= getPoint( igcFile.taskpoints[i]);
                  taskdata.coords.push(pointdata.coords);
                  taskdata.name.push(pointdata.name);
               }
                task= maketask(taskdata);
           }
         }
         
      if(task!==null) {
            showTask();
            mapControl.addTask(task.coords,task.labels);
      }
         
        // Display the headers.
        var headerBlock = $('#headers');
        headerBlock.html('');
       //Delay display of date till we get the timezone
        var headerName;
        var headerIndex;
      for (headerIndex = 0; headerIndex < igcFile.headers.length; headerIndex++) {
           headerBlock.append(
                $('<tr></tr>').append($('<th></th>').text(igcFile.headers[headerIndex].name))
                              .append($('<td></td>').text(igcFile.headers[headerIndex].value))
            );
        }
        // Reveal the map and graph. We have to do this before
        // setting the zoom level of the map or plotting the graph.
        $('#igcFileDisplay').show();
        mapControl.addTrack(igcFile.latLong);
        //Barogram is now plotted on "complete" event of timezone query
        gettimezone(igcFile,mapControl);
        flightarea=mapControl.getShowbounds();
        showAirspace(mapControl);
        $('#timeSlider').prop('max', igcFile.recordTime.length - 1);
    }
        
    function pad(n) {
    return (n < 10) ? ("0" + n) : n;
}



    $(document).ready(function () {
        var mapControl = createMapControl('map');        
        $('#fileControl').change(function () {
            if (this.files.length > 0) {
                var reader = new FileReader();
                reader.onload = function(e)  {
                  try {
                      $('#errorMessage').text('');
                      mapControl.reset();
                      $('#timeSlider').val(0);
                     // showAirspace(mapControl);
                      igcFile = parseIGC(this.result);
                      
                      displayIgc(mapControl);
                  } catch (ex) {
                      if (ex instanceof IGCException) {
                          $('#errorMessage').text(ex.message);
                      }
                      else {
                          throw ex;
                      }
                  }
                };
                reader.readAsText(this.files[0]);
            }
        });

        $('#altitudeUnits').change(function () {
            var altitudeUnit = $(this).val();
            if (altitudeUnit === 'feet') {
                altitudeConversionFactor = 3.2808399;
            }
            else {
                altitudeConversionFactor = 1.0;
            }
        
            if (igcFile !== null) {
                barogramPlot = plotBarogram();
                updateTimeline($('#timeSlider').val(), mapControl);
            }
        });
  
        // We need to handle the 'change' event for IE, but
        // 'input' for Chrome and Firefox in order to update smoothly
        // as the range input is dragged.
        $('#timeSlider').on('input', function() {
          var t = parseInt($(this).val(), 10);
          updateTimeline(t, mapControl);
        });
        $('#timeSlider').on('change', function() {
           var t = parseInt($(this).val(), 10);
           updateTimeline(t, mapControl);
        });
        
        $('#timeBack').click(function() {
           var slider = $('#timeSlider');
           var curTime = parseInt(slider.val(), 10);
           curTime--;
           if(curTime < 0) {
                 curTime = 0;
           }
           slider.val(curTime);
           updateTimeline(curTime, mapControl);
        });
        
         $('#timeForward').click(function() {
           var slider = $('#timeSlider');
           var curTime = parseInt(slider.val(), 10);
           var maxval= slider.prop('max');
           curTime++;
           if(curTime >  maxval) {
                 curTime = maxval;
           }
           slider.val(curTime);
           updateTimeline(curTime, mapControl);
        });

        $('#airclip').change(function() {
             showAirspace(mapControl);
         });  
  
         $('#clearTask').click(function() {
            $("#requestdata :input[type=text]").each(function() {
             $(this).val("");
    });
           clearTask(mapControl);
    });
    
        $('#enterTask').click(function() {
       clearTask(mapControl);
       parseUserTask();
       showTask();
       mapControl.addTask(task.coords,task.labels);
    });
        
         $('#barogram').on('plotclick', function (event, pos, item) {
             console.log('plot click');
             if (item) {
                 updateTimeline(item.dataIndex, mapControl);
                 $('#timeSlider').val(item.dataIndex);
             }
         });
    });
            
}(jQuery));
