const express = require('express')
const request = require('request')
const qs = require('querystring')
const bp = require('body-parser')
const session = require('express-session')
const randomString = require('randomstring')
const fire = require('./fire')
const fireuser = fire.database().ref('user')
const firecomment = fire.database().ref('comment')

const state = {
    user : [],
    comment : []
}

fireuser.on('value', snap => {
    state.user = []
    snap.forEach(element => {
        state.user.push(element.val())
    });
})


firecomment.on('value', snap => {
    state.comment = []
    snap.forEach(element => {
        state.comment.push(element.val())
    });
})

const app = express()
app.use(bp.json())
app.use(bp.urlencoded())
app.use(session({
    secret :  randomString.generate(),
    cookie : {maxAge : 600000},
    resave : false,
    saveUninitialized : false
    })
)

const requiresLogin = (req, res, next) => {
    if(req.session.user != null){
        next()
    }else{
        res.status(401).send("Authorization failed")
    }
}

app.get("/login", (req,res) =>{
    res.send(`
        <html>
            <form action='/login' method='POST' enctype='application/json'>
                <input type='username' name='username' id='username'></input>
                <input type='password' name='password' id='password'></input>
                <input type='submit' name='submit' value='Login'></input>
            </form>
        </html>
    `)
})

app.post("/login", (req,res) =>{
    const uname = req.body.username
    const pass = req.body.password
    const bodyData = {
        username : uname,
        password : pass,
        grant_type : 'password',
        client_id: 'IvupkBVo1IYyarhxdYFLKOoL32q2tKsH',
        client_secret: 'mxN0WsVm6yUjmGf7TjP3c0fIXu8pUZGR'
    }

    request.post({
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        url : "https://oauth.infralabs.cs.ui.ac.id/oauth/token",
        body: qs.stringify(bodyData)
    }, (error, response, body)=>{
        if(error){
            res.json({error : "there was a problem"})
        }
        req.session.token = JSON.parse(body).access_token
        request.get({
            headers: {Authorization: 'Bearer ' + req.session.token},
            url : "https://oauth.infralabs.cs.ui.ac.id/oauth/resource",
        }, (error, response, body)=>{
            req.session.user = JSON.parse(body).user_id
            res.json({
                status : "ok",
                token : req.session.token
            })
        })
        
    });
})

app.post("/register", requiresLogin, (req,res) => {
    const user_id = req.session.user

    fireuser.child(user_id).set({userId: user_id, displayName: req.body.displayName}) 

    res.json({
        status: "ok",
        userId : user_id,
        displayName : req.body.displayName
    })
})

app.get("/users", requiresLogin, (req,res) => {
    const pageData = req.query.page
    const limitData = req.query.limit
    res.json({
        status : "ok",
        page : pageData,
        limit : limitData,
        total : state.user.length,
        data : state.user
    })
})

app.route('/comment')
    .post(requiresLogin, (req,res) =>{
        const user_id = req.session.user
        const commentData = req.body.comment
        const date = new Date()
        const newId = state.comment.length == 0 ? 1 : state.comment[state.comment.length-1].id+1
        const newComment = {
            id: newId,
            comment : commentData,
            createdBy : user_id,
            createdAt : date.toISOString(),
            updatedAt : date.toISOString()
        }
        firecomment.child(newComment.id).set(newComment)
        res.json({
            status: "ok",
            data : newComment
            
        })
    })
    .get((req,res) => {
        const comment = getCommentById(req.query.id)
        res.json({
            status : "ok",
            data : comment
        })
    })
    .delete((req, res)=>{
        const commentId = req.body.id
        const comment = getCommentById(commentId)
        if(comment != false){
            firecomment.child(commentId).remove()
            console.log(state.comment)
            res.json({status:'ok'})
        }else{
            res.json({status:'err', description:'comment by id not found'})
        }
    })

app.post("/comment/update", (req, res) => {
    const id = req.body.id
    const comment = getCommentById(id)
    if(comment != false){
        const date = new Date()
        const newComment = req.body.comment
        console.log(date)
        firecomment.child(id).update({comment: newComment, updatedAt: date.toISOString()})
        res.json({
            status : "ok",
            data : getCommentById(id)
        })
    }else{
        res.json({status:'err', description:'comment by id not found'})
    }
})

app.get("/comments", (req,res) => {
    const filteredComment = state.comment.filter(element => {
        return (
            (req.query.startDate == null || new Date(element.updatedAt) >= new Date(req.query.startDate))
            && (req.query.endDate == null || new Date(element.updatedAt) <= new Date(req.query.endDate))
            && (req.query.createdBy == null || element.createdBy == req.query.createdBy))
    })
    res.json({
        status : "ok",
        page : req.query.page,
        limit : req.query.limit,
        createBy : req.query.createBy,
        startDate : req.query.startDate,
        endDate: req.query.endDate,
        data: filteredComment
    })
})


const getDisplayNameByUserId = (userId) =>{
    let displayName = false
    state.user.forEach(element =>{
        console.log(element)
        if(element.userId==userId){
            displayName = element.displayName
        } 
    })
    return displayName
}

const getCommentById = (id) => {
    let comment = false
    state.comment.forEach(element => {
        if(element.id == id) comment = element
    })
    return comment
}

app.listen(3000, ()=>{
    console.log("Server listening at port 3000")
})
