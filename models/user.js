module.exports = function (sequelize, DataTypes) {
  return sequelize.define('user', {
    id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    openid: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(10),
      allowNull: false,

    },
    name: {
      type: DataTypes.STRING(64)
    },
    photo: {
      type: DataTypes.TEXT
    },
    score: {
      type: DataTypes.INTEGER(10).UNSIGNED
    }
  }, {
    engine: 'InnoDB',
    charset: 'utf8',
    comment: 'users',
    timestamps: false,
    freezeTableName: true,
    indexes: [{
      fields: ['openid', 'type'],
      unique: true
    }, {
      fields: ['score'],
      unique: false
    }]
  });
};