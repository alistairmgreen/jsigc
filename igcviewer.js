(function ($) {
   'use strict';

    var igcFile = null;

    function plotBarogram() {
        var nPoints = igcFile.recordTime.length;
        var pressureBarogramData = [];
        var gpsBarogramData = [];
        var j;
        var timestamp;
        var altitudeUnit = $('#altitudeUnits').val();
        var altitudeConversionFactor;
        if (altitudeUnit === 'feet') {
            altitudeConversionFactor = 3.2808399;
        }
        else {
            altitudeConversionFactor = 1.0;
        }

        for (j = 0; j < nPoints; j++) {
            timestamp = igcFile.recordTime[j].getTime();
            pressureBarogramData.push([timestamp, igcFile.pressureAltitude[j] * altitudeConversionFactor]);
            gpsBarogramData.push([timestamp, igcFile.gpsAltitude[j] * altitudeConversionFactor]);
        }

        $('#barogram').plot([{
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
                axisLabel: 'Altitude / ' + altitudeUnit
            }
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

        plotBarogram(igcFile);
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
            if (igcFile !== null) {
                plotBarogram();
            }
        });
    });
}(jQuery));
