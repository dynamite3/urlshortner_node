import { ObjectId } from "bson";
import nodemailer from "nodemailer";
import { createConnection } from "./index.js";
import dotenv from "dotenv";
import { request } from "express";

dotenv.config();

const GMAIL_PASSWORD=process.env.GMAIL_PASSWORD


export async function checkUrlExist(longUrl){
    console.log(longUrl)
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("shortUrls")
        .findOne({longUrl})
    return result;

}

export async function addshortUrl(longUrl,shortUrl,urlCode,date,createrBy){
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("shortUrls")
        .insertOne({longUrl,shortUrl,urlCode,date,createrBy,HitCount:0 });

    const temp= await checkUrlExist(longUrl)
    return temp;

}

export async function checkUrlcodeExist({urlCode}){
    
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("shortUrls")
        .findOne({urlCode})
    return result;
    

}




export async function checkUserInUserShorts(id){
    
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("Users-urls")
        .findOne({user:id})
    return result;

}

export async function aaddUserInUsersUrl(currentUser,data){
    const client = await createConnection();
    // const data1={
    //     _id:data._id,
    //     longUrl:data.longUrl,
    //     shortUrl:data.shortUrl,
    //     urlCode:data.urlCode,
    //     date:data.date
    // }
    const result = await client
        .db("login-URLshortner")
        .collection("Users-urls")
        .insertOne(
            {
                user: currentUser,
                usersUrls: [data]
            }
        );
    return result;
}

export async function updateUsersShortUrl(currentUser,data){

    console.log("this is data to be updated with hits " )

    // const data1={
    //     _id:data._id,
    //     longUrl:data.longUrl,
    //     shortUrl:data.shortUrl,
    //     urlCode:data.urlCode,
    //     date:data.date
    // }
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("Users-urls")
        .updateOne(
            {
                user: currentUser,
            },
            {
                $addToSet:{
                    usersUrls :data
                }
            }
        );
    return result;
}


export async function increasesHitCount(url){
    console.log("counting part ")
    console.log(url)
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("shortUrls")
        .updateOne({_id:url._id},{$inc:{HitCount:1}});

    
    const k=url._id
    const k2=k.toString()
    const result1=await client
        .db("login-URLshortner")
        .collection("Users-urls")
        .updateOne({user:url.createrBy,"usersUrls._id":k2},{$inc:{"usersUrls.$.HitCount" :1}});
        
    console.log(result1)
}

