const popup = document.querySelector(".popup");
const overlay = document.querySelector(".blurry");

document.querySelector("#editpopup").addEventListener("click", function(){
    popup.classList.add("active");
    overlay.classList.add("active"); 
    console.log("New Cake button clicked!"); 
});

document.querySelector(".popup .close-btn").addEventListener("click", function(){
    popup.classList.remove("active");
    overlay.classList.remove("active");
});


const API_BASE_URL = 'http://127.0.0.1:3001';

function myTimeDate(){
    const now = new Date();
    //set thay time
    const hours = now.getHours().toString().padStart(2,'0');
    const minutes = now.getMinutes().toString().padStart(2,'0');
    document.getElementById('mytime').textContent = `${hours}:${minutes}`;

    //set the date
    const day = now.getDate();
    const month = now.toLocaleString('default' , {month:'long'});
    const year = now.getFullYear();

    document.getElementById('mydate').textContent = `${day} ${month} ${year}`;
}

myTimeDate();
setInterval(myTimeDate, 60000); 


document.addEventListener("DOMContentLoaded", async function () {
    const cakeName = getCakeNameFromQuery();

    console.log("Cake Name: ", cakeName);
    ``
    if (!cakeName) {
        console.error("See here: " + cakeName.toString()); 
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/allinfo`);
        const data = await response.json();

        console.log("Data: " + data)  

        if (data.message && Array.isArray(data.message)) {
            const selectedCake = data.message.find(cake => cake.cakename === cakeName);
            console.log("custom error: " + selectedCake.toString());
            if (selectedCake) { 
                updateDetails(selectedCake); 
            } else {
                console.error("Cake not found.");
            } 
        } else {
            console.error("Unexpected data format:", data);
        }
    } catch (err) {
        console.error("Error fetching each cake's info:", err);
    }
});



function getCakeNameFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("name");
}


function updateDetails(cake) {

    document.getElementById("ccategory").textContent = cake.cakecategory;
    document.getElementById("cname").textContent = cake.cakename;
    // document.getElementById("cprice").textContent = cake.cakeprice;
    document.getElementById("cprice").textContent = 'R' + Number(cake.cakeprice).toFixed(2);
    document.getElementById("cdescription").textContent = cake.cakedescription;
    document.getElementById("cflavour").innerHTML = `Flavour: <span>${cake.cakeflavour}</span>`;
     
    if (cake.cakeimage) {   
        const imageData = `data:image/jpeg;base64,${cake.cakeimage}`;
        document.querySelector(".big_img").src = imageData;   
    }
}

// delete below here
document.addEventListener("DOMContentLoaded", function () {
    const deleteBtn = document.getElementById("deleteme"); 

    deleteBtn.addEventListener("click", async () => {
        const cakeName2 = getCakeNameFromQuery();

        if (!cakeName2) {
            console.error("No cake name found in query.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/delete/${cakeName2}`, {
                method: 'DELETE'
            });

            if (response.ok) { 
                console.log("Cake deleted successfully.");
                window.location.href = "crudPage.html"; 
            } else {
                const errData = await response.json();
                console.error("Failed to delete cake:", errData);
            }
        } catch (err) {
            console.error("Error deleting cake:", err);
        }
    });
});


document.getElementById("backBtn").addEventListener("click", ()=> {
    window.location.href = 'crudPage.html'; 
 }); 


document.addEventListener("DOMContentLoaded", function(){
    const editBtn = document.getElementById("editpopup")
    const cakeForm = document.getElementById("cakeform");

    cakeForm.addEventListener("submit", async(params) =>{
        params.preventDefault();

        const cakenametodelete = getCakeNameFromQuery();
        const updatePrice = document.getElementById("cakyprice").value;
        const updateDescription = document.getElementById("cakydescription").value;
        try {
            const response = await fetch(`${API_BASE_URL}/api/updatepricedescription/${cakenametodelete}`,{
                
                method: 'PUT',
                headers: {
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify({
                    cakeprice: updatePrice, 
                    cakedescription: updateDescription
                })
            });
            console.log("Response for update: " +  response);
        if(!response.ok){
            console.log("Update failed", await response.text());
            return;
        }

        popup.classList.remove("remove"); 
        window.location.href = `edit-Cakes.html?name=${encodeURIComponent(cakenametodelete)}`

            
        } catch (error) {  
            console.log("check backlog");
        }
    });

    editBtn.addEventListener("click", async () =>{
        const cakenametodelete = getCakeNameFromQuery();

        if(!cakenametodelete){
            console.log("My friend cake name is not found"); 
        }


        try {  

            console.log("Try catch cake name: " + cakenametodelete);

            const response = await fetch(`${API_BASE_URL}/api/getinfobeforeEdit/${cakenametodelete}`);
            console.log("Response: " + response.toString())
            const data = await response.json();

            if(data.cakeprice && data.cakedescription){
                document.getElementById("cakyprice").value = data.cakeprice
                
                document.getElementById("cakydescription").value = data.cakedescription
            
            popup.classList.add("active");  

            }else{
                console.log("The cake is not found");
            }
            
        } catch (error) {
            console.log("Error in the catch section: " + error);
        }
    });
});