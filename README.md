# jsIGC
Glider pilots record their flights with electronic loggers which save GPS and barograph traces in International Gliding Commission
(IGC) format. Recently, open source smartphone apps such as [XCSoar](http://www.xcsoar.org) have become available which
are able to record an IGC flight log at a fraction of the cost of a dedicated logger, although these are not approved
for use in competitions or badge claims.

Unfortunately the most popular software for viewing IGC files on a PC is commercial and rather expensive.
Although some free programs exist, they were mostly developed on Linux and installation on Windows PCs is non-trivial.
Furthermore, some IGC viewers require a lot of screen space and can be difficult to use on laptops.

*jsIGC* is an IGC viewer written in JavaScript and HTML 5, which is able to run in any modern Web browser. It draws
the glider's flight path onto an interactive map, using [OpenStreetMap](http://www.openstreetmap.org) data, and also
plots a graph of altitude against time. The responsive layout adjusts itself to fit any screen size, from a large
widescreen monitor to a small laptop or even a smartphone.

All processing takes place in client-side script, so there is no need to upload the IGC file (or anything else)
to the server.

## Browser Support

The browser must support the JavaScript FileReader API, which is used to open files from the local hard drive.
This API is available in most modern browsers, but not in Internet Explorer 9 or earlier versions.

jsIGC has been tested in the following browsers:
* Firefox 37 (Windows and Android versions)
* Internet Explorer 11
* Chrome 42 for Android
