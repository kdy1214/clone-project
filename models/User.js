const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");


// 데이터의 속성(attribute)를 mongoose에서는 key로 나타내며 이를 field 라고 함
let UserSchema = new mongoose.Schema({ // User 스키마 정의
    username: String,
    firstName: String,
    lastName: String,
    password: String,
    profile: String, // user 데이터 모델에 username 등 속성을 가질 수 있게 키(field)값 설정해주고 타입 비정
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId, // ObjectID는 각각의 Document를 식별하는 고유의 아이디
            // 이를 이용해 다른 Collection의 Document와 매칭 가능
            // 즉, User Collection에 있는 이 posts 필드는 Post Collection에 있는 Document와 매핑 되어 있는 것
            // = 외래키를 이용해 Relation을 맺어주는 것
            ref: "Post" // Post 참조
        }
    ],

    liked_posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        }
    ],

    liked_comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        }
    ],
    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    friendRequests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
});

UserSchema.plugin(passportLocalMongoose); // plugin()을 사용해서 사용자 인증을 위한 passport-local-mongoose모듈과 스키마를 연결
let User = mongoose.model("User", UserSchema); // UserSchema 구조를 따르는 User 라는 이름의 인스턴스를 생성
// 인스턴스 = Document(in MongoDB)
// MongoDB 저장소에 User 라는 Document가 생성된 거임
module.exports = User;