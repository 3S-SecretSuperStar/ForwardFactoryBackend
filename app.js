// Import the express module
import express from  'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { getUserInfo, getTweetInfo, getTwittAccountInfo, insertUserInfo, updateUserInfo, updateUserVerify, updateWalletAddress, getUserList, sendMessage, updateTokenBalance } from "./controller.js";

// Create an instance of the express application
const app = express();
// Enable CORS for all routes
app.use(cors());
app.use(bodyParser.json());

// Alternatively, configure CORS with options
app.use(cors({
    origin: '*', // or specify domains, e.g., "http://localhost:300"
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Specify a port number for the server
const port = process.env.PORT || 3000;

app.get("/getUserInfo", async(req, res) => {
  const userInfo = await getUserInfo(req.query.twittUsername, req.query.contractAddress);

  if (userInfo) {
    res.status(200).send(userInfo);
  } else {
    const twittUserInfo = await getTwittAccountInfo(req.query.twittUsername);

    if (twittUserInfo) {
      const result = await insertUserInfo(twittUserInfo, req.query.contractAddress);
      if (result) {
        const userInfo = await getUserInfo(req.query.twittUsername, req.query.contractAddress);
        res.status(200).send(userInfo);
      } else {
        res.status(400).send("Server Error");  
      }
    } else{
      res.status(400).send("Server Error");
    }
  }

});

app.get("/checkTweetVerify", async(req, res) => {
  const isTweetVerify = await getTweetInfo(req.query.tweetUrl, req.query.twittUsername, req.query.message, req.query.hashtags);

  if (isTweetVerify) {
    const result = await updateUserVerify(req.query.twittUsername, req.query.contractAddress);

    if (result) {
      const userInfo = await getUserInfo(req.query.twittUsername, req.query.contractAddress);
      res.status(200).send(userInfo);
    } else {
      res.status(400).send("Server Error");  
    }

  } else {
    res.status(401).send("Tweet doesn't match. Check msg and hashtag carefully.");
  }
});

app.get("/getTweetMessage", async(req, res) => {  
  const result = await getUserInfo(req.query.twittUsername, req.query.contractAddress);

  if (result) {
    res.status(200).send(result);
  } else {
    res.status(401).send("Please wait for admin to send message");
  }

});

app.get("/getUserList", async(req, res) => {

  const contractAddress = req.query.contractAddress;
  const tokenAddress = req.query.tokenAddress;
  const result = await getUserList(contractAddress, tokenAddress);
  if (result) {
    res.status(200).send(result);
  } else {
    res.status(401).send("Oops! Something Wrong. Please try again with correct wallet address");
  }
})

app.post("/updateWalletAddress", async(req, res) => {
  const twittUsername = req.body.twittUsername;
  const ethAddress = req.body.ethAddress;
  const solAddress = req.body.solAddress;
  const result = await updateWalletAddress(twittUsername, ethAddress, solAddress, req.body.contractAddress);

  if (result) {
    const userInfo = await getUserInfo(req.query.twittUsername, req.query.contractAddress);
    res.status(200).send(userInfo);
  } else {
    res.status(401).send("Oops! Something Wrong. Please try again with correct wallet address");
  }
});

app.post("/updateUserInfo", async(req, res) => {  
  const twittUserInfo = await getTwittAccountInfo(req.body.twittUsername);

  if (twittUserInfo) {
    const userInfo = await updateUserInfo(twittUserInfo, req.body.contractAddress, req.body.ethAddress, req.body.solAddress);
    res.status(200).send(userInfo);
  } else{
    res.status(401).send("Server Error");
  }

});

app.post("/sendMessage", async(req, res) => {
  const result = await sendMessage(req.body.contractAddress, req.body.twittUsername);
  if (result) {
    const userData = await getUserList(req.body.contractAddress, req.body.tokenAddress);
    res.status(200).send(userData);
  } else {
    res.status(401).send("Server Error");
  }
});

app.post("/updateTokenBalance", async(req, res) => {
  const contractAddress = req.body.contractAddress;
  const userList = req.body.userList;
  const tokenNumber = req.body.airdropNumber;
  const tokenAddress = req.body.tokenAddress;
  const result = await updateTokenBalance(contractAddress, userList, tokenNumber);
  if (result) {
    const userData = await getUserList(contractAddress, tokenAddress);
    res.status(200).send(userData);
  } else {
    res.status(401).send("Server Error");
  }
})

// Start the server and listen to the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
