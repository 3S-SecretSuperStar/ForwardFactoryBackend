import needle from "needle";
import axios from "axios";
import { providers, utils, ethers } from "ethers";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import dotenv from 'dotenv';
import fs from "fs";
import getUserRating from "./getUserRating.js";
import { testRpcProvider } from "./provider.js";
const rawdata = fs.readFileSync('./erc20.json');
const tokenAbi = JSON.parse(rawdata);
dotenv.config();

const token = process.env.BEARER_TOKEN;

export const getUserInfo = async (twittUsername, contractAddress) => {
    try {
        const { data } = await axios.post(
            `${process.env.MONGODB_URI}/action/findOne`,
            {
                dataSource: "Cluster0",
                database: process.env.DataBase,
                collection: "users",
                filter: {
                    twitt_username: twittUsername,
                    contractAddress
                },                   
                projection: {},
                },
            {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                apiKey: process.env.DATAAPI_KEY,
            },
            }
        );
        console.log("getUserInfo:", data.document);
        return data.document;
    } catch (err) {
        console.log("getUserInfo >> error :", err);
        return false;
    }
}

export const getTwittAccountInfo = async (twittUsername) => {

    const endpointURL = "https://api.twitter.com/2/users/by/username/"+twittUsername;

    const params = {
        "user.fields": "name,profile_image_url,public_metrics", // Edit optional query parameters here
    }

    // this is the HTTP header that adds bearer token authentication
    try {
        const twitterRes = await needle('get', endpointURL, params, {
            headers: {
                "User-Agent": "v2TweetLookupJS",
                "authorization": `Bearer ${token}`
            }
        })

        const userInfo = twitterRes.body.data;
        console.log("getTwittAccountInfo: ", userInfo);
        return userInfo;
        
    } catch(err){
        console.log("getTwittAccountInfo: error >>", err);
        return false;
    }
}

export const insertUserInfo = async (user, contractAddress) => {
    const locationInfo = await getLocation();
    let location, ip;

    if (locationInfo) {
        ({ location, ip } = locationInfo);   
    } else {
        location = "";
        ip = "";
    }

    try {
        const { data } = await axios.post(
            `${process.env.MONGODB_URI}/action/insertOne`,
            {
                dataSource: "Cluster0",
                database: process.env.DataBase,
                collection: "users",
                document: {
                    username: user.name,
                    contractAddress: contractAddress,
                    avatar: user.profile_image_url,
                    twitterVerified: "no",
                    userRating: 0,
                    solAddress: "",
                    ethAddress: "",
                    ethBalance: "",
                    solBalance: "",
                    ethGas: "",
                    solGas: "",
                    location: location,
                    followers_count: user?.public_metrics?.followers_count,
                    twitt_username: user.username,
                    firstTag: 0,
                    message: {},
                    IP: ip,
                    createdAt: new Date(Date.now()).toLocaleString(),
                },
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    apiKey: process.env.DATAAPI_KEY,
                },
            }
        );
        console.log("insertUserInfo: ", data);
        return true;
    } catch (err) {
        console.log("insertUserInfo: error >> ", err);
        return false;
    }
}

export const updateUserInfo = async (user, contractAddress, ethAddress, solAddress) => {

    const { solBalance, solGas, solError } = await getSolHistory(solAddress);
    const { ethGas, ethError } = await getEtherHistory(ethAddress);

    if ( ethError == 1 || solError == 1) {
        return false;
    }

    try {
        const { data } = await axios.post(
            `${process.env.MONGODB_URI}/action/insertOne`,
            {
                dataSource: "Cluster0",
                database: process.env.DataBase,
                collection: "users",
                filter: {
                    twitt_username: twittUsername,
                    contractAddress
                },
                update: {
                    $set: {
                        username: user.name,
                        avatar: user.profile_image_url,
                        solBalance: solBalance,
                        ethGas: ethGas,
                        solGas: solGas,
                        followers_count: user?.public_metrics?.followers_count,
                    },
                },
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    apiKey: process.env.DATAAPI_KEY,
                },
            }
        );
        console.log(data.document);
        return data.document;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export const getTweetInfo = async (url, twittUsername, message, hashtags) => {
    let arr = url.split("/");
    let id = arr[arr.length - 1];
    let tweetUsername = arr[arr.length - 3];
    
    if (!id) {
      return false;
    }

    if (!tweetUsername === twittUsername) {
      return false;
    }

    const endpointURL = "https://api.twitter.com/2/tweets/" + id;

    const params = {
        "tweet.fields": "entities", // Edit optional query parameters here
        "user.fields": "created_at", // Edit optional query parameters here
    }

    // this is the HTTP header that adds bearer token authentication
    try {
        const twitterRes = await needle('get', endpointURL, params, {
            headers: {
                "User-Agent": "v2TweetLookupJS",
                "authorization": `Bearer ${token}`
            }
        });
    
        const tweetText = twitterRes.body.data.text;
        const tweetHashtags = Object.values(twitterRes.body.data?.entities?.hashtags);

        let verified = false;

        let num = 0;

        hashtags.split(",").forEach((tag) => {
            if (!tweetHashtags[num] || tweetHashtags[num].tag !== tag) {
                verified = false;
                return;
            } else {
                verified = true;
            }
            num++;
        });

        if (!tweetText.includes(message)) {
          verified = false;
        }

        return verified;

    } catch(err){
        console.log(err);
        return false;
    }
}

export const updateUserVerify = async (twittUsername, contractAddress) => {
    try {
        const result = await axios.post(
            `${process.env.MONGODB_URI}/action/updateOne`,
            {
              dataSource: "Cluster0",
              database: process.env.DataBase,
              collection: "users",
              filter: {
                twitt_username: twittUsername,
                contractAddress
              },
              update: {
                $set: {
                  twitterVerified: "yes",
                },
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                apiKey: process.env.DATAAPI_KEY,
              },
            }
        );
        return result;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export const updateWalletAddress = async (twittUsername, ethAddress, solAddress, contractAddress) => {

    let { ethGas, ethError } = await getEtherHistory(ethAddress);
    let { solBalance, solGas, solError } = await getSolHistory(solAddress);

    if (ethError == 1 || solError == 1) {
        return false;
    }

    try {
        const result = await axios.post(
            `${process.env.MONGODB_URI}/action/updateOne`,
            {
              dataSource: "Cluster0",
              database: process.env.DataBase,
              collection: "users",
              filter: {
                twitt_username: twittUsername,
                contractAddress
              },
              update: {
                $set: {
                  ethAddress,
                  solAddress,
                  ethGas,
                  solBalance,
                  solGas
                },
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                apiKey: process.env.DATAAPI_KEY,
              },
            }
        );    
        return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}

export const getUserList = async (contractAddress, tokenAddress) => {
    try {
        const { data } = await axios.post(
            `${process.env.MONGODB_URI}/action/find`,
            {
                dataSource: "Cluster0",
                database: process.env.DataBase,
                collection: "users",
                filter: {
                    contractAddress
                },                   
                projection: {},
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    apiKey: process.env.DATAAPI_KEY,
                },
            }
        );
        
        let num = 0;

        const userList = await Promise.all(data.documents.map(async user => {
            let action ;
            if (user.message.text) {
                action = 1 + "," + user.twitt_username;
            } else {
                action = 0 + "," + user.twitt_username;
            }

            if (user.twitterVerified === "yes") {
                const { ethBalance, tokenValue } = await getEtherBalance(user.ethAddress, tokenAddress);
                const userRating = getUserRating(user.solBalance, ethBalance, user.tokenBalance, tokenValue, user.solGas, user.ethGas, user.followers_count);
                return {...user, no: ++num, userRating: userRating, ethBalance: ethBalance, tokenValue: tokenValue, twitterVerified: true, action: action}
            } else {
                return {...user, no: ++num, twitterVerified: false, action: action};
            }
        }));
        console.log(userList);
        return userList;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export const updateTokenBalance = async (contractAddress, userList, tokenNumber) => {
    try {
        userList.map(async user => {
            const tokenBalance = Number(user.tokenBalance) + Number(tokenNumber);
            const tokenValue = Number(user.tokenValue) + Number(tokenNumber);

            const userRating = getUserRating(user.solBalance, user.ethBalance, tokenBalance, tokenValue, user.solGas, user.ethGas, user.followers);
            await axios.post(
                `${process.env.MONGODB_URI}/action/updateOne`,
                {
                dataSource: "Cluster0",
                database: process.env.DataBase,
                collection: "users",
                filter: {
                    twitt_username: user.twitt_username,
                    contractAddress
                },
                update: {
                    $set: {
                        tokenBalance: tokenBalance.toString(),
                        tokenValue: tokenValue.toString(),
                        userRating: userRating
                    },
                },
                },
                {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    apiKey: process.env.DATAAPI_KEY,
                },
                }
            );
        });
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

const getLocation = async () => {
    try {
        const response = await fetch(`http://ip-api.com/json`);
        const data = await response.json();
        const location = data.country;
        const ip = data.query;
        return { location, ip };
    } catch { 
        return false;
    }
}

const getEtherHistory = async (_address) => {
    const myEtherScanInstance = new ethers.providers.EtherscanProvider();
    try {
        const data = await myEtherScanInstance.getHistory(_address);
        let ethGas = 0;
        if (data) {
            data.map((key) => {
                ethGas += Number(key.gasUsed);
            });
        }
        let ethError = 0;
        return { ethGas, ethError }; 
    } catch (err) {
        console.error(err);
        let ethError = 1;
        let ethGas = 0;
        return { ethGas, ethError };
    }
};

const getSolHistory = async (_address) => {
    try {
        const connection = new Connection(clusterApiUrl("mainnet-beta"));
        const publicKey = new PublicKey(_address);
        const transactionList = await connection.getSignaturesForAddress(publicKey);
        let signatureList = transactionList.map(
            (transaction) => transaction.signature
        );
        let transactionDetails = await connection.getParsedTransactions(
            signatureList,
            { maxSupportedTransactionVersion: 0 }
        );
        let solGas = 0;
        transactionDetails.map(async (data) => {
            solGas += Number(data.meta.fee);
        });
        const balance = await connection.getBalance(publicKey);
        let solBalance = balance / LAMPORTS_PER_SOL;
        let solError = 0;
        return { solBalance, solGas, solError};

    } catch (msg) {
        
        let solBalance = 0;
        let solGas = 0;
        let solError = 1;
        return { solBalance, solGas, solError};
    }
};

const getEtherBalance = async (_address, tokenAddress) => {
    for (const item of testRpcProvider) {
        try {
            const provider = new providers.JsonRpcProvider(item);
            const wei = await provider.getBalance(_address);
            const ethBalance = utils.formatEther(wei);
            const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
            const tokenWei = await tokenContract.balanceOf(_address);
            const tokenValue = utils.formatEther(tokenWei);
            return { ethBalance, tokenValue };
        } catch (error) {
            console.log(error);
        }
    }
};

export const sendMessage = async ( contractAddress, twittUsername) => {

    const text = process.env.MESSAGE;
    const hashtag = process.env.HASHTAGS.split(",");
    const message = {
        text: text,
        hashtags: hashtag
    }

    console.log(message, twittUsername, contractAddress);

    try {
        const result = await axios.post(
            `${process.env.MONGODB_URI}/action/updateOne`,
            {
              dataSource: "Cluster0",
              database: process.env.DataBase,
              collection: "users",
              filter: {
                twitt_username: twittUsername,
                contractAddress
              },
              update: {
                $set: {
                    message: message
                },
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                apiKey: process.env.DATAAPI_KEY,
              },
            }
        );    
        return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}