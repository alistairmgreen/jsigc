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
}

    function showDeclaration(task)  {
        $('#task').show();
        var taskList = $('#task ul').first().html('');
         var j;
         var pointlist=[];
         var tasklength=0;
         var canmeasure= true;
         if(task.takeoff.length > 0) {
         taskList.append($('<li> </li>').text("Takeoff: : " + task.takeoff)); 
           }
         for (j =0; j < task.names.length; j++) {
         pointlist.push( L.latLng(task.coordinates[j][0], task.coordinates[j][1]));
         switch(j)  {
                 case 0:
                     taskList.append($('<li> </li>').text("Start: " + task.names[j]));
                     break;
                     case ( task.names.length-1):
                          taskList.append($('<li> </li>').text("Finish: " + task.names[j]));
                          break;
                      default:
                            taskList.append($('<li></li>').text("TP" + (j).toString() + ": " + task.names[j]));
                   }
               }
               if(task.landing.length > 0) {
                    taskList.append($('<li> </li>').text("Landing: : " + task.landing)); 
              }
               for(j = 0; j < task.coordinates.length-1 ; j ++)  {
                    if ((task.coordinates[j][0] !==0) && (task.coordinates[j+1][0] !==0))  {
                            tasklength+=pointlist[j].distanceTo(pointlist[j+1]);
                         }
                   else  {
                         canmeasure=false;
                     }
                }
                 if (canmeasure)  {
                         $('#tasklength').text("Task Length: " + (tasklength/1000).toFixed(1) + " Km");
                }
                else {
                         $('#tasklength').text("");
                 }                       
        }    
    
    function positionDisplay(position)  {
        function toDegMins(degreevalue) {
            var wholedegrees= Math.floor(degreevalue);
            var minutevalue = (60*(degreevalue-wholedegrees)).toFixed(3);
            return wholedegrees + '\u00B0\u00A0'  + minutevalue  + '\u00B4';
        }
    
        var positionLatitude= toDegMins(Math.abs(position[0]));
        var positionLongitude=toDegMins(Math.abs(position[1]));
        if(position[0]  >  0)  {
            positionLatitude += "N";
        }
        else  {
            positionLatitude += "S";
        }
        if(position[1]  >  0)  {
            positionLongitude += "E";
        }
        else  {
            positionLongitude += "W";
        }
        return positionLatitude + ",   " + positionLongitude;
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
        var positionText=positionDisplay(currentPosition);
        var unitName = $('#altitudeUnits').val();
        //add in offset from UTC then convert back to UTC to get correct time in timezone!
        var adjustedTime= new Date(igcFile.recordTime[timeIndex].getTime() + timezone.offset);
       $('#timePositionDisplay').text(adjustedTime.getUTCHours() + ':' +pad(adjustedTime.getUTCMinutes()) + ':' + pad(adjustedTime.getSeconds()) +  " " + timezone.zoneabbr + '; '+ 
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
        //Display task if there is anything to display
        if ((igcFile.task.coordinates.length > 1) && (igcFile.task.coordinates[0][0]!==0))    {
               showDeclaration(igcFile.task);
                mapControl.addTask(igcFile.task.coordinates, igcFile.task.names);
                }
        else {
                $('#task').hide();
                }
        // Display the headers.
        var headerTable = $('#headerInfo tbody');
       //Delay display of date till we get the timezone
        var headerName;
        var headerIndex;
        for (headerIndex = 0; headerIndex < igcFile.headers.length; headerIndex++) {
           headerTable.append(
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
    
    function toDegMins(degreevalue) {
        var wholedegrees= Math.floor(degreevalue);
        var minutevalue = (60*(degreevalue-wholedegrees)).toFixed(3);
        return wholedegrees +"\xB0 "  + minutevalue  + "\xB4";
    }
    
    function positionDisplay(position)  {
       // var positionLatitude=(Math.abs(position[0])).toFixed(3) + "\xB0";
        var positionLatitude= toDegMins(Math.abs(position[0]));
        var positionLongitude=toDegMins(Math.abs(position[1]));
        if(position[0]  >  0)  {
            positionLatitude += "N";
        }
        else  {
            positionLatitude += "S";
        }
        if(position[1]  >  0)  {
            positionLongitude += "E";
        }
        else  {
            positionLongitude += "W";
        }
        return positionLatitude + ",   " + positionLongitude;
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
        
         $('#barogram').on('plotclick', function (event, pos, item) {
             console.log('plot click');
             if (item) {
                 updateTimeline(item.dataIndex, mapControl);
                 $('#timeSlider').val(item.dataIndex);
             }
         });
    });
            
}(jQuery));
