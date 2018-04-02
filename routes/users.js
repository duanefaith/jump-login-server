var express = require('express');
var router = express.Router();
var ConfigManager = require('../config_manager');
var configs = ConfigManager.getInstance().getConfigs();
var https = require('https');
var DBManager = require('../db_manager');

var lineReader = require('readline').createInterface({
  input: require('fs').createReadStream(require('path').resolve(__dirname, '../names'))
});

var names = [];
lineReader.on('line', function (line) {
  names.push(line);
});

var leaderboardCache = [];

function refreshCache() {
  leaderboardCache = [];
  DBManager.getInstance().getDB().user.findAll({
    order: [['score', 'DESC']]
  }).then(function (array) {
    array.forEach(function (user, i) {
      leaderboardCache.push({
        score: user.score,
        rank: i + 1,
        player: {
          id: user.openid,
          type: user.type,
          name: user.name,
          photo: user.photo
        }
      });
    });
  });
}

refreshCache();
setInterval(refreshCache, 120 * 1000);

function updateScoreItem(scoreItem) {
  var newPos = -1;
  var oldPos = -1;
  for (var i = 0; i < leaderboardCache.length; i ++) {
    if (leaderboardCache[i].player.id === scoreItem.player.id) {
      oldPos = i;
    }
    if (newPos === -1 && leaderboardCache[i].score < scoreItem.score) {
      newPos = i;
    }
    if (newPos !== -1 && oldPos !== -1) {
      break;
    }
  }

  if (oldPos === -1) {
    if (newPos === -1) {
      newPos = leaderboardCache.length;
      leaderboardCache.push(scoreItem);
    } else {
      leaderboardCache.splice(newPos, 0, scoreItem);
      for (var i = newPos + 1; i < leaderboardCache.length; i ++) {
        leaderboardCache[i].rank = i + 1;
      }
    }
  } else {
    if (newPos == -1 || oldPos == newPos) {
      // do nothing
    } else if (oldPos > newPos) {
      leaderboardCache.splice(oldPos, 1);
      leaderboardCache.splice(newPos, 0, scoreItem);
      for (var i = newPos + 1; i < oldPos + 1; i ++) {
        leaderboardCache[i].rank = i + 1;
      }
    }
  }
  leaderboardCache[newPos].rank = newPos + 1;
  return scoreItem;
}

function getScorePage (index, offset) {
  var page = [];
  if (index < leaderboardCache.length) {
    var end = Math.min(index + offset, leaderboardCache.length);
    for (var i = index; i < end; i ++) {
      page.push(leaderboardCache[i]);
    }
  }
  return page;
};

function getRank (score) {
  var leftPos = 0;
  var rightPos = leaderboardCache.length - 1;
  if (rightPos >= 0) {
    while (rightPos > leftPos) {
      var midPos = Math.floor((leftPos + rightPos) / 2);
      var midScore = leaderboardCache[midPos].score;
      if (midScore == score) {
        return midPos + 1;
      } else if (midScore > score) {
        leftPos = midPos + 1;
      } else {
        rightPos = midPos - 1;
      }
    }
    return rightPos + 1;
  } else {
    return 1;
  }
};

router.post('*', function (req, res, next) {
  console.log('req.body = ' + JSON.stringify(req.body));
  next();
});

router.post('/login', function (req, res, next) {
  if (req.body && req.body.code) {
    var url = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + configs.wechat.app_id +
      '&secret=' + configs.wechat.app_secret +
      '&js_code=' + req.body.code +
      '&grant_type=authorization_code';
    https.get(url, function (response) {
      if (response.statusCode === 200
          || response.statusCode === 206) {
        response.on('data', function (data) {
          console.log(data);
          var jsonData = JSON.parse(data);
          if (jsonData.hasOwnProperty('errcode') && jsonData.errcode !== 0) {
            if (jsonData.errcode === 40029) {
              res.json({
                error: {
                  code: 1,
                  msg: 'invalid code'
                }
              });
            } else if (jsonData.errcode === -1) {
              res.json({
                error: {
                  code: 1,
                  msg: 'server busy'
                }
              });
            } else {
              res.json({
                error: {
                  code: jsonData.errcode,
                  msg: jsonData.errMsg
                }
              });
            }
          } else {
            var user = {
              id: jsonData.openid,
              token: jsonData.session_key
            };
            res.json({
              user:user
            });
          }
        });
      } else {
        res.json({
          error: {
            code: 3,
            msg: 'network error, status = ' + response.statusCode
          }
        });
      }
    }).on('error', function (e) {
      res.json({
        error: {
          code: 2,
          msg: JSON.stringify(e)
        }
      });
    });
  } else {
    res.json({
      error: {
        code: 1,
        msg: 'invalid parameters'
      }
    });
  }
});

router.post('/score/update', function (req, res, next) {
  if (req.body && req.body.hasOwnProperty('score') && req.body.hasOwnProperty('player')) {
    var score = req.body.score;
    var player = req.body.player;
    if (player.hasOwnProperty('id') && player.hasOwnProperty('type')) {
      if (player.type == 'web') {
        if (!player.name) {
          player.name = names[Math.floor(Math.random() * names.length)];
        }
      }
      var scoreItem = updateScoreItem({score: score, player: player});
      DBManager.getInstance().getDB().user.upsert({
        openid: scoreItem.player.id,
        type: scoreItem.player.type,
        name: scoreItem.player.name,
        photo: scoreItem.player.photo,
        score: scoreItem.score
      }).then(function (created) {
        res.json(scoreItem);
      }).catch(function (error) {
        console.log(error);
        res.json({
          error: {
            code: 2,
            msg: 'unknown error'
          }
        });
      });
      return;
    }
  }
  res.json({
    error: {
      code: 1,
      msg: 'invalid parameters'
    }
  });
});

router.post('/score/query_me', function (req, res, next) {
  if (req.body && req.body.hasOwnProperty('player')) {
    var player = req.body.player;
    if (player.hasOwnProperty('id') && player.hasOwnProperty('type')) {
      DBManager.getInstance().getDB().user.findAll({
        where: {
          openid: player.id,
          type: player.type
        }
      }).then(function (users) {
        if (users.length > 0) {
          res.json({
            score: users[0].score,
            rank: getRank(users[0].score),
            player: {
              id: users[0].openid,
              name: users[0].name,
              photo: users[0].photo
            }
          });
        } else {
          res.json({
            error: {
              code: 1,
              msg: 'user not found'
            }
          });
        }
      }).catch(function (error) {
        console.log(error);
        res.json({
          error: {
            code: 2,
            msg: 'unknown error'
          }
        });
      });
      return;
    }
  }
  res.json({
    error: {
      code: 1,
      msg: 'invalid parameters'
    }
  });
});

router.post('/score/query_count', function (req, res, next) {
  res.json({
    count: leaderboardCache.length
  });
});

router.post('/score/query_page', function (req, res, next) {
  if (req.body && req.body.hasOwnProperty('start') && req.body.hasOwnProperty('count')) {
    var page = getScorePage(req.body.start, req.body.count);
    res.json({
      data: page
    });
  } else {
    res.json({
      error: {
        code: 1,
        msg: 'invalid parameters'
      }
    });
  }
});

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
