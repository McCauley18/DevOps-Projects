const API_BASE_URL = 'http://127.0.0.1:3001';
const myRow = document.getElementById('cakeRow');

 

const popup = document.querySelector(".popup");
const overlay = document.querySelector(".blurry");

document.querySelector("#show-login").addEventListener("click", function(){
    popup.classList.add("active");
    overlay.classList.add("active");
    console.log("New Cake button clicked!"); 
});

document.querySelector(".popup .close-btn").addEventListener("click", function(){
    popup.classList.remove("active");
    overlay.classList.remove("active");
});

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

document.getElementById('cakeform').addEventListener("submit", async function name(params) {
    params.preventDefault();
    const formData = new FormData();

    const htmlname = document.getElementById('name').value;
    const htmlcategory = document.getElementById('category').value;
    const htmlprice = document.getElementById('price').value;
    const htmldescription = document.getElementById('description').value;
    const htmlflavour = document.getElementById('flavour').value;
    const htmlimage = document.getElementById('image');
    const imageFile = htmlimage.files[0]; 

    formData.append('cakename', htmlname);
    formData.append('cakecategory', htmlcategory);
    formData.append('cakeprice', htmlprice);
    formData.append('cakedescription', htmldescription);
    formData.append('cakeflavour', htmlflavour);
    formData.append('cakeimage', imageFile);

    const response = await fetch(`${API_BASE_URL}/api/addcake`, {
            method: 'POST', 
            body: formData,   
        });

    if (!response.ok) {
    const text = await response.text();  // debug raw error
    console.error("Server Error:", text);
    alert("Server error occurred.");
    return; 
    }

    const result = await response.json();
    console.log("Output: ", result);
    console.log("Message from backend: " + result.message);
    window.location.href = 'crudPage.html';
    popup.classList.remove("active");

}); 


//   just for the name, category and price
document.addEventListener("DOMContentLoaded", async function () {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cakedetails`);
        const data = await response.json();

        if (data.message && Array.isArray(data.message)) {
            updateCakeCards(data.message);
        } else {
            console.error("Unexpected data format:", data);
        }
    } catch (err) {
        console.error("Error fetching cake data:", err);
    }
});
  
function updateCakeCards(cakeList) {
    //clone.querySelector("#name a").href = `shop-details.html?name=${encodeURIComponent(cake.cakename)}`;

    const cakeRow = document.getElementById("cakeRow");
    const template = document.getElementById("cakeTemplate");

    // Clear all other cards (but keep the hidden template)
    cakeRow.querySelectorAll(".col-lg-3:not(#cakeTemplate)").forEach(e => e.remove());

    cakeList.forEach(cake => { 
        // Clone the template node
        const clone = template.cloneNode(true);
        clone.classList.remove("d-none"); // Make it visible
        clone.removeAttribute("id"); // Remove duplicate ID

        // Fill in cake details    
        clone.querySelector("#category").textContent = cake.cakecategory;
        clone.querySelector("#name a").textContent = cake.cakename;
        clone.querySelector("#name a").href =  `edit-Cakes.html?name=${encodeURIComponent(cake.cakename)}`;
        console.log("Cake names: " + cake.cakename);
        clone.querySelector("#price").textContent = 'R' + Number(cake.cakeprice).toFixed(2);
        // document.getElementById("cakyprice").textContent = 'R' + Number(data.cakeprice).toFixed(2);

        const editLink = clone.querySelector(".edit-btn"); 
        editLink.addEventListener('click', () => {
  window.location.href = `edit-Cakes.html?name=${encodeURIComponent(cake.cakename)}`;
});


//editLink.href = `edit-Cakes.html?name=${encodeURIComponent(cake.cakename)}`;


        if (cake.cakeimage) { 
            const imageData = `data:image/jpeg;base64,${cake.cakeimage}`;
            clone.querySelector(".product__item__pic").style.backgroundImage = `url('${imageData}')`;
        }
        // Append to the row
        cakeRow.appendChild(clone);
    });
}
 