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
                axisLabel: 'Time',
                tickFormatter: function (t, axis) {
                     return moment(t).format('HH:mm');
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
        var startPosition = igcFile.latLong[0];
        var distance = L.latLng(currentPosition[0], currentPosition[1]).distanceTo(
            L.latLng(startPosition[0], startPosition[1])) / 1000.0;
        
        var unitName = $('#altitudeUnits').val();
        $('#timePositionDisplay').text(
            moment(igcFile.recordTime[timeIndex]).format('HH:mm:ss') + ': ' +
            (igcFile.pressureAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
            unitName + ' (barometric) / ' +
            (igcFile.gpsAltitude[timeIndex] * altitudeConversionFactor).toFixed(0) + ' ' +
            unitName + ' (GPS); ' +
            distance.toFixed(1) + ' km from takeoff'
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
        
         $('#barogram').on('plotclick', function (event, pos, item) {
             console.log('plot click');
             if (item) {
                 updateTimeline(item.dataIndex, mapControl);
                 $('#timeSlider').val(item.dataIndex);
             }
         });
    });
}(jQuery));
