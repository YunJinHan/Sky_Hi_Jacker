var fs = require('fs'),
    util = require('util'),
    sleep = require('sleep'),
    timer = require('timers');
    // using include to make gps log file

var arDrone = require('./Hacking_Drone_Module'),
    parrot  = arDrone.createClient();

var gps_origin_file = 'gps.json',
    // define file name
    origin_data_file = fs.createWriteStream(gps_origin_file, {flags : 'w'}),
    log_stdout = process.stdout;
    // gps log file

var current_degree = 0,
    current_latitude = 0,
    current_longtitude = 0,
    dest_distance = 0,
    dest_degree = 0,
    dest_latitude = 0,
    dest_longtitude = 0,
    goDetermine = false,
    tmp2 = false;

parrot.config('general:navdata_options',777060865);
// turn on only gps options

parrot.createRepl();
// PoketMon Drone Start

parrot.setMaxListeners(0);

function getData(navdata) {
    origin_data_file = fs.createWriteStream(gps_origin_file, {flags : 'w'});

    let data_content = util.format(navdata.gps),
        text = data_content.replace(/[\']+/g,'');

    origin_data_file.write(text + '\n');

    let latAndlongData = util.format(navdata.gps),
        latData = latAndlongData.indexOf('latitude'),
        longData = latAndlongData.indexOf('longitude'),
        tmpData = latAndlongData.indexOf('elevation'),
        latString = latAndlongData.substring(latData + 12 , longData - 6),
        longString = latAndlongData.substring(longData + 13 , tmpData - 6);

    current_latitude = latString*1;
    current_longtitude = longString*1;

    parrot._currentLat = current_latitude*1;
    parrot._currentLong = current_longtitude*1;

    let data = util.format(navdata.magneto),
            degreeStart = data.indexOf('fusionUnwrapped'),
            degreeEnd = data.indexOf('ok'),
            degree = data.substring(degreeStart + 17 , degreeEnd - 6) * 1;

    degree = degree > 360 ? degree - 360 : (degree < 0 ? degree + 360 : degree);

    current_degree = degree;
    parrot._currentDegree = current_degree;
}

function modifyDegree() {
    let modifyDegreeID = setInterval(function() {
        if (parrot._currentDegree > parrot._destDegree + 5 || parrot._currentDegree < parrot._destDegree - 5) {
            console.log("방위각 조정중 ... ");
            console.log(parrot._destDegree + " , " + parrot._currentDegree);
            // test code
        }
        else {
            parrot.stop();
            // parrot.land();
            // test code
            console.log("방위각 조정 완료 ... ");
            clearInterval(modifyDegreeID);
            goDetermine = true;
        }
    },100);
}

function parrotGo() {
    let parrotGoID = setInterval(function() {
        if (goDetermine) {
            console.log("Parrot Ar Drone 이동 시작 ...");
            parrot.front(1); // 이동 ~
            clearInterval(parrotGoID);
            stopDetermine = true;
        }
    });
}

function parrotStop() {
    let stopParrotID = setInterval(function() {
        if (stopDetermine) {
            console.log("Parrot Ar Drone 이동 중 ...");
            sleep.sleep(5);
            if ( (parrot._currentLat <= parrot._destLat + 0.00002 && parrot._currentLat >= parrot._destLat - 0.00002) 
                && 
                (parrot._currentLong <= parrot._destLong + 0.00002 && parrot._currentLong >= parrot._destLong - 0.00002) ) {
                // 0.00001 도 차이 = 약 1m 차이

                console.log("Parrot Ar Drone 해당 지점 도착 ...");

                parrot.stop();
                parrot.land(); // Follow 로 진행 시 지우자

                clearInterval(stopParrotID);
            }
        }
    });
}

parrot.on('navdata',getData);

// parrot.takeoff();
// do not erase

setTimeout(function() {
    
    parrot.hack(37.296756, 126.835996);
    modifyDegree();
    parrotGo();
    parrotStop();

},1000)
