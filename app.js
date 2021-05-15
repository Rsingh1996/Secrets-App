
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const PORT = process.env.PORT || 3500;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
//////////////////////////// ceating a session cookies/////////////////
app.use(session({
    secret: "mylittlesecret",
    resave: false,
    saveUninitialized: false,

}));

app.use(passport.initialize());
app.use(passport.session());    

mongoose.connect(process.env.HOST,
    { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true } );

    /////////////////// Create  User Schema /////////////////
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

//////////////////// plugins ////////////////////////////////
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);

/////////////////////////// craete and use strategy ////////////////////
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3500/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
///////////////////////// Home page ///////////////////////
app.get("/", function (req, res) {
    res.render("home");
});

/////////////////////// Registration page section /////////////
app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            });
        }
      });
});

///////////////////////// Secret page section /////////////////////
app.get("/secrets", function(req, res){
    User.find({ "secret": { $ne: null } }, function(err, foundUser){
        if(err) console.log(err);
        else{
            res.render("secrets", {userWithSecret : foundUser});
        }
    })
});

/////////////////////// submition of secrets /////////////
app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else res.redirect("/login");
});

app.post("/submit", function(req, res){
    submittedSecrt = req.body.secret;
    console.log(req.user.id);
    User.findById(req.user.id, function(err, foundUser){
        if(err) console.log(err);
        else{
            if(foundUser){
                foundUser.secret = submittedSecrt;
                foundUser.save(function(){
                    res.redirect("secrets");
                });
            }
        }
    });
});

////////////////////////// google authentication for user //////////////////
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

  app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to Secrets.
    res.redirect('/secrets');
  });

///////////////// Login and Logout page section //////////////////////
app.get("/login", function (req, res) {
    res.render("login");
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.logIn(user, function(err){
        if(err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            });
        }
    });
});

app.get("/logout", function(req, res){
    req.logOut();
    res.redirect("/");
})

///////////////// Server creation ////////////////////////////////

app.listen(PORT, () => console.log(`Listening on port: ${ PORT }`));  
