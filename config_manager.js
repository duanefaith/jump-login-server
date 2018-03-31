const path = require('path');
const fs = require('fs')

function ConfigManager() {
  this.nodeEnv = process.env.NODE_ENV;
  if (!this.nodeEnv) {
    this.nodeEnv = 'test';
  }
  console.log('current env is ' + this.nodeEnv);
  this.globalConfigs = require('./configs.json')[this.nodeEnv];
}

ConfigManager.prototype.getConfigs = function () {
  var configs = {};
  Object.assign(configs, this.globalConfigs);
  return configs;
};

ConfigManager.prototype.resolve = function (relative) {
  return path.resolve(__dirname, relative);
};

ConfigManager.prototype.readRelativeFileSync = function (relative) {
  return fs.readFileSync(this.resolve(relative));
};

module.exports = function () {
  var instance;
  return {
    getInstance: function () {
      if (!instance) {
        instance = new ConfigManager();
      }
      return instance;
    }
  };
}();