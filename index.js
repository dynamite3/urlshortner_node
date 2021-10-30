import express, { request, response } from "express";
import { ConnectionClosedEvent, MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import { getallusers, addusers, searchbyuser ,addRandomNumber,searchbyuserInReset,updatePassword} from "./helper.js";
import { auth } from "./middleware/auth.js";

import {checkUrlExist,addshortUrl,checkUrlcodeExist,checkUserInUserShorts,aaddUserInUsersUrl,updateUsersShortUrl,increasesHitCount} from "./helperforUrlshortner.js";

//url shortner only

import validUrl from 'valid-url';
import shortid from 'shortid';

import localStorage from "localStorage"

const app = express();
dotenv.config();

//middlewares//
app.use(cors());
app.use(express.json());

//loading data from hidden env
const PORT = process.env.PORT
const MONGO_URL = process.env.MONGO_URL
const SECRET_KEY=process.env.SECRET_KEY
const GMAIL_PASSWORD=process.env.GMAIL_PASSWORD

app.listen(PORT, () => console.log("Server Started"));

app.get("/", (request, response) => {
    response.send("Hello from express JS")
})


export async function createConnection() {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    return client;
}

app.get("/login" ,async (request, response) => {
    const result = await getallusers();
    response.send(result)
})

app.post("/login", async (request, response) => {
    const { EmailId, Password } = request.body;
    const user = await searchbyuser(EmailId)
    
    if (user) {
        console.log(user)
        const dbPassword = user.Password;
        const loginPassword = Password;
        const isPassMatched = await bcrypt.compare(loginPassword, dbPassword);
        if(isPassMatched){
            const jtoken=jwt.sign({id:user._id},SECRET_KEY)
            
            response.send({message: "Successfull Login",token:jtoken,id:user._id,loggedin:true})
        }
        else
            response.send({message: "Invalid Credentials",loggedin:false})
    }
    else    
        response.send({message: "Invalid Credentials",loggedin:false})
})

async function generatePassword(password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt)
    return (hashedPassword)
}

app.post("/signup", async (request, response) => {
    const { FirstName, LastName, EmailId, Password} = request.body;
    const hashedPassword = await generatePassword(Password)
    const result = await addusers(FirstName, LastName, EmailId, hashedPassword);
    response.send(result)
})


app.get("/content",auth,async(request,response)=>{
    response.send("Protected content")
})




app.post("/userExist", async (request, response) => {
    const { EmailId} = request.body;
    // console.log(EmailId)

    const user = await searchbyuser(EmailId)

    if (user){
        const randomNum=Math.floor(100000 + Math.random() * 900000)
        // console.log(randomNum)
        addRandomNumber(EmailId,randomNum)
        
    }
    if (user) {
            response.send({message: "User Exist",EmailId,flag:true})
    }
    else    
        response.send({message: "User Does not exist",flag:false})
})

app.post("/verfiyResetCode", async (request, response) => {
    const { EmailId} = request.body;
    console.log(EmailId)

    const user = await searchbyuserInReset(EmailId)
    if (user){
        response.send(user)
    }
    else    
        response.send({message: "User does not exist",flag:false})
})


app.post("/setNewPassword", async (request, response)=>{
    const {EmailId,Password}=request.body;
    const hashedPassword = await generatePassword(Password)
    const k=await updatePassword(EmailId,hashedPassword)
    response.send(k)
})






const baseUrl="https://ulshortner3.herokuapp.com"

app.get("/shorten",async(request,response)=>{
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("shortUrls")
        .find({})
        .toArray()
    response.send(result);
})

app.post("/shorten",async(request,response)=>{
    const {longUrl,createrBy} = request.body;
    console.log(longUrl)
    
    if(!validUrl.isUri(baseUrl)){
        return response.status(401).json('Invalid base URL')
    }

    const urlCode = shortid.generate()

    if(validUrl.isUri(longUrl)){
        try{
            let url = await checkUrlExist(longUrl)
            if(url){
                response.send(url)
            }
            else{
                const shortUrl = baseUrl + '/' + urlCode
                const date=new Date().toLocaleString();
                console.log(date)
                const k=await addshortUrl(longUrl,shortUrl,urlCode,date,createrBy)
                response.send(k)
            }
        }
        catch (err) {
            console.log(err)
            response.status(500).json('Server Error')
        }
    }
    else {
        response.status(401).json('Invalid longUrl')
    }
})

app.post("/shorten/specific",async(request,response)=>{
    const {shortUrl}=request.body
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("shortUrls")
        .findOne({shortUrl})
    response.send(result);
})




app.post("/content/UserShorten",async(request,response)=>{
    const {currentUser, data} = request.body;
    console.log("hihihh   ")
    console.log(currentUser,data)

    var user=await checkUserInUserShorts(currentUser)

    console.log("userExist ? "+ user)

    if(!user){
        const kr=aaddUserInUsersUrl(currentUser,data)
        response.send(kr);
    }
    else{
        const kr=updateUsersShortUrl(currentUser,data)
        response.send(kr);
    }
    
})




// app.post("/content/UsersUrls",async(request,response)=>{
//     const {id} = request.body;

//     const client = await createConnection();
//     const result = await client
//         .db("login-URLshortner")
//         .collection("Users-urls")
//         .findOne({user:id})
//     response.send(result);
// })

app.get("/content/UsersUrls/:id",auth,async(request,response)=>{
    const { id } = request.params

    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("shortUrls")
        .find({createrBy:id})
        .toArray()
    response.send(result);
})




app.get('/:code', async (request, response) => {
    try {

        const url = await checkUrlcodeExist({urlCode: request.params.code})
        if (url) {
            await increasesHitCount(url)
            return response.redirect(url.longUrl)
        } else {
            return response.status(404).json('URL Not Found')
        }

    }
    // exception handler
    catch (err) {
        console.error(err)
        response.status(500).json('Server Error')
    }
})


app.delete("/content/deleteshorten",async(request,response)=>{
    const {id}=request.body
    const client = await createConnection();
    const result = await client
        .db("login-URLshortner")
        .collection("shortUrls")
        .deleteOne({_id:ObjectId(id)})
    response.send(result);
})
