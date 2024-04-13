// Import the express module
import express from  'express';
import cors from 'cors';

// Create an instance of the express application
const app = express();

import { getUserInfo, getTweetInfo, getTwittAccountInfo, insertUserInfo, updateUserInfo, updateUserVerify, updateWalletAddress } from "./controller.js";
// Specify a port number for the server
const port = process.env.PORT || 3000;

app.get("/getUserInfo", async(req, res) => {
  const userInfo = await getUserInfo(req.query.twittUsername, req.query.contractAddress);

  if (userInfo) {
    res.status(200).json(userInfo.json());
  } else {
    const twittUserInfo = await getTwittAccountInfo(req.query.twittUsername);

    if (twittUserInfo) {
      const userInfo = await insertUserInfo(twittUserInfo, req.query.contractAddress);
      res.status(200).json(userInfo.json());
    } else{
      res.status(400).send("Server Error");
    }
  }

});

app.get("/checkTweetVerify", async(req, res) => {
  const isTweetVerify = await getTweetInfo(req.body.tweetUrl, req.body.twittUsername);

  if (isTweetVerify) {
    const userInfo = await updateUserVerify(req.body.twittUsername, req.body.contractAddress);

    if (userInfo) {
      res.status(200).send(userInfo.json());
    } else {
      res.status(401).send("Oops! network connection error");
    }

  } else {
    res.status(401).send("Tweet doesn't match. Check msg and hashtag carefully.");
  }
});

app.get("/getTweetMessage", async(req, res) => {  
  const result = await getUserInfo(req.body.twittUsername, req.body.contractAddress);

  if (result) {
    res.status(200).send(result.json());
  } else {
    res.status(401).send("Oops! network connection error");
  }
});

app.post("/updateWalletAddress", async(req, res) => {
  const twittUsername = req.body.twittUsername;
  const ethAddress = req.body.ethAddress;
  const solAddress = req.body.solAddress;
  const result = await updateWalletAddress(twittUsername, ethAddress, solAddress, req.body.contractAddress);

  if (result) {
    res.status(200).send(result.json());
  } else {
    res.status(401).send("Oops! network connection error");
  }
  
});

app.post("/updateUserInfo", async(req, res) => {  
  const twittUserInfo = await getTwittAccountInfo(req.body.twittUsername);

  if (twittUserInfo) {
    const userInfo = await updateUserInfo(twittUserInfo.json(), req.body.contractAddress, req.body.ethAddress, req.body.solAddress);
    res.status(200).json(userInfo.json());
  } else{
    res.status(400).send("Server Error");
  }

});

// Enable CORS for all routes
app.use(cors());

// Alternatively, configure CORS with options
app.use(cors({
    origin: '*', // or specify domains, e.g., "http://localhost:300"
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Start the server and listen to the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
