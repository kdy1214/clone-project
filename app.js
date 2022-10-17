/* public, views 폴더는 ejs파일들 (프론트엔드) */
/* models 폴더 안에 세 가지의 데이터 모델 User, Post, Comment를 생성 */
// 데이터 모델 스키마를 생성하는 부분은 models/에
// 라우터들을 관리하는 파일은 routes/에
// 화면 관련 파일은 views/에
// 정적 파일 관리하는 파일들은 public/에

// 모듈 불러오기
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cookieParser = require('cookie-parser');
const passport = require("passport");
const LocalStrategy = require("passport-local");
const socket = require("socket.io");
const dotenv = require("dotenv");
const flash = require("connect-flash");
const Post = require("./models/Post");
const User = require("./models/User");

const port = process.env.PORT || 3000;
const onlineChatUsers = {}; // 채팅 기능을 위해서 user의 정보를 담을 객체 변수 할당

dotenv.config(); // dotenv를 통해 .env파일의 변수를 process.env를 통해 사용할 수 있게 해주는 config()호출

// 라우터를 분리해줌
const postRoutes = require("./routes/posts"); // 게시판 라우터
const userRoutes = require("./routes/users"); // 사용자 라우터

const app = express(); // express 호출

// 설정을 통해 이제부터 ejs를 사용해 view를 구성할 것이라는 것을 알려줌
app.set("view engine", "ejs");


/* 미들웨어 */
// connect-flash는 쿠키파서와 세션을 내부적으로 사용
app.use(cookieParser(process.env.SECRET)) // .env 비밀키 생성
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
})
);
app.use(flash()); // req 객체에 req.flash 프로퍼티 생성, req.flash(key, value) 형태로 키에 매칭된 값 설정

/* Passport 설정 */
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/* 미들웨어 */
// body parser를 위한 express의 json, unrlencoded를 장착
// 정적 파일들을 서비스할 폴더를 public/으로 지정해주기
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* MongoDB 연결 */
// mongoose를 사용해서 mongodb와 connection을 생성
// 호스트: 127.0.0.1 포트: 27017 데이터베이스 이름: facebook_clone
mongoose
    .connect("mongodb://127.0.0.1:27017/facebook_clone", {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true // Enables the new unified topology layer
    })
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.log(err);
    });

/* Template 파일에 변수 전송 */
// user와 authentication, flash와 관련한 변수 전송
app.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.login = req.isAuthenticated();
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

/* Routers 라우터 */
// 라우터를 장착해주고, 서버와 연결하는 부분
app.use("/", userRoutes);
app.use("/", postRoutes);

const server = app.listen(port, () => {
    console.log("App is running on port " + port);
});



/* WebSocket setup */
// socket.io를 이용해 websocket 통신을 구현하고,
// http 통신을 하는 express 서버와 연결
const io = socket(server);

const room = io.of("/chat");
room.on("connection", socket => {
    console.log("new user : ", socket.id);

    room.emit("newUser", { socketID: socket.id }); // 모든 사용자에게 메시지를 보내는 부분


    // socket.on : 특정 이벤트에만 메시지를 보냄
    
    // 새로운 사용자가 등장했을 때(newUser)
    socket.on("newUser", data => {
        if (!(data.name in onlineChatUsers)) { // 새로운 사용자 들어오면
            onlineChatUsers[data.name] = data.socketID; // onlineChatUsers 객체 변수에 해당 사용자 넣어주고
            socket.name = data.name;
            room.emit("updateUserList", Object.keys(onlineChatUsers));
            console.log("Online users: " + Object.keys(onlineChatUsers));
        }
    });

    // 사용자가 나갔을 때(disconnect)
    socket.on("disconnect", () => {
        delete onlineChatUsers[socket.name]; // onlineChatUsers 객체 변수에서 사용자 정보 삭제
        room.emit("updateUserList", Object.keys(onlineChatUsers));
        console.log(`user ${socket.name} disconnected`);
    });

    // 사용자들이 메시지를 보냈을 때(chat)
    socket.on("chat", data => {
        console.log(data);
        if (data.to === "Global Chat") {
            room.emit("chat", data);
        } else if (data.to) {
            room.to(onlineChatUsers[data.name]).emit("chat", data);
            room.to(onlineChatUsers[data.to]).emit("chat", data);
        }
    });
});


// 비즈니스 로직을 짜는 부분도 처음엔 어렵지만
// 웹 서비스의 동작이
// 사용자의 데이터를 [관리]하고, 사용자가 [생성]하는 데이터를 CRUD로 처리하는 것이 대부분임!