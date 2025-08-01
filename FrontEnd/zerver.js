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
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  // crud methods
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

app.get('/api/cakedetails' , (req, res)=>{ 
    const query = 'Select cakename, cakecategory, cakeprice, cakeimage from caketable';
    const errmsg = 'Failed to return name, category and price of the cake';
    client.query(query, (err, result) => {  
        if (!err) {
            const cakes = result.rows.map(cake => {
                return {
                    cakename: cake.cakename,
                    cakecategory: cake.cakecategory,
                    cakeprice: cake.cakeprice,
                    // Convert binary image to base64 string (for frontend rendering) 
                    cakeimage: cake.cakeimage ? Buffer.from(cake.cakeimage).toString('base64') : null
                };
            });

            return res.status(200).json({ message: cakes });
        } else {
            console.log(errmsg, err);
            return res.status(500).json({ mess: errmsg });
        }
    });
});


app.get('/api/allinfo', (req, res)=>{
    const query = 'select cakename, cakecategory, cakeprice, cakedescription, cakeflavour, cakeimage from caketable';
    client.query(query, (err, result) =>{
        if(!err){
        const cakes = result.rows.map( c =>{
            return {
                cakename: c.cakename,
                cakecategory: c.cakecategory,
                cakeprice: c.cakeprice,
                cakedescription: c.cakedescription,
                cakeflavour: c.cakeflavour,
                cakeimage: c.cakeimage ? Buffer.from(c.cakeimage).toString('base64') : null
            };
        });
        console.log("Cake Informacion: " + cakes) 
        return res.status(200).json({message: cakes});
    }else{    
        console.log('Failed to get all info: ', err);
        return res.status(500).json({mess: 'Failed to retrieve all the cakies information from the database'})
    }
    });
});  

app.delete('/api/delete/:cakename', async (req, res) =>{
    const query = 'delete from caketable where cakename = $1';
    const cname = req.params.cakename;
    
    const ressy = await client.query(query, [cname]); 
    if(ressy.rowCount == 0){
        console.log("So row was not found");
    }else{
        return res.status(200).json({message: 'Cake: ' + cname + ' deleted'})
    }

});
 
app.get('/api/getinfobeforeEdit/:cakenametodelete', (req, res)=>{
    const getname = req.params.cakenametodelete; 
    console.log("Pass 1")
     
    const query = 'select cakeprice, cakedescription from caketable where cakename = $1';
    
    console.log("Pass 2") 
    client.query(query, [getname], (err, result) =>{
        // if(!err && result.rows.length > 0){   
        
        if(result.rows.length === 0){
            return res.status(400).json({error: 'Cake not found'});
        }

        const c = result.rows[0];   

        return res.status(200).json ({
            
            cakeprice: c.cakeprice,
            cakedescription: c.cakedescription,

        });
    
    });
});

app.put('/api/updatepricedescription/:cakenametodelete', (req, res) =>{
    const getpriceDescriptionname = req.params.cakenametodelete;
    const {cakeprice, cakedescription} = req.body;

    console.log("getpriceDescriptionname" , getpriceDescriptionname);
    console.log("cakeprice:" +  cakeprice);
    console.log("cakedescription: " + cakedescription) 
    console.log("Body: " + req.body);

    const query = 'update caketable set cakeprice = $1, cakedescription= $2 where cakename = $3';
    client.query(query, [cakeprice, cakedescription, getpriceDescriptionname], (err, result)=>{
        console.log("Query was submitted");
        
        res.status(200).json({message: 'Cake info updated'});
    });
 });

//PORT INFO BELOW
app.listen(PORT, () => { 
    console.log(`Server running on port ${PORT}`);
});    