var fs = require('fs');
var util = require('util');
var timer = require('timers');
// using include to make gps log file

var arDrone = require('./Hacking_Drone_Module');
var client  = arDrone.createClient();

var gps_origin_file = 'gps.json';
// define file name

var origin_data_file = fs.createWriteStream(gps_origin_file, {flags : 'w'});
var log_stdout = process.stdout;
// gps log file

var isHack = false;

var current_degree = 0;
var current_latitude = 0;
var current_longtitude = 0;

var dest_distance = 0;

var dest_degree = 0;
var dest_latitude = 0;
var dest_longtitude = 0;

client.config('general:navdata_options',777060865);
// turn on only gps options

client.createRepl();
// PoketMon Drone Start

setInterval(function() {

    if (isHack) { // 해당 좌료로 이동 시작

        var final_break = false;

        while (1) {

            var i = 0;
            
            while (current_degree > dest_degree + 2 || current_degree < dest_degree - 2) {
                
                i++;
                if (i>1000) break;

                client.clockwise(0.1);
            }

            while (current_degree <= dest_degree + 2 && current_degree >= dest_degree - 2) {

                client.front(1); // 이동 ~

                if ((current_latitude <= dest_latitude && current_latitude >= dest_latitude) 
                    && 
                    (current_longtitude <= dest_longtitude && current_longtitude >= dest_longtitude)) {
                    
                    client.stop();
                    client.land();

                    final_break = true;
                    client._hack = false;
                    isHack = false;
                    break;
                }
            }
            if (final_break) {
                break;
            }
        }

    }

});

setInterval(function(){

	client.on('navdata', function(navdata) {
		origin_data_file = fs.createWriteStream(gps_origin_file, {flags : 'w'});
		let data_content = util.format(navdata.gps);
		let text = data_content.replace(/[\']+/g,'');
		origin_data_file.write(text + '\n');

		var latAndlongData = util.format(navdata.gps);
		var latData = latAndlongData.indexOf('latitude');
        var longData = latAndlongData.indexOf('longitude');
        var tmpData = latAndlongData.indexOf('elevation');
        
        var latString = latAndlongData.substring(latData + 12 , longData - 6);
        var longString = latAndlongData.substring(longData + 13 , tmpData - 6);

        current_latitude = latString;
        current_longtitude = longString;
        console.log("\n현재 Parrot 위치 : " + current_latitude + " , " + current_longtitude);
	}); 
	// get current gps data

	client.on('navdata',function(navdata){
		var data = util.format(navdata.magneto);
		var degreeStart = data.indexOf('fusionUnwrapped');
		var degreeEnd = data.indexOf('ok');
		var degree = data.substring(degreeStart + 17 , degreeEnd - 6);
		
        degree = degree > 360 ? degree - 360 : (degree < 0 ? degree + 360 : degree);

        current_degree = degree.toFixed(0);
        console.log("\n현재 Degree : " + current_degree);
	});
	// get current degree data

    if (client._hack == true && isHack == false) {
        var victim = [];
        var victim = client._hackData;

        dest_distance = victim[0];
        dest_degree = victim[1];

        dest_latitude = client._destLat;
        dest_longtitude = client._destLong;

        isHack = true;

        console.log("\n목적지 좌표 : " + dest_latitude + " , " + dest_longtitude + "\n목적지 위치 : " + dest_distance + "\n목적지 방위각 : " + dest_degree);
    }

	setTimeout(function(){
		client.removeAllListeners()
	},100);
	// gps information log stop
	
},100);
