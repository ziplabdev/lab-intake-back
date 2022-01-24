const fetch = require('node-fetch')
const cors = require('cors')
const cron = require('node-cron')
const fs = require('fs');
const { DateTime } = require('luxon')
const express = require('express')
const { google } = require('googleapis')
const { application } = require('express')
const app = express()
app.use(cors())

const spreadsheetId = "1Q_AP2lah0X6YfwP-Dt_PlSgK5DdR051oVVYornfTEW8"
var teamid
var questions = []
var spreadsheet = []
var newEntries = []
var dateTime = new DateTime()

app.get("/questions", (req, res) => {
    // *getSpreadSheet()
    // getSpreadsheet()
    // *filter(questions)
    filterSpreadsheet('questions')
    res.send(questions)
})

app.post("/submit", (req, res) => {
    // *update spreadsheet
    // updateSpreadsheet(req.body)
    // *update clickup
    // updateClickUp()
})

/*
gets entire spreadsheet and updates spreadsheet const
*/
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
            spreadsheetId,
        });
    
        // get rows
    
        const getQuestions = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: "Form Responses 1!A:L"
        }).then(
            res => {
                spreadsheet = res.data.values
            }
        )

        // get data
    }catch(error){
        console.log(error)
    }
    // get new entries
    spreadsheet = spreadsheet.splice(1)
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
        
        // get metadata
        // const metaData = await googleSheets.spreadsheets.get({
        //     auth,
        //     spreadsheetId,
        // });
    

        // update spreadsheet
        // const getQuestions = await googleSheets.spreadsheets.values.append({
        //     auth,
        //     spreadsheetId,
        //     range: "Form Responses 1!A:L"
        // }).then(
        //     res => {
        //         spreadsheet = res.data.values
        //     }
        // )
        // get data
    }catch(error){
        console.log(error)
    }
}

const filterSpreadsheet = (target) => {
    if(target === 'questions'){
        // * return questions only
        questions = spreadsheet[0].splice(1)
        return questions
    }else if (target === 'updates-only'){
        // * return new entries only
    }
    return spreadsheet
}

const updateClickUp = () => {
    // * get spreadsheet
    // getSpreadsheet()
    // * filter new entries
    // filterSpreadsheet(updatesOnly)
    // * post new entries to click up
    // logic here
}

const getNewEntries = () => {
    newEntries = spreadsheet
    // cut from end until entry dates > lastCheck
    const lastCheckDate = fs.readFileSync('lastCheck.json')
    console.log("last check date: " + lastCheckDate)

    var entryDate = newEntries[newEntries.length-1][0]
    console.log("entry date: " + entryDate)

    //format dates for comparison
    formatted_lastCheckDate = dateTime.fromFormat(lastCheckDate, 'MM/dd/yyyy HH:mm:ss').setZone("America/Los_Angeles")
    // formatted_entryDate = format(entryDate, 'MM/dd/yyy HH:mm:ss')


    //        format(new Date({year: 2020, month}, 'MM/dd/yyyy HH:mm:ss')

    console.log("last check (formatted): " + String(formatted_lastCheckDate))
    // console.log("entry date (formatted): " + formatted_entryDate.toString())

}



function saveCheckDate() {
    checkDate = dateTime.setZone("America/Los_Angeles")
    fs.writeFileSync('lastCheck.json', checkDate)
}



app.get("/newentries", (req, res) => {
    //save last date
    // console.log(newEntries)
    res.send(spreadsheet)
})

app.listen(5001)


const getTeamId = () => {
    fetch('https://api.clickup.com/api/v2/team?', 
    {
        method: 'GET',
        headers: {
            'Authorization': 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
            'Content-Type' : 'application/json'}
    }).then(res => {
        return res.json()
    }).then(data => {
        teamid = data.teams[0].id
    }).catch(error => console.log('ERROR'))
    // console.log('teamid' + teamid)
}

const getSpaceId = () => {
    var spaceID
    fetch('https://api.clickup.com/api/v2/team/'+{teamid}+'/space?archived=false&team_id='+{teamid},
    {
        method: 'GET',
        headers: {
            'Authorization': 'pk_26305353_3XX1NTVANB2LZ7CNPO1VIPFFEBNASSY0',
            'Content-Type' : 'application/json'}
    }).then(data => {console.log(data)})
}

const routine = () => {
    // check if new data is in speadsheet
    getSheetData() //gets all sheet data
    getNewEntries() //updates only new entries
    saveCheckDate()
    // add new data to clickup
        //get teamid
        //get spaceid
        //

}

// cron.schedule("0 * * * * *", routine)












