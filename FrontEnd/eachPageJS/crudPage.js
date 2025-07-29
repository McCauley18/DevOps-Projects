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

    const response = await fetch('http://127.0.0.1:3001/api/addcake', {
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
    alert(result.message);

});