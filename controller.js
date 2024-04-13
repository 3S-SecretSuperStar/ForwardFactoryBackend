import needle from "needle";
import axios from "axios";
import { ethers } from "ethers";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import dotenv from 'dotenv';

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
        console.log(data.document);
        return data.document;
    } catch (err) {
        console.log(err);
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

        const userInfo = twitterRes.body;
        console.log(userInfo);
        return userInfo;
        
    } catch(err){
        console.log(err);
        return false;
    }
}

export const insertUserInfo = async (user, contractAddress) => {
    const locationInfo = await getLocation();
    let location, ip;

    if (locationInfo) {
        ({ location, ip } = locationInfo);   
    } else {
        location = false;
        ip = false;
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
        console.log(data.document);
        return data.document;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export const updateUserInfo = async (user, contractAddress, ethAddress, solAddress) => {

    const { solBalance, solGas } = await getSolHistory(solAddress);
    const ethGas = await getEtherHistory(ethAddress);

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

export const getTweetInfo = async (url, twittUsername) => {
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
        })

        const hashtags = process.env.hashtags;
        const message = process.env.message;
    
        const tweetText = twitterRes.text;
        const tweetHashtags = Object.values(twitterRes?.entities?.hashtags);

        let verified = false;

        let num = 0;

        hashtags.forEach((tag) => {
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
        const { data } = await axios.post(
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
        return data.document;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export const updateWalletAddress = async (twittUsername, ethAddress, solAddress, contractAddress) => {

    const { data } = await axios.post(
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
              solAddress
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

    return data.document;
}

const getLocation = async () => {
    try {
        const response = await fetch(`http://ip-api.com/json`);
        const data = await response.json();
        const country = data.country;
        const ip = data.query;
        return { country, ip };
    } catch { 
        return false;
    }
}

const getEtherHistory = (_address) => {
    const myEtherScanInstance = new ethers.providers.EtherscanProvider();
    return myEtherScanInstance
    .getHistory(_address)
    .then((data) => {
        let sum = 0;
        data.map((key) => {
            sum += Number(key.gasUsed);
        });
        return sum;
    })
    .catch((e) => {
        console.error(e)
        return 0;
    });
};

const getSolHistory = async (_address) => {
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
    const solBalance = balance / LAMPORTS_PER_SOL;
    return { solBalance, solGas };
};