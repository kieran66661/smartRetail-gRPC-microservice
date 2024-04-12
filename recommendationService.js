const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('recommendation.proto');
const recommendationService = grpc.loadPackageDefinition(packageDefinition).smartRetail;

products: ['ProductE', 'ProductG']

function getPromotionalRecommendations(call) {
    const recommendations = {
        'productA': 'Buy one productJ get one free!',
        'productB': 'Save 20% on productK in store now',
        'productC': 'If you like productC, you should try productL',
    };
    let recommendationInterval;
    call.on('data', (product) => {
        const recommendedProduct = recommendations[product.name];
        if (recommendedProduct) {
            call.write(recommendedProduct);
            recommendationInterval = setInterval(() => {
                call.write(recommendedProduct);
            }, 3000);
        } else {
            console.log(`No recommendation available for ${product.name}`);
        }
    });
    call.on('end', () => {
        clearInterval(recommendationInterval);
    });
}

const server = new grpc.Server();

server.addService(recommendationService.Recommendation.service, {
    GetPromotionalRecommendations: getPromotionalRecommendations,
});

server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Failed to bind server:', err);
        return;
    }
    console.log(`Reccomendation server running at ${port}`);
});