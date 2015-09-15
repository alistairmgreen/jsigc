(function ($) {
   'use strict';

    var igcFile = null;
    var barogramPlot = null;
    var altitudeConversionFactor = 1.0; // Conversion from metres to required units
    
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
           // igcFile.recordTime[timeIndex].toUTCString() + ': ' +
             igcFile.recordTime[timeIndex].getHours() + ':' +pad( igcFile.recordTime[timeIndex].getMinutes()) + ':' + pad(igcFile.recordTime[timeIndex].getSeconds()) + ' UTC; ' + 
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
        // Display the headers.
        var headerTable = $('#headerInfo tbody');
        headerTable.html('');
        var headerName;
        var headerIndex;
        for (headerIndex = 0; headerIndex < igcFile.headers.length; headerIndex++) {
            headerTable.append(
                $('<tr></tr>').append($('<th></th>').text(igcFile.headers[headerIndex].name))
                              .append($('<td></td>').text(igcFile.headers[headerIndex].value))
            );
        }

        // Show the task declaration if it is present.
        
        if (igcFile.task.coordinates.length > 0) {
            //eliminate anything with empty start line coordinates
            if(igcFile.task.coordinates[0][0] !==0) {
                    $('#task').show();
                    var taskList = $('#task ul').first().html('');
                    var j;
                    //Now add TP numbers.  Change to unordered list
                    if(igcFile.task.takeoff.length > 0) {
                               taskList.append($('<li> </li>').text("Takeoff: " + igcFile.task.takeoff));
                    }
                    for (j =0; j <igcFile.task.names.length; j++) {
                            switch(j)  {
                            case 0:
                                    taskList.append($('<li> </li>').text("Start: " + igcFile.task.names[j]));
                                    break;
                            case ( igcFile.task.names.length-1):
                                    taskList.append($('<li> </li>').text("Finish: " + igcFile.task.names[j]));
                                    break;
                            default:
                                    taskList.append($('<li></li>').text("TP" + (j).toString() + ": " + igcFile.task.names[j]));
                        }
                    }
                 if(igcFile.task.landing.length > 0) {
                        taskList.append($('<li> </li>').text("Landing: : " + igcFile.task.landing)); 
                 }
                mapControl.addTask(igcFile.task.coordinates, igcFile.task.names);
                }
        }
        else {
            $('#task').hide();
        }

        // Reveal the map and graph. We have to do this before
        // setting the zoom level of the map or plotting the graph.
        $('#igcFileDisplay').show();
        
        mapControl.addTrack(igcFile.latLong);
        barogramPlot = plotBarogram(igcFile);
        
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
        
        $('#timeBack').click(function() {
           var curTime = parseInt($('#timeSlider').val());
           curTime -=2;
           if(curTime < 0) {
                 curTime = 0;
           }
           $('#timeSlider').val(curTime);
            updateTimeline(curTime, mapControl);
        });
        
         $('#timeForward').click(function() {
           var curTime = parseInt($('#timeSlider').val());
           var maxval= $('#timeSlider').attr("max");
           curTime +=2;
           if(curTime >  maxval) {
                 curTime = maxval;
           }
           $('#timeSlider').val(curTime);
          updateTimeline(curTime, mapControl);
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
