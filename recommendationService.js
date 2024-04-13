const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('recommendation.proto');
const recommendationService = grpc.loadPackageDefinition(packageDefinition).smartRetail;


function getPromotionalRecommendations(call, callback) {
    const recommendations = {
        'ProductA': 'Buy one ProductJ get one free!',
        'ProductB': 'Save 20% on ProductK in store now',
        'ProductC': 'If you like ProductC, you should try ProductL',
        'ProductD': 'Try our new ProductM in store now!',
        'ProductE': '3 for the price of 2 on ProductN'
    };

    const promotions = [];

    call.on('data', (product) => {
        const productName = product.name;
        const recommendedPromotion = recommendations[productName];

        if (recommendedPromotion) {
            promotions.push(recommendedPromotion);
        } else {
            console.log(`No promotion available for ${productName}`);
        }
    });
    call.on('end', () => {
        console.log('Client stream ended');
        const promotionMessage = { promotions: promotions };
        callback(null, promotionMessage);
    });

    call.on('error', (error) => {
        console.error('Error:', error.message);
        callback(error);
    });
}


const server = new grpc.Server();

server.addService(recommendationService.Recommendation.service, {
    GetPromotionalRecommendations: getPromotionalRecommendations,
});


server.bindAsync('127.0.0.1:50052', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      console.error(err);
      return;
    }
    console.log(`Reccomendation Server running at http://127.0.0.1:${port}`);
});