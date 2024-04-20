const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const readline = require('readline');

const packageDefinition1 = protoLoader.loadSync('authentication.proto');
const authenticationService = grpc.loadPackageDefinition(packageDefinition1).smartRetail;
const packageDefinition2 = protoLoader.loadSync('autonomousCheckout.proto');
const autonomousCheckout = grpc.loadPackageDefinition(packageDefinition2).smartRetail;
const packageDefinition3 = protoLoader.loadSync('smartShelf.proto');
const smartShelf = grpc.loadPackageDefinition(packageDefinition3).smartRetail;
const packageDefinition4 = protoLoader.loadSync('recommendation.proto');
const recommendationService = grpc.loadPackageDefinition(packageDefinition4).smartRetail;

const authenticationServiceClient = new authenticationService.Authentication('localhost:50051', grpc.credentials.createInsecure());
const autonomousCheckoutClient = new autonomousCheckout.AutonomousCheckout('localhost:50054', grpc.credentials.createInsecure());
const smartShelfClient = new smartShelf.SmartShelf('localhost:50053', grpc.credentials.createInsecure());
const recommendationServiceClient = new recommendationService.Recommendation('localhost:50052', grpc.credentials.createInsecure());

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function authenticateUser(callback) {
  rl.question('Please enter your username: ', (username) => {
      rl.question('Please enter your password: ', (password) => {
          const request = { username, password };
          authenticationServiceClient.authenticateUser(request, (error, response) => {
              if (error) {
                  console.error('Authentication failed:', error.message);
                  authenticateUser(callback);
              } else {
                  console.log(`User '${username}' logged in successfully`);
                  callback();
              }
          });
      });
  });
}



async function userMenu() {
  console.log();
  console.log('Select an operation:');
  console.log('1: Product catalogue');
  console.log('2: Check product stock & location');
  console.log('3: Add product to cart');
  console.log('4: Get personalised product recommendations');
  console.log('5: Checkout');
  console.log('6: Exit');
  console.log();



  const choice = await askQuestion('Enter choice: ');
  switch (choice) {
    case '1':
      getProductNames(userMenu);
      break;
    case '2':
      const productToCheck = await askQuestion('Enter product name: ');
      getProductInfo(productToCheck, userMenu);
      break;
    case '3':
      const productToAdd = await askQuestion('Enter product name: ');
      const quantity = await askQuestion('Enter quantity: ');
      addToCart(productToAdd, parseInt(quantity), userMenu);
      break;
    case '4':
      getPromotionalRecommendations(userMenu);
      break;    
    case '5':
      calculateTotal(async(total) => {
        console.log('The total cost is:', total);
        const checkoutReply = await askQuestion('Do you want to purchase? Y/N');
        if (checkoutReply == 'Y'){
          console.log('Please enter card details:');

          const card_number = await askQuestion('Please enter the card number (16 digits): ');
          const expiration_date = await askQuestion('Please enter the expiration date (MM/YY):');
          const cvv = await askQuestion('Please enter the CVV (3 digits):');
          console.log("Card number:", card_number);
          console.log("Expiration date:", expiration_date);
          console.log("CVV:", cvv);
         
          purchase(total, card_number, expiration_date, cvv);
          getCart()
          .then(cart => {
            updateStock(cart);
          })
          .catch(error => {
              console.error('Error retrieving cart:', error.message);
              console.log('Thanks for shopping with us!');
              process.exit();
          });
        } else {
          userMenu();
        } 
      });
      break; 
    case '6':
      console.log('Exiting the app')
      process.exit();
    default:
      console.log('Invalid selection');
      userMenu();
      break;         
  }
}    


function getProductNames(callback) {
  const call = smartShelfClient.GetProductNames({});

  const Fruit = [];
  const Veg = [];
  const Meat = [];
  const Other = [];

  
  call.on('data', (response) => {
    switch (response.category) {
      case 'Fruit':
        Fruit.push(response.name);
        break
      case 'Veg':
        Veg.push(response.name);
      case 'Meat':
        Meat.push(response.name);
      default:
        Other.push(response.name);      
    }
  });
  
  call.on('end', () => {
    console.log();
    console.log('Fruit:');
    console.log(Fruit);
    console.log('Veg:');
    console.log(Veg);
    console.log('Meat:');
    console.log(Meat);
    console.log('Other:');
    console.log(Other);
    if (callback) callback();
  });
  
  call.on('error', (error) => {
    console.error('Error:', error.message);
    if (callback) callback(); 
  });
}

getProductNames(() => {
  console.log('Product names received');
});


function getProductInfo(productName, callback) {
  const request = { productName: productName };
  smartShelfClient.getProductInfo(request, (error, response) => {
      if (error) {
          console.error('Error:', error.message);
      } else {
          console.log('Product Info:', response);
      }
      if (callback) callback(); 
  });
}

async function addToCart(productName, quantity, callback) {
  try {
    const instock = await checkStock(productName, quantity); 
    console.log('In stock:', instock);
    if (instock.success) {
      const price = await getPrice(productName); 
      console.log('Price per item:', price);
        const request = { productName, quantity, price };
        autonomousCheckoutClient.AddToCart(request, (error, response) => {
            if (error) {
                console.error('Error adding to cart:', error.message);
            } else {
                console.log('Successfully added to cart');
            }
            if (callback) callback();
        });
    } else {
        console.log(`Insufficient stock of ${productName}`);
        if (callback) callback(); 
    }
  } catch (error) {
      console.error('Error:', error.message);
      if (callback) callback(); 
  }
}

function checkStock(productName, quantity) {
  return new Promise((resolve, reject) => {
    smartShelfClient.checkStock({ productName, quantity }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

function getPrice(productName) {
  return new Promise((resolve, reject) => {
    smartShelfClient.GetPrice({ productName }, (error, response) => {
        if (error) {
            reject(error);
        } else {
            resolve(response.price);
        }
    });
  });
}

async function getPromotionalRecommendations(callback) {
  try {
      const call = recommendationServiceClient.getPromotionalRecommendations();

      call.on('data', (response) => {
          console.log('Received promotions:', response.promotion);
      });

      call.on('end', () => {
          console.log('Server stream ended');
          if (callback) callback(); 
      });

      call.on('error', (error) => {
          console.error('Error:', error.message);
          if (callback) callback(error); 
      });

      while (true) {
          const productName = await askQuestion('Enter a product name (or type "exit" to quit): ');
          if (productName.toLowerCase() === 'exit') {
              call.end();
              callback();  
              break;
          }
          call.write({ name: productName });
      }
  } catch (error) {
      console.error('Error:', error.message);
      if (callback) callback(error);
  }
}



//get cart
function getCart() {
  return new Promise((resolve, reject) => {
      autonomousCheckoutClient.getCart({}, (error, response) => {
          if (error) {
              console.error('Error retrieving cart:', error.message);
              reject(error);
              return;
          }
          resolve(response.cart);
      });
  });
}


function calculateTotal(callback) {
  autonomousCheckoutClient.calculateTotal({}, (error, response) => {
      if (error) {
          console.error('Error with calculation:', error.message);
          return;
      }
      console.log('Cart total:', response.total);
      callback(response.total);
  });
}

function purchase(total, cardNumber, expirationDate, cvv) {
  const request = {
      total: total,
      cardNumber: cardNumber,
      expirationDate: expirationDate,
      cvv: cvv
  };
  autonomousCheckoutClient.purchase(request, (error, response) => {
      if (error) {
          console.error('Error making purchase:', error.message);
          return;
      }
      console.log('Purchase response:', response);
  });
}

  function updateStock(cart) {
    const call = smartShelfClient.UpdateStock((error, response) => {
        if (error) {
            console.error('Error updating stock:', error.message);
            return;
        }
        console.log('Stock update response:', response);
    });

    cart.forEach(item => {
        call.write({ 
          productName: item.productName, 
          quantity: item.quantity 
        });
    });

    call.end();
}





console.log('Welcome to Kierans Grocerys!');  
authenticateUser(userMenu);
userMenu();
