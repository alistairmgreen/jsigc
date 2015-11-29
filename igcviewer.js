(function ($) {
   'use strict';

    var igcFile = null;
    var barogramPlot = null;
    var altitudeConversionFactor = 1.0; // Conversion from metres to required units
    
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
                axisLabel: 'Time',
                tickFormatter: function (t, axis) {
                     return moment(t).format('HH:mm');
                },
                ticks: function (axis) {
                    var ticks = [];
                    var startMoment = moment(axis.min);
                    var endMoment = moment(axis.max);
                    var durationMinutes = endMoment.diff(startMoment, 'minutes');
                    var interval;
                    if (durationMinutes <= 10) {
                       interval = 1;
                    }
                    if (durationMinutes <= 50) {
                       interval = 5;
                    }
                    else if (durationMinutes <= 100) {
                       interval = 10;
                    }
                    else if (durationMinutes <= 150) {
                       interval = 15;
                    }
                    else if (durationMinutes <= 300) {
                       interval = 30;
                    }
                    else if (durationMinutes <= 600) {
                       interval = 60;
                    }
                    else {
                       interval = 120;
                    }
                    
                    var tick = startMoment.clone();
                    tick.minutes(0).seconds(0);
                    while (tick < endMoment) {
                        if (tick > startMoment) {
                            ticks.push(tick.valueOf());
                        }
                        tick.add(interval, 'minutes');
                    }
                    
                    return ticks;
                }
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
            moment(igcFile.recordTime[timeIndex]).format('HH:mm:ss') + ': ' +
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
        var displayDate = moment(igcFile.recordTime[0]).format('LL');
        var headerTable = $('#headerInfo tbody');
        headerTable.html('')
                   .append(
                       $('<tr></tr>').append($('<th></th>').text('Date'))
                              .append($('<td></td>').text(displayDate))
                   );
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

    function storePreference(name, value) {
        if (window.localStorage) {
            try {
                localStorage.setItem(name, value);
            }
            catch (e) {
                // If permission is denied, ignore the error.
            }
        }
    }

    $(document).ready(function () {
        var mapControl = createMapControl('map');

        var timeZoneSelect = $('#timeZoneSelect');
        $.each(moment.tz.names(), function(index, name) {
            timeZoneSelect.append(
                 $('<option></option>', { value: name }).text(name));
        });
        var timeZone = 'UTC'; // There is no easy way to get local time zone!
        timeZoneSelect.val(timeZone); 
        moment.tz.setDefault(timeZone);
        
        timeZoneSelect.change(function () {
            moment.tz.setDefault($(this).val());
            if (igcFile !== null) {
                barogramPlot = plotBarogram();
                updateTimeline($('#timeSlider').val(), mapControl);
                $('#headerInfo td').first().text(moment(igcFile.recordTime[0]).format('LL'));
            }
        });
        
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

        $('#altitudeUnits').change(function (e, raisedProgrammatically) {
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

            if (!raisedProgrammatically) {
                storePreference("altitudeUnit", altitudeUnit);
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
        
         $('#barogram').on('plotclick', function (event, pos, item) {
             console.log('plot click');
             if (item) {
                 updateTimeline(item.dataIndex, mapControl);
                 $('#timeSlider').val(item.dataIndex);
             }
         });

         if (window.localStorage) {
             try {
                 var altitudeUnit = localStorage.getItem("altitudeUnit");
                 if (altitudeUnit) {
                     $('#altitudeUnits').val(altitudeUnit).trigger('change', true);
                 }
             }
             catch (e) {
                 // If permission is denied, ignore the error.
             }
         }
    });
}(jQuery));
