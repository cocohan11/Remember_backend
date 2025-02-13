/** 회원정보 처리 API */
const express = require('express');
const router = express.Router();
const userMngDB = require('../services/userMng');
const resCode = require('../util/resCode');
const jwt = require('jsonwebtoken');
const logger = require("../winston/logger");
const multerMid = require('../util/multerMid');
const dbPool = require('../util/dbPool');
const util = require('util');

let message;
/** RESTful API 엔드포인트
 * 명사 사용
 * 복수형 사용
 * 계층적 구조
 * 소문자 사용
 * 명확성
 */
// TODO 로그인 유지 - jwt 토큰
// TODO SNS로그인 프론트에서 SNS API로 요청하는지 확인하기/ 백엔드에서 DB저장만 하면 되는지 확인하기
// TODO 필요한 파라미터 API마다 기입하기 (후순위)


/** 마이페이지 유저프사 수정 API */
const uploadForUser = multerMid('profile/user'); // 유저프사 (1장)
router.post('/mypage/change/img', uploadForUser.single('user_prof_img'), async (req, res) => { // 사진저장 미들웨어

    // API 정보
    const apiName = '마이페이지 유저 프로필사진 수정 API';
    logger.http({
        API: apiName,
        reqBody: req.body,
        reqFile: req.file
    });
  
    // 파라미터값 누락 확인
    if (!req.file || !req.body.user_email) { // 사진 필수
      return resCode.returnResponseCode(res, 1002, apiName, null, null);
    } 
  
    // DB
    const result = await userMngDB.setUserImg(req.body, req.file ? req.file.location : null, apiName); // .location에서 에러나서 null처리함
    logger.info({
        API: apiName,
        result: result
    }); // 성공시) result=2000 응답
  
    // response
    if (result == 2000) {
      const plusResult = { user_prof_img: req.file.location }; // 원하는 출력 모양을 추가함
      return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
    } else {
      return resCode.returnResponseCode(res, result, apiName, null, null);
    }
  
})

/** 마이페이지 이름 수정 API */
// Params : user_email, user_name
router.post('/mypage/change/name', async (req, res) => {
    const apiName = '마이페이지 유저 정보 수정 API';
    logger.http({
        API: apiName,
        reqBody: req.body
    });


    // 파라미터 누락 확인
    if (!req.body.user_name || !req.body.user_email) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }
    // DB
    const user = await userMngDB.setUserName(req.body, apiName);
    logger.info({
        API: apiName,
        user: user
    });

    // response
    if (user && user != 1005 && user != 9999) {
        return resCode.returnResponseCode(res, 2000, apiName, null, null); // 성공시 응답받는 곳
    } else if (user == 1005) {
        return resCode.returnResponseCode(res, 1005, apiName, null, null); // 실패(중복)시 응답받는 곳
    } else {
        return resCode.returnResponseCode(res, 9999, apiName, null, null);
    }
});

/** 회원 정보 조회 API */
// router.use('/info/:user_email?', userMngDB.authMiddleware);
router.get('/info/:user_email?', async (req, res) => {
    // API 정보
    const apiName = '회원 정보 조회 API';
    logger.http({
        API: apiName,
        reqBody: req.body
    });

  // DB
  const user = await userMngDB.getUser(req.params, apiName); 
  logger.info({
    API: apiName,
    user: user
  });  

  // response
  if (user && user!=1005 && user!=9999) {
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', user); // 성공시 응답받는 곳
  } else if (user == 1005) {
    return resCode.returnResponseCode(res, 1005, apiName, null, null); // 실패(중복)시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, 9999, apiName, null, null);
  }

})


/** SNS 회원탈퇴(구글) API */
router.post('/leave/sns/google', async (req, res) => {
    // 로그인 중인 상태에서 요청이 들어옴

    // API 정보
    const apiName = 'SNS 회원탈퇴(구글) API';
    logger.http({
        API: apiName,
        reqBody: req.body
    });


    // 파라미터값 누락 확인
    if (!req.body.user_email) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null); //
    }

    // DB
    const result = await userMngDB.leaveUserForGoogle(req.body, apiName);
    logger.info({
        API: apiName,
        result: result
    });
    // response
    if (result == 9999) {
        return resCode.returnResponseCode(res, 9999, apiName, null, null);
    } else if (result == 1005) {
        return resCode.returnResponseCode(res, 1005, apiName, null, null); // O
    } else {
        resCode.returnResponseCode(res, 2000, apiName, null, null); // 성공시 응답받는 곳
    }
});

/** SNS 회원탈퇴(카카오, 네이버) API */
router.post('/leave/sns', async (req, res) => {
    // API 정보
    const apiName = 'SNS 회원탈퇴 API';
    logger.http({
        API: apiName,
        reqBody: req.body
    });

    // 파라미터값 누락 확인
    if (!req.body.login_sns_type || !req.body.user_email) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    try {
        // DB에 SNS 회원가입 정보 추가
        const snsId = await userMngDB.leaveSns(req.body, apiName);
        logger.info({
            API: apiName,
            snsId: snsId
        }); 
        if (snsId) {
            return resCode.returnResponseCode(res, 2000, apiName, null, null);
        } else {
            return resCode.returnResponseCode(res, 9999, apiName, null, null);
        }
    } catch (error) {
        logger.error({
            API: apiName,
            error: error
        });
        return resCode.returnResponseCode(res, 9999, apiName, null, null);
    }
});

/** SNS 로그아웃(카카오, 네이버) API */
router.post('/logout/sns', async (req, res) => {
    // API 정보
    const apiName = 'SNS 로그아웃 API';
    logger.http({
        API: apiName,
        reqBody: req.body
    });


    // 파라미터값 누락 확인
    if (!req.body.login_sns_type || !req.body.user_email) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    try {
        // DB에 SNS 회원가입 정보 추가
        const snsId = await userMngDB.logoutSns(req.body, apiName);
        logger.info({
            API: apiName,
            snsId: snsId
        });
        if (snsId) {
            return resCode.returnResponseCode(res, 2000, apiName, null, null);
        } else {
            return resCode.returnResponseCode(res, 9999, apiName, null, null);
        }
    } catch (error) {
        logger.error({
            API: apiName,
            error: error
        });
        return resCode.returnResponseCode(res, 9999, apiName, null, null);
    }
});

/** SNS 로그인/회원가입(구글) API */
router.post('/join/sns/google', async (req, res) => {
    // API 정보
    const apiName = '로그인/회원가입(구글) API';
    logger.http({
        API: apiName,
        reqBody: req.body
    });


    // 파라미터값 누락 확인
    if (!req.body.user_id || !req.body.user_email|| !req.body.user_name|| !req.body.user_profile|| !req.body.login_sns_type) { // user_id: 구글 id
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    try {
        // DB에 SNS 회원가입 정보 추가
        const user = await userMngDB.addSnsUser(req.body, apiName);
        logger.info({
            API: apiName,
            user: user
        });
        if (user === 9999) return resCode.returnResponseCode(res, 9999, apiName, null, null);


        // 동기적으로 실행하고 싶은 코드
        const tokens = await userMngDB.signJWT(user);
        logger.info({
            API: apiName,
            tokens: tokens
        });
        if (tokens) {
            const plusResult = {
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                userInfo: user,
            };
            logger.info({
                API: apiName,
                plusResultisthat: plusResult
            });
            return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult);
        } else {
            return resCode.returnResponseCode(res, 9999, apiName, null, null);
        }
    } catch (error) {
        logger.error({
            API: apiName,
            error: error
        });
        return resCode.returnResponseCode(res, 9999, apiName, null, null);
    }
});

/** SNS 로그인/회원가입(카카오, 네이버) API */
router.post('/join/sns', async (req, res) => {
    // API 정보
    const apiName = 'SNS 회원가입/로그인 API';
    logger.http({
        'API': apiName,
        reqBody: req.body
    });


    // 파라미터값 누락 확인
    if (!req.body.login_sns_type || !req.body.code) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    try {
        // DB에 SNS 회원가입 정보 추가
        const user = await userMngDB.addSnsUser(req.body, apiName);
        logger.info({
            API: apiName,
            user: user
        });
        if (user === 9999) return resCode.returnResponseCode(res, 9999, apiName, null, null);


        // 동기적으로 실행하고 싶은 코드
        const tokens = await userMngDB.signJWT(user);
        logger.info({
            API: apiName,
            tokens: tokens
        });
        if (tokens) {
            const plusResult = {
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                userInfo: user,
            };
            logger.info({
                API: apiName,
                plusResultisthat: plusResult
            });
            return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult);
        } else {
            return resCode.returnResponseCode(res, 9999, apiName, null, null);
        }
    } catch (error) {
        logger.error({
            API: apiName,
            error: error
        });
        return resCode.returnResponseCode(res, 9999, apiName, null, null);
    }
});


/** 일반회원탈퇴 API */
// router.use('/leave', userMngDB.authMiddleware);
router.post('/leave', async (req, res) => {
    // 로그인 중인 상태에서 요청이 들어옴

    // API 정보
    const apiName = '일반회원탈퇴 API';
    logger.http({
        API: apiName,
        reqBody: req.body
    });


    // 파라미터값 누락 확인
    if (!req.body.user_email || !req.body.user_pw) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null); //
    }

    // DB
    const result = await userMngDB.leaveUser(req.body, apiName);
    logger.info({
        API: apiName,
        result: result
    });
    // response
    resCode.returnResponseCode(res, result, apiName, null, null); // 성공시 응답받는 곳
});

/** (비로그인) 비밀번호 임시발급 API */
router.post('/tempPassword', async (req, res) => {
    // 비로그인 중인 상태에서 요청이 들어옴

    // API 정보
    const apiName = '비밀번호 임시발급 API';
    logger.http({
        'API': apiName,
        reqBody: req.body
    });


    // 파라미터값 누락 확인
    if (!req.body.user_email) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null); //
    }

    // DB
    const result = await userMngDB.tempPassword(req.body, apiName);
    logger.info({
        API: apiName,
        result: result
    });
    // response
    if (result == 9999) {
        return resCode.returnResponseCode(res, 9999, apiName, null, null);
    } else if (result == 1005) {
        return resCode.returnResponseCode(res, 1005, apiName, null, null);
    } else if (result == 2009) {
        return resCode.returnResponseCode(res, 2009, apiName, null, null); // 실패시 응답받는 곳
    } else {
        resCode.returnResponseCode(res, 2000, apiName, null, null); // 성공시 응답받는 곳
    }
});

/** (로그인) 비밀번호 변경 API */
router.use('/changePassword', userMngDB.authMiddleware);
router.post('/changePassword', async (req, res) => {
    // 로그인 중인 상태에서 요청이 들어옴

    // API 정보
    const apiName = '비밀번호 변경 API';
    logger.http({
        'API': apiName,
        reqBody: req.body
    });


    // 파라미터값 누락 확인
    if (!req.body.user_email || !req.body.user_pw) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null); //
    }

    // DB
    const result = await userMngDB.changePassword(req.body, apiName);
    logger.info({
        API: apiName,
        result: result
    });
    // response
    if (result == 9999) {
        return resCode.returnResponseCode(res, 9999, apiName, null, null);
    } else if (result == 1005) {
        return resCode.returnResponseCode(res, 1005, apiName, null, null); // O
    } else {
        resCode.returnResponseCode(res, 2000, apiName, null, null); // 성공시 응답받는 곳
    }
});

/** 이메일 인증 API */
router.post('/email', async (req, res) => {
    // API 정보
    const apiName = '이메일 인증 API';
    logger.http({
        'API': apiName,
        reqBody: req.body
    });


    // 파라미터값 누락 확인
    if (!req.body.user_email) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null); //
    }

    // DB
    const emailVerificationCode = await userMngDB.sendEmail(req.body, apiName);
    logger.info({
        API: apiName,
        emailVerificationCode: emailVerificationCode
    });
    // response
    if (emailVerificationCode == 9999) {
        return resCode.returnResponseCode(res, 9999, apiName, null, null);
    } else if (emailVerificationCode == 1005) {
        return resCode.returnResponseCode(res, 1005, apiName, null, null); // X
    } else {
        const plusResult = { VerificationCode: emailVerificationCode }; // 원하는 출력 모양을 추가함
        resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
    }
});

/** (JWT발급) 일반회원 로그인 API */
router.post('/login', async (req, res) => {

    // API 정보
    const apiName = '일반회원 로그인 API';
    logger.http({
        'API': apiName,
        reqBody: req.body
    });

    
    // 파라미터값 누락 확인
    if (!req.body.user_email || !req.body.user_pw) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null); //O
    } 

    // DB
    const user = await userMngDB.loginUser(req.body, apiName); 
    logger.info({
        API: apiName,
        user: user
    });
    if (user != 9999 && user != 2009) { // 회원정보 일치한다면
        const tokens = await userMngDB.signJWT(user);
        logger.info({
            API: apiName,
            tokens: tokens
        });
        if (tokens) {
            const plusResult = { // 원하는 출력 모양을 추가함
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                userInfo: user
            };
            return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳 
        } else {
            return resCode.returnResponseCode(res, 9999, apiName, null, null);
        }
    } else {
        // response
        if (user == 2009) {
            return resCode.returnResponseCode(res, 2009, apiName, null, "로그인 실패했습니다.");
        } else {
            // response
            if (user == 1005) {
                return resCode.returnResponseCode(res, 1005, apiName, null, '로그인 실패했습니다.'); // 로그인 실패 /O
            } else {
                return resCode.returnResponseCode(res, 9999, apiName, null, null);
            }
        }
    }
});

/** 일반 회원가입 API */
router.post('/join', async (req, res) => {

    // API 정보
    const apiName = '일반 회원가입 API';
    logger.http({
        'API': apiName,
        reqBody: req.body
    });

   
    // 파라미터값 누락 확인
    if (!req.body.user_email || !req.body.user_pw) {
      return resCode.returnResponseCode(res, 1002, apiName, null, null);
    } 
  
    // DB
    const user = await userMngDB.addUser(req.body, apiName); 
    logger.info({
        API: apiName,
        user: user
    });
    // response
    if (user == 2000) {
      // 성공시 응답받는 곳
      return resCode.returnResponseCode(res, 2000, apiName, null, null);
    } else if (user == 1005) {
      return resCode.returnResponseCode(res, 1005, apiName, null, null);
    } else {
      return resCode.returnResponseCode(res, 9999, apiName, null, null);
    }
  
})
  

/** accessToken 재발급 API */
router.post('/auth/accessToken', async (req, res) => { // refreshToken으로 재발급

    // API 정보
    const apiName = 'accessToken 재발급 API';
    const refreshToken = req.headers['refresh'] // 프론트에서 요청헤더에 담아서 보냄
    logger.info({
        API: apiName,
        refreshToken: refreshToken
    });
    
    // 파라미터값 누락 확인
    if (!refreshToken) {
    logger.info('refreshToken %o:' + refreshToken);
    return resCode.returnResponseCode(res, 3002, apiName, null, null);
    } 

    // DB
    const data = await userMngDB.RenewalAccessToken(refreshToken, apiName); 
    logger.info({
        API: apiName,
        data: data
    });
    // response
    if (data == 3009 || data == undefined) {
    return resCode.returnResponseCode(res, 3009, apiName, null, null);
    } else if (data == 1005) {
    return resCode.returnResponseCode(res, 1005, apiName, null, null);
    } else {
    // 성공시 응답받는 곳
    const plusResult = data; // 원하는 출력 모양을 추가함
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult);
    }

})

// test
router.post('/auth/accessToken/:email?', async (req, res) => { // refreshToken으로 재발급
  
  const apiName = 'accessToken 재발급 API';
  try {
    const token = req.headers['refresh'] || req.query.token // 프론트에서 요청헤더에 담아서 보냄
    logger.info({
        API: apiName,
        refreshToken: token,
        jwtDecode: jwt.decode(token)
    });

    jwt.verify(token, "refreshsecret", (error, decoded) => {
        logger.info({
            API: apiName,
            jwt: 'verify'
        }); 
        if (error) {
            logger.error({
                API: apiName,
                error: error
            });
          res.json("refreshToken fail", error);
        } else {
          // 액세스 토큰의 페이로드에서 사용자정보 가져오기
          const userInfo = jwt.decode(token);
      
          // 토큰 발급
          if (!token) { 
            logger.info({
                API: apiName,
                token: null
            }); 
            res.json("refreshToken fail");
          } else {
            // accessToken 새로 발급
            const accessToken = jwt.sign({
              user_id: userInfo.user_id,
              user_name: userInfo.user_name,
              user_email: userInfo.user_email,
            }, "accesssecret", {
              expiresIn: '1m',
              issuer : 'About Tech han.. new accessToken',
            });

            // 토큰 전달하기
            logger.info({
                API: apiName,
                accessToken: accessToken
            }); 
              
            res.setHeader('Access-Control-Allow-Credentials', 'true'); 
            res.status(200).json(
              {
                "data": {
                  accessToken, userInfo
                }, "message": "ok"
              })
          }
        }
    })
  } catch (error) {
    // res.status(200).json(data);
  }
})

// ---------------------- TEST -----------------------


const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
require("aws-sdk/lib/maintenance_mode_message").suppress = true;
// const s3 = new AWS.S3();
const path = require('path');

let s3 = new S3Client({
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_ID,
    secretAccessKey: process.env.AWS_S3_ACCESS_KEY,
  },
  sslEnabled: false,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const upload = multer({  
  storage: multerS3({       
    s3: s3,
    bucket: 'rb2web-rembridge',
    key: function (req, file, cb) {
      cb(null, `original/${Date.now()}${path.basename(file.originalname)}`);
    },
    ContentType: multerS3.AUTO_CONTENT_TYPE, // contentType 자동 설정
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// test img API
router.post('/img', upload.single('img'), (req, res) => {
    logger.http({
        'API': apiName,
        reqBody: req.body,
        reqFile: req.file
    });
  res.json({ url: req.file.location });
});

//test API
router.get('/test', async (req, res) => {
    logger.info('test');

    const sql = `select * from USER`;
    const dbPool = require('../util/dbPool');
    const connection = dbPool.init();

    connection.query(sql, (err, rows) => {
        if (err) {
            // logger.error(`샘플 에러: \n${JSON.stringify(err, null, 2)}`);
        } else {
            message = '회원가입에 성공했습니다.';
        }

        res.json({
            message: 'this is test',
        });
    });
});
// test) check_token API
router.get('/test/check_token', (req, res) => {
    let token = req.headers['token'];
    try {
        let payload = jwt.verify(token, 'our_secret');
        logger.info('토큰 인증 성공' + payload);
        res.json({ msg: 'success' });
    } catch (err) {
        logger.error('인증 에러');
        res.status(405).json({ msg: 'error' });
        next(err);
    }
});
// test) sign_token API
router.get('/test/sign_token', (req, res) => {
    let token = jwt.sign({ name: 'sancho', exp: parseInt(Date.now() / 1000) + 10 }, 'our_secret'); // 만료기간 10초
    res.json({ token });
});
// test) verifyToken API
router.get('/test/verifyToken', async (req, res) => {
    logger.info('verifyToken API');
    const token = jwt.sign({ email: 'test@user.com' }, 'our_secret', {
        expiresIn: '1s',
    });
    await new Promise((r) => setTimeout(r, 100));
    const verified = jwt.verify(token, 'our_secret');
    if (verified) {
        logger.info('verified');
    } else {
        logger.info('!verified'); // 여기로 안 들어오고 에러가 나버리네
    }
    // logger.info(verified);
});
// test) refreshToken로 액세스토큰 재발급 API
router.get('/test/refreshToken/:email?', async (req, res) => {
    logger.info('refreshToken API');
    try {
        const token = req.headers['refresh'] || req.query.token; // 프론트에서 요청헤더에 담아서 보냄
        // const token = req.cookies.refreshToken; // 브라우저에 저장된 토큰에서 토큰값가져오기
        logger.info('refreshToken is.. ' + token);
        logger.info('jwt.decode(token) %o:' + jwt.decode(token));

        jwt.verify(token, 'refreshsecret', (error, decoded) => {
            logger.info(`jwt.verify`);
            if (error) {
                logger.info(`에러가 났습니다\n ${error}`);
                res.json('refreshToken fail', error);
            } else {
                // 액세스 토큰의 페이로드에서 사용자정보 가져오기
                const userInfo = jwt.decode(token);

                // 토큰 발급
                if (!token) {
                    logger.info('!rows');
                    res.json('refreshToken fail');
                } else {
                    logger.info('rows');

                    // accessToken 새로 발급
                    const accessToken = jwt.sign(
                        {
                            user_id: userInfo.user_id,
                            user_name: userInfo.user_name,
                            user_email: userInfo.user_email,
                        },
                        'accesssecret',
                        {
                            expiresIn: '1m',
                            issuer: 'About Tech han.. new accessToken',
                        }
                    );

                    // 토큰 전달하기
                    logger.info('dddd.. ' + accessToken);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                    res.status(200).json({
                        data: {
                            accessToken,
                            userInfo,
                        },
                        message: 'ok',
                    });
                }
            }
        });
    } catch (error) {
        // res.status(200).json(data);
    }
});
// test) accessToken 확인하는 API
router.get('/test/accessToken/:email?', async (req, res) => {
    logger.info('accessToken API');
    try {
        const token = req.headers['access'] || req.query.token; // 프론트에서 요청헤더에 담아서 보냄
        // const token = req.cookies.accessToken; // 브라우저에 저장된 토큰에서 토큰값가져오기
        logger.info(token);
        jwt.verify(token, 'accesssecret', (error, decoded) => {
            if (error) {
                logger.info(`에러가 났습니다\n ${error}`);
                res.json(`accessToken fail... ${error}`);
            } else {
                logger.info(decoded);
                res.status(200).json({
                    data: decoded,
                    message: 'ok',
                });
            }
        });
    } catch (error) {
        // res.status(200).json(data);
    }
});
// test) token 발급 API -> API생성 완료
router.get('/test/token/:email?', async (req, res) => {
    logger.info('token API')
    const email = req.params.email;
    logger.info("test/token");
    logger.info(email);
    const sql = `select * from USER where user_email = '${email}'`;
    const dbPool = require('../util/dbPool');
    const connection = dbPool.init();
  
    connection.query(sql, (err, rows) => {
      if (err) {
        logger.info(`샘플 에러: \n${JSON.stringify(err, null, 2)}`);
      } else { 
        message = 'token tests API';
        logger.info(rows);
        let userInfo = rows[0];

        // 토큰 발급
        if (!userInfo.user_id) { 
          logger.info('!rows');

          res.json("login fail");
        } else {
          logger.info('rows'); // 이메일 존재한다면(실제로는 비번까지 일치한다면) 토큰 발급
          try {
            // accessToken 발급
            logger.info(userInfo.user_id);
            logger.info(userInfo.user_email);
            const accessToken = jwt.sign({
              user_id: userInfo.user_id,
              user_name: userInfo.user_name,
              user_email: userInfo.user_email,
            }, process.env.JWT_ACCESS_TOKEN_KEY, {
              expiresIn: '5m',
              issuer : 'About Tech han2',
            });
            // refresh Token 발급
            const refreshToken = jwt.sign({
              user_id: userInfo.user_id,
              user_name: userInfo.user_name,
              user_email: userInfo.user_email,
            }, process.env.JWT_REFRESH_TOKEN_KEY, {
              expiresIn: '10m',
              issuer : 'About Tech han2',
            });

            // token 전송
            // res.cookie("accessToken", accessToken, {
            //   secure: false,
            //   httpOnly : true,
            //   sameSite: 'none',
            // })
            // res.cookie("refreshToken", refreshToken, {
            //   secure: false,
            //   httpOnly : true,
            //   sameSite: 'none',
            // })
            res.setHeader('Access-Control-Allow-Credentials', 'true'); 
            // // 응답메세지
            // res.json("han - accessToken, refreshToken success");

            // 토큰 전달하기
            res.cookie('refreshToken', refreshToken, {
              sameSite: 'none',
              httpOnly: true,
              secure: true,
            }).status(200).json(
              {
                "data": {
                  accessToken, refreshToken, userInfo
                }, "message": "ok"
              })

          } catch {

          }
        }
        
      }
      
      // res.json({
      //   'message': message
      // });

    })
})
router.get('/test/transaction', async (req, res, next) => {
  
    const mysql = require('mysql')
    require("dotenv").config();
    const { DB_HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_PORT } = process.env;
    const connection = mysql.createConnection({
        host: DB_HOSTNAME,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_DATABASE,
        port: DB_PORT, 
    })
    connection.connect()
    connection.beginTransaction((err)=>{
        connection.query(
            `INSERT INTO USER
                (user_email) 
                VALUES (?)`,
            ['khe@']
            , function (error, results, fields) {
            if (error) throw error;
            console.log(results)
                connection.query('delete..',(err, result, fields)=>{
                    if (err){
                        console.log('에러 rollback', err)
                        connection.rollback();
                    } else{
                        console.log('에러 아님 commit', err)
                        connection.commit()
                    }
                        console.log('에러 아님 end', err)
                        connection.end()
            })
        
        })
    })
});


/** 
 * @date - 23.12.22
 * @author - wkimdev
 * @desc - API 20번. 안드로이드 앱 SNS 회원가입/로그인 API
 *  -  res는 Express.js의 라우트 핸들러에 전달되는 두 번째 매개변수로, "response" 객체를 나타냅니다.
 */
router.post('/app/join/sns', async (req, res) => {
    // API 정보
    const apiName = '안드로이드 앱 SNS 회원가입/로그인 API';
    logger.http({
        'API': apiName,
        reqBody: req.body
    });
   
    // 파라미터값 누락 확인
    //params: [query.user_email, query.user_name, query.login_sns_type, query.sns_id],
    if (!req.body.user_email || !req.body.user_name || !req.body.login_sns_type || !req.body.sns_id) {
      return resCode.returnResponseCode(res, 1002, apiName, null, null);
    } 
  
    // DB 로직 처리, 코드값만 응답처리하면 된다.
    const result = await userMngDB.addUserOrLogin(req.body, apiName);
    
    logger.info({
        API: apiName,
        result
    });
    
    // response 성공시 응답처리
    // 2000: 성공, 객체를 같이 응답시켜야 되는데... 
    // 1001: 인증실패
    // 1005: 빈값일때 응답값
    if (result.responseCode == 2000) {
        const plusResult = {
            userInfo: result.userInfo,
        };
      return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult);
    } else if (result.responseCode == 1005) {
      return resCode.returnResponseCode(res, 1005, apiName, null, null);
    } else {
      return resCode.returnResponseCode(res, 9999, apiName, null, null);
    }
  
})


module.exports = router;

