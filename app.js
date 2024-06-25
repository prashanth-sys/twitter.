const express = require("express");
const app = express();
app.use(express.json());
/*const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const toDate = require("date-fns/toDate");*/
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http:/localhost:3000/");
    });
  } catch (e) {
    console.log(e.message);
  }
};

initializeDBAndServer();

//api 1 post
app.post("/register/", async (request, response) => {
  let { username, password, name, gender } = request.body;
  let hashedPassword = await bcrypt.hash(password, 10);
  let checkUser = `SELECT * FROM user WHERE username = '${username}';`;
  let userData = await db.get(checkUser);
  if (userData === undefined) {
    let postNewUserQuery = `
      INSERT INTO
      user(username, password, name, gender)
      VALUES
      (
          '${username}',
          '${hashedPassword}',
          '${name}',
          '${gender}'
      );`;
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      let newUserDetails = await db.run(postNewUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//api 2
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
    /*const payload = {
      username: username,
    };
    const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
    response.send({ jwtToken });*/
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      //response.send("Login Success!");
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//authentication
let authenticationToken = (request, response, next) => {
  let jwtToken;
  let autHeader = request.headers["authorization"];
  if (autHeader !== undefined) {
    jwtToken = autHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, user) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//api 3
app.get(
  "/user/tweets/feed/",
  authenticationToken,
  async (request, response) => {
    const tweetsQuery = `
    SELECT
    username, tweet, date_time AS dateTime
    FROM
    user,tweet,follower
    WHERE
    follower_user_id
    ORDER BY
    tweet.date_time DESC
    LIMIT 4;`;
    const userArray = await db.all(tweetsQuery);
    response.send(userArray);
  }
);
//api 4

app.get("/user/following/", authenticationToken, async (request, response) => {
  const userQuery = `
    SELECT 
    name
    FROM
    user,follower
    WHERE
    follower.follower_user_id = user.user_id;`;
  const users = await db.all(userQuery);
  response.send(users);
});

//api 5

app.get("/user/followers/", authenticationToken, async (request, response) => {
  const userQuery = `
    SELECT 
    name
    FROM
    user,follower
    WHERE
    follower.following_user_id = user.user_id;`;
  const users = await db.all(userQuery);
  response.send(users);
});

//api 6
app.get("/tweets/:tweetId/", async (request, response) => {
  const { tweetId } = request.params;
  if (tweetId === undefined) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    const userQuery = `
    SELECT 
    tweet.tweet
    FROM
    tweet
    LEFT JOIN like ON tweet.tweet_id = like.tweet_id
    LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id
    WHERE 
    tweet.tweet_id = ${tweetId};`;

    //console.log("SQL Query:", userQuery); // Log the SQL query being executed

    const tweet = await db.get(userQuery);

    //console.log("Tweet Data:", tweet); // Log the data returned from the database

    if (tweet === null) {
      response.status(404); // Not Found
      response.send("Tweet not found");
    } else {
      response.send(tweet);
    }
  }
});

//api 7 get

app.get("/tweets/:tweetId/likes/", async (request, response) => {
  const { tweetId } = request.params;
  if (tweetId === undefined) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    const userLikes = `
        SELECT 
        *
        FROM
        like
        WHERE 
        tweet_id = ${tweetId};`;
    const likes = await db.get(userLikes);
    response.send(likes);
  }
});
//api 9
app.get("/user/tweets/", authenticationToken, async (request, response) => {
  const userQuery = `
    SELECT 
    *
    FROM
    tweet,user
    WHERE
    user.user_id = ${tweet_id};`;
  const userTweets = await db.all(userQuery);
  response.send(userTweets);
});
//api 8 get
app.get("/tweets/:tweetId/replies/", async (request, response) => {
  const { tweetId } = request.params;
  if (tweetId === undefined) {
    response.send(401);
    response.send("Invalid Request");
  } else {
    const replays = `
        SELECT 
        name, replay
        FROM
        tweet,replay
        WHERE 
        tweet_id = ${tweetId};`;
    const replayTweet = await db.get(replays);
    response.send(replayTweet);
  }
});
//api 10 post
app.post("/user/tweets/", authenticationToken, async (request, response) => {
  const { tweet } = request.body;
  const addQuery = `
    INSERT INTO 
    tweet(tweet)
    VALUES
    (
        '${tweet}'
    )`;
  await db.run(addQuery);
  response.send("Created a Tweet");
});
//api 11 delete
app.delete(
  "/tweets/:tweetId/",
  authenticationToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const { userId } = request;
    const getTheTweetQuery = `SELECT * FROM tweet WHERE user_id ='${userId}' AND tweet_id = '${tweetId}';`;
    const tweet = await db.get(getTheTweetQuery);
    console.log(tweet);
    if (tweet === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const deleteTweetQuery = `DELETE FROM tweet WHERE tweet_id= '${tweetId}';`;
      await db.run(deleteTweetQuery);
      response.send("Tweet Removed");
    }
  }
);

module.exports = app;
