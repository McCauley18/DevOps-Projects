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

        if (data.message && Array.isArray(data.message)) {
            const selectedCake = data.message.find(cake => cake.cakename === cakeName);
            console.log("custom error: " + selectedCake);
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

    document.getElementById("category").textContent = cake.cakecategory;
    document.getElementById("name").textContent = cake.cakename;
    document.getElementById("price").textContent = cake.cakeprice;
    document.getElementById("description").textContent = cake.cakedescription;
    document.getElementById("flavour").innerHTML = `Flavour: <span>${cake.cakeflavour}</span>`;

    if (cake.cakeimage) {  
        const imageData = `data:image/jpeg;base64,${cake.cakeimage}`;
        document.querySelector(".big_img").src = imageData;   
    }
}

// delete below here
document.addEventListener("DOMContentLoaded", function () {
    const deleteBtn = document.getElementById("deleteme"); 

    deleteBtn.addEventListener("click", async () => {
        const cakeName = getCakeNameFromQuery();

        if (!cakeName) {
            console.error("No cake name found in query.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/delete/${cakeName}`, {
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
