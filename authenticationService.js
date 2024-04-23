
const grpc = require('@grpc/grpc-js'); //import the grpc module
const protoLoader = require('@grpc/proto-loader'); //load the protoloader module
const packageDefinition = protoLoader.loadSync('authentication.proto'); //use protoloader to load the authentication proto
const authenticationService = grpc.loadPackageDefinition(packageDefinition).smartRetail;//load the protocall buffer package definition

//simulate stored user account info for log in
const users = [
    { username: 'John Ryan', password: 'John1234'},
    { username: 'Mary Burke', password: 'Cork77'},
    { username: 'Yvonne Donovan', password: 'YvonneD99'}
]

//gRPC server method to handle log in requests
function authenticateUser(call, callback) {
    const { username, password } = call.request; //username and password varibales are extracted from the call
    const user = users.find(un => un.username === username && un.password === password);//search for the username in the users array and check if the password matchs if found
    if (user) { //if user the result is true log user has logged in and return true to the callback functuon
        console.log(`'${username}' has succefully logged in!`);
        callback(null, { loggedIn: true });
    } else { //if no user found return false
        console.log(`User '${username}' login unsuccessful.`);
        callback(null, { loggedIn: false });
    }    
}

const server = new grpc.Server(); //create a gRPC server

server.addService(authenticationService.Authentication.service, {
    AuthenticateUser: authenticateUser, //add the autheniticateuser service to the server mappping the protobuf definition to the server function 
});

//bind the server to the address 127.0.0.1 and port 50051 with callback fuction to display if connection successful
server.bindAsync('127.0.0.1:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      console.error(err);
      return;
    }
    console.log(`Authentication Server running at http://127.0.0.1:${port}`);
});