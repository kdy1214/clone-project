/* 게시글 관련 데이터 Collection의 스키마를 정의할 Post.js */

const mongoose = require("mongoose");

let PostSchema = new mongoose.Schema({ // 게시물 스키마
    content: String,
    time: Date,
    likes: Number,
    image: String,
    creator: { // User 컬렉션의 Document와 매핑
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        firstName: String,
        lastName: String,
        profile: String
    },
    comments: [ // Comment 컬렉션의 Document와 매핑
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
});

let Post = mongoose.model("Post", PostSchema);
module.exports = Post;