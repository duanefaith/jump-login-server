"use strict";

const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');
const ConfigManager = require('../config_manager');
var db = {};

var sequelize = new Sequelize(ConfigManager.getInstance().getConfigs().db, {
  logging: console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define : {
    freezeTableName: true,
    timestamps: true,
    charset: 'utf8',
    collate: 'utf8_general_ci'
  }
});

fs.readdirSync(__dirname)
.filter(function(file) {
  return (file.indexOf('.') !== 0) && (file !== 'index.js');
}).forEach(function (file) {
  var model = sequelize['import'](path.join(__dirname, file));
  db[model.name] = model;
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

