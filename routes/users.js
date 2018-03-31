var express = require('express');
var router = express.Router();
var ConfigManager = require('../config_manager');
var configs = ConfigManager.getInstance().getConfigs();
var https = require('https');

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
          if (jsonData.errcode !== 0) {
            if (jsonData.errcode === 40029) {
              res.json({
                user: {
                  code: 1,
                  msg: 'invalid code'
                }
              });
            } else if (jsonData.errcode === -1) {
              res.json({
                user: {
                  code: 1,
                  msg: 'server busy'
                }
              });
            } else {
              res.json({
                user: {
                  code: jsonData.errcode,
                  msg: jsonData.errMsg
                }
              });
            }
          } else {
            res.json({
              error: {
                id: jsonData.openid,
                token: jsonData.session_key
              }
            });
          }
        });
      } else {
        res.json({
          user: {
            code: 3,
            msg: 'network error, status = ' + response.statusCode
          }
        });
      }
    }).on('error', function (e) {
      res.json({
        user: {
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

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
