const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('authentication.proto');
const authenticationService = grpc.loadPackageDefinition(packageDefinition).smartRetail;


const users = [
    { username: 'John Ryan', password: 'John1234', session_id: '3572HJKF'},
    { username: 'Mary Burke', password: 'Cork77', session_id: '9968ILSS'},
    { username: 'Yvonne Donovan', password: 'YvonneD99', session_id: '0377TYYU'}
]

function authenticateUser(call, callback) {
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

const server = new grpc.Server();

server.addService(authenticationService.Authentication.service, {
    AuthenticateUser: authenticateUser,
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Failed to bind server:', err);
        return;
    }
    console.log(`Authentication server running at ${port}`);
});