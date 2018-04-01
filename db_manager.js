function DBManager() {
  this.db = require('./models');
  this.db.sequelize.sync();
}

DBManager.prototype.getDB = function () {
  return this.db;
};

module.exports = function () {
  var instance;
  return {
    getInstance: function () {
      if (!instance) {
        instance = new DBManager();
      }
      return instance;
    }
  };
} ();