'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var dbus = require('dbus');

// vui extapp接口
var DBUS_EXTAPP_PATH = '/activation/extapp';
var DBUS_EXTAPP_INTERFACE = 'com.rokid.activation.extapp';
// vui prop接口
var DBUS_PROP_PATH = '/activation/prop';
var DBUS_PROP_INTERFACE = 'com.rokid.activation.prop';
// vui 通知接口
var DBUS_NOTIFY_PATH = '/extapp/notify';
var DBUS_NOTIFY_INTERFACE = 'rokid.notify.interface';

// ttsd 接口
var DBUS_TTS_SERVER = 'com.service.tts';
var DBUS_TTS_PATH = '/tts/service';
var DBUS_TTS_INTERFACE = 'tts.service';

// multimedia 接口
var DBUS_MULTIMEDIA_SERVER = 'com.service.multimedia';
var DBUS_MULTIMEDIA_PATH = '/multimedia/service';
var DBUS_MULTIMEDIA_INTERFACE = 'multimedia.service';

function Adapter(service) {
  EventEmitter.call(this);
  this.service = dbus.registerService('session', service);
}
inherits(Adapter, EventEmitter);


Adapter.prototype.listenTtsdEvent = function (cb) {
  return this.listen(DBUS_TTS_SERVER, DBUS_TTS_PATH, DBUS_TTS_INTERFACE, (name, args) => {
    cb(name, args);
  });
};

Adapter.prototype.listenMultimediadEvent = function (cb) {
  return this.listen(DBUS_MULTIMEDIA_SERVER, DBUS_MULTIMEDIA_PATH, DBUS_MULTIMEDIA_INTERFACE, (name, args) => {
    cb(name, args);
  });
};


Adapter.prototype.ttsMethod = function (name, args) {
  return this.remoteCall(name, args, DBUS_TTS_SERVER, DBUS_TTS_PATH, DBUS_TTS_INTERFACE);
};

Adapter.prototype.multiMediaMethod = function (name, args) {
  return this.remoteCall(name, args, DBUS_MULTIMEDIA_SERVER, DBUS_MULTIMEDIA_PATH, DBUS_MULTIMEDIA_INTERFACE);
};
/**
 * 调用dbus的远程方法
 * @param {string} method 要调用的方法名
 * @param {string[]} args 要传递的参数
 * @return {promise} dbus远程方法返回的值，是一个参数数组
 */
Adapter.prototype.remoteCall = function (method, args, dbusService, dbusObjectPath, dbusInterface) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('');
    this.service._dbus.callMethod(
      dbusService,
      dbusObjectPath,
      dbusInterface,
      method, sig, args, function (res) {
        resolve(res);
      });
  });
};

/**
 * 监听dbus signal
 * @param {string} serviceName 需要监听的dbus service name 
 * @param {string} objectPath 需要监听的dbus object path
 * @param {string} ifaceName 需要监听的dbus interface name
 * @param {string} cb 收到signal事件的回调
 * @return {promise} 
 */
Adapter.prototype.listen = function (serviceName, objectPath, ifaceName, cb) {
  return new Promise((resolve, reject) => {
    this.service._dbus.getUniqueServiceName(serviceName, (err, uniqueName) => {
      if (err) return reject(err);
      resolve(uniqueName);
    })
  }).then((uniqueName) => {
    return Promise.all([
      this.addSignalFilter(uniqueName, objectPath, ifaceName)
    ]);
  }).then((names) => {
    // 监听signal
    var uniqueName = names[0];
    var channel = `${uniqueName}:${objectPath}:${ifaceName}`;
    this.service._dbus.on(channel, (message) => {
      var name = message.name;
      var args = message.args;
      cb.call(this, name, args);
    });
  });
};

/**
 * 增加signal过滤
 * @param {string} uniqueName dbus server的唯一name
 * @param {string} objectPath dbus的object path
 * @param {string} dbusInterface dbus的interface name
 * @return {promise} uniqueName
 */
Adapter.prototype.addSignalFilter = function (uniqueName, objectPath, ifaceName) {
  return new Promise((resolve, reject) => {
    this.service._dbus.addSignalFilter(uniqueName, objectPath, ifaceName, (err) => {
      if (err) return reject(err);
      resolve(uniqueName);
    });
  });
};


module.exports = Adapter;