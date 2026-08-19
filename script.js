

// ===============================
// USER REGISTRATION
// ===============================

function registerUser() {

let fullName = document.getElementById("fullName").value.trim();
let mobile = document.getElementById("mobile").value.trim();
let password = document.getElementById("password").value;
let confirmPassword = document.getElementById("confirmPassword").value;
let referral = document.getElementById("referral").value.trim();

if(fullName=="" || mobile=="" || password=="" || confirmPassword==""){
    alert("Please Fill All Fields");
    return;
}

if(mobile.length!=10){
    alert("Mobile Number Must Be 10 Digits");
    return;
}

if(password!=confirmPassword){
    alert("Password Not Matched");
    return;
}

let users =
JSON.parse(localStorage.getItem("users")) || [];

let already =
users.find(user => user.mobile===mobile);

if(already){
    alert("Mobile Number Already Registered");
    return;
}

let newUser={

id: Date.now(),

name: fullName,

mobile: mobile,

password: password,

wallet: 0,

referral: referral,

status: "Active",

registerDate: new Date().toLocaleDateString(),

lastLogin: ""

};

users.push(newUser);

localStorage.setItem(
"users",
JSON.stringify(users)
);

alert("Registration Successful");

window.location.href="login.html";

}





// ===============================
// USER LOGIN
// ===============================

function loginUser(){

let mobile =
document.getElementById("mobile").value.trim();

let password =
document.getElementById("password").value;

if(mobile=="" || password==""){
alert("Please Fill All Fields");
return;
}

let users =
JSON.parse(localStorage.getItem("users")) || [];

let user =
users.find(u => u.mobile===mobile);

if(!user){
alert("User Not Found");
return;
}


if(user.status=="Blocked"){

alert("Your ID Has Been Blocked.\nPlease Contact Admin.");

return;

}



if(user.password!==password){
alert("Wrong Password");
return;
}

user.lastLogin =
new Date().toLocaleString();

localStorage.setItem(
"users",
JSON.stringify(users)
);

// Current Login User
localStorage.setItem(
"currentUser",
JSON.stringify(user)
);

alert("Login Successful");

window.location.assign("home.html");

}




// =========================
// USER HOME DATA
// =========================

function loadUserData(){

let currentUser =
JSON.parse(localStorage.getItem("currentUser"));


let adminSettings =
JSON.parse(localStorage.getItem("adminSettings")) || {};

if(document.getElementById("appTitle")){

document.getElementById("appTitle").innerHTML =
adminSettings.appName || "HR MATKA";

}

if(!currentUser){

window.location.href="login.html";
return;

}

document.getElementById("userName").innerHTML =
currentUser.name;

document.getElementById("userMobile").innerHTML =
currentUser.mobile;

let balances =
JSON.parse(localStorage.getItem("userBalances")) || {};

let balance =
balances[currentUser.mobile] || 0;

document.getElementById("walletBalance").innerHTML =
balance;

}

if(document.getElementById("userName")){

loadUserData();

}



function loadLiveData(){

// Live Result
let results =
JSON.parse(localStorage.getItem("results")) || [];

if(results.length>0){

let lastResult =
results[results.length-1];

document.getElementById("liveResult").innerHTML =
lastResult.market + "<br>" + lastResult.result;

}

// Notification

let notification =
localStorage.getItem("notification") || "No Notification";

if(document.getElementById("notification")){

document.getElementById("notification").innerHTML =
notification;

}

}

if(document.getElementById("liveResult")){

loadLiveData();

}


// Logout

function logoutUser(){

localStorage.removeItem("currentUser");

window.location.href="login.html";

}








// =========================
// SAVE BANK DETAILS
// =========================

function saveBankDetails(){

let currentUser =
JSON.parse(localStorage.getItem("currentUser"));

if(!currentUser){
alert("Please Login First");
return;
}

let bankDetails =
JSON.parse(localStorage.getItem("bankDetails")) || {};

bankDetails[currentUser.mobile] = {

holderName:
document.getElementById("holderName").value,

bankName:
document.getElementById("bankName").value,

accountNumber:
document.getElementById("accountNumber").value,

ifscCode:
document.getElementById("ifscCode").value,

upiId:
document.getElementById("upiId").value

};

localStorage.setItem(
"bankDetails",
JSON.stringify(bankDetails)
);

alert("Bank Details Saved Successfully");

}




// =========================
// LOAD BANK DETAILS
// =========================

function loadBankDetails(){

let currentUser =
JSON.parse(localStorage.getItem("currentUser"));

if(!currentUser) return;

let bankDetails =
JSON.parse(localStorage.getItem("bankDetails")) || {};

let data =
bankDetails[currentUser.mobile];

if(!data) return;

document.getElementById("holderName").value =
data.holderName || "";

document.getElementById("bankName").value =
data.bankName || "";

document.getElementById("accountNumber").value =
data.accountNumber || "";

document.getElementById("ifscCode").value =
data.ifscCode || "";

document.getElementById("upiId").value =
data.upiId || "";

}

if(document.getElementById("holderName")){

loadBankDetails();

}