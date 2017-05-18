Sky Hi Jacker
=====

-&nbsp;Hacking Drone
========

Introduction
----
This project is Hacking Parrot Ar Drone 2.0 using customized Pixhawk Drone

It is based on [node-ar-drone](https://github.com/felixge/node-ar-drone) API , modifed and added some specific code


Directions for Using
-----
1. Starting Sky Hi Jacker
<pre>node Hacking_Drone.js</pre>
2. Use to Hacking Function<br>**hack( Destination lat, Destination lon )**
<pre>SKY_HIJACKER > hack(32.43114,126.324151)</pre>
3. Then, Target Parrot Ar Drone is moving to destination point during adjusting the azimuth



-&nbsp;Get Pixhawk GPS
===========
Introduction
-----
Using pixhawk telemetry, It extracts GPS data as JSON file from pixhawk

It is based on [c-uart-interface](https://github.com/mavlink/c_uart_interface_example) API, modified and added some specific code

Direction for Using
-----
1. first, complie ..
<pre>make</pre>
2. find telemetry device number in /dev folder.
<pre>For example<br>/dev/ttyACM0 ..<br>/dev/cu.usbserial-DN012VZR .. etc</pre>
3. run as this format
<pre> ./SKY_HI_JACKER_GET_GPS_DATA -d /dev/**Your dev number**</pre>
4. then this program create "pixhawk\_gps.json" file every second.<br>JSON file format is as in the following.
<pre>{
 "lat" : "37.395696",
 "lon" : "126.654533"
}
</pre>
