import { ObjectId } from "bson";
import nodemailer from "nodemailer";
import { createConnection } from "./index.js";
import dotenv from "dotenv";
dotenv.config();

const GMAIL_PASSWORD=process.env.GMAIL_PASSWORD

export async function getallusers() {
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("loginUsers")
        .find({})
        .toArray();
    return result;
}

export async function searchbyuser(userEmailId) {
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("loginUsers")
        .findOne({EmailId:userEmailId})
    return result;
}


export async function addusers(FirstName, LastName, EmailId, hashedPassword) {
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("loginUsers")
        .insertOne({FirstName:FirstName,LastName:LastName,EmailId:EmailId,Password:hashedPassword})
    return result;

}

export async function searchbyuserInReset(EmailId){
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("resetPassword")
        .findOne({EmailId:EmailId})
        
    return result;
}


export async function addRandomNumber(EmailId,randomNum){

    const userEx= await searchbyuserInReset(EmailId)
    SendMail(EmailId,randomNum)
    if(!userEx){
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("resetPassword")
        .insertOne({ EmailId:EmailId, RandomNum: randomNum });
    return result;
    }
    else{
        const temp=userEx._id
        const client = await createConnection();
        const result = await client
        .db("login-URLshortner")
        .collection("resetPassword")
        .updateOne({_id:temp},{$set:{RandomNum: randomNum}});
        return result;
   }

   
}

async function SendMail(EmailId,randomNum){
    console.log("hiiii ",EmailId, randomNum)

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'testerAtwork09@gmail.com',
          pass: GMAIL_PASSWORD
        }
      });
      
      var mailOptions = {
        from: 'testerAtwork09@gmail.com',
        to: EmailId,
        subject: 'Password Reset Code',
        text: 'This is your Password reset code : '+randomNum
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}


export async function updatePassword(EmailId,hashedPassword){
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("loginUsers")
        .updateOne({EmailId:EmailId},{$set:{Password:hashedPassword}})
    await clearResetDB(EmailId)
    return result;
}

async function clearResetDB(EmailId){
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("resetPassword")
        .deleteOne({EmailId:EmailId})

}