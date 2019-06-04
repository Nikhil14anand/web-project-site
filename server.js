var express = require('express')
var path = require('path')
var app = express()
var ejs = require('ejs')
var nodemailer = require('nodemailer');
var multer = require('multer')

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    file.fieldname = file.fieldname + req.session.email + '-' + req.session.name + path.extname(file.originalname);
    console.log(file.fieldname);
    cb(null, file.fieldname);
  }
});

var upload = multer({
  storage: storage
});

var session = require('express-session');
app.use(session({
  secret: "xYzUCAchitkara",
  resave: false,
  saveUninitialized: true,
}));

//Acces static files
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'Views'));
app.set('view engine', 'ejs');

//Bodyparser
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());

//Connect with db
var mongoose = require('mongoose');
var mongoDB = 'mongodb://localhost/proj';

mongoose.connect(mongoDB, {
  useNewUrlParser: true
});

mongoose.connection.on('error', (err) => {
  console.log('DB connection Error');
});

mongoose.connection.on('connected', (err) => {
  console.log('DB connected');
});

var productSchema = new mongoose.Schema({
  name: String,
  email: String,
  gender: String,
  password: String,
  city: String,
  phno: Number,
  dob: String,
  role: String,
  status: String,
  visibility: Boolean,
  imagepath: String,
  intrests: String,
  aboutjourney: String,
  comExpectations: String,
});

var communitySchema = new mongoose.Schema({
  name: String,
  creator: String,
  rule: String,
  description: String,
  imagepath: String,
  status: String,
  createdate: String,
});

var community = mongoose.model('commdetails', communitySchema);
var user = mongoose.model('users', productSchema);
mongoose.set('useFindAndModify', false);

var GitHubStrategy = require('passport-github').Strategy;
const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(new GitHubStrategy({
    clientID: 'b9f1e1ad35e969d5690f',
    clientSecret: 'b9b7d6195503f75c7bac79cc5faea198261f4e27',
    callbackURL: "http://localhost:3000/auth/github/callback",
    session: true,
  },
  function (accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    return cb(null, profile);
  }
));

app.get('/auth/github', passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login.html'
  }),
  function (req, res) {
    console.log("githubsignin succesful");

    user.update({
      "email": req.session.passport.user._json.email
    }, {
      "name": req.session.passport.user._json.name,
      "email": req.session.passport.user._json.email,
      "city": req.session.passport.user._json.location,
      "visibility": true,
      "status": "pending",
      "role": "user",
    }, {
      upsert: true
    });
    req.session.islogin = 1;
    req.session.name = req.session.passport.user._json.name;
    req.session.email = req.session.passport.user._json.email;
    res.redirect("/home");
    //res.send('Github login successful');
  });

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nikhilanand141998@gmail.com', //email
    pass: '14nikhil1998oct' //password
  }
});

function sendemail(mailOptions) {
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      //res.send(error);
      return 0;
    } else {
      console.log('Email sent: ' + info.response);
      //res.send('Email sent: ' + info.response);
      return 1;
    }
  });
}



app.get('/', function (req, res) {
  res.redirect('/home')
})
app.post('/login', function (req, res) {
  //console.log(req.body);
  user.find({
      "name": req.body.name,
      "password": req.body.password
    })

    .then(data => {
      if (data.length != 0) {
        req.session.islogin = 1;
        req.session.name = data[0].name;
        //console.log(data[0].email);
        req.session.email = data[0].email;
        if (data[0].role == "superuser" || data[0].role == "admin")
          res.send("1");
        else if (data[0].role == "user" || data[0].role == "community builder")
          res.send("2")
      } else {
        res.send("0");
      }
    })
    .catch(err => {
      console.error(err)
      res.send(err);
      //res.send("Invalid Email/password")
    })
})

app.get('/admin/adduser', function (req, res) {
  if (req.session.islogin) {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          //console.log(data[0].name);
          res.render('addusers', {
            user: data[0]
          });
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  } else {
    res.redirect('/login.html')
  }
})
app.post('/adduser', function (req, res) {
  user.find({
      "email": req.body.email
    })
    .then(data => {
      if (data.length != 0) {
        //console.log(data[0].name);
        res.send("Email already exists");
      } else {
        let newuser = new user({
          name: req.body.name,
          email: req.body.email,
          gender: req.body.gender,
          password: req.body.password,
          city: req.body.city,
          phno: req.body.phone,
          dob: req.body.dob,
          visibility: true,
          role: req.body.role,
          status: "pending",
        })
        newuser.save()
          .then(data => {
            req.session.islogin = 1;
            req.session.name = req.body.name;
            req.session.email = req.body.email;
            res.redirect("/home");
          })
          .catch(err => {
            console.error(err)
            res.send(error)
          })
      }
    })
    .catch(err => {
      console.error(err)
      res.send(err);
    })
})

app.get('/home', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          res.render('home', {
            user: data[0]
          });
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  }
});

app.get('/admin/userlist', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          res.render('userlist', {
            user: data[0]
          });
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  }
});

app.post('/admin/userlist/data', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    var count;
    count = user.countDocuments({}, function (error, c) {
      count = c;
    });
    console.log(req.body);
    var querystatus = req.body.querystatus;
    var queryrole = req.body.queryrole;
    if (querystatus == 0 && queryrole == 0) {
      user.find({}, {
          "_id": 0
        }).limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
        .then(data => {
          res.send({
            "recordsTotal": count,
            "recordsFiltered": count,
            data
          });
        })
        .catch(err => {
          console.error(err)
          res.send(err);
        })
    } else if (querystatus == 0 && queryrole != 0) {
      user.find({
          "role": queryrole,
        }, {
          "_id": 0
        }).limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
        .then(data => {
          res.send({
            "recordsTotal": count,
            "recordsFiltered": count,
            data
          });
        })
        .catch(err => {
          console.error(err)
          res.send(err);
        })
    } else if (querystatus != 0 && queryrole == 0) {
      user.find({
          "status": querystatus,
        }, {
          "_id": 0
        }).limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
        .then(data => {
          //console.log(data);
          res.send({
            "recordsTotal": count,
            "recordsFiltered": count,
            data
          });
        })
        .catch(err => {
          console.error(err)
          res.send(err);
        })
    } else {
      user.find({
          "status": querystatus,
          "role": queryrole,
        }, {
          "_id": 0
        }).limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
        .then(data => {
          res.send({
            "recordsTotal": count,
            "recordsFiltered": count,
            data
          });
        })
        .catch(err => {
          console.error(err)
          res.send(err);
        })
    }
  }
});

app.post('/admin/userlist/email', function (req, res) {
  console.log("email sending ");
  //console.log(req.body);
  var mailvalues = {
    "from": "nikhildhupar207@gmail.com",
    "to": req.body.sendto,
    "subject": req.body.subject,
    "text": req.body.content
  };
  console.log(mailvalues);
  if (sendemail(mailvalues)) {
    res.send("1");
  } else {
    res.send("0");
  }
});

app.get('/profile', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          //console.log(data[0].name);
          res.render('home', {
            user: data[0]
          });
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  }
});

app.post('/admin/userlist/updateuser', function (req, res) {
  user.findOneAndUpdate({
      //search query
      email: req.body.email
    }, {
      // field:values to update
      name: req.body.username,
      email: req.body.email,
      phno: req.body.phno,
      role: req.body.role,
      city: req.body.city,
      status: req.body.status,
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      res.redirect('/admin/userlist')
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

app.post('/admin/userlist/disableuser', function (req, res) {
  //console.log(req.body);
  user.findOneAndUpdate({
      //search query
      email: req.body.email
    }, {
      // field:values to update
      visibility: false
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      res.send("1");
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

app.post('/logout', function (req, res) {
  req.session.islogin = 0;
  req.session.name = "";
  req.session.email = "";
  res.send("1");
})

app.post('/admin/userlist/enableuser', function (req, res) {
  //console.log(req.body);
  user.findOneAndUpdate({
      //search query
      email: req.body.email
    }, {
      // field:values to update
      visibility: true
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      res.send("1");
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

app.get('/changePassword', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          //console.log(data[0].name);
          res.render('changepassword', {
            user: data[0]
          });
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  }
});

app.post('/changePassword/update', function (req, res) {
  user.findOneAndUpdate({
      //search query
      email: "admin@gmail.com",
      password: req.body.oldpaswd,
    }, {
      // field:values to update
      password: req.body.newpaswd,
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      if (data == null) {
        res.send("0");
      } else
        res.send("1");
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

app.get('/editprofile', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          //console.log(data[0].name);
          res.render('editprofile', {
            user: data[0]
          });
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  }
});

app.post('/editprofile/picupload', upload.single('user-'), function (req, res, next) {
  // req.file is the image file
  // req.body will hold the text fields, if there were any
  //console.log("inside profile upload");
  user.updateOne({
    "name": req.session.name,
    "email": req.session.email,
  }, {
    "imagepath": req.file.fieldname,
  }, function (err, success) {
    if (err) {
      console.log(error);
    } else {
      console.log("SUCCESS - Image succesfully uploaded");
      console.log(success);
    }
    if (!req.file) {
      const error = new Error('Please400 upload a file')
      error.httpStatusCode = 400
      return next(error)
    }
    res.redirect("/editprofile");
  });
});

app.post('/editprofile', function (req, res) {
  user.findOneAndUpdate({
      //search query
      email: req.body.useremail,
      name: req.body.fullname,
    }, {
      // field:values to update
      name: req.body.fullname,
      dob: req.body.dob,
      phno: req.body.phno,
      gender: req.body.gender,
      city: req.body.city,
      intrests: req.body.intrests,
      aboutjourney: req.body.aboutjourney,
      comExpectations: req.body.comExpectations,
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      //console.log(data);
      res.redirect('/Profile');
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

app.get('/community/communitypanel', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          res.render('communitypannel', {
            user: data[0]
          });
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  }
});

app.get('/community/AddCommunity', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          res.render('addcommunity', {
            user: data[0]
          });
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  }
});

app.post('/community/AddCommunity', upload.single('community-'), function (req, res) {
  console.log(req.body);
  console.log(req.file);
  community.find({
      name: req.body.communityName,
    })
    .then(data => {
      if (data.length != 0) {
        res.send("community name already taken");
      } else {
        var imgpath;
        if (req.file) {
          imgpath = req.file.fieldname;
        } else {
          imgpath = "defaultcommunitypic.jpg"
        }
        var d = new Date();
        var dat = d.toDateString();
        console.log(dat);
        let newcomm = new community({
          name: req.body.communityName,
          "imagepath": imgpath,
          creator: req.session.email,
          rule: req.body.communityMembershipRule,
          description: req.body.description,
          status: "deactive",
          createdate: dat,
        });
        newcomm.save()
          .then(data => {
            res.redirect("/community/communitypanel");
          })
          .catch(err => {
            console.error(err)
            res.send(error)
          })
      }
    })
});

app.post('/community/communitypannel/mycreated', function (req, res) {
  community.find({
      creator: req.session.email,
    })
    .then(data => {
      console.log(data);
      res.send(data);
    })
});

app.get('/community/communityList', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          res.render('admincommunitylist', {
            user: data[0]
          });
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  }
});

app.post('/community/communitylist/data', function (req, res) {
  var count;
  count = community.countDocuments({}, function (error, c) {
    count = c;
    //console.log( "Number of users:", count );
  });
  community.find().limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
    .then(data => {
      //console.log(data);
      res.send({
        "recordsTotal": count,
        "recordsFiltered": count,
        data
      });
    })
    .catch(err => {
      console.error(err)
      res.send(err);
    })
});

app.post('/community/communitylist/updatecommunity',function(req,res){
  community.findOneAndUpdate({
    //search query
    creator: req.body.email,
    name: req.body.origcommname,
  }, {
    // field:values to update
    name: req.body.commname,
    status: req.body.status,
  }, {
    new: true, // return updated doc
    runValidators: true // validate before update
  })
  .then(data=>{
    res.redirect('/community/communityList');
  })
  .catch(err => {
    console.error(err)
    res.send(err);
  })
})

console.log("Running on port 3000");
app.listen(3000)