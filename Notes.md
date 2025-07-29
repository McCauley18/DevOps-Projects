=> Landing Page
=> Login
=> Sign Up
=> Admin side
=> Customer Side 
=> Details customer
=> Details Admin
=> Admin edit like adding items


**************************** BELOW ADDING OPACITY HTML START  ****************************


body{
    margin: 0px;
    padding: 0px;
    box-sizing: border-box;
}

body{
    background: linear-gradient(to right, #3a7bd5, #3a6073);
    font-family: "Raleway", sans-serif;
    height: 100vh ;
}

.center{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.center button{
    padding: 10px 20px;
    font-size: 15px;
    font-weight: 600px;
    color: #222;
    background-color: #f5f5f5;
    border: none;
    outline: none;
    cursor: pointer;
    border-radius: 5px;

}

.popup{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 380px;
    padding: 20px 30px;
    background-color: #fff;
    box-shadow: 2px 2px 5px 5px rgba(0,0, 0, 0.15);
}

.popup .close-btn{
    position: absolute;
    top: 10px;
    right: 10px;
    width: 15px;
    height: 15px;
    background: #888;
    color: #eee;
    text-align: center;
    line-height: 15px;
    border-radius: 15px;
    cursor: pointer; 
}

.popup .form h2{
    text-align: center;
    color: #222;
    margin: 10px 0px 20px;
    font-size: 25px;
}

.popup .form .form-element{
    margin: 15px 0px;

}

.popup .form .form-element label{
    font-size: 14px;
    color: #222;
}

.popup .form .form-element input[type="text"]
{
    margin-top: 5px;
    display: block;
    width: 95%;
    padding: 10px;
    outline: none;
    border: 1px solid #aaa;
    border-radius: 5px;
}

.popup .form .form-element button{
    width: 100%;
    height: 40px;
    border: none;
    outline: none;
    font-size: 15px;
    background: #222;
    color: #f5f5f5;
    border-radius: 10px;
    cursor: pointer;
}

 ============

 <!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="style.css">

    </head>

    <body>
        <div class="center">
            <button id="show-login">Login</button>
        </div>

        <div class="popup">
            <div class="close-btn">&times;</div>
        
            <div class="form"> 
                <h2>Log in</h2>
                <div class="form-element">
                    <label for="email">Email 1</label>
                    <input type="text" id="email" placeholder="Enter email">
                </div>
                <div class="form-element">
                    <label for="email">Email 2</label>
                    <input type="text" id="email" placeholder="Enter email">
                </div>
                <div class="form-element">
                    <label for="email">Email 3</label>
                    <input type="text" id="email" placeholder="Enter email">
                </div>
                <div class="form-element">
                    <label for="email">Email 3</label>
                    <input type="text" id="email" placeholder="Enter email">
                </div>
                <div class="form-element">
                    <label for="email">Email 4</label>
                    <input type="text" id="email" placeholder="Enter email">
                </div>
                <div class="form-element">
                    <label for="email">Email 5</label>
                    <input type="text" id="email" placeholder="Enter email">
                </div> 
                <div class="form-element">
                   <button>Sign In</button>
                </div>

            </div>
        
        </div>

    </body>
</html>

**************************** BELOW ADDING OPACITY HTML END  ****************************

<div class="header__top__left">
    <p id="time"></p>
    <p id="date"></p>
</div>

<script>
    function updateTimeAndDate() {
        const now = new Date();

        // Format time as HH:MM (24-hour)
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        document.getElementById('time').textContent = `${hours}:${minutes}`;

        // Format date as "20 October 2024"
        const day = now.getDate();
        const month = now.toLocaleString('default', { month: 'long' });
        const year = now.getFullYear();
        document.getElementById('date').textContent = `${day} ${month} ${year}`;
    }

    // Update immediately and every minute
    updateTimeAndDate();
    setInterval(updateTimeAndDate, 60000);
</script>

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
<script>
document.getElementById("submit-cake").addEventListener("click", async function(e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const category = document.getElementById("category").value;
    const price = document.getElementById("price").value;
    const description = document.getElementById("description").value;
    const flavour = document.getElementById("flavour").value;
    const imageInput = document.getElementById("image");
    const imageFile = imageInput.files[0];

    // Convert image to base64 string
    const reader = new FileReader();
    reader.onloadend = async function () {
        const base64Image = reader.result;

        const cakeData = {
            cakename: name,
            cakecategory: category,
            cakeprice: price,
            cakedescriptionn: description,
            cakeflavor: flavour,
            cakeimage: base64Image  // store base64
        };

        const response = await fetch('/api/addcake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cakeData)
        });

        const result = await response.json();
        console.log(result);
        alert(result.message);
    };

    if (imageFile) {
        reader.readAsDataURL(imageFile);
    } else {
        alert("Please select an image.");
    }
});
</script>


!!!!!!!!!!!!!!!!!!11
document.getElementById("addcake").addEventListener("submit", async function(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("cakename", document.getElementById("name").value);
    formData.append("cakecategory", document.getElementById("category").value);
    formData.append("cakeprice", document.getElementById("price").value);
    formData.append("cakedescriptionn", document.getElementById("description").value);
    formData.append("cakeflavor", document.getElementById("flavour").value);
    formData.append("cakeimage", document.getElementById("image").files[0]);

    const response = await fetch("/api/addcake", {
        method: "POST",
        body: formData,
    });

    const result = await response.json();
    alert(result.message);
});

=========
const multer = require("multer");
const storage = multer.memoryStorage(); // Store in memory as Buffer
const upload = multer({ storage: storage });

app.post('/api/addcake', upload.single('cakeimage'), (req, res) => {
    const { cakename, cakecategory, cakeprice, cakedescriptionn, cakeflavor } = req.body;
    const cakeimage = req.file.buffer; // Binary buffer

    const query = 'INSERT INTO caketable (cakename, cakecategory, cakeprice, cakedescriptionn, cakeflavor, cakeimage) VALUES ($1, $2, $3, $4, $5, $6)';
    client.query(query, [cakename, cakecategory, cakeprice, cakedescriptionn, cakeflavor, cakeimage], (err, result) => {
        if (err) {
            console.error('Failed to insert new cake', err);
            return res.status(500).json({ error: 'Database insert failed' });
        } else {
            res.status(201).json({ message: 'Cake Added' });
        }
    });
});

=======
app.get('/api/cakes', (req, res) => {
    const query = 'SELECT * FROM caketable';
    client.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching cakes:', err);
            return res.status(500).json({ error: 'Failed to fetch cakes' });
        } else {
            console.log('Cake Data:', result.rows);  // Print to terminal
            return res.status(200).json(result.rows); // Optional: return to frontend
        }
    });
});


