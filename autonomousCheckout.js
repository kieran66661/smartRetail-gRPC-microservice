const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('autonomousCheckout.proto');
const autonomousCheckout = grpc.loadPackageDefinition(packageDefinition).smartRetail;

let cart = [];

function addToCart(call, callback) {
    const { product_name, quantity, price } = call.request;
    cart.push({
        product_name: product_name,
        quantity: quantity,
        price: price
    });
    callback(null, { success: true, message: `${quantity} of ${product_name} added to the cart` });
}

function getCart(call, callback) {
    console.log('Retrieving cart');
    callback(null, { cart: cart });
}

function calculateTotal(call, callback) {
    let total = 0;
        cart.forEach(product => {
        total += product.price * product.quantity;
    });
    console.log('Cart total:', total);
    callback(null, { total });
}

function purchase(call, callback) {
    const { card_number, expiration_date, cvv } = call.request.card_details;
    if (card_number && expiration_date && cvv) {
        const total = call.request.total;
        console.log(`Charging card ${card_number} the total amount: ${total}`);
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

