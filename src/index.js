const fetch = require('node-fetch')
const cors = require('cors')
const express = require('express')
const { google } = require('googleapis')
const { application } = require('express')
var bodyParser = require('body-parser')
const fs = require('fs');

const serverless = require('serverless-http')

const app = express()

const router = express.Router()
app.use(cors())
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); 

const { DateTime } = require('luxon')
/* global variables */

var spreadsheetIdRes = "1DWoQIda4G1WrvXVgxTWInEITD5aftQV1RXoeFeC-DKk"
// var spreadsheetId = JSON.parse(fs.readFileSync('spreadsheetId.json', "utf8")).spreadsheetId
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
    const questions = filterSpreadsheet('questions')

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
    
    // * prepare answers
    var answers = Array(req.body.length)
    for(var i = 0; i < answers.length; i++){
        answers[i] = req.body[i].answer
    }
    // *update spreadsheet
    var sheetValues = {values: [DateTime.now().toFormat("MM/dd/yyyy HH:mm:ss") ,...answers]}
    updateSpreadsheet(sheetValues)
    // * updateClickup() will be triggered on callback after updating spreadsheet boi
    res.send(req.body)
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
        var updates = []
        var entry = spreadsheetLength-1
        const lastCheckDate = fs.readFileSync('lastCheck.json', "utf8")
        var lastCheckDateInSeconds = DateTime.fromFormat(JSON.parse(lastCheckDate).checkedOn, "MM/dd/yyyy HH:mm:ss")

        var entriesTimeStamp = DateTime.fromFormat(spreadsheet[entry][0], "MM/dd/yyyy HH:mm:ss")

        while(entriesTimeStamp > lastCheckDateInSeconds){
            updates.push(spreadsheet[entry])
            entriesTimeStamp = async () => await DateTime.fromFormat(spreadsheet[entry--][0], "MM/dd/yyyy HH:mm:ss").ts
        }

        // add to updates array
        newCheck = {"checkedOn" : DateTime.now().toFormat("MM/dd/yyyy HH:mm:ss")}
        fs.writeFileSync("lastCheck.json", JSON.stringify(newCheck))
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
            keyFile: "googlesheetscreds.json", 
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
        )

        // get data
    }catch(error){
        console.log(error)
    }
    // get new entries
    // spreadsheet = spreadsheet.splice(1)
}

const getSpreadsheet = async () => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: "googlesheetscreds.json",
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        });
        
        // Create client instance for auth
        const client = await auth.getClient();
    
        // Instance of Google Sheets API
        const googleSheets = google.sheets({ version: "v4", auth: client });
        
        // get metadata
        const metaData = await googleSheets.spreadsheets.get({
            auth,
            spreadsheetId: spreadsheetId,
        });
    
        // get rows
    
        const getQuestions = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId: spreadsheetId,
            range: "Form Responses 1!A:L"
        }).then(
            res => {
                spreadsheet = res.data.values
                spreadsheetLength = res.data.values.length
            }
        )

        // get data
    }catch(error){
        console.log(error)
    }
}

const updateSpreadsheet = async (entry) => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: "googlesheetscreds.json",
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
            keyFile: "googlesheetscreds.json",
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
                // updateClickUp()
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
    getSpreadsheet().then(() =>  sendToClickUp(filterSpreadsheet('updates-only')))

}

const sendToClickUp = async (toSend) => {
    var teamId
    var spaceId
    var folderId
    var listId
    await fetch('https://api.clickup.com/api/v2/team', {
        method: 'GET',
        headers: { 
            'Authorization' : 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
            'Content-Type': 'application/json' 
        }
    }).then(res => res.json())
      .then(json => {
        teamId = json.teams[0].id 
    })

    await fetch('https://api.clickup.com/api/v2/team/36056643/space?archived=false&team_id='+teamId, {
        method: 'GET',
        headers: { 
            'Authorization' : 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
            'Content-Type': 'application/json' 
        }
    }).then(res => res.json())
      .then(json => {
        spaceId = json.spaces[0].id 
    })

    await fetch('https://api.clickup.com/api/v2/space/'+spaceId+'/folder?archived=false&space_id='+spaceId, {
        method: 'GET',
        headers: { 
            'Authorization' : 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
            'Content-Type': 'application/json' 
        }
    }).then(res => res.json())
      .then(json => {
        folderId = json.folders[0].id
    })

    await fetch('https://api.clickup.com/api/v2/folder/108053184/list?archived=false&folder_id=108053184', {
        method: 'GET',
        headers: { 
            'Authorization' : 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
            'Content-Type': 'application/json' 
        }
    }).then(res => res.json())
      .then(json => {
        listId = json.lists[0].id
    })

    console.log('posting updates to clickup')
    console.log(toSend)
    await fetch('https://api.clickup.com/api/v2/list/174117670/task?list_id=180192031', {
        method: 'POST',
        body: JSON.stringify({
            "name" : toSend[0][6],
            "description" : 
                "Description: " + toSend[0][7] + 
                "\n\nPersonality: " + toSend[0][9] + 
                "\n\nDeliverables: " + toSend[0][8] + 
                "\n\nSupporting Materials: " + toSend[0][11],
            "assignees" : [],
            "tags" : [],
            "status" : "TO DO",
            "priority" : null,
            "due_date" : DateTime.fromFormat(toSend[0][10], "MM/dd/yyyy").ts,
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
                    "value" : toSend[0][5]
                },
                {
                    "id" : "72be9bd9-49f3-400a-b2ff-1406c1b816fb",
                    "value" : toSend[0][4]
                }
            ]
        }),
        headers: { 
            'Authorization' : 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
            'Content-Type': 'application/json' 
        }
    }).then(res => res.json())
      .then(()=> console.log("successfully added to click up!"))
      .then(json => {
        // console.log(json)
    })
}

app.use('/.netlify/functions/index', router)

module.exports.handler = serverless(app)









