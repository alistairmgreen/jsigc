(function ($) {
   'use strict';

    var igcFile = null;
    var barogramPlot = null;
    var altitudeConversionFactor =  3.2808399; // Conversion from metres to required units
   
function showAirspace(mapControl)  {
    var clip=Number( $("#airclip").val());
    var showbounds=mapControl.getShowbounds();
    if(clip!==0) {
    $.post("getairspace.php",{maxNorth: showbounds['north'], minNorth: showbounds['south'],maxEast:showbounds['east'] ,minEast:showbounds['west']} , function(data,status) {
              if(status==="success")  {
                     mapControl.addAirspace(data,clip);
                       }
    },"json");
    }
}

    function showDeclaration(task)  {
        //No longer testing for empty start coordinates as this is done before function is called
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
    
    function plotBarogram() {
        var nPoints = igcFile.recordTime.length;
        var pressureBarogramData = [];
        var gpsBarogramData = [];
        var j;
        var timestamp;

        for (j = 0; j < nPoints; j++) {
            timestamp = igcFile.recordTime[j].getTime();
            pressureBarogramData.push([timestamp, igcFile.pressureAltitude[j] * altitudeConversionFactor]);
            gpsBarogramData.push([timestamp, igcFile.gpsAltitude[j] * altitudeConversionFactor]);
        }

        var baro = $.plot($('#barogram'), [{
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
                axisLabel: 'Altitude / ' + $('#altitudeUnits').val()
            },
            
            crosshair: {
                mode: 'xy'
            },
            
            grid: {
                clickable: true,
                autoHighlight: false
            }
        });
        
        return baro;
    }
    
    function updateTimeline (timeIndex, mapControl) {
        var currentPosition = igcFile.latLong[timeIndex];
        var positionText=positionDisplay(currentPosition);
        var unitName = $('#altitudeUnits').val();
        $('#timePositionDisplay').text(
             igcFile.recordTime[timeIndex].getUTCHours() + ':' +pad( igcFile.recordTime[timeIndex].getUTCMinutes()) + ':' + pad(igcFile.recordTime[timeIndex].getSeconds()) + ' UTC; ' + 
            (igcFile.pressureAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
            unitName + ' (barometric) / ' +
            (igcFile.gpsAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
            unitName + ' (GPS); ' +
            positionText
        );
        
        mapControl.setTimeMarker(timeIndex);
        
        barogramPlot.lockCrosshair({
           x: igcFile.recordTime[timeIndex].getTime(),
           y: igcFile.pressureAltitude[timeIndex] * altitudeConversionFactor
        });
    }
    
    function displayIgc(mapControl) {
        //Display task if there is anything to display
        if ((igcFile.task.coordinates.length > 0) && (igcFile.task.coordinates[0][0]!==0))    {
               showDeclaration(igcFile.task);
                mapControl.addTask(igcFile.task.coordinates, igcFile.task.names);
                }
        else {
                $('#task').hide();
                }
        // Display the headers.
        var headerTable = $('#headerInfo tbody');
        headerTable.html('');
       // alert(igcFile.headers.length);
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
        barogramPlot = plotBarogram(igcFile);
        showAirspace(mapControl);
        $('#timeSlider').prop('max', igcFile.recordTime.length - 1);
        updateTimeline(0, mapControl);
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
          updateTimeline($(this).val(), mapControl);
        });
        $('#timeSlider').on('change', function() {
           updateTimeline($(this).val(), mapControl);
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
