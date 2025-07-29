const {Client} = require('pg')
const express = require('express');
const app = express();
const multer = require("multer");
const storage = multer.memoryStorage(); // Store in memory as Buffer
const upload = multer({ storage: storage });
const path = require('path');
const cors = require('cors');


const client = new Client({ 
    host:"localhost",
    user:"postgres",  
    port:5432,
    password:"1234", 
    database:"DevOps"   
});  

client.connect();


const PORT = process.env.PORT || 3001;

app.use(cors({ 
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // Allow your Live Server
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
 

app.use(express.json()); 

app.use('/eachPageJS', express.static(path.join(__dirname, 'eachPageJS')));


app.get('/', (req, res) => { 
    res.sendFile(path.join(__dirname, 'index.html'));
});


// USE THIS LATER TO ENCRYPT PASSWORD
function encryptPassword(password){
    let hashValue = 0x811C9DC5;
    let prime = 0x1000193;

    for(let i=0; i < password.length ; i++){
        hashValue ^= password.charCodeAt(i);
        hashValue *= prime;
        hashValue += (hashValue << 1) + (hashValue >> 2);
    }

    return hashValue.toString(16).padStart(8,0);
}
 

   
//Route to handle student registration
app.post('/api/addcake', upload.single('cakeimage') , async (req, res) => {

    console.log('Console Log: ', req.body); 
    
    const { cakename, cakecategory, cakeprice, cakedescription, cakeflavour} = req.body;
    const cakeimage = req.file.buffer; 
    // okay so query to insert
    const query = 'INSERT INTO caketable (cakename, cakecategory, cakeprice, cakedescription, cakeflavour, cakeimage) values ($1, $2, $3, $4, $5, $6)';
    client.query(query, [cakename, cakecategory, cakeprice, cakedescription, cakeflavour, cakeimage] , (err, result) =>{
        if(err){ 
            console.error('Failed to insert new cake' , err);
            //just for back up 
            return res.status(500).json({message: 'Failed to add a new cake' , })
            //return res.statusCode

        }else{
            //okay so cake is added
            res.status(201).json({message: 'Cake Added'});
        }
    });
   
});   

app.get('/api/getCakes', (err, res) =>{
    const query = 'select * from caketable';
    client.query(query, (err, result)=>{
        if(err){
            console.log('Error getting ckae', err);
            return res.status(500).json({error: 'Failed to get cakes rows'});
        }else{
            console.log('Cake rows: ', result.rows);
            return res.status(200).json(result.rows); 
        }
    })
     
});


// app.put('/api/update', async(req, res) =>{
//     if(!err){
//         console.log('Pass')
//     }else{
//         console.log('Failed this test');
//     }
// });

//PORT INFO BELOW
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});    