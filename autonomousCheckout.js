const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('autonomousCheckout.proto');
const autonomousCheckout = grpc.loadPackageDefinition(packageDefinition).smartRetail;

let cart = [];

function addToCart(call, callback) {
    const { productName, quantity, price } = call.request;
    cart.push({
        productName: productName,
        quantity: quantity,
        price: price
    });
    callback(null, { success: true });
}

function getCart(call, callback) {
    console.log('Retrieving cart');
    callback(null, { cart: cart });
}

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
    callback(null, { total });
}

function purchase(call, callback) {
    const cardNumber = call.request.cardNumber;
    const expirationDate = call.request.expirationDate;
    const cvv = call.request.cvv;

    console.log("Card number:", cardNumber);
    console.log("Expiration date:", expirationDate);
    console.log("CVV:", cvv);

    if (cardNumber && expirationDate && cvv) {
        const total = call.request.total;
        console.log(`Charging card ${cardNumber} the total amount: ${total}`);
        callback(null, { success: true, message: 'Purchase successful' });
    } else {
        console.log('Invalid card details provided');
        callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Invalid card details' });
    }
}

const server = new grpc.Server();

server.addService(autonomousCheckout.AutonomousCheckout.service, {
    AddToCart: addToCart,
    GetCart: getCart,
    CalculateTotal: calculateTotal,
    Purchase: purchase
});

server.bindAsync('127.0.0.1:50054', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      console.error(err);
      return;
    }
    console.log(`Autonomous Checkout Server running at http://127.0.0.1:${port}`);
});

