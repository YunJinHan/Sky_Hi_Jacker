var EventEmitter = require('events').EventEmitter;
var util         = require('util');

Client.UdpControl       = require('./control/UdpControl');
Client.Repl             = require('./Repl');
Client.UdpNavdataStream = require('./navdata/UdpNavdataStream');
Client.PngStream        = require('./video/PngStream');
Client.PngEncoder       = require('./video/PngEncoder');
Client.TcpVideoStream   = require('./video/TcpVideoStream');

module.exports = Client;
util.inherits(Client, EventEmitter);

function Client(options) {
  EventEmitter.call(this);

  options = options || {};

  this._options           = options;
  this._udpControl        = options.udpControl || new Client.UdpControl(options);
  this._udpNavdatasStream = options.udpNavdataStream || new Client.UdpNavdataStream(options);
  this._pngStream         = null;
  this._tcpVideoStream    = null;
  this._interval          = null;
  this._ref               = {};
  this._pcmd              = {};
  this._repeaters         = [];
  this._afterOffset       = 0;
  this._disableEmergency  = false;
  this._lastState         = 'CTRL_LANDED';
  this._lastBattery       = 100;
  this._lastAltitude      = 0;

  // ------------------------ 추가 속성 Start ------------------------ //
  this._currentLat = 0; // 현재 위도
  this._currentLong = 0; // 현재 경도

  this._destLat = 0; // 목적지 위도
  this._destLong = 0; // 목적지 경도

  this._hack = false; // 해당 목적지로 가고있는지 여부
  this._hackData = []; // 해당 목적지 좌표 배열
  // ------------------------ 추가 속성 End ------------------------ //
}

// ------------------------ 추가 함수 Start ------------------------ //
Client.prototype.hack = function(dest_lat,dest_lon) {

  function deg2rad(deg) {
    return (deg * Math.PI / 180);
  }

  function rad2deg(rad) {
    return (rad * 180 / Math.PI);
  }

  function calDistance(P1_latitude, P1_longitude, P2_latitude, P2_longitude) {
    if ((P1_latitude == P2_latitude) && (P1_longitude == P2_longitude)) return 0;

    var e10 = P1_latitude * Math.PI / 180;
    var e11 = P1_longitude * Math.PI / 180;
    var e12 = P2_latitude * Math.PI / 180;
    var e13 = P2_longitude * Math.PI / 180;
    /* 타원체 GRS80 */
    var c16 = 6356752.314140910;
    var c15 = 6378137.000000000;
    var c17 = 0.0033528107;
    var f15 = c17 + c17 * c17;
    var f16 = f15 / 2;
    var f17 = c17 * c17 / 2;
    var f18 = c17 * c17 / 8;
    var f19 = c17 * c17 / 16;
    var c18 = e13 - e11;
    var c20 = (1 - c17) * Math.tan(e10);
    var c21 = Math.atan(c20);
    var c22 = Math.sin(c21);
    var c23 = Math.cos(c21);
    var c24 = (1 - c17) * Math.tan(e12);
    var c25 = Math.atan(c24);
    var c26 = Math.sin(c25);
    var c27 = Math.cos(c25);
    var c29 = c18;
    var c31 = (c27 * Math.sin(c29) * c27 * Math.sin(c29)) + (c23 * c26 - c22 * c27 * Math.cos(c29)) * (c23 * c26 - c22 * c27 * Math.cos(c29));
    var c33 = (c22 * c26) + (c23 * c27 * Math.cos(c29));
    var c35 = Math.sqrt(c31) / c33;
    var c36 = Math.atan(c35);
    var c38 = 0;
    var c40 = 0;
    
    if (c31 == 0) {
        c38 = 0;
    } 
    else {
        c38 = c23 * c27 * Math.sin(c29) / Math.sqrt(c31);
    }

    if ((Math.cos(Math.asin(c38)) * Math.cos(Math.asin(c38))) == 0) {
        c40 = 0;
    }

    else {
        c40 = c33 - 2 * c22 * c26 / (Math.cos(Math.asin(c38)) * Math.cos(Math.asin(c38)));
    }

    var c41 = Math.cos(Math.asin(c38)) * Math.cos(Math.asin(c38)) * (c15 * c15 - c16 * c16) / (c16 * c16);
    var c43 = 1 + c41 / 16384 * (4096 + c41 * (-768 + c41 * (320 - 175 * c41)));
    var c45 = c41 / 1024 * (256 + c41 * (-128 + c41 * (74 - 47 * c41)));
    var c47 = c45 * Math.sqrt(c31) * (c40 + c45/ 4 * (c33 * (-1 + 2 * c40 * c40) - c45 / 6 * c40 * (-3 + 4 * c31) * (-3 + 4 * c40 * c40)));
    var c50 = c17 / 16 * Math.cos(Math.asin(c38)) * Math.cos(Math.asin(c38)) * (4 + c17 * (4 - 3 * Math.cos(Math.asin(c38)) * Math.cos(Math.asin(c38))));
    
    var c52 = c18 + (1 - c50) * c17 * c38 * (Math.acos(c33) + c50 * Math.sin(Math.acos(c33)) * (c40 + c50 * c33 * (-1 + 2 * c40 * c40)));
    var c54 = c16 * c43 * (Math.atan(c35) - c47);
    
    return c54;
  }

  function calBearingAngle(P1_latitude, P1_longitude, P2_latitude, P2_longitude) {
      var current_lat_radian = deg2rad(P1_latitude),
          current_lon_radian = deg2rad(P1_longitude),
          destination_lat_radian = deg2rad(P2_latitude),
          destination_lon_radian =deg2rad(P2_longitude);

      var radian_distance_tmp1 = Math.acos(current_lat_radian) * Math.sin(destination_lat_radian),
          radian_distance_tmp2 = Math.cos(current_lat_radian) * Math.cos(destination_lat_radian) * Math.cos(current_lon_radian - destination_lon_radian),
          radian_distance = radian_distance_tmp1 + radian_distance_tmp2;

      var radian_bearing_tmp1 = Math.sin(destination_lat_radian) - Math.sin(current_lat_radian) * Math.cos(radian_distance),
          radian_bearing_tmp2 = Math.cos(current_lat_radian) * Math.sin(radian_distance),
          radian_bearing = Math.acos(radian_bearing_tmp1 / radian_bearing_tmp2);
          // 현재 좌표부터 목적지로의 이동 방향

      var true_bearing = rad2deg(radian_bearing),
          true_bearing = (Math.sin(destination_lon_radian - current_lon_radian) < 0 ? 360 - true_bearing : true_bearing);
          
      return true_bearing.toFixed(2);
  }

  this._destLat = dest_lat;
  this._destLong = dest_lon;

  var distance = calDistance(this._currentLat,this._currentLong,this._destLat,this._destLong),
      degree = calBearingAngle(this._currentLat,this._currentLong,this._destLat,this._destLong)*1,
      degree = degree > 360 ? degree - 360 : (degree < 0 ? degree + 360 : degree),
      data = [distance,degree];

  this._hack = true;
  this._hackData = data;
  
  return "Hacking Success!!";
}
// ------------------------ 추가 함수 End ------------------------ //

Client.prototype.after = function(duration, fn) {
  setTimeout(fn.bind(this), this._afterOffset + duration);
  this._afterOffset += duration;
  return this;
};

Client.prototype.createRepl = function() {
  var repl = new Client.Repl(this);
  repl.resume();
  return repl;
};

Client.prototype.createPngStream = function() {
  console.warn("Client.createPngStream is deprecated. Use Client.getPngStream instead.");
  return this.getPngStream();
};

Client.prototype.getPngStream = function() {
  if (this._pngStream === null) {
    this._pngStream = this._newPngStream();
  }
  return this._pngStream;
};

Client.prototype.getVideoStream = function() {
  if (!this._tcpVideoStream) {
    this._tcpVideoStream = this._newTcpVideoStream();
  }
  return this._tcpVideoStream;
};

Client.prototype._newTcpVideoStream = function() {
  var stream = new Client.TcpVideoStream(this._options);
  var callback = function(err) {
    if (err) {
      console.log('TcpVideoStream error: %s', err.message);
      setTimeout(function () {
        console.log('Attempting to reconnect to TcpVideoStream...');
        stream.connect(callback);
      }, 1000);
    }
  };

  stream.connect(callback);
  stream.on('error', callback);
  return stream;
};

Client.prototype._newPngStream = function() {
  var videoStream = this.getVideoStream();
  var pngEncoder = new Client.PngEncoder(this._options);

  videoStream.on('data', function(data) {
    pngEncoder.write(data);
  });

  return pngEncoder;
};

Client.prototype.resume = function() {
  // Reset config ACK.
  this._udpControl.ctrl(5, 0);
  // request basic navdata by default
  this.config('general:navdata_demo', 'TRUE');
  this.disableEmergency();
  this._setInterval(30);

  this._udpNavdatasStream.removeAllListeners();
  this._udpNavdatasStream.resume();
  this._udpNavdatasStream
    .on('error', this._maybeEmitError.bind(this))
    .on('data', this._handleNavdata.bind(this));
};

Client.prototype._handleNavdata = function(navdata) {
  if (navdata.droneState && navdata.droneState.emergencyLanding && this._disableEmergency) {
    this._ref.emergency = true;
  } else {
    this._ref.emergency    = false;
    this._disableEmergency = false;
  }
  if (navdata.droneState.controlCommandAck) {
    this._udpControl.ack();
  } else {
    this._udpControl.ackReset();
  }
  this.emit('navdata', navdata);
  this._processNavdata(navdata);
};

Client.prototype._processNavdata = function(navdata) {
  if (navdata.droneState && navdata.demo) {
    // controlState events
    var cstate = navdata.demo.controlState;
    var emitState = (function(e, state) {
      if (cstate === state && this._lastState !== state) {
        return this.emit(e);
      }
    }).bind(this);
    emitState('landing', 'CTRL_TRANS_LANDING');
    emitState('landed', 'CTRL_LANDED');
    emitState('takeoff', 'CTRL_TRANS_TAKEOFF');
    emitState('hovering', 'CTRL_HOVERING');
    emitState('flying', 'CTRL_FLYING');

    this._lastState = cstate;

    // battery events
    var battery = navdata.demo.batteryPercentage;
    if (navdata.droneState.lowBattery === 1) {
      this.emit('lowBattery', battery);
    }
    if (navdata.demo.batteryPercentage !== this._lastBattery) {
      this.emit('batteryChange', battery);
      this._lastBattery = battery;
    }

    // altitude events
    var altitude = navdata.demo.altitudeMeters;

    if (altitude !== this._lastAltitude) {
      this.emit('altitudeChange', altitude);
      this._lastAltitude = altitude;
    }
  }

};

// emits an 'error' event, but only if somebody is listening. This avoids
// making node's EventEmitter throwing an exception for non-critical errors
Client.prototype._maybeEmitError = function(err) {
  if (this.listeners('error').length > 0) {
    this.emit('error', err);
  }
};

Client.prototype._setInterval = function(duration) {
  clearInterval(this._interval);
  this._interval = setInterval(this._sendCommands.bind(this), duration);
};

Client.prototype._sendCommands = function() {
  this._udpControl.ref(this._ref);
  this._udpControl.pcmd(this._pcmd);
  this._udpControl.flush();

  this._repeaters
    .forEach(function(repeat) {
      repeat.times--;
      repeat.method();
    });

  this._repeaters = this._repeaters.filter(function(repeat) {
    return repeat.times > 0;
  });
};

Client.prototype.disableEmergency = function() {
  this._disableEmergency = true;
};

Client.prototype.go = function(cb) {
    this.once('go',cb || function() {});
    this._ref.fly = true;
    return true;
};

Client.prototype.takeoff = function(cb) {
  this.once('hovering', cb || function() {});
  this._ref.fly = true;
  return true;
};

Client.prototype.land = function(cb) {
  this.once('landed', cb || function() {});
  this._ref.fly = false;
  return true;
};

Client.prototype.stop = function() {
  this._pcmd = {};
  return true;
};

Client.prototype.calibrate = function(device_num) {
  this._udpControl.calibrate(device_num);
};

Client.prototype.ftrim = function() {
  // @TODO Figure out if we can get a ACK for this, so we don't need to
  // repeat it blindly like this

  if(this._ref.fly) {
    console.trace("You can’t ftrim when you fly");
    return false;
  }

  var self = this;
  this._repeat(10, function() {
    self._udpControl.ftrim();
  });
};

Client.prototype.config = function(key, value, callback) {
  this._udpControl.config(key, value, callback);
};

Client.prototype.ctrl = function(controlMode, otherMode) {
  this._udpControl.ctrl(controlMode, otherMode);
};

Client.prototype.animate = function(animation, duration) {
  // @TODO Figure out if we can get a ACK for this, so we don't need to
  // repeat it blindly like this
  
  var self = this;
  this._repeat(10, function() {
    self._udpControl.animate(animation, duration);
  });
};

Client.prototype.animateLeds = function(animation, hz, duration) {
  // @TODO Figure out if we can get a ACK for this, so we don't need to
  // repeat it blindly like this
  var self = this;
  this._repeat(10, function() {
    self._udpControl.animateLeds(animation, hz, duration);
  });
};

Client.prototype.battery = function() {
  return this._lastBattery;
};

Client.prototype._repeat = function(times, fn) {
  this._repeaters.push({times: times, method: fn});
};

var pcmdOptions = [
  ['up', 'down'],
  ['left', 'right'],
  ['front', 'back'],
  ['clockwise', 'counterClockwise'],
];

pcmdOptions.forEach(function(pair) {
  Client.prototype[pair[0]] = function(speed) {
    if (isNaN(speed)) {
      return;
    }
    speed = parseFloat(speed);

    this._pcmd[pair[0]] = speed;
    delete this._pcmd[pair[1]];

    return speed;
  };

  Client.prototype[pair[1]] = function(speed) {
    if (isNaN(speed)) {
      return;
    }

    speed = parseFloat(speed);

    this._pcmd[pair[1]] = speed;
    delete this._pcmd[pair[0]];

    return speed;
  };
});
