 const express = require('express');
const fs = require('fs');
const path = require('path'); 
const bodyParser = require('body-parser');
const app = express();  
const {Client } = require('pg')  
const session = require('express-session')
const { body, validationResult } = require('express-validator');
const multer = require('multer');  
const nodemailer = require('nodemailer');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');  
const { REFUSED } = require('dns'); 
const { error, Console } = require('console'); 
const jwt = require('jsonwebtoken');  
const { cli } = require('webpack');
const secretKey = 'key';
const pdfDocument = require('pdfkit'); 
const cron = require('node-cron');
 
const doc = new pdfDocument();

app.use(express.urlencoded({ extended: true }));

app.use('/reports', express.static(path.join(__dirname, 'public', 'reports')));

const client = new Client({
    host:"localhost",
    user:"postgres",  
    port:5432,
    password:"1234", 
    database:"DevOps"   
});

app.use(cors());
// Set up session middleware
app.use(session({   
    store: new pgSession({
        pool: client, // Connection pool
        tableName: 'session' // Use a different table name if desired
    }),
    secret: 'key', // Change to a secure string
    resave: false,
    saveUninitialized: false, // Ensure not to create sessions for non-authenticated users
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
    }
}));  
  
app.use((req, res, next) => {
    next();  
}); 

const PORT = process.env.PORT || 3001;  
 
app.use(bodyParser.json()); // Parse JSON request bodies

app.use(express.static('public')); 

// Add this to your server setup (e.g., in app.js or index.js)
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

const verifyAllToken = (req, res, next) =>{
    const token = req.headers['authorization'];  
    if(!token){
        return res.status(403).json({message: 'No token provided'});
    }
    jwt.verify(token.replace('Bearer ', ''), secretKey, (err, decoded) =>{
         if(err){
            return res.status(500).json({message: 'Failed to authenticate token'});
         }
         req.user = decoded;
         next();  
    });
};
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(function(req, res, next) {
    if (req.session && req.session.user) {
      req.session.touch();
    }
    next();
  });
 
client.connect(err => {
    if (err) {
        console.error('Failed to connect to database:', err);
    } else {
        console.log('Connected to database');
    }
});

/////////////////encrypt ////////////////
function encryptPassword(password){  
    let hashValue = 0x811C9DC5;
    let prime = 0x1000193;

    for(let i=0; i<password.length; i++){
        hashValue ^= password.charCodeAt(i);
        hashValue *= prime;
        hashValue += (hashValue << 1) + (hashValue >> 2);
    }
    return hashValue.toString(16).padStart(8, 0);
}
  
// Route to handle student registration
app.post('/api/v1/patient_table/addStudent', async (req, res) => {

    console.log('Console Log: ', req.body);
   
    const { studentNumber, password, lastName, firstName, email} = req.body;
    
    const hashedPassword = encryptPassword(password);   
    let redirectTo = '../Sign In/index.html';  

    try { 
        // Check if the student number exists in registereduser table
        const check = await client.query('SELECT active FROM patient_table WHERE studentnumber = $1', [studentNumber]);
        if (check.rowCount>0)
            {  
            if (check.rows[0].active==1)
                return res.status(200).json({message:"Student account is already activated. Please log in"});
            else
            {
                const registeredUserResult = await client.query('UPDATE patient_table SET active=1,patient_password=$2,patient_date=CURRENT_DATE, patient_name=$3, patient_surname=$4, patient_email=$5 WHERE studentnumber=$1 AND active=0 RETURNING active', [studentNumber, hashpassword, firstName, lastName, email]);
              if (registeredUserResult.rowCount>0)
                {  
                  if (registeredUserResult.rows[0].active==1) 
                      return res.status(200).json({message:"Student account activated",redirectTo});
                  else
                        return res.status(400).json({message:"Student account not activated"});
                }
            }
                
        }else{
            
             const insertResult = await client.query(
                'INSERT INTO patient_table (studentnumber, patient_password, patient_name, patient_surname, patient_email, active, patient_date) VALUES ($1, $2, $3, $4, $5, 1, CURRENT_DATE) RETURNING active', 
                [studentNumber, hashedPassword, firstName, lastName, email]
            );

            if (insertResult.rowCount > 0) {
                return res.status(200).json({ message: "Student account activated", redirectTo });
            } else {
                return res.status(400).json({ message: "Failed to create student account" });
            }  
        }

    } catch (err) {
        console.error('Error inserting student data:', err);
        res.status(500).json({ message: 'Error inserting student data' });
    }
});
   
//********************************************8 */
app.post('/api/v1/patient_table/login', async (req, res) => {
    const { email} = req.body;
    let password = req.body.password;
    password = encryptPassword(password); 
    console.log(password); 
  
    //const {adminpassword} = req.body;
    try{  
      
    const queryPatient = 'SELECT * FROM patient_table WHERE patient_email = $1 AND patient_password = $2 AND active = 1';
   
    const studentfound= await client.query(queryPatient, [email, password]);
        if (studentfound.rowCount>0) {   
            // User found, allow login
            const patientlog = studentfound.rows[0];
            req.session.patient_email = patientlog.patient_email;
            req.session.studentnumber = patientlog.studentnumber;
            req.session.patient_email = patientlog.patient_email;
            req.session.patient_surname = patientlog.patient_surname;
             
            return res.status(200).json({ 
                message: 'Login Successful', 
                redirectTo: '/Patient/record anxiety/index.html', 
                patient_surname: patientlog.patient_surname, 
                studentnumber: patientlog.studentnumber, 
                patient_email: patientlog.patient_email, 
                emp_number: null });
        }     
          
        const queryPsychologist = await client.query('SELECT emp_number,name,surname,email FROM system_psychologist WHERE email =$1 AND password = $2',[email,password]);
          
        if (queryPsychologist.rowCount>0) {
  
            const psycho = queryPsychologist.rows[0];
            req.session.emp_number = psycho.emp_number;
            req.session.email = psycho.email;
            req.session.patient_surname = psycho.name; 
            req.session.reg_number = psycho.surname;
            
            let redirectTo ='/Psychologist/pdashboard (Psychologist)/index.html';
             console.log("EMP Number is: ", req.session.emp_number);
            return res.status(200).json({redirectTo, studentnumber: null, emp_number: psycho.emp_number, email: psycho.email});  
        }  
        const queryAdministrator = await client.query('SELECT * FROM administrator WHERE email =$1 AND password = $2',[email,password]);
          
        if (queryAdministrator.rowCount>0) {

            const admin = queryAdministrator.rows[0];
            req.session.emp_number = admin.emp_number;
            req.session.patient_email = admin.email;
            req.session.patient_surname = admin.name;
            console.log(req.session.emp_number);
            let redirectTo ='/Admin/Admin Dashboard/index.html';
             console.log("EMP Number is: ", req.session.emp_number);
            return res.json({redirectTo})
        }  

        return res.status(401).json({message: 'Invalid email and password'});
     // Redirect to Psychologist dashboard page

 } catch (err) {
     console.error('Sign In Failed.', err);
     res.status(500).json({ message: 'Sign In Failed' });
 }
});  

//======

app.post('/api/v1/addUsersToView', async (req, res) => {
    //message back to user
    let msg;
    try{
        //getting all psychologists in system
        const patients = await client.query('SELECT studentnumber,patient_surname FROM patient_table');
        if (patients.rowCount===0) {
           return res.status(400).json({ message: 'No registered patients.'});
        }
     res.json({patients})

    } catch (err) {
     console.error('Error retrieving patients', err);
     res.status(500).json({ message: 'Error retrieving patients' });
    }
});

/////////////Deactivating patients account/////////////////////
app.post('/api/v1/patient_table/deletepatient', async (req, res) => {
    const studentNumber = req.session.studentnumber;
    let pPassword = req.body.pPassword;
    pPassword = encryptPassword(pPassword);
    try{ 
        const patient = await client.query("UPDATE patient_table SET active=0 WHERE studentnumber=$1 AND patient_password=$2", [studentNumber, pPassword]);
        if (patient.rowCount>0) {
            return res.status(201).json({redirectTo: '/General/Sign In/index.html'});
        }
        else{
            console.log("false");
            return res.status(500).json({message: 'Error deleting patient'});
        }
        //const redirectTo ='/General/Sign In/index.html';
        
    } catch(err){
        console.log("Error");   
        console.error('Error deleting patient', err);
        res.status(500).json({ message: 'Error deleting patient' });
    }
})

///////////Update Patients Account////////////////////
app.post('/api/v1/patient_table/updateaccount', async (req, res) => {
    const studentNumber = req.session.studentnumber;
    let firstName = req.body.firstName;
    console.log(firstName);
    let lastName = req.body.lastName;
    let email = req.body.email;
    let password = req.body.password;

    //console.log(password);
    if(password ==""){
        const getPassword = await client.query("SELECT patient_password FROM patient_table WHERE studentnumber=$1", [studentNumber]);
        if(getPassword.rowCount>0){
            password = getPassword.rows[0].patient_password;
        }
    }
    else{
        password = encryptPassword(password);
    }
    try{
        const update = await client.query("UPDATE patient_table SET patient_name = $1, patient_surname = $2, patient_email=$3, patient_password=$4 where studentnumber=$5", 
            [firstName ,lastName, email, password, studentNumber]);
            console.log(firstName);
        if(update.rowCount>0){
            return res.status(201).json({
                Message: 'Details successfully changed',
                redirectTo: '/Patient/record anxiety/index.html'
            });
        }
        else{
            console.log("false");
            return res.status(500).json({message: 'Error updating patient'});
        }
    } catch(err){
        console.log("Error");   
        console.error('Error deleting patient', err);
        res.status(500).json({ message: 'Error updating patient' });
    }
})

//////////Student Booking too often////////////////////////
app.get('/api/v1/patient_book/reportStudentBooks', async (req, res) => {
    try{
        const query = await client.query(`
            SELECT patient_email, COUNT(*) AS totalbooks
            FROM patient_book
            WHERE book_date >= NOW() - INTERVAL '4 WEEK'
            GROUP BY patient_email
            Order by totalbooks DESC
            `)
        
        let loopCount = query.rowCount > 10 ? 10 : query.rowCount;
        let emailArray = [];

        for(let i=0; i<loopCount; i++){
            const email = query.rows[i].patient_email;
            console.log(email);
            const studQuery = await client.query(`
                SELECT studentnumber FROM patient_table 
                WHERE patient_email = $1
                `, [email]);

            const count = query.rows[i].totalbooks;
            const number = studQuery.rows[0].studentnumber;

            const allCat = await client.query(`
                SELECT COUNT(*) AS total
                FROM recordtable
                WHERE record_date >= NOW() - INTERVAL '4 WEEK' AND studentnumber=$1
                `, [number])

            const catQuery = await client.query(`
                SELECT record_category, COUNT(*) AS mostrecorded
                FROM recordtable
                WHERE record_date >= NOW() - INTERVAL '4 WEEK' AND studentnumber=$1
                GROUP BY record_category
                ORDER BY mostrecorded DESC
                `, [number]);

            const total = allCat.rows[0].total;
            let percentage = 0;
            let most = 0;
            let category = 'null';
            if(catQuery.rowCount>0){
                most = catQuery.rows[0].mostrecorded;        
                percentage = ((most / total) * 100).toFixed(2);
                category = catQuery.rows[0].record_category
            }
            
            emailArray.push({email, count, number, category, percentage, total, most});
        }

        res.status(200).json({
            success: true,
            data: emailArray
        });
    }

    catch(error){
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
})
///////////////Get student////////////////////////
app.get('/api/v1/patient_table/getstudent', async (req, res) => {
    // Get student number from query parameters
    const number = req.query.number;

    if (!number) {
        return res.status(400).json({
            success: false,
            message: 'Student number is required'
        });
    }

    try {
        const query = await client.query(`SELECT patient_name, patient_surname FROM patient_table
            WHERE studentnumber=$1
            `, [number]);

        if (query.rowCount > 0) {
            res.status(200).json({
                success: true,
                pName: query.rows[0].patient_name,
                pSurname: query.rows[0].patient_surname,
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

/////////////////Get patient information///////////////////////////////////////
app.get('/api/v1/patient_table/getpatientdetails', async (req, res) => {
    const studentNumber = req.session.studentnumber;

    if (!studentNumber) {
        return res.status(400).json({ message: 'Student number not found in session' });
    }

    try{
        const update = await client.query("SELECT patient_name, patient_surname, patient_email FROM patient_table WHERE studentnumber = $1", 
            [studentNumber]);
        if(update.rowCount>0){
            return res.status(201).json({
                Message: 'Details successfully retrived',
                //redirectTo: '/Patient/record anxiety/index.html'
                studentNumber: studentNumber,
                name: update.rows[0].patient_name,
                surname: update.rows[0].patient_surname,
                email: update.rows[0].patient_email
            });

        }
        else{
            console.log("false");
            return res.status(500).json({message: 'Error getting information'});
        }
        
    } catch(err){
        console.log("Error");   
        console.error('Error deleting patient', err);
        res.status(500).json({ message: 'Error retrieving information' });
    }


   
});

app.post('/api/v1/addPsychologistToView', async (req, res) => {
    let sitePsychologist = req.body.sitePsychologist;

    if(!Array.isArray(sitePsychologist)){
        console.log("SiteUser is not array");
        sitePsychologist = [];
    }
    
    const nameQuery = 'SELECT * FROM system_psychologist';
    const result = await client.query(nameQuery);
    const rows = result.rows;
    
    rows.forEach(row => {
        sitePsychologist.push(row.emp_number);
    });
    res.json({
        message: "Record Successful",
        sitePsychologist: sitePsychologist
    });
});

//SHOW NAME OF PATIENT LOGGED IN START
app.get('/api/v1/patient_surname', (req, res) =>{
    const patient_email = req.session.patient_email;
    if(!patient_email){
        res.status(401).json({message: 'User access denied'});
    }

    const query = 'SELECT patient_surname FROM patient_table WHERE patient_email = $1';
    client.query(query, [patient_email], (err, result) =>{
                 if(err){
                    console.error('Error fetching patient_surname: ', err);
                    return res.status(500).json({message: 'Error fetching patient_surname'});
                 }

                 if(result.rows.length > 0){
                    const patient_surname = result.rows[0].patient_surname;
                    return res.json({ patient_surname });
                 }else{
                    return res.status(404).json({message: 'Patient log not found'});
                 }
    });
});

//SHOW NAME OF PERSON LOGGED IN END
// server.js

app.post('/api/v1/recordtable',   (req, res) => {
    //console.log("Session Number is before any thing: " ,  req.session );
    const { number, category, message, studentnumber } = req.body;
       
   // console.log("Received data:", { number, category, message, studentnumber });
    if (!studentnumber) {     
        console.error('Student number not found in session');
        return res.status(400).json({ message: 'Student number not provided' });
    }    
          
    //message box or text area on the record anxiety can be left empty, patient can decide not to write any let's not force
    if (!number || !category) {
        console.error('Missing required fields:', { number, category, message });
        return res.status(400).json({ message: 'Missing required fields' });
    }    
    const record_date_time = new Date();
  
    const query = 'INSERT INTO recordtable (studentnumber, record_level, record_category, record_description, record_date) VALUES ($1, $2, $3, $4, $5)';

    client.query(query, [studentnumber, number, category, message, record_date_time], (err, result) => {
        if (err) {
            console.error('Failed to insert record:', err); // Log the error for debugging
            return res.status(500).json({ message: 'Failed to insert record' });
        }
        res.status(201).json({ message: 'Record Successful' });
    });  
});    

app.get('/api/v1/getRecords', (req, res) => {
    const studentNumber = req.session.studentnumber || 'mockStudentNumber';
 
    if (!studentNumber) {
        return res.status(400).json({ message: 'Student number not found in session' });
    }

    const query = `
        SELECT record_level, record_category, record_description, record_date 
        FROM recordtable 
        WHERE studentnumber = $1
    `;

    client.query(query, [studentNumber], (err, result) => {
        if (err) {
            console.error('Failed to fetch records:', err);
            return res.status(500).json({ message: 'Failed to fetch records' });
        }

        res.status(200).json({ records: result.rows });
    });
});
    
//gettting number of users on the system
app.get('/api/v1/patient_table/getNoUsers', async (req, res) => {
    const studentNumber = req.session.studentnumber;
   //Counting number of patients, psychologists and admins on the system
    let numpatients;
    let numpsychologists;  
    let numadministrators;
    try{
        const patients = await client.query('SELECT * FROM patient_table');
        numpatients=patients.rowCount;
        const psychologists = await client.query('SELECT * FROM system_psychologist');
        numpsychologists=psychologists.rowCount;
        const admins = await client.query('SELECT * FROM administrator');
        numadministrators=admins.rowCount;
     // Redirect to Sign In page
     res.json({numpatients, numpsychologists, numadministrators})

 } catch (err) {
     console.error('Error getting users:', err);
     res.status(500).json({ message: 'Error getting Users' });
 }
});

//Display the number of loggins with the date of login
const getPatientsData = async () => {
    try {
      const res = await client.query(`
        SELECT DATE(patient_date) as login_date, COUNT(*) as count
        FROM patient_table
        WHERE patient_email LIKE '%@gmail.com'
        GROUP BY login_date
        ORDER BY login_date
      `);
      return res.rows;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
  //Endpoint below
  app.get('/api/v1/getLogins', async (req, res) => {
    try {
      const data = await getPatientsData();
      res.json({ records: data });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

//MOVING ALONG FOR MAKING SURE THE Psychologist CA
//SEE ALL THE RECORD IN THE SYSTEM, AND HOPEFULLY WHEN 
//THEY HOVER OVER THE LINE, THE CORRESPONDING STUDENT NUMBER APPEARS
const getRecordsData = async () => {
    try {
      const res = await client.query(`
        SELECT studentnumber, record_level
        FROM recordtable
        ORDER BY studentnumber
      `); 
      return res.rows;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
//Initiating the endpoint
app.get('/api/v1/getAllAnxietyLevels', async (req, res) => {
    try {
      const data = await getRecordsData();
      res.json({ records: data });
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }); 

//JUMPING TO FORGOT PASSWORD GUYS
// app.use(session({
//    secret: 'key',
//    resave: false,
//    saveUninitialized: true
// }));  

//SIPHA YOU CAN START HERE GOING DOWN

let testAccount = nodemailer.createTestAccount();
//Tranport to send email reset or special code 
const transporter = nodemailer.createTransport({ //Hey transporter like the Movie HAHA
   service: 'gmail',
   host: 'smtp.gmail.com',
   port: 587,
   secure: false,
   auth:{
   user: 'mccauleyashu18@gmail.com',
   pass: 'nomfgoffbumcwasd' 
   }
});

//Create me that random 4 number code
function generateCode(){
    return Math.floor(1000 + Math.random() * 900).toString()
}

app.post('/api/v1/forgot-password', async (req, res) =>{

    try{
   const {studentNumber, email } = req.body;

 //  Just check for me that the student exists
   const query = 'SELECT * FROM patient_table WHERE studentnumber = $1 AND patient_email = $2';
   const result = await client.query(query, [studentNumber, email]);

   console.log('PATIENT FOUND');

   if(result.rows.length === 0){
    return res.status(404).json({message: 'Student can not be found'});
   }   

   //Get and store the reset code man
   const resetCode = generateCode();
   console.log(`Generated reset code: ${resetCode} for studentNumber: ${studentNumber}, email: ${email}`);
 
   console.log('RESET CODE GENERATED'); 

   const stringCode = resetCode.toString();   

  //const insertQuery = 'INSERT INTO patient_table (studentnumber, patient_email, patient_resetcode) VALUES ($1, $2, $3) ON CONFLICT (patient_email) DO UPDATE SET patient_resetcode = $3';
  //MAJOR CHANGE IN QUERY LETS GOOOO
  // const insertQuery = 'INSERT INTO patient_table (studentnumber, patient_email, patient_resetcode) VALUES ($1, $2, $3) ON CONFLICT (patient_email) DO UPDATE SET patient_resetcode = EXCLUDED.patient_resetcode';
   const codeQuery = 'UPDATE patient_table SET patient_resetcode = $1 WHERE studentnumber=$2 AND patient_email=$3'
  
  //await client.query(insertQuery, [studentNumber, email, stringCode]);
  await client.query(codeQuery, [stringCode, studentNumber, email]);
  
   //send me that code through email my G  
   const mailingDetails = {       
    from: 'mccauleyashu18@gmail.com',
    to: email,
    subject: 'Password Reset Code',
    text: `Your Password Reset Code is: ${stringCode}`
   } 

   console.info('EMAIL SENT PASS');
 
   //let me check that password code yooooo
   transporter.sendMail(mailingDetails, function(error, info){
          if(error){

            console.log( 'CANT SEND EMAIL', error);
            return res.status(500).json({success: false, message: 'Failed to send email'});
          }else{ 
         // req.session.email = email; 
         req.session.email = email;   
            console.log('SUCCESSFULLY SENT EMAIL');  
            res.status(200).json({ success: true, message: 'Reset code sent to your email', redirectTo: '/General/Submit Code/index.html' });
             
            //res.json({valid: true, redirectTo: '/resetpassword/index.html'});
          }     
   });         
}catch(error){  
    console.log('Error handling forgot password request:', error); // Log the error for debugging
    res.status(500).json({ success: false,  message: 'Internal server error' });
}    
});

//Testing that Submit button on the Reset Code Entry 
app.post('/api/v1/submitcode', async (req, res) =>{
    try{ 
        const {resetCode} = req.body;      
              
        console.log('Received reset code: ', resetCode)
        const query = 'SELECT patient_email FROM patient_table WHERE patient_resetcode = $1';
        const results = await client.query(query, [resetCode.toString()]);
  
        if(results.rows.length > 0){  
            const email = results.rows[0].patient_email;
            req.session.email = email; // Store email in session
 
        //    res.status(200).json({success: true, message: 'Nice Nice Nice', redirectTo: '/resetpassword/index.html'});

            res.status(200).json({success: true, message: 'Nice Nice Nice', redirectTo: '/General/resetpassword/index.html' });
            console.log('Success with code legit');      
   
        }else{  
            res.status(400).json({success: false, message: 'Invalid reset code' })
        }          
    }catch(error){
        console.error('Error Handling reset code submission', error);
        res.status(500).json({success: false, message: 'Internal Server Error'});
    }
});    

//Now reseting the password to replace or update the old new password

app.post('/api/v1/newPassword' , async(req, res) =>{
    try{
           //don't see need to keep resetcode but okay gonna try anyway
          let {newPassword} = req.body;
          const email = req.session.email;

          newPassword = encryptPassword(newPassword);
           if(!email){  
             return res.status(400).json({success: false, message: 'Session expired for new password ashia'});
           }    

          const query = 'SELECT * FROM patient_table WHERE patient_email = $1';
          const results = await client.query(query, [email]);
                
          if (results.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid reset code ashia boiiiiii' });
        }
           
        const updateQuery = 'UPDATE patient_table SET patient_password = $1 WHERE patient_email = $2';
        await client.query(updateQuery, [newPassword, email]);  
        res.status(200).json({ success: true, message: 'Password updated successfully' });
        console.log( 'Password updated successfully');
         
    }catch(error){   
        console.log("Error at: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });  
    }
}); 
   
//********************************************************************//
//NOW FOCUSING ON PSYCHOLOGIST BEING ABLE TO UPLOAD A MATERIAL, GONNA START WITH PDF FILE FIRST THEN MOVE FROM THERE

//NEW START HERE

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, path.join(__dirname,  'public' ,'uploads'));    //FOURTH ONEEEE
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }   
});    
   
const upload = multer({ storage: storage });
  
// Serve static files from the 'uploads' directory 
app.use('/uploads', express.static(path.join(__dirname,  'public' ,  'uploads')));   //FIRST ONEEEE

app.post('/api/v1/addPublicMaterial', upload.single("material_file"), async (req, res) => {
    const { material_name } = req.body;
    const material_file = req.file.filename;
    const patient_email = req.session.patient_email; // Assuming email is stored in session
         
    const query = `   
        INSERT INTO manage_material (material_name, material_file, upload_date, patient_email)
        VALUES ($1, $2, NOW(), $3) RETURNING *; 
    `;  
    const datz = [material_name, material_file, patient_email ];

    try {
        const result = await client.query(query, datz);
        const material = result.rows[0];
        res.status(200).json({ 
            material_name: material.material_name, 
            material_file: material.material_file,   
            // upload_date: new Date(material.upload_date).toISOString() 
            upload_date: new Date(material.upload_date).toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error saving material to the database:', error);
        res.status(500).json({ message: 'Failed to save material to the database' });
    }
});
  
app.post('/api/v1/addPrivateMaterial', upload.single("material_file"), async (req, res) => {
    const { material_name, studentnumber } = req.body;
    const material_file = req.file.filename; 
    const patient_email = req.session.patient_email; // Assuming email is stored in session

    const query = ` 
        INSERT INTO manage_material (material_name, material_file, upload_date, patient_email, studentnumber)
        VALUES ($1, $2, NOW(), $3, $4) RETURNING *;   
    `;   
    const datz = [material_name, material_file, patient_email, studentnumber ];

    try {
        const result = await client.query(query, datz);
        const material = result.rows[0];
        res.status(200).json({ 
            material_name: material.material_name, 
            material_file: material.material_file,   
            // upload_date: new Date(material.upload_date).toISOString() 
            upload_date: new Date(material.upload_date).toISOString().split('T')[0]
        });
    } catch (error) {  
        console.error('Error saving material to the database:', error);
        res.status(500).json({ message: 'Failed to save material to the database' });
    }
});

//WAIT BELOW 
app.get('/api/v1/materials', async (req, res) => {

    const {studentnumber} = req.query;
    let query;
    let datz;

    if(studentnumber){
     query = `
            SELECT material_name, material_file, DATE(upload_date) as upload_date
            FROM manage_material
            WHERE studentnumber = $1
        `;
        datz = [studentnumber];
    }else{

        query = `
            SELECT material_name, material_file, DATE(upload_date) as upload_date
            FROM manage_material
            WHERE studentnumber IS NULL OR studentnumber = ''
        `;
        datz = [];
    }
    try {   
        const result = await client.query(query, datz);

        const materials = result.rows.map(material => ({
            material_name: material.material_name,
            material_file: material.material_file,
            upload_date: material.upload_date
        })); 
        res.status(200).json({ materials });  
   
    } catch (error) {
        console.error('Error fetching materials from the database:', error);
        res.status(500).json({ message: 'Failed to fetch materials from the database' });
    }
});

// Route to handle material viewing
app.get("/api/v1/viewMaterial/:material_file", (req, res) => {
    const material_file = req.params.material_file;
    const filePath = path.join(__dirname, 'public'  , 'uploads', material_file);   //SECOND ONEEEEE

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Failed to send material.');
        }
    });  
}); 

//YEAH START
app.delete("/api/v1/deleteMaterial/:material_file", async (req, res) => {
    const material_file = req.params.material_file;
    const query = "DELETE FROM manage_material WHERE material_file = $1 RETURNING *";
    const values = [material_file];
 
    try {
        const result = await client.query(query, values);
        if (result.rows.length > 0) {
            const filePath = path.join(__dirname,  'public'  ,'uploads', result.rows[0].material_file);    //THIRD ONEEEE
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                }
            });
            res.status(200).json({ message: 'Material deleted successfully' });
        } else {
            res.status(404).json({ message: 'Material not found' });
        }
    } catch (error) {
        console.error('Error deleting material from the database:', error);
        res.status(500).json({ message: 'Failed to delete material from the database' });
    }
});
//BACK ENDS HERE

//**********************************************************/
//Adding Employee into system
app.post('/api/v1/patient_table/addEmployee', async (req, res) => {
    var {empno,name,surname,email,password} = req.body;
    password=encryptPassword(password);
    //message back to user
    let msg;   
    try{
        //searching for psychologist/administrator6
        const RegisteredEmployee = await client.query('SELECT * FROM employee WHERE emp_number = $1',[empno]);
        if (RegisteredEmployee.rowCount===0) {
            console.log(`No employee found with emp_number: ${empno}`);
           return res.status(400).json({ message: 'Employee does not exist'});
        }  
        var role=RegisteredEmployee.rows[0].role;
        console.log('I got here? Yes?');
        console.log('Role found: ', role);
        //adding psychologist
        if (role=="Psychologist")
        {
            const query = `  
              INSERT INTO system_psychologist (emp_number, name, surname, email, password)
             VALUES ($1, $2, $3, $4, $5)
                                     `;
             await client.query(query, [empno,name,surname,email,password]);

        }  
        //adding administrator
        else if(role=="IT"){  
            const query = `
              INSERT INTO administrator (emp_number, name, surname, email, password)
             VALUES ($1, $2, $3, $4, $5)
                                     `;
             await client.query(query, [empno,name,surname,email,password]);
            
        }else{
            return res.status(400).json({message: 'Role is not Psychologist Nor IT. Have a Nice Day'})
        } 
      msg = 'Employee was successfully added';
     // Redirect to Sign In page
     let redirectTo = '../Sign In/index.html';
     res.json({msg,redirectTo})

 } catch (err) {
     console.error('Error inserting employee data:', err);
     res.status(500).json({ message: 'Error inserting employee data' });
 }
    
});

//**********************************************************/
//Removing psychologist from db
app.delete('/api/v1/system_psychologist/removepsychologist', async (req, res) => {
    var {empno} = req.body;
    let msg;
    try{   
     // Removing the psychologist into db
     const query = `DELETE FROM system_psychologist WHERE emp_number = $1 RETURNING emp_number,name,surname;`;
      const result= await client.query(query, [empno]);
      if (result.rowCount===0)
        {
            msg='Psychologist is not on the system'
            return res.status(400).json({msg});
        }
     msg=result.rows[0].name+' '+ result.rows[0].surname+' with employee number: '+result.rows[0].emp_number+' has been removed succesfully.';
     res.json({msg});

 } catch (err) {
     console.error('Error removing psychologist', err);
     res.status(500).json({ message: 'Psychologist could not be removed' });
 }
});
  
//**********************************************************/
//Retrieving psychologist data
app.post('/api/v1/Users/get_User', async (req, res) => {
    var {id} = req.body;
    //message back to user
    let name;
    let surname;
    let email;
    let Qualification;
    try{
        const psychologist = await client.query('SELECT * FROM system_psychologist WHERE emp_number = $1',[id]);
        const patient = await client.query('SELECT * FROM patient_table WHERE studentnumber = $1',[id]);
        const admin = await client.query('SELECT * FROM administrator WHERE emp_number = $1',[id]);

        //handling for getting psychologist details
        if (psychologist.rowCount>0) {
                name=psychologist.rows[0].name;
                surname=psychologist.rows[0].surname;
                email=psychologist.rows[0].email;
                const psychologist_details = await client.query('SELECT qualification FROM employee WHERE emp_number = $1',[id]);
                Qualification=psychologist_details.rows[0].qualification;
        }
        //handling for getting patient details
        else if (patient.rowCount>0) {
            if (patient.rows[0].active==1){
            return res.status(400).json('Student number already registered on system.');
            }
            name=patient.rows[0].patient_name;
            surname=patient.rows[0].patient_surname;
            email=patient.rows[0].patient_email;
            Qualification="";
            
        }
        else if (admin.rowCount>0) {
            name=admin.rows[0].name;
            surname='admin';
            email=admin.rows[0].email;
        } 
        else{
            return res.status(200).json({PatientNotFound: true});
        }
        return res.status(200).json({name,surname,email,Qualification});

 } catch (err) {
     console.error('Error finding User:', err);
     res.status(500).json('Error finding User');
 }
    
});
  
//**********************************************************/
//Getting all Users on system
app.get('/api/v1/system_psychologist/get_psychologists', async (req, res) => {
    //message back to user
    let msg;
    try{
        //getting all psychologists in system
        const psychologists = await client.query('SELECT system_psychologist.emp_number,system_psychologist.name,system_psychologist.surname FROM system_psychologist INNER JOIN employee ON employee.emp_number=system_psychologist.emp_number');
        const patients = await client.query('SELECT studentnumber,patient_surname,patient_email FROM patient_table ');
        const admins = await client.query('SELECT emp_number,name,surname,email FROM administrator ');
        
     res.json({psychologists,patients,admins})

 } catch (err) {
     console.error('Error retrieving psychologists', err);
     res.status(500).json({ message: 'Error retrieving psychologists' });
 }
    
});

//**********************************************************/
//Updating psychologist data
app.post('/api/v1/system_psychologist/update_psychologist', async (req, res) => {
    var {psnumber,fname,ssurname,Email,Qualification} = req.body;
    //message back to user
    let msg;
    try{
        const psychologist = await client.query('UPDATE system_psychologist SET name=$2, surname=$3, email=$4, WHERE regnumber = $1',[psnumber,fname,ssurname,Email,Qualification]);
        if (psychologist.rowCount===0) {
            msg= 'Update failed';
            res.json({msg});
           return res.status(400).json({ message: 'Update failed'});
        } 
     // Selecting the recent query
     const updatedversion = await client.query('SELECT * FROM system_psychologist WHERE regnumber = $1',[psnumber]);
        if (updatedversion.rowCount===0) {
            msg= 'Psychologist does not exist';
            res.json({msg});  
           return res.status(400).json({ message: 'Psychologist does not exist'});
        } 
     // Getting psychologist details 
     let name=updatedversion.rows[0].name;
     console.log(updatedversion.rows[0]);
     console.log(updatedversion.rowCount);
     let surname=updatedversion.rows[0].surname;
     let email=updatedversion.rows[0].email;
     let qualification=updatedversion.rows[0].qualification;
     //returning updated version
     res.status(200).json({name,surname,email,qualification});

 } catch (err) {
     console.error('Error finding psychologist:', err);
     res.status(500).json({ message: 'Error finding psychologist' });
 }
    
});

//PSYCHOLOGIST ABLE TO DELETE MATERIAL (DELETE BUTTON)
app.delete('/api/v1/deleteMaterial/:filename' , async(req, res) =>{

    const {filename} = req.params;
    try{

    const query = `
            DELETE FROM manage_material
            WHERE material_file = $1
            RETURNING material_file
        `;
    const result = await client.query(query, [filename]);
    if(result.rows.length === 0){
        return res.status(400).json({error: 'Material not found'});
    }

    const materialFile = result.rows[0].material_file;
    const pdffilepath = path.join(__dirname,'uploaded_material', materialFile);

    fs.unlink(pdffilepath, (err) =>{
        if(err){
            console.error('Error deleting that material boiii: ', err);
            return res.status(500).json({error: 'Failed to delete the material file'});
        }

        res.status(200).json({message: 'Material deleted successfully'});
    });
}catch(error){
    console.err('Error deleting material: ', error);
    res.status(500).json({error: 'Failed to delete material'});
}
});

app.get('/api/v1/getTimeSelected', (req, res) =>{
     
    const query = `
        SELECT DISTINCT
            TO_CHAR(record_date, 'YYYY-MM') AS period
        FROM recordtable
        ORDER BY period;
    `;

    client.query(query, (err, result) =>{
        if(err){
            console.error('Failed to fetch time selected', err);
            return res.status(500).json({message: 'Failed to fetch time selected time'});
        }

        res.status(200).json({message: result.rows});
    });
});

//DISPLAY MATERIAL ON PATIENT PAGE
app.get('/api/v1/getPrivateMaterial', async (req, res)=>{

    const studentnumber = req.session.studentnumber || req.query.studentnumber;
      
    try {
        // Fetch public materials
        const publicQuery = 'SELECT material_name, material_file FROM manage_material WHERE studentnumber IS NULL';
        const publicResult = await client.query(publicQuery);
        const publicMaterials = publicResult.rows.map(material => ({
            name: material.material_name,
            url: `/uploads/${material.material_file}`
        }));

        // Fetch private materials
        const privateQuery = 'SELECT material_name, material_file FROM manage_material WHERE studentnumber = $1';
        const privateResult = await client.query(privateQuery, [studentnumber]);
        const privateMaterials = privateResult.rows.map(material => ({
            name: material.material_name,
            url: `/uploads/${material.material_file}`
        }));

        res.status(200).json({ publicMaterials, privateMaterials });
    } catch (error) {
        console.error('Error fetching pdf from the database', error);
        res.status(500).json({ message: 'Failed to fetch pdf from the database' });
    }  
});   

app.get('/api/v1/getPublicMaterial', async (req, res)=>{

    const query = 'SELECT material_name, material_file FROM manage_material WHERE studentnumber IS NULL';
    console.log("Student Number is:", req.session.studentnumber); 

    try{
        const result = await client.query(query);

        const materials = result.rows.map(material =>({
            name: material.material_name,
            url: `/uploads/${material.material_file}` 
        }));  
        res.status(200).json({materials});
    }catch(error){  
            console.error('Error fetching pdf from the database', error);
            res.status(500).json({message: 'Failed to fetch pdf from the dataaaaaa base'});
    }
});

//SET ME THAT APPOINTMENT(STORE THE DATE AND TIMES THE PSYCHOLOGIST SETS ON THEIR CALENDER)
app.post('/api/v1/setAppointment', async (req, res) =>{
          
         const selectedDates = req.body;
         const patient_email = req.session.patient_email;
         const emp_number = req.session.emp_number;
         if(!patient_email){ 
            res.status(401).json({message: 'User email not found'});
            return;
         }
      
         try{  
             for (const [date, times] of Object.entries(selectedDates)){
               console.log('Get time: ', date);
                for (const time of times){
                    console.log('Inserting time: ', time, ' for date: ', date, ' emp_number: ', emp_number);

                const query ='INSERT INTO psychologistbook (psychologist_date, psychologist_time, emp_number) VALUES ($1, $2, $3)';
                await client.query(query, [date, time, emp_number]);
               
                // Check if the insert query affected any rows
                const result = await client.query('SELECT COUNT(*) FROM psychologistbook WHERE psychologist_date = $1 AND psychologist_time = $2 AND emp_number = $3', [date, time, emp_number]);
                if (result.rows[0].count === '0') {
                    console.error('Insertion failed for date: ', date, ' time: ', time);
                    } else {
                    console.log('Successfully inserted date: ', date, ' time: ', time);
                    }
                }  
            } 
            res.status(200).json({message:'Appointment successfully scheduled.'});  
         }catch(error){
            console.error('Error saving times to the database ' , error);
            res.status(500).json({message: 'Failed to set appointment'});
         }
});  

//GOING TO NEED THIS FOR CHANGING THE PROFILE DETAILS OF THE PATIENT START
//PARTICULAR THE NAME AND EMAIL START

function checkEmailSession(req, res, next){
    if(req.session.patient_email){
         return next();
    }else{
        res.status(401).json({message: 'Email Not Valid'});
    }
}

app.put('/api/v1/updateDetaisl', checkEmailSession , async(req, res) =>{
      const { new_patient_email , new_patient_surname} = req.body;
      const current_patient_email = req.session.patient_email;

      try{
                await client.query('BEGIN');

                if(new_patient_email !== current_patient_email){
                    const CheckEmailQuery = 'SELECT * FROM patient_table WHERE patient_email = $1';
                    const CheckEmailResult = await client.query(CheckEmailQuery, [new_patient_email]);
               
                   if(CheckEmailResult.rows.length > 0 ){
                    return res.status(400).json({message: 'Email in use, so cannot change to it'});
                   }
                }

        const updatequery = `
            UPDATE patient_table
            SET patient_email = COALESCE($1, patient_email),
                patient_surname = COALESCE($2, first_name)
            WHERE patient_email = $3
        `;

        await client.query(updatequery, [new_patient_email || current_patient_email, new_patient_surname, current_patient_email]);
        await client.query('COMMIT');
        
        if(new_patient_email && new_patient_email !== current_patient_email){
            req.session.email = new_patient_email;
        }
            res.status(200).json({message: 'UPDATED NICELY DONE'});
      }catch(error){
           await client.query('ROLLBACK');
           console.error('Error updating patient details: ', error);
           res.status(500).json({message: 'Failed to update those particulars'});

      }
});

//GOING TO NEED THIS FOR CHANGING THE PROFILE DETAILS OF THE PATIENT END
//PARTICULAR THE NAME AND EMAIL END

//PATIENT BEING ABLE TO BOOK A PSYCHOLOGITST OF THEIR CHOICE START
  app.post('/api/v1/confirmappointment', async(req, res)=>{
       const { pickdate, picktime, psychologist_name, more_info } = req.body;
       const patient_email = req.session.patient_email;

       if(!patient_email){
        return res.status(401).json({message: 'USER EMAIL DOES NOT EXIST'});
       }


       try{
               const get_patient_email = 'SELECT patient_surname FROM patient_table WHERE patient_email = $1';
               const get_patient_result = await client.query(get_patient_email, [patient_email]);

               if(get_patient_result.rows.length === 0){
                return res.status(404).json({message: 'PATIENT WITH ASSOCAITED EMAIL IS NOT FOUND'});
               }

               const gotten_patient_surname = get_patient_result.rows[0].patient_surname;

               const query = `
            INSERT INTO psychologistbook (patient_email, psychologist_name, book_date, book_time, more_info)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;


        //PLAYING AROUND START
        //HAVE TO ACTUALLY USE THE ONE BELOW, BUT WHY NO LETS EXPERIMENT
      //  await client.query(query, [  patient_email ,gotten_patient_surname, psychologist_name, pickdate, picktime, more_info]);

        //PLAYING AROUND END
        await client.query(query, [gotten_patient_surname, psychologist_name, pickdate, picktime, more_info]);
         
        res.status(200).json({message: 'you have booked an appointment with a psychologist, nicely done'});
       }catch(error){
                  console.error('Error confirming appointment', error);
                  res.status(500).json({message: 'Failed to confirm appointment'});
       }
  }); 

//PATIENT BEING ABLE TO BOOK A PSYCHOLOGITST OF THEIR CHOICE END

//ADMIN CAN VIEW ALL THE USERS IN THE SYSTEM, EXCLUDING THE ADMIN(S)

app.get('/api/v1/viewAll', async(req, res) =>{
       try{
        const query = `
            SELECT studentnumber, patient_email 
            FROM patient_table 
            WHERE patient_email LIKE '%@gmail.com' 
            OR patient_email LIKE '%@pservice.com'
        `;
        const result = await client.query(query);
        res.status(200).json(result.rows);
       }catch(error){
              console.error('Error fetching all users from patient_table', error);
              res.status(500).json({message: 'Failed to fetch users from patient_table'})
       }
});

//PSYCHOLOGIST VIEW ALL PATIENT IN THE SYSTEM
app.get('/api/v1/viewAllPatients', async(req, res) =>{
    try{
     const query = `
         SELECT studentnumber, patient_email, patient_surname, patient_name
         FROM patient_table`;
     const result = await client.query(query);
     res.status(200).json(result.rows);
    }catch(error){
           console.error('Error fetching all users from patient_table', error);
           res.status(500).json({message: 'Failed to fetch users from patient_table'})
    }5
});

//DISPLAY PATIENT DETAILS WHEN STUDENT NUMBER IS CLICKED
app.get('/api/v1/PatientDetails', async(req, res) =>{
        const studentnumber = req.query.studentnumber;

        try{
               const query = `
            SELECT studentnumber, patient_email , patient_date, patient_surname, patient_name
            FROM patient_table  
            WHERE studentnumber = $1
        `;
           const result = await client.query(query, [studentnumber]);
           if(result.rows.length === 0){
               return res.status(404).json({message: 'Yeah student number not found'});
           }

           res.status(200).json(result.rows[0]);
        }catch(error){
                console.error('Error fetching those details', error);
                res.status(500).json({message: 'Yeah failed to fetch those particulars yes sir'});
        }
});

//POPULATE THE TABLE ON THE RIGHT HAND SIDE OF THE PAGE FOR THE CLICKED STUDENT NUMBER
   
app.get('/api/v1/PatientHistory', async (req, res) =>{
    const studentnumber = req.query.studentnumber;

    try{
        const query = `
            SELECT record_level, record_category, record_description, record_date
            FROM recordtable 
            WHERE studentnumber = $1
        `;
        const result = await client.query(query, [studentnumber]);
        
        if(result.rows.length === 0 ){
            return res.status(404).json({message: 'No record found'});
        }
        res.status(200).json(result.rows);
    }catch(error){
            console.error('Error fetch record history', error);
            res.status(500).json({message: 'Failed to fetch student number records'});
    }
});

//FILL UP THE GRAPH FROM THE RECORD TABLE ON THE CLICKED STUDENT NUMBER
app.get('/api/v1/getRecordData', async(req, res) =>{
    const { studentnumber  }= req.query;
    try{  
        //GET THE STUDENUMBER THEN USE THAT TO GET THE EMAIL THEN DO THAT NICE SELECT SQL QUERY
        const get_patient_email = `
            SELECT patient_email 
            FROM patient_table 
            WHERE studentnumber = $1
        `;
         
        const get_patient_email_result = await client.query(get_patient_email, [studentnumber]);
        const patient_email = get_patient_email_result.rows[0]?.patient_email;
        if(!patient_email){
            return res.status(404).json({error: 'Could not get the patient_email linked to the student number in the url Params'});
        }
       
        const query = ` 
            SELECT attend_status, COUNT(*) AS count
            FROM attend_table  
            WHERE patient_email = $1 GROUP by attend_status`;
            
        const result = await client.query(query, [patient_email]);
        res.status(200).json(result.rows);
      //  console.log("Graph display");    
    }catch(error){
        console.error('Error here getting info for the graph', error);
        res.status(500).json({message: 'Nights are hard'});
    }
}); 

//REGISTRATION GRAPH TO KNOW WHEN THEY REGISTERED
app.get('/api/v1/registrationGraph', async(req, res) =>{
   try{ 
  /*  const query = `
            SELECT patient_date, COUNT(*) AS book_count
            FROM patient_table
            GROUP BY patient_date
            ORDER BY patient_date
        `;  */
        const query = `
            SELECT date_booked, COUNT(*) AS book_count
            FROM patient_book
            GROUP BY date_booked
            ORDER BY date_booked       
        `;

        const result =await client.query(query);
        res.status(200).json(result.rows);
  
   }catch(error){
    console.error('Error fetching dates', error);
    res.status(500).json({message: 'Failed to fetch data'})
   }
});

app.get('/api/v1/patientCategory', async(req, res) =>{
    try{ 

     const query = `
             SELECT CASE
               WHEN record_level BETWEEN 1 AND 3 THEN 'Mild'
               WHEN record_level BETWEEN 4 AND 6 THEN 'Moderate'
               WHEN record_level BETWEEN 7 AND 10 THEN 'Severe'
            END AS level_group,
            COUNT(*) AS count 
            FROM recordtable
            GROUP BY level_group
            ORDER BY level_group
         `;
   
         const result =await client.query(query);
         res.status(200).json(result.rows);
    }catch(error){
     console.error('Error fetching dataes', error);
     res.status(500).json({message: 'Failed to fetch data'})
    }
 });   
    
//dDISPLAY PSYHCOLOGIST NAME IN DROP DOWN MENU IN THE PATIENT CALENDER
app.get('/api/v1/psychologist_name', async(req, res) =>{
    try {  
       const query = ` 
           SELECT pb.emp_number, sp.name, sp.surname
           FROM psychologistbook pb
           INNER JOIN system_psychologist sp ON pb.emp_number = sp.emp_number
       `;  
       const result = await client.query(query);     
       res.json(result.rows);
    } catch (error) {    
       console.error(error.message);
       res.status(500).send('Server Error');
    }
});

//PULL OR GET DATE ASSOCIATED WHEN A PSYCHOLOGIST NAME IS SELECTED
app.get('/api/v1/psychologist_date/:emp_number', async(req, res) =>{
   const {emp_number} = req.params;  
   try { 
        const query = `
          SELECT DISTINCT psychologist_date FROM psychologistbook WHERE emp_number = $1
        `;  

       const result = await client.query(query,[emp_number]);
       //console.log("Query result: ", result.rows); // Log the result
       res.json(result.rows);  

   } catch (error) {  
       console.error("Failed fetchong info: ", error);
       res.status(500).send('Internal server error');
   }
});

app.get('/api/v1/notbooked_date/:emp_number', async(req, res)=>{
   const  { emp_number } = req.params;

   try{

   const dateQuery = `SELECT DISTINCT psychologist_date FROM psychologistbook WHERE emp_number = $1`;
   const dateResult = await client.query(dateQuery, [emp_number]);

   const timezTaken =   `SELECT book_date, book_time FROM patient_book`;
   const timezResult = await client.query(timezTaken);

   const bookedTimes  = timezResult.rows.reduce((acc, row) =>{
            if(!acc[row.book_date]) acc[row.book_date] = [];
            acc[row.book_date].push(row.book_time);
            return acc;
   }, {});

   const availableDates = [];
   for(const dr of dateResult.rows){
       const dat = dr.psychologist_date;  
       const query = `
               SELECT DISTINCT psychologist_time FROM psychologistbook
               WHERE emp_number = $1 AND psychologist_date = $2
           `;
       const result = await client.query(query, [emp_number, dat]);
       const getTimes  = result.rows.map(row => row.psychologist_time);

       const filterTime = getTimes.filter(tim => !bookedTimes[dat] || !bookedTimes[dat].includes(tim));
       if(filterTime.length > 0){
           availableDates.push({psychologist_date: dat});
       }
   }
   res.json(availableDates);
}catch(error){
   console.error('Failed to get dates', error);
   res.status(500).send('Error backend'); 
}
});

//AVAILABLE DATES TO AVOID CLASHES
const availableTimes = [
    "08:00-09:00" , "09:00-10:00" , "10:00-11:00" , "11:00-12:00" , "12:00-13:00" , "13:30-14:30" , "14:30-15:30" ]; 
//TIME(S) APPEAR WHEN PATIENT CLICKS A PARTICULAR DATE
app.get('/api/v1/psychologist_time/:emp_number/:psychologist_date', async(req, res) =>{
  const { emp_number, psychologist_date} = req.params;
  try { 

   const bookQuery = `
           SELECT DISTINCT book_time FROM patient_book
           WHERE book_date = $1
       `;
   const bookResult  = await client.query(bookQuery,  [psychologist_date]);
   const bookFound = bookResult.rows.map(row => row.book_time);

      const query = ` 
            SELECT DISTINCT psychologist_time FROM psychologistbook
            WHERE emp_number = $1 AND psychologist_date = $2
            ORDER BY psychologist_time ASC
       `;  
       const result = await client.query(query,[emp_number, psychologist_date]);
       //console.log("Query Times:" , result.rows);
       const bookedTimes = result.rows.map(row => row.psychologist_time);
       //Filter found times
       const foundTimes = bookedTimes.filter(time => !bookFound.includes(time));
         
       res.json(foundTimes);

  } catch (error) {
     console.error("Failed to fetch times associated with x date: ", error);
     res.status(500).json("Failed to get times of x date: ");
  }
});  
  
//NOW SAVE THAT INFO FOR THE SESSION WHEN PATIENT CLICKS SAVE,
  
app.post('/api/v1/capturebooking'   , async(req, res) =>{

   console.log("Booking Information: ", req.body);  
   const { psychologist_name, book_date, book_time, more_info, studentnumber} = req.body;
   
   console.log("Student Number for captureBooking is: ", studentnumber);
   const emailQuery = await client.query(`SELECT patient_email FROM patient_table WHERE studentnumber=$1`, [studentnumber]);
   //const patient_email = req.session.patient_email;     
   const patient_email = (emailQuery.rows[0]?.patient_email); 
  
  console.log("Psychologist Name: ", psychologist_name);
  console.log("Book Date: ", book_date);
  console.log("Book Time: ", book_time);
  console.log("More Info: ", more_info);
  console.log("Patient Email: ", emailQuery.rows[0]?.patient_email);  
  console.log("Student Number: ", studentnumber);   

  if (!patient_email || !psychologist_name || !book_date || !book_time) {
    const missingFields = [];
    if (!patient_email) missingFields.push('patient_email');
    if (!psychologist_name) missingFields.push('psychologist_name');
    if (!book_date) missingFields.push('book_date');
    if (!book_time) missingFields.push('book_time');

    return res.status(400).json({ error: `Missing fields: ${missingFields.join(', ')}` });
  }  
     
   try { 
       const query = ` 
           INSERT INTO patient_book (patient_email, psychologist_name, book_date, book_time, more_info, date_booked)
           VALUES ($1, $2, $3, $4, $5, NOW())    
           RETURNING *;
       `;
       const data = [patient_email, psychologist_name, book_date, book_time, more_info];
       const result = await client.query(query, data);
       res.status(201).json({message: 'Successfully Booked', booking: result.rows[0]});
            
   } catch (error) {   
       console.error('Error setting appointment: ', error);
       res.status(500).json({error: 'Internal errorzzzzzzzzz'});
   }      
});   
  
  
//ANALYTICS FOR THE PATIENT TO SEE GRAPHIC REPRESENTATIONS
app.get('/api/v1/recordbargraph', async(req, res)=>{
    try { 
        const  {studentnumber, selectedperiod} = req.query;  

        let query = `
            SELECT record_category, COUNT(*) as count
            FROM recordtable
            WHERE studentnumber = $1
        `;

        if(selectedperiod === 'Today'){ 
            query += ` AND DATE(record_date) = CURRENT_DATE`;
        }else if(selectedperiod === '1-Week'){
            query += ` AND DATE(record_date) >= CURRENT_DATE - INTERVAL '7 days'`;
        }else if(selectedperiod === '3-Months'){  
            query += ` AND DATE(record_date) >= CURRENT_DATE - INTERVAL '3 months'`;
        }


        query+= ` GROUP BY record_category`;

        const result = await client.query(query, [studentnumber]);
        //console.log('Results: ', result.rows);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Failed to fetch: ', error);
        res.status(500).json('Not found failed to fetch');
    }
});


//FOR THE LINE GRAPH NOW TO COMPARE WITH BAR GRAPH AND SEE WHICH ONE THE SPONSOR PREFERS
app.get('/api/v1/recordlinegraph', async(req, res)=>{
    try {
        const {studentnumber, selectedperiod} = req.query;
        let filterDate = '';
        let filterNumber = `WHERE studentnumber = '${studentnumber}'`;
        
        switch(selectedperiod){
            case 'Today':  
                filterDate = "AND DATE(record_date) >= CURRENT_DATE";
                break;
            case '1-Week':
                filterDate = "AND DATE(record_date) >= CURRENT_DATE - INTERVAL '7 days'";
                break;
            case '3-Months':
                filterDate = "AND DATE(record_date) >= CURRENT_DATE - INTERVAL '3 months'";
                break;
            default:
                filterDate = '';
                break;
        }

        const query = `
            SELECT record_category, COUNT(*) as count, AVG(record_level) as record_level
            FROM recordtable
            ${filterNumber} ${filterDate}
            GROUP BY record_category
        `; 
        const result = await client.query(query);
        //console.log("Area Graph: ", result.rows);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching line graph plots: ', error);
        res.status(500).json({message: 'Failed to fetch, database concern'});
    }
});  
//GET THE HIGHEST NUMBER OF CATEGORY FOR THAT WEEK AND DISPLAY IT TO THE PSYCHOLOGIST
app.get('/api/v1/getHighestCat', async(req, res)=>{
    try {
        const query = `
            SELECT record_category, COUNT(*) as count
            FROM recordtable
            WHERE record_date >= NOW() - INTERVAL '7 days'
            GROUP BY record_category
            ORDER BY count DESC  
            LIMIT 5  
        `;

        const result = await client.query(query);
        const categories = result.rows.map(row => row.record_category);
        res.json({ categories });
    } catch (error) {  
        console.error('Error fetching categories: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }  
});


//DISPLAY BOOKINGS ON THE PSYCHOLOGIST DASHBOARD
app.get('/api/v1/getBooked', async(req,res) =>{

    //console.log('Session for psychologist: ',  req.session.emp_number) ;
    const { emp_number } = req.query;

    if(!emp_number){
        return res.status(401).json({message: 'User denied'});
    }  
    try { 
        const getPsyName = `SELECT name, surname  
            FROM system_psychologist  
            WHERE emp_number = $1`;   
        
        const PsyName  = await client.query(getPsyName,[emp_number]);
        if(PsyName.rows.length===0){
            return res.status(400).json({error: 'Wrong emp_number'});
        } 
        const first_name = PsyName.rows[0].name;
        const last_name = PsyName.rows[0].surname;
        const namesurname = `${first_name} ${last_name}`;
        //console.log("First Name: ", namesurname);
        const query = `
            SELECT pt.studentnumber, pt.patient_surname, pb.book_date, book_time
            FROM patient_book pb
            JOIN patient_table pt ON pb.patient_email = pt.patient_email
            WHERE pb.psychologist_name = $1 AND pb.book_date >= CURRENT_DATE
            ORDER BY pb.book_date DESC, pb.book_time DESC;
        `;
    // WHERE pb.psychologist_name = $1  
    const result = await client.query(query,[namesurname]);    
    if(result.rows.length > 0){  
        //console.log("Booked Times: ", result.rows);
        res.status(200).json({booked: result.rows});
    }else{  
        res.status(200).json({message: 'No Booking Found'});
    }   
     
    } catch (error) {
         console.error('Failed to get Booked days and times');
         res.status(500).json({error: 'Failed to get Booked days and times' });
    }       
});  
  

app.get('/api/v1/getLastRecord', async(req, res)=>{
    const studentnumber = req.session.studentnumber;
    const record_category = req.query.record_category;
    const record_level = req.query.record_level;

    if(!studentnumber){  
        console.error('Student Number session not found');
        res.status(400).json({message: 'Not good'});
    }

    const query = 'SELECT record_level FROM recordtable WHERE studentnumber = $1 ORDER BY record_date DESC LIMIT 1';

    client.query(query,[studentnumber], (err, result)=>{
      if(err){
        console.error('Failed to get last record_level: ', err);
        res.status(500).json({message: 'Cannot get record_levle'});
      }
      if(result.rows.length === 0){  
        return res.status(404).json({message: 'No last record found'});
      }
      res.status(200).json(result.rows[0]);  
    });
});

app.get('/api/v1/showappointmentMobile', async(req, res)=>{
    
    //console.log("Header Email is: ", req.headers.patient_email);
    const patient_email = req.headers.patient_email;
    console.log("Header Email is: ", req.headers.patient_email);


if(!patient_email){ 
    console.log('Patient Email is not found in session variable');
    res.status(400).json({message: 'Patient Email is not found in session variable 400'});
}

    try {  
       
    const query = 'SELECT psychologist_name, book_date, book_time FROM patient_book WHERE patient_email = $1';
    
    const result = await client.query(query,[patient_email]);
    if(result.rows.length === 0){
        res.status(200).json({message: 'No booking made.\r\nHave a nice day :)'});
    }else{
        res.status(200).json(result.rows);  
    }
      
    } catch (error) {
        console.log('Error occured here, check catch log');
        res.status(500).json({message: 'Internal error found, check catch 500'});
    }
    
});

app.delete('/api/v1/deletebookingMobile/:book_id', async(req, res) =>{
     const patient_email = req.headers.patient_email;
     const book_id =req.params.book_id;

     console.log("See patient_email: ", patient_email);
     console.log("See book_id: ", book_id);

     if(!book_id || !patient_email){  
        return res.status(400).json({message: 'book_id and patient_email is not the found'});
     }

     try {
        const query = 'DELETE FROM patient_book WHERE book_id = $1 AND patient_email = $2';
        const result = await client.query(query, [book_id, patient_email]);
        if(result.rowCount === 0){
            return res.status(400).json({message: 'book_id is not found'});
        }
        res.status(200).json({message: 'Success book delete'});
     } catch (error) {
        console.error('Catch backend error: ', error);
        res.status(500).json({message: 'Not found here backend VS code'});
     }
});  

//DISPLAY BOOKINGS ON THE PSYCHOLOGIST VIEW BOOKINGS
app.get('/api/v1/viewBookings', async(req,res) =>{
   
   // console.log(req.session.emp_number);
    const emp_number = req.session.emp_number;
    try {
        const getPsyName = `SELECT name, surname
            FROM system_psychologist
            WHERE emp_number = $1`;  
        
        const PsyName  = await client.query(getPsyName,[emp_number]);
        if(PsyName.rows.length === 0){
            return res.status(400).json({error: 'Wrong emp_number'});
        } 
        const first_name = PsyName.rows[0].name;  
        const last_name = PsyName.rows[0].surname; 
        const namesurname = `${first_name} ${last_name}`;
        //console.log("Name Surname: ", namesurname);

        const presentday = new Date();
        presentday.setHours(0,0,0,0);

        const query = `
            SELECT pt.studentnumber, pt.patient_surname, pt.patient_name, pb.book_date, pb.book_time, pb.more_info
            FROM patient_book pb
            JOIN patient_table pt ON pb.patient_email = pt.patient_email
            WHERE pb.psychologist_name = $1
            AND pb.book_date >= $2
            ORDER BY pb.book_date DESC, pb.book_time DESC; 
        `; 
    
    const result = await client.query(query,[namesurname, presentday.toISOString().split('T')[0]]);  
    if(result.rows.length > 0){
        //console.log("Booking: ", result.rows);
        res.status(200).json({booked: result.rows});
    }else{
        res.status(200).json({message: 'No Booking Found'});
    }
    } catch (error) { 
         console.error('Failed to get Booked days and times');
         res.status(500).json({error: 'Failed to get Booked days and times' });
    }   
});
   
//SHOW NAME OF PERSON LOGGED IN START
app.get('/api/v1/psychologist_surname', (req, res) =>{
    const patient_email = req.session.email;
    if(!patient_email){ 
        res.status(401).json({message: 'User access denied'});
    }
 
    const query = 'SELECT surname FROM system_psychologist WHERE email = $1';
    client.query(query, [patient_email], (err, result) =>{
                 if(err){ 
                    console.error('Error fetching psycho surname: ', err);
                    return res.status(500).json({message: 'Error fetching psycho surname'});
                 }
  
                 if(result.rows.length > 0){
                    const surname = result.rows[0].surname;
                    return res.json({ surname });
                 }else{
                    return res.status(404).json({message: 'Patient log not found'});
                 }
    });
});  
  
app.put('/api/v1/reschedulebookingMobile', async(req, res) =>{
    const {book_id, psychologist_name, book_date, book_time, more_info} = req.body;
    try {
        const result = await client.query('UPDATE patient_book SET psychologist_name = $1, book_date = $2, book_time = $3, more_info = $4 WHERE book_id = $5 RETURNING *', [psychologist_name, book_date, book_time, more_info, book_id]);
        
        res.status(200).json({message: 'Reschedule Nice', booking: result.rows[0]});
    } catch (error) { 
        console.error('Error rescheduling: ', error);
        res.status(500).json({error: 'Reschedule Failed'});
    }  
});

app.get('/api/v1/bookinginfoMobile/:book_id', async (req, res) =>{
   const {book_id} = req.params;
   try {
    const query = `SELECT * FROM patient_book WHERE book_id = $1`;
    const result = await client.query(query, [book_id]);
    if(result.rows.length > 0){
        res.status(200).json({booking: result.rows[0]});
    }else{
       res.status(404).json({error: 'Book not found'});
    }
   } catch (error) {
      console.error('Error fetching booking details: ', error);
      res.status(500).json({error: 'Server Errro'});
   }
});

//POPULATE NEW FUNCTION WHICH STORE BOOKING INFORMATION
//FIRST GET THE LASTEST BOOK_ID FOR THAT PATIENT
app.get('/api/v1/getLastBook_Id', async(req, res) => {
    const {studentnumber} = req.query; 
         
    try {    
        //GET THE STUDENUMBER THEN USE THAT TO GET THE EMAIL THEN DO THAT NICE SELECT SQL QUERY
        const get_patient_email = `
            SELECT patient_email 
            FROM patient_table 
            WHERE studentnumber = $1
        `;   
  
        const get_patient_email_result = await client.query(get_patient_email, [studentnumber]);
        const patient_email = get_patient_email_result.rows[0]?.patient_email;
        if(!patient_email){
            return res.status(404).json({error: 'Could not get the patient_email linked to the student number in the url Params'});
        }
        const query = `
            SELECT COUNT(*) AS count, MAX(book_id) AS book_id 
            FROM patient_book 
            WHERE patient_email = $1
        `;  

        const result = await client.query(query,[patient_email]);
        const {count, book_id } = result.rows[0];
        res.json({count, book_id});
    } catch (error) {
        console.error('Unable to get last bok_id for this student number: ', error);
        res.status(500).json({error: 'Service Error'});
    }  
});  

//SUBMIT AND STORE ALL THE ATTENDED OR NOT, AND ATTEND_INFO
app.post( '/api/v1/recordattendance', async(req, res) =>{
    const { book_id, attended_status, attend_info, studentnumber } = req.body;
    try {
        const emp_number = req.session.emp_number; 
        
        const get_patient_email = `  
            SELECT patient_email         
            FROM patient_table   
            WHERE studentnumber = $1 
        `;
        const get_patient_email_result = await client.query(get_patient_email, [studentnumber]);
        const patient_email = get_patient_email_result.rows[0]?.patient_email;

        console.log('Get get_patient_email: ', patient_email);

        if(!patient_email){
            return res.status(404).json({error: 'Could not get patient_email'});
        }

        const query = `
            INSERT INTO attend_table (emp_number, patient_email ,book_id, attend_status,  attend_info)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *; 
        `;
        const data = [
            emp_number,
            patient_email, 
            book_id,
            attended_status ? true : false,
            attend_info
                    
        ];
        const result = await client.query(query, data);  
        res.status(201).json({message: 'Attend recorded', attendance: result.rows[0]})
    } catch (error) {
        
    }  
});

//GET THAT TOTAL TOTAL OF EACH STATUS EITHER TRUE OR FALSE AND DISPLAY TO USER
app.get('/api/v1/attendance_status', async(req, res) =>{
   try {

    const {studentnumber} = req.query;

    const get_patient_email = `
            SELECT patient_email  
            FROM patient_table   
            WHERE studentnumber = $1 
        `;
        const get_patient_email_result = await client.query(get_patient_email, [studentnumber]);
        const patient_email = get_patient_email_result.rows[0]?.patient_email;

        console.log('Get get_patient_email: ', patient_email);

        if(!patient_email){
            return res.status(404).json({error: 'Could not get patient_email'});
        }
          
    const query = `
            SELECT   
                SUM(CASE WHEN attend_status = true THEN 1 ELSE 0 END) AS visits,
                SUM(CASE WHEN attend_status = false THEN 1 ELSE 0 END) AS no_visits
            FROM attend_table
            WHERE patient_email = $1;
        `;
    const result = await client.query(query, [patient_email]);
    const {visits, no_visits} = result.rows[0];
    res.json({visits: parseInt(visits), no_visits: parseInt(no_visits)});
   } catch (error) {  
    console.error('Error fetching attendance counts: ', error);
    res.status(500).json({error: 'server erro'});    
   }{}
});

//GET THE BOOOKING HISTORY FOR EACH STUDENT AND DISPLAY DETAILS AS SUCH
app.get('/api/v1/viewBookHistory/:studentnumber', async(req, res) =>{
    const {studentnumber}= req.params;
    try {  
        const get_patient_email = `
            SELECT patient_email  
            FROM patient_table 
            WHERE studentnumber = $1
        `;
        const get_patient_email_result = await client.query(get_patient_email, [studentnumber]);
        const patient_email = get_patient_email_result.rows[0]?.patient_email;

        console.log('Get get_patient_email: ', patient_email);

        if(!patient_email){
            return res.status(404).json({error: 'Could not get patient_email'});
        }

        const query = `
            SELECT 
                pb.book_date, 
                pb.book_time, 
                pb.more_info, 
                a.attend_status, 
                a.attend_info 
            FROM 
                attend_table a  
            JOIN 
                patient_book pb 
            ON 
                a.book_id = pb.book_id 
            WHERE 
                a.patient_email = $1
            ORDER BY 
                pb.book_date DESC
        `;
        const result = await client.query(query, [patient_email]);
       
        
        res.json(result.rows);
    } catch (error) {
        console.error('Unabl to get book history for that book_id');
        res.status(500).json({error: 'Server error'});
    }
});

//DISPLAY NAME IN THE STUDENT_PROFILE PAGE 
//ALSO CATEGORY BELOW THERE
app.get('/api/v1/names_category/:studentnumber', async(req, res) =>{
    const {studentnumber} = req.params;
  
    try{  
   
    const names = `
            SELECT patient_surname, patient_name 
            FROM patient_table 
            WHERE studentnumber = $1
        `;
    
    const namesResult = await client.query(names, [studentnumber]);

    if(namesResult.rows.length === 0){
        return res.status(404).json({message: 'Student surname and names not founs'});
    }

    const {patient_surname, patient_name} = namesResult.rows[0];

    const record_cat = `
            SELECT record_category
            FROM recordtable 
            WHERE studentnumber = $1
            ORDER BY record_date DESC
            LIMIT 1
        `;   
      
        const result = await client.query(record_cat, [studentnumber]);

        if(result.rows.length === 0){
            return res.status(404).json({message: 'Student surname and names not founs'});
        }
    
        const {record_category }= result.rows[0];
         

    res.status(200).json({ name: `${patient_surname} ${patient_name}`, activity: record_category });
       
    } catch (error) {  
       console.error('Error: ', error);
       res.status(500).json({message: 'Error server'}); 
    }
}); 

//GET MILD, MODERATE OR SEVERE FOR PSYCHOLOGIST SIDE ON PARTICULAR STUDENT
app.get('/api/v1/mildmoderatesevere', async(req, res) =>{
       
    const {studentnumber, selectedperiod } = req.query; 
    
    // Calculate the date range based on the selected period
    let dateCondition = '';
    const today = new Date();
    const startDate = new Date(today);
    
    switch (selectedperiod) {
        case '1-Week':
            startDate.setDate(today.getDate() - 7);
            break;
        case '1-Month':  
            startDate.setMonth(today.getMonth() - 1);
            break;
        case '3-Months':
            startDate.setMonth(today.getMonth() - 3);
            break;
        default:
            startDate.setDate(today.getDate() - 7);
    }
    dateCondition = `record_date >= '${startDate.toISOString().split('T')[0]}'`;

    try {      
     const query = `
             SELECT CASE 
               WHEN record_level BETWEEN 1 AND 3 THEN 'Mild'
               WHEN record_level BETWEEN 4 AND 6 THEN 'Moderate'
               WHEN record_level BETWEEN 7 AND 10 THEN 'Severe'
            END AS level_group,
            COUNT(*) AS count 
            FROM recordtable 
            WHERE studentnumber = $1 
            AND ${dateCondition}
            GROUP BY level_group
            ORDER BY level_group 
         `;
   
         const result =await client.query(query, [studentnumber]);
            
         res.status(200).json(result.rows);
    }catch(error){
     console.error('Error fetching dataes', error);
     res.status(500).json({message: 'Failed to fetch data'})
    }  
 });   

//7 DAYS OF THE WEEK LET'S GO DATA ON PSYCHOLOGIST SIDE

app.get('/api/v1/weekanalytics', async(req, res) =>{
    const {studentnumber, selectedperiod} = req.query;
        
    let periodCondition = '';
    const today = new Date();
    const startDate = new Date(today);

    switch (selectedperiod) { 
        case '1-Week':
            startDate.setDate(today.getDate() - 7);
            break;
        case '1-Month':
            startDate.setMonth(today.getMonth() - 1);
            break;
        case '3-Months':
            startDate.setMonth(today.getMonth() - 3);
            break;
        default:
            startDate.setDate(today.getDate() - 7);
    } 

    periodCondition = `record_date >= '${startDate.toISOString().split('T')[0]}'`;

    console.log(`Selected Period: ${selectedperiod}, Start Date: ${startDate.toISOString().split('T')[0]}`);
    
    try {
        const query = ` SELECT TO_CHAR(record_date, 'Day') AS dateday,
        COUNT(*) AS count FROM recordtable WHERE studentnumber = $1 AND
        ${periodCondition} 
        GROUP BY TO_CHAR(record_date, 'Day'), TO_CHAR(record_date, 'D')
        ORDER BY TO_CHAR(record_date, 'D') `;  
    
        const result = await client.query(query, [studentnumber]);
          
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error in week analytics: ', error);
        res.status(500).json({message: 'Eror internal'});
          
    }
});
 
app.get('/api/v1/generateBookingReport', async(req, res) =>{
     try { 
        const {studentnumber} = req.query; 

        const get_patient_email = `
            SELECT patient_email 
            FROM patient_table 
            WHERE studentnumber = $1
        `;

        const get_patient_email_result = await client.query(get_patient_email, [studentnumber]);
        const patient_email = get_patient_email_result.rows[0]?.patient_email;
        if(!patient_email){
            return res.status(404).json({error: 'Could not get the patient_email linked to the student number in the url Params'});
        }

        const query = await client.query(`SELECT * FROM patient_book WHERE patient_email=$1 ORDER BY date_booked DESC LIMIT 1`, [patient_email]);
        const result = query.rows[0];
  
        if(!result){
            return res.status(404).json({error: 'No booking for this student number'});
        }

        const filename = `BookingReport_${Date.now()}.pdf`;
        const filepath = path.join(__dirname, 'public', 'reports', filename);

        fs.mkdirSync(path.join(__dirname, 'public', 'reports'), {recursive: true});

        //write to pdf file
        const writx = fs.createWriteStream(filepath);
        doc.pipe(writx);  

        //PDF BODY
        doc.fontSize(25).text('Booking Report', 100, 100);
        doc.text(`Psychologist: ${result.psychologist_name}`, 100, 150);
        doc.text(`Date: ${result.book_date}`, 100, 200);  
        doc.text(`Time: ${result.book_time}`, 100, 250);
        doc.text(`More Info: ${result.more_info}`, 100, 300);
        
        doc.end();

        //after writing send url to new page
        writx.on('finish', () =>{
             const reportUrl =  `/reports/${filename}`;
             res.status(200).json({url: reportUrl});
        });

     } catch (error) {
        console.error('Error generatx report: ', error);
        res.status(500).json({error: 'Server err'});  
     }  
});  
 
app.get('/api/v1/processReport', async(req, res) =>{
    try {
         const { studentnumber } = req.query;
         console.log('Received studentnumber:', studentnumber);
 
         const get_patient_email = `SELECT patient_email FROM patient_table WHERE studentnumber = $1`;
         const get_patient_email_result = await client.query(get_patient_email, [studentnumber]);
         const patient_email = get_patient_email_result.rows[0]?.patient_email;
         console.log('Retrieved patient_email:', patient_email);
         
         if (!patient_email) {
             console.error('No patient_email found');
             return res.status(404).json({error: 'Could not get the patient_email linked to the student number in the url Params'});
         }      
 
         const patient_info = `SELECT patient_name, patient_surname, patient_age, patient_gender, patient_faculty, patient_yearstudy, patient_race, patient_campus FROM patient_table WHERE studentnumber = $1`;
         const patient_info_result = await client.query(patient_info, [studentnumber]);
         const studentfound = patient_info_result.rows[0];
         console.log('Retrieved patient info:', studentfound);
      
         if (!studentfound) { 
             console.error('No patient info found');
             return res.status(404).json({error: 'patient info not found'});
         }    
       
         const employeenumber = req.session.emp_number;
         console.log("Generate Report Session emp_number is: ", employeenumber);
 
         if (!employeenumber) {
             console.error('emp_number not found in session');
             return res.status(400).json({error: 'emp_number not found in req.session check frontend'});
         } 
 
         const get_psychologist_info = `
             SELECT name, surname, email 
             FROM system_psychologist 
             WHERE emp_number = $1 
         `;
         const psychologist_result = await client.query(get_psychologist_info, [employeenumber]);
         const psychologist = psychologist_result.rows[0];
         console.log('Retrieved psychologist info:', psychologist);
 
         if (!psychologist) {
             console.error('No psychologist info found');
             return res.status(404).json({ error: 'Psychologist info not found' });
         }
 
         const getBooked = `
             SELECT COUNT(*) AS total_bookings,
                    SUM(CASE WHEN attend_status = true THEN 1 ELSE 0 END) AS attended,
                    SUM(CASE WHEN attend_status = false THEN 1 ELSE 0 END) AS not_attended
             FROM attend_table
             WHERE patient_email = $1  
         `;
         const book_result = await client.query(getBooked, [patient_email]);
         const getbook = book_result.rows[0];
         console.log('Retrieved booking info:', getbook);
         
         res.status(200).json({
            studentfound,
            psychologist,
            bookings: getbook 
         });  
 
     } catch (error) {
         console.error('An error occurred:', error);
         return res.status(500).json({error: 'Internal error check backend line 2452'});
     }   
 });

app.post('/api/v1/generateReport', async(req, res) =>{
      try {  
             
        console.log('Log Body: ', req.body);
           
    const  {studentnumber} = req.body;
    console.log('Log Session: ', req.session);
       const emp_number = req.session.emp_number;

        const get_patient_info = `SELECT patient_name, patient_surname, patient_age, patient_gender, patient_faculty, patient_campus, patient_yearstudy FROM patient_table WHERE studentnumber = $1`;
       
        const patient_info = await client.query(get_patient_info, [studentnumber]);
        const studentfound = patient_info.rows[0];

        const get_psychologist_info = ` 
             SELECT name, email 
             FROM system_psychologist 
             WHERE emp_number = $1 
         `;
         const psychologist_result = await client.query(get_psychologist_info, [emp_number]);
         const psychologist = psychologist_result.rows[0];
         console.log('Retrieved psychologist info:', psychologist);
          
         res.status(200).json({studentfound, psychologist})
           
    } catch (error) {  
        
        console.error('An arror occurerd: ', error);
        res.status(500).json({error: 'Failed to report'});
      }
});

//GENERAL YEAR VS ANXIETY LEVELS GRAPH
app.get('/api/v1/yearGraph', async(req, res) => {
    try {
        const query = ` 
           SELECT TO_CHAR(record_date, 'Month') AS month,
       COUNT(*) AS record_count
FROM recordtable  
GROUP BY month
ORDER BY MIN(record_date);
        `;
  
        const result = await client.query(query);
        res.status(200).json(result.rows);
    } catch (error) { 
        console.log('Error: ', error);
        res.status(500).json({message: 'Failed for year'});
    }
});  

     
app.post('/api/v1/recordclick', (req, res) =>{
       const {pdf_count, pdf_name} = req.body;  
 
       const query = `INSERT INTO pdf_table (pdf_count, pdf_name) VALUES ($1,$2)`;
       const data = [pdf_count, pdf_name];  
       client.query(query, data, (error, results) =>{
               if(error){  
                console.error('Error inseting into table');
                return res.status(500).json({success: false, message: 'Db errror', error: error.message});
               }
               res.status(200).json({success: true, message: 'Click received'});
       });
});

app.get('/api/v1/getClicks', async(req, res) =>{
    try {
        const query = 'SELECT pdf_name, count(pdf_id) AS total_clicks FROM pdf_table GROUP BY pdf_name';
        const result = await client.query(query); 

        res.status(200).json({data: result.rows});

    } catch (error) { 
        console.error('Error fetching data: ', error);
        res.status(500).json({message: 'Failed check backend line 2576'});
    }
}); 

//FOR EACH STUDENT DISPLAY YEARLY
app.get('/api/v1/yearStudentGraph', async (req, res) => {
    const { studentnumber, from, to } = req.query;

    let periodCondition = '';
    // Define the period condition based on `from` and `to` level
    if (from && to) {
        periodCondition = `record_level BETWEEN ${from} AND ${to}`;
    } else {
        res.status(400).json({ message: 'Invalid period' });
        return;
    }
    console.log(`Student: ${studentnumber}, Levels: ${from}-${to}`);

    try {
        const query = `
        SELECT TO_CHAR(record_date, 'Month') AS month,
        EXTRACT(MONTH FROM record_date) AS record_month,
        COUNT(*) AS record_count
        FROM recordtable
        WHERE studentnumber = $1 
        AND ${periodCondition}
        GROUP BY month, record_month
        ORDER BY record_month`;

        const result = await client.query(query, [studentnumber]);
        console.log(result.rowCount);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching year analytics: ', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


//GET DATES AND DISPLAY ON PSYCHOLOGIST BOOK CALENDER
app.get('/api/v1/getAppointments', async (req, res) => {
    const emp_number = req.session.emp_number; 
    
    if (!emp_number) {
        return res.status(401).json({ message: 'Psychologist not authenticated' });
    }

    try {
        const query = 'SELECT psychologist_date FROM psychologistbook WHERE emp_number = $1';
        const result = await client.query(query, [emp_number]);

        const appointments = result.rows.map(row => row.psychologist_date);
        return res.status(200).json({
            message: 'Appointments fetched successfully',
            appointments
        }); 
    } catch (error) {
        console.error('Error fetching appointments: ', error);
        return res.status(500).json({ message: 'Failed to fetch appointments' });
    }
});
//PSYCHOLOGISST PAGE DELTE TMES SELECTED AND IF ALL TIMES ARE SELECTED THEN REMOVE THAT DATE FROM THE CALENDER
app.post('/api/v1/deleteTimes', async(req, res) =>{
    const {date, times} = req.body;
    const emp_number = req.session.emp_number;
   
    try {
        for (const time of times){
            const query = 'DELETE FROM psychologistbook WHERE psychologist_date = $1 AND psychologist_time = $2 AND emp_number = $3';
            await client.query(query, [date, time, emp_number]);
        }
        //see if all times are deleted
        const checkQ = 'SELECT * FROM psychologistbook WHERE psychologist_date = $1 AND emp_number = $2';
        const checkTIme = await client.query(checkQ, [date, emp_number]);
        
        if(checkTIme.rows.length === 0){
            //remove that date
            res.status(200).json({success: true, allTimesDeleted: true, message: `All times for ${date} have been deleted successfully.` });
        }else{
            res.status(200).json({success: true, allTimesDeleted: false, message: `Selected times for ${date} have been deleted successfully.` });
        }
    } catch (error) {  
        console.log('Unable to delete', error);
        res.status(500).json({success: false});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
    }
});
 
//SHOW ME TIMES OF DATE SELECTED ON THE BOOKEDDATE CLICKED
app.get('/api/v1/getTimesForDate', async (req, res) => {
    const { date } = req.query;  
    const emp_number = req.session.emp_number; 

    if (!date || !emp_number) { 
        res.status(400).json({ message: 'Invalid date or user not authenticated' });
        return;
    }
    try {
        const query = 'SELECT psychologist_time FROM psychologistbook WHERE psychologist_date = $1 AND emp_number = $2';
        const result = await client.query(query, [date, emp_number]);
        const times = result.rows.map(row => row.psychologist_time);
        res.status(200).json({ times });
    } catch (error) {
        console.error('Error fetching times for date:', error);
        res.status(500).json({ message: 'Failed to fetch times for the selected date' });
    }
});  


// INTENTION IS TO AUTO DELETE ALL APPOINTMENT DATES LESS THAN OR EQULA TO THE DATE OF TODAY

async function deletePastAppointments() {  
    const currentDate = new Date().toISOString().slice(0, 10); // Get the current date in YYYY-MM-DD format
    console.log(`Current date for deletion: ${currentDate}`);
    try {
        const query = 'DELETE FROM psychologistbook WHERE psychologist_date <= $1';
        const result = await client.query(query, [currentDate]);
        console.log(`Deleted ${result.rowCount} past appointments successfully.`);
    } catch (error) {
        console.error('Error deleting past appointments: ', error);
    }
}   

// Schedule the job to run every day at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled task to delete past appointments');
    deletePastAppointments();
});


//set profile picture
app.post('/uploadProfilePic', async (req, res) => {
    const { image, name, studentnumber } = req.body;
    const imageBuffer = Buffer.from(image, 'base64');
  
 
    const imagePath = `./uploads/${studentnumber}-${name}`;
    fs.writeFileSync(imagePath, imageBuffer); 

    await client.query('UPDATE patient_table SET patient_profilepicture = $1 WHERE studentnumber = $2', [imagePath, studentnumber]);
  
    res.json({ message: 'Profile picture uploaded successfully!' });
  }); 

  
//get other particulars of students
app.get('/api/v1/getPatientByStudentNumber', async (req, res) => {
    const { studentnumber } = req.query;  // Retrieve student number from query parameter
    try {
        if (!studentnumber) {
            return res.status(400).json({ message: 'Student number is required' });
        }

        // Query to fetch the patient's details using their student number
        const patientQuery = `
            SELECT patient_name, patient_surname, patient_email 
            FROM patient_table 
            WHERE studentnumber = $1
        `;
        
        const patient = await client.query(patientQuery, [studentnumber]);

        if (patient.rowCount === 0) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Return the patient's details
        res.json(patient.rows[0]);

    } catch (err) {
        console.error('Error retrieving patient', err);
        res.status(500).json({ message: 'Error retrieving patient' });
    }
}); 
  



//PORT INFO BELOW
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});