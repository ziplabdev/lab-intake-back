const axios = require('axios');
const cors = require('cors');
const express = require('express');
const { google } = require('googleapis');
const { application } = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const serverless = require('serverless-http');
const app = express()
const router = express.Router()
const creds = (`src/googlesheetscreds.json`)

app.use(cors())
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); 

const { DateTime } = require('luxon');
const { hoursToSeconds } = require('date-fns');

/* global variables */

var spreadsheetIdRes = "1DWoQIda4G1WrvXVgxTWInEITD5aftQV1RXoeFeC-DKk"
var spreadsheetId
var spreadsheet
var spreadsheetLength

/* ROUTES HERE */

// step 1
router.get("/formdata", async (req, res) => {

    // * getSpreadsheetIdFromRes()
    await getSpreadsheetIdFromRes()
    // * getSpreadSheet()
    await getSpreadsheet()

    // * filter(questions)
    const questions = await filterSpreadsheet('questions')

    var formJsonArray = [questions.length]

    // * create empty form json object
    for(var i = 0; i < questions.length; i++) {
        formJsonArray[i] = { "question" : questions[i], "questiontype" : "short-answer", "answer" : ""}
    }

    // * return the json form data
    res.send(formJsonArray)

})

// on pressed for submit button
router.post("/submitform", (req, res) => {
    
    console.log(req)
    // * prepare answers, this just fills an 'answer' array with the user's responses
    var answers = Array(req.body.length)
    for(var i = 0; i < answers.length; i++){
        answers[i] = req.body[i].answer
    }
    // *update spreadsheet, this creates a json object with the date, followed by the answers {values: [date, answers...]}
    var sheetValues = {values: [DateTime.now().toFormat("MM/dd/yyyy HH:mm:ss") ,...answers]}
    console.log(sheetValues)
    updateSpreadsheet(sheetValues)
    // * updateClickup() will be triggered on callback after updating spreadsheet boi
    // res.send(req.body)

})

// for admin update clickup
router.post("/getUpdates", (req, res) => {
    console.log('updates')
    // updateClickUp()
})

router.post("/updateSpreadsheetId", async (req, res) => {
    // update google form with new spreadsheet Id
    await getSpreadsheetIdFromRes()
    await updateSpreadsheetId({values:[req.body.id]})
})

/* 
    Internal Methods
*/

const filterSpreadsheet = (target) => {
    if(target === 'questions'){
        // * return questions only
        const questions = spreadsheet[0].splice(1)
        return questions
    }else if (target === 'updates-only'){
        console.log('filtering for updates...')
        // * return new entries only
        var updates = spreadsheet[spreadsheet.length-1]
        console.log("updates " + updates)
        
        // var entry = spreadsheetLength-1
        // const lastCheckDate = fs.readFileSync('lastCheck.json', "utf8")
        // var lastCheckDateInSeconds = DateTime.fromFormat(JSON.parse(lastCheckDate).checkedOn, "MM/dd/yyyy HH:mm:ss")

        // var entriesTimeStamp = DateTime.fromFormat(spreadsheet[entry][0], "MM/dd/yyyy HH:mm:ss")

        // while(entriesTimeStamp > lastCheckDateInSeconds){
        //     updates.push(spreadsheet[entry])
        //     entriesTimeStamp = async () => await DateTime.fromFormat(spreadsheet[entry--][0], "MM/dd/yyyy HH:mm:ss").ts.catch(e => console.log(e))
        // }

        // // add to updates array
        // newCheck = {"checkedOn" : DateTime.now().toFormat("MM/dd/yyyy HH:mm:ss")}
        // fs.writeFileSync("lastCheck.json", JSON.stringify(newCheck))
        return(updates)
    }
    return spreadsheet
}

/*
    Google Sheets API stuff
*/

const getSpreadsheetIdFromRes = async () => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: creds, 
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        });


        // Create client instance for auth
        const client = await auth.getClient();
    
        // Instance of Google Sheets API
        const googleSheets = google.sheets({ version: "v4", auth: client });
        
        // get metadata
        const metaData = await googleSheets.spreadsheets.get({
            auth,
            spreadsheetId: spreadsheetIdRes,
        });
    
        // get rows
    
        const getQuestions = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId: spreadsheetIdRes,
            range: "Sheet1!B2"
        }).then(
            res => {
                spreadsheetId = res.data.values[0][0]
            }
        ).catch(error => {console.log(error)})

        // get data
    }catch(error){
        console.log(error)
    }
}

const getSpreadsheet = async () => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: creds,
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        });
        
        // Create client instance for auth
        const client = await auth.getClient();
    
        // Instance of Google Sheets API
        const googleSheets = google.sheets({ version: "v4", auth: client });
        
        // get metadata
        const metaData = await googleSheets.spreadsheets.get({
            auth,
            spreadsheetId,
        });
    
        // get rows
        const getSpreadsheetData = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: "Form Responses 1!A:L"
        }).then(
            res => {
                spreadsheet = res.data.values
                spreadsheetLength = res.data.values.length
            }
        ).catch(e => console.log(e))

        // get data
    }catch(error){
        console.log(error)
    }
}

const updateSpreadsheet = async (entry) => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: creds,
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        });
        
        // Create client instance for auth
        const client = await auth.getClient();
    
        // Instance of Google Sheets API
        const googleSheets = google.sheets({ version: "v4", auth: client });

        // update spreadsheet
        const appendEntry = await googleSheets.spreadsheets.values.append({
            auth,
            spreadsheetId,
            range: "Form Responses 1!A:L",
            valueInputOption: 'RAW',
            resource:{
                values: entry
              }
        }).then(
            () => {
                console.log('successfully added')
                updateClickUp()
            }
        )
    }catch(error){
        console.log(error)
    }
}

const updateSpreadsheetId = async (id) => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: creds,
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        });
        
        // Create client instance for auth
        const client = await auth.getClient();
    
        // Instance of Google Sheets API
        const googleSheets = google.sheets({ version: "v4", auth: client });

        // update spreadsheet
        const appendEntry = await googleSheets.spreadsheets.values.update({
            auth,
            spreadsheetId: spreadsheetIdRes,
            range: "Sheet1!B2",
            valueInputOption: 'RAW',
            resource:{
                values: id
              }
        }).then(
            () => {
                console.log('successfully added')
                updateClickUp()
            }
        )
    }catch(error){
        console.log(error)
    }
}

/*
    ClickUp API stuff
*/

const updateClickUp = () => {
    console.log('updating click up...')
    // * re-get spreadsheet
    // * then - filter new entries
    // * then - post new entries to click up
    getSpreadsheet()
    .then(() =>  sendToClickUp(filterSpreadsheet('updates-only')))
    .catch((error) => console.log(error))

}

const sendToClickUp = async (toSend) => {
    var teamId
    var spaceId
    var folderId
    var listId

    await axios.get('https://api.clickup.com/api/v2/team',  
        {   
            headers: 
            {
                'Authorization' : 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
                'Content-Type': 'application/json' 
            }
        }
    )
    .then(response => { teamId = response.data.teams[0].id })
    .catch(error=>console.log(error))

    // get the space id
    await axios.get('https://api.clickup.com/api/v2/team/36056643/space?archived=false&team_id='+teamId, 
        {
            headers: { 
                'Authorization' : 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
                'Content-Type': 'application/json' 
            }
        })
    .then(response => { spaceId = response.data.spaces[0].id })
    .catch(error => console.log(error))

    // get the folder id
    await axios.get('https://api.clickup.com/api/v2/space/'+spaceId+'/folder?archived=false&space_id='+spaceId, 
    {
        headers: { 
            'Authorization' : 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
            'Content-Type': 'application/json' 
        }
    })
    .then(response => { folderId = response.data.folders[0].id })
    .catch(error => console.log(error))

    // get the list id
    await axios.get('https://api.clickup.com/api/v2/folder/108053184/list?archived=false&folder_id='+folderId, 
    {
        headers: { 
            'Authorization' : 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
            'Content-Type': 'application/json' 
        }
    })
    .then(response => { listId = response.data.lists[0].id })
    .catch(error => console.log(error))

    // send new ticket object to clickup

    var data = {
        "name" : toSend[6],
        "description" : 
            "Description: " + toSend[7] + 
            "\n\nPersonality: " + toSend[9] + 
            "\n\nDeliverables: " + toSend[8] + 
            "\n\nSupporting Materials: " + toSend[11],
        "assignees" : [],
        "tags" : [],
        "status" : "TO DO",
        "priority" : null,
        "due_date" : DateTime.fromFormat(toSend[10], "MM/dd/yyyy").ts,
        "due_date_time": null,
        "time_estimate":  null,
        "start_date":  null,
        "start_date_time": null,
        "notify_all":  null,
        "parent": null,
        "links_to": null,
        "check_required_custom_fields": true,
        "custom_fields": [
            {
                "id" : "1d9efb51-4800-454e-8dfd-a26c5bc87cc9",
                "value" : toSend[5]
            },
            {
                "id" : "72be9bd9-49f3-400a-b2ff-1406c1b816fb",
                "value" : toSend[4]
            }
        ]
    }

    var mockData = JSON.stringify({
        "name" : "Rainier",
        "description": "New Task Description",
        "assignees": [],
        "tags": [
          "tag name 1"
        ],
        "status": "To do",
        "priority": 3,
        "due_date": 1508369194377,
        "due_date_time": false,
        "time_estimate": 8640000,
        "start_date": 1567780450202,
        "start_date_time": false,
        "notify_all": true,
        "parent": null,
        "links_to": null,
        "check_required_custom_fields": true,
        "custom_fields": [
          {
            "id": "0a52c486-5f05-403b-b4fd-c512ff05131c",
            "value": 23
          },
          {
            "id": "03efda77-c7a0-42d3-8afd-fd546353c2f5",
            "value": "Text field input"
          }
        ]
      });
      
      var config = {
        method: 'post',
        url: 'https://api.clickup.com/api/v2/list/174117670/task?list_id=180192031',
        headers: { 
          'Authorization': 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0', 
          'Content-Type': 'application/json'
        },
        data : data
      };
      
      axios(config)
      .then(function (response) {
        // console.log(JSON.stringify(response.data));
        console.log('ClickUp Has Been Updated!')
      })
      .catch(function (error) {
        console.log(error);
      });
}

app.use('/.netlify/functions/index', router)

module.exports.handler = serverless(app)









