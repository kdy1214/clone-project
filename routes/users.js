/* routes 폴더 안에 라우터 처리를 위한 파일만 모아 놓음 */
// 사용자 관련 라우터를 처리하고 비즈니스 로직을 만듦

const express = require("express");
const User = require("../models/User");
const passport = require("passport");
const multer = require("multer"); // 텍스트가 아닌 이미지, 동영상 파일 데이터 처리하기 위한
const cloudinary = require("cloudinary"); // 이 모듈 사용해서 파일 저장
const router = express.Router();

/* Multer 설정 */
// 텍스트 정보를 저장하는 body 객체와 멀티파트 데이터를 저장하는 file 객체 -> req 객체에 추가
const storage = multer.diskStorage({ // 저장경로와 파일명 처리
    filename: (req, file, callback) => { // 파일명만 설정
        callback(null, Date.now() + file.originalname); // 함수의 인자인 callback을 통해 전송된 파일명 설정
    }
});

// 확장자 확인
const imageFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) { // 확장자가 올바르지 않을 경우
        return callback(new Error("Only image files are allowed!"), false); // 오류 객체를 담은 콜백 함수 반환
    }
    callback(null, true);
};

// upload 변수에 multer의 인스턴스 생성
const upload = multer({ storage: storage, fileFilter: imageFilter });
// 인자로 넘긴 옵션 : storage(파일이 저장될 위치), fileFilter(어떤 파일 허용할지 제어) 그 외 옵션은 공식 문서 참고

/* Cloudinary setup 설정, 홈페이지에 들어가 이름, 키, 암호 확인 */
cloudinary.config({ // 이미지를 업로드하고 불러올 공간을 빌리기 위해 SaaS서비스인 cloudinary 사용
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/* 미들웨어 */
// 로그인 하지 않은 사용자를 체크하는 미들웨어 부분
// => 필요한 라우터에 인자로 넣어서, 로그인이 필요한 동작을 할 경우 로그인 했는지 확인하는 역할 할 예정
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) { // 로그인 하지 않은 사용자라면
        return next();
    }
    req.flash("error", "You need to be logged in to do that!"); // flash로 오류 메시지를 보내고
    res.redirect("/user/login"); // 로그인 화면으로 리다이렉트 해줌
};



/* Routers 라우터 */

/* 여기서 부터는 User Routers 유저 라우터 */
// 회원 가입을 위한 /user/register 라우터
router.post("/user/register", upload.single("image"), (req, res) => {
    if ( // 회원 가입을 통해서 들어온 req.body 객체의 username 등을 받고!
        req.body.username &&
        req.body.firstname &&
        req.body.lastname &&
        req.body.password
    ) {
        let newUser = new User({ // newUser 객체에 넣어줌
            username: req.body.username,
            firstName: req.body.firstname,
            lastName: req.body.lastname
        });
        if (req.file) { // 처음 회원가입 할 때 프로필 이미지를 받고, multer를 통해 req.file에 설정
            cloudinary.uploader.upload(req.file.path, result => { // cloudinary를 이용해 파일 업로드,
                newUser.profile = result.secure_url; // 사용자 프로필 설정
                return createUser(newUser, req.body.password, req, res); // createUser()함수로 사용자 인스턴스 생성
            });
        } else { // 만약 프로필 사진이 없다면
            newUser.profile = process.env.DEFAULT_PROFILE_PIC; // DEFAULT_을 프로필 사진으로 지정
            return createUser(newUser, req.body.password, req, res);
        }
    }
});

// createUser() 함수 생성
function createUser(newUser, password, req, res) { // /user/register 라우터에서 받은 newUser, 비밀번호를 인자로 받아 
    User.register(newUser, password, (err, user) => { // User 모델에 넣고
        if (err) {
            req.flash("error", err.message);
            res.redirect("/");
        } else {
            passport.authenticate("local")(req, res, function () { // passport를 통해 authenticate()로 인증을 수행
                console.log(req.user);
                req.flash( // 오류메시지는 connect-flash 모듈의 flash()를 통해 보내주게 됨
                    "success",
                    "Success! You are registered and logged in!"
                );
                res.redirect("/");
            });
        }
    });
}



// Login
router.get("/user/login", (req, res) => { // get 방식을 통해
    res.render("users/login"); // views/users/login.ejs 파일을 렌더링 해주고
});

router.post( // post 방식을 통해 
    "/user/login",
    passport.authenticate("local", { // passport 인증을 수행합니다
        successRedirect: "/", // 성공할 경우 / 페이지로
        failureRedirect: "/user/login" // 실패할 경우 다시 로그인 화면을 띄움
    }),
    (req, res) => { }
);

// All users 로그인한 모든 사용자를 보여줌
router.get("/user/all", isLoggedIn, (req, res) => {
    User.find({}, (err, users) => { // 모든 사용자를 .find()함수를 통해 조회
        if (err) {
            console.log(err);
            req.flash(
                "error",
                "There has been a problem getting all users info."
            );
            res.redirect("/");
        } else {
            res.render("users/users", { users: users }); // views/users/users.ejs에 users 객체를 보내주고 렌더링 해줌
        }
    });
});

// Logout passport가 req 객체에 logout() 메소드를 만들어주고 이를 이용하면 됨
router.get("/user/logout", (req, res) => {
    req.logout(() => {
        res.redirect("back");
    })
});

// User Profile 사용자의 프로필을 생성하는 역할
router.get("/user/:id/profile", isLoggedIn, (req, res) => {
    User.findById(req.params.id) // req.params 객체에 있는 id를 통해 현재 사용자를 조회하고,
        .populate("friends") // 몽구스의 populate() 메소드를 통해 friends, friendRequests, post 필드의 document를 조회
        .populate("friendRequests") // populate() : document가 다른 document의 objectID를 사용할 경우
        .populate("posts") // -> 실제 객체가 어떤 것인지 찾아서 바꿔주는 역할, 이를 위해 매핑함
        .exec((err, user) => { // exex()를 통해 user를 콜백으로 넘겨주고,
            if (err) {
                console.log(err);
                req.flash("error", "There has been an error.");
                res.redirect("back");
            } else {
                console.log(user);
                res.render("users/user", { userData: user }); // 이를 views/users/user.ejs 화면에서 받아 렌더링 할수있게 함
            }
        });
});

// Add Friend 친구 추가 기능을 하는 라우터
router.get("/user/:id/add", isLoggedIn, (req, res) => { // :id부분이 req.params로 들어오고,
    User.findById(req.user._id, (err, user) => {
        if (err) {
            console.log(err);
            req.flash(
                "error",
                "There has been an error adding this person to your friends list"
            );
            res.redirect("back");
        } else {
            User.findById(req.params.id, (err, foundUser) => { // 들어온 id 값을 이용해서 사용자를 찾고
                if (err) {
                    console.log(err);
                    req.flash("error", "Person not found"); // 사용자를 찾을 수 없는 경우
                    res.redirect("back");
                } else {
                    if ( // 여러 경우를 if/else 분기 처리를 통해 처리, 총 3가지 경우
                        foundUser.friendRequests.find(o =>
                            o._id.equals(user._id)
                        )
                    ) {
                        req.flash(
                            "error",
                            `You have already sent a friend request to ${user.firstName
                            }` // 이미 친구 추가 요청을 보낸 경우
                        );
                        return res.redirect("back");
                    } else if ( 
                        foundUser.friends.find(o => o._id.equals(user._id))
                    ) {
                        req.flash(
                            "error",
                            `The user ${foundUser.firstname
                            } is already in your friends list` // 이미 친구인 경우
                        );
                        return res.redirect("back");
                    }
                    let currUser = {
                        _id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName
                    };
                    foundUser.friendRequests.push(currUser); // 조건에 맞는 경우, 요청을 보낸 친구 foundUser를 friendRequests에 추가
                    foundUser.save();
                    req.flash(
                        "success",
                        `Success! You sent ${foundUser.firstName
                        } a friend request!`
                    );
                    res.redirect("back");
                }
            });
        }
    });
});

// Accept friend request 요청 받은, 친구 추가 요청을 사용자가 수락하는 부분을 다룬 라우터
// 마찬가지로 findById() 메소드로 요청한 친구의 id를 User Collection에서 조회하고,
// 해당 사용자의 friends 키 값에 추가한 친구를 업데이트 함
router.get("/user/:id/accept", isLoggedIn, (req, res) => {
    User.findById(req.user._id, (err, user) => {
        if (err) {
            console.log(err);
            req.flash(
                "error",
                "There has been an error finding your profile, are you connected?"
            );
            res.redirect("back");
        } else {
            User.findById(req.params.id, (err, foundUser) => {
                let r = user.friendRequests.find(o =>
                    o._id.equals(req.params.id)
                );
                if (r) {
                    let index = user.friendRequests.indexOf(r);
                    user.friendRequests.splice(index, 1);
                    let friend = {
                        _id: foundUser._id,
                        firstName: foundUser.firstName,
                        lastName: foundUser.lastName
                    };
                    user.friends.push(friend);
                    user.save();

                    let currUser = {
                        _id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName
                    };
                    foundUser.friends.push(currUser);
                    foundUser.save();
                    req.flash(
                        "success",
                        `You and ${foundUser.firstName} are now friends!`
                    );
                    res.redirect("back");
                } else {
                    req.flash(
                        "error",
                        "There has been an error, is the profile you are trying to add on your requests?"
                    );
                    res.redirect("back");
                }
            });
        }
    });
});

// Decline friend Request 친구 추가 요청을 거절하는 부분을 다룬 라우터
// req.params로 들어온 id 값을 이용해 사용자를 찾고,
router.get("/user/:id/decline", isLoggedIn, (req, res) => {
    User.findById(req.user._id, (err, user) => {
        if (err) {
            console.log(err);
            req.flash("error", "There has been an error declining the request");
            res.redirect("back");
        } else {
            User.findById(req.params.id, (err, foundUser) => {
                if (err) {
                    console.log(err);
                    req.flash(
                        "error",
                        "There has been an error declining the request"
                    );
                    res.redirect("back");
                } else {
                    // remove request
                    let r = user.friendRequests.find(o =>
                        o._id.equals(foundUser._id)
                    );
                    if (r) { // user의 friendRequests를 삭제해서 해당 요청을 거절함
                        let index = user.friendRequests.indexOf(r);
                        user.friendRequests.splice(index, 1);
                        user.save();
                        req.flash("success", "You declined");
                        res.redirect("back");
                    }
                }
            });
        }
    });
});

/* Chat Routers 채팅창의 로직을 구현하는 부분 */
router.get("/chat", isLoggedIn, (req, res) => {
    User.findById(req.user._id) // User 컬렉션에서 user를 찾고
        .populate("friends") // 해당 user의 friends 값을 populate()를 통해 접근하고
        .exec((err, user) => {
            if (err) {
                console.log(err);
                req.flash(
                    "error",
                    "There has been an error trying to access the chat"
                );
                res.redirect("/");
            } else {
                res.render("users/chat", { userData: user }); // 가져온 데이터를 views/users/chat.ejs에 보내주고 렌더링 함
            }
        });
});

module.exports = router; // 끝으로 이렇게 작성한 모든 라우터를 module.exports를 통해 app.js에서 사용할 수 있게 하자