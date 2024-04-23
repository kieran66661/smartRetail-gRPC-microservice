//import the grpc module, protoLoader module, load the autonomousCheckout.proto and the protocall buffer package definition
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('autonomousCheckout.proto');
const autonomousCheckout = grpc.loadPackageDefinition(packageDefinition).smartRetail;

let cart = [];

//add items to empty cart array
function addToCart(call, callback) {
    const { productName, quantity, price } = call.request;//extract data from call
    cart.push({ //add to cart
        productName: productName,
        quantity: quantity,
        price: price
    });
    callback(null, { success: true }); //return true to the callback fuction
}

//retrive the cart array
function getCart(call, callback) {
    console.log('Retrieving cart');
    callback(null, { cart: cart });
}

//iteratite through the cart array and calculat ethe some of product price by quanity of each item
function calculateTotal(call, callback) {
    console.log('Cart:', cart);
    cart.forEach(product => {
        console.log(`${product.productName}: ${product.price} x ${product.quantity}`);
    });
    
    let total = 0;
    cart.forEach(product => {
        total += product.price * product.quantity;
    });
    console.log('Cart total:', total);
    callback(null, { total }); //return the total
}

//purchase the items in the cart using the total and extracted card details
function purchase(call, callback) {
    const cardNumber = call.request.cardNumber;
    const expirationDate = call.request.expirationDate;
    const cvv = call.request.cvv;
    //log statments used for debugging
    console.log("Card number:", cardNumber);
    console.log("Expiration date:", expirationDate);
    console.log("CVV:", cvv);
    //if card details all entered respond that the purchase is successfull or invalid if not
    if (cardNumber && expirationDate && cvv) {
        const total = call.request.total;
        console.log(`Charging card ${cardNumber} the total amount: ${total}`);
        callback(null, { success: true, message: 'Purchase successful' });
    } else {
        console.log('Invalid card details provided');
        callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Invalid card details' });
    }
}

//create an instance of the server and add the services
const server = new grpc.Server();

server.addService(autonomousCheckout.AutonomousCheckout.service, {
    AddToCart: addToCart,
    GetCart: getCart,
    CalculateTotal: calculateTotal,
    Purchase: purchase
});

//bind the server to the address 127.0.0.1 and port 50054 with callback fuction to display if connection successful
server.bindAsync('127.0.0.1:50054', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      console.error(err);
      return;
    }
    console.log(`Autonomous Checkout Server running at http://127.0.0.1:${port}`);
});

