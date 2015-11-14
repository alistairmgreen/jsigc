/* Flot plugin for showing crosshairs on the plot.

Copyright (c) 2007-2014 IOLA and Ole Laursen,
2015 Alistair Green.
Licensed under the MIT license.

The plugin supports these options:

	crosshair: {
		mode: null or "x" or "y" or "xy"
		color: color
		lineWidth: number
	}

Set the mode to one of "x", "y" or "xy". The "x" mode enables a vertical
crosshair that lets you trace the values on the x axis, "y" enables a
horizontal crosshair and "xy" enables them both. "color" is the color of the
crosshair (default is "rgba(170, 0, 0, 0.80)"), "lineWidth" is the width of
the drawn lines (default is 1).

The plugin also adds one public method:

  - lockCrosshair( pos )

    Set the position of the crosshair.
    "pos" is in coordinates of the plot and should be on the
    form { x: xpos, y: ypos } (you can use x2/x3/... if you're using multiple
    axes), which is coincidentally the same format as what you get from a
    "plothover" event. If "pos" is null, the crosshair is cleared.

*/

(function ($) {
    'use strict';
    
    var options = {
        crosshair: {
            mode: null, // one of null, "x", "y" or "xy",
            color: "rgba(170, 0, 0, 0.80)",
            lineWidth: 1
        }
    };
    
    function init(plot) {
        // position of crosshair in axis units
        var crosshair = { x: null, y: null };

        plot.lockCrosshair = function lockCrosshair(pos) {
            if (pos) {
                crosshair.x = pos.x;
                crosshair.y = pos.y;
            }
            else {
                crosshair.x = null;
                crosshair.y = null;
            }
            
            plot.triggerRedrawOverlay();
        };

        plot.hooks.drawOverlay.push(function (plot, ctx) {
            var c = plot.getOptions().crosshair;
            if (!c.mode) {
                return;
            }

            var plotOffset = plot.getPlotOffset();
            
            ctx.save();
            ctx.translate(plotOffset.left, plotOffset.top);

            if (crosshair.x !== null && crosshair.y !== null) {
                // Convert logical position to pixels. Have to do this
                // at draw time to cope with resizing.
                var o = plot.p2c(crosshair);
                var pixelPos = {
                    x: Math.max(0, Math.min(o.left, plot.width())),
                    y: Math.max(0, Math.min(o.top, plot.height()))
                };
                
                var adj = plot.getOptions().crosshair.lineWidth % 2 ? 0.5 : 0;

                ctx.strokeStyle = c.color;
                ctx.lineWidth = c.lineWidth;
                ctx.lineJoin = "round";

                ctx.beginPath();
                if (c.mode.indexOf("x") !== -1) {
                    var drawX = Math.floor(pixelPos.x) + adj;
                    ctx.moveTo(drawX, 0);
                    ctx.lineTo(drawX, plot.height());
                }
                if (c.mode.indexOf("y") !== -1) {
                    var drawY = Math.floor(pixelPos.y) + adj;
                    ctx.moveTo(0, drawY);
                    ctx.lineTo(plot.width(), drawY);
                }
                ctx.stroke();
            }
            ctx.restore();
        });
    }
    
    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'crosshair',
        version: '1.1'
    });
}(jQuery));
