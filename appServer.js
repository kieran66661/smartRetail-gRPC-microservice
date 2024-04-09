const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('app.proto');
const appProto = grpc.loadPackageDefinition(packageDefinition).smartRetail;

const users = [
    { username: 'John Ryan', password: 'John1234', session_id: '3572HJKF', products: ['ProductA', 'ProductB']},
    { username: 'Mary Burke', password: 'Cork77', session_id: '9968ILSS', products: ['ProductC', 'ProductD']},
    { username: 'Yvonne Donovan', password: 'YvonneD99', session_id: '0377TYYU', products: ['ProductE', 'ProductF']}
]

function login(call, callback) {
    const { username, password } = call.request;
    const user = users.find(un => un.username === username && un.password === password);
    if (user) {
        console.log(`'${username}' has succefully logged in!`);
        callback(null, { session_id: user.session_id });
    } else {
        console.log(`User '${username}' login unsuccessful.`);
        callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid username or password' });
    }    
}

function calculateTotal(call, callback) {
    let total = 0;
    call.on('data', product => {
        total += product.price * product.quantity;
        const user = users.find(user => user.session_id === call.request.session_id);
        if (user) {
            user.products.push(product);
        }
    });
    call.on('end', () => {
        console.log('Cart total:', total);
        callback(null, { total });
    });
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

server.addService(appProto.App.service, {
    Login: login,
    CalculateTotal: calculateTotal,
    Purchase: purchase,
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Failed to bind server:', err);
        return;
    }
    console.log(`App service server running at ${port}`);
});