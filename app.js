// jshit esversion: 6

const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");


const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/signup.html");
});

app.post("/", function (req, res) {

    var firstName = req.body.fName;
    var lastName = req.body.lName;
    var email = req.body.email;
    var comment = req.body.message;

    var data = {
        members: [
            {
                email_address: email,
                status: "subscribed",
                merge_fields: {
                    FNAME: firstName,
                    LNAME: lastName,
                    COMMENT: comment
                }

            }
        ]
    };

    var jsonData = JSON.stringify(data)


    var options = {
        url: "https://us20.api.mailchimp.com/3.0/lists/bc969b7535",
        method: "POST",
        headers: {
            "Authorization": "steven1 d1d2b1cbd9286bc724403baf4e863854-us20"
        },
        body: jsonData
    };

    request(options, function (error, response, body) {
        if (error) {
            res.sendFile(__dirname + "/failure.html");
        } else {
            if (response.statusCode === 200) {
                res.sendFile(__dirname + "/success.html");
            } else {
                res.send("There was an error with signing up, please try again!");
            }
        }

    });

});

app.listen(3000, function () {
    console.log("Server is running on port 3000");
});

//   d1d2b1cbd9286bc724403baf4e863854-us20

// bc969b7535 