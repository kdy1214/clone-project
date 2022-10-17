/* 댓글 관련 데이터를 관리, Comment Collection을 생성하는 Comment.js 파일 */

const mongoose = require("mongoose");

let CommentSchema = new mongoose.Schema({ // 댓글용 스키마
    content: String,
    likes: Number,
    creator: { // 필드 안에 또 다른 필드 넣기가 가능
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User" // User 컬렉션의 document와 매핑
        },
        firstName: String,
        lastName: String
    }
});

let Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;


// NoSQL은 SQL 보다 좀 더 자유로운 스키마 구조를 만들 수 있음
// 속성 안에 속성 넣기 가능
// mySQL은 속성 테이블을 따로 만들어야 될 듯?